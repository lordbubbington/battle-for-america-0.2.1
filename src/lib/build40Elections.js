import { BUILD40_FOUR_PARTY_TRANSFER_POINTS, BUILD40_LEGACY_MODE_IDS, BUILD40_MODE_IDS, BUILD40_REGIONAL_PARTY_IDS, BUILD40_REGIONAL_PARTY_STATES, BUILD40_RESERVED_BLOC_POINTS, BUILD40_SIX_BASELINE_DEVIATION_FACTOR, BUILD40_SIX_CROSSOVER_POINTS, BUILD40_SIX_PARTY_IDS, BUILD40_SIX_TICKET_CANDIDATES, BUILD40_STATE_ELECTORATE_WEIGHTS } from '@/data/build40Elections';
import { FAVORITE_BALLOT_ACCESS } from '@/data/build39Scenarios';

const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const sum = (values) => values.reduce((total, value) => total + value, 0);

function cleanShares(shares = {}) {
  const clean = Object.fromEntries(Object.entries(shares).map(([party, value]) => [party, Math.max(0, finite(value))]));
  const total = sum(Object.values(clean));
  if (!total) return { dem: 50, rep: 50 };
  return Object.fromEntries(Object.entries(clean).map(([party, value]) => [party, value * 100 / total]));
}

function apportion(totalPoints, weights, parties) {
  const positive = parties.map((party) => Math.max(0, finite(weights?.[party])));
  const denominator = sum(positive) || parties.length;
  return Object.fromEntries(parties.map((party, index) => [party,
    totalPoints * ((sum(positive) ? positive[index] : 1) / denominator),
  ]));
}

function reservedSixParty(game, stateId) {
  const recorded = game?.build40?.exclusiveByState?.[stateId]
    || game?.build39?.scenario?.exclusiveByState?.[stateId];
  if (!recorded) return apportion(BUILD40_RESERVED_BLOC_POINTS, { progressive: 15, maga: 16 }, ['progressive', 'maga']);
  return apportion(BUILD40_RESERVED_BLOC_POINTS, recorded, ['progressive', 'maga']);
}

function isRegionalBallot(modeId, race, party, stateId) {
  return modeId === 'regional-parties' && BUILD40_REGIONAL_PARTY_STATES[party]?.includes(stateId);
}

function applyRegionalOpening({ stateId, race, base, electorateWeights = BUILD40_STATE_ELECTORATE_WEIGHTS }) {
  const eligible = BUILD40_REGIONAL_PARTY_IDS.filter((party) => isRegionalBallot('regional-parties', race, party, stateId));
  if (!eligible.length) return { shares: base, targets: {} };

  const highest = Math.max(...Object.values(base));
  const minimumToTie = highest / (1 + highest / 100);
  // Aim near 10% nationally, with a quarter-point cushion for turnout differences.
  // The tie floor keeps each presidential home-region ticket competitive.
  const allWeight = sum(Object.values(electorateWeights));
  const homeWeight = sum(BUILD40_REGIONAL_PARTY_IDS.flatMap((party) => BUILD40_REGIONAL_PARTY_STATES[party])
    .map((state) => electorateWeights[state] || 0));
  const floor = race === 'president' ? 10.25 * allWeight / homeWeight : 40;
  const ceiling = race === 'president' ? Math.max(50, floor) : 50;
  const target = clamp(Math.max(floor, minimumToTie), floor, ceiling);
  const targets = Object.fromEntries(eligible.map((party) => [party, target]));
  const totalRegional = sum(Object.values(targets));
  if (totalRegional >= 100) return { shares: base, targets: {} };
  const baselineTotal = sum(Object.values(base)) || 100;
  const remainder = 100 - totalRegional;
  const output = Object.fromEntries(Object.keys(base).map((party) => [party, base[party] * remainder / baselineTotal]));
  Object.assign(output, targets);
  return { shares: output, targets };
}

