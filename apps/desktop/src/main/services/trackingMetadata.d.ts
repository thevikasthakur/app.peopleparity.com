interface Location {
    lat: number;
    lon: number;
}
interface TrackingMetadata {
    deviceInfo: string;
    realIpAddress: string | null;
    location: Location | null;
    isVpnDetected: boolean;
}
export declare class TrackingMetadataService {
    private static instance;
    private cachedMetadata;
    private lastFetch;
    private readonly CACHE_DURATION;
    static getInstance(): TrackingMetadataService;
    /**
     * Get device information (hostname)
     */
    getDeviceInfo(): string;
    /**
     * Detect VPN by checking for common VPN indicators
     */
    detectVPN(): Promise<boolean>;
    /**
     * Get real IP address using multiple methods to bypass VPN
     */
    getRealIPAddress(): Promise<string | null>;
    /**
     * Get location if permission is granted
     */
    getLocation(): Promise<Location | null>;
    /**
     * Get all tracking metadata
     */
    getTrackingMetadata(): Promise<TrackingMetadata>;
    private getLocalIPViaWebRTC;
    private fetchIPFromService;
    private isPrivateIP;
    private getIPBasedLocation;
    private fetchLocationFromService;
}
export {};
//# sourceMappingURL=trackingMetadata.d.ts.map