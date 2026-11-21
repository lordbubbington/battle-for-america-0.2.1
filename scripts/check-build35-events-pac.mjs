import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({
  configLoader: 'runner',
  configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
  root,
  cacheDir: './.vite-build35-events-pac-check',
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { disabled: true },
  server: { middlewareMode: true, hmr: false, ws: false },
});

try {
  const events = await server.ssrLoadModule('/src/data/triggeredEvents.js');
  const catalog = await server.ssrLoadModule('/src/lib/triggeredEventCatalog.js');
  const producers = await server.ssrLoadModule('/src/lib/triggeredEventProducers.js');
  const ledger = await server.ssrLoadModule('/src/lib/incidentLedger.js');
  const pacRules = await server.ssrLoadModule('/src/lib/superPacRules.js');
  const statesModule = await server.ssrLoadModule('/src/data/states.js');

  const catalogCheck = events.validateTriggeredEventDefinitions();
  assert.equal(catalogCheck.valid, true, catalogCheck.errors.join('\n'));
  assert.equal(catalogCheck.total, 100);
  assert.deepEqual(catalogCheck.counts, {
    'incident-backed': 16,
    'reference-data-gated': 6,
    'disabled-pending-producer': 78,
  });
  assert.ok(events.TRIGGERED_EVENT_DEFINITIONS.every((definition) => definition.trigger && definition.auditReason));
  assert.ok(events.TRIGGERED_EVENT_DEFINITIONS.filter((definition) => !definition.enabled)
    .every((definition) => definition.trigger.enabled === false && definition.trigger.diagnostic));
  const invalidPredicateCatalog = events.TRIGGERED_EVENT_DEFINITIONS.map((definition, index) => index === 0
    ? { ...definition, trigger: { ...definition.trigger, predicateId: 'unknown-predicate' } }
    : definition);
  assert.equal(events.validateTriggeredEventDefinitions(invalidPredicateCatalog).valid, false, 'unknown predicates fail catalog validation');
  const invalidEvidenceCatalog = events.TRIGGERED_EVENT_DEFINITIONS.map((definition, index) => index === 0
    ? { ...definition, incidentDisplay: { ...definition.incidentDisplay, evidenceFields: ['payload.unavailable'] } }
    : definition);
  assert.equal(events.validateTriggeredEventDefinitions(invalidEvidenceCatalog).valid, false, 'unavailable evidence fields fail catalog validation');

  const campaignId = 'build35-dev2-event-test';
  const game = { build34CampaignId: campaignId, week: 1, totalWeeks: 14, promiseLedger: [] };
  const receipt = {
    id: 'w1-debate-answer-1',
    incidentId: 'w1-debate-answer-1',
    sourceReceiptId: 'w1-debate-answer-1',
    campaignId,
    provenanceVersion: 2,
    sourceType: 'debate-answer',
    sourceId: 'debate-1',
    week: 1,
    state: null,
    stateId: null,
    recap: 'The debate answer produced a recorded scandal.',
    payload: {
      question: 'How will you address the issue?',
      answer: 'A direct answer from the candidate.',
      reply: 'The opponent challenged the answer.',
      scandal: { level: 'major' },
    },
  };
  const gaffe = events.TRIGGERED_EVENT_BY_ID['interrupt-001-gaffe-clip'];
  assert.equal(gaffe.when(receipt, game), true, 'registered predicate accepts exact receipt evidence');
  assert.equal(catalog.matchTriggeredEventDefinitions(receipt, game).length, 1);
  const produced = catalog.triggeredResponsesForReceipt(receipt, game);
  assert.equal(produced.length, 1);
  assert.equal(produced[0].campaignId, campaignId);
  assert.equal(produced[0].incidentId, receipt.id);
  assert.equal(produced[0].sourceReceiptId, receipt.id);
  assert.equal(produced[0].sourceType, receipt.sourceType);
  assert.equal(produced[0].sourceWeek, receipt.week);
  assert.equal(catalog.validateTriggeredEventProvenance(produced[0].event, receipt, game), true);
  const separateIncident = { ...receipt, incidentId: 'committed-incident-1' };
  assert.equal(catalog.triggeredResponsesForReceipt(separateIncident, game)[0]?.incidentId, 'committed-incident-1',
    'a committed incident may have an ID distinct from its source receipt');
  assert.equal(catalog.validateTriggeredEventResolution({
    event: produced[0].event,
    choice: produced[0].event.choices[0],
    sourceReceipt: receipt,
    game,
  }), true, 'choice resolution validates event identity, source, evidence, and selected choice');
  const plannedChoice = catalog.planTriggeredEventResolution({
    event: produced[0].event, choice: produced[0].event.choices[0], sourceReceipt: receipt, game,
  });
  assert.equal(plannedChoice.valid, true);
  assert.equal(plannedChoice.duplicate, false);
  const savedAppliedIds = JSON.parse(JSON.stringify([plannedChoice.receiptId]));
  const repeatedChoice = catalog.planTriggeredEventResolution({
    event: produced[0].event, choice: produced[0].event.choices[0], sourceReceipt: receipt, game,
    appliedReceiptIds: savedAppliedIds,
  });
  assert.equal(repeatedChoice.duplicate, true);
  assert.equal(repeatedChoice.choice, null, 'a saved choice receipt makes replay inert');

  const missingCampaignReceipt = { ...receipt, campaignId: undefined };
  const wrongCampaignReceipt = { ...receipt, campaignId: 'other-campaign' };
  const wrongReceiptLink = { ...receipt, sourceReceiptId: 'another-receipt' };
  assert.deepEqual(catalog.triggeredResponsesForReceipt(missingCampaignReceipt, game), []);
  assert.deepEqual(catalog.triggeredResponsesForReceipt(wrongCampaignReceipt, game), []);
  assert.deepEqual(catalog.triggeredResponsesForReceipt(wrongReceiptLink, game), []);
  assert.deepEqual(catalog.triggeredResponsesForReceipt(receipt, { ...game, week: 4 }), [],
    'an expired receipt cannot trigger a new event');
  assert.deepEqual(catalog.triggeredResponsesForReceipt({
    ...receipt,
    payload: { ...receipt.payload, scandal: undefined },
  }, game), [], 'missing evidence does not fill an event slot');
  assert.deepEqual(catalog.triggeredResponsesForReceipt(receipt, game, [gaffe.onceKey]), [], 'once-only receipt suppresses a repeat');

  const queuedOnce = catalog.queueTriggeredEventResponses(receipt, game);
  const queuedTwice = catalog.queueTriggeredEventResponses(receipt, game, queuedOnce);
  assert.equal(queuedOnce.length, 1);
  assert.equal(queuedTwice.length, 1, 'duplicate receipt does not duplicate the queued event');
  const loadedQueue = JSON.parse(JSON.stringify(queuedTwice));
  assert.equal(catalog.validateTriggeredEventProvenance(loadedQueue[0].event, receipt, game), true,
    'source evidence survives JSON save/load');
  const editedEvent = JSON.parse(JSON.stringify(loadedQueue[0].event));
  editedEvent.evidenceSnapshot.fields['payload.answer'] = 'edited after queueing';
  assert.equal(catalog.validateTriggeredEventProvenance(editedEvent, receipt, game), false,
    'choice resolver can reject edited evidence');
  const wrongEvent = { ...produced[0].event, id: 'response-for-another-event' };
  assert.equal(catalog.validateTriggeredEventProvenance(wrongEvent, receipt, game), false,
    'choice resolver rejects an event ID that does not match its definition and source');
  const missingEvidence = JSON.parse(JSON.stringify(produced[0].event));
  delete missingEvidence.evidenceSnapshot.fields['payload.answer'];
  delete missingEvidence.provenance.evidenceSnapshot.fields['payload.answer'];
  assert.equal(catalog.validateTriggeredEventProvenance(missingEvidence, receipt, game), false,
    'removing a required saved evidence field from both copies is rejected');
  assert.equal(catalog.validateTriggeredEventResolution({
    event: produced[0].event,
    choice: { ...produced[0].event.choices[0], effects: { funds: 999 } },
    sourceReceipt: receipt,
    game,
  }), false, 'altered choice effects cannot pass the resolution validator');

  const newsReceipt = {
    ...receipt,
    id: 'w1-opponent-plan-2',
    incidentId: 'w1-opponent-plan-2',
    sourceReceiptId: 'w1-opponent-plan-2',
    sourceType: 'opponent-plan',
    sourceId: 'rival-plan',
    payload: { rivalNewsIncident: { storyId: 'fact-check-reversal', evidenceType: 'published fact check', evidence: 'A sourced correction.', eventTitle: 'Rival statement' } },
  };
  const newsGame = {
    ...game,
    rivalIncidentNewsCard: { receiptId: newsReceipt.id, rivalStoryId: 'fact-check-reversal', headline: 'Correction published', effectApplied: true },
    rivalIncidentNewsReceiptIds: [newsReceipt.id],
  };
  const newsEvent = catalog.triggeredResponsesForReceipt(newsReceipt, newsGame)[0]?.event;
  assert.ok(newsEvent, 'a published correction with a linked committed receipt can trigger its response');
  assert.equal(catalog.validateTriggeredEventProvenance(newsEvent, newsReceipt, {
    ...newsGame, rivalIncidentNewsCard: { headline: 'A later story' },
  }), true, 'saved correction evidence survives a later news card');

  const legacyReceipt = { ...receipt };
  delete legacyReceipt.provenanceVersion;
  assert.equal(producers.isCommittedIncidentReceipt(legacyReceipt, game), false,
    'legacy receipts without committed provenance cannot create follow-ups');
  assert.equal(producers.isCommittedIncidentReceipt({ ...receipt, triggerEligible: false }, game), false,
    'legacy active events can be allowed to finish without triggering another response');
  const before = JSON.stringify(receipt);
  assert.equal(producers.addSimulatedTriggeredEvidence(receipt, game, () => 0), receipt,
    'deprecated random producer is an identity adapter');
  assert.equal(JSON.stringify(receipt), before, 'receipt producer never adds simulated evidence');

  const previous = {
    week: 1,
    build34CampaignId: campaignId,
    candidateId: 'candidate-a',
    startId: 'aug',
    incidentLedger: [],
    incidentSequence: 0,
    pendingInterrupts: [],
    triggeredEventOnceKeys: [],
  };
  const resolved = {
    ...previous,
    debate: {
      id: 'debate-1',
      verdict: 'loss',
      picks: [{
        question: 'How will you address the issue?',
        answer: 'A direct answer from the candidate.',
        reply: 'The opponent challenged the answer.',
        scandal: { level: 'major' },
      }],
    },
  };
  const committed = ledger.recordIncident(previous, resolved, { type: 'debate' });
  const committedReceipt = committed.incidentLedger.at(-1);
  assert.equal(committedReceipt.provenanceVersion, 2);
  assert.equal(committedReceipt.campaignId, campaignId);
  assert.equal(committedReceipt.sourceReceiptId, committedReceipt.id);
  assert.equal(committedReceipt.incidentId, committedReceipt.id);
  assert.equal(committedReceipt.payload.triggerEvidence, undefined,
    'recording a real debate outcome does not append a simulated incident');
  assert.equal(committed.pendingInterrupts.length, 2, 'a real debate receipt can support each matching registered event predicate');
  assert.ok(committed.pendingInterrupts.every((item) => item.event.provenance?.sourceReceiptId === committedReceipt.id));

  const pac = {
    id: 'pac-dev2-fixture',
    name: 'Fixture PAC',
    alignment: 'dem',
    beneficiaryParty: 'dem',
    candidateId: 'candidate-dem',
    issueIds: ['economy'],
    issueWeights: { economy: 1 },
    preferredStance: 1,
    regionWeights: { midwest: 1, northeast: 1, south: 1, west: 1 },
    generalFatiguePerAd: 1,
  };
  const pacStates = statesModule.STATES.map((state) => ({
    id: state.abbr,
    region: state.region,
    marginByParty: { dem: 4, rep: -4 },
    issueAgreementById: { economy: 0.7 },
  }));
  const scheduleArgs = { campaignId, weekNumber: 1, totalWeeks: 14, pac, states: pacStates };
  const scheduleA = pacRules.scheduleSuperPacAggregates(scheduleArgs);
  const scheduleB = pacRules.scheduleSuperPacAggregates(scheduleArgs);
  assert.deepEqual(scheduleA, scheduleB, 'campaign/week/PAC seed replays the same aggregate schedule');
  assert.equal(scheduleA.requestedCount, 3, 'first-week nominal schedule remains three placements');
  assert.equal(scheduleA.scheduledCount, 3);
  assert.equal(scheduleA.aggregates.reduce((sum, item) => sum + item.placementCount, 0), 3);
  assert.equal(new Set(scheduleA.aggregates.map((item) => item.placementId)).size, scheduleA.aggregates.length);
  assert.ok(scheduleA.aggregates.every((item) => item.effectMultiplier === 0.2
    && item.fatigueChannel === 'general'
    && item.schemaVersion === pacRules.SUPER_PAC_AGGREGATE_SCHEMA_VERSION
    && item.totalEffectivePressure <= pacRules.SUPER_PAC_GROUP_PRESSURE_CAP));
  assert.ok(scheduleA.aggregates.every((item) => item.placementCount !== 1 || item.totalEffectivePressure === item.meanQuality),
    'a single placement keeps its own quality regardless of its position in the weekly schedule');
  assert.equal(new Set(scheduleA.aggregates.map((item) => `${item.stateId}:${item.adType}`)).size,
    scheduleA.aggregates.length, 'a PAC does not repeat an ad type in a state during the week');

  const finalWeek = pacRules.scheduleSuperPacAggregates({ ...scheduleArgs, weekNumber: 14 });
  assert.equal(finalWeek.requestedCount, 20, 'final-week nominal schedule remains twenty placements');
  assert.equal(finalWeek.scheduledCount + finalWeek.shortfall, 20);
  const noTargets = pacRules.resolveSuperPacWeek({ ...scheduleArgs, pacs: [pac], states: [] });
  assert.equal(noTargets.digest.shortfall, 3, 'missing target states produce a reported scheduling shortfall');
  assert.equal(noTargets.pacScheduleSummaries[0].pacId, pac.id, 'shortfalls retain their PAC identity');
  assert.equal(scheduleA.aggregates.reduce((sum, item) => sum + item.totalGeneralFatiguePoints, 0), 3,
    'general fatigue preserves per-placement fatigue');
  const fatigueGroups = pacRules.aggregateSuperPacFatigue(scheduleA.aggregates);
  assert.equal(fatigueGroups.reduce((sum, item) => sum + item.totalGeneralFatiguePoints, 0), 3);
  assert.ok(fatigueGroups.every((item) => item.fatigueChannel === 'general'));

  const manyRepeatedPlacements = Array.from({ length: 20 }, (_, placementIndex) => ({
    pacId: pac.id,
    stateId: 'PA',
    issueId: 'economy',
    adType: 'attack',
    targetCandidateId: 'candidate-rep',
    beneficiaryParty: 'dem',
    week: 4,
    quality: 1,
    placementIndex,
    fatiguePoints: 1,
  }));
  const capped = pacRules.aggregateSuperPacPlacements(manyRepeatedPlacements, { campaignId, weekNumber: 4 });
  assert.equal(capped.length, 1, 'identical placements collapse to one group');
  assert.equal(capped[0].placementCount, 20);
  assert.equal(capped[0].totalEffectivePressure, pacRules.SUPER_PAC_GROUP_PRESSURE_CAP,
    'group pressure has a hard cap');
  assert.ok(capped[0].meanQuality > 0 && capped[0].meanQuality <= 1.5);
  assert.equal(capped[0].effectMultiplier * capped[0].totalEffectivePressure, 0.8,
    'twenty identical ads resolve to at most 0.8 campaign-ad equivalents');
  const targetedAggregate = pacRules.scheduleSuperPacAggregates({
    ...scheduleArgs,
    weekNumber: 14,
    pac: { ...pac, targetCandidateByParty: { dem: 'candidate-rep' } },
  }).aggregates.find((item) => item.adType === 'attack');
  assert.equal(targetedAggregate?.targetCandidateId, 'candidate-rep', 'attack aggregate retains a supplied target candidate ID');

  const cohort = Array.from({ length: 50 }, (_, index) => ({ ...pac, id: `mix-${index}` }));
  let attacks = 0;
  let total = 0;
  for (let campaignIndex = 0; campaignIndex < 20; campaignIndex += 1) {
    const week = pacRules.resolveSuperPacWeek({
      campaignId: `mix-campaign-${campaignIndex}`,
      weekNumber: 1,
      totalWeeks: 14,
      pacs: cohort,
      states: pacStates,
    });
    attacks += week.digest.attackAds;
    total += week.digest.totalPlacements;
    assert.equal(Object.hasOwn(week.digest, 'ads'), false, 'digest stores no individual or grouped ad payloads');
    assert.equal(week.digest.aggregateCount, week.aggregates.length);
  }
  const attackShare = attacks / total;
  assert.ok(attackShare > 0.75 && attackShare < 0.85, `attack share should remain near 80% (got ${attackShare})`);

  const legacyWeek = {
    campaignId: 'legacy-campaign',
    week: 3,
    ads: [
      { adId: 'old-ad-1', pacId: 'old-pac', stateId: 'PA', issueId: 'economy', adType: 'attack', quality: 1, fatiguePoints: 1, realizedEffect: 0.2 },
      { adId: 'old-ad-2', pacId: 'old-pac', stateId: 'PA', issueId: 'economy', adType: 'attack', quality: 0.8, fatiguePoints: 1, realizedEffect: 0.16 },
    ],
    digest: { totalAds: 2, requestedAds: 2, attackAds: 2, proAds: 0 },
  };
  const converted = pacRules.convertLegacySuperPacWeekReceipt(legacyWeek);
  assert.equal(converted.schemaVersion, pacRules.SUPER_PAC_AGGREGATE_SCHEMA_VERSION);
  assert.equal(converted.aggregates.length, 1);
  assert.equal(converted.aggregates[0].placementCount, 2);
  assert.deepEqual(new Set(converted.appliedReceiptIds), new Set(['old-ad-1', 'old-ad-2', converted.aggregates[0].effectReceiptId]));
  assert.equal(converted.effectsAlreadyApplied, true);
  assert.deepEqual(converted.pendingEffectReceiptIds, [], 'legacy migration cannot reapply already-recorded effects');
  assert.equal(pacRules.convertLegacySuperPacWeekReceipt(converted), converted, 'legacy conversion is idempotent');
  assert.equal(Object.hasOwn(converted.digest, 'ads'), false);

  console.log('Build 35 Dev 2 checks passed: 100 event definitions audited (16 enabled, 6 data-gated, 78 disabled); event provenance and PAC aggregate rules verified.');
} finally {
  await server.close();
}
