import { STATE_LIST } from '@/data/states';
import { GROUP_BY_ID } from '@/data/demographics';
import { FACTION_SETS } from '@/lib/factions';
import {
  BALLOT_MEASURE_ISSUES,
  BALLOT_MEASURE_RULES,
  BALLOT_MEASURE_ROUTE_TYPES,
  BALLOT_MEASURE_STATUSES,
} from '@/data/ballotMeasureRules';

const STATE_ABBRS = new Set(STATE_LIST.filter((state) => state.abbr !== 'DC').map((state) => state.abbr));
const ISSUE_IDS = new Set(Object.keys(BALLOT_MEASURE_ISSUES));
const ROUTE_TYPES = new Set(BALLOT_MEASURE_ROUTE_TYPES);
const STATUSES = new Set(BALLOT_MEASURE_STATUSES);
const EFFECT_KEYS = new Set(['funds', 'factions', 'groups', 'turnout']);
const EFFECT_MAP_KEYS = new Set(['factions', 'groups', 'turnout']);
const FACTION_IDS = new Set(Object.values(FACTION_SETS).flat().map((faction) => faction.id));
const EFFECT_LIMITS = Object.freeze({ funds: 100, factions: 25, groups: 10, turnout: 20 });
const SIGNATURE_KINDS = new Set([
  'raw-count',
  'percent-of-prior-gubernatorial-vote',
  'percent-of-prior-presidential-vote',
  'percent-of-registered-voters',
]);
const APPROVAL_KINDS = new Set(['simple-majority', 'supermajority']);
const MEASURE_TYPES = new Set(['citizen-initiative', 'referendum', 'legislative-referral']);
const MEASURE_POSITIONS = new Set(['support', 'oppose', 'mixed', 'neutral']);

const isObject = (value) => value != null && typeof value === 'object' && !Array.isArray(value);
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isIsoDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const isWeek = (value) => Number.isInteger(value) && value >= 0;

