import { createSeededRandom } from './seededRandom.js';
import { validateSavedEventCadence } from './eventCadence.js';

export const EVENT_CADENCE_SCHEMA_VERSION = 2;
export const EVENT_CADENCE_V2_WEIGHTS = Object.freeze([
  Object.freeze({ count: 1, weight: 0.1 }),
  Object.freeze({ count: 2, weight: 0.3 }),
  Object.freeze({ count: 3, weight: 0.6 }),
]);
const stableValue = (value) => Array.isArray(value) ? value.map(stableValue)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]))
    : value;

/** @param {{campaignId?: string, week?: number, totalWeeks?: number, actionSlots?: number}} options */
function inputs({ campaignId, week, totalWeeks, actionSlots = 7 }) {
  if (typeof campaignId !== 'string' || !campaignId || !Number.isInteger(week) || week < 1
    || !Number.isInteger(totalWeeks) || totalWeeks < 1 || week > totalWeeks
    || !Number.isInteger(actionSlots) || actionSlots < 0) throw new Error('Invalid event cadence inputs');
  return { campaignId, week, totalWeeks, actionSlots };
}

function checkpoints(count, slots) {
  if (count === 0) return [];
  if (count === 1) return [0];
  if (count === 2) return [0, Math.min(3, slots)];
  if (count === 3) return [0, Math.min(3, slots), slots];
  // The live Build 35 dispatcher uses [0, 3, 4, 6, 7] with seven actions.
  if (count === 5) return [0, Math.round(slots * 3 / 7), Math.round(slots * 4 / 7), Math.round(slots * 6 / 7), slots];
  throw new Error('Unsupported event count');
}

export function weeklyEventCountV2(options) {
  const { campaignId, week, totalWeeks } = inputs(options);
  if (week === 1) return 0;
  if (week === totalWeeks) return 5;
  const roll = createSeededRandom(`${campaignId}:${week}:event-count`)();
  return roll < 0.1 ? 1 : roll < 0.4 ? 2 : 3;
}

function newSchedule(options) {
  const { campaignId, week, totalWeeks, actionSlots } = inputs(options);
  const count = weeklyEventCountV2({ campaignId, week, totalWeeks, actionSlots });
  return {
    schemaVersion: EVENT_CADENCE_SCHEMA_VERSION,
    campaignId, week, count,
    events: checkpoints(count, actionSlots).map((after, index) => ({
      sequence: index + 1,
      releaseAfterActionCount: after,
      afterNews: after === 0,
      afterFinalAction: after === actionSlots && index === count - 1,
    })),
    seedKey: `${campaignId}:${week}:event-count`,
  };
}

/**
 * Preserve an already-saved cadence under its original validation rules.
 * @param {{campaignId?: string, week?: number, totalWeeks?: number, actionSlots?: number, savedSchedule?: any}} [options]
 */
export function planWeeklyEventCadence(options = {}) {
  const validated = inputs(options);
  const saved = options.savedSchedule;
  if (saved === null || saved === undefined) return { schedule: newSchedule(validated), reused: false };
  if (saved.schemaVersion === undefined || saved.schemaVersion === 1) {
    const result = validateSavedEventCadence({ ...validated, savedSchedule: saved });
    if (!result.valid) throw new Error(`Invalid legacy event cadence: ${result.errors.join('; ')}`);
  } else if (saved.schemaVersion === EVENT_CADENCE_SCHEMA_VERSION) {
    const expected = newSchedule(validated);
    if (JSON.stringify(stableValue(saved)) !== JSON.stringify(stableValue(expected))) throw new Error('Invalid saved version 2 event cadence');
  } else {
    throw new Error('Unsupported event cadence schema version');
  }
  return { schedule: structuredClone(saved), reused: true };
}

/** Engine-owned legacy decision schedules are retained byte-for-byte through JSON. */
export function preserveLegacyDecisionSchedule(schedule, actionSlots = 7) {
  if (!Array.isArray(schedule) || !Number.isInteger(actionSlots) || actionSlots < 0) throw new Error('Invalid saved decision schedule');
  let previous = -1;
  for (const entry of schedule) {
    const after = entry?.afterActions;
    if (!entry || !entry.id || !Number.isInteger(after) || after < previous || after < 0 || after > actionSlots) throw new Error('Invalid saved decision checkpoint');
    previous = after;
  }
  return structuredClone(schedule);
}

/**
 * Only a real eligible queue entry can occupy a decision checkpoint.
 * @param {{cadence?: any, actionsCompleted?: number, shownSequences?: number[], eligibleQueue?: any[]}} [options]
 */
export function nextEligibleDecision({ cadence, actionsCompleted, shownSequences = [], eligibleQueue = [] } = {}) {
  if (!cadence || !Array.isArray(cadence.events) || !Array.isArray(eligibleQueue)) throw new Error('Cadence and eligible queue are required');
  const shown = new Set(shownSequences);
  const checkpoint = cadence.events.find((item) => !shown.has(item.sequence) && item.releaseAfterActionCount <= actionsCompleted);
  const entry = eligibleQueue.find((item) => item?.event?.id && Array.isArray(item.event.choices) && item.event.choices.length > 0);
  return checkpoint && entry ? { checkpoint, entry } : null;
}
