/**
 * Activity Tracker V2 - Simplified and reliable activity tracking
 * 
 * This version uses the WindowManager for proper 10-minute window handling
 */

// Import uIOhook conditionally
let uIOhook: any;
let UiohookKey: any;
try {
  const uiohookModule = require('uiohook-napi');
  uIOhook = uiohookModule.uIOhook;
  UiohookKey = uiohookModule.UiohookKey;
  console.log('✅ uiohook-napi loaded successfully');
} catch (error: any) {
  console.warn('⚠️ uiohook-napi not available:', error?.message || 'Module not found');
  uIOhook = null;
  UiohookKey = null;
}

import { EventEmitter } from 'events';
import { powerMonitor } from 'electron';
import crypto from 'crypto';
import { DatabaseService } from './databaseService';
import { WindowManager, ActivityPeriod, Screenshot } from './windowManager';
import { MetricsCollector, DetailedActivityMetrics } from './metricsCollector';
import { getGlobalSpikeDetectorV2, resetGlobalSpikeDetectorV2, ActivityDataV2 } from '../utils/spikeDetectorV2';

interface ActivityMetrics {
  keyHits: number;
  productiveKeyHits: number;
  navigationKeyHits: number;
  uniqueKeys: Set<number>;
  productiveUniqueKeys: Set<number>;
  mouseClicks: number;
  rightClicks: number;
  doubleClicks: number;
  mouseScrolls: number;
  mouseDistance: number;
  lastMousePosition: { x: number; y: number } | null;
  activeSeconds: number;
}

// Global flag to track if uIOhook has been started
let globalUIOhookStarted = false;

export class ActivityTrackerV2 extends EventEmitter {
  private db: DatabaseService;
  private windowManager: WindowManager;
  private metricsCollector: MetricsCollector;
  
  // Session state
  private isTracking: boolean = false;
  private currentSessionId: string | null = null;
  private currentUserId: string | null = null;
  private currentMode: 'client_hours' | 'command_hours' = 'command_hours';
  private currentProjectId: string | undefined;
  private currentTask: string | undefined;
  private sessionStartDate: string | null = null; // UTC date in YYYY-MM-DD format
  
  // Activity tracking
  private currentMetrics: ActivityMetrics;
  private periodStartTime: Date;
  private lastActivityTime: Date;
  private activeSeconds: number = 0;

  // Per-minute keystroke tracking (resets every minute at 0th second)
  private currentMinuteKeystrokeCodes: number[] = [];
  private currentMinuteKeystrokeTimestamps: number[] = [];
  private currentMinuteStartTime: Date = new Date();
  
  // Timers
  private periodTimer: NodeJS.Timeout | null = null;
  private activeTimeTimer: NodeJS.Timeout | null = null;
  private dateChangeTimer: NodeJS.Timeout | null = null;
  
  // Keys configuration
  private productiveKeys: Set<number> = new Set();
  private navigationKeys: Set<number> = new Set();
  
  // Inactivity detection
  private consecutiveZeroActivityCount: number = 0;

  // Mouse movement throttling (CPU optimization)
  private lastMouseMoveTime: number = 0;
  private readonly MOUSE_MOVE_THROTTLE_MS: number = 50; // Only process mouse movements every 50ms

  constructor(db: DatabaseService) {
    super();
    this.db = db;
    this.windowManager = new WindowManager();
    this.metricsCollector = new MetricsCollector();
    this.currentMetrics = this.createEmptyMetrics();
    this.periodStartTime = new Date();
    this.lastActivityTime = new Date();
    
    this.initializeKeys();
    this.setupWindowManager();
  }
  
