// Run with BFA_BUILD37_ROOT pointing to the shipped Build 37 app source and its dependencies.
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { writeFile, rm } from 'node:fs/promises';
import { createSeededRandom } from '../../../src/lib/seededRandom.js';
import { calibrateGovernorOpening, calibrateFourPartyGovernorLead } from '../../../src/lib/build38VotingRules.js';

const root = process.env.BFA_BUILD37_ROOT;
if (!root) throw new Error('Set BFA_BUILD37_ROOT to the shipped Build 37 app source with node_modules.');
const require = createRequire(path.join(root, 'package.json'));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const cacheDir = fileURLToPath(new URL('./.vite-evidence-cache', import.meta.url));
const server = await createServer({ configFile: false, root, cacheDir, resolve: { alias: { '@': path.join(root, 'src') } }, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const [{ createGame, govSnapshot }, { leansForNational }, { GOV_4P_RACES }, { rankedChoiceTally }, { shareModel, fixedQuality }] = await Promise.all([
    server.ssrLoadModule('/src/lib/gameEngine.js'), server.ssrLoadModule('/src/data/states.js'), server.ssrLoadModule('/src/data/fourPartySeats.js'), server.ssrLoadModule('/src/lib/rankedChoice.js'), server.ssrLoadModule('/src/lib/downballot.js'),
  ]);
  const median = (values) => { const v = [...values].sort((a, b) => a - b); const mid = Math.floor(v.length / 2); return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2; };
  const round = (n) => Math.round(n * 1000) / 1000;
  const groups = [];
  for (const thirdMode of ['off', 'surge']) for (const environment of [0, 7.3, -7.3]) {
    const before = []; const after = []; const examples = {};
    for (let seed = 1; seed <= 12; seed += 1) {
      const saved = Math.random;
      Math.random = createSeededRandom(`build38:governor-evidence:${seed}`);
      let game;
      try { game = createGame({ party: 'dem', candidateId: 'shapiro', opponentId: 'vance', difficultyId: 'medium', leans: leansForNational(environment), nationalGeneric: environment, thirdMode, campaignId: `governor-${seed}` }); }
      finally { Math.random = saved; }
      const races = govSnapshot(game).races;
      assert.equal(races.length, 11);
      for (const race of races) {
        let beforeMargin; let afterMargin;
        if (thirdMode === 'surge') {
          const fixed = GOV_4P_RACES[race.state];
          const tally = (lead) => {
            const rest = 25 - lead * .25;
            const shares = { dem: rest, rep: rest, lib: rest, grn: rest, ind: 0 };
            shares[fixed.winner] = 25 + lead * .75;
            const rcv = rankedChoiceTally(shares);
            return (['dem', 'grn'].includes(rcv.winner) ? 1 : -1) * rcv.margin;
          };
          beforeMargin = tally(fixed.lead);
          assert.ok(Math.abs(beforeMargin - race.margin) < 1e-8, `native four-party mismatch ${race.state}`);
          const adjusted = calibrateFourPartyGovernorLead({ stateId: race.state, openingLead: fixed.lead, scenario: { campaignType: 'new' } });
          afterMargin = tally(adjusted.openingLead);
        } else {
          // Native reported win margin is based on shares, not the raw race.margin.
          beforeMargin = (race.winner === 'dem' ? 1 : -1) * race.win.margin;
          const adjusted = calibrateGovernorOpening({ stateId: race.state, openingMarginDMinusR: race.margin, scenario: { campaignType: 'new' } });
          const originalOpening = game.baseMargins?.[race.state] === undefined ? undefined : game.baseMargins[race.state] * .42 + race.mod + fixedQuality('gov', race.state);
          const shares = shareModel({ margin: adjusted.openingMarginDMinusR, abbr: race.state, game, mode: 'poll', opening: originalOpening === undefined ? undefined : originalOpening + adjusted.openingOffset });
          afterMargin = shares.dem - shares.rep;
          assert.ok(Math.abs((race.shares.dem - race.shares.rep) - beforeMargin) < 1e-8, `native share mismatch ${race.state}`);
        }
        before.push(beforeMargin); after.push(afterMargin);
        if (seed === 1 && ['NC', 'VT', 'UT'].includes(race.state)) examples[race.state] = { before: round(beforeMargin), after: round(afterMargin) };
      }
    }
    groups.push({ mode: thirdMode, environmentDMinusR: environment, seeds: 12, races: before.length,
      before: { medianAbsoluteMargin: round(median(before.map(Math.abs))), competitiveWithin5: before.filter((m) => Math.abs(m) <= 5).length },
      after: { medianAbsoluteMargin: round(median(after.map(Math.abs))), competitiveWithin5: after.filter((m) => Math.abs(m) <= 5).length }, examples });
  }
  const result = { baseline: 'b2175dc5ed0702c2fd01bb1d4bf6bf6aa5daa895', fixture: '12 matched deterministic seeds; 11 races per seed; medium Democratic player; native opening vote-share margin; four-party RCV final margin', groups };
  await writeFile(new URL('./governor-evidence.json', import.meta.url), `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  await server.close();
  await rm(cacheDir, { recursive: true, force: true });
}
