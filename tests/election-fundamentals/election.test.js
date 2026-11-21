import test from 'node:test';
import assert from 'node:assert/strict';
import { createEarlyBallotLedger, recordEarlyBallots, composeFinalStateTally, persuasionMapRow, planEarlyBallotSchedule, validateEarlyBallotLedger, assessTallyCompatibility } from '../../src/lib/earlyBallotLedger.js';
import { buildWeeklyEventCadence, weeklyEventCount } from '../../src/lib/eventCadence.js';
import { planWeeklyEventCadence, weeklyEventCountV2, nextEligibleDecision, preserveLegacyDecisionSchedule } from '../../src/lib/eventCadenceV2.js';

const close = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const allTurnOut = { dem: 1, rep: 1 };

test('one-third D+5 early and two-thirds R+1 election day gives D+1', () => {
  const original = createEarlyBallotLedger({ campaignId: 'fixture' });
  const result = recordEarlyBallots({ ledger: original, stateId: 'PA', week: 12, checkpoint: 'close', electorate: 100,
    eligibleBallotVolume: 100 / 3, support: { dem: 52.5, rep: 47.5 }, turnout: allTurnOut });
  assert.equal(original.batches.length, 0);
  const tally = composeFinalStateTally({ ledger: result.ledger, stateId: 'PA', electorate: 100, uncastSupport: { dem: 49.5, rep: 50.5 }, uncastTurnout: allTurnOut });
  close(tally.totalBallots, 100);
  close(tally.shares.dem, 50.5);
  close(tally.shares.rep, 49.5);
  const restored = JSON.parse(JSON.stringify(result.ledger));
  const retry = recordEarlyBallots({ ledger: restored, stateId: 'PA', week: 12, checkpoint: 'close', electorate: 100,
    eligibleBallotVolume: 100 / 3, support: { dem: 0, rep: 100 }, turnout: allTurnOut });
  assert.equal(retry.created, false);
  assert.deepEqual(retry.batch.votes, result.batch.votes);
  assert.equal(retry.ledger.batches.length, 1);
});

test('turnout is applied only to uncast voters and never exceeds electorate', () => {
  let ledger = createEarlyBallotLedger({ campaignId: 'turnout' });
  ledger = recordEarlyBallots({ ledger, stateId: 'AZ', week: 8, checkpoint: 'end', electorate: 100, eligibleBallotVolume: 40,
    support: { dem: 50, rep: 50 }, turnout: { dem: 1, rep: 0.5 } }).ledger;
  const tally = composeFinalStateTally({ ledger, stateId: 'AZ', electorate: 100, uncastSupport: { dem: 30, rep: 70 }, uncastTurnout: { dem: 0.25, rep: 0.75 } });
  close(tally.earlyBallots, 30);
  close(tally.electionDayVotes.dem, 5.25);
  close(tally.electionDayVotes.rep, 36.75);
  close(tally.totalBallots, 72);
  assert.ok(tally.totalBallots <= tally.electorate);
  assert.throws(() => recordEarlyBallots({ ledger, stateId: 'AZ', week: 9, checkpoint: 'end', electorate: 100,
    eligibleBallotVolume: 71, support: { dem: 50, rep: 50 }, turnout: allTurnOut }), /uncast electorate/);
  const invalid = JSON.parse(JSON.stringify(ledger));
  invalid.batches.push({ ...invalid.batches[0] });
  assert.equal(validateEarlyBallotLedger(invalid).valid, false);
  const changedVotes = JSON.parse(JSON.stringify(ledger));
  changedVotes.batches[0].votes.dem += 1;
  changedVotes.batches[0].votes.rep -= 1;
  assert.equal(validateEarlyBallotLedger(changedVotes).valid, false, 'the saved source snapshot must match its early ballot totals');
});

test('ranked and district allocations require recorded ballot detail', () => {
  assert.equal(assessTallyCompatibility({ stateId: 'PA', electoralRule: 'standard', thirdMode: 'fringe' }).status, 'state-vote-tally-only');
  assert.deepEqual(assessTallyCompatibility({ stateId: 'ME', electoralRule: 'standard', thirdMode: 'fringe' }).reasons, ['district-early-ballots-not-recorded']);
  assert.deepEqual(assessTallyCompatibility({ stateId: 'PA', electoralRule: 'proportional', thirdMode: 'surge' }).reasons, ['ranked-ballot-preferences-not-recorded']);
  assert.equal(assessTallyCompatibility({ stateId: 'PA', electoralRule: 'unrecognized' }).status, 'unavailable');
});

