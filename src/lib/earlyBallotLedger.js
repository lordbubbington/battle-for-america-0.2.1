/** Pure provisional election-ballot contract. Volumes are modeled voter units. */
export const EARLY_BALLOT_SCHEMA_VERSION = 1;
export const MODELED_EARLY_VOTE_SCHEDULE = Object.freeze([
  Object.freeze({ weeksBeforeElection: 2, checkpoint: 'end-of-week', eligibleFraction: 1 / 6 }),
  Object.freeze({ weeksBeforeElection: 1, checkpoint: 'end-of-week', eligibleFraction: 1 / 6 }),
]);

const text = (v) => typeof v === 'string' && v.trim().length > 0;
const finiteNonnegative = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const totalOf = (values) => Object.values(values).reduce((sum, value) => sum + value, 0);
const close = (a, b) => Math.abs(a - b) <= Math.max(1, Math.abs(a), Math.abs(b)) * 1e-9;

function assertShares(shares) {
  if (!shares || typeof shares !== 'object' || Array.isArray(shares) || !Object.keys(shares).length) throw new Error('A party support snapshot is required');
  for (const [party, value] of Object.entries(shares)) {
    if (!text(party) || !finiteNonnegative(value) || value > 100) throw new Error('Support shares must be finite percentages');
  }
  if (!close(totalOf(shares), 100)) throw new Error('Support shares must sum to 100');
}

function assertTurnout(shares, turnout) {
  if (!turnout || typeof turnout !== 'object') throw new Error('Party turnout rates are required');
  for (const party of Object.keys(shares)) {
    const rate = turnout[party];
    if (!finiteNonnegative(rate) || rate > 1) throw new Error(`Turnout for ${party} must be a rate from 0 to 1`);
  }
}

function ballotVotes(eligibleVolume, support, turnout) {
  assertShares(support);
  assertTurnout(support, turnout);
  return Object.fromEntries(Object.entries(support).map(([party, share]) => [party, eligibleVolume * share / 100 * turnout[party]]));
}

function batchKey(campaignId, stateId, week, checkpoint) {
  return [campaignId, stateId, String(week), checkpoint].map(encodeURIComponent).join(':');
}

/** @param {{campaignId?: string, eligibleFromWeek?: number}} [options] */
export function createEarlyBallotLedger({ campaignId, eligibleFromWeek = 1 } = {}) {
  if (!text(campaignId) || !Number.isInteger(eligibleFromWeek) || eligibleFromWeek < 1) throw new Error('Ledger requires a campaign ID and first eligible week');
  return { schemaVersion: EARLY_BALLOT_SCHEMA_VERSION, campaignId, eligibleFromWeek, batches: [] };
}

/** Reject inconsistent or overfilled saved records before applying any more votes. */
export function validateEarlyBallotLedger(ledger) {
  const errors = [];
  if (!ledger || ledger.schemaVersion !== EARLY_BALLOT_SCHEMA_VERSION || !text(ledger.campaignId)
    || !Number.isInteger(ledger.eligibleFromWeek) || ledger.eligibleFromWeek < 1 || !Array.isArray(ledger.batches)) {
    return { valid: false, errors: ['Invalid early-ballot ledger header'] };
  }
  const ids = new Set();
  const states = new Map();
  for (const batch of ledger.batches) {
    if (!batch || !text(batch.stateId) || !Number.isInteger(batch.week) || batch.week < ledger.eligibleFromWeek || !text(batch.checkpoint)
      || batch.id !== batchKey(ledger.campaignId, batch.stateId, batch.week, batch.checkpoint)
      || ids.has(batch.id) || !finiteNonnegative(batch.electorate) || !finiteNonnegative(batch.eligibleBallotVolume)
      || !batch.votes || typeof batch.votes !== 'object' || Array.isArray(batch.votes)
      || Object.entries(batch.votes).some(([party, value]) => !text(party) || !finiteNonnegative(value))) {
      errors.push('Invalid or duplicate early-ballot batch');
      continue;
    }
    ids.add(batch.id);
    const sum = totalOf(batch.votes);
    if (!finiteNonnegative(batch.ballotCount) || !close(sum, batch.ballotCount) || sum > batch.eligibleBallotVolume + 1e-7) errors.push(`Invalid ballot count in ${batch.id}`);
    try {
      const expectedVotes = ballotVotes(batch.eligibleBallotVolume, batch.supportSnapshot, batch.turnoutSnapshot);
      const parties = new Set([...Object.keys(expectedVotes), ...Object.keys(batch.votes)]);
      if ([...parties].some((party) => !close(expectedVotes[party] || 0, batch.votes[party] || 0))) errors.push(`Ballots do not match saved source snapshots in ${batch.id}`);
    } catch {
      errors.push(`Missing or invalid source snapshots in ${batch.id}`);
    }
    const state = states.get(batch.stateId) || { electorate: batch.electorate, votes: 0 };
    if (!close(state.electorate, batch.electorate)) errors.push(`Electorate changed in ${batch.stateId}`);
    if (batch.eligibleBallotVolume > state.electorate - state.votes + 1e-7) errors.push(`Batch exceeds remaining electorate in ${batch.stateId}`);
    state.votes += sum;
    if (state.votes > state.electorate + 1e-7) errors.push(`Too many ballots in ${batch.stateId}`);
    states.set(batch.stateId, state);
  }
  return { valid: errors.length === 0, errors };
}

