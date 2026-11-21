import { isScenarioCandidate } from '@/lib/build39Scenarios';
// The party has a mind of its own.
//
// Five factions per party — the field, a wing or two, the elected officials and
// the donors — each with a standing from 0 to 100 and a `pull`: what it wants
// from the nominee. A positive pull wants purity in the party's own direction, a
// negative one wants the middle. A nominee who thrills one half of the tent is
// almost always boring or offending the other half.
//
// Standing is persisted on the campaign (`game.factions`) and is only ever moved
// by `applyFactionReactions`, which reads a concrete change the engine made.

import { ideoFor, ISSUE_BY_ID } from '@/data/platform';
import { FACTION_MILESTONES } from '@/data/factionMilestones';
import { mainGameFactionMilestones } from '@/lib/endorsementRemoval.mjs';
import { candidateStartProfile } from '@/data/candidateFactionProfiles';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const FACTION_SETS = {
  dem: [
    {
      id: 'activists',
      label: 'Progressive Democrats',
      role: 'activists',
      effect: 'turnout',
      groupIds: ['far left'],
      pull: 0.7,
      icon: 'community',
      color: '#7C5CFF',
      blurb: 'Organizers, campus chapters, and the people who knock doors for free.',
    },
    {
      id: 'labor',
      label: 'Labor Democrats',
      role: 'wing',
      effect: 'labor-field',
      focusStates: ['MI', 'WI', 'PA'],
      pull: 0.4,
      icon: 'tools',
      color: '#46B0FF',
      blurb: 'The halls, the shop stewards, and the phone banks they can fill.',
    },
    {
      id: 'suburbs',
      label: 'New Democrat Moderates',
      role: 'wing',
      effect: 'moderate-persuasion',
      groupIds: ['moderate'],
      pull: -0.5,
      icon: 'civic-building',
      color: '#9DB8FF',
      blurb: 'College-educated swing voters who will leave at the first whiff of a circus.',
    },
    {
      id: 'officials',
      label: 'Democratic Party Leadership',
      role: 'officials',
      effect: 'downballot-coordination',
      groupIds: ['moderate'],
      pull: -0.2,
      icon: 'civic-building',
      color: '#F7C145',
      blurb: 'Governors, mayors and the caucus. They lend you their machines — for now.',
    },
    {
      id: 'donors',
      label: 'Democratic Donor Network',
      role: 'donors',
      effect: 'income',
      pull: -0.3,
      icon: 'business',
      color: '#6EE7B7',
      blurb: 'Bundlers and the big checks. They fund the week, and they keep score.',
    },
  ],
  rep: [
    {
      id: 'base',
      label: 'MAGA Populists',
      role: 'activists',
      effect: 'turnout',
      groupIds: ['populistright'],
      pull: 0.8,
      icon: 'power',
      color: '#E8433C',
      blurb: 'Rallies, truck rallies, and the people who will never not show up.',
    },
    {
      id: 'religious',
      label: 'Religious Conservatives',
      role: 'wing',
      effect: 'religious-turnout',
      groupIds: ['evangelical'],
      pull: 0.6,
      icon: 'civic-building',
      color: '#D8A657',
      blurb: 'Pew by pew, and the only precinct-level list anybody actually trusts.',
    },
    {
      id: 'business',
      label: 'Free-Market Republicans',
      role: 'wing',
      effect: 'moderate-persuasion',
      groupIds: ['conservative', 'moderate'],
      pull: -0.5,
      icon: 'civic-building',
      color: '#8FA3C8',
      blurb: 'The Chamber, the boardroom, and every donor who wants a boring September.',
    },
    {
      id: 'officials',
      label: 'Republican Party Leadership',
      role: 'officials',
      effect: 'downballot-coordination',
      groupIds: ['conservative'],
      pull: -0.2,
      icon: 'civic-building',
      color: '#F7C145',
      blurb: 'Governors and the county machines whose turnout you cannot buy.',
    },
    {
      id: 'donors',
      label: 'Republican Donor Network',
      role: 'donors',
      effect: 'income',
      pull: -0.3,
      icon: 'business',
      color: '#6EE7B7',
      blurb: 'The finance committee and the super PAC nobody admits to running.',
    },
  ],
  lib: [
    {
      id: 'activists',
      label: 'Libertarian Party Activists',
      role: 'activists',
      effect: 'turnout',
      groupIds: ['libertarian'],
      pull: 0.8,
      icon: 'civic-building',
      color: '#F5C542',
      blurb: 'County conventions, campus chapters and a deep distrust of anyone who wins.',
    },
    {
      id: 'students',
      label: 'Libertarian Young Voters',
      role: 'wing',
      effect: 'youth-outreach',
      pull: 0.3,
      icon: 'star',
      color: '#C8DB18',
      blurb: 'Online, loud, and allergic to both parties.',
    },
    {
      id: 'officials',
      label: 'Libertarian Party Officers',
      role: 'officials',
      effect: 'ballot-access',
      pull: -0.2,
      icon: 'civic-building',
      color: '#F7C145',
      blurb: 'The people who keep ballot access alive on a shoestring.',
    },
    {
      id: 'donors',
      label: 'Libertarian Donors',
      role: 'donors',
      effect: 'income',
      pull: -0.3,
      icon: 'business',
      color: '#6EE7B7',
      blurb: 'A handful of families who fund the whole thing, and say so.',
    },
  ],
  grn: [
    {
      id: 'activists',
      label: 'Green Party Activists',
      role: 'activists',
      effect: 'turnout',
      groupIds: ['far left'],
      pull: 0.9,
      icon: 'plant',
      color: '#3FBF6F',
      blurb: 'Climate organizers and the people who were right about everything first.',
    },
    {
      id: 'climate',
      label: 'Green Climate Action Greens',
      role: 'wing',
      effect: 'issue-persuasion',
      groupIds: ['far left'],
      pull: 0.4,
      icon: 'power',
      color: '#46B0FF',
      blurb: 'Scientists, activists and one very determined retired professor.',
    },
    {
      id: 'officials',
      label: 'Green Party Local Officials',
      role: 'officials',
      effect: 'ballot-access',
      pull: -0.2,
      icon: 'civic-building',
      color: '#F7C145',
      blurb: 'City council seats, and the only elected offices the party holds.',
    },
    {
      id: 'donors',
      label: 'Green Small-Donor Network',
      role: 'donors',
      effect: 'income',
      pull: -0.3,
      icon: 'business',
      color: '#6EE7B7',
      blurb: 'Ten dollars at a time, and they read every email you send.',
    },
  ],
};

