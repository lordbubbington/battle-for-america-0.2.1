// Fatigue: a state can only hear from the same campaign so many times before it
// stops listening.
//
// Every horserace action — a campaign stop, a town hall, a promise, an ad buy —
// leaves points behind in the state for that party. Each point makes that same
// action in that state 10% weaker for that party, and one point of every kind
// burns off each week. Nothing here ever turns a good week into a bad one: the
// floor is zero.

export const FATIGUE_TYPES = ['stop', 'promise', 'ad'];
export const FATIGUE_PARTIES = ['dem', 'rep', 'lib', 'grn'];
export const FATIGUE_LABEL = { stop: 'Stop', promise: 'Promise', ad: 'Ad' };
// A party's own points cost it 10% of that action each; the state's lifetime
// total costs everybody 0.1% a point.
import { BUILD34_BALANCE } from '@/lib/campaignBalanceRules';

export const OWN_PER_POINT = BUILD34_BALANCE.ownFatiguePenaltyPerPoint;
export const TOTAL_PER_POINT = BUILD34_BALANCE.lifetimeFatiguePenaltyPerPoint;

export function emptyFatigue() {
  return FATIGUE_PARTIES.reduce((acc, party) => {
    acc[party] = {};
    return acc;
  }, {});
}

export function pointsOf(game, party, abbr, type) {
  return game?.fatigue?.[party]?.[abbr]?.[type] || 0;
}

export function totalOf(game, abbr) {
  return game?.totalFatigue?.[abbr] || 0;
}

// How much of the action survives: the party's own wear on that action, then the
// state's lifetime total, which wears everything down a little.
export function actionMultiplier(game, party, abbr, type) {
  if (!abbr || !party) return 1;
  const own = Math.max(0, 1 - OWN_PER_POINT * pointsOf(game, party, abbr, type));
  const total = Math.max(0, 1 - TOTAL_PER_POINT * totalOf(game, abbr));
  return own * total;
}

// Fatigue lands on the party that campaigned — a rival's stops never tire a state
// of you. In the four-party scenario every party's points pile into the state's
// lifetime total; outside it, only the two majors'.
export function countsTowardTotal(game, party) {
  if (party === 'dem' || party === 'rep') return true;
  return game?.thirdMode === 'surge' && (party === 'lib' || party === 'grn');
}

// Adds points in place and registers them in the state's lifetime total.
export function addFatigue(game, party, abbr, type, points = 1, generalPoints = points) {
  if (!game || !party || !abbr || !points) return game;
  const fatigue = { ...(game.fatigue || {}) };
  const byState = { ...(fatigue[party] || {}) };
  const entry = { ...(byState[abbr] || {}) };
  entry[type] = Math.max(0, (entry[type] || 0) + points);
  byState[abbr] = entry;
  fatigue[party] = byState;
  game.fatigue = fatigue;
  if (countsTowardTotal(game, party)) {
    const total = { ...(game.totalFatigue || {}) };
    total[abbr] = Math.max(0, (total[abbr] || 0) + generalPoints);
    game.totalFatigue = total;
  }
  return game;
}

/** Add shared/lifetime fatigue without adding stop, promise, or ad-specific fatigue. */
export function addGeneralFatigue(game, party, abbr, points = 1) {
  if (!game || !party || !abbr || !points || !countsTowardTotal(game, party)) return game;
  const total = { ...(game.totalFatigue || {}) };
  total[abbr] = Math.max(0, (Number(total[abbr]) || 0) + points);
  game.totalFatigue = total;
  return game;
}

// One point of each kind wears off in every state, for every party, every week.
// The lifetime total never wears off.
export function decayFatigue(fatigue) {
  const out = {};
  Object.entries(fatigue || {}).forEach(([party, byState]) => {
    const states = {};
    Object.entries(byState || {}).forEach(([abbr, entry]) => {
      const kept = {};
      let live = false;
      FATIGUE_TYPES.forEach((type) => {
        const value = Math.max(0, (entry?.[type] || 0) - 1);
        kept[type] = value;
        if (value > 0) live = true;
      });
      if (live) states[abbr] = kept;
    });
    out[party] = states;
  });
  return out;
}
