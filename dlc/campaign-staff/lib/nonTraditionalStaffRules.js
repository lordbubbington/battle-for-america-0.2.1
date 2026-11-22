import { createSeededRandom } from './seededRandom.js';
import {
  NONTRADITIONAL_EFFECT_CONTRACT_VERSION,
  NONTRADITIONAL_EFFECT_SPECS,
  nonTraditionalEffectAdjustments,
  validateNonTraditionalEffectEvidence,
} from './nonTraditionalStaffEffects.js';
import {
  NONTRADITIONAL_SELECTION_POOL_SIZE,
  NONTRADITIONAL_STAFF_BY_ID,
  NONTRADITIONAL_STAFF_ROSTER,
  NONTRADITIONAL_STAFF_SCHEMA_VERSION,
} from '../data/nonTraditionalStaffRoster.js';
import { staffingActiveCapacity } from './traditionalStaffRules.js';
import { STAFF_SELECTION_POLICY_VERSION, TRADITIONAL_STAFF_ACTIVE_CAPACITY, TRADITIONAL_STAFF_BY_ID } from '../data/traditionalStaffRoster.js';

export { NONTRADITIONAL_STAFF_SCHEMA_VERSION };

/** @typedef {{
 *   schemaVersion: number,
 *   selectionPolicyVersion?: number,
 *   traditionalActiveIds: string[],
 *   traditionalPortraitByRole: Record<string, string>,
 *   nonTraditionalActiveIds: string[],
 *   nonTraditionalSelectionPoolIds?: string[],
 *   nonTraditionalOfferIds?: string[],
 *   hiredNonTraditionalIds?: string[],
 *   nonTraditionalReserveIds?: string[],
 *   initialSelectionComplete: boolean,
 *   agendaByWeek: Record<string, any>,
 *   briefingHistory: any[],
 * }} StaffingState */
/** @typedef {{receiptId?: string, campaignId?: string, week?: number, actionId?: string, type?: string, receiptType?: string, kind?: string, committed?: boolean, evidence?: Record<string, any>}} SourceReceipt */

/** Draw the campaign's three fixed nontraditional choices without render-time randomness. */
export function sampleNonTraditionalSelectionPool(campaignSeed) {
  if (campaignSeed == null || String(campaignSeed).trim() === '') {
    throw new Error('A saved campaign seed is required to sample the nontraditional selection pool.');
  }
  const random = createSeededRandom(`${campaignSeed}:nontraditional-selection:v${NONTRADITIONAL_STAFF_SCHEMA_VERSION}`);
  const remaining = [...NONTRADITIONAL_STAFF_ROSTER];
  const selectionPoolIds = [];
  while (selectionPoolIds.length < NONTRADITIONAL_SELECTION_POOL_SIZE) {
    const index = Math.floor(random() * remaining.length);
    selectionPoolIds.push(remaining.splice(index, 1)[0].id);
  }
  return selectionPoolIds;
}

/** @deprecated Use sampleNonTraditionalSelectionPool; kept for the Build 35 adapter during integration. */
export const sampleNonTraditionalStaffOffers = sampleNonTraditionalSelectionPool;

/** Create the Build 36 staffing fields before the combined staff selection is confirmed. */
export function createNonTraditionalStaffState(selectionPoolIds) {
  const ids = Array.isArray(selectionPoolIds) ? [...selectionPoolIds] : [];
  if (
    ids.length !== NONTRADITIONAL_SELECTION_POOL_SIZE
    || new Set(ids).size !== ids.length
    || ids.some((id) => !Object.hasOwn(NONTRADITIONAL_STAFF_BY_ID, id))
  ) {
    throw new Error('Initial staffing requires exactly three unique nontraditional selection IDs.');
  }
  return {
    schemaVersion: NONTRADITIONAL_STAFF_SCHEMA_VERSION,
    selectionPolicyVersion: STAFF_SELECTION_POLICY_VERSION,
    traditionalActiveIds: ['chief'],
    traditionalPortraitByRole: {},
    nonTraditionalSelectionPoolIds: ids,
    nonTraditionalActiveIds: [],
    initialSelectionComplete: false,
    agendaByWeek: {},
    briefingHistory: [],
  };
}

