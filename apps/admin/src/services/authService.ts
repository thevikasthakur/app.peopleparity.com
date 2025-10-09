import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const authService = {
  async login(email: string, password: string) {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });
    return response.data;
  },

  async getCurrentUser(token: string) {
    try {
      // Try verify endpoint first (seems to be what the API uses)
      const response = await axios.get(`${API_URL}/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Return user data from verify response
      if (response.data?.valid && response.data?.user) {
        return response.data.user;
      }

      // If verify doesn't return user data, return a default
      return {
        id: response.data?.userId || 'unknown',
        email: response.data?.email || 'user@example.com',
        name: response.data?.name || 'User',
        role: 'developer' // Default to developer role
      };
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  },

  async logout() {
    localStorage.removeItem('auth_token');
  },
};