import { STATE_BY_ABBR, BASE_LEANS, STATE_LIST } from '@/data/states';
import { STATE_DEMOGRAPHICS } from '@/data/demographics';
import { POPULATION_BY_STATE } from '@/data/build38Population';
import { VOTING_RULE_BY_ID } from '@/data/build38VotingRules';
import { buildVoterComposition, ideologyResponse, chooseRegionAssignment, BUILD38_IDEOLOGY_IDS } from '@/lib/build38VoterRegions';
import { fieldActionRules, volunteerCostTable } from '@/lib/build38FieldRules';
import { ticketEffects } from '@/lib/build38TicketEffects';

export const VOTER_COMPOSITION = buildVoterComposition({ baseIdeologyByState: BASE_LEANS });
const VOLUNTEER_COSTS = volunteerCostTable(POPULATION_BY_STATE).costsM || {};
export const volunteerPrice = (abbr) => VOLUNTEER_COSTS[abbr] ?? 3;
export const build38Field = (game, actionId, abbr) => fieldActionRules({
  ruleId: game.build38?.votingRuleId || 'current', actionId, stateId: abbr,
  electoralVotes: STATE_BY_ABBR[abbr]?.ev, population: POPULATION_BY_STATE[abbr], populationTable: POPULATION_BY_STATE,
  campaignWeek: game.week + 1, totalWeeks: game.totalWeeks,
});

const ENVIRONMENT_WEIGHTS = Object.fromEntries(Object.entries(VOTER_COMPOSITION.byState).map(([abbr, row]) => [abbr,
  Object.entries(row.ideology).reduce((delta, [ideologyId, share]) =>
    delta + share / 100 * (ideologyResponse({ ideologyId, nationalShockMargin: 1 }).signedMarginDelta - 1), 0)]));

const gap = (shares, party) => (shares[party] || 0) - Math.max(...Object.entries(shares).filter(([id]) => id !== party).map(([, share]) => share));

export function initializeBuild38(game, votingRuleId, support) {
  const party = game.party;
  const regions = chooseRegionAssignment({
    campaignId: game.build34CampaignId, playerParty: party, states: STATE_LIST,
    difficultyId: ['easy','medium','hard'].includes(game.difficultyId) ? game.difficultyId : 'medium',
    scoreState: ['dem','rep'].includes(party) ? null : ({ abbr }, delta) =>
      Math.sign(gap(support(abbr, delta), party) - gap(support(abbr, 0), party)),
  });
  return {
    version: 1, openingModel: true, votingRuleId: Object.hasOwn(VOTING_RULE_BY_ID, votingRuleId) ? votingRuleId : 'current',
    regionalAssignment: regions.directionByRegion || null, regionalAppliedWeek: 0, ticketEffectIds: [],
    governorOffsets: null, groupEffects: [],
  };
}

export function ideologyEnvironmentDelta(abbr, nationalGeneric) {
  return (ENVIRONMENT_WEIGHTS[abbr] || 0) * nationalGeneric;
}

export function applyOpeningTicket(game, party, candidateId, vpId) {
  const id = [game.build34CampaignId, 'ticket-v1', party, candidateId, vpId || 'none'].join(':');
  if (game.build38.ticketEffectIds.includes(id)) return;
  const standings = party === game.party ? game.factions : game.aiFactions?.[party];
  const result = ticketEffects({ candidateId, vpId, party, factionStandings: standings, activeVoterGroupIds: BUILD38_IDEOLOGY_IDS });
  if (result.status !== 'ready') return;
  const adjusted = { ...standings, ...result.factionOverrides };
  for (const { factionId, approvalPoints } of result.factionDeltas) adjusted[factionId] = Math.min(100, Math.max(0, (adjusted[factionId] ?? 50) + approvalPoints));
  if (party === game.party) game.factions = adjusted;
  else game.aiFactions = { ...game.aiFactions, [party]: adjusted };
  game.build38.ticketEffectIds.push(id);
  game.build38.groupEffects.push(...result.groupEffects);
}

export function ticketGroupShare(abbr, party, game) {
  const ideology = VOTER_COMPOSITION.byState[abbr]?.ideology;
  return (game.build38?.groupEffects || []).reduce((sum, item) => item.party === party
    ? sum + (ideology?.[item.groupId] || STATE_DEMOGRAPHICS[abbr]?.share?.[item.groupId] || 0) * item.sharePoints / 100
    : sum, 0);
}
