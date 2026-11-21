import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const app=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const baseline=path.resolve(app,'../../build-0.1.4-integration-worktree/workers/baseline-B/fixtures.mjs');
let source=fs.readFileSync(baseline,'utf8');
// Preserve the native producer searches, replacing their documented pre-Build44
// expected vulnerabilities with the shipped Build44/45 rejection contract.
source=source.replace("  const numbered =", "  const { CANDIDATE_EVENTS = [] } = await server.ssrLoadModule('/src/data/candidateEvents/index.js');\n  const { TRADITIONAL_STAFF_SELECTION_COUNT } = await server.ssrLoadModule('/src/data/traditionalStaffRoster.js');\n  const allIds = [...events,...CANDIDATE_EVENTS].map(({id})=>id);\n  const numbered =");
source=source.replace('engine.confirmBuild35Staffing(fresh, staff)','engine.confirmBuild35Staffing(fresh, staff.slice(0,TRADITIONAL_STAFF_SELECTION_COUNT))');
source=source.replaceAll('events.map(({ id }) => id).filter((id) => id !== numbered.get(number).id)','allIds.filter((id) => id !== numbered.get(number).id)');
source=source.replace('  const isolate = (state, number, options = {}) => engine.nextEventFor(state, {', '  const selectedFixtures = new Map();\n  const isolate = (state, number, options = {}) => { const card = engine.nextEventFor(state, {');
source=source.replace('  }).event;\n  const schedule', "  }).event; if (card?.sourceReceiptId && card.id === numbered.get(number).id) selectedFixtures.set(number, { state: structuredClone(state), card }); return card; };\n  const schedule");
source=source.replace("    const pending = schedule(recorded, '038');", "    selectedFixtures.set('038',{state:structuredClone(recorded),card:{sourceReceiptId:receipt.id}});\n    const pending = schedule(recorded, '038');");
source=source.replace("assert.equal(stale038?.sourceReceiptId, receipt.id, 'Documents current stale-receipt acceptance');", "assert.equal(stale038, null, 'Current stale receipt rejection');");
source=source.replaceAll('staleAccepted: true','staleRejected: true');
source=source.replace("assert.equal(strippedResumed.currentEventData.sourceReceiptId, receipt.id, 'Documents saved context bypass');", "assert.equal(strippedResumed.currentEventData, null, 'Missing saved source retires pending card');");
source=source.replace("assert.ok(engine.applyChoice(strippedResumed, 'choice-1').outcome, 'Saved pending card remains resolvable without its source');", "assert.equal(engine.applyChoice(strippedResumed, 'choice-1'), strippedResumed);");
source=source.replace('savedContextWithoutSourceStillResolvable: true','savedContextWithoutSourceRejected: true');
source=source.replace("assert.equal(isolate({ ...committedRival, week: 9 }, '072')?.sourceReceiptId, rivalSource.id);", "assert.equal(isolate({ ...committedRival, week: 9 }, '072'), null);");
source=source.replace("assert.ok(foundPetition && foundCorrection, 'Native weekly briefings produced modeled petition and correction receipts');", "assert.equal(foundPetition || foundCorrection, false, 'Modeled notice does not establish official records');");
source=source.replace("assert.ok(['048', '096', '097', '099', '100'].every((number) => byId[number]?.nativePositive));", "assert.ok(['048', '096', '097', '099', '100'].every((number) => !byId[number]?.nativePositive));");
source=source.replace("checks.nativeModeledOfficialLaneIds = ['048', '096', '097', '099', '100'];", "checks.modeledOfficialLanesFailClosed = ['048', '096', '097', '099', '100'];");
source=source.replace('    return { checks, byId };', `
    if (!byId['079']?.nativePositive) {
      for (let i=0;i<100&&!byId['079']?.nativePositive;i++) {
        const base={...game('dem','qa45:attendance:'+i),week:5};
        const next=commit(base,engine.opponentTurn(base),{type:'opponent'});
        observe(next,['079'],{seed:'qa45:attendance:'+i});
      }
    }
    for (const [number, result] of Object.entries(byId)) {
      if (!result.nativePositive) continue;
      const fixture = selectedFixtures.get(number);
      assert.ok(fixture, number + ' native fixture retained');
      const state = { ...fixture.state, usedEvents: [] };
      const receipt = state.incidentLedger.find(row=>row.id===fixture.card.sourceReceiptId);
      assert.ok(receipt, number + ' native source retained');
      const missing = isolate({ ...state, incidentLedger: [] },number);
      const stale = isolate({ ...state, week: state.week+4 },number);
      const wrongCampaign = isolate({ ...state, incidentLedger: [{ ...receipt, campaignId: 'wrong-campaign' }] },number);
      assert.equal(missing,null,number+' missing source'); assert.equal(stale,null,number+' stale'); assert.equal(wrongCampaign,null,number+' wrong campaign');
      const pending = schedule(state,number);
      assert.equal(pending.currentEventId,numbered.get(number).id,number+' scheduled');
      assert.ok(engine.saveGame(pending)); const resumed = engine.loadGame();
      assert.equal(resumed.currentEventId,pending.currentEventId,number+' pending resume');
      assert.equal(resumed.currentEventData.context.stateId,pending.currentEventData.context.stateId,number+' target resume');
      let wrongTarget = 'not-applicable: source state is null (national/debate source)';
      if (receipt.stateId || receipt.state) {
        const wrongState = pending.currentEventData.context.stateId==='PA'?'FL':'PA';
        const altered={...pending,currentEventData:{...pending.currentEventData,context:{...pending.currentEventData.context,stateId:wrongState}}};
        const rejected=engine.applyChoice(altered,altered.currentEventData.choices.find(c=>!c.unavailable));
        assert.equal(rejected.build40.decisionReceipts.length,pending.build40.decisionReceipts.length,number+' wrong target');wrongTarget='rejected';
      }
      const resolved = engine.applyChoice(resumed,resumed.currentEventData.choices.find(c=>!c.unavailable));
      assert.ok(resolved.outcome,number+' resolved'); const replay=engine.applyChoice({...resolved,outcome:null},'choice-1');assert.equal(replay.funds,resolved.funds,number+' replay cash');assert.deepEqual(replay.build40.decisionReceipts,resolved.build40.decisionReceipts,number+' replay receipt count');
      assert.ok(engine.saveGame(resolved)); assert.deepEqual(engine.loadGame().build40.decisionReceipts,JSON.parse(JSON.stringify(resolved.build40.decisionReceipts)),number+' settled resume');
      assert.ok(engine.saveGame({...pending,incidentLedger:[]})); assert.equal(engine.loadGame().currentEventData,null,number+' missing pending source');
      const mutated = state.incidentLedger.map(row=>row.id===receipt.id?{...row,payload:{...row.payload,qaTampered:true}}:row);
      assert.ok(engine.saveGame({...pending,incidentLedger:mutated})); assert.equal(engine.loadGame().currentEventData,null,number+' changed pending source');
      note(number,{independentContract:{noSource:true,stale:true,crossCampaign:true,pendingResume:true,targetPreserved:true,wrongTarget,settledResume:true,missingPendingRetired:true,changedPendingRetired:true,onceOnly:true}, fixture:{week:state.week,party:state.party,candidateId:state.candidateId,campaignId:state.build34CampaignId,source:receipt}});
    }
    return { checks, byId };`);
