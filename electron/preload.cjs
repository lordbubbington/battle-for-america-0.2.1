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

contextBridge.exposeInMainWorld('bfaAchievements', {
  isDesktop: true,
  loadProfile: () => ipcRenderer.invoke('bfa-achievements:load'),
  saveProfile: (profile) => ipcRenderer.invoke('bfa-achievements:save', profile),
  unlockSteam: (steamApiName) => ipcRenderer.invoke('bfa-achievements:unlock-steam', steamApiName),
  syncSteam: (steamApiNames) => ipcRenderer.invoke('bfa-achievements:sync-steam', steamApiNames),
  getSteamStatus: () => ipcRenderer.invoke('bfa-achievements:steam-status'),
});
