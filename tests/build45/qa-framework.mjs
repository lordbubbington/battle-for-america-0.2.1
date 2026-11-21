import fs from 'node:fs';
const source=fs.readFileSync(new URL('./framework.test.mjs',import.meta.url),'utf8').replaceAll('../../../evidence/framework/','../../../evidence/qa/framework/');
const generated=new URL('./qa-framework-generated.mjs',import.meta.url);fs.writeFileSync(generated,source);await import(generated.href);
