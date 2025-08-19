"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketClient = void 0;
const ws_1 = __importDefault(require("ws"));
class WebSocketClient {
    constructor(port) {
        this.port = port;
        this.ws = null;
        this.reconnectInterval = null;
        this.isConnected = false;
    }
    connect() {
        try {
            this.ws = new ws_1.default(`ws://localhost:${this.port}`);
            this.ws.on('open', () => {
                console.log('Connected to desktop app');
                this.isConnected = true;
                if (this.reconnectInterval) {
                    clearInterval(this.reconnectInterval);
                    this.reconnectInterval = null;
                }
            });
            this.ws.on('error', (error) => {
                console.error('WebSocket error:', error);
            });
            this.ws.on('close', () => {
                console.log('Disconnected from desktop app');
                this.isConnected = false;
                this.scheduleReconnect();
            });
        }
        catch (error) {
            console.error('Failed to connect:', error);
            this.scheduleReconnect();
        }
    }
    disconnect() {
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
    scheduleReconnect() {
        if (!this.reconnectInterval) {
            this.reconnectInterval = setInterval(() => {
                this.connect();
            }, 5000);
        }
    }
    send(data) {
        if (this.ws && this.ws.readyState === ws_1.default.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
    getConnectionStatus() {
        return this.isConnected;
    }
}
exports.WebSocketClient = WebSocketClient;
//# sourceMappingURL=websocketClient.js.map