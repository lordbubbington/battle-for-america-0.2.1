import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as e from '../../src/lib/gameEngine.js';
import { CANDIDATE_EVENTS } from '../../src/data/candidateEvents/index.js';
import { BUILD40_EVENTS } from '../../src/data/build40EventCatalog.js';
import { TRADITIONAL_STAFF_SELECTION_COUNT } from '../../src/data/traditionalStaffRoster.js';
import { createSeededRandom } from '../../src/lib/seededRandom.js';
import { resolveBuild40Roll } from '../../src/lib/build40DecisionRuntime.js';
import { STATE_LIST } from '../../src/data/states.js';
import { scenarioBallotAccess } from '../../src/lib/build39Scenarios.js';
import { baseTurnoutRow } from '../../src/lib/turnout.js';
const root=new URL('../../../',import.meta.url), evidence=new URL('evidence/qa/',root);
fs.mkdirSync(evidence,{recursive:true});
const roster=JSON.parse(fs.readFileSync(new URL('evidence/candidate-roster.json',root)));
const memory=new Map(); globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
const staff=['field','pollster','communications','operations','policy','fundraising','base-liaison','social-media','media'];
const ids=[...BUILD40_EVENTS,...CANDIDATE_EVENTS].map(x=>x.id);
assert.equal(new Set(ids).size,ids.length,'global unique IDs');
const values={momentum:[1,3,5,10],turnout:[1,2,3,6],persuasion:[0.1,0.25,0.5,1],cash:[2,5,10,20],group:[1,2,5,10]};
const close=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<0.00011,`${label}: expected ${expected}, actual ${actual}`);
const clamp=(value,lo,hi)=>Math.max(lo,Math.min(hi,value));
const numeric=game=>({funds:game.funds,aiFunds:game.aiFunds,momentum:game.momentum,oppMomentum:game.oppMomentum,pMomentum:game.pMomentum,stateMods:game.stateMods,thirdMods:game.thirdMods,turnout:game.turnout,demographicMods:game.demographicMods,groups:game.build40?.groupEffectsByParty});
const make=(row,rival,seed)=>{
  const own=row.party;
  const mode=own.startsWith('favorite-')?'favorite-sons-daughters':['progressive','maga'].includes(own)?'six-party':['farmer-labor','conservation','localist'].includes(own)?'regional-parties':['dem','rep'].includes(own)?'two-parties':'four-parties';
  const party=rival?(own==='dem'?'rep':'dem'):own;
  Math.random=createSeededRandom(seed);
  let game=e.createGame({party,candidateId:rival?(own==='dem'?'abbott':'harris'):row.candidateId,opponentId:rival?row.candidateId:(own==='dem'?'abbott':'harris'),opponentParty:rival?own:undefined,modeId:mode.startsWith('favorite-')?null:mode,scenarioId:mode.startsWith('favorite-')?mode:undefined,campaignId:seed,difficultyId:'medium',startId:'aug'});
  game=e.confirmBuild35Staffing(game,staff.slice(0,TRADITIONAL_STAFF_SELECTION_COUNT));
  assert.equal(game.staffing.initialSelectionComplete,true);
  return {...game,week:4,funds:1000,aiFunds:Object.fromEntries(Object.keys(game.aiFunds).map(p=>[p,1000])),eventSchedule:[],eventScheduleWeek:4,eventScheduleIndex:-1,currentEventId:null,currentEventData:null,outcome:null,usedEvents:[]};
};
const expectedDelta=(before,after,definition,choice,card)=>{
  const rolled=resolveBuild40Roll(before,card.context,choice);
  const expected=structuredClone(before);
  const receipt=after.build40.decisionReceipts.at(-1);
  const other=card.context.actingParty===before.party?before.opponentParty:before.party;
  const major=p=>p==='dem'||p==='rep';
  const momentum=(game,p)=>p===game.party?game.momentum:p===game.opponentParty?game.oppMomentum:game.pMomentum?.[p]??50;
  const setMomentum=(p,v)=>{v=Math.round(clamp(v,0,100));if(p===expected.party)expected.momentum=v;else if(p===expected.opponentParty)expected.oppMomentum=v;else expected.pMomentum={...expected.pMomentum,[p]:v};};
  for(const effect of rolled.effects){
    const p=effect.target.side==='opponent'?other:card.context.actingParty;
    const pov=p==='rep'?-1:1;
    const amount=effect.amount;
    if(effect.kind==='cash') {if(p===expected.party)expected.funds=Math.round((expected.funds+amount)*1000)/1000;else expected.aiFunds[p]=Math.round((expected.aiFunds[p]+amount)*1000)/1000;}
    else if(effect.kind==='momentum')setMomentum(p,momentum(expected,p)+amount);
    else if(effect.kind==='persuasion')for(const {abbr} of STATE_LIST){if(major(p))expected.stateMods[abbr]=(expected.stateMods[abbr]||0)+amount*pov;else if(scenarioBallotAccess(expected.build39?.scenario?.id,'president',abbr,p)){expected.thirdMods={...expected.thirdMods,[p]:{...expected.thirdMods?.[p],[abbr]:(expected.thirdMods?.[p]?.[abbr]||0)+amount}};}}
    else if(effect.kind==='turnout')for(const {abbr} of STATE_LIST){const row={...baseTurnoutRow(abbr),...expected.turnout?.[abbr]};row[p]=Math.round(clamp((row[p]??60)+amount,40,99)*10000)/10000;expected.turnout={...expected.turnout,[abbr]:row};}
    else if(effect.kind==='group'){const key=effect.target.selector;if(major(p))expected.demographicMods={...expected.demographicMods,[key]:(expected.demographicMods?.[key]||0)+amount*pov};else expected.build40.groupEffectsByParty={...expected.build40.groupEffectsByParty,[p]:{...expected.build40.groupEffectsByParty?.[p],[key]:(expected.build40.groupEffectsByParty?.[p]?.[key]||0)+amount}};}
    else if(effect.kind==='scandal'){
      const applied=receipt.effects.find(x=>x.kind==='scandal');
      if(applied){assert.equal(applied.party,p,'scandal actor targeting');setMomentum(p,momentum(expected,p)+applied.amount);for(const {abbr} of STATE_LIST){if(major(p))expected.stateMods[abbr]=(expected.stateMods[abbr]||0)+applied.persuasionAmount*pov;else if(scenarioBallotAccess(expected.build39?.scenario?.id,'president',abbr,p))expected.thirdMods={...expected.thirdMods,[p]:{...expected.thirdMods?.[p],[abbr]:(expected.thirdMods?.[p]?.[abbr]||0)+applied.persuasionAmount}};}}
    }else throw new Error('Unreviewed effect kind '+effect.kind);
    const receiptParties=receipt.effects.filter(x=>x.kind===effect.kind&&(!effect.target.selector||x.targetLabel===effect.target.selector)).map(x=>x.party);
    assert.ok(receiptParties.every(actor=>actor===p),definition.id+' receipt actor');
  }
  const compare=(actual,want,label)=>{if(typeof want==='number')close(actual,want,label);else if(want&&typeof want==='object'){assert.deepEqual(Object.keys(actual||{}).sort(),Object.keys(want).sort(),label+' keys');for(const key of Object.keys(want))compare(actual[key],want[key],label+'.'+key);}else assert.equal(actual,want,label);};
  compare(numeric(after),numeric(expected),definition.id+' '+choice.id);
  return {branch:rolled.branchIndex,rolledEffects:rolled.effects,receiptEffects:receipt.effects};
};
const results=[];
for(const row of roster){
  const cards=CANDIDATE_EVENTS.filter(x=>x.candidateId===row.candidateId);
  const checks={count:cards.length,minimum:row.minimumEvents,positive:0,negative:0,mixed:0,choices:0,deltaChecks:0};
  const record={id:row.packId,candidateId:row.candidateId,corruption:row.corruption,status:'OPEN',checks,witnesses:[]};
  results.push(record);
  if(!cards.length){record.reason='Pack not yet present in active registry';continue;}
  try{
    assert.ok(cards.length>=row.minimumEvents,'minimum cards');
    for(const card of cards){
      assert.equal(card.packId,row.packId);assert.ok(card.title&&card.flavor&&card.triggerText&&card.authorship?.grounding&&card.authorship?.tradeoff);
      assert.ok(card.style>=1&&card.style<=10);assert.equal(card.choices.length,[8,9,10].includes(card.style)?2:3);
      const expectedOdds={1:[[1],[1],[0.5,0.5]],2:[[1],[1],[1]],3:[[1],[0.25,0.75],[0.5,0.5]],4:[[1],[1],[1]],5:[[1],[1],[0.5,0.5]],6:[[1],[1],[1]],7:[[1],[1],[1]],8:[[1],[0.6,0.4]],9:[[1],[1]],10:[[1],[0.5,0.45,0.05]]};
      assert.deepEqual(card.choices.map(c=>c.branches.map(b=>b.probability)),expectedOdds[card.style],'numbered framework branch odds');
      assert.equal(card.trigger.kind,'candidate-event');
      let utility=0;
      for(const choice of card.choices){
        close(choice.branches.reduce((a,b)=>a+b.probability,0),1,'branch probability');
        for(const branch of choice.branches)for(const effect of branch.effects){const tier=values[effect.kind]?.indexOf(Math.abs(effect.amount));utility+=branch.probability*(effect.kind==='scandal'?-effect.probability*(effect.severity==='double'?12:6):[1,2,3,6][tier]*Math.sign(effect.amount)*(effect.target.side==='opponent'?-1:1));}
      }
      const derived=utility/card.choices.length>0.01?'positive':utility/card.choices.length< -0.01?'negative':'mixed';
      assert.equal(card.polarity,derived,card.id+' outcome polarity'); checks[derived]++;
      assert.equal(new Set(card.choices.map(c=>JSON.stringify(c.branches))).size,card.choices.length,'mechanically distinct choices');
      for(const rival of [false,true]){
        const game=make(row,rival,`qa:delta:${card.id}:${rival}`);
        const selected=e.nextEventFor(game,{actingParty:row.party,onlyDraw:true,random:()=>0,excludedEventIds:ids.filter(id=>id!==card.id)}).event;
        assert.equal(selected?.id,card.id,'native eligible draw');
        const replacement=row.candidateId==='harris'?'shapiro':'harris';
        const absent={...game,candidateId:rival?game.candidateId:replacement,opponentId:rival?replacement:game.opponentId};
        assert.equal(e.nextEventFor(absent,{actingParty:row.party,onlyDraw:true,random:()=>0,excludedEventIds:ids.filter(id=>id!==card.id)}).event,null,'absent candidate');
        assert.equal(e.nextEventFor({...game,week:0},{actingParty:row.party,onlyDraw:true,random:()=>0,excludedEventIds:ids.filter(id=>id!==card.id)}).event,null,'first week');
        const forced=e.forceEvent(game,card.id);assert.equal(forced.currentEventId,card.id);
        for(const choice of card.choices){
          const after=e.applyChoice(forced,choice.id);
          assert.notEqual(after,forced,'choice resolves');
          const delta=expectedDelta(forced,after,card,choice,forced.currentEventData);checks.deltaChecks++;checks.choices++;
          record.witnesses.push({eventId:card.id,choiceId:choice.id,playerParty:game.party,actingParty:row.party,rival,campaignId:game.build34CampaignId,week:game.week,expected:'All independent numeric target state values match authored rolled package, including the opposite ticket.',actual:'Exact match',...delta});
          assert.equal(after.candidateEvents.resolvedCounts[row.candidateId],1);
          const beforeRetry=structuredClone(numeric(after));
          const retry=e.applyChoice({...after,outcome:null},choice.id);
          assert.deepEqual(numeric(retry),beforeRetry,'no numeric effect reapplied after cleared outcome');
          assert.deepEqual(retry.candidateEvents,after.candidateEvents,'no candidate count reapplied');
          assert.deepEqual(retry.build40.decisionReceipts,after.build40.decisionReceipts,'no duplicate choice receipt');
        }
      }
    }
    assert.ok(checks.positive>0&&checks.negative>0,'both polarity signs');
    if(row.corruption<12)assert.ok(checks.positive>checks.negative,'lower/moderate corruption positive share (documented authoring band)');
    if(row.corruption>=12)assert.ok(checks.negative>checks.positive,'higher corruption negative share (documented authoring band)');
    for(const rival of [false,true]){
      const pending=e.forceEvent(make(row,rival,`qa:resume:${row.packId}:${rival}`),cards[0].id);
      e.saveGame(pending);const loaded=e.loadGame();assert.deepEqual(loaded.currentEventData.context,pending.currentEventData.context);
      const settled=e.applyChoice(loaded,cards[0].choices[0].id);e.saveGame(settled);const loadedAgain=e.loadGame();
      assert.deepEqual(loadedAgain.candidateEvents,settled.candidateEvents);assert.deepEqual(loadedAgain.build40.decisionReceipts,JSON.parse(JSON.stringify(settled.build40.decisionReceipts)));
    }
    record.status='PASS';record.evidence='Every current authored choice has exact independent player/rival state deltas; both pending/settled save paths; framework structure and outcomes-derived polarity.';
  }catch(error){record.reason=error.stack;console.log(JSON.stringify({id:row.packId,status:'OPEN',error:error.message}));}
}
fs.writeFileSync(new URL('candidate-independent.json',evidence),JSON.stringify({baseline:'No candidate registry/module in manifest-matched Build44; new behavior absence, not a regression.',activeCards:CANDIDATE_EVENTS.length,results},null,2));
console.log(JSON.stringify({cards:CANDIDATE_EVENTS.length,pass:results.filter(r=>r.status==='PASS').length,open:results.filter(r=>r.status==='OPEN').map(r=>({id:r.id,reason:r.reason?.split('\n')[0]}))}));
