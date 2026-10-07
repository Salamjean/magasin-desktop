// Preload script en CommonJS pour compatibilité sandbox Electron
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  pingRemoteDB: () => ipcRenderer.invoke('remote-db-ping'),
  queryRemoteDB: (sql: string, params: any[] = []) => ipcRenderer.invoke('remote-db-query', sql, params),
  syncBatchRemoteDB: (operations: Array<{ sql: string; params: any[] }>) => ipcRenderer.invoke('remote-db-sync-batch', operations),
  printReceipt: (options: any) => ipcRenderer.invoke('print-receipt', options),
});

