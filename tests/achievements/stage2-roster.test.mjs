import assert from 'node:assert/strict';
import {
  ALL_CANDIDATES,
  CANDIDATE_BY_ID,
  byParty,
} from '../../src/data/candidates.js';
import { ALL_UNLOCKABLE_CANDIDATE_IDS } from '../../src/data/achievements.js';
import { emptyAchievementProfile } from '../../src/lib/achievements.js';
import { createGame, snapshot } from '../../src/lib/gameEngine.js';
import { leansForNational } from '../../src/data/states.js';

// 1. All 23 unlockable candidates exist, have valid tiers, and have zero em-dashes
assert.equal(ALL_UNLOCKABLE_CANDIDATE_IDS.length, 23);
const expectedTiers = {
  jfk: 6,
  teddy_roosevelt: 7,
  lbj: 7,
  ford: 4,
  fdr: 9,
  reagan: 9,
  george_washington: 10,
  lincoln: 10,
  clinton: 6,
  obama: 6,
  trump: 6,
  carter: 5,
  ghwb: 5,
  hamilton: 8,
  clay: 8,
  jefferson: 10,
  eugene_debs: 8,
  eisenhower: 8,
  nixon: 7,
  truman: 7,
  jq_adams: 6,
  coolidge: 7,
  la_follette: 7,
};

for (const id of ALL_UNLOCKABLE_CANDIDATE_IDS) {
  const c = CANDIDATE_BY_ID[id];
  assert.ok(c, `Missing unlockable candidate in CANDIDATE_BY_ID: ${id}`);
  assert.equal(c.internalTier, expectedTiers[id], `Tier mismatch for ${id}`);
  assert.ok(!c.bio.includes('—') && !c.bio.includes('–'), `Dash found in bio for ${id}`);
}

// Debs is Green, not Socialist
assert.equal(CANDIDATE_BY_ID.eugene_debs.party, 'grn');
assert.ok(!/socialist/i.test(CANDIDATE_BY_ID.eugene_debs.bio), 'Debs bio should identify him as Green, not Socialist');

// 2. Existing non-unlockable modern candidates have hidden internalTier in [1..5]
for (const c of ALL_CANDIDATES) {
  if (!ALL_UNLOCKABLE_CANDIDATE_IDS.includes(c.id)) {
    assert.ok(c.internalTier >= 1 && c.internalTier <= 5, `Modern candidate ${c.id} tier out of 1..5: ${c.internalTier}`);
  }
}

// 3. Roster gating: locked candidates are completely hidden from byParty()
const empty = emptyAchievementProfile();
for (const party of ['dem', 'rep', 'lib', 'grn']) {
  const visible = byParty(party, 'standard', { profile: empty });
  for (const lockedId of ALL_UNLOCKABLE_CANDIDATE_IDS) {
    assert.ok(!visible.some((c) => c.id === lockedId), `Locked candidate ${lockedId} leaked into byParty(${party})`);
  }
}

// Unlocking win_brutal reveals FDR (dem) and Reagan (rep)
const brutalProfile = { ...empty, unlockedIds: { win_brutal: '2026-11-23T00:00:00Z' } };
assert.ok(byParty('dem', 'standard', { profile: brutalProfile }).some((c) => c.id === 'fdr'));
assert.ok(byParty('rep', 'standard', { profile: brutalProfile }).some((c) => c.id === 'reagan'));

// Unlocking win_both_major reveals Eisenhower in BOTH dem and rep rosters
const bothProfile = { ...empty, unlockedIds: { win_both_major: '2026-11-23T00:00:00Z' } };
assert.ok(byParty('dem', 'standard', { profile: bothProfile }).some((c) => c.id === 'eisenhower'));
assert.ok(byParty('rep', 'standard', { profile: bothProfile }).some((c) => c.id === 'eisenhower'));

// 3b. Locked candidate cannot be instantiated in createGame (falls back to unlocked default)
const gLocked = createGame({
  party: 'lib',
  candidateId: 'george_washington',
  opponentId: 'shapiro',
  difficultyId: 'medium',
  leans: leansForNational(0),
  weighted: true,
  modeId: 'two-parties',
  nationalGeneric: 0,
  randomness: 0,
});
assert.notEqual(gLocked.candidateId, 'george_washington', 'Locked Washington must not be instantiated');

// Unlock win_nightmare and win_lib in mock localStorage for Washington & Jefferson tests
const store = {
  bfa_achievements_v1: JSON.stringify({
    version: 1,
    unlockedIds: {
      win_nightmare: '2026-11-23T00:00:00Z',
      win_lib: '2026-11-23T00:00:00Z',
    },
  }),
};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};

// 4. George Washington special rules (+30 all, +5 13 colonies, 100% WA & DC)
const gWash = createGame({
  party: 'lib',
  candidateId: 'george_washington',
  opponentId: 'shapiro',
  difficultyId: 'medium',
  leans: leansForNational(0),
  weighted: true,
  modeId: 'two-parties',
  nationalGeneric: 0,
  randomness: 0,
});
const snapWash = snapshot(gWash, 'poll');
const washByAbbr = Object.fromEntries(snapWash.rows.map((r) => [r.abbr, r]));
assert.equal(Math.round(washByAbbr.WA.shares.lib), 100, 'Washington must get 100% in WA');
assert.equal(Math.round(washByAbbr.DC.shares.lib), 100, 'Washington must get 100% in DC');
assert.ok(washByAbbr.OH.shares.lib >= 28, `Washington OH lib share should include +30 bonus, got ${washByAbbr.OH.shares.lib}`);
assert.ok(washByAbbr.VA.shares.lib > washByAbbr.OH.shares.lib + 3, `Washington VA (13 colonies) should beat OH by ~+5, got VA=${washByAbbr.VA.shares.lib}, OH=${washByAbbr.OH.shares.lib}`);

// 5. Thomas Jefferson special rules (+25 all, +10 13 colonies)
const gJeff = createGame({
  party: 'lib',
  candidateId: 'jefferson',
  opponentId: 'shapiro',
  difficultyId: 'medium',
  leans: leansForNational(0),
  weighted: true,
  modeId: 'two-parties',
  nationalGeneric: 0,
  randomness: 0,
});
const snapJeff = snapshot(gJeff, 'poll');
const jeffByAbbr = Object.fromEntries(snapJeff.rows.map((r) => [r.abbr, r]));
assert.ok(jeffByAbbr.OH.shares.lib >= 23, `Jefferson OH lib share should include +25 bonus, got ${jeffByAbbr.OH.shares.lib}`);
assert.ok(jeffByAbbr.VA.shares.lib > jeffByAbbr.OH.shares.lib + 7, `Jefferson VA (13 colonies) should beat OH by ~+10, got VA=${jeffByAbbr.VA.shares.lib}, OH=${jeffByAbbr.OH.shares.lib}`);

console.log('ALL STAGE 2 ROSTER & SPECIAL-RULE TESTS PASSED (23 unlockables, hidden tiers 1-10, Eisenhower dual-party, Washington & Jefferson mechanics).');
