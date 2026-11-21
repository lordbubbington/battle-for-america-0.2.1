// State environments: the generic ballot, state by state.
//
// 0.2.2 updates:
// - R02: Regional Parties mode ignores national-environment contributions
//   everywhere (starting state, news, events, coattails, decay).
// - R17/R18: Opening generic ballot is separated from presidential candidate
//   and VP effects, and week one (week === 0) blocks presidential-origin writes
//   to stateGeneric / natGeneric.
// - R19: From week two onward (week >= 1), gradual presidential coattails are
//   computed once per week from the non-coattail snapshot (baseStateGeneric)
//   so coattails never feed back into themselves.

import { BASE_LEANS, STATES, leansForNational } from '@/data/states';
import { ballotsInState, modeledIssueFit } from '@/lib/syntheticElectorate';

const round2 = (v) => Math.round(v * 100) / 100;
const round3 = (v) => Math.round(v * 1000) / 1000;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const CLOSE_RACE = 5;
export const RALLY_GENERIC = 0.5;
export const RALLY_GENERIC_CLOSE = 0.25;
export const LOCAL_NEWS_GENERIC = 1.4;
export const GENERIC_DECAY = 0.94;

// R19 initial design coefficients (uncalibrated starting parameters):
// R14/R19 calibrated coattail parameters (tuned from initial 0.20 / 3.0 / 0.25
// so strong 14-week campaign play + existing rallies can approach the ~5-point goal).
export const COATTAIL_COEFFICIENT = 0.35;
export const COATTAIL_STATE_CAP = 5.0;
export const COATTAIL_WEEKLY_STEP = 0.30;

export function isRegionalEnvironmentIgnored(game) {
  return game?.build40?.modeId === 'regional-parties'
    || game?.build39?.scenario?.id === 'regional-parties';
}

export function isWeekOneProtected(game) {
  return Number(game?.week || 0) === 0;
}

export function genericIn(abbr, game) {
  if (isRegionalEnvironmentIgnored(game)) return 0;
  return game?.stateGeneric?.[abbr] || 0;
}

export function baseGenericIn(abbr, game) {
  if (isRegionalEnvironmentIgnored(game)) return 0;
  if (game?.baseStateGeneric && Object.hasOwn(game.baseStateGeneric, abbr)) {
    return game.baseStateGeneric[abbr] || 0;
  }
  const total = game?.stateGeneric?.[abbr] || 0;
  const coattail = game?.coattailByState?.[abbr] || 0;
  return total - coattail;
}

export function coattailIn(abbr, game) {
  if (isRegionalEnvironmentIgnored(game)) return 0;
  return game?.coattailByState?.[abbr] || 0;
}

export function recomputeEffectiveGeneric(game) {
  if (isRegionalEnvironmentIgnored(game)) {
    game.baseStateGeneric = {};
    game.coattailByState = {};
    game.stateGeneric = {};
    game.natGeneric = 0;
    return game;
  }
  const base = game.baseStateGeneric || game.stateGeneric || {};
  const coattails = game.coattailByState || {};
  const next = {};
  STATES.forEach((s) => {
    const sum = (base[s.abbr] || 0) + (coattails[s.abbr] || 0);
    if (Math.abs(sum) >= 0.0001) {
      next[s.abbr] = round2(clamp(sum, -30, 30));
    }
  });
  game.stateGeneric = next;
  game.natGeneric = genericAverage(game);
  return game;
}

// Mutates the copy it is handed, the way the rest of the engine does.
// `source` tags whether a write originates from the presidential race (blocked
// during week 1 under R18) vs an independent generic source.
export function addGeneric(game, abbr, amount, { source = 'independent' } = {}) {
  if (!abbr || !amount || !isFinite(amount)) return game;
  if (isRegionalEnvironmentIgnored(game)) return game;
  if (source === 'presidential' && isWeekOneProtected(game)) return game;

  const base = { ...(game.baseStateGeneric || game.stateGeneric || {}) };
  base[abbr] = round2(clamp((base[abbr] || 0) + amount, -30, 30));
  game.baseStateGeneric = base;
  return recomputeEffectiveGeneric(game);
}

