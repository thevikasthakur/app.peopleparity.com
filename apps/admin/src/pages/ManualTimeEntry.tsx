import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { Clock, User, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface TimeValidation {
  isValid: boolean;
  maxEndTime?: string;
  message?: string;
}

export function ManualTimeEntry() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [taskName, setTaskName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [timeValidation, setTimeValidation] = useState<TimeValidation>({ isValid: true });

  // Check if user has admin access
  const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'org_admin';

  useEffect(() => {
    if (hasAdminAccess) {
      loadUsers();
    }
  }, [hasAdminAccess]);

  // Validate time selection to prevent cross-UTC date sessions
  useEffect(() => {
    if (date && startTime) {
      validateTimeSelection();
    }
  }, [date, startTime, timezone]);

  const loadUsers = async () => {
    try {
      const teamMembers = await apiService.getTeamMembers();
      setUsers(teamMembers);
    } catch (error) {
      console.error('Failed to load users:', error);
      setError('Failed to load team members');
    }
  };

  const validateTimeSelection = () => {
    try {
      if (!startTime || !date) {
        setTimeValidation({ isValid: true });
        return;
      }

      // Simple validation: sessions are limited to the same calendar day and 18 hours max
      const [startHour, startMinute] = startTime.split(':').map(Number);

      // Calculate 18 hours from start time
      const maxEndHour = startHour + 18;
      const maxEndMinute = startMinute;

      let effectiveMaxHour = maxEndHour;
      let effectiveMaxMinute = maxEndMinute;

      // If 18 hours would go past midnight, limit to 23:59
      if (maxEndHour >= 24) {
        effectiveMaxHour = 23;
        effectiveMaxMinute = 59;
      }

      const maxEndTimeStr = `${effectiveMaxHour.toString().padStart(2, '0')}:${effectiveMaxMinute.toString().padStart(2, '0')}`;

      setTimeValidation({
        isValid: true,
        maxEndTime: maxEndTimeStr,
        message: `Sessions are limited to 18 hours and must end on the same calendar day. Maximum end time: ${maxEndTimeStr}`
      });

    } catch (error) {
      setTimeValidation({
        isValid: false,
        message: 'Invalid date/time selection'
      });
    }
  };

  const validateForm = () => {
    if (!selectedUserId) {
      setError('Please select a user');
      return false;
    }
    if (!taskName.trim()) {
      setError('Please enter a task name');
      return false;
    }
    if (!date || !startTime || !endTime) {
      setError('Please fill in all date and time fields');
      return false;
    }

    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);

    if (startDateTime >= endDateTime) {
      setError('End time must be after start time');
      return false;
    }

    const durationHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
    if (durationHours > 18) {
      setError('Session duration cannot exceed 18 hours');
      return false;
    }

    if (durationHours < 0.1) {
      setError('Session duration must be at least 6 minutes');
      return false;
    }

    // Check if end time exceeds the validation limit
    if (timeValidation.maxEndTime && endTime > timeValidation.maxEndTime) {
      setError(`End time cannot exceed ${timeValidation.maxEndTime}. Sessions are limited to 18 hours and must end on the same calendar day.`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const startDateTime = new Date(`${date}T${startTime}:00`);
      const endDateTime = new Date(`${date}T${endTime}:00`);

      const response = await apiService.createManualTimeEntry({
        userId: selectedUserId,
        taskName: taskName.trim(),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        timezone
      });

      setSuccess(`Manual time entry created successfully! Duration: ${response.summary.duration}`);

      // Reset form
      setSelectedUserId('');
      setTaskName('');
      setStartTime('09:00');
      setEndTime('17:00');

    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create manual time entry');
    } finally {
      setLoading(false);
    }
  };

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="w-6 h-6" />
            <span className="font-medium">Access Denied</span>
          </div>
          <p className="mt-2 text-gray-600">
            You need super admin or organization admin privileges to access this feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-semibold text-gray-900">Manual Time Entry</h1>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Add manual time entries to user work diaries
            </p>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{success}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Selection */}
              <div>
                <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Select User
                </label>
                <select
                  id="user"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                >
                  <option value="">Choose a user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Name */}
              <div>
                <label htmlFor="taskName" className="block text-sm font-medium text-gray-700 mb-2">
                  Task Name
                </label>
                <input
                  type="text"
                  id="taskName"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="e.g., Client meeting, Code review, Documentation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                />
              </div>

              {/* Date Selection */}
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                />
              </div>

              {/* Time Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    id="startTime"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    id="endTime"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    max={timeValidation.maxEndTime}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Time Validation Message */}
              {timeValidation.message && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">{timeValidation.message}</p>
                </div>
              )}

              {/* Timezone */}
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading || !timeValidation.isValid}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Manual Time Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}