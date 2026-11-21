/**
 * Build 33 state adapter for the portable Build 34 AI runtime.
 *
 * This module is intentionally the only Build 34 AI layer that knows the
 * current Build 33 save shape. Native functions are injected by the receiving
 * game; portable planner modules never import gameEngine.js.
 */
import {
  findBuild34AiEventContextReceipt,
  planBuild34NextDecision,
  prepareBuild34AiEventContext,
  recordBuild34AiDecisionApplied,
  resolveBuild34AiDecisionTarget,
  upsertBuild34AiPlanReceipt,
} from '../../lib/build34AiRuntime.js';
import { buildElectionStrategyGuidance } from '../../lib/aiStrategicPlanner.js';
import { STATE_LEGISLATURE_2028 } from '../../data/stateLegislature2028.js';
import {
  prepareHouseDistrictBaselineCatalog,
  projectStateLegislatureElection,
} from '../../lib/electionRuleResolvers.js';

export const BUILD33_ADAPTER_SOURCE = 'build33/src/lib/gameEngine.js';
export const BUILD33_ADAPTER_SAVE_FIELDS = Object.freeze([
  'build34CampaignId',
  'build34PublicStateRevision',
  'build34AiCurrentEventId',
  'build34AiCurrentEventData',
  'build34AiPlanReceipts',
  'build34AppliedDecisionReceiptIds',
]);

const partyIds = new Set(['dem', 'rep', 'grn', 'lib']);
const text = (value) => String(value ?? '').trim();

function requireFunction(value, label) {
  if (typeof value !== 'function') throw new Error(`Build 33 AI adapter requires native ${label}`);
  return value;
}

function requireGame(game) {
  if (!game || typeof game !== 'object') throw new Error('Build 33 AI adapter needs a game state');
  return game;
}

function serializableSnapshot(value, label) {
  try {
    const encoded = JSON.stringify(value);
    if (!encoded) throw new Error('empty snapshot');
    return JSON.parse(encoded);
  } catch {
    throw new Error(`Build 33 ${label} snapshot must be JSON-serializable`);
  }
}

/** Build a forecast only when native generic-vote and holdover-seat records exist. */
export function buildBuild33StateLegislatureSnapshot(game, native = {}, stateRows = []) {
  requireGame(game);
  if (typeof native.stateLegislatureInput === 'function') {
    const input = native.stateLegislatureInput(game, {
      schedule: STATE_LEGISLATURE_2028,
      stateRows: serializableSnapshot(stateRows, 'state poll rows'),
    }) || {};
    const stateGenericMarginByState = Object.fromEntries(stateRows
      .filter((row) => row?.stateId && row.genericMarginDemVsRep !== null &&
        row.genericMarginDemVsRep !== undefined && row.genericMarginDemVsRep !== '' &&
        Number.isFinite(Number(row.genericMarginDemVsRep)))
      .map((row) => [row.stateId, Number(row.genericMarginDemVsRep)]));
    for (const [stateId, margin] of Object.entries(input.stateGenericMarginByState || {})) {
      if (margin === null || margin === undefined || margin === '' || !Number.isFinite(Number(margin))) {
        delete stateGenericMarginByState[stateId];
      } else {
        stateGenericMarginByState[stateId] = Number(margin);
      }
    }
    return serializableSnapshot(projectStateLegislatureElection({
      ...input,
      stateGenericMarginByState,
      // The engine callback supplies live election/seat data, never schedule
      // metadata; keep the prototype's validated 2028 schedule authoritative.
      schedule: STATE_LEGISLATURE_2028,
    }), 'state legislature forecast');
  }
  return null;
}

