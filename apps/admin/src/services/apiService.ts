import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Screenshots
  async getScreenshots(params?: {
    userId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) {
    // The API uses /screenshots endpoint with date parameters
    const queryParams: any = {};

    if (params?.userId) {
      queryParams.userId = params.userId;
    }

    if (params?.date) {
      // Convert single date to full day range (00:00:00 to 23:59:59)
      const startOfDay = new Date(params.date + 'T00:00:00.000Z');
      const endOfDay = new Date(params.date + 'T23:59:59.999Z');
      queryParams.startDate = startOfDay.toISOString();
      queryParams.endDate = endOfDay.toISOString();
    } else {
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
    }

    const response = await api.get('/api/screenshots', { params: queryParams });
    return response.data;
  },

  async getScreenshotDetails(screenshotId: string) {
    const response = await api.get(`/api/admin/screenshots/${screenshotId}`);
    return response.data;
  },

  // Activity data
  async getActivityPeriods(params?: {
    userId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await api.get('/api/admin/activity-periods', { params });
    return response.data;
  },

  // User sessions
  async getUserSessions(params?: {
    userId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }) {
    // For now, return empty array since we need to check the actual sessions endpoint
    // The API might use a different endpoint or the sessions might be included in dashboard stats
    try {
      const response = await api.get('/api/sessions/active');
      return response.data ? [response.data] : [];
    } catch {
      return [];
    }
  },

  // Team members
  async getTeamMembers() {
    const response = await api.get('/api/users/team-members');
    return response.data;
  },

  async getTeamMemberDetails(userId: string) {
    const response = await api.get(`/api/admin/team-members/${userId}`);
    return response.data;
  },

  // Analytics
  async getTeamAnalytics(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const response = await api.get('/api/admin/analytics', { params });
    return response.data;
  },

  async getUserAnalytics(userId: string, params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const response = await api.get(`/api/admin/analytics/user/${userId}`, { params });
    return response.data;
  },

  // Productive hours (Today's Hustle data)
  async getProductiveHours(params?: {
    userId?: string;
    date?: string;
  }) {
    // Use the same endpoint as desktop app: /analytics/productive-hours/daily
    try {
      const queryParams: any = {};
      if (params?.date) {
        queryParams.date = params.date;
      }
      if (params?.userId) {
        queryParams.userId = params.userId;
      }
      const response = await api.get('/api/analytics/productive-hours/daily', { params: queryParams });

      // The response already has productiveHours and averageActivityScore
      if (response.data) {
        const productiveHours = response.data.productiveHours || 0;
        const averageActivityScore = response.data.averageActivityScore || 0;

        return {
          productiveHours: productiveHours,
          averageActivityScore: averageActivityScore,
          markers: {
            halfAttendance: 4.5,
            threeQuarterAttendance: 6.75,
            fullAttendance: 9,
            maxScale: 12,
            isHolidayWeek: false
          },
          message: productiveHours >= 9 ? "Excellent work! Full attendance achieved!" :
                   productiveHours >= 6.75 ? "Great progress! Keep it up!" :
                   productiveHours >= 4.5 ? "Good start! Push for more!" :
                   "Let's get started and build momentum!",
          attendance: {
            earned: productiveHours >= 9 ? 100 :
                    productiveHours >= 6.75 ? 75 :
                    productiveHours >= 4.5 ? 50 : 0,
            status: productiveHours >= 9 ? "Full Attendance" :
                    productiveHours >= 6.75 ? "Good Day" :
                    productiveHours >= 4.5 ? "Half Day" : "No Attendance",
            color: productiveHours >= 9 ? "#10b981" :
                   productiveHours >= 6.75 ? "#3b82f6" :
                   productiveHours >= 4.5 ? "#f59e0b" : "#ef4444",
            isWeekend: new Date().getDay() === 0 || new Date().getDay() === 6
          }
        };
      }

      // Return default data if no response
      return {
        productiveHours: 0,
        averageActivityScore: 0,
        markers: {
          halfAttendance: 4.5,
          threeQuarterAttendance: 6.75,
          fullAttendance: 9,
          maxScale: 12,
          isHolidayWeek: false
        },
        message: "No data available",
        attendance: {
          earned: 0,
          status: "No Attendance",
          color: "#ef4444",
          isWeekend: new Date().getDay() === 0 || new Date().getDay() === 6
        }
      };
    } catch (error) {
      console.error('Failed to fetch productive hours:', error);
      // Return default data on error
      return {
        productiveHours: 0,
        averageActivityScore: 0,
        markers: {
          halfAttendance: 4.5,
          threeQuarterAttendance: 6.75,
          fullAttendance: 9,
          maxScale: 12,
          isHolidayWeek: false
        },
        message: "Unable to fetch data",
        attendance: {
          earned: 0,
          status: "No Attendance",
          color: "#ef4444",
          isWeekend: new Date().getDay() === 0 || new Date().getDay() === 6
        }
      };
    }
  },

  // Real-time updates via WebSocket (if needed)
  connectToRealTimeUpdates() {
    const token = localStorage.getItem('auth_token');
    const wsUrl = API_URL.replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/ws?token=${token}`);
    return ws;
  },

  async getUserSettings() {
    const response = await api.get('/api/users/settings');
    return response.data;
  },

  async updateUserSettings(settings: { timezone: string }) {
    const response = await api.patch('/api/users/settings', settings);
    return response.data;
  },

  async getSignedUrl(screenshotId: string) {
    const response = await api.get(`/api/screenshots/${screenshotId}/signed-url`);
    return response.data;
  },

  async getScreenshotDetails(screenshotId: string) {
    const response = await api.get(`/api/screenshots/${screenshotId}/details`);
    return response.data;
  },
};

export default api;