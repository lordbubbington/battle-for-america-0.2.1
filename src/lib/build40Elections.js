import { STATE_LIST, BASE_LEANS } from '@/data/states';
import {
  BUILD40_FOUR_PARTY_TRANSFER_POINTS,
  BUILD40_LEGACY_MODE_IDS,
  BUILD40_MODE_IDS,
  BUILD40_REGIONAL_AI_ONLY_PARTIES,
  BUILD40_REGIONAL_ALL_TARGETS,
  BUILD40_REGIONAL_PARTY_IDS,
  BUILD40_REGIONAL_PARTY_STATES,
  BUILD40_RESERVED_BLOC_POINTS,
  BUILD40_SIX_BASELINE_DEVIATION_FACTOR,
  BUILD40_SIX_CROSSOVER_POINTS,
  BUILD40_SIX_PARTY_IDS,
  BUILD40_SIX_TICKET_CANDIDATES,
  BUILD40_STATE_ELECTORATE_WEIGHTS,
} from '@/data/build40Elections';
import {
  FAVORITE_BALLOT_ACCESS,
  LEGACY_REGIONAL_PARTY_STATES,
  REGIONAL_021_HOME_DOWNBALLOT_SHARE,
  REGIONAL_CONFLICT_FLAG_THRESHOLD,
  REGIONAL_EXISTING_NOMINEES,
  REGIONAL_MAJOR_FLOOR,
} from '@/data/build39Scenarios';
import { voteUnits } from '@/lib/turnout';
import { DONORS } from '@/lib/voterFlow';

const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
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

function activeRegionalPartyIds(game) {
  if (game?.build39?.scenario?.legacyConservation) {
    return [...BUILD40_REGIONAL_PARTY_IDS, 'conservation'];
  }
  return BUILD40_REGIONAL_PARTY_IDS;
}

function targetForState(party, stateId, race) {
  const raw = BUILD40_REGIONAL_ALL_TARGETS[party]?.[stateId];
  if (raw === undefined) return undefined;
  if (raw === 'REP_REPLACE') return 'REP_REPLACE';
  if (race !== 'president' && (party === 'farmer-labor' || party === 'localist')) {
    // Preserve 0.2.1 downballot home-state target (40%) for FL and Boston Tea Party
    const flHome = ['MN', 'WI', 'MI', 'IA', 'ND', 'SD'];
    const btHome = ['ME', 'NH', 'VT', 'MA', 'RI', 'CT'];
    if ((party === 'farmer-labor' && flHome.includes(stateId)) || (party === 'localist' && btHome.includes(stateId))) {
      return REGIONAL_021_HOME_DOWNBALLOT_SHARE;
    }
  }
  return raw;
}

