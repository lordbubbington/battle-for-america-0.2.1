import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const server = await createServer({ root: app, configFile: false, appType: 'custom', resolve: { alias: { '@': path.join(app, 'src') } }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null } });
try {
  const engine = await server.ssrLoadModule('/src/lib/gameEngine.js');
  const { build40SimulatedElectionNotices } = await server.ssrLoadModule('/src/lib/build40Reports.js');
  const { BUILD40_EVENTS } = await server.ssrLoadModule('/src/data/build40EventCatalog.js');
  const all = BUILD40_EVENTS.map(event => event.id);
  let base = engine.createGame({ party: 'grn', candidateId: 'stein', opponentId: 'shapiro', startId: 'aug', campaignId: 'simulation-regression', modeId: 'four-parties', difficultyId: 'hard' });
  base = { ...base, week: 5, incidentLedger: [], usedEvents: [], ops: {} };
  const petition = build40SimulatedElectionNotices(base, ['WI'], new Date('2028-09-15T12:00:00Z'), 52);
  const late = build40SimulatedElectionNotices(base, ['WI'], new Date('2028-11-01T12:00:00Z'), 6);
  let correction;
  for (let i = 0; i < 100 && !correction; i++) {
    const game = build40SimulatedElectionNotices({ ...base, build34CampaignId: `correction-${i}` }, ['WI'], new Date('2028-11-01T12:00:00Z'), 6);
    if (game.incidentLedger.some(item => item.payload.kind === 'administration-correction')) correction = game;
  }
  assert.ok(correction, 'a simulated correction can be generated');
  const cases = [['048', petition], ['096', petition], ['097', petition], ['099', late], ['100', correction]];
  for (const [number, game] of cases) {
    const target = BUILD40_EVENTS.find(event => event.id.startsWith(`interrupt-${number}-`));
    assert.ok(target, number);
    const isolate = state => engine.nextEventFor(state, { excludedEventIds: all.filter(id => id !== target.id), random: () => 0 }).event;
    const selected = isolate(game);
    assert.equal(selected?.id, target.id, `${number} accepts simulated campaign incident`);
    assert.ok(selected.sourceReceiptId, number);
    assert.notEqual(isolate({ ...game, incidentLedger: [] })?.id, target.id, `${number} requires an in-game incident`);
  }
  console.log('Simulated petition, challenge, and polling-place events pass; missing incidents rejected.');
} finally { await server.close(); }
