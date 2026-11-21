import { STATES, STATE_BY_ABBR } from '@/data/states';
import { groundSetupCost, groundWeeklyCost } from '@/lib/fieldOperations';
import { build35SignageCost } from '@/lib/build35Staff';
import { createSeededRandom } from '@/lib/seededRandom';

import { scenarioBallotAccess } from '@/lib/build39Scenarios';
import { BUILD40_FIELD } from '@/data/build40Field';
export { BUILD40_FIELD };

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const isLevel = (value) => Number.isInteger(value) && value >= 0 && value <= BUILD40_FIELD.maxLevelsPerState;
const initialLevel = (game, abbr, party) => party && party !== game.party
  ? Number(game.aiOps?.[party]?.[abbr] || 0)
  : Number(game.ops?.[abbr] || 0);
const budgetFor = (game, party) => party && party !== game.party
  ? Number(game.aiFunds?.[party] || 0)
  : Number(game.funds || 0);

/** Price one native ground level, including any currently eligible staff discount. */
export function openingFieldLevelCost(game, abbr, level, party = game?.party) {
  if (!STATE_BY_ABBR[abbr] || !Number.isInteger(level) || level < 1 || level > BUILD40_FIELD.maxLevelsPerState) return null;
  const actorGame = party && party !== game.party
    ? { ...game, party, candidateId: game.aiCandidateIds?.[party] || game.candidateId,
      staffing: game.aiStaffing?.[party] || null }
    : game;
  const native = groundSetupCost(abbr);
  const quoteGame = { ...actorGame };
  return round2(build35SignageCost(quoteGame, { ...quoteGame }, abbr, native));
}

/**
 * Validate and price an optional opening plan. Plan values are total target levels
 * (0–3), matching the existing ops map. quoteLevel optionally limits the quote to
 * a particular state's target level for UI previews; the full plan is still validated.
 */
export function quoteOpeningFieldPlan({ game = null, plan = {}, party = game?.party, quoteLevel = null } = {}) {
  const errors = [];
  if (!game || typeof game !== 'object') return { ok: false, errors: ['A campaign is required'], cost: 0, upkeep: 0 };
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return { ok: false, errors: ['Plan must map state abbreviations to levels'], cost: 0, upkeep: 0 };
  const validStates = new Set(STATES.map(({ abbr }) => abbr));
  for (const [abbr, level] of Object.entries(plan)) {
    if (!validStates.has(abbr)) errors.push(`Unknown state: ${abbr}`);
    else if (!isLevel(level)) errors.push(`${abbr} must have an integer level from 0 to 3`);
    else if (level > initialLevel(game, abbr, party) && !scenarioBallotAccess(game.build39?.scenario?.id, 'president', abbr, party)) errors.push(`${abbr} is outside this ticket’s ballot access`);
    else if (level < initialLevel(game, abbr, party)) errors.push(`${abbr} cannot reduce existing operations`);
  }
  const normalized = {};
  for (const { abbr } of STATES) normalized[abbr] = Number(plan[abbr] ?? initialLevel(game, abbr, party));
  if (quoteLevel && (!STATE_BY_ABBR[quoteLevel.stateId] || !isLevel(quoteLevel.level))) errors.push('quoteLevel needs a valid stateId and level');
  const levelEntries = [];
  for (const { abbr } of STATES) {
    if (quoteLevel && quoteLevel.stateId !== abbr) continue;
    const start = initialLevel(game, abbr, party);
    const end = quoteLevel ? quoteLevel.level : normalized[abbr];
    for (let level = start + 1; level <= end; level += 1) {
      const cost = groundSetupCost(abbr);
      if (cost == null) errors.push(`No setup price for ${abbr}`);
      else levelEntries.push({ abbr, level, cost });
    }
  }
  const nativeCost = round2(levelEntries.reduce((sum, entry) => sum + entry.cost, 0));
  // A plan is one opening transaction, so the shipped one-per-action staff discount
  // is applied once to its aggregate setup price.
  const discountNext = { ...game };
  const discountedCost = nativeCost > 0
    ? round2(build35SignageCost(game, discountNext, levelEntries[0]?.abbr || 'DC', nativeCost))
    : 0;
  const upkeep = round2(STATES.reduce((sum, { abbr }) => sum + groundWeeklyCost(abbr, normalized[abbr]), 0));
  const budget = budgetFor(game, party);
  if (discountedCost > budget) errors.push(`Plan costs $${discountedCost}M but budget is $${round2(budget)}M`);
  return {
    ok: errors.length === 0,
    errors,
    party,
    plan: normalized,
    levelEntries,
    cost: discountedCost,
    nativeCost,
    upkeep,
    staffContractEffectReceiptIds: discountNext.staffContractEffectReceiptIds || game.staffContractEffectReceiptIds || [],
    remainingFunds: round2(Math.max(0, budget - discountedCost)),
    budget: round2(budget),
  };
}

