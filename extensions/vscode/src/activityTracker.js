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
exports.ActivityTracker = void 0;
const vscode = __importStar(require("vscode"));
class ActivityTracker {
    constructor(wsClient) {
        this.wsClient = wsClient;
        this.disposables = [];
        this.lastDocumentContent = new Map();
        this.stats = this.resetStats();
        this.periodStartTime = new Date();
        this.setupTracking();
        this.reportInterval = setInterval(() => {
            this.reportActivity();
        }, 30000);
    }
    setupTracking() {
        this.disposables.push(vscode.workspace.onDidSaveTextDocument(this.onFileSaved.bind(this)), vscode.workspace.onDidOpenTextDocument(this.onFileOpened.bind(this)), vscode.window.onDidChangeActiveTextEditor(this.onTabSwitched.bind(this)), vscode.window.onDidChangeTextEditorSelection(this.onSelectionChanged.bind(this)), vscode.workspace.onDidChangeTextDocument(this.onDocumentChanged.bind(this)));
        this.trackGitCommits();
        this.trackCopilot();
    }
    onFileSaved(document) {
        this.stats.filesSavedCount++;
        this.calculateLineChanges(document);
    }
    onFileOpened(document) {
        if (document.uri.scheme === 'file') {
            this.stats.filesOpenedCount++;
            this.lastDocumentContent.set(document.uri.toString(), document.getText());
        }
    }
    onTabSwitched(editor) {
        if (editor) {
            this.stats.tabsSwitchedCount++;
        }
    }
    onSelectionChanged(event) {
        if (event.kind === vscode.TextEditorSelectionChangeKind.Mouse ||
            event.kind === vscode.TextEditorSelectionChangeKind.Keyboard) {
            this.stats.textSelectionsCount++;
        }
        this.stats.caretMovedCount++;
    }
    onDocumentChanged(event) {
        if (event.document.uri.scheme !== 'file')
            return;
        event.contentChanges.forEach(change => {
            const linesAdded = (change.text.match(/\n/g) || []).length;
            const linesRemoved = change.range.end.line - change.range.start.line;
            this.stats.netLinesCount += (linesAdded - linesRemoved);
        });
    }
    calculateLineChanges(document) {
        const uri = document.uri.toString();
        const previousContent = this.lastDocumentContent.get(uri);
        if (previousContent) {
            const prevLines = previousContent.split('\n').length;
            const currentLines = document.getText().split('\n').length;
            this.stats.netLinesCount += Math.abs(currentLines - prevLines);
        }
        this.lastDocumentContent.set(uri, document.getText());
    }
    async trackGitCommits() {
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (!gitExtension)
            return;
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
    trackCopilot() {
        const copilotExtension = vscode.extensions.getExtension('GitHub.copilot');
        if (!copilotExtension)
            return;
        vscode.workspace.onDidChangeTextDocument(event => {
            event.contentChanges.forEach(change => {
                if (change.text.length > 50) {
                    this.stats.copilotSuggestionsAccepted++;
                }
            });
        });
    }
    reportActivity() {
        if (!this.wsClient.isConnected())
            return;
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
    resetStats() {
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
    getCurrentStats() {
        return { ...this.stats };
    }
    dispose() {
        clearInterval(this.reportInterval);
        this.disposables.forEach(d => d.dispose());
    }
}
exports.ActivityTracker = ActivityTracker;
//# sourceMappingURL=activityTracker.js.map