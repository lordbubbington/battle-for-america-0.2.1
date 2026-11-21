/**
 * Version 2 ballot ledger. Callers supply disjoint, stable modeled cohorts and
 * actual recorded ballot groups. No voter preference or district is invented.
 */
export const COHORT_BALLOT_SCHEMA_VERSION = 2;
const text = (v) => typeof v === 'string' && v.trim().length > 0;
const amount = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const keyOf = (state, cohort) => JSON.stringify([state, cohort]);
const batchId = (campaign, state, week, checkpoint) => [campaign, state, String(week), checkpoint].map(encodeURIComponent).join(':');
const sumBallots = (ballots) => ballots.reduce((sum, ballot) => sum + ballot.count, 0);
const copyBallots = (ballots) => ballots.map((ballot) => ({ ranking: [...ballot.ranking], count: ballot.count, rankingComplete: ballot.rankingComplete }));

/** Convert an explicitly supplied uncast-cohort snapshot into ballot groups. */
export function ballotsFromCohortSnapshot({ eligibleVolume, support, turnout, rankingsByParty = null } = {}) {
  if (!amount(eligibleVolume) || !support || typeof support !== 'object' || Array.isArray(support)
    || !Object.keys(support).length || !turnout || typeof turnout !== 'object') throw new Error('Eligible volume, cohort support, and turnout are required');
  const entries = Object.entries(support);
  if (entries.some(([party, share]) => !text(party) || !amount(share) || share > 100 || !amount(turnout[party]) || turnout[party] > 1)
    || Math.abs(entries.reduce((sum, [, share]) => sum + share, 0) - 100) > 1e-7) throw new Error('Invalid cohort support or turnout');
  const result = [];
  for (const [party, share] of entries) {
    const count = eligibleVolume * share / 100 * turnout[party];
    if (!count) continue;
    const rankings = rankingsByParty?.[party];
    if (rankings === undefined || rankings === null) {
      result.push({ ranking: [party], count, rankingComplete: false });
      continue;
    }
    if (!Array.isArray(rankings) || !rankings.length || rankings.some((item) => !item || !amount(item.fraction)
      || !Array.isArray(item.ranking) || item.ranking[0] !== party || !item.ranking.every(text)
      || new Set(item.ranking).size !== item.ranking.length)
      || Math.abs(rankings.reduce((sum, item) => sum + item.fraction, 0) - 1) > 1e-9) throw new Error(`Invalid recorded rankings for ${party}`);
    rankings.forEach((item) => result.push({ ranking: [...item.ranking], count: count * item.fraction, rankingComplete: true }));
  }
  return result;
}

function validBallots(ballots) {
  return Array.isArray(ballots) && ballots.every((ballot) => ballot && amount(ballot.count)
    && Array.isArray(ballot.ranking) && ballot.ranking.length > 0
    && ballot.ranking.every(text) && new Set(ballot.ranking).size === ballot.ranking.length
    && typeof ballot.rankingComplete === 'boolean');
}

export function createCohortBallotLedger({ campaignId, cohorts, eligibleFromWeek = 1 } = {}) {
  if (!text(campaignId) || !Number.isInteger(eligibleFromWeek) || eligibleFromWeek < 1 || !Array.isArray(cohorts)) throw new Error('Campaign, disjoint cohorts, and first eligible week are required');
  const ids = new Set();
  const savedCohorts = cohorts.map((cohort) => {
    if (!cohort || !text(cohort.stateId) || !text(cohort.cohortId) || !amount(cohort.population)
      || !(cohort.districtId === null || cohort.districtId === undefined || text(cohort.districtId))) throw new Error('Invalid modeled cohort');
    const key = keyOf(cohort.stateId, cohort.cohortId);
    if (ids.has(key)) throw new Error('Duplicate cohort ID in state');
    ids.add(key);
    return { stateId: cohort.stateId, cohortId: cohort.cohortId, districtId: cohort.districtId || null, population: cohort.population };
  });
  return { schemaVersion: COHORT_BALLOT_SCHEMA_VERSION, campaignId, eligibleFromWeek, cohorts: savedCohorts, batches: [] };
}

