import { optimizeWeeklyCampaignPortfolio } from './aiPortfolioPlanner.js';

/**
 * Build 34 portable strategic planner.
 *
 * This module deliberately has no game-state, React, or forecast imports. The
 * Build 33 integration adapter supplies rule-aware marginal utilities from the
 * shared voter/seat forecast engine, then applies selected actions through the
 * existing campaign resolvers.
 */

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const stableCompare = (a, b) => (b.score - a.score) || String(a.id).localeCompare(String(b.id));
const FORECAST_RESULT_FIELDS = [
  'marginalObjectiveDelta', 'riskAdjustedDelta', 'utility', 'value',
  'benefitUtility', 'campaignerUtilityPerWeek', 'activeCampaignUtility',
  'acceptUtility', 'rejectUtility', 'urgentLocalNewsValue', 'thresholdValue',
];

function requireMatchingForecastRule(result, activeRuleKey, label) {
  if (result?.ruleKey && activeRuleKey && result.ruleKey !== activeRuleKey) {
    throw new Error(`${label} forecast used ${result.ruleKey}; active rules are ${activeRuleKey}`);
  }
  const hasForecastValue = result && typeof result === 'object' &&
    FORECAST_RESULT_FIELDS.some((field) => result[field] !== null && result[field] !== undefined && result[field] !== '');
  if (activeRuleKey && hasForecastValue && !result.ruleKey) {
    throw new Error(`${label} forecast must include the active rule key ${activeRuleKey}`);
  }
}

function readForecastValue(result, activeRuleKey, label, fields = ['marginalObjectiveDelta', 'riskAdjustedDelta', 'utility', 'value']) {
  if (activeRuleKey && (result === null || result === undefined || typeof result !== 'object')) {
    throw new Error(`${label} forecast must return a rule-tagged result object`);
  }
  requireMatchingForecastRule(result, activeRuleKey, label);
  if (result && typeof result === 'object') {
    for (const field of fields) {
      const value = result[field];
      if (value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) {
        return Number(value);
      }
    }
    if (activeRuleKey) throw new Error(`${label} forecast did not include a numeric value`);
    return 0;
  }
  return finite(result);
}

function requireNumericFields(result, fields, label) {
  const missing = fields.filter((field) => result?.[field] === null || result?.[field] === undefined ||
    result?.[field] === '' || !Number.isFinite(Number(result?.[field])));
  if (missing.length) throw new Error(`${label} evaluator must return numeric ${missing.join(', ')}`);
}

function isUnavailable(candidate, evaluated = null) {
  return candidate?.eligible === false || candidate?.feasible === false ||
    evaluated?.eligible === false || evaluated?.feasible === false;
}

/** @param {any[]} records @param {string} label @param {(record: any, index: number) => string} [getId] */
function requireUniqueStableIds(records, label, getId = (record) => record?.id) {
  if (records === null || records === undefined) return [];
  if (!Array.isArray(records)) throw new TypeError(`${label} candidates must be an array`);
  const seenIds = new Set();
  for (const [index, record] of records.entries()) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new TypeError(`${label} candidate ${index} must be a record`);
    }
    const id = getId(record, index);
    const normalizedId = id === null || id === undefined ? '' : String(id).trim();
    if (!normalizedId) throw new Error(`${label} candidate ${index} must have a stable ID`);
    if (seenIds.has(normalizedId)) throw new Error(`${label} candidates must have unique stable IDs: ${normalizedId}`);
    seenIds.add(normalizedId);
  }
  return records;
}

function requireMatchingCandidateIdentity(evaluated, candidate, label) {
  if (evaluated?.id !== null && evaluated?.id !== undefined &&
    String(evaluated.id).trim() !== String(candidate.id).trim()) {
    throw new Error(`${label} evaluator changed candidate identity ${candidate.id} to ${evaluated.id}`);
  }
}

/**
 * Describe the marginal outcomes the native evaluator must score this week.
 * This selects strategic lenses only; Build 33 remains authoritative for every
 * vote, threshold, elector, and seat calculation. Scoring callbacks receive
 * this guidance and the active rule key; rule-tagged stale results are rejected.
 * @param {{ party?: string, rules?: { houseRule?: string, electoralRule?: string, popularVote?: boolean, thirdMode?: string } }} [input]
 */
