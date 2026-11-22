import assert from 'node:assert/strict';
import { DEMOCRATS, REPUBLICANS, CANDIDATE_BY_ID } from '@/data/candidates';
import { CANDIDATE_RATINGS } from '@/data/candidateRatings';
import { STATE_BY_ABBR, BASE_LEANS } from '@/data/states';
import { validateModBundle } from '@/lib/modSchema';
import {
  applyModBundles,
  buildExampleModBundle,
  checkSaveModCompatibility,
  loadAndApplyMods,
  resetAllModsToBase,
  importBrowserModBundle,
  removeBrowserMod,
} from '@/lib/modRegistry';
import { createGame } from '@/lib/gameEngine';

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem: (k, v) => storage.set(k, v),
  removeItem: (k) => storage.delete(k),
};

// 1. Capture baseline before mods
const baseDemCount = DEMOCRATS.length;
const baseRepCount = REPUBLICANS.length;
const baseCOLean = BASE_LEANS.CO;
const baseHarrisNat = CANDIDATE_BY_ID.harris.nat;

// 2. Schema validation catches bad inputs and quarantines safely
const badMod = {
  folderName: 'bad-mod',
  manifest: { id: 'Bad ID!', name: '', version: '' },
  candidates: {
    add: [{ id: 'x', name: '', party: 'invalid', nat: 99, portrait: '../secret.png' }],
  },
  ratings: { harris: { debate: 99 } },
  states: { patch: { ZZ: { lean: 200 } } },
};
const badCheck = validateModBundle(badMod);
assert.equal(badCheck.valid, false, 'Invalid mod fails validation');
assert.ok(badCheck.errors.length >= 6, `Expected >=6 validation errors, got ${badCheck.errors.length}`);

// 3. Valid example mod passes validation & applies cleanly
const example = buildExampleModBundle();
example.candidates.add[0].portrait = 'assets/portraits/reyes.png';
example.candidates.patch = { harris: { nat: -1.0 } };
assert.equal(validateModBundle(example).valid, true, 'Example mod passes validation');

const res = applyModBundles([badMod, example]);
assert.equal(res.activeDescriptors.length, 1, 'Only valid mod activated; bad mod quarantined');
assert.equal(res.activeDescriptors[0].id, 'example-balance-mod');
assert.equal(DEMOCRATS.length, baseDemCount + 1, 'Custom DEM candidate added');
assert.equal(REPUBLICANS.length, baseRepCount, 'REP roster unchanged');
assert.equal(CANDIDATE_BY_ID['mod-wildcard-dem'].portrait, 'bfa-mod://example-balance-mod/assets/portraits/reyes.png');
assert.equal(CANDIDATE_BY_ID['mod-wildcard-dem'].ratings.rally, 14);
assert.equal(CANDIDATE_RATINGS['mod-wildcard-dem'].speech, 13);
assert.equal(CANDIDATE_BY_ID.harris.nat, -1.0, 'Existing candidate patched');
assert.equal(STATE_BY_ABBR.CO.lean, 13.0, 'State lean patched');
assert.equal(BASE_LEANS.CO, 13.0, 'BASE_LEANS rebuilt from patched state');

// 4. Browser persistence + createGame + save mod compatibility check
await importBrowserModBundle(example);
const g = createGame({
  modeId: 'two-parties',
  party: 'dem',
  candidateId: 'mod-wildcard-dem',
  opponentId: 'rubio',
  difficultyId: 'medium',
  nationalGeneric: 0,
  campaignId: 'mod-test-1',
});
assert.equal(g.candidateId, 'mod-wildcard-dem', 'Game starts with modded candidate');
assert.equal(g.activeMods.length, 1, 'Game stamps activeMods metadata');
assert.equal(g.activeMods[0].id, 'example-balance-mod');
assert.equal(checkSaveModCompatibility(g).compatible, true, 'Save compatible while mod active');

// Disable/remove mod and verify clean base restoration + compatibility warning
await removeBrowserMod('example-balance-mod');
await loadAndApplyMods();
assert.equal(DEMOCRATS.length, baseDemCount, 'Base DEM count restored');
assert.equal(CANDIDATE_BY_ID['mod-wildcard-dem'], undefined, 'Modded candidate removed cleanly');
assert.equal(CANDIDATE_BY_ID.harris.nat, baseHarrisNat, 'Patched candidate restored to base');
assert.equal(BASE_LEANS.CO, baseCOLean, 'Patched state lean restored to base');
const compatAfter = checkSaveModCompatibility(g);
assert.equal(compatAfter.compatible, false, 'Save flags missing mod after disabling');
assert.equal(compatAfter.missing[0].id, 'example-balance-mod');

resetAllModsToBase();
console.log('MODDING_PHASE1_TEST_PASS: schema validation, quarantine, add/patch/restore, bfa-mod:// portrait, createGame activeMods, and save compatibility verified.');
