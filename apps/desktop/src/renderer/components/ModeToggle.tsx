import React from 'react';
import { Code2, Users } from 'lucide-react';

interface ModeToggleProps {
  mode: 'client' | 'command';
  onModeChange: (mode: 'client' | 'command') => void;
  disabled?: boolean;
}

export function ModeToggle({ mode, onModeChange, disabled }: ModeToggleProps) {
  const handleToggle = () => {
    if (disabled) return;
    onModeChange(mode === 'client' ? 'command' : 'client');
  };

  return (
    <div className="flex items-center gap-4">
      <span className={`text-sm font-medium transition-opacity ${mode === 'client' ? 'opacity-100' : 'opacity-50'}`}>
        Client Mode
      </span>
      
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`
          relative w-20 h-10 rounded-full p-1 transition-all duration-300
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${mode === 'client' 
            ? 'bg-gradient-to-r from-indigo-500 to-purple-500' 
            : 'bg-gradient-to-r from-emerald-500 to-teal-500'
          }
        `}
        aria-label="Toggle mode"
      >
        <div
          className={`
            absolute top-1 w-8 h-8 bg-white rounded-full shadow-lg
            flex items-center justify-center transition-transform duration-300
            ${mode === 'command' ? 'translate-x-10' : 'translate-x-0'}
          `}
        >
          {mode === 'client' ? (
            <Code2 className="w-4 h-4 text-indigo-600" />
          ) : (
            <Users className="w-4 h-4 text-emerald-600" />
          )}
        </div>
      </button>
      
      <span className={`text-sm font-medium transition-opacity ${mode === 'command' ? 'opacity-100' : 'opacity-50'}`}>
        Command Mode
      </span>
    </div>
  );
}