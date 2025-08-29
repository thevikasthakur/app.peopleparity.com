import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Check, X, ArrowRightLeft, Trash2, Clock, Monitor, Maximize2, Activity, MousePointer, Keyboard, AlertCircle, ChevronLeft, ChevronRight, Info, Edit2, Cloud, CloudOff, Upload, RefreshCw, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActivityModal } from './ActivityModal';

interface SyncStatus {
  status: 'synced' | 'partial' | 'pending' | 'failed' | 'queued';
  uploadPercentage?: number;
  screenshot: {
    synced: boolean;
    attempts: number;
    lastError?: string;
  };
  activityPeriods: {
    total: number;
    synced: number;
    queued: number;
    maxAttempts: number;
    details?: Array<{
      id: string;
      periodStart: number;
      periodEnd: number;
      synced: boolean;
      queued: boolean;
      attempts: number;
      status: string;
    }>;
  };
  queuePosition: number;
  nextRetryTime?: Date | null;
  lastAttemptAt?: Date | null;
}

interface Screenshot {
  id: string;
  thumbnailUrl: string;
  fullUrl: string;
  timestamp: Date;
  notes?: string;
  mode: 'client' | 'command';
  activityScore: number;
  activityName?: string;
  task?: string;
  activityPeriodId?: string;
  activityPeriodIds?: string[];
  relatedPeriods?: {
    id: string;
    periodStart: Date;
    periodEnd: Date;
    activityScore: number;
    metricsBreakdown?: any;
  }[];
  syncStatus?: SyncStatus;
}

interface DetailedMetrics {
  keyboard?: {
    totalKeystrokes: number;
    productiveKeystrokes: number;
    uniqueKeys: number;
    keysPerMinute: number;
    typingRhythm?: {
      consistent: boolean;
      avgIntervalMs: number;
      stdDeviationMs: number;
    };
  };
  mouse?: {
    totalClicks: number;
    totalScrolls: number;
    distancePixels: number;
    distancePerMinute: number;
    movementPattern?: {
      smooth: boolean;
      avgSpeed: number;
      maxSpeed: number;
    };
  };
  botDetection?: {
    keyboardBotDetected: boolean;
    mouseBotDetected: boolean;
    confidence: number;
    details: string[];
  };
  scoreCalculation?: {
    components: any;
    penalties: any;
    formula: string;
    rawScore: number;
    finalScore: number;
  };
  classification?: {
    category: string;
    confidence: number;
    tags: string[];
  };
}

// Create a safe URL that avoids file:// protocol
function getSafeUrl(url: string): string {
  if (!url || url.startsWith('file://')) {
    // Return a data URL placeholder
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjIwMCIgeT0iMTEyLjUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOWNhM2FmIj5Mb2FkaW5nLi4uPC90ZXh0Pjwvc3ZnPg==';
  }
  return url;
}

// Convert percentage score to scale of 10
function percentageToTenScale(percentage: number): number {
  return Math.round(percentage) / 10; // Convert 67% to 6.7
}

// Get activity level info based on score (0-10 scale)
function getActivityLevel(score: number): { name: string; color: string; bgColor: string; textColor: string } {
  if (score >= 8.5) {
    return { name: 'Good', color: '#10B981', bgColor: 'bg-green-600', textColor: 'text-green-700' }; // Dark Green
  } else if (score >= 7.0) {
    return { name: 'Fair', color: '#84CC16', bgColor: 'bg-lime-500', textColor: 'text-lime-700' }; // Lemon Green
  } else if (score >= 5.5) {
    return { name: 'Low', color: '#FFA500', bgColor: 'bg-orange-500', textColor: 'text-orange-700' }; // Orange
  } else if (score >= 4.0) {
    return { name: 'Poor', color: '#FF4444', bgColor: 'bg-red-500', textColor: 'text-red-700' }; // Red
  } else {
    return { name: 'Critical', color: '#B71C1C', bgColor: 'bg-red-800', textColor: 'text-red-900' }; // Dark Red
  }
}

