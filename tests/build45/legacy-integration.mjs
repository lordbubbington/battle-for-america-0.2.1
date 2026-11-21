// Preserved integration suite adapted to three staff and genuine mandatory candidate queues.
import { TRADITIONAL_STAFF_SELECTION_COUNT } from '../../src/data/traditionalStaffRoster.js';
import assert from 'node:assert/strict';
import { BUILD40_EVENTS } from '../../src/data/build40EventCatalog.js';
import { createSeededRandom } from '../../src/lib/seededRandom.js';
import { build40DecisionContext, build40EffectStates, resolveBuild40Roll } from '../../src/lib/build40DecisionRuntime.js';
import { build40DecisionEligibility, build40IncidentSources } from '../../src/lib/build40DecisionEligibility.js';
import { recordIncident } from '../../src/lib/incidentLedger.js';
import { recordCampaignStrategy } from '../../src/lib/campaignOperations.js';
import { spinStory } from '../../src/lib/news.js';
import { buildNight, nightAt } from '../../src/lib/night.js';
import * as engine from '../../src/lib/gameEngine.js';

const staff = ['field', 'pollster', 'communications', 'operations', 'policy', 'fundraising', 'base-liaison', 'social-media', 'media'].slice(0, TRADITIONAL_STAFF_SELECTION_COUNT);
const saved = new Map();
globalThis.localStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
const definitions = new Map(BUILD40_EVENTS.map((event) => [event.id, event]));
const create = (extra = {}) => {
  Math.random = createSeededRandom('build40-integrated');
  return engine.createGame({ party: 'dem', candidateId: 'harris', opponentId: 'abbott', runningMateId: 'ossoff',
    difficultyId: 'medium', nationalGeneric: 0, campaignId: 'build40-integrated', ...extra });
};
const close = (a, b, tolerance = 1e-6) => assert.ok(Math.abs(a - b) <= tolerance, a + ' versus ' + b);
const sum = (value) => Object.values(value).reduce((total, part) => total + part, 0);
const national = (rows) => Object.fromEntries([...new Set(rows.flatMap((row) => Object.keys(row.shares)))].map((id) => [id,
  rows.reduce((total, row) => total + (row.shares[id] || 0) * row.cast, 0) / rows.reduce((total, row) => total + row.cast, 0),
]));
const eligible = (game, id) => build40DecisionEligibility(game, definitions.get(id), { receipts: build40IncidentSources(game) });

