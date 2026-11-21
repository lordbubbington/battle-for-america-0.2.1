import { TRIGGERED_EVENT_BY_ID, TRIGGERED_EVENT_DEFINITIONS, validateTriggeredEventDefinitions } from '@/data/triggeredEvents';
import { produceTriggeredEventSource, validateTriggeredEventSource } from '@/lib/triggeredEventProducers';
import {
  RIVAL_INTERRUPTION_ONCE_KEY,
  isRivalInterruptionMarginEligible,
  legacyRivalInterruptionApplied,
  rivalInterruptionCommand,
  validRivalInterruptionDispatchProof,
  validRivalInterruptionSource,
} from '@/lib/rivalInterruptionRules';

const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const stableValue = (value) => Array.isArray(value)
  ? value.map(stableValue)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]))
    : value;
const sameValue = (a, b) => JSON.stringify(stableValue(a)) === JSON.stringify(stableValue(b));
const definitionFor = (event) => TRIGGERED_EVENT_DEFINITIONS.find((item) => item.onceKey === event?.onceKey);
const catalogValidation = validateTriggeredEventDefinitions(TRIGGERED_EVENT_DEFINITIONS);
if (!catalogValidation.valid) {
  throw new Error(`Invalid triggered-event catalog: ${catalogValidation.errors.join('; ')}`);
}

function evidenceWhy(definition, receipt, game) {
  const p = receipt.payload || {};
  if (definition.number === '001') {
    return 'The debate receipt records the answer “' + p.answer + '”, the recorded reply “' + p.reply + '”, and a ' + p.scandal.level + ' scandal.';
  }
  if (definition.number === '003') {
    return 'The debate recap records a +' + Number(p.answerScore).toFixed(1) + ' answer response and marks its clip as widely shared.';
  }
  if (definition.number === '005') {
    return 'The debate recap marks “' + p.answer + '” as evasive and records the exchange: “' + p.reply + '”.';
  }
  if (definition.number === '006') {
    return 'The debate receipt saved this exact promise: “' + p.promise.text + '”.';
  }
  if (definition.number === '007') {
    const reactions = Object.entries(p.groupShifts || {}).map(([group, shift]) => group + ' ' + (shift > 0 ? '+' : '') + shift).join(', ');
    return 'The debate recap records different movement among tracked groups: ' + reactions + '.';
  }
  if (definition.number === '010') {
    return 'The debate receipt records a ' + p.verdict + ' verdict and the answer “' + p.answer + '”.';
  }
  if (definition.number === '013') {
    const memoLine = p.eventText.match(/our candidate cannot be trusted with an unscripted lunch/)?.[0];
    return 'The initiating event “' + p.eventTitle + '” showed the memo line: “' + memoLine + '”. Your response to the first leak card was “' + p.choice + '”.';
  }
  if (definition.number === '015') {
    return 'The completed town hall receipt records this public moment: “' + p.actionReceipt.publicStopMoment.text + '” The campaign history includes each prompt and the selected response approach.';
  }
  if (definition.number === '019') {
    const spin = p.storySpin;
    return '“' + spin.storyHeadline + '” stayed at ' + Math.round(spin.salienceAfter) + ' salience after ' + spin.storyUpdates + ' recorded updates and your ' + spin.mode + ' response. The story is still prominent in ' + (spin.abbr || 'its state') + '.';
  }
  if (definition.number === '021') {
    const ad = p.result;
    return 'The ' + (ad.type || 'paid') + ' ad on ' + p.issueId + ' recorded a favorable ' + Number(ad.points).toFixed(1) + ' point turnout shift in ' + ad.abbr + '. This is turnout movement; the response does not add a polling bonus.';
  }
  if (definition.number === '022') {
    return 'The ad receipt records backfire in ' + receipt.state + ' on ' + p.issueId + ': ' + p.result.verdict + '.';
  }
  if (definition.number === '035') {
    const action = p.actionReceipt;
    return 'Your ' + action.stateName + ' recap records ' + action.stopFatigueBefore.toFixed(1) + ' prior stop-fatigue points after ' + action.playerAttention.toFixed(1) + ' recent campaign-attention points. This stop was ' + action.engagementDrop.toFixed(1) + '% less effective than it would have been without fatigue.';
  }
  if (definition.number === '062') {
    const attack = p.promiseAttack;
    return 'The opponent used the saved pledge “' + attack.pledgedPosition + '” against your current position “' + attack.currentPosition + '” in ' + attack.stateName + ', and the receipt records a ' + Number(attack.stateHit).toFixed(1) + ' point state effect.';
  }
  if (definition.number === '093') {
    const request = p.endorsementRequest;
    return request.leaderName + ' delayed its endorsement after a recorded concern about ' + request.policyConcern.issue.toLowerCase() + ' (policy fit ' + request.fit + '%, below its ' + request.minimumFit + '% threshold).';
  }
  if (definition.number === '073') {
    const story = p.rivalNewsIncident;
    const card = game.rivalIncidentNewsCard;
    return 'The published rival correction records ' + story.evidenceType + ': ' + story.evidence + ' The news card is ' + card.headline + '.';
  }
  if (definition.number === '072') {
    const move = p.neglectedStateMove;
    return 'The rival logged a ' + move.type + ' in ' + move.stateName + ': “' + move.moveText + '” Your recent campaign attention there was ' + Number(move.playerAttention).toFixed(1) + '.';
  }
  return receipt.recap;
}

