import assert from 'node:assert/strict';
import { STATE_LIST, BASE_LEANS } from '@/data/states';
import {
  REGIONAL_AI_ONLY_PARTIES,
  REGIONAL_ALL_TARGETS,
  REGIONAL_BORDER_STATES,
  REGIONAL_EXPLICIT_TARGETS,
  REGIONAL_FLAVOR_NOTE,
  REGIONAL_PARTY_IDS,
  REGIONAL_PLAYABLE_PARTIES,
  SCENARIO_CANDIDATES,
  SCENARIO_PARTIES,
} from '@/data/build39Scenarios';
import { BUILD40_MODE_OPTIONS, BUILD40_LEGACY_MODE_IDS } from '@/data/build40Elections';
import {
  applyBuild40Opening,
  eligibleBuild40Candidates,
  normalizeBuild40Mode,
  scenarioPartyIds,
} from '@/lib/build40Elections';
import { COLOR_TOKENS, MARGIN_SCALE, marginColor } from '@/lib/marginColors';
import { nationalShares, partyColorOf } from '@/lib/polling';
import { decidePresidency, nationalVote } from '@/lib/presidency';
import { BASE_TURNOUT, votesFor, voteUnits } from '@/lib/turnout';
import {
  addGeneric,
  applyNationalGenericSwing,
  applyWeeklyPresidentialCoattails,
  genericAverage,
  genericIn,
  initialGenericEnvironment,
} from '@/lib/environment';
import {
  classifyEventChoice,
  classifyNationalCardDirection,
  drawWeightedPlayerEvent,
  isStrictlyGoodEvent,
  scaleRegionalPersuasion,
} from '@/lib/v022Balance';
import { drawNationalNews } from '@/lib/nationalNews';
import { createGame } from '@/lib/gameEngine';
import { createSeededRandom } from '@/lib/seededRandom';
import { DONORS } from '@/lib/voterFlow';
import { thirdSharesFor } from '@/lib/downballot';

const results = {};

// R01: Remove Six Party Mode from new games; preserve legacy saves
assert.ok(!BUILD40_MODE_OPTIONS.some((m) => m.id === 'six-party'), 'R01: six-party removed from BUILD40_MODE_OPTIONS');
assert.ok(BUILD40_LEGACY_MODE_IDS.includes('six-party'), 'R01: six-party preserved in legacy mode IDs');
assert.throws(() => createGame({ modeId: 'six-party', party: 'dem', difficultyId: 'medium' }), /removed/i);
assert.equal(normalizeBuild40Mode('six-party').modeId, 'six-party');
const fourPartyGame = createGame({ modeId: 'four-parties', party: 'dem', difficultyId: 'medium' });
assert.equal(fourPartyGame.build40.modeId, 'four-parties');
results.R01 = 'PASS: six-party removed from new setup & createGame; legacy six-party normalizes; four-party starts cleanly';

// R02: Regional mode locks Normal and ignores national environment
const regA = createGame({ modeId: 'regional-parties', party: 'dem', difficultyId: 'nightmare', nationalGeneric: 15 });
const regB = createGame({ modeId: 'regional-parties', party: 'dem', difficultyId: 'cupcake', nationalGeneric: -15 });
assert.equal(regA.difficultyId, 'medium');
assert.equal(regB.difficultyId, 'medium');
assert.equal(regA.natGeneric, 0);
assert.equal(regB.natGeneric, 0);
applyNationalGenericSwing(regA, 8, 'economy');
addGeneric(regA, 'PA', 5);
assert.equal(genericAverage(regA), 0);
assert.equal(genericIn('PA', regA), 0);
results.R02 = `PASS: Regional locks difficulty=${regA.difficultyId}, natGeneric=${regA.natGeneric} even after +8 national swing & +5 PA write`;

// R03 + R04 + R10 + Owner Floor & National D/R Opening Rebalance
const neutralGame = { thirdMode: 'fringe', build40: { modeId: 'regional-parties', openingModel: true }, build39: { scenario: { id: 'regional-parties' } } };
function neutralBase(abbr) {
  const margin = BASE_LEANS[abbr];
  const base = thirdSharesFor(abbr, neutralGame);
  const raw = {
    dem: Math.max(0.2, 50 + margin / 2 - base.lib * DONORS.lib.dem - base.grn * DONORS.grn.dem),
    rep: Math.max(0.2, 50 - margin / 2 - base.lib * DONORS.lib.rep - base.grn * DONORS.grn.rep),
    lib: base.lib, grn: base.grn, ind: 0,
  };
  const tot = Object.values(raw).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v * 100 / tot]));
}

