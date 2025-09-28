export declare class PermissionsService {
    /**
     * Request all required permissions for tracking
     * Returns true if all permissions are granted
     */
    requestAllPermissions(): Promise<boolean>;
    /**
     * Check the status of required permissions
     */
    checkPermissions(): Promise<Record<string, "granted" | "denied" | "not-determined">>;
    /**
     * Check if screen recording permission is granted
     */
    private checkScreenRecordingPermission;
    /**
     * Check if accessibility permission is granted
     */
    private checkAccessibilityPermission;
    /**
     * Request a specific permission
     */
    requestPermission(permissionId: string): Promise<boolean>;
    /**
     * Request screen recording permission
     */
    private requestScreenRecordingPermission;
    /**
     * Request accessibility permission
     */
    private requestAccessibilityPermission;
    /**
     * Open system preferences to a specific pane
     */
    openSystemPreferences(pane: string): Promise<void>;
    /**
     * Check if the app needs to be restarted after permission changes
     */
    needsRestart(): boolean;
}
//# sourceMappingURL=permissionsService.d.ts.map