/** Keep the House forecast unavailable until all 435 2026 rows have sourced baselines. */
export function buildBuild33HouseDistrictSnapshot(game, native = {}, stateRows = []) {
  requireGame(game);
  if (typeof native.houseDistrictSnapshot !== 'function') {
    return {
      schemaVersion: 1,
      available: false,
      districts: [],
      districtCount: 0,
      errors: ['Native 2026 House district snapshot callback is not bound'],
    };
  }
  const rawSource = native.houseDistrictSnapshot(game);
  if (rawSource === null || rawSource === undefined) {
    return {
      schemaVersion: 1,
      available: false,
      districts: [],
      districtCount: 0,
      errors: ['Native 2026 House district snapshot callback returned no source data'],
    };
  }
  const source = serializableSnapshot(rawSource, 'House district');
  const electoralVotesByState = new Map(stateRows.map((row) => [row.stateId, Number(row.electoralVotes)]));
  const expectedDistrictCountsByState = Object.fromEntries(STATE_LEGISLATURE_2028.map((state) => [
    state.stateId,
    electoralVotesByState.has(state.stateId) ? electoralVotesByState.get(state.stateId) - 2 : NaN,
  ]));
  return serializableSnapshot(prepareHouseDistrictBaselineCatalog(source, {
    expectedDistrictCount: 435,
    validStateIds: Object.keys(expectedDistrictCountsByState),
    expectedDistrictCountsByState,
  }), 'House district baseline catalog');
}

/**
 * Add required persistent identity to a new or migrated campaign.
 * @param {any} game
 * @param {{ campaignId?: string, initialRevision?: number }} [options]
 */
export function initializeBuild34CampaignMetadata(game, {
  campaignId,
  initialRevision = 0,
} = {}) {
  requireGame(game);
  const stableId = text(game.build34CampaignId) || text(campaignId);
  if (!stableId) throw new Error('Assign and persist a stable Build 34 campaign ID during creation or save migration');
  const revision = game.build34PublicStateRevision ?? initialRevision;
  if (!Number.isSafeInteger(Number(revision)) || Number(revision) < 0) {
    throw new Error('Build 34 public-state revision must be a nonnegative safe integer');
  }
  return {
    ...game,
    build34CampaignId: stableId,
    build34PublicStateRevision: Number(revision),
    build34AiCurrentEventId: game.build34AiCurrentEventId || null,
    build34AiCurrentEventData: game.build34AiCurrentEventData || null,
    build34AiPlanReceipts: Array.isArray(game.build34AiPlanReceipts) ? game.build34AiPlanReceipts : [],
    build34AppliedDecisionReceiptIds: Array.isArray(game.build34AppliedDecisionReceiptIds)
      ? game.build34AppliedDecisionReceiptIds
      : [],
  };
}

/** Call after a successful native campaign-state transition, never for receipt-only writes. */
export function advanceBuild34PublicStateRevision(previousGame, nextGame) {
  requireGame(previousGame);
  requireGame(nextGame);
  if (nextGame === previousGame) return previousGame;
  const current = Number(previousGame.build34PublicStateRevision);
  if (!Number.isSafeInteger(current) || current < 0 || current >= Number.MAX_SAFE_INTEGER || !previousGame.build34CampaignId) {
    throw new Error('Initialize Build 34 campaign metadata before advancing public state');
  }
  return {
    ...nextGame,
    build34CampaignId: previousGame.build34CampaignId,
    build34PublicStateRevision: current + 1,
    build34AiPlanReceipts: nextGame.build34AiPlanReceipts ?? previousGame.build34AiPlanReceipts ?? [],
    build34AppliedDecisionReceiptIds: nextGame.build34AppliedDecisionReceiptIds ??
      previousGame.build34AppliedDecisionReceiptIds ?? [],
  };
}

/** Build a stable key from the election rules currently stored by Build 33. */
export function buildBuild33ActiveRuleKey(game) {
  requireGame(game);
  return JSON.stringify({
    party: game.party,
    opponentParty: game.opponentParty,
    thirdMode: game.thirdMode || 'fringe',
    popularVote: Boolean(game.popularVote),
    houseRule: game.houseRule || 'standard',
    electoralRule: game.electoralRule || 'standard',
    indieSenate: Boolean(game.indieSenate),
    mcmullin: Boolean(game.mcmullin),
  });
}

