import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync, appendFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const appRoot = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const evidence = path.resolve(appRoot, '../evidence/qa');
mkdirSync(evidence, { recursive: true });
const targetRoot = path.resolve(process.env.BFA_QA_ROOT || appRoot);
const build = process.env.BFA_QA_BUILD || '45';
const imp = (name) => import(pathToFileURL(path.join(targetRoot, 'src', name)).href);
const engine = await imp('lib/gameEngine.js');
const { createSeededRandom } = await imp('lib/seededRandom.js');
const { EVENT_BY_ID } = await imp('data/events.js');
const { recordIncident } = await imp('lib/incidentLedger.js');
const { recordCampaignStrategy, decayCampaignStrategy } = await imp('lib/campaignOperations.js');
const staff = await imp('lib/build35Staff.js');
const { turnoutOf } = await imp('lib/turnout.js');
const { scenarioBallotAccess } = await imp('lib/build39Scenarios.js');
const { STATE_LIST } = await imp('data/states.js');
const { projectStateLegislatures } = await imp('lib/stateLegislatureForecast.js');
const { decidePresidency } = await imp('lib/presidency.js');
const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
const traditional = ['field', 'pollster', 'communications', 'operations', 'policy', 'fundraising', 'base-liaison', 'social-media', 'media'];
const parties = ['dem', 'rep', 'lib', 'grn', 'progressive', 'maga', 'farmer-labor', 'conservation', 'localist'];
const candidates = { dem: ['shapiro', 'newsom'], rep: ['vance', 'rubio'], lib: ['oliver', 'dsmith'], grn: ['stein', 'sawant'], progressive: ['bernie-sanders', 'progressive'], maga: ['vance', 'maga'], 'farmer-labor': ['farmer-labor'], conservation: ['conservation'], localist: ['localist'] };
const rules = ['current', 'automatic-registration', 'same-day-registration', 'mandatory-voter-id', 'mandatory-turnout'];
const difficulties = Object.keys(engine.DIFFICULTIES);
const matrix = parties.flatMap((party, i) => difficulties.map((difficultyId, j) => {
  const style = (Math.floor(j / 2) + i) % 2;
  const modeId = ['progressive', 'maga'].includes(party) ? 'six-party' : ['farmer-labor', 'conservation', 'localist'].includes(party) ? 'regional-parties' : ['lib', 'grn'].includes(party) ? ['four-parties', 'six-party', 'regional-parties'][(i+j)%3] : ['two-parties', 'four-parties', 'six-party', 'regional-parties'][(i+j)%4];
  const opponentParty = party === 'dem' ? 'rep' : 'dem';
  return { id: `qa-${String(i*7+j+1).padStart(2,'0')}`, party, difficultyId, startId: ['jan','apr','aug'][(i+j)%3], votingRuleId: rules[(i+j)%5], modeId, candidateId: candidates[party][style % candidates[party].length], opponentId: candidates[opponentParty][1-style], opponentParty, candidateStyle: style ? 'second-roster-profile' : 'first-roster-profile', rivalStyle: style ? 'first-roster-profile' : 'second-roster-profile', strategy: (i+j)%2 ? 'mobilize' : 'persuade', houseRule: ['standard','pr','mmp'][(i+Math.floor(j/3))%3], electoralRule: ['standard','proportional','district'][(j+Math.floor(i/3))%3], seed: `build45-paired-v1:${i}:${j}` };
}));
const manifestPath = path.join(evidence, 'balance-matrix-frozen.json');
if (process.argv.includes('--freeze')) {
  const factors = ['party','difficultyId','startId','votingRuleId','strategy','candidateStyle','houseRule','electoralRule'];
  const coverage = {};
  for (const [i,a] of factors.entries()) for (const b of factors.slice(i+1)) {
    const actual = new Set(matrix.map(row => `${row[a]}|${row[b]}`));
    const missing = [...new Set(matrix.map(row=>row[a]))].flatMap(x=>[...new Set(matrix.map(row=>row[b]))].filter(y=>!actual.has(`${x}|${y}`)).map(y=>[x,y]));
    coverage[`${a}/${b}`] = { covered: actual.size, missing };
  }
  writeFileSync(manifestPath, JSON.stringify({ frozenAt: new Date().toISOString(), schema: 1, scope: 'All nine currently selectable player parties; all seven difficulties, three starts, five voter rules, three House and EC rules. Pairwise verification explicitly lists any uncovered pair. Legacy saved parties covered in compatibility fixtures.', benchmark: 'B-001 is ratings-only D+7.3 Senate map and is not setup-matched by this campaign matrix; no win-rate target inferred.', matrix, coverage }, null, 2));
  console.log(JSON.stringify({ frozen: matrix.length, gaps: Object.entries(coverage).filter(([,v])=>v.missing.length) }));
  process.exit(0);
}
const core = JSON.parse(readFileSync(manifestPath, 'utf8')).matrix;
const frozen=process.env.BFA_QA_SUPPLEMENTAL==='popular'?JSON.parse(readFileSync(path.join(evidence,'balance-matrix-supplemental-popular-vote.json'),'utf8')).matrix:core;
const requestedIds=process.env.BFA_QA_IDS?.split(',');
const range=requestedIds?frozen.filter(row=>requestedIds.includes(row.id)):frozen.slice(Math.max(0,Number(process.env.BFA_QA_FROM||1)-1),Number(process.env.BFA_QA_TO||frozen.length));
const selected = process.env.BFA_QA_LIMIT ? range.slice(0, Number(process.env.BFA_QA_LIMIT)) : range;
const out = path.join(evidence, `balance-build${build}${process.env.BFA_QA_OUTPUT?'-'+process.env.BFA_QA_OUTPUT:''}.jsonl`);
if (process.argv.includes('--archive') && requireArchive()) {}
function requireArchive() { try { const previous=readFileSync(out); writeFileSync(out+'.preliminary',previous); } catch {} return true; }
writeFileSync(out, '');
const digest = value => createHash('sha256').update(JSON.stringify(value) ?? 'undefined').digest('hex');
const totals = object => { let sum = 0; const visit = v => { if (typeof v === 'number' && Number.isFinite(v)) sum += v; else if (v && typeof v === 'object') Object.values(v).forEach(visit); }; visit(object); return sum; };
for (const config of selected) {
  const started = performance.now();
  storage.clear(); Math.random = createSeededRandom(config.seed);
  const metrics = { actions: 0, decisions: 0, candidateDecisions: 0, resumeChecks: 0, unavailablePreferredChoices: [] };
  let game=null, failureState=null;
  try {
    game = engine.createGame({ ...config, campaignId: config.seed });
    const opening = { funds: game.funds, national: game.natGeneric, candidateId: game.candidateId, opponentId: game.opponentId };
    game = engine.confirmBuild35Staffing(game, traditional.slice(0, build === '44' ? 9 : 3));
    assert.equal(game.staffing.initialSelectionComplete, true, 'staffing confirmation');
    const commit = (current,next,context) => next === current ? current : staff.recordBuild35StaffAction(current, recordCampaignStrategy(current, recordIncident(current,next,context),context),context);
    const drain = current => {
      let next = engine.advanceDecisionEvent(current);
      let guard = 0;
      while (engine.decisionPending(next)) {
        assert.ok(++guard <= 40,'decision queue progresses');
        const event = next.currentEventData || EVENT_BY_ID[next.currentEventId];
        failureState=next;
        assert.ok(event?.choices?.length, `event available ${next.currentEventId}`);
        const available=event.choices.filter(choice=>!choice.unavailable);
        assert.ok(available.length,`no available event choice ${event.id}: ${JSON.stringify(event.choices.map(c=>({id:c.id,unavailable:c.unavailable})))}`);
        const preferred=event.choices[config.strategy === 'mobilize' ? Math.min(1,event.choices.length-1) : 0];
        const choice=preferred.unavailable?available[0]:preferred;
        if(preferred.unavailable)metrics.unavailablePreferredChoices.push({eventId:event.id,week:next.week,funds:next.funds,preferredId:preferred.id,preferredCost:preferred.costM,unavailable:preferred.unavailable,selectedId:choice.id});
        const resolved = engine.applyChoice(next, choice, event.id);
        assert.notEqual(resolved,next,`${event.id} resolves`);
        metrics.decisions++; if (event.candidateId) metrics.candidateDecisions++;
        next = engine.advanceDecisionEvent(commit(next,resolved,{type:'choice'}));
      }
      return next;
    };
    let weekGuard = 0;
    while (!game.finished) {
      assert.ok(++weekGuard <= 45, 'campaign finishes');
      const week = game.week;
      game = drain(game);
      let debateGuard=0;
      while (game.debate && !game.debate.done && debateGuard++<8) {
        const q=engine.debateDefinition(game)?.questions?.[game.debate.step];
        if (!q?.answers?.length) break;
        game=drain(commit(game,engine.answerDebate(game,q.answers[0]),{type:'debate'}));
      }
      const states = STATE_LIST.map(state=>state.abbr).filter(abbr=>scenarioBallotAccess(game.build39?.scenario?.id,'president',abbr,game.party));
      const targets = [...states].sort((a,b)=>Math.abs(engine.pollMargin(a,game))-Math.abs(engine.pollMargin(b,game))).slice(0,7);
      for (let step=0; game.actionsLeft>0 && step<12; step++) {
        let actionId = step%4===3 ? 'fundraise' : config.strategy==='mobilize' ? 'volunteers' : 'visit';
        const abbr=targets[step%targets.length];
        const before=game.actionsLeft;
        let next=engine.applyAction(game,actionId,abbr);
        if (next===game) { actionId='fundraise'; next=engine.applyAction(game,actionId,abbr); }
        assert.notEqual(next,game,`action progresses ${week}/${step}`);
        game=drain(commit(game,next,{type:'action',actionId,abbr}));
        metrics.actions+=before-game.actionsLeft;
      }
      assert.equal(game.actionsLeft,0);
      game=drain(engine.prepareDecisionWeekClose(game));
      const rival=recordIncident(game,engine.opponentTurn(game),{type:'opponent'});
      game=decayCampaignStrategy(engine.advanceWeek(rival));
      assert.equal(game.week,week+1);
      assert.ok(Number.isFinite(game.funds)&&game.funds>=0,'finite cash');
      if ([1,11,12,13].includes(game.week)||game.finished) {
        const ballots=digest(game.earlyBallotLedger); const candidateState=digest(game.candidateEvents);
        assert.equal(engine.saveGame(game),true); game=engine.loadGame(); assert.ok(game,'resume');
        assert.equal(digest(game.earlyBallotLedger),ballots,'early ballots immutable on resume');
        if(build!=='44') assert.equal(digest(game.candidateEvents),candidateState,'candidate counts/queue survive');
        metrics.resumeChecks++;
      }
    }
    const result=engine.resultSnapshot(game), house=engine.houseSnapshot(game,true), senate=engine.senateSnapshot(game,true), gov=engine.govSnapshot(game,true);
    const districts=house.districts?.length?house.districts:engine.houseSnapshot({...game,houseRule:'standard'},true).districts;
    assert.equal(Object.values(result.evBy).reduce((a,b)=>a+b,0),538,'EV conservation');
    const votes={}; result.rows.forEach(row=>Object.entries(row.votes||{}).forEach(([p,v])=>votes[p]=(votes[p]||0)+v));
    const allVotes=totals(votes); const turnout=result.rows.map(row=>turnoutOf(game,row.abbr,game.party));
    const seats=row=>row.seatsByParty||Object.fromEntries(parties.map(p=>[p,row[p]||0]));
    const presidency=decidePresidency(game,result,house);
    const output={build,config,status:'PASS',opening,...metrics,weeks:game.week,funds:game.funds,turnout:{average:totals(turnout)/turnout.length,min:Math.min(...turnout),max:Math.max(...turnout)},groups:{demographicMods:game.demographicMods,groupEffectsByParty:game.build40?.groupEffectsByParty},factions:game.factions,fatigue:game.fatigue,totalFatigue:game.totalFatigue,nationalShares:Object.fromEntries(Object.entries(votes).map(([p,v])=>[p,100*v/allVotes])),ev:result.evBy,win:presidency.winner===game.party,presidency:{mode:presidency.mode,winner:presidency.winner},stateOutcomes:result.rows.map(({abbr,margin,winner,shares})=>({abbr,margin,winner,shares})),districtOutcomes:(districts||[]).map(({id,districtId,state,margin,winner,shares})=>({id,districtId,state,margin,winner,shares})),chambers:{house:seats(house),senate:seats(senate),governor:seats(gov),legislatures:projectStateLegislatures(game,{includeNoElectionStates:true}).states.map(({abbr,chambers,control,provisional})=>({abbr,chambers,control,provisional}))},candidateEvents:game.candidateEvents,ms:performance.now()-started};
    const saveDir=path.join(evidence,'balance-saves',`build${build}`);mkdirSync(saveDir,{recursive:true});
    writeFileSync(path.join(saveDir,config.id+'.save'),storage.get(engine.STORAGE_KEY));
    appendFileSync(out,JSON.stringify(output)+'\n'); console.log(JSON.stringify({id:config.id,build,status:'PASS',weeks:game.week,ms:Math.round(output.ms)}));
  } catch(error) {
    if(game){const failureDir=path.join(evidence,'balance-failures',`build${build}`);mkdirSync(failureDir,{recursive:true});writeFileSync(path.join(failureDir,config.id+'.json'),JSON.stringify(failureState||game));}
    appendFileSync(out,JSON.stringify({build,config,status:'OPEN',...metrics,error:error.stack,ms:performance.now()-started})+'\n');
    console.log(JSON.stringify({id:config.id,build,status:'OPEN',error:error.message}));
  }
}
