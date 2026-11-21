import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as e from '../../src/lib/gameEngine.js';
import { CANDIDATE_EVENTS } from '../../src/data/candidateEvents/index.js';
import { BUILD40_EVENTS } from '../../src/data/build40EventCatalog.js';
import { createSeededRandom } from '../../src/lib/seededRandom.js';
import { TRADITIONAL_STAFF_SELECTION_COUNT } from '../../src/data/traditionalStaffRoster.js';

const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
const report = { scope: 'Focused native CEF-01 review; partial catalog does not establish complete release acceptance', catalogCards: CANDIDATE_EVENTS.length, catalogPacks: new Set(CANDIDATE_EVENTS.map(d => d.candidateId)).size, checks: [] };
const clone = x => JSON.parse(JSON.stringify(x));
const check = async (name, run) => {
  try { const actual = await run(); report.checks.push({ name, status: 'PASS', actual }); console.log('PASS ' + name); }
  catch (error) { report.checks.push({ name, status: 'FAIL', message: error.message, stack: error.stack }); console.log('FAIL ' + name + ': ' + error.message); }
};
const open = (changes = {}, setup = {}) => {
  Math.random = createSeededRandom('cef-native-review:1');
  const draft = e.createGame({ party: 'dem', candidateId: 'fdr', opponentId: 'reagan', runningMateId: null, modeId: 'two-parties', campaignId: 'cef-native-review:1', difficultyId: 'medium', nationalGeneric: 0, ...setup });
  const ready = e.confirmBuild35Staffing(draft, ['field', 'pollster', 'communications', 'operations'].slice(0, TRADITIONAL_STAFF_SELECTION_COUNT));
  assert.equal(ready.staffing.initialSelectionComplete, true);
  return { ...ready, week: 4, funds: 1000, aiFunds: Object.fromEntries(Object.keys(ready.aiFunds).map(p => [p, p === ready.party ? 0 : 1000])), usedEvents: [],
    currentEventId: null, currentEventData: null, outcome: null, eventSchedule: [], eventScheduleIndex: -1, eventScheduleWeek: 4, ...changes };
};
const roundtrip = game => { memory.clear(); assert.equal(e.saveGame(game), true); const loaded = e.loadGame(); assert.ok(loaded, 'native save loads'); return loaded; };
const choose = game => { const choice = game.currentEventData?.choices.find(c => !c.unavailable); assert.ok(choice, 'an available choice exists'); return e.applyChoice(game, choice, game.currentEventId); };
const effects = game => clone({ funds: game.funds, aiFunds: game.aiFunds, stateMods: game.stateMods, turnout: game.turnout, momentum: game.momentum, oppMomentum: game.oppMomentum, thirdMods: game.thirdMods, earlyBallotLedger: game.earlyBallotLedger, decisionReceipts: game.build40.decisionReceipts });
const candidateId = candidate => CANDIDATE_EVENTS.find(d => d.candidateId === candidate)?.id;

await check('No first-week candidate draws, forced cards or mandatory queue', () => {
  const game = open({ week: 0, eventScheduleWeek: 0 });
  for (const actingParty of ['dem', 'rep']) {
    assert.equal(e.nextEventFor(game, { actingParty, onlyDraw: true, random: () => 0, excludedEventIds: BUILD40_EVENTS.map(d => d.id) }).event, null);
  }
  assert.equal(e.forceEvent(game, candidateId('fdr')), game);
  assert.equal(e.advanceDecisionEvent(game).candidateEvents.queue.length, 0);
});

await check('Actual nominees and actor party exclude selectable but absent candidates', () => {
  const game = open();
  assert.deepEqual(e.activeCandidateTickets(game), [{ candidateId: 'fdr', party: 'dem' }, { candidateId: 'reagan', party: 'rep' }]);
  for (const [candidate, actingParty] of [['fdr', 'dem'], ['reagan', 'rep']]) {
    const id = candidateId(candidate);
    const excluded = [...BUILD40_EVENTS, ...CANDIDATE_EVENTS].filter(d => d.id !== id).map(d => d.id);
    const event = e.nextEventFor(game, { actingParty, onlyDraw: true, random: () => 0, excludedEventIds: excluded }).event;
    assert.equal(event?.context.candidateId, candidate);
    assert.equal(event?.context.actingParty, actingParty);
    assert.equal(e.nextEventFor(game, { actingParty: actingParty === 'dem' ? 'rep' : 'dem', onlyDraw: true, excludedEventIds: excluded }).event, null);
  }
  const absent = CANDIDATE_EVENTS.find(d => !['fdr', 'reagan'].includes(d.candidateId));
  assert.equal(e.forceEvent(game, absent.id), game);
});

