const { contextBridge } = require('electron');
// Lets the web app know it runs inside the desktop shell (used for the default sync URL).
contextBridge.exposeInMainWorld('gtDesktop', { platform: process.platform });
