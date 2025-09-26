import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Monitor, X, ChevronLeft, ChevronRight, Calendar, Check, Loader, Keyboard, MousePointer, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { apiService } from '../services/apiService';

interface ActivityPeriod {
  id: string;
  periodStart: string;
  periodEnd: string;
  activityScore: number;
  isValid: boolean;
  metrics?: {
    keyboard?: {
      totalKeystrokes: number;
      uniqueKeys: number;
      productiveKeystrokes: number;
      typingRhythm?: {
        consistent: boolean;
        stdDeviationMs: number;
      };
    };
    mouse?: {
      totalClicks: number;
      totalScrolls: number;
      distancePixels: number;
      movementPattern?: {
        smooth: boolean;
        avgSpeed: number;
      };
    };
    botDetection?: {
      keyboardBotDetected: boolean;
      mouseBotDetected: boolean;
      confidence: number;
      details?: string[];
    };
    scoreCalculation?: {
      finalScore: number;
    };
  };
}

interface Screenshot {
  id: string;
  thumbnailUrl?: string;
  url?: string;
  fullUrl?: string;
  timestamp?: string;
  capturedAt?: string;
  userId: string;
  userName?: string;
  activityScore?: number;
  activityName?: string;
  notes?: string;
  task?: string;
  mode: 'client_hours' | 'command_hours' | 'client' | 'command';
  deviceInfo?: string;
  activityPeriods?: ActivityPeriod[];
}

interface ScreenshotGridProps {
  screenshots: Screenshot[];
  isLoading: boolean;
  onRefresh: () => void;
}

function percentageToTenScale(percentage: number): number {
  return Math.round(percentage) / 10;
}

function getActivityLevel(score: number): { name: string; color: string; bgColor: string; textColor: string } {
  if (score >= 8.5) {
    return { name: 'Good', color: '#10B981', bgColor: 'bg-green-600', textColor: 'text-green-700' };
  } else if (score >= 7.0) {
    return { name: 'Fair', color: '#84CC16', bgColor: 'bg-lime-500', textColor: 'text-lime-700' };
  } else if (score >= 5.5) {
    return { name: 'Low', color: '#FFA500', bgColor: 'bg-orange-500', textColor: 'text-orange-700' };
  } else if (score >= 4.0) {
    return { name: 'Poor', color: '#FF4444', bgColor: 'bg-red-500', textColor: 'text-red-700' };
  } else if (score >= 2.5) {
    return { name: 'Critical', color: '#B71C1C', bgColor: 'bg-red-800', textColor: 'text-red-900' };
  } else {
    return { name: 'Inactive', color: '#9CA3AF', bgColor: 'bg-gray-300', textColor: 'text-gray-500' };
  }
}