  private initializeKeys() {
    if (!UiohookKey) return;
    
    // Navigation keys
    this.navigationKeys = new Set([
      UiohookKey.Up, UiohookKey.Down, UiohookKey.Left, UiohookKey.Right,
      UiohookKey.PageUp, UiohookKey.PageDown, UiohookKey.Home, UiohookKey.End,
      UiohookKey.Shift, UiohookKey.Ctrl, UiohookKey.Alt, UiohookKey.Meta,
      UiohookKey.CapsLock, UiohookKey.NumLock, UiohookKey.ScrollLock,
      UiohookKey.Escape, UiohookKey.F1, UiohookKey.F2, UiohookKey.F3, UiohookKey.F4,
      UiohookKey.F5, UiohookKey.F6, UiohookKey.F7, UiohookKey.F8,
      UiohookKey.F9, UiohookKey.F10, UiohookKey.F11, UiohookKey.F12
    ]);
    
    // Productive keys (letters, numbers, punctuation)
    this.productiveKeys = new Set();
    
    // Add letters A-Z
    for (let i = UiohookKey.A; i <= UiohookKey.Z; i++) {
      this.productiveKeys.add(i);
    }
    
    // Add numbers 0-9
    for (let i = UiohookKey['0']; i <= UiohookKey['9']; i++) {
      this.productiveKeys.add(i);
    }
    
    // Add common productive keys
    this.productiveKeys.add(UiohookKey.Space);
    this.productiveKeys.add(UiohookKey.Enter);
    this.productiveKeys.add(UiohookKey.Tab);
    this.productiveKeys.add(UiohookKey.Backspace);
    this.productiveKeys.add(UiohookKey.Delete);
    this.productiveKeys.add(UiohookKey.Period);
    this.productiveKeys.add(UiohookKey.Comma);
    this.productiveKeys.add(UiohookKey.Semicolon);
    this.productiveKeys.add(UiohookKey.Quote);
    this.productiveKeys.add(UiohookKey.Slash);
    this.productiveKeys.add(UiohookKey.Backslash);
  }
  
  private setupWindowManager() {
    // Listen for window completion events
    this.windowManager.on('window:complete', async (windowData) => {
      console.log('\n📦 Window complete event received, saving to database...');
      
      try {
        // Check for inactivity based on RAW METRICS (not activityScore which is 0 placeholder)
        // Since score calculation moved to backend, we check actual input metrics
        let hasZeroActivity = false;

        if (windowData.activityPeriods.length > 0) {
          // Check if ANY period has actual activity (keystrokes, clicks, scrolls, mouse movement)
          const hasAnyActivity = windowData.activityPeriods.some((p: any) => {
            const metrics = p.metricsBreakdown;
            if (!metrics) return false;

            const keystrokes = metrics.keyboard?.totalKeystrokes || 0;
            const clicks = metrics.mouse?.totalClicks || 0;
            const scrolls = metrics.mouse?.totalScrolls || 0;
            const mouseDistance = metrics.mouse?.distancePixels || 0;

            // Consider active if any meaningful input detected
            return keystrokes > 0 || clicks > 0 || scrolls > 0 || mouseDistance > 100;
          });

          hasZeroActivity = !hasAnyActivity;

          if (hasZeroActivity) {
            console.log('⚠️ No raw activity metrics detected in any period');
          }
        } else if (windowData.screenshot) {
          // No activity periods but has screenshot = inactive
          hasZeroActivity = true;
        }
        
        // Track consecutive zero activity
        if (hasZeroActivity) {
          this.consecutiveZeroActivityCount++;
          console.log(`⚠️ Zero activity detected! Consecutive count: ${this.consecutiveZeroActivityCount}`);
          
          // Check if we have 2 consecutive 0-activity screenshots
          if (this.consecutiveZeroActivityCount >= 2) {
            console.log('🚨 2 consecutive zero-activity screenshots detected! Stopping tracker...');
            
            // Import and show the message
            const { getRandomInactivityMessage } = require('../utils/inactivityMessages');
            const message = getRandomInactivityMessage();
            
            // Emit event to show alert in renderer
            this.emit('inactivity:detected', message);
            
            // Stop the session
            setTimeout(() => {
              this.stopSession();
            }, 100); // Small delay to ensure message is shown
            
            return; // Don't save this window's data
          }
        } else {
          // Reset counter if activity detected
          this.consecutiveZeroActivityCount = 0;
        }
        
        // Save screenshot first if exists
        let savedScreenshotId: string | null = null;
        
        if (windowData.screenshot) {
          const dbScreenshot = await this.db.saveScreenshot({
            id: windowData.screenshot.id,  // Pass through the original ID
            sessionId: windowData.screenshot.sessionId,
            localPath: windowData.screenshot.localPath,
            thumbnailPath: windowData.screenshot.thumbnailPath || '',
            capturedAt: windowData.screenshot.capturedAt
          });
          
          if (dbScreenshot) {
            savedScreenshotId = (dbScreenshot as any).id;
            console.log(`✅ Saved screenshot ${savedScreenshotId}`);
          }
        }
        
        // Check if ALL periods in this window have bot activity detected
        const totalPeriods = windowData.activityPeriods.length;
        let botDetectedPeriods = 0;

        // Save activity periods with screenshot reference
        for (const period of windowData.activityPeriods) {
          const dbPeriod = await this.db.createActivityPeriod({
            id: period.id,
            sessionId: period.sessionId,
            userId: period.userId,
            screenshotId: savedScreenshotId,
            periodStart: period.periodStart,
            periodEnd: period.periodEnd,
            mode: period.mode,
            activityScore: period.activityScore,
            isValid: period.isValid,
            classification: period.classification,
            metricsBreakdown: period.metricsBreakdown // Include detailed metrics
          });

          if (dbPeriod) {
            // Save activity metrics
            if (period.commandHourData) {
              await this.db.saveCommandHourActivity(dbPeriod.id, period.commandHourData);
            } else if (period.clientHourData) {
              await this.db.saveClientHourActivity(dbPeriod.id, period.clientHourData);
            }

            // Count bot activity
            if (period.metricsBreakdown?.botDetection?.keyboardBotDetected ||
                period.metricsBreakdown?.botDetection?.mouseBotDetected) {
              botDetectedPeriods++;
              console.log(`⚠️ Bot activity detected in period ${dbPeriod.id}`);
            }

            console.log(`✅ Saved activity period ${dbPeriod.id} with metrics`);
          }
        }

        // Check if entire window (all periods) had bot activity
        if (totalPeriods > 0 && botDetectedPeriods === totalPeriods) {
          console.error(`🚨 FULL WINDOW BOT ACTIVITY DETECTED! All ${totalPeriods} periods flagged as bot activity.`);

          // Emit event to stop tracking and show message to user
          const { app } = require('electron');
          app.emit('bot-activity-full-window', {
            periodsCount: totalPeriods,
            timestamp: new Date()
          });

          // Stop the session after a small delay
          setTimeout(() => {
            console.log('🛑 Stopping session due to persistent bot activity detection');
            this.stopSession();
          }, 100);
        }

        console.log(`✅ Window data saved: ${windowData.activityPeriods.length} periods (${botDetectedPeriods} with bot activity), ${savedScreenshotId ? '1 screenshot' : 'no screenshot'}`);
      } catch (error) {
        console.error('❌ Error saving window data:', error);
      }
    });
  }
  
