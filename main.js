import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

// ---- Dev server config ----
const DEV_URL = process.env.ELECTRON_DEV_URL || 'http://localhost:3000';
// Default to /view/dashboard so we bypass the MSAL sign-in page. RequireAuth
// will let us in because preload.cjs writes a userProfile into localStorage.
const INITIAL_PATH = process.env.ELECTRON_INITIAL_PATH || '/view/dashboard';
// How long we are willing to wait for the Next.js dev server before giving up.
// Default: 180 * 1s = 3 minutes (first compile with MSAL/Prisma/Lexical can be slow).
const PING_RETRIES = Number(process.env.ELECTRON_LOAD_RETRIES || 180);
const PING_DELAY_MS = Number(process.env.ELECTRON_LOAD_RETRY_MS || 1000);
const PING_REQUEST_TIMEOUT_MS = 120000; // let the compile run — Next.js blocks the response until compile is done.

// ---- Desktop-mode auto-login profile ----
const desktopUserProfile = {
  userId: 1,
  userProfileId: 1,
  email: 'developer@dev.local',
  roles: ['Superadmin'],
  msalAccount: {
    name: 'Developer (Desktop Mode)',
    username: 'developer@dev.local',
  },
};

function createDesktopSessionToken() {
  const secret = process.env.SESSION_SECRET || 'desktop-dev-session-secret-please-change';
  const appId = process.env.NEXT_PUBLIC_CLIENT_ID || 'desktop-dev-client';

  return jwt.sign(
    {
      email: desktopUserProfile.email,
      name: desktopUserProfile.msalAccount.name,
    },
    secret,
    {
      expiresIn: '24h',
      issuer: appId,
      audience: appId,
    }
  );
}

/**
 * Make a plain HTTP GET and resolve with { statusCode } or { error }.
 * Gives Next.js up to PING_REQUEST_TIMEOUT_MS to finish compiling — it holds
 * the TCP connection open while compiling, so the first request can be slow.
 */
function pingServer(url) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const req = http.get(url, (res) => {
      // Drain and discard body so the socket can close cleanly.
      res.resume();
      done({ statusCode: res.statusCode });
    });

    req.on('error', (err) => done({ error: err.code || err.message }));
    req.setTimeout(PING_REQUEST_TIMEOUT_MS, () => {
      req.destroy();
      done({ error: 'PING_TIMEOUT' });
    });
  });
}

async function waitForDevServer(url, win) {
  for (let attempt = 1; attempt <= PING_RETRIES; attempt++) {
    const { statusCode, error } = await pingServer(url);

    if (statusCode && statusCode < 500) {
      console.log(`✅ Dev server responded ${statusCode} on attempt ${attempt}`);
      return true;
    }

    const reason = error || `status ${statusCode}`;
    console.log(`⏳ Attempt ${attempt}/${PING_RETRIES}: dev server not ready (${reason})`);

    // Update the loading page so the user can see progress.
    if (win && !win.isDestroyed()) {
      try {
        await win.webContents.executeJavaScript(
          `document.getElementById('status') && (document.getElementById('status').textContent = 'Attempt ${attempt}/${PING_RETRIES} — ${reason}');`
        );
      } catch {
        // ignore; the loading page may not have rendered yet
      }
    }

    await new Promise((r) => setTimeout(r, PING_DELAY_MS));
  }
  return false;
}

