import assert from 'node:assert/strict';
import { createServer } from 'vite';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
const server = await createServer({
  cacheDir: './.vite-build35-integration-check',
  optimizeDeps: { disabled: true },
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
});

try {
  const engine = await server.ssrLoadModule('/src/lib/gameEngine.js');
  const staff = await server.ssrLoadModule('/src/lib/build35Staff.js');
  const { createSeededRandom } = await server.ssrLoadModule('/src/lib/seededRandom.js');
  const { turnoutOf } = await server.ssrLoadModule('/src/lib/turnout.js');
  const { recordIncident } = await server.ssrLoadModule('/src/lib/incidentLedger.js');
  const { hasBuild35EventEvidence } = await server.ssrLoadModule('/src/lib/build35EventEvidence.js');
  const { STATE_LEGISLATURE_SEATS_2028 } = await server.ssrLoadModule('/src/data/stateLegislatureSeats2028.js');
  const ids = ['field', 'pollster', 'communications', 'operations', 'policy', 'fundraising', 'base-liaison', 'social-media', 'media'];
  const config = { party: 'dem', candidateId: 'shapiro', opponentId: 'vance', difficultyId: 'medium', startId: 'aug', nationalGeneric: -2.25 };
  const originalRandom = Math.random;
  Math.random = createSeededRandom('build35-integration');
  try {
    const make = (options) => engine.createGame({ ...config, ...options });
    const draft = make({ campaignId: 'build35-integration' });
    assert.equal(engine.startTurn(draft), draft);
    assert.equal(engine.advanceWeek(draft), draft);
    assert.equal(engine.confirmBuild35Staffing(draft, ids.slice(1)), draft);
    assert.equal(new Set(draft.staffing.nonTraditionalOfferIds).size, 3);
    assert.deepEqual(make({ campaignId: 'build35-integration' }).staffing.nonTraditionalOfferIds, draft.staffing.nonTraditionalOfferIds);
    engine.saveGame(draft);
    const pending = engine.loadGame();
    assert.equal(pending.staffing.initialSelectionComplete, false);
    const initial = engine.confirmBuild35Staffing(pending, ids);
    assert.equal(initial.staffing.traditionalActiveIds.length, 10);
    assert.equal(initial.staffing.traditionalBenchIds.length, 4);
    assert.equal(initial.natGeneric, -2.25);
    assert.equal(engine.startTurn(initial), initial);
    const briefing = staff.build35StaffBriefing(initial);
    const recommendation = briefing.recommendations.find((item) => item.staffId === 'field' && item.actionId === 'volunteers' && item.agendaEligible);
    assert.ok(recommendation, JSON.stringify(briefing.recommendations));
    const plan = staff.setBuild35Agenda(initial, recommendation.id);
    const plain = engine.applyAction(initial, 'volunteers', recommendation.targetId);
    const chosen = engine.applyAction(plan, 'volunteers', recommendation.targetId);
    assert.ok(turnoutOf(chosen, recommendation.targetId, 'dem') > turnoutOf(plain, recommendation.targetId, 'dem'));
    assert.ok(chosen.staffAgendaByWeek[0].effectReceiptId);
    const context = { type: 'action', actionId: 'volunteers', abbr: recommendation.targetId };
    const recorded = staff.recordBuild35StaffAction(plan, recordIncident(plan, chosen, context), context);
    engine.saveGame(recorded);
    const reloaded = engine.loadGame();
    assert.deepEqual(reloaded.staffAgendaByWeek, recorded.staffAgendaByWeek);
    assert.equal(staff.setBuild35Agenda(reloaded, recommendation.id), reloaded);
    const again = engine.applyAction(reloaded, 'volunteers', recommendation.targetId);
    assert.deepEqual(again.staffAgendaByWeek, reloaded.staffAgendaByWeek);
    const resolved = recordIncident(again, engine.opponentTurn(again), { type: 'opponent' });
    assert.equal(resolved.lastOpponent.forecastPlan.source, 'shared-election-forecast');
    const pac = resolved.build34SuperPacReceiptsByWeek[1];
    assert.ok(pac.aggregates.length && pac.effectsAlreadyApplied);
    assert.equal(new Set(pac.appliedReceiptIds).size, pac.aggregates.length);
    assert.equal(pac.aggregates.reduce((sum, row) => sum + row.placementCount, 0), pac.digest.totalAds);
    assert.ok(pac.aggregates.every((row) => row.effectMultiplier === 0.2 && row.fatigueChannel === 'general' && Number.isFinite(row.turnoutPoints)));
    assert.equal(resolved.lastOutside.ads, undefined);
    engine.saveGame(resolved);
    const pacReloaded = engine.loadGame();
    assert.deepEqual(pacReloaded.build34SuperPacReceiptsByWeek[1], pac);
    assert.equal(engine.opponentTurn(pacReloaded), pacReloaded);
    const second = engine.advanceWeek(pacReloaded);
    assert.equal(second.staffBriefHistory.at(-1).status, 'used');
    assert.equal(second.week, 1);

    const offeredCampaign = (staffId) => {
      for (let index = 0; index < 100; index++) {
        const campaignId = 'contract-check-' + index;
        if (staff.initialBuild35Staff(campaignId).nonTraditionalOfferIds.includes(staffId)) {
          return engine.confirmBuild35Staffing(make({ campaignId }), ids);
        }
      }
      throw new Error('Could not find a deterministic contract fixture for ' + staffId);
    };
    let astrology = offeredCampaign('astrology-consultant');
    const astrologyAgenda = staff.build35StaffBriefing(astrology).recommendations
      .find((item) => item.staffId === 'field' && item.actionId === 'volunteers' && item.agendaEligible);
    astrology = staff.setBuild35Agenda(astrology, astrologyAgenda.id);
    const hired = staff.hireBuild35Contract(astrology, 'astrology-consultant');
    assert.equal(hired.actionsLeft, astrology.actionsLeft - 1);
    assert.equal(hired.funds, astrology.funds - 1.5);
    assert.equal(staff.hireBuild35Contract(hired, 'astrology-consultant'), hired);
    const alternative = staff.build35AgendaAlternatives(hired)[0];
    assert.ok(alternative);
    const rerouted = staff.setBuild35Agenda(hired, alternative.id);
    assert.notEqual(rerouted.staffAgendaByWeek[0].targetId, astrologyAgenda.targetId);
    const reroutedAction = engine.applyAction(rerouted, 'volunteers', rerouted.staffAgendaByWeek[0].targetId);
    assert.ok(reroutedAction.staffAgendaByWeek[0].effectReceiptId);
    const afterSigning = engine.advanceWeek(reroutedAction);
    assert.equal(afterSigning.finance.contractUpkeep, 0);
    const afterUpkeep = engine.advanceWeek(afterSigning);
    assert.equal(afterUpkeep.finance.contractUpkeep, 0.25);

    const asmr = staff.hireBuild35Contract(offeredCampaign('asmr-streamer'), 'asmr-streamer');
    Math.random = () => 0.1;
    const batch = engine.runAdBlitz(asmr, { abbrs: ['PA', 'MI'], issueId: 'economy', kind: 'pro', typeId: 'digital' });
    for (const state of ['PA', 'MI']) {
      assert.ok(Math.abs(batch.totalFatigue[state] - (asmr.totalFatigue[state] || 0) - 0.9) < 0.00001);
      assert.equal(batch.fatigue.dem[state].ad, 1);
    }
    assert.equal(batch.staffContractEffectReceiptIds.length, 1);
    Math.random = createSeededRandom('build35-post-contracts');

    // Earn a contextual readout by running an ad through the normal action resolver.
    let adState = { ...initial, funds: 100, currentEventData: null, currentEventId: null };
    Math.random = () => 0.95;
    const ad = engine.runAdBlitz(adState, { abbrs: ['PA'], issueId: 'economy', kind: 'pro', typeId: 'tv' });
    Math.random = createSeededRandom('build35-after-ad');
    adState = recordIncident(adState, ad, { type: 'ad', abbrs: ['PA'], issueId: 'economy', kind: 'pro' });
    const interruption = adState.pendingInterrupts.find((entry) => entry.event.onceKey);
    assert.ok(interruption, JSON.stringify(adState.lastAd));
    assert.ok(hasBuild35EventEvidence(adState, interruption.event));
    const event = interruption.event;
    const atCheckpoint = engine.advanceDecisionEvent({ ...adState, eventScheduleIndex: -1,
      eventSchedule: [{ id: event.id, event, interrupt: interruption, afterActions: 0 }] });
    assert.ok(engine.decisionPending(atCheckpoint));
    const response = event.choices[0];
    assert.equal(engine.applyChoice(atCheckpoint, { ...response, effects: { funds: 1000 } }), atCheckpoint);
    engine.saveGame(atCheckpoint);
    const eventReloaded = engine.loadGame();
    assert.ok(engine.decisionPending(eventReloaded));
    const chosenResponse = engine.applyChoice(eventReloaded, response);
    assert.ok(chosenResponse.outcome && chosenResponse.build35EventChoiceReceiptIds.length === 1);
    assert.equal(engine.applyChoice(chosenResponse, response), chosenResponse);
    assert.equal(engine.applyChoice({ ...eventReloaded, incidentLedger: [] }, response).outcome, null);

    const legacy = { ...initial };
    delete legacy.staffing;
    delete legacy.incidentProvenanceVersion;
    storage.delete(engine.STORAGE_KEY);
    storage.set('election2028.save.v2', JSON.stringify(legacy));
    const migrated = engine.loadGame();
    assert.equal(migrated.staffing.traditionalActiveIds.length, 10);
    assert.deepEqual(migrated.staffing.nonTraditionalOfferIds, []);
    const old = storage.get('election2028.save.v2');
    assert.equal(engine.saveGame(migrated), true);
    assert.equal(storage.get('election2028.save.v2'), old);
    engine.clearSave();
    assert.equal(engine.loadGame(), null);
    assert.equal(storage.get('election2028.save.v2'), old);

    const move = { type: 'stop', abbr: 'PA', stateName: 'Pennsylvania', moveText: 'The rival rallied in PA.', playerAttention: 0, effectMagnitude: 0.7, effectApplied: true };
    const week10 = { ...initial, week: 9, stateMods: { ...initial.stateMods } };
    week10.stateMods.PA = 10 - engine.pollMargin('PA', week10) + (week10.stateMods.PA || 0) - 0.000001;
    assert.equal(engine.applyRivalInterruptionPersuasion({ ...week10, week: 8 }, move).build35RivalInterruptionEffect, undefined);
    const wide = { ...week10, stateMods: { ...week10.stateMods, PA: week10.stateMods.PA + 2 } };
    assert.equal(engine.applyRivalInterruptionPersuasion(wide, move), wide);
    const hit = engine.applyRivalInterruptionPersuasion(week10, move);
    const movement = hit.build35RivalInterruptionEffect;
    assert.ok(Math.abs(engine.pollMargin('PA', week10) - engine.pollMargin('PA', hit) - 5) < 0.00001);
    assert.equal(engine.applyRivalInterruptionPersuasion(hit, move), hit);
    const hitRecorded = recordIncident(week10, { ...hit, lastOpponent: { neglectedStateMove: { ...move, effectMagnitude: 5, persuasion: movement } } }, { type: 'opponent' });
    assert.ok(hitRecorded.pendingInterrupts.some((item) => item.event.onceKey === 'triggered-event:interrupt-072-opponent-enters-state'));

    const staticDecision = (id) => ({ id, title: id, choices: [{ label: 'Continue', effects: {}, outcome: 'Recorded.' }] });
    const checkpoints = [0, 3, 4, 6, 7];
    let lastWeek = { ...initial, week: 13, eventScheduleIndex: -1, decisionEventCount: 5,
      eventSchedule: checkpoints.map((afterActions) => {
        const event = staticDecision('decision-' + afterActions);
        return { id: event.id, event, afterActions };
      }),
    };
    for (const checkpoint of checkpoints) {
      lastWeek = engine.advanceDecisionEvent({ ...lastWeek, actionsLeft: 7 - checkpoint });
      assert.equal(lastWeek.currentEventId, 'decision-' + checkpoint);
      engine.saveGame(lastWeek);
      lastWeek = engine.loadGame();
      assert.ok(engine.decisionPending(lastWeek));
      lastWeek = engine.applyChoice(lastWeek, lastWeek.currentEventData.choices[0]);
    }
    assert.equal(lastWeek.weekEventResults.length, 5);
    assert.equal(STATE_LEGISLATURE_SEATS_2028.length, 7386);
    assert.ok(STATE_LEGISLATURE_SEATS_2028.every((seat) => seat.voterWeight === 1));
    const house = engine.houseSnapshot(initial);
    assert.equal(house.districts.length, 435);
    assert.equal(house.districts.filter((district) => district.sourceYear === 2024).length, 121);
    console.log('Build 35 live staffing, save migration, action-backed events, grouped PACs, legislature seat count and House sources passed.');

    if (process.argv.includes('--campaigns')) {
      const fixtures = [
        ['dem', 'shapiro', 'vance', 'fringe', 'standard', 'standard'],
        ['rep', 'vance', 'shapiro', 'surge', 'standard', 'standard'],
        ['lib', 'oliver', 'shapiro', 'surge', 'pr', 'proportional'],
        ['grn', 'stein', 'vance', 'surge', 'mmp', 'district'],
      ];
      for (const [party, candidateId, opponentId, thirdMode, houseRule, electoralRule] of fixtures) {
        const campaignId = 'build35-full-' + party;
        let game = engine.confirmBuild35Staffing(make({ campaignId, party, candidateId, opponentId, thirdMode, houseRule, electoralRule }), ids);
        const closeDecisionCards = (input) => {
          let next = input;
          for (let count = 0; count < 8; count += 1) {
            if (engine.decisionPending(next)) {
              const before = next;
              next = recordIncident(next, engine.applyChoice(next, next.currentEventData.choices[0]), { type: 'choice' });
              assert.notEqual(next, before);
            }
            const updated = engine.advanceDecisionEvent(next);
            if (updated === next) break;
            next = updated;
          }
          return next;
        };
        while (!game.finished) {
          game = closeDecisionCards(game);
          for (let i = 0; i < engine.ACTIONS_PER_WEEK; i += 1) {
            const abbr = ['PA', 'WI', 'MI', 'GA', 'NC', 'AZ', 'NV'][i];
            const actionId = i === 3 ? 'fundraise' : 'visit';
            const after = engine.applyAction(game, actionId, abbr);
            game = closeDecisionCards(recordIncident(game, after, { type: 'action', actionId, abbr }));
          }
          assert.ok(Number.isFinite(game.funds) && game.funds >= 0);
          const rival = recordIncident(game, engine.opponentTurn(game), { type: 'opponent' });
          assert.ok(rival.lastOpponent?.forecastPlan);
          game = engine.advanceWeek(rival);
        }
        const election = engine.resultSnapshot(game);
        assert.equal(election.rows.length, 51);
        assert.ok(election.rows.every((row) => Number.isFinite(row.margin)));
        assert.equal(engine.saveGame(game), true);
        const packedSize = storage.get(engine.STORAGE_KEY).length;
        assert.ok(packedSize < 2500000, 'save fits safely within localStorage quota');
        assert.equal(engine.loadGame().finished, true);
        console.log(party + ' ' + houseRule + '/' + electoralRule + ': ' + game.week + ' weeks to election night, ' +
          game.history.length + ' log entries, ' + packedSize + ' stored characters (' + JSON.stringify(game).length + ' raw).');
      }
    }
  } finally {
    Math.random = originalRandom;
  }
} finally {
  await server.close();
}
