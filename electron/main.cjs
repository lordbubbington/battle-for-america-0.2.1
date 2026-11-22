const { app, BrowserWindow, ipcMain, protocol, shell, net } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const {
  saveWorkshopConfig,
  scanWorkshopMods,
  generateWorkshopUploadVdf,
  resolveModAssetPath,
} = require('./steamWorkshop.cjs');

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
let cachedWorkshopDirMap = new Map();

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

function readModDir(modDir, folderName, source = 'desktop') {
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
  const eventsRes = safeReadJson(path.join(modDir, 'events.json'));
  const newsRes = safeReadJson(path.join(modDir, 'news.json'));
  const debatesRes = safeReadJson(path.join(modDir, 'debates.json'));
  const runningMatesRes = safeReadJson(path.join(modDir, 'runningMates.json'));
  const issuesRes = safeReadJson(path.join(modDir, 'issues.json'));
  for (const r of [
    candidatesRes,
    ratingsRes,
    statesRes,
    scenariosRes,
    eventsRes,
    newsRes,
    debatesRes,
    runningMatesRes,
    issuesRes,
  ]) {
    if (r.error) parseErrors.push(r.error);
  }
  return {
    folderName,
    source,
    manifest: manifestRes.data,
    candidates: candidatesRes.data,
    ratings: ratingsRes.data,
    states: statesRes.data,
    scenarios: scenariosRes.data,
    events: eventsRes.data,
    news: newsRes.data,
    debates: debatesRes.data,
    runningMates: runningMatesRes.data,
    issues: issuesRes.data,
    parseErrors,
  };
}

function scanAllMods() {
  const root = getModsRoot();
  const entries = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
  const localMods = entries.map((entry) => readModDir(path.join(root, entry.name), entry.name, 'desktop'));

  const workshop = scanWorkshopMods({
    userDataDir: app.getPath('userData'),
    readModDir,
  });
  cachedWorkshopDirMap = workshop.modDirById;

  return {
    modsRoot: root,
    mods: [...localMods, ...workshop.mods],
    workshop: {
      configured: workshop.configured,
      steamAppId: workshop.steamAppId,
      workshopDir: workshop.workshopDir,
      workshopDirs: workshop.workshopDirs,
      subscribedCount: workshop.subscribedCount,
    },
  };
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
          version: '1.1.0',
          author: 'Local Modder',
          minGameVersion: '0.2.2',
          mode: 'patch',
          description: 'Starter template showing candidates, ratings, states, running mates, events, and news.',
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
    fs.writeFileSync(
      path.join(dir, 'runningMates.json'),
      JSON.stringify(
        {
          add: [
            {
              id: 'mod-mate-dem',
              name: 'Elena Morales',
              short: 'Morales',
              party: 'dem',
              state: 'Arizona',
              stateAbbr: 'AZ',
              title: 'Sun Belt Closer',
              blurb: 'Example modded running mate who strengthens Southwest outreach.',
              strengths: ['Boosts Arizona and Nevada margins'],
              weakness: 'Lower Northeast name recognition',
              nat: 0.2,
              region: { west: 0.8 },
              states: { AZ: 2.0, NV: 1.2 },
            },
          ],
        },
        null,
        2
      ),
      'utf8'
    );
    fs.writeFileSync(
      path.join(dir, 'events.json'),
      JSON.stringify(
        {
          add: [
            {
              id: 'mod-event-town-hall-viral',
              title: 'Viral Local Diner Stop',
              tone: 'hope',
              icon: 'megaphone',
              text: 'A spontaneous Q&A at a swing-state diner racks up 12 million views overnight.',
              choices: [
                {
                  label: 'Turn it into a grassroots ad push',
                  detail: 'Amplify the clip across swing states.',
                  effects: { mom: 3, funds: 4 },
                },
                {
                  label: 'Keep the focus on policy details',
                  detail: 'Steady, low-risk follow-through.',
                  effects: { mom: 2 },
                },
              ],
            },
          ],
        },
        null,
        2
      ),
      'utf8'
    );
    fs.writeFileSync(
      path.join(dir, 'news.json'),
      JSON.stringify(
        {
          national: {
            add: [
              {
                id: 'mod-nat-clean-grid',
                desk: 'Economy',
                icon: 'economy',
                headline: 'Regional power grid upgrade cuts utility bills across Midwest',
                body: 'Consumers report lower monthly energy bills heading into the autumn stretch.',
                nat: 0.4,
                issue: 'energy',
              },
            ],
          },
          world: {
            add: [
              {
                id: 'mod-world-tech-plant',
                headline: 'A battery manufacturer announces two thousand new jobs',
                issue: 'economy',
                lean: 1,
                mag: 1.0,
                tags: ['midwest', 'purple'],
              },
            ],
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
      const relPath = decodeURIComponent(parsed.pathname || '');
      const resolved = resolveModAssetPath({
        modId,
        relPath,
        localModsRoot: getModsRoot(),
        workshopModDirs: cachedWorkshopDirMap,
      });
      if (!resolved.ok) {
        return new Response(resolved.error, { status: resolved.status });
      }
      return net.fetch(pathToFileURL(resolved.filePath).href);
    } catch {
      return new Response('Bad mod asset request', { status: 400 });
    }
  });
}

function registerModIpc() {
  ipcMain.handle('bfa-mods:list', () => scanAllMods());
  ipcMain.handle('bfa-mods:open-folder', async () => {
    const dir = getModsRoot();
    await shell.openPath(dir);
    return { ok: true, dir };
  });
  ipcMain.handle('bfa-mods:create-example', () => scaffoldExampleMod());
  ipcMain.handle('bfa-mods:workshop-status', () => {
    const workshop = scanWorkshopMods({ userDataDir: app.getPath('userData'), readModDir });
    cachedWorkshopDirMap = workshop.modDirById;
    return {
      configured: workshop.configured,
      steamAppId: workshop.steamAppId,
      workshopDir: workshop.workshopDir,
      workshopDirs: workshop.workshopDirs,
      subscribedCount: workshop.subscribedCount,
    };
  });
  ipcMain.handle('bfa-mods:workshop-configure', (_evt, cfg) => {
    const saved = saveWorkshopConfig(app.getPath('userData'), cfg || {});
    return { ok: true, ...saved };
  });
  ipcMain.handle('bfa-mods:workshop-prepare-vdf', (_evt, opts) => {
    const { modId, steamAppId, publishedFileId = '0', visibility = 0, changeNote = 'Update' } = opts || {};
    if (!modId || !/^[a-z0-9][a-z0-9-_]*$/i.test(modId)) {
      return { ok: false, error: 'Invalid modId.' };
    }
    const modDir = path.join(getModsRoot(), modId);
    if (!fs.existsSync(modDir)) {
      return { ok: false, error: `Mod folder not found: ${modId}` };
    }
    const bundle = readModDir(modDir, modId, 'desktop');
    const previewCandidate = path.join(modDir, 'preview.png');
    try {
      const vdf = generateWorkshopUploadVdf({
        steamAppId,
        publishedFileId,
        contentFolder: modDir,
        previewFile: fs.existsSync(previewCandidate) ? previewCandidate : '',
        visibility,
        title: bundle.manifest?.name || modId,
        description: bundle.manifest?.description || '',
        changeNote,
      });
      const vdfPath = path.join(modDir, 'workshop_build.vdf');
      fs.writeFileSync(vdfPath, vdf, 'utf8');
      return {
        ok: true,
        vdfPath,
        command: `steamcmd +login <steam_user> +workshop_build_item "${vdfPath}" +quit`,
      };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
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
