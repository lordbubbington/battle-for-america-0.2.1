import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '../..');
const vitePath = [path.join(app, 'node_modules/vite/dist/node/index.js'), path.resolve(app, '../../build-0.1.4-integration-worktree/build35/node_modules/vite/dist/node/index.js')].find(existsSync);
const { createServer } = await import(pathToFileURL(vitePath));
const server = await createServer({ root: app, configFile: false, appType: 'custom', resolve: { alias: { '@': path.join(app, 'src') } },
  optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null } });
try {
  const legal = await server.ssrLoadModule('/src/lib/build45OfficialRecords.js');
  const { recordIncident } = await server.ssrLoadModule('/src/lib/incidentLedger.js');
  const { BUILD45_OFFICIAL_RECORDS: stock } = await server.ssrLoadModule('/src/data/build45OfficialRecords.js');
  assert.equal(stock.length, 0);
  const game = { build34CampaignId: 'synthetic-contract-fixture', week: 5, incidentLedger: [], incidentSequence: 0, party: 'grn' };
  const cases = [];
  const kinds = { '048': 'petition', '096': 'petition', '097': 'petition-challenge', '099': 'polling-place-change', '100': 'administration-correction' };
  for (const [number, kind] of Object.entries(kinds)) {
    const record = { version: 1, synthetic: true, status: 'official-verified', id: 'SYNTHETIC-' + number, state: 'WI', kind,
      route: 'SYNTHETIC-route', filingId: 'SYNTHETIC-filing', electionDate: '2028-11-07', validFrom: '2028-09-01', validThrough: '2028-10-01',
      retrievedOn: '2026-11-17', source: { authority: 'state-government', checkedOn: '2026-11-17', title: 'SYNTHETIC FIXTURE - no real filing asserted', url: 'https://elections.wi.gov/' },
      party: 'grn', signatures: 100, threshold: 200, filingDeadline: '2028-09-15', challengeId: 'SYNTHETIC-challenge', claim: 'SYNTHETIC-claim',
      officialNoticeId: 'SYNTHETIC-notice', precinctId: 'SYNTHETIC-precinct', oldLocation: 'SYNTHETIC-old', newLocation: 'SYNTHETIC-new',
      localStoryId: 'SYNTHETIC-story', falseClaim: 'SYNTHETIC-false-claim', correction: 'SYNTHETIC-correction' };
    const options = { records: [record], allowSynthetic: true };
    assert.equal(legal.validateBuild45OfficialRecord(record), false);
    const context = legal.build45OfficialNoticeContext(game, record, '2028-09-10', options);
    assert.ok(context);
    const produced = recordIncident(game, { ...game }, context);
    const receipt = produced.incidentLedger.at(-1);
    const eventId = 'interrupt-' + number + '-fixture';
    const ok = (g, r, opts = options) => legal.build45OfficialReceiptAllowed(g, eventId, r, opts);
    assert.equal(ok(produced, receipt), true, number);
    assert.equal(ok(produced, receipt, { records: [record] }), false, 'Synthetic record forbidden in production');
    assert.equal(legal.build45OfficialReceiptAllowed(produced, eventId, receipt), false, 'Stock empty registry fails closed');
    assert.equal(ok({ ...produced, week: 9 }, receipt), false);
    assert.equal(ok({ ...produced, week: 4 }, receipt), false);
    assert.equal(ok(produced, { ...receipt, stateId: 'PA', state: 'PA' }), false);
    assert.equal(ok(produced, { ...receipt, campaignId: 'wrong' }), false);
    for (const [field, value] of [['route', 'wrong'], ['filingId', 'wrong'], ['electionDate', '2024-11-05'], ['date', '2028-11-01'], ['simulated', true]]) {
      assert.equal(ok(produced, { ...receipt, payload: { ...receipt.payload, [field]: value } }), false, number + ':' + field);
    }
    assert.equal(ok(produced, receipt, { records: [{ ...record, validThrough: '2028-09-01' }], allowSynthetic: true }), false);
    assert.equal(legal.validateBuild45OfficialRecord({ ...record, validFrom: '2028-02-30' }, options), false);
    cases.push({ number, syntheticPositive: true, productionRejected: true, freshStaleWrongStateWrongCampaignWrongRouteWrongFilingWrongElectionExpiredSimulated: true });
  }
  assert.equal(legal.build45OfficialReceiptAllowed(game, 'interrupt-069-ballot-measure-conflict', null), true);
  const { BUILD45_NEBRASKA_CLASSES: ne } = await server.ssrLoadModule('/src/data/build45NebraskaClasses.js');
  assert.equal(ne.length, 49); assert.equal(ne.filter((row) => row.seatUpIn2028).length, 25);
  assert.equal(ne.filter((row) => !row.seatUpIn2028).length, 24); assert.ok(ne.every((row) => row.ballotPartisan === false));
  const { STATE_LEGISLATURE_SEATS_2028: seats } = await server.ssrLoadModule('/src/data/stateLegislatureSeats2028.js');
  const { STATE_LEGISLATURES_2028: states } = await server.ssrLoadModule('/src/data/stateLegislatureCycles.js');
  const chambers = states.flatMap((state) => state.chambers.map((chamber) => {
    const rows = seats.filter((row) => row.state === state.abbr && row.chamber === chamber.chamber);
    const up = rows.filter((row) => row.seatUpIn2028 === true).length;
    const hold = rows.filter((row) => row.seatUpIn2028 === false).length;
    const unresolved = rows.length - up - hold;
    assert.equal(rows.length, chamber.totalSeats);
    assert.equal(up + hold + unresolved, chamber.totalSeats);
    return { state: state.abbr, chamber: chamber.chamber, statutorySize: chamber.totalSeats, seatsUpKnown: up, heldOverKnown: hold, classUnresolved: unresolved,
      scheduledUpEstimate: chamber.seatsUp2028, estimate: unresolved > 0, source: chamber.source || null,
      exactCurrentCompositionStatus: 'OPEN: current holder, vacancies, specials and off-cycle official coverage not complete',
      reviewedOn: '2026-11-17', affectedTests: ['tests/build45/data-validation.mjs'],
      bounds: 'No new holder, class or party substitution; unresolved district classes remain estimates',
      rows: rows.map(({ seatId, districtId, seatUpIn2028, seatUpStatus, seatUpSource, holderStatus, holderSource }) => ({ seatId, districtId, seatUpIn2028, seatUpStatus, seatUpSource, holderStatus, holderSource })) };
  }));
  const house = JSON.parse(await readFile(path.join(app, 'src/data/houseDistrictBaselines.json'), 'utf8'));
  const ids = new Set();
  const districts = house.districts.map((row) => {
    assert.ok(!ids.has(row.id)); ids.add(row.id);
    assert.match(row.id, /^[A-Z]{2}-\d{2}$/);
    assert.equal(row.stateAbbr, row.id.slice(0, 2));
    assert.ok(Number.isInteger(row.demVotes) && row.demVotes >= 0 && Number.isInteger(row.repVotes) && row.repVotes >= 0 && row.demVotes + row.repVotes > 0);
    const computed = 100 * (row.demVotes - row.repVotes) / (row.demVotes + row.repVotes);
    assert.ok(Math.abs(row.resultMarginDMinusR - computed) < 0.001, row.id);
    assert.ok(Math.abs(row.districtLeanDMinusR - (computed - row.nationalGenericMarginDMinusR)) < 0.001, row.id);
    return { id: row.id, sourceYear: row.sourceYear, sourceUrl: row.sourceUrl, retrievedAt: row.retrievedAt, baselineStatus: row.baselineStatus,
      boundaryVintage: row.boundaryVintage, boundaryOfficialVerification: 'OPEN: preserved baseline, no new official boundary revision accepted',
      twoPartyNormalizationValid: true, districtRelativeValid: true, replaced: false, official2026Coverage: 'OPEN',
      reviewedOn: '2026-11-17', affectedTests: ['tests/build45/data-validation.mjs'],
      bounds: 'Preserved original mixed-vintage input; no newly certified 2026 vote or boundary assertion' };
  });
  assert.equal(ids.size, 435); assert.equal(districts.filter((row) => row.sourceYear === 2026).length, 314); assert.equal(districts.filter((row) => row.sourceYear === 2024).length, 121);
  const { STATES: nationalStates } = await server.ssrLoadModule('/src/data/states.js');
  for (const state of nationalStates.filter((row) => row.abbr !== 'DC')) {
    const expected = state.ev - 2;
    const stateRows = house.districts.filter((row) => row.stateAbbr === state.abbr);
    assert.equal(stateRows.length, expected, state.abbr + ': reapportionment count');
    for (let district = 1; district <= expected; district++) assert.ok(ids.has(state.abbr + '-' + String(district).padStart(2, '0')));
  }
  const evidence = path.resolve(app, '../evidence/qa/data');
  await writeFile(path.join(evidence, 'legal-fixtures.json'), JSON.stringify({ generatedOn: '2026-11-17', stockRecords: 0, fictional069Unchanged: true, cases }, null, 2) + '\n');
  await writeFile(path.join(evidence, 'legislature-provenance.json'), JSON.stringify({ generatedOn: '2026-11-17', status: 'OPEN', chambers }, null, 2) + '\n');
  await writeFile(path.join(evidence, 'house-provenance.json'), JSON.stringify({ generatedOn: '2026-11-17', status: 'OPEN', replacedCount: 0, districts }, null, 2) + '\n');
  console.log(JSON.stringify({ legalSyntheticCases: cases.length, stockOfficialRecords: 0, neRegularClasses: '25 up + 24 held = 49; nonpartisan', chambers: chambers.length, unresolvedClasses: chambers.reduce((sum, row) => sum + row.classUnresolved, 0), houseRows: districts.length, replaced: 0 }));
} finally { await server.close(); }
