import React, { useState, useEffect } from 'react';
import { ModeToggle } from '../components/ModeToggle';
import { SessionInfo } from '../components/SessionInfo';
import { TimeDisplay } from '../components/TimeDisplay';
import { ScreenshotGrid } from '../components/ScreenshotGrid';
import { Analytics } from '../components/Analytics';
import { Leaderboard } from '../components/Leaderboard';
import { TaskSelector } from '../components/TaskSelector';
import { ProfileDropdown } from '../components/ProfileDropdown';
import { useTracker } from '../hooks/useTracker';
import { useTheme } from '../contexts/ThemeContext';
import { Coffee, Zap, Trophy, Activity, Play, Square } from 'lucide-react';

const sarcasticMessages = {
  client: [
    "Time to make the magic happen! ✨",
    "Show that code who's boss! 💪",
    "Fingers ready? Let's ship it! 🚀",
    "Building dreams, one commit at a time 🎯",
    "Code mode: ACTIVATED 🔥"
  ],
  command: [
    "Strategic thinking time! 🧠",
    "Meetings, reviews, and coffee breaks ☕",
    "The important 'other stuff' 📋",
    "Because not everything is coding 🤷",
    "Admin mode: Because someone has to do it 📝"
  ],
  idle: [
    "Miss me? Your keyboard does! 👀",
    "Coffee break extended? No judgment... 😏",
    "AFK detector says: Hello? Anyone there? 🎭",
    "Your chair is getting lonely 🪑",
    "Screen's still here when you get back! 👋"
  ]
};

export function Dashboard() {
  const { mode, setMode } = useTheme();
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
  const [randomMessage, setRandomMessage] = useState('');
  const [pendingMode, setPendingMode] = useState<'client' | 'command' | null>(null);

  useEffect(() => {
    const messageType = isIdle ? 'idle' : mode === 'client' ? 'client' : 'command';
    const messages = sarcasticMessages[messageType];
    setRandomMessage(messages[Math.floor(Math.random() * messages.length)]);
  }, [mode, isIdle]);

  const handleModeToggle = async (newMode: 'client' | 'command') => {
    if (newMode === mode) return;
    
    setPendingMode(newMode);
    setShowTaskSelector(true);
  };

  const handleTaskSelected = async (task: string, projectId?: string) => {
    if (!pendingMode) return;
    
    const trackingMode = pendingMode === 'client' ? 'client_hours' : 'command_hours';
    
    if (currentSession) {
      await switchMode(trackingMode, task, projectId);
    } else {
      await startSession(trackingMode, task, projectId);
    }
    setMode(pendingMode);
    setShowTaskSelector(false);
    setPendingMode(null);
  };

  const handleStartTracking = () => {
    setPendingMode(mode);
    setShowTaskSelector(true);
  };

  const handleStopTracking = async () => {
    await stopSession();
  };

  return (
    <div className="min-h-screen p-4" data-mode={mode}>
      <div className="w-full space-y-4">
        
        {/* Header */}
        <div className="glass-card p-4 bounce-in">
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
              
              <ModeToggle 
                mode={mode} 
                onModeChange={handleModeToggle}
                disabled={showTaskSelector || !currentSession}
              />
              
              <ProfileDropdown />
            </div>
          </div>
        </div>

        {/* Time Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TimeDisplay
            title="Today's Hustle"
            clientHours={todayStats.clientHours}
            commandHours={todayStats.commandHours}
            icon={<Coffee className="w-5 h-5" />}
            message={todayStats.totalHours > 6 ? "Overachiever alert! 🏆" : "Keep it going! 💪"}
          />
          
          <TimeDisplay
            title="Weekly Marathon"
            clientHours={weekStats.clientHours}
            commandHours={weekStats.commandHours}
            icon={<Zap className="w-5 h-5" />}
            message={weekStats.totalHours > 30 ? "Productivity champion! 🎉" : "Steady progress! 📈"}
          />
        </div>

        {/* Info Cards Row - Current Session, Analytics, Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Current Session */}
          <div className="glass-card p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Current Session
            </h3>
            <SessionInfo 
              session={currentSession}
              mode={mode}
              onNotesChange={(notes) => console.log('Notes updated:', notes)}
            />
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
    </div>
  );
}