/** Normalize new and legacy mode values without changing any other save fields. */
export function normalizeBuild40Mode(modeId, game = null) {
  const savedScenario = game?.build39?.scenario?.id || game?.scenarioId;
  const savedMode = game?.build40?.modeId;
  const candidate = modeId || savedMode || (['six-party', 'regional-parties', 'favorite-sons-daughters'].includes(savedScenario) ? savedScenario : null) || game?.thirdMode || savedScenario;
  const favorite = BUILD40_LEGACY_MODE_IDS.includes(candidate)
    || (candidate === 'fringe' && savedScenario === 'favorite-sons-daughters');
  if (favorite) {
    return { modeId: 'favorite-sons-daughters', scenarioId: 'favorite-sons-daughters', thirdMode: 'fringe', legacyFavorite: true };
  }
  if (candidate === 'surge' || candidate === 'four-party') {
    return { modeId: 'four-parties', scenarioId: 'standard', thirdMode: 'surge', legacyFavorite: false };
  }
  if (candidate === 'off') {
    return { modeId: 'two-parties', scenarioId: 'standard', thirdMode: 'off', legacyFavorite: false };
  }
  if (candidate === 'two-party') return { modeId: 'two-parties', scenarioId: 'standard', thirdMode: 'fringe', legacyFavorite: false };
  if (candidate === 'six-party' || candidate === 'regional-parties') {
    return { modeId: candidate, scenarioId: candidate, thirdMode: candidate === 'six-party' ? 'surge' : 'fringe', legacyFavorite: false };
  }
  if (BUILD40_MODE_IDS.includes(candidate)) {
    return {
      modeId: candidate,
      scenarioId: candidate === 'six-party' || candidate === 'regional-parties' ? candidate : 'standard',
      thirdMode: candidate === 'four-parties' ? 'surge' : 'fringe',
      legacyFavorite: false,
    };
  }
  // Build 39 default saves used `fringe` for Standard; retain that baseline as
  // the new Two Parties mode when no explicit Build 40 mode is stored.
  return { modeId: 'two-parties', scenarioId: 'standard', thirdMode: 'fringe', legacyFavorite: false };
}

/**
 * Apply the mode's shared opening ballot allocation to one state snapshot.
 * Returns audit metrics alongside shares. `shares` should be the modeled
 * starting ballot before mode allocation; candidate and campaign effects that
 * are intentionally part of the opening snapshot should already be included.
 */
export function applyBuild40Opening({ modeId = null, stateId = null, race = 'president', shares = {}, game = null, electorateWeightsByState = null } = {}) {
  const normalizedMode = normalizeBuild40Mode(modeId, game).modeId;
  const base = cleanShares(shares);
  const electorateWeights = electorateWeightsByState || game?.build40?.openingElectorateByState || BUILD40_STATE_ELECTORATE_WEIGHTS;
  let output = { ...base };
  let reservedShares = {};
  let crossoverShares = {};
  let regionalTargets = {};
  let sixPartyShrinkage = null;

  if (normalizedMode === 'four-parties') {
    const shift = BUILD40_FOUR_PARTY_TRANSFER_POINTS;
    const transferDem = Math.min(shift, output.dem || 0);
    const transferRep = Math.min(shift, output.rep || 0);
    output.dem = Math.max(0, (output.dem || 0) - transferDem);
    output.rep = Math.max(0, (output.rep || 0) - transferRep);
    output.lib = (output.lib || 0) + transferDem;
    output.grn = (output.grn || 0) + transferRep;
  } else if (normalizedMode === 'six-party') {
    output = Object.fromEntries(BUILD40_SIX_PARTY_IDS.map((party) => [party, 0]));
    const inputParties = Object.keys(base).filter((party) => !['progressive', 'maga'].includes(party));
    const available = cleanShares(Object.fromEntries(inputParties.map((party) => [party, base[party]])));
    reservedShares = reservedSixParty(game, stateId);
    crossoverShares = { progressive: BUILD40_SIX_CROSSOVER_POINTS, maga: BUILD40_SIX_CROSSOVER_POINTS };
    const fixed = Object.fromEntries(['progressive', 'maga'].map((party) => [party,
      reservedShares[party] + crossoverShares[party] + finite(game?.build40?.openingBonusByParty?.[stateId]?.[party]),
    ]));
    const fixedTotal = sum(Object.values(fixed));
    const remainder = Math.max(0, 100 - fixedTotal);
    const baselinePartyIds = ['dem', 'rep', 'lib', 'grn'];
    const baselineScores = Object.fromEntries(baselinePartyIds.map((party) => [party, Math.max(0, finite(available[party]))]));
    const baselineScoreTotal = sum(Object.values(baselineScores)) || 1;
    const targetMean = remainder / baselinePartyIds.length;
    sixPartyShrinkage = BUILD40_SIX_BASELINE_DEVIATION_FACTOR;
    baselinePartyIds.forEach((party) => {
      const proportional = baselineScores[party] * remainder / baselineScoreTotal;
      output[party] = targetMean + (proportional - targetMean) * sixPartyShrinkage;
    });
    Object.entries(fixed).forEach(([party, value]) => { output[party] = value; });
    // Smooth only the four proportional tickets toward an equal split. The
    // reserved blocs, their crossover bonuses, and per-state/candidate input
    // stay explicit. The model applies this once at opening; later actions can
    // still move any ticket under their existing campaign rules.
  } else if (normalizedMode === 'regional-parties') {
    const regional = applyRegionalOpening({ stateId, race, base, electorateWeights });
    output = regional.shares;
    regionalTargets = regional.targets;
  }

  output = cleanShares(output);
  return {
    shares: output,
    reservedShares,
    crossoverShares,
    regionalTargets,
    sixPartyShrinkage,
    nationalWeight: electorateWeights[stateId] || 0,
  };
}

