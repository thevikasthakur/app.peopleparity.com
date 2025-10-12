import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Settings, ChevronDown, Clock, Package, Database } from 'lucide-react';

interface ProfileDropdownProps {
  user: any;
}

export function ProfileDropdown({ user }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const handleSettings = () => {
    setIsOpen(false);
    navigate('/settings');
  };

  const handleManualTime = () => {
    setIsOpen(false);
    navigate('/manual-time');
  };

  const handleAppVersions = () => {
    setIsOpen(false);
    navigate('/app-versions');
  };

  const handleSyncQueue = () => {
    setIsOpen(false);
    navigate('/sync-queue');
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
          {user?.name?.[0] || user?.email?.[0] || 'A'}
        </div>
        <span className="text-sm font-medium text-gray-700">{user?.name || user?.email || 'Admin'}</span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[70]">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">{user?.name || 'Admin User'}</p>
              <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
            </div>

            {/* Manual Time Entry - Only for admins */}
            {(user?.role === 'super_admin' || user?.role === 'org_admin') && (
              <button
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                onClick={handleManualTime}
              >
                <Clock className="w-4 h-4" />
                Manual Time Entry
              </button>
            )}

            {/* App Versions - Only for admins */}
            {(user?.role === 'super_admin' || user?.role === 'org_admin') && (
              <button
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                onClick={handleAppVersions}
              >
                <Package className="w-4 h-4" />
                App Versions
              </button>
            )}

            {/* Sync Queue Monitor - Only for super admins */}
            {user?.role === 'super_admin' && (
              <button
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                onClick={handleSyncQueue}
              >
                <Database className="w-4 h-4" />
                Sync Queue Monitor
              </button>
            )}

            <button
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
              onClick={handleSettings}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>

            <button
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}