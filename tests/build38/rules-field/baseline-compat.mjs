// Baseline runtime and owned UI smoke check; see handoff for BFA_BUILD37_ROOT.
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { rm } from 'node:fs/promises';
import { currentRuleBallotParity } from '../../../src/lib/build38VotingRules.js';
import { createInitialTraditionalStaffing, selectInitialTraditionalStaff } from '../../../src/lib/traditionalStaffRules.js';
import { TRADITIONAL_STAFF_ROSTER } from '../../../src/data/traditionalStaffRoster.js';
import { planBuild38StaffFinance } from '../../../src/lib/build38StaffRules.js';

const reference = process.env.BFA_BUILD37_ROOT;
if (!reference) throw new Error('Set BFA_BUILD37_ROOT to shipped Build 37 app source with dependencies.');
const require = createRequire(path.join(reference, 'package.json'));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const React = require('react');
globalThis.__bfaTestReact = React;
const ownRoot = fileURLToPath(new URL('../../../', import.meta.url));
const cacheDir = fileURLToPath(new URL('./.vite-compat-cache', import.meta.url));
const server = await createServer({ configFile: false, root: ownRoot, cacheDir,
  resolve: { alias: [{ find: '@/lib/build38StaffRules', replacement: path.join(ownRoot, 'src/lib/build38StaffRules.js') }, { find: '@', replacement: path.join(reference, 'src') }] },
  esbuild: { jsx: 'transform' }, optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [{ name: 'fixture-react', resolveId(id) { return id === 'react' ? '\0fixture-react' : null; }, load(id) { return id === '\0fixture-react' ? 'export default globalThis.__bfaTestReact; export const useState = globalThis.__bfaTestReact.useState;' : null; } }],
  server: { middlewareMode: true, fs: { allow: [ownRoot, reference] } }, appType: 'custom', logLevel: 'error' });
try {
  const [{ createGame, expensesFor, incomeFor }, { leansForNational }, { votesFor }, { presidentialBallots, earlyBallotAvailable }, { default: StaffSelection }, { build35ContractUpkeep }] = await Promise.all([
    server.ssrLoadModule(path.join(reference, 'src/lib/gameEngine.js')),
    server.ssrLoadModule(path.join(reference, 'src/data/states.js')),
    server.ssrLoadModule(path.join(reference, 'src/lib/turnout.js')),
    server.ssrLoadModule(path.join(reference, 'src/lib/build37Ballots.js')),
    server.ssrLoadModule('/src/components/game/StaffSelection.jsx'),
    server.ssrLoadModule(path.join(reference, 'src/lib/build35Staff.js')),
  ]);
  const game = createGame({ party: 'dem', candidateId: 'shapiro', opponentId: 'vance', difficultyId: 'medium', leans: leansForNational(0), nationalGeneric: 0, thirdMode: 'fringe', campaignId: 'compat' });
  const support = { dem: 40, rep: 38, lib: 8, grn: 5, ind: 9 };
  for (const stateId of ['CA', 'PA', 'ME', 'NE']) {
    const nativeVotes = votesFor(stateId, support, game);
    assert.deepEqual(currentRuleBallotParity({ nativeVotes }).votes, presidentialBallots(game, stateId, support));
    const earlyBallots = { electorate: 1000, count: 100, votes: { dem: 35, rep: 40, ind: 10, lib: 10, grn: 5 } };
    assert.deepEqual(currentRuleBallotParity({ nativeVotes, earlyBallots }).votes, presidentialBallots(game, stateId, support, earlyBallots));
  }
  assert.equal(earlyBallotAvailable({ electoralRule: 'district' }, 'CA'), false);
  assert.equal(earlyBallotAvailable({ electoralRule: 'standard' }, 'ME'), false);
  assert.equal(earlyBallotAvailable({ electoralRule: 'standard' }, 'NE'), false);
  assert.equal(earlyBallotAvailable({ electoralRule: 'standard' }, 'CA'), true);
  assert.equal(earlyBallotAvailable({ electoralRule: 'proportional' }, 'ME'), true);
  const { renderToStaticMarkup } = require('react-dom/server');
  const staffing = createInitialTraditionalStaffing({ nonTraditionalSelectionPoolIds: ['bot-farm-director', 'polling-guru', 'youth-organizer'] });
  // Select real offered IDs; unknown IDs are intentionally rejected by the game.
  const { NONTRADITIONAL_STAFF_ROSTER } = await import('../../../src/data/nonTraditionalStaffRoster.js');
  staffing.nonTraditionalSelectionPoolIds = [NONTRADITIONAL_STAFF_ROSTER[0].id, NONTRADITIONAL_STAFF_ROSTER[1].id, 'bot-farm-director'];
  const html = renderToStaticMarkup(React.createElement(StaffSelection, { staffing, campaignId: 'compat', onComplete() {} }));
  assert.match(html, /Randomize Staff/); assert.match(html, /Confirm inner circle/);
  assert.doesNotMatch(html, /weekly upkeep/i);
  const disabled = renderToStaticMarkup(React.createElement(StaffSelection, { staffing, campaignId: 'compat', disabled: true, onComplete() {} }));
  assert.match(disabled, /disabled=""[^>]*>Randomize Staff/);
  const picked = [...TRADITIONAL_STAFF_ROSTER.filter((row) => row.id !== 'chief').slice(0, 6).map((row) => row.id), ...staffing.nonTraditionalSelectionPoolIds];
  const selected = selectInitialTraditionalStaff(picked, staffing, 'compat');
  assert.equal(selected.ok, true);
  game.staffing = selected.staffing;
  game.staffUpkeepReceiptIds = ['historical-charge'];
  const oldUpkeep = build35ContractUpkeep(game);
  assert.ok(oldUpkeep.total > 0);
  const oldExpenses = expensesFor(game);
  const baseExpensesM = Math.round((oldExpenses - oldUpkeep.total) * 100) / 100;
  const quote = planBuild38StaffFinance({ baseExpensesM, historicalReceiptIds: game.staffUpkeepReceiptIds });
  const beforeFunds = 50; const income = incomeFor(game);
  const closingFunds = beforeFunds + income - quote.expensesM;
  assert.equal(quote.staffUpkeep.totalM, 0); assert.equal(quote.expensesM, baseExpensesM);
  assert.equal(closingFunds, beforeFunds + income - oldExpenses + oldUpkeep.total);
  assert.deepEqual(quote.historicalReceiptIds, ['historical-charge']);
  process.stdout.write('Build 37 native ballot parity (four states, with and without early votes), district/split-state restrictions, staff-selection render, and stubbed future-week finance passed.\n');
} finally {
  await server.close();
  await rm(cacheDir, { recursive: true, force: true });
  delete globalThis.__bfaTestReact;
}
