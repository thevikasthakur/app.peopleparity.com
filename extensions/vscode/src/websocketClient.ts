import WebSocket from 'ws';

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private reconnectInterval: NodeJS.Timer | null = null;
    private isConnected = false;
    
    constructor(private port: number) {}
    
    connect() {
        try {
            this.ws = new WebSocket(`ws://localhost:${this.port}`);
            
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
        } catch (error) {
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
    
    private scheduleReconnect() {
        if (!this.reconnectInterval) {
            this.reconnectInterval = setInterval(() => {
                this.connect();
            }, 5000);
        }
    }
    
    send(data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
    
    getConnectionStatus() {
        return this.isConnected;
    }
}