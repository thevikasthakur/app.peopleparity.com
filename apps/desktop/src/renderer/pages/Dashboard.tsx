import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TimeDisplay } from '../components/TimeDisplay';
import { CurrentSessionDisplay } from '../components/CurrentSessionDisplay';
import { ActivitySelector } from '../components/ActivitySelector';
import { ActivityModal } from '../components/ActivityModal';
import { ScreenshotGrid } from '../components/ScreenshotGrid';
import { Analytics } from '../components/Analytics';
import { Leaderboard } from '../components/Leaderboard';
import { TaskSelector } from '../components/TaskSelector';
import { ProfileDropdown } from '../components/ProfileDropdown';
import { TodaysHustle } from '../components/TodaysHustle';
import { WeeklyMarathon } from '../components/WeeklyMarathon';
import { CurrentSessionInfo } from '../components/CurrentSessionInfo';
import { useTracker } from '../hooks/useTracker';
import { useTheme } from '../contexts/ThemeContext';
import { Coffee, Zap, Trophy, Activity, Play, Square, Clock, ChevronDown, Lock, Calendar, ChevronLeft, ChevronRight, Minus } from 'lucide-react';

const sarcasticMessages = [
  "Time to make the magic happen! ✨",
  "Show that code who's boss! 💪",
  "Fingers ready? Let's ship it! 🚀",
  "Building dreams, one commit at a time 🎯",
  "Code mode: ACTIVATED 🔥",
  "Strategic thinking time! 🧠",
  "The important 'other stuff' 📋"
];