  /**
   * Start a new tracking session
   */
  async startSession(mode: 'client_hours' | 'command_hours', projectId?: string, task?: string) {
    console.log('\n🟢 Starting new tracking session...');

    // Validate that we have a task/activity name
    if (!task || task.trim().length === 0) {
      console.error('❌ Cannot start session without a task/activity name');
      throw new Error('Activity name is required to start a session');
    }

    // End any existing session
    if (this.currentSessionId) {
      await this.stopSession();
    }

    // Create new session in database
    const session = await this.db.createSession({
      mode,
      projectId,
      task: task.trim(), // Ensure task is trimmed
      startTime: new Date()
    });
    
    const currentUser = this.db.getCurrentUser();
    if (!currentUser) {
      throw new Error('No current user');
    }
    
    // Set session state
    this.currentSessionId = session.id;
    this.currentUserId = currentUser.id;
    this.currentMode = mode;
    this.currentProjectId = projectId;
    this.currentTask = task;
    this.sessionStartDate = this.getUTCDateString(new Date());
    this.isTracking = true;
    
    // Reset metrics and spike detector for new session
    this.currentMetrics = this.createEmptyMetrics();
    this.periodStartTime = new Date();
    resetGlobalSpikeDetectorV2(); // Reset spike history for new session
    this.lastActivityTime = new Date();
    this.activeSeconds = 0;
    this.consecutiveZeroActivityCount = 0; // Reset inactivity counter
    
    // Start the window manager
    this.windowManager.startSession(session.id, currentUser.id, mode);
    
    // Start tracking
    this.startTracking();
    
    this.emit('session:started', session);
    
    return session;
  }
  
  /**
   * Stop the current session
   */
  async stopSession() {
    if (!this.currentSessionId) return;
    
    console.log('\n🔴 Stopping tracking session...');
    
    // Save current period before stopping
    await this.savePeriodData();
    
    // Stop the window manager
    this.windowManager.stopSession();
    
    // Stop tracking
    this.stopTracking();
    
    // End session in database
    await this.db.endSession(this.currentSessionId);
    
    console.log(`✅ Session stopped: ${this.currentSessionId}`);
    this.emit('session:stopped', this.currentSessionId);
    
    // Reset state
    this.currentSessionId = null;
    this.currentUserId = null;
    this.currentProjectId = undefined;
    this.currentTask = undefined;
    this.sessionStartDate = null;
    this.isTracking = false;
  }
  
