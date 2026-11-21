import { VOTING_RULE_BY_ID } from '../data/build38VotingRules.js';

/** Allocate cents by largest remainder, preserving the exact $2.5M state mean. */
export function volunteerCostTable(populationTable) {
  if (!populationTable || typeof populationTable !== 'object' || Array.isArray(populationTable)) return { status: 'unavailable', reason: 'population-table-required' };
  const ids = Object.keys(populationTable).sort();
  if (!ids.length || ids.some((id) => !Number.isFinite(populationTable[id]) || populationTable[id] <= 0)) return { status: 'unavailable', reason: 'invalid-population-table' };
  const total = ids.reduce((sum, id) => sum + populationTable[id], 0);
  const rows = ids.map((id) => {
    const exact = 250 * ids.length * populationTable[id] / total;
    return { id, cents: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  const remainder = 250 * ids.length - rows.reduce((sum, row) => sum + row.cents, 0);
  [...rows].sort((a, b) => b.remainder - a.remainder || a.id.localeCompare(b.id)).slice(0, remainder).forEach((row) => { row.cents += 1; });
  return { status: 'ready', costsM: Object.fromEntries(rows.map(({ id, cents }) => [id, cents / 100])), totalCents: 250 * ids.length };
}

/** Actor-independent quote: use for both player and rival actions. */
/** @param {{ruleId?:string, actionId?:string, stateId?:string, electoralVotes?:number, population?:number, populationTable?:Record<string,number>, campaignWeek?:number, totalWeeks?:number}} [options] */
export function fieldActionRules({ ruleId = 'current', actionId, stateId, electoralVotes, population, populationTable, campaignWeek, totalWeeks } = {}) {
  if (!VOTING_RULE_BY_ID[ruleId] || typeof actionId !== 'string' || typeof stateId !== 'string' || !stateId
    || !Number.isInteger(campaignWeek) || !Number.isInteger(totalWeeks) || campaignWeek < 1 || totalWeeks < campaignWeek) return { status: 'unavailable', reason: 'invalid-field-input' };
  if (actionId === 'visit' && (!Number.isFinite(electoralVotes) || electoralVotes <= 0)) return { status: 'unavailable', reason: 'electoral-votes-required' };
  let volunteerCostM = null;
  if (actionId === 'volunteers') {
    const table = volunteerCostTable(populationTable);
    if (table.status !== 'ready' || !Object.hasOwn(table.costsM, stateId) || !Number.isFinite(population) || population !== populationTable[stateId]) return { status: 'unavailable', reason: 'state-population-unavailable' };
    volunteerCostM = table.costsM[stateId];
  }
  return { status: 'ready', volunteerCostM,
    rallyMultiplier: actionId === 'visit' && electoralVotes < 5 ? 1.75 : 1,
    fieldMultiplier: ruleId === 'automatic-registration' && campaignWeek === totalWeeks && ['volunteers', 'field-operation', 'ground-weekly'].includes(actionId) ? 2 : 1 };
}

/** Scale only effect outputs, after native staff bonuses and before engine bounds. */
/** @param {{quote?:any, effects?:any, alreadyApplied?:boolean}} [options] */
export function applyFieldEffectMultipliers({ quote, effects, alreadyApplied = false } = {}) {
  if (quote?.status !== 'ready' || !effects || typeof effects !== 'object' || alreadyApplied) return { status: 'unavailable', reason: alreadyApplied ? 'modifier-already-applied' : 'field-quote-required' };
  const multiplier = quote.rallyMultiplier * quote.fieldMultiplier;
  const result = { ...effects };
  for (const key of ['turnoutPoints', 'persuasionPoints', 'momentumPoints', 'genericPoints']) {
    if (key in effects) {
      if (!Number.isFinite(effects[key])) return { status: 'unavailable', reason: 'invalid-effect' };
      result[key] = effects[key] * multiplier;
    }
  }
  if (effects.groupShifts !== undefined) {
    if (!effects.groupShifts || typeof effects.groupShifts !== 'object' || Object.values(effects.groupShifts).some((value) => !Number.isFinite(value))) return { status: 'unavailable', reason: 'invalid-group-shifts' };
    result.groupShifts = Object.fromEntries(Object.entries(effects.groupShifts).map(([key, value]) => [key, value * multiplier]));
  }
  return { status: 'ready', effects: result, multiplier };
}
