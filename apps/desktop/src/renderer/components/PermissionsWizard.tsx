import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Camera, 
  MousePointer, 
  Check, 
  X, 
  AlertCircle,
  ChevronRight,
  Settings,
  Lock,
  Unlock,
  Monitor,
  Keyboard,
  ExternalLink
} from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'granted' | 'denied' | 'not-determined';
  required: boolean;
}

interface PermissionsWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function PermissionsWizard({ onComplete, onSkip }: PermissionsWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: 'screen-recording',
      name: 'Screen Recording',
      description: 'Required to capture screenshots for activity tracking',
      icon: <Camera className="w-6 h-6" />,
      status: 'not-determined',
      required: true
    },
    {
      id: 'accessibility',
      name: 'Accessibility',
      description: 'Required to track keyboard and mouse activity',
      icon: <MousePointer className="w-6 h-6" />,
      status: 'not-determined',
      required: true
    }
  ]);

  const [isChecking, setIsChecking] = useState(false);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    setIsChecking(true);
    try {
      // Check if we have the API available
      if (window.electronAPI?.permissions) {
        const status = await window.electronAPI.permissions.check();
        setPermissions(prev => prev.map(p => ({
          ...p,
          status: status[p.id] || 'not-determined'
        })));
      }
    } catch (error) {
      console.error('Failed to check permissions:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const requestPermission = async (permissionId: string) => {
    try {
      if (window.electronAPI?.permissions) {
        // Don't actually request - just open preferences
        // The request() method now opens System Preferences instead of triggering dialog
        await window.electronAPI.permissions.request(permissionId);
        // Re-check permissions after a delay to allow user to grant
        setTimeout(checkPermissions, 3000);
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
    }
  };

  const openSystemPreferences = async (pane: string) => {
    try {
      if (window.electronAPI?.system) {
        await window.electronAPI.system.openPreferences(pane);
      }
    } catch (error) {
      console.error('Failed to open system preferences:', error);
    }
  };

  const allPermissionsGranted = permissions.every(p => p.status === 'granted');
  const requiredPermissionsGranted = permissions.filter(p => p.required).every(p => p.status === 'granted');

  const steps = [
    {
      title: 'Welcome to People Parity',
      content: (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl flex items-center justify-center">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-gray-800">Let's Set Up Permissions</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              People Parity needs a few permissions to track your productive time accurately. 
              This quick setup will guide you through the process.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm text-blue-800 font-medium">Why do we need permissions?</p>
                <p className="text-sm text-blue-700 mt-1">
                  To track your work accurately, we need to capture screenshots and monitor your activity. 
                  Your data stays private and is only visible to you.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Screen Recording Permission',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-4">
              <Monitor className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Screen Recording Access</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              This allows People Parity to capture periodic screenshots of your work
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <h4 className="font-semibold text-gray-700">How to enable:</h4>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </span>
                <div>
                  <p className="text-sm text-gray-700">Click the button below to open System Preferences</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </span>
                <div>
                  <p className="text-sm text-gray-700">Navigate to <strong>Privacy & Security → Screen Recording</strong></p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  3
                </span>
                <div>
                  <p className="text-sm text-gray-700">Find <strong>People Parity</strong> in the list</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  4
                </span>
                <div>
                  <p className="text-sm text-gray-700">Toggle the switch to enable it</p>
                  <p className="text-xs text-gray-500 mt-1">You may need to restart the app after enabling</p>
                </div>
              </li>
            </ol>

            <button
              onClick={() => openSystemPreferences('privacy-screen-recording')}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <Settings className="w-5 h-5" />
              Open System Preferences
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-2">
            {permissions[0].status === 'granted' ? (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-5 h-5" />
                <span className="font-medium">Screen Recording Enabled</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">Waiting for permission...</span>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Accessibility Permission',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4">
              <Keyboard className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Accessibility Access</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              This allows People Parity to track keyboard and mouse activity to measure your productivity
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <h4 className="font-semibold text-gray-700">How to enable:</h4>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </span>
                <div>
                  <p className="text-sm text-gray-700">Click the button below to open System Preferences</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </span>
                <div>
                  <p className="text-sm text-gray-700">Navigate to <strong>Privacy & Security → Accessibility</strong></p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  3
                </span>
                <div>
                  <p className="text-sm text-gray-700">Click the lock icon and enter your password</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  4
                </span>
                <div>
                  <p className="text-sm text-gray-700">Find <strong>People Parity</strong> and check the box</p>
                  <p className="text-xs text-gray-500 mt-1">You may need to restart the app after enabling</p>
                </div>
              </li>
            </ol>

            <button
              onClick={() => openSystemPreferences('privacy-accessibility')}
              className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <Settings className="w-5 h-5" />
              Open System Preferences
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-2">
            {permissions[1].status === 'granted' ? (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-5 h-5" />
                <span className="font-medium">Accessibility Enabled</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">Waiting for permission...</span>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'All Set!',
      content: (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl flex items-center justify-center">
            {allPermissionsGranted ? (
              <Check className="w-12 h-12 text-white" />
            ) : (
              <AlertCircle className="w-12 h-12 text-white" />
            )}
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-gray-800">
              {allPermissionsGranted ? "You're All Set!" : "Setup Incomplete"}
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              {allPermissionsGranted 
                ? "All permissions have been granted. You can now start tracking your productive time!"
                : "Some permissions are still pending. You can continue, but some features may not work correctly."}
            </p>
          </div>

          <div className="space-y-3 max-w-sm mx-auto">
            {permissions.map((permission) => (
              <div
                key={permission.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  permission.status === 'granted'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {permission.icon}
                  <span className="font-medium text-gray-700">{permission.name}</span>
                </div>
                {permission.status === 'granted' ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <X className="w-5 h-5 text-amber-600" />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={checkPermissions}
            className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
          >
            Refresh Permission Status
          </button>
        </div>
      )
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Progress bar */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Setup Wizard</h2>
            <span className="text-sm text-gray-500">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {steps[currentStep].content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <div>
            {currentStep === 0 && onSkip && (
              <button
                onClick={onSkip}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Skip Setup
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Back
              </button>
            )}
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onComplete}
                disabled={!requiredPermissionsGranted}
                className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  requiredPermissionsGranted
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {requiredPermissionsGranted ? 'Start Tracking' : 'Permissions Required'}
                {requiredPermissionsGranted && <Check className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}