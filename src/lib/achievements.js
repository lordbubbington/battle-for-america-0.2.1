// Persistent achievement profile, trigger evaluation, silent difficulty cascade,
// unlockable candidate lookup, and Electron/Steamworks synchronization.

import {
  ACHIEVEMENTS,
  ACHIEVEMENT_BY_ID,
  DIFFICULTY_CASCADE,
  UNLOCK_ACHIEVEMENT_BY_CANDIDATE_ID,
} from '@/data/achievements';

export const ACHIEVEMENT_STORAGE_KEY = 'bfa_achievements_v1';

export function emptyAchievementProfile() {
  return {
    version: 1,
    unlockedIds: {},
    wonCandidateIdsByParty: {
      dem: [],
      rep: [],
      lib: [],
      grn: [],
    },
    wonCandidateIds: [],
    wonDifficulties: [],
    wonModes: [],
  };
}

export function normalizeAchievementProfile(raw) {
  const base = emptyAchievementProfile();
  if (!raw || typeof raw !== 'object') return base;
  const unlockedIds = {};
  if (raw.unlockedIds && typeof raw.unlockedIds === 'object') {
    for (const [id, ts] of Object.entries(raw.unlockedIds)) {
      if (ACHIEVEMENT_BY_ID[id]) {
        unlockedIds[id] = typeof ts === 'string' ? ts : new Date().toISOString();
      }
    }
  }
  const byParty = { dem: [], rep: [], lib: [], grn: [] };
  if (raw.wonCandidateIdsByParty && typeof raw.wonCandidateIdsByParty === 'object') {
    for (const [party, list] of Object.entries(raw.wonCandidateIdsByParty)) {
      if (Array.isArray(list)) {
        byParty[party] = [...new Set(list.filter((id) => typeof id === 'string' && id.length > 0))];
      }
    }
  }
  const wonCandidateIds = Array.isArray(raw.wonCandidateIds)
    ? [...new Set(raw.wonCandidateIds.filter((id) => typeof id === 'string' && id.length > 0))]
    : [...new Set(Object.values(byParty).flat())];
  const wonDifficulties = Array.isArray(raw.wonDifficulties)
    ? [...new Set(raw.wonDifficulties.filter((d) => typeof d === 'string'))]
    : [];
  const wonModes = Array.isArray(raw.wonModes)
    ? [...new Set(raw.wonModes.filter((m) => typeof m === 'string'))]
    : [];
  return {
    version: 1,
    unlockedIds,
    wonCandidateIdsByParty: byParty,
    wonCandidateIds,
    wonDifficulties,
    wonModes,
  };
}

export function loadAchievementProfile() {
  try {
    if (typeof localStorage === 'undefined') return emptyAchievementProfile();
    const raw = localStorage.getItem(ACHIEVEMENT_STORAGE_KEY);
    if (!raw) return emptyAchievementProfile();
    return normalizeAchievementProfile(JSON.parse(raw));
  } catch {
    return emptyAchievementProfile();
  }
}

export function saveAchievementProfile(profile) {
  const normalized = normalizeAchievementProfile(profile);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify(normalized));
    }
  } catch {
    // Ignore storage quota or headless environment errors.
  }
  try {
    if (typeof window !== 'undefined' && (/** @type {any} */ (window)).bfaAchievements?.saveProfile) {
      (/** @type {any} */ (window)).bfaAchievements.saveProfile(normalized).catch(() => {});
    }
  } catch {
    // Ignore desktop IPC errors in browser mode.
  }
  return normalized;
}

export async function hydrateAchievementProfileFromDesktop() {
  try {
    if (typeof window === 'undefined' || !(/** @type {any} */ (window)).bfaAchievements?.loadProfile) {
      return loadAchievementProfile();
    }
    const local = loadAchievementProfile();
    const disk = await (/** @type {any} */ (window)).bfaAchievements.loadProfile();
    if (!disk) return local;
    const merged = mergeAchievementProfiles(local, normalizeAchievementProfile(disk));
    const saved = saveAchievementProfile(merged);
    syncUnlockedAchievementsToSteam(saved);
    return saved;
  } catch {
    return loadAchievementProfile();
  }
}

