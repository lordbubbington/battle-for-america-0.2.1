/**
 * Portable Build 34 election-rule calculations. Inputs are forecast outputs or
 * versioned race metadata supplied by the game adapter; this module owns no
 * voter simulation and never awards seats from campaign bonuses directly.
 */

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

export const BUILD34_DEFAULT_THRESHOLD_PERCENT = 5;

/** Canonicalize Advanced Options and reject combinations without defined rules. */
export function normalizeElectionOptions(options = {}) {
  if (options.separateMmpVote || options.separateMmpListVote || options.separateMmpListVotes) {
    throw new Error('Build 34 does not support a separate MMP list vote');
  }
  const housePR = Boolean(options.housePR ?? options.proportionalRepresentation);
  const houseMMP = Boolean(options.houseMMP ?? options.mixedMemberProportional);
  const ecDistricts = Boolean(options.allStateDistrictElectors ?? options.districtElectoralCollege);
  const ecProportional = Boolean(options.proportionalElectoralVotes);
  if (housePR && houseMMP) throw new Error('House PR and House MMP are mutually exclusive representation rules');
  if (ecDistricts && ecProportional) throw new Error('District and proportional Electoral College rules cannot be active together');
  const requestedThreshold = Number(options.thresholdPercent ?? BUILD34_DEFAULT_THRESHOLD_PERCENT);
  if (requestedThreshold !== BUILD34_DEFAULT_THRESHOLD_PERCENT) {
    throw new Error('Build 34 proportional and MMP modes use a fixed 5% threshold');
  }
  const thresholdPercent = BUILD34_DEFAULT_THRESHOLD_PERCENT;
  return {
    houseRule: housePR ? 'pr' : houseMMP ? 'mmp' : 'district',
    houseSeatCount: houseMMP ? 870 : 435,
    electoralCollegeRule: ecDistricts ? 'district' : ecProportional ? 'proportional' : 'winner-take-all',
    thresholdPercent,
    separateMmpVoteAllowed: false,
    ruleKey: `house-${housePR ? 'pr' : houseMMP ? 'mmp' : 'district'}:ec-${ecDistricts ? 'district' : ecProportional ? 'proportional' : 'winner-take-all'}:threshold-${thresholdPercent}`,
  };
}

const getVotes = (shares, party) => Math.max(0, Number(shares?.[party]) || 0);
const totalVotes = (shares) => Object.values(shares || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
const assertThreshold = (thresholdPercent, context) => {
  if (Number(thresholdPercent) !== BUILD34_DEFAULT_THRESHOLD_PERCENT) {
    throw new Error(`${context} uses the fixed Build 34 threshold of 5%`);
  }
};

/**
 * Largest-remainder allocation with stable tie-breaking. Shares can be vote
 * totals, fractions, or percentages; threshold qualification uses the entire
 * electorate before any excluded parties are removed.
 */
export function allocateLargestRemainder({
  voteShares = {},
  seats = 0,
  thresholdPercent = 0,
  eligiblePartyIds = null,
  tieOrder = [],
} = {}) {
  const seatCount = Math.max(0, Math.floor(Number(seats) || 0));
  const total = totalVotes(voteShares);
  const tieIndex = new Map(tieOrder.map((party, index) => [party, index]));
  const candidates = Object.keys(voteShares).sort();
  const eligible = candidates.filter((party) => {
    if (eligiblePartyIds && !eligiblePartyIds.includes(party)) return false;
    if (!total) return false;
    return getVotes(voteShares, party) / total * 100 + 1e-10 >= thresholdPercent;
  });
  const eligibleTotal = eligible.reduce((sum, party) => sum + getVotes(voteShares, party), 0);
  const allocation = Object.fromEntries(candidates.map((party) => [party, 0]));
  if (!seatCount || !eligibleTotal) {
    return { allocation, eligiblePartyIds: eligible, unallocatedSeats: seatCount, thresholdPercent };
  }
  const remainders = [];
  let assigned = 0;
  for (const party of eligible) {
    const exact = (getVotes(voteShares, party) / eligibleTotal) * seatCount;
    const whole = Math.floor(exact);
    allocation[party] = whole;
    assigned += whole;
    remainders.push({ party, remainder: exact - whole });
  }
  remainders.sort((a, b) => (b.remainder - a.remainder) ||
    ((tieIndex.get(a.party) ?? Number.MAX_SAFE_INTEGER) - (tieIndex.get(b.party) ?? Number.MAX_SAFE_INTEGER)) ||
    a.party.localeCompare(b.party));
  for (let index = 0; index < seatCount - assigned; index += 1) allocation[remainders[index].party] += 1;
  return { allocation, eligiblePartyIds: eligible, unallocatedSeats: 0, thresholdPercent };
}

/** All-state district lean: current state generic margin plus its 2026-relative lean. */
export function projectDistrictMargin({
  stateGenericMargin,
  districtBaselineMargin,
  nationalBaselineMargin = 0,
}) {
  return Number(stateGenericMargin || 0) + Number(districtBaselineMargin || 0) - Number(nationalBaselineMargin || 0);
}

/** A seat's party is determined by the generic ballot plus race-specific baseline lean. */
export function projectTwoPartyDistrict({ stateGenericMargin, districtBaselineMargin, nationalBaselineMargin = 0, tieParty = 'dem' }) {
  const margin = projectDistrictMargin({ stateGenericMargin, districtBaselineMargin, nationalBaselineMargin });
  return { margin, winner: margin === 0 ? tieParty : margin > 0 ? 'dem' : 'rep' };
}

/** Apply each party's state generic-ballot swing uniformly to district baselines. */
export function applyStateGenericBallotSwing({
  raceBaselineShares = {},
  stateBaselineShares = {},
  currentStateShares = {},
} = {}) {
  const parties = new Set([
    ...Object.keys(raceBaselineShares),
    ...Object.keys(stateBaselineShares),
    ...Object.keys(currentStateShares),
  ]);
  const shifted = {};
  for (const party of parties) {
    const baselineRace = Math.max(0, Number(raceBaselineShares[party]) || 0);
    const stateDelta = (Number(currentStateShares[party]) || 0) - (Number(stateBaselineShares[party]) || 0);
    shifted[party] = Math.max(0, baselineRace + stateDelta);
  }
  const total = totalVotes(shifted);
  if (!total) return { voteShares: {}, winner: null };
  // Keep the public projection contract on percentage-point shares (0..100),
  // matching normalized catalog inputs and the state-generic snapshot shape.
  const voteShares = Object.fromEntries(Object.entries(shifted).map(([party, votes]) => [party, votes / total * 100]));
  const winner = Object.entries(voteShares).sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))[0]?.[0] || null;
  return { voteShares, winner };
}

