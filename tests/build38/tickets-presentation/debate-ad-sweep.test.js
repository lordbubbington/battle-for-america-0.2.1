import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BUILD38_DEBATE_CHOICES } from '../../../src/data/build38DebateChoices.js';
import { debateChoiceEffects } from '../../../src/lib/build38DebateEffects.js';
import { adWorksChoice, adWorksPersuasion, uniformInteger } from '../../../src/lib/build38AdWorks.js';
import { resolveSweep } from '../../../src/lib/build38Sweep.js';

const fixtures = JSON.parse(fs.readFileSync(fileURLToPath(new URL('./fixtures/agent-c-evidence.json', import.meta.url)), 'utf8'));

test('ideological debate choices produce distinct faction outcomes for player and rival party contexts', () => {
  const left = BUILD38_DEBATE_CHOICES.debate1.q1[0];
  const moderate = BUILD38_DEBATE_CHOICES.debate1.q1[1];
  assert.notEqual(left.id, moderate.id);
  const leftDem = debateChoiceEffects({ debateId: 'debate1', questionId: 'q1', choiceId: left.id, party: 'dem' });
  const moderateDem = debateChoiceEffects({ debateId: 'debate1', questionId: 'q1', choiceId: moderate.id, party: 'dem' });
  const leftRep = debateChoiceEffects({ debateId: 'debate1', questionId: 'q1', choiceId: left.id, party: 'rep' });
  assert.equal(leftDem.status, 'ready');
  assert.notDeepEqual(leftDem.factionDeltas, moderateDem.factionDeltas);
  assert.notDeepEqual(leftDem.factionDeltas, leftRep.factionDeltas);
  assert.equal(debateChoiceEffects({ debateId: 'debate1', questionId: 'q1', choiceId: left.id, party: 'ind' }).status, 'unavailable');
});

test('debate faction deltas respect approval bounds', () => {
  const left = BUILD38_DEBATE_CHOICES.debate1.q1[0];
  const result = debateChoiceEffects({
    debateId: 'debate1', questionId: 'q1', choiceId: left.id, party: 'dem',
    factionStandings: { activists: 99, labor: 100, suburbs: 1, donors: 1 },
  });
  assert.deepEqual(result.factionDeltas, [
    { factionId: 'activists', approvalPoints: 1 },
    { factionId: 'suburbs', approvalPoints: -1 },
    { factionId: 'donors', approvalPoints: -1 },
  ]);
});

test('all three choices use the original ad state, including Alaska and Hawaii', () => {
  for (const state of ['TX', 'AK', 'HI']) {
    const source = fixtures.qualifyingAdReceipt;
    const sourceReceipt = { ...source, state, payload: { ...source.payload, states: [state], result: { ...source.payload.result, abbr: state } } };
    const choices = ['repeat-spot', 'adapt-neighbor', 'bank-win'].map((choiceId) => adWorksChoice({ choiceId, sourceReceipt }));
    assert.ok(choices.every((choice) => choice.status === 'ready' && choice.stateId === state));
    assert.deepEqual(choices.map((choice) => choice.costM), [2, 1, 0]);
    assert.deepEqual([adWorksPersuasion(choices[0]), adWorksPersuasion(choices[2])], [3, 1]);
  }
});

test('the random response gives each integer from −2 through +5 an equal interval', () => {
  const expected = [-2, -1, 0, 1, 2, 3, 4, 5];
  assert.deepEqual(expected.map((_, i) => uniformInteger(-2, 5, i / 8)), expected);
  assert.deepEqual(expected.map((_, i) => uniformInteger(-2, 5, (i + 1) / 8 - Number.EPSILON)), expected);
  const choice = adWorksChoice({ choiceId: 'adapt-neighbor', sourceReceipt: fixtures.qualifyingAdReceipt });
  assert.equal(adWorksPersuasion(choice, 'campaign-1'), adWorksPersuasion(choice, 'campaign-1'));
});

test('invalid and non-favorable advertisement receipts cannot create ad-work choices', () => {
  const invalid = { ...fixtures.qualifyingAdReceipt, payload: { ...fixtures.qualifyingAdReceipt.payload, result: { ...fixtures.qualifyingAdReceipt.payload.result, backfire: true } } };
  assert.equal(adWorksChoice({ choiceId: 'repeat-spot', sourceReceipt: invalid }).status, 'unavailable');
  assert.equal(adWorksChoice({ choiceId: 'repeat the spot', sourceReceipt: fixtures.qualifyingAdReceipt }).choiceId, 'repeat-spot');
});

test('sweep requests are authorized only for the 50,000 quick-outcomes command', () => {
  for (const fixture of fixtures.sweepCommands) {
    const result = resolveSweep(fixture);
    assert.equal(result.enabled, fixture.expectedEnabled, JSON.stringify(fixture));
  }
  assert.equal(resolveSweep({ commandId: 'quick-outcomes', draws: 49999, sweepRequested: true }).reason, 'requires-50000-draws');
  assert.equal(resolveSweep({ commandId: 'campaign-run', draws: 50000, sweepRequested: true }).reason, 'command-not-quick-outcomes');
});
