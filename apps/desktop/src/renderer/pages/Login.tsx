import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Loader2, Zap, Coffee, Code2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const funnyLoadingMessages = [
  "Waking up the hamsters... 🐹",
  "Convincing the server you're cool... 😎",
  "Checking if you're a robot... 🤖",
  "Summoning authentication spirits... 👻",
  "Decrypting your awesomeness... 🔐"
];

const loginQuotes = [
  "Ready to pretend you're productive? 😏",
  "Time to track those 'productive' hours! 📊",
  "Welcome back, keyboard warrior! ⌨️",
  "Let's make those hours count! (or at least look like they do) 🎯",
  "Another day, another dashboard to impress! 💪"
];

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const randomQuote = loginQuotes[Math.floor(Math.random() * loginQuotes.length)];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const messageInterval = setInterval(() => {
      setLoadingMessage(funnyLoadingMessages[Math.floor(Math.random() * funnyLoadingMessages.length)]);
    }, 1000);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid credentials. Did you forget your password again? 🤔');
    } finally {
      clearInterval(messageInterval);
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg"
            >
              <Zap className="w-10 h-10 text-white" />
            </motion.div>
            
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              People Parity
            </h1>
            <p className="text-gray-600 mt-2">Time Tracker for the Modern Developer</p>
            <p className="text-sm text-gray-500 italic mt-2">{randomQuote}</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                placeholder="your@email.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                  placeholder="Your super secret password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-500" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`
                w-full py-3 px-4 rounded-lg font-medium transition-all
                ${isLoading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg hover:scale-[1.02]'
                }
              `}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{loadingMessage || 'Logging in...'}</span>
                </div>
              ) : (
                "Let's Track Some Time! 🚀"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Microsoft Sign In Button */}
          <button
            onClick={async () => {
              // Navigate to Microsoft SAML login within the Electron window
              if (typeof window.electronAPI !== 'undefined' && window.electronAPI.auth) {
                try {
                  await window.electronAPI.auth.samlLogin();
                } catch (error) {
                  console.error('Failed to initiate SAML login:', error);
                  setError('Failed to start Microsoft login. Please try again.');
                }
              } else {
                // Fallback for browser environment - get API URL from backend
                if (window.electronAPI?.auth?.getApiUrl) {
                  const apiUrl = await window.electronAPI.auth.getApiUrl();
                  window.location.href = `${apiUrl}/api/auth/saml/login`;
                } else {
                  window.location.href = 'http://localhost:3001/api/auth/saml/login';
                }
              }
            }}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg font-medium transition-all border-2 border-gray-300 hover:border-gray-400 flex items-center justify-center gap-3 hover:shadow-md"
          >
            <svg className="w-5 h-5" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            Sign in with Microsoft
          </button>

          {/* Fun Stats */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <Coffee className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                <div className="text-2xl font-bold text-gray-700">247</div>
                <div className="text-xs text-gray-500">Coffee breaks</div>
              </div>
              <div>
                <Code2 className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                <div className="text-2xl font-bold text-gray-700">10k</div>
                <div className="text-xs text-gray-500">Lines tracked</div>
              </div>
              <div>
                <Clock className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                <div className="text-2xl font-bold text-gray-700">∞</div>
                <div className="text-xs text-gray-500">Hours saved</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By logging in, you agree to track your time honestly*
            </p>
            <p className="text-xs text-gray-400 mt-1">
              *Results may vary. Coffee breaks included.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}