import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const evidence = path.resolve(app, '../evidence');
const read = async (file) => JSON.parse(await readFile(file, 'utf8'));
const baseline = await read(path.join(evidence, 'build44-baseline-B/interruption-matrix.json'));
const mapping = await read(path.join(app, 'src/data/build40EventMappings.json'));
const native = await read(path.join(evidence, 'data/native-path-results.json'));
const preservation = await read(path.join(evidence, 'qa/native-preservation.json'));
const eligibility = await readFile(path.join(app, 'src/lib/build40DecisionEligibility.js'), 'utf8');
const section = eligibility.slice(eligibility.indexOf('const incidentRules'), eligibility.indexOf('export function build40Notice'));
const predicates = new Map([...section.matchAll(/^  '(\d+)': ([\s\S]*?),\r?\n(?=  '\d+'|};)/gm)].map(([, number, predicate]) => [number, predicate.replace(/\s+/g, ' ')]));
const matrix = baseline.matrix.map((old) => {
  const row = mapping.find(({ id }) => id === old.id); assert.ok(row, old.id);
  const number = old.id.split('-')[1];
  const workerWitness = native.results[number];
  const qaWitness = preservation.byId[number];
  const witness = workerWitness?.nativePositive ? workerWitness : qaWitness?.nativePositive ? qaWitness : workerWitness || null;
  const contract = witness?.independentContract;
  const focusedPass = workerWitness?.nativePositive
    ? ['staleRejected', 'savedPending', 'resolvedOnce', 'noReceiptRejected', 'wrongCampaignRejected', 'missingPendingRejected', 'mutatedPendingRejected'].every((key) => workerWitness[key] === true)
    : contract && ['noSource', 'stale', 'crossCampaign', 'pendingResume', 'targetPreserved', 'settledResume', 'missingPendingRetired', 'changedPendingRetired', 'onceOnly'].every((key) => contract[key] === true);
  const predicate = predicates.get(number) || old.predicate;
  return { id: old.id, authorSource: old.source, activeRoute: old.activeRoute, modeAndParty: old.modeAndParty,
    authoredConversion: old.activeRoute === 'authored-draw' ? { source: old.source, rationale: number === '069' ? 'Owner-approved fictional Republican same-state draw; official lane separate' : 'Build 40 authored general/party draw replacement; preserve original authored choice packages' } : null,
    triggerPredicate: predicate, payloadFields: [...new Set([...predicate.matchAll(/\bp(?:ayload)?\.([\w?.]+)/g)].map((match) => match[1].replaceAll('?', '')))],
    committedProducer: number === '049' ? 'Native answerDebate -> debate-answer.payload.promise -> saved promiseLedger join -> build40FactionCalendar -> faction-schedule' : old.stockWriter,
    producerContext: old.producerContext, campaignIdentity: 'receipt.campaignId == game.build34CampaignId; receipt.sourceReceiptId == receipt.id; provenanceVersion 2',
    target: old.stateBinding, dynamicTargets: row.targetRules || old.dynamicTargets,
    weekWindow: old.activeRoute === 'authored-draw' ? 'No receipt; once per campaign draw' : 'Current or previous selection week; pending resolution checks saved selectionWeek and immutable selectionEvidence; legacy predicate may impose additional bounds',
    onceKeys: old.activeSaveKeys, legalDependency: number === '069' ? 'Fictional; not an official gate closure' : old.officialDependency,
    baselineEvidence: old.fixture, freshEvidence: witness,
    freshEvidenceSource: workerWitness?.nativePositive ? 'evidence/data/native-path-results.json' : qaWitness?.nativePositive ? 'evidence/qa/native-preservation.json' : null,
    disposition: old.activeRoute === 'authored-draw' ? 'preserved authored draw' : old.officialDependency ? 'OPEN: official record unavailable; production fail-closed'
      : witness?.nativePositive ? (focusedPass ? 'native witness and focused checks pass' : 'native witness exists; final integrated freshness/pending checks required')
        : old.fixture?.nativePositive ? 'baseline native witness retained; broader integrated recheck OPEN' : 'OPEN: no reproduced native witness',
    command: 'node tests/build45/data-native.mjs; node tests/build45/data-validation.mjs; node tests/build45/data-matrix.mjs' };
});
assert.equal(matrix.length, 100); assert.equal(new Set(matrix.map(({ id }) => id)).size, 100);
assert.equal(matrix.filter((row) => row.activeRoute !== 'authored-draw').length, 59);
assert.equal(matrix.filter((row) => row.activeRoute === 'authored-draw').length, 41);
const nativePassCount = matrix.filter((row) => row.activeRoute !== 'authored-draw' && row.disposition === 'native witness and focused checks pass').length;
assert.equal(native.nativePositiveCount, 12, 'Final full-catalog native fixture must prove twelve paths');
assert.equal(native.catalogIsolation?.candidateIds, 300, 'Final native evidence must isolate all 300 candidate cards');
assert.equal(nativePassCount, 54, '54 nonlegal receipt routes have current native positives and independent contracts');
await writeFile(path.join(evidence, 'data/native-receipt-matrix.json'), JSON.stringify({ generatedOn: '2026-11-17', status: '54 native receipt routes focused PASS; five official record gates OPEN; 41 authored draws preserved', nativePassCount, matrix }, null, 2) + '\n');
console.log(JSON.stringify({ mappedIds: 100, receiptRoutes: 59, authoredDraws: 41, nativeWitnessesThisRun: native.nativePositiveCount, combinedCurrentNativePassCount: nativePassCount, officialDataGatesOpen: 5 }));
