/**
 * Screenshot Service V2 - Works with the new ActivityTrackerV2
 */

import screenshot from 'screenshot-desktop';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';
import crypto from 'crypto';
import { DatabaseService } from './databaseService';
import { ActivityTrackerV2 } from './activityTrackerV2';

export class ScreenshotServiceV2 {
  private isCapturing = false;
  private screenshotDir: string;
  private captureTimers: Map<number, NodeJS.Timeout> = new Map();
  private activityTracker: ActivityTrackerV2 | null = null;
  private lastScreenshotWindow: number = -1; // Track the last window we took a screenshot in
  
  constructor(private db: DatabaseService) {
    this.screenshotDir = path.join(app.getPath('userData'), 'screenshots');
    this.ensureScreenshotDir();
  }
  
  setActivityTracker(tracker: ActivityTrackerV2) {
    this.activityTracker = tracker;
  }
  
  async start() {
    if (this.isCapturing) {
      console.log('📷 Screenshot service already running');
      return;
    }
    
    console.log('📷 Starting screenshot service...');
    this.isCapturing = true;
    
    // Schedule screenshots immediately
    this.scheduleNextScreenshot();
    
    console.log('✅ Screenshot service started');
  }
  
  stop() {
    console.log('🛑 Stopping screenshot service...');
    this.isCapturing = false;
    
    // Clear all timers
    this.captureTimers.forEach(timer => clearTimeout(timer));
    this.captureTimers.clear();
    
    console.log('✅ Screenshot service stopped');
  }
  
  private async ensureScreenshotDir() {
    try {
      await fs.access(this.screenshotDir);
    } catch {
      await fs.mkdir(this.screenshotDir, { recursive: true });
    }
  }
  
  /**
   * Schedule the next screenshot within the current 10-minute window
   */
  private scheduleNextScreenshot() {
    if (!this.isCapturing) return;
    
    const now = new Date();
    const currentMinute = now.getMinutes();
    const windowStartMinute = Math.floor(currentMinute / 10) * 10;
    const windowEndMinute = windowStartMinute + 10;
    
    // Always schedule for the NEXT window to avoid rapid-fire screenshots
    // Generate a random time within the next 10-minute window
    const nextWindowStart = windowEndMinute % 60; // Handle hour boundary
    const randomOffsetMinutes = Math.random() * 10; // 0-10 minutes spread
    
    // Calculate the target time
    let captureTime = new Date(now);
    
    // If next window is in the next hour
    if (windowEndMinute >= 60) {
      captureTime.setHours(captureTime.getHours() + 1);
    }
    
    // Set the minutes (now guaranteed to be < 60)
    const targetMinute = nextWindowStart + randomOffsetMinutes;
    captureTime.setMinutes(Math.floor(targetMinute));
    captureTime.setSeconds(Math.floor((targetMinute % 1) * 60));
    captureTime.setMilliseconds(0);
    
    // Make sure we're scheduling for the future
    // If somehow we calculated a time in the past, add an hour
    if (captureTime.getTime() <= now.getTime()) {
      captureTime.setHours(captureTime.getHours() + 1);
    }
    
    const delay = captureTime.getTime() - now.getTime();
    
    console.log(`\n📅 Next screenshot scheduled at ${captureTime.toISOString()} (in ${Math.round(delay/1000)}s)`);
    
    // Clear any existing timer
    if (this.captureTimers.has(0)) {
      clearTimeout(this.captureTimers.get(0));
    }
    
    const timer = setTimeout(() => {
      this.captureScreenshot(0);
    }, delay);
    
    this.captureTimers.set(0, timer);
  }
  
  /**
   * Schedule screenshots for the next hour (one per 10-minute window) - DEPRECATED
   */
  private scheduleScreenshots() {
    console.log('\n📅 Scheduling screenshots for next hour...');
    
    // Clear existing timers
    this.captureTimers.forEach(timer => clearTimeout(timer));
    this.captureTimers.clear();
    
    const now = new Date();
    
    // Schedule one screenshot for each 10-minute window in the next hour
    for (let i = 0; i < 6; i++) {
      // Calculate window start time
      const windowStartMinute = i * 10;
      const captureTime = new Date(now);
      captureTime.setMinutes(windowStartMinute);
      captureTime.setSeconds(0);
      captureTime.setMilliseconds(0);
      
      // Add random offset within the 10-minute window (1-9 minutes)
      const randomOffset = Math.floor(Math.random() * 9 * 60 * 1000) + 60000; // 1-9 minutes in ms
      captureTime.setTime(captureTime.getTime() + randomOffset);
      
      // If time has passed, schedule for next hour
      if (captureTime <= now) {
        captureTime.setHours(captureTime.getHours() + 1);
      }
      
      const delay = captureTime.getTime() - now.getTime();
      
      console.log(`  Window ${i}: Screenshot at ${captureTime.toISOString()} (in ${Math.round(delay/1000)}s)`);
      
      const timer = setTimeout(() => {
        this.captureScreenshot(i);
      }, delay);
      
      this.captureTimers.set(i, timer);
    }
  }
  
