import React from 'react';
import { Brain, Keyboard, Search, Sparkles, TrendingUp } from 'lucide-react';

interface AnalyticsProps {
  focusMinutes: number;
  handsOnMinutes: number;
  researchMinutes: number;
  aiMinutes: number;
}

export function Analytics({ focusMinutes, handsOnMinutes, researchMinutes, aiMinutes }: AnalyticsProps) {
  const stats = [
    {
      label: 'Deep Focus',
      value: focusMinutes,
      icon: Brain,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      message: focusMinutes > 120 ? 'In the zone! 🎯' : 'Building momentum...'
    },
    {
      label: 'Hands-on',
      value: handsOnMinutes,
      icon: Keyboard,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      message: handsOnMinutes > 90 ? 'Keyboard warrior! ⌨️' : 'Warming up...'
    },
    {
      label: 'Research',
      value: researchMinutes,
      icon: Search,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      message: researchMinutes > 30 ? 'Knowledge seeker! 📚' : 'Curious mind...'
    },
    {
      label: 'AI Assist',
      value: aiMinutes,
      icon: Sparkles,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      message: aiMinutes > 20 ? 'AI power user! 🤖' : 'AI explorer...'
    }
  ];

  const totalMinutes = focusMinutes + handsOnMinutes + researchMinutes + aiMinutes;

  return (
    <div className="space-y-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const percentage = totalMinutes > 0 ? (stat.value / totalMinutes) * 100 : 0;
        
        return (
          <div key={stat.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <span className="text-sm font-medium">{stat.label}</span>
              </div>
              <span className="text-sm font-mono">
                {stat.value}m
              </span>
            </div>
            
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full transition-all duration-500 ${
                  stat.color.replace('text-', 'bg-')
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            
            <p className="text-xs text-gray-500 italic">
              {stat.message}
            </p>
          </div>
        );
      })}
      
      {totalMinutes > 0 && (
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Productivity Score</span>
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {Math.round((focusMinutes * 2 + handsOnMinutes * 1.5 + researchMinutes + aiMinutes * 0.5) / 10)}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            {totalMinutes > 240 
              ? "You're absolutely crushing it today! 🔥"
              : totalMinutes > 120
              ? "Great progress, keep it up! 💪"
              : "Just getting started, you got this! 🚀"}
          </p>
        </div>
      )}
    </div>
  );
}