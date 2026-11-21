import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const [releaseDir, baseDir, sevenZip] = process.argv.slice(2).map(arg => path.resolve(arg));
const asar = createRequire(import.meta.url)('@electron/asar');
const hash = data => createHash('sha256').update(data).digest('hex');
const hashFile = file => hash(fs.readFileSync(file));
const walk = (dir, sub = '') => fs.readdirSync(path.join(dir, sub), { withFileTypes: true }).flatMap(entry => {
  const name = [sub, entry.name].filter(Boolean).join('/');
  return entry.isDirectory() ? walk(dir, name) : [name];
});
const fileList = (dir, entries = walk(dir)) => entries.sort().map(name => ({
  path: name, bytes: fs.statSync(path.join(dir, name)).size, sha256: hashFile(path.join(dir, name)),
}));
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const base = readJson(path.join(baseDir, 'evidence/archive-and-depot.json'));
const depotRoot = path.join(releaseDir, 'win-unpacked');
const launch = 'Battle for America 2028.exe';
const appAsar = 'resources/app.asar';
const launcher = fs.readFileSync(path.join(depotRoot, launch));
assert.equal(launcher.toString('ascii', 0, 2), 'MZ');
const pe = launcher.readUInt32LE(0x3c);
assert.equal(launcher.toString('ascii', pe, pe + 4), 'PE\0\0');
assert.equal(launcher.readUInt16LE(pe + 4), 0x8664);
const depot = fileList(depotRoot).filter(file => file.path !== 'debug.log');
const depotNames = depot.map(file => file.path).sort();
const baseNames = base.depot.map(file => file.path).sort();
const addedDepotFiles = depotNames.filter(name => !baseNames.includes(name));
assert.ok(baseNames.every(name => depotNames.includes(name)));
assert.deepEqual(addedDepotFiles, []);
const oldDepot = Object.fromEntries(base.depot.map(file => [file.path, file.sha256.toLowerCase()]));
const changedDepotFiles = depot.filter(file => oldDepot[file.path] && file.sha256 !== oldDepot[file.path]).map(file => file.path);
assert.deepEqual(changedDepotFiles, [launch, appAsar]);
const asarPath = path.join(depotRoot, appAsar);
const oldAsar = path.join(baseDir, 'win-unpacked', appAsar);
const unpack = (archive, file) => asar.extractFile(archive, path.normalize(file));
assert.equal(JSON.parse(unpack(asarPath, 'package.json')).version, '0.2.0');
assert.equal(hash(unpack(asarPath, 'electron/main.cjs')), hashFile(path.join(root, 'electron/main.cjs')));
const dist = fileList(root, walk(root, 'dist'));
for (const file of dist) assert.equal(hash(unpack(asarPath, file.path)), file.sha256, file.path);
const art = dist.filter(file => file.path.startsWith('dist/art/'));
for (const file of art) assert.equal(hash(unpack(oldAsar, file.path)), file.sha256, file.path);

const portable = 'Battle for America 2028-0.2.0-win.zip';
const zipPath = path.join(releaseDir, portable);
function run7z(args, encoding) {
  const result = spawnSync(sevenZip, args, { encoding, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  assert.equal(result.status, 0, String(result.error ?? result.stderr));
  return result.stdout;
}
run7z(['t', zipPath], 'utf8');
const listing = run7z(['l', '-slt', zipPath], 'utf8').split(/-{10,}\r?\n/).at(-1);
const zipEntries = listing.split(/\r?\n\r?\n/).filter(row => /^Path = .+$/m.test(row) && !/^Folder = \+$/m.test(row))
  .map(row => /^Path = (.+)$/m.exec(row)[1].replaceAll('\\', '/')).sort();
assert.deepEqual(zipEntries, depot.map(file => file.path).filter(file => file !== 'resources/elevate.exe').sort());
assert.equal(hash(run7z(['x', '-so', zipPath, appAsar])), hashFile(asarPath));
const artifacts = fileList(releaseDir, [portable, 'Battle for America 2028 Setup 0.2.0.exe', 'Battle for America 2028 Setup 0.2.0.exe.blockmap']);
console.log(JSON.stringify({
  version: '0.2.0', build: 45,
  steam: { architecture: 'x64', root: 'win-unpacked', relativeExecutable: launch, files: depot.length, changedFrom44: changedDepotFiles, addedFrom44: addedDepotFiles, published: false },
  portable: { tested: true, files: zipEntries.length, appAsarMatchesDepot: true },
  artFilesUnchanged: art.length, distFilesMatch: dist.length, artifacts, depot, dist,
}, null, 2));
