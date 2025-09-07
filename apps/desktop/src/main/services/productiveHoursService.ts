import { DatabaseService } from './databaseService';
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
   * Get playful/sarcastic message based on hustle level
   */
  getHustleMessage(hours: number, markers: any): string {
    const percentage = (hours / markers.fullAttendance) * 100;

    if (hours === 0) {
      return "🦥 Are you even here? The couch misses you less than we do!";
    } else if (hours < markers.halfAttendance) {
      return `😴 ${hours.toFixed(1)}h? That's not hustle, that's a coffee break gone rogue!`;
    } else if (hours < markers.threeQuarterAttendance) {
      return `🐢 ${hours.toFixed(1)}h - Moving at turtle speed, but hey, at least you're moving!`;
    } else if (hours < markers.fullAttendance) {
      return `🏃 ${hours.toFixed(1)}h - Almost there! Just a bit more to earn your full stripes!`;
    } else if (hours === markers.fullAttendance) {
      return `🎯 ${hours.toFixed(1)}h - Perfect attendance! You've earned your badge of honor!`;
    } else if (hours <= 11) {
      return `🚀 ${hours.toFixed(1)}h - Overachiever alert! Someone's gunning for employee of the month!`;
    } else if (hours <= 12) {
      return `🔥 ${hours.toFixed(1)}h - On fire! But remember, even machines need oil breaks!`;
    } else {
      return `⚡ ${hours.toFixed(1)}h - LEGENDARY! Did you forget what your home looks like?`;
    }
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
    const percentage = (attendance.daysEarned / markers.workingDays) * 100;
    
    if (hours === 0) {
      return "🎯 The week is young, time to build momentum!";
    } else if (percentage < 20) {
      return `📅 ${hours.toFixed(1)}h - Every marathon starts with a single step!`;
    } else if (percentage < 40) {
      return `🏃 ${hours.toFixed(1)}h - Picking up pace! Keep the momentum going!`;
    } else if (percentage < 60) {
      return `💪 ${hours.toFixed(1)}h - Halfway there! You're crushing it!`;
    } else if (percentage < 80) {
      return `🚀 ${hours.toFixed(1)}h - Strong week! The finish line is in sight!`;
    } else if (percentage < 100) {
      return `🔥 ${hours.toFixed(1)}h - Almost there! Push for that perfect week!`;
    } else if (percentage === 100) {
      return `🏆 ${hours.toFixed(1)}h - PERFECT WEEK! You're a productivity champion!`;
    } else {
      return `⚡ ${hours.toFixed(1)}h - LEGENDARY WEEK! You've gone beyond and above!`;
    }
  }
}