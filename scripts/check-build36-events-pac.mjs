import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({
  configLoader: 'runner',
  configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
  root: fileURLToPath(new URL('../', import.meta.url)),
  cacheDir: './.vite-build36-events-pac-check',
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, ws: false },
});

try {
  const { recordIncident } = await server.ssrLoadModule('/src/lib/incidentLedger.js');
  const { TRIGGERED_EVENT_AUDIT } = await server.ssrLoadModule('/src/data/triggeredEvents.js');
  const {
    planTriggeredEventDispatch,
    planTriggeredEventResolution,
    triggeredResponsesForReceipt,
    validateTriggeredEventCandidate,
    validateTriggeredEventProvenance,
  } = await server.ssrLoadModule('/src/lib/triggeredEventCatalog.js');
  const {
    SUPER_PAC_AGGREGATE_SCHEMA_VERSION,
    convertLegacySuperPacWeekReceipt,
    resolveSuperPacWeek,
  } = await server.ssrLoadModule('/src/lib/superPacRules.js');
  const { STATES } = await server.ssrLoadModule('/src/data/states.js');

  const campaignId = 'build36-events-pac';
  const key = 'triggered-event:interrupt-072-opponent-enters-state';
  const campaign = { build34CampaignId: campaignId, week: 9, incidentLedger: [], pendingInterrupts: [] };
  const neglect = {
    type: 'stop', abbr: 'PA', stateName: 'Pennsylvania', moveText: 'Rival rallied in Pennsylvania',
    effectApplied: true, effectMagnitude: 0.6, playerAttention: 0.1, sourceMargin: 10,
  };
  const stop = { type: 'stop', abbr: 'PA', text: neglect.moveText };
  const rival = (game, move = neglect, moves = [stop]) => recordIncident(game, {
    ...game, lastAd: { abbr: 'AZ' }, lastOpponent: { neglectedStateMove: move }, oppMoves: moves,
  }, { type: 'opponent' });
  const findRivalEvent = (game) => game.pendingInterrupts.find((item) => item.onceKey === key)?.event;

  const fresh = rival(campaign);
  const sourceReceipt = fresh.incidentLedger.at(-1);
  const event = findRivalEvent(fresh);
  assert.ok(event);
  assert.equal(sourceReceipt.state, 'PA', 'the prior player ad cannot relabel the opponent move');
  assert.equal(event.evidenceSnapshot.stateId, 'PA');
  assert.equal(fresh.triggeredEventOnceKeys.includes(key), false, 'queueing alone does not use the once key');
  assert.equal(validateTriggeredEventCandidate(event, sourceReceipt, fresh), true);
  assert.equal(validateTriggeredEventCandidate(event, sourceReceipt, { ...fresh, incidentLedger: [] }), false);
  assert.equal(validateTriggeredEventProvenance(event, sourceReceipt, fresh), false);
  assert.equal(planTriggeredEventResolution({ event, sourceReceipt, game: fresh, choice: event.choices[0] }).valid, false);
  assert.equal(findRivalEvent(rival({ ...campaign, week: 8 })), undefined);
  assert.equal(findRivalEvent(rival(campaign, { ...neglect, sourceMargin: 10.001 })), undefined);
  assert.equal(findRivalEvent(rival(campaign, { ...neglect, sourceMargin: -10.001 })), undefined);
  assert.equal(findRivalEvent(rival(campaign, { ...neglect, sourceMargin: null })), undefined);
  assert.equal(findRivalEvent(rival(campaign, neglect, [{ ...stop, abbr: 'AZ' }])), undefined);
  assert.equal(findRivalEvent(rival(campaign, { ...neglect, effectApplied: false })), undefined);
  assert.ok(findRivalEvent(rival(campaign, { ...neglect, sourceMargin: -10 })), 'both inclusive boundaries qualify');
  assert.equal(rival(fresh).pendingInterrupts.length, 1, 'a queued event owns only one pending candidate');
  assert.equal(findRivalEvent(rival({ ...fresh, week: 11 })).sourceWeek, 11, 'an expired pending candidate does not block a later source');
  assert.deepEqual(triggeredResponsesForReceipt(sourceReceipt, { ...fresh, build34CampaignId: 'another-campaign' }), []);

  const pending = JSON.parse(JSON.stringify({ game: { ...fresh, week: 10 }, event, sourceReceipt }));
  assert.equal(planTriggeredEventDispatch({ ...pending, currentMargin: 10.001 }).reason, 'state-margin-outside-interruption-range');
  assert.equal(planTriggeredEventDispatch({ ...pending, game: { ...pending.game, week: 11 }, currentMargin: 4 }).reason, 'outside-dispatch-window');
  const plan = planTriggeredEventDispatch({ ...pending, currentMargin: -10 });
  assert.deepEqual(plan, {
    status: 'apply', reason: null, event: null,
    command: { receiptId: campaignId + ':rival-interruption:072', sourceReceiptId: sourceReceipt.id, stateId: 'PA', sourceWeek: 10, points: 5 },
  });
  const proof = { ...plan.command, appliedWeek: 11, before: -10, after: -15 };
  const applied = { ...pending.game, build35RivalInterruptionEffect: proof };
  assert.equal(planTriggeredEventDispatch({ ...pending, game: { ...applied, build35RivalInterruptionEffect: { ...proof, after: -14 } } }).status, 'invalid');
  const ready = planTriggeredEventDispatch({ ...pending, game: applied });
  assert.equal(ready.status, 'ready');
  assert.equal(ready.command, null, 'replanning cannot award persuasion twice');
  assert.deepEqual(ready.event.dispatchReceipt, proof);
  assert.match(ready.event.why, /5 points against you/);
  assert.equal(validateTriggeredEventProvenance(event, sourceReceipt, applied), false, 'the unconfirmed card cannot stand in for the displayable card');
  assert.equal(validateTriggeredEventProvenance({ ...ready.event, dispatchReceipt: { ...proof, stateId: 'AZ' } }, sourceReceipt, applied), false);
  const savedReady = JSON.parse(JSON.stringify({ game: applied, event: ready.event, sourceReceipt }));
  assert.equal(validateTriggeredEventProvenance(savedReady.event, savedReady.sourceReceipt, savedReady.game), true);
  const choice = savedReady.event.choices[0];
  const resolution = planTriggeredEventResolution({ ...savedReady, choice });
  assert.equal(resolution.valid, true);
  assert.equal(resolution.duplicate, false);
  assert.equal(planTriggeredEventResolution({ ...savedReady, choice, appliedReceiptIds: [resolution.receiptId] }).duplicate, true);

  const legacyProof = { receiptId: plan.command.receiptId, sourceWeek: 10, stateId: 'PA', points: 5, before: 3, after: -2 };
  const { sourceMargin: _sourceMargin, ...legacyMove } = neglect;
  const legacy = rival({ ...campaign, build35RivalInterruptionEffect: legacyProof }, { ...legacyMove, effectMagnitude: 5, persuasion: legacyProof }, []);
  const legacyReceipt = legacy.incidentLedger.at(-1);
  const legacyEvent = findRivalEvent(legacy);
  const legacyPlan = planTriggeredEventDispatch({ event: legacyEvent, sourceReceipt: legacyReceipt, game: { ...legacy, week: 13 }, currentMargin: 40 });
  assert.equal(legacyPlan.status, 'ready', 'an already-applied Build 35 event does not recheck current margins or replay');
  assert.equal(legacyPlan.command, null);

  const promiseAttack = {
    abbr: 'MI', stateName: 'Michigan', promiseLedgerId: 'promise-1', issueId: 'economy',
    pledgedPosition: 'the pledge', currentPosition: 'a different position', attackText: 'Rival cited your old pledge',
    broken: true, exploitedWeek: 9, stateHit: 0.5, effectApplied: true,
  };
  const both = recordIncident(campaign, {
    ...campaign, oppMoves: [stop], lastAd: { abbr: 'AZ' },
    lastOpponent: { neglectedStateMove: neglect, promiseAttack },
    promiseLedger: [{ id: 'promise-1', broken: true, exploitedWeek: 9 }],
  }, { type: 'opponent' });
  const promiseEvent = both.pendingInterrupts.find((item) => item.event.onceKey?.includes('interrupt-062'))?.event;
  assert.equal(promiseEvent?.evidenceSnapshot.stateId, 'MI');
  assert.equal(findRivalEvent(both)?.evidenceSnapshot.stateId, 'PA');
  assert.equal(validateTriggeredEventProvenance(promiseEvent, both.incidentLedger.at(-1), both), true);
  assert.ok(TRIGGERED_EVENT_AUDIT.filter((entry) => !entry.enabled).every((entry) =>
    entry.diagnostic && entry.producerOwner && entry.producerOwner !== 'unassigned-producer'));

  const pac = { id: 'weekly-pac', alignment: 'dem', beneficiaryParty: 'dem', issueIds: ['economy'], issueWeights: { economy: 1 } };
  const pacStates = STATES.map((state) => ({ id: state.abbr, region: state.region, marginByParty: { dem: 4, rep: -4 } }));
  const weekly = resolveSuperPacWeek({ campaignId, weekNumber: 14, totalWeeks: 14, pacs: [pac], states: pacStates });
  const serialized = JSON.parse(JSON.stringify(weekly));
  assert.deepEqual(serialized.aggregates, weekly.aggregates);
  assert.equal(Object.hasOwn(serialized, 'ads'), false);
  assert.equal(Object.hasOwn(serialized.digest, 'ads'), false);
  assert.equal(serialized.schemaVersion, SUPER_PAC_AGGREGATE_SCHEMA_VERSION);
  assert.ok(serialized.aggregates.every((row) => !Object.hasOwn(row, 'adId') && !Object.hasOwn(row, 'quality') && !Object.hasOwn(row, 'fatiguePoints')));
  assert.equal(serialized.digest.requestedCount, 20);
  assert.equal(serialized.fatigueAggregates.reduce((sum, row) => sum + row.totalGeneralFatiguePoints, 0), serialized.digest.generalFatiguePoints);
  assert.deepEqual(serialized.effectReceiptIds, serialized.aggregates.map((row) => row.effectReceiptId));

  const [group] = serialized.aggregates;
  const { totalEffectivePressure: quality, totalGeneralFatiguePoints: fatiguePoints, ...rest } = group;
  const oldGroup = { ...rest, schemaVersion: 1, adId: group.effectReceiptId, quality, fatiguePoints, realizedEffect: 0.125, turnoutPoints: -0.2 };
  const migrated = convertLegacySuperPacWeekReceipt({
    schemaVersion: 1, campaignId, week: 14, aggregates: [oldGroup],
    ads: [oldGroup], appliedReceiptIds: ['old-applied-id', group.effectReceiptId], effectsAlreadyApplied: true,
  });
  assert.equal(migrated.aggregates.length, 1);
  assert.deepEqual(migrated.aggregates[0], { ...group, realizedEffect: 0.125, turnoutPoints: -0.2 });
  assert.ok(migrated.appliedReceiptIds.includes('old-applied-id'));
  assert.equal(migrated.effectsAlreadyApplied, true);
  assert.deepEqual(migrated.pendingEffectReceiptIds, []);
  assert.equal(Object.hasOwn(migrated, 'ads'), false);
  assert.equal(convertLegacySuperPacWeekReceipt(migrated), migrated);
  console.log('Build 36 Dev 2 checks passed: queued and applied 072 evidence, source-state precedence, replay, catalog ownership, and PAC serialization/migration.');
} finally {
  await server.close();
}
