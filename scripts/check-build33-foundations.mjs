import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const vite = await createServer({
  configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
  root,
  cacheDir: join(tmpdir(), 'bfa-build33-vite-check'),
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true },
});

try {
  const engine = await vite.ssrLoadModule('/src/lib/gameEngine.js');
  const environment = await vite.ssrLoadModule('/src/lib/environment.js');
  const downballot = await vite.ssrLoadModule('/src/lib/downballot.js');
  const field = await vite.ssrLoadModule('/src/lib/fieldOperations.js');
  const states = await vite.ssrLoadModule('/src/data/states.js');
  const events = await vite.ssrLoadModule('/src/data/events.js');
  const debates = await vite.ssrLoadModule('/src/data/debates.js');
  const incidents = await vite.ssrLoadModule('/src/lib/incidentLedger.js');
  const triggeredEvents = await vite.ssrLoadModule('/src/data/triggeredEvents.js');

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

  const opened = engine.startTurn(game);
  assert.equal(opened.currentEventId, null, 'week one has no decision event');
  assert.equal(opened.decisionEventCount, 0, 'week one decision count is zero');
  assert.equal(engine.decisionEventCountForRoll({ ...opened, week: 1 }, 0.1), 1);
  assert.equal(engine.decisionEventCountForRoll({ ...opened, week: 1 }, 0.65), 2);
  assert.equal(engine.decisionEventCountForRoll({ ...opened, week: 1 }, 0.95), 3);
  assert.equal(engine.decisionEventCountForRoll({ ...opened, week: opened.totalWeeks - 1 }, 0.1), 5);

  const previousRandom = Math.random;
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
    assert.ok(Object.values(groupShifts).some((shift) => shift > 0) && Object.values(groupShifts).some((shift) => shift < 0), 'debate response records the two voter groups moving in opposite directions');
    assert.ok(queuedKeys(groupReceipt).includes(onceKeyFor('007')), 'opposing voter-group responses queue their matching follow-up');
  } finally {
    Math.random = previousRandom;
  }

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
  assert.equal(game.govStart.dem + game.govStart.rep + game.govStart.other, 50, 'governor starting chamber totals 50 seats');

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

  process.stdout.write('Build 33 foundation checks passed.\n');
} finally {
  await vite.close();
}