/** House PR: national 5% qualification, then state-level largest remainders. */
export function allocateHousePR({
  nationalVoteShares = {},
  states = [],
  thresholdPercent = BUILD34_DEFAULT_THRESHOLD_PERCENT,
  expectedHouseSeatCount = 435,
}) {
  assertThreshold(thresholdPercent, 'House PR');
  const allocatedSeatCount = (states || []).reduce((sum, state) => sum + Math.max(0, Math.floor(Number(state.seatCount) || 0)), 0);
  if (allocatedSeatCount !== expectedHouseSeatCount) {
    throw new Error(`House PR needs ${expectedHouseSeatCount} real district seats, received ${allocatedSeatCount}`);
  }
  const totalNationalVotes = totalVotes(nationalVoteShares);
  const qualifiedPartyIds = totalNationalVotes
    ? Object.keys(nationalVoteShares).filter((party) => getVotes(nationalVoteShares, party) / totalNationalVotes * 100 + 1e-10 >= thresholdPercent).sort()
    : [];
  const perState = {};
  const nationalSeats = {};
  for (const state of states || []) {
    const stateId = state.id || state.abbr;
    if (!stateId || !Number.isInteger(Number(state.seatCount)) || Number(state.seatCount) < 0) {
      throw new Error('House PR state metadata needs a stable id and nonnegative seatCount');
    }
    const result = allocateLargestRemainder({
      voteShares: state.voteShares || {},
      seats: Number(state.seatCount),
      thresholdPercent: 0,
      eligiblePartyIds: qualifiedPartyIds,
      tieOrder: state.tieOrder || [],
    });
    perState[stateId] = result;
    for (const [party, count] of Object.entries(result.allocation)) nationalSeats[party] = (nationalSeats[party] || 0) + count;
  }
  return { qualifiedPartyIds, perState, nationalSeats, thresholdPercent };
}

/** Proportional Electoral College: qualify separately in each state at 5%. */
export function allocateProportionalElectors({ states = [], thresholdPercent = BUILD34_DEFAULT_THRESHOLD_PERCENT }) {
  assertThreshold(thresholdPercent, 'Proportional Electoral College');
  const perState = {};
  const nationalElectors = {};
  for (const state of states || []) {
    const stateId = state.id || state.abbr;
    const electorCount = Number(state.electorCount);
    if (!stateId || !Number.isInteger(electorCount) || electorCount < 0) {
      throw new Error('Proportional Electoral College metadata needs a stable state id and electorCount');
    }
    const result = allocateLargestRemainder({
      voteShares: state.voteShares || {},
      seats: electorCount,
      thresholdPercent,
      tieOrder: state.tieOrder || [],
    });
    perState[stateId] = result;
    for (const [party, count] of Object.entries(result.allocation)) nationalElectors[party] = (nationalElectors[party] || 0) + count;
  }
  return { perState, nationalElectors, thresholdPercent };
}

function allocateSainteLague(voteShares, seats, partyIds) {
  const allocation = Object.fromEntries(partyIds.map((party) => [party, 0]));
  const eligible = partyIds.filter((party) => getVotes(voteShares, party) > 0).sort();
  for (let seat = 0; seat < seats && eligible.length; seat += 1) {
    let best = eligible[0];
    let bestQuotient = getVotes(voteShares, best) / (2 * allocation[best] + 1);
    for (const party of eligible.slice(1)) {
      const quotient = getVotes(voteShares, party) / (2 * allocation[party] + 1);
      if (quotient > bestQuotient || (quotient === bestQuotient && party.localeCompare(best) < 0)) {
        best = party;
        bestQuotient = quotient;
      }
    }
    allocation[best] += 1;
  }
  return allocation;
}

function allocateMmpStateEntitlements({ statePartyVotesByState, partySeats, parties }) {
  const byState = Object.fromEntries(Object.keys(statePartyVotesByState || {}).map((stateId) => [stateId, {}]));
  for (const party of parties) {
    const partyVotesByState = Object.fromEntries(Object.entries(statePartyVotesByState || {}).map(([stateId, votes]) => [
      stateId,
      Math.max(0, Number(votes?.[party]) || 0),
    ]));
    const stateSeats = allocateSainteLague(partyVotesByState, partySeats[party] || 0, Object.keys(partyVotesByState));
    for (const [stateId, count] of Object.entries(stateSeats)) byState[stateId][party] = count;
  }
  return byState;
}

/**
 * Single-vote MMP entitlement with a national 5% threshold and three-district
 * exception. District winners and national shares must come from the same
 * forecast. Classic overhang is handled by expanding the proportional chamber
 * until each qualified party's entitlement covers its constituency wins.
 */
