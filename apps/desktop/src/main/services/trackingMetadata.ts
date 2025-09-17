import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as https from 'https';
import { app } from 'electron';

const execAsync = promisify(exec);

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

export class TrackingMetadataService {
  private static instance: TrackingMetadataService;
  private cachedMetadata: Partial<TrackingMetadata> = {};
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 1000; // 1 second - reduced for testing

  static getInstance(): TrackingMetadataService {
    if (!TrackingMetadataService.instance) {
      TrackingMetadataService.instance = new TrackingMetadataService();
    }
    return TrackingMetadataService.instance;
  }

  /**
   * Get device information (hostname)
   */
  getDeviceInfo(): string {
    return os.hostname();
  }

  /**
   * Detect VPN by checking for common VPN indicators
   */
  async detectVPN(): Promise<boolean> {
    try {
      // Check for common VPN network interfaces
      const interfaces = os.networkInterfaces();
      const vpnIndicators = ['tun', 'tap', 'ppp', 'ipsec', 'vpn', 'wg'];
      
      for (const [name] of Object.entries(interfaces)) {
        const lowerName = name.toLowerCase();
        if (vpnIndicators.some(indicator => lowerName.includes(indicator))) {
          return true;
        }
      }

      // Check DNS servers for known VPN providers
      if (process.platform === 'darwin' || process.platform === 'linux') {
        try {
          const { stdout } = await execAsync('cat /etc/resolv.conf 2>/dev/null | grep nameserver');
          const knownVPNDNS = [
            '10.', // Common VPN internal DNS
            '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.',
            '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', // Private ranges often used by VPNs
            '192.168.', // Private range
          ];
          
          if (knownVPNDNS.some(dns => stdout.includes(dns))) {
            return true;
          }
        } catch (e) {
          // DNS check failed, continue
        }
      }

      // Check routing table for VPN gateways
      if (process.platform === 'darwin') {
        try {
          const { stdout } = await execAsync('netstat -nr | grep -E "^0\\.0\\.0\\.0|^default"');
          // Check if default gateway is through a VPN interface
          if (stdout.toLowerCase().includes('utun') || stdout.toLowerCase().includes('ppp')) {
            return true;
          }
        } catch (e) {
          // Routing check failed, continue
        }
      }

      return false;
    } catch (error) {
      console.error('Error detecting VPN:', error);
      return false;
    }
  }

  /**
   * Get real IP address using multiple methods to bypass VPN
   */
  async getRealIPAddress(): Promise<string | null> {
    try {
      // Method 1: Use WebRTC to get local IP (can sometimes bypass VPN)
      const localIP = await this.getLocalIPViaWebRTC();
      
      // Method 2: Use multiple IP detection services and compare
      const externalIPs = await Promise.allSettled([
        this.fetchIPFromService('https://api.ipify.org?format=json', 'ip'),
        this.fetchIPFromService('https://api.my-ip.io/v2/ip.json', 'ip'),
        this.fetchIPFromService('https://ipinfo.io/json', 'ip'),
      ]);

      const ips = externalIPs
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<string>).value)
        .filter(ip => ip !== null);

      // If all services return the same IP, it's likely the real one
      if (ips.length > 0 && new Set(ips).size === 1) {
        return ips[0];
      }

      // If we have a local IP and it's not a private IP, return it
      if (localIP && !this.isPrivateIP(localIP)) {
        return localIP;
      }

      // Return the most common IP
      return ips.length > 0 ? ips[0] : null;
    } catch (error) {
      console.error('Error getting real IP:', error);
      return null;
    }
  }

  /**
   * Get location if permission is granted
   */
  async getLocation(): Promise<Location | null> {
    try {
      // For Electron apps, we need to request permission through the renderer process
      // This is a simplified version - in production, you'd handle this through IPC
      
      // Try to get location from IP-based geolocation as fallback
      const ipLocation = await this.getIPBasedLocation();
      return ipLocation;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  }

  /**
   * Get all tracking metadata
   */
  async getTrackingMetadata(): Promise<TrackingMetadata> {
    // Check cache
    if (Date.now() - this.lastFetch < this.CACHE_DURATION && Object.keys(this.cachedMetadata).length > 0) {
      return this.cachedMetadata as TrackingMetadata;
    }

    const [isVpnDetected, realIpAddress, location] = await Promise.all([
      this.detectVPN(),
      this.getRealIPAddress(),
      this.getLocation()
    ]);

    const metadata: TrackingMetadata = {
      deviceInfo: this.getDeviceInfo(),
      realIpAddress,
      location,
      isVpnDetected
    };

    this.cachedMetadata = metadata;
    this.lastFetch = Date.now();

    return metadata;
  }

  // Helper methods
  
  private async getLocalIPViaWebRTC(): Promise<string | null> {
    try {
      // This would typically be done in the renderer process
      // For now, we'll use network interfaces as a fallback
      const interfaces = os.networkInterfaces();
      for (const [, addresses] of Object.entries(interfaces)) {
        if (addresses) {
          for (const addr of addresses) {
            if (addr.family === 'IPv4' && !addr.internal) {
              return addr.address;
            }
          }
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private fetchIPFromService(url: string, field: string): Promise<string | null> {
    return new Promise((resolve) => {
      https.get(url, { timeout: 3000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json[field] || null);
          } catch {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
  }

  private isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    return (
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 127
    );
  }

  private async getIPBasedLocation(): Promise<Location | null> {
    try {
      const response = await this.fetchLocationFromService('https://ipapi.co/json/');
      return response;
    } catch {
      return null;
    }
  }

  private fetchLocationFromService(url: string): Promise<Location | null> {
    return new Promise((resolve) => {
      https.get(url, { timeout: 3000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.latitude && json.longitude) {
              resolve({
                lat: parseFloat(json.latitude),
                lon: parseFloat(json.longitude)
              });
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
  }
}