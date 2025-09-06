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
import { useTracker } from '../hooks/useTracker';
import { useTheme } from '../contexts/ThemeContext';
import { Coffee, Zap, Trophy, Activity, Play, Square, Clock, ChevronDown, Lock, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customScreenshots, setCustomScreenshots] = useState<any[]>([]);
  const [isLoadingScreenshots, setIsLoadingScreenshots] = useState(false);

  useEffect(() => {
    setRandomMessage(sarcasticMessages[Math.floor(Math.random() * sarcasticMessages.length)]);
  }, []);

  // Load screenshots for selected date when it changes
  useEffect(() => {
    const isToday = selectedDate.toDateString() === new Date().toDateString();
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
    setSelectedDate(date);
    setShowDatePicker(false);
  };

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    // Don't allow future dates
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
    }
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();
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
    
    if (currentSession) {
      await switchMode(trackingMode, activityName, projectId);
    } else {
      await startSession(trackingMode, activityName, projectId);
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
    
    // Close the activity modal
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

  const [isStopping, setIsStopping] = useState(false);
  const [showStopConfirmation, setShowStopConfirmation] = useState(false);

  const handleStopTracking = async () => {
    setIsStopping(true);
    try {
      await stopSession();
      setShowStopConfirmation(true);
      // Hide confirmation after 3 seconds
      setTimeout(() => setShowStopConfirmation(false), 3000);
    } catch (error) {
      console.error('Failed to stop session:', error);
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <div className="min-h-screen" data-mode={mode}>
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
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                People Parity
              </h1>
              <p className="sarcastic-text mt-1">{randomMessage}</p>
            </div>
            
            <div className="flex items-center gap-4">
              {!currentSession ? (
                <button
                  onClick={handleStartTracking}
                  className="btn-primary flex items-center gap-2"
                  disabled={showTaskSelector}
                >
                  <Play className="w-4 h-4" />
                  Start Tracking
                </button>
              ) : (
                <button
                  onClick={handleStopTracking}
                  disabled={isStopping}
                  className={`btn-secondary flex items-center gap-2 ${isStopping ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isStopping ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Stopping...
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4" />
                      Stop Tracking
                    </>
                  )}
                </button>
              )}
              
              <ProfileDropdown />
            </div>
          </div>
        </div>

        {/* Time Stats - Current Session, Today's Hustle, Weekly Marathon */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CurrentSessionDisplay
            screenshots={screenshots}
            currentSession={currentSession}
          />
          
          <TimeDisplay
            title="Today's Hustle"
            clientHours={todayStats.clientHours}
            commandHours={todayStats.commandHours}
            icon={<Coffee className="w-5 h-5" />}
            message=""
          />
          
          <TimeDisplay
            title="Weekly Marathon"
            clientHours={weekStats.clientHours}
            commandHours={weekStats.commandHours}
            icon={<Zap className="w-5 h-5" />}
            message=""
          />
        </div>

        {/* Info Cards Row - Activity, Analytics, Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Activity */}
          <div className="glass-card p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Activity
            </h3>
            <div 
              className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setShowActivityModal(true)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-lg">
                    {currentActivity || 'Select Activity'}
                  </span>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Click to change your current activity
              </p>
            </div>
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
              {isToday ? "Today's" : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} Snapshots
            </h2>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted">
                {isLoadingScreenshots ? 'Loading...' : `${displayScreenshots.length} moments captured`}
              </span>
              
              {/* Date Selector */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviousDay}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Previous day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors relative"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {isToday ? 'Today' : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  
                  {/* Simple Date Picker Dropdown */}
                  {showDatePicker && (
                    <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50">
                      <input
                        type="date"
                        value={selectedDate.toISOString().split('T')[0]}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => handleDateChange(new Date(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  )}
                </button>
                
                <button
                  onClick={handleNextDay}
                  className={`p-1 hover:bg-gray-100 rounded transition-colors ${
                    selectedDate.toDateString() === new Date().toDateString() 
                      ? 'opacity-50 cursor-not-allowed' 
                      : ''
                  }`}
                  disabled={selectedDate.toDateString() === new Date().toDateString()}
                  title="Next day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                
                {!isToday && (
                  <button
                    onClick={() => setSelectedDate(new Date())}
                    className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>
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