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
    getProductiveInfo: () =>
      ipcRenderer.invoke('session:productive-info'),
    getTodaySessions: (dateString?: string) =>
      ipcRenderer.invoke('session:today', dateString),
  },
  dashboard: {
    getData: () => 
      ipcRenderer.invoke('dashboard:get-data'),
  },
  projects: {
    fetch: () => 
      ipcRenderer.invoke('projects:fetch'),
  },
  permissions: {
    check: () => 
      ipcRenderer.invoke('permissions:check'),
    request: (permissionId: string) => 
      ipcRenderer.invoke('permissions:request', permissionId),
    requestAll: () => 
      ipcRenderer.invoke('permissions:request-all'),
  },
  system: {
    openPreferences: (pane: string) => 
      ipcRenderer.invoke('system:open-preferences', pane),
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
    retrySync: (id: string) =>
      ipcRenderer.invoke('screenshots:retry-sync', id),
    fetchSignedUrl: (id: string) =>
      ipcRenderer.invoke('screenshots:fetch-signed-url', id),
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
  getProductiveHours: (dateString?: string) =>
    ipcRenderer.invoke('productive-hours:get', dateString),
  getWeeklyMarathon: (dateString?: string) =>
    ipcRenderer.invoke('weekly-marathon:get', dateString),
  getDashboardStats: () =>
    ipcRenderer.invoke('dashboard:stats'),
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
    const validChannels = ['idle-status', 'session-update', 'screenshot-captured', 'request-recent-activities', 'note-updated', 'tracking-state-changed', 'concurrent-session-detected'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
  // Generic invoke method for any IPC call
  invoke: (channel: string, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
  },
});