/** @param {{ledger?: any, stateId?: string, week?: number, checkpoint?: string, electorate?: number, eligibleBallotVolume?: number, support?: Record<string, number>, turnout?: Record<string, number>, ruleSnapshot?: any}} [options] */
export function recordEarlyBallots({ ledger, stateId, week, checkpoint, electorate, eligibleBallotVolume, support, turnout, ruleSnapshot } = {}) {
  const checked = validateEarlyBallotLedger(ledger);
  if (!checked.valid) throw new Error(checked.errors.join('; '));
  if (!text(stateId) || !Number.isInteger(week) || week < ledger.eligibleFromWeek || !text(checkpoint)
    || !finiteNonnegative(electorate) || !finiteNonnegative(eligibleBallotVolume)) throw new Error('Invalid early-ballot checkpoint');
  const id = batchKey(ledger.campaignId, stateId, week, checkpoint);
  const existing = ledger.batches.find((batch) => batch.id === id);
  if (existing) {
    if (!close(existing.electorate, electorate) || !close(existing.eligibleBallotVolume, eligibleBallotVolume)) throw new Error('Checkpoint was already committed with different volume');
    return { ledger, batch: existing, created: false };
  }
  const previous = ledger.batches.filter((batch) => batch.stateId === stateId);
  if (previous.some((batch) => !close(batch.electorate, electorate))) throw new Error('Electorate changed after early ballots were cast');
  if (previous.some((batch) => batch.week > week)) throw new Error('Cannot add a checkpoint before a committed later week');
  const remaining = electorate - previous.reduce((sum, batch) => sum + batch.ballotCount, 0);
  if (eligibleBallotVolume > remaining + 1e-7) throw new Error('Early ballot volume exceeds the uncast electorate');
  const votes = ballotVotes(eligibleBallotVolume, support, turnout);
  const batch = { id, stateId, week, checkpoint, electorate, eligibleBallotVolume, votes, ballotCount: totalOf(votes), supportSnapshot: { ...support }, turnoutSnapshot: { ...turnout } };
  if (ruleSnapshot) Object.assign(batch, { ruleSnapshot });
  return { ledger: { ...ledger, batches: [...ledger.batches, batch] }, batch, created: true };
}

/** Combine immutable early ballots with preferences and turnout of uncast voters. */
/** @param {{ledger?: any, stateId?: string, electorate?: number, uncastSupport?: Record<string, number>, uncastTurnout?: Record<string, number>}} [options] */
export function composeFinalStateTally({ ledger, stateId, electorate, uncastSupport, uncastTurnout } = {}) {
  const checked = validateEarlyBallotLedger(ledger);
  if (!checked.valid) throw new Error(checked.errors.join('; '));
  if (!text(stateId) || !finiteNonnegative(electorate)) throw new Error('A state and electorate are required');
  const batches = ledger.batches.filter((batch) => batch.stateId === stateId);
  if (batches.some((batch) => !close(batch.electorate, electorate))) throw new Error('Final electorate does not match saved ballots');
  const earlyVotes = {};
  for (const batch of batches) for (const [party, value] of Object.entries(batch.votes)) earlyVotes[party] = (earlyVotes[party] || 0) + value;
  const earlyBallots = totalOf(earlyVotes);
  const uncastElectorate = Math.max(0, electorate - earlyBallots);
  const electionDayVotes = ballotVotes(uncastElectorate, uncastSupport, uncastTurnout);
  const votes = { ...earlyVotes };
  for (const [party, value] of Object.entries(electionDayVotes)) votes[party] = (votes[party] || 0) + value;
  const totalBallots = totalOf(votes);
  const shares = Object.fromEntries(Object.entries(votes).map(([party, value]) => [party, totalBallots ? value / totalBallots * 100 : 0]));
  return { stateId, electorate, earlyVotes, earlyBallots, uncastElectorate, electionDayVotes, votes, totalBallots, shares };
}

