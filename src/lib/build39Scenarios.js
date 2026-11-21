import { applyBuild40Opening } from './build40Elections.js';
import { STATE_BY_ABBR } from '../data/states.js';
import {
  BASE_SCENARIO_PARTIES, FAVORITE_BALLOT_ACCESS, REGIONAL_PARTY_STATES, SCENARIO_CANDIDATES,
  SCENARIO_PARTIES, SCENARIOS, SIX_PARTY_IDS,
} from '../data/build39Scenarios.js';
import { RCV_PREFERENCES } from './rankedChoice.js';
import { createSeededRandom } from './seededRandom.js';

export { SCENARIOS };

const REGIONAL_IDS = Object.keys(REGIONAL_PARTY_STATES);
const FAVORITE_IDS = Object.keys(FAVORITE_BALLOT_ACCESS);
const SIX_PARTY_EXCLUSIVE_IDS = ['progressive', 'maga'];
const SIX_PARTY_MIDWEST = new Set(['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI']);
const SCENARIO_IDS = new Set([...SCENARIOS.map(({ id }) => id), 'six-party']);
const total = (values) => values.reduce((sum, value) => sum + value, 0);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value) => Number.isFinite(value) ? value : 0;

export function normalizeScenarioId(id) {
  return SCENARIO_IDS.has(id) ? id : 'standard';
}

export function scenarioPartyIds(id, race = 'president') {
  if (id === 'six-party') return race === 'senate' ? [...SIX_PARTY_IDS, 'ind'] : [...SIX_PARTY_IDS];
  if (id === 'regional-parties') return [...BASE_SCENARIO_PARTIES, ...REGIONAL_IDS];
  if (id === 'favorite-sons-daughters' && race === 'president') return [...BASE_SCENARIO_PARTIES, ...FAVORITE_IDS];
  return [...BASE_SCENARIO_PARTIES];
}

export function scenarioPartyMeta(id, party) {
  if (party === 'grn') return id === 'six-party' ? SCENARIO_PARTIES.grn : null;
  return scenarioPartyIds(id).includes(party) ? SCENARIO_PARTIES[party] || null : null;
}

export function scenarioCandidateOptions(id) {
  return scenarioPartyIds(id).map((party) => SCENARIO_CANDIDATES[party]).filter(Boolean);
}

export function isScenarioCandidate(id) {
  return Object.hasOwn(SCENARIO_CANDIDATES, id);
}

export function scenarioBallotAccess(id, race, state, party) {
  if (!STATE_BY_ABBR[state] || !scenarioPartyIds(id, race).includes(party)) return false;
  if (Object.hasOwn(REGIONAL_PARTY_STATES, party)) {
    return REGIONAL_PARTY_STATES[party].includes(state);
  }
  const favorite = FAVORITE_BALLOT_ACCESS[party];
  if (favorite) return race === 'president' && (favorite.home === state || favorite.neighbors.includes(state));
  return true;
}

/** @param {{scenarioId?: string, ideologyByState?: Record<string, any>, voteUnitsByState?: Record<string, number>}} [input] */
export function initializeScenarioState({ scenarioId, ideologyByState = {}, voteUnitsByState = {} } = {}) {
  const id = normalizeScenarioId(scenarioId);
  const state = { version: 1, id, adjustmentsByParty: {}, appliedRivalWeek: null, exclusiveByState: {} };
  if (id !== 'six-party') return state;

  // Only these explicitly tagged, disjoint subsets are reserved for their own
  // parties. The broader ideology groups can still vote for other tickets.
  const states = Object.keys(STATE_BY_ABBR);
  const raw = Object.fromEntries(states.map((abbr) => {
    const ideology = ideologyByState[abbr]?.ideology || ideologyByState[abbr] || {};
    return [abbr, { progressive: finite(ideology['far left']) || 15, maga: finite(ideology.populistright) || 16 }];
  }));
  const weights = Object.fromEntries(states.map((abbr) => [abbr, Math.max(0, finite(voteUnitsByState[abbr]))]));
  const weighted = total(Object.values(weights));
  const electorate = weighted || states.length;
  const rawNational = total(states.map((abbr) =>
    (raw[abbr].progressive + raw[abbr].maga) * (weighted ? weights[abbr] : 1))) / electorate;
  const factor = 20 / rawNational;
  state.exclusiveByState = Object.fromEntries(states.map((abbr) => [abbr, {
    progressive: raw[abbr].progressive * factor,
    maga: raw[abbr].maga * factor,
  }]));
  return state;
}

const normalized = (values) => {
  const sum = total(Object.values(values));
  return sum > 0
    ? Object.fromEntries(Object.entries(values).map(([party, value]) => [party, 100 * value / sum]))
    : { ...values, dem: 100 };
};

function scenarioState(game) {
  return game?.build39?.scenario;
}

function adjustmentOf(game, party, state) {
  return finite(scenarioState(game)?.adjustmentsByParty?.[party]?.[state]) + finite(game?.thirdMods?.[party]?.[state]);
}

