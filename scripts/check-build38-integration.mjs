import assert from 'node:assert/strict';
import { createServer } from 'vite';
const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key), setItem: (key, value) => store.set(key, value) };
const server = await createServer({ configLoader: 'runner', appType: 'custom', cacheDir: '.vite/build38-integration',
  optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false } });
try {
  const engine = await server.ssrLoadModule('/src/lib/gameEngine.js');
  const { STATE_LIST } = await server.ssrLoadModule('/src/data/states.js');
  const { POPULATION_BY_STATE } = await server.ssrLoadModule('/src/data/build38Population.js');
  const { modeledRegistrationPool } = await server.ssrLoadModule('/src/lib/build38VotingRules.js');
  const { closeEarlyBallots, earlyBallotsByState, presidentialBallots } = await server.ssrLoadModule('/src/lib/build37Ballots.js');
  const { BASE_TURNOUT, voteUnits } = await server.ssrLoadModule('/src/lib/turnout.js');
  const { VOTER_COMPOSITION, volunteerPrice, build38Field } = await server.ssrLoadModule('/src/lib/build38Runtime.js');
  const { createSeededRandom } = await server.ssrLoadModule('/src/lib/seededRandom.js');
  const source = { party:'dem', candidateId:'shapiro', opponentId:'vance', runningMateId:'klobuchar', difficultyId:'medium',
    campaignId:'build38-contract', startId:'aug', nationalGeneric:0, electoralRule:'proportional', houseRule:'mmp' };
  const create = (votingRuleId) => { Math.random = createSeededRandom('build38-contract'); return engine.createGame({ ...source, votingRuleId }); };
  for (const row of Object.values(VOTER_COMPOSITION.byState)) {
    assert.ok(Object.values(row.ideology).every((weight) => Number.isFinite(weight) && weight > 0));
    assert.ok(Math.abs(Object.values(row.ideology).reduce((a,b) => a+b,0) - 100) < 1e-7);
  }
  assert.equal(Object.values(POPULATION_BY_STATE).length, 51);
  assert.ok(Math.abs(STATE_LIST.reduce((total, { abbr }) => total + volunteerPrice(abbr), 0) / 51 - 2.5) < 1e-9);
  const current = create('current');
  const compulsory = create('mandatory-turnout');
  assert.deepEqual(engine.snapshot(current).rows.map((row) => row.shares), engine.snapshot(compulsory).rows.map((row) => row.shares));
  assert.ok(current.build38.ticketEffectIds.some((id) => id.includes(':dem:shapiro:klobuchar')));
  assert.ok(current.build38.ticketEffectIds.some((id) => id.includes(':rep:vance:')));
  const week = engine.totalWeeksOf(compulsory) - 3;
  const first = { ...compulsory, week };
  const voters = Object.fromEntries(engine.snapshot(first).rows.map((row) => [row.abbr, row.shares]));
  const early = closeEarlyBallots(first, first.totalWeeks, STATE_LIST, (abbr) => voters[abbr]);
  assert.equal(early.batches.length, 51);
  assert.ok(early.batches.every((batch) => batch.ruleSnapshot.version === 1 && batch.ruleSnapshot.ruleId === 'mandatory-turnout' && batch.ruleSnapshot.cohortsByParty.dem.length === 6));
  assert.deepEqual(closeEarlyBallots({ ...first, earlyBallotLedger: early }, first.totalWeeks, STATE_LIST, () => ({ dem:100, rep:0 })), early);
  const banked = earlyBallotsByState(early);
  let weightedRate = 0;
  let population = 0;
  for (const { abbr } of STATE_LIST) {
    const pool = modeledRegistrationPool({ historicalBallots: voteUnits(abbr), baselineTurnoutRate: BASE_TURNOUT[abbr] / 100, ruleId: 'mandatory-turnout' });
    const ballots = presidentialBallots(first, abbr, {dem:0, rep:100}, banked[abbr]);
    assert.ok(Math.abs(ballots.dem - banked[abbr].votes.dem) < 1e-9);
    const turnout = Object.values(ballots).reduce((sum, votes) => sum + votes, 0) / pool.eligibleUnits;
    assert.ok(turnout >= .95 - 1e-8 && turnout <= 1 + 1e-8, abbr + ': ' + turnout);
    weightedRate += turnout * POPULATION_BY_STATE[abbr];
    population += POPULATION_BY_STATE[abbr];
  }
  assert.ok(Math.abs(weightedRate / population - .98) < 1e-9);
  const before = engine.houseSnapshot(current);
  assert.equal(before.total, 870);
  assert.ok(before.states.every((row) => Math.abs(Object.values(row.listVoteShares).reduce((sum, value) => sum + value, 0) - 100) < 1e-7));
  assert.equal(build38Field({ ...current, week: current.totalWeeks - 1, build38: { votingRuleId: 'automatic-registration' } }, 'volunteers', 'PA').fieldMultiplier, 2);
  const legacy = { ...current, build38: undefined, earlyBallotLedger: early };
  store.set('election2028.save.v37', engine.encodeCampaignSave(legacy));
  const migrated = engine.loadGame();
  assert.equal(migrated.build38.votingRuleId, 'current');
  assert.equal(migrated.build38.openingModel, false);
  assert.deepEqual(migrated.earlyBallotLedger, early);
  console.log('Build 38 verified finite ideology, ticket initialization, $2.5M mean, immutable early votes, 98% compulsory target, MMP list conservation, and legacy load.');
} finally { await server.close(); }
