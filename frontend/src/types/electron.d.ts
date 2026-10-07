export interface ElectronAPI {
  pingRemoteDB: () => Promise<{ success: boolean; message: string }>;
  queryRemoteDB: (sql: string, params?: any[]) => Promise<{ success: boolean; data?: any; error?: string }>;
  syncBatchRemoteDB: (operations: Array<{ sql: string; params: any[] }>) => Promise<{ success: boolean; count?: number; error?: string }>;
  printReceipt: (options?: any) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