  /**
   * Restore an existing session (e.g., after app restart)
   */
  restoreSession(sessionId: string, mode: 'client_hours' | 'command_hours', projectId?: string, task?: string) {
    console.log('\n🔄 Restoring existing session:', sessionId);
    
    const currentUser = this.db.getCurrentUser();
    if (!currentUser) {
      console.error('No current user');
      return;
    }
    
    // Set session state
    this.currentSessionId = sessionId;
    this.currentUserId = currentUser.id;
    this.currentMode = mode;
    this.currentProjectId = projectId;
    this.currentTask = task;
    this.sessionStartDate = this.getUTCDateString(new Date());
    this.isTracking = true;
    
    // Reset metrics and collector
    this.currentMetrics = this.createEmptyMetrics();
    this.periodStartTime = new Date();
    this.lastActivityTime = new Date();
    this.activeSeconds = 0;
    this.metricsCollector.reset(); // Reset metrics collector

    // Reset per-minute tracking
    this.currentMinuteKeystrokeCodes = [];
    this.currentMinuteKeystrokeTimestamps = [];
    this.currentMinuteStartTime = new Date();
    
    // Start the window manager
    this.windowManager.startSession(sessionId, currentUser.id, mode);
    
    // Start tracking
    this.startTracking();
    
    console.log(`✅ Session restored: ${sessionId} (UTC date: ${this.sessionStartDate})`);
  }
  
  /**
   * Start all tracking mechanisms
   */
  private startTracking() {
    console.log('🚀 Starting activity tracking...');
    
    // Setup input tracking
    this.setupKeyboardTracking();
    this.setupMouseTracking();
    
    // Start uIOhook if not already started
    if (uIOhook && !globalUIOhookStarted) {
      try {
        uIOhook.start();
        globalUIOhookStarted = true;
        console.log('✅ uIOhook started');
      } catch (error) {
        console.error('❌ Failed to start uIOhook:', error);
      }
    }
    
    // Start period timer (saves every minute)
    this.startPeriodTimer();
    
    // Start active time tracking
    this.startActiveTimeTracking();
    
    // Start date change monitoring for UTC midnight rollover
    this.startDateChangeTimer();
  }
  
  /**
   * Stop all tracking mechanisms
   */
  private stopTracking() {
    console.log('🛑 Stopping activity tracking...');
    
    // Clear timers
    if (this.periodTimer) {
      clearInterval(this.periodTimer);
      this.periodTimer = null;
    }
    
    if (this.activeTimeTimer) {
      clearInterval(this.activeTimeTimer);
      this.activeTimeTimer = null;
    }
    
    if (this.dateChangeTimer) {
      clearTimeout(this.dateChangeTimer);
      this.dateChangeTimer = null;
    }
    
    // Note: We don't stop uIOhook as it's global
    this.isTracking = false;
  }
  
  /**
   * Setup keyboard tracking
   */
  private setupKeyboardTracking() {
    if (!uIOhook) return;

    // Remove existing listeners
    uIOhook.removeAllListeners('keydown');
    uIOhook.removeAllListeners('keyup');

    // Track key press/release for hold time detection
    const keyDownTimes = new Map<number, number>();

    uIOhook.on('keydown', (e: any) => {
      if (!this.isTracking) return;

      const keycode = e.keycode;
      const timestamp = Date.now();
      this.lastActivityTime = new Date();

      // Track key down time for hold duration
      if (!keyDownTimes.has(keycode)) {
        keyDownTimes.set(keycode, timestamp);
      }

      // Track unique keys
      this.currentMetrics.uniqueKeys.add(keycode);

      // Record in metrics collector for bot detection
      this.metricsCollector.recordKeystroke(keycode, timestamp);

      // Track per-minute keystrokes (for accurate bot detection without accumulation)
      this.trackPerMinuteKeystroke(keycode, timestamp);

      // Classify key
      if (this.productiveKeys.has(keycode)) {
        this.currentMetrics.productiveKeyHits++;
        this.currentMetrics.productiveUniqueKeys.add(keycode);
        this.currentMetrics.keyHits++;
      } else if (this.navigationKeys.has(keycode)) {
        this.currentMetrics.navigationKeyHits++;
        this.currentMetrics.keyHits++;
      } else {
        this.currentMetrics.keyHits++;
      }
    });

    uIOhook.on('keyup', (e: any) => {
      if (!this.isTracking) return;

      const keycode = e.keycode;
      const timestamp = Date.now();

      // Calculate hold duration
      const downTime = keyDownTimes.get(keycode);
      if (downTime) {
        const holdDuration = timestamp - downTime;
        this.metricsCollector.recordKeyHold(keycode, holdDuration);
        keyDownTimes.delete(keycode);
      }
    });
  }
  
