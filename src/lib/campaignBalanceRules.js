/**
 * Build 34's portable, deterministic balance primitives.
 *
 * These helpers intentionally operate on numbers/records rather than a game
 * object. The receiving Build 33 adapter should call them from the existing
 * action, finance, and fatigue resolvers; do not create parallel state in UI.
 */

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const nonNegative = (value) => Math.max(0, Number(value) || 0);

export const BUILD34_BALANCE = Object.freeze({
  weeklyIncomeMillionsPerVotePoint: 1 / 2.5,
  ownFatiguePenaltyPerPoint: 0.05,
  lifetimeFatiguePenaltyPerPoint: 0.0005,
  fatiguePenaltyFloor: 0,
  fundraiserFatiguePerAction: 2,
  fundraiserReturnLossPerPoint: 0.05,
  fundraiserReturnFloor: 0.5,
  fundraiserFatigueDecayPerWeek: 1,
  campaignStopTurnout: 2,
  campaignStopMomentum: 0.5,
  volunteerDriveCostM: 3,
  groundGameSetupCostMultiplier: 0.8,
  groundGameUpkeepMultiplier: 0.5,
  groundGameMarginPerLevelWeek: 0.05,
  groundGameStateMarginCap: 1.5,
  townHallFatiguePoints: 5,
  debatePrepVoterImpactMultiplier: 1.25,
  superPacAdEffectMultiplier: 0.2,
  endorsementLocalPersuasionCap: 1,
});

/** $1M for every 2.5 percentage points of frozen projected national vote share. */
export function weeklyBaseIncomeM(projectedPopularVoteSharePercent) {
  const share = clamp(projectedPopularVoteSharePercent, 0, 100);
  return share * BUILD34_BALANCE.weeklyIncomeMillionsPerVotePoint;
}

/** Freeze a campaign's start-of-week share once; existing records never reroll. */
export function freezeWeeklyIncomeRecord(weeklyIncome = {}, week, projectedSharePercent) {
  const key = String(week);
  if (weeklyIncome[key]) return { weeklyIncome, record: weeklyIncome[key], created: false };
  const share = clamp(projectedSharePercent, 0, 100);
  const record = {
    week,
    projectedSharePercent: share,
    baseIncomeM: weeklyBaseIncomeM(share),
    paid: false,
  };
  return { weeklyIncome: { ...weeklyIncome, [key]: record }, record, created: true };
}

/** Pay a frozen weekly draw at most once, independent of UI/render calls. */
export function payFrozenWeeklyIncome(weeklyIncome = {}, week, cashM = 0) {
  const key = String(week);
  const record = weeklyIncome[key];
  if (!record) throw new Error(`No frozen Build 34 income record for week ${key}`);
  if (record.paid) return { weeklyIncome, cashM: nonNegative(cashM), paid: false, record };
  const paidRecord = { ...record, paid: true };
  return {
    weeklyIncome: { ...weeklyIncome, [key]: paidRecord },
    cashM: nonNegative(cashM) + nonNegative(record.baseIncomeM),
    paid: true,
    record: paidRecord,
  };
}

/** Half-strength Build 33 own-state and lifetime fatigue penalties. */
export function campaignActionFatigueMultiplier(ownPoints = 0, stateLifetimePoints = 0) {
  const own = Math.max(
    BUILD34_BALANCE.fatiguePenaltyFloor,
    1 - BUILD34_BALANCE.ownFatiguePenaltyPerPoint * nonNegative(ownPoints),
  );
  const lifetime = Math.max(
    BUILD34_BALANCE.fatiguePenaltyFloor,
    1 - BUILD34_BALANCE.lifetimeFatiguePenaltyPerPoint * nonNegative(stateLifetimePoints),
  );
  return own * lifetime;
}

/** Fatigue reduces stop turnout; the stop's momentum gain is unaffected. */
export function campaignStopEffects(ownStopFatigue = 0, stateLifetimeFatigue = 0, basePersuasion = 0) {
  const multiplier = campaignActionFatigueMultiplier(ownStopFatigue, stateLifetimeFatigue);
  return {
    turnout: BUILD34_BALANCE.campaignStopTurnout * multiplier,
    persuasion: (Number(basePersuasion) || 0) * multiplier,
    momentum: BUILD34_BALANCE.campaignStopMomentum,
    fatigueMultiplier: multiplier,
  };
}

/** Call after resolving the current fundraiser, so new fatigue affects repeats. */
export function fundraisingFatigueMultiplier(points = 0) {
  return Math.max(
    BUILD34_BALANCE.fundraiserReturnFloor,
    1 - BUILD34_BALANCE.fundraiserReturnLossPerPoint * nonNegative(points),
  );
}

export function addFundraisingFatigue(points = 0) {
  return nonNegative(points) + BUILD34_BALANCE.fundraiserFatiguePerAction;
}

export function decayFundraisingFatigue(points = 0, elapsedWeeks = 1) {
  return Math.max(
    0,
    nonNegative(points) - BUILD34_BALANCE.fundraiserFatigueDecayPerWeek * nonNegative(elapsedWeeks),
  );
}

