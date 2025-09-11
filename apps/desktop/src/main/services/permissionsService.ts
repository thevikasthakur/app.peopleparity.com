import { systemPreferences, shell, app } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class PermissionsService {
  /**
   * Request all required permissions for tracking
   * Returns true if all permissions are granted
   */
  async requestAllPermissions(): Promise<boolean> {
    console.log('🔑 Requesting all required permissions...');
    
    // First request accessibility (needed for activity tracking)
    const accessibilityGranted = await this.requestPermission('accessibility');
    console.log('Accessibility permission:', accessibilityGranted ? 'granted' : 'denied');
    
    // Wait a bit to avoid overlapping dialogs
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Then request screen recording (needed for screenshots)
    const screenRecordingGranted = await this.requestPermission('screen-recording');
    console.log('Screen recording permission:', screenRecordingGranted ? 'granted' : 'denied');
    
    return accessibilityGranted && screenRecordingGranted;
  }
  
  /**
   * Check the status of required permissions
   */
  async checkPermissions() {
    const permissions: Record<string, 'granted' | 'denied' | 'not-determined'> = {};
    
    // Check Screen Recording permission
    try {
      const screenRecordingStatus = await this.checkScreenRecordingPermission();
      permissions['screen-recording'] = screenRecordingStatus;
    } catch (error) {
      console.error('Failed to check screen recording permission:', error);
      permissions['screen-recording'] = 'not-determined';
    }
    
    // Check Accessibility permission
    try {
      const accessibilityStatus = await this.checkAccessibilityPermission();
      permissions['accessibility'] = accessibilityStatus;
    } catch (error) {
      console.error('Failed to check accessibility permission:', error);
      permissions['accessibility'] = 'not-determined';
    }
    
    return permissions;
  }
  
  /**
   * Check if screen recording permission is granted
   */
  private async checkScreenRecordingPermission(): Promise<'granted' | 'denied' | 'not-determined'> {
    if (process.platform !== 'darwin') {
      return 'granted'; // Not needed on non-macOS platforms
    }
    
    try {
      // Use systemPreferences API if available
      if (systemPreferences.getMediaAccessStatus) {
        // @ts-ignore - 'screen' is valid but not in TypeScript definitions
        const status = systemPreferences.getMediaAccessStatus('screen');
        console.log('Screen recording permission check:', status);
        return status as 'granted' | 'denied' | 'not-determined';
      }
      
      // Don't use screencapture for checking as it may trigger permission dialog
      // Instead, we'll return 'not-determined' if we can't check via API
      console.log('Screen recording permission check: API not available, returning not-determined');
      return 'not-determined';
    } catch (error: any) {
      console.error('Failed to check screen recording permission:', error);
      return 'not-determined';
    }
  }
  
  /**
   * Check if accessibility permission is granted
   */
  private async checkAccessibilityPermission(): Promise<'granted' | 'denied' | 'not-determined'> {
    if (process.platform !== 'darwin') {
      return 'granted'; // Not needed on non-macOS platforms
    }
    
    try {
      // IMPORTANT: Pass false to avoid triggering the permission dialog
      // We only want to check, not request
      const isTrusted = systemPreferences.isTrustedAccessibilityClient(false);
      console.log('Accessibility permission check:', isTrusted ? 'granted' : 'denied');
      return isTrusted ? 'granted' : 'denied';
    } catch (error) {
      console.error('Failed to check accessibility permission:', error);
      return 'not-determined';
    }
  }
  
  /**
   * Request a specific permission
   */
  async requestPermission(permissionId: string): Promise<boolean> {
    if (process.platform !== 'darwin') {
      return true; // Not needed on non-macOS platforms
    }
    
    switch (permissionId) {
      case 'screen-recording':
        return this.requestScreenRecordingPermission();
      case 'accessibility':
        return this.requestAccessibilityPermission();
      default:
        return false;
    }
  }
  
  /**
   * Request screen recording permission
   */
  private async requestScreenRecordingPermission(): Promise<boolean> {
    console.log('Screen recording permission request initiated');
    
    try {
      // Check current status first
      const currentStatus = await this.checkScreenRecordingPermission();
      if (currentStatus === 'granted') {
        console.log('Screen recording permission already granted');
        return true;
      }
      
      // Try to trigger the permission dialog by attempting a screenshot
      // This will show the system permission dialog if not yet shown
      try {
        await execAsync('screencapture -x -C -t png /tmp/permission_test.png');
        await execAsync('rm -f /tmp/permission_test.png').catch(() => {});
        
        // Check again after attempt
        const newStatus = await this.checkScreenRecordingPermission();
        if (newStatus === 'granted') {
          return true;
        }
      } catch (captureError) {
        console.log('Screenshot attempt failed, likely needs permission');
      }
      
      // If still not granted, open System Preferences
      await this.openSystemPreferences('privacy-screen-recording');
      
      return false; // User needs to manually grant in System Preferences
    } catch (error) {
      console.error('Failed to request screen recording permission:', error);
      return false;
    }
  }
  
  /**
   * Request accessibility permission
   */
  private async requestAccessibilityPermission(): Promise<boolean> {
    console.log('Accessibility permission request initiated');
    
    try {
      // This will prompt the user if not already granted
      // The 'true' parameter triggers the system dialog
      const isTrusted = systemPreferences.isTrustedAccessibilityClient(true);
      console.log('Accessibility permission status:', isTrusted ? 'granted' : 'denied');
      
      if (!isTrusted) {
        // Also open System Preferences for user convenience
        await this.openSystemPreferences('privacy-accessibility');
      }
      
      return isTrusted;
    } catch (error) {
      console.error('Failed to request accessibility permission:', error);
      return false;
    }
  }
  
  /**
   * Open system preferences to a specific pane
   */
  async openSystemPreferences(pane: string): Promise<void> {
    if (process.platform !== 'darwin') {
      return;
    }
    
    try {
      let url = '';
      
      switch (pane) {
        case 'privacy-screen-recording':
          url = 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture';
          break;
        case 'privacy-accessibility':
          url = 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility';
          break;
        default:
          url = 'x-apple.systempreferences:com.apple.preference.security?Privacy';
      }
      
      await shell.openExternal(url);
    } catch (error) {
      console.error('Failed to open system preferences:', error);
      // Fallback to opening general privacy settings
      try {
        await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy');
      } catch (fallbackError) {
        console.error('Failed to open privacy settings:', fallbackError);
      }
    }
  }
  
  /**
   * Check if the app needs to be restarted after permission changes
   */
  needsRestart(): boolean {
    // Generally, apps need to be restarted after permission changes on macOS
    return process.platform === 'darwin';
  }
}