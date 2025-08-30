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

    const calculateElapsedTime = () => {
      const sessionStart = new Date(currentSession.startTime);
      
      // Sort screenshots by timestamp for neighbor checking
      const sessionScreenshots = screenshots
        .filter(s => new Date(s.timestamp) >= sessionStart)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Filter screenshots that should be counted
      const countableScreenshots = sessionScreenshots.filter((s, index) => {
        const scoreOutOf10 = Math.round(s.activityScore) / 10;
        
        // Count if score >= 4.0 (Poor, Fair, Good)
        if (scoreOutOf10 >= 4.0) {
          return true;
        }
        
        // Check if it's Critical (2.5-4.0)
        if (scoreOutOf10 >= 2.5 && scoreOutOf10 < 4.0) {
          // Check condition 1: Either neighbor is better (>= 4.0)
          // Check previous neighbor
          if (index > 0) {
            const prevScore = Math.round(sessionScreenshots[index - 1].activityScore) / 10;
            if (prevScore >= 4.0) return true;
          }
          
          // Check next neighbor
          if (index < sessionScreenshots.length - 1) {
            const nextScore = Math.round(sessionScreenshots[index + 1].activityScore) / 10;
            if (nextScore >= 4.0) return true;
          }
          
          // Check condition 2: Average activity for the hour is >= 4.0
          const screenshotTime = new Date(s.timestamp);
          const hourStart = new Date(screenshotTime);
          hourStart.setMinutes(0, 0, 0);
          const hourEnd = new Date(hourStart);
          hourEnd.setHours(hourEnd.getHours() + 1);
          
          const hourScreenshots = sessionScreenshots.filter(hs => {
            const hsTime = new Date(hs.timestamp);
            return hsTime >= hourStart && hsTime < hourEnd;
          });
          
          if (hourScreenshots.length > 0) {
            const avgScore = hourScreenshots.reduce((sum, hs) => 
              sum + (Math.round(hs.activityScore) / 10), 0) / hourScreenshots.length;
            if (avgScore >= 4.0) return true;
          }
        }
        
        // Don't count Inactive periods (< 2.5)
        return false;
      });

      // Each countable screenshot contributes 10 minutes
      const totalMinutes = countableScreenshots.length * 10;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0')
      ].join(':');
    };

    // Set initial time
    setElapsedTime(calculateElapsedTime());

    // Update every minute
    const interval = setInterval(() => {
      setElapsedTime(calculateElapsedTime());
    }, 60000);

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