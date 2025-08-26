import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Check, X, ArrowRightLeft, Trash2, Clock, Monitor, Maximize2, Activity, MousePointer, Keyboard, AlertCircle, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Screenshot {
  id: string;
  thumbnailUrl: string;
  fullUrl: string;
  timestamp: Date;
  notes?: string;
  mode: 'client' | 'command';
  activityScore: number;
  activityPeriodId?: string;
  activityPeriodIds?: string[];
  relatedPeriods?: {
    id: string;
    periodStart: Date;
    periodEnd: Date;
    activityScore: number;
    metricsBreakdown?: any;
  }[];
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
      {Object.entries(hourGroups).map(([hour, hourScreenshots]) => (
        <div key={hour} className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="font-medium">{hour}</span>
            <span className="text-gray-400">({hourScreenshots.filter(s => s !== null).length} captures)</span>
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
                  
                  {/* Selection Checkbox */}
                  <button
                    className={`
                      absolute top-2 left-2 w-6 h-6 rounded-full
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
                  
                  {/* Mode Badge */}
                  <div className="absolute bottom-2 left-2">
                    <div className={`
                      px-2 py-1 rounded text-xs font-medium backdrop-blur
                      ${screenshot.mode === 'client' 
                        ? 'bg-indigo-500/80 text-white' 
                        : 'bg-emerald-500/80 text-white'
                      }
                    `}>
                      {screenshot.mode === 'client' ? 'CLIENT' : 'CMD'}
                    </div>
                  </div>
                  
                  {/* Hover Actions */}
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center gap-2"
                    >
                      <button
                        className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Transfer mode');
                        }}
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Delete');
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
      
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
          <button className="px-3 py-1 text-sm rounded bg-indigo-500 text-white hover:bg-indigo-600">
            Transfer to Client
          </button>
          <button className="px-3 py-1 text-sm rounded bg-emerald-500 text-white hover:bg-emerald-600">
            Transfer to Command
          </button>
          <button className="px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600">
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
                      <div className="flex justify-between">
                        <div>
                          <label className="text-xs text-gray-500 uppercase tracking-wider">Time</label>
                          <p className="text-sm font-medium mt-1">{new Date(modalScreenshot.timestamp).toLocaleTimeString()}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 uppercase tracking-wider">Mode</label>
                          <p className="text-sm font-medium mt-1">{modalScreenshot.mode === 'client' ? 'Client' : 'Command'}</p>
                        </div>
                      </div>
                      {modalScreenshot.notes && (
                        <div>
                          <label className="text-xs text-gray-500 uppercase tracking-wider">Notes</label>
                          <p className="text-sm text-gray-700 mt-1">{modalScreenshot.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                    
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
                        {detailedMetrics.map((metrics, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Minute {index + 1}</span>
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
                                  title="Show details"
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
                                    <span className="text-gray-600">Keys/min:</span>
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
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No activity data available</p>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="p-4 border-t mt-auto">
                    <button className="w-full px-3 py-2 text-sm rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors mb-2">
                      Transfer to {modalScreenshot.mode === 'client' ? 'Command' : 'Client'} Hours
                    </button>
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
    </div>
  );
}