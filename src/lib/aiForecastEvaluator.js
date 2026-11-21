import { createSeededRandom } from './seededRandom.js';

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const planKey = (plan) => (plan || []).map((action) => String(action.id)).join('>') || 'baseline';

function canonicalizePayload(value, ancestors = new Set()) {
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    throw new Error('AI forecast action payload contains a non-JSON value');
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('AI forecast action payload contains a non-finite number');
  }
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (ancestors.has(value)) throw new Error('AI forecast action payload contains a circular reference');
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    throw new Error('AI forecast action payload must use plain objects');
  }
  ancestors.add(value);
  const normalized = Array.isArray(value)
    ? value.map((item) => canonicalizePayload(item, ancestors) ?? null)
    : Object.fromEntries(Object.keys(value).sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => [key, canonicalizePayload(value[key], ancestors)]));
  ancestors.delete(value);
  return normalized;
}

function snapshotPlanPayloads(plan) {
  if (!Array.isArray(plan)) throw new Error('AI forecast plans must be arrays');
  return plan.map((action) => {
    const stableId = String(action?.id ?? '').trim();
    if (!action || typeof action !== 'object' || !stableId) {
      throw new Error('Every AI forecast action needs a stable ID');
    }
    const payload = action._sourcePayload || action;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || String(payload.id) !== stableId) {
      throw new Error(`AI forecast action ${stableId} needs a matching serializable source payload`);
    }
    return canonicalizePayload(payload);
  });
}

const planFingerprint = (plan) => JSON.stringify(snapshotPlanPayloads(plan));

function standardDeviation(values, mean) {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function lowerQuantile(values, quantile = 0.1) {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.floor((ordered.length - 1) * quantile))];
}

function readScenarioUtility(result, ruleKey) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('AI shared forecast simulation must return an object tagged with its rule key');
  }
  if (result.ruleKey !== ruleKey) {
    throw new Error(`AI scenario used ${result.ruleKey || 'no rule key'}; active rules are ${ruleKey}`);
  }
  if (typeof result.utility !== 'number' || !Number.isFinite(result.utility)) {
    throw new Error('AI shared forecast simulation must return a finite utility');
  }
  return clamp01(result.utility);
}

/**
 * Shared seeds make plan comparisons paired, so scenario luck cancels out.
 * @param {{ campaignId?: string, week?: number, ruleKey?: string, sampleCount?: number }} [input]
 */
export function commonRandomScenarioSeeds({ campaignId, week, ruleKey, sampleCount = 128 } = {}) {
  if (!campaignId || !ruleKey) throw new Error('AI forecast seeds require campaignId and an active election rule key');
  const count = Math.max(1, Math.min(2048, Math.floor(Number(sampleCount) || 128)));
  const random = createSeededRandom(`${campaignId}:${week}:${ruleKey}:ai-common-scenarios`);
  return Array.from({ length: count }, (_, index) => `${index}:${Math.floor(random() * 0x100000000)}`);
}

/**
 * Create a bounded paired-scenario evaluator for the existing shared forecast.
 * The caller gives it one public state snapshot and a simulator; all candidate
 * plans receive exactly the same seeds and rule key. It returns no new polling,
 * seat, or campaign effects and cannot inspect hidden future information.
 * @param {{ campaignId?: string, week?: number, ruleKey?: string, stateRevision?: number | string, publicSnapshotKey?: string | number, sampleCount?: number, baselinePlan?: any[], simulatePlan?: (plan: any[], context: { seed: string, ruleKey: string, week: number, publicSnapshotKey?: string | number, stateRevision: number | string }) => { utility: number, ruleKey: string }, riskAversion?: number, cacheLimit?: number }} [input]
 */
