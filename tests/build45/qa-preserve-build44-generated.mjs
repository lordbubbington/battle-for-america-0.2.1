import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as engine from '../../src/lib/gameEngine.js';
import { CANDIDATE_EVENTS } from '../../src/data/candidateEvents/index.js';
import { TRADITIONAL_STAFF_SELECTION_COUNT } from '../../src/data/traditionalStaffRoster.js';
import { BUILD40_EVENTS as events } from '../../src/data/build40EventCatalog.js';
import { createSeededRandom } from '../../src/lib/seededRandom.js';
import { recordIncident } from '../../src/lib/incidentLedger.js';
import { recordCampaignStrategy } from '../../src/lib/campaignOperations.js';
import { resolveBuild40Roll } from '../../src/lib/build40DecisionRuntime.js';
import { hiddenEffectInventory, outcomePresentation, choicePresentation } from '../../src/lib/build44EventPresentation.js';
const root = new URL('../../../evidence/qa/build44-preservation/', import.meta.url);
fs.mkdirSync(new URL('fixtures/',root),{recursive:true});fs.mkdirSync(new URL('evidence/',root),{recursive:true});
const write = (file, value) => fs.writeFileSync(new URL(file, root), JSON.stringify(value, null, 2));
const staff = ['field','pollster','communications','operations','policy','fundraising','base-liaison','social-media','media'];
const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key,value) => memory.set(key,value) };
const report = {};
const create = (party='dem', seed='b43:field') => {
  Math.random = createSeededRandom(seed);
  const fresh = engine.createGame({party, candidateId:party==='rep'?'vance':'shapiro',opponentId:party==='rep'?'shapiro':'vance',startId:'aug',campaignId:seed,difficultyId:'hard'});
  return {...engine.confirmBuild35Staffing(fresh,staff.slice(0,TRADITIONAL_STAFF_SELECTION_COUNT)), week:3,funds:100,currentEventData:null,currentEventId:null,outcome:null,eventSchedule:[],eventScheduleIndex:-1,usedEvents:[]};
};
const id = number => events.find(event=>event.id.startsWith('interrupt-'+number+'-')).id;
const select = (game,ids,random=()=>0,options={}) => engine.nextEventFor(game,{excludedEventIds:[...events,...CANDIDATE_EVENTS].map(e=>e.id).filter(id=>!ids.includes(id)),random,...options}).event;
const schedule = (game,eventId) => engine.advanceDecisionEvent({...game,usedEvents:[...events,...CANDIDATE_EVENTS].map(e=>e.id).filter(id=>id!==eventId),eventSchedule:[{status:'pending',afterActions:0}],eventScheduleIndex:-1,currentEventId:null,currentEventData:null,outcome:null});
const resume = game => {assert.ok(engine.saveGame(game));return engine.loadGame();};
const field=create();
let native;
for(let i=0;i<80&&!native;i++) {
  const before={...field,build34CampaignId:'b43:field:'+i};
  const action=engine.applyAction(before,'volunteers','PA');
  const recorded=recordCampaignStrategy(before,recordIncident(before,action,{type:'action',actionId:'volunteers',abbr:'PA'}),{type:'action',actionId:'volunteers',abbr:'PA'});
  const receipt=recorded.incidentLedger.at(-1);
  if(receipt.payload.canvassReport) native={before,recorded,receipt};
}
assert.ok(native);
const {recorded,receipt}=native;
write('fixtures/038-native-before-action.json',{...native.before,usedEvents:[...events,...CANDIDATE_EVENTS].map(e=>e.id).filter(eventId=>eventId!==id('038')),
  eventSchedule:[{status:'pending',afterActions:1}],eventScheduleIndex:-1,eventScheduleWeek:3});
