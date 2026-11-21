import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};

const server = await createServer({
  cacheDir: './.vite-build34-background-check',
  optimizeDeps: { disabled: true },
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
});

try {
  const engine = await server.ssrLoadModule('/src/lib/gameEngine.js');
  const staffed = (options) => engine.confirmBuild35Staffing(engine.createGame(options),
    ['field','pollster','communications','operations','policy','fundraising','base-liaison','social-media','media']);
  const eventData = await server.ssrLoadModule('/src/data/events.js');
  const chainData = await server.ssrLoadModule('/src/data/triggeredEventChains.js');
  const storyEngine = await server.ssrLoadModule('/src/lib/storyEngine.js');
  const incidentLedger = await server.ssrLoadModule('/src/lib/incidentLedger.js');
  const { electionForecast } = await server.ssrLoadModule('/src/lib/electionForecast.js');
  const readImport = (name) => readFile(new URL(`../data-import/${name}`, import.meta.url), 'utf8').then(JSON.parse);
  const [reported, historical] = await Promise.all([
    readImport('2026-house-votes-wikipedia-provisional.json'),
    readImport('2024-house-votes-wikipedia-historical.json'),
  ]);
  const reportedById = new Map(reported.districts.map((row) => [row.id, row]));
  const historicalById = new Map(historical.districts.map((row) => [row.id, row]));

  for (const thirdMode of ['fringe', 'surge']) {
    const campaignId = `background-check-${thirdMode}`;
    const initial = staffed({
      campaignId,
      party: 'dem',
      candidateId: 'shapiro',
      opponentId: 'vance',
      difficultyId: 'medium',
      startId: 'aug',
      thirdMode,
    });
    const original = JSON.stringify(initial);
    const started = performance.now();
    const resolved = engine.opponentTurn(initial);
    const elapsed = Math.round(performance.now() - started);
    assert.equal(JSON.stringify(initial), original, 'forecast previews do not modify the live campaign');
    assert.equal(resolved.lastOpponent.forecastPlan.source, 'shared-election-forecast');
    assert.equal(resolved.lastOpponent.forecastPlan.comparedSchedules, 5);
    assert.ok(Number.isFinite(resolved.lastOpponent.forecastPlan.expectedObjectiveGain));
    const scheduleReceipt = resolved.build34AiPlanReceipts.find((receipt) => receipt.selectedDecision?.kind === 'campaign-action');
    assert.equal(scheduleReceipt?.status, 'applied', 'a forecast-selected schedule resolves through the normal rival turn');
    assert.equal(scheduleReceipt.selectedDecision.id, resolved.lastOpponent.forecastPlan.scheduleId);
    assert.deepEqual(
      resolved.oppMoves.slice(0, scheduleReceipt.selectedDecision.payloadSnapshot.schedule.moves.length).map(({ type, abbr }) => [type, abbr]),
      scheduleReceipt.selectedDecision.payloadSnapshot.schedule.moves.map(({ type, abbr }) => [type, abbr]),
      'the displayed rival moves are the selected schedule',
    );
    const pacReceipt = resolved.build34SuperPacReceiptsByWeek['1'];
    const proxyReceipt = resolved.build34ProxyReceiptsByWeek['1'];

    assert.ok(pacReceipt, `${thirdMode}: weekly PAC receipt is saved`);
    assert.ok(pacReceipt.digest.activePacCount > 0, `${thirdMode}: at least one PAC passes the candidate and faction gates`);
    assert.equal(pacReceipt.digest.totalAds, pacReceipt.digest.activePacCount * 3, `${thirdMode}: first-week ads follow the three-ad ramp`);
    assert.equal(new Set(pacReceipt.aggregates.map((ad) => ad.effectReceiptId)).size, pacReceipt.aggregates.length, `${thirdMode}: aggregate receipt IDs are unique`);
    assert.equal(new Set(pacReceipt.aggregates.map((ad) => `${ad.pacId}:${ad.stateId}:${ad.adType}`)).size, pacReceipt.aggregates.length,
      `${thirdMode}: a PAC does not repeat an ad type in a state during the week`);
    assert.ok(pacReceipt.aggregates.every((ad) => ad.effectMultiplier === 0.2 && ad.fatigueChannel === 'general' &&
      Number.isFinite(ad.realizedEffect) && Number.isFinite(ad.turnoutPoints)), `${thirdMode}: PAC effects are bounded, finite, and use general fatigue`);
    assert.ok(!Object.hasOwn(pacReceipt.digest, 'ads'), `${thirdMode}: the digest does not duplicate detailed ad rows`);

    assert.ok(proxyReceipt, `${thirdMode}: weekly proxy receipt is saved`);
    assert.equal(proxyReceipt.visits.length, 2, `${thirdMode}: the two major-party starting proxies visit once each`);
    assert.ok(proxyReceipt.visits.every((visit) => visit.week === 1 && visit.party && visit.stateId && visit.effectMultiplier === 0.4),
      `${thirdMode}: proxy visits are valid and reduced strength`);

    if (thirdMode === 'surge') {
      engine.saveGame(resolved);
      const loaded = engine.loadGame();
      assert.equal(loaded?.build34CampaignId, campaignId, 'campaign ID survives save/load');
      assert.equal(JSON.stringify(loaded?.build34SuperPacReceiptsByWeek['1']), JSON.stringify(pacReceipt), 'PAC receipt survives JSON save/load');
      assert.equal(JSON.stringify(loaded?.build34ProxyReceiptsByWeek['1']), JSON.stringify(proxyReceipt), 'proxy receipt survives JSON save/load');
      const replayed = engine.opponentTurn(loaded);
      assert.equal(replayed, loaded, 'loading after the rival turn cannot reapply its decisions');
      assert.equal(JSON.stringify(replayed.build34SuperPacReceiptsByWeek['1']), JSON.stringify(pacReceipt), 'same-week PAC resolution reuses its receipt');
      assert.equal(JSON.stringify(replayed.build34ProxyReceiptsByWeek['1']), JSON.stringify(proxyReceipt), 'same-week proxy resolution reuses its receipt');
      const weekTwo = engine.opponentTurn(engine.advanceWeek(loaded));
      const eventReceipt = weekTwo.build34AiPlanReceipts.find((receipt) => receipt.selectedDecision?.kind === 'event-choice');
      assert.equal(eventReceipt?.status, 'applied', 'the next week resolves a forecast-scored rival event choice');
      assert.equal(weekTwo.lastOpponent.choice, eventReceipt.selectedDecision.label);
      assert.equal(weekTwo.build34AiCurrentEventId, null);
    } else {
      const house = engine.houseSnapshot(initial);
      assert.equal(house.districts.length, 435);
      assert.equal(new Set(house.districts.map((district) => district.id)).size, 435);
      const counts = { 2024: 0, 2026: 0 };
      for (const district of house.districts) {
        const reportedDistrict = reportedById.get(district.id);
        const hasReportedVotes = Number.isFinite(reportedDistrict?.demVotes) && Number.isFinite(reportedDistrict?.repVotes)
          && reportedDistrict.demVotes + reportedDistrict.repVotes > 0;
        const source = hasReportedVotes ? reportedDistrict : historicalById.get(district.id);
        const sourceYear = hasReportedVotes ? 2026 : 2024;
        assert.equal(district.sourceYear, sourceYear, district.id);
        assert.equal(district.demVotes, source.demVotes, district.id);
        assert.equal(district.repVotes, source.repVotes, district.id);
        assert.ok(Number.isFinite(district.margin), district.id);
        counts[sourceYear]++;
      }
      assert.deepEqual(counts, { 2024: 121, 2026: 314 });
      for (const [houseRule, electoralRule] of [['standard', 'standard'], ['pr', 'proportional'], ['mmp', 'district']]) {
        const forecast = electionForecast({ ...initial, houseRule, electoralRule }, { draws: 4, seed: 'house-test' });
        assert.equal(forecast.houseProjection.rule, houseRule);
        assert.equal(forecast.houseProjection.draws, 4);
        assert.ok(forecast.houseProjection.total >= 435);
        assert.ok(Object.values(forecast.rivalChambers).every((value) => Number.isFinite(value) && value >= 0 && value <= 1));
      }
      console.log('House forecast: all 435 district baselines verified, with 121 labeled 2024 fallbacks');
    }

    console.log(`${thirdMode}: forecast-driven rival turn in ${elapsed} ms, ${pacReceipt.digest.activePacCount} active PACs, ${pacReceipt.aggregates.length} ads, ${proxyReceipt.visits.length} proxy visits`);
  }

  const networkGame = staffed({
    campaignId: 'retired-endorsement-network-check',
    party: 'dem',
    candidateId: 'shapiro',
    opponentId: 'vance',
    difficultyId: 'medium',
    startId: 'aug',
    thirdMode: 'fringe',
  });
  const legacyBenefits = {
    ...networkGame,
    campaignPerks: { ...networkGame.campaignPerks, freeAdIssues: ['energy'] },
    build34EndorserRelationships: { 'national-dem-climate': 100 },
    build34EndorserRegistry: { 'national-dem-climate': { candidateId: 'shapiro', week: 1 } },
  };
  const stance = networkGame.stances.economy;
  const changed = engine.changeStance(legacyBenefits, 'economy', (stance + 1) % 3);
  assert.deepEqual(changed.build34EndorserRelationships, legacyBenefits.build34EndorserRelationships);
  assert.equal(engine.requestBuild34Endorsement(changed, 'national-dem-climate'), changed);
  assert.equal(engine.saveGame(changed), true);
  const restoredBenefits = engine.loadGame();
  assert.deepEqual(restoredBenefits.build34EndorserRegistry, legacyBenefits.build34EndorserRegistry);
  assert.deepEqual(restoredBenefits.campaignPerks.freeAdIssues, ['energy']);
  const adResult = engine.runAdBlitz(restoredBenefits, { abbr: 'MI', issueId: 'energy', kind: 'pro', typeId: 'tv' });
  assert.equal(adResult.lastAd.cost, 0, 'a previously earned issue credit is still usable');
  assert.equal(adResult.funds, restoredBenefits.funds);
  assert.ok(!adResult.campaignPerks.freeAdIssues.includes('energy'));
  const outside = engine.opponentTurn(restoredBenefits);
  assert.deepEqual(outside.build34EndorserRegistry, restoredBenefits.build34EndorserRegistry);
  assert.deepEqual(outside.lastOutside.endorsements, []);
  assert.equal(Object.keys(outside.build34EndorsementReceiptsByWeek).length, 0);
  console.log('endorsements: legacy history and ad benefits preserved, no new outreach or weekly rewards');

  const chainValidation = chainData.validateMaterializedTriggeredChains({
    starterEvents: eventData.EVENTS,
    definitions: chainData.TRIGGERED_EVENT_CHAINS,
  });
  assert.equal(chainValidation.valid, true, `every triggered chain has a registered starter and follow-up: ${chainValidation.errors.join('; ')}`);
  assert.equal(chainValidation.chainCount, 26, 'the 16 general and 10 surge follow-up chains are registered');
  const drawableEvents = eventData.EVENTS.filter((event) => event.choices?.length &&
    !event.nationalOnly && !event.easterEgg && !event.fallback && !event.scriptedOnly);
  const staticEventIds = new Set(eventData.EVENTS.map((event) => event.id));
  const derivedEventCards = Object.values(eventData.EVENT_BY_ID).filter((event) =>
    !staticEventIds.has(event.id) && event.choices?.length);
  const chainParticipation = chainData.validateTriggeredChainParticipation({
    standardEvents: [
      ...drawableEvents.filter((event) => event.modeOnly !== 'surge'),
      ...derivedEventCards.filter((event) => event.modeOnly !== 'surge'),
    ],
    surgeEvents: [...drawableEvents, ...derivedEventCards],
    definitions: chainData.TRIGGERED_EVENT_CHAINS,
    minimumParticipation: 0.2,
  });
  const playableSurgeIds = new Set(drawableEvents.filter((event) => event.modeOnly === 'surge' || !event.modeOnly)
    .map((event) => event.id));
  const unreachableSurgeStarters = chainData.SURGE_CAMPAIGN_CHAINS
    .flatMap((definition) => [definition.starterEventId, ...(definition.additionalStarterEventIds || [])])
    .filter((eventId) => !playableSurgeIds.has(eventId));
  assert.deepEqual(unreachableSurgeStarters, [], 'every surge follow-up starter is available in the player event draw pool');
  assert.ok(chainParticipation.modes.standard.participationRate >= 0.2,
    `standard chain participation meets 20% (${chainParticipation.modes.standard.participatingEventCount}/${chainParticipation.modes.standard.totalEventCount}; ${chainParticipation.errors.join('; ')})`);
  assert.ok(chainParticipation.modes.surge.participationRate >= 0.2,
    `surge chain participation meets 20% (${chainParticipation.modes.surge.participatingEventCount}/${chainParticipation.modes.surge.totalEventCount}; ${chainParticipation.errors.join('; ')})`);
  const chainCampaign = engine.createGame({
    campaignId: 'triggered-chain-live-check',
    party: 'dem',
    candidateId: 'shapiro',
    opponentId: 'vance',
    difficultyId: 'medium',
    startId: 'aug',
    thirdMode: 'fringe',
  });
  const phoneBankStarter = eventData.EVENT_BY_ID.volunteer_phonebank;
  const stagedStarter = { ...chainCampaign, week: 2, currentEventId: phoneBankStarter.id, currentEventData: phoneBankStarter };
  const starterChoice = phoneBankStarter.choices[0];
  const starterResolved = engine.applyChoice(stagedStarter, starterChoice);
  const starterRecorded = incidentLedger.recordIncident(stagedStarter, starterResolved, { type: 'choice' }, () => 1);
  const queuedChain = starterRecorded.followUps.find((item) => item.chainId === 'phonebank_close_states');
  assert.ok(queuedChain?.starterReceiptId, 'starter choice queues its follow-up with a durable receipt and local state');
  assert.equal(queuedChain.starterStateId, 'GA', 'starter event state is derived from its recorded turnout effect');
  const dueChain = storyEngine.takeScriptedEvent({ ...starterRecorded, week: 3 });
  assert.equal(dueChain.event?.id, 'derived_phonebank_close_states', 'the linked follow-up is drawn in the next week');
  assert.equal(dueChain.event?.starterReceiptId, queuedChain.starterReceiptId, 'follow-up retains the exact initiating receipt');
  const stagedFollowUp = {
    ...starterRecorded,
    week: 3,
    currentEventId: dueChain.event.id,
    currentEventData: dueChain.event,
    followUps: dueChain.followUps,
    outcome: null,
  };
  const followUpChoice = dueChain.event.choices.find((choice) => choice.id === 'expand_phonebank');
  const followUpResult = engine.applyChoice(stagedFollowUp, followUpChoice);
  assert.ok(followUpResult.turnout.GA.dem > stagedFollowUp.turnout.GA.dem, 'phone-bank follow-up applies turnout in the starter state');
  assert.equal(followUpResult.funds, stagedFollowUp.funds - 1, 'follow-up cash costs resolve through native campaign funds');
  const effectIds = [...followUpResult.build34AppliedEventEffectIds];
  const replayedFollowUp = engine.applyChoice(followUpResult, followUpChoice);
  assert.equal(replayedFollowUp.turnout.GA.dem, followUpResult.turnout.GA.dem, 'replaying the follow-up does not duplicate turnout');
  assert.equal(replayedFollowUp.funds, followUpResult.funds, 'replaying the follow-up does not duplicate spending');
  assert.deepEqual(replayedFollowUp.build34AppliedEventEffectIds, effectIds, 'applied chain effects retain stable receipt IDs');
  engine.saveGame(followUpResult);
  const loadedFollowUp = engine.loadGame();
  assert.deepEqual(loadedFollowUp?.build34AppliedEventEffectIds, effectIds, 'chain effect receipts survive save/load');
  assert.equal(loadedFollowUp?.build34ExtraWeeklyUpkeepByState.GA, undefined, 'unrelated chains do not create upkeep');
  console.log(`event chains: ${chainValidation.chainCount} linked; participation ${Math.round(chainParticipation.modes.standard.participationRate * 1000) / 10}% standard / ${Math.round(chainParticipation.modes.surge.participationRate * 1000) / 10}% surge; effects and replay passed`);
  console.log('Build 34 outside-campaign checks passed.');
} finally {
  await server.close();
}
