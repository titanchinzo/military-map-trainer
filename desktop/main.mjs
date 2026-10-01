// Desktop бүрхүүл: Vercel дээрх апп-ыг өөрийн цонхонд ачаална. Сервер, Clerk,
// Supabase-ийн нууц түлхүүрүүд Vercel дээрээ үлдэнэ — exe дотор нууц юм алга,
// GitHub руу push хийх бүрд desktop хувилбар ч шинэчлэгдэнэ.
import { app, BrowserWindow, Menu, session, shell } from "electron";
import path from "node:path";

const APP_URL =
  process.env.MMT_APP_URL ?? "https://military-map-trainer.vercel.app";
const APP_ORIGIN = new URL(APP_URL).origin;

// Нэвтрэлт (Clerk dev instance, Google OAuth) цонх дотроо явах ёстой. Бусад
// холбоосыг системийн браузерт нээнэ — эс тэгвээс буцах товчгүй цонх гадаад
// сайт дээр гацна (жишээ нь Leaflet-ийн attribution холбоос).
const IN_APP_HOST_SUFFIXES = [
  "accounts.dev",
  "clerk.com",
  "clerk.dev",
  "google.com",
  "accounts.youtube.com",
];

const ALLOWED_PERMISSIONS = new Set(["clipboard-sanitized-write", "fullscreen"]);

function isAppUrl(url) {
  try {
    return new URL(url).origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

function isInAppUrl(url) {
  if (isAppUrl(url)) return true;
  let u;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  return IN_APP_HOST_SUFFIXES.some(
    (h) => u.hostname === h || u.hostname.endsWith(`.${h}`),
  );
}

function openExternal(url) {
  if (/^https?:\/\//i.test(url)) shell.openExternal(url);
}

// Google Electron-ийг "аюулгүй биш браузер" гэж үзээд OAuth нэвтрэлтийг
// хаадаг. User-Agent-аас Electron болон апп-ын нэрийг хасвал энгийн Chrome
// шиг харагдана.
app.userAgentFallback = app.userAgentFallback.replace(
  / (Electron|military-map-trainer-desktop)\/\S+/g,
  "",
);

/** @type {BrowserWindow | null} */
let win = null;

function showOffline(failedUrl) {
  const retryUrl = isAppUrl(failedUrl) ? failedUrl : APP_URL;
  win.loadFile(path.join(import.meta.dirname, "offline.html"), {
    query: { url: retryUrl },
  });
}

function reload() {
  // Offline хуудас дээр байхад F5 нь апп-ыг дахин оролдоно.
  if (win.webContents.getURL().startsWith("file:")) win.loadURL(APP_URL);
  else win.webContents.reload();
}

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: "Апп",
      submenu: [
        {
          label: "Нүүр хуудас",
          accelerator: "Alt+Home",
          click: () => win.loadURL(APP_URL),
        },
        {
          label: "Буцах",
          accelerator: "Alt+Left",
          click: () => win.webContents.navigationHistory.goBack(),
        },
        { label: "Дахин ачаалах", accelerator: "F5", click: reload },
        { type: "separator" },
        { label: "Гарах", role: "quit" },
      ],
    },
    {
      label: "Засах",
      submenu: [
        { label: "Буцаах", role: "undo" },
        { label: "Дахин хийх", role: "redo" },
        { type: "separator" },
        { label: "Хайчлах", role: "cut" },
        { label: "Хуулах", role: "copy" },
        { label: "Буулгах", role: "paste" },
        { label: "Бүгдийг сонгох", role: "selectAll" },
      ],
    },
    {
      label: "Харах",
      submenu: [
        { label: "Томруулах", role: "zoomIn" },
        { label: "Жижигрүүлэх", role: "zoomOut" },
        { label: "Анхны хэмжээ", role: "resetZoom" },
        { type: "separator" },
        { label: "Бүтэн дэлгэц", role: "togglefullscreen" },
        { label: "Хөгжүүлэгчийн хэрэгсэл", role: "toggleDevTools" },
      ],
    },
  ]);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    // bg-zinc-950 — ачаалах зуур цагаан дэлгэц анивчихгүй.
    backgroundColor: "#09090b",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.maximize();

  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (isInAppUrl(url)) return;
    event.preventDefault();
    openExternal(url);
  });

  win.webContents.on(
    "did-fail-load",
    (_event, errorCode, _description, validatedURL, isMainFrame) => {
      // -3 (ERR_ABORTED) нь шилжилт өөр шилжилтээр солигдсон гэсэн үг, алдаа биш.
      if (!isMainFrame || errorCode === -3) return;
      showOffline(validatedURL);
    },
  );

  win.on("closed", () => {
    win = null;
  });

  win.loadURL(APP_URL);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler(
      (_webContents, permission, callback) =>
        callback(ALLOWED_PERMISSIONS.has(permission)),
    );
    Menu.setApplicationMenu(buildMenu());
    createWindow();
  });
}
