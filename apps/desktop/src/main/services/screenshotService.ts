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
    
    // Get the full session data
    const session = await this.db.getActiveSession();
    
    // Calculate the 10-minute window this screenshot belongs to
    const now = new Date();
    const currentMinute = now.getMinutes();
    const windowStartMinute = Math.floor(currentMinute / 10) * 10;
    const windowEndMinute = windowStartMinute + 10;
    
    // Calculate the time range for the 10-minute window
    const windowStart = new Date(now);
    windowStart.setMinutes(windowStartMinute);
    windowStart.setSeconds(0);
    windowStart.setMilliseconds(0);
    
    const windowEnd = new Date(windowStart);
    windowEnd.setMinutes(windowEndMinute);
    windowEnd.setSeconds(0);
    windowEnd.setMilliseconds(0);
    
    console.log(`Screenshot window: ${windowStart.toLocaleTimeString()} - ${windowEnd.toLocaleTimeString()}`);
    
    // Get activity periods for this 10-minute window
    // This includes periods that may not have completed yet
    let relatedPeriods = await this.db.getActivityPeriodsForTimeRange(
      currentActivity.sessionId, 
      windowStart, 
      windowEnd
    );
    
    // Create placeholder periods for future minutes in the window if they don't exist yet
    // For example, if screenshot is at 17:28:06, we need periods for 17:28-17:29 and 17:29-17:30
    const expectedPeriods = [];
    for (let minute = windowStartMinute; minute < windowEndMinute; minute++) {
      const periodStart = new Date(windowStart);
      periodStart.setMinutes(minute);
      periodStart.setSeconds(0);
      periodStart.setMilliseconds(0);
      const periodEnd = new Date(periodStart);
      periodEnd.setMinutes(minute + 1);
      periodEnd.setSeconds(0);
      periodEnd.setMilliseconds(0);
      expectedPeriods.push({ start: periodStart, end: periodEnd });
    }
    
    // Check which periods are missing and create placeholders for ALL future periods in the window
    for (const expected of expectedPeriods) {
      const exists = relatedPeriods.some(p => {
        // Check if periods match within 1 second tolerance
        const startDiff = Math.abs(p.periodStart - expected.start.getTime());
        const endDiff = Math.abs(p.periodEnd - expected.end.getTime());
        return startDiff < 1000 && endDiff < 1000;
      });
      
      if (!exists) {
        // Create placeholder period for ALL periods in the window, not just past ones
        // This ensures future periods are associated with the correct screenshot
        console.log(`Creating placeholder period for ${expected.start.toLocaleTimeString()}-${expected.end.toLocaleTimeString()}`);
        const placeholderPeriod = await this.db.createActivityPeriod({
          mode: session?.mode || 'command_hours',
          projectId: session?.projectId,
          task: session?.task,
          sessionId: currentActivity.sessionId,
          startTime: expected.start,
          endTime: expected.end,
          activityScore: 0,
          isValid: true
        });
        if (placeholderPeriod) {
          relatedPeriods.push(placeholderPeriod);
        }
      }
    }
    
    // Ensure we have unique periods based on normalized timestamps
    const uniquePeriods = Array.from(new Map(relatedPeriods.map(p => {
      // Normalize to seconds to group periods with slight millisecond differences
      const key = `${Math.floor(p.periodStart/1000)}-${Math.floor(p.periodEnd/1000)}`;
      return [key, p];
    })).values());
    
    // Calculate aggregated score from these periods
    const totalScore = uniquePeriods.reduce((sum, period) => sum + (period.activityScore || 0), 0);
    const aggregatedScore = uniquePeriods.length > 0 ? Math.round(totalScore / uniquePeriods.length) : 0;
    
    const relatedPeriodIds = uniquePeriods.map(p => p.id);
    console.log(`Screenshot capturing ${uniquePeriods.length} unique activity periods for window`);
    console.log(`Period time ranges: ${uniquePeriods.map(p => 
      `${new Date(p.periodStart).toLocaleTimeString()}-${new Date(p.periodEnd).toLocaleTimeString()}`
    ).join(', ')}`);
    console.log(`Aggregated activity score from ${uniquePeriods.length} periods: ${aggregatedScore}`);
    
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
      // Note: We pass relatedPeriodIds which are the 10 activity periods this screenshot covers
      const screenshotData = {
        localPath,
        thumbnailPath,
        capturedAt: captureTimestamp,  // Use local capture time
        activityScore: aggregatedScore,  // Use aggregated score from 10 periods
        relatedPeriodIds: relatedPeriodIds,  // Store the 10 related period IDs that belong to this screenshot
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