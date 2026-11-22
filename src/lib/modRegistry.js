// Phase 1 Runtime Content Registry for declarative JSON mods.
// Snapshots immutable base-game data at boot and cleanly layers enabled mods
// in deterministic load order onto the live exported data tables.

import { DEMOCRATS, REPUBLICANS, ALL_CANDIDATES, CANDIDATE_BY_ID, FIELD_BY_PARTY } from '@/data/candidates';
import { CANDIDATE_RATINGS } from '@/data/candidateRatings';
import { clearModCandidateFactionProfiles, registerModCandidateFactionProfile } from '@/data/candidateFactionProfiles';
import { STATE_LIST, STATE_BY_ABBR, BASE_LEANS, NATIONAL_ENV } from '@/data/states';
import { validateModBundle } from '@/lib/modSchema';

const STORAGE_KEY = 'bfa.mods.v1';

const clone = (v) => JSON.parse(JSON.stringify(v));

// Immutable base snapshots taken once before any mod is applied.
const BASE_SNAPSHOT = {
  democrats: clone(DEMOCRATS),
  republicans: clone(REPUBLICANS),
  allCandidates: clone(ALL_CANDIDATES),
  ratings: clone(CANDIDATE_RATINGS),
  states: clone(STATE_LIST),
};

const listeners = new Set();

let registryState = {
  revision: 0,
  modsRoot: null,
  isDesktop: false,
  discovered: [], // Array<{ id, folderName, source, bundle, validation, hash }>
  enabledIds: [],
  order: [],
  activeDescriptors: [], // Array<{ id, name, version, hash }>
  customScenarios: [],
};

function simpleHash(obj) {
  const str = JSON.stringify(obj) || '';
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function readPersistedPrefs() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return { enabledIds: [], order: [], browserMods: [] };
    const parsed = JSON.parse(raw);
    return {
      enabledIds: Array.isArray(parsed.enabledIds) ? parsed.enabledIds : [],
      order: Array.isArray(parsed.order) ? parsed.order : [],
      browserMods: Array.isArray(parsed.browserMods) ? parsed.browserMods : [],
    };
  } catch {
    return { enabledIds: [], order: [], browserMods: [] };
  }
}

function writePersistedPrefs(prefs) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors in restricted contexts.
  }
}

function notify() {
  registryState = { ...registryState, revision: registryState.revision + 1 };
  listeners.forEach((fn) => {
    try {
      fn(registryState);
    } catch {
      // Ignore subscriber errors.
    }
  });
}

function resolveModPortrait(modId, portraitPath) {
  if (typeof portraitPath !== 'string' || !portraitPath.trim()) return '/art/candidates/expressions/moore-smile.png';
  const trimmed = portraitPath.trim();
  if (/^(https?:|data:|blob:|bfa-mod:|\/)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('assets/')) return `bfa-mod://${modId}/${trimmed}`;
  return trimmed;
}

function restoreBaseDataInPlace() {
  clearModCandidateFactionProfiles();
  DEMOCRATS.length = 0;
  BASE_SNAPSHOT.democrats.forEach((c) => DEMOCRATS.push(clone(c)));

  REPUBLICANS.length = 0;
  BASE_SNAPSHOT.republicans.forEach((c) => REPUBLICANS.push(clone(c)));

  for (const key of Object.keys(CANDIDATE_RATINGS)) delete CANDIDATE_RATINGS[key];
  Object.entries(BASE_SNAPSHOT.ratings).forEach(([k, v]) => {
    CANDIDATE_RATINGS[k] = clone(v);
  });

  ALL_CANDIDATES.length = 0;
  BASE_SNAPSHOT.allCandidates.forEach((c) => ALL_CANDIDATES.push(clone(c)));

  STATE_LIST.length = 0;
  BASE_SNAPSHOT.states.forEach((s) => STATE_LIST.push(clone(s)));
}

