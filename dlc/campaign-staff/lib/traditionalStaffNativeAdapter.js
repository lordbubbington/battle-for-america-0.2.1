import { ISSUES_BY_WEIGHT } from '@/data/platform';
import { volunteerPrice } from '@/lib/build38Runtime';
import { ENDORSER_ROSTER } from '@/data/endorserRoster';
import { MAIN_GAME_ENDORSEMENTS_ENABLED } from '@/lib/endorsementRemoval.mjs';
import { STATE_BY_ABBR } from '@/data/states';
import { TRADITIONAL_STAFF_BY_ID } from '@/data/traditionalStaffRoster';
import { actionsLeftIn, adOutlook, decisionPending, expensesFor, freeAdsForIssue, groundBuildCost, fundraiseOutlook, groundLevel, houseSnapshot, promiseOutlook, snapshot } from '@/lib/gameEngine';
import { groundWeeklyCost } from '@/lib/fieldOperations';
import { normalizeElectionOptions } from '@/lib/electionRuleResolvers';
import { endorsementEligibility } from '@/lib/campaignOrganizationRules';
import { initialEndorserRelationships } from '@/lib/endorsementNetwork';
import { factionStandings } from '@/lib/factions';
import { spinCost } from '@/lib/news';
import { turnoutOf } from '@/lib/turnout';
import { buildStaffBriefing, isTraditionalStaffingReady } from '@/lib/traditionalStaffRules';

export const NATIVE_STAFF_REASON_SCHEMA_VERSION = 1;
export const NATIVE_STAFF_REASON_CODES = Object.freeze({
  'public-poll-share-gap': 'snapshot.rows[].shares',
  'native-party-turnout': 'turnoutOf',
  'field-operation-not-maxed': 'groundLevel and groundSetupCost',
  'native-donor-room-outlook': 'fundraiseOutlook',
  'native-promise-outlook': 'promiseOutlook',
  'native-endorsement-outreach': 'endorsementEligibility and existing relationship',
  'native-digital-ad-outlook': 'adOutlook',
  'native-press-story': 'saved story and spinCost',
  'public-elector-threshold': 'snapshot.rows[].shares and normalizeElectionOptions',
  'public-house-vote-share': 'houseSnapshot.states[].shares and normalizeElectionOptions',
  'public-house-district-poll': 'houseSnapshot.districts[].shares with a sourced baseline',
});

function closestSourcedDistricts(districts, party) {
  const byState = new Map();
  for (const district of districts || []) {
    const own = district.shares?.[party];
    const rival = Math.max(...Object.entries(district.shares || {})
      .filter(([id, share]) => id !== party && Number.isFinite(share)).map(([, share]) => share));
    if (!Number.isFinite(district.sourceYear) || !Number.isFinite(own) || !Number.isFinite(rival)) continue;
    const gap = Math.abs(own - rival);
    const prior = byState.get(district.state);
    if (!prior || gap < prior.gap) byState.set(district.state, { id: district.id, gap });
  }
  return byState;
}

function publicRulePriority(row, own, closestRival, rules, game, houseRow, district) {
  const gap = Math.abs(own - closestRival);
  const threshold = rules.thresholdPercent;
  const evidence = {
    staffPriorityScore: -gap,
    reasonCodes: ['public-poll-share-gap'],
    reasonSummary: `Your party has ${own.toFixed(1)}% in the state poll. The leading rival has ${closestRival.toFixed(1)}%.`,
  };
  if (game.popularVote && Number.isFinite(row.cast)) {
    evidence.staffPriorityScore = row.cast * own / 100;
    evidence.reasonSummary += ' The national popular vote decides this election.';
  }
  if (rules.electoralCollegeRule === 'proportional') {
    evidence.reasonCodes.push('public-elector-threshold');
    evidence.reasonSummary += ` The state threshold for proportional electors is ${threshold}%.`;
    if (!game.popularVote) {
      evidence.staffPriorityScore = ['lib', 'grn'].includes(game.party) ? -Math.abs(own - threshold) : own;
    }
  }
  const houseShare = houseRow?.shares?.[game.party];
  if (rules.houseRule !== 'district' && Number.isFinite(houseShare)) {
    evidence.reasonCodes.push('public-house-vote-share');
    evidence.reasonSummary += ` The state House projection has ${houseShare.toFixed(1)}% for your party. Eligibility for proportional seats uses a ${threshold}% national threshold${rules.houseRule === 'mmp' ? ' or three district wins' : ''}.`;
    if (!game.popularVote && rules.electoralCollegeRule === 'winner-take-all') evidence.staffPriorityScore = houseShare;
  }
  if (district) {
    evidence.reasonCodes.push('public-house-district-poll');
    evidence.reasonSummary += ` The closest sourced district, ${district.id}, separates your party and its leading rival by ${district.gap.toFixed(1)} points.`;
    if (!game.popularVote) evidence.staffPriorityScore = -district.gap;
  }
  return evidence;
}