export function createPairedPlanEvaluator({
  campaignId,
  week,
  ruleKey,
  stateRevision,
  publicSnapshotKey,
  sampleCount = 128,
  baselinePlan = [],
  simulatePlan,
  riskAversion = 0,
  cacheLimit = 5000,
} = {}) {
  if (typeof simulatePlan !== 'function') throw new Error('AI paired evaluator needs the shared forecast simulator');
  if (!Number.isInteger(week) || week < 1) {
    throw new Error('AI paired evaluator needs a positive one-based week');
  }
  if ((typeof stateRevision !== 'string' && typeof stateRevision !== 'number') ||
      (typeof stateRevision === 'string' && !stateRevision.trim()) ||
      (typeof stateRevision === 'number' && !Number.isFinite(stateRevision))) {
    throw new Error('AI paired evaluator needs the current public-state revision');
  }
  if (publicSnapshotKey !== null && publicSnapshotKey !== undefined &&
      typeof publicSnapshotKey !== 'string' && typeof publicSnapshotKey !== 'number') {
    throw new Error('AI paired evaluator publicSnapshotKey must be a string or number');
  }
  if (typeof publicSnapshotKey === 'number' && !Number.isFinite(publicSnapshotKey)) {
    throw new Error('AI paired evaluator publicSnapshotKey must be finite');
  }
  const seeds = commonRandomScenarioSeeds({ campaignId, week, ruleKey, sampleCount });
  const cache = new Map();
  const baselineKey = planKey(baselinePlan);
  const rootKey = `${stateRevision}:${publicSnapshotKey ?? 'public'}:${ruleKey}`;

  const runPlan = (planPayloads, fingerprint = JSON.stringify(planPayloads)) => {
    const key = `${rootKey}:${fingerprint}`;
    if (cache.has(key)) return cache.get(key);
    const outcomes = [];
    for (const seed of seeds) {
      const result = simulatePlan(structuredClone(planPayloads), {
        seed,
        ruleKey,
        week,
        publicSnapshotKey,
        stateRevision,
      });
      const utility = readScenarioUtility(result, ruleKey);
      outcomes.push({ seed, utility });
    }
    cache.set(key, outcomes);
    if (cache.size > Math.max(1, Math.floor(Number(cacheLimit) || 5000))) {
      cache.delete(cache.keys().next().value);
    }
    return outcomes;
  };

  const baselinePayloads = snapshotPlanPayloads(baselinePlan);
  const baselineFingerprint = JSON.stringify(baselinePayloads);
  const baselineOutcomes = runPlan(baselinePayloads, baselineFingerprint);
  const bySeed = new Map(baselineOutcomes.map((outcome) => [outcome.seed, outcome.utility]));
  const diagnostics = new Map();

  const evaluatePlan = (plan) => {
    const displayKey = planKey(plan);
    const payloads = snapshotPlanPayloads(plan);
    const fingerprint = JSON.stringify(payloads);
    const outcomes = runPlan(payloads, fingerprint);
    const deltas = outcomes.map((outcome) => outcome.utility - bySeed.get(outcome.seed));
    const meanDelta = deltas.reduce((sum, value) => sum + value, 0) / Math.max(1, deltas.length);
    const spread = standardDeviation(deltas, meanDelta);
    const winRate = deltas.filter((value) => value > 0).length / Math.max(1, deltas.length);
    const riskAdjustedDelta = meanDelta - Math.max(0, Number(riskAversion) || 0) * spread;
    const report = {
      planKey: displayKey,
      baselinePlanKey: baselineKey,
      ruleKey,
      sampleCount: outcomes.length,
      meanDelta,
      standardDeviation: spread,
      pairedWinProbability: winRate,
      lowerDecileDelta: lowerQuantile(deltas, 0.1),
      riskAdjustedDelta,
      cachedScenarioCount: cache.get(`${rootKey}:${fingerprint}`)?.length || 0,
    };
    diagnostics.set(fingerprint, report);
    return {
      ...report,
      utility: riskAdjustedDelta,
    };
  };

  return {
    evaluatePlan,
    explainPlan: (plan) => diagnostics.get(planFingerprint(plan)) || null,
    scenarioSeeds: [...seeds],
    ruleKey,
    baselinePlanKey: baselineKey,
    cacheSize: () => cache.size,
  };
}
