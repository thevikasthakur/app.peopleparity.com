"use strict";
/**
 * Activity Tracker V2 - Simplified and reliable activity tracking
 *
 * This version uses the WindowManager for proper 10-minute window handling
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityTrackerV2 = void 0;
// Import uIOhook conditionally
let uIOhook;
let UiohookKey;
try {
    const uiohookModule = require('uiohook-napi');
    uIOhook = uiohookModule.uIOhook;
    UiohookKey = uiohookModule.UiohookKey;
    console.log('✅ uiohook-napi loaded successfully');
}
catch (error) {
    console.warn('⚠️ uiohook-napi not available:', error?.message || 'Module not found');
    uIOhook = null;
    UiohookKey = null;
}
const events_1 = require("events");
const electron_1 = require("electron");
const crypto_1 = __importDefault(require("crypto"));
const windowManager_1 = require("./windowManager");
const metricsCollector_1 = require("./metricsCollector");
const spikeDetectorV2_1 = require("../utils/spikeDetectorV2");
// Global flag to track if uIOhook has been started
let globalUIOhookStarted = false;
class ActivityTrackerV2 extends events_1.EventEmitter {
    constructor(db) {
        super();
        // Session state
        this.isTracking = false;
        this.currentSessionId = null;
        this.currentUserId = null;
        this.currentMode = 'command_hours';
        this.sessionStartDate = null; // UTC date in YYYY-MM-DD format
        this.activeSeconds = 0;
        // Timers
        this.periodTimer = null;
        this.activeTimeTimer = null;
        this.dateChangeTimer = null;
        // Keys configuration
        this.productiveKeys = new Set();
        this.navigationKeys = new Set();
        // Inactivity detection
        this.consecutiveZeroActivityCount = 0;
        this.db = db;
        this.windowManager = new windowManager_1.WindowManager();
        this.metricsCollector = new metricsCollector_1.MetricsCollector();
        this.currentMetrics = this.createEmptyMetrics();
        this.periodStartTime = new Date();
        this.lastActivityTime = new Date();
        this.initializeKeys();
        this.setupWindowManager();
    }
    initializeKeys() {
        if (!UiohookKey)
            return;
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
    setupWindowManager() {
        // Listen for window completion events
        this.windowManager.on('window:complete', async (windowData) => {
            console.log('\n📦 Window complete event received, saving to database...');
            try {
                // Check for inactivity (0 activity score)
                let hasZeroActivity = false;
                let avgActivityScore = 0;
                if (windowData.activityPeriods.length > 0) {
                    const totalScore = windowData.activityPeriods.reduce((sum, p) => sum + p.activityScore, 0);
                    avgActivityScore = totalScore / windowData.activityPeriods.length;
                    hasZeroActivity = avgActivityScore === 0;
                }
                else if (windowData.screenshot) {
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
                }
                else {
                    // Reset counter if activity detected
                    this.consecutiveZeroActivityCount = 0;
                }
                // Save screenshot first if exists
                let savedScreenshotId = null;
                if (windowData.screenshot) {
                    const dbScreenshot = await this.db.saveScreenshot({
                        id: windowData.screenshot.id, // Pass through the original ID
                        sessionId: windowData.screenshot.sessionId,
                        localPath: windowData.screenshot.localPath,
                        thumbnailPath: windowData.screenshot.thumbnailPath || '',
                        capturedAt: windowData.screenshot.capturedAt
                    });
                    if (dbScreenshot) {
                        savedScreenshotId = dbScreenshot.id;
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
                        }
                        else if (period.clientHourData) {
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
            }
            catch (error) {
                console.error('❌ Error saving window data:', error);
            }
        });
    }
    /**
     * Start a new tracking session
     */
    async startSession(mode, projectId, task) {
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
        (0, spikeDetectorV2_1.resetGlobalSpikeDetectorV2)(); // Reset spike history for new session
        this.lastActivityTime = new Date();
        this.activeSeconds = 0;
        this.consecutiveZeroActivityCount = 0; // Reset inactivity counter
        // Start the window manager
        this.windowManager.startSession(session.id, currentUser.id, mode);
        // Start tracking
        this.startTracking();
        console.log(`✅ Session started: ${session.id} (UTC date: ${this.sessionStartDate})`);
        this.emit('session:started', session);
        return session;
    }
    /**
     * Stop the current session
     */
    async stopSession() {
        if (!this.currentSessionId)
            return;
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
    restoreSession(sessionId, mode, projectId, task) {
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
        // Start the window manager
        this.windowManager.startSession(sessionId, currentUser.id, mode);
        // Start tracking
        this.startTracking();
        console.log(`✅ Session restored: ${sessionId} (UTC date: ${this.sessionStartDate})`);
    }
    /**
     * Start all tracking mechanisms
     */
    startTracking() {
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
            }
            catch (error) {
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
    stopTracking() {
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
    setupKeyboardTracking() {
        if (!uIOhook)
            return;
        // Remove existing listeners
        uIOhook.removeAllListeners('keydown');
        uIOhook.on('keydown', (e) => {
            if (!this.isTracking)
                return;
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
            }
            else if (this.navigationKeys.has(keycode)) {
                this.currentMetrics.navigationKeyHits++;
                this.currentMetrics.keyHits++;
            }
            else {
                this.currentMetrics.keyHits++;
            }
        });
    }
    /**
     * Setup mouse tracking
     */
    setupMouseTracking() {
        if (!uIOhook)
            return;
        // Remove existing listeners
        uIOhook.removeAllListeners('mousedown');
        uIOhook.removeAllListeners('wheel');
        uIOhook.removeAllListeners('mousemove');
        uIOhook.removeAllListeners('mouseup');
        let lastClickTime = 0;
        uIOhook.on('mousedown', (e) => {
            if (!this.isTracking)
                return;
            const timestamp = Date.now();
            this.lastActivityTime = new Date();
            // Record in metrics collector for bot detection
            this.metricsCollector.recordClick(timestamp);
            // Track click types
            if (e.button === 2) { // Right click
                this.currentMetrics.rightClicks++;
            }
            else if (e.button === 1) { // Left click
                this.currentMetrics.mouseClicks++;
                // Check for double click (within 500ms)
                if (timestamp - lastClickTime < 500) {
                    this.currentMetrics.doubleClicks++;
                }
                lastClickTime = timestamp;
            }
        });
        uIOhook.on('wheel', () => {
            if (!this.isTracking)
                return;
            this.lastActivityTime = new Date();
            this.currentMetrics.mouseScrolls++;
        });
        uIOhook.on('mousemove', (e) => {
            if (!this.isTracking)
                return;
            const timestamp = Date.now();
            // Record position for bot detection
            this.metricsCollector.recordMousePosition(e.x, e.y, timestamp);
            if (this.currentMetrics.lastMousePosition) {
                const distance = Math.sqrt(Math.pow(e.x - this.currentMetrics.lastMousePosition.x, 2) +
                    Math.pow(e.y - this.currentMetrics.lastMousePosition.y, 2));
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
    startPeriodTimer() {
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
    startActiveTimeTracking() {
        this.activeTimeTimer = setInterval(() => {
            const idleTime = electron_1.powerMonitor.getSystemIdleTime();
            if (idleTime < 60) {
                this.activeSeconds++;
                this.currentMetrics.activeSeconds++; // Track in current metrics
            }
        }, 1000);
    }
    /**
     * Save period data (called every minute)
     */
    async savePeriodData() {
        if (!this.currentSessionId || !this.currentUserId)
            return;
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
        const spikeDetector = (0, spikeDetectorV2_1.getGlobalSpikeDetectorV2)();
        const activityData = {
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
        const detailedMetrics = this.metricsCollector.generateMetricsBreakdown({
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
        }, periodDuration);
        // If spike detection identifies bot activity with high confidence, set score to 0
        let activityScore = detailedMetrics.scoreCalculation.finalScore;
        if (spikeDetectionResult.isBot && spikeDetectionResult.confidence >= 60) {
            activityScore = 0; // Mark as bot activity (only if confident)
            console.log(`  🚫 Bot activity detected via spike analysis (confidence: ${spikeDetectionResult.confidence}%): ${spikeDetectionResult.spikeReason}`);
        }
        else if (spikeDetectionResult.hasSpike && spikeDetectionResult.confidence >= 50) {
            // Reduce score proportionally based on spike severity and confidence
            const reduction = (spikeDetectionResult.spikeScore / 100) * (spikeDetectionResult.confidence / 100);
            activityScore = Math.max(0, Math.round(activityScore * (1 - reduction)));
            console.log(`  ⚠️ Activity spike detected, reducing score by ${Math.round(reduction * 100)}%`);
        }
        console.log(`\n📊 Saving period: ${this.periodStartTime.toISOString()} - ${periodEnd.toISOString()}`);
        console.log(`  Activity score: ${activityScore} (formula: ${detailedMetrics.scoreCalculation.formula})`);
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
        const period = {
            id: crypto_1.default.randomUUID(),
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
    async storeScreenshot(screenshotData) {
        const screenshot = {
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
        }
        else {
            // No active window, save directly to database
            console.log(`⚠️ No active window, saving screenshot directly to database`);
            // Save screenshot to database (don't pass TEMP sessionId)
            const savedScreenshot = await this.db.saveScreenshot({
                id: screenshotData.id, // Pass through the original ID
                sessionId: screenshotData.sessionId.startsWith('TEMP-') ? undefined : screenshotData.sessionId,
                localPath: screenshotData.localPath,
                thumbnailPath: screenshotData.thumbnailPath || '',
                capturedAt: screenshotData.capturedAt,
                notes: screenshotData.notes // Pass the notes from the session
            });
            if (savedScreenshot) {
                console.log(`✅ Screenshot saved directly to database: ${savedScreenshot.id}`);
            }
        }
    }
    /**
     * Calculate activity score based on metrics
     */
    calculateActivityScore() {
        const minutesPassed = 1; // We save every minute
        // Calculate rates
        const keysPerMin = this.currentMetrics.productiveKeyHits / minutesPassed;
        const clicksPerMin = this.currentMetrics.mouseClicks / minutesPassed;
        const scrollsPerMin = this.currentMetrics.mouseScrolls / minutesPassed;
        const uniqueKeysPerMin = this.currentMetrics.uniqueKeys.size / minutesPassed;
        const mouseDistancePerMin = this.currentMetrics.mouseDistance / minutesPassed;
        // Calculate base score components (0-100 total)
        // LIBERALIZED: All multipliers increased by 15% for easier scoring
        let baseScore = 0;
        // Keyboard activity (0-40 points)
        baseScore += Math.min(40, keysPerMin * 2.53); // Was 2.2, now +15%
        // Mouse clicks (0-20 points)
        baseScore += Math.min(20, clicksPerMin * 6.9); // Was 6, now +15%
        // Mouse movement (0-15 points)
        // Normal mouse movement is 1000-5000 pixels per minute
        baseScore += Math.min(15, mouseDistancePerMin / 174); // Was 200, now -13% (lower divisor = higher score)
        // Scroll activity (0-10 points)
        baseScore += Math.min(10, scrollsPerMin * 3.45); // Was 3, now +15%
        // Key diversity (0-15 points)
        baseScore += Math.min(15, uniqueKeysPerMin * 3.45); // Was 3, now +15%
        // Base score capped at 100
        baseScore = Math.min(100, baseScore);
        // Mouse activity bonus (0-30 points) - Added ON TOP of base score
        // Award graduated bonus points for different levels of mouse activity
        let mouseBonus = 0;
        const totalMouseActivity = clicksPerMin + scrollsPerMin + (mouseDistancePerMin / 1000);
        // Apply graduated bonuses based on activity level (avoid suspicious levels > 50)
        // LIBERALIZED: All thresholds reduced by 15% for easier bonuses
        if (totalMouseActivity < 50 && (clicksPerMin > 0 || mouseDistancePerMin > 425)) { // Was 500
            if (totalMouseActivity > 17) { // Was 20
                mouseBonus = 30; // Very high activity (30% bonus)
            }
            else if (totalMouseActivity > 12.75) { // Was 15
                mouseBonus = 25; // High activity (25% bonus)
            }
            else if (totalMouseActivity > 8.5) { // Was 10
                mouseBonus = 20; // Good activity (20% bonus)
            }
            else if (totalMouseActivity > 4.25) { // Was 5
                mouseBonus = 15; // Moderate activity (15% bonus)
            }
            else if (totalMouseActivity > 1.7) { // Was 2
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
    classifyActivity(score) {
        if (score >= 80)
            return 'highly_active';
        if (score >= 60)
            return 'active';
        if (score >= 40)
            return 'moderate';
        if (score >= 20)
            return 'low';
        return 'idle';
    }
    /**
     * Get current activity score (real-time)
     */
    getCurrentActivityScore() {
        return this.calculateActivityScore();
    }
    /**
     * Get current session ID
     */
    getCurrentSessionId() {
        return this.currentSessionId;
    }
    /**
     * Create empty metrics object
     */
    createEmptyMetrics() {
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
    getUTCDateString(date) {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    /**
     * Start the date change timer to check for UTC midnight rollover
     */
    startDateChangeTimer() {
        // Calculate time until next UTC midnight
        const now = new Date();
        const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
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
    async handleDateChange() {
        if (!this.isTracking || !this.currentSessionId)
            return;
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
    pauseTracking() {
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
    resumeTracking() {
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
exports.ActivityTrackerV2 = ActivityTrackerV2;
//# sourceMappingURL=activityTrackerV2.js.map