export function buildStaffOperationalWarnings(game, { staffing = game?.staffing, proposedActionCost = 0 } = {}) {
  if (!isTraditionalStaffingReady(staffing) || !staffing.traditionalActiveIds.includes('operations')) {
    return { status: 'unavailable', reason: 'operations-manager-not-active', warnings: [] };
  }
  if (!Number.isFinite(game?.funds) || !Number.isFinite(proposedActionCost) || proposedActionCost < 0
      || !game.ops || typeof game.ops !== 'object' || Array.isArray(game.ops)
      || Object.entries(game.ops).some(([stateId, level]) => !STATE_BY_ABBR[stateId] || !Number.isFinite(level) || level < 0 || level > 3)
      || Object.values(game.build34ExtraWeeklyUpkeepByState || {}).some((amount) => !Number.isFinite(amount) || amount < 0)) {
    return { status: 'unavailable', reason: 'finance-input-unavailable', warnings: [] };
  }
  const expenses = expensesFor(game);
  if (!Number.isFinite(expenses)) return { status: 'unavailable', reason: 'weekly-expenses-unavailable', warnings: [] };
  const warnings = [];
  const affordable = proposedActionCost <= game.funds;
  if (!affordable) warnings.push({
    code: 'action-unaffordable', funds: game.funds, proposedActionCost,
    message: `This action costs $${proposedActionCost.toFixed(1)}M; current cash is $${game.funds.toFixed(1)}M.`,
  });
  const availableFunds = affordable ? game.funds - proposedActionCost : game.funds;
  if (availableFunds < expenses) warnings.push({
    code: 'current-cash-below-weekly-expenses', fundsAfterAction: availableFunds, weeklyExpenses: expenses,
    message: `${affordable && proposedActionCost > 0 ? 'Cash after this action' : 'Current cash'} would be $${availableFunds.toFixed(1)}M against a $${expenses.toFixed(1)}M weekly bill. Future income may cover the difference.`,
  });
  const actionsLeft = actionsLeftIn(game);
  if (Number.isFinite(actionsLeft) && actionsLeft > 0) warnings.push({
    code: 'unused-actions-expire-on-advance', actionsLeft,
    message: `${actionsLeft} campaign action${actionsLeft === 1 ? '' : 's'} remain; unused actions expire when the week advances.`,
  });
  return { status: 'ready', warnings };
}