function isRecordedRivalSource(receipt, game) {
  const recorded = game?.incidentLedger?.find((item) => item.id === receipt?.id);
  return Boolean(recorded && sameValue(recorded, receipt));
}

export function matchTriggeredEventDefinitions(receipt, game, usedOnceKeys = []) {
  if (!receipt?.id || !isText(receipt.recap) || !game) return [];
  const used = new Set([
    ...(Array.isArray(game.triggeredEventOnceKeys) ? game.triggeredEventOnceKeys : []),
    ...(Array.isArray(usedOnceKeys) ? usedOnceKeys : []),
  ]);
  return TRIGGERED_EVENT_DEFINITIONS.filter((definition) =>
    definition.enabled && !used.has(definition.onceKey)
    && (definition.number !== '072' || isRecordedRivalSource(receipt, game))
    && !!produceTriggeredEventSource(receipt, game, definition)
  );
}

export function responseEventForTriggeredReceipt(definition, receipt, game, source = null) {
  const provenance = source || produceTriggeredEventSource(receipt, game, definition);
  if (!definition?.enabled || !provenance || !isText(receipt?.recap)) return null;
  const why = evidenceWhy(definition, receipt, game);
  const choices = definition.choices.map((choice) => ({
    label: choice.label,
    detail: 'Recorded response: ' + choice.detail.replace(/^(and|to)\s+/i, '').replace(/^./, (letter) => letter.toUpperCase()) + '.',
    effects: { ...choice.effects },
    outcome: choice.outcome || 'The campaign selected “' + choice.label + '”. The initiating receipt remains attached to this response.',
  }));
  return {
    id: 'response-' + definition.id + '-' + receipt.id,
    title: definition.title,
    text: definition.triggerDescription,
    why,
    icon: definition.sourceTypes.includes('debate-answer') ? 'debate' : 'news',
    kicker: 'Recorded campaign interruption',
    tone: 'press',
    onceKey: definition.onceKey,
    receiptKey: receipt.id,
    receiptRecap: receipt.recap,
    campaignId: provenance.campaignId,
    incidentId: provenance.incidentId,
    sourceReceiptId: provenance.sourceReceiptId,
    sourceType: provenance.sourceType,
    sourceWeek: provenance.sourceWeek,
    evidenceSnapshot: provenance.evidenceSnapshot,
    provenance,
    choices,
  };
}

/** Return queue-compatible response records for all catalog entries evidenced by this receipt. */
export function triggeredResponsesForReceipt(receipt, game, usedOnceKeys = []) {
  return matchTriggeredEventDefinitions(receipt, game, usedOnceKeys).map((definition) => {
    const provenance = produceTriggeredEventSource(receipt, game, definition);
    return {
      ...provenance,
      receiptKey: receipt.id,
      receiptRecap: receipt.recap,
      event: responseEventForTriggeredReceipt(definition, receipt, game, provenance),
    };
  }).filter((item) => item.event);
}

