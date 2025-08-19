import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Check, X, ArrowRightLeft, Trash2, Clock, Monitor, Maximize2 } from 'lucide-react';
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
  relatedPeriods?: {
    id: string;
    periodStart: Date;
    periodEnd: Date;
    activityScore: number;
  }[];
}

// Create a safe URL that avoids file:// protocol
function getSafeUrl(url: string): string {
  if (!url || url.startsWith('file://')) {
    // Return a data URL placeholder
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjIwMCIgeT0iMTEyLjUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOWNhM2FmIj5Mb2FkaW5nLi4uPC90ZXh0Pjwvc3ZnPg==';
  }
  return url;
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
                  onClick={() => setModalScreenshot(screenshot)}
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
                    <div className={`
                      px-2 py-1 rounded-full text-xs font-medium backdrop-blur
                      ${screenshot.activityScore >= 70 
                        ? 'bg-green-500/80 text-white' 
                        : screenshot.activityScore >= 40
                        ? 'bg-yellow-500/80 text-white'
                        : 'bg-red-500/80 text-white'
                      }
                    `}>
                      {screenshot.activityScore}%
                    </div>
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
              className="relative max-w-6xl max-h-[90vh] w-full bg-white rounded-xl overflow-hidden shadow-2xl"
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
              
              {/* Modal Body */}
              <div className="flex flex-col lg:flex-row h-full">
                {/* Screenshot Image */}
                <div className="flex-1 bg-gray-100 p-4 flex items-center justify-center overflow-auto">
                  <img
                    src={getSafeUrl(modalScreenshot.fullUrl)}
                    alt="Full size screenshot"
                    className="max-w-full h-auto rounded-lg shadow-lg"
                    onError={(e) => {
                      // Fallback to thumbnail if full URL fails
                      (e.target as HTMLImageElement).src = getSafeUrl(modalScreenshot.thumbnailUrl) || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjQwMCIgeT0iMjI1IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzljYTNhZiI+U2NyZWVuc2hvdCBVbmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
                    }}
                  />
                </div>
                
                {/* Activity Details */}
                <div className="w-full lg:w-80 p-4 border-t lg:border-t-0 lg:border-l bg-gray-50">
                  <h4 className="font-semibold mb-3">Activity Details</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Activity Score</label>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-full rounded-full ${
                              modalScreenshot.activityScore >= 70 
                                ? 'bg-green-500' 
                                : modalScreenshot.activityScore >= 40
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${modalScreenshot.activityScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{modalScreenshot.activityScore}%</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Time Captured</label>
                      <p className="mt-1 text-sm">{new Date(modalScreenshot.timestamp).toLocaleTimeString()}</p>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Notes</label>
                      <p className="mt-1 text-sm text-gray-700">
                        {modalScreenshot.notes || 'No notes available'}
                      </p>
                    </div>
                    
                    {modalScreenshot.activityPeriodId && (
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider">Period ID</label>
                        <p className="mt-1 text-xs font-mono text-gray-600">
                          {modalScreenshot.activityPeriodId.slice(0, 8)}...
                        </p>
                      </div>
                    )}
                    
                    {/* Per-minute activity breakdown */}
                    {modalScreenshot.relatedPeriods && modalScreenshot.relatedPeriods.length > 0 && (
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                          Activity Breakdown (Per Minute)
                        </label>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {modalScreenshot.relatedPeriods.map((period, index) => {
                            const periodTime = new Date(period.periodStart);
                            return (
                              <div key={period.id} className="flex items-center gap-2 text-xs">
                                <span className="text-gray-500 w-12">
                                  {periodTime.toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit'
                                  })}
                                </span>
                                <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                                  <div 
                                    className={`h-full rounded-full transition-all ${
                                      period.activityScore >= 70 
                                        ? 'bg-green-500' 
                                        : period.activityScore >= 40
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                    }`}
                                    style={{ width: `${period.activityScore}%` }}
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                                    {period.activityScore}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                          Average: {modalScreenshot.activityScore}% over {modalScreenshot.relatedPeriods.length} minute{modalScreenshot.relatedPeriods.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-3 space-y-2">
                      <button className="w-full px-3 py-2 text-sm rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">
                        Transfer to {modalScreenshot.mode === 'client' ? 'Command' : 'Client'} Hours
                      </button>
                      <button className="w-full px-3 py-2 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors">
                        Delete Screenshot
                      </button>
                    </div>
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