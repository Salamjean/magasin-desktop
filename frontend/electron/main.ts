import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Prevent GPU disk cache lock errors on Windows development
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

// Single instance lock (uniquement si packagé)
if (app.isPackaged) {
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
  }
}

let mainWindow: BrowserWindow | null = null;
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'GestMagasin Pro',
    backgroundColor: '#0055b8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
    autoHideMenuBar: true,
    show: true // Afficher immédiatement
  });

  const loadApp = () => {
    if (VITE_DEV_SERVER_URL) {
      mainWindow?.loadURL(VITE_DEV_SERVER_URL);
    } else {
      // Chargement direct et instantané du fichier compilé sans passer par le réseau
      const localFile = path.join(process.env.DIST, 'index.html');
      mainWindow?.loadFile(localFile);
    }
  };

  loadApp();

  // Ouvrir les DevTools en mode développement si besoin d'inspection
  if (VITE_DEV_SERVER_URL) {
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==========================================
// IPC HANDLERS: Remote MySQL Direct Connection & Sync
// ==========================================
const REMOTE_CONFIG = {
  host: 'magasin.fescad.net',
  port: 3306,
  user: 'root',
  password: 'KKStechnologies2022@',
  database: 'magasin_db',
  connectTimeout: 5000
};

// Check Remote DB Connection Status
ipcMain.handle('remote-db-ping', async () => {
  try {
    const conn = await mysql.createConnection(REMOTE_CONFIG);
    await conn.ping();
    await conn.end();
    return { success: true, message: 'Connecté au serveur distant' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Serveur distant inaccessible' };
  }
});

// Execute Raw Query on Remote Server
ipcMain.handle('remote-db-query', async (_event, sql: string, params: any[] = []) => {
  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection(REMOTE_CONFIG);
    const [rows] = await conn.execute(sql, params);
    await conn.end();
    return { success: true, data: rows };
  } catch (error: any) {
    if (conn) {
      try { await conn.end(); } catch (_) {}
    }
    return { success: false, error: error.message };
  }
});

// Execute Batch Sync Transactions
ipcMain.handle('remote-db-sync-batch', async (_event, operations: Array<{ sql: string, params: any[] }>) => {
  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection(REMOTE_CONFIG);
    await conn.beginTransaction();

    for (const op of operations) {
      await conn.execute(op.sql, op.params);
    }

    await conn.commit();
    await conn.end();
    return { success: true, count: operations.length };
  } catch (error: any) {
    if (conn) {
      try {
        await conn.rollback();
        await conn.end();
      } catch (_) {}
    }
    return { success: false, error: error.message };
  }
});

// Native Print Thermal Receipt
ipcMain.handle('print-receipt', async (_event, _options) => {
  if (!mainWindow) return { success: false, error: 'Fenêtre non trouvée' };
  try {
    mainWindow.webContents.print({
      silent: false,
      printBackground: true,
      pageSize: { width: 80000, height: 297000 } // 80mm roll width representation
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});
