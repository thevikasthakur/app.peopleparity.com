import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, Zap, Target, Calendar } from 'lucide-react';

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
    daysEarned: number;
    extraHours: number;
    status: string;
    color: string;
  };
  message: string;
}

export const WeeklyMarathon: React.FC = () => {
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeeklyData();
    // Refresh every 5 minutes
    const interval = setInterval(loadWeeklyData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadWeeklyData = async () => {
    try {
      const data = await window.electronAPI.getWeeklyMarathon();
      console.log('Loaded weekly data:', data);
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
  
  // Calculate marker positions
  const dayMarkers = [];
  for (let i = 1; i <= markers.workingDays; i++) {
    const targetHours = i * markers.dailyTarget;
    const position = (targetHours / markers.maxScale) * 100;
    dayMarkers.push({ day: i, hours: targetHours, position });
  }

  // Determine icon based on performance
  const getIcon = () => {
    if (productiveHours === 0) return <Calendar className="w-5 h-5" />;
    if (attendance.daysEarned < 1) return <Target className="w-5 h-5" />;
    if (attendance.daysEarned >= markers.workingDays) return <Award className="w-5 h-5" />;
    return <Zap className="w-5 h-5" />;
  };

  // Get color based on days earned
  const getProgressColor = () => {
    if (attendance.daysEarned >= markers.workingDays) {
      return 'linear-gradient(90deg, #10b981 0%, #059669 100%)'; // Green - full week
    } else if (attendance.daysEarned >= 3) {
      return 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)'; // Blue - good progress
    } else if (attendance.daysEarned >= 1) {
      return 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'; // Amber - some progress
    } else {
      return 'linear-gradient(90deg, #6b7280 0%, #4b5563 100%)'; // Gray - low progress
    }
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Weekly Marathon</h3>
          {markers.hasHoliday && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
              {markers.holidayCount} Holiday{markers.holidayCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex flex-col items-end">
            <span className="text-xl font-bold" style={{ color: attendance.color }}>
              {productiveHours.toFixed(1)}h
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium" style={{ color: attendance.color }}>
                {averageActivityScore.toFixed(1)}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" 
                    style={{ 
                      backgroundColor: `${attendance.color}20`,
                      color: attendance.color
                    }}>
                {getActivityLevel(averageActivityScore)}
              </span>
            </div>
          </div>
          {getIcon()}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-4">
        <div className="h-6 bg-gray-100 rounded-full overflow-hidden relative">
          {/* Progress Fill */}
          <div 
            className="h-full transition-all duration-500 ease-out relative"
            style={{
              width: `${percentage}%`,
              background: getProgressColor()
            }}
          >
            {/* Animated shimmer effect for overachievers */}
            {attendance.daysEarned >= markers.workingDays && attendance.extraHours > 0 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            )}
          </div>

          {/* Day Markers */}
          <div className="absolute inset-0 flex items-center">
            {dayMarkers.map((marker) => (
              <div
                key={marker.day}
                className="absolute h-full w-0.5"
                style={{ 
                  left: `${marker.position}%`,
                  backgroundColor: marker.day === markers.workingDays ? '#10b981' : '#9ca3af'
                }}
              >
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap">
                  Day {marker.day}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scale Labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>0h</span>
          <span className="font-semibold">{markers.maxScale}h</span>
        </div>
      </div>

      {/* Status Message */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-sm text-gray-700 italic">{message}</p>
        
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Days Earned:</span>
            <span 
              className="text-sm font-bold px-2 py-1 rounded"
              style={{ 
                backgroundColor: `${attendance.color}20`,
                color: attendance.color 
              }}
            >
              {attendance.daysEarned.toFixed(2)} / {markers.workingDays}
            </span>
          </div>
          
          {attendance.extraHours > 0 && (
            <div className="flex items-center space-x-1">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-semibold text-yellow-600">
                +{attendance.extraHours.toFixed(1)}h Extra!
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 text-xs text-gray-500">
        <p>Target: {markers.dailyTarget}h/day × {markers.workingDays} days = {(markers.dailyTarget * markers.workingDays).toFixed(0)}h</p>
        {markers.hasHoliday && (
          <p className="mt-1 text-amber-600">
            Holiday week: {markers.dailyTarget}h per day target
          </p>
        )}
      </div>
    </div>
  );
};

export default WeeklyMarathon;