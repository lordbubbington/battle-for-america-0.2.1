import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'vite';

const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) };
const home = process.cwd();
const baseline = path.resolve(home, '../../build37-integration-worktree/build35');
const serverFor = (root, name) => createServer({ root, configLoader: 'runner', configFile: path.join(root, 'vite.config.js'),
  appType: 'custom', cacheDir: path.join(home, '.vite', name), optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, ws: false } });
const source = await serverFor(baseline, 'build38-legacy-before');
const target = await serverFor(home, 'build38-legacy-after');
const originalRandom = Math.random;
try {
  const old = await source.ssrLoadModule('/src/lib/gameEngine.js');
  const next = await target.ssrLoadModule('/src/lib/gameEngine.js');
  const { createSeededRandom } = await source.ssrLoadModule('/src/lib/seededRandom.js');
  const { closeEarlyBallots } = await source.ssrLoadModule('/src/lib/build37Ballots.js');
  const { electionForecast } = await target.ssrLoadModule('/src/lib/electionForecast.js');
  Math.random = createSeededRandom('build38:legacy');
  const draft = old.createGame({ party: 'dem', candidateId: 'shapiro', opponentId: 'vance', campaignId: 'build38:legacy',
    startId: 'aug', nationalGeneric: -2.25, houseRule: 'standard', electoralRule: 'standard', difficultyId: 'medium' });
  const staffed = old.confirmBuild35Staffing(draft, ['field','pollster','communications','operations','policy','fundraising','base-liaison','social-media','media']);
  let open = staffed;
  while (!old.decisionPending(open) && open.week < 8) open = old.advanceWeek(old.prepareDecisionWeekClose(open));
  assert.ok(old.decisionPending(open), 'native midweek event');
  const before = { ...staffed, week: staffed.totalWeeks - 3 };
  const ballot = { ...before, earlyBallotLedger: closeEarlyBallots(before, before.totalWeeks, [{ abbr: 'PA' }], () => ({ dem: 55, rep: 45 })) };
  const last = { ...ballot, week: ballot.totalWeeks - 1 };
  const finished = { ...last, week: last.totalWeeks, finished: true, pollMiss: { national: 0, state: {} } };
  for (const [stage, saved] of Object.entries({ draft, open, before, ballot, last, finished })) {
    storage.clear();
    storage.set(old.STORAGE_KEY, old.encodeCampaignSave(saved));
    const loaded = next.loadGame();
    assert.ok(loaded, stage);
    assert.equal(loaded.week, saved.week, stage);
    assert.equal(loaded.finished, saved.finished, stage);
    assert.equal(loaded.build38.votingRuleId, 'current', stage);
    assert.equal(loaded.build38.openingModel, false, stage);
    assert.deepEqual(loaded.earlyBallotLedger, saved.earlyBallotLedger, stage);
    assert.deepEqual(loaded.staffing.nonTraditionalActiveIds, saved.staffing.nonTraditionalActiveIds, stage);
    assert.deepEqual(loaded.finance, saved.finance, stage);
    assert.equal(loaded.currentEventId, saved.currentEventId, stage);
    if (stage === 'finished') {
      const beforeResult = old.resultSnapshot(saved);
      const afterResult = next.resultSnapshot(loaded);
      assert.deepEqual(afterResult.evBy, beforeResult.evBy);
      for (const [i, row] of afterResult.rows.entries()) assert.deepEqual(row.votes, beforeResult.rows[i].votes, row.abbr);
    }
  }
  const ruleCampaign = next.createGame({ party: 'dem', candidateId: 'shapiro', opponentId: 'vance', campaignId: 'build38:called',
    startId: 'aug', nationalGeneric: -2.25, difficultyId: 'medium', votingRuleId: 'mandatory-voter-id' });
  const tally = next.resultSnapshot(ruleCampaign);
  const reporting = { states: tally.rows.filter((row) => row.abbr !== 'ME' && row.abbr !== 'NE')
    .map(({ abbr, winner }) => ({ abbr, winner, called: true, pct: 100 })) };
  const forecast = electionForecast(ruleCampaign, { draws: 4, chamberDraws: 1, seed: 'build38:called', reporting });
  for (const { abbr, winner } of reporting.states) assert.equal(forecast.stateWinProbabilities[abbr].parties[winner], 100, abbr);
  console.log('Build 37 saves verified at setup, open decision, pre/post early batch, final week and completed election; Build 38 forecast preserved every supported called state.');
} finally {
  Math.random = originalRandom;
  await Promise.all([source.close(), target.close()]);
}
