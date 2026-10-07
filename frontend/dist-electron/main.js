import { app as o, BrowserWindow as b, ipcMain as d, nativeImage as g } from "electron";
import c from "node:path";
import l from "node:fs";
import { fileURLToPath as _ } from "node:url";
import h from "mysql2/promise";
const y = c.dirname(_(import.meta.url));
o.commandLine.appendSwitch("disable-gpu");
o.commandLine.appendSwitch("disable-gpu-compositing");
o.commandLine.appendSwitch("disable-gpu-rasterization");
o.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
o.commandLine.appendSwitch("no-sandbox");
o.isPackaged || o.setPath("userData", c.join(o.getPath("appData"), "gestmagasin-desktop-dev"));
process.env.DIST = c.join(y, "../dist");
process.env.VITE_PUBLIC = o.isPackaged ? process.env.DIST : c.join(process.env.DIST, "../public");
o.isPackaged && (o.requestSingleInstanceLock() ? o.on("second-instance", () => {
  t && (t.isMinimized() && t.restore(), t.focus());
}) : o.quit());
let t = null;
const m = process.env.VITE_DEV_SERVER_URL;
function v() {
  try {
    const n = c.join(o.getPath("userData"), "branding.json");
    if (l.existsSync(n))
      return JSON.parse(l.readFileSync(n, "utf8"));
  } catch {
  }
  return { name: "GestMagasin Pro" };
}
function w() {
  const n = v(), a = c.join(process.env.VITE_PUBLIC, "logo.png");
  let e;
  if (n.logo)
    try {
      n.logo.startsWith("data:image") ? e = g.createFromDataURL(n.logo) : l.existsSync(n.logo) && (e = g.createFromPath(n.logo));
    } catch {
    }
  !e && l.existsSync(a) && (e = g.createFromPath(a)), t = new b({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: n.name || "GestMagasin Pro",
    icon: e,
    backgroundColor: "#0055b8",
    webPreferences: {
      preload: c.join(y, "preload.cjs"),
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
      const s = c.join(process.env.DIST, "index.html");
      t == null || t.loadFile(s);
    }
  })(), t.webContents.on("console-message", (s, i, u, p, S) => {
    console.log(`[Renderer Console L${i}] ${u} (${S}:${p})`);
  }), t.webContents.on("before-input-event", (s, i) => {
    (i.key === "F12" || i.control && i.shift && i.key.toLowerCase() === "i") && (t == null || t.webContents.toggleDevTools(), s.preventDefault());
  }), t.webContents.on("did-fail-load", (s, i, u, p) => {
    console.error(`Erreur de chargement de ${p}: ${i} - ${u}`);
  }), (!o.isPackaged || m) && t.webContents.openDevTools({ mode: "detach" });
}
o.whenReady().then(() => {
  w(), o.on("activate", () => {
    b.getAllWindows().length === 0 && w();
  });
});
o.on("window-all-closed", () => {
  process.platform !== "darwin" && o.quit();
});
const f = {
  host: "magasin.fescad.net",
  port: 3306,
  user: "root",
  password: "KKStechnologies2022@",
  database: "magasin_db",
  connectTimeout: 5e3
};
d.handle("remote-db-ping", async () => {
  try {
    const n = await h.createConnection(f);
    return await n.ping(), await n.end(), { success: !0, message: "Connecté au serveur distant" };
  } catch (n) {
    return { success: !1, message: n.message || "Serveur distant inaccessible" };
  }
});
d.handle("remote-db-query", async (n, a, e = []) => {
  let r = null;
  try {
    r = await h.createConnection(f);
    const [s] = await r.execute(a, e);
    return await r.end(), { success: !0, data: s };
  } catch (s) {
    if (r)
      try {
        await r.end();
      } catch {
      }
    return { success: !1, error: s.message };
  }
});
d.handle("remote-db-sync-batch", async (n, a) => {
  let e = null;
  try {
    e = await h.createConnection(f), await e.beginTransaction();
    for (const r of a)
      await e.execute(r.sql, r.params);
    return await e.commit(), await e.end(), { success: !0, count: a.length };
  } catch (r) {
    if (e)
      try {
        await e.rollback(), await e.end();
      } catch {
      }
    return { success: !1, error: r.message };
  }
});
d.handle("print-receipt", async (n, a) => {
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
d.handle("update-app-branding", async (n, a) => {
  if (a.name && t && t.setTitle(a.name), a.logo && t)
    try {
      let e;
      a.logo.startsWith("data:image") ? e = g.createFromDataURL(a.logo) : l.existsSync(a.logo) && (e = g.createFromPath(a.logo)), e && !e.isEmpty() && t.setIcon(e);
    } catch (e) {
      console.error("[Electron] Erreur mise à jour icône:", e);
    }
  try {
    const e = c.join(o.getPath("userData"), "branding.json");
    l.writeFileSync(e, JSON.stringify(a, null, 2), "utf8");
  } catch (e) {
    console.error("[Electron] Erreur sauvegarde branding:", e);
  }
  return { success: !0 };
});
d.handle("get-app-branding", async () => v());
