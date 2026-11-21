import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const assetDir = resolve('dist/assets');
for (const file of readdirSync(assetDir).filter((name) => name.endsWith('.js'))) {
  const path = resolve(assetDir, file);
  let source = readFileSync(path, 'utf8');
  source = source
    .replaceAll('\u{1F4BF} Hey developer \u{1F44B}', 'Application error')
    .replaceAll('\u{1F38A} Could not load worker', 'Could not load worker')
    .replaceAll('\u{21A9}', 'return');
  if (/\p{Extended_Pictographic}/u.test(source.replaceAll('™', ''))) {
    throw new Error('Unexpected emoji character remains in built file: ' + file);
  }
  writeFileSync(path, source, 'utf8');
}
console.log('Sanitized built JavaScript of dependency-only emoji glyphs.');

