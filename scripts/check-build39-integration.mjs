import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'vite';
const saves = new Map();
globalThis.localStorage = { getItem: (key) => saves.get(key), setItem: (key, value) => saves.set(key, value) };
const server = await createServer({ configLoader: 'runner', cacheDir: '.vite/build39-check', appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false } });
try {
  const e = await server.ssrLoadModule('/src/lib/gameEngine.js');
  const { buildNight, nightAt } = await server.ssrLoadModule('/src/lib/night.js');
  const { electionForecast } = await server.ssrLoadModule('/src/lib/electionForecast.js');
  const { decidePresidency } = await server.ssrLoadModule('/src/lib/presidency.js');
  const { createSeededRandom } = await server.ssrLoadModule('/src/lib/seededRandom.js');
  const { withReactionSummary } = await server.ssrLoadModule('/src/lib/reactions.js');
  const { simulateQuickOutcomes } = await server.ssrLoadModule('/src/lib/outcomeSimulation.js');
  const { byParty } = await server.ssrLoadModule('/src/data/candidates.js');
  const staff = ['field','pollster','communications','operations','policy','fundraising','base-liaison','social-media','media'];
  const sum = (object) => Object.values(object).reduce((a,b) => a+b, 0);
  const rows = [];
  for (const [scenarioId, thirdMode, party, candidateId] of [
    ['standard','off','dem','shapiro'], ['standard','surge','rep','vance'],
    ['six-party','fringe','progressive','progressive'], ['regional-parties','fringe','farmer-labor','farmer-labor'],
    ['favorite-sons-daughters','fringe','favorite-me','favorite-me'],
  ]) for (const [electoralRule,houseRule] of [['standard','standard'],['district','mmp'],['proportional','pr']]) {
    const campaignId = ['build39',scenarioId,party,electoralRule].join(':');
    Math.random = createSeededRandom(campaignId);
    const draft = e.createGame({ scenarioId, thirdMode, party, candidateId, opponentId: party === 'rep' ? 'shapiro' : 'vance',
      difficultyId: 'medium', campaignId, startId: 'aug', nationalGeneric: 0, electoralRule, houseRule, votingRuleId: 'mandatory-voter-id' });
    const game = e.confirmBuild35Staffing(draft, staff);
    const result = e.resultSnapshot(game);
    assert.equal(sum(result.evBy),538,campaignId);
    for (const row of result.rows) assert.ok(Math.abs(sum(row.shares) - 100) < 1e-6,campaignId + row.abbr);
    const house = e.houseSnapshot(game);
    assert.equal(sum(house.seatsByParty), houseRule === 'mmp' ? 870 : 435,campaignId);
    const plan = buildNight(game);
    const night = nightAt(plan, plan.end);
    assert.equal(sum(night.evBy),538,campaignId);
    assert.equal(sum(night.house.seatsByParty), houseRule === 'mmp' ? 870 : 435,campaignId);
    assert.ok(plan.stateLegislatureRaces.length > 0,campaignId);
    if (scenarioId === 'regional-parties') assert.ok(plan.stateLegislatureRaces.some((race) => race.shares?.['farmer-labor'] >= 30));
    for (const [partyId,ev] of Object.entries(result.evBy)) assert.equal(night.evBy[partyId] || 0,ev,campaignId + partyId);
    const forecast = electionForecast(game, { draws:2, chamberDraws:1, seed:campaignId });
    assert.ok(Object.values(forecast.stateWinProbabilities).every((row) => Math.abs(sum(row.parties)-100) < 1e-6),campaignId);
    const rival = e.opponentTurn(game);
    if (scenarioId !== 'standard') assert.equal(rival.build39.scenario.appliedRivalWeek, game.week,campaignId);
    assert.ok(e.saveGame(rival));
    const loaded = e.loadGame();
    assert.equal(loaded.build39.scenario.id,scenarioId,campaignId);
    assert.deepEqual(loaded.build39.scenario.adjustmentsByParty,rival.build39.scenario.adjustmentsByParty,campaignId);
    if (scenarioId !== 'standard' && electoralRule === 'proportional') {
      const quick = await simulateQuickOutcomes(game, { draws: 2 });
      assert.equal(quick.draws, 2);
    }
    rows.push({ scenarioId, thirdMode, party, electoralRule, houseRule, ev: result.evBy, seats: house.seatsByParty, winner: decidePresidency(game,result,house).winner });
  }
  assert.ok(byParty('lib').some(({ id }) => id === 'massie'));
  assert.ok(!byParty('grn','six-party').some(({ id }) => id === 'bernie-sanders'));
  Math.random = createSeededRandom('build39:actions');
  const draft = e.createGame({party:'dem',candidateId:'shapiro',opponentId:'vance',difficultyId:'medium',campaignId:'build39:actions'});
  const campaign = e.confirmBuild35Staffing(draft, staff);
  for (const abbr of ['VT','PA']) {
    Math.random = () => 0.5;
    const after = e.applyAction(campaign, 'visit', abbr);
    assert.equal(after.lastRally.stateId, abbr);
    assert.equal(after.lastRally.persuasionPoints, 0.1);
    assert.ok(after.lastRally.turnoutAfter >= after.lastRally.turnoutBefore);
    assert.ok(Math.abs(e.pollMargin(abbr, after) - e.pollMargin(abbr, campaign) - 0.1) < 1e-7);
    const repeat = e.applyAction(after,'visit',abbr);
    assert.ok(Math.abs(e.pollMargin(abbr, repeat) - e.pollMargin(abbr, campaign) - 0.2) < 1e-7);
    assert.ok(e.saveGame(repeat));
    assert.equal(e.loadGame().lastRally.persuasionPoints, 0.1);
  }
  const oldStance = campaign.stances.economy;
  const policy = e.changeStance(campaign, 'economy', oldStance === 0 ? 2 : 0);
  assert.notEqual(policy,campaign);
  const reacted = withReactionSummary(campaign, policy, { type:'stance', issueId:'economy', from:oldStance, to:policy.stances.economy });
  e.constrainPolicyPolling(campaign, reacted, policy.build39.lastPolicyResponse.pollPoints);
  const maxMove = Math.max(...e.snapshot(policy).rows.map(({ abbr }) => Math.abs(e.pollMargin(abbr, reacted) - e.pollMargin(abbr,campaign))));
  assert.ok(maxMove <= 0.500001);
  const baseline = path.resolve('../../build38-integration-worktree/build35');
  const oldServer = await createServer({ root: baseline, configFile: path.join(baseline,'vite.config.js'), configLoader:'runner',
    cacheDir:path.resolve('.vite/build39-old'), appType:'custom', server:{middlewareMode:true,hmr:false,ws:false} });
  const matchedRallies = [];
  try {
    const old = await oldServer.ssrLoadModule('/src/lib/gameEngine.js');
    const config = {party:'dem',candidateId:'shapiro',opponentId:'vance',difficultyId:'medium',campaignId:'build39:actions'};
    Math.random = createSeededRandom('build39:actions');
    const oldCampaign = old.confirmBuild35Staffing(old.createGame(config),staff);
    assert.equal(old.STORAGE_KEY, 'election2028.save.v38');
    saves.clear();
    assert.equal(old.saveGame(oldCampaign), true);
    const legacy = e.loadGame();
    assert.equal(legacy.build39.scenario.id, 'standard');
    assert.equal(legacy.funds, oldCampaign.funds);
    assert.equal(legacy.runningMateId, oldCampaign.runningMateId);
    assert.deepEqual(legacy.earlyBallotLedger,oldCampaign.earlyBallotLedger);
    for (const abbr of ['VT','PA']) {
      Math.random = () => 0.5;
      const a = old.applyAction(oldCampaign,'visit',abbr);
      const b = e.applyAction(legacy,'visit',abbr);
      assert.equal(old.turnoutOf(a,abbr),e.turnoutOf(b,abbr));
      const delta = e.pollMargin(abbr,b) - old.pollMargin(abbr,a);
      assert.ok(Math.abs(delta-0.1)<1e-7,abbr);
      matchedRallies.push({abbr,turnoutBefore:old.turnoutOf(oldCampaign,abbr),turnoutAfter:e.turnoutOf(b,abbr),newPersuasion:delta});
    }
  } finally { await oldServer.close(); }
  console.log(JSON.stringify({scenarios:rows, actionFixture:{states:['VT','PA'], maxPolicyMove:maxMove,matchedRallies},build38SaveMigration:true},null,2));
} finally { await server.close(); }
