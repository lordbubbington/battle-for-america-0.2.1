import { getActiveModDescriptors } from '@/lib/modRegistry';
import { BUILD40_EVENTS } from '@/data/build40EventCatalog';
import { CANDIDATE_EVENTS, CANDIDATE_EVENTS_BY_ID } from '@/data/candidateEvents/index';
import { NEIGHBORS } from '@/data/neighbors';
import { BUILD45_HOUSE_PVI_REVISION } from '@/lib/build45HousePvi';
import { BUILD45_LEGISLATURE_CLASS_REVISION } from '@/lib/build45LegislatureClasses';
import { candidateEventState, eligibleCandidateEvents, ensureCandidateGuarantees, participatingCandidates,
  recordCandidateEventPresented, recordCandidateEventResolved } from '@/lib/candidateEvents';
import { build40DecisionContext, build40EventId, build40ChoiceCost, build40EffectStates, materializeBuild40Decision, resolveBuild40Roll } from '@/lib/build40DecisionRuntime';
import { build40ActingParty, build40DecisionEligibility, build40IncidentSources, build40ReportState } from '@/lib/build40DecisionEligibility';
import { auditedReceiptEvent, validPendingReceipt, validSelectionReceipt, selectionEvidence } from '@/lib/build44ReceiptEvidence';
import { choicePresentation, outcomePresentation } from '@/lib/build44EventPresentation';
import { recordIncident } from '@/lib/incidentLedger';
import { build40CampaignFactCheck, build40DebateEvidence, build40FactionCalendar, build40FieldEvidence, build40PolicyReview, build40RecordedFollowUp, build40RunningMateFollowUps, build40SimulatedElectionNotices } from '@/lib/build40Reports';
import { normalizeBuild40Mode } from '@/lib/build40Elections';
import { resolveRallyEffect, resolvePolicyEffect } from '@/lib/build39CampaignEffects';
import { SCENARIOS, normalizeScenarioId, scenarioPartyIds, initializeScenarioState, resolveScenarioRivals, scenarioRankedChoiceTally, scenarioBallotAccess, isScenarioCandidate } from '@/lib/build39Scenarios';
import { candidateStartingFunds } from '@/lib/build39Candidates';
import { VOTER_COMPOSITION } from '@/lib/build38Runtime';
import { applyOpeningTicket, build38Field, ideologyEnvironmentDelta, initializeBuild38, volunteerPrice } from '@/lib/build38Runtime';
import { regionalPersuasionDelta } from '@/lib/build38VoterRegions';
import { spanishAdEffect } from '@/lib/build38SpanishAds';
import { calibrateGovernorOpening } from '@/lib/build38VotingRules';
import { compressSync, decompressSync, strFromU8, strToU8 } from 'fflate';
import {
  STATES,
  STATE_BY_ABBR,
  BASE_LEANS,
  DISTRICT_LIST,
  SPLIT_AT_LARGE,
  REGIONS,
  EV_TO_WIN,
  reportSpeed,
} from '@/data/states';
import { CANDIDATE_BY_ID, byParty } from '@/data/candidates';
import { ensureBuild34RuntimeCatalogs } from '@/lib/build34Integration';
import { startingNationalEnvironment, clampStartingNationalEnvironment, DIFFICULTY_START_RULES } from '@/lib/newGameProfiles';
import { STATE_DEMOGRAPHICS, stateGroupShift } from '@/data/demographics';
import { ENDORSER_ROSTER } from '@/data/endorserRoster';
import { MAIN_GAME_ENDORSEMENTS_ENABLED } from '@/lib/endorsementRemoval.mjs';
import { SENATE_RACES, SENATE_RACE_BY_STATE, SENATE_START, rollSenateStart } from '@/data/senate';
import { DEBATE_BY_ID, DEBATE_BY_WEEK } from '@/data/debates';
import { STATE_LEGISLATURES_2028 } from '@/data/stateLegislatureCycles';
import { runningMateFor, mateOptions, sameStateTicket } from '@/data/runningMates';
import {
  ISSUE_BY_ID,
  stancesFor,
  stateIssueAlignment,
  stanceLabel,
} from '@/data/platform';
import { policyMargin, rawPolicyMargin } from '@/lib/policy';
import { marginColor } from '@/lib/marginColors';
import { addFatigue, addGeneralFatigue, actionMultiplier, decayFatigue, emptyFatigue } from '@/lib/fatigue';
import {
  BUILD34_BALANCE,
  campaignActionFatigueMultiplier,
  campaignStopEffects,
  decayAllFundraisingFatigue,
  resolveGroundGameWeek,
  applyNewGameTurnoutReduction,
  resolveFundraisingAction,
  weeklyBaseIncomeM,
} from '@/lib/campaignBalanceRules';
import { SUPER_PAC_ROSTER } from '@/data/superPacRoster';
import { assignSuperPacsForMode, resolveSuperPacWeek, convertLegacySuperPacWeekReceipt, SUPER_PAC_AGGREGATE_SCHEMA_VERSION, SUPER_PAC_EFFECT_MULTIPLIER, SUPER_PAC_GROUP_PRESSURE_CAP } from '@/lib/superPacRules';
import { build34CampaignEffectBatch } from '@/lib/build34CommandRouter';
import { scheduleProxyVisits, startingProxyForParty, unlockProxyFromEndorsement } from '@/lib/proxyCampaigners';
import { resolveBackgroundEndorsementWeek } from '@/lib/endorsementScheduler';
import {
  buildEndorsementEffectCommands,
  endorsementEligibility,
  recordEndorsement,
} from '@/lib/campaignOrganizationRules';
import {
  endorsementBenefitValues,
  endorserFactionGroupId,
  initialEndorserRelationships,
  updateEndorserPolicyRelationships,
} from '@/lib/endorsementNetwork';
import { dragTowardBaseline } from '@/lib/drag';
import { AI_START_FUNDS, adLine, aiAdWeek, aiBudgetPlan, thirdPartyCampaignPlan } from '@/lib/aiCampaign';
import { groundSetupCost, groundWeeklyCost } from '@/lib/fieldOperations';
import { applyOpeningFieldPlan, getDetailedPolling as buildDetailedPolling, quoteOpeningFieldPlan } from '@/lib/build40Field';
import { runCorruptionAd } from '@/lib/corruptionAd';
import {
  COALITION_GROUPS,
  coalitionRows,
  rallyGroupShifts,
  townhallGroupShifts,
  stanceGroupShifts,
} from '@/lib/coalition';
import { factionsFor, factionEffects, factionStandings, decayFactions, initialFactions, donorIncomeMultiplier, factionGroupBonuses, repairedFactionCrises } from '@/lib/factions';
import { createSeededRandom } from '@/lib/seededRandom';
import { decisionCountForWeek } from '@/lib/build36DecisionSchedule';
import { planWeeklyEventCadence } from '@/lib/eventCadenceV2';
import { ELECTION_MODEL_VERSION, closeEarlyBallots, earlyBallotsByState, presidentialBallots, projectEarlyBallotPace, restoreEarlyBallots } from '@/lib/build37Ballots';
import { createEarlyBallotLedger } from '@/lib/earlyBallotLedger';
import { resolveRivalForecastTurn } from '@/lib/rivalForecastPlanner';
import { BALLOT_MEASURE_RULES, BALLOT_MEASURE_RULES_VERSION } from '@/data/ballotMeasureRules';
import { ballotMeasureEligibility, sanitizeBallotMeasures } from '@/lib/ballotMeasures';
import {
  initialEndorsements,
  recordPolicyChoice,
  sanitizeEndorsements,
} from '@/lib/campaignOperations';
import { advanceNews, ambientStory, opponentStory, pushStory, storyFrom, thirdPartyStory } from '@/lib/news';
import { rollWorldNews } from '@/lib/worldNews';
import { readSignals } from '@/lib/storyEngine';
import { nationalNewsCard, weeklyNationalNews } from '@/lib/nationalNews';
import { RIVAL_INCIDENT_NEWS } from '@/data/rivalIncidentNews';
import { VANCE_SUCCESSION_BY_ID, VANCE_SUCCESSION_PART_EFFECTS } from '@/data/vanceSuccession';
import {
  CLOSE_RACE,
  addGeneric,
  applyWeeklyPresidentialCoattails,
  baseGenericAverage,
  decayGeneric,
  genericAverage,
  genericIn,
  initialGenericEnvironment,
  isRegionalEnvironmentIgnored,
  rallyGenericFactor,
  recomputeEffectiveGeneric,
} from '@/lib/environment';
import {
  drawWeightedPlayerEvent,
  scaleRegionalPersuasion,
} from '@/lib/v022Balance';

export { policyMargin, issueBreakdown } from '@/lib/policy';
import {
  addTurnoutState,
  addTurnoutRegion,
  baseTurnoutRow,
  bumpTurnoutState,
  turnoutOf,
  turnoutRow,
  voteUnits,
  votesFor,
} from '@/lib/turnout';
import { rankedChoiceTally } from '@/lib/rankedChoice';
import { allocateProportional } from '@/lib/electionRules';
import { applyMomentumTurnout, applyMomentumVotes, decayMomentum, momentumOf } from '@/lib/momentum';
import { houseStartRoll, govStartRoll, GOVERNOR_BY_STATE, HOUSE_SEATS } from '@/data/downballot';
import {
  PARTY_COLOR,
  buildDownballot,
  buildGov,
  buildHouse,
  HOUSE_DISTRICT_BASELINES,
  buildSenate,
  downballotTargets,
  isThirdParty,
  raceMargin,
  ratingFor,
  rollRaceQuality,
  rollThirdBoard,
  shareModel as boardShares,
  winnerOf,
  isTossup,
  TOSSUP_COLOR,
  TOSSUP_MARGIN,
} from '@/lib/downballot';

import {
  AD_TYPES,
  ATTACK_BACKFIRE,
  POSITIVE_BACKFIRE,
  BACKFIRE_STATE_HIT,
  BACKFIRE_NATIONAL_HIT,
  ATTACK_LOCAL_BACKFIRE,
  POSITIVE_LOCAL_BACKFIRE,
  LOCAL_BACKFIRE_TURNOUT,
  adCost,
  adBaseStrength,
  adQualityRoll,
} from '@/lib/ads';

export { EV_TO_WIN };
export { isThirdParty, PARTY_COLOR, ratingFor, isTossup, TOSSUP_COLOR, TOSSUP_MARGIN };
// Campaign Staff DLC stubs (staff modules archived in dlc/campaign-staff/).
const staffWeeklyUpkeep = (..._args) => ({ totalM: 0 });
const isTraditionalStaffingReady = (..._args) => true;
const applyBuild35Agenda = (_game, _next, _action, payload, ..._rest) => payload;
const applyBuild35Contract = (..._args) => ({ applied: false, extraMargin: 0, extraTurnout: 0, extraMomentum: 0 });
const build35Attendance = (_game, _next, _actionId, _abbr, turnout, ..._rest) => ({ turnout, multiplier: 1 });
const build35QualityRoll = (_game, _next, _kind, roll, ..._rest) => roll;
const build35FieldConversion = (_game, _next, _abbr, _actionId, turnout, ..._rest) => turnout;
const build35SignageCost = (_game, _next, _abbr, cost, ..._rest) => cost;
const fileBuild35StaffDebrief = (..._args) => {};