export function Dashboard() {
  const { mode } = useTheme();
  const queryClient = useQueryClient();
  const { 
    currentSession, 
    todayStats, 
    weekStats, 
    screenshots,
    isIdle,
    isOperationInProgress,
    startSession,
    switchMode,
    stopSession
  } = useTracker();
  
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [randomMessage, setRandomMessage] = useState('');
  const [pendingMode, setPendingMode] = useState<'client' | 'command' | null>(null);
  // Load activity and recent activities from localStorage
  const [currentActivity, setCurrentActivity] = useState(() => {
    const saved = localStorage.getItem('currentActivity');
    return saved || currentSession?.activity || '';
  });
  const [recentActivities, setRecentActivities] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentActivities');
    return saved ? JSON.parse(saved) : [];
  });
  const [showAnalyticsTooltip, setShowAnalyticsTooltip] = useState(false);
  const [showLeaderboardTooltip, setShowLeaderboardTooltip] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Get current UTC date
    const now = new Date();
    // Create a date at UTC midnight for today
    const todayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0
    ));
    return todayUTC;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customScreenshots, setCustomScreenshots] = useState<any[]>([]);
  const [isLoadingScreenshots, setIsLoadingScreenshots] = useState(false);
  const [todaySessions, setTodaySessions] = useState<any[]>([]);

  useEffect(() => {
    setRandomMessage(sarcasticMessages[Math.floor(Math.random() * sarcasticMessages.length)]);
    loadTodaySessions();
  }, [selectedDate]);
  
  useEffect(() => {
    // Reload sessions when current session changes
    loadTodaySessions();
  }, [currentSession]);
  
  const loadTodaySessions = async () => {
    try {
      const sessions = await window.electronAPI.session.getTodaySessions(selectedDate.toISOString());
      setTodaySessions(sessions || []);
    } catch (error) {
      console.error('Failed to load sessions for date:', selectedDate, error);
    }
  };
  
  // Listen for concurrent session detection
  useEffect(() => {
    const handleConcurrentSession = (data: any) => {
      console.log('Concurrent session detected:', data);
      // Refresh dashboard to show stopped session
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      // Could also show a toast notification here if you have a toast library
    };
    
    window.electronAPI?.on('concurrent-session-detected', handleConcurrentSession);
    
    return () => {
      window.electronAPI?.off('concurrent-session-detected', handleConcurrentSession);
    };
  }, [queryClient]);

  // Load screenshots for selected date when it changes
  useEffect(() => {
    // Compare dates in UTC to match backend logic
  const isToday = (() => {
    const now = new Date();
    const selectedUTC = new Date(Date.UTC(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    ));
    const todayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ));
    return selectedUTC.getTime() === todayUTC.getTime();
  })();
    if (!isToday) {
      loadScreenshotsForDate(selectedDate);
    }
  }, [selectedDate]);

  const loadScreenshotsForDate = async (date: Date) => {
    setIsLoadingScreenshots(true);
    try {
      const data = await window.electronAPI.screenshots.getByDate(date);
      setCustomScreenshots(data);
    } catch (error) {
      console.error('Failed to load screenshots for date:', error);
      setCustomScreenshots([]);
    } finally {
      setIsLoadingScreenshots(false);
    }
  };

  const handleDateChange = (date: Date) => {
    // Convert the input date to UTC midnight
    const newDate = new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0, 0, 0, 0
    ));
    setSelectedDate(newDate);
    setShowDatePicker(false);
  };

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setUTCDate(newDate.getUTCDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setUTCDate(newDate.getUTCDate() + 1);
    
    // Check if future in UTC
    const now = new Date();
    const newDateUTC = new Date(Date.UTC(
      newDate.getFullYear(),
      newDate.getMonth(),
      newDate.getDate()
    ));
    const todayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ));
    
    if (newDateUTC <= todayUTC) {
      setSelectedDate(newDate);
    }
  };

  // Compare dates in UTC to match backend logic
  const isToday = (() => {
    const now = new Date();
    const selectedUTC = new Date(Date.UTC(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    ));
    const todayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ));
    return selectedUTC.getTime() === todayUTC.getTime();
  })();
  const displayScreenshots = isToday ? screenshots : customScreenshots;

  // Client mode disabled - always use command mode

  const handleTaskSelected = async (task: string, projectId?: string) => {
    // Check if we have a valid activity
    if (!currentActivity || currentActivity.trim() === '') {
      // Show activity modal first
      setShowTaskSelector(false);
      setShowActivityModal(true);
      return;
    }
    
    // Always use command mode
    const trackingMode = 'command_hours';
    const activityName = task?.trim() || currentActivity;
    
    try {
      if (currentSession) {
        await switchMode(trackingMode, activityName, projectId);
      } else {
        await startSession(trackingMode, activityName, projectId);
      }
    } catch (error) {
      console.error('Failed to handle task selection:', error);
    }
    setShowTaskSelector(false);
    setPendingMode(null);
  };

  const handleStartTracking = () => {
    // Always show activity selection when starting tracking
    setShowActivityModal(true);
  };

  const handleActivitySelected = async (activity: string) => {
    setCurrentActivity(activity);
    localStorage.setItem('currentActivity', activity);
    
    // Add to recent activities
    setRecentActivities(prev => {
      const updated = [activity, ...prev.filter(a => a !== activity)].slice(0, 12);
      localStorage.setItem('recentActivities', JSON.stringify(updated));
      return updated;
    });
    
    // Save to database (so it updates the session task and gets saved to screenshot notes)
    console.log('Dashboard: Saving activity to database:', activity);
    try {
      await window.electronAPI.notes.save(activity);
      console.log('Dashboard: Activity saved successfully:', activity);
    } catch (error) {
      console.error('Dashboard: Failed to save activity to database:', error);
    }
    
    // Close the activity modal BEFORE showing the loader
    setShowActivityModal(false);
    
    // If we don't have an active session, start one with just the activity (no task selector)
    if (!currentSession) {
      console.log('No active session, starting new session with activity:', activity);
      try {
        await startSession('command_hours', activity, undefined);
        console.log('Session started successfully with activity:', activity);
      } catch (error) {
        console.error('Failed to start session:', error);
        // Fall back to showing task selector if session start fails
        setPendingMode(mode);
        setShowTaskSelector(true);
      }
    }
  };

  const [showStopConfirmation, setShowStopConfirmation] = useState(false);

  const handleStopTracking = async () => {
    try {
      await stopSession();
      setShowStopConfirmation(true);
      // Hide confirmation after 3 seconds
      setTimeout(() => setShowStopConfirmation(false), 3000);
    } catch (error) {
      console.error('Failed to stop session:', error);
    }
  };

  return (
    <div className="min-h-screen" data-mode={mode}>
      {/* Full-screen Processing Overlay */}
      {isOperationInProgress && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-8 shadow-xl max-w-sm w-full mx-4">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-lg font-medium text-gray-800">
                Processing...
              </p>
              <p className="text-sm text-gray-500 text-center">
                Please wait while we update your tracking session
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Fixed Draggable Title Bar */}
      <div className="draggable-header fixed top-0 left-0 right-0 h-8 bg-gray-100/80 backdrop-blur-sm border-b border-gray-300 flex items-center justify-center z-50">
        <span className="text-xs text-gray-500 font-medium">People Parity Tracker</span>
      </div>
      
      {/* Stop Confirmation Notification */}
      {showStopConfirmation && (
        <div className="fixed top-12 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Tracking stopped successfully!</span>
          </div>
        </div>
      )}
      
      {/* Content with padding to account for fixed header */}
      <div className="p-6 pt-12">
        <div className="w-full space-y-4">
          
          {/* Header */}
          <div className="glass-card p-4 bounce-in shadow-lg">
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  People Parity
                </h1>
                <p className="sarcastic-text mt-1">{randomMessage}</p>
              </div>
              
              {/* Date Selector - Moved from screenshots section */}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={handlePreviousDay}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Previous day"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 rounded-lg transition-all relative border border-primary/20"
                >
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="font-medium">
                    {isToday ? 'Today' : `${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`}
                  </span>
                  
                  {/* Date Picker Dropdown */}
                  {showDatePicker && (
                    <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50">
                      <input
                        type="date"
                        value={selectedDate.toISOString().split('T')[0]}
                        max={(() => {
                          const now = new Date();
                          const todayUTC = new Date(Date.UTC(
                            now.getUTCFullYear(),
                            now.getUTCMonth(),
                            now.getUTCDate()
                          ));
                          return todayUTC.toISOString().split('T')[0];
                        })()}
                        onChange={(e) => handleDateChange(new Date(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  )}
                </button>
                
                <button
                  onClick={handleNextDay}
                  className={`p-1.5 hover:bg-gray-100 rounded-lg transition-colors ${
                    isToday 
                      ? 'opacity-50 cursor-not-allowed' 
                      : ''
                  }`}
                  disabled={isToday}
                  title="Next day"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                
                {!isToday && (
                  <button
                    onClick={() => {
                      // Get current UTC date
                      const now = new Date();
                      const todayUTC = new Date(Date.UTC(
                        now.getUTCFullYear(),
                        now.getUTCMonth(),
                        now.getUTCDate(),
                        0, 0, 0, 0
                      ));
                      setSelectedDate(todayUTC);
                    }}
                    className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Current Session Display - Enhanced Version */}
              {currentSession && (
                <CurrentSessionInfo currentSession={currentSession} />
              )}
              
              {!currentSession ? (
                <button
                  onClick={handleStartTracking}
                  className="btn-primary flex items-center gap-2"
                  disabled={isOperationInProgress || showTaskSelector}
                >
                  <Play className="w-4 h-4" />
                  Start Tracking
                </button>
              ) : (
                <button
                  onClick={handleStopTracking}
                  disabled={isOperationInProgress}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  Stop Tracking
                </button>
              )}
              
              <ProfileDropdown />
            </div>
          </div>
        </div>

        {/* Time Stats - Today's Hustle and Weekly Marathon */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TodaysHustle selectedDate={selectedDate} isToday={isToday} />
          <WeeklyMarathon selectedDate={selectedDate} isToday={isToday} />
        </div>

        {/* Info Cards Row - Activity, Analytics, Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Activity */}
          <div className="glass-card p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Activity
            </h3>
            
            {/* Activity Selector */}
            <div 
              className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors mb-3"
              onClick={() => setShowActivityModal(true)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-sm">
                    {currentActivity || 'Select Activity'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Click to change
              </p>
            </div>
            
            {/* Today's Sessions List */}
            {todaySessions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-gray-600">{isToday ? 'Earlier Today' : `Sessions on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`}</h4>
                  <span className="text-xs text-gray-500">{todaySessions.length} session{todaySessions.length !== 1 ? 's' : ''}</span>
                </div>
                
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {todaySessions.slice(0, 8).map((session) => {
                    const sessionStartTime = new Date(session.startTime);
                    const sessionEndTime = session.endTime ? new Date(session.endTime) : null;
                    const startTimeStr = sessionStartTime.toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    });
                    const endTimeStr = sessionEndTime ? sessionEndTime.toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    }) : 'ongoing';
                    const timeRange = `${startTimeStr} - ${endTimeStr}`;

                    const formatSessionTime = (minutes: number) => {
                      const hours = Math.floor(minutes / 60);
                      const mins = minutes % 60;
                      if (hours > 0) {
                        return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
                      }
                      return `${mins}m`;
                    };
                    
                    const getActivityColor = (score: number) => {
                      if (score >= 8.5) return '#10b981';
                      if (score >= 7.0) return '#3b82f6';
                      if (score >= 5.5) return '#f59e0b';
                      if (score >= 4.0) return '#ef4444';
                      return '#dc2626';
                    };
                    
                    const getActivityLevel = (score: number) => {
                      if (score >= 8.5) return 'Good';
                      if (score >= 7.0) return 'Fair';
                      if (score >= 5.5) return 'Low';
                      if (score >= 4.0) return 'Poor';
                      return 'Critical';
                    };

                    const isCurrentSession = currentSession && session.id === currentSession.id;

                    return (
                      <div 
                        key={session.id} 
                        className={`flex items-center justify-between px-2.5 py-2 rounded-md transition-colors ${
                          isCurrentSession 
                            ? 'bg-primary/10 border border-primary/20' 
                            : 'bg-white hover:bg-gray-50 border border-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Status */}
                          <div className="flex-shrink-0">
                            {session.isActive ? (
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            ) : (
                              <Minus className="w-3 h-3 text-gray-300" />
                            )}
                          </div>
                          
                          {/* Time and task */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-gray-700">{timeRange}</span>
                              {isCurrentSession && (
                                <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded text-[10px]">Active</span>
                              )}
                            </div>
                            <p className="text-gray-500 truncate text-xs mt-0.5">
                              {session.task || 'No activity specified'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Metrics */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          {/* Elapsed time */}
                          <div className="text-right">
                            <div className="text-xs font-medium text-gray-600">
                              {formatSessionTime(session.elapsedMinutes)}
                            </div>
                            <div className="text-[10px] text-gray-400">elapsed</div>
                          </div>
                          
                          {/* Tracked time */}
                          <div className="text-right">
                            <div className="text-xs font-semibold" style={{ color: getActivityColor(session.averageActivityScore) }}>
                              {formatSessionTime(session.trackedMinutes)}
                            </div>
                            <div className="text-[10px] text-gray-400">tracked</div>
                          </div>
                          
                          {/* Activity level */}
                          <div className="text-right min-w-[45px]">
                            <div className="text-xs font-semibold" style={{ color: getActivityColor(session.averageActivityScore) }}>
                              {session.averageActivityScore.toFixed(1)}
                            </div>
                            <div className="text-[10px]" style={{ color: getActivityColor(session.averageActivityScore) }}>
                              {getActivityLevel(session.averageActivityScore)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {todaySessions.length > 8 && (
                  <p className="text-xs text-gray-400 text-center mt-2">+{todaySessions.length - 8} more session{todaySessions.length - 8 !== 1 ? 's' : ''}</p>
                )}
              </div>
            )}
            
            {todaySessions.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400">No sessions {isToday ? 'yet today' : 'on this date'}</p>
                <p className="text-xs text-gray-400 mt-1">{isToday ? 'Start tracking to see your sessions here' : 'Select a different date to view sessions'}</p>
              </div>
            )}
          </div>

          {/* Analytics */}
          <div 
            className="glass-card p-4 relative cursor-not-allowed"
            onMouseEnter={() => setShowAnalyticsTooltip(true)}
            onMouseLeave={() => setShowAnalyticsTooltip(false)}
          >
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Your Vibes Today
              <Lock className="w-4 h-4 text-gray-400 ml-auto" />
            </h3>
            <div className="relative">
              <div className="blur-sm pointer-events-none select-none">
                <Analytics 
                  focusMinutes={todayStats.analytics.focusMinutes}
                  handsOnMinutes={todayStats.analytics.handsOnMinutes}
                  researchMinutes={todayStats.analytics.researchMinutes}
                  aiMinutes={todayStats.analytics.aiMinutes}
                />
              </div>
              {showAnalyticsTooltip && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm shadow-xl z-10 max-w-[200px] text-center">
                    This feature will be unlocked after we have sufficient data about your work patterns
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard */}
          <div 
            className="glass-card p-4 relative cursor-not-allowed"
            onMouseEnter={() => setShowLeaderboardTooltip(true)}
            onMouseLeave={() => setShowLeaderboardTooltip(false)}
          >
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Hall of Fame
              <Lock className="w-4 h-4 text-gray-400 ml-auto" />
            </h3>
            <div className="relative">
              <div className="blur-sm pointer-events-none select-none">
                <Leaderboard />
              </div>
              {showLeaderboardTooltip && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm shadow-xl z-10 max-w-[200px] text-center">
                    This feature will be unlocked after we have sufficient data about team performance
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Screenshots - Full Width */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              {isToday ? "Today's" : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} Snapshots
            </h2>
            
            <span className="text-sm text-muted">
              {isLoadingScreenshots ? 'Loading...' : `${displayScreenshots.length} moments captured`}
            </span>
          </div>
          
          {isLoadingScreenshots ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading screenshots...</div>
            </div>
          ) : (
            <ScreenshotGrid 
              screenshots={displayScreenshots}
              onScreenshotClick={(id) => console.log('Screenshot clicked:', id)}
              onSelectionChange={(ids) => console.log('Selection changed:', ids)}
              onRefresh={async () => {
                if (isToday) {
                  // Invalidate the screenshots query to refetch the data
                  await queryClient.invalidateQueries({ queryKey: ['screenshots'] });
                } else {
                  // Reload screenshots for the selected date
                  await loadScreenshotsForDate(selectedDate);
                }
                console.log('Screenshots refreshed');
              }}
            />
          )}
        </div>
        </div>
      </div>

      {/* Task Selector Modal */}
      {showTaskSelector && (
        <TaskSelector
          isOpen={showTaskSelector}
          onClose={() => {
            setShowTaskSelector(false);
            setPendingMode(null);
          }}
          onSelect={handleTaskSelected}
          mode={pendingMode || mode}
        />
      )}

      {/* Activity Modal */}
      <ActivityModal
        isOpen={showActivityModal}
        onClose={() => {
          // Only allow closing if there's an activity set
          if (currentActivity) {
            setShowActivityModal(false);
          }
        }}
        currentActivity={currentActivity}
        onActivityChange={handleActivitySelected}
        recentActivities={recentActivities}
      />
    </div>
  );
}