/** Append only new receipt-backed responses, keeping the existing queue record shape. */
export function queueTriggeredEventResponses(receipt, game, queued = [], usedOnceKeys = []) {
  const responseKeyFor = (item) => item.responseKey || `${item.sourceReceiptId || item.receiptKey}:${item.event?.onceKey || item.event?.id}`;
  const previous = queued || [];
  const current = previous.filter((item) => {
    if (item.event?.onceKey !== RIVAL_INTERRUPTION_ONCE_KEY) return true;
    if (!Object.hasOwn(item.event.evidenceSnapshot?.fields || {}, 'payload.neglectedStateMove.sourceMargin')) return true;
    const age = Number(game?.week) - item.event.sourceWeek;
    return !Number.isInteger(age) || age <= definitionFor(item.event).trigger.maximumDelayWeeks;
  });
  const seenResponseKeys = new Set(current.map(responseKeyFor));
  const rivalQueued = current.some((item) => item.event?.onceKey === RIVAL_INTERRUPTION_ONCE_KEY);
  const additions = [];
  triggeredResponsesForReceipt(receipt, game, usedOnceKeys).forEach((item) => {
    const responseKey = responseKeyFor(item);
    if (seenResponseKeys.has(responseKey)) return;
    if (item.event.onceKey === RIVAL_INTERRUPTION_ONCE_KEY && rivalQueued) return;
    seenResponseKeys.add(responseKey);
    additions.push({ ...item, responseKey, onceKey: item.event.onceKey, queuedWeek: item.sourceWeek });
  });
  if (!additions.length) return current.length === previous.length ? previous : current;
  return [...current, ...additions];
}

/** A queued candidate can be legitimate before a required native effect has been applied. */
export function validateTriggeredEventCandidate(event, sourceReceipt, game = null) {
  const eventRecord = event?.event || event;
  const definition = definitionFor(eventRecord);
  if (!definition?.enabled
    || eventRecord.id !== `response-${definition.id}-${sourceReceipt?.id}`
    || eventRecord.receiptKey !== sourceReceipt?.id
    || eventRecord.onceKey !== definition.onceKey) return false;
  if (TRIGGERED_EVENT_BY_ID[definition.id] !== definition) return false;
  if (definition.number === '072' && (!isRecordedRivalSource(sourceReceipt, game) || !validRivalInterruptionSource(sourceReceipt, game))) return false;
  if (definition.number === '073') {
    const fields = eventRecord.provenance?.evidenceSnapshot?.fields || {};
    const story = sourceReceipt?.payload?.rivalNewsIncident;
    if (fields['game.rivalIncidentNewsCard.receiptId'] !== sourceReceipt?.id
      || fields['game.rivalIncidentNewsCard.rivalStoryId'] !== (story?.storyId || story?.id)
      || fields['game.rivalIncidentNewsCard.effectApplied'] !== true) return false;
  }
  return validateTriggeredEventSource(eventRecord, sourceReceipt, game, definition.incidentDisplay.evidenceFields, definition.number);
}

/** Integration hook for display and choice resolution. Event 072 needs applied proof. */
export function validateTriggeredEventProvenance(event, sourceReceipt, game = null) {
  const eventRecord = event?.event || event;
  if (!validateTriggeredEventCandidate(eventRecord, sourceReceipt, game)) return false;
  if (eventRecord.onceKey !== RIVAL_INTERRUPTION_ONCE_KEY || legacyRivalInterruptionApplied(sourceReceipt, game)) return true;
  const command = rivalInterruptionCommand(sourceReceipt);
  const proof = game?.build35RivalInterruptionEffect;
  const deadline = command.sourceWeek + definitionFor(eventRecord).trigger.maximumDelayWeeks;
  return validRivalInterruptionDispatchProof(proof, command, Math.min(Number(game?.week) + 1, deadline))
    && sameValue(eventRecord.dispatchReceipt, proof);
}

/**
 * Plan or verify the native effect for the scheduled checkpoint. This function
 * never changes game state. Replanning with committed proof returns a displayable event.
 * @param {{event?: any, sourceReceipt?: any, game?: any, currentMargin?: number}} [input]
 */
