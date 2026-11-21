import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ configFile: './vite.config.js', cacheDir: '.vite-build40-elections-test', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: 'custom' });
const { applyBuild40Opening, eligibleBuild40Candidates, normalizeBuild40Mode } = await vite.ssrLoadModule('/src/lib/build40Elections.js');
const { STATE_LIST } = await vite.ssrLoadModule('/src/data/states.js');
const { BUILD40_REGIONAL_PARTY_STATES: REGIONAL_PARTY_STATES } = await vite.ssrLoadModule('/src/data/build40Elections.js');
const total = (shares) => Object.values(shares).reduce((sum, value) => sum + value, 0);
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} != ${expected}`);

test('Four Parties transfers five points from each major ticket and conserves every state', () => {
  const before = { dem: 45, rep: 40, lib: 10, grn: 5 };
  const result = applyBuild40Opening({ modeId: 'four-parties', stateId: 'PA', shares: before });
  assert.deepEqual(result.shares, { dem: 40, rep: 35, lib: 15, grn: 10 });
  near(total(result.shares), 100);
  assert.deepEqual(before, { dem: 45, rep: 40, lib: 10, grn: 5 });
});

test('mode allocator isolates Four Party and Six Party overlays', () => {
  const base = { dem: 45, rep: 40, lib: 10, grn: 5 };
  const two = applyBuild40Opening({ modeId: 'two-parties', stateId: 'PA', shares: base }).shares;
  const regionalOut = applyBuild40Opening({ modeId: 'regional-parties', stateId: 'PA', shares: base }).shares;
  const four = applyBuild40Opening({ modeId: 'four-parties', stateId: 'PA', shares: base }).shares;
  assert.deepEqual(two, base);
  assert.deepEqual(regionalOut, base);
  assert.notDeepEqual(four, base);
});

test('Six Parties preserves the 20 point reserved bloc and reports 3 point crossover', () => {
  const reserved = Object.fromEntries(STATE_LIST.map(({ abbr }) => [abbr, { progressive: 9, maga: 11 }]));
  const input = { dem: 45, rep: 40, lib: 10, grn: 5 };
  const result = applyBuild40Opening({ modeId: 'six-party', stateId: 'PA', shares: input, game: { build40: { exclusiveByState: reserved } } });
  near(result.reservedShares.progressive + result.reservedShares.maga, 20);
  near(result.crossoverShares.progressive + result.crossoverShares.maga, 3);
  near(result.shares.progressive, 10.5);
  near(result.shares.maga, 12.5);
  near(total(result.shares), 100);
  assert.equal(result.shares.ind, undefined);
});

test('Six Parties calibrates the canonical neutral snapshot to a 7–9 point spread', () => {
  // Integration's canonical neutral opening, averaged by modeled row.cast:
  // D 24.16 / R 29.84 / L 13.09 / G 9.90 / Progressive 11.24 / MAGA 11.76.
  // Reconstruct the four-ticket input as the same proportional mix before the
  // 23-point exclusive allocation, then apply it at every state in the seeded
  // fixture. The cast weights vary by state but cannot distort this national
  // reference distribution.
  const canonicalMeans = { dem: 24.16, rep: 29.84, lib: 13.09, grn: 9.90 };
  const baselineTotal = total(canonicalMeans);
  const input = Object.fromEntries(Object.entries(canonicalMeans).map(([party, share]) => [party, share * 100 / baselineTotal]));
  const reservedByState = Object.fromEntries(STATE_LIST.map(({ abbr }) => [abbr, { progressive: 9.74, maga: 10.26 }]));
  const rows = STATE_LIST.map(({ abbr, ev }, index) => ({
    abbr,
    cast: ev * 1000 + index * 13,
    shares: applyBuild40Opening({ modeId: 'six-party', stateId: abbr, shares: input,
      game: { build40: { exclusiveByState: reservedByState } } }).shares,
  }));
  const national = Object.fromEntries(['dem', 'rep', 'lib', 'grn', 'progressive', 'maga'].map((party) => {
    const votes = rows.reduce((sum, row) => sum + row.cast * row.shares[party] / 100, 0);
    const cast = rows.reduce((sum, row) => sum + row.cast, 0);
    return [party, votes * 100 / cast];
  }));
  const spread = Math.max(...Object.values(national)) - Math.min(...Object.values(national));
  near(national.dem, 19.643, 0.01);
  near(national.rep, 20.098, 0.01);
  near(national.lib, 18.757, 0.01);
  near(national.grn, 18.502, 0.01);
  near(spread, 8.858, 0.01);
  near(national.progressive + national.maga, 23);
  near(national.progressive - 1.5 + national.maga - 1.5, 20);
  assert.ok(spread >= 7 && spread <= 9, `canonical neutral spread ${spread.toFixed(3)} outside 7–9`);
  near(total(national), 100);
  assert.ok(national.rep > national.dem && national.dem > national.lib && national.lib > national.grn);
});

test('Six Parties retains state-level and Socialist Midwest variation after smoothing', () => {
  const reserved = Object.fromEntries(STATE_LIST.map(({ abbr }) => [abbr, { progressive: 9.75, maga: 10.25 }]));
  const baseline = { dem: 25, rep: 25, lib: 25, grn: 25 };
  const midwestInput = { ...baseline, grn: 32, dem: 23, rep: 22, lib: 23 };
  const coastalInput = { ...baseline, grn: 15, dem: 28, rep: 29, lib: 28 };
  const make = (stateId, shares) => applyBuild40Opening({ modeId: 'six-party', stateId, shares,
    game: { build40: { exclusiveByState: reserved } } }).shares;
  const midwest = make('MN', midwestInput);
  const coastal = make('CA', coastalInput);
  assert.ok(midwest.grn > coastal.grn, 'Socialist support should remain higher on its Midwest-tilted baseline');
  assert.notEqual(midwest.dem, coastal.dem, 'state-specific ticket variation should remain visible');
  near(total(midwest), 100);
  near(total(coastal), 100);
});

test('Regional opening meets tie formula and downballot range in all home states', () => {
  const baseline = { dem: 64, rep: 24, lib: 8, grn: 4 };
  const allStates = Object.entries(REGIONAL_PARTY_STATES).flatMap(([party, states]) => states.map((stateId) => ({ party, stateId })));
  for (const { party, stateId } of allStates) {
    const presidential = applyBuild40Opening({ modeId: 'regional-parties', stateId, shares: baseline });
    const ballot = presidential.shares[party];
    assert.ok(ballot >= 46 && ballot <= 50, `${party} ${stateId}: ${ballot}`);
    assert.ok(ballot + 1e-8 >= presidential.shares.dem, `${party} did not tie or lead in ${stateId}`);
    near(total(presidential.shares), 100);

    const downballot = applyBuild40Opening({ modeId: 'regional-parties', stateId, race: 'senate', shares: baseline });
    assert.ok(downballot.shares[party] >= 40 && downballot.shares[party] <= 50);
    near(total(downballot.shares), 100);
  }
  const weightedRegional = allStates.reduce((sum, { party, stateId }) => {
    const result = applyBuild40Opening({ modeId: 'regional-parties', stateId, shares: baseline });
    return sum + STATE_LIST.find((state) => state.abbr === stateId).ev * result.shares[party];
  }, 0) / STATE_LIST.reduce((sum, state) => sum + state.ev, 0);
  near(weightedRegional, 10.25, 1e-10);
});

test('Regional opening holds home leads in a seeded non-neutral map', () => {
  for (let seed = 1; seed <= 50; seed += 1) {
    for (const [party, states] of Object.entries(REGIONAL_PARTY_STATES)) {
      for (const stateId of states) {
        const top = 45 + (seed * (stateId.charCodeAt(0) + stateId.charCodeAt(1))) % 46;
        const shares = { dem: top, rep: 100 - top, lib: 0, grn: 0 };
        const result = applyBuild40Opening({ modeId: 'regional-parties', stateId, shares }).shares;
        assert.ok(result[party] + 1e-8 >= Math.max(result.dem, result.rep), `${seed} ${party} ${stateId}`);
        near(total(result), 100);
      }
    }
  }
});

test('legacy mode normalization preserves Favorite saves and maps current modes', () => {
  assert.deepEqual(normalizeBuild40Mode('favorite-sons-daughters'), {
    modeId: 'favorite-sons-daughters', scenarioId: 'favorite-sons-daughters', thirdMode: 'fringe', legacyFavorite: true,
  });
  assert.equal(normalizeBuild40Mode('six-party').scenarioId, 'six-party');
  assert.equal(normalizeBuild40Mode('four-parties').thirdMode, 'surge');
  assert.equal(normalizeBuild40Mode('two-parties').thirdMode, 'fringe');
  assert.equal(normalizeBuild40Mode(null, { thirdMode: 'surge', build39: { scenario: { id: 'standard' } } }).modeId, 'four-parties');
});

test('ticket eligibility prevents cross-ticket selection, duplicate nominees, and ineligible VP picks', () => {
  const roster = [
    { id: 'bernie-sanders', party: 'grn' },
    { id: 'vance', party: 'rep' },
    { id: 'reagan', party: 'rep' },
  ];
  assert.deepEqual(eligibleBuild40Candidates({ modeId: 'six-party', party: 'progressive', candidates: roster }).candidates.map(({ id }) => id), ['bernie-sanders']);
  assert.deepEqual(eligibleBuild40Candidates({ modeId: 'six-party', party: 'maga', candidates: roster }).candidates.map(({ id }) => id), ['vance']);
  assert.deepEqual(eligibleBuild40Candidates({ modeId: 'six-party', party: 'grn', candidates: roster }).candidates, []);
  assert.deepEqual(eligibleBuild40Candidates({ modeId: 'six-party', party: 'rep', candidates: roster, role: 'vp', otherSelectedIds: ['vance'] }).candidates.map(({ id }) => id), []);
  assert.deepEqual(eligibleBuild40Candidates({ modeId: 'two-parties', party: 'progressive', candidates: roster }).candidates, []);
});

test.after(async () => { await vite.close(); });

