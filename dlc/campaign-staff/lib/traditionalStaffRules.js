import {
  TRADITIONAL_GENERIC_PORTRAIT_IDS,
  STAFF_SELECTION_POLICY_VERSION,
  LEGACY_STAFF_ACTIVE_CAPACITY,
  TRADITIONAL_STAFF_ACTIVE_CAPACITY,
  TRADITIONAL_STAFF_BY_ID,
  TRADITIONAL_STAFF_ROSTER,
  TRADITIONAL_STAFF_SCHEMA_VERSION,
  TRADITIONAL_STAFF_SELECTION_COUNT,
} from '../data/traditionalStaffRoster.js';
import { NONTRADITIONAL_STAFF_BY_ID } from '../data/nonTraditionalStaffRoster.js';
import { createSeededRandom } from './seededRandom.js';

const PARTY_IDS = new Set(['dem', 'rep', 'lib', 'grn']);
const finite = (value) => Number.isFinite(value);
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const unique = (values) => new Set(values).size === values.length;
const cleanReasonCodes = (values) => Array.isArray(values)
  ? values.filter((value) => nonEmpty(value))
  : [];
const toId = (value) => (typeof value === 'string' ? value.trim() : '');
const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
const NONTRADITIONAL_CAPACITY = 3;

const roleIds = TRADITIONAL_STAFF_ROSTER.map((staff) => staff.id);
const isTraditionalId = (id) => Object.hasOwn(TRADITIONAL_STAFF_BY_ID, id);
const isNonTraditionalId = (id) => Object.hasOwn(NONTRADITIONAL_STAFF_BY_ID, id);
const isPortraitId = (id) => TRADITIONAL_GENERIC_PORTRAIT_IDS.includes(id);

/** Create the versioned setup state around the three IDs sampled by the campaign.
 * @param {{ nonTraditionalSelectionPoolIds?: string[], nonTraditionalOfferIds?: string[] }} [baseStaffing]
 */
export function createInitialTraditionalStaffing(baseStaffing = {}) {
  return {
    schemaVersion: TRADITIONAL_STAFF_SCHEMA_VERSION,
    selectionPolicyVersion: STAFF_SELECTION_POLICY_VERSION,
    traditionalActiveIds: ['chief'],
    traditionalPortraitByRole: {},
    nonTraditionalSelectionPoolIds: Array.isArray(baseStaffing?.nonTraditionalSelectionPoolIds)
      ? [...baseStaffing.nonTraditionalSelectionPoolIds] : [],
    nonTraditionalActiveIds: [],
    initialSelectionComplete: false,
    agendaByWeek: {},
    briefingHistory: [],
  };
}

/** Assign the anonymous pool without replacement using only the saved campaign ID. */
export function previewTraditionalPortraits(campaignId) {
  if (campaignId == null || String(campaignId).trim() === '') return {};
  const random = createSeededRandom(`${campaignId}:traditional-staff-portraits:v2`);
  const remaining = [...TRADITIONAL_GENERIC_PORTRAIT_IDS];
  return Object.fromEntries(roleIds.map((roleId) => {
    const index = Math.floor(random() * remaining.length);
    return [roleId, remaining.splice(index, 1)[0]];
  }));
}

export function staffingActiveCapacity(staffing) {
  if (staffing?.selectionPolicyVersion === STAFF_SELECTION_POLICY_VERSION) return TRADITIONAL_STAFF_ACTIVE_CAPACITY;
  if (staffing?.initialSelectionComplete === true && (staffing.selectionPolicyVersion === 0 || staffing.selectionPolicyVersion === undefined)) return LEGACY_STAFF_ACTIVE_CAPACITY;
  return null;
}

