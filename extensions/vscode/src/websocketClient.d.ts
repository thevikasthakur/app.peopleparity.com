export declare class WebSocketClient {
    private port;
    private ws;
    private reconnectInterval;
    private isConnected;
    constructor(port: number);
    connect(): void;
    disconnect(): void;
    private scheduleReconnect;
    send(data: any): void;
    getConnectionStatus(): boolean;
}
//# sourceMappingURL=websocketClient.d.ts.map