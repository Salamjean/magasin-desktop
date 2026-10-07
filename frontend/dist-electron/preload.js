import { contextBridge as n, ipcRenderer as o } from "electron";
const r = {
  pingRemoteDB: () => o.invoke("remote-db-ping"),
  queryRemoteDB: (e, t = []) => o.invoke("remote-db-query", e, t),
  syncBatchRemoteDB: (e) => o.invoke("remote-db-sync-batch", e),
  printReceipt: (e) => o.invoke("print-receipt", e)
};
n.exposeInMainWorld("electronAPI", r);