/** Apply the separate party/state fundraiser penalty, then add two points.
 * @param {{ baseReturnM?: number, party?: string, stateId?: string, fatigueByPartyState?: Record<string, Record<string, number>> }} options
 */
export function resolveFundraisingAction({
  baseReturnM,
  party,
  stateId,
  fatigueByPartyState = {},
} = {}) {
  if (!party || !stateId) throw new Error('Fundraising fatigue needs party and state IDs');
  const partyFatigue = fatigueByPartyState[party] || {};
  const pointsBefore = nonNegative(partyFatigue[stateId]);
  const multiplier = fundraisingFatigueMultiplier(pointsBefore);
  const returnM = nonNegative(baseReturnM) * multiplier;
  const pointsAfter = addFundraisingFatigue(pointsBefore);
  return {
    returnM,
    multiplier,
    pointsBefore,
    pointsAfter,
    fatigueByPartyState: {
      ...fatigueByPartyState,
      [party]: { ...partyFatigue, [stateId]: pointsAfter },
    },
  };
}

/** Decay every party/state fundraising meter once for the elapsed weeks. */
export function decayAllFundraisingFatigue(fatigueByPartyState = {}, elapsedWeeks = 1) {
  const next = {};
  for (const [party, byState] of Object.entries(fatigueByPartyState || {})) {
    next[party] = Object.fromEntries(Object.entries(byState || {}).map(([stateId, points]) => [
      stateId,
      decayFundraisingFatigue(points, elapsedWeeks),
    ]));
  }
  return next;
}

/** Lower starting turnout by ten only for a newly created campaign. */
export function applyNewGameTurnoutReduction({
  turnoutByState = {},
  isNewCampaign = false,
  alreadyApplied = false,
  reductionPoints = 10,
} = {}) {
  if (!isNewCampaign || alreadyApplied) return { turnoutByState, applied: false };
  const reduction = nonNegative(reductionPoints);
  return {
    turnoutByState: Object.fromEntries(Object.entries(turnoutByState).map(([stateId, turnout]) => [
      stateId,
      clamp(nonNegative(turnout) - reduction, 0, 100),
    ])),
    applied: true,
    reductionPoints: reduction,
  };
}

/**
 * Cumulative ground-game persuasion from the sum of active levels across
 * completed weeks. Pass levelWeeks (the sum of levels for each full week), so
 * midweek builds do not receive a retroactive margin bonus.
 */
export function groundGameAccumulatedMargin(currentMargin = 0, levelWeeks = 0) {
  return Math.min(
    BUILD34_BALANCE.groundGameStateMarginCap,
    nonNegative(currentMargin) + BUILD34_BALANCE.groundGameMarginPerLevelWeek * nonNegative(levelWeeks),
  );
}

/** Resolve each complete week of ground-game margin exactly once. */
export function resolveGroundGameWeek({
  accumulatedByState = {},
  resolvedWeeks = [],
  week,
  activeLevelsByState = {},
}) {
  const key = String(week);
  if (resolvedWeeks.includes(key)) return { accumulatedByState, resolvedWeeks, applied: false };
  const next = { ...accumulatedByState };
  for (const [stateId, levels] of Object.entries(activeLevelsByState)) {
    next[stateId] = groundGameAccumulatedMargin(next[stateId], nonNegative(levels));
  }
  return {
    accumulatedByState: next,
    resolvedWeeks: [...resolvedWeeks, key],
    applied: true,
  };
}

export function groundGameSetupCostM(build33SetupCostM) {
  return nonNegative(build33SetupCostM) * BUILD34_BALANCE.groundGameSetupCostMultiplier;
}

export function groundGameUpkeepM(build33UpkeepM) {
  return nonNegative(build33UpkeepM) * BUILD34_BALANCE.groundGameUpkeepMultiplier;
}

/** The field actions/PACs resolve effects through existing shared pipelines. */
export function volunteerDriveCostM() {
  return BUILD34_BALANCE.volunteerDriveCostM;
}

export function superPacAdMultiplier() {
  return BUILD34_BALANCE.superPacAdEffectMultiplier;
}

export function capLocalEndorsementPersuasion(points = 0) {
  return clamp(points, -BUILD34_BALANCE.endorsementLocalPersuasionCap, BUILD34_BALANCE.endorsementLocalPersuasionCap);
}

/** Increase only debate-prep voter impact; preserve costs, risk, and fatigue. */
export function scaleDebatePrepVoterImpact(voterImpact) {
  const multiplier = BUILD34_BALANCE.debatePrepVoterImpactMultiplier;
  if (typeof voterImpact === 'number') return voterImpact * multiplier;
  if (Array.isArray(voterImpact)) return voterImpact.map(scaleDebatePrepVoterImpact);
  if (voterImpact && typeof voterImpact === 'object') {
    return Object.fromEntries(Object.entries(voterImpact).map(([key, value]) => [
      key,
      typeof value === 'number' ? value * multiplier : scaleDebatePrepVoterImpact(value),
    ]));
  }
  return voterImpact;
}
