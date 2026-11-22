const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bfaMods', {
  isDesktop: true,
  listMods: () => ipcRenderer.invoke('bfa-mods:list'),
  openModsFolder: () => ipcRenderer.invoke('bfa-mods:open-folder'),
  createExampleMod: () => ipcRenderer.invoke('bfa-mods:create-example'),
  getWorkshopStatus: () => ipcRenderer.invoke('bfa-mods:workshop-status'),
  configureWorkshop: (cfg) => ipcRenderer.invoke('bfa-mods:workshop-configure', cfg),
  prepareWorkshopUpload: (opts) => ipcRenderer.invoke('bfa-mods:workshop-prepare-vdf', opts),
});
