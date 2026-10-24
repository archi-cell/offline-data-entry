
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('entryAPI', {
    getCategories: () => ipcRenderer.invoke('entries:getCategories'),
    getAll: () => ipcRenderer.invoke('entries:getAll'),
    getToday: () => ipcRenderer.invoke('entries:getToday'),
    create: (entry) => ipcRenderer.invoke('entries:create', entry),
    update: (entry) => ipcRenderer.invoke('entries:update', entry),
    delete: (id) => ipcRenderer.invoke('entries:delete', id),

    createBackup: () => ipcRenderer.invoke('backup:create'),
    restoreBackup: () => ipcRenderer.invoke('backup:restore'),

    getSettingsInfo: () => ipcRenderer.invoke('settings:getInfo'),
    openDatabaseFolder: () =>
        ipcRenderer.invoke('settings:openDatabaseFolder')
});
