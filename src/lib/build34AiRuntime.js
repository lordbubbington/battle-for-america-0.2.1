/** Idempotent one-decision-at-a-time runtime seam for the Build 33 adapter. */

import { buildWeeklyStrategy } from './aiStrategicPlanner.js';

export const BUILD34_AI_PLAN_VERSION = 'build34-ai-plan-v2';

const text = (value) => String(value ?? '').trim();
const isUnavailableNativeRecord = (record) => record?.eligible === false || record?.feasible === false;
/** @typedef {{ campaignId?: string, week?: string | number, publicStateRevision?: string | number, ruleKey?: string }} PlanIdentityInput */

/** @param {any[]} records @param {string} label @param {(record: any, index: number) => string} [getId] */
function requireUniqueCurrentIds(records, label, getId = (record) => record?.id) {
  if (!Array.isArray(records)) throw new Error(`${label} records must be an array`);
  const seenIds = new Set();
  for (const [index, record] of records.entries()) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error(`${label} record ${index} is invalid`);
    }
    const id = text(getId(record, index));
    if (!id) throw new Error(`${label} record ${index} has no stable ID`);
    if (seenIds.has(id)) throw new Error(`${label} records contain duplicate ID ${id}`);
    seenIds.add(id);
  }
  return records;
}
const portfolioOptionCategory = (option) => {
  const category = String(option?.category || option?.type || 'other');
  return category === 'action' ? 'campaign-action' : category;
};
const basePlanKey = ({ campaignId, week, publicStateRevision, ruleKey }) =>
  [campaignId, week, publicStateRevision, ruleKey]
    .map((part) => encodeURIComponent(text(part))).join(':');
const planKey = (identity) =>
  `${basePlanKey(identity)}:${encodeURIComponent(text(identity.decisionContextId) || 'no-context')}`;

function isValidEventContext(context) {
  if (!(context?.event && context?.eventId &&
    text(context.event.id) === text(context.eventId) &&
    Array.isArray(context.choices) && Array.isArray(context.event.choices) &&
    context.choices.length === context.event.choices.length)) return false;
  try {
    requireUniqueCurrentIds(
      context.choices,
      'Saved AI event choices',
      (choice, index) => choice.id || choice.choiceId || `choice-${index}`,
    );
    return JSON.stringify(context.choices) === JSON.stringify(context.event.choices);
  } catch {
    return false;
  }
}

function hasSameSerializableValue(left, right) {
  try {
    const canonicalize = (value) => Array.isArray(value)
      ? value.map(canonicalize)
      : value && typeof value === 'object'
        ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
        : value;
    return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
  } catch {
    return false;
  }
}

function assertJsonSafePayload(value, ancestors = new Set()) {
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    throw new Error('payload contains a non-JSON value');
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('payload contains a non-finite number');
  }
  if (value && typeof value === 'object') {
    if (ancestors.has(value)) throw new Error('payload contains a circular reference');
    const prototype = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
      throw new Error('payload contains a non-plain object');
    }
    ancestors.add(value);
    Object.values(value).forEach((child) => assertJsonSafePayload(child, ancestors));
    ancestors.delete(value);
  }
}

function snapshotSerializablePayload(payload, label) {
  try {
    assertJsonSafePayload(payload);
    const serialized = JSON.stringify(payload);
    if (!serialized) throw new Error('empty payload');
    const snapshot = JSON.parse(serialized);
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      throw new Error('invalid payload snapshot');
    }
    return snapshot;
  } catch {
    throw new Error(`Build 34 AI ${label} must be a JSON-serializable object for campaign saves`);
  }
}

function snapshotSerializableEvent(event) {
  try {
    const serialized = JSON.stringify(event);
    if (!serialized) throw new Error('empty event snapshot');
    const snapshot = JSON.parse(serialized);
    if (!snapshot || typeof snapshot !== 'object' || !Array.isArray(snapshot.choices)) {
      throw new Error('invalid event snapshot');
    }
    return snapshot;
  } catch {
    throw new Error('Build 34 AI event context must be JSON-serializable for campaign saves');
  }
}

