import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  auth: {
    login: (email: string, password: string) => 
      ipcRenderer.invoke('auth:login', email, password),
    logout: () => 
      ipcRenderer.invoke('auth:logout'),
    checkSession: () => 
      ipcRenderer.invoke('auth:check-session'),
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
    updateNotes: (ids: string[], notes: string) => 
      ipcRenderer.invoke('screenshots:update-notes', ids, notes),
    transferMode: (ids: string[], mode: string) => 
      ipcRenderer.invoke('screenshots:transfer-mode', ids, mode),
    delete: (ids: string[]) => 
      ipcRenderer.invoke('screenshots:delete', ids),
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