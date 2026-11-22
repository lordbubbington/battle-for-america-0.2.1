import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { validateModBundle } from '@/lib/modSchema';
import { applyModBundles, resetAllModsToBase } from '@/lib/modRegistry';

const require = createRequire(import.meta.url);
const {
  saveWorkshopConfig,
  scanWorkshopMods,
  generateWorkshopUploadVdf,
  resolveModAssetPath,
} = require('../../electron/steamWorkshop.cjs');

const repoRoot = process.cwd();
const templateDir = path.join(repoRoot, 'mods-template', 'starter-mod');

// 1. Validate starter-mod template via CLI & pack into a shareable bundle
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bfa-mod-p3-'));
const packedPath = path.join(tmpRoot, 'starter.bfa-mod.json');
execFileSync(
  process.execPath,
  ['--loader', './tests/build40/field/alias-loader.mjs', 'scripts/validate-mod.mjs', templateDir, '--pack', packedPath],
  { cwd: repoRoot, stdio: 'pipe' }
);
assert.ok(fs.existsSync(packedPath), 'CLI packed .bfa-mod.json bundle');
const packedBundle = JSON.parse(fs.readFileSync(packedPath, 'utf8'));
assert.equal(validateModBundle(packedBundle).valid, true, 'Packed starter-mod bundle passes schema validation');

const applied = applyModBundles([packedBundle]);
assert.equal(applied.activeDescriptors.length, 1, 'Starter-mod applies cleanly in registry');
assert.equal(applied.activeDescriptors[0].id, 'starter-mod');
resetAllModsToBase();

// 2. Steam Workshop UGC discovery & safe asset path resolution
const fakeUserData = path.join(tmpRoot, 'userData');
const fakeWorkshopRoot = path.join(tmpRoot, 'workshop-content');
const itemDir = path.join(fakeWorkshopRoot, '3099999999');
fs.mkdirSync(path.join(itemDir, 'assets', 'portraits'), { recursive: true });
fs.writeFileSync(path.join(itemDir, 'manifest.json'), JSON.stringify({
  id: 'workshop-demo-mod',
  name: 'Workshop Demo Mod',
  version: '1.0.0',
  author: 'Workshop Creator',
  mode: 'patch',
}), 'utf8');
fs.writeFileSync(path.join(itemDir, 'assets', 'portraits', 'demo.png'), Buffer.from([137, 80, 78, 71]));

saveWorkshopConfig(fakeUserData, { steamAppId: '480', workshopDir: fakeWorkshopRoot });

const readModDir = (modDir, folderName, source) => ({
  folderName,
  source,
  manifest: JSON.parse(fs.readFileSync(path.join(modDir, 'manifest.json'), 'utf8')),
  parseErrors: [],
});

const scan = scanWorkshopMods({ userDataDir: fakeUserData, readModDir });
assert.equal(scan.configured, true);
assert.equal(scan.subscribedCount, 1);
assert.equal(scan.mods[0].source, 'workshop');
assert.equal(scan.mods[0].workshopItemId, '3099999999');
assert.equal(scan.modDirById.get('workshop-demo-mod'), itemDir);

// Valid Workshop asset resolves
const okAsset = resolveModAssetPath({
  modId: 'workshop-demo-mod',
  relPath: '/assets/portraits/demo.png',
  localModsRoot: path.join(fakeUserData, 'mods'),
  workshopModDirs: scan.modDirById,
});
assert.equal(okAsset.ok, true);
assert.equal(okAsset.filePath, path.join(itemDir, 'assets', 'portraits', 'demo.png'));

// Traversal attack blocked
const badAsset = resolveModAssetPath({
  modId: 'workshop-demo-mod',
  relPath: '/assets/../../manifest.json',
  localModsRoot: path.join(fakeUserData, 'mods'),
  workshopModDirs: scan.modDirById,
});
assert.equal(badAsset.ok, false);
assert.equal(badAsset.status, 403);

// 3. SteamCMD VDF generation
const vdf = generateWorkshopUploadVdf({
  steamAppId: '480',
  publishedFileId: '0',
  contentFolder: templateDir,
  title: 'Starter "Mod"',
  description: 'Line 1\nLine 2',
  changeNote: 'Initial release',
});
assert.ok(vdf.includes('"appid" "480"'));
assert.ok(vdf.includes('"publishedfileid" "0"'));
assert.ok(vdf.includes('"title" "Starter \\"Mod\\""'));

fs.rmSync(tmpRoot, { recursive: true, force: true });
console.log('MODDING_PHASE3_TEST_PASS: starter-mod template, CLI validate/pack, Steam Workshop UGC scanning, traversal-guarded assets, and VDF generation verified.');
