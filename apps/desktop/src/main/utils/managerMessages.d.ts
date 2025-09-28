interface MessageContext {
    currentHour: number;
    dayOfWeek: number;
    dayOfMonth: number;
    month: number;
    trackedHoursToday: number;
    trackedHoursWeek: number;
    lastActivityScore: number;
    isHolidayWeek: boolean;
    currentSessionMinutes: number;
    targetDailyHours: number;
    targetWeeklyHours: number;
}
export declare function getManagerMessage(context: MessageContext): string;
export declare function getWeeklyMarathonMessage(context: MessageContext): string;
export declare function getCurrentSessionMessage(sessionMinutes: number, activityScore: number): string;
export {};
//# sourceMappingURL=managerMessages.d.ts.map