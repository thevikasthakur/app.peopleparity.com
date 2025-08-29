import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CurrentSessionDisplayProps {
  screenshots: any[];
  currentSession: any;
}

export function CurrentSessionDisplay({ screenshots, currentSession }: CurrentSessionDisplayProps) {
  const [elapsedTime, setElapsedTime] = useState('00:00');

  useEffect(() => {
    if (!currentSession) {
      setElapsedTime('00:00');
      return;
    }

    // Count time based on non-critical screenshots (score > 4.0)
    const sessionStart = new Date(currentSession.startTime);
    const now = new Date();
    
    // Filter screenshots from current session that are non-critical (score > 4.0 out of 10)
    const nonCriticalScreenshots = screenshots.filter(s => {
      const screenshotTime = new Date(s.timestamp);
      // Convert percentage to 10-scale
      const scoreOutOf10 = Math.round(s.activityScore) / 10;
      return screenshotTime >= sessionStart && scoreOutOf10 > 4.0;
    });

    // Each non-critical screenshot contributes 10 minutes
    const totalMinutes = nonCriticalScreenshots.length * 10;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const formattedTime = [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0')
    ].join(':');

    setElapsedTime(formattedTime);

    const interval = setInterval(() => {
      // Recalculate on interval to keep it updated
      const updatedNonCriticalScreenshots = screenshots.filter(s => {
        const screenshotTime = new Date(s.timestamp);
        const scoreOutOf10 = Math.round(s.activityScore) / 10;
        return screenshotTime >= sessionStart && scoreOutOf10 > 4.0;
      });
      
      const updatedTotalMinutes = updatedNonCriticalScreenshots.length * 10;
      const updatedHours = Math.floor(updatedTotalMinutes / 60);
      const updatedMinutes = updatedTotalMinutes % 60;
      
      const updatedTime = [
        updatedHours.toString().padStart(2, '0'),
        updatedMinutes.toString().padStart(2, '0')
      ].join(':');
      
      setElapsedTime(updatedTime);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [currentSession, screenshots]);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Current Session</h3>
        </div>
      </div>
      
      <div className="text-center">
        <div className="text-3xl font-bold font-mono tracking-wider">
          {elapsedTime}
        </div>
        <p className="text-xs text-muted mt-1">
          {currentSession ? 'Based on productive time' : 'No active session'}
        </p>
      </div>
      
      {currentSession && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Started: {new Date(currentSession.startTime).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}