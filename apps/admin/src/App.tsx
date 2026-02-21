import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
import { LocationGate } from './components/LocationGate';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { ManualTimeEntry } from './pages/ManualTimeEntry';
import { UserManagement } from './pages/UserManagement';
import AppVersions from './pages/AppVersions';
import { SyncQueueMonitor } from './components/SyncQueueMonitor';
import { ProtectedRoute } from './components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30 * 1000, // 30 seconds
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocationProvider>
        <LocationGate>
          <AuthProvider>
            <Router>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manual-time"
              element={
                <ProtectedRoute>
                  <ManualTimeEntry />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app-versions"
              element={
                <ProtectedRoute>
                  <AppVersions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user-management"
              element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sync-queue"
              element={
                <ProtectedRoute>
                  <SyncQueueMonitor />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            </Router>
          </AuthProvider>
        </LocationGate>
      </LocationProvider>
    </QueryClientProvider>
  );
}

export default App;