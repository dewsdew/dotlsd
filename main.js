const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        title: 'DSLRBooth Controller',
        backgroundColor: '#0b0f19',
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false // Disabled to allow local API fetches or configure CSP
        },
    });

    // Load the statically exported Next.js app
    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, 'out/index.html'),
            protocol: 'file:',
            slashes: true
        })
    );

    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