const MAIN_GAME_FACTION_MILESTONES = mainGameFactionMilestones(FACTION_MILESTONES);

export function factionsFor(party) {
  return FACTION_SETS[party] || (isScenarioCandidate(party) ? [] : FACTION_SETS.dem);
}

export function initialFactions(party, candidateId) {
  const candidateProfile = factionsFor(party).length ? candidateStartProfile(candidateId, party) : null;
  if (candidateProfile?.factionSupport) return { ...candidateProfile.factionSupport };
  const purity = party === 'rep' ? ideoFor(candidateId) : -ideoFor(candidateId);
  const out = {};
  factionsFor(party).forEach((f) => {
    out[f.id] = clamp(Math.round(52 + purity * f.pull * 14), 18, 82);
  });
  return out;
}

export function factionStandings(game) {
  return { ...initialFactions(game.party, game.candidateId), ...(game.factions || {}) };
}

export function factionMilestoneFor(party, factionId, threshold) {
  const faction = factionsFor(party).find((item) => item.id === factionId);
  const data = MAIN_GAME_FACTION_MILESTONES[party]?.[factionId];
  const milestone = threshold === 0 ? data?.atZero : threshold === 100 ? data?.atHundred : null;
  return faction && milestone ? { ...data, ...milestone, factionId, factionLabel: faction.label, threshold } : null;
}

export function repairedFactionCrises(game, standings = factionStandings(game)) {
  return Object.fromEntries(Object.entries(game?.factionCrises || {}).filter(([id]) => (standings[id] ?? 50) < 20));
}

export function donorIncomeMultiplier(standing) {
  const value = clamp(Number(standing) || 0, 0, 100);
  if (value >= 50) return Math.round((1 + 0.25 * ((value - 50) / 50) ** 1.3) * 1000) / 1000;
  return Math.round((1 - 0.2 * ((50 - value) / 50) ** 1.3) * 1000) / 1000;
}

const standingCurve = (standing) => (clamp(Number(standing) || 0, 0, 100) / 100) ** 1.3;

const GROUP_BONUS_CAP = {
  turnout: 0.46, 'religious-turnout': 0.42, 'labor-field': 0.3,
  'moderate-persuasion': 0.28, 'downballot-coordination': 0.16,
  'youth-outreach': 0.36, 'issue-persuasion': 0.4, 'ballot-access': 0.18,
};

