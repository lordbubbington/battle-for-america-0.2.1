// Everything about advertising: the five media, what they cost, what they are
// worth, and how badly a buy can go wrong. Pure functions over the game state —
// no engine imports — so `gameEngine` can pull them in without a cycle.
//
// The engine still owns the buy itself (`runAdBlitz`), because it touches the
// map, turnout and fatigue — the only things an ad is allowed to move.

import { mediaCost, ruralShare } from '@/data/states';
import { ISSUE_BY_ID, stateIssueAlignment } from '@/data/platform';

const round1 = (v) => Math.round(v * 10) / 10;
// Same calendar the engine reads, kept local so this module stays standalone.
const weeksOf = (game) => game?.totalWeeks || 14;

// `strength` is persuasion against television, `costMul` the price against it,
// and `fatigue` says whether the state gets sick of hearing it. Radio is worth
// more the emptier the state is; billboards and mailers are so cheap and so mild
// that nobody ever tires of them.
export const AD_TYPES = {
  tv: {
    id: 'tv',
    label: 'Television',
    icon: 'computer',
    blurb: 'Prime-time across every market in the state. The benchmark buy: real money, real swing.',
    strength: 1,
    costMul: 1,
    fatigue: true,
    roll: 'standard',
  },
  radio: {
    id: 'radio',
    label: 'Radio',
    icon: 'media',
    blurb: 'Drive-time on every country and talk station. Weaker than television in the cities — closer to even out where the counties are empty.',
    strength: 0.45,
    costMul: 1 / 5,
    fatigue: true,
    roll: 'standard',
    rural: true,
  },
  billboard: {
    id: 'billboard',
    label: 'Billboards',
    icon: 'ballot',
    blurb: 'A hundred sheets of plywood along the interstate. Barely moves a vote, costs less than a staffer, and nobody wearies of a sign.',
    strength: 0.03,
    costMul: 1 / 50,
    fatigue: false,
    roll: 'standard',
  },
  digital: {
    id: 'digital',
    label: 'Digital',
    icon: 'communication',
    blurb: 'Pre-roll, banners and the algorithm. Bigger swings than anything else on this list — and an even chance of going the wrong way.',
    strength: 1.15,
    costMul: 2 / 3,
    fatigue: true,
    roll: 'wild',
  },
  mailer: {
    id: 'mailer',
    label: 'Mailers',
    icon: 'data',
    blurb: 'A piece in every mailbox. Persuades nobody, but it reminds the people who already like you to actually vote.',
    strength: 0,
    costMul: 1 / 20,
    fatigue: false,
    roll: 'none',
    turnout: 0.9,
  },
};

export const AD_TYPE_LIST = ['tv', 'radio', 'billboard', 'digital', 'mailer'].map((id) => AD_TYPES[id]);

// A buy in a hundred goes badly wrong in public. A positive spot only one in a
// thousand — which is exactly why the safe buy also hits 20% softer.
export const ATTACK_BACKFIRE = 0.01;
export const POSITIVE_BACKFIRE = 0.001;
export const BACKFIRE_STATE_HIT = 4;
export const BACKFIRE_NATIONAL_HIT = 1;

// A local blowup is the common one: the spot itself becomes the story in that
// state, costing a point or two of vote and a tenth of the turnout. Attack ads
// earn it five times as often as positive spots. Rolled apart from the national
// risk, so a single bad buy can manage both.
export const ATTACK_LOCAL_BACKFIRE = 0.05;
export const POSITIVE_LOCAL_BACKFIRE = 0.02;
export const LOCAL_BACKFIRE_TURNOUT = 10;

export function adCost(game, abbr, typeId = 'tv', kind = 'pro') {
  if (!abbr) return 0;
  const type = AD_TYPES[typeId] || AD_TYPES.tv;
  const weeks = weeksOf(game);
  const weeksLeft = Math.max(0, weeks - game.week);
  const late = 1 + 0.4 * (1 - weeksLeft / weeks);
  const kindMul = kind === 'attack' ? 1.15 : 1;
  const raw = mediaCost(abbr) * late * kindMul * type.costMul;
  // Cheap media still has a floor: nothing in politics is free.
  return Math.max(type.costMul < 1 ? 0.1 : 0.5, round1(raw));
}

// Ads are money, not time. Strength depends on how much the state already agrees
// with your stance on that issue and how much the issue matters there. A positive
// spot is worth 80% of an attack spot: it is safer, so it hits softer.
export function adBaseStrength(game, abbr, issueId, typeId = 'tv', kind = 'pro') {
  const issue = ISSUE_BY_ID[issueId];
  const type = AD_TYPES[typeId] || AD_TYPES.tv;
  if (!issue || !abbr) return 0;
  const fit = stateIssueAlignment(abbr, issueId, game.stances?.[issueId] ?? 1);
  const salience = issue.weight / 10;
  const kindMul = kind === 'attack' ? 1.25 : 1;
  // A radio spot in Vermont is worth more than a radio spot in New Jersey.
  const typeMul = type.rural ? type.strength * (0.4 + (ruralShare(abbr) / 100) * 0.8) : type.strength;
  return round1((1 + 1.9 * fit) * salience * kindMul * typeMul);
}

export function adOutlook(game, abbr, issueId, kind = 'pro', typeId = 'tv') {
  const type = AD_TYPES[typeId] || AD_TYPES.tv;
  const base = adBaseStrength(game, abbr, issueId, type.id, kind);
  const wide = type.roll === 'wild';
  return {
    base,
    low: round1(-base * (wide ? 1.45 : 0.5)),
    high: round1(base * (wide ? 1.45 : 1.4)),
    fit: stateIssueAlignment(abbr, issueId, game.stances?.[issueId] ?? 1),
    salience: (ISSUE_BY_ID[issueId]?.weight || 5) / 10,
    cost: adCost(game, abbr, type.id, kind),
    type,
    rural: ruralShare(abbr),
  };
}

// Most buys are ordinary, some land clean, and some money is simply set on fire.
export function adQualityRoll(typeId = 'tv', adjustQualityRoll = (roll) => roll) {
  const type = AD_TYPES[typeId] || AD_TYPES.tv;
  if (type.roll === 'none') return 1;
  if (type.roll === 'wild') {
    // Digital: further in both directions than anything else, and an even coin
    // flip on which direction it goes.
    const sign = adjustQualityRoll(1 - Math.random()) > 0.5 ? 1 : -1;
    return sign * (0.55 + Math.random() * 1.15);
  }
  const roll = adjustQualityRoll(Math.random());
  if (roll < 0.2) return 0.15 + Math.random() * 0.3;
  if (roll > 0.86) return 1.05 + Math.random() * 0.35;
  return 0.55 + Math.random() * 0.45;
}