import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ALL_CANDIDATES } from '../../src/data/candidates.js';
import { CANDIDATE_EVENTS } from '../../src/data/candidateEvents/index.js';
import { BUILD40_EVENTS } from '../../src/data/build40EventCatalog.js';
import { createSeededRandom } from '../../src/lib/seededRandom.js';
import { STATES } from '../../src/data/states.js';
import { closeEarlyBallots } from '../../src/lib/build37Ballots.js';
import { TRADITIONAL_STAFF_SELECTION_COUNT } from '../../src/data/traditionalStaffRoster.js';
import { hiddenEffectInventory } from '../../src/lib/build44EventPresentation.js';
import * as e from '../../src/lib/gameEngine.js';

const saved = new Map();
globalThis.localStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
const roster = JSON.parse(fs.readFileSync(new URL('../../../evidence/candidate-roster.json', import.meta.url)));
const partial = process.argv.includes('--partial');
const staff = ['field', 'pollster', 'communications', 'operations', 'policy', 'fundraising', 'base-liaison', 'social-media', 'media'];
const open = (extra = {}) => {
  Math.random = createSeededRandom('build45:integrated');
  const draft = e.createGame({ party: 'dem', candidateId: 'shapiro', opponentId: 'vance', runningMateId: 'ossoff',
    campaignId: 'build45:integrated', modeId: 'two-parties', difficultyId: 'medium', nationalGeneric: 0, ...extra });
  const game = e.confirmBuild35Staffing(draft, staff.slice(0, TRADITIONAL_STAFF_SELECTION_COUNT));
  assert.equal(game.staffing.initialSelectionComplete, true);
  return { ...game, week: 4, funds: 1000, aiFunds: Object.fromEntries(Object.keys(game.aiFunds).map((party) => [party, 1000])),
    eventSchedule: [], eventScheduleWeek: 4, eventScheduleIndex: -1, currentEventId: null, currentEventData: null, outcome: null };
};
const configFor = (row, rival) => {
  const party = row.party;
  const scenario = party.startsWith('favorite-') ? 'favorite-sons-daughters'
    : ['progressive', 'maga'].includes(party) ? 'six-party'
      : ['farmer-labor', 'conservation', 'localist'].includes(party) ? 'regional-parties' : 'standard';
  const modeId = scenario === 'favorite-sons-daughters' ? null
    : scenario === 'standard' ? (['dem', 'rep'].includes(party) ? 'two-parties' : 'four-parties') : scenario;
  return rival
    ? { party: party === 'dem' ? 'rep' : 'dem', candidateId: party === 'dem' ? 'abbott' : 'harris',
      opponentId: row.candidateId, opponentParty: party, modeId, scenarioId: scenario, runningMateId: null }
    : { party, candidateId: row.candidateId, opponentId: party === 'dem' ? 'abbott' : 'harris',
      modeId, scenarioId: scenario, runningMateId: null };
};
const pendingResume = (game) => {
  saved.clear();
  assert.equal(e.saveGame(game), true);
  const loaded = e.loadGame();
  assert.ok(loaded, 'saved campaign loads');
  if (e.decisionPending(game)) {
    assert.equal(loaded.currentEventId, game.currentEventId);
    assert.deepEqual(loaded.currentEventData.context, game.currentEventData.context);
  }
  return loaded;
};
const finiteState = (game) => {
  assert.ok(Number.isFinite(game.funds) && game.funds >= 0);
  for (const value of Object.values(game.stateMods || {})) assert.ok(Number.isFinite(value));
  for (const row of Object.values(game.turnout || {})) for (const value of Object.values(row)) assert.ok(Number.isFinite(value));
};