/**
 * Complete the combined staff selection. Only selected IDs survive in the saved roster.
 * Portrait assignments for selected traditional roles are supplied by the traditional staff owner.
 * @param {{staffState?: StaffingState, selectedTraditionalIds?: string[], selectedNonTraditionalIds?: string[]}} [input]
 */
export function planNonTraditionalStaffSelection({
  staffState,
  selectedTraditionalIds,
  selectedNonTraditionalIds,
} = {}) {
  const stateCheck = validateNonTraditionalStaffState(staffState);
  const reject = (reason, errors = []) => ({ ok: false, reason, errors, staffing: staffState || null });
  if (!stateCheck.valid || staffState.initialSelectionComplete) return reject('selection-state-invalid', stateCheck.errors);
  if (!Array.isArray(selectedTraditionalIds) || !Array.isArray(selectedNonTraditionalIds)) return reject('selection-lists-required');
  if (selectedTraditionalIds.some((id) => !Object.hasOwn(TRADITIONAL_STAFF_BY_ID, id)) || new Set(selectedTraditionalIds).size !== selectedTraditionalIds.length) {
    return reject('traditional-selection-invalid');
  }
  if (!selectedTraditionalIds.includes('chief')) return reject('chief-required');
  if (
    selectedNonTraditionalIds.length > NONTRADITIONAL_SELECTION_POOL_SIZE
    || new Set(selectedNonTraditionalIds).size !== selectedNonTraditionalIds.length
    || selectedNonTraditionalIds.some((id) => !staffState.nonTraditionalSelectionPoolIds.includes(id))
    || selectedTraditionalIds.some((id) => selectedNonTraditionalIds.includes(id))
  ) {
    return reject('nontraditional-selection-invalid');
  }
  if (selectedTraditionalIds.length + selectedNonTraditionalIds.length !== TRADITIONAL_STAFF_ACTIVE_CAPACITY) return reject('four-active-staff-required');

  const staffing = {
    ...staffState,
    schemaVersion: NONTRADITIONAL_STAFF_SCHEMA_VERSION,
    selectionPolicyVersion: STAFF_SELECTION_POLICY_VERSION,
    traditionalActiveIds: [...selectedTraditionalIds],
    nonTraditionalActiveIds: [...selectedNonTraditionalIds],
    initialSelectionComplete: true,
  };
  delete staffing.nonTraditionalSelectionPoolIds;
  delete staffing.nonTraditionalOfferIds;
  delete staffing.hiredNonTraditionalIds;
  delete staffing.nonTraditionalReserveIds;
  return { ok: true, reason: 'selection-complete', staffing };
}

/** @deprecated New campaigns have no separate nontraditional hire or recruit action. */
export function planNonTraditionalStaffHire({ staffState = null } = {}) {
  return { ok: false, reason: 'separate-hiring-removed', staffState, command: null };
}

/**
 * Plan selected staff's upkeep using the one-based closing finance boundary. Week zero is a free setup preview.
 * @param {{staffState?: StaffingState, campaignId?: string, week?: number, appliedReceiptIds?: string[]}} [input]
 */
export function planNonTraditionalStaffUpkeep({ staffState, campaignId, week, appliedReceiptIds = [] } = {}) {
  const stateCheck = validateNonTraditionalStaffState(staffState);
  if (!stateCheck.valid || !staffState.initialSelectionComplete) return { ok: false, reason: 'invalid-or-incomplete-staff-state' };
  if (!campaignId || !Number.isInteger(week) || week < 0) return { ok: false, reason: 'campaign-context-required' };
  if (!Array.isArray(appliedReceiptIds)) return { ok: false, reason: 'receipt-history-required' };

  const receiptId = `${campaignId}:week-${week}:nontraditional-upkeep:v2`;
  if (appliedReceiptIds.includes(receiptId)) return { ok: false, reason: 'already-applied', receiptId };
  const lines = week === 0 ? [] : staffState.nonTraditionalActiveIds.map((staffId) => ({
    staffId,
    amount: NONTRADITIONAL_STAFF_BY_ID[staffId].weeklyUpkeep,
    effectId: NONTRADITIONAL_STAFF_BY_ID[staffId].effectId,
  }));
  const total = Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100;
  return { ok: true, receiptId, campaignId, week, lines, total };
}