test('zero/all early votes, multiple parties, and zero turnout remain bounded', () => {
  const initial = createEarlyBallotLedger({ campaignId: 'multiparty' });
  const support = { dem: 40, rep: 30, lib: 20, grn: 10 };
  const full = { dem: 1, rep: 1, lib: 1, grn: 1 };
  const empty = composeFinalStateTally({ ledger: initial, stateId: 'ME', electorate: 200, uncastSupport: support, uncastTurnout: full });
  assert.deepEqual(empty.votes, { dem: 80, rep: 60, lib: 40, grn: 20 });
  const all = recordEarlyBallots({ ledger: initial, stateId: 'ME', week: 3, checkpoint: 'end', electorate: 200,
    eligibleBallotVolume: 200, support, turnout: full }).ledger;
  const final = composeFinalStateTally({ ledger: all, stateId: 'ME', electorate: 200,
    uncastSupport: { dem: 0, rep: 0, lib: 0, grn: 100 }, uncastTurnout: full });
  assert.deepEqual(final.votes, empty.votes);
  assert.equal(final.uncastElectorate, 0);
  const none = composeFinalStateTally({ ledger: initial, stateId: 'ME', electorate: 200, uncastSupport: support,
    uncastTurnout: { dem: 0, rep: 0, lib: 0, grn: 0 } });
  assert.equal(none.totalBallots, 0);
  assert.ok(Object.values(none.shares).every((v) => v === 0));
});

test('legacy start is future-only and the modeled schedule is explicit', () => {
  const ledger = createEarlyBallotLedger({ campaignId: 'legacy', eligibleFromWeek: 10 });
  assert.equal(ledger.batches.length, 0);
  const schedule = planEarlyBallotSchedule({ campaignId: 'legacy', stateId: 'PA', totalWeeks: 14, electorate: 100, eligibleFromWeek: 13 });
  assert.deepEqual(schedule.map((item) => item.week), [13]);
  assert.equal(schedule[0].assumption, 'modeled-game-schedule');
  assert.throws(() => recordEarlyBallots({ ledger, stateId: 'PA', week: 9, checkpoint: 'end', electorate: 100,
    eligibleBallotVolume: 10, support: { dem: 50, rep: 50 }, turnout: allTurnOut }), /checkpoint/);
});

test('map reads support rather than turnout-adjusted result shares', () => {
  const map = persuasionMapRow({ abbr: 'MI', support: { dem: 51, rep: 49 }, shares: { dem: 40, rep: 60 } });
  assert.equal(map.leader, 'dem');
  assert.equal(map.marginDMinusR, 2);
  assert.deepEqual(map.shares, { dem: 51, rep: 49 });
  assert.equal(persuasionMapRow({ abbr: 'MI', shares: { dem: 40, rep: 60 } }).status, 'unavailable');
});

test('cadence preserves saved schedules and never manufactures eligible events', () => {
  const args = { campaignId: 'schedule-fixture', week: 6, totalWeeks: 14, actionSlots: 7 };
  const legacy = buildWeeklyEventCadence(args);
  const saved = planWeeklyEventCadence({ ...args, savedSchedule: JSON.parse(JSON.stringify(legacy)) });
  assert.equal(saved.reused, true);
  assert.deepEqual(saved.schedule, legacy);
  const current = planWeeklyEventCadence(args).schedule;
  assert.deepEqual(planWeeklyEventCadence({ ...args, savedSchedule: JSON.parse(JSON.stringify(current)) }).schedule, current);
  assert.equal(weeklyEventCountV2({ ...args, week: 1 }), 0);
  assert.equal(weeklyEventCountV2({ ...args, week: 1, totalWeeks: 1 }), 0, 'a one-week campaign preserves the live first-week rule');
  assert.equal(weeklyEventCountV2({ ...args, week: 14 }), 5);
  assert.deepEqual(planWeeklyEventCadence({ ...args, week: 14 }).schedule.events.map((item) => item.releaseAfterActionCount), [0, 3, 4, 6, 7], 'final-week checkpoints follow the live dispatcher');
  assert.equal(nextEligibleDecision({ cadence: current, actionsCompleted: 7, eligibleQueue: [] }), null);
  const entry = { event: { id: 'real', choices: [{ label: 'respond' }] } };
  assert.equal(nextEligibleDecision({ cadence: current, actionsCompleted: 7, eligibleQueue: [entry] }).entry.event.id, 'real');
  assert.equal(nextEligibleDecision({ cadence: current, actionsCompleted: 7,
    shownSequences: current.events.map((event) => event.sequence), eligibleQueue: [entry] }), null);
  const engineSchedule = [{ id: 'old-card', event: { id: 'old-card' }, afterActions: 3 }];
  assert.deepEqual(preserveLegacyDecisionSchedule(engineSchedule), engineSchedule);
});

test('seeded nominal cadence moves toward ten extra slots per 14-week campaign', () => {
  let baseline = 0;
  let proposed = 0;
  const campaigns = 2000;
  for (let index = 0; index < campaigns; index += 1) {
    for (let week = 2; week < 14; week += 1) {
      const args = { campaignId: `cadence-${index}`, week, totalWeeks: 14, actionSlots: 7 };
      baseline += weeklyEventCount(args);
      proposed += weeklyEventCountV2(args);
    }
  }
  const difference = (proposed - baseline) / campaigns;
  assert.ok(difference > 8.8 && difference < 10.4, `nominal change was ${difference}`);
});