/** Read the persistent planner identity without invoking forecast helpers. */
export function buildBuild33AiIdentity(game) {
  requireGame(game);
  const campaignId = text(game.build34CampaignId);
  const revision = Number(game.build34PublicStateRevision);
  const sourceWeekIndex = Number(game.week);
  const totalWeeks = Number(game.totalWeeks);
  if (!campaignId || !Number.isSafeInteger(revision) || revision < 0 ||
      !Number.isInteger(sourceWeekIndex) || sourceWeekIndex < 0 ||
      !Number.isInteger(totalWeeks) || sourceWeekIndex >= totalWeeks) {
    throw new Error('Initialize Build 34 campaign ID/revision before planning an active Build 33 week');
  }
  return {
    campaignId,
    week: sourceWeekIndex + 1,
    sourceWeekIndex,
    publicStateRevision: revision,
    ruleKey: buildBuild33ActiveRuleKey(game),
  };
}

/** Translate the current Build 33 campaign into public, serializable planner context. */
export function buildBuild33AiPublicContext(game, native = {}) {
  requireGame(game);
  const identity = buildBuild33AiIdentity(game);
  const snapshot = requireFunction(native.snapshot, 'snapshot')(game);
  const turnoutOf = requireFunction(native.turnoutOf, 'turnoutOf');
  const initialFactions = requireFunction(native.initialFactions, 'initialFactions');
  const senateSnapshot = requireFunction(native.senateSnapshot, 'senateSnapshot');
  const houseSnapshot = requireFunction(native.houseSnapshot, 'houseSnapshot');
  const govSnapshot = requireFunction(native.govSnapshot, 'govSnapshot');
  const rivalParty = game.opponentParty;
  const rivalCandidateId = game.opponentId;
  if (!partyIds.has(rivalParty) || !rivalCandidateId || !Number.isInteger(Number(game.week)) || Number(game.week) < 0) {
    throw new Error('Build 33 rival context needs a valid opponent, candidate, and active campaign week');
  }
  if (!Number.isInteger(Number(game.totalWeeks)) || Number(game.totalWeeks) < identity.week) {
    throw new Error('Build 33 rival context needs a valid campaign end week');
  }
  const rows = (snapshot?.rows || []).map((row) => {
    if (!row?.abbr || !row?.shares) throw new Error('Build 33 poll snapshot rows need state IDs and party shares');
    const margin = Number(row.margin);
    const genericMargin = Number(row.generic);
    if (row.margin === null || row.margin === undefined || row.margin === '' || !Number.isFinite(margin)) {
      throw new Error(`Build 33 shared poll snapshot is missing a valid state margin for ${row.abbr}`);
    }
    if (row.generic === null || row.generic === undefined || row.generic === '' || !Number.isFinite(genericMargin)) {
      throw new Error(`Build 33 shared poll snapshot is missing a valid generic-ballot margin for ${row.abbr}`);
    }
    const electoralVotes = Number(row.ev);
    const rawTurnout = turnoutOf(game, row.abbr, rivalParty);
    const rivalPartyTurnout = Number(rawTurnout);
    if (!Number.isFinite(electoralVotes) || electoralVotes < 1) {
      throw new Error(`Build 33 shared poll snapshot is missing valid Electoral College weight for ${row.abbr}`);
    }
    if (rawTurnout === null || rawTurnout === undefined || rawTurnout === '' ||
        !Number.isFinite(rivalPartyTurnout) || rivalPartyTurnout < 0 || rivalPartyTurnout > 100) {
      throw new Error(`Build 33 AI context is missing valid ${rivalParty} turnout for ${row.abbr}`);
    }
    return {
      stateId: row.abbr,
      stateName: row.name || row.abbr,
      marginDemVsRep: margin,
      genericMarginDemVsRep: genericMargin,
      electoralVotes,
      partyShares: { ...row.shares },
      rivalPartyTurnout,
    };
  });
  if (!rows.length) throw new Error('Build 33 AI context requires a nonempty shared poll snapshot');

  const defaultFactionStandings = initialFactions(rivalParty, rivalCandidateId) || {};
  const factionStandingById = {
    ...defaultFactionStandings,
    ...(game.aiFactions?.[rivalParty] || {}),
  };
  const electionRules = {
    houseRule: game.houseRule || 'standard',
    electoralRule: game.electoralRule || 'standard',
    popularVote: Boolean(game.popularVote),
    thirdMode: game.thirdMode || 'fringe',
  };
  const raceSnapshots = {
    senate: serializableSnapshot(senateSnapshot(game), 'Senate'),
    house: serializableSnapshot(houseSnapshot(game), 'House'),
    governors: serializableSnapshot(govSnapshot(game), 'governor'),
    houseDistricts: buildBuild33HouseDistrictSnapshot(game, native, rows),
    stateLegislatures: buildBuild33StateLegislatureSnapshot(game, native, rows),
  };
  return {
    identity,
    campaign: {
      party: rivalParty,
      candidateId: rivalCandidateId,
      opponentParty: game.party,
      opponentCandidateId: game.candidateId,
      week: identity.week,
      sourceWeekIndex: identity.sourceWeekIndex,
      totalWeeks: Number(game.totalWeeks),
      weeksRemaining: Math.max(0, Number(game.totalWeeks) - identity.week + 1),
      actionSlots: Number(native.actionsPerWeek) || 7,
      cashM: Math.max(0, Number(game.aiFunds?.[rivalParty]) || 0),
      factionStandingById,
      groundLevelsByState: { ...(game.aiOps?.[rivalParty] || {}) },
      opponentStyleId: text(native.opponentStyleByCandidateId?.[rivalCandidateId] || 'adaptive'),
      candidateStances: { ...(game.oppStances || {}) },
      rules: electionRules,
      electionStrategyGuidance: buildElectionStrategyGuidance({ party: rivalParty, rules: electionRules }),
      raceSnapshots,
    },
    publicSignals: {
      stateRows: rows,
      localNews: Array.isArray(game.stories) ? game.stories.map((story) => ({ ...story })) : [],
      worldNews: { ...(game.worldNews || {}) },
      worldShift: { ...(game.worldShift || {}) },
      issueSalience: { ...(game.salience || {}) },
      downballotNews: serializableSnapshot(game.downballotNews || {}, 'downballot news'),
      playerPromises: Array.isArray(game.promiseLedger) ? game.promiseLedger.map((promise) => ({ ...promise })) : [],
      currentOpponentEventId: null,
    },
  };
}