export function ScreenshotGrid({ screenshots, isLoading }: ScreenshotGridProps) {
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState<number>(-1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [signedFullUrl, setSignedFullUrl] = useState<string | null>(null);
  const [loadingSignedUrl, setLoadingSignedUrl] = useState(false);
  const [activityPeriods, setActivityPeriods] = useState<ActivityPeriod[]>([]);
  const [loadingActivityPeriods, setLoadingActivityPeriods] = useState(false);
  const [expandedMinutes, setExpandedMinutes] = useState<Set<number>>(new Set());
  const signedUrlCacheRef = useRef<Map<string, { url: string; expiresAt: number }>>(new Map());

  const getTimestamp = (screenshot: Screenshot) => {
    return screenshot.timestamp || screenshot.capturedAt || '';
  };

  const getThumbnailUrl = (screenshot: Screenshot) => {
    return screenshot.thumbnailUrl || screenshot.url || '';
  };


  const getActivityName = (screenshot: Screenshot) => {
    return screenshot.activityName || screenshot.notes || screenshot.task || '';
  };

  const navigateScreenshot = (direction: 'prev' | 'next') => {
    if (selectedScreenshotIndex === -1) return;

    let newIndex = selectedScreenshotIndex;
    if (direction === 'prev') {
      newIndex = selectedScreenshotIndex > 0 ? selectedScreenshotIndex - 1 : screenshots.length - 1;
    } else {
      newIndex = selectedScreenshotIndex < screenshots.length - 1 ? selectedScreenshotIndex + 1 : 0;
    }

    setSelectedScreenshotIndex(newIndex);
    setSelectedScreenshot(screenshots[newIndex]);
  };

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!selectedScreenshot) {
        setSignedFullUrl(null);
        return;
      }

      const cached = signedUrlCacheRef.current.get(selectedScreenshot.id);
      const now = Date.now();

      if (cached && cached.expiresAt > now) {
        console.log(`Using cached signed URL for screenshot ${selectedScreenshot.id}`);
        setSignedFullUrl(cached.url);
        return;
      }

      if (cached) {
        signedUrlCacheRef.current.delete(selectedScreenshot.id);
      }

      setLoadingSignedUrl(true);
      try {
        const response = await apiService.getSignedUrl(selectedScreenshot.id);

        if (response.success && response.signedUrl) {
          const expiresAt = now + ((response.expiresIn || 300) - 30) * 1000;
          signedUrlCacheRef.current.set(selectedScreenshot.id, {
            url: response.signedUrl,
            expiresAt
          });

          setSignedFullUrl(response.signedUrl);
        } else {
          console.error('Failed to fetch signed URL');
          setSignedFullUrl(null);
        }
      } catch (error) {
        console.error('Error fetching signed URL:', error);
        setSignedFullUrl(null);
      } finally {
        setLoadingSignedUrl(false);
      }
    };

    fetchSignedUrl();
  }, [selectedScreenshot]);

  useEffect(() => {
    const fetchActivityPeriods = async () => {
      if (!selectedScreenshot) {
        setActivityPeriods([]);
        setExpandedMinutes(new Set());
        return;
      }

      setLoadingActivityPeriods(true);
      try {
        const details = await apiService.getScreenshotDetails(selectedScreenshot.id);
        setActivityPeriods(details.activityPeriods || []);
      } catch (error) {
        console.error('Error fetching activity periods:', error);
        setActivityPeriods([]);
      } finally {
        setLoadingActivityPeriods(false);
      }
    };

    fetchActivityPeriods();
  }, [selectedScreenshot]);

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const cache = signedUrlCacheRef.current;
      for (const [id, entry] of cache.entries()) {
        if (entry.expiresAt <= now) {
          cache.delete(id);
        }
      }
    }, 60000);

    return () => clearInterval(cleanupInterval);
  }, []);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!selectedScreenshot) return;

      switch(event.key) {
        case 'Escape':
          setSelectedScreenshot(null);
          setSelectedScreenshotIndex(-1);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          navigateScreenshot('prev');
          break;
        case 'ArrowRight':
          event.preventDefault();
          navigateScreenshot('next');
          break;
      }
    };

    if (selectedScreenshot) {
      document.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [selectedScreenshot, selectedScreenshotIndex, screenshots]);

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const groupScreenshotsByHour = () => {
    const groups: { [hour: string]: (Screenshot | null)[] } = {};

    screenshots.forEach(screenshot => {
      const timestamp = new Date(getTimestamp(screenshot));
      const hour = timestamp.getHours();
      const minute = timestamp.getMinutes();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;

      const slotIndex = Math.floor(minute / 10);

      if (!groups[hourKey]) {
        groups[hourKey] = [null, null, null, null, null, null];
      }

      if (!groups[hourKey][slotIndex] ||
          new Date(getTimestamp(screenshot)) > new Date(getTimestamp(groups[hourKey][slotIndex]!))) {
        groups[hourKey][slotIndex] = screenshot;
      }
    });

    return groups;
  };

  const getLocalDateString = (timestamp: string) => {
    const date = new Date(timestamp);
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    const timezone = date.toLocaleTimeString('en-US', {
      timeZoneName: 'short'
    }).split(' ').pop();
    return `${dateStr} (${timezone})`;
  };

  const hourGroups = groupScreenshotsByHour();
  let lastLocalDate: string | null = null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-gray-500">Loading screenshots...</p>
        </div>
      </div>
    );
  }

  if (!screenshots || screenshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 glass-card">
        <Monitor className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-500 text-lg">No screenshots available</p>
        <p className="text-gray-400 text-sm mt-1">Screenshots will appear here as team members work</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(hourGroups).map(([hour, hourScreenshots]) => {
        const validScreenshots = hourScreenshots.filter(s => s !== null) as Screenshot[];
        const hourScore = validScreenshots.length > 0
          ? validScreenshots.reduce((sum, s) => sum + percentageToTenScale(s.activityScore || 0), 0) / validScreenshots.length
          : 0;
        const hourLevel = getActivityLevel(hourScore);

        const activityGroups: { activity: string; count: number; startIdx: number }[] = [];
        let currentActivity = '';
        let currentCount = 0;
        let currentStartIdx = 0;

        hourScreenshots.forEach((screenshot, idx) => {
          const activity = screenshot ? (getActivityName(screenshot) || '(no activity)') : '';

          if (!screenshot || activity !== currentActivity) {
            if (currentCount > 0) {
              activityGroups.push({
                activity: currentActivity,
                count: currentCount,
                startIdx: currentStartIdx
              });
            }

            if (screenshot) {
              currentActivity = activity;
              currentCount = 1;
              currentStartIdx = idx;
            } else {
              currentActivity = '';
              currentCount = 0;
              currentStartIdx = idx + 1;
            }
          } else {
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

        const firstValidScreenshot = validScreenshots[0];
        const currentLocalDate = firstValidScreenshot ? getLocalDateString(getTimestamp(firstValidScreenshot)) : null;
        const showDateSeparator = currentLocalDate && currentLocalDate !== lastLocalDate;
        if (currentLocalDate) {
          lastLocalDate = currentLocalDate;
        }

        return (
          <div key={hour} className="space-y-2">
            {showDateSeparator && (
              <div className="flex items-center gap-3 py-2 mt-4 first:mt-0">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-medium text-gray-600">{currentLocalDate}</span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="font-medium">{hour}</span>
              <span className="text-gray-400">({validScreenshots.length} captures)</span>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {hourScreenshots.map((screenshot, index) => {
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
                const scoreOutOf10 = percentageToTenScale(screenshot.activityScore || 0);
                const level = getActivityLevel(scoreOutOf10);

                return (
                  <motion.div
                    key={screenshot.id}
                    whileHover={{ scale: 1.05 }}
                    className={`
                      relative aspect-video rounded-lg overflow-hidden cursor-pointer
                      border-2 transition-all
                      ${isSelected
                        ? 'border-indigo-500 shadow-lg'
                        : 'border-transparent hover:border-gray-300'
                      }
                    `}
                    onClick={() => {
                      const idx = screenshots.findIndex(s => s.id === screenshot.id);
                      setSelectedScreenshotIndex(idx);
                      setSelectedScreenshot(screenshot);
                    }}
                    onMouseEnter={() => setHoveredId(screenshot.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <img
                      src={getThumbnailUrl(screenshot)}
                      alt={`Screenshot at ${new Date(getTimestamp(screenshot)).toLocaleTimeString()}`}
                      className={`w-full h-full object-cover transition-opacity duration-200 ${
                        isHovered
                          ? 'opacity-100'
                          : scoreOutOf10 < 2.5
                            ? 'opacity-20'
                            : scoreOutOf10 < 4.0
                              ? 'opacity-75'
                              : 'opacity-100'
                      }`}
                      loading="lazy"
                    />

                    <button
                      className={`
                        absolute top-2 left-2 w-6 h-6 rounded-full z-10
                        flex items-center justify-center transition-all
                        ${isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white/80 backdrop-blur text-gray-600 hover:bg-white'
                        }
                      `}
                      onClick={(e) => toggleSelection(screenshot.id, e)}
                    >
                      {isSelected && <Check className="w-4 h-4" />}
                    </button>

                    <div className="absolute top-2 right-2">
                      <div className="text-right">
                        <div
                          className="px-2 py-1 rounded-full text-xs font-medium backdrop-blur text-white"
                          style={{ backgroundColor: level.color + 'CC' }}
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
                    </div>

                    <div className="absolute bottom-2 left-2 flex flex-col gap-1">
                      <div className={`px-2 py-1 rounded text-xs font-medium backdrop-blur text-white ${
                        (screenshot.mode === 'client' || screenshot.mode === 'client_hours')
                          ? 'bg-indigo-500/80'
                          : 'bg-emerald-500/80'
                      }`}>
                        {(screenshot.mode === 'client' || screenshot.mode === 'client_hours') ? 'CLIENT' : 'CMD'}
                      </div>
                      <div className="px-2 py-1 rounded text-xs font-semibold backdrop-blur text-white bg-black/70">
                        {new Date(getTimestamp(screenshot)).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {activityGroups.length > 0 && (
              <div className="relative h-6 bg-gray-100 rounded overflow-hidden">
                {activityGroups.map((group, idx) => {
                  const leftPosition = (group.startIdx / 6) * 100;
                  const width = (group.count / 6) * 100;

                  return (
                    <div
                      key={idx}
                      className="absolute h-full flex items-center justify-center text-[11px] font-medium text-white px-1 rounded-sm"
                      style={{
                        left: `${leftPosition}%`,
                        width: `calc(${width}% - 3px)`,
                        backgroundColor: hourLevel.color + 'DD',
                        marginRight: '3px'
                      }}
                      title={group.activity}
                    >
                      <span className="text-center truncate">
                        {group.activity}
                      </span>
                    </div>
                  );
                })}
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

      {/* Full Screen Modal - Rendered as Portal */}
      {selectedScreenshot && ReactDOM.createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => {
              setSelectedScreenshot(null);
              setSelectedScreenshotIndex(-1);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full h-full bg-white overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold">Screenshot Details</h3>
                  <span className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${(selectedScreenshot.mode === 'client' || selectedScreenshot.mode === 'client_hours')
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-emerald-100 text-emerald-700'}
                  `}>
                    {(selectedScreenshot.mode === 'client' || selectedScreenshot.mode === 'client_hours') ? 'CLIENT' : 'COMMAND'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(getTimestamp(selectedScreenshot)).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedScreenshot(null);
                    setSelectedScreenshotIndex(-1);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="h-[calc(100%-4rem)] flex">
                <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-auto relative">
                  <button
                    onClick={() => navigateScreenshot('prev')}
                    className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full shadow-lg transition-all hover:scale-110 z-10"
                    title="Previous screenshot (←)"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>

                  <button
                    onClick={() => navigateScreenshot('next')}
                    className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full shadow-lg transition-all hover:scale-110 z-10"
                    title="Next screenshot (→)"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 text-white rounded-full text-sm">
                    {selectedScreenshotIndex + 1} / {screenshots.length}
                  </div>

                  {loadingSignedUrl ? (
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <Loader className="w-8 h-8 animate-spin" />
                      <span>Loading image...</span>
                    </div>
                  ) : signedFullUrl ? (
                    <img
                      src={signedFullUrl}
                      alt="Full size screenshot"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center text-gray-400">
                      <span>Unable to load image</span>
                    </div>
                  )}
                </div>

                <div className="w-[400px] border-l bg-white overflow-y-auto">
                  <div className="p-4 border-b">
                    <h3 className="text-sm font-semibold mb-3">Activity Summary</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider">Overall Score</label>
                        <div className="flex items-center gap-3 mt-1">
                          {(() => {
                            const scoreOutOf10 = percentageToTenScale(selectedScreenshot.activityScore || 0);
                            const level = getActivityLevel(scoreOutOf10);
                            return (
                              <>
                                <div className="flex-1">
                                  <div className="bg-gray-200 rounded-full h-2">
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${(selectedScreenshot.activityScore || 0)}%`,
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
                        <label className="text-xs text-gray-500 uppercase tracking-wider">Date & Time</label>
                        <p className="text-sm font-medium mt-1">
                          {new Date(getTimestamp(selectedScreenshot)).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {new Date(getTimestamp(selectedScreenshot)).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            timeZoneName: 'short'
                          })}
                        </p>
                      </div>
                      {selectedScreenshot.userName && (
                        <div>
                          <label className="text-xs text-gray-500 uppercase tracking-wider">User</label>
                          <p className="text-sm font-medium mt-1">{selectedScreenshot.userName}</p>
                        </div>
                      )}
                      {selectedScreenshot.deviceInfo && (
                        <div>
                          <label className="text-xs text-gray-500 uppercase tracking-wider">Device</label>
                          <p className="text-sm font-medium mt-1">{selectedScreenshot.deviceInfo}</p>
                        </div>
                      )}
                      {getActivityName(selectedScreenshot) && (
                        <div>
                          <label className="text-xs text-gray-500 uppercase tracking-wider">Activity / Notes</label>
                          <p className="text-sm text-gray-700 mt-1">{getActivityName(selectedScreenshot)}</p>
                        </div>
                      )}
                      <div className="pt-2 border-t">
                        <label className="text-xs text-gray-500 uppercase tracking-wider">Screenshot ID</label>
                        <p className="text-xs text-gray-500 mt-1 font-mono break-all">{selectedScreenshot.id}</p>
                      </div>
                    </div>
                  </div>

                  {/* Per-Minute Activity Breakdown */}
                  <div className="p-4">
                    <h3 className="text-sm font-semibold mb-3">Per-Minute Activity Breakdown</h3>

                    {loadingActivityPeriods ? (
                      <div className="text-center py-4">
                        <Loader className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                        <p className="text-xs text-gray-500 mt-2">Loading metrics...</p>
                      </div>
                    ) : activityPeriods.length > 0 ? (
                      <div className="space-y-2">
                        {activityPeriods.map((period, index) => {
                          const scoreOutOf10 = percentageToTenScale(period.activityScore || 0);
                          const level = getActivityLevel(scoreOutOf10);
                          const periodEndTime = new Date(period.periodEnd).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          });

                          return (
                            <div key={period.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{periodEndTime}</span>
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
                                    {expandedMinutes.has(index) ? (
                                      <ChevronUp className="w-4 h-4 text-gray-500" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-gray-500" />
                                    )}
                                  </button>
                                </div>
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
                              </div>

                              {/* Expandable Details */}
                              <AnimatePresence>
                                {expandedMinutes.has(index) && period.metrics && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-3 pt-3 border-t space-y-3">
                                      {/* Keyboard Activity */}
                                      {period.metrics.keyboard && (
                                        <div className="flex items-start gap-2">
                                          <Keyboard className="w-4 h-4 text-gray-500 mt-0.5" />
                                          <div className="flex-1 text-xs">
                                            <div className="flex justify-between mb-1">
                                              <span className="text-gray-600">Keystrokes:</span>
                                              <span className="font-medium">{period.metrics.keyboard.totalKeystrokes}</span>
                                            </div>
                                            <div className="flex justify-between mb-1">
                                              <span className="text-gray-600">Unique Keys:</span>
                                              <span className="font-medium">{period.metrics.keyboard.uniqueKeys}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Productive Keys:</span>
                                              <span className="font-medium">{period.metrics.keyboard.productiveKeystrokes}</span>
                                            </div>
                                            {period.metrics.keyboard.typingRhythm && (
                                              <div className="mt-1 pt-1 border-t">
                                                <span className={`text-[10px] ${
                                                  period.metrics.keyboard.typingRhythm.consistent
                                                    ? 'text-green-600'
                                                    : 'text-yellow-600'
                                                }`}>
                                                  {period.metrics.keyboard.typingRhythm.consistent ? 'Consistent' : 'Irregular'} typing
                                                  (±{period.metrics.keyboard.typingRhythm.stdDeviationMs.toFixed(0)}ms)
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Mouse Activity */}
                                      {period.metrics.mouse && (
                                        <div className="flex items-start gap-2">
                                          <MousePointer className="w-4 h-4 text-gray-500 mt-0.5" />
                                          <div className="flex-1 text-xs">
                                            <div className="flex justify-between mb-1">
                                              <span className="text-gray-600">Clicks:</span>
                                              <span className="font-medium">{period.metrics.mouse.totalClicks}</span>
                                            </div>
                                            <div className="flex justify-between mb-1">
                                              <span className="text-gray-600">Scrolls:</span>
                                              <span className="font-medium">{period.metrics.mouse.totalScrolls}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Distance:</span>
                                              <span className="font-medium">{period.metrics.mouse.distancePixels}px</span>
                                            </div>
                                            {period.metrics.mouse.movementPattern && (
                                              <div className="mt-1 pt-1 border-t">
                                                <span className={`text-[10px] ${
                                                  period.metrics.mouse.movementPattern.smooth
                                                    ? 'text-green-600'
                                                    : 'text-yellow-600'
                                                }`}>
                                                  {period.metrics.mouse.movementPattern.smooth ? 'Smooth' : 'Erratic'} movement
                                                  (avg: {period.metrics.mouse.movementPattern.avgSpeed.toFixed(0)}px/s)
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Bot Detection - Only show if bot activity detected */}
                                      {period.metrics.botDetection && (period.metrics.botDetection.keyboardBotDetected || period.metrics.botDetection.mouseBotDetected) && (
                                        <div className="bg-orange-50 rounded p-2 border border-orange-200">
                                          <div className="flex items-center gap-2 mb-2">
                                            <AlertCircle className="w-4 h-4 text-orange-500" />
                                            <span className="text-xs font-medium">Bot Detection Analysis</span>
                                          </div>
                                          <div className="space-y-1 text-xs">
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Keyboard Bot:</span>
                                              <span className={period.metrics.botDetection.keyboardBotDetected ? 'text-red-600' : 'text-green-600'}>
                                                {period.metrics.botDetection.keyboardBotDetected ? 'Detected' : 'Human'}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Mouse Bot:</span>
                                              <span className={period.metrics.botDetection.mouseBotDetected ? 'text-red-600' : 'text-green-600'}>
                                                {period.metrics.botDetection.mouseBotDetected ? 'Detected' : 'Human'}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Confidence:</span>
                                              <span className="font-medium">{(period.metrics.botDetection.confidence * 100).toFixed(0)}%</span>
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
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No activity periods found for this screenshot
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}