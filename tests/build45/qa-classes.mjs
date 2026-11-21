import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as e from '../../src/lib/gameEngine.js';
import { createSeededRandom } from '../../src/lib/seededRandom.js';
const dir=new URL('../../../evidence/qa/data/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
const results=[];
for(const rule of ['standard','pr','mmp']){
  Math.random=createSeededRandom('qa-class-plan:'+rule);
  let game=e.createGame({party:'dem',candidateId:'shapiro',opponentId:'vance',campaignId:'qa-class-plan:'+rule,difficultyId:'medium',startId:'aug',houseRule:rule});
  game=e.confirmBuild35Staffing(game,['field','pollster','communications']);
  game={...game,week:5,currentEventData:null,currentEventId:null,outcome:null,eventSchedule:[],eventScheduleIndex:-1};
  const legacy={...game,build45:{...game.build45}};delete legacy.build45.legislatureClassRevision;
  Math.random=createSeededRandom('qa-class-turn:'+rule);const before=e.opponentTurn(legacy);
  Math.random=createSeededRandom('qa-class-turn:'+rule);const after=e.opponentTurn(game);
  const strip=value=>{const clone=JSON.parse(JSON.stringify(value));if(clone.build45)delete clone.build45.legislatureClassRevision;return clone;};
  assert.deepEqual(strip(after),strip(before),rule+' actual rival plans and every nonclass game field unchanged');
  results.push({rule,actualRivalTurnIdenticalExceptClassMarker:true,plan:after.lastOpponent?.forecastPlan});
}
fs.writeFileSync(new URL('class-ai-plan-independence.json',dir),JSON.stringify({status:'PASS',results},null,2));
const source=fs.readFileSync(new URL('./data-classes.mjs',import.meta.url),'utf8').replaceAll('../evidence/data','../evidence/qa/data');
const generated=new URL('./qa-classes-generated.mjs',import.meta.url);fs.writeFileSync(generated,source);await import(generated.href);
