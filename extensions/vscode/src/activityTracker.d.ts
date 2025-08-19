import * as vscode from 'vscode';
import { WebSocketClient } from './websocketClient';
interface ActivityStats {
    codeCommitsCount: number;
    filesSavedCount: number;
    caretMovedCount: number;
    textSelectionsCount: number;
    filesOpenedCount: number;
    tabsSwitchedCount: number;
    netLinesCount: number;
    copilotSuggestionsAccepted: number;
}
export declare class ActivityTracker implements vscode.Disposable {
    private wsClient;
    private disposables;
    private stats;
    private periodStartTime;
    private lastDocumentContent;
    private reportInterval;
    constructor(wsClient: WebSocketClient);
    private setupTracking;
    private onFileSaved;
    private onFileOpened;
    private onTabSwitched;
    private onSelectionChanged;
    private onDocumentChanged;
    private calculateLineChanges;
    private trackGitCommits;
    private trackCopilot;
    private reportActivity;
    private resetStats;
    getCurrentStats(): ActivityStats;
    dispose(): void;
}
export {};
//# sourceMappingURL=activityTracker.d.ts.map