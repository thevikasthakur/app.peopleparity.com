// Import uIOhook conditionally
let uIOhook: any;
let UiohookKey: any;
try {
  const uiohookModule = require('uiohook-napi');
  uIOhook = uiohookModule.uIOhook;
  UiohookKey = uiohookModule.UiohookKey;
  console.log('uiohook-napi loaded successfully');
} catch (error: any) {
  console.warn('uiohook-napi not available:', error?.message || 'Module not found');
  console.warn('Activity tracking will not work without uiohook-napi');
  uIOhook = null;
  UiohookKey = null;
}

import crypto from 'crypto';

import activeWin from 'active-win';
import { DatabaseService } from './databaseService';
import { EventEmitter } from 'events';
import { powerMonitor } from 'electron';

interface ActivityMetrics {
  keyHits: number;
  productiveKeyHits: number;
  navigationKeyHits: number;
  uniqueKeys: Set<number>;
  productiveUniqueKeys: Set<number>;
  mouseClicks: number;
  rightClicks: number;
  mouseScrolls: number;
  mouseDistance: number;
  lastMousePosition: { x: number; y: number } | null;
}

interface MemoryActivityPeriod {
  id: string;
  sessionId: string;
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  mode: 'client_hours' | 'command_hours';
  activityScore: number;
  isValid: boolean;
  classification?: string;
  metrics: ActivityMetrics;
  vsCodeData?: any;
  commandHourData?: any;
  clientHourData?: any;
}

interface MemoryScreenshot {
  id: string;
  userId: string;
  sessionId: string;
  localPath: string;
  thumbnailPath?: string;
  capturedAt: Date;
  mode: 'client_hours' | 'command_hours';
  notes?: string;
  windowStart: Date;  // Start of the 10-minute window
  windowEnd: Date;    // End of the 10-minute window
}

// Global flag to prevent multiple uIOhook instances
let globalUIOhookStarted = false;

export class ActivityTracker extends EventEmitter {
  private isTracking = false;
  private currentMode: 'client_hours' | 'command_hours' = 'command_hours';
  private currentSessionId: string | null = null;
  private currentProjectId: string | null = null;
  private metrics: ActivityMetrics;
  private periodStartTime: Date;
  private sessionStartTime: Date | null = null;
  private vsCodeExtensionData: any = {};
  private idleTimer: NodeJS.Timeout | null = null;
  private periodTimer: NodeJS.Timeout | null = null;
  private lastActivityTime: Date = new Date();
  private activeSeconds: number = 0;
  private activeTimeInterval: NodeJS.Timeout | null = null;
  
  // Memory storage for activity periods and screenshots
  private memoryActivityPeriods: Map<string, MemoryActivityPeriod> = new Map();
  private memoryScreenshots: Map<string, MemoryScreenshot> = new Map();
  private windowCompletionTimer: NodeJS.Timeout | null = null;
  private currentWindowEnd: Date | null = null;
  private savedWindows: Set<string> = new Set();
  
  // Bot detection
  private keyTimestamps: number[] = [];
  private clickTimestamps: number[] = [];
  private lastKeyCode: number | null = null;
  private repeatedKeyCount: number = 0;
  private suspiciousActivityScore: number = 0;
  
  // Non-productive keys to ignore or count less
  private navigationKeys: Set<number> = new Set();
  private productiveKeys: Set<number> = new Set();
  
  constructor(private db: DatabaseService) {
    super();
    this.metrics = this.resetMetrics();
    this.periodStartTime = new Date();
    this.initializeKeySets();
  }
  