/** @param {PlanIdentityInput} [identity] */
function planningIdentity({ campaignId, week, publicStateRevision, ruleKey } = {}) {
  const identity = {
    campaignId: text(campaignId),
    week: text(week),
    publicStateRevision: text(publicStateRevision),
    ruleKey: text(ruleKey),
  };
  if (Object.values(identity).some((value) => !value) ||
      !Number.isInteger(Number(identity.week)) || Number(identity.week) < 1) {
    throw new Error('Build 34 AI planning requires campaign, week, state revision, and active rule key');
  }
  return identity;
}

function receiptHasValidBaseIdentity(receipt) {
  try {
    return receipt.baseId === basePlanKey(planningIdentity(receipt));
  } catch {
    return false;
  }
}

function receiptHasValidDecisionIdentity(receipt) {
  if (!receiptHasValidBaseIdentity(receipt) || !receipt?.selectedDecision || !receipt?.decisionReceiptId) return false;
  const expectedId = planKey(receipt);
  const decision = receipt.selectedDecision;
  if (!text(decision.kind) || !text(decision.id)) return false;
  if (decision.kind === 'portfolio-option' || decision.kind === 'campaign-action') {
    const payload = decision.payloadSnapshot;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || String(payload.id) !== String(decision.id)) {
      return false;
    }
    const expectedCategory = decision.kind === 'portfolio-option'
      ? portfolioOptionCategory(payload)
      : String(payload.family || payload.type || 'campaign-action');
    if (expectedCategory !== String(decision.category)) return false;
  }
  const expectedDecisionReceiptId = `${expectedId}:${encodeURIComponent(decision.kind)}:${encodeURIComponent(decision.id)}:${decision.sourceIndex ?? ''}`;
  return receipt.id === expectedId && receipt.decisionReceiptId === expectedDecisionReceiptId;
}

/**
 * Look up an unresolved event before asking the engine to draw another one.
 * @param {PlanIdentityInput & { savedPlanReceipts?: any[] }} [input]
 */
export function findBuild34AiEventContextReceipt({
  campaignId,
  week,
  publicStateRevision,
  ruleKey,
  savedPlanReceipts = [],
} = {}) {
  if (!Array.isArray(savedPlanReceipts)) throw new Error('Saved Build 34 AI receipts must be an array');
  const baseId = basePlanKey(planningIdentity({ campaignId, week, publicStateRevision, ruleKey }));
  return savedPlanReceipts.find((receipt) => receipt?.baseId === baseId && receipt.eventContext &&
    ['event-ready', 'pending'].includes(receipt.status)) || null;
}

/**
 * Capture and persist an event before any AI choice scoring begins.
 * @param {PlanIdentityInput & { event?: any, planSeed?: string | number | null, savedPlanReceipts?: any[] }} [input]
 */
export function prepareBuild34AiEventContext({
  campaignId,
  week,
  publicStateRevision,
  ruleKey,
  event,
  planSeed = null,
  savedPlanReceipts = [],
} = {}) {
  const identity = planningIdentity({ campaignId, week, publicStateRevision, ruleKey });
  if (!event?.id || !Array.isArray(event.choices) || event.choices.length === 0) {
    throw new Error('Build 34 AI event context requires an event ID and at least one choice');
  }
  const baseId = basePlanKey(identity);
  const existing = findBuild34AiEventContextReceipt({ ...identity, savedPlanReceipts });
  if (existing) return { receipt: existing, reused: true };
  if (savedPlanReceipts.some((receipt) => receipt?.baseId === baseId &&
      (receipt.status === 'pending' || receipt.status === 'applied'))) {
    throw new Error('An AI decision already exists for this state; event context must be persisted before planning');
  }

  const eventSnapshot = snapshotSerializableEvent(event);
  if (eventSnapshot.choices.length === 0 || text(eventSnapshot.id) !== text(event.id)) {
    throw new Error('Build 34 AI event snapshot must retain its event ID and at least one choice');
  }
  requireUniqueCurrentIds(
    eventSnapshot.choices,
    'Native event choices',
    (choice, index) => choice.id || choice.choiceId || `choice-${index}`,
  );
  return {
    receipt: {
      id: `${baseId}:event-context`,
      baseId,
      ...identity,
      decisionContextId: text(event.id),
      planVersion: BUILD34_AI_PLAN_VERSION,
      planSeed,
      eventContext: {
        eventId: text(event.id),
        event: eventSnapshot,
        choices: eventSnapshot.choices,
      },
      status: 'event-ready',
    },
    reused: false,
  };
}

