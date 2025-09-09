import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, Award, Zap, Coffee, Target, Flag, CheckCircle, AlertCircle } from 'lucide-react';
import { getActivityMessage } from '../utils/activityMessages';

interface HustleData {
  productiveHours: number;
  averageActivityScore: number;
  markers: {
    halfAttendance: number;
    threeQuarterAttendance: number;
    fullAttendance: number;
    maxScale: number;
    isHolidayWeek: boolean;
  };
  message: string;
  attendance: {
    earned: number;
    status: string;
    color: string;
  };
}

interface TodaysHustleProps {
  selectedDate: Date;
  isToday: boolean;
}

export const TodaysHustle: React.FC<TodaysHustleProps> = ({ selectedDate, isToday }) => {
  const [hustleData, setHustleData] = useState<HustleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHustleData();
    // Refresh every 5 minutes only if today
    let interval: NodeJS.Timeout | undefined;
    if (isToday) {
      interval = setInterval(loadHustleData, 5 * 60 * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedDate, isToday]);

  const loadHustleData = async () => {
    try {
      const data = await window.electronAPI.getProductiveHours(selectedDate.toISOString());
      console.log('Loaded hustle data for date:', selectedDate, data);
      setHustleData(data);
    } catch (error) {
      console.error('Failed to load hustle data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!hustleData) {
    return null;
  }

  const { productiveHours, averageActivityScore, markers, message, attendance } = hustleData;
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
  
  // Calculate marker positions as percentages
  const halfMarkerPos = (markers.halfAttendance / markers.maxScale) * 100;
  const threeQuarterMarkerPos = (markers.threeQuarterAttendance / markers.maxScale) * 100;
  const fullMarkerPos = (markers.fullAttendance / markers.maxScale) * 100;

  // Determine milestone status
  const getMilestoneStatus = () => {
    if (productiveHours > markers.fullAttendance) return 'extra';
    if (productiveHours >= markers.fullAttendance) return 'full';
    if (productiveHours >= markers.threeQuarterAttendance) return 'three-quarter';
    if (productiveHours >= markers.halfAttendance) return 'half';
    return 'none';
  };

  const milestoneStatus = getMilestoneStatus();

  // Get progress bar color based on milestone
  const getProgressGradient = () => {
    if (productiveHours > markers.fullAttendance) 
      return 'linear-gradient(90deg, #9333ea 0%, #7c3aed 100%)'; // Purple for extra
    if (productiveHours >= markers.fullAttendance) 
      return 'linear-gradient(90deg, #10b981 0%, #059669 100%)'; // Green for full
    if (productiveHours >= markers.threeQuarterAttendance)
      return 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)'; // Blue for good
    if (productiveHours >= markers.halfAttendance)
      return 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'; // Amber for half
    return 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'; // Red for none
  };

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{isToday ? "Today's" : "Day's"} Hustle</h3>
            <p className="text-xs text-gray-500">Daily productivity tracker</p>
          </div>
          {markers.isHolidayWeek && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full animate-pulse">
              🎉 Holiday Mode
            </span>
          )}
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-2xl font-bold" style={{ color: attendance.color }}>
                {productiveHours.toFixed(1)}h
              </span>
            </div>
            <span className="text-xs text-gray-500">tracked {isToday ? 'today' : `on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}</span>
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
            <span className="text-xs text-gray-500">activity level</span>
          </div>
        </div>
      </div>

      {/* Milestone Indicators - 5 columns */}
      <div className="grid grid-cols-5 gap-1.5 mb-4">
        {/* No Attendance */}
        <div className={`p-2 rounded-lg border transition-all ${
          milestoneStatus === 'none' 
            ? 'bg-red-50 border-red-300 ring-2 ring-red-300' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-gray-600">No Attendance</span>
            {milestoneStatus === 'none' ? (
              <AlertCircle className="w-3 h-3 text-red-500" />
            ) : (
              <AlertCircle className="w-3 h-3 text-gray-300" />
            )}
          </div>
          <p className="text-sm font-bold text-gray-900">&lt;{markers.halfAttendance}h</p>
          <p className="text-[10px] text-gray-500">0% attendance</p>
        </div>

        {/* Half Day */}
        <div className={`p-2 rounded-lg border transition-all ${
          milestoneStatus === 'half' 
            ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-300' 
            : milestoneStatus !== 'none'
            ? 'bg-amber-50 border-amber-300'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-gray-600">Half Day</span>
            {milestoneStatus !== 'none' ? (
              <CheckCircle className="w-3 h-3 text-amber-500" />
            ) : (
              <AlertCircle className="w-3 h-3 text-gray-300" />
            )}
          </div>
          <p className="text-sm font-bold text-gray-900">{markers.halfAttendance}h</p>
          <p className="text-[10px] text-gray-500">50% attendance</p>
        </div>

        {/* Good Day */}
        <div className={`p-2 rounded-lg border transition-all ${
          milestoneStatus === 'three-quarter'
            ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-300'
            : milestoneStatus === 'full' || milestoneStatus === 'extra'
            ? 'bg-blue-50 border-blue-300' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-gray-600">Good Day</span>
            {milestoneStatus === 'three-quarter' || milestoneStatus === 'full' || milestoneStatus === 'extra' ? (
              <CheckCircle className="w-3 h-3 text-blue-500" />
            ) : (
              <Target className="w-3 h-3 text-gray-300" />
            )}
          </div>
          <p className="text-sm font-bold text-gray-900">{markers.threeQuarterAttendance}h</p>
          <p className="text-[10px] text-gray-500">75% attendance</p>
        </div>

        {/* Full Day */}
        <div className={`p-2 rounded-lg border transition-all ${
          milestoneStatus === 'full'
            ? 'bg-green-50 border-green-300 ring-2 ring-green-300'
            : milestoneStatus === 'extra'
            ? 'bg-green-50 border-green-300' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-gray-600">Full Day</span>
            {milestoneStatus === 'full' || milestoneStatus === 'extra' ? (
              <Award className="w-3 h-3 text-green-500" />
            ) : (
              <Flag className="w-3 h-3 text-gray-300" />
            )}
          </div>
          <p className="text-sm font-bold text-gray-900">{markers.fullAttendance}h</p>
          <p className="text-[10px] text-gray-500">100% attendance</p>
        </div>

        {/* Extra Mileage */}
        <div className={`p-2 rounded-lg border transition-all ${
          milestoneStatus === 'extra'
            ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-300 animate-pulse' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-gray-600">Extra Mileage</span>
            {milestoneStatus === 'extra' ? (
              <Zap className="w-3 h-3 text-purple-500" />
            ) : (
              <Zap className="w-3 h-3 text-gray-300" />
            )}
          </div>
          <p className="text-sm font-bold text-gray-900">&gt;{markers.fullAttendance}h</p>
          <p className="text-[10px] text-gray-500">Flexibility earned</p>
        </div>
      </div>

      {/* Enhanced Progress Bar */}
      <div className="relative mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-gray-600">Progress</span>
          <span className="text-xs font-bold" style={{ color: attendance.color }}>
            {Math.round(percentage)}%
          </span>
        </div>
        
        <div className="h-10 bg-gray-100 rounded-xl overflow-hidden relative shadow-inner">
          {/* Progress Fill */}
          <div 
            className="h-full transition-all duration-700 ease-out relative rounded-xl"
            style={{
              width: `${percentage}%`,
              background: getProgressGradient(),
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            {/* Animated shimmer for overachievement */}
            {productiveHours > markers.fullAttendance && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            )}
            
            {/* Current value indicator */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold shadow-sm"
                 style={{ color: attendance.color }}>
              {productiveHours.toFixed(1)}h
            </div>
          </div>

          {/* Milestone Markers */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Half Day Marker */}
            <div 
              className="absolute h-full flex flex-col justify-end pb-1"
              style={{ left: `${halfMarkerPos}%` }}
            >
              <div className="w-0.5 h-full bg-amber-400/50" />
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-amber-600 whitespace-nowrap bg-white px-1 rounded">
                Half
              </div>
            </div>

            {/* Good Day Marker */}
            <div 
              className="absolute h-full flex flex-col justify-end pb-1"
              style={{ left: `${threeQuarterMarkerPos}%` }}
            >
              <div className="w-0.5 h-full bg-blue-400/50" />
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-blue-600 whitespace-nowrap bg-white px-1 rounded">
                Good
              </div>
            </div>

            {/* Full Day Marker */}
            <div 
              className="absolute h-full flex flex-col justify-end pb-1"
              style={{ left: `${fullMarkerPos}%` }}
            >
              <div className="w-1 h-full bg-green-500/50" />
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-green-600 whitespace-nowrap bg-white px-1 rounded">
                Full
              </div>
            </div>
          </div>
        </div>

        {/* Scale Labels */}
        <div className="flex justify-between mt-8 text-xs text-gray-500">
          <span className="font-medium">0h</span>
          <span className="font-medium">{markers.maxScale}h target</span>
        </div>
      </div>

      {/* Status Messages - Swapped order for better message visibility */}
      <div className="space-y-2">
        {/* Achievement Status - Moved to top */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" 
                 style={{ backgroundColor: attendance.color }} />
            <span className="text-xs text-gray-600">{isToday ? "Today's" : "Day's"} Achievement:</span>
            <span className="font-bold text-sm px-2 py-1 rounded-lg"
                  style={{ 
                    backgroundColor: `${attendance.color}15`,
                    color: attendance.color,
                    border: `1px solid ${attendance.color}30`
                  }}>
              {attendance.status}
            </span>
          </div>
          
          {productiveHours > markers.fullAttendance && (
            <div className="flex items-center gap-1 animate-bounce">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-bold text-yellow-600">
                +{(productiveHours - markers.fullAttendance).toFixed(1)}h Extra!
              </span>
            </div>
          )}
        </div>

        {/* Manager Message - Moved to bottom with more space */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-700 font-medium mb-2">{message}</p>
          <div className="border-t border-gray-300 pt-2">
            <p className="text-xs text-gray-600 italic leading-relaxed">
              {getActivityMessage(averageActivityScore, productiveHours, false)}
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <p>Tracking: 10 min per active screenshot</p>
          {markers.isHolidayWeek && (
            <p className="text-amber-600 font-medium">
              🎉 Holiday targets applied
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodaysHustle;