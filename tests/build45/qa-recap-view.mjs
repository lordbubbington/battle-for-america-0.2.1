import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';
const app=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const server=await createServer({root:app,configFile:false,appType:'custom',resolve:{alias:{'@':path.join(app,'src')}},optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false,watch:null}});
const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
const results=[];
try{
  const e=await server.ssrLoadModule('/src/lib/gameEngine.js');
  const {default:Recaps}=await server.ssrLoadModule('/src/components/game/CandidateDecisionRecaps.jsx');
  const {CANDIDATE_BY_ID}=await server.ssrLoadModule('/src/data/candidates.js');
  const {CANDIDATE_EVENTS_BY_ID}=await server.ssrLoadModule('/src/data/candidateEvents/index.js');
  const {outcomePresentation}=await server.ssrLoadModule('/src/lib/build44EventPresentation.js');
  for(const mode of ['two-parties','four-parties','six-party','regional-parties']){
    let game=JSON.parse(fs.readFileSync(path.resolve(app,'../evidence/qa/ui-fixtures',mode+'-candidate-pending.json'),'utf8'));
    const participants=e.activeCandidateTickets(game),regularCount=game.eventSchedule.length,seen=[];
    for(let index=0;index<participants.length;index++){
      assert.equal(game.week,11);const context=game.currentEventData.context;
      const choice=game.currentEventData.choices.find(row=>!row.unavailable);
      game=e.advanceDecisionEvent(e.applyChoice(game,choice));
      const receipts=game.build40.decisionReceipts.filter(row=>row.candidateId&&row.week===11&&row.id!==game.currentEventData?.context?.instanceId);
      const html=renderToStaticMarkup(Recaps({game}));
      assert.equal((html.match(/data-testid="candidate-decision-recap"/g)||[]).length,receipts.length);
      for(const receipt of receipts){
        const event=CANDIDATE_EVENTS_BY_ID[receipt.eventId];
        assert.ok(html.includes(escape(CANDIDATE_BY_ID[receipt.candidateId].name)),event.id+' candidate identity');
        assert.ok(html.includes(escape(event.title)),event.id+' event identity');
        assert.ok(html.includes(escape(event.choices.find(row=>row.id===receipt.choiceId).label)),event.id+' chosen label');
        for(const effect of outcomePresentation(receipt.effects).effects)assert.ok(html.includes(escape(effect.text)),event.id+' exact applied effect');
      }
      assert.ok(receipts.some(row=>row.id===context.instanceId),'just-resolved decision has a persistent recap');
      e.saveGame(game);game=e.loadGame();assert.ok(game);assert.equal(renderToStaticMarkup(Recaps({game})),html,'resume keeps exact recap markup');
      seen.push({candidateId:context.candidateId,actingParty:context.actingParty,recapsVisible:receipts.length,week:game.week});
    }
    assert.equal(game.candidateEvents.queue.length,0);assert.equal(game.eventSchedule.length,regularCount);
    for(const row of participants)assert.equal(game.candidateEvents.resolvedCounts[row.candidateId],1);
    results.push({mode,status:'PASS',participants:participants.length,seen,regularSlotsPreserved:regularCount,week:12});
  }
  fs.writeFileSync(path.resolve(app,'../evidence/qa/candidate-recap-view.json'),JSON.stringify({status:'PASS',method:'Actual React component rendered after exact Home applyChoice→advanceDecisionEvent path and again after each save/resume. Packaged visual check remains separate.',results},null,2));
  console.log(JSON.stringify({modes:results.length,status:'PASS',candidateRecaps:results.reduce((sum,row)=>sum+row.participants,0)}));
}finally{await server.close();}
