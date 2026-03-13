const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    focusApp: (windowTitle) => ipcRenderer.invoke('focus-app', windowTitle),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    startWatching: (folderPath) => ipcRenderer.invoke('start-watching', folderPath),
    stopWatching: () => ipcRenderer.invoke('stop-watching'),
    onNewPhoto: (callback) => {
        ipcRenderer.on('new-photo', (_event, data) => callback(data));
    },
});

