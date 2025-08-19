import React, { useState } from 'react';
import { Trophy, Medal, Award, TrendingUp, Crown, Star } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  name: string;
  hours: number;
  avatar?: string;
  trend: 'up' | 'down' | 'same';
}

const mockLeaderboard = {
  today: [
    { rank: 1, name: 'Alex Chen', hours: 7.5, trend: 'up' as const },
    { rank: 2, name: 'Sarah Kim', hours: 6.8, trend: 'same' as const },
    { rank: 3, name: 'Mike Johnson', hours: 6.2, trend: 'up' as const },
    { rank: 4, name: 'Emma Davis', hours: 5.9, trend: 'down' as const },
    { rank: 5, name: 'You', hours: 5.4, trend: 'up' as const },
  ],
  week: [
    { rank: 1, name: 'Sarah Kim', hours: 38.5, trend: 'up' as const },
    { rank: 2, name: 'Alex Chen', hours: 37.2, trend: 'down' as const },
    { rank: 3, name: 'You', hours: 35.8, trend: 'up' as const },
    { rank: 4, name: 'Mike Johnson', hours: 34.1, trend: 'same' as const },
    { rank: 5, name: 'Emma Davis', hours: 32.5, trend: 'up' as const },
  ]
};

export function Leaderboard() {
  const [view, setView] = useState<'today' | 'week'>('today');
  const entries = mockLeaderboard[view];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-500">
          {rank}
        </span>;
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'same') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'down':
        return <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  const getFunnyMessage = (rank: number, isYou: boolean) => {
    if (!isYou) return null;
    
    const messages = {
      1: "👑 Bow down to the productivity monarch!",
      2: "🥈 So close! The throne awaits...",
      3: "🥉 Podium finish! Not bad at all!",
      4: "Almost there! One more push!",
      5: "Top 5! You're in elite company!"
    };
    
    return messages[rank as keyof typeof messages];
  };

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setView('today')}
          className={`
            flex-1 px-3 py-1.5 rounded text-sm font-medium transition-all
            ${view === 'today' 
              ? 'bg-white shadow text-primary' 
              : 'text-gray-600 hover:text-gray-800'
            }
          `}
        >
          Today
        </button>
        <button
          onClick={() => setView('week')}
          className={`
            flex-1 px-3 py-1.5 rounded text-sm font-medium transition-all
            ${view === 'week' 
              ? 'bg-white shadow text-primary' 
              : 'text-gray-600 hover:text-gray-800'
            }
          `}
        >
          This Week
        </button>
      </div>

      {/* Leaderboard Entries */}
      <div className="space-y-2">
        {entries.map((entry) => {
          const isYou = entry.name === 'You';
          const message = getFunnyMessage(entry.rank, isYou);
          
          return (
            <div
              key={`${view}-${entry.rank}`}
              className={`
                p-3 rounded-lg transition-all
                ${isYou 
                  ? 'bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/30' 
                  : 'bg-gray-50 hover:bg-gray-100'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getRankIcon(entry.rank)}
                  
                  <div className="flex items-center gap-2">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                      ${isYou 
                        ? 'bg-gradient-to-r from-primary to-secondary text-white' 
                        : 'bg-gray-200 text-gray-600'
                      }
                    `}>
                      {entry.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${isYou ? 'text-primary' : ''}`}>
                          {entry.name}
                        </span>
                        {isYou && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                        {getTrendIcon(entry.trend)}
                      </div>
                      {message && (
                        <p className="text-xs text-gray-500 italic">{message}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-bold text-lg">
                    {entry.hours.toFixed(1)}h
                  </div>
                  {entry.rank === 1 && (
                    <div className="text-xs text-amber-600 font-medium">
                      Champion
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Motivational Footer */}
      <div className="text-center pt-2 border-t">
        <p className="text-xs text-gray-500 italic">
          {view === 'today' 
            ? entries[0].name === 'You' 
              ? "You're the champion today! 🏆"
              : `Only ${(entries[0].hours - entries.find(e => e.name === 'You')?.hours!).toFixed(1)}h behind the leader!`
            : entries[0].name === 'You'
              ? "Weekly champion! Keep dominating! 💪"
              : "Great week so far! Keep pushing! 🚀"
          }
        </p>
      </div>
    </div>
  );
}