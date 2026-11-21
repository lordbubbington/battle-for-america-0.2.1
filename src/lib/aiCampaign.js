// The other campaigns' war chests.
//
// Every major party the player is not running starts the race with $225M and
// plans a sustainable $8–$15M weekly ad budget around a late-race reserve, then
// can spend the remaining balance in the final week before election day.
// It can never spend more than it has.
//
// Where the money goes is a reading of the map. Closest states first, because
// those are the ones that can still move; and a party that is behind buys the
// states it is losing before the ones it holds, so every dollar is reaching for
// the cheapest next state rather than padding a lead it already has. A state
// that has already sat through five of that party's ads is left alone.
//
// The buy itself is the same shape as the player's: money, not an action, and it
// buys turnout — the party's own people, reminded to vote — plus a point of
// fatigue in the state. Nothing here touches the margin directly.

import { BUILD40_FIELD, commissionStatePoll } from '@/lib/build40Field';
import { STATE_LIST } from '@/data/states';
import { adCost } from '@/lib/ads';
import { actionMultiplier, addFatigue, pointsOf } from '@/lib/fatigue';
import { addTurnoutState } from '@/lib/turnout';
import { runCorruptionAd } from '@/lib/corruptionAd';

export function build40RivalStatePoll({ game, party, targets, board, operationsBudget, random }) {
  if (operationsBudget < BUILD40_FIELD.statePollCostM) return null;
  const target = targets.find(({ abbr, lead }) => Math.abs(lead) <= 5 && !game.aiStatePollReceipts?.[party]?.[game.week]?.[abbr]);
  if (!target || random() >= 0.35) return null;
  const campaignId = game.build34CampaignId + ':' + party;
  const result = commissionStatePoll({
    game: { ...game, build34CampaignId: campaignId, funds: operationsBudget, actionsLeft: 1, statePollReceipts: {} },
    stateId: target.abbr, shares: board.find((row) => row.abbr === target.abbr)?.shares,
  });
  return result.ok ? { ...target, receipt: result.receipt } : null;
}

export const AI_START_FUNDS = 225;
export const AI_AD_MIN = 8;
export const AI_AD_MAX = 15;
export const AI_AD_FATIGUE_LIMIT = 5;
export const AI_MEDIA = 'tv';

const round1 = (v) => Math.round(v * 10) / 10;

export function isMajor(party) {
  return party === 'dem' || party === 'rep';
}

export function aiFundsOf(game, party) {
  return round1(game?.aiFunds?.[party] || 0);
}

// Set aside enough for a few later media windows, then release part of that
// reserve when the national race is close enough to justify spending now.
export function aiBudgetPlan(game, party, marginOf, reserveBias = 1) {
  const funds = aiFundsOf(game, party);
  const weeks = game.totalWeeks || 14;
  const last = game.week >= weeks - 1;
  const weeksLeft = Math.max(1, weeks - game.week);
  const reserveWeeks = last ? 0 : Math.min(3, Math.max(0, weeksLeft - 1));
  const urgency = Math.max(0, Math.min(1, (12 - Math.abs(nationalLean(game, party, marginOf))) / 12));
  const reserve = round1(reserveWeeks * 9 * Math.max(0, 1 - urgency * 0.45) * Math.max(0.5, Math.min(1.25, reserveBias)));
  const operatingWeeks = Math.max(1, weeksLeft - reserveWeeks);
  const weeklyCap = round1(Math.max(0, (funds - reserve) / operatingWeeks));
  return { funds, reserve, reserveWeeks, operatingWeeks, urgency, weeklyCap, last };
}

// What the party's own numbers say about the race: the electoral-vote-weighted
// margin across the country, read from its side. Positive is a party ahead.
export function nationalLean(game, party, marginOf) {
  let sum = 0;
  let weight = 0;
  STATE_LIST.forEach((s) => {
    sum += marginOf(s.abbr) * s.ev;
    weight += s.ev;
  });
  const dem = weight ? sum / weight : 0;
  return party === 'dem' ? dem : -dem;
}

