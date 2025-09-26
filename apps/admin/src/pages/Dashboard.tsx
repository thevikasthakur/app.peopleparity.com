import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { TodaysHustle } from '../components/TodaysHustle';
import { ScreenshotGrid } from '../components/ScreenshotGrid';
import { ProfileDropdown } from '../components/ProfileDropdown';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { Activity, Calendar, ChevronLeft, ChevronRight, Users } from 'lucide-react';

const logoImage = 'https://people-parity-assets.s3.ap-south-1.amazonaws.com/people-parity-logo.png';

export function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedDate, setSelectedDate] = useState(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsedDate = new Date(dateParam);
      if (!isNaN(parsedDate.getTime())) {
        return new Date(Date.UTC(
          parsedDate.getFullYear(),
          parsedDate.getMonth(),
          parsedDate.getDate(),
          0, 0, 0, 0
        ));
      }
    }
    const now = new Date();
    const todayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0
    ));
    return todayUTC;
  });

  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(() => {
    return searchParams.get('userId') || null;
  });
  const [isChangingDate, setIsChangingDate] = useState(false);

  // For developers, always use their own ID
  const effectiveUserId = user?.isDeveloper ? user.id : selectedUserId;

  // Fetch team members (only for admins)
  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => apiService.getTeamMembers(),
    enabled: user?.isAdmin === true,
  });

  // Fetch screenshots for the user/team and date
  const { data: screenshots, isLoading: isLoadingScreenshots } = useQuery({
    queryKey: ['screenshots', effectiveUserId, selectedDate.toISOString(), refreshKey],
    queryFn: () => apiService.getScreenshots({
      userId: effectiveUserId || undefined,
      date: selectedDate.toISOString().split('T')[0],
    }),
  });

  // Fetch sessions for the user and date
  const { data: sessions } = useQuery({
    queryKey: ['sessions', effectiveUserId, selectedDate.toISOString()],
    queryFn: () => apiService.getUserSessions(),
  });

  // Check if selected date is today
  const isToday = useMemo(() => {
    const now = new Date();
    const selectedUTC = new Date(Date.UTC(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    ));
    const todayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ));
    return selectedUTC.getTime() === todayUTC.getTime();
  }, [selectedDate]);

  // Get current session (active session for today)
  const currentSession = useMemo(() => {
    if (!isToday || !sessions) return null;
    return sessions.find((s: any) => !s.endTime);
  }, [sessions, isToday]);

  const handleDateChange = async (newDate: Date) => {
    setIsChangingDate(true);
    try {
      setSelectedDate(newDate);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('date', newDate.toISOString().split('T')[0]);
      setSearchParams(newParams);
      await queryClient.invalidateQueries();
    } finally {
      setTimeout(() => setIsChangingDate(false), 500);
    }
  };

  const changeDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setUTCDate(newDate.getUTCDate() - 1);
    } else {
      newDate.setUTCDate(newDate.getUTCDate() + 1);
    }
    handleDateChange(newDate);
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['screenshots'] });
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen" data-mode="client">
      {/* Content */}
      <div className="p-6">
        <div className="w-full space-y-4">

          {/* Header - Compact version */}
          <div className="glass-card px-4 py-2 bounce-in shadow-lg relative z-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={logoImage} alt="People Parity Logo" className="w-8 h-8 object-contain" />
                <span className="text-sm font-semibold text-gray-700">People Parity</span>
              </div>

              <div className="flex items-center gap-3">
                {/* Show team selector only for admins */}
                {user?.isAdmin && teamMembers && (
                  <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <select
                        value={selectedUserId || ''}
                        onChange={(e) => {
                          const newUserId = e.target.value || null;
                          setSelectedUserId(newUserId);
                          const newParams = new URLSearchParams(searchParams);
                          if (newUserId) {
                            newParams.set('userId', newUserId);
                          } else {
                            newParams.delete('userId');
                          }
                          setSearchParams(newParams);
                        }}
                        className="text-sm font-medium text-gray-700 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer pr-6 appearance-none"
                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236366f1\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.25rem center', backgroundSize: '1.25rem' }}
                      >
                        <option value="">All Team Members</option>
                        {teamMembers.map((member: any) => (
                          <option key={member.id} value={member.id}>
                            {member.name || member.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Date Navigation */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => changeDate('prev')}
                    className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                    disabled={isChangingDate}
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>

                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <input
                      type="date"
                      value={selectedDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value + 'T00:00:00Z');
                        handleDateChange(newDate);
                      }}
                      className="text-sm font-medium text-gray-700 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer"
                      disabled={isChangingDate}
                    />
                    {isToday && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                        Today
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => changeDate('next')}
                    className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                    disabled={isToday || isChangingDate}
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                {/* Current Session Display - if active */}
                {currentSession && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-green-700">
                      {currentSession.activityName || currentSession.task || 'Working'}
                    </span>
                  </div>
                )}

                {/* Profile Dropdown */}
                <ProfileDropdown user={user} />
              </div>
            </div>
          </div>

          {/* Time Stats - Today's Hustle only (no Weekly Marathon for admin) */}
          <div className="grid grid-cols-1 gap-4">
            <TodaysHustle
              key={`hustle-${refreshKey}`}
              selectedDate={selectedDate}
              isToday={isToday}
              userId={effectiveUserId || undefined}
            />
          </div>

          {/* Snapshots Section - exactly like desktop */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                {isToday ? "Today's" : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} Snapshots
              </h2>

              <span className="text-sm text-gray-500">
                {isLoadingScreenshots ? 'Loading...' : `${screenshots?.length || 0} moments captured`}
              </span>
            </div>

            {isLoadingScreenshots ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading screenshots...</div>
              </div>
            ) : (
              <ScreenshotGrid
                screenshots={screenshots || []}
                isLoading={isLoadingScreenshots}
                onRefresh={handleRefresh}
                userRole={user?.role}
                userTimezone={user?.timezone}
              />
            )}
          </div>
        </div>
      </div>

      {/* Loading overlay when changing dates - blocks all interactions */}
      {isChangingDate && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]"
          style={{
            backdropFilter: 'blur(2px)',
            cursor: 'wait'
          }}
        >
          <div className="bg-white rounded-xl p-5 shadow-xl flex flex-col items-center pointer-events-none">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-indigo-600 mb-2"></div>
            <p className="text-gray-600 text-sm">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}