// Get sync status styling and info
function getSyncStatusInfo(syncStatus?: SyncStatus) {
  if (!syncStatus) {
    return {
      icon: CloudOff,
      color: 'text-gray-400',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300',
      label: 'Unknown',
      description: 'Sync status unknown',
      showProgress: false,
      opacity: 'opacity-50'
    };
  }

  const { status, screenshot, activityPeriods, queuePosition, nextRetryTime, uploadPercentage } = syncStatus;
  
  switch (status) {
    case 'synced':
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300',
        label: 'Synced',
        description: `Fully synced (${activityPeriods.synced}/${activityPeriods.total} periods)`,
        showProgress: false,
        opacity: 'opacity-100'
      };
    
    case 'partial':
      // If upload percentage is 100%, it's actually synced
      if (uploadPercentage >= 100) {
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-300',
          label: 'Synced',
          description: `Fully synced (${activityPeriods.synced}/${activityPeriods.total} periods)`,
          showProgress: false,
          opacity: 'opacity-100'
        };
      }
      return {
        icon: RefreshCw,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-300',
        label: `Uploading ${Math.round(uploadPercentage)}%`,
        description: `${activityPeriods.synced}/${activityPeriods.total} periods synced`,
        showProgress: true,
        progress: uploadPercentage || 0,
        opacity: 'opacity-90'
      };
    
    case 'queued':
      return {
        icon: Upload,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        label: `Queue #${queuePosition + 1}`,
        description: `Waiting in queue (${screenshot.attempts} attempts)`,
        showProgress: false,
        opacity: 'opacity-75'
      };
    
    case 'pending':
      return {
        icon: Clock,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-300',
        label: 'Pending',
        description: 'Waiting to sync',
        showProgress: false,
        opacity: 'opacity-60'
      };
    
    case 'failed':
      return {
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-300',
        label: 'Failed',
        description: `Failed after ${screenshot.attempts} attempts`,
        error: screenshot.lastError,
        opacity: 'opacity-50'
      };
    
    default:
      return {
        icon: CloudOff,
        color: 'text-gray-400',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        label: 'Unknown',
        description: 'Unknown sync status',
        showProgress: false,
        opacity: 'opacity-50'
      };
  }
}

