import test from 'node:test';
import assert from 'node:assert/strict';
import { VOTING_RULES } from '../../../src/data/build38VotingRules.js';
import { adjustVotingRule, calibrateMandatoryTurnout, modeledRegistrationPool, quoteVotingCheckpoint, currentRuleBallotParity, calibrateGovernorOpening, calibrateFourPartyGovernorLead } from '../../../src/lib/build38VotingRules.js';
import { fieldActionRules, volunteerCostTable, applyFieldEffectMultipliers } from '../../../src/lib/build38FieldRules.js';
import { randomizeStaff, staffWeeklyUpkeep, planBuild38StaffFinance, staffSetupDrawback } from '../../../src/lib/build38StaffRules.js';
import { TRADITIONAL_STAFF_ROSTER } from '../../../src/data/traditionalStaffRoster.js';
import { NONTRADITIONAL_STAFF_ROSTER } from '../../../src/data/nonTraditionalStaffRoster.js';
import { createInitialTraditionalStaffing, selectInitialTraditionalStaff } from '../../../src/lib/traditionalStaffRules.js';

const near = (a, b, epsilon = 1e-9) => assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);
const cohort = (id, ethnicityId, firstChoiceParty, extras = {}) => ({ id, ethnicityId, firstChoiceParty, eligibleUnits: 100, registeredUnits: 90, baseTurnoutRate: 0.6, earlyCastUnits: 0, ...extras });
const adjust = (ruleId, cohorts, extra = {}) => adjustVotingRule({ ruleId, phase: 'election-day', stateId: 'AA', population: 1000, cohorts, ...extra });

test('five stable, exclusive descriptors hide the final-week bonus', () => {
  assert.deepEqual(VOTING_RULES.map(({ id }) => id), ['current', 'automatic-registration', 'same-day-registration', 'mandatory-voter-id', 'mandatory-turnout']);
  assert.doesNotMatch(VOTING_RULES[1].description, /double|twice|final week|2\s*[×x]/i);
});

test('registration uses a modeled eligible pool and neither duplicates nor assigns partisan advantage', () => {
  const pool = modeledRegistrationPool({ historicalBallots: 600, baselineTurnoutRate: .6, ruleId: 'automatic-registration' });
  near(pool.baseRegisteredUnits, 1000); near(pool.eligibleUnits, 1000 / .9);
  const input = [cohort('d', 'white', 'dem'), cohort('r', 'black', 'rep')];
  const copy = structuredClone(input);
  const auto = adjust('automatic-registration', input);
  assert.deepEqual(input, copy); assert.deepEqual(auto.cohorts.map((c) => c.registeredUnits), [95, 95]);
  assert.deepEqual(adjust('automatic-registration', auto.cohorts).cohorts.map((c) => c.registeredUnits), [95, 95]);
  assert.deepEqual(adjust('same-day-registration', input, { fieldMobilization: 1 }).cohorts.map((c) => c.registeredUnits), [93, 93]);
  near(adjust('same-day-registration', input, { fieldMobilization: .5 }).cohorts[0].registeredUnits, 91.5);
  assert.equal(adjust('automatic-registration', [cohort('cap', 'other', 'ind', { registeredUnits: 99 })]).cohorts[0].registeredUnits, 100);
  assert.equal(adjust('automatic-registration', [input[0], input[0]]).status, 'unavailable');
});

test('ID reduces turnout by three and five percentage points with bounds', () => {
  const result = adjust('mandatory-voter-id', [cohort('w', 'white', 'rep'), cohort('b', 'black', 'dem'), cohort('a', 'asian', 'lib', { baseTurnoutRate: .01 })]);
  near(result.cohorts[0].targetTurnoutRate, .57); near(result.cohorts[1].targetTurnoutRate, .55); assert.equal(result.cohorts[2].targetTurnoutRate, 0);
});