function rebuildDerivedIndexes() {
  // Attach current ratings to DEMOCRATS, REPUBLICANS, and ALL_CANDIDATES
  const defaultRatings = { debate: 10, speech: 10, rally: 10, corruption: 10 };
  const nonMajor = ALL_CANDIDATES.filter((c) => c.party !== 'dem' && c.party !== 'rep');
  const mergedAll = [...DEMOCRATS, ...REPUBLICANS, ...nonMajor].map((c) => ({
    ...c,
    ratings: CANDIDATE_RATINGS[c.id] || /** @type {any} */ (c).ratings || { ...defaultRatings },
  }));

  ALL_CANDIDATES.length = 0;
  mergedAll.forEach((c) => ALL_CANDIDATES.push(c));

  for (const c of [...DEMOCRATS, ...REPUBLICANS]) {
    /** @type {any} */ (c).ratings = CANDIDATE_RATINGS[c.id] || /** @type {any} */ (c).ratings || { ...defaultRatings };
  }

  for (const key of Object.keys(CANDIDATE_BY_ID)) delete CANDIDATE_BY_ID[key];
  ALL_CANDIDATES.forEach((c) => {
    CANDIDATE_BY_ID[c.id] = c;
  });

  FIELD_BY_PARTY.dem = DEMOCRATS;
  FIELD_BY_PARTY.rep = REPUBLICANS;
  FIELD_BY_PARTY.lib = ALL_CANDIDATES.filter((c) => c.party === 'lib');
  FIELD_BY_PARTY.grn = ALL_CANDIDATES.filter((c) => c.party === 'grn');

  for (const key of Object.keys(STATE_BY_ABBR)) delete STATE_BY_ABBR[key];
  for (const key of Object.keys(BASE_LEANS)) delete BASE_LEANS[key];
  STATE_LIST.forEach((s) => {
    STATE_BY_ABBR[s.abbr] = s;
    BASE_LEANS[s.abbr] = Math.round((s.lean + NATIONAL_ENV) * 10) / 10;
  });
}

function normalizeCandidateDefaults(modId, raw) {
  return {
    id: raw.id,
    name: raw.name,
    short: raw.short || raw.name.split(' ').slice(-1)[0],
    state: raw.state || 'Ohio',
    title: raw.title || 'Modded Candidate',
    party: raw.party,
    weight: Number.isFinite(raw.weight) ? raw.weight : 5,
    color: raw.color || (raw.party === 'rep' ? '#F2603C' : '#3D5AF1'),
    portrait: resolveModPortrait(modId, raw.portrait),
    bio: raw.bio || 'Custom candidate added by a mod.',
    strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
    weaknesses: Array.isArray(raw.weaknesses) ? raw.weaknesses : [],
    nat: Number.isFinite(raw.nat) ? raw.nat : 0,
    region: raw.region || { northeast: 0, south: 0, midwest: 0, west: 0 },
    ...(raw.states ? { states: raw.states } : {}),
    ...(raw.groups ? { groups: raw.groups } : {}),
    ...(raw.turnoutRegion ? { turnoutRegion: raw.turnoutRegion } : {}),
    ...(raw.turnoutStates ? { turnoutStates: raw.turnoutStates } : {}),
    ...(raw.issueStances ? { issueStances: raw.issueStances } : {}),
    modId,
  };
}

/**
 * Pure deterministic application of a list of validated mod bundles in load order.
 * Invalid mods are quarantined (skipped) and reported in the returned summary.
 */
