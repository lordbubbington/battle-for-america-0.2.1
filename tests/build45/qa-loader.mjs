import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root = path.resolve(process.env.BFA_QA_ROOT || '.');
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    return nextResolve(pathToFileURL(path.join(root, 'src', specifier.slice(2)) + (path.extname(specifier) ? '' : '.js')).href, context);
  }
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) return { format: 'module', shortCircuit: true, source: `export default ${await readFile(fileURLToPath(url), 'utf8')};` };
  return nextLoad(url, context);
}
