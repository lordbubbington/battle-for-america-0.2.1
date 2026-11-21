import fs from 'node:fs';
const previous=fs.readFileSync(new URL('../../scripts/smoke-0.1.4-windows.mjs',import.meta.url),'utf8');
const prefix=previous.slice(0,previous.indexOf("  const base = process.argv.includes('--baseline');"))
  .replace("import { readFileSync, writeFileSync }", "import { readFileSync, writeFileSync, mkdirSync }")
  .replace("'bfa014-launch-'","'bfa020-qa-'");
const body=fs.readFileSync(new URL('./qa-smoke-body.txt',import.meta.url),'utf8');
fs.writeFileSync(new URL('../../scripts/smoke-0.2.0-windows.mjs',import.meta.url),prefix+body);
console.log('Prepared smoke-0.2.0-windows.mjs (no app launched).');