export function applyModBundles(bundles, enabledIdList = null) {
  restoreBaseDataInPlace();

  const enabledSet = enabledIdList ? new Set(enabledIdList) : null;
  const discovered = [];
  const activeDescriptors = [];
  const customScenarios = [];

  for (const bundle of bundles || []) {
    const validation = validateModBundle(bundle);
    const id = bundle?.manifest?.id || bundle?.folderName || `invalid-${discovered.length + 1}`;
    const hash = simpleHash({
      manifest: bundle?.manifest,
      candidates: bundle?.candidates,
      ratings: bundle?.ratings,
      states: bundle?.states,
      scenarios: bundle?.scenarios,
    });
    const entry = {
      id,
      folderName: bundle?.folderName || id,
      source: bundle?.source || 'browser',
      bundle,
      validation,
      hash,
    };
    discovered.push(entry);

    const isEnabled = enabledSet ? enabledSet.has(id) : true;
    if (!isEnabled || !validation.valid) continue;

    // Apply ratings first so newly added or patched candidates pick them up
    if (bundle.ratings) {
      for (const [cid, r] of Object.entries(bundle.ratings)) {
        CANDIDATE_RATINGS[cid] = {
          ...(CANDIDATE_RATINGS[cid] || { debate: 10, speech: 10, rally: 10, corruption: 10 }),
          ...r,
        };
      }
    }

    // Apply candidates (remove -> patch -> add)
    if (bundle.candidates) {
      const { remove = [], patch = {}, add = [] } = bundle.candidates;
      if (remove.length) {
        const rm = new Set(remove);
        const keepDem = DEMOCRATS.filter((c) => !rm.has(c.id));
        const keepRep = REPUBLICANS.filter((c) => !rm.has(c.id));
        // Always keep at least 1 candidate per major party so Two-Party mode never breaks.
        if (keepDem.length > 0) {
          DEMOCRATS.length = 0;
          keepDem.forEach((c) => DEMOCRATS.push(c));
        }
        if (keepRep.length > 0) {
          REPUBLICANS.length = 0;
          keepRep.forEach((c) => REPUBLICANS.push(c));
        }
      }
      for (const [cid, delta] of Object.entries(patch)) {
        const target = DEMOCRATS.find((c) => c.id === cid)
          || REPUBLICANS.find((c) => c.id === cid)
          || ALL_CANDIDATES.find((c) => c.id === cid);
        if (!target) continue;
        const nextPortrait = delta.portrait ? resolveModPortrait(id, delta.portrait) : target.portrait;
        Object.assign(target, delta, {
          portrait: nextPortrait,
          ...(delta.region ? { region: { ...(target.region || {}), ...delta.region } } : {}),
        });
      }
      for (const raw of add) {
        const normalized = normalizeCandidateDefaults(id, raw);
        const pool = /** @type {any[]} */ (normalized.party === 'dem' ? DEMOCRATS : normalized.party === 'rep' ? REPUBLICANS : ALL_CANDIDATES);
        registerModCandidateFactionProfile(normalized);
        const existingIdx = pool.findIndex((c) => c.id === normalized.id);
        if (existingIdx >= 0) pool[existingIdx] = normalized;
        else pool.push(normalized);
      }
    }

    // Apply state patches
    if (bundle.states?.patch) {
      for (const [abbr, patch] of Object.entries(bundle.states.patch)) {
        const st = STATE_LIST.find((s) => s.abbr === abbr);
        if (!st) continue;
        Object.assign(st, patch);
      }
    }

    // Collect custom scenarios
    if (bundle.scenarios?.add) {
      for (const sc of bundle.scenarios.add) {
        customScenarios.push({ ...sc, modId: id });
      }
    }

    activeDescriptors.push({
      id,
      name: bundle.manifest.name,
      version: bundle.manifest.version,
      hash,
    });
  }

  rebuildDerivedIndexes();
  return { discovered, activeDescriptors, customScenarios };
}

export function resetAllModsToBase() {
  restoreBaseDataInPlace();
  rebuildDerivedIndexes();
  registryState = {
    ...registryState,
    activeDescriptors: [],
    customScenarios: [],
  };
  notify();
}

export function getModState() {
  return registryState;
}

export function getActiveModDescriptors() {
  return registryState.activeDescriptors;
}

export function getModScenarios() {
  return registryState.customScenarios;
}