function addIssue(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

function validateDeadlines(deadlines, path, errors) {
  if (!isObject(deadlines)) {
    addIssue(errors, path, 'must provide filing, signature, qualification, and election deadlines');
    return;
  }
  ['filing', 'signatures', 'qualification', 'election'].forEach((key) => {
    if (!isIsoDate(deadlines[key])) addIssue(errors, `${path}.${key}`, 'must be a valid ISO date (YYYY-MM-DD)');
  });
  if (['filing', 'signatures', 'qualification', 'election'].every((key) => isIsoDate(deadlines[key]))) {
    if (deadlines.filing > deadlines.signatures) addIssue(errors, path, 'filing must not follow the signature deadline');
    if (deadlines.signatures > deadlines.qualification) addIssue(errors, path, 'signature deadline must not follow the qualification deadline');
    if (deadlines.qualification > deadlines.election) addIssue(errors, path, 'qualification must not follow election day');
  }
}

function validateSignatureRequirement(requirement, path, errors) {
  if (!isObject(requirement)) {
    addIssue(errors, path, 'must describe a sourced signature threshold');
    return;
  }
  if (!SIGNATURE_KINDS.has(requirement.kind)) addIssue(errors, `${path}.kind`, 'is not a supported legal threshold type');
  if (!isFiniteNumber(requirement.value) || requirement.value <= 0 || requirement.value > 100_000_000) {
    addIssue(errors, `${path}.value`, 'must be a finite positive threshold');
  }
  if (typeof requirement.basis !== 'string' || !requirement.basis.trim()) {
    addIssue(errors, `${path}.basis`, 'must name the legal basis used to calculate the threshold');
  }
  if (requirement.distribution != null) {
    if (!isObject(requirement.distribution)
      || typeof requirement.distribution.kind !== 'string'
      || !requirement.distribution.kind.trim()
      || !Number.isInteger(requirement.distribution.minimum)
      || requirement.distribution.minimum < 1) {
      addIssue(errors, `${path}.distribution`, 'must specify a valid geographic distribution rule');
    }
  }
}

function routeRequiresSignatures(routeType) {
  return routeType !== 'legislative-referral';
}

function validateApprovalThreshold(threshold, path, errors) {
  if (!isObject(threshold)) {
    addIssue(errors, path, 'must specify the required vote threshold');
    return;
  }
  if (!APPROVAL_KINDS.has(threshold.kind)) addIssue(errors, `${path}.kind`, 'must be simple-majority or supermajority');
  if (!isFiniteNumber(threshold.percent) || threshold.percent < 50 || threshold.percent > 100) {
    addIssue(errors, `${path}.percent`, 'must be between 50 and 100');
  }
}

function validateSource(source, path, errors) {
  if (!isObject(source)) {
    addIssue(errors, path, 'must cite the official state source for this rule');
    return;
  }
  if (source.authority !== 'state-government') addIssue(errors, `${path}.authority`, 'must be state-government');
  if (typeof source.title !== 'string' || !source.title.trim()) addIssue(errors, `${path}.title`, 'is required');
  if (typeof source.url !== 'string' || !/^https:\/\//i.test(source.url)) addIssue(errors, `${path}.url`, 'must be an HTTPS source URL');
  if (!isIsoDate(source.checkedOn)) addIssue(errors, `${path}.checkedOn`, 'must be the date the legal source was checked');
}

function findRule(routeId, rules) {
  return (Array.isArray(rules) ? rules : []).find((rule) => rule?.id === routeId) || null;
}

function validateRule(rule, path, errors) {
  if (!isObject(rule)) {
    addIssue(errors, path, 'must reference a valid scenario legal-route record');
    return;
  }
  if (typeof rule.id !== 'string' || !rule.id.trim()) addIssue(errors, `${path}.id`, 'is required');
  if (!STATE_ABBRS.has(rule.state)) addIssue(errors, `${path}.state`, 'must be a valid U.S. state abbreviation');
  if (!ROUTE_TYPES.has(rule.routeType)) addIssue(errors, `${path}.routeType`, 'is not a supported qualification route');
  if (rule.available !== true) addIssue(errors, `${path}.available`, 'this route is not legally available for the scenario');
  if (!Array.isArray(rule.issueIds) || !rule.issueIds.length || rule.issueIds.some((id) => !ISSUE_IDS.has(id))) {
    addIssue(errors, `${path}.issueIds`, 'must list one or more supported social-issue measures');
  }
  validateDeadlines(rule.deadlines, `${path}.deadlines`, errors);
  if (routeRequiresSignatures(rule.routeType)) {
    validateSignatureRequirement(rule.signatureRequirement, `${path}.signatureRequirement`, errors);
  } else if (rule.signatureRequirement != null) {
    validateSignatureRequirement(rule.signatureRequirement, `${path}.signatureRequirement`, errors);
  }
  validateApprovalThreshold(rule.approvalThreshold, `${path}.approvalThreshold`, errors);
  validateSource(rule.source, `${path}.source`, errors);
}

function sameThreshold(left, right) {
  return left?.kind === right?.kind && left?.percent === right?.percent;
}

function sameDeadlines(left, right) {
  return ['filing', 'signatures', 'qualification', 'election'].every((key) => left?.[key] === right?.[key]);
}

function sameSignatureRequirement(left, right) {
  return left?.kind === right?.kind
    && left?.value === right?.value
    && left?.basis === right?.basis
    && left?.distribution?.kind === right?.distribution?.kind
    && left?.distribution?.minimum === right?.distribution?.minimum;
}

function validateEffectBundle(effects, path, errors) {
  if (!isObject(effects)) {
    addIssue(errors, path, 'must be an object');
    return;
  }
  Object.entries(effects).forEach(([key, value]) => {
    if (!EFFECT_KEYS.has(key)) {
      addIssue(errors, `${path}.${key}`, 'is not an allowed campaign effect; direct polling and margin bonuses are prohibited');
      return;
    }
    if (EFFECT_MAP_KEYS.has(key)) {
      if (!isObject(value)) {
        addIssue(errors, `${path}.${key}`, 'must be a map of campaign IDs to finite changes');
        return;
      }
      Object.entries(value).forEach(([id, amount]) => {
        const validId = key === 'turnout'
          ? STATE_ABBRS.has(id)
          : key === 'groups'
            ? !!GROUP_BY_ID[id]
            : FACTION_IDS.has(id);
        const limit = EFFECT_LIMITS[key];
        if (!validId || !id.trim() || !isFiniteNumber(amount) || Math.abs(amount) > limit) {
          addIssue(errors, `${path}.${key}.${id}`, `must use a supported ID and a finite change within ±${limit}`);
        }
      });
    } else if (!isFiniteNumber(value) || Math.abs(value) > EFFECT_LIMITS[key]) {
      addIssue(errors, `${path}.${key}`, `must be a finite change within ±${EFFECT_LIMITS[key]}`);
    }
  });
}

/** Validate one scenario-supplied state legal route. */
export function validateBallotMeasureRule(rule) {
  const errors = [];
  validateRule(rule, 'rule', errors);
  return { valid: errors.length === 0, errors };
}

/** Validate one ballot-measure record against its scenario's cited legal route. */
export function validateBallotMeasureRecord(record, rules = BALLOT_MEASURE_RULES) {
  const errors = [];
  if (!isObject(record)) return { valid: false, errors: ['record: must be an object'] };
  if (typeof record.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id)) addIssue(errors, 'record.id', 'must be a stable kebab-case ID');
  if (!STATE_ABBRS.has(record.state)) addIssue(errors, 'record.state', 'must be a valid U.S. state abbreviation');
  if (!ISSUE_IDS.has(record.issueId)) addIssue(errors, 'record.issueId', 'must be abortion, gun-control, marriage-equality, or trans');
  if (typeof record.title !== 'string' || !record.title.trim()) addIssue(errors, 'record.title', 'is required');
  if (typeof record.summary !== 'string' || !record.summary.trim()) addIssue(errors, 'record.summary', 'is required');
  if (typeof record.sponsor !== 'string' || !record.sponsor.trim()) addIssue(errors, 'record.sponsor', 'must identify the measure sponsor or referring body');
  if (!MEASURE_TYPES.has(record.measureType)) addIssue(errors, 'record.measureType', 'must be citizen-initiative, referendum, or legislative-referral');
  if (typeof record.proposalText !== 'string' || !record.proposalText.trim()) addIssue(errors, 'record.proposalText', 'must include the official proposal text or a concise sourced summary');
  if (typeof record.proposalUrl !== 'string' || !/^https:\/\//i.test(record.proposalUrl)) addIssue(errors, 'record.proposalUrl', 'must link to the official proposal or state election record');
  if (!Number.isInteger(record.position) || record.position < 0 || record.position > 2) addIssue(errors, 'record.position', 'must match a platform position from 0 to 2');
  if (!STATUSES.has(record.status)) addIssue(errors, 'record.status', 'is not a recognized qualification status');
  if (typeof record.routeId !== 'string' || !record.routeId.trim()) addIssue(errors, 'record.routeId', 'must point to a scenario legal-route record');

  const route = findRule(record.routeId, rules);
  if (!route) {
    addIssue(errors, 'record.routeId', 'does not match a supplied, verified legal-route record');
  } else {
    validateRule(route, `route(${route.id})`, errors);
    if (route.state !== record.state) addIssue(errors, 'record.routeId', 'route state must match the measure state');
    if (!route.issueIds?.includes(record.issueId)) addIssue(errors, 'record.issueId', 'the cited route does not allow this issue');
    if (!sameDeadlines(record.deadlines, route.deadlines)) addIssue(errors, 'record.deadlines', 'must exactly match the legal-route deadlines');
    if (routeRequiresSignatures(route.routeType) && !sameSignatureRequirement(record.signatureRequirement, route.signatureRequirement)) {
      addIssue(errors, 'record.signatureRequirement', 'must exactly match the legal-route requirement');
    } else if (!routeRequiresSignatures(route.routeType) && route.signatureRequirement != null
      && !sameSignatureRequirement(record.signatureRequirement, route.signatureRequirement)) {
      addIssue(errors, 'record.signatureRequirement', 'must exactly match any optional legal-route requirement');
    }
    if (!sameThreshold(record.approvalThreshold, route.approvalThreshold)) addIssue(errors, 'record.approvalThreshold', 'must exactly match the legal-route threshold');
  }

  if (!isObject(record.polling)
    || !['support', 'oppose', 'undecided'].every((key) => isFiniteNumber(record.polling[key]) && record.polling[key] >= 0 && record.polling[key] <= 100)
    || (isObject(record.polling) && record.polling.support + record.polling.oppose + record.polling.undecided > 100.5)) {
    addIssue(errors, 'record.polling', 'must include bounded support, opposition, and undecided percentages totaling no more than 100%');
  }
  if (!isObject(record.polling?.source)
    || typeof record.polling.source.pollster !== 'string' || !record.polling.source.pollster.trim()
    || !isIsoDate(record.polling.source.fieldDate)
    || !isFiniteNumber(record.polling.source.sampleSize) || record.polling.source.sampleSize <= 0
    || typeof record.polling.source.url !== 'string' || !/^https:\/\//i.test(record.polling.source.url)) {
    addIssue(errors, 'record.polling.source', 'must identify the pollster, field date, sample size, and public source URL');
  }
  if (!isObject(record.partyPositions)
    || !['dem', 'rep', 'lib', 'grn'].every((party) => MEASURE_POSITIONS.has(record.partyPositions[party]))) {
    addIssue(errors, 'record.partyPositions', 'must record a supported position for each modeled party');
  }
  if (!isObject(record.factionPositions)
    || Object.entries(record.factionPositions).some(([id, position]) => !FACTION_IDS.has(id) || !MEASURE_POSITIONS.has(position))) {
    addIssue(errors, 'record.factionPositions', 'must map recognized faction IDs to support, oppose, mixed, or neutral');
  }

  if (record.deadlines) validateDeadlines(record.deadlines, 'record.deadlines', errors);
  const needsSignatures = routeRequiresSignatures(route?.routeType);
  if (needsSignatures || record.signatureRequirement != null) {
    validateSignatureRequirement(record.signatureRequirement, 'record.signatureRequirement', errors);
  }
  validateApprovalThreshold(record.approvalThreshold, 'record.approvalThreshold', errors);
  if (needsSignatures && (!isObject(record.signatures)
    || !isFiniteNumber(record.signatures.collected)
    || record.signatures.collected < 0
    || !isFiniteNumber(record.signatures.required)
    || record.signatures.required <= 0)) {
    addIssue(errors, 'record.signatures', 'must include finite collected and required signature counts');
  } else if (record.signatures != null && (!isObject(record.signatures)
    || !isFiniteNumber(record.signatures.collected)
    || record.signatures.collected < 0
    || !isFiniteNumber(record.signatures.required)
    || record.signatures.required <= 0)) {
    addIssue(errors, 'record.signatures', 'must include finite collected and required signature counts when supplied');
  }
  if (['qualified', 'certified', 'approved', 'defeated'].includes(record.status)) {
    if (!isIsoDate(record.qualifiedAt)) addIssue(errors, 'record.qualifiedAt', 'is required for a qualified measure');
    if (needsSignatures && isObject(record.signatures) && isFiniteNumber(record.signatures.collected)
      && isFiniteNumber(record.signatures.required) && record.signatures.collected < record.signatures.required) {
      addIssue(errors, 'record.signatures', 'a qualified measure must have met its signature requirement');
    }
  }
  if (!isObject(record.eventWindow) || !isWeek(record.eventWindow.openWeek)
    || !isWeek(record.eventWindow.closeWeek) || record.eventWindow.openWeek > record.eventWindow.closeWeek) {
    addIssue(errors, 'record.eventWindow', 'must provide a valid inclusive campaign-week window');
  }
  validateEffectBundle(record.measureEffects?.passed, 'record.measureEffects.passed', errors);
  validateEffectBundle(record.measureEffects?.failed, 'record.measureEffects.failed', errors);
  if (!Array.isArray(record.choices) || record.choices.length < 2 || record.choices.length > 3) {
    addIssue(errors, 'record.choices', 'must contain two or three response choices');
  } else {
    record.choices.forEach((choice, index) => {
      const path = `record.choices[${index}]`;
      if (!isObject(choice)) {
        addIssue(errors, path, 'must be an object');
        return;
      }
      if (typeof choice.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(choice.id)) addIssue(errors, `${path}.id`, 'must be kebab-case');
      if (typeof choice.label !== 'string' || !choice.label.trim()) addIssue(errors, `${path}.label`, 'is required');
      if (typeof choice.text !== 'string' || !choice.text.trim()) addIssue(errors, `${path}.text`, 'is required');
      validateEffectBundle(choice.effects, `${path}.effects`, errors);
    });
  }

  return { valid: errors.length === 0, errors, route: route || null };
}

/** Keep only records whose legal route and scenario data pass validation. */
export function sanitizeBallotMeasures(records, rules = BALLOT_MEASURE_RULES) {
  const measures = [];
  const rejected = [];
  const seenIds = new Set();
  (Array.isArray(records) ? records : []).forEach((record) => {
    const result = validateBallotMeasureRecord(record, rules);
    if (result.valid && !seenIds.has(record.id)) {
      seenIds.add(record.id);
      measures.push(record);
    } else {
      rejected.push({ record, errors: result.valid ? ['record.id: duplicate measure ID'] : result.errors });
    }
  });
  return { measures, rejected };
}

/**
 * Fail-closed campaign eligibility check. `stateLead` is player-perspective
 * points (negative means the player trails); `stateAgreement` is a 0–1 share
 * computed from the modeled state issue fit for the measure position.
 * @param {{ stateLead?: number, stateAgreement?: number, rules?: readonly any[] }} [context]
 */
export function ballotMeasureEligibility(game, record, context = {}) {
  const {
    stateLead,
    stateAgreement,
    rules = BALLOT_MEASURE_RULES,
  } = context;
  const validation = validateBallotMeasureRecord(record, rules);
  if (!validation.valid) return { eligible: false, reason: 'measure data failed legal validation', errors: validation.errors };
  if (!game || !['qualified', 'certified'].includes(record.status)) return { eligible: false, reason: 'measure is not qualified for the ballot' };
  if (!Number.isInteger(game.week) || game.week < record.eventWindow.openWeek || game.week > record.eventWindow.closeWeek) {
    return { eligible: false, reason: 'measure is outside its campaign event window' };
  }
  if (!isFiniteNumber(game.stances?.[record.issueId]) || game.stances[record.issueId] !== record.position) {
    return { eligible: false, reason: 'campaign position does not match the measure position' };
  }
  if (!isFiniteNumber(stateLead) || stateLead > -10) return { eligible: false, reason: 'campaign must trail by at least 10 points in the state' };
  if (!isFiniteNumber(stateAgreement) || stateAgreement < 0 || stateAgreement > 1 || stateAgreement < 0.6) {
    return { eligible: false, reason: 'at least 60% of the state must agree with the campaign position' };
  }
  return {
    eligible: true,
    reason: 'qualified measure, state position, polling deficit, and agreement requirements are met',
    route: validation.route,
  };
}

/** Create a decision-card descriptor only after every qualification gate passes. */
export function createBallotMeasureEvent(game, record, context = {}) {
  const eligibility = ballotMeasureEligibility(game, record, context);
  if (!eligibility.eligible) return null;
  return {
    id: `ballot-measure-${record.id}`,
    type: 'ballot-measure',
    measureId: record.id,
    title: record.title,
    text: record.summary,
    state: record.state,
    issueId: record.issueId,
    receiptRequired: true,
    why: `The measure is legally qualified in ${record.state}, and your campaign meets the state-trail and issue-agreement thresholds.`,
    measureEffects: record.measureEffects,
    oncePerScenario: true,
    choices: record.choices.map((choice) => ({ ...choice, effects: { ...choice.effects } })),
  };
}
