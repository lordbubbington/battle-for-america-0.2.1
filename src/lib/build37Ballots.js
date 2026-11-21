import { STATE_DEMOGRAPHICS } from '@/data/demographics';
import { POPULATION_BY_STATE } from '@/data/build38Population';
import { adjustVotingRule, calibrateMandatoryTurnout, modeledRegistrationPool } from '@/lib/build38VotingRules';
import { createEarlyBallotLedger, MODELED_EARLY_VOTE_SCHEDULE, recordEarlyBallots, validateEarlyBallotLedger } from './earlyBallotLedger.js';
import { BASE_TURNOUT, turnoutOf, voteUnits, votesFor } from './turnout.js';

export const ELECTION_MODEL_VERSION = 1;

/** The state baseline preserves historical cast volume at baseline turnout. */
function stateElectorate(abbr) {
  return voteUnits(abbr) / ((BASE_TURNOUT[abbr] ?? 60) / 100);
}

export function earlyBallotAvailable(game, abbr = null) {
  return game.electoralRule !== 'district' &&
    (game.electoralRule === 'proportional' || !['ME', 'NE'].includes(abbr));
}

export function restoreEarlyBallots(game, saved) {
  if (saved?.campaignId === game.build34CampaignId && validateEarlyBallotLedger(saved).valid) return saved;
  if (game.finished) return null;
  return createEarlyBallotLedger({
    campaignId: game.build34CampaignId,
    eligibleFromWeek: game.week + 1,
  });
}

const calibration = calibrateMandatoryTurnout({ populationByState: POPULATION_BY_STATE,
  baselineRatesByState: Object.fromEntries(Object.keys(POPULATION_BY_STATE).map((abbr) => [abbr, (BASE_TURNOUT[abbr] ?? 60) / 100])) });

function ruleState(game, abbr, phase, extraParties = []) {
  const ruleId = game.build38?.votingRuleId || 'current';
  if (ruleId === 'current') return null;
  const baseline = (BASE_TURNOUT[abbr] ?? 60) / 100;
  const pool = modeledRegistrationPool({ historicalBallots: voteUnits(abbr), baselineTurnoutRate: baseline, ruleId });
  const demographics = STATE_DEMOGRAPHICS[abbr]?.share || {};
  const ethnicityIds = ['white', 'black', 'asian', 'hispanic', 'native', 'other'];
  const total = ethnicityIds.reduce((sum, id) => sum + (demographics[id] || 0), 0) || 100;
  const mobilization = Math.min(1, [...new Set(['dem','rep','lib','grn', ...extraParties.filter((id) => id !== 'ind')])].reduce((sum, party) =>
    sum + Math.max(0, turnoutOf(game, abbr, party) - baseline * 100), 0) / 20);
  const parties = [...new Set(['dem','rep','lib','grn','ind', ...extraParties])];
  const byParty = {};
  const cohortsByParty = {};
  let registered = 0;
  for (const party of parties) {
    // The model assumes independent ethnicity and party marginals within a state.
    const cohorts = ethnicityIds.map((id) => {
      const weight = (demographics[id] ?? 0) / total;
      return { id, ethnicityId: id, firstChoiceParty: party,
        eligibleUnits: pool.eligibleUnits * weight, registeredUnits: pool.baseRegisteredUnits * weight,
        baseTurnoutRate: party === 'ind' ? baseline : turnoutOf(game, abbr, party) / 100, earlyCastUnits: 0 };
    });
    const adjusted = adjustVotingRule({ ruleId, phase, stateId: abbr, population: POPULATION_BY_STATE[abbr],
      cohorts, nationalCalibration: calibration, fieldMobilization: mobilization });
    if (adjusted.status !== 'ready') throw new Error(`Invalid ${ruleId} ballot model for ${abbr}: ${adjusted.reason}`);
    registered = adjusted.audit.registeredUnits;
    cohortsByParty[party] = adjusted.cohorts.map((row) => [row.id, row.eligibleUnits, row.registeredUnits, row.targetTurnoutRate]);
    byParty[party] = adjusted.cohorts.reduce((sum, cohort) => sum + cohort.registeredUnits * cohort.targetTurnoutRate, 0);
  }
  return { ruleId, electorate: pool.eligibleUnits, registered, byParty, cohortsByParty };
}

