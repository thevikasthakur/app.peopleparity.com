import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string | null;
  organizationName?: string | null;
  role: 'developer' | 'admin' | 'org_admin' | 'super_admin';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async (retryCount = 0) => {
    try {
      // Check if we're in Electron environment
      if (typeof window.electronAPI !== 'undefined' && window.electronAPI.auth) {
        const result = await window.electronAPI.auth.checkSession();
        if (result.user) {
          setUser(result.user);
        }
      } else {
        // In browser environment, can't check session through Electron IPC
        console.log('Running in browser mode - Electron API not available');
      }
      setIsLoading(false);
    } catch (error: any) {
      // If handler is not registered yet and we haven't retried too many times, retry
      if (error?.message?.includes('No handler registered') && retryCount < 3) {
        console.log(`IPC handlers not ready yet, retrying in 500ms... (attempt ${retryCount + 1}/3)`);
        setTimeout(() => checkAuth(retryCount + 1), 500);
        return; // Don't set loading to false yet
      }
      console.error('Auth check failed:', error);
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    console.log('🔑 Login attempt for:', email);
    console.log('📱 Electron API available:', typeof window.electronAPI !== 'undefined');
    console.log('🔌 Auth methods available:', window.electronAPI?.auth ? Object.keys(window.electronAPI.auth) : 'none');
    
    if (typeof window.electronAPI === 'undefined' || !window.electronAPI.auth) {
      throw new Error('Electron API not available. Please use the desktop app.');
    }
    
    console.log('📤 Calling IPC auth.login...');
    const result = await window.electronAPI.auth.login(email, password);
    console.log('📥 IPC response:', result);
    
    if (result.success && result.user) {
      setUser(result.user);
    } else {
      throw new Error(result.message || 'Login failed');
    }
  };

  const logout = async () => {
    if (typeof window.electronAPI !== 'undefined' && window.electronAPI.auth) {
      await window.electronAPI.auth.logout();
    }
    setUser(null);
  };

  const setToken = async (token: string) => {
    if (typeof window.electronAPI === 'undefined' || !window.electronAPI.auth) {
      throw new Error('Electron API not available. Please use the desktop app.');
    }
    
    // Verify token with backend and get user info
    const result = await window.electronAPI.auth.verifyToken(token);
    if (result.valid && result.user) {
      setUser(result.user);
    } else {
      throw new Error('Invalid token');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}