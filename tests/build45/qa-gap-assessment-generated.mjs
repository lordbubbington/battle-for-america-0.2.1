import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILD45_CERTIFIED_HOUSE_STAGING } from '../../src/data/build45CertifiedHouseStaging.js';
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.resolve(app, '..');
const read = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const house = await read('build35/src/data/houseDistrictBaselines.json');
const classes = await read('evidence/qa/data/legislature-final-class-audit.json');
const sources = {
  caCertification: { url: 'https://www.sos.ca.gov/elections/upcoming-elections/general-election-november-3-2026/', retrievedOn: '2026-11-17',
    finding: 'County final official results due2026-12-03; statewide certification2026-12-11; canvass still ongoing.' },
  deIndex: { url: 'https://elections.delaware.gov/results/', retrievedOn: '2026-11-17', finding: 'Index labels GE2026official, but linkedENR explicitly saysUnofficialResults and warns precinct completion is not certification.' },
  deEnr: { url: 'https://elections.delaware.gov/results/enr/GE2026.html', retrievedOn: '2026-11-17', finding: 'Conflicting labeling; official export/certificate must be inspected rather than accepting index label.' },
  flCalendar: { url: 'https://floridaelectionwatch.gov/Timeline/EN/', retrievedOn: '2026-11-17', finding: 'State commission scheduled2026-11-17at08:00; meeting schedule alone does not establish certified export contents.' },
  wyOfficial: { url: 'https://sos.wyo.gov/Elections/Docs/2026/Results/General/2026_General_Statewide_Candidates_Summary.pdf', retrievedOn: '2026-11-17', finding: 'Official summary supplies WY01D61689/R99906 plus other/write-in/over-under votes; source row staged separately.' },
  clerkIndex: { url: 'https://clerk.house.gov/Members/ViewElectionInformation', retrievedOn: '2026-11-17', finding: 'No complete2026compilation on inspected page; not evidence that every state lacks official results.' },
};
const houseRows = house.districts.map((row) => {
  let districtStatus = 'recoverable-research-not-yet-completed';
  let next = 'Locate official state-certified2026district totals and compare exact2026district boundary identity; no unavailability assertion for unsearched state.';
  let source = sources.clerkIndex;
  if (row.stateAbbr === 'CA') { districtStatus = 'genuine-publication-dependency'; source = sources.caCertification; next = 'Obtain final state-certified totals after stated2026-12-11certification; provisional ENR is not certified.'; }
  if (row.stateAbbr === 'DE') { districtStatus = 'recoverable-source-label-conflict'; source = sources.deEnr; next = 'Inspect official export/canvass record; index label does not override explicitunofficialENRbanner.'; }
  if (row.stateAbbr === 'FL') { districtStatus = 'recoverable-certification-export-check'; source = sources.flCalendar; next = 'Verify actual commission certification and published district export; calendar alone not sufficient.'; }
  if (row.id === 'WY-01') { districtStatus = 'official-district-input-available-staged'; source = sources.wyOfficial; next = 'Vote/boundary row is staged; do not substitute until compatible national2026two-party denominator is accepted.'; }
  return { id: row.id, stateAbbr: row.stateAbbr, originalSourceYear: row.sourceYear, originalSourceUrl: row.sourceUrl, originalRetrievalDate: row.retrievedAt,
    originalBaselineStatus: row.baselineStatus, districtStatus, officialResearchSource: source, nextAction: next,
    sharedBlocker: 'Complete compatible official2026nationaltwo-party baseline notyetavailable; CAfinalcertificationdate2026-12-11. Staged district votes cannot by themselves produce a verified district-relative lean.',
    substituted: false, currentPviStatus: 'separate owner-adjusted PVI forecast source already integrated; no vote-provenance replacement',
    affectedTests: ['tests/build45/data-validation.mjs', 'tests/build45/data-gap-assessment.mjs'], checkedOn: '2026-11-17' };
});
assert.equal(houseRows.length, 435); assert.equal(houseRows.filter((row) => row.stateAbbr === 'CA').length, 52);
assert.equal(houseRows.filter((row) => row.originalSourceYear === 2026).length, 314);
assert.equal(houseRows.filter((row) => row.originalSourceYear === 2024).length, 121);
for (const row of BUILD45_CERTIFIED_HOUSE_STAGING) {
  assert.equal(row.eligibleForSubstitution, false); assert.equal(row.districtLeanDMinusR, null); assert.equal(row.nationalGenericMarginDMinusR, null);
  assert.ok(Number.isInteger(row.demVotes) && Number.isInteger(row.repVotes) && row.demVotes > 0 && row.repVotes > 0);
  assert.equal(row.demVotes + row.repVotes, 161595);
  assert.ok(Math.abs(row.resultMarginDMinusR - 100 * (row.demVotes - row.repVotes) / (row.demVotes + row.repVotes)) < 1e-12);
}
const legal = [
  { id: '048', kind: 'Green-presidential-petition', needed: ['Official applicable Green ticket recognition/route/election/deadline/threshold', 'Actual matching2028filing ID and verified signature count', 'Committed native receipt matching record'], recoverableNow: 'Party-route statutory research and future record schema. Do not assume independent route applies to recognized party.', futureDependency: 'No actual qualifying2028campaign filing supplied or verified in this audit.' },
  { id: '096', kind: 'minor-party-presidential-petition', needed: ['Official state and party-specific route/election/deadline/threshold', 'Actual matching2028filing ID and verified shortfall', 'Committed native receipt matching record'], recoverableNow: 'State/party route research and validator population only on verified applicable facts.', futureDependency: 'Actual2028filing evidence has not been supplied or verified.' },
  { id: '097', kind: 'ballot-challenge', needed: ['Official identified filing', 'Official challenge ID, claim, election, state and applicable route', 'Native committed challenge receipt'], recoverableNow: 'Challenge procedure statutes; validated adapter exists.', futureDependency: 'No actual2028challenge linked to a matching filing supplied or verified; cannot manufacture case.' },
  { id: '099', kind: 'polling-place-change', needed: ['Official2028election administration notice with validity date', 'Precinct and old/new polling locations', 'Native same-state committed notice receipt'], recoverableNow: 'Official notice ingestion criteria and local source registry research.', futureDependency: 'No matching2028precinct relocation notice supplied or verified.' },
  { id: '100', kind: 'administration-correction', needed: ['Official2028notice and correction', 'Identified local-story false claim', 'Native committed correction receipt tied to both'], recoverableNow: 'Official correction-source workflow and claim-binding rules.', futureDependency: 'No matching2028official correction and identified local claim supplied or verified.' },
  { id: '069-official-lane', kind: 'real-qualified-measure-conflict', needed: ['Official qualified measure record for exact election', 'Provision and saved pledge conflict', 'Native qualification/effect receipt'], recoverableNow: 'California distinguishes eligible from qualified. Real measure qualification must be verified individually.', futureDependency: 'CA1995iseligiblefor2028butnotyetqualified on inspected source; no matching pledged provision/receipt.', fictionalDraw: 'Owner-approved Republican fictional#069unchanged; not an official gate closure.' },
].map((row) => ({ ...row, status: 'OPEN', retrievedOn: '2026-11-17', sourceUrls: ['https://elections.wi.gov/candidates/getting-ballot', 'https://docs.legis.wisconsin.gov/statutes/statutes/8/20', 'https://www.sos.ca.gov/elections/ballot-measures/initiative-and-referendum-status/eligible-statewide-initiative-measures'],
  bounds: 'Background law, synthetic fixture or modeled receipt is not evidence of an actual filing/notice/case.', affectedTests: ['tests/build45/data-validation.mjs'], productionStockRecords: 0 }));
