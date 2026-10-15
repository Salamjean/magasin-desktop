import { app as a, BrowserWindow as _, ipcMain as d, nativeImage as u } from "electron";
import i from "node:path";
import l from "node:fs";
import { fileURLToPath as v } from "node:url";
import f from "mysql2/promise";
const E = i.dirname(v(import.meta.url));
a.commandLine.appendSwitch("disable-gpu");
a.commandLine.appendSwitch("disable-gpu-compositing");
a.commandLine.appendSwitch("disable-gpu-rasterization");
a.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
a.commandLine.appendSwitch("no-sandbox");
a.isPackaged || a.setPath("userData", i.join(a.getPath("appData"), "gestmagasin-desktop-dev"));
process.env.DIST = i.join(E, "../dist");
process.env.VITE_PUBLIC = a.isPackaged ? process.env.DIST : i.join(process.env.DIST, "../public");
a.isPackaged && (a.requestSingleInstanceLock() ? a.on("second-instance", () => {
  n && (n.isMinimized() && n.restore(), n.focus());
}) : a.quit());
let n = null;
const h = process.env.VITE_DEV_SERVER_URL;
function b() {
  try {
    const r = i.join(a.getPath("userData"), "branding.json");
    if (l.existsSync(r))
      return JSON.parse(l.readFileSync(r, "utf8"));
  } catch {
  }
  return { name: "GestMagasin Pro" };
}
function w() {
  const r = b(), t = i.join(process.env.VITE_PUBLIC, "logo.png");
  let e;
  if (r.logo)
    try {
      r.logo.startsWith("data:image") ? e = u.createFromDataURL(r.logo) : l.existsSync(r.logo) && (e = u.createFromPath(r.logo));
    } catch {
    }
  !e && l.existsSync(t) && (e = u.createFromPath(t)), n = new _({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: r.name || "GestMagasin Pro",
    icon: e,
    backgroundColor: "#0055b8",
    webPreferences: {
      preload: i.join(E, "preload.cjs"),
      nodeIntegration: !1,
      contextIsolation: !0,
      webSecurity: !1
    },
    autoHideMenuBar: !0,
    show: !0
    // Afficher immédiatement
  }), (() => {
    if (h)
      n == null || n.loadURL(h);
    else {
      const o = i.join(process.env.DIST, "index.html");
      n == null || n.loadFile(o);
    }
  })(), n.webContents.on("console-message", (o, c, g, m, T) => {
    console.log(`[Renderer Console L${c}] ${g} (${T}:${m})`);
  }), n.webContents.on("before-input-event", (o, c) => {
    (c.key === "F12" || c.control && c.shift && c.key.toLowerCase() === "i") && (n == null || n.webContents.toggleDevTools(), o.preventDefault());
  }), n.webContents.on("did-fail-load", (o, c, g, m) => {
    console.error(`Erreur de chargement de ${m}: ${c} - ${g}`);
  }), (!a.isPackaged || h) && n.webContents.openDevTools({ mode: "detach" });
}
a.whenReady().then(() => {
  w(), a.on("activate", () => {
    _.getAllWindows().length === 0 && w();
  });
});
a.on("window-all-closed", () => {
  process.platform !== "darwin" && a.quit();
});
const p = {
  host: process.env.VITE_REMOTE_DB_HOST || "bnelboutique.com",
  port: Number(process.env.VITE_REMOTE_DB_PORT || "3306") || 3306,
  user: process.env.VITE_REMOTE_DB_USER || "magasin_user",
  password: process.env.VITE_REMOTE_DB_PASSWORD || "KKStechnologies2022@",
  database: process.env.VITE_REMOTE_DB_NAME || "magasin_db",
  connectTimeout: Number(process.env.VITE_REMOTE_DB_TIMEOUT || "5000") || 5e3
};
d.handle("remote-db-ping", async () => {
  try {
    const r = await f.createConnection(p);
    return await r.ping(), await r.end(), { success: !0, message: "Connecté au serveur distant" };
  } catch (r) {
    return { success: !1, message: r.message || "Serveur distant inaccessible" };
  }
});
d.handle("remote-db-query", async (r, t, e = []) => {
  let s = null;
  try {
    s = await f.createConnection(p);
    const [o] = await s.execute(t, e);
    return await s.end(), { success: !0, data: o };
  } catch (o) {
    if (s)
      try {
        await s.end();
      } catch {
      }
    return { success: !1, error: o.message };
  }
});
d.handle("remote-db-sync-batch", async (r, t) => {
  let e = null;
  try {
    e = await f.createConnection(p), await e.beginTransaction();
    for (const s of t)
      await e.execute(s.sql, s.params);
    return await e.commit(), await e.end(), { success: !0, count: t.length };
  } catch (s) {
    if (e)
      try {
        await e.rollback(), await e.end();
      } catch {
      }
    return { success: !1, error: s.message };
  }
});
d.handle("print-receipt", async (r, t) => {
  if (!n) return { success: !1, error: "Fenêtre non trouvée" };
  try {
    const e = (t == null ? void 0 : t.format) === "a4", s = (t == null ? void 0 : t.width) === "58" || (t == null ? void 0 : t.thermalWidth) === "58", o = e ? "A4" : { width: s ? 58e3 : 8e4, height: 297e3 };
    return n.webContents.print({
      silent: !1,
      printBackground: !0,
      pageSize: o
    }), { success: !0 };
  } catch (e) {
    return { success: !1, error: e.message };
  }
});
d.handle("update-app-branding", async (r, t) => {
  if (t.name && n && n.setTitle(t.name), t.logo && n)
    try {
      let e;
      t.logo.startsWith("data:image") ? e = u.createFromDataURL(t.logo) : l.existsSync(t.logo) && (e = u.createFromPath(t.logo)), e && !e.isEmpty() && n.setIcon(e);
    } catch (e) {
      console.error("[Electron] Erreur mise à jour icône:", e);
    }
  try {
    const e = i.join(a.getPath("userData"), "branding.json");
    l.writeFileSync(e, JSON.stringify(t, null, 2), "utf8");
  } catch (e) {
    console.error("[Electron] Erreur sauvegarde branding:", e);
  }
  return { success: !0 };
});
d.handle("get-app-branding", async () => b());
