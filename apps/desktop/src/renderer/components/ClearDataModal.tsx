import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, AlertTriangle, Database, Image, Activity, Clock, CheckSquare, Square, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DataStats {
  screenshots: { count: number; syncedCount: number; unsyncedCount: number; sizeBytes: number };
  activityPeriods: { count: number; syncedCount: number; unsyncedCount: number };
  sessions: { count: number; syncedCount: number; unsyncedCount: number };
  syncQueue: { count: number };
  recentNotes: { count: number };
  totalSizeBytes: number;
}

interface ClearDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export function ClearDataModal({ isOpen, onClose }: ClearDataModalProps) {
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Selected data types to clear
  const [selectedTypes, setSelectedTypes] = useState({
    screenshots: true,
    activityPeriods: true,
    sessions: true,
    syncQueue: false,
    recentNotes: false,
  });

  // Include unsynced data option
  const [includeUnsynced, setIncludeUnsynced] = useState(false);

  // Load data stats when modal opens
  useEffect(() => {
    if (isOpen) {
      loadStats();
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[ClearDataModal] Loading data stats...');
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI) {
        console.error('[ClearDataModal] electronAPI not available');
        setError('Desktop API not available. Please restart the app.');
        return;
      }
      if (!electronAPI.getDataStats) {
        console.error('[ClearDataModal] getDataStats method not available');
        setError('Clear data feature not available. Please update the app.');
        return;
      }
      const result = await electronAPI.getDataStats();
      console.log('[ClearDataModal] Data stats received:', result);
      if (result) {
        setStats(result);
      } else {
        setError('No data statistics returned');
      }
    } catch (err) {
      console.error('[ClearDataModal] Failed to load data stats:', err);
      setError('Failed to load data statistics');
    } finally {
      setLoading(false);
    }
  };

  const toggleType = (type: keyof typeof selectedTypes) => {
    setSelectedTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleClearData = async () => {
    // Check if any type is selected
    if (!Object.values(selectedTypes).some(v => v)) {
      setError('Please select at least one data type to clear');
      return;
    }

    setClearing(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await (window as any).electronAPI.clearData({
        types: selectedTypes,
        includeUnsynced
      });

      if (result.success) {
        setSuccess(`Successfully cleared ${result.deletedCount} items. ${result.freedBytes ? `Freed ${formatBytes(result.freedBytes)}` : ''}`);
        // Reload stats after clearing
        await loadStats();
      } else {
        setError(result.error || 'Failed to clear data');
      }
    } catch (err: any) {
      console.error('Failed to clear data:', err);
      setError(err.message || 'An error occurred while clearing data');
    } finally {
      setClearing(false);
    }
  };

  const hasUnsyncedData = stats && (
    stats.screenshots.unsyncedCount > 0 ||
    stats.activityPeriods.unsyncedCount > 0 ||
    stats.sessions.unsyncedCount > 0
  );

  const getSelectedCount = () => {
    if (!stats) return 0;
    let count = 0;
    if (selectedTypes.screenshots) count += includeUnsynced ? stats.screenshots.count : stats.screenshots.syncedCount;
    if (selectedTypes.activityPeriods) count += includeUnsynced ? stats.activityPeriods.count : stats.activityPeriods.syncedCount;
    if (selectedTypes.sessions) count += includeUnsynced ? stats.sessions.count : stats.sessions.syncedCount;
    if (selectedTypes.syncQueue) count += stats.syncQueue.count;
    if (selectedTypes.recentNotes) count += stats.recentNotes.count;
    return count;
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            style={{ zIndex: 2147483647 }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: 2147483647 }}
          >
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Clear Local Data</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Free up space by removing old data
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-gray-600 dark:text-gray-300">Loading data statistics...</span>
                </div>
              )}

              {/* Error State - Failed to load stats */}
              {!loading && !stats && (
                <div className="py-8">
                  <div className="text-center text-gray-500 dark:text-gray-400 mb-4">
                    <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Unable to load data statistics</p>
                    <p className="text-sm mt-1">Please try again or restart the application</p>
                  </div>
                  <button
                    onClick={loadStats}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                             text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800
                             transition-colors font-medium"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Stats and Selection */}
              {!loading && stats && (
                <>
                  {/* Database Size Info */}
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">Total Local Storage</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatBytes(stats.totalSizeBytes)}
                      </span>
                    </div>
                  </div>

                  {/* Data Type Selection */}
                  <div className="space-y-3 mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Select data to clear:
                    </p>

                    {/* Screenshots */}
                    <div
                      onClick={() => toggleType('screenshots')}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedTypes.screenshots
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {selectedTypes.screenshots ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                          <Image className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-900 dark:text-white">Screenshots</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {stats.screenshots.count} items
                          </div>
                          <div className="text-xs text-gray-500">
                            {stats.screenshots.syncedCount} synced, {stats.screenshots.unsyncedCount} pending
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatBytes(stats.screenshots.sizeBytes)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Activity Periods */}
                    <div
                      onClick={() => toggleType('activityPeriods')}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedTypes.activityPeriods
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {selectedTypes.activityPeriods ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                          <Activity className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-900 dark:text-white">Activity Data</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {stats.activityPeriods.count} periods
                          </div>
                          <div className="text-xs text-gray-500">
                            {stats.activityPeriods.syncedCount} synced, {stats.activityPeriods.unsyncedCount} pending
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sessions */}
                    <div
                      onClick={() => toggleType('sessions')}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedTypes.sessions
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {selectedTypes.sessions ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-900 dark:text-white">Sessions</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {stats.sessions.count} sessions
                          </div>
                          <div className="text-xs text-gray-500">
                            {stats.sessions.syncedCount} synced, {stats.sessions.unsyncedCount} pending
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sync Queue */}
                    <div
                      onClick={() => toggleType('syncQueue')}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedTypes.syncQueue
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {selectedTypes.syncQueue ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                          <Database className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-900 dark:text-white">Sync Queue</span>
                        </div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {stats.syncQueue.count} items
                        </div>
                      </div>
                    </div>

                    {/* Recent Notes */}
                    <div
                      onClick={() => toggleType('recentNotes')}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedTypes.recentNotes
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {selectedTypes.recentNotes ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                          <span className="text-gray-500">📝</span>
                          <span className="font-medium text-gray-900 dark:text-white">Recent Notes</span>
                        </div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {stats.recentNotes.count} notes
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Include Unsynced Warning */}
                  {hasUnsyncedData && (
                    <div className="mb-4">
                      <div
                        onClick={() => setIncludeUnsynced(!includeUnsynced)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          includeUnsynced
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {includeUnsynced ? (
                            <CheckSquare className="w-5 h-5 text-amber-600 mt-0.5" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400 mt-0.5" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                              <span className="font-medium text-amber-700 dark:text-amber-400">
                                Include unsynced data
                              </span>
                            </div>
                            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                              Warning: Unsynced data has not been uploaded to the cloud yet.
                              Deleting it will result in permanent data loss.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  {/* Success Message */}
                  {success && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium">{getSelectedCount()}</span> items will be deleted
                      {!includeUnsynced && hasUnsyncedData && (
                        <span className="text-gray-500"> (unsynced data will be preserved)</span>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600
                               text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800
                               transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClearData}
                      disabled={clearing || getSelectedCount() === 0}
                      className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2
                               ${clearing || getSelectedCount() === 0
                                 ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                 : 'bg-red-600 hover:bg-red-700 text-white'
                               }`}
                    >
                      {clearing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Clearing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Clear Data
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
