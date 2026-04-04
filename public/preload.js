const { contextBridge, ipcRenderer } = require('electron');
console.log('✅ preload.js yüklendi');
contextBridge.exposeInMainWorld('electronAPI', {
  // Mamül işlemleri
  searchMamul: (ad) => ipcRenderer.invoke('search-mamul', ad),
  addMamul: (mamul) => ipcRenderer.invoke('add-mamul', mamul),
  updateMamul: (mamul) => ipcRenderer.invoke('update-mamul', mamul),
  deleteMamul: (ad) => ipcRenderer.invoke('delete-mamul', ad),
  importMamuller: (list) => ipcRenderer.invoke('import-mamuller', list),

  // Kullanıcı işlemleri
  loginUser: (user) => ipcRenderer.invoke('login-user', user),
  createUser: (user) => ipcRenderer.invoke('create-user', user),
});
