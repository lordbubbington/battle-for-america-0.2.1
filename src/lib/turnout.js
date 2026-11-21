// Turnout: how many of a party's own people actually show up, state by state.
//
// Every party is tracked separately in every state — an attack ad depresses the
// other side's number, a rally lifts yours — and the winner of a state is
// whoever banked the most raw votes. Turnout is kept to four decimal places; the
// votes themselves are counted in hundreds, so the arithmetic stays whole.

import { STATE_LIST, STATE_BY_ABBR } from '@/data/states';
import { ballotsInState } from '@/lib/syntheticElectorate';

// Nobody is ever counted below this, whatever the map or the money says.
export const TURNOUT_FLOOR = 40;
export const TURNOUT_CAP = 99;
export const PARTIES = ['dem', 'rep', 'lib', 'grn'];

const round4 = (v) => Math.round(v * 10000) / 10000;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// A state's starting turnout: 55–65, the Northeast highest and the South lowest,
// every state on a number of its own. Fixed when the map is drawn and never
// re-rolled, so no two runs and no two states ever agree.
const REGION_RANK = { northeast: 3, midwest: 2, west: 1, south: 0 };

function hash01(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000000) / 1000000;
}

const ORDER = STATE_LIST.slice().sort((a, b) => {
  const byRegion = (REGION_RANK[b.region] ?? 1) - (REGION_RANK[a.region] ?? 1);
  return byRegion || hash01(b.abbr) - hash01(a.abbr);
});

export const BASE_TURNOUT = ORDER.reduce((acc, s, i) => {
  acc[s.abbr] = round4(65 - (i * 10) / (ORDER.length - 1));
  return acc;
}, {});

// Every party starts on the same number in a state — that is what makes the
// poll and the vote the same thing until a campaign changes one of them.
export function baseTurnoutRow(abbr) {
  const base = BASE_TURNOUT[abbr] ?? 60;
  return { dem: base, rep: base, lib: base, grn: base };
}

export function turnoutRow(game, abbr) {
  const row = game?.turnout?.[abbr];
  if (!row || typeof row !== 'object') return baseTurnoutRow(abbr);
  return { ...baseTurnoutRow(abbr), ...row };
}

// The number itself, plus whatever field operation the player has built there: a
// party's own machine is part of its turnout, not a separate modifier.
export function turnoutOf(game, abbr, party) {
  const who = party || game?.party || 'dem';
  const row = turnoutRow(game, abbr);
  const field = who === game?.party
    ? ((game?.ops?.[abbr] || 0) + (game?.freeOps?.[who]?.[abbr] || 0)) * 2.4
    : (game?.aiOps?.[who]?.[abbr] || 0) * 2.4;
  const aiField = who === game?.party ? 0 : (game?.freeOps?.[who]?.[abbr] || 0) * 2.4;
  return clamp(round4((row[who] ?? BASE_TURNOUT[abbr] ?? 60) + field + aiField), TURNOUT_FLOOR, TURNOUT_CAP);
}

// Turnout grows by converting a party's non-voters, so a point won at 60 is worth
// more than a point won at 80: +10 at 80 becomes 82, not 90. Losses come straight
// off the number, and nothing ever falls through the floor.
export function turnoutStep(current, points) {
  if (!points) return round4(current);
  // Both directions work on the same non-voting share, so a spot that lifts your
  // own turnout is worth what a spot that suppresses theirs is worth.
  const gap = 100 - current;
  const share = Math.min(Math.abs(points), 100) / 100;
  const next = current + (points > 0 ? gap * share : -gap * share);
  return round4(clamp(next, TURNOUT_FLOOR, TURNOUT_CAP));
}

// One state, one party.
export function addTurnoutState(game, party, abbr, points) {
  if (!game || !party || !abbr || !points) return game;
  const row = turnoutRow(game, abbr);
  row[party] = turnoutStep(row[party] ?? BASE_TURNOUT[abbr] ?? 60, points);
  game.turnout = { ...(game.turnout || {}), [abbr]: row };
  return game;
}

// A flat move on the number itself, in whole points, with no conversion through
// the non-voting share. Momentum uses this: a campaign running hot lifts turnout
// by three points, a party whose people are already certain to vote sheds two.
export function bumpTurnoutState(game, party, abbr, points) {
  if (!game || !party || !abbr || !points) return game;
  const row = turnoutRow(game, abbr);
  row[party] = round4(clamp((row[party] ?? BASE_TURNOUT[abbr] ?? 60) + points, TURNOUT_FLOOR, TURNOUT_CAP));
  game.turnout = { ...(game.turnout || {}), [abbr]: row };
  return game;
}

// A whole region at once — the Northeast, the South, the Midwest, the West.
export function addTurnoutRegion(game, party, region, points) {
  if (!game || !party || !region || !points) return game;
  STATE_LIST.forEach((s) => {
    if (s.region === region) addTurnoutState(game, party, s.abbr, points);
  });
  return game;
}

// The synthetic sample preserves each state's actual 2024 ballot total.
export function voteUnits(abbr) {
  return ballotsInState(abbr) || Math.max(240, Math.round((STATE_BY_ABBR[abbr]?.ev ?? 10) * 2880));
}

// What each party actually banks: its share of the state's minds, times how many
// of its own people turn out relative to the modeled state baseline.
export function votesFor(abbr, support, game) {
  const units = voteUnits(abbr);
  const out = { dem: 0, rep: 0, lib: 0, grn: 0, ind: 0 };
  const parties = new Set([...Object.keys(out), ...Object.keys(support || {})]);
  parties.forEach((party) => {
    out[party] = 0;
    const share = Math.max(0, support?.[party] || 0);
    if (!share) return;
    const baseline = party === 'ind' ? 60 : (BASE_TURNOUT[abbr] ?? 60);
    const rawTurnout = party === 'ind' ? baseline : turnoutOf(game, abbr, party);
    // R12: Nick Bronze accounts for turnout at half its actual deviation from baseline.
    const turnout = game?.__nickBronzeHalfTurnout
      ? baseline + 0.5 * (rawTurnout - baseline)
      : rawTurnout;
    out[party] = (share / 100) * (turnout / baseline) * units;
  });
  return out;
}

export function castVotes(votes) {
  return Object.values(votes || {}).reduce((sum, v) => sum + (v || 0), 0);
}

// Hundreds of votes in, something a person can read out.
export function formatVotes(units) {
  const votes = Math.round(units || 0);
  if (votes >= 1000000) return `${(votes / 1000000).toFixed(2)}M`;
  return votes.toLocaleString('en-US');
}
