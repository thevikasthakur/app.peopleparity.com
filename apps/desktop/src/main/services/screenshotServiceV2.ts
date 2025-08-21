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
    
    // Schedule screenshots for current hour
    this.scheduleScreenshots();
    
    // Re-schedule every hour
    setInterval(() => {
      this.scheduleScreenshots();
    }, 60 * 60 * 1000); // Every hour
    
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
   * Schedule screenshots for the next hour (one per 10-minute window)
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
    
    // Check if we have an active session
    const currentActivity = await this.db.getCurrentActivity();
    if (!currentActivity || !currentActivity.isActive) {
      console.log('⚠️ No active session, skipping screenshot');
      return;
    }
    
    const session = await this.db.getActiveSession();
    const currentUser = this.db.getCurrentUser();
    if (!currentUser || !session) {
      console.log('⚠️ No user or session, skipping screenshot');
      return;
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
      
      // Create screenshot data
      const screenshotData = {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        sessionId: currentActivity.sessionId,
        localPath,
        thumbnailPath,
        capturedAt: captureTime,
        mode: session.mode || 'command_hours' as 'client_hours' | 'command_hours',
        notes: session.task || undefined
      };
      
      // Store in activity tracker (which will add to window manager)
      if (this.activityTracker) {
        this.activityTracker.storeScreenshot(screenshotData);
        console.log(`✅ Screenshot stored in current window`);
      } else {
        console.warn('⚠️ ActivityTracker not set, cannot store screenshot');
      }
      
    } catch (error) {
      console.error('❌ Failed to capture screenshot:', error);
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