assert.equal(select(recorded,[id('038')]).context.stateId,'PA');
for(const week of [3,4]) assert.ok(select({...recorded,week},[id('038')]));
for(const week of [2,5,7]) assert.equal(select({...recorded,week},[id('038')]),null);
for(const change of [r=>({...r,campaignId:'wrong'}),r=>({...r,stateId:'FL',state:'FL'}),r=>({...r,payload:{...r.payload,canvassReport:{districtId:'PA-01',affectedAddresses:0}}}),r=>({...r,sourceType:'opponent-plan'})]) {
  assert.equal(select({...recorded,incidentLedger:[change(receipt)]},[id('038')]),null);
}
const pending=schedule(recorded,id('038'));
write('fixtures/038-valid-pending.json',pending);
const old=structuredClone(pending); delete old.currentEventData.context.selectionWeek; delete old.currentEventData.context.evidence;
write('fixtures/038-legacy-pending.json',old);
assert.equal(resume(old).currentEventData.context.stateId,'PA');
const resumed=resume({...pending,week:8});
assert.equal(resumed.currentEventData.context.selectionWeek,3);
assert.equal(resumed.currentEventData.context.stateId,'PA');
const resolved=engine.applyChoice(resumed,'choice-1');
assert.equal(resolved.build40.decisionReceipts.length,resumed.build40.decisionReceipts.length+1);
assert.equal(resolved.build40.decisionReceipts.at(-1).stateId,'PA');
assert.deepEqual(resume(resolved).outcome,resolved.outcome);
const replay={...resolved,outcome:null}; assert.equal(engine.applyChoice(replay,'choice-1'),replay);
const stripped={...pending,incidentLedger:[]}; write('fixtures/038-missing-source.json',stripped);
for(const invalid of [stripped,{...pending,currentEventData:{...pending.currentEventData,context:{...pending.currentEventData.context,stateId:'FL'}}},{...pending,incidentLedger:[{...receipt,payload:{...receipt.payload,canvassReport:{...receipt.payload.canvassReport,affectedAddresses:999}}}]}]) {
  const loaded=resume(invalid); assert.equal(loaded.currentEventData,null); assert.equal(loaded.funds,invalid.funds);
  assert.equal(engine.applyChoice(loaded,'choice-1'),loaded);
  const applied=engine.applyChoice(invalid,'choice-1'); assert.equal(applied.currentEventId,null);assert.equal(applied.funds,invalid.funds);
  assert.ok(engine.advanceWeek({...loaded,actionsLeft:0}).week>loaded.week);
}
report['B33-34-01A.1']={nativeReceipt:receipt,freshWeeks:[3,4],rejectedWeeks:[2,5,7],invalidVariants:4};
report['B33-34-01A.3']={selectionWeek:3,resumeWeek:8,state:'PA',legacyMigrated:true,missingSourceRetired:true,uncharged:true,continued:true,replayRejected:true};

// Normal Home End Week sequence: close due cards, apply rival, commit, advance.
let rival;
const rivalProbe=[];
const rivalBase=create('dem','b43:rival');
for(let i=0;i<12&&!rival;i++) {
  const before={...rivalBase,build34CampaignId:'b43:rival:'+i}; Math.random=createSeededRandom('b43:rival:'+i);
  const closing=engine.prepareDecisionWeekClose(before);
  const committed=recordIncident(closing,engine.opponentTurn(closing),{type:'opponent'});
  const source=committed.incidentLedger.findLast(r=>r.sourceType==='opponent-plan');
  rivalProbe.push({seed:i,source,selected:select(committed,[id('072')])?.context});
  if(source?.payload.neglectedStateMove?.abbr && select(committed,[id('072')])) rival={committed,source};
}
write('evidence/rival-probe.json',rivalProbe);
assert.ok(rival,'native rival move');
const rivalState=rival.source.payload.neglectedStateMove.abbr;
const nextWeek=engine.advanceWeek(rival.committed);
assert.equal(nextWeek.week,4);
assert.equal(select(nextWeek,[id('072')]).context.stateId,rivalState);
assert.equal(select({...nextWeek,week:5},[id('072')]),null);
assert.equal(select({...nextWeek,week:9},[id('072')]),null);
assert.equal(select({...nextWeek,week:2},[id('072')]),null);
const badPlan={...rival.source,payload:{...rival.source.payload,neglectedStateMove:{...rival.source.payload.neglectedStateMove,effectApplied:false}}};
assert.equal(select({...nextWeek,incidentLedger:[badPlan]},[id('072')]),null);
for(const invalid of [{...nextWeek,build34AiPlanReceipts:[]},{...nextWeek,build34AppliedDecisionReceiptIds:[]},
  {...nextWeek,build34AiPlanReceipts:nextWeek.build34AiPlanReceipts.map(p=>({...p,status:'pending'}))}]) {
  assert.equal(select(invalid,[id('072')]),null,'An unapplied rival plan cannot establish the incident');
}
const pendingRival=schedule(nextWeek,id('072')); write('fixtures/072-valid-pending.json',pendingRival);
const competingReport={...rival.source,payload:{...rival.source.payload,attendance:{stateId:'TX',expected:1500,observed:900}}};
const competing=schedule({...nextWeek,incidentLedger:[competingReport]},id('072'));
assert.equal(competing.currentEventData.context.stateId,rivalState);
assert.ok(engine.applyChoice(resume(competing),'choice-1').outcome,'Different attendance state must not retarget the neglected-state card');
const rivalResumed=resume({...pendingRival,week:8}); assert.equal(rivalResumed.currentEventData.context.stateId,rivalState);
const rivalDone=engine.applyChoice(rivalResumed,'choice-1'); assert.ok(rivalDone.outcome);
const rivalAgain={...rivalDone,outcome:null}; assert.equal(engine.applyChoice(rivalAgain,'choice-1'),rivalAgain);
report['B33-34-01A.2']={source:rival.source,normalWeekTransition:[3,4],cutoffRejected:[5,9],unappliedRejected:true,resumeState:rivalState,onceOnly:true};

