import { ReactNode } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, AlertTriangle, XCircle, Loader2, Globe, Mail } from 'lucide-react';

const logoImage = 'https://people-parity-assets.s3.ap-south-1.amazonaws.com/people-parity-logo.png';

interface LocationGateProps {
  children: ReactNode;
}

export function LocationGate({ children }: LocationGateProps) {
  const { status, isLoading, errorMessage } = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();

  // External users bypass the location gate entirely
  if (user?.role === 'external') {
    return <>{children}</>;
  }

  // If user is not yet authenticated, skip geo-gate so they can reach the login page.
  // Geo-enforcement applies after authentication for non-external users.
  if (!user && !isAuthLoading) {
    return <>{children}</>;
  }
  if (isAuthLoading) {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <img src={logoImage} alt="People Parity" className="w-16 h-16 mx-auto mb-6" />
          <div className="flex items-center justify-center gap-3 mb-4">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <MapPin className="w-6 h-6 text-indigo-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Detecting Your Location</h2>
          <p className="text-gray-500 text-sm">
            Please allow location access when prompted by your browser.
          </p>
        </div>
      </div>
    );
  }

  // Geolocation not supported
  if (status === 'not_supported') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
          <img src={logoImage} alt="People Parity" className="w-16 h-16 mx-auto mb-6" />
          <div className="flex items-center justify-center gap-2 mb-4">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 text-center mb-3">
            Browser Not Supported
          </h2>
          <p className="text-gray-600 text-center mb-6">
            Your browser does not support location services, which is required to use this application.
          </p>
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <p className="text-sm text-orange-800 font-medium mb-3">
              Please use one of the following browsers:
            </p>
            <ul className="space-y-2 text-sm text-orange-700">
              <li className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span><strong>Google Chrome</strong> (latest version)</span>
              </li>
              <li className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span><strong>Microsoft Edge</strong> (latest version)</span>
              </li>
              <li className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span><strong>Mozilla Firefox</strong> (latest version)</span>
              </li>
              <li className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span><strong>Safari</strong> (latest version)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Permission denied
  if (status === 'permission_denied') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
          <img src={logoImage} alt="People Parity" className="w-16 h-16 mx-auto mb-6" />
          <div className="flex items-center justify-center gap-2 mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 text-center mb-3">
            Location Access Required
          </h2>
          <p className="text-gray-600 text-center mb-6">
            You have denied location access. This application requires your location to function properly.
          </p>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200 mb-6">
            <p className="text-sm text-red-800 font-medium mb-3">
              To enable location access:
            </p>
            <ol className="space-y-2 text-sm text-red-700 list-decimal list-inside">
              <li>Click the lock/info icon in your browser's address bar</li>
              <li>Find "Location" in the permissions list</li>
              <li>Change the setting to "Allow"</li>
              <li>Refresh this page</li>
            </ol>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Other errors
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
          <img src={logoImage} alt="People Parity" className="w-16 h-16 mx-auto mb-6" />
          <div className="flex items-center justify-center gap-2 mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 text-center mb-3">
            Location Detection Failed
          </h2>
          <p className="text-gray-600 text-center mb-4">
            We were unable to detect your location. This may be due to a network issue or browser settings.
          </p>
          {errorMessage && (
            <div className="bg-gray-100 rounded-lg p-3 mb-6">
              <p className="text-xs text-gray-500 font-mono text-center">
                Error: {errorMessage}
              </p>
            </div>
          )}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-6">
            <p className="text-sm text-blue-800 font-medium mb-2">
              Need help?
            </p>
            <p className="text-sm text-blue-700 mb-3">
              Please contact your administrator for assistance with this issue.
            </p>
            <a
              href="mailto:support@peopleparity.com"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <Mail className="w-4 h-4" />
              support@peopleparity.com
            </a>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Success - render children
  return <>{children}</>;
}