/** @param {{scenarioId?:string,race?:string,stateId:string,shares:Record<string,number>,game?:any}} input */
export function applyScenarioShares({ scenarioId, race = 'president', stateId, shares, game }) {
  const id = normalizeScenarioId(scenarioId ?? scenarioState(game)?.id);
  if (game?.build40?.openingModel) {
    const modeId = game.build40.modeId;
    if (modeId === 'four-parties') return applyBuild40Opening({ modeId, stateId, race, shares, game }).shares;
    if (modeId === 'six-party' || modeId === 'regional-parties') {
      const baseline = modeId === 'six-party'
        ? { ...shares, grn: (shares.grn || 0) * (SIX_PARTY_MIDWEST.has(stateId) ? 1.75 : 0.78) } : shares;
      const result = applyBuild40Opening({ modeId, stateId, race, shares: baseline, game }).shares;
      const adjustments = scenarioPartyIds(id, race).filter((party) => Object.hasOwn(result, party))
        .map((party) => [party, adjustmentOf(game, party, stateId)]);
      for (const [party, amount] of adjustments) {
        if (!amount || result[party] <= 0) continue;
        const previous = result[party];
        const next = clamp(previous + amount, 0, 99.9);
        const scale = (100 - next) / (100 - previous || 1);
        for (const other of Object.keys(result)) if (other !== party) result[other] *= scale;
        result[party] = next;
      }
      return result;
    }
  }
  if (id === 'standard' || (id === 'favorite-sons-daughters' && race !== 'president')) return shares;

  const base = Object.fromEntries(BASE_SCENARIO_PARTIES.map((party) => [party, Math.max(0, finite(shares?.[party]))]));
  if (id === 'six-party' && race !== 'senate') delete base.ind;
  const extra = {};
  if (id === 'six-party') {
    const exclusive = scenarioState(game)?.exclusiveByState?.[stateId] || { progressive: 20 * 15 / 31, maga: 20 * 16 / 31 };
    for (const party of SIX_PARTY_EXCLUSIVE_IDS) {
      const locked = clamp(finite(exclusive[party]), 0, 28);
      extra[party] = clamp(locked + adjustmentOf(game, party, stateId), locked, 28);
    }
    // The Midwest multiplier acts on the unreserved electorate, which is then
    // renormalized. It therefore cannot cannibalize either exclusive bloc.
    base.grn *= SIX_PARTY_MIDWEST.has(stateId) ? 1.75 : 0.78;
  } else if (id === 'regional-parties') {
    const range = race === 'president' ? [12.5, 10, 15] : [40, 30, 50];
    for (const party of REGIONAL_IDS) {
      if (scenarioBallotAccess(id, race, stateId, party)) {
        extra[party] = clamp(range[0] + adjustmentOf(game, party, stateId), range[1], range[2]);
      }
    }
  } else {
    for (const party of FAVORITE_IDS) {
      if (scenarioBallotAccess(id, race, stateId, party)) {
        const record = FAVORITE_BALLOT_ACCESS[party];
        extra[party] = record.home === stateId
          ? clamp(record.homeShare + adjustmentOf(game, party, stateId), 30, 62)
          : clamp(8 + adjustmentOf(game, party, stateId), 3, 14);
      }
    }
  }
  const remainder = (100 - total(Object.values(extra))) / 100;
  const output = Object.fromEntries(scenarioPartyIds(id, race).map((party) => [party, 0]));
  for (const [party, value] of Object.entries(normalized(base))) output[party] = value * remainder;
  return Object.assign(output, extra);
}

/** @param {{game:any,rows?:Array<{abbr:string,shares:Record<string,number>}>}} input */
export function resolveScenarioRivals({ game, rows = [] }) {
  const state = scenarioState(game);
  const id = normalizeScenarioId(state?.id);
  if (id === 'standard' || game.finished || state.appliedRivalWeek === game.week) {
    return { adjustmentsByParty: state?.adjustmentsByParty || {}, moves: [], appliedRivalWeek: state?.appliedRivalWeek ?? null };
  }
  const adjustmentsByParty = { ...state.adjustmentsByParty };
  const moves = [];
  for (const candidate of scenarioCandidateOptions(id)) {
    const party = candidate.party;
    if (party === game.party) continue;
    const random = createSeededRandom(['build39:scenario-rivals:v1', game.build34CampaignId, game.week, party].join(':'));
    const targets = rows.filter((row) => scenarioBallotAccess(id, 'president', row.abbr, party))
      .slice().sort((a, b) => a.abbr.localeCompare(b.abbr))
      .map((row) => {
        const own = finite(row.shares?.[party]);
        const opponent = Math.max(0, ...Object.entries(row.shares || {})
          .filter(([other]) => other !== party).map(([, value]) => finite(value)));
        const attention = finite(game.strategyProfile?.stateActions?.[row.abbr]);
        const prior = finite(adjustmentsByParty[party]?.[row.abbr]);
        const home = row.abbr === candidate.home ? 0.8 : 0;
        return { abbr: row.abbr, score: home + Math.exp(-Math.abs(own - opponent) / 15) + own / 100 + attention * 0.08 - prior * 0.55 + random() * 0.55 };
      }).sort((a, b) => b.score - a.score);
    const count = id === 'six-party' ? 3 : 1;
    const adjustments = { ...adjustmentsByParty[party] };
    for (const { abbr } of targets.slice(0, count)) {
      const prior = finite(adjustments[abbr]);
      const points = Math.min(2.5 - prior, 0.18 + random() * 0.22);
      if (!(points > 0)) continue;
      adjustments[abbr] = prior + points;
      moves.push({ party, abbr, type: 'stop', points, text: candidate.short + ' campaigned in ' + STATE_BY_ABBR[abbr].name + '.' });
    }
    adjustmentsByParty[party] = adjustments;
  }
  return { adjustmentsByParty, moves, appliedRivalWeek: game.week };
}

