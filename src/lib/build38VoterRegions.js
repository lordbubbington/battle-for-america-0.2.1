import { IDEOLOGY_DISTRIBUTION } from '../data/build38VoterComposition.js';
import { POPULATION_BY_STATE } from '../data/build38Population.js';
import { REGION_MEMBERSHIP } from '../data/build38Regions.js';
import { createSeededRandom } from './seededRandom.js';

const IDEOLOGIES = IDEOLOGY_DISTRIBUTION.map((item) => item.id);
const TARGET = Object.fromEntries(IDEOLOGY_DISTRIBUTION.map(({ id, nationalShare }) => [id, nationalShare / 100]));
export const IDEOLOGY_SHOCK_SLOPE = Object.freeze({
  moderate: 1.5, liberal: 1.15, conservative: 1.15,
  'far left': 0.9, populistleft: 0.95, religiousleft: 0.85,
  religiousright: 0.85, populistright: 0.95, libertarian: 0.8,
});
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const sum = (values) => values.reduce((a, b) => a + b, 0);

export function buildVoterComposition({ populationByState = POPULATION_BY_STATE, baseIdeologyByState = {}, demographicsByState = {} } = {}) {
  const states = Object.keys(populationByState).sort();
  const totalPopulation = sum(states.map((state) => Number(populationByState[state]) || 0));
  if (!states.length || !totalPopulation || states.some((state) => !(Number(populationByState[state]) > 0))) throw new Error('Positive resident population is required for every modeled state');
  const raw = Object.fromEntries(states.map((state) => {
    const lean = Number(baseIdeologyByState[state]) || 0;
    const left = clamp(0.5 + Math.tanh(lean / 28) * 0.31, 0.12, 0.88);
    const moderate = clamp(0.12 + 0.12 * Math.exp(-Math.abs(lean) / 18), 0.12, 0.24);
    const wings = 1 - moderate;
    const sideTotals = { left: wings * left, right: wings * (1 - left), moderate };
    const buckets = {
      'far left': sideTotals.left * 0.34, populistleft: sideTotals.left * 0.30,
      religiousleft: sideTotals.left * 0.18, liberal: sideTotals.left * 0.18,
      moderate: sideTotals.moderate, religiousright: sideTotals.right * 0.326,
      conservative: sideTotals.right * 0.109, populistright: sideTotals.right * 0.348,
      libertarian: sideTotals.right * 0.217,
    };
    // These are ideology strata, distinct from demographic marginals/tags.
    return [state, buckets];
  }));
  // Iterative proportional fitting preserves state-specific geography while
  // making the population-weighted national marginals equal the design targets.
  for (let iteration = 0; iteration < 1200; iteration += 1) {
    const national = Object.fromEntries(IDEOLOGIES.map((id) => [id, 0]));
    states.forEach((state) => IDEOLOGIES.forEach((id) => { national[id] += raw[state][id] * populationByState[state] / totalPopulation; }));
    IDEOLOGIES.forEach((id) => {
      const factor = TARGET[id] / national[id];
      states.forEach((state) => { raw[state][id] *= factor; });
    });
    states.forEach((state) => {
      const total = sum(IDEOLOGIES.map((id) => raw[state][id]));
      IDEOLOGIES.forEach((id) => { raw[state][id] /= total; });
    });
  }
  const byState = Object.fromEntries(states.map((state) => [state, {
    ideology: Object.fromEntries(IDEOLOGIES.map((id) => [id, raw[state][id] * 100])),
    demographics: { ...(demographicsByState[state] || {}) },
  }]));
  const nationalShares = Object.fromEntries(IDEOLOGIES.map((id) => [id,
    states.reduce((total, state) => total + raw[state][id] * populationByState[state] / totalPopulation, 0) * 100,
  ]));
  return { byState, nationalShares, sourceStatus: 'modeled-ideology; demographic marginals passed through separately' };
}

/** Ideology-level D-minus-R response to the common national-environment shock. */
/** @param {{ideologyId?:string, nationalShockMargin?:number}} [options] */
export function ideologyResponse({ ideologyId, nationalShockMargin } = {}) {
  if (!Object.hasOwn(IDEOLOGY_SHOCK_SLOPE, ideologyId) || !Number.isFinite(nationalShockMargin)) {
    return { status: 'unavailable', reason: 'Known ideology and finite national shock are required.' };
  }
  return { status: 'ready', ideologyId, nationalShockMargin,
    signedMarginDelta: nationalShockMargin * IDEOLOGY_SHOCK_SLOPE[ideologyId],
    slope: IDEOLOGY_SHOCK_SLOPE[ideologyId], unit: 'D-minus-R margin points' };
}