/**
 * Persist a rival event snapshot before any choice is scored. `drawOpponentEvent`
 * must call Build 33's `drawContextualEvent(game, { rival: true, ... })` once.
 * @param {any} game
 * @param {{ savedPlanReceipts?: any[], planSeed?: string | number | null, drawOpponentEvent?: (game: any) => any }} [options]
 */
export function prepareBuild33AiOpponentEvent(game, {
  savedPlanReceipts = game?.build34AiPlanReceipts || [],
  planSeed = null,
  drawOpponentEvent,
} = {}) {
  const { campaignId, week, publicStateRevision, ruleKey } = buildBuild33AiIdentity(game);
  const existing = findBuild34AiEventContextReceipt({
    campaignId,
    week,
    publicStateRevision,
    ruleKey,
    savedPlanReceipts,
  });
  if (week === 1) {
    if (existing) throw new Error("Build 34's first playable week cannot contain a rival event decision");
    return {
      game: { ...game, build34AiCurrentEventId: null, build34AiCurrentEventData: null },
      event: null,
      receipt: null,
      reused: false,
    };
  }
  if (existing) {
    const event = existing.eventContext.event;
    const nextGame = {
      ...game,
      build34AiCurrentEventId: event.id,
      build34AiCurrentEventData: event,
    };
    return { game: nextGame, event, receipt: existing, reused: true };
  }

  const event = requireFunction(drawOpponentEvent, 'drawOpponentEvent')(game);
  if (!event) {
    return {
      game: { ...game, build34AiCurrentEventId: null, build34AiCurrentEventData: null },
      event: null,
      receipt: null,
      reused: false,
    };
  }
  const prepared = prepareBuild34AiEventContext({
    campaignId,
    week,
    publicStateRevision,
    ruleKey,
    event,
    planSeed,
    savedPlanReceipts,
  });
  const upserted = upsertBuild34AiPlanReceipt(prepared.receipt, savedPlanReceipts);
  const nextGame = {
    ...game,
    build34AiPlanReceipts: upserted.savedPlanReceipts,
    build34AiCurrentEventId: upserted.receipt.eventContext.eventId,
    build34AiCurrentEventData: upserted.receipt.eventContext.event,
  };
  return { game: nextGame, event: upserted.receipt.eventContext.event, receipt: upserted.receipt, reused: prepared.reused };
}

