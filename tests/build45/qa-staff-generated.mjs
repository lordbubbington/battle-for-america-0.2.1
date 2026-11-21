import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.env.BFA_STAFF_APP_ROOT || path.resolve('build35');
const load = p => import(pathToFileURL(path.join(root, 'src', p)));
const e = await load('lib/gameEngine.js');
const rules = await load('lib/traditionalStaffRules.js');
const nt = await load('lib/nonTraditionalStaffRules.js');
const staffEngine = await load('lib/build35Staff.js');
const { NONTRADITIONAL_STAFF_ROSTER } = await load('data/nonTraditionalStaffRoster.js');
const { randomizeStaff } = await load('lib/build38StaffRules.js');
const { TRADITIONAL_STAFF_ROSTER, TRADITIONAL_STAFF_SELECTION_COUNT: count } = await load('data/traditionalStaffRoster.js');
const { createSeededRandom } = await load('lib/seededRandom.js');
Math.random = createSeededRandom('staff45:normal');
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k,v) => memory.set(k,v) };
const baseline = process.argv.includes('--baseline');
const output = "C:\\Users\\rober\\OneDrive\\Documents\\ChatGPT\\Battle For America\\build-0.2.0-integration-worktree\\evidence\\qa\\staff";
const saveFile = (name, value) => fs.writeFileSync(path.join(output,name), JSON.stringify(value,null,2));
const draft = e.createGame({ party:'dem',candidateId:'shapiro',opponentId:'vance',runningMateId:'ossoff',campaignId:'staff45:normal',difficultyId:'medium',startId:'aug' });
const pool = draft.staffing.nonTraditionalSelectionPoolIds;
const traditional = TRADITIONAL_STAFF_ROSTER.filter(s=>s.id!=='chief').map(s=>s.id);
const eligible = [...traditional, ...pool];
const offPoolId = NONTRADITIONAL_STAFF_ROSTER.find(s => !pool.includes(s.id)).id;
const roster = g => [...g.staffing.traditionalActiveIds,...g.staffing.nonTraditionalActiveIds];
const resume = g => { assert.equal(e.saveGame(g),true); const next=e.loadGame();assert.ok(next);return next; };
const agenda = g => {
  const recommendation = staffEngine.build35StaffBriefing(g).recommendations.find(r => r.actionId === 'fundraise' && r.agendaEligible);
  if (!recommendation) return g;
  const next = staffEngine.setBuild35Agenda(g,recommendation.id);
  assert.equal(next.staffing.agendaByWeek[g.week].status,'unconsumed');
  return next;
};
const action = g => { const next=e.applyAction({...g,currentEventId:null,currentEventData:null,outcome:null,eventSchedule:[],eventScheduleWeek:g.week,eventScheduleIndex:-1},'fundraise',g.staffing.agendaByWeek[g.week]?.targetId || 'PA');assert.notEqual(next,g);assert.ok(next.actionsLeft<g.actionsLeft);return next; };
if (baseline) {
  assert.equal(count,9);
  assert.equal(e.confirmBuild35Staffing(draft,traditional.slice(0,3)),draft);
  const ids=[...traditional.slice(0,8),pool[0]];
  const confirmed=e.confirmBuild35Staffing(draft,ids);
  assert.equal(roster(confirmed).length,10);
  let acted=action(agenda(confirmed));
  assert.equal(acted.staffing.agendaByWeek[0].status,'consumed');
  assert.ok(acted.staffing.agendaByWeek[0].effectReceiptId);
  acted=e.advanceWeek({...acted,actionsLeft:0,currentEventId:null,currentEventData:null,outcome:null,eventSchedule:[],eventScheduleWeek:acted.week,eventScheduleIndex:-1});
  assert.ok(acted.staffing.briefingHistory.length);
  acted=action(acted);
  saveFile('build44-unconfirmed.json',draft);
  saveFile('build44-confirmed-after-action.json',acted);
  const randomized=randomizeStaff({campaignId:draft.build34CampaignId,previewRoll:1,eligibleIds:eligible});
  assert.equal(randomized.length,9);
  saveFile('baseline.json',{campaignId:draft.build34CampaignId,threeConfirm:false,nineConfirm:true,selectedIds:ids,randomizedIds:randomized,activeIds:roster(resume(acted))});
} else {
  assert.equal(count,3);
  const newPending=resume(resume(draft));
  assert.deepEqual(newPending.staffing,draft.staffing);
  assert.equal(e.confirmBuild35Staffing(newPending,pool).staffing.initialSelectionComplete,true);
  for(const ids of [traditional.slice(0,2),traditional.slice(0,4),['field','field','policy'],['chief','field','policy'],['unknown','field','policy'],[...traditional.slice(0,2),offPoolId]]) assert.equal(rules.selectInitialTraditionalStaff(ids,draft.staffing,draft.build34CampaignId).ok,false);
  const reports=[];
  for(const ids of [traditional.slice(0,3),['fundraising',...pool.slice(0,2)],pool]) {
    const confirmed=agenda(e.confirmBuild35Staffing(draft,ids));
    assert.equal(confirmed.staffing.initialSelectionComplete,true);
    assert.deepEqual(new Set(roster(confirmed)),new Set(['chief',...ids]));
    assert.equal(nt.validateNonTraditionalStaffState(confirmed.staffing).valid,true);
    const snapshot=structuredClone(confirmed.staffing);
    let g=resume(resume(confirmed));assert.deepEqual(g.staffing,snapshot);
    g=action(g);if(g.staffing.agendaByWeek[g.week]) { assert.equal(g.staffing.agendaByWeek[g.week].status,'consumed');assert.ok(g.staffing.agendaByWeek[g.week].effectReceiptId); }const week=g.week;g=e.advanceWeek({...g,actionsLeft:0,currentEventId:null,currentEventData:null,outcome:null,eventSchedule:[],eventScheduleWeek:week,eventScheduleIndex:-1});assert.equal(g.week,week+1);
    g=resume(resume(g));assert.deepEqual(new Set(roster(g)),new Set(['chief',...ids]));
    reports.push({selectedIds:ids,activeIds:roster(g),resumedWeek:g.week});
  }
  for(let i=0;i<100;i++) { const ids=randomizeStaff({campaignId:draft.build34CampaignId,previewRoll:i,eligibleIds:eligible});assert.equal(ids.length,3);assert.equal(new Set(ids).size,3);assert.ok(ids.every(id=>eligible.includes(id))); }
  const legacy=JSON.parse(fs.readFileSync(path.join(output,'build44-confirmed-after-action.json')));
  const before=structuredClone(legacy.staffing);let migrated=resume(legacy);
  assert.deepEqual(migrated.staffing,{...before,selectionPolicyVersion:0});
  assert.equal(migrated.funds,legacy.funds);assert.equal(roster(migrated).length,10);
  assert.deepEqual(resume(migrated).staffing,migrated.staffing);
  migrated=action(migrated);const week=migrated.week;migrated=e.advanceWeek({...migrated,actionsLeft:0,currentEventId:null,currentEventData:null,outcome:null,eventSchedule:[],eventScheduleWeek:week,eventScheduleIndex:-1});assert.equal(migrated.week,week+1);assert.equal(roster(resume(migrated)).length,10);
  const oldDraft=JSON.parse(fs.readFileSync(path.join(output,'build44-unconfirmed.json')));
  oldDraft.staffing.traditionalActiveIds=traditional; // stale unconfirmed lists cannot become hires
  const pending=resume(oldDraft);assert.deepEqual(roster(pending),['chief']);assert.deepEqual(pending.staffing.nonTraditionalSelectionPoolIds,pool);assert.equal(pending.staffing.selectionPolicyVersion,1);
  const malformed={...legacy,staffing:{...legacy.staffing,traditionalActiveIds:['chief']}};
  assert.equal(e.saveGame(malformed),true);assert.equal(e.loadGame(),null);
  const unknownPolicy={...legacy.staffing,selectionPolicyVersion:100};assert.ok(rules.validateTraditionalStaffing(unknownPolicy).length);
  saveFile('postchange.json',{reports,randomizations:100,legacyIds:roster(migrated),legacyFundsPreserved:true,legacyPortraitsAgendasHistoryPreserved:true,unconfirmedIds:roster(pending),malformedRejected:true});
}
console.log(baseline?'STAFF baseline PASS':'STAFF postchange PASS');
