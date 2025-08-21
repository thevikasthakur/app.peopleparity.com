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

interface ActivityMetrics {
  keyHits: number;
  productiveKeyHits: number;
  uniqueKeys: Set<number>;
  mouseClicks: number;
  mouseScrolls: number;
  mouseDistance: number;
  lastMousePosition: { x: number; y: number } | null;
}

// Global flag to track if uIOhook has been started
let globalUIOhookStarted = false;

export class ActivityTrackerV2 extends EventEmitter {
  private db: DatabaseService;
  private windowManager: WindowManager;
  
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
  private activeTimeTimer: NodeJS.Timeout | null = null;
  
  // Keys configuration
  private productiveKeys: Set<number> = new Set();
  private navigationKeys: Set<number> = new Set();
  
  constructor(db: DatabaseService) {
    super();
    this.db = db;
    this.windowManager = new WindowManager();
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
            classification: period.classification
          });
          
          if (dbPeriod) {
            // Save activity metrics
            if (period.commandHourData) {
              await this.db.saveCommandHourActivity(dbPeriod.id, period.commandHourData);
            } else if (period.clientHourData) {
              await this.db.saveClientHourActivity(dbPeriod.id, period.clientHourData);
            }
            console.log(`✅ Saved activity period ${dbPeriod.id}`);
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
    
    // Reset metrics
    this.currentMetrics = this.createEmptyMetrics();
    this.periodStartTime = new Date();
    this.lastActivityTime = new Date();
    this.activeSeconds = 0;
    
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
      this.lastActivityTime = new Date();
      
      // Track unique keys
      this.currentMetrics.uniqueKeys.add(keycode);
      
      // Classify key
      if (this.productiveKeys.has(keycode)) {
        this.currentMetrics.productiveKeyHits++;
        this.currentMetrics.keyHits++;
      } else if (!this.navigationKeys.has(keycode)) {
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
    
    uIOhook.on('mousedown', (e: any) => {
      if (!this.isTracking) return;
      
      this.lastActivityTime = new Date();
      this.currentMetrics.mouseClicks++;
    });
    
    uIOhook.on('wheel', () => {
      if (!this.isTracking) return;
      
      this.lastActivityTime = new Date();
      this.currentMetrics.mouseScrolls++;
    });
    
    uIOhook.on('mousemove', (e: any) => {
      if (!this.isTracking) return;
      
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
      }
    }, 1000);
  }
  
  /**
   * Save period data (called every minute)
   */
  private async savePeriodData() {
    if (!this.currentSessionId || !this.currentUserId) return;
    
    const periodEnd = new Date();
    const activityScore = this.calculateActivityScore();
    
    console.log(`\n📊 Saving period: ${this.periodStartTime.toISOString()} - ${periodEnd.toISOString()}`);
    console.log(`  Activity score: ${activityScore}`);
    console.log(`  Keystrokes: ${this.currentMetrics.keyHits}, Clicks: ${this.currentMetrics.mouseClicks}`);
    
    // Create activity period object
    const period: ActivityPeriod = {
      id: crypto.randomUUID(),
      sessionId: this.currentSessionId,
      userId: this.currentUserId,
      periodStart: new Date(this.periodStartTime),
      periodEnd: periodEnd,
      mode: this.currentMode,
      activityScore,
      isValid: true,
      classification: this.classifyActivity(activityScore),
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
    
    // Get window info
    const windowInfo = this.windowManager.getCurrentWindowInfo();
    if (windowInfo) {
      console.log(`  Window: ${windowInfo.activityPeriodCount} periods collected`);
    }
  }
  
  /**
   * Store a screenshot (called by ScreenshotService)
   */
  storeScreenshot(screenshotData: {
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
    
    this.windowManager.setScreenshot(screenshot);
    console.log(`📷 Screenshot stored for current window`);
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
    
    // Calculate score components
    let score = 0;
    
    // Keyboard activity (0-40 points)
    score += Math.min(40, keysPerMin * 2);
    
    // Mouse activity (0-20 points)
    score += Math.min(20, clicksPerMin * 5);
    
    // Scroll activity (0-10 points)
    score += Math.min(10, scrollsPerMin * 2);
    
    // Key diversity (0-20 points)
    score += Math.min(20, uniqueKeysPerMin * 4);
    
    // Active time bonus (0-10 points)
    const activePercentage = (this.activeSeconds / 60) * 100;
    score += Math.min(10, activePercentage / 10);
    
    return Math.min(100, Math.round(score));
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
      uniqueKeys: new Set(),
      mouseClicks: 0,
      mouseScrolls: 0,
      mouseDistance: 0,
      lastMousePosition: null
    };
  }
}