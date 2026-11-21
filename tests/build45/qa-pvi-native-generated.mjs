import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baselineApp = path.resolve(app, '../../build-0.1.4-integration-worktree/build35');
const settings = (root) => ({ root, configFile: false, appType: 'custom', resolve: { alias: { '@': path.join(root, 'src') } },
  optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null } });
const server = await createServer(settings(app));
const baselineServer = await createServer(settings(baselineApp));
const mem = new Map();
globalThis.localStorage = { getItem: (key) => mem.get(key) ?? null, setItem: (key, value) => mem.set(key, value) };
const originalRandom = Math.random;
try {
  const pvi = await server.ssrLoadModule('/src/lib/build45HousePvi.js');
  const engine = await server.ssrLoadModule('/src/lib/gameEngine.js');
  const db = await server.ssrLoadModule('/src/lib/downballot.js');
  const oldDb = await baselineServer.ssrLoadModule('/src/lib/downballot.js');
  const { electionForecast } = await server.ssrLoadModule('/src/lib/electionForecast.js');
  const { closeEarlyBallots } = await server.ssrLoadModule('/src/lib/build37Ballots.js');
  const { STATES } = await server.ssrLoadModule('/src/data/states.js');
  const { createSeededRandom } = await server.ssrLoadModule('/src/lib/seededRandom.js');
  const data = JSON.parse(await readFile(path.join(app, 'src/data/build45HousePvi.json'), 'utf8'));
  const csv = await readFile(path.join(app, data.sourceArtifact));
  const hash = (value) => createHash('sha256').update(value).digest('hex');
  assert.equal(hash(csv), data.artifactSha256);
  const rawBefore = await readFile(path.join(app, 'src/data/houseDistrictBaselines.json'));
  const preserved = await readFile(path.join(baselineApp, 'src/data/houseDistrictBaselines.json'));
  assert.equal(hash(rawBefore), hash(preserved), 'Original 314/121 vote inputs remain byte-identical to Build 44');
  assert.equal(data.districts.length, 435); assert.equal(new Set(data.districts.map((row) => row.id)).size, 435);
  Math.random = createSeededRandom('build45-pvi-acceptance');
  const fresh = engine.createGame({ party: 'dem', candidateId: 'shapiro', opponentId: 'vance', startId: 'aug', difficultyId: 'hard', campaignId: 'build45-pvi-acceptance', nationalGeneric: 0 });
  assert.equal(fresh.build45?.version, 1); assert.equal(fresh.build45.housePviRevision, pvi.BUILD45_HOUSE_PVI_REVISION);
  const legacy = { ...fresh }; delete legacy.build45;
  const unrecognized = { ...fresh, build45: { version: 1, housePviRevision: 'unknown' } };
  const badVersion = { ...fresh, build45: { version: 2, housePviRevision: pvi.BUILD45_HOUSE_PVI_REVISION } };
  for (const row of db.HOUSE_DISTRICT_BASELINES) {
    assert.equal(pvi.effectiveHouseDistrictBaseline(row, legacy), row);
    assert.equal(pvi.effectiveHouseDistrictBaseline(row, unrecognized), row);
    assert.equal(pvi.effectiveHouseDistrictBaseline(row, badVersion), row);
    const actual = pvi.effectiveHouseDistrictBaseline(row, fresh);
    const source = data.districts.find((entry) => entry.id === row.id);
    assert.equal(actual.districtLeanDMinusR, source.districtLeanDMinusR);
    assert.equal(actual.originalVoteDerivedLean, row.districtLeanDMinusR);
    for (const key of ['demVotes', 'repVotes', 'resultMarginDMinusR', 'nationalGenericMarginDMinusR', 'sourceYear', 'sourceUrl', 'retrievedAt', 'certificationStatus', 'boundaryVintage']) assert.equal(actual[key], row[key], row.id + ':' + key);
    const expectedDelta = source.districtLeanDMinusR - row.districtLeanDMinusR;
    assert.ok(Math.abs((db.houseDistrictMargin(row, fresh) - db.houseDistrictMargin(row, legacy)) - expectedDelta) < 1e-9, row.id + ': native district pipeline');
  }
  const representative = ['AL-01', 'AK-01', 'GA-06', 'NY-17', 'KS-03', 'SC-01', 'TX-32', 'WA-08', 'NC-01'];
  const cases = [];
  for (const rule of ['standard', 'pr', 'mmp']) {
    const oldGame = { ...legacy, houseRule: rule }, newGame = { ...fresh, houseRule: rule };
    const before = db.buildHouse(oldGame, engine.marginFn(oldGame));
    const pinned = oldDb.buildHouse(oldGame, engine.marginFn(oldGame));
    assert.deepEqual(before, pinned, rule + ': legacy pipeline equals pinned Build 44');
    const after = db.buildHouse(newGame, engine.marginFn(newGame));
    assert.equal(after.total, before.total);
    assert.ok(after.states.some((state, index) => Math.abs(state.margin - before.states[index].margin) > 0.01), rule + ': new state forecasts consume PVI');
    for (const id of representative) {
      const raw = db.HOUSE_DISTRICT_BY_ID[id];
      if (!raw) continue;
      const state = raw.stateAbbr;
      const oldRows = db.HOUSE_DISTRICT_BASELINES.filter((row) => row.stateAbbr === state);
      const expected = oldRows.reduce((sum, row) => sum + pvi.effectiveHouseDistrictBaseline(row, newGame).districtLeanDMinusR - row.districtLeanDMinusR, 0) / oldRows.length;
      const actual = db.raceMargin(state, 'house', newGame, () => 0) - db.raceMargin(state, 'house', oldGame, () => 0);
      assert.ok(Math.abs(expected - actual) < 1e-8, rule + ':' + state + ': state mean baseline');
    }
    const forecastBefore = electionForecast(oldGame, { draws: 8, chamberDraws: 8, seed: 'pvi-shared-seed:' + rule });
    const forecastAfter = electionForecast(newGame, { draws: 8, chamberDraws: 8, seed: 'pvi-shared-seed:' + rule });
    assert.equal(forecastAfter.popularMargin, forecastBefore.popularMargin);
    assert.equal(forecastAfter.youEV, forecastBefore.youEV);
    assert.deepEqual(forecastAfter.stateWinProbabilities, forecastBefore.stateWinProbabilities);
    assert.deepEqual(forecastAfter.senateProjection, forecastBefore.senateProjection);
    assert.notDeepEqual(forecastAfter.houseProjection, forecastBefore.houseProjection, rule + ': chamber forecast reacts');
    for (const state of [oldGame, newGame]) {
      const expected = db.buildHouse(state, engine.marginFn(state));
      const ballots = JSON.stringify(state.earlyBallotLedger);
      assert.ok(engine.saveGame(state));
      const loaded = engine.loadGame();
      assert.equal(pvi.hasBuild45HousePvi(loaded), pvi.hasBuild45HousePvi(state));
      assert.equal(JSON.stringify(loaded.earlyBallotLedger), ballots, rule + ': early ballots unchanged');
      assert.deepEqual(db.buildHouse(loaded, engine.marginFn(loaded)), expected, rule + ': resume exact House opening');
    }
    cases.push({ rule, legacyEqualsBuild44: true, newConsumesPvi: true, stateMeanPipeline: true, presidentialVotesAndEVUnchanged: true, senateForecastUnchanged: true,
      oldNewSaveResumeExact: true, earlyBallotsUnchanged: true, before: { dem: before.dem, rep: before.rep, total: before.total }, after: { dem: after.dem, rep: after.rep, total: after.total },
      forecastBefore: forecastBefore.houseProjection, forecastAfter: forecastAfter.houseProjection });
  }
  // Also preserve nonempty native early-vote batches, their source snapshots,
  // and the resulting presidential tallies through both saved model versions.
  const late = { ...fresh, week: engine.totalWeeksOf(fresh) - 3 };
  const supportByState = new Map(engine.resultSnapshot(late).rows.map((row) => [row.abbr, row.support]));
  const ledger = closeEarlyBallots(late, engine.totalWeeksOf(late), STATES, (abbr) => supportByState.get(abbr));
  assert.equal(ledger.batches.length, 49);
  const lateNew = { ...late, week: late.week + 1, earlyBallotLedger: ledger };
  const lateLegacy = { ...lateNew }; delete lateLegacy.build45;
  assert.deepEqual(engine.resultSnapshot(lateNew).rows, engine.resultSnapshot(lateLegacy).rows, 'PVI has no effect on cast or uncast presidential ballots');
  for (const state of [lateNew, lateLegacy]) {
    const expectedRows = engine.resultSnapshot(state).rows;
    const expectedLedger = JSON.stringify(state.earlyBallotLedger);
    assert.ok(engine.saveGame(state));
    const loaded = engine.loadGame();
    assert.equal(JSON.stringify(loaded.earlyBallotLedger), expectedLedger);
    assert.deepEqual(engine.resultSnapshot(loaded).rows, expectedRows);
  }
  assert.equal(hash(await readFile(path.join(app, 'src/data/houseDistrictBaselines.json'))), hash(rawBefore));
  await writeFile(path.resolve(app, '../evidence/qa/data/pvi-pipeline-results.json'), JSON.stringify({ generatedOn: '2026-11-17', revision: data.revision, sourceRows: 435, primaryVerifiedRows: 435,
    representative, originalHouseInputsUnchanged: true, flaggedCampaignsOnly: true, nativeEarlyBallotBatchesPreserved: 49, oldNewPresidentialTalliesUnchanged: true, cases }, null, 2) + '\n');
  console.log(JSON.stringify({ rows: 435, rules: cases.map((row) => row.rule), legacyAndNewResumeExact: true, originalHouseInputsUnchanged: true }));
} finally { Math.random = originalRandom; await Promise.all([server.close(), baselineServer.close()]); }
