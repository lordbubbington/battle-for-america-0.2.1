import fs from 'node:fs';
const root=new URL('../../../evidence/qa/data/',import.meta.url);fs.mkdirSync(root,{recursive:true});
const task=process.argv.includes('--native')?'data-native':'data-validation';
process.argv=process.argv.filter(arg=>arg!=='--native');
let source=fs.readFileSync(new URL('./'+task+'.mjs',import.meta.url),'utf8');
source=source.replaceAll('../evidence/data','../evidence/qa/data');
// The data worker adopted QA's exact #077 native recipe and full-catalog
// isolation. Run that current source unchanged except for owned output paths.
const generated=new URL('./qa-'+task+'-generated.mjs',import.meta.url);fs.writeFileSync(generated,source);await import(generated.href);