let game = engine.confirmBuild35Staffing(create({ modeId: 'two-parties', openingFieldPlan: { PA: 2 } }), staff);
assert.equal(engine.groundLevel(game, 'PA'), 0);
assert.deepEqual(game.aiOps, {});
assert.equal(game.actionsLeft, 7);
assert.equal(game.currentEventId, null);
assert.equal(game.build40.fieldPlanCommitted, true);
assert.equal(engine.confirmBuild35Staffing(game, staff), game);
const opening = game;
game = engine.purchaseGroundGame(game, 'PA');
assert.equal(game.ops.PA, 1);
assert.equal(game.actionsLeft, opening.actionsLeft);
close(game.funds, opening.funds - engine.groundBuildCost(opening, 'PA'));
assert.equal(game.stateMods, opening.stateMods);
assert.equal(game.turnout, opening.turnout);
const shares = engine.snapshot(game).rows.find((row) => row.abbr === 'PA').shares;
const poll = engine.getDetailedPolling(game, 'PA', shares);
assert.equal(Object.values(poll.results).reduce((count, row) => count + row.count, 0), 600);
assert.deepEqual(engine.getDetailedPolling(game, 'PA', shares), poll);
assert.notDeepEqual(engine.getDetailedPolling(game, 'PA', { dem: 80, rep: 20 }), poll);
assert.deepEqual(engine.ACTIONS.map(({ id }) => id).sort(), ['fundraise', 'prep', 'shift', 'townhall', 'visit', 'volunteers']);
for (const id of ['state-poll', 'ops', 'promise', 'oppo']) assert.equal(engine.applyAction(game, id, 'PA'), game);
const multi = { ...game, actionsLeft: 0 };
const upgrades = { PA: 3, MI: 1 };
const quote = engine.quoteGroundGamePlan(multi, upgrades);
assert.ok(quote.ok, quote.errors);
assert.equal(quote.changedStates, 2);
assert.equal(quote.levelEntries.length, 3);
close(quote.cost, engine.groundBuildCost(multi, 'PA') * 2 + engine.groundBuildCost(multi, 'MI'));
assert.equal(engine.purchaseGroundGame(multi, { ...upgrades, MI: 2 }, quote.confirmationKey), multi);
const stale = { ...multi, funds: multi.funds - 1 };
assert.equal(engine.purchaseGroundGame(stale, upgrades, quote.confirmationKey), stale);
const poor = { ...multi, funds: quote.cost - 0.01 };
assert.equal(engine.quoteGroundGamePlan(poor, upgrades).ok, false);
assert.equal(engine.purchaseGroundGame(poor, upgrades, quote.confirmationKey), poor);
const finished = { ...multi, finished: true };
assert.equal(engine.purchaseGroundGame(finished, upgrades, quote.confirmationKey), finished);
const unstaffed = create();
assert.equal(engine.quoteGroundGamePlan(unstaffed, upgrades).ok, false);
const withDecision = engine.forceEvent({ ...multi, week: 1 }, 'endorsement');
assert.ok(engine.decisionPending(withDecision));
assert.equal(engine.quoteGroundGamePlan(withDecision, upgrades).ok, false);
assert.equal(engine.purchaseGroundGame(withDecision, upgrades, quote.confirmationKey), withDecision);
const regional = { ...multi, party: 'farmer-labor', build39: { ...multi.build39, scenario: { id: 'regional-parties' } } };
const inRegion = engine.quoteGroundGamePlan(regional, { MI: 2, WI: 1 });
assert.ok(inRegion.ok);
const restrictedPlan = { MI: 2, PA: 2 };
const restricted = engine.quoteGroundGamePlan(regional, restrictedPlan);
assert.equal(restricted.ok, false);
assert.equal(engine.purchaseGroundGame(regional, restrictedPlan, restricted.confirmationKey), regional);
const invalidPlan = { PA: 0, MI: 4 };
const invalid = engine.quoteGroundGamePlan(multi, invalidPlan);
assert.equal(invalid.ok, false);
assert.equal(engine.purchaseGroundGame(multi, invalidPlan, invalid.confirmationKey), multi);
assert.equal(engine.quoteGroundGamePlan(multi, { MI: Infinity }).ok, false);
const discountStaff = engine.confirmBuild35Staffing(create({ campaignId: 'build42-staff-8' }),
  [...staff.slice(0, -1), 'haunted-sign-blacksmith']);
assert.ok(discountStaff.staffing.nonTraditionalActiveIds.includes('haunted-sign-blacksmith'));
const discountPlan = { PA: 2, MI: 1 };
const discount = engine.quoteGroundGamePlan(discountStaff, discountPlan);
close(discount.cost, 9.54);
const discounted = engine.purchaseGroundGame(discountStaff, discountPlan, discount.confirmationKey);
assert.equal(discounted.staffContractEffectReceiptIds.length, (discountStaff.staffContractEffectReceiptIds || []).length + 1);
assert.equal(engine.purchaseGroundGame(discounted, discountPlan, discount.confirmationKey), discounted);
close(engine.quoteGroundGamePlan(discounted, { PA: 3 }).cost, 3.7);
game = engine.purchaseGroundGame(multi, upgrades, quote.confirmationKey);
assert.equal(game.ops.PA, 3);
assert.equal(game.ops.MI, 1);
close(game.funds, quote.remainingFunds);
close(engine.opsTotals(game).weekly - engine.opsTotals(multi).weekly, quote.addedWeeklyUpkeep);
assert.match(game.weekLog.at(-1), /Michigan to level 1.*Pennsylvania to level 3/);
assert.equal(engine.purchaseGroundGame(game, upgrades, quote.confirmationKey), game);
assert.equal(engine.purchaseGroundGame(game, 'PA'), game);
assert.equal(engine.purchaseGroundGame(game, { PA: 1 }, engine.quoteGroundGamePlan(game, { PA: 1 }).confirmationKey), game);
assert.equal(game.actionsLeft, 0);
assert.ok(engine.saveGame(game));
game = engine.loadGame();
assert.equal(Object.keys(game.statePollReceipts).length, 0);
assert.equal(game.ops.PA, 3);
assert.equal(game.ops.MI, 1);
game = { ...game, actionsLeft: 7 };