export function planTriggeredEventDispatch({ event, sourceReceipt, game, currentMargin } = {}) {
  const eventRecord = event?.event || event;
  const invalid = (reason) => ({ status: 'invalid', command: null, event: null, reason });
  const ready = (resolved) => ({ status: 'ready', command: null, event: resolved, reason: null });
  if (!validateTriggeredEventCandidate(eventRecord, sourceReceipt, game)) return invalid('invalid-event-source');
  if (eventRecord.onceKey !== RIVAL_INTERRUPTION_ONCE_KEY) return ready(eventRecord);
  const definition = definitionFor(eventRecord);
  const command = rivalInterruptionCommand(sourceReceipt);
  if (legacyRivalInterruptionApplied(sourceReceipt, game)) {
    return ready({ ...eventRecord, why: evidenceWhy(definition, sourceReceipt, game) + ' The recorded interruption moved your state margin 5 points against you.' });
  }
  const currentWeek = Number(game?.week) + 1;
  const deadline = command.sourceWeek + definition.trigger.maximumDelayWeeks;
  const proof = game?.build35RivalInterruptionEffect;
  if (proof) {
    if (!validRivalInterruptionDispatchProof(proof, command, Math.min(currentWeek, deadline))) {
      return invalid('invalid-or-already-applied-rival-interruption');
    }
    return ready({
      ...eventRecord,
      dispatchReceipt: { ...proof },
      why: evidenceWhy(definition, sourceReceipt, game) + ' The interruption moved your state margin 5 points against you.',
    });
  }
  if (!Number.isInteger(currentWeek) || currentWeek < command.sourceWeek || currentWeek > deadline) return invalid('outside-dispatch-window');
  if (!isRivalInterruptionMarginEligible(currentMargin)) return invalid('state-margin-outside-interruption-range');
  return { status: 'apply', command, event: null, reason: null };
}

/** Validate the exact catalog response and a choice before native resolution. */
/** @param {{event?: any, choice?: any, sourceReceipt?: any, game?: any}} [input] */
export function validateTriggeredEventResolution({ event, choice, sourceReceipt, game = null } = {}) {
  const eventRecord = event?.event || event;
  if (!validateTriggeredEventProvenance(eventRecord, sourceReceipt, game)) return false;
  const selectedId = typeof choice === 'string'
    ? choice
    : choice?.id || choice?.choiceId || choice?.label;
  if (!selectedId) return false;
  const definition = definitionFor(eventRecord);
  const canonicalChoice = definition.choices.find((candidate) =>
    (candidate.id || candidate.choiceId || candidate.label) === selectedId
  );
  if (!canonicalChoice) return false;
  return typeof choice === 'string'
    || sameValue(choice.effects, canonicalChoice.effects);
}

/** Plan one native choice resolution; persisted receipt IDs make retries inert. */
/** @param {{event?: any, choice?: any, sourceReceipt?: any, game?: any, appliedReceiptIds?: string[]}} [input] */
export function planTriggeredEventResolution({ event, choice, sourceReceipt, game = null, appliedReceiptIds = [] } = {}) {
  const eventRecord = event?.event || event;
  if (!validateTriggeredEventResolution({ event: eventRecord, choice, sourceReceipt, game })) {
    return { valid: false, reason: 'invalid-event-source-or-choice', receiptId: null, choice: null };
  }
  const definition = definitionFor(eventRecord);
  const selectedId = typeof choice === 'string' ? choice : choice.id || choice.choiceId || choice.label;
  const canonicalChoice = definition.choices.find((item) => (item.id || item.choiceId || item.label) === selectedId);
  const receiptId = `${eventRecord.campaignId}:triggered-event-choice:${definition.id}`;
  if ((appliedReceiptIds || []).includes(receiptId)) {
    return { valid: true, duplicate: true, receiptId, choice: null };
  }
  return {
    valid: true,
    duplicate: false,
    receiptId,
    eventId: eventRecord.id,
    sourceReceiptId: sourceReceipt.id,
    choice: { ...canonicalChoice, effects: { ...canonicalChoice.effects } },
  };
}
