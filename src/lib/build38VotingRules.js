import { VOTING_RULE_BY_ID, VOTING_RULE_TUNING, VOTING_RULES_VERSION } from '../data/build38VotingRules.js';
import { GOVERNOR_OPENING_CALIBRATION_VERSION, GOVERNOR_OPENING_MARGIN_MULTIPLIER } from '../data/build38GovernorCalibration.js';

import { SCENARIO_CANDIDATES } from '../data/build39Scenarios.js';

const PARTIES = new Set(['dem', 'rep', 'lib', 'grn', 'ind', ...Object.keys(SCENARIO_CANDIDATES)]);
const ETHNICITIES = new Set(['white', 'black', 'asian', 'hispanic', 'native', 'other']);
const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const nonnegative = (n) => finite(n) && n >= 0;
const rate = (n) => finite(n) && n >= 0 && n <= 1;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const unavailable = (reason) => ({ status: 'unavailable', reason, cohorts: [], audit: null });

/** Save offset once for new campaigns and add it to future live margins. */
/** @param {{stateId?:string, openingMarginDMinusR?:number, scenario?:{campaignType?:string}}} [options] */
export function calibrateGovernorOpening({ stateId, openingMarginDMinusR, scenario } = {}) {
  if (typeof stateId !== 'string' || !stateId || !finite(openingMarginDMinusR) || !['new', 'legacy'].includes(scenario?.campaignType)) return { status: 'unavailable', reason: 'governor-opening-input-required' };
  const calibrated = scenario.campaignType === 'new' ? openingMarginDMinusR * GOVERNOR_OPENING_MARGIN_MULTIPLIER : openingMarginDMinusR;
  return { status: 'ready', version: GOVERNOR_OPENING_CALIBRATION_VERSION, stateId, openingMarginDMinusR: calibrated,
    openingOffset: calibrated - openingMarginDMinusR };
}

/** Four-party fixed-race input is a first-choice lead, not an RCV margin. */
/** @param {{stateId?:string, openingLead?:number, scenario?:{campaignType?:string}}} [options] */
export function calibrateFourPartyGovernorLead({ stateId, openingLead, scenario } = {}) {
  const result = calibrateGovernorOpening({ stateId, openingMarginDMinusR: openingLead, scenario });
  return result.status === 'ready' ? { status: 'ready', version: result.version, stateId, openingLead: result.openingMarginDMinusR, openingOffset: result.openingOffset } : result;
}

/** Build 37 ballot totals represent votes cast, not the registration-eligible pool. */
/** @param {{historicalBallots?:number, baselineTurnoutRate?:number, ruleId?:string}} [options] */
export function modeledRegistrationPool({ historicalBallots, baselineTurnoutRate, ruleId = 'current' } = {}) {
  if (!VOTING_RULE_BY_ID[ruleId] || !nonnegative(historicalBallots) || !rate(baselineTurnoutRate) || baselineTurnoutRate === 0) {
    return { status: 'unavailable', reason: 'invalid-baseline-ballots-or-turnout' };
  }
  const originalPool = historicalBallots / baselineTurnoutRate;
  const expanded = ['automatic-registration', 'same-day-registration', 'mandatory-turnout'].includes(ruleId);
  const eligibleUnits = expanded ? originalPool / VOTING_RULE_TUNING.baseRegisteredFraction : originalPool;
  return { status: 'ready', eligibleUnits, baseRegisteredUnits: originalPool,
    assumption: expanded ? 'modeled-90-percent-registration-baseline' : 'build37-eligible-pool' };
}

