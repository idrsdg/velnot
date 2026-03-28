import { app, BrowserWindow, session, Tray, Menu, nativeImage, protocol, net } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import { registerIpcHandlers } from './main/ipc';
import { initDb } from './main/db';
import { getSetting } from './main/settings';
import { buildAppMenu } from './main/menu';
import { updateElectronApp } from 'update-electron-app';

if (started) app.quit();

// Single instance lock — required for deep link handling on Windows
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

// Register velnot:// custom protocol to serve local audio files
protocol.registerSchemesAsPrivileged([
  { scheme: 'velnot', privileges: { secure: true, standard: true, stream: true } },
]);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let warmupTimer: ReturnType<typeof setInterval> | null = null;

function getIconPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icon.ico');
  }
  // Geliştirme: __dirname = .vite/build/, iki üst dizin = proje kökü
  return path.join(__dirname, '../../assets/icon.ico');
}

const createTray = () => {
  const icon = nativeImage.createFromPath(getIconPath());
  tray = new Tray(icon);
  tray.setToolTip('Velnot');

  const menu = Menu.buildFromTemplate([
    {
      label: 'Aç',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Çıkış',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 680,
    minWidth: 800,
    minHeight: 560,
    backgroundColor: '#0f0f0f',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#150f09',
      symbolColor: '#6a5040',
      height: 38,
    },
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Kapatınca tray'e küçült, uygulamayı sonlandırma
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
};

// Otomatik güncelleme — GitHub Releases üzerinden
if (app.isPackaged) {
  updateElectronApp({
    repo: 'idrsdg/velnot',
    updateInterval: '5 minutes',
    notifyUser: true,
  });
}

function handleAuthUrl(url: string): void {
  if (!mainWindow) return;
  try {
    const params = new URL(url).searchParams;
    mainWindow.webContents.send('auth:login', {
      email: params.get('email'),
      plan: params.get('plan'),
      expires: params.get('expires'),
    });
    mainWindow.show();
    mainWindow.focus();
  } catch (e) {
    console.error('handleAuthUrl error:', e);
  }
}

// Windows: second-instance fires when a second instance opens with a deep link
app.on('second-instance', (_event, argv) => {
  const url = argv.find(a => a.startsWith('velnotauth://'));
  if (url) handleAuthUrl(url);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// macOS: open-url event
app.on('open-url', (_event, url) => {
  handleAuthUrl(url);
});

// Backend warm-up — prevents Render free-tier cold start (~30-60s delay)
function warmupBackend(): void {
  fetch('https://velnot-backend.onrender.com/health', { signal: AbortSignal.timeout(30000) })
    .catch(() => { /* silent */ });
}

app.on('ready', async () => {
  // Register the velnotauth:// protocol so Windows routes deep links to this app
  app.setAsDefaultProtocolClient('velnotauth');

  // Check if the app was launched via a deep link (Windows)
  const startUrl = process.argv.find(a => a.startsWith('velnotauth://'));

  await initDb();

  // Serve local .webm audio files via velnot://{sessionId}
  protocol.handle('velnot', (request) => {
    const sessionId = new URL(request.url).hostname;
    const filePath = path.join(app.getPath('userData'), 'sessions', `${sessionId}.webm`);
    if (!fs.existsSync(filePath)) {
      return new Response('Not found', { status: 404 });
    }
    return net.fetch(`file://${filePath}`);
  });

  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media' || permission === 'display-capture');
  });
  registerIpcHandlers();
  const uiLang = getSetting('ui_language') || 'en';
  buildAppMenu(uiLang);
  createWindow();
  createTray();
  warmupBackend();
  warmupTimer = setInterval(warmupBackend, 9 * 60 * 1000); // keep warm every 9 min (Render sleeps at 15 min)

  // Handle deep link that launched the app
  if (startUrl) {
    mainWindow?.webContents.once('did-finish-load', () => {
      handleAuthUrl(startUrl);
    });
  }
});

app.on('window-all-closed', () => {
  // Tray aktifken uygulamayı kapatma
  if (process.platform !== 'darwin' && !tray) app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else mainWindow?.show();
});

app.on('before-quit', () => {
  (app as any).isQuitting = true;
  if (warmupTimer) clearInterval(warmupTimer);
  // Force exit if normal quit hangs (pending fetch/IPC keeps process alive)
  setTimeout(() => process.exit(0), 2000).unref();
});