export function scenarioPartyIds(modeId, race = 'president', legacyScenarioId = null) {
  const mode = normalizeBuild40Mode(modeId).modeId;
  if (mode === 'six-party') return race === 'senate' ? [...BUILD40_SIX_PARTY_IDS, 'ind'] : [...BUILD40_SIX_PARTY_IDS];
  if (mode === 'regional-parties') return ['dem', 'rep', 'lib', 'grn', 'ind', ...BUILD40_REGIONAL_PARTY_IDS];
  if (mode === 'favorite-sons-daughters' && race === 'president') return ['dem', 'rep', 'lib', 'grn', 'ind', ...Object.keys(FAVORITE_BALLOT_ACCESS)];
  return mode === 'four-parties' ? ['dem', 'rep', 'lib', 'grn'] : ['dem', 'rep'];
}

export function scenarioBallotAccess(modeId, race, stateId, party) {
  const mode = normalizeBuild40Mode(modeId).modeId;
  if (mode === 'regional-parties' && BUILD40_REGIONAL_PARTY_STATES[party]) return BUILD40_REGIONAL_PARTY_STATES[party].includes(stateId);
  if (mode === 'favorite-sons-daughters' && FAVORITE_BALLOT_ACCESS[party]) {
    const favorite = FAVORITE_BALLOT_ACCESS[party];
    return race === 'president' && (favorite.home === stateId || favorite.neighbors.includes(stateId));
  }
  return scenarioPartyIds(mode, race).includes(party);
}

const VP_EXCLUDED = new Set(['reagan', 'fdr']);

/** Filter a ticket's roster, preserving valid saved selections where possible. */
export function eligibleBuild40Candidates({ modeId = null, party = null, candidates = [], selectedId = null, otherSelectedIds = [], role = 'president' } = {}) {
  const mode = normalizeBuild40Mode(modeId).modeId;
  const selected = new Set(otherSelectedIds.filter(Boolean));
  const assignedTicket = (candidate) => {
    if (mode !== 'six-party') return candidate?.party;
    if (BUILD40_SIX_TICKET_CANDIDATES.progressive.includes(candidate?.id)) return 'progressive';
    if (BUILD40_SIX_TICKET_CANDIDATES.maga.includes(candidate?.id)) return 'maga';
    return candidate?.party;
  };
  const eligible = candidates.filter((candidate) => {
    if (!candidate?.id || selected.has(candidate.id)) return false;
    const ticket = assignedTicket(candidate);
    if (role === 'vp' && VP_EXCLUDED.has(candidate.id)) return false;
    if (ticket !== party) return false;
    if (mode === 'regional-parties' && BUILD40_REGIONAL_PARTY_IDS.includes(party) && !BUILD40_REGIONAL_PARTY_STATES[party]) return false;
    return true;
  });
  return {
    candidates: eligible,
    selectedId: eligible.some(({ id }) => id === selectedId) ? selectedId : eligible[0]?.id || null,
    selectionChanged: !!selectedId && !eligible.some(({ id }) => id === selectedId),
  };
}

