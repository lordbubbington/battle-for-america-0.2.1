import { CANDIDATE_BY_ID } from '@/data/candidates';
import { THIRTEEN_COLONIES } from '@/data/unlockableCandidates';
import { voteUnits } from '@/lib/turnout';
import { SCENARIO_PARTIES } from '@/data/build39Scenarios';
import { stateGroupShift } from '@/data/demographics';
import { applyScenarioShares, scenarioPartyIds, scenarioRankedChoiceTally } from '@/lib/build39Scenarios';
import { REGIONAL_PARTY_IDS } from '@/data/build39Scenarios';
import { candidateOpeningBonus } from '@/lib/build39Candidates';
// The downballot engine: who wins the Senate, the House and the governor's
// mansions, and why.
//
// Two rules make it feel right:
//
// 1. A downballot race is only partly a referendum on the top of the ticket.
//    Senate runs at 55% of the presidential margin, governors at 42%, the House
//    at 34% — the rest is the local candidate.
// 2. That local candidate is a die rolled at the start of the campaign. Some
//    state parties got a great recruit, some got a scandal, and nobody knows
//    which until the map fills in.

import { VOTER_COMPOSITION, ticketGroupShare } from '@/lib/build38Runtime';
import { allocateMmpListPreferences } from '@/lib/build38MmpPreferences';
import { STATE_LIST, STATE_BY_ABBR } from '@/data/states';
import { BASE_LEANS } from '@/data/states';
import { genericIn } from '@/lib/environment';
import { factionEffects } from '@/lib/factions';
import { SENATE_RACES, SENATE_START } from '@/data/senate';
import { libertarianShare, greenShare } from '@/data/fourParty';
import {
  SENATE_4P_BASE,
  SENATE_4P_RACES,
  GOV_4P_BASE,
  GOV_4P_RACES,
} from '@/data/fourPartySeats';
import { COLOR_TOKENS, marginColor, TOSSUP_COLOR, TOSSUP_MARGIN } from '@/lib/marginColors';
import { flowShares, DONORS } from '@/lib/voterFlow';
import { apportionSeats, FOUR_PARTY_ORDER, rankedChoiceTally } from '@/lib/rankedChoice';
import { allocateProportional, largestRemainder, weightedNationalShares } from '@/lib/electionRules';
import { ballotsInState } from '@/lib/syntheticElectorate';
import houseDistrictBaselineData from '@/data/houseDistrictBaselines.json';
import { effectiveHouseDistrictBaseline, hasBuild45HousePvi } from '@/lib/build45HousePvi';

export { TOSSUP_COLOR, TOSSUP_MARGIN };
import {
  HOUSE_SEATS,
  HOUSE_TOTAL,
  HOUSE_MAJORITY,
  SENATE_MAJORITY,
  GOVERNOR_RACES,
  INDIE_SENATE_RACES,
  UTAH_INDEPENDENT,
} from '@/data/downballot';

export const PARTY_COLOR = {
  dem: COLOR_TOKENS.dem,
  rep: COLOR_TOKENS.rep,
  lib: COLOR_TOKENS.lib,
  grn: COLOR_TOKENS.grn,
  ind: COLOR_TOKENS.independent,
  ...Object.fromEntries(Object.entries(SCENARIO_PARTIES).filter(([id]) => id !== 'grn').map(([id, party]) => [id, party.color])),
};

export const PARTY_TAG = { dem: 'D', rep: 'R', lib: 'L', grn: 'G', ind: 'I' };

// A race inside two points is a tossup: no rating, teal across every map.
export function isTossup(margin) {
  return Math.abs(margin) < TOSSUP_MARGIN;
}
export const PARTY_NAME = {
  dem: 'Democrat',
  rep: 'Republican',
  lib: 'Libertarian',
  grn: 'Green',
  ind: 'Independent',
  ...Object.fromEntries(Object.entries(SCENARIO_PARTIES).filter(([id]) => id !== 'grn').map(([id, party]) => [id, party.label])),
};