function issueAgreement(game, state, issueId) {
  if (issueId && Number.isFinite(game.stances?.[issueId])) {
    const value = modeledIssueFit(state.abbr, issueId, game.stances[issueId]);
    if (Number.isFinite(value)) return value;
  }
  const stances = game.stances || {};
  const fits = Object.entries(stances).map(([id, stance]) => modeledIssueFit(state.abbr, id, stance)).filter(Number.isFinite);
  return fits.length ? fits.reduce((sum, value) => sum + value, 0) / fits.length : 0.5;
}

/** Apply a national generic-ballot change and redistribute it without changing its weighted total. */
export function applyNationalGenericSwing(game, amount, issueId = null, { source = 'independent' } = {}) {
  const target = Number(amount);
  if (!Number.isFinite(target) || !target) return game;
  if (isRegionalEnvironmentIgnored(game)) return game;
  if (source === 'presidential' && isWeekOneProtected(game)) return game;

  const beforeAverage = genericAverage(game);
  const pov = game.party === 'rep' ? -1 : 1;
  const baseValues = { ...(game.baseStateGeneric || game.stateGeneric || {}) };
  const electorate = STATES.map((state) => {
    const population = ballotsInState(state.abbr) || state.ev || 1;
    const partisanFit = clamp(0.5 + pov * (game.leans?.[state.abbr] ?? BASE_LEANS[state.abbr] ?? 0) / 30, 0, 1);
    const agreement = clamp(issueAgreement(game, state, issueId), 0, 1);
    const alignment = 0.5 * partisanFit + 0.5 * agreement;
    const susceptibility = target > 0 ? alignment : 1 - alignment;
    return {
      abbr: state.abbr,
      population,
      susceptibility: Math.max(0.05, susceptibility),
      value: baseValues[state.abbr] ?? game.startingNationalGeneric ?? 0,
    };
  });
  const totalPopulation = electorate.reduce((sum, state) => sum + state.population, 0) || 1;
  const active = new Set(electorate.map((state) => state.abbr));
  let remaining = target;
  const values = { ...baseValues };

  for (let pass = 0; pass < electorate.length && Math.abs(remaining) >= 0.005; pass += 1) {
    const available = electorate.filter((state) => active.has(state.abbr));
    const weightedAverage = available.reduce((sum, state) => sum + state.population * state.susceptibility, 0) / totalPopulation;
    if (!weightedAverage) break;
    let appliedNational = 0;
    available.forEach((state) => {
      const requested = remaining * state.susceptibility / weightedAverage;
      const current = values[state.abbr] ?? state.value;
      const low = -30 - current;
      const high = 30 - current;
      const applied = Math.max(low, Math.min(high, requested));
      const stored = Math.round((current + applied) * 100) / 100;
      const realized = stored - current;
      values[state.abbr] = stored;
      appliedNational += realized * state.population / totalPopulation;
      if (stored <= -29.995 || stored >= 29.995) active.delete(state.abbr);
    });
    if (Math.abs(appliedNational) < 0.001) break;
    remaining = Math.round((remaining - appliedNational) * 1000) / 1000;
  }

  if (Math.abs(remaining) >= 0.005) {
    const fallback = electorate.find((state) => {
      const current = values[state.abbr] ?? state.value;
      return remaining > 0 ? current < 29.995 : current > -29.995;
    });
    if (fallback) {
      const current = values[fallback.abbr] ?? fallback.value;
      const correction = remaining * totalPopulation / fallback.population;
      values[fallback.abbr] = Math.round(Math.max(-30, Math.min(30, current + correction)) * 100) / 100;
    }
  }

  game.baseStateGeneric = values;
  recomputeEffectiveGeneric(game);
  const stateAdjustments = Object.fromEntries(electorate.map((state) => [
    state.abbr,
    Math.round(((values[state.abbr] ?? state.value) - state.value) * 1000) / 1000,
  ]));
  game.genericSwingDiagnostics = [
    ...(game.genericSwingDiagnostics || []),
    {
      week: game.week || 0,
      source,
      issueId: issueId || null,
      requested: target,
      nationalApplied: Math.round((game.natGeneric - beforeAverage) * 1000) / 1000,
      stateAdjustments,
    },
  ].slice(-20);
  return game;
}

// The national generic ballot: the environment weighted by represented ballots.
export function baseGenericAverage(game) {
  if (isRegionalEnvironmentIgnored(game)) return 0;
  let sum = 0;
  let weight = 0;
  STATES.forEach((s) => {
    const ballots = ballotsInState(s.abbr) || s.ev;
    sum += baseGenericIn(s.abbr, game) * ballots;
    weight += ballots;
  });
  return weight ? round2(sum / weight) : 0;
}