/**
 * Score and persist the next decision without resolving a campaign effect.
 * @param {any} game
 * @param {{ native?: Record<string, any>, savedPlanReceipts?: any[], appliedDecisionReceiptIds?: string[], planSeed?: string | number | null, eventContextReceipt?: any, buildStrategyInput?: (context: any) => Record<string, any> }} [options]
 */
export function planBuild33AiOpponentDecision(game, {
  native = {},
  savedPlanReceipts = game?.build34AiPlanReceipts || [],
  appliedDecisionReceiptIds = game?.build34AppliedDecisionReceiptIds || [],
  planSeed = null,
  eventContextReceipt = null,
  buildStrategyInput,
} = {}) {
  const publicContext = buildBuild33AiPublicContext(game, native);
  const { campaignId, week, publicStateRevision, ruleKey } = publicContext.identity;
  const savedEvent = findBuild34AiEventContextReceipt({
    campaignId,
    week,
    publicStateRevision,
    ruleKey,
    savedPlanReceipts,
  });
  if (eventContextReceipt && !savedPlanReceipts.some((receipt) => receipt?.id === eventContextReceipt.id)) {
    throw new Error('Persist the Build 33 rival event receipt before asking the planner to score it');
  }
  const eventReceipt = eventContextReceipt || savedEvent;
  const activeEvent = eventReceipt?.eventContext?.event || null;
  if (activeEvent && text(game.build34AiCurrentEventId) !== text(activeEvent.id)) {
    throw new Error('Restore the persisted Build 33 rival event context before planning its choice');
  }
  if (!activeEvent && game.build34AiCurrentEventId) {
    throw new Error('Clear the previous Build 33 rival event before planning a non-event decision');
  }
  publicContext.publicSignals.currentOpponentEventId = activeEvent?.id || null;
  const createInputs = requireFunction(buildStrategyInput, 'buildStrategyInput');
  const strategyInput = createInputs({ publicContext, activeEvent });
  if (!strategyInput || typeof strategyInput !== 'object') {
    throw new Error('Build 33 strategy-input adapter must return normalized planner inputs');
  }
  const planned = planBuild34NextDecision({
    campaignId,
    week,
    publicStateRevision,
    ruleKey,
    decisionContextId: activeEvent?.id || '',
    planSeed: eventReceipt?.planSeed ?? planSeed,
    strategyInput: {
      ...strategyInput,
      activeRuleKey: publicContext.identity.ruleKey,
      electionStrategyGuidance: publicContext.campaign.electionStrategyGuidance,
      ...(activeEvent ? { activeEvent, activeEventId: activeEvent.id, eventChoices: activeEvent.choices } : {}),
    },
    savedPlanReceipts,
    appliedDecisionReceiptIds,
  });
  const persisted = planned.receipt
    ? upsertBuild34AiPlanReceipt(planned.receipt, savedPlanReceipts)
    : { savedPlanReceipts, receipt: null };
  const nextGame = persisted.savedPlanReceipts === game.build34AiPlanReceipts
    ? game
    : { ...game, build34AiPlanReceipts: persisted.savedPlanReceipts };
  return {
    game: nextGame,
    publicContext,
    strategy: planned.strategy,
    decision: planned.decision,
    receipt: persisted.receipt,
    reused: planned.reused,
    alreadyApplied: planned.alreadyApplied,
  };
}