await check('Native normal draw assigns equal intervals to each candidate and regular event ID', () => {
  const game = open();
  const candidateIds = CANDIDATE_EVENTS.filter(d => d.candidateId === 'fdr').slice(0, 2).map(d => d.id);
  const regular1 = e.nextEventFor(game, { onlyDraw: true, random: () => 0, excludedEventIds: CANDIDATE_EVENTS.map(d => d.id) }).event.id;
  const regular2 = e.nextEventFor(game, { onlyDraw: true, random: () => 0, excludedEventIds: [...CANDIDATE_EVENTS.map(d => d.id), regular1] }).event.id;
  const allowed = [regular1, regular2, ...candidateIds];
  const excludedEventIds = [...BUILD40_EVENTS, ...CANDIDATE_EVENTS].filter(d => !allowed.includes(d.id)).map(d => d.id);
  const draws = allowed.map((_, index) => e.nextEventFor(game, { onlyDraw: true, random: () => (index + 0.5) / 4, excludedEventIds }).event.id);
  assert.deepEqual(draws, allowed);
  for (let i = 1; i < 4; i += 1) {
    assert.equal(e.nextEventFor(game, { onlyDraw: true, random: () => i / 4 - 0.000001, excludedEventIds }).event.id, allowed[i - 1]);
    assert.equal(e.nextEventFor(game, { onlyDraw: true, random: () => i / 4, excludedEventIds }).event.id, allowed[i]);
  }
  return { intervalWidth: 0.25, eventIds: draws };
});

await check('Native two/four/six/regional/legacy active ticket lists match current mode nominees', () => {
  const results = [];
  for (const [modeId, count] of [['two-parties', 2], ['four-parties', 4], ['six-party', 6], ['regional-parties', 7], ['favorite-sons-daughters', 8]]) {
    const game = open({}, modeId === 'favorite-sons-daughters' ? { modeId: null, scenarioId: modeId } : { modeId });
    const tickets = e.activeCandidateTickets(game);
    assert.equal(tickets.length, count, modeId);
    assert.equal(new Set(tickets.map(t => t.candidateId)).size, count);
    assert.equal(tickets.find(t => t.party === 'dem').candidateId, 'fdr');
    assert.equal(tickets.find(t => t.party === 'rep').candidateId, 'reagan');
    if (modeId === 'six-party') {
      assert.equal(tickets.find(t => t.party === 'progressive').candidateId, 'bernie-sanders');
      assert.equal(tickets.find(t => t.party === 'maga').candidateId, 'vance');
    }
    for (const { candidateId, party } of tickets) assert.equal(candidateId, e.nomineeOf(game, party).id);
    results.push({ modeId, tickets });
  }
  return results;
});

await check('Every mandatory player/rival card drains in week 11, retaining both regular slots', () => {
  const schedule = [{ status: 'pending', afterActions: 0 }, { status: 'pending', afterActions: 3 }];
  let game = open({ week: 11, eventScheduleWeek: 11, eventSchedule: schedule, candidateEvents: undefined });
  const ballotBefore = clone(game.earlyBallotLedger);
  const checkpoints = [];
  for (let index = 0; index < 2; index += 1) {
    game = e.advanceDecisionEvent(game);
    const context = clone(game.currentEventData.context);
    assert.ok(context.candidateEventKey);
    assert.equal(game.week, 11);
    assert.equal(game.eventScheduleIndex, -1);
    assert.deepEqual(game.eventSchedule, schedule);
    const beforeResume = effects(game);
    game = roundtrip(game);
    assert.deepEqual(game.currentEventData.context, context);
    assert.deepEqual(effects(game), beforeResume);
    const afterFirstLoad = clone(game.candidateEvents);
    game = roundtrip(game);
    assert.deepEqual(game.candidateEvents, afterFirstLoad);
    game = choose(game);
    assert.equal(game.candidateEvents.resolvedCounts[context.candidateId], 1);
    const applied = effects(game);
    const oldEventId = game.currentEventId;
    game = roundtrip(game);
    assert.deepEqual(effects(game), applied, 'settled resume does not reapply effects');
    assert.equal(e.applyChoice(game, 'choice-1', oldEventId), game, 'stale event submit cannot choose next card');
    checkpoints.push({ candidateId: context.candidateId, party: context.actingParty, week: game.week });
  }
  assert.deepEqual(game.candidateEvents.resolvedCounts, { fdr: 1, reagan: 1 });
  assert.equal(game.candidateEvents.queue.length, 0);
  assert.deepEqual(game.earlyBallotLedger, ballotBefore);
  assert.equal(game.eventScheduleIndex, 0, 'settled resume starts the first regular slot');
  assert.equal(game.eventSchedule[0].status, 'dispatched');
  assert.equal(game.eventSchedule[1].status, 'pending');
  game = choose(game);
  game = e.advanceDecisionEvent({ ...game, actionsLeft: 0 });
  assert.equal(game.eventScheduleIndex, 1);
  assert.equal(game.eventSchedule[1].status, 'dispatched');
  assert.equal(game.week, 11);
  return checkpoints;
});

