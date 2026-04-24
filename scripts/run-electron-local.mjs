import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const electronCmd = path.join(rootDir, 'node_modules', '.bin', 'electron.cmd');
const standaloneCandidates = [
  path.join(rootDir, 'dist', 'win-unpacked', 'resources', 'app'),
  path.join(rootDir, 'dist', 'win-ia32-unpacked', 'resources', 'app'),
];
const standaloneDir = standaloneCandidates.find((candidate) =>
  fs.existsSync(path.join(candidate, 'server.js'))
);

if (!standaloneDir) {
  throw new Error('Could not find a standalone Electron app bundle with server.js in dist/.');
}

const serverScript = path.join(standaloneDir, 'server.js');

const sharedEnv = {
  ...process.env,
  NEXT_PUBLIC_MODE: 'DEV',
  NEXT_PUBLIC_CLIENT_ID: 'desktop-dev-client',
  NEXT_PUBLIC_AUTHORITY: 'https://login.microsoftonline.com/common',
  NEXT_PUBLIC_REDIRECTURI: 'http://127.0.0.1:3000/view/dashboard',
  NEXT_PUBLIC_POSTLOGOUTREDIRECTURI: 'http://127.0.0.1:3000',
  NEXT_PUBLIC_SERVER_URL: 'http://127.0.0.1:3000',
  DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/studyplanner?schema=public',
  DIRECT_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/studyplanner?schema=public',
  DEFAULT_USER_GROUP_ID: '1',
  DEFAULT_USER_ROLE: 'Superadmin',
  WHITELIST_MODE: 'false',
  SESSION_SECRET: 'desktop-dev-session-secret-please-change',
};

const server = spawn('cmd.exe', ['/c', process.execPath, serverScript], {
  cwd: rootDir,
  env: {
    ...sharedEnv,
    HOSTNAME: '127.0.0.1',
    PORT: '3000',
    NODE_ENV: 'production',
  },
  stdio: 'inherit',
  windowsHide: false,
});

const child = spawn('cmd.exe', ['/c', electronCmd, '.'], {
  cwd: rootDir,
  env: {
    ...sharedEnv,
    ELECTRON_INITIAL_PATH: '/view/dashboard',
    ELECTRON_WAIT_FOR_SERVER: 'true',
  },
  stdio: 'inherit',
  windowsHide: false,
});

child.on('exit', () => {
  if (!server.killed) {
    server.kill();
  }
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
