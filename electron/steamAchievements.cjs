// Electron main-process Steamworks achievement bridge and disk persistence.
// Degrades gracefully to a safe no-op when steamworks.js is not installed or
// when running outside an active Steam client session.

const fs = require('node:fs');
const path = require('node:path');

let steamClient = null;
let steamInitAttempted = false;
let steamStatusReason = 'uninitialized';

function profilePath(userDataDir) {
  return path.join(userDataDir, 'achievements-profile.json');
}

function loadDesktopProfile(userDataDir) {
  try {
    const file = profilePath(userDataDir);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function saveDesktopProfile(userDataDir, profile) {
  try {
    const file = profilePath(userDataDir);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(profile, null, 2), 'utf8');
    return { saved: true };
  } catch (err) {
    return { saved: false, error: err?.message || 'write-failed' };
  }
}

function getSteamClient(steamAppId) {
  if (steamInitAttempted) return steamClient;
  steamInitAttempted = true;
  try {
    const steamworks = require('steamworks.js');
    const numericId = Number(steamAppId || process.env.BFA_STEAM_APP_ID || 0);
    steamClient = numericId > 0 ? steamworks.init(numericId) : steamworks.init();
    steamStatusReason = 'connected';
    return steamClient;
  } catch (err) {
    steamClient = null;
    steamStatusReason = err?.code === 'MODULE_NOT_FOUND' ? 'steamworks-not-installed' : 'steam-unavailable';
    return null;
  }
}

function unlockSteamAchievement(steamApiName, steamAppId) {
  if (!steamApiName || typeof steamApiName !== 'string') {
    return { synced: false, reason: 'invalid-api-name' };
  }
  const client = getSteamClient(steamAppId);
  if (!client?.achievement?.activate) {
    return { synced: false, reason: steamStatusReason };
  }
  try {
    const ok = Boolean(client.achievement.activate(steamApiName));
    return { synced: ok, reason: ok ? 'activated' : 'activate-returned-false' };
  } catch (err) {
    return { synced: false, reason: err?.message || 'activate-failed' };
  }
}

function syncSteamAchievements(apiNames, steamAppId) {
  if (!Array.isArray(apiNames) || apiNames.length === 0) {
    return { syncedCount: 0, reason: 'empty' };
  }
  const client = getSteamClient(steamAppId);
  if (!client?.achievement?.activate) {
    return { syncedCount: 0, reason: steamStatusReason };
  }
  let syncedCount = 0;
  for (const name of apiNames) {
    try {
      if (typeof name === 'string' && client.achievement.activate(name)) {
        syncedCount += 1;
      }
    } catch {
      // Continue syncing remaining achievements.
    }
  }
  return { syncedCount, reason: 'synced' };
}

function getSteamAchievementStatus(steamAppId) {
  const client = getSteamClient(steamAppId);
  return {
    available: Boolean(client?.achievement?.activate),
    reason: steamStatusReason,
  };
}

module.exports = {
  loadDesktopProfile,
  saveDesktopProfile,
  unlockSteamAchievement,
  syncSteamAchievements,
  getSteamAchievementStatus,
};