/**
 * Resolve one saved decision and return the atomic save payload after success.
 * @param {any} game
 * @param {{ decision?: any, receipt?: any, savedPlanReceipts?: any[], appliedDecisionReceiptIds?: string[], activeEventId?: string | null, currentEventChoices?: any[], portfolioOptions?: any[], availableActions?: any[], applyNativeDecision?: (context: any) => { applied: boolean, game?: any, reason?: string } }} [options]
 */
export function applyBuild33AiOpponentDecision(game, {
  decision,
  receipt,
  savedPlanReceipts = game?.build34AiPlanReceipts || [],
  appliedDecisionReceiptIds = game?.build34AppliedDecisionReceiptIds || [],
  activeEventId = game?.build34AiCurrentEventId || null,
  currentEventChoices = game?.build34AiCurrentEventData?.choices || [],
  portfolioOptions = [],
  availableActions = [],
  applyNativeDecision,
} = {}) {
  const currentIdentity = buildBuild33AiIdentity(game);
  const committedReceipt = (game?.build34AiPlanReceipts || []).find((item) => item?.id === receipt?.id);
  if (!committedReceipt || committedReceipt.status !== 'pending' ||
      committedReceipt.decisionReceiptId !== receipt?.decisionReceiptId) {
    throw new Error('Persist the pending Build 33 AI decision receipt before calling its native resolver');
  }
  for (const key of ['campaignId', 'week', 'publicStateRevision', 'ruleKey']) {
    if (String(currentIdentity[key]) !== String(committedReceipt[key])) {
      throw new Error(`The Build 33 campaign ${key} changed after the AI decision was planned; replan before resolving`);
    }
  }
  const savedReceipt = savedPlanReceipts.find((item) => item?.id === committedReceipt.id);
  if (!savedReceipt || savedReceipt.status !== 'pending' ||
      savedReceipt.decisionReceiptId !== committedReceipt.decisionReceiptId) {
    throw new Error('The AI decision receipt must be present in the campaign save before it can be applied');
  }
  const target = resolveBuild34AiDecisionTarget({
    decision,
    receipt: committedReceipt,
    activeEventId: activeEventId || '',
    eventChoices: currentEventChoices,
    portfolioOptions,
    availableActions,
  });
  const resolved = requireFunction(applyNativeDecision, 'applyNativeDecision')({
    game,
    decision,
    target,
    receipt: committedReceipt,
    party: game.opponentParty,
    candidateId: game.opponentId,
  });
  if (!resolved?.applied || !resolved.game || resolved.game === game) {
    return { game, applied: false, reason: resolved?.reason || 'native-resolver-did-not-apply', receipt, savedPlanReceipts };
  }

  const transitionedGame = advanceBuild34PublicStateRevision(game, resolved.game);
  const applied = recordBuild34AiDecisionApplied({
    receipt: committedReceipt,
    resolverSucceeded: true,
    appliedDecisionReceiptIds: game.build34AppliedDecisionReceiptIds || appliedDecisionReceiptIds,
  });
  const persisted = upsertBuild34AiPlanReceipt(applied.receipt, savedPlanReceipts);
  const nextGame = {
    ...transitionedGame,
    build34AiPlanReceipts: persisted.savedPlanReceipts,
    build34AppliedDecisionReceiptIds: applied.appliedDecisionReceiptIds,
    ...(decision?.kind === 'event-choice'
      ? { build34AiCurrentEventId: null, build34AiCurrentEventData: null }
      : {}),
  };
  return {
    game: nextGame,
    applied: true,
    receipt: persisted.receipt,
    savedPlanReceipts: persisted.savedPlanReceipts,
    appliedDecisionReceiptIds: applied.appliedDecisionReceiptIds,
    publicStateRevision: nextGame.build34PublicStateRevision,
  };
}