export function buildElectionStrategyGuidance({ party, rules = {} } = {}) {
  const houseRule = ['standard', 'pr', 'mmp'].includes(rules.houseRule) ? rules.houseRule : 'standard';
  const electoralRule = ['standard', 'proportional', 'district'].includes(rules.electoralRule)
    ? rules.electoralRule
    : 'standard';
  const popularVote = Boolean(rules.popularVote);
  const minorParty = party === 'grn' || party === 'lib';
  const fourParty = rules.thirdMode === 'surge';

  const house = houseRule === 'pr'
    ? {
      rule: 'pr',
      targetLevels: ['state', 'national'],
      objectives: ['state-proportional-seat-value', 'national-5-percent-qualification'],
      threshold: { type: 'national-party-vote-share', minimum: 5 },
    }
    : houseRule === 'mmp'
      ? {
        rule: 'mmp',
        targetLevels: ['district', 'state', 'national'],
        objectives: ['direct-constituency-seats', 'party-list-seats', 'national-qualification'],
        threshold: { type: 'national-party-vote-share-or-direct-seats', minimumShare: 5, directSeatException: 3 },
      }
      : {
        rule: 'standard',
        targetLevels: ['district'],
        objectives: ['marginal-house-district-win-probability'],
        threshold: null,
      };

  const electoralCollege = electoralRule === 'proportional'
    ? {
      rule: 'proportional',
      targetLevels: ['state'],
      objectives: ['state-vote-share', 'state-5-percent-elector-qualification'],
      threshold: { type: 'state-party-vote-share', minimum: 5 },
    }
    : electoralRule === 'district'
      ? {
        rule: 'district',
        targetLevels: ['district', 'state'],
        objectives: ['district-electors', 'statewide-at-large-electors'],
        threshold: null,
      }
      : {
        rule: 'standard',
        targetLevels: ['state', 'district'],
        objectives: ['statewide-electoral-vote-outcome', 'native-district-elector-outcome'],
        threshold: null,
      };

  return {
    version: 1,
    party: party || null,
    rules: { houseRule, electoralRule, popularVote, thirdMode: rules.thirdMode || 'fringe' },
    presidentialObjective: popularVote ? 'national-popular-vote' : 'electoral-college',
    house,
    electoralCollege,
    partySystem: {
      minorParty,
      fourParty,
      prioritizeThresholdApproach: minorParty && fourParty && (houseRule === 'pr' || houseRule === 'mmp' || electoralRule === 'proportional'),
      neverGrantSeatsDirectly: true,
      scoreThresholdEffectsThrough: ['shared-vote-forecast', 'native-seat-allocation'],
    },
    evaluatorRequirements: [
      'Use the active Build 33 voter model and election-rule resolvers for every counterfactual.',
      'Score threshold gains through modeled vote share and the native allocator; never add seats as a planner bonus.',
      'Keep presidential, House, Senate, governor, and state-legislature objectives separately attributable before applying objective weights.',
    ],
  };
}

/**
 * Rank faction goals using a counterfactual value supplied by the Build 33
 * adapter. The callback must apply the proposed standing change through
 * Build 33's native faction/reaction resolvers, then score the resulting
 * campaign state with the shared rule-aware forecast. This module deliberately
 * does not approximate turnout, persuasion, donor income, crises, or milestones.
 */
