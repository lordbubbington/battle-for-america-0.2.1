import {
  STATE_LEGISLATURES_2028,
  STATE_LEGISLATURE_SOURCE,
} from '@/data/stateLegislatureCycles';
import {
  STATE_LEGISLATURE_RESULTS_2026,
  STATE_LEGISLATURE_RESULTS_2026_BY_STATE,
  STATE_LEGISLATURE_RESULTS_2026_SOURCE,
} from '@/data/stateLegislatureResults2026';
import { genericIn } from '@/lib/environment';
import { effectiveLegislatureSchedules } from './build45LegislatureClasses.js';
import { COLOR_TOKENS, marginColor } from '@/lib/marginColors';

// The three chambers with seats up in 2028 that did not hold a regular 2026
// election. Their latest published composition is the NCSL 2026 snapshot.
const BASELINE_FALLBACKS = Object.freeze({
  'KS:upper': { dem: 9, rep: 31, independent: 0, other: 0, unallocated: 0 },
  'NM:upper': { dem: 26, rep: 16, independent: 0, other: 0, unallocated: 0 },
  'SC:upper': { dem: 12, rep: 34, independent: 0, other: 0, unallocated: 0 },
});

const BASELINE_FALLBACK_SOURCE = Object.freeze({
  title: 'NCSL State Partisan Composition, October 2026',
  url: 'https://www.ncsl.org/about-state-legislatures/state-partisan-composition',
  checkedOn: '2026-10-06',
});

// Party holding the governorship after the 2026 elections, carried into 2027.
// KY, LA, and MS elect governors in 2027; Kansas was still uncalled in the
// cited snapshot. Those four states remain explicitly unresolved here.
export const STATE_GOVERNOR_PARTY_2027 = Object.freeze({
  AL: 'rep', AK: 'dem', AZ: 'dem', AR: 'rep', CA: 'dem', CO: 'dem', CT: 'dem', DE: 'dem',
  FL: 'rep', GA: 'dem', HI: 'dem', ID: 'rep', IL: 'dem', IN: 'rep', IA: 'dem', KS: null,
  KY: null, LA: null, ME: 'dem', MD: 'dem', MA: 'dem', MI: 'dem', MN: 'dem', MS: null,
  MO: 'rep', MT: 'rep', NE: 'rep', NV: 'dem', NH: 'rep', NJ: 'dem', NM: 'dem', NY: 'dem',
  NC: 'dem', ND: 'rep', OH: 'dem', OK: 'rep', OR: 'dem', PA: 'dem', RI: 'dem', SC: 'rep',
  SD: 'rep', TN: 'rep', TX: 'dem', UT: 'rep', VT: 'rep', VA: 'dem', WA: 'dem', WV: 'rep',
  WI: 'dem', WY: 'rep',
});

export const STATE_GOVERNOR_PARTY_SOURCE = Object.freeze({
  title: 'Governors: 2026 State Election Results',
  url: 'https://www.multistate.us/resources/governors-2026-state-election-results',
  checkedOn: '2026-11-10',
});

const PARTIES = ['dem', 'rep', 'independent', 'other', 'unallocated'];

function baselineFor(stateAbbr, chamberId) {
  const report = (STATE_LEGISLATURE_RESULTS_2026_BY_STATE[stateAbbr] || [])
    .find((row) => row.chamber === chamberId);
  if (report) return {
    dem: report.dem,
    rep: report.rep,
    independent: report.independent,
    other: report.other,
    unallocated: report.unallocated,
    sourceStatus: report.sourceStatus,
    sourceYear: 2026,
  };
  const fallback = BASELINE_FALLBACKS[`${stateAbbr}:${chamberId}`];
  if (!fallback) return null;
  return { ...fallback, sourceStatus: 'official-reference-snapshot', sourceYear: 2026 };
}