const adEvent = definitions.get('interrupt-021-ad-works');
assert.equal(eligible(game, adEvent.id), false);
game = { ...game, week: 3, currentEventId: null, currentEventData: null, outcome: null, eventSchedule: [] };
Math.random = () => 0.8;
const ad = engine.runAdBlitz(game, { abbr: 'TX', issueId: 'economy', kind: 'pro', typeId: 'tv' });
assert.notEqual(ad, game);
game = recordIncident(game, ad, { type: 'ad', abbrs: ['TX'], issueId: 'economy', kind: 'pro' });
assert.ok(eligible(game, adEvent.id), JSON.stringify(game.lastAd));
assert.equal(engine.forceEvent(game, '4p_lib_02'), game);
game = engine.forceEvent(game, adEvent.id);
assert.equal(game.currentEventId, adEvent.id);
assert.equal(game.currentEventData.context.stateId, 'TX');
assert.equal(game.currentEventData.choices.length, 3);
assert.ok(engine.saveGame(game));
const pending = engine.loadGame();
assert.deepEqual(pending.currentEventData.context, game.currentEventData.context);
const chosen = engine.applyChoice(pending, pending.currentEventData.choices[1], adEvent.id);
assert.notEqual(chosen, pending);
assert.equal(chosen.funds, pending.funds);
assert.equal(chosen.build40.decisionReceipts.length, 1);
assert.equal(chosen.build40.decisionReceipts[0].effects.find((effect) => effect.kind === 'persuasion').states.length, 2);
assert.equal(engine.applyChoice(chosen, pending.currentEventData.choices[1], adEvent.id), chosen);

for (const stateId of ['AK', 'HI', 'DE']) {
  const context = build40DecisionContext(game, adEvent, { id: stateId, stateId });
  const branch = resolveBuild40Roll(game, context, adEvent.choices[0]);
  const states = build40EffectStates(branch.effects.find(({ kind }) => kind === 'persuasion').target, context);
  assert.equal(states.length, 2);
  assert.equal(states[0], stateId);
  if (stateId === 'AK') assert.equal(states[1], 'WA');
  if (stateId === 'HI') assert.equal(states[1], 'CA');
}

for (const modeId of ['two-parties', 'four-parties', 'six-party', 'regional-parties']) {
  for (const [electoralRule, houseRule, votingRuleId] of [['standard', 'standard', 'current'], ['proportional', 'pr', 'mandatory-voter-id'], ['district', 'mmp', 'same-day-registration']]) {
    const model = create({ modeId, electoralRule, houseRule, votingRuleId });
    const board = engine.snapshot(model);
    board.rows.forEach((row) => close(sum(row.shares), 100));
    const result = engine.resultSnapshot(model);
    assert.equal(sum(result.evBy), 538);
    assert.equal(sum(engine.houseSnapshot(model).seatsByParty), houseRule === 'mmp' ? 870 : 435);
    if (modeId === 'six-party') {
      const totals = Object.values(national(board.rows));
      assert.ok(Math.max(...totals) - Math.min(...totals) >= 7 && Math.max(...totals) - Math.min(...totals) <= 9.1);
    }
    if (modeId === 'regional-parties') {
      const totals = national(board.rows);
      const combined = totals['farmer-labor'] + totals.conservation + totals.localist;
      assert.ok(combined >= 10 && combined <= 15, [combined, electoralRule, JSON.stringify(totals)].join(' '));
      for (const row of board.rows) {
        const regional = ['farmer-labor', 'conservation', 'localist'].find((id) => row.shares[id] > 0);
        if (regional) assert.ok(row.shares[regional] >= Math.max(...Object.values(row.shares)) - 1e-6);
      }
    }
  }
}

for (const party of ['dem', 'rep']) {
  const state = create({ modeId: 'two-parties', party, candidateId: party === 'rep' ? 'abbott' : 'harris',
    opponentId: party === 'rep' ? 'harris' : 'abbott' });
  const week = { ...state, week: 1, funds: 1000 };
  for (const event of BUILD40_EVENTS.filter(({ bucket }) => bucket === 'Any candidate' || bucket === (party === 'dem' ? 'Democrats only' : 'Republicans only'))) {
    const forced = engine.forceEvent(week, event.id);
    assert.equal(forced.currentEventId, event.id, event.id + ' on ' + party);
    for (const choice of forced.currentEventData.choices) {
      assert.equal(choice.unavailable, null, event.id + ':' + choice.id);
      assert.notEqual(engine.applyChoice(forced, choice, event.id), forced, event.id + ':' + choice.id);
    }
  }
}

