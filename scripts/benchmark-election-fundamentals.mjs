import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { weeklyEventCountV2 } from '../src/lib/eventCadenceV2.js';

const project = process.env.BFA_BENCHMARK_ROOT
  ? path.resolve(process.env.BFA_BENCHMARK_ROOT)
  : fileURLToPath(new URL('../../build35-integration-worktree/build35/', import.meta.url));
const { createServer } = await import(pathToFileURL(path.join(project, 'node_modules/vite/dist/node/index.js')).href);
const variant = process.argv[2] || 'baseline';
const seed = process.argv[3] || 'dev2-delivery-1';
const party = process.argv[4] || 'dem';
const thirdMode = process.argv[5] || 'fringe';
if (!['baseline', 'proposed'].includes(variant) || !['dem', 'rep'].includes(party) || !['fringe', 'surge'].includes(thirdMode)) throw new Error('Use baseline|proposed, seed, dem|rep, fringe|surge');
const records = [];
globalThis.__dev2EventBench = records;
globalThis.__dev2V2Count = weeklyEventCountV2;
const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) };
let patched = false;
const server = await createServer({
  root: project,
  configFile: path.join(project, 'vite.config.js'),
  cacheDir: fileURLToPath(new URL(`../.vite-event-bench-${variant}`, import.meta.url)),
  optimizeDeps: { disabled: true },
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, ws: false },
  logLevel: 'error',
  plugins: [{
    name: 'dev2-cadence-benchmark', enforce: 'pre',
    transform(code, id) {
      if (!id.replaceAll('\\', '/').split('?')[0].endsWith('/src/lib/gameEngine.js')) return null;
      const dispatch = 'const count = decisionEventCountForRoll(game, Math.random());';
      const anchor = 'return { entries, usedEvents: source.usedEvents, followUps: source.followUps, pendingInterrupts: pending, passiveEvents, count, vanceSuccessionDeliveredWeek: source.vanceSuccessionDeliveredWeek };';
      if (!code.includes(dispatch) || !code.includes(anchor)) throw new Error('Reference dispatcher changed; benchmark cannot safely instrument it');
      let output = variant === 'proposed'
        ? code.replace(dispatch, 'void Math.random(); const count = globalThis.__dev2V2Count({ campaignId: game.build34CampaignId, week: game.week + 1, totalWeeks: totalWeeksOf(game), actionSlots: ACTIONS_PER_WEEK });')
        : code;
      output = output.replace(anchor, `globalThis.__dev2EventBench.push({ week: game.week, requested: count, scheduled: entries.length, passive: passiveEvents.length });\n  ${anchor}`);
      patched = true;
      return { code: output, map: null };
    },
  }],
});
const originalRandom = Math.random;
try {
  const engine = await server.ssrLoadModule('/src/lib/gameEngine.js');
  const { createSeededRandom } = await server.ssrLoadModule('/src/lib/seededRandom.js');
  const { recordIncident } = await server.ssrLoadModule('/src/lib/incidentLedger.js');
  assert.ok(patched, 'live dispatcher instrumentation was installed');
  Math.random = createSeededRandom(seed);
  const cfg = { campaignId: seed, party, candidateId: party === 'dem' ? 'shapiro' : 'vance', opponentId: party === 'dem' ? 'vance' : 'shapiro', difficultyId: 'medium', startId: 'aug', thirdMode, nationalGeneric: -2.25 };
  const ids = ['field', 'pollster', 'communications', 'operations', 'policy', 'fundraising', 'base-liaison', 'social-media', 'media'];
  let game = engine.confirmBuild35Staffing(engine.createGame(cfg), ids);
  let delivered = 0;
  const closeDecisions = (input) => {
    let current = input;
    for (let i = 0; i < 8; i += 1) {
      if (engine.decisionPending(current)) {
        const prior = current;
        current = recordIncident(prior, engine.applyChoice(prior, prior.currentEventData.choices[0]), { type: 'choice' });
        assert.notEqual(current, prior, 'decision could not resolve');
        delivered += 1;
      }
      const advanced = engine.advanceDecisionEvent(current);
      if (advanced === current) break;
      current = advanced;
    }
    return current;
  };
  let guard = 0;
  while (!game.finished && guard++ < 20) {
    game = closeDecisions(game);
    for (let i = 0; i < engine.ACTIONS_PER_WEEK; i += 1) {
      const abbr = ['PA', 'WI', 'MI', 'GA', 'NC', 'AZ', 'NV'][i];
      const actionId = i === 3 ? 'fundraise' : 'visit';
      const previous = game;
      game = closeDecisions(recordIncident(previous, engine.applyAction(previous, actionId, abbr), { type: 'action', actionId, abbr }));
    }
    const rival = recordIncident(game, engine.opponentTurn(game), { type: 'opponent' });
    game = engine.advanceWeek(rival);
  }
  assert.ok(game.finished, 'campaign did not reach Election Night');
  const requested = records.reduce((sum, item) => sum + item.requested, 0);
  const scheduled = records.reduce((sum, item) => sum + item.scheduled, 0);
  console.log(JSON.stringify({ variant, seed, party, thirdMode, completedWeeks: game.week, requested, scheduled, delivered, eligibilityShortfall: requested - scheduled, scheduledNotDelivered: scheduled - delivered, weeks: records }));
} finally {
  Math.random = originalRandom;
  delete globalThis.__dev2EventBench;
  delete globalThis.__dev2V2Count;
  await server.close();
}
