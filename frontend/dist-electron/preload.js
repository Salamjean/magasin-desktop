import { contextBridge, ipcRenderer } from "electron";
const electronAPI = {
  pingRemoteDB: () => ipcRenderer.invoke("remote-db-ping"),
  queryRemoteDB: (sql, params = []) => ipcRenderer.invoke("remote-db-query", sql, params),
  syncBatchRemoteDB: (operations) => ipcRenderer.invoke("remote-db-sync-batch", operations),
  printReceipt: (options) => ipcRenderer.invoke("print-receipt", options)
};
contextBridge.exposeInMainWorld("electronAPI", electronAPI);
