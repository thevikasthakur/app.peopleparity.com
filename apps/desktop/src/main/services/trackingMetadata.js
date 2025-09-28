"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingMetadataService = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const os = __importStar(require("os"));
const https = __importStar(require("https"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class TrackingMetadataService {
    constructor() {
        this.cachedMetadata = {};
        this.lastFetch = 0;
        this.CACHE_DURATION = 1000; // 1 second - reduced for testing
    }
    static getInstance() {
        if (!TrackingMetadataService.instance) {
            TrackingMetadataService.instance = new TrackingMetadataService();
        }
        return TrackingMetadataService.instance;
    }
    /**
     * Get device information (hostname)
     */
    getDeviceInfo() {
        return os.hostname();
    }
    /**
     * Detect VPN by checking for common VPN indicators
     */
    async detectVPN() {
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
                }
                catch (e) {
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
                }
                catch (e) {
                    // Routing check failed, continue
                }
            }
            return false;
        }
        catch (error) {
            console.error('Error detecting VPN:', error);
            return false;
        }
    }
    /**
     * Get real IP address using multiple methods to bypass VPN
     */
    async getRealIPAddress() {
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
                .map(result => result.value)
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
        }
        catch (error) {
            console.error('Error getting real IP:', error);
            return null;
        }
    }
    /**
     * Get location if permission is granted
     */
    async getLocation() {
        try {
            // For Electron apps, we need to request permission through the renderer process
            // This is a simplified version - in production, you'd handle this through IPC
            // Try to get location from IP-based geolocation as fallback
            const ipLocation = await this.getIPBasedLocation();
            return ipLocation;
        }
        catch (error) {
            console.error('Error getting location:', error);
            return null;
        }
    }
    /**
     * Get all tracking metadata
     */
    async getTrackingMetadata() {
        // Check cache
        if (Date.now() - this.lastFetch < this.CACHE_DURATION && Object.keys(this.cachedMetadata).length > 0) {
            return this.cachedMetadata;
        }
        const [isVpnDetected, realIpAddress, location] = await Promise.all([
            this.detectVPN(),
            this.getRealIPAddress(),
            this.getLocation()
        ]);
        const metadata = {
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
    async getLocalIPViaWebRTC() {
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
        }
        catch (error) {
            return null;
        }
    }
    fetchIPFromService(url, field) {
        return new Promise((resolve) => {
            https.get(url, { timeout: 3000 }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json[field] || null);
                    }
                    catch {
                        resolve(null);
                    }
                });
            }).on('error', () => resolve(null));
        });
    }
    isPrivateIP(ip) {
        const parts = ip.split('.').map(Number);
        return (parts[0] === 10 ||
            (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
            (parts[0] === 192 && parts[1] === 168) ||
            parts[0] === 127);
    }
    async getIPBasedLocation() {
        try {
            const response = await this.fetchLocationFromService('https://ipapi.co/json/');
            return response;
        }
        catch {
            return null;
        }
    }
    fetchLocationFromService(url) {
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
                        }
                        else {
                            resolve(null);
                        }
                    }
                    catch {
                        resolve(null);
                    }
                });
            }).on('error', () => resolve(null));
        });
    }
}
exports.TrackingMetadataService = TrackingMetadataService;
//# sourceMappingURL=trackingMetadata.js.map