const originalFour = create({ thirdMode: 'surge' });
const revisedFour = create({ modeId: 'four-parties' });
const originalRows = engine.snapshot(originalFour).rows;
const revisedRows = engine.snapshot(revisedFour).rows;
for (let i = 0; i < originalRows.length; i += 1) {
  const baseline = originalRows[i].shares;
  const revised = revisedRows[i].shares;
  const dem = Math.min(5, baseline.dem);
  const rep = Math.min(5, baseline.rep);
  close(revised.dem, baseline.dem - dem);
  close(revised.rep, baseline.rep - rep);
  close(revised.lib, baseline.lib + dem);
  close(revised.grn, baseline.grn + rep);
}

const debateGame = { ...engine.confirmBuild35Staffing(create({ modeId: 'two-parties' }), staff),
  week: 6, eventSchedule: [], debate: { id: 'debate2', step: 1, picks: [], done: false }, currentEventData: null };
const debate = engine.debateDefinition(debateGame);
assert.equal(debate.questions[1].answers.length, 3);
const afterAnswer = engine.answerDebate(debateGame, debate.questions[1].answers[0]);
assert.equal(afterAnswer.debate.step, 2);
assert.ok(eligible(afterAnswer, 'interrupt-002-answer-receipts'));
assert.equal(eligible(debateGame, 'interrupt-002-answer-receipts'), false);

const legacy = create({ scenarioId: 'favorite-sons-daughters', party: 'favorite-me', candidateId: 'favorite-me' });
const retired = { ...legacy, currentEventId: '4p_lib_02', currentEventData: { id: '4p_lib_02' },
  eventScheduleWeek: 2, week: 2, eventScheduleIndex: 0, eventSchedule: [{ id: '4p_lib_02', status: 'dispatched', afterActions: 0 }] };
delete retired.build40;
saved.clear();
saved.set('election2028.save.v39', JSON.stringify(retired));
const migrated = engine.loadGame();
assert.equal(migrated.currentEventId, null);
assert.equal(migrated.build40.modeId, 'favorite-sons-daughters');
assert.equal(migrated.eventScheduleIndex, 0);
assert.equal(migrated.funds, legacy.funds);
assert.equal(migrated.candidateId, 'favorite-me');

const oldSuccession = { ...create({ party: 'rep', candidateId: 'vance', opponentId: 'harris' }), week: 2, funds: 1000,
  currentEventId: 'vance_succession_handoff', currentEventData: { id: 'vance_succession_handoff', title: 'Legacy title' }, vanceSuccessionDeliveredWeek: 2 };
delete oldSuccession.build40;
saved.clear();
saved.set('election2028.save.v38', JSON.stringify(oldSuccession));
const restoredSuccession = engine.loadGame();
assert.equal(restoredSuccession.currentEventData.title, definitions.get(oldSuccession.currentEventId).title);
assert.equal(engine.applyChoice(restoredSuccession, { id: 'retired-choice' }), restoredSuccession);
assert.equal(engine.applyChoice(restoredSuccession, restoredSuccession.currentEventData.choices[0]).vanceSuccessionPart, 1);

