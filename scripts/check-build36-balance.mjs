import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';

const integrationRoot = fileURLToPath(new URL('../', import.meta.url));
const reference = process.argv.includes('--build35');
const reference36 = process.argv.includes('--build36');
const build37 = process.argv.includes('--build37');
const supplementalPr = process.argv.includes('--build38-pr');
const build38 = supplementalPr || process.argv.includes('--build38') || process.argv.includes('--build38-reference');
const baseline38 = process.argv.includes('--build38-reference');
const matrixParty = process.argv.find((arg) => arg.startsWith('--party='))?.slice(8);
const sourceRoot = baseline38 ? path.resolve(integrationRoot, '../../build37-integration-worktree/build35') : reference || reference36
  ? path.resolve(integrationRoot, `../../build${reference ? 35 : 36}-integration-worktree/build35`)
  : integrationRoot;
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
const server = await createServer({
  configLoader: 'runner',
  configFile: path.join(sourceRoot, 'vite.config.js'),
  root: sourceRoot,
  cacheDir: path.join(integrationRoot, build38 ? '.vite/build38-matrix-' + (baseline38 ? 'before-' : 'after-') + (matrixParty || 'all') : reference || reference36 ? '.vite/build37-reference' : '.vite/build37-balance'),
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, ws: false },
});

const fixtures = [
  { party: 'dem', candidateId: 'shapiro', opponentId: 'vance', difficultyId: 'medium', thirdMode: 'fringe', houseRule: 'standard', electoralRule: 'standard', specialists: 0 },
  { party: 'rep', candidateId: 'vance', opponentId: 'shapiro', difficultyId: 'hard', thirdMode: 'surge', houseRule: 'standard', electoralRule: 'standard', specialists: 1 },
  { party: 'lib', candidateId: 'oliver', opponentId: 'shapiro', difficultyId: 'medium', thirdMode: 'surge', houseRule: 'pr', electoralRule: 'proportional', specialists: 2 },
  { party: 'grn', candidateId: 'stein', opponentId: 'vance', difficultyId: 'easy', thirdMode: 'surge', houseRule: 'mmp', electoralRule: 'district', specialists: 3 },
];
const matrix = supplementalPr ? [{ ...fixtures[2], votingRuleId: 'current', pairedRule: 'current' }] : !build38 ? fixtures : fixtures.filter(({ party }) => !matrixParty || matrixParty === party).flatMap((fixture) =>
  ['current','automatic-registration','same-day-registration','mandatory-voter-id','mandatory-turnout'].flatMap((rule) =>
    ['easy','hard'].map((difficultyId) => ({ ...fixture, difficultyId, houseRule: fixture.party === 'lib' ? 'mmp' : fixture.houseRule, votingRuleId: baseline38 ? 'current' : rule, pairedRule: rule }))));
const traditional = ['field', 'pollster', 'communications', 'operations', 'policy', 'fundraising', 'base-liaison', 'social-media', 'media'];
const states = ['PA', 'WI', 'MI', 'GA', 'NC', 'AZ', 'NV'];
const round = (number, decimals = 2) => Number(number.toFixed(decimals));