/**
 * Preview actions from currently active staff and targets supplied by native eligibility resolvers.
 * @param {{staffState?: StaffingState, campaignId?: string, week?: number, availableActions?: number, context?: {eligibleInfluencerIds?: string[], inActiveAgenda?: boolean, interviewTargets?: Array<{legal?: boolean, issueId?: string, reachableGroupIds?: string[]}>}, appliedEffectReceiptIds?: string[]}} [input]
 */
export function listNonTraditionalActionOptions({
  staffState,
  campaignId,
  week,
  availableActions,
  context = {},
  appliedEffectReceiptIds = [],
} = {}) {
  if (
    !validateNonTraditionalStaffState(staffState).valid
    || !staffState.initialSelectionComplete
    || !campaignId
    || !Number.isInteger(week)
    || week < 0
    || !Number.isInteger(availableActions)
    || availableActions < 0
    || !Array.isArray(appliedEffectReceiptIds)
  ) return [];

  const options = [];
  const active = new Set(staffState.nonTraditionalActiveIds);
  const influencers = Array.isArray(context.eligibleInfluencerIds)
    ? context.eligibleInfluencerIds.filter((id) => typeof id === 'string' && id.trim())
    : [];
  const influencerUse = `${campaignId}:week-${week}:${NONTRADITIONAL_STAFF_BY_ID['influencer-director'].effectId}:weekly`;
  if (
    active.has('influencer-director')
    && influencers.length
    && typeof context.inActiveAgenda === 'boolean'
    && !appliedEffectReceiptIds.includes(influencerUse)
    && (context.inActiveAgenda || availableActions > 0)
  ) {
    options.push({
      id: 'endorsement',
      label: 'Influencer endorsement outreach',
      staffId: 'influencer-director',
      resolver: 'endorsement',
      actionCost: context.inActiveAgenda ? 0 : 1,
      eligibleTargetIds: [...new Set(influencers)],
    });
  }

  const targets = Array.isArray(context.interviewTargets)
    ? context.interviewTargets.filter((target) => (
      target?.legal === true
      && typeof target.issueId === 'string'
      && target.issueId.trim()
      && Array.isArray(target.reachableGroupIds)
      && target.reachableGroupIds.length > 0
      && target.reachableGroupIds.every((id) => typeof id === 'string' && id.trim())
    ))
    : [];
  if (active.has('podcast-consultant') && availableActions > 0 && targets.length) {
    options.push({
      id: 'podcast-interview',
      label: 'Long-form interview',
      staffId: 'podcast-consultant',
      resolver: 'interview',
      actionCost: 1,
      targets: targets.map(({ issueId, reachableGroupIds }) => ({ issueId, reachableGroupIds: [...reachableGroupIds] })),
      gaffeRisk: true,
    });
  }
  return options;
}

/**
 * Build a bounded command only from an active staff member and a committed source receipt.
 * @param {{staffState?: StaffingState, staffId?: string, campaignId?: string, week?: number, sourceReceipt?: SourceReceipt, appliedEffectReceiptIds?: string[]}} [input]
 */
