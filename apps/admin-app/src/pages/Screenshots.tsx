import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { format, parseISO, startOfDay, endOfDay, addDays, subDays, startOfWeek, isToday, isSameDay, getHours, getMinutes } from 'date-fns'
import moment from 'moment-timezone'
import {
  Calendar,
  User,
  Clock,
  Activity,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  RefreshCw,
  Maximize2,
  X,
  Image,
  AlertCircle,
  TrendingUp,
  Coffee,
  Zap,
  Trophy,
  Award,
  Target
} from 'lucide-react'

interface Screenshot {
  id: string
  userId: string
  timestamp: string
  createdAt?: string
  capturedAt?: string
  url: string
  thumbnailUrl: string
  windowTitle?: string
  applicationName?: string
  activityScore?: number
  task?: string
  notes?: string
  mode?: string
}

interface UserOption {
  id: string
  name: string
  email: string
}

interface DayStats {
  date: Date
  totalHours: number
  activeHours: number
  screenshotCount: number
}

interface HourRow {
  hour: number
  label: string
  screenshots: (Screenshot | null)[]
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Add axios interceptor to include auth token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Get activity level info based on score (0-10 scale)
function getActivityLevel(score: number): { name: string; color: string; bgColor: string; textColor: string } {
  if (score >= 8.5) {
    return { name: 'Good', color: '#10B981', bgColor: 'bg-green-600', textColor: 'text-green-700' }
  } else if (score >= 7.0) {
    return { name: 'Fair', color: '#84CC16', bgColor: 'bg-lime-500', textColor: 'text-lime-700' }
  } else if (score >= 5.5) {
    return { name: 'Low', color: '#FFA500', bgColor: 'bg-orange-500', textColor: 'text-orange-700' }
  } else if (score >= 4.0) {
    return { name: 'Poor', color: '#FF4444', bgColor: 'bg-red-500', textColor: 'text-red-700' }
  } else if (score >= 2.5) {
    return { name: 'Critical', color: '#B71C1C', bgColor: 'bg-red-800', textColor: 'text-red-900' }
  } else {
    return { name: 'Inactive', color: '#9CA3AF', bgColor: 'bg-gray-300', textColor: 'text-gray-500' }
  }
}

const Screenshots = () => {
  const { user } = useAuth()
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>(user?.id || '')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null)
  const [weekStats, setWeekStats] = useState<DayStats[]>([])
  const [isChangingDate, setIsChangingDate] = useState(false)
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null)
  const [userTimezone, setUserTimezone] = useState<string>('UTC')

  // Load users if admin and load timezone preference
  useEffect(() => {
    if (user?.isAdmin) {
      loadUsers()
    } else {
      setSelectedUserId(user?.id || '')
    }

    // Load timezone preference
    const savedTimezone = localStorage.getItem('userTimezone')
    if (savedTimezone) {
      console.log('Loading saved timezone:', savedTimezone)
      setUserTimezone(savedTimezone)
    } else {
      // Default to browser timezone
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      console.log('Using browser timezone:', browserTimezone)
      setUserTimezone(browserTimezone || 'UTC')
    }
  }, [user])

  // Load screenshots when date or user changes
  useEffect(() => {
    if (selectedUserId && !isChangingDate) {
      loadScreenshots()
      loadWeekStats()
    }
  }, [selectedUserId, selectedDate, isChangingDate])

  // Fetch full-size image when screenshot is selected
  useEffect(() => {
    if (selectedScreenshot) {
      // Get signed URL for the full image
      axios.get(`${API_URL}/api/screenshots/${selectedScreenshot.id}/signed-url`)
        .then(response => {
          if (response.data?.signedUrl) {
            setFullImageUrl(response.data.signedUrl)
          }
        })
        .catch(error => {
          console.error('Error fetching full image URL:', error)
          // Fall back to thumbnail
          setFullImageUrl(null)
        })
    } else {
      setFullImageUrl(null)
    }
  }, [selectedScreenshot])

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`)
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  const loadScreenshots = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Format date range for API using user's timezone
      // Create start and end of day in the user's timezone
      const startDate = moment.tz(selectedDate, userTimezone).startOf('day').utc().toISOString()
      const endDate = moment.tz(selectedDate, userTimezone).endOf('day').utc().toISOString()

      const response = await axios.get(`${API_URL}/api/screenshots`, {
        params: {
          userId: selectedUserId,
          startDate,
          endDate,
          includeActivityScores: 'true'
        }
      })

      setScreenshots(response.data || [])
    } catch (error: any) {
      console.error('Failed to load screenshots:', error)
      setError(error.response?.data?.message || 'Failed to load screenshots')
      setScreenshots([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadWeekStats = async () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
    const stats: DayStats[] = []

    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i)

      try {
        const response = await axios.get(`${API_URL}/api/screenshots`, {
          params: {
            userId: selectedUserId,
            startDate: moment.tz(date, userTimezone).startOf('day').utc().toISOString(),
            endDate: moment.tz(date, userTimezone).endOf('day').utc().toISOString()
          }
        })

        const dayScreenshots = response.data || []
        const screenshotCount = dayScreenshots.length
        const totalHours = screenshotCount * 10 / 60 // Each screenshot = 10 minutes
        const activeHours = totalHours * 0.85 // Assume 85% active

        stats.push({
          date,
          totalHours,
          activeHours,
          screenshotCount
        })
      } catch (error) {
        stats.push({
          date,
          totalHours: 0,
          activeHours: 0,
          screenshotCount: 0
        })
      }
    }

    setWeekStats(stats)
  }

  const handleDateChange = async (date: Date) => {
    if (isChangingDate) return

    setIsChangingDate(true)
    setSelectedDate(date)

    // Show loading for 2 seconds to ensure data loads
    setTimeout(() => {
      setIsChangingDate(false)
    }, 2000)
  }

  const handleDownloadScreenshot = async (screenshot: Screenshot) => {
    try {
      const response = await axios.get(`${API_URL}/api/screenshots/${screenshot.id}/signed-url`)
      if (response.data?.signedUrl) {
        window.open(response.data.signedUrl, '_blank')
      }
    } catch (error) {
      console.error('Error getting signed URL:', error)
    }
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev'
      ? subDays(selectedDate, 1)
      : addDays(selectedDate, 1)
    handleDateChange(newDate)
  }

  // Organize screenshots by hour (6 per row = 1 hour)
  const hourlyScreenshots = useMemo(() => {
    console.log('Creating hourly screenshots with timezone:', userTimezone)
    const groups: { [hour: string]: (Screenshot | null)[] } = {}

    // Similar to desktop app - group screenshots by hour
    screenshots.forEach((screenshot, index) => {
      const timestampStr = screenshot.capturedAt || screenshot.timestamp || screenshot.createdAt || ''

      // Debug first few screenshots
      if (index < 3) {
        console.log(`Screenshot ${index}:`, {
          original: timestampStr,
          timezone: userTimezone,
          utc: moment.utc(timestampStr).format(),
          converted: moment.utc(timestampStr).tz(userTimezone).format()
        })
      }

      // Convert UTC timestamp to user's timezone using moment-timezone
      const momentInUserTz = moment.utc(timestampStr).tz(userTimezone)
      const hour = momentInUserTz.hour()
      const minute = momentInUserTz.minute()
      const hourKey = `${hour.toString().padStart(2, '0')}:00`

      // Calculate which slot (0-5) this screenshot belongs to
      const slotIndex = Math.floor(minute / 10)

      // Initialize array for this hour if it doesn't exist
      if (!groups[hourKey]) {
        groups[hourKey] = new Array(6).fill(null)
      }

      // Place screenshot in its correct slot
      // If there's already a screenshot in that slot, keep the latest one
      if (!groups[hourKey][slotIndex] ||
          moment.utc(screenshot.capturedAt || screenshot.timestamp || screenshot.createdAt).tz(userTimezone).valueOf() >
          moment.utc(groups[hourKey][slotIndex]!.capturedAt || groups[hourKey][slotIndex]!.timestamp || groups[hourKey][slotIndex]!.createdAt).tz(userTimezone).valueOf()) {
        groups[hourKey][slotIndex] = screenshot
      }
    })

    // Convert groups to array of HourRow objects
    const rows: HourRow[] = []
    Object.keys(groups).sort().forEach(hourKey => {
      const hour = parseInt(hourKey.split(':')[0])

      // Format the hour label properly (e.g., "9am", "2pm")
      let hourLabel: string
      if (hour === 0) {
        hourLabel = '12am'
      } else if (hour < 12) {
        hourLabel = `${hour}am`
      } else if (hour === 12) {
        hourLabel = '12pm'
      } else {
        hourLabel = `${hour - 12}pm`
      }

      rows.push({
        hour,
        label: hourLabel,
        screenshots: groups[hourKey]
      })
    })

    return rows
  }, [screenshots, userTimezone])

  // Calculate productive hours (filters out inactive periods)
  const calculateProductiveHours = (screenshots: Screenshot[]) => {
    // Filter screenshots based on activity score
    // Only count screenshots with activityScore >= 2.5 (Critical, Poor, Fair, Good)
    // This matches the desktop app logic
    const productiveScreenshots = screenshots.filter(s => (s.activityScore || 0) >= 2.5)
    return (productiveScreenshots.length * 10) / 60 // Each screenshot is 10 minutes
  }

  // Get achievement status based on hours
  const getAchievementStatus = (hours: number, date: Date) => {
    // Check if it's a weekend
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    if (isWeekend) {
      return {
        status: 'Weekend Hours',
        color: '#8b5cf6', // purple
        percentage: 0,
        description: 'No attendance on weekends'
      }
    }

    // Weekday thresholds (matching desktop app)
    const markers = {
      halfAttendance: 4.5,
      threeQuarterAttendance: 7,
      fullAttendance: 9,
      maxScale: 13
    }

    let status = 'No Attendance'
    let color = '#ef4444' // red
    let percentage = 0
    let description = '< 4.5h'

    if (hours >= markers.fullAttendance) {
      if (hours > markers.fullAttendance) {
        status = 'Extra Mileage'
        color = '#9333ea' // purple
        percentage = 100
        description = '> 9h • Flexibility earned'
      } else {
        status = 'Full Day'
        color = '#10b981' // green
        percentage = 100
        description = '9h • 100% attendance'
      }
    } else if (hours >= markers.threeQuarterAttendance) {
      status = 'Good Day'
      color = '#3b82f6' // blue
      percentage = 75
      description = '7h • 75% attendance'
    } else if (hours >= markers.halfAttendance) {
      status = 'Half Day'
      color = '#f59e0b' // amber
      percentage = 50
      description = '4.5h • 50% attendance'
    } else {
      status = 'No Attendance'
      color = '#ef4444' // red
      percentage = 0
      description = '< 4.5h • 0% attendance'
    }

    return { status, color, percentage, description }
  }

  // Calculate metrics from screenshots
  const metrics = useMemo(() => {
    if (!screenshots.length) {
      return {
        totalHours: 0,
        productiveHours: 0,
        screenshotCount: 0,
        productivityScore: 0,
        activityLevel: 'Inactive',
        activityColor: '#9CA3AF',
        achievement: getAchievementStatus(0, selectedDate),
        topApplications: []
      }
    }

    const screenshotCount = screenshots.length
    const totalHours = screenshotCount * 10 / 60 // Each screenshot = 10 minutes
    const productiveHours = calculateProductiveHours(screenshots)

    // Calculate average productivity score using real activity scores
    const scores = screenshots
      .map(s => s.activityScore || 0)
      .filter(score => score > 0)
    const productivityScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0

    const activityLevel = getActivityLevel(productivityScore)
    const achievement = getAchievementStatus(productiveHours, selectedDate)

    // Get top applications
    const appCounts = screenshots.reduce((acc, s) => {
      const app = s.applicationName || 'Unknown'
      acc[app] = (acc[app] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topApplications = Object.entries(appCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([app, count]) => ({
        name: app,
        count,
        percentage: Math.round((count / screenshotCount) * 100)
      }))

    return {
      totalHours,
      productiveHours,
      screenshotCount,
      productivityScore,
      activityLevel: activityLevel.name,
      activityColor: activityLevel.color,
      achievement,
      topApplications
    }
  }, [screenshots, selectedDate])

  const formatTime = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const selectedUser = users.find(u => u.id === selectedUserId)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Full Width Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Activity className="w-7 h-7 text-blue-600" />
              Activity Tracker
            </h1>

            <div className="flex items-center gap-4">
              {/* User Selector for Admins */}
              {user?.isAdmin && users.length > 0 && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select User</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateDate('prev')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isChangingDate}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">
                    {isToday(selectedDate)
                      ? 'Today'
                      : format(selectedDate, 'MMM d, yyyy')}
                  </span>
                </div>

                <button
                  onClick={() => navigateDate('next')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isChangingDate || isToday(selectedDate)}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={loadScreenshots}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* User Info */}
          {selectedUser && (
            <div className="text-sm text-gray-600 mt-2">
              Viewing activity for: <span className="font-medium text-gray-900">{selectedUser.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex">
        {/* Left Sidebar - Stats */}
        <div className="w-80 bg-white border-r h-[calc(100vh-73px)] overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Today's Hustle */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Coffee className="w-5 h-5 text-blue-600" />
                Today's Hustle
              </h3>

              <div className="space-y-4">
                {/* Main Stats Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div className="text-xs text-gray-500">Tracked Today</div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatTime(metrics.productiveHours)}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="w-4 h-4 text-gray-400" />
                      <div className="text-xs text-gray-500">Activity Level</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {metrics.productivityScore.toFixed(1)}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: `${metrics.activityColor}15`,
                          color: metrics.activityColor,
                          border: `1px solid ${metrics.activityColor}30`
                        }}
                      >
                        {metrics.activityLevel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Achievement Status */}
                <div
                  className="rounded-lg p-4 border-2"
                  style={{
                    backgroundColor: `${metrics.achievement.color}08`,
                    borderColor: `${metrics.achievement.color}30`
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5" style={{ color: metrics.achievement.color }} />
                      <span className="text-sm font-medium text-gray-600">Today's Achievement</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" style={{ color: metrics.achievement.color }} />
                      <span className="text-sm font-bold" style={{ color: metrics.achievement.color }}>
                        {metrics.achievement.percentage}%
                      </span>
                    </div>
                  </div>
                  <div
                    className="text-lg font-bold mb-1"
                    style={{ color: metrics.achievement.color }}
                  >
                    {metrics.achievement.status}
                  </div>
                  <div className="text-xs text-gray-600">
                    {metrics.achievement.description}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Daily Progress</span>
                    <span className="text-sm font-semibold text-gray-700">
                      {((metrics.productiveHours / 9) * 100).toFixed(0)}% of full day
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 relative">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{
                        width: `${Math.min((metrics.productiveHours / 9) * 100, 100)}%`,
                        backgroundColor: metrics.achievement.color
                      }}
                    />
                    {/* Milestone markers */}
                    <div className="absolute top-0 left-[50%] w-0.5 h-3 bg-gray-400 opacity-50" />
                    <div className="absolute top-0 left-[77.7%] w-0.5 h-3 bg-gray-400 opacity-50" />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">0h</span>
                    <span className="text-xs text-gray-500">4.5h</span>
                    <span className="text-xs text-gray-500">7h</span>
                    <span className="text-xs text-gray-500">9h</span>
                  </div>
                </div>

                {/* Screenshot Count */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-sm text-gray-600">Screenshots Captured</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {metrics.screenshotCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Weekly Marathon */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Weekly Marathon
              </h3>

              <div className="space-y-2">
                {weekStats.map((stat, index) => {
                  const isSelected = isSameDay(stat.date, selectedDate)
                  const dayName = format(stat.date, 'EEE')
                  const dayNum = format(stat.date, 'd')

                  return (
                    <button
                      key={index}
                      onClick={() => handleDateChange(stat.date)}
                      disabled={isChangingDate}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <div className="text-sm font-medium">{dayName}</div>
                          <div className="text-xs text-gray-500">{dayNum}</div>
                        </div>

                        {stat.totalHours > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-sm text-gray-700">
                              {formatTime(stat.totalHours)}
                            </span>
                          </div>
                        )}
                      </div>

                      {stat.totalHours > 0 && (
                        <div className="text-xs text-gray-500">
                          {stat.screenshotCount} shots
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Top Applications */}
            {metrics.topApplications.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-blue-600" />
                  Top Applications
                </h3>

                <div className="space-y-2">
                  {metrics.topApplications.map((app, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="text-sm font-medium truncate">
                          {app.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500">
                          {app.percentage}%
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="h-1.5 bg-blue-600 rounded-full"
                            style={{ width: `${app.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Screenshots Grid (Full Width) */}
        <div className="flex-1 bg-gray-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Image className="w-5 h-5 text-blue-600" />
                {isToday(selectedDate) ? "Today's" : format(selectedDate, 'MMM d')} Snapshots
              </h2>

              <span className="text-sm text-gray-500">
                {isLoading ? 'Loading...' : `${screenshots.length} moments captured`}
              </span>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500">Loading screenshots...</p>
                </div>
              </div>
            ) : screenshots.length === 0 ? (
              <div className="text-center py-20">
                <Image className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No screenshots captured</p>
                <p className="text-sm text-gray-400 mt-1">
                  {isToday(selectedDate) ? 'Screenshots will appear here as they are captured' : 'No activity recorded on this date'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Screenshots organized by hour */}
                {hourlyScreenshots.map((hourRow) => (
                  <div key={hourRow.hour} className="bg-white rounded-lg p-4">
                    {/* Hour Label */}
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {hourRow.label}
                      </span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* 6 Screenshots Grid (1 hour = 6 x 10-minute slots) */}
                    <div className="grid grid-cols-6 gap-3">
                      {hourRow.screenshots.map((screenshot, slotIndex) => {
                        const slotTime = `${hourRow.hour.toString().padStart(2, '0')}:${(slotIndex * 10).toString().padStart(2, '0')}`

                        if (!screenshot) {
                          // Empty slot
                          return (
                            <div
                              key={`empty-${hourRow.hour}-${slotIndex}`}
                              className="aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center"
                            >
                              <div className="text-xs text-gray-400">{slotTime}</div>
                              <div className="text-xs text-gray-400">No activity</div>
                            </div>
                          )
                        }

                        const activityScore = screenshot.activityScore || 0
                        const level = getActivityLevel(activityScore)

                        return (
                          <div
                            key={screenshot.id}
                            className="group relative bg-gray-50 rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                            onClick={() => setSelectedScreenshot(screenshot)}
                          >
                            {/* Screenshot Image */}
                            <div className="aspect-video relative">
                              <img
                                src={screenshot.thumbnailUrl}
                                alt="Screenshot"
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />

                              {/* Activity Score Badge */}
                              <div className="absolute top-1 right-1">
                                <div
                                  className="px-1.5 py-0.5 rounded text-white text-xs font-semibold"
                                  style={{ backgroundColor: level.color }}
                                >
                                  {activityScore.toFixed(1)}
                                </div>
                              </div>

                              {/* Time Label */}
                              <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded">
                                {moment.utc(screenshot.capturedAt || screenshot.timestamp || screenshot.createdAt || '').tz(userTimezone).format('HH:mm')}
                              </div>
                            </div>

                            {/* Screenshot Info */}
                            <div className="p-2">
                              <p className="text-xs font-medium text-gray-700 truncate">
                                {screenshot.applicationName || 'Unknown'}
                              </p>
                              {screenshot.task && (
                                <p className="text-xs text-gray-500 truncate">
                                  {screenshot.task}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div
            className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold">Screenshot Details</h3>
                {selectedScreenshot.activityScore && (
                  <div
                    className="px-2 py-1 rounded text-white text-xs font-semibold"
                    style={{ backgroundColor: getActivityLevel(selectedScreenshot.activityScore).color }}
                  >
                    {getActivityLevel(selectedScreenshot.activityScore).name} - {selectedScreenshot.activityScore.toFixed(1)}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadScreenshot(selectedScreenshot)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedScreenshot(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              <img
                src={fullImageUrl || selectedScreenshot.thumbnailUrl}
                alt="Screenshot"
                className="w-full rounded-lg"
              />

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Application</p>
                  <p className="font-medium">{selectedScreenshot.applicationName || 'Unknown'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-medium">
                    {selectedScreenshot.capturedAt || selectedScreenshot.timestamp
                      ? moment.utc(selectedScreenshot.capturedAt || selectedScreenshot.timestamp || '').tz(userTimezone).format('HH:mm:ss')
                      : 'N/A'}
                  </p>
                </div>

                {selectedScreenshot.task && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Task</p>
                    <p className="font-medium">{selectedScreenshot.task}</p>
                  </div>
                )}

                {selectedScreenshot.windowTitle && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Window Title</p>
                    <p className="font-medium">{selectedScreenshot.windowTitle}</p>
                  </div>
                )}

                {selectedScreenshot.notes && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="font-medium">{selectedScreenshot.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay when changing dates */}
      {isChangingDate && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 shadow-xl flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-blue-600 mb-2"></div>
            <p className="text-gray-600 text-sm">Loading...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Screenshots