  /**
   * Setup mouse tracking
   */
  private setupMouseTracking() {
    if (!uIOhook) return;
    
    // Remove existing listeners
    uIOhook.removeAllListeners('mousedown');
    uIOhook.removeAllListeners('wheel');
    uIOhook.removeAllListeners('mousemove');
    uIOhook.removeAllListeners('mouseup');
    
    let lastClickTime = 0;
    
    uIOhook.on('mousedown', (e: any) => {
      if (!this.isTracking) return;
      
      const timestamp = Date.now();
      this.lastActivityTime = new Date();
      
      // Record in metrics collector for bot detection
      this.metricsCollector.recordClick(timestamp);
      
      // Track click types
      if (e.button === 2) { // Right click
        this.currentMetrics.rightClicks++;
      } else if (e.button === 1) { // Left click
        this.currentMetrics.mouseClicks++;
        
        // Check for double click (within 500ms)
        if (timestamp - lastClickTime < 500) {
          this.currentMetrics.doubleClicks++;
        }
        lastClickTime = timestamp;
      }
    });
    
    uIOhook.on('wheel', () => {
      if (!this.isTracking) return;
      
      this.lastActivityTime = new Date();
      this.currentMetrics.mouseScrolls++;
    });
    
    uIOhook.on('mousemove', (e: any) => {
      if (!this.isTracking) return;

      const timestamp = Date.now();

      // Throttle mouse movement processing to reduce CPU load
      // Only process every MOUSE_MOVE_THROTTLE_MS (50ms)
      if (timestamp - this.lastMouseMoveTime < this.MOUSE_MOVE_THROTTLE_MS) {
        return; // Skip this event, too soon since last processed
      }
      this.lastMouseMoveTime = timestamp;

      // Record position for bot detection
      this.metricsCollector.recordMousePosition(e.x, e.y, timestamp);

      if (this.currentMetrics.lastMousePosition) {
        const distance = Math.sqrt(
          Math.pow(e.x - this.currentMetrics.lastMousePosition.x, 2) +
          Math.pow(e.y - this.currentMetrics.lastMousePosition.y, 2)
        );

        if (distance > 5 && distance < 1000) {
          this.currentMetrics.mouseDistance += distance;
          this.lastActivityTime = new Date();
        }
      }

      this.currentMetrics.lastMousePosition = { x: e.x, y: e.y };
    });
  }
  
  /**
   * Track keystrokes per minute (resets at 0th second of each minute)
   * This prevents data accumulation bug where keystrokes from previous minutes
   * were being included in subsequent minutes' bot detection analysis
   */
  private trackPerMinuteKeystroke(keycode: number, timestamp: number) {
    const now = new Date(timestamp);
    const currentMinute = now.getMinutes();
    const lastMinute = this.currentMinuteStartTime.getMinutes();

    // Check if we've crossed into a new minute (at 0th second)
    if (currentMinute !== lastMinute) {
      // Reset for new minute
      this.currentMinuteKeystrokeCodes = [];
      this.currentMinuteKeystrokeTimestamps = [];
      this.currentMinuteStartTime = now;
    }

    // Add current keystroke
    this.currentMinuteKeystrokeCodes.push(keycode);
    this.currentMinuteKeystrokeTimestamps.push(timestamp);

    // Prevent memory leaks - keep max 1000 keystrokes per minute
    if (this.currentMinuteKeystrokeCodes.length > 1000) {
      this.currentMinuteKeystrokeCodes.shift();
      this.currentMinuteKeystrokeTimestamps.shift();
    }
  }

