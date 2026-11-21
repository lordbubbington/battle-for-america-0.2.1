// How the presidency is actually awarded.
//
// Four ways to win:
// 1. Electoral College (270 electors).
// 2. Regional elector pooling (R07): in Regional Parties mode, if combined
//    regional-party EVs >= 270 (and no single candidate already won >= 270 and
//    popularVote is not active), regional electors pool behind the regional
//    candidate with the most individual EVs (tie-break: national popular vote,
//    then stable regional party ID order).
// 3. National popular vote, when enabled.
// 4. Contingent House election by state delegation.

import { EV_TO_WIN } from '@/data/states';
import { REGIONAL_PARTY_IDS, SCENARIO_PARTIES } from '@/data/build39Scenarios';
import { voteUnits } from '@/lib/turnout';

export const PARTY_LABEL = {
  dem: 'Democrats',
  rep: 'Republicans',
  lib: 'Libertarians',
  grn: 'Greens',
  ind: 'Independents',
  ...Object.fromEntries(REGIONAL_PARTY_IDS.map((id) => [id, SCENARIO_PARTIES[id]?.label || id])),
};

// R09: Accurate national popular vote — sum actual modeled votes per party
// across states (including DC and split electoral states once), dividing by
// total valid votes. Never weight by electoral votes.
export function nationalVote(result) {
  const rows = result.rows || [];
  const seenStates = new Set();
  const totals = { dem: 0, rep: 0, lib: 0, grn: 0, ind: 0 };
  rows.forEach((row) => {
    const key = row.abbr || row.state;
    if (key && seenStates.has(key)) return;
    if (key) seenStates.add(key);
    const shares = (result.firstChoicePopularVote ? row.shares : row.rcvShares || row.shares) || {};
    const usesRankedChoice = !!row.rcvShares && !result.firstChoicePopularVote;
    const castFallback = Number.isFinite(row.cast) && row.cast > 0 ? row.cast : voteUnits(key);
    const parties = new Set([...Object.keys(totals), ...Object.keys(shares), ...Object.keys(row.votes || {})]);
    parties.forEach((party) => {
      const votes = !usesRankedChoice && row.votes && Number.isFinite(row.votes[party])
        ? row.votes[party]
        : ((shares[party] || 0) / 100) * castFallback;
      totals[party] = (totals[party] || 0) + Math.max(0, votes);
    });
  });
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0) || 1;
  const out = Object.fromEntries(Object.entries(totals).map(([party, votes]) => [party, (votes / total) * 100]));
  const ranked = Object.entries(out).sort((a, b) => b[1] - a[1]);
  return {
    ...out,
    totals,
    totalVotes: total,
    ranked,
    leader: ranked[0][0],
    leaderPct: ranked[0][1],
    runnerUp: ranked[1][0],
    margin: ranked[0][1] - ranked[1][1],
  };
}

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

// R07: Regional parties pool electors at >= 270.
export function resolveRegionalElectorPool(game, ev, popular) {
  const isRegional = game?.build40?.modeId === 'regional-parties'
    || game?.build39?.scenario?.id === 'regional-parties';
  if (!isRegional) return null;

  const regionalEntries = REGIONAL_PARTY_IDS
    .map((party) => ({ party, ev: ev?.[party] || 0, pop: popular?.totals?.[party] || popular?.[party] || 0 }))
    .filter((entry) => entry.ev > 0);
  const combinedEV = regionalEntries.reduce((sum, entry) => sum + entry.ev, 0);
  if (combinedEV < EV_TO_WIN || !regionalEntries.length) return null;

  const sorted = [...regionalEntries].sort((a, b) =>
    b.ev - a.ev
    || b.pop - a.pop
    || REGIONAL_PARTY_IDS.indexOf(a.party) - REGIONAL_PARTY_IDS.indexOf(b.party)
  );
  const winner = sorted[0].party;
  const originalEvBy = { ...ev };
  const finalEvBy = { ...ev };
  for (const entry of regionalEntries) {
    if (entry.party !== winner) finalEvBy[entry.party] = 0;
  }
  finalEvBy[winner] = combinedEV;

  const label = SCENARIO_PARTIES[winner]?.label || winner;
  return {
    combinedEV,
    winner,
    originalEvBy,
    finalEvBy,
    participants: regionalEntries.map((e) => ({ party: e.party, ev: e.ev })),
    explanation: `Regional party electors combined for ${combinedEV} electoral votes (at least ${EV_TO_WIN}) and pooled behind ${label}, the regional leader with ${sorted[0].ev} state electoral votes.`,
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
  const regionalPool = resolveRegionalElectorPool(game, ev, popular);

  if (game.popularVote) {
    // Popular vote decides the presidency without overriding the winner, while
    // retaining regional allocation details for display.
    return { mode: 'popular', winner: popular.leader, popular, evLeader, topEV, evWinner, regionalPool };
  }
  if (evWinner) {
    return { mode: 'electoral', winner: evWinner, popular, evLeader, topEV, evWinner, regionalPool: null };
  }

  // R07: Combined regional EVs >= 270 pool behind the leading regional candidate.
  if (regionalPool) {
    return {
      mode: 'regional-pool',
      winner: regionalPool.winner,
      popular,
      evLeader: regionalPool.winner,
      topEV: regionalPool.combinedEV,
      evWinner: regionalPool.winner,
      regionalPool,
    };
  }

  const allianceParty = game.electoralAlliance;
  const allianceEV = allianceParty ? (ev[game.party] || 0) + (ev[allianceParty] || 0) : 0;
  if (
    game.thirdMode === 'surge' && (!game.build39?.scenario?.id || game.build39.scenario.id === 'standard') && !game.popularVote && allianceParty &&
    allianceEV >= EV_TO_WIN && evLeader === game.party && topEV < EV_TO_WIN
  ) {
    return { mode: 'coalition', winner: game.party, partner: allianceParty, allianceEV, popular, evLeader, topEV };
  }

  const delegations = houseDelegations(house);
  return { mode: 'contingent', winner: delegations.leader, popular, delegations, evLeader, topEV, evWinner: null };
}
