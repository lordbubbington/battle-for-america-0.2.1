const PARTY_IDS = new Set(['dem','rep','lib','grn','ind']);

/** Allocate one mutually exclusive first-choice cohort to MMP list ballots. */
export function allocateMmpListPreferences({ cohorts = [], availableListPartyIds = ['dem','rep','lib','grn'] } = {}) {
  const available = new Set(availableListPartyIds);
  const votes = Object.fromEntries([...available].map((id) => [id, 0]));
  const audit = [];
  const unavailableReasons = [];
  let totalInput = 0;
  for (const cohort of cohorts) {
    const weight = Number(cohort.weight);
    const first = cohort.firstChoiceParty;
    if (!Number.isFinite(weight) || weight < 0 || !PARTY_IDS.has(first)) throw new Error(`Invalid MMP cohort: ${cohort.id || '(missing id)'}`);
    totalInput += weight;
    let remaining = weight;
    const move = (destination, fraction, rule) => {
      if (!available.has(destination)) return;
      const amount = remaining * fraction;
      audit.push({ cohortId: cohort.id, destination, rule, denominator: remaining, transferred: amount, retained: remaining - amount });
      votes[destination] += amount;
      remaining -= amount;
    };
    if (first === 'lib' || cohort.ideologyId === 'libertarian') {
      move('lib', 1, 'libertarian-full');
    } else {
      if (first === 'rep') move('lib', 0.1, 'republican-ten-percent');
      if (cohort.ideologyId === 'far left') move('grn', 0.5, 'progressive-half');
    }
    if (!available.has(first) && remaining > 0) {
      const reason = 'First-choice list unavailable';
      unavailableReasons.push({ cohortId: cohort.id, reason });
      audit.push({ cohortId: cohort.id, reason });
    }
    if (remaining > 0) votes[first] = (votes[first] || 0) + remaining;
  }
  const listVotes = Object.values(votes).reduce((a, b) => a + b, 0);
  return { listVotesByParty: votes, transferAudit: audit, inputWeight: totalInput, allocatedWeight: listVotes, unavailableReasons,
    conserved: Math.abs(listVotes - totalInput) < 1e-8, status: Math.abs(listVotes - totalInput) < 1e-8 && !unavailableReasons.length ? 'ready' : 'unavailable' };
}
