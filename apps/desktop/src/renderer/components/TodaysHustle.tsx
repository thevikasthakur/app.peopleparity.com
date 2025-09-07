import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, Award, Zap, Coffee, Target } from 'lucide-react';

interface HustleData {
  productiveHours: number;
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

export const TodaysHustle: React.FC = () => {
  const [hustleData, setHustleData] = useState<HustleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHustleData();
    // Refresh every 5 minutes
    const interval = setInterval(loadHustleData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadHustleData = async () => {
    try {
      const data = await window.electronAPI.getProductiveHours();
      console.log('Loaded hustle data:', data);
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

  const { productiveHours, markers, message, attendance } = hustleData;
  const percentage = Math.min((productiveHours / markers.maxScale) * 100, 100);
  
  // Calculate marker positions as percentages
  const halfMarkerPos = (markers.halfAttendance / markers.maxScale) * 100;
  const threeQuarterMarkerPos = (markers.threeQuarterAttendance / markers.maxScale) * 100;
  const fullMarkerPos = (markers.fullAttendance / markers.maxScale) * 100;

  // Determine the icon based on performance
  const getIcon = () => {
    if (productiveHours === 0) return <Coffee className="w-5 h-5" />;
    if (productiveHours < markers.halfAttendance) return <Clock className="w-5 h-5" />;
    if (productiveHours < markers.fullAttendance) return <Target className="w-5 h-5" />;
    if (productiveHours > markers.fullAttendance) return <Zap className="w-5 h-5" />;
    return <Award className="w-5 h-5" />;
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Today's Hustle</h3>
          {markers.isHolidayWeek && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
              Holiday Week
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold" style={{ color: attendance.color }}>
            {productiveHours.toFixed(1)}h
          </span>
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
              background: productiveHours >= markers.fullAttendance 
                ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' 
                : productiveHours >= markers.threeQuarterAttendance
                ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                : productiveHours >= markers.halfAttendance
                ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(90deg, #6b7280 0%, #4b5563 100%)'
            }}
          >
            {/* Animated shimmer effect for extra mileage */}
            {productiveHours > markers.fullAttendance && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            )}
          </div>

          {/* Scale Markers */}
          <div className="absolute inset-0 flex items-center">
            {/* Half Attendance Marker */}
            <div 
              className="absolute h-full w-0.5 bg-gray-400"
              style={{ left: `${halfMarkerPos}%` }}
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap">
                {markers.halfAttendance}h (0.5)
              </div>
            </div>

            {/* Three Quarter Attendance Marker */}
            <div 
              className="absolute h-full w-0.5 bg-gray-500"
              style={{ left: `${threeQuarterMarkerPos}%` }}
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap">
                {markers.threeQuarterAttendance}h (0.75)
              </div>
            </div>

            {/* Full Attendance Marker */}
            <div 
              className="absolute h-full w-1 bg-green-500"
              style={{ left: `${fullMarkerPos}%` }}
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-green-600 whitespace-nowrap">
                {markers.fullAttendance}h (Full)
              </div>
            </div>
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
            <span className="text-xs text-gray-500">Attendance Earned:</span>
            <span 
              className="text-sm font-bold px-2 py-1 rounded"
              style={{ 
                backgroundColor: `${attendance.color}20`,
                color: attendance.color 
              }}
            >
              {attendance.status}
            </span>
          </div>
          
          {productiveHours > markers.fullAttendance && (
            <div className="flex items-center space-x-1">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-semibold text-yellow-600">
                +{(productiveHours - markers.fullAttendance).toFixed(1)}h Extra Mileage!
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 text-xs text-gray-500">
        <p>Based on productive hours (10 min per active screenshot)</p>
        {markers.isHolidayWeek && (
          <p className="mt-1 text-amber-600">
            Holiday week: relaxed targets
          </p>
        )}
      </div>
    </div>
  );
};

export default TodaysHustle;