import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = async (name) => JSON.parse(await readFile(path.join(root, 'evidence/data', name), 'utf8'));
const [base, supplement] = await Promise.all([read('legislature-final-class-audit.json'), read('regular-class-primary-supplement.json')]);
const supplement2 = await read('regular-class-primary-supplement-2.json');
supplement.records.push(...supplement2.records);
supplement.records.push(...(await read('regular-class-primary-supplement-3.json')).records);
const keys = new Set();
const findings = supplement.records.flatMap((record) => Object.entries(record.chambers).map(([chamber, total]) => {
  const key = `${record.state}:${chamber}`; assert.ok(!keys.has(key)); keys.add(key);
  const current = base.chambers.find((row) => row.state === record.state && row.chamber === chamber); assert.ok(current, key);
  assert.equal(current.statutorySeats, total, key); assert.equal(current.rows.length, total, key);
  assert.ok(['all', 'none', 'list', 'odd', 'even'].includes(record.rule)); assert.ok(record.url.startsWith('https://'));
  if (record.rule === 'list') {
    const districts = new Set(current.rows.map((row) => String(row.districtId)));
    assert.equal(new Set(record.districtsUp.map(String)).size, record.districtsUp.length, key + ': unique primary class list');
    assert.ok(record.districtsUp.every((district) => districts.has(String(district))), key + ': primary district list fits preserved catalog');
  }
  const expected = (row) => record.rule === 'all' || (record.rule === 'list' && record.districtsUp.map(String).includes(String(row.districtId))) || (record.rule === 'odd' && Number(row.districtId) % 2 === 1) || (record.rule === 'even' && Number(row.districtId) % 2 === 0);
  const up = current.rows.filter(expected).length;
  const mismatches = current.rows.filter((row) => row.seatUpIn2028 !== expected(row)).map((row) => row.seatId);
  return { key, state: record.state, chamber, seats: total, expectedUp2028: up,
    expectedHeld2028: total - up, currentUp2028: current.up2028, mismatches,
    status: mismatches.length ? 'OFFICIAL-SCHEDULE-MISMATCH-REQUIRES-REVIEW' : 'regular-term-and-2028-schedule-supported',
    source: { url: record.url, supportingUrls: record.supportingUrls || [], retrievedOn: record.retrievedOn || supplement.retrievedOn,
      retrieval: record.retrieval || 'official-search-index-excerpt', finding: record.finding },
    seatIds: current.rows.map((row) => row.seatId), affectedTests: ['tests/build45/data-source-coverage.mjs', 'tests/build45/data-classes.mjs'],
    bounds: supplement.scope, compositionStatus: 'OPEN: actual holder/party/appointment/vacancy and special-election records remain separate' };
}));
const previouslyVerified = base.chambers.filter((row) => row.classSourceAudit.status === 'official-regular-class-revalidated-2026-11-17').map((row) => `${row.state}:${row.chamber}`);
assert.equal(previouslyVerified.length, 12);
for (const key of previouslyVerified) assert.ok(!keys.has(key));
const outstanding = base.chambers.filter((row) => !keys.has(`${row.state}:${row.chamber}`) && !previouslyVerified.includes(`${row.state}:${row.chamber}`)).map((row) => ({
  key: `${row.state}:${row.chamber}`, seats: row.statutorySeats, seatIds: row.rows.map((seat) => seat.seatId),
  status: 'recoverable-primary-revalidation-not-completed', retainedSources: row.classSourceAudit.sources,
  nextAction: 'Read official current term law plus anchored regular class list; distinguish special or unexpired terms. Do not infer unavailability from unfinished research.',
  affectedTests: ['tests/build45/data-classes.mjs', 'tests/build45/data-source-coverage.mjs'] }));
const output = { retrievedOn: supplement.retrievedOn, productionChanged: false,
  statutorySeatCount: base.statutorySeatCount,
  independentlyPrimarySupportedChambers: previouslyVerified.length + findings.length,
  newlySupportedChambers: findings.length, previouslySupportedChambers: previouslyVerified,
  remainingPrimaryRevalidationChambers: outstanding.length, fullCompositionChambersStillOpen: 99,
  mismatchSeatIds: findings.flatMap((row) => row.mismatches), findings, outstanding };
assert.equal(output.independentlyPrimarySupportedChambers + outstanding.length, 99);
assert.equal(base.chambers.reduce((sum, row) => sum + row.statutorySeats, 0), 7386);
await writeFile(path.join(root, 'evidence/data/regular-class-primary-coverage.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ supported: output.independentlyPrimarySupportedChambers, newlySupported: findings.length, remaining: outstanding.length, mismatches: output.mismatchSeatIds }));
assert.equal(output.mismatchSeatIds.length, 0, 'Report schedule conflicts to integration; never silently replace production rows');