  /**
   * Start the period timer (saves every minute)
   */
  private startPeriodTimer() {
    // Calculate time until next minute
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    
    console.log(`⏰ Period timer will start in ${msUntilNextMinute}ms`);
    
    // Wait until next minute boundary
    setTimeout(() => {
      // Save initial period
      this.savePeriodData();
      
      // Start regular interval
      this.periodTimer = setInterval(() => {
        this.savePeriodData();
      }, 60 * 1000); // Every minute
    }, msUntilNextMinute);
  }
  
  /**
   * Start active time tracking
   */
  private startActiveTimeTracking() {
    this.activeTimeTimer = setInterval(() => {
      const idleTime = powerMonitor.getSystemIdleTime();
      if (idleTime < 60) {
        this.activeSeconds++;
        this.currentMetrics.activeSeconds++; // Track in current metrics
      }
    }, 1000);
  }
  
  /**
   * Save period data (called every minute)
   */
  private async savePeriodData() {
    if (!this.currentSessionId || !this.currentUserId) return;
    
    // Verify session exists (don't require it to be active)
    // Sessions can become inactive when windows complete, but tracking should continue
    const activeSession = this.db.getActiveSession();
    if (!activeSession || activeSession.id !== this.currentSessionId) {
      console.log('⚠️ Session is no longer active in database, but continuing to track');
      // Don't stop tracking - the session might have been marked inactive by window completion
      // but we should continue collecting data
    }
    
    const periodEnd = new Date();
    const periodDuration = (periodEnd.getTime() - this.periodStartTime.getTime()) / 1000; // in seconds
    
    // Check for activity spikes before generating metrics
    const spikeDetector = getGlobalSpikeDetectorV2();
    const activityData: ActivityDataV2 = {
      keyHits: this.currentMetrics.keyHits,
      productiveKeyHits: this.currentMetrics.productiveKeyHits,
      navigationKeyHits: this.currentMetrics.navigationKeyHits,
      uniqueKeys: this.currentMetrics.uniqueKeys.size,
      keySequencePattern: undefined, // Will be analyzed by the detector
      mouseClicks: this.currentMetrics.mouseClicks,
      mouseScrolls: this.currentMetrics.mouseScrolls,
      mouseDistance: this.currentMetrics.mouseDistance,
      timestamp: periodEnd,
      hasTextPatterns: undefined, // Will be analyzed by the detector
      hasCodingPatterns: undefined, // Will be analyzed by the detector
      hasReadingPattern: undefined // Will be analyzed by the detector
    };
    
    const spikeDetectionResult = spikeDetector.addActivity(activityData);
    
    // Generate detailed metrics using MetricsCollector
    const detailedMetrics = this.metricsCollector.generateMetricsBreakdown(
      {
        keyHits: this.currentMetrics.keyHits,
        productiveKeyHits: this.currentMetrics.productiveKeyHits,
        navigationKeyHits: this.currentMetrics.navigationKeyHits,
        uniqueKeys: this.currentMetrics.uniqueKeys,
        productiveUniqueKeys: this.currentMetrics.productiveUniqueKeys,
        mouseClicks: this.currentMetrics.mouseClicks,
        rightClicks: this.currentMetrics.rightClicks,
        doubleClicks: this.currentMetrics.doubleClicks,
        mouseScrolls: this.currentMetrics.mouseScrolls,
        mouseDistance: this.currentMetrics.mouseDistance,
        activeSeconds: this.currentMetrics.activeSeconds
      },
      periodDuration
    );

    // CRITICAL FIX: Override keystrokeCodes with per-minute data to prevent accumulation bug
    // The metricsCollector accumulates keystrokes across the entire session, but we need
    // only THIS minute's keystrokes for accurate bot detection
    if (detailedMetrics.keyboard) {
      const metricsCollectorCount = (detailedMetrics.keyboard as any).keystrokeCodes?.length || 0;
      const perMinuteCount = this.currentMinuteKeystrokeCodes.length;

      console.log(`[Per-Minute Fix] MetricsCollector had ${metricsCollectorCount} codes, replacing with ${perMinuteCount} per-minute codes`);

      (detailedMetrics.keyboard as any).keystrokeCodes = [...this.currentMinuteKeystrokeCodes];
      (detailedMetrics.keyboard as any).keystrokeTimestamps = [...this.currentMinuteKeystrokeTimestamps];

      // IMPORTANT: Clear per-minute data after using it to prevent accumulation
      // Note: New keystrokes will still be added if they come in before the next reset
      this.currentMinuteKeystrokeCodes = [];
      this.currentMinuteKeystrokeTimestamps = [];
      this.currentMinuteStartTime = new Date();
    }
    
    // Score calculation moved to API server - desktop sends placeholder (0)
    // API will calculate score from raw metrics in metricsBreakdown
    const activityScore = 0; // Placeholder - API calculates real score

    console.log(`\n📊 Saving period: ${this.periodStartTime.toISOString()} - ${periodEnd.toISOString()}`);
    console.log(`  Activity score: calculated on server from raw metrics`);
    console.log(`  Keystrokes: ${this.currentMetrics.keyHits} (${this.currentMetrics.productiveKeyHits} productive)`);
    console.log(`  Mouse: ${this.currentMetrics.mouseClicks} clicks, ${Math.round(this.currentMetrics.mouseDistance)}px distance`);
    
    // Log bot detection from both sources
    if (spikeDetectionResult.hasSpike && !spikeDetectionResult.isBot) {
      console.log(`  🚨 Spike detected (score: ${spikeDetectionResult.spikeScore}, confidence: ${spikeDetectionResult.confidence}%): ${spikeDetectionResult.spikeReason}`);
      if (spikeDetectionResult.details) {
        console.log(`      Details:`, spikeDetectionResult.details);
      }
    }
    if (detailedMetrics.botDetection.keyboardBotDetected || detailedMetrics.botDetection.mouseBotDetected) {
      console.log(`  ⚠️ Pattern bot detected: ${detailedMetrics.botDetection.details.join(', ')}`);
    }
    
    // Add spike detection info to metrics breakdown
    const enhancedMetrics = {
      ...detailedMetrics,
      spikeDetection: {
        isBot: spikeDetectionResult.isBot,
        hasSpike: spikeDetectionResult.hasSpike,
        spikeScore: spikeDetectionResult.spikeScore,
        confidence: spikeDetectionResult.confidence,
        spikeReason: spikeDetectionResult.spikeReason,
        details: spikeDetectionResult.details
      }
    };
    
    // Create activity period object with detailed metrics
    const period: ActivityPeriod = {
      id: crypto.randomUUID(),
      sessionId: this.currentSessionId,
      userId: this.currentUserId,
      periodStart: new Date(this.periodStartTime),
      periodEnd: periodEnd,
      mode: this.currentMode,
      activityScore,
      isValid: !(spikeDetectionResult.isBot && spikeDetectionResult.confidence >= 60), // Mark invalid only if confident bot detection
      classification: spikeDetectionResult.isBot ? 'bot' : detailedMetrics.classification.category,
      metricsBreakdown: enhancedMetrics, // Add enhanced metrics with spike detection
      commandHourData: this.currentMode === 'command_hours' ? {
        uniqueKeys: this.currentMetrics.uniqueKeys.size,
        productiveKeyHits: this.currentMetrics.productiveKeyHits,
        mouseClicks: this.currentMetrics.mouseClicks,
        mouseScrolls: this.currentMetrics.mouseScrolls,
        mouseDistance: Math.round(this.currentMetrics.mouseDistance)
      } : undefined
    };
    
    // Add to current window
    this.windowManager.addActivityPeriod(period);

    // Reset metrics for next period
    this.currentMetrics = this.createEmptyMetrics();
    this.periodStartTime = new Date();
    this.activeSeconds = 0;

    // Note: We don't reset metricsCollector here as it maintains rolling windows
    // Instead, we use per-minute keystroke tracking (currentMinuteKeystrokeCodes)
    // which automatically resets at the 0th second of each minute
    
    // Get window info
    const windowInfo = this.windowManager.getCurrentWindowInfo();
    if (windowInfo) {
      console.log(`  Window: ${windowInfo.activityPeriodCount} periods collected`);
    }
  }
  