export function planNonTraditionalStaffEffect({
  staffState,
  staffId,
  campaignId,
  week,
  sourceReceipt,
  appliedEffectReceiptIds = [],
} = {}) {
  const profile = NONTRADITIONAL_STAFF_BY_ID[staffId];
  if (!validateNonTraditionalStaffState(staffState).valid || !staffState.initialSelectionComplete) {
    return { ok: false, reason: 'invalid-or-incomplete-staff-state', command: null };
  }
  if (!Object.hasOwn(NONTRADITIONAL_STAFF_BY_ID, staffId) || !staffState.nonTraditionalActiveIds.includes(staffId)) return { ok: false, reason: 'staff-not-active', command: null };
  if (!campaignId || !Number.isInteger(week) || week < 0) return { ok: false, reason: 'campaign-context-required', command: null };
  if (!Array.isArray(appliedEffectReceiptIds)) return { ok: false, reason: 'receipt-history-required', command: null };
  if (!sourceReceipt?.receiptId || sourceReceipt.campaignId !== campaignId || !Number.isInteger(sourceReceipt.week) || sourceReceipt.week < 0 || sourceReceipt.week > week) {
    return { ok: false, reason: 'matching-source-receipt-required', command: null };
  }
  const actionId = sourceReceipt.actionId || sourceReceipt.type;
  const receiptType = sourceReceipt.receiptType || sourceReceipt.kind;
  if (sourceReceipt.committed !== true || !profile.effect.receiptTypes.includes(receiptType)) return { ok: false, reason: 'ineligible-source-receipt', command: null };
  if ((receiptType === 'campaign-action' || sourceReceipt.actionId) && !profile.effect.actionIds.includes(actionId)) return { ok: false, reason: 'ineligible-action', command: null };
  if (['campaign-action', 'campaign-event', 'rival-action', 'agenda-selection'].includes(receiptType) && sourceReceipt.week !== week) return { ok: false, reason: 'action-receipt-not-current', command: null };
  const effectSpec = NONTRADITIONAL_EFFECT_SPECS[staffId];
  const evidenceCheck = validateNonTraditionalEffectEvidence(staffId, sourceReceipt.evidence);
  if (!evidenceCheck.valid) return { ok: false, reason: 'effect-evidence-required', missingEvidence: evidenceCheck.missing, command: null };
  if (staffId === 'etsy-witch' && ((receiptType === 'rival-action') !== (sourceReceipt.evidence.actor === 'rival'))) return { ok: false, reason: 'receipt-actor-mismatch', command: null };
  const periodKey = profile.effect.useLimit === 'campaign'
    ? `${campaignId}:${profile.effectId}:campaign`
    : profile.effect.useLimit === 'source'
      ? `${campaignId}:${profile.effectId}:source:${sourceReceipt.receiptId}`
      : `${campaignId}:week-${week}:${profile.effectId}:weekly${staffId === 'etsy-witch' ? `:${sourceReceipt.evidence.actor}` : ''}`;
  if (appliedEffectReceiptIds.includes(periodKey)) return { ok: false, reason: 'effect-use-limit-reached', command: null };
  return {
    ok: true,
    reason: 'eligible',
    command: {
      schemaVersion: NONTRADITIONAL_STAFF_SCHEMA_VERSION,
      type: 'nontraditional-native-adjustment',
      resolverHint: profile.effect.commandType,
      requiresNativeResolver: true,
      campaignId,
      week,
      sourceType: 'nontraditional-staff',
      sourceId: profile.effectId,
      sourceReceiptId: sourceReceipt.receiptId,
      sourceReceiptType: receiptType,
      receiptId: periodKey,
      staffId,
      effectId: profile.effectId,
      scope: profile.effect.scope,
      maxEffectMultiplier: profile.effect.maxEffectMultiplier,
      eligibilityGate: profile.effect.eligibilityGate,
      effectContractVersion: NONTRADITIONAL_EFFECT_CONTRACT_VERSION,
      resolver: effectSpec.resolver,
      adjustments: nonTraditionalEffectAdjustments(staffId, sourceReceipt.evidence),
      evidence: { ...sourceReceipt.evidence },
    },
  };
}

