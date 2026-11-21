import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const candidate = fileURLToPath(new URL('../', import.meta.url));
const baseline = path.resolve(process.argv[2] ?? path.resolve(candidate, '../../build-0.1.2-integration-worktree/build35'));
const walk = (root, sub) => fs.readdirSync(path.join(root, sub), { withFileTypes: true }).flatMap(entry => {
  const next = [sub, entry.name].join('/');
  return entry.isDirectory() ? walk(root, next) : [next];
});
const hash = data => createHash('sha256').update(data).digest('hex');
function manifest(root) {
  const tracked = ['src', 'public', 'electron', 'data-import'].flatMap(dir => walk(root, dir))
    .concat(['index.html', 'package.json', 'package-lock.json', 'vite.config.js', 'tailwind.config.js', 'postcss.config.js']).sort();
  const files = Object.fromEntries(tracked.map(name => [name, hash(fs.readFileSync(path.join(root, name)))]));
  return { files, fingerprint: hash(tracked.map(name => name + '\n' + files[name] + '\n').join('')) };
}
const before = manifest(baseline);
const after = manifest(candidate);
assert.equal(before.fingerprint, 'f5ba1d37d66aa0e3c52d7a9362562300090e4fe66fe580c1c8dd77d2b6c5e095');
const changed = [...new Set([...Object.keys(before.files), ...Object.keys(after.files)])].filter(name => before.files[name] !== after.files[name]).sort();
assert.deepEqual(changed, ['index.html', 'package-lock.json', 'package.json', 'src/components/game/SetupScreen.jsx']);
console.log(JSON.stringify({ base: before.fingerprint, final: after.fingerprint, sourceFiles: Object.keys(after.files).length, changed, files: after.files }, null, 2));
