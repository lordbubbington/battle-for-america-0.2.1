import { TRADITIONAL_STAFF_SELECTION_COUNT } from '../data/traditionalStaffRoster.js';
import { createSeededRandom } from './seededRandom.js';

/** Preview only; the caller commits the result via the normal staff confirmation. */
/** @param {{campaignId?:string, previewRoll?:number, eligibleIds?:string[], count?:number}} [options] */
export function randomizeStaff({ campaignId, previewRoll, eligibleIds, count = TRADITIONAL_STAFF_SELECTION_COUNT } = {}) {
  if (typeof campaignId !== 'string' || !campaignId || !Number.isInteger(previewRoll) || previewRoll < 0 || !Array.isArray(eligibleIds)
    || !Number.isInteger(count) || count < 0 || eligibleIds.some((id) => typeof id !== 'string' || !id)) throw new Error('Invalid staff preview inputs.');
  const pool = [...new Set(eligibleIds)].filter((id) => id !== 'chief').sort();
  if (pool.length < count) throw new Error('Not enough eligible staff for a preview.');
  const random = createSeededRandom(`build38:staff:v1:${campaignId}:${previewRoll}`);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function staffWeeklyUpkeep() {
  return { totalM: 0, lines: [] };
}

/** Preserve historical receipts; baseExpensesM must exclude all staff charges. */
/** @param {{baseExpensesM?:number, historicalReceiptIds?:string[]}} [options] */
export function planBuild38StaffFinance({ baseExpensesM, historicalReceiptIds = [] } = {}) {
  if (!Number.isFinite(baseExpensesM) || baseExpensesM < 0 || !Array.isArray(historicalReceiptIds)) return { status: 'unavailable', reason: 'invalid-finance-input' };
  return { status: 'ready', expensesM: baseExpensesM, staffUpkeep: staffWeeklyUpkeep(), historicalReceiptIds: [...historicalReceiptIds] };
}

export function staffSetupDrawback(text) {
  return typeof text === 'string' ? text.replace(/\bHigh weekly upkeep;\s*/i, '') : text;
}