function firstDecision(strategy, activeEventId = '') {
  const eventChoice = strategy.eventChoices?.[0];
  if (eventChoice) {
    return {
      kind: 'event-choice',
      id: String(eventChoice.id),
      category: 'event-choice',
      sourceIndex: eventChoice.sourceIndex,
      sourceEventId: activeEventId,
      label: eventChoice.label,
    };
  }

  const portfolioOption = strategy.campaignPlan?.options?.[0];
  if (portfolioOption) {
    return {
      kind: 'portfolio-option',
      id: String(portfolioOption.id),
      category: portfolioOptionCategory(portfolioOption),
      payloadSnapshot: snapshotSerializablePayload(portfolioOption._sourcePayload || portfolioOption, 'portfolio option'),
    };
  }

  const action = strategy.actionPlan?.actions?.[0];
  if (action) {
    return {
      kind: 'campaign-action',
      id: String(action.id),
      category: String(action.family || action.type || 'campaign-action'),
      payloadSnapshot: snapshotSerializablePayload(action._sourcePayload || action, 'campaign action'),
    };
  }
  return null;
}

/**
 * Plan a single next decision. A pending receipt for the same public state and
 * ruleset is replayed as-is after save/load; it is never silently re-optimized.
 * `publicStateRevision` must exclude receipt-only writes and advance after a
 * native campaign-state transition, so saving a pending plan keeps its key stable.
 * @param {PlanIdentityInput & { decisionContextId?: string, planSeed?: string | number | null, strategyInput?: Record<string, any>, savedPlanReceipts?: any[], appliedDecisionReceiptIds?: string[] }} [input]
 */
