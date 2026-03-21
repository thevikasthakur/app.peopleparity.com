import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Routes that external users are NOT allowed to access
const ADMIN_ONLY_ROUTES = ['/manual-time', '/app-versions', '/user-management', '/sync-queue'];

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Block external users from admin-only routes
  if (user?.isExternal && ADMIN_ONLY_ROUTES.some(route => location.pathname.startsWith(route))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
          <div className="flex items-center gap-3 text-amber-600 mb-3">
            <AlertCircle className="w-6 h-6" />
            <span className="font-medium">Access Restricted</span>
          </div>
          <p className="text-gray-600">
            External users can only access the work diary (screenshots) of their assigned team members.
          </p>
          <a href="/dashboard" className="mt-4 inline-block text-indigo-600 hover:text-indigo-800 text-sm font-medium">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}