function loadingPageDataUrl(message) {
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Starting Student Study Planner…</title>
    <style>
      html, body { margin:0; padding:0; height:100%; background:#0a0a0a; color:#eee;
        font-family: -apple-system, Segoe UI, Roboto, sans-serif; }
      .wrap { height:100%; display:flex; align-items:center; justify-content:center; }
      .card { text-align:center; max-width:480px; padding:32px; }
      h1 { font-size:20px; margin:0 0 8px; }
      p { margin:6px 0; color:#aaa; font-size:14px; }
      .spinner { border:3px solid #333; border-top:3px solid #4f9eff; border-radius:50%;
        width:36px; height:36px; animation:spin 1s linear infinite; margin:20px auto; }
      code { background:#1a1a1a; padding:2px 6px; border-radius:4px; color:#ddd; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>Starting Student Study Planner…</h1>
        <div class="spinner"></div>
        <p id="status">${message}</p>
        <p>First compile can take up to a minute. This window will refresh automatically.</p>
      </div>
    </div>
  </body>
</html>`;
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
}

async function injectDesktopSession(win) {
  const currentUrl = win.webContents.getURL();
  try {
    const host = new URL(currentUrl).hostname;
    if (!['127.0.0.1', 'localhost'].includes(host)) return;
  } catch {
    return;
  }

  const sessionToken = createDesktopSessionToken();
  const script = `
    (function () {
      try {
        localStorage.setItem('userProfile', ${JSON.stringify(JSON.stringify(desktopUserProfile))});
        localStorage.setItem('sessionUser', ${JSON.stringify(JSON.stringify({
          email: desktopUserProfile.email,
          name: desktopUserProfile.msalAccount.name,
        }))});
        localStorage.setItem('sessionToken', ${JSON.stringify(sessionToken)});
        window.desktopApp = { isElectron: true };
      } catch (err) {
        console.error('Failed to initialize desktop session:', err);
      }
    })();
  `;

  try {
    await win.webContents.executeJavaScript(script);
  } catch (err) {
    console.error('Failed to inject desktop session:', err?.message || err);
  }
}

async function createWindow() {
  console.log('Electron starting…');
  console.log('  isDev:', isDev, ' packaged:', app.isPackaged);
  console.log('  __dirname:', __dirname);

  // Resolve the app icon. On Windows we prefer icon.ico; fall back to icon.png
  // if the .ico file is missing. Electron accepts either.
  const iconIco = path.join(__dirname, 'icon.ico');
  const iconPng = path.join(__dirname, 'icon.png');
  const windowIcon = fs.existsSync(iconIco) ? iconIco : (fs.existsSync(iconPng) ? iconPng : undefined);

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: windowIcon,
    title: 'Student Study Planner',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (isDev && process.env.ELECTRON_OPEN_DEVTOOLS === 'true') {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  win.webContents.on('did-fail-load', (event, code, desc, url) => {
    console.error('❌ did-fail-load:', code, desc, url);
  });
  win.webContents.on('render-process-gone', (_e, details) => {
    console.error('❌ render-process-gone:', details);
  });
  win.webContents.on('did-finish-load', () => {
    injectDesktopSession(win);
  });

  if (isDev) {
    const targetUrl = DEV_URL + INITIAL_PATH;

    // 1. Immediately show a loading screen so the window isn't blank.
    try {
      await win.loadURL(loadingPageDataUrl(`Waiting for Next.js dev server at ${DEV_URL}`));
    } catch (err) {
      console.error('Failed to show loading page:', err?.message || err);
    }

    // 2. Ping Next.js until it responds.
    const ready = await waitForDevServer(DEV_URL, win);

    if (win.isDestroyed()) return;

    if (!ready) {
      console.error(`❌ Gave up waiting for ${DEV_URL} after ${PING_RETRIES} attempts.`);
      try {
        await win.loadURL(
          loadingPageDataUrl(
            `Could not reach ${DEV_URL} after ${PING_RETRIES} attempts. Check the [next] log above for errors.`
          )
        );
      } catch {}
      return;
    }

    // 3. Load the real app.
    console.log('Loading DEV server at', targetUrl);
    try {
      await win.loadURL(targetUrl);
    } catch (err) {
      console.error('❌ loadURL failed:', err?.message || err);
    }
    return;
  }

  // ---- Production: load packaged Next.js build ----
  console.log('Loading production build…');
  const possiblePaths = [
    path.join(__dirname, 'out', 'index.html'),
    path.join(__dirname, '..', 'out', 'index.html'),
    path.join(process.resourcesPath, 'app.asar', 'out', 'index.html'),
    path.join(__dirname, 'index.html'),
  ];

  const indexPath = possiblePaths.find((p) => fs.existsSync(p));
  if (indexPath) {
    console.log('✅ Found index.html at:', indexPath);
    try {
      await win.loadFile(indexPath);
    } catch (err) {
      console.error('❌ Failed to load file:', err);
    }
  } else {
    console.error('❌ Could not find index.html anywhere. Falling back to file:// URL.');
    const fallback = `file://${path.join(__dirname, 'out', 'index.html')}`;
    win.loadURL(fallback);
  }
}

app.whenReady().then(() => {
  console.log('App ready');
  createWindow();
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  console.log('App activate');
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