/** Return state and cohort balances only if every saved batch is valid. */
export function inspectCohortBallotLedger(ledger) {
  const errors = [];
  let initial;
  try {
    if (!ledger || ledger.schemaVersion !== COHORT_BALLOT_SCHEMA_VERSION || !Array.isArray(ledger.batches)) throw new Error('Invalid ledger version or batches');
    initial = createCohortBallotLedger(ledger);
  } catch (error) {
    return { valid: false, errors: [error.message], balances: {} };
  }
  const cohorts = new Map(initial.cohorts.map((cohort) => [keyOf(cohort.stateId, cohort.cohortId), cohort]));
  const used = new Map();
  const ids = new Set();
  const lastWeek = new Map();
  for (const batch of ledger.batches) {
    if (!batch || !text(batch.stateId) || !Number.isInteger(batch.week) || batch.week < ledger.eligibleFromWeek
      || !text(batch.checkpoint) || batch.id !== batchId(ledger.campaignId, batch.stateId, batch.week, batch.checkpoint)
      || ids.has(batch.id) || !Array.isArray(batch.cohorts)) {
      errors.push('Invalid or duplicate cohort batch');
      continue;
    }
    ids.add(batch.id);
    if ((lastWeek.get(batch.stateId) || 0) > batch.week) errors.push(`Out-of-order batch in ${batch.stateId}`);
    lastWeek.set(batch.stateId, batch.week);
    const inBatch = new Set();
    for (const item of batch.cohorts) {
      const key = keyOf(batch.stateId, item?.cohortId);
      const cohort = cohorts.get(key);
      if (!cohort || inBatch.has(key) || !amount(item.eligibleVolume) || !validBallots(item.ballots)
        || (item.districtId || null) !== cohort.districtId) {
        errors.push(`Invalid cohort record in ${batch.id}`);
        continue;
      }
      inBatch.add(key);
      const previous = used.get(key) || 0;
      const cast = sumBallots(item.ballots);
      if (item.eligibleVolume > cohort.population - previous + 1e-7 || cast > item.eligibleVolume + 1e-7) errors.push(`Ballots exceed remaining cohort in ${batch.id}`);
      used.set(key, previous + cast);
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    balances: Object.fromEntries([...cohorts.entries()].map(([key, cohort]) => [key, { ...cohort, cast: used.get(key) || 0, remaining: cohort.population - (used.get(key) || 0) }])),
  };
}

export function recordCohortEarlyBallots({ ledger, stateId, week, checkpoint, castByCohort = [] } = {}) {
  const checked = inspectCohortBallotLedger(ledger);
  if (!checked.valid) throw new Error(checked.errors.join('; '));
  if (!text(stateId) || !Number.isInteger(week) || week < ledger.eligibleFromWeek || !text(checkpoint) || !Array.isArray(castByCohort)) throw new Error('Invalid early-ballot checkpoint');
  const id = batchId(ledger.campaignId, stateId, week, checkpoint);
  const existing = ledger.batches.find((batch) => batch.id === id);
  if (existing) return { ledger, batch: existing, created: false };
  const batch = {
    id, stateId, week, checkpoint,
    cohorts: castByCohort.map((item) => ({ cohortId: item.cohortId, districtId: item.districtId || null, eligibleVolume: item.eligibleVolume, ballots: validBallots(item.ballots) ? copyBallots(item.ballots) : item.ballots })),
  };
  const next = { ...ledger, batches: [...ledger.batches, batch] };
  const validation = inspectCohortBallotLedger(next);
  if (!validation.valid) throw new Error(validation.errors.join('; '));
  return { ledger: next, batch, created: true };
}

/** Combine saved early ballot groups and explicitly supplied uncast-cohort ballots. */
export function composeCohortElection({ ledger, stateId, electionDayByCohort } = {}) {
  const checked = inspectCohortBallotLedger(ledger);
  if (!checked.valid) throw new Error(checked.errors.join('; '));
  if (!text(stateId) || !Array.isArray(electionDayByCohort)) throw new Error('State and Election Day cohort ballots are required');
  const relevant = Object.values(checked.balances).filter((cohort) => cohort.stateId === stateId);
  if (!relevant.length) return { status: 'unavailable', reason: 'missing-state-cohorts' };
  const finalById = new Map();
  for (const item of electionDayByCohort) {
    if (!item || !text(item.cohortId) || finalById.has(item.cohortId) || !amount(item.eligibleVolume) || !validBallots(item.ballots)) throw new Error('Invalid Election Day cohort ballots');
    finalById.set(item.cohortId, item);
  }
  if (finalById.size !== relevant.length || relevant.some((cohort) => !finalById.has(cohort.cohortId))) return { status: 'unavailable', reason: 'missing-uncast-cohort-ballots' };
  const groups = [];
  for (const batch of ledger.batches.filter((item) => item.stateId === stateId)) {
    for (const cohort of batch.cohorts) for (const ballot of cohort.ballots) groups.push({ ...ballot, ranking: [...ballot.ranking], districtId: cohort.districtId, phase: 'early' });
  }
  for (const cohort of relevant) {
    const item = finalById.get(cohort.cohortId);
    if (item.eligibleVolume > cohort.remaining + 1e-7 || sumBallots(item.ballots) > item.eligibleVolume + 1e-7) throw new Error(`Election Day ballots exceed uncast cohort ${cohort.cohortId}`);
    for (const ballot of item.ballots) groups.push({ ...ballot, ranking: [...ballot.ranking], districtId: cohort.districtId, phase: 'election-day' });
  }
  const votes = {};
  const districts = {};
  let missingDistrict = false;
  for (const ballot of groups) {
    const party = ballot.ranking[0];
    votes[party] = (votes[party] || 0) + ballot.count;
    if (!ballot.districtId && ballot.count > 0) missingDistrict = true;
    if (ballot.districtId) {
      const district = districts[ballot.districtId] || (districts[ballot.districtId] = {});
      district[party] = (district[party] || 0) + ballot.count;
    }
  }
  return { status: 'available', stateId, votes, totalBallots: sumBallots(groups), ballotGroups: groups,
    districtResults: missingDistrict ? { status: 'unavailable', reason: 'missing-district-assignment' } : { status: 'available', votesByDistrict: districts } };
}

/** Tally only genuinely recorded rankings, with an explicit tie elimination order. */
export function tallyRecordedRankings(ballotGroups, candidateOrder) {
  if (!validBallots(ballotGroups) || !Array.isArray(candidateOrder) || !candidateOrder.length
    || !candidateOrder.every(text) || new Set(candidateOrder).size !== candidateOrder.length) return { status: 'unavailable', reason: 'invalid-ranked-ballots-or-candidates' };
  const missingPreferences = ballotGroups.some((ballot) => ballot.count > 0
    && (!ballot.rankingComplete || ballot.ranking.some((party) => !candidateOrder.includes(party))));
  if (missingPreferences) {
    return { status: 'unavailable', reason: 'missing-ranked-preferences' };
  }
  const active = [...candidateOrder];
  const rounds = [];
  while (active.length) {
    const votes = Object.fromEntries(active.map((party) => [party, 0]));
    let exhausted = 0;
    for (const ballot of ballotGroups) {
      const choice = ballot.ranking.find((party) => active.includes(party));
      if (choice) votes[choice] += ballot.count;
      else exhausted += ballot.count;
    }
    const continuing = Object.values(votes).reduce((sum, value) => sum + value, 0);
    if (!continuing) return { status: 'unavailable', reason: 'no-continuing-ballots', rounds };
    const winner = active.find((party) => votes[party] > continuing / 2);
    if (winner || active.length === 1) {
      rounds.push({ votes, exhausted, eliminated: null });
      return { status: 'available', winner: winner || active[0], rounds };
    }
    const eliminated = [...active].sort((a, b) => votes[a] - votes[b] || candidateOrder.indexOf(a) - candidateOrder.indexOf(b))[0];
    rounds.push({ votes, exhausted, eliminated });
    active.splice(active.indexOf(eliminated), 1);
  }
  return { status: 'unavailable', reason: 'no-candidates' };
}

/** Sum each state's first-choice ballots exactly once for the national vote. */
export function nationalPopularVote(stateTallies, expectedStateIds) {
  if (!Array.isArray(stateTallies) || !stateTallies.length || !Array.isArray(expectedStateIds) || !expectedStateIds.length
    || !expectedStateIds.every(text) || new Set(expectedStateIds).size !== expectedStateIds.length) return { status: 'unavailable', reason: 'missing-state-tallies-or-expected-states' };
  const seen = new Set();
  const votes = {};
  for (const state of stateTallies) {
    if (state?.status !== 'available' || !text(state.stateId) || seen.has(state.stateId)
      || !state.votes || typeof state.votes !== 'object' || Array.isArray(state.votes)
      || Object.entries(state.votes).some(([party, value]) => !text(party) || !amount(value))) {
      return { status: 'unavailable', reason: 'invalid-or-duplicate-state-tally' };
    }
    const stateTotal = Object.values(state.votes).reduce((sum, value) => sum + value, 0);
    if (!amount(state.totalBallots) || Math.abs(stateTotal - state.totalBallots) > Math.max(1, stateTotal) * 1e-9) return { status: 'unavailable', reason: 'state-total-mismatch' };
    seen.add(state.stateId);
    for (const [party, value] of Object.entries(state.votes)) votes[party] = (votes[party] || 0) + value;
  }
  if (seen.size !== expectedStateIds.length || expectedStateIds.some((stateId) => !seen.has(stateId))) return { status: 'unavailable', reason: 'incomplete-state-tallies' };
  const totalBallots = Object.values(votes).reduce((sum, value) => sum + value, 0);
  const shares = Object.fromEntries(Object.entries(votes).map(([party, value]) => [party, totalBallots ? value / totalBallots * 100 : 0]));
  return { status: 'available', votes, totalBallots, shares, statesIncluded: seen.size };
}

/** A saved result/call wins over any forecast draw or changed campaign state. */
export function resolveCohortScenario({ savedResult = null, ledger, stateId, electionDayByCohort } = {}) {
  if (savedResult !== null && savedResult !== undefined) {
    if (savedResult.status !== 'available' || savedResult.stateId !== stateId || !savedResult.votes
      || !amount(savedResult.totalBallots) || Object.values(savedResult.votes).some((value) => !amount(value))
      || Math.abs(Object.values(savedResult.votes).reduce((sum, value) => sum + value, 0) - savedResult.totalBallots) > Math.max(1, savedResult.totalBallots) * 1e-9) {
      return { status: 'unavailable', reason: 'invalid-saved-state-result' };
    }
    return { status: 'restored', result: structuredClone(savedResult) };
  }
  const result = composeCohortElection({ ledger, stateId, electionDayByCohort });
  return result.status === 'available' ? { status: 'computed', result } : result;
}

/** Supply consistent state/district inputs to the existing electoral-rule resolver. */
export function electionRuleInputs({ result, electoralRule, thirdMode, expectedDistrictIds = null, candidateOrder = null } = {}) {
  if (result?.status !== 'available' || !text(result.stateId) || !Array.isArray(result.ballotGroups)
    || !validBallots(result.ballotGroups) || !result.votes || typeof result.votes !== 'object'
    || !['standard', 'proportional', 'district'].includes(electoralRule) || !['fringe', 'surge'].includes(thirdMode)) {
    return { status: 'unavailable', reason: 'invalid-election-rule-input' };
  }
  const checkVotes = {};
  for (const item of result.ballotGroups) checkVotes[item.ranking[0]] = (checkVotes[item.ranking[0]] || 0) + item.count;
  if (!amount(result.totalBallots) || Math.abs(sumBallots(result.ballotGroups) - result.totalBallots) > Math.max(1, result.totalBallots) * 1e-9) {
    return { status: 'unavailable', reason: 'ballot-total-mismatch' };
  }
  if ([...new Set([...Object.keys(checkVotes), ...Object.keys(result.votes)])]
    .some((party) => !amount(result.votes[party] ?? 0) || Math.abs((checkVotes[party] || 0) - (result.votes[party] || 0)) > 1e-7)) {
    return { status: 'unavailable', reason: 'ballot-tally-mismatch' };
  }
  const tally = (groups) => {
    if (thirdMode === 'surge') return tallyRecordedRankings(groups, candidateOrder);
    const votes = {};
    for (const ballot of groups) votes[ballot.ranking[0]] = (votes[ballot.ranking[0]] || 0) + ballot.count;
    const order = Object.entries(votes).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (!order.length || order[0][1] <= 0) return { status: 'unavailable', reason: 'no-votes' };
    return { status: 'available', winner: order[1] && order[0][1] === order[1][1] ? null : order[0][0], votes };
  };
  const state = tally(result.ballotGroups);
  if (state.status !== 'available') return state;
  const needsDistricts = electoralRule === 'district' || (electoralRule === 'standard' && ['ME', 'NE'].includes(result.stateId));
  const districts = {};
  if (needsDistricts) {
    if (result.districtResults?.status !== 'available' || !Array.isArray(expectedDistrictIds) || !expectedDistrictIds.length
      || !expectedDistrictIds.every(text) || new Set(expectedDistrictIds).size !== expectedDistrictIds.length) {
      return { status: 'unavailable', reason: 'missing-district-ballots-or-schedule' };
    }
    const known = new Set(expectedDistrictIds);
    if (result.ballotGroups.some((item) => item.count > 0 && !known.has(item.districtId))) return { status: 'unavailable', reason: 'unrecognized-district-ballots' };
    for (const districtId of expectedDistrictIds) {
      const district = tally(result.ballotGroups.filter((item) => item.districtId === districtId));
      if (district.status !== 'available') return { status: 'unavailable', reason: 'missing-district-result', districtId };
      districts[districtId] = district;
    }
  }
  return { status: 'available', stateId: result.stateId, electoralRule, thirdMode, firstChoiceVotes: { ...result.votes }, state, districts };
}

/** Legacy aggregate votes cannot be assigned to cohorts after the fact. */
export function migrateEmptyAggregateLedger(ledger, cohorts) {
  if (!ledger || ledger.schemaVersion !== 1 || !Array.isArray(ledger.batches)) return { status: 'unavailable', reason: 'invalid-legacy-ledger' };
  if (ledger.batches.length) return { status: 'unavailable', reason: 'legacy-ballots-have-no-cohort-provenance' };
  return { status: 'available', ledger: createCohortBallotLedger({ campaignId: ledger.campaignId, eligibleFromWeek: ledger.eligibleFromWeek, cohorts }) };
}