// Exact deterministic lottery intervals across both event classes; no priority lane.
const ordinary=events.filter(e=>e.trigger.kind==='general-draw'&&select(recorded,[e.id])).slice(0,4).map(e=>e.id);
const legal=[...ordinary.slice(0,3),id('038')];
for(const pool of [legal,[...legal,ordinary[3]]]) {
  const seen=new Map();
  for(let i=0;i<pool.length;i++) for(const offset of [0.001,0.5,0.999]) {
    const selected=select(recorded,pool,()=> (i+offset)/pool.length);
    if(seen.has(i)) assert.equal(selected.id,seen.get(i)); else seen.set(i,selected.id);
  }
  assert.equal(new Set(seen.values()).size,pool.length);
}
assert.equal(select(recorded,[]),null);assert.equal(select(recorded,[id('038')],()=>0.999).id,id('038'));
assert.equal(select({...recorded,usedEvents:[id('038')]},[id('038')]),null);
assert.equal(select(field,[id('069')]),null);
const first=select(recorded,legal,createSeededRandom('replay'));assert.deepEqual(first,select(recorded,legal,createSeededRandom('replay')));
const rivalIds=events.filter(e=>select(recorded,[e.id],()=>0,{onlyDraw:true,actingParty:'rep'})).slice(0,4).map(e=>e.id);
assert.equal(new Set([0.001,0.251,0.501,0.751].map(roll=>select(recorded,rivalIds,()=>roll,{onlyDraw:true,actingParty:'rep'}).id)).size,4);
report.DRAW={four:legal,five:[...legal,ordinary[3]],intervals:[0.25,0.2],rivalPool:rivalIds,emptySingletonUsedWrongPartyReplay:true};
// A formerly imminent chain chapter shares the same interval as ordinary draws.
const starter=engine.applyChoice(engine.forceEvent({...field,week:4},'m2_housing'),'choice-1');
const chainGame={...starter,week:5,currentEventId:null,currentEventData:null,outcome:null};
const chainId='derived_housing_permit_count';
assert.ok(select(chainGame,[chainId]));
const chainPool=[chainId,...ordinary.slice(0,3)];
assert.equal(new Set([0.001,0.251,0.501,0.751].map(roll=>select(chainGame,chainPool,()=>roll).id)).size,4);
report.DRAW.formerImminentEqualPool=chainPool;
const poor={...recorded,funds:0};
const unaffordable=events.find(event=>event.id===ordinary[0]);
const originalChoices=unaffordable.choices;
try {
  unaffordable.choices=[{id:'choice-fixture',label:'Cost fixture',branches:[{probability:1,effects:[{kind:'cash',amount:-10,target:{side:'actor'},scalable:false}]}]}];
  assert.ok(select(recorded,[unaffordable.id]));
  assert.equal(select(poor,[unaffordable.id]),null);
} finally { unaffordable.choices=originalChoices; }
report.DRAW.unaffordableExcluded={id:unaffordable.id,fixture:'synthetic all-cost choices through normal selector; catalog restored'};
// Report the clamped delta, not the rolled nominal boost.
const capped=engine.forceEvent({...field,momentum:99},'donor_match');
const cappedDone=engine.applyChoice(capped,'choice-3');
assert.equal(cappedDone.momentum,100);
assert.equal(cappedDone.build40.decisionReceipts.at(-1).effects[0].amount,1);
assert.match(cappedDone.outcome.presentation.effects[0].text,/momentum \+1 points/);

const hidden=hiddenEffectInventory(events);
const hiddenBranches=events.flatMap(e=>e.choices.flatMap(c=>c.branches.filter(b=>b.hidden))).length;
const sample=structuredClone(events[0]);sample.choices=[{id:'hidden-cap',branches:[{hidden:true,probability:1,effects:Array.from({length:12},()=>({kind:'cash',amount:1,hidden:true}))}]}];
assert.equal(hiddenEffectInventory([sample]).length,12);sample.choices[0].branches[0].effects.push({hidden:true});
assert.throws(()=>hiddenEffectInventory([sample]),/exceed 12/);
const hiddenCostConflicts=events.flatMap(e=>e.choices.flatMap(c=>{
  const cost=b=>b.effects.filter(x=>x.kind==='cash'&&x.target.side!=='opponent'&&x.amount<0).reduce((n,x)=>n-x.amount,0);
  return c.branches.some(b=>b.hidden&&cost(b)>Math.max(0,...c.branches.filter(b=>!b.hidden).map(cost)))?[{eventId:e.id,choiceId:c.id}]:[];
}));assert.equal(hiddenCostConflicts.length,0);
assert.equal(outcomePresentation([{kind:'cash',amount:99,hidden:true}]).effects.length,0);
assert.equal(choicePresentation({branches:[{probability:1,effects:[{kind:'cash',amount:99,hidden:true}]}]},x=>x).effects.length,0);
report['EVT-01']={hiddenEffects:hidden,hiddenEffectCount:hidden.length,thirteenFails:true,hiddenBranches,hiddenCostConflicts,actualClampedMomentumDelta:1};