test('registration applies identically to matched parties across representative state fixtures', () => {
  for (const [stateId, population, eligibleUnits] of [['CA', 39000000, 300], ['PA', 13000000, 100], ['WY', 600000, 10]]) {
    const rows = [cohort(`${stateId}-d`, 'hispanic', 'dem', { eligibleUnits, registeredUnits: eligibleUnits * .8 }),
      cohort(`${stateId}-r`, 'hispanic', 'rep', { eligibleUnits, registeredUnits: eligibleUnits * .8 })];
    for (const ruleId of ['automatic-registration', 'same-day-registration']) {
      const result = adjustVotingRule({ ruleId, phase: 'election-day', stateId, population, cohorts: rows, fieldMobilization: 1 });
      assert.equal(result.status, 'ready');
      near(result.cohorts[0].registeredUnits, result.cohorts[1].registeredUnits);
      near(result.cohorts[0].registeredUnits, eligibleUnits * (ruleId === 'automatic-registration' ? .85 : .83));
    }
  }
});

test('compulsory state targets have the required resident-weighted national mean and preserve early ballots', () => {
  const calibration = calibrateMandatoryTurnout({ populationByState: { AA: 1000, BB: 700, CC: 25, DD: 230 }, baselineRatesByState: { AA: .5, BB: .9, CC: .1, DD: .7 } });
  assert.equal(calibration.status, 'ready'); near(calibration.weightedRate, .98);
  assert.ok(Object.values(calibration.stateRates).every((r) => r >= .95 && r <= 1));
  const early = adjust('mandatory-turnout', [cohort('d', 'white', 'dem')], { phase: 'early', nationalCalibration: calibration });
  const batch = quoteVotingCheckpoint({ adjusted: early, phase: 'early', eligibleUnitsByCohort: { d: 20 } });
  const cast = batch.cohorts[0].castUnits;
  const final = adjust('mandatory-turnout', [cohort('d', 'white', 'dem', { earlyCastUnits: cast })], { nationalCalibration: calibration });
  const election = quoteVotingCheckpoint({ adjusted: final, phase: 'election-day' });
  near(cast + election.castUnits, 100 * calibration.stateRates.AA);
  assert.equal(quoteVotingCheckpoint({ adjusted: early, phase: 'early', eligibleUnitsByCohort: { d: 101 } }).status, 'unavailable');
  assert.equal(adjust('mandatory-turnout', [cohort('d', 'white', 'dem')]).status, 'unavailable');
});

test('Current preserves native first-choice ballots, including independent votes and early batch arithmetic', () => {
  const nativeVotes = { dem: 100, rep: 110, ind: 30, lib: 8, grn: 2 };
  assert.deepEqual(currentRuleBallotParity({ nativeVotes }).votes, nativeVotes);
  const earlyBallots = { electorate: 1000, count: 100, votes: { dem: 45, rep: 40, ind: 15 } };
  assert.deepEqual(currentRuleBallotParity({ nativeVotes, earlyBallots }).votes, { dem: 135, rep: 139, ind: 42, lib: 7.2, grn: 1.8 });
});

test('population quotes sum to exactly $2.5M per eligible state and apply equally to actors', () => {
  const populationTable = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`S${i}`, 100000 + i * 50000]));
  const table = volunteerCostTable(populationTable);
  assert.equal(table.totalCents, 12750); assert.equal(Object.values(table.costsM).reduce((sum, cost) => sum + Math.round(cost * 100), 0), 12750);
  const args = { ruleId: 'current', actionId: 'volunteers', stateId: 'S3', population: populationTable.S3, populationTable, campaignWeek: 3, totalWeeks: 14 };
  assert.deepEqual(fieldActionRules({ ...args, actor: 'player' }), fieldActionRules({ ...args, actor: 'rival' }));
  assert.equal(fieldActionRules({ ...args, population: 2 }).status, 'unavailable');
});