export function planBuild34NextDecision({
  campaignId,
  week,
  publicStateRevision,
  ruleKey,
  decisionContextId = '',
  planSeed = null,
  strategyInput = {},
  savedPlanReceipts = [],
  appliedDecisionReceiptIds = [],
} = {}) {
  if (!Array.isArray(savedPlanReceipts)) throw new Error('Saved Build 34 AI receipts must be an array');
  if (!Array.isArray(appliedDecisionReceiptIds)) throw new Error('Applied Build 34 AI decision IDs must be an array');
  const input = strategyInput && typeof strategyInput === 'object' ? strategyInput : {};
  /** @type {Record<string, any>} */
  let normalizedStrategyInput = {
    ...input,
    eventChoices: input.eventChoices ?? input.activeEvent?.choices ?? [],
  };
  if (!Array.isArray(normalizedStrategyInput.eventChoices)) {
    throw new Error('Build 34 AI event choices must be an array');
  }
  const baseIdentity = planningIdentity({ campaignId, week, publicStateRevision, ruleKey });
  const baseId = basePlanKey(baseIdentity);
  const existing = savedPlanReceipts.find((receipt) => receipt?.baseId === baseId &&
    (receipt.status === 'pending' || receipt.status === 'applied') && receipt.selectedDecision);
  if (existing) {
    if (existing.status === 'pending' &&
        (existing.selectedDecision.kind === 'portfolio-option' || existing.selectedDecision.kind === 'campaign-action') &&
        !existing.selectedDecision.payloadSnapshot) {
      throw new Error('The pending AI action predates payload snapshots; migrate or explicitly replan it before resolution');
    }
    const suppliedEventId = text(normalizedStrategyInput.activeEvent?.id || normalizedStrategyInput.activeEventId);
    if (normalizedStrategyInput.eventChoices.length > 0 && existing.selectedDecision.kind !== 'event-choice') {
      throw new Error('The public-state revision did not change when the opponent event became active');
    }
    if (existing.eventContext?.eventId && suppliedEventId && suppliedEventId !== existing.eventContext.eventId) {
      throw new Error('A different event was supplied while an AI event decision is pending');
    }
    const alreadyApplied = existing.status === 'applied' || appliedDecisionReceiptIds.includes(existing.decisionReceiptId);
    return {
      strategy: null,
      decision: alreadyApplied ? null : existing.selectedDecision,
      receipt: alreadyApplied ? { ...existing, status: 'applied' } : existing,
      reused: true,
      alreadyApplied,
    };
  }

  const eventContextReceipt = savedPlanReceipts.find((receipt) =>
    receipt?.baseId === baseId && receipt.status === 'event-ready' && receipt.eventContext);
  if (eventContextReceipt) {
    const savedContext = eventContextReceipt.eventContext;
    if (!isValidEventContext(savedContext)) {
      throw new Error('The persisted AI event context is incomplete or inconsistent');
    }
    const suppliedEventId = text(normalizedStrategyInput.activeEvent?.id || normalizedStrategyInput.activeEventId || decisionContextId);
    if (suppliedEventId && suppliedEventId !== text(savedContext.eventId)) {
      throw new Error('A newly supplied event conflicts with the persisted AI event context');
    }
    normalizedStrategyInput = {
      ...normalizedStrategyInput,
      activeEvent: { ...savedContext.event, choices: [...savedContext.choices] },
      activeEventId: text(savedContext.eventId),
      eventChoices: [...savedContext.choices],
    };
  } else if (normalizedStrategyInput.eventChoices.length > 0) {
    throw new Error('Persist the active AI event context before scoring its choices');
  }

  const identity = {
    ...baseIdentity,
    decisionContextId: text(eventContextReceipt?.eventContext?.eventId || decisionContextId),
  };
  const id = planKey(identity);

  const strategy = buildWeeklyStrategy(normalizedStrategyInput);
  const decision = firstDecision(strategy, identity.decisionContextId);
  if (!decision) {
    return { strategy, decision: null, receipt: null, reused: false, alreadyApplied: false };
  }

  const decisionReceiptId = `${id}:${encodeURIComponent(decision.kind)}:${encodeURIComponent(decision.id)}:${decision.sourceIndex ?? ''}`;
  const eventContext = decision.kind === 'event-choice' ? eventContextReceipt.eventContext : null;
  const receipt = {
    id,
    baseId,
    ...identity,
    planVersion: BUILD34_AI_PLAN_VERSION,
    planSeed: eventContextReceipt?.planSeed ?? planSeed,
    selectedDecision: decision,
    eventContext,
    decisionReceiptId,
    status: 'pending',
  };
  return { strategy, decision, receipt, reused: false, alreadyApplied: false };
}

/**
 * Resolve the saved ID to a currently legal native event, portfolio, or action record.
 * @param {{ decision?: any, receipt?: any, activeEventId?: string, eventChoices?: any[], portfolioOptions?: any[], availableActions?: any[] }} [input]
 */