/** @param {any} input */
export function allocateHouseMMP(input = {}) {
  const {
    nationalVoteShares = {},
    constituencySeatsWonByParty = {},
    constituencySeatsWonByStateParty = {},
    statePartyVotesByState = {},
    baseSeatCount = 870,
    thresholdPercent = BUILD34_DEFAULT_THRESHOLD_PERCENT,
    districtExceptionCount = 3,
    separateListVoteShares,
    listVoteShares,
    partyListVoteShares,
    secondVoteShares,
  } = input;
  if (separateListVoteShares || listVoteShares || partyListVoteShares || secondVoteShares) {
    throw new Error('Build 34 MMP uses one vote; separate list votes are not supported');
  }
  assertThreshold(thresholdPercent, 'House MMP');
  if (Number(baseSeatCount) !== 870 || Number(districtExceptionCount) !== 3) {
    throw new Error('Build 34 MMP uses 870 seats and the three-constituency qualification exception');
  }
  const baseSeats = Math.max(0, Math.floor(Number(baseSeatCount) || 0));
  const exceptionCount = Math.max(1, Math.floor(Number(districtExceptionCount) || 3));
  const total = totalVotes(nationalVoteShares);
  const hasAggregateDirectSeats = Object.keys(constituencySeatsWonByParty || {}).length > 0;
  const aggregateDirectSeats = hasAggregateDirectSeats
    ? constituencySeatsWonByParty
    : Object.values(constituencySeatsWonByStateParty || {}).reduce((sum, byParty) => {
      for (const [party, count] of Object.entries(byParty || {})) sum[party] = (sum[party] || 0) + Math.max(0, Number(count) || 0);
      return sum;
    }, {});
  const candidates = [...new Set([
    ...Object.keys(nationalVoteShares),
    ...Object.keys(aggregateDirectSeats || {}),
  ])].sort();
  for (const [party, seats] of Object.entries(aggregateDirectSeats || {})) {
    if (Number(seats) > 0 && getVotes(nationalVoteShares, party) <= 0) {
      throw new Error(`MMP constituency winner ${party} has no vote share in the shared single-vote model`);
    }
  }
  const constituency = Object.fromEntries(candidates.map((party) => [party, Math.max(0, Math.floor(Number(aggregateDirectSeats[party]) || 0))]));
  const directByState = Object.fromEntries(Object.entries(constituencySeatsWonByStateParty || {}).map(([stateId, byParty]) => [
    stateId,
    Object.fromEntries(Object.entries(byParty || {}).map(([party, count]) => [party, Math.max(0, Math.floor(Number(count) || 0))])),
  ]));
  if (Object.keys(directByState).length && !Object.keys(statePartyVotesByState || {}).length) {
    throw new Error('MMP state constituency wins require state vote totals from the same single-vote model');
  }
  if (hasAggregateDirectSeats && Object.keys(directByState).length) {
    for (const party of candidates) {
      const stateTotal = Object.values(directByState).reduce((sum, byParty) => sum + (byParty[party] || 0), 0);
      if (stateTotal !== (constituency[party] || 0)) throw new Error(`MMP direct-seat totals do not match for ${party}`);
    }
  }
  const qualified = candidates.filter((party) => {
    const voteShare = total ? getVotes(nationalVoteShares, party) / total * 100 : 0;
    return voteShare + 1e-10 >= thresholdPercent || (constituency[party] || 0) >= exceptionCount;
  });
  const excludedDirectSeatParties = candidates.filter((party) => !qualified.includes(party) && (constituency[party] || 0) > 0);
  let proportionalChamberSize = baseSeats;
  let entitlement = allocateSainteLague(nationalVoteShares, proportionalChamberSize, qualified);
  let stateEntitlement = Object.keys(statePartyVotesByState || {}).length
    ? allocateMmpStateEntitlements({ statePartyVotesByState, partySeats: entitlement, parties: qualified })
    : {};
  let iterations = 0;
  const hasAggregateOverhang = () => qualified.some((party) => entitlement[party] < (constituency[party] || 0));
  const stateOverhang = () => Object.entries(directByState).some(([stateId, byParty]) => qualified.some((party) =>
    (stateEntitlement[stateId]?.[party] || 0) < (byParty[party] || 0)));
  while (hasAggregateOverhang() || stateOverhang()) {
    if (iterations++ > 20000) throw new Error('MMP overhang compensation did not converge');
    const shortfall = Math.max(...qualified.map((party) => (constituency[party] || 0) - entitlement[party]));
    let estimatedGrowth = Math.max(1, shortfall);
    for (const [stateId, byParty] of Object.entries(directByState)) {
      for (const party of qualified) {
        const gap = (byParty[party] || 0) - (stateEntitlement[stateId]?.[party] || 0);
        if (gap <= 0) continue;
        const partyStateVotes = Math.max(0, Number(statePartyVotesByState[stateId]?.[party]) || 0);
        const partyVotes = Object.values(statePartyVotesByState).reduce((sum, votes) => sum + Math.max(0, Number(votes?.[party]) || 0), 0);
        const eligibleVotes = qualified.reduce((sum, eligibleParty) => sum + getVotes(nationalVoteShares, eligibleParty), 0);
        const stateShareWithinParty = partyVotes ? partyStateVotes / partyVotes : 0;
        const partyShareNational = eligibleVotes ? getVotes(nationalVoteShares, party) / eligibleVotes : 0;
        if (!stateShareWithinParty || !partyShareNational) throw new Error(`MMP state list votes are missing for ${stateId}/${party}`);
        const requiredPartySeats = (stateEntitlement[stateId]?.[party] || 0) + Math.ceil(gap / stateShareWithinParty);
        const requiredGrowth = Math.ceil((requiredPartySeats - (entitlement[party] || 0)) / partyShareNational);
        estimatedGrowth = Math.max(estimatedGrowth, requiredGrowth);
      }
    }
    proportionalChamberSize += estimatedGrowth;
    entitlement = allocateSainteLague(nationalVoteShares, proportionalChamberSize, qualified);
    stateEntitlement = Object.keys(statePartyVotesByState || {}).length
      ? allocateMmpStateEntitlements({ statePartyVotesByState, partySeats: entitlement, parties: qualified })
      : {};
  }
  const partySeats = {};
  const listSeats = {};
  const listSeatsByState = Object.fromEntries(Object.entries(stateEntitlement).map(([stateId, byParty]) => [
    stateId,
    Object.fromEntries(Object.entries(byParty).map(([party, count]) => [
      party,
      Math.max(0, count - (qualified.includes(party) ? (directByState[stateId]?.[party] || 0) : 0)),
    ])),
  ]));
  for (const party of new Set([...candidates, ...Object.keys(constituency)])) {
    const direct = constituency[party] || 0;
    const proportional = entitlement[party] || 0;
    partySeats[party] = qualified.includes(party) ? proportional : 0;
    listSeats[party] = qualified.includes(party) ? Math.max(0, proportional - direct) : 0;
  }
  const totalSeats = Object.values(partySeats).reduce((sum, count) => sum + count, 0);
  return {
    qualifiedPartyIds: qualified,
    partySeats,
    listSeats,
    allocatedConstituencySeats: Object.fromEntries(Object.entries(constituency).map(([party, count]) => [
      party,
      qualified.includes(party) ? count : 0,
    ])),
    stateSeatEntitlements: stateEntitlement,
    constituencySeatsByState: directByState,
    listSeatsByState,
    constituencySeats: constituency,
    baseSeatCount: baseSeats,
    proportionalChamberSize,
    totalSeats,
    unallocatedProportionalSeats: Math.max(0, proportionalChamberSize - totalSeats),
    overhangExpansion: Math.max(0, proportionalChamberSize - baseSeats),
    excludedDirectSeatParties,
    thresholdPercent,
    districtExceptionCount: exceptionCount,
    voteModel: 'single-vote',
  };
}

/** Two statewide electors plus one elector for each real congressional district. */
export function allocateDistrictElectors({ stateWinner, districts = [], stateId, electorCount }) {
  if (!stateId || !stateWinner) throw new Error('District electors require stateId and the statewide winner');
  if (electorCount !== undefined && Number(electorCount) !== districts.length + 2) {
    throw new Error(`Electors for ${stateId} must equal two statewide seats plus its congressional districts`);
  }
  const allocation = { [stateWinner]: 2 };
  for (const district of districts || []) {
    if (!district?.id || !district.winner) throw new Error(`Invalid Electoral College district in ${stateId}`);
    allocation[district.winner] = (allocation[district.winner] || 0) + 1;
  }
  return { stateId, allocation, districtCount: districts.length, atLargeElectors: 2 };
}

/** Apply the district-elector toggle uniformly; legacy ME/NE exceptions are ignored. */
export function allocateAllStateDistrictElectors({ states = [], districtsByState = {} } = {}) {
  const perState = {};
  const nationalElectors = {};
  for (const state of states || []) {
    const stateId = state.id || state.abbr;
    if (state.isFederalDistrict) {
      if (!stateId || !state.stateWinner || Number(state.electorCount) !== 3) {
        throw new Error('District of Columbia needs three electors and a statewide winner');
      }
      perState[stateId] = { stateId, allocation: { [state.stateWinner]: 3 }, districtCount: 0, atLargeElectors: 3 };
    } else {
      perState[stateId] = allocateDistrictElectors({
        stateId,
        stateWinner: state.stateWinner,
        districts: districtsByState[stateId] || [],
        electorCount: state.electorCount,
      });
    }
    for (const [party, count] of Object.entries(perState[stateId].allocation)) {
      nationalElectors[party] = (nationalElectors[party] || 0) + count;
    }
  }
  return {
    perState,
    nationalElectors,
    rule: 'two-at-large-plus-each-congressional-district',
    legacyMaineNebraskaExceptionsApplied: false,
  };
}

