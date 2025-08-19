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

export class ActivityTracker implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
    private stats: ActivityStats;
    private periodStartTime: Date;
    private lastDocumentContent: Map<string, string> = new Map();
    private reportInterval: NodeJS.Timer;
    
    constructor(private wsClient: WebSocketClient) {
        this.stats = this.resetStats();
        this.periodStartTime = new Date();
        this.setupTracking();
        
        this.reportInterval = setInterval(() => {
            this.reportActivity();
        }, 30000);
    }
    
    private setupTracking() {
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument(this.onFileSaved.bind(this)),
            vscode.workspace.onDidOpenTextDocument(this.onFileOpened.bind(this)),
            vscode.window.onDidChangeActiveTextEditor(this.onTabSwitched.bind(this)),
            vscode.window.onDidChangeTextEditorSelection(this.onSelectionChanged.bind(this)),
            vscode.workspace.onDidChangeTextDocument(this.onDocumentChanged.bind(this))
        );
        
        this.trackGitCommits();
        this.trackCopilot();
    }
    
    private onFileSaved(document: vscode.TextDocument) {
        this.stats.filesSavedCount++;
        this.calculateLineChanges(document);
    }
    
    private onFileOpened(document: vscode.TextDocument) {
        if (document.uri.scheme === 'file') {
            this.stats.filesOpenedCount++;
            this.lastDocumentContent.set(document.uri.toString(), document.getText());
        }
    }
    
    private onTabSwitched(editor: vscode.TextEditor | undefined) {
        if (editor) {
            this.stats.tabsSwitchedCount++;
        }
    }
    
    private onSelectionChanged(event: vscode.TextEditorSelectionChangeEvent) {
        if (event.kind === vscode.TextEditorSelectionChangeKind.Mouse ||
            event.kind === vscode.TextEditorSelectionChangeKind.Keyboard) {
            this.stats.textSelectionsCount++;
        }
        
        this.stats.caretMovedCount++;
    }
    
    private onDocumentChanged(event: vscode.TextDocumentChangeEvent) {
        if (event.document.uri.scheme !== 'file') return;
        
        event.contentChanges.forEach(change => {
            const linesAdded = (change.text.match(/\n/g) || []).length;
            const linesRemoved = change.range.end.line - change.range.start.line;
            this.stats.netLinesCount += (linesAdded - linesRemoved);
        });
    }
    
    private calculateLineChanges(document: vscode.TextDocument) {
        const uri = document.uri.toString();
        const previousContent = this.lastDocumentContent.get(uri);
        
        if (previousContent) {
            const prevLines = previousContent.split('\n').length;
            const currentLines = document.getText().split('\n').length;
            this.stats.netLinesCount += Math.abs(currentLines - prevLines);
        }
        
        this.lastDocumentContent.set(uri, document.getText());
    }
    
    private async trackGitCommits() {
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (!gitExtension) return;
        
        const git = gitExtension.exports;
        const api = git.getAPI(1);
        
        api.repositories.forEach(repo => {
            repo.state.onDidChange(() => {
                const headCommit = repo.state.HEAD?.commit;
                if (headCommit) {
                    this.stats.codeCommitsCount++;
                }
            });
        });
    }
    
    private trackCopilot() {
        const copilotExtension = vscode.extensions.getExtension('GitHub.copilot');
        if (!copilotExtension) return;
        
        vscode.workspace.onDidChangeTextDocument(event => {
            event.contentChanges.forEach(change => {
                if (change.text.length > 50) {
                    this.stats.copilotSuggestionsAccepted++;
                }
            });
        });
    }
    
    private reportActivity() {
        if (!this.wsClient.isConnected()) return;
        
        const now = new Date();
        const periodMinutes = (now.getTime() - this.periodStartTime.getTime()) / 60000;
        
        if (periodMinutes >= 10) {
            this.wsClient.send({
                type: 'vscode_activity',
                data: {
                    ...this.stats,
                    periodStart: this.periodStartTime,
                    periodEnd: now
                }
            });
            
            this.stats = this.resetStats();
            this.periodStartTime = now;
        }
    }
    
    private resetStats(): ActivityStats {
        return {
            codeCommitsCount: 0,
            filesSavedCount: 0,
            caretMovedCount: 0,
            textSelectionsCount: 0,
            filesOpenedCount: 0,
            tabsSwitchedCount: 0,
            netLinesCount: 0,
            copilotSuggestionsAccepted: 0
        };
    }
    
    getCurrentStats(): ActivityStats {
        return { ...this.stats };
    }
    
    dispose() {
        clearInterval(this.reportInterval);
        this.disposables.forEach(d => d.dispose());
    }
}