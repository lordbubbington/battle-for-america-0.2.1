import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILD40_EVENTS } from '../../../src/data/build40EventCatalog.js';

test('compiled catalog has the reviewed 416 ID set and complete row citations', () => {
  assert.equal(BUILD40_EVENTS.length, 416);
  assert.equal(new Set(BUILD40_EVENTS.map((event) => event.id)).size, 416);
  for (const event of BUILD40_EVENTS) {
    assert.ok(event.source.document);
    assert.ok(event.source.tableRow >= 2);
    assert.ok(event.title && event.flavor && event.triggerText);
    assert.ok(event.choices.length === (event.style >= 8 && !event.mashup ? 2 : 3));
    for (const choice of event.choices) {
      assert.ok(choice.label && choice.sourceText !== undefined);
      assert.ok(choice.branches.length > 0);
      for (const branch of choice.branches) {
        assert.ok(branch.probability > 0 && branch.probability <= 1);
        for (const effect of branch.effects) {
          assert.ok(effect.source.document);
          assert.ok(effect.source.tableRow >= 2);
        }
      }
    }
  }
});

test('Ad That Moved the Number preserves the authored state, neighbor, odds, and cost package', () => {
  const event = BUILD40_EVENTS.find((row) => row.id === 'interrupt-021-ad-works');
  assert.ok(event);
  assert.equal(event.source.tableRow, 89);
  assert.deepEqual(event.choices.map((choice) => choice.scandalChance.probability), [0.5, 0.3, 0.05]);
  const effects = event.choices.map((choice) => choice.branches[0].effects);
  assert.deepEqual(effects.map((choiceEffects) => choiceEffects.find((effect) => effect.kind === 'persuasion').amount), [2.5, 2.5, 1]);
  assert.equal(effects[1].find((effect) => effect.kind === 'persuasion').target.scope, 'primary-and-neighbor');
  assert.ok(effects.every((choiceEffects) => !choiceEffects.some((effect) => effect.kind === 'cash')));
  assert.ok(effects.every((choiceEffects) => choiceEffects.find((effect) => effect.kind === 'persuasion').scalable));
});

test('independent group and faction clauses keep separate targets and cash scales', () => {
  const event = BUILD40_EVENTS.find((row) => row.id === 'signal_field_revolt');
  assert.ok(event);
  const effects = event.choices[0].branches[0].effects;
  assert.deepEqual(effects.map((effect) => [effect.kind, effect.target.scope, effect.target.selector]), [
    ['group', 'group', 'moderate'],
    ['faction', 'faction', 'activist'],
  ]);
  const cash = BUILD40_EVENTS.flatMap((row) => row.choices.flatMap((choice) => choice.branches.flatMap((branch) => branch.effects)))
    .find((effect) => effect.kind === 'cash');
  assert.ok(cash);
  assert.equal(cash.unit, 'millions');
  assert.equal(cash.scalable, true);
});

test('traditional Republican support and party activist faction use canonical selectors', () => {
  const effects = BUILD40_EVENTS.flatMap((event) => event.choices.flatMap((choice) => choice.branches.flatMap((branch) => branch.effects)));
  const traditional = effects.find((effect) => effect.sourceText.startsWith('Campaign support among traditional Republicans'));
  assert.ok(traditional);
  assert.deepEqual(traditional.target, { side: 'actor', scope: 'group', selector: 'traditional-republicans' });
  const partyActivists = effects.find((effect) => effect.sourceText.startsWith('Party activists’ faction approval'));
  assert.ok(partyActivists);
  assert.deepEqual(partyActivists.target, { side: 'actor', scope: 'faction', selector: 'party-activists' });
});

test('design odds and hidden tiers remain data and never enter preview copy', () => {
  const event = BUILD40_EVENTS.find((row) => row.choices.some((choice) => choice.designOdds.some((odds) => odds.includes('hidden tier'))));
  assert.ok(event);
  const choice = event.choices.find((row) => row.designOdds.some((odds) => odds.includes('hidden tier')));
  assert.ok(choice.designOdds.some((odds) => odds.includes('hidden tier')));
  assert.ok(!choice.preview.includes('%'));
  assert.ok(!choice.preview.toLowerCase().includes('hidden tier'));
});
