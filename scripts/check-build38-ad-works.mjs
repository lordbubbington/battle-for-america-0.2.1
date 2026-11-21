import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) };
const server = await createServer({ configLoader: 'runner', appType: 'custom', cacheDir: '.vite/build38-ad-works',
  optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false } });
const originalRandom = Math.random;
try {
  const engine = await server.ssrLoadModule('/src/lib/gameEngine.js');
  const { recordIncident } = await server.ssrLoadModule('/src/lib/incidentLedger.js');
  const { createSeededRandom } = await server.ssrLoadModule('/src/lib/seededRandom.js');
  const { planBuild36EventDispatch } = await server.ssrLoadModule('/src/lib/build35EventEvidence.js');
  const { adWorksPersuasion } = await server.ssrLoadModule('/src/lib/build38AdWorks.js');
  const id = 'interrupt-021-ad-works';
  for (const [party, candidateId, opponentId] of [['dem','shapiro','vance'], ['rep','vance','shapiro'], ['lib','oliver','shapiro']]) {
    Math.random = createSeededRandom('build38:event-check:' + party);
    const game = engine.createGame({ party, candidateId, opponentId, campaignId: 'build38:event-check:' + party, startId: 'aug', difficultyId: 'hard' });
    const ready = engine.confirmBuild35Staffing(game, ['field','pollster','communications','operations','policy','fundraising','base-liaison','social-media','media']);
    const before = { ...ready, week: 1, funds: 100, currentEventData: null, currentEventId: null };
    let purchase;
    for (let i = 0; i < 50; i++) {
      Math.random = createSeededRandom('build38:event-ad:' + party + ':' + i);
      const result = engine.runAdBlitz(before, { abbr: 'TX', issueId: 'economy', kind: 'pro', typeId: 'tv' });
      if (result.lastAd?.swing > 0 && result.lastAd?.points > 0 && !result.lastAd?.backfire) { purchase = result; break; }
    }
    assert.ok(purchase && purchase.funds < before.funds, 'Native ad purchase produced a favorable, paid result');
    const recorded = recordIncident(before, purchase, { type: 'ad', abbrs: ['TX'], issueId: 'economy', kind: 'pro' });
    const queued = recorded.pendingInterrupts.find(({ event }) => event.onceKey === 'triggered-event:' + id);
    assert.ok(queued, 'A favorable committed advertisement produces the card');
    const { event, status } = planBuild36EventDispatch(recorded, queued.event, 0);
    assert.equal(status, 'ready');
    const active = { ...recorded, funds: 10.37, currentEventId: event.id, currentEventData: event, outcome: null,
      eventScheduleWeek: recorded.week, eventScheduleIndex: 0,
      eventSchedule: [{ id: event.id, event, status: 'dispatched', afterActions: 0 }],
      decisionEventTargetCount: 1, decisionEventDispatchedCount: 1 };
    assert.equal(event.choices.length, 3);
    assert.match(event.choices[1].displayLabel, /same state/);
    assert.match(event.choices[1].detail, /each equally likely/);
    assert.equal(engine.applyChoice({ ...active, funds: 0.99 }, event.choices[1], event.id).funds, 0.99);
    for (const [index, choice] of event.choices.entries()) {
      const result = engine.applyChoice(active, choice, event.id);
      const points = index === 1 ? adWorksPersuasion(choice.build38AdWork, active.build34CampaignId) : index === 0 ? 3 : 1;
      assert.notEqual(result, active);
      assert.equal(result.funds, [8.37,9.37,10.37][index]);
      assert.equal(result.outcome.sourceStateId, 'TX');
      assert.equal(result.outcome.persuasionPoints, points);
      assert.equal(result.outcome.scandal, null);
      assert.deepEqual(result.turnout, active.turnout);
      const field = party === 'lib' ? result.thirdMods[party] : result.stateMods;
      const old = party === 'lib' ? active.thirdMods[party] : active.stateMods;
      assert.equal((field.TX || 0) - (old.TX || 0), points * (party === 'rep' ? -1 : 1));
      assert.deepEqual({ ...field, TX: 0 }, { ...old, TX: 0 });
      assert.equal(engine.applyChoice({ ...result, outcome: null }, choice, event.id).funds, result.funds);
    }
    assert.ok(engine.saveGame(active));
    if (party === 'dem' && process.argv[2]) writeFileSync(process.argv[2], storage.get(engine.STORAGE_KEY));
    const loaded = engine.loadGame();
    assert.equal(loaded.currentEventData.id, event.id);
    assert.equal(engine.applyChoice(loaded, loaded.currentEventData.choices[1], event.id).outcome.persuasionPoints,
      engine.applyChoice(active, event.choices[1], event.id).outcome.persuasionPoints);
    const legacyEvent = { ...queued.event };
    const legacy = { ...active, currentEventData: legacyEvent };
    assert.equal(engine.applyChoice(legacy, legacyEvent.choices[0], event.id).outcome.persuasionPoints, undefined);
  }
  console.log('Ad Works verified receipt dispatch, D/R/L state effects, affordability, retry, save/load RNG and legacy card terms.');
} finally {
  Math.random = originalRandom;
  await server.close();
}
