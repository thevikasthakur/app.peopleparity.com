import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Globe, Save, Check } from 'lucide-react'

const Settings = () => {
  const [timezone, setTimezone] = useState('')
  const [saved, setSaved] = useState(false)

  // Common timezones with their offsets
  const timezones = [
    { value: 'UTC', label: 'UTC (±00:00)', offset: 0 },
    { value: 'America/New_York', label: 'Eastern Time (UTC-05:00)', offset: -5 },
    { value: 'America/Chicago', label: 'Central Time (UTC-06:00)', offset: -6 },
    { value: 'America/Denver', label: 'Mountain Time (UTC-07:00)', offset: -7 },
    { value: 'America/Los_Angeles', label: 'Pacific Time (UTC-08:00)', offset: -8 },
    { value: 'Europe/London', label: 'London (UTC±00:00)', offset: 0 },
    { value: 'Europe/Paris', label: 'Central European Time (UTC+01:00)', offset: 1 },
    { value: 'Europe/Moscow', label: 'Moscow (UTC+03:00)', offset: 3 },
    { value: 'Asia/Dubai', label: 'Dubai (UTC+04:00)', offset: 4 },
    { value: 'Asia/Muscat', label: 'Muscat (UTC+04:00)', offset: 4 },
    { value: 'Asia/Kolkata', label: 'India Standard Time (UTC+05:30)', offset: 5.5 },
    { value: 'Asia/Shanghai', label: 'China Standard Time (UTC+08:00)', offset: 8 },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (UTC+09:00)', offset: 9 },
    { value: 'Australia/Sydney', label: 'Sydney (UTC+11:00)', offset: 11 },
    { value: 'Pacific/Auckland', label: 'New Zealand (UTC+13:00)', offset: 13 },
  ]

  useEffect(() => {
    // Load saved timezone preference
    const savedTimezone = localStorage.getItem('userTimezone')
    if (savedTimezone) {
      setTimezone(savedTimezone)
    } else {
      // Default to browser timezone if available
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const matchingTimezone = timezones.find(tz => tz.value === browserTimezone)
      if (matchingTimezone) {
        setTimezone(browserTimezone)
      } else {
        setTimezone('UTC')
      }
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem('userTimezone', timezone)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-6">
          <SettingsIcon className="w-6 h-6 text-gray-700 mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        <div className="space-y-6">
          <div className="border-b pb-6">
            <div className="flex items-center mb-4">
              <Globe className="w-5 h-5 text-gray-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-800">Time Zone Preferences</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                  Select your timezone
                </label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {timezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-gray-600">
                  Screenshots and activity times will be displayed in this timezone
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={handleSave}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  {saved ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Preferences
                    </>
                  )}
                </button>
                {saved && (
                  <span className="text-sm text-green-600 font-medium">
                    Preferences saved successfully!
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Current Time</h3>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Browser Time:</span> {new Date().toLocaleString()}
              </div>
              {timezone && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Selected Timezone Time:</span>{' '}
                  {new Date().toLocaleString('en-US', { timeZone: timezone })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings