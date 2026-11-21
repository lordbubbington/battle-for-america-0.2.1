import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
const app=path.resolve(process.env.BFA_QA_ROOT||'.');
const evidence=path.resolve(fileURLToPath(new URL('../../../evidence/qa/',import.meta.url)));
const build=process.env.BFA_QA_BUILD||'45';
const imp=name=>import(pathToFileURL(path.join(app,'src',name)).href);
const e=await imp('lib/gameEngine.js');
const { decidePresidency }=await imp('lib/presidency.js');
const { projectStateLegislatures }=await imp('lib/stateLegislatureForecast.js');
const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
const dir=path.join(evidence,'balance-saves','build'+build);
const rows=[];
const outFile=path.join(evidence,'balance-adjudication-build'+build+'.json');
let prior=[];try{prior=JSON.parse(fs.readFileSync(outFile,'utf8')).rows||[];}catch{}
const priorById=new Map(prior.map(row=>[row.id,row]));
const hash=value=>createHash('sha256').update(value).digest('hex');
const projectionFingerprint=hash(['lib/presidency.js','lib/stateLegislatureForecast.js',...(build==='45'?['lib/build45LegislatureClasses.js','data/build45LegislatureClasses.js']:[])].map(file=>fs.readFileSync(path.join(app,'src',file),'utf8')).join('\n'));
for(const file of fs.readdirSync(dir).filter(file=>file.endsWith('.save'))){
  const packed=fs.readFileSync(path.join(dir,file),'utf8'),saveSha256=hash(packed),priorRow=priorById.get(file.slice(0,-5));
  if(priorRow?.saveSha256===saveSha256&&priorRow.projectionFingerprint===projectionFingerprint){rows.push(priorRow);continue;}
  memory.clear();memory.set(e.STORAGE_KEY,packed);
  const game=e.loadGame();assert.ok(game?.finished,file+' finished save loads');
  const projectedGame=build==='45'?{...game,build45:{...game.build45,version:1,legislatureClassRevision:'official-2028-classes-v1'}}:game;
  const result=e.resultSnapshot(game),house=e.houseSnapshot(game,true);
  assert.deepEqual(e.resultSnapshot(projectedGame),result,file+' class flag leaves all presidential results unchanged');
  assert.deepEqual(e.houseSnapshot(projectedGame,true),house,file+' class flag leaves House results unchanged');
  const decision=decidePresidency(game,result,house);
  rows.push({id:file.slice(0,-5),build,saveSha256,projectionFingerprint,party:game.party,popularVote:game.popularVote,mode:decision.mode,winner:decision.winner,win:decision.winner===game.party,popular:decision.popular,delegations:decision.delegations?.counts,houseSeats:house.seatsByParty,legislatures:projectStateLegislatures(projectedGame,{includeNoElectionStates:true}).states.map(({abbr,chambers,control,provisional})=>({abbr,chambers,control,provisional})),classMetricRefresh:build==='45'?'Final new-campaign class marker applied only to projections of retained final state. Raw campaign save and nonlegislative outcomes unchanged.':'Pinned baseline projections'});
}
fs.writeFileSync(outFile,JSON.stringify({source:'Native decidePresidency(resultSnapshot(finished save), houseSnapshot(finished save,true)); includes popular, majority, coalition and contingent delegation outcomes.',rows},null,2));
console.log(JSON.stringify({build,adjudicated:rows.length,wins:rows.filter(row=>row.win).length,modes:[...new Set(rows.map(row=>row.mode))]}));
