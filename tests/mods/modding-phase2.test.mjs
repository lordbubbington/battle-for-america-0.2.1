import assert from 'node:assert/strict';
import { EVENTS, CHOICE_EVENTS, EVENT_BY_ID } from '@/data/events';
import { NATIONAL_CARDS, CARD_BY_ID } from '@/data/nationalNews';
import { WORLD_STORIES, WORLD_BY_ID } from '@/data/worldNews';
import { DEBATES, DEBATE_BY_ID, DEBATE_BY_WEEK } from '@/data/debates';
import { RUNNING_MATES, MATE_BY_ID, mateOptions } from '@/data/runningMates';
import { ISSUES, ISSUE_BY_ID, ISSUES_BY_WEIGHT } from '@/data/platform';
import { validateModBundle } from '@/lib/modSchema';
import {
  applyModBundles,
  buildExampleModBundle,
  resetAllModsToBase,
  importBrowserModBundle,
  removeBrowserMod,
  loadAndApplyMods,
} from '@/lib/modRegistry';
import { createGame } from '@/lib/gameEngine';

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem: (k, v) => storage.set(k, v),
  removeItem: (k) => storage.delete(k),
};

// Capture baseline counts
const baseCounts = {
  events: EVENTS.length,
  choiceEvents: CHOICE_EVENTS.length,
  natCards: NATIONAL_CARDS.length,
  worldStories: WORLD_STORIES.length,
  debates: DEBATES.length,
  demMates: RUNNING_MATES.dem.length,
  issues: ISSUES.length,
  debate1Title: DEBATE_BY_ID.debate1.title,
};

// 1. Validation rejects malformed Phase 2 sections
const badPhase2 = {
  folderName: 'bad-p2',
  manifest: { id: 'bad-p2', name: 'Bad P2', version: '1.0.0' },
  events: { add: [{ id: 'ev1', title: '', choices: [] }] },
  news: {
    national: { add: [{ id: 'n1', headline: '', nat: 50 }] },
    world: { add: [{ id: 'w1', headline: 'Hi', issue: '', lean: 9, mag: 10 }] },
  },
  debates: { add: [{ id: 'd1', week: 99, title: '', questions: [] }] },
  runningMates: { add: [{ id: 'm1', name: '', party: 'lib', stateAbbr: 'ZZ', nat: 99 }] },
  issues: { add: [{ id: 'i1', label: '', weight: 50, options: ['Only one'] }] },
};
const badRes = validateModBundle(badPhase2);
assert.equal(badRes.valid, false, 'Malformed Phase 2 mod fails validation');
assert.ok(badRes.errors.length >= 12, `Expected >=12 Phase 2 errors, got ${badRes.errors.length}`);

// 2. Valid Phase 2 mod adds events, national/world news, running mate, issue, and patches debate1
const mod = buildExampleModBundle();
mod.debates = {
  patch: { debate1: { title: 'The Modded Kitchen-Table Showdown' } },
};
mod.issues = {
  add: [
    {
      id: 'mod-space-policy',
      label: 'Space & orbital infrastructure',
      weight: 4.5,
      line: 'Who leads commercial launch and lunar bases.',
      options: ['Public NASA funding', 'Public-private partnerships', 'Deregulate launch corridors'],
      party: { dem: 0, rep: 2 },
    },
  ],
};

const check = validateModBundle(mod);
assert.equal(check.valid, true, `Valid Phase 2 mod failed: ${check.errors.join('; ')}`);
assert.equal(check.summary.events, 1);
assert.equal(check.summary.nationalNews, 1);
assert.equal(check.summary.worldNews, 1);
assert.equal(check.summary.runningMates, 1);
assert.equal(check.summary.debates, 1);
assert.equal(check.summary.issues, 1);

const applied = applyModBundles([badPhase2, mod]);
assert.equal(applied.activeDescriptors.length, 1, 'Bad Phase 2 mod quarantined; valid mod active');

assert.equal(EVENTS.length, baseCounts.events + 1);
assert.equal(CHOICE_EVENTS.length, baseCounts.choiceEvents + 1);
assert.ok(EVENT_BY_ID['mod-event-town-hall-viral'], 'Modded event indexed in EVENT_BY_ID');

assert.equal(NATIONAL_CARDS.length, baseCounts.natCards + 1);
assert.ok(CARD_BY_ID['mod-nat-clean-grid'], 'Modded national news card indexed');

assert.equal(WORLD_STORIES.length, baseCounts.worldStories + 1);
assert.ok(WORLD_BY_ID['mod-world-tech-plant'], 'Modded world story indexed');

assert.equal(DEBATE_BY_ID.debate1.title, 'The Modded Kitchen-Table Showdown');
assert.equal(DEBATE_BY_WEEK[3].title, 'The Modded Kitchen-Table Showdown');

assert.equal(RUNNING_MATES.dem.length, baseCounts.demMates + 1);
assert.ok(MATE_BY_ID['mod-mate-dem'], 'Modded running mate indexed');
assert.ok(mateOptions('dem').some((m) => m.id === 'mod-mate-dem'), 'Modded running mate returned by mateOptions()');

assert.equal(ISSUES.length, baseCounts.issues + 1);
assert.ok(ISSUE_BY_ID['mod-space-policy'], 'Modded issue indexed');
assert.ok(ISSUES_BY_WEIGHT.some((i) => i.id === 'mod-space-policy'), 'Modded issue in ISSUES_BY_WEIGHT');

// 3. Create a live game using the modded candidate + modded running mate
await importBrowserModBundle(mod);
const g = createGame({
  modeId: 'two-parties',
  party: 'dem',
  candidateId: 'mod-wildcard-dem',
  runningMateId: 'mod-mate-dem',
  opponentId: 'rubio',
  difficultyId: 'medium',
  nationalGeneric: 0,
  campaignId: 'mod-p2-game',
});
assert.equal(g.candidateId, 'mod-wildcard-dem');
assert.equal(g.runningMateId, 'mod-mate-dem');

// 4. Clean restoration when mod is removed
await removeBrowserMod('example-balance-mod');
await loadAndApplyMods();
assert.equal(EVENTS.length, baseCounts.events);
assert.equal(EVENT_BY_ID['mod-event-town-hall-viral'], undefined);
assert.equal(NATIONAL_CARDS.length, baseCounts.natCards);
assert.equal(CARD_BY_ID['mod-nat-clean-grid'], undefined);
assert.equal(WORLD_STORIES.length, baseCounts.worldStories);
assert.equal(WORLD_BY_ID['mod-world-tech-plant'], undefined);
assert.equal(DEBATE_BY_ID.debate1.title, baseCounts.debate1Title);
assert.equal(RUNNING_MATES.dem.length, baseCounts.demMates);
assert.equal(MATE_BY_ID['mod-mate-dem'], undefined);
assert.equal(ISSUES.length, baseCounts.issues);
assert.equal(ISSUE_BY_ID['mod-space-policy'], undefined);

resetAllModsToBase();
console.log('MODDING_PHASE2_TEST_PASS: events, national/world news, debates, running mates, issues, quarantine, live createGame, and full base restoration verified.');
