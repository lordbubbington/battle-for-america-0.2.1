import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const cacheDir = await mkdtemp(join(tmpdir(), 'bfa-build33-vite-check-'));
const vite = await createServer({
  configLoader: 'runner',
  configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
  root,
  cacheDir,
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { disabled: true },
  server: { middlewareMode: true, hmr: false, ws: false },
});

try {
  const engine = await vite.ssrLoadModule('/src/lib/gameEngine.js');
  const campaignOperations = await vite.ssrLoadModule('/src/lib/campaignOperations.js');
  const environment = await vite.ssrLoadModule('/src/lib/environment.js');
  const downballot = await vite.ssrLoadModule('/src/lib/downballot.js');
  const polling = await vite.ssrLoadModule('/src/lib/polling.js');
  const marginColors = await vite.ssrLoadModule('/src/lib/marginColors.js');
  const field = await vite.ssrLoadModule('/src/lib/fieldOperations.js');
  const states = await vite.ssrLoadModule('/src/data/states.js');
  const events = await vite.ssrLoadModule('/src/data/events.js');
  const debates = await vite.ssrLoadModule('/src/data/debates.js');
  const vanceSuccession = await vite.ssrLoadModule('/src/data/vanceSuccession.js');
  const incidents = await vite.ssrLoadModule('/src/lib/incidentLedger.js');
  const campaignNews = await vite.ssrLoadModule('/src/lib/news.js');
  const nationalNews = await vite.ssrLoadModule('/src/lib/nationalNews.js');
  const rivalIncidentNews = await vite.ssrLoadModule('/src/data/rivalIncidentNews.js');
  const reactions = await vite.ssrLoadModule('/src/lib/reactions.js');
  const factions = await vite.ssrLoadModule('/src/lib/factions.js');
  const milestoneData = await vite.ssrLoadModule('/src/data/factionMilestones.js');
  const eventContext = await vite.ssrLoadModule('/src/lib/eventContext.js');
  const conflictData = await vite.ssrLoadModule('/src/data/factionConflicts.js');
  const turnoutModule = await vite.ssrLoadModule('/src/lib/turnout.js');
  const downballotData = await vite.ssrLoadModule('/src/data/downballot.js');
  const stateLegislatureCycles = await vite.ssrLoadModule('/src/data/stateLegislatureCycles.js');
  const stateLegislatureResults2026 = await vite.ssrLoadModule('/src/data/stateLegislatureResults2026.js');
  const stateLegislatureForecast = await vite.ssrLoadModule('/src/lib/stateLegislatureForecast.js');
  const houseDistrictBaselineData = await vite.ssrLoadModule('/src/data/houseDistrictBaselines.json');
  const ballotMeasureRulesData = await vite.ssrLoadModule('/src/data/ballotMeasureRules.js');
  const ballotMeasureReference = await vite.ssrLoadModule('/src/data/ballotMeasureReference.js');
  const ballotMeasures = await vite.ssrLoadModule('/src/lib/ballotMeasures.js');
  const triggeredEvents = await vite.ssrLoadModule('/src/data/triggeredEvents.js');
  const triggeredEventProducers = await vite.ssrLoadModule('/src/lib/triggeredEventProducers.js');
  const electionForecast = await vite.ssrLoadModule('/src/lib/electionForecast.js');
  const electionNight = await vite.ssrLoadModule('/src/lib/night.js');
  const outcomeSimulation = await vite.ssrLoadModule('/src/lib/outcomeSimulation.js');
  const aiCampaign = await vite.ssrLoadModule('/src/lib/aiCampaign.js');

  const game = engine.createGame({
    party: 'dem',
    candidateId: 'harris',
    opponentId: 'vance',
    difficultyId: 'medium',
    leans: states.BASE_LEANS,
    nationalGeneric: 2.5,
    startId: 'aug',
  });
  assert.equal(game.funds, 225, 'medium start cash is increased by 50%');
  assert.equal(game.aiFunds.rep, 225, 'the major-party AI starts with the same war chest');
  assert.ok(game.weeklyBaseIncomeDraw >= 8 && game.weeklyBaseIncomeDraw <= 12, 'income draw is in range');
  assert.equal(game.weeklyIncomeWeek, 0, 'the starting income draw is tied to week zero');
  assert.equal(game.aiFunds.lib, 15, 'third-party campaigns start with the increased $15M balance');
  assert.equal(game.aiFunds.grn, 15, 'each third-party campaign receives the same increased start balance');
  assert.deepEqual(Object.keys(game.weeklyAIIncomeDraws).sort(), ['grn', 'lib', 'rep'], 'every non-player campaign receives a saved weekly draw');
  assert.ok(Object.values(game.weeklyAIIncomeDraws).every((draw) => Number.isInteger(draw) && draw >= 8 && draw <= 12), 'AI weekly income draws use the same $8M–$12M range');
  assert.equal(triggeredEvents.TRIGGERED_EVENT_DEFINITIONS.length, 100, 'all 100 triggered-event definitions are present');
  assert.equal(new Set(triggeredEvents.TRIGGERED_EVENT_DEFINITIONS.map((event) => event.id)).size, 100, 'triggered-event IDs are unique');
  assert.equal(new Set(triggeredEvents.TRIGGERED_EVENT_DEFINITIONS.map((event) => event.onceKey)).size, 100, 'triggered-event once keys are unique');
  const producerFixtureFor = (definition) => {
    const number = definition.number;
    const sourceType = definition.sourceTypes[0];
    const party = ['048', '096', '097'].includes(number) ? 'grn' : 'dem';
    const gameFixture = {
      ...game,
      party,
      runningMateId: 'qa-running-mate',
      week: 10,
      totalWeeks: 14,
      ballotMeasures: number === '069' ? [{ status: 'qualified' }] : [],
      triggeredEventOnceKeys: [],
    };
    const payload = { issueId: 'economy', stance: 1, newStance: 1, actionId: 'visit', result: 'A completed simulated campaign report.' };
    if (['048', '096', '097'].includes(number)) payload.actionId = 'ops';
    if (number === '091') payload.actionId = 'fundraise';
    if (['048', '096', '097'].includes(number)) {
      payload.ballotAccessReport = {
        state: 'PA',
        party,
        status: number === '097' ? 'challenged' : 'shortfall',
        collectedSignatures: 100,
        requiredSignatures: 200,
        ...(number === '097' ? { challengeClaim: 'QA challenge claim' } : {}),
        source: { title: 'QA election filing report', url: 'https://example.gov/filing', checkedOn: '2026-11-10' },
      };
    }
    if (sourceType === 'debate-answer') Object.assign(payload, { answer: 'A recorded answer', question: 'A recorded question', reply: 'A recorded reply', answerScore: 0.5 });
    if (sourceType === 'advertisement') Object.assign(payload, { result: { abbr: 'PA', kind: 'pro', swing: 0.2, points: 0.2, language: 'es' }, results: [{ abbr: 'PA', kind: 'pro', swing: 0.2, points: 0.2, language: 'es' }] });
    if (sourceType === 'press-action') payload.storySpin = { storyId: 'qa-story', storyHeadline: 'A recorded campaign story', mode: 'respond' };
    if (sourceType === 'event-choice') Object.assign(payload, { eventId: 'qa-event', eventTitle: 'A recorded campaign event', eventText: 'A recorded event text.', choice: 'A recorded choice', text: 'A recorded outcome.' });
    if (sourceType === 'campaign-promise') payload.result = { id: 'qa-promise' };
    if (sourceType === 'endorsement-request') Object.assign(payload, { leaderId: 'qa-leader', leaderName: 'QA Leader', status: 'critical' });
    if (sourceType === 'opponent-plan') Object.assign(payload, { eventTitle: 'A recorded rival plan', moves: [{ type: 'stop', state: 'PA', text: 'A recorded state move.' }] });
    const receipt = { id: `producer-fixture-${number}`, sourceType, sourceId: 'qa-source', week: 10, state: 'PA', recap: 'A source-linked simulation receipt.', payload };
    return { gameFixture, receipt };
  };
  for (const definition of triggeredEvents.TRIGGERED_EVENT_DEFINITIONS) {
    const { gameFixture, receipt } = producerFixtureFor(definition);
    const evidence = triggeredEventProducers.simulatedTriggerEvidence(receipt, gameFixture, definition);
    assert.ok(evidence, `${definition.number} has a producer for a matching recorded source`);
    assert.equal(evidence.simulated, true, `${definition.number} is labeled as a modeled game incident rather than externally verified fact`);
    assert.equal(evidence.incident.sourceReceiptId, receipt.id, `${definition.number} keeps its initiating receipt linked`);
    assert.equal(evidence.incident.title, definition.title, `${definition.number} records the incident resolved by the simulation`);
    const withEvidence = { ...receipt, payload: { ...receipt.payload, triggerEvidence: { [definition.id]: evidence } } };
    assert.equal(definition.when(withEvidence, gameFixture), true, `${definition.number} activates only from its linked evidence record`);
    const alteredEvidence = {
      ...withEvidence,
      payload: {
        ...withEvidence.payload,
        triggerEvidence: {
          [definition.id]: { ...evidence, incident: { ...evidence.incident, sourceReceiptId: 'different-receipt' } },
        },
      },
    };
    assert.equal(definition.when(alteredEvidence, gameFixture), false, `${definition.number} rejects evidence detached from its source`);
    if (['048', '096', '097'].includes(definition.number)) {
      const noLegalRecord = { ...receipt, payload: { ...receipt.payload } };
      delete noLegalRecord.payload.ballotAccessReport;
      assert.equal(
        triggeredEventProducers.simulatedTriggerEvidence(noLegalRecord, gameFixture, definition),
        null,
        `${definition.number} stays gated without an official ballot-access record`,
      );
    }
  }
  const unrecordedFixture = producerFixtureFor(triggeredEvents.TRIGGERED_EVENT_DEFINITIONS.find((definition) => definition.number === '011'));
  assert.equal(
    !!triggeredEvents.TRIGGERED_EVENT_DEFINITIONS.find((definition) => definition.number === '011').when(unrecordedFixture.receipt, unrecordedFixture.gameFixture),
    false,
    'a compatible action by itself does not qualify a response without a saved modeled incident',
  );
  const simulatedIncident = triggeredEventProducers.addSimulatedTriggeredEvidence(
    producerFixtureFor(triggeredEvents.TRIGGERED_EVENT_DEFINITIONS.find((definition) => definition.number === '011')).receipt,
    game,
    () => 0,
  );
  assert.ok(Object.keys(simulatedIncident.payload.triggerEvidence || {}).length === 1, 'the source-linked producer can write a recorded incident before queuing its response');
  assert.match(simulatedIncident.recap, /Modeled incident:/, 'the incident is written into the visible source recap before its response is queued');
  assert.deepEqual(ballotMeasureRulesData.BALLOT_MEASURE_RULES, [], 'unverified state ballot-measure legal routes are not invented');
  const houseBaselines = houseDistrictBaselineData.default.districts;
  assert.equal(houseBaselines.length, 435, 'the House baseline has one row for every current district');
  assert.equal(new Set(houseBaselines.map((district) => district.id)).size, 435, 'House district IDs are unique');
  assert.ok(houseBaselines.every((district) => Number.isFinite(district.districtLeanDMinusR)), 'every House district has a finite D-R lean');
  assert.equal(Object.values(houseDistrictBaselineData.default.sourceCounts).reduce((sum, count) => sum + count, 0), 435, 'House baseline source counts cover all districts');
  assert.ok(houseDistrictBaselineData.default.sourceCounts['2026'] >= 314, 'new House data does not regress below the existing reported-result coverage');
  assert.ok(houseBaselines.every((district) => district.boundaryVintage === district.sourceYear), 'every district records which boundary vintage its baseline uses');
  assert.ok(houseBaselines.filter((district) => district.sourceYear === 2026).every((district) => district.baselineStatus === 'current-unofficial'), 'current House returns are labeled unofficial');
  assert.ok(houseBaselines.filter((district) => district.sourceYear === 2024).every((district) => district.baselineStatus === 'historical-fallback'), 'historical House fallbacks are labeled explicitly');
  const stateLegislatures = stateLegislatureCycles.STATE_LEGISLATURES_2028;
  const stateLegislatureChamberResults = stateLegislatureResults2026.STATE_LEGISLATURE_RESULTS_2026;
  const legislatureSummary = stateLegislatureCycles.STATE_LEGISLATURE_2028_SUMMARY;
  assert.equal(stateLegislatures.length, 50, 'state legislature roster covers all fifty states');
  assert.equal(legislatureSummary.totalSeats, 7386, 'state legislature chamber sizes sum to NCSL national total');
  assert.equal(legislatureSummary.statesWithElections, 44, '2028 roster includes the states with regular elections');
  assert.equal(legislatureSummary.chambersWithElections, 85, '2028 roster includes the chambers with regular elections');
  assert.equal(stateLegislatureChamberResults.length, 88, 'the provisional 2026 snapshot contains each of the 88 chambers on the regular-election ballot');
  assert.equal(new Set(stateLegislatureChamberResults.map((result) => `${result.abbr}:${result.chamber}`)).size, 88, '2026 chamber result keys are unique');
  const chamberSeatsByKey = new Map(stateLegislatures.flatMap((state) => state.chambers.map((chamber) => [`${state.abbr}:${chamber.chamber}`, chamber.totalSeats])));
  assert.ok(stateLegislatureChamberResults.every((result) => Number.isInteger(result.reportedTotal) && result.reportedTotal === chamberSeatsByKey.get(`${result.abbr}:${result.chamber}`)), 'every 2026 reported split reconciles to its chamber size');
  assert.ok(stateLegislatureChamberResults.every((result) => result.sourceStatus === 'unofficial-reported'), 'reported 2026 chamber makeup is never marked certified');
  assert.deepEqual(stateLegislatureChamberResults.filter((result) => result.reportedControl === 'tbd').map((result) => `${result.abbr}:${result.chamber}`).sort(), ['AK:lower', 'AK:upper', 'NC:upper'], 'unresolved chamber-control calls remain explicit');
  const nebraska = stateLegislatures.find((state) => state.abbr === 'NE');
  assert.equal(nebraska.chambers.length, 1, 'Nebraska is represented as one chamber');
  assert.equal(nebraska.chambers[0].districtStructure.kind, 'nonpartisan-single-member', 'Nebraska remains officially nonpartisan');
  assert.equal(nebraska.chambers[0].seatsUp2028, 25, 'Nebraska schedules only the other 25 four-year seats in 2028');
  assert.ok(stateLegislatures.flatMap((state) => state.chambers).every((chamber) => chamber.seatsUp2028 <= chamber.totalSeats), 'state legislative seats-up counts stay within chamber sizes');

  const legislatureGame = {
    ...game,
    stateGeneric: { ...game.stateGeneric, AK: 3, AR: -4, PA: 0 },
  };
  const legislatureForecast = stateLegislatureForecast.projectStateLegislatures(legislatureGame);
  const projectedChambers = legislatureForecast.states.flatMap((state) => state.activeChambers);
  assert.equal(projectedChambers.length, legislatureSummary.chambersWithElections, 'every scheduled chamber gets a 2028 projection');
  assert.ok(projectedChambers.every((chamber) => Object.values(chamber.projected).reduce((sum, count) => sum + count, 0) === chamber.totalSeats), 'projected party counts reconcile to every chamber seat total');
  const legislatureMarginMismatches = projectedChambers.filter((chamber) => chamber.control !== 'nonpartisan' && chamber.margin !== (legislatureGame.stateGeneric[chamber.state] || 0));
  assert.deepEqual(legislatureMarginMismatches, [], `all scheduled seats use the state generic-ballot margin without a candidate-quality modifier: ${JSON.stringify(legislatureMarginMismatches.slice(0, 3))}`);
  assert.equal(legislatureForecast.byState.AK.activeChambers.find((chamber) => chamber.chamber === 'lower').called.dem, 40, 'a positive state margin calls every seat up for election Democratic');
  assert.equal(legislatureForecast.byState.AR.activeChambers.find((chamber) => chamber.chamber === 'lower').called.rep, 100, 'a negative state margin calls every seat up for election Republican');
  assert.equal(legislatureForecast.byState.PA.activeChambers.find((chamber) => chamber.chamber === 'lower').called.unallocated, 203, 'a zero state margin leaves every seat up uncalled');
  assert.equal(legislatureForecast.byState.NE.activeChambers[0].control, 'nonpartisan', 'Nebraska remains nonpartisan in the projection');
  assert.equal(legislatureForecast.byState.NE.activeChambers[0].projected.nonpartisan, 49, 'Nebraska seats are not assigned invented party labels');
  const trifectaSummary = stateLegislatureForecast.summarizeStateTrifectas(legislatureGame);
  assert.deepEqual(['LA', 'MS', 'NJ', 'VA'].filter((abbr) => trifectaSummary.unresolved.includes(abbr)), ['LA', 'MS', 'NJ', 'VA'], 'states with 2027 legislative elections stay out of the 2028 trifecta tally until their new baselines exist');
  assert.ok(Object.values(trifectaSummary.counts).reduce((sum, count) => sum + count, 0) <= 50, 'trifecta categories never exceed the fifty states');

  const qaRule = {
    id: 'qa-az-abortion-route',
    state: 'AZ',
    routeType: 'citizen-initiative-statute',
    available: true,
    issueIds: ['abortion'],
    deadlines: { filing: '2028-03-01', signatures: '2028-07-01', qualification: '2028-09-01', election: '2028-11-07' },
    signatureRequirement: { kind: 'raw-count', value: 250000, basis: 'QA fixture only', distribution: { kind: 'counties', minimum: 15 } },
    approvalThreshold: { kind: 'simple-majority', percent: 50 },
    source: { authority: 'state-government', title: 'QA fixture only', url: 'https://azsos.gov/', checkedOn: '2026-11-10' },
  };
  const qaMeasure = {
    id: 'qa-az-abortion-measure', state: 'AZ', issueId: 'abortion', title: 'QA Measure', summary: 'Validation fixture only.',
    sponsor: 'QA fixture', measureType: 'citizen-initiative', proposalText: 'QA fixture text', proposalUrl: 'https://azsos.gov/',
    position: 1, status: 'qualified', routeId: qaRule.id, deadlines: qaRule.deadlines,
    signatureRequirement: qaRule.signatureRequirement, approvalThreshold: qaRule.approvalThreshold,
    polling: { support: 65, oppose: 30, undecided: 5, source: { pollster: 'QA fixture', fieldDate: '2026-11-10', sampleSize: 500, url: 'https://azsos.gov/' } },
    partyPositions: { dem: 'support', rep: 'oppose', lib: 'neutral', grn: 'support' }, factionPositions: {},
    signatures: { collected: 260000, required: 250000 }, qualifiedAt: '2028-08-01', eventWindow: { openWeek: 2, closeWeek: 12 },
    measureEffects: { passed: { factions: {}, groups: {} }, failed: { factions: {}, groups: {} } },
    choices: [
      { id: 'qa-support', label: 'Support', text: 'QA choice.', effects: { factions: {}, groups: {} } },
      { id: 'qa-neutral', label: 'Stay neutral', text: 'QA choice.', effects: { factions: {}, groups: {} } },
    ],
  };
  assert.equal(ballotMeasures.validateBallotMeasureRule(qaRule).valid, true, 'a fully sourced route fixture passes legal validation');
  assert.equal(ballotMeasures.validateBallotMeasureRecord(qaMeasure, [qaRule]).valid, true, 'a measure fixture passes route, polling, and effect validation');
  const qaEligibility = ballotMeasures.ballotMeasureEligibility({ week: 5, stances: { abortion: 1 } }, qaMeasure, { stateLead: -10, stateAgreement: 0.6, rules: [qaRule] });
  assert.equal(qaEligibility.eligible, true, 'a qualified social-issue measure opens at the exact 10-point and 60% eligibility thresholds');
  assert.equal(ballotMeasures.createBallotMeasureEvent({ week: 5, stances: { abortion: 1 } }, qaMeasure, { stateLead: -10, stateAgreement: 0.6, rules: [qaRule] }).measureId, qaMeasure.id, 'eligible measures create campaign decision cards');
  const prohibitedMeasure = { ...qaMeasure, measureEffects: { passed: { margin: 5 }, failed: {} } };
  assert.equal(ballotMeasures.validateBallotMeasureRecord(prohibitedMeasure, [qaRule]).valid, false, 'measure effects cannot directly grant polling or margin bonuses');
  const referenceMeasures = ballotMeasureReference.BALLOT_MEASURE_REFERENCE_2028;
  assert.equal(referenceMeasures.length, 4, 'the reference tracker includes the verified eligible measure and three constitutionally due 2028 questions');
  assert.equal(new Set(referenceMeasures.map((measure) => measure.id)).size, referenceMeasures.length, 'ballot measure reference IDs are unique');
  assert.ok(referenceMeasures.every((measure) => measure.source.url.startsWith('https://') && measure.polling === null && measure.campaignEventEnabled === false), 'reference entries are sourced and cannot invent polling or open campaign decisions');
  const caEligibleReference = referenceMeasures.find((measure) => measure.id === 'ca-uc-staff-downpayment-loans-2028');
  assert.equal(caEligibleReference.status, 'Eligible; not yet qualified', 'California eligibility is not mislabeled as ballot qualification');
  assert.equal(caEligibleReference.signatureThreshold, 874641, 'the California initiative shows the official verified threshold');

  const opened = engine.startTurn(game);
  assert.equal(opened.currentEventId, null, 'week one has no decision event');
  assert.equal(opened.decisionEventCount, 0, 'week one decision count is zero');
  assert.ok(Math.abs(opened.natGeneric - environment.genericAverage(opened)) < 0.01, 'the opening national environment matches its weighted state average');
  assert.equal(opened.genericBaseline, game.startingNationalGeneric, 'the starting drift baseline preserves the setup value');
  const modeledActionGame = { ...opened, actionsLeft: 3 };
  const modeledActionResult = engine.applyAction(modeledActionGame, 'visit', 'PA');
  const modeledActionReceipt = incidents.recordIncident(
    modeledActionGame,
    modeledActionResult,
    { type: 'action', actionId: 'visit', abbr: 'PA' },
    () => 0,
  );
  const modeledInterrupt = modeledActionReceipt.pendingInterrupts[0];
  assert.ok(modeledInterrupt?.event?.why.startsWith('Modeled campaign incident:'), 'a simulated incident is visible in the response rationale');
  assert.equal(modeledInterrupt.event.kicker, 'Modeled campaign incident', 'the response card labels the in-game incident as modeled');
  assert.equal(modeledInterrupt.event.text, triggeredEvents.TRIGGERED_EVENT_DEFINITIONS.find((definition) => definition.id === modeledInterrupt.onceKey?.replace('triggered-event:', ''))?.trigger, 'the card separates the trigger description from its evidence rationale');
  assert.match(modeledActionReceipt.incidentLedger.at(-1).recap, /Modeled incident:/, 'the generated incident is stored with the source receipt before queuing');
  const modeledResponse = engine.applyChoice({
    ...modeledActionReceipt,
    currentInterrupt: modeledInterrupt,
  }, modeledInterrupt.event.choices[0]);
  assert.equal(modeledResponse.pendingInterrupts.length, 0, 'answering a modeled triggered event clears its queued response');
  assert.equal(modeledResponse.currentInterrupt, null, 'answering a modeled triggered event clears the interrupt panel');
  const newsBaseline = opened.genericBaseline;
  const newsApplied = nationalNews.applyNationalNews({ ...opened }, { id: 'qa-generic-news', nat: 0, gen: 0.8 });
  assert.ok(Math.abs(newsApplied.natGeneric - environment.genericAverage(newsApplied)) < 0.01, 'a generic news swing updates the visible national environment');
  assert.equal(newsApplied.genericBaseline, newsBaseline, 'news does not overwrite the prior drift baseline');

  const duringWeek = { ...opened, week: 1, weeklyIncomeWeek: 0, actionsLeft: 0, currentEventId: null, currentEventData: null, eventSchedule: [], eventScheduleIndex: -1 };
  const expectedPreNewsBaseline = environment.genericAverage({ stateGeneric: environment.decayGeneric(duringWeek) });
  const advancedEnvironment = engine.advanceWeek(duringWeek);
  assert.ok(Math.abs(advancedEnvironment.genericBaseline - expectedPreNewsBaseline) < 0.01, 'the next drift baseline is stored before national news');
  assert.ok(Math.abs(advancedEnvironment.natGeneric - environment.genericAverage(advancedEnvironment)) < 0.01, 'the newly opened week displays the post-news weighted environment');
  assert.ok(Number.isFinite(advancedEnvironment.track) && Number.isFinite(advancedEnvironment.genericBaseline), 'track and generic baseline remain finite after news');
  const financeWeek = engine.advanceWeek({ ...opened, actionsLeft: 0, currentEventId: null, currentEventData: null, eventSchedule: [], eventScheduleIndex: -1 });
  assert.equal(financeWeek.aiIncome.rep.baseIncome, opened.weeklyAIIncomeDraws.rep, 'the AI consumes its saved draw exactly once at the week boundary');
  assert.equal(financeWeek.aiIncome.lib.baseIncome, opened.weeklyAIIncomeDraws.lib, 'third-party AI uses its saved draw at the week boundary');
  assert.equal(financeWeek.weeklyAIIncomeDrawsWeek, financeWeek.week, 'the next AI draw is saved against its own campaign week');
  assert.ok(Object.values(financeWeek.weeklyAIIncomeDraws).every((draw) => Number.isInteger(draw) && draw >= 8 && draw <= 12), 'the next week receives a fresh in-range AI draw');

  const followUpFixture = { ...duringWeek, natNews: 'credit_seize', natNewsLog: ['credit_seize'], arc: null };
  const followUpWeek = engine.advanceWeek(followUpFixture);
  assert.equal(followUpWeek.natNews, 'slump_confirmed', 'a scheduled national-news follow-up keeps its generic environment synchronized');
  assert.ok(Math.abs(followUpWeek.natGeneric - environment.genericAverage(followUpWeek)) < 0.01, 'follow-up news updates the visible weighted environment');
  const arcFixture = { ...duringWeek, natNews: 'slump_confirmed', natNewsLog: ['slump_confirmed'], arc: { id: 'slump', label: 'The economy is contracting', weeksLeft: 3, perWeek: 0.3 } };
  const arcWeek = engine.advanceWeek(arcFixture);
  assert.ok(Number.isFinite(arcWeek.genericBaseline) && Math.abs(arcWeek.natGeneric - environment.genericAverage(arcWeek)) < 0.01, 'a running national-news arc leaves the baseline and display valid');
  const fourPartyWeek = engine.advanceWeek({ ...duringWeek, week: 2, weeklyIncomeWeek: 1, thirdMode: 'surge' });
  assert.ok(fourPartyWeek.fourPartyNationalCard, 'the four-party national-news path is exercised');
  assert.ok(Math.abs(fourPartyWeek.natGeneric - environment.genericAverage(fourPartyWeek)) < 0.01, 'four-party national news preserves the weighted generic display');

  const savedRandomForPull = Math.random;
  let baselinePullA;
  let baselinePullB;
  try {
    Math.random = () => 0.5;
    baselinePullA = engine.advanceWeek({ ...duringWeek, track: 0, genericBaseline: 0 });
    baselinePullB = engine.advanceWeek({ ...duringWeek, track: 0, genericBaseline: 2 });
  } finally {
    Math.random = savedRandomForPull;
  }
  assert.ok(Math.abs((baselinePullA.track - baselinePullB.track) - 1) <= 0.11, 'generic-track pull retains the prior baseline and its 0.5 multiplier');

  const originalStorage = globalThis.localStorage;
  const loadFixture = (fixture) => {
    globalThis.localStorage = { getItem: () => JSON.stringify(fixture), setItem: () => {} };
    try {
      return engine.loadGame();
    } finally {
      if (originalStorage === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = originalStorage;
    }
  };
  const legacyFixture = { ...opened, natGeneric: opened.natGeneric, stateGeneric: { ...opened.stateGeneric, AK: (opened.stateGeneric.AK || 0) + 4 } };
  delete legacyFixture.genericBaseline;
  const migratedLegacy = loadFixture(legacyFixture);
  assert.equal(migratedLegacy.genericBaseline, legacyFixture.natGeneric, 'legacy saves seed the baseline from their saved national value');
  assert.ok(Math.abs(migratedLegacy.natGeneric - environment.genericAverage(migratedLegacy)) < 0.01, 'legacy save display is synchronized to its saved state environments');
  const reloadedNews = loadFixture(newsApplied);
  assert.equal(reloadedNews.genericBaseline, newsBaseline, 'news saves preserve the baseline across reload');
  assert.ok(Math.abs(reloadedNews.natGeneric - environment.genericAverage(reloadedNews)) < 0.01, 'news saves preserve a synchronized display value');
  const legacyFinanceFixture = { ...opened };
  delete legacyFinanceFixture.aiFunds;
  delete legacyFinanceFixture.aiIncome;
  delete legacyFinanceFixture.weeklyAIIncomeDraws;
  delete legacyFinanceFixture.weeklyAIIncomeDrawsWeek;
  const migratedLegacyFinance = loadFixture(legacyFinanceFixture);
  assert.deepEqual(migratedLegacyFinance.aiFunds, { dem: 0, rep: 0, lib: 0, grn: 0 }, 'legacy saves do not receive newly tracked AI starting bankrolls');
  assert.deepEqual(migratedLegacyFinance.weeklyAIIncomeDraws, { rep: 10, lib: 10, grn: 10 }, 'legacy saves receive a stable migration draw without a reroll');

  const originalRandom = Math.random;
  let plannedOpponentWeek;
  try {
    Math.random = () => 0.42;
    plannedOpponentWeek = engine.opponentTurn(opened);
  } finally {
    Math.random = originalRandom;
  }
  assert.ok(plannedOpponentWeek.oppRival?.strategy?.label, 'the opponent logs a high-level campaign plan');
  assert.ok(plannedOpponentWeek.oppRival.strategy.reason, 'the opponent explains its plan without exposing its score');
  assert.ok(plannedOpponentWeek.rivals?.length >= 2 && plannedOpponentWeek.rivals.every((rival) => rival.strategy?.label && rival.strategy.reason), 'background third-party campaigns log their strategy and reasoning');
  assert.ok(plannedOpponentWeek.rivals.every((rival) => rival.moves.length === 7), 'background rivals also keep paid media within their seven-action plan');
  assert.ok(plannedOpponentWeek.oppRival.moves.length >= 7, 'the opponent plan accounts for its weekly actions');
  assert.equal(plannedOpponentWeek.lastOpponent.actionMix.length, 7, 'the opponent varies exactly seven planned weekly actions');
  assert.ok(
    plannedOpponentWeek.oppRival.moves.some((move) => ['surrogate', 'townhall', 'downballot-help', 'fundraiser', 'debate-prep', 'quiet', 'issue-ad'].includes(move.type)),
    'the opponent varies its weekly plan beyond generic stops and a broad ad buy',
  );
  const variedActionMixes = new Set();
  const variedOpponentGame = {
    ...opened,
    week: 5,
    aiFunds: { ...opened.aiFunds, rep: 50 },
    aiLastFundraiserWeek: -10,
    strategyProfile: {
      ...opened.strategyProfile,
      issueFocus: { economy: 3 },
    },
    fatigue: {
      ...(opened.fatigue || {}),
      rep: { ...(opened.fatigue?.rep || {}), PA: { stop: 4, ad: 1 } },
    },
  };
  for (const randomValue of [0.01, 0.08, 0.16, 0.24, 0.32, 0.4, 0.48, 0.56, 0.64, 0.72, 0.8, 0.88, 0.96]) {
    const previousRandom = Math.random;
    try {
      Math.random = () => randomValue;
      const variedWeek = engine.opponentTurn(variedOpponentGame);
      assert.equal(variedWeek.lastOpponent.actionMix.length, 7, `opponent action budget remains seven at random roll ${randomValue}`);
      variedWeek.lastOpponent.actionMix.forEach((action) => variedActionMixes.add(action));
    } finally {
      Math.random = previousRandom;
    }
  }
  assert.ok(variedActionMixes.size >= 8, `weekly plans use a broad action mix across campaign conditions: ${[...variedActionMixes].join(', ')}`);
  assert.ok((plannedOpponentWeek.aiFunds?.rep ?? 0) >= 0, 'opponent campaign planning never spends below zero');
  const opponentLegislatureTargets = engine.opponentTargets(opened, engine.DIFFICULTIES.medium, 'field');
  assert.ok(
    opponentLegislatureTargets.some((target) => target.legislatureSeats > 0 && target.kinds.includes('legislature')),
    'the opponent planner considers seats actually scheduled in 2028 state-legislature elections',
  );
  assert.ok(
    Object.keys(plannedOpponentWeek.lastOpponent.genericDeltas || {}).some((abbr) =>
      Math.abs((plannedOpponentWeek.stateGeneric?.[abbr] || 0) - (opened.stateGeneric?.[abbr] || 0)) > 0.001
    ),
    'the opponent moves the state generic ballot when it targets a competitive state-legislature opportunity',
  );
  const neglectedMoveReceipt = incidents.recordIncident(opened, plannedOpponentWeek, { type: 'opponent' });
  const neglectedMoveKey = triggeredEvents.TRIGGERED_EVENT_DEFINITIONS.find((definition) => definition.number === '072')?.onceKey;
  assert.ok(plannedOpponentWeek.lastOpponent?.neglectedStateMove?.effectApplied, 'the opponent logs an applied stop or ad in a state the player has not recently worked');
  assert.equal(neglectedMoveReceipt.incidentLedger.at(-1)?.state, plannedOpponentWeek.lastOpponent.neglectedStateMove.abbr, 'the neglected-state receipt names the affected state');
  assert.ok(neglectedMoveReceipt.pendingInterrupts.some((item) => (item.onceKey || item.event?.onceKey) === neglectedMoveKey), 'a documented rival entry into an unattended state queues its follow-up');
  const closeRaceBudget = aiCampaign.aiBudgetPlan(opened, 'rep', () => 0);
  const comfortableLeadBudget = aiCampaign.aiBudgetPlan(opened, 'rep', () => 20);
  const mediaReserve = aiCampaign.aiBudgetPlan(opened, 'rep', () => 0, 0.7);
  const suburbanReserve = aiCampaign.aiBudgetPlan(opened, 'rep', () => 0, 1.1);
  assert.ok(closeRaceBudget.reserve <= comfortableLeadBudget.reserve, 'a close race releases more of the future media reserve');
  assert.ok(mediaReserve.reserve < suburbanReserve.reserve, 'candidate risk style changes how much cash the AI holds back');
  assert.ok(Number.isFinite(closeRaceBudget.weeklyCap) && closeRaceBudget.weeklyCap >= 0, 'the AI weekly spend plan stays finite and nonnegative');
  const thirdPartyRows = states.STATE_LIST.map((state) => ({ abbr: state.abbr, name: state.name, ev: state.ev, share: 2.5 }));
  const reachPlan = aiCampaign.thirdPartyCampaignPlan({ thirdMode: 'fringe', week: 4, totalWeeks: 14 }, thirdPartyRows, 'lib');
  assert.equal(reachPlan.objective, 'reach-threshold', 'a low-support third party pursues national vote-share growth');
  const nearLinePlan = aiCampaign.thirdPartyCampaignPlan({ thirdMode: 'fringe', week: 4, totalWeeks: 14 }, thirdPartyRows.map((state) => ({ ...state, share: 4.8 })), 'lib');
  assert.equal(nearLinePlan.objective, 'reach-threshold', 'support below 5% continues to pursue the national vote-share threshold');
  const protectPlan = aiCampaign.thirdPartyCampaignPlan({ thirdMode: 'fringe', week: 4, totalWeeks: 14 }, thirdPartyRows.map((state) => ({ ...state, share: 5.1 })), 'grn');
  assert.equal(protectPlan.objective, 'protect-threshold', 'a near-threshold third party protects its national vote share');
  const strongholdRows = thirdPartyRows.map((state) => ({ ...state, share: state.abbr === 'AK' ? 34 : 8 }));
  const strongholdPlan = aiCampaign.thirdPartyCampaignPlan({ thirdMode: 'surge', week: 4, totalWeeks: 14 }, strongholdRows, 'grn');
  assert.equal(strongholdPlan.objective, 'build-strongholds', 'four-party surge campaigns consolidate strong states');
  assert.equal(strongholdPlan.targets[0].abbr, 'AK', 'stronghold targeting prioritizes the ticket’s strongest state');
  assert.equal(engine.decisionEventCountForRoll({ ...opened, week: 1 }, 0.1), 1);
  assert.equal(engine.decisionEventCountForRoll({ ...opened, week: 1 }, 0.65), 2);
  assert.equal(engine.decisionEventCountForRoll({ ...opened, week: 1 }, 0.95), 3);
  assert.equal(engine.decisionEventCountForRoll({ ...opened, week: opened.totalWeeks - 1 }, 0.1), 5);
  assert.equal(vanceSuccession.VANCE_SUCCESSION_EVENTS.length, 5, 'Vance’s alternate-history arc contains five events');
  const vanceFinalWeek = { ...opened, week: opened.totalWeeks - 1, weeklyIncomeWeek: -1, actionsLeft: engine.ACTIONS_PER_WEEK };
  const successionWeek = engine.startTurn(vanceFinalWeek);
  assert.equal(successionWeek.currentEventId, 'vance_succession_handoff', 'the Trump-to-Vance fictional handoff opens for a Vance opponent');
  assert.equal(successionWeek.vanceSuccessionDeliveredWeek, vanceFinalWeek.week, 'the schedule records the one arc part delivered this week');
  assert.equal(successionWeek.eventSchedule.filter((entry) => entry.id.startsWith('vance_succession_')).length, 1, 'at most one succession event is scheduled per week');
  assert.equal(vanceSuccession.vanceSuccessionEventFor({ ...vanceFinalWeek, sittingPresidentId: 'another-president' }), null, 'the arc is gated when Trump is not the sitting president');
  assert.equal(vanceSuccession.vanceSuccessionEventFor({ ...vanceFinalWeek, opponentId: 'haley' }), null, 'the arc is gated when Vance is not an active Republican candidate');
  let completedSuccession = vanceFinalWeek;
  vanceSuccession.VANCE_SUCCESSION_EVENTS.forEach((event) => {
    completedSuccession = engine.applyChoice({ ...completedSuccession, currentEventData: event }, event.choices[0]);
  });
  assert.equal(completedSuccession.sittingPresidentId, 'vance', 'the fictional handoff updates the sitting president in game state');
  assert.equal(completedSuccession.vanceSuccessionPart, 5, 'the event arc advances through all five choices');
  assert.ok(completedSuccession.vanceSuccessionEffects.moderate >= 10 && completedSuccession.vanceSuccessionEffects.moderate <= 15, 'the arc’s total modeled moderate support gain stays in its intended range');
  assert.ok(completedSuccession.vanceSuccessionEffects.magaLoss >= 15 && completedSuccession.vanceSuccessionEffects.magaLoss <= 25, 'the arc’s modeled MAGA faction loss stays in its intended range');
  assert.ok(completedSuccession.vanceSuccessionEffects.turnoutLoss > 0, 'the arc creates a measurable Republican turnout cost');
  const repeatedSuccessionChoice = engine.applyChoice(completedSuccession, vanceSuccession.VANCE_SUCCESSION_EVENTS[4].choices[0]);
  assert.equal(repeatedSuccessionChoice.vanceSuccessionEffects.moderate, completedSuccession.vanceSuccessionEffects.moderate, 'a succession part cannot apply twice');

  const volunteer = engine.applyAction(opened, 'volunteers', 'PA');
  assert.equal(volunteer.funds, opened.funds - 3, 'volunteer drive spends $3M');
  assert.equal(engine.ACTIONS.find((action) => action.id === 'volunteers').cost, 3);
  const cost = states.groundCost('PA');
  assert.equal(field.groundSetupCost('PA'), Math.round(cost * 2 * 10) / 10);
  assert.equal(field.groundWeeklyCost('PA', 2), Math.round(cost * 10) / 10);
  const stanceIssue = Object.keys(opened.stances)[0];
  const newStance = opened.stances[stanceIssue] === 0 ? 2 : 0;
  const stanceShift = engine.changeStance(opened, stanceIssue, newStance);
  assert.ok(Object.keys(stanceShift.demographicMods || {}).length > 0, 'individual voter issue profiles influence coalition changes');

  const nationalBefore = environment.genericAverage(opened);
  environment.applyNationalGenericSwing(opened, 0.75, 'economy');
  const nationalAfter = environment.genericAverage(opened);
  assert.ok(Math.abs(nationalAfter - nationalBefore - 0.75) <= 0.01, 'national swing redistributes to the requested aggregate');
  assert.ok(Object.values(opened.stateGeneric).every((value) => value >= -30 && value <= 30), 'state ballot values stay bounded');

  const baseMargin = downballot.raceMargin('PA', 'house', opened, () => 0);
  const priorLocalEffect = opened.downballotNews?.house?.PA || 0;
  const newsMargin = downballot.raceMargin('PA', 'house', {
    ...opened,
    downballotNews: { ...opened.downballotNews, house: { ...(opened.downballotNews?.house || {}), PA: priorLocalEffect + 1.25 } },
  }, () => 0);
  assert.ok(Math.abs(newsMargin - baseMargin - 1.25) < 1e-9, 'local news affects the matching downballot race');
  const senate = downballot.buildSenate(opened, () => 0);
  assert.ok(senate.races.every((race) => Math.abs(Object.values(race.shares).reduce((sum, value) => sum + value, 0) - 100) < 0.02), 'Senate share model remains normalized');
  assert.equal(engine.prepAnswerBonus(1), 0.35, "one debate-prep session adds 0.35 momentum per answer");
  assert.equal(engine.prepAnswerBonus(3), 1.05, "three prep sessions add 1.05 momentum per answer");
  assert.equal(engine.prepGaffeScale(1), 0.85, "one prep session reduces gaffe risk by 15%");
  assert.equal(engine.prepGaffeScale(3), 0.55, "three prep sessions stop at the 55% minimum risk scale");
  const noRaceQuality = { ...opened, raceQuality: {} };
  const withRaceQuality = { ...opened, raceQuality: { "house:PA": 4, "senate:PA": 4, "gov:PA": 4 } };
  assert.ok(Math.abs(downballot.raceMargin("PA", "house", withRaceQuality, () => 0) - downballot.raceMargin("PA", "house", noRaceQuality, () => 0) - 2) < 1e-9, "House candidate quality is dampened by 50%");
  assert.ok(Math.abs(downballot.raceMargin("PA", "senate", withRaceQuality, () => 0) - downballot.raceMargin("PA", "senate", noRaceQuality, () => 0) - 4) < 1e-9, "Senate candidate quality is not dampened");
  assert.ok(Math.abs(downballot.raceMargin("PA", "gov", withRaceQuality, () => 0) - downballot.raceMargin("PA", "gov", noRaceQuality, () => 0) - 4) < 1e-9, "governor candidate quality is not dampened");
  assert.equal(game.govStart.dem + game.govStart.rep + game.govStart.other, 50, 'governor starting chamber totals 50 seats');
  assert.equal(downballot.PARTY_COLOR.ind, marginColors.COLOR_TOKENS.independent, 'independent-party maps share the purple palette token');
  assert.equal(polling.partyColorOf('ind'), marginColors.COLOR_TOKENS.independent, 'independent vote charts use purple by default');
  assert.equal(downballot.partyColorForRace('ind', { indCand: { colorKey: 'mcmullin' } }), marginColors.COLOR_TOKENS.mcmullin, 'McMullin retains his identity-specific orange');
  assert.equal(downballot.marginFamilyForRace('ind', { indCand: { colorKey: 'mcmullin' } }), 'mcmullin', 'McMullin margin shades use his identity-specific color family');

  const decisionEvents = Object.values(events.EVENT_BY_ID).filter((event) => event.choices?.length);
  assert.ok(decisionEvents.length >= 2, 'decision event catalog is available');
  const [first, second] = decisionEvents;
  const queued = {
    ...opened,
    currentEventId: first.id,
    eventSchedule: [
      { id: first.id, why: 'Regression fixture', afterActions: 0 },
      { id: second.id, why: 'Second checkpoint', afterActions: 3 },
    ],
    eventScheduleIndex: 0,
    decisionEventCount: 2,
    outcome: null,
  };
  assert.equal(engine.decisionPending(queued), true);
  assert.equal(engine.applyAction(queued, 'visit', 'PA'), queued, 'unanswered decision blocks campaign actions in the engine');
  let afterChoice = engine.applyChoice(queued, first.choices[0]);
  for (let action = 0; action < 3; action += 1) {
    afterChoice = engine.applyAction(afterChoice, 'visit', 'PA');
    afterChoice = engine.advanceDecisionEvent(afterChoice);
  }
  assert.equal(afterChoice.currentEventId, second.id, 'second decision opens after action three');
  assert.equal(afterChoice.eventScheduleIndex, 1);
  assert.equal(engine.decisionPending(afterChoice), true);

  assert.equal(rivalIncidentNews.RIVAL_INCIDENT_NEWS.length, 20, "the national mistake catalog contains twenty stories");
  const newsReceipt = { id: "w2-opponent-plan-1", sourceType: "opponent-plan", recap: "Recorded rival interview", payload: { rivalNewsIncident: { ...rivalIncidentNews.RIVAL_INCIDENT_NEWS[0], evidenceType: "interview transcript", evidence: "Transcript excerpt verifies the contradiction." } } };
  const receiptGatedCard = nationalNews.drawNationalNews({ ...opened, incidentLedger: [newsReceipt], rivalIncidentNewsReceiptIds: [] });
  assert.equal(receiptGatedCard.receiptId, newsReceipt.id, "a rival mistake story is selected from its recorded receipt");
  assert.match(receiptGatedCard.body, /Transcript excerpt verifies the contradiction/, "the news brief shows its recorded evidence");
  const noReceiptCard = nationalNews.drawNationalNews({ ...opened, incidentLedger: [], rivalIncidentNewsReceiptIds: [] });
  assert.equal(noReceiptCard.receiptId, undefined, "the rival mistake catalog cannot publish without a receipt");
  const publishedReceiptCard = nationalNews.applyNationalNews({ ...opened, incidentLedger: [newsReceipt], rivalIncidentNewsReceiptIds: [] }, receiptGatedCard);
  assert.deepEqual(publishedReceiptCard.rivalIncidentNewsReceiptIds, [newsReceipt.id], "publishing records the receipt as used");
  assert.equal(nationalNews.applyNationalNews(publishedReceiptCard, receiptGatedCard), publishedReceiptCard, "a published receipt cannot apply its swing twice");
  assert.notEqual(nationalNews.drawNationalNews(publishedReceiptCard).receiptId, newsReceipt.id, "a published receipt is not selected again");
  const gaffeIncident = incidents.recordIncident(opened, {
    ...opened,
    debate: { id: 'debate1', picks: [{ label: 'Test answer', reply: 'Recorded reply', scandal: { level: 'minor' } }] },
  }, { type: 'debate' });
  assert.equal(gaffeIncident.incidentLedger.length, 1, 'debate response creates a durable receipt');
  assert.equal(gaffeIncident.pendingInterrupts.length, 1, 'a recorded debate gaffe queues a response');
  assert.match(gaffeIncident.pendingInterrupts[0].event.why, /Recorded reply/, 'the response uses the recorded debate reply in its evidence rationale');

  const previousRandomForDebates = Math.random;
  Math.random = () => 0.99;
  try {
    const firstDebate = debates.DEBATE_BY_ID.debate1;
    const debateAt = (step, picks = [], debatePrep = 0) => ({
      ...opened,
      week: 3,
      debatePrep,
      debate: { id: firstDebate.id, step, picks, done: false, verdict: null },
    });
    const onceKeyFor = (number) => triggeredEvents.TRIGGERED_EVENT_DEFINITIONS.find((definition) => definition.number === number)?.onceKey;
    const queuedKeys = (recorded) => recorded.pendingInterrupts.map((item) => item.onceKey || item.event?.onceKey);

    const leakGame = engine.forceEvent(opened, 'leak');
    const leakResolved = engine.applyChoice(leakGame, leakGame.currentEventData.choices[0]);
    const memoLeakReceipt = incidents.recordIncident(leakGame, leakResolved, { type: 'choice' });
    const memoFollowup = memoLeakReceipt.pendingInterrupts.find((item) => (item.onceKey || item.event?.onceKey) === onceKeyFor('013'));
    assert.ok(memoFollowup, 'the existing leaked-memo event queues the second-page follow-up');
    assert.match(memoLeakReceipt.incidentLedger.at(-1).payload.eventText, /cannot be trusted with an unscripted lunch/, 'the receipt keeps the exact memo line shown in the initiating event');
    assert.match(memoFollowup.event.why, /unscripted lunch/, 'the follow-up cites the specific recorded memo line');
    assert.ok(memoFollowup.event.choices.every((choice) => choice.outcome && choice.effects), 'memo responses have branch-specific outcomes and effects');
    const memoResponse = engine.applyChoice({
      ...leakResolved,
      pendingInterrupts: memoLeakReceipt.pendingInterrupts,
      currentInterrupt: memoFollowup,
    }, memoFollowup.event.choices[2]);
    assert.equal(memoResponse.staff.communications.morale, leakResolved.staff.communications.morale - 8, 'disavowing the memo author reduces communications morale');
    assert.equal(memoResponse.staff.tension, leakResolved.staff.tension + 6, 'disavowing the memo author raises internal staff tension');
    assert.equal(memoResponse.pendingInterrupts.length, 0, 'answering the memo follow-up clears its one-time queue item');

    const unrelatedGame = engine.forceEvent(opened, 'strike');
    const unrelatedResolved = engine.applyChoice(unrelatedGame, unrelatedGame.currentEventData.choices[0]);
    const unrelatedReceipt = incidents.recordIncident(unrelatedGame, unrelatedResolved, { type: 'choice' });
    assert.ok(!queuedKeys(unrelatedReceipt).includes(onceKeyFor('013')), 'an unrelated event cannot trigger the memo follow-up');

    const townHallGame = { ...opened, week: 3, actionsLeft: 3 };
    const townHallAnswers = [
      { issueId: 'economy', issue: 'The economy', question: 'What will you do about jobs?', response: 'Connect it to local life', responseApproach: 'Explain what the position means here.' },
      { issueId: 'health', issue: 'Health care', question: 'What would you change?', response: 'Answer plainly', responseApproach: 'Give a direct answer.' },
      { issueId: 'rent', issue: 'Housing', question: 'How can families afford rent?', response: 'Push back on the premise', responseApproach: 'Challenge the question.' },
    ];
    const townHallResolved = engine.applyAction(townHallGame, 'townhall', 'PA', { score: 4, answers: townHallAnswers });
    const townHallReceipt = incidents.recordIncident(townHallGame, townHallResolved, { type: 'townhall', abbr: 'PA', score: 4, answers: townHallAnswers });
    const pressMoment = townHallReceipt.pendingInterrupts.find((item) => (item.onceKey || item.event?.onceKey) === onceKeyFor('015'));
    assert.ok(pressMoment, 'a completed town hall with a recorded Q&A queues the press-pool follow-up');
    assert.equal(townHallReceipt.incidentLedger.at(-1).payload.actionReceipt.publicStopMoment.answers.length, 3, 'the receipt preserves all three actual town-hall question and response records');
    assert.match(townHallReceipt.weekLog.at(-1), /answered 3 attendee questions/, 'the campaign history visibly includes the public-stop recap');
    assert.match(pressMoment.event.why, /selected response approach/, 'the follow-up explains which recorded Q&A it concerns');
    assert.ok(pressMoment.event.choices.every((choice) => choice.outcome && choice.effects), 'press-pool responses have distinct effects and outcomes');
    const emptyTownHall = engine.applyAction(townHallGame, 'townhall', 'PA', { score: 4 });
    const emptyTownHallReceipt = incidents.recordIncident(townHallGame, emptyTownHall, { type: 'townhall', abbr: 'PA', score: 4 });
    assert.ok(!queuedKeys(emptyTownHallReceipt).includes(onceKeyFor('015')), 'a town hall without its recorded prompts cannot trigger the press-pool follow-up');
    const visitGame = { ...opened, week: 3, actionsLeft: 3 };
    const visitResolved = engine.applyAction(visitGame, 'visit', 'PA');
    const visitReceipt = incidents.recordIncident(visitGame, visitResolved, { type: 'action', actionId: 'visit', abbr: 'PA' });
    assert.ok(!queuedKeys(visitReceipt).includes(onceKeyFor('015')), 'a state visit without a recorded public Q&A cannot trigger the press-pool follow-up');

    const storyId = 'news-fatigue-regression';
    const storyGame = {
      ...opened,
      week: 3,
      funds: 100,
      stories: [{ id: storyId, abbr: 'PA', topic: 'the town hall', headline: 'Questions from Pennsylvania stay in the news', salience: 76, life: 2, tone: 'bad', weight: 0.5, origin: 'townhall', updates: 2 }],
      spins: {},
    };
    const storySpin = campaignNews.spinStory(storyGame, 'PA', storyId, 'amplify');
    const storyReceipt = incidents.recordIncident(storyGame, storySpin, { type: 'spin', abbr: 'PA' });
    const newsFatigueFollowup = storyReceipt.pendingInterrupts.find((item) => (item.onceKey || item.event?.onceKey) === onceKeyFor('019'));
    assert.ok(newsFatigueFollowup, 'a high-salience story with two recorded updates and a player response queues its fatigue follow-up');
    assert.match(newsFatigueFollowup.event.why, /Questions from Pennsylvania stay in the news/, 'the story response cites the recorded headline');
    assert.ok(newsFatigueFollowup.event.choices.every((choice) => choice.outcome && choice.effects), 'news-cycle fatigue responses have branch-specific outcomes and effects');
    const shortStoryGame = { ...storyGame, stories: [{ ...storyGame.stories[0], updates: 1 }] };
    const shortStorySpin = campaignNews.spinStory(shortStoryGame, 'PA', storyId, 'amplify');
    const shortStoryReceipt = incidents.recordIncident(shortStoryGame, shortStorySpin, { type: 'spin', abbr: 'PA' });
    assert.ok(!queuedKeys(shortStoryReceipt).includes(onceKeyFor('019')), 'one recorded update is not enough to claim a sustained news cycle');

    const adGame = { ...opened, week: 3, funds: 100 };
    const adResolved = engine.runAdBlitz(adGame, { abbr: 'PA', issueId: 'economy', kind: 'pro', typeId: 'tv' });
    const adReceipt = incidents.recordIncident(adGame, adResolved, { type: 'ad', issueId: 'economy', kind: 'pro', abbrs: ['PA'] });
    const adWorksFollowup = adReceipt.pendingInterrupts.find((item) => (item.onceKey || item.event?.onceKey) === onceKeyFor('021'));
    assert.ok(adResolved.lastAd.swing > 0 && adResolved.lastAd.points > 0, 'a successful ad result records favorable turnout movement');
    assert.ok(adWorksFollowup, 'a favorable ad turnout report queues the ad-success follow-up');
    assert.match(adWorksFollowup.event.why, /does not add a polling bonus/, 'the follow-up distinguishes turnout movement from a polling bonus');
    assert.ok(adWorksFollowup.event.choices.every((choice) => choice.outcome && choice.effects), 'ad-success responses have branch-specific outcomes and effects');
    Math.random = () => 0.1;
    const dudAd = engine.runAdBlitz(adGame, { abbr: 'PA', issueId: 'economy', kind: 'pro', typeId: 'tv' });
    const dudAdReceipt = incidents.recordIncident(adGame, dudAd, { type: 'ad', issueId: 'economy', kind: 'pro', abbrs: ['PA'] });
    assert.ok(dudAd.lastAd.swing < 0, 'a dud ad reports negative turnout movement');
    assert.ok(!queuedKeys(dudAdReceipt).includes(onceKeyFor('021')), 'an ad with negative turnout movement cannot trigger the success follow-up');
    Math.random = () => 0.99;

    const pledgeGame = debateAt(0);
    const pledged = engine.answerDebate(pledgeGame, firstDebate.questions[0].answers[0]);
    const pledgeReceipt = incidents.recordIncident(pledgeGame, pledged, { type: 'debate' });
    assert.equal(pledged.promiseLedger.at(-1)?.text, firstDebate.questions[0].answers[0].promise.text, 'a specific debate pledge enters the promise ledger');
    assert.ok(queuedKeys(pledgeReceipt).includes(onceKeyFor('006')), 'a recorded debate pledge queues its matching response');

    const evasiveGame = debateAt(1, [], 3);
    const evasive = engine.answerDebate(evasiveGame, firstDebate.questions[1].answers.find((answer) => answer.evasive));
    const evasiveReceipt = incidents.recordIncident(evasiveGame, evasive, { type: 'debate' });
    assert.equal(evasive.debate.picks.at(-1)?.evasive, true, 'the transcript records an explicitly evasive answer');
    assert.equal(evasive.debate.picks.at(-1)?.clip?.status, 'widely-shared', 'a high-response answer crosses its clip threshold');
    assert.ok(queuedKeys(evasiveReceipt).includes(onceKeyFor('003')), 'a widely shared debate clip queues its response');
    assert.ok(queuedKeys(evasiveReceipt).includes(onceKeyFor('005')), 'an evasive answer queues its response');

    const groupGame = debateAt(2, [{ mom: 0 }, { mom: 0 }]);
    const polarized = engine.answerDebate(groupGame, firstDebate.questions[2].answers.find((answer) => answer.groupResponseByParty));
    const groupReceipt = incidents.recordIncident(groupGame, polarized, { type: 'debate' });
    const groupShifts = polarized.debate.picks.at(-1)?.groupShifts || {};
    assert.ok(Object.values(groupShifts).some((shift) => shift > 0) && Object.values(groupShifts).some((shift) => shift < 0), 'debate response records two voter groups moving in opposite directions');
    assert.ok(queuedKeys(groupReceipt).includes(onceKeyFor('007')), 'opposing voter-group responses queue their matching follow-up');

    const brokenIssueId = Object.keys(opened.stances)[0];
    const brokenPromiseGame = {
      ...opened,
      week: 3,
      stances: { ...opened.stances, [brokenIssueId]: ((opened.stances[brokenIssueId] ?? 1) + 1) % 3 },
      promiseLedger: [{
        id: 'broken-promise-regression',
        week: 1,
        abbr: null,
        issueId: brokenIssueId,
        stance: opened.stances[brokenIssueId] ?? 1,
        broken: true,
        brokenWeek: 2,
        exploitedWeek: null,
      }],
    };
    let exploitedPromise;
    try {
      Math.random = () => 0.42;
      exploitedPromise = engine.opponentTurn(brokenPromiseGame);
    } finally {
      Math.random = previousRandomForDebates;
    }
    const brokenPromiseReceipt = incidents.recordIncident(brokenPromiseGame, exploitedPromise, { type: 'opponent' });
    const promiseAttack = brokenPromiseReceipt.incidentLedger.at(-1)?.payload?.promiseAttack;
    assert.ok(promiseAttack?.effectApplied && promiseAttack.stateHit > 0, 'a rival promise attack records an applied state effect');
    assert.ok(states.STATE_BY_ABBR[promiseAttack.abbr], 'a debate promise without a state targets a real competitive state');
    assert.equal(brokenPromiseReceipt.incidentLedger.at(-1)?.state, promiseAttack.abbr, 'the attack receipt is tied to its affected state');
    assert.ok(queuedKeys(brokenPromiseReceipt).includes(onceKeyFor('062')), 'a published promise comparison queues its matching follow-up');

    const laborLeader = campaignOperations.ENDORSEMENT_LEADERS.find((leader) => leader.id === 'labor-council');
    const opposedStances = { ...opened.stances };
    Object.entries(laborLeader.preferences).forEach(([issueId, preferred]) => {
      opposedStances[issueId] = preferred === 0 ? 2 : 0;
    });
    const endorsementConflict = {
      ...opened,
      week: 3,
      stances: opposedStances,
      endorsements: {
        ...opened.endorsements,
        [laborLeader.id]: {
          ...opened.endorsements[laborLeader.id],
          status: 'watching',
          favor: 54,
          memory: [{ week: 2, issueId: 'economy', issue: 'Economy', stance: 2, reaction: 'concern' }],
        },
      },
    };
    const delayedEndorsement = campaignOperations.requestEndorsement(endorsementConflict, laborLeader.id);
    const endorsementReceipt = incidents.recordIncident(endorsementConflict, delayedEndorsement, { type: 'endorsement', leaderId: laborLeader.id });
    assert.equal(delayedEndorsement.lastEndorsementRequest?.delayedForPolicy, true, 'a low-fit request with a recorded policy concern is logged as delayed');
    assert.ok(queuedKeys(endorsementReceipt).includes(onceKeyFor('093')), 'a policy-based endorsement delay queues its matching follow-up');

    const overexposedState = {
      ...opened,
      fatigue: {
        ...opened.fatigue,
        [opened.party]: { ...(opened.fatigue?.[opened.party] || {}), PA: { stop: 2, promise: 0, ad: 0 } },
      },
      totalFatigue: { ...(opened.totalFatigue || {}), PA: 2 },
      strategyProfile: { stateActions: { PA: 2 }, issueFocus: {}, messages: [] },
    };
    const repeatedStop = engine.applyAction(overexposedState, 'visit', 'PA');
    const overexposureReceipt = incidents.recordIncident(overexposedState, repeatedStop, { type: 'action', actionId: 'visit', abbr: 'PA' });
    assert.ok(repeatedStop.lastActionEvidence?.engagementDrop >= 10, 'a repeated state visit records a measurable local engagement penalty');
    assert.ok(queuedKeys(overexposureReceipt).includes(onceKeyFor('035')), 'a visit with repeated local fatigue queues its matching follow-up');
    const followOnFundraise = engine.applyAction(repeatedStop, 'fundraise', 'PA');
    const followOnReceipt = incidents.recordIncident(repeatedStop, followOnFundraise, { type: 'action', actionId: 'fundraise', abbr: 'PA' });
    assert.equal(followOnReceipt.incidentLedger.at(-1)?.payload?.actionReceipt, null, 'a later action cannot reuse stale local-overexposure evidence');
  } finally {
    Math.random = previousRandomForDebates;
  }

  const interruptWeek = engine.startTurn({
    ...opened,
    week: 1,
    weeklyIncomeWeek: -1,
    incidentLedger: gaffeIncident.incidentLedger,
    incidentSequence: gaffeIncident.incidentSequence,
    pendingInterrupts: gaffeIncident.pendingInterrupts,
  });
  assert.equal(interruptWeek.currentEventData.id, gaffeIncident.pendingInterrupts[0].event.id, 'the queued response becomes a scheduled decision card');
  assert.equal(engine.decisionPending(interruptWeek), true, 'a queued response pauses action until answered');
  const answeredInterrupt = engine.applyChoice(interruptWeek, interruptWeek.currentEventData.choices[0]);
  assert.equal(answeredInterrupt.pendingInterrupts.length, 0, 'answering the response clears its one-time queue item');
  const answeredReceipt = incidents.recordIncident(interruptWeek, answeredInterrupt, { type: 'choice' });
  assert.equal(answeredReceipt.incidentLedger.at(-1).sourceType, 'event-choice', 'the response choice is itself receipted');

  const gopSpecialists = factions.factionEffects({ ...opened, party: 'rep', candidateId: 'vance', factions: { religious: 100, business: 50, officials: 50, base: 50, donors: 50 } });
  assert.ok(gopSpecialists.religiousTurnoutMul > 1, 'religious standing improves faith-supported turnout actions');
  const libertarianSpecialists = factions.factionEffects({ ...opened, party: 'lib', candidateId: 'harris', factions: { students: 100, activists: 50, officials: 100, donors: 50 } });
  assert.ok(libertarianSpecialists.youthOutreachMul > 1, 'student standing improves volunteer outreach');
  assert.ok(libertarianSpecialists.ballotAccessMul > 1, 'party officer standing improves third-party campaign work');
  const greenSpecialists = factions.factionEffects({ ...opened, party: 'grn', candidateId: 'harris', factions: { climate: 100, activists: 50, officials: 50, donors: 50 } });
  assert.ok(greenSpecialists.climatePersuasionMul > 1, 'climate standing improves successful climate promises');
  const greenGroupBonuses = factions.factionGroupBonuses({ party: 'grn', candidateId: 'harris', factions: { climate: 100, activists: 50, officials: 50, donors: 50 } });
  assert.ok(greenGroupBonuses['far left'] > factions.factionGroupBonuses({ party: 'grn', candidateId: 'harris', factions: { climate: 50, activists: 50, officials: 50, donors: 50 } })['far left'], 'faction-specific group bonuses scale with standing');
  assert.equal(conflictData.FACTION_CONFLICT_EVENTS.length, 8, 'the faction conflict set contains eight templates');
  conflictData.FACTION_CONFLICT_EVENTS.forEach((event) => {
    const partyFactions = new Set(factions.FACTION_SETS[event.partyOnly].map((faction) => faction.id));
    assert.ok(event.oncePerScenario, `${event.id} is one-time per campaign`);
    assert.ok(event.factionConflict.factions.every((id) => partyFactions.has(id)), `${event.id} uses valid factions for its party`);
    assert.ok(eventContext.eventContextReason(event, { ...opened, party: event.partyOnly }), `${event.id} is eligible for its party`);
  });
  const rivalFactionConflict = conflictData.FACTION_CONFLICT_EVENTS.find((event) => event.partyOnly === opened.opponentParty);
  assert.ok(rivalFactionConflict, 'the rival has a faction-conflict card for its party');
  assert.ok(eventContext.eventContextReason(rivalFactionConflict, opened, true), 'the rival can draw its own party faction conflict');
  const opponentFactionBefore = { ...opened.aiFactions[opened.opponentParty] };
  const opponentConflictGame = {
    ...opened,
    usedEvents: events.EVENTS.filter((event) => event.id !== rivalFactionConflict.id).map((event) => event.id),
  };
  const randomBeforeConflict = Math.random;
  let opponentConflictResult;
  try {
    Math.random = () => 0.42;
    opponentConflictResult = engine.opponentTurn(opponentConflictGame);
  } finally {
    Math.random = randomBeforeConflict;
  }
  assert.equal(opponentConflictResult.lastOpponent?.eventTitle, rivalFactionConflict.title, 'the rival resolves the eligible faction conflict');
  assert.ok(Object.entries(opponentConflictResult.aiFactions[opened.opponentParty]).some(([id, value]) => value !== opponentFactionBefore[id]), 'the rival choice changes its own faction standing');
  assert.equal(events.EVENT_BY_ID.m1_ballot_initiative.scriptedOnly, true, 'the unqualified generic ballot-measure card cannot enter normal campaign draws');
  assert.equal(eventContext.eventContextReason(events.EVENT_BY_ID.m1_ballot_initiative, opened), null, 'legacy ballot-measure effects stay disabled until the data-driven rules are integrated');
  const targetConflict = conflictData.FACTION_CONFLICT_EVENTS[0];
  const onlyConflict = eventContext.drawContextualEvent({
    ...opened,
    usedEvents: events.EVENTS.filter((event) => event.id !== targetConflict.id).map((event) => event.id),
  });
  assert.equal(onlyConflict.id, targetConflict.id, 'an unused conflict template can enter the regular event schedule');
  const exhaustedConflict = eventContext.drawContextualEvent({ ...opened, usedEvents: events.EVENTS.map((event) => event.id) });
  assert.notEqual(exhaustedConflict.id, targetConflict.id, 'a conflict template does not repeat after its one-time use');

  Object.entries(factions.FACTION_SETS).forEach(([party, partyFactions]) => {
    partyFactions.forEach((faction) => {
      const milestone = milestoneData.FACTION_MILESTONES[party]?.[faction.id];
      assert.ok(milestone?.atZero?.title && milestone?.atHundred?.title, `${party}:${faction.id} has both boundary outcomes`);
      assert.ok(milestone.atHundred.options.length >= 2, `${party}:${faction.id} offers meaningful reward deployment choices`);
    });
  });

  const lowBase = {
    ...opened,
    factions: { ...opened.factions, activists: 1 },
    demographicMods: { ...(opened.demographicMods || {}) },
    turnout: { ...(opened.turnout || {}) },
    funds: 20,
  };
  const lowCrossing = reactions.withReactionSummary(lowBase, { ...lowBase, momentum: lowBase.momentum - 3 }, { type: 'choice' });
  assert.equal(lowCrossing.factions.activists, 0, 'a faction can cross from one point to zero');
  assert.ok(lowCrossing.factionMilestones.includes('dem:activists:0'), 'the zero milestone is saved before its card is shown');
  assert.equal(lowCrossing.factionCrises.activists, true, 'the faction crisis persists in campaign state');
  assert.ok(lowCrossing.turnout.PA.dem < turnoutModule.turnoutRow(lowBase, 'PA').dem, 'the turnout consequence applies before the response card');
  assert.ok(lowCrossing.demographicMods['far left'] < 0, 'zero support immediately damages the aligned coalition');
  assert.ok(factions.factionEffects(lowCrossing).actionMul < 1, 'the zero-support crisis weakens subsequent field actions');
  assert.equal(lowCrossing.pendingInterrupts.length, 1, 'the zero milestone queues one response card');
  assert.equal(lowCrossing.pendingInterrupts[0].event.choices.length, 2, 'the zero response has two distinct outcomes');
  const quietWeek = engine.advanceWeek({ ...lowCrossing, actionsLeft: 0, currentEventId: null, currentEventData: null, eventSchedule: [], eventScheduleIndex: -1 });
  assert.equal(quietWeek.factions.activists, 0, 'a crisis faction does not recover by passive weekly decay');
  assert.equal(quietWeek.factionCrises.activists, true, 'the zero-support crisis remains until support is actively rebuilt');

  const highBase = { ...opened, factions: { ...opened.factions, activists: 99 } };
  const highCrossing = reactions.withReactionSummary(highBase, { ...highBase }, { type: 'action', actionId: 'volunteers' });
  assert.equal(highCrossing.factions.activists, 100, 'a faction can cross from 99 to 100');
  assert.ok(highCrossing.factionMilestones.includes('dem:activists:100'), 'the one-hundred milestone key is saved');
  assert.equal(highCrossing.pendingInterrupts.length, 1, 'the one-hundred milestone queues a response');
  assert.equal(highCrossing.pendingInterrupts[0].event.choices.length, 2, 'the one-hundred card offers two deployment choices');
  const freeVolunteer = engine.applyAction({
    ...opened,
    funds: 0,
    campaignPerks: { ...opened.campaignPerks, freeVolunteerOps: 1 },
  }, 'volunteers', 'PA');
  assert.equal(freeVolunteer.funds, 0, 'the enhanced volunteer deployment waives its cost');
  assert.equal(freeVolunteer.campaignPerks.freeVolunteerOps, 0, 'the enhanced volunteer deployment is consumed once');
  assert.ok(freeVolunteer.turnout.PA.dem > (opened.turnout?.PA?.dem ?? 0), 'the enhanced volunteer deployment raises turnout');
  const storage = {};
  globalThis.localStorage = {
    setItem: (key, value) => { storage[key] = value; },
    getItem: (key) => storage[key] || null,
  };
  engine.saveGame({
    ...highCrossing,
    incomeBoost: { amount: 2, weeks: 3 },
    rivalIncidentNewsReceiptIds: ["w2-opponent-plan-1"],
    rivalIncidentNewsCard: receiptGatedCard,
    houseRule: 'mmp',
    electoralRule: 'district',
    factionCrises: { activists: true },
    factionMilestones: ['dem:activists:100'],
    campaignPerks: { ...highCrossing.campaignPerks, freeVolunteerOps: 1 },
    sittingPresidentId: 'vance',
    vanceSuccessionPart: 2,
    vanceSuccessionStarted: true,
    vanceSuccessionDeliveredWeek: 3,
    vanceSuccessionAppliedParts: [1, 2],
    vanceSuccessionEffects: { moderate: 3.7, magaLoss: 4.5, turnoutLoss: 0.24 },
  });
  const savedCampaign = engine.loadGame();
  const electionCases = [];
  for (const houseRule of ['standard', 'pr', 'mmp']) {
    for (const electoralRule of ['standard', 'proportional', 'district']) {
      electionCases.push({ ...opened, houseRule, electoralRule });
    }
  }
  for (const electionGame of electionCases) {
    const house = downballot.buildHouse(electionGame, () => 0, 'poll');
    const expectedHouseSeats = electionGame.houseRule === 'mmp' ? 870 : 435;
    assert.equal(house.total, expectedHouseSeats, `${electionGame.houseRule} chamber total is correct`);
    assert.equal(house.states.reduce((sum, state) => sum + state.seats, 0), expectedHouseSeats, `${electionGame.houseRule} state totals add up`);
    assert.equal(house.districts.length, electionGame.houseRule === 'pr' ? 0 : 435, `${electionGame.houseRule} uses district races only when the rule calls for them`);
    if (electionGame.houseRule !== 'pr') {
      assert.equal(new Set(house.districts.map((district) => district.id)).size, 435, `${electionGame.houseRule} has one unique result per constituency district`);
      assert.equal(house.districts.reduce((sum, district) => sum + (district.seats || 0), 0), 435, `${electionGame.houseRule} constituency seats total 435`);
    }
    if (electionGame.houseRule === 'mmp') {
      assert.equal(house.states.reduce((sum, state) => sum + state.directTotal, 0), 435, 'MMP retains all 435 constituency seats');
      assert.equal(house.states.reduce((sum, state) => sum + state.listTotal, 0), 435, 'MMP adds exactly 435 list seats');
      house.states.forEach((state) => {
        assert.equal(state.seats, downballotData.HOUSE_SEATS[state.state] * 2, `${state.state} MMP size doubles its state delegation`);
        assert.equal(state.directTotal, downballotData.HOUSE_SEATS[state.state], `${state.state} direct seats preserve the current district count`);
      });
    }
    const snapshot = engine.snapshot(electionGame);
    assert.equal(Object.values(snapshot.evBy).reduce((sum, seats) => sum + seats, 0), 538, `${electionGame.electoralRule} awards exactly 538 electors`);
    if (electionGame.electoralRule !== 'standard') {
      snapshot.rows.forEach((state) => {
        assert.equal(Object.values(state.evAwards).reduce((sum, seats) => sum + seats, 0), state.ev, `${electionGame.electoralRule} allocates all ${state.abbr} electors`);
      });
    }
    const forecast = electionForecast.electionForecast(electionGame, { draws: 12, chamberDraws: 12 });
    assert.ok(Number.isFinite(forecast.youWin) && Number.isFinite(forecast.youEV), 'forecast remains finite under every ruleset');
    for (const chamber of [forecast.houseProjection, forecast.senateProjection]) {
      assert.ok(Number.isFinite(chamber.demControl) && Number.isFinite(chamber.repControl), "chamber control forecast is finite");
      assert.ok(Math.abs(chamber.demControl + chamber.repControl + chamber.noMajority - 100) < 1e-9, "chamber control probabilities total 100%");
      assert.ok(chamber.demRange[0] <= chamber.demMedian && chamber.demMedian <= chamber.demRange[1], "Democratic seat median fits its forecast range");
      assert.ok(chamber.total > 0 && chamber.majority > 0, "chamber forecast reflects the active chamber size and threshold");
    }
    const plan = electionNight.buildNight(electionGame);
    assert.equal(plan.stateLegislatureRaces.length, legislatureSummary.chambersWithElections, 'Election Night includes only the 2028 legislative chambers on the regular ballot');
    assert.ok(plan.stateLegislatureRaces.every((race) => race.seatsUp > 0 && race.seatsUp <= race.seats), 'Election Night reports only seats scheduled for election');
    const finalNight = electionNight.nightAt(plan, plan.end + 1);
    assert.equal(Object.values(finalNight.evBy).reduce((sum, seats) => sum + seats, 0), 538, `${electionGame.electoralRule} election night totals 538`);
    assert.equal(finalNight.stateLegislatures.calledRaces, legislatureSummary.chambersWithElections, 'Election Night calls each scheduled state legislative chamber at the end of the count');
    assert.equal(finalNight.stateLegislatures.seatsUpCalled, finalNight.stateLegislatures.totalSeatsUp, 'Election Night reconciles called state legislative seats to the scheduled total');
    assert.equal(finalNight.stateLegislatures.nonpartisan, 49, 'Election Night keeps Nebraska nonpartisan seats outside party tallies');
    if (electionGame.houseRule === 'standard' && electionGame.electoralRule === 'standard') {
      const reportingAt = (minute) => {
        const report = electionNight.nightAt(plan, minute);
        return {
          states: report.rows,
          districts: report.districts,
          senate: report.senate.races,
          house: report.house.states,
          governors: report.gov.races,
        };
      };
      const forecastOptions = { draws: 12, chamberDraws: 12 };
      const noReports = electionForecast.electionForecast(electionGame, forecastOptions);
      const openingReports = electionForecast.electionForecast(electionGame, {
        ...forecastOptions,
        reporting: reportingAt(0),
      });
      assert.ok(Math.abs(openingReports.youWin - noReports.youWin) < 1e-9, `unreported ballots do not move the Election Night forecast (${openingReports.youWin} vs ${noReports.youWin})`);
      assert.ok(Math.abs(openingReports.youEV - noReports.youEV) < 1e-9, 'zero-count reports preserve the expected Electoral College');

      const liveReports = electionForecast.electionForecast(electionGame, {
        ...forecastOptions,
        reporting: reportingAt(Math.floor(plan.end * 0.55)),
      });
      assert.ok(Number.isFinite(liveReports.youWin) && Number.isFinite(liveReports.themWin) && Number.isFinite(liveReports.otherWin), 'mid-count Election Night presidential projection remains finite');
      assert.ok(Math.abs(liveReports.youWin + liveReports.themWin + liveReports.otherWin - 100) < 1e-9, 'mid-count presidential probabilities total 100%');
      for (const chamber of [liveReports.houseProjection, liveReports.senateProjection]) {
        assert.ok(Number.isFinite(chamber.demControl) && Number.isFinite(chamber.repControl) && Number.isFinite(chamber.noMajority), 'mid-count chamber projection remains finite');
        assert.ok(Math.abs(chamber.demControl + chamber.repControl + chamber.noMajority - 100) < 1e-9, 'mid-count chamber probabilities total 100%');
      }
    }
  }
  const exampleDistrict = { id: 'QA-01', stateAbbr: 'AL', districtLeanDMinusR: 5 };
  const exampleGame = {
    ...opened,
    stateGeneric: { ...opened.stateGeneric, AL: -5.5 },
    raceQuality: {},
    downballotNews: { senate: {}, house: {}, gov: {} },
    dbMods: {},
    dbDrag: {},
    factions: { officials: 0 },
  };
  assert.equal(downballot.houseDistrictMargin(exampleDistrict, exampleGame), -0.5, 'a D+5 district under an R+5.5 state generic ballot projects R+0.5');
  const projectedBeforePresidentialChange = downballot.houseDistrictMargin(exampleDistrict, exampleGame);
  const projectedAfterPresidentialChange = downballot.houseDistrictMargin(exampleDistrict, {
    ...exampleGame,
    stateMods: { ...exampleGame.stateMods, AL: (exampleGame.stateMods?.AL || 0) + 20 },
  });
  assert.equal(projectedAfterPresidentialChange, projectedBeforePresidentialChange, 'presidential polling changes do not leak into the House generic-ballot formula');
  const quick = await outcomeSimulation.simulateQuickOutcomes({ ...opened, houseRule: 'mmp', electoralRule: 'district' }, { draws: 1 });
  assert.equal(Math.round(Object.values(quick.average.electoralVotes).reduce((sum, seats) => sum + seats, 0)), 538, 'district-rule quick outcomes still total 538');
  assert.equal(Math.round(Object.values(quick.average.houseSeats).reduce((sum, seats) => sum + seats, 0)), 870, 'MMP quick outcomes retain all 870 seats');
  assert.deepEqual(savedCampaign.factionMilestones, ['dem:activists:100'], 'milestone keys survive a save round trip');
  assert.deepEqual(savedCampaign.factionCrises, { activists: true }, 'active crisis flags survive a save round trip');
  assert.deepEqual(savedCampaign.incomeBoost, { amount: 2, weeks: 3 }, 'short-term faction income boosts survive a save round trip');
  assert.deepEqual(savedCampaign.rivalIncidentNewsReceiptIds, ["w2-opponent-plan-1"], "published rival stories survive a save round trip");
  assert.equal(savedCampaign.rivalIncidentNewsCard.receiptId, "w2-opponent-plan-1", "the incident-backed News Desk card survives a save round trip");
  assert.equal(savedCampaign.houseRule, 'mmp', 'House setup survives a save round trip');
  assert.equal(savedCampaign.electoralRule, 'district', 'Electoral College setup survives a save round trip');
  assert.equal(savedCampaign.sittingPresidentId, 'vance', 'the alternate-history president survives a save round trip');
  assert.equal(savedCampaign.vanceSuccessionPart, 2, 'succession progress survives a save round trip');
  assert.deepEqual(savedCampaign.vanceSuccessionAppliedParts, [1, 2], 'applied succession effects survive a save round trip');
  assert.deepEqual(savedCampaign.vanceSuccessionEffects, { moderate: 3.7, magaLoss: 4.5, turnoutLoss: 0.24 }, 'cumulative succession effects survive a save round trip');
  const legacySave = JSON.parse(storage[engine.STORAGE_KEY]);
  delete legacySave.houseRule;
  delete legacySave.electoralRule;
  delete legacySave.sittingPresidentId;
  delete legacySave.vanceSuccessionPart;
  delete legacySave.vanceSuccessionStarted;
  delete legacySave.vanceSuccessionDeliveredWeek;
  delete legacySave.vanceSuccessionAppliedParts;
  delete legacySave.vanceSuccessionEffects;
  storage[engine.STORAGE_KEY] = JSON.stringify(legacySave);
  const migratedSave = engine.loadGame();
  assert.equal(migratedSave.houseRule, 'standard', 'old saves migrate to the standard House rule');
  assert.equal(migratedSave.electoralRule, 'standard', 'old saves migrate to the standard Electoral College rule');
  assert.equal(migratedSave.sittingPresidentId, 'trump', 'older 2028 saves receive the default sitting president');
  assert.equal(migratedSave.vanceSuccessionPart, 0, 'older saves start with no succession cards delivered');
  assert.equal(savedCampaign.campaignPerks.freeVolunteerOps, 1, 'enhanced volunteer actions survive a save round trip');
  delete globalThis.localStorage;
  const sourceCounts = houseDistrictBaselineData.default.sourceCounts;
  process.stdout.write(`Build 33 foundation and election-rule checks passed. House baseline: ${sourceCounts['2026'] || 0} current-reported + ${sourceCounts['2024'] || 0} historical fallback (435 total). State legislature schedule: ${legislatureSummary.statesWithElections} states, ${legislatureSummary.chambersWithElections} chambers.\n`);
} finally {
  await vite.close();
  await rm(cacheDir, { recursive: true, force: true });
}
