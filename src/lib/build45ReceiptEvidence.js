import { STATE_BY_ABBR } from '../data/states.js';
import { isCommittedIncidentReceipt } from './triggeredEventProducers.js';

// Frozen live Build 44 catalog receipt routes, verified against all 100 mapped
// interruption IDs by data-matrix.mjs. Authored draw conversions stay draws.
const RECEIPT_NUMBERS = new Set('001 002 003 004 005 006 007 008 009 010 012 013 014 015 019 020 021 022 026 029 032 033 034 035 038 039 042 044 048 049 061 062 065 068 071 072 073 074 075 076 077 078 079 081 082 083 084 086 087 088 090 093 094 095 096 097 098 099 100'.split(' '));
export const build45ReceiptDependentEvent = (id) => RECEIPT_NUMBERS.has(id?.match(/^interrupt-(\d+)-/)?.[1]);
const canonical = (value) => JSON.stringify(value, function (_key, item) {
  return item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item;
});
const evidenceOf = (receipt) => ({ id: receipt.id, campaignId: receipt.campaignId,
  sourceType: receipt.sourceType, sourceId: receipt.sourceId, week: receipt.week,
  stateId: receipt.stateId || receipt.state, payload: receipt.payload });

/** Selection-time freshness. Pending choices use their saved selection week. */
export function build45ReceiptWindow(game, id, receipt, { selectionWeek = game.week, stateId = null, evidence = null } = {}) {
  if (!build45ReceiptDependentEvent(id)) return true;
  if (!isCommittedIncidentReceipt(receipt, game) || !Number.isInteger(selectionWeek)
    || !Number.isInteger(receipt.week) || receipt.week > selectionWeek || selectionWeek - receipt.week > 1) return false;
  const sourceState = receipt.stateId || receipt.state;
  if (sourceState && (!STATE_BY_ABBR[sourceState] || (receipt.state && receipt.state !== sourceState)
    || (stateId && stateId !== sourceState))) return false;
  if (stateId && !STATE_BY_ABBR[stateId]) return false;
  return !evidence || canonical(evidenceOf(receipt)) === canonical(evidence);
}