export function rankFactionGoals(factions, {
  weeksRemaining = 1,
  evaluateFactionGoal = null,
  electionStrategyGuidance = null,
  activeRuleKey = null,
} = {}) {
  const weeks = Math.max(0, finite(weeksRemaining));
  return requireUniqueStableIds(factions, 'Faction').filter((faction) => !isUnavailable(faction)).map((faction) => {
    requireMatchingForecastRule(faction, activeRuleKey, 'Faction candidate');
    const current = clamp(faction.standing, 0, 100);
    const gain = clamp(faction.expectedGain, 0, 100 - current);
    const next = current + gain;
    const evaluated = typeof evaluateFactionGoal === 'function'
      ? evaluateFactionGoal(faction, {
        currentStanding: current,
        expectedStanding: next,
        weeksRemaining: weeks,
        electionStrategyGuidance,
        activeRuleKey,
      }) || {}
      : faction;
    requireMatchingCandidateIdentity(evaluated, faction, 'Faction');
    requireMatchingForecastRule(evaluated, activeRuleKey, 'Faction');
    if (isUnavailable(faction, evaluated)) return null;
    const forecastValue = typeof evaluateFactionGoal === 'function'
      ? readForecastValue(evaluated, activeRuleKey, 'Faction')
      : finite(faction.marginalObjectiveDelta);
    const score = forecastValue -
      finite(faction.conflictCost) - finite(faction.cashCost) * finite(faction.cashShadowPrice) -
      finite(faction.actionSlotCost);
    return {
      id: faction.id,
      score,
      currentStanding: current,
      expectedStanding: next,
      forecastValue,
      conflictCost: finite(faction.conflictCost),
      valueSource: typeof evaluateFactionGoal === 'function' || Number.isFinite(Number(faction.marginalObjectiveDelta))
        ? 'shared-build33-forecast'
        : 'costs-only',
    };
  }).filter(Boolean).sort(stableCompare);
}

/** Rank the current event's choices through native effect simulation. */
export function rankEventChoices(choices, {
  evaluateEventChoice = null,
  electionStrategyGuidance = null,
  activeRuleKey = null,
} = {}) {
  return requireUniqueStableIds(choices, 'Event choice', (choice, index) => choice.id || choice.choiceId || `choice-${index}`)
    .map((choice, index) => {
      if (isUnavailable(choice)) return null;
      requireMatchingForecastRule(choice, activeRuleKey, 'Event choice candidate');
      const id = String(choice.id || choice.choiceId || `choice-${index}`).trim();
      const evaluated = typeof evaluateEventChoice === 'function'
        ? evaluateEventChoice(choice, {
          electionStrategyGuidance,
          activeRuleKey,
        }) || {}
        : choice;
      requireMatchingCandidateIdentity(evaluated, { ...choice, id }, 'Event choice');
      requireMatchingForecastRule(evaluated, activeRuleKey, 'Event choice');
      if (isUnavailable(choice, evaluated)) return null;
      const forecastValue = typeof evaluateEventChoice === 'function'
        ? readForecastValue(evaluated, activeRuleKey, 'Event choice')
        : finite(choice.marginalObjectiveDelta);
      const score = forecastValue - finite(choice.commitmentCost) - finite(choice.conflictCost) -
        finite(choice.riskCost) * finite(choice.riskShadowPrice);
      return {
        id,
        label: choice.label || '',
        sourceIndex: index,
        choice,
        score,
        forecastValue,
        commitmentCost: finite(choice.commitmentCost),
        conflictCost: finite(choice.conflictCost),
        riskCost: finite(choice.riskCost),
        valueSource: typeof evaluateEventChoice === 'function' || Number.isFinite(Number(choice.marginalObjectiveDelta))
          ? 'shared-build33-forecast'
          : 'costs-only',
      };
    }).filter(Boolean).sort(stableCompare);
}

const thresholdProbability = (score, threshold, suppliedProbability, spread = 5) => {
  if (Number.isFinite(suppliedProbability)) return clamp(suppliedProbability, 0, 1);
  if (score >= threshold) return 1;
  const x = (score - threshold) / Math.max(0.1, spread);
  return 1 / (1 + Math.exp(-x));
};

