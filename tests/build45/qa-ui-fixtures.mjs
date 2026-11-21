import fs from 'node:fs';
import * as e from '../../src/lib/gameEngine.js';
import { createSeededRandom } from '../../src/lib/seededRandom.js';
const dir=new URL('../../../evidence/qa/ui-fixtures/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
const commitRecap=[];
for(const modeId of ['two-parties','four-parties','six-party','regional-parties']){
  const seed='qa-ui-guarantee:'+modeId;Math.random=createSeededRandom(seed);
  let g=e.createGame({party:'dem',candidateId:'shapiro',opponentId:'vance',modeId,startId:'aug',difficultyId:'medium',campaignId:seed});
  g=e.confirmBuild35Staffing(g,['field','pollster','communications']);
  g={...g,week:11,funds:1000,aiFunds:Object.fromEntries(Object.keys(g.aiFunds).map(p=>[p,1000])),candidateEvents:undefined,eventSchedule:[{status:'pending',afterActions:0},{status:'pending',afterActions:3}],eventScheduleWeek:11,eventScheduleIndex:-1,currentEventId:null,currentEventData:null,outcome:null};
  const pending=e.advanceDecisionEvent(g);
  fs.writeFileSync(new URL(modeId+'-candidate-pending.json',dir),JSON.stringify(pending));
  fs.writeFileSync(new URL(modeId+'-participants.json',dir),JSON.stringify(e.activeCandidateTickets(g)));
  const applied=e.applyChoice(pending,pending.currentEventData.choices.find(c=>!c.unavailable));
  const committed=e.advanceDecisionEvent(applied);
  commitRecap.push({modeId,input:{seed,week:11,eventId:pending.currentEventId,candidateId:pending.currentEventData.context.candidateId,queuedBefore:pending.candidateEvents.queue.length},expected:'The resolved candidate identity and recap stay visible in the normal Home commit path.',afterApplyChoice:{eventId:applied.currentEventId,outcome:applied.outcome},afterHomeAdvanceDecision:{eventId:committed.currentEventId,outcome:committed.outcome,queuedAfter:committed.candidateEvents.queue.length},recapPreservedInCurrentStage:committed.outcome?.eventId===pending.currentEventId});
}
fs.writeFileSync(new URL('home-candidate-recap-check.json',dir),JSON.stringify(commitRecap,null,2));
console.log('Four same-week queue UI fixtures prepared.');