const chainCases = [];
for (const event of BUILD40_EVENTS.filter((entry) => entry.id.startsWith('derived_'))) {
  const aliases = [...event.triggerText.matchAll(/“([^”]+)”/g)].map((match) => match[1]);
  const fourParty = event.triggerText.includes('Four Parties mode.');
  let source = { ...create({ modeId: fourParty ? 'four-parties' : 'two-parties' }), week: 4, funds: 1000 };
  assert.equal(eligible(source, event.id), false);
  if (fourParty) {
    const { FOUR_PARTY_NEWS_EVENTS } = await import('../../src/data/fourPartyNews.js');
    const story = FOUR_PARTY_NEWS_EVENTS.find(({ title }) => aliases.includes(title));
    assert.ok(story, event.id);
    source = { ...source, natNews: story.id, natNewsSeen: false, fourPartyNationalCard: {
      id: story.id, headline: story.title, body: story.text, fourPartyFavor: { party: story.newsFavor[0], points: 0 },
    } };
    source = engine.acknowledgeCampaignNews(source);
  } else {
    const starter = BUILD40_EVENTS.find((entry) => (event.id === 'derived_housing_permit_count' && entry.id === 'm2_housing') || aliases.includes(entry.title)
      || entry.designNotes?.some((note) => aliases.includes(note.replace(/^Previous title\. /, ''))));
    assert.ok(starter, event.id);
    if (starter.bucket === 'Republicans only') source = { ...create({ modeId: 'two-parties', party: 'rep', candidateId: 'abbott', opponentId: 'harris' }), week: 4, funds: 1000 };
    source = engine.forceEvent(source, starter.id);
    assert.equal(source.currentEventId, starter.id);
    source = engine.applyChoice(source, source.currentEventData.choices.find((option) => !option.unavailable));
  }
  assert.equal(eligible(source, event.id), false);
  const due = { ...source, week: 5, currentEventId: null, currentEventData: null, outcome: null };
  const incident = eligible(due, event.id);
  assert.ok(incident, event.id);
  const display = engine.forceEvent(due, event.id);
  assert.equal(display.currentEventId, event.id);
  assert.ok(engine.saveGame(display));
  const reloaded = engine.loadGame();
  assert.equal(reloaded.currentEventData.sourceReceiptId, incident.id);
  assert.notEqual(engine.applyChoice(reloaded, reloaded.currentEventData.choices.find((choice) => !choice.unavailable)), reloaded);
  chainCases.push(event.id);
}
assert.equal(chainCases.length, 26);

let succession = { ...create({ modeId: 'four-parties', party: 'rep', candidateId: 'vance', opponentId: 'harris' }), funds: 1000 };
const chapters = ['handoff', 'address', 'cabinet', 'pushback', 'coalition'];
for (const [index, chapter] of chapters.entries()) {
  const eventId = 'vance_succession_' + chapter;
  succession = { ...succession, week: index + 1, currentEventId: null, currentEventData: null, outcome: null };
  const dispatched = engine.forceEvent(succession, eventId);
  assert.equal(dispatched.currentEventId, eventId);
  succession = engine.applyChoice(dispatched, dispatched.currentEventData.choices[0]);
  assert.equal(succession.vanceSuccessionPart, index + 1);
  assert.equal(succession.sittingPresidentId, 'vance');
  assert.equal(engine.forceEvent(succession, 'vance_succession_' + chapters[index + 1]), succession);
}

let debateSchedule = engine.confirmBuild35Staffing(create({ modeId: 'two-parties' }), staff);
const completedVerdicts = [];
for (const debateId of ['debate1', 'debate2', 'debate3']) {
  debateSchedule = { ...debateSchedule, week: ({ debate1: 3, debate2: 7, debate3: 11 })[debateId],
    currentEventData: null, currentEventId: null, outcome: null, debatePrep: 3,
    debate: { id: debateId, step: 0, picks: [], done: false, verdict: null } };
  while (!debateSchedule.debate.done) {
    const q = engine.debateDefinition(debateSchedule).questions[debateSchedule.debate.step];
    const choice = q.answers.filter((entry) => !entry.unavailable).at(-1);
    const next = engine.answerDebate(debateSchedule, choice);
    assert.notEqual(next, debateSchedule);
    debateSchedule = next;
  }
  completedVerdicts.push(debateSchedule.debate.verdict);
}
assert.deepEqual(debateSchedule.build40.completedDebateIds, ['debate1', 'debate2', 'debate3']);

const clearCard = (value) => ({ ...value, currentEventId: null, currentEventData: null, outcome: null, eventSchedule: [] });
const rareCases = new Set();
const recordAction = (before, after, context) => recordCampaignStrategy(before, recordIncident(before, after, context), context);
const expectSource = (value, id, stateId = null) => {
  const receipt = eligible(value, id);
  assert.ok(receipt, id);
  if (stateId) assert.equal(receipt.stateId, stateId, id);
  const dispatched = engine.forceEvent(clearCard(value), id);
  assert.equal(dispatched.currentEventId, id);
  assert.notEqual(engine.applyChoice(dispatched, dispatched.currentEventData.choices.find((choice) => !choice.unavailable)), dispatched);
  rareCases.add(id);
  return receipt;
};

