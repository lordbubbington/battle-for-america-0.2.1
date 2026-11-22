const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function getWorkshopConfigPath(userDataDir) {
  return path.join(userDataDir, 'steam-workshop.json');
}

function readWorkshopConfig(userDataDir) {
  const cfgPath = getWorkshopConfigPath(userDataDir);
  let saved = {};
  if (fs.existsSync(cfgPath)) {
    try {
      saved = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) || {};
    } catch {
      saved = {};
    }
  }
  const steamAppId = String(process.env.BFA_STEAM_APP_ID || saved.steamAppId || '').trim();
  const customWorkshopDir = String(process.env.BFA_STEAM_WORKSHOP_DIR || saved.workshopDir || '').trim();
  return { steamAppId, workshopDir: customWorkshopDir };
}

function saveWorkshopConfig(userDataDir, { steamAppId = '', workshopDir = '' } = {}) {
  fs.mkdirSync(userDataDir, { recursive: true });
  const clean = {
    steamAppId: String(steamAppId || '').replace(/[^0-9]/g, ''),
    workshopDir: String(workshopDir || '').trim(),
  };
  fs.writeFileSync(getWorkshopConfigPath(userDataDir), JSON.stringify(clean, null, 2), 'utf8');
  return clean;
}

function candidateSteamWorkshopDirs(steamAppId, customWorkshopDir) {
  const dirs = [];
  if (customWorkshopDir && fs.existsSync(customWorkshopDir)) {
    dirs.push(path.resolve(customWorkshopDir));
  }
  if (!steamAppId || !/^\d+$/.test(steamAppId)) return dirs;

  const home = os.homedir();
  const steamRoots = [];
  if (process.platform === 'win32') {
    steamRoots.push(
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Steam'),
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Steam')
    );
  } else if (process.platform === 'darwin') {
    steamRoots.push(path.join(home, 'Library', 'Application Support', 'Steam'));
  } else {
    steamRoots.push(
      path.join(home, '.steam', 'steam'),
      path.join(home, '.local', 'share', 'Steam')
    );
  }

  for (const root of steamRoots) {
    const ugcDir = path.join(root, 'steamapps', 'workshop', 'content', steamAppId);
    if (fs.existsSync(ugcDir) && !dirs.includes(ugcDir)) {
      dirs.push(ugcDir);
    }
  }
  return dirs;
}

function scanWorkshopMods({ userDataDir, readModDir }) {
  const cfg = readWorkshopConfig(userDataDir);
  const workshopDirs = candidateSteamWorkshopDirs(cfg.steamAppId, cfg.workshopDir);
  const mods = [];
  const modDirById = new Map();

  for (const dir of workshopDirs) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory());
    } catch {
      continue;
    }
    for (const entry of entries) {
      const modDir = path.join(dir, entry.name);
      const bundle = readModDir(modDir, entry.name, 'workshop');
      bundle.workshopItemId = entry.name;
      mods.push(bundle);
      const modId = bundle?.manifest?.id || entry.name;
      modDirById.set(modId, modDir);
    }
  }

  return {
    configured: Boolean(cfg.steamAppId || cfg.workshopDir),
    steamAppId: cfg.steamAppId,
    workshopDir: cfg.workshopDir,
    workshopDirs,
    subscribedCount: mods.length,
    mods,
    modDirById,
  };
}

function escapeVdf(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ');
}

function generateWorkshopUploadVdf({
  steamAppId,
  publishedFileId = '0',
  contentFolder,
  previewFile = '',
  visibility = 0,
  title,
  description = '',
  changeNote = 'Initial upload',
}) {
  if (!steamAppId || !/^\d+$/.test(String(steamAppId))) {
    throw new Error('A numeric Steam AppID is required to generate workshop_build.vdf.');
  }
  if (!contentFolder) {
    throw new Error('contentFolder is required.');
  }
  const lines = [
    '"workshopitem"',
    '{',
    `  "appid" "${escapeVdf(steamAppId)}"`,
    `  "publishedfileid" "${escapeVdf(publishedFileId || '0')}"`,
    `  "contentfolder" "${escapeVdf(path.resolve(contentFolder))}"`,
    `  "previewfile" "${escapeVdf(previewFile ? path.resolve(previewFile) : '')}"`,
    `  "visibility" "${Number.isInteger(Number(visibility)) ? Number(visibility) : 0}"`,
    `  "title" "${escapeVdf(title || path.basename(contentFolder))}"`,
    `  "description" "${escapeVdf(description)}"`,
    `  "changenote" "${escapeVdf(changeNote)}"`,
    '}',
    '',
  ];
  return lines.join('\n');
}

function resolveModAssetPath({ modId, relPath, localModsRoot, workshopModDirs }) {
  if (!/^[a-z0-9][a-z0-9-_]*$/i.test(String(modId || ''))) {
    return { ok: false, status: 400, error: 'Invalid mod ID' };
  }
  const cleanRel = String(relPath || '').replace(/^\/+/, '');
  if (!cleanRel.startsWith('assets/')) {
    return { ok: false, status: 403, error: 'Only assets/ paths are accessible' };
  }

  const candidateRoots = [];
  if (localModsRoot) candidateRoots.push(path.resolve(localModsRoot, modId));
  if (workshopModDirs?.has(modId)) candidateRoots.push(path.resolve(workshopModDirs.get(modId)));

  for (const modRoot of candidateRoots) {
    const allowedRoot = path.resolve(modRoot, 'assets');
    const target = path.resolve(modRoot, cleanRel);
    if (!target.startsWith(allowedRoot + path.sep) && target !== allowedRoot) {
      return { ok: false, status: 403, error: 'Forbidden path' };
    }
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      return { ok: true, status: 200, filePath: target };
    }
  }
  return { ok: false, status: 404, error: 'Not found' };
}

module.exports = {
  readWorkshopConfig,
  saveWorkshopConfig,
  candidateSteamWorkshopDirs,
  scanWorkshopMods,
  generateWorkshopUploadVdf,
  resolveModAssetPath,
};