await check('A pending regular/forced card survives deadline entry and resumes before mandatory cards', () => {
  const source = open({ week: 11, eventScheduleWeek: 11 });
  const regular = e.nextEventFor(source, { onlyDraw: true, random: () => 0, excludedEventIds: CANDIDATE_EVENTS.map(d => d.id) }).event;
  let game = e.forceEvent(source, regular.id);
  assert.ok(e.decisionPending(game));
  assert.equal(e.advanceDecisionEvent(game), game);
  const currentId = game.currentEventId;
  game = roundtrip(game);
  assert.equal(game.currentEventId, currentId);
  assert.equal(game.candidateEvents.queue.length, 0, 'pending card is not replaced by an enqueued card');
  game = choose(game);
  game = e.advanceDecisionEvent(game);
  assert.ok(game.currentEventData.context.candidateEventKey);
  assert.equal(game.candidateEvents.queue.length, 2);
});

await check('Earlier regular candidate resolution satisfies only its own guarantee', () => {
  let game = open();
  game = choose(e.forceEvent(game, candidateId('fdr')));
  game = e.advanceDecisionEvent({ ...game, week: 11, eventScheduleWeek: 11 });
  assert.equal(game.currentEventData.context.candidateId, 'reagan');
  assert.deepEqual(game.candidateEvents.queue.map(d => d.candidateId), ['reagan']);
  assert.equal(game.candidateEvents.triggeredCounts.fdr, 1);
});

await check('Retired saved nominee and stale queue are removed without erasing history', () => {
  let game = e.advanceDecisionEvent(open({ week: 11, eventScheduleWeek: 11 }));
  const retiredKey = game.currentEventData.context.candidateEventKey;
  assert.equal(game.currentEventData.context.candidateId, 'fdr');
  game = roundtrip({ ...game, candidateId: 'harris' });
  assert.notEqual(game.currentEventData?.context.candidateId, 'fdr');
  assert.ok(!game.candidateEvents.queue.some(d => d.candidateId === 'fdr'));
  assert.equal(game.candidateEvents.triggeredCounts.fdr, 1);
  assert.ok(game.candidateEvents.deliveredKeys.includes(retiredKey));
});

await check('Short campaigns drain every unmet ticket during final week before advancing', () => {
  let game = open({ week: 7, totalWeeks: 8, eventScheduleWeek: 7 });
  const checkpoints = [];
  for (let i = 0; i < 2; i += 1) {
    game = e.advanceWeek(game);
    assert.equal(game.week, 7);
    assert.equal(game.finished, false);
    assert.ok(e.decisionPending(game));
    checkpoints.push(game.currentEventData.context.candidateId);
    game = choose(roundtrip(game));
  }
  assert.deepEqual(new Set(checkpoints), new Set(['fdr', 'reagan']));
  assert.deepEqual(game.candidateEvents.resolvedCounts, { fdr: 1, reagan: 1 });
  return checkpoints;
});

await check('Wrong saved actor/candidate context is retired rather than applied', () => {
  let game = e.forceEvent(open(), candidateId('fdr'));
  game = roundtrip({ ...game, currentEventData: { ...game.currentEventData, context: { ...game.currentEventData.context, actingParty: 'rep' } } });
  assert.equal(e.decisionPending(game), false);
  assert.equal(game.currentEventId, null);
  assert.equal(game.candidateEvents.resolvedCounts.fdr, undefined);
});

await check('Rival forecast commits candidate receipt once and saved resume preserves it', () => {
  const id = candidateId('reagan');
  const game = open({ usedEvents: [...BUILD40_EVENTS, ...CANDIDATE_EVENTS].filter(d => d.id !== id).map(d => d.id) });
  const before = clone(game);
  let result = e.opponentTurn(game);
  assert.equal(result.candidateEvents.resolvedCounts.reagan, 1);
  assert.equal(result.candidateEvents.triggeredCounts.reagan, 1);
  assert.equal(result.build40.decisionReceipts.filter(r => r.eventId === id).length, 1);
  assert.deepEqual(clone(game), before, 'forecast does not mutate original state');
  assert.equal(e.opponentTurn(result), result);
  result = roundtrip(result);
  assert.equal(result.candidateEvents.resolvedCounts.reagan, 1);
  assert.equal(result.build40.decisionReceipts.filter(r => r.eventId === id).length, 1);
});

report.failures = report.checks.filter(d => d.status === 'FAIL').length;
const directory = new URL('../../../evidence/framework/', import.meta.url);
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(new URL('integration-review.json', directory), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ checks: report.checks.length, failures: report.failures, cards: report.catalogCards, packs: report.catalogPacks }));
process.exitCode = report.failures ? 1 : 0;
