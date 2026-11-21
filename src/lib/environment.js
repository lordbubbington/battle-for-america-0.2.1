// State environments: the generic ballot, state by state.
//
// The presidential map is not the only map moving. Every state carries its own
// generic-ballot environment — the number a House or Senate race there is
// actually running against — and it moves on its own weather:
//
//   * local news moves it harder than anything the campaign does;
//   * a rally moves it half as much as it moves the top of the ticket, and a
//     quarter as much where the House or Senate race is already inside five
//     points, because those voters are drowning in ads and mail already;
//   * a national story lands in all fifty states at once, unevenly.
//
// The national environment is then pulled around by the average of all of them.

import { BASE_LEANS, STATES, leansForNational } from '@/data/states';
import { ballotsInState, modeledIssueFit } from '@/lib/syntheticElectorate';

const round2 = (v) => Math.round(v * 100) / 100;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// A downballot race inside five points is a saturated race.
export const CLOSE_RACE = 5;
// What a rally is worth on the generic ballot, relative to the top line.
export const RALLY_GENERIC = 0.5;
export const RALLY_GENERIC_CLOSE = 0.25;
// Local news is not filtered through a candidate's message: it lands at full
// weight on the generic ballot.
export const LOCAL_NEWS_GENERIC = 1.4;
// Environments settle back toward the state's own lean every week.
export const GENERIC_DECAY = 0.94;

export function genericIn(abbr, game) {
  return game?.stateGeneric?.[abbr] || 0;
}

// Mutates the copy it is handed, the way the rest of the engine does.
export function addGeneric(game, abbr, amount) {
  if (!abbr || !amount || !isFinite(amount)) return game;
  game.stateGeneric = { ...(game.stateGeneric || {}) };
  game.stateGeneric[abbr] = round2(clamp((game.stateGeneric[abbr] || 0) + amount, -30, 30));
  game.natGeneric = genericAverage(game);
  return game;
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
export function applyNationalGenericSwing(game, amount, issueId = null) {
  const target = Number(amount);
  if (!Number.isFinite(target) || !target) return game;
  const beforeAverage = genericAverage(game);
  const pov = game.party === 'rep' ? -1 : 1;
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
      value: game.stateGeneric?.[state.abbr] ?? game.startingNationalGeneric ?? 0,
    };
  });
  const totalPopulation = electorate.reduce((sum, state) => sum + state.population, 0) || 1;
  const active = new Set(electorate.map((state) => state.abbr));
  let remaining = target;
  const values = { ...(game.stateGeneric || {}) };

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

  // Rounding at the state level leaves at most a small national residue; place
  // it in a state with room so the electorate-weighted change stays exact.
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

  game.stateGeneric = values;
  game.natGeneric = genericAverage(game);
  const stateAdjustments = Object.fromEntries(electorate.map((state) => [
    state.abbr,
    Math.round(((values[state.abbr] ?? state.value) - state.value) * 1000) / 1000,
  ]));
  game.genericSwingDiagnostics = [
    ...(game.genericSwingDiagnostics || []),
    {
      week: game.week || 0,
      issueId: issueId || null,
      requested: target,
      nationalApplied: Math.round((game.natGeneric - beforeAverage) * 1000) / 1000,
      stateAdjustments,
    },
  ].slice(-20);
  return game;
}

// The national generic ballot: the environment weighted by represented ballots.
export function genericAverage(game) {
  let sum = 0;
  let weight = 0;
  STATES.forEach((s) => {
    const ballots = ballotsInState(s.abbr) || s.ev;
    sum += genericIn(s.abbr, game) * ballots;
    weight += ballots;
  });
  return weight ? round2(sum / weight) : 0;
}

// Seed the state-level environments from the setup slider and its map tuning.
// The national value is passed explicitly; only randomness and hand-edited
// state offsets are retained from the presidential map. Centering those offsets
// keeps the state values useful without allowing candidate quality or the VP's
// map effects to change the starting national generic ballot.
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

  // Remove the last floating-point residue uniformly so the aggregate is exact
  // before genericAverage rounds it for display.
  const rawAverage = STATES.reduce((sum, state) => sum + stateGeneric[state.abbr] * (ballotsInState(state.abbr) || state.ev), 0) / (totalWeight || 1);
  const correction = target - rawAverage;
  STATES.forEach((state) => {
    stateGeneric[state.abbr] += correction;
  });
  return stateGeneric;
}

// One week older, and a little closer to where the state started.
export function decayGeneric(game) {
  const out = {};
  Object.entries(game.stateGeneric || {}).forEach(([abbr, value]) => {
    const next = round2(value * GENERIC_DECAY);
    if (Math.abs(next) >= 0.02) out[abbr] = next;
  });
  return out;
}

export function rallyGenericFactor(tight) {
  return tight ? RALLY_GENERIC_CLOSE : RALLY_GENERIC;
}
