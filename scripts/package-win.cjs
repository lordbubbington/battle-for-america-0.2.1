const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const stage = path.resolve(projectRoot, '.windows-package-stage');
const allowedStageRoot = `${projectRoot}${path.sep}`;
if (!stage.startsWith(allowedStageRoot)) {
  throw new Error(`Refusing to create packaging stage outside the project: ${stage}`);
}

// Windows cloud folders can retain the read-only directory attribute after a
// prior package attempt. Clear it only on this build's generated depot so the
// next electron-builder run can replace that depot.
const depot = path.join(projectRoot, 'release-output', 'win-unpacked');
function writableDirectories(directory) {
  const entry = fs.lstatSync(directory);
  if (entry.isSymbolicLink() || !entry.isDirectory()) return;
  fs.chmodSync(directory, 0o755);
  for (const child of fs.readdirSync(directory, { withFileTypes: true })) {
    if (child.isDirectory() && !child.isSymbolicLink()) writableDirectories(path.join(directory, child.name));
  }
}
if (process.platform === 'win32' && fs.existsSync(depot)) writableDirectories(depot);

const sourcePackage = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const installedElectronPackage = require(require.resolve('electron/package.json', { paths: [projectRoot] }));
if (!/^\d+\.\d+\.\d+(?:[-+].*)?$/.test(installedElectronPackage.version || '')) {
  throw new Error(`Cannot package with an unresolved Electron version: ${installedElectronPackage.version}`);
}
const offlineElectronZip = process.env.BFA_ELECTRON_ZIP;
if (offlineElectronZip && (
  path.basename(offlineElectronZip) !== `electron-v${installedElectronPackage.version}-win32-x64.zip`
  || !fs.statSync(offlineElectronZip).isFile()
)) {
  throw new Error('BFA_ELECTRON_ZIP must point to the matching Electron Windows x64 archive');
}
const stagePackage = {
  name: sourcePackage.name,
  productName: sourcePackage.build?.productName || sourcePackage.name,
  version: sourcePackage.version,
  private: true,
  main: 'electron/main.cjs',
  // The Vite bundle contains every app dependency. The packaged Electron main
  // process uses Node built-ins only, so no development modules belong in app.asar.
  devDependencies: {
    electron: installedElectronPackage.version,
    'electron-builder': sourcePackage.devDependencies?.['electron-builder'],
  },
  build: {
    appId: sourcePackage.build?.appId,
    productName: sourcePackage.build?.productName,
    directories: { output: '../release-output' },
    files: ['dist/**/*', 'electron/main.cjs', 'package.json'],
    asar: true,
    electronVersion: installedElectronPackage.version,
    ...(offlineElectronZip ? { electronDist: path.resolve(offlineElectronZip) } : {}),
    npmRebuild: false,
    nodeGypRebuild: false,
    win: { icon: 'build/game-icon.ico', target: ['nsis', 'zip'] },
  },
};

if (!stagePackage.devDependencies.electron || !stagePackage.devDependencies['electron-builder']) {
  throw new Error('Package metadata needs Electron and electron-builder versions');
}

if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(path.join(stage, 'electron'), { recursive: true });
fs.mkdirSync(path.join(stage, 'build'), { recursive: true });
fs.cpSync(path.join(projectRoot, 'dist'), path.join(stage, 'dist'), { recursive: true });
fs.copyFileSync(path.join(projectRoot, 'electron', 'main.cjs'), path.join(stage, 'electron', 'main.cjs'));
fs.copyFileSync(path.join(projectRoot, 'build', 'game-icon.ico'), path.join(stage, 'build', 'game-icon.ico'));
fs.writeFileSync(path.join(stage, 'package.json'), `${JSON.stringify(stagePackage, null, 2)}\n`);

const builderCli = require.resolve('electron-builder/cli.js', { paths: [projectRoot] });
const result = spawnSync(process.execPath, [
  builderCli,
  '--projectDir', stage,
  '--win', 'nsis', 'zip',
  '--publish', 'never',
], { cwd: projectRoot, stdio: 'inherit' });

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);

fs.rmSync(stage, { recursive: true, force: true });
console.log(`Windows installer and portable app are in ${path.join(projectRoot, 'release-output')}.`);
