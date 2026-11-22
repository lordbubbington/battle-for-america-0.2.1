const { app, BrowserWindow, ipcMain, protocol, shell, net } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'bfa-mod',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

let mainWindow = null;

function getModsRoot() {
  const dir = path.join(app.getPath('userData'), 'mods');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeReadJson(filePath) {
  if (!fs.existsSync(filePath)) return { present: false, data: null, error: null };
  try {
    return { present: true, data: JSON.parse(fs.readFileSync(filePath, 'utf8')), error: null };
  } catch (err) {
    return { present: true, data: null, error: `Invalid JSON in ${path.basename(filePath)}: ${err.message}` };
  }
}

function scanModsDirectory() {
  const root = getModsRoot();
  const entries = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
  const mods = [];
  for (const entry of entries) {
    const modDir = path.join(root, entry.name);
    const manifestRes = safeReadJson(path.join(modDir, 'manifest.json'));
    const parseErrors = [];
    if (!manifestRes.present) {
      parseErrors.push('Missing manifest.json');
    } else if (manifestRes.error) {
      parseErrors.push(manifestRes.error);
    }
    const candidatesRes = safeReadJson(path.join(modDir, 'candidates.json'));
    const ratingsRes = safeReadJson(path.join(modDir, 'ratings.json'));
    const statesRes = safeReadJson(path.join(modDir, 'states.json'));
    const scenariosRes = safeReadJson(path.join(modDir, 'scenarios.json'));
    for (const r of [candidatesRes, ratingsRes, statesRes, scenariosRes]) {
      if (r.error) parseErrors.push(r.error);
    }
    mods.push({
      folderName: entry.name,
      source: 'desktop',
      manifest: manifestRes.data,
      candidates: candidatesRes.data,
      ratings: ratingsRes.data,
      states: statesRes.data,
      scenarios: scenariosRes.data,
      parseErrors,
    });
  }
  return { modsRoot: root, mods };
}

function scaffoldExampleMod() {
  const root = getModsRoot();
  const dir = path.join(root, 'example-balance-mod');
  fs.mkdirSync(path.join(dir, 'assets', 'portraits'), { recursive: true });
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          id: 'example-balance-mod',
          name: 'Example Mod: 2028 Wildcard Pack',
          version: '1.0.0',
          author: 'Local Modder',
          minGameVersion: '0.2.2',
          mode: 'patch',
          description: 'Starter template showing how to add a candidate, adjust ratings, and tweak state leans.',
        },
        null,
        2
      ),
      'utf8'
    );
    fs.writeFileSync(
      path.join(dir, 'candidates.json'),
      JSON.stringify(
        {
          add: [
            {
              id: 'mod-wildcard-dem',
              name: 'Jordan Reyes',
              short: 'Reyes',
              state: 'Colorado',
              title: 'Mountain West Outsider',
              party: 'dem',
              weight: 4,
              color: '#3D5AF1',
              portrait: '/art/candidates/expressions/moore-smile.png',
              bio: 'An example modded Democratic candidate demonstrating custom national and regional modifiers.',
              strengths: ['Strong Mountain West appeal', 'High-energy grassroots rallies'],
              weaknesses: ['Untested in national debates', 'Lower East Coast name ID'],
              nat: 0.5,
              region: { west: 3.5, midwest: 1.0, northeast: -1.0, south: -1.5 },
            },
          ],
          patch: {},
          remove: [],
        },
        null,
        2
      ),
      'utf8'
    );
    fs.writeFileSync(
      path.join(dir, 'ratings.json'),
      JSON.stringify(
        {
          'mod-wildcard-dem': { debate: 11, speech: 13, rally: 14, corruption: 6 },
        },
        null,
        2
      ),
      'utf8'
    );
    fs.writeFileSync(
      path.join(dir, 'states.json'),
      JSON.stringify(
        {
          patch: {
            CO: { lean: 13.0 },
          },
        },
        null,
        2
      ),
      'utf8'
    );
  }
  return { ok: true, dir };
}

function registerModProtocol() {
  protocol.handle('bfa-mod', (request) => {
    try {
      const parsed = new URL(request.url);
      const modId = decodeURIComponent(parsed.hostname || '');
      if (!/^[a-z0-9][a-z0-9-_]*$/i.test(modId)) {
        return new Response('Invalid mod ID', { status: 400 });
      }
      const relPath = decodeURIComponent(parsed.pathname || '').replace(/^\/+/, '');
      if (!relPath.startsWith('assets/')) {
        return new Response('Only assets/ paths are accessible', { status: 403 });
      }
      const root = getModsRoot();
      const allowedRoot = path.resolve(root, modId, 'assets');
      const target = path.resolve(root, modId, relPath);
      if (!target.startsWith(allowedRoot + path.sep) && target !== allowedRoot) {
        return new Response('Forbidden path', { status: 403 });
      }
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
        return new Response('Not found', { status: 404 });
      }
      return net.fetch(pathToFileURL(target).href);
    } catch {
      return new Response('Bad mod asset request', { status: 400 });
    }
  });
}

function registerModIpc() {
  ipcMain.handle('bfa-mods:list', () => scanModsDirectory());
  ipcMain.handle('bfa-mods:open-folder', async () => {
    const dir = getModsRoot();
    await shell.openPath(dir);
    return { ok: true, dir };
  });
  ipcMain.handle('bfa-mods:create-example', () => scaffoldExampleMod());
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#101820',
    icon: path.join(__dirname, '..', 'dist', 'art', 'icon', 'game-icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  mainWindow = window;
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });

  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  registerModProtocol();
  registerModIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