export function resolveBuild34AiDecisionTarget({
  decision,
  receipt,
  activeEventId = '',
  eventChoices = [],
  portfolioOptions = [],
  availableActions = [],
} = {}) {
  if (!decision?.kind || !text(decision?.id)) throw new Error('A saved AI decision is required');
  if (!Array.isArray(eventChoices) || !Array.isArray(portfolioOptions) || !Array.isArray(availableActions)) {
    throw new Error('AI decision resolution requires event, portfolio, and action arrays');
  }
  if (!receiptHasValidDecisionIdentity(receipt) || receipt.status !== 'pending') {
    throw new Error('Resolving an AI decision requires its pending persisted receipt');
  }
  const savedDecision = receipt.selectedDecision;
  if (!savedDecision || savedDecision.kind !== decision.kind || String(savedDecision.id) !== String(decision.id) ||
      String(savedDecision.category) !== String(decision.category) ||
      String(savedDecision.sourceEventId || '') !== String(decision.sourceEventId || '') ||
      (decision.sourceIndex !== undefined && Number(savedDecision.sourceIndex) !== Number(decision.sourceIndex)) ||
      ((decision.kind === 'portfolio-option' || decision.kind === 'campaign-action') &&
        !hasSameSerializableValue(decision.payloadSnapshot, savedDecision.payloadSnapshot))) {
    throw new Error('The AI decision does not match its persisted receipt');
  }
  let payload = null;

  if (decision.kind === 'event-choice') {
    requireUniqueCurrentIds(
      eventChoices,
      'Active native event choices',
      (choice, index) => choice.id || choice.choiceId || `choice-${index}`,
    );
    const savedContext = receipt?.eventContext;
    if (!isValidEventContext(savedContext)) {
      throw new Error('The pending AI event receipt is missing its event and choice snapshot');
    }
    const resolvedEventId = text(activeEventId);
    if (!resolvedEventId) throw new Error('Resolving an AI event choice requires the engine’s current active event ID');
    if (!decision.sourceEventId || resolvedEventId !== text(decision.sourceEventId) ||
        text(savedContext.eventId) !== text(decision.sourceEventId) ||
        text(savedContext.event.id) !== text(decision.sourceEventId)) {
      throw new Error('The saved AI choice belongs to a different or inactive event');
    }
    const index = Number(decision.sourceIndex);
    const currentChoices = savedContext.choices;
    if (!Number.isInteger(index) || index < 0 || index >= currentChoices.length) {
      throw new Error('The saved AI event-choice index is no longer available');
    }
    const savedChoice = currentChoices[index];
    const currentChoice = eventChoices[index];
    const savedId = text(savedChoice?.id || savedChoice?.choiceId || `choice-${index}`);
    const currentId = text(currentChoice?.id || currentChoice?.choiceId || `choice-${index}`);
    if (!currentChoice || isUnavailableNativeRecord(currentChoice) || currentId !== String(decision.id) || savedId !== currentId) {
      throw new Error('The active native event choices no longer match the saved AI decision');
    }
    if (!hasSameSerializableValue(currentChoice, savedChoice)) {
      throw new Error('The active native event choice payload changed after the AI planned it');
    }
    payload = currentChoice;
  } else if (decision.kind === 'portfolio-option') {
    requireUniqueCurrentIds(portfolioOptions, 'Current native portfolio options');
    payload = portfolioOptions.find((option) => text(option.id) === text(decision.id));
    if (payload && portfolioOptionCategory(payload) !== String(decision.category)) {
      throw new Error('The saved AI portfolio category no longer matches');
    }
    if (payload && !hasSameSerializableValue(payload._sourcePayload || payload, savedDecision.payloadSnapshot)) {
      throw new Error('The current portfolio option payload changed after the AI planned it');
    }
  } else if (decision.kind === 'campaign-action') {
    requireUniqueCurrentIds(availableActions, 'Current native campaign actions');
    payload = availableActions.find((action) => text(action.id) === text(decision.id));
    if (payload && String(payload.family || payload.type || 'campaign-action') !== String(decision.category)) {
      throw new Error('The saved AI action family no longer matches');
    }
    if (payload && !hasSameSerializableValue(payload._sourcePayload || payload, savedDecision.payloadSnapshot)) {
      throw new Error('The current campaign action payload changed after the AI planned it');
    }
  } else {
    throw new Error(`Unsupported Build 34 AI decision kind: ${decision.kind}`);
  }

  if (!payload || isUnavailableNativeRecord(payload)) {
    throw new Error('The saved AI decision is no longer eligible or feasible');
  }
  return {
    decision,
    payload,
    event: decision.kind === 'event-choice' ? receipt?.eventContext?.event || null : null,
  };
}