export function validateTraditionalStaffing(staffing) {
  const errors = [];
  if (!isRecord(staffing)) return ['Campaign staffing state is missing.'];
  if (staffing.schemaVersion !== TRADITIONAL_STAFF_SCHEMA_VERSION) errors.push('Traditional staffing schema version is unsupported.');
  if (staffingActiveCapacity(staffing) === null) errors.push('Staff selection policy version is unsupported.');
  if (typeof staffing.initialSelectionComplete !== 'boolean') errors.push('Staff selection status must be explicit.');
  const active = Array.isArray(staffing.traditionalActiveIds) ? staffing.traditionalActiveIds : [];
  const nonTraditional = Array.isArray(staffing.nonTraditionalActiveIds) ? staffing.nonTraditionalActiveIds : [];
  const portraits = isRecord(staffing.traditionalPortraitByRole) ? staffing.traditionalPortraitByRole : {};

  if (!unique(active)) errors.push('Active traditional staff IDs must be unique.');
  if (active.some((id) => !isTraditionalId(id))) errors.push('Active roster contains an unknown traditional role.');
  if (active[0] !== 'chief') {
    errors.push('The Chief of Staff must occupy one active inner-circle spot.');
  }
  if (!Array.isArray(staffing.nonTraditionalActiveIds) || nonTraditional.length > NONTRADITIONAL_CAPACITY
      || !unique(nonTraditional) || nonTraditional.some((id) => !isNonTraditionalId(id) || active.includes(id))) {
    errors.push('The active roster must contain zero to three distinct nontraditional staff IDs.');
  }
  if (!isRecord(staffing.traditionalPortraitByRole)) errors.push('Portrait assignments must be saved as an object.');
  if (!isRecord(staffing.agendaByWeek)) errors.push('Staff agendas must be saved as an object.');
  if (!Array.isArray(staffing.briefingHistory) || staffing.briefingHistory.length > 8) errors.push('Staff briefing history must contain at most eight entries.');
  if (['traditionalBenchIds', 'nonTraditionalOfferIds', 'hiredNonTraditionalIds', 'nonTraditionalReserveIds']
    .some((field) => Object.hasOwn(staffing, field))) {
    errors.push('Legacy staff selection fields must be migrated before use.');
  }

  if (staffing.initialSelectionComplete === true) {
    if (active.length + nonTraditional.length !== staffingActiveCapacity(staffing)) {
      errors.push(`The Chief and selected staff must fill exactly ${staffingActiveCapacity(staffing)} positions.`);
    }
    if (Object.hasOwn(staffing, 'nonTraditionalSelectionPoolIds')) errors.push('Confirmed staffing cannot retain the selection pool.');
    if (Object.keys(portraits).length !== active.length || active.some((id) => !Object.hasOwn(portraits, id) || !isPortraitId(portraits[id]))
        || !unique(Object.values(portraits))) {
      errors.push('Each active traditional role must have one unique generic portrait.');
    }
  } else {
    if (active.length !== 1 || nonTraditional.length !== 0) errors.push('Before initial selection, only the Chief may be active.');
    const pool = staffing.nonTraditionalSelectionPoolIds;
    if (!Array.isArray(pool) || pool.length !== NONTRADITIONAL_CAPACITY || !unique(pool) || pool.some((id) => !isNonTraditionalId(id))) {
      errors.push('Initial selection needs exactly three distinct nontraditional staff choices.');
    }
    if (Object.keys(portraits).length !== 0) errors.push('Preview portraits become permanent on confirmation.');
  }
  return errors;
}

export function isTraditionalStaffingReady(staffing) {
  return staffing?.initialSelectionComplete === true && validateTraditionalStaffing(staffing).length === 0;
}

/** Report only conflicts present in the saved promise ledger. */
export function inspectPolicyPromiseConflicts(game, proposal, staffing = game?.staffing) {
  if (!isTraditionalStaffingReady(staffing) || !staffing.traditionalActiveIds.includes('policy')) {
    return { status: 'unavailable', reason: 'policy-director-not-active', conflicts: [] };
  }
  if (!nonEmpty(proposal?.issueId) || !Number.isInteger(proposal?.proposedStance)
      || proposal.proposedStance < 0 || proposal.proposedStance > 2
      || !game?.stances || !Object.hasOwn(game.stances, proposal.issueId) || !Array.isArray(game.promiseLedger)) {
    return { status: 'unavailable', reason: 'proposal-or-promise-ledger-unavailable', conflicts: [] };
  }
  const conflicts = game.promiseLedger
    .filter((promise) => promise && nonEmpty(promise.id) && promise.issueId === proposal.issueId
      && Number.isFinite(promise.stance) && promise.stance !== proposal.proposedStance && !promise.broken)
    .map((promise) => ({ promiseId: promise.id, issueId: promise.issueId, stance: promise.stance, stateId: promise.abbr || null, week: promise.week ?? null }));
  return { status: 'ready', issueId: proposal.issueId, proposedStance: proposal.proposedStance, conflicts };
}

export function selectInitialTraditionalStaff(selectedIds, baseStaffing = createInitialTraditionalStaffing(), campaignId = '') {
  const errors = validateTraditionalStaffing(baseStaffing);
  if (baseStaffing?.initialSelectionComplete === true) errors.push('Campaign staff selection has already been confirmed.');
  const previews = previewTraditionalPortraits(campaignId);
  if (!previews.chief) errors.push('The saved campaign ID is required for portrait assignment.');
  if (errors.length) return { ok: false, errors, staffing: null };

  const selection = Array.isArray(selectedIds) ? selectedIds.map(toId) : [];
  if (selection.length !== TRADITIONAL_STAFF_SELECTION_COUNT) {
    errors.push(`Choose exactly ${TRADITIONAL_STAFF_SELECTION_COUNT} non-Chief staff members.`);
  }
  if (!unique(selection)) errors.push('Choose each staff member only once.');
  const pool = baseStaffing.nonTraditionalSelectionPoolIds;
  if (selection.some((id) => id === 'chief' || (!isTraditionalId(id) && !pool.includes(id)))) {
    errors.push('Choose only staff shown in the campaign setup.');
  }
  if (errors.length) return { ok: false, errors, staffing: null };

  const traditionalActiveIds = ['chief', ...selection.filter(isTraditionalId)];
  const staffing = {
    schemaVersion: TRADITIONAL_STAFF_SCHEMA_VERSION,
    selectionPolicyVersion: STAFF_SELECTION_POLICY_VERSION,
    traditionalActiveIds,
    traditionalPortraitByRole: Object.fromEntries(traditionalActiveIds.map((id) => [id, previews[id]])),
    nonTraditionalActiveIds: selection.filter((id) => pool.includes(id)),
    initialSelectionComplete: true,
    agendaByWeek: {},
    briefingHistory: [],
  };
  const stateErrors = validateTraditionalStaffing(staffing);
  return stateErrors.length
    ? { ok: false, errors: stateErrors, staffing: null }
    : { ok: true, errors: [], staffing };
}

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function fillDialogue(template, values) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const value = values[key];
    return value === undefined || value === null || value === '' ? match : String(value);
  });
}