/**
 * Project scheduled legislature races. State generic shares can be applied
 * identically to every seat; district-baseline inputs remain available to
 * scenarios that explicitly provide that data. Held-over seats are included
 * so chamber control is computed over the full chamber, not only its races.
 */
/** @param {any} input */
export function projectStateLegislatureChamber(input) {
  const {
    stateId,
    chamberId,
    genericMargin,
    stateGenericVoteShares = null,
    heldOverSeatsByParty = {},
    nationalBaselineMargin = 0,
    stateBaselineVoteShares = null,
    currentStateVoteShares = null,
    races = [],
    tieParty = 'dem',
  } = input;
  if (!stateId || !chamberId) throw new Error('Legislature projection needs stateId and chamberId');
  const projectedRaces = (races || []).map((race) => {
    if (!race?.id) throw new Error(`Legislature race in ${stateId}/${chamberId} needs a stable id`);
    if (stateGenericVoteShares) {
      /** @type {[string, number][]} */
      const normalizedShares = Object.entries(stateGenericVoteShares)
        .map(([party, share]) => [party, Number(share)]);
      const voteShares = Object.fromEntries(normalizedShares
        .filter(([, share]) => Number.isFinite(share) && share >= 0));
      const totalShare = Object.values(voteShares).reduce((sum, share) => sum + share, 0);
      if (!totalShare) throw new Error(`State generic ballot in ${stateId} has no valid party vote shares`);
      const topShare = Math.max(...Object.values(voteShares));
      const topParties = Object.entries(voteShares).filter(([, share]) => share === topShare).map(([party]) => party);
      const winner = topParties.includes(tieParty) ? tieParty : topParties.sort()[0];
      return { id: race.id, winner, voteShares, projectionModel: 'state-generic-ballot-exact' };
    }
    if (race.baselineVoteShares && stateBaselineVoteShares && currentStateVoteShares) {
      const projected = applyStateGenericBallotSwing({
        raceBaselineShares: race.baselineVoteShares,
        stateBaselineShares: stateBaselineVoteShares,
        currentStateShares: currentStateVoteShares,
      });
      if (!projected.winner) throw new Error(`Legislature race ${stateId}/${race.id} has no projected vote share`);
      return { id: race.id, winner: projected.winner, voteShares: projected.voteShares };
    }
    if (!Number.isFinite(Number(race.baselineMargin))) {
      throw new Error(`Legislature race in ${stateId}/${chamberId} needs baselineMargin or baselineVoteShares`);
    }
    const projected = projectTwoPartyDistrict({
      stateGenericMargin: genericMargin,
      districtBaselineMargin: race.baselineMargin,
      nationalBaselineMargin,
      tieParty,
    });
    return { id: race.id, winner: projected.winner, margin: projected.margin };
  });
  const seats = Object.fromEntries(Object.entries(heldOverSeatsByParty)
    .map(([party, count]) => [party, Math.max(0, Math.floor(Number(count) || 0))]));
  for (const race of projectedRaces) seats[race.winner] = (seats[race.winner] || 0) + 1;
  const heldOverSeatCount = Object.values(heldOverSeatsByParty)
    .reduce((sum, count) => sum + Math.max(0, Math.floor(Number(count) || 0)), 0);
  const contestedSeatCount = projectedRaces.length;
  const totalSeats = heldOverSeatCount + contestedSeatCount;
  const majority = Math.floor(totalSeats / 2) + 1;
  const controlCandidate = Object.entries(seats).sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))[0];
  const control = controlCandidate?.[1] >= majority ? controlCandidate[0] : 'no-majority';
  return { stateId, chamberId, races: projectedRaces, seats, totalSeats, heldOverSeatCount, contestedSeatCount, majority, control };
}

const sumPartySeatCounts = (seatCounts = {}) => Object.values(seatCounts || {})
  .reduce((sum, count) => sum + Math.max(0, Math.floor(Number(count) || 0)), 0);

/** Stable key shared by the schedule, snapshot adapter, and seat ledger. */
export function stateLegislatureChamberKey(stateId, chamberId) {
  if (!stateId || !chamberId) throw new Error('A state and chamber ID are required for the legislature seat key');
  return `${stateId}:${chamberId}`;
}

/** Resolve a chamber whose scheduled seats each receive the exact same state generic ballot. */
/** @param {any} input */
export function projectStateLegislatureGenericChamber(input = {}) {
  const {
    stateId,
    chamberId,
    totalSeats,
    seatsUpCount,
    stateGenericVoteShares = {},
    heldOverSeatsByParty = {},
    tieParty = 'dem',
    officiallyNonpartisan = false,
  } = input;
  const chamberSize = Number(totalSeats);
  const contestCount = Number(seatsUpCount);
  if (!stateId || !chamberId || !Number.isInteger(chamberSize) || chamberSize < 1 ||
      !Number.isInteger(contestCount) || contestCount < 0 || contestCount > chamberSize) {
    throw new Error('State legislature projection needs a valid state, chamber, and seats-up schedule');
  }
  const heldOverCount = sumPartySeatCounts(heldOverSeatsByParty);
  if (heldOverCount !== chamberSize - contestCount) {
    throw new Error(`Held-over seat counts for ${stateId}/${chamberId} must total ${chamberSize - contestCount}`);
  }

  let contestWinner = null;
  let voteShares = {};
  if (contestCount > 0) {
    /** @type {[string, number][]} */
    const normalizedShares = Object.entries(stateGenericVoteShares)
      .map(([party, share]) => [party, Number(share)]);
    voteShares = Object.fromEntries(normalizedShares
      .filter(([, share]) => Number.isFinite(share) && share >= 0));
    const totalShare = Object.values(voteShares).reduce((sum, share) => sum + share, 0);
    if (totalShare <= 0) throw new Error(`State generic ballot in ${stateId} has no valid party vote shares`);
    const highestShare = Math.max(...Object.values(voteShares));
    const tiedParties = Object.entries(voteShares)
      .filter(([, share]) => share === highestShare)
      .map(([party]) => party);
    contestWinner = tiedParties.includes(tieParty) ? tieParty : tiedParties.sort()[0];
  }

  const seatsByParty = Object.fromEntries(Object.entries(heldOverSeatsByParty)
    .map(([party, count]) => [party, Math.max(0, Math.floor(Number(count) || 0))]));
  if (contestWinner) seatsByParty[contestWinner] = (seatsByParty[contestWinner] || 0) + contestCount;
  const majority = Math.floor(chamberSize / 2) + 1;
  const controlCandidate = Object.entries(seatsByParty).sort((a, b) =>
    (b[1] - a[1]) || a[0].localeCompare(b[0]))[0];
  const control = controlCandidate?.[1] >= majority ? controlCandidate[0] : 'no-majority';
  return {
    stateId,
    chamberId,
    totalSeats: chamberSize,
    seatsUpCount: contestCount,
    seatsByParty,
    majority,
    control,
    contestWinner,
    contestVoteShares: voteShares,
    heldOverSeatCount: heldOverCount,
    projectionModel: officiallyNonpartisan
      ? 'nonpartisan-ballot-unofficial-party-generic-projection'
      : 'exact-state-generic-ballot-no-candidate-quality',
    candidateQualityApplied: false,
    districtLeanApplied: false,
  };
}

