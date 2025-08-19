"use strict";
class BrowserActivityTracker {
    constructor() {
        this.activeTab = null;
        this.tabActivities = new Map();
        this.desktopAppPort = 7824;
        this.ws = null;
        this.reconnectInterval = null;
        this.setupTracking();
        this.connectToDesktopApp();
    }
    setupTracking() {
        chrome.tabs.onActivated.addListener(async (activeInfo) => {
            await this.handleTabSwitch(activeInfo.tabId);
        });
        chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.active) {
                await this.handleTabUpdate(tab);
            }
        });
        chrome.windows.onFocusChanged.addListener(async (windowId) => {
            if (windowId === chrome.windows.WINDOW_ID_NONE) {
                this.recordActivity();
                this.activeTab = null;
            }
            else {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab) {
                    await this.handleTabSwitch(tab.id);
                }
            }
        });
        setInterval(() => {
            this.sendActivityReport();
        }, 30000);
    }
    async handleTabSwitch(tabId) {
        this.recordActivity();
        const tab = await chrome.tabs.get(tabId);
        if (tab.url) {
            this.activeTab = {
                url: tab.url,
                domain: this.extractDomain(tab.url),
                title: tab.title || '',
                startTime: Date.now(),
                category: this.categorizeUrl(tab.url)
            };
        }
    }
    async handleTabUpdate(tab) {
        if (tab.url && this.activeTab) {
            this.activeTab.url = tab.url;
            this.activeTab.domain = this.extractDomain(tab.url);
            this.activeTab.title = tab.title || '';
            this.activeTab.category = this.categorizeUrl(tab.url);
        }
    }
    recordActivity() {
        if (!this.activeTab)
            return;
        const duration = Date.now() - this.activeTab.startTime;
        if (duration < 1000)
            return;
        const existingActivity = this.tabActivities.get(Date.now());
        if (existingActivity) {
            this.tabActivities.set(Date.now(), {
                ...this.activeTab,
                startTime: duration
            });
        }
        else {
            this.tabActivities.set(Date.now(), {
                ...this.activeTab,
                startTime: duration
            });
        }
    }
    categorizeUrl(url) {
        const domain = this.extractDomain(url);
        const developmentDomains = [
            'localhost',
            '127.0.0.1',
            'github.com',
            'gitlab.com',
            'bitbucket.org',
            'stackoverflow.com',
            'netlify.app',
            'vercel.app',
            'amplify.aws',
            'aws.amazon.com',
            'console.cloud.google.com',
            'azure.microsoft.com'
        ];
        const projectRelatedDomains = [
            'jira.',
            'confluence.',
            'slack.com',
            'teams.microsoft.com',
            'notion.so',
            'linear.app',
            'asana.com',
            'trello.com'
        ];
        const researchDomains = [
            'developer.mozilla.org',
            'w3schools.com',
            'medium.com',
            'dev.to',
            'css-tricks.com',
            'smashingmagazine.com',
            'nodejs.org',
            'reactjs.org',
            'vuejs.org',
            'angular.io',
            'typescriptlang.org',
            'npmjs.com',
            'pypi.org',
            'rubygems.org'
        ];
        if (developmentDomains.some(d => domain.includes(d))) {
            return 'development';
        }
        if (projectRelatedDomains.some(d => domain.includes(d))) {
            return 'project_related';
        }
        if (researchDomains.some(d => domain.includes(d))) {
            return 'research';
        }
        if (url.includes('pull') || url.includes('/pr/') || url.includes('merge_requests')) {
            return 'development';
        }
        return 'other';
    }
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        }
        catch {
            return '';
        }
    }
    connectToDesktopApp() {
        try {
            this.ws = new WebSocket(`ws://localhost:${this.desktopAppPort}`);
            this.ws.onopen = () => {
                console.log('Connected to desktop app');
                if (this.reconnectInterval) {
                    clearInterval(this.reconnectInterval);
                    this.reconnectInterval = null;
                }
            };
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            this.ws.onclose = () => {
                console.log('Disconnected from desktop app');
                this.scheduleReconnect();
            };
        }
        catch (error) {
            console.error('Failed to connect to desktop app:', error);
            this.scheduleReconnect();
        }
    }
    scheduleReconnect() {
        if (!this.reconnectInterval) {
            this.reconnectInterval = window.setInterval(() => {
                this.connectToDesktopApp();
            }, 5000);
        }
    }
    sendActivityReport() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN)
            return;
        this.recordActivity();
        const activities = Array.from(this.tabActivities.values());
        if (activities.length === 0)
            return;
        this.ws.send(JSON.stringify({
            type: 'browser_activity',
            data: {
                activities,
                timestamp: Date.now()
            }
        }));
        this.tabActivities.clear();
    }
}
const tracker = new BrowserActivityTracker();
//# sourceMappingURL=background.js.map