function dialoguePartyKey(party) {
  return party === 'dem' || party === 'rep' ? party : 'coalition';
}

export function getTraditionalStaffDialogue(roleId, situation, party, values = {}, seed = '') {
  const staff = TRADITIONAL_STAFF_BY_ID[roleId];
  if (!staff) return { key: null, text: '', status: 'unavailable', reason: 'unknown-staff-role' };
  if (!['recommendation', 'disagreement', 'debrief'].includes(situation)) {
    return { key: null, text: '', status: 'unavailable', reason: 'unknown-dialogue-situation' };
  }
  if (!PARTY_IDS.has(party)) return { key: null, text: '', status: 'unavailable', reason: 'unsupported-party-context' };

  const partyKey = dialoguePartyKey(party);
  const lines = staff.dialogue[partyKey]?.[situation] || [];
  if (lines.length === 0) return { key: null, text: '', status: 'unavailable', reason: 'dialogue-pack-empty' };
  const lineIndex = (Math.max(0, Math.trunc(Number(values.week) || 0) + stableHash(`${roleId}:${situation}:${seed}`))) % lines.length;
  const substitutions = {
    target: values.targetName || values.targetId || 'the selected target',
    action: values.actionLabel || values.actionId || 'the available action',
    reason: values.reason || values.reasonText || 'the recorded campaign evidence',
    issue: values.issueLabel || values.issueId || 'the selected issue',
    result: values.result || 'the saved outcome is unavailable',
    faction: values.factionLabel || values.partyLabel || 'our coalition',
  };
  return {
    key: `${roleId}.${partyKey}.${situation}.${lineIndex + 1}`,
    text: fillDialogue(lines[lineIndex], substitutions),
    status: 'available',
    partyKey,
    partyId: party,
    lineIndex,
  };
}

function validLegalActionOption(option, roleId) {
  const staff = TRADITIONAL_STAFF_BY_ID[roleId];
  if (!staff || !option || option.legal !== true) return false;
  if (!staff.recommendableActionIds.includes(toId(option.actionId))) return false;
  if (!toId(option.optionId) || !toId(option.actionId) || !toId(option.targetId) || !toId(option.ruleKey)) return false;
  if (!finite(option.cost) || option.cost < 0 || !Array.isArray(option.reasonCodes) || cleanReasonCodes(option.reasonCodes).length === 0) return false;
  if (Array.isArray(option.staffRoleIds) && !option.staffRoleIds.includes(roleId)) return false;
  if (staff.recommendationRequiresEvidence && (!Array.isArray(option.sourceReceiptIds) || option.sourceReceiptIds.filter(nonEmpty).length === 0)) return false;
  return true;
}

function rankedOptions(options, staffId) {
  return [...options].sort((a, b) => {
    const score = (option) => option.staffPriorityByRole?.[staffId] ?? option.staffPriorityScore;
    const aScore = finite(score(a)) ? score(a) : Number.NEGATIVE_INFINITY;
    const bScore = finite(score(b)) ? score(b) : Number.NEGATIVE_INFINITY;
    if (aScore !== bScore) return bScore - aScore;
    const aValue = a.expectedValue?.status === 'available' && finite(a.expectedValue.value) ? a.expectedValue.value : Number.NEGATIVE_INFINITY;
    const bValue = b.expectedValue?.status === 'available' && finite(b.expectedValue.value) ? b.expectedValue.value : Number.NEGATIVE_INFINITY;
    if (aValue !== bValue) return bValue - aValue;
    const effectId = TRADITIONAL_STAFF_BY_ID[staffId]?.effect.id;
    const aSupported = a.supportedStaffEffectIds?.includes(effectId) ? 1 : 0;
    const bSupported = b.supportedStaffEffectIds?.includes(effectId) ? 1 : 0;
    if (aSupported !== bSupported) return bSupported - aSupported;
    return `${a.actionId}:${a.targetId}:${a.optionId}`.localeCompare(`${b.actionId}:${b.targetId}:${b.optionId}`);
  });
}

function valueStatus(option) {
  if (option.expectedValue?.status === 'available' && finite(option.expectedValue.value)) {
    return { status: 'available', value: option.expectedValue.value, source: option.expectedValue.source || null, reason: null };
  }
  return {
    status: 'unavailable',
    value: null,
    source: null,
    reason: option.expectedValue?.reason || option.valueUnavailableReason || 'A value estimate is unavailable for this action.',
  };
}