// Format time for display
function formatTimeAgo(date: Date | null | undefined): string {
  if (!date) return '';
  
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

function formatTimeUntil(date: Date | null | undefined): string {
  if (!date) return '';
  
  const now = new Date();
  const diff = new Date(date).getTime() - now.getTime();
  
  if (diff <= 0) return 'now';
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `in ${hours}h`;
  if (minutes > 0) return `in ${minutes}m`;
  return `in ${seconds}s`;
}

interface ScreenshotGridProps {
  screenshots: Screenshot[];
  onScreenshotClick: (id: string) => void;
  onSelectionChange: (ids: string[]) => void;
}

export function ScreenshotGrid({ screenshots, onScreenshotClick, onSelectionChange }: ScreenshotGridProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [modalScreenshot, setModalScreenshot] = useState<Screenshot | null>(null);
  const [detailedMetrics, setDetailedMetrics] = useState<DetailedMetrics[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [expandedMinutes, setExpandedMinutes] = useState<Set<number>>(new Set());
  const [showEditActivityModal, setShowEditActivityModal] = useState(false);
  const [currentEditActivity, setCurrentEditActivity] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleActivityChange = async (activity: string) => {
    if (selectedIds.size > 0 && activity.trim()) {
      console.log('Updating activity for screenshots:', Array.from(selectedIds), 'to:', activity);
      
      // TODO: Call API to update activity names for selected screenshots
      // For now, just update locally
      try {
        // Update activity name in database for each selected screenshot
        const updatePromises = Array.from(selectedIds).map(async (screenshotId) => {
          // This would call the IPC handler to update the activity
          // await window.electronAPI.screenshots.updateActivity(screenshotId, activity);
        });
        
        await Promise.all(updatePromises);
        
        // Clear selection after successful update
        setSelectedIds(new Set());
        onSelectionChange([]);
        setShowEditActivityModal(false);
        setCurrentEditActivity('');
        
        // Optionally refresh the screenshots to show updated activity names
        // This would be handled by the parent component
      } catch (error) {
        console.error('Failed to update activity:', error);
      }
    }
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
    onSelectionChange(Array.from(newSelection));
  };

  const scrollMetrics = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 400;
    const currentScroll = scrollContainerRef.current.scrollLeft;
    const newScroll = direction === 'left' 
      ? currentScroll - scrollAmount 
      : currentScroll + scrollAmount;
    
    scrollContainerRef.current.scrollTo({
      left: newScroll,
      behavior: 'smooth'
    });
  };

  const fetchDetailedMetrics = async (screenshot: Screenshot) => {
    console.log('Fetching metrics for screenshot:', screenshot.id);
    console.log('Related periods:', screenshot.relatedPeriods);
    console.log('Activity period IDs:', screenshot.activityPeriodIds);
    
    // Try to get period IDs
    const periodIds = screenshot.activityPeriodIds || 
                     (screenshot.relatedPeriods?.map(p => p.id)) || 
                     [];
    
    if (periodIds.length === 0) {
      console.log('No period IDs found for screenshot');
      return;
    }
    
    console.log('Fetching metrics for period IDs:', periodIds);
    setLoadingMetrics(true);
    
    try {
      const metrics = await (window as any).electronAPI.activity.getPeriodsWithMetrics(periodIds);
      console.log('Fetched metrics:', metrics);
      
      // Extract metricsBreakdown from each period
      const detailedMetricsData = metrics
        .map((m: any) => m.metricsBreakdown)
        .filter(Boolean);
      
      console.log('Detailed metrics data:', detailedMetricsData);
      setDetailedMetrics(detailedMetricsData);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const groupScreenshotsByHour = () => {
    const groups: { [hour: string]: (Screenshot | null)[] } = {};
    
    screenshots.forEach(screenshot => {
      const timestamp = new Date(screenshot.timestamp);
      const hour = timestamp.getHours();
      const minute = timestamp.getMinutes();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      
      // Calculate which slot (0-5) this screenshot belongs to
      // Slot 0: 00-09, Slot 1: 10-19, Slot 2: 20-29, Slot 3: 30-39, Slot 4: 40-49, Slot 5: 50-59
      const slotIndex = Math.floor(minute / 10);
      
      if (!groups[hourKey]) {
        // Initialize with 6 null slots
        groups[hourKey] = [null, null, null, null, null, null];
      }
      
      // Place screenshot in its correct slot
      // If there's already a screenshot in that slot, keep the latest one
      if (!groups[hourKey][slotIndex] || 
          new Date(screenshot.timestamp) > new Date(groups[hourKey][slotIndex]!.timestamp)) {
        groups[hourKey][slotIndex] = screenshot;
      }
    });
    
    return groups;
  };

  const hourGroups = groupScreenshotsByHour();

  if (screenshots.length === 0) {
    return (
      <div className="text-center py-12">
        <Monitor className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">No screenshots yet today</p>
        <p className="text-sm text-gray-400 mt-1">
          They'll appear here once you start tracking
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(hourGroups).map(([hour, hourScreenshots]) => {
        // Calculate average activity score for the hour
        const validScreenshots = hourScreenshots.filter(s => s !== null) as Screenshot[];
        const hourScore = validScreenshots.length > 0 
          ? validScreenshots.reduce((sum, s) => sum + percentageToTenScale(s.activityScore), 0) / validScreenshots.length
          : 0;
        const hourLevel = getActivityLevel(hourScore);

        // Group consecutive screenshots by activity name
        const activityGroups: { activity: string; count: number; startIdx: number }[] = [];
        let currentActivity = '';
        let currentCount = 0;
        let currentStartIdx = 0;

        hourScreenshots.forEach((screenshot, idx) => {
          const activity = screenshot ? (screenshot.activityName || screenshot.task || '(no activity name)') : '';
          if (activity !== currentActivity) {
            if (currentCount > 0) {
              activityGroups.push({ 
                activity: currentActivity, 
                count: currentCount, 
                startIdx: currentStartIdx 
              });
            }
            currentActivity = activity;
            currentCount = screenshot ? 1 : 0;
            currentStartIdx = idx;
          } else if (screenshot) {
            currentCount++;
          }
        });
        
        if (currentCount > 0) {
          activityGroups.push({ 
            activity: currentActivity, 
            count: currentCount, 
            startIdx: currentStartIdx 
          });
        }

        return (
          <div key={hour} className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="font-medium">{hour}</span>
              <span className="text-gray-400">({validScreenshots.length} captures)</span>
            </div>
            
            <div className="grid grid-cols-6 gap-2">
            {hourScreenshots.map((screenshot, index) => {
              // Add time label for each slot
              const slotStartMinute = index * 10;
              const slotEndMinute = slotStartMinute + 9;
              const slotLabel = `${slotStartMinute.toString().padStart(2, '0')}-${slotEndMinute.toString().padStart(2, '0')}`;
              
              if (!screenshot) {
                return (
                  <div
                    key={`empty-${hour}-${index}`}
                    className="relative aspect-video rounded-lg bg-gray-100 border-2 border-dashed border-gray-200"
                  >
                    <div className="absolute top-1 left-1 text-xs text-gray-400">
                      {slotLabel}
                    </div>
                  </div>
                );
              }

              const isSelected = selectedIds.has(screenshot.id);
              const isHovered = hoveredId === screenshot.id;
              const syncStatusInfo = getSyncStatusInfo(screenshot.syncStatus);
              const isNotFullySynced = screenshot.syncStatus?.status !== 'synced';
              
              return (
                <motion.div
                  key={screenshot.id}
                  whileHover={{ scale: 1.05 }}
                  className={`
                    relative aspect-video rounded-lg overflow-hidden cursor-pointer
                    border-2 transition-all
                    ${isSelected 
                      ? 'border-primary shadow-lg' 
                      : 'border-transparent hover:border-gray-300'
                    }
                    ${screenshot.mode === 'client' 
                      ? 'ring-2 ring-indigo-100' 
                      : 'ring-2 ring-emerald-100'
                    }
                  `}
                  onClick={() => {
                    setModalScreenshot(screenshot);
                    fetchDetailedMetrics(screenshot);
                  }}
                  onMouseEnter={() => setHoveredId(screenshot.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <img
                    src={getSafeUrl(screenshot.thumbnailUrl)}
                    alt={`Screenshot at ${new Date(screenshot.timestamp).toLocaleTimeString()}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to a placeholder image if S3 URL fails
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjIwMCIgeT0iMTEyLjUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOWNhM2FmIj5TY3JlZW5zaG90IFBlbmRpbmc8L3RleHQ+PC9zdmc+';
                    }}
                  />
                  
                  {/* Gray overlay for non-synced screenshots */}
                  {isNotFullySynced && (
                    <div className="absolute inset-0 bg-gray-600/20 backdrop-blur-[0.5px] pointer-events-none" />
                  )}
                  
                  {/* Selection Checkbox */}
                  <button
                    className={`
                      absolute top-2 left-2 w-6 h-6 rounded-full z-10
                      flex items-center justify-center transition-all
                      ${isSelected 
                        ? 'bg-primary text-white' 
                        : 'bg-white/80 backdrop-blur text-gray-600 hover:bg-white'
                      }
                    `}
                    onClick={(e) => toggleSelection(screenshot.id, e)}
                  >
                    {isSelected && <Check className="w-4 h-4" />}
                  </button>
                  
                  {/* Activity Score */}
                  <div className="absolute top-2 right-2">
                    {(() => {
                      const scoreOutOf10 = percentageToTenScale(screenshot.activityScore);
                      const level = getActivityLevel(scoreOutOf10);
                      return (
                        <div className="text-right">
                          <div 
                            className="px-2 py-1 rounded-full text-xs font-medium backdrop-blur text-white"
                            style={{ backgroundColor: level.color + 'CC' }} // Add transparency
                          >
                            {scoreOutOf10.toFixed(1)}
                          </div>
                          <div 
                            className="mt-1 px-1 py-0.5 rounded text-[10px] font-medium backdrop-blur text-white"
                            style={{ backgroundColor: level.color + 'AA' }}
                          >
                            {level.name}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* Mode Badge - Command Only */}
                  <div className="absolute bottom-2 left-2">
                    <div className="px-2 py-1 rounded text-xs font-medium backdrop-blur bg-emerald-500/80 text-white">
                      CMD
                    </div>
                  </div>
                  
                  {/* Sync Status Indicator */}
                  {screenshot.syncStatus && (() => {
                    const statusInfo = getSyncStatusInfo(screenshot.syncStatus);
                    const Icon = statusInfo.icon;
                    
                    return (
                      <div className="absolute bottom-2 right-2">
                        {/* Status Badge */}
                        <div className={`
                          px-2 py-1 rounded-full text-xs font-medium backdrop-blur
                          flex items-center gap-1 ${statusInfo.bgColor} ${statusInfo.color}
                          border ${statusInfo.borderColor}
                        `}>
                          <Icon className="w-3 h-3" />
                          <span>{statusInfo.label}</span>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Hover Actions - Removed to fix selection issue */}
                </motion.div>
              );
            })}
          </div>
          
          {/* Activity Ribbons */}
          {activityGroups.length > 0 && (
            <div className="relative h-6 bg-gray-100 rounded overflow-hidden flex">
              {activityGroups.map((group, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-center text-[11px] font-medium text-white px-1 border-r border-white/30"
                  style={{
                    width: `${(group.count / 6) * 100}%`,
                    marginLeft: idx === 0 ? `${(group.startIdx / 6) * 100}%` : 0,
                    backgroundColor: hourLevel.color + 'DD'
                  }}
                  title={group.activity}
                >
                  <span className="text-center">
                    {group.activity}
                  </span>
                </div>
              ))}
              {/* Hour Score on Right */}
              <div 
                className="absolute right-0 top-0 h-full px-2 flex items-center text-[10px] font-bold text-white"
                style={{ 
                  backgroundColor: hourLevel.color,
                  minWidth: '45px'
                }}
              >
                {hourScore.toFixed(1)}
              </div>
            </div>
          )}
        </div>
        );
      })}
      
      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-card px-6 py-3 flex items-center gap-4 shadow-2xl"
        >
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <div className="h-6 w-px bg-gray-300" />
          <button 
            className="px-3 py-1 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-1"
            onClick={() => {
              setShowEditActivityModal(true);
            }}
          >
            <Edit2 className="w-3 h-3" />
            Edit Activity
          </button>
          <button 
            className="px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600"
            onClick={() => {
              if (confirm(`Are you sure you want to delete ${selectedIds.size} screenshot(s)? This action cannot be undone.`)) {
                console.log('Delete screenshots:', Array.from(selectedIds));
                // TODO: Implement soft delete
                setSelectedIds(new Set());
                onSelectionChange([]);
              }
            }}
          >
            Delete
          </button>
          <button
            onClick={() => {
              setSelectedIds(new Set());
              onSelectionChange([]);
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
      
      {/* Screenshot Modal - Rendered via Portal */}
      {modalScreenshot && ReactDOM.createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setModalScreenshot(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-[calc(100vw-20px)] max-w-[calc(100vw-20px)] h-[94vh] bg-white rounded-xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold">Screenshot Details</h3>
                  <span className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${modalScreenshot.mode === 'client' 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'bg-emerald-100 text-emerald-700'}
                  `}>
                    {modalScreenshot.mode === 'client' ? 'CLIENT' : 'COMMAND'}
                  </span>
                  
                  {/* Sync Status in Modal */}
                  {modalScreenshot.syncStatus && (() => {
                    const statusInfo = getSyncStatusInfo(modalScreenshot.syncStatus);
                    const Icon = statusInfo.icon;
                    return (
                      <div className={`
                        px-3 py-1 rounded-full text-xs font-medium
                        flex items-center gap-1.5 ${statusInfo.bgColor} ${statusInfo.color}
                        border ${statusInfo.borderColor}
                      `}>
                        <Icon className="w-3.5 h-3.5" />
                        <span>{statusInfo.label}</span>
                        {statusInfo.showProgress && statusInfo.progress && (
                          <span className="ml-1 opacity-75">
                            ({Math.round(statusInfo.progress)}%)
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  
                  <span className="text-sm text-gray-500">
                    {new Date(modalScreenshot.timestamp).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => setModalScreenshot(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Modal Body - Side by side layout */}
              <div className="h-[calc(100%-4rem)] flex">
                {/* Left side - Large Screenshot Image */}
                <div className="flex-1 bg-gray-100 p-6 flex items-center justify-center overflow-auto">
                  <img
                    src={getSafeUrl(modalScreenshot.fullUrl) || getSafeUrl(modalScreenshot.thumbnailUrl)}
                    alt="Full size screenshot"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    style={{ maxHeight: 'calc(94vh - 8rem)' }}
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      // Try thumbnail first
                      if (img.src !== getSafeUrl(modalScreenshot.thumbnailUrl)) {
                        img.src = getSafeUrl(modalScreenshot.thumbnailUrl);
                      } else {
                        // Final fallback
                        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjQwMCIgeT0iMjI1IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzljYTNhZiI+U2NyZWVuc2hvdCBVbmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
                      }
                    }}
                  />
                </div>
                
                {/* Right side - Activity Details */}
                <div className="w-[400px] border-l bg-white overflow-y-auto">
                  {/* Summary Section */}
                  <div className="p-4 border-b">
                    <h3 className="text-sm font-semibold mb-3">Activity Summary</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider">Overall Score</label>
                        <div className="flex items-center gap-3 mt-1">
                          {(() => {
                            const scoreOutOf10 = percentageToTenScale(modalScreenshot.activityScore);
                            const level = getActivityLevel(scoreOutOf10);
                            return (
                              <>
                                <div className="flex-1">
                                  <div className="bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="h-full rounded-full"
                                      style={{ 
                                        width: `${modalScreenshot.activityScore}%`,
                                        backgroundColor: level.color
                                      }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[9px] mt-1 text-gray-400">
                                    <span>Critical</span>
                                    <span>Poor</span>
                                    <span>Low</span>
                                    <span>Fair</span>
                                    <span>Good</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold">{scoreOutOf10.toFixed(1)}</span>
                                  <span 
                                    className="text-xs px-2 py-1 rounded-full text-white font-medium"
                                    style={{ backgroundColor: level.color }}
                                  >
                                    {level.name}
                                  </span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider">Time</label>
                        <p className="text-sm font-medium mt-1">{new Date(modalScreenshot.timestamp).toLocaleTimeString()}</p>
                      </div>
                      {modalScreenshot.notes && (
                        <div>
                          <label className="text-xs text-gray-500 uppercase tracking-wider">Notes</label>
                          <p className="text-sm text-gray-700 mt-1">{modalScreenshot.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Sync Status Section */}
                  {modalScreenshot.syncStatus && (
                    <div className="p-4 border-b bg-gray-50">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Cloud className="w-4 h-4" />
                        Sync Status
                      </h3>
                      {(() => {
                        const statusInfo = getSyncStatusInfo(modalScreenshot.syncStatus);
                        const Icon = statusInfo.icon;
                        const { screenshot, activityPeriods, queuePosition, nextRetryTime, lastAttemptAt } = modalScreenshot.syncStatus;
                        
                        return (
                          <div className="space-y-3">
                            {/* Main Status */}
                            <div className="flex items-center gap-3">
                              <Icon className={`w-5 h-5 ${statusInfo.color}`} />
                              <div className="flex-1">
                                <div className="font-medium">{statusInfo.label}</div>
                                <div className="text-xs text-gray-600">{statusInfo.description}</div>
                              </div>
                            </div>
                            
                            {/* Sync Progress */}
                            {statusInfo.showProgress && statusInfo.progress && (
                              <div>
                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                  <span>Sync Progress</span>
                                  <span>{Math.round(statusInfo.progress)}%</span>
                                </div>
                                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="bg-yellow-500 h-full transition-all"
                                    style={{ width: `${statusInfo.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            
                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-gray-500">Screenshot:</span>
                                <span className={`ml-2 font-medium ${
                                  screenshot.synced ? 'text-green-600' : 'text-gray-600'
                                }`}>
                                  {screenshot.synced ? 'Synced' : 'Pending'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Activity Periods:</span>
                                <span className="ml-2 font-medium">
                                  {activityPeriods.synced}/{activityPeriods.total}
                                </span>
                              </div>
                              {screenshot.attempts > 0 && (
                                <div>
                                  <span className="text-gray-500">Attempts:</span>
                                  <span className="ml-2 font-medium">
                                    {screenshot.attempts}/{activityPeriods.maxAttempts}
                                  </span>
                                </div>
                              )}
                              {queuePosition > 0 && (
                                <div>
                                  <span className="text-gray-500">Queue Position:</span>
                                  <span className="ml-2 font-medium">#{queuePosition + 1}</span>
                                </div>
                              )}
                              {nextRetryTime && (
                                <div>
                                  <span className="text-gray-500">Next Retry:</span>
                                  <span className="ml-2 font-medium">
                                    {formatTimeUntil(nextRetryTime)}
                                  </span>
                                </div>
                              )}
                              {lastAttemptAt && (
                                <div>
                                  <span className="text-gray-500">Last Attempt:</span>
                                  <span className="ml-2 font-medium">
                                    {formatTimeAgo(lastAttemptAt)}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Error Message */}
                            {screenshot.lastError && (
                              <div className="bg-red-50 text-red-700 text-xs rounded-lg p-2 border border-red-200">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
                                  <div>
                                    <div className="font-medium mb-1">Sync Error</div>
                                    <div className="opacity-90">{screenshot.lastError}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                    
                  {/* Per-Minute Activity Breakdown */}
                  <div className="p-4">
                    <h3 className="text-sm font-semibold mb-3">Per-Minute Activity Breakdown</h3>
                    
                    {loadingMetrics ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                        <p className="text-xs text-gray-500 mt-2">Loading metrics...</p>
                      </div>
                    ) : detailedMetrics.length > 0 ? (
                      <div className="space-y-2">
                        {detailedMetrics.map((metrics, index) => {
                          // Get sync status for this period if available
                          const periodDetail = modalScreenshot?.syncStatus?.activityPeriods?.details?.[index];
                          const periodSyncStatus = periodDetail?.status || 'unknown';
                          const getSyncIcon = () => {
                            switch (periodSyncStatus) {
                              case 'synced': return <CheckCircle className="w-3 h-3 text-green-500" />;
                              case 'queued': return <Upload className="w-3 h-3 text-blue-500" />;
                              case 'failed': return <AlertTriangle className="w-3 h-3 text-red-500" />;
                              case 'pending': return <Clock className="w-3 h-3 text-gray-400" />;
                              default: return null;
                            }
                          };
                          
                          // Format period end time as hh:mm
                          const formatTime = (timestamp: number) => {
                            const date = new Date(timestamp);
                            return date.toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: false 
                            });
                          };
                          const periodEndTime = periodDetail?.periodEnd ? formatTime(periodDetail.periodEnd) : `Minute ${index + 1}`;
                          
                          return (
                          <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{periodEndTime}</span>
                                {getSyncIcon()}
                                <button
                                  onClick={() => {
                                    const newExpanded = new Set(expandedMinutes);
                                    if (newExpanded.has(index)) {
                                      newExpanded.delete(index);
                                    } else {
                                      newExpanded.add(index);
                                    }
                                    setExpandedMinutes(newExpanded);
                                  }}
                                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                                >
                                  <Info className="w-4 h-4 text-gray-500" />
                                </button>
                              </div>
                              {metrics?.scoreCalculation && (() => {
                                const scoreOutOf10 = percentageToTenScale(metrics.scoreCalculation.finalScore);
                                const level = getActivityLevel(scoreOutOf10);
                                return (
                                  <div className="text-center">
                                    <div 
                                      className="text-sm font-semibold px-3 py-1 rounded text-white inline-block"
                                      style={{ backgroundColor: level.color }}
                                    >
                                      {scoreOutOf10.toFixed(1)}
                                    </div>
                                    <div className="text-[10px] font-medium mt-1" style={{ color: level.color }}>
                                      {level.name}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                            
                            {/* Expandable Details */}
                            <AnimatePresence>
                              {expandedMinutes.has(index) && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-3 pt-3 border-t space-y-3">
                            {/* Keyboard Activity */}
                            {metrics?.keyboard && (
                              <div className="flex items-start gap-2">
                                <Keyboard className="w-4 h-4 text-gray-500 mt-0.5" />
                                <div className="flex-1 text-xs">
                                  <div className="flex justify-between mb-1">
                                    <span className="text-gray-600">Keystrokes:</span>
                                    <span className="font-medium">{metrics.keyboard.totalKeystrokes}</span>
                                  </div>
                                  <div className="flex justify-between mb-1">
                                    <span className="text-gray-600">Unique Keys:</span>
                                    <span className="font-medium">{metrics.keyboard.uniqueKeys}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Productive Keys:</span>
                                    <span className="font-medium">{metrics.keyboard.keysPerMinute.toFixed(1)}</span>
                                  </div>
                                  {metrics.keyboard.typingRhythm && (
                                    <div className="mt-1 pt-1 border-t">
                                      <span className={`text-[10px] ${
                                        metrics.keyboard.typingRhythm.consistent 
                                          ? 'text-green-600' 
                                          : 'text-yellow-600'
                                      }`}>
                                        {metrics.keyboard.typingRhythm.consistent ? 'Consistent' : 'Irregular'} typing
                                        (±{metrics.keyboard.typingRhythm.stdDeviationMs.toFixed(0)}ms)
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Mouse Activity */}
                            {metrics?.mouse && (
                              <div className="flex items-start gap-2">
                                <MousePointer className="w-4 h-4 text-gray-500 mt-0.5" />
                                <div className="flex-1 text-xs">
                                  <div className="flex justify-between mb-1">
                                    <span className="text-gray-600">Clicks:</span>
                                    <span className="font-medium">{metrics.mouse.totalClicks}</span>
                                  </div>
                                  <div className="flex justify-between mb-1">
                                    <span className="text-gray-600">Scrolls:</span>
                                    <span className="font-medium">{metrics.mouse.totalScrolls}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Distance:</span>
                                    <span className="font-medium">{metrics.mouse.distancePixels}px</span>
                                  </div>
                                  {metrics.mouse.movementPattern && (
                                    <div className="mt-1 pt-1 border-t">
                                      <span className={`text-[10px] ${
                                        metrics.mouse.movementPattern.smooth 
                                          ? 'text-green-600' 
                                          : 'text-yellow-600'
                                      }`}>
                                        {metrics.mouse.movementPattern.smooth ? 'Smooth' : 'Erratic'} movement
                                        (avg: {metrics.mouse.movementPattern.avgSpeed.toFixed(0)}px/s)
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Bot Detection - Only show if bot activity detected */}
                            {metrics?.botDetection && (metrics.botDetection.keyboardBotDetected || metrics.botDetection.mouseBotDetected) && (
                              <div className="bg-gray-50 rounded p-2">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertCircle className="w-4 h-4 text-orange-500" />
                                  <span className="text-xs font-medium">Bot Detection Analysis</span>
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Keyboard Bot:</span>
                                    <span className={metrics.botDetection.keyboardBotDetected ? 'text-red-600' : 'text-green-600'}>
                                      {metrics.botDetection.keyboardBotDetected ? 'Detected' : 'Human'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Mouse Bot:</span>
                                    <span className={metrics.botDetection.mouseBotDetected ? 'text-red-600' : 'text-green-600'}>
                                      {metrics.botDetection.mouseBotDetected ? 'Detected' : 'Human'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Confidence:</span>
                                    <span className="font-medium">{(metrics.botDetection.confidence * 100).toFixed(0)}%</span>
                                  </div>
                                  {metrics.botDetection.details && metrics.botDetection.details.length > 0 && (
                                    <div className="mt-1 pt-1 border-t">
                                      <ul className="list-disc list-inside text-[10px] text-gray-500">
                                        {metrics.botDetection.details.map((detail, i) => (
                                          <li key={i}>{detail}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Score Calculation */}
                            {metrics?.scoreCalculation && (
                              <div className="bg-blue-50 rounded p-2">
                                <div className="flex items-center gap-2 mb-2">
                                  <Activity className="w-4 h-4 text-blue-500" />
                                  <span className="text-xs font-medium">Score Calculation</span>
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div className="grid grid-cols-2 gap-2">
                                    {metrics.scoreCalculation.components && Object.entries(metrics.scoreCalculation.components).map(([key, value]) => (
                                      <div key={key} className="flex justify-between">
                                        <span className="text-gray-600">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                        <span className="font-medium">
                                          {typeof value === 'number' ? (value / 10).toFixed(1) : value}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                  {metrics.scoreCalculation.penalties && Object.values(metrics.scoreCalculation.penalties).some(v => v > 0) && (
                                    <div className="mt-1 pt-1 border-t">
                                      <span className="text-red-600 font-medium">Penalties:</span>
                                      {Object.entries(metrics.scoreCalculation.penalties).filter(([_, v]) => v > 0).map(([key, value]) => (
                                        <div key={key} className="text-[10px] text-red-500">
                                          -{value} ({key.replace(/([A-Z])/g, ' $1').trim()})
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <div className="mt-1 pt-1 border-t">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Raw Score:</span>
                                      <span className="font-medium">
                                        {percentageToTenScale(metrics.scoreCalculation.rawScore).toFixed(1)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between font-bold">
                                      <span className="text-gray-700">Final Score:</span>
                                      {(() => {
                                        const scoreOutOf10 = percentageToTenScale(metrics.scoreCalculation.finalScore);
                                        const level = getActivityLevel(scoreOutOf10);
                                        return (
                                          <div className="flex items-center gap-1">
                                            <span style={{ color: level.color }}>
                                              {scoreOutOf10.toFixed(1)}
                                            </span>
                                            <span className="text-[10px] font-medium" style={{ color: level.color }}>
                                              ({level.name})
                                            </span>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No activity data available</p>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="p-4 border-t mt-auto">
                    <button className="w-full px-3 py-2 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors">
                      Delete Screenshot
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.getElementById('modal-root')!
      )}

      {/* Activity Edit Modal */}
      <ActivityModal
        isOpen={showEditActivityModal}
        onClose={() => {
          setShowEditActivityModal(false);
          setCurrentEditActivity('');
        }}
        currentActivity={currentEditActivity}
        onActivityChange={handleActivityChange}
        recentActivities={[]}
      />
    </div>
  );
}