try {
  const engine = await server.ssrLoadModule('/src/lib/gameEngine.js');
  const staff = await server.ssrLoadModule('/src/lib/build35Staff.js');
  const { EVENT_BY_ID } = await server.ssrLoadModule('/src/data/events.js');
  const { recordIncident } = await server.ssrLoadModule('/src/lib/incidentLedger.js');
  const { recordCampaignStrategy, decayCampaignStrategy } = await server.ssrLoadModule('/src/lib/campaignOperations.js');
  const { withReactionSummary } = await server.ssrLoadModule('/src/lib/reactions.js');
  const { createSeededRandom } = await server.ssrLoadModule('/src/lib/seededRandom.js');
  const { turnoutOf } = await server.ssrLoadModule('/src/lib/turnout.js');
  const originalRandom = Math.random;
  const confirm = engine.confirmBuild36Staffing || engine.confirmBuild35Staffing;
  const chooseAgenda = staff.setBuild36Agenda || staff.setBuild35Agenda;
  const makeBriefing = staff.build36StaffBriefing || staff.build35StaffBriefing;
  const recordStaffAction = staff.recordBuild36StaffAction || staff.recordBuild35StaffAction;
  const openEvent = (game) => game.currentEventData || EVENT_BY_ID[game.currentEventId];
  const agendaFor = (game) => (game.staffing.agendaByWeek || game.staffAgendaByWeek)?.[game.week];
  const start = performance.now();
  try {
    for (const { specialists, pairedRule, ...config } of matrix) {
      storage.clear();
      const seed = build38 ? 'build38:' + config.party + ':' + pairedRule : 'build36-balance:' + config.party;
      Math.random = createSeededRandom(seed);
      const started = performance.now();
      const draft = engine.createGame({ ...config, startId: 'aug', campaignId: build38 ? seed : 'build36-balance-' + config.party, nationalGeneric: -2.25 });
      const offered = reference ? [] : draft.staffing.nonTraditionalSelectionPoolIds;
      assert.ok(Array.isArray(offered) && offered.length === (reference ? 0 : 3));
      const chosen = offered.slice(0, specialists);
      let game = confirm(draft, [...traditional.slice(0, 9 - chosen.length), ...chosen]);
      assert.equal(game.natGeneric, -2.25);
      if (!reference) assert.deepEqual(game.staffing.nonTraditionalActiveIds, chosen);
      assert.equal(game.decisionEventTargetCount, 0);

      const stats = {
        actions: 0, eventTargets: 0, eventShortfalls: 0, decisions: 0, triggered: 0,
        agendas: 0, usedAgendas: 0, upkeep: 0, pacPlacements: 0, pacGroups: 0, pacFatigue: 0,
        pacTurnoutMagnitude: 0, rivalMs: 0,
      };
      const commit = (current, next, context) => {
        if (next === current) return current;
        const recorded = recordCampaignStrategy(current, recordIncident(current, next, context), context);
        return recordStaffAction(current, withReactionSummary(current, recorded, context), context);
      };
      const drain = (current) => {
        let next = engine.advanceDecisionEvent(current);
        let count = 0;
        while (engine.decisionPending(next)) {
          assert.ok(++count <= 10, 'decision queue must make progress');
          const event = openEvent(next);
          const resolved = engine.applyChoice(next, event.choices[0], event.id);
          assert.notEqual(resolved, next, event.id + ' did not resolve');
          stats.decisions++;
          if (event.sourceReceiptId) {
            stats.triggered++;
            assert.ok(next.incidentLedger.some((receipt) => receipt.id === event.sourceReceiptId));
          }
          next = engine.advanceDecisionEvent(commit(next, resolved, { type: 'choice' }));
        }
        return next;
      };

      while (!game.finished) {
        const currentWeek = game.week;
        stats.eventTargets += game.decisionEventTargetCount || 0;
        game = drain(game);
        let debateSteps = 0;
        while (game.debate && !game.debate.done && debateSteps++ < 6) {
          const question = engine.debateDefinition(game)?.questions?.[game.debate.step];
          if (!question?.answers?.length) break;
          game = drain(commit(game, engine.answerDebate(game, question.answers[0]), { type: 'debate' }));
        }

        const briefing = makeBriefing(game);
        const field = briefing.recommendations.find((item) => item.agendaEligible && item.actionId === 'volunteers');
        if (field) {
          const planned = chooseAgenda(game, field.id);
          if (planned !== game) stats.agendas++;
          game = planned;
        }
        for (let step = 0; game.actionsLeft > 0 && step < engine.ACTIONS_PER_WEEK; step++) {
          const abbr = step === 0 && field ? field.targetId : states[step];
          const before = game.actionsLeft;
          let actionId = step === 0 && field ? 'volunteers' : step === 3 ? 'fundraise' : step === 4 ? 'townhall' : 'visit';
          let next = engine.applyAction(game, actionId, abbr, actionId === 'townhall' ? { score: 3, answers: [] } : {});
          if (next === game) {
            actionId = 'fundraise';
            next = engine.applyAction(game, actionId, abbr);
          }
          assert.notEqual(next, game, 'A normal action must advance this seeded campaign');
          game = drain(commit(game, next, { type: actionId === 'townhall' ? 'townhall' : 'action', actionId, abbr }));
          stats.actions += before - game.actionsLeft;
        }
        assert.equal(game.actionsLeft, 0);
        if (agendaFor(game)?.effectReceiptId) stats.usedAgendas++;
        stats.eventShortfalls += game.eventScheduleShortfall || 0;
        if (!reference && currentWeek === engine.totalWeeksOf(game) - 1) assert.equal(game.decisionEventTargetCount, 5);
        const rivalStarted = performance.now();
        const rival = recordIncident(game, engine.opponentTurn(game), { type: 'opponent' });
        stats.rivalMs += performance.now() - rivalStarted;
        const pac = rival.build34SuperPacReceiptsByWeek[currentWeek + 1];
        assert.ok(pac?.effectsAlreadyApplied);
        assert.equal(new Set(pac.appliedReceiptIds).size, pac.aggregates.length);
        stats.pacPlacements += pac.digest.totalAds;
        stats.pacGroups += pac.aggregates.length;
        stats.pacFatigue += pac.digest.generalFatiguePoints;
        stats.pacTurnoutMagnitude += pac.aggregates.reduce((sum, row) => sum + Math.abs(row.turnoutPoints || 0), 0);
        game = decayCampaignStrategy(engine.advanceWeek(rival));
        assert.equal(game.week, currentWeek + 1);
        assert.ok(Number.isFinite(game.funds) && game.funds >= 0);
        stats.upkeep += game.finance?.contractUpkeep || game.finance?.staffUpkeep || 0;
        if ([3, 8, 12, 13].includes(game.week)) {
          const ballots = game.earlyBallotLedger;
          assert.equal(engine.saveGame(game), true);
          game = engine.loadGame();
          assert.equal(game.week, currentWeek + 1);
          if (build37 || build38) assert.deepEqual(game.earlyBallotLedger, ballots);
          if (!reference) assert.deepEqual(game.staffing.nonTraditionalActiveIds, chosen);
        }
      }
      assert.equal(stats.actions, game.week * engine.ACTIONS_PER_WEEK);
      const result = engine.resultSnapshot(game);
      assert.ok(result.rows.every((row) => Number.isFinite(row.margin)));
      assert.equal(Object.values(result.evBy).reduce((sum, seats) => sum + seats, 0), 538);
      if (build38 && !baseline38) {
        assert.equal(stats.upkeep, 0);
        assert.equal(game.build38.regionalAppliedWeek, game.week);
        assert.equal(game.build38.votingRuleId, pairedRule);
      }
      if (build37 || build38) {
        assert.equal(game.earlyBallotLedger.batches.length, config.electoralRule === 'district' ? 0 : config.electoralRule === 'standard' ? 98 : 102);
        assert.equal(Object.keys(game.build34EndorserRegistry).length, 0);
        assert.equal(stats.decisions + stats.eventShortfalls, stats.eventTargets);
      }
      const house = engine.houseSnapshot(game, true);
      const senate = engine.senateSnapshot(game, true);
      assert.equal(engine.saveGame(game), true);
      assert.equal(engine.loadGame().finished, true);
      const turnout = result.rows.map(({ abbr }) => turnoutOf(game, abbr, game.party));
      const votes = {};
      for (const row of result.rows) {
        for (const [party, total] of Object.entries(row.votes || {})) votes[party] = (votes[party] || 0) + total;
      }
      const voteTotal = Object.values(votes).reduce((sum, total) => sum + total, 0);
      console.log(JSON.stringify({
        build: build38 ? baseline38 ? 37 : 38 : reference ? 35 : build37 ? 37 : 36, seed, pairedRule, party: config.party, difficulty: config.difficultyId,
        houseRule: config.houseRule, electoralRule: config.electoralRule, weeks: game.week, chosen,
        ...stats, upkeep: round(stats.upkeep), pacTurnoutMagnitude: round(stats.pacTurnoutMagnitude), rivalMs: round(stats.rivalMs),
        fundsM: round(game.funds), factions: game.factions,
        averageTurnout: round(turnout.reduce((sum, points) => sum + points, 0) / turnout.length),
        turnoutRange: [round(Math.min(...turnout)), round(Math.max(...turnout))],
        nationalShares: Object.fromEntries(Object.entries(votes).map(([party, count]) => [party, round(100 * count / voteTotal)])),
        ev: result.evBy, houseSeats: { dem: house.dem, rep: house.rep }, senateSeats: { dem: senate.dem, rep: senate.rep },
        earlyBallotBatches: game.earlyBallotLedger?.batches.length || 0,
        saveCharacters: storage.get(engine.STORAGE_KEY).length, totalMs: round(performance.now() - started),
      }));
    }
  } finally {
    Math.random = originalRandom;
  }
  console.log('Completed ' + matrix.length + ' seeded campaigns in ' + Math.round(performance.now() - start) + ' ms.');
} finally {
  await server.close();
}
