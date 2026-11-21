import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const oldApp = path.resolve(app, '../../build-0.1.4-integration-worktree/build35');
const primaryCoverage = JSON.parse(await readFile(path.resolve(app, '../evidence/data/regular-class-primary-coverage.json'), 'utf8'));
assert.equal(primaryCoverage.independentlyPrimarySupportedChambers, 99);
assert.equal(primaryCoverage.mismatchSeatIds.length, 0);
const options = (root) => ({ root, configFile: false, appType: 'custom', resolve: { alias: { '@': path.join(root, 'src') } }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null } });
const server = await createServer(options(app)), oldServer = await createServer(options(oldApp));
const memory = new Map(); globalThis.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
try {
  const helper = await server.ssrLoadModule('/src/lib/build45LegislatureClasses.js');
  const { BUILD45_LEGISLATURE_CLASSES: overrides, BUILD45_LEGISLATURE_CLASS_SPECS: specs } = await server.ssrLoadModule('/src/data/build45LegislatureClasses.js');
  const { STATE_LEGISLATURE_SEATS_2028: seats, validateStateLegislatureSeatData } = await server.ssrLoadModule('/src/data/stateLegislatureSeats2028.js');
  const { STATE_LEGISLATURES_2028: schedules } = await server.ssrLoadModule('/src/data/stateLegislatureCycles.js');
  const { STATE_LEGISLATURE_RESULTS_2024_BY_STATE: resultsByState } = await server.ssrLoadModule('/src/data/stateLegislatureResults2024.js');
  const projection = await server.ssrLoadModule('/src/lib/stateLegislatureSeatForecast.js');
  const aggregate = await server.ssrLoadModule('/src/lib/stateLegislatureForecast.js');
  const oldProjection = await oldServer.ssrLoadModule('/src/lib/stateLegislatureSeatForecast.js');
  const oldAggregate = await oldServer.ssrLoadModule('/src/lib/stateLegislatureForecast.js');
  const engine = await server.ssrLoadModule('/src/lib/gameEngine.js');
  const { electionForecast } = await server.ssrLoadModule('/src/lib/electionForecast.js');
  const game = engine.createGame({ party: 'dem', candidateId: 'shapiro', opponentId: 'vance', startId: 'aug', difficultyId: 'hard', campaignId: 'b45:official-classes' });
  assert.equal(game.build45?.legislatureClassRevision, helper.BUILD45_LEGISLATURE_CLASS_REVISION);
  const legacy = { ...game, build45: { ...game.build45 } }; delete legacy.build45.legislatureClassRevision;
  assert.equal(helper.effectiveLegislatureSeats(seats, legacy), seats);
  assert.equal(helper.effectiveLegislatureSchedules(schedules, legacy), schedules);
  assert.equal(helper.hasBuild45LegislatureClasses({ build45: { version: 2, legislatureClassRevision: helper.BUILD45_LEGISLATURE_CLASS_REVISION } }), false);
  assert.equal(overrides.length, 541); assert.equal(new Set(overrides.map((row) => row.seatId)).size, 541);
  const revised = helper.effectiveLegislatureSeats(seats, game);
  const revisedSchedules = helper.effectiveLegislatureSchedules(schedules, game);
  const ndHouse = revisedSchedules.find((row) => row.abbr === 'ND').chambers.find((row) => row.chamber === 'lower');
  assert.equal(ndHouse.districtCount, 48);
  assert.equal(revisedSchedules.find((row) => row.abbr === 'ND').chambers.find((row) => row.chamber === 'lower').totalSeats, 94);
  assert.equal(seats.filter((row) => row.seatUpIn2028 == null).length, 187);
  assert.equal(revised.filter((row) => row.seatUpIn2028 == null).length, 0);
  assert.equal(validateStateLegislatureSeatData({ seats: revised, schedules: revisedSchedules }).valid, true);
  const expected = { 'FL:upper': 20, 'HI:upper': 12, 'IL:upper': 39, 'MT:upper': 25, 'ND:upper': 23, 'ND:lower': 46, 'OH:upper': 16, 'OK:upper': 24, 'UT:upper': 14, 'WV:upper': 17, 'WI:upper': 16, 'NE:unicameral': 25 };
  const chambers = revisedSchedules.flatMap((state) => state.chambers.map((chamber) => {
    const key = state.abbr + ':' + chamber.chamber;
    const rows = revised.filter((row) => row.state === state.abbr && row.chamber === chamber.chamber);
    const oldRows = seats.filter((row) => row.state === state.abbr && row.chamber === chamber.chamber);
    const up = rows.filter((row) => row.seatUpIn2028).length, held = rows.filter((row) => row.seatUpIn2028 === false).length;
    assert.equal(up + held, chamber.totalSeats, key + ': full statutory class coverage'); assert.equal(up, chamber.seatsUp2028);
    if (key in expected) assert.equal(up, expected[key]);
    const sources = [...new Map(rows.map((row) => [row.seatUpSource?.url, row.seatUpSource]).filter(([url]) => url)).values()];
    const fresh = specs.find((row) => row.state === state.abbr && row.chamber === chamber.chamber);
    const verified = primaryCoverage.findings.find((row) => row.key === key);
    return { state: state.abbr, chamber: chamber.chamber, statutorySeats: chamber.totalSeats, up2028: up, held2028: held,
      previousScheduleUp: schedules.find((entry) => entry.abbr === state.abbr).chambers.find((entry) => entry.chamber === chamber.chamber).seatsUp2028,
      originalNullClasses: oldRows.filter((row) => row.seatUpIn2028 == null).length,
      correctedKnownClasses: rows.filter((row, index) => oldRows[index].seatUpIn2028 != null && row.seatUpIn2028 !== oldRows[index].seatUpIn2028).map((row) => row.seatId),
      classSourceAudit: fresh ? { status: 'official-regular-class-revalidated-2026-11-17', source: fresh.source }
        : { status: 'official-regular-class-revalidated-2026-11-18', source: verified.source, priorSources: sources,
          bounds: verified.bounds, compositionStatus: verified.compositionStatus },
      exactCurrentComposition: 'OPEN: class source does not establish current holder/appointment/vacancy/special result',
      future2027Composition: ['LA', 'MS', 'NJ', 'VA'].includes(state.abbr) ? 'Future 2027 election result is unavailable as of2026-11-17' : null,
      rows: rows.map((row, index) => ({ seatId: row.seatId, districtId: row.districtId, seatUpIn2028: row.seatUpIn2028,
        originalClass: oldRows[index].seatUpIn2028, classSource: row.seatUpSource || null, classStatus: row.seatUpStatus,
        regularClassVerification: fresh?.source || verified.source,
        holderSource: row.holderSource, holderStatus: row.holderStatus, holderParty2024: row.holderParty2024,
        checkedOn: '2026-11-17', affectedTests: ['tests/build45/data-classes.mjs'], bounds: 'regular class only; no unsourced current composition or special-election assertion' })) };
  }));
  assert.equal(chambers.length, 99);
  assert.ok(revised.filter((row) => row.state === 'NE').every((row) => row.ballotPartisan === false && row.holderParty2024 === 'nonpartisan'));
  const inputs = { seats, schedules, resultsByState };
  const oldSeats = projection.projectStateLegislatureSeats(legacy, inputs);
  assert.deepEqual(oldSeats, oldProjection.projectStateLegislatureSeats(legacy, inputs));
  assert.deepEqual(aggregate.projectStateLegislatures(legacy, { includeNoElectionStates: true }), oldAggregate.projectStateLegislatures(legacy, { includeNoElectionStates: true }));
  const projected = projection.projectStateLegislatureSeats(game, inputs);
  assert.equal(projected.byState.IL.chambers[0].seatsUp2028, 39);
  assert.equal(aggregate.projectStateLegislatures(game).byState.IL.chambers[0].seatsUp, 39);
  assert.equal(aggregate.projectStateLegislatures(game).byState.IL.chambers[0].provisional, true, 'Current party carry remains provisional');
  const officialAggregate = { sourceStatus: 'official-certified', unallocated: 0 };
  const verifiedClassesUnknownHolderCarry = { totalSeats: 59, seatsUp2028: 39, districtCycleStatus: 'official-regular-class-list', classRevision: helper.BUILD45_LEGISLATURE_CLASS_REVISION };
  assert.equal(aggregate.legislatureProjectionIsProvisional(officialAggregate, verifiedClassesUnknownHolderCarry), true, 'Official aggregate plus regular classes still lacks an exact class-to-holder party join');
  assert.equal(aggregate.legislatureProjectionIsProvisional(officialAggregate, { ...verifiedClassesUnknownHolderCarry, seatsUp2028: 59 }), false, 'No held-over class requires no carry allocation');
  const before = electionForecast(legacy, { draws: 2, chamberDraws: 2, seed: 'class-independent' });
  const after = electionForecast(game, { draws: 2, chamberDraws: 2, seed: 'class-independent' });
  assert.deepEqual(after, before, 'Class adapter does not change presidential/House/Senate forecasts or AI objectives');
  for (const state of [legacy, game]) {
    const ledger = JSON.stringify(state.earlyBallotLedger);
    const initial = projection.projectStateLegislatureSeats(state, inputs);
    assert.ok(engine.saveGame(state)); const loaded = engine.loadGame();
    assert.equal(helper.hasBuild45LegislatureClasses(loaded), helper.hasBuild45LegislatureClasses(state));
    assert.deepEqual(projection.projectStateLegislatureSeats(loaded, inputs), initial);
    assert.equal(JSON.stringify(loaded.earlyBallotLedger), ledger);
  }
  const summary = { generatedOn: '2026-11-18', revision: helper.BUILD45_LEGISLATURE_CLASS_REVISION, statutorySeatCount: revised.length, chamberCount: 99,
    officialNewClassRows: overrides.length, resolvedNullClasses: 187, remainingNullClasses: 0,
    correctedKnownClassCount: chambers.reduce((sum, row) => sum + row.correctedKnownClasses.length, 0),
    fullOfficialCompositionStatus: 'OPEN', independentPrimaryClassAuditRemainingChambers: chambers.filter((row) => !row.classSourceAudit.source).length,
    legacyEqualsBuild44: true, oldNewResumeExact: true, nonLegislatureForecastUnchanged: true, chambers };
  await writeFile(path.resolve(app, '../evidence/data/legislature-final-class-audit.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify({ ...summary, chambers: undefined }));
} finally { await Promise.all([server.close(), oldServer.close()]); }