/** Find bounded state rates with a population-weighted national average of 98%. */
/** @param {{populationByState?:Record<string,number>, baselineRatesByState?:Record<string,number>}} [options] */
export function calibrateMandatoryTurnout({ populationByState, baselineRatesByState } = {}) {
  if (!populationByState || typeof populationByState !== 'object' || !baselineRatesByState || typeof baselineRatesByState !== 'object') {
    return { status: 'unavailable', reason: 'population-or-state-turnout-unavailable' };
  }
  const ids = Object.keys(populationByState).sort();
  if (!ids.length || ids.some((id) => !nonnegative(populationByState[id]) || populationByState[id] === 0 || !rate(baselineRatesByState[id]))) {
    return { status: 'unavailable', reason: 'incomplete-population-or-state-turnout' };
  }
  const totalPopulation = ids.reduce((sum, id) => sum + populationByState[id], 0);
  const mean = ids.reduce((sum, id) => sum + populationByState[id] * baselineRatesByState[id], 0) / totalPopulation;
  const raw = Object.fromEntries(ids.map((id) => [id, VOTING_RULE_TUNING.compulsoryNationalTarget + (baselineRatesByState[id] - mean) * VOTING_RULE_TUNING.compulsoryVariationScale]));
  const weighted = (offset) => ids.reduce((sum, id) => sum + populationByState[id] * clamp(raw[id] + offset, VOTING_RULE_TUNING.compulsoryFloor, 1), 0) / totalPopulation;
  let low = -1;
  let high = 1;
  for (let i = 0; i < 80; i += 1) {
    const midpoint = (low + high) / 2;
    if (weighted(midpoint) < VOTING_RULE_TUNING.compulsoryNationalTarget) low = midpoint;
    else high = midpoint;
  }
  const offset = (low + high) / 2;
  const stateRates = Object.fromEntries(ids.map((id) => [id, clamp(raw[id] + offset, VOTING_RULE_TUNING.compulsoryFloor, 1)]));
  return { status: 'ready', version: VOTING_RULES_VERSION, stateRates, populationTotal: totalPopulation,
    weightedRate: ids.reduce((sum, id) => sum + populationByState[id] * stateRates[id], 0) / totalPopulation,
    denominator: 'resident-population-weighted-registered-voter-turnout' };
}

/**
 * Adjust stable registration pools and uncast participation, without changing
 * the input cohorts, support shares, or ballots already saved by the engine.
 */
/** @param {{ruleId?:string, phase?:string, stateId?:string, population?:number, cohorts?:any[], nationalCalibration?:any, fieldMobilization?:number}} [options] */
export function adjustVotingRule({ ruleId = 'current', phase, stateId, population, cohorts, nationalCalibration, fieldMobilization = 0 } = {}) {
  if (!VOTING_RULE_BY_ID[ruleId]) return unavailable('unknown-voting-rule');
  if (!['early', 'election-day'].includes(phase) || typeof stateId !== 'string' || !stateId.trim()
    || !nonnegative(population) || population === 0 || !Array.isArray(cohorts) || !cohorts.length || !rate(fieldMobilization)) return unavailable('invalid-voting-rule-input');
  const ids = new Set();
  for (const cohort of cohorts) {
    if (!cohort || typeof cohort.id !== 'string' || !cohort.id.trim() || ids.has(cohort.id)
      || !ETHNICITIES.has(cohort.ethnicityId) || !PARTIES.has(cohort.firstChoiceParty)
      || !nonnegative(cohort.eligibleUnits) || !nonnegative(cohort.registeredUnits)
      || cohort.registeredUnits > cohort.eligibleUnits + 1e-8 || !rate(cohort.baseTurnoutRate)
      || !nonnegative(cohort.earlyCastUnits) || cohort.earlyCastUnits > cohort.registeredUnits + 1e-8
      || (cohort.baseRegisteredUnits !== undefined && (!nonnegative(cohort.baseRegisteredUnits)
        || cohort.baseRegisteredUnits > cohort.registeredUnits + 1e-8))) return unavailable('invalid-or-overlapping-cohort-input');
    ids.add(cohort.id);
  }
  const compulsoryRate = nationalCalibration?.stateRates?.[stateId];
  if (ruleId === 'mandatory-turnout' && (nationalCalibration?.status !== 'ready' || !rate(compulsoryRate)
    || compulsoryRate < VOTING_RULE_TUNING.compulsoryFloor)) return unavailable('mandatory-turnout-calibration-unavailable');
  const adjusted = cohorts.map((cohort) => {
    const baseRegisteredUnits = cohort.baseRegisteredUnits ?? cohort.registeredUnits;
    let registeredUnits = cohort.registeredUnits;
    if (ruleId === 'automatic-registration') registeredUnits = Math.max(registeredUnits, Math.min(cohort.eligibleUnits, baseRegisteredUnits + cohort.eligibleUnits * VOTING_RULE_TUNING.automaticRegistrationPoints));
    if (ruleId === 'same-day-registration') registeredUnits = Math.max(registeredUnits, Math.min(cohort.eligibleUnits, baseRegisteredUnits + cohort.eligibleUnits * VOTING_RULE_TUNING.sameDayRegistrationPoints * fieldMobilization));
    if (ruleId === 'mandatory-turnout') registeredUnits = cohort.eligibleUnits;
    let targetTurnoutRate = cohort.baseTurnoutRate;
    if (ruleId === 'mandatory-voter-id') targetTurnoutRate = clamp(targetTurnoutRate - (cohort.ethnicityId === 'white' ? VOTING_RULE_TUNING.idReductionWhite : VOTING_RULE_TUNING.idReductionNonwhite), 0, 1);
    if (ruleId === 'mandatory-turnout') targetTurnoutRate = compulsoryRate;
    const availableRegisteredUnits = Math.max(0, registeredUnits - cohort.earlyCastUnits);
    const remainingTurnoutRate = ruleId === 'mandatory-turnout' && phase === 'election-day'
      ? (availableRegisteredUnits ? clamp((registeredUnits * targetTurnoutRate - cohort.earlyCastUnits) / availableRegisteredUnits, 0, 1) : 0)
      : targetTurnoutRate;
    return { ...cohort, baseRegisteredUnits, registeredUnits, targetTurnoutRate, remainingTurnoutRate,
      availableRegisteredUnits, availableEligibleUnits: Math.max(0, cohort.eligibleUnits - cohort.earlyCastUnits) };
  });
  const sum = (field) => adjusted.reduce((total, item) => total + item[field], 0);
  return { status: 'ready', cohorts: adjusted, audit: { ruleId, ruleVersion: VOTING_RULES_VERSION, stateId, phase, population,
    eligibleUnits: sum('eligibleUnits'), registeredUnits: sum('registeredUnits'), earlyCastUnits: sum('earlyCastUnits'),
    availableRegisteredUnits: sum('availableRegisteredUnits'), compulsoryTargetRate: ruleId === 'mandatory-turnout' ? compulsoryRate : null } };
}