/** Project every state's scheduled chamber contests and summarize trifectas. */
/** @param {any} input */
export function projectStateLegislatureElection(input = {}) {
  const {
    schedule = [],
    stateGenericVoteSharesByState = {},
    stateGenericMarginByState = {},
    heldOverSeatsByChamber = {},
    governorPartyByState = {},
    tieParty = 'dem',
  } = input;
  const chamberResults = {};
  const stateResults = (schedule || []).map((state) => {
    if (!state?.stateId || !Array.isArray(state.chambers)) {
      throw new Error('State legislature schedule entries need state IDs and chamber records');
    }
    const chambers = state.chambers.map((chamber) => {
      const key = stateLegislatureChamberKey(state.stateId, chamber.id);
      const heldOverSeats = heldOverSeatsByChamber[key] ||
        (Number(chamber.seatsUpCount2028) === Number(chamber.totalSeatCount) ? {} : null);
      if (!heldOverSeats) throw new Error(`Missing held-over seat counts for ${key}`);
      let shares = stateGenericVoteSharesByState[state.stateId];
      const rawMargin = stateGenericMarginByState[state.stateId];
      if (!shares && Number(chamber.seatsUpCount2028) > 0 && rawMargin !== null &&
          rawMargin !== undefined && rawMargin !== '' && Number.isFinite(Number(rawMargin))) {
        const margin = Math.max(-100, Math.min(100, Number(rawMargin)));
        shares = { dem: 50 + margin / 2, rep: 50 - margin / 2 };
      }
      const result = projectStateLegislatureGenericChamber({
        stateId: state.stateId,
        chamberId: chamber.id,
        totalSeats: chamber.totalSeatCount,
        seatsUpCount: chamber.seatsUpCount2028,
        stateGenericVoteShares: shares || {},
        heldOverSeatsByParty: heldOverSeats,
        tieParty,
        officiallyNonpartisan: String(state.electionMode || '').includes('nonpartisan'),
      });
      chamberResults[key] = result;
      return result;
    });
    return {
      stateId: state.stateId,
      governorParty: governorPartyByState[state.stateId] || null,
      trifectaEligible: !String(state.electionMode || '').includes('nonpartisan'),
      chambers,
    };
  });
  const trifectasByState = summarizeStateTrifectas(stateResults);
  return { stateResults, chamberResults, trifectasByState };
}

/** Summarize chamber control and trifecta state without assuming missing chambers. */
export function summarizeStateTrifectas(stateResults = []) {
  const byState = {};
  for (const state of stateResults || []) {
    const chamberControls = (state.chambers || []).map((chamber) => chamber.control);
    const complete = chamberControls.length > 0 && chamberControls.every((party) => party && party !== 'no-majority');
    const trifecta = state.trifectaEligible === false
      ? 'not-applicable'
      : !complete || !state.governorParty
        ? 'unknown'
        : chamberControls.every((party) => party === state.governorParty)
        ? state.governorParty
        : 'divided';
    byState[state.stateId] = { trifecta, chamberControls, governorParty: state.governorParty || null };
  }
  return byState;
}

/** Fail early if the adapter's 2028 race-year/rule metadata is incomplete. */
export function validateLegislatureElectionMetadata(states, expectedStateIds) {
  const errors = [];
  const seen = new Set();
  for (const record of states || []) {
    if (!record?.stateId || seen.has(record.stateId)) errors.push(`Missing or duplicate legislature state: ${record?.stateId}`);
    seen.add(record?.stateId);
    if (!Array.isArray(record.chambers) || !record.chambers.length) errors.push(`No chamber records for ${record.stateId}`);
    for (const chamber of record.chambers || []) {
      if (!chamber.id || !['lower', 'upper', 'unicameral'].includes(chamber.type)) errors.push(`Invalid chamber record in ${record.stateId}`);
      if (!Array.isArray(chamber.races2028)) errors.push(`Missing 2028 race list for ${record.stateId}/${chamber.id}`);
      if (!chamber.electionRuleId || !chamber.termLengthYears || !chamber.electionCycleRule) {
        errors.push(`Missing state-specific election rule metadata for ${record.stateId}/${chamber.id}`);
      }
      if (!Number.isInteger(Number(chamber.totalSeatCount)) || Number(chamber.totalSeatCount) < 1) {
        errors.push(`Missing total seat count for ${record.stateId}/${chamber.id}`);
      }
      if (!Number.isInteger(Number(chamber.seatsUpCount2028)) || Number(chamber.seatsUpCount2028) < 0) {
        errors.push(`Missing 2028 seats-up count for ${record.stateId}/${chamber.id}`);
      } else if (Array.isArray(chamber.races2028) && chamber.races2028.length !== Number(chamber.seatsUpCount2028)) {
        errors.push(`2028 race list does not match seats-up count for ${record.stateId}/${chamber.id}`);
      }
      if (!chamber.seatAllocationRule || !chamber.districtPlanId || !chamber.sourceRecord) {
        errors.push(`Missing seat/district rule or source record for ${record.stateId}/${chamber.id}`);
      }
      for (const race of chamber.races2028 || []) {
        if (!race.id || !Number.isFinite(Number(race.baselineMargin)) && !race.baselineVoteShares) {
          errors.push(`Race ${race?.id || '(missing id)'} lacks 2026 baseline lean in ${record.stateId}/${chamber.id}`);
        }
      }
    }
  }
  for (const id of expectedStateIds || []) if (!seen.has(id)) errors.push(`Missing legislature metadata for ${id}`);
  return { valid: errors.length === 0, errors, stateCount: seen.size };
}

