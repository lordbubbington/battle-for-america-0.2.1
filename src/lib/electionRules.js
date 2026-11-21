export const ELECTION_PARTIES = ["dem", "rep", "lib", "grn", "ind"];

const partyKeys = (shares) => [...new Set([...ELECTION_PARTIES, ...Object.keys(shares)])];

// Deterministic largest-remainder apportionment. Fixed party order breaks exact ties.
export function largestRemainder(shares = {}, seats = 0, eligibleParties = null) {
  const count = Math.max(0, Math.floor(Number(seats) || 0));
  const orderOfParties = partyKeys(shares);
  const allowed = new Set(eligibleParties || orderOfParties);
  const weights = Object.fromEntries(orderOfParties.map((party) => [
    party,
    allowed.has(party) ? Math.max(0, Number(shares[party]) || 0) : 0,
  ]));
  let total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    const winner = orderOfParties.slice().sort((a, b) => (Number(shares[b]) || 0) - (Number(shares[a]) || 0) || orderOfParties.indexOf(a) - orderOfParties.indexOf(b))[0];
    weights[winner] = 1;
    total = 1;
  }
  const exact = Object.fromEntries(orderOfParties.map((party) => [party, weights[party] / total * count]));
  const result = Object.fromEntries(orderOfParties.map((party) => [party, Math.floor(exact[party])]));
  const remaining = count - Object.values(result).reduce((sum, value) => sum + value, 0);
  const order = orderOfParties.slice().sort((a, b) => (exact[b] - Math.floor(exact[b])) - (exact[a] - Math.floor(exact[a])) || orderOfParties.indexOf(a) - orderOfParties.indexOf(b));
  for (let index = 0; index < remaining; index += 1) result[order[index % order.length]] += 1;
  return result;
}

export function qualifyingParties(shares = {}, threshold = 5, exceptions = []) {
  const orderOfParties = partyKeys(shares);
  const qualifying = orderOfParties.filter((party) => (Number(shares[party]) || 0) >= threshold || exceptions.includes(party));
  if (qualifying.length) return qualifying;
  const top = orderOfParties.slice().sort((a, b) => (Number(shares[b]) || 0) - (Number(shares[a]) || 0) || orderOfParties.indexOf(a) - orderOfParties.indexOf(b))[0];
  return [top];
}

export function allocateProportional(shares = {}, seats = 0, threshold = 5, exceptions = []) {
  return largestRemainder(shares, seats, qualifyingParties(shares, threshold, exceptions));
}

/** @param {Array<any>} rows @param {(row: any) => Record<string, number>} sharesOf @param {(row: any) => number} weightOf */
export function weightedNationalShares(rows = [], sharesOf = (row) => row.shares, weightOf = (_row) => 1) {
  const totals = Object.fromEntries(ELECTION_PARTIES.map((party) => [party, 0]));
  let weightTotal = 0;
  rows.forEach((row) => {
    const shares = sharesOf(row) || {};
    const weight = Math.max(0, Number(weightOf(row)) || 0);
    weightTotal += weight;
    for (const [party, share] of Object.entries(shares)) {
      totals[party] = (totals[party] || 0) + (Number(share) || 0) * weight;
    }
  });
  if (!weightTotal) return totals;
  const totalVotes = Object.values(totals).reduce((sum, value) => sum + value, 0) || 1;
  return Object.fromEntries(Object.keys(totals).map((party) => [party, totals[party] / totalVotes * 100]));
}