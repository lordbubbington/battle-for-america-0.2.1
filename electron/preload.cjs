const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bfaMods', {
  isDesktop: true,
  listMods: () => ipcRenderer.invoke('bfa-mods:list'),
  openModsFolder: () => ipcRenderer.invoke('bfa-mods:open-folder'),
  createExampleMod: () => ipcRenderer.invoke('bfa-mods:create-example'),
});
