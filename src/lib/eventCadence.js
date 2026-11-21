import { createSeededRandom } from './seededRandom.js';

/** Build 33 event frequency contract retained by Build 34. */
export const WEEKLY_EVENT_COUNT_WEIGHTS = Object.freeze([
  { count: 1, weight: 0.5 },
  { count: 2, weight: 0.3 },
  { count: 3, weight: 0.2 },
]);

function expectedReleaseCounts(count, slots) {
  if (count === 1) return [0];
  if (count === 2) return [0, Math.min(3, slots)];
  if (count === 3) return [0, Math.min(3, slots), slots];
  if (count === 5) {
    return Array.from({ length: count }, (_, index) => Math.round((index / (count - 1)) * slots));
  }
  return [];
}

export function weeklyEventCount({ campaignId, week, totalWeeks, firstEventWeek = 2 }) {
  const currentWeek = Number(week);
  const campaignWeeks = Number(totalWeeks);
  if (!campaignId || !Number.isInteger(currentWeek) || currentWeek < 1 ||
      !Number.isInteger(campaignWeeks) || campaignWeeks < 1 || currentWeek > campaignWeeks ||
      !Number.isInteger(firstEventWeek) || firstEventWeek < 1) {
    throw new Error('Event cadence needs a campaign ID and valid one-based week bounds');
  }
  if (currentWeek === campaignWeeks) return 5;
  if (currentWeek < firstEventWeek) return 0;
  const roll = createSeededRandom(`${campaignId}:${currentWeek}:event-count`)();
  if (roll < 0.5) return 1;
  if (roll < 0.8) return 2;
  return 3;
}

/**
 * Verify a persisted schedule before reusing it after a reload.
 * @param {{savedSchedule?: any, campaignId?: string, week?: number, totalWeeks?: number, actionSlots?: number}} [options]
 */
export function validateSavedEventCadence({
  savedSchedule,
  campaignId,
  week,
  totalWeeks,
  actionSlots = 7,
} = {}) {
  const errors = [];
  const slots = Number(actionSlots);
  if (!Number.isInteger(slots) || slots < 0) errors.push('Action slots must be a nonnegative integer');
  let expectedCount = null;
  try {
    expectedCount = weeklyEventCount({ campaignId, week, totalWeeks });
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  if (!savedSchedule || typeof savedSchedule !== 'object') {
    errors.push('Saved event cadence is missing');
  } else {
    if (savedSchedule.campaignId !== campaignId) errors.push('Saved cadence belongs to a different campaign');
    if (savedSchedule.week !== Number(week)) errors.push('Saved cadence belongs to a different week');
    if (expectedCount !== null && savedSchedule.count !== expectedCount) {
      errors.push('Saved cadence event count does not match the deterministic week count');
    }
    const expectedSeedKey = `${campaignId}:${week}:event-count`;
    if (savedSchedule.seedKey !== expectedSeedKey) errors.push('Saved cadence seed key does not match this campaign week');
    const expectedReleases = expectedCount === null || !Number.isInteger(slots) || slots < 0
      ? []
      : expectedReleaseCounts(expectedCount, slots);
    if (!Array.isArray(savedSchedule.events) || savedSchedule.events.length !== expectedReleases.length) {
      errors.push('Saved cadence event list does not match its expected count');
    } else {
      savedSchedule.events.forEach((event, index) => {
        const releaseAfterActionCount = expectedReleases[index];
        const expectedAfterFinalAction = index === expectedReleases.length - 1 && releaseAfterActionCount === slots;
        if (event?.sequence !== index + 1 ||
            event?.releaseAfterActionCount !== releaseAfterActionCount ||
            event?.afterNews !== (releaseAfterActionCount === 0) ||
            event?.afterFinalAction !== expectedAfterFinalAction) {
          errors.push(`Saved cadence checkpoint ${index + 1} does not match the action schedule`);
        }
      });
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Schedule modal events around the action loop. Event 1 follows the news beat;
 * normal event 2 waits until action 3; the final event follows the final action.
 * The last week spaces its five events across the whole action sequence.
 */
export function buildWeeklyEventCadence({ campaignId, week, totalWeeks, actionSlots = 7, savedSchedule = null }) {
  const slots = Number(actionSlots);
  if (!Number.isInteger(slots) || slots < 0) {
    throw new Error('Event cadence actionSlots must be a nonnegative integer');
  }
  const count = weeklyEventCount({ campaignId, week, totalWeeks });
  const releaseAfterAction = expectedReleaseCounts(count, slots);
  const schedule = {
    campaignId,
    week,
    count,
    events: releaseAfterAction.map((afterActionCount, index) => ({
      sequence: index + 1,
      releaseAfterActionCount: afterActionCount,
      afterNews: afterActionCount === 0,
      afterFinalAction: afterActionCount === slots && index === count - 1,
    })),
    seedKey: `${campaignId}:${week}:event-count`,
  };
  if (savedSchedule === null || savedSchedule === undefined) return schedule;
  const validation = validateSavedEventCadence({ savedSchedule, campaignId, week, totalWeeks, actionSlots: slots });
  if (!validation.valid) throw new Error(`Invalid saved Build 34 event cadence: ${validation.errors.join('; ')}`);
  return structuredClone(savedSchedule);
}

/** Return the next unshown scheduled event for the current action checkpoint. */
export function nextScheduledEvent(cadence, { actionsCompleted = 0, shownSequences = [] } = {}) {
  const shown = new Set(shownSequences);
  return (cadence?.events || []).find((event) =>
    !shown.has(event.sequence) && Number(event.releaseAfterActionCount) <= Number(actionsCompleted)) || null;
}