/** Rank outreach targets using their gates, actual benefit packages and time left. */
export function rankEndorsementTargets(targets, {
  weeksRemaining = 1,
  evaluateEndorsementTarget = null,
  electionStrategyGuidance = null,
  activeRuleKey = null,
} = {}) {
  const weeks = Math.max(0, finite(weeksRemaining));
  return requireUniqueStableIds(targets, 'Endorsement').filter((target) => !isUnavailable(target)).map((target) => {
    const afterOutreach = finite(target.relationship) + Math.max(0, finite(target.expectedRelationshipGain));
    const relationshipEndorsementChance = thresholdProbability(
      afterOutreach,
      finite(target.endorsementThreshold),
      target.probabilityEndorsement,
      target.relationshipSpread,
    );
    const relationshipCampaignChance = thresholdProbability(
      afterOutreach,
      finite(target.campaignThreshold),
      target.probabilityCampaign,
      target.relationshipSpread,
    );
    const factionGateMet = finite(target.factionStanding) >= finite(target.minimumFactionStanding);
    const factionGateChance = Number.isFinite(target.probabilityFactionGate)
      ? clamp(target.probabilityFactionGate, 0, 1)
      : (factionGateMet ? 1 : 0);
    const minimumCampaignFactionStanding = finite(
      target.minimumCampaignFactionStanding,
      finite(target.minimumFactionStanding),
    );
    const campaignFactionGateMet = finite(target.factionStanding) >= minimumCampaignFactionStanding;
    const campaignFactionGateChance = Number.isFinite(target.probabilityCampaignFactionGate)
      ? clamp(target.probabilityCampaignFactionGate, 0, 1)
      : (campaignFactionGateMet ? 1 : 0);
    const endorsementChance = relationshipEndorsementChance * factionGateChance;
    const campaignChance = relationshipCampaignChance * campaignFactionGateChance;
    const remainingUse = target.benefitExpires ? Math.min(weeks, Math.max(0, finite(target.weeksUsable, weeks))) : weeks;
    const evaluated = typeof evaluateEndorsementTarget === 'function'
      ? evaluateEndorsementTarget(target, {
        endorsementChance,
        campaignChance,
        remainingUse,
        weeksRemaining: weeks,
        electionStrategyGuidance,
        activeRuleKey,
      }) || {}
      : target;
    requireMatchingCandidateIdentity(evaluated, target, 'Endorsement');
    requireMatchingForecastRule(evaluated, activeRuleKey, 'Endorsement');
    if (isUnavailable(target, evaluated)) return null;
    if (typeof evaluateEndorsementTarget === 'function') {
      requireNumericFields(evaluated,
        ['benefitUtility', 'campaignerUtilityPerWeek', 'activeCampaignUtility'], 'Endorsement');
    }
    const benefit = finite(evaluated.benefitUtility, finite(target.benefitUtility)) * endorsementChance;
    const campaigner = finite(evaluated.campaignerUtilityPerWeek, finite(target.campaignerUtilityPerWeek)) * campaignChance * remainingUse;
    const activeSupport = finite(evaluated.activeCampaignUtility, finite(target.activeCampaignUtility)) * campaignChance;
    const score = benefit + campaigner + activeSupport -
      finite(evaluated.conflictCost, finite(target.conflictCost)) -
      finite(evaluated.cashCost, finite(target.cashCost)) * finite(evaluated.cashShadowPrice, finite(target.cashShadowPrice)) -
      finite(evaluated.actionSlotCost, finite(target.actionSlotCost));
    return {
      id: target.id,
      score,
      endorsementChance,
      campaignChance,
      benefitValue: benefit,
      campaignerValue: campaigner + activeSupport,
      factionGateMet,
      campaignFactionGateMet,
      eligible: true,
    };
  }).filter(Boolean).sort(stableCompare);
}

/**
 * Compare accepting a PAC request against rejecting it. The adapter computes
 * both values through the issue, promise, voter-group, and faction models.
 */
