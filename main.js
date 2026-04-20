import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

function createWindow() {
  console.log("Electron starting...");
  console.log("App packaged:", app.isPackaged);
  console.log("isDev:", isDev);
  console.log("__dirname:", __dirname);
  console.log("resourcesPath:", process.resourcesPath);

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  // ALWAYS open DevTools for debugging
  win.webContents.openDevTools();

  // Catch page load errors
  win.webContents.on("did-fail-load", (event, code, desc, url) => {
    console.error("❌ Page failed to load");
    console.error("Error code:", code);
    console.error("Description:", desc);
    console.error("URL:", url);
  });

  // Catch renderer crashes
  win.webContents.on("render-process-gone", (event, details) => {
    console.error("❌ Renderer crashed:", details);
  });

  // Catch console messages from renderer
  win.webContents.on("console-message", (event, level, message) => {
    console.log("Renderer console:", message);
  });

  if (isDev) {
    console.log("Loading DEV server...");
    win.loadURL('http://localhost:3000');
  } else {
    console.log("Loading production build...");

    const possiblePaths = [
      path.join(__dirname, 'out', 'index.html'),
      path.join(__dirname, '..', 'out', 'index.html'),
      path.join(process.resourcesPath, 'app.asar', 'out', 'index.html'),
      path.join(__dirname, 'index.html')
    ];

    console.log("Checking possible paths:");
    possiblePaths.forEach(p => console.log(" -", p));

    const indexPath = possiblePaths.find(p => fs.existsSync(p));

    if (indexPath) {
      console.log("✅ Found index.html at:", indexPath);
      win.loadFile(indexPath).catch(err => {
        console.error("❌ Failed to load file:", err);
      });
    } else {
      console.error("❌ Could not find index.html anywhere.");
      console.error("Trying fallback...");

      const fallback = `file://${path.join(__dirname, 'out', 'index.html')}`;
      console.log("Fallback URL:", fallback);
      win.loadURL(fallback);
    }
  }
}

app.whenReady().then(() => {
  console.log("App ready");
  createWindow();
});

app.on('window-all-closed', () => {
  console.log("All windows closed");
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  console.log("App activate");
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});