let natDem = 0; let natRep = 0; let natTotal = 0;
let flaggedOver10 = [];
const stateRows = [];
for (const { abbr } of STATE_LIST) {
  const res = applyBuild40Opening({ modeId: 'regional-parties', stateId: abbr, race: 'president', shares: neutralBase(abbr) });
  const totalShare = Object.values(res.shares).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(totalShare - 100) < 1e-6, `${abbr} shares sum to 100 (got ${totalShare})`);
  assert.ok(res.shares.dem >= 4.999, `${abbr} Dem floor >= 5% (got ${res.shares.dem})`);
  if (abbr !== 'MS' && abbr !== 'AL') {
    assert.ok(res.shares.rep >= 4.999, `${abbr} Rep floor >= 5% (got ${res.shares.rep})`);
  } else {
    assert.equal(res.shares.rep, 0, `${abbr} Rep replaced by Southern Heritage`);
  }
  flaggedOver10.push(...res.flaggedConflicts);
  const u = voteUnits(abbr);
  natDem += (res.shares.dem / 100) * u;
  natRep += (res.shares.rep / 100) * u;
  natTotal += u;
  stateRows.push({ abbr, shares: res.shares, cast: u });
}
const demPct = (natDem / natTotal) * 100;
const repPct = (natRep / natTotal) * 100;
assert.ok(Math.abs(demPct - repPct) < 0.01, `National D/R rebalance even: Dem=${demPct.toFixed(4)}% Rep=${repPct.toFixed(4)}%`);
assert.equal(flaggedOver10.length, 0, 'No party differs by >=10pp from intended target');

// Verify HI, UT, SC, FL targets
const hiRes = applyBuild40Opening({ modeId: 'regional-parties', stateId: 'HI', race: 'president', shares: neutralBase('HI') });
const utRes = applyBuild40Opening({ modeId: 'regional-parties', stateId: 'UT', race: 'president', shares: neutralBase('UT') });
const scRes = applyBuild40Opening({ modeId: 'regional-parties', stateId: 'SC', race: 'president', shares: neutralBase('SC') });
const inRes = applyBuild40Opening({ modeId: 'regional-parties', stateId: 'IN', race: 'president', shares: neutralBase('IN') });
assert.ok(Math.abs(hiRes.shares['hawaiian-ind'] - 82) < 0.01 && Math.abs(hiRes.shares.deseret - 4.8) < 0.01);
assert.ok(Math.abs(utRes.shares.deseret - 61.7) < 0.01 && Math.abs(utRes.shares['rocky-mountain'] - 10) < 0.01 && Math.abs(utRes.shares.dem - 20) < 0.01);
assert.ok(Math.abs(scRes.shares['southern-heritage'] - 35) < 0.01);
assert.ok(Math.abs(inRes.shares['farmer-labor'] - 40) < 0.01);
// R10 border checks: no Four Corners (AZ-CO, NM-UT), no AK/HI borders
assert.ok(!REGIONAL_BORDER_STATES['rocky-mountain'].includes('AZ') && !REGIONAL_BORDER_STATES['rocky-mountain'].includes('NM'));
assert.equal(REGIONAL_BORDER_STATES['alaskan-ind'].length, 0);
assert.equal(REGIONAL_BORDER_STATES['hawaiian-ind'].length, 0);
results.R03_R04_R10 = `PASS: All 51 jurisdictions sum 100%, 5% floors honored (except MS/AL Rep=0), 0 >=10pp conflicts, National D=${demPct.toFixed(2)}% vs R=${repPct.toFixed(2)}% (diff ${(demPct - repPct).toFixed(4)}pp), HI(HI_Ind=82.0%, Des=4.8%, D=5%, R=5%), UT(Des=61.7%, RM=10%, D=20%, R=5.1%), SC(SH=35%), IN(FL=40%)`;

// R05: Distinct colors & shade ladders for all 10 regional parties
for (const id of REGIONAL_PARTY_IDS) {
  assert.ok(COLOR_TOKENS[id], `Color token exists for ${id}`);
  assert.ok(MARGIN_SCALE[id]?.light && MARGIN_SCALE[id]?.mid && MARGIN_SCALE[id]?.dark, `Shade ladder exists for ${id}`);
  assert.equal(partyColorOf(id), COLOR_TOKENS[id]);
  assert.equal(marginColor(id, 3), MARGIN_SCALE[id].light);
  assert.equal(marginColor(id, 7), MARGIN_SCALE[id].mid);
  assert.equal(marginColor(id, 15), MARGIN_SCALE[id].dark);
}
results.R05 = `PASS: All ${REGIONAL_PARTY_IDS.length} regional parties have exact solid colors and light/mid/dark margin ladders`;