export function rankPacRequests(requests, {
  evaluatePacRequest = null,
  electionStrategyGuidance = null,
  activeRuleKey = null,
} = {}) {
  return requireUniqueStableIds(requests, 'PAC request').filter((request) => !isUnavailable(request)).map((request) => {
    const evaluated = typeof evaluatePacRequest === 'function'
      ? evaluatePacRequest(request, { electionStrategyGuidance, activeRuleKey }) || {}
      : request;
    requireMatchingCandidateIdentity(evaluated, request, 'PAC request');
    requireMatchingForecastRule(evaluated, activeRuleKey, 'PAC request');
    if (isUnavailable(request, evaluated)) return null;
    if (typeof evaluatePacRequest === 'function') {
      requireNumericFields(evaluated, ['acceptUtility', 'rejectUtility'], 'PAC request');
    }
    const acceptUtility = finite(evaluated.acceptUtility, finite(request.acceptUtility)) -
      finite(evaluated.acceptCommitmentCost, finite(request.acceptCommitmentCost)) -
      finite(evaluated.conflictCost, finite(request.conflictCost));
    const rejectUtility = finite(evaluated.rejectUtility, finite(request.rejectUtility));
    const score = acceptUtility - rejectUtility;
    return {
      id: request.id,
      score,
      decision: score > 0 ? 'accept' : 'reject',
      acceptUtility,
      rejectUtility,
      issueId: evaluated.issueId || request.issueId,
      conflictCost: finite(evaluated.conflictCost, finite(request.conflictCost)),
    };
  }).filter(Boolean).sort(stableCompare);
}

/**
 * Rank states/districts by rule-aware marginal outcome value. The adapter must
 * compute marginalObjectiveDelta before reach scaling, after running the active
 * EC/House allocator; closeness alone is never a substitute for seat/elector value.
 */
export function rankStateTargets(targets, {
  evaluateStateTarget = null,
  electionStrategyGuidance = null,
  activeRuleKey = null,
} = {}) {
  return requireUniqueStableIds(targets, 'State/race target').filter((target) => !isUnavailable(target)).map((target) => {
    const evaluatedResult = typeof evaluateStateTarget === 'function'
      ? evaluateStateTarget(target, { electionStrategyGuidance, activeRuleKey })
      : target;
    const evaluated = typeof evaluatedResult === 'number'
      ? { marginalObjectiveDelta: evaluatedResult }
      : (evaluatedResult || {});
    requireMatchingCandidateIdentity(evaluated, target, 'State/race target');
    requireMatchingForecastRule(evaluated, activeRuleKey, 'State/race target');
    if (isUnavailable(target, evaluated)) return null;
    const reach = clamp(evaluated.reachableVoterShare ?? target.reachableVoterShare ?? 1, 0, 1);
    const fatigueRetention = 1 - clamp(evaluated.fatiguePenalty ?? target.fatiguePenalty, 0, 1);
    const marginalObjectiveDelta = typeof evaluateStateTarget === 'function'
      ? readForecastValue(evaluated, activeRuleKey, 'State/race target')
      : finite(target.marginalObjectiveDelta);
    const score = marginalObjectiveDelta * reach * fatigueRetention +
      finite(evaluated.urgentLocalNewsValue, finite(target.urgentLocalNewsValue)) +
      finite(evaluated.thresholdValue, finite(target.thresholdValue)) -
      finite(evaluated.travelCost, finite(target.travelCost)) -
      finite(evaluated.repeatTargetCost, finite(target.repeatTargetCost)) -
      finite(evaluated.opportunityCost, finite(target.opportunityCost));
    return {
      id: target.id,
      stateId: evaluated.stateId || target.stateId,
      districtId: evaluated.districtId || target.districtId,
      score,
      marginalObjectiveDelta,
      reachableVoterShare: reach,
      reasonTags: Array.isArray(evaluated.reasonTags)
        ? [...evaluated.reasonTags]
        : Array.isArray(target.reasonTags) ? [...target.reasonTags] : [],
    };
  }).filter(Boolean).sort(stableCompare);
}

const planKey = (plan) => JSON.stringify(plan.map((action) => String(action.id)));

function planCosts(plan) {
  return plan.reduce((sum, action) => ({
    cash: sum.cash + Math.max(0, finite(action.cashCostM)),
    reserved: sum.reserved + Math.max(0, finite(action.upkeepReserveM)),
    fatigue: sum.fatigue + Math.max(0, finite(action.fatigueCost)),
    risk: sum.risk + Math.max(0, finite(action.riskCost)),
    slots: sum.slots + Math.max(1, finite(action.actionSlots, 1)),
  }), { cash: 0, reserved: 0, fatigue: 0, risk: 0, slots: 0 });
}