test('four/five EV boundary and hidden final-week effect apply after staff without scaling costs', () => {
  const args = { ruleId: 'automatic-registration', stateId: 'AA', campaignWeek: 14, totalWeeks: 14 };
  assert.equal(fieldActionRules({ ...args, actionId: 'visit', electoralVotes: 4 }).rallyMultiplier, 1.75);
  assert.equal(fieldActionRules({ ...args, actionId: 'visit', electoralVotes: 5 }).rallyMultiplier, 1);
  const quote = fieldActionRules({ ...args, actionId: 'field-operation' });
  assert.equal(quote.fieldMultiplier, 2);
  const volunteer = { ...args, actionId: 'volunteers', population: 100, populationTable: { AA: 100 } };
  assert.equal(fieldActionRules({ ...volunteer, actor: 'player' }).fieldMultiplier, 2);
  assert.deepEqual(fieldActionRules({ ...volunteer, actor: 'player' }), fieldActionRules({ ...volunteer, actor: 'rival' }));
  assert.equal(fieldActionRules({ ...args, campaignWeek: 13, actionId: 'field-operation' }).fieldMultiplier, 1);
  assert.equal(fieldActionRules({ ...args, ruleId: 'current', actionId: 'field-operation' }).fieldMultiplier, 1);
  const effect = applyFieldEffectMultipliers({ quote, effects: { turnoutPoints: 1.1, fatigue: 2, costM: 3, groupShifts: { youth: .2 } } });
  near(effect.effects.turnoutPoints, 2.2); near(effect.effects.groupShifts.youth, .4); assert.equal(effect.effects.fatigue, 2); assert.equal(effect.effects.costM, 3);
  assert.equal(applyFieldEffectMultipliers({ quote, effects: {}, alreadyApplied: true }).status, 'unavailable');
});

test('real staff pools yield nine distinct legal choices and no ongoing charges', () => {
  const offered = NONTRADITIONAL_STAFF_ROSTER.slice(0, 3).map((s) => s.id);
  const staffing = createInitialTraditionalStaffing({ nonTraditionalSelectionPoolIds: offered });
  const ids = [...TRADITIONAL_STAFF_ROSTER.map((s) => s.id), ...offered];
  for (let previewRoll = 1; previewRoll <= 100; previewRoll += 1) {
    const picked = randomizeStaff({ campaignId: 'fixture', previewRoll, eligibleIds: ids });
    assert.equal(picked.length, 9); assert.equal(new Set(picked).size, 9); assert.ok(!picked.includes('chief'));
    assert.ok(picked.every((id) => ids.includes(id)));
    assert.equal(selectInitialTraditionalStaff(picked, staffing, 'fixture').ok, true);
    assert.deepEqual(picked, randomizeStaff({ campaignId: 'fixture', previewRoll, eligibleIds: [...ids].reverse() }));
  }
  assert.notDeepEqual(randomizeStaff({ campaignId: 'fixture', previewRoll: 1, eligibleIds: ids }), randomizeStaff({ campaignId: 'fixture', previewRoll: 2, eligibleIds: ids }));
  assert.deepEqual(staffWeeklyUpkeep(), { totalM: 0, lines: [] });
  assert.deepEqual(planBuild38StaffFinance({ baseExpensesM: 2.4, historicalReceiptIds: ['past-charge'] }), { status: 'ready', expensesM: 2.4, staffUpkeep: { totalM: 0, lines: [] }, historicalReceiptIds: ['past-charge'] });
  assert.equal(staffSetupDrawback('High weekly upkeep; a penalty remains.'), 'a penalty remains.');
});

test('governor adjustment is once-only and legacy-safe, including four-party input', () => {
  const q = calibrateGovernorOpening({ stateId: 'AA', openingMarginDMinusR: 10, scenario: { campaignType: 'new' } });
  assert.equal(q.openingMarginDMinusR, 8); assert.equal(q.openingOffset, -2);
  assert.equal(13 + q.openingOffset, 11); // later 3-point movement is not scaled
  assert.equal(calibrateGovernorOpening({ stateId: 'AA', openingMarginDMinusR: 10, scenario: { campaignType: 'legacy' } }).openingOffset, 0);
  assert.equal(calibrateFourPartyGovernorLead({ stateId: 'AA', openingLead: 20, scenario: { campaignType: 'new' } }).openingLead, 16);
});
