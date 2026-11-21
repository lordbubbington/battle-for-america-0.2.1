import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const app=new URL('../../',import.meta.url),out=new URL('../../../evidence/qa/data/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const data=JSON.parse(fs.readFileSync(new URL('src/data/build45HousePvi.json',app),'utf8'));
const csv=fs.readFileSync(new URL(data.sourceArtifact,app),'utf8');
const original=fs.readFileSync('C:/Users/rober/.codex/visualizations/2026/11/14/01a1dc74-cfe0-7e60-8d16-869b53a1a1d2/CURRENT_IN_GAME_DISTRICT_LEANS_COOK_PVI.csv');
const hash=value=>createHash('sha256').update(value).digest('hex');assert.equal(hash(original),hash(csv));assert.equal(hash(csv),data.artifactSha256);
// CSV review is read-only. Parse RFC4180 quoting so unrelated incumbent labels
// cannot shift the numerical district columns used by this independent audit.
const parsed=[];let row=[],value='',quoted=false;
for(let i=0;i<csv.length;i++){const ch=csv[i];if(ch==='"'){if(quoted&&csv[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(!quoted&&(ch===','||ch==='\n')){row.push(value.replace(/\r$/,''));value='';if(ch==='\n'){parsed.push(row);row=[];}}else value+=ch;}
if(value||row.length){row.push(value.replace(/\r$/,''));parsed.push(row);}
const headers=parsed.shift();const rows=parsed.filter(r=>r.some(Boolean)).map(values=>Object.fromEntries(headers.map((h,i)=>[h,values[i]])));
assert.equal(rows.length,435);const key=id=>id.replace(/-AL$/,'-01').replace(/-(\d+)$/,(_,n)=>'-'+n.padStart(2,'0'));
const primary=JSON.parse(fs.readFileSync(new URL(data.cookPrimarySnapshot,app),'utf8')).rows;
assert.equal(primary.length,435);const cooked=new Map(primary.map(r=>[key(r.cookId),r]));assert.equal(cooked.size,435);
const shifts={KS:5,SC:5,TX:5,MS:5,AK:5,GA:2,NC:2,OR:-5,NY:-5,CT:-5,IL:-5,WA:-5};
const generated=new Map(data.districts.map(r=>[r.id,r]));assert.equal(generated.size,435);
const witnesses=rows.map((row,index)=>{
  const id=key(row.District_ID),raw=cooked.get(id),actual=generated.get(id);assert.ok(raw&&actual,id+' joins');
  const signed=/^D\+/.test(raw.pvi)?Number(raw.pvi.slice(2)):/^R\+/.test(raw.pvi)?-Number(raw.pvi.slice(2)):raw.pvi==='EVEN'?0:NaN;
  assert.ok(Number.isFinite(signed),id+' sign');assert.equal(signed,raw.value,id+' primary signed input');assert.equal(raw.electionYear,2026);
  const state=id.slice(0,2),expected=2*signed+(shifts[state]||0);
  assert.equal(Number(row.In_Game_District_Lean_Raw),expected,id+' owner formula');assert.equal(actual.districtLeanDMinusR,expected,id+' generated result');assert.equal(row.State_Abbr,state);
  assert.equal(actual.cookPviDMinusR,signed);assert.equal(actual.ownerShiftDMinusR,shifts[state]||0);
  assert.equal(actual.sourceRow,index+2,id+' source row');
  return {id,csvRow:index+2,cookPvi:raw.pvi,cookSigned:signed,shift:shifts[state]||0,expected,actual:actual.districtLeanDMinusR,source:raw.sourceUrl};
});
for(const state of data.states){const values=witnesses.filter(r=>r.id.startsWith(state.stateAbbr+'-')).map(r=>r.expected);const mean=values.reduce((a,b)=>a+b,0)/values.length;assert.equal(state.statewideBaselineLeanDMinusR,mean,state.stateAbbr+' mean');}
assert.equal(witnesses.filter(r=>r.shift).length,146);assert.equal(new Set(witnesses.filter(r=>r.shift).map(r=>r.id.slice(0,2))).size,12);
fs.writeFileSync(new URL('pvi-independent-formulas.json',out),JSON.stringify({status:'PASS',artifactSha256:hash(csv),ownerArtifactIdentical:true,rows:435,shiftedDistricts:146,shiftedStates:12,witnesses},null,2));
let source=fs.readFileSync(new URL('./data-pvi.mjs',import.meta.url),'utf8').replaceAll('../evidence/data','../evidence/qa/data');
const target=new URL('./qa-pvi-native-generated.mjs',import.meta.url);fs.writeFileSync(target,source);await import(target.href);