/** Confirm all 435 districts have real 2026 results for lean calculations. */
export function validateHouseDistrictLeanData({
  districts = [],
  expectedDistrictCount = 435,
  expectedStateCount = expectedDistrictCount === 435 ? 50 : null,
  validStateIds = [],
  expectedDistrictCountsByState = null,
} = {}) {
  const errors = [];
  const ids = new Set();
  const stateDistrictNumbers = new Set();
  const countsByState = {};
  const districtNumbersByState = {};
  for (const district of districts || []) {
    if (!district?.id || ids.has(district.id)) errors.push(`Missing or duplicate House district id: ${district?.id}`);
    ids.add(district?.id);
    if (!district?.stateId) errors.push(`House district ${district?.id || '(missing id)'} needs a state ID`);
    if (validStateIds.length && !validStateIds.includes(district.stateId)) errors.push(`Unknown state on district ${district.id}`);
    countsByState[district.stateId] = (countsByState[district.stateId] || 0) + 1;
    const districtNumber = Number(district.districtNumber);
    if (!Number.isInteger(districtNumber) || districtNumber < 1) {
      errors.push(`House district ${district.id} needs a positive district number`);
    } else {
      const stateDistrictKey = `${district.stateId}:${districtNumber}`;
      if (stateDistrictNumbers.has(stateDistrictKey)) errors.push(`Duplicate district number ${stateDistrictKey}`);
      stateDistrictNumbers.add(stateDistrictKey);
      (districtNumbersByState[district.stateId] ||= []).push(districtNumber);
    }
    if (!finiteSourceNumber(district.baselineMargin) || !finiteSourceNumber(district.nationalBaselineMargin)) {
      errors.push(`District ${district.id} is missing its 2026 district result or national generic-ballot baseline`);
    } else if (Math.abs(Number(district.baselineMargin)) > 100 || Math.abs(Number(district.nationalBaselineMargin)) > 100) {
      errors.push(`District ${district.id} result and generic-ballot margins must be between -100 and 100`);
    }
    if (Number(district.electionYear) !== 2026 || !district.resultSource ||
        Number(district.genericBallotYear) !== 2026 || !district.genericBallotSource) {
      errors.push(`District ${district.id} needs 2026 election and 2026 generic-ballot source metadata`);
    }
    if (district.baselineStatus === 'proxy' || district.baselineStatus === 'historical-proxy') {
      errors.push(`District ${district.id} uses a historical proxy instead of a 2026 result`);
    }
    if (!district.baselineStatus || district.baselineStatus === 'unverified') {
      errors.push(`District ${district.id} needs a source-backed result status`);
    }
    const baselineLean = Number(district.baselineMargin) - Number(district.nationalBaselineMargin);
    if (finiteSourceNumber(district.districtLeanMargin) &&
        Math.abs(Number(district.districtLeanMargin) - baselineLean) > 0.05) {
      errors.push(`District ${district.id} lean does not equal its 2026 result minus the national generic baseline`);
    }
  }
  if (ids.size !== expectedDistrictCount) errors.push(`Expected ${expectedDistrictCount} House districts, found ${ids.size}`);
  if (expectedStateCount !== null && Object.keys(countsByState).length !== Number(expectedStateCount)) {
    errors.push(`Expected House district coverage for ${expectedStateCount} states, found ${Object.keys(countsByState).length}`);
  }
  for (const [stateId, expectedCount] of Object.entries(expectedDistrictCountsByState || {})) {
    if (countsByState[stateId] !== Number(expectedCount)) {
      errors.push(`Expected ${expectedCount} House districts in ${stateId}, found ${countsByState[stateId] || 0}`);
    }
  }
  for (const [stateId, numbers] of Object.entries(districtNumbersByState)) {
    const sorted = [...numbers].sort((a, b) => a - b);
    if (sorted.some((number, index) => number !== index + 1)) {
      errors.push(`House district numbering in ${stateId} must run consecutively from 1 through ${sorted.length}`);
    }
  }
  return { valid: errors.length === 0, errors, districtCount: ids.size, countsByState };
}

const finiteSourceNumber = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const marginFromTwoPartyVotes = (demVotes, repVotes) => {
  if (!finiteSourceNumber(demVotes) || !finiteSourceNumber(repVotes) || Number(demVotes) < 0 || Number(repVotes) < 0) return null;
  const totalVotes = Number(demVotes) + Number(repVotes);
  return totalVotes > 0 ? 100 * (Number(demVotes) - Number(repVotes)) / totalVotes : null;
};

