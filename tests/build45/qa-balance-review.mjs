import fs from 'node:fs';
import { unzipSync } from 'node:zlib';
const root=new URL('../../../evidence/qa/',import.meta.url);
const report=JSON.parse(fs.readFileSync(new URL('balance-comparison.json',root),'utf8'));
const allConfigs=[...JSON.parse(fs.readFileSync(new URL('balance-matrix-frozen.json',root),'utf8')).matrix,...JSON.parse(fs.readFileSync(new URL('balance-matrix-supplemental-popular-vote.json',root),'utf8')).matrix];
const configs=new Map(allConfigs.map(row=>[row.id,row]));
const game=(build,id)=>{const packed=fs.readFileSync(new URL(`balance-saves/build${build}/${id}.save`,root),'utf8');return JSON.parse(packed.startsWith('b35:z1:')?unzipSync(Buffer.from(packed.slice(7),'base64')).toString():packed);};
const receiptSummary=g=>{
  const receipts=g.build40?.decisionReceipts||[];
  const byParty={};
  for(const receipt of receipts)for(const effect of receipt.effects||[]){const party=effect.party;byParty[party]||={cash:0,momentum:0,scandalMomentum:0,persuasionStatePoints:0,turnoutStatePoints:0,group:0};const row=byParty[party];if(effect.kind==='cash')row.cash+=effect.amount;else if(effect.kind==='momentum')row.momentum+=effect.amount;else if(effect.kind==='scandal')row.scandalMomentum+=effect.amount;else if(effect.kind==='persuasion')row.persuasionStatePoints+=effect.amount*(effect.states?.length||1);else if(effect.kind==='turnout')row.turnoutStatePoints+=effect.amount*(effect.states?.length||1);else if(effect.kind==='group')row.group+=effect.amount;}
  return {candidateId:g.candidateId,opponentId:g.opponentId,scenario:g.build39?.scenario?.id,mode:g.build40?.modeId,selectedStaff:[...g.staffing.traditionalActiveIds,...g.staffing.nonTraditionalActiveIds],decisions:receipts.length,candidateDecisionCount:receipts.filter(row=>row.candidateId).length,candidateCounts:g.candidateEvents?.resolvedCounts||{},byParty,fundraising:g.fundraising,financeLastWeek:g.finance};
};
const material=report.paired.filter(row=>Math.abs(row.voteDelta)>=5||Math.abs(row.evDelta)>=54||row.wins.before!==row.wins.after).map(row=>{
  const before=game(44,row.id),after=game(45,row.id);
  return {id:row.id,config:configs.get(row.id),deltas:{cash:row.cashDelta,actions:row.actionsDelta,turnout:row.turnoutDelta,firstChoicePopularVote:row.voteDelta,ev:row.evDelta,stateWinnerChanges:row.stateFlips,districtWinnerChanges:row.districtFlips},wins:row.wins,presidency:row.presidency,beforeReceipts:receiptSummary(before),afterReceipts:receiptSummary(after),interpretation:'This is a paired whole-release difference. The changed candidate pool, native3staff roster, official receipt gates and PVI-informed House forecasts/rival choices can alter later campaign paths. Saved receipt totals expose direct event contributions; they do not isolate the causal contribution of each system. No unproven single-cause attribution or automatic tuning is claimed.'};
}).sort((a,b)=>Math.abs(b.deltas.firstChoicePopularVote)-Math.abs(a.deltas.firstChoicePopularVote));
const corrections=[];
for(const build of [44,45]){
  const files=fs.readdirSync(root).filter(name=>new RegExp('^balance-build'+build+'(?:-part[0-9]+|-probe43)?\\.jsonl$').test(name));
  const rows=files.flatMap(file=>fs.readFileSync(new URL(file,root),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse));
  for(const row of rows.filter(row=>row.status==='OPEN')){
    const final=rows.find(candidate=>candidate.config.id===row.config.id&&candidate.status==='PASS');
    corrections.push({build,id:row.config.id,originalError:row.error.split('\n')[0],disposition:final?'PASS on corrected harness; no production edit':'OPEN',preferredUnavailable:final?.unavailablePreferredChoices||[],finalResultFile:files.find(file=>fs.readFileSync(new URL(file,root),'utf8').split('\n').some(line=>{try{const v=JSON.parse(line);return v.config.id===row.config.id&&v.status==='PASS';}catch{return false;}}))});
  }
}
fs.writeFileSync(new URL('balance-material-review.json',root),JSON.stringify({status:report.status,matched:report.matched,summary:report.summary,byParty:report.byParty,triageRule:'Review absolute first-choice popular-vote change >=5points, EV change >=54, or changed player win. These thresholds are QA review choices, not owner balance targets.',benchmark:'B-001 fixed D+7.3 Senate ratings map is not setup-matched; no numeric campaign win-rate target exists in BENCHMARKS.md.',assessment:'All campaign invariants pass; no new cash/queue/save/action defect is reproduced. The largest gains and losses remain visible below for integration review. QA made no production tuning changes.',harnessCorrections:corrections,material},null,2));
console.log(JSON.stringify({paired:report.matched,material:material.length,resolvedHarnessFailures:corrections.filter(row=>row.disposition.startsWith('PASS')).length,wins:report.summary}));
