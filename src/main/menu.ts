import { Menu, app, BrowserWindow, shell } from 'electron';

type LangKey = 'en' | 'tr' | 'es' | 'fr' | 'de' | 'pt' | 'zh' | 'ar' | 'hi';

interface MenuLabels {
  file: string; newRecording: string; viewHistory: string; settings: string; quit: string;
  edit: string; undo: string; redo: string; cut: string; copy: string; paste: string; selectAll: string;
  view: string; fullscreen: string; zoomIn: string; zoomOut: string; resetZoom: string; devTools: string;
  window: string; minimize: string; maximize: string; closeToTray: string;
  help: string; about: string; website: string; reportIssue: string;
}

const labels: Record<LangKey, MenuLabels> = {
  en: {
    file: 'File', newRecording: 'New Recording', viewHistory: 'History', settings: 'Settings', quit: 'Quit',
    edit: 'Edit', undo: 'Undo', redo: 'Redo', cut: 'Cut', copy: 'Copy', paste: 'Paste', selectAll: 'Select All',
    view: 'View', fullscreen: 'Toggle Full Screen', zoomIn: 'Zoom In', zoomOut: 'Zoom Out', resetZoom: 'Reset Zoom', devTools: 'Developer Tools',
    window: 'Window', minimize: 'Minimize', maximize: 'Maximize', closeToTray: 'Close to Tray',
    help: 'Help', about: 'About Velnot', website: 'Visit Website', reportIssue: 'Report Issue',
  },
  tr: {
    file: 'Dosya', newRecording: 'Yeni Kayıt', viewHistory: 'Geçmiş', settings: 'Ayarlar', quit: 'Çıkış',
    edit: 'Düzenle', undo: 'Geri Al', redo: 'İleri Al', cut: 'Kes', copy: 'Kopyala', paste: 'Yapıştır', selectAll: 'Tümünü Seç',
    view: 'Görünüm', fullscreen: 'Tam Ekrana Geç', zoomIn: 'Yakınlaştır', zoomOut: 'Uzaklaştır', resetZoom: 'Yakınlaşmayı Sıfırla', devTools: 'Geliştirici Araçları',
    window: 'Pencere', minimize: 'Küçült', maximize: 'Büyüt', closeToTray: 'Tepsiye Küçült',
    help: 'Yardım', about: 'Velnot Hakkında', website: 'Web Sitesini Ziyaret Et', reportIssue: 'Sorun Bildir',
  },
  es: {
    file: 'Archivo', newRecording: 'Nueva Grabación', viewHistory: 'Historial', settings: 'Ajustes', quit: 'Salir',
    edit: 'Editar', undo: 'Deshacer', redo: 'Rehacer', cut: 'Cortar', copy: 'Copiar', paste: 'Pegar', selectAll: 'Seleccionar Todo',
    view: 'Ver', fullscreen: 'Pantalla Completa', zoomIn: 'Acercar', zoomOut: 'Alejar', resetZoom: 'Restablecer Zoom', devTools: 'Herramientas de Desarrollador',
    window: 'Ventana', minimize: 'Minimizar', maximize: 'Maximizar', closeToTray: 'Cerrar a la Bandeja',
    help: 'Ayuda', about: 'Acerca de Velnot', website: 'Visitar Sitio Web', reportIssue: 'Reportar Problema',
  },
  fr: {
    file: 'Fichier', newRecording: 'Nouvel Enregistrement', viewHistory: 'Historique', settings: 'Paramètres', quit: 'Quitter',
    edit: 'Édition', undo: 'Annuler', redo: 'Rétablir', cut: 'Couper', copy: 'Copier', paste: 'Coller', selectAll: 'Tout Sélectionner',
    view: 'Affichage', fullscreen: 'Plein Écran', zoomIn: 'Agrandir', zoomOut: 'Réduire', resetZoom: 'Réinitialiser le Zoom', devTools: 'Outils Développeur',
    window: 'Fenêtre', minimize: 'Réduire', maximize: 'Agrandir', closeToTray: 'Réduire dans la Barre',
    help: 'Aide', about: 'À Propos de Velnot', website: 'Visiter le Site', reportIssue: 'Signaler un Problème',
  },
  de: {
    file: 'Datei', newRecording: 'Neue Aufnahme', viewHistory: 'Verlauf', settings: 'Einstellungen', quit: 'Beenden',
    edit: 'Bearbeiten', undo: 'Rückgängig', redo: 'Wiederholen', cut: 'Ausschneiden', copy: 'Kopieren', paste: 'Einfügen', selectAll: 'Alles Auswählen',
    view: 'Ansicht', fullscreen: 'Vollbild', zoomIn: 'Vergrößern', zoomOut: 'Verkleinern', resetZoom: 'Zoom Zurücksetzen', devTools: 'Entwicklertools',
    window: 'Fenster', minimize: 'Minimieren', maximize: 'Maximieren', closeToTray: 'Im Tray Ausblenden',
    help: 'Hilfe', about: 'Über Velnot', website: 'Website Besuchen', reportIssue: 'Problem Melden',
  },
  pt: {
    file: 'Arquivo', newRecording: 'Nova Gravação', viewHistory: 'Histórico', settings: 'Configurações', quit: 'Sair',
    edit: 'Editar', undo: 'Desfazer', redo: 'Refazer', cut: 'Recortar', copy: 'Copiar', paste: 'Colar', selectAll: 'Selecionar Tudo',
    view: 'Exibir', fullscreen: 'Tela Cheia', zoomIn: 'Aumentar Zoom', zoomOut: 'Diminuir Zoom', resetZoom: 'Redefinir Zoom', devTools: 'Ferramentas do Desenvolvedor',
    window: 'Janela', minimize: 'Minimizar', maximize: 'Maximizar', closeToTray: 'Fechar para Bandeja',
    help: 'Ajuda', about: 'Sobre o Velnot', website: 'Visitar Site', reportIssue: 'Reportar Problema',
  },
  zh: {
    file: '文件', newRecording: '新建录音', viewHistory: '历史', settings: '设置', quit: '退出',
    edit: '编辑', undo: '撤销', redo: '重做', cut: '剪切', copy: '复制', paste: '粘贴', selectAll: '全选',
    view: '视图', fullscreen: '切换全屏', zoomIn: '放大', zoomOut: '缩小', resetZoom: '重置缩放', devTools: '开发者工具',
    window: '窗口', minimize: '最小化', maximize: '最大化', closeToTray: '最小化到托盘',
    help: '帮助', about: '关于 Velnot', website: '访问网站', reportIssue: '报告问题',
  },
  ar: {
    file: 'ملف', newRecording: 'تسجيل جديد', viewHistory: 'السجل', settings: 'الإعدادات', quit: 'خروج',
    edit: 'تحرير', undo: 'تراجع', redo: 'إعادة', cut: 'قص', copy: 'نسخ', paste: 'لصق', selectAll: 'تحديد الكل',
    view: 'عرض', fullscreen: 'ملء الشاشة', zoomIn: 'تكبير', zoomOut: 'تصغير', resetZoom: 'إعادة ضبط التكبير', devTools: 'أدوات المطور',
    window: 'نافذة', minimize: 'تصغير', maximize: 'تكبير', closeToTray: 'إخفاء في شريط المهام',
    help: 'مساعدة', about: 'حول Velnot', website: 'زيارة الموقع', reportIssue: 'الإبلاغ عن مشكلة',
  },
  hi: {
    file: 'फ़ाइल', newRecording: 'नई रिकॉर्डिंग', viewHistory: 'इतिहास', settings: 'सेटिंग्स', quit: 'बाहर निकलें',
    edit: 'संपादित करें', undo: 'पूर्ववत करें', redo: 'फिर से करें', cut: 'काटें', copy: 'कॉपी करें', paste: 'पेस्ट करें', selectAll: 'सभी चुनें',
    view: 'देखें', fullscreen: 'पूर्ण स्क्रीन', zoomIn: 'ज़ूम इन', zoomOut: 'ज़ूम आउट', resetZoom: 'ज़ूम रीसेट करें', devTools: 'डेवलपर टूल्स',
    window: 'विंडो', minimize: 'छोटा करें', maximize: 'बड़ा करें', closeToTray: 'ट्रे में बंद करें',
    help: 'सहायता', about: 'Velnot के बारे में', website: 'वेबसाइट देखें', reportIssue: 'समस्या रिपोर्ट करें',
  },
};