assert.equal(roster.length, 48);
if (!partial) assert.equal(CANDIDATE_EVENTS.length >= 300, true);
assert.equal(new Set([...BUILD40_EVENTS, ...CANDIDATE_EVENTS].map(({ id }) => id)).size, BUILD40_EVENTS.length + CANDIDATE_EVENTS.length);
assert.ok(hiddenEffectInventory([...BUILD40_EVENTS, ...CANDIDATE_EVENTS]).length <= 12);
const packResults = [];
for (const row of roster) {
  if (partial && !CANDIDATE_EVENTS.some(({ candidateId }) => candidateId === row.candidateId)) continue;
  assert.ok(ALL_CANDIDATES.some(({ id }) => id === row.candidateId), row.candidateId);
  const events = CANDIDATE_EVENTS.filter(({ candidateId }) => candidateId === row.candidateId);
  assert.ok(events.length >= row.minimumEvents, row.packId);
  const witnesses = [];
  for (const rival of [false, true]) {
    const game = open(configFor(row, rival));
    assert.ok(e.activeCandidateTickets(game).some(({ candidateId, party }) => candidateId === row.candidateId && party === row.party), row.candidateId);
    for (const event of events) {
      const draw = e.nextEventFor(game, { actingParty: row.party, onlyDraw: true, random: () => 0,
        excludedEventIds: [...BUILD40_EVENTS, ...CANDIDATE_EVENTS].filter(({ id }) => id !== event.id).map(({ id }) => id) }).event;
      assert.equal(draw?.id, event.id, row.packId + ' native eligible draw');
      assert.equal(draw.context.actingParty, row.party);
      assert.equal(draw.context.candidateId, row.candidateId);
      const forced = e.forceEvent(game, event.id);
      assert.equal(forced.currentEventId, event.id);
      for (const choice of forced.currentEventData.choices) {
        assert.equal(choice.unavailable, null, event.id + ' ' + choice.id);
        const result = e.applyChoice(forced, choice);
        assert.notEqual(result, forced);
        finiteState(result);
        assert.equal(result.candidateEvents.resolvedCounts[row.candidateId], 1);
        assert.equal(result.build40.decisionReceipts.at(-1).actingParty, row.party);
        assert.equal(e.applyChoice(result, choice), result);
        if (event === events[0] && choice === forced.currentEventData.choices[0]) witnesses.push({
          role: rival ? 'rival' : 'player', setup: configFor(row, rival), campaignId: game.build34CampaignId,
          week: game.week, eventId: event.id, context: forced.currentEventData.context,
          receipt: result.build40.decisionReceipts.at(-1),
        });
      }
    }
    const forced = e.forceEvent(game, events[0].id);
    const loaded = pendingResume(forced);
    const result = e.applyChoice(loaded, loaded.currentEventData.choices[0]);
    assert.equal(result.candidateEvents.resolvedCounts[row.candidateId], 1);
    const settled = pendingResume(result);
    assert.equal(settled.candidateEvents.resolvedCounts[row.candidateId], 1);
    const replay = { ...settled, currentEventId: loaded.currentEventId, currentEventData: loaded.currentEventData, outcome: null };
    assert.equal(e.applyChoice(replay, loaded.currentEventData.choices[0]), replay, 'resolved saved receipt cannot apply twice');
  }
  packResults.push({ id: row.packId, candidateId: row.candidateId, count: events.length, nativePlayerAndRival: true, saveResume: true, witnesses });
}

const guarantees = [];
for (const modeId of (partial ? [] : ['two-parties', 'four-parties', 'six-party', 'regional-parties', 'favorite-sons-daughters'])) {
  const setup = modeId === 'favorite-sons-daughters' ? { modeId: null, scenarioId: modeId } : { modeId };
  const original = { ...open(setup), week: 11, candidateEvents: undefined,
    eventScheduleWeek: 11, eventSchedule: [{ status: 'pending', afterActions: 0 }, { status: 'pending', afterActions: 3 }],
    eventScheduleIndex: -1 };
  const participants = e.activeCandidateTickets(original);
  let game = original;
  for (let index = 0; index < participants.length; index += 1) {
    game = e.advanceDecisionEvent(game);
    assert.ok(game.currentEventData.context.candidateEventKey);
    assert.equal(game.week, 11);
    assert.deepEqual(game.eventSchedule, original.eventSchedule);
    game = pendingResume(game);
    game = e.applyChoice(game, game.currentEventData.choices.find(({ unavailable }) => !unavailable));
    assert.equal(game.week, 11);
  }
  assert.equal(game.candidateEvents.queue.length, 0);
  for (const { candidateId } of participants) {
    assert.equal(game.candidateEvents.triggeredCounts[candidateId], 1);
    assert.equal(game.candidateEvents.resolvedCounts[candidateId], 1);
  }
  const resumed = pendingResume(game);
  assert.equal(resumed.candidateEvents.queue.length, 0);
  assert.ok(e.advanceDecisionEvent(game).currentEventId);
  guarantees.push({ modeId, candidates: participants, regularSlotsPreserved: 2, allResolvedInWeek: 12 });
}
let immutableBatches = 0;
if (!partial) {
  let late = open({ candidateId: 'ossoff' });
  late = { ...late, week: e.totalWeeksOf(late) - 3 };
  const support = new Map(e.resultSnapshot(late).rows.map((row) => [row.abbr, row.support]));
  const ledger = closeEarlyBallots(late, e.totalWeeksOf(late), STATES, (abbr) => support.get(abbr));
  assert.ok(ledger.batches.length > 0);
  late = e.forceEvent({ ...late, earlyBallotLedger: ledger }, 'ce-ossoff-01');
  const before = JSON.stringify(ledger);
  late = e.applyChoice(pendingResume(late), late.currentEventData.choices[0]);
  assert.equal(JSON.stringify(late.earlyBallotLedger), before, 'candidate turnout effects leave cast ballots immutable');
  assert.equal(JSON.stringify(pendingResume(late).earlyBallotLedger), before);
  immutableBatches = ledger.batches.length;
}
fs.mkdirSync(new URL('../../../evidence/integration/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../../../evidence/integration/candidate-events' + (partial ? '-partial' : '') + '.json', import.meta.url),
  JSON.stringify({ partial, packs: packResults, guarantees, immutableBatches }, null, 2));
console.log('Native candidate event acceptance passed for ' + packResults.length + ' packs, player/rival effects and pending/settled saves' + (partial ? ' (partial catalog).' : ', plus same-week queues.'));
