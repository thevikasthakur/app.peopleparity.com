import { app, BrowserWindow, ipcMain, screen, desktopCapturer, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { ActivityTrackerV2 } from './services/activityTrackerV2';
import { ScreenshotServiceV2 } from './services/screenshotServiceV2';
import { DatabaseService } from './services/databaseService';
import { ApiSyncService } from './services/apiSyncService';
import { BrowserExtensionBridge } from './services/browserExtensionBridge';
import { ProductiveHoursService } from './services/productiveHoursService';
import { PermissionsService } from './services/permissionsService';
import { calculateScreenshotScore, calculateTop80Average } from './utils/activityScoreCalculator';
import Store from 'electron-store';

// CRITICAL FIX: The issue is that 'force-device-scale-factor' = '1' was CAUSING the problem!
// On Retina displays, we should NOT force scale factor to 1, we should let it be 2
// Remove all the incorrect switches that were forcing low DPI
if (process.platform === 'darwin') {
  // For macOS, enable high DPI support WITHOUT forcing scale factor
  app.commandLine.appendSwitch('high-dpi-support', 'true');
  // Enable hardware acceleration
  app.commandLine.appendSwitch('enable-features', 'HardwareAcceleration');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  // Do NOT set force-device-scale-factor or device-scale-factor!
  // Let Electron detect the correct scale factor automatically
}

// Try to load dotenv if available, but don't fail if it's not
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(__dirname, '../../.env') });
} catch (e) {
  // dotenv not available, continue without it
  console.log('dotenv not available, continuing without environment variables from .env file');
}

// Set up logging to file for packaged app
if (app.isPackaged) {
  const logFile = path.join(app.getPath('userData'), 'main-process.log');
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  
  // Override console methods to also write to file
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.log = function(...args: any[]) {
    const message = `[${new Date().toISOString()}] LOG: ${args.join(' ')}\n`;
    logStream.write(message);
    originalLog.apply(console, args);
  };
  
  console.error = function(...args: any[]) {
    const message = `[${new Date().toISOString()}] ERROR: ${args.join(' ')}\n`;
    logStream.write(message);
    originalError.apply(console, args);
  };
  
  console.warn = function(...args: any[]) {
    const message = `[${new Date().toISOString()}] WARN: ${args.join(' ')}\n`;
    logStream.write(message);
    originalWarn.apply(console, args);
  };
  
  console.log('\n=== New app session started ===');
  console.log('Log file:', logFile);
}

const store = new Store();
let mainWindow: BrowserWindow | null = null;
let activityTracker: ActivityTrackerV2;
let screenshotService: ScreenshotServiceV2;
let databaseService: DatabaseService;
let apiSyncService: ApiSyncService;
let browserBridge: BrowserExtensionBridge;
let productiveHoursService: ProductiveHoursService;
let permissionsService: PermissionsService;