// Find deterministic seeds for existing authored 50/45/5 branch without altering odds.
const rareDefinition=events.find(e=>e.id==='m2_infrastructure');
const choice=rareDefinition.choices[1];const rareFixtures={};
for(let i=0;i<300&&Object.keys(rareFixtures).length<3;i++) {
  const g={...field,build34CampaignId:'b44:rare:'+i};const card=select(g,[rareDefinition.id]);
  const roll=resolveBuild40Roll(g,card.context,choice);
  if(rareFixtures[roll.branchIndex]) continue;
  const queued={...g,currentEventId:card.id,currentEventData:card,outcome:null,usedEvents:[card.id]};
  const loaded=resume(queued); const done=engine.applyChoice(loaded,'choice-2');
  const receipt=done.build40.decisionReceipts.at(-1);
  assert.equal(receipt.effects[0].amount,roll.effects[0].amount);
  assert.ok(done.outcome.presentation.effects[0].text.includes(String(roll.effects[0].amount)));
  assert.ok(!JSON.stringify(card.choices[1].presentation).match(/hidden|massive|5%|\+4 to \+6/));
  assert.deepEqual(resume(done).outcome,done.outcome);
  assert.equal(engine.applyChoice(done,'choice-2'),done);
  rareFixtures[roll.branchIndex]={game:queued,event:card,outcome:done.outcome,applied:receipt.effects,branchIndex:roll.branchIndex};
}
assert.equal(Object.keys(rareFixtures).length,3);
write('fixtures/presentation-events.json',{ordinary:rareFixtures[0],large:rareFixtures[1],rare:rareFixtures[2],conditional:{game:pending,event:pending.currentEventData,outcome:resolved.outcome,applied:resolved.build40.decisionReceipts.at(-1).effects}});
write('fixtures/rare-pending.json',rareFixtures[2].game);
report['EVT-02']={id:rareDefinition.id,style:10,odds:choice.branches.map(b=>b.probability),outcomes:Object.values(rareFixtures).map(f=>({branch:f.branchIndex,effects:f.applied})),savedAndOnceOnly:true};
const rep=create('rep','b43:069'); rep.incidentLedger=[];rep.ballotMeasures=[];
const fictional=schedule(rep,id('069'));assert.ok(fictional.currentEventId);
assert.match(fictional.currentEventData.text,/fictional/i);assert.match(fictional.currentEventData.why,/fictional/i);
const fLoaded=resume(fictional);assert.equal(fLoaded.currentEventData.context.stateId,fictional.currentEventData.context.stateId);
const fDone=engine.applyChoice(fLoaded,'choice-2');assert.match(fDone.outcome.text,/fictional/i);
assert.equal(resume(fDone).outcome.sourceStateId,fLoaded.currentEventData.context.stateId);
assert.equal(engine.applyChoice(fDone,'choice-2'),fDone);
write('fixtures/069-pending.json',fictional);
report['EVT-069']={id:id('069'),state:fLoaded.currentEventData.context.stateId,style:events.find(e=>e.id===id('069')).style,emptyRegistryAndLedger:true,republicanOnly:true,fictionalCardAndRecap:true,onceOnly:true};
write('evidence/engine-acceptance.json',report);
console.log(JSON.stringify({passed:Object.keys(report),fixtures:'../fixtures/presentation-events.json'}));

const pinnedRival=JSON.parse(fs.readFileSync(new URL('../../../../build-0.1.4-integration-worktree/fixtures/072-valid-pending.json',import.meta.url)));
const pinnedLoaded=resume(pinnedRival);assert.equal(pinnedLoaded.currentEventData.context.stateId,'FL');const pinnedDone=engine.applyChoice(pinnedLoaded,'choice-1');assert.ok(pinnedDone.outcome);assert.equal(pinnedDone.build40.decisionReceipts.at(-1).stateId,'FL');write('evidence/pinned-fl-072.json',{baselineState:'FL',resumeState:pinnedLoaded.currentEventData.context.stateId,applied:pinnedDone.build40.decisionReceipts.at(-1),legacyStaffRetained:pinnedLoaded.staffing.traditionalActiveIds.length+pinnedLoaded.staffing.nonTraditionalActiveIds.length});
