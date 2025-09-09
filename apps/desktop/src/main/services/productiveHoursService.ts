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
    // Get stats for the specified date from the database
    // This already filters periods based on activity scores:
    // - Counts periods with activityScore >= 4.0 (Poor, Fair, Good)
    // - Counts Critical periods (2.5-4.0) if adjacent to better periods or average hour is >= 4.0
    // - Excludes Inactive periods (< 2.5)
    console.log('Calculating productive hours for userId:', userId, 'date:', date.toISOString());
    const dateStats = this.db.getDateStats(userId, date);
    console.log('Date stats from DB:', dateStats);
    
    // Total productive hours (already filtered by activity level)
    const productiveHours = dateStats.clientHours + dateStats.commandHours;
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
  async calculateWeeklyHours(userId: string, date: Date = new Date()): Promise<number> {
    const weekStats = this.db.getWeekStatsForDate(userId, date);
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
   * Get daily hours breakdown for the week
   */
  async getDailyHoursForWeek(userId: string, date: Date): Promise<{ hours: number; isFuture: boolean }[]> {
    const db = this.db as any;
    // Use UTC for week calculation
    const startOfWeek = new Date(date);
    startOfWeek.setUTCDate(date.getUTCDate() - date.getUTCDay());
    startOfWeek.setUTCHours(0, 0, 0, 0);
    
    // Get current UTC date for future day check
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));
    
    const dailyData: { hours: number; isFuture: boolean }[] = [];
    
    // Get hours for each day (Mon-Fri)
    for (let i = 1; i <= 5; i++) { // 1=Monday, 5=Friday
      const dayStart = new Date(startOfWeek);
      dayStart.setUTCDate(startOfWeek.getUTCDate() + i);
      
      // Check if this day is in the future (in UTC)
      const isFuture = dayStart > todayUTC;
      
      const dayStats = db.getDateStats(userId, dayStart);
      dailyData.push({
        hours: dayStats.totalHours,
        isFuture
      });
    }
    
    return dailyData;
  }
  
  /**
   * Calculate attendance status for a day
   */
  getDayAttendanceStatus(hours: number, isHolidayWeek: boolean, weekTotal: number = 0, isFuture: boolean = false): {
    status: 'absent' | 'half' | 'good' | 'full' | 'extra' | 'future';
    label: string;
    color: string;
  } {
    // If it's a future day, return future status
    if (isFuture) {
      return { status: 'future', label: 'Upcoming', color: '#9ca3af' }; // gray
    }
    
    // Apply 33.33% relaxation if week total >= 45 hours
    const relaxation = weekTotal >= 45 ? 0.6667 : 1.0; // 33.33% reduction = multiply by 0.6667
    
    const thresholds = isHolidayWeek ? {
      half: 5.5 * relaxation,
      good: 8 * relaxation,
      full: 10.5 * relaxation
    } : {
      half: 4.5 * relaxation,
      good: 7 * relaxation,
      full: 9 * relaxation
    };
    
    if (hours >= thresholds.full) {
      if (hours > thresholds.full) {
        return { status: 'extra', label: 'Extra', color: '#9333ea' }; // purple
      }
      return { status: 'full', label: 'Full', color: '#10b981' }; // green
    } else if (hours >= thresholds.good) {
      return { status: 'good', label: 'Good', color: '#3b82f6' }; // blue
    } else if (hours >= thresholds.half) {
      return { status: 'half', label: 'Half', color: '#f59e0b' }; // amber
    } else {
      return { status: 'absent', label: 'Absent', color: '#ef4444' }; // red
    }
  }
  
  /**
   * Calculate weekly attendance
   */
  calculateWeeklyAttendance(hours: number, markers: any, dailyData?: { hours: number; isFuture: boolean }[]): {
    totalHours: number;
    extraHours: number;
    status: string;
    color: string;
    dailyStatuses?: any[];
  } {
    const fullWeekTarget = markers.dailyTarget * markers.workingDays;
    
    // Calculate daily statuses if daily data provided
    let dailyStatuses: any[] = [];
    if (dailyData && dailyData.length === 5) {
      const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      dailyStatuses = dailyData.map((data, index) => {
        const dayStatus = this.getDayAttendanceStatus(data.hours, markers.hasHoliday, hours, data.isFuture);
        return {
          day: dayLabels[index],
          hours: data.hours,
          isFuture: data.isFuture,
          ...dayStatus
        };
      });
    }
    
    // Determine overall week status based on total hours
    let status = '';
    let color = '';
    
    if (hours >= fullWeekTarget) {
      status = `${hours.toFixed(1)} hours (Full Week)`;
      color = '#10b981'; // green
    } else if (hours >= fullWeekTarget * 0.75) {
      status = `${hours.toFixed(1)} hours`;
      color = '#3b82f6'; // blue
    } else if (hours >= fullWeekTarget * 0.5) {
      status = `${hours.toFixed(1)} hours`;
      color = '#f59e0b'; // amber
    } else if (hours > 0) {
      status = `${hours.toFixed(1)} hours`;
      color = '#ef4444'; // red
    } else {
      status = 'No hours';
      color = '#6b7280'; // gray
    }
    
    return {
      totalHours: hours,
      extraHours: Math.max(0, hours - fullWeekTarget),
      status,
      color,
      dailyStatuses
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