// Background third-party campaigns need an objective of their own: a weak national
// showing calls for threshold-building, a near-threshold run needs to defend it, and
// a strong four-party run can consolidate in places where the ticket already matters.
export function thirdPartyCampaignPlan(game, rows = [], party) {
  const byAbbr = new Map((rows || []).map((row) => [row.abbr, row]));
  const states = STATE_LIST.map((state) => {
    const row = byAbbr.get(state.abbr);
    const share = Number.isFinite(Number(row?.share)) ? Number(row.share) : 0;
    return { abbr: state.abbr, name: state.name, ev: state.ev || 1, share };
  });
  const totalEv = states.reduce((sum, state) => sum + state.ev, 0) || 1;
  const nationalShare = round1(states.reduce((sum, state) => sum + state.share * state.ev, 0) / totalEv);
  const weeksLeft = Math.max(0, (game.totalWeeks || 14) - (game.week || 0));
  const threshold = 5;
  let objective;
  if (game.thirdMode === 'surge' || nationalShare >= 6.75 || (weeksLeft <= 2 && nationalShare < threshold)) {
    objective = 'build-strongholds';
  } else if (nationalShare >= threshold) {
    objective = 'protect-threshold';
  } else {
    objective = 'reach-threshold';
  }

  const scoreState = (state) => {
    if (objective === 'build-strongholds') return state.share * 0.8 + Math.sqrt(state.ev) * 0.12;
    if (objective === 'protect-threshold') {
      return Math.sqrt(state.ev) * 0.58 + Math.exp(-Math.abs(state.share - threshold) / 7) * 2.2 + (state.share < threshold ? 0.35 : 0);
    }
    return Math.sqrt(state.ev) * 0.72 + Math.max(0, 11 - Math.abs(state.share - 6)) * 0.13;
  };
  const targets = states.map((state) => ({ ...state, score: scoreState(state) })).sort((a, b) => b.score - a.score);
  const strongest = states.slice().sort((a, b) => b.share - a.share)[0];
  const partyName = party === 'grn' ? 'Green' : 'Libertarian';
  const label = objective === 'reach-threshold'
    ? 'Build toward the 5% national vote-share line'
    : objective === 'protect-threshold'
      ? 'Protect the 5% national vote-share line'
      : 'Consolidate the ticket’s strongest states';
  const reason = objective === 'reach-threshold'
    ? partyName + ' organizers are prioritizing populous states where the ticket has room to approach the modeled 5% national vote-share threshold.'
    : objective === 'protect-threshold'
      ? partyName + ' organizers are spreading effort across populous states near the 5% line to keep national support from slipping below it.'
      : partyName + ' organizers are concentrating in ' + (strongest?.name || 'their strongest states') + ', where the ticket already has its best base.';

  return {
    objective,
    label,
    reason,
    nationalShare,
    threshold,
    focusCount: objective === 'build-strongholds' ? 4 : 8,
    targets,
  };
}
// Every state the party can still advertise in, closest first — and, for a party
// that is behind, the ones it is losing ahead of the ones it already holds.
export function adTargets(game, party, marginOf) {
  const behind = nationalLean(game, party, marginOf) < 0;
  const sign = party === 'dem' ? 1 : -1;
  const open = STATE_LIST.filter((s) => pointsOf(game, party, s.abbr, 'ad') < AI_AD_FATIGUE_LIMIT)
    .map((s) => ({ abbr: s.abbr, name: s.name, lead: sign * marginOf(s.abbr) }))
    .sort((a, b) => Math.abs(a.lead) - Math.abs(b.lead));
  const losing = open.filter((s) => s.lead < 0);
  const holding = open.filter((s) => s.lead >= 0);
  return behind ? [...losing, ...holding] : [...holding, ...losing];
}

// One week of airtime for one party. Mutates the game it is handed, and returns
// what it bought so the week's log can say so.
export function aiAdWeek(game, party, marginOf, options = {}) {
  if (!isMajor(party)) return { party, spend: 0, buys: [] };
  const perks = (game.aiPerks || {})[party] || {};
  if (perks.corruptionAd) {
    const target = adTargets(game, party, marginOf)[0] || STATE_LIST[0];
    const result = runCorruptionAd(game, party, target.abbr);
    game.aiPerks = { ...(game.aiPerks || {}), [party]: { ...perks, corruptionAd: false } };
    const resultLabel = result.outcome === 'viral' ? 'mega-viral' : result.outcome === 'successful' ? 'successful' : 'no movement';
    return { party, spend: 0, buys: [{ abbr: target.abbr, name: target.name, cost: 0, special: 'corruption', outcome: resultLabel }] };
  }
  const funds = aiFundsOf(game, party);
  if (funds <= 0) return { party, spend: 0, buys: [] };

  const plan = aiBudgetPlan(game, party, marginOf, options.reserveBias ?? 1);
  const plannedSpend = Math.min(plan.weeklyCap, AI_AD_MIN + plan.urgency * 5 + Math.random() * (AI_AD_MAX - AI_AD_MIN - 5));
  const budget = plan.last ? funds : round1(Math.min(funds, plannedSpend));

  const adjustQualityRoll = options.adjustQualityRoll || ((roll) => roll);
  const buys = [];
  let left = budget;
  // One pass over the map buys one spot per state; anything still unspent goes
  // back down the same list, and the fatigue rule cuts it off where it should.
  for (let pass = 0; pass < 6 && left > 0.05; pass++) {
    let bought = false;
    for (const target of adTargets(game, party, marginOf)) {
      if (left <= 0.05) break;
      const cost = adCost(game, target.abbr, AI_MEDIA, 'pro');
      const free = (perks.freeAds || 0) > 0;
      if (!free && cost > left) continue;
      const mul = actionMultiplier(game, party, target.abbr, 'ad');
      const multiplierReady = (perks.nextAdMultiplier || 1) > 1 && (!perks.nextAdIssue || perks.nextAdIssue === 'economy');
      const lift = round1((2 + adjustQualityRoll(Math.random()) * 2) * mul * (multiplierReady ? perks.nextAdMultiplier : 1));
      const backfire = Math.random() < 0.02;
      addTurnoutState(game, party, target.abbr, backfire ? -lift : lift);
      addFatigue(game, party, target.abbr, 'ad', 1);
      if (!free) left = round1(left - cost);
      perks.freeAds = Math.max(0, (perks.freeAds || 0) - (free ? 1 : 0));
      if (multiplierReady) { perks.nextAdMultiplier = 1; perks.nextAdIssue = null; }
      buys.push({ abbr: target.abbr, name: target.name, cost: free ? 0 : cost });
      bought = true;
    }
    if (!bought) break;
  }

  const spend = round1(budget - left);
  game.aiPerks = { ...(game.aiPerks || {}), [party]: perks };
  if (spend > 0) game.aiFunds = { ...(game.aiFunds || {}), [party]: round1(funds - spend) };
  return { party, spend, buys };
}

// How the week's buy reads in the campaign log.
export function adLine(spend, buys) {
  if (!buys.length) return '';
  const corruption = buys.find((buy) => buy.special === 'corruption');
  if (corruption) return `Ran a free anti-corruption ad in ${corruption.name} — ${corruption.outcome}`;
  const names = buys.map((b) => b.name);
  const where =
    names.length <= 3
      ? names.join(', ')
      : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
  return `Bought $${spend}M of airtime in ${where}`;
}
