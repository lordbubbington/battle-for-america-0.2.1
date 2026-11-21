import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILD39_CANDIDATES,
  BUILD39_VP_EXCLUDED_NAMES,
} from '../../../src/data/build39Candidates.js';
import {
  BUILD39_FUNDS_ANCHORS,
  candidateOpeningBonus,
  candidateStartingFunds,
  isBuild39VpEligible,
} from '../../../src/lib/build39Candidates.js';

test('candidate records cover the intended pools, home states and named bonuses', () => {
  assert.deepEqual(BUILD39_CANDIDATES.map(({ id, party, stateAbbr }) => [id, party, stateAbbr]), [
    ['massie', 'lib', 'KY'],
    ['rand-paul', 'lib', 'KY'],
    ['bernie-sanders', 'grn', 'VT'],
  ]);
  for (const id of ['massie', 'rand-paul']) {
    assert.deepEqual(candidateOpeningBonus(id, 'KY'), { nat: 5, state: 5, region: {}, regionPoints: 0 });
    assert.equal(candidateOpeningBonus(id, 'CA').state, 0);
  }
  assert.deepEqual(candidateOpeningBonus('bernie-sanders', 'VT'), { nat: 5, state: 0, region: { northeast: 5 }, regionPoints: 5 });
  assert.deepEqual(BUILD39_VP_EXCLUDED_NAMES, ['Ronald Reagan', 'Franklin D. Roosevelt']);
});

test('corruption funding anchors and interpolation are bounded, monotonic, and stable', () => {
  const expectedMultipliers = [2 / 3, 1, 2];
  BUILD39_FUNDS_ANCHORS.forEach(({ corruption }, index) => {
    assert.equal(candidateStartingFunds(90, corruption), Math.round(90 * expectedMultipliers[index] * 10) / 10);
  });
  let previous = 0;
  for (let rating = 1; rating <= 20; rating++) {
    const funds = candidateStartingFunds(90, rating);
    assert.ok(funds >= previous);
    previous = funds;
  }
  assert.equal(candidateStartingFunds(90, 1), 60);
  assert.equal(candidateStartingFunds(90, 10), 90);
  assert.equal(candidateStartingFunds(90, 20), 180);
  assert.equal(candidateStartingFunds(90, 20.2), candidateStartingFunds(90, 20));
});

test('Reagan and Roosevelt are ineligible as running mates', () => {
  assert.equal(isBuild39VpEligible('reagan'), false);
  assert.equal(isBuild39VpEligible('fdr'), false);
  assert.equal(isBuild39VpEligible('trump'), true);
});
