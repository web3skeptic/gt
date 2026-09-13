const { contextBridge, ipcRenderer } = require('electron');
// Bridge between the web app and the desktop shell.
contextBridge.exposeInMainWorld('gtDesktop', {
  platform: process.platform,
  // Bluetooth scale (see electron/scale.cjs)
  scaleConfigured: () => ipcRenderer.invoke('scale:configured'),
  readScale: () => ipcRenderer.invoke('scale:read'),
  onScaleProgress: (cb) => {
    const handler = (_e, msg) => cb(msg);
    ipcRenderer.on('scale:progress', handler);
    return () => ipcRenderer.removeListener('scale:progress', handler);
  }
});
