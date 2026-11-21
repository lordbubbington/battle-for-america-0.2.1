import test from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTY_START_RULES, startingNationalEnvironment, clampStartingNationalEnvironment, shouldApplyStartingEnvironment } from '../../src/lib/newGameProfiles.js';

test('difficulty target table carries requested defaults, caps, funds and scoring', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(DIFFICULTY_START_RULES).map(([id, p]) => [id, [p.defaultPlayerMargin, p.favorableCap, p.fundsM, p.scoreMul]])), {
    cupcake: [10, null, 800, 0.01], easy: [4, 7, 300, 0.5], medium: [0, 1, 250, 1],
    hard: [-4, -3, 250, 2.5], brutal: [-8, -8, 250, 7.5], nightmare: [-20, -15, 250, 20],
  });
});

test('major-party defaults mirror correctly between D-minus-R and player-relative margins', () => {
  for (const [difficultyId, profile] of Object.entries(DIFFICULTY_START_RULES)) {
    const dem = startingNationalEnvironment({ difficultyId, playerParty: 'dem' });
    const rep = startingNationalEnvironment({ difficultyId, playerParty: 'rep' });
    assert.equal(dem.nationalGeneric, profile.defaultPlayerMargin, `${difficultyId} Democrat`);
    assert.equal(rep.nationalGeneric, -profile.defaultPlayerMargin, `${difficultyId} Republican`);
  }
});

test('favorable cap clamps toward the opponent only and preserves unfavorable custom values', () => {
  for (const [difficultyId, cap] of [['easy', 7], ['medium', 1], ['hard', -3], ['brutal', -8], ['nightmare', -15]]) {
    assert.equal(clampStartingNationalEnvironment({ difficultyId, playerParty: 'dem', nationalGeneric: cap + 5 }), cap);
    assert.equal(clampStartingNationalEnvironment({ difficultyId, playerParty: 'rep', nationalGeneric: -(cap + 5) }), -cap);
    assert.equal(clampStartingNationalEnvironment({ difficultyId, playerParty: 'dem', nationalGeneric: -25 }), -25);
    assert.equal(clampStartingNationalEnvironment({ difficultyId, playerParty: 'rep', nationalGeneric: 25 }), 25);
  }
  assert.equal(clampStartingNationalEnvironment({ difficultyId: 'cupcake', playerParty: 'dem', nationalGeneric: 25 }), 25);
});

test('third-party and Realistic environment behavior remains compatible; saved environments are not reset', () => {
  assert.equal(startingNationalEnvironment({ difficultyId: 'easy', playerParty: 'lib' }).nationalGeneric, 0);
  assert.equal(startingNationalEnvironment({ difficultyId: 'medium', playerParty: 'grn' }).nationalGeneric, 0);
  assert.equal(startingNationalEnvironment({ difficultyId: 'realistic', playerParty: 'rep' }).nationalGeneric, 9);
  assert.equal(shouldApplyStartingEnvironment({ isNewCampaign: false, hasSavedEnvironment: true }), false);
  assert.equal(shouldApplyStartingEnvironment({ isNewCampaign: true, hasSavedEnvironment: false }), true);
});