const REGION_IDS = Object.keys(REGION_MEMBERSHIP).sort();

function assignmentSeed(campaignId, sequence) {
  const random = createSeededRandom(`build38:regions:v1:${campaignId}:${sequence}`);
  const ids = [...REGION_IDS];
  for (let i = ids.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return Object.fromEntries(REGION_IDS.map((id) => [id, ids.indexOf(id) < (sequence % 2 ? 5 : 4) ? 1 : -1]));
}

/** @param {{campaignId?:string, difficultyId?:string, playerParty?:string, states?:{abbr:string}[], scoreState?:(state:{abbr:string},delta:number)=>number}} [options] */
export function chooseRegionAssignment({ campaignId, difficultyId = 'medium', playerParty, states = [], scoreState = null } = {}) {
  if (!campaignId) throw new Error('campaignId is required for seeded regional direction');
  if (!['easy','medium','hard'].includes(difficultyId)) throw new Error(`Unsupported difficulty: ${difficultyId}`);
  if (!['dem','rep'].includes(playerParty) && typeof scoreState !== 'function') {
    return { status: 'unavailable', reason: 'A multiparty support-gap scorer is required to rank regional direction for this player party.' };
  }
  const candidates = Array.from({ length: 24 }, (_, index) => {
    const directionByRegion = assignmentSeed(campaignId, index);
    const stateDeltas = regionalPersuasion({ membership: REGION_MEMBERSHIP, directionByRegion, completedWeeks: 14, totalWeeks: 14 }).cumulativeMarginByState;
    const score = states.reduce((total, state) => total + (scoreState ? scoreState(state, stateDeltas[state.abbr] || 0) : (playerParty === 'rep' ? -(stateDeltas[state.abbr] || 0) : (stateDeltas[state.abbr] || 0))), 0);
    return { directionByRegion, score, index };
  }).sort((a, b) => a.score - b.score || a.index - b.index);
  const random = createSeededRandom(`build38:regions:v1:${campaignId}:difficulty:${difficultyId}`);
  const start = difficultyId === 'easy' ? 18 : difficultyId === 'hard' ? 0 : 9;
  const offset = difficultyId === 'medium' ? 6 : 6;
  const selected = candidates.slice(start, start + offset)[Math.floor(random() * offset)];
  return { status: 'ready', directionByRegion: selected.directionByRegion, selectedScore: selected.score, sampleCount: candidates.length, calibration: 'seeded-balanced-candidate-band' };
}

/** @param {{membership?:Record<string,readonly string[]>, directionByRegion?:Record<string,number>, completedWeeks?:number,totalWeeks?:number}} [options] */
export function regionalPersuasion({ membership = REGION_MEMBERSHIP, directionByRegion = {}, completedWeeks = 0, totalWeeks = 14 } = {}) {
  const weeks = clamp(Number(completedWeeks) || 0, 0, Math.max(0, Number(totalWeeks) || 14));
  const perRegion = 3 * weeks / Math.max(1, Number(totalWeeks) || 14);
  const cumulativeMarginByState = {};
  Object.entries(membership).forEach(([region, states]) => states.forEach((abbr) => {
    cumulativeMarginByState[abbr] = (cumulativeMarginByState[abbr] || 0) + (directionByRegion[region] || 0) * perRegion;
  }));
  Object.keys(cumulativeMarginByState).forEach((abbr) => { cumulativeMarginByState[abbr] = clamp(cumulativeMarginByState[abbr], -5, 5); });
  return { cumulativeMarginByState, completedWeeks: weeks, perRegion };
}

/** @param {{membership?:Record<string,readonly string[]>, directionByRegion?:Record<string,number>, completedWeeks?:number, priorAppliedWeek?:number,totalWeeks?:number}} [options] */
export function regionalPersuasionDelta({ membership = REGION_MEMBERSHIP, directionByRegion, completedWeeks, priorAppliedWeek = 0, totalWeeks = 14 } = {}) {
  const current = regionalPersuasion({ membership, directionByRegion, completedWeeks, totalWeeks }).cumulativeMarginByState;
  const prior = regionalPersuasion({ membership, directionByRegion, completedWeeks: priorAppliedWeek, totalWeeks }).cumulativeMarginByState;
  const states = new Set([...Object.keys(current), ...Object.keys(prior)]);
  return { deltaMarginByState: Object.fromEntries([...states].map((state) => [state, (current[state] || 0) - (prior[state] || 0)])), appliedWeek: clamp(completedWeeks, 0, totalWeeks) };
}

export { IDEOLOGIES as BUILD38_IDEOLOGY_IDS };
export { REGION_MEMBERSHIP };
