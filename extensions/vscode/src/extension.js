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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const activityTracker_1 = require("./activityTracker");
const websocketClient_1 = require("./websocketClient");
let activityTracker;
let wsClient;
function activate(context) {
    console.log('Time Tracker VS Code Extension activated');
    const config = vscode.workspace.getConfiguration('timeTracker');
    const port = config.get('desktopAppPort', 7823);
    wsClient = new websocketClient_1.WebSocketClient(port);
    activityTracker = new activityTracker_1.ActivityTracker(wsClient);
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
        vscode.window.showInformationMessage(`Time Tracker Status: ${status}\n` +
            `Files saved: ${stats.filesSavedCount}\n` +
            `Lines changed: ${stats.netLinesCount}\n` +
            `Commits: ${stats.codeCommitsCount}`);
    });
    context.subscriptions.push(connectCommand, disconnectCommand, statusCommand);
    context.subscriptions.push(activityTracker);
    wsClient.connect();
}
function deactivate() {
    if (wsClient) {
        wsClient.disconnect();
    }
    if (activityTracker) {
        activityTracker.dispose();
    }
}
//# sourceMappingURL=extension.js.map