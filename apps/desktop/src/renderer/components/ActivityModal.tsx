import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, ChevronDown, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentActivity: string;
  onActivityChange: (activity: string) => void;
  recentActivities?: string[];
}

const defaultActivities = [
  'Development',
  'Code Review', 
  'Testing',
  'Documentation',
  'Meeting',
  'Research',
  'Bug Fixing',
  'Planning',
  'Design',
  'Debugging',
  'Refactoring',
  'Learning'
];

export function ActivityModal({ 
  isOpen, 
  onClose, 
  currentActivity,
  onActivityChange,
  recentActivities = []
}: ActivityModalProps) {
  const [activityText, setActivityText] = useState(currentActivity || '');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRecent, setSelectedRecent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  
  // Combine recent and default activities, remove duplicates
  const allActivities = Array.from(new Set([
    ...recentActivities,
    ...defaultActivities
  ])).filter(a => a && a.trim());

  useEffect(() => {
    if (isOpen) {
      setActivityText(currentActivity || '');
      setSelectedRecent('');
      setIsEditing(false);
      // Focus textarea after modal opens
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, currentActivity]);

  const handleSelectRecent = (activity: string) => {
    if (activity) {
      setActivityText(activity);
      setSelectedRecent(activity);
      setIsEditing(true);
      // Focus textarea so user can edit if needed
      if (textareaRef.current) {
        textareaRef.current.focus();
        const length = activity.length;
        textareaRef.current.setSelectionRange(length, length);
      }
    }
  };

  const handleSave = () => {
    const finalActivity = activityText.trim();
    // Don't allow saving without an activity
    if (!finalActivity) {
      return;
    }
    onActivityChange(finalActivity);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      // Only allow escape if there's a current activity
      if (currentActivity) {
        onClose();
      }
    }
  };

  const characterCount = activityText.length;
  const maxLength = 500;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => {
              // Only allow closing if there's an existing activity
              if (currentActivity) {
                onClose();
              }
            }}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
          >
            <div className="glass-card p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">Select Activity</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    What are you working on?
                  </p>
                </div>
                {/* Only show close button if there's already an activity set */}
                {currentActivity && (
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Recent Activities Dropdown */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Recent Activity
                </label>
                <div className="relative">
                  <select
                    ref={selectRef}
                    value={selectedRecent}
                    onChange={(e) => handleSelectRecent(e.target.value)}
                    className="w-full px-4 py-3 pr-10 rounded-lg border border-gray-200 
                             focus:border-primary focus:ring-2 focus:ring-primary/20 
                             appearance-none cursor-pointer bg-white"
                  >
                    <option value="">Select a recent activity...</option>
                    {/* Only show recent activities, not default ones */}
                    {(recentActivities.length > 0 ? recentActivities : defaultActivities).slice(0, 12).map((activity, index) => (
                      <option key={index} value={activity}>
                        {activity.length > 50 ? `${activity.substring(0, 50)}...` : activity}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Activity Text Input */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Activity Description
                  </label>
                  <span className={`text-xs ${characterCount > maxLength ? 'text-red-500' : 'text-gray-500'}`}>
                    {characterCount}/{maxLength}
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={activityText}
                  onChange={(e) => {
                    setActivityText(e.target.value);
                    setIsEditing(true);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe what you're working on..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 
                           focus:border-primary focus:ring-2 focus:ring-primary/20 
                           resize-none"
                  rows={3}
                  maxLength={maxLength}
                />
                {isEditing && activityText !== currentActivity && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                    <Edit2 className="w-3 h-3" />
                    <span>Modified</span>
                  </div>
                )}
              </div>

              {/* Quick Select area removed */}

              {/* Current Activity Display */}
              {currentActivity && currentActivity !== activityText && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    Current Activity
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{currentActivity}</span>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex gap-3">
                {/* Only show cancel if there's an existing activity */}
                {currentActivity ? (
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                ) : (
                  <div className="flex-1" />
                )}
                <button
                  onClick={handleSave}
                  disabled={!activityText.trim()}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all
                           ${activityText.trim() 
                             ? 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg' 
                             : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                           }`}
                >
                  Save Activity
                </button>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="mt-3 text-xs text-gray-500 text-center">
                Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Ctrl+Enter</kbd> to save
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}