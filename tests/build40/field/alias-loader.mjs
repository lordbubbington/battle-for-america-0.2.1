import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../');

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const target = path.join(appRoot, 'src', specifier.slice(2)) + (path.extname(specifier) ? '' : '.js');
    return nextResolve(pathToFileURL(target).href, context);
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) {
    const json = await readFile(fileURLToPath(url), 'utf8');
    return { format: 'module', shortCircuit: true, source: `export default ${json};` };
  }
  return nextLoad(url, context);
}
