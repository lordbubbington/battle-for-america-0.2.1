import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { register } from 'node:module';

const baseline = new URL('../../../../build-0.1.3-integration-worktree/build35/', import.meta.url);
register(new URL('tests/build40/field/alias-loader.mjs', baseline));
const engine = await import(new URL('src/lib/gameEngine.js', baseline));
const { BUILD40_EVENTS } = await import(new URL('src/data/build40EventCatalog.js', baseline));
const { createSeededRandom } = await import(new URL('src/lib/seededRandom.js', baseline));

const campaignId = 'build43-settled-scandal';
Math.random = createSeededRandom(campaignId);
const initial = engine.createGame({ party: 'dem', candidateId: 'shapiro', opponentId: 'vance', startId: 'aug', campaignId });
const staffed = engine.confirmBuild35Staffing(initial,
  ['field', 'pollster', 'communications', 'operations', 'policy', 'fundraising', 'base-liaison', 'social-media', 'media']);
const active = { ...staffed, week: 3, funds: 100, currentEventData: null, currentEventId: null, outcome: null, usedEvents: [] };
let settled;
for (const event of BUILD40_EVENTS) {
  const guaranteed = event.choices.find((choice) => choice.branches.every((branch) => branch.effects.some((effect) =>
    effect.kind === 'scandal' && effect.probability === 1 && effect.target.side === 'actor')));
  if (!guaranteed) continue;
  const queued = engine.forceEvent(active, event.id);
  if (queued.currentEventId !== event.id) continue;
  settled = engine.applyChoice(queued, guaranteed.id);
  if (settled.outcome?.scandal) break;
}
assert.ok(settled?.outcome?.scandal, 'Build 43 resolves a real guaranteed scandal');
assert.equal(settled.outcome.presentation, undefined);

const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
assert.ok(engine.saveGame(settled));
const oldSave = {
  version: '0.1.3', eventId: settled.currentEventId, scandal: settled.outcome.scandal,
  momentum: settled.momentum, funds: settled.funds, receipts: settled.build40.decisionReceipts,
  storage: storage.get(engine.STORAGE_KEY),
};
await writeFile(new URL('../../../fixtures/build43-settled-scandal.json', import.meta.url), JSON.stringify(oldSave, null, 2) + '\n');
console.log(JSON.stringify({ eventId: oldSave.eventId, scandal: oldSave.scandal, savedByBuild43: true }));