/** Quote a new checkpoint; caller persists its cohort votes and receipt atomically. */
/** @param {{adjusted?:any, phase?:string, eligibleUnitsByCohort?:Record<string,number>}} [options] */
export function quoteVotingCheckpoint({ adjusted, phase, eligibleUnitsByCohort } = {}) {
  if (adjusted?.status !== 'ready' || adjusted.audit?.phase !== phase || !['early', 'election-day'].includes(phase)) return { status: 'unavailable', reason: 'adjusted-phase-required' };
  if (phase === 'early' && (!eligibleUnitsByCohort || typeof eligibleUnitsByCohort !== 'object')) return { status: 'unavailable', reason: 'checkpoint-eligible-units-required' };
  const rows = [];
  for (const cohort of adjusted.cohorts) {
    const requested = phase === 'early' ? eligibleUnitsByCohort[cohort.id] : cohort.availableRegisteredUnits;
    if (!nonnegative(requested) || requested > cohort.availableRegisteredUnits + 1e-8) return { status: 'unavailable', reason: 'checkpoint-exceeds-uncast-registered-pool' };
    rows.push({ id: cohort.id, firstChoiceParty: cohort.firstChoiceParty, ethnicityId: cohort.ethnicityId,
      eligibleUnits: requested, turnoutRate: cohort.remainingTurnoutRate, castUnits: Math.min(requested, requested * cohort.remainingTurnoutRate) });
  }
  return { status: 'ready', ruleVersion: VOTING_RULES_VERSION, stateId: adjusted.audit.stateId, phase, cohorts: rows,
    castUnits: rows.reduce((sum, item) => sum + item.castUnits, 0) };
}

/** Exact Build 37 Current-rule adapter, including its native independent weights. */
/** @param {{nativeVotes?:Record<string,number>, earlyBallots?:any}} [options] */
export function currentRuleBallotParity({ nativeVotes, earlyBallots = null } = {}) {
  if (!nativeVotes || typeof nativeVotes !== 'object' || Array.isArray(nativeVotes)
    || Object.values(nativeVotes).some((value) => !nonnegative(value))) return { status: 'unavailable', reason: 'native-votes-required' };
  if (!earlyBallots) return { status: 'ready', votes: { ...nativeVotes } };
  if (!nonnegative(earlyBallots.count) || !nonnegative(earlyBallots.electorate) || earlyBallots.electorate === 0 || earlyBallots.count > earlyBallots.electorate
    || !earlyBallots.votes || Object.values(earlyBallots.votes).some((value) => !nonnegative(value))) return { status: 'unavailable', reason: 'invalid-early-ballots' };
  const total = Object.values(earlyBallots.votes).reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - earlyBallots.count) > Math.max(1, total) * 1e-9) return { status: 'unavailable', reason: 'early-ballot-count-mismatch' };
  const remaining = Math.max(0, 1 - earlyBallots.count / earlyBallots.electorate);
  return { status: 'ready', votes: Object.fromEntries(Object.keys(nativeVotes).map((party) => [party, (earlyBallots.votes[party] || 0) + nativeVotes[party] * remaining])) };
}
