import { BUILD39_CANDIDATES, BUILD39_VP_EXCLUDED_IDS } from '../data/build39Candidates.js';

export const BUILD39_FUNDS_ANCHORS = Object.freeze([
  Object.freeze({ corruption: 1, multiplier: 2 / 3 }),
  Object.freeze({ corruption: 10, multiplier: 1 }),
  Object.freeze({ corruption: 20, multiplier: 2 }),
]);

/** Piecewise-linear interpolation through the requested corruption/funds anchors. */
export function candidateStartingFunds(baselineM, corruption) {
  const baseline = Math.max(0, Number(baselineM) || 0);
  const rating = Math.min(20, Math.max(1, Number(corruption) || 10));
  const multiplier = rating <= 10
    ? 2 / 3 + ((rating - 1) / 9) * (1 / 3)
    : 1 + ((rating - 10) / 10);
  return Math.round(baseline * multiplier * 10) / 10;
}

/** Return additive presidential polling inputs in the native Build 38 units. */
export function candidateOpeningBonus(candidateId, stateId) {
  const candidate = BUILD39_CANDIDATES.find((item) => item.id === candidateId);
  if (!candidate) return { nat: 0, state: 0, region: {}, regionPoints: 0 };
  return {
    nat: candidate.nat,
    state: ('states' in candidate ? candidate.states?.[stateId] : 0) || 0,
    region: candidate.region || {},
    regionPoints: candidate.id === 'bernie-sanders' && ['CT','ME','MA','NH','RI','VT','NJ','NY','PA'].includes(stateId) ? 5 : 0,
  };
}

export function isBuild39VpEligible(id) {
  return !BUILD39_VP_EXCLUDED_IDS.includes(id);
}
