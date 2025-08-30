import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TimeDisplayProps {
  title: string;
  clientHours: number;
  commandHours: number;
  icon: React.ReactElement<LucideIcon>;
  message?: string;
}

export function TimeDisplay({ title, clientHours, commandHours, icon, message }: TimeDisplayProps) {
  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const totalHours = commandHours; // Only count command hours

  return (
    <div className="glass-card p-6 hover:shadow-2xl transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            {icon}
          </div>
          <h3 className="font-semibold text-lg">{title}</h3>
        </div>
        <div className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {formatTime(totalHours)}
        </div>
      </div>

      <div className="mt-2">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
            style={{ width: '100%' }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Based on productive screenshots
        </p>
      </div>

      {message && (
        <p className="mt-4 text-sm text-center text-muted italic">
          {message}
        </p>
      )}
    </div>
  );
}