export function buildStaffBriefing(game, context = {}) {
  const staffing = context.staffing || game?.staffing;
  const staffingErrors = validateTraditionalStaffing(staffing);
  if (staffingErrors.length || !isTraditionalStaffingReady(staffing)) {
    return { schemaVersion: 1, status: 'unavailable', reason: 'traditional-roster-not-ready', errors: staffingErrors, recommendations: [] };
  }
  if (!Array.isArray(context.legalActionOptions)) {
    return { schemaVersion: 1, status: 'unavailable', reason: 'native-legal-action-options-unavailable', recommendations: [] };
  }
  if (!PARTY_IDS.has(game?.party)) {
    return { schemaVersion: 1, status: 'unavailable', reason: 'party-context-unavailable', recommendations: [] };
  }

  const week = Math.max(0, Math.trunc(Number(game?.week) || 0));
  const party = game?.party;
  const recommendations = [];
  staffing.traditionalActiveIds.forEach((staffId) => {
    const staff = TRADITIONAL_STAFF_BY_ID[staffId];
    const options = rankedOptions(context.legalActionOptions.filter((option) => validLegalActionOption(option, staffId)), staffId);
    const option = options[0];
    if (!option) return;

    const reasonCodes = cleanReasonCodes(option.reasonCodes);
    const reason = nonEmpty(option.reasonSummary) ? option.reasonSummary : reasonCodes.join(', ');
    const estimatedValue = valueStatus(option);
    const nativeEffectIds = Array.isArray(option.supportedStaffEffectIds) ? option.supportedStaffEffectIds : [];
    const agendaEligible = nativeEffectIds.includes(staff.effect.id) && option.agendaAllowed !== false;
    const dialogue = getTraditionalStaffDialogue(staffId, 'recommendation', party, {
      week,
      targetName: option.targetName,
      targetId: option.targetId,
      actionLabel: option.actionLabel,
      actionId: option.actionId,
      reason,
      issueLabel: option.issueLabel,
      factionLabel: context.partyVocabulary?.factionLabel || context.partyVocabulary?.teamLabel
        || ({ lib: 'the Libertarian coalition', grn: 'the Green coalition' })[party],
    }, `${option.optionId}:${option.ruleKey}`);
    const recommendationId = `${staffId}:${week}:${option.actionId}:${option.targetId}${option.issueId ? `:${option.issueId}` : ''}${option.adTypeId ? `:${option.adTypeId}:${option.adKind}` : ''}${option.storyId ? `:${option.storyId}:${option.spinMode}` : ''}`;

    recommendations.push({
      id: recommendationId,
      week,
      staffId,
      actionId: option.actionId,
      targetId: option.targetId,
      issueId: option.issueId || null,
      issueLabel: option.issueLabel || null,
      adTypeId: option.adTypeId || null,
      adKind: option.adKind || null,
      storyId: option.storyId || null,
      spinMode: option.spinMode || null,
      targetName: option.targetName || option.targetId,
      actionLabel: option.actionLabel || option.actionId,
      title: option.recommendationTitle || `${staff.title}: ${option.actionLabel || option.actionId}`,
      dialogueKey: dialogue.key,
      dialogue: dialogue.text,
      reasonCodes,
      reasonSummary: reason,
      expectedEffectSummary: agendaEligible
        ? (option.expectedEffectSummary || staff.effect.description)
        : (option.expectedEffectSummary || 'This recommendation is informational.'),
      estimatedValue: estimatedValue.value,
      valueStatus: estimatedValue.status,
      valueUnavailableReason: estimatedValue.reason,
      cost: option.cost,
      actionSlots: Number.isFinite(option.actionSlots) ? option.actionSlots : null,
      incompatibleOptionIds: Array.isArray(option.incompatibleOptionIds) ? [...option.incompatibleOptionIds] : [],
      legal: true,
      ruleKey: option.ruleKey,
      nativeOptionId: option.optionId,
      agendaEligible,
      effectId: staff.effect.id,
      effectScope: staff.effect.scope,
      maxEffectMultiplier: staff.effect.maxEffectMultiplier,
      evidenceSourceReceiptIds: Array.isArray(option.sourceReceiptIds) ? option.sourceReceiptIds.filter(nonEmpty) : [],
      partyContext: PARTY_IDS.has(party) ? party : null,
    });
  });

  return {
    schemaVersion: 1,
    status: recommendations.length ? 'ready' : 'unavailable',
    reason: recommendations.length ? null : 'no-legal-evidence-backed-staff-options',
    week,
    partyContext: PARTY_IDS.has(party) ? party : null,
    recommendations,
  };
}

export function validateStaffRecommendation(recommendation, staffing, legalActionOptions = []) {
  const errors = [];
  if (!recommendation || typeof recommendation !== 'object') return ['Recommendation is missing.'];
  if (!nonEmpty(recommendation.id) || !Number.isFinite(recommendation.week) || recommendation.week < 0) errors.push('Recommendation needs a stable ID and campaign week.');
  if (!isTraditionalStaffingReady(staffing)) errors.push('The traditional roster is not ready.');
  if (!staffing?.traditionalActiveIds?.includes(recommendation.staffId)) errors.push('The recommending staff member is not active.');
  const staff = TRADITIONAL_STAFF_BY_ID[recommendation.staffId];
  if (!staff) errors.push('Recommendation references an unknown staff role.');
  if (!staff?.recommendableActionIds.includes(recommendation.actionId)) errors.push('The action is not registered for this staff role.');
  if (recommendation.legal !== true || !toId(recommendation.targetId) || !toId(recommendation.ruleKey)) errors.push('Recommendation lacks a legal action, target, or native rule key.');
  if (!Array.isArray(recommendation.reasonCodes) || cleanReasonCodes(recommendation.reasonCodes).length === 0) errors.push('Recommendation needs at least one native reason code.');
  const matchingOption = legalActionOptions.find((option) => option.optionId === recommendation.nativeOptionId
    && option.actionId === recommendation.actionId
    && option.targetId === recommendation.targetId
    && (!Number.isFinite(option.week) || option.week === recommendation.week)
    && (option.issueId || null) === (recommendation.issueId || null)
    && (option.adTypeId || null) === (recommendation.adTypeId || null)
    && (option.adKind || null) === (recommendation.adKind || null)
    && (option.storyId || null) === (recommendation.storyId || null)
    && (option.spinMode || null) === (recommendation.spinMode || null)
    && option.ruleKey === recommendation.ruleKey
    && validLegalActionOption(option, recommendation.staffId));
  if (!matchingOption) errors.push('The exact action/target is no longer in the legal native option set.');
  else {
    if (recommendation.cost !== matchingOption.cost) errors.push('Recommendation cost no longer matches the native action cost.');
    if (cleanReasonCodes(recommendation.reasonCodes).join('\u0000') !== cleanReasonCodes(matchingOption.reasonCodes).join('\u0000')) {
      errors.push('Recommendation reasons no longer match the native evidence codes.');
    }
    if (recommendation.effectId !== staff?.effect.id) errors.push('Recommendation references the wrong staff effect.');
    const effectAvailable = Array.isArray(matchingOption.supportedStaffEffectIds)
      && matchingOption.supportedStaffEffectIds.includes(staff?.effect.id) && matchingOption.agendaAllowed !== false;
    if (recommendation.agendaEligible !== effectAvailable) errors.push('The native staff effect registration has changed.');
  }
  return errors;
}

