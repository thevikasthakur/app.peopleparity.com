"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dashboard = Dashboard;
const react_1 = require("react");
const react_query_1 = require("@tanstack/react-query");
const react_router_dom_1 = require("react-router-dom");
const TodaysHustle_1 = require("../components/TodaysHustle");
const ScreenshotGrid_1 = require("../components/ScreenshotGrid");
const ProfileDropdown_1 = require("../components/ProfileDropdown");
const AuthContext_1 = require("../contexts/AuthContext");
const apiService_1 = require("../services/apiService");
const lucide_react_1 = require("lucide-react");
const logoImage = 'https://people-parity-assets.s3.ap-south-1.amazonaws.com/people-parity-logo.png';
function Dashboard() {
    const { user } = (0, AuthContext_1.useAuth)();
    const queryClient = (0, react_query_1.useQueryClient)();
    const [searchParams, setSearchParams] = (0, react_router_dom_1.useSearchParams)();
    const [selectedDate, setSelectedDate] = (0, react_1.useState)(() => {
        const dateParam = searchParams.get('date');
        if (dateParam) {
            const parsedDate = new Date(dateParam);
            if (!isNaN(parsedDate.getTime())) {
                return new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 0, 0, 0, 0));
            }
        }
        const now = new Date();
        const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        return todayUTC;
    });
    const [refreshKey, setRefreshKey] = (0, react_1.useState)(0);
    const [selectedUserId, setSelectedUserId] = (0, react_1.useState)(() => {
        return searchParams.get('userId') || null;
    });
    const [isChangingDate, setIsChangingDate] = (0, react_1.useState)(false);
    // For developers, always use their own ID
    const effectiveUserId = user?.isDeveloper ? user.id : selectedUserId;
    // Fetch team members (only for admins)
    const { data: teamMembers } = (0, react_query_1.useQuery)({
        queryKey: ['teamMembers'],
        queryFn: () => apiService_1.apiService.getTeamMembers(),
        enabled: user?.isAdmin === true,
    });
    // Get selected developer's timezone when admin is viewing a specific user
    const selectedDeveloperTimezone = (0, react_1.useMemo)(() => {
        if (!user?.isAdmin || !selectedUserId || !teamMembers)
            return undefined;
        const selectedMember = teamMembers.find((m) => m.id === selectedUserId);
        console.log('DEBUG - Selected developer timezone:', {
            selectedUserId,
            selectedMember,
            timezone: selectedMember?.timezone,
            teamMembers
        });
        return selectedMember?.timezone;
    }, [user?.isAdmin, selectedUserId, teamMembers]);
    const isViewingAsAdmin = user?.isAdmin && selectedUserId !== null;
    console.log('DEBUG - Props being passed to ScreenshotGrid:', {
        userTimezone: user?.timezone,
        developerTimezone: selectedDeveloperTimezone,
        isViewingAsAdmin,
        selectedUserId
    });
    // Fetch screenshots for the user/team and date
    const { data: screenshots, isLoading: isLoadingScreenshots } = (0, react_query_1.useQuery)({
        queryKey: ['screenshots', effectiveUserId, selectedDate.toISOString(), refreshKey],
        queryFn: () => apiService_1.apiService.getScreenshots({
            userId: effectiveUserId || undefined,
            date: selectedDate.toISOString().split('T')[0],
        }),
    });
    // Fetch sessions for the user and date
    const { data: sessions } = (0, react_query_1.useQuery)({
        queryKey: ['sessions', effectiveUserId, selectedDate.toISOString()],
        queryFn: () => apiService_1.apiService.getUserSessions(),
    });
    // Check if selected date is today
    const isToday = (0, react_1.useMemo)(() => {
        const now = new Date();
        const selectedUTC = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()));
        const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        return selectedUTC.getTime() === todayUTC.getTime();
    }, [selectedDate]);
    // Get current session (active session for today)
    const currentSession = (0, react_1.useMemo)(() => {
        if (!isToday || !sessions)
            return null;
        return sessions.find((s) => !s.endTime);
    }, [sessions, isToday]);
    const handleDateChange = async (newDate) => {
        setIsChangingDate(true);
        try {
            setSelectedDate(newDate);
            const newParams = new URLSearchParams(searchParams);
            newParams.set('date', newDate.toISOString().split('T')[0]);
            setSearchParams(newParams);
            await queryClient.invalidateQueries();
        }
        finally {
            setTimeout(() => setIsChangingDate(false), 500);
        }
    };
    const changeDate = (direction) => {
        const newDate = new Date(selectedDate);
        if (direction === 'prev') {
            newDate.setUTCDate(newDate.getUTCDate() - 1);
        }
        else {
            newDate.setUTCDate(newDate.getUTCDate() + 1);
        }
        handleDateChange(newDate);
    };
    const handleRefresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ['screenshots'] });
        setRefreshKey(prev => prev + 1);
    };
    return (<div className="min-h-screen" data-mode="client">
      {/* Content */}
      <div className="p-6">
        <div className="w-full space-y-4">

          {/* Header - Compact version */}
          <div className="glass-card px-4 py-2 bounce-in shadow-lg relative z-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={logoImage} alt="People Parity Logo" className="w-8 h-8 object-contain"/>
                <span className="text-sm font-semibold text-gray-700">People Parity</span>
              </div>

              <div className="flex items-center gap-3">
                {/* Show team selector only for admins */}
                {user?.isAdmin && teamMembers && (<div className="relative">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors">
                      <lucide_react_1.Users className="w-3.5 h-3.5 text-indigo-600"/>
                      <select value={selectedUserId || ''} onChange={(e) => {
                const newUserId = e.target.value || null;
                setSelectedUserId(newUserId);
                const newParams = new URLSearchParams(searchParams);
                if (newUserId) {
                    newParams.set('userId', newUserId);
                }
                else {
                    newParams.delete('userId');
                }
                setSearchParams(newParams);
            }} className="text-sm font-medium text-gray-700 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer pr-6 appearance-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236366f1\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.25rem center', backgroundSize: '1.25rem' }}>
                        <option value="">All Team Members</option>
                        {teamMembers.filter((member) => member.role === 'developer').map((member) => (<option key={member.id} value={member.id}>
                            {member.name || member.email}
                          </option>))}
                      </select>
                    </div>
                  </div>)}

                {/* Date Navigation */}
                <div className="flex items-center gap-1.5">
                  <button onClick={() => changeDate('prev')} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" disabled={isChangingDate}>
                    <lucide_react_1.ChevronLeft className="w-4 h-4 text-gray-600"/>
                  </button>

                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors">
                    <lucide_react_1.Calendar className="w-3.5 h-3.5 text-indigo-600"/>
                    <input type="date" value={selectedDate.toISOString().split('T')[0]} onChange={(e) => {
            const newDate = new Date(e.target.value + 'T00:00:00Z');
            handleDateChange(newDate);
        }} className="text-sm font-medium text-gray-700 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer" disabled={isChangingDate}/>
                    {isToday && (<span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                        Today
                      </span>)}
                  </div>

                  <button onClick={() => changeDate('next')} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" disabled={isToday || isChangingDate}>
                    <lucide_react_1.ChevronRight className="w-4 h-4 text-gray-600"/>
                  </button>
                </div>

                {/* Current Session Display - if active */}
                {currentSession && (<div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-green-700">
                      {currentSession.activityName || currentSession.task || 'Working'}
                    </span>
                  </div>)}

                {/* Profile Dropdown */}
                <ProfileDropdown_1.ProfileDropdown user={user}/>
              </div>
            </div>
          </div>

          {/* Time Stats - Today's Hustle only (no Weekly Marathon for admin) */}
          <div className="grid grid-cols-1 gap-4">
            <TodaysHustle_1.TodaysHustle key={`hustle-${refreshKey}`} selectedDate={selectedDate} isToday={isToday} userId={effectiveUserId || undefined}/>
          </div>

          {/* Snapshots Section - exactly like desktop */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <lucide_react_1.Activity className="w-5 h-5 text-indigo-600"/>
                {isToday ? "Today's" : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} Snapshots
              </h2>

              <span className="text-sm text-gray-500">
                {isLoadingScreenshots ? 'Loading...' : `${screenshots?.length || 0} moments captured`}
              </span>
            </div>

            {isLoadingScreenshots ? (<div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading screenshots...</div>
              </div>) : (<ScreenshotGrid_1.ScreenshotGrid screenshots={screenshots || []} isLoading={isLoadingScreenshots} onRefresh={handleRefresh} userRole={user?.role} userTimezone={user?.timezone} developerTimezone={selectedDeveloperTimezone} isViewingAsAdmin={isViewingAsAdmin}/>)}
          </div>
        </div>
      </div>

      {/* Loading overlay when changing dates - blocks all interactions */}
      {isChangingDate && (<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]" style={{
                backdropFilter: 'blur(2px)',
                cursor: 'wait'
            }}>
          <div className="bg-white rounded-xl p-5 shadow-xl flex flex-col items-center pointer-events-none">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-indigo-600 mb-2"></div>
            <p className="text-gray-600 text-sm">Loading...</p>
          </div>
        </div>)}
    </div>);
}
//# sourceMappingURL=Dashboard.js.map