import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ProfileDropdown() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (!user) return null;

  // Get initials from user name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = getInitials(user.name || user.email);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
          {initials}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="fixed w-64 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              style={{ 
                zIndex: 2147483647, // Maximum z-index value
                top: `${dropdownPosition.top}px`,
                right: `${dropdownPosition.right}px`
              }}
            >
              {/* User Info Section */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg font-medium">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                
                {/* Organization Badge */}
                {user.organizationName && (
                  <div className="mt-3 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-300 text-center">
                    {user.organizationName}
                  </div>
                )}
                
                {/* Role Badge */}
                <div className="mt-2 flex items-center justify-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    user.role === 'super_admin' 
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                      : user.role === 'org_admin'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : user.role === 'admin'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {user.role.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Actions Section */}
              <div className="p-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // Could navigate to profile page if you have one
                    // navigate('/profile');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <User className="w-4 h-4" />
                  View Profile
                </button>
                
                <button
                  onClick={async () => {
                    setIsOpen(false);
                    await logout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}