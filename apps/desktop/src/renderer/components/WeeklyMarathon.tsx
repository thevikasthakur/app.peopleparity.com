import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, Zap, Target, Calendar, Trophy, Star, Flag, Clock } from 'lucide-react';
import { getActivityMessage } from '../utils/activityMessages';

interface WeeklyData {
  productiveHours: number;
  averageActivityScore: number;
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
}

export const WeeklyMarathon: React.FC<WeeklyMarathonProps> = ({ selectedDate, isToday }) => {
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
      console.log('Loaded weekly data for week of:', selectedDate, data);
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

  const { productiveHours, averageActivityScore, markers, attendance, message } = weeklyData;
  const percentage = Math.min((productiveHours / markers.maxScale) * 100, 100);
  
  // Get activity level label
  const getActivityLevel = (score: number) => {
    if (score >= 8.5) return 'Good';
    if (score >= 7.0) return 'Fair';
    if (score >= 5.5) return 'Low';
    if (score >= 4.0) return 'Poor';
    if (score >= 2.5) return 'Critical';
    return 'Inactive';
  };
  
  // Calculate day markers
  const dayMarkers = [];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  for (let i = 1; i <= markers.workingDays; i++) {
    const targetHours = i * markers.dailyTarget;
    const position = (targetHours / markers.maxScale) * 100;
    dayMarkers.push({ 
      day: i, 
      hours: targetHours, 
      position,
      label: dayLabels[i - 1] || `Day ${i}`
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
                {productiveHours.toFixed(1)}h
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

      {/* Day Milestones */}
      <div className="grid grid-cols-5 gap-1.5 mb-4">
        {dayLabels.map((label, index) => {
          const dayStatus = weeklyData.dailyStatuses?.[index];
          const dayHours = dayStatus?.hours || 0;
          const attendanceStatus = dayStatus?.status || 'absent';
          const statusLabel = dayStatus?.label || 'Absent';
          const statusColor = dayStatus?.color || '#ef4444';
          
          // Check if this is the current day
          const isCurrentDay = dayStatus?.isCurrentDay || false;
          
          // Determine background and border colors based on status
          const getStatusClasses = () => {
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
              className={`p-2 rounded-lg border text-center transition-all ${getStatusClasses()} ${isCurrentDay ? 'relative overflow-hidden' : ''}`}
              style={isCurrentDay && attendanceStatus === 'in-progress' ? {
                animation: 'subtle-pulse 3s ease-in-out infinite'
              } : {}}
            >
              <div className="flex items-center justify-center mb-1">
                {getStatusIcon()}
              </div>
              <p className="text-xs font-bold text-gray-900">
                {label}
                {isCurrentDay && <span className="ml-1 text-[8px] text-blue-500">(Today)</span>}
              </p>
              <p className="text-[10px] text-gray-600">
                {attendanceStatus === 'future' ? '-' : `${dayHours.toFixed(1)}h`}
              </p>
              <p className="text-[10px] font-medium" style={{ color: statusColor }}>
                {statusLabel}
              </p>
              {isCurrentDay && attendanceStatus === 'in-progress' && (
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400 opacity-60" 
                     style={{ animation: 'shimmer 2s linear infinite' }} />
              )}
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
                {productiveHours.toFixed(1)}h
              </span>
              <span className="text-gray-500"> / {(markers.dailyTarget * markers.workingDays).toFixed(0)}h</span>
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
                {productiveHours.toFixed(1)}h
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
                  <p className="text-[9px] text-gray-500">{marker.hours}h</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scale Labels */}
        <div className="flex justify-between mt-10 text-xs text-gray-500">
          <span className="font-medium">Week Start</span>
          <span className="font-medium text-center">
            Target: {markers.dailyTarget}h × {markers.workingDays} = {(markers.dailyTarget * markers.workingDays).toFixed(0)}h
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
                +{attendance.extraHours.toFixed(1)}h Extra!
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
              🎉 Holiday week ({markers.dailyTarget}h/day)
            </p>
          ) : (
            <p className="text-gray-600">Regular week (10.5h/day)</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyMarathon;