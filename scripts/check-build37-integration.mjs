import assert from 'node:assert/strict';
import { createServer } from 'vite';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
const server = await createServer({
  configLoader: 'runner', appType: 'custom', cacheDir: '.vite/build37-focused',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, ws: false },
});
const originalRandom = Math.random;

try {
  const engine = await server.ssrLoadModule('/src/lib/gameEngine.js');
  const { electionForecast } = await server.ssrLoadModule('/src/lib/electionForecast.js');
  const { closeEarlyBallots, earlyBallotsByState, earlyBallotAvailable, presidentialBallotCounter } = await server.ssrLoadModule('/src/lib/build37Ballots.js');
  const { recordIncident } = await server.ssrLoadModule('/src/lib/incidentLedger.js');
  const { EVENT_BY_ID } = await server.ssrLoadModule('/src/data/events.js');
  const { createSeededRandom } = await server.ssrLoadModule('/src/lib/seededRandom.js');
  const { nationalVote } = await server.ssrLoadModule('/src/lib/presidency.js');
  const { houseDistrictMargin } = await server.ssrLoadModule('/src/lib/downballot.js');
  const { buildNativeStaffActionOptions } = await server.ssrLoadModule('/src/lib/traditionalStaffNativeAdapter.js');
  const staff = ['field', 'pollster', 'communications', 'operations', 'policy', 'fundraising', 'base-liaison', 'social-media', 'media'];
  const create = (nationalGeneric, config = {}) => {
    Math.random = createSeededRandom('build37-integration');
    const draft = engine.createGame({
      party: 'dem', candidateId: 'shapiro', opponentId: 'vance', campaignId: 'build37-check',
      difficultyId: 'medium', startId: 'aug', nationalGeneric, thirdMode: 'fringe',
      houseRule: 'standard', electoralRule: 'standard', ...config,
    });
    return engine.confirmBuild35Staffing(draft, staff);
  };
  const near = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, actual + ' != ' + expected);
  const newGame = create(0);

  const alteredTurnout = {
    ...newGame,
    turnout: { ...newGame.turnout, PA: { dem: 40, rep: 82, lib: 60, grn: 60 } },
  };
  const getPA = (view) => view.rows.find((row) => row.abbr === 'PA');
  assert.deepEqual(getPA(engine.snapshot(alteredTurnout)).shares, getPA(engine.snapshot(newGame)).shares);
  assert.notDeepEqual(getPA(engine.resultSnapshot(alteredTurnout)).shares, getPA(engine.resultSnapshot(newGame)).shares);

  const weeks = engine.totalWeeksOf(newGame);
  const beforeEarly = { ...alteredTurnout, week: weeks - 3 };
  const states = [{ abbr: 'PA' }, { abbr: 'ME' }];
  const earlyLedger = closeEarlyBallots(beforeEarly, weeks, states, () => ({ dem: 52.5, rep: 47.5, lib: 0, grn: 0, ind: 0 }));
  assert.equal(earlyLedger.batches.length, 1);
  assert.equal(earlyLedger.batches[0].stateId, 'PA');
  const withEarly = { ...beforeEarly, earlyBallotLedger: earlyLedger };
  assert.equal(closeEarlyBallots(withEarly, weeks, states, () => ({ dem: 1, rep: 99 })), earlyLedger);
  assert.ok(!earlyBallotAvailable({ electoralRule: 'district' }));
  assert.ok(earlyBallotAvailable({ electoralRule: 'proportional' }, 'ME'));
  const early = earlyBallotsByState(earlyLedger).PA;
  const result = engine.resultSnapshot(withEarly);
  const final = getPA(result);
  const count = presidentialBallotCounter(withEarly, 'PA', early);
  for (const [party, votes] of Object.entries(count(final.support))) near(final.votes[party], votes);
  assert.ok(final.earlyBallots > 0);
  assert.ok(final.votes.dem >= early.votes.dem);
  assert.ok(final.cast <= early.electorate);
  assert.ok(Number.isFinite(nationalVote(result).dem));
  assert.equal(engine.saveGame(withEarly), true);
  assert.deepEqual(engine.loadGame().earlyBallotLedger, earlyLedger);

  const legacy = {
    ...newGame, week: 8, eventScheduleWeek: 8, eventScheduleVersion: 1,
    eventSchedule: [{ status: 'dispatched', id: 'endorsement', afterActions: 0 }],
    eventScheduleIndex: 0, decisionEventTargetCount: 1,
    currentEventId: 'endorsement', currentEventData: EVENT_BY_ID.endorsement,
    campaignPerks: { ...newGame.campaignPerks, freeAdIssues: ['economy'] },
  };
  delete legacy.earlyBallotLedger;
  delete legacy.electionModelVersion;
  storage.clear();
  storage.set('election2028.save.v36', engine.encodeCampaignSave(legacy));
  const migrated = engine.loadGame();
  assert.equal(migrated.earlyBallotLedger.eligibleFromWeek, 9);
  assert.deepEqual(migrated.earlyBallotLedger.batches, []);
  assert.deepEqual(migrated.eventSchedule.map(({ status, id, afterActions }) => ({ status, id, afterActions })), legacy.eventSchedule);
  assert.equal(migrated.eventScheduleVersion, 1);
  // Build 40 deliberately reuses this ID for a different, authored decision.
  assert.equal(migrated.currentEventId, 'endorsement');
  assert.equal(migrated.currentEventData.title, 'Stations Pick Up the Voter Guide');
  assert.deepEqual(migrated.campaignPerks.freeAdIssues, legacy.campaignPerks.freeAdIssues);
  assert.equal(engine.requestBuild34Endorsement(newGame, 'test'), newGame);
  assert.equal(engine.forceEvent(newGame, 'endorsement'), newGame); // No cards during the first playable week.
  const revised = engine.forceEvent({ ...newGame, week: 2 }, 'endorsement');
  assert.equal(revised.currentEventData.title, 'Stations Pick Up the Voter Guide');
  assert.equal(recordIncident(newGame, { ...newGame }, { type: 'endorsement' }).incidentLedger.length, newGame.incidentLedger.length);
  assert.ok(!buildNativeStaffActionOptions(newGame).options.some((option) => option.actionId === 'endorsement'));

  const house = engine.houseSnapshot(newGame);
  const pa = house.states.find((row) => row.state === 'PA');
  near(pa.margin, pa.shares.dem - pa.shares.rep);
  const district = house.districts.find((row) => row.state === 'PA');
  const shifted = { ...newGame, stateGeneric: { ...newGame.stateGeneric, PA: newGame.stateGeneric.PA + 4 } };
  near(houseDistrictMargin(district, shifted) - houseDistrictMargin(district, newGame), 4);
  const opened = (game) => engine.senateSnapshot(game).races.map(({ state, winner, color }) => [state, winner, color]);
  const benchmark = create(7.3);
  assert.deepEqual(opened(benchmark), opened({ ...benchmark, electionModelVersion: undefined }));
  const oldSenate = engine.senateSnapshot({ ...newGame, electionModelVersion: undefined });
  const newSenate = engine.senateSnapshot(newGame);
  assert.ok(newSenate.dem <= oldSenate.dem);

  const forecastInput = create(0, { thirdMode: 'off' });
  forecastInput.turnout.WI = { dem: 60, rep: 60, lib: 60, grn: 60 };
  const getWisconsin = (game) => engine.resultSnapshot(game).rows.find((row) => row.abbr === 'WI');
  function tuneWisconsin(margin) {
    let low = -40, high = 40;
    for (let i = 0; i < 32; i++) {
      const offset = (low + high) / 2;
      const trial = { ...forecastInput, stateMods: { ...forecastInput.stateMods, WI: offset } };
      const row = getWisconsin(trial);
      if (row.shares.dem - row.shares.rep < margin) low = offset;
      else high = offset;
    }
    return { ...forecastInput, stateMods: { ...forecastInput.stateMods, WI: (low + high) / 2 } };
  }
  const chance = (margin) => electionForecast(tuneWisconsin(margin), { draws: 1800, chamberDraws: 0, seed: 'build37-wisconsin' }).stateWinProbabilities.WI.parties;
  const lean = chance(3).dem;
  const likely = chance(7).dem;
  const rep = chance(-3).rep;
  assert.ok(lean > 60 && lean < 85, lean);
  assert.ok(likely > 93 && likely < 100, likely);
  assert.ok(rep > 60 && rep < 85, rep);
  const called = electionForecast(tuneWisconsin(7), {
    draws: 40, chamberDraws: 8, seed: 'called',
    reporting: { states: [{ abbr: 'WI', winner: 'rep', called: true, pct: 75 }] },
  });
  assert.equal(called.stateWinProbabilities.WI.parties.rep, 100);
  console.log(JSON.stringify({ neutralSenateBefore: [oldSenate.dem, oldSenate.rep], neutralSenateAfter: [newSenate.dem, newSenate.rep], benchmarkSenate: [engine.senateSnapshot(benchmark).dem, engine.senateSnapshot(benchmark).rep], lean, likely, rep }));
  console.log('Build 37 tally, persuasion, early save and retry, endorsement retirement, House, Senate, and state forecast checks passed.');
} finally {
  Math.random = originalRandom;
  await server.close();
}
