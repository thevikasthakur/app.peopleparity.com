import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { authService } from '../services/authService';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  isAdmin?: boolean;
  isDeveloper?: boolean;
  isExternal?: boolean;
  timezone?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        try {
          const userData = await authService.getCurrentUser(savedToken);
          if (cancelled) return;
          const isAdminRole = userData.role === 'super_admin' || userData.role === 'org_admin';
          const enrichedUserData = {
            ...userData,
            isDeveloper: userData.role === 'developer',
            isAdmin: isAdminRole,
            isExternal: userData.role === 'external',
          };
          console.log('CheckAuth - User role:', userData.role, 'isAdmin:', isAdminRole, 'userData:', enrichedUserData);
          setUser(enrichedUserData);
          setToken(savedToken);
        } catch (error) {
          if (cancelled) return;
          console.error('Failed to validate token:', error);
          localStorage.removeItem('auth_token');
          setToken(null);
        }
      }
      if (!cancelled) setIsLoading(false);
    };

    checkAuth();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login(email, password);

    if (response.token && response.user) {
      localStorage.setItem('auth_token', response.token);
      setToken(response.token);
      // Determine user type based on role
      const isAdminRole = response.user.role === 'super_admin' || response.user.role === 'org_admin';
      const userData = {
        ...response.user,
        isDeveloper: response.user.role === 'developer',
        isAdmin: isAdminRole,
        isExternal: response.user.role === 'external',
      };
      console.log('Login - User role:', response.user.role, 'isAdmin:', isAdminRole, 'userData:', userData);
      setUser(userData);
    } else {
      throw new Error('Invalid login response');
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken = token || localStorage.getItem('auth_token');
    if (currentToken) {
      try {
        const userData = await authService.getCurrentUser(currentToken);
        const isAdminRole = userData.role === 'super_admin' || userData.role === 'org_admin';
        const enrichedUserData = {
          ...userData,
          isDeveloper: userData.role === 'developer',
          isAdmin: isAdminRole,
          isExternal: userData.role === 'external',
        };
        setUser(enrichedUserData);
      } catch (error) {
        console.error('Failed to refresh user data:', error);
      }
    }
  }, [token]);

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}