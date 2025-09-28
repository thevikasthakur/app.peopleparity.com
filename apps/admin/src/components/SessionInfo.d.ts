interface Session {
    id: string;
    userId: string;
    userName?: string;
    startTime: string;
    endTime?: string;
    mode: 'client' | 'command';
    activityName?: string;
    task?: string;
}
interface SessionInfoProps {
    session: Session;
}
export declare function SessionInfo({ session }: SessionInfoProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=SessionInfo.d.ts.map