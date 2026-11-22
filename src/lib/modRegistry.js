// Phase 1 + 2 Runtime Content Registry for declarative JSON mods.
// Snapshots immutable base-game data at boot and cleanly layers enabled mods
// in deterministic load order onto the live exported data tables.

import { DEMOCRATS, REPUBLICANS, ALL_CANDIDATES, CANDIDATE_BY_ID, FIELD_BY_PARTY } from '@/data/candidates';
import { CANDIDATE_RATINGS } from '@/data/candidateRatings';
import { clearModCandidateFactionProfiles, registerModCandidateFactionProfile } from '@/data/candidateFactionProfiles';
import { STATE_LIST, STATE_BY_ABBR, BASE_LEANS, NATIONAL_ENV } from '@/data/states';
import { EVENTS, CHOICE_EVENTS, EVENT_BY_ID } from '@/data/events';
import { NATIONAL_CARDS, CARD_BY_ID } from '@/data/nationalNews';
import { WORLD_STORIES, WORLD_BY_ID } from '@/data/worldNews';
import { DEBATES, DEBATE_BY_ID, DEBATE_BY_WEEK } from '@/data/debates';
import { RUNNING_MATES, ALL_RUNNING_MATES, MATE_BY_ID } from '@/data/runningMates';
import { ISSUES, ISSUE_BY_ID, ISSUES_BY_WEIGHT } from '@/data/platform';
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
  events: clone(EVENTS),
  eventByIdExtras: Object.fromEntries(
    Object.entries(EVENT_BY_ID).filter(([id]) => !EVENTS.some((e) => e.id === id)).map(([k, v]) => [k, clone(v)])
  ),
  nationalCards: clone(NATIONAL_CARDS),
  worldStories: clone(WORLD_STORIES),
  debates: clone(DEBATES),
  runningMatesDem: clone(RUNNING_MATES.dem),
  runningMatesRep: clone(RUNNING_MATES.rep),
  issues: clone(ISSUES),
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

  EVENTS.length = 0;
  BASE_SNAPSHOT.events.forEach((e) => EVENTS.push(clone(e)));

  NATIONAL_CARDS.length = 0;
  BASE_SNAPSHOT.nationalCards.forEach((c) => NATIONAL_CARDS.push(clone(c)));

  WORLD_STORIES.length = 0;
  BASE_SNAPSHOT.worldStories.forEach((s) => WORLD_STORIES.push(clone(s)));

  DEBATES.length = 0;
  BASE_SNAPSHOT.debates.forEach((d) => DEBATES.push(clone(d)));

  RUNNING_MATES.dem.length = 0;
  BASE_SNAPSHOT.runningMatesDem.forEach((m) => RUNNING_MATES.dem.push(clone(m)));
  RUNNING_MATES.rep.length = 0;
  BASE_SNAPSHOT.runningMatesRep.forEach((m) => RUNNING_MATES.rep.push(clone(m)));

  ISSUES.length = 0;
  BASE_SNAPSHOT.issues.forEach((i) => ISSUES.push(clone(i)));
}

