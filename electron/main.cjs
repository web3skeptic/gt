// Electron shell for the gym tracker. Loads the production build from dist/ over a private
// app:// scheme (so the renderer has a real origin for CORS) and lets the app sync with the
// CouchDB configured under Settings → Sync — by default the local instance on 127.0.0.1:5984.
const { app, BrowserWindow, protocol, net, shell, ipcMain } = require('electron');
const scale = require('./scale.cjs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DIST = path.join(__dirname, '..', 'dist');
const SCHEME = 'app';
const HOST = 'gt';

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);

function serveDist() {
  protocol.handle(SCHEME, (request) => {
    const url = new URL(request.url);
    let file = decodeURIComponent(url.pathname);
    if (file.startsWith('/gt/')) file = file.slice(3);          // build uses base /gt/
    if (file === '/' || file === '') file = '/index.html';
    const target = path.normalize(path.join(DIST, file));
    if (!target.startsWith(DIST)) return new Response('forbidden', { status: 403 });
    const fallback = path.join(DIST, 'index.html');
    return net.fetch(pathToFileURL(target).toString()).catch(() => net.fetch(pathToFileURL(fallback).toString()));
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 860,
    minWidth: 360,
    title: 'Gym Tracker',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true }
  });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  if (process.env.GT_DEBUG) {
    win.webContents.on('console-message', (e, level, message) => {
      const msg = typeof e === 'object' && e && 'message' in e ? `${e.level ?? ''} ${e.message}` : `${level} ${message}`;
      process.stdout.write(`[renderer] ${msg}\n`);
    });
  }
  win.loadURL(`${SCHEME}://${HOST}/gt/`);
  return win;
}

let scaleBusy = false;
ipcMain.handle('scale:configured', () => {
  try { return !!scale.loadConfig(app.getPath('userData')); } catch { return false; }
});
ipcMain.handle('scale:read', async (event) => {
  if (scaleBusy) throw new Error('a scale reading is already running');
  const cfg = scale.loadConfig(app.getPath('userData'));
  if (!cfg) throw new Error(`no scale.json in ${app.getPath('userData')}`);
  scaleBusy = true;
  try {
    return await scale.readScale(cfg, (line) => { if (!event.sender.isDestroyed()) event.sender.send('scale:progress', line); });
  } finally {
    scaleBusy = false;
  }
});

app.whenReady().then(() => {
  serveDist();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
