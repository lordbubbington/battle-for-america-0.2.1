import fs from 'node:fs';
import * as e from '../../src/lib/gameEngine.js';
import { createSeededRandom } from '../../src/lib/seededRandom.js';
import { recordIncident } from '../../src/lib/incidentLedger.js';
import { recordCampaignStrategy } from '../../src/lib/campaignOperations.js';
import * as nat from '../../src/lib/nationalNews.js';
const commit=(g,next,context)=>recordCampaignStrategy(g,recordIncident(g,next,context),context);
const clear=g=>({...g,currentEventData:null,currentEventId:null,outcome:null,eventSchedule:[],eventScheduleIndex:-1,usedEvents:[]});
const seed=16;
const opponentId=process.env.BFA_QA_OPPONENT||'vance';
Math.random=createSeededRandom('b45:rival:'+seed);
let g=e.createGame({party:'dem',candidateId:'shapiro',opponentId,startId:'aug',difficultyId:'hard',campaignId:'b45:rival:'+seed});
g=e.confirmBuild35Staffing(g,['field','pollster','communications']);g=clear({...g,funds:200,week:5});
const to=seed%3;g=commit(g,e.changeStance(g,'economy',to),{type:'stance',issueId:'economy',from:g.stances.economy,to});
g={...clear(g),week:6};g=commit(g,e.opponentTurn(g),{type:'opponent'});
g=nat.weeklyNationalNews({...g,natNews:null,fourPartyNationalCard:null});
const beforeAck={seen:g.natNewsSeen,card:nat.nationalNewsCard(g),rivalCard:g.rivalIncidentNewsCard,incident:g.incidentLedger.find(r=>r.id===g.rivalIncidentNewsCard?.receiptId)};
g=e.acknowledgeCampaignNews(g);
const ack=g.incidentLedger.filter(r=>r.sourceType==='news-acknowledgement');
const base=structuredClone(g),traces=[];
let witness=null;
outer: for(let week=7;week<=13;week++)for(let actions=0;actions<(process.env.BFA_QA_077_SEARCH?6:1);actions++){
  // Branch from the same real acknowledgement so each native plan is eligible;
  // retain the same campaign ID and its original committed receipts.
  let before={...clear(base),week};
  for(let action=0;action<actions;action++)before=commit(before,e.applyAction(before,'fundraise','PA'),{type:'action',actionId:'fundraise',abbr:'PA'});
  const next=commit(before,e.opponentTurn(before),{type:'opponent'});
  const source=next.incidentLedger.findLast(r=>r.sourceType==='opponent-plan');
  traces.push({week,actions,moves:next.oppMoves?.map(m=>m.type),source,surrogateClaim:source?.payload?.surrogateClaim});
  if(source?.payload?.surrogateClaim){witness={seed,opponentId,week,fundraiseActions:actions,before,next,source};break outer;}
}
fs.writeFileSync(new URL('../../../evidence/qa/077-probe-'+opponentId+'.json',import.meta.url),JSON.stringify({beforeAck,ack,traces},null,2));
if(witness)fs.writeFileSync(new URL('../../../evidence/qa/077-witness.json',import.meta.url),JSON.stringify(witness,null,2));
console.log(JSON.stringify({beforeAckSeen:beforeAck.seen,card:beforeAck.card?.id,acks:ack.map(r=>r.payload),witness:witness?{seed,opponentId,week:witness.week,fundraiseActions:witness.fundraiseActions}:null,traces:traces.map(t=>({week:t.week,actions:t.actions,moves:t.moves,claim:t.surrogateClaim}))}));