/**
 * Bounded beam search for this week's action sequence. The supplied evaluator
 * runs candidate bundles through a forecast adapter and returns their expected
 * objective delta, including legitimate synergies and diminishing returns.
 * Costs are charged once here as scarcity/opportunity penalties.
 */
export function optimizeWeeklyActions({
  actions = [],
  actionSlots = 0,
  minimumActionSlots = 0,
  cashM = 0,
  reserveM = 0,
  weeksRemaining = 1,
  beamWidth = 24,
  candidateLimit = 48,
  shadowPrices = /** @type {{ cash?: number, fatigue?: number, risk?: number }} */ ({}),
  evaluatePlan = null,
  electionStrategyGuidance = null,
  activeRuleKey = null,
}) {
  const slots = Math.max(0, Math.floor(finite(actionSlots)));
  const minimumSlots = Math.max(0, Math.min(slots, Math.floor(finite(minimumActionSlots))));
  const spendable = Math.max(0, finite(cashM) - Math.max(0, finite(reserveM)));
  if (!Array.isArray(actions)) throw new Error('Campaign action candidates must be an array');
  const seenActionIds = new Set();
  const rankedCandidates = actions.map((action) => {
    if (!action || typeof action !== 'object' || Array.isArray(action)) {
      throw new Error('Campaign action candidates contain an invalid record');
    }
    const stableId = String(action.id ?? '').trim();
    if (!stableId) throw new Error('Every campaign action needs a stable ID');
    if (seenActionIds.has(stableId)) throw new Error(`Duplicate campaign action ID: ${stableId}`);
    seenActionIds.add(stableId);
    return {
      ...action,
      _sourcePayload: action._sourcePayload || action,
      id: stableId,
      actionSlots: Math.max(1, Math.floor(finite(action.actionSlots, 1))),
      heuristicValue: finite(action.heuristicValue ?? action.marginalUtility),
    };
  }).filter((action) => !isUnavailable(action))
    .sort((a, b) => (b.heuristicValue - a.heuristicValue) || a.id.localeCompare(b.id));
  rankedCandidates.forEach((action) => requireMatchingForecastRule(action, activeRuleKey, 'Campaign action candidate'));
  const limit = Math.max(1, Math.floor(finite(candidateLimit, 48)));
  const candidates = [];
  const seenFamilies = new Set();
  for (const action of rankedCandidates) {
    const family = action.family || action.type || 'other';
    if (seenFamilies.has(family)) continue;
    seenFamilies.add(family);
    candidates.push(action);
  }
  for (const action of rankedCandidates) {
    if (candidates.length >= limit) break;
    if (!candidates.some((candidate) => candidate.id === action.id)) candidates.push(action);
  }
  candidates.splice(limit);

  const weights = {
    cash: Math.max(0, finite(shadowPrices.cash, 0)),
    fatigue: Math.max(0, finite(shadowPrices.fatigue, 0)),
    risk: Math.max(0, finite(shadowPrices.risk, 0)),
  };
  let nativeRejectedPlanCount = 0;
  const scorePlan = (plan) => {
    const costs = planCosts(plan);
    const forecastResult = typeof evaluatePlan === 'function'
      ? evaluatePlan(plan, {
        weeksRemaining,
        cashM,
        reserveM,
        electionStrategyGuidance,
        activeRuleKey,
      })
      : null;
    if (typeof evaluatePlan === 'function') {
      if (activeRuleKey && forecastResult?.ruleKey !== activeRuleKey) {
        throw new Error(`Campaign action plan forecast must identify active rules ${activeRuleKey}`);
      }
      requireMatchingForecastRule(forecastResult, activeRuleKey, 'Campaign action plan');
      if (isUnavailable(null, forecastResult)) {
        return { feasible: false, score: -Infinity, rawUtility: null, penalty: 0, costs };
      }
    }
    const rawUtility = typeof evaluatePlan === 'function'
      ? readForecastValue(forecastResult, activeRuleKey, 'Campaign action plan')
      : plan.reduce((sum, action) => sum + finite(action.marginalUtility), 0);
    const penalty = (costs.cash + costs.reserved) * weights.cash +
      costs.fatigue * weights.fatigue + costs.risk * weights.risk;
    return { feasible: true, score: rawUtility - penalty, rawUtility, penalty, costs };
  };

  const baselineScore = scorePlan([]);
  if (!baselineScore.feasible) throw new Error('Native forecast rejected the empty campaign-action plan');
  let beam = [{ actions: [], ...baselineScore }];
  let best = minimumSlots === 0 ? beam[0] : null;
  const seen = new Set([planKey([])]);
  for (let depth = 0; depth < slots; depth += 1) {
    const expanded = [];
    for (const node of beam) {
      for (const candidate of candidates) {
        if (node.actions.some((action) => action.id === candidate.id)) continue;
        const nextActions = [...node.actions, candidate];
        const costs = planCosts(nextActions);
        if (costs.slots > slots || costs.cash + costs.reserved > spendable) continue;
        const key = planKey(nextActions);
        if (seen.has(key)) continue;
        seen.add(key);
        const evaluated = scorePlan(nextActions);
        if (!evaluated.feasible) {
          nativeRejectedPlanCount += 1;
          continue;
        }
        const next = { actions: nextActions, ...evaluated };
        expanded.push(next);
        if (costs.slots >= minimumSlots && (!best || next.score > best.score)) best = next;
      }
    }
    if (!expanded.length) break;
    beam = expanded.sort((a, b) => (b.score - a.score) || planKey(a.actions).localeCompare(planKey(b.actions)))
      .slice(0, Math.max(1, Math.floor(finite(beamWidth, 24))));
  }

  best ||= { actions: [], ...baselineScore };
  return {
    actionIds: best.actions.map((action) => action.id),
    actions: best.actions,
    expectedUtility: best.rawUtility,
    score: best.score,
    costs: best.costs,
    spendableCashM: spendable,
    activeRuleKey,
    forecastSource: typeof evaluatePlan === 'function' ? 'shared-build33-forecast' : 'heuristic-fallback',
    searchDiagnostics: { nativeRejectedPlanCount },
  };
}

