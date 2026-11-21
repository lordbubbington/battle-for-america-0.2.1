import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
const app = process.env.BFA_STAFF_APP_ROOT || path.resolve('build35');
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) return nextResolve(pathToFileURL(path.join(app, 'src', specifier.slice(2)) + (path.extname(specifier) ? '' : '.js')).href, context);
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) return { format: 'module', shortCircuit: true, source: `export default ${await readFile(fileURLToPath(url), 'utf8')};` };
  return nextLoad(url, context);
}
