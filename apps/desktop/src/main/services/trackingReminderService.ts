/**
 * Service to remind users to restart tracking after they've stopped
 * Uses factorial exponential backoff: 10min (10×1!), 20min (10×2!), 60min (10×3!), etc.
 */

import { BrowserWindow, Notification } from 'electron';
import Store from 'electron-store';

export class TrackingReminderService {
  private reminderTimer: NodeJS.Timeout | null = null;
  private reminderCount: number = 0;
  private lastStopTime: Date | null = null;
  private isTracking: boolean = false;
  private store: Store;

  constructor(store: Store) {
    this.store = store;
    // Load saved state
    this.reminderCount = this.store.get('reminderCount', 0) as number;
    const savedStopTime = this.store.get('lastStopTime') as string;
    if (savedStopTime) {
      this.lastStopTime = new Date(savedStopTime);
    }
  }

  /**
   * Called when tracking starts
   */
  onTrackingStarted() {
    console.log('📢 Tracking started, clearing reminders');
    this.isTracking = true;
    this.clearReminders();
  }

  /**
   * Called when tracking stops
   */
  onTrackingStopped() {
    console.log('📢 Tracking stopped, starting reminder timer');
    this.isTracking = false;
    this.lastStopTime = new Date();
    this.reminderCount = 0;

    // Save state
    this.store.set('lastStopTime', this.lastStopTime.toISOString());
    this.store.set('reminderCount', 0);

    this.scheduleNextReminder();
  }

  /**
   * Calculate factorial for reminder intervals
   */
  private factorial(n: number): number {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  /**
   * Schedule the next reminder using factorial exponential backoff
   * First reminder: 10 minutes (10 * 1!)
   * Second reminder: 20 minutes (10 * 2!)
   * Third reminder: 60 minutes (10 * 3!)
   * Fourth reminder: 240 minutes/4 hours (10 * 4!)
   * Fifth reminder: 1200 minutes/20 hours (10 * 5!)
   * etc.
   */
  private scheduleNextReminder() {
    // Clear any existing timer
    if (this.reminderTimer) {
      clearTimeout(this.reminderTimer);
    }

    // Don't schedule if tracking has started
    if (this.isTracking) {
      return;
    }

    // Calculate next reminder time using factorial (10 minutes * (n+1)!)
    const nextReminderNumber = this.reminderCount + 1;
    const factorialValue = this.factorial(nextReminderNumber);
    const nextReminderMinutes = 10 * factorialValue;

    // Cap at 24 hours (1440 minutes) to be reasonable
    const cappedReminderMinutes = Math.min(nextReminderMinutes, 1440);
    const nextReminderMs = cappedReminderMinutes * 60 * 1000;

    console.log(`⏰ Scheduling reminder #${nextReminderNumber} in ${cappedReminderMinutes} minutes (10 * ${nextReminderNumber}! = 10 * ${factorialValue})`);

    this.reminderTimer = setTimeout(() => {
      this.showReminder();
    }, nextReminderMs);
  }

  /**
   * Show the reminder notification
   */
  private showReminder() {
    // Don't show if tracking has started
    if (this.isTracking) {
      return;
    }

    this.reminderCount++;
    this.store.set('reminderCount', this.reminderCount);

    const timeSinceStopped = this.getTimeSinceStoppedString();
    const messages = this.getReminderMessages();
    const message = messages[Math.min(this.reminderCount - 1, messages.length - 1)];

    // Show system notification
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: '⏰ Tracking Reminder',
        body: message.replace('{time}', timeSinceStopped),
        urgency: 'normal',
        timeoutType: 'default'
      });

      notification.on('click', () => {
        // Focus the app window when notification is clicked
        const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          // Send event to show start tracking modal
          mainWindow.webContents.send('show-start-tracking-modal');
        }
      });

      notification.show();
    }

    // Also send to renderer for in-app notification
    const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('tracking-reminder', {
        message: message.replace('{time}', timeSinceStopped),
        reminderCount: this.reminderCount,
        stoppedAt: this.lastStopTime
      });
    }

    // Schedule next reminder
    this.scheduleNextReminder();
  }

  /**
   * Clear all reminders
   */
  private clearReminders() {
    if (this.reminderTimer) {
      clearTimeout(this.reminderTimer);
      this.reminderTimer = null;
    }
    this.reminderCount = 0;
    this.lastStopTime = null;

    // Clear saved state
    this.store.delete('lastStopTime');
    this.store.delete('reminderCount');

    console.log('✅ Reminders cleared');
  }

  /**
   * Get human-readable time since tracking stopped
   */
  private getTimeSinceStoppedString(): string {
    if (!this.lastStopTime) return '';

    const now = new Date();
    const diffMs = now.getTime() - this.lastStopTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes} minutes`;
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diffMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  }

  /**
   * Get reminder messages with increasing urgency
   */
  private getReminderMessages(): string[] {
    return [
      // First reminder (10 min = 10 * 1!)
      "Hey! You stopped tracking {time} ago. Ready to get back to work? 💼",

      // Second reminder (20 min = 10 * 2!)
      "Friendly reminder: Tracking has been off for {time}. Don't forget to turn it back on! 🕐",

      // Third reminder (60 min = 10 * 3!)
      "Break time over? You haven't tracked for {time}. Time to start again! ⏰",

      // Fourth reminder (240 min = 10 * 4!)
      "⚠️ Tracking has been paused for {time}. Your productive hours aren't being recorded!",

      // Fifth+ reminders (1200 min = 10 * 5!)
      "🚨 Still not tracking after {time}! Don't lose your work hours - start tracking now!"
    ];
  }

  /**
   * Restore reminders on app startup if tracking is still stopped
   */
  restoreReminders(isCurrentlyTracking: boolean) {
    const savedStopTime = this.store.get('lastStopTime') as string;
    const savedReminderCount = this.store.get('reminderCount', 0) as number;

    if (savedStopTime && !isCurrentlyTracking) {
      this.lastStopTime = new Date(savedStopTime);
      this.reminderCount = savedReminderCount;
      this.isTracking = false;

      // Calculate time since last stop
      const now = new Date();
      const timeSinceStop = now.getTime() - this.lastStopTime.getTime();
      const minutesSinceStop = timeSinceStop / (1000 * 60);

      // Calculate expected reminders based on time passed using factorial
      let expectedReminders = 0;
      let totalMinutes = 0;
      while (totalMinutes < minutesSinceStop) {
        expectedReminders++;
        const factorialValue = this.factorial(expectedReminders);
        totalMinutes += 10 * factorialValue;
      }

      // Update reminder count if needed
      if (expectedReminders > this.reminderCount) {
        this.reminderCount = expectedReminders - 1;
        this.store.set('reminderCount', this.reminderCount);
      }

      console.log(`📢 Restoring reminders: stopped ${minutesSinceStop.toFixed(0)} minutes ago, ${this.reminderCount} reminders sent`);

      // Schedule next reminder
      this.scheduleNextReminder();
    } else if (isCurrentlyTracking) {
      this.isTracking = true;
      this.clearReminders();
    }
  }

  /**
   * Cleanup
   */
  dispose() {
    this.clearReminders();
  }
}