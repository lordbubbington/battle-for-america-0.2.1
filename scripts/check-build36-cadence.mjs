import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { decisionCountForWeek, decisionSlots } from '../src/lib/build36DecisionSchedule.js';

const local = new Map();
globalThis.localStorage = {
  getItem: (key) => local.get(key) ?? null,
  setItem: (key, value) => local.set(key, value),
  removeItem: (key) => local.delete(key),
};
const server = await createServer({
  configLoader: 'runner',
  cacheDir: './.vite-build36-cadence',
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, ws: false },
});

try {
  const engine = await server.ssrLoadModule('/src/lib/gameEngine.js');
  const { recordIncident } = await server.ssrLoadModule('/src/lib/incidentLedger.js');
  const { createSeededRandom } = await server.ssrLoadModule('/src/lib/seededRandom.js');
  const roles = ['field', 'pollster', 'communications', 'operations', 'policy', 'fundraising', 'base-liaison', 'social-media', 'media'];
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (let i = 0; i < 1000; i++) counts[decisionCountForWeek(1, 14, i / 1000)]++;
  assert.deepEqual(counts, { 1: 500, 2: 300, 3: 200 });
  assert.equal(decisionCountForWeek(0, 14, 0.95), 0);
  assert.equal(decisionCountForWeek(13, 14, 0.05), 5);
  assert.deepEqual(decisionSlots(2, 7).map(({ afterActions }) => afterActions), [0, 3]);
  assert.deepEqual(decisionSlots(3, 7).map(({ afterActions }) => afterActions), [0, 3, 7]);
  assert.deepEqual(decisionSlots(5, 7).map(({ afterActions }) => afterActions), [0, 3, 4, 6, 7]);
  assert.deepEqual(decisionSlots(5, 5).map(({ afterActions }) => afterActions), [0, 3, 4, 5, 5]);

  const originalRandom = Math.random;
  Math.random = createSeededRandom('build36-cadence');
  try {
    const setup = engine.createGame({ party: 'dem', candidateId: 'shapiro', opponentId: 'vance', difficultyId: 'medium',
      startId: 'aug', campaignId: 'build36-cadence', nationalGeneric: -2.25 });
    const first = (engine.confirmBuild36Staffing || engine.confirmBuild35Staffing)(setup, roles);
    assert.equal(first.natGeneric, -2.25);
    assert.equal(first.eventSchedule.length, 0);
    assert.equal(engine.decisionPending(first), false);
    const finalWeek = engine.totalWeeksOf(first) - 1;
    let game = engine.startTurn({ ...first, week: finalWeek, eventScheduleWeek: null });
    assert.equal(game.decisionEventTargetCount, 5);
    assert.deepEqual(game.eventSchedule.map(({ afterActions }) => afterActions), [0, 3, 4, 6, 7]);
    assert.equal(game.eventScheduleIndex, 0);
    assert.ok(engine.decisionPending(game));
    const saveCycle = (current) => {
      assert.equal(engine.saveGame(current), true);
      const restored = engine.loadGame();
      assert.ok(restored);
      return restored;
    };
    const answer = (current) => {
      const event = current.currentEventData;
      const chosen = event.choices[0];
      const resolved = engine.applyChoice(current, chosen, event.id);
      assert.notEqual(resolved, current);
      assert.equal(engine.applyChoice(resolved, chosen, event.id), resolved);
      return engine.advanceDecisionEvent(recordIncident(current, resolved, { type: 'choice' }));
    };
    game = answer(saveCycle(game));
    assert.equal(game.actionsLeft, 7);

    Math.random = () => 0.95;
    const buy = engine.runAdBlitz({ ...game, funds: 100 }, { abbrs: ['PA'], issueId: 'economy', kind: 'pro', typeId: 'tv' });
    Math.random = createSeededRandom('build36-cadence-actions');
    game = recordIncident(game, buy, { type: 'ad', abbrs: ['PA'], issueId: 'economy', kind: 'pro' });
    const queued = game.pendingInterrupts.find((item) => item.event.onceKey);
    assert.ok(queued, 'the real ad result produced an interruption');
    assert.equal(engine.decisionPending(engine.advanceDecisionEvent(game)), false);

    const checkpoints = new Set([3, 4, 6, 7]);
    for (let spent = 1; spent <= 7; spent++) {
      const abbr = ['WI', 'MI', 'PA', 'GA', 'NC', 'AZ', 'NV'][spent - 1];
      const action = engine.applyAction(game, 'visit', abbr);
      assert.notEqual(action, game);
      game = engine.advanceDecisionEvent(recordIncident(game, action, { type: 'action', actionId: 'visit', abbr }));
      assert.equal(game.actionsLeft, 7 - spent);
      assert.equal(engine.decisionPending(game), checkpoints.has(spent), 'unexpected decision state after action ' + spent);
      if (!engine.decisionPending(game)) continue;
      if (spent === 3) assert.equal(game.currentEventId, queued.event.id, 'same-week incident reaches the next slot');
      const eventId = game.currentEventId;
      const old = game.currentEventData.choices[0];
      game = saveCycle(game);
      assert.equal(game.currentEventId, eventId);
      assert.equal(engine.applyChoice(game, old, 'stale-event-id'), game);
      game = answer(game);
      assert.equal(game.actionsLeft, 7 - spent);
    }
    assert.equal(game.decisionEventDispatchedCount, 5);
    assert.equal(game.weekEventResults.length, 5);
    assert.equal(new Set(game.weekEventResults.map(({ decisionKey }) => decisionKey)).size, 5);
    assert.equal(game.eventScheduleShortfall, 0);

    let closing = engine.startTurn({ ...first, week: finalWeek, eventScheduleWeek: null });
    closing = answer(closing);
    assert.equal(closing.actionsLeft, 7);
    closing = engine.prepareDecisionWeekClose(closing);
    assert.equal(closing.actionsLeft, 0);
    assert.ok(engine.decisionPending(closing));
    assert.equal(closing.week, finalWeek);
    assert.equal(engine.advanceWeek(closing), closing);
    while (engine.decisionPending(closing)) closing = answer(saveCycle(closing));
    assert.equal(closing.weekEventResults.length, 5);
    assert.equal(closing.eventScheduleIndex, 4);
    console.log('Build 36 cadence, real same-week incident, five saved final-week decisions, and early End Week verified.');
  } finally {
    Math.random = originalRandom;
  }
} finally {
  await server.close();
}
