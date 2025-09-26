import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { ArrowLeft, Save, Loader, Clock } from 'lucide-react';

const logoImage = 'https://people-parity-assets.s3.ap-south-1.amazonaws.com/people-parity-logo.png';

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (GMT+0:00)' },
  { value: 'America/New_York', label: 'Eastern Time (GMT-5:00)' },
  { value: 'America/Chicago', label: 'Central Time (GMT-6:00)' },
  { value: 'America/Denver', label: 'Mountain Time (GMT-7:00)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (GMT-8:00)' },
  { value: 'Europe/London', label: 'London (GMT+0:00)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1:00)' },
  { value: 'Europe/Berlin', label: 'Berlin (GMT+1:00)' },
  { value: 'Asia/Dubai', label: 'Dubai (GMT+4:00)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (GMT+5:30)' },
  { value: 'Asia/Singapore', label: 'Singapore (GMT+8:00)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9:00)' },
  { value: 'Australia/Sydney', label: 'Sydney (GMT+10:00)' },
];

export function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timezone, setTimezone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Load current user settings
    const loadSettings = async () => {
      try {
        const userData = await apiService.getUserSettings();
        setTimezone(userData.timezone || 'Asia/Kolkata');
      } catch (error) {
        console.error('Failed to load settings:', error);
        setTimezone('Asia/Kolkata');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage('');

    try {
      await apiService.updateUserSettings({ timezone });
      setSuccessMessage('Settings saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 h-8 bg-gray-100/80 backdrop-blur-sm border-b border-gray-300 flex items-center justify-center gap-2 z-50">
        <img src={logoImage} alt="Logo" className="w-4 h-4 object-contain" />
        <span className="text-xs text-gray-500 font-medium">People Parity Tracker - Settings</span>
      </div>

      {/* Content */}
      <div className="p-6 pt-12 max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        {/* Settings Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-500">Manage your preferences</p>
            </div>
          </div>

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {successMessage}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* User Info */}
              <div className="pb-6 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Account Information</h2>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Name: </span>
                    <span className="text-sm font-medium text-gray-900">{user?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Email: </span>
                    <span className="text-sm font-medium text-gray-900">{user?.email}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Role: </span>
                    <span className="text-sm font-medium text-gray-900 capitalize">{user?.role || 'user'}</span>
                  </div>
                </div>
              </div>

              {/* Timezone Setting */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Preferred Timezone
                </label>
                <p className="text-sm text-gray-500 mb-4">
                  This timezone will be used to display dates and times throughout the application.
                </p>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Save Button */}
              <div className="pt-6 border-t border-gray-200">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}