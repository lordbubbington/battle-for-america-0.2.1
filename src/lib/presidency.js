// How the presidency is actually awarded.
//
// Three ways to win, and the game can be played with any of them:
//
// 1. The Electoral College, which is the default: 270 electors, or a plurality
//    when a third party takes enough of them to keep anybody from 270.
// 2. The national popular vote, when the scenario switches it on.
// 3. A contingent election. With nobody at 270 the House of Representatives
//    chooses the president, and it votes by state delegation — one vote per
//    state, and whoever controls the most delegations wins the White House.

import { EV_TO_WIN } from '@/data/states';

export const PARTY_LABEL = {
  dem: 'Democrats',
  rep: 'Republicans',
  lib: 'Libertarians',
  grn: 'Greens',
  ind: 'Independents',
};

// The national popular vote is the sum of the counted state ballots. Electoral
// Votes decide state calls; they are not a proxy for population.
export function nationalVote(result) {
  const rows = result.rows || [];
  const totals = { dem: 0, rep: 0, lib: 0, grn: 0, ind: 0 };
  rows.forEach((row) => {
    const shares = (result.firstChoicePopularVote ? row.shares : row.rcvShares || row.shares) || {};
    const usesRankedChoice = !!row.rcvShares && !result.firstChoicePopularVote;
    const parties = new Set([...Object.keys(totals), ...Object.keys(shares), ...Object.keys(row.votes || {})]);
    parties.forEach((party) => {
      const votes = !usesRankedChoice && row.votes
        ? row.votes[party] || 0
        : ((shares[party] || 0) / 100) * (row.cast || 0);
      totals[party] = (totals[party] || 0) + votes;
    });
  });
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0) || 1;
  const out = Object.fromEntries(Object.entries(totals).map(([party, votes]) => [party, (votes / total) * 100]));
  const ranked = Object.entries(out).sort((a, b) => b[1] - a[1]);
  return {
    ...out,
    ranked,
    leader: ranked[0][0],
    leaderPct: ranked[0][1],
    runnerUp: ranked[1][0],
    margin: ranked[0][1] - ranked[1][1],
  };
}

// Each state's delegation is its own little parliament: whoever holds most of
// its seats controls its one vote. An evenly split delegation controls nothing.
export function houseDelegations(house) {
  const states = (house?.states || []).map((s) => {
    const seats = { dem: s.demSeats || 0, rep: s.repSeats || 0, lib: s.libSeats || 0, grn: s.grnSeats || 0, ...s.seatsByParty };
    delete seats.ind;
    const ranked = Object.entries(seats).sort((a, b) => b[1] - a[1]);
    const top = ranked[0][1];
    const tied = top > 0 && ranked[1][1] === top;
    return {
      abbr: s.state,
      name: s.name,
      seats,
      party: top === 0 || tied ? 'split' : ranked[0][0],
      tied,
    };
  });

  const counts = { dem: 0, rep: 0, lib: 0, grn: 0, split: 0 };
  states.forEach((s) => {
    counts[s.party] = (counts[s.party] || 0) + 1;
  });
  const total = states.length;
  const needed = Math.floor(total / 2) + 1;
  const ranked = Object.entries(counts).filter(([party]) => party !== 'split').sort((a, b) => b[1] - a[1]);
  const decided = ranked[0][1] > ranked[1][1];

  return {
    states,
    counts,
    total,
    needed,
    leader: decided ? ranked[0][0] : null,
    leaderCount: ranked[0][1],
    majority: ranked[0][1] >= needed,
    closest: states
      .filter((s) => Object.values(s.seats).filter((n) => n > 0).length > 1)
      .slice(0, 8),
  };
}

export function decidePresidency(game, result, house) {
  const popular = nationalVote(result);
  const ev = result.evBy || {};
  const ranked = Object.entries(ev)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  const topEV = ranked[0] ? ranked[0][1] : 0;
  const secondEV = ranked[1] ? ranked[1][1] : 0;
  const evLeader = ranked[0] ? ranked[0][0] : null;
  const evWinner = topEV >= EV_TO_WIN && topEV > secondEV ? evLeader : null;

  if (game.popularVote) {
    return { mode: 'popular', winner: popular.leader, popular, evLeader, topEV, evWinner };
  }
  if (evWinner) {
    return { mode: 'electoral', winner: evWinner, popular, evLeader, topEV, evWinner };
  }

  const allianceParty = game.electoralAlliance;
  const allianceEV = allianceParty ? (ev[game.party] || 0) + (ev[allianceParty] || 0) : 0;
  if (
    game.thirdMode === 'surge' && (!game.build39?.scenario?.id || game.build39.scenario.id === 'standard') && !game.popularVote && allianceParty &&
    allianceEV >= EV_TO_WIN && evLeader === game.party && topEV < EV_TO_WIN
  ) {
    return { mode: 'coalition', winner: game.party, partner: allianceParty, allianceEV, popular, evLeader, topEV };
  }

  // Nobody reached 270: the House votes by state delegation. A unique plurality
  // wins; House seat totals do not break a delegation tie.
  const delegations = houseDelegations(house);
  return { mode: 'contingent', winner: delegations.leader, popular, delegations, evLeader, topEV, evWinner: null };
}
