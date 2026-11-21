import { createSeededRandom } from './seededRandom.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Rally effects use actor-relative native state-modifier points. */
export function resolveRallyEffect({ electoralVotes = 5, smallStateMultiplier = 1.75 } = {}) {
  return {
    turnoutMultiplier: electoralVotes < 5 ? smallStateMultiplier : 1,
    persuasionPoints: 0.1,
    persuasionUnit: 'native state margin points',
  };
}

/**
 * A policy change can move the actor's native poll margin by at most half a
 * point. More extreme moves increase the chance of a backlash.
 */
/** @param {{campaignId?:string,sequence?:number,issueId?:string,from?:number,to?:number}} [input] */
export function resolvePolicyEffect({ campaignId, sequence, issueId, from, to } = {}) {
  const before = Number(from);
  const after = Number(to);
  if (!campaignId || !Number.isInteger(sequence) || !issueId || !Number.isFinite(before) || !Number.isFinite(after)) {
    return { status: 'unavailable', reason: 'invalid-input', pollPoints: 0, backlashRisk: 0 };
  }
  if (before === after) return { status: 'ready', pollPoints: 0, backlashRisk: 0, backlash: false };

  const distance = Math.abs(after - before);
  const extremeDistance = Math.abs(after - 1);
  const maximumDistance = Math.max(1, 2);
  const backlashRisk = clamp(0.2 + 0.55 * (extremeDistance / maximumDistance), 0.2, 0.75);
  const random = createSeededRandom(['build39:policy:v1', campaignId, sequence, issueId, before, after].join(':'));
  const backlash = random() < backlashRisk;
  const magnitude = 0.1 + random() * 0.4;
  const movement = backlash ? -magnitude : magnitude;
  return {
    status: 'ready',
    pollPoints: clamp(movement, -0.5, 0.5),
    backlashRisk,
    backlash,
    movementDistance: distance,
    unit: 'actor-relative native poll margin points',
  };
}

