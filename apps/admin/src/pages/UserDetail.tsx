import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import {
  ArrowLeft,
  AlertCircle,
  Loader,
  Calendar,
  Clock,
  Activity,
  BarChart3,
  TrendingUp,
  Mail,
  Shield,
  Globe,
  Keyboard,
  Mouse,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Download,
  RefreshCw,
} from 'lucide-react';

const logoImage = 'https://people-parity-assets.s3.ap-south-1.amazonaws.com/people-parity-logo.png';

type Preset = '7d' | '14d' | '30d' | 'wtd' | 'mtd' | 'custom';

const isWeekend = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay();
  return day === 0 || day === 6;
};

interface ScreenshotDetail {
  screenshotId: string;
  capturedAt: string;
  activityScore: number;
  keystrokes: number;
  clicks: number;
  scrolls: number;
  botDetected: boolean;
  botType: string;
  botConfidence: number;
  botReasons: string[];
}

interface BotWarning {
  screenshotId: string;
  periodStart: string;
  periodEnd: string;
  keyboardBot: boolean;
  mouseBot: boolean;
  confidence: number;
  reasons: string[];
}

interface DayReport {
  date: string;
  productiveHours: number;
  averageActivityScore: number;
  totalScreenshots: number;
  validScreenshots: number;
  activityLevel: string;
  attendance: any;
  totalKeystrokes?: number;
  totalClicks?: number;
  totalScrolls?: number;
  botWarnings?: BotWarning[];
  screenshots?: ScreenshotDetail[];
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  timezone?: string;
  organizationName?: string;
  isActive?: boolean;
}