/** Persist an event context or decision once; never replace an unresolved same-key plan. */
export function upsertBuild34AiPlanReceipt(receipt, savedPlanReceipts = []) {
  if (!Array.isArray(savedPlanReceipts)) throw new Error('Saved Build 34 AI receipts must be an array');
  if (!receipt || !['event-ready', 'pending', 'applied'].includes(receipt.status)) {
    throw new Error('Invalid Build 34 AI receipt status');
  }
  if (receipt.status === 'event-ready') {
    if (!receipt?.id || !receipt?.baseId || !receiptHasValidBaseIdentity(receipt) || !isValidEventContext(receipt.eventContext)) {
      throw new Error('A complete Build 34 AI event-context receipt is required');
    }
    if (receipt.id !== `${receipt.baseId}:event-context` ||
        text(receipt.decisionContextId) !== text(receipt.eventContext.eventId)) {
      throw new Error('A Build 34 AI event-context receipt must match its stable event identity');
    }
  } else if (!receipt?.id || !receipt?.baseId || !receipt?.decisionReceiptId || !receipt?.selectedDecision) {
    throw new Error('A complete Build 34 AI decision receipt is required');
  } else if (!receiptHasValidDecisionIdentity(receipt)) {
    throw new Error('A Build 34 AI decision receipt has an invalid stable identity');
  }
  if (receipt.selectedDecision?.kind === 'event-choice' &&
      (!isValidEventContext(receipt.eventContext) ||
        text(receipt.selectedDecision.sourceEventId) !== text(receipt.eventContext.eventId) ||
        text(receipt.decisionContextId) !== text(receipt.eventContext.eventId))) {
    throw new Error('An AI event-choice decision must retain its matching event snapshot');
  }

  const sameIdIndex = savedPlanReceipts.findIndex((item) => item?.id === receipt.id);
  if (sameIdIndex >= 0) {
    const existing = savedPlanReceipts[sameIdIndex];
    if (existing.decisionReceiptId && existing.decisionReceiptId !== receipt.decisionReceiptId) {
      throw new Error('A different AI decision is already recorded for this campaign state and ruleset');
    }
    if (existing.status === 'applied' || existing.status === receipt.status) {
      return { savedPlanReceipts, receipt: existing, inserted: false };
    }
    const updated = [...savedPlanReceipts];
    updated[sameIdIndex] = receipt;
    return { savedPlanReceipts: updated, receipt, inserted: false };
  }

  const sameBaseIndex = savedPlanReceipts.findIndex((item) => item?.baseId === receipt.baseId);
  if (sameBaseIndex >= 0) {
    const existing = savedPlanReceipts[sameBaseIndex];
    if (existing.status === 'pending' || existing.status === 'applied') {
      return { savedPlanReceipts, receipt: existing, inserted: false };
    }
    if (existing.status === 'event-ready' && receipt.status === 'pending') {
      if (existing.eventContext?.eventId !== receipt.eventContext?.eventId) {
        throw new Error('The persisted event context changed before its AI decision was planned');
      }
      const updated = [...savedPlanReceipts];
      updated[sameBaseIndex] = receipt;
      return { savedPlanReceipts: updated, receipt, inserted: false };
    }
    if (existing.status === 'event-ready' && receipt.status === 'event-ready') {
      return { savedPlanReceipts, receipt: existing, inserted: false };
    }
  }

  return { savedPlanReceipts: [...savedPlanReceipts, receipt], receipt, inserted: true };
}

/**
 * Mark a decision applied after its native resolver succeeds and persist it with the game state.
 * @param {{ receipt?: any, resolverSucceeded?: boolean, appliedDecisionReceiptIds?: string[] }} [input]
 */
export function recordBuild34AiDecisionApplied({
  receipt,
  resolverSucceeded = false,
  appliedDecisionReceiptIds = [],
} = {}) {
  if (!Array.isArray(appliedDecisionReceiptIds)) throw new Error('Applied Build 34 AI decision IDs must be an array');
  if (!receiptHasValidDecisionIdentity(receipt)) throw new Error('A valid persisted AI decision receipt is required');
  if (receipt.status === 'applied' || appliedDecisionReceiptIds.includes(receipt.decisionReceiptId)) {
    return {
      receipt: { ...receipt, status: 'applied' },
      appliedDecisionReceiptIds: appliedDecisionReceiptIds.includes(receipt.decisionReceiptId)
        ? appliedDecisionReceiptIds
        : [...appliedDecisionReceiptIds, receipt.decisionReceiptId],
      applied: false,
    };
  }
  if (receipt.status !== 'pending') throw new Error('Only a pending AI decision receipt can be marked applied');
  if (resolverSucceeded !== true) throw new Error('The native resolver must succeed before recording the AI decision');

  return {
    receipt: { ...receipt, status: 'applied' },
    appliedDecisionReceiptIds: [...appliedDecisionReceiptIds, receipt.decisionReceiptId],
    applied: true,
  };
}
