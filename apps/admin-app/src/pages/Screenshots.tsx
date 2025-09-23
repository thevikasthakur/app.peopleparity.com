import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { format, parseISO, startOfDay, endOfDay, addDays, subDays, startOfWeek, isToday, isSameDay, getHours, getMinutes } from 'date-fns'
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
  Trophy
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

  // Load users if admin
  useEffect(() => {
    if (user?.isAdmin) {
      loadUsers()
    } else {
      setSelectedUserId(user?.id || '')
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
      // Format date range for API
      const startDate = startOfDay(selectedDate).toISOString()
      const endDate = endOfDay(selectedDate).toISOString()

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
            startDate: startOfDay(date).toISOString(),
            endDate: endOfDay(date).toISOString()
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
    const rows: HourRow[] = []

    // Create rows for each hour from 0 to 23
    for (let hour = 0; hour < 24; hour++) {
      const hourLabel = format(new Date().setHours(hour, 0, 0, 0), 'ha')
      rows.push({
        hour,
        label: hourLabel,
        screenshots: new Array(6).fill(null)
      })
    }

    // Place screenshots in their correct time slots
    screenshots.forEach(screenshot => {
      const timestamp = parseISO(screenshot.capturedAt || screenshot.timestamp || screenshot.createdAt || '')
      const hour = getHours(timestamp)
      const minute = getMinutes(timestamp)
      const slot = Math.floor(minute / 10) // 0-5 for each 10-minute interval

      if (rows[hour]) {
        rows[hour].screenshots[slot] = screenshot
      }
    })

    // Filter to only show hours with screenshots
    return rows.filter(row => row.screenshots.some(s => s !== null))
  }, [screenshots])

  // Calculate metrics from screenshots
  const metrics = useMemo(() => {
    if (!screenshots.length) {
      return {
        totalHours: 0,
        activeHours: 0,
        screenshotCount: 0,
        productivityScore: 0,
        topApplications: []
      }
    }

    const screenshotCount = screenshots.length
    const totalHours = screenshotCount * 10 / 60 // Each screenshot = 10 minutes
    const activeHours = totalHours * 0.85 // Assume 85% active

    // Calculate average productivity score using real activity scores
    const scores = screenshots
      .map(s => s.activityScore || 0)
      .filter(score => score > 0)
    const productivityScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0

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
      activeHours,
      screenshotCount,
      productivityScore,
      topApplications
    }
  }, [screenshots])

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
                <div>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatTime(metrics.totalHours)}
                  </div>
                  <div className="text-sm text-gray-500">Total Time</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xl font-semibold text-green-600">
                      {formatTime(metrics.activeHours)}
                    </div>
                    <div className="text-xs text-gray-500">Active Time</div>
                  </div>

                  <div>
                    <div className="text-xl font-semibold text-blue-600">
                      {metrics.screenshotCount}
                    </div>
                    <div className="text-xs text-gray-500">Screenshots</div>
                  </div>
                </div>

                {/* Productivity Score */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Productivity</span>
                    <span className="text-sm font-semibold" style={{ color: getActivityLevel(metrics.productivityScore).color }}>
                      {getActivityLevel(metrics.productivityScore).name}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${(metrics.productivityScore / 10) * 100}%`,
                        backgroundColor: getActivityLevel(metrics.productivityScore).color
                      }}
                    />
                  </div>
                  <div className="mt-1 text-right">
                    <span className="text-xs text-gray-500">
                      Score: {metrics.productivityScore.toFixed(1)}/10
                    </span>
                  </div>
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
                                {format(parseISO(screenshot.capturedAt || screenshot.timestamp || screenshot.createdAt || ''), 'HH:mm')}
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
                      ? format(parseISO(selectedScreenshot.capturedAt || selectedScreenshot.timestamp || ''), 'HH:mm:ss')
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