const createWindow = () => {
  // Get the primary display's scale factor
  const primaryDisplay = screen.getPrimaryDisplay();
  const scaleFactor = primaryDisplay.scaleFactor;
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Enable web features for better rendering
      webgl: true,
      experimentalFeatures: true,
      // Force default zoom level
      zoomFactor: 1.0,
      defaultFontSize: 16,
      defaultMonospaceFontSize: 13,
      minimumFontSize: 12
    },
    titleBarStyle: 'hiddenInset',
    minWidth: 1200,
    minHeight: 800,
    backgroundColor: '#ffffff',
    show: false,
    // Ensure window respects high DPI
    useContentSize: true,
    enableLargerThanScreen: false
  });

  // Handle window ready to show
  mainWindow.once('ready-to-show', () => {
    mainWindow!.show();
    // Log DPI info for debugging
    console.log(`Display scale factor: ${scaleFactor}`);
    console.log(`Display size: ${primaryDisplay.size.width}x${primaryDisplay.size.height}`);
    console.log(`Display work area: ${primaryDisplay.workArea.width}x${primaryDisplay.workArea.height}`);
  });

  // Clear any stored zoom levels before loading
  mainWindow.webContents.session.setPermissionRequestHandler(() => {});
  
  // Handle zoom settings properly for high DPI
  mainWindow.webContents.on('did-finish-load', () => {
    // CRITICAL FIX: Force reset ALL zoom settings
    // This is the most aggressive approach to fix zoom issues
    mainWindow!.webContents.setZoomFactor(1.0);
    mainWindow!.webContents.setZoomLevel(0);
    
    // Clear stored zoom preferences
    mainWindow!.webContents.session.clearStorageData({
      storages: ['localstorage']
    }).catch(() => {});
    
    // Prevent ANY zoom changes
    mainWindow!.webContents.setVisualZoomLevelLimits(1, 1);
    
    // Force proper rendering with multiple approaches
    mainWindow!.webContents.executeJavaScript(`
      // Reset any CSS zoom
      document.body.style.zoom = '100%';
      document.documentElement.style.zoom = '100%';
      
      // Force browser zoom to 100%
      if (typeof browser !== 'undefined' && browser.tabs && browser.tabs.setZoom) {
        browser.tabs.setZoom(1.0);
      }
      
      // Log DPI info for debugging
      console.log('Device Pixel Ratio:', window.devicePixelRatio);
      console.log('Screen resolution:', window.screen.width, 'x', window.screen.height);
      console.log('Window inner size:', window.innerWidth, 'x', window.innerHeight);
      console.log('Document zoom:', document.body.style.zoom || '100%');
      
      // Force high-quality rendering
      if (!document.getElementById('dpi-fixes')) {
        const style = document.createElement('style');
        style.id = 'dpi-fixes';
        style.textContent = \`
          * {
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: optimizeLegibility !important;
            font-feature-settings: "kern" 1 !important;
            -webkit-text-size-adjust: 100% !important;
          }
          html, body {
            zoom: 100% !important;
            transform: scale(1) !important;
            transform-origin: 0 0 !important;
          }
          body {
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
            will-change: transform;
          }
          img, svg {
            image-rendering: -webkit-optimize-contrast !important;
            image-rendering: crisp-edges !important;
            -webkit-backface-visibility: hidden !important;
            backface-visibility: hidden !important;
          }
        \`;
        document.head.appendChild(style);
      }
      
      // Double-check and force pixel-perfect rendering
      const actualZoom = Math.round(window.devicePixelRatio * 100);
      if (actualZoom !== 100 && actualZoom !== 200) {
        console.warn('Unusual zoom detected:', actualZoom + '%', 'Attempting to correct...');
        document.body.style.transform = 'scale(' + (100 / actualZoom) + ')';
        document.body.style.transformOrigin = '0 0';
      }
    `).catch(err => console.error('Error injecting DPI fixes:', err));
  });
  
  // Also handle zoom changes to prevent them
  mainWindow.webContents.on('zoom-changed', (event, zoomDirection) => {
    console.log('Zoom change detected and prevented:', zoomDirection);
    event.preventDefault();
    mainWindow!.webContents.setZoomLevel(0);
    mainWindow!.webContents.setZoomFactor(1.0);
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Handle window close event - prevent accidental closure during tracking
  mainWindow.on('close', (event) => {
    // Check if there's an active session
    const activeSession = databaseService?.getActiveSession();
    
    if (activeSession && activeSession.isActive) {
      // Prevent the window from closing
      event.preventDefault();
      
      // Show confirmation dialog
      const choice = dialog.showMessageBoxSync(mainWindow!, {
        type: 'warning',
        buttons: ['Keep Tracking', 'Stop & Close'],
        defaultId: 0,
        cancelId: 0,
        title: 'Tracking in Progress',
        message: 'Time tracking is currently active',
        detail: 'Do you want to stop tracking and close the application, or continue tracking?'
      });
      
      if (choice === 1) {
        // User chose to stop and close
        // Stop the session first
        activityTracker?.stopSession().then(() => {
          // Now close the window
          mainWindow!.destroy();
        }).catch((error) => {
          console.error('Error stopping session:', error);
          // Force close anyway
          mainWindow!.destroy();
        });
      }
      // If choice === 0, do nothing (keep window open)
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// Set up basic IPC handlers immediately when app is ready
// These will return safe defaults until services are initialized
app.whenReady().then(() => {
  console.log('🔧 Setting up basic IPC handlers...');
  
  // Set up a basic auth:check-session handler immediately
  ipcMain.handle('auth:check-session', async () => {
    console.log('auth:check-session called, apiSyncService:', !!apiSyncService);
    if (!apiSyncService) {
      return { user: null };
    }
    try {
      return await apiSyncService.checkSession();
    } catch (error) {
      console.error('Error in checkSession:', error);
      return { user: null };
    }
  });
  
  console.log('✅ Basic IPC handlers registered');
});

app.whenReady().then(async () => {
  console.log('\n🚀 Initializing application services...');
  
  // CRITICAL: Clear all stored zoom data on app start
  const session = require('electron').session;
  await session.defaultSession.clearStorageData({
    storages: ['localstorage', 'cookies']
  }).catch(() => {});
  
  // Initialize database
  databaseService = new DatabaseService();
  await databaseService.initialize();
  console.log('✅ Database initialized');
  
  // Initialize activity tracker V2
  activityTracker = new ActivityTrackerV2(databaseService);
  databaseService.setActivityTracker(activityTracker as any); // Type cast for compatibility
  console.log('✅ Activity tracker V2 initialized');
  
  // Listen for inactivity detection
  activityTracker.on('inactivity:detected', (message: { title: string; message: string }) => {
    console.log('🚨 Inactivity detected, showing alert:', message.title);
    
    // Show dialog to user
    const { dialog } = require('electron');
    dialog.showMessageBox(mainWindow!, {
      type: 'warning',
      title: message.title,
      message: message.message,
      buttons: ['OK'],
      defaultId: 0,
      noLink: true
    }).then(() => {
      // Send event to renderer to update UI
      mainWindow?.webContents.send('session-update', {
        isTracking: false,
        session: null
      });
    });
  });
  
  // Initialize screenshot service V2 (BEFORE restoring session)
  screenshotService = new ScreenshotServiceV2(databaseService);
  screenshotService.setActivityTracker(activityTracker);
  console.log('✅ Screenshot service V2 initialized');
  
  // Initialize other services
  apiSyncService = new ApiSyncService(databaseService, store);
  browserBridge = new BrowserExtensionBridge();
  productiveHoursService = new ProductiveHoursService(databaseService);
  permissionsService = new PermissionsService();
  console.log('✅ API sync, browser bridge, productive hours, and permissions service initialized');
  
  // Setup ALL IPC handlers now that services are ready
  setupIpcHandlers();
  console.log('✅ All IPC handlers registered');
  
  // Create window AFTER handlers are registered
  createWindow();
  console.log('✅ Main window created');
  
  // Restore existing active session if any
  try {
    const activeSession = databaseService.getActiveSession();
    if (activeSession) {
      console.log(`📄 Found existing active session: ${activeSession.id}`);
      activityTracker.restoreSession(
        activeSession.id,
        activeSession.mode,
        activeSession.projectId || undefined
      );
      // Start screenshot service for the restored session
      screenshotService.enableAutoSessionCreation();
      screenshotService.start();
      console.log('✅ Session restored and screenshot service started');
    } else {
      console.log('ℹ️ No active session found - screenshot service NOT started');
    }
  } catch (error) {
    console.error('❌ Failed to restore session:', error);
  }
  
  // Listen for session stop events to stop screenshot service
  activityTracker.on('session:stopped', () => {
    console.log('📷 Stopping screenshot service due to session stop');
    screenshotService.stop();
    
    // Notify renderer that session has stopped
    if (mainWindow) {
      mainWindow.webContents.send('session-update', { isActive: false });
    }
  });
  
  // Listen for session start events to start screenshot service
  console.log('🎯 Setting up session:started event listener on activityTracker');
  const sessionStartedListener = async (session: any) => {
    console.log('📷 Session started event received, starting screenshot service for new session:', session.id);
    console.log('📷 Screenshot service instance exists:', !!screenshotService);
    
    try {
      // Re-enable auto session creation in case it was disabled
      screenshotService.enableAutoSessionCreation();
      console.log('📷 About to call screenshotService.start()...');
      await screenshotService.start();
      console.log('✅ Screenshot service started successfully for session:', session.id);
    } catch (error: any) {
      console.error('❌ Failed to start screenshot service:', error);
      console.error('Error stack:', error.stack);
    }
    
    // Notify renderer that session has started
    if (mainWindow) {
      mainWindow.webContents.send('session-update', { 
        isActive: true, 
        session: session 
      });
    }
  };
  
  activityTracker.on('session:started', sessionStartedListener);
  console.log('✅ session:started listener attached, total listeners:', activityTracker.listenerCount('session:started'));
  
  // Listen for concurrent session detection
  app.on('concurrent-session-detected' as any, async (event: any) => {
    console.error('🚫 CONCURRENT SESSION DETECTED!', event);
    
    // Disable screenshot service to prevent auto-restart
    screenshotService.disableAutoSessionCreation();
    
    // Stop the current session
    if (activityTracker) {
      await activityTracker.stopSession();
    }
    
    // Clear sync queue for this session to prevent more alerts
    if (event.sessionId) {
      databaseService.clearSyncQueueForSession(event.sessionId);
    }
    
    // Show notification to user
    if (mainWindow) {
      mainWindow.webContents.send('concurrent-session-detected', {
        title: 'Session Stopped',
        message: 'Another device is already tracking time. This session has been stopped.',
        details: event.details
      });
    }
    
    // Use electron dialog to show alert (only once)
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Concurrent Session Detected',
      'Another device is already tracking time for your account. This session has been stopped to prevent duplicate time tracking.'
    );
    
    // Re-enable auto session creation after 30 seconds
    setTimeout(() => {
      screenshotService.enableAutoSessionCreation();
      apiSyncService.resetConcurrentSessionFlag();
    }, 30000);
  });
  
  // Start services (but NOT screenshot service - it starts with sessions)
  apiSyncService.start();
  browserBridge.start();
  // screenshotService.start(); // DO NOT auto-start - only start when session starts
  console.log('✅ API sync and browser bridge started');
  
  console.log('\n🎉 Application ready!\n');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

function setupIpcHandlers() {
  // Auth handlers
  ipcMain.handle('auth:login', async (_, email: string, password: string) => {
    console.log('🔐 auth:login handler called with email:', email);
    if (!apiSyncService) {
      console.error('❌ ApiSyncService not initialized');
      return { success: false, message: 'Service not initialized' };
    }
    try {
      const result = await apiSyncService.login(email, password);
      console.log('📤 Login result:', { success: result.success, hasUser: !!result.user });
      
      // If login successful, fetch projects
      if (result.success) {
        console.log('📦 Fetching projects after successful login...');
        try {
          const projects = await apiSyncService.fetchProjects();
          console.log(`✅ Fetched ${projects?.length || 0} projects`);
        } catch (error) {
          console.error('❌ Failed to fetch projects:', error);
        }
      }
      
      return result;
    } catch (error: any) {
      console.error('❌ Login handler error:', error);
      return { success: false, message: error.message || 'Login failed' };
    }
  });
  
  ipcMain.handle('auth:get-api-url', async () => {
    return process.env.API_URL || 'http://localhost:3001';
  });
  
  ipcMain.handle('auth:current-user', async () => {
    return databaseService.getCurrentUser();
  });
  
  ipcMain.handle('auth:set-user', async (_, userData: any) => {
    databaseService.setCurrentUser(userData);
    return true;
  });
  
  ipcMain.handle('auth:logout', async () => {
    if (!apiSyncService) {
      console.error('ApiSyncService not initialized');
      return { success: false };
    }
    return apiSyncService.logout();
  });
  
  // auth:check-session is already set up earlier for immediate availability
  // Re-registering it here would override the earlier handler
  // ipcMain.handle('auth:check-session', async () => {
  //   if (!apiSyncService) {
  //     console.log('ApiSyncService not initialized, returning empty session');
  //     return { user: null };
  //   }
  //   return apiSyncService.checkSession();
  // });

  ipcMain.handle('auth:verify-token', async (_, token: string) => {
    if (!apiSyncService) {
      console.error('ApiSyncService not initialized');
      return { success: false, error: 'Service not initialized' };
    }
    return apiSyncService.verifyToken(token);
  });
  
  ipcMain.handle('auth:saml-login', async () => {
    console.log('SAML login requested');
    // Navigate main window to SAML login URL
    if (mainWindow) {
      const apiUrl = process.env.API_URL || 'http://localhost:3001';
      const samlUrl = `${apiUrl}/api/auth/saml/login`;
      console.log(`Navigating to SAML URL: ${samlUrl}`);
      
      // Handle navigation and authentication
      mainWindow.loadURL(samlUrl);
      
      // Listen for successful authentication redirect
      mainWindow.webContents.on('will-redirect', (event, url) => {
        console.log('SAML redirect detected:', url);
        // Check if this is a successful auth redirect
        if (url.includes('token=') || url.includes('auth/success')) {
          // Extract token from URL if present
          const urlParams = new URL(url).searchParams;
          const token = urlParams.get('token');
          if (token) {
            console.log('SAML authentication successful, token received');
            // You might want to handle the token here
          }
        }
      });
      
      return { success: true };
    }
    console.error('Main window not available for SAML login');
    return { success: false, error: 'Main window not available' };
  });
  
  // Session handlers
  ipcMain.handle('session:start', async (_, mode: 'client_hours' | 'command_hours', task?: string, projectId?: string) => {
    try {
      // Check permissions first
      const permissions = await permissionsService.checkPermissions();
      const hasAllPermissions = permissions['screen-recording'] === 'granted' && 
                               permissions['accessibility'] === 'granted';
      
      if (!hasAllPermissions) {
        console.log('🔐 Missing permissions, requesting...');
        
        // Request permissions if not granted
        const granted = await permissionsService.requestAllPermissions();
        
        if (!granted) {
          // Check again after request
          const newPermissions = await permissionsService.checkPermissions();
          const nowHasPermissions = newPermissions['screen-recording'] === 'granted' && 
                                   newPermissions['accessibility'] === 'granted';
          
          if (!nowHasPermissions) {
            throw new Error('Required permissions not granted. Please grant Screen Recording and Accessibility permissions in System Preferences and restart the app.');
          }
        }
      }
      
      // Now start the session with permissions granted
      console.log('🚀 Starting session via activityTracker.startSession with mode:', mode, 'task:', task, 'projectId:', projectId);
      const sessionResult = await activityTracker.startSession(mode, projectId, task);
      console.log('📊 Session started, result:', sessionResult?.id);
      
      // Also manually start screenshot service just in case the event doesn't fire
      console.log('📸 Manually starting screenshot service after session start');
      try {
        screenshotService.enableAutoSessionCreation();
        await screenshotService.start();
        console.log('✅ Screenshot service started manually');
      } catch (error: any) {
        console.error('❌ Failed to manually start screenshot service:', error);
      }
      
      return sessionResult;
    } catch (error: any) {
      console.error('❌ Failed to start session:', error);
      
      // Check if it's a permissions error
      if (error.message?.includes('Operation not permitted') || 
          error.message?.includes('accessibility') ||
          error.message?.includes('not trusted') ||
          error.message?.includes('permissions')) {
        throw new Error(error.message || 'Permission denied. Please grant Screen Recording and Accessibility permissions in System Preferences.');
      }
      
      throw error;
    }
  });
  
  ipcMain.handle('session:stop', async () => {
    return activityTracker.stopSession();
  });
  
  ipcMain.handle('session:current', async () => {
    return databaseService.getActiveSession();
  });
  
  ipcMain.handle('session:activity', async () => {
    return databaseService.getCurrentActivity();
  });
  
  ipcMain.handle('session:today', async (_event, dateString?: string) => {
    if (dateString) {
      console.log('[session:today] Date string from frontend:', dateString);
      const date = new Date(dateString);
      console.log('[session:today] Parsed date:', date.toISOString(), 'Local:', date.toString());
      return databaseService.getSessionsForDate(date);
    }
    return databaseService.getTodaySessions();
  });
  
  ipcMain.handle('session:switch-mode', async (_, mode: 'client_hours' | 'command_hours', task?: string, projectId?: string) => {
    // Stop current session and start new one
    await activityTracker.stopSession();
    return activityTracker.startSession(mode, projectId, task);
  });

  // Get current session with productive metrics
  ipcMain.handle('session:productive-info', async () => {
    const session = databaseService.getActiveSession();
    if (!session) return null;
    
    const currentUser = databaseService.getCurrentUser();
    if (!currentUser) return null;
    
    // Get screenshots for the current session to count tracked time
    // The user clarified: "10 min per valid screenshot"
    // Valid = screenshot with activity score >= 4.0 (not inactive)
    
    // Get all screenshots for this session with their activity scores
    // Apply weighted average calculation based on number of periods
    const db = (databaseService as any).localDb;
    
    // First get all screenshots
    const screenshots = db.db.prepare(`
      SELECT id, capturedAt
      FROM screenshots
      WHERE sessionId = ?
      ORDER BY capturedAt
    `).all(session.id);
    
    // Count screenshots that are NOT inactive (activity score >= 25)
    // UI uses 0-10 scale, DB uses 0-100 scale
    // Inactive threshold: < 2.5 on UI scale = < 25 on DB scale
    let validScreenshots = 0;
    const screenshotDetails: any[] = [];
    
    for (const screenshot of screenshots) {
      // Get all activity periods for this screenshot
      const activityPeriods = db.db.prepare(`
        SELECT activityScore
        FROM activity_periods
        WHERE screenshotId = ?
        ORDER BY activityScore DESC
      `).all(screenshot.id);
      
      const scores = activityPeriods.map((p: any) => p.activityScore);
      
      // Calculate weighted average using our new function
      const weightedScore = calculateScreenshotScore(scores);
      
      const isValid = weightedScore >= 25;  // 2.5 on UI scale
      if (isValid) {
        validScreenshots++;
      }
      
      const uiScore = weightedScore / 10; // Convert to UI scale
      screenshotDetails.push({
        time: new Date(screenshot.capturedAt).toLocaleTimeString(),
        score: weightedScore,
        uiScore: Math.round(uiScore * 10) / 10, // Round to 1 decimal
        periodCount: scores.length,
        valid: isValid,
        classification: 
          uiScore >= 8.5 ? 'good' :
          uiScore >= 7.0 ? 'fair' :
          uiScore >= 5.5 ? 'low' :
          uiScore >= 4.0 ? 'poor' :
          uiScore >= 2.5 ? 'critical' : 'inactive'
      });
    }
    
    // Each valid (non-inactive) screenshot = 10 minutes of tracked time
    const trackedMinutes = validScreenshots * 10;
    
    // Calculate top 80% average activity score across all screenshots
    const allScores: number[] = [];
    for (const detail of screenshotDetails) {
      if (detail.uiScore > 0) {
        allScores.push(detail.uiScore);
      }
    }
    
    const averageActivityScore = allScores.length > 0 
      ? Math.round(calculateTop80Average(allScores) * 10) / 10  // Round to 1 decimal
      : 0;
    
    console.log('Tracked time calculation:', {
      totalScreenshots: screenshots.length,
      validScreenshots,
      trackedMinutes,
      averageActivityScore,
      sessionId: session.id,
      details: screenshotDetails
    });
    
    return {
      session,
      productiveMinutes: trackedMinutes, // Keep the same field name for compatibility
      validScreenshots,
      totalScreenshots: screenshots.length,
      averageActivityScore,
      screenshotDetails
    };
  });
  
  // Dashboard handlers
  ipcMain.handle('dashboard:get-data', async () => {
    return databaseService.getDashboardData();
  });
  
  // Projects handler
  ipcMain.handle('projects:fetch', async () => {
    if (!apiSyncService) {
      console.error('ApiSyncService not initialized');
      return [];
    }
    try {
      const projects = await apiSyncService.fetchProjects();
      return projects || [];
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      return databaseService.getCachedProjects() || [];
    }
  });
  
  // Screenshot handlers
  ipcMain.handle('screenshots:get-today', async () => {
    return databaseService.getTodayScreenshots();
  });
  
  ipcMain.handle('screenshots:get-by-date', async (_, date: string) => {
    return databaseService.getScreenshotsByDate(new Date(date));
  });
  
  ipcMain.handle('screenshots:update-notes', async (_, screenshotIds: string[], notes: string) => {
    return databaseService.updateScreenshotNotes(screenshotIds, notes);
  });
  
  ipcMain.handle('screenshots:transfer-mode', async (_, screenshotIds: string[], newMode: 'client_hours' | 'command_hours') => {
    return databaseService.transferScreenshotMode(screenshotIds, newMode);
  });
  
  ipcMain.handle('screenshots:delete', async (_, screenshotIds: string[]) => {
    console.log('[IPC] screenshots:delete handler called with IDs:', screenshotIds);
    try {
      const result = await databaseService.deleteScreenshots(screenshotIds);
      console.log('[IPC] Delete operation result:', result);
      return result;
    } catch (error) {
      console.error('[IPC] Error in delete handler:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
  
  ipcMain.handle('screenshots:retry-sync', async (_, screenshotId: string) => {
    console.log('[IPC] screenshots:retry-sync handler called for ID:', screenshotId);
    try {
      const result = await apiSyncService.retrySyncItem(screenshotId, 'screenshot');
      console.log('[IPC] Retry sync result:', result);
      return result;
    } catch (error) {
      console.error('[IPC] Error in retry sync handler:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
  
  ipcMain.handle('screenshots:fetch-signed-url', async (_, screenshotId: string) => {
    console.log('[IPC] screenshots:fetch-signed-url handler called for ID:', screenshotId);
    try {
      const response = await apiSyncService.fetchSignedUrl(screenshotId);
      console.log('[IPC] Signed URL response:', response);
      return response;
    } catch (error) {
      console.error('[IPC] Error fetching signed URL:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
  
  // Activity handlers
  ipcMain.handle('activity:get-period-details', async (_, periodId: string) => {
    return databaseService.getActivityPeriodDetails(periodId);
  });
  
  ipcMain.handle('activity:get-periods-with-metrics', async (_, periodIds: string[]) => {
    return databaseService.getActivityPeriodsWithMetrics(periodIds);
  });
  
  // Notes handlers
  ipcMain.handle('notes:get-recent', async () => {
    return databaseService.getRecentNotes();
  });
  
  ipcMain.handle('notes:save', async (_, noteText: string) => {
    return databaseService.saveNote(noteText);
  });
  
  // Leaderboard handler
  ipcMain.handle('leaderboard:get', async () => {
    return databaseService.getLeaderboard();
  });

  // Productive hours handler
  ipcMain.handle('productive-hours:get', async (_event, dateString?: string) => {
    const currentUser = databaseService.getCurrentUser();
    console.log('Getting productive hours for user:', currentUser, 'date:', dateString);
    if (!currentUser) {
      console.log('No current user found');
      return null;
    }

    const selectedDate = dateString ? new Date(dateString) : new Date();
    console.log('[productive-hours:get] Date from frontend:', dateString, '-> parsed as:', selectedDate.toISOString());
    console.log('[productive-hours:get] Local representation:', selectedDate.toString());
    
    const productiveHours = await productiveHoursService.calculateProductiveHours(currentUser.id, selectedDate);
    console.log('Calculated productive hours:', productiveHours, 'for date:', selectedDate);
    
    // Calculate average activity score for selected date
    const db = (databaseService as any).localDb;
    const startOfDay = new Date(selectedDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setUTCHours(23, 59, 59, 999);
    console.log('[productive-hours:get] Using UTC range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());
    
    // Get all screenshots for today
    const screenshots = db.db.prepare(`
      SELECT s.id, s.capturedAt
      FROM screenshots s
      WHERE s.userId = ?
      AND s.capturedAt >= ?
      AND s.capturedAt <= ?
      ORDER BY s.capturedAt
    `).all(currentUser.id, startOfDay.getTime(), endOfDay.getTime());
    
    const allScores: number[] = [];
    
    for (const screenshot of screenshots) {
      // Get all activity periods for this screenshot
      const activityPeriods = db.db.prepare(`
        SELECT activityScore
        FROM activity_periods
        WHERE screenshotId = ?
        ORDER BY activityScore DESC
      `).all(screenshot.id);
      
      const scores = activityPeriods.map((p: any) => p.activityScore);
      
      if (scores.length > 0) {
        // Calculate weighted average using the same function as session
        const weightedScore = calculateScreenshotScore(scores);
        const uiScore = weightedScore / 10; // Convert to UI scale
        
        if (uiScore > 0) {
          allScores.push(uiScore);
        }
      }
    }
    
    // Calculate top 80% average, excluding lowest 20% of scores
    const averageActivityScore = allScores.length > 0 
      ? Math.round(calculateTop80Average(allScores) * 10) / 10  // Round to 1 decimal
      : 0;
    
    // Get last activity score for context
    const currentActivity = await databaseService.getCurrentActivity();
    const lastActivityScore = currentActivity ? (currentActivity.activityScore / 10) : 5; // Convert to 0-10 scale
    
    const markers = productiveHoursService.getScaleMarkers(selectedDate);
    const message = productiveHoursService.getHustleMessage(productiveHours, markers, lastActivityScore);
    
    // Modify attendance status color based on activity score
    const baseAttendance = productiveHoursService.getAttendanceStatus(productiveHours, markers);
    const attendance = {
      ...baseAttendance,
      color: averageActivityScore >= 8.5 ? '#10b981' : // green - Good activity
             averageActivityScore >= 7.0 ? '#3b82f6' : // blue - Fair activity
             averageActivityScore >= 5.5 ? '#f59e0b' : // amber - Low activity
             averageActivityScore >= 4.0 ? '#ef4444' : // red - Poor activity
             '#dc2626' // dark red - Critical/Inactive
    };

    console.log('Returning productive hours data:', {
      productiveHours,
      averageActivityScore,
      markers,
      message,
      attendance
    });

    return {
      productiveHours,
      averageActivityScore,
      markers,
      message,
      attendance
    };
  });

  // Weekly marathon handler
  ipcMain.handle('weekly-marathon:get', async (_event, dateString?: string) => {
    const currentUser = databaseService.getCurrentUser();
    if (!currentUser) {
      return null;
    }

    const selectedDate = dateString ? new Date(dateString) : new Date();
    const productiveHours = await productiveHoursService.calculateWeeklyHours(currentUser.id, selectedDate);
    const dailyData = await productiveHoursService.getDailyHoursForWeek(currentUser.id, selectedDate);
    const markers = productiveHoursService.getWeeklyMarkers();
    
    // Calculate average activity score for the week of selected date (Monday as first day)
    const db = (databaseService as any).localDb;
    const startOfWeek = new Date(selectedDate);
    const dayOfWeek = selectedDate.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday (0), go back 6 days to Monday
    startOfWeek.setDate(selectedDate.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(selectedDate);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Get all screenshots for the week
    const screenshots = db.db.prepare(`
      SELECT s.id, s.capturedAt
      FROM screenshots s
      WHERE s.userId = ?
      AND s.capturedAt >= ?
      AND s.capturedAt <= ?
      ORDER BY s.capturedAt
    `).all(currentUser.id, startOfWeek.getTime(), endOfWeek.getTime());
    
    const allScores: number[] = [];
    
    for (const screenshot of screenshots) {
      // Get all activity periods for this screenshot
      const activityPeriods = db.db.prepare(`
        SELECT activityScore
        FROM activity_periods
        WHERE screenshotId = ?
        ORDER BY activityScore DESC
      `).all(screenshot.id);
      
      const scores = activityPeriods.map((p: any) => p.activityScore);
      
      if (scores.length > 0) {
        // Calculate weighted average using the same function as session
        const weightedScore = calculateScreenshotScore(scores);
        const uiScore = weightedScore / 10; // Convert to UI scale
        
        if (uiScore > 0) {
          allScores.push(uiScore);
        }
      }
    }
    
    // Calculate top 80% average, excluding lowest 20% of scores
    const averageActivityScore = allScores.length > 0 
      ? Math.round(calculateTop80Average(allScores) * 10) / 10  // Round to 1 decimal
      : 0;
    
    // Calculate base attendance with daily breakdown
    const baseAttendance = productiveHoursService.calculateWeeklyAttendance(productiveHours, markers, dailyData, selectedDate);
    
    // Modify attendance color based on activity score
    const attendance = {
      ...baseAttendance,
      color: averageActivityScore >= 8.5 ? '#10b981' : // green - Good activity
             averageActivityScore >= 7.0 ? '#3b82f6' : // blue - Fair activity
             averageActivityScore >= 5.5 ? '#f59e0b' : // amber - Low activity
             averageActivityScore >= 4.0 ? '#ef4444' : // red - Poor activity
             '#dc2626' // dark red - Critical/Inactive
    };
    
    const message = productiveHoursService.getWeeklyMessage(productiveHours, attendance, markers);

    return {
      productiveHours,
      averageActivityScore,
      markers,
      attendance,
      message,
      dailyData: dailyData || [],
      dailyStatuses: baseAttendance.dailyStatuses || []
    };
  });
  
  // Browser activity handler
  ipcMain.handle('browser:activity', async (_, data: any) => {
    return browserBridge.handleBrowserActivity(data);
  });
  
  // Database handlers
  ipcMain.handle('database:info', async () => {
    return databaseService.getDatabaseInfo();
  });
  
  ipcMain.handle('database:export', async () => {
    return databaseService.exportUserData();
  });
  
  // Projects handler
  ipcMain.handle('projects:list', async () => {
    return databaseService.getProjects();
  });
  
  // Organization handlers
  ipcMain.handle('organizations:create', async (_, name: string, code: string, timezone?: string) => {
    return databaseService.createOrganization(name, code, timezone);
  });
  
  ipcMain.handle('organizations:list', async () => {
    return databaseService.getOrganizations();
  });
  
  ipcMain.handle('organizations:stats', async (_, organizationId: string) => {
    return databaseService.getOrganizationStats(organizationId);
  });
  
  // User management handlers
  ipcMain.handle('users:create', async (_, data: any) => {
    return databaseService.createUser(data);
  });
  
  ipcMain.handle('users:list', async (_, organizationId: string) => {
    return databaseService.getOrganizationUsers(organizationId);
  });
  
  ipcMain.handle('users:get', async (_, userId: string) => {
    return databaseService.getUserById(userId);
  });
  
  ipcMain.handle('users:update-role', async (_, userId: string, role: 'org_admin' | 'developer') => {
    return databaseService.updateUserRole(userId, role);
  });
  
  ipcMain.handle('users:deactivate', async (_, userId: string) => {
    return databaseService.deactivateUser(userId);
  });
  
  ipcMain.handle('users:reset-password', async (_, userId: string, newPassword: string) => {
    return databaseService.resetUserPassword(userId, newPassword);
  });
  
  // Permissions handlers
  ipcMain.handle('permissions:check', async () => {
    return permissionsService.checkPermissions();
  });
  
  ipcMain.handle('permissions:request', async (_, permissionId: string) => {
    return permissionsService.requestPermission(permissionId);
  });
  
  ipcMain.handle('permissions:request-all', async () => {
    return permissionsService.requestAllPermissions();
  });
  
  ipcMain.handle('system:open-preferences', async (_, pane: string) => {
    return permissionsService.openSystemPreferences(pane);
  });
  
  // Debug/admin handlers
  ipcMain.handle('debug:clear-sync-queue', async () => {
    return databaseService.clearSyncQueue();
  });
  
  ipcMain.handle('debug:clear-all-data', async () => {
    return databaseService.clearSessionsAndRelatedData();
  });
  
  ipcMain.handle('debug:check-foreign-keys', async () => {
    return databaseService.checkForeignKeys();
  });
  
  ipcMain.handle('debug:enable-foreign-keys', async () => {
    return databaseService.enableForeignKeys();
  });
}