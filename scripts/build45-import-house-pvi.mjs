import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFile(path.join(app, file), 'utf8');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const csvText = await read('data-import/pvi/owner-approved-2026-11-14.csv');
const primaryText = await read('data-import/pvi/cook-primary-2026-11-17.json');
const originalText = await read('src/data/houseDistrictBaselines.json');
const primary = JSON.parse(primaryText);
const original = JSON.parse(originalText);
const shift = { KS: 5, SC: 5, TX: 5, MS: 5, AK: 5, GA: 2, NC: 2, OR: -5, NY: -5, CT: -5, IL: -5, WA: -5 };
const parseCsv = (input) => {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (char === '"') { if (quoted && input[index + 1] === '"') { cell += '"'; index++; } else quoted = !quoted; }
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[index + 1] === '\n') index++;
      row.push(cell); if (row.some((value) => value.length)) rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  assert.equal(quoted, false, 'Unclosed CSV string');
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift();
  return rows.map((values, index) => { assert.equal(values.length, header.length, 'CSV row ' + (index + 2)); return Object.fromEntries(header.map((key, column) => [key, values[column]])); });
};
const signed = (value) => value === 'EVEN' ? 0 : /^[DR]\+\d+(?:\.\d+)?$/.test(value) ? Number(value.slice(2)) * (value[0] === 'D' ? 1 : -1) : NaN;
const normalizeId = (id) => { const match = id.match(/^([A-Z]{2})-(\d+|AL)$/); assert.ok(match, id); return match[1] + '-' + (match[2] === 'AL' ? '01' : match[2].padStart(2, '0')); };
const sourceRows = parseCsv(csvText);
assert.equal(sourceRows.length, 435); assert.equal(primary.rows.length, 435);
const primaryById = new Map(primary.rows.map((row) => [normalizeId(row.cookId), row]));
const originalById = new Map(original.districts.map((row) => [row.id, row]));
assert.equal(primaryById.size, 435); assert.equal(originalById.size, 435);
const ids = new Set();
const districts = sourceRows.map((row, index) => {
  const id = normalizeId(row.District_ID);
  assert.ok(!ids.has(id), id + ': duplicate'); ids.add(id);
  const baseline = originalById.get(id), cook = primaryById.get(id);
  assert.ok(baseline && cook, id + ': missing district mapping');
  assert.equal(row.State_Abbr, baseline.stateAbbr);
  assert.equal(Number(row.District_Number), baseline.districtNumber);
  assert.ok([2024, 2026].includes(baseline.boundaryVintage), id + ': known preserved source boundary vintage');
  const ownerShift = shift[row.State_Abbr] || 0;
  const adjustedLean = Number(row.In_Game_District_Lean_Raw);
  assert.ok(Number.isFinite(adjustedLean) && Math.abs(adjustedLean) <= 100);
  assert.equal(adjustedLean, 2 * cook.value + ownerShift, id + ': 2*CookPVI + owner state shift');
  assert.equal(signed(row.Partisan_Lean_Formatted), adjustedLean, id + ': formatted sign');
  assert.equal(row.Party_Advantage, adjustedLean > 0 ? 'Democratic' : adjustedLean < 0 ? 'Republican' : 'Even');
  return { id, stateAbbr: row.State_Abbr, districtNumber: Number(row.District_Number), cookPviDMinusR: cook.value, ownerShiftDMinusR: ownerShift,
    districtLeanDMinusR: adjustedLean, sourceRow: index + 2, sourceDistrictId: row.District_ID,
    cookSourceUrl: cook.sourceUrl, retrievedOn: primary.retrievedOn, boundaryVintage: 2026,
    originalVoteBoundaryVintage: baseline.boundaryVintage,
    boundaryMappingStatus: 'exact-id-state-and-district-number-match; 2026-Cook-race-vintage; original-vote-vintage-preserved-separately',
    provenance: 'owner-approved-adjustment-of-primary-verified-Cook-PVI; not-certified-election-votes' };
});
assert.equal(ids.size, 435); assert.deepEqual([...ids].sort(), [...originalById.keys()].sort());
const states = [...new Set(districts.map((row) => row.stateAbbr))].map((stateAbbr) => {
  const rows = districts.filter((row) => row.stateAbbr === stateAbbr);
  const mean = rows.reduce((sum, row) => sum + row.districtLeanDMinusR, 0) / rows.length;
  return { stateAbbr, districtCount: rows.length, statewideBaselineLeanDMinusR: mean };
});
for (const [index, row] of sourceRows.entries()) {
  const district = districts[index], state = states.find((entry) => entry.stateAbbr === row.State_Abbr);
  assert.ok(Math.abs(signed(row.Statewide_Baseline_Lean) - state.statewideBaselineLeanDMinusR) <= 0.051, row.District_ID + ': state mean');
  assert.ok(Math.abs(signed(row.District_vs_State_Delta) - (district.districtLeanDMinusR - state.statewideBaselineLeanDMinusR)) <= 0.051, row.District_ID + ': district vs state');
}
assert.equal(districts.filter((row) => row.ownerShiftDMinusR !== 0).length, 146);
const output = { version: 1, revision: 'cook-2026-owner-shifts-v1', ownerSourceThreadId: '01a1dc74-cfe0-7e60-8d16-869b53a1a1d2',
  ownerArtifactRevisionDate: '2026-11-14', importedOn: '2026-11-17', signConvention: 'positive Democratic; negative Republican; points',
  formula: '2 * signed 2026 Cook PVI + owner state shift', stateBaselineFormula: 'unweighted mean of adjusted district leans within state',
  artifactSha256: sha256(csvText), cookPrimarySnapshotSha256: sha256(primaryText), originalVoteInputSha256: sha256(originalText),
  sourceArtifact: 'data-import/pvi/owner-approved-2026-11-14.csv', cookPrimarySnapshot: 'data-import/pvi/cook-primary-2026-11-17.json',
  status: 'all-435-primary-values-and-owner-formula-verified', shiftedDistricts: 146, shiftedStates: 12, states, districts };
await writeFile(path.join(app, 'src/data/build45HousePvi.json'), JSON.stringify(output, null, 2) + '\n');
await writeFile(path.resolve(app, '../evidence/data/pvi-import-validation.json'), JSON.stringify({ ...output, districts: districts.map((row) => ({ ...row,
  originalVoteDerivedLean: originalById.get(row.id).districtLeanDMinusR,
  adjustedMinusOriginal: row.districtLeanDMinusR - originalById.get(row.id).districtLeanDMinusR,
  affectedTests: ['tests/build45/data-pvi.mjs'], open: 'No certified vote change; geographic polygon verification outside this identifier-based catalog' })) }, null, 2) + '\n');
console.log(JSON.stringify({ rows: districts.length, primaryVerified: primaryById.size, shiftedDistricts: output.shiftedDistricts, states: states.length, artifactSha256: output.artifactSha256 }));