function getLabels(lang: string): MenuLabels {
  return labels[lang as LangKey] ?? labels['en'];
}

export function buildAppMenu(lang: string): void {
  const l = getLabels(lang);
  const isDev = !app.isPackaged;

  const getWin = () => BrowserWindow.getAllWindows()[0] ?? null;

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: l.file,
      submenu: [
        {
          label: l.newRecording,
          accelerator: 'CmdOrCtrl+N',
          click: () => getWin()?.webContents.send('menu:navigate', 'recording'),
        },
        {
          label: l.viewHistory,
          accelerator: 'CmdOrCtrl+H',
          click: () => getWin()?.webContents.send('menu:navigate', 'history'),
        },
        {
          label: l.settings,
          accelerator: 'CmdOrCtrl+,',
          click: () => getWin()?.webContents.send('menu:navigate', 'settings'),
        },
        { type: 'separator' },
        {
          label: l.quit,
          accelerator: 'CmdOrCtrl+Q',
          click: () => { (app as any).isQuitting = true; app.quit(); },
        },
      ],
    },
    {
      label: l.edit,
      submenu: [
        { label: l.undo,      accelerator: 'CmdOrCtrl+Z',       role: 'undo' },
        { label: l.redo,      accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
        { type: 'separator' },
        { label: l.cut,       accelerator: 'CmdOrCtrl+X',       role: 'cut' },
        { label: l.copy,      accelerator: 'CmdOrCtrl+C',       role: 'copy' },
        { label: l.paste,     accelerator: 'CmdOrCtrl+V',       role: 'paste' },
        { label: l.selectAll, accelerator: 'CmdOrCtrl+A',       role: 'selectAll' },
      ],
    },
    {
      label: l.view,
      submenu: [
        {
          label: l.fullscreen,
          accelerator: 'F11',
          click: () => {
            const win = getWin();
            if (win) win.setFullScreen(!win.isFullScreen());
          },
        },
        { type: 'separator' },
        { label: l.zoomIn,    accelerator: 'CmdOrCtrl+=', role: 'zoomIn' },
        { label: l.zoomOut,   accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: l.resetZoom, accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        ...(isDev ? [
          { type: 'separator' as const },
          {
            label: l.devTools,
            accelerator: 'F12',
            click: () => getWin()?.webContents.toggleDevTools(),
          },
        ] : []),
      ],
    },
    {
      label: l.window,
      submenu: [
        {
          label: l.minimize,
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize',
        },
        {
          label: l.maximize,
          click: () => {
            const win = getWin();
            if (!win) return;
            win.isMaximized() ? win.unmaximize() : win.maximize();
          },
        },
        { type: 'separator' },
        {
          label: l.closeToTray,
          accelerator: 'CmdOrCtrl+W',
          click: () => getWin()?.hide(),
        },
      ],
    },
    {
      label: l.help,
      submenu: [
        {
          label: l.about,
          click: () => {
            const win = getWin();
            if (!win) return;
            win.show();
            win.webContents.send('menu:navigate', 'settings');
          },
        },
        { type: 'separator' },
        {
          label: l.website,
          click: () => shell.openExternal('https://velnot.com'),
        },
        {
          label: l.reportIssue,
          click: () => shell.openExternal('https://github.com/idrsdg/velnot/issues'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
