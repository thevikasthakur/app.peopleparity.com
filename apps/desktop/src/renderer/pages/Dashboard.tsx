import React, { useState, useEffect } from 'react';
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
import { Coffee, Zap, Trophy, Activity, Play, Square, Clock, ChevronDown } from 'lucide-react';

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

  useEffect(() => {
    setRandomMessage(sarcasticMessages[Math.floor(Math.random() * sarcasticMessages.length)]);
  }, []);

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

  const handleActivitySelected = (activity: string) => {
    setCurrentActivity(activity);
    localStorage.setItem('currentActivity', activity);
    
    // Add to recent activities
    setRecentActivities(prev => {
      const updated = [activity, ...prev.filter(a => a !== activity)].slice(0, 12);
      localStorage.setItem('recentActivities', JSON.stringify(updated));
      return updated;
    });
    
    // Close the activity modal
    setShowActivityModal(false);
    
    // If we don't have an active session, proceed to task selector
    if (!currentSession) {
      setPendingMode(mode);
      setShowTaskSelector(true);
    }
  };

  const handleStopTracking = async () => {
    await stopSession();
  };

  return (
    <div className="min-h-screen" data-mode={mode}>
      {/* Fixed Draggable Title Bar */}
      <div className="draggable-header fixed top-0 left-0 right-0 h-8 bg-gray-100/80 backdrop-blur-sm border-b border-gray-300 flex items-center justify-center z-50">
        <span className="text-xs text-gray-500 font-medium">People Parity Tracker</span>
      </div>
      
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
          <div className="glass-card p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Your Vibes Today
            </h3>
            <Analytics 
              focusMinutes={todayStats.analytics.focusMinutes}
              handsOnMinutes={todayStats.analytics.handsOnMinutes}
              researchMinutes={todayStats.analytics.researchMinutes}
              aiMinutes={todayStats.analytics.aiMinutes}
            />
          </div>

          {/* Leaderboard */}
          <div className="glass-card p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Hall of Fame
            </h3>
            <Leaderboard />
          </div>
        </div>

        {/* Screenshots - Full Width */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Today's Snapshots
            </h2>
            <span className="text-sm text-muted">
              {screenshots.length} moments captured
            </span>
          </div>
          
          <ScreenshotGrid 
            screenshots={screenshots}
            onScreenshotClick={(id) => console.log('Screenshot clicked:', id)}
            onSelectionChange={(ids) => console.log('Selection changed:', ids)}
          />
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