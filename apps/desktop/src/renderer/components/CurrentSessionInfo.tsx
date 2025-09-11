import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, AlertCircle } from 'lucide-react';

interface SessionInfo {
  startTime: Date;
  elapsedMinutes: number;
  trackedMinutes: number;
  mode: 'client' | 'command';
  averageActivityScore: number;
}

interface CurrentSessionInfoProps {
  currentSession: any;
}

export const CurrentSessionInfo: React.FC<CurrentSessionInfoProps> = ({ currentSession }) => {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!currentSession) {
      setSessionInfo(null);
      return;
    }

    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Load session info
    loadSessionInfo();

    // Refresh session info every minute
    const refreshTimer = setInterval(loadSessionInfo, 60000);

    return () => {
      clearInterval(timer);
      clearInterval(refreshTimer);
    };
  }, [currentSession]);

  useEffect(() => {
    if (sessionInfo) {
      updateMessage();
    }
  }, [sessionInfo, currentTime]);

  const loadSessionInfo = async () => {
    if (!currentSession) return;
    
    try {
      // Get session productive info
      const sessionData = await window.electronAPI.session.getProductiveInfo();
      if (!sessionData) return;
      
      const startTime = new Date(currentSession.startTime);
      const elapsedMinutes = Math.floor((Date.now() - startTime.getTime()) / 60000);
      
      // Use the actual tracked minutes calculated from valid activity periods
      // Each 10-minute window with valid activity = 10 tracked minutes
      const trackedMinutes = sessionData.productiveMinutes;
      
      console.log('Session Info Debug:', {
        startTime: startTime.toLocaleTimeString(),
        now: new Date().toLocaleTimeString(),
        elapsedMinutes,
        trackedMinutes,
        validPeriods: sessionData.validPeriods,
        sessionData
      });
      
      setSessionInfo({
        startTime,
        elapsedMinutes,
        trackedMinutes,
        mode: currentSession.mode,
        averageActivityScore: sessionData.averageActivityScore || 0
      });
    } catch (error) {
      console.error('Failed to load session info:', error);
    }
  };

  const updateMessage = () => {
    if (!sessionInfo) return;

    const hour = currentTime.getHours();
    const trackedHours = sessionInfo.trackedMinutes / 60;
    const elapsedHours = sessionInfo.elapsedMinutes / 60;
    const coverageRate = sessionInfo.elapsedMinutes > 0 
      ? Math.min(100, (sessionInfo.trackedMinutes / sessionInfo.elapsedMinutes) * 100)
      : 0;

    // Time-based and productivity-based messages
    let message = '';

    // Early Morning (6 AM - 10 AM)
    if (hour >= 6 && hour < 10) {
      if (coverageRate < 30) {
        message = "🔥 What is this?! Client escalation happening and you're sitting idle? The standup call is in 30 minutes, what will you show?!";
      } else if (coverageRate < 60) {
        message = "☕ Chai break is over! Other team members are already pushing code. Don't be the bottleneck in today's deployment!";
      } else if (trackedHours < 1) {
        message = "🌅 Good morning start, but remember - US client will wake up soon. Better have something substantial ready!";
      } else {
        message = "💪 Excellent morning activity! This is what we expect from a senior resource. Keep this momentum going!";
      }
    }
    // Late Morning to Lunch (10 AM - 2 PM)
    else if (hour >= 10 && hour < 14) {
      if (coverageRate < 30) {
        message = "😤 Are you on bench or what?! I can see you online but no commits! Should I escalate this?";
      } else if (coverageRate < 60) {
        message = "📊 Your utilization is pathetic! Client is asking for daily updates. What should I tell them - resource is 'exploring'?";
      } else if (trackedHours < 3) {
        message = "⏰ Half day almost close! Deadline is approaching. Stop browsing and start delivering!";
      } else {
        message = "✅ Good work! But don't relax yet. Remember, we need to show 9 hours tracked time to client!";
      }
    }
    // Afternoon (2 PM - 7 PM)
    else if (hour >= 14 && hour < 19) {
      if (coverageRate < 30) {
        message = "🚨 URGENT: Where are you?! Client pinged 3 times! Are you sleeping after lunch? This will go in your appraisal!";
      } else if (coverageRate < 60) {
        message = "😠 Team lead from onsite is asking about your progress. I'm tired of making excuses! Show some ownership!";
      } else if (trackedHours < 5) {
        message = "📈 Your activity graph looks like share market crash! Other team members have already logged 6+ hours!";
      } else {
        message = "👍 Finally some real work! But remember - we promised 2 features to client by EOD. Don't make me stay late!";
      }
    }
    // Evening (7 PM - 10 PM)
    else if (hour >= 19 && hour < 22) {
      if (coverageRate < 30) {
        message = "😡 What were you doing whole day?! Now sitting late for show-off? This is not startup, show me actual output!";
      } else if (coverageRate < 60) {
        message = "🎯 Target 9 hours not met! You want to explain to client why their feature is delayed? Work-life balance is earned, not given!";
      } else if (trackedHours < 7) {
        message = "⚡ Good that you're stretching! But quality matters. Client found 3 bugs in your last commit. Fix them ASAP!";
      } else {
        message = "🌟 Excellent dedication! This is the attitude that gets you onsite opportunity. Keep pushing till sign-off!";
      }
    }
    // Night (10 PM - 6 AM)
    else {
      if (coverageRate < 30) {
        message = "🌙 If you're working at night, at least show activity! Or is this just timesheet fraud? I'm tracking everything!";
      } else if (coverageRate < 60) {
        message = "🦉 Night shift means double activity expected! US team is watching. Don't embarrass us in front of client!";
      } else if (trackedHours < 4) {
        message = "☠️ Deadline warrior spotted! Should have planned better. Now suffer and deliver. No excuses tomorrow!";
      } else {
        message = "🏆 True dedication! But please don't burnout. We need you for next sprint also. Take some rest after deployment!";
      }
    }

    // Add extra harsh message for very low coverage
    if (coverageRate < 20 && elapsedHours > 0.5) {
      message += " 🔴 WARNING: Your screen time is being monitored! HR has been notified about low activity coverage!";
    }

    setMessage(message);
  };

  if (!currentSession || !sessionInfo) {
    return null;
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatStartTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const coverageRate = sessionInfo.elapsedMinutes > 0 
    ? Math.min(100, Math.round((sessionInfo.trackedMinutes / sessionInfo.elapsedMinutes) * 100))
    : 0;

  // Get color based on activity score (0-10 scale)
  const getActivityColor = (score: number) => {
    if (score >= 8.5) return '#10b981'; // green - Good
    if (score >= 7.0) return '#3b82f6'; // blue - Fair  
    if (score >= 5.5) return '#f59e0b'; // amber - Low
    if (score >= 4.0) return '#ef4444'; // red - Poor
    if (score >= 2.5) return '#dc2626'; // dark red - Critical
    return '#7c2d12'; // brown - Inactive
  };
  
  // Get activity level label
  const getActivityLevel = (score: number) => {
    if (score >= 8.5) return 'Good';
    if (score >= 7.0) return 'Fair';
    if (score >= 5.5) return 'Low';
    if (score >= 4.0) return 'Poor';
    if (score >= 2.5) return 'Critical';
    return 'Inactive';
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 px-4 py-2.5">
      <div className="flex items-center gap-3">
        {/* Session Status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-500/50"></div>
          <span className="text-xs font-semibold text-gray-800">Current Session</span>
          <span className="text-[10px] bg-gradient-to-r from-primary to-secondary text-white px-1.5 py-0.5 rounded-full">
            {sessionInfo.mode === 'client' ? 'Client' : 'Command'}
          </span>
        </div>

        <div className="h-8 w-px bg-gray-200"></div>

        {/* Start Time */}
        <div className="flex items-center gap-1 text-gray-600 flex-shrink-0">
          <Clock className="w-3 h-3" />
          <span className="text-xs font-medium">
            {formatStartTime(sessionInfo.startTime)}
          </span>
        </div>

        <div className="h-8 w-px bg-gray-200"></div>

        {/* Tracked Time */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <TrendingUp className="w-3.5 h-3.5" style={{ color: getActivityColor(sessionInfo.averageActivityScore) }} />
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold leading-tight" style={{ color: getActivityColor(sessionInfo.averageActivityScore) }}>
              {formatTime(sessionInfo.trackedMinutes)}
            </span>
            <span className="text-[9px] text-gray-500 leading-tight">tracked</span>
          </div>
        </div>

        <div className="h-8 w-px bg-gray-200"></div>

        {/* Elapsed Time */}
        <div className="flex flex-col items-center flex-shrink-0">
          <span className="text-sm font-semibold text-gray-700 leading-tight">
            {formatTime(sessionInfo.elapsedMinutes)}
          </span>
          <span className="text-[9px] text-gray-500 leading-tight">elapsed</span>
        </div>

        <div className="h-8 w-px bg-gray-200"></div>

        {/* Activity Score */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold leading-tight" style={{ color: getActivityColor(sessionInfo.averageActivityScore) }}>
              {sessionInfo.averageActivityScore.toFixed(1)}
            </span>
            <span className="text-[9px] text-gray-500 leading-tight">activity</span>
          </div>
          <span className="text-[10px] font-medium px-1 py-0.5 rounded-full" 
                style={{ 
                  backgroundColor: `${getActivityColor(sessionInfo.averageActivityScore)}20`,
                  color: getActivityColor(sessionInfo.averageActivityScore)
                }}>
            {getActivityLevel(sessionInfo.averageActivityScore)}
          </span>
        </div>

        <div className="h-8 w-px bg-gray-200"></div>

        {/* Coverage Rate */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div 
            className="text-sm font-bold px-2 py-0.5 rounded leading-tight"
            style={{ 
              backgroundColor: `${getActivityColor(sessionInfo.averageActivityScore)}15`,
              color: getActivityColor(sessionInfo.averageActivityScore)
            }}
          >
            {coverageRate}%
          </div>
          <span className="text-[9px] text-gray-500 leading-tight">coverage</span>
        </div>

        <div className="h-8 w-px bg-gray-200"></div>

        {/* Message - Takes remaining space */}
        <div className="flex items-center gap-1.5 flex-grow bg-gray-50 rounded-lg px-2.5 py-1.5 border-l-2" 
             style={{ borderLeftColor: getActivityColor(sessionInfo.averageActivityScore) }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: getActivityColor(sessionInfo.averageActivityScore) }} />
          <p className="text-[11px] text-gray-800 font-medium leading-tight line-clamp-2">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default CurrentSessionInfo;