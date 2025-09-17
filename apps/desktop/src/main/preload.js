"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    auth: {
        login: (email, password) => electron_1.ipcRenderer.invoke('auth:login', email, password),
        logout: () => electron_1.ipcRenderer.invoke('auth:logout'),
        checkSession: () => electron_1.ipcRenderer.invoke('auth:check-session'),
        getApiUrl: () => electron_1.ipcRenderer.invoke('auth:get-api-url'),
    },
    session: {
        start: (mode, task, projectId) => electron_1.ipcRenderer.invoke('session:start', mode, task, projectId),
        stop: () => electron_1.ipcRenderer.invoke('session:stop'),
        switchMode: (mode, task, projectId) => electron_1.ipcRenderer.invoke('session:switch-mode', mode, task, projectId),
    },
    dashboard: {
        getData: () => electron_1.ipcRenderer.invoke('dashboard:get-data'),
    },
    screenshots: {
        getToday: () => electron_1.ipcRenderer.invoke('screenshots:get-today'),
        updateNotes: (ids, notes) => electron_1.ipcRenderer.invoke('screenshots:update-notes', ids, notes),
        transferMode: (ids, mode) => electron_1.ipcRenderer.invoke('screenshots:transfer-mode', ids, mode),
        delete: (ids) => electron_1.ipcRenderer.invoke('screenshots:delete', ids),
    },
    debug: {
        clearSyncQueue: () => electron_1.ipcRenderer.invoke('debug:clear-sync-queue'),
        clearAllData: () => electron_1.ipcRenderer.invoke('debug:clear-all-data'),
        checkForeignKeys: () => electron_1.ipcRenderer.invoke('debug:check-foreign-keys'),
        enableForeignKeys: () => electron_1.ipcRenderer.invoke('debug:enable-foreign-keys'),
    },
    on: (channel, callback) => {
        const validChannels = ['idle-status', 'session-update', 'screenshot-captured'];
        if (validChannels.includes(channel)) {
            electron_1.ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    },
    off: (channel, callback) => {
        electron_1.ipcRenderer.removeListener(channel, callback);
    },
});
//# sourceMappingURL=preload.js.map