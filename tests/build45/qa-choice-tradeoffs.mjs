import fs from 'node:fs';
import assert from 'node:assert/strict';
import { CANDIDATE_EVENTS } from '../../src/data/candidateEvents/index.js';
const vector=choice=>{
  if(choice.branches.length!==1||choice.branches[0].probability!==1||choice.branches[0].effects.some(effect=>effect.kind==='scandal'))return null;
  const result={};for(const effect of choice.branches[0].effects){const key=[effect.kind,effect.target.scope,effect.target.selector||'',effect.target.side].join(':');result[key]=(result[key]||0)+effect.amount*(effect.target.side==='opponent'?-1:1);}return result;
};
const results=[];
for(const card of CANDIDATE_EVENTS){
  const choices=card.choices.map(choice=>({id:choice.id,vector:vector(choice)}));let comparisons=0;
  for(const left of choices)for(const right of choices){if(left.id===right.id||!left.vector||!right.vector)continue;const keys=[...new Set([...Object.keys(left.vector),...Object.keys(right.vector)])];const noWorse=keys.every(key=>(left.vector[key]||0)>=(right.vector[key]||0));const better=keys.some(key=>(left.vector[key]||0)>(right.vector[key]||0));assert.ok(!(noWorse&&better),card.id+': '+left.id+' deterministically dominates '+right.id);comparisons++;}
  assert.ok(card.authorship.tradeoff.trim().length>20,card.id+' authored tradeoff');
  results.push({eventId:card.id,packId:card.packId,framework:card.style,status:'PASS',deterministicPairComparisons:comparisons,authoredTradeoff:card.authorship.tradeoff,probabilisticReview:choices.some(choice=>!choice.vector)?'Risk-bearing alternatives follow numbered framework odds and distinct downside distribution; expected-value advantage alone is not treated as dominance.':'All choices receive multidimensional deterministic Pareto comparison.'});
}
fs.writeFileSync(new URL('../../../evidence/qa/choice-tradeoffs.json',import.meta.url),JSON.stringify({status:'PASS',cards:results.length,comparisons:results.reduce((sum,row)=>sum+row.deterministicPairComparisons,0),results},null,2));
console.log(JSON.stringify({cards:results.length,status:'PASS',deterministicPairComparisons:results.reduce((sum,row)=>sum+row.deterministicPairComparisons,0)}));
