import React, { useState, useEffect } from 'react';
import { Play, Pause, Clock, Edit3, Hash, AlertCircle } from 'lucide-react';

interface SessionInfoProps {
  session: {
    id: string;
    startTime: Date;
    activity: string;
    mode: 'client' | 'command';
    projectName?: string;
    isActive: boolean;
  } | null;
  mode: 'client' | 'command';
  onNotesChange: (notes: string) => void;
}

export function SessionInfo({ session, mode, onNotesChange }: SessionInfoProps) {
  const [duration, setDuration] = useState('00:00:00');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(session?.activity || '');

  useEffect(() => {
    if (!session?.isActive) return;

    const timer = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - new Date(session.startTime).getTime();
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      setDuration(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [session]);

  const handleNotesSubmit = () => {
    onNotesChange(notes);
    setIsEditingNotes(false);
  };

  if (!session) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-gray-400">
          {mode === 'client' 
            ? "Ready to code? Start tracking! 🚀"
            : "Admin mode ready! 📋"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${session.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
            {session.isActive ? (
              <Play className="w-4 h-4 text-green-600" />
            ) : (
              <Pause className="w-4 h-4 text-gray-600" />
            )}
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <span className={`
                px-2 py-0.5 rounded-full text-xs font-medium
                ${mode === 'client' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'bg-emerald-100 text-emerald-700'}
              `}>
                {mode === 'client' ? 'CLIENT' : 'COMMAND'}
              </span>
              {session.projectName && (
                <span className="text-xs text-gray-600">
                  {session.projectName}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1 text-2xl font-mono font-bold">
            <Clock className="w-5 h-5 text-gray-400" />
            {duration}
          </div>
          <p className="text-xs text-gray-500">
            Since {new Date(session.startTime).toLocaleTimeString()}
          </p>
        </div>
      </div>

      <div className="border-t pt-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Hash className="w-3 h-3 text-gray-400" />
              <span className="text-xs font-medium text-gray-600">Activity</span>
              <button
                onClick={() => setIsEditingNotes(!isEditingNotes)}
                className="p-0.5 hover:bg-gray-100 rounded transition-colors"
              >
                <Edit3 className="w-3 h-3 text-gray-400" />
              </button>
            </div>
            
            {isEditingNotes ? (
              <div className="space-y-1">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-2 py-1 text-sm rounded border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
                  rows={2}
                  placeholder="What are you working on?"
                  autoFocus
                />
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setNotes(session.activity);
                      setIsEditingNotes(false);
                    }}
                    className="px-2 py-0.5 text-xs rounded border border-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNotesSubmit}
                    className="px-2 py-0.5 text-xs rounded bg-primary text-white hover:bg-primary/90"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-800">
                {notes || session.activity || 'No activity description'}
              </p>
            )}
          </div>
        </div>
      </div>

      {session.isActive && (
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-1">
            <div className="pulse-dot" style={{ width: '6px', height: '6px' }} />
            <span className="text-xs text-gray-600">Tracking</span>
          </div>
        </div>
      )}
    </div>
  );
}