// This adapter reads the same public snapshot and action prices as the visible
// campaign panels. Marginal strategic value remains unavailable until a shared
// election forecast evaluator is supplied by integration.
export function buildNativeStaffActionOptions(game, context = {}) {
  if (!game || !['dem', 'rep', 'lib', 'grn'].includes(game.party)) {
    return { status: 'unavailable', reason: 'campaign-or-party-unavailable', options: [] };
  }
  if (!['standard', 'pr', 'mmp'].includes(game.houseRule) || !['standard', 'proportional', 'district'].includes(game.electoralRule)) {
    return { status: 'unavailable', reason: 'election-rules-unavailable', options: [] };
  }
  const rules = normalizeElectionOptions({
    housePR: game.houseRule === 'pr',
    houseMMP: game.houseRule === 'mmp',
    proportionalElectoralVotes: game.electoralRule === 'proportional',
    allStateDistrictElectors: game.electoralRule === 'district',
  });
  if (game.finished || decisionPending(game)) {
    return { status: 'unavailable', reason: 'campaign-actions-unavailable', ruleKey: rules.ruleKey, options: [] };
  }
  if (!Number.isFinite(game.funds)) return { status: 'unavailable', reason: 'campaign-funds-unavailable', ruleKey: rules.ruleKey, options: [] };

  const publicRows = snapshot(game).rows;
  const actionsLeft = actionsLeftIn(game);
  const options = [];
  const enabledEffects = new Set(Array.isArray(context.enabledNativeEffectIds) ? context.enabledNativeEffectIds : []);
  const house = rules.houseRule !== 'district' || rules.electoralCollegeRule === 'district' ? houseSnapshot(game) : null;
  const houseByState = new Map((house?.states || []).map((row) => [row.state, row]));
  const closestDistricts = rules.houseRule === 'mmp' || rules.electoralCollegeRule === 'district'
    ? closestSourcedDistricts(house?.districts, game.party) : new Map();
  const savedAgenda = game.staffing?.agendaByWeek?.[game.week];
  const missingValue = { status: 'unavailable', reason: 'A marginal forecast for this action is not available.' };

  for (const row of publicRows) {
    const shares = row.shares || {};
    const own = shares[game.party];
    const rivals = Object.entries(shares).filter(([party, value]) => party !== game.party && Number.isFinite(value)).map(([, value]) => value);
    if (!Number.isFinite(own) || rivals.length === 0) continue;
    const closestRival = Math.max(...rivals);
    const common = {
      week: game.week,
      actionSlots: 1,
      party: game.party,
      targetId: row.abbr,
      targetName: row.name,
      ruleKey: rules.ruleKey,
      legal: true,
      expectedValue: missingValue,
      ...publicRulePriority(row, own, closestRival, rules, game, houseByState.get(row.abbr), closestDistricts.get(row.abbr)),
    };
    const add = (actionId, actionLabel, cost, extra = {}) => {
      const freeVolunteer = actionId === 'volunteers' && Number(game.campaignPerks?.freeVolunteerOps) > 0;
      if ((extra.actionSlots ?? common.actionSlots) > actionsLeft || !Number.isFinite(cost)
          || cost < 0 || (cost > game.funds && !freeVolunteer)) return;
      options.push({ ...common, ...extra, optionId: `${actionId}:${row.abbr}${extra.issueId ? `:${extra.issueId}` : ''}`, actionId, actionLabel, cost });
    };
    add('visit', 'Campaign stop', 0, {
      staffRoleIds: ['chief', 'pollster', 'field', 'base-liaison'],
      expectedEffectSummary: 'Runs the existing campaign stop in this state.',
    });
    add('townhall', 'Town hall marathon', 0, {
      staffRoleIds: ['chief', 'pollster'],
      expectedEffectSummary: 'Opens the existing town hall; its result depends on your answers.',
    });
    const volunteerCost = Number(game.campaignPerks?.freeVolunteerOps) > 0 ? 0 : volunteerPrice(row.abbr);
    const publicTurnout = Number.isFinite(game.turnout?.[row.abbr]?.[game.party]) ? turnoutOf(game, row.abbr, game.party) : null;
    add('volunteers', 'Volunteer drive', volunteerCost, {
      staffRoleIds: ['chief', 'field', 'base-liaison'],
      reasonCodes: publicTurnout === null ? common.reasonCodes : [...common.reasonCodes, 'native-party-turnout'],
      reasonSummary: publicTurnout === null ? common.reasonSummary : `${common.reasonSummary} Current modeled turnout for your party is ${publicTurnout.toFixed(1)}%.`,
      staffPriorityByRole: publicTurnout === null ? {} : { 'base-liaison': own * (1 - publicTurnout / 100) },
      supportedStaffEffectIds: [TRADITIONAL_STAFF_BY_ID.field.effect.id, TRADITIONAL_STAFF_BY_ID['base-liaison'].effect.id]
        .filter((effectId) => enabledEffects.has(effectId)),
      expectedEffectSummary: 'Uses the existing volunteer turnout operation in this state.',
    });
    const level = groundLevel(game, row.abbr);
    if (Number.isFinite(level) && level >= 0 && level < 3) {
      const setup = groundBuildCost(game, row.abbr);
      const upkeep = groundWeeklyCost(row.abbr, level + 1);
      if (!game.build40?.version) add('ops', 'Ground game', setup, {
        staffRoleIds: ['chief', 'operations', 'field'],
        reasonCodes: ['field-operation-not-maxed'],
        reasonSummary: `The field operation is level ${level} of 3; the next level costs $${setup}M to set up and $${upkeep}M each week.`,
        expectedEffectSummary: 'Builds the next existing field operation level and incurs its normal upkeep.',
      });
    }
    const donorRoom = fundraiseOutlook(game, row.abbr);
    if (donorRoom && Number.isFinite(donorRoom.cash) && Number.isFinite(donorRoom.count)) {
      // ActionBar describes this in-person room as the campaign's top donors;
      // recurring/small-donor fundraising is a separate, currently absent action.
      add('fundraise', 'Fundraise', 0, {
        staffRoleIds: ['chief', 'fundraising'],
        donorCategory: 'major-donor-room',
        staffPriorityByRole: { fundraising: donorRoom.cash },
        supportedStaffEffectIds: enabledEffects.has(TRADITIONAL_STAFF_BY_ID.fundraising.effect.id)
          ? [TRADITIONAL_STAFF_BY_ID.fundraising.effect.id] : [],
        reasonCodes: ['native-donor-room-outlook'],
        reasonSummary: `The existing donor outlook estimates $${donorRoom.cash}M; this room has been visited ${donorRoom.count} times.`,
        expectedEffectSummary: 'Runs the existing local fundraiser with its normal donor fatigue.',
      });
    }
    const promiseOptions = ISSUES_BY_WEIGHT.map((item) => ({ item, outlook: promiseOutlook(game, row.abbr, item.id) }))
      .filter(({ outlook }) => outlook && Number.isFinite(outlook.fit) && Number.isFinite(outlook.swing))
      .sort((a, b) => b.outlook.swing - a.outlook.swing || a.item.id.localeCompare(b.item.id));
    const bestIssue = promiseOptions[0];
    const agendaIssue = savedAgenda?.targetId === row.abbr && savedAgenda.status === 'unconsumed'
      ? promiseOptions.find((item) => item !== bestIssue && item.item.id === savedAgenda.issueId) : null;
    for (const issue of [bestIssue, agendaIssue].filter(Boolean)) {
      if (!game.campaignPerks?.corruptionAd) {
        const outlook = adOutlook(game, row.abbr, issue.item.id, 'pro', 'digital');
        if (outlook && Number.isFinite(outlook.fit) && Number.isFinite(outlook.base) && outlook.base > 0 && Number.isFinite(outlook.cost)) {
          const adPrice = freeAdsForIssue(game, issue.item.id) > 0 ? 0 : outlook.cost;
          add('ad', 'Digital ad', adPrice, {
            actionSlots: 0,
            staffRoleIds: ['chief', 'communications', 'social-media'],
            issueId: issue.item.id, issueLabel: issue.item.label, adTypeId: 'digital', adKind: 'pro',
            supportedStaffEffectIds: enabledEffects.has(TRADITIONAL_STAFF_BY_ID['social-media'].effect.id)
              ? [TRADITIONAL_STAFF_BY_ID['social-media'].effect.id] : [],
            reasonCodes: ['native-digital-ad-outlook'],
            reasonSummary: `The existing ad outlook rates issue agreement at ${Math.round(outlook.fit * 100)}%; digital ads can move in either direction.`,
            expectedEffectSummary: 'Runs one existing digital ad in this state with its normal cost, fatigue and backfire risks.',
          });
        }
      }
    }
  }
  for (const story of Array.isArray(game.stories) ? game.stories : []) {
    if (typeof story?.id !== 'string' || !story.id || !STATE_BY_ABBR[story.abbr]
        || !['good', 'bad'].includes(story.tone) || !Number.isFinite(story.salience)
        || typeof story.headline !== 'string' || !story.headline.trim()) continue;
    const mode = story.tone === 'good' ? 'amplify' : 'bury';
    const cost = spinCost(game, story.abbr, mode);
    if (!Number.isFinite(cost) || cost > game.funds) continue;
    options.push({
      optionId: `spin:${story.id}:${mode}`, actionId: 'spin', actionLabel: mode === 'amplify' ? 'Promote a news story' : 'Respond to a news story',
      targetId: story.abbr, targetName: STATE_BY_ABBR[story.abbr].name, storyId: story.id, spinMode: mode,
      week: game.week, actionSlots: 0, party: game.party, ruleKey: rules.ruleKey, legal: true, cost,
      staffRoleIds: ['chief', 'communications', 'media'],
      supportedStaffEffectIds: enabledEffects.has(TRADITIONAL_STAFF_BY_ID.media.effect.id) ? [TRADITIONAL_STAFF_BY_ID.media.effect.id] : [],
      reasonCodes: ['native-press-story'],
      reasonSummary: `The saved ${story.tone} story “${story.headline}” has salience ${story.salience}.`,
      expectedEffectSummary: 'Works the existing local press story with its normal cost and backfire risk.',
      expectedValue: missingValue,
    });
  }
  const standings = MAIN_GAME_ENDORSEMENTS_ENABLED ? factionStandings(game) : {};
  const relationships = MAIN_GAME_ENDORSEMENTS_ENABLED ? {
    ...initialEndorserRelationships({ party: game.party, stances: game.stances, factionStandings: standings }),
    ...(game.build34EndorserRelationships || {}),
  } : {};
  const eligibleOfficials = MAIN_GAME_ENDORSEMENTS_ENABLED && actionsLeft > 0
    ? ENDORSER_ROSTER.filter((item) => item.party === game.party && item.factionId === 'officials') : [];
  for (const group of eligibleOfficials) {
    const relationship = Number(relationships[group.id]);
    const standing = Number(standings[group.factionId]);
    const threshold = Number(group.endorsementThreshold);
    if (![relationship, standing, threshold].every(Number.isFinite)) continue;
    const eligibility = endorsementEligibility({
      group, candidateId: game.candidateId, relationshipScore: relationship, factionStanding: standing,
      endorsementRegistry: game.build34EndorserRegistry || {},
      unavailablePersonIds: [game.candidateId, game.opponentId, game.runningMateId].filter(Boolean),
      candidateParty: game.party,
    });
    if (eligibility.reason !== 'relationship-threshold' || relationship < threshold - 12) continue;
    options.push({
      optionId: `endorsement:${group.id}`,
      actionId: 'endorsement', actionLabel: 'Court party officials', targetId: group.id, targetName: group.name,
      week: game.week, actionSlots: 1, party: game.party, ruleKey: rules.ruleKey, legal: true, cost: 0,
      staffRoleIds: ['chief', 'establishment-liaison'],
      supportedStaffEffectIds: enabledEffects.has(TRADITIONAL_STAFF_BY_ID['establishment-liaison'].effect.id)
        ? [TRADITIONAL_STAFF_BY_ID['establishment-liaison'].effect.id] : [],
      nativeEligibilityReason: eligibility.reason, nativeRelationship: relationship,
      reasonCodes: ['native-endorsement-outreach'],
      reasonSummary: `The current relationship is ${relationship.toFixed(1)}; the endorsement threshold is ${threshold.toFixed(1)}. Faction standing is ${standing.toFixed(1)}.`,
      expectedEffectSummary: 'Uses the existing outreach action and its normal relationship and endorsement gates.',
      expectedValue: missingValue,
    });
  }
  return {
    status: options.length ? 'ready' : 'unavailable',
    reason: options.length ? null : 'no-public-legal-action-options',
    ruleKey: rules.ruleKey,
    reasonSchemaVersion: NATIVE_STAFF_REASON_SCHEMA_VERSION,
    options,
    diagnostics: [
      'Other action types require an integration adapter for their exact legal targets and costs.',
      'Staff payload adapters cover volunteer turnout, favorable promise persuasion and digital ads, major-donor room yield, and press coverage when registered by integration.',
      'Rule-specific marginal forecast values are unavailable until the shared evaluator is connected.',
    ],
  };
}

export function buildNativeStaffBriefing(game, context = {}) {
  const native = buildNativeStaffActionOptions(game, context);
  if (native.status !== 'ready') return { schemaVersion: 1, status: 'unavailable', reason: native.reason, recommendations: [], native };
  return { ...buildStaffBriefing(game, { ...context, legalActionOptions: native.options }), native };
}
