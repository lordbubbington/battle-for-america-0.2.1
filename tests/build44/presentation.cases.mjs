import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';

register('../build40/field/alias-loader.mjs', import.meta.url);

const engine = await import('../../src/lib/gameEngine.js');
const { BUILD40_EVENTS } = await import('../../src/data/build40EventCatalog.js');
const fixtures = JSON.parse(await readFile(new URL('../../../fixtures/presentation-events.json', import.meta.url), 'utf8'));

const eventId = 'm2_infrastructure';
const bridge = BUILD40_EVENTS.find((event) => event.id === eventId);
const choiceId = 'choice-2';
const bridgeChoice = bridge.choices.find((choice) => choice.id === choiceId);

export function presentationCases() {
  assert.equal(bridge.style, 10);
  assert.deepEqual(bridgeChoice.branches.map((branch) => [branch.probability, Boolean(branch.hidden), branch.effects[0].amount]),
    [[0.5, false, 0.5], [0.45, false, 2.5], [0.05, true, 5]]);
  const bridgeCases = [
    ['ordinary', 0, 'PA', 'Pennsylvania', 0.5],
    ['large', 1, 'WI', 'Wisconsin', 2],
    ['rare', 2, 'GA', 'Georgia', 4],
  ].map(([name, branchIndex, state, stateName, amount]) => {
    const fixture = fixtures[name];
    assert.equal(fixture.branchIndex, branchIndex);
    assert.equal(fixture.game.currentEventId, eventId);
    assert.equal(fixture.event.context.stateId, state);
    assert.deepEqual(fixture.applied.map((effect) => [effect.amount, effect.states]), [[amount, [state]]]);
    return {
      name, save: fixture.game, label: bridgeChoice.label, choiceId, eventId, state, amount,
      fixed: 'Campaign persuasion +0.8 to +1.2 points · ' + stateName,
      visible: ['Large chance: Campaign persuasion +0.4 to +0.6 points · ' + stateName,
        'Large chance: Campaign persuasion +2 to +3 points · ' + stateName],
      actual: 'Campaign persuasion +' + amount + ' points · ' + stateName,
    };
  });
  const open = { ...fixtures.ordinary.game, currentEventData: null, currentEventId: null };
  const cost = engine.forceEvent(open, 'm2_outbreak');
  assert.equal(cost.currentEventId, 'm2_outbreak');
  return { engine, bridgeCases, cost, conditional: fixtures.conditional };
}
