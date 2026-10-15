const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('updater', {
  onUpdate: (cb) => ipcRenderer.on('update', (_e, data) => cb(data)),
  install: () => ipcRenderer.send('update:install'),
  open: (url) => ipcRenderer.send('update:open', url)
});