/** Commit a validated opening plan atomically; invalid plans leave the input untouched. */
export function applyOpeningFieldPlan({ game = null, plan = {}, party = game?.party } = {}) {
  const quote = quoteOpeningFieldPlan({ game, plan, party });
  if (!quote.ok) return { ok: false, game, quote };
  if (!quote.levelEntries.length) return { ok: true, game, quote, committed: false };
  const operations = Object.fromEntries(Object.entries(quote.plan).filter(([, level]) => level > 0));
  if (party && party !== game.party) {
    return { ok: true, game: {
      ...game,
      aiFunds: { ...game.aiFunds, [party]: quote.remainingFunds },
      aiOps: { ...game.aiOps, [party]: { ...(game.aiOps?.[party] || {}), ...operations } },
    }, quote, committed: true };
  }
  return { ok: true, game: {
    ...game,
    funds: quote.remainingFunds,
    ops: { ...(game.ops || {}), ...operations },
    staffContractEffectReceiptIds: quote.staffContractEffectReceiptIds,
  }, quote, committed: true };
}

/** Approximate finite electorate sampling from the current modeled poll shares. */
export function generateStatePollReport({ campaignId = null, week = 0, stateId = null, shares = null, insights = [], sampledAt = null } = {}) {
  if (typeof stateId !== 'string' || !STATE_BY_ABBR[stateId]) throw new Error('A valid stateId is required');
  if (!shares || typeof shares !== 'object' || Array.isArray(shares)) throw new Error('Current modeled shares are required');
  const entries = Object.entries(shares).filter(([, share]) => Number.isFinite(share) && share >= 0);
  const total = entries.reduce((sum, [, share]) => sum + share, 0);
  if (total <= 0) throw new Error('Modeled shares must have a positive total');
  const random = createSeededRandom(`${campaignId || 'campaign'}:state-poll:${week}:${stateId}`);
  const cumulative = [];
  let cursor = 0;
  for (const [party, share] of entries) {
    cursor += share / total;
    cumulative.push({ party, threshold: cursor });
  }
  const counts = Object.fromEntries(entries.map(([party]) => [party, 0]));
  for (let voter = 0; voter < BUILD40_FIELD.statePollSampleSize; voter += 1) {
    const draw = random();
    const picked = cumulative.find(({ threshold }) => draw < threshold) || cumulative[cumulative.length - 1];
    counts[picked.party] += 1;
  }
  const results = Object.fromEntries(entries.map(([party, share]) => {
    const modeledShare = share / total * 100;
    const sampleShare = counts[party] / BUILD40_FIELD.statePollSampleSize * 100;
    const margin = BUILD40_FIELD.statePollConfidenceZ
      * Math.sqrt((modeledShare / 100) * (1 - modeledShare / 100) / BUILD40_FIELD.statePollSampleSize) * 100;
    return [party, { count: counts[party], share: round2(sampleShare), modeledShare: round2(modeledShare), marginOfError: round2(margin) }];
  }));
  return {
    stateId,
    stateName: STATE_BY_ABBR[stateId].name,
    sampleSize: BUILD40_FIELD.statePollSampleSize,
    week: Number(week) || 0,
    sampledAt,
    method: 'seeded-multinomial-model-sample',
    results,
    insights: Array.isArray(insights) ? insights.slice(0, 3) : [],
  };
}

/**
 * Apply the week's fixed sample draws to the current modeled shares so the
 * report reflects new campaign activity without introducing a fresh random swing.
 */
export function getDetailedPolling(game, abbr, currentShares, week = game?.week, insights = []) {
  if (!game || typeof game !== 'object' || !STATE_BY_ABBR[abbr]) return null;
  if (!currentShares || typeof currentShares !== 'object' || Array.isArray(currentShares) ||
      !Object.values(currentShares).some((share) => Number.isFinite(share) && share > 0)) return null;
  const pollingWeek = Number.isFinite(Number(week)) ? Number(week) : 0;
  return generateStatePollReport({
    campaignId: game.build34CampaignId || game.campaignId || 'campaign',
    week: pollingWeek,
    stateId: abbr,
    shares: currentShares,
    insights,
  });
}

/** Charge one action and $2M, retaining a campaign/week/state unique receipt. */
export function commissionStatePoll({ game = null, stateId = null, shares = null, insights = [], sampledAt = null } = {}) {
  if (!game || typeof game !== 'object') return { ok: false, reason: 'campaign-required', game };
  const actionLeft = Number(game.actionsLeft ?? game.actions ?? 0);
  const week = Number(game.week) || 0;
  const state = STATE_BY_ABBR[stateId];
  if (!state) return { ok: false, reason: 'invalid-state', game };
  if (actionLeft < 1) return { ok: false, reason: 'no-actions-left', game };
  if (Number(game.funds || 0) < BUILD40_FIELD.statePollCostM) return { ok: false, reason: 'insufficient-funds', game };
  const campaignId = game.build34CampaignId || game.campaignId || 'campaign';
  const receiptId = `${campaignId}:state-poll:${week}:${stateId}`;
  const existing = game.statePollReceipts?.[receiptId];
  if (existing) return { ok: false, reason: 'duplicate', game, receipt: existing };
  const report = generateStatePollReport({ campaignId, week, stateId, shares, insights, sampledAt });
  const receipt = {
    id: receiptId,
    actionId: BUILD40_FIELD.statePollActionId,
    receiptType: 'campaign-action',
    campaignId,
    week,
    stateId,
    cost: BUILD40_FIELD.statePollCostM,
    sampleSize: BUILD40_FIELD.statePollSampleSize,
    report,
  };
  return {
    ok: true,
    game: {
      ...game,
      funds: round2(Number(game.funds || 0) - BUILD40_FIELD.statePollCostM),
      actionsLeft: actionLeft - 1,
      statePollReceipts: { ...(game.statePollReceipts || {}), [receiptId]: receipt },
    },
    receipt,
    report,
  };
}
