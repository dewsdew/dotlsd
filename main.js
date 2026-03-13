const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const { exec } = require('child_process');
const chokidar = require('chokidar');

let mainWindow;
let watcher = null;

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'];

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
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false
        },
    });

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

// ──────────────────────────────────────────────
// Folder Watcher (chokidar)
// ──────────────────────────────────────────────
function startWatching(folderPath) {
    // Stop existing watcher if any
    if (watcher) {
        watcher.close();
        watcher = null;
    }

    console.log(`[Watcher] Watching folder: ${folderPath}`);

    watcher = chokidar.watch(folderPath, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true,       // don't trigger for existing files
        awaitWriteFinish: {
            stabilityThreshold: 1000, // wait 1s after last write
            pollInterval: 200
        }
    });

    watcher.on('add', (filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (!IMAGE_EXTENSIONS.includes(ext)) return;

        console.log(`[Watcher] New image detected: ${filePath}`);

        // Send to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('new-photo', {
                filePath: filePath,
                fileName: path.basename(filePath),
                timestamp: new Date().toISOString()
            });
        }

        // Minimize DSLRBooth & bring dotlsd to front
        bringAppToFront();
    });

    watcher.on('error', (error) => {
        console.error(`[Watcher] Error: ${error.message}`);
    });
}

function stopWatching() {
    if (watcher) {
        watcher.close();
        watcher = null;
        console.log('[Watcher] Stopped watching.');
    }
}

// Bring dotlsd Electron window to front & minimize DSLRBooth
function bringAppToFront() {
    // Minimize DSLRBooth window via PowerShell
    const hideCmd = `powershell -Command "$procs = [System.Diagnostics.Process]::GetProcessesByName('dslrBooth'); foreach($p in $procs){ if($p.MainWindowHandle -ne 0){ Add-Type -Name W -Namespace N -MemberDefinition '[DllImport(\\\"user32.dll\\\")] public static extern bool ShowWindow(IntPtr h, int c);'; [N.W]::ShowWindow($p.MainWindowHandle, 6) } }"`;
    exec(hideCmd, (error) => {
        if (error) console.error('Failed to hide DSLRBooth:', error.message);
        else console.log('[Watcher] DSLRBooth minimized');
    });

    // Bring Electron window to front
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
        mainWindow.setAlwaysOnTop(true);
        setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.setAlwaysOnTop(false);
            }
        }, 500);
    }
}

// ──────────────────────────────────────────────
// IPC Handlers
// ──────────────────────────────────────────────

// Focus an external app window by its title
ipcMain.handle('focus-app', async (_event, windowTitle) => {
    return new Promise((resolve) => {
        const psCommand = `powershell -Command "(New-Object -ComObject WScript.Shell).AppActivate('${windowTitle}')"`;
        exec(psCommand, (error) => {
            if (error) {
                console.error('Failed to focus app:', error.message);
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
});

// Open folder picker dialog
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select DSLRBooth output folder'
    });
    if (result.canceled) return null;
    return result.filePaths[0];
});

// Start watching a folder
ipcMain.handle('start-watching', async (_event, folderPath) => {
    startWatching(folderPath);
    return true;
});

// Stop watching
ipcMain.handle('stop-watching', async () => {
    stopWatching();
    return true;
});

// ──────────────────────────────────────────────
// App Lifecycle
// ──────────────────────────────────────────────
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    stopWatching();
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

