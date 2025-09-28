"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    auth: {
        login: (email, password) => electron_1.ipcRenderer.invoke('auth:login', email, password),
        logout: () => electron_1.ipcRenderer.invoke('auth:logout'),
        checkSession: () => electron_1.ipcRenderer.invoke('auth:check-session'),
        verifyToken: (token) => electron_1.ipcRenderer.invoke('auth:verify-token', token),
        samlLogin: () => electron_1.ipcRenderer.invoke('auth:saml-login'),
    },
    session: {
        start: (mode, task, projectId) => electron_1.ipcRenderer.invoke('session:start', mode, task, projectId),
        stop: () => electron_1.ipcRenderer.invoke('session:stop'),
        switchMode: (mode, task, projectId) => electron_1.ipcRenderer.invoke('session:switch-mode', mode, task, projectId),
        getProductiveInfo: () => electron_1.ipcRenderer.invoke('session:productive-info'),
        getTodaySessions: (dateString) => electron_1.ipcRenderer.invoke('session:today', dateString),
    },
    dashboard: {
        getData: () => electron_1.ipcRenderer.invoke('dashboard:get-data'),
    },
    projects: {
        fetch: () => electron_1.ipcRenderer.invoke('projects:fetch'),
    },
    permissions: {
        check: () => electron_1.ipcRenderer.invoke('permissions:check'),
        request: (permissionId) => electron_1.ipcRenderer.invoke('permissions:request', permissionId),
        requestAll: () => electron_1.ipcRenderer.invoke('permissions:request-all'),
    },
    system: {
        openPreferences: (pane) => electron_1.ipcRenderer.invoke('system:open-preferences', pane),
    },
    screenshots: {
        getToday: () => electron_1.ipcRenderer.invoke('screenshots:get-today'),
        getByDate: (date) => electron_1.ipcRenderer.invoke('screenshots:get-by-date', date.toISOString()),
        updateNotes: (ids, notes) => electron_1.ipcRenderer.invoke('screenshots:update-notes', ids, notes),
        transferMode: (ids, mode) => electron_1.ipcRenderer.invoke('screenshots:transfer-mode', ids, mode),
        delete: (ids) => electron_1.ipcRenderer.invoke('screenshots:delete', ids),
        retrySync: (id) => electron_1.ipcRenderer.invoke('screenshots:retry-sync', id),
        fetchSignedUrl: (id) => electron_1.ipcRenderer.invoke('screenshots:fetch-signed-url', id),
    },
    activity: {
        getPeriodDetails: (periodId) => electron_1.ipcRenderer.invoke('activity:get-period-details', periodId),
        getPeriodsWithMetrics: (periodIds) => electron_1.ipcRenderer.invoke('activity:get-periods-with-metrics', periodIds),
    },
    notes: {
        save: (noteText) => electron_1.ipcRenderer.invoke('notes:save', noteText),
        getRecent: () => electron_1.ipcRenderer.invoke('notes:get-recent'),
    },
    getProductiveHours: (dateString) => electron_1.ipcRenderer.invoke('productive-hours:get', dateString),
    getWeeklyMarathon: (dateString) => electron_1.ipcRenderer.invoke('weekly-marathon:get', dateString),
    getDashboardStats: () => electron_1.ipcRenderer.invoke('dashboard:stats'),
    debug: {
        clearSyncQueue: () => electron_1.ipcRenderer.invoke('debug:clear-sync-queue'),
        clearAllData: () => electron_1.ipcRenderer.invoke('debug:clear-all-data'),
        checkForeignKeys: () => electron_1.ipcRenderer.invoke('debug:check-foreign-keys'),
        enableForeignKeys: () => electron_1.ipcRenderer.invoke('debug:enable-foreign-keys'),
    },
    on: (channel, callback) => {
        const validChannels = ['idle-status', 'session-update', 'screenshot-captured', 'request-recent-activities', 'note-updated', 'tracking-state-changed', 'concurrent-session-detected'];
        if (validChannels.includes(channel)) {
            electron_1.ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    },
    off: (channel, callback) => {
        electron_1.ipcRenderer.removeListener(channel, callback);
    },
    // Generic invoke method for any IPC call
    invoke: (channel, ...args) => {
        return electron_1.ipcRenderer.invoke(channel, ...args);
    },
});
//# sourceMappingURL=preload.js.map