  /**
   * Store a screenshot (called by ScreenshotService)
   */
  async storeScreenshot(screenshotData: {
    id: string;
    userId: string;
    sessionId: string;
    localPath: string;
    thumbnailPath?: string;
    capturedAt: Date;
    mode: 'client_hours' | 'command_hours';
    notes?: string;
  }) {
    const screenshot: Screenshot = {
      id: screenshotData.id,
      sessionId: screenshotData.sessionId,
      userId: screenshotData.userId,
      localPath: screenshotData.localPath,
      thumbnailPath: screenshotData.thumbnailPath,
      capturedAt: screenshotData.capturedAt,
      mode: screenshotData.mode,
      notes: screenshotData.notes
    };
    
    // Check if there's an active window
    const windowInfo = this.windowManager.getCurrentWindowInfo();
    if (windowInfo) {
      // Add to current window
      this.windowManager.setScreenshot(screenshot);
      console.log(`📷 Screenshot stored for current window`);
    } else {
      // No active window, save directly to database
      console.log(`⚠️ No active window, saving screenshot directly to database`);
      
      // Save screenshot to database (don't pass TEMP sessionId)
      const savedScreenshot = await this.db.saveScreenshot({
        id: screenshotData.id,  // Pass through the original ID
        sessionId: screenshotData.sessionId.startsWith('TEMP-') ? undefined : screenshotData.sessionId,
        localPath: screenshotData.localPath,
        thumbnailPath: screenshotData.thumbnailPath || '',
        capturedAt: screenshotData.capturedAt,
        notes: screenshotData.notes  // Pass the notes from the session
      });
      
      if (savedScreenshot) {
        console.log(`✅ Screenshot saved directly to database: ${(savedScreenshot as any).id}`);
      }
    }
  }
  