export function createStaffAgenda(recommendation, staffing, legalActionOptions, options = {}) {
  const errors = validateStaffRecommendation(recommendation, staffing, legalActionOptions);
  if (recommendation?.agendaEligible !== true) errors.push('This recommendation is informational and has no registered agenda effect.');
  if (Number(options.actionsTakenThisWeek) > 0 || options.qualifyingActionConsumed === true) {
    errors.push('The weekly agenda is locked after campaign actions begin.');
  }
  if (options.currentAgenda?.status === 'consumed') errors.push('The weekly agenda effect has already been consumed.');
  if (errors.length) return { ok: false, errors, agenda: null };
  return {
    ok: true,
    errors: [],
    agenda: {
      week: recommendation.week,
      staffId: recommendation.staffId,
      recommendationId: recommendation.id,
      actionId: recommendation.actionId,
      targetId: recommendation.targetId,
      issueId: recommendation.issueId || null,
      adTypeId: recommendation.adTypeId || null,
      adKind: recommendation.adKind || null,
      storyId: recommendation.storyId || null,
      spinMode: recommendation.spinMode || null,
      ruleKey: recommendation.ruleKey,
      effectId: recommendation.effectId,
      status: 'unconsumed',
      agendaEligible: recommendation.agendaEligible === true,
    },
  };
}

export function staffAgendaMatchesAction(agenda, action) {
  return !!agenda && !!action
    && agenda.status === 'unconsumed'
    && agenda.actionId === action.actionId
    && agenda.targetId === action.targetId
    && Number.isFinite(agenda.week)
    && agenda.week === action.week
    && (!agenda.issueId || agenda.issueId === action.issueId)
    && (!agenda.adTypeId || agenda.adTypeId === action.adTypeId)
    && (!agenda.adKind || agenda.adKind === action.adKind)
    && (!agenda.storyId || agenda.storyId === action.storyId)
    && (!agenda.spinMode || agenda.spinMode === action.spinMode)
    && nonEmpty(agenda.ruleKey)
    && agenda.ruleKey === action.ruleKey;
}

