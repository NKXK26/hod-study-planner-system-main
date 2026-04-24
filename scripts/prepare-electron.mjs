import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const standaloneNextDir = path.join(standaloneDir, '.next');
const standaloneStaticDir = path.join(standaloneNextDir, 'static');
const standalonePublicDir = path.join(standaloneDir, 'public');
const staticDir = path.join(rootDir, '.next', 'static');
const publicDir = path.join(rootDir, 'public');

if (!fs.existsSync(standaloneDir)) {
  throw new Error('Missing .next/standalone. Run `npm run build:web` before preparing Electron assets.');
}

fs.mkdirSync(standaloneNextDir, { recursive: true });

if (fs.existsSync(staticDir)) {
  fs.cpSync(staticDir, standaloneStaticDir, { recursive: true, force: true });
}

if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, standalonePublicDir, { recursive: true, force: true });
}

console.log('Electron assets prepared in .next/standalone');
