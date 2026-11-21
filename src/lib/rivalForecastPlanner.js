import {
  applyBuild33AiOpponentDecision,
  buildBuild33AiIdentity,
  initializeBuild34CampaignMetadata,
  prepareBuild33AiOpponentEvent,
} from '@/adapters/build33/build33AiAdapter';
import { campaignObjectiveUtility } from '@/lib/aiElectionObjective';
import { createPairedPlanEvaluator } from '@/lib/aiForecastEvaluator';
import { planBuild34NextDecision, upsertBuild34AiPlanReceipt } from '@/lib/build34AiRuntime';
import { electionForecast } from '@/lib/electionForecast';
import { createSeededRandom } from '@/lib/seededRandom';

const FORECAST_DRAWS = 16;
const SCHEDULE_COUNT = 5;

function forecastUtility(game, ruleKey, seed) {
  const forecast = electionForecast(game, { draws: FORECAST_DRAWS, chamberDraws: FORECAST_DRAWS, seed });
  const { rivalChambers: chambers } = forecast;
  const popularShare = forecast.rivalPopularShare / 100;
  const electorShare = forecast.themEV / 538;
  const electoralPosition = game.popularVote ? popularShare : 0.8 * electorShare + 0.2 * popularShare;
  const houseValue = 0.6 * chambers.houseMajorityProbability + 0.4 * chambers.houseSeatShare;
  const senateValue = 0.6 * chambers.senateMajorityProbability + 0.4 * chambers.senateSeatShare;
  return campaignObjectiveUtility({
    party: game.opponentParty,
    isMinorParty: ['lib', 'grn'].includes(game.opponentParty),
    activeRuleKey: ruleKey,
    forecastRuleKey: ruleKey,
    unmodeledComponents: ['subnational'],
    outcomes: {
      presidentialWinProbability: 0.75 * (forecast.themWin / 100) + 0.25 * electoralPosition,
      congressionalOutcomeValue: 0.65 * houseValue + 0.35 * senateValue,
      partySystemOpportunityValue: 0.5 * popularShare + 0.25 * electorShare + 0.25 * chambers.houseSeatShare,
    },
  });
}

function evaluatorFor(game, applyCandidate) {
  const { campaignId, week, publicStateRevision, ruleKey } = buildBuild33AiIdentity(game);
  return createPairedPlanEvaluator({
    campaignId,
    week,
    ruleKey,
    stateRevision: publicStateRevision,
    // Each paired evaluation runs one shared batch of 16 election draws.
    sampleCount: 1,
    simulatePlan: ([candidate], { seed }) => forecastUtility(
      candidate ? applyCandidate(candidate) : game,
      ruleKey,
      seed,
    ),
  });
}

function resolveDecision(game, strategyInput, applyNativeDecision, availableActions = []) {
  const identity = buildBuild33AiIdentity(game);
  const planned = planBuild34NextDecision({
    ...identity,
    strategyInput: { ...strategyInput, activeRuleKey: identity.ruleKey },
    savedPlanReceipts: game.build34AiPlanReceipts,
    appliedDecisionReceiptIds: game.build34AppliedDecisionReceiptIds,
  });
  if (!planned.decision) return { game, decision: null };
  const saved = upsertBuild34AiPlanReceipt(planned.receipt, game.build34AiPlanReceipts);
  const committed = { ...game, build34AiPlanReceipts: saved.savedPlanReceipts };
  const resolved = applyBuild33AiOpponentDecision(committed, {
    decision: planned.decision,
    receipt: saved.receipt,
    availableActions,
    applyNativeDecision,
  });
  if (!resolved.applied) throw new Error('The selected rival forecast decision did not resolve');
  return { game: resolved.game, decision: planned.decision };
}

/**
 * Choose a rival event response and weekly schedule and apply each through the native engine.
 * @param {any} game
 * @param {{ drawEvent: (state: any) => any, applyEvent: (state: any, option: any, random: () => number) => any, buildSchedules: (state: any, randoms: (() => number)[]) => any[], applySchedule: (state: any, schedule: any) => { game: any, week: any, promiseAttack: any, neglectedStateReceipt: any }, actionSlots: number }} native
 */
export function resolveRivalForecastTurn(game, { drawEvent, applyEvent, buildSchedules, applySchedule, actionSlots }) {
  let current = initializeBuild34CampaignMetadata(game);
  const seed = `${current.build34CampaignId}:${current.week + 1}:rival`;
  const prepared = prepareBuild33AiOpponentEvent(current, { drawOpponentEvent: drawEvent });
  const event = prepared.event;
  current = prepared.game;
  let choice = null;
  if (event) {
    const applyChoice = (state, option) => applyEvent(state, option, createSeededRandom(`${seed}:event`));
    const forecast = evaluatorFor(current, ({ option }) => applyChoice(current, option));
    const resolved = resolveDecision(current, {
      activeEvent: event,
      evaluateEventChoice: (option) => forecast.evaluatePlan([{ id: option.id || option.choiceId || option.label, option }]),
    }, ({ game: state, target }) => ({ applied: true, game: applyChoice(state, target.payload) }));
    choice = event.choices[resolved.decision?.sourceIndex] || null;
    current = resolved.game;
  }

  const schedules = buildSchedules(current, Array.from({ length: SCHEDULE_COUNT }, (_, index) =>
    createSeededRandom(`${seed}:schedule:${index}`)));
  const actions = schedules.map((schedule, index) => ({
    id: `weekly-schedule-${index + 1}`,
    family: 'weekly-schedule',
    actionSlots,
    cashCostM: schedule.budgetSpent,
    schedule,
  }));
  const forecast = evaluatorFor(current, ({ schedule }) => applySchedule(current, schedule).game);
  /** @type {{ result?: ReturnType<typeof applySchedule> }} */
  const applied = {};
  const resolved = resolveDecision(current, {
    actionPlanning: {
      actions,
      actionSlots,
      minimumActionSlots: actionSlots,
      cashM: current.aiFunds?.[current.opponentParty] || 0,
      shadowPrices: { cash: 0.00003 },
      evaluatePlan: forecast.evaluatePlan,
    },
  }, ({ game: state, target }) => {
    applied.result = applySchedule(state, target.payload.schedule);
    return { applied: true, game: applied.result.game };
  }, actions);

  const selected = actions.find((action) => action.id === resolved.decision?.id);
  if (!selected || !applied.result) throw new Error('No legal rival weekly schedule was resolved');
  const result = forecast.evaluatePlan([selected]);
  return {
    ...applied.result,
    game: resolved.game,
    event,
    choice,
    forecastPlan: {
      source: 'shared-election-forecast',
      scheduleId: selected.id,
      comparedSchedules: actions.length,
      drawsPerSchedule: FORECAST_DRAWS,
      expectedObjectiveGain: result.meanDelta,
    },
  };
}