export function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const hasAdminAccess = currentUser?.role === 'super_admin' || currentUser?.role === 'org_admin';

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [reports, setReports] = useState<DayReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [loadingDays, setLoadingDays] = useState<Set<string>>(new Set());
  const [refetchingDays, setRefetchingDays] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const fetchIdRef = useRef(0);

  const [preset, setPreset] = useState<Preset>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [includeWeekends, setIncludeWeekends] = useState(false);
  const [fetchVersion, setFetchVersion] = useState(0);

  // Expand/collapse and checkbox state
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());

  const today = new Date().toISOString().split('T')[0];

  const { startDate, endDate } = useMemo(() => {
    if (preset === 'custom' && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    const end = new Date();
    const start = new Date();
    if (preset === 'wtd') {
      // Week till date: Monday of current week → today
      const dow = end.getDay(); // 0=Sun
      const diffToMon = dow === 0 ? 6 : dow - 1;
      start.setDate(end.getDate() - diffToMon);
    } else if (preset === 'mtd') {
      // Month till date: 1st of current month → today
      start.setDate(1);
    } else {
      const days = preset === '14d' ? 14 : preset === '30d' ? 30 : 7;
      start.setDate(end.getDate() - days + 1);
    }
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [preset, customStart, customEnd]);

  // Load user info
  useEffect(() => {
    if (!userId || !hasAdminAccess) return;
    const load = async () => {
      try {
        const members = await apiService.getTeamMembers();
        const found = members.find((m: any) => m.id === userId);
        if (found) {
          setUserInfo(found);
        } else {
          setError('User not found');
        }
      } catch {
        setError('Failed to load user info');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, hasAdminAccess]);

  // Load reports: metrics first (fast), then backfill daily hours per-row
  useEffect(() => {
    if (!userId || !startDate || !endDate) return;
    const currentFetchId = ++fetchIdRef.current;
    setExpandedDays(new Set());
    setSelectedDays(new Set());
    setReportsLoading(true);
    setError('');

    // Build date list
    const dates: string[] = [];
    const s = new Date(startDate + 'T00:00:00Z');
    const e = new Date(endDate + 'T00:00:00Z');
    for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    const filteredDates = includeWeekends ? dates : dates.filter((dt) => !isWeekend(dt));

    const run = async () => {
      // Step 1: Load activity metrics (single fast request), build skeleton rows
      let metricsRes: any = null;
      try {
        metricsRes = await apiService.getActivityMetrics(userId, startDate, endDate);
      } catch {
        // metrics may fail — continue with empty metrics
      }
      if (currentFetchId !== fetchIdRef.current) return;

      const initialRows: DayReport[] = filteredDates.map((date) => {
        const metrics = metricsRes?.days?.[date];
        const screenshots: ScreenshotDetail[] = (metrics?.screenshots || []).map((ss: any) => ({
          ...ss,
          keystrokes: Number(ss.keystrokes) || 0,
          clicks: Number(ss.clicks) || 0,
          scrolls: Number(ss.scrolls) || 0,
          activityScore: Number(ss.activityScore) || 0,
          botConfidence: Number(ss.botConfidence) || 0,
        }));
        // Compute daily totals from per-screenshot data (reliable) instead of pre-computed fields
        const totalKeystrokes = screenshots.reduce((sum, ss) => sum + ss.keystrokes, 0);
        const totalClicks = screenshots.reduce((sum, ss) => sum + ss.clicks, 0);
        const totalScrolls = screenshots.reduce((sum, ss) => sum + ss.scrolls, 0);
        return {
          date,
          productiveHours: 0,
          averageActivityScore: 0,
          totalScreenshots: 0,
          validScreenshots: 0,
          activityLevel: '',
          attendance: null,
          totalKeystrokes,
          totalClicks,
          totalScrolls,
          botWarnings: metrics?.botWarnings || [],
          screenshots,
        };
      });

      setReports(initialRows);
      setLoadingDays(new Set(filteredDates));
      setReportsLoading(false);

      // Step 2: Backfill daily productive hours one-by-one
      for (const dateStr of filteredDates) {
        if (currentFetchId !== fetchIdRef.current) return;
        const result = await apiService.getProductiveHours({ userId, date: dateStr });
        if (currentFetchId !== fetchIdRef.current) return;

        console.log(`[daily] ${dateStr}:`, result?.productiveHours, result?.totalScreenshots);

        setReports((prev) =>
          prev.map((row) => {
            if (row.date !== dateStr) return row;
            return {
              ...row,
              productiveHours: result?.productiveHours ?? 0,
              averageActivityScore: result?.averageActivityScore ?? 0,
              totalScreenshots: result?.totalScreenshots ?? 0,
              validScreenshots: result?.validScreenshots ?? 0,
              activityLevel: result?.activityLevel || '',
              attendance: result?.attendance || null,
            };
          })
        );

        setLoadingDays((prev) => {
          const next = new Set(prev);
          next.delete(dateStr);
          return next;
        });
      }
    };

    run();
  }, [userId, startDate, endDate, fetchVersion]);

  // Summary stats
  const summary = useMemo(() => {
    if (reports.length === 0) return null;
    const totalHours = reports.reduce((s, d) => s + d.productiveHours, 0);
    const totalScreenshots = reports.reduce((s, d) => s + d.totalScreenshots, 0);
    const totalValid = reports.reduce((s, d) => s + d.validScreenshots, 0);
    const activeDays = reports.filter((d) => d.productiveHours > 0).length;
    const scores = reports.filter((d) => d.averageActivityScore > 0).map((d) => d.averageActivityScore);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const avgHoursPerActiveDay = activeDays > 0 ? totalHours / activeDays : 0;
    const totalKeystrokes = reports.reduce((s, d) => s + (d.totalKeystrokes || 0), 0);
    const totalClicks = reports.reduce((s, d) => s + (d.totalClicks || 0), 0);
    const totalScrolls = reports.reduce((s, d) => s + (d.totalScrolls || 0), 0);
    const totalBotWarnings = reports.reduce((s, d) => s + (d.botWarnings?.length || 0), 0);
    return { totalHours, totalScreenshots, totalValid, activeDays, avgScore, avgHoursPerActiveDay, totalKeystrokes, totalClicks, totalScrolls, totalBotWarnings };
  }, [reports]);

  // Toggle helpers
  const toggleExpand = (date: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const toggleSelect = (date: string) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const allSelected = reports.length > 0 && selectedDays.size === reports.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedDays(new Set());
    } else {
      setSelectedDays(new Set(reports.map((d) => d.date)));
    }
  };

  const expandSelected = () => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      selectedDays.forEach((d) => next.add(d));
      return next;
    });
  };

  const collapseSelected = () => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      selectedDays.forEach((d) => next.delete(d));
      return next;
    });
  };

  const refetchDay = async (dateStr: string) => {
    if (!userId || refetchingDays.has(dateStr)) return;
    setRefetchingDays((prev) => new Set(prev).add(dateStr));
    try {
      const result = await apiService.getProductiveHours({ userId, date: dateStr });
      setReports((prev) =>
        prev.map((row) => {
          if (row.date !== dateStr) return row;
          return {
            ...row,
            productiveHours: result.productiveHours || 0,
            averageActivityScore: result.averageActivityScore || 0,
            totalScreenshots: result.totalScreenshots || 0,
            validScreenshots: result.validScreenshots || 0,
            activityLevel: result.activityLevel || '',
            attendance: result.attendance || null,
          };
        })
      );
    } catch {
      // silently fail — row keeps existing data
    } finally {
      setRefetchingDays((prev) => {
        const next = new Set(prev);
        next.delete(dateStr);
        return next;
      });
    }
  };

  const exportCSV = () => {
    if (reports.length === 0) return;
    const headers = ['Date', 'Hours', 'Score', 'Snaps', 'Valid', 'Level', 'Attendance', 'Time', 'Score', 'Keys', 'Clicks', 'Scrolls', 'Bot'];
    const rows: string[][] = [];

    for (const day of [...reports].reverse()) {
      const baseRow = [
        day.date,
        day.productiveHours > 0 ? day.productiveHours.toFixed(2) : '',
        day.averageActivityScore > 0 ? day.averageActivityScore.toFixed(1) : '',
        String(day.totalScreenshots || ''),
        String(day.validScreenshots || ''),
        day.activityLevel && day.activityLevel !== 'Inactive' ? day.activityLevel : '',
        day.attendance?.status && day.attendance.status !== 'No Attendance' && day.attendance.status !== 'No Data' ? day.attendance.status : '',
      ];

      if (day.screenshots && day.screenshots.length > 0) {
        for (const ss of day.screenshots) {
          rows.push([
            ...baseRow,
            formatTime(ss.capturedAt),
            ss.activityScore > 0 ? ss.activityScore.toFixed(1) : '',
            ss.keystrokes > 0 ? String(ss.keystrokes) : '',
            ss.clicks > 0 ? String(ss.clicks) : '',
            ss.scrolls > 0 ? String(ss.scrolls) : '',
            ss.botDetected ? `${ss.botType}${ss.botConfidence > 0 ? ` (${Math.round(ss.botConfidence * 100)}%)` : ''}` : '',
          ]);
        }
      } else {
        rows.push([...baseRow, '', '', '', '', '', '']);
      }
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${userInfo?.name || 'user'}-report-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="w-6 h-6" />
            <span className="font-medium">Access Denied</span>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-indigo-600 mr-2" />
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-gray-700 font-medium">User not found</p>
          <button onClick={() => navigate('/user-management')} className="mt-3 text-sm text-indigo-600 hover:underline">
            Back to User Management
          </button>
        </div>
      </div>
    );
  }

  const roleBadge = (role: string) => {
    const styles: Record<string, string> = {
      super_admin: 'bg-purple-100 text-purple-700',
      org_admin: 'bg-indigo-100 text-indigo-700',
      developer: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      org_admin: 'Org Admin',
      developer: 'Developer',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${styles[role] || 'bg-gray-100 text-gray-700'}`}>
        {labels[role] || role}
      </span>
    );
  };

  const scoreColor = (score: number) => {
    if (score >= 7) return 'text-green-700';
    if (score >= 5) return 'text-yellow-700';
    if (score >= 3) return 'text-orange-600';
    return 'text-red-600';
  };

  const hoursColor = (h: number) => {
    if (h >= 7) return 'text-green-700';
    if (h >= 4) return 'text-yellow-700';
    if (h > 0) return 'text-orange-600';
    return 'text-gray-400';
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00Z');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return { dayName, monthDay };
  };

  const formatTime = (isoStr: string) => {
    return new Date(isoStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const COL_COUNT = 8; // checkbox + date + hours + score + snaps + level + attendance + actions

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 h-8 bg-gray-100/80 backdrop-blur-sm border-b border-gray-300 flex items-center justify-center gap-2 z-50">
        <img src={logoImage} alt="Logo" className="w-4 h-4 object-contain" />
        <span className="text-xs text-gray-500 font-medium">People Parity Tracker - User Detail</span>
      </div>

      <div className="p-4 sm:p-6 pt-12 mx-auto" style={{ maxWidth: '1440px' }}>
        {/* Back */}
        <button
          onClick={() => navigate('/user-management')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to User Management
        </button>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Two-column layout: stacked on mobile, side-by-side on lg+ */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── LEFT COLUMN: User info + timeframe + summary ── */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-5 lg:sticky lg:top-12">

            {/* User Info Card */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-5 py-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                    {(userInfo.name || userInfo.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg font-semibold text-gray-900 truncate">{userInfo.name || 'Unnamed'}</h1>
                    <div className="flex items-center gap-2 mt-0.5">
                      {roleBadge(userInfo.role)}
                      {userInfo.isActive === false && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">Inactive</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-gray-500">
                  <div className="flex items-center gap-2 truncate"><Mail className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{userInfo.email}</span></div>
                  {userInfo.timezone && <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 flex-shrink-0" />{userInfo.timezone}</div>}
                  {userInfo.organizationName && <div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 flex-shrink-0" />{userInfo.organizationName}</div>}
                </div>
              </div>
            </div>

            {/* Timeframe Selector */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-5 py-4">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-3">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Timeframe
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {([['7d', '7 days'], ['14d', '14 days'], ['30d', '30 days'], ['wtd', 'Week TD'], ['mtd', 'Month TD'], ['custom', 'Custom']] as const).map(
                    ([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setPreset(key)}
                        className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                          preset === key
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>
                {preset === 'custom' && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="date"
                      value={customStart}
                      max={customEnd || today}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="date"
                      value={customEnd}
                      min={customStart}
                      max={today}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeWeekends}
                      onChange={(e) => setIncludeWeekends(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-gray-600">Include weekends</span>
                  </label>
                  <button
                    onClick={() => setFetchVersion((v) => v + 1)}
                    disabled={reportsLoading}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {reportsLoading ? 'Loading...' : 'Fetch'}
                  </button>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            {summary && !reportsLoading && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg shadow-md px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    Productive Hrs
                  </div>
                  <p className="text-xl font-bold text-gray-900">{summary.totalHours.toFixed(1)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">valid screenshots × 10m</p>
                </div>
                <div className="bg-white rounded-lg shadow-md px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                    Avg Hrs/Day
                  </div>
                  <p className="text-xl font-bold text-gray-900">{summary.avgHoursPerActiveDay.toFixed(1)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">on active days</p>
                </div>
                <div className="bg-white rounded-lg shadow-md px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <Activity className="w-3.5 h-3.5 text-orange-500" />
                    Avg Activity
                  </div>
                  <p className={`text-xl font-bold ${scoreColor(summary.avgScore)}`}>{summary.avgScore.toFixed(1)}<span className="text-xs font-normal text-gray-400">/10</span></p>
                </div>
                <div className="bg-white rounded-lg shadow-md px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
                    Snapshots
                  </div>
                  <p className="text-xl font-bold text-gray-900">{summary.totalScreenshots}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{summary.totalValid} valid</p>
                </div>
                <div className="bg-white rounded-lg shadow-md px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <Keyboard className="w-3.5 h-3.5 text-blue-500" />
                    Keystrokes
                  </div>
                  <p className="text-xl font-bold text-gray-900">{summary.totalKeystrokes.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <Mouse className="w-3.5 h-3.5 text-cyan-500" />
                    Clicks
                  </div>
                  <p className="text-xl font-bold text-gray-900">{summary.totalClicks.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{summary.totalScrolls.toLocaleString()} scrolls</p>
                </div>
                {summary.totalBotWarnings > 0 && (
                  <div className="bg-red-50 rounded-lg shadow-md px-4 py-3 col-span-2 border border-red-200">
                    <div className="flex items-center gap-1.5 text-xs text-red-600 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Bot Warnings
                    </div>
                    <p className="text-xl font-bold text-red-700">{summary.totalBotWarnings}</p>
                    <p className="text-[10px] text-red-500 mt-0.5">suspicious activity periods detected</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: Daily report table ── */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Daily Breakdown</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{startDate} to {endDate}</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Batch expand/collapse buttons */}
                  {selectedDays.size > 0 && (
                    <>
                      <span className="text-xs text-gray-500">{selectedDays.size} selected</span>
                      <button
                        onClick={expandSelected}
                        className="px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors"
                      >
                        Expand
                      </button>
                      <button
                        onClick={collapseSelected}
                        className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                      >
                        Collapse
                      </button>
                      <span className="w-px h-4 bg-gray-300" />
                    </>
                  )}
                  {/* Export CSV */}
                  {reports.length > 0 && (
                    <button
                      onClick={exportCSV}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export CSV
                    </button>
                  )}
                </div>
              </div>
              {reportsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader className="w-6 h-6 animate-spin text-indigo-600 mr-2" />
                  <span className="text-gray-500 text-sm">Loading reports...</span>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-16 text-gray-500 text-sm">No data for the selected timeframe.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <th className="py-3 px-2 w-8">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleSelectAll}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">Date</th>
                        <th className="text-right py-3 px-3 font-medium text-gray-600">Hours</th>
                        <th className="text-right py-3 px-3 font-medium text-gray-600">Score</th>
                        <th className="text-right py-3 px-3 font-medium text-gray-600">Snaps</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">Level</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">Attendance</th>
                        <th className="py-3 px-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...reports].reverse().map((day) => {
                        const { dayName, monthDay } = formatDate(day.date);
                        const weekend = isWeekend(day.date);
                        const isExpanded = expandedDays.has(day.date);
                        const isSelected = selectedDays.has(day.date);
                        const hasBotWarnings = (day.botWarnings?.length || 0) > 0;
                        const hasData = day.productiveHours > 0 || (day.screenshots?.length || 0) > 0;
                        const isDayLoading = loadingDays.has(day.date);

                        return (
                          <Fragment key={day.date}>
                            {/* Main day row */}
                            <tr
                              className={`border-b border-gray-100 cursor-pointer select-none ${weekend ? 'bg-gray-50/60' : 'hover:bg-gray-50'} ${isExpanded ? 'bg-indigo-50/30' : ''}`}
                              onClick={() => hasData && toggleExpand(day.date)}
                            >
                              <td className="py-2.5 px-2" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelect(day.date)}
                                  className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5">
                                  {isDayLoading ? (
                                    <Loader className="w-3.5 h-3.5 animate-spin text-indigo-400 flex-shrink-0" />
                                  ) : hasData ? (
                                    isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                  ) : (
                                    <span className="w-3.5" />
                                  )}
                                  <span className={`font-medium ${weekend ? 'text-gray-400' : 'text-gray-900'}`}>
                                    {monthDay}
                                  </span>
                                  <span className={`text-xs ${weekend ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {dayName}
                                  </span>
                                  {hasBotWarnings && (
                                    <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                                  )}
                                </div>
                              </td>
                              <td className={`py-2.5 px-3 text-right font-semibold ${hoursColor(day.productiveHours)}`}>
                                {day.productiveHours > 0 ? day.productiveHours.toFixed(2) : '—'}
                              </td>
                              <td className={`py-2.5 px-3 text-right font-medium ${day.averageActivityScore > 0 ? scoreColor(day.averageActivityScore) : 'text-gray-400'}`}>
                                {day.averageActivityScore > 0 ? day.averageActivityScore.toFixed(1) : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right text-gray-600">
                                {day.totalScreenshots || '—'}
                              </td>
                              <td className="py-2.5 px-3">
                                {day.activityLevel && day.activityLevel !== 'Inactive' ? (
                                  <span className={`text-xs font-medium ${
                                    day.activityLevel === 'Good' ? 'text-green-600' :
                                    day.activityLevel === 'Fair' ? 'text-yellow-600' :
                                    day.activityLevel === 'Low' ? 'text-orange-500' :
                                    'text-red-500'
                                  }`}>
                                    {day.activityLevel}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                {day.attendance?.status && day.attendance.status !== 'No Attendance' && day.attendance.status !== 'No Data' ? (
                                  <span
                                    className="text-xs font-medium px-2 py-0.5 rounded"
                                    style={{ color: day.attendance.color || '#6b7280', backgroundColor: (day.attendance.color || '#6b7280') + '18' }}
                                  >
                                    {day.attendance.status}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => refetchDay(day.date)}
                                  disabled={refetchingDays.has(day.date) || isDayLoading}
                                  title="Refetch daily data"
                                  className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${refetchingDays.has(day.date) ? 'animate-spin' : ''}`} />
                                </button>
                              </td>
                            </tr>

                            {/* Expanded sub-section */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={COL_COUNT} className="p-0">
                                  <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                                    {/* Day summary bar */}
                                    <div className="flex flex-wrap gap-4 mb-3 text-xs">
                                      <div className="flex items-center gap-1.5 text-gray-600">
                                        <Keyboard className="w-3.5 h-3.5 text-blue-500" />
                                        <span className="font-medium">{(day.totalKeystrokes || 0).toLocaleString()}</span> keys
                                      </div>
                                      <div className="flex items-center gap-1.5 text-gray-600">
                                        <Mouse className="w-3.5 h-3.5 text-cyan-500" />
                                        <span className="font-medium">{(day.totalClicks || 0).toLocaleString()}</span> clicks
                                        <span className="text-gray-400">/ {(day.totalScrolls || 0).toLocaleString()} scrolls</span>
                                      </div>
                                      {hasBotWarnings && (
                                        <div className="flex items-center gap-1.5 text-red-600">
                                          <AlertTriangle className="w-3.5 h-3.5" />
                                          <span className="font-medium">{day.botWarnings!.length}</span> bot warning{day.botWarnings!.length !== 1 ? 's' : ''}
                                        </div>
                                      )}
                                    </div>

                                    {/* Per-screenshot sub-table */}
                                    {day.screenshots && day.screenshots.length > 0 ? (
                                      <div className="bg-white rounded border border-gray-200 overflow-hidden">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="bg-gray-100/60 border-b border-gray-200">
                                              <th className="text-left py-2 px-3 font-medium text-gray-500">Time</th>
                                              <th className="text-right py-2 px-3 font-medium text-gray-500">Score</th>
                                              <th className="text-right py-2 px-3 font-medium text-gray-500">Keys</th>
                                              <th className="text-right py-2 px-3 font-medium text-gray-500">Clicks</th>
                                              <th className="text-right py-2 px-3 font-medium text-gray-500">Scrolls</th>
                                              <th className="text-left py-2 px-3 font-medium text-gray-500">Bot</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {day.screenshots.map((ss, idx) => (
                                              <tr key={ss.screenshotId || idx} className={`border-b border-gray-100 last:border-b-0 ${ss.botDetected ? 'bg-red-50/40' : ''}`}>
                                                <td className="py-1.5 px-3 text-gray-700 font-medium">
                                                  {formatTime(ss.capturedAt)}
                                                </td>
                                                <td className={`py-1.5 px-3 text-right font-medium ${ss.activityScore > 0 ? scoreColor(ss.activityScore) : 'text-gray-400'}`}>
                                                  {ss.activityScore > 0 ? ss.activityScore.toFixed(1) : '—'}
                                                </td>
                                                <td className="py-1.5 px-3 text-right text-gray-600">
                                                  {ss.keystrokes > 0 ? ss.keystrokes.toLocaleString() : '—'}
                                                </td>
                                                <td className="py-1.5 px-3 text-right text-gray-600">
                                                  {ss.clicks > 0 ? ss.clicks.toLocaleString() : '—'}
                                                </td>
                                                <td className="py-1.5 px-3 text-right text-gray-600">
                                                  {ss.scrolls > 0 ? ss.scrolls.toLocaleString() : '—'}
                                                </td>
                                                <td className="py-1.5 px-3">
                                                  {ss.botDetected ? (
                                                    <div>
                                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium">
                                                        <AlertTriangle className="w-2.5 h-2.5" />
                                                        {ss.botType}
                                                        {ss.botConfidence > 0 && <span className="text-red-400 ml-0.5">({Math.round(ss.botConfidence * 100)}%)</span>}
                                                      </span>
                                                      {ss.botReasons.length > 0 && (
                                                        <p className="text-[10px] text-red-500 mt-0.5 truncate max-w-[200px]" title={ss.botReasons.join(', ')}>
                                                          {ss.botReasons.join(', ')}
                                                        </p>
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <span className="text-gray-400">—</span>
                                                  )}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-400 text-center py-2">No screenshot details available</p>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
