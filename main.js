const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

// Global reference to prevent garbage collection
let mainWindow;

// Check if this is the first instance of the app
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  // Someone tried to run a second instance, focus our window instead
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Protocol handler for Windows
    // For handling file opens from Explorer
    const fileToOpen = getFileFromArgs(commandLine);
    
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      
      // If a file is being opened, send it to the renderer
      if (fileToOpen) {
        mainWindow.webContents.send('open-file', fileToOpen);
      }
    }
  });
}

function createWindow() {
  // Create the browser window with custom styling
  mainWindow = new BrowserWindow({
    width: 800,
    height: 400,
    frame: false,        // No standard window frame (we use custom one)
    resizable: false,    // Fixed size
    transparent: false,
    icon: path.join(__dirname, 'icon.ico'), // Added icon path here
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load the index.html file
  mainWindow.loadFile('index.html');
  
  // Process file from startup args
  const fileToOpen = getFileFromArgs(process.argv);
  if (fileToOpen) {
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.send('open-file', fileToOpen);
    });
  }
}

// Function to extract file path from command line arguments
function getFileFromArgs(args) {
  if (!args || !args.length) return null;
  
  // Check for file arguments
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.endsWith('.mp3') || arg.endsWith('.wav') || 
        arg.endsWith('.ogg') || arg.endsWith('.flac') || 
        arg.endsWith('.m4a')) {
      return arg;
    }
  }
  return null;
}

// Create window when app is ready
app.whenReady().then(() => {
  // Register protocol handler for Windows 10+
  if (process.platform === 'win32') {
    app.setAsDefaultProtocolClient('jonas-mp3-player');
  }
  
  createWindow();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Handle IPC messages
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('window-drag', (_, { dx, dy }) => {
  if (!mainWindow) return;
  
  const [x, y] = mainWindow.getPosition();
  mainWindow.setPosition(x + dx, y + dy);
});

// Add file dialog handler
ipcMain.handle('dialog:openFile', async () => {
  if (!mainWindow) return [];
  
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a'] }
    ]
  });
  
  if (canceled) {
    return [];
  } else {
    return filePaths;
  }
});

// Handle file open from Explorer
app.on('open-file', (event, path) => {
  event.preventDefault();
  
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('open-file', path);
  }
});