export function mergeAchievementProfiles(a, b) {
  const left = normalizeAchievementProfile(a);
  const right = normalizeAchievementProfile(b);
  const unlockedIds = { ...left.unlockedIds };
  for (const [id, ts] of Object.entries(right.unlockedIds)) {
    if (!unlockedIds[id] || ts < unlockedIds[id]) {
      unlockedIds[id] = ts;
    }
  }
  const parties = new Set([
    ...Object.keys(left.wonCandidateIdsByParty),
    ...Object.keys(right.wonCandidateIdsByParty),
  ]);
  const wonCandidateIdsByParty = /** @type {Record<string, string[]>} */ ({ dem: [], rep: [], lib: [], grn: [] });
  for (const party of parties) {
    wonCandidateIdsByParty[party] = [
      ...new Set([
        ...(left.wonCandidateIdsByParty[party] || []),
        ...(right.wonCandidateIdsByParty[party] || []),
      ]),
    ];
  }
  return {
    version: 1,
    unlockedIds,
    wonCandidateIdsByParty,
    wonCandidateIds: [...new Set([...left.wonCandidateIds, ...right.wonCandidateIds])],
    wonDifficulties: [...new Set([...left.wonDifficulties, ...right.wonDifficulties])],
    wonModes: [...new Set([...left.wonModes, ...right.wonModes])],
  };
}

export function isAchievementUnlocked(achievementId, profile = loadAchievementProfile()) {
  return Boolean(profile?.unlockedIds?.[achievementId]);
}

export function isCandidateUnlocked(candidateId, profile = loadAchievementProfile()) {
  const req = UNLOCK_ACHIEVEMENT_BY_CANDIDATE_ID[candidateId];
  if (!req) return true;
  return Boolean(profile?.unlockedIds?.[req]);
}

export function getUnlockedCandidateIds(profile = loadAchievementProfile()) {
  const unlocked = [];
  for (const [candId, achId] of Object.entries(UNLOCK_ACHIEVEMENT_BY_CANDIDATE_ID)) {
    if (profile?.unlockedIds?.[achId]) unlocked.push(candId);
  }
  return unlocked;
}

export function syncUnlockedAchievementsToSteam(profile = loadAchievementProfile()) {
  try {
    if (typeof window === 'undefined' || !(/** @type {any} */ (window)).bfaAchievements?.syncSteam) return;
    const apiNames = Object.keys(profile?.unlockedIds || {})
      .map((id) => ACHIEVEMENT_BY_ID[id]?.steamApiName)
      .filter(Boolean);
    if (apiNames.length > 0) {
      (/** @type {any} */ (window)).bfaAchievements.syncSteam(apiNames).catch(() => {});
    }
  } catch {
    // No-op outside desktop Steam runtime.
  }
}

function notifySteamAchievement(achievement) {
  try {
    if (typeof window === 'undefined' || !(/** @type {any} */ (window)).bfaAchievements?.unlockSteam) return;
    if (achievement?.steamApiName) {
      (/** @type {any} */ (window)).bfaAchievements.unlockSteam(achievement.steamApiName).catch(() => {});
    }
  } catch {
    // No-op outside desktop Steam runtime.
  }
}

function resolveModeId(game) {
  return game?.build40?.modeId || game?.modeId || game?.build39?.scenario?.id || game?.scenarioId || 'two-parties';
}

function isMinorPartyId(party) {
  return party !== 'dem' && party !== 'rep';
}

