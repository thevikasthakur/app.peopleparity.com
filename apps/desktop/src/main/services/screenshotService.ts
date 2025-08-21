import screenshot from 'screenshot-desktop';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';
import { DatabaseService } from './databaseService';
import { ActivityTracker } from './activityTracker';
import crypto from 'crypto';

export class ScreenshotService {
  private isCapturing = false;
  private screenshotDir: string;
  private captureTimers: Map<number, NodeJS.Timeout> = new Map();
  private activityTracker: ActivityTracker | null = null;
  
  constructor(private db: DatabaseService) {
    this.screenshotDir = path.join(app.getPath('userData'), 'screenshots');
    this.ensureScreenshotDir();
  }
  
  setActivityTracker(tracker: ActivityTracker) {
    this.activityTracker = tracker;
  }
  
  async start() {
    if (this.isCapturing) {
      console.log('Screenshot service already running');
      return;
    }
    
    console.log('Starting screenshot service...');
    this.isCapturing = true;
    this.scheduleScreenshots();
    
    setInterval(() => {
      console.log('Scheduling screenshots for next 10-minute period');
      this.scheduleScreenshots();
    }, 10 * 60 * 1000);
    
    console.log('Screenshot service started successfully');
  }
  
  stop() {
    this.isCapturing = false;
    this.captureTimers.forEach(timer => clearTimeout(timer));
    this.captureTimers.clear();
  }
  
  private async ensureScreenshotDir() {
    try {
      await fs.access(this.screenshotDir);
    } catch {
      await fs.mkdir(this.screenshotDir, { recursive: true });
    }
  }
  
  private scheduleScreenshots() {
    console.log('Scheduling screenshots...');
    this.captureTimers.forEach(timer => clearTimeout(timer));
    this.captureTimers.clear();
    
    const now = new Date();
    const currentMinute = now.getMinutes();
    const currentPeriod = Math.floor(currentMinute / 10);
    
    console.log(`Current time: ${now.toISOString()}, minute: ${currentMinute}, period: ${currentPeriod}`);
    
    // Schedule screenshots for the next hour in 10-minute intervals
    for (let i = 0; i < 6; i++) {
      const periodStartMinute = i * 10; // 0, 10, 20, 30, 40, 50
      
      // Create capture time for this period
      const captureTime = new Date(now);
      captureTime.setMinutes(periodStartMinute);
      captureTime.setSeconds(0);
      captureTime.setMilliseconds(0);
      
      // Add random offset within the 10-minute window (0-9 minutes, 59 seconds)
      const randomOffsetMs = Math.floor(Math.random() * (10 * 60 * 1000 - 1000)); // 0 to 9:59
      captureTime.setTime(captureTime.getTime() + randomOffsetMs);
      
      // If this time has already passed, schedule for next hour
      if (captureTime <= now) {
        captureTime.setHours(captureTime.getHours() + 1);
      }
      
      const delay = captureTime.getTime() - now.getTime();
      console.log(`Scheduling screenshot ${i} for ${captureTime.toISOString()} (in ${Math.round(delay/1000)}s)`);
      
      const timer = setTimeout(() => {
        this.captureScreenshot(i);
      }, delay);
      
      this.captureTimers.set(i, timer);
    }
  }
  
  private async captureScreenshot(periodIndex: number) {
    console.log(`Attempting to capture screenshot for period ${periodIndex}`);
    
    if (!this.isCapturing) {
      console.log('Screenshot service not capturing, skipping');
      return;
    }
    
    const currentActivity = await this.db.getCurrentActivity();
    console.log('Current activity:', currentActivity);
    
    if (!currentActivity || !currentActivity.isActive) {
      console.log('No active session, skipping screenshot');
      return;
    }
    
    // Get the full session data
    const session = await this.db.getActiveSession();
    const currentUser = this.db.getCurrentUser();
    if (!currentUser) {
      console.error('No current user found');
      return;
    }
    
    // Store the capture timestamp
    const captureTimestamp = new Date();
    
    try {
      const img = await screenshot();
      
      const filename = `${captureTimestamp.getTime()}_${crypto.randomBytes(4).toString('hex')}.jpg`;
      const localPath = path.join(this.screenshotDir, filename);
      
      await sharp(img)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(localPath);
      
      const thumbnailFilename = `thumb_${filename}`;
      const thumbnailPath = path.join(this.screenshotDir, thumbnailFilename);
      
      await sharp(img)
        .resize(320, 180, { fit: 'cover' })
        .jpeg({ quality: 70 })
        .toFile(thumbnailPath);
      
      // Store screenshot in memory instead of saving to database immediately
      const screenshotId = crypto.randomUUID();
      const screenshotData = {
        id: screenshotId,
        userId: currentUser.id,
        sessionId: currentActivity.sessionId,
        localPath,
        thumbnailPath,
        capturedAt: captureTimestamp,
        mode: session?.mode || 'command_hours',
        notes: session?.task || undefined
      };
      
      // Store in memory via activity tracker
      if (this.activityTracker) {
        this.activityTracker.storeScreenshotInMemory(screenshotData);
        console.log(`Screenshot ${screenshotId} stored in memory, will be saved when window completes`);
      } else {
        console.warn('ActivityTracker not set, cannot store screenshot in memory');
      }
      
      console.log(`Screenshot captured at ${captureTimestamp.toISOString()}: ${filename}`);
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    }
  }
  
  async getScreenshotFullPath(screenshotId: string): Promise<string | null> {
    const screenshot = await this.db.getScreenshot(screenshotId) as any;
    if (!screenshot || !screenshot.localPath) return null;
    return screenshot.localPath;
  }
  
  async deleteScreenshotFiles(screenshotIds: string[]) {
    for (const id of screenshotIds) {
      const screenshot = await this.db.getScreenshot(id) as any;
      if (screenshot && screenshot.localPath) {
        try {
          await fs.unlink(screenshot.localPath);
          
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