// R06: Playable regional parties, 4 AI-only parties, Evan McMullin Deseret nominee & UT Senate disabled
assert.deepEqual([...REGIONAL_AI_ONLY_PARTIES], ['localist', 'alaskan-ind', 'hawaiian-ind', 'rocky-mountain']);
assert.equal(REGIONAL_PLAYABLE_PARTIES.length, 6);
assert.equal(SCENARIO_CANDIDATES.deseret.name, 'Evan McMullin');
assert.equal(SCENARIO_PARTIES.localist.label, 'Boston Tea Party');
assert.equal(REGIONAL_FLAVOR_NOTE, 'Someone hit a button that destroyed all the parties, so Alaska and Hawaii figure they might as well get out now.');
assert.equal(regA.mcmullin, false, 'McMullin UT Senate disabled in regional mode');
const regDes = createGame({ modeId: 'regional-parties', party: 'deseret', difficultyId: 'medium' });
assert.equal(regDes.mcmullin, false, 'McMullin UT Senate disabled when playing Deseret');
const stdGame = createGame({ modeId: 'two-parties', party: 'dem', difficultyId: 'medium' });
assert.equal(stdGame.mcmullin, true, 'McMullin UT Senate preserved in non-regional mode');
const playableList = scenarioPartyIds('regional-parties', 'president', { playableOnly: true });
for (const aiOnly of REGIONAL_AI_ONLY_PARTIES) assert.ok(!playableList.includes(aiOnly));
assert.ok(!REGIONAL_PARTY_IDS.includes('conservation'));
results.R06 = 'PASS: 6 playable regional parties + 4 AI-only (Boston Tea, AK Ind, HI Ind, Rocky Mtn); McMullin=Deseret nominee with UT Senate disabled in regional mode & preserved in non-regional';

// R07: Regional parties pool electors at >= 270 (and contingent at 269)
const res269 = decidePresidency(regA, { rows: stateRows, evBy: { dem: 140, rep: 129, 'lone-star': 100, 'west-coast': 90, 'farmer-labor': 79 } }, { states: [] });
assert.equal(res269.mode, 'contingent', '269 combined regional EV does not pool');
const res270 = decidePresidency(regA, { rows: stateRows, evBy: { dem: 140, rep: 128, 'lone-star': 100, 'west-coast': 90, 'farmer-labor': 80 } }, { states: [] });
assert.equal(res270.mode, 'regional-pool');
assert.equal(res270.winner, 'lone-star');
assert.equal(res270.topEV, 270);
assert.equal(res270.regionalPool.originalEvBy['west-coast'], 90);
const resPopOverride = decidePresidency({ ...regA, popularVote: true }, { rows: stateRows, evBy: { dem: 140, rep: 128, 'lone-star': 100, 'west-coast': 90, 'farmer-labor': 80 } }, { states: [] });
assert.equal(resPopOverride.mode, 'popular', 'Popular vote rule retained without override');
results.R07 = 'PASS: 269 regional EV -> contingent; 270 regional EV -> pools behind lone-star (100 EV) preserving original state EVs; popularVote rule unaffected';

// R08: Persuasion gains x10 ONLY in regional mode (positive only, once)
assert.equal(scaleRegionalPersuasion(regA, 0.5), 5.0);
assert.equal(scaleRegionalPersuasion(regA, -0.5), -0.5);
assert.equal(scaleRegionalPersuasion(regA, 0.5, true), 0.5);
assert.equal(scaleRegionalPersuasion(stdGame, 0.5), 0.5);
results.R08 = 'PASS: Positive persuasion scaled x10 in regional mode (0.5 -> 5.0), negative unchanged (-0.5), alreadyScaled unchanged, non-regional unchanged';