/**
 * Pure achievement evaluator invoked at Election Night resolution.
 *
 * @param {object} game - Finished campaign game state
 * @param {object} outcome - Normalized Election Night outcome:
 *   {
 *     playerWon: boolean,
 *     playerEv: number,
 *     demEv: number,
 *     repEv: number,
 *     playerPopularMargin: number,       // (playerShare - topRivalShare) in pct points
 *     playerWonPopularVote: boolean,
 *     contingentHouseWin: boolean,       // true if won via House contingent election (<270 EV)
 *     stateWinners: Record<string, string>, // abbr -> winning party
 *     stateMargins: Record<string, number>, // abbr -> winning margin (abs pct points)
 *     houseMajorityParty: string | null,
 *     senateMajorityParty: string | null,
 *     houseNetGainForPlayer: number,     // seats flipped/gained by player's party
 *     senateNetGainForPlayer: number,    // seats flipped/gained by player's party
 *     allPlayableCandidateIds?: string[], // full roster including unlockables (for win_all_candidates)
 *   }
 * @param {object} [currentProfile]
 */
export function evaluateCampaignAchievements(game, outcome, currentProfile = loadAchievementProfile()) {
  const profile = normalizeAchievementProfile(currentProfile);
  const now = new Date().toISOString();
  const cheatsUsed = Boolean(game?.cheatsUsed || game?.achievementStats?.cheatsUsed);
  const playerParty = game?.party || 'dem';
  const candidateId = game?.candidateId || null;
  const difficultyId = game?.difficultyId || 'medium';
  const modeId = resolveModeId(game);
  const playerWon = Boolean(outcome?.playerWon);
  const playerEv = Number(outcome?.playerEv || 0);
  const demEv = Number(outcome?.demEv || 0);
  const repEv = Number(outcome?.repEv || 0);
  const stateWinners = outcome?.stateWinners || {};
  const stateMargins = outcome?.stateMargins || {};

  const earnedIds = new Set();

  // Cheats mode: disables ALL achievements except the hidden Nixon cheat-win achievement.
  if (cheatsUsed) {
    if (playerWon) {
      earnedIds.add('win_with_cheats');
    }
  } else {
    // 1. Non-win / any-outcome hidden achievements
    if (!playerWon && Number(outcome?.playerPopularMargin || 0) >= 3) {
      earnedIds.add('popular_mandate_empty_hands');
    }
    if (isMinorPartyId(playerParty) && demEv < 270 && repEv < 270) {
      earnedIds.add('the_spoiler');
    }

    // 2. Victory-gated achievements & persistent win records
    if (playerWon) {
      // Update persistent win tracking
      if (candidateId) {
        if (!profile.wonCandidateIds.includes(candidateId)) {
          profile.wonCandidateIds.push(candidateId);
        }
        const partyList = profile.wonCandidateIdsByParty[playerParty] || [];
        if (!partyList.includes(candidateId)) {
          profile.wonCandidateIdsByParty[playerParty] = [...partyList, candidateId];
        }
      }
      if (!profile.wonDifficulties.includes(difficultyId)) {
        profile.wonDifficulties.push(difficultyId);
      }
      if (!profile.wonModes.includes(modeId)) {
        profile.wonModes.push(modeId);
      }

      // Silent difficulty cascade (Realistic stays standalone)
      const cascaded = DIFFICULTY_CASCADE[difficultyId] || [];
      for (const achId of cascaded) {
        earnedIds.add(achId);
      }

      // Party wins
      if (playerParty === 'dem') earnedIds.add('win_dem');
      if (playerParty === 'rep') earnedIds.add('win_rep');
      if (playerParty === 'lib') earnedIds.add('win_lib');
      if (playerParty === 'grn') earnedIds.add('win_grn');

      const demWins = (profile.wonCandidateIdsByParty.dem || []).length;
      const repWins = (profile.wonCandidateIdsByParty.rep || []).length;
      if (demWins >= 5) earnedIds.add('win_dem_5');
      if (repWins >= 5) earnedIds.add('win_rep_5');
      if (demWins >= 10) earnedIds.add('win_dem_10');
      if (repWins >= 10) earnedIds.add('win_rep_10');
      if (demWins >= 1 && repWins >= 1) earnedIds.add('win_both_major');

      // Win as every candidate (including unlocks)
      const allPlayable = Array.isArray(outcome?.allPlayableCandidateIds)
        ? outcome.allPlayableCandidateIds
        : [];
      if (
        allPlayable.length > 0 &&
        allPlayable.every((id) => profile.wonCandidateIds.includes(id))
      ) {
        earnedIds.add('win_all_candidates');
      }

      // Mode 270 EV feats
      if (modeId === 'regional-parties' && playerEv >= 270) {
        earnedIds.add('regional_270');
      }
      if ((modeId === 'four-parties' || modeId === 'four-party' || game?.thirdMode === 'surge') && playerEv >= 270) {
        earnedIds.add('four_party_270');
      }

      // Electoral milestones
      if (playerEv >= 400) earnedIds.add('landslide_400');
      if (playerEv >= 538) earnedIds.add('unanimous_map');
      if (playerEv === 270) earnedIds.add('exactly_270');
      if (outcome?.playerWonPopularVote === false || Number(outcome?.playerPopularMargin || 0) < 0) {
        earnedIds.add('electoral_math');
      }
      if (outcome?.contingentHouseWin) {
        earnedIds.add('house_rules');
      }

      // Downballot feats
      if (
        outcome?.houseMajorityParty === playerParty &&
        outcome?.senateMajorityParty === playerParty
      ) {
        earnedIds.add('governing_trifecta');
      }
      if (
        Number(outcome?.houseNetGainForPlayer || 0) >= 25 &&
        Number(outcome?.senateNetGainForPlayer || 0) >= 4
      ) {
        earnedIds.add('downballot_wave');
      }

      // State / regional map feats
      if (playerParty === 'dem' && stateWinners.TX === 'dem') {
        earnedIds.add('lone_star_flip');
      }
      if (
        stateWinners.PA === playerParty &&
        stateWinners.MI === playerParty &&
        stateWinners.WI === playerParty
      ) {
        earnedIds.add('rust_belt_sweep');
      }

      // Every Tossup: win every state decided by < 2 pts (minimum 3 such states)
      const closeStates = Object.entries(stateMargins)
        .filter(([, margin]) => Number.isFinite(margin) && Math.abs(margin) < 2)
        .map(([abbr]) => abbr);
      if (
        closeStates.length >= 3 &&
        closeStates.every((abbr) => stateWinners[abbr] === playerParty)
      ) {
        earnedIds.add('every_tossup');
      }

      // Full Cycle (44-week campaign starting January 1)
      if (game?.startId === 'jan' || Number(game?.totalWeeks || 0) >= 44) {
        earnedIds.add('full_cycle');
      }

      // Morning Edition: trailed by >= 5 points in national polling during final 4 weeks
      if (Number(game?.achievementStats?.maxDeficitInFinal4Weeks || 0) >= 5) {
        earnedIds.add('morning_edition');
      }

      // Silent Cal: >= 40% weekly action budget unused OR >= $100M unspent
      const actionsAvailable = Number(game?.achievementStats?.actionsAvailable || 0);
      const actionsUsed = Number(game?.achievementStats?.actionsUsed || 0);
      const unusedShare = actionsAvailable > 0 ? (actionsAvailable - actionsUsed) / actionsAvailable : 0;
      if (unusedShare >= 0.4 || Number(game?.funds || 0) >= 100) {
        earnedIds.add('silent_cal');
      }

      // Fighting Bob: PR / MMP House rules OR WI + MI + PA as minor-party nominee
      const carriedUpperMidwestAsMinor =
        isMinorPartyId(playerParty) &&
        stateWinners.WI === playerParty &&
        stateWinners.MI === playerParty &&
        stateWinners.PA === playerParty;
      if (game?.houseRule === 'pr' || game?.houseRule === 'mmp' || carriedUpperMidwestAsMinor) {
        earnedIds.add('fighting_bob');
      }
    }
  }

  const newlyUnlocked = [];
  const newlyUnlockedCandidates = [];

  for (const id of earnedIds) {
    const ach = ACHIEVEMENT_BY_ID[id];
    if (!ach) continue;
    if (cheatsUsed && !ach.allowWithCheats) continue;
    if (!profile.unlockedIds[id]) {
      profile.unlockedIds[id] = now;
      newlyUnlocked.push(ach);
      for (const candId of ach.unlockCandidateIds || []) {
        if (!newlyUnlockedCandidates.includes(candId)) {
          newlyUnlockedCandidates.push(candId);
        }
      }
    }
  }

  return {
    newlyUnlocked,
    newlyUnlockedCandidates,
    nextProfile: profile,
  };
}

