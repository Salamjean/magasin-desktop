import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
process.env.DIST = path.join(__dirname$1, "../dist");
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
let mainWindow = null;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "GestMagasin Pro",
    backgroundColor: "#070e1c",
    webPreferences: {
      preload: path.join(__dirname$1, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
    autoHideMenuBar: true,
    show: true
    // Afficher immédiatement
  });
  const loadApp = async () => {
    if (VITE_DEV_SERVER_URL) {
      try {
        await (mainWindow == null ? void 0 : mainWindow.loadURL(VITE_DEV_SERVER_URL));
        return;
      } catch (e) {
        console.warn("Echec chargement VITE_DEV_SERVER_URL, tentative sur ports alternatifs...", e);
      }
    }
    const ports = [5173, 5174, 5175];
    for (const port of ports) {
      try {
        await (mainWindow == null ? void 0 : mainWindow.loadURL(`http://localhost:${port}/`));
        return;
      } catch (_) {
      }
    }
    const localFile = path.join(process.env.DIST, "index.html");
    mainWindow == null ? void 0 : mainWindow.loadFile(localFile);
  };
  loadApp();
}
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
const REMOTE_CONFIG = {
  host: "magasin.fescad.net",
  port: 3306,
  user: "root",
  password: "KKStechnologies2022@",
  database: "magasin_db",
  connectTimeout: 5e3
};
ipcMain.handle("remote-db-ping", async () => {
  try {
    const conn = await mysql.createConnection(REMOTE_CONFIG);
    await conn.ping();
    await conn.end();
    return { success: true, message: "Connecté au serveur distant" };
  } catch (error) {
    return { success: false, message: error.message || "Serveur distant inaccessible" };
  }
});
ipcMain.handle("remote-db-query", async (_event, sql, params = []) => {
  let conn = null;
  try {
    conn = await mysql.createConnection(REMOTE_CONFIG);
    const [rows] = await conn.execute(sql, params);
    await conn.end();
    return { success: true, data: rows };
  } catch (error) {
    if (conn) {
      try {
        await conn.end();
      } catch (_) {
      }
    }
    return { success: false, error: error.message };
  }
});
ipcMain.handle("remote-db-sync-batch", async (_event, operations) => {
  let conn = null;
  try {
    conn = await mysql.createConnection(REMOTE_CONFIG);
    await conn.beginTransaction();
    for (const op of operations) {
      await conn.execute(op.sql, op.params);
    }
    await conn.commit();
    await conn.end();
    return { success: true, count: operations.length };
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
        await conn.end();
      } catch (_) {
      }
    }
    return { success: false, error: error.message };
  }
});
ipcMain.handle("print-receipt", async (_event, _options) => {
  if (!mainWindow) return { success: false, error: "Fenêtre non trouvée" };
  try {
    mainWindow.webContents.print({
      silent: false,
      printBackground: true,
      pageSize: { width: 8e4, height: 297e3 }
      // 80mm roll width representation
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
