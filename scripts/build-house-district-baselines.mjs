import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const importDir = resolve('data-import');
const [current, historical] = await Promise.all([
  readFile(resolve(importDir, '2026-house-votes-wikipedia-provisional.json'), 'utf8').then(JSON.parse),
  readFile(resolve(importDir, '2024-house-votes-wikipedia-historical.json'), 'utf8').then(JSON.parse),
]);

const byId = (dataset) => new Map(dataset.districts.map((district) => [district.id, district]));
const currentById = byId(current);
const historicalById = byId(historical);
const hasVotes = (row) => Number.isFinite(row?.demVotes) && Number.isFinite(row?.repVotes) && row.demVotes + row.repVotes > 0;

const districts = current.districts.map((currentDistrict) => {
  const historicalDistrict = historicalById.get(currentDistrict.id);
  const selected = hasVotes(currentDistrict)
    ? { row: currentDistrict, source: current, year: 2026, baselineStatus: 'current-unofficial' }
    : hasVotes(historicalDistrict)
      ? { row: historicalDistrict, source: historical, year: 2024, baselineStatus: 'historical-fallback' }
      : null;
  if (!selected) throw new Error(`No reported baseline exists for ${currentDistrict.id}.`);

  const resultMarginDMinusR = 100 * (selected.row.demVotes - selected.row.repVotes)
    / (selected.row.demVotes + selected.row.repVotes);
  const nationalMarginDMinusR = selected.source.nationalGenericMarginDMinusR;
  if (!Number.isFinite(nationalMarginDMinusR)) throw new Error(`No national generic ballot margin for ${selected.year}.`);

  return {
    id: currentDistrict.id,
    stateAbbr: currentDistrict.stateAbbr,
    state: currentDistrict.state,
    districtNumber: currentDistrict.districtNumber,
    name: currentDistrict.districtName,
    seats: currentDistrict.seatCount,
    demVotes: selected.row.demVotes,
    repVotes: selected.row.repVotes,
    resultMarginDMinusR: Math.round(resultMarginDMinusR * 10000) / 10000,
    nationalGenericMarginDMinusR: Math.round(nationalMarginDMinusR * 10000) / 10000,
    districtLeanDMinusR: Math.round((resultMarginDMinusR - nationalMarginDMinusR) * 10000) / 10000,
    sourceYear: selected.year,
    baselineStatus: selected.baselineStatus,
    reportingPercent: selected.row.reportingPercent,
    certificationStatus: selected.row.certificationStatus,
    sourceTitle: selected.row.sourceTitle,
    sourceUrl: selected.row.sourceUrl,
    nationalSourceUrl: selected.source.source,
    retrievedAt: selected.source.retrievedAt,
    formula: '100*(D-R)/(D+R) - 100*(nationalD-nationalR)/(nationalD+nationalR)',
    boundaryVintage: selected.year,
  };
});

const ids = new Set(districts.map((district) => district.id));
if (districts.length !== 435 || ids.size !== 435) throw new Error(`Expected 435 unique House districts, got ${districts.length}/${ids.size}.`);
const sourceCounts = districts.reduce((counts, district) => {
  counts[district.sourceYear] = (counts[district.sourceYear] || 0) + 1;
  return counts;
}, {});
const report = {
  source: 'Build 33 House district baseline merge',
  retrievedAt: new Date().toISOString(),
  status: 'complete-coverage-mixed-vintage',
  description: 'Use the currently reported 2026 district vote totals where available. For 2026 districts with no reported two-party totals, use the corresponding 2024 district result relative to the 2024 national two-party House vote. Every row preserves source year and status; historical rows are proxies and are not presented as 2026 results.',
  districtCount: districts.length,
  sourceCounts,
  currentSource: current.source,
  historicalSource: historical.source,
  districts,
};

await writeFile(resolve('src/data/houseDistrictBaselines.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ districtCount: districts.length, sourceCounts, output: 'src/data/houseDistrictBaselines.json' }, null, 2));