function rebuildDerivedIndexes() {
  // Candidates
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

  // States
  for (const key of Object.keys(STATE_BY_ABBR)) delete STATE_BY_ABBR[key];
  for (const key of Object.keys(BASE_LEANS)) delete BASE_LEANS[key];
  STATE_LIST.forEach((s) => {
    STATE_BY_ABBR[s.abbr] = s;
    BASE_LEANS[s.abbr] = Math.round((s.lean + NATIONAL_ENV) * 10) / 10;
  });

  // Events
  CHOICE_EVENTS.length = 0;
  EVENTS.filter((e) => e.choices && e.choices.length > 0 && !e.easterEgg && !e.fallback && !e.scriptedOnly)
    .forEach((e) => CHOICE_EVENTS.push(e));
  for (const key of Object.keys(EVENT_BY_ID)) delete EVENT_BY_ID[key];
  Object.entries(BASE_SNAPSHOT.eventByIdExtras).forEach(([k, v]) => {
    EVENT_BY_ID[k] = clone(v);
  });
  EVENTS.forEach((e) => {
    EVENT_BY_ID[e.id] = e;
  });

  // National & World News
  for (const key of Object.keys(CARD_BY_ID)) delete CARD_BY_ID[key];
  NATIONAL_CARDS.forEach((c) => {
    CARD_BY_ID[c.id] = c;
  });
  for (const key of Object.keys(WORLD_BY_ID)) delete WORLD_BY_ID[key];
  WORLD_STORIES.forEach((s) => {
    WORLD_BY_ID[s.id] = s;
  });

  // Debates
  for (const key of Object.keys(DEBATE_BY_ID)) delete DEBATE_BY_ID[key];
  for (const key of Object.keys(DEBATE_BY_WEEK)) delete DEBATE_BY_WEEK[key];
  DEBATES.forEach((d) => {
    DEBATE_BY_ID[d.id] = d;
    DEBATE_BY_WEEK[d.week] = d;
  });

  // Running Mates
  ALL_RUNNING_MATES.length = 0;
  [...RUNNING_MATES.dem, ...RUNNING_MATES.rep].forEach((m) => ALL_RUNNING_MATES.push(m));
  for (const key of Object.keys(MATE_BY_ID)) delete MATE_BY_ID[key];
  ALL_RUNNING_MATES.forEach((m) => {
    MATE_BY_ID[m.id] = m;
  });

  // Issues / Platform
  for (const key of Object.keys(ISSUE_BY_ID)) delete ISSUE_BY_ID[key];
  ISSUES.forEach((i) => {
    ISSUE_BY_ID[i.id] = i;
  });
  ISSUES_BY_WEIGHT.length = 0;
  ISSUES.slice().sort((a, b) => b.weight - a.weight).forEach((i) => ISSUES_BY_WEIGHT.push(i));
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

function normalizeEventDefaults(modId, raw) {
  return {
    id: raw.id,
    title: raw.title,
    text: raw.text ?? raw.body ?? '',
    tone: raw.tone || 'nation',
    icon: raw.icon || 'megaphone',
    choices: raw.choices.map((c, idx) => ({
      id: c.id || `${raw.id}-c${idx + 1}`,
      label: c.label,
      detail: c.detail || '',
      effects: c.effects || {},
      ...(c.cost !== undefined ? { cost: c.cost } : {}),
      ...(c.risk !== undefined ? { risk: c.risk } : {}),
    })),
    modId,
  };
}

function normalizeNationalCardDefaults(modId, raw) {
  const nat = Number.isFinite(raw.nat) ? raw.nat : 0;
  return {
    id: raw.id,
    desk: raw.desk || 'National',
    icon: raw.icon || 'economy',
    headline: raw.headline,
    body: raw.body || raw.headline,
    nat,
    gen: Number.isFinite(raw.gen) ? raw.gen : Math.round(nat * 1.6 * 100) / 100,
    mom: Number.isFinite(raw.mom) ? raw.mom : 0,
    swing: !!raw.swing,
    issue: raw.issue || null,
    states: raw.states || null,
    arc: raw.arc || null,
    end: raw.end || null,
    follow: raw.follow || null,
    tone: raw.tone || null,
    weight: Number.isFinite(raw.weight) ? raw.weight : 1,
    modId,
  };
}

function normalizeWorldStoryDefaults(modId, raw) {
  return {
    id: raw.id,
    headline: raw.headline,
    issue: raw.issue,
    lean: Math.max(0, Math.min(2, Number.isInteger(raw.lean) ? raw.lean : 1)),
    mag: Number.isFinite(raw.mag) ? raw.mag : 1,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    modId,
  };
}

function normalizeRunningMateDefaults(modId, raw) {
  return {
    id: raw.id,
    name: raw.name,
    short: raw.short || raw.name.split(' ').slice(-1)[0],
    state: raw.state || 'Ohio',
    stateAbbr: raw.stateAbbr || 'OH',
    title: raw.title || 'Modded Running Mate',
    blurb: raw.blurb || 'Custom running mate added by a mod.',
    strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
    weakness: raw.weakness || 'Low national profile',
    nat: Number.isFinite(raw.nat) ? raw.nat : 0,
    region: raw.region || {},
    states: raw.states || {},
    modId,
  };
}

function normalizeIssueDefaults(modId, raw) {
  return {
    id: raw.id,
    label: raw.label,
    icon: raw.icon || 'economy',
    weight: Number.isFinite(raw.weight) ? raw.weight : 5,
    line: raw.line || raw.label,
    options: raw.options,
    blocPref: raw.blocPref || {
      progressive: 0, union: 0, urban: 0, young: 0,
      suburban: 1, independent: 1, rural: 2, evangelical: 2,
    },
    party: raw.party || { dem: 0, rep: 2 },
    modId,
  };
}

function applyArrayModOps(targetArr, ops, normalizeFn, minKeep = 0) {
  if (!ops) return;
  const arr = /** @type {any[]} */ (targetArr);
  const { remove = [], patch = {}, add = [] } = ops;
  if (remove.length) {
    const rm = new Set(remove);
    const kept = arr.filter((item) => !rm.has(item.id));
    if (kept.length >= minKeep) {
      arr.length = 0;
      kept.forEach((item) => arr.push(item));
    }
  }
  for (const [id, delta] of Object.entries(patch)) {
    const existing = arr.find((item) => item.id === id);
    if (existing) Object.assign(existing, delta);
  }
  for (const raw of add) {
    const normalized = normalizeFn(raw);
    const idx = arr.findIndex((item) => item.id === normalized.id);
    if (idx >= 0) arr[idx] = normalized;
    else arr.push(normalized);
  }
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
      events: bundle?.events,
      news: bundle?.news,
      debates: bundle?.debates,
      runningMates: bundle?.runningMates,
      issues: bundle?.issues,
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

    // 1. Ratings
    if (bundle.ratings) {
      for (const [cid, r] of Object.entries(bundle.ratings)) {
        CANDIDATE_RATINGS[cid] = {
          ...(CANDIDATE_RATINGS[cid] || { debate: 10, speech: 10, rally: 10, corruption: 10 }),
          ...r,
        };
      }
    }

    // 2. Candidates
    if (bundle.candidates) {
      const { remove = [], patch = {}, add = [] } = bundle.candidates;
      if (remove.length) {
        const rm = new Set(remove);
        const keepDem = DEMOCRATS.filter((c) => !rm.has(c.id));
        const keepRep = REPUBLICANS.filter((c) => !rm.has(c.id));
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

    // 3. States
    if (bundle.states?.patch) {
      for (const [abbr, patch] of Object.entries(bundle.states.patch)) {
        const st = STATE_LIST.find((s) => s.abbr === abbr);
        if (st) Object.assign(st, patch);
      }
    }

    // 4. Scenarios
    if (bundle.scenarios?.add) {
      for (const sc of bundle.scenarios.add) {
        customScenarios.push({ ...sc, modId: id });
      }
    }

    // 5. Phase 2: Events
    if (bundle.events) {
      applyArrayModOps(EVENTS, bundle.events, (raw) => normalizeEventDefaults(id, raw), 1);
    }

    // 6. Phase 2: National & World News
    if (bundle.news?.national) {
      applyArrayModOps(NATIONAL_CARDS, bundle.news.national, (raw) => normalizeNationalCardDefaults(id, raw), 1);
    }
    if (bundle.news?.world) {
      applyArrayModOps(WORLD_STORIES, bundle.news.world, (raw) => normalizeWorldStoryDefaults(id, raw), 1);
    }

    // 7. Phase 2: Debates
    if (bundle.debates) {
      applyArrayModOps(DEBATES, bundle.debates, (raw) => ({ ...raw, modId: id }), 1);
    }

    // 8. Phase 2: Running Mates
    if (bundle.runningMates) {
      const { remove = [], patch = {}, add = [] } = bundle.runningMates;
      if (remove.length) {
        const rm = new Set(remove);
        for (const p of ['dem', 'rep']) {
          const kept = RUNNING_MATES[p].filter((m) => !rm.has(m.id));
          if (kept.length > 0) {
            RUNNING_MATES[p].length = 0;
            kept.forEach((m) => RUNNING_MATES[p].push(m));
          }
        }
      }
      for (const [mid, delta] of Object.entries(patch)) {
        const target = RUNNING_MATES.dem.find((m) => m.id === mid) || RUNNING_MATES.rep.find((m) => m.id === mid);
        if (target) Object.assign(target, delta);
      }
      for (const raw of add) {
        const normalized = normalizeRunningMateDefaults(id, raw);
        const pool = /** @type {any[]} */ (raw.party === 'rep' ? RUNNING_MATES.rep : RUNNING_MATES.dem);
        const idx = pool.findIndex((m) => m.id === normalized.id);
        if (idx >= 0) pool[idx] = normalized;
        else pool.push(normalized);
      }
    }

    // 9. Phase 2: Issues / Platform
    if (bundle.issues) {
      applyArrayModOps(ISSUES, bundle.issues, (raw) => normalizeIssueDefaults(id, raw), 1);
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
      version: '1.1.0',
      author: 'Local Modder',
      minGameVersion: '0.2.2',
      mode: 'patch',
      description: 'Starter template adding Jordan Reyes (DEM), Elena Morales (VP), a custom event, and custom news.',
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
    runningMates: {
      add: [
        {
          id: 'mod-mate-dem',
          name: 'Elena Morales',
          short: 'Morales',
          party: 'dem',
          state: 'Arizona',
          stateAbbr: 'AZ',
          title: 'Sun Belt Closer',
          blurb: 'Example modded running mate who strengthens Southwest outreach.',
          strengths: ['Boosts Arizona and Nevada margins'],
          weakness: 'Lower Northeast name recognition',
          nat: 0.2,
          region: { west: 0.8 },
          states: { AZ: 2.0, NV: 1.2 },
        },
      ],
    },
    events: {
      add: [
        {
          id: 'mod-event-town-hall-viral',
          title: 'Viral Local Diner Stop',
          tone: 'hope',
          icon: 'megaphone',
          text: 'A spontaneous Q&A at a swing-state diner racks up 12 million views overnight.',
          choices: [
            {
              label: 'Turn it into a grassroots ad push',
              detail: 'Amplify the clip across swing states.',
              effects: { mom: 3, funds: 4 },
            },
            {
              label: 'Keep the focus on policy details',
              detail: 'Steady, low-risk follow-through.',
              effects: { mom: 2 },
            },
          ],
        },
      ],
    },
    news: {
      national: {
        add: [
          {
            id: 'mod-nat-clean-grid',
            desk: 'Economy',
            icon: 'economy',
            headline: 'Regional power grid upgrade cuts utility bills across Midwest',
            body: 'Consumers report lower monthly energy bills heading into the autumn stretch.',
            nat: 0.4,
            issue: 'energy',
          },
        ],
      },
      world: {
        add: [
          {
            id: 'mod-world-tech-plant',
            headline: 'A battery manufacturer announces two thousand new jobs',
            issue: 'economy',
            lean: 1,
            mag: 1.0,
            tags: ['midwest', 'purple'],
          },
        ],
      },
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
