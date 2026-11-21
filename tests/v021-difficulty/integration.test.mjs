import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const root = process.cwd();
const server = await createServer({ configFile: `${root}/vite.config.js`, root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const memory = new Map();
globalThis.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: (key) => memory.delete(key) };
const [{ createGame, DIFFICULTIES, saveGame, loadGame }, { campaignScore }, { ALL_CANDIDATES, CANDIDATE_BY_ID, byParty }, { candidateStartingFunds }, { AI_START_FUNDS }] = await Promise.all([
  server.ssrLoadModule('/src/lib/gameEngine.js'), server.ssrLoadModule('/src/lib/rankings.js'), server.ssrLoadModule('/src/data/candidates.js'),
  server.ssrLoadModule('/src/lib/build39Candidates.js'),
  server.ssrLoadModule('/src/lib/aiCampaign.js'),
]);
const profiles = [
  ['cupcake', 10, null, 800, .01], ['easy', 4, 7, 300, .5], ['medium', 0, 1, 250, 1],
  ['hard', -4, -3, 250, 2.5], ['brutal', -8, -8, 250, 7.5], ['nightmare', -20, -15, 250, 20],
];
const candidateAt = (party) => ALL_CANDIDATES.find((c) => c.party === party)?.id;
const dem10 = candidateAt('dem');
const rep10 = candidateAt('rep');
assert.ok(dem10 && rep10, 'fixture has corruption-10 major-party nominees');
const originalCorruption = { dem: CANDIDATE_BY_ID[dem10].ratings.corruption, rep: CANDIDATE_BY_ID[rep10].ratings.corruption };
test.after(() => { CANDIDATE_BY_ID[dem10].ratings.corruption = originalCorruption.dem; CANDIDATE_BY_ID[rep10].ratings.corruption = originalCorruption.rep; });
const create = (party, difficultyId, candidateId, nationalGeneric, extra = {}) => createGame({
  party, candidateId, opponentId: party === 'rep' ? dem10 : rep10, difficultyId, nationalGeneric,
  leans: {}, thirdMode: 'off', modeId: 'two-parties', ...extra,
});

test('D2/D5 both major-party orientations receive table defaults, caps, slider endpoints and start selection enforcement', () => {
  CANDIDATE_BY_ID[dem10].ratings.corruption = 10;
  CANDIDATE_BY_ID[rep10].ratings.corruption = 10;
  for (const [difficultyId, defaultD, capPlayer, funds, scoreMul] of profiles) {
    assert.equal(DIFFICULTIES[difficultyId].startFunds, funds);
    assert.equal(DIFFICULTIES[difficultyId].scoreMul, scoreMul);
    for (const [party, id, sign] of [['dem', dem10, 1], ['rep', rep10, -1]]) {
      const game = create(party, difficultyId, id, 25 * sign);
      const expected = capPlayer === null ? 25 * sign : Math.min(25, capPlayer) * sign;
      assert.equal(game.startingNationalGeneric, expected, `${difficultyId}/${party} cap`);
      assert.equal(createGame({ party, candidateId: id, opponentId: party === 'dem' ? rep10 : dem10, difficultyId, leans: {}, thirdMode: 'off', modeId: 'two-parties' }).startingNationalGeneric, defaultD * sign, `${difficultyId}/${party} default`);
      assert.equal(game.funds, funds);
    }
  }
  assert.equal(create('dem', 'easy', dem10, -25).startingNationalGeneric, -25, 'cap preserves valid opponent-favored endpoint');
  assert.equal(create('rep', 'easy', rep10, 25).startingNationalGeneric, 25, 'Republican cap preserves Democratic-favored endpoint');
  assert.equal(create('dem', 'medium', dem10, 0).startingNationalGeneric, 0, 'neutral midpoint remains zero');
});

test('D1/D6 setup map adjustments remain separate from randomness and are enforced at the engine boundary', () => {
  const baseLeans = { PA: 2, AZ: -1.5 };
  const stateAdjustments = { PA: 2.5, AZ: 1, XX: 100 };
  const easy = create('dem', 'easy', dem10, 4, { leans: baseLeans, stateAdjustments });
  assert.equal(easy.leans.PA, 4.5, 'Easy applies a permitted hand edit');
  assert.equal(easy.leans.AZ, -0.5, 'Easy applies a second permitted hand edit');
  assert.equal(Object.hasOwn(easy.leans, 'XX'), false, 'unknown state edits are ignored');
  for (const difficultyId of ['medium', 'hard', 'brutal', 'nightmare', 'realistic']) {
    const restricted = create('dem', difficultyId, dem10, 0, { leans: baseLeans, stateAdjustments });
    assert.deepEqual(restricted.leans, baseLeans, `${difficultyId} does not apply setup state edits`);
  }
  const cupcake = create('dem', 'cupcake', dem10, 10, { leans: baseLeans, stateAdjustments });
  assert.equal(cupcake.leans.PA, 4.5, 'Cupcake retains state editing');
  assert.equal(DIFFICULTIES.medium.label, 'Normal', 'Normal keeps the compatible medium ID');
});

test('D3 corruption scaling applies to major players and two-party third-party players and AI get exactly $10m', () => {
  CANDIDATE_BY_ID[dem10].ratings.corruption = 1;
  CANDIDATE_BY_ID[rep10].ratings.corruption = 20;
  for (const [difficultyId, , , baseline] of profiles) {
    for (const [party, id] of [['dem', dem10], ['rep', rep10]]) {
      const game = create(party, difficultyId, id, 0);
      const multiplier = party === 'dem' ? 2 / 3 : 2;
      assert.equal(game.funds, Math.round(baseline * multiplier * 10) / 10);
    }
  }
  const thirdPartyPlayer = create('lib', 'nightmare', 'oliver', 0);
  assert.equal(create('lib', 'nightmare', 'oliver', -25).startingNationalGeneric, -25, 'third-party environment remains uncapped');
  assert.equal(create('lib', 'nightmare', 'oliver', 25).startingNationalGeneric, 25, 'third-party environment does not gain a new default or cap');
  assert.equal(thirdPartyPlayer.funds, 10);
  assert.equal(thirdPartyPlayer.aiFunds.lib, 0);
  assert.equal(thirdPartyPlayer.aiFunds.grn, 10);
  assert.equal(thirdPartyPlayer.aiFunds.dem, candidateStartingFunds(AI_START_FUNDS, CANDIDATE_BY_ID[byParty('dem').slice().sort((a, b) => b.weight - a.weight)[0].id].ratings.corruption));
  const fringeLib = byParty('lib').slice().sort((a, b) => b.weight - a.weight)[0];
  assert.equal(createGame({ party:'dem', candidateId:dem10, opponentId:rep10, difficultyId:'easy', leans:{}, thirdMode:'surge', modeId:'four-parties' }).aiFunds.lib,
    candidateStartingFunds(15, fringeLib.ratings.corruption), 'four-party funding keeps existing corruption scaling');
});

test('D4 score uses the existing rounding order and leaves stored prior run data alone', () => {
  const preMultiplier = 268;
  const previous = { score: 47, difficultyLabel: 'Medium', fingerprint: 'prior-run-unchanged' };
  const storedRuns = JSON.stringify([previous]);
  memory.set('election2028.runs.v1', storedRuns);
  for (const [difficultyId, , , , multiplier] of profiles) {
    const score = campaignScore({ party:'dem', difficultyId }, { demEV:268, repEV:270, demPct:50, repPct:50 }, { net:0 }, 'rep');
    assert.equal(score, Math.round(preMultiplier * multiplier), difficultyId);
  }
  assert.deepEqual(JSON.parse(memory.get('election2028.runs.v1')), [previous]);
  assert.equal(memory.get('election2028.runs.v1'), storedRuns, 'scoring a new run leaves earlier career records byte-for-byte unchanged');
});

test('D2/D6 a fresh save preserves difficulty and custom state leans across resume', () => {
  memory.clear();
  const game = create('dem', 'easy', dem10, 6, { campaignId:'v021-save-resume', leans:{ PA:1 }, stateAdjustments:{ PA:2.5 } });
  assert.equal(game.leans.PA, 3.5);
  game.baseMargins.PA += 2.5;
  assert.equal(saveGame(game), true);
  const resumed = loadGame();
  assert.equal(resumed.difficultyId, 'easy');
  assert.equal(resumed.startingNationalGeneric, 6);
  assert.equal(resumed.leans.PA, 3.5);
  assert.equal(resumed.baseMargins.PA, game.baseMargins.PA);
});

test('new starting caps do not rewrite a prior saved campaign', () => {
  memory.clear();
  const oldSave = create('dem', 'hard', dem10, 0, { campaignId:'v020-old-save' });
  oldSave.startingNationalGeneric = 12;
  // The national display is derived from the saved state environments when a
  // save loads, so keep this legacy fixture internally consistent.
  oldSave.stateGeneric = Object.fromEntries(Object.keys(oldSave.stateGeneric).map((abbr) => [abbr, 9.5]));
  oldSave.natGeneric = 9.5;
  oldSave.genericBaseline = 12;
  oldSave.funds = 123.4;
  oldSave.baseMargins.PA = 6.25;
  oldSave.leans.PA = 7.5;
  assert.equal(saveGame(oldSave), true);
  const resumed = loadGame();
  assert.equal(resumed.difficultyId, 'hard');
  assert.equal(resumed.startingNationalGeneric, 12);
  assert.equal(resumed.natGeneric, 9.5);
  assert.equal(resumed.genericBaseline, 12);
  assert.equal(resumed.funds, 123.4);
  assert.equal(resumed.leans.PA, 7.5);
});

test.after(async () => { await server.close(); delete globalThis.localStorage; });
