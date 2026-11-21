// Ranked-choice transfers for the four-party scenario. The configured weights
// are each party's next-choice tendencies; when a preferred campaign is out,
// its portion is redistributed using that party's own preference weights.
export const RCV_PREFERENCES = {
  dem: { grn: 0.60, rep: 0.30, lib: 0.10 },
  grn: { dem: 0.70, rep: 0.10, lib: 0.20 },
  rep: { lib: 0.65, dem: 0.33, grn: 0.02 },
  lib: { rep: 0.70, grn: 0.25, dem: 0.05 },
};

export const FOUR_PARTY_ORDER = ['dem', 'rep', 'lib', 'grn'];

function totalOf(tallies) {
  return FOUR_PARTY_ORDER.reduce((sum, party) => sum + (tallies[party] || 0), 0);
}

function tallyOf(ballots, active) {
  const tally = Object.fromEntries(FOUR_PARTY_ORDER.map((party) => [party, 0]));
  active.forEach((party) => {
    tally[party] = (ballots[party] || []).reduce((sum, ballot) => sum + ballot.votes, 0);
  });
  return tally;
}

function distribute(origin, votes, active, path = new Set()) {
  const preferences = RCV_PREFERENCES[origin] || {};
  const entries = Object.entries(preferences);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (!total || path.has(origin)) {
    const each = votes / Math.max(1, active.length);
    return Object.fromEntries(active.map((party) => [party, each]));
  }
  const nextPath = new Set(path).add(origin);
  const out = Object.fromEntries(active.map((party) => [party, 0]));
  entries.forEach(([preferred, weight]) => {
    const portion = votes * weight / total;
    if (active.includes(preferred)) {
      out[preferred] += portion;
      return;
    }
    const forwarded = distribute(preferred, portion, active, nextPath);
    active.forEach((party) => { out[party] += forwarded[party] || 0; });
  });
  return out;
}

export function rankedChoiceTally(firstChoice = {}) {
  const originalTotal = FOUR_PARTY_ORDER.reduce((sum, party) => sum + Math.max(0, firstChoice[party] || 0), 0);
  const active = FOUR_PARTY_ORDER.filter((party) => (firstChoice[party] || 0) > 0);
  const ballots = Object.fromEntries(FOUR_PARTY_ORDER.map((party) => [party, []]));
  active.forEach((party) => ballots[party].push({ origin: party, votes: Math.max(0, firstChoice[party] || 0) }));
  const rounds = [];

  while (active.length > 1) {
    const current = tallyOf(ballots, active);
    const ordered = active.slice().sort((a, b) => current[a] - current[b] || FOUR_PARTY_ORDER.indexOf(a) - FOUR_PARTY_ORDER.indexOf(b));
    const leader = ordered[ordered.length - 1];
    if (current[leader] > originalTotal / 2) {
      rounds.push({ tallies: current, eliminated: null });
      break;
    }

    const eliminated = ordered[0];
    const nextActive = active.filter((party) => party !== eliminated);
    rounds.push({ tallies: current, eliminated });
    const transferred = Object.fromEntries(nextActive.map((party) => [party, []]));
    (ballots[eliminated] || []).forEach((ballot) => {
      const destinations = distribute(ballot.origin, ballot.votes, nextActive);
      nextActive.forEach((party) => {
        const votes = destinations[party] || 0;
        if (votes > 0) transferred[party].push({ origin: ballot.origin, votes });
      });
    });
    nextActive.forEach((party) => {
      ballots[party] = [...(ballots[party] || []), ...transferred[party]];
    });
    ballots[eliminated] = [];
    active.splice(0, active.length, ...nextActive);
  }

  const finalTallies = tallyOf(ballots, active);
  const ranked = active.slice().sort((a, b) => finalTallies[b] - finalTallies[a] || FOUR_PARTY_ORDER.indexOf(a) - FOUR_PARTY_ORDER.indexOf(b));
  const winner = ranked[0] || FOUR_PARTY_ORDER[0];
  const runnerUp = ranked[1] || winner;
  const denominator = totalOf(finalTallies) || originalTotal || 1;
  const shares = Object.fromEntries(FOUR_PARTY_ORDER.map((party) => [party, (finalTallies[party] || 0) / denominator * 100]));

  return {
    winner,
    runnerUp,
    margin: shares[winner] - shares[runnerUp],
    shares,
    finalTallies,
    rounds,
    eliminated: FOUR_PARTY_ORDER.filter((party) => !active.includes(party)),
  };
}

export function apportionSeats(shares, seats, seed = '') {
  const exact = FOUR_PARTY_ORDER.map((party) => ({
    party,
    value: Math.max(0, shares[party] || 0) * seats / 100,
  }));
  const counts = Object.fromEntries(FOUR_PARTY_ORDER.map((party) => [party, 0]));
  exact.forEach(({ party, value }) => { counts[party] = Math.floor(value); });
  let remaining = seats - FOUR_PARTY_ORDER.reduce((sum, party) => sum + counts[party], 0);
  const tieOffset = [...String(seed)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % FOUR_PARTY_ORDER.length;
  exact.sort((a, b) => {
    const fraction = (b.value - Math.floor(b.value)) - (a.value - Math.floor(a.value));
    if (fraction) return fraction;
    return (FOUR_PARTY_ORDER.indexOf(a.party) + tieOffset) % 4 - (FOUR_PARTY_ORDER.indexOf(b.party) + tieOffset) % 4;
  });
  exact.slice(0, remaining).forEach(({ party }) => { counts[party] += 1; });
  return counts;
}
