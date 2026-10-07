const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  pingRemoteDB: () => ipcRenderer.invoke('remote-db-ping'),
  queryRemoteDB: (sql, params = []) => ipcRenderer.invoke('remote-db-query', sql, params),
  syncBatchRemoteDB: (operations) => ipcRenderer.invoke('remote-db-sync-batch', operations),
  printReceipt: (options) => ipcRenderer.invoke('print-receipt', options),
  updateAppBranding: (data) => ipcRenderer.invoke('update-app-branding', data),
  getAppBranding: () => ipcRenderer.invoke('get-app-branding'),
});

