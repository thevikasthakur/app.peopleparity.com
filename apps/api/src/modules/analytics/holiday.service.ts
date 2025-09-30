import { Injectable } from '@nestjs/common';

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

// Embedded holiday configuration
const HOLIDAY_CONFIG: HolidayConfig = {
  "2025": {
    "fixedHolidays": [
      { "date": "2025-01-26", "name": "Republic Day", "type": "national" },
      { "date": "2025-03-14", "name": "Holi", "type": "festival" },
      { "date": "2025-03-31", "name": "Eid-ul-Fitr", "type": "festival" },
      { "date": "2025-08-09", "name": "Raksha Bandhan", "type": "festival" },
      { "date": "2025-08-15", "name": "Independence Day", "type": "national" },
      { "date": "2025-10-02", "name": "Gandhi Jayanti", "type": "national" },
      { "date": "2025-10-20", "name": "Diwali (Lakshmi Puja)", "type": "festival" },
      { "date": "2025-10-21", "name": "Diwali (Govardhan Puja)", "type": "festival" },
      { "date": "2025-12-25", "name": "Christmas", "type": "festival" }
    ],
    "finalHolidayList": [
      "2025-01-26", "2025-03-14", "2025-03-31", "2025-08-09",
      "2025-08-15", "2025-10-02", "2025-10-20", "2025-10-21", "2025-12-25"
    ]
  },
  "2026": {
    "fixedHolidays": [
      { "date": "2026-01-26", "name": "Republic Day", "type": "national" },
      { "date": "2026-03-10", "name": "Holi", "type": "festival" },
      { "date": "2026-03-31", "name": "Eid-ul-Fitr", "type": "festival" },
      { "date": "2026-08-03", "name": "Raksha Bandhan", "type": "festival" },
      { "date": "2026-08-15", "name": "Independence Day", "type": "national" },
      { "date": "2026-10-02", "name": "Gandhi Jayanti", "type": "national" },
      { "date": "2026-10-20", "name": "Diwali (Lakshmi Puja)", "type": "festival" },
      { "date": "2026-10-21", "name": "Diwali (Govardhan Puja)", "type": "festival" },
      { "date": "2026-12-25", "name": "Christmas", "type": "festival" }
    ],
    "finalHolidayList": [
      "2026-01-26", "2026-03-10", "2026-03-31", "2026-04-13",
      "2026-08-03", "2026-08-15", "2026-10-02", "2026-10-20",
      "2026-10-21", "2026-11-06", "2026-12-25"
    ]
  }
};

@Injectable()
export class HolidayService {
  private holidayConfig: HolidayConfig = HOLIDAY_CONFIG;

  constructor() {
    console.log(`📅 Holiday config loaded for years: ${Object.keys(this.holidayConfig).join(', ')}`);
  }

  /**
   * Check if a given date's week has a holiday (simple boolean check)
   */
  hasHolidayInWeek(date: Date): boolean {
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
        threeQuarterAttendance: 6.75,
        fullAttendance: 9,
        maxScale: 12,
        isHolidayWeek: false
      };
    }
  }

  /**
   * Get all holidays for a given year
   */
  getHolidaysForYear(year: number): Holiday[] {
    const yearStr = year.toString();
    if (!this.holidayConfig[yearStr]) return [];
    return this.holidayConfig[yearStr].fixedHolidays || [];
  }

  /**
   * Get holidays in a date range
   */
  getHolidaysInRange(startDate: Date, endDate: Date): Holiday[] {
    const holidays: Holiday[] = [];
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    for (let year = startYear; year <= endYear; year++) {
      const yearHolidays = this.getHolidaysForYear(year);
      const filteredHolidays = yearHolidays.filter(holiday => {
        const holidayDate = new Date(holiday.date);
        return holidayDate >= startDate && holidayDate <= endDate;
      });
      holidays.push(...filteredHolidays);
    }

    return holidays;
  }

  /**
   * Check if a specific date is a holiday
   */
  isHoliday(date: Date): boolean {
    const year = date.getFullYear().toString();
    if (!this.holidayConfig[year]) return false;

    const holidays = this.holidayConfig[year].finalHolidayList || [];
    const dateStr = date.toISOString().split('T')[0];

    return holidays.includes(dateStr);
  }

  /**
   * Get manager message based on productive hours and holiday status
   */
  getManagerMessage(productiveHours: number, date: Date = new Date()): string {
    const hasHoliday = this.hasHolidayInWeek(date);
    const markers = this.getScaleMarkers(date);

    // Check if it's weekend
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    if (isWeekend) {
      if (productiveHours > 0) {
        return "Great weekend work! Every hour counts towards your weekly marathon.";
      }
      return "Weekend time! Rest well or add some extra hours to your weekly total.";
    }

    if (hasHoliday) {
      if (productiveHours >= markers.fullAttendance) {
        return "🎉 Outstanding work during holiday week! Full attendance achieved!";
      } else if (productiveHours >= markers.threeQuarterAttendance) {
        return "🎉 Great progress during holiday week! Keep pushing!";
      } else if (productiveHours >= markers.halfAttendance) {
        return "🎉 Good start during holiday week. You can do more!";
      } else {
        return "🎉 Holiday week - adjusted targets applied. Let's get started!";
      }
    }

    // Regular week messages
    if (productiveHours >= markers.fullAttendance) {
      return "Excellent work! Full attendance achieved!";
    } else if (productiveHours >= markers.threeQuarterAttendance) {
      return "Great progress! Keep it up!";
    } else if (productiveHours >= markers.halfAttendance) {
      return "Good start! Push for more!";
    } else {
      return "Let's get started and build momentum!";
    }
  }

  /**
   * Get attendance status based on productive hours
   */
  getAttendanceStatus(productiveHours: number, date: Date = new Date()) {
    const markers = this.getScaleMarkers(date);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    if (isWeekend) {
      return {
        earned: 0,
        status: "Weekend Hours",
        color: "#9333ea",
        isWeekend: true
      };
    }

    return {
      earned: productiveHours >= markers.fullAttendance ? 100 :
              productiveHours >= markers.threeQuarterAttendance ? 75 :
              productiveHours >= markers.halfAttendance ? 50 : 0,
      status: productiveHours >= markers.fullAttendance ? "Full Attendance" :
              productiveHours >= markers.threeQuarterAttendance ? "Good Day" :
              productiveHours >= markers.halfAttendance ? "Half Day" : "No Attendance",
      color: productiveHours >= markers.fullAttendance ? "#10b981" :
             productiveHours >= markers.threeQuarterAttendance ? "#3b82f6" :
             productiveHours >= markers.halfAttendance ? "#f59e0b" : "#ef4444",
      isWeekend: false
    };
  }
}