import { DatabaseService } from './databaseService';
import { getManagerMessage, getWeeklyMarathonMessage, getCurrentSessionMessage } from '../utils/managerMessages';
import * as fs from 'fs';
import * as path from 'path';

interface Holiday {
  date: string;
  name: string;
  type: string;
}

interface HolidayConfig {
  [year: string]: {
    fixedHolidays: Holiday[];
    finalHolidayList: string[];
  };
}

export class ProductiveHoursService {
  private holidayConfig: HolidayConfig = {};

  constructor(private db: DatabaseService) {
    this.loadHolidayConfig();
  }

  private loadHolidayConfig() {
    try {
      const configPath = path.join(__dirname, '../../config/holidays.json');
      const configData = fs.readFileSync(configPath, 'utf-8');
      this.holidayConfig = JSON.parse(configData);
    } catch (error) {
      console.error('Failed to load holiday config:', error);
      this.holidayConfig = {};
    }
  }

  /**
   * Check if a given date has a holiday
   */
  private hasHolidayInWeek(date: Date): boolean {
    const year = date.getFullYear().toString();
    if (!this.holidayConfig[year]) return false;

    const holidays = this.holidayConfig[year].finalHolidayList || [];
    
    // Get start and end of the week
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Saturday
    weekEnd.setHours(23, 59, 59, 999);

    // Check if any holiday falls in this week
    return holidays.some(holidayDate => {
      const hDate = new Date(holidayDate);
      return hDate >= weekStart && hDate <= weekEnd;
    });
  }

  /**
   * Get scale markers based on whether there's a holiday in the week
   */
  getScaleMarkers(date: Date = new Date()) {
    const hasHoliday = this.hasHolidayInWeek(date);
    
    if (hasHoliday) {
      return {
        halfAttendance: 5.5,
        threeQuarterAttendance: 8,
        fullAttendance: 10.5,
        maxScale: 13,
        isHolidayWeek: true
      };
    } else {
      return {
        halfAttendance: 4.5,
        threeQuarterAttendance: 7,
        fullAttendance: 9,
        maxScale: 13,
        isHolidayWeek: false
      };
    }
  }

  /**
   * Calculate productive hours from the database stats
   * The getTodayStats already filters based on activity scores
   */
  async calculateProductiveHours(userId: string, date: Date = new Date()): Promise<number> {
    // Get today's stats from the database
    // This already filters periods based on activity scores:
    // - Counts periods with activityScore >= 4.0 (Poor, Fair, Good)
    // - Counts Critical periods (2.5-4.0) if adjacent to better periods or average hour is >= 4.0
    // - Excludes Inactive periods (< 2.5)
    console.log('Calculating productive hours for userId:', userId, 'date:', date.toISOString());
    const todayStats = this.db.getTodayStats(userId);
    console.log('Today stats from DB:', todayStats);
    
    // Total productive hours (already filtered by activity level)
    const productiveHours = todayStats.clientHours + todayStats.commandHours;
    console.log('Total productive hours:', productiveHours);
    
    return productiveHours;
  }


  /**
   * Get manager message based on context
   */
  getHustleMessage(hours: number, markers: any, lastActivityScore: number = 5): string {
    const now = new Date();
    const context = {
      currentHour: now.getHours(),
      dayOfWeek: now.getDay(),
      dayOfMonth: now.getDate(),
      month: now.getMonth() + 1,
      trackedHoursToday: hours,
      trackedHoursWeek: 0, // Will be calculated separately for weekly
      lastActivityScore: lastActivityScore,
      isHolidayWeek: markers.isHolidayWeek || false,
      currentSessionMinutes: 0, // Will be passed from session
      targetDailyHours: markers.fullAttendance || 8,
      targetWeeklyHours: 40
    };

    return getManagerMessage(context);
  }

  /**
   * Get attendance status based on productive hours
   */
  getAttendanceStatus(hours: number, markers: any): {
    earned: number;
    status: string;
    color: string;
  } {
    if (hours >= markers.fullAttendance) {
      return {
        earned: 1.0,
        status: 'Full Attendance',
        color: '#10b981' // green
      };
    } else if (hours >= markers.threeQuarterAttendance) {
      return {
        earned: 0.75,
        status: '3/4 Attendance',
        color: '#f59e0b' // amber
      };
    } else if (hours >= markers.halfAttendance) {
      return {
        earned: 0.5,
        status: 'Half Attendance',
        color: '#ef4444' // red
      };
    } else {
      return {
        earned: 0,
        status: 'No Attendance',
        color: '#6b7280' // gray
      };
    }
  }