function normalizeVoteShareVector(value, label, { rawVotes = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a party-to-value object`);
  }
  /** @type {[string, number][]} */
  const entries = Object.entries(value).map(([party, amount]) => [party, Number(amount)]);
  if (!entries.length || entries.some(([party, amount]) => !party || !Number.isFinite(amount) || amount < 0)) {
    throw new Error(`${label} must contain nonnegative finite party values`);
  }
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
  if (!(total > 0)) throw new Error(`${label} must have a positive total`);
  if (!rawVotes && !((total >= 0.98 && total <= 1.02) || (total >= 98 && total <= 102))) {
    throw new Error(`${label} shares must sum to approximately 1 or 100`);
  }
  return Object.fromEntries(entries.map(([party, amount]) => [party, amount / total * 100]));
}

function twoPartyMarginFromShares(shares) {
  if (!shares || !finiteSourceNumber(shares.dem) || !finiteSourceNumber(shares.rep)) return null;
  return Number(shares.dem) - Number(shares.rep);
}

/** Normalize a real 2026 district result against an explicitly sourced 2026 national generic ballot. */
export function prepareHouseDistrictBaselineCatalog(source, {
  expectedDistrictCount = 435,
  validStateIds = [],
  expectedDistrictCountsByState = null,
} = {}) {
  const sourceRows = Array.isArray(source) ? source : source?.districts;
  if (!Array.isArray(sourceRows)) {
    return {
      schemaVersion: 1,
      available: false,
      districts: [],
      districtCount: 0,
      errors: ['House district source must provide a districts array'],
    };
  }

  const rootGenericMargin = source?.genericBallotMarginDMinusR ??
    source?.nationalGenericMarginDMinusR ?? source?.genericBallot?.marginDMinusR;
  const rootGenericSource = source?.genericBallotSource ?? source?.genericBallot?.sourceUrl ?? source?.genericBallot?.source;
  const rootGenericYear = source?.genericBallotYear ?? source?.genericBallot?.year ?? source?.genericBallot?.electionYear;
  const sourceErrors = [];
  let nationalGenericVoteShares = null;
  const rawNationalShares = source?.nationalGenericVoteShares ?? source?.genericBallot?.voteShares;
  if (rawNationalShares !== null && rawNationalShares !== undefined) {
    try {
      nationalGenericVoteShares = normalizeVoteShareVector(rawNationalShares, '2026 national generic-ballot shares');
    } catch (error) {
      sourceErrors.push(error instanceof Error ? error.message : String(error));
    }
  }
  const normalizedGenericMargin = finiteSourceNumber(rootGenericMargin)
    ? Number(rootGenericMargin)
    : twoPartyMarginFromShares(nationalGenericVoteShares);
  const vectorGenericMargin = twoPartyMarginFromShares(nationalGenericVoteShares);
  if (finiteSourceNumber(rootGenericMargin) && vectorGenericMargin !== null &&
      Math.abs(Number(rootGenericMargin) - vectorGenericMargin) > 0.05) {
    sourceErrors.push('2026 generic-ballot margin disagrees with its party-share vector');
  }
  const normalizedDistricts = sourceRows.map((district) => {
    const demVotes = district?.demVotes ?? district?.democraticVotes;
    const repVotes = district?.repVotes ?? district?.republicanVotes;
    const rawDistrictShares = district?.baselineVoteShares ?? district?.voteSharesByParty;
    let baselineVoteShares = null;
    if (rawDistrictShares !== null && rawDistrictShares !== undefined) {
      try {
        baselineVoteShares = normalizeVoteShareVector(rawDistrictShares, `District ${district?.id} baseline vote shares`);
      } catch (error) {
        sourceErrors.push(error instanceof Error ? error.message : String(error));
      }
    } else if (district?.partyVotes || district?.votesByParty) {
      try {
        baselineVoteShares = normalizeVoteShareVector(
          district.partyVotes || district.votesByParty,
          `District ${district?.id} party votes`,
          { rawVotes: true },
        );
      } catch (error) {
        sourceErrors.push(error instanceof Error ? error.message : String(error));
      }
    } else if (finiteSourceNumber(demVotes) && finiteSourceNumber(repVotes) && Number(demVotes) + Number(repVotes) > 0) {
      baselineVoteShares = normalizeVoteShareVector({ dem: Number(demVotes), rep: Number(repVotes) }, `District ${district?.id} D/R votes`, { rawVotes: true });
    }
    const suppliedResultMargin = district?.resultMarginDMinusR ?? district?.baselineMargin;
    const resultMargin = finiteSourceNumber(suppliedResultMargin)
      ? Number(suppliedResultMargin)
      : twoPartyMarginFromShares(baselineVoteShares) ?? marginFromTwoPartyVotes(demVotes, repVotes);
    const vectorResultMargin = twoPartyMarginFromShares(baselineVoteShares);
    if (finiteSourceNumber(suppliedResultMargin) && vectorResultMargin !== null &&
        Math.abs(Number(suppliedResultMargin) - vectorResultMargin) > 0.05) {
      sourceErrors.push(`District ${district?.id} result margin disagrees with its party vote shares`);
    }
    const genericMarginValue = district?.nationalGenericMarginDMinusR ??
      district?.nationalBaselineMargin ?? normalizedGenericMargin;
    const nationalBaselineMargin = finiteSourceNumber(genericMarginValue) ? Number(genericMarginValue) : null;
    if (finiteSourceNumber(rootGenericMargin) && finiteSourceNumber(genericMarginValue) &&
        Math.abs(Number(rootGenericMargin) - Number(genericMarginValue)) > 0.05) {
      sourceErrors.push(`District ${district?.id} generic margin disagrees with the source-level generic margin`);
    }
    const vectorDistrictGenericMargin = twoPartyMarginFromShares(nationalGenericVoteShares);
    if (finiteSourceNumber(genericMarginValue) && vectorDistrictGenericMargin !== null &&
        Math.abs(Number(genericMarginValue) - vectorDistrictGenericMargin) > 0.05) {
      sourceErrors.push(`District ${district?.id} generic margin disagrees with the national generic share vector`);
    }
    const resultSource = district?.resultSource ?? district?.resultSourceUrl ?? district?.sourceUrl ?? '';
    const genericBallotSource = district?.genericBallotSource ?? rootGenericSource ?? '';
    const genericBallotYear = Number(district?.genericBallotYear ?? district?.nationalGenericBallotYear ?? rootGenericYear);
    const suppliedLean = district?.districtLeanDMinusR ?? district?.districtLeanMargin;
    const districtLeanMargin = finiteSourceNumber(suppliedLean)
      ? Number(suppliedLean)
      : resultMargin !== null && nationalBaselineMargin !== null
        ? resultMargin - nationalBaselineMargin
        : null;
    return {
      id: String(district?.id ?? '').trim(),
      stateId: String(district?.stateId ?? district?.stateAbbr ?? '').trim(),
      districtNumber: Number(district?.districtNumber),
      electionYear: Number(district?.electionYear ?? district?.sourceYear ?? source?.electionYear),
      baselineMargin: resultMargin,
      nationalBaselineMargin,
      districtLeanMargin,
      baselineVoteShares,
      resultSource: String(resultSource).trim(),
      genericBallotSource: String(genericBallotSource).trim(),
      genericBallotYear,
      baselineStatus: district?.baselineStatus || district?.certificationStatus || 'unverified',
      certificationStatus: district?.certificationStatus || null,
      reportingPercent: finiteSourceNumber(district?.reportingPercent) ? Number(district.reportingPercent) : null,
    };
  });

  const validation = validateHouseDistrictLeanData({
    districts: normalizedDistricts,
    expectedDistrictCount,
    expectedStateCount: Object.keys(expectedDistrictCountsByState || {}).length ||
      (expectedDistrictCount === 435 ? 50 : null),
    validStateIds,
    expectedDistrictCountsByState,
  });
  validation.errors.push(...sourceErrors);
  const nationalMargins = normalizedDistricts
    .map((district) => district.nationalBaselineMargin)
    .filter((margin) => Number.isFinite(margin));
  const referenceNationalMargin = nationalMargins[0];
  if (nationalMargins.some((margin) => Math.abs(margin - referenceNationalMargin) > 0.05)) {
    validation.errors.push('House district rows do not share one consistent 2026 national generic-ballot baseline');
  }
  const resultSources = new Set(normalizedDistricts.map((district) => district.resultSource).filter(Boolean));
  const genericSources = new Set(normalizedDistricts.map((district) => district.genericBallotSource).filter(Boolean));
  const fourPartyIds = ['dem', 'rep', 'grn', 'lib'];
  const multiPartyErrors = [];
  if (!nationalGenericVoteShares || fourPartyIds.some((party) => !finiteSourceNumber(nationalGenericVoteShares[party])) ||
      Object.keys(nationalGenericVoteShares || {}).length !== fourPartyIds.length) {
    multiPartyErrors.push('A four-party national generic-ballot share vector for dem, rep, grn, and lib is required');
  }
  for (const district of normalizedDistricts) {
    if (!district.baselineVoteShares || fourPartyIds.some((party) => !finiteSourceNumber(district.baselineVoteShares[party])) ||
        Object.keys(district.baselineVoteShares || {}).length !== fourPartyIds.length) {
      multiPartyErrors.push(`Four-party 2026 vote shares are missing for ${district.id || '(missing district id)'}`);
    }
  }
  return {
    schemaVersion: 1,
    available: validation.errors.length === 0,
    districts: validation.errors.length === 0 ? normalizedDistricts : [],
    districtCount: validation.districtCount,
    stateCount: Object.keys(validation.countsByState).length,
    countsByState: validation.countsByState,
    expectedDistrictCountsByState: expectedDistrictCountsByState || null,
    nationalGenericMarginDMinusR: referenceNationalMargin ?? null,
    nationalGenericVoteShares,
    multiPartyAvailable: multiPartyErrors.length === 0,
    multiPartyErrors,
    resultSources: [...resultSources].sort(),
    genericBallotSources: [...genericSources].sort(),
    errors: validation.errors,
  };
}

/** Project all 435 House races from current state generic margins and the validated 2026 lean catalog. */
/** @param {any} input */
export function projectHouseDistrictOutcomes(input = {}) {
  const {
    baselineCatalog,
    stateGenericMarginByState = {},
    expectedDistrictCount = 435,
    tieParty = 'dem',
  } = input;
  if (!baselineCatalog?.available || !Array.isArray(baselineCatalog.districts)) {
    throw new Error('House district projection requires a complete validated 2026 baseline catalog');
  }
  if (!['dem', 'rep'].includes(tieParty)) throw new Error('House district tieParty must be dem or rep');
  const validation = validateHouseDistrictLeanData({
    districts: baselineCatalog.districts,
    expectedDistrictCount,
    expectedStateCount: 50,
    validStateIds: Object.keys(baselineCatalog.expectedDistrictCountsByState || {}),
    expectedDistrictCountsByState: baselineCatalog.expectedDistrictCountsByState,
  });
  if (!validation.valid) throw new Error(`House district baseline catalog is invalid: ${validation.errors.join('; ')}`);

  const races = baselineCatalog.districts.map((district) => {
    const rawStateMargin = stateGenericMarginByState instanceof Map
      ? stateGenericMarginByState.get(district.stateId)
      : stateGenericMarginByState?.[district.stateId];
    if (!finiteSourceNumber(rawStateMargin)) {
      throw new Error(`Missing current state generic-ballot margin for House district ${district.id}`);
    }
    const projected = projectTwoPartyDistrict({
      stateGenericMargin: Number(rawStateMargin),
      districtBaselineMargin: district.baselineMargin,
      nationalBaselineMargin: district.nationalBaselineMargin,
      tieParty,
    });
    return {
      id: district.id,
      stateId: district.stateId,
      districtNumber: district.districtNumber,
      marginDemVsRep: projected.margin,
      projectedWinner: projected.winner,
      districtLeanDemVsRep: district.districtLeanMargin,
      electionYear: district.electionYear,
      resultSource: district.resultSource,
      genericBallotSource: district.genericBallotSource,
      resultStatus: district.baselineStatus,
    };
  });
  const seatsByParty = { dem: 0, rep: 0 };
  for (const race of races) seatsByParty[race.projectedWinner] += 1;
  return {
    projectionOnly: true,
    raceCount: races.length,
    seatsByParty,
    races,
  };
}

/** Project four-party House districts from 2026 party results and the national generic-ballot baseline. */
/** @param {any} input */
export function projectMultiPartyHouseDistrictOutcomes(input = {}) {
  const {
    baselineCatalog,
    currentStateVoteSharesByState = {},
    expectedDistrictCount = 435,
    tieOrder = ['dem', 'rep', 'grn', 'lib'],
  } = input;
  if (!baselineCatalog?.available || !Array.isArray(baselineCatalog.districts)) {
    throw new Error('Multi-party House projection requires a complete validated 2026 baseline catalog');
  }
  if (!baselineCatalog.multiPartyAvailable) {
    throw new Error(`Four-party House projection is unavailable: ${(baselineCatalog.multiPartyErrors || []).join('; ')}`);
  }
  const validation = validateHouseDistrictLeanData({
    districts: baselineCatalog.districts,
    expectedDistrictCount,
    expectedStateCount: 50,
    validStateIds: Object.keys(baselineCatalog.expectedDistrictCountsByState || {}),
    expectedDistrictCountsByState: baselineCatalog.expectedDistrictCountsByState,
  });
  if (!validation.valid) throw new Error(`House district baseline catalog is invalid: ${validation.errors.join('; ')}`);

  const expectedParties = ['dem', 'rep', 'grn', 'lib'];
  const nationalShares = baselineCatalog.nationalGenericVoteShares;
  if (!nationalShares || expectedParties.some((party) => !finiteSourceNumber(nationalShares[party])) ||
      Object.keys(nationalShares).length !== expectedParties.length) {
    throw new Error('Four-party House projection requires 2026 national generic shares for dem, rep, grn, and lib');
  }
  const normalizedNationalShares = normalizeVoteShareVector(nationalShares, '2026 national generic-ballot shares');
  const order = Array.isArray(tieOrder) ? tieOrder.filter((party) => expectedParties.includes(party)) : [];
  const races = baselineCatalog.districts.map((district) => {
    const districtShares = district.baselineVoteShares;
    const stateSharesInput = currentStateVoteSharesByState instanceof Map
      ? currentStateVoteSharesByState.get(district.stateId)
      : currentStateVoteSharesByState?.[district.stateId];
    if (!districtShares || expectedParties.some((party) => !finiteSourceNumber(districtShares[party])) ||
        Object.keys(districtShares).length !== expectedParties.length) {
      throw new Error(`Four-party baseline vote shares are missing for House district ${district.id}`);
    }
    if (!stateSharesInput) throw new Error(`Missing current four-party generic ballot for ${district.stateId}`);
    const stateShares = normalizeVoteShareVector(stateSharesInput, `Current ${district.stateId} generic-ballot shares`);
    if (expectedParties.some((party) => !finiteSourceNumber(stateShares[party])) ||
        Object.keys(stateShares).length !== expectedParties.length) {
      throw new Error(`Current ${district.stateId} generic ballot must include exactly dem, rep, grn, and lib`);
    }
    const projection = applyStateGenericBallotSwing({
      raceBaselineShares: districtShares,
      stateBaselineShares: normalizedNationalShares,
      currentStateShares: stateShares,
    });
    const topShare = Math.max(...Object.values(projection.voteShares));
    const tiedParties = Object.entries(projection.voteShares)
      .filter(([, share]) => Math.abs(share - topShare) < 1e-12)
      .map(([party]) => party);
    const winner = tiedParties.sort((a, b) =>
      (order.indexOf(a) < 0 ? Number.MAX_SAFE_INTEGER : order.indexOf(a)) -
      (order.indexOf(b) < 0 ? Number.MAX_SAFE_INTEGER : order.indexOf(b)) || a.localeCompare(b))[0];
    return {
      id: district.id,
      stateId: district.stateId,
      districtNumber: district.districtNumber,
      voteShares: projection.voteShares,
      projectedWinner: winner,
      electionYear: district.electionYear,
      resultSource: district.resultSource,
      genericBallotSource: district.genericBallotSource,
      resultStatus: district.baselineStatus,
    };
  });
  const seatsByParty = Object.fromEntries(expectedParties.map((party) => [party, 0]));
  for (const race of races) seatsByParty[race.projectedWinner] += 1;
  return {
    projectionOnly: true,
    partyMode: 'four-party',
    raceCount: races.length,
    seatsByParty,
    races,
  };
}
