import { app as r, BrowserWindow as f, ipcMain as g, nativeImage as h } from "electron";
import i from "node:path";
import d from "node:fs";
import { fileURLToPath as T } from "node:url";
import p from "mysql2/promise";
const b = i.dirname(T(import.meta.url));
r.commandLine.appendSwitch("disable-gpu");
r.commandLine.appendSwitch("disable-gpu-compositing");
r.commandLine.appendSwitch("disable-gpu-rasterization");
r.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
r.commandLine.appendSwitch("no-sandbox");
r.isPackaged || r.setPath("userData", i.join(r.getPath("appData"), "gestmagasin-desktop-dev"));
process.env.DIST = i.join(b, "../dist");
process.env.VITE_PUBLIC = r.isPackaged ? process.env.DIST : i.join(process.env.DIST, "../public");
r.isPackaged && (r.requestSingleInstanceLock() ? r.on("second-instance", () => {
  n && (n.isMinimized() && n.restore(), n.focus());
}) : r.quit());
let n = null;
const m = process.env.VITE_DEV_SERVER_URL;
function E() {
  try {
    const a = i.join(r.getPath("userData"), "branding.json");
    if (d.existsSync(a))
      return JSON.parse(d.readFileSync(a, "utf8"));
  } catch {
  }
  return { name: "GestMagasin Pro" };
}
function _() {
  const a = E(), e = i.join(process.env.VITE_PUBLIC, "logo.png");
  let t;
  if (a.logo)
    try {
      a.logo.startsWith("data:image") ? t = h.createFromDataURL(a.logo) : d.existsSync(a.logo) && (t = h.createFromPath(a.logo));
    } catch {
    }
  !t && d.existsSync(e) && (t = h.createFromPath(e)), n = new f({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: a.name || "GestMagasin Pro",
    icon: t,
    backgroundColor: "#0055b8",
    webPreferences: {
      preload: i.join(b, "preload.cjs"),
      nodeIntegration: !1,
      contextIsolation: !0,
      webSecurity: !1
    },
    autoHideMenuBar: !0,
    show: !0
    // Afficher immédiatement
  }), (() => {
    if (m)
      n == null || n.loadURL(m);
    else {
      const c = i.join(process.env.DIST, "index.html");
      n == null || n.loadFile(c);
    }
  })(), n.webContents.on("console-message", (c, o, u, l, y) => {
    console.log(`[Renderer Console L${o}] ${u} (${y}:${l})`);
  }), n.webContents.on("before-input-event", (c, o) => {
    (o.key === "F12" || o.control && o.shift && o.key.toLowerCase() === "i") && (n == null || n.webContents.toggleDevTools(), c.preventDefault());
  }), n.webContents.on("did-fail-load", (c, o, u, l) => {
    console.error(`Erreur de chargement de ${l}: ${o} - ${u}`);
  }), (!r.isPackaged || m) && n.webContents.openDevTools({ mode: "detach" });
}
r.whenReady().then(() => {
  _(), r.on("activate", () => {
    f.getAllWindows().length === 0 && _();
  });
});
r.on("window-all-closed", () => {
  process.platform !== "darwin" && r.quit();
});
const w = {
  host: process.env.VITE_REMOTE_DB_HOST || "bnelboutique.com",
  port: Number(process.env.VITE_REMOTE_DB_PORT || "3306") || 3306,
  user: process.env.VITE_REMOTE_DB_USER || "magasin_user",
  password: process.env.VITE_REMOTE_DB_PASSWORD || "KKStechnologies2022@",
  database: process.env.VITE_REMOTE_DB_NAME || "magasin_db",
  connectTimeout: Number(process.env.VITE_REMOTE_DB_TIMEOUT || "5000") || 5e3
};
g.handle("remote-db-ping", async () => {
  try {
    const a = await p.createConnection(w);
    return await a.ping(), await a.end(), { success: !0, message: "Connecté au serveur distant" };
  } catch (a) {
    return { success: !1, message: a.message || "Serveur distant inaccessible" };
  }
});
g.handle("remote-db-query", async (a, e, t = []) => {
  let s = null;
  try {
    s = await p.createConnection(w);
    const [c] = await s.execute(e, t);
    return await s.end(), { success: !0, data: c };
  } catch (c) {
    if (s)
      try {
        await s.end();
      } catch {
      }
    return { success: !1, error: c.message };
  }
});
g.handle("remote-db-sync-batch", async (a, e) => {
  let t = null;
  try {
    t = await p.createConnection(w), await t.beginTransaction();
    for (const s of e)
      await t.execute(s.sql, s.params);
    return await t.commit(), await t.end(), { success: !0, count: e.length };
  } catch (s) {
    if (t)
      try {
        await t.rollback(), await t.end();
      } catch {
      }
    return { success: !1, error: s.message };
  }
});
g.handle("print-receipt", async (a, e) => {
  if (!n) return { success: !1, error: "Fenêtre non trouvée" };
  try {
    const t = (e == null ? void 0 : e.format) === "a4", s = (e == null ? void 0 : e.width) === "58" || (e == null ? void 0 : e.thermalWidth) === "58";
    if (!t && (e != null && e.html)) {
      const o = e.heightMm && e.heightMm > 50 ? e.heightMm : 297, u = i.join(r.getPath("temp"), `ticket-${Date.now()}.html`);
      d.writeFileSync(u, e.html, "utf8");
      const l = new f({ show: !1, webPreferences: { javascript: !1 } });
      return l.on("closed", () => d.rmSync(u, { force: !0 })), await l.loadFile(u), l.webContents.print(
        {
          silent: !1,
          printBackground: !0,
          pageSize: { width: s ? 58e3 : 8e4, height: Math.round(o * 1e3) },
          margins: { marginType: "none" }
        },
        () => l.close()
      ), { success: !0 };
    }
    const c = t ? "A4" : { width: s ? 58e3 : 8e4, height: 297e3 };
    return n.webContents.print({
      silent: !1,
      printBackground: !0,
      pageSize: c
    }), { success: !0 };
  } catch (t) {
    return { success: !1, error: t.message };
  }
});
g.handle("update-app-branding", async (a, e) => {
  if (e.name && n && n.setTitle(e.name), e.logo && n)
    try {
      let t;
      e.logo.startsWith("data:image") ? t = h.createFromDataURL(e.logo) : d.existsSync(e.logo) && (t = h.createFromPath(e.logo)), t && !t.isEmpty() && n.setIcon(t);
    } catch (t) {
      console.error("[Electron] Erreur mise à jour icône:", t);
    }
  try {
    const t = i.join(r.getPath("userData"), "branding.json");
    d.writeFileSync(t, JSON.stringify(e, null, 2), "utf8");
  } catch (t) {
    console.error("[Electron] Erreur sauvegarde branding:", t);
  }
  return { success: !0 };
});
g.handle("get-app-branding", async () => E());