function allocateByLargestRemainder(count, weights) {
  const safeWeights = PARTIES.map((party) => Math.max(0, Number(weights[party]) || 0));
  const totalWeight = safeWeights.reduce((sum, value) => sum + value, 0);
  if (!count || !totalWeight) return Object.fromEntries(PARTIES.map((party) => [party, 0]));
  const exact = safeWeights.map((weight) => (weight / totalWeight) * count);
  const seats = exact.map(Math.floor);
  let remaining = count - seats.reduce((sum, value) => sum + value, 0);
  const order = exact.map((value, index) => ({ index, remainder: value - seats[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; index < remaining; index += 1) seats[order[index].index] += 1;
  return Object.fromEntries(PARTIES.map((party, index) => [party, seats[index]]));
}

function majorityControl(counts, total) {
  const majority = Math.floor(total / 2) + 1;
  if (counts.dem >= majority) return 'dem';
  if (counts.rep >= majority) return 'rep';
  if (counts.unallocated >= majority) return 'unresolved';
  return 'split';
}

export function legislatureProjectionIsProvisional(baseline, chamber) {
  return baseline.sourceStatus === 'unofficial-reported'
    || (baseline.unallocated || 0) > 0
    || chamber.districtCycleStatus === 'district-class-list-required'
    || Boolean(chamber.classRevision && chamber.totalSeats > chamber.seatsUp2028);
}

function projectChamber(state, chamber, game) {
  const baseline = baselineFor(state.abbr, chamber.chamber);
  if (!baseline) return null;
  if (state.nonpartisanUnicameral) {
    return {
      state: state.abbr,
      ...chamber,
      margin: 0,
      seatsUp: chamber.seatsUp2028,
      control: 'nonpartisan',
      winner: 'ind',
      projected: { nonpartisan: chamber.totalSeats },
      baseline,
      unresolved2027: false,
    };
  }

  const margin = genericIn(state.abbr, game);
  const seatsUp = chamber.seatsUp2028;
  const seatsOut = chamber.totalSeats - seatsUp;
  // Regular classes and current seat-holder parties have separate sources.
  // Proportionally allocate the documented party composition to the seats-up
  // class, keep the carry-forward seats, and call every 2028 seat at the exact
  // state generic-ballot margin required by the game design.
  const upByParty = allocateByLargestRemainder(seatsUp, baseline);
  const carried = Object.fromEntries(PARTIES.map((party) => [
    party,
    Math.max(0, (baseline[party] || 0) - upByParty[party]),
  ]));
  const called = margin > 0
    ? { dem: seatsUp }
    : margin < 0
      ? { rep: seatsUp }
      : { unallocated: seatsUp };
  const projected = Object.fromEntries(PARTIES.map((party) => [
    party,
    (carried[party] || 0) + (called[party] || 0),
  ]));
  const control = majorityControl(projected, chamber.totalSeats);
  const winner = control === 'dem' || control === 'rep' ? control : 'ind';

  return {
    state: state.abbr,
    ...chamber,
    margin,
    seatsUp,
    seatsOut,
    control,
    winner,
    projected,
    baseline,
    carried,
    called,
    provisional: legislatureProjectionIsProvisional(baseline, chamber),
    methodology: 'uniform-state-generic-margin-with-proportional-class-carry',
    ...(chamber.classRevision ? { carryCompositionStatus: 'estimated-proportional-carry; exact-current-seat-holders-not-established-by-regular-classes' } : {}),
  };
}

function chamberSummary(state, projectedChambers) {
  if (state.nonpartisanUnicameral) return 'nonpartisan';
  const controls = projectedChambers.map((chamber) => chamber.control);
  if (controls.some((control) => control === 'unresolved')) return 'unresolved';
  if (controls.every((control) => control === 'dem')) return 'dem';
  if (controls.every((control) => control === 'rep')) return 'rep';
  return 'split';
}

export function projectStateLegislatures(game, { includeNoElectionStates = false } = {}) {
  const projectedStates = effectiveLegislatureSchedules(STATE_LEGISLATURES_2028, game).map((state) => {
    const chambers = state.chambers
      .map((chamber) => projectChamber(state, chamber, game))
      .filter(Boolean);
    const activeChambers = chambers.filter((chamber) => chamber.seatsUp2028 > 0);
    if (!includeNoElectionStates && !activeChambers.length) return null;
    const control = chamberSummary(state, chambers);
    const margins = activeChambers.map((chamber) => chamber.margin);
    const margin = margins.length ? margins[0] : 0;
    const colorParty = control === 'dem' || control === 'rep' ? control : 'ind';
    return {
      ...state,
      chambers,
      activeChambers,
      control,
      margin,
      winner: colorParty,
      winnerColor: control === 'dem' ? COLOR_TOKENS.dem : control === 'rep' ? COLOR_TOKENS.rep : COLOR_TOKENS.tossup,
      color: state.nonpartisanUnicameral ? '#8790A3'
        : control === 'dem' || control === 'rep' ? marginColor(colorParty, margin)
          : COLOR_TOKENS.tossup,
      label: state.nonpartisanUnicameral ? 'Nonpartisan' : control === 'unresolved' ? 'Unresolved' : control === 'split' ? 'Split' : `${control === 'dem' ? 'D' : 'R'} ${margin >= 0 ? '+' : '−'}${Math.abs(margin).toFixed(1)}`,
      provisional: activeChambers.some((chamber) => chamber.provisional),
      has2028Election: activeChambers.length > 0,
      future2027BaselineUnknown: ['LA', 'MS', 'NJ', 'VA'].includes(state.abbr),
    };
  }).filter(Boolean);

  return {
    states: projectedStates,
    byState: Object.fromEntries(projectedStates.map((state) => [state.abbr, state])),
    methodology: 'Every seat up in 2028 uses the state generic-ballot margin. Carried seats use the latest reported composition; when exact seat-class assignments are unavailable, seats up are allocated proportionally from that composition.',
    dataSources: {
      schedule: STATE_LEGISLATURE_SOURCE,
      results: STATE_LEGISLATURE_RESULTS_2026_SOURCE,
      baselineFallback: BASELINE_FALLBACK_SOURCE,
    },
  };
}

function governorPartyAfter2028(stateAbbr, governorRaces) {
  const race = (governorRaces || []).find((item) => item.state === stateAbbr);
  if (race?.winner === 'dem' || race?.winner === 'rep') return race.winner;
  return STATE_GOVERNOR_PARTY_2027[stateAbbr] || null;
}

export function summarizeStateTrifectas(game, governorRaces = []) {
  const forecast = projectStateLegislatures(game, { includeNoElectionStates: true });
  const groups = { dem: [], rep: [], split: [], unresolved: [] };
  const exclusions = [];
  STATE_LEGISLATURES_2028.forEach((scheduledState) => {
    const state = forecast.byState[scheduledState.abbr];
    if (!state) {
      exclusions.push(scheduledState.abbr);
      return;
    }
    if (state.nonpartisanUnicameral) return;
    const governorParty = governorPartyAfter2028(state.abbr, governorRaces);
    if (state.future2027BaselineUnknown || !governorParty || state.control === 'unresolved') {
      exclusions.push(state.abbr);
      return;
    }
    if (state.control === 'split') {
      groups.split.push(state.abbr);
      return;
    }
    if (state.control === 'dem' && governorParty === 'dem') groups.dem.push(state.abbr);
    else if (state.control === 'rep' && governorParty === 'rep') groups.rep.push(state.abbr);
    else groups.split.push(state.abbr);
  });
  return {
    dem: groups.dem,
    rep: groups.rep,
    split: groups.split,
    unresolved: [...groups.unresolved, ...exclusions].sort(),
    counts: {
      dem: groups.dem.length,
      rep: groups.rep.length,
      split: groups.split.length,
      unresolved: groups.unresolved.length + exclusions.length,
    },
    source: STATE_GOVERNOR_PARTY_SOURCE,
  };
}

