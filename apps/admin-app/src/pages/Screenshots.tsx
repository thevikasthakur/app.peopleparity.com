import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { format, parseISO, startOfDay, endOfDay } from 'date-fns'
import {
  Calendar,
  User,
  Clock,
  Activity,
  Monitor,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  RefreshCw
} from 'lucide-react'

interface Screenshot {
  id: string
  userId: string
  timestamp: string
  imageUrl: string
  windowTitle: string
  applicationName: string
}

interface UserOption {
  id: string
  name: string
  email: string
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

const Screenshots = () => {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const screenshotsPerPage = 12

  // Get users list for admins
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      if (!user?.isAdmin) return []
      const response = await axios.get(`${API_URL}/api/users`)
      return response.data
    },
    enabled: user?.isAdmin
  })

  // Set default selected user once users are loaded
  useEffect(() => {
    if (!selectedUserId) {
      if (user?.isAdmin && users.length > 0) {
        setSelectedUserId(users[0].id)
      } else if (user?.id) {
        setSelectedUserId(user.id)
      }
    }
  }, [user, users, selectedUserId])

  // Fetch screenshots
  const { data: screenshots = [], isLoading, refetch } = useQuery({
    queryKey: ['screenshots', selectedDate, selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return []

      const startDate = startOfDay(new Date(selectedDate))
      const endDate = endOfDay(new Date(selectedDate))

      // Admin can see all users' screenshots, regular users only see their own
      const userId = user?.isAdmin ? selectedUserId : user?.id

      try {
        const response = await axios.get(`${API_URL}/api/screenshots`, {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        })

        // If admin is viewing another user's screenshots, filter by userId
        if (user?.isAdmin && userId !== user?.id) {
          return response.data.filter((s: Screenshot) => s.userId === userId)
        }

        return response.data
      } catch (error) {
        console.error('Error fetching screenshots:', error)
        return []
      }
    },
    enabled: !!selectedUserId
  })

  // Get dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', selectedDate, selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null

      try {
        const response = await axios.get(`${API_URL}/api/dashboard/stats`)
        return response.data
      } catch (error) {
        console.error('Error fetching stats:', error)
        return null
      }
    },
    enabled: !!selectedUserId
  })

  const totalPages = Math.ceil(screenshots.length / screenshotsPerPage)
  const startIndex = (currentPage - 1) * screenshotsPerPage
  const endIndex = startIndex + screenshotsPerPage
  const currentScreenshots = screenshots.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedDate, selectedUserId])

  const handleDateChange = (direction: 'prev' | 'next') => {
    const currentDate = parseISO(selectedDate)
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    setSelectedDate(format(newDate, 'yyyy-MM-dd'))
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

  // Calculate metrics from screenshots
  const calculateMetrics = () => {
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
    const totalHours = screenshotCount * 10 / 60 // Each screenshot represents 10 minutes
    const activeHours = totalHours * 0.85 // Assume 85% active time

    // Calculate top applications
    const appCounts: Record<string, number> = {}
    screenshots.forEach(s => {
      if (s.applicationName) {
        appCounts[s.applicationName] = (appCounts[s.applicationName] || 0) + 1
      }
    })

    const topApplications = Object.entries(appCounts)
      .map(([name, count]) => ({ name, duration: count * 10 / 60 }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)

    const productivityScore = Math.min(95, Math.round((activeHours / 8) * 100))

    return {
      totalHours,
      activeHours,
      screenshotCount,
      productivityScore,
      topApplications
    }
  }

  const metrics = calculateMetrics()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activity Dashboard</h1>
        <p className="text-gray-600 mt-1">Monitor work activity and productivity</p>
      </div>

      {/* Date and User Selection */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {user?.isAdmin && users.length > 0 && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="inline w-4 h-4 mr-1" />
                Select User
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {users.map((u: UserOption) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDateChange('prev')}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline w-4 h-4 mr-1" />
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => handleDateChange('next')}
              disabled={selectedDate === format(new Date(), 'yyyy-MM-dd')}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="text-2xl font-bold">{metrics.totalHours.toFixed(1)}h</span>
          </div>
          <p className="text-sm text-gray-600">Total Hours</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-green-500" />
            <span className="text-2xl font-bold">{metrics.activeHours.toFixed(1)}h</span>
          </div>
          <p className="text-sm text-gray-600">Active Hours</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <Monitor className="w-5 h-5 text-purple-500" />
            <span className="text-2xl font-bold">{metrics.screenshotCount}</span>
          </div>
          <p className="text-sm text-gray-600">Screenshots</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <span className="text-2xl font-bold">{metrics.productivityScore}%</span>
          </div>
          <p className="text-sm text-gray-600">Productivity Score</p>
        </div>
      </div>

      {/* Top Applications */}
      {metrics.topApplications.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Top Applications</h3>
          <div className="space-y-3">
            {metrics.topApplications.map((app, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium">{app.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(app.duration / metrics.totalHours) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-16 text-right">
                    {app.duration.toFixed(1)}h
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Screenshots Grid */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            Screenshots ({screenshots.length} total)
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : screenshots.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No screenshots found for the selected date.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
              {currentScreenshots.map((screenshot) => (
                <div
                  key={screenshot.id}
                  className="relative group cursor-pointer rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedScreenshot(screenshot)}
                >
                  <img
                    src={screenshot.imageUrl}
                    alt={screenshot.windowTitle}
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="200"%3E%3Crect width="400" height="200" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif"%3ENo Preview%3C/text%3E%3C/svg%3E'
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-opacity flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedScreenshot(screenshot)
                        }}
                        className="p-2 bg-white rounded-full hover:bg-gray-100"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownloadScreenshot(screenshot)
                        }}
                        className="p-2 bg-white rounded-full hover:bg-gray-100"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-gray-600 truncate">{screenshot.applicationName || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">
                      {screenshot.timestamp ? format(parseISO(screenshot.timestamp), 'HH:mm:ss') : 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 p-4 border-t">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh] overflow-auto">
            <img
              src={selectedScreenshot.imageUrl}
              alt={selectedScreenshot.windowTitle}
              className="w-full h-auto"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect width="800" height="600" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="24"%3ENo Preview Available%3C/text%3E%3C/svg%3E'
              }}
            />
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownloadScreenshot(selectedScreenshot)
                }}
                className="p-2 bg-white rounded-full hover:bg-gray-100"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedScreenshot(null)
                }}
                className="p-2 bg-white rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg">
              <p className="text-sm font-medium">{selectedScreenshot.applicationName}</p>
              <p className="text-xs text-gray-600">{selectedScreenshot.windowTitle}</p>
              <p className="text-xs text-gray-500">
                {format(parseISO(selectedScreenshot.timestamp), 'PPpp')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Screenshots