// Existing mainstream rankings retain their relative weights. Eliminated
// Progressive and MAGA ballots exhaust: their reserved blocs do not cross over.
const SIX_PARTY_TRANSFERS = {
  dem: { ...RCV_PREFERENCES.dem, progressive: 0.32, maga: 0.01 },
  rep: { ...RCV_PREFERENCES.rep, progressive: 0.01, maga: 0.40 },
  lib: { ...RCV_PREFERENCES.lib, progressive: 0.05, maga: 0.12 },
  grn: { ...RCV_PREFERENCES.grn, progressive: 0.42, maga: 0.01 },
  ind: { dem: 0.4, rep: 0.4, lib: 0.1, grn: 0.1 },
};

export function scenarioRankedChoiceTally(firstChoice) {
  const partyIds = [...SIX_PARTY_IDS, ...(finite(firstChoice?.ind) > 0 ? ['ind'] : [])];
  const counts = (read) => Object.fromEntries(partyIds.map((party) => [party, read(party)]));
  const initial = counts((party) => Math.max(0, finite(firstChoice?.[party])));
  const packets = counts((party) => initial[party] ? [{ origin: party, votes: initial[party] }] : []);
  const tallies = { ...initial };
  const originalTotal = total(Object.values(tallies));
  let active = partyIds.filter((party) => tallies[party] > 0);
  let exhausted = 0;
  const rounds = [];
  const rank = () => [...active].sort((a, b) => tallies[b] - tallies[a] || partyIds.indexOf(a) - partyIds.indexOf(b));
  while (active.length > 1) {
    const ranked = rank();
    const continuing = originalTotal - exhausted;
    if (tallies[ranked[0]] > continuing / 2) {
      rounds.push({ tallies: { ...tallies }, eliminated: null, exhausted });
      break;
    }
    const eliminated = ranked.at(-1);
    rounds.push({ tallies: { ...tallies }, eliminated, exhausted });
    active = ranked.filter((party) => party !== eliminated);
    for (const { origin, votes } of packets[eliminated]) {
      const preferences = SIX_PARTY_TRANSFERS[origin];
      if (!preferences) {
        exhausted += votes;
        continue;
      }
      const denominator = total(active.map((party) => preferences[party] || 0));
      for (const party of active) {
        const share = denominator ? votes * (preferences[party] || 0) / denominator : votes / active.length;
        if (share <= 0) continue;
        tallies[party] += share;
        // Consolidate packets by first-choice origin so transfer work stays bounded.
        const packet = packets[party].find((item) => item.origin === origin);
        if (packet) packet.votes += share;
        else packets[party].push({ origin, votes: share });
      }
    }
    packets[eliminated] = [];
    tallies[eliminated] = 0;
  }
  const [winner = 'dem', runnerUp] = rank();
  const denominator = total(Object.values(tallies)) || 1;
  const shares = counts((party) => 100 * tallies[party] / denominator);
  return {
    winner, runnerUp: runnerUp || winner, margin: shares[winner] - (runnerUp ? shares[runnerUp] : 0),
    shares, finalTallies: tallies, rounds, exhausted, eliminated: partyIds.filter((party) => !active.includes(party)),
  };
}

/** Largest remainder for scenario ballot lines, with stable input order as a tie break. */
export function scenarioAllocateProportional(shares, seats, threshold = 5, exceptions = []) {
  const parties = Object.keys(shares);
  const awards = Object.fromEntries(parties.map((party) => [party, 0]));
  const ordered = parties.filter((party) => shares[party] > 0).sort((a, b) => shares[b] - shares[a]);
  if (!ordered.length || seats <= 0) return awards;
  const eligible = ordered.filter((party) => shares[party] >= threshold || exceptions.includes(party));
  if (!eligible.length) eligible.push(ordered[0]);
  const denominator = total(eligible.map((party) => shares[party]));
  const quotients = eligible.map((party) => {
    const value = shares[party] * seats / denominator;
    awards[party] = Math.floor(value);
    return { party, fraction: value % 1 };
  }).sort((a, b) => b.fraction - a.fraction || parties.indexOf(a.party) - parties.indexOf(b.party));
  const remaining = seats - total(Object.values(awards));
  for (const { party } of quotients.slice(0, remaining)) awards[party] += 1;
  return awards;
}