function allocateRegionalStateRaw({ stateId, race, base }) {
  const output = { ...base };
  const thirdParties = Object.keys(base).filter((p) => p !== 'dem' && p !== 'rep');
  const protectedThird = sum(thirdParties.map((p) => Math.max(0, finite(base[p]))));
  let dem = Math.max(0, finite(base.dem));
  let rep = Math.max(0, finite(base.rep));
  const demContests = dem > 0 || stateId === 'UT';
  const repContests = rep > 0;

  const eligible = BUILD40_REGIONAL_PARTY_IDS
    .map((party) => ({ party, target: targetForState(party, stateId, race) }))
    .filter(({ target }) => target !== undefined);

  if (!eligible.length) {
    return { shares: output, targets: {}, flaggedConflicts: [] };
  }

  const targets = {};
  const flaggedConflicts = [];
  let demFloor = demContests ? REGIONAL_MAJOR_FLOOR : 0;
  let repFloor = repContests ? REGIONAL_MAJOR_FLOOR : 0;

  // 1. MS / AL Southern Heritage Republican replacement (explicit exception to 5% Rep floor).
  for (const entry of eligible) {
    if (entry.target === 'REP_REPLACE') {
      targets[entry.party] = rep;
      output[entry.party] = rep;
      rep = 0;
      repFloor = 0;
    }
  }

  // 2. Utah explicit priority override: Deseret 61.7%, Rocky Mountain 10%, Dem 20%,
  //    protected third parties preserved, Rep receives the remainder (honoring 5% floor).
  const deseretEntry = eligible.find((e) => e.party === 'deseret');
  const otherEntries = eligible.filter((e) => e.target !== 'REP_REPLACE' && e.party !== 'deseret');

  if (stateId === 'UT' && demContests && repContests) {
    const desTarget = deseretEntry ? deseretEntry.target : 0;
    const otherSum = sum(otherEntries.map((e) => e.target));
    const desiredDem = 20;
    const maxNonFloor = Math.max(0, 100 - protectedThird - repFloor);
    const desiredTotal = desTarget + otherSum + desiredDem;
    let finalDem = desiredDem;
    let finalDes = desTarget;
    const finalOthers = Object.fromEntries(otherEntries.map((e) => [e.party, e.target]));
    if (desiredTotal > maxNonFloor + 1e-9) {
      const availForReg = Math.max(0, maxNonFloor - finalDem);
      const regReq = desTarget + otherSum;
      const scale = regReq > 0 ? availForReg / regReq : 1;
      finalDes = desTarget * scale;
      for (const e of otherEntries) finalOthers[e.party] = e.target * scale;
    }
    dem = finalDem;
    rep = Math.max(repFloor, 100 - protectedThird - finalDem - finalDes - sum(Object.values(finalOthers)));
    if (deseretEntry) {
      targets.deseret = finalDes;
      output.deseret = finalDes;
      if (Math.abs(finalDes - desTarget) >= REGIONAL_CONFLICT_FLAG_THRESHOLD) {
        flaggedConflicts.push({ stateId, party: 'deseret', intended: desTarget, actual: finalDes, diff: finalDes - desTarget });
      }
    }
    for (const e of otherEntries) {
      targets[e.party] = finalOthers[e.party];
      output[e.party] = finalOthers[e.party];
      if (Math.abs(finalOthers[e.party] - e.target) >= REGIONAL_CONFLICT_FLAG_THRESHOLD) {
        flaggedConflicts.push({ stateId, party: e.party, intended: e.target, actual: finalOthers[e.party], diff: finalOthers[e.party] - e.target });
      }
    }
  } else {
    // 3. Deseret funded strictly from Republicans, always honoring repFloor (5%).
    if (deseretEntry) {
      const availRepForDeseret = Math.max(0, rep - repFloor);
      const granted = Math.min(deseretEntry.target, availRepForDeseret);
      rep -= granted;
      targets.deseret = granted;
      output.deseret = granted;
      if (Math.abs(granted - deseretEntry.target) >= REGIONAL_CONFLICT_FLAG_THRESHOLD) {
        flaggedConflicts.push({ stateId, party: 'deseret', intended: deseretEntry.target, actual: granted, diff: granted - deseretEntry.target });
      }
    }

    // 4. All other regional parties: equal D/R draw with redirect when one hits its 5% floor.
    //    If total exceeds available D+R above floors (e.g. HI), honor 5% floors strictly and
    //    trim regional targets proportionally to fit available headroom; flag only if >= 10pp diff.
    if (otherEntries.length) {
      const availDem = Math.max(0, dem - demFloor);
      const availRep = Math.max(0, rep - repFloor);
      const availTotal = availDem + availRep;
      const reqTotal = sum(otherEntries.map((e) => e.target));
      const scale = reqTotal > availTotal + 1e-9 ? availTotal / reqTotal : 1;
      let grantedTotal = 0;
      for (const e of otherEntries) {
        const granted = e.target * scale;
        targets[e.party] = granted;
        output[e.party] = granted;
        grantedTotal += granted;
        if (Math.abs(granted - e.target) >= REGIONAL_CONFLICT_FLAG_THRESHOLD) {
          flaggedConflicts.push({ stateId, party: e.party, intended: e.target, actual: granted, diff: granted - e.target });
        }
      }
      const half = grantedTotal / 2;
      let takeDem = Math.min(availDem, half);
      let takeRep = Math.min(availRep, half);
      let rem = grantedTotal - takeDem - takeRep;
      if (rem > 1e-9) {
        const extraDem = Math.min(availDem - takeDem, rem);
        takeDem += extraDem;
        rem -= extraDem;
        const extraRep = Math.min(availRep - takeRep, rem);
        takeRep += extraRep;
        rem -= extraRep;
      }
      dem -= takeDem;
      rep -= takeRep;
    }
  }

  output.dem = dem;
  output.rep = rep;
  return { shares: output, targets, flaggedConflicts };
}

