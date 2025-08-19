"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserExtensionBridge = void 0;
const ws_1 = require("ws");
const events_1 = require("events");
class BrowserExtensionBridge extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.wss = null;
        this.port = 7824;
        this.activities = [];
        this.clients = new Set();
    }
    start() {
        this.wss = new ws_1.WebSocketServer({ port: this.port });
        this.wss.on('connection', (ws) => {
            console.log('Browser extension connected');
            this.clients.add(ws);
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(message);
                }
                catch (error) {
                    console.error('Failed to parse browser message:', error);
                }
            });
            ws.on('close', () => {
                console.log('Browser extension disconnected');
                this.clients.delete(ws);
            });
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.clients.delete(ws);
            });
            // Send initial acknowledgment
            ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
        });
        console.log(`Browser extension bridge listening on port ${this.port}`);
    }
    stop() {
        this.clients.forEach(client => client.close());
        this.clients.clear();
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }
    }
    handleMessage(message) {
        switch (message.type) {
            case 'browser_activity':
                this.processBrowserActivity(message.data);
                break;
            case 'ping':
                // Respond to ping
                this.broadcast({ type: 'pong', timestamp: Date.now() });
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }
    processBrowserActivity(data) {
        // Store activities for the current period
        this.activities.push(...data.activities);
        // Emit event for other services to consume
        this.emit('browser-activity', data.activities);
        // Log for debugging
        console.log(`Received ${data.activities.length} browser activities`);
    }
    handleBrowserActivity(data) {
        // Public method for handling browser activity from IPC
        this.processBrowserActivity(data);
        return { success: true };
    }
    getRecentActivities(minutes = 10) {
        const cutoff = Date.now() - (minutes * 60 * 1000);
        return this.activities.filter(a => a.timestamp > cutoff);
    }
    categorizeActivities() {
        const categories = {
            development: 0,
            projectRelated: 0,
            research: 0,
            other: 0,
        };
        this.activities.forEach(activity => {
            switch (activity.category) {
                case 'development':
                    categories.development += activity.duration;
                    break;
                case 'project_related':
                    categories.projectRelated += activity.duration;
                    break;
                case 'research':
                    categories.research += activity.duration;
                    break;
                default:
                    categories.other += activity.duration;
            }
        });
        return categories;
    }
    clearOldActivities() {
        // Keep only last hour of activities
        const cutoff = Date.now() - (60 * 60 * 1000);
        this.activities = this.activities.filter(a => a.timestamp > cutoff);
    }
    broadcast(message) {
        const data = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
                client.send(data);
            }
        });
    }
}
exports.BrowserExtensionBridge = BrowserExtensionBridge;
//# sourceMappingURL=browserExtensionBridge.js.map