  /**
   * Calculate weekly productive hours
   */
  async calculateWeeklyHours(userId: string): Promise<number> {
    const weekStats = this.db.getWeekStats(userId);
    const productiveHours = weekStats.clientHours + weekStats.commandHours;
    return productiveHours;
  }

  /**
   * Check if current week has holidays
   */
  private hasHolidayInCurrentWeek(): { hasHoliday: boolean; holidayCount: number } {
    const now = new Date();
    const year = now.getFullYear().toString();
    
    if (!this.holidayConfig[year]) {
      return { hasHoliday: false, holidayCount: 0 };
    }

    const holidays = this.holidayConfig[year].finalHolidayList || [];
    
    // Get start of the week (Sunday)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    // Get end of the week (Saturday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Count holidays in this week
    let holidayCount = 0;
    holidays.forEach(holidayDate => {
      const hDate = new Date(holidayDate);
      if (hDate >= weekStart && hDate <= weekEnd) {
        // Only count if it's a weekday (Mon-Fri)
        const dayOfWeek = hDate.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          holidayCount++;
        }
      }
    });

    return { hasHoliday: holidayCount > 0, holidayCount };
  }

  /**
   * Get weekly markers and attendance calculation
   */
  getWeeklyMarkers() {
    const { hasHoliday, holidayCount } = this.hasHolidayInCurrentWeek();
    const workingDays = 5 - holidayCount; // 5 weekdays minus holidays
    const dailyTarget = hasHoliday ? 10.5 : 9;
    
    return {
      dailyTarget,
      maxScale: 45,
      hasHoliday,
      holidayCount,
      workingDays
    };
  }

  /**
   * Calculate weekly attendance
   */
  calculateWeeklyAttendance(hours: number, markers: any): {
    daysEarned: number;
    extraHours: number;
    status: string;
    color: string;
  } {
    const fullWeekTarget = markers.dailyTarget * markers.workingDays;
    let daysEarned = 0;
    let remainingHours = hours;
    
    // Calculate full days earned
    if (remainingHours >= fullWeekTarget) {
      daysEarned = markers.workingDays;
      remainingHours = hours - fullWeekTarget;
    } else {
      daysEarned = Math.floor(remainingHours / markers.dailyTarget);
      remainingHours = remainingHours % markers.dailyTarget;
      
      // Calculate partial day from remaining hours
      if (remainingHours >= 8) {
        daysEarned += 0.75;
      } else if (remainingHours >= 5.5) {
        daysEarned += 0.5;
      } else if (remainingHours >= 4.5 && !markers.hasHoliday) {
        // In non-holiday weeks, 4.5h = 0.5 day
        daysEarned += 0.5;
      }
    }
    
    // Determine status and color
    let status = '';
    let color = '';
    
    if (daysEarned >= markers.workingDays) {
      status = `Full Week (${markers.workingDays} days)`;
      color = '#10b981'; // green
    } else if (daysEarned >= 3) {
      status = `${daysEarned.toFixed(2)} days`;
      color = '#3b82f6'; // blue
    } else if (daysEarned >= 1) {
      status = `${daysEarned.toFixed(2)} days`;
      color = '#f59e0b'; // amber
    } else if (daysEarned > 0) {
      status = `${daysEarned.toFixed(2)} days`;
      color = '#ef4444'; // red
    } else {
      status = 'No days earned';
      color = '#6b7280'; // gray
    }
    
    return {
      daysEarned,
      extraHours: Math.max(0, hours - fullWeekTarget),
      status,
      color
    };
  }

  /**
   * Get weekly marathon message
   */
  getWeeklyMessage(hours: number, attendance: any, markers: any): string {
    const now = new Date();
    const targetWeeklyHours = markers.dailyTarget * markers.workingDays;
    
    const context = {
      currentHour: now.getHours(),
      dayOfWeek: now.getDay(),
      dayOfMonth: now.getDate(),
      month: now.getMonth() + 1,
      trackedHoursToday: 0, // Not relevant for weekly
      trackedHoursWeek: hours,
      lastActivityScore: 5, // Default
      isHolidayWeek: markers.hasHoliday || false,
      currentSessionMinutes: 0,
      targetDailyHours: markers.dailyTarget || 9,
      targetWeeklyHours: targetWeeklyHours || 45
    };

    return getWeeklyMarathonMessage(context);
  }
}