import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

const root = fileURLToPath(new URL('../', import.meta.url));
const releaseDir = path.resolve(process.argv[2] || path.join(root, 'release-output'));
const depotDir = path.join(releaseDir, 'win-unpacked');
const require = createRequire(import.meta.url);
const asar = require('@electron/asar');
const hash = (data) => createHash('sha256').update(data).digest('hex');
const hashFile = (file) => hash(fs.readFileSync(file));
const extractAsarFile = (archive, relative) => asar.extractFile(archive, path.normalize(relative));
const walk = (directory, subdirectory = '') => fs.readdirSync(path.join(directory, subdirectory), { withFileTypes: true })
  .flatMap((entry) => {
    const relative = [subdirectory, entry.name].filter(Boolean).join('/');
    return entry.isDirectory() ? walk(directory, relative) : [relative];
  });
const fileManifest = (directory, relativeFiles) => relativeFiles.sort().map((relative) => ({
  path: relative,
  bytes: fs.statSync(path.join(directory, relative)).size,
  sha256: hashFile(path.join(directory, relative)),
}));

const executableName = 'Battle for America 2028.exe';
const asarName = 'resources/app.asar';
const executablePath = path.join(depotDir, executableName);
const asarPath = path.join(depotDir, asarName);
const executable = fs.readFileSync(executablePath);
assert.equal(executable.toString('ascii', 0, 2), 'MZ', 'Steam launch executable is a PE file');
const peOffset = executable.readUInt32LE(0x3c);
assert.equal(executable.toString('ascii', peOffset, peOffset + 4), 'PE\0\0');
assert.equal(executable.readUInt16LE(peOffset + 4), 0x8664, 'Steam launch executable is x64');
assert.ok(fs.existsSync(asarPath), 'Steam launch root has resources/app.asar');

const packagedVersion = JSON.parse(extractAsarFile(asarPath, 'package.json').toString('utf8')).version;
assert.equal(packagedVersion, '0.2.1', 'packaged app.asar carries version 0.2.1');
assert.equal(hash(extractAsarFile(asarPath, 'electron/main.cjs')), hashFile(path.join(root, 'electron/main.cjs')),
  'packaged Electron entry point matches source');
const distFiles = walk(root, 'dist');
for (const relative of distFiles) {
  assert.equal(hash(extractAsarFile(asarPath, relative)), hashFile(path.join(root, relative)), relative);
}

const depot = fileManifest(depotDir, walk(depotDir).filter((file) => file !== 'debug.log'));
const portableName = 'Battle for America 2028-0.2.1-win.zip';
const setupName = 'Battle for America 2028 Setup 0.2.1.exe';
const blockmapName = `${setupName}.blockmap`;
const portablePath = path.join(releaseDir, portableName);
const setupPath = path.join(releaseDir, setupName);
assert.ok(fs.existsSync(portablePath), 'portable Windows archive exists');
assert.ok(fs.existsSync(setupPath), 'NSIS installer exists');
assert.ok(fs.existsSync(path.join(releaseDir, blockmapName)), 'installer blockmap exists');
assert.equal(fs.readFileSync(setupPath).toString('ascii', 0, 2), 'MZ', 'installer is a PE executable');
const zipFiles = unzipSync(fs.readFileSync(portablePath));
const zipNames = Object.keys(zipFiles).filter((name) => !name.endsWith('/')).sort();
const expectedZipNames = depot.map(({ path: relative }) => relative).filter((relative) => relative !== 'resources/elevate.exe').sort();
assert.deepEqual(zipNames, expectedZipNames, 'portable archive has the complete Steam depot, excluding the installer helper');
for (const relative of zipNames) {
  assert.equal(hash(zipFiles[relative]), hashFile(path.join(depotDir, relative)), `portable file matches depot: ${relative}`);
}

const report = {
  version: packagedVersion,
  build: 45,
  steamDepot: {
    architecture: 'x64',
    root: 'win-unpacked',
    relativeExecutable: executableName,
    files: depot.length,
    appAsarSha256: hashFile(asarPath),
    launcherSha256: hashFile(executablePath),
    distFilesMatchingSource: distFiles.length,
  },
  portable: {
    file: portableName,
    sha256: hashFile(portablePath),
    files: zipNames.length,
    archiveIntegrity: 'passed',
    matchesSteamDepot: true,
  },
  installer: {
    file: setupName,
    sha256: hashFile(setupPath),
    bytes: fs.statSync(setupPath).size,
    blockmap: blockmapName,
  },
};
console.log(JSON.stringify(report, null, 2));
