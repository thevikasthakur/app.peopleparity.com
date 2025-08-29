import React, { useState, useEffect, useRef } from 'react';
import { Edit2, Plus, Clock, ChevronDown } from 'lucide-react';

interface ActivitySelectorProps {
  currentActivity: string;
  onActivityChange: (activity: string) => void;
  recentActivities?: string[];
}

export function ActivitySelector({ 
  currentActivity, 
  onActivityChange,
  recentActivities = []
}: ActivitySelectorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [editValue, setEditValue] = useState(currentActivity || 'General Activity');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Default recent activities if none provided
  const defaultActivities = [
    'Development',
    'Code Review',
    'Testing',
    'Documentation',
    'Meeting',
    'Research',
    'Bug Fixing',
    'Planning',
    'General Activity'
  ];

  const activities = recentActivities.length > 0 
    ? recentActivities 
    : defaultActivities;

  // Remove duplicates and current activity from suggestions
  const suggestions = Array.from(new Set(activities))
    .filter(a => a.toLowerCase() !== currentActivity?.toLowerCase())
    .slice(0, 8);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setIsEditing(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    const finalValue = trimmedValue || 'General Activity';
    onActivityChange(finalValue);
    setEditValue(finalValue);
    setIsEditing(false);
    setShowDropdown(false);
  };

  const handleSelectActivity = (activity: string) => {
    setEditValue(activity);
    onActivityChange(activity);
    setShowDropdown(false);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setShowDropdown(false);
      setEditValue(currentActivity);
    }
  };

  return (
    <div className="space-y-3" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-600">Current Activity</label>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Select from recent activities"
        >
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="relative">
        {isEditing ? (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-3 py-2 border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Enter activity name..."
            />
            <button
              onClick={handleSave}
              className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Save
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{currentActivity || 'General Activity'}</span>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Edit activity"
            >
              <Edit2 className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        )}

        {/* Dropdown for recent activities */}
        {showDropdown && !isEditing && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-10 max-h-64 overflow-y-auto">
            <div className="p-2">
              <div className="text-xs text-gray-500 uppercase tracking-wider px-2 py-1">
                Recent Activities
              </div>
              {suggestions.map((activity, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectActivity(activity)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded transition-colors"
                >
                  {activity}
                </button>
              ))}
              <div className="border-t mt-2 pt-2">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    setIsEditing(true);
                    setEditValue('');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded transition-colors flex items-center gap-2 text-primary"
                >
                  <Plus className="w-4 h-4" />
                  Add New Activity
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        This activity will be associated with your screenshots
      </p>
    </div>
  );
}