export function subscribeModRegistry(listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export async function loadAndApplyMods() {
  const prefs = readPersistedPrefs();
  const bfaMods = /** @type {any} */ (globalThis.window)?.bfaMods;
  const isDesktop = !!bfaMods?.isDesktop;
  let desktopMods = [];
  let modsRoot = null;

  if (isDesktop) {
    try {
      const res = await bfaMods.listMods();
      modsRoot = res?.modsRoot || null;
      desktopMods = Array.isArray(res?.mods) ? res.mods : [];
    } catch {
      desktopMods = [];
    }
  }

  const combined = [...desktopMods, ...prefs.browserMods.map((b) => ({ ...b, source: 'browser' }))];

  // Deterministic load order: prefs.order first, then any newly discovered mods alphabetically.
  const idOf = (b) => b?.manifest?.id || b?.folderName || '';
  const orderMap = new Map(prefs.order.map((id, i) => [id, i]));
  combined.sort((a, b) => {
    const ia = orderMap.has(idOf(a)) ? orderMap.get(idOf(a)) : 1e9;
    const ib = orderMap.has(idOf(b)) ? orderMap.get(idOf(b)) : 1e9;
    if (ia !== ib) return ia - ib;
    return idOf(a).localeCompare(idOf(b));
  });

  const orderedIds = combined.map(idOf).filter(Boolean);
  const enabledIds = prefs.enabledIds.filter((id) => orderedIds.includes(id));

  const applied = applyModBundles(combined, enabledIds);
  registryState = {
    ...registryState,
    isDesktop,
    modsRoot,
    discovered: applied.discovered,
    enabledIds,
    order: orderedIds,
    activeDescriptors: applied.activeDescriptors,
    customScenarios: applied.customScenarios,
  };
  notify();
  return registryState;
}

export async function setModEnabled(modId, enabled) {
  const prefs = readPersistedPrefs();
  const nextEnabled = enabled
    ? [...new Set([...prefs.enabledIds, modId])]
    : prefs.enabledIds.filter((id) => id !== modId);
  writePersistedPrefs({ ...prefs, enabledIds: nextEnabled });
  return loadAndApplyMods();
}

export async function moveModOrder(modId, delta) {
  const prefs = readPersistedPrefs();
  const order = registryState.order.length ? [...registryState.order] : [...prefs.order];
  const idx = order.indexOf(modId);
  const nextIdx = idx + delta;
  if (idx < 0 || nextIdx < 0 || nextIdx >= order.length) return registryState;
  const [item] = order.splice(idx, 1);
  order.splice(nextIdx, 0, item);
  writePersistedPrefs({ ...prefs, order });
  return loadAndApplyMods();
}

export async function importBrowserModBundle(bundle) {
  const prefs = readPersistedPrefs();
  const id = bundle?.manifest?.id || `imported-${Date.now()}`;
  const filtered = prefs.browserMods.filter((m) => (m?.manifest?.id || m?.folderName) !== id);
  filtered.push({ ...bundle, folderName: id, source: 'browser' });
  const nextEnabled = [...new Set([...prefs.enabledIds, id])];
  const nextOrder = [...new Set([...prefs.order, id])];
  writePersistedPrefs({ ...prefs, browserMods: filtered, enabledIds: nextEnabled, order: nextOrder });
  return loadAndApplyMods();
}

export async function removeBrowserMod(modId) {
  const prefs = readPersistedPrefs();
  const filtered = prefs.browserMods.filter((m) => (m?.manifest?.id || m?.folderName) !== modId);
  const nextEnabled = prefs.enabledIds.filter((id) => id !== modId);
  const nextOrder = prefs.order.filter((id) => id !== modId);
  writePersistedPrefs({ ...prefs, browserMods: filtered, enabledIds: nextEnabled, order: nextOrder });
  return loadAndApplyMods();
}

export function buildExampleModBundle() {
  return {
    folderName: 'example-balance-mod',
    source: 'browser',
    manifest: {
      id: 'example-balance-mod',
      name: 'Example Mod: 2028 Wildcard Pack',
      version: '1.0.0',
      author: 'Local Modder',
      minGameVersion: '0.2.2',
      mode: 'patch',
      description: 'Starter template adding Jordan Reyes (DEM) with custom ratings and a Colorado lean tweak.',
    },
    candidates: {
      add: [
        {
          id: 'mod-wildcard-dem',
          name: 'Jordan Reyes',
          short: 'Reyes',
          state: 'Colorado',
          title: 'Mountain West Outsider',
          party: 'dem',
          weight: 4,
          color: '#3D5AF1',
          portrait: '/art/candidates/expressions/moore-smile.png',
          bio: 'An example modded Democratic candidate demonstrating custom national and regional modifiers.',
          strengths: ['Strong Mountain West appeal', 'High-energy grassroots rallies'],
          weaknesses: ['Untested in national debates', 'Lower East Coast name ID'],
          nat: 0.5,
          region: { west: 3.5, midwest: 1.0, northeast: -1.0, south: -1.5 },
        },
      ],
      patch: {},
      remove: [],
    },
    ratings: {
      'mod-wildcard-dem': { debate: 11, speech: 13, rally: 14, corruption: 6 },
    },
    states: {
      patch: {
        CO: { lean: 13.0 },
      },
    },
    scenarios: {
      add: [
        {
          id: 'wildcard-2028',
          label: '2028 Wildcard Preset',
          description: 'Starts with Neutral Generic (0) and the modded Colorado map.',
          nationalGeneric: 0,
        },
      ],
    },
  };
}

export function checkSaveModCompatibility(savedGame) {
  const required = Array.isArray(savedGame?.activeMods) ? savedGame.activeMods : [];
  if (!required.length) return { compatible: true, missing: [], versionMismatch: [] };
  const activeById = new Map(registryState.activeDescriptors.map((m) => [m.id, m]));
  const missing = [];
  const versionMismatch = [];
  for (const mod of required) {
    const live = activeById.get(mod.id);
    if (!live) missing.push(mod);
    else if (live.version !== mod.version || (mod.hash && live.hash !== mod.hash)) {
      versionMismatch.push({ saved: mod, current: live });
    }
  }
  return {
    compatible: missing.length === 0 && versionMismatch.length === 0,
    missing,
    versionMismatch,
  };
}
