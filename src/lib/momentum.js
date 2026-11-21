// Momentum.
//
// Momentum does exactly one thing to the election: it moves voters. It lifts a
// campaign's turnout where that campaign is running hotter than its own people
// are likely to vote, and it takes vote share off the parties it is running
// against. Nothing else on the map reads it, and it still drifts toward the
// middle every week on its own.
//
// Every party on the ballot carries its own. Yours and your main opponent's are
// the two the HUD shows; the other two keep theirs in pMomentum.

import { STATES } from '@/data/states';
import { bumpTurnoutState, turnoutRow } from '@/lib/turnout';

export const PARTIES = ['dem', 'rep', 'lib', 'grn'];

// A campaign at 100 against one at 0 takes two points of the vote a week. Read
// pairwise, the same rule means one party at 20 among three at 80 loses 3.6.
export const MOMENTUM_SHARE_RATE = 0.02;
// A five-point gap is worth a roll; a twenty-point gap is a twenty percent chance
// of three points of turnout, and every lift cools the campaign by three.
export const MOMENTUM_TURNOUT_GAP = 5;
export const MOMENTUM_TURNOUT_LIFT = 3;
export const MOMENTUM_COOLING = 3;
// People already fifteen points more likely to vote than the mood says lose two.
export const MOMENTUM_TURNOUT_SAG = 15;
export const MOMENTUM_TURNOUT_DROP = 2;
export const MOMENTUM_FLOOR = 50;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const clampMomentum = (v) => clamp(Math.round(v), 0, 100);
const round3 = (v) => Math.round(v * 1000) / 1000;

// Every party actually on the ballot. A two-party race is two campaigns pressing
// on each other, so a hundred against nothing is two points of the vote; the
// four-party ballot is four campaigns, so twenty against three eighties is minus
// three and six. A third-party run joins the two majors.
export function ballotParties(game) {
  if (game?.thirdMode === 'surge') return PARTIES;
  if (game?.thirdMode === 'off') return ['dem', 'rep'];
  const base = ['dem', 'rep'];
  if (game?.party && !base.includes(game.party)) base.push(game.party);
  return base;
}

export function momentumOf(game, party) {
  if (!party) return 50;
  if (party === game.party) return game.momentum ?? 50;
  if (party === game.opponentParty) return game.oppMomentum ?? 50;
  return game.pMomentum?.[party] ?? 50;
}

function setMomentum(game, party, value) {
  const v = clampMomentum(value);
  if (party === game.party) game.momentum = v;
  else if (party === game.opponentParty) game.oppMomentum = v;
  else game.pMomentum = { ...(game.pMomentum || {}), [party]: v };
}

// The mood drifts toward the middle every week, for every party: the front-runner
// comes down, the trailing one comes up.
export function decayMomentum(game, decay) {
  ballotParties(game).forEach((party) => {
    const now = momentumOf(game, party);
    setMomentum(game, party, now + (50 - now) * decay);
  });
  return game;
}

// Turnout first, and before the drift: a campaign running ahead of its own voters
// makes them likelier to show up — and cools by three every time that works.
export function applyMomentumTurnout(game) {
  const parties = ballotParties(game);
  const mom = {};
  parties.forEach((p) => {
    mom[p] = momentumOf(game, p);
  });
  STATES.forEach((s) => {
    parties.forEach((p) => {
      const turnout = turnoutRow(game, s.abbr)[p] ?? 60;
      const gap = mom[p] - turnout;
      if (gap >= MOMENTUM_TURNOUT_GAP) {
        if (Math.random() * 100 < gap) {
          bumpTurnoutState(game, p, s.abbr, MOMENTUM_TURNOUT_LIFT);
          mom[p] = Math.max(MOMENTUM_FLOOR, mom[p] - MOMENTUM_COOLING);
        }
      } else if (turnout - mom[p] >= MOMENTUM_TURNOUT_SAG) {
        bumpTurnoutState(game, p, s.abbr, -MOMENTUM_TURNOUT_DROP);
      }
    });
  });
  parties.forEach((p) => setMomentum(game, p, mom[p]));
  return game;
}

// Then the voters themselves. The shift is national and it travels the ordinary
// pathways: the Democratic-Republican margin through each state's modifiers, and
// the third parties through their own share.
export function momentumShift(game) {
  const parties = ballotParties(game);
  const mom = {};
  parties.forEach((p) => {
    mom[p] = momentumOf(game, p);
  });
  const share = {};
  parties.forEach((p) => {
    const gap = parties.reduce((sum, q) => (q === p ? sum : sum + (mom[p] - mom[q])), 0);
    share[p] = round3(MOMENTUM_SHARE_RATE * gap);
  });
  return {
    share,
    margin: round3((share.dem || 0) - (share.rep || 0)),
    lib: share.lib || 0,
    grn: share.grn || 0,
  };
}

export function applyMomentumVotes(game) {
  const shift = momentumShift(game);
  if (!shift.margin && !shift.lib && !shift.grn) return game;
  game.thirdMods = {
    lib: { ...(game.thirdMods?.lib || {}) },
    grn: { ...(game.thirdMods?.grn || {}) },
  };
  STATES.forEach((s) => {
    if (shift.margin) {
        const regMul = (game.build40?.modeId === 'regional-parties' || game.build39?.scenario?.id === 'regional-parties') ? 10 : 1;
        game.stateMods[s.abbr] = (game.stateMods[s.abbr] || 0) + shift.margin * regMul;
      }
    if (shift.lib) game.thirdMods.lib[s.abbr] = (game.thirdMods.lib[s.abbr] || 0) + shift.lib;
    if (shift.grn) game.thirdMods.grn[s.abbr] = (game.thirdMods.grn[s.abbr] || 0) + shift.grn;
  });
  return game;
}