export function genericAverage(game) {
  if (isRegionalEnvironmentIgnored(game)) return 0;
  let sum = 0;
  let weight = 0;
  STATES.forEach((s) => {
    const ballots = ballotsInState(s.abbr) || s.ev;
    sum += (game?.stateGeneric?.[s.abbr] || 0) * ballots;
    weight += ballots;
  });
  return weight ? round2(sum / weight) : 0;
}

// R18: Seed the state-level environments from the setup slider and its map tuning,
// centered to within 0.01 of target, independent of candidate and VP choice.
export function initialGenericEnvironment(nationalValue, leans = BASE_LEANS) {
  const target = Number.isFinite(nationalValue) ? nationalValue : 0;
  const setupMap = leansForNational(target);
  const deviations = {};
  let weightedDeviation = 0;
  let totalWeight = 0;

  STATES.forEach((state) => {
    const value = (leans?.[state.abbr] ?? setupMap[state.abbr]) - setupMap[state.abbr];
    deviations[state.abbr] = value;
    const ballots = ballotsInState(state.abbr) || state.ev;
    weightedDeviation += value * ballots;
    totalWeight += ballots;
  });

  const meanDeviation = totalWeight ? weightedDeviation / totalWeight : 0;
  const stateGeneric = {};
  STATES.forEach((state) => {
    stateGeneric[state.abbr] = target + deviations[state.abbr] - meanDeviation;
  });

  const rawAverage = STATES.reduce((sum, state) => sum + stateGeneric[state.abbr] * (ballotsInState(state.abbr) || state.ev), 0) / (totalWeight || 1);
  const correction = target - rawAverage;
  STATES.forEach((state) => {
    stateGeneric[state.abbr] += correction;
  });
  return stateGeneric;
}

// Decay only the underlying non-coattail base generic environment so coattails
// are never decayed twice (R19).
export function decayGeneric(game) {
  if (isRegionalEnvironmentIgnored(game)) return {};
  const source = game.baseStateGeneric || game.stateGeneric || {};
  const out = {};
  Object.entries(source).forEach(([abbr, value]) => {
    const next = round2(value * GENERIC_DECAY);
    if (Math.abs(next) >= 0.02) out[abbr] = next;
  });
  return out;
}

// R19: Gradual presidential coattails from week two onward.
// Computes coattailTarget[s] = clamp(0.20 * (actual[s] - counterfactual[s]), -3, +3)
// and moves coattailByState[s] 25% toward target once per weekly boundary,
// using the non-coattail snapshot so coattails never feed back into themselves.
export function applyWeeklyPresidentialCoattails(game, { weekNumber, gapByState, coefficient = COATTAIL_COEFFICIENT, cap = COATTAIL_STATE_CAP, step = COATTAIL_WEEKLY_STEP }) {
  if (isRegionalEnvironmentIgnored(game)) return game;
  // Week 0 is the first playable week; coattails start when week two opens (weekNumber >= 1).
  if (Number(weekNumber) < 1) return game;
  // Do not apply major-party-axis coattails when a third party is the player in non-major modes.
  if (!['dem', 'rep'].includes(game?.party)) return game;

  const resolved = new Set(game.coattailResolvedWeeks || []);
  if (resolved.has(weekNumber)) return game;

  const prev = game.coattailByState || {};
  const next = {};
  const diagnostics = {};
  STATES.forEach((s) => {
    const gap = Number(gapByState?.[s.abbr]) || 0;
    const target = clamp(coefficient * gap, -cap, cap);
    const before = Number(prev[s.abbr]) || 0;
    const updated = round3(before + step * (target - before));
    if (Math.abs(updated) >= 0.0005) next[s.abbr] = updated;
    diagnostics[s.abbr] = { gap: round3(gap), target: round3(target), before: round3(before), after: updated };
  });

  game.coattailByState = next;
  resolved.add(weekNumber);
  game.coattailResolvedWeeks = [...resolved].sort((a, b) => a - b);
  game.lastCoattailDiagnostics = { week: weekNumber, states: diagnostics };
  return recomputeEffectiveGeneric(game);
}

export function rallyGenericFactor(tight) {
  return tight ? RALLY_GENERIC_CLOSE : RALLY_GENERIC;
}