/** Scale registered native action components without mutating campaign state. */
export function applyTraditionalStaffNativePayload(command, action, payload, options = {}) {
  const supported = {
    'traditional-staff:field:v1': { scope: 'staff.field.turnout-component', actionId: 'volunteers' },
    'traditional-staff:base-liaison:v1': { scope: 'staff.base.aligned-supporter-reach', actionId: 'volunteers' },
    'traditional-staff:communications:v1': { scope: 'staff.communications.message-fit-quality', actionId: 'promise' },
    'traditional-staff:policy:v1': { scope: 'staff.policy.issue-alignment', actionId: 'promise' },
    'traditional-staff:establishment-liaison:v1': { scope: 'staff.establishment.relationship-gate', actionId: 'endorsement' },
    'traditional-staff:fundraising:v1': { scope: 'staff.fundraising.major-donor-yield', actionId: 'fundraise' },
    'traditional-staff:social-media:v1': { scope: 'staff.social-media.engagement', actionId: 'ad' },
    'traditional-staff:media:v1': { scope: 'staff.media.earned-coverage', actionId: 'spin' },
  };
  const rule = supported[command?.effectId];
  if (!rule || rule.scope !== command.scope || command.actionId !== rule.actionId
      || action?.actionId !== command.actionId || action?.targetId !== command.targetId
      || !Number.isFinite(command.week) || action?.week !== command.week
      || (command.issueId || null) !== (action?.issueId || null)
      || (command.adTypeId || null) !== (action?.adTypeId || null)
      || (command.adKind || null) !== (action?.adKind || null)
      || (command.storyId || null) !== (action?.storyId || null)
      || (command.spinMode || null) !== (action?.spinMode || null)
      || (command.nativeOptionId || null) !== (action?.optionId || null)
      || action?.ruleKey !== command.ruleKey || !nonEmpty(command.effectReceiptId)) {
    return { status: 'unavailable', reason: 'unsupported-native-payload', payload };
  }
  if (options.appliedEffectReceiptIds?.includes(command.effectReceiptId)) {
    return { status: 'not-applied', reason: 'duplicate-effect-receipt', payload };
  }
  if (!Number.isFinite(command.multiplier) || command.multiplier < 1 || command.multiplier > 1.1) {
    return { status: 'not-applied', reason: 'invalid-native-effect', payload };
  }
  const existing = options.existingStaffMultiplier ?? 1;
  if (!Number.isFinite(existing) || existing < 1 || existing > 1.1) {
    return { status: 'not-applied', reason: 'invalid-existing-staff-multiplier', payload };
  }
  const combined = Math.min(1.1, existing + command.multiplier - 1);
  if (combined <= existing) return { status: 'not-applied', reason: 'staff-effect-at-cap', payload };
  const factor = combined / existing;
  let nextPayload;
  if (rule.actionId === 'volunteers' || rule.actionId === 'ad') {
    if (!Number.isFinite(payload?.turnoutPoints) || payload.turnoutPoints <= 0
        || (rule.actionId === 'ad' && (action.adTypeId !== 'digital' || action.adKind !== 'pro' || !Number.isFinite(payload.swing) || payload.swing <= 0))) {
      return { status: 'not-applied', reason: 'invalid-native-effect', payload };
    }
    nextPayload = { ...payload, turnoutPoints: payload.turnoutPoints * factor };
  } else if (rule.actionId === 'spin') {
    const nativeChange = action.spinMode === 'amplify' ? 26 : action.spinMode === 'bury' ? -42 : null;
    if (!command.storyId || payload?.storyId !== command.storyId || payload.backfire !== false
        || nativeChange === null || payload.salienceChange !== nativeChange) {
      return { status: 'not-applied', reason: 'invalid-native-effect', payload };
    }
    nextPayload = { ...payload, salienceChange: payload.salienceChange * factor };
  } else if (rule.actionId === 'fundraise') {
    if (action.donorCategory !== 'major-donor-room' || command.donorCategory !== action.donorCategory
        || payload?.donorCategory !== action.donorCategory || !Number.isFinite(payload.donorYieldM) || payload.donorYieldM <= 0) {
      return { status: 'not-applied', reason: 'invalid-native-effect', payload };
    }
    nextPayload = { ...payload, donorYieldM: payload.donorYieldM * factor };
  } else if (rule.actionId === 'endorsement') {
    if (action.nativeEligibilityReason !== 'relationship-threshold'
        || action.nativeEligibilityReason !== command.nativeEligibilityReason
        || action.nativeRelationship !== command.nativeRelationship
        || !Number.isFinite(action.nativeRelationship) || payload?.relationshipBefore !== action.nativeRelationship
        || payload.relationshipChange !== 8) {
      return { status: 'not-applied', reason: 'invalid-native-effect', payload };
    }
    nextPayload = { ...payload, relationshipChange: payload.relationshipChange * factor };
  } else {
    const persuasion = payload?.persuasion;
    const direction = action?.party === 'rep' ? -1 : 1;
    const entries = persuasion && typeof persuasion === 'object' && !Array.isArray(persuasion) ? Object.entries(persuasion) : [];
    if (!['dem', 'rep', 'lib', 'grn'].includes(action?.party)
        || action.party !== command.party || action.nativeOutlookTier !== command.nativeOutlookTier
        || !['hit', 'ok'].includes(payload?.outcomeTier) || payload.outcomeTier !== action.nativeOutlookTier
        || !command.issueId || !entries.length || !Object.hasOwn(persuasion, action.targetId)
        || entries.some(([, value]) => !Number.isFinite(value?.base) || !Number.isFinite(value?.actual)
          || value.base * direction < 0 || value.actual * direction < 0)) {
      return { status: 'not-applied', reason: 'invalid-native-effect', payload };
    }
    nextPayload = { ...payload, persuasion: Object.fromEntries(entries.map(([stateId, value]) => [stateId, {
      ...value, base: value.base * factor, actual: value.actual * factor,
    }])) };
  }
  return {
    status: 'applied',
    payload: nextPayload,
    effectReceiptId: command.effectReceiptId,
    combinedStaffMultiplier: combined,
  };
}

