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
      // Try multiple paths for development and production
      const possiblePaths = [
        path.join(__dirname, '../config/holidays.json'), // Compiled dist path
        path.join(__dirname, '../../config/holidays.json'),
        path.join(__dirname, '../../../src/config/holidays.json'),
        path.join(__dirname, '../../src/config/holidays.json'),
        path.join(process.cwd(), 'src/config/holidays.json'),
        path.join(process.cwd(), 'apps/desktop/src/config/holidays.json'),
      ];

      let configData: string | null = null;
      for (const configPath of possiblePaths) {
        if (fs.existsSync(configPath)) {
          configData = fs.readFileSync(configPath, 'utf-8');
          console.log(`✅ Loaded holiday config from: ${configPath}`);
          break;
        }
      }

      if (configData) {
        this.holidayConfig = JSON.parse(configData);
        console.log(`📅 Holiday config loaded for years: ${Object.keys(this.holidayConfig).join(', ')}`);
      } else {
        console.warn('⚠️ Holiday config file not found in any expected location');
        console.log('Tried paths:', possiblePaths);
        this.holidayConfig = {};
      }
    } catch (error) {
      console.error('Failed to load holiday config:', error);
      this.holidayConfig = {};
    }
  }

  /**
   * Check if a given date's week has a holiday (simple boolean check)
   */
  private hasHolidayInWeekSimple(date: Date): boolean {
    const year = date.getFullYear().toString();
    if (!this.holidayConfig[year]) return false;

    const holidays = this.holidayConfig[year].finalHolidayList || [];

    // Get start and end of the week (Monday as first day)
    const weekStart = new Date(date);
    const dayOfWeek = date.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday (0), go back 6 days to Monday
    weekStart.setDate(date.getDate() - daysToMonday);
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
    const hasHoliday = this.hasHolidayInWeekSimple(date);

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
    console.log('[ProductiveHours] Date:', date.toISOString(), 'Client hours:', dateStats.clientHours, 'Command hours:', dateStats.commandHours, 'Total productive hours:', productiveHours);
    
    return productiveHours;
  }


  /**
   * Get manager message based on context
   */
  getHustleMessage(hours: number, markers: any, lastActivityScore: number = 5): string {
    const now = new Date();
    const festivalsInWeek = this.getFestivalsInWeek(now);
    const context = {
      currentHour: now.getUTCHours(),
      dayOfWeek: now.getUTCDay(),
      dayOfMonth: now.getUTCDate(),
      month: now.getUTCMonth() + 1,
      trackedHoursToday: hours,
      trackedHoursWeek: 0, // Will be calculated separately for weekly
      lastActivityScore: lastActivityScore,
      isHolidayWeek: markers.isHolidayWeek || false,
      currentSessionMinutes: 0, // Will be passed from session
      targetDailyHours: markers.fullAttendance || 8,
      targetWeeklyHours: 40,
      festivalsInWeek // Pass actual festivals from config
    };

    return getManagerMessage(context);
  }

  /**
   * Get attendance status based on productive hours
   */
  getAttendanceStatus(hours: number, markers: any, date: Date = new Date()): {
    earned: number;
    status: string;
    color: string;
    isWeekend?: boolean;
  } {
    // Check if it's a weekend
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6

    if (isWeekend) {
      // Weekends don't award attendance
      return {
        earned: 0,
        status: 'Weekend Hours',
        color: '#8b5cf6', // purple - distinguishing weekend work
        isWeekend: true
      };
    }

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
   * Check if specific week has holidays
   */
  private hasHolidayInWeek(date: Date = new Date()): { hasHoliday: boolean; holidayCount: number } {
    const year = date.getFullYear().toString();

    if (!this.holidayConfig[year]) {
      return { hasHoliday: false, holidayCount: 0 };
    }

    const holidays = this.holidayConfig[year].finalHolidayList || [];

    // Get start of the week (Monday)
    const weekStart = new Date(date);
    const dayOfWeek = date.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday (0), go back 6 days to Monday
    weekStart.setDate(date.getDate() - daysToMonday);
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
   * Check if current week has holidays
   */
  private hasHolidayInCurrentWeek(): boolean {
    return this.hasHolidayInWeekSimple(new Date());
  }

  /**
   * Get weekly markers and attendance calculation
   */
  getWeeklyMarkers(date: Date = new Date()) {
    const { hasHoliday, holidayCount } = this.hasHolidayInWeek(date);
    const workingDays = 5 - holidayCount; // 5 weekdays minus holidays
    const dailyTarget = hasHoliday ? 10.5 : 9;

    console.log(`📊 Weekly Markers for week of ${date.toDateString()}:`, {
      hasHoliday,
      holidayCount,
      workingDays,
      dailyTarget
    });

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
  async getDailyHoursForWeek(userId: string, date: Date): Promise<{ hours: number; isFuture: boolean; isWeekend: boolean }[]> {
    const db = this.db as any;
    // Use UTC for week calculation (Monday as first day)
    const startOfWeek = new Date(date);
    const dayOfWeek = date.getUTCDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday (0), go back 6 days to Monday
    startOfWeek.setUTCDate(date.getUTCDate() - daysToMonday);
    startOfWeek.setUTCHours(0, 0, 0, 0);
    
    // Get current UTC date for future day check
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));
    
    const dailyData: { hours: number; isFuture: boolean; isWeekend: boolean }[] = [];
    
    // Get hours for all 7 days (Mon-Sun) - Monday is now day 0
    for (let i = 0; i <= 6; i++) { // 0=Monday, 6=Sunday
      const dayStart = new Date(startOfWeek);
      dayStart.setUTCDate(startOfWeek.getUTCDate() + i);
      
      // Check if this day is in the future (in UTC)
      const isFuture = dayStart > todayUTC;
      
      // Check if this is weekend (Saturday=5, Sunday=6)
      const isWeekend = i >= 5;
      
      const dayStats = db.getDateStats(userId, dayStart);
      dailyData.push({
        hours: dayStats.totalHours,
        isFuture,
        isWeekend
      });
    }
    
    return dailyData;
  }
  
  /**
   * Calculate attendance status for a day
   */
  getDayAttendanceStatus(hours: number, isHolidayWeek: boolean, weekTotal: number = 0, isFuture: boolean = false, isCurrentDay: boolean = false, isWeekend: boolean = false): {
    status: 'absent' | 'half' | 'good' | 'full' | 'extra' | 'future' | 'in-progress' | 'weekend';
    label: string;
    color: string;
    potentialStatus?: 'half' | 'good' | 'full';
    potentialLabel?: string;
  } {
    // If it's a weekend day, return weekend status
    if (isWeekend) {
      return { status: 'weekend', label: 'Weekend', color: '#6b7280' }; // gray
    }
    
    // If it's a future day, return future status
    if (isFuture) {
      return { status: 'future', label: 'Upcoming', color: '#9ca3af' }; // gray
    }
    
    // Special handling for current day
    if (isCurrentDay) {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Before 2 PM (14:00), show as "In Progress" unless they have good hours already
      if (currentHour < 14) {
        // If they already have significant hours, show actual status
        if (hours >= 4.5) {
          // Fall through to normal calculation
        } else {
          // Show as "In Progress" with current hours
          return { 
            status: 'in-progress', 
            label: 'In Progress', 
            color: '#6b7280' // neutral gray
          };
        }
      }
      // After 2 PM, use normal status calculation
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
    
    // Calculate thresholds with potential relaxation (if week reaches 45 hours)
    const potentialThresholds = isHolidayWeek ? {
      half: 5.5 * 0.6667,
      good: 8 * 0.6667,
      full: 10.5 * 0.6667
    } : {
      half: 3.0, // Exactly 3.0 hours (4.5 * 0.6667)
      good: 4.67,   // 7 * 0.6667
      full: 6.0    // 9 * 0.6667
    };
    
    // Determine current status
    let currentStatus: 'absent' | 'half' | 'good' | 'full' | 'extra';
    let currentLabel: string;
    let currentColor: string;
    
    if (hours >= thresholds.full) {
      if (hours > thresholds.full) {
        currentStatus = 'extra';
        currentLabel = 'Extra';
        currentColor = '#9333ea'; // purple
      } else {
        currentStatus = 'full';
        currentLabel = 'Full';
        currentColor = '#10b981'; // green
      }
    } else if (hours >= thresholds.good) {
      currentStatus = 'good';
      currentLabel = 'Good';
      currentColor = '#3b82f6'; // blue
    } else if (hours >= thresholds.half) {
      currentStatus = 'half';
      currentLabel = 'Half';
      currentColor = '#f59e0b'; // amber
    } else {
      currentStatus = 'absent';
      currentLabel = 'Absent';
      currentColor = '#ef4444'; // red
    }
    
    // Calculate potential status if week total is not yet 45 hours
    let potentialStatus: 'half' | 'good' | 'full' | undefined;
    let potentialLabel: string | undefined;
    
    if (weekTotal < 45) {
      // Use a small epsilon for floating point comparison
      const epsilon = 0.01; // Allow for 0.01 hour (36 seconds) tolerance
      
      // Check if hours would result in a better status with relaxation
      if (hours >= potentialThresholds.full - epsilon && currentStatus !== 'full' && currentStatus !== 'extra') {
        potentialStatus = 'full';
        potentialLabel = 'Full*';
      } else if (hours >= potentialThresholds.good - epsilon && (currentStatus === 'absent' || currentStatus === 'half')) {
        potentialStatus = 'good';
        potentialLabel = 'Good*';
      } else if (hours >= potentialThresholds.half - epsilon && currentStatus === 'absent') {
        potentialStatus = 'half';
        potentialLabel = 'Half*';
      }
    }
    
    return { 
      status: currentStatus, 
      label: currentLabel, 
      color: currentColor,
      potentialStatus,
      potentialLabel
    };
  }
  
  /**
   * Calculate weekly attendance
   */
  calculateWeeklyAttendance(hours: number, markers: any, dailyData?: { hours: number; isFuture: boolean; isWeekend?: boolean }[], selectedDate?: Date): {
    totalHours: number;
    extraHours: number;
    status: string;
    color: string;
    dailyStatuses?: any[];
  } {
    const fullWeekTarget = markers.dailyTarget * markers.workingDays;
    
    // Calculate daily statuses if daily data provided
    let dailyStatuses: any[] = [];
    if (dailyData && dailyData.length === 7) {
      const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      // Check if we're looking at the current week
      const now = new Date();
      const weekDate = selectedDate || now;
      
      // Get start of the week being viewed
      const startOfViewedWeek = new Date(weekDate);
      const viewedDayOfWeek = weekDate.getUTCDay();
      const daysToMonday = viewedDayOfWeek === 0 ? 6 : viewedDayOfWeek - 1;
      startOfViewedWeek.setUTCDate(weekDate.getUTCDate() - daysToMonday);
      startOfViewedWeek.setUTCHours(0, 0, 0, 0);
      
      // Get start of current week
      const startOfCurrentWeek = new Date(now);
      const currentDayOfWeek = now.getUTCDay();
      const currentDaysToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
      startOfCurrentWeek.setUTCDate(now.getUTCDate() - currentDaysToMonday);
      startOfCurrentWeek.setUTCHours(0, 0, 0, 0);
      
      // Check if viewing current week
      const isCurrentWeek = startOfViewedWeek.getTime() === startOfCurrentWeek.getTime();
      
      // Get adjusted current day (0=Monday, 6=Sunday)
      const adjustedCurrentDay = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
      
      dailyStatuses = dailyData.map((data, index) => {
        // index 0=Monday, 1=Tuesday, ..., 6=Sunday
        // Only mark as current day if we're viewing the current week AND it's the right day
        const isCurrentDay = isCurrentWeek && index === adjustedCurrentDay && !data.isFuture;
        const isWeekend = data.isWeekend || false;
        
        // Calculate the actual date for this day
        const dayDate = new Date(startOfViewedWeek);
        dayDate.setUTCDate(startOfViewedWeek.getUTCDate() + index);
        
        const dayStatus = this.getDayAttendanceStatus(
          data.hours, 
          markers.hasHoliday, 
          hours, 
          data.isFuture,
          isCurrentDay,
          isWeekend
        );
        return {
          day: dayLabels[index],
          date: dayDate.toISOString(),
          hours: data.hours,
          isFuture: data.isFuture,
          isCurrentDay,
          isWeekend,
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
   * Get festivals in the current week
   */
  getFestivalsInWeek(date: Date = new Date()): { name: string; date: string; isWeekend: boolean }[] {
    const year = date.getFullYear().toString();
    const result: { name: string; date: string; isWeekend: boolean }[] = [];

    if (!this.holidayConfig[year]) {
      return result;
    }

    const holidays = this.holidayConfig[year].fixedHolidays || [];

    // Get start and end of the week (Monday as first day)
    const weekStart = new Date(date);
    const dayOfWeek = date.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(date.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Check each holiday
    holidays.forEach(holiday => {
      const hDate = new Date(holiday.date);
      if (hDate >= weekStart && hDate <= weekEnd) {
        const dayOfWeek = hDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        result.push({
          name: holiday.name,
          date: holiday.date,
          isWeekend
        });
      }
    });

    console.log(`🎉 Festivals in week of ${date.toDateString()}:`, result);
    return result;
  }

  /**
   * Get weekly marathon message
   */
  getWeeklyMessage(hours: number, attendance: any, markers: any): string {
    const now = new Date();
    const targetWeeklyHours = markers.dailyTarget * markers.workingDays;
    const festivalsInWeek = this.getFestivalsInWeek(now);

    const context = {
      currentHour: now.getUTCHours(),
      dayOfWeek: now.getUTCDay(),
      dayOfMonth: now.getUTCDate(),
      month: now.getUTCMonth() + 1,
      trackedHoursToday: 0, // Not relevant for weekly
      trackedHoursWeek: hours,
      lastActivityScore: 5, // Default
      isHolidayWeek: markers.hasHoliday || false,
      currentSessionMinutes: 0,
      targetDailyHours: markers.dailyTarget || 9,
      targetWeeklyHours: targetWeeklyHours || 45,
      festivalsInWeek // Pass actual festivals from config
    };

    return getWeeklyMarathonMessage(context);
  }
}