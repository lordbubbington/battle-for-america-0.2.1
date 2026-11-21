import { applyScenarioShares, scenarioRankedChoiceTally } from '@/lib/build39Scenarios';
// Election night: the clock, the count, and the calls.
//
// States close at their local poll times and report in discrete ballot drops.
// Drop lean varies around the expected state result, then later drops make the
// count settle back to that forecast. Every state shares the same finish time.
//
// A race is called on its eventual margin and the share of the vote already
// counted — and, in the close ones, only once the winner is actually ahead.

import { EV_TO_WIN, STATE_BY_ABBR } from '@/data/states';
import { HOUSE_SEATS } from '@/data/downballot';
import { NIGHT_START, closeMinutes } from '@/data/pollClose';
import { MARGIN_SCALE, marginColor, TOSSUP_COLOR } from '@/lib/marginColors';
import { marginFamilyForRace, PARTY_COLOR, partyColorForRace, winnerOf } from '@/lib/downballot';
import { rankedChoiceTally } from '@/lib/rankedChoice';
import { resultSnapshot, snapshot, senateSnapshot, houseSnapshot, govSnapshot } from '@/lib/gameEngine';
import { projectStateLegislatures } from '@/lib/stateLegislatureForecast';

export const IDLE_COLOR = '#22304F';

// The call thresholds, tightest last. `at` is the share of the count that has to
// be in before the desk will move, and `lead` means the winner has to be ahead.
const CALL_RULES = [
  { min: 15, at: 0, lead: false },
  { min: 14, at: 4, lead: false },
  { min: 13, at: 11, lead: true },
  { min: 12, at: 18, lead: true },
  { min: 11, at: 28, lead: true },
  { min: 10, at: 41, lead: true },
  { min: 9, at: 59, lead: true },
  { min: 8, at: 68, lead: true },
  { min: 7, at: 75, lead: true },
  { min: 6, at: 84, lead: true },
  { min: 5, at: 91, lead: true },
  { min: 3, at: 95, lead: true },
  { min: 0, at: 100, lead: false },
];

export function callRuleFor(lead) {
  const abs = Math.abs(lead);
  return CALL_RULES.find((r) => abs >= r.min) || CALL_RULES[CALL_RULES.length - 1];
}

// `pct` is the share of the vote counted, 0–100. Once every vote is in, the
// desk has nothing left to wait for.
export function isCalled({ lead, winner, pct, leader }) {
  if (pct >= 100) return true;
  const rule = callRuleFor(lead);
  if (pct < rule.at) return false;
  if (rule.lead && leader !== winner) return false;
  return true;
}