  private initializeKeySets() {
    if (!UiohookKey) {
      console.error('UiohookKey is not available! Cannot initialize key sets.');
      return;
    }
    
    console.log('Initializing key sets with UiohookKey values:');
    console.log('  UiohookKey.A =', UiohookKey.A);
    console.log('  UiohookKey.Z =', UiohookKey.Z);
    console.log('  UiohookKey.0 =', UiohookKey['0']);
    console.log('  UiohookKey.9 =', UiohookKey['9']);
    console.log('  UiohookKey.Space =', UiohookKey.Space);
    console.log('  UiohookKey.Enter =', UiohookKey.Enter);
    
    // Navigation keys - count with reduced weight
    this.navigationKeys = new Set([
      UiohookKey.ArrowUp, UiohookKey.ArrowDown, UiohookKey.ArrowLeft, UiohookKey.ArrowRight,
      UiohookKey.Home, UiohookKey.End, UiohookKey.PageUp, UiohookKey.PageDown,
      UiohookKey.Shift, UiohookKey.ShiftRight,
      UiohookKey.Ctrl, UiohookKey.CtrlRight,
      UiohookKey.Alt, UiohookKey.AltRight,
      UiohookKey.Meta, UiohookKey.MetaRight,
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
    console.log(`  Added ${UiohookKey.Z - UiohookKey.A + 1} letter keys to productive set`);
    
    // Add numbers 0-9
    for (let i = UiohookKey['0']; i <= UiohookKey['9']; i++) {
      this.productiveKeys.add(i);
    }
    console.log(`  Added number keys to productive set`);
    
    // Add common punctuation and productive keys
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
    this.productiveKeys.add(UiohookKey.Minus);
    this.productiveKeys.add(UiohookKey.Equal);
    this.productiveKeys.add(UiohookKey.LeftBracket);
    this.productiveKeys.add(UiohookKey.RightBracket);
    
    console.log(`Total productive keys: ${this.productiveKeys.size}`);
    console.log(`Total navigation keys: ${this.navigationKeys.size}`);
  }
  
  // Method to restore an existing session (e.g., after app restart)
  restoreSession(sessionId: string, mode: 'client_hours' | 'command_hours', projectId?: string) {
    console.log('Restoring existing session:', { sessionId, mode, projectId });
    this.currentSessionId = sessionId;
    this.currentMode = mode;
    this.currentProjectId = projectId || null;
    this.sessionStartTime = new Date();
    this.periodStartTime = new Date();
    this.metrics = this.resetMetrics();
    
    // Clear any existing memory when restoring
    this.memoryActivityPeriods.clear();
    this.memoryScreenshots.clear();
    if (this.windowCompletionTimer) {
      clearTimeout(this.windowCompletionTimer);
      this.windowCompletionTimer = null;
    }
    
    // Start tracking if not already started
    if (!this.isTracking) {
      this.start();
    }
    
    // Schedule the current window completion
    const now = new Date();
    const currentMinute = now.getMinutes();
    const windowEndMinute = Math.ceil(currentMinute / 10) * 10;
    const windowEnd = new Date(now);
    windowEnd.setMinutes(windowEndMinute % 60);  // Handle hour rollover
    if (windowEndMinute >= 60) {
      windowEnd.setHours(windowEnd.getHours() + Math.floor(windowEndMinute / 60));
    }
    windowEnd.setSeconds(0);
    windowEnd.setMilliseconds(0);
    console.log(`Session restored at ${now.toISOString()}, scheduling window completion for ${windowEnd.toISOString()}`);
    this.scheduleWindowCompletion(windowEnd);
  }
  
  start() {
    if (this.isTracking) {
      console.log('⚠️ Activity tracker already running - not starting again');
      return;
    }
    
    console.log('🟢 Starting activity tracker...');
    console.log(`   Current metrics BEFORE start:`, {
      productiveKeyHits: this.metrics.productiveKeyHits,
      keyHits: this.metrics.keyHits,
      uniqueKeys: this.metrics.uniqueKeys.size
    });
    
    this.isTracking = true;
    this.lastActivityTime = new Date();
    
    this.setupKeyboardTracking();
    this.setupMouseTracking();
    this.startPeriodTimer();
    this.startIdleDetection();
    this.startActiveTimeTracking();
    
    console.log('✅ Activity tracker started successfully');
  }
  
  stop() {
    console.log('🔴 Stopping activity tracker...');
    console.log(`   Current metrics BEFORE stop:`, {
      productiveKeyHits: this.metrics.productiveKeyHits,
      keyHits: this.metrics.keyHits,
      uniqueKeys: this.metrics.uniqueKeys.size
    });
    
    this.isTracking = false;
    
    // Don't stop uIOhook here - keep it running globally
    // Just stop tracking by setting isTracking = false
    console.log('🛑 Activity tracking stopped (uIOhook still running globally)');
    
    // Clear the period timer
    if (this.periodTimer) {
      clearInterval(this.periodTimer);
      this.periodTimer = null;
    }
    
    // Clear the idle timer
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }
    
    // Clear active time interval
    if (this.activeTimeInterval) {
      clearInterval(this.activeTimeInterval);
      this.activeTimeInterval = null;
    }
    
    // Clear window completion timer
    if (this.windowCompletionTimer) {
      clearTimeout(this.windowCompletionTimer);
      this.windowCompletionTimer = null;
    }
    
    this.currentWindowEnd = null;
    
    // Clear saved windows set when session ends
    this.savedWindows.clear();
    
    console.log('Activity tracker stopped');
  }
  
  private setupKeyboardTracking() {
    console.log('Setting up keyboard tracking...');
    
    if (!uIOhook || !UiohookKey) {
      console.log('uIOhook not available - keyboard tracking disabled');
      console.error('IMPORTANT: Install uiohook-napi and grant accessibility permissions for activity tracking');
      return;
    }
    
    // Remove all existing listeners first to prevent duplicates
    uIOhook.removeAllListeners('keydown');
    uIOhook.removeAllListeners('mousedown');
    uIOhook.removeAllListeners('wheel');
    uIOhook.removeAllListeners('mousemove');
    
    console.log('Removed all existing uIOhook listeners');
    
    // Set up new listener
    uIOhook.on('keydown', (e: any) => {
      if (!this.isTracking) {
        console.log(`❌ Ignoring keydown - not tracking`);
        return;
      }
      
      const now = Date.now();
      const keycode = e.keycode;
      
      // DEBUG: Log EVERY keystroke with stack trace to find source
      console.log(`\n🔑 REAL KEYDOWN EVENT:`);
      console.log(`   keycode: ${keycode}`);
      console.log(`   rawcode: ${e.rawcode}`);
      console.log(`   time: ${now}`);
      console.log(`   tracking: ${this.isTracking}`);
      console.log(`   sessionId: ${this.currentSessionId}`);
      console.log(`   BEFORE - productiveKeyHits: ${this.metrics.productiveKeyHits}`);
      
      // Check if this is a productive key
      const isProductiveKey = this.productiveKeys.has(keycode);
      const isNavigationKey = this.navigationKeys.has(keycode);
      
      console.log(`   Key type: productive=${isProductiveKey}, navigation=${isNavigationKey}`);
      
      // Bot detection: Check for suspicious patterns
      this.detectBotActivity(keycode, now);
      
      // Only count productive keys fully, navigation keys get reduced weight
      if (isProductiveKey) {
        this.metrics.productiveKeyHits++;
        this.metrics.keyHits++;
        this.metrics.uniqueKeys.add(keycode);
        this.metrics.productiveUniqueKeys.add(keycode);
        console.log(`   ✅ PRODUCTIVE KEY - AFTER: ${this.metrics.productiveKeyHits}`);
      } else if (!isNavigationKey) {
        // Semi-productive keys (like punctuation not in our list)
        this.metrics.keyHits++;
        this.metrics.uniqueKeys.add(keycode);
        console.log(`   ➕ SEMI-PRODUCTIVE KEY`);
      } else {
        // Navigation keys - count but with very reduced weight
        this.metrics.navigationKeyHits++;
        // Only count 1 out of every 10 navigation keys toward total
        if (this.metrics.navigationKeyHits % 10 === 0) {
          this.metrics.keyHits++;
        }
        console.log(`   ➡️ NAVIGATION KEY - Total nav: ${this.metrics.navigationKeyHits}`);
      }
      
      this.lastActivityTime = new Date();
      
      // Log summary every keystroke for debugging
      console.log(`📊 CURRENT TOTALS: Productive=${this.metrics.productiveKeyHits}, Total=${this.metrics.keyHits}, Unique=${this.metrics.uniqueKeys.size}`);
    });
    
    // Start uIOhook if not already started
    try {
      // Check if uIOhook is already running globally
      if (globalUIOhookStarted) {
        console.log('⚠️ uIOhook already started globally - not starting again');
      } else {
        console.log('🚀 Attempting to start uIOhook for the first time...');
        uIOhook.start();
        globalUIOhookStarted = true;
        console.log('✅ uIOhook.start() called successfully');
      }
      
      // Check for macOS accessibility permissions
      if (process.platform === 'darwin') {
        try {
          const { systemPreferences } = require('electron');
          if (systemPreferences && systemPreferences.isTrustedAccessibilityClient) {
            const hasPermission = systemPreferences.isTrustedAccessibilityClient(false);
            if (!hasPermission) {
              console.warn('⚠️ WARNING: Accessibility permissions not granted!');
              console.warn('   Keyboard and mouse tracking will NOT work.');
              console.warn('   Please grant accessibility permissions to this app in System Preferences.');
              console.warn('   Go to: System Preferences > Security & Privacy > Privacy > Accessibility');
            } else {
              console.log('✅ Accessibility permissions granted');
            }
          }
        } catch (e) {
          console.log('Could not check accessibility permissions:', e);
        }
      }
    } catch (error) {
      console.error('Failed to start uIOhook:', error);
      console.error('Activity tracking will not work without proper permissions');
    }
  }
  
  private setupMouseTracking() {
    console.log('Setting up mouse tracking...');
    
    if (!uIOhook) {
      console.log('uIOhook not available for mouse tracking');
      return;
    }
    
    // Already removed listeners in setupKeyboardTracking, but just to be safe
    uIOhook.removeAllListeners('mousedown');
    uIOhook.removeAllListeners('wheel');
    uIOhook.removeAllListeners('mousemove');
    
    uIOhook.on('mousedown', (e: any) => {
      if (!this.isTracking) return;
      
      this.lastActivityTime = new Date();
      if (e.button === 1) {
        this.metrics.mouseClicks++;
      } else if (e.button === 2) {
        this.metrics.rightClicks++;
      }
      
      // Log every 5 clicks
      if ((this.metrics.mouseClicks + this.metrics.rightClicks) % 5 === 0) {
        console.log(`Real mouse clicks: ${this.metrics.mouseClicks + this.metrics.rightClicks}`);
      }
    });
    
    uIOhook.on('wheel', () => {
      if (!this.isTracking) return;
      
      this.lastActivityTime = new Date();
      this.metrics.mouseScrolls++;
    });
    
    uIOhook.on('mousemove', (e: any) => {
      if (!this.isTracking) return;
      
      if (this.metrics.lastMousePosition) {
        const distance = Math.sqrt(
          Math.pow(e.x - this.metrics.lastMousePosition.x, 2) +
          Math.pow(e.y - this.metrics.lastMousePosition.y, 2)
        );
        
        // Only count as activity if mouse moved more than 5 pixels
        if (distance > 5 && distance < 1000) {
          this.metrics.mouseDistance += distance;
          this.lastActivityTime = new Date();
        }
      }
      
      this.metrics.lastMousePosition = { x: e.x, y: e.y };
    });
    
    console.log('Mouse tracking setup complete');
  }
  
  private detectBotActivity(keycode: number, timestamp: number) {
    // Keep only recent timestamps (last 10 seconds)
    const cutoff = timestamp - 10000;
    this.keyTimestamps = this.keyTimestamps.filter(t => t > cutoff);
    this.keyTimestamps.push(timestamp);
    
    // Check for bot patterns
    let suspiciousPatterns = 0;
    
    // Pattern 1: Too many keys too fast (>15 keys per second sustained)
    if (this.keyTimestamps.length > 150) {
      suspiciousPatterns++;
      console.warn('Suspicious: Too many keystrokes detected');
    }
    
    // Pattern 2: Perfectly regular intervals (bot-like precision)
    if (this.keyTimestamps.length > 5) {
      const intervals = [];
      for (let i = 1; i < this.keyTimestamps.length; i++) {
        intervals.push(this.keyTimestamps[i] - this.keyTimestamps[i-1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => {
        return sum + Math.pow(interval - avgInterval, 2);
      }, 0) / intervals.length;
      
      // If variance is too low (< 10ms), it's likely a bot
      if (variance < 10 && avgInterval < 200) {
        suspiciousPatterns++;
        console.warn('Suspicious: Keyboard intervals too regular (bot-like)');
      }
    }
    
    // Pattern 3: Same key repeated excessively
    if (keycode === this.lastKeyCode) {
      this.repeatedKeyCount++;
      if (this.repeatedKeyCount > 50) {
        suspiciousPatterns++;
        console.warn('Suspicious: Same key repeated', this.repeatedKeyCount, 'times');
      }
    } else {
      this.repeatedKeyCount = 1;
      this.lastKeyCode = keycode;
    }
    
    // Update suspicious activity score
    this.suspiciousActivityScore = Math.max(0, this.suspiciousActivityScore + suspiciousPatterns - 0.1);
    
    // If highly suspicious, reduce the weight of these keystrokes
    if (this.suspiciousActivityScore > 5) {
      console.warn('Bot activity detected! Reducing keystroke weight.');
      // Reduce the counted keystrokes
      if (this.metrics.keyHits > 0) {
        this.metrics.keyHits = Math.floor(this.metrics.keyHits * 0.5);
      }
      if (this.metrics.productiveKeyHits > 0) {
        this.metrics.productiveKeyHits = Math.floor(this.metrics.productiveKeyHits * 0.5);
      }
    }
  }
  
  private startActiveTimeTracking() {
    // Track active time every second
    this.activeTimeInterval = setInterval(() => {
      const idleTime = powerMonitor.getSystemIdleTime();
      if (idleTime < 60) { // User is active if idle time < 60 seconds
        this.activeSeconds++;
      }
    }, 1000);
  }
  
  private startPeriodTimer() {
    // Clear any existing timer first
    if (this.periodTimer) {
      clearInterval(this.periodTimer);
    }
    
    // Calculate time until next minute boundary
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    
    console.log(`⏰ Starting period timer - waiting ${msUntilNextMinute}ms until next minute boundary`);
    
    // Wait until the next minute boundary, then start regular interval
    setTimeout(() => {
      // Save initial period data at the minute boundary
      this.savePeriodData().then(() => {
        this.periodStartTime = new Date();
        this.metrics = this.resetMetrics();
        this.activeSeconds = 0;
      });
      
      // Start regular 1-minute interval timer
      this.periodTimer = setInterval(async () => {
        await this.savePeriodData();
        this.periodStartTime = new Date();
        this.metrics = this.resetMetrics();
        this.activeSeconds = 0;
        
        const timestamp = this.periodStartTime.toLocaleTimeString();
        console.log(`📊 New 1-minute period started at ${timestamp}`);
        console.log(`  Total periods in memory now: ${this.memoryActivityPeriods.size}`);
      }, 60 * 1000); // 1 minute
    }, msUntilNextMinute);
  }
  
  private startIdleDetection() {
    this.idleTimer = setInterval(() => {
      const idleTime = Date.now() - this.lastActivityTime.getTime();
      
      if (idleTime > 60000) {
        this.emit('idle:detected');
      }
    }, 30000);
  }
  
  private async savePeriodData() {
    if (!this.currentSessionId) return;
    
    const activityScore = this.calculateActivityScore();
    const isValid = this.determineValidity(activityScore);
    const classification = await this.classifyActivity();
    
    const currentUser = this.db.getCurrentUser();
    if (!currentUser) {
      console.error('No current user found');
      return;
    }
    
    console.log(`💾 Storing period data in memory with activity score: ${activityScore}`);
    
    // Create period object but store in memory instead of database
    const periodId = crypto.randomUUID();
    const memoryPeriod: MemoryActivityPeriod = {
      id: periodId,
      sessionId: this.currentSessionId,
      userId: currentUser.id,
      periodStart: new Date(this.periodStartTime),
      periodEnd: new Date(),
      mode: this.currentMode,
      activityScore,
      isValid,
      classification,
      metrics: { ...this.metrics, uniqueKeys: new Set(this.metrics.uniqueKeys), productiveUniqueKeys: new Set(this.metrics.productiveUniqueKeys) },
      commandHourData: this.currentMode === 'command_hours' ? {
        uniqueKeys: this.metrics.uniqueKeys.size,
        productiveKeyHits: this.metrics.productiveKeyHits,
        mouseClicks: this.metrics.mouseClicks,
        mouseScrolls: this.metrics.mouseScrolls,
        mouseDistance: this.metrics.mouseDistance
      } : undefined,
      clientHourData: this.currentMode === 'client_hours' ? this.vsCodeExtensionData : undefined
    };
    
    // Store in memory
    this.memoryActivityPeriods.set(periodId, memoryPeriod);
    console.log(`\n📊 ACTIVITY PERIOD STORED IN MEMORY:`);
    console.log(`  Period ID: ${periodId}`);
    console.log(`  Period: ${memoryPeriod.periodStart.toISOString()} - ${memoryPeriod.periodEnd.toISOString()}`);
    console.log(`  Activity Score: ${activityScore}`);
    console.log(`  Session ID: ${this.currentSessionId}`);
    console.log(`  Mode: ${this.currentMode}`);
    console.log(`  Total periods in memory: ${this.memoryActivityPeriods.size}`);
    
    // Log all periods in memory for debugging
    console.log(`  All periods in memory:`);
    let i = 1;
    for (const [id, period] of this.memoryActivityPeriods) {
      console.log(`    ${i}. ${period.periodStart.toISOString()} - ${period.periodEnd.toISOString()} (score: ${period.activityScore})`);
      i++;
    }
    
    this.emit('period:saved', memoryPeriod);
  }
  
  // Store screenshot in memory
  storeScreenshotInMemory(screenshotData: {
    id: string;
    userId: string;
    sessionId: string;
    localPath: string;
    thumbnailPath?: string;
    capturedAt: Date;
    mode: 'client_hours' | 'command_hours';
    notes?: string;
  }) {
    // Calculate the 10-minute window this screenshot belongs to
    const capturedMinute = screenshotData.capturedAt.getMinutes();
    const windowStartMinute = Math.floor(capturedMinute / 10) * 10;
    
    const windowStart = new Date(screenshotData.capturedAt);
    windowStart.setMinutes(windowStartMinute);
    windowStart.setSeconds(0);
    windowStart.setMilliseconds(0);
    
    const windowEnd = new Date(windowStart);
    windowEnd.setMinutes(windowStartMinute + 10);
    
    const memoryScreenshot: MemoryScreenshot = {
      ...screenshotData,
      windowStart,
      windowEnd
    };
    
    this.memoryScreenshots.set(screenshotData.id, memoryScreenshot);
    console.log(`Stored screenshot ${screenshotData.id} in memory for window ${windowStart.toISOString()} - ${windowEnd.toISOString()}`);
    
    // Schedule saving when the window completes
    this.scheduleWindowCompletion(windowEnd);
  }
  
  // Schedule saving data when 10-minute window completes
  private scheduleWindowCompletion(windowEnd: Date) {
    // Only schedule if we don't already have a timer for this window
    if (this.currentWindowEnd && this.currentWindowEnd.getTime() === windowEnd.getTime()) {
      console.log(`Window completion already scheduled for ${windowEnd.toISOString()}`);
      return;
    }
    
    // Clear any existing timer only if scheduling a different window
    if (this.windowCompletionTimer) {
      console.log(`Clearing existing window completion timer for ${this.currentWindowEnd?.toISOString()}`);
      clearTimeout(this.windowCompletionTimer);
    }
    
    this.currentWindowEnd = windowEnd;
    const now = new Date();
    const msUntilWindowEnd = windowEnd.getTime() - now.getTime();
    
    console.log(`\n📅 scheduleWindowCompletion called:
  Current time: ${now.toISOString()}
  Window end: ${windowEnd.toISOString()}
  Delay until window end: ${Math.round(msUntilWindowEnd / 1000)} seconds
  Activity periods in memory: ${this.memoryActivityPeriods.size}
  Screenshots in memory: ${this.memoryScreenshots.size}`);
    
    if (msUntilWindowEnd > 0) {
      console.log(`Scheduling window completion in ${Math.round(msUntilWindowEnd / 1000)} seconds for ${windowEnd.toISOString()}`);
      
      // Safeguard against very long timers - max setTimeout is 2147483647 ms (about 24.8 days)
      // Also, for reliability, if timer is more than 5 minutes, use a shorter interval approach
      const MAX_SAFE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
      const actualDelay = msUntilWindowEnd + 1000; // Add 1 second buffer
      
      if (actualDelay > MAX_SAFE_TIMEOUT) {
        console.log(`Timer delay ${actualDelay}ms exceeds safe limit, using intermediate timer`);
        // Schedule an intermediate check in 1 minute
        this.windowCompletionTimer = setTimeout(() => {
          // Re-schedule for the actual window end
          this.scheduleWindowCompletion(windowEnd);
        }, 60000); // Check again in 1 minute
      } else {
        console.log(`Setting window completion timer for ${actualDelay}ms (${Math.round(actualDelay/1000)}s)`);
        this.windowCompletionTimer = setTimeout(async () => {
          console.log(`\n⏰ WINDOW COMPLETION TIMER FIRED!`);
          console.log(`  Time now: ${new Date().toISOString()}`);
          console.log(`  Window end: ${windowEnd.toISOString()}`);
          console.log(`  Activity periods in memory before save: ${this.memoryActivityPeriods.size}`);
          console.log(`  Screenshots in memory before save: ${this.memoryScreenshots.size}`);
          
          await this.saveCompletedWindow(windowEnd);
          this.currentWindowEnd = null;
          
          console.log(`  Activity periods in memory after save: ${this.memoryActivityPeriods.size}`);
          console.log(`  Screenshots in memory after save: ${this.memoryScreenshots.size}`);
          
          // Schedule next window if we have an active session
          if (this.currentSessionId) {
            const nextWindowEnd = new Date(windowEnd);
            nextWindowEnd.setMinutes(nextWindowEnd.getMinutes() + 10);
            console.log(`  Scheduling next window for ${nextWindowEnd.toISOString()}`);
            this.scheduleWindowCompletion(nextWindowEnd);
          }
        }, actualDelay);
      }
    } else {
      // Window already completed, save immediately
      console.log(`Window already completed, saving immediately`);
      this.saveCompletedWindow(windowEnd).then(() => {
        this.currentWindowEnd = null;
      });
    }
  }
  
  // Save all data for a completed 10-minute window
  private async saveCompletedWindow(windowEnd: Date) {
    console.log(`\n🎯 Window completion triggered for window ending at ${windowEnd.toISOString()}`);
    const windowStart = new Date(windowEnd);
    windowStart.setMinutes(windowEnd.getMinutes() - 10);
    windowStart.setSeconds(0);
    windowStart.setMilliseconds(0);
    windowEnd.setSeconds(0);
    windowEnd.setMilliseconds(0);
    
    // Create a window key to track if we've already saved this window
    const windowKey = `${windowStart.getTime()}_${windowEnd.getTime()}`;
    
    // Check if we've already saved this window (safeguard against duplicate calls)
    if (this.savedWindows && this.savedWindows.has(windowKey)) {
      console.log(`Window ${windowStart.toISOString()} - ${windowEnd.toISOString()} already saved, skipping`);
      return;
    }
    
    // Initialize savedWindows Set if not exists
    if (!this.savedWindows) {
      this.savedWindows = new Set<string>();
    }
    
    // Mark this window as being saved
    this.savedWindows.add(windowKey);
    
    console.log(`\n🎯 Saving completed window: ${windowStart.toISOString()} - ${windowEnd.toISOString()}`);
    console.log(`Current memory periods: ${this.memoryActivityPeriods.size}, Screenshots: ${this.memoryScreenshots.size}`);
    
    // Find screenshot for this window
    let windowScreenshot: MemoryScreenshot | null = null;
    for (const [_, screenshot] of this.memoryScreenshots) {
      if (screenshot.windowStart.getTime() === windowStart.getTime()) {
        windowScreenshot = screenshot;
        break;
      }
    }
    
    if (!windowScreenshot) {
      console.log('No screenshot found for this window, saving activity periods without screenshot');
    }
    
    // Save screenshot first if exists
    let savedScreenshotId: string | null = null;
    if (windowScreenshot && windowScreenshot.localPath) {
      const dbScreenshot = await this.db.saveScreenshot({
        sessionId: windowScreenshot.sessionId,
        localPath: windowScreenshot.localPath,
        thumbnailPath: windowScreenshot.thumbnailPath || '',
        capturedAt: windowScreenshot.capturedAt
      });
      
      if (dbScreenshot) {
        savedScreenshotId = (dbScreenshot as any).id;
        console.log(`Saved screenshot ${savedScreenshotId} to database`);
      } else {
        console.error('Failed to save screenshot - no active session or dbScreenshot is null');
      }
      
      // Remove from memory regardless of save success
      this.memoryScreenshots.delete(windowScreenshot.id);
    }
    
    // Save all activity periods for this window
    const periodsToSave: MemoryActivityPeriod[] = [];
    for (const [periodId, period] of this.memoryActivityPeriods) {
      // Check if period belongs to this window (with tolerance for periods that overlap the window)
      const periodStartTime = period.periodStart.getTime();
      const periodEndTime = period.periodEnd.getTime();
      const windowStartTime = windowStart.getTime();
      const windowEndTime = windowEnd.getTime();
      
      // Include period if it overlaps with the window at all
      // A period belongs to this window if:
      // 1. It starts within the window, OR
      // 2. It ends within the window, OR  
      // 3. It spans the entire window
      const periodOverlapsWindow = 
        (periodStartTime >= windowStartTime && periodStartTime < windowEndTime) || // Starts within window
        (periodEndTime > windowStartTime && periodEndTime <= windowEndTime) || // Ends within window
        (periodStartTime <= windowStartTime && periodEndTime >= windowEndTime); // Spans entire window
      
      if (periodOverlapsWindow) {
        periodsToSave.push(period);
        console.log(`  Including period: ${period.periodStart.toISOString()} - ${period.periodEnd.toISOString()}`);
      }
    }
    
    console.log(`Found ${periodsToSave.length} activity periods for this window`);
    
    if (periodsToSave.length === 0) {
      console.log('WARNING: No activity periods found for this window!');
      console.log('Available periods in memory:');
      for (const [_, period] of this.memoryActivityPeriods) {
        console.log(`  ${period.periodStart.toISOString()} - ${period.periodEnd.toISOString()}`);
      }
    }
    
    for (const period of periodsToSave) {
      const dbPeriod = await this.db.createActivityPeriod({
        id: period.id,
        sessionId: period.sessionId,
        userId: period.userId,
        screenshotId: savedScreenshotId || null,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        mode: period.mode,
        activityScore: period.activityScore,
        isValid: period.isValid,
        classification: period.classification
      });
      
      // Save activity data only if period was saved successfully
      if (dbPeriod) {
        if (period.commandHourData) {
          await this.db.saveCommandHourActivity(dbPeriod.id, period.commandHourData);
        } else if (period.clientHourData) {
          await this.db.saveClientHourActivity(dbPeriod.id, period.clientHourData);
        }
      } else {
        console.error(`Failed to save activity period ${period.id} - dbPeriod is null`);
      }
      
      // Remove from memory regardless of save success
      this.memoryActivityPeriods.delete(period.id);
    }
    
    console.log(`✅ Window ${windowStart.toISOString()} - ${windowEnd.toISOString()} saved successfully\n`);
  }
  
  // Deprecated - no longer needed with window-based saving
  async saveMemoryPeriodsToDatabase(screenshotId: string, screenshotTime: Date): Promise<string[]> {
    console.log('saveMemoryPeriodsToDatabase is deprecated - data is now saved automatically when window completes');
    return [];
  }
  
  // Get activity periods from memory for a time range
  getMemoryActivityPeriods(windowStart: Date, windowEnd: Date): MemoryActivityPeriod[] {
    const periods: MemoryActivityPeriod[] = [];
    
    for (const [_, period] of this.memoryActivityPeriods) {
      // Check if period falls within the window
      if (
        (period.periodStart >= windowStart && period.periodStart < windowEnd) ||
        (period.periodEnd > windowStart && period.periodEnd <= windowEnd) ||
        (period.periodStart <= windowStart && period.periodEnd >= windowEnd)
      ) {
        periods.push(period);
      }
    }
    
    return periods;
  }
  
  private calculateActivityScore(): number {
    if (this.currentMode === 'command_hours') {
      // Calculate activity level based on various metrics
      // Base scoring: 0-100, with bonus points for mouse activity when keyboard is low
      
      const minutesPassed = (Date.now() - this.periodStartTime.getTime()) / (1000 * 60);
      if (minutesPassed === 0) return 0;
      
      // Debug: Log raw counts before calculation
      console.log('\n🔍 ACTIVITY SCORE CALCULATION:', {
        keyHits: this.metrics.keyHits,
        productiveKeyHits: this.metrics.productiveKeyHits,
        navigationKeyHits: this.metrics.navigationKeyHits,
        uniqueKeysSize: this.metrics.uniqueKeys.size,
        productiveUniqueKeysSize: this.metrics.productiveUniqueKeys.size,
        mouseClicks: this.metrics.mouseClicks,
        rightClicks: this.metrics.rightClicks,
        mouseScrolls: this.metrics.mouseScrolls,
        mouseDistance: this.metrics.mouseDistance,
        activeSeconds: this.activeSeconds,
        minutesPassed: minutesPassed.toFixed(2)
      });
      
      // Active time percentage (how much of the interval was the user active)
      const activePercentage = Math.min(100, (this.activeSeconds / (minutesPassed * 60)) * 100);
      
      // Normalize metrics per minute - prioritize productive keys
      const productiveKeyHitsPerMin = this.metrics.productiveKeyHits / minutesPassed;
      const clicksPerMin = (this.metrics.mouseClicks + this.metrics.rightClicks) / minutesPassed;
      const scrollsPerMin = this.metrics.mouseScrolls / minutesPassed;
      const productiveUniqueKeysPerMin = this.metrics.productiveUniqueKeys.size / minutesPassed;
      const mouseDistancePerMin = this.metrics.mouseDistance / minutesPassed;
      
      // Bot activity penalty
      const botPenalty = Math.min(1, Math.max(0, 1 - (this.suspiciousActivityScore / 10)));
      
      // Scoring components (each out of 10, will scale to 100)
      // Productive key hits: 0-40 per minute maps to 0-10 (realistic typing speed)
      const keyScore = Math.min(10, (productiveKeyHitsPerMin / 40) * 10);
      
      // Productive key diversity: 0-12 unique productive keys per minute maps to 0-10
      const keyDiversityScore = Math.min(10, (productiveUniqueKeysPerMin / 12) * 10);
      
      // Mouse clicks: 0-20 per minute maps to 0-10 (1 click every 3 seconds for max)
      const clickScore = Math.min(10, (clicksPerMin / 20) * 10);
      
      // Mouse scrolls: 0-10 per minute maps to 0-10 (scrolling every 6 seconds for max)
      const scrollScore = Math.min(10, (scrollsPerMin / 10) * 10);
      
      // Mouse movement: 0-3000 pixels per minute maps to 0-10 (reasonable movement)
      const moveScore = Math.min(10, (mouseDistancePerMin / 3000) * 10);
      
      // Base weighted average (max 10.0)
      let activityLevel = (
        keyScore * 0.25 +           // Key hits (25%)
        keyDiversityScore * 0.45 +  // Key diversity (45%) - Most important
        clickScore * 0.10 +         // Mouse clicks (10%)
        scrollScore * 0.10 +        // Mouse scrolls (10%)
        moveScore * 0.10            // Mouse movement (10%)
      );
      
      // BONUS POINTS SYSTEM (max 2.0 additional points)
      // Only apply bonus when keyboard activity is low (reading/researching mode)
      const keyScorePercentage = (keyScore / 10) * 100;
      const keyDiversityPercentage = (keyDiversityScore / 10) * 100;
      
      let bonusPoints = 0;
      if (keyScorePercentage < 50 && keyDiversityPercentage < 50) {
        // User is likely reading/researching - reward EXTRA mouse activity
        
        // Click bonus: 0.8 points max 
        if (clicksPerMin > 20) {
          const extraClicks = clicksPerMin - 20;
          bonusPoints += Math.min(0.8, (extraClicks / 15) * 0.8);
        }
        
        // Scroll bonus: 0.6 points max
        if (scrollsPerMin > 10) {
          const extraScrolls = scrollsPerMin - 10;
          bonusPoints += Math.min(0.6, (extraScrolls / 8) * 0.6);
        }
        
        // Movement bonus: 0.6 points max
        if (mouseDistancePerMin > 3000) {
          const extraMovement = mouseDistancePerMin - 3000;
          bonusPoints += Math.min(0.6, (extraMovement / 2500) * 0.6);
        }
        
        // Cap total bonus at 2.0
        bonusPoints = Math.min(2.0, bonusPoints);
      }
      
      // Add bonus to activity level
      activityLevel = activityLevel + bonusPoints;
      
      // Apply bot penalty if suspicious activity detected
      activityLevel = activityLevel * botPenalty;
      
      // Cap at 10.0, then scale to 0-100
      activityLevel = Math.min(10, activityLevel);
      const scaledScore = Math.round(activityLevel * 10); // Scale from 0-10 to 0-100
      
      // Debug logging
      console.log('Activity Calculation:', {
        minutesPassed: minutesPassed.toFixed(2),
        activePercentage: activePercentage.toFixed(0) + '%',
        productiveKeyHitsPerMin: productiveKeyHitsPerMin.toFixed(1),
        productiveUniqueKeysPerMin: productiveUniqueKeysPerMin.toFixed(1),
        clicksPerMin: clicksPerMin.toFixed(1),
        scrollsPerMin: scrollsPerMin.toFixed(1),
        mouseDistancePerMin: mouseDistancePerMin.toFixed(0) + 'px',
        suspiciousScore: this.suspiciousActivityScore.toFixed(1),
        botPenalty: botPenalty.toFixed(2),
        scores: {
          keys: keyScore.toFixed(1),
          keyDiversity: keyDiversityScore.toFixed(1),
          clicks: clickScore.toFixed(1),
          scrolls: scrollScore.toFixed(1),
          movement: moveScore.toFixed(1)
        },
        bonusPoints: bonusPoints.toFixed(2),
        baseLevel: activityLevel.toFixed(1),
        finalScore: scaledScore
      });
      
      return scaledScore;
    } else {
      // Client hours mode
      const vscData = this.vsCodeExtensionData;
      if (!vscData) return 0;
      
      const commitScore = vscData.codeCommitsCount * 10;
      const saveScore = vscData.filesSavedCount * 5;
      const caretScore = vscData.caretMovedCount * 0.1;
      const linesScore = Math.min(vscData.netLinesCount * 2, 50);
      
      return Math.min(100, commitScore + saveScore + caretScore + linesScore);
    }
  }
  
  private determineValidity(score: number): boolean {
    if (score < 30) return false;
    const timeSinceLastActivity = Date.now() - this.lastActivityTime.getTime();
    return timeSinceLastActivity < 300000; // 5 minutes
  }
  
  private async classifyActivity(): Promise<string> {
    try {
      const window = await activeWin();
      
      if (!window) return 'unknown';
      
      const app = window.owner.name.toLowerCase();
      const title = window.title.toLowerCase();
      
      if (app.includes('code') || app.includes('visual studio') || 
          app.includes('intellij') || app.includes('webstorm')) {
        return 'coding';
      }
      
      if (app.includes('chrome') || app.includes('firefox') || 
          app.includes('safari') || app.includes('edge')) {
        if (title.includes('github') || title.includes('gitlab') || 
            title.includes('stackoverflow') || title.includes('developer')) {
          return 'research';
        }
        return 'browsing';
      }
      
      if (app.includes('slack') || app.includes('teams') || 
          app.includes('discord') || app.includes('zoom')) {
        return 'communication';
      }
      
      if (app.includes('terminal') || app.includes('iterm') || 
          app.includes('cmd') || app.includes('powershell')) {
        return 'terminal';
      }
      
      return 'other';
    } catch (error) {
      console.warn('Could not get active window for classification:', error);
      return 'unknown';
    }
  }
  
  async startSession(mode: 'client_hours' | 'command_hours', projectId?: string, task?: string) {
    try {
      console.log('Starting new session:', { mode, projectId, task });
      
      // End any existing session
      if (this.currentSessionId) {
        await this.stopSession();
      }
      
      const session = await this.db.createSession({
        mode,
        projectId,
        task,
        startTime: new Date()
      });
      
      this.currentSessionId = session.id;
      this.currentProjectId = projectId || null;
      this.currentMode = mode;
      this.periodStartTime = new Date();
      this.sessionStartTime = new Date();
      this.metrics = this.resetMetrics();
      this.activeSeconds = 0;
      
      // Start the activity tracker
      if (!this.isTracking) {
        this.start();
      }
      
      // Schedule the current window completion
      const now = new Date();
      const currentMinute = now.getMinutes();
      const windowEndMinute = Math.ceil(currentMinute / 10) * 10;
      const windowEnd = new Date(now);
      windowEnd.setMinutes(windowEndMinute % 60);  // Handle hour rollover
      if (windowEndMinute >= 60) {
        windowEnd.setHours(windowEnd.getHours() + Math.floor(windowEndMinute / 60));
      }
      windowEnd.setSeconds(0);
      windowEnd.setMilliseconds(0);
      console.log(`Session started at ${now.toISOString()}, scheduling window completion for ${windowEnd.toISOString()}`);
      this.scheduleWindowCompletion(windowEnd);
      
      console.log('Session started:', session.id);
      this.emit('session:started', session);
      return session;
    } catch (error) {
      console.error('Failed to start session:', error);
      throw error;
    }
  }
  
  async stopSession() {
    try {
      console.log('Stopping tracking session:', this.currentSessionId);
      
      if (this.currentSessionId) {
        // Save the last period to memory before stopping
        await this.savePeriodData();
        
        // Note: Memory periods will be saved when next screenshot is captured
        // Or we could optionally save them now if needed
        
        // End the session
        await this.db.endSession(this.currentSessionId);
        
        this.emit('session:stopped', this.currentSessionId);
      }
      
      // Clear memory when session stops
      this.memoryActivityPeriods.clear();
      this.memoryScreenshots.clear();
      if (this.windowCompletionTimer) {
        clearTimeout(this.windowCompletionTimer);
        this.windowCompletionTimer = null;
      }
      
      this.currentSessionId = null;
      this.currentProjectId = null;
      this.sessionStartTime = null;
      this.stop();
      
      console.log('Session stopped');
    } catch (error) {
      console.error('Failed to stop session:', error);
      throw error;
    }
  }
  
  async switchMode(mode: 'client_hours' | 'command_hours', projectId?: string, task?: string) {
    console.log('Switching mode to:', mode);
    
    // Stop current session
    if (this.currentSessionId) {
      await this.stopSession();
    }
    
    // Start new session with new mode
    return this.startSession(mode, projectId, task);
  }
  
  receiveVSCodeData(data: any) {
    this.vsCodeExtensionData = data;
  }
  
  // Method to get current activity score (called externally)
  getCurrentActivityScore(): number {
    const score = this.calculateActivityScore();
    console.log('getCurrentActivityScore called, returning:', {
      uniqueKeys: this.metrics.uniqueKeys.size,
      productiveKeyHits: this.metrics.productiveKeyHits,
      mouseClicks: this.metrics.mouseClicks,
      mouseScrolls: this.metrics.mouseScrolls,
      mouseDistance: Math.round(this.metrics.mouseDistance),
      calculatedScore: Math.round(score * 100) / 100,
      sessionId: this.currentSessionId
    });
    
    // Also update the current activity period with the latest score
    // This ensures screenshots always have the latest activity score
    if (this.currentSessionId) {
      this.updateCurrentPeriodScore(score);
    }
    
    return score;
  }
  
  // Update the current activity period's score in the database
  private async updateCurrentPeriodScore(score: number) {
    try {
      // For now, we'll just log this - the period will be updated when saved
      // The screenshot will use the real-time score directly
      console.log(`Current activity score for period: ${score}`);
    } catch (error) {
      console.error('Failed to update period score:', error);
    }
  }
  
  // Method to get current session ID (for external use)
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }
  
  // Method to check if there's an active session
  hasActiveSession(): boolean {
    return this.currentSessionId !== null;
  }
  
  private resetMetrics(): ActivityMetrics {
    console.log('🔄 Resetting metrics to zero');
    const newMetrics: ActivityMetrics = {
      keyHits: 0,
      productiveKeyHits: 0,
      navigationKeyHits: 0,
      uniqueKeys: new Set<number>(),
      productiveUniqueKeys: new Set<number>(),
      mouseClicks: 0,
      rightClicks: 0,
      mouseScrolls: 0,
      mouseDistance: 0,
      lastMousePosition: null
    };
    console.log('   New metrics initialized:', {
      keyHits: newMetrics.keyHits,
      productiveKeyHits: newMetrics.productiveKeyHits,
      uniqueKeys: newMetrics.uniqueKeys.size
    });
    return newMetrics;
  }
}