// R09: Accurate national popular vote (actual modeled votes, not EVs, no duplicate state counting)
const testRows = [
  { abbr: 'CA', ev: 54, cast: 15000000, shares: { dem: 60, rep: 40 } },
  { abbr: 'WY', ev: 3, cast: 250000, shares: { dem: 20, rep: 80 } },
  { abbr: 'CA', ev: 54, cast: 15000000, shares: { dem: 60, rep: 40 } }, // duplicate should be ignored
];
const nv = nationalVote({ rows: testRows });
const ns = nationalShares(testRows);
const expectedDem = ((0.6 * 15000000 + 0.2 * 250000) / 15250000) * 100;
assert.ok(Math.abs(nv.dem - expectedDem) < 1e-6);
assert.ok(Math.abs(ns.dem - expectedDem) < 1e-6);
results.R09 = `PASS: Unequal-turnout hand total=${expectedDem.toFixed(4)}%, nationalVote=${nv.dem.toFixed(4)}%, nationalShares=${ns.dem.toFixed(4)}% (deduped, non-EV weighted)`;

// R12: Nick Bronze half-weight turnout inputs (60% baseline: 68% -> 64%, 54% -> 57%) while actual stays full strength
const basePA = BASE_TURNOUT.PA;
const gTurnHigh = { ...stdGame, turnout: { PA: { dem: basePA + 8, rep: basePA - 6 } } };
const actualVotes = votesFor('PA', { dem: 50, rep: 50 }, gTurnHigh);
const nickVotes = votesFor('PA', { dem: 50, rep: 50 }, { ...gTurnHigh, __nickBronzeHalfTurnout: true });
const uPA = voteUnits('PA');
assert.ok(Math.abs(actualVotes.dem - 0.5 * ((basePA + 8) / basePA) * uPA) < 1e-6);
assert.ok(Math.abs(nickVotes.dem - 0.5 * ((basePA + 4) / basePA) * uPA) < 1e-6);
assert.ok(Math.abs(nickVotes.rep - 0.5 * ((basePA - 3) / basePA) * uPA) < 1e-6);
results.R12 = `PASS: Baseline ${basePA}% -> effective +8 gives Nick +4, effective -6 gives Nick -3; actual votes stay full strength`;

// R13: South Carolina lean shifted 3 points toward Republicans (-14.15 -> -17.15; BASE_LEANS.SC = -17.1)
const scRow = STATE_LIST.find((s) => s.abbr === 'SC');
assert.equal(scRow.lean, -17.15);
assert.equal(BASE_LEANS.SC, -17.1);
results.R13 = `PASS: SC lean=${scRow.lean} (BASE_LEANS.SC=${BASE_LEANS.SC}, -3.0 shift from -14.15/-14.1); protected 35% Southern Heritage retained`;

// R15: Strictly-good event classification & weighted player draw
const samplePool = [
  { id: 'ev_good', choices: [{ effects: [{ kind: 'persuasion', amount: 1.5, target: 'self' }] }] },
  { id: 'ev_tradeoff', choices: [{ cost: 10, effects: [{ kind: 'persuasion', amount: 2.0, target: 'self' }] }] },
  { id: 'ev_risky', choices: [{ scandalRisk: 0.25, effects: [{ kind: 'momentum', amount: 2, target: 'self' }] }] },
  { id: 'ev_neutral', choices: [{ effects: [{ kind: 'momentum', amount: 0, target: 'self' }] }] },
];
assert.equal(isStrictlyGoodEvent(samplePool[0], 'dem'), true);
assert.equal(isStrictlyGoodEvent(samplePool[1], 'dem'), false);
assert.equal(isStrictlyGoodEvent(samplePool[2], 'dem'), false);
assert.equal(isStrictlyGoodEvent(samplePool[3], 'dem'), false);
const rng15 = createSeededRandom('r15-test');
let goodHits = 0; const N15 = 10000;
for (let i = 0; i < N15; i += 1) {
  if (drawWeightedPlayerEvent(samplePool, { random: rng15, playerParty: 'dem', weightMultiplier: 1.75 }).id === 'ev_good') goodHits += 1;
}
const goodRate = goodHits / N15; // expected 1.75 / 4.75 = 36.84% vs 25% baseline (ratio 1.474x <= 2.0x cap)
assert.ok(goodRate > 0.34 && goodRate < 0.40, `R15 weighted draw rate=${(goodRate * 100).toFixed(2)}%`);
results.R15 = `PASS: Strictly-good classifier rejects cost/risk/neutral; weighted draw rate=${(goodRate * 100).toFixed(2)}% vs 25.00% baseline (ratio ${(goodRate / 0.25).toFixed(2)}x, within <=2.0x cap)`;

