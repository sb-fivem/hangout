const { app, BrowserWindow, session, ipcMain, shell } = require('electron');
const path = require('path');
const pkg = require('./package.json');
const pub = (pkg.build && pkg.build.publish) || {};
let win;

function send(channel, data) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, data);
}

function createWindow() {
  win = new BrowserWindow({
    width: 980, height: 660, minWidth: 720, minHeight: 480,
    backgroundColor: '#1b2230', autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.js') }
  });
  win.loadFile('index.html');
}

// ---------- updates ----------
const isNewer = (a, b) => {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
  return false;
};

function setupUpdates() {
  if (!app.isPackaged || !pub.owner || pub.owner === 'YOUR-GITHUB-USERNAME') return;

  if (process.platform === 'win32') {
    // Windows: downloads in the background, installs on restart
    const { autoUpdater } = require('electron-updater');
    autoUpdater.on('update-available', (i) => send('update', { state: 'downloading', version: i.version }));
    autoUpdater.on('update-downloaded', (i) => send('update', { state: 'ready', version: i.version }));
    autoUpdater.on('error', (e) => console.error('Update error:', e));
    ipcMain.on('update:install', () => autoUpdater.quitAndInstall());
    const check = () => autoUpdater.checkForUpdates().catch(() => {});
    check(); setInterval(check, 30 * 60 * 1000);
  } else {
    // Mac/Linux: unsigned apps can't self-install, so notify and link to the download
    const check = async () => {
      try {
        const r = await fetch(`https://api.github.com/repos/${pub.owner}/${pub.repo}/releases/latest`, { headers: { 'User-Agent': 'hangout' } });
        if (!r.ok) return;
        const j = await r.json();
        const latest = (j.tag_name || '').replace(/^v/, '');
        if (latest && isNewer(latest, app.getVersion())) send('update', { state: 'manual', version: latest, url: j.html_url });
      } catch {}
    };
    check(); setInterval(check, 30 * 60 * 1000);
  }
}

ipcMain.on('update:open', (_e, url) => {
  if (typeof url === 'string' && url.startsWith('https://github.com/')) shell.openExternal(url);
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'media'));
  createWindow();
  win.webContents.once('did-finish-load', setupUpdates);
});
app.on('window-all-closed', () => app.quit());
