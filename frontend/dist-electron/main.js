import { app as o, BrowserWindow as w, ipcMain as d, nativeImage as u } from "electron";
import i from "node:path";
import l from "node:fs";
import { fileURLToPath as v } from "node:url";
import h from "mysql2/promise";
const E = i.dirname(v(import.meta.url));
o.commandLine.appendSwitch("disable-gpu");
o.commandLine.appendSwitch("disable-gpu-compositing");
o.commandLine.appendSwitch("disable-gpu-rasterization");
o.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
o.commandLine.appendSwitch("no-sandbox");
o.isPackaged || o.setPath("userData", i.join(o.getPath("appData"), "gestmagasin-desktop-dev"));
process.env.DIST = i.join(E, "../dist");
process.env.VITE_PUBLIC = o.isPackaged ? process.env.DIST : i.join(process.env.DIST, "../public");
o.isPackaged && (o.requestSingleInstanceLock() ? o.on("second-instance", () => {
  t && (t.isMinimized() && t.restore(), t.focus());
}) : o.quit());
let t = null;
const m = process.env.VITE_DEV_SERVER_URL;
function b() {
  try {
    const n = i.join(o.getPath("userData"), "branding.json");
    if (l.existsSync(n))
      return JSON.parse(l.readFileSync(n, "utf8"));
  } catch {
  }
  return { name: "GestMagasin Pro" };
}
function _() {
  const n = b(), r = i.join(process.env.VITE_PUBLIC, "logo.png");
  let e;
  if (n.logo)
    try {
      n.logo.startsWith("data:image") ? e = u.createFromDataURL(n.logo) : l.existsSync(n.logo) && (e = u.createFromPath(n.logo));
    } catch {
    }
  !e && l.existsSync(r) && (e = u.createFromPath(r)), t = new w({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: n.name || "GestMagasin Pro",
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
    if (m)
      t == null || t.loadURL(m);
    else {
      const a = i.join(process.env.DIST, "index.html");
      t == null || t.loadFile(a);
    }
  })(), t.webContents.on("console-message", (a, c, g, p, T) => {
    console.log(`[Renderer Console L${c}] ${g} (${T}:${p})`);
  }), t.webContents.on("before-input-event", (a, c) => {
    (c.key === "F12" || c.control && c.shift && c.key.toLowerCase() === "i") && (t == null || t.webContents.toggleDevTools(), a.preventDefault());
  }), t.webContents.on("did-fail-load", (a, c, g, p) => {
    console.error(`Erreur de chargement de ${p}: ${c} - ${g}`);
  }), (!o.isPackaged || m) && t.webContents.openDevTools({ mode: "detach" });
}
o.whenReady().then(() => {
  _(), o.on("activate", () => {
    w.getAllWindows().length === 0 && _();
  });
});
o.on("window-all-closed", () => {
  process.platform !== "darwin" && o.quit();
});
const f = {
  host: process.env.VITE_REMOTE_DB_HOST || "bnelboutique.com",
  port: Number(process.env.VITE_REMOTE_DB_PORT || "3306") || 3306,
  user: process.env.VITE_REMOTE_DB_USER || "magasin_user",
  password: process.env.VITE_REMOTE_DB_PASSWORD || "KKStechnologies2022@",
  database: process.env.VITE_REMOTE_DB_NAME || "magasin_db",
  connectTimeout: Number(process.env.VITE_REMOTE_DB_TIMEOUT || "5000") || 5e3
};
d.handle("remote-db-ping", async () => {
  try {
    const n = await h.createConnection(f);
    return await n.ping(), await n.end(), { success: !0, message: "Connecté au serveur distant" };
  } catch (n) {
    return { success: !1, message: n.message || "Serveur distant inaccessible" };
  }
});
d.handle("remote-db-query", async (n, r, e = []) => {
  let s = null;
  try {
    s = await h.createConnection(f);
    const [a] = await s.execute(r, e);
    return await s.end(), { success: !0, data: a };
  } catch (a) {
    if (s)
      try {
        await s.end();
      } catch {
      }
    return { success: !1, error: a.message };
  }
});
d.handle("remote-db-sync-batch", async (n, r) => {
  let e = null;
  try {
    e = await h.createConnection(f), await e.beginTransaction();
    for (const s of r)
      await e.execute(s.sql, s.params);
    return await e.commit(), await e.end(), { success: !0, count: r.length };
  } catch (s) {
    if (e)
      try {
        await e.rollback(), await e.end();
      } catch {
      }
    return { success: !1, error: s.message };
  }
});
d.handle("print-receipt", async (n, r) => {
  if (!t) return { success: !1, error: "Fenêtre non trouvée" };
  try {
    return t.webContents.print({
      silent: !1,
      printBackground: !0,
      pageSize: { width: 8e4, height: 297e3 }
      // 80mm roll width representation
    }), { success: !0 };
  } catch (e) {
    return { success: !1, error: e.message };
  }
});
d.handle("update-app-branding", async (n, r) => {
  if (r.name && t && t.setTitle(r.name), r.logo && t)
    try {
      let e;
      r.logo.startsWith("data:image") ? e = u.createFromDataURL(r.logo) : l.existsSync(r.logo) && (e = u.createFromPath(r.logo)), e && !e.isEmpty() && t.setIcon(e);
    } catch (e) {
      console.error("[Electron] Erreur mise à jour icône:", e);
    }
  try {
    const e = i.join(o.getPath("userData"), "branding.json");
    l.writeFileSync(e, JSON.stringify(r, null, 2), "utf8");
  } catch (e) {
    console.error("[Electron] Erreur sauvegarde branding:", e);
  }
  return { success: !0 };
});
d.handle("get-app-branding", async () => b());
