import assert from 'node:assert/strict';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_BY_ID,
  DIFFICULTY_CASCADE,
  ALL_UNLOCKABLE_CANDIDATE_IDS,
} from '../../src/data/achievements.js';
import {
  emptyAchievementProfile,
  evaluateCampaignAchievements,
  isCandidateUnlocked,
  mergeAchievementProfiles,
} from '../../src/lib/achievements.js';
import { createGame } from '../../src/lib/gameEngine.js';

// 1. Catalog integrity & Writing Style Guide compliance
assert.equal(ACHIEVEMENTS.length, 36, 'Expected exactly 36 achievements');
assert.equal(ALL_UNLOCKABLE_CANDIDATE_IDS.length, 23, 'Expected exactly 23 unlockable candidates');
assert.equal(ACHIEVEMENTS.filter((a) => a.hidden).length, 5, 'Expected exactly 5 hidden achievements');
assert.equal(ACHIEVEMENTS.filter((a) => a.unlockCandidateIds.length > 0).length, 19, 'Expected 19 unlock achievements');
assert.equal(ACHIEVEMENTS.filter((a) => a.unlockCandidateIds.length === 0).length, 17, 'Expected 17 no-unlock achievements');

const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
const steamIds = new Set(ACHIEVEMENTS.map((a) => a.steamApiName));
assert.equal(ids.size, 36, 'Duplicate achievement IDs found');
assert.equal(steamIds.size, 36, 'Duplicate Steam API names found');

for (const a of ACHIEVEMENTS) {
  assert.ok(!a.title.includes('—') && !a.description.includes('—'), `Em-dash found in ${a.id}`);
  assert.ok(!a.title.includes('–') && !a.description.includes('–'), `En-dash found in ${a.id}`);
  assert.ok(!/cascade|lower difficult|easier difficult/i.test(a.description), `Cascade leaked into UI description for ${a.id}`);
}

// 2. Silent Difficulty Cascade Matrix (Realistic stays standalone)
const baseOutcome = {
  playerWon: true,
  playerEv: 300,
  demEv: 300,
  repEv: 238,
  playerPopularMargin: 2.5,
  playerWonPopularVote: true,
  contingentHouseWin: false,
  stateWinners: {},
  stateMargins: {},
  houseMajorityParty: 'rep',
  senateMajorityParty: 'rep',
  houseNetGainForPlayer: 0,
  senateNetGainForPlayer: 0,
};

const cascadeChecks = [
  ['cupcake', ['win_cupcake']],
  ['easy', ['win_easy', 'win_cupcake']],
  ['medium', ['win_medium', 'win_easy', 'win_cupcake']],
  ['hard', ['win_hard', 'win_medium', 'win_easy', 'win_cupcake']],
  ['brutal', ['win_brutal', 'win_hard', 'win_medium', 'win_easy', 'win_cupcake']],
  ['nightmare', ['win_nightmare', 'win_brutal', 'win_hard', 'win_medium', 'win_easy', 'win_cupcake']],
  ['realistic', ['win_realistic']],
];

for (const [diff, expectedDiffAchs] of cascadeChecks) {
  assert.deepEqual([...DIFFICULTY_CASCADE[diff]], expectedDiffAchs);
  const res = evaluateCampaignAchievements(
    { party: 'dem', candidateId: 'shapiro', difficultyId: diff, modeId: 'two-parties', cheatsUsed: false, achievementStats: {} },
    baseOutcome,
    emptyAchievementProfile()
  );
  const gotDiff = res.newlyUnlocked.filter((a) => a.category === 'difficulty').map((a) => a.id).sort();
  assert.deepEqual(gotDiff, [...expectedDiffAchs].sort(), `Cascade mismatch for ${diff}`);
  if (diff !== 'realistic') {
    assert.ok(!gotDiff.includes('win_realistic'), `${diff} must NOT unlock win_realistic`);
  }
}

// Nightmare unlocks Washington, Lincoln, FDR, Reagan, LBJ, Ford, JFK, Teddy + Obama (win_dem)
const nightmareRes = evaluateCampaignAchievements(
  { party: 'dem', candidateId: 'shapiro', difficultyId: 'nightmare', modeId: 'two-parties', cheatsUsed: false, achievementStats: {} },
  baseOutcome,
  emptyAchievementProfile()
);
for (const cand of ['george_washington', 'lincoln', 'fdr', 'reagan', 'lbj', 'ford', 'jfk', 'teddy_roosevelt', 'obama']) {
  assert.ok(isCandidateUnlocked(cand, nightmareRes.nextProfile), `Expected ${cand} unlocked after Nightmare Dem win`);
}
assert.ok(!isCandidateUnlocked('clinton', nightmareRes.nextProfile), 'Clinton must stay locked until Realistic win');
assert.ok(!isCandidateUnlocked('nixon', nightmareRes.nextProfile), 'Nixon must stay locked until Cheats win');

// 3. Cheats Mode lockout + hidden Nixon exception
const cheatRes = evaluateCampaignAchievements(
  { party: 'dem', candidateId: 'shapiro', difficultyId: 'nightmare', modeId: 'two-parties', cheatsUsed: true, achievementStats: { cheatsUsed: true } },
  { ...baseOutcome, playerEv: 538 },
  emptyAchievementProfile()
);
assert.deepEqual(cheatRes.newlyUnlocked.map((a) => a.id), ['win_with_cheats']);
assert.deepEqual(cheatRes.newlyUnlockedCandidates, ['nixon']);
assert.equal(cheatRes.nextProfile.wonCandidateIds.length, 0, 'Cheat wins must not count toward candidate win totals');

