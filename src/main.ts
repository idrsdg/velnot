import { app, BrowserWindow, session, Tray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { registerIpcHandlers } from './main/ipc';
import { updateElectronApp } from 'update-electron-app';

if (started) app.quit();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const createTray = () => {
  // Küçük bir PNG icon oluştur (16x16 boş, platform kendi ikonunu kullanır)
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Silent Note AI');

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
  updateElectronApp();
}

app.on('ready', () => {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media' || permission === 'display-capture');
  });
  registerIpcHandlers();
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