function hash01(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function progressAt(t, close, duration) {
  const x = (t - close) / duration;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return 1 - Math.pow(1 - x, 1.4);
}

// The early count leans one way and settles: a big state's first precincts are
// not the state, and a twelve-point race can look lost for two hours.
function skewFor(key, lead) {
  return (hash01(key) * 2 - 1) * Math.min(12, 3.5 + Math.abs(lead) * 0.5);
}

// How far a reported margin is allowed to sit from its final one. Nothing is
// bounded while a race is still young — that is where the wild swings live — but
// once four fifths of the count is in the desk is inside two points, and from
// nine tenths inside one. The race stops swinging and starts locking.
function swingCapAt(pct) {
  if (pct >= 89) return Math.max(0, (99 - pct) / 10);
  if (pct >= 79) return 1 + (89 - pct) / 10;
  return Infinity;
}

function swingAt(entry, pct) {
  const fade = Math.pow(1 - Math.min(1, pct / 100), 0.9);
  const raw = entry.skew * fade;
  const cap = swingCapAt(pct);
  if (Math.abs(raw) <= cap) return raw;
  return (raw < 0 ? -1 : 1) * cap;
}

function normalFor(key) {
  const u = Math.max(0.0001, hash01(key + '|u'));
  const v = hash01(key + '|v');
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function allocateDrop(size, desired, remaining) {
  const out = Object.fromEntries(Object.keys(remaining).map((party) => [party, 0]));
  let left = size;
  while (left > 0) {
    const active = Object.keys(remaining).filter((party) => remaining[party] > out[party]);
    if (!active.length) break;
    const weight = active.reduce((sum, party) => sum + Math.max(0.001, desired[party] || 0), 0);
    let allocated = 0;
    active.forEach((party) => {
      const ideal = left * Math.max(0.001, desired[party] || 0) / weight;
      const capacity = remaining[party] - out[party];
      const amount = Math.min(capacity, Math.floor(ideal));
      if (amount > 0) {
        out[party] += amount;
        left -= amount;
        allocated += amount;
      }
    });
    if (left > 0 && allocated === 0) {
      active.sort((a, b) => (desired[b] || 0) - (desired[a] || 0));
      const party = active[0];
      out[party] += 1;
      left -= 1;
    }
  }
  return out;
}

function makeBallotDrops(key, total, shares, close, duration) {
  const count = Math.max(100, Math.round(total || 0));
  const base = { ...shares };
  const baseTotal = Object.values(base).reduce((sum, value) => sum + Math.max(0, value || 0), 0) || 1;
  Object.keys(base).forEach((party) => { base[party] = Math.max(0, base[party] || 0) / baseTotal * 100; });
  const exact = Object.entries(base).map(([party, share]) => ({ party, value: count * share / 100 }));
  const remaining = Object.fromEntries(exact.map(({ party, value }) => [party, Math.floor(value)]));
  let leftovers = count - Object.values(remaining).reduce((sum, value) => sum + value, 0);
  exact.slice().sort((a, b) => (b.value - Math.floor(b.value)) - (a.value - Math.floor(a.value))).forEach(({ party }) => {
    if (leftovers > 0) { remaining[party] += 1; leftovers -= 1; }
  });

  const sizes = [];
  let unplanned = count;
  let index = 0;
  while (unplanned > 10000) {
    const randomSize = Math.round(100 * Math.pow(100, hash01(key + '|size|' + index)));
    const size = Math.max(100, Math.min(10000, unplanned - 100, randomSize));
    sizes.push(size);
    unplanned -= size;
    index += 1;
  }
  if (unplanned > 0) sizes.push(unplanned);

  const drops = [];
  // A 70/30 drop is 1.5 standard deviations from an even baseline.
  sizes.forEach((size, i) => {
    const final = i === sizes.length - 1;
    const desired = final ? null : shiftShares(base, normalFor(key + '|lean|' + i) * 13.333);
    const votes = final ? { ...remaining } : allocateDrop(size, desired, remaining);
    Object.keys(remaining).forEach((party) => { remaining[party] -= votes[party] || 0; });
    drops.push({
      time: close + duration * ((i + 1) / sizes.length),
      size,
      votes,
    });
  });
  return drops;
}

function ballotAt(entry, t) {
  if (!entry.drops) {
    const pct = progressAt(t, entry.close, entry.duration) * 100;
    return { ...liveAt(entry, pct), pct, votes: null, countedVotes: 0 };
  }
  const total = entry.drops.reduce((sum, drop) => sum + drop.size, 0) || entry.cast || 1;
  const counts = Object.fromEntries(Object.keys(entry.shares || {}).map((party) => [party, 0]));
  let counted = 0;
  for (const drop of entry.drops) {
    if (drop.time > t) break;
    counted += drop.size;
    Object.entries(drop.votes).forEach(([party, votes]) => { counts[party] = (counts[party] || 0) + votes; });
  }
  const pct = counted >= total ? 100 : Math.min(100, counted / total * 100);
  if (!counted) {
    const live = liveAt(entry, 0);
    return { ...live, pct: 0, votes: counts, countedVotes: 0 };
  }
  const shares = Object.fromEntries(Object.keys(counts).map((party) => [party, counts[party] / counted * 100]));
  const rcv = entry.rcvEnabled ? (entry.sixParty ? scenarioRankedChoiceTally(shares) : rankedChoiceTally(shares)) : null;
  const win = rcv ? { party: rcv.winner, margin: rcv.margin } : winnerOf(shares);
  return { shares, votes: counts, countedVotes: counted, rcvShares: rcv?.shares || null, pct, margin: (shares.dem || 0) - (shares.rep || 0), lead: win.margin, winner: win.party };
}
function solidColor(party, race = null) {
  const family = marginFamilyForRace(party, race);
  return MARGIN_SCALE[family]?.dark || partyColorForRace(party, race) || IDLE_COLOR;
}

// Move the two parties' shares apart by `delta` points of margin, leaving the
// rest of the ballot where it was, and hand back a clean hundred.
function shiftShares(shares, delta) {
  const out = { ...shares };
  out.dem = Math.max(0.2, (shares.dem || 0) + delta);
  out.rep = Math.max(0.2, (shares.rep || 0) - delta);
  const total = Object.values(out).reduce((sum, v) => sum + Math.max(0, v), 0) || 1;
  Object.keys(out).forEach((k) => {
    out[k] = (Math.max(0, out[k]) / total) * 100;
  });
  return out;
}

function liveAt(entry, pct) {
  const margin = entry.margin + swingAt(entry, pct);
  const shares = shiftShares(entry.shares, (margin - entry.margin) / 2);
  const rcv = entry.rcvEnabled ? (entry.sixParty ? scenarioRankedChoiceTally(shares) : rankedChoiceTally(shares)) : null;
  const win = rcv ? { party: rcv.winner, margin: rcv.margin } : winnerOf(shares);
  return { shares, rcvShares: rcv?.shares || null, margin, lead: win.margin, winner: win.party };
}

// ---------------------------------------------------------------------------
// The plan: everything the night needs, worked out once.
// ---------------------------------------------------------------------------

export function buildNight(game) {
  const pres = resultSnapshot(game);
  // Election Night keeps an expected-vote baseline separate from the hidden
  // simulated count so its live projection can blend reported votes with what
  // the campaign model expects from ballots still outstanding.
  const expectedGame = { ...game, pollMiss: null };
  const expectedPres = resultSnapshot(expectedGame);
  const senate = senateSnapshot(game, true);
  const expectedSenate = senateSnapshot(expectedGame, true);
  const house = houseSnapshot(game, true);
  const expectedHouse = houseSnapshot(expectedGame, true);
  const gov = govSnapshot(game, true);
  const expectedGov = govSnapshot(expectedGame, true);
  const legislatures = projectStateLegislatures(game);
  const expectedLegislatures = projectStateLegislatures(expectedGame);
  const seed = `${game.candidateId}|${game.opponentId}|${game.week}`;

  const castByState = Object.fromEntries(pres.rows.map((row) => [row.abbr, row.cast || row.ev * 2880]));
  const closeOf = (abbr) => closeMinutes(abbr) - NIGHT_START;
  const lastPollClose = Math.max(...pres.rows.map((row) => closeOf(row.abbr)));
  const end = lastPollClose + 180;
  const states = pres.rows.map((row) => {
    const close = closeOf(row.abbr);
    const duration = end - close;
    return {
      abbr: row.abbr,
      name: row.name,
      ev: row.ev,
      atLarge: row.atLarge ?? null,
      evAwards: row.evAwards || null,
      close,
      duration,
      cast: castByState[row.abbr],
      drops: makeBallotDrops(seed + '|pres|' + row.abbr, castByState[row.abbr], row.shares, close, duration),
      margin: row.margin,
      lead: row.lead,
      winner: row.winner,
      shares: row.shares,
      expectedMargin: expectedPres.rows.find((expected) => expected.abbr === row.abbr)?.margin ?? row.margin,
      expectedShares: expectedPres.rows.find((expected) => expected.abbr === row.abbr)?.shares || row.shares,
      rcvEnabled: game.thirdMode === 'surge',
      sixParty: game.build39?.scenario?.id === 'six-party',
    };
  });

  const wrap = (race, kind, expectedRace) => {
    const close = closeOf(race.state);
    const duration = end - close;
    const statewideCast = castByState[race.state] || (STATE_BY_ABBR[race.state]?.ev || 5) * 2880;
    const cast = kind === 'house-district'
      ? Math.max(100, Math.round(statewideCast / Math.max(1, HOUSE_SEATS[race.state] || 1)))
      : statewideCast;
    const shares = race.shares || race.firstChoiceShares || race.firstChoiceSeats || {
      dem: race.demSeats || 0, rep: race.repSeats || 0, lib: race.libSeats || 0, grn: race.grnSeats || 0,
    };
    const expectedShares = expectedRace?.shares || expectedRace?.firstChoiceShares || expectedRace?.firstChoiceSeats || shares;
    const raceId = race.id || race.state;
    return {
      ...race,
      shares,
      expectedMargin: expectedRace?.margin ?? race.margin,
      expectedShares,
      close,
      duration,
      cast,
      rcvEnabled: game.thirdMode === 'surge' && kind !== 'state-legislature' && (game.build39?.scenario?.id !== 'six-party' || ['senate','gov'].includes(kind)),
      sixParty: game.build39?.scenario?.id === 'six-party',
      drops: shares ? makeBallotDrops(seed + '|' + kind + '|' + raceId, cast, shares, close, duration) : null,
      skew: skewFor(seed + '|' + kind + '|' + raceId, race.lead),
    };
  };

  const senateRaces = senate.races.map((r) => wrap(r, 'senate', expectedSenate.races.find((expected) => expected.state === r.state)));
  const houseStates = house.states.map((s) => wrap(s, 'house-state', expectedHouse.states.find((expected) => expected.state === s.state)));
  const houseDistricts = house.rule === 'pr'
    ? []
    : house.districts.map((district) => wrap(
      district,
      'house-district',
      expectedHouse.districts.find((expected) => expected.id === district.id)
    ));
  const govRaces = gov.races.map((r) => wrap(r, 'gov', expectedGov.races.find((expected) => expected.state === r.state)));
  const stateLegislatureRaces = legislatures.states.flatMap((state) => state.activeChambers.map((chamber) => {
    const margin = chamber.margin || 0;
    const expectedChamber = expectedLegislatures.byState[state.abbr]?.activeChambers
      .find((expected) => expected.chamber === chamber.chamber);
    const shares = applyScenarioShares({ game, race: 'legislature', stateId: state.abbr,
      shares: { dem: 50 + margin / 2, rep: 50 - margin / 2 } });
    const scenarioRace = ['six-party', 'regional-parties'].includes(game.build39?.scenario?.id);
    const winner = scenarioRace ? winnerOf(shares) : null;
    return wrap({
      id: `${state.abbr}-${chamber.chamber}`,
      state: state.abbr,
      name: `${state.name} ${chamber.chamber === 'upper' ? 'Upper Chamber' : chamber.chamber === 'lower' ? 'Lower Chamber' : 'Unicameral Legislature'}`,
      chamber: chamber.chamber,
      seats: chamber.totalSeats,
      seatsUp: chamber.seatsUp2028,
      seatsOut: chamber.seatsOut ?? chamber.totalSeats - chamber.seatsUp2028,
      carriedSeats: chamber.carried || {},
      nonpartisanSeats: state.nonpartisanUnicameral ? chamber.totalSeats - chamber.seatsUp2028 : 0,
      nonpartisan: state.nonpartisanUnicameral,
      margin,
      lead: winner?.margin ?? Math.abs(margin),
      winner: state.nonpartisanUnicameral ? 'ind' : (winner?.party || (margin > 0 ? 'dem' : margin < 0 ? 'rep' : 'ind')),
      shares,
    }, 'state-legislature', expectedChamber);
  }));

  return {
    states,
    districts: pres.districts.map((d) => {
      const expected = expectedPres.districts.find((item) => item.id === d.id);
      const close = closeOf(d.parent);
      const duration = end - close;
      const cast = Math.max(100, Math.round((castByState[d.parent] || 10000) * d.ev / (STATE_BY_ABBR[d.parent]?.ev || d.ev)));
      return { ...d, rcvEnabled: game.build39?.scenario?.id === 'six-party', sixParty: game.build39?.scenario?.id === 'six-party', expectedMargin: expected?.margin ?? d.margin, expectedShares: expected?.shares || d.shares, close, duration, cast, drops: makeBallotDrops(seed + '|dist|' + d.id, cast, d.shares, close, duration) };
    }),
    senateRaces,
    houseStates,
    houseDistricts,
    govRaces,
    stateLegislatureRaces,
    stateLegislatureSummary: legislatures,
    senateStart: senate.start,
    houseStart: house.start,
    houseTotal: house.total,
    houseMajority: house.majority,
    houseRule: house.rule || 'standard',
    govStart: gov.start,
    end,
    popularVote: !!game.popularVote,
  };
}

// ---------------------------------------------------------------------------
// Where the night stands at a given minute.
// ---------------------------------------------------------------------------

export function nightAt(plan, t) {
  const calls = [];

  const rows = plan.states.map((s) => {
    const live = ballotAt(s, t);
    const pct = live.pct;
    const leader = pct > 0 ? live.winner : null;
    const called = pct > 0 && isCalled({ lead: s.lead, winner: s.winner, pct, leader });
    const party = (called ? s.winner : leader) || null;
    if (called) {
      calls.push({
        id: `pres-${s.abbr}`, kind: 'pres', abbr: s.abbr, name: s.name, party: s.winner, ev: s.atLarge ?? s.ev,
        evAwards: s.evAwards,
        pct, liveMargin: live.lead, finalMargin: s.lead, rule: callRuleFor(s.lead),
      });
    }
    return {
      abbr: s.abbr,
      name: s.name,
      ev: s.ev,
      atLarge: s.atLarge,
      evAwards: called ? s.evAwards || null : null,
      votes: live.votes,
      countedVotes: live.countedVotes,
      pct,
      reporting: pct > 0,
      called,
      leader,
      winner: party || s.winner,
      margin: live.margin,
      lead: live.lead,
      shares: live.shares,
      expectedMargin: s.expectedMargin,
      expectedShares: s.expectedShares,
      color: party ? marginColor(party, live.lead) : TOSSUP_COLOR,
      winnerColor: party ? (called ? solidColor(party) : PARTY_COLOR[party] || IDLE_COLOR) : IDLE_COLOR,
    };
  });

  const raceRow = (entry, kind) => {
    const live = ballotAt(entry, t);
    const pct = live.pct;
    const leader = pct > 0 ? live.winner : null;
    if (kind === 'state-legislature' && entry.nonpartisan) {
      const called = pct >= 95;
      if (called) calls.push({
        id: `legislature-${entry.id}`,
        kind: 'legislature',
        raceLevel: 'chamber',
        abbr: entry.state,
        state: entry.state,
        chamber: entry.chamber,
        name: entry.name,
        party: 'nonpartisan',
        seatsUp: entry.seatsUp,
        seatsOut: entry.seatsOut,
        totalSeats: entry.seats,
        pct,
        liveMargin: 0,
        finalMargin: 0,
        rule: { at: 95, lead: false },
      });
      return {
        ...entry,
        pct,
        reporting: pct > 0,
        called,
        leader: null,
        winner: 'ind',
        margin: 0,
        lead: 0,
        color: '#8790A3',
        winnerColor: '#A6ADBB',
        label: `${entry.seatsUp} nonpartisan seats`,
      };
    }
    const callWinner = ['house-state', 'house-list'].includes(kind) && entry.shares
      ? winnerOf(entry.shares).party
      : entry.winner;
    const safe = pct > 0 && isCalled({ lead: entry.lead, winner: callWinner, pct, leader });
    const called = kind === 'house-state-progress' ? false : safe;
    const party = (called ? callWinner : leader) || null;
    if (called) {
      const isHouse = kind.startsWith('house-');
      const isLegislature = kind === 'state-legislature';
      const raceLevel = kind === 'house-district' ? 'district'
        : kind === 'house-state' ? 'state-allocation'
          : kind === 'house-list' ? 'list-seats'
            : isLegislature ? 'chamber' : null;
      const finalSeats = isLegislature ? {
        dem: (entry.carriedSeats?.dem || 0) + (callWinner === 'dem' ? entry.seatsUp : 0),
        rep: (entry.carriedSeats?.rep || 0) + (callWinner === 'rep' ? entry.seatsUp : 0),
        independent: entry.carriedSeats?.independent || 0,
        other: entry.carriedSeats?.other || 0,
        unallocated: (entry.carriedSeats?.unallocated || 0) + (callWinner === 'ind' ? entry.seatsUp : 0),
      } : null;
      if (finalSeats && !['dem','rep','ind'].includes(callWinner)) finalSeats[callWinner] = entry.seatsUp;
      calls.push({
        id: kind === 'house-district' ? `house-${entry.id}` : kind === 'house-list' ? `house-list-${entry.state}` : isLegislature ? `legislature-${entry.id}` : `${isHouse ? 'house' : kind}-${entry.state}`,
        kind: isHouse ? 'house' : isLegislature ? 'legislature' : kind,
        raceLevel,
        abbr: kind === 'house-district' ? entry.id : entry.state,
        state: entry.state,
        districtId: kind === 'house-district' ? entry.id : null,
        name: entry.name || entry.state,
        party: callWinner,
        color: partyColorForRace(callWinner, entry),
        caucus: entry.caucus,
        demSeats: entry.demSeats,
        repSeats: entry.repSeats,
        listSeats: entry.listSeats || null,
        totalSeats: entry.seats,
        chamber: isLegislature ? entry.chamber : null,
        seatsUp: isLegislature ? entry.seatsUp : null,
        seatsOut: isLegislature ? entry.seatsOut : null,
        finalSeats,
        pct, liveMargin: live.lead, finalMargin: entry.lead, rule: callRuleFor(entry.lead),
      });
    }
    return {
      ...entry,
      pct,
      reporting: pct > 0,
      called,
      leader,
      winner: callWinner,
      margin: live.margin,
      lead: live.lead,
      shares: live.shares,
      votes: live.votes,
      countedVotes: live.countedVotes,
      color: party ? marginColor(marginFamilyForRace(party, entry), live.lead) : TOSSUP_COLOR,
      winnerColor: party ? (called ? solidColor(party, entry) : partyColorForRace(party, entry) || IDLE_COLOR) : IDLE_COLOR,
      label: party ? `${party.toUpperCase()} +${Math.abs(live.lead).toFixed(1)}` : 'counting',
    };
  };

  const senateRaces = plan.senateRaces.map((r) => raceRow(r, 'senate'));
  const govRaces = plan.govRaces.map((r) => raceRow(r, 'gov'));
  const stateLegislatureRaces = plan.stateLegislatureRaces.map((r) => raceRow(r, 'state-legislature'));
  const houseDistricts = plan.houseDistricts.map((district) => raceRow(district, 'house-district'));
  const houseStateRows = plan.houseStates.map((state) => raceRow(
    state,
    plan.houseRule === 'pr' ? 'house-state' : plan.houseRule === 'mmp' ? 'house-list' : 'house-state-progress'
  ));
  const houseStates = plan.houseRule === 'standard'
    ? houseStateRows.map((state) => {
      const races = houseDistricts.filter((district) => district.state === state.state);
      const calledCounts = { dem: 0, rep: 0, lib: 0, grn: 0, ind: 0 };
      races.filter((district) => district.called).forEach((district) => { calledCounts[district.winner] = (calledCounts[district.winner] || 0) + 1; });
      const shares = Object.fromEntries(['dem', 'rep', 'lib', 'grn', 'ind'].map((party) => [
        party,
        races.reduce((sum, district) => sum + (district.shares?.[party] || 0), 0) / Math.max(1, races.length),
      ]));
      const liveWinner = winnerOf(shares);
      const called = races.length > 0 && races.every((district) => district.called);
      const seatWinner = Object.entries(calledCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || liveWinner.party;
      const winner = called ? seatWinner : liveWinner.party;
      const pct = races.reduce((sum, district) => sum + district.pct, 0) / Math.max(1, races.length);
      return {
        ...state,
        pct,
        reporting: pct > 0,
        called,
        leader: liveWinner.party,
        winner,
        margin: shares.dem - shares.rep,
        lead: liveWinner.margin,
        shares,
        calledSeats: calledCounts,
        color: marginColor(winner, liveWinner.margin),
        winnerColor: called ? solidColor(winner) : PARTY_COLOR[winner] || IDLE_COLOR,
        label: `${calledCounts.dem}D–${calledCounts.rep}R called`,
      };
    })
    : houseStateRows;

  let houseDem = 0;
  let houseRep = 0;
  let houseLib = 0;
  let houseGrn = 0;
  let houseInd = 0;
  const houseExtra = {};
  let houseWon = 0;
  let houseTotal = houseDistricts.length;
  let listStatesCalled = 0;
  if (plan.houseRule === 'pr') {
    const calledStates = houseStates.filter((state) => state.called);
    houseWon = calledStates.length;
    houseTotal = houseStates.length;
    calledStates.forEach((state) => {
      houseDem += state.demSeats || 0;
      houseRep += state.repSeats || 0;
      houseLib += state.libSeats || 0;
      houseGrn += state.grnSeats || 0;
      houseInd += state.indSeats || 0;
      for (const [party, value] of Object.entries(state.seatsByParty || {})) {
        if (!['dem','rep','lib','grn','ind'].includes(party)) houseExtra[party] = (houseExtra[party] || 0) + Number(value);
      }
    });
  } else {
    const calledDistricts = houseDistricts.filter((district) => district.called);
    houseWon = calledDistricts.length;
    calledDistricts.forEach((district) => {
      if (district.winner === 'dem') houseDem += 1;
      else if (district.winner === 'rep') houseRep += 1;
      else if (district.winner === 'lib') houseLib += 1;
      else if (district.winner === 'grn') houseGrn += 1;
      else if (district.winner === 'ind') houseInd += 1;
      else houseExtra[district.winner] = (houseExtra[district.winner] || 0) + 1;
    });
    if (plan.houseRule === 'mmp') {
      const listCalled = houseStates.filter((state) => state.called);
      listStatesCalled = listCalled.length;
      listCalled.forEach((state) => {
        houseDem += state.listSeats?.dem || 0;
        houseRep += state.listSeats?.rep || 0;
        houseLib += state.listSeats?.lib || 0;
        houseGrn += state.listSeats?.grn || 0;
        houseInd += state.listSeats?.ind || 0;
        for (const [party, value] of Object.entries(state.listSeats || {})) {
          if (!['dem','rep','lib','grn','ind'].includes(party)) houseExtra[party] = (houseExtra[party] || 0) + Number(value);
        }
      });
    }
  }

  // The presidency counts called states, and the districts of a called state.
  const evBy = { dem: 0, rep: 0, lib: 0, grn: 0, ind: 0 };
  rows.forEach((r) => {
    if (!r.called) return;
    if (r.evAwards) {
      Object.entries(r.evAwards).forEach(([party, seats]) => { evBy[party] = (evBy[party] || 0) + seats; });
      return;
    }
    evBy[r.winner] = (evBy[r.winner] || 0) + (r.atLarge ?? r.ev);
  });
  plan.districts.forEach((d) => {
    const parent = rows.find((r) => r.abbr === d.parent);
    if (parent && parent.called) evBy[d.winner] = (evBy[d.winner] || 0) + d.ev;
  });

  const weight = rows.reduce((sum, r) => sum + r.ev, 0) || 1;
  const overall = rows.reduce((sum, r) => sum + r.pct * r.ev, 0) / weight;

  const senateCalled = senateRaces.filter((r) => r.called);
  const senateDem = plan.senateStart.dem + senateCalled.filter((r) => r.caucus === 'dem').length;
  const senateRep = plan.senateStart.rep + senateCalled.filter((r) => r.caucus === 'rep').length;
  const senateOther =
    (plan.senateStart.lib || 0) +
    (plan.senateStart.grn || 0) +
    senateCalled.filter((r) => r.caucus !== 'dem' && r.caucus !== 'rep').length;

  const govCalled = govRaces.filter((r) => r.called);
  const govDem = govCalled.filter((r) => r.winner === 'dem').length;
  const govRep = govCalled.filter((r) => r.winner === 'rep').length;

  const stateLegislatureCalled = stateLegislatureRaces.filter((race) => race.called);
  const legislatureSeatCounts = { dem: 0, rep: 0, other: 0, unallocated: 0, nonpartisan: 0 };
  stateLegislatureRaces.forEach((race) => {
    if (race.nonpartisan) {
      legislatureSeatCounts.nonpartisan += (race.nonpartisanSeats || 0) + (race.called ? race.seatsUp : 0);
      return;
    }
    const carried = race.carriedSeats || {};
    legislatureSeatCounts.dem += carried.dem || 0;
    legislatureSeatCounts.rep += carried.rep || 0;
    legislatureSeatCounts.other += (carried.independent || 0) + (carried.other || 0);
    legislatureSeatCounts.unallocated += carried.unallocated || 0;
    if (race.called) {
      const party = race.winner === 'ind' ? 'unallocated' : race.winner;
      legislatureSeatCounts[party] = (legislatureSeatCounts[party] || 0) + race.seatsUp;
    }
  });
  const legislatureStateRows = plan.stateLegislatureSummary.states.map((state) => {
    const races = stateLegislatureRaces.filter((race) => race.state === state.abbr);
    const pct = races.reduce((sum, race) => sum + race.pct, 0) / Math.max(1, races.length);
    const called = races.length > 0 && races.every((race) => race.called);
    const calledPartyWinners = races.filter((race) => race.called && !race.nonpartisan).map((race) => race.winner);
    const winner = state.nonpartisanUnicameral ? 'ind'
      : called && calledPartyWinners.length && calledPartyWinners.every((party) => party === calledPartyWinners[0])
        ? calledPartyWinners[0] : state.winner;
    const margin = races[0]?.margin || 0;
    return {
      state: state.abbr,
      name: state.name,
      margin,
      lead: Math.abs(margin),
      pct,
      reporting: races.some((race) => race.reporting),
      called,
      winner,
      color: state.nonpartisanUnicameral ? '#8790A3' : marginColor(winner, margin),
      winnerColor: state.nonpartisanUnicameral ? '#A6ADBB' : PARTY_COLOR[winner] || TOSSUP_COLOR,
      label: state.nonpartisanUnicameral ? 'Nonpartisan' : called ? `${winner.toUpperCase()} control called` : state.label,
      seatsUp: races.reduce((sum, race) => sum + race.seatsUp, 0),
      racesCalled: races.filter((race) => race.called).length,
      raceCount: races.length,
    };
  });

  // The five split districts count with their state, and are called with it.
  const districts = plan.districts.map((d) => {
    const parent = rows.find((r) => r.abbr === d.parent);
    const pct = parent ? parent.pct : 0;
    const live = d.drops ? ballotAt(d, t) : liveAt(d, pct);
    const called = !!parent && parent.called;
    const party = called ? d.winner : live.winner;
    return {
      ...d,
      pct,
      ...live,
      called,
      winner: party,
      color: marginColor(party, live.lead),
      winnerColor: called ? solidColor(party) : PARTY_COLOR[party] || IDLE_COLOR,
    };
  });

  const calledAll = rows.every((r) => r.called);
  const reached = Object.keys(evBy).find((party) => evBy[party] >= EV_TO_WIN) || null;
  const phase = reached
    ? { step: 3, label: 'Presidency called' }
    : calledAll && plan.popularVote
      ? { step: 3, label: 'Popular vote counted' }
      : calledAll
        ? { step: 3, label: 'No Electoral College majority' }
        : t < 60 || overall < 20
          ? { step: 0, label: 'Polls close' }
          : overall < 65
            ? { step: 1, label: 'Early returns' }
            : { step: 2, label: 'Decisive states' };

  const otherEV = Object.entries(evBy).reduce(
    (sum, [party, ev]) => sum + (party === 'dem' || party === 'rep' ? 0 : ev),
    0
  );

  return {
    rows,
    districts,
    unreported: rows.filter((r) => !r.reporting).map((r) => r.abbr),
    calls,
    pct: overall,
    phase,
    evBy,
    pres: {
      demEV: evBy.dem,
      repEV: evBy.rep,
      otherEV,
      calledAll,
      reached,
    },
    senate: {
      races: senateRaces,
      dem: senateDem,
      rep: senateRep,
      other: senateOther,
      won: senateCalled.length,
      total: senateRaces.length,
      start: plan.senateStart,
    },
    house: {
      states: houseStates,
      districts: houseDistricts,
      dem: houseDem,
      rep: houseRep,
      lib: houseLib,
      grn: houseGrn,
      ind: houseInd,
      other: houseLib + houseGrn + houseInd + Object.values(houseExtra).reduce((sum, value) => sum + value, 0),
      seatsByParty: { dem: houseDem, rep: houseRep, lib: houseLib, grn: houseGrn, ind: houseInd, ...houseExtra },
      won: houseWon,
      total: houseTotal,
      listStatesCalled,
      listStatesTotal: plan.houseRule === 'mmp' ? houseStates.length : 0,
      pct: plan.houseRule === 'pr'
        ? houseStates.reduce((sum, state) => sum + state.pct, 0) / Math.max(1, houseStates.length)
        : houseDistricts.reduce((sum, district) => sum + district.pct, 0) / Math.max(1, houseDistricts.length),
      start: plan.houseStart,
      totalSeats: plan.houseTotal,
      majority: plan.houseMajority,
      rule: plan.houseRule,
    },
    gov: {
      races: govRaces,
      dem: govDem,
      rep: govRep,
      other: govCalled.length - govDem - govRep,
      won: govCalled.length,
      total: govRaces.length,
      start: plan.govStart,
    },
    stateLegislatures: {
      races: stateLegislatureRaces,
      states: legislatureStateRows,
      ...legislatureSeatCounts,
      calledRaces: stateLegislatureCalled.length,
      totalRaces: stateLegislatureRaces.length,
      seatsUpCalled: stateLegislatureCalled.reduce((sum, race) => sum + race.seatsUp, 0),
      totalSeatsUp: stateLegislatureRaces.reduce((sum, race) => sum + race.seatsUp, 0),
      pct: stateLegislatureRaces.reduce((sum, race) => sum + race.pct, 0) / Math.max(1, stateLegislatureRaces.length),
    },
  };
}