  /**
   * Capture a screenshot
   */
  private async captureScreenshot(windowIndex: number) {
    if (!this.isCapturing) {
      console.log('⚠️ Screenshot service not capturing');
      return;
    }
    
    // Check if we've already taken a screenshot in this window
    const now = new Date();
    const currentWindow = Math.floor(now.getMinutes() / 10);
    const currentHour = now.getHours();
    const windowId = currentHour * 6 + currentWindow; // Unique ID for each 10-min window in a day
    
    if (this.lastScreenshotWindow === windowId) {
      console.log(`⚠️ Screenshot already taken for window ${currentHour}:${currentWindow}0-${currentHour}:${currentWindow+1}0, skipping`);
      // Schedule next screenshot for next window
      this.scheduleNextScreenshot();
      return;
    }
    
    // Get current user (required)
    const currentUser = this.db.getCurrentUser();
    if (!currentUser) {
      console.log('⚠️ No current user, skipping screenshot');
      return;
    }
    
    // Try to get active session, but don't fail if none exists
    let session = this.db.getActiveSession();
    console.log('📷 Screenshot capture - Active session from DB:', session ? `${session.id} (task: ${session.task})` : 'none');
    
    // If no active session, check with activity tracker
    let sessionId: string | undefined = session?.id;
    if (!sessionId && this.activityTracker) {
      const trackerSessionId = this.activityTracker.getCurrentSessionId();
      console.log('📷 Activity tracker session ID:', trackerSessionId);
      sessionId = trackerSessionId || undefined;
      if (sessionId) {
        // Get session details from database
        const trackerSession = (this.db as any).getSession?.(sessionId);
        if (trackerSession) {
          session = trackerSession;
          console.log('📷 Session from tracker:', `${trackerSession.id} (task: ${trackerSession.task})`);
        }
      }
    }
    
    // If still no session, log warning but continue
    if (!session || !sessionId) {
      console.log('⚠️ No active session found, but continuing with screenshot capture');
      // Use a fallback session ID or create a temporary one
      sessionId = 'TEMP-' + Date.now();
    }
    
    const captureTime = new Date();
    console.log(`\n📸 Capturing screenshot at ${captureTime.toISOString()}`);
    
    try {
      // Capture the screenshot
      const img = await screenshot();
      
      // Generate filenames
      const filename = `${captureTime.getTime()}_${crypto.randomBytes(4).toString('hex')}.jpg`;
      const localPath = path.join(this.screenshotDir, filename);
      const thumbnailFilename = `thumb_${filename}`;
      const thumbnailPath = path.join(this.screenshotDir, thumbnailFilename);
      
      // Save full size image
      await sharp(img)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(localPath);
      
      // Save thumbnail
      await sharp(img)
        .resize(320, 180, { fit: 'cover' })
        .jpeg({ quality: 70 })
        .toFile(thumbnailPath);
      
      // Get the current activity directly from the database service
      const currentActivity = (this.db as any).getCurrentActivityNote?.() || session?.task || 'Working';
      console.log(`📷 Using activity for screenshot: "${currentActivity}"`);
      
      // Create screenshot data
      const screenshotData = {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        sessionId: sessionId!, // Use sessionId variable (guaranteed to have value)
        localPath,
        thumbnailPath,
        capturedAt: captureTime,
        mode: session?.mode || 'command_hours' as 'client_hours' | 'command_hours',
        notes: currentActivity  // Use the current activity from UI
      };
      
      // Store in activity tracker (which will add to window manager or save directly)
      if (this.activityTracker) {
        await this.activityTracker.storeScreenshot(screenshotData);
        console.log(`✅ Screenshot processed by activity tracker`);
        
        // Mark this window as having a screenshot
        this.lastScreenshotWindow = windowId;
      } else {
        console.warn('⚠️ ActivityTracker not set, cannot store screenshot');
      }
      
    } catch (error) {
      console.error('❌ Failed to capture screenshot:', error);
    } finally {
      // Always schedule the next screenshot
      this.scheduleNextScreenshot();
    }
  }
  
  /**
   * Get the full path of a screenshot
   */
  async getScreenshotFullPath(screenshotId: string): Promise<string | null> {
    const screenshot = await this.db.getScreenshot(screenshotId) as any;
    if (!screenshot || !screenshot.localPath) return null;
    return screenshot.localPath;
  }
  
  /**
   * Delete screenshot files
   */
  async deleteScreenshotFiles(screenshotIds: string[]) {
    for (const id of screenshotIds) {
      const screenshot = await this.db.getScreenshot(id) as any;
      if (screenshot && screenshot.localPath) {
        try {
          await fs.unlink(screenshot.localPath);
          
          // Delete thumbnail too
          const thumbnailPath = screenshot.localPath.replace(
            path.basename(screenshot.localPath),
            `thumb_${path.basename(screenshot.localPath)}`
          );
          await fs.unlink(thumbnailPath);
        } catch (error) {
          console.error(`Failed to delete screenshot file: ${screenshot.localPath}`, error);
        }
      }
    }
  }
}