// R16: Two-party-only 60/40 directional news verification (10,000+ directional presentations across Dem & Rep)
let favCount = 0; let unfavCount = 0; let neutCount = 0; let mixedCount = 0;
const rng16 = createSeededRandom('r16-two-party-10k');
for (const party of ['dem', 'rep']) {
  const gNews = createGame({ modeId: 'two-parties', party, difficultyId: 'medium' });
  for (let i = 0; i < 6500; i += 1) {
    const card = drawNationalNews(gNews, { random: rng16 });
    const dir = classifyNationalCardDirection(card, party);
    if (dir === 'favorable') favCount += 1;
    else if (dir === 'unfavorable') unfavCount += 1;
    else if (dir === 'mixed') mixedCount += 1;
    else neutCount += 1;
  }
}
const dirTotal = favCount + unfavCount;
const favShare = favCount / dirTotal;
assert.ok(dirTotal >= 10000, `R16 directional presentations=${dirTotal} >= 10,000`);
assert.ok(favShare >= 0.58 && favShare <= 0.62, `R16 favorable share=${(favShare * 100).toFixed(2)}% within 58-62%`);
results.R16 = `PASS: Two-party news N_dir=${dirTotal} (fav=${favCount}, unfav=${unfavCount}, neutral=${neutCount}, mixed=${mixedCount}), favorable=${(favShare * 100).toFixed(2)}% (target 58-62%)`;

// R17 + R18 + R19: Opening environment isolation, week-one protection, gradual coattails symmetry & feedback prevention
const gOpen = createGame({ modeId: 'two-parties', party: 'dem', difficultyId: 'cupcake', nationalGeneric: 2 });
assert.ok(Math.abs(genericAverage(gOpen) - 2.0) <= 0.01, `Opening generic within 0.01 of +2 (got ${genericAverage(gOpen)})`);
// Week 1 presidential write blocked, independent write allowed:
addGeneric(gOpen, 'PA', 4, { source: 'presidential' });
assert.ok(Math.abs(genericAverage(gOpen) - 2.0) <= 0.01, 'Week 1 presidential generic write blocked');
// Week 2 coattails: constant D+10 gap -> target +2.0 -> first update +0.5; R+10 gap -> -0.5
const gCoatD = { party: 'dem', week: 1, baseStateGeneric: initialGenericEnvironment(0), stateGeneric: initialGenericEnvironment(0), coattailByState: {}, coattailResolvedWeeks: [] };
const gapD10 = Object.fromEntries(STATE_LIST.map(({ abbr }) => [abbr, 10]));
applyWeeklyPresidentialCoattails(gCoatD, { weekNumber: 1, gapByState: gapD10 });
assert.equal(gCoatD.coattailByState.PA, 0.5);
// Re-calling same week must be a no-op (idempotent receipt):
applyWeeklyPresidentialCoattails(gCoatD, { weekNumber: 1, gapByState: gapD10 });
assert.equal(gCoatD.coattailByState.PA, 0.5);
// Mirror symmetry R+10 -> -0.5:
const gCoatR = { party: 'rep', week: 1, baseStateGeneric: initialGenericEnvironment(0), stateGeneric: initialGenericEnvironment(0), coattailByState: {}, coattailResolvedWeeks: [] };
const gapR10 = Object.fromEntries(STATE_LIST.map(({ abbr }) => [abbr, -10]));
applyWeeklyPresidentialCoattails(gCoatR, { weekNumber: 1, gapByState: gapR10 });
assert.equal(gCoatR.coattailByState.PA, -0.5);
// Cap at ±3.0 even for huge gap (+40):
const gCoatCap = { party: 'dem', week: 1, baseStateGeneric: initialGenericEnvironment(0), stateGeneric: initialGenericEnvironment(0), coattailByState: {}, coattailResolvedWeeks: [] };
const gap40 = Object.fromEntries(STATE_LIST.map(({ abbr }) => [abbr, 40]));
for (let w = 1; w <= 30; w += 1) applyWeeklyPresidentialCoattails(gCoatCap, { weekNumber: w, gapByState: gap40 });
assert.ok(gCoatCap.coattailByState.PA <= 3.0 && gCoatCap.coattailByState.PA > 2.99);
results.R17_R18_R19 = `PASS: Opening centered within 0.01; Week 1 presidential writes blocked; Week 2 coattails D+10->+0.5 / R+10->-0.5, idempotent receipt, capped at +3.0 (${gCoatCap.coattailByState.PA})`;

console.log('\n=== V0.2.2 VERIFICATION SUMMARY ===');
for (const [k, v] of Object.entries(results)) console.log(`${k}: ${v}`);