/** Compose the strategic decision queues for a game-engine adapter. */
export function buildWeeklyStrategy(input = {}) {
  const electionStrategyGuidance = input.electionStrategy || input.electionStrategyGuidance ||
    input.campaign?.electionStrategyGuidance || null;
  const activeRuleKey = input.activeRuleKey || input.campaign?.ruleKey || null;
  const scorerContext = { ...input, electionStrategyGuidance, activeRuleKey };
  const campaignPlan = input.portfolioPlanning
    ? optimizeWeeklyCampaignPortfolio({
      ...input.portfolioPlanning,
      electionStrategyGuidance,
      activeRuleKey,
    })
    : null;
  const portfolioActions = campaignPlan?.options.filter((option) => option.category === 'campaign-action') || [];
  return {
    activeRuleKey,
    electionStrategy: electionStrategyGuidance,
    factions: rankFactionGoals(input.factions, {
      weeksRemaining: input.weeksRemaining,
      evaluateFactionGoal: input.evaluateFactionGoal,
      electionStrategyGuidance,
      activeRuleKey,
    }),
    eventChoices: rankEventChoices(input.eventChoices, {
      evaluateEventChoice: input.evaluateEventChoice,
      electionStrategyGuidance,
      activeRuleKey,
    }),
    endorsements: rankEndorsementTargets(input.endorsements, scorerContext),
    pacRequests: rankPacRequests(input.pacRequests, scorerContext),
    targets: rankStateTargets(input.targets, scorerContext),
    actionPlan: campaignPlan
      ? {
        actionIds: portfolioActions.map((option) => option.id),
        actions: portfolioActions,
        expectedUtility: campaignPlan.expectedUtility,
        score: campaignPlan.score,
        costs: campaignPlan.costs,
        activeRuleKey: campaignPlan.activeRuleKey,
        forecastSource: campaignPlan.forecastSource,
      }
      : optimizeWeeklyActions({
        ...(input.actionPlanning || {}),
        electionStrategyGuidance,
        activeRuleKey,
      }),
    campaignPlan,
  };
}