export function recordCampaignOutcome(game, outcome) {
  const current = loadAchievementProfile();
  const result = evaluateCampaignAchievements(game, outcome, current);
  saveAchievementProfile(result.nextProfile);
  for (const ach of result.newlyUnlocked) {
    notifySteamAchievement(ach);
  }
  return result;
}

export function buildCampaignOutcome(game, { result, house, senate, decision, allPlayableCandidateIds = [] }) {
  const playerParty = game?.party || 'dem';
  const rows = result?.rows || [];
  const totalCast = rows.reduce((sum, r) => sum + (r.cast || 0), 0) || 1;
  const partyPct = {};
  for (const r of rows) {
    const sh = (result?.firstChoicePopularVote ? r.shares : r.rcvShares || r.shares) || {};
    for (const [pId, pct] of Object.entries(sh)) {
      partyPct[pId] = (partyPct[pId] || 0) + ((pct || 0) * (r.cast || 0)) / totalCast;
    }
  }
  const playerPct = partyPct[playerParty] || 0;
  let topRivalPct = 0;
  for (const [pId, pct] of Object.entries(partyPct)) {
    if (pId === playerParty) continue;
    if (pct > topRivalPct) topRivalPct = pct;
  }
  const playerPopularMargin = playerPct - topRivalPct;

  const stateWinners = {};
  const stateMargins = {};
  for (const r of rows) {
    if (!r?.abbr) continue;
    stateWinners[r.abbr] = r.winner || null;
    stateMargins[r.abbr] = Number.isFinite(r.lead) ? Math.abs(r.lead) : Math.abs(r.margin || 0);
  }

  const evBy = result?.evBy || {};
  const playerEv = Number(evBy[playerParty] || 0);
  const demEv = Number(evBy.dem || 0);
  const repEv = Number(evBy.rep || 0);
  const playerWon = decision?.winner === playerParty;
  const contingentHouseWin = Boolean(playerWon && decision?.mode === 'contingent');

  const houseMajorityParty = house?.control || null;
  const senateMajorityParty = senate?.control || null;
  const houseSeats = Number(house?.seatsByParty?.[playerParty] ?? house?.[playerParty] ?? 0);
  const houseStartSeats = Number(house?.start?.[playerParty] ?? 0);
  const senateSeats = Number(senate?.seatsByParty?.[playerParty] ?? senate?.[playerParty] ?? 0);
  const senateStartSeats = Number(senate?.start?.[playerParty] ?? 0);

  return {
    playerWon,
    playerEv,
    demEv,
    repEv,
    playerPopularMargin,
    playerWonPopularVote: playerPopularMargin > 0,
    contingentHouseWin,
    stateWinners,
    stateMargins,
    houseMajorityParty,
    senateMajorityParty,
    houseNetGainForPlayer: houseSeats - houseStartSeats,
    senateNetGainForPlayer: senateSeats - senateStartSeats,
    allPlayableCandidateIds,
  };
}