// Precompute national D/R opening rebalance shift per state so that in Regional
// Parties mode, Democrats and Republicans start even with each other nationally
// while strictly honoring all 5% floors, regional targets, protected third
// parties, and MS/AL/UT explicit overrides.
function computeRegionalMainPartyRebalance() {
  const LIB_BASE = 1.6;
  const GRN_BASE = 1.6;
  const LIB_PAY_DEM = DONORS.lib.dem;
  const LIB_PAY_REP = DONORS.lib.rep;
  const GRN_PAY_DEM = DONORS.grn.dem;
  const GRN_PAY_REP = DONORS.grn.rep;

  const states = {};
  let totalDemVotes = 0;
  let totalRepVotes = 0;
  for (const { abbr } of STATE_LIST) {
    const margin = BASE_LEANS[abbr] ?? 0;
    const raw = {
      dem: Math.max(0.2, 50 + margin / 2 - LIB_BASE * LIB_PAY_DEM - GRN_BASE * GRN_PAY_DEM),
      rep: Math.max(0.2, 50 - margin / 2 - LIB_BASE * LIB_PAY_REP - GRN_BASE * GRN_PAY_REP),
      lib: LIB_BASE,
      grn: GRN_BASE,
      ind: 0,
    };
    const base = cleanShares(raw);
    const alloc = allocateRegionalStateRaw({ stateId: abbr, race: 'president', base });
    const units = voteUnits(abbr);
    totalDemVotes += (alloc.shares.dem / 100) * units;
    totalRepVotes += (alloc.shares.rep / 100) * units;
    states[abbr] = { dem: alloc.shares.dem, rep: alloc.shares.rep, units };
  }

  const voteDiff = totalDemVotes - totalRepVotes; // positive => shift Dem -> Rep
  const neededShiftVotes = voteDiff / 2;
  const shifts = Object.fromEntries(STATE_LIST.map(({ abbr }) => [abbr, 0]));
  if (Math.abs(neededShiftVotes) < 1e-6) return Object.freeze(shifts);

  // Exclude explicit major-party override states (UT, MS, AL) from rebalance.
  const locked = new Set(['UT', 'MS', 'AL']);
  const dir = neededShiftVotes > 0 ? 1 : -1; // +1: take from Dem, give to Rep
  let remainingVotes = Math.abs(neededShiftVotes);

  for (let pass = 0; pass < 4 && remainingVotes > 1e-6; pass += 1) {
    const eligible = STATE_LIST.map(({ abbr }) => {
      if (locked.has(abbr)) return { abbr, capVotes: 0, units: 0 };
      const st = states[abbr];
      const curDem = st.dem - shifts[abbr];
      const curRep = st.rep + shifts[abbr];
      const availPts = dir > 0
        ? Math.max(0, curDem - REGIONAL_MAJOR_FLOOR)
        : Math.max(0, curRep - REGIONAL_MAJOR_FLOOR);
      return { abbr, capVotes: (availPts / 100) * st.units, units: st.units };
    }).filter((item) => item.capVotes > 1e-6);

    const totalCapVotes = sum(eligible.map((e) => e.capVotes));
    if (totalCapVotes <= 1e-6) break;
    const ratio = Math.min(1, remainingVotes / totalCapVotes);
    let movedVotes = 0;
    for (const item of eligible) {
      const moveVotes = item.capVotes * ratio;
      const movePts = (moveVotes / item.units) * 100;
      shifts[item.abbr] += dir * movePts;
      movedVotes += moveVotes;
    }
    remainingVotes -= movedVotes;
  }
  return Object.freeze(shifts);
}

