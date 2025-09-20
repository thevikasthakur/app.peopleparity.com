import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, Zap, Target, Calendar, Trophy, Star, Flag, Clock, Lock, Info } from 'lucide-react';
import { getActivityMessage } from '../utils/activityMessages';
import { formatHoursToHM } from '../utils/timeFormatters';

interface WeeklyData {
  productiveHours: number;
  averageActivityScore: number;
  activityLevel?: string;
  markers: {
    dailyTarget: number; // 9 or 10.5 based on holiday
    maxScale: number; // 45 hours
    hasHoliday: boolean;
    holidayCount: number;
    workingDays: number;
  };
  attendance: {
    totalHours?: number; // For backward compatibility
    daysEarned?: number; // For backward compatibility
    extraHours: number;
    status: string;
    color: string;
  };
  message: string;
  dailyData?: Array<{ hours: number; isFuture: boolean }>;
  dailyStatuses?: Array<{
    day: string;
    hours: number;
    isFuture?: boolean;
    status: 'absent' | 'half' | 'good' | 'full' | 'extra' | 'future';
    label: string;
    color: string;
  }>;
}

interface WeeklyMarathonProps {
  selectedDate: Date;
  isToday: boolean;
  onDayClick?: (date: Date) => void;
}

export const WeeklyMarathon: React.FC<WeeklyMarathonProps> = ({ selectedDate, isToday, onDayClick }) => {
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeeklyData();
    // Refresh every 5 minutes only if today
    let interval: NodeJS.Timeout | undefined;
    if (isToday) {
      interval = setInterval(loadWeeklyData, 5 * 60 * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedDate, isToday]);

  const loadWeeklyData = async () => {
    try {
      const data = await window.electronAPI.getWeeklyMarathon(selectedDate.toISOString());
      setWeeklyData(data);
    } catch (error) {
      console.error('Failed to load weekly data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!weeklyData) {
    return null;
  }

  const { productiveHours, averageActivityScore, activityLevel, markers, attendance, message } = weeklyData;
  const percentage = Math.min((productiveHours / markers.maxScale) * 100, 100);

  // Get activity level label - use server-provided value or fall back to local calculation
  const getActivityLevel = (score: number) => {
    const localLevel = score >= 8.5 ? 'Good' :
                      score >= 7.0 ? 'Fair' :
                      score >= 5.5 ? 'Low' :
                      score >= 4.0 ? 'Poor' :
                      score >= 2.5 ? 'Critical' : 'Inactive';
    return activityLevel || localLevel;
  };
  
  // Calculate day markers (only for weekdays)
  const dayMarkers = [];
  const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  for (let i = 1; i <= markers.workingDays; i++) {
    const targetHours = i * markers.dailyTarget;
    const position = (targetHours / markers.maxScale) * 100;
    dayMarkers.push({ 
      day: i, 
      hours: targetHours, 
      position,
      label: weekdayLabels[i - 1] || `Day ${i}`
    });
  }

  // Get progress color based on total hours
  const getProgressGradient = () => {
    const fullWeekTarget = markers.dailyTarget * markers.workingDays;
    if (productiveHours >= fullWeekTarget) {
      return 'linear-gradient(90deg, #10b981 0%, #059669 100%)'; // Green - full week
    } else if (productiveHours >= fullWeekTarget * 0.75) {
      return 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)'; // Blue - good progress
    } else if (productiveHours >= fullWeekTarget * 0.5) {
      return 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'; // Amber - some progress
    } else {
      return 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'; // Red - low progress
    }
  };

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-lg">
            <Calendar className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Weekly Marathon</h3>
            <p className="text-xs text-gray-500">{isToday ? 'This week' : `Week of ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}</p>
          </div>
          {markers.hasHoliday && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full animate-pulse">
              🎉 {markers.holidayCount} Holiday{markers.holidayCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gray-400" />
              <span className="text-2xl font-bold" style={{ color: attendance.color }}>
                {formatHoursToHM(productiveHours)}
              </span>
            </div>
            <span className="text-xs text-gray-500">tracked {isToday ? 'this week' : 'that week'}</span>
          </div>
          
          <div className="w-px h-10 bg-gray-200" />
          
          <div className="text-right">
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold" style={{ color: attendance.color }}>
                {averageActivityScore.toFixed(1)}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" 
                    style={{ 
                      backgroundColor: `${attendance.color}15`,
                      color: attendance.color,
                      border: `1px solid ${attendance.color}30`
                    }}>
                {getActivityLevel(averageActivityScore)}
              </span>
            </div>
            <span className="text-xs text-gray-500">avg activity level</span>
          </div>
        </div>
      </div>

      {/* Day Milestones - Updated to 7 days */}
      <div className="grid grid-cols-7 gap-1 mb-4 relative" style={{ zIndex: 1 }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, index) => {
          const dayStatus = weeklyData.dailyStatuses?.[index];
          const dayHours = dayStatus?.hours || 0;
          const attendanceStatus = dayStatus?.status || 'absent';
          const statusLabel = dayStatus?.label || 'Absent';
          const statusColor = dayStatus?.color || '#ef4444';
          const isWeekend = dayStatus?.isWeekend || false;
          const potentialStatus = dayStatus?.potentialStatus;
          const potentialLabel = dayStatus?.potentialLabel;
          
          // Check if this is the current day
          const isCurrentDay = dayStatus?.isCurrentDay || false;
          
          // Check if this day is selected
          const dayDate = dayStatus?.date ? new Date(dayStatus.date) : null;
          const isSelectedDay = dayDate && selectedDate && 
            dayDate.toDateString() === selectedDate.toDateString();
          
          // Debug logging
          if (index === 0) {
            console.log('WeeklyMarathon dayStatus:', dayStatus);
            console.log('dayDate:', dayDate);
            console.log('onDayClick:', onDayClick);
          }
          
          // Determine background and border colors based on status
          const getStatusClasses = () => {
            if (isWeekend) {
              return 'bg-gray-100 border-gray-300 opacity-75';
            }
            if (isSelectedDay && !isCurrentDay) {
              return 'bg-gradient-to-br from-purple-100 to-indigo-100 border-2 border-purple-500 shadow-lg ring-2 ring-purple-300';
            }
            if (isCurrentDay && attendanceStatus === 'in-progress') {
              return 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-400 shadow-md animate-pulse-subtle';
            }
            switch (attendanceStatus) {
              case 'future':
                return 'bg-gray-50 border-gray-200';
              case 'in-progress':
                return 'bg-blue-50 border-2 border-blue-400 shadow-md';
              case 'extra':
                return 'bg-purple-50 border-purple-300';
              case 'full':
                return 'bg-green-50 border-green-300';
              case 'good':
                return 'bg-blue-50 border-blue-300';
              case 'half':
                return 'bg-amber-50 border-amber-300';
              case 'absent':
              default:
                return 'bg-red-50 border-red-300';
            }
          };
          
          // Get icon based on status
          const getStatusIcon = () => {
            if (isWeekend) {
              return (
                <div className="relative group">
                  <Lock className="w-4 h-4 text-gray-500" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    Weekend - doesn't count for attendance
                  </div>
                </div>
              );
            }
            if (isCurrentDay && attendanceStatus === 'in-progress') {
              return (
                <div className="relative">
                  <Clock className="w-4 h-4 text-blue-500 animate-spin-slow" />
                  <div className="absolute inset-0 w-4 h-4 bg-blue-400 opacity-30 rounded-full animate-ping" />
                </div>
              );
            }
            switch (attendanceStatus) {
              case 'future':
                return <Calendar className="w-4 h-4 text-gray-400" />;
              case 'in-progress':
                return <Clock className="w-4 h-4 text-blue-500" />;
              case 'extra':
                return <Zap className="w-4 h-4 text-purple-500" />;
              case 'full':
                return <Star className="w-4 h-4 text-green-500 fill-green-500" />;
              case 'good':
                return <Star className="w-4 h-4 text-blue-500 fill-blue-500" />;
              case 'half':
                return <Star className="w-4 h-4 text-amber-500" />;
              case 'absent':
              default:
                return <Star className="w-4 h-4 text-gray-300" />;
            }
          };
          
          return (
            <div 
              key={label}
              className={`p-2 rounded-lg border text-center transition-all relative ${getStatusClasses()} ${!isWeekend && onDayClick ? 'cursor-pointer hover:shadow-lg hover:scale-105 transform' : ''}`}
              style={isCurrentDay && attendanceStatus === 'in-progress' ? {
                animation: 'subtle-pulse 3s ease-in-out infinite'
              } : {}}
              onClick={() => {
                if (!isWeekend && onDayClick && dayDate) {
                  onDayClick(dayDate);
                }
              }}
            >
              <div className="flex items-center justify-center mb-1">
                {getStatusIcon()}
              </div>
              <p className={`text-xs font-bold ${isWeekend ? 'text-gray-600' : isSelectedDay ? 'text-purple-700' : 'text-gray-900'}`}>
                {label}
                {isCurrentDay && !isWeekend && <span className="ml-1 text-[8px] text-blue-500">(Today)</span>}
                {isSelectedDay && !isCurrentDay && !isWeekend && <span className="ml-1 text-[8px] text-purple-600">(Selected)</span>}
              </p>
              <p className="text-[10px] text-gray-600">
                {isWeekend ? '-' : attendanceStatus === 'future' ? '-' : formatHoursToHM(dayHours)}
              </p>
              <div className="flex items-center justify-center gap-1">
                <p className="text-[10px] font-medium" style={{ color: isWeekend ? '#6b7280' : statusColor }}>
                  {isWeekend ? 'Weekend' : statusLabel}
                </p>
                {/* Show info icon - different messages for current vs past days */}
                {((isCurrentDay && attendanceStatus !== 'full' && attendanceStatus !== 'extra' && attendanceStatus !== 'in-progress') || 
                  (!isCurrentDay && potentialStatus)) && !isWeekend && (
                  <div className="relative group">
                    <Info className="w-3 h-3 text-blue-500 cursor-help animate-pulse" />
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 p-3 bg-white border-2 border-blue-200 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 w-64 z-[99999]" 
                         style={{ 
                           zIndex: 999999,
                           pointerEvents: 'none'
                         }}>
                      <div className="text-xs space-y-1.5">
                        <p className="font-bold text-blue-600">🎪 The Pop Says 🔮</p>
                        <p className="text-gray-700 leading-relaxed">
                          {/* Messages for current day - encourage to complete today's target */}
                          {isCurrentDay && (
                            <>
                              {attendanceStatus === 'absent' && (
                                <>Only {formatHoursToHM(dayHours)} so far today! 
                                You need <span className="font-bold text-orange-600">{formatHoursToHM(Math.max(0, 4.5 - dayHours))} more</span> for Half Day attendance!
                                <br/>Keep pushing - you can still make it! 💪</>
                              )}
                              {attendanceStatus === 'half' && (
                                <>Good progress with {formatHoursToHM(dayHours)}! 
                                Just <span className="font-bold text-orange-600">{formatHoursToHM(Math.max(0, 7 - dayHours))} more</span> for Good attendance, or <span className="font-bold text-green-600">{formatHoursToHM(Math.max(0, 9 - dayHours))}</span> for Full!
                                <br/>You're doing great - keep going! 🚀</>
                              )}
                              {attendanceStatus === 'good' && (
                                <>Excellent work with {formatHoursToHM(dayHours)}! 
                                Only <span className="font-bold text-green-600">{formatHoursToHM(Math.max(0, 9 - dayHours))} more</span> for Full attendance today!
                                <br/>Push for excellence! ⭐</>
                              )}
                            </>
                          )}
                          
                          {/* Messages for past days - show potential with 45h/week */}
                          {!isCurrentDay && (
                            <>
                              {attendanceStatus === 'absent' && potentialStatus === 'half' && (
                                <>Only {formatHoursToHM(dayHours)} that day? Don't worry! 
                                If you complete 45 hours this week, this day will automatically upgrade to <span className="font-bold text-green-600">Half Day</span> attendance! 
                                <br/>Just push harder this week! 💪</>
                              )}
                              {attendanceStatus === 'half' && potentialStatus === 'good' && (
                                <>Good effort with {formatHoursToHM(dayHours)}! 
                                Hit the 45-hour weekly target, and this converts to <span className="font-bold text-green-600">Good Attendance</span>! 
                                <br/>Keep up the momentum! 🚀</>
                              )}
                              {attendanceStatus === 'half' && potentialStatus === 'full' && (
                                <>Solid {formatHoursToHM(dayHours)} logged! 
                                Achieve 45 hours this week to upgrade this to <span className="font-bold text-green-600">Full Attendance</span>! 
                                <br/>You're on track! 🏆</>
                              )}
                              {attendanceStatus === 'good' && potentialStatus === 'full' && (
                                <>Impressive {formatHoursToHM(dayHours)}! 
                                Complete 45 hours this week and this becomes <span className="font-bold text-green-600">Full Attendance</span>! 
                                <br/>Excellence awaits! ⭐</>
                              )}
                            </>
                          )}
                        </p>
                        <p className="text-[10px] text-gray-500 italic border-t pt-1">
                          {isCurrentDay ? 
                            "Target: 4.5h (Half) • 7h (Good) • 9h (Full)" : 
                            "*33% relaxation applies when you reach 45h/week"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Enhanced Progress Bar */}
      <div className="relative mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-gray-600">Weekly Progress</span>
          <div className="flex items-center gap-3">
            <span className="text-xs">
              <span className="font-bold" style={{ color: attendance.color }}>
                {formatHoursToHM(productiveHours)}
              </span>
              <span className="text-gray-500"> / {formatHoursToHM(markers.dailyTarget * markers.workingDays)}</span>
            </span>
            <span className="text-xs font-bold" style={{ color: attendance.color }}>
              {Math.round(percentage)}%
            </span>
          </div>
        </div>
        
        <div className="h-12 bg-gray-100 rounded-xl overflow-hidden relative shadow-inner">
          {/* Progress Fill */}
          <div 
            className="h-full transition-all duration-700 ease-out relative rounded-xl"
            style={{
              width: `${percentage}%`,
              background: getProgressGradient(),
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            {/* Animated shimmer for full week completion */}
            {productiveHours >= (markers.dailyTarget * markers.workingDays) && attendance.extraHours > 0 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            )}
            
            {/* Current value indicator */}
            {percentage > 10 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold shadow-sm"
                   style={{ color: attendance.color }}>
                {formatHoursToHM(productiveHours)}
              </div>
            )}
          </div>

          {/* Day Markers */}
          <div className="absolute inset-0 pointer-events-none">
            {dayMarkers.map((marker, index) => (
              <div
                key={marker.day}
                className="absolute h-full flex flex-col justify-center"
                style={{ left: `${marker.position}%` }}
              >
                <div 
                  className={`w-0.5 h-full ${
                    productiveHours >= marker.hours 
                      ? 'bg-green-400/50' 
                      : 'bg-gray-400/30'
                  }`} 
                />
                <div className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 text-center">
                  <p className="text-[10px] font-bold text-gray-700">{marker.label}</p>
                  <p className="text-[9px] text-gray-500">{formatHoursToHM(marker.hours)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scale Labels */}
        <div className="flex justify-between mt-10 text-xs text-gray-500">
          <span className="font-medium">Week Start</span>
          <span className="font-medium text-center">
            Target: {formatHoursToHM(markers.dailyTarget)} × {markers.workingDays} = {formatHoursToHM(markers.dailyTarget * markers.workingDays)}
          </span>
          <span className="font-medium">Week End</span>
        </div>
      </div>

      {/* Status Messages - Swapped order for better message visibility */}
      <div className="space-y-2">
        {/* Achievement Status - Moved to top */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" 
                 style={{ backgroundColor: attendance.color }} />
            <span className="text-xs text-gray-600">Week's Achievement:</span>
            <span className="font-bold text-sm px-2 py-1 rounded-lg"
                  style={{ 
                    backgroundColor: `${attendance.color}15`,
                    color: attendance.color,
                    border: `1px solid ${attendance.color}30`
                  }}>
              {attendance.status}
            </span>
          </div>
          
          {attendance.extraHours > 0 && (
            <div className="flex items-center gap-1 animate-bounce">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-bold text-yellow-600">
                +{formatHoursToHM(attendance.extraHours)} Extra!
              </span>
            </div>
          )}
        </div>

        {/* Manager Message - Moved to bottom with more space */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-700 font-medium mb-2">{message}</p>
          <div className="border-t border-gray-300 pt-2">
            <p className="text-xs text-gray-600 italic leading-relaxed">
              {getActivityMessage(averageActivityScore, productiveHours, true)}
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <p>Daily Target: {markers.dailyTarget}h</p>
          {markers.hasHoliday ? (
            <p className="text-amber-600 font-medium">
              🎉 Short week ({markers.dailyTarget}h/day)
            </p>
          ) : (
            <p className="text-gray-600">Regular week ({markers.dailyTarget}h/day)</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyMarathon;