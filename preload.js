const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use IPC
contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  sendWindowDrag: (dragData) => ipcRenderer.send('window-drag', dragData),
  onFileOpen: (callback) => ipcRenderer.on('open-file', (_, path) => callback(path))
});