export const REGIONAL_MAIN_PARTY_REBALANCE = computeRegionalMainPartyRebalance();

function applyRegionalOpening({ stateId, race, base, skipRebalance = false }) {
  const { shares, targets, flaggedConflicts } = allocateRegionalStateRaw({ stateId, race, base });

  // Apply the national D/R opening rebalance (Dem -> Rep shift in pts) while
  // strictly respecting both 5% floors.
  if (!skipRebalance && race === 'president' && REGIONAL_MAIN_PARTY_REBALANCE[stateId]) {
    const shift = REGIONAL_MAIN_PARTY_REBALANCE[stateId];
    if (shift > 0) {
      const actual = Math.min(shift, Math.max(0, shares.dem - REGIONAL_MAJOR_FLOOR));
      shares.dem -= actual;
      shares.rep += actual;
    } else if (shift < 0) {
      const actual = Math.min(-shift, Math.max(0, shares.rep - REGIONAL_MAJOR_FLOOR));
      shares.rep -= actual;
      shares.dem += actual;
    }
  }

  return { shares, targets, flaggedConflicts };
}

/** Normalize new and legacy mode values without changing any other save fields. */
export function normalizeBuild40Mode(modeId, game = null) {
  const savedScenario = game?.build39?.scenario?.id || game?.scenarioId;
  const savedMode = game?.build40?.modeId;
  const candidate = modeId || savedMode || (['six-party', 'regional-parties', 'favorite-sons-daughters'].includes(savedScenario) ? savedScenario : null) || game?.thirdMode || savedScenario;
  const favorite = candidate === 'favorite-sons-daughters'
    || (candidate === 'fringe' && savedScenario === 'favorite-sons-daughters');
  if (favorite) {
    return { modeId: 'favorite-sons-daughters', scenarioId: 'favorite-sons-daughters', thirdMode: 'fringe', legacyFavorite: true, legacyMode: true };
  }
  if (candidate === 'six-party') {
    // R01: Six Party Mode is legacy-only (preserved for resuming old saves).
    return { modeId: 'six-party', scenarioId: 'six-party', thirdMode: 'surge', legacyFavorite: false, legacyMode: true };
  }
  if (candidate === 'surge' || candidate === 'four-party' || candidate === 'four-parties') {
    return { modeId: 'four-parties', scenarioId: 'standard', thirdMode: 'surge', legacyFavorite: false, legacyMode: false };
  }
  if (candidate === 'off') {
    return { modeId: 'two-parties', scenarioId: 'standard', thirdMode: 'off', legacyFavorite: false, legacyMode: false };
  }
  if (candidate === 'two-party') return { modeId: 'two-parties', scenarioId: 'standard', thirdMode: 'fringe', legacyFavorite: false, legacyMode: false };
  if (candidate === 'regional-parties') {
    return { modeId: 'regional-parties', scenarioId: 'regional-parties', thirdMode: 'fringe', legacyFavorite: false, legacyMode: false };
  }
  if (BUILD40_MODE_IDS.includes(candidate)) {
    return {
      modeId: candidate,
      scenarioId: candidate === 'regional-parties' ? candidate : 'standard',
      thirdMode: candidate === 'four-parties' ? 'surge' : 'fringe',
      legacyFavorite: false,
      legacyMode: false,
    };
  }
  return { modeId: 'two-parties', scenarioId: 'standard', thirdMode: 'fringe', legacyFavorite: false, legacyMode: false };
}

/**
 * Apply the mode's shared opening ballot allocation to one state snapshot.
 */
