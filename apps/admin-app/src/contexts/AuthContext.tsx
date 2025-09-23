import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

interface User {
  id: string
  email: string
  name: string
  role: string
  isAdmin: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (token && storedUser) {
      setUser(JSON.parse(storedUser))
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { email, password })
      const { token, user } = response.data

      // Map role to isAdmin flag
      const mappedUser = {
        ...user,
        isAdmin: user.role === 'super_admin' || user.role === 'org_admin'
      }

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(mappedUser))
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

      setUser(mappedUser)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}