/** Returns a labeled modeled schedule, not a claim about actual state law. */
/** @param {{campaignId?: string, stateId?: string, totalWeeks?: number, electorate?: number, eligibleFromWeek?: number, segments?: ReadonlyArray<{weeksBeforeElection: number, checkpoint: string, eligibleFraction: number}>}} [options] */
export function planEarlyBallotSchedule({ campaignId, stateId, totalWeeks, electorate, eligibleFromWeek = 1, segments = MODELED_EARLY_VOTE_SCHEDULE } = {}) {
  if (!text(campaignId) || !text(stateId) || !Number.isInteger(totalWeeks) || totalWeeks < 1 || !finiteNonnegative(electorate)
    || !Number.isInteger(eligibleFromWeek) || eligibleFromWeek < 1 || !Array.isArray(segments)) throw new Error('Invalid early-voting schedule input');
  let fractionTotal = 0;
  const keys = new Set();
  const schedule = [];
  for (const segment of segments) {
    if (!Number.isInteger(segment.weeksBeforeElection) || segment.weeksBeforeElection < 1 || !text(segment.checkpoint)
      || !finiteNonnegative(segment.eligibleFraction) || segment.eligibleFraction > 1) throw new Error('Invalid modeled schedule segment');
    fractionTotal += segment.eligibleFraction;
    const week = totalWeeks - segment.weeksBeforeElection;
    if (week < eligibleFromWeek || week < 1 || week >= totalWeeks) continue;
    const id = batchKey(campaignId, stateId, week, segment.checkpoint);
    if (keys.has(id)) throw new Error('Duplicate modeled checkpoint');
    keys.add(id);
    schedule.push({ id, stateId, week, checkpoint: segment.checkpoint, eligibleBallotVolume: electorate * segment.eligibleFraction, assumption: 'modeled-game-schedule' });
  }
  if (fractionTotal > 1 + 1e-9) throw new Error('Modeled early-vote fractions exceed the electorate');
  return schedule.sort((a, b) => a.week - b.week || a.checkpoint.localeCompare(b.checkpoint));
}

/** Map adapters consume only preferences, never the turnout-adjusted row shares. */
export function persuasionMapRow(row) {
  if (!row || !row.support) return { status: 'unavailable', reason: 'missing-support-snapshot', stateId: row?.abbr || row?.id || null };
  assertShares(row.support);
  const shares = { ...row.support };
  const ranked = Object.entries(shares).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return { status: 'available', stateId: row.abbr || row.id || null, shares, leader: ranked[1] && close(ranked[0][1], ranked[1][1]) ? null : ranked[0][0], marginDMinusR: (shares.dem || 0) - (shares.rep || 0) };
}

/** The aggregate ledger alone cannot allocate ranked-choice or district ballots. */
/** @param {{stateId?: string, electoralRule?: string, thirdMode?: string}} [options] */
export function assessTallyCompatibility({ stateId, electoralRule = 'standard', thirdMode = 'fringe' } = {}) {
  if (!text(stateId) || !['standard', 'proportional', 'district'].includes(electoralRule)
    || !['fringe', 'surge'].includes(thirdMode)) return { status: 'unavailable', reasons: ['unsupported-rule-context'] };
  const reasons = [];
  if (thirdMode === 'surge') reasons.push('ranked-ballot-preferences-not-recorded');
  if (electoralRule === 'district' || (electoralRule === 'standard' && ['ME', 'NE'].includes(stateId))) {
    reasons.push('district-early-ballots-not-recorded');
  }
  return {
    status: reasons.length ? 'unavailable' : 'state-vote-tally-only',
    reasons,
    note: reasons.length ? 'Native allocation requires additional ballot data.' : 'Use the native rule resolver for electoral allocation.',
  };
}