const prepared = clearCard({ ...engine.confirmBuild35Staffing(create({ modeId: 'two-parties' }), staff), week: 3, funds: 1000 });
const townhallContext = { type: 'townhall', abbr: 'PA' };
const townhall = engine.applyAction(prepared, 'townhall', 'PA', { score: 2, answers: [{
  issueId: 'economy', issue: 'Economy', question: 'When does the plan start?', response: 'After Congress passes it.', responseApproach: 'specific',
}] });
assert.equal(eligible(prepared, 'interrupt-015-press-pool-moment'), false);
expectSource(recordAction(prepared, townhall, townhallContext), 'interrupt-015-press-pool-moment', 'PA');
assert.ok(completedVerdicts.some(({ tier }) => ['win', 'edge'].includes(tier)), JSON.stringify(completedVerdicts));
expectSource(debateSchedule, 'interrupt-010-debate-verdict');
const closeLegacyWeek = (value) => {
  let closing = engine.prepareDecisionWeekClose(value);
  for (let count = 0; engine.decisionPending(closing); count++) {
    assert.ok(count < 20, 'mandatory queue drains before legacy weekly producer');
    const available = closing.currentEventData.choices.find(choice => !choice.unavailable);
    assert.ok(available);
    closing = engine.prepareDecisionWeekClose(engine.applyChoice(closing, available));
  }
  return engine.advanceWeek(closing);
};
expectSource(closeLegacyWeek({ ...debateSchedule, actionsLeft: 0, eventSchedule: [] }), 'fourth_debate');

let favorableRivalExchange = null;
for (let seed = 0; seed < 8 && !favorableRivalExchange; seed += 1) {
  let campaign = { ...prepared, build34CampaignId: 'rival-debate-' + seed };
  for (const id of ['debate1', 'debate2', 'debate3']) {
    campaign = { ...campaign, debate: { id, step: 0, picks: [], done: false, verdict: null } };
    while (!campaign.debate.done) {
      const next = engine.answerDebate(campaign, engine.debateDefinition(campaign).questions[campaign.debate.step].answers[0]);
      assert.notEqual(next, campaign);
      campaign = next;
      if (eligible(campaign, 'interrupt-078-opponent-debate-snap')) favorableRivalExchange = campaign;
    }
  }
}
assert.ok(favorableRivalExchange);
expectSource(favorableRivalExchange, 'interrupt-078-opponent-debate-snap');

let donor = engine.forceEvent(prepared, 'donor_ultimatum');
donor = engine.applyChoice(donor, donor.currentEventData.choices[0]);
assert.equal(donor.campaignPerks.corruptionAd, true);
assert.equal(eligible(donor, 'bribe_ad_viral_followup'), false);
Math.random = () => 0.95;
const viral = recordAction(donor, engine.runAdBlitz(donor, { abbr: 'PA', issueId: 'corruption', kind: 'pro', typeId: 'tv' }),
  { type: 'ad', abbrs: ['PA'], issueId: 'corruption', kind: 'pro' });
expectSource(viral, 'bribe_ad_viral_followup', 'PA');

Math.random = () => 0.8;
const visit = recordAction(prepared, engine.applyAction(prepared, 'visit', 'PA'), { type: 'action', actionId: 'visit', abbr: 'PA' });
const storyId = visit.stories.find(({ abbr }) => abbr === 'PA').id;
const spinContext = { type: 'spin', storyId, abbr: 'PA' };
const spun = recordAction(visit, spinStory(visit, 'PA', storyId, 'amplify'), spinContext);
const bigStory = recordAction(spun, spinStory(spun, 'PA', storyId, 'amplify'), spinContext);
const nationalAirtime = engine.forceEvent(bigStory, 'signal_story_boom');
assert.equal(nationalAirtime.currentEventData.context.storyId, storyId);
assert.equal(eligible(engine.applyChoice(nationalAirtime, nationalAirtime.currentEventData.choices[1]), 'signal_story_backlash'), false);
const backlash = engine.applyChoice(nationalAirtime, nationalAirtime.currentEventData.choices[0]);
assert.equal(expectSource(backlash, 'signal_story_backlash').payload.storyId, storyId);

