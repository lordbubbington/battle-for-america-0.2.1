import { buildWeeklyEventCadence } from './eventCadence.js';
import { routeBuild34WeeklyBackground } from './build34CommandRouter.js';
import {
  decayAllFundraisingFatigue,
  freezeWeeklyIncomeRecord,
  payFrozenWeeklyIncome,
  resolveGroundGameWeek,
} from './campaignBalanceRules.js';
import { scheduleProxyVisits, unlockProxyFromEndorsement } from './proxyCampaigners.js';
import { resolveSuperPacWeek } from './superPacRules.js';
import { resolveBackgroundEndorsementWeek } from './endorsementScheduler.js';

const cloneRecord = (value) => structuredClone(value ?? {});

/**
 * Prepare one deterministic weekly boundary packet from portable systems.
 * The receiving engine must persist the returned receipt before applying its
 * commands through the shared Build 33 voter, cash, fatigue, and event systems.
 */
export function prepareBuild34WeeklyBoundary({
  campaignId,
  week,
  totalWeeks,
  actionSlots = 7,
  projectedPopularVoteSharePercent,
  cashM = 0,
  weeklyIncome = {},
  fundraisingFatigueByPartyState = {},
  groundGame = {},
  completedGroundWeek = null,
  activeGroundLevelsByState = {},
  activeProxies = [],
  proxyStates = [],
  proxyVisitsByState = {},
  alreadyVisitedProxyIds = [],
  unavailablePersonIds = [],
  pacs = [],
  pacStates = [],
  backgroundEndorsementInput = null,
  weeklyAnnouncementReceipts = {},
  savedEventCadence = null,
  appliedEffectReceiptIds = [],
  weeklyReceiptsByKey = {},
}) {
  if (!campaignId || !Number.isInteger(Number(week)) || Number(week) < 1) {
    throw new Error('Build 34 weekly boundary requires campaignId and a positive integer week');
  }
  if (!Number.isInteger(Number(totalWeeks)) || Number(totalWeeks) < Number(week)) {
    throw new Error('Build 34 weekly boundary requires totalWeeks at least as large as the current week');
  }
  const projectedShare = Number(projectedPopularVoteSharePercent);
  if (!Number.isFinite(projectedShare) || projectedShare < 0 || projectedShare > 100) {
    throw new Error('Build 34 weekly income needs a frozen popular-vote share from 0 to 100');
  }
  const receiptKey = `${campaignId}:build34-week:${week}`;
  if (weeklyReceiptsByKey[receiptKey]) {
    const priorReceipt = weeklyReceiptsByKey[receiptKey];
    const backgroundEffectBatch = routeBuild34WeeklyBackground(priorReceipt, appliedEffectReceiptIds);
    const updatedReceipt = { ...priorReceipt, backgroundEffectBatch };
    return {
      ...updatedReceipt,
      created: false,
      weeklyAnnouncementReceipts,
      weeklyReceiptsByKey: { ...weeklyReceiptsByKey, [receiptKey]: updatedReceipt },
    };
  }

  let nextIncome = cloneRecord(weeklyIncome);
  let nextCashM = Math.max(0, Number(cashM) || 0);
  const frozen = freezeWeeklyIncomeRecord(nextIncome, week, projectedPopularVoteSharePercent);
  nextIncome = frozen.weeklyIncome;
  const paid = payFrozenWeeklyIncome(nextIncome, week, nextCashM);
  nextIncome = paid.weeklyIncome;
  nextCashM = paid.cashM;

  const nextGroundGame = completedGroundWeek === null
    ? groundGame
    : resolveGroundGameWeek({
      accumulatedByState: groundGame.accumulatedByState || {},
      resolvedWeeks: groundGame.resolvedWeeks || [],
      week: completedGroundWeek,
      activeLevelsByState: activeGroundLevelsByState,
    });
  const nextFundraisingFatigue = decayAllFundraisingFatigue(fundraisingFatigueByPartyState, 1);

  const priorVisitCount = Object.values(proxyVisitsByState).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0);
  const proxyPlan = scheduleProxyVisits({
    campaignId,
    week,
    activeProxies,
    eligibleStates: proxyStates,
    priorStateVisits: proxyVisitsByState,
    alreadyVisitedProxyIds,
    unavailablePersonIds,
  });
  const superPacPlan = resolveSuperPacWeek({ campaignId, weekNumber: week, totalWeeks, pacs, states: pacStates });
  let backgroundEndorsements = null;
  let nextWeeklyAnnouncementReceipts = weeklyAnnouncementReceipts;
  if (backgroundEndorsementInput) {
    const scheduledEndorsements = resolveBackgroundEndorsementWeek({
      ...backgroundEndorsementInput,
      campaignId,
      week,
      totalWeeks,
      weeklyAnnouncementReceipts,
    });
    nextWeeklyAnnouncementReceipts = scheduledEndorsements.weeklyAnnouncementReceipts;
    backgroundEndorsements = { ...scheduledEndorsements };
    delete backgroundEndorsements.weeklyAnnouncementReceipts;
    delete backgroundEndorsements.created;
  }
  const proxyUnlocks = (backgroundEndorsements?.proxyEndorsements || [])
    .map(({ group, endorsement }) => unlockProxyFromEndorsement({
      endorsement,
      endorser: group,
      party: backgroundEndorsementInput.party,
      week,
      unavailablePersonIds: backgroundEndorsementInput.unavailablePersonIds || [],
    }))
    .filter(Boolean);
  const eventCadence = buildWeeklyEventCadence({
    campaignId,
    week,
    totalWeeks,
    actionSlots,
    savedSchedule: savedEventCadence,
  });

  const receipt = {
    receiptKey,
    campaignId,
    week,
    income: { record: paid.record, paid: paid.paid, cashM: nextCashM },
    weeklyIncome: nextIncome,
    cashM: nextCashM,
    groundGame: nextGroundGame,
    fundraisingFatigueByPartyState: nextFundraisingFatigue,
    proxyVisits: proxyPlan.visits,
    proxyVisitsByState: {
      ...proxyVisitsByState,
      ...proxyPlan.visits.reduce((counts, visit) => ({
        ...counts,
        [visit.stateId]: (counts[visit.stateId] || 0) + 1,
      }), {}),
    },
    superPac: superPacPlan,
    backgroundEndorsements,
    proxyUnlocks,
    eventCadence,
    generatedAtWeek: week,
    priorProxyVisitCount: priorVisitCount,
  };
  receipt.backgroundEffectBatch = routeBuild34WeeklyBackground(receipt, appliedEffectReceiptIds);
  const nextReceipts = { ...weeklyReceiptsByKey, [receiptKey]: receipt };
  return {
    ...receipt,
    weeklyIncome: nextIncome,
    cashM: nextCashM,
    weeklyAnnouncementReceipts: nextWeeklyAnnouncementReceipts,
    weeklyReceiptsByKey: nextReceipts,
    created: true,
  };
}