export function planStaffAgendaEffect(agenda, action, staffing, options = {}) {
  if (!agenda || !action) return { status: 'unavailable', reason: 'agenda-or-action-missing', command: null };
  if (options.alreadyConsumed === true || agenda.status === 'consumed') return { status: 'not-applied', reason: 'agenda-already-consumed', command: null };
  if (options.legal !== true || action.legal !== true) return { status: 'not-applied', reason: 'action-not-legal', command: null };
  if (!staffAgendaMatchesAction(agenda, action)) return { status: 'not-applied', reason: 'exact-action-target-mismatch', command: null };
  if (!isTraditionalStaffingReady(staffing) || !staffing.traditionalActiveIds.includes(agenda.staffId)) {
    return { status: 'not-applied', reason: 'advisor-not-active', command: null };
  }
  const staff = TRADITIONAL_STAFF_BY_ID[agenda.staffId];
  if (!staff || agenda.effectId !== staff.effect.id) return { status: 'not-applied', reason: 'effect-id-mismatch', command: null };
  const supportedEffectIds = Array.isArray(action.supportedStaffEffectIds) ? action.supportedStaffEffectIds : [];
  if (!staff.effect.actionIds.includes(action.actionId) || !agenda.agendaEligible || !supportedEffectIds.includes(staff.effect.id)) {
    return { status: 'not-applied', reason: 'native-effect-not-registered', command: null };
  }
  if (!nonEmpty(options.actionReceiptId)) return { status: 'not-applied', reason: 'action-receipt-missing', command: null };
  const effectReceiptId = `${options.actionReceiptId}:staff-agenda:${staff.effect.id}`;
  if (Array.isArray(options.appliedEffectReceiptIds) && options.appliedEffectReceiptIds.includes(effectReceiptId)) {
    return { status: 'not-applied', reason: 'duplicate-effect-receipt', command: null };
  }

  const requested = finite(options.effectMultiplier) ? options.effectMultiplier : staff.effect.maxEffectMultiplier;
  const multiplier = Math.max(1, Math.min(staff.effect.maxEffectMultiplier, requested));
  return {
    status: 'ready',
    reason: null,
    command: {
      commandType: 'traditional-staff-agenda-effect',
      schemaVersion: TRADITIONAL_STAFF_SCHEMA_VERSION,
      effectId: staff.effect.id,
      scope: staff.effect.scope,
      actionId: action.actionId,
      targetId: action.targetId,
      week: action.week,
      issueId: action.issueId || null,
      adTypeId: action.adTypeId || null,
      adKind: action.adKind || null,
      storyId: action.storyId || null,
      spinMode: action.spinMode || null,
      nativeOptionId: action.optionId || null,
      party: action.party || null,
      nativeOutlookTier: action.nativeOutlookTier || null,
      nativeEligibilityReason: action.nativeEligibilityReason || null,
      nativeRelationship: Number.isFinite(action.nativeRelationship) ? action.nativeRelationship : null,
      donorCategory: action.donorCategory || null,
      ruleKey: agenda.ruleKey,
      actionReceiptId: options.actionReceiptId,
      effectReceiptId,
      multiplier,
      maximumMultiplier: staff.effect.maxEffectMultiplier,
    },
  };
}

/** Produce the state and receipt changes for one completed matching action. */
/** @param {any} agenda @param {any} action @param {{actionReceiptId?: string, application?: any}} [options] */
export function recordStaffAgendaResolution(agenda, action, { actionReceiptId, application } = {}) {
  if (agenda?.status === 'consumed') return { status: 'already-consumed', agenda, actionReceiptPatch: null };
  if (action?.legal !== true || action?.completed !== true || !nonEmpty(actionReceiptId)
      || !staffAgendaMatchesAction(agenda, action)) {
    return { status: 'not-consumed', reason: 'completed-matching-action-required', agenda, actionReceiptPatch: null };
  }
  const expectedEffectReceiptId = `${actionReceiptId}:staff-agenda:${agenda.effectId}`;
  if (application?.status === 'applied' && application.effectReceiptId !== expectedEffectReceiptId) {
    return { status: 'not-consumed', reason: 'effect-receipt-mismatch', agenda, actionReceiptPatch: null };
  }
  const effectReceiptId = application?.status === 'applied' ? expectedEffectReceiptId : null;
  return {
    status: 'consumed',
    agenda: { ...agenda, status: 'consumed', actionReceiptId, effectReceiptId },
    actionReceiptPatch: { staffAgendaEffectReceiptId: effectReceiptId },
  };
}

export function buildStaffDisagreement(recommendations = [], party = null, values = {}) {
  const conflicts = (first, second) => {
    if (first.actionId === second.actionId && first.targetId === second.targetId && first.issueId === second.issueId
        && first.adTypeId === second.adTypeId && first.adKind === second.adKind
        && first.storyId === second.storyId && first.spinMode === second.spinMode) return false;
    const explicit = first.incompatibleOptionIds?.includes(second.nativeOptionId)
      || second.incompatibleOptionIds?.includes(first.nativeOptionId);
    const limitedTime = Number.isFinite(values.actionsLeft) && Number.isFinite(first.actionSlots)
      && Number.isFinite(second.actionSlots) && values.actionsLeft < first.actionSlots + second.actionSlots;
    const limitedCash = Number.isFinite(values.funds) && Number.isFinite(first.cost)
      && Number.isFinite(second.cost) && values.funds < first.cost + second.cost;
    return Boolean(explicit || limitedTime || limitedCash);
  };
  const pair = recommendations.find((first, index) => recommendations.slice(index + 1).some((second) => conflicts(first, second)));
  if (!pair) return null;
  const firstIndex = recommendations.indexOf(pair);
  const second = recommendations.slice(firstIndex + 1).find((candidate) => conflicts(pair, candidate));
  const firstStaff = TRADITIONAL_STAFF_BY_ID[pair.staffId];
  const secondStaff = TRADITIONAL_STAFF_BY_ID[second?.staffId];
  if (!firstStaff || !secondStaff || !second) return null;
  return {
    firstRecommendationId: pair.id,
    secondRecommendationId: second.id,
    firstPriority: { staffId: pair.staffId, actionId: pair.actionId, targetId: pair.targetId, actionLabel: pair.actionLabel, targetName: pair.targetName, reasonCodes: [...pair.reasonCodes] },
    secondPriority: { staffId: second.staffId, actionId: second.actionId, targetId: second.targetId, actionLabel: second.actionLabel, targetName: second.targetName, reasonCodes: [...second.reasonCodes] },
    chiefSummary: getTraditionalStaffDialogue('chief', 'disagreement', party, {
      ...values,
      targetName: pair.targetName || pair.targetId,
      reason: pair.reasonSummary || pair.reasonCodes.join(', '),
    }, `${pair.id}:${second.id}`).text,
  };
}

