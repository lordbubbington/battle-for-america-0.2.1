import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '../..');
const target = path.resolve(process.argv[2] || app);
const vitePath = [path.join(app, 'node_modules/vite/dist/node/index.js'), path.resolve(app, '../../build-0.1.4-integration-worktree/build35/node_modules/vite/dist/node/index.js')].find(existsSync);
assert.ok(vitePath, 'Vite runtime must be installed in integration or pinned baseline');
const { createServer } = await import(pathToFileURL(vitePath));
const server = await createServer({ root: target, configFile: false, appType: 'custom',
  resolve: { alias: { '@': path.join(target, 'src') } }, optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, ws: false, watch: null } });
const results = {};
const memory = new Map();
globalThis.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
const originalRandom = Math.random;
try {
  const e = await server.ssrLoadModule('/src/lib/gameEngine.js');
  const { BUILD40_EVENTS: events } = await server.ssrLoadModule('/src/data/build40EventCatalog.js');
  const { CANDIDATE_EVENTS: candidateEvents } = await server.ssrLoadModule('/src/data/candidateEvents/index.js');
  const { ensureCandidateGuarantees } = await server.ssrLoadModule('/src/lib/candidateEvents.js');
  const { recordIncident } = await server.ssrLoadModule('/src/lib/incidentLedger.js');
  const { createSeededRandom } = await server.ssrLoadModule('/src/lib/seededRandom.js');
  const { recordCampaignStrategy } = await server.ssrLoadModule('/src/lib/campaignOperations.js');
  const news = await server.ssrLoadModule('/src/lib/news.js');
  const nat = await server.ssrLoadModule('/src/lib/nationalNews.js');
  const staff = ['field', 'pollster', 'communications', 'operations', 'policy', 'fundraising', 'base-liaison', 'social-media', 'media'];
  const clear = (g) => ({ ...g, currentEventData: null, currentEventId: null, outcome: null, eventSchedule: [], eventScheduleIndex: -1, usedEvents: [] });
  const game = (seed, party = 'dem', opponentId = null) => {
    Math.random = createSeededRandom(seed);
    const g = e.createGame({ party, candidateId: party === 'dem' ? 'shapiro' : 'vance', opponentId: opponentId || (party === 'dem' ? 'vance' : 'shapiro'), startId: 'aug', difficultyId: 'hard', campaignId: seed });
    const nine = e.confirmBuild35Staffing(g, staff);
    const ready = nine.staffing?.initialSelectionComplete ? nine : e.confirmBuild35Staffing(g, staff.slice(0, 3));
    assert.equal(ready.staffing?.initialSelectionComplete, true, 'Native fixture requires confirmed staffing');
    return clear({ ...ready, funds: 200, week: 5 });
  };
  const numbered = new Map(events.filter((event) => /^interrupt-\d{3}-/.test(event.id)).map((event) => [event.id.split('-')[1], event]));
  const allDrawIds = [...new Set([...events, ...candidateEvents].map((event) => event.id))];
  const excluded = (n) => { assert.ok(numbered.has(n)); return allDrawIds.filter((id) => id !== numbered.get(n).id); };
  const draw = (g, n) => {
    const card = e.nextEventFor(clear(g), { excludedEventIds: excluded(n), random: () => 0 }).event;
    assert.ok(card === null || card.id === numbered.get(n).id, n + ': isolated draw returned another catalog ID');
    return card;
  };
  const settleMandatory = (original) => {
    const presentation = Object.fromEntries(['currentEventData', 'currentEventId', 'currentInterrupt', 'outcome', 'eventWhy', 'eventSchedule', 'eventScheduleIndex'].map((key) => [key, original[key]]));
    const slots = JSON.stringify(original.eventSchedule);
    let current = original;
    for (let guard = 0; guard <= 16; guard++) {
      const state = ensureCandidateGuarantees(current, candidateEvents, e.activeCandidateTickets(current));
      if (!state.queue.length) {
        const restored = { ...current, ...presentation, candidateEvents: state };
        assert.equal(JSON.stringify(restored.eventSchedule), slots, 'Mandatory fixture resolution preserves regular slots');
        return restored;
      }
      assert.ok(guard < 16, 'Mandatory fixture queue must drain through real choices');
      current = e.advanceDecisionEvent({ ...current, candidateEvents: state, currentEventData: null, currentEventId: null, currentInterrupt: null, outcome: null });
      assert.equal(current.currentEventData?.context?.candidateEventMandatory, true, 'Expected a genuine mandatory candidate card');
      const before = current.candidateEvents.resolvedKeys.length;
      current = e.applyChoice(current, current.currentEventData.choices.find((choice) => !choice.unavailable));
      assert.equal(current.candidateEvents.resolvedKeys.length, before + 1, 'Mandatory candidate effect resolves exactly once');
    }
    throw new Error('Unreachable mandatory queue guard');
  };
  const commit = (g, next, context) => recordCampaignStrategy(g, recordIncident(g, next, context), context);
  const stance = (g, issueId, to) => commit(g, e.changeStance(g, issueId, to), { type: 'stance', issueId, from: g.stances[issueId], to });
  const observe = (g, numbers, fixture) => {
    g = settleMandatory(g);
    for (const n of numbers) {
      if (results[n]?.nativePositive) continue;
      const card = draw(g, n);
      const receipt = g.incidentLedger?.find(({ id }) => id === card?.sourceReceiptId);
      if (!receipt) continue;
      const noReceiptRejected = draw({ ...g, incidentLedger: [] }, n) === null;
      const staleRejected = draw({ ...g, week: g.week + 4 }, n) === null;
      const wrongCampaignRejected = draw({ ...g, incidentLedger: [{ ...receipt, campaignId: 'wrong-campaign' }] }, n) === null;
      const pending = e.advanceDecisionEvent({ ...clear(g), usedEvents: excluded(n),
        eventSchedule: [{ status: 'pending', afterActions: 0 }], eventScheduleIndex: -1 });
      let savedPending = false, resolvedOnce = false, targetPreserved = false, missingPendingRejected = false, mutatedPendingRejected = false, wrongTargetRejected = null;
      if (pending.currentEventId === card.id) {
        e.saveGame(pending);
        const resumed = e.loadGame();
        savedPending = resumed?.currentEventId === card.id;
        targetPreserved = resumed?.currentEventData?.context?.stateId === card.context.stateId;
        const choice = resumed.currentEventData.choices.find((item) => !item.unavailable);
        const beforeCount = resumed.build40.decisionReceipts.length;
        const missing = e.applyChoice({ ...resumed, incidentLedger: [] }, choice);
        missingPendingRejected = missing.build40.decisionReceipts.length === beforeCount && missing.funds === resumed.funds;
        const mutated = e.applyChoice({ ...resumed, incidentLedger: resumed.incidentLedger.map((row) => row.id === receipt.id ? { ...row, payload: { ...row.payload, unexpectedMutation: true } } : row) }, choice);
        mutatedPendingRejected = mutated.build40.decisionReceipts.length === beforeCount && mutated.funds === resumed.funds;
        if (receipt.stateId || receipt.state) {
          const wrongState = card.context.stateId === 'PA' ? 'FL' : 'PA';
          const altered = { ...resumed, currentEventData: { ...resumed.currentEventData, context: { ...resumed.currentEventData.context, stateId: wrongState } } };
          wrongTargetRejected = e.applyChoice(altered, choice).build40.decisionReceipts.length === beforeCount;
        }
        const resolved = e.applyChoice(resumed, choice);
        const count = resolved.build40.decisionReceipts.length;
        e.saveGame(resolved);
        const settled = e.loadGame();
        const retry = e.applyChoice({ ...settled, outcome: null }, choice);
        resolvedOnce = count === settled.build40.decisionReceipts.length && count === retry.build40.decisionReceipts.length;
      }
      results[n] = { nativePositive: true, fixture, week: g.week, receipt, stateId: card.context.stateId,
        noReceiptRejected, staleRejected, wrongCampaignRejected, savedPending, resolvedOnce, targetPreserved, missingPendingRejected, mutatedPendingRejected, wrongTargetRejected };
      console.log('Native witness #' + n + ' ' + JSON.stringify(fixture));
    }
  };
  // Real debate answers commit both promises and moderate-voter/faction changes.
  for (const party of ['dem', 'rep']) for (let seed = 0; seed < 8; seed++) {
    let g = game('b45:debate:' + party + ':' + seed, party);
    for (const debateId of ['debate1', 'debate2', 'debate3']) {
      g = { ...clear(g), debate: { id: debateId, step: 0, picks: [], done: false, verdict: null } };
      while (!g.debate.done) {
        const answers = e.debateDefinition(g).questions[g.debate.step].answers;
        const picked = answers.find((answer) => /timetable|keep its pledge|funded portion/i.test(answer.label)) || answers[seed % answers.length];
        g = e.answerDebate(g, picked);
        observe(g, ['044'], { seed, party, debateId, choice: picked.id });
      }
    }
    // Distinct promises on economy/energy can coexist in two recent debates.
    const opened = e.startTurn({ ...clear(g), eventScheduleWeek: -1 });
    observe(opened, ['049'], { seed, party, action: 'debate pledges then startTurn' });
  }
  // Two-index actual position change followed by weekly policy costing.
  for (const issueId of ['economy', 'energy', 'abortion', 'immigration']) {
    let g = game('b45:policy:' + issueId);
    g = stance(g, issueId, 0);
    g = stance({ ...clear(g), funds: 200 }, issueId, 2);
    observe(e.startTurn({ ...clear(g), week: 6, eventScheduleWeek: -1 }), ['065'], { issueId, action: 'changeStance 0 to 2; next-week startTurn' });
  }
  // A native ad creates its own story. Native local-news updates and press
  // responses supply salience/update evidence; no payload is manufactured.
  for (let seed = 0; seed < 100 && (!results['026'] || !results['019']); seed++) {
    let g = game('b45:ads:' + seed);
    const buy = (base) => commit(base, e.runAdBlitz(base, { abbr: 'PA', issueId: 'economy', kind: 'attack', typeId: 'digital' }), { type: 'ad', abbrs: ['PA'], issueId: 'economy', kind: 'attack', adTypeId: 'digital' });
    g = buy(g);
    const story = g.stories.find((item) => item.abbr === 'PA');
    if (!story) continue;
    for (let response = 0; response < 4; response++) {
      g = commit(g, news.spinStory(g, 'PA', story.id, 'amplify'), { type: 'spin', abbr: 'PA', storyId: story.id });
      observe(g, ['019'], { seed, response });
      g = buy(g);
      observe(g, ['026'], { seed, response });
      g = news.advanceNews(g);
    }
  }
  for (const direction of ['high', 'low']) {
    let g = game('b45:early:' + direction);
    g = { ...g, week: e.totalWeeksOf(g) - 3, strategyProfile: { ...g.strategyProfile, stateActions: { PA: 5 } } };
    const move = direction === 'high' ? 90 : 20;
    // Turnout is a campaign setup fixture; the ballot batch and bulletin are
    // written by advanceWeek, and never changed by this fixture afterwards.
    g = { ...g, turnout: { PA: { dem: move, rep: move, lib: move, grn: move } } };
    // Resolve any mandatory candidate cards before the late weekly boundary.
    g = settleMandatory(g);
    g = clear(g);
    const next = e.advanceWeek(g);
    console.log('Early fixture ' + JSON.stringify({ direction, week: g.week, nextWeek: next.week, rule: g.electoralRule, batches: next.earlyBallotLedger?.batches?.length, reports: next.incidentLedger?.filter((r) => r.payload.kind === 'early-vote').length, pending: next.currentEventId }));
    observe(next, ['039', '098'], { direction, action: 'advanceWeek closes native early ballots and opens bulletin' });
  }
  // Native opponent schedules and publication/acknowledgement of their news.
  for (const seed of [0, 2, 16, 47]) {
    let g = game('b45:rival:' + seed);
    g = stance(g, 'economy', seed % 3);
    g = { ...clear(g), week: 6 };
    g = commit(g, e.opponentTurn(g), { type: 'opponent' });
    observe(g, ['074', '075', '076', '077'], { seed, action: 'changeStance then next-week opponentTurn' });
    g = nat.weeklyNationalNews({ ...g, natNews: null, fourPartyNationalCard: null });
    observe(g, ['073'], { seed, action: 'opponentTurn -> weeklyNationalNews' });
    g = e.acknowledgeCampaignNews(g);
    for (let turn = 0; turn < 3 && !results['077']; turn++) {
      g = commit({ ...clear(g), week: 7 + turn }, e.opponentTurn({ ...clear(g), week: 7 + turn }), { type: 'opponent' });
      observe(g, ['077'], { seed, turn, action: 'acknowledge correction -> subsequent native surrogate schedule' });
    }
  }
  // The suburban rival's real schedule produces the repeat after a normal
  // player fundraising action changes the recorded sequence, not its facts.
  if (!results['077']) {
    const seed = 16;
    let g = game('b45:rival:' + seed, 'dem', 'haley');
    g = stance(g, 'economy', 1);
    g = { ...clear(g), week: 6 };
    g = commit(g, e.opponentTurn(g), { type: 'opponent' });
    g = nat.weeklyNationalNews({ ...g, natNews: null, fourPartyNationalCard: null });
    g = e.acknowledgeCampaignNews(g);
    assert.ok(g.incidentLedger.some((receipt) => receipt.sourceType === 'news-acknowledgement' && receipt.payload.correction?.claim && receipt.payload.correction?.text), 'Haley source fixture commits a real correction acknowledgement');
    g = { ...clear(g), week: 7 };
    g = commit(g, e.applyAction(g, 'fundraise', 'PA'), { type: 'action', actionId: 'fundraise', abbr: 'PA' });
    g = commit(g, e.opponentTurn(g), { type: 'opponent' });
    observe(g, ['077'], { seed, opponentId: 'haley', staff: staff.slice(0, 3), fundraiseActions: 1, state: 'PA', action: 'changeStance -> opponentTurn -> weeklyNationalNews -> acknowledgement -> next-week fundraise -> native surrogate plan' });
  }
  const required = ['019', '026', '039', '044', '049', '065', '073', '074', '075', '076', '077', '098'];
  for (const n of required) results[n] ||= { nativePositive: false, status: 'OPEN: bounded native search did not reproduce; no receipt fabricated' };
  const summary = { target, generatedOn: '2026-11-17', catalogIsolation: { ordinaryIds: events.length, candidateIds: candidateEvents.length, totalIds: allDrawIds.length, strictTargetId: true }, required, nativePositiveCount: required.filter((n) => results[n].nativePositive).length, results };
  await mkdir(path.resolve(app, '../evidence/data'), { recursive: true });
  await writeFile(path.resolve(app, '../evidence/data/native-path-results.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(Object.fromEntries(required.map((n) => [n, { ...results[n], receipt: undefined }])), null, 2));
  assert.equal(required.filter((n) => results[n].nativePositive).length, required.length, 'All twelve native paths must reproduce');
  for (const n of required) for (const key of ['noReceiptRejected', 'staleRejected', 'wrongCampaignRejected', 'savedPending', 'resolvedOnce', 'targetPreserved', 'missingPendingRejected', 'mutatedPendingRejected']) assert.equal(results[n][key], true, n + ':' + key);
} finally { Math.random = originalRandom; await server.close(); }