export function applyBuild40Opening({ modeId = null, stateId = null, race = 'president', shares = {}, game = null, electorateWeightsByState = null, skipRebalance = false } = {}) {
  const normalizedMode = normalizeBuild40Mode(modeId, game).modeId;
  const base = cleanShares(shares);
  const electorateWeights = electorateWeightsByState || game?.build40?.openingElectorateByState || BUILD40_STATE_ELECTORATE_WEIGHTS;
  let output = { ...base };
  let reservedShares = {};
  let crossoverShares = {};
  let regionalTargets = {};
  let flaggedConflicts = [];
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
  } else if (normalizedMode === 'regional-parties') {
    const regional = applyRegionalOpening({ stateId, race, base, skipRebalance });
    output = regional.shares;
    regionalTargets = regional.targets;
    flaggedConflicts = regional.flaggedConflicts;
  }

  output = cleanShares(output);
  return {
    shares: output,
    reservedShares,
    crossoverShares,
    regionalTargets,
    flaggedConflicts,
    sixPartyShrinkage,
    nationalWeight: voteUnits(stateId) || electorateWeights[stateId] || 0,
  };
}

export function scenarioPartyIds(modeId, race = 'president', { playableOnly = false, game = null } = {}) {
  const mode = normalizeBuild40Mode(modeId, game).modeId;
  if (mode === 'six-party') return race === 'senate' ? [...BUILD40_SIX_PARTY_IDS, 'ind'] : [...BUILD40_SIX_PARTY_IDS];
  if (mode === 'regional-parties') {
    const regional = playableOnly
      ? BUILD40_REGIONAL_PARTY_IDS.filter((p) => !BUILD40_REGIONAL_AI_ONLY_PARTIES.includes(p))
      : activeRegionalPartyIds(game);
    return ['dem', 'rep', 'lib', 'grn', 'ind', ...regional];
  }
  if (mode === 'favorite-sons-daughters' && race === 'president') return ['dem', 'rep', 'lib', 'grn', 'ind', ...Object.keys(FAVORITE_BALLOT_ACCESS)];
  return mode === 'four-parties' ? ['dem', 'rep', 'lib', 'grn'] : ['dem', 'rep'];
}

export function scenarioBallotAccess(modeId, race, stateId, party) {
  const mode = normalizeBuild40Mode(modeId).modeId;
  if (mode === 'regional-parties') {
    if (BUILD40_REGIONAL_PARTY_STATES[party]) return BUILD40_REGIONAL_PARTY_STATES[party].includes(stateId);
    if (LEGACY_REGIONAL_PARTY_STATES[party]) return LEGACY_REGIONAL_PARTY_STATES[party].includes(stateId);
  }
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
    if (mode === 'six-party') {
      if (BUILD40_SIX_TICKET_CANDIDATES.progressive.includes(candidate?.id)) return 'progressive';
      if (BUILD40_SIX_TICKET_CANDIDATES.maga.includes(candidate?.id)) return 'maga';
    }
    if (mode === 'regional-parties' && role === 'president') {
      // Regional nominees reuse their designated existing major-party candidate
      // when listed in REGIONAL_EXISTING_NOMINEES, or their own scenario candidate.
      for (const [regParty, existingId] of Object.entries(REGIONAL_EXISTING_NOMINEES)) {
        if (candidate?.id === existingId && party === regParty) return regParty;
      }
    }
    return candidate?.party;
  };

  // In regional-parties mode, each regional party has exactly one designated presidential nominee.
  if (mode === 'regional-parties' && role === 'president' && BUILD40_REGIONAL_PARTY_IDS.includes(party)) {
    const existingId = REGIONAL_EXISTING_NOMINEES[party];
    const match = candidates.find((c) => c?.id === party)
      || (existingId ? candidates.find((c) => c?.id === existingId) : null);
    const eligible = match && !selected.has(match.id) ? [match] : [];
    return {
      candidates: eligible,
      selectedId: eligible[0]?.id || null,
      selectionChanged: !!selectedId && selectedId !== eligible[0]?.id,
    };
  }

  const eligible = candidates.filter((candidate) => {
    if (!candidate?.id || selected.has(candidate.id)) return false;
    const ticket = assignedTicket(candidate);
    if (role === 'vp' && VP_EXCLUDED.has(candidate.id)) return false;
    if (ticket !== party) return false;
    return true;
  });
  return {
    candidates: eligible,
    selectedId: eligible.some(({ id }) => id === selectedId) ? selectedId : eligible[0]?.id || null,
    selectionChanged: !!selectedId && !eligible.some(({ id }) => id === selectedId),
  };
}
