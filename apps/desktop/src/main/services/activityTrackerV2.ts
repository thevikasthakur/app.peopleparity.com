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
  
  // Activity tracking
  private currentMetrics: ActivityMetrics;
  private periodStartTime: Date;
  private lastActivityTime: Date;
  private activeSeconds: number = 0;
  
  // Timers
  private periodTimer: NodeJS.Timeout | null = null;
  private periodStartTimeout: NodeJS.Timeout | null = null;
  private activeTimeTimer: NodeJS.Timeout | null = null;
  
  // Keys configuration
  private productiveKeys: Set<number> = new Set();
  private navigationKeys: Set<number> = new Set();
  
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
            
            // Log if bot activity was detected
            if (period.metricsBreakdown?.botDetection?.keyboardBotDetected || 
                period.metricsBreakdown?.botDetection?.mouseBotDetected) {
              console.log(`⚠️ Bot activity detected in period ${dbPeriod.id}`);
            }
            
            console.log(`✅ Saved activity period ${dbPeriod.id} with metrics`);
          }
        }
        
        console.log(`✅ Window data saved: ${windowData.activityPeriods.length} periods, ${savedScreenshotId ? '1 screenshot' : 'no screenshot'}`);
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
    
    // End any existing session
    if (this.currentSessionId) {
      await this.stopSession();
    }
    
    // Create new session in database
    const session = await this.db.createSession({
      mode,
      projectId,
      task,
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
    this.isTracking = true;
    
    // Reset metrics
    this.currentMetrics = this.createEmptyMetrics();
    this.periodStartTime = new Date();
    this.lastActivityTime = new Date();
    this.activeSeconds = 0;
    
    // Start the window manager
    this.windowManager.startSession(session.id, currentUser.id, mode);
    
    // Start tracking
    this.startTracking();
    
    console.log(`✅ Session started: ${session.id}`);
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
    this.isTracking = false;
  }
  
  /**
   * Restore an existing session (e.g., after app restart)
   */
  restoreSession(sessionId: string, mode: 'client_hours' | 'command_hours', projectId?: string) {
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
    this.isTracking = true;
    
    // Reset metrics and collector
    this.currentMetrics = this.createEmptyMetrics();
    this.periodStartTime = new Date();
    this.lastActivityTime = new Date();
    this.activeSeconds = 0;
    this.metricsCollector.reset(); // Reset metrics collector
    
    // Start the window manager
    this.windowManager.startSession(sessionId, currentUser.id, mode);
    
    // Start tracking
    this.startTracking();
    
    console.log(`✅ Session restored: ${sessionId}`);
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
    
    if (this.periodStartTimeout) {
      clearTimeout(this.periodStartTimeout);
      this.periodStartTimeout = null;
    }
    
    if (this.activeTimeTimer) {
      clearInterval(this.activeTimeTimer);
      this.activeTimeTimer = null;
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
    
    uIOhook.on('keydown', (e: any) => {
      if (!this.isTracking) return;
      
      const keycode = e.keycode;
      const timestamp = Date.now();
      this.lastActivityTime = new Date();
      
      // Track unique keys
      this.currentMetrics.uniqueKeys.add(keycode);
      
      // Record in metrics collector for bot detection
      this.metricsCollector.recordKeystroke(keycode, timestamp);
      
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
   * Start the period timer (saves every minute)
   */
  private startPeriodTimer() {
    // Calculate time until next minute
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    
    console.log(`⏰ Period timer will start in ${msUntilNextMinute}ms`);
    
    // Wait until next minute boundary
    this.periodStartTimeout = setTimeout(() => {
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
    
    // Use the calculated score from detailed metrics
    const activityScore = detailedMetrics.scoreCalculation.finalScore;
    
    console.log(`\n📊 Saving period: ${this.periodStartTime.toISOString()} - ${periodEnd.toISOString()}`);
    console.log(`  Activity score: ${activityScore} (formula: ${detailedMetrics.scoreCalculation.formula})`);
    console.log(`  Keystrokes: ${this.currentMetrics.keyHits} (${this.currentMetrics.productiveKeyHits} productive)`);
    console.log(`  Mouse: ${this.currentMetrics.mouseClicks} clicks, ${Math.round(this.currentMetrics.mouseDistance)}px distance`);
    if (detailedMetrics.botDetection.keyboardBotDetected || detailedMetrics.botDetection.mouseBotDetected) {
      console.log(`  ⚠️ Bot activity detected: ${detailedMetrics.botDetection.details.join(', ')}`);
    }
    
    // Create activity period object with detailed metrics
    const period: ActivityPeriod = {
      id: crypto.randomUUID(),
      sessionId: this.currentSessionId,
      userId: this.currentUserId,
      periodStart: new Date(this.periodStartTime),
      periodEnd: periodEnd,
      mode: this.currentMode,
      activityScore,
      isValid: true,
      classification: detailedMetrics.classification.category,
      metricsBreakdown: detailedMetrics, // Add detailed metrics
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
    
    // Reset metrics for next period but keep metrics collector data
    this.currentMetrics = this.createEmptyMetrics();
    this.periodStartTime = new Date();
    this.activeSeconds = 0;
    // Note: We don't reset metricsCollector here as it maintains rolling windows
    
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
   * Calculate activity score based on metrics
   */
  private calculateActivityScore(): number {
    const minutesPassed = 1; // We save every minute
    
    // Calculate rates
    const keysPerMin = this.currentMetrics.productiveKeyHits / minutesPassed;
    const clicksPerMin = this.currentMetrics.mouseClicks / minutesPassed;
    const scrollsPerMin = this.currentMetrics.mouseScrolls / minutesPassed;
    const uniqueKeysPerMin = this.currentMetrics.uniqueKeys.size / minutesPassed;
    const mouseDistancePerMin = this.currentMetrics.mouseDistance / minutesPassed;
    
    // Calculate base score components (0-100 total)
    let baseScore = 0;
    
    // Keyboard activity (0-40 points)
    baseScore += Math.min(40, keysPerMin * 2.2);
    
    // Mouse clicks (0-20 points)
    baseScore += Math.min(20, clicksPerMin * 6);
    
    // Mouse movement (0-15 points)
    // Normal mouse movement is 1000-5000 pixels per minute
    baseScore += Math.min(15, mouseDistancePerMin / 200); // 3000px = 15 points
    
    // Scroll activity (0-10 points)
    baseScore += Math.min(10, scrollsPerMin * 3);
    
    // Key diversity (0-15 points)
    baseScore += Math.min(15, uniqueKeysPerMin * 3);
    
    // Base score capped at 100
    baseScore = Math.min(100, baseScore);
    
    // Mouse activity bonus (0-30 points) - Added ON TOP of base score
    // Award graduated bonus points for different levels of mouse activity
    let mouseBonus = 0;
    const totalMouseActivity = clicksPerMin + scrollsPerMin + (mouseDistancePerMin / 1000);
    
    // Apply graduated bonuses based on activity level (avoid suspicious levels > 50)
    if (totalMouseActivity < 50 && (clicksPerMin > 0 || mouseDistancePerMin > 500)) {
      if (totalMouseActivity > 20) {
        mouseBonus = 30; // Very high activity (30% bonus)
      } else if (totalMouseActivity > 15) {
        mouseBonus = 25; // High activity (25% bonus)
      } else if (totalMouseActivity > 10) {
        mouseBonus = 20; // Good activity (20% bonus)
      } else if (totalMouseActivity > 5) {
        mouseBonus = 15; // Moderate activity (15% bonus)
      } else if (totalMouseActivity > 2) {
        mouseBonus = 10; // Light activity (10% bonus)
      }
      
      // Add bonus on top of base score, but cap total at 100
      const finalScore = Math.min(100, baseScore + mouseBonus);
      return Math.round(finalScore);
    }
    
    return Math.round(baseScore);
  }
  
  /**
   * Classify activity based on score
   */
  private classifyActivity(score: number): string {
    if (score >= 80) return 'highly_active';
    if (score >= 60) return 'active';
    if (score >= 40) return 'moderate';
    if (score >= 20) return 'low';
    return 'idle';
  }
  
  /**
   * Get current activity score (real-time)
   */
  getCurrentActivityScore(): number {
    return this.calculateActivityScore();
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
}