export function validateNonTraditionalStaffState(staffState) {
  const errors = [];
  const traditional = staffState?.traditionalActiveIds;
  const nonTraditional = staffState?.nonTraditionalActiveIds;
  const selectionPool = staffState?.nonTraditionalSelectionPoolIds;
  const isComplete = staffState?.initialSelectionComplete === true;
  const hasPool = Object.prototype.hasOwnProperty.call(staffState || {}, 'nonTraditionalSelectionPoolIds');

  if (staffState?.schemaVersion !== NONTRADITIONAL_STAFF_SCHEMA_VERSION) errors.push('Staffing has an unsupported schema version.');
  const capacity = staffingActiveCapacity(staffState);
  if (capacity === null) errors.push('Staff selection policy version is unsupported.');
  if (typeof staffState?.initialSelectionComplete !== 'boolean') errors.push('Initial selection status must be explicit.');
  if (!Array.isArray(traditional) || new Set(traditional).size !== traditional.length || traditional.some((id) => !Object.hasOwn(TRADITIONAL_STAFF_BY_ID, id))) {
    errors.push('Traditional active IDs must be a unique list of known roles.');
  }
  if (!Array.isArray(nonTraditional) || new Set(nonTraditional).size !== nonTraditional.length || nonTraditional.length > NONTRADITIONAL_SELECTION_POOL_SIZE) {
    errors.push('Nontraditional active IDs must be a unique list of zero to three IDs.');
  }
  if (Array.isArray(nonTraditional) && nonTraditional.some((id) => !Object.hasOwn(NONTRADITIONAL_STAFF_BY_ID, id))) errors.push('Active nontraditional IDs must refer to known profiles.');
  if (Array.isArray(traditional) && Array.isArray(nonTraditional) && traditional.some((id) => nonTraditional.includes(id))) errors.push('Traditional and nontraditional active IDs must not overlap.');
  if (!staffState || staffState.traditionalPortraitByRole === null || typeof staffState.traditionalPortraitByRole !== 'object' || Array.isArray(staffState.traditionalPortraitByRole)) errors.push('Traditional portrait assignments must be a saved object.');
  if (!staffState || staffState.agendaByWeek === null || typeof staffState.agendaByWeek !== 'object' || Array.isArray(staffState.agendaByWeek)) errors.push('Staff agenda history must be a saved object.');
  if (!Array.isArray(staffState?.briefingHistory) || staffState.briefingHistory.length > 8) errors.push('Staff briefing history must be a list capped at eight entries.');
  if (Object.prototype.hasOwnProperty.call(staffState || {}, 'nonTraditionalOfferIds') || Object.prototype.hasOwnProperty.call(staffState || {}, 'hiredNonTraditionalIds')) {
    errors.push('Legacy nontraditional offers and hires must not remain in Build 36 staffing state.');
  }

  if (isComplete) {
    if (hasPool) errors.push('A completed selection must not retain the temporary nontraditional pool.');
    if (!Array.isArray(traditional) || !traditional.includes('chief')) errors.push('The completed roster must contain the Chief of Staff.');
    if (Array.isArray(traditional) && Array.isArray(nonTraditional) && traditional.length + nonTraditional.length !== capacity) errors.push(`A completed roster must contain exactly ${capacity} active staff.`);
    if (Array.isArray(traditional) && Array.isArray(nonTraditional) && traditional.includes('chief') && traditional.length !== capacity - nonTraditional.length) {
      errors.push(`Traditional and nontraditional selections must fill exactly ${capacity} positions.`);
    }
  } else {
    if (!hasPool || !Array.isArray(selectionPool) || selectionPool.length !== NONTRADITIONAL_SELECTION_POOL_SIZE || new Set(selectionPool).size !== NONTRADITIONAL_SELECTION_POOL_SIZE) {
      errors.push('Initial setup must save exactly three unique nontraditional choices.');
    }
    if (Array.isArray(selectionPool) && selectionPool.some((id) => !Object.hasOwn(NONTRADITIONAL_STAFF_BY_ID, id))) errors.push('The selection pool must contain known nontraditional IDs.');
    if (Array.isArray(traditional) && (traditional.length !== 1 || traditional[0] !== 'chief')) errors.push('Before confirmation, only the Chief is active in the traditional roster.');
    if (Array.isArray(nonTraditional) && nonTraditional.length !== 0) errors.push('Nontraditional staff become active only after setup confirmation.');
  }
  return { valid: errors.length === 0, errors };
}