export function buildStaffDebrief(agenda, actionReceipts = [], options = {}) {
  if (!agenda || !TRADITIONAL_STAFF_BY_ID[agenda.staffId]) {
    return { status: 'unavailable', reason: 'agenda-missing-or-invalid', outcomeReceiptId: null };
  }
  if (options.receiptWindowComplete !== true) {
    return { status: 'unavailable', reason: 'week-receipt-window-incomplete', outcomeReceiptId: null };
  }
  const weekReceipts = actionReceipts.filter((item) => agenda.week === undefined || item.week === agenda.week);
  const receipt = weekReceipts.find((item) => item.actionId === agenda.actionId
    && item.targetId === agenda.targetId
    && (!agenda.issueId || item.issueId === agenda.issueId)
    && (!agenda.adTypeId || item.adTypeId === agenda.adTypeId)
    && (!agenda.adKind || item.adKind === agenda.adKind)
    && (!agenda.storyId || item.storyId === agenda.storyId)
    && (!agenda.spinMode || item.spinMode === agenda.spinMode)
    && (agenda.week === undefined || item.week === agenda.week));
  const keyOf = (item) => `${item.actionId}:${item.targetId}:${item.issueId || ''}:${item.adTypeId || ''}:${item.adKind || ''}:${item.storyId || ''}:${item.spinMode || ''}`;
  const completedTargets = new Set(weekReceipts.map(keyOf));
  const unmetPriority = (Array.isArray(options.otherRecommendations) ? options.otherRecommendations : [])
    .filter((item) => item?.legal === true
      && item.id !== agenda.recommendationId
      && nonEmpty(item.staffId)
      && nonEmpty(item.actionId)
      && nonEmpty(item.targetId)
      && (item.week === undefined || item.week === agenda.week)
      && cleanReasonCodes(item.reasonCodes).length > 0
      && !completedTargets.has(keyOf(item)))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map((item) => ({
      recommendationId: item.id,
      staffId: item.staffId,
      actionId: item.actionId,
      targetId: item.targetId,
      issueId: item.issueId || null,
      adTypeId: item.adTypeId || null,
      adKind: item.adKind || null,
      storyId: item.storyId || null,
      spinMode: item.spinMode || null,
      reasonCodes: cleanReasonCodes(item.reasonCodes),
    }))[0] || null;
  if (!receipt) {
    return {
      status: 'not-acted-on',
      week: agenda.week,
      staffId: agenda.staffId,
      recommendationId: agenda.recommendationId,
      actionId: agenda.actionId,
      targetId: agenda.targetId,
      issueId: agenda.issueId || null,
      adTypeId: agenda.adTypeId || null,
      adKind: agenda.adKind || null,
      storyId: agenda.storyId || null,
      spinMode: agenda.spinMode || null,
      outcomeReceiptId: null,
      result: null,
      unmetPriority,
      dialogue: getTraditionalStaffDialogue(agenda.staffId, 'debrief', options.party, {
        week: agenda.week,
        actionId: agenda.actionId,
        targetId: agenda.targetId,
        result: 'no matching action receipt was recorded for this week',
      }, `${agenda.recommendationId}:unacted`).text,
    };
  }
  const result = nonEmpty(receipt.outcomeSummary)
    ? receipt.outcomeSummary
    : nonEmpty(receipt.result)
      ? receipt.result
      : 'a matching action was logged; outcome details are unavailable';
  const effectReceiptId = receipt.staffAgendaEffectReceiptId || receipt.staffAgenda?.effectReceiptId || null;
  return {
    status: effectReceiptId ? 'used' : 'acted-on',
    week: agenda.week,
    staffId: agenda.staffId,
    recommendationId: agenda.recommendationId,
    actionId: agenda.actionId,
    targetId: agenda.targetId,
    issueId: agenda.issueId || null,
    adTypeId: agenda.adTypeId || null,
    adKind: agenda.adKind || null,
    storyId: agenda.storyId || null,
    spinMode: agenda.spinMode || null,
    outcomeReceiptId: receipt.receiptId || receipt.id || null,
    effectReceiptId,
    result,
    unmetPriority,
    dialogue: getTraditionalStaffDialogue(agenda.staffId, 'debrief', options.party, {
      week: agenda.week,
      actionId: agenda.actionId,
      targetId: agenda.targetId,
      result,
    }, `${agenda.recommendationId}:${receipt.receiptId || receipt.id || ''}`).text,
  };
}

export function appendStaffBriefHistory(history, entry, limit = 8) {
  const cap = Math.max(1, Math.min(8, Math.trunc(Number(limit) || 8)));
  if (!entry || !Number.isFinite(entry.week) || !nonEmpty(entry.recommendationId)) return Array.isArray(history) ? history.slice(-cap) : [];
  const previous = Array.isArray(history) ? history : [];
  const withoutDuplicate = previous.filter((item) => item?.recommendationId !== entry.recommendationId);
  return [...withoutDuplicate, { ...entry }].slice(-cap);
}

export const TRADITIONAL_STAFF_PARTY_CONTEXTS = Object.freeze(['dem', 'rep', 'lib', 'grn']);
