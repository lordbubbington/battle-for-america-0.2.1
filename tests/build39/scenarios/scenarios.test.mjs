import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BASE_LEANS, STATE_LIST } from '../../../src/data/states.js';
import { createServer } from 'vite';
import { buildVoterComposition } from '../../../src/lib/build38VoterRegions.js';
import {
  applyScenarioShares, initializeScenarioState, normalizeScenarioId, resolveScenarioRivals,
  scenarioAllocateProportional, scenarioBallotAccess, scenarioCandidateOptions, scenarioPartyIds,
  scenarioPartyMeta, scenarioRankedChoiceTally,
} from '../../../src/lib/build39Scenarios.js';

const scenarios = ['standard', 'six-party', 'regional-parties', 'favorite-sons-daughters'];
const races = ['president', 'house', 'senate', 'governor', 'legislature'];
const base = { dem: 45, rep: 43, lib: 8, grn: 4, ind: 0 };
const sum = (values) => values.reduce((a, b) => a + b, 0);
const within = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, actual + ' differs from ' + expected);
const overlay = (id, stateId, race = 'president', shares = base, game) =>
  applyScenarioShares({ scenarioId: id, stateId, race, shares, game });

test('each supported scenario and race conserves state first-choice support', () => {
  for (const id of scenarios) {
    for (const race of races) {
      for (const { abbr } of STATE_LIST) {
        const shares = overlay(id, abbr, race);
        within(sum(Object.values(shares)), 100);
        assert.ok(Object.values(shares).every((share) => Number.isFinite(share) && share >= 0));
        assert.deepEqual(Object.keys(shares), scenarioPartyIds(id, race));
      }
    }
  }
  assert.strictEqual(overlay('standard', 'MN'), base);
  assert.strictEqual(overlay('favorite-sons-daughters', 'ME', 'house'), base);
  assert.equal(normalizeScenarioId('unknown'), 'standard');
  assert.equal(scenarioPartyMeta('standard', 'grn'), null);
  assert.equal(scenarioPartyMeta('six-party', 'grn').label, 'Socialist');
});

test('six-party blocs are calibrated using all 51 native electorate weights', async () => {
  const server = await createServer({
    configLoader: 'runner', appType: 'custom', cacheDir: '.vite/build39-scenario-check',
    optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false },
  });
  try {
    const { voteUnits } = await server.ssrLoadModule('/src/lib/turnout.js');
    const voteUnitsByState = Object.fromEntries(STATE_LIST.map(({ abbr }) => [abbr, voteUnits(abbr)]));
    const ideologyByState = buildVoterComposition({ baseIdeologyByState: BASE_LEANS }).byState;
    const scenario = initializeScenarioState({ scenarioId: 'six-party', ideologyByState, voteUnitsByState });
    assert.equal(Object.keys(scenario.exclusiveByState).length, 51);
    const game = { build39: { scenario } };
    const votes = sum(STATE_LIST.map(({ abbr }) => {
      const shares = overlay('six-party', abbr, 'president', base, game);
      within(shares.progressive, scenario.exclusiveByState[abbr].progressive);
      within(shares.maga, scenario.exclusiveByState[abbr].maga);
      return (shares.progressive + shares.maga) * voteUnitsByState[abbr];
    }));
    within(votes / sum(Object.values(voteUnitsByState)), 20);
    assert.ok(overlay('six-party', 'MN', 'president', base, game).grn >
      overlay('six-party', 'UT', 'president', base, game).grn);
    const bruised = { ...game, thirdMods: { maga: { UT: -20 } } };
    within(overlay('six-party', 'UT', 'president', base, bruised).maga, scenario.exclusiveByState.UT.maga);
  } finally {
    await server.close();
  }
});

test('regional parties meet modeled share ranges and draw an equal fraction from every baseline bloc', () => {
  const id = 'regional-parties';
  for (const [state, party] of [['MN', 'farmer-labor'], ['UT', 'conservation'], ['ME', 'localist']]) {
    assert.ok(scenarioBallotAccess(id, 'president', state, party));
    for (const race of races) {
      const expected = race === 'president' ? 12.5 : 40;
      const result = overlay(id, state, race);
      assert.equal(result[party], expected);
      for (const [key, vote] of Object.entries(base)) within(result[key], vote * (1 - expected / 100));
    }
    assert.equal(overlay(id, 'TX')[party], 0);
  }
});

