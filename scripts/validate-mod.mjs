import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { validateModBundle } from '@/lib/modSchema';

const require = createRequire(import.meta.url);
const { generateWorkshopUploadVdf } = require('../electron/steamWorkshop.cjs');

const args = process.argv.slice(2);
const modDirArg = args.find((a) => !a.startsWith('--'));
if (!modDirArg) {
  console.error('Usage: npm run mod:validate -- <mod-folder> [--pack out.bfa-mod.json] [--vdf --appid <id>]');
  process.exit(1);
}

function argValue(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

const modDir = path.resolve(modDirArg);
if (!fs.existsSync(modDir) || !fs.statSync(modDir).isDirectory()) {
  console.error(`Mod folder not found: ${modDir}`);
  process.exit(1);
}

const FILES = [
  ['manifest', 'manifest.json'],
  ['candidates', 'candidates.json'],
  ['ratings', 'ratings.json'],
  ['states', 'states.json'],
  ['scenarios', 'scenarios.json'],
  ['events', 'events.json'],
  ['news', 'news.json'],
  ['debates', 'debates.json'],
  ['runningMates', 'runningMates.json'],
  ['issues', 'issues.json'],
];

const bundle = { folderName: path.basename(modDir), source: 'desktop', parseErrors: [] };
for (const [key, filename] of FILES) {
  const full = path.join(modDir, filename);
  if (!fs.existsSync(full)) {
    bundle[key] = null;
    continue;
  }
  try {
    bundle[key] = JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (err) {
    bundle[key] = null;
    bundle.parseErrors.push(`Invalid JSON in ${filename}: ${err.message}`);
  }
}

const res = validateModBundle(bundle);
if (!res.valid) {
  console.error(`MOD VALIDATION FAILED (${res.errors.length} error${res.errors.length === 1 ? '' : 's'}):`);
  for (const e of res.errors) console.error(`  - ${e}`);
  process.exit(2);
}

console.log(`MOD VALIDATION PASS: ${bundle.manifest.name} (${bundle.manifest.id} v${bundle.manifest.version})`);
console.log('Content summary:', JSON.stringify(res.summary));

const packOut = argValue('--pack');
if (packOut) {
  const packed = {
    manifest: bundle.manifest,
    ...(bundle.candidates ? { candidates: bundle.candidates } : {}),
    ...(bundle.ratings ? { ratings: bundle.ratings } : {}),
    ...(bundle.states ? { states: bundle.states } : {}),
    ...(bundle.scenarios ? { scenarios: bundle.scenarios } : {}),
    ...(bundle.events ? { events: bundle.events } : {}),
    ...(bundle.news ? { news: bundle.news } : {}),
    ...(bundle.debates ? { debates: bundle.debates } : {}),
    ...(bundle.runningMates ? { runningMates: bundle.runningMates } : {}),
    ...(bundle.issues ? { issues: bundle.issues } : {}),
  };
  const outPath = path.resolve(packOut);
  fs.writeFileSync(outPath, JSON.stringify(packed, null, 2), 'utf8');
  console.log(`PACKED_BUNDLE: ${outPath}`);
}

if (args.includes('--vdf')) {
  const steamAppId = argValue('--appid') || process.env.BFA_STEAM_APP_ID;
  const publishedFileId = argValue('--itemid') || '0';
  const changeNote = argValue('--note') || 'Mod update';
  const preview = path.join(modDir, 'preview.png');
  const vdf = generateWorkshopUploadVdf({
    steamAppId,
    publishedFileId,
    contentFolder: modDir,
    previewFile: fs.existsSync(preview) ? preview : '',
    title: bundle.manifest.name,
    description: bundle.manifest.description || '',
    changeNote,
  });
  const vdfPath = path.join(modDir, 'workshop_build.vdf');
  fs.writeFileSync(vdfPath, vdf, 'utf8');
  console.log(`WROTE_VDF: ${vdfPath}`);
}