const output = { asOf: '2026-11-17', releaseDisposition: 'UNRELEASED: remaining sources and acceptance below stay in scope',
  'B33-34-02': { status: 'OPEN', gates: legal },
  'B33-34-03': { status: 'OPEN', classesResolved: 187, regularClassesMissing: classes.remainingNullClasses,
    classRowsNewOfficial: classes.officialNewClassRows, correctedKnownClassCount: classes.correctedKnownClassCount,
    remainingPrimaryClassRevalidationChambers: classes.independentPrimaryClassAuditRemainingChambers,
    sourceAudit: 'legislature-final-class-audit.json enumerates all99chambers/all7386seats and exact source/status per row.',
    remainingRecoverable: 'Primary term/class/special-election source revalidation of87retained chambers; certified current seat holder/party/appointment/vacancy roster joins for all99chambers. These are not all unavailable.',
    genuineFutureDependencies: 'Actual2027election results in LA/MS/NJ/VA are not yetheld asof2026-11-17; statewide2026certification still pending in some states including CA. Future unannounced special elections cannot be represented as facts.' },
  'B33-34-04': { status: 'OPEN', replacedRows: 0, originalSourceCounts: { currentUnofficial2026: 314, historical2024Proxy: 121 }, sources,
    officialStagedRows: BUILD45_CERTIFIED_HOUSE_STAGING, rows: houseRows,
    noReplacementReason: 'A district-certified numerator is not a complete compatible nationaldenominator. No inventedvotes, no provisional nationalmargin relabeledofficial.' } };
await writeFile(path.join(root, 'evidence/qa/data/final-source-gap-assessment.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ legalGates: legal.length, nullClassesRemaining: classes.remainingNullClasses, primaryClassRevalidationRemainingChambers: classes.independentPrimaryClassAuditRemainingChambers,
  officialHouseDistrictsStaged: BUILD45_CERTIFIED_HOUSE_STAGING.length, houseReplaced: 0, exactHouseGapRows: houseRows.length, californiaFutureCertificationRows: 52 }));
