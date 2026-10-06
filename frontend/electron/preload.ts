import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  pingRemoteDB: () => Promise<{ success: boolean; message: string }>;
  queryRemoteDB: (sql: string, params?: any[]) => Promise<{ success: boolean; data?: any; error?: string }>;
  syncBatchRemoteDB: (operations: Array<{ sql: string; params: any[] }>) => Promise<{ success: boolean; count?: number; error?: string }>;
  printReceipt: (options?: any) => Promise<{ success: boolean; error?: string }>;
}

const electronAPI: ElectronAPI = {
  pingRemoteDB: () => ipcRenderer.invoke('remote-db-ping'),
  queryRemoteDB: (sql, params = []) => ipcRenderer.invoke('remote-db-query', sql, params),
  syncBatchRemoteDB: (operations) => ipcRenderer.invoke('remote-db-sync-batch', operations),
  printReceipt: (options) => ipcRenderer.invoke('print-receipt', options),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
