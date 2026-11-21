import { effectiveLegislatureSeats, effectiveLegislatureSchedules } from './build45LegislatureClasses.js';

const VALID_PARTIES = new Set(['dem', 'rep', 'lib', 'grn', 'independent', 'other', 'nonpartisan', 'vacant']);

function tally(records, partyField) {
  const counts = { dem: 0, rep: 0, lib: 0, grn: 0, other: 0, independent: 0, nonpartisan: 0, vacant: 0, unresolved: 0 };
  records.forEach((record) => {
    const party = record[partyField];
    if (VALID_PARTIES.has(party)) counts[party] += 1;
    else if (party) counts[party] = (counts[party] || 0) + 1;
    else counts.unresolved += 1;
  });
  return counts;
}

function defaultGenericMargin(stateAbbr, game) {
  const margin = game?.stateGeneric?.[stateAbbr];
  return Number.isFinite(margin) ? margin : null;
}

function calledSeatMap(actualCalls) {
  const entries = Array.isArray(actualCalls) ? actualCalls : Object.values(actualCalls || {});
  return new Map(entries.filter((call) => call?.seatId).map((call) => [call.seatId, call]));
}

/** Seat forecast and Election Night calls remain separate; calls never alter a forecast. */
export function projectStateLegislatureSeats(game, {
  seats = [],
  schedules = [],
  resultsByState = {},
  actualCalls = [],
  resolveStateGeneric = defaultGenericMargin,
  resolveVoteShares = null,
} = {}) {
  seats = effectiveLegislatureSeats(seats, game);
  schedules = effectiveLegislatureSchedules(schedules, game);
  const callsBySeat = calledSeatMap(actualCalls);
  const seatsByState = new Map();
  (seats || []).forEach((seat) => {
    if (!seatsByState.has(seat.state)) seatsByState.set(seat.state, []);
    seatsByState.get(seat.state).push(seat);
  });

  const stateRows = (schedules || []).map((state) => {
    const stateSeats = seatsByState.get(state.abbr) || [];
    const genericMarginDMinusR = state.nonpartisanUnicameral ? null : resolveStateGeneric(state.abbr, game);
    const chambers = state.chambers.map((chamber) => {
      const chamberSeats = stateSeats.filter((seat) => seat.chamber === chamber.chamber);
      const forecasts = chamberSeats.map((seat) => {
        let projectedMarginDMinusR = null;
        let projectedParty = null;
        let unresolvedReason = null;
        let projectedShares = null;
        if (seat.seatUpIn2028 === false) {
          projectedParty = seat.holderParty2024;
          if (!projectedParty) unresolvedReason = '2024-seat-holder-unavailable';
        } else if (seat.seatUpIn2028 !== true) {
          unresolvedReason = '2028-seat-class-roster-unavailable';
        } else if (!Number.isFinite(genericMarginDMinusR)) {
          unresolvedReason = 'state-generic-ballot-unavailable';
        } else if (!Number.isFinite(seat.baselineLeanDMinusR)) {
          unresolvedReason = 'seat-lean-unavailable';
        } else {
          projectedMarginDMinusR = genericMarginDMinusR + seat.baselineLeanDMinusR;
          if (game?.thirdMode === 'surge' || game?.build39?.scenario?.id === 'regional-parties') {
            if (typeof resolveVoteShares !== 'function') unresolvedReason = 'shared-multiparty-resolver-unavailable';
            else {
              projectedShares = resolveVoteShares({ margin: projectedMarginDMinusR, abbr: state.abbr, game, mode: 'poll', race: 'legislature', opening: projectedMarginDMinusR });
              const ranked = Object.entries(projectedShares || {}).filter(([, share]) => Number.isFinite(share) && share >= 0).sort((a, b) => b[1] - a[1]);
              if (ranked.length < 2 || ranked[0][1] <= 0) unresolvedReason = 'vote-shares-unavailable';
              else if (ranked[0][1] === ranked[1][1]) unresolvedReason = 'projected-tie';
              else projectedParty = ranked[0][0] === 'ind' ? 'independent' : ranked[0][0];
            }
          } else if (projectedMarginDMinusR > 0) projectedParty = 'dem';
          else if (projectedMarginDMinusR < 0) projectedParty = 'rep';
          else unresolvedReason = 'projected-tie';
        }
        return { ...seat, genericMarginDMinusR, projectedMarginDMinusR, projectedShares, projectedParty, unresolvedReason };
      });
      const called = chamberSeats
        .filter((seat) => seat.seatUpIn2028 === true || (seat.seatUpIn2028 === null && callsBySeat.get(seat.seatId)?.seatUpConfirmed === true))
        .map((seat) => {
        const result = callsBySeat.get(seat.seatId);
        const callIsEligible = seat.seatUpIn2028 === true || (seat.seatUpIn2028 === null && result?.seatUpConfirmed === true);
        const party = callIsEligible && VALID_PARTIES.has(result?.party) ? result.party : null;
        return { seatId: seat.seatId, party, source: party ? result.source || null : null, callStatus: party ? 'called' : 'uncalled' };
      });
      return {
        chamber: chamber.chamber,
        totalSeats: chamber.totalSeats,
        seatsUp2028: chamber.seatsUp2028,
        forecastCounts: tally(forecasts, 'projectedParty'),
        forecastControl: forecastControl(forecasts),
        callCounts: tally(called, 'party'),
        calledSeatCount: called.filter((call) => call.party).length,
        unresolvedSeatCount: forecasts.filter((seat) => !seat.projectedParty).length,
        forecasts,
        calls: called,
        '2024Aggregate': (resultsByState[state.abbr] || []).find((result) => result.chamber === chamber.chamber) || null,
      };
    });
    return { abbr: state.abbr, name: state.name, genericMarginDMinusR, chambers };
  });

  return {
    states: stateRows,
    byState: Object.fromEntries(stateRows.map((state) => [state.abbr, state])),
    methodology: 'A scheduled seat forecast is state generic D-minus-R margin plus that seat’s verified baseline lean. Missing seat identity, holder, lean, or state polling remains unresolved. Calls use a separate actual-results input.',
    simplification: 'Each statutory seat has equal voterWeight 1; legislative voter demographics are not modeled.',
  };
}

function forecastControl(forecasts) {
  const counts = tally(forecasts, 'projectedParty');
  if (counts.nonpartisan === forecasts.length) return 'nonpartisan';
  for (const party of Object.keys(counts).filter((id) => !['nonpartisan', 'vacant', 'unresolved'].includes(id))) {
    if (counts[party] > forecasts.length / 2) return party;
  }
  if (counts.unresolved > 0) return 'unresolved';
  return 'split';
}