export const TOTAL_WEEKS = 14;
export const ACTIONS_PER_WEEK = 7;
const BUILD40_EVENTS_BY_ID = Object.fromEntries(BUILD40_EVENTS.map((event) => [event.id, event]));
const DECISION_EVENTS_BY_ID = { ...BUILD40_EVENTS_BY_ID, ...CANDIDATE_EVENTS_BY_ID };
// A third-party campaign outside the four-party scenario starts on fumes: a
// rented office and about ten million dollars.
export const THIRD_START_FUNDS = 15;
// ...and every action it takes is worth less, because nobody is listening yet.
// Both dampers stack, so a fringe third party works at a third of a major's
// strength in a state it has not broken through in — and at 60% once it has.
export const THIRD_ACTION_DAMP = 0.6;
// Under ten percent in a state, no campaign's work lands properly there.
export const FLOOR_SHARE = 10;
export const FLOOR_ACTION_DAMP = 0.6;
// What counts as a swing state for Drift: anything inside five points either way.
export const DRIFT_SWING_MARGIN = 5;
export const PARTY_ORDER = ['dem', 'rep', 'lib', 'grn'];
function createCampaignId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `campaign-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
export const OPPONENT_CLOSEST = 5;
export const DEBATE_PREP_MAX = 3;
export const ELECTION_DATE = new Date('2028-11-07T12:00:00');

// The calendar runs to the same election night whatever you choose, so a January
// launch is a forty-four week campaign and August is the fourteen-week sprint.
export const START_OPTIONS = [
  {
    id: 'jan',
    label: 'January 1',
    date: '2028-01-01',
    blurb: 'The whole year. Every scandal gets time to breathe, and so do you.',
  },
  {
    id: 'apr',
    label: 'April 1',
    date: '2028-04-01',
    blurb: 'Spring to November — the primaries behind you, a long summer ahead.',
  },
  {
    id: 'aug',
    label: 'August 1',
    date: '2028-08-01',
    blurb: 'The sprint. Fourteen weeks, and no room for a bad one.',
  },
];

export const DEFAULT_START = 'aug';

export function startOption(id) {
  return START_OPTIONS.find((o) => o.id === id) || START_OPTIONS.find((o) => o.id === DEFAULT_START);
}

function weeksToElection(dateISO) {
  const start = new Date(`${dateISO}T12:00:00`);
  return Math.max(1, Math.round((ELECTION_DATE.getTime() - start.getTime()) / (7 * 86400000)));
}

START_OPTIONS.forEach((o) => {
  o.totalWeeks = weeksToElection(o.date);
});

export function totalWeeksOf(game) {
  return game?.totalWeeks || TOTAL_WEEKS;
}

export const DIFFICULTIES = {
  realistic: {
    id: 'realistic',
    label: 'Realistic',
    icon: 'difficulty-hard',
    blurb: 'D+9 national start with Hard campaign conditions and Nightmare-level opponent planning.',
    startFunds: 187.5,
    noise: 2.9,
    oppSkill: 3,
    aiFocus: 1.8,
    negativeBias: 2.5,
    decay: 0.8,
    missScale: 1.3,
    showExact: false,
    scandalScale: 1.75,
    scoreMul: 1.5,
    genericCap: 9,
    drift: 0.1,
    startEnvironment: { direction: 'fixed', marginPoints: 9 },
    aiPlanningProfile: 'nightmare',
  },
  cupcake: {
    id: 'cupcake',
    label: 'Cupcake',
    icon: 'difficulty-cupcake',
    blurb: 'If you cant win this game mode, you should quit the game',
    startFunds: DIFFICULTY_START_RULES.cupcake.fundsM,
    noise: 1.1,
    oppSkill: 0.5,
    aiFocus: 0.15,
    negativeBias: 0.5,
    decay: 0.4,
    missScale: 0.7,
    showExact: true,
    scandalScale: 0.7,
    scoreMul: DIFFICULTY_START_RULES.cupcake.scoreMul,
    // Cupcake's explicit profile start is ten points toward the player's party.
    startEnvironment: { direction: 'player-favored', marginPoints: 10 },
  },

  easy: {
    id: 'easy',
    label: 'Easy',
    icon: 'difficulty-easy',
    blurb: 'Generous donors, a clumsy opponent, tighter polls and a smaller election-night miss.',
    startFunds: DIFFICULTY_START_RULES.easy.fundsM,
    noise: 1.1,
    oppSkill: 0.5,
    aiFocus: 0.3,
    negativeBias: 0.5,
    decay: 0.4,
    missScale: 0.7,
    showExact: true,
    scandalScale: 0.7,
    scoreMul: DIFFICULTY_START_RULES.easy.scoreMul,
    genericCap: DIFFICULTY_START_RULES.easy.favorableCap,
    startEnvironment: { direction: 'player-favored', marginPoints: 10 },
  },
  
  medium: {
    id: 'medium',
    label: 'Normal',
    icon: 'difficulty-medium',
    blurb: 'A real race. Ratings instead of numbers, and the polls miss like they do in real life.',
    // How far the national mood can be dragged toward your own party...
    genericCap: DIFFICULTY_START_RULES.medium.favorableCap,
    drift: 0.28,
    swingDrift: 0.2,
    startFunds: DIFFICULTY_START_RULES.medium.fundsM,
    noise: 1.9,
    oppSkill: 1.0,
    aiFocus: 0.55,
    negativeBias: 1.0,
    decay: 0.6,
    missScale: 1.0,
    showExact: false,
    scandalScale: 1,
    scoreMul: DIFFICULTY_START_RULES.medium.scoreMul,
    startEnvironment: { direction: 'neutral', marginPoints: 0 },
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    icon: 'difficulty-hard',
    blurb: 'Bad news finds you, the opponent never misses, and every swing state is a fight.',
    genericCap: DIFFICULTY_START_RULES.hard.favorableCap,
    // Drift: the map slides toward your opponent every week, fastest in the
    // states that will decide it.
    drift: 0.1,
    startFunds: DIFFICULTY_START_RULES.hard.fundsM,
    noise: 2.9,
    oppSkill: 1.65,
    aiFocus: 0.95,
    negativeBias: 2.5,
    decay: 0.8,
    missScale: 1.3,
    showExact: false,
    scandalScale: 1.75,
    scoreMul: DIFFICULTY_START_RULES.hard.scoreMul,
    startEnvironment: { direction: 'player-favored', marginPoints: 3 },
  },
  brutal: {
    id: 'brutal',
    label: 'Brutal',
    icon: 'difficulty-brutal',
    blurb: 'A war chest the size of a small economy, a news cycle that hunts you for sport, and relentless opposition.',
    // ...and the mood starts against you: it can never be better than R+2.
    genericCap: DIFFICULTY_START_RULES.brutal.favorableCap,
    drift: 0.2,
    startFunds: DIFFICULTY_START_RULES.brutal.fundsM,
    noise: 3.6,
    oppSkill: 2.1,
    aiFocus: 1.35,
    negativeBias: 5.0,
    decay: 0.95,
    missScale: 1.45,
    showExact: false,
    scandalScale: 2,
    scoreMul: DIFFICULTY_START_RULES.brutal.scoreMul,
    startEnvironment: { direction: 'opponent-favored', marginPoints: 2 },
  },
  nightmare: {
    id: 'nightmare',
    label: 'Nightmare',
    icon: 'difficulty-nightmare',
    blurb: 'Forty million dollars, an opponent who never errs, a press corps with receipts, and every battleground under siege.',
    // The country begins ten points against you, and stays there.
    genericCap: DIFFICULTY_START_RULES.nightmare.favorableCap,
    drift: 0.5,
    startFunds: DIFFICULTY_START_RULES.nightmare.fundsM,
    noise: 4.4,
    oppSkill: 3,
    aiFocus: 1.8,
    negativeBias: 7.5,
    decay: 0.99,
    missScale: 1.6,
    showExact: false,
    scandalScale: 3,
    scoreMul: DIFFICULTY_START_RULES.nightmare.scoreMul,
    startEnvironment: { direction: 'opponent-favored', marginPoints: 10 },
  },
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const round1 = (v) => Math.round(v * 10) / 10;
function gauss() {
  let u = 0;
  let v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function weekDate(game, week) {
  const d = new Date(`${startOption(game?.startId).date}T12:00:00`);
  d.setDate(d.getDate() + week * 7);
  return d;
}

export function weekLabel(game, week) {
  return weekDate(game, week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function daysUntilElection(game, week) {
  return Math.max(0, Math.round((ELECTION_DATE.getTime() - weekDate(game, week).getTime()) / 86400000));
}

// ---------------------------------------------------------------------------
// Polling error
//
// Polls are not the result. Every campaign carries a hidden miss that is shared
// nationally, tilted by region, and then noisy state by state — which is how you
// get the real-world pattern of "Democrats under-polled by 2 nationally, 5 in
// the Midwest, 7 in Iowa, but only 2 in Ohio". Misses run both ways; the sign is
// Democratic-minus-Republican, so a positive miss means the Democrats beat their
// polls.
// ---------------------------------------------------------------------------

export function rollPollMiss(scale = 1) {
  const nat = gauss() * 2.6;
  const region = {};
  Object.keys(REGIONS).forEach((r) => {
    region[r] = gauss() * 2.85;
  });
  const state = {};
  STATES.forEach((s) => {
    // Small electorates are polled less and miss more.
    const spread = 0.5 + 1.0 / Math.sqrt(s.ev);
    state[s.abbr] = nat * 0.6 + region[s.region] + gauss() * spread;
  });
  return { nat, region, state, scale };
}

export function pollMissFor(abbr, game) {
  const m = game.pollMiss;
  if (!m || !m.state) return 0;
  return (m.state[abbr] || 0) * (m.scale ?? 1);
}

function freshNoise(diff) {
  const nat = gauss() * 0.45;
  const region = {};
  Object.keys(REGIONS).forEach((r) => {
    region[r] = gauss() * 0.7;
  });
  const noise = {};
  STATES.forEach((s) => {
    const spread = 0.25 + 0.5 / Math.sqrt(s.ev);
    noise[s.abbr] = (nat + region[s.region] + gauss() * spread) * (diff.noise / 1.9);
  });
  return noise;
}

export function createGame({
  party,
  candidateId,
  opponentId,
  difficultyId,
  leans,
  stateAdjustments = {},
  weighted,
  runningMateId,
  thirdMode = 'fringe',
  scenarioId = 'standard',
  modeId = null,
  opponentParty: selectedOpponentParty = null,
  indieSenate = false,
  mcmullin = true,
  startId = DEFAULT_START,
  popularVote = false,
  houseRule = 'standard',
  electoralRule = 'standard',
  votingRuleId = 'current',
  nationalGeneric,
  randomness = 0,
  simulateElection = false,
  sittingPresidentId = 'trump',
  ballotMeasures = [],
  ballotMeasureRules = BALLOT_MEASURE_RULES,
  campaignId = null,
  openingFieldPlan = {},
}) {
  ensureBuild34RuntimeCatalogs();
  const openingModel = Boolean(modeId);
  if (modeId) {
    const mode = normalizeBuild40Mode(modeId);
    if (mode.legacyFavorite) throw new RangeError('Favorite Sons and Daughters is available only in saved campaigns');
    if (mode.modeId === 'six-party') throw new RangeError('Six Party Mode has been removed for new campaigns; existing saves can still be resumed.');
    ({ scenarioId, thirdMode, modeId } = mode);
  } else {
    scenarioId = normalizeScenarioId(scenarioId);
    thirdMode = SCENARIOS.find((scenario) => scenario.id === scenarioId)?.thirdMode || thirdMode;
  }
  const isRegionalNew = modeId === 'regional-parties' || scenarioId === 'regional-parties';
  // R02: Regional Parties locks difficulty to Normal (medium) and ignores national environment.
  const diff = isRegionalNew ? DIFFICULTIES.medium : (DIFFICULTIES[difficultyId] || DIFFICULTIES.medium);
  const startingLeans = { ...(leans || BASE_LEANS) };
  if (['cupcake', 'easy'].includes(diff.id) && stateAdjustments && typeof stateAdjustments === 'object') {
    const stateAbbrs = new Set(STATES.map(({ abbr }) => abbr));
    Object.entries(stateAdjustments).forEach(([abbr, adjustment]) => {
      if (stateAbbrs.has(abbr) && Number.isFinite(adjustment)) {
        startingLeans[abbr] = (Number(startingLeans[abbr]) || 0) + adjustment;
      }
    });
  }
  const defaultStartEnvironment = startingNationalEnvironment({
    difficultyId: diff.id,
    playerParty: party,
    modeMaximumEnvironment: diff.startEnvironment,
  });
  const requestedGeneric = Number.isFinite(nationalGeneric)
    ? nationalGeneric
    : defaultStartEnvironment.nationalGeneric;
  const startingGeneric = isRegionalNew ? 0 : clampStartingNationalEnvironment({ difficultyId: diff.id, playerParty: party, nationalGeneric: requestedGeneric });
  const expectedRival = party === 'dem' ? 'rep' : 'dem';
  const candidateParty = CANDIDATE_BY_ID[opponentId]?.party;
  const rivalParty = selectedOpponentParty || candidateParty;
  const opponentParty = rivalParty && rivalParty !== party ? rivalParty : expectedRival;
  const HISTORICAL_IDS = new Set(['fdr', 'reagan', 'debs', 'washington']);
  const pickDefaultCandidate = (pId, excludeId = null) => {
    const pool = byParty(pId, scenarioId).filter(({ id }) => id !== excludeId);
    const modern = pool.filter(({ id }) => !HISTORICAL_IDS.has(id));
    const list = modern.length ? modern : pool;
    return list.slice().sort((a, b) => (b.weight || 0) - (a.weight || 0))[0]?.id || null;
  };
  if (openingModel) {
    if (!byParty(party, scenarioId).some(({ id }) => id === candidateId)) {
      candidateId = pickDefaultCandidate(party) || candidateId;
    }
    if (opponentId === candidateId || !byParty(opponentParty, scenarioId).some(({ id }) => id === opponentId)) {
      opponentId = pickDefaultCandidate(opponentParty, candidateId) || opponentId;
    }
  }
  const board = rollThirdBoard();
  const thirdStart = isThirdParty(party) && thirdMode !== 'surge';
  const aiNomineeId = (aiParty) => aiParty === opponentParty
    ? opponentId
    : byParty(aiParty, scenarioId).slice().sort((a, b) => b.weight - a.weight)[0]?.id || null;
  const activeCampaignParties = [...new Set([...PARTY_ORDER, ...scenarioPartyIds(scenarioId).filter((id) => id !== 'ind')])];
  const aiFunds = Object.fromEntries(activeCampaignParties.map((aiParty) => [
    aiParty,
    aiParty === party ? 0 : (modeId === 'two-parties' && !['dem', 'rep'].includes(aiParty)
      ? 10
      : candidateStartingFunds(aiParty === 'dem' || aiParty === 'rep' ? AI_START_FUNDS : THIRD_START_FUNDS, CANDIDATE_BY_ID[aiNomineeId(aiParty)]?.ratings?.corruption)),
  ]));
  const aiFactions = Object.fromEntries(activeCampaignParties.map((aiParty) => [
    aiParty,
    initialFactions(aiParty, aiNomineeId(aiParty)),
  ]));
  const cleanedBallotMeasures = sanitizeBallotMeasures(ballotMeasures, ballotMeasureRules);
  const senateNoise = {};
  SENATE_RACES.forEach((r) => {
    senateNoise[r.state] = gauss() * 1.3;
  });

  // The running mate opens the map before a single dollar is spent: home state,
  // a few neighbours, and a regional pull, paid for with a national penalty.
  // No ticket carries two names from the same state: a state's electors get one
  // vote, so a running mate from the nominee's own state is simply dropped.
  const vpPick = runningMateFor(party, runningMateId, candidateId, scenarioId);
  const nomineeState = CANDIDATE_BY_ID[candidateId]?.state;
  const vp = vpPick && vpPick.state === nomineeState ? null : vpPick;
  const pov = party === 'rep' ? -1 : 1;
  const stateMods = {};
  if (vp) {
    Object.entries(vp.states || {}).forEach(([abbr, amt]) => {
      stateMods[abbr] = (stateMods[abbr] || 0) + amt * pov;
    });
    Object.entries(vp.region || {}).forEach(([r, amt]) => {
      STATES.filter((s) => s.region === r).forEach((s) => {
        stateMods[s.abbr] = (stateMods[s.abbr] || 0) + amt * pov;
      });
    });
    if (vp.nat) {
      STATES.forEach((s) => {
        stateMods[s.abbr] = (stateMods[s.abbr] || 0) + vp.nat * pov;
      });
    }
  }

  const game = {
    party,
    build34CampaignId: campaignId || createCampaignId(),
    build34ProxyCampaigners: PARTY_ORDER.map(startingProxyForParty).filter(Boolean),
    build34ProxyVisitsByPartyState: {},
    build34ProxyReceiptsByWeek: {},
    build34SuperPacReceiptsByWeek: {},
    build34EndorserRelationships: {},
    build34EndorserMemories: {},
    build34EndorserRegistry: {},
    build34EndorserTurnoutEarnedByState: {},
    build34EndorserPersuasionEarnedByState: {},
    build34IssueAdCredits: [],
    build34AppliedEndorsementIds: [],
    build34EndorsementReceiptsByWeek: {},
    build34EndorsementGroupModsByState: {},
    build34OutsideCampaignReceiptsByWeek: {},
    build34AppliedEventEffectIds: [],
    build34ExtraWeeklyUpkeepByState: {},
    perceivedCorruptionScore: 25,
    candidateId,
    opponentId,
    sittingPresidentId: typeof sittingPresidentId === 'string' ? sittingPresidentId : 'trump',
    vanceSuccessionPart: 0,
    vanceSuccessionStarted: false,
    vanceSuccessionDeliveredWeek: null,
    vanceSuccessionAppliedParts: [],
    vanceSuccessionEffects: { moderate: 0, magaLoss: 0, turnoutLoss: 0 },
    runningMateId: vp ? vp.id : null,
    difficultyId: diff.id,
    startId: startOption(startId).id,
    totalWeeks: weeksToElection(startOption(startId).date),
    // Decided by the national popular vote instead of the Electoral College.
    popularVote: !!popularVote,
    houseRule: ['standard', 'pr', 'mmp'].includes(houseRule) ? houseRule : 'standard',
    electoralRule: ['standard', 'proportional', 'district'].includes(electoralRule) ? electoralRule : 'standard',
    // Preserve the setup slider independently of candidate-adjusted polling.
    startingNationalGeneric: startingGeneric,
    simulateElection: !!simulateElection,
    // How hard the starting map was shuffled — past the limit the run is unscored.
    randomness: Number(randomness) || 0,
    weighted: !!weighted,
    leans: startingLeans,
    week: 0,
    weeklyBaseIncomeDraw: null,
    weeklyIncomeWeek: null,
    weeklyAIIncomeDraws: null,
    weeklyAIIncomeDrawsWeek: null,
    incomeBoost: null,
    momentum: 52,
    momentumPersuasionUsed: 0,
    oppMomentum: 50,
    // The other two tickets' mood, for the four-party ballot.
    pMomentum: { lib: 50, grn: 50 },
    funds: modeId === 'two-parties' && thirdStart
      ? 10
      : candidateStartingFunds(thirdStart ? THIRD_START_FUNDS : diff.startFunds, CANDIDATE_BY_ID[candidateId]?.ratings?.corruption),
    // The other side's war chest: every major party the player is not running
    // opens with $225M, and spends it on airtime week by week.
    aiFunds,
    aiDebatePrep: 0,
    aiLastFundraiserWeek: null,
    aiFinanceLog: [],
    aiFactions,
    aiIncome: {},
    ballotMeasures: cleanedBallotMeasures.measures,
    ballotMeasureRules: Array.isArray(ballotMeasureRules) ? ballotMeasureRules : [],
    ballotMeasureRulesVersion: BALLOT_MEASURE_RULES_VERSION,
    aiPerks: {},
    aiOps: {},
    freeOps: {},
    campaignPerks: { nextAdMultiplier: 1, nextAdIssue: null, freeAds: 0, freeAdIssues: [], freeVolunteerOps: 0 },
    stateMods,
    // What the Lib and Green campaigns have won for themselves, state by state.
    build39: { version: 1, candidateOpening: true, scenario: initializeScenarioState({ scenarioId, ideologyByState: VOTER_COMPOSITION.byState,
      voteUnitsByState: Object.fromEntries(STATES.map(({ abbr }) => [abbr, voteUnits(abbr)])) }) },
    thirdMods: Object.fromEntries(scenarioPartyIds(scenarioId).filter((id) => id !== 'ind' && (isThirdParty(id) || isScenarioCandidate(id))).map((id) => [id, {}])),
    fourPartyNews: {},
    rivals: [],
    // Group-level opinion, kept in the same units as a state shift but applied
    // through each state's demographic make-up.
    demographicMods: {},
    turnout: {},
    ops: {},
    statePollReceipts: {},
    build40: { version: 1, modeId, openingModel, openingFieldPlan, fieldPlanCommitted: false, decisionReceipts: [],
      openingElectorateByState: Object.fromEntries(STATES.map(({ abbr }) => [abbr, voteUnits(abbr)])) },
    build45: { version: 1, housePviRevision: BUILD45_HOUSE_PVI_REVISION,
      legislatureClassRevision: BUILD45_LEGISLATURE_CLASS_REVISION },
    groundGameAccumulatedByState: {},
    groundGameResolvedWeeks: [],
    // Filled in below, once the whole board exists.
    // How sick of hearing from each party a state has become, by action type.
    fatigue: emptyFatigue(),
    // Every point any party has ever spent there — it never wears off.
    totalFatigue: {},
    noise: freshNoise(diff),
    track: 0,
    // The state-by-state generic ballot, and the national average of it. The
    // campaign moves these at half strength; the news moves them at full.
    baseStateGeneric: isRegionalNew ? {} : initialGenericEnvironment(startingGeneric, startingLeans),
    coattailByState: {},
    coattailResolvedWeeks: [],
    coattailModelVersion: 1,
    stateGeneric: isRegionalNew ? {} : initialGenericEnvironment(startingGeneric, startingLeans),
    natGeneric: isRegionalNew ? 0 : startingGeneric,
    genericBaseline: isRegionalNew ? 0 : startingGeneric,
    genericSwingDiagnostics: [],
    nickBronzeSnapshot: null,
    // The national desk: this week's story, what has already run, and any story
    // still paying out week after week.
    natNews: null,
    natNewsSeen: true,
    natNewsLog: [],
    fourPartyNationalNewsLog: [],
    fourPartyNationalCard: null,
    arc: null,
    arcEnded: null,
    // Nobody knows how wrong the polls are until the votes are counted.
    pollMiss: null,
    senateStart: rollSenateStart(),
    senateNoise,
    // Third parties, the rest of the ballot, and the local candidate quality
    // nobody hears about until October.
    thirdMode,
    thirdVariance: board.thirdVariance,
    thirdTilt: board.thirdTilt,
    raceQuality: rollRaceQuality(),
    dbMods: {},
    downballotNews: { senate: {}, house: {}, gov: {} },
    indieSenate: indieSenate
      ? { ND: true, SD: true, ID: true }
      : { ND: false, SD: false, ID: false },
    mcmullin: isRegionalNew ? false : mcmullin !== false,
    houseStart: houseStartRoll(),
    govStart: govStartRoll(),
    opponentParty,
    usedEvents: [],
    currentEventId: null,
    currentEventData: null,
    eventSchedule: [],
    eventScheduleIndex: -1,
    eventScheduleWeek: null,
    decisionEventCount: 0,
    incidentLedger: [],
    incidentSequence: 0,
    triggeredEventOnceKeys: [],
    rivalIncidentNewsCard: null,
    rivalIncidentNewsReceiptIds: [],
    pendingInterrupts: [],
    outcome: null,
    lastOpponent: null,
    lastAction: null,
    weekLog: [],
    campaignTrail: { week: 0, entries: [] },
    weekStartMap: {},
    history: [],
    debate: null,
    debatePrep: 0,
    stances: stancesFor(CANDIDATE_BY_ID[candidateId] || { id: candidateId, party }),
    oppStances: stancesFor(CANDIDATE_BY_ID[opponentId] || { id: opponentId, party: party === 'dem' ? 'rep' : 'dem' }),
    // Where the party's own factions start with this nominee.
    factions: initialFactions(party, candidateId),
    factionMilestones: [],
    factionCrises: {},
    staffing: null,
    staffActionReceipts: [],
    staffBriefingRecommendations: [],
    staffUpkeepReceiptIds: [],
    staffContractEffectReceiptIds: [],
    incidentProvenanceVersion: 2,
    build35EventChoiceReceiptIds: [],
    endorsements: MAIN_GAME_ENDORSEMENTS_ENABLED ? initialEndorsements() : {},
    promiseLedger: [],
    strategyProfile: { stateActions: {}, issueFocus: {}, messages: [] },
    lastShift: null,
    issueEdge: {},
    flips: 0,
    oppMoves: [],
    lastOutside: null,
    lastPromise: null,
    lastAd: null,
    lastOps: null,
    finance: { income: 0, expenses: 0 },
    fundraising: {},
    fundraisingFatigue: {},
    scandals: [],
    finished: false,
    actionsLeft: ACTIONS_PER_WEEK,
    // The living local news cycle, what working the press costs this week, and
    // the cards the campaign has already set in motion.
    stories: [],
    spins: {},
    lastSpin: null,
    followUps: [],
    eventWhy: null,
    // The world's own news: what ran where this week, what it moved, and how
    // worked up each state currently is about which issue.
    worldNews: {},
    worldShift: {},
    salience: {},
    worldRecent: [],
  };

  game.staffing = null;
  game.electionModelVersion = ELECTION_MODEL_VERSION;
  game.earlyBallotLedger = createEarlyBallotLedger({ campaignId: game.build34CampaignId });
  if (MAIN_GAME_ENDORSEMENTS_ENABLED) game.build34EndorserRelationships = initialEndorserRelationships({
    party,
    stances: game.stances,
    factionStandings: game.factions,
  });

  // Turnout is set here and nowhere else: every party starts on the state's own
  // number — the same one for all of them — and the nominee's machine adds what
  // it adds, where it adds it. Nothing about it is rolled.
  game.turnout = loadTurnout(null);
  applyCandidateTurnout(game);
  const turnoutByParty = {};
  const turnoutParties = scenarioPartyIds(scenarioId).filter((id) => id !== 'ind');
  turnoutParties.forEach((turnoutParty) => {
    const startingTurnout = Object.fromEntries(STATES.map((state) => [
      state.abbr,
      Number(game.turnout[state.abbr]?.[turnoutParty]) || turnoutOf(game, state.abbr, turnoutParty),
    ]));
    const reduction = applyNewGameTurnoutReduction({
      turnoutByState: startingTurnout,
      isNewCampaign: true,
    });
    turnoutByParty[turnoutParty] = reduction.turnoutByState;
  });
  game.turnout = Object.fromEntries(STATES.map((state) => [
    state.abbr,
    Object.fromEntries(turnoutParties.map((turnoutParty) => [
      turnoutParty,
      turnoutByParty[turnoutParty][state.abbr],
    ])),
  ]));
  game.startingTurnoutReductionApplied = true;

  // Day one is the map file's map: the platforms' built-in differences are
  // banked here and subtracted, so a state starts where its lean says it starts.
  game.policyBase = {};
  STATES.forEach((s) => {
    game.policyBase[s.abbr] = rawPolicyMargin(s.abbr, game);
  });

  // Where every state stood on day one. A party's gains are measured from here,
  // so a scenario's four-party tables survive intact until the campaign itself
  // moves a state.
  game.baseMargins = {};
  STATES.forEach((s) => {
    game.baseMargins[s.abbr] = pollMargin(s.abbr, game);
  });
  game.oppMates = chooseOpponentMates(game);
  game.build38 = initializeBuild38(game, votingRuleId, (abbr, delta) =>
    boardShares({ margin: pollMargin(abbr, game) + delta, abbr, game, mode: 'poll' }));
  applyOpeningTicket(game, game.party, game.candidateId, game.runningMateId);
  for (const partyId of activeCampaignParties) {
    if (partyId === game.party) continue;
    const nominee = nomineeOf(game, partyId);
    if (nominee?.id) applyOpeningTicket(game, partyId, nominee.id, game.oppMates?.[partyId]?.mateId);
  }
  game.build38.governorOffsets = Object.fromEntries(govSnapshot(game).races.map((race) => [
    race.state, calibrateGovernorOpening({ stateId: race.state, openingMarginDMinusR: race.margin, scenario: { campaignType: 'new' } }).openingOffset || 0,
  ]));
  game.raceBaseline = raceBaselines(game);
  game.candidateEvents = candidateEventState();
  game.activeMods = getActiveModDescriptors();
  if (!game.build40?.fieldPlanCommitted) {
    game.build40 = { ...game.build40, fieldPlanCommitted: true };
  }
  return startTurn(game);
}

export function candidatesOf(game) {
  return {
    you: CANDIDATE_BY_ID[game.candidateId],
    them: CANDIDATE_BY_ID[game.opponentId],
  };
}

function candidateConversion(party, abbr) {
  if (party !== 'dem' && party !== 'rep') return 0;
  const lean = (STATE_BY_ABBR[abbr]?.lean || 0) * (party === 'dem' ? 1 : -1);
  if (lean >= 20) return 2;
  if (lean >= 10) return 0.9;
  if (lean >= 5) return 0.35;
  return 0;
}

function candidateMods(abbr, game) {
  const state = STATE_BY_ABBR[abbr];
  const { you, them } = candidatesOf(game);
  const demCand = game.build40?.openingModel ? nomineeOf(game, 'dem') : you.party === 'dem' ? you : them;
  const repCand = game.build40?.openingModel ? nomineeOf(game, 'rep') : you.party === 'dem' ? them : you;
  const regionMod = (demCand?.region?.[state.region] || 0) - (repCand?.region?.[state.region] || 0);
  const natMod = (demCand?.nat || 0) - (repCand?.nat || 0);
  // A candidate can also carry a single state: the map they bring with them.
  const stateMod = (demCand?.states?.[abbr] || 0) - (repCand?.states?.[abbr] || 0);
  const conversion = candidateConversion('dem', abbr) - candidateConversion('rep', abbr);
  return regionMod + natMod + stateMod + conversion;
}

// A group's swing is worth its share of the state: +10 among a group that is 2%
// of the population is two tenths of a point here, and nothing at all in a state
// where the group does not really live.
export function demographicShift(abbr, game) {
  const mods = { ...(game.demographicMods || {}) };
  const pov = game.party === 'rep' ? -1 : 1;
  Object.entries(factionGroupBonuses(game)).forEach(([id, amount]) => {
    mods[id] = (mods[id] || 0) + amount * pov;
  });
  return stateGroupShift(abbr, mods) + stateGroupShift(abbr, game.build34EndorsementGroupModsByState?.[abbr] || {});
}

// Early polls are taken before the campaign has done anything at all: in the
// first weeks the map reads close to the projection the race was launched on, and
// the polling noise only grows in as the campaign gets its own weather.
export function noiseRamp(week = 0) {
  return Math.min(1, 0.25 + Math.max(0, week) * 0.25);
}

// What the polls say, from the Democratic candidate's point of view.
export function pollMargin(abbr, game) {
  const envForPres = isRegionalEnvironmentIgnored(game)
    ? 0
    : (game.coattailModelVersion >= 1 ? baseGenericAverage(game) : (game.natGeneric || 0));
  const base = (game.leans[abbr] ?? BASE_LEANS[abbr] ?? 0) + (!isRegionalEnvironmentIgnored(game) && game.build38?.openingModel ? ideologyEnvironmentDelta(abbr, envForPres) : 0) + (game.build38?.regionalMarginByState?.[abbr] || 0);
  if (isThirdParty(game.party)) {
    // A third-party run does not move the two-party margin, it eats into it:
    // the campaign lives in the third-party share instead.
    return (
      base +
      (game.track || 0) +
      (game.noise[abbr] || 0) * noiseRamp(game.week) +
      (game.worldShift?.[abbr] || 0) +
      (game.dragMods?.[abbr] || 0)
    );
  }
  // Momentum is not read here: it reaches the map only through the weekly vote
  // shift, which lands in the state modifiers for every party at once.
  return (
    base +
    candidateMods(abbr, game) +
    policyMargin(abbr, game) +
    (game.track || 0) +
    (game.stateMods[abbr] || 0) +
    demographicShift(abbr, game) +
    // What the week's own news did to this state, and nothing the campaign did.
    (game.worldShift?.[abbr] || 0) +
    (game.noise[abbr] || 0) * noiseRamp(game.week) +
    // And the slow pull back toward where the state started, when it has wandered.
    (game.dragMods?.[abbr] || 0)
  );
}

// Where every downballot race stood on day one. Stored once, so a race can be
// measured against its own opening rather than against a moving baseline.
export function raceBaselines(game) {
  const out = {};
  senateSnapshot(game).races.forEach((r) => {
    out[`senate:${r.state}`] = r.margin;
  });
  govSnapshot(game).races.forEach((r) => {
    out[`gov:${r.state}`] = r.margin;
  });
  houseSnapshot(game).states.forEach((s) => {
    out[`house:${s.state}`] = s.margin;
  });
  return out;
}

function baselineDrag(game) {
  return dragTowardBaseline(game, { pollMargin, raceMargin, governors: GOVERNOR_BY_STATE });
}

// What actually happens, once the polls have missed.
export function resultMargin(abbr, game) {
  const level = game.ops?.[abbr] || 0;
  const miss = pollMissFor(abbr, game) * (1 - 0.09 * level);
  // Turnout does not bend the margin any more: it decides how many of each
  // party's own people are counted when the votes come in.
  return pollMargin(abbr, game) + miss;
}

// Nebraska and Maine districts swing with their state.
export function districtMargin(district, game, mode = 'poll') {
  const parent = STATE_BY_ABBR[district.parent];
  const margin = mode === 'result' ? resultMargin(district.parent, game) : pollMargin(district.parent, game);
  return margin + (district.lean - parent.lean);
}

// Turnout itself lives in '@/lib/turnout': one number per party per state, four
// decimal places deep, converted into raw votes when a state is counted.
export { turnoutOf, addTurnoutState, addTurnoutRegion };

// Every state starts on its own number, and every party inside it on the same
// one. A save from before that was true is rebuilt from the map.
function loadTurnout(stored) {
  const out = {};
  STATES.forEach((s) => {
    const row = stored?.[s.abbr];
    out[s.abbr] = row && typeof row === 'object' ? { ...baseTurnoutRow(s.abbr), ...row } : baseTurnoutRow(s.abbr);
  });
  return out;
}

// A nominee's own machine: Rubio in the South, DeSantis in Florida, and whoever
// else the map file equips. It is turnout for that party and nobody else's.
function applyCandidateTurnout(game) {
  [
    { id: game.candidateId, party: game.party },
    { id: game.opponentId, party: game.opponentParty },
  ].forEach(({ id, party }) => {
    const cand = CANDIDATE_BY_ID[id];
    if (!cand || !party) return;
    Object.entries(cand.turnoutRegion || {}).forEach(([region, pts]) => addTurnoutRegion(game, party, region, pts));
    Object.entries(cand.turnoutStates || {}).forEach(([abbr, pts]) => addTurnoutState(game, party, abbr, pts));
  });
}

// Where each party stands nationally, weighted by electoral vote.
export function nationalShares(game) {
  const snap = snapshot(game);
  const out = {};
  PARTY_ORDER.forEach((party) => {
    let sum = 0;
    let weight = 0;
    snap.rows.forEach((r) => {
      sum += (r.shares[party] || 0) * r.ev;
      weight += r.ev;
    });
    out[party] = weight ? sum / weight : 0;
  });
  return out;
}

export function nationalPoll(game) {
  let sum = 0;
  let weight = 0;
  STATES.forEach((s) => {
    sum += pollMargin(s.abbr, game) * s.ev;
    weight += s.ev;
  });
  return sum / weight;
}

export function presidentialRankedTally(game, shares) {
  return game.build39?.scenario?.id === 'six-party' ? scenarioRankedChoiceTally(shares) : rankedChoiceTally(shares);
}

// Every race is a four- or five-way share now, so the winner of a state is
// whoever has the most votes — not automatically one of the two parties.
export function snapshot(game, mode = 'poll') {
  const earlyByState = mode === 'result' ? earlyBallotsByState(game.earlyBallotLedger) : {};
  const marginOf = (abbr) => (mode === 'result' ? resultMargin(abbr, game) : pollMargin(abbr, game));

  const rows = /** @type {Array<any>} */ (STATES.map((s) => {
    const margin = marginOf(s.abbr);
    // What the state believes, and then how many of those believers actually
    // vote. The same poll is a different result in a state where one side's
    // people stay home, so the vote — not the percentage — picks the winner.
    const support = boardShares({ margin, abbr: s.abbr, game, mode });
    const early = earlyByState[s.abbr];
    const votes = mode === 'result' ? presidentialBallots(game, s.abbr, support, early) : votesFor(s.abbr, support, game);
    const cast = Object.values(votes).reduce((sum, v) => sum + (v || 0), 0) || 1;
    const shares = mode === 'poll' ? support : Object.fromEntries(Object.keys(support).map((party) =>
      [party, (votes[party] || 0) / cast * 100]));
    const firstChoiceWin = winnerOf(shares);
    const rcv = mode === 'result' && game.thirdMode === 'surge' ? presidentialRankedTally(game, shares) : null;
    const win = rcv
      ? {
          party: rcv.winner,
          share: rcv.shares[rcv.winner],
          runnerUp: rcv.runnerUp,
          runnerShare: rcv.shares[rcv.runnerUp],
          margin: rcv.margin,
        }
      : firstChoiceWin;
    const tossup = isTossup(win.margin);
    return {
      ...s,
      margin,
      // The generic ballot in this state: the top line plus whatever its own
      // environment has done since.
      generic: margin + genericIn(s.abbr, game),
      support,
      votes,
      cast,
      earlyBallots: early?.count || 0,
      turnout: turnoutOf(game, s.abbr),
      shares,
      firstChoiceShares: shares,
      rcvShares: rcv?.shares || null,
      firstChoiceWinner: firstChoiceWin.party,
      firstChoiceLead: firstChoiceWin.margin,
      rcvRounds: rcv?.rounds || null,
      share: win.share,
      winner: win.party,
      lead: win.margin,
      tossup,
      color: marginColor(win.party, win.margin),
      winnerColor: PARTY_COLOR[win.party],
      atLarge: SPLIT_AT_LARGE[s.abbr] ?? null,
    };
  }));

  const electoralRule = ['standard', 'proportional', 'district'].includes(game.electoralRule) ? game.electoralRule : 'standard';
  const houseDistrictMap = electoralRule === 'district'
    ? Object.fromEntries(buildHouse({ ...game, houseRule: 'standard', presidentialDistrictAllocation: game.build39?.scenario?.id === 'favorite-sons-daughters' }, marginOf, mode).states.map((state) => [state.state, state]))
    : {};
  rows.forEach((row) => {
    const awards = { dem: 0, rep: 0, lib: 0, grn: 0, ind: 0 };
    if (electoralRule === 'proportional') {
      Object.assign(awards, allocateProportional(row.shares, row.ev, 5));
    } else if (electoralRule === 'district') {
      awards[row.winner] = (awards[row.winner] || 0) + 2;
      const house = houseDistrictMap[row.abbr];
      if (house) {
        for (const [party, seats] of Object.entries(house.seatsByParty || {})) awards[party] = (awards[party] || 0) + Number(seats);
      } else if (row.abbr === 'DC') {
        awards[row.winner] += 1;
      }
    } else {
      awards[row.winner] = (awards[row.winner] || 0) + (row.atLarge ?? row.ev);
    }
    row.evAwards = awards;
  });
  const districts = DISTRICT_LIST.map((d) => {
    const margin = districtMargin(d, game, mode);
    const shares = boardShares({ margin, abbr: d.parent, game, mode });
    const firstChoiceWin = winnerOf(shares);
    const rcv = game.thirdMode === 'surge' ? presidentialRankedTally(game, shares) : null;
    const win = rcv
      ? {
          party: rcv.winner,
          share: rcv.shares[rcv.winner],
          runnerUp: rcv.runnerUp,
          runnerShare: rcv.shares[rcv.runnerUp],
          margin: rcv.margin,
        }
      : firstChoiceWin;
    const tossup = isTossup(win.margin);
    return {
      ...d,
      margin,
      shares,
      firstChoiceWinner: firstChoiceWin.party,
      firstChoiceLead: firstChoiceWin.margin,
      rcvShares: rcv?.shares || null,
      rcvRounds: rcv?.rounds || null,
      winner: win.party,
      lead: win.margin,
      tossup,
      color: marginColor(win.party, win.margin),
      winnerColor: PARTY_COLOR[win.party],
    };
  });

  const evBy = { dem: 0, rep: 0, lib: 0, grn: 0, ind: 0 };
  let demWeighted = 0;
  let totalEv = 0;

  rows.forEach((r) => {
    Object.entries(r.evAwards || {}).forEach(([party, seats]) => { evBy[party] = (evBy[party] || 0) + seats; });
    const weight = electoralRule === 'standard' ? (r.atLarge ?? r.ev) : r.ev;
    demWeighted += (r.rcvShares?.dem ?? r.shares.dem) * weight;
    totalEv += weight;
  });

  if (electoralRule === 'standard') {
    districts.forEach((d) => {
      evBy[d.winner] = (evBy[d.winner] || 0) + d.ev;
      demWeighted += (d.rcvShares?.dem ?? d.shares.dem) * d.ev;
      totalEv += d.ev;
    });
  }

  const ranked = Object.entries(evBy).sort((a, b) => b[1] - a[1]);
  const leader = ranked[0][1] === ranked[1][1] ? 'tied' : ranked[0][0];
  const demPct = demWeighted / totalEv;

  return {
    rows,
    districts: electoralRule === 'standard' ? districts : [],
    evBy,
    firstChoicePopularVote: game.build39?.scenario?.id === 'six-party',
    demEV: evBy.dem,
    repEV: evBy.rep,
    otherEV: totalEv - evBy.dem - evBy.rep,
    demPct,
    repPct: 100 - demPct,
    leader,
    leaderEV: ranked[0][1],
    majority: ranked[0][1] >= EV_TO_WIN,
  };
}

export function resultSnapshot(game) {
  return snapshot(game, 'result');
}

// What share of a state's vote a party is taking right now.
export function partyShareIn(abbr, game) {
  const shares = boardShares({ margin: pollMargin(abbr, game), abbr, game, mode: 'poll' });
  return shares[game.party] || 0;
}

// Everything a campaign does in a state is worth less when the state has not
// heard of the party yet. A third party outside the four-party scenario is
// damped twice: once for being a third party, once for polling under ten.
export function actionDamp(game, abbr, actionId = null) {
  let damp = 1;
  if (game.thirdMode !== 'surge' && isThirdParty(game.party)) damp *= THIRD_ACTION_DAMP;
  if (abbr && partyShareIn(abbr, game) < FLOOR_SHARE) damp *= FLOOR_ACTION_DAMP;
  // A party whose own field is restless works at less than full strength.
  const effects = factionEffects(game);
  damp *= effects.actionMul;
  if (['volunteers', 'ops'].includes(actionId) && effects.laborStates.includes(abbr)) damp *= effects.laborFieldMul;
  if (['townhall', 'promise'].includes(actionId)) damp *= effects.moderatePersuasionMul;
  if (['visit', 'volunteers', 'townhall'].includes(actionId)) damp *= effects.religiousTurnoutMul;
  if (actionId === 'volunteers') damp *= effects.youthOutreachMul;
  return damp;
}

// Momentum slightly changes how persuasive campaign work is. Only the extra
// movement from that modifier counts against a shared weekly voter budget.
export function momentumPersuasionFactor(game) {
  return Math.max(0.995, Math.min(1.005, 1 + ((game?.momentum ?? 50) - 50) * 0.0001));
}

function modeledVoterMovement(game, shifts, scale = 1) {
  return Object.entries(shifts).reduce((sum, [abbr, shift]) => {
    const baseMargin = pollMargin(abbr, game) + shift.base;
    const baseShares = boardShares({ margin: baseMargin, abbr, game, mode: 'poll' });
    const actualShares = boardShares({
      margin: baseMargin + (shift.actual - shift.base) * scale,
      abbr,
      game,
      mode: 'poll',
    });
    const parties = new Set([...PARTY_ORDER, ...Object.keys(baseShares || {}), ...Object.keys(actualShares || {})]);
    const sharePointsMoved = [...parties].reduce(
      (moved, party) => moved + Math.abs((actualShares?.[party] || 0) - (baseShares?.[party] || 0)),
      0
    );
    return sum + (voteUnits(abbr) * sharePointsMoved) / 200;
  }, 0);
}

export function capMomentumPersuasion(game, shifts) {
  const valid = Object.fromEntries(
    Object.entries(shifts || {}).filter(
      ([abbr, shift]) =>
        STATE_BY_ABBR[abbr] && shift && Number.isFinite(shift.base) && Number.isFinite(shift.actual)
    )
  );
  if (!Object.keys(valid).length) return {};

  const weeklyBudget = STATES.reduce((total, state) => total + voteUnits(state.abbr), 0) * 0.005;
  const used = Math.max(0, Math.min(weeklyBudget, Number(game.momentumPersuasionUsed) || 0));
  const available = Math.max(0, weeklyBudget - used);
  let scale = 1;
  let moved = modeledVoterMovement(game, valid);

  if (moved > available) {
    let low = 0;
    let high = 1;
    for (let i = 0; i < 40; i += 1) {
      const middle = (low + high) / 2;
      if (modeledVoterMovement(game, valid, middle) <= available) low = middle;
      else high = middle;
    }
    scale = low;
    moved = modeledVoterMovement(game, valid, scale);
  }

  game.momentumPersuasionUsed = Math.min(weeklyBudget, used + moved);
  return Object.fromEntries(
    Object.entries(valid).map(([abbr, shift]) => [abbr, shift.base + (shift.actual - shift.base) * scale])
  );
}

function applyMomentumPersuasion(game, shifts) {
  const capped = capMomentumPersuasion(game, shifts);
  const pov = game.party === 'rep' ? -1 : 1;
  Object.entries(capped).forEach(([abbr, amount]) => {
    if (isThirdParty(game.party) || isScenarioCandidate(game.party)) {
      const mag = Math.abs(amount);
      if (mag > 0) applyMinorPartyPersuasion(game, game.party, abbr, amount * pov >= 0 ? mag : -mag);
    } else {
      const scaled = amount * pov > 0 ? scaleRegionalPersuasion(game, Math.abs(amount)) * pov : amount;
      game.stateMods[abbr] = (game.stateMods[abbr] || 0) + scaled;
    }
  });
}

// The line a player reads when an action lands with a thud.
function applyMinorPartyPersuasion(game, party, abbr, amount) {
  const scaledAmount = scaleRegionalPersuasion(game, amount);
  const stateMods = { ...(game.thirdMods?.[party] || {}) };
  stateMods[abbr] = (stateMods[abbr] || 0) + scaledAmount;
  game.thirdMods = { ...game.thirdMods, [party]: stateMods };
}

function playerStateMargin(game, abbr) {
  const modeledMargin = pollMargin(abbr, game);
  if (game.thirdMode !== 'surge' && !isThirdParty(game.party)) return modeledMargin * (game.party === 'rep' ? -1 : 1);
  const support = boardShares({ margin: modeledMargin, abbr, game, mode: 'poll' });
  const others = Object.entries(support).filter(([party]) => party !== game.party).map(([, share]) => share);
  return support[game.party] - Math.max(...others);
}

function dampNote(damp, abbr, game) {
  if (damp > 0.9 || !abbr) return '';
  return ` — barely heard at ${partyShareIn(abbr, game).toFixed(1)}%`;
}

// A rally is a room, not a state. The same crowd that is a fifth of Wyoming is a
// rounding error in California, so stops and town halls land bigger where there
// are fewer people to move: about 1.6× in the smallest states, 0.77× in the
// biggest.
export function rallyScale(abbr) {
  const ev = STATE_BY_ABBR[abbr]?.ev ?? 19;
  return Math.min(1.5, Math.pow(19 / Math.max(3, ev), 0.25));
}

function sizeNote(size) {
  if (size < 0.9) return ' — a state this big barely registers one week of attention';
  if (size > 1.2) return ' — small enough that a week here is the whole conversation';
  return '';
}

// Fundraising is a room full of donors in one state, so it is priced the same way
// a rally is sized: big states hold more of them, friendly states hold more of
// yours, and the same room gives 10% less every time you go back to it.
export function fundraiseCount(game, abbr) {
  return (game.fundraising?.[abbr] || 0);
}

export function fundraiseOutlook(game, abbr) {
  if (!abbr) return null;
  const ev = STATE_BY_ABBR[abbr]?.ev ?? 10;
  const share = partyShareIn(abbr, game);
  const count = fundraiseCount(game, abbr);
  const gross = round1((2.2 + ev * 0.28) * 1.12 * (0.5 + share / 100));
  const resolution = resolveFundraisingAction({
    baseReturnM: gross,
    party: game.party,
    stateId: abbr,
    fatigueByPartyState: game.fundraisingFatigue || {},
  });
  return {
    ev,
    share,
    count,
    gross,
    decay: resolution.multiplier,
    cash: round1(resolution.returnM),
    fatigueByPartyState: resolution.fatigueByPartyState,
  };
}

export function ratingLabel(margin, showExact) {
  const side = margin >= 0 ? 'D' : 'R';
  const abs = Math.abs(margin);
  if (isTossup(margin)) return showExact ? `Tossup · ${side}+${abs.toFixed(1)}` : 'Tossup';
  if (showExact) return `${side} +${abs.toFixed(1)}`;
  if (abs < 5) return `Lean ${side}`;
  if (abs < 12) return `Likely ${side}`;
  return `Solid ${side}`;
}

export const MAP_IDLE = '#22304F';

export function clampMomentum(v) {
  return clamp(Math.round(v), 0, 100);
}

// ---------------------------------------------------------------------------
// Scandal risk. The chance is difficulty-scaled; the severity is hidden, which is
// the point — a 60% risk sometimes costs you three points of momentum and
// sometimes costs you eleven.
// ---------------------------------------------------------------------------

export function rollScandal(risk, random = Math.random) {
  const r = random();
  if (r < 0.58) return { level: 'minor', hit: 3 + Math.round(random() * 3) };
  if (r < 0.9) return { level: 'serious', hit: 6 + Math.round(random() * 5) };
  return { level: 'grave', hit: 11 + Math.round(random() * 8) };
}

export function scandalScale(difficultyId) {
  return DIFFICULTIES[difficultyId]?.scandalScale ?? 1;
}

export function scandalWord(risk) {
  if (!risk) return null;
  if (risk < 0.25) return 'Low';
  if (risk < 0.45) return 'Moderate';
  if (risk < 0.65) return 'High';
  return 'Severe';
}

// A scandal is not just a bad week, it is a smaller coalition: the country takes
// voters off the campaign everywhere at once. A minor embarrassment costs a tenth
// of a point of the national vote, a serious one half a point, and a career-level
// one two full points.
export const SCANDAL_VOTE_LOSS = { minor: 0.1, serious: 0.5, grave: 2 };

function applyScandalVotes(next, scandal) {
  const lost = SCANDAL_VOTE_LOSS[scandal.level] || 0;
  if (!lost) return;
  const pov = next.party === 'rep' ? -1 : 1;
  // A point of vote share costs two and a half points of margin — the transfer
  // ladder hands a little of it back off the Libertarian column — so the number
  // the player is told is the number the national vote actually moves by.
  STATES.forEach((s) => {
    next.stateMods[s.abbr] = (next.stateMods[s.abbr] || 0) - lost * 2.5 * pov;
  });
}

// The week's card is either something the campaign set in motion, something the
// world state has earned, or — most weeks — a draw from the deck.

export function nextEventFor(game, { random = Math.random, excludedEventIds = [], actingParty = game.party, onlyDraw = false } = {}) {
  const excluded = new Set([...excludedEventIds, ...(game.usedEvents || [])]);
  const receipts = onlyDraw ? [] : build40IncidentSources(game);
  const read = onlyDraw ? null : readSignals(game);
  const legal = new Map();
  for (const definition of BUILD40_EVENTS) {
    if (excluded.has(definition.id)) continue;
    const party = onlyDraw ? actingParty : build40ActingParty(game, definition);
    const incident = build40DecisionEligibility(game, definition, { actingParty: party, onlyDraw, read, receipts });
    if (incident === false) continue;
    const context = build40DecisionContext(game, definition, incident && {
      ...incident, stateId: build40ReportState(incident, definition.id),
    }, party);
    if (!context) continue;
    const funds = party === game.party ? game.funds : game.aiFunds?.[party] || 0;
    const event = build40DecisionView(game, definition, context, funds);
    if (!event.choices.some((choice) => !choice.unavailable)) continue;
    legal.set(event.id, event);
  }
  for (const ticket of eligibleCandidateEvents(game, CANDIDATE_EVENTS, activeCandidateTickets(game), { actingParty, usedIds: [...excluded] })) {
    const event = candidateDecisionView(game, ticket);
    if (event?.choices.some((choice) => !choice.unavailable)) legal.set(event.id, event);
  }
  const pool = [...legal.values()];
  const event = actingParty === game.party
    ? drawWeightedPlayerEvent(pool, { random, playerParty: game.party })
    : (pool[Math.floor(random() * pool.length)] || null);
  return { event, why: event?.why || null, followUps: [] };
}

export function decisionEventCountForRoll(game, roll) {
  return decisionCountForWeek(game.week, totalWeeksOf(game), roll);
}

export function decisionPending(game) {
  const id = build40EventId(game?.currentEventId);
  return Boolean(game?.currentEventData?.context && DECISION_EVENTS_BY_ID[id] && !game.outcome);
}

/** Resolve actual nominees once per ticket; the selectable roster is separate. */
export function activeCandidateTickets(game) {
  const scenario = game.build39?.scenario?.id || 'standard';
  const mode = game.build40?.modeId;
  const parties = mode === 'two-parties' || (!mode && game.thirdMode === 'off')
    ? [game.party, game.opponentParty] : scenarioPartyIds(scenario).filter((id) => id !== 'ind');
  return participatingCandidates(game, [...new Set([...parties, game.party, game.opponentParty])]
    .map((party) => ({ party, candidateId: nomineeOf(game, party)?.id })));
}

function candidateDecisionView(game, ticket) {
  const definition = ticket.definition || CANDIDATE_EVENTS_BY_ID[ticket.eventId];
  if (!definition) return null;
  const candidateId = ticket.candidateId;
  const party = ticket.party;
  const stateIds = definition.trigger.states || [];
  const eligibleStates = STATES.filter(({ abbr }) => scenarioBallotAccess(game.build39?.scenario?.id, 'president', abbr, party)
    && (!stateIds.length || stateIds.includes(abbr)));
  if (!eligibleStates.length) return null;
  const key = ticket.key || ['candidate-event', candidateId, party, definition.id].join(':');
  const random = createSeededRandom(game.build34CampaignId + ':' + key + ':state');
  let remaining = random() * eligibleStates.reduce((sum, state) => sum + state.ev, 0);
  const stateId = eligibleStates.find((state) => (remaining -= state.ev) < 0)?.abbr || eligibleStates.at(-1).abbr;
  const context = { ...build40DecisionContext(game, definition, { stateId }, party),
    instanceId: key, candidateId, candidateEventKey: key, candidateEventMandatory: Boolean(ticket.key) };
  const neighbors = (NEIGHBORS[stateId] || []).filter((abbr) =>
    !['AZ:CO', 'CO:AZ', 'NM:UT', 'UT:NM'].includes(stateId + ':' + abbr)
    && scenarioBallotAccess(game.build39?.scenario?.id, 'president', abbr, party)).sort();
  if (neighbors.length) context.neighborId = neighbors[Math.floor(random() * neighbors.length)];
  const event = build40DecisionView(game, definition, context, party === game.party ? game.funds : game.aiFunds?.[party] || 0);
  event.kicker = 'Candidate event · ' + (CANDIDATE_BY_ID[candidateId]?.name || candidateId);
  event.why = (CANDIDATE_BY_ID[candidateId]?.name || candidateId) + ' is the participating ' + party + ' nominee.';
  return event;
}

function presentedCandidate(game, event) {
  const context = event?.context;
  return context?.candidateId ? recordCandidateEventPresented(game.candidateEvents, {
    key: context.candidateEventKey, candidateId: context.candidateId, party: context.actingParty, eventId: event.id, week: game.week,
  }) : candidateEventState(game.candidateEvents);
}

function retireInvalidDecision(game) {
  return { ...game, currentEventId: null, currentEventData: null, currentInterrupt: null, eventWhy: null, outcome: null,
    incidentLedger: (Array.isArray(game.incidentLedger) ? game.incidentLedger : []).filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry)),
    eventSchedule: (game.eventSchedule || []).map((entry, index) => index === game.eventScheduleIndex
      ? { status: 'retired', id: entry.id, afterActions: entry.afterActions } : entry) };
}

function chooseDecisionForSlot(game, index, scheduled) {
  const priorIds = (game.eventSchedule || []).slice(0, index).map((entry) => entry.id).filter(Boolean);
  const random = createSeededRandom([game.build34CampaignId, 'decision-slot', game.week, index].join(':'));
  const { event, why } = nextEventFor(game, { random, excludedEventIds: priorIds });
  if (!event) return { game, entry: null };
  const vance = event.id.startsWith('vance_succession_');
  const source = {
    ...game,
    usedEvents: [...(game.usedEvents || []), event.id],
    candidateEvents: presentedCandidate(game, event),
    vanceSuccessionDeliveredWeek: vance ? game.week : game.vanceSuccessionDeliveredWeek,
  };
  return { game: source, entry: { ...scheduled, id: event.id, event, why } };
}

/** A due slot is consumed only when it presents a card or records a shortfall. */
export function advanceDecisionEvent(game) {
  if (!game || game.finished || decisionPending(game)) return game;
  const candidateEvents = ensureCandidateGuarantees(game, CANDIDATE_EVENTS, activeCandidateTickets(game));
  const mandatory = candidateEvents.queue[0];
  if (mandatory) {
    const event = candidateDecisionView({ ...game, candidateEvents }, mandatory);
    if (event?.choices.some((choice) => !choice.unavailable)) return {
      ...game, candidateEvents: presentedCandidate({ ...game, candidateEvents }, event),
      currentEventId: event.id, currentEventData: event, currentInterrupt: null, eventWhy: event.why,
      outcome: null, usedEvents: [...new Set([...(game.usedEvents || []), event.id])],
    };
  }
  game = { ...game, candidateEvents };
  const schedule = game.eventSchedule || [];
  const previousIndex = Number.isInteger(game.eventScheduleIndex) ? game.eventScheduleIndex : -1;
  const elapsed = ACTIONS_PER_WEEK - actionsLeftIn(game);
  if (previousIndex + 1 >= schedule.length || elapsed < schedule[previousIndex + 1].afterActions) return game;

  let source = game;
  for (let index = previousIndex + 1; index < schedule.length && elapsed >= schedule[index].afterActions; index++) {
    const scheduled = schedule[index];
    const selected = chooseDecisionForSlot(source, index, scheduled);
    source = { ...selected.game, eventSchedule: [...(selected.game.eventSchedule || [])], eventScheduleIndex: index };
    const entry = selected.entry;
    if (!entry) {
      source.eventSchedule[index] = { status: 'shortfall', afterActions: scheduled.afterActions };
      source.eventScheduleShortfall = (source.eventScheduleShortfall || 0) + 1;
      continue;
    }
    const event = entry.event;
    source.eventSchedule[index] = { ...entry, status: 'dispatched' };
    const why = entry.why || event.why || (entry.interrupt ? 'This response follows the recorded campaign incident: ' + (event.receiptRecap || entry.interrupt.receiptKey) : null);
    return {
      ...source, currentEventId: event.id, currentEventData: event, currentInterrupt: entry.interrupt || null,
      eventWhy: why, decisionEventDispatchedCount: (source.decisionEventDispatchedCount || 0) + 1, outcome: null,
    };
  }
  return source;
}

/** End Week gives up the remaining action slots, then runs any due cards before closing. */
export function prepareDecisionWeekClose(game) {
  if (decisionPending(game)) return game;
  const noRemainingActions = actionsLeftIn(game) === 0 ? game : { ...game, actionsLeft: 0 };
  return advanceDecisionEvent(noRemainingActions);
}

// Group effects stack the same way state effects do, one entry per group.
function applyGroups(next, groups, scale = 1) {
  if (!groups) return;
  next.demographicMods = { ...(next.demographicMods || {}) };
  Object.entries(groups).forEach(([id, amount]) => {
    if (!amount) return;
    next.demographicMods[id] = (next.demographicMods[id] || 0) + amount * scale;
  });
}

// A coalition shift is written from the player's side; the map stores margins
// from the Democratic side, so a Republican campaign's gains flip sign.
function applyPlayerShifts(next, shifts, scale = 1) {
  const pov = next.party === 'rep' ? -1 : 1;
  const mapped = {};
  Object.entries(shifts || {}).forEach(([id, amount]) => {
    if (amount) mapped[id] = amount * pov;
  });
  applyGroups(next, mapped, scale);
}

function updateBuild34EndorserPolicyMemory(next, party, issueId, oldStance, newStance, week) {
  const result = updateEndorserPolicyRelationships({
    party,
    issueId,
    oldStance,
    newStance,
    relationships: next.build34EndorserRelationships || {},
    memories: next.build34EndorserMemories || {},
    week,
  });
  next.build34EndorserRelationships = result.relationships;
  next.build34EndorserMemories = result.memories;
}

// A rally's coalition reaction belongs where the rally happened. Group support is
// stored nationally, so read the room's reaction as a margin and land it only
// in that state.
//
// The demographic groups overlap (a voter can be white, Catholic and moderate),
// so their shares add up to well over a hundred and a raw read of the shift runs
// several points. A single rally is worth a fraction of a point of that.
export const RALLY_GROUP_SCALE = 0.15;

function applyLocalGroupShifts(next, shifts, abbr) {
  if (!abbr) return;
  const pov = next.party === 'rep' ? -1 : 1;
  const mapped = {};
  Object.entries(shifts || {}).forEach(([id, amount]) => {
    if (amount) mapped[id] = amount * pov;
  });
  const here = stateGroupShift(abbr, mapped) * RALLY_GROUP_SCALE;
  if (!here) return;
  const playerSign = next.party === 'rep' ? -1 : 1;
  const scaledHere = here * playerSign > 0 ? scaleRegionalPersuasion(next, Math.abs(here)) * playerSign : here;
  next.stateMods[abbr] = (next.stateMods[abbr] || 0) + scaledHere;
}

// A card or an action that says "turnout" means your own people. Every party's
// number is its own, so the lift belongs to the campaign that earned it.
function applyTurnout(next, turnout) {
  if (!turnout) return;
  Object.entries(turnout).forEach(([abbr, amt]) => addTurnoutState(next, next.party, abbr, amt));
}

// A regional bonus is a turnout bonus: the region's own voters are reminded to
// show up, and the minds inside it barely move at all.
export const REGION_TURNOUT = 3;

const build40FactionAliases = {
  'party-activists': 'activists', 'party-officials': 'officials', 'activist': 'activists',
  'donor': 'donors', 'climate': 'climate', 'moderate': 'suburbs',
  'moderates': 'suburbs', 'labor': 'labor', 'business': 'business', 'faith': 'religious',
};

function build40DecisionView(game, definition, context, funds) {
  const event = materializeBuild40Decision(definition, context, funds);
  event.choices = event.choices.map((choice, index) => ({ ...choice,
    detail: null,
    presentation: choicePresentation(definition.choices[index], (effect) => describeDecisionEffect(game, context, effect)),
    unavailable: choice.unavailable || (!build40ChoiceTargetsValid(game, context, definition.choices[index]) ? 'The report does not identify an eligible target.' : null),
  }));
  if (definition.id === 'interrupt-069-ballot-measure-conflict') event.why = 'Fictional incident in ' + STATE_BY_ABBR[context.stateId].name + ': the proposed measure conflicts with a campaign pledge.';
  return event;
}

function describeDecisionEffect(game, context, effect) {
  const target = effect.target || {};
  const party = target.side === 'opponent' ? (context.actingParty === game.party ? game.opponentParty : game.party) : context.actingParty;
  const states = ['persuasion', 'turnout', 'house', 'ground'].includes(effect.kind) ? build40EffectStates(target, context) : [];
  let targetLabel;
  if (effect.kind === 'group') targetLabel = build40GroupId(target, context);
  if (effect.kind === 'faction') {
    const standings = party === game.party ? factionStandings(game) : { ...initialFactions(party, game.opponentId), ...game.aiFactions?.[party] };
    const id = build40FactionId(party, target, context, standings);
    targetLabel = factionsFor(party).find((faction) => faction.id === id)?.label || id;
  }
  return { ...effect, side: party === game.party ? 'actor' : 'opponent', party, states, targetLabel };
}

function decisionEffectValues(game, context, effect) {
  const described = describeDecisionEffect(game, context, effect);
  const { party, states } = described;
  const mine = party === game.party;
  const pov = party === 'rep' ? -1 : 1;
  const target = effect.target || {};
  if (effect.kind === 'cash') return [mine ? game.funds : game.aiFunds?.[party] || 0];
  if (effect.kind === 'momentum' || effect.kind === 'scandal') return [momentumOf(game, party)];
  if (effect.kind === 'persuasion') return states.map((state) => isThirdParty(party) || isScenarioCandidate(party)
    ? game.thirdMods?.[party]?.[state] || 0 : (game.stateMods?.[state] || 0) * pov);
  if (effect.kind === 'turnout') return states.map((state) => turnoutRow(game, state)[party] || 0);
  if (effect.kind === 'house') return states.map((state) => game.build40?.houseEffectsByState?.[state]?.[party] || 0);
  if (effect.kind === 'ground') return states.map((state) => (mine ? game.ops?.[state] : game.aiOps?.[party]?.[state]) || 0);
  if (effect.kind === 'group') {
    const id = build40GroupId(target, context);
    return [isThirdParty(party) || isScenarioCandidate(party) ? game.build40?.groupEffectsByParty?.[party]?.[id] || 0 : (game.demographicMods?.[id] || 0) * pov];
  }
  if (effect.kind === 'faction') {
    const standings = mine ? factionStandings(game) : { ...initialFactions(party, game.opponentId), ...game.aiFactions?.[party] };
    return [standings[build40FactionId(party, target, context, standings)] || 0];
  }
  return [0];
}

function build40GroupId(target, context) {
  const aliases = { progressive: 'far left', 'traditional-republicans': 'conservative', 'source-receipt-group': context.groupId };
  return target.groupId || target.id || aliases[target.selector] || target.selector;
}

function build40ChoiceTargetsValid(game, context, choice) {
  return choice.branches.every(({ effects }) => effects.every(({ kind, target }) => {
    if (kind === 'group') return COALITION_GROUPS.some(({ id }) => id === build40GroupId(target, context));
    if (kind === 'faction') {
      const other = context.actingParty === game.party ? game.opponentParty : game.party;
      const party = target.side === 'opponent' ? other : context.actingParty;
      const standing = party === game.party ? factionStandings(game) : game.aiFactions?.[party] || initialFactions(party, game.opponentId);
      return Boolean(build40FactionId(party, target, context, standing));
    }
    return !['turnout', 'persuasion', 'house', 'ground'].includes(kind) || Boolean(build40EffectStates(target, context).length);
  }));
}

function build40FactionId(party, target, context, standings) {
  const named = target.factionId || target.id || target.selector;
  const key = String(named || '').toLowerCase().replace(/[â€™']/g, '');
  if (Object.hasOwn(standings, key)) return key;
  const role = build40FactionAliases[key] || key;
  return factionsFor(party).find((item) => item.id === role || item.role === role)?.id
    || (key === 'source-receipt-faction' ? context.factionId : null);
}

function applyBuild40MapEffect(next, stateId, party, amount) {
  if (isThirdParty(party) || isScenarioCandidate(party)) {
    if (scenarioBallotAccess(next.build39?.scenario?.id, 'president', stateId, party)) applyMinorPartyPersuasion(next, party, stateId, amount);
  }
  else next.stateMods[stateId] = (next.stateMods[stateId] || 0) + scaleRegionalPersuasion(next, amount) * (party === 'rep' ? -1 : 1);
}

function applyBuild40Package(game, context, choice, riskModifier = 1) {
  const funds = context.actingParty === game.party ? game.funds : game.aiFunds?.[context.actingParty] || 0;
  if (funds < build40ChoiceCost(choice) || !build40ChoiceTargetsValid(game, context, choice)) return null;
  const rolled = resolveBuild40Roll(game, context, choice);
  if (!rolled) return null;
  const next = {
    ...game, stateMods: { ...game.stateMods }, scandals: [...(game.scandals || [])],
    build40: { ...game.build40, houseEffectsByState: { ...game.build40?.houseEffectsByState } },
  };
  const applied = [];
  let scandal = null;
  let score = 0;
  const other = context.actingParty === game.party ? game.opponentParty : game.party;
  for (const effect of rolled.effects) {
    const before = decisionEffectValues(next, context, effect);
    const target = effect.target || {};
    const party = target.side === 'opponent' ? other : context.actingParty;
    const mine = party === game.party;
    const pov = party === 'rep' ? -1 : 1;
    const amount = effect.amount;
    const states = ['persuasion', 'turnout', 'house', 'ground'].includes(effect.kind)
      ? build40EffectStates(target, context) : [];
    if (effect.kind === 'cash') {
      if (mine) next.funds = Math.max(0, Math.round((next.funds + amount) * 1000) / 1000);
      else next.aiFunds = { ...next.aiFunds, [party]: Math.max(0, Math.round(((next.aiFunds?.[party] || 0) + amount) * 1000) / 1000) };
    } else if (effect.kind === 'momentum') {
      addPartyMomentum(next, party, amount);
      if (party === context.actingParty) score += amount;
    } else if (effect.kind === 'persuasion') {
      if (!states.length) return null;
      for (const stateId of states) applyBuild40MapEffect(next, stateId, party, amount);
    } else if (effect.kind === 'turnout') {
      if (!states.length) return null;
      for (const stateId of states) bumpTurnoutState(next, party, stateId, amount);
    } else if (effect.kind === 'house') {
      if (!states.length) return null;
      for (const stateId of states) {
        const map = next.build40.houseEffectsByState;
        map[stateId] = { ...map[stateId], [party]: (map[stateId]?.[party] || 0) + amount };
      }
    } else if (effect.kind === 'group') {
      const group = build40GroupId(target, context);
      if (!COALITION_GROUPS.some((item) => item.id === group)) return null;
      if (isThirdParty(party) || isScenarioCandidate(party)) {
        const previous = next.build40.groupEffectsByParty || {};
        const groupEffects = previous[party] || {};
        next.build40.groupEffectsByParty = { ...previous, [party]: { ...groupEffects, [group]: (groupEffects[group] || 0) + amount } };
      } else applyGroups(next, { [group]: amount * pov });
    } else if (effect.kind === 'faction') {
      const standings = mine ? factionStandings(next) : { ...initialFactions(party, game.opponentId), ...next.aiFactions?.[party] };
      const id = build40FactionId(party, target, context, standings);
      if (!id || !Object.hasOwn(standings, id)) return null;
      const updated = { ...standings, [id]: clamp(standings[id] + amount, 0, 100) };
      if (mine) next.factions = updated;
      else next.aiFactions = { ...next.aiFactions, [party]: updated };
    } else if (effect.kind === 'scandal') {
      const probability = effect.probability ?? effect.risk ?? amount ?? 1;
      const guaranteed = effect.guaranteed || probability === 1;
      const risk = Math.min(1, probability * scandalScale(game.difficultyId) * riskModifier);
      if (!guaranteed && rolled.random() >= risk) continue;
      const severity = effect.severity === 'double' || effect.severity === 2 ? 2 : 1;
      const native = rollScandal(risk, rolled.random);
      scandal = { ...native, hit: native.hit * severity };
      addPartyMomentum(next, party, -scandal.hit);
      const priorScandals = mine ? (game.scandals?.length || 0) : 0;
      const scandalDamp = 1 / (1 + 0.15 * priorScandals);
      for (const state of STATES) applyBuild40MapEffect(next, state.abbr, party, -(SCANDAL_VOTE_LOSS[scandal.level] || 0) * 1.4 * severity * scandalDamp);
      if (mine) next.scandals.push({ week: game.week, ...scandal });
      if (party === context.actingParty) score -= scandal.hit;
    } else if (effect.kind === 'ground') {
      if (!states.length) return null;
      if (mine) next.ops = { ...next.ops };
      else next.aiOps = { ...next.aiOps, [party]: { ...next.aiOps?.[party] } };
      const operations = mine ? next.ops : next.aiOps[party];
      for (const state of states) operations[state] = Math.max(0, Math.min(3, (operations[state] || 0) + amount));
    } else return null;
    const after = decisionEffectValues(next, context, effect);
    const described = describeDecisionEffect(next, context, effect);
    const base = { kind: effect.kind, party, side: described.side, targetLabel: described.targetLabel, hidden: effect.hidden === true };
    const deltas = after.map((value, index) => Math.round((value - before[index]) * 10000) / 10000);
    if (effect.kind === 'scandal') applied.push({ ...base, amount: deltas[0], hit: -deltas[0],
      persuasionAmount: -(SCANDAL_VOTE_LOSS[scandal.level] || 0) * 2.5 * (effect.severity === 'double' || effect.severity === 2 ? 2 : 1) });
    else if (states.length && !deltas.every((delta) => delta === deltas[0])) {
      states.forEach((state, index) => applied.push({ ...base, amount: deltas[index], states: [state] }));
    } else applied.push({ ...base, amount: deltas[0], ...(states.length ? { states } : {}) });
  }
  return { next, applied, score, scandal, randomized: rolled.randomized };
}

export function applyChoice(game, requested, expectedEventId = null) {
  if (!decisionPending(game)) return game;
  const event = game.currentEventData;
  if (expectedEventId && build40EventId(expectedEventId) !== event.id) return game;
  if (!validPendingReceipt(game, event)) return retireInvalidDecision(game);
  const definition = DECISION_EVENTS_BY_ID[event.id];
  const choice = definition.choices.find(({ id }) => id === (typeof requested === 'string' ? requested : requested?.id));
  const key = event.context.instanceId;
  if (!choice || game.build40?.decisionReceipts?.some((receipt) => receipt.id === key)) return game;
  const result = applyBuild40Package(game, event.context, choice);
  if (!result) return game;
  const { next, applied, scandal, randomized } = result;
  const receipt = {
    id: key, eventId: event.id, choiceId: choice.id, actingParty: event.context.actingParty,
    week: game.week, stateId: event.context.stateId, neighborId: event.context.neighborId,
    sourceReceiptId: event.sourceReceiptId, effects: applied, scandal,
  };
  next.build40.decisionReceipts = [...(game.build40?.decisionReceipts || []), receipt];
  if (event.context.candidateId) {
    next.candidateEvents = recordCandidateEventResolved(game.candidateEvents, {
      key: event.context.candidateEventKey, candidateId: event.context.candidateId, party: event.context.actingParty,
      eventId: event.id, week: game.week,
    });
    receipt.candidateId = event.context.candidateId;
  }
  next.currentInterrupt = null;
  const succession = VANCE_SUCCESSION_BY_ID[event.id];
  if (succession) {
    next.vanceSuccessionStarted = true;
    next.vanceSuccessionDeliveredWeek = game.week;
    next.vanceSuccessionPart = succession.vanceSuccessionPart;
    next.vanceSuccessionAppliedParts = [...new Set([...(game.vanceSuccessionAppliedParts || []), succession.vanceSuccessionPart])];
    next.sittingPresidentId = 'vance';
  }
  if (scandal && event.context.stateId) pushStory(next, storyFrom(next, event.context.stateId, 'scandal', false, 'the scandal'));
  next.outcome = {
    text: event.id === 'interrupt-069-ballot-measure-conflict' ? 'Your response to the fictional incident in ' + STATE_BY_ABBR[event.context.stateId].name + ' has been filed.' : 'Your response has been filed.',
    label: choice.label, choiceId: choice.id, presentation: outcomePresentation(applied),
    sourceStateId: event.context.stateId, scandal, roll: randomized,
  };
  next.weekEventResults = [...(game.weekEventResults || []), {
    id: event.id, title: event.title, choice: choice.label, checkpoint: game.eventScheduleIndex, decisionKey: key,
    evidenceReceiptId: event.sourceReceiptId, choiceReceiptId: receipt.id,
  }];
  const recorded = recordIncident(game, next, { type: 'choice', abbr: receipt.stateId });
  return build40RecordedFollowUp(recorded, event, recorded.incidentLedger.at(-1));
}

export function closestStates(game, count = OPPONENT_CLOSEST) {
  return snapshot(game)
    .rows.slice()
    .sort((a, b) => Math.abs(a.margin) - Math.abs(b.margin))
    .slice(0, count);
}

// The five closest races on the whole ballot: the presidential map first, then
// whatever House and Senate seats are actually in play.
const OPPONENT_LEGISLATURE_SEATS_BY_STATE = Object.fromEntries(
  STATE_LEGISLATURES_2028.map((state) => [
    state.abbr,
    state.chambers
      .filter((chamber) => chamber.seatsUp2028 > 0 && chamber.districtStructure?.kind !== 'nonpartisan-single-member')
      .reduce((sum, chamber) => sum + chamber.seatsUp2028, 0),
  ]),
);

export function opponentTargets(game, diff, style = 'adaptive') {
  const sign = game.opponentParty === 'dem' ? 1 : -1;
  const pool = {};
  const attention = game.strategyProfile?.stateActions || {};
  const bias = OPPONENT_TARGET_BIASES[style] || OPPONENT_TARGET_BIASES.adaptive;
  const boardRows = snapshot(game).rows;
  const rowsByState = Object.fromEntries(boardRows.map((row) => [row.abbr, row]));
  const add = (abbr, lead, kind, extra = 0, legislatureSeats = 0) => {
    if (!abbr) return;
    const state = STATE_BY_ABBR[abbr];
    const ev = state?.ev || 5;
    const closeness = Math.exp(-Math.abs(lead) / 13);
    let score = Math.sqrt(ev) * closeness;
    if (lead < 0) score *= 1.2;
    else if (lead > 14) score *= 0.4;
    // The Republican campaign spends extra effort reclaiming states with a durable GOP lean.
    if (game.opponentParty === 'rep' && state?.lean <= -5 && lead < 0) {
      score *= 1 + Math.min(2.5, Math.abs(state.lean) / 10);
    }
    const playerAttention = Number.isFinite(attention[abbr]) ? attention[abbr] : 0;
    if (playerAttention >= 2) score *= 1 + Math.min(0.55, playerAttention * 0.11);
    else if (playerAttention < 0.5 && closeness > 0.48) score *= 1.16;
    const localNews = Math.abs(game.downballotNews?.senate?.[abbr] || 0)
      + Math.abs(game.downballotNews?.house?.[abbr] || 0)
      + Math.abs(game.downballotNews?.gov?.[abbr] || 0);
    const row = rowsByState[abbr];
    const support = row?.shares?.[game.opponentParty] || 0;
    const turnoutGap = Math.max(0, 72 - turnoutOf(game, abbr, game.opponentParty));
    const fatigue = actionMultiplier(game, game.opponentParty, abbr, 'stop');
    if (Math.abs(lead) < 12) score += Math.min(1, localNews * 0.18 * bias.news);
    score += Math.min(0.65, Math.max(0, playerAttention - 1) * 0.1 * bias.attention);
    score += Math.min(0.55, turnoutGap * 0.012 * bias.turnout) * (support >= 40 ? 1 : 0.35);
    score += Math.min(0.4, Math.max(0, support - 43) * 0.018 * bias.supportive);
    if (Math.abs(state?.lean || 0) <= 8) score += 0.28 * bias.suburb;
    score *= Math.max(0.62, fatigue);
    score += extra;
    const entry = pool[abbr] || { abbr, name: state?.name || abbr, lead, score: 0, kinds: [], localNews: 0, turnoutGap: 0, support: 0, legislatureSeats: 0 };
    entry.lead = Math.min(Math.abs(entry.lead), Math.abs(lead));
    entry.score += score;
    entry.localNews = Math.max(entry.localNews, localNews);
    entry.turnoutGap = Math.max(entry.turnoutGap, turnoutGap);
    entry.support = Math.max(entry.support, support);
    entry.legislatureSeats = Math.max(entry.legislatureSeats, legislatureSeats);
    if (!entry.kinds.includes(kind)) entry.kinds.push(kind);
    if (playerAttention >= 2 && !entry.kinds.includes('player focus')) entry.kinds.push('player focus');
    if (playerAttention < 0.5 && closeness > 0.48 && !entry.kinds.includes('neglected')) entry.kinds.push('neglected');
    pool[abbr] = entry;
  };

  boardRows.forEach((row) => add(row.abbr, sign * row.margin, 'pres'));
  downballotTargets(game, marginFn(game)).slice(0, 12).forEach((target) => {
    const lead = sign * target.lead;
    add(target.abbr, lead, 'down', 0.35 * Math.exp(-Math.abs(lead) / 10));
  });

  // State generic-ballot movement also changes the 2028 legislative forecast.
  // Target only states with nonpartisan-eligible seats actually scheduled, and
  // weight the opportunity by how many seats are exposed and how close the
  // current state generic ballot is for the rival party.
  Object.entries(OPPONENT_LEGISLATURE_SEATS_BY_STATE).forEach(([abbr, seats]) => {
    if (!seats) return;
    const genericLead = sign * (game.stateGeneric?.[abbr] || 0);
    const seatWeight = Math.min(0.85, Math.log2(seats + 1) * 0.13);
    add(abbr, genericLead, 'legislature', seatWeight, seats);
  });

  return Object.values(pool).sort((a, b) => b.score - a.score);
}

function pickAITarget(targets, diff, used, random) {
  if (!targets.length) return null;
  const power = 0.8 + (diff.aiFocus || 0);
  const weighted = targets.map((target) => ({
    target,
    weight: Math.pow(Math.max(0.02, target.score), power) / (1 + (used[target.abbr] || 0) * 0.35),
  }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = random() * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.target;
  }
  return weighted[weighted.length - 1].target;
}

const OPPONENT_STYLES = {
  vance: 'base', trumpjr: 'media', carlson: 'media', desantis: 'field', kemp: 'field',
  cruz: 'policy', rubio: 'policy', haley: 'suburban', youngkin: 'suburban', newsom: 'counterpunch',
  buttigieg: 'policy', shapiro: 'field', harris: 'coalition', aoc: 'coalition',
};

const OPPONENT_TARGET_BIASES = {
  base: { attention: 0.75, news: 0.8, turnout: 0.65, supportive: 1.1, suburb: 0.75 },
  field: { attention: 0.7, news: 0.8, turnout: 1.4, supportive: 1.05, suburb: 0.8 },
  media: { attention: 1.1, news: 1.45, turnout: 0.65, supportive: 0.9, suburb: 0.9 },
  policy: { attention: 0.9, news: 1.05, turnout: 0.75, supportive: 0.9, suburb: 0.9 },
  suburban: { attention: 1, news: 0.9, turnout: 0.75, supportive: 0.95, suburb: 1.45 },
  coalition: { attention: 0.9, news: 0.85, turnout: 1.25, supportive: 1.2, suburb: 0.95 },
  counterpunch: { attention: 1.5, news: 1.1, turnout: 0.75, supportive: 0.9, suburb: 0.85 },
  adaptive: { attention: 1, news: 1, turnout: 1, supportive: 1, suburb: 1 },
};

const OPPONENT_RESERVE_BIASES = {
  base: 1, field: 1, media: 0.7, policy: 0.9, suburban: 1.1,
  coalition: 0.9, counterpunch: 0.75, adaptive: 1,
};

function weeksUntilNextDebate(game) {
  const weekOffset = game.week - (totalWeeksOf(game) - TOTAL_WEEKS);
  for (let distance = 0; distance <= 2; distance += 1) {
    if (DEBATE_BY_WEEK[weekOffset + distance]) return distance;
  }
  return null;
}

function selectOpponentSpecialAction(game, targets, style, pendingBrokenPromise, random) {
  if (pendingBrokenPromise) return { type: 'attack' };
  const options = [];
  const add = (type, weight) => options.push({ type, weight });
  const weeksLeft = Math.max(0, (game.totalWeeks || TOTAL_WEEKS) - game.week - 1);
  const funds = Math.max(0, Number(game.aiFunds?.[game.opponentParty]) || 0);
  const lastFundraiser = Number.isInteger(game.aiLastFundraiserWeek) ? game.aiLastFundraiserWeek : -10;
  const debateDistance = weeksUntilNextDebate(game);
  const fatigueTargets = targets.map((target) => {
    const stateFatigue = game.fatigue?.[game.opponentParty]?.[target.abbr] || {};
    return { target, points: Object.values(stateFatigue).reduce((sum, value) => sum + (Number(value) || 0), 0) };
  });
  const mostFatigued = fatigueTargets.sort((a, b) => b.points - a.points)[0];
  const fieldTargets = targets.filter((target) => target.kinds.includes('down') || target.kinds.includes('legislature'));
  const voterTargets = targets.filter((target) => target.support >= 38 && target.turnoutGap >= 2);

  if (funds < 145 && weeksLeft > 1 && game.week - lastFundraiser >= 3) add('fundraiser', 1.4);
  if (voterTargets.length) add('townhall', style === 'field' || style === 'coalition' ? 1.5 : 0.8);
  if (targets.length) add('surrogate', style === 'field' || style === 'suburban' ? 1.35 : 0.8);
  if (fieldTargets.length) add('downballot', style === 'policy' || style === 'coalition' ? 1.4 : 0.9);
  if (debateDistance !== null && (game.aiDebatePrep || 0) < 3) add('debate-prep', debateDistance === 0 ? 1.9 : 1.25);
  if (mostFatigued?.points >= 2) add('quiet', Math.min(2, 0.8 + mostFatigued.points * 0.15));
  if (!options.length) add('surrogate', 1);

  const total = options.reduce((sum, option) => sum + option.weight, 0);
  let roll = random() * total;
  for (const option of options) {
    roll -= option.weight;
    if (roll <= 0) return { type: option.type };
  }
  return { type: options.at(-1).type };
}

// The opponent gets seven actions too, but varies its plan with candidate style,
// local campaign opportunities, supporter turnout, and available cash.
function opponentWeek(game, diff, style, targets, board, random) {
  const skill = diff.oppSkill;
  const pov = game.party === 'rep' ? 1 : -1;
  const db = game.opponentParty === 'dem' ? 1 : -1;
  const genericPov = game.opponentParty === 'dem' ? 1 : -1;
  const deltas = {};
  const dbDeltas = {};
  const genericDeltas = {};
  const turnoutMoves = [];
  /** @type {Array<Record<string, any>>} */
  const moves = [];
  const fatigue = [];
  const used = {};

  const party = game.opponentParty;
  const pendingBrokenPromise = (game.promiseLedger || []).find((promise) => promise.broken && promise.exploitedWeek == null);
  const addLegislatureGeneric = (abbr, amount) => {
    if (!OPPONENT_LEGISLATURE_SEATS_BY_STATE[abbr] || !amount) return;
    genericDeltas[abbr] = (genericDeltas[abbr] || 0) + amount;
  };
  let budget = Math.max(0, game.aiFunds?.[party] || 0);
  const budgetPlan = aiBudgetPlan(game, party, (abbr) => pollMargin(abbr, game), OPPONENT_RESERVE_BIASES[style] || 1);
  const operationsBudget = Math.max(0, budget - budgetPlan.reserve);
  const aiFactionEffects = factionEffects({
    ...game,
    party,
    candidateId: game.opponentId,
    factions: { ...initialFactions(party, game.opponentId), ...(game.aiFactions?.[party] || {}) },
    factionCrises: {},
  });
  const mobilization = targets.map((target) => {
    const row = board.find((item) => item.abbr === target.abbr);
    const support = row?.shares?.[party] || 0;
    const turnout = turnoutOf(game, target.abbr, party);
    const gap = Math.max(0, 70 - turnout);
    return { target, support, turnout, score: (support - 40) * 0.035 + gap * 0.1 + Math.max(0, 10 - Math.abs(target.lead)) * 0.04 };
  }).filter((item) => item.support >= 40 && item.turnout < 74).sort((a, b) => b.score - a.score)[0];
  const volunteerTarget = mobilization && operationsBudget >= volunteerPrice(mobilization.target.abbr) && mobilization.score >= (style === 'field' || style === 'coalition' ? 0.3 : 0.65)
    ? mobilization.target
    : null;

  const futureWeeks = Math.max(0, (game.totalWeeks || TOTAL_WEEKS) - game.week - 1);
  const volunteerSpend = volunteerTarget ? volunteerPrice(volunteerTarget.abbr) : 0;
  const fieldTarget = targets.find(({ abbr }) =>
    (game.aiOps?.[party]?.[abbr] || 0) < GROUND_LEVELS.length &&
    scenarioBallotAccess(game.build39?.scenario?.id, 'president', abbr, party));
  let groundPurchase = null;
  if (futureWeeks > 0 && fieldTarget && random() < 0.22) {
    const level = (game.aiOps?.[party]?.[fieldTarget.abbr] || 0) + 1;
    const quote = quoteOpeningFieldPlan({ game, party, plan: { [fieldTarget.abbr]: level } });
    if (quote.ok && quote.cost <= operationsBudget - volunteerSpend) {
      groundPurchase = { abbr: fieldTarget.abbr, level, cost: quote.cost };
    }
  }
  const budgetSpent = volunteerSpend + (groundPurchase?.cost || 0);
  budget = Math.max(0, budget - budgetSpent);

  // A volunteer operation trades one stop for a mobilization push. Field
  // investments use the ordinary budget and weekly flow without an action.
  const stopCount = volunteerTarget ? 4 : 5;
  for (let i = 0; i < stopCount; i++) {
    const target = pickAITarget(targets, diff, used, random);
    if (!target) break;
    used[target.abbr] = (used[target.abbr] || 0) + 1;
    // Their own fatigue in the state dulls the stop, exactly as yours does.
    const fat = actionMultiplier(game, game.opponentParty, target.abbr, 'stop');
    const factionField = aiFactionEffects.laborStates.includes(target.abbr) ? aiFactionEffects.laborFieldMul : 1;
    const actionStrength = aiFactionEffects.actionMul * factionField * build38Field(game, 'visit', target.abbr).rallyMultiplier;
    deltas[target.abbr] = (deltas[target.abbr] || 0) + pov * (0.38 * skill * fat * actionStrength + resolveRallyEffect().persuasionPoints);
    dbDeltas[target.abbr] = (dbDeltas[target.abbr] || 0) + 0.5 * db * skill * fat * actionStrength;
    addLegislatureGeneric(target.abbr, 0.16 * genericPov * skill * fat * actionStrength);
    fatigue.push({ party: game.opponentParty, abbr: target.abbr, type: 'stop', points: 1 });
    moves.push({
      type: 'stop',
      abbr: target.abbr,
      name: target.name,
      down: target.kinds.includes('down'),
      text: `Rallied in ${target.name}${target.kinds.includes('down') ? ' and worked the downballot' : ''}${target.kinds.includes('player focus') ? ' to challenge your heavy investment' : target.kinds.includes('neglected') ? ' while your campaign was quiet there' : ''}`,
    });
  }

  const adState = pickAITarget(targets, diff, used, random) || targets[0];
  const adFat = actionMultiplier(game, game.opponentParty, adState.abbr, 'ad');
  const messageFocus = Object.entries(game.strategyProfile?.issueFocus || {}).sort((a, b) => b[1] - a[1])[0];
  const issueAdChance = style === 'media' || style === 'counterpunch' ? 0.58 : style === 'policy' ? 0.48 : 0.3;
  const issueAd = messageFocus?.[1] >= 1.5 && random() < issueAdChance
    ? { issueId: messageFocus[0], label: ISSUE_BY_ID[messageFocus[0]]?.label || 'the rival’s chosen issue', abbr: adState.abbr }
    : null;
  deltas[adState.abbr] = (deltas[adState.abbr] || 0) + 0.45 * pov * skill * adFat;
  dbDeltas[adState.abbr] = (dbDeltas[adState.abbr] || 0) + 0.45 * db * skill * adFat;
  addLegislatureGeneric(adState.abbr, 0.28 * genericPov * skill * adFat);
  fatigue.push({ party: game.opponentParty, abbr: adState.abbr, type: 'ad', points: 1 });
  moves.push({
    type: issueAd ? 'issue-ad' : 'ad',
    abbr: adState.abbr,
    name: adState.name,
    issueId: issueAd?.issueId || null,
    text: issueAd ? `Ran a ${issueAd.label.toLowerCase()} ad in ${adState.name} to counter your message` : `Blanketed ${adState.name} with ads`,
  });
  if (volunteerTarget) {
    const turnout = turnoutOf(game, volunteerTarget.abbr, party);
    const points = Math.min(4.5, Math.max(1, (70 - turnout) * 0.45)) * Math.max(0.75, skill) * aiFactionEffects.actionMul;
    turnoutMoves.push({ abbr: volunteerTarget.abbr, points: points * build38Field(game, 'volunteers', volunteerTarget.abbr).fieldMultiplier });
    moves.push({ type: 'volunteers', abbr: volunteerTarget.abbr, name: volunteerTarget.name, points, text: `Sent organizers to ${volunteerTarget.name} to mobilize supporters with a turnout gap` });
    fatigue.push({ party, abbr: volunteerTarget.abbr, type: 'stop', points: 1 });
  }
  if (groundPurchase) {
    moves.push({ type: 'ground-game', abbr: groundPurchase.abbr, level: groundPurchase.level,
      text: `Expanded the field operation in ${fieldTarget.name} to level ${groundPurchase.level}` });
  }
  let fundsRaised = 0;
  let debatePrep = 0;
  let fatigueRecovery = null;
  const selectedAction = selectOpponentSpecialAction(game, targets, style, pendingBrokenPromise, random);
  if (selectedAction?.type === 'fundraiser') {
    const donorStanding = Number(game.aiFactions?.[party]?.donors) || 50;
    fundsRaised = round1(2 + donorStanding / 100 * 2.5);
    moves.push({ type: 'fundraiser', raised: fundsRaised, text: `Held a finance event that raised $${fundsRaised.toFixed(1)}M from the rival’s donor network` });
  } else if (selectedAction?.type === 'debate-prep') {
    debatePrep = 1;
    moves.push({ type: 'debate-prep', text: 'Ran a debate-preparation session and banked one preparation point' });
  } else if (selectedAction?.type === 'quiet') {
    const recoveryTarget = targets.map((target) => ({
      target,
      fatigue: Object.values(game.fatigue?.[party]?.[target.abbr] || {}).reduce((sum, value) => sum + (Number(value) || 0), 0),
    })).sort((a, b) => b.fatigue - a.fatigue)[0]?.target || targets[0];
    if (recoveryTarget) {
      fatigueRecovery = { abbr: recoveryTarget.abbr, type: 'stop', amount: 1 };
      moves.push({ type: 'quiet', abbr: recoveryTarget.abbr, name: recoveryTarget.name, text: `Kept a lower-profile day in ${recoveryTarget.name} and gave the local operation time to recover` });
    }
  } else if (selectedAction && selectedAction.type !== 'attack') {
    const eligibleTargets = selectedAction.type === 'townhall'
      ? targets.filter((target) => target.support >= 38 && target.turnoutGap >= 2)
      : selectedAction.type === 'downballot'
        ? targets.filter((target) => target.kinds.includes('down') || target.kinds.includes('legislature'))
        : targets;
    const actionTarget = pickAITarget(eligibleTargets.length ? eligibleTargets : targets, diff, used, random);
    if (actionTarget) {
      used[actionTarget.abbr] = (used[actionTarget.abbr] || 0) + 1;
      if (selectedAction.type === 'surrogate') {
        const move = 0.42 * pov * skill * actionMultiplier(game, party, actionTarget.abbr, 'stop');
        deltas[actionTarget.abbr] = (deltas[actionTarget.abbr] || 0) + move;
        addLegislatureGeneric(actionTarget.abbr, 0.12 * genericPov * skill);
        fatigue.push({ party, abbr: actionTarget.abbr, type: 'stop', points: 0.5 });
        moves.push({ type: 'surrogate', abbr: actionTarget.abbr, name: actionTarget.name, text: `Sent a trusted local surrogate to ${actionTarget.name}` });
      } else if (selectedAction.type === 'townhall') {
        const move = 0.28 * pov * skill * actionMultiplier(game, party, actionTarget.abbr, 'stop');
        deltas[actionTarget.abbr] = (deltas[actionTarget.abbr] || 0) + move;
        addLegislatureGeneric(actionTarget.abbr, 0.1 * genericPov * skill);
        turnoutMoves.push({ abbr: actionTarget.abbr, points: 1.1 * skill });
        fatigue.push({ party, abbr: actionTarget.abbr, type: 'stop', points: 0.5 });
        moves.push({ type: 'townhall', abbr: actionTarget.abbr, name: actionTarget.name, text: `Held a town hall in ${actionTarget.name} to hear local concerns and mobilize supporters` });
      } else if (selectedAction.type === 'downballot') {
        dbDeltas[actionTarget.abbr] = (dbDeltas[actionTarget.abbr] || 0) + 0.38 * db * skill;
        addLegislatureGeneric(actionTarget.abbr, 0.2 * genericPov * skill);
        moves.push({ type: 'downballot-help', abbr: actionTarget.abbr, name: actionTarget.name, text: `Shared campaign staff with downballot candidates in ${actionTarget.name}${actionTarget.kinds.includes('legislature') ? ' and shifted its state legislative environment' : ''}` });
      }
    }
  } else if (selectedAction?.type === 'attack') {
    moves.push({ type: 'attack', text: 'Used the unkept campaign promise as a public attack line' });
  }

  const brokenPromise = pendingBrokenPromise;
  const issueFocus = Object.entries(game.strategyProfile?.issueFocus || {}).sort((a, b) => b[1] - a[1])[0];
  const localNewsTarget = targets.find((target) => target.localNews >= 1.5 && Math.abs(target.lead) < 12);
  let strategy;
  if (brokenPromise) {
    strategy = {
      label: 'Exploit an unkept promise',
      reason: `The rival is using your broken ${ISSUE_BY_ID[brokenPromise.issueId]?.label?.toLowerCase() || 'policy'} promise${STATE_BY_ABBR[brokenPromise.abbr] ? ` in ${STATE_BY_ABBR[brokenPromise.abbr].name}` : ' in a close state'}.`,
    };
  } else if (issueFocus?.[1] >= 1.5 && ['media', 'policy', 'counterpunch'].includes(style)) {
    strategy = {
      label: 'Counter your strongest message',
      reason: `${style === 'media' ? 'The media team is challenging' : 'The campaign is answering'} your ${ISSUE_BY_ID[issueFocus[0]]?.label?.toLowerCase() || 'policy'} focus.`,
    };
  } else if (localNewsTarget) {
    strategy = {
      label: 'Answer a local story',
      reason: `The campaign is contesting ${localNewsTarget.name}, where local coverage and a close race create an opening.`,
    };
  } else if (volunteerTarget) {
    strategy = {
      label: 'Mobilize supporters',
      reason: `Organizers are targeting ${volunteerTarget.name}, where the rival has a strong base and a turnout gap.`,
    };
  } else if (groundPurchase) {
    strategy = { label: 'Expand the field operation', reason: `Organizers expanded the operation in ${fieldTarget.name} using the weekly campaign budget.` };
  } else if (selectedAction?.type === 'downballot') {
    strategy = { label: 'Help downballot candidates', reason: 'The rival is sharing staff in a state with a live House, Senate, governor, or state-legislature opportunity.' };
  } else if (selectedAction?.type === 'townhall') {
    strategy = { label: 'Hold a local town hall', reason: 'The campaign is meeting supporters and closing a turnout gap in person.' };
  } else if (selectedAction?.type === 'surrogate') {
    const target = moves.find((move) => move.type === 'surrogate');
    strategy = { label: 'Deploy a local surrogate', reason: `A trusted local voice is helping the ticket in ${target?.name || 'a competitive state'}.` };
  } else if (selectedAction?.type === 'fundraiser') {
    strategy = { label: 'Raise campaign funds', reason: 'The finance team is holding a donor event to replenish the campaign’s planned media budget.' };
  } else if (selectedAction?.type === 'debate-prep') {
    strategy = { label: 'Prepare for the debate', reason: 'The rival is using a campaign day to bank preparation before an upcoming debate.' };
  } else if (selectedAction?.type === 'quiet') {
    const target = moves.find((move) => move.type === 'quiet');
    strategy = { label: 'Give a tired operation a quiet day', reason: `The rival is reducing fatigue in ${target?.name || 'a repeatedly worked state'} before the next push.` };
  } else if (budget <= budgetPlan.reserve + 2 && futureWeeks > 0) {
    strategy = {
      label: 'Protect the later media reserve',
      reason: 'The campaign is keeping enough cash for stronger advertising windows later in the race.',
    };
  } else {
    const target = targets.find((item) => item.kinds.includes('neglected')) || targets[0];
    strategy = target
      ? {
          label: target.kinds.includes('neglected') ? 'Contest an undercovered state' : target.lead > 0 ? 'Defend a close state' : 'Contest a close state',
          reason: target.kinds.includes('neglected')
            ? `The rival is challenging ${target.name}, where your campaign has spent little time.`
            : `The rival is concentrating on ${target.name}, one of the closest states on the map.`,
        }
      : { label: 'Save for a clearer opening', reason: 'The campaign is protecting its remaining resources until a better opportunity appears.' };
  }

  return {
    deltas,
    dbDeltas,
    genericDeltas,
    turnoutMoves,
    fundsRaised,
    debatePrep,
    fatigueRecovery,
    issueAd,
    moves,
    fatigue,
    momentum: 1.3 * skill,
    myMomentum: -1.0 * skill,
    volunteerTarget,
    groundPurchase,
    budgetSpent,
    budgetPlan,
    strategy,
  };
}

export const PARTY_SHORT = { dem: 'Dem', rep: 'GOP', lib: 'Lib', grn: 'Grn' };

// The nominee a party is running, whether that is you, your rival, or somebody
// the cameras never find.
export function nomineeOf(game, party) {
  if (party === game.party) return CANDIDATE_BY_ID[game.candidateId] || null;
  if (party === game.opponentParty) return CANDIDATE_BY_ID[game.opponentId] || null;
  return byParty(party, game.build39?.scenario?.id)
    .slice()
    .sort((a, b) => b.weight - a.weight)[0] || null;
}

function campaignContextForParty(game, party) {
  const nominee = nomineeOf(game, party);
  const candidateId = nominee?.id || null;
  const stances = party === game.party
    ? game.stances
    : party === game.opponentParty
      ? game.oppStances
      : stancesFor(nominee || { id: candidateId, party });
  const defaults = initialFactions(party, candidateId);
  const factions = party === game.party
    ? { ...defaults, ...(game.factions || {}) }
    : { ...defaults, ...(game.aiFactions?.[party] || {}) };
  return { party, candidateId, nominee, stances: stances || {}, factions };
}

function pacSupportForParty(pac, candidate) {
  if (!candidate?.candidateId) return 0;
  const issueId = pac.issueIds?.[0] || Object.keys(pac.issueWeights || {})[0];
  if (!issueId) return 0;
  const stance = Number(candidate.stances?.[issueId] ?? 1);
  return Math.max(0, 1 - Math.abs(stance - Number(pac.preferredStance ?? 1)) / 2);
}

function pacCandidatesForWeek(game, candidates) {
  const mode = game.thirdMode === 'surge' ? 'four-party' : 'standard';
  return assignSuperPacsForMode([...SUPER_PAC_ROSTER], mode, game.party).flatMap((pac) => {
    const candidateParties = pac.scenarioAlignment === 'persuadable'
      ? (mode === 'four-party' ? PARTY_ORDER : ['dem', 'rep'])
      : [pac.scenarioAlignment || pac.alignment];
    const eligible = candidateParties.map((party) => {
      const candidate = candidates[party];
      const factionId = pac.factionByParty?.[party] || pac.scenarioFactionId || pac.factionId;
      const standing = Number(candidate?.factions?.[factionId] ?? 50);
      const support = pacSupportForParty(pac, candidate);
      return { party, candidate, factionId, standing, support };
    }).filter((item) => item.candidate?.candidateId &&
      item.support >= Number(pac.supportThreshold ?? 0) &&
      item.standing >= Number(pac.factionThreshold ?? 0))
      .sort((a, b) => (b.support - a.support) || (b.standing - a.standing) || a.party.localeCompare(b.party));
    const selected = eligible[0];
    if (!selected) return [];
    return [{
      ...pac,
      beneficiaryParty: selected.party,
      candidateId: selected.candidate.candidateId,
      stances: selected.candidate.stances,
      factionId: selected.factionId,
    }];
  });
}

function partyMarginByState(row) {
  return Object.fromEntries(PARTY_ORDER.map((party) => {
    const support = Number(row.support?.[party]) || 0;
    const strongestOpponent = Math.max(0, ...PARTY_ORDER.filter((other) => other !== party)
      .map((other) => Number(row.support?.[other]) || 0));
    return [party, support - strongestOpponent];
  }));
}

function addPartyMomentum(game, party, amount) {
  if (party === game.party) game.momentum = clampMomentum((game.momentum || 50) + amount);
  else if (party === game.opponentParty) game.oppMomentum = clampMomentum((game.oppMomentum || 50) + amount);
  else game.pMomentum = { ...(game.pMomentum || {}), [party]: clampMomentum(momentumOf(game, party) + amount) };
}

function applyBuild34ProxyVisit(game, visit, candidates) {
  const party = visit.party;
  const abbr = visit.stateId;
  const candidate = candidates[party];
  if (!candidate || !STATE_BY_ABBR[abbr]) return;
  const campaignView = {
    ...game,
    party,
    candidateId: candidate.candidateId,
    stances: candidate.stances,
    factions: candidate.factions,
  };
  const ownStopFatigue = Number(game.fatigue?.[party]?.[abbr]?.stop) || 0;
  const stateLifetimeFatigue = Number(game.totalFatigue?.[abbr]) || 0;
  const pov = party === 'rep' ? -1 : party === 'dem' ? 1 : 0;
  const damp = actionDamp(campaignView, abbr, 'visit');
  const size = rallyScale(abbr);
  const basePersuasion = party === 'dem' || party === 'rep'
    ? 0.25 * 1.5 * pov * damp * size
    : 0.25 * 1.5 * damp * size;
  const stopEffects = campaignStopEffects(ownStopFatigue, stateLifetimeFatigue, basePersuasion);
  const baseMultiplier = Number(visit.effectMultiplier) || 0.4;
  const effectMultiplier = baseMultiplier * build38Field(game, 'visit', abbr).rallyMultiplier;
  addTurnoutState(game, party, abbr, stopEffects.turnout * effectMultiplier);
  addPartyMomentum(game, party, stopEffects.momentum * effectMultiplier);
  if (visit.persuasionLanded) {
    const persuasion = scaleRegionalPersuasion(game, stopEffects.persuasion * effectMultiplier);
    if (party === 'dem' || party === 'rep') {
      game.stateMods[abbr] = (game.stateMods[abbr] || 0) + persuasion;
    } else {
      game.thirdMods = { ...(game.thirdMods || {}), [party]: { ...(game.thirdMods?.[party] || {}) } };
      game.thirdMods[party][abbr] = (game.thirdMods[party][abbr] || 0) + persuasion;
    }
  }
  addFatigue(game, party, abbr, 'stop', Number(visit.fatigueMultiplier) || baseMultiplier);
}

function applyBuild34SuperPacAds(game, ads, fatigueAggregates, candidates, stateRowsById) {
  const turnoutByStateParty = {};
  const realizedAds = [];
  for (const ad of ads || []) {
    const party = ad.alignment;
    const candidate = candidates[party];
    const row = stateRowsById[ad.stateId];
    if (!candidate || !row || !ISSUE_BY_ID[ad.issueId]) continue;
    const campaignView = {
      ...game,
      party,
      candidateId: candidate.candidateId,
      stances: candidate.stances,
      factions: candidate.factions,
    };
    const actionScale = actionDamp(campaignView, ad.stateId);
    const fatigueScale = campaignActionFatigueMultiplier(0, Number(game.totalFatigue?.[ad.stateId]) || 0);
    const baseEffect = adBaseStrength(campaignView, ad.stateId, ad.issueId, 'tv', ad.adType);
    const pressure = clamp(Number(ad.totalEffectivePressure) || 0, 0, SUPER_PAC_GROUP_PRESSURE_CAP);
    const dud = ad.meanQuality < 0.45;
    const magnitude = baseEffect * pressure * actionScale * fatigueScale * SUPER_PAC_EFFECT_MULTIPLIER;
    const signedEffect = dud ? -magnitude * 0.8 : magnitude;
    const otherParties = PARTY_ORDER.filter((other) => other !== party);
    const attackedParty = otherParties.sort((a, b) =>
      (Number(row.support?.[b]) || 0) - (Number(row.support?.[a]) || 0) || a.localeCompare(b))[0];
    const targetParty = otherParties.find((id) => candidates[id]?.candidateId === ad.targetCandidateId) || attackedParty;
    const recipientParty = ad.adType === 'attack' ? targetParty : party;
    const turnoutPoints = round1(Math.abs(signedEffect) * 2) *
      (ad.adType === 'attack' ? -Math.sign(signedEffect) : Math.sign(signedEffect));
    const stateEffects = turnoutByStateParty[ad.stateId] || (turnoutByStateParty[ad.stateId] = {});
    stateEffects[recipientParty] = (stateEffects[recipientParty] || 0) + turnoutPoints;
    realizedAds.push({
      ...ad,
      beneficiaryParty: party,
      targetParty: recipientParty,
      realizedEffect: round1(signedEffect) || 0,
      turnoutPoints: round1(turnoutPoints) || 0,
      generalFatigueApplied: Number(ad.totalGeneralFatiguePoints || 0),
      dud,
    });
  }
  Object.entries(turnoutByStateParty).forEach(([abbr, byParty]) => {
    Object.entries(byParty).forEach(([party, points]) => addTurnoutState(game, party, abbr, points));
  });
  const alignmentByPac = new Map(realizedAds.map((ad) => [ad.pacId, ad.beneficiaryParty]));
  for (const group of fatigueAggregates || []) {
    const party = alignmentByPac.get(group.pacId);
    if (party) addGeneralFatigue(game, party, group.stateId, group.totalGeneralFatiguePoints);
  }
  return realizedAds;
}

function applyBuild34EndorsementCommands(game, commands) {
  const next = game;
  const groupsById = Object.fromEntries(ENDORSER_ROSTER.map((group) => [group.id, group]));
  for (const command of commands || []) {
    if (command.type === 'turnout') {
      addTurnoutState(next, command.party || game.party, command.stateId, Number(command.points) || 0);
    } else if (command.type === 'national-momentum') {
      next.momentum = clampMomentum((next.momentum || 50) + (Number(command.amount) || 0));
    } else if (command.type === 'donation') {
      const amount = Math.max(0, Number(command.amountM) || 0);
      next.funds = round1((next.funds || 0) + amount);
    } else if (command.type === 'local-persuasion') {
      const group = groupsById[command.source];
      const demographicGroupId = endorserFactionGroupId(group);
      const amount = Math.max(0, Number(command.amount) || 0);
      if (game.party === 'dem' || game.party === 'rep') {
        const share = Number(STATE_DEMOGRAPHICS[command.stateId]?.share?.[demographicGroupId]) || 0;
        if (share > 0) {
          const byState = { ...(next.build34EndorsementGroupModsByState || {}) };
          byState[command.stateId] = { ...(byState[command.stateId] || {}) };
          const direction = game.party === 'rep' ? -1 : 1;
          byState[command.stateId][demographicGroupId] = (byState[command.stateId][demographicGroupId] || 0) + direction * amount * 100 / share;
          next.build34EndorsementGroupModsByState = byState;
        }
      } else if (['lib', 'grn'].includes(game.party)) {
        next.thirdMods = { ...(next.thirdMods || {}), [game.party]: { ...(next.thirdMods?.[game.party] || {}) } };
        next.thirdMods[game.party][command.stateId] = round1((next.thirdMods[game.party][command.stateId] || 0) + amount);
      }
    } else if (command.type === 'issue-ad-credit') {
      const issueId = command.credit?.issueId || null;
      const perks = next.campaignPerks || { freeAds: 0, freeAdIssues: [] };
      next.campaignPerks = {
        ...perks,
        freeAds: Math.max(0, Number(perks.freeAds) || 0) + 1,
        freeAdIssues: issueId ? [...(perks.freeAdIssues || []), issueId] : [...(perks.freeAdIssues || [])],
      };
      next.build34IssueAdCredits = [...(next.build34IssueAdCredits || []), command.credit];
    } else {
      throw new Error(`Unsupported Build 34 endorsement effect: ${command.type}`);
    }
  }
  return next;
}

function resolveBuild34Endorsements(game, next, week) {
  const weekKey = String(week);
  const prior = game.build34EndorsementReceiptsByWeek?.[weekKey];
  if (prior) return prior;
  const factionStandingById = factionStandings(next);
  const groups = ENDORSER_ROSTER.filter((group) => group.party === game.party);
  const benefitValuesByGroupId = Object.fromEntries(groups.map((group) => [
    group.id,
    endorsementBenefitValues(group, STATES, week),
  ]));
  const unavailablePersonIds = [game.candidateId, game.opponentId, game.runningMateId]
    .filter((id) => typeof id === 'string' && id.length > 0);
  Object.values(game.oppMates || {}).forEach((mate) => {
    if (mate?.mateId) unavailablePersonIds.push(mate.mateId);
  });
  const scheduled = resolveBackgroundEndorsementWeek({
    campaignId: game.build34CampaignId || `legacy:${game.candidateId}:${game.startId}`,
    candidateId: game.candidateId,
    party: game.party,
    week,
    totalWeeks: totalWeeksOf(game),
    lastEligibleWeek: Math.max(1, totalWeeksOf(game) - 1),
    groups,
    relationshipByGroupId: game.build34EndorserRelationships || {},
    factionStandingById,
    endorsementRegistry: game.build34EndorserRegistry || {},
    unavailablePersonIds,
    benefitValuesByGroupId,
    turnoutEarnedByState: game.build34EndorserTurnoutEarnedByState || {},
    persuasionEarnedByState: game.build34EndorserPersuasionEarnedByState || {},
    issueAdCredits: game.build34IssueAdCredits || [],
    appliedEndorsementIds: game.build34AppliedEndorsementIds || [],
    weeklyAnnouncementReceipts: {},
  });
  applyBuild34EndorsementCommands(next, scheduled.effectCommands);
  const proxyUnlocks = scheduled.proxyEndorsements.map(({ group, endorsement }) => unlockProxyFromEndorsement({
    endorsement,
    endorser: group,
    party: game.party,
    week,
    unavailablePersonIds,
  })).filter(Boolean);
  const knownProxyIds = new Set((next.build34ProxyCampaigners || []).map((proxy) => proxy.id));
  next.build34ProxyCampaigners = [
    ...(next.build34ProxyCampaigners || []),
    ...proxyUnlocks.filter((proxy) => !knownProxyIds.has(proxy.id)),
  ];
  next.build34EndorserRegistry = scheduled.endorsementRegistry;
  next.build34EndorserTurnoutEarnedByState = scheduled.turnoutEarnedByState;
  next.build34EndorserPersuasionEarnedByState = scheduled.persuasionEarnedByState;
  next.build34IssueAdCredits = scheduled.issueAdCredits;
  next.build34AppliedEndorsementIds = scheduled.appliedEndorsementIds;
  const receipt = {
    week,
    scheduledCount: scheduled.scheduledCount,
    eligibleGroupCount: scheduled.eligibleGroupCount,
    announcements: scheduled.announcements.map(({ group, record, commands }) => ({
      endorserId: group.id,
      name: group.name,
      level: group.level,
      state: group.state || null,
      factionId: group.factionId,
      fictionalComposite: group.fictionalComposite === true,
      activelyCampaigning: record.activelyCampaigning,
      proxyUnlocked: proxyUnlocks.some((proxy) => proxy.sourceEndorsementId === group.id),
      relationshipScore: record.relationshipScore,
      factionStanding: record.factionStanding,
      benefits: commands.map(({ type, amount, points, amountM, credit }) => ({
        type,
        amount: amount ?? points ?? amountM ?? null,
        issueId: credit?.issueId || null,
      })),
    })),
    effectCommands: scheduled.effectCommands,
    proxyUnlocks,
  };
  next.build34EndorsementReceiptsByWeek = {
    ...(game.build34EndorsementReceiptsByWeek || {}),
    [weekKey]: receipt,
  };
  if (receipt.announcements.length) {
    const names = receipt.announcements.map((announcement) => announcement.name).join(', ');
    next.weekLog = [...(next.weekLog || []), `${names} endorsed the campaign.`];
  }
  return receipt;
}

export function requestBuild34Endorsement(game, endorserId) {
  if (!MAIN_GAME_ENDORSEMENTS_ENABLED) return game;
  if (decisionPending(game) || actionsLeftIn(game) <= 0) return game;
  const group = ENDORSER_ROSTER.find((item) => item.id === endorserId);
  if (!group || group.party !== game.party) return game;
  const registry = game.build34EndorserRegistry || {};
  const relationships = {
    ...initialEndorserRelationships({
      party: game.party,
      stances: game.stances,
      factionStandings: factionStandings(game),
    }),
    ...(game.build34EndorserRelationships || {}),
  };
  const factionStanding = Number(factionStandings(game)[group.factionId]);
  const relationship = Number(relationships[group.id]);
  const unavailablePersonIds = [game.candidateId, game.opponentId, game.runningMateId].filter(Boolean);
  const initialEligibility = endorsementEligibility({
    group,
    candidateId: game.candidateId,
    relationshipScore: relationship,
    factionStanding,
    endorsementRegistry: registry,
    unavailablePersonIds,
    candidateParty: game.party,
  });
  if (initialEligibility.reason !== null && initialEligibility.reason !== 'relationship-threshold') return game;
  if (!initialEligibility.eligible && relationship < Number(group.endorsementThreshold) - 12) return game;

  const next = {
    ...game,
    actionsLeft: actionsLeftIn(game) - 1,
    build34EndorserRelationships: relationships,
    build34EndorserMemories: { ...(game.build34EndorserMemories || {}) },
    build34EndorserRegistry: { ...registry },
    build34EndorserTurnoutEarnedByState: { ...(game.build34EndorserTurnoutEarnedByState || {}) },
    build34EndorserPersuasionEarnedByState: { ...(game.build34EndorserPersuasionEarnedByState || {}) },
    build34IssueAdCredits: [...(game.build34IssueAdCredits || [])],
    build34AppliedEndorsementIds: [...(game.build34AppliedEndorsementIds || [])],
    build34EndorsementGroupModsByState: { ...(game.build34EndorsementGroupModsByState || {}) },
    campaignPerks: { ...(game.campaignPerks || {}), freeAdIssues: [...(game.campaignPerks?.freeAdIssues || [])] },
    stateMods: { ...(game.stateMods || {}) },
    weekLog: [...(game.weekLog || [])],
  };
  const outreach = applyBuild35Agenda(game, next, { actionId: 'endorsement', targetId: group.id }, {
    relationshipBefore: relationship, relationshipChange: initialEligibility.eligible ? 0 : 8,
  });
  const improvedRelationship = clamp(relationship + outreach.relationshipChange, 0, 100);
  next.build34EndorserRelationships[group.id] = improvedRelationship;
  if (improvedRelationship > relationship) {
    next.build34EndorserMemories[group.id] = [...(next.build34EndorserMemories[group.id] || []), {
      week: Number(game.week) + 1,
      type: 'outreach',
      reaction: 'meeting',
      relationshipChange: improvedRelationship - relationship,
    }].slice(-6);
  }

  const result = recordEndorsement({
    group,
    candidateId: game.candidateId,
    party: game.party,
    week: Number(game.week) + 1,
    relationshipScore: improvedRelationship,
    factionStanding,
    endorsementRegistry: next.build34EndorserRegistry,
    unavailablePersonIds,
    candidateParty: game.party,
  });
  if (result.eligible) {
    const benefit = buildEndorsementEffectCommands({
      group,
      candidateId: game.candidateId,
      campaignParty: game.party,
      benefitValues: endorsementBenefitValues(group, STATES, Number(game.week) + 1),
      turnoutEarnedByState: next.build34EndorserTurnoutEarnedByState,
      persuasionEarnedByState: next.build34EndorserPersuasionEarnedByState,
      issueAdCredits: next.build34IssueAdCredits,
      appliedEndorsementIds: next.build34AppliedEndorsementIds,
    });
    applyBuild34EndorsementCommands(next, benefit.commands);
    next.build34EndorserRegistry = { ...result.endorsementRegistry, [group.id]: { ...result.record, source: 'outreach' } };
    next.build34EndorserTurnoutEarnedByState = benefit.turnoutEarnedByState;
    next.build34EndorserPersuasionEarnedByState = benefit.persuasionEarnedByState;
    next.build34IssueAdCredits = benefit.issueAdCredits;
    next.build34AppliedEndorsementIds = benefit.appliedEndorsementIds;
    const proxyUnlock = unlockProxyFromEndorsement({
      endorsement: next.build34EndorserRegistry[group.id],
      endorser: group,
      party: game.party,
      week: Number(game.week) + 1,
      unavailablePersonIds,
    });
    if (proxyUnlock && !(next.build34ProxyCampaigners || []).some((proxy) => proxy.id === proxyUnlock.id)) {
      next.build34ProxyCampaigners = [...(next.build34ProxyCampaigners || []), proxyUnlock];
    }
    next.lastAction = `${group.name} endorsed the campaign after outreach${proxyUnlock ? '; a new surrogate will be available next week' : ''}.`;
  } else {
    next.lastAction = `${group.name} heard the campaign’s case; relationship improved to ${Math.round(improvedRelationship)}.`;
  }
  next.weekLog.push(next.lastAction);
  return next;
}

function applyBuild34OutsideCampaigns(game, next) {
  const week = Number(game.week) + 1;
  const weekKey = String(week);
  const campaignId = game.build34CampaignId || `legacy:${game.candidateId}:${game.startId}`;
  const stateRows = snapshot(next).rows;
  const stateRowsById = Object.fromEntries(stateRows.map((row) => [row.abbr, row]));
  const candidates = Object.fromEntries(PARTY_ORDER.map((party) => [party, campaignContextForParty(next, party)]));
  let proxyReceipt = game.build34ProxyReceiptsByWeek?.[weekKey] || null;
  let pacReceipt = game.build34SuperPacReceiptsByWeek?.[weekKey] || null;
  const proxyVisitsByPartyState = { ...(game.build34ProxyVisitsByPartyState || {}) };

  if (!proxyReceipt) {
    const proxies = game.build34ProxyCampaigners || PARTY_ORDER.map(startingProxyForParty).filter(Boolean);
    const visits = [];
    const unavailablePersonIds = new Set();
    PARTY_ORDER.forEach((party) => {
      const nominee = candidates[party]?.nominee;
      if (nominee?.id) unavailablePersonIds.add(nominee.id);
      const mateId = party === game.party ? game.runningMateId : game.oppMates?.[party]?.mateId;
      if (mateId) unavailablePersonIds.add(mateId);
    });
    PARTY_ORDER.forEach((party) => {
      const activeProxies = proxies.filter((proxy) => proxy.party === party);
      if (!activeProxies.length || !candidates[party]?.candidateId) return;
      const eligibleStates = stateRows.map((row) => ({
        id: row.abbr,
        region: STATE_BY_ABBR[row.abbr]?.region,
        marginToTarget: partyMarginByState(row)[party],
        issueFit: 0.5,
      }));
      const scheduled = scheduleProxyVisits({
        campaignId: `${campaignId}:${party}`,
        week,
        activeProxies,
        eligibleStates,
        priorStateVisits: proxyVisitsByPartyState[party] || {},
        unavailablePersonIds: [...unavailablePersonIds],
      });
      visits.push(...scheduled.visits);
      proxyVisitsByPartyState[party] = {
        ...(proxyVisitsByPartyState[party] || {}),
        ...scheduled.visits.reduce((counts, visit) => ({
          ...counts,
          [visit.stateId]: (counts[visit.stateId] || 0) + 1,
        }), {}),
      };
    });
    visits.forEach((visit) => applyBuild34ProxyVisit(next, visit, candidates));
    proxyReceipt = { week, visits };
  }

  if (!pacReceipt) {
    const pacStates = stateRows.map((row) => ({
      id: row.abbr,
      region: STATE_BY_ABBR[row.abbr]?.region,
      marginByParty: partyMarginByState(row),
      candidateIdByParty: Object.fromEntries(Object.entries(candidates).map(([party, candidate]) => [party, candidate.candidateId])),
      attackTargetPartyByParty: Object.fromEntries(PARTY_ORDER.map((party) => [party,
        PARTY_ORDER.filter((other) => other !== party).sort((a, b) =>
          (Number(row.support?.[b]) || 0) - (Number(row.support?.[a]) || 0) || a.localeCompare(b))[0],
      ])),
    }));
    const activePacs = pacCandidatesForWeek(next, candidates);
    const scheduled = resolveSuperPacWeek({
      campaignId,
      weekNumber: week,
      totalWeeks: totalWeeksOf(next),
      pacs: activePacs,
      states: pacStates,
    });
    const batch = build34CampaignEffectBatch({ campaignId, week, superPacAggregates: scheduled.aggregates });
    const groups = batch.commands.map(({ aggregate }) => aggregate);
    const aggregates = applyBuild34SuperPacAds(next, groups, scheduled.fatigueAggregates, candidates, stateRowsById);
    const digest = { ...scheduled.digest };
    Object.assign(digest, {
      activePacCount: activePacs.length,
      stateCount: Object.keys(scheduled.digest.byState || {}).length,
    });
    pacReceipt = {
      schemaVersion: scheduled.schemaVersion, campaignId, week, digest, aggregates,
      fatigueAggregates: scheduled.fatigueAggregates,
      appliedReceiptIds: aggregates.map((row) => row.effectReceiptId),
      effectsAlreadyApplied: true,
    };
  }

  const endorsementReceipt = MAIN_GAME_ENDORSEMENTS_ENABLED ? resolveBuild34Endorsements(game, next, week) : { announcements: [] };

  next.build34ProxyVisitsByPartyState = proxyVisitsByPartyState;
  next.build34ProxyReceiptsByWeek = { ...(game.build34ProxyReceiptsByWeek || {}), [weekKey]: proxyReceipt };
  next.build34SuperPacReceiptsByWeek = { ...(game.build34SuperPacReceiptsByWeek || {}), [weekKey]: pacReceipt };
  next.build34OutsideCampaignReceiptsByWeek = {
    ...(game.build34OutsideCampaignReceiptsByWeek || {}),
    [weekKey]: {
      week,
      proxyVisitCount: proxyReceipt.visits.length,
      superPacDigest: pacReceipt.digest,
      endorsementCount: endorsementReceipt.announcements.length,
    },
  };

  const playerAds = Number(pacReceipt.digest.byAlignment?.[game.party]) || 0;
  const opponentAds = Number(pacReceipt.digest.byAlignment?.[game.opponentParty]) || 0;
  const stateCount = Object.keys(pacReceipt.digest.byState || {}).length;
  const endorsementSummary = endorsementReceipt.announcements.length
    ? ` ${endorsementReceipt.announcements.length} organizations endorsed the campaign.`
    : '';
  const text = `Outside groups aired ${pacReceipt.digest.totalAds} issue ads across ${stateCount} states; ${proxyReceipt.visits.length} campaign surrogates also made stops.${endorsementSummary}`;
  next.lastOutside = {
    group: 'Outside groups',
    issueLabel: 'multiple policy issues',
    abbr: null,
    name: `${stateCount} states`,
    swing: pacReceipt.digest.totalAds,
    helpsYou: playerAds >= opponentAds,
    totalAds: pacReceipt.digest.totalAds,
    stateCount,
    text,
    digest: pacReceipt.digest,
    pacWeek: week,
    proxyVisits: proxyReceipt.visits,
    endorsements: endorsementReceipt.announcements,
  };
  return next;
}

// Every other ticket picks its running mate once the race is on: the same
// shortlist you work from, chosen by the party instead of by you. A state's
// electors get one vote, so nobody runs alongside a nominee from their own state.
export function chooseOpponentMates(game) {
  const out = {};
  const parties = game.build40?.openingModel ? scenarioPartyIds(game.build39?.scenario?.id).filter((party) => party !== 'ind') : PARTY_ORDER;
  parties.forEach((party) => {
    if (party === game.party) return;
    const nominee = nomineeOf(game, party);
    const pool = mateOptions(party, nominee?.id, game.build39?.scenario?.id).filter((m) => !sameStateTicket(m, nominee));
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    out[party] = {
      party,
      nomineeId: nominee?.id || null,
      nomineeShort: nominee?.short || PARTY_SHORT[party],
      mateId: pick.id,
      name: pick.name,
      short: pick.short,
      state: pick.state,
      stateAbbr: pick.stateAbbr,
      title: pick.title,
    };
  });
  return out;
}

// Every party on the ballot campaigns every week, not just the one you are
// running against: seven actions — five stops, one ad buy, one day of call time.
// Majors move the map's margin from their own side; third parties move their own
// share, and it gets harder the higher they climb.
function backgroundWeek(game, snap, party) {
  const diff = DIFFICULTIES[game.difficultyId];
  const nominee = nomineeOf(game, party);
  const third = isThirdParty(party);
  const rows = snap.rows.map((r) => ({
    abbr: r.abbr,
    name: r.name,
    share: r.shares[party] || 0,
    margin: r.margin,
  }));
  // A major hunts the closest states; a third party camps where it is already
  // strongest, because that is the only place anybody returns its calls.
  const plan = third ? thirdPartyCampaignPlan(game, rows, party) : null;
  const ranked = third
    ? plan.targets
    : rows.slice().sort((a, b) => Math.abs(a.margin) - Math.abs(b.margin));
  const targetPool = ranked.slice(0, plan?.focusCount || 6);

  const stateDeltas = {};
  const thirdDeltas = {};
  /** @type {Array<Record<string, any>>} */
  const moves = [];
  const fatigue = [];
  const sign = party === 'dem' ? 1 : -1;

  const thirdGain = (share) => round1(0.55 * Math.max(0.2, 1 - share / 25));
  const majorGain = round1(0.34 * diff.oppSkill);

  for (let i = 0; i < 5; i++) {
    const t = targetPool[Math.min(targetPool.length - 1, Math.floor(Math.pow(Math.random(), 1.2) * targetPool.length))];
    const fat = actionMultiplier(game, party, t.abbr, 'stop');
    if (third) {
      const gain = round1(thirdGain(t.share) * fat) + resolveRallyEffect().persuasionPoints;
      thirdDeltas[t.abbr] = (thirdDeltas[t.abbr] || 0) + gain;
      moves.push({ type: 'stop', abbr: t.abbr, text: `Rallied in ${t.name} (+${gain.toFixed(1)} there)` });
    } else {
      stateDeltas[t.abbr] = (stateDeltas[t.abbr] || 0) + sign * (majorGain * fat + resolveRallyEffect().persuasionPoints);
      moves.push({ type: 'stop', abbr: t.abbr, text: `Rallied in ${t.name}` });
    }
    fatigue.push({ party, abbr: t.abbr, type: 'stop', points: 1 });
  }

  const ad = ranked[0];
  const adFat = actionMultiplier(game, party, ad.abbr, 'ad');
  if (third) {
    const gain = round1(thirdGain(ad.share) * 2.4 * adFat);
    thirdDeltas[ad.abbr] = (thirdDeltas[ad.abbr] || 0) + gain;
    moves.push({ type: 'ad', abbr: ad.abbr, text: `Bought radio across ${ad.name} (+${gain.toFixed(1)})` });
  } else {
    stateDeltas[ad.abbr] = (stateDeltas[ad.abbr] || 0) + sign * majorGain * 2.4 * adFat;
    moves.push({ type: 'ad', abbr: ad.abbr, text: `Blanketed ${ad.name} with ads` });
  }
  fatigue.push({ party, abbr: ad.abbr, type: 'ad', points: 1 });
  moves.push({ type: 'funds', text: 'Spent the day dialling for dollars' });

  return {
    party,
    short: nominee?.short || PARTY_SHORT[party],
    name: nominee?.name || PARTY_SHORT[party],
    color: PARTY_COLOR[party],
    strategy: plan ? { label: plan.label, reason: plan.reason } : null,
    objective: plan?.objective || null,
    moves,
    stateDeltas,
    thirdDeltas,
    fatigue,
  };
}

function attachAIMediaBuy(moves, ads) {
  if (!ads?.buys?.length) return;
  const mediaAction = moves.find((move) => move.type === 'ad' || move.type === 'issue-ad');
  const report = adLine(ads.spend, ads.buys);
  if (!mediaAction) {
    moves.push({ type: 'ad', spend: ads.spend, text: report });
    return;
  }
  mediaAction.spend = (mediaAction.spend || 0) + ads.spend;
  mediaAction.mediaBuys = ads.buys;
  mediaAction.text = `${mediaAction.text}; ${report}`;
}

function applyRivalEvent(game, option) {
  const definition = DECISION_EVENTS_BY_ID[option.build40EventId];
  const choice = definition?.choices.find((entry) => entry.id === option.id);
  if (definition?.candidateId && candidateEventState(game.candidateEvents).resolvedKeys.includes(option.build40Context?.candidateEventKey)) return game;
  const result = choice ? applyBuild40Package(game, option.build40Context, choice) : null;
  if (!result) return game;
  if (definition.candidateId) {
    const context = option.build40Context;
    result.next.candidateEvents = recordCandidateEventResolved(game.candidateEvents, {
      key: context.candidateEventKey, candidateId: definition.candidateId, party: context.actingParty,
      eventId: definition.id, week: game.week,
    });
    result.next.build40.decisionReceipts = [...(game.build40?.decisionReceipts || []), {
      id: context.instanceId, eventId: definition.id, choiceId: choice.id,
      candidateId: definition.candidateId, actingParty: context.actingParty,
      week: game.week, stateId: context.stateId, neighborId: context.neighborId,
      effects: result.applied, scandal: result.scandal,
    }];
  }
  return result.next;
}

function applyRivalWeek(game, schedule, diff, style) {
  const skill = diff.oppSkill;
  const next = { ...game, stateMods: { ...game.stateMods } };
  const week = { ...schedule, moves: schedule.moves.map((move) => ({ ...move })) };
  if (week.budgetSpent > 0 || week.fundsRaised > 0) {
    next.aiFunds = {
      ...(next.aiFunds || {}),
      [game.opponentParty]: game.build38?.openingModel
        ? Math.round(100 * Math.max(0, (next.aiFunds?.[game.opponentParty] || 0) - week.budgetSpent + week.fundsRaised)) / 100
        : round1(Math.max(0, (next.aiFunds?.[game.opponentParty] || 0) - week.budgetSpent + week.fundsRaised)),
    };
  }
  if (week.fundsRaised > 0) {
    next.aiLastFundraiserWeek = game.week;
    next.aiFinanceLog = [...(game.aiFinanceLog || []), { week: game.week, party: game.opponentParty, kind: 'fundraiser', amount: week.fundsRaised }].slice(-40);
  }
  if (week.debatePrep > 0) {
    next.aiDebatePrep = Math.min(3, (game.aiDebatePrep || 0) + week.debatePrep);
  }
  const neglectedStateMove = week.moves
    .filter((move) => ['stop', 'ad', 'issue-ad'].includes(move.type) && STATE_BY_ABBR[move.abbr])
    .map((move) => ({
      move,
      playerAttention: Number(game.strategyProfile?.stateActions?.[move.abbr]) || 0,
      effectMagnitude: Math.abs(Number(week.deltas?.[move.abbr]) || 0),
    }))
    .find((entry) => entry.playerAttention < 0.15 && entry.effectMagnitude > 0);
  const neglectedStateReceipt = neglectedStateMove ? {
    type: neglectedStateMove.move.type,
    abbr: neglectedStateMove.move.abbr,
    stateName: neglectedStateMove.move.name || STATE_BY_ABBR[neglectedStateMove.move.abbr].name,
    moveText: neglectedStateMove.move.text || '',
    playerAttention: neglectedStateMove.playerAttention,
    effectMagnitude: round1(neglectedStateMove.effectMagnitude),
    effectApplied: true,
  } : null;
  (week.turnoutMoves || []).forEach((move) => addTurnoutState(next, game.opponentParty, move.abbr, move.points));
  if (week.groundPurchase) {
    const party = game.opponentParty;
    next.aiOps = { ...(next.aiOps || {}), [party]: {
      ...(next.aiOps?.[party] || {}), [week.groundPurchase.abbr]: week.groundPurchase.level,
    } };
  }
  const issueSignals = Object.entries(game.strategyProfile?.issueFocus || {}).sort((a, b) => b[1] - a[1]);
  const strongestMessage = issueSignals[0];
  const opponentResponse = [];
  if (strongestMessage && strongestMessage[1] >= 1.5) {
    const [issueId, strength] = strongestMessage;
    const counter = round1(Math.min(0.38, 0.1 + strength * 0.035) * skill * (style === 'policy' || style === 'counterpunch' ? 1.25 : 1));
    next.issueEdge = { ...(next.issueEdge || {}), [issueId]: clamp((next.issueEdge?.[issueId] || 0) - counter, -1, 1) };
    const issueLabel = ISSUE_BY_ID[issueId]?.label?.toLowerCase() || 'your central issue';
    opponentResponse.push(`${style === 'media' ? 'Countered your ad line' : style === 'policy' ? 'Challenged your policy case' : 'Started contesting your message'} on ${issueLabel}`);
    if (style === 'media') {
      next.momentum = clampMomentum(next.momentum - 0.35 * skill);
      next.oppMomentum = clampMomentum(next.oppMomentum + 0.35 * skill);
    }
  }
  if (week.issueAd) {
    const counter = round1(0.12 * skill * (style === 'media' || style === 'policy' ? 1.2 : 1));
    next.issueEdge = { ...(next.issueEdge || {}), [week.issueAd.issueId]: clamp((next.issueEdge?.[week.issueAd.issueId] || 0) - counter, -1, 1) };
    next.oppMomentum = clampMomentum(next.oppMomentum + 0.18 * skill);
  }
  Object.entries(week.deltas).forEach(([abbr, amt]) => {
    next.stateMods[abbr] = (next.stateMods[abbr] || 0) + (amt * (next.opponentParty === 'rep' ? -1 : 1) > 0 ? scaleRegionalPersuasion(next, Math.abs(amt)) * (next.opponentParty === 'rep' ? -1 : 1) : amt);
  });
  next.dbMods = { ...(game.dbMods || {}) };
  Object.entries(week.dbDeltas || {}).forEach(([abbr, amt]) => {
    next.dbMods[abbr] = (next.dbMods[abbr] || 0) + amt;
  });
  next.oppMomentum = clampMomentum(next.oppMomentum + week.momentum);
  next.momentum = clampMomentum(next.momentum + week.myMomentum);
  (week.fatigue || []).forEach((f) => addFatigue(next, f.party, f.abbr, f.type, f.points));
  if (week.fatigueRecovery) {
    const { abbr, type, amount } = week.fatigueRecovery;
    const partyFatigue = { ...(next.fatigue?.[game.opponentParty] || {}) };
    const stateFatigue = { ...(partyFatigue[abbr] || {}) };
    stateFatigue[type] = Math.max(0, (stateFatigue[type] || 0) - amount);
    partyFatigue[abbr] = stateFatigue;
    next.fatigue = { ...(next.fatigue || {}), [game.opponentParty]: partyFatigue };
  }
  next.stateGeneric = { ...(next.stateGeneric || {}) };
  Object.entries(week.genericDeltas || {}).forEach(([abbr, amount]) => addGeneric(next, abbr, amount, { source: 'presidential' }));

  // A changed position makes an earlier promise a live attack line. The rival
  // spends one action on it each week until voters have heard the counterstory.
  let promiseAttack = null;
  const brokenPromise = (game.promiseLedger || []).find((promise) => promise.broken && promise.exploitedWeek == null);
  if (brokenPromise) {
    const rivalPov = game.party === 'rep' ? 1 : -1;
    const hit = round1(0.24 * skill);
    const attackAbbr = STATE_BY_ABBR[brokenPromise.abbr]
      ? brokenPromise.abbr
      : week.moves.find((move) => move.type === 'stop' && STATE_BY_ABBR[move.abbr])?.abbr;
    const issue = ISSUE_BY_ID[brokenPromise.issueId];
    const oldPosition = issue ? stanceLabel(issue, brokenPromise.stance) : null;
    const currentPosition = issue ? stanceLabel(issue, game.stances?.[brokenPromise.issueId] ?? 1) : null;
    if (attackAbbr) next.stateMods[attackAbbr] = (next.stateMods[attackAbbr] || 0) + rivalPov * scaleRegionalPersuasion(next, hit);
    next.momentum = clampMomentum(next.momentum - 0.55 * skill);
    next.oppMomentum = clampMomentum(next.oppMomentum + 0.35 * skill);
    const targetName = STATE_BY_ABBR[attackAbbr]?.name || 'a competitive state';
    const promiseText = brokenPromise.text || (issue && oldPosition ? `${issue.label}: “${oldPosition}”` : null);
    opponentResponse.push(`Used your broken ${issue?.label?.toLowerCase() || 'policy'} promise against you in ${targetName}`);
    next.promiseLedger = (game.promiseLedger || []).map((promise) => promise.id === brokenPromise.id ? { ...promise, exploitedWeek: game.week } : promise);
    promiseAttack = {
      promiseLedgerId: brokenPromise.id,
      issueId: brokenPromise.issueId,
      issueLabel: issue?.label || 'policy',
      abbr: attackAbbr || null,
      stateName: STATE_BY_ABBR[attackAbbr]?.name || null,
      pledgedPosition: promiseText,
      currentPosition: currentPosition ? `${issue.label}: “${currentPosition}”` : null,
      attackText: opponentResponse.at(-1),
      broken: true,
      exploitedWeek: game.week,
      stateHit: attackAbbr ? hit : 0,
      effectApplied: true,
    };
  }
  if (opponentResponse.length) {
    const attack = week.moves.find((move) => move.type === 'attack');
    if (attack) attack.text = opponentResponse.join('; ');
  }
  return { game: next, week, promiseAttack, neglectedStateReceipt };
}

export function opponentTurn(game) {
  if (!isTraditionalStaffingReady(game.staffing)) return game;
  if (game.finished || game.build341RivalResolvedWeek === game.week) return game;
  const diff = DIFFICULTIES[game.difficultyId];
  const style = OPPONENT_STYLES[game.opponentId] || 'adaptive';
  const { game: next, event, choice, week, promiseAttack, neglectedStateReceipt, forecastPlan } = resolveRivalForecastTurn(game, {
    drawEvent: (state) => {
      const random = createSeededRandom([state.build34CampaignId, 'rival-decision', state.week].join(':'));
      const { event } = nextEventFor(state, { random, actingParty: state.opponentParty, onlyDraw: true });
      return event ? { ...event, choices: event.choices.filter((option) => !option.unavailable).map((option) => ({ ...option, build40Context: event.context, build40EventId: event.id })) } : null;
    },
    applyEvent: applyRivalEvent,
    buildSchedules: (state, randoms) => {
      const targets = opponentTargets(state, diff, style);
      const board = snapshot(state).rows;
      return randoms.map((random) => opponentWeek(state, diff, style, targets, board, random));
    },
    applySchedule: (state, schedule) => applyRivalWeek(state, schedule, diff, style),
    actionSlots: ACTIONS_PER_WEEK,
  });

  // Outside activity is scheduled by the versioned Build 34 PAC and proxy catalogs.
  applyBuild34OutsideCampaigns(game, next);

  // And their own money, spent on airtime where the map says it belongs.
  const oppAds = aiAdWeek(next, game.opponentParty, (abbr) => pollMargin(abbr, next), {
    reserveBias: OPPONENT_RESERVE_BIASES[style] || 1,
    adjustQualityRoll: (roll) => build35QualityRoll(game, next, 'ad', roll, 'rival'),
  });
  attachAIMediaBuy(week.moves, oppAds);
  next.oppMoves = week.moves;

  if (game.simulateElection) {
    const ownWeek = backgroundWeek(next, snapshot(next), game.party);
    Object.entries(ownWeek.stateDeltas || {}).forEach(([abbr, amount]) => {
      next.stateMods[abbr] = (next.stateMods[abbr] || 0) + amount;
    });
    const ownThird = next.thirdMods?.[game.party];
    if (ownThird) {
      next.thirdMods = { ...next.thirdMods, [game.party]: { ...ownThird } };
      Object.entries(ownWeek.thirdDeltas || {}).forEach(([abbr, amount]) => {
        next.thirdMods[game.party][abbr] = (next.thirdMods[game.party][abbr] || 0) + amount;
      });
    }
    (ownWeek.fatigue || []).forEach((f) => addFatigue(next, f.party, f.abbr, f.type, f.points));
    next.simulationMoves = ownWeek.moves;
  }

  // The campaign you are running against files its own seven-action week.
  const oppNominee = CANDIDATE_BY_ID[game.opponentId] || null;
  next.oppRival = {
    party: game.opponentParty,
    short: oppNominee?.short || PARTY_SHORT[game.opponentParty] || 'Rival',
    name: oppNominee?.name || PARTY_SHORT[game.opponentParty] || 'Rival',
    color: PARTY_COLOR[game.opponentParty] || '#F2603C',
    main: true,
    strategy: week.strategy,
    moves: week.moves,
  };

  const previouslyLoggedRivalStories = new Set((game.incidentLedger || []).map((receipt) => (receipt.payload?.rivalNewsIncident?.storyId || receipt.payload?.rivalNewsIncident?.id)).filter(Boolean));
  const availableRivalStories = RIVAL_INCIDENT_NEWS.filter((story) => !previouslyLoggedRivalStories.has(story.id));
  const eligibleRivalStories = game.opponentParty === 'rep' ? availableRivalStories : availableRivalStories.filter(({ claim }) => claim);
  const publicMistake = event && eligibleRivalStories.length && Math.random() < (game.opponentParty === 'rep' ? 0.2 : 0.04)
    ? eligibleRivalStories[Math.floor(Math.random() * eligibleRivalStories.length)]
    : null;
  const rivalNewsIncident = publicMistake ? {
    ...publicMistake,
    storyId: publicMistake.id,
    speaker: oppNominee?.name || 'The Republican nominee',
    eventId: event.id,
    eventTitle: event.title,
    choice: choice?.label || null,
    week: game.week,
  } : null;
  next.lastOpponent = {
    eventTitle: event?.title || null,
    icon: event?.icon || null,
    choice: choice?.label || null,
    contextWhy: event?.contextWhy || null,
    forecastPlan,
    rivalNewsIncident,
    promiseAttack,
    neglectedStateMove: null,
    fundsRaised: week.fundsRaised || 0,
    genericDeltas: { ...(week.genericDeltas || {}) },
    actionMix: week.moves.map((move) => move.type),
  };
  next.usedEvents = event ? [...(game.usedEvents || []), event.id] : (game.usedEvents || []);

  // The other two parties get their week as well — everyone on the ballot is
  // campaigning, and everything they do is filed in the log.
  const snap = snapshot(next);
  const rivals = PARTY_ORDER.filter((p) => p !== game.party && p !== game.opponentParty).map((p) =>
    backgroundWeek(next, snap, p)
  );
  next.thirdMods = Object.fromEntries(Object.entries(next.thirdMods || {}).map(([party, states]) => [party, { ...states }]));
  rivals.forEach((r) => {
    Object.entries(r.stateDeltas || {}).forEach(([abbr, amt]) => {
      next.stateMods[abbr] = (next.stateMods[abbr] || 0) + (amt * (next.opponentParty === 'rep' ? -1 : 1) > 0 ? scaleRegionalPersuasion(next, Math.abs(amt)) * (next.opponentParty === 'rep' ? -1 : 1) : amt);
    });
    const map = next.thirdMods[r.party];
    if (map) {
      Object.entries(r.thirdDeltas || {}).forEach(([abbr, amt]) => {
        map[abbr] = (map[abbr] || 0) + amt;
      });
    }
    (r.fatigue || []).forEach((f) => addFatigue(next, f.party, f.abbr, f.type, f.points));
    // A major party in here is a party the player is not running: it has its own
    // war chest and buys its own airtime, exactly as the opponent does.
    const ads = aiAdWeek(next, r.party, (abbr) => pollMargin(abbr, next));
    attachAIMediaBuy(r.moves, ads);
  });
  next.rivals = rivals.map(({ stateDeltas, thirdDeltas, fatigue, ...rest }) => rest);
  if (next.build39?.scenario?.id && next.build39.scenario.id !== 'standard') {
    const { moves, ...updates } = resolveScenarioRivals({ game: next, rows: snap.rows });
    next.build39 = { ...next.build39, scenario: { ...next.build39.scenario, ...updates } };
    for (const party of new Set(moves.map((move) => move.party))) {
      next.rivals.push({ party, moves: moves.filter((move) => move.party === party) });
    }
  }
  if (neglectedStateReceipt && game.week < totalWeeksOf(game) - 1) {
    const sourceMargin = playerStateMargin(next, neglectedStateReceipt.abbr);
    next.lastOpponent = { ...next.lastOpponent, neglectedStateMove: { ...neglectedStateReceipt, sourceMargin } };
  }
  next.build341RivalResolvedWeek = game.week;
  return next;
}

// ---------------------------------------------------------------------------
// Debates: three nights, three questions each. Every answer moves the room, and
// the risky ones can follow you for a week.
// ---------------------------------------------------------------------------

// What each banked prep session is worth on the night.
export function prepAnswerBonus(prep = 0) {
  return Math.round(Math.max(0, Math.min(3, prep)) * 0.35 * 100) / 100;
}

export function prepGaffeScale(prep = 0) {
  return Math.max(0.55, 1 - Math.max(0, Math.min(3, prep)) * 0.15);
}

function build40DebateFactionResponse(game, party, answer, groupShifts) {
  const groups = factionsFor(party);
  const moderate = groups.find(({ id }) => id === 'suburbs' || id === 'business' || id === 'officials');
  const activists = groups.find(({ role }) => role === 'activists');
  if (!moderate || !activists) return null;
  const standings = { ...factionStandings(game) };
  const approves = (groupShifts.moderate || 0) > 0;
  const disputes = /defend the full|name the suspected actor/i.test(answer.label);
  if (!approves && !disputes) return null;
  const lead = approves ? moderate : activists;
  const dissent = approves ? activists : moderate;
  standings[lead.id] = clamp((standings[lead.id] ?? 50) + 1, 0, 100);
  standings[dissent.id] = clamp((standings[dissent.id] ?? 50) - 0.5, 0, 100);
  const groupId = party === 'rep' ? 'populistright' : 'far left';
  const groupResponses = approves && disputes ? { [groupId]: -0.5 } : {};
  if (Object.keys(groupResponses).length) applyPlayerShifts(game, groupResponses);
  return { standings, groupResponses };
}

const debateIssueIds = {
  'debate1-q1': 'economy', 'debate1-q3': 'economy', 'debate2-q1': 'immigration',
  'debate2-q2': 'iran', 'debate3-q1': 'economy', 'debate3-q2': 'energy',
};

function build40DebateDefinition(game, debateId, actingParty = game.party) {
  const base = DEBATE_BY_ID[debateId];
  if (!base) return null;
  return { ...base, questions: base.questions.map((question, index) => {
    const definition = BUILD40_EVENTS_BY_ID[debateId + '-q' + (index + 1)];
    if (!definition) return question;
    const context = build40DecisionContext(game, definition, null, actingParty);
    const funds = actingParty === game.party ? game.funds : game.aiFunds?.[actingParty] || 0;
    const event = build40DecisionView(game, definition, context, funds);
    return { ...question, q: definition.flavor, answers: event.choices.map((choice) => ({
      ...choice, reply: choice.label, detail: choice.detail || '',
    })) };
  }) };
}

export function debateDefinition(game) {
  return build40DebateDefinition(game, game.debate?.id);
}

export function answerDebate(game, requested) {
  if (decisionPending(game)) return game;
  const state = game.debate;
  const def = debateDefinition(game);
  if (!def || !state || state.done || !requested) return game;
  const question = def.questions[state.step];
  const answer = question?.answers.find((choice) => requested.id ? choice.id === requested.id : choice.label === requested.label);
  const id = def.id + '-q' + (state.step + 1);
  const definition = BUILD40_EVENTS_BY_ID[id];
  const choice = definition?.choices.find((item) => item.id === answer?.id);
  if (!answer || !choice) return game;
  const prep = game.debatePrep || 0;
  const prepBonus = prepAnswerBonus(prep);
  const context = build40DecisionContext(game, definition, null);
  const resolved = applyBuild40Package(game, context, choice, prepGaffeScale(prep));
  if (!resolved) return game;
  const { next, scandal } = resolved;
  next.momentum = clampMomentum(next.momentum + prepBonus);
  const groupShifts = Object.fromEntries(COALITION_GROUPS.map(({ id }) => [id, (next.demographicMods?.[id] || 0) - (game.demographicMods?.[id] || 0)])
    .filter(([, amount]) => amount).map(([id, amount]) => [id, game.party === 'rep' ? -amount : amount]));
  const rivalAnswer = build40DebateDefinition(game, def.id, game.opponentParty)?.questions[state.step]?.answers
    .filter((option) => !option.unavailable).sort((a, b) => b.build40Score - a.build40Score)[0];
  const rivalContext = build40DecisionContext(game, definition, null, game.opponentParty);
  const rivalChoice = definition.choices.find((option) => option.id === rivalAnswer?.id);
  const rivalResult = rivalChoice ? applyBuild40Package(next, rivalContext, rivalChoice, prepGaffeScale(game.aiDebatePrep)) : null;
  if (rivalResult) Object.assign(next, rivalResult.next);
  const factualCorrection = {
    'debate1-q2': { claim: 'The trade group made no contribution.', correction: 'The disclosed grocery trade-group contribution appears in the public filing.' },
    'debate2-q3': { claim: 'The procurement records agree.', correction: 'The public audit identifies a discrepancy.' },
    'debate3-q3': { claim: 'An outside group paid for the ad.', correction: 'The campaign expenditure appears in the public filing.' },
  }[id] || null;
  const issueId = debateIssueIds[id];
  const promised = /timetable|keep its pledge|funded portion/i.test(answer.label) && ISSUE_BY_ID[issueId];
  const recordedReply = answer.reply;
  const briefingEvidence = build40DebateEvidence(game, id, choice.id);
  const forumResponse = build40DebateFactionResponse(next, game.party, answer, groupShifts);
  if (forumResponse) {
    next.factions = forumResponse.standings;
    for (const [groupId, amount] of Object.entries(forumResponse.groupResponses)) groupShifts[groupId] = (Number(groupShifts[groupId]) || 0) + amount;
  }
  const snapGain = (result, party) => round1((result?.applied || []).filter((effect) => effect.kind === 'persuasion')
    .reduce((sum, effect) => sum + (effect.party === party ? effect.amount : -effect.amount), 0));
  const exchangeScore = (result, party) => round1((result?.score || 0) + 3 * snapGain(result, party));
  const answerScore = round1(exchangeScore(resolved, game.party) + prepBonus);
  const evasive = /return to policy|let the moderator/i.test(answer.label);
  const clip = answerScore >= 3 || (evasive && factualCorrection) ? { status: 'widely-shared', minimumMomentum: 3 } : null;
  const promise = promised
    ? {
        id: `${game.week}-debate-${state.picks.length}-${def.id}-${issueId}`,
        week: game.week,
        abbr: null,
        issueId,
        stance: game.stances?.[issueId] ?? null,
        broken: false,
        exploitedWeek: null,
        source: 'debate-answer',
        text: recordedReply,
        answer: answer.label,
      }
    : null;
  if (promise) next.promiseLedger = [...(game.promiseLedger || []), promise];
  const picks = [
    ...state.picks,
    {
      label: answer.label,
      ...briefingEvidence,
      tag: answer.tag,
      question: question.q,
      reply: recordedReply,
      rivalAnswer: rivalAnswer ? { text: rivalAnswer.reply, ...factualCorrection, score: exchangeScore(rivalResult, game.opponentParty),
        snapPollGain: snapGain(rivalResult, game.opponentParty) } : null,
      ticketReadinessQuestion: def.id === 'debate2' && state.step === 0 ? { text: 'What would your running mate handle if your ticket took office?' } : null,
      mom: answerScore,
      prep: prepBonus,
      scandal,
      evasive,
      clip,
      promise,
      groupShifts: Object.keys(groupShifts).length ? { ...groupShifts } : null,
    },
  ];
  const done = picks.length >= def.questions.length;
  let verdict = null;

  if (done) {
    const diff = DIFFICULTIES[game.difficultyId];
    next.oppMomentum = clampMomentum(next.oppMomentum + round1(1.6 * diff.oppSkill));
    const score = picks.reduce((sum, p) => sum + p.mom - Math.max(0, (p.rivalAnswer?.score || 0) * 0.35), 0);
    if (score >= 8) {
      verdict = {
        tier: 'win',
        score,
        label: 'You won the night',
        text: 'Three answers, three clean hits. Their campaign is still explaining the second one.',
      };
    } else if (score >= 4) {
      verdict = {
        tier: 'edge',
        score,
        label: 'You won it on points',
        text: 'No knockout, but the snap polls moved your way and the clips are yours.',
      };
    } else if (score >= 0) {
      verdict = {
        tier: 'draw',
        score,
        label: 'A wash',
        text: 'Both campaigns declared victory. Neither clip will survive the week.',
      };
    } else {
      verdict = {
        tier: 'loss',
        score,
        label: 'A long night',
        text: 'They got the moment, you got the follow-up questions. The map barely moved — the wrong way.',
      };
    }
  }

  next.debate = { ...state, step: state.step + 1, picks, done, verdict };
  // Prep is spent on the night it was saved for.
  if (done) {
    next.debatePrep = 0;
    const rivalPrep = Math.max(0, Number(game.aiDebatePrep) || 0);
    if (rivalPrep) next.oppMomentum = clampMomentum(next.oppMomentum + 0.18 * rivalPrep);
    next.aiDebatePrep = 0;
    next.build40 = { ...next.build40, completedDebateIds: [...new Set([...(game.build40?.completedDebateIds || []), def.id])] };
  }
  return recordIncident(game, next, { type: 'debate' });
}

// ---------------------------------------------------------------------------
// Money: donations arrive every week, field operations cost every week.
// ---------------------------------------------------------------------------

export function opsTotals(game) {
  let levels = 0;
  let weekly = 0;
  Object.entries(game.ops || {}).forEach(([abbr, lvl]) => {
    levels += lvl;
    weekly += groundWeeklyCost(abbr, lvl);
  });
  weekly += Object.values(game.build34ExtraWeeklyUpkeepByState || {})
    .reduce((sum, amount) => sum + Math.max(0, Number(amount) || 0), 0);
  return { levels, weekly };
}

export function incomeFor(game) {
  const { levels } = opsTotals(game);
  // The donor list and the field operation bring the money in. The mood does not:
  // momentum's only business is voters.
  const weeklyBase = Number.isFinite(game.weeklyBaseIncomeDraw)
    ? game.weeklyBaseIncomeDraw
    : weeklyBaseIncomeM(nationalShares(game)[game.party]);
  const raw = (weeklyBase + levels * 0.55) * (game?.difficultyId === 'medium' ? 0.55 : 1);
  return Math.max(2, round1(raw));
}

export function expensesFor(game) {
  return round1(1.8 + opsTotals(game).weekly) + staffWeeklyUpkeep().totalM;
}

export function advanceWeek(game) {
  if (game.finished || !isTraditionalStaffingReady(game.staffing)) return game;
  game = advanceDecisionEvent(game);
  if (decisionPending(game)) return game;
  const diff = DIFFICULTIES[game.difficultyId];
  // The drag settles first, before a single average is recalculated.
  const drag = baselineDrag(game);
  const next = {
    ...game,
    ...drag,
    stateMods: { ...game.stateMods },
    turnout: { ...game.turnout },
    ops: { ...game.ops },
  };

  // A field office earns persuasion only after a complete campaign week. The
  // receipt key prevents save/reload or repeated resolution from awarding it twice.
  const completedGroundWeek = Number(game.week) + 1;
  const groundResolution = resolveGroundGameWeek({
    accumulatedByState: game.groundGameAccumulatedByState || {},
    resolvedWeeks: game.groundGameResolvedWeeks || [],
    week: completedGroundWeek,
    activeLevelsByState: game.ops || {},
  });
  next.groundGameAccumulatedByState = groundResolution.accumulatedByState;
  next.groundGameResolvedWeeks = groundResolution.resolvedWeeks;
  if (groundResolution.applied) {
    const playerMarginSign = game.party === 'rep' ? -1 : game.party === 'dem' ? 1 : 0;
    Object.entries(groundResolution.accumulatedByState).forEach(([abbr, margin]) => {
      const prior = Number(game.groundGameAccumulatedByState?.[abbr]) || 0;
      const delta = round1(Math.max(0, Number(margin) - prior));
      if (!delta) return;
      if (playerMarginSign) {
        next.stateMods[abbr] = round1((next.stateMods[abbr] || 0) + playerMarginSign * scaleRegionalPersuasion(next, delta));
      } else if (['lib', 'grn'].includes(game.party)) {
        next.thirdMods = { ...(next.thirdMods || {}), [game.party]: { ...(next.thirdMods?.[game.party] || {}) } };
        applyMinorPartyPersuasion(next, game.party, abbr, delta);
      }
    });
  }

  // Momentum's whole job, in order: pull turnout up where the campaign is hotter
  // than its own people, sag it where they are already certain to vote, then move
  // voters party against party. The drift toward the middle comes after both.
  applyMomentumTurnout(next);
  applyMomentumVotes(next);
  decayMomentum(next, diff.decay);

  // Every state's own environment settles a little, and the national environment
  // is whatever the states add up to: when fifty state environments move, the
  // country moves with them.
  next.baseStateGeneric = decayGeneric(game);
  recomputeEffectiveGeneric(next);
  // R19: Apply gradual presidential coattails once per week starting at Week 2 (completed week >= 1).
  const nextWeekNum = (game.week || 0) + 1;
  if (nextWeekNum >= 1 && !isRegionalEnvironmentIgnored(next) && ['dem', 'rep'].includes(next.party)) {
    const gapByState = {};
    STATES.forEach((s) => {
      gapByState[s.abbr] =
        candidateMods(s.abbr, next) +
        policyMargin(s.abbr, next) +
        (next.track || 0) +
        (next.stateMods?.[s.abbr] || 0) +
        demographicShift(s.abbr, next) +
        (next.dragMods?.[s.abbr] || 0);
    });
    applyWeeklyPresidentialCoattails(next, { weekNumber: nextWeekNum, gapByState });
  }
  const genericNow = genericAverage(next);
  const priorGenericBaseline = Number.isFinite(game.genericBaseline) ? game.genericBaseline : (game.natGeneric || 0);
  const genericPull = isRegionalEnvironmentIgnored(next) ? 0 : (genericNow - priorGenericBaseline) * 0.5;
  next.genericBaseline = genericNow;
  next.natGeneric = genericNow;
  next.track = isRegionalEnvironmentIgnored(next)
    ? 0
    : round1(Math.max(-14, Math.min(14, (game.track || 0) * 0.9 + gauss() * 0.3 + genericPull)));

  // Drift: on the harder difficulties the map slides toward your opponent a
  // little every week, and faster in the states that will decide the election.
  const drift = isRegionalEnvironmentIgnored(next) ? 0 : (diff.drift || 0);
  if (drift) {
    const pov = game.party === 'rep' ? -1 : 1;
    STATES.forEach((s) => {
      const swing = Math.abs(pollMargin(s.abbr, next)) <= DRIFT_SWING_MARGIN;
      const amount = drift + (swing ? diff.swingDrift || 0 : 0);
      next.stateMods[s.abbr] = (next.stateMods[s.abbr] || 0) - amount * pov;
    });
  }

  // A week passes and every state forgets a little: one point of each kind burns
  // off, in every state, for every party.
  next.fatigue = decayFatigue(next.fatigue);
  next.fundraisingFatigue = decayAllFundraisingFatigue(game.fundraisingFatigue || {});
  // The press shop gets its budget back every week.
  next.spins = {};

  // The news cycle files its own week: every story pays out where it lives, then
  // fades, sometimes turns, and sometimes crosses a state line.
  next.stories = (game.stories || []).map((s) => ({ ...s }));

  // Their week, and the world's, make news too — the cycle does not stop when
  // the player stops campaigning.
  const oppStop = (game.oppMoves || []).find((m) => m.type === 'stop' && m.abbr);
  if (oppStop) opponentStory(next, oppStop.abbr);
  if (Math.random() < 0.5) {
    const pool = closestStates(game, 5).map((s) => s.abbr);
    ambientStory(next, pool[Math.floor(Math.random() * pool.length)]);
  }
  // A third party makes political news the moment the country starts covering
  // it — five percent is the threshold, and not a vote before.
  const shares = nationalShares(game);
  (game.rivals || []).forEach((r) => {
    if (r.party === 'dem' || r.party === 'rep') return;
    if ((shares[r.party] || 0) < 5) return;
    const stop = (r.moves || []).find((m) => m.type === 'stop' && m.abbr);
    if (stop) thirdPartyStory(next, stop.abbr, r.short);
  });

  advanceNews(next);

  // Field operations keep working: persuasion, with diminishing returns.
  const pov = game.party === 'rep' ? -1 : 1;
  Object.entries(game.ops || {}).forEach(([abbr, lvl]) => {
    const drag = Math.max(0.3, 1 - Math.abs(next.stateMods[abbr] || 0) / 14);
    const base = 0.11 * lvl * drag * pov * actionDamp(game, abbr, 'ops') * build38Field(game, 'ground-weekly', abbr).fieldMultiplier;
    const actual = base * momentumPersuasionFactor(next);
    applyMomentumPersuasion(next, { [abbr]: { base, actual } });
  });

  const income = incomeFor(next);
  const expenses = expensesFor(next);
  // The party's own factions collect their debts every week: the donor network
  // decides what the money is worth, the officials what the mood is worth, and a
  // wing that has been left restless quietly takes votes with it.
  const fx = factionEffects(next);
  next.momentum = clampMomentum(next.momentum + fx.momentumDrift);
  if (fx.defection > 0) {
    STATES.forEach((s) => {
      next.stateMods[s.abbr] = (next.stateMods[s.abbr] || 0) - fx.defection * pov;
    });
  }
  const incomeBonus = game.incomeBoost?.weeks > 0 ? Math.max(0, Math.min(4, Number(game.incomeBoost.amount) || 0)) : 0;
  const realizedIncome = round1(income * fx.incomeMul + incomeBonus);
  next.finance = {
    week: game.week,
    baseIncome: Number.isFinite(game.weeklyBaseIncomeDraw)
      ? game.weeklyBaseIncomeDraw
      : weeklyBaseIncomeM(nationalShares(game)[game.party]),
    income: realizedIncome,
    incomeBonus,
    donorMultiplier: fx.incomeMul,
    staffUpkeep: 0,
    expenses,
  };
  next.incomeBoost = incomeBonus > 0
    ? { amount: incomeBonus, weeks: Math.max(0, Math.floor(game.incomeBoost.weeks) - 1) }
    : null;
  next.funds = Math.max(0, Math.round((game.funds + realizedIncome - expenses) * 100) / 100);
  fileBuild35StaffDebrief(game, next);
  const aiFunds = { ...(next.aiFunds || {}) };
  const aiIncome = {};
  PARTY_ORDER.forEach((aiParty) => {
    if (aiParty === game.party || aiFunds[aiParty] == null) return;
    const baseIncome = Number.isFinite(game.weeklyAIIncomeDraws?.[aiParty])
      ? game.weeklyAIIncomeDraws[aiParty]
      : weeklyBaseIncomeM(nationalShares(game)[aiParty]);
    const donorStanding = next.aiFactions?.[aiParty]?.donors ?? 50;
    const donorMultiplier = donorIncomeMultiplier(donorStanding);
    const fieldIncome = round1(Object.values(next.aiOps?.[aiParty] || {}).reduce((sum, level) => sum + Math.max(0, Number(level) || 0) * 0.55, 0));
    const realized = round1((baseIncome + fieldIncome) * donorMultiplier);
    const upkeep = round1(1.8 + Object.entries(next.aiOps?.[aiParty] || {}).reduce((sum, [abbr, level]) => sum + groundWeeklyCost(abbr, level), 0));
    const net = round1(realized - upkeep);
    aiFunds[aiParty] = Math.max(0, round1(aiFunds[aiParty] + net));
    aiIncome[aiParty] = { baseIncome, fieldIncome, donorMultiplier, income: realized, expenses: upkeep, net };
  });
  next.aiFunds = aiFunds;
  next.aiIncome = aiIncome;
  const factionBeforeDecay = factionStandings(next);
  const decayedFactions = decayFactions(factionBeforeDecay);
  Object.keys(next.factionCrises || {}).forEach((id) => {
    if ((factionBeforeDecay[id] ?? 50) < 20) decayedFactions[id] = factionBeforeDecay[id];
  });
  next.factions = decayedFactions;
  next.factionCrises = repairedFactionCrises(next);

  // File the week: both campaigns, the map as it stood, and the Senate count.
  const weekSnap = snapshot(game);
  const weekEvent = game.currentEventData;
  const weekSenate = senateSnapshot(game);
  next.history = [
    ...(game.history || []),
    {
      week: game.week,
      eventTitle: weekEvent ? weekEvent.title : null,
      decisions: game.weekEventResults || [],
      decisionEventShortfall: game.eventScheduleShortfall || 0,
      eventIcon: weekEvent ? weekEvent.icon : null,
      choice: game.outcome ? game.outcome.label : null,
      actions: (game.weekLog || []).slice(),
      opp: game.lastOpponent
        ? {
            eventTitle: game.lastOpponent.eventTitle,
            icon: game.lastOpponent.icon,
            choice: game.lastOpponent.choice,
            contextWhy: game.lastOpponent.contextWhy || null,
          }
        : null,
      oppRival: game.oppRival || null,
      rivals: game.rivals || [],
      outside: game.lastOutside || null,
      debate:
        game.debate && game.debate.done
          ? {
              night: DEBATE_BY_ID[game.debate.id] ? DEBATE_BY_ID[game.debate.id].night : 'Debate',
              verdict: game.debate.verdict,
            }
          : null,
      momentum: game.momentum,
      oppMomentum: game.oppMomentum,
      funds: round1(game.funds),
      demEV: weekSnap.demEV,
      repEV: weekSnap.repEV,
      senateNet: weekSenate.net,
      coalition: coalitionRows(next).filter((g) => g.support >= 50).length,
    },
  ];
  next.debate = null;

  if (next.build38?.regionalAssignment) {
    const drift = regionalPersuasionDelta({ directionByRegion: next.build38.regionalAssignment,
      completedWeeks: game.week + 1, priorAppliedWeek: next.build38.regionalAppliedWeek, totalWeeks: totalWeeksOf(next) });
    const regionalMarginByState = { ...next.build38.regionalMarginByState };
    for (const [abbr, margin] of Object.entries(drift.deltaMarginByState)) regionalMarginByState[abbr] = (regionalMarginByState[abbr] || 0) + margin;
    next.build38 = { ...next.build38, regionalMarginByState, regionalAppliedWeek: drift.appliedWeek };
  }
  next.earlyBallotLedger = closeEarlyBallots(next, totalWeeksOf(next), STATES, (abbr) =>
    boardShares({ margin: resultMargin(abbr, next), abbr, game: next, mode: 'result' }));
  next.noise = freshNoise(diff);
  next.week = game.week + 1;
  next.outcome = null;
  // R11: Keep final weekly snapshot on Election Night; clear for new playable week so it refreshes once.
  if (next.week < totalWeeksOf(next)) next.nickBronzeSnapshot = null;

  if (next.week >= totalWeeksOf(next)) {
    next.finished = true;
    next.currentEventId = null;
    next.currentEventData = null;
    next.currentInterrupt = null;
    next.lastAction = null;
    next.weekLog = [];
    next.actionsLeft = 0;
    // Election night: the polls get their one and only chance to be wrong. Until
    // this moment the miss did not exist anywhere, so no campaign could plan for
    // it and no screen could show it.
    next.pollMiss = rollPollMiss(diff.missScale);
    return next;
  }

  next.pendingInterrupts = [];
  return beginWeek(next);
}

export function acknowledgeCampaignNews(game) {
  if (!game || game.natNewsSeen) return game;
  const card = nationalNewsCard(game);
  if (!card) return { ...game, natNewsSeen: true };
  const random = createSeededRandom([game.build34CampaignId, card.id, game.week].join(':'));
  const selection = card.fourPartyFavor ? STATES[Math.floor(random() * STATES.length)]?.abbr : null;
  const next = { ...game, natNewsSeen: true };
  const evidence = game.incidentLedger?.find((receipt) => receipt.id === card.receiptId)?.payload?.rivalNewsIncident;
  return recordIncident(game, next, { type: 'news-acknowledgement', abbr: selection, recap: card.headline,
    payload: { headlineId: card.id, headline: card.headline, stateId: selection,
      correction: evidence?.claim && evidence?.correction ? { claim: evidence.claim, text: evidence.correction } : null,
      salience: card.salience ?? null } });
}

export function startTurn(game) {
  return game.finished || !isTraditionalStaffingReady(game.staffing) || game.eventScheduleWeek === game.week ? game : beginWeek(game);
}

export function confirmBuild35Staffing(game) {
  if (!game || game.finished) return game;
  return startTurn(game);
}

/** Recalculate a detailed state poll from the live map without changing game state. */
export function getDetailedPolling(game, abbr, currentShares, week = game?.week) {
  if (!game || !STATE_BY_ABBR[abbr] || !currentShares || typeof currentShares !== 'object') return null;
  const insights = coalitionRows(game).filter(({ id }) => (STATE_DEMOGRAPHICS[abbr]?.share?.[id] || 0) >= 0.1)
    .slice(0, 3).map(({ label, support }) => ({ label, value: Math.round(support) + '% modeled campaign support' }));
  return buildDetailedPolling(game, abbr, currentShares, week, insights);
}

function build40VpReports(game, state, calendarWeek) {
  const mate = CANDIDATE_BY_ID[game.runningMateId];
  if (!mate || game.week === 0) return state;
  const add = (next, type, sourceId, recap, payload) => recordIncident(next, { ...next }, { type, sourceId, recap, payload });
  let next = state;
  if (calendarWeek === 3 && mate.title) {
    const recap = 'The ticket briefing cites ' + mate.name + '’s public résumé: ' + mate.title + '.';
    next = add(next, 'running-mate-report', 'public-biography:' + mate.id, recap, {
      vetting: { publicSource: 'Campaign candidate biography', candidateId: mate.id, detail: mate.title },
    });
  }
  if (calendarWeek === 7) {
    const random = createSeededRandom([game.build34CampaignId, mate.id, 'vp-debate'].join(':'));
    const issue = ISSUE_BY_ID['affordability'];
    const reply = stanceLabel(issue, game.stances?.[issue.id] ?? 1);
    const score = round1((Number(mate.ratings?.debate) || 10) / 2.5 + random() * 3 - 1.8);
    const correction = score < 2.6 ? 'The moderator corrected the answer’s reference to the current funding year.' : null;
    const clip = score >= 4 ? { status: 'widely-shared', text: reply } : null;
    const recap = mate.name + '’s simulated running-mate debate exchange on ' + issue.label.toLowerCase() + ': ' + reply
      + (correction ? ' ' + correction : clip ? ' The clip was widely shared.' : ' The network is reviewing the exchange.');
    next = add(next, 'debate-answer', 'vp-debate', recap, {
      debateId: 'vp-debate', answer: reply, reply, answerScore: score, verdict: { tier: clip ? 'edge' : 'draw', score },
      exchangeUnderReview: true, clip, factCheck: correction ? { correction } : null,
    });
  }
  return next;
}

function build40Briefings(game) {
  const file = (state, type, sourceId, recap, payload, abbr = null) => {
    if ((state.incidentLedger || []).some((item) => item.sourceType === type && item.sourceId === sourceId)) return state;
    return recordIncident(state, { ...state }, { type, sourceId, recap, payload, abbr });
  };
  const calendarWeek = game.week - (totalWeeksOf(game) - TOTAL_WEEKS);
  let next = build40VpReports(game, game, calendarWeek);
  const prior = build40IncidentSources(game);
  next = build40PolicyReview(next, prior);
  next = build40RunningMateFollowUps(next, prior, calendarWeek);
  next = build40FactionCalendar(next, prior, factionsFor(game.party));
  if (game.week === 0) {
    const target = closestStates(game, 10).find(({ abbr }) => !(game.ops?.[abbr] > 0));
    if (target) next = file(next, 'campaign-briefing', 'opening-shifts', 'The opening field briefing lists unfilled shifts in ' + target.name + '.', { kind: 'unfilled-shifts' }, target.abbr);
    if (game.runningMateId) next = file(next, 'campaign-briefing', 'ticket-announcement', 'The campaign selected ' + (CANDIDATE_BY_ID[game.runningMateId]?.name || 'its running mate') + ' for the ticket announcement.', { kind: 'ticket-announcement' });
  }
  if (calendarWeek === 1) {
    const random = createSeededRandom(game.build34CampaignId + ':convention-broadcast');
    if (random() < 0.55) next = file(next, 'campaign-briefing', 'convention-broadcast', 'The simulated convention advance report lists a delayed opening broadcast.', { kind: 'convention', delayedOpeningBroadcast: true });
  }
  const completedDebates = new Set([...(game.build40?.completedDebateIds || []), ...(game.incidentLedger || []).filter((receipt) =>
    receipt.sourceType === 'debate-answer' && receipt.payload.verdict).map((receipt) => receipt.payload.debateId)]);
  if (calendarWeek > 10 && ['debate1', 'debate2', 'debate3'].every((id) => completedDebates.has(id))) {
    next = file(next, 'campaign-briefing', 'extra-debate-invitation', 'A broadcaster has invited both campaigns to a fourth debate after the three scheduled debates.', { kind: 'extra-debate-invitation' });
  }
  if (daysUntilElection(game, game.week) <= 10) {
    const target = closestStates(game, 12).find(({ abbr }) => (game.fatigue?.[game.party]?.[abbr]?.ad || 0) > 0 || (game.strategyProfile?.stateActions?.[abbr] || 0) > 0);
    if (target) next = file(next, 'campaign-briefing', 'late-ad-inventory', 'The final-week media brief reports limited remaining airtime in ' + target.name + '.', { kind: 'ad-inventory', constrained: true }, target.abbr);
  }
  for (const measure of game.ballotMeasures || []) {
    const eligible = ballotMeasureEligibility(game, measure, {
      stateLead: playerStateMargin(game, measure.state),
      stateAgreement: stateIssueAlignment(measure.state, measure.issueId, game.stances?.[measure.issueId]),
      rules: game.ballotMeasureRules,
    }).eligible;
    if (eligible) next = file(next, 'election-update', measure.id, 'The verified measure qualifies in ' + STATE_BY_ABBR[measure.state].name + '.', { kind: 'measure-briefing', verified: true, measureId: measure.id }, measure.state);
  }
  const targeted = Object.entries(game.strategyProfile?.stateActions || {}).filter(([abbr, amount]) => amount > 0 && scenarioBallotAccess(game.build39?.scenario?.id, 'president', abbr, game.party))
    .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([abbr]) => abbr);
  if (!targeted.length) targeted.push(...closestStates(game, 51).filter(({ abbr }) => scenarioBallotAccess(game.build39?.scenario?.id, 'president', abbr, game.party)).slice(0, 2).map(({ abbr }) => abbr));
  next = build40SimulatedElectionNotices(next, targeted, weekDate(game, game.week), daysUntilElection(game, game.week));
  const reports = (game.earlyBallotLedger?.batches || []).filter((batch) => batch.week === game.week && targeted.includes(batch.stateId));
  for (const batch of reports) {
    const expected = projectEarlyBallotPace(game, batch);
    next = file(next, 'election-update', batch.id, 'The simulated ' + STATE_BY_ABBR[batch.stateId].name + ' early-vote bulletin reports ' + Math.round(batch.ballotCount) + ' ballots against a modeled pace of ' + Math.round(expected) + '.', {
      kind: 'early-vote', reportedVotes: batch.ballotCount, projectedVotes: expected, fieldTarget: expected * 0.96,
    }, batch.stateId);
  }
  const hearingSource = build40IncidentSources(game).find((receipt) => receipt.sourceType === 'event-choice'
    && receipt.week + 1 === game.week && receipt.payload.eventId === 'signal_scandal_followup'
    && (receipt.payload.choiceId === 'choice-1' || /hearing/i.test(receipt.payload.choice)));
  if (hearingSource) next = file(next, 'hearing-request', hearingSource.id, 'A simulated oversight hearing requested testimony about the records released in the previous response.', {
    eventId: 'signal_scandal_followup', sourceDecisionId: hearingSource.id, requestedTestimony: true,
  }, hearingSource.stateId);
  if (game.week > 0 && game.week % 4 === 0 && game.finance?.expenses > 0) {
    next = file(next, 'finance-report', 'finance:' + game.week, 'The filed campaign finance report lists $' + game.finance.expenses + 'M in operating expenses.', {
      filed: true, flaggedLine: { label: 'Operating expenses', amount: game.finance.expenses },
    });
  }
  if (calendarWeek === 4 && (game.ballotMeasures || []).length === 0) {
    const candidate = closestStates(game, 15).find(({ abbr }) => (game.ops?.[abbr] || 0) > 0 || (game.strategyProfile?.stateActions?.[abbr] || 0) > 0);
    if (candidate) {
      const measureId = 'simulation:local-voter-guide:' + candidate.abbr;
      next = file(next, 'election-update', measureId,
        'Simulated official briefing: a citizens’ voter-guide initiative qualified in ' + candidate.name + '.',
        { kind: 'measure-briefing', verified: true, measureId, simulated: true }, candidate.abbr);
    }
  }
  const latestPromise = (game.promiseLedger || []).findLast((promise) => promise.week < game.week && !promise.broken);
  if (latestPromise && ISSUE_BY_ID[latestPromise.issueId]) {
    const issue = ISSUE_BY_ID[latestPromise.issueId];
    const costWarning = 'The simulated policy review of the ' + issue.label.toLowerCase() + ' pledge identifies implementation costs that have not been budgeted.';
    next = file(next, 'policy-review', latestPromise.id, costWarning, { promiseId: latestPromise.id, costWarning });
  }
  const least = factionsFor(game.party).map((faction) => ({ ...faction, standing: game.factions?.[faction.id] ?? 50 }))
    .sort((a, b) => a.standing - b.standing)[0];
  if (least?.standing <= 45 && game.week > 0) {
    next = file(next, 'faction-schedule', 'participation:' + least.id, least.label + ' canceled its planned campaign appearance.', {
      cancelled: true, approval: least.standing, leastSupportive: true, factionId: least.id,
    });
  }
  return next;
}

function beginWeek(game) {
  const openingShares = nationalShares(game);
  const weeklyBaseIncomeDraw = game.weeklyIncomeWeek === game.week && Number.isFinite(game.weeklyBaseIncomeDraw)
    ? game.weeklyBaseIncomeDraw
    : weeklyBaseIncomeM(openingShares[game.party]);
  const weeklyAIIncomeDraws = game.weeklyAIIncomeDrawsWeek === game.week && game.weeklyAIIncomeDraws
    ? game.weeklyAIIncomeDraws
    : Object.fromEntries(PARTY_ORDER.filter((party) => party !== game.party)
      .map((party) => [party, weeklyBaseIncomeM(openingShares[party])]));
  const weekOpened = {
    ...game,
    weeklyBaseIncomeDraw,
    weeklyIncomeWeek: game.week,
    weeklyAIIncomeDraws,
    weeklyAIIncomeDrawsWeek: game.week,
  };
  // The national desk files before the campaign does: the country's week is
  // already underway, and it has already moved the map, by the time the week's
  // own card lands.
  const briefedNews = weeklyNationalNews(weekOpened, closestStates(weekOpened, 8).map((s) => s.abbr));
  const briefed = { ...briefedNews, natGeneric: genericAverage(briefedNews) };
  const { schedule } = planWeeklyEventCadence({
    campaignId: game.build34CampaignId, week: game.week + 1, totalWeeks: totalWeeksOf(game), actionSlots: ACTIONS_PER_WEEK,
  });
  const decisionEventTargetCount = schedule.count;
  const eventSchedule = schedule.events.map(({ releaseAfterActionCount }) => ({ status: 'pending', afterActions: releaseAfterActionCount }));
  // The debate calendar is anchored to election night, not to the launch: a
  // January campaign still debates in the last weeks of the race.
  const debateDef = DEBATE_BY_WEEK[briefed.week - (totalWeeksOf(briefed) - TOTAL_WEEKS)] || null;
  const initial = {
    ...briefed,
    currentEventId: null,
    currentEventData: null,
    currentInterrupt: null,
    eventWhy: null,
    passiveEventIds: [],
    eventSchedule,
    eventScheduleVersion: schedule.schemaVersion,
    eventScheduleIndex: -1,
    eventScheduleWeek: game.week,
    decisionEventCount: eventSchedule.length,
    decisionEventTargetCount,
    decisionEventDispatchedCount: 0,
    eventScheduleShortfall: 0,
    weekEventResults: [],
    momentumPersuasionUsed: 0,
    actionsLeft: ACTIONS_PER_WEEK,
    weekLog: [],
    lastAction: null,
    lastSpin: null,
    lastAd: null,
    lastOps: null,
    lastVolunteerReport: null,
    outcome: null,
    adBackfire: null,
    lastShift: null,
    debate: debateDef ? { id: debateDef.id, step: 0, picks: [], done: false, verdict: null } : null,
  };

  const next = advanceDecisionEvent(build40Briefings(initial));

  // The week's own news is dealt last, so what the state is arguing about is
  // already in place when the player starts working it.
  const world = rollWorldNews(next);
  next.worldNews = world.cards;
  next.worldShift = world.shifts;
  next.downballotNews = world.downballotNews;
  next.salience = world.salience;
  next.worldRecent = world.recent;

  // The map pulse compares this week's campaign work to the board as it stood
  // when the week opened. News and automatic events are already on the map.
  next.campaignTrail = { week: next.week, entries: [] };
  next.weekStartMap = Object.fromEntries(
    snapshot(next).rows.map((row) => [row.abbr, { margin: row.margin, shares: { ...row.shares } }])
  );

  return next;
}

// A card the developer injects into the week that is already open.
export function forceEvent(game, eventId) {
  if (decisionPending(game) || game.finished || game.week === 0) return game;
  const participants = activeCandidateTickets(game);
  const candidate = participants.flatMap(({ party }) => eligibleCandidateEvents(game, CANDIDATE_EVENTS, participants, {
    actingParty: party, usedIds: game.usedEvents || [],
  })).find(({ definition }) => definition.id === eventId);
  if (candidate) {
    const event = candidateDecisionView(game, candidate);
    if (!event?.choices.some((choice) => !choice.unavailable)) return game;
    return { ...game, candidateEvents: presentedCandidate(game, event), currentEventId: eventId, currentEventData: event,
      currentInterrupt: null, eventWhy: event.why, outcome: null, usedEvents: [...new Set([...(game.usedEvents || []), eventId])] };
  }
  const definition = BUILD40_EVENTS_BY_ID[eventId];
  if (!definition || (game.usedEvents || []).includes(eventId)) return game;
  const actingParty = build40ActingParty(game, definition);
  const incident = build40DecisionEligibility(game, definition, { actingParty, receipts: build40IncidentSources(game) });
  if (incident === false) return game;
  const context = build40DecisionContext(game, definition, incident && { ...incident, stateId: build40ReportState(incident, definition.id) }, actingParty);
  if (!context || game.build40?.decisionReceipts?.some((receipt) => receipt.id === context.instanceId)) return game;
  const event = build40DecisionView(game, definition, context, actingParty === game.party ? game.funds : game.aiFunds?.[actingParty] || 0);
  return event.choices.some((choice) => !choice.unavailable) ? {
    ...game, currentEventId: event.id, currentEventData: event, eventWhy: event.why, currentInterrupt: null,
    outcome: null, usedEvents: [...new Set([...(game.usedEvents || []), event.id])],
  } : game;
}

export const ACTIONS = [
  {
    id: 'visit',
    label: 'Campaign stop',
    icon: 'transit',
    blurb: 'A rally in the state you picked. Solid lift there — more in a small state, less in a big one.',
    cost: 0,
    needsState: true,
  },
  {
    id: 'townhall',
    label: 'Town hall marathon',
    icon: 'media',
    blurb: 'Handle three audience questions. The room reacts to how well your answers fit the state.',
    cost: 0,
    needsState: true,
    panel: 'townhall',
  },
  {
    id: 'volunteers',
    label: 'Volunteer drive',
    icon: 'community',
    blurb: 'Pay the organizers, open a volunteer HQ, rent the vans. Real turnout, not just a headline.',
    cost: 3,
    needsState: true,
  },
  {
    id: 'fundraise',
    label: 'Fundraise',
    icon: 'coin',
    blurb: 'Work the local donors. Has some serious diminishing returns, especially when the top donors are tapped out',
    cost: 0,
    needsState: true,
  },
  {
    id: 'shift',
    label: 'Change a position',
    icon: 'data',
    blurb: 'Change your stance on one issue. Hopefully the voters that used to agree with you forgive you.',
    cost: 0,
    panel: 'shift',
  },
  {
    id: 'prep',
    label: 'Debate prep',
    icon: 'brain',
    blurb: 'Spend a day this week locked in a hotel room with your chief of staff. Hopefully it pays off',
    cost: 0,
  },
];

// Developer tool: nobody donated this money, it simply appeared.
export function giveCash(game, amount) {
  if (!amount) return game;
  return { ...game, funds: Math.max(0, round1((game.funds || 0) + amount)) };
}

export function developerAction(game, actionId, amount = 0) {
  if (!game || game.finished) return game;
  const next = { ...game, stateMods: { ...(game.stateMods || {}) } };
  const pov = game.party === 'rep' ? -1 : 1;
  if (actionId === 'autopersuade') {
    const targets = snapshot(game).rows.slice().sort((a, b) => Math.abs(a.margin) - Math.abs(b.margin)).slice(0, 8);
    targets.forEach((row) => { next.stateMods[row.abbr] = (next.stateMods[row.abbr] || 0) + 1.1 * pov; });
    next.lastAction = `Developer automatic persuasion: shifted ${targets.length} battlegrounds by 1.1 points`;
  } else if (actionId === 'persuade-all') {
    STATES.forEach((state) => { next.stateMods[state.abbr] = (next.stateMods[state.abbr] || 0) + 0.4 * pov; });
    next.lastAction = 'Developer nationwide persuasion: shifted every state by 0.4 points';
  } else if (actionId === 'momentum') {
    next.momentum = clampMomentum((game.momentum || 0) + 25);
    next.lastAction = 'Developer boost: +25 campaign momentum';
  } else if (actionId === 'actions') {
    next.actionsLeft = ACTIONS_PER_WEEK;
    next.lastAction = 'Developer reset: all weekly actions restored';
  } else if (actionId === 'fatigue') {
    next.fatigue = emptyFatigue();
    next.lastAction = 'Developer reset: campaign fatigue cleared';
  } else if (actionId === 'turnout') {
    next.turnout = { ...(game.turnout || {}) };
    STATES.forEach((state) => bumpTurnoutState(next, game.party, state.abbr, Math.max(0, Number(amount) || 20)));
    next.lastAction = 'Developer boost: turnout raised nationwide';
  } else {
    return game;
  }
  next.weekLog = [...(game.weekLog || []), next.lastAction];
  return next;
}

export function actionsLeftIn(game) {
  return game.actionsLeft ?? ACTIONS_PER_WEEK;
}

// Where the downballot race is already inside five points, voters are drowning in
// ads and mail, and one more week of campaigning moves them about a quarter as
// much.
export function downballotTight(game, abbr) {
  if (!abbr) return false;
  const fn = marginFn(game);
  if (SENATE_RACE_BY_STATE[abbr] && Math.abs(raceMargin(abbr, 'senate', game, fn)) < CLOSE_RACE) return true;
  return Math.abs(raceMargin(abbr, 'house', game, fn)) < CLOSE_RACE;
}

// A rally's effect on the generic ballot, priced against what it actually did to
// that state's presidential margin — half of it, or a quarter where the House or
// Senate race is already inside five points.
function applyRallyGeneric(before, next, abbr, excludedMargin = 0) {
  if (!abbr || !before) return;
  const moved = pollMargin(abbr, next) - pollMargin(abbr, before) - excludedMargin;
  if (!moved) return;
  addGeneric(next, abbr, moved * rallyGenericFactor(downballotTight(before, abbr)), { source: 'presidential' });
}

export function applyAction(game, actionId, abbr, payload = {}) {
  if (abbr && isScenarioCandidate(game.party) && !scenarioBallotAccess(game.build39?.scenario?.id, 'president', abbr, game.party)) return game;
  if (!isTraditionalStaffingReady(game.staffing)) return game;
  if (decisionPending(game) || game.finished) return game;
  const action = ACTIONS.find((a) => a.id === actionId);
  const left = actionsLeftIn(game);
  if (!action || left <= 0 || (action.panel && !(actionId === 'townhall' && Number.isFinite(payload.score)))) return game;
  const freeVolunteerReady = actionId === 'volunteers' && (game.campaignPerks?.freeVolunteerOps || 0) > 0;
  const cost = actionId === 'volunteers' ? volunteerPrice(abbr) : action.cost;
  if (cost > game.funds && !freeVolunteerReady) return game;
  if (action.needsState && !STATE_BY_ABBR[abbr]) return game;
  if (actionId === 'prep' && (game.debatePrep || 0) >= DEBATE_PREP_MAX) return game;

  const next = { ...game, stateMods: { ...game.stateMods }, scandals: [...(game.scandals || [])] };
  const pov = next.party === 'rep' ? -1 : 1;
  const state = abbr ? STATE_BY_ABBR[abbr] : null;
  // Nobody moves a state they are not on the ballot in.
  const damp = actionDamp(next, abbr, actionId);
  const tail = dampNote(damp, abbr, next);
  let note = '';

  if (actionId === 'visit') {
    // A stop raises turnout and makes a small amount of persuasion possible.
    // Fatigue affects those voter effects, while momentum remains at +0.5.
    const ownStopFatigue = Number(next.fatigue?.[next.party]?.[abbr]?.stop) || 0;
    const stateLifetimeFatigue = Number(next.totalFatigue?.[abbr]) || 0;
    const { turnoutMultiplier: rallyMultiplier, persuasionPoints } = resolveRallyEffect({ electoralVotes: state.ev });
    const size = rallyScale(abbr) * rallyMultiplier;
    const stopEffects = campaignStopEffects(
      ownStopFatigue,
      stateLifetimeFatigue,
      0.25 * 1.5 * pov * damp * size,
    );
    const rally = build35Attendance(game, next, 'visit', abbr, stopEffects.turnout, 1);
    const fieldTurnout = build35FieldConversion(game, next, abbr, 'visit', stopEffects.turnout);
    addTurnoutState(next, next.party, abbr, Math.min(rally.turnout + fieldTurnout - stopEffects.turnout, stopEffects.turnout * 1.1) * rallyMultiplier);
    if (build35QualityRoll(game, next, 'visit', 1 - Math.random()) > 0.9) {
      applyMomentumPersuasion(next, {
        [abbr]: { base: stopEffects.persuasion, actual: stopEffects.persuasion * momentumPersuasionFactor(next) },
      });
      applyLocalGroupShifts(next, Object.fromEntries(Object.entries(rallyGroupShifts(coalitionRows(next))).map(([id, points]) => [id, points * rallyMultiplier])), abbr);
      note = `Rallied in ${state.name} — and the room actually moved`;
    } else {
      note = `Rallied in ${state.name}`;
    }
    if (isThirdParty(game.party) || isScenarioCandidate(game.party)) applyMinorPartyPersuasion(next, game.party, abbr, persuasionPoints || Math.abs(stopEffects.persuasion) || 0.1);
    else next.stateMods[abbr] = (next.stateMods[abbr] || 0) + scaleRegionalPersuasion(next, persuasionPoints) * pov;
    const crowd = createSeededRandom([game.build34CampaignId, game.week, left, abbr, 'rally-crowd'].join(':'));
    const expectedAttendance = 200 + state.ev * 40;
    const venueCapacity = Math.round(expectedAttendance * 1.14);
    const attendance = Math.round(expectedAttendance * (0.8 + crowd() * 0.45) * Math.min(1, damp));
    next.lastRally = { stateId: abbr, persuasionPoints, turnoutBefore: turnoutOf(game, abbr), turnoutAfter: turnoutOf(next, abbr),
      expectedAttendance, venueCapacity, attendance, overflow: Math.max(0, attendance - venueCapacity) };
    if (attendance < expectedAttendance || attendance > venueCapacity) note += ' · ' + attendance + ' attended, ' + expectedAttendance + ' expected, capacity ' + venueCapacity;
    next.momentum = clampMomentum(next.momentum + stopEffects.momentum * rallyMultiplier);
    addFatigue(next, next.party, abbr, 'stop', rally.candidateFatigue);
  } else if (actionId === 'volunteers') {
    const enhanced = (next.campaignPerks?.freeVolunteerOps || 0) > 0;
    if (enhanced) {
      next.campaignPerks = { ...(next.campaignPerks || {}), freeVolunteerOps: next.campaignPerks.freeVolunteerOps - 1 };
    } else {
      next.funds = Math.round((next.funds - cost) * 100) / 100;
    }
    // Organizers, vans and a phone bank that actually dials: focused local
    // turnout, with no national persuasion effect.
    const nativeTurnout = 4.5 * damp * (enhanced ? 1.5 : 1);
    const turnoutPoints = build35FieldConversion(game, next, abbr, 'volunteers', nativeTurnout);
    const field = applyBuild35Agenda(game, next, { actionId: 'volunteers', targetId: abbr }, { turnoutPoints },
      { existingStaffMultiplier: nativeTurnout > 0 ? Math.min(1.1, turnoutPoints / nativeTurnout) : 1 });
    addTurnoutState(next, next.party, abbr, field.turnoutPoints * build38Field(game, 'volunteers', abbr).fieldMultiplier);
    next.momentum = clampMomentum(next.momentum + 0.5);
    const volunteerRandom = createSeededRandom([game.build34CampaignId, game.week, left, abbr, 'volunteer-report'].join(':'));
    const expected = Math.round(40 + state.ev * 4);
    const signups = Math.round(expected * (0.8 + 0.42 * volunteerRandom()));
    next.lastVolunteerReport = { abbr, expected, signups };
    const district = HOUSE_DISTRICT_BASELINES.find((entry) => (entry.stateAbbr || entry.state) === abbr);
    next.lastVolunteerEvidence = build40FieldEvidence(next, actionId, abbr, next.lastVolunteerReport, district?.id);
    note = enhanced
      ? `Faction mobilization in ${state.name} — no campaign cost and a 50% stronger volunteer operation${tail}`
      : `Paid for a volunteer operation in ${state.name} — organizers, vans, and a phone bank that actually dials${tail}`;
  } else if (actionId === 'townhall') {
    const fat = actionMultiplier(next, next.party, abbr, 'stop');
    const size = rallyScale(abbr);
    const score = Math.max(-6, Math.min(6, payload.score));
    const attendance = build35Attendance(game, next, 'townhall', abbr, score >= 2 ? 2 : score >= -1 ? 0.6 : 0, 5);
    if (score >= 2) {
      const lift = 0.22 + Math.min(0.12, (score - 2) * 0.02);
      const base = lift * pov * damp * fat * size;
      applyMomentumPersuasion(next, {
        [abbr]: { base, actual: base * momentumPersuasionFactor(next) },
      });
      addTurnoutState(next, next.party, abbr, attendance.turnout);
      applyLocalGroupShifts(next, townhallGroupShifts(coalitionRows(next), true), abbr);
      pushStory(next, storyFrom(next, abbr, 'townhall', true, 'the town hall'));
      note = `Town hall in ${state.name} — the audience liked your answers (${score > 0 ? '+' : ''}${score})${sizeNote(size)}${tail}`;
    } else if (score >= -1) {
      addTurnoutState(next, next.party, abbr, attendance.turnout);
      applyLocalGroupShifts(next, townhallGroupShifts(coalitionRows(next), true), abbr);
      pushStory(next, storyFrom(next, abbr, 'townhall', true, 'the town hall'));
      note = `Town hall in ${state.name} — a mixed but steady exchange (${score > 0 ? '+' : ''}${score})${tail}`;
    } else {
      const base = -0.18 * pov * damp;
      applyMomentumPersuasion(next, {
        [abbr]: { base, actual: base * momentumPersuasionFactor(next) },
      });
      addTurnoutState(next, next.party, abbr, -1);
      next.momentum = clampMomentum(next.momentum - 1);
      applyLocalGroupShifts(next, townhallGroupShifts(coalitionRows(next), false), abbr);
      pushStory(next, storyFrom(next, abbr, 'townhall', false, 'the gaffe'));
      note = `Town hall in ${state.name} — the room turned against your answers (${score})${tail}`;
    }
    // A marathon is five stops' worth of one state's attention.
    addFatigue(next, next.party, abbr, 'stop', attendance.candidateFatigue);
  } else if (actionId === 'prep') {
    next.funds = round1(next.funds - 5);
    next.debatePrep = Math.min(DEBATE_PREP_MAX, (game.debatePrep || 0) + 1);
    note = `Debate prep — a day in a hotel ballroom with the briefing book (${next.debatePrep} of ${DEBATE_PREP_MAX} banked)`;
  } else if (actionId === 'fundraise') {
    const room = fundraiseOutlook(next, abbr);
    const { donorYieldM } = applyBuild35Agenda(game, next, { actionId: 'fundraise', targetId: abbr }, {
      donorCategory: 'major-donor-room', donorYieldM: room.cash,
    });
    const raised = round1(donorYieldM);
    next.funds = round1(next.funds + raised);
    next.momentum = clampMomentum(next.momentum - 3);
    next.fundraising = { ...(game.fundraising || {}), [abbr]: room.count + 1 };
    next.fundraisingFatigue = room.fatigueByPartyState;
    note =
      room.count === 0
        ? `Raised $${raised}M from a fresh room of donors in ${state.name}`
        : `Raised $${raised}M in ${state.name} — trip ${room.count + 1}, and the same room is ${Math.round(
            (1 - room.decay) * 100
          )}% thinner`;
  }

  // A rally is felt on the whole ballot in the state that held it — but only at
  // half strength on the generic ballot, and a quarter where the downballot race
  // is already tight.
  if (actionId === 'visit' || actionId === 'townhall') {
    const flatRallyMargin = actionId === 'visit' && !isThirdParty(game.party) ? resolveRallyEffect().persuasionPoints * pov : 0;
    applyRallyGeneric(game, next, abbr, flatRallyMargin);
  }

  // Whatever it was, it made news where it happened.
  if (abbr && actionId === 'visit') pushStory(next, storyFrom(next, abbr, 'visit', true, 'the stump speech'));
  else if (abbr && actionId === 'volunteers') pushStory(next, storyFrom(next, abbr, 'volunteers', true, 'the field operation'));
  else if (abbr && actionId === 'fundraise') pushStory(next, storyFrom(next, abbr, 'fundraise', true, 'the money'));

  next.actionsLeft = left - 1;
  next.lastAction = note;
  if (['visit', 'townhall'].includes(actionId)) {
    const stopFatigueBefore = Number(game.fatigue?.[game.party]?.[abbr]?.stop) || 0;
    const engagementMultiplier = actionMultiplier(game, game.party, abbr, 'stop');
    const publicScore = Math.max(-6, Math.min(6, Math.round(Number(payload.score) || 0)));
    const publicAnswers = Array.isArray(payload.answers) ? payload.answers.slice(0, 3).filter((answer) =>
      answer && typeof answer.issueId === 'string' && typeof answer.issue === 'string' && typeof answer.question === 'string'
      && typeof answer.response === 'string' && typeof answer.responseApproach === 'string'
    ).map((answer) => ({
      issueId: answer.issueId,
      issue: answer.issue,
      question: answer.question,
      response: answer.response,
      responseApproach: answer.responseApproach,
    })) : [];
    const answersSummary = publicAnswers.map((answer) => `${answer.issue}: ${answer.question} — ${answer.response} (${answer.responseApproach})`).join('; ');
    const publicStopMoment = actionId === 'townhall'
      ? {
          kind: 'answered-attendees',
          clipShown: true,
          answers: publicAnswers,
          text: `The candidate answered ${publicAnswers.length} attendee questions at the ${state?.name || abbr} town hall; the completed Q&A scored ${publicScore > 0 ? '+' : ''}${publicScore} with the audience. Recorded prompts and response approaches: ${answersSummary || 'not recorded'}.`,
        }
      : null;
    next.lastActionEvidence = {
      actionId,
      abbr,
      stateName: state?.name || abbr,
      text: note,
      ...(publicStopMoment ? { publicStopMoment } : {}),
      stopFatigueBefore,
      playerAttention: Number(game.strategyProfile?.stateActions?.[abbr]) || 0,
      engagementMultiplier: round1(engagementMultiplier),
      engagementDrop: round1((1 - engagementMultiplier) * 100),
    };
  }
  if (actionId === 'volunteers') {
    note += ' · ' + next.lastVolunteerReport.signups + ' signups, ' + next.lastVolunteerReport.expected + ' expected';
    if (next.lastVolunteerEvidence.organicVideo) note += ' · an unpaid volunteer clip recorded ' + next.lastVolunteerEvidence.organicVideo.shares + ' shares';
    if (next.lastVolunteerEvidence.canvassReport) note += ' · district ' + next.lastVolunteerEvidence.canvassReport.districtId + ' reported ' + next.lastVolunteerEvidence.canvassReport.affectedAddresses + ' mismatched addresses';
  }
  const loggedAction = actionId === 'townhall' && next.lastActionEvidence?.publicStopMoment
    ? `${note} — ${next.lastActionEvidence.publicStopMoment.text}`
    : note;
  next.lastAction = loggedAction;
  next.weekLog = [...(game.weekLog || []), loggedAction];
  return next;
}

// ---------------------------------------------------------------------------
// Ad blitzes: state, issue, and whether you promote yourself or attack them.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Ad blitzes: state, issue, medium, and whether you promote yourself or attack.
// The catalog, the prices and the quality rolls live in '@/lib/ads'; this file
// re-exports them so every existing caller keeps its import.
// ---------------------------------------------------------------------------

export {
  AD_TYPES,
  AD_TYPE_LIST,
  ATTACK_BACKFIRE,
  POSITIVE_BACKFIRE,
  BACKFIRE_STATE_HIT,
  BACKFIRE_NATIONAL_HIT,
  adCost,
  adBaseStrength,
  adOutlook,
  adQualityRoll,
  ATTACK_LOCAL_BACKFIRE,
  POSITIVE_LOCAL_BACKFIRE,
  LOCAL_BACKFIRE_TURNOUT,
} from '@/lib/ads';

// Television keeps its old name, because that is what "an ad buy" means.
export function adBlitzCost(game, abbr, kind) {
  return adCost(game, abbr, 'tv', kind);
}

// One buy can run in one state or in as many as the money reaches. Every state is
// priced and rolled on its own, exactly as if it had been bought there alone: the
// same cost, the same odds, and its own answer to the spot.
export function freeAdsForIssue(game, issueId) {
  const perks = game?.campaignPerks || {};
  const issueCredits = Array.isArray(perks.freeAdIssues) ? perks.freeAdIssues : [];
  const genericCredits = Math.max(0, (Number(perks.freeAds) || 0) - issueCredits.length);
  return genericCredits + issueCredits.filter((creditIssueId) => creditIssueId === issueId).length;
}

export function runAdBlitz(game, { abbr, abbrs, issueId, kind, typeId, language = 'en' }) {
  if (!isTraditionalStaffingReady(game.staffing) || decisionPending(game) || game.finished) return game;
  if (typeId && !AD_TYPES[typeId]) return game;
  let targets = (Array.isArray(abbrs) && abbrs.length ? abbrs : abbr ? [abbr] : []).filter(Boolean);
  const corruptionAd = !!game.campaignPerks?.corruptionAd;
  if (!targets.length || !issueId || !kind) return game;
  if (corruptionAd && (issueId !== 'corruption' || kind === 'attack')) return game;
  if (corruptionAd) targets = targets.slice(0, 1);
  const type = AD_TYPES[typeId] || AD_TYPES.tv;
  const free = Math.min(freeAdsForIssue(game, issueId) + (corruptionAd ? 1 : 0), targets.length);
  const total = round1(targets.reduce((sum, target, i) => sum + (i < free ? 0 : adCost(game, target, type.id, kind)), 0));
  if (total > game.funds) return game;

  let next = game;
  const bought = [];
  const batch = { id: [game.build34CampaignId, 'ad-batch', game.week, game.incidentSequence || 0, (game.weekLog || []).length].join(':'), asmr: null };
  targets.forEach((target) => {
    const before = next;
    next = runAdInState(next, { abbr: target, issueId, kind, type, language, batch });
    if (next !== before && next.lastAd) bought.push(next.lastAd);
  });
  if (!bought.length) return game;

  next.lastAds = bought;
  if (bought.length > 1) {
    const note = `${type.label} ${
      kind === 'attack' ? 'attacking' : 'promoting'
    } on ${ISSUE_BY_ID[issueId].label.toLowerCase()} in ${bought.length} states — $${total}M, and every state answered on its own`;
    next.weekLog = [...(next.weekLog || []), note];
    next.lastAction = note;
  }
  return next;
}

function runAdInState(game, { abbr, issueId, kind, type, language = 'en', batch }) {
  const perks = game.campaignPerks || {};
  if (perks.corruptionAd && issueId === 'corruption' && kind !== 'attack') {
    const next = {
      ...game,
      stateMods: { ...(game.stateMods || {}) },
      campaignPerks: { ...perks, corruptionAd: false },
      weekLog: [...(game.weekLog || [])],
    };
    const result = runCorruptionAd(next, game.party, abbr);
    const outcomeText = result.outcome === 'viral'
      ? 'Mega viral — +5 state margin, +5 turnout here, +1 across the region; regional ground-game follow-up next week.'
      : result.outcome === 'successful'
        ? 'Successful — +5 state margin.'
        : 'The spot ran, but the story did not move voters.';
    const stateName = STATE_BY_ABBR[abbr]?.name || abbr;
    next.lastAd = { abbr, issueId, kind: 'pro', typeId: type.id, type: type.label, cost: 0, special: 'corruption', outcome: result.outcome, verdict: outcomeText, swing: result.outcome === 'nothing' ? 0 : 5, turnout: result.outcome === 'viral' ? 5 : 0, corruption: { declinedCondition: true, viral: result.outcome === 'viral' } };
    next.lastAction = `Free anti-corruption ad in ${stateName} — ${outcomeText}`;
    next.weekLog.push(next.lastAction);
    return next;
  }
  const isFree = freeAdsForIssue(game, issueId) > 0;
  const cost = isFree ? 0 : adCost(game, abbr, type.id, kind);
  const multiplierReady = (perks.nextAdMultiplier || 1) > 1 && (!perks.nextAdIssue || perks.nextAdIssue === issueId);
  if (cost > game.funds) return game;

  const state = STATE_BY_ABBR[abbr];
  const issue = ISSUE_BY_ID[issueId];
  if (!state || !issue) return game;
  const pov = game.party === 'rep' ? -1 : 1;
  const next = {
    ...game,
    stateMods: { ...game.stateMods },
    scandals: [...(game.scandals || [])],
  };
  const quality = adQualityRoll(type.id, (roll) => build35QualityRoll(game, next, 'ad', roll));
  const dud = quality < 0.45;
  const hit = quality > 1.05;
  const freeAdIssues = [...(perks.freeAdIssues || [])];
  const issueCreditIndex = freeAdIssues.indexOf(issueId);
  if (isFree && issueCreditIndex >= 0) freeAdIssues.splice(issueCreditIndex, 1);
  next.campaignPerks = {
    ...perks,
    freeAds: Math.max(0, (perks.freeAds || 0) - (isFree ? 1 : 0)),
    freeAdIssues,
    ...(multiplierReady ? { nextAdMultiplier: 1, nextAdIssue: null } : {}),
  };

  const damp = actionDamp(game, abbr);
  const magnitude = round1(adBaseStrength(game, abbr, issueId, type.id, kind) * Math.abs(quality) * damp);
  // Fatigue never makes a bad buy worse — it only eats what was going right.
  const fat = type.fatigue ? actionMultiplier(game, game.party, abbr, 'ad') : 1;
  // A wild medium loses exactly as hard as it wins: that is the whole trade.
  let swing = quality < 0 ? -round1(magnitude) : dud ? -round1(magnitude * 0.8) : round1(magnitude * fat);
  if (multiplierReady && swing > 0) swing = round1(swing * perks.nextAdMultiplier);

  next.funds = round1(next.funds - cost);
  // An ad does not change a mind, it changes who shows up. A spot for you lifts
  // your own turnout, a spot against them depresses theirs — the same size of
  // effect either way, so neither kind of buy is the obvious one.
  const localChance = kind === 'attack' ? ATTACK_LOCAL_BACKFIRE : POSITIVE_LOCAL_BACKFIRE;
  const localBlowup = Math.random() < localChance;
  const nationalBlowup = Math.random() < (kind === 'attack' ? ATTACK_BACKFIRE : POSITIVE_BACKFIRE);
  const asmr = type.id === 'digital' ? (batch.asmr ||= applyBuild35Contract(game, next, 'asmr-streamer', {
    actionId: 'issue-ad', receiptType: 'campaign-action',
    evidence: { digitalPlacementBatch: true, batchId: batch.id },
  }, { generalFatigue: 1, persuasionCeiling: 1 })) : { generalFatigue: 1, persuasionCeiling: 1 };
  if (swing > 0) swing *= asmr.persuasionCeiling;
  const adPayload = applyBuild35Agenda(game, next, { actionId: 'ad', targetId: abbr, issueId, adTypeId: type.id, adKind: kind }, {
    swing: localBlowup || nationalBlowup ? 0 : swing,
    turnoutPoints: round1(Math.abs(swing) * 2),
  });
  const audienceTurnout = (baseEffect) => spanishAdEffect({ language, issueId, stanceIndex: game.stances?.[issueId], channel: 'turnout', baseEffect, hispanicFraction: (STATE_DEMOGRAPHICS[abbr]?.share.hispanic || 0) / 100 }).effect;
  const lift = audienceTurnout(swing >= 0 ? round1(adPayload.turnoutPoints) : -round1(adPayload.turnoutPoints));
  const points = Math.abs(lift);
  if (points) {
    if (kind === 'attack') addTurnoutState(next, game.opponentParty, abbr, -lift);
    else addTurnoutState(next, game.party, abbr, lift);
  }
  // Pure turnout media — a mailer — persuades nobody and just reminds people.
  const turnout = audienceTurnout(type.strength > 0 ? 0 : type.turnout || 0);
  if (turnout) addTurnoutState(next, game.party, abbr, turnout);
  const reversed = Boolean(lift && Math.sign(lift) !== Math.sign(swing));
  const receiptSwing = reversed ? -swing : swing;

  // A buy moves the state it ran in and nothing else: no momentum either way, no
  // national argument, no spillover into the neighbours.

  // Two ways it can blow up — in the state, and nationally — rolled separately, so
  // one bad spot can manage both at once.
  let backfire = null;
  if (localBlowup || nationalBlowup) {
    backfire = {
      abbr,
      name: state.name,
      kind,
      typeId: type.id,
      typeLabel: type.label,
      issueLabel: issue.label,
      stateHit: nationalBlowup ? BACKFIRE_STATE_HIT : 0,
      nationalHit: nationalBlowup ? BACKFIRE_NATIONAL_HIT : 0,
      localVote: localBlowup ? round1(1 + Math.random()) : 0,
      localTurnout: localBlowup ? LOCAL_BACKFIRE_TURNOUT : 0,
    };
    if (nationalBlowup) {
      next.stateMods[abbr] = (next.stateMods[abbr] || 0) - BACKFIRE_STATE_HIT * pov;
      STATES.forEach((s) => {
        next.stateMods[s.abbr] = (next.stateMods[s.abbr] || 0) - BACKFIRE_NATIONAL_HIT * pov;
      });
    }
    if (localBlowup) {
      next.stateMods[abbr] = (next.stateMods[abbr] || 0) - backfire.localVote * pov;
      applyTurnout(next, { [abbr]: -LOCAL_BACKFIRE_TURNOUT });
    }
    next.adBackfire = { ...backfire, week: game.week };
  }

  if (type.fatigue) addFatigue(next, next.party, abbr, 'ad', 1, asmr.generalFatigue);

  // A buy is a story in the state it ran in, whichever way it went.
  if (dud || receiptSwing < 0) pushStory(next, storyFrom(next, abbr, 'ad', false, 'the ad'));
  else if (receiptSwing > 0) pushStory(next, storyFrom(next, abbr, 'ad', true, 'the ad'));

  const verdict = reversed ? 'had the opposite turnout effect' : dud ? 'bombed' : hit ? 'landed clean' : 'held its own';
  const movement =
    kind === 'attack'
      ? `${lift >= 0 ? '−' : '+'}${points} turnout for them`
      : `${lift >= 0 ? '+' : '−'}${points} turnout`;
  const note =
    type.strength > 0
      ? `${type.label} ${kind === 'attack' ? 'attacking' : 'promoting'} on ${issue.label.toLowerCase()} in ${
          state.name
        } — ${verdict} (${movement}, $${cost}M)`
      : `${type.label} in ${state.name} — no persuasion, turnout up ${turnout} ($${cost}M)`;

  const factCheck = build40CampaignFactCheck(game, { abbr, issue, backfire, typeId: type.id, kind });
  if (factCheck) pushStory(next, { ...storyFrom(next, abbr, 'adBackfire', false, 'the fact check'), headline: 'A fact check corrects the campaign’s ad', factCheck });
  next.lastAd = {
    factCheck,
    rapidResponse: kind === 'attack' && type.id === 'digital' && (game.spins?.[abbr] || 0) > 0,
    ...(type.id === 'digital' ? { groupId: 'moderate', audience: { unexpected: quality < 0, comments: quality < 0 ? Math.max(1, Math.round(Math.abs(swing) * 25)) : 0 } } : {}),
    abbr,
    issueId,
    kind,
    typeId: type.id,
    type: type.label,
    cost,
    swing: receiptSwing,
    points,
    quality,
    dud,
    hit,
    verdict,
    turnout,
    backfire,
    language: language === 'es' ? 'es' : 'en',
  };
  next.weekLog = [...(game.weekLog || []), factCheck ? note + ' · Fact-check: ' + factCheck.correction : note];
  return next;
}

// ---------------------------------------------------------------------------
// Promises and position changes. A promise is a rally with a policy attached:
// it is graded on how well your stance actually fits the state.
// ---------------------------------------------------------------------------

export function promiseOutlook(game, abbr, issueId) {
  const issue = ISSUE_BY_ID[issueId];
  if (!issue || !abbr) return null;
  const stance = game.stances?.[issueId] ?? 1;
  const fit = stateIssueAlignment(abbr, issueId, stance);
  const salience = issue.weight / 10;
  let tier = 'miss';
  let swing = -round1(1.6 * salience + 0.5);
  let momentum = -2;
  if (fit >= 0.7) {
    tier = 'hit';
    swing = round1(2.4 * salience + 1.2);
    momentum = 2;
  } else if (fit >= 0.55) {
    tier = 'ok';
    swing = round1(1.1 * salience);
    momentum = 0.5;
  }
  return { tier, swing, momentum, fit, salience, stance, stanceLabel: stanceLabel(issue, stance), label: issue.label };
}

export function makePromise(game, abbr, issueId) {
  if (!isTraditionalStaffingReady(game.staffing) || decisionPending(game) || game.finished) return game;
  const left = actionsLeftIn(game);
  const outlook = promiseOutlook(game, abbr, issueId);
  if (!outlook || !abbr || left <= 0) return game;

  const pov = game.party === 'rep' ? -1 : 1;
  const state = STATE_BY_ABBR[abbr];
  const next = { ...game, stateMods: { ...game.stateMods } };

  const damp = actionDamp(next, abbr, 'promise');
  const fat = actionMultiplier(next, next.party, abbr, 'promise');
  let swing = outlook.swing > 0 ? outlook.swing * fat : outlook.swing;
  if (issueId === 'climate' && swing > 0) swing *= factionEffects(next).climatePersuasionMul;
  const persuasion = {
    [abbr]: {
      base: swing * pov * damp,
      actual: swing * pov * damp * momentumPersuasionFactor(next),
    },
  };
  if (outlook.tier === 'hit') {
    const base = outlook.salience * 0.45 * pov * damp * fat;
    const actual = base * momentumPersuasionFactor(next);
    STATES.filter((s) => s.region === state.region).forEach((s) => {
      const prior = persuasion[s.abbr] || { base: 0, actual: 0 };
      persuasion[s.abbr] = { base: prior.base + base, actual: prior.actual + actual };
    });
  }
  const payload = applyBuild35Agenda(game, next, { actionId: 'promise', targetId: abbr, issueId }, {
    outcomeTier: outlook.tier, persuasion,
  });
  applyMomentumPersuasion(next, payload.persuasion);
  addFatigue(next, next.party, abbr, 'promise', 1);
  applyTurnout(next, { [abbr]: outlook.tier === 'hit' ? 0.8 : 0.3 });
  next.momentum = clampMomentum(next.momentum + outlook.momentum);
  // A promise is a coalition decision: the groups who wanted that answer move
  // toward you, and the groups who did not move away.
  const promisedStance = game.stances?.[issueId] ?? 1;
  applyPlayerShifts(next, stanceGroupShifts(coalitionRows(next), promisedStance, issueId, game.oppStances?.[issueId] ?? 1), 0.04);
  applyRallyGeneric(game, next, abbr);
  pushStory(next, storyFrom(next, abbr, 'promise', outlook.tier !== 'miss', 'the promise'));

  const note =
    outlook.tier === 'hit'
      ? `Promised “${outlook.stanceLabel}” on ${outlook.label.toLowerCase()} in ${state.name} — the room stood up`
      : outlook.tier === 'ok'
        ? `Promised “${outlook.stanceLabel}” on ${outlook.label.toLowerCase()} in ${state.name} — polite applause`
        : `Promised “${outlook.stanceLabel}” on ${outlook.label.toLowerCase()} in ${state.name} — the room did not agree`;

  next.actionsLeft = left - 1;
  next.lastPromise = { ...outlook, abbr, issueId };
  const promiseLedger = game.promiseLedger || [];
  next.promiseLedger = [...promiseLedger, {
    id: `${game.week}-${promiseLedger.length}-${abbr}-${issueId}`,
    week: game.week,
    abbr,
    issueId,
    stance: game.stances?.[issueId] ?? 1,
    broken: false,
    exploitedWeek: null,
  }];
  next.lastAction = note;
  next.weekLog = [...(game.weekLog || []), note];
  return next;
}

// Every flip gets more expensive: momentum first, then the map.
export function flipCost(game) {
  const n = game.flips || 0;
  return { momentum: 2 + n * 3, spread: round1(0.5 + n * 0.5) };
}

export function changeStance(game, issueId, optionIndex) {
  if (!isTraditionalStaffingReady(game.staffing) || decisionPending(game) || game.finished) return game;
  const issue = ISSUE_BY_ID[issueId];
  const left = actionsLeftIn(game);
  if (!issue || left <= 0 || !Number.isInteger(optionIndex) || !issue.options?.[optionIndex]) return game;
  if ((game.stances?.[issueId] ?? 1) === optionIndex) return game;

  const cost = flipCost(game);
  const oldStance = game.stances?.[issueId] ?? 1;
  const next = {
    ...game,
    stateMods: { ...game.stateMods },
    stances: { ...game.stances, [issueId]: optionIndex },
  };
  if (MAIN_GAME_ENDORSEMENTS_ENABLED) {
    const policyMemory = recordPolicyChoice(game, next, issueId, oldStance, optionIndex);
    next.endorsements = policyMemory.endorsements;
    updateBuild34EndorserPolicyMemory(next, game.party, issueId, oldStance, optionIndex, game.week);
  }
  const brokenIds = new Set((game.promiseLedger || [])
    .filter((promise) => promise.issueId === issueId && promise.stance !== optionIndex && !promise.broken)
    .map((promise) => promise.id));
  next.promiseLedger = (game.promiseLedger || []).map((promise) =>
    brokenIds.has(promise.id) ? { ...promise, broken: true, brokenWeek: game.week } : promise
  );

  next.flips = (game.flips || 0) + 1;
  next.momentum = clampMomentum(next.momentum - cost.momentum);
  applyPlayerShifts(next, stanceGroupShifts(coalitionRows(next), optionIndex, issueId, oldStance), 0.08);
  const response = resolvePolicyEffect({ campaignId: game.build34CampaignId, sequence: next.flips, issueId, from: oldStance, to: optionIndex });
  constrainPolicyPolling(game, next, response.pollPoints);
  next.build39 = { ...next.build39, lastPolicyResponse: { issueId, sequence: next.flips, ...response } };

  const note = `Changed position on ${issue.label.toLowerCase()} to “${stanceLabel(
    issue,
    optionIndex
  )}” — momentum −${cost.momentum}, and polling ${response.pollPoints < 0 ? 'fell' : 'rose'} by up to ${Math.abs(response.pollPoints).toFixed(2)} points${brokenIds.size ? `; you broke ${brokenIds.size} campaign promise${brokenIds.size > 1 ? 's' : ''}` : ''}`;
  next.actionsLeft = left - 1;
  next.lastAction = note;
  next.weekLog = [...(game.weekLog || []), note];
  return next;
}

export function constrainPolicyPolling(game, next, pollPoints) {
  const pov = game.party === 'rep' ? -1 : 1;
  if (isThirdParty(game.party)) {
    const modifier = { ...(next.thirdMods?.[game.party] || {}) };
    next.thirdMods = { ...next.thirdMods, [game.party]: modifier };
    for (const { abbr } of STATES) {
      if (isScenarioCandidate(game.party) && !scenarioBallotAccess(game.build39?.scenario?.id, 'president', abbr, game.party)) continue;
      const before = partyShareIn(abbr, game);
      const original = modifier[abbr] || 0;
      if (Math.abs(partyShareIn(abbr, next) - before - pollPoints) < 0.00001) continue;
      const target = before + pollPoints;
      let low = original - 20;
      let high = original + 20;
      for (let i = 0; i < 23; i++) {
        modifier[abbr] = (low + high) / 2;
        if (partyShareIn(abbr, next) < target) low = modifier[abbr];
        else high = modifier[abbr];
      }
      modifier[abbr] = (low + high) / 2;
    }
  } else {
    next.stateMods = { ...next.stateMods };
    for (const { abbr } of STATES) {
      const rawMovement = pollMargin(abbr, next) - pollMargin(abbr, game);
      next.stateMods[abbr] = (next.stateMods[abbr] || 0) + pollPoints * pov - rawMovement;
    }
  }
  return next;
}

// ---------------------------------------------------------------------------
// Ground game: a permanent, per-state field operation paid for every week.
// ---------------------------------------------------------------------------

export const GROUND_LEVELS = [
  { level: 1, label: 'Field office', blurb: 'One office, a dozen organizers, a real volunteer list.' },
  { level: 2, label: 'Regional operation', blurb: 'Six offices, paid canvassers, and a turnout model.' },
  { level: 3, label: 'Full state machine', blurb: 'The biggest operation anyone has built in this state.' },
];

export function groundLevel(game, abbr) {
  return game.ops?.[abbr] || 0;
}

export function groundBuildCost(game, abbr) {
  return build35SignageCost(game, { ...game }, abbr, groundSetupCost(abbr));
}

/** Price a sparse set of absolute levels against the current campaign. */
export function quoteGroundGamePlan(game, plan) {
  const validPlan = plan && typeof plan === 'object' && !Array.isArray(plan)
    && [Object.prototype, null].includes(Object.getPrototypeOf(plan));
  const malformed = validPlan ? Object.entries(plan).find(([, level]) =>
    !Number.isInteger(level) || level < 0 || level > GROUND_LEVELS.length) : null;
  const quote = quoteOpeningFieldPlan({ game, plan: validPlan && !malformed ? plan : {} });
  const errors = [...quote.errors];
  if (!validPlan) errors.push('Choose target levels for valid states.');
  else if (malformed) errors.push(`${malformed[0]} must have an integer level from 0 to 3.`);
  if (!game || game.finished || !isTraditionalStaffingReady(game.staffing)) errors.push('An active campaign with confirmed staff is required.');
  else if (decisionPending(game)) errors.push('Resolve the campaign decision before buying upgrades.');
  if (game && !Number.isFinite(game.funds)) errors.push('Campaign funds are unavailable.');
  const levelEntries = quote.levelEntries || [];
  const states = [...new Set(levelEntries.map(({ abbr }) => abbr))];
  const targets = states.map((abbr) => [abbr, groundLevel(game, abbr), plan[abbr]]);
  const addedWeeklyUpkeep = states.reduce((sum, abbr) =>
    sum + groundWeeklyCost(abbr, plan[abbr]) - groundWeeklyCost(abbr, groundLevel(game, abbr)), 0);
  return {
    ok: errors.length === 0,
    errors,
    cost: quote.cost,
    remainingFunds: quote.remainingFunds ?? 0,
    addedWeeklyUpkeep: Math.round(addedWeeklyUpkeep * 100) / 100,
    levelEntries,
    changedStates: states.length,
    confirmationKey: JSON.stringify([game?.build34CampaignId, game?.week, game?.funds, quote.cost, targets]),
  };
}

/** Commit the quoted batch once, without consuming weekly actions. */
export function purchaseGroundGame(game, requestedPlan, confirmationKey = null) {
  const singleState = typeof requestedPlan === 'string';
  const plan = singleState && game ? { [requestedPlan]: groundLevel(game, requestedPlan) + 1 } : requestedPlan;
  const quote = quoteGroundGamePlan(game, plan);
  if (!quote.ok || !quote.changedStates || (!singleState && confirmationKey !== quote.confirmationKey)) return game;
  const result = applyOpeningFieldPlan({ game, plan });
  if (!result.committed) return game;
  const targets = [...new Set(quote.levelEntries.map(({ abbr }) => abbr))];
  const summary = targets.map((abbr) => `${STATE_BY_ABBR[abbr].name} to level ${plan[abbr]}`).join(', ');
  const lastAction = `Expanded field operations: ${summary}`;
  return { ...result.game, lastAction, weekLog: [...(game.weekLog || []), lastAction] };
}

// Legacy callers can still read field levels and quotes. Weekly construction is retired.
export function investGround(game) {
  return game;
}

// ---------------------------------------------------------------------------
// Senate: the 34 Class 3 seats, riding the state's polling but damped.
// ---------------------------------------------------------------------------

// One binding of the presidential margin for every downballot model.
export function marginFn(game, result = false) {
  return (abbr) => (result ? resultMargin(abbr, game) : pollMargin(abbr, game));
}

export function senateMargin(state, game, result = false) {
  const race = SENATE_RACE_BY_STATE[state];
  if (!race) return 0;
  return raceMargin(state, 'senate', game, marginFn(game, result), result ? 'result' : 'poll');
}

export const senateSnapshot = (game, result = false) =>
  buildSenate(game, marginFn(game, result), result ? 'result' : 'poll');

export const houseSnapshot = (game, result = false) =>
  buildHouse(game, marginFn(game, result), result ? 'result' : 'poll');

export const govSnapshot = (game, result = false) =>
  buildGov(game, marginFn(game, result), result ? 'result' : 'poll');

export const downballotSnapshot = (game, result = false) =>
  buildDownballot(game, marginFn(game, result), result ? 'result' : 'poll');

// ---------------------------------------------------------------------------
// Election night: a slow, ordered reveal. States that count fast are called
// first; the slow counters come last, and the closest races come last of all.
// ---------------------------------------------------------------------------

export function buildNightPlan(game) {
  const snap = resultSnapshot(game);
  const senate = senateSnapshot(game, true);

  const buckets = { 1: [], 2: [], 3: [] };
  snap.rows.forEach((r) => {
    buckets[reportSpeed(r.abbr)].push(r);
  });
  const certain = (a, b) => Math.abs(b.margin) - Math.abs(a.margin);

  const steps = [];
  const push = (list, size) => {
    for (let i = 0; i < list.length; i += size) {
      steps.push({ states: list.slice(i, i + size).map((r) => r.abbr), senate: [] });
    }
  };
  push(buckets[1].sort(certain), 6);
  push(buckets[2].sort(certain), 5);
  push(buckets[3].sort(certain), 4);

  const races = senate.races.slice().sort(certain);
  races.forEach((r, i) => {
    const idx = Math.min(steps.length - 1, 1 + Math.floor((i / races.length) * (steps.length - 1)));
    if (steps[idx]) steps[idx].senate.push(r.state);
  });
  return steps;
}

const LEGACY_STORAGE_KEYS = ['election2028.save.v39', 'election2028.save.v38', 'election2028.save.v37', 'election2028.save.v36', 'election2028.save.v35', 'election2028.save.v2'];
export const STORAGE_KEY = 'election2028.save.v40';
const COMPRESSED_SAVE_PREFIX = 'b35:z1:';

export function encodeCampaignSave(game) {
  const raw = JSON.stringify(game);
  if (raw.length < 250000) return raw;
  const compressed = compressSync(strToU8(raw), { level: 1 });
  let binary = '';
  for (let offset = 0; offset < compressed.length; offset += 0x4000) {
    binary += String.fromCharCode(...compressed.subarray(offset, offset + 0x4000));
  }
  const packed = COMPRESSED_SAVE_PREFIX + btoa(binary);
  return packed.length < raw.length ? packed : raw;
}

function decodeCampaignSave(raw) {
  if (!raw.startsWith(COMPRESSED_SAVE_PREFIX)) return JSON.parse(raw);
  const bytes = Uint8Array.from(atob(raw.slice(COMPRESSED_SAVE_PREFIX.length)), (byte) => byte.charCodeAt(0));
  return JSON.parse(strFromU8(decompressSync(bytes)));
}

export function saveGame(game) {
  try {
    localStorage.setItem(STORAGE_KEY, encodeCampaignSave(game));
    return true;
  } catch (e) {
    return false;
  }
}

function sanitizeBuild34WeekRecords(value, validateReceipt) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([key, receipt]) => /^\d+$/.test(key) && Number(key) >= 1 && validateReceipt(receipt, Number(key)))
    .sort(([a], [b]) => Number(a) - Number(b))
    .slice(-30));
}

function restoreLegacyScandalRecap(loaded, context) {
  const outcome = loaded.outcome;
  const scandal = outcome?.scandal;
  const receipts = loaded.build40.decisionReceipts;
  if (!context || outcome?.presentation || !scandal || !Array.isArray(receipts)) return;
  if (!Object.hasOwn(SCANDAL_VOTE_LOSS, scandal.level) || !Number.isFinite(scandal.hit) || scandal.hit <= 0) return;

  const receipt = receipts.findLast((entry) => entry?.id === context.instanceId
    && entry.eventId === loaded.currentEventId && entry.choiceId === outcome.choiceId);
  const historicalScandal = Array.isArray(receipt?.effects) && receipt.effects.some((effect) =>
    effect?.kind === 'scandal' && !Object.hasOwn(effect, 'hidden'));
  if (!historicalScandal || receipt.scandal?.level !== scandal.level || receipt.scandal?.hit !== scandal.hit) return;

  // Build 43 stored the displayed scandal summary in the outcome, before presentation was saved.
  loaded.outcome = { ...outcome, presentation: { effects: [
    { text: `Scandal — ${scandal.level}. Momentum −${scandal.hit}.`, tone: 'negative' },
  ] } };
}

function migrateBuild40Decisions(loaded, parsed) {
  loaded.build40 = parsed.build40?.version === 1 ? { ...parsed.build40 } : {
    version: 1, fieldPlanCommitted: true, decisionReceipts: [],
  };
  if (!loaded.build40.modeId) loaded.build40.modeId = normalizeBuild40Mode(null, loaded).modeId;
  loaded.statePollReceipts = parsed.statePollReceipts && typeof parsed.statePollReceipts === 'object' ? parsed.statePollReceipts : {};
  loaded.aiStatePollReceipts = parsed.aiStatePollReceipts || {};
  loaded.usedEvents = [...new Set((loaded.usedEvents || []).map(build40EventId).filter((id) => DECISION_EVENTS_BY_ID[id]))];
  loaded.followUps = [];
  loaded.pendingInterrupts = [];
  loaded.currentInterrupt = null;
  if (parsed.build40?.version !== 1) {
    loaded.build34AiCurrentEventId = null;
    loaded.build34AiCurrentEventData = null;
    loaded.build34AiPlanReceipts = (loaded.build34AiPlanReceipts || []).filter((receipt) => !receipt.eventContext);
  }
  loaded.eventSchedule = (loaded.eventSchedule || []).map((entry) => {
    const id = build40EventId(entry.id || entry.event?.id);
    return DECISION_EVENTS_BY_ID[id] && entry.status !== 'pending'
      ? { status: entry.status, id, afterActions: entry.afterActions }
      : { status: entry.status === 'dispatched' ? 'retired' : entry.status, afterActions: entry.afterActions };
  });
  const saved = parsed.currentEventData;
  const id = build40EventId(parsed.currentEventId || saved?.id);
  const definition = DECISION_EVENTS_BY_ID[id];
  if (!definition) {
    loaded.currentEventId = null;
    loaded.currentEventData = null;
    loaded.eventWhy = null;
    return;
  }
  if (definition.candidateId) {
    const ticket = activeCandidateTickets(loaded).find(({ candidateId, party }) =>
      candidateId === definition.candidateId && party === saved?.context?.actingParty);
    const context = saved?.context;
    const current = ticket ? candidateDecisionView(loaded, { definition, ...ticket }) : null;
    if (!current || context?.candidateEventKey !== current.context.candidateEventKey
      || context.instanceId !== context.candidateEventKey || context.candidateId !== definition.candidateId
      || !STATE_BY_ABBR[context.stateId]
      || !scenarioBallotAccess(loaded.build39?.scenario?.id, 'president', context.stateId, ticket.party)
      || (!loaded.outcome && loaded.candidateEvents.resolvedKeys.includes(context.candidateEventKey))) {
      Object.assign(loaded, retireInvalidDecision(loaded));
      return;
    }
    // Keep the state and committed instance selected before saving.
    loaded.currentEventId = id;
    loaded.currentEventData = { ...build40DecisionView(loaded, definition, context,
      ticket.party === loaded.party ? loaded.funds : loaded.aiFunds?.[ticket.party] || 0),
      kicker: current.kicker, why: current.why };
    loaded.eventWhy = current.why;
    return;
  }
  const actingParty = build40ActingParty(loaded, definition);
  const sourceId = saved?.sourceReceiptId || saved?.starterReceiptId;
  const sources = build40IncidentSources(loaded);
  if (auditedReceiptEvent(id) && !loaded.outcome) {
    const source = sources.find(({ id }) => id === sourceId);
    const context = saved?.context;
    const selectedWeek = context?.selectionWeek ?? parsed.week;
    const stateId = context?.stateId || saved?.starterStateId || saved?.stateId || saved?.state;
    if (!stateId || (parsed.candidateEvents?.version === 1 && context?.selectionWeek !== undefined && !context.evidence)
      || (context?.sourceReceiptId && context.sourceReceiptId !== sourceId)
      || !validSelectionReceipt(loaded, id, source, { selectionWeek: selectedWeek, stateId, evidence: context?.evidence })) {
      Object.assign(loaded, retireInvalidDecision(loaded));
      return;
    }
    // Old valid queued cards gain selection-time evidence without choosing a new target.
    const restored = context?.instanceId ? context : build40DecisionContext({ ...loaded, week: selectedWeek }, definition, source, actingParty);
    loaded.currentEventId = id;
    loaded.currentEventData = build40DecisionView(loaded, definition,
      { ...restored, selectionWeek: selectedWeek, evidence: context?.evidence || selectionEvidence(source) },
      actingParty === loaded.party ? loaded.funds : loaded.aiFunds?.[actingParty] || 0);
    loaded.eventWhy = loaded.currentEventData.why;
    return;
  }
  const incident = sources.find(({ id }) => id === sourceId)
    || build40DecisionEligibility(loaded, definition, { actingParty, receipts: sources });
  const legacyCurrent = parsed.build40?.version !== 1 && saved && build40EventId(saved.id) === id;
  const legacySource = legacyCurrent ? { id: sourceId || 'legacy-pending:' + id + ':' + loaded.week,
    stateId: saved.starterStateId || saved.stateId || saved.state || loaded.outcome?.sourceStateId,
    recap: saved.receiptRecap || saved.why || null,
  } : null;
  const context = saved?.context?.instanceId && STATE_BY_ABBR[saved.context.stateId] ? saved.context
    : incident === false && !loaded.outcome && !legacySource ? null
      : build40DecisionContext(loaded, definition, incident || legacySource, actingParty);
  loaded.currentEventId = context ? id : null;
  loaded.currentEventData = context ? build40DecisionView(loaded, definition, context,
    actingParty === loaded.party ? loaded.funds : loaded.aiFunds?.[actingParty] || 0) : null;
  loaded.eventWhy = loaded.currentEventData?.why || null;
  restoreLegacyScandalRecap(loaded, context);
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find((save) => save != null);
    if (!raw) return null;
    const parsed = decodeCampaignSave(raw);
    if (!parsed?.candidateId) return null;
    // Existing local saves keep working after replacing the former field candidate.
    if (parsed.candidateId === 'ramaswamy') parsed.candidateId = 'burlison';
    if (parsed.opponentId === 'ramaswamy') parsed.opponentId = 'burlison';
    ensureBuild34RuntimeCatalogs();
    const loaded = {
    factionMilestones: Array.isArray(parsed.factionMilestones) ? [...new Set(parsed.factionMilestones.filter((key) => typeof key === 'string'))] : [],
    factionCrises: parsed.factionCrises && typeof parsed.factionCrises === 'object' ? parsed.factionCrises : {},
    incomeBoost: parsed.incomeBoost && Number.isFinite(parsed.incomeBoost.amount) && Number.isFinite(parsed.incomeBoost.weeks)
      ? { amount: Math.max(0, Math.min(4, parsed.incomeBoost.amount)), weeks: Math.max(0, Math.min(4, Math.floor(parsed.incomeBoost.weeks))) }
      : null,
      ...parsed,
      actionsLeft: parsed.actionsLeft ?? ACTIONS_PER_WEEK,
      momentumPersuasionUsed: Number.isFinite(parsed.momentumPersuasionUsed)
        ? Math.max(0, parsed.momentumPersuasionUsed)
        : 0,
      weekLog: parsed.weekLog || [],
      history: parsed.history || [],
      debate: parsed.debate || null,
      debatePrep: parsed.debatePrep || 0,
      stances:
        parsed.stances ||
        stancesFor(CANDIDATE_BY_ID[parsed.candidateId] || { id: parsed.candidateId, party: parsed.party }),
      oppStances:
        parsed.oppStances ||
        stancesFor(
          CANDIDATE_BY_ID[parsed.opponentId] || {
            id: parsed.opponentId,
            party: parsed.party === 'dem' ? 'rep' : 'dem',
          }
        ),
      issueEdge: parsed.issueEdge || {},
      flips: parsed.flips || 0,
      oppMoves: parsed.oppMoves || [],
      lastOutside: parsed.lastOutside || null,
      perceivedCorruptionScore: Number.isFinite(parsed.perceivedCorruptionScore)
        ? clamp(parsed.perceivedCorruptionScore, 0, 100)
        : 25,
      build34CampaignId: typeof parsed.build34CampaignId === 'string' && parsed.build34CampaignId.trim()
        ? parsed.build34CampaignId
        : `legacy:${parsed.candidateId}:${parsed.startId || DEFAULT_START}`,
      build34AppliedEventEffectIds: Array.isArray(parsed.build34AppliedEventEffectIds)
        ? [...new Set(parsed.build34AppliedEventEffectIds.filter((id) => typeof id === 'string' && id.length <= 240))]
        : [],
      build34ExtraWeeklyUpkeepByState: Object.fromEntries(Object.entries(parsed.build34ExtraWeeklyUpkeepByState || {})
        .filter(([abbr, amount]) => STATE_BY_ABBR[abbr] && Number.isFinite(Number(amount)))
        .map(([abbr, amount]) => [abbr, Math.max(0, Math.min(20, Number(amount)))])),
      build34ProxyCampaigners: Array.isArray(parsed.build34ProxyCampaigners)
        ? parsed.build34ProxyCampaigners.filter((proxy) => proxy?.id && proxy?.personId &&
          PARTY_ORDER.includes(proxy.party) && proxy.isRealFigure === true)
        : PARTY_ORDER.map(startingProxyForParty).filter(Boolean),
      build34ProxyVisitsByPartyState: Object.fromEntries(PARTY_ORDER.map((party) => [
        party,
        Object.fromEntries(Object.entries(parsed.build34ProxyVisitsByPartyState?.[party] || {})
          .filter(([abbr, count]) => STATE_BY_ABBR[abbr] && Number.isFinite(Number(count)))
          .map(([abbr, count]) => [abbr, Math.max(0, Number(count))])),
      ])),
      build34ProxyReceiptsByWeek: sanitizeBuild34WeekRecords(parsed.build34ProxyReceiptsByWeek, (receipt, week) =>
        Array.isArray(receipt?.visits) && receipt.visits.every((visit) =>
          visit?.visitId && PARTY_ORDER.includes(visit.party) && STATE_BY_ABBR[visit.stateId]) && Number(receipt.week) === week),
      build34SuperPacReceiptsByWeek: sanitizeBuild34WeekRecords(parsed.build34SuperPacReceiptsByWeek, (receipt, week) =>
        (Array.isArray(receipt?.aggregates) || Array.isArray(receipt?.ads)) && receipt.digest && Number(receipt.week) === week),
      build34EndorserRelationships: Object.fromEntries(Object.entries(parsed.build34EndorserRelationships || {})
        .filter(([id, score]) => ENDORSER_ROSTER.some((group) => group.id === id && group.party === parsed.party) && Number.isFinite(Number(score)))
        .map(([id, score]) => [id, clamp(Number(score), 0, 100)])),
      build34EndorserMemories: Object.fromEntries(Object.entries(parsed.build34EndorserMemories || {})
        .filter(([id, memories]) => ENDORSER_ROSTER.some((group) => group.id === id && group.party === parsed.party) && Array.isArray(memories))
        .map(([id, memories]) => [id, memories.filter((memory) => memory && typeof memory.issueId === 'string').slice(-6)])),
      build34EndorserRegistry: Object.fromEntries(Object.entries(parsed.build34EndorserRegistry || {})
        .filter(([id, record]) => ENDORSER_ROSTER.some((group) => group.id === id) && record?.candidateId && Number.isInteger(Number(record.week)))),
      build34EndorserTurnoutEarnedByState: Object.fromEntries(Object.entries(parsed.build34EndorserTurnoutEarnedByState || {})
        .filter(([abbr, amount]) => STATE_BY_ABBR[abbr] && Number.isFinite(Number(amount)))
        .map(([abbr, amount]) => [abbr, Math.max(0, Math.min(10, Number(amount)))])),
      build34EndorserPersuasionEarnedByState: Object.fromEntries(Object.entries(parsed.build34EndorserPersuasionEarnedByState || {})
        .filter(([abbr, amount]) => STATE_BY_ABBR[abbr] && Number.isFinite(Number(amount)))
        .map(([abbr, amount]) => [abbr, Math.max(0, Math.min(1, Number(amount)))])),
      build34IssueAdCredits: Array.isArray(parsed.build34IssueAdCredits)
        ? parsed.build34IssueAdCredits.filter((credit) => credit?.id && ISSUE_BY_ID[credit.issueId] && Number(credit.usesRemaining) > 0)
        : [],
      build34AppliedEndorsementIds: Array.isArray(parsed.build34AppliedEndorsementIds)
        ? [...new Set(parsed.build34AppliedEndorsementIds.filter((id) => ENDORSER_ROSTER.some((group) => group.id === id)))]
        : [],
      build34EndorsementReceiptsByWeek: sanitizeBuild34WeekRecords(parsed.build34EndorsementReceiptsByWeek, (receipt, week) =>
        Number(receipt.week) === week && Array.isArray(receipt.announcements) && Array.isArray(receipt.effectCommands)),
      build34EndorsementGroupModsByState: Object.fromEntries(Object.entries(parsed.build34EndorsementGroupModsByState || {})
        .filter(([abbr, mods]) => STATE_BY_ABBR[abbr] && mods && typeof mods === 'object' && !Array.isArray(mods))
        .map(([abbr, mods]) => [abbr, Object.fromEntries(Object.entries(mods)
          .filter(([groupId, amount]) => ['far left', 'populistleft', 'religiousleft', 'liberal', 'moderate', 'religiousright', 'conservative', 'populistright', 'libertarian'].includes(groupId) && Number.isFinite(Number(amount)))
          .map(([groupId, amount]) => [groupId, Number(amount)]))])),
      build34OutsideCampaignReceiptsByWeek: sanitizeBuild34WeekRecords(parsed.build34OutsideCampaignReceiptsByWeek, (receipt, week) =>
        Number(receipt.week) === week && Number.isFinite(Number(receipt.proxyVisitCount)) && receipt.superPacDigest),
      lastPromise: parsed.lastPromise || null,
      fundraising: parsed.fundraising || {},
      fundraisingFatigue: parsed.fundraisingFatigue || {},
      factions: parsed.factions || initialFactions(parsed.party, parsed.candidateId),
      endorsements: sanitizeEndorsements(parsed.endorsements),
      promiseLedger: Array.isArray(parsed.promiseLedger) ? parsed.promiseLedger : [],
      strategyProfile: parsed.strategyProfile || { stateActions: {}, issueFocus: {}, messages: [] },
      lastShift: parsed.lastShift || null,
      adBackfire: parsed.adBackfire || null,
      stories: parsed.stories || [],
      spins: parsed.spins || {},
      lastSpin: parsed.lastSpin || null,
      followUps: parsed.followUps || [],
      eventWhy: parsed.eventWhy || null,
      currentEventData: parsed.currentEventData || null,
      sittingPresidentId: typeof parsed.sittingPresidentId === 'string' ? parsed.sittingPresidentId : 'trump',
      vanceSuccessionPart: Math.max(0, Math.min(VANCE_SUCCESSION_PART_EFFECTS.length, Math.floor(Number(parsed.vanceSuccessionPart) || 0))),
      vanceSuccessionStarted: !!parsed.vanceSuccessionStarted,
      vanceSuccessionDeliveredWeek: Number.isInteger(parsed.vanceSuccessionDeliveredWeek) ? parsed.vanceSuccessionDeliveredWeek : null,
      vanceSuccessionAppliedParts: Array.isArray(parsed.vanceSuccessionAppliedParts) ? parsed.vanceSuccessionAppliedParts.filter((part) => Number.isInteger(part) && part >= 1 && part <= VANCE_SUCCESSION_PART_EFFECTS.length) : [],
      vanceSuccessionEffects: parsed.vanceSuccessionEffects && typeof parsed.vanceSuccessionEffects === 'object' ? { moderate: Number(parsed.vanceSuccessionEffects.moderate) || 0, magaLoss: Number(parsed.vanceSuccessionEffects.magaLoss) || 0, turnoutLoss: Number(parsed.vanceSuccessionEffects.turnoutLoss) || 0 } : { moderate: 0, magaLoss: 0, turnoutLoss: 0 },
      currentInterrupt: parsed.currentInterrupt || null,
      eventSchedule: Array.isArray(parsed.eventSchedule) ? parsed.eventSchedule : [],
      eventScheduleIndex: Number.isInteger(parsed.eventScheduleIndex) ? parsed.eventScheduleIndex : (parsed.currentEventId ? 0 : -1),
      eventScheduleWeek: Number.isInteger(parsed.eventScheduleWeek) ? parsed.eventScheduleWeek : null,
      decisionEventCount: Number.isInteger(parsed.decisionEventCount) ? parsed.decisionEventCount : 0,
      decisionEventDispatchedCount: Number.isInteger(parsed.decisionEventDispatchedCount)
        ? parsed.decisionEventDispatchedCount
        : Math.max(0, (parsed.eventScheduleIndex ?? -1) + 1),
      eventScheduleShortfall: Math.max(0, Number(parsed.eventScheduleShortfall) || 0),
      incidentLedger: Array.isArray(parsed.incidentLedger) ? parsed.incidentLedger.slice(-150) : [],
      incidentSequence: Number.isFinite(parsed.incidentSequence) ? Math.max(0, parsed.incidentSequence) : (parsed.incidentLedger || []).length,
      rivalIncidentNewsCard: parsed.rivalIncidentNewsCard || null,
      rivalIncidentNewsReceiptIds: Array.isArray(parsed.rivalIncidentNewsReceiptIds) ? parsed.rivalIncidentNewsReceiptIds : [],
      pendingInterrupts: Array.isArray(parsed.pendingInterrupts) ? parsed.pendingInterrupts : [],
      triggeredEventOnceKeys: Array.isArray(parsed.triggeredEventOnceKeys)
        ? parsed.triggeredEventOnceKeys
        : [
            ...(parsed.pendingInterrupts || []).map((item) => item.onceKey || item.event?.onceKey),
            parsed.currentEventData?.onceKey,
          ].filter(Boolean),
      worldNews: parsed.worldNews || {},
      worldShift: parsed.worldShift || {},
      salience: parsed.salience || {},
      worldRecent: parsed.worldRecent || [],
      turnout: loadTurnout(parsed.turnout),
      pMomentum: { lib: 50, grn: 50, ...(parsed.pMomentum || {}) },
      demographicMods: parsed.demographicMods || {},
      ops: parsed.ops || {},
      groundGameAccumulatedByState: Object.fromEntries(Object.entries(parsed.groundGameAccumulatedByState || {})
        .filter(([abbr, margin]) => STATE_BY_ABBR[abbr] && Number.isFinite(Number(margin)))
        .map(([abbr, margin]) => [abbr, Math.max(0, Math.min(BUILD34_BALANCE.groundGameStateMarginCap, Number(margin)))])),
      groundGameResolvedWeeks: Array.isArray(parsed.groundGameResolvedWeeks)
        ? [...new Set(parsed.groundGameResolvedWeeks.map(String).filter((week) => /^\d+$/.test(week)))]
        : [],
      scandals: parsed.scandals || [],
      // A save made before election night carries no miss at all: it cannot be
      // known until the votes are in, and a finished save keeps the one it was
      // counted with.
      pollMiss: parsed.finished
        ? parsed.pollMiss || rollPollMiss(DIFFICULTIES[parsed.difficultyId]?.missScale ?? 1)
        : null,
      // The national desk and the state environments. A save opened from before
      // they existed starts quiet, and the next week deals a card as usual.
      stateGeneric: parsed.stateGeneric || {},
      natGeneric: Number.isFinite(parsed.natGeneric)
        ? parsed.natGeneric
        : genericAverage({ stateGeneric: parsed.stateGeneric || {} }),
      genericBaseline: Number.isFinite(parsed.genericBaseline)
        ? parsed.genericBaseline
        : Number.isFinite(parsed.natGeneric)
          ? parsed.natGeneric
          : genericAverage({ stateGeneric: parsed.stateGeneric || {} }),
      startingNationalGeneric: Number.isFinite(parsed.startingNationalGeneric)
        ? parsed.startingNationalGeneric
        : Number.isFinite(parsed.natGeneric)
          ? parsed.natGeneric
          : genericAverage({ stateGeneric: parsed.stateGeneric || {} }),
      genericSwingDiagnostics: parsed.genericSwingDiagnostics || [],
      natNews: parsed.natNews || null,
      natNewsSeen: parsed.natNewsSeen ?? true,
      natNewsLog: parsed.natNewsLog || [],
      fourPartyNationalNewsLog: parsed.fourPartyNationalNewsLog || [],
      fourPartyNationalCard: parsed.fourPartyNationalCard || null,
      arc: parsed.arc || null,
      arcEnded: parsed.arcEnded || null,
      senateStart: parsed.senateStart || rollSenateStart(),
      senateNoise: parsed.senateNoise || {},
      track: parsed.track || 0,
      thirdMode: parsed.thirdMode || 'fringe',
      electoralAlliance: parsed.electoralAlliance || null,
      electoralAllianceResolved: !!parsed.electoralAllianceResolved,
      fatigue: parsed.fatigue || emptyFatigue(),
      totalFatigue: parsed.totalFatigue || {},
      startId: parsed.startId || DEFAULT_START,
      totalWeeks: parsed.totalWeeks || TOTAL_WEEKS,
      popularVote: !!parsed.popularVote,
      houseRule: ['standard', 'pr', 'mmp'].includes(parsed.houseRule) ? parsed.houseRule : 'standard',
      electoralRule: ['standard', 'proportional', 'district'].includes(parsed.electoralRule) ? parsed.electoralRule : 'standard',
      randomness: parsed.randomness || 0,
      thirdMods: parsed.thirdMods || { lib: {}, grn: {} },
      fourPartyNews: parsed.fourPartyNews || {},
      rivals: parsed.rivals || [],
      thirdVariance: parsed.thirdVariance || rollThirdBoard().thirdVariance,
      thirdTilt: parsed.thirdTilt || rollThirdBoard().thirdTilt,
      raceQuality: parsed.raceQuality || rollRaceQuality(),
      dbMods: parsed.dbMods || {},
      downballotNews: parsed.downballotNews || { senate: {}, house: {}, gov: {} },
      indieSenate: parsed.indieSenate || { ND: false, SD: false, ID: false },
      mcmullin: parsed.mcmullin !== false,
      baseStateGeneric: parsed.baseStateGeneric || { ...(parsed.stateGeneric || {}) },
      coattailByState: parsed.coattailByState || {},
      coattailResolvedWeeks: Array.isArray(parsed.coattailResolvedWeeks) ? parsed.coattailResolvedWeeks : [],
      coattailModelVersion: parsed.coattailModelVersion ?? 0,
      nickBronzeSnapshot: parsed.nickBronzeSnapshot || null,
      houseStart: houseStartRoll(),
      govStart: parsed.govStart
        ? {
            ...parsed.govStart,
            dem: Math.max(0, Math.min(50, parsed.govStart.dem || 24)),
            rep: Math.max(0, Math.min(50, 50 - (parsed.govStart.dem || 24))),
            other: 0,
          }
        : govStartRoll(),
      opponentParty:
        parsed.opponentParty ||
        CANDIDATE_BY_ID[parsed.opponentId]?.party ||
        (parsed.party === 'dem' ? 'rep' : 'dem'),
      // Preserve existing balances exactly. A legacy save that predates the
      // AI ledger starts the newly tracked campaigns at zero rather than
      // receiving a second campaign-start bankroll during migration.
      aiFunds: Object.fromEntries(PARTY_ORDER.map((party) => [
        party,
        party === parsed.party ? 0 : Math.max(0, Number.isFinite(parsed.aiFunds?.[party]) ? parsed.aiFunds[party] : 0),
      ])),
      aiDebatePrep: Math.max(0, Math.min(3, Number(parsed.aiDebatePrep) || 0)),
      aiLastFundraiserWeek: Number.isInteger(parsed.aiLastFundraiserWeek) ? parsed.aiLastFundraiserWeek : null,
      aiFinanceLog: Array.isArray(parsed.aiFinanceLog) ? parsed.aiFinanceLog.slice(-40) : [],
      aiFactions: parsed.aiFactions || {},
      aiIncome: parsed.aiIncome || {},
      ballotMeasures: sanitizeBallotMeasures(parsed.ballotMeasures, parsed.ballotMeasureRules || BALLOT_MEASURE_RULES).measures,
      ballotMeasureRules: Array.isArray(parsed.ballotMeasureRules) ? parsed.ballotMeasureRules : [],
      ballotMeasureRulesVersion: Number.isInteger(parsed.ballotMeasureRulesVersion)
        ? parsed.ballotMeasureRulesVersion
        : BALLOT_MEASURE_RULES_VERSION,
      weeklyBaseIncomeDraw: Number.isFinite(parsed.weeklyBaseIncomeDraw) ? parsed.weeklyBaseIncomeDraw : null,
      weeklyIncomeWeek: Number.isInteger(parsed.weeklyIncomeWeek) ? parsed.weeklyIncomeWeek : null,
      weeklyAIIncomeDraws: parsed.weeklyAIIncomeDraws && Object.values(parsed.weeklyAIIncomeDraws).some(Number.isFinite)
        ? Object.fromEntries(PARTY_ORDER.filter((party) => party !== parsed.party).map((party) => [
            party,
            Number.isFinite(parsed.weeklyAIIncomeDraws?.[party]) ? parsed.weeklyAIIncomeDraws[party] : 0,
          ]))
        : null,
      weeklyAIIncomeDrawsWeek: Number.isInteger(parsed.weeklyAIIncomeDrawsWeek)
        ? parsed.weeklyAIIncomeDrawsWeek
        : null,
      aiPerks: parsed.aiPerks || {},
      aiOps: parsed.aiOps || {},
      freeOps: parsed.freeOps || {},
      campaignPerks: parsed.campaignPerks
        ? { freeVolunteerOps: 0, freeAdIssues: [], ...parsed.campaignPerks }
        : { nextAdMultiplier: 1, nextAdIssue: null, freeAds: 0, freeAdIssues: [], freeVolunteerOps: 0 },
    };
    const aiFactionState = (party, nomineeId) => {
      const defaults = initialFactions(party, nomineeId);
      const saved = parsed.aiFactions?.[party] || {};
      return Object.fromEntries(Object.entries(defaults).map(([id, value]) => [
        id,
        Number.isFinite(saved[id]) ? clamp(saved[id], 0, 100) : value,
      ]));
    };
    loaded.aiFactions = Object.fromEntries(PARTY_ORDER.map((party) => {
      const nomineeId = party === loaded.party
        ? loaded.candidateId
        : party === loaded.opponentParty
          ? loaded.opponentId
          : byParty(party).slice().sort((a, b) => b.weight - a.weight)[0]?.id || null;
      return [party, aiFactionState(party, nomineeId)];
    }));
    if (MAIN_GAME_ENDORSEMENTS_ENABLED) loaded.build34EndorserRelationships = {
      ...initialEndorserRelationships({
        party: loaded.party,
        stances: loaded.stances,
        factionStandings: factionStandings(loaded),
      }),
      ...loaded.build34EndorserRelationships,
    };
    // The baseline preserves the old national-track timing; the display value
    // always reflects the saved state ballot, including news already dealt.
    loaded.natGeneric = genericAverage(loaded);
    // A campaign saved before the other tickets named their running mates gets
    // them the moment it is reopened.
    if (!loaded.oppMates) loaded.oppMates = chooseOpponentMates(loaded);
    // A campaign saved before the drag existed opens from wherever it stands:
    // the baselines are read off this morning, and nothing has been dragged yet.
    loaded.dragMods = loaded.dragMods || {};
    loaded.dbDrag = loaded.dbDrag || {};
    loaded.campaignTrail =
      loaded.campaignTrail?.week === loaded.week ? loaded.campaignTrail : { week: loaded.week, entries: [] };
    loaded.weekStartMap = loaded.weekStartMap || {};
    if (!Object.keys(loaded.weekStartMap).length) {
      loaded.weekStartMap = Object.fromEntries(
        snapshot(loaded).rows.map((row) => [row.abbr, { margin: row.margin, shares: { ...row.shares } }])
      );
    }
    if (!loaded.raceBaseline) loaded.raceBaseline = raceBaselines(loaded);
    // A save from before turnout was kept per party had one number per state;
    // it is rebuilt from the map, and the nominees' machines are re-applied.
    if (!parsed.turnout || typeof parsed.turnout[STATES[0].abbr] !== 'object') applyCandidateTurnout(loaded);
    const activePacWeek = Number(loaded.week) + 1;
    const legacyPac = loaded.build34SuperPacReceiptsByWeek?.[activePacWeek];
    if (legacyPac && legacyPac.schemaVersion !== SUPER_PAC_AGGREGATE_SCHEMA_VERSION) {
      loaded.build34SuperPacReceiptsByWeek[activePacWeek] = convertLegacySuperPacWeekReceipt(legacyPac, {
        campaignId: loaded.build34CampaignId, weekNumber: activePacWeek,
      });
    }
    loaded.build38 = parsed.build38?.version === 1 ? parsed.build38 : { version: 1, votingRuleId: 'current', openingModel: false };
    loaded.build39 = parsed.build39?.version === 1 && parsed.build39.scenario?.version === 1
      ? parsed.build39 : { version: 1, scenario: initializeScenarioState() };
    const savedBuild45 = parsed.build45?.version === 1 ? parsed.build45 : null;
    const savedHousePvi = savedBuild45?.housePviRevision === BUILD45_HOUSE_PVI_REVISION;
    const savedClasses = savedBuild45?.legislatureClassRevision === BUILD45_LEGISLATURE_CLASS_REVISION;
    if (savedHousePvi || savedClasses) {
      loaded.build45 = { version: 1,
        ...(savedHousePvi ? { housePviRevision: BUILD45_HOUSE_PVI_REVISION } : {}),
        ...(savedClasses ? { legislatureClassRevision: BUILD45_LEGISLATURE_CLASS_REVISION } : {}) };
    } else delete loaded.build45;
    loaded.earlyBallotLedger = restoreEarlyBallots(loaded, parsed.earlyBallotLedger);
    if (!loaded.finished) loaded.electionModelVersion = ELECTION_MODEL_VERSION;
    for (const field of ['staffActionReceipts', 'staffBriefingRecommendations', 'staffUpkeepReceiptIds', 'staffContractEffectReceiptIds', 'build35EventChoiceReceiptIds']) {
      loaded[field] = Array.isArray(loaded[field]) ? loaded[field] : [];
    }
    const activeAdvisors = new Set(loaded.staffing.traditionalActiveIds);
    loaded.staffing.agendaByWeek = Object.fromEntries(Object.entries(loaded.staffing.agendaByWeek).filter(([, agenda]) =>
      agenda.actionId !== 'endorsement' || agenda.status === 'consumed'));
    loaded.candidateEvents = candidateEventState(parsed.candidateEvents);
    migrateBuild40Decisions(loaded, parsed);
    loaded.staffBriefingRecommendations = loaded.staffBriefingRecommendations.filter((entry) => activeAdvisors.has(entry?.staffId) && entry.actionId !== 'endorsement');
    for (const field of ['staff', 'staffAgendaByWeek', 'staffBriefHistory', 'staffHireReceipts']) delete loaded[field];
    loaded.incidentProvenanceVersion = 2;
    return loaded.eventScheduleWeek === loaded.week ? advanceDecisionEvent(loaded) : loaded;
  } catch (e) {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.setItem(STORAGE_KEY, '');
  } catch (e) {
    /* ignore */
  }
}
