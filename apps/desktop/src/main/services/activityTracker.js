"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityTracker = void 0;
// Import uIOhook conditionally
let uIOhook;
let UiohookKey;
try {
    const uiohookModule = require('uiohook-napi');
    uIOhook = uiohookModule.uIOhook;
    UiohookKey = uiohookModule.UiohookKey;
    console.log('uiohook-napi loaded successfully');
}
catch (error) {
    console.warn('uiohook-napi not available:', error?.message || 'Module not found');
    console.warn('Activity tracking will not work without uiohook-napi');
    uIOhook = null;
    UiohookKey = null;
}
const active_win_1 = __importDefault(require("active-win"));
const events_1 = require("events");
const electron_1 = require("electron");
// Global flag to prevent multiple uIOhook instances
let globalUIOhookStarted = false;
class ActivityTracker extends events_1.EventEmitter {
    constructor(db) {
        super();
        this.db = db;
        this.isTracking = false;
        this.currentMode = 'command_hours';
        this.currentSessionId = null;
        this.currentProjectId = null;
        this.sessionStartTime = null;
        this.vsCodeExtensionData = {};
        this.idleTimer = null;
        this.periodTimer = null;
        this.lastActivityTime = new Date();
        this.activeSeconds = 0;
        this.activeTimeInterval = null;
        // Bot detection
        this.keyTimestamps = [];
        this.clickTimestamps = [];
        this.lastKeyCode = null;
        this.repeatedKeyCount = 0;
        this.suspiciousActivityScore = 0;
        // Non-productive keys to ignore or count less
        this.navigationKeys = new Set();
        this.productiveKeys = new Set();
        this.metrics = this.resetMetrics();
        this.periodStartTime = new Date();
        this.initializeKeySets();
    }
    initializeKeySets() {
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
    restoreSession(sessionId, mode, projectId) {
        console.log('Restoring existing session:', { sessionId, mode, projectId });
        this.currentSessionId = sessionId;
        this.currentMode = mode;
        this.currentProjectId = projectId || null;
        this.sessionStartTime = new Date();
        this.periodStartTime = new Date();
        this.metrics = this.resetMetrics();
        // Start tracking if not already started
        if (!this.isTracking) {
            this.start();
        }
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
        console.log('Activity tracker stopped');
    }
    setupKeyboardTracking() {
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
        uIOhook.on('keydown', (e) => {
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
            }
            else if (!isNavigationKey) {
                // Semi-productive keys (like punctuation not in our list)
                this.metrics.keyHits++;
                this.metrics.uniqueKeys.add(keycode);
                console.log(`   ➕ SEMI-PRODUCTIVE KEY`);
            }
            else {
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
            }
            else {
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
                        }
                        else {
                            console.log('✅ Accessibility permissions granted');
                        }
                    }
                }
                catch (e) {
                    console.log('Could not check accessibility permissions:', e);
                }
            }
        }
        catch (error) {
            console.error('Failed to start uIOhook:', error);
            console.error('Activity tracking will not work without proper permissions');
        }
    }
    setupMouseTracking() {
        console.log('Setting up mouse tracking...');
        if (!uIOhook) {
            console.log('uIOhook not available for mouse tracking');
            return;
        }
        // Already removed listeners in setupKeyboardTracking, but just to be safe
        uIOhook.removeAllListeners('mousedown');
        uIOhook.removeAllListeners('wheel');
        uIOhook.removeAllListeners('mousemove');
        uIOhook.on('mousedown', (e) => {
            if (!this.isTracking)
                return;
            this.lastActivityTime = new Date();
            if (e.button === 1) {
                this.metrics.mouseClicks++;
            }
            else if (e.button === 2) {
                this.metrics.rightClicks++;
            }
            // Log every 5 clicks
            if ((this.metrics.mouseClicks + this.metrics.rightClicks) % 5 === 0) {
                console.log(`Real mouse clicks: ${this.metrics.mouseClicks + this.metrics.rightClicks}`);
            }
        });
        uIOhook.on('wheel', () => {
            if (!this.isTracking)
                return;
            this.lastActivityTime = new Date();
            this.metrics.mouseScrolls++;
        });
        uIOhook.on('mousemove', (e) => {
            if (!this.isTracking)
                return;
            if (this.metrics.lastMousePosition) {
                const distance = Math.sqrt(Math.pow(e.x - this.metrics.lastMousePosition.x, 2) +
                    Math.pow(e.y - this.metrics.lastMousePosition.y, 2));
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
    detectBotActivity(keycode, timestamp) {
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
                intervals.push(this.keyTimestamps[i] - this.keyTimestamps[i - 1]);
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
        }
        else {
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
    startActiveTimeTracking() {
        // Track active time every second
        this.activeTimeInterval = setInterval(() => {
            const idleTime = electron_1.powerMonitor.getSystemIdleTime();
            if (idleTime < 60) { // User is active if idle time < 60 seconds
                this.activeSeconds++;
            }
        }, 1000);
    }
    startPeriodTimer() {
        // Clear any existing timer first
        if (this.periodTimer) {
            clearInterval(this.periodTimer);
        }
        this.periodTimer = setInterval(async () => {
            await this.savePeriodData();
            this.periodStartTime = new Date();
            this.metrics = this.resetMetrics();
            this.activeSeconds = 0;
        }, 10 * 60 * 1000); // 10 minutes
    }
    startIdleDetection() {
        this.idleTimer = setInterval(() => {
            const idleTime = Date.now() - this.lastActivityTime.getTime();
            if (idleTime > 60000) {
                this.emit('idle:detected');
            }
        }, 30000);
    }
    async savePeriodData() {
        if (!this.currentSessionId)
            return;
        const activityScore = this.calculateActivityScore();
        const isValid = this.determineValidity(activityScore);
        const classification = await this.classifyActivity();
        console.log(`💾 Saving period data with activity score: ${activityScore}`);
        const period = await this.db.createActivityPeriod({
            sessionId: this.currentSessionId,
            periodStart: this.periodStartTime,
            periodEnd: new Date(),
            mode: this.currentMode,
            activityScore,
            isValid,
            classification
        });
        if (this.currentMode === 'command_hours') {
            await this.db.saveCommandHourActivity(period.id, {
                uniqueKeys: this.metrics.uniqueKeys.size,
                productiveKeyHits: this.metrics.productiveKeyHits,
                mouseClicks: this.metrics.mouseClicks,
                mouseScrolls: this.metrics.mouseScrolls,
                mouseDistance: this.metrics.mouseDistance
            });
        }
        else {
            await this.db.saveClientHourActivity(period.id, this.vsCodeExtensionData);
        }
        this.emit('period:saved', period);
    }
    calculateActivityScore() {
        if (this.currentMode === 'command_hours') {
            // Calculate activity level based on various metrics
            // Base scoring: 0-100, with bonus points for mouse activity when keyboard is low
            const minutesPassed = (Date.now() - this.periodStartTime.getTime()) / (1000 * 60);
            if (minutesPassed === 0)
                return 0;
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
            let activityLevel = (keyScore * 0.25 + // Key hits (25%)
                keyDiversityScore * 0.45 + // Key diversity (45%) - Most important
                clickScore * 0.10 + // Mouse clicks (10%)
                scrollScore * 0.10 + // Mouse scrolls (10%)
                moveScore * 0.10 // Mouse movement (10%)
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
        }
        else {
            // Client hours mode
            const vscData = this.vsCodeExtensionData;
            if (!vscData)
                return 0;
            const commitScore = vscData.codeCommitsCount * 10;
            const saveScore = vscData.filesSavedCount * 5;
            const caretScore = vscData.caretMovedCount * 0.1;
            const linesScore = Math.min(vscData.netLinesCount * 2, 50);
            return Math.min(100, commitScore + saveScore + caretScore + linesScore);
        }
    }
    determineValidity(score) {
        if (score < 30)
            return false;
        const timeSinceLastActivity = Date.now() - this.lastActivityTime.getTime();
        return timeSinceLastActivity < 300000; // 5 minutes
    }
    async classifyActivity() {
        const window = await (0, active_win_1.default)();
        if (!window)
            return 'unknown';
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
    }
    async startSession(mode, projectId, task) {
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
            console.log('Session started:', session.id);
            this.emit('session:started', session);
            return session;
        }
        catch (error) {
            console.error('Failed to start session:', error);
            throw error;
        }
    }
    async stopSession() {
        try {
            console.log('Stopping tracking session:', this.currentSessionId);
            if (this.currentSessionId) {
                // Save the last period before stopping
                await this.savePeriodData();
                // End the session
                await this.db.endSession(this.currentSessionId);
                this.emit('session:stopped', this.currentSessionId);
            }
            this.currentSessionId = null;
            this.currentProjectId = null;
            this.sessionStartTime = null;
            this.stop();
            console.log('Session stopped');
        }
        catch (error) {
            console.error('Failed to stop session:', error);
            throw error;
        }
    }
    async switchMode(mode, projectId, task) {
        console.log('Switching mode to:', mode);
        // Stop current session
        if (this.currentSessionId) {
            await this.stopSession();
        }
        // Start new session with new mode
        return this.startSession(mode, projectId, task);
    }
    receiveVSCodeData(data) {
        this.vsCodeExtensionData = data;
    }
    // Method to get current activity score (called externally)
    getCurrentActivityScore() {
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
    async updateCurrentPeriodScore(score) {
        try {
            // For now, we'll just log this - the period will be updated when saved
            // The screenshot will use the real-time score directly
            console.log(`Current activity score for period: ${score}`);
        }
        catch (error) {
            console.error('Failed to update period score:', error);
        }
    }
    // Method to get current session ID (for external use)
    getCurrentSessionId() {
        return this.currentSessionId;
    }
    // Method to check if there's an active session
    hasActiveSession() {
        return this.currentSessionId !== null;
    }
    resetMetrics() {
        console.log('🔄 Resetting metrics to zero');
        const newMetrics = {
            keyHits: 0,
            productiveKeyHits: 0,
            navigationKeyHits: 0,
            uniqueKeys: new Set(),
            productiveUniqueKeys: new Set(),
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
exports.ActivityTracker = ActivityTracker;
//# sourceMappingURL=activityTracker.js.map