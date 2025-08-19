export interface ElectronAPI {
  auth: {
    login: (email: string, password: string) => Promise<{ success: boolean; user?: any; message?: string }>;
    logout: () => Promise<void>;
    checkSession: () => Promise<{ user?: any }>;
  };
  session: {
    start: (mode: string, task: string, projectId?: string) => Promise<any>;
    stop: () => Promise<void>;
    switchMode: (mode: string, task: string, projectId?: string) => Promise<any>;
  };
  dashboard: {
    getData: () => Promise<any>;
  };
  screenshots: {
    getToday: () => Promise<any[]>;
    updateNotes: (ids: string[], notes: string) => Promise<void>;
    transferMode: (ids: string[], mode: string) => Promise<void>;
    delete: (ids: string[]) => Promise<void>;
  };
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}