import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  auth: {
    login: (email: string, password: string) => 
      ipcRenderer.invoke('auth:login', email, password),
    logout: () => 
      ipcRenderer.invoke('auth:logout'),
    checkSession: () => 
      ipcRenderer.invoke('auth:check-session'),
    verifyToken: (token: string) =>
      ipcRenderer.invoke('auth:verify-token', token),
    samlLogin: () =>
      ipcRenderer.invoke('auth:saml-login'),
  },
  session: {
    start: (mode: string, task: string, projectId?: string) => 
      ipcRenderer.invoke('session:start', mode, task, projectId),
    stop: () => 
      ipcRenderer.invoke('session:stop'),
    switchMode: (mode: string, task: string, projectId?: string) => 
      ipcRenderer.invoke('session:switch-mode', mode, task, projectId),
  },
  dashboard: {
    getData: () => 
      ipcRenderer.invoke('dashboard:get-data'),
  },
  screenshots: {
    getToday: () => 
      ipcRenderer.invoke('screenshots:get-today'),
    getByDate: (date: Date) =>
      ipcRenderer.invoke('screenshots:get-by-date', date.toISOString()),
    updateNotes: (ids: string[], notes: string) => 
      ipcRenderer.invoke('screenshots:update-notes', ids, notes),
    transferMode: (ids: string[], mode: string) => 
      ipcRenderer.invoke('screenshots:transfer-mode', ids, mode),
    delete: (ids: string[]) => 
      ipcRenderer.invoke('screenshots:delete', ids),
  },
  activity: {
    getPeriodDetails: (periodId: string) =>
      ipcRenderer.invoke('activity:get-period-details', periodId),
    getPeriodsWithMetrics: (periodIds: string[]) =>
      ipcRenderer.invoke('activity:get-periods-with-metrics', periodIds),
  },
  notes: {
    save: (noteText: string) =>
      ipcRenderer.invoke('notes:save', noteText),
    getRecent: () =>
      ipcRenderer.invoke('notes:get-recent'),
  },
  debug: {
    clearSyncQueue: () => 
      ipcRenderer.invoke('debug:clear-sync-queue'),
    clearAllData: () => 
      ipcRenderer.invoke('debug:clear-all-data'),
    checkForeignKeys: () => 
      ipcRenderer.invoke('debug:check-foreign-keys'),
    enableForeignKeys: () => 
      ipcRenderer.invoke('debug:enable-foreign-keys'),
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = ['idle-status', 'session-update', 'screenshot-captured'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
});