test('favorite independents can win their home states and leave an Electoral College without a majority', async () => {
  const id = 'favorite-sons-daughters';
  const result = { rows: [], evBy: { dem: 0, rep: 0, lib: 0, grn: 0, ind: 0 } };
  for (const { abbr, ev } of STATE_LIST) {
    const dem = 49 + BASE_LEANS[abbr] / 2;
    const shares = overlay(id, abbr, 'president', { dem, rep: 98 - dem, lib: 1, grn: 1, ind: 0 });
    const winner = Object.keys(shares).sort((a, b) => shares[b] - shares[a])[0];
    result.evBy[winner] = (result.evBy[winner] || 0) + ev;
    result.rows.push({ abbr, shares, cast: 100 });
  }
  for (const { id: party, home } of scenarioCandidateOptions(id)) {
    assert.ok(result.evBy[party] > 0, party);
    assert.ok(scenarioBallotAccess(id, 'president', home, party));
    assert.ok(!scenarioBallotAccess(id, 'house', home, party));
  }
  assert.ok(!scenarioBallotAccess(id, 'president', 'NM', 'favorite-ut'));
  assert.equal(sum(Object.values(result.evBy)), 538);
  assert.ok(Math.max(...Object.values(result.evBy)) < 270, JSON.stringify(result.evBy));

  const server = await createServer({
    configLoader: 'runner', appType: 'custom', cacheDir: '.vite/build39-scenario-contingent',
    optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false },
  });
  try {
    const { decidePresidency } = await server.ssrLoadModule('/src/lib/presidency.js');
    const house = { states: [{ state: 'MN', demSeats: 5, repSeats: 3 }, { state: 'ME', demSeats: 2 }] };
    assert.equal(decidePresidency({ thirdMode: 'fringe' }, result, house).mode, 'contingent');
    assert.equal(decidePresidency({ thirdMode: 'fringe' }, result, house).winner, 'dem');
  } finally {
    await server.close();
  }
});

test('six-party transfers track exhausted ballots and preserve every counted vote', () => {
  const first = { dem: 23, rep: 24, lib: 18, grn: 15, progressive: 9, maga: 11 };
  const tally = scenarioRankedChoiceTally(first);
  for (const round of tally.rounds) within(sum(Object.values(round.tallies)) + round.exhausted, 100);
  within(sum(Object.values(tally.finalTallies)) + tally.exhausted, 100);
  within(sum(Object.values(tally.shares)), 100);
  assert.ok(tally.exhausted >= 9);
  assert.equal(scenarioRankedChoiceTally({ dem: 20, rep: 19, lib: 3, grn: 1, progressive: 6, maga: 51 }).winner, 'maga');
  const earlyProgressive = scenarioRankedChoiceTally({ dem: 38, rep: 35, lib: 1, grn: 12, progressive: 5, maga: 9 });
  assert.ok(earlyProgressive.exhausted === 5 || earlyProgressive.exhausted === 14);
});

test('proportional allocations include the scenario roster and preserve seat totals', () => {
  const regional = overlay('regional-parties', 'MN', 'house');
  assert.equal(scenarioAllocateProportional(regional, 10)['farmer-labor'], 4);
  const favorites = overlay('favorite-sons-daughters', 'ME');
  assert.ok(scenarioAllocateProportional(favorites, 4)['favorite-me'] > 0);
  for (const shares of [regional, favorites, overlay('six-party', 'TX')]) {
    for (const seats of [1, 2, 7, 435]) {
      const awards = scenarioAllocateProportional(shares, seats);
      assert.equal(sum(Object.values(awards)), seats);
      assert.ok(Object.values(awards).every((amount) => Number.isInteger(amount) && amount >= 0));
    }
  }
});

test('rival activity is seeded, targets eligible states, excludes the player and runs once per week', () => {
  for (const scenarioId of scenarios.slice(1)) {
    const scenario = initializeScenarioState({ scenarioId });
    const game = { build34CampaignId: 'scenario-rivals-1', week: 0, party: scenarioCandidateOptions(scenarioId)[0].party,
      build39: { scenario } };
    const rows = STATE_LIST.map(({ abbr }) => ({ abbr, shares: overlay(scenarioId, abbr) }));
    const first = resolveScenarioRivals({ game, rows });
    assert.ok(first.moves.length);
    assert.deepEqual(first, resolveScenarioRivals({ game, rows: [...rows].reverse() }));
    for (const move of first.moves) {
      assert.notEqual(move.party, game.party);
      assert.ok(scenarioBallotAccess(scenarioId, 'president', move.abbr, move.party));
      assert.ok(move.points > 0);
    }
    const saved = JSON.parse(JSON.stringify({ ...game, build39: { scenario: {
      ...scenario, adjustmentsByParty: first.adjustmentsByParty, appliedRivalWeek: first.appliedRivalWeek,
    } } }));
    assert.deepEqual(resolveScenarioRivals({ game: saved, rows }).moves, []);
    assert.ok(resolveScenarioRivals({ game: { ...saved, week: 1 }, rows }).moves.length);
  }
});