const SPECIALIST_EFFECT = {
  'religious-turnout': { label: 'Faith turnout', cap: 0.14, actions: 'rallies and volunteer drives' },
  'youth-outreach': { label: 'Youth outreach', cap: 0.14, actions: 'volunteer drives' },
  'issue-persuasion': { label: 'Climate persuasion', cap: 0.12, actions: 'climate promises' },
  'ballot-access': { label: 'Ballot access', cap: 0.12, actions: 'third-party campaign work' },
};

export function factionGroupBonuses(game) {
  if (!game?.factions) return {};
  const standings = factionStandings(game);
  const bonuses = {};
  factionsFor(game.party).forEach((faction) => {
    const ids = faction.groupIds || [];
    if (!ids.length) return;
    const cap = Number.isFinite(faction.groupBonusCap) ? faction.groupBonusCap : (GROUP_BONUS_CAP[faction.effect] || 0.2);
    const amount = cap * standingCurve(standings[faction.id] ?? 50);
    ids.forEach((id) => {
      bonuses[id] = (bonuses[id] || 0) + amount;
    });
  });
  return bonuses;
}

// The answer on an issue a faction would have written itself.
export function prefStance(party, faction) {
  if (faction.pull <= 0) return 1;
  return party === 'dem' || party === 'grn' ? 0 : 2;
}

const ALIGN = [1, 0.5, 0.12];

// What a faction makes of one answer, measured against where the campaign stood
// before (1 — the middle — for a promise that changes nothing).
export function stanceValue(party, faction, issueId, stance, reference = 1) {
  const issue = ISSUE_BY_ID[issueId];
  if (!issue || stance == null || reference == null) return 0;
  const pref = prefStance(party, faction);
  const move = ALIGN[Math.abs(stance - pref)] - ALIGN[Math.abs(reference - pref)];
  return clamp(move * issue.weight * 0.55, -4, 4);
}

// Who a week of work was aimed at.
const ACTION_ROLES = {
  visit: { activists: 0.9, officials: 0.3 },
  townhall: { activists: 0.8, officials: 0.2 },
  volunteers: { activists: 1.6, officials: 0.4 },
  ops: { activists: 0.9, officials: 1.0, donors: -0.3 },
  fundraise: { donors: 2.4, activists: -0.9, officials: 0.2 },
  prep: { officials: 0.6 },
  oppo: { officials: -1.2, donors: -0.4 },
};

export function factionReactions(game, context = {}, diff = {}) {
  const party = game.party;
  const byRole = {};
  const byId = {};
  const bump = (role, value) => {
    if (value) byRole[role] = (byRole[role] || 0) + value;
  };
  const stanceHit = (issueId, to, from) => {
    factionsFor(party).forEach((f) => {
      const value = stanceValue(party, f, issueId, to, from);
      if (value) byId[f.id] = (byId[f.id] || 0) + value;
    });
  };

  if (context.type === 'action') {
    Object.entries(ACTION_ROLES[context.actionId] || {}).forEach(([role, value]) => bump(role, value));
  } else if (context.type === 'ad') {
    if (context.kind === 'attack') {
      bump('officials', -0.9);
      bump('activists', 0.2);
    } else {
      bump('donors', 0.3);
    }
  } else if (context.type === 'stance') {
    stanceHit(context.issueId, context.to, context.from);
  } else if (context.type === 'promise') {
    stanceHit(context.issueId, context.stance, 1);
  } else if (context.type === 'choice') {
    bump('activists', (diff.momentum || 0) * 0.5);
    bump('officials', (diff.momentum || 0) * 0.3 - (diff.scandals || 0) * 1.5);
    bump('donors', (diff.funds || 0) * 0.35);
  } else if (context.type === 'debate') {
    bump('activists', (diff.momentum || 0) * 0.4);
    bump('officials', (diff.momentum || 0) * 0.35);
  }

  // A coalition that moved is felt in the field, whoever moved it.
  bump('activists', (diff.groups || 0) * 0.45);

  const out = {};
  factionsFor(party).forEach((f) => {
    const value = (byRole[f.role] || 0) + (byId[f.id] || 0);
    if (value) out[f.id] = Math.round(clamp(value, -5, 5) * 10) / 10;
  });
  return out;
}

