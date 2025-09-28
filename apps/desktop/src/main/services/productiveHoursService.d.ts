import { DatabaseService } from './databaseService';
export declare class ProductiveHoursService {
    private db;
    private holidayConfig;
    constructor(db: DatabaseService);
    private loadHolidayConfig;
    /**
     * Check if a given date has a holiday
     */
    private hasHolidayInWeek;
    /**
     * Get scale markers based on whether there's a holiday in the week
     */
    getScaleMarkers(date?: Date): {
        halfAttendance: number;
        threeQuarterAttendance: number;
        fullAttendance: number;
        maxScale: number;
        isHolidayWeek: boolean;
    };
    /**
     * Calculate productive hours from the database stats
     * The getTodayStats already filters based on activity scores
     */
    calculateProductiveHours(userId: string, date?: Date): Promise<number>;
    /**
     * Get manager message based on context
     */
    getHustleMessage(hours: number, markers: any, lastActivityScore?: number): string;
    /**
     * Get attendance status based on productive hours
     */
    getAttendanceStatus(hours: number, markers: any, date?: Date): {
        earned: number;
        status: string;
        color: string;
        isWeekend?: boolean;
    };
    /**
     * Calculate weekly productive hours
     */
    calculateWeeklyHours(userId: string, date?: Date): Promise<number>;
    /**
     * Check if current week has holidays
     */
    private hasHolidayInCurrentWeek;
    /**
     * Get weekly markers and attendance calculation
     */
    getWeeklyMarkers(): {
        dailyTarget: number;
        maxScale: number;
        hasHoliday: boolean;
        holidayCount: number;
        workingDays: number;
    };
    /**
     * Get daily hours breakdown for the week
     */
    getDailyHoursForWeek(userId: string, date: Date): Promise<{
        hours: number;
        isFuture: boolean;
        isWeekend: boolean;
    }[]>;
    /**
     * Calculate attendance status for a day
     */
    getDayAttendanceStatus(hours: number, isHolidayWeek: boolean, weekTotal?: number, isFuture?: boolean, isCurrentDay?: boolean, isWeekend?: boolean): {
        status: 'absent' | 'half' | 'good' | 'full' | 'extra' | 'future' | 'in-progress' | 'weekend';
        label: string;
        color: string;
        potentialStatus?: 'half' | 'good' | 'full';
        potentialLabel?: string;
    };
    /**
     * Calculate weekly attendance
     */
    calculateWeeklyAttendance(hours: number, markers: any, dailyData?: {
        hours: number;
        isFuture: boolean;
        isWeekend?: boolean;
    }[], selectedDate?: Date): {
        totalHours: number;
        extraHours: number;
        status: string;
        color: string;
        dailyStatuses?: any[];
    };
    /**
     * Get weekly marathon message
     */
    getWeeklyMessage(hours: number, attendance: any, markers: any): string;
}
//# sourceMappingURL=productiveHoursService.d.ts.map