// Compare returns to the unmodified turnout pace under the same ballot rule.
export function projectEarlyBallotPace(game, batch) {
  const { stateId, eligibleBallotVolume, electorate, supportSnapshot } = batch;
  const base = { ...game, turnout: {}, ops: {}, aiOps: {}, freeOps: {} };
  const rule = ruleState(base, stateId, 'early', Object.keys(supportSnapshot));
  if (!rule) return eligibleBallotVolume * (BASE_TURNOUT[stateId] ?? 60) / 100;
  return Object.entries(supportSnapshot).reduce((sum, [party, share]) =>
    sum + eligibleBallotVolume * share / 100 * (rule.byParty[party] || 0) / electorate, 0);
}

export function closeEarlyBallots(game, totalWeeks, states, supportOf) {
  let ledger = game.earlyBallotLedger;
  const week = game.week + 1;
  const segment = MODELED_EARLY_VOTE_SCHEDULE.find((item) => totalWeeks - item.weeksBeforeElection === week);
  if (!segment || !ledger || week < ledger.eligibleFromWeek || !earlyBallotAvailable(game)) return ledger;

  for (const { abbr } of states) {
    if (!earlyBallotAvailable(game, abbr)) continue;
    const support = normalizedSupport(supportOf(abbr));
    const baseline = BASE_TURNOUT[abbr] ?? 60;
    const rule = ruleState(game, abbr, 'early', Object.keys(support));
    const electorate = rule?.electorate ?? stateElectorate(abbr);
    const turnout = Object.fromEntries(Object.keys(support).map((party) =>
      [party, rule ? rule.byParty[party] / electorate : (party === 'ind' ? baseline : turnoutOf(game, abbr, party)) / 100]));
    ({ ledger } = recordEarlyBallots({
      ledger, stateId: abbr, week, checkpoint: segment.checkpoint, electorate,
      eligibleBallotVolume: electorate * segment.eligibleFraction, support, turnout,
      ruleSnapshot: rule ? { version: 1, ruleId: rule.ruleId, phase: 'early', registered: rule.registered, cohortsByParty: rule.cohortsByParty } : undefined,
    }));
  }
  return ledger;
}

function normalizedSupport(shares) {
  const parties = Object.entries(shares).filter(([, share]) => share >= 0 && Number.isFinite(share));
  const total = parties.reduce((sum, [, share]) => sum + share, 0);
  return Object.fromEntries(parties.map(([party, share]) => [party, share / total * 100]));
}

export function earlyBallotsByState(ledger) {
  const rows = {};
  for (const batch of ledger?.batches || []) {
    const row = rows[batch.stateId] ??= { votes: {}, count: 0, electorate: batch.electorate };
    row.count += batch.ballotCount;
    for (const [party, votes] of Object.entries(batch.votes)) row.votes[party] = (row.votes[party] || 0) + votes;
  }
  return rows;
}

export function presidentialBallotCounter(game, abbr, early, extraParties = []) {
  const rule = ruleState(game, abbr, 'election-day', extraParties);
  if (rule) {
    const cast = early?.count || 0;
    return (support) => Object.fromEntries(Object.entries(rule.byParty).map(([party, full]) => {
      const remainingVotes = rule.ruleId === 'mandatory-turnout' ? Math.max(0, full - cast)
        : full * Math.max(0, 1 - cast / rule.registered);
      return [party, (early?.votes[party] || 0) + remainingVotes * (support[party] || 0) / 100];
    }));
  }
  const weights = votesFor(abbr, { dem: 1, rep: 1, lib: 1, grn: 1, ind: 1, ...Object.fromEntries(extraParties.map((id) => [id, 1])) }, game);
  const remaining = early ? Math.max(0, 1 - early.count / early.electorate) : 1;
  const parties = Object.keys(weights);
  return (support) => Object.fromEntries(parties.map((party) =>
    [party, (early?.votes[party] || 0) + (support[party] || 0) * weights[party] * remaining]));
}

export function presidentialBallots(game, abbr, support, early = null) {
  if (game.build38?.votingRuleId && game.build38.votingRuleId !== 'current') return presidentialBallotCounter(game, abbr, early, Object.keys(support))(support);
  const full = votesFor(abbr, support, game);
  if (!early) return full;
  const remaining = Math.max(0, 1 - early.count / early.electorate);
  return Object.fromEntries(Object.entries(full).map(([party, votes]) =>
    [party, (early.votes[party] || 0) + votes * remaining]));
}
