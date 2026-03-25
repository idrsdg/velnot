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

// Register velnot:// custom protocol to serve local audio files
protocol.registerSchemesAsPrivileged([
  { scheme: 'velnot', privileges: { secure: true, standard: true, stream: true } },
]);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

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
    titleBarStyle: 'hiddenInset',
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
    updateInterval: '1 hour',
    notifyUser: true,
  });
}

app.on('ready', async () => {
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
});
