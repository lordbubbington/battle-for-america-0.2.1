import fs from 'node:fs';
const source=fs.readFileSync(new URL('./data-gap-assessment.mjs',import.meta.url),'utf8').replaceAll('evidence/data/','evidence/qa/data/');
const generated=new URL('./qa-gap-assessment-generated.mjs',import.meta.url);fs.writeFileSync(generated,source);await import(generated.href);
