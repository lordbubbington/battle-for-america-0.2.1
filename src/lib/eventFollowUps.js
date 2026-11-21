/** Portable receipt-linked event continuation queue. */

const stableValue = (value) => Array.isArray(value)
  ? value.map(stableValue)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]))
    : value;
const stableJson = (value) => JSON.stringify(stableValue(value));

/** A claimed event cause must exist in the campaign's recorded history. */
export function eventContextMatches(event, contextReceipts = []) {
  const required = event?.requiredContext || {};
  const receipts = contextReceipts || [];
  if (required.incidentIds?.some((id) => !receipts.some((receipt) => receipt.id === id))) return false;
  if (required.actionIds?.some((id) => !receipts.some((receipt) => receipt.actionId === id))) return false;
  if (required.newsIds?.some((id) => !receipts.some((receipt) => receipt.newsId === id))) return false;
  if (required.issueIds?.some((id) => !receipts.some((receipt) => receipt.issueId === id))) return false;
  return true;
}

/** Queue a linked continuation exactly once, for the next campaign week. */
export function queueEventFollowUp({
  pendingFollowUps = [],
  deliveredChainIds = [],
  campaignId,
  chainId,
  starterEventId,
  choiceId,
  followUpEventId,
  week,
  starterReceipt,
  contextReceipt = null,
}) {
  if (!campaignId || !chainId || !starterEventId || !choiceId || !followUpEventId || !starterReceipt) {
    throw new Error('A follow-up requires campaign, chain, recorded starter receipt, choice, and continuation IDs');
  }
  if (!Number.isInteger(Number(week)) || Number(week) < 1) {
    throw new Error('A follow-up can only be queued from a valid campaign week');
  }
  const receiptFollowUps = starterReceipt.followUpEventIds || [];
  if (starterReceipt.eventId !== starterEventId || starterReceipt.choiceId !== choiceId ||
      !receiptFollowUps.includes(followUpEventId)) {
    throw new Error('Follow-up is not linked to this recorded starter choice');
  }
  const receiptId = `${campaignId}:${chainId}`;
  if (deliveredChainIds.includes(receiptId) || pendingFollowUps.some((entry) => entry.receiptId === receiptId)) {
    return { pendingFollowUps, queued: false, reason: 'already-queued-or-delivered' };
  }
  const entry = {
    receiptId,
    campaignId,
    chainId,
    starterEventId,
    choiceId,
    followUpEventId,
    queuedWeek: week,
    availableWeek: Number(week) + 1,
    contextReceipt,
  };
  return { pendingFollowUps: [...pendingFollowUps, entry], queued: true, entry };
}

/** Adapter convenience for the existing `choice.then = { event, delay }` shape. */
export function queueRecordedChoiceFollowUp({
  campaignId,
  starterEvent,
  choice,
  week,
  starterReceipt,
  pendingFollowUps = [],
  deliveredChainIds = [],
  contextReceipt = null,
}) {
  const link = choice?.then;
  if (!link?.event) return { pendingFollowUps, queued: false, reason: 'choice-has-no-follow-up' };
  if (Number(link.delay ?? 1) !== 1) throw new Error('Build 34 triggered chains must arrive in the next campaign week');
  const stableChoiceId = starterReceipt?.choiceId;
  if (!starterReceipt?.eventId || starterReceipt.eventId !== starterEvent?.id || !stableChoiceId) {
    throw new Error('A follow-up must match a recorded starter event and selected choice');
  }
  const selectedChoiceId = choice?.id ?? choice?.choiceId ?? choice?.label;
  if (!selectedChoiceId || selectedChoiceId !== stableChoiceId) {
    throw new Error('The recorded starter choice does not match the selected choice');
  }
  const receipt = {
    ...starterReceipt,
    followUpEventIds: [link.event],
  };
  return queueEventFollowUp({
    pendingFollowUps,
    deliveredChainIds,
    campaignId,
    chainId: `${starterEvent?.id}:${link.event}`,
    starterEventId: starterEvent?.id,
    choiceId: stableChoiceId,
    followUpEventId: link.event,
    week,
    starterReceipt: receipt,
    contextReceipt,
  });
}

/** Claim the due continuation before showing it so reloads cannot duplicate it. */
export function claimDueEventFollowUp({ pendingFollowUps = [], deliveredChainIds = [], week }) {
  const delivered = new Set(deliveredChainIds);
  const sorted = [...pendingFollowUps].sort((a, b) =>
    (Number(a.availableWeek) - Number(b.availableWeek)) || String(a.receiptId).localeCompare(String(b.receiptId)));
  const index = sorted.findIndex((entry) => Number(entry.availableWeek) <= Number(week) && !delivered.has(entry.receiptId));
  if (index < 0) return { pendingFollowUps, deliveredChainIds, claimed: null };
  const [claimed] = sorted.splice(index, 1);
  return {
    pendingFollowUps: sorted,
    deliveredChainIds: [...deliveredChainIds, claimed.receiptId],
    claimed,
  };
}

/** Stable fingerprint used by adapters to reject duplicate incident receipts. */
export function eventReceiptFingerprint(receipt) {
  const fields = {
    sourceType: receipt?.sourceType || '',
    sourceId: receipt?.sourceId || '',
    week: Number(receipt?.week) || 0,
    stateId: receipt?.stateId || '',
    incidentType: receipt?.incidentType || '',
  };
  return stableJson(fields);
}