export function applyFactionReactions(game, context, diff) {
  const deltas = factionReactions(game, context, diff);
  if (!Object.keys(deltas).length) return { game, deltas };
  const next = { ...factionStandings(game) };
  Object.entries(deltas).forEach(([id, value]) => {
    next[id] = clamp(Math.round((next[id] ?? 50) + value), 0, 100);
  });
  return { game: { ...game, factions: next }, deltas };
}

// Four consequences, all of them legible: the money, the momentum, the field,
// and the wing that walks away.
export function factionEffects(game) {
  const s = factionStandings(game);
  const factions = factionsFor(game.party);
  const activeCrises = Object.keys(repairedFactionCrises(game, s));
  const crisisRows = activeCrises.map((id) => FACTION_MILESTONES[game.party]?.[id]?.atZero?.crisis).filter(Boolean);
  const crisisProduct = (key) => crisisRows.reduce((value, row) => value * (Number.isFinite(row[key]) ? row[key] : 1), 1);
  const crisisSum = (key) => crisisRows.reduce((value, row) => value + (Number(row[key]) || 0), 0);
  const standingForEffect = (effect) => {
    const faction = factions.find((f) => f.effect === effect);
    return faction ? s[faction.id] ?? 50 : 0;
  };
  const wings = factions.filter((f) => f.role === 'wing');
  const defection = wings.reduce((sum, f) => sum + Math.max(0, 32 - (s[f.id] ?? 50)), 0) * 0.014;
  const curveForEffect = (effect) => standingCurve(standingForEffect(effect));
  const specialistBonuses = factions.flatMap((faction) => {
    const config = SPECIALIST_EFFECT[faction.effect];
    if (!config) return [];
    return [{ id: faction.id, label: config.label, actions: config.actions, percent: Math.round(config.cap * curveForEffect(faction.effect) * 100) }];
  });
  const ballotAccessMul = 1 + 0.12 * curveForEffect('ballot-access');
  return {
    incomeMul: Math.max(0.45, Math.min(1.25, donorIncomeMultiplier(s.donors ?? 50) * crisisProduct('incomeMul'))),
    momentumDrift: Math.round((((s.officials ?? 50) - 50) / 45 + crisisSum('momentumDrift')) * 100) / 100,
    actionMul: Math.round((1 + 0.08 * curveForEffect('turnout')) * crisisProduct('actionMul') * (['lib', 'grn'].includes(game.party) ? ballotAccessMul : 1) * 1000) / 1000,
    laborFieldMul: Math.round((1 + 0.18 * standingCurve(standingForEffect('labor-field'))) * crisisProduct('laborFieldMul') * 1000) / 1000,
    moderatePersuasionMul: Math.round((1 + 0.12 * curveForEffect('moderate-persuasion')) * crisisProduct('moderatePersuasionMul') * 1000) / 1000,
    laborStates: factions.find((f) => f.effect === 'labor-field')?.focusStates || [],
    religiousTurnoutMul: 1 + 0.14 * curveForEffect('religious-turnout'),
    youthOutreachMul: 1 + 0.14 * curveForEffect('youth-outreach'),
    climatePersuasionMul: 1 + 0.12 * curveForEffect('issue-persuasion'),
    ballotAccessMul,
    downballotBonus: Math.round(((['dem', 'rep'].includes(game.party) ? standingCurve(standingForEffect('downballot-coordination')) * 0.55 : 0) - crisisSum('downballotPenalty')) * 100) / 100,
    defection: Math.round(defection * 100) / 100,
    activeCrises,
    specialistBonuses,
  };
}

// Factions sulk and forgive by the week: standing drifts back toward the middle
// unless the campaign keeps earning it.
export function decayFactions(factions, rate = 0.15) {
  const out = {};
  Object.entries(factions || {}).forEach(([id, value]) => {
    out[id] = Math.round((value + (50 - value) * rate) * 10) / 10;
  });
  return out;
}

export function factionMood(standing) {
  if (standing >= 75) return 'all in';
  if (standing >= 62) return 'behind you';
  if (standing >= 48) return 'steady';
  if (standing >= 36) return 'uneasy';
  if (standing >= 24) return 'restless';
  return 'furious';
}

export function factionLine(faction, delta) {
  const mood =
    delta > 1.5 ? 'delighted' : delta > 0.2 ? 'pleased' : delta < -1.5 ? 'furious' : delta < -0.2 ? 'irritated' : 'unmoved';
  const amount = delta ? ` (${delta > 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)})` : '';
  return `${faction.label} — ${mood}${amount}`;
}