// How much of the top of the ticket each race inherits.
// Senate candidates track the national tide more closely than the older model
// allowed, so a Democratic wave can plausibly reach the high 50s or low 60s.
export const RACE_WEIGHT = { senate: 0.85, gov: 0.42, house: 0.34 };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function gauss() {
  let u = 0;
  let v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function hash01(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export function partyColor(party) {
  return PARTY_COLOR[party] || '#9BA7C0';
}

export function partyColorForRace(party, race = null) {
  if (party === 'ind' && race?.indCand?.colorKey === 'mcmullin') return COLOR_TOKENS.mcmullin;
  return partyColor(party);
}

export function marginFamilyForRace(party, race = null) {
  if (party === 'ind' && race?.indCand?.colorKey === 'mcmullin') return 'mcmullin';
  return party;
}

export function isThirdParty(party) {
  return party === 'lib' || party === 'grn';
}

// ---------------------------------------------------------------------------
// The third-party share of the vote
// ---------------------------------------------------------------------------

// "fringe" is what third parties actually get. "surge" is the country losing
// its mind — 20% nationally, and a state-by-state spread wide enough that one
// party can carry a Senate seat in the right year.
export function thirdMode(game) {
  if (game.thirdMode === 'off') return 'off';
  return game.thirdMode === 'surge' ? 'surge' : 'fringe';
}

export function thirdTotalFor(abbr, game) {
  if (thirdMode(game) === 'off') return 0;
  const base = thirdMode(game) === 'surge' ? 20 : 3.2;
  const v = game.thirdVariance?.[abbr] ?? 1;
  return clamp(base * v, 0, thirdMode(game) === 'surge' ? 58 : 15);
}

export function thirdSplitFor(abbr, game) {
  const tilt = clamp(game.thirdTilt?.[abbr] ?? 0, -1, 1);
  const lib = clamp(0.5 + tilt * 0.42, 0.05, 0.95);
  return { lib, grn: 1 - lib };
}

// What each third party actually takes. In surge mode it is the fixed four-party
// table (src/data/fourParty.js) — the same numbers every time the mode is played.
// In fringe mode it is still the rolled board of variance and tilt.
export function thirdSharesFor(abbr, game) {
  const mode = thirdMode(game);
  if (mode === 'off') return { lib: 0, grn: 0 };
  if (mode === 'surge') return { lib: libertarianShare(abbr), grn: greenShare(abbr) };
  const split = thirdSplitFor(abbr, game);
  const total = thirdTotalFor(abbr, game);
  return { lib: total * split.lib, grn: total * split.grn };
}

export function rollThirdBoard(randomness = 1) {
  const variance = {};
  const tilt = {};
  const deterministic = Number(randomness) === 0;
  STATE_LIST.forEach((s) => {
    variance[s.abbr] = deterministic ? 1 : 0.15 + Math.random() * 2.7;
    tilt[s.abbr] = deterministic ? 0 : (Math.random() * 2 - 1) * (Math.random() < 0.5 ? 1 : 0.45);
  });
  return { thirdVariance: variance, thirdTilt: tilt };
}

// ---------------------------------------------------------------------------
// Shares
// ---------------------------------------------------------------------------

export function normalize(shares) {
  const total = Object.values(shares).reduce((sum, v) => sum + Math.max(0, v), 0) || 1;
  const out = /** @type {Record<string, number>} */ ({});
  Object.entries(shares).forEach(([k, v]) => {
    out[k] = (Math.max(0, v) / total) * 100;
  });
  return out;
}

// A third-party run is not a wave, it is a series of sieges — and it starts from
// nothing. Every point the party has in a state on day one is what the board gave
// it; the boost below is only what the campaign itself has since won there.
export function playerThirdBoost(game, abbr, mode) {
  const field = (game.stateMods?.[abbr] || 0) * (mode === 'result' ? 0.62 : 0.5);
  return field;
}

export function shareModel({ margin, abbr, game, mode = 'poll', indBase = 0, opening = undefined, race = 'president' }) {
  const base = thirdSharesFor(abbr, game);
  // Whatever the Lib and Green campaigns have won for themselves since day one.
  // Outside the four-party scenario they cannot pass a quarter of the vote.
  const effort = thirdMode(game) === 'off' ? {} : game.thirdMods || {};
  const bonus = (party) => {
    if (race !== 'president' || !game.build39?.candidateOpening || thirdMode(game) === 'off') return 0;
    const id = party === game.party ? game.candidateId : party === game.opponentParty ? game.opponentId : null;
    const effect = candidateOpeningBonus(id, abbr);
    return effect.nat + effect.state + effect.regionPoints;
  };
  const activeLibId = game?.party === 'lib' ? game.candidateId : game?.opponentParty === 'lib' ? game.opponentId : null;
  const activeLibCand = activeLibId ? CANDIDATE_BY_ID[activeLibId] : null;
  // Founding Father special Libertarian rules (Washington: 100% WA & DC, +30 all, +5 13 colonies;
  // Jefferson: +25 all, +10 13 colonies).
  if (race === 'president' && activeLibCand?.guaranteedSweepStates?.includes(abbr)) {
    return { dem: 0, rep: 0, lib: 100, grn: 0, ind: 0 };
  }
  const founderLibBonus = race === 'president' && activeLibCand?.thirdPartyAllStatesBonus
    ? activeLibCand.thirdPartyAllStatesBonus + (THIRTEEN_COLONIES.includes(abbr) ? (activeLibCand.thirdPartyColoniesBonus || 0) : 0)
    : 0;
  let libShare = Math.max(0, base.lib + (effort.lib?.[abbr] || 0) + bonus('lib') + founderLibBonus);
  let grnShare = Math.max(0, base.grn + (effort.grn?.[abbr] || 0) + bonus('grn'));
  const thirdCap = founderLibBonus > 0 ? 85 : (thirdMode(game) === 'surge' ? 55 : 25);
  const thirdTotal = libShare + grnShare;
  if (thirdTotal > thirdCap) {
    libShare *= thirdCap / thirdTotal;
    grnShare *= thirdCap / thirdTotal;
  }
  const scale = (100 - libShare - grnShare) / 100;
  // The third parties do not appear out of thin air. Every Libertarian vote is
  // paid for out of the Republican column (three in four) and the rest out of
  // the Democrats; the Greens are the mirror image. So a state where the Greens
  // run strong is a state the Democrats have already lost votes in — that is the
  // day-one map, and the campaign only moves it from there.
  // Keep the opening D-R spread anchored to `margin` so neutral state leans
  // open at BASE_LEANS rather than drifting from asymmetric third-party splits.
  const twoPartyPool = Math.max(0.4, 100 - libShare - grnShare);
  const clampedMargin = Math.max(-(twoPartyPool - 0.4), Math.min(twoPartyPool - 0.4, margin));
  let shares = {
    dem: Math.max(0.2, (twoPartyPool + clampedMargin) / 2),
    rep: Math.max(0.2, (twoPartyPool - clampedMargin) / 2),
    lib: libShare,
    grn: grnShare,
    ind: 0,
  };

  // Nobody gains a voter without somebody losing one. Whatever a party has won
  // since this state's opening position is paid for by the donors set out in
  // src/lib/voterFlow.js, in the same proportions in every race on the ballot.
  // "Opening" is where this race stood on day one — the state's own starting
  // margin for the presidency, a damped copy of it for the races below.
  const from = opening !== undefined ? opening : game.baseMargins?.[abbr];
  if (from !== undefined) {
    const boost =
      game.party === 'lib' || game.party === 'grn'
        ? { party: game.party, points: playerThirdBoost(game, abbr, mode) }
        : null;
    shares = flowShares(shares, ((margin - from) / 2) * scale, boost);
  }

  // No Democrat on the ballot: their coalition goes to the independent, plus
  // the Republicans who will cross over for a straight talker.
  if (indBase > 0) {
    shares.ind = shares.dem + indBase;
    shares.dem = 0;
  }

  // The night the tickets trade places: the Libertarian inherits the Republican
  // vote and the Republican is left with the Libertarian's.
  if (game.libSwap) {
    const held = shares.rep;
    shares.rep = shares.lib;
    shares.lib = held;
  }

  // Four-party campaign news directly shifts a small block of voters toward
  // its named beneficiaries, paid for proportionally by the other ballot lines.
  if (thirdMode(game) === 'surge' && game.fourPartyNews) {
    const additions = Object.fromEntries(
      Object.entries(game.fourPartyNews).filter(([party, points]) =>
        ['dem', 'rep', 'lib', 'grn'].includes(party) && points > 0 && shares[party] !== undefined
      )
    );
    const requested = Object.values(additions).reduce((sum, points) => sum + points, 0);
    const donors = Object.keys(shares).filter((party) => !Object.hasOwn(additions, party));
    const available = donors.reduce((sum, party) => sum + Math.max(0, shares[party]), 0);
    const applied = Math.min(requested, available);
    if (applied > 0) {
      const ratio = applied / requested;
      const donorRatio = applied / (available || 1);
      Object.entries(additions).forEach(([party, points]) => { shares[party] += points * ratio; });
      donors.forEach((party) => { shares[party] = Math.max(0, shares[party] - shares[party] * donorRatio); });
    }
  }

  if (game.build38?.groupEffects?.length && opening === undefined && indBase === 0) {
    for (const party of ['dem','rep','lib','grn']) {
      const bonus = ticketGroupShare(abbr, party, game);
      if (!(bonus > 0) || !(shares[party] > 0)) continue;
      const donors = Object.keys(shares).filter((id) => id !== party);
      const pool = donors.reduce((sum, id) => sum + shares[id], 0);
      const gain = Math.min(pool, bonus);
      if (pool > 0) donors.forEach((id) => { shares[id] *= 1 - gain / pool; });
      shares[party] += gain;
    }
  }
  const modeled = applyScenarioShares({ stateId: abbr, shares: normalize(shares), race, game });
  if (race !== 'president' || !game.build40?.groupEffectsByParty) return modeled;
  for (const [party, mods] of Object.entries(game.build40.groupEffectsByParty)) {
    if (!(modeled[party] > 0)) continue;
    const before = modeled[party];
    const after = clamp(before + stateGroupShift(abbr, mods), 0, 99.9);
    const fraction = (100 - after) / (100 - before || 1);
    Object.keys(modeled).filter((id) => id !== party).forEach((id) => { modeled[id] *= fraction; });
    modeled[party] = after;
  }
  return modeled;
}

export function winnerOf(shares) {
  const entries = Object.entries(shares).sort((a, b) => b[1] - a[1]);
  const [party, share] = entries[0];
  const [runnerUp, runnerShare] = entries[1];
  return { party, share, runnerUp, runnerShare, margin: share - runnerShare };
}

export function ratingFor(party, margin, showExact) {
  const side = PARTY_TAG[party] || 'D';
  const abs = Math.abs(margin);
  if (isTossup(margin)) return showExact ? `Tossup · ${side}+${abs.toFixed(1)}` : 'Tossup';
  if (showExact) return `${side} +${abs.toFixed(1)}`;
  if (abs < 5) return `Lean ${side}`;
  if (abs < 12) return `Likely ${side}`;
  return `Solid ${side}`;
}

// ---------------------------------------------------------------------------
// The four-party ballot
//
// With the surge switch on, everything below the presidency is a fixed map read
// straight out of src/data/fourPartySeats.js: four parties, roughly a quarter of
// the seats each, the same country every time the mode is played. Edit the
// tables in that file and these races follow.
// ---------------------------------------------------------------------------

// A fixed race, four ways: the winner takes the lead off the runner-up, and the
// other two land on the runner-up's score. Always adds up to 100.
function fixedRaceShares(winner, lead) {
  const runner = winner === 'dem' || winner === 'grn' ? 'rep' : 'dem';
  const top = 25 + lead * 0.75;
  const rest = top - lead;
  const shares = { dem: rest, rep: rest, lib: rest, grn: rest, ind: 0 };
  shares[winner] = top;
  shares[runner] = rest;
  return shares;
}

function senateDemocraticShareBonus(game) {
  if (!game?.electionModelVersion) return 2;
  // The approved D+7.3 opening map retains the previous fictional bonus.
  const opening = Number(game.startingNationalGeneric) || 0;
  return 2 * Math.max(0, Math.min(1, opening / 7.3));
}

function applyDemocraticSenateBaseline(source, game) {
  const shares = { ...source };
  const others = Object.entries(shares)
    .filter(([party]) => party !== 'dem')
    .reduce((sum, [, value]) => sum + Math.max(0, value || 0), 0);
  const bonus = Math.min(senateDemocraticShareBonus(game), others);
  if (!bonus || others <= 0) return shares;
  shares.dem = Math.max(0, shares.dem || 0) + bonus;
  Object.keys(shares).forEach((party) => {
    if (party !== 'dem') shares[party] = Math.max(0, shares[party] || 0) * (1 - bonus / others);
  });
  return shares;
}

function fixedRace(base, fixed, kind, game = null, swing = 0) {
  const baseShares = fixedRaceShares(fixed.winner, fixed.lead);
  const transfer = Math.max(-baseShares.dem, Math.min(baseShares.rep, swing / 2));
  baseShares.dem += transfer;
  baseShares.rep -= transfer;
  const shares = applyScenarioShares({ stateId: base.state, race: kind === 'gov' ? 'governor' : kind,
    shares: kind === 'senate' ? applyDemocraticSenateBaseline(baseShares, game) : baseShares, game });
  const firstChoice = winnerOf(shares);
  const rcv = game?.build39?.scenario?.id === 'six-party' ? scenarioRankedChoiceTally(shares) : rankedChoiceTally(shares);
  const win = {
    party: rcv.winner,
    share: rcv.shares[rcv.winner],
    runnerUp: rcv.runnerUp,
    runnerShare: rcv.shares[rcv.runnerUp],
    margin: rcv.margin,
  };
  const tossup = isTossup(rcv.margin);
  const demSide = rcv.winner === 'dem' || rcv.winner === 'grn';
  return {
    ...base,
    ...(kind === 'gov' ? { name: STATE_BY_ABBR[base.state]?.name || base.state } : {}),
    margin: demSide ? rcv.margin : -rcv.margin,
    shares,
    rcvShares: rcv.shares,
    firstChoiceWinner: firstChoice.party,
    firstChoiceLead: firstChoice.margin,
    rcvRounds: rcv.rounds,
    winner: rcv.winner,
    win,
    lead: win.margin,
    tossup,
    color: marginColor(rcv.winner, win.margin),
    winnerColor: partyColor(rcv.winner),
    flip: rcv.winner !== base.defending,
    close: tossup,
    label: ratingFor(rcv.winner, win.margin, false),
  };
}

function majorityOf(counts, needed) {
  return Object.entries(counts).find(([party, count]) => party !== 'ind' && party !== 'other' && count >= needed)?.[0] || 'hung';
}

function fourPartySenate(game, marginOf) {
  const races = SENATE_RACES.filter((r) => SENATE_4P_RACES[r.state]).map((held) => {
    const current = marginOf(held.state);
    const local = current - (game.baseMargins?.[held.state] ?? current);
    const swing = game.electionModelVersion
      ? (Number(game.natGeneric) || 0) * 0.55 + local * 0.45 + (game.downballotNews?.senate?.[held.state] || 0)
      : 0;
    const race = fixedRace(held, SENATE_4P_RACES[held.state], 'senate', game, swing);
    return { ...race, caucus: race.winner, indCand: null };
  });
  const counts = { ...SENATE_4P_BASE };
  races.forEach((r) => {
    counts[r.winner] = (counts[r.winner] || 0) + 1;
  });
  const gainedD = races.filter((r) => r.winner === 'dem').length;
  const gainedR = races.filter((r) => r.winner === 'rep').length;

  return {
    races,
    byState: races.reduce((acc, r) => {
      acc[r.state] = r;
      return acc;
    }, {}),
    fourParty: true,
    start: { ...SENATE_4P_BASE },
    dem: counts.dem,
    rep: counts.rep,
    lib: counts.lib,
    grn: counts.grn,
    other: Object.entries(counts).reduce((sum, [party, count]) => party === 'dem' || party === 'rep' ? sum : sum + count, 0),
    seatsByParty: counts,
    net: gainedD - gainedR,
    gainedD,
    gainedR,
    flipsD: gainedD,
    flipsR: gainedR,
    control: majorityOf(counts, SENATE_MAJORITY),
    startControl: majorityOf(SENATE_4P_BASE, SENATE_MAJORITY),
    flipped: false,
    tossups: races.filter((r) => r.close).sort((a, b) => a.lead - b.lead),
    thirdWins: races.filter((r) => r.winner === 'lib' || r.winner === 'grn'),
    majority: SENATE_MAJORITY,
  };
}

function fourPartyGov(game) {
  const races = GOVERNOR_RACES.filter((r) => GOV_4P_RACES[r.state]).map((held) =>
    fixedRace(held, game.build38?.openingModel ? { ...GOV_4P_RACES[held.state], lead: GOV_4P_RACES[held.state].lead * 0.8 } : GOV_4P_RACES[held.state], 'gov', game)
  );
  const counts = { ...GOV_4P_BASE };
  races.forEach((r) => {
    counts[r.winner] = (counts[r.winner] || 0) + 1;
  });
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return {
    races,
    fourParty: true,
    start: { ...GOV_4P_BASE },
    dem: counts.dem,
    rep: counts.rep,
    lib: counts.lib,
    grn: counts.grn,
    other: counts.lib + counts.grn,
    total: races.length,
    racesUp: races.length,
    net: counts.dem - GOV_4P_BASE.dem,
    control: majorityOf(counts, Math.floor(total / 2) + 1),
    startControl: 'hung',
    flipped: false,
    tossups: races.filter((r) => r.close),
    thirdWins: races.filter((r) => r.winner === 'lib' || r.winner === 'grn'),
  };
}

// ---------------------------------------------------------------------------
// Race margins
// ---------------------------------------------------------------------------

export function rollRaceQuality() {
  const q = {};
  SENATE_RACES.forEach((r) => {
    q[`senate:${r.state}`] = gauss() * 3.7;
  });
  GOVERNOR_RACES.forEach((r) => {
    q[`gov:${r.state}`] = gauss() * 4.4;
  });
  let houseQualSum = 0;
  let houseQualWeight = 0;
  STATE_LIST.forEach((s) => {
    const val = gauss() * 1.45;
    q[`house:${s.abbr}`] = val;
    if ((HOUSE_SEATS[s.abbr] || 0) > 0) {
      const w = voteUnits(s.abbr);
      houseQualSum += val * w;
      houseQualWeight += w;
    }
  });
  if (houseQualWeight > 0) {
    const houseQualMean = houseQualSum / houseQualWeight;
    STATE_LIST.forEach((s) => {
      if ((HOUSE_SEATS[s.abbr] || 0) > 0) {
        q[`house:${s.abbr}`] -= houseQualMean;
      }
    });
  }
  return q;
}

function qualityOf(game, key) {
  return game.raceQuality?.[key] ?? 0;
}

const SENATE_MOD = SENATE_RACES.reduce((acc, r) => {
  acc[r.state] = r.mod || 0;
  return acc;
}, {});

// The recruits the map file already knows about: where a race has a name on it
// before the campaign starts, the quality is fixed instead of rolled.
const FIXED_QUALITY = {
  ...SENATE_RACES.reduce((acc, r) => ({ ...acc, [`senate:${r.state}`]: r.quality || 0 }), {}),
  ...GOVERNOR_RACES.reduce((acc, r) => ({ ...acc, [`gov:${r.state}`]: r.quality || 0 }), {}),
};

export const HOUSE_DISTRICT_BASELINES = houseDistrictBaselineData.districts;
export const HOUSE_DISTRICT_BY_ID = Object.fromEntries(HOUSE_DISTRICT_BASELINES.map((district) => [district.id, district]));

function netFactionDownballotBonus(game) {
  const playerSign = game.party === 'rep' ? -1 : game.party === 'dem' ? 1 : 0;
  let total = playerSign * factionEffects(game).downballotBonus;
  const oppParty = game.opponentParty;
  if ((oppParty === 'dem' || oppParty === 'rep') && game.aiFactions?.[oppParty]) {
    const oppSign = oppParty === 'rep' ? -1 : 1;
    const oppGame = { ...game, party: oppParty, candidateId: game.opponentId, factions: game.aiFactions[oppParty], factionCrises: null };
    total += oppSign * factionEffects(oppGame).downballotBonus;
  }
  return total;
}

function houseStateAdjustment(state, game, factionBonus = null) {
  const quality = (qualityOf(game, `house:${state}`) + fixedQuality('house', state)) * 0.5;
  const localNews = game.downballotNews?.house?.[state] || 0;
  const eventEffects = game.build40?.houseEffectsByState?.[state];
  const directCampaign = (game.dbMods?.[state] || 0) + (eventEffects?.dem || 0) - (eventEffects?.rep || 0);
  const drift = game.dbDrag?.[`house:${state}`] || 0;
  const faction = factionBonus ?? netFactionDownballotBonus(game);
  return { quality, localNews, directCampaign, drift, faction, total: quality + localNews + directCampaign + drift + faction };
}

function houseDistrictMarginWithEffects(baseline, game, effects) {
  const state = baseline.stateAbbr || baseline.state;
  const stateDraw = (game.houseStateDrawErrors?.[state] || 0) * (game.houseReportedDistrictRemaining?.[baseline.id] ?? 1);
  const houseNeutralOffset = game?.coattailModelVersion >= 1 && !game.presidentialDistrictAllocation ? -0.88 : 0;
  return baseline.districtLeanDMinusR + houseNeutralOffset + genericIn(state, game) + effects.total + stateDraw
    + (game.houseDistrictErrors?.[baseline.id] || 0)
    + (game.houseDistrictReportShifts?.[baseline.id] || 0);
}

// House districts are fundamentals plus the same current state generic ballot.
// Presidential polling and presidential coattails are intentionally absent.
export function houseDistrictMargin(district, game) {
  const baseline = effectiveHouseDistrictBaseline(HOUSE_DISTRICT_BY_ID[district.id] || district, game);
  const state = baseline.stateAbbr || baseline.state;
  return houseDistrictMarginWithEffects(baseline, game, houseStateAdjustment(state, game));
}

function houseDistrictRaces(game, mode = 'poll') {
  const factionBonus = netFactionDownballotBonus(game);
  const effectsByState = Object.fromEntries(STATE_LIST
    .filter((state) => (HOUSE_SEATS[state.abbr] || 0) > 0)
    .map((state) => [state.abbr, houseStateAdjustment(state.abbr, game, factionBonus)]));
  return HOUSE_DISTRICT_BASELINES.map((source) => {
    const baseline = effectiveHouseDistrictBaseline(source, game);
    const state = baseline.stateAbbr;
    const effects = effectsByState[state];
    const margin = houseDistrictMarginWithEffects(baseline, game, effects);
    const shares = shareModel({ margin, abbr: state, game, mode, opening: margin, race: game.presidentialDistrictAllocation ? 'president' : 'house' });
    if (game.forecastCompactHouse) {
      let winner = game.houseCalledDistrictWinners?.[baseline.id];
      if (!winner) {
        let highest = -1;
        for (const party of Object.keys(shares)) {
          if (shares[party] <= highest) continue;
          highest = shares[party];
          winner = party;
        }
      }
      return /** @type {typeof baseline & {state: string, margin: number, shares: Record<string, number>, winner: string, lead?: number, tossup?: boolean}} */ ({ ...baseline, state, margin, shares, winner });
    }
    const win = winnerOf(shares);
    const winner = game.houseCalledDistrictWinners?.[baseline.id] || win.party;
    const tossup = isTossup(win.margin);
    return {
      ...baseline,
      state,
      margin,
      spread: shares.dem - shares.rep,
      shares,
      winner,
      win,
      lead: win.margin,
      tossup,
      close: tossup,
      qualityContribution: effects.quality,
      localNewsEffect: effects.localNews,
      directCampaignEffect: effects.directCampaign,
      driftEffect: effects.drift,
      color: marginColor(win.party, win.margin),
      winnerColor: partyColor(win.party),
      label: ratingFor(win.party, win.margin, false),
    };
  });
}

export function fixedQuality(kind, state) {
  return FIXED_QUALITY[`${kind}:${state}`] || 0;
}

export function raceMargin(state, kind, game, marginOf, mode = 'poll') {
  if (kind === 'house') {
    const districts = HOUSE_DISTRICT_BASELINES.filter((district) => district.stateAbbr === state);
    return districts.length
      ? districts.reduce((sum, district) => sum + effectiveHouseDistrictBaseline(district, game).districtLeanDMinusR, 0) / districts.length
        + genericIn(state, game) + houseStateAdjustment(state, game).total
      : genericIn(state, game);
  }
  // The top of the ticket, plus whatever this state's own environment has done
  // since: the generic ballot is not the presidential ballot, and the whole point
  // of tracking it separately is that it can drift on its own.
  // R19: Under the 0.2.2 coattail model, presidential coattails reach Senate and
  // Governor races once through genericIn(state, game) rather than double-counting
  // the full presidential marginOf(state). Legacy saves retain prior behavior.
  const senateTrim =
    kind === 'senate' && game?.coattailModelVersion >= 1 && (Number(game.startingNationalGeneric) || 0) < 7
      ? -1.5
      : 0;
  const top = (game?.coattailModelVersion >= 1
    ? (game.leans?.[state] ?? BASE_LEANS[state] ?? 0) + genericIn(state, game)
    : marginOf(state) + genericIn(state, game)) + senateTrim;

  // Election-night house effects hit downballot races softer than the top line.
  const damped = mode === 'result' ? top * 0.92 : top;
  let m =
    damped * RACE_WEIGHT[kind] +
    (kind === 'house' ? qualityOf(game, `${kind}:${state}`) * 0.5 : qualityOf(game, `${kind}:${state}`)) +
    (kind === 'house' ? fixedQuality(kind, state) * 0.5 : fixedQuality(kind, state)) +
    // The weekly drag back toward the race's own opening position.
    (game.dbDrag?.[`${kind}:${state}`] || 0);
  m += game.downballotNews?.[kind]?.[state] || 0;

  // The campaign itself: your work in a state and the opponent's counter-moves.
  // A third-party run lives in its own share, so it does not drag this margin.
  const field = (game.dbMods?.[state] || 0) + (isThirdParty(game.party) ? 0 : (game.stateMods?.[state] || 0) * 0.42);
  m += field;
  if (kind === 'senate' || kind === 'house' || kind === 'gov') {
    m += netFactionDownballotBonus(game);
  }

  if (kind === 'senate') m += (SENATE_MOD[state] || 0) + 0.4 * senateDemocraticShareBonus(game);

  // A little noise of its own, so two states with identical numbers are not
  // identical races.
  m += (hash01(`${kind}-${state}-${game.week || 0}`) - 0.5) * 2.6;
  return m;
}

function houseLabel(demSeats, repSeats, libSeats, grnSeats, indSeats = 0) {
  const third = [libSeats ? `${libSeats}L` : '', grnSeats ? `${grnSeats}G` : '', indSeats ? `${indSeats}I` : ''].filter(Boolean).join(' ');
  return `${demSeats}D–${repSeats}R${third ? ` ${third}` : ''}`;
}

// A downballot race inherits only part of the state's opening margin, so its
// day-one position is that damped figure plus whatever is structural to the
// race itself.
function openingFor(game, abbr, kind, structural = 0) {
  const base = game.baseMargins?.[abbr];
  return base === undefined ? undefined : base * RACE_WEIGHT[kind] + structural;
}

// ---------------------------------------------------------------------------
// Senate
// ---------------------------------------------------------------------------

export function buildSenate(game, marginOf, mode = 'poll') {
  if (thirdMode(game) === 'surge') return fourPartySenate(game, marginOf);
  // 40 D / 26 R are already seated and not on the ballot; the 34 races add to them.
  const start = SENATE_START;
  const byState = {};

  const races = SENATE_RACES.map((base) => {
    const st = base.state;
    const indie = game.indieSenate?.[st] ? INDIE_SENATE_RACES[st] : null;
    const utah = st === 'UT' && game.mcmullin !== false ? UTAH_INDEPENDENT : null;
    const indCand = utah || indie;

    const margin = raceMargin(st, 'senate', game, marginOf, mode) + (indie ? indie.mod : 0);
    const modeledShares = shareModel({
      margin,
      abbr: st,
      game,
      mode,
      opening: openingFor(game, st, 'senate', (indie ? indie.mod : 0) + fixedQuality('senate', st)),
      indBase: utah ? 9 : indie ? 6.5 : 0,
      race: 'senate',
    });
    const shares = applyDemocraticSenateBaseline(modeledShares, game);
    const win = winnerOf(shares);
    const tossup = isTossup(win.margin);
    // An independent who wins is painted in their own colour family: orange for
    // McMullin, green for the Democrats running without the label.
    const isInd = win.party === 'ind' && indCand;
    const family = isInd ? indCand.colorKey || 'ind' : win.party;
    const color = marginColor(family, win.margin);
    const winnerColor = isInd ? indCand.color : partyColor(win.party);
    const caucus = win.party === 'ind' ? (utah ? 'none' : 'dem') : win.party;

    const race = {
      ...base,
      margin,
      localNewsEffect: game.downballotNews?.senate?.[st] || 0,
      shares,
      winner: win.party,
      win,
      lead: win.margin,
      color,
      winnerColor,
      caucus,
      indCand: indCand ? { ...indCand, party: 'ind' } : null,
      flip: caucus !== base.defending,
      tossup,
      close: tossup,
      label: ratingFor(win.party, win.margin, false),
    };
    byState[st] = race;
    return race;
  });

  // The base seats are safe; every one of the 34 races simply adds a seat.
  let dem = start.dem;
  let rep = start.rep;
  let other = 0;
  races.forEach((r) => {
    if (r.caucus === 'dem') dem += 1;
    else if (r.caucus === 'rep') rep += 1;
    else other += 1;
  });

  const control = dem >= SENATE_MAJORITY ? 'dem' : rep >= SENATE_MAJORITY ? 'rep' : 'hung';
  // Republicans came into the cycle holding the chamber; a Democratic majority
  // is a change of hands.
  const startControl = 'rep';
  const tossups = races.filter((r) => r.close).sort((a, b) => a.lead - b.lead);
  const thirdWins = races.filter((r) => r.winner === 'lib' || r.winner === 'grn' || r.winner === 'ind');
  const gainedD = races.filter((r) => r.flip && r.caucus === 'dem').length;
  const gainedR = races.filter((r) => r.flip && r.caucus === 'rep').length;

  return {
    races,
    byState,
    start,
    dem,
    rep,
    other,
    net: gainedD - gainedR,
    gainedD,
    gainedR,
    flipsD: gainedD,
    flipsR: gainedR,
    control,
    startControl,
    flipped: control !== startControl,
    tossups,
    thirdWins,
    majority: SENATE_MAJORITY,
  };
}

// ---------------------------------------------------------------------------
// House
// ---------------------------------------------------------------------------

const housePartyIds = (game) => [...new Set(['dem', 'rep', 'lib', 'grn', 'ind', ...scenarioPartyIds(game.build39?.scenario?.id, game.presidentialDistrictAllocation ? 'president' : 'house')])];

function buildHouseStandard(game, marginOf, mode = 'poll') {
  const districts = houseDistrictRaces(game, mode);
  const grouped = new Map();
  districts.forEach((district) => {
    const state = grouped.get(district.state) || [];
    state.push(district);
    grouped.set(district.state, state);
  });
  const states = STATE_LIST.filter((state) => (HOUSE_SEATS[state.abbr] || 0) > 0).map((state) => {
    const stateDistricts = grouped.get(state.abbr) || [];
    const seatsByParty = { dem: 0, rep: 0, lib: 0, grn: 0, ind: 0 };
    stateDistricts.forEach((district) => { seatsByParty[district.winner] = (seatsByParty[district.winner] || 0) + 1; });
    const mean = (key) => stateDistricts.reduce((sum, district) => sum + (district[key] || 0), 0) / Math.max(1, stateDistricts.length);
    const shares = Object.fromEntries(housePartyIds(game).map((party) => [
      party,
      stateDistricts.reduce((sum, district) => sum + (district.shares?.[party] || 0), 0) / Math.max(1, stateDistricts.length),
    ]));
    const ranked = Object.entries(seatsByParty).sort((a, b) => b[1] - a[1]);
    const winner = ranked[0]?.[1] > 0 ? ranked[0][0] : 'rep';
    const margin = shares.dem - shares.rep;
    const lead = mean('lead');
    const seatSpread = (ranked[0][1] - ranked[1][1]) / stateDistricts.length * 100;
    const tossup = stateDistricts.some((district) => district.tossup);
    return {
      state: state.abbr,
      name: state.name,
      seats: HOUSE_SEATS[state.abbr],
      demSeats: seatsByParty.dem,
      repSeats: seatsByParty.rep,
      libSeats: seatsByParty.lib,
      grnSeats: seatsByParty.grn,
      indSeats: seatsByParty.ind,
      seatsByParty,
      margin,
      qualityContribution: mean('qualityContribution'),
      localNewsEffect: mean('localNewsEffect'),
      shares,
      lead,
      winner,
      tossup,
      color: marginColor(winner, seatSpread),
      winnerColor: partyColor(winner),
      label: houseLabel(seatsByParty.dem, seatsByParty.rep, seatsByParty.lib, seatsByParty.grn, seatsByParty.ind),
      close: tossup,
    };
  });

  const sum = (key) => districts.filter((district) => district.winner === key).length;
  const dem = sum('dem');
  const rep = sum('rep');
  const lib = sum('lib');
  const grn = sum('grn');
  const ind = sum('ind');
  const start = game.houseStart || { dem: 213, rep: HOUSE_TOTAL - 213 };
  const seatsByParty = Object.fromEntries(housePartyIds(game).map((party) => [party, sum(party)]));
  const control = majorityOf(seatsByParty, HOUSE_MAJORITY);
  const startControl = start.dem >= HOUSE_MAJORITY ? 'dem' : 'rep';
  const closest = game.forecastCompactHouse ? [] : districts
    .slice()
    .sort((a, b) => a.lead - b.lead)
    .slice(0, 12);

  return {
    states,
    districts,
    dem,
    rep,
    lib,
    grn,
    ind,
    other: HOUSE_TOTAL - dem - rep,
    seatsByParty,
    total: HOUSE_TOTAL,
    start,
    net: dem - start.dem,
    control,
    startControl,
    flipped: control !== startControl,
    majority: HOUSE_MAJORITY,
    rule: 'standard',
    baselineSourceCounts: houseDistrictBaselineData.sourceCounts,
    tossups: districts.filter((district) => district.tossup),
    closest,
  };
}

function houseVoteRows(game, marginOf, mode) {
  const districts = houseDistrictRaces(game, mode);
  return STATE_LIST.filter((state) => (HOUSE_SEATS[state.abbr] || 0) > 0).map((state) => {
    const races = districts.filter((district) => district.state === state.abbr);
    const shares = Object.fromEntries(housePartyIds(game).map((party) => [
      party,
      races.reduce((sum, race) => sum + (race.shares[party] || 0), 0) / Math.max(1, races.length),
    ]));
    return { state, margin: shares.dem - shares.rep, shares, districts: races };
  });
}

function stateAllocatedHouseRow(state, seats, shares, allocation, extra = {}) {
  const demSeats = allocation.dem || 0;
  const repSeats = allocation.rep || 0;
  const libSeats = allocation.lib || 0;
  const grnSeats = allocation.grn || 0;
  const indSeats = allocation.ind || 0;
  const ranked = Object.entries({ dem: demSeats, rep: repSeats, lib: libSeats, grn: grnSeats, ind: indSeats, ...allocation }).sort((a, b) => b[1] - a[1]);
  const winner = ranked[0][0];
  const seatSpread = (ranked[0][1] - ranked[1][1]) / Math.max(1, seats) * 100;
  const margin = (shares.dem || 0) - (shares.rep || 0);
  const tossup = isTossup(margin);
  return {
    state: state.abbr,
    name: state.name,
    seats,
    demSeats,
    repSeats,
    libSeats,
    grnSeats,
    indSeats,
    shares,
    firstChoiceSeats: { ...allocation },
    seatsByParty: { ...allocation },
    margin,
    lead: Math.abs(margin),
    winner,
    tossup,
    color: marginColor(winner, seatSpread),
    winnerColor: partyColor(winner),
    label: houseLabel(demSeats, repSeats, libSeats, grnSeats, indSeats),
    close: tossup,
    ...extra,
  };
}

function houseTotals(states, total, majority, rule, start, districts = []) {
  const sum = (key) => states.reduce((acc, row) => acc + (row[key] || 0), 0);
  const counts = { dem: sum('demSeats'), rep: sum('repSeats'), lib: sum('libSeats'), grn: sum('grnSeats'), ind: sum('indSeats') };
  for (const row of states) for (const party of Object.keys(row.seatsByParty || {})) {
    if (!Object.hasOwn(counts, party)) counts[party] = states.reduce((value, state) => value + (state.seatsByParty?.[party] || 0), 0);
  }
  const control = majorityOf(counts, majority);
  const startControl = majorityOf(start, majority);
  return {
    states,
    districts,
    ...counts,
    other: total - counts.dem - counts.rep,
    seatsByParty: counts,
    total,
    start,
    net: counts.dem - start.dem,
    control,
    startControl,
    flipped: control !== startControl,
    majority,
    rule,
    baselineSourceCounts: houseDistrictBaselineData.sourceCounts,
    tossups: states.filter((row) => row.tossup),
    closest: states.slice().sort((a, b) => Math.abs(a.margin) - Math.abs(b.margin)).slice(0, 6),
  };
}

function calledHouseSeats(report) {
  return report.seatsByParty || { dem: report.demSeats, rep: report.repSeats, lib: report.libSeats, grn: report.grnSeats, ind: report.indSeats };
}

function buildHouseProportional(game, marginOf, mode) {
  const votes = houseVoteRows(game, marginOf, mode);
  const national = weightedNationalShares(votes, (row) => row.shares, (row) => ballotsInState(row.state.abbr));
  const qualifying = Object.keys(national).filter((party) => national[party] >= 5 || (game.build39?.scenario?.id === 'regional-parties' && REGIONAL_PARTY_IDS.includes(party)));
  const states = votes.map(({ state, margin, shares }) => stateAllocatedHouseRow(
    state,
    HOUSE_SEATS[state.abbr],
    shares,
    game.houseCalledStateSeats?.[state.abbr] ? calledHouseSeats(game.houseCalledStateSeats[state.abbr])
      : allocateProportional(shares, HOUSE_SEATS[state.abbr], 101, qualifying),
    { rule: 'pr', voteShares: shares }
  ));
  const start = game.houseStart || { dem: 213, rep: HOUSE_TOTAL - 213 };
  return houseTotals(states, HOUSE_TOTAL, HOUSE_MAJORITY, 'pr', start, []);
}

function buildHouseMmp(game, marginOf, mode) {
  const direct = buildHouseStandard(game, marginOf, mode);
  const votes = direct.states.map((row) => {
    const ideology = game.build38?.openingModel && !['six-party', 'regional-parties'].includes(game.build39?.scenario?.id) ? VOTER_COMPOSITION.byState[row.state]?.ideology : null;
    // Independence is a modeled joint distribution, not observed ballot data.
    const listParties = Object.keys(row.shares).filter((id) => id !== 'ind' || row.shares[id] > 0);
    const list = ideology && allocateMmpListPreferences({
      availableListPartyIds: listParties,
      cohorts: [['far left', ideology['far left']], ['libertarian', ideology.libertarian], ['moderate', 100 - ideology['far left'] - ideology.libertarian]]
        .flatMap(([ideologyId, portion]) => listParties.map((firstChoiceParty) =>
          ({ id: ideologyId + ':' + firstChoiceParty, ideologyId, firstChoiceParty, weight: Number(portion) * row.shares[firstChoiceParty] / 100 }))),
    });
    return { state: STATE_BY_ABBR[row.state], shares: list?.conserved ? list.listVotesByParty : row.shares };
  });
  const byState = Object.fromEntries(votes.map((row) => [row.state.abbr, row]));
  const national = weightedNationalShares(votes, (row) => row.shares, (row) => ballotsInState(row.state.abbr));
  const directStates = /** @type {Array<any>} */ (direct.states);
  const directTotals = /** @type {Record<string, number>} */ ({ dem: 0, rep: 0, lib: 0, grn: 0, ind: 0 });
  housePartyIds(game).forEach((party) => {
    directTotals[party] = directStates.reduce((sum, row) => sum + (row.seatsByParty[party] || 0), 0);
  });
  const qualifying = Object.keys(national).filter((party) => national[party] >= 5 || directTotals[party] >= 3 || (game.build39?.scenario?.id === 'regional-parties' && REGIONAL_PARTY_IDS.includes(party)));
  const states = directStates.map((directRow) => {
    const voteRow = byState[directRow.state];
    const seats = directRow.seats;
    const target = allocateProportional(voteRow?.shares || {}, seats * 2, 101, qualifying);
    const deficit = Object.fromEntries(housePartyIds(game).map((party) => [
      party,
      Math.max(0, (target[party] || 0) - (directRow.seatsByParty[party] || 0)),
    ]));
    const baseDirect = directRow.seatsByParty;
    const listSeats = game.houseCalledStateSeats?.[directRow.state]?.listSeats ||
      largestRemainder(Object.values(deficit).some((value) => value > 0) ? deficit : (voteRow?.shares || {}), seats, qualifying);
    const totalSeats = Object.fromEntries(housePartyIds(game).map((party) => [party, (baseDirect[party] || 0) + (listSeats[party] || 0)]));
    return stateAllocatedHouseRow(
      voteRow?.state || STATE_BY_ABBR[directRow.state],
      seats * 2,
      directRow.shares,
      totalSeats,
      {
        rule: 'mmp',
        qualityContribution: directRow.qualityContribution,
        directSeats: baseDirect,
        listVoteShares: voteRow?.shares || {},
        listSeats,
        directTotal: seats,
        listTotal: seats,
        label: `${totalSeats.dem}D · ${totalSeats.rep}R (${seats} list)`,
      }
    );
  });
  const startBase = game.houseStart || { dem: 213, rep: HOUSE_TOTAL - 213 };
  const start = { dem: (startBase.dem || 0) * 2, rep: (startBase.rep || 0) * 2, lib: 0, grn: 0, ind: 0 };
  return houseTotals(states, HOUSE_TOTAL * 2, HOUSE_MAJORITY * 2, 'mmp', start, direct.districts);
}

export function buildHouse(game, marginOf, mode = 'poll') {
  const house = game.houseRule === 'pr' ? buildHouseProportional(game, marginOf, mode)
    : game.houseRule === 'mmp' ? buildHouseMmp(game, marginOf, mode) : buildHouseStandard(game, marginOf, mode);
  return hasBuild45HousePvi(game)
    ? { ...house, leanSourceLabel: 'Cook PVI × 2, with owner state adjustments (2026)' } : house;
}

// ---------------------------------------------------------------------------
// Governors
// ---------------------------------------------------------------------------


// Sum modeled 435-district House votes across all states to get the exact
// national House generic-ballot margin (D - R in percentage points).
export function computeHouseNationalMargin(game, marginOf, mode = 'poll') {
  const house = buildHouse(game, marginOf, mode);
  let demVotes = 0;
  let repVotes = 0;
  let totalVotes = 0;
  const districts = house.districts || [];
  if (districts.length > 0) {
    const seatsByState = {};
    for (const state of house.states || []) {
      seatsByState[state.state] = state.seats || HOUSE_SEATS[state.state] || 1;
    }
    for (const d of districts) {
      const st = d.state || d.stateAbbr;
      const stateBallots = voteUnits(st);
      const perDistrict = stateBallots / (seatsByState[st] || HOUSE_SEATS[st] || 1);
      const sh = d.shares || {};
      demVotes += ((sh.dem || 0) / 100) * perDistrict;
      repVotes += ((sh.rep || 0) / 100) * perDistrict;
      totalVotes += perDistrict;
    }
  } else {
    for (const state of house.states || []) {
      const stateBallots = voteUnits(state.state);
      const sh = state.shares || {};
      demVotes += ((sh.dem || 0) / 100) * stateBallots;
      repVotes += ((sh.rep || 0) / 100) * stateBallots;
      totalVotes += stateBallots;
    }
  }
  if (!totalVotes) return 0;
  return Math.round(((demVotes - repVotes) / totalVotes) * 1000) / 10;
}

export function buildGov(game, marginOf, mode = 'poll') {
  if (thirdMode(game) === 'surge') return fourPartyGov(game);
  const races = GOVERNOR_RACES.map((base) => {
    const offset = game.build38?.governorOffsets?.[base.state] || 0;
    const margin = raceMargin(base.state, 'gov', game, marginOf, mode) + base.mod + offset;
    const shares = shareModel({
      margin,
      abbr: base.state,
      game,
      mode,
      opening: openingFor(game, base.state, 'gov', base.mod + fixedQuality('gov', base.state) + offset),
      race: 'governor',
    });
    const win = winnerOf(shares);
    const tossup = isTossup(win.margin);
    return {
      ...base,
      name: STATE_BY_ABBR[base.state]?.name || base.state,
      margin,
      localNewsEffect: game.downballotNews?.gov?.[base.state] || 0,
      shares,
      winner: win.party,
      win,
      lead: win.margin,
      tossup,
      color: marginColor(win.party, win.margin),
      winnerColor: partyColor(win.party),
      flip: win.party !== base.defending,
      close: tossup,
      label: ratingFor(win.party, win.margin, false),
    };
  });

  const start = game.govStart || { dem: 24, rep: 26, other: 0 };
  const counts = { dem: start.dem || 0, rep: start.rep || 0, lib: start.lib || 0, grn: start.grn || 0, other: start.other || 0 };
  races.forEach((race) => {
    if (race.winner === race.defending) return;
    counts[race.defending] = Math.max(0, (counts[race.defending] || 0) - 1);
    if (['dem', 'rep', 'lib', 'grn'].includes(race.winner)) counts[race.winner] += 1;
    else counts.other += 1;
  });
  const { dem, rep, lib, grn, other } = counts;
  const control = dem > 25 ? 'dem' : rep > 25 ? 'rep' : 'hung';
  const startControl = start.dem > 25 ? 'dem' : start.rep > 25 ? 'rep' : 'hung';

  return {
    races,
    dem,
    rep,
    lib,
    grn,
    other: other + lib + grn,
    total: races.length,
    start,
    net: dem - start.dem,
    control,
    startControl,
    flipped: control !== startControl,
    tossups: races.filter((r) => r.close),
    thirdWins: races.filter((r) => isThirdParty(r.winner) || r.winner === 'ind'),
  };
}

export function buildDownballot(game, marginOf, mode = 'poll') {
  return {
    senate: buildSenate(game, marginOf, mode),
    house: buildHouse(game, marginOf, mode),
    gov: buildGov(game, marginOf, mode),
  };
}

// Where the other campaign spends its money when it is not chasing the White
// House: the states where a House or Senate seat is actually in play.
export function downballotTargets(game, marginOf) {
  const close = {};
  const note = (abbr, value) => {
    if (!abbr) return;
    const current = close[abbr];
    if (current === undefined || value < current) close[abbr] = value;
  };

  buildSenate(game, marginOf, 'poll').races.forEach((r) => note(r.state, r.lead));
  buildGov(game, marginOf, 'poll').races.forEach((r) => note(r.state, r.lead * 1.1));
  buildHouse(game, marginOf, 'poll').states.forEach((s) => {
    if (s.seats > 1) note(s.state, Math.abs(s.margin) * 1.3);
  });

  return Object.entries(close)
    .map(([abbr, lead]) => ({ abbr, lead }))
    .sort((a, b) => a.lead - b.lead);
}