const generated=new URL('./qa-native-fixtures-generated.mjs',import.meta.url);
fs.writeFileSync(generated,source);
const { exerciseInterruptionRoutes }=await import(generated.href);
const { createServer }=await import(pathToFileURL(path.join(app,'node_modules/vite/dist/node/index.js')).href);
const server=await createServer({root:app,configFile:false,appType:'custom',cacheDir:path.join(app,'.vite/qa-native'),resolve:{alias:{'@':path.join(app,'src')}},optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false,watch:null}});
const evidence=path.resolve(app,'../evidence/qa'); fs.mkdirSync(evidence,{recursive:true});
try {
  const e=await server.ssrLoadModule('/src/lib/gameEngine.js');
  const { BUILD40_EVENTS }=await server.ssrLoadModule('/src/data/build40EventCatalog.js');
  const result=await exerciseInterruptionRoutes(server,e,BUILD40_EVENTS);
  const positives=Object.entries(result.byId).filter(([,v])=>v.nativePositive).map(([id])=>id);
  fs.writeFileSync(path.join(evidence,'native-preservation.json'),JSON.stringify({baselineFixture:baseline,adaptations:['native staff count','candidate IDs excluded during single-card eligibility tests','Build44 stale038/072 and missing038 source reject','Build45 simulated official lanes fail closed'],positives,...result},null,2));
  console.log(JSON.stringify({positives:positives.length,ids:positives,checks:result.checks}));
} finally {await server.close();}