  /**
   * Get current activity score (real-time)
   * @deprecated Score is now calculated on the API server
   */
  getCurrentActivityScore(): number {
    return 0; // Score calculated on API server
  }
  
  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }
  
  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): ActivityMetrics {
    return {
      keyHits: 0,
      productiveKeyHits: 0,
      navigationKeyHits: 0,
      uniqueKeys: new Set(),
      productiveUniqueKeys: new Set(),
      mouseClicks: 0,
      rightClicks: 0,
      doubleClicks: 0,
      mouseScrolls: 0,
      mouseDistance: 0,
      lastMousePosition: null,
      activeSeconds: 0
    };
  }
  
  /**
   * Get UTC date string in YYYY-MM-DD format
   */
  private getUTCDateString(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  /**
   * Start the date change timer to check for UTC midnight rollover
   */
  private startDateChangeTimer() {
    // Calculate time until next UTC midnight
    const now = new Date();
    const tomorrow = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0, 0
    ));
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    console.log(`⏰ Date change timer will trigger in ${Math.round(msUntilMidnight / 1000)} seconds (at UTC midnight)`);
    
    // Set timer for UTC midnight
    this.dateChangeTimer = setTimeout(async () => {
      await this.handleDateChange();
      
      // Set up the next timer for tomorrow midnight
      this.startDateChangeTimer();
    }, msUntilMidnight);
  }
  
  /**
   * Handle UTC date change - stop session at midnight
   */
  private async handleDateChange() {
    if (!this.isTracking || !this.currentSessionId) return;

    const newDate = this.getUTCDateString(new Date());

    // Check if date actually changed
    if (this.sessionStartDate === newDate) {
      return; // No date change
    }

    console.log(`\n🌐 UTC Date changed from ${this.sessionStartDate} to ${newDate}`);
    console.log('📅 Auto-stopping session at midnight...');

    // Save any pending period data
    await this.savePeriodData();

    // Stop current session
    await this.stopSession();

    console.log(`✅ Session stopped at UTC midnight.`);

    // Emit event to notify UI
    this.emit('session:midnight-stop', {
      previousDate: this.sessionStartDate,
      newDate: newDate,
      message: 'Arre yaar! It\'s a new date already! Your tracker session has ended automatically. Get some rest and start fresh with a new session.'
    });
  }

  /**
   * Pause tracking temporarily (keeps session active)
   */
  public pauseTracking() {
    if (!this.isTracking) {
      console.log('⚠️ Tracking is not active, cannot pause');
      return;
    }

    console.log('⏸ Pausing tracking...');

    // Save current period data before pausing
    this.savePeriodData();

    // Stop tracking mechanisms but keep session active
    this.stopTracking();

    // Mark as not tracking but keep session
    this.isTracking = false;

    this.emit('tracking:paused', this.currentSessionId);
  }

  /**
   * Resume tracking after pause
   */
  public resumeTracking() {
    if (!this.currentSessionId) {
      console.log('⚠️ No active session to resume');
      return;
    }

    if (this.isTracking) {
      console.log('⚠️ Tracking is already active');
      return;
    }

    console.log('▶️ Resuming tracking...');

    // Restart tracking mechanisms
    this.startTracking();

    // Mark as tracking
    this.isTracking = true;

    this.emit('tracking:resumed', this.currentSessionId);
  }
}