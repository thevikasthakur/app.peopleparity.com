import screenshot from 'screenshot-desktop';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';
import { DatabaseService } from './databaseService';
import crypto from 'crypto';

export class ScreenshotService {
  private isCapturing = false;
  private screenshotDir: string;
  private captureTimers: Map<number, NodeJS.Timeout> = new Map();
  
  constructor(private db: DatabaseService) {
    this.screenshotDir = path.join(app.getPath('userData'), 'screenshots');
    this.ensureScreenshotDir();
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
    
    // Get the last 10 activity periods (10 minutes worth of 1-minute periods)
    // This will aggregate the activity scores for this screenshot
    const aggregatedScore = await this.db.getAggregatedActivityScore(10);
    const relatedPeriods = await this.db.getRecentActivityPeriods(10);
    const relatedPeriodIds = relatedPeriods.map(p => p.id);
    console.log(`Aggregated activity score from last 10 periods: ${aggregatedScore}`);
    
    // Always take screenshots when there's an active session
    // This allows users to see their actual activity levels, even if 0%
    
    try {
      const img = await screenshot();
      
      // Store the capture timestamp locally
      const captureTimestamp = new Date();
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
      
      // Save screenshot with the aggregated activity score and capture timestamp
      const screenshotData = {
        activityPeriodId: currentActivity.periodId,
        localPath,
        thumbnailPath,
        capturedAt: captureTimestamp,  // Use local capture time
        activityScore: aggregatedScore,  // Use aggregated score from 10 periods
        relatedPeriodIds: relatedPeriodIds,  // Store the 10 related period IDs
        sessionId: currentActivity.sessionId
      };
      
      await this.db.saveScreenshot(screenshotData);
      
      // Also store the related activity period IDs for detailed breakdown
      console.log(`Screenshot saved with aggregated activity score: ${aggregatedScore}%`);
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