// 4. Party progression chains (1 / 5 / 10 DEM & REP + Both Major)
let prof = emptyAchievementProfile();
const demRoster = ['shapiro', 'ossoff', 'newsom', 'aoc', 'harris', 'beshear', 'buttigieg', 'whitmer', 'klobuchar', 'booker'];
for (let i = 0; i < demRoster.length; i++) {
  const r = evaluateCampaignAchievements(
    { party: 'dem', candidateId: demRoster[i], difficultyId: 'cupcake', modeId: 'two-parties', cheatsUsed: false, achievementStats: {} },
    baseOutcome,
    prof
  );
  prof = r.nextProfile;
  if (i === 0) assert.ok(isCandidateUnlocked('obama', prof));
  if (i === 4) assert.ok(isCandidateUnlocked('carter', prof));
  if (i === 9) assert.ok(isCandidateUnlocked('hamilton', prof));
}
assert.ok(!isCandidateUnlocked('eisenhower', prof), 'Eisenhower requires both DEM and REP wins');

const repRoster = ['vance', 'rubio', 'desantis', 'haley', 'carlson', 'cruz', 'burlison', 'abbott', 'timscott', 'youngkin'];
for (let i = 0; i < repRoster.length; i++) {
  const r = evaluateCampaignAchievements(
    { party: 'rep', candidateId: repRoster[i], difficultyId: 'cupcake', modeId: 'two-parties', cheatsUsed: false, achievementStats: {} },
    baseOutcome,
    prof
  );
  prof = r.nextProfile;
  if (i === 0) {
    assert.ok(isCandidateUnlocked('trump', prof));
    assert.ok(isCandidateUnlocked('eisenhower', prof));
  }
  if (i === 4) assert.ok(isCandidateUnlocked('ghwb', prof));
  if (i === 9) assert.ok(isCandidateUnlocked('clay', prof));
}

// 5. Tactical, Electoral, Mode & Hidden triggers
const tacticalRes = evaluateCampaignAchievements(
  {
    party: 'dem',
    candidateId: 'shapiro',
    difficultyId: 'realistic',
    modeId: 'regional-parties',
    startId: 'jan',
    totalWeeks: 44,
    houseRule: 'pr',
    funds: 110,
    cheatsUsed: false,
    achievementStats: { maxDeficitInFinal4Weeks: 5.4, actionsUsed: 10, actionsAvailable: 50 },
  },
  {
    playerWon: true,
    playerEv: 270,
    demEv: 270,
    repEv: 268,
    playerPopularMargin: -1.2,
    playerWonPopularVote: false,
    contingentHouseWin: true,
    stateWinners: { TX: 'dem', PA: 'dem', MI: 'dem', WI: 'dem', GA: 'dem', AZ: 'dem' },
    stateMargins: { PA: 0.8, MI: 1.4, WI: 1.9, TX: 4.0 },
    houseMajorityParty: 'dem',
    senateMajorityParty: 'dem',
    houseNetGainForPlayer: 26,
    senateNetGainForPlayer: 4,
  },
  emptyAchievementProfile()
);
const earnedSet = new Set(tacticalRes.newlyUnlocked.map((a) => a.id));
for (const expected of [
  'win_realistic', 'win_dem', 'regional_270', 'exactly_270', 'electoral_math',
  'house_rules', 'governing_trifecta', 'downballot_wave', 'lone_star_flip',
  'rust_belt_sweep', 'every_tossup', 'full_cycle', 'morning_edition',
  'silent_cal', 'fighting_bob',
]) {
  assert.ok(earnedSet.has(expected), `Expected ${expected} to unlock`);
}

// Loss-only & Spoiler hidden triggers
const lossRes = evaluateCampaignAchievements(
  { party: 'lib', candidateId: 'oliver', difficultyId: 'medium', modeId: 'four-parties', cheatsUsed: false, achievementStats: {} },
  { ...baseOutcome, playerWon: false, playerEv: 45, demEv: 250, repEv: 243, playerPopularMargin: 3.5 },
  emptyAchievementProfile()
);
assert.deepEqual(
  lossRes.newlyUnlocked.map((a) => a.id).sort(),
  ['popular_mandate_empty_hands', 'the_spoiler']
);

// 6. createGame initializes achievementStats cleanly
const g = createGame({ party: 'dem', candidateId: 'shapiro', opponentId: 'vance', difficultyId: 'medium', modeId: 'two-parties', cheatsEnabled: true });
assert.equal(g.cheatsUsed, true);
assert.equal(g.achievementStats.cheatsUsed, true);
assert.equal(g.achievementStats.maxDeficitInFinal4Weeks, 0);

// 7. Profile merge preserves earliest timestamps & unions win lists
const merged = mergeAchievementProfiles(nightmareRes.nextProfile, cheatRes.nextProfile);
assert.ok(merged.unlockedIds.win_nightmare && merged.unlockedIds.win_with_cheats);
assert.ok(ACHIEVEMENT_BY_ID.win_nightmare.steamApiName === 'ACH_WIN_NIGHTMARE');

console.log('ALL STAGE 1 ACHIEVEMENT TESTS PASSED (36 achievements, cascade, cheats, tactical/electoral triggers, gameEngine hooks).');
