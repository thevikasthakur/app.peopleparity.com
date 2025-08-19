import * as vscode from 'vscode';
import { ActivityTracker } from './activityTracker';
import { WebSocketClient } from './websocketClient';

let activityTracker: ActivityTracker;
let wsClient: WebSocketClient;

export function activate(context: vscode.ExtensionContext) {
    console.log('Time Tracker VS Code Extension activated');
    
    const config = vscode.workspace.getConfiguration('timeTracker');
    const port = config.get<number>('desktopAppPort', 7823);
    
    wsClient = new WebSocketClient(port);
    activityTracker = new ActivityTracker(wsClient);
    
    const connectCommand = vscode.commands.registerCommand('timeTracker.connect', () => {
        wsClient.connect();
        vscode.window.showInformationMessage('Connecting to Time Tracker Desktop App...');
    });
    
    const disconnectCommand = vscode.commands.registerCommand('timeTracker.disconnect', () => {
        wsClient.disconnect();
        vscode.window.showInformationMessage('Disconnected from Time Tracker Desktop App');
    });
    
    const statusCommand = vscode.commands.registerCommand('timeTracker.showStatus', () => {
        const status = wsClient.isConnected() ? 'Connected' : 'Disconnected';
        const stats = activityTracker.getCurrentStats();
        vscode.window.showInformationMessage(
            `Time Tracker Status: ${status}\n` +
            `Files saved: ${stats.filesSavedCount}\n` +
            `Lines changed: ${stats.netLinesCount}\n` +
            `Commits: ${stats.codeCommitsCount}`
        );
    });
    
    context.subscriptions.push(connectCommand, disconnectCommand, statusCommand);
    context.subscriptions.push(activityTracker);
    
    wsClient.connect();
}

export function deactivate() {
    if (wsClient) {
        wsClient.disconnect();
    }
    if (activityTracker) {
        activityTracker.dispose();
    }
}