const attack = { abbr: 'PA', issueId: 'economy', kind: 'attack', typeId: 'digital' };
let overreach = null;
for (let seed = 0; seed < 24 && !overreach; seed += 1) {
  const ready = { ...spun, build34CampaignId: 'rapid-response-' + seed };
  Math.random = () => 0.01;
  const result = recordAction(ready, engine.runAdBlitz(ready, attack), { type: 'ad', abbrs: ['PA'], issueId: 'economy', kind: 'attack' });
  if (eligible(result, 'interrupt-026-rapid-response-overreach')) overreach = result;
}
assert.ok(overreach);
expectSource(overreach, 'interrupt-026-rapid-response-overreach', 'PA');

let earlyVote = clearCard({ ...engine.confirmBuild35Staffing(create({ modeId: 'two-parties' }), staff),
  ops: { PA: 3 }, week: 11, funds: 1000 });
for (let i = 0; i < 7; i += 1) earlyVote = recordAction(earlyVote, engine.applyAction(earlyVote, 'volunteers', 'PA'), { type: 'action', actionId: 'volunteers', abbr: 'PA' });
assert.equal(eligible(earlyVote, 'interrupt-039-early-vote-spike'), false);
Math.random = createSeededRandom('early-vote-checkpoint');
earlyVote = closeLegacyWeek({ ...earlyVote, actionsLeft: 0 });
assert.ok(earlyVote.earlyBallotLedger.batches.some(({ stateId }) => stateId === 'PA'));
assert.ok(eligible(earlyVote, 'interrupt-039-early-vote-spike'), JSON.stringify({ week: earlyVote.week, actions: earlyVote.strategyProfile?.stateActions, batch: earlyVote.earlyBallotLedger.batches.find(({stateId}) => stateId === 'PA'), reports: earlyVote.incidentLedger.filter((receipt) => receipt.payload.kind === 'early-vote').map(({stateId, payload}) => [stateId, payload]), ops: earlyVote.ops.PA }));
expectSource(earlyVote, 'interrupt-039-early-vote-spike', 'PA');

let corrected = null;
let correctionCandidates = 0;
for (let seed = 0; seed < 4 && !corrected; seed += 1) {
  Math.random = () => 0.101 + 0.022 * seed;
  const turn = recordIncident(prepared, engine.opponentTurn(prepared), { type: 'opponent' });
  assert.equal(eligible(turn, 'interrupt-073-opponent-misstatement'), false);
  if (!turn.lastOpponent.rivalNewsIncident?.correction) continue;
  correctionCandidates += 1;
  const published = engine.advanceWeek({ ...turn, natNews: null, actionsLeft: 0 });
  if (eligible(published, 'interrupt-073-opponent-misstatement')) corrected = published;
}
assert.ok(corrected, 'Correction candidates ' + correctionCandidates);
assert.match(expectSource(corrected, 'interrupt-073-opponent-misstatement').recap, /Recorded claim.+Correction/);
let repeated = null;
const briefed = clearCard(engine.acknowledgeCampaignNews(corrected));
assert.equal(eligible(briefed, 'interrupt-077-surrogate-misinformation'), false);
for (let seed = 0; seed < 100 && !repeated; seed += 1) {
  const campaign = { ...briefed, week: briefed.week + seed % 5, build34CampaignId: 'repeat-rival-claim-' + seed };
  Math.random = createSeededRandom(campaign.build34CampaignId);
  const turn = recordIncident(campaign, engine.opponentTurn(campaign), { type: 'opponent' });
  if (eligible(turn, 'interrupt-077-surrogate-misinformation')) repeated = turn;
}
assert.ok(repeated);
assert.match(expectSource(repeated, 'interrupt-077-surrogate-misinformation').recap, /Previous correction/);
console.log('Rare producer fixtures', JSON.stringify([...rareCases]));

const plan = buildNight(create({ modeId: 'two-parties' }));
const early = nightAt(plan, 0);
for (const row of early.rows) {
  assert.equal(row.countedVotes, 0);
  assert.equal(row.evAwards, null);
}
const final = nightAt(plan, plan.end);
assert.equal(sum(final.evBy), 538);
for (const row of [...final.rows, ...final.senate.races, ...final.gov.races]) {
  assert.equal(sum(row.votes), row.countedVotes);
  close(sum(row.shares), 100);
}
console.log('Build 40 integration checks passed: field and poll, receipt-backed Ad Works and save/resume, island targeting, 12 mode/rule fixtures, all 26 authored chains, 5 succession parts, 9 debate questions, legacy migration, and partial/final result visibility.');
