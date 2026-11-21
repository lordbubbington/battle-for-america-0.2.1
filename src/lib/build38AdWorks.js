import { BUILD38_AD_WORKS_CHOICES } from '../data/build38AdWorksChoices.js';
import { createSeededRandom } from './seededRandom.js';
import { STATE_LIST } from '../data/states.js';

const VALID_STATE_IDS = new Set(STATE_LIST.map(({ abbr }) => abbr));
const CHOICE_ALIASES = Object.freeze({
  'repeat the spot': 'repeat-spot',
  'adapt it for a neighboring state': 'adapt-neighbor',
  'bank the win': 'bank-win',
});

function choiceIdFor(value) {
  const raw = String(value || '').trim();
  if (Object.hasOwn(BUILD38_AD_WORKS_CHOICES, raw)) return raw;
  return CHOICE_ALIASES[raw.toLowerCase()] || null;
}

function unavailable(reason, sourceReceiptId = null) {
  return { status: 'unavailable', reason, sourceReceiptId };
}

/** Mirror interrupt-021's evidence predicate against the actual committed ad receipt. */
export function isQualifyingAdWorksReceipt(sourceReceipt) {
  const payload = sourceReceipt?.payload;
  const result = payload?.result;
  return Boolean(
    sourceReceipt?.id
    && sourceReceipt.sourceType === 'advertisement'
    && sourceReceipt.triggerEligible !== false
    && (!sourceReceipt.sourceReceiptId || sourceReceipt.sourceReceiptId === sourceReceipt.id)
    && result
    && typeof result.abbr === 'string'
    && result.abbr === sourceReceipt.state
    && typeof payload.issueId === 'string'
    && payload.issueId.trim()
    && ['pro', 'attack'].includes(result.kind)
    && Number.isFinite(result.swing)
    && result.swing > 0
    && Number.isFinite(result.points)
    && result.points > 0
    && !result.backfire
    && Array.isArray(payload.states)
    && payload.states.includes(result.abbr)
    && VALID_STATE_IDS.has(result.abbr)
  );
}

/** Resolve the state from the committed ad; the old second-choice ID remains a catalog alias. */
/** @param {{choiceId?:string, sourceReceipt?:any}} [options] */
export function adWorksChoice({ choiceId, sourceReceipt } = {}) {
  const stableChoiceId = choiceIdFor(choiceId);
  if (!stableChoiceId) return unavailable('unknown-choice-id', sourceReceipt?.id || null);
  if (!isQualifyingAdWorksReceipt(sourceReceipt)) return unavailable('qualifying-favorable-ad-receipt-required', sourceReceipt?.id || null);
  return {
    status: 'ready',
    version: 1,
    choiceId: stableChoiceId,
    sourceReceiptId: sourceReceipt.id,
    stateId: sourceReceipt.payload.result.abbr,
    ...BUILD38_AD_WORKS_CHOICES[stableChoiceId],
  };
}

export function adWorksPersuasion(choice, campaignId) {
  if (!('minPoints' in choice)) return choice.points;
  const random = createSeededRandom(['build38:ad-works:v1', campaignId, choice.sourceReceiptId, choice.choiceId].join(':'));
  return uniformInteger(choice.minPoints, choice.maxPoints, random());
}

export function uniformInteger(min, max, draw) {
  return min + Math.floor(draw * (max - min + 1));
}
