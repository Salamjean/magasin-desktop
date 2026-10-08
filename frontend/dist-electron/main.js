import { app as o, BrowserWindow as b, ipcMain as d, nativeImage as u } from "electron";
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
  const n = v(), r = c.join(process.env.VITE_PUBLIC, "logo.png");
  let e;
  if (n.logo)
    try {
      n.logo.startsWith("data:image") ? e = u.createFromDataURL(n.logo) : l.existsSync(n.logo) && (e = u.createFromPath(n.logo));
    } catch {
    }
  !e && l.existsSync(r) && (e = u.createFromPath(r)), t = new b({
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
  })(), t.webContents.on("console-message", (s, i, g, p, S) => {
    console.log(`[Renderer Console L${i}] ${g} (${S}:${p})`);
  }), t.webContents.on("before-input-event", (s, i) => {
    (i.key === "F12" || i.control && i.shift && i.key.toLowerCase() === "i") && (t == null || t.webContents.toggleDevTools(), s.preventDefault());
  }), t.webContents.on("did-fail-load", (s, i, g, p) => {
    console.error(`Erreur de chargement de ${p}: ${i} - ${g}`);
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
  host: "bnelboutique.com",
  port: 3306,
  user: "magasin_user",
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
d.handle("remote-db-query", async (n, r, e = []) => {
  let a = null;
  try {
    a = await h.createConnection(f);
    const [s] = await a.execute(r, e);
    return await a.end(), { success: !0, data: s };
  } catch (s) {
    if (a)
      try {
        await a.end();
      } catch {
      }
    return { success: !1, error: s.message };
  }
});
d.handle("remote-db-sync-batch", async (n, r) => {
  let e = null;
  try {
    e = await h.createConnection(f), await e.beginTransaction();
    for (const a of r)
      await e.execute(a.sql, a.params);
    return await e.commit(), await e.end(), { success: !0, count: r.length };
  } catch (a) {
    if (e)
      try {
        await e.rollback(), await e.end();
      } catch {
      }
    return { success: !1, error: a.message };
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
    const e = c.join(o.getPath("userData"), "branding.json");
    l.writeFileSync(e, JSON.stringify(r, null, 2), "utf8");
  } catch (e) {
    console.error("[Electron] Erreur sauvegarde branding:", e);
  }
  return { success: !0 };
});
d.handle("get-app-branding", async () => v());
