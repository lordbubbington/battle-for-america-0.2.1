/** Joint AI search across political commitments and campaign actions. */

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const nonnegative = (value) => Math.max(0, finite(value));
const optionId = (option) => String(option.id);
const planKey = (plan) => JSON.stringify(plan.map(optionId));
const orderPlan = (plan) => [...plan].sort((a, b) => finite(a.executionOrder) - finite(b.executionOrder) || optionId(a).localeCompare(optionId(b)));
const planCategorySignature = (plan) => JSON.stringify(plan.map((option) => option.category).sort());

function normalizeTags(value, label) {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array of tag IDs`);
  const tags = value.map((tag) => String(tag).trim());
  if (tags.some((tag) => !tag)) throw new Error(`${label} cannot contain empty tag IDs`);
  return [...new Set(tags)];
}

function portfolioForecastResult(result, activeRuleKey) {
  if (result?.ruleKey && activeRuleKey && result.ruleKey !== activeRuleKey) {
    throw new Error(`Campaign portfolio forecast used ${result.ruleKey}; active rules are ${activeRuleKey}`);
  }
  if (activeRuleKey && (!result || typeof result !== 'object' || !result.ruleKey)) {
    throw new Error(`Campaign portfolio forecast must return an object tagged with active rules ${activeRuleKey}`);
  }
  if (result?.eligible === false || result?.feasible === false) return { feasible: false, value: null };
  if (result && typeof result === 'object') {
    for (const field of ['marginalObjectiveDelta', 'riskAdjustedDelta', 'utility', 'value']) {
      const value = result[field];
      if (value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) {
        return { feasible: true, value: Number(value) };
      }
    }
    if (activeRuleKey) throw new Error('Campaign portfolio forecast did not include a numeric objective value');
    return { feasible: true, value: 0 };
  }
  return { feasible: true, value: finite(result) };
}

function retainDiverseCandidates(candidates, limit, perCategoryReserve) {
  if (candidates.length <= limit) return candidates;
  const buckets = new Map();
  for (const candidate of candidates) {
    const bucket = buckets.get(candidate.category) || [];
    bucket.push(candidate);
    buckets.set(candidate.category, bucket);
  }

  const categoriesByValue = [...buckets.entries()].sort((a, b) =>
    (b[1][0]?.heuristicValue || 0) - (a[1][0]?.heuristicValue || 0) || a[0].localeCompare(b[0]));
  const reserve = Math.max(1, Math.min(perCategoryReserve, Math.floor(limit / categoriesByValue.length) || 1));
  const selected = new Map();

  for (const [category, bucket] of categoriesByValue) {
    if (selected.size >= limit) break;
    let kept = 0;
    const seenFamilies = new Set();
    for (const candidate of bucket) {
      const family = String(candidate.searchFamily || candidate.family || candidate.targetFamily || candidate.id);
      if (seenFamilies.has(family)) continue;
      seenFamilies.add(family);
      selected.set(candidate.id, candidate);
      kept += 1;
      if (kept >= reserve || selected.size >= limit) break;
    }
    if (kept < reserve) {
      for (const candidate of bucket) {
        if (selected.has(candidate.id)) continue;
        selected.set(candidate.id, candidate);
        kept += 1;
        if (kept >= reserve || selected.size >= limit) break;
      }
    }
  }

  for (const candidate of candidates) {
    if (selected.size >= limit) break;
    selected.set(candidate.id, candidate);
  }
  return [...selected.values()].sort((a, b) =>
    (b.heuristicValue - a.heuristicValue) || a.id.localeCompare(b.id));
}

function retainDiverseBeam(nodes, width, maxPerSignature) {
  const ordered = [...nodes].sort((a, b) =>
    (b.score - a.score) || planKey(a.options).localeCompare(planKey(b.options)));
  const selected = [];
  const selectedKeys = new Set();
  const counts = new Map();

  for (const node of ordered) {
    const signature = planCategorySignature(node.options);
    if (counts.has(signature)) continue;
    selected.push(node);
    selectedKeys.add(planKey(node.options));
    counts.set(signature, 1);
    if (selected.length >= width) return selected;
  }

  for (const node of ordered) {
    const key = planKey(node.options);
    if (selectedKeys.has(key)) continue;
    const signature = planCategorySignature(node.options);
    if ((counts.get(signature) || 0) >= maxPerSignature) continue;
    selected.push(node);
    selectedKeys.add(key);
    counts.set(signature, (counts.get(signature) || 0) + 1);
    if (selected.length >= width) return selected;
  }

  for (const node of ordered) {
    const key = planKey(node.options);
    if (selectedKeys.has(key)) continue;
    selected.push(node);
    if (selected.length >= width) break;
  }
  return selected;
}

function countCategories(options) {
  const counts = {};
  for (const option of options) counts[option.category] = (counts[option.category] || 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function planResources(plan) {
  return plan.reduce((sum, option) => ({
    actionSlots: sum.actionSlots + Math.max(0, Math.floor(finite(option.actionSlots))),
    cash: sum.cash + nonnegative(option.cashCostM) + nonnegative(option.upkeepReserveM),
    risk: sum.risk + nonnegative(option.riskCost),
    fatigue: sum.fatigue + nonnegative(option.fatigueCost),
  }), { actionSlots: 0, cash: 0, risk: 0, fatigue: 0 });
}

function compatibleWithPlan(option, plan, activeTags, categoryCaps) {
  if (plan.some((selected) => selected.id === option.id)) return false;
  const availableTags = new Set(activeTags);
  const priorConflictTags = new Set();
  for (const selected of orderPlan([...plan, option])) {
    const provided = selected.providesTags || [];
    const required = selected.requiresTags || [];
    const conflicting = selected.conflictsWithTags || [];
    if (required.some((tag) => !availableTags.has(tag))) return false;
    if (conflicting.some((tag) => availableTags.has(tag))) return false;
    if (provided.some((tag) => priorConflictTags.has(tag) || conflicting.includes(tag))) return false;
    for (const tag of provided) availableTags.add(tag);
    for (const tag of conflicting) priorConflictTags.add(tag);
  }
  if (option.exclusiveGroup && plan.some((selected) => selected.exclusiveGroup === option.exclusiveGroup)) return false;
  if (option.exclusiveWithIds?.some((id) => plan.some((selected) => selected.id === id))) return false;
  if (plan.some((selected) => selected.exclusiveWithIds?.includes(option.id))) return false;
  const cap = categoryCaps[option.category];
  if (cap !== undefined && cap !== null && Number.isFinite(Number(cap)) &&
      plan.filter((selected) => selected.category === option.category).length >= Number(cap)) return false;
  return true;
}

/**
 * Search a joint weekly portfolio. The adapter can provide faction cultivation,
 * endorser outreach, PAC responses, state targets, and normal actions as options.
 * One shared forecast callback scores full combinations so the AI can account
 * for synergies and conflicts instead of choosing each queue independently.
 * The callback receives the current election guidance and rule key; tagged
 * options or forecast results from a different ruleset are rejected.
 */
export function optimizeWeeklyCampaignPortfolio({
  options = [],
  actionSlots = 0,
  cashM = 0,
  reserveM = 0,
  weeksRemaining = 1,
  activeTags = [],
  categoryCaps = {},
  shadowPrices = /** @type {{ cash?: number, fatigue?: number, risk?: number }} */ ({}),
  beamWidth = 32,
  candidateLimit = 64,
  perCategoryReserve = 3,
  maxPerPlanSignature = 3,
  maxDecisionCount = 12,
  evaluatePortfolio = null,
  electionStrategyGuidance = null,
  activeRuleKey = null,
} = {}) {
  const availableCash = Math.max(0, finite(cashM) - nonnegative(reserveM));
  const actionLimit = Math.max(0, Math.floor(finite(actionSlots)));
  if (!Array.isArray(options)) throw new Error('Campaign portfolio options must be an array');
  const normalizedActiveTags = normalizeTags(activeTags instanceof Set ? [...activeTags] : activeTags, 'Active campaign tags');
  const seenOptionIds = new Set();
  const eligibleCandidates = options.map((option) => {
    if (!option || typeof option !== 'object' || Array.isArray(option)) {
      throw new Error('Campaign portfolio contains an invalid option record');
    }
    const stableId = String(option.id ?? '').trim();
    if (!stableId) throw new Error('Every campaign portfolio option needs a stable ID');
    if (seenOptionIds.has(stableId)) throw new Error(`Duplicate campaign portfolio option ID: ${stableId}`);
    seenOptionIds.add(stableId);
    const suppliedCategory = option.category || option.type || 'other';
    const category = suppliedCategory === 'action' ? 'campaign-action' : suppliedCategory;
    return {
      ...option,
      _sourcePayload: option._sourcePayload || option,
      id: stableId,
      category,
      requiresTags: normalizeTags(option.requiresTags, `Portfolio option ${stableId} requiresTags`),
      providesTags: normalizeTags(option.providesTags, `Portfolio option ${stableId} providesTags`),
      conflictsWithTags: normalizeTags(option.conflictsWithTags, `Portfolio option ${stableId} conflictsWithTags`),
      actionSlots: Math.max(0, Math.floor(finite(option.actionSlots,
        category === 'campaign-action' ? 1 : 0))),
      heuristicValue: finite(option.heuristicValue ?? option.marginalUtility),
    };
  }).filter((option) => option.eligible !== false && option.feasible !== false)
    .sort((a, b) => (b.heuristicValue - a.heuristicValue) || a.id.localeCompare(b.id));
  for (const option of eligibleCandidates) {
    if (option.ruleKey && activeRuleKey && option.ruleKey !== activeRuleKey) {
      throw new Error(`Campaign option ${option.id} used ${option.ruleKey}; active rules are ${activeRuleKey}`);
    }
  }
  const optionLimit = Math.max(1, Math.floor(finite(candidateLimit, 64)));
  const candidates = retainDiverseCandidates(
    eligibleCandidates,
    optionLimit,
    Math.max(1, Math.floor(finite(perCategoryReserve, 3))),
  );
  const candidateCategories = [...new Set(eligibleCandidates.map((option) => option.category))].sort();
  const retainedCategories = [...new Set(candidates.map((option) => option.category))].sort();

  const costs = {
    cash: nonnegative(shadowPrices.cash),
    risk: nonnegative(shadowPrices.risk),
    fatigue: nonnegative(shadowPrices.fatigue),
  };
  let nativeRejectedPlanCount = 0;
  const score = (plan) => {
    const resources = planResources(plan);
    const forecast = typeof evaluatePortfolio === 'function'
      ? portfolioForecastResult(evaluatePortfolio(plan, {
        weeksRemaining,
        cashM,
        reserveM,
        activeTags,
        electionStrategyGuidance,
        activeRuleKey,
      }), activeRuleKey)
      : { feasible: true, value: plan.reduce((sum, option) => sum + option.heuristicValue, 0) };
    if (!forecast.feasible) {
      return { feasible: false, score: -Infinity, forecastValue: null, scarcityPenalty: 0, resources };
    }
    const forecastValue = forecast.value;
    const scarcityPenalty = resources.cash * costs.cash + resources.risk * costs.risk + resources.fatigue * costs.fatigue;
    return { feasible: true, score: forecastValue - scarcityPenalty, forecastValue, scarcityPenalty, resources };
  };

  const baselineScore = score([]);
  if (!baselineScore.feasible) throw new Error('Native forecast rejected the empty campaign portfolio');
  let beam = [{ options: [], ...baselineScore }];
  let best = beam[0];
  const seen = new Set([planKey([])]);
  const depthLimit = Math.max(0, Math.min(candidates.length, Math.floor(finite(maxDecisionCount, 12))));
  for (let depth = 0; depth < depthLimit; depth += 1) {
    const expanded = [];
    for (const node of beam) {
      for (let index = 0; index < candidates.length; index += 1) {
        const option = candidates[index];
        if (!compatibleWithPlan(option, node.options, normalizedActiveTags, categoryCaps)) continue;
        const nextOptions = orderPlan([...node.options, option]);
        const resources = planResources(nextOptions);
        if (resources.actionSlots > actionLimit || resources.cash > availableCash) continue;
        const key = planKey(nextOptions);
        if (seen.has(key)) continue;
        seen.add(key);
        const nextScore = score(nextOptions);
        if (!nextScore.feasible) {
          nativeRejectedPlanCount += 1;
          continue;
        }
        const next = { options: nextOptions, ...nextScore };
        expanded.push(next);
        if (next.score > best.score || (next.score === best.score && key < planKey(best.options))) best = next;
      }
    }
    if (!expanded.length) break;
    beam = retainDiverseBeam(
      expanded,
      Math.max(1, Math.floor(finite(beamWidth, 32))),
      Math.max(1, Math.floor(finite(maxPerPlanSignature, 3))),
    );
  }

  return {
    optionIds: best.options.map(optionId),
    options: best.options,
    expectedUtility: best.forecastValue,
    score: best.score,
    costs: best.resources,
    availableCashM: availableCash,
    actionSlots,
    weeksRemaining,
    activeRuleKey,
    forecastSource: typeof evaluatePortfolio === 'function' ? 'shared-build33-forecast' : 'heuristic-fallback',
    searchDiagnostics: {
      eligibleOptionCount: eligibleCandidates.length,
      retainedOptionCount: candidates.length,
      candidateCategories,
      retainedCategories,
      eligibleByCategory: countCategories(eligibleCandidates),
      retainedByCategory: countCategories(candidates),
      nativeRejectedPlanCount,
    },
    selectedByCategory: best.options.reduce((counts, option) => ({
      ...counts,
      [option.category]: (counts[option.category] || 0) + 1,
    }), {}),
  };
}
