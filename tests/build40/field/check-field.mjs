import assert from 'node:assert/strict';
import * as field from '../../../src/lib/build40Field.js';

{
  const game = {
    build34CampaignId: 'field-fixture', party: 'dem', funds: 1000, actionsLeft: 3, week: 4,
    ops: {}, aiOps: { rep: { TX: 1 } }, aiFunds: { rep: 200 },
    groundGameAccumulatedByState: { TX: 0.15 }, groundGameResolvedWeeks: ['1', '2', '3'],
    stateMods: { TX: 1.25 }, demographicMods: { TX: { union: 0.5 } }, turnout: { TX: 1.5 },
  };

  const emptyQuote = field.quoteOpeningFieldPlan({ game, plan: {} });
  assert.equal(emptyQuote.ok, true, 'empty optional plan is valid');
  assert.equal(emptyQuote.cost, 0, 'empty plan costs nothing');
  assert.equal(field.applyOpeningFieldPlan({ game, plan: {} }).committed, false, 'empty plan does not write');

  const maxPlan = Object.fromEntries(['TX', 'CA'].map((abbr) => [abbr, 3]));
  const maxQuote = field.quoteOpeningFieldPlan({ game, plan: maxPlan });
  assert.equal(maxQuote.ok, true, 'maximum levels in selected states fit high starting funds');
  assert.equal(maxQuote.levelEntries.length, 6, 'three levels are priced per selected state');
  assert.ok(maxQuote.upkeep > 0, 'weekly upkeep is quoted');
  const committed = field.applyOpeningFieldPlan({ game, plan: maxPlan });
  assert.equal(committed.ok, true, 'valid plan commits');
  assert.equal(committed.game.ops.TX, 3, 'Texas reaches the requested level');
  assert.equal(committed.game.ops.CA, 3, 'California reaches the requested level');
  assert.equal(Object.keys(committed.game.ops).length, 2, 'zero-level states do not create operations');
  assert.equal(committed.game.funds, maxQuote.remainingFunds, 'setup debit matches quoted funds');
  assert.deepEqual(game.ops, {}, 'source game remains untouched');
  assert.deepEqual(committed.game.groundGameResolvedWeeks, game.groundGameResolvedWeeks, 'existing accrual history is retained');
  assert.equal(field.quoteOpeningFieldPlan({ game: { ...game, funds: 1 }, plan: { TX: 3 } }).ok, false, 'insufficient funds reject the whole plan');
  assert.equal(field.quoteOpeningFieldPlan({ game, plan: { XX: 1 } }).ok, false, 'unknown states reject the whole plan');
  assert.equal(field.quoteOpeningFieldPlan({ game, plan: { TX: 4 } }).ok, false, 'levels above cap reject');
  const rivalQuote = field.quoteOpeningFieldPlan({ game, party: 'rep', plan: { TX: 2 } });
  assert.equal(rivalQuote.budget, 200, 'rival plan uses its own funds');
  assert.equal(rivalQuote.plan.TX, 2, 'rival existing operations are respected');

  const shares = { dem: 49.4, rep: 45.1, lib: 3.7, grn: 1.8 };
  const reportA = field.generateStatePollReport({ campaignId: 'field-fixture', week: 4, stateId: 'TX', shares });
  const reportB = field.generateStatePollReport({ campaignId: 'field-fixture', week: 4, stateId: 'TX', shares });
  assert.deepEqual(reportA, reportB, 'same campaign/week/state snapshot produces identical seeded sample');
  assert.equal(Object.values(reportA.results).reduce((sum, result) => sum + result.count, 0), 600, 'sample counts total exactly 600');
  assert.ok(Object.values(reportA.results).every((result) => result.marginOfError > 0 && result.marginOfError <= 4.1), '95% uncertainty is bounded by the expected approximate maximum');
  const poll = field.commissionStatePoll({ game, stateId: 'TX', shares });
  assert.equal(poll.ok, true, 'valid poll commissions');
  assert.equal(poll.game.funds, 998, 'poll costs exactly $2M');
  assert.equal(poll.game.actionsLeft, 2, 'poll consumes one action');
  assert.equal(poll.receipt.actionId, 'state-poll', 'canonical action ID is state-poll');
  assert.deepEqual(poll.game.stateMods, game.stateMods, 'poll does not change state persuasion');
  assert.deepEqual(poll.game.demographicMods, game.demographicMods, 'poll does not change group persuasion');
  assert.deepEqual(poll.game.turnout, game.turnout, 'poll does not change turnout');
  const duplicate = field.commissionStatePoll({ game: poll.game, stateId: 'TX', shares });
  assert.equal(duplicate.ok, false, 'same state cannot be polled twice in one week');
  assert.equal(duplicate.reason, 'duplicate', 'duplicate is reported explicitly');
  assert.equal(field.commissionStatePoll({ game: { ...game, funds: 1 }, stateId: 'TX', shares }).reason, 'insufficient-funds', 'poll rejects insufficient funds');
  assert.equal(field.commissionStatePoll({ game: { ...game, actionsLeft: 0 }, stateId: 'TX', shares }).reason, 'no-actions-left', 'poll rejects exhausted action budget');
  assert.equal(field.commissionStatePoll({ game, stateId: 'XX', shares }).reason, 'invalid-state', 'poll rejects invalid state');
  const resumed = JSON.parse(JSON.stringify(poll.game));
  assert.deepEqual(resumed.statePollReceipts[poll.receipt.id].report, poll.report, 'saved report survives a save-shaped round trip');
  const nextWeek = field.commissionStatePoll({ game: { ...poll.game, week: 5 }, stateId: 'TX', shares });
  assert.equal(nextWeek.ok, true, 'a new week gets a distinct poll receipt');
  console.log('Build 40 field fixtures passed: empty/max plan, caps and invalid state, insufficient plan funds, atomic debit, rival budget, operation accrual preservation, seeded 600 sample and uncertainty, $2M/one-action poll, duplicate and blocked attempts, unchanged persuasion/turnout, save-shaped receipt retention, next-week retry.');
}
