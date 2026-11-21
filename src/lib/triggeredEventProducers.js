/**
 * Receipt-backed event provenance helpers.
 *
 * These helpers only validate and snapshot committed resolver output. They do
 * not create incidents, add evidence, or roll for a complication.
 */

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const isText = (value) => typeof value === 'string' && value.trim().length > 0;

function stableValue(value) {
  return Array.isArray(value)
    ? value.map(stableValue)
    : isObject(value)
      ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]))
      : value;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function cloneSerializable(value) {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return undefined;
  }
}

function readPath(path, receipt, game) {
  const [root, ...parts] = String(path || '').split('.');
  let value = root === 'payload' ? receipt?.payload : root === 'game' ? game : undefined;
  for (const part of parts) value = value?.[part];
  return value;
}

/** A fresh incident source must be a committed receipt from this campaign. */
export function isCommittedIncidentReceipt(receipt, game) {
  const campaignId = game?.build34CampaignId || game?.campaignId;
  return !!receipt?.id
    && receipt.sourceReceiptId === receipt.id
    && isText(receipt.incidentId)
    && receipt.provenanceVersion === 2
    && receipt.triggerEligible !== false
    && isText(receipt.campaignId)
    && isText(campaignId)
    && receipt.campaignId === campaignId
    && isText(receipt.sourceType)
    && isText(receipt.sourceId)
    && Number.isInteger(Number(receipt.week))
    && Number(receipt.week) >= 0
    && isText(receipt.recap)
    && isObject(receipt.payload);
}

export function triggeredEventStateId(receipt, definitionNumber) {
  if (definitionNumber === '062') return receipt?.payload?.promiseAttack?.abbr || null;
  return receipt?.stateId || receipt?.state || null;
}

/**
 * Pair a registered event with the exact committed source and a compact,
 * serializable snapshot of the fields its card is allowed to cite.
 */
export function produceTriggeredEventSource(receipt, game, definition) {
  if (!isCommittedIncidentReceipt(receipt, game) || !definition?.enabled || !definition.when?.(receipt, game)) return null;
  const fields = {};
  for (const fieldPath of definition.incidentDisplay?.evidenceFields || []) {
    const value = cloneSerializable(readPath(fieldPath, receipt, game));
    if (value !== undefined) fields[fieldPath] = value;
  }
  if (!Object.keys(fields).length) return null;

  const evidenceSnapshot = {
    receiptId: receipt.id,
    sourceType: receipt.sourceType,
    sourceWeek: Number(receipt.week),
    stateId: triggeredEventStateId(receipt, definition.number),
    recap: receipt.recap,
    fields,
  };
  return {
    campaignId: receipt.campaignId,
    incidentId: receipt.incidentId,
    sourceReceiptId: receipt.id,
    sourceType: receipt.sourceType,
    sourceWeek: Number(receipt.week),
    evidenceSnapshot,
  };
}

/**
 * Validate a saved event envelope against its source receipt before choice
 * resolution. Receipt fields are checked against their source; game-sourced
 * evidence is preserved as a snapshot because the current news card may change.
 */
export function validateTriggeredEventSource(eventOrEnvelope, receipt, game = null, evidenceFields = null, definitionNumber = null) {
  const envelope = eventOrEnvelope?.provenance || eventOrEnvelope;
  if (!isObject(envelope) || !isCommittedIncidentReceipt(receipt, game || { campaignId: receipt?.campaignId })) return false;
  if (eventOrEnvelope?.provenance && (
    eventOrEnvelope.campaignId !== envelope.campaignId
    || eventOrEnvelope.incidentId !== envelope.incidentId
    || eventOrEnvelope.sourceReceiptId !== envelope.sourceReceiptId
    || eventOrEnvelope.sourceType !== envelope.sourceType
    || Number(eventOrEnvelope.sourceWeek) !== Number(envelope.sourceWeek)
    || stableJson(eventOrEnvelope.evidenceSnapshot) !== stableJson(envelope.evidenceSnapshot)
  )) return false;
  const expectedCampaignId = game?.build34CampaignId || game?.campaignId || receipt.campaignId;
  if (envelope.campaignId !== expectedCampaignId
    || envelope.campaignId !== receipt.campaignId
    || envelope.incidentId !== receipt.incidentId
    || envelope.sourceReceiptId !== receipt.id
    || envelope.sourceType !== receipt.sourceType
    || Number(envelope.sourceWeek) !== Number(receipt.week)) return false;
  const snapshot = envelope.evidenceSnapshot;
  if (!isObject(snapshot)
    || snapshot.receiptId !== receipt.id
    || snapshot.sourceType !== receipt.sourceType
    || Number(snapshot.sourceWeek) !== Number(receipt.week)
    || snapshot.stateId !== triggeredEventStateId(receipt, definitionNumber)
    || snapshot.recap !== receipt.recap
    || !isObject(snapshot.fields)) return false;

  const paths = Object.keys(snapshot.fields);
  if (Array.isArray(evidenceFields)) {
    if (paths.some((path) => !evidenceFields.includes(path))) return false;
    for (const path of evidenceFields) {
      if (path.startsWith('game.')) {
        if (!Object.hasOwn(snapshot.fields, path)) return false;
      } else {
        const sourceValue = readPath(path, receipt, game);
        if ((sourceValue !== undefined) !== Object.hasOwn(snapshot.fields, path)) return false;
      }
    }
  }
  for (const [fieldPath, savedValue] of Object.entries(snapshot.fields)) {
    if (fieldPath.startsWith('payload.')) {
      if (stableJson(savedValue) !== stableJson(readPath(fieldPath, receipt, game))) return false;
    } else if (!fieldPath.startsWith('game.')) {
      return false;
    }
  }
  return true;
}

/**
 * Deprecated compatibility export. Modeled post-hoc incidents are disabled;
 * the receipt is returned untouched so old call sites cannot invent evidence.
 */
export function addSimulatedTriggeredEvidence(receipt) {
  return receipt;
}

/** @deprecated Use registered receipt predicates and produceTriggeredEventSource. */
export function simulatedTriggerEvidence() {
  return null;
}
