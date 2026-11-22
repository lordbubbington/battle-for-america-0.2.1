import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NONTRADITIONAL_STAFF_ROSTER,
  NONTRADITIONAL_STAFF_SCHEMA_VERSION,
  validateNonTraditionalStaffRoster,
} from '../../data/nonTraditionalStaffRoster.js';
import { TRADITIONAL_STAFF_ROSTER } from '../../data/traditionalStaffRoster.js';
import {
  createNonTraditionalStaffState,
  listNonTraditionalActionOptions,
  planNonTraditionalStaffEffect,
  planNonTraditionalStaffHire,
  planNonTraditionalStaffSelection,
  planNonTraditionalStaffUpkeep,
  sampleNonTraditionalSelectionPool,
  validateNonTraditionalStaffState,
} from '../nonTraditionalStaffRules.js';
import { NONTRADITIONAL_EFFECT_SPECS, applyNonTraditionalResolverInputs, validateNonTraditionalEffectSpecs } from '../nonTraditionalStaffEffects.js';
import { projectStateLegislatureSeats } from '../stateLegislatureSeatForecast.js';
import { STATE_LEGISLATURE_RESULTS_2024, STATE_LEGISLATURE_RESULTS_2024_SOURCE, STATE_LEGISLATURE_RESULTS_2024_TOTALS } from '../../data/stateLegislatureResults2024.js';
import { STATE_LEGISLATURE_SEATS_2028, validateStateLegislatureSeatData } from '../../data/stateLegislatureSeats2028.js';

const traditionalIds = TRADITIONAL_STAFF_ROSTER.map(({ id }) => id);

function completeStaffing(activeNonTraditionalIds = []) {
  const pool = [...activeNonTraditionalIds];
  for (const profile of NONTRADITIONAL_STAFF_ROSTER) {
    if (pool.length === 3) break;
    if (!pool.includes(profile.id)) pool.push(profile.id);
  }
  const setup = createNonTraditionalStaffState(pool);
  const result = planNonTraditionalStaffSelection({
    staffState: setup,
    selectedTraditionalIds: traditionalIds.slice(0, 10 - activeNonTraditionalIds.length),
    selectedNonTraditionalIds: activeNonTraditionalIds,
  });
  assert.equal(result.ok, true, result.errors?.join('\n'));
  return result.staffing;
}

test('nontraditional catalog has thirty distinct profiles, effect IDs, and portraits without signing fees', () => {
  const validation = validateNonTraditionalStaffRoster();
  assert.equal(validation.valid, true, validation.errors.join('\n'));
  assert.equal(validation.count, 30);
  assert.equal(new Set(NONTRADITIONAL_STAFF_ROSTER.map(({ id }) => id)).size, 30);
  assert.equal(new Set(NONTRADITIONAL_STAFF_ROSTER.map(({ effectId }) => effectId)).size, 30);
  assert.ok(NONTRADITIONAL_STAFF_ROSTER.every(({ effect, effectId, weeklyUpkeep, signingCost }) => (
    effect.id === effectId && Number.isFinite(weeklyUpkeep) && signingCost === undefined
  )));
  assert.equal(NONTRADITIONAL_STAFF_SCHEMA_VERSION, 2);
});

test('2024 chamber aggregates reconcile to the published national table', () => {
  assert.deepEqual(STATE_LEGISLATURE_RESULTS_2024_TOTALS, { seats: 7386, dem: 3227, rep: 4090, other: 69 });
  assert.equal(STATE_LEGISLATURE_RESULTS_2024.length, 99);
  assert.equal(STATE_LEGISLATURE_RESULTS_2024_SOURCE.status, 'unofficial-preliminary');
});

test('seat catalog has one equal-weight record per statutory seat and preserves unavailable mappings', () => {
  const validation = validateStateLegislatureSeatData();
  assert.equal(validation.valid, true, validation.errors.join('\n'));
  assert.equal(validation.seatCount, 7386);
  assert.ok(STATE_LEGISLATURE_SEATS_2028.every((seat) => seat.voterWeight === 1));
  assert.equal(STATE_LEGISLATURE_SEATS_2028.filter((seat) => Number.isFinite(seat.baselineLeanDMinusR)).length, 543);
  assert.equal(STATE_LEGISLATURE_SEATS_2028.filter((seat) => seat.holderName2024).length, 6935);
  const priorCycleSeats = STATE_LEGISLATURE_SEATS_2028.filter((seat) => seat.priorElectionYear != null);
  assert.equal(priorCycleSeats.length, 1235);
  assert.equal(priorCycleSeats.filter((seat) => seat.holderSource?.sourceId === 'electionwrld-2022').length, 513);
  assert.deepEqual(
    Object.fromEntries(['LA', 'MD', 'MS', 'NE', 'NJ', 'VA'].map((state) => [state, priorCycleSeats.filter((seat) => seat.state === state).length])),
    { LA: 76, MD: 188, MS: 174, NE: 24, NJ: 120, VA: 140 },
  );
  assert.equal(priorCycleSeats.filter((seat) => seat.holderSource?.sourceId === 'electionwrld-2022' && seat.seatUpIn2028 === null).length, 7);
  assert.ok(priorCycleSeats.every((seat) => (
    [2022, 2023].includes(seat.priorElectionYear)
    && seat.holderSource?.url
    && seat.holderSource?.notesUrl
    && [false, null].includes(seat.seatUpIn2028)
    && seat.baselineLeanDMinusR === null
  )));
  const washington = STATE_LEGISLATURE_SEATS_2028.filter((seat) => seat.state === 'WA' && seat.chamber === 'lower');
  assert.equal(washington.length, 98);
  assert.equal(washington.filter((seat) => seat.holderParty2024 === 'dem').length, 59);
  const waSeat = washington.find((seat) => seat.districtId === '1' && seat.position === 1);
  assert.deepEqual(waSeat.raceVotes, { dem: 55168, rep: 24467 });
  assert.equal(waSeat.holderBallotPreference2024, 'Prefers Democratic Party');
  const samePartyRace = washington.find((seat) => seat.districtId === '2' && seat.position === 2);
  assert.equal(samePartyRace.baselineLeanDMinusR, null);
  const washingtonSenate = STATE_LEGISLATURE_SEATS_2028.filter((seat) => seat.state === 'WA' && seat.chamber === 'upper');
  assert.equal(washingtonSenate.filter((seat) => seat.holderParty2024).length, 49);
  assert.equal(washingtonSenate.filter((seat) => seat.seatUpIn2028 === true).length, 25);
  assert.equal(washingtonSenate.filter((seat) => Number.isFinite(seat.baselineLeanDMinusR)).length, 20);
  const washingtonSenateSeat = washingtonSenate.find((seat) => seat.districtId === '3');
  assert.equal(washingtonSenateSeat.holderName2024, 'Marcus Riccelli');
  assert.deepEqual(washingtonSenateSeat.raceVotes, { dem: 45497, rep: 29555 });
  assert.equal(washingtonSenateSeat.holderSource.status, 'official-certified-state-results');
  const washingtonRecount = washingtonSenate.find((seat) => seat.districtId === '18');
  assert.deepEqual(washingtonRecount.raceVotes, { dem: 42054, rep: 41881 });
  assert.equal(washingtonRecount.leanSource.status, 'official-certified-recount');
  assert.equal(washingtonSenate.find((seat) => seat.districtId === '1').baselineLeanDMinusR, null);
  assert.equal(STATE_LEGISLATURE_SEATS_2028.filter((seat) => seat.state === 'DE' && seat.chamber === 'lower' && seat.holderParty2024 === 'dem').length, 27);
  const priorRace = STATE_LEGISLATURE_SEATS_2028.find((seat) => seat.state === 'DE' && seat.chamber === 'lower' && seat.districtId === '1');
  assert.equal(priorRace.baselineRaceYear, 2022);
  assert.equal(priorRace.baselineStateRaceYear, 2022);
});

test('seat validation rejects leans that do not reconcile to sourced same-cycle vote totals', () => {
  const seatId = 'WA:upper:seat-003';
  const seats = STATE_LEGISLATURE_SEATS_2028.map((seat) => seat.seatId === seatId
    ? { ...seat, baselineLeanDMinusR: seat.baselineLeanDMinusR + 1 }
    : seat);
  const result = validateStateLegislatureSeatData({ seats });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes(`${seatId} lean does not reconcile`)));
  const missingVotes = validateStateLegislatureSeatData({ seats: seats.map((seat) => seat.seatId === seatId ? { ...seat, raceVotes: null } : seat) });
  assert.equal(missingVotes.valid, false);
  assert.ok(missingVotes.errors.some((error) => error.includes(`${seatId} has a lean without verified`)));
});

test('three nontraditional choices are deterministic, distinct, and saved once per campaign seed', () => {
  const first = sampleNonTraditionalSelectionPool('campaign-seed-42');
  assert.deepEqual(first, sampleNonTraditionalSelectionPool('campaign-seed-42'));
  assert.equal(first.length, 3);
  assert.equal(new Set(first).size, 3);
  assert.notDeepEqual(first, sampleNonTraditionalSelectionPool('different-seed'));
  assert.throws(() => sampleNonTraditionalSelectionPool(''), /campaign seed/);
});

test('setup state saves exactly the three sampled IDs without activating them', () => {
  const choices = sampleNonTraditionalSelectionPool('setup-seed');
  const staffing = createNonTraditionalStaffState(choices);
  assert.equal(validateNonTraditionalStaffState(staffing).valid, true);
  assert.deepEqual(staffing.nonTraditionalSelectionPoolIds, choices);
  assert.deepEqual(staffing.nonTraditionalActiveIds, []);
  assert.deepEqual(staffing.traditionalActiveIds, ['chief']);
  assert.equal(staffing.initialSelectionComplete, false);
  assert.throws(() => createNonTraditionalStaffState([choices[0], choices[0], choices[2]]), /exactly three unique/);
  assert.throws(() => createNonTraditionalStaffState([choices[0], choices[1], 'constructor']), /exactly three unique/);
});

test('confirmed staffing keeps only selected profiles and fills ten positions with zero through three nontraditional staff', () => {
  for (const selectedIds of [[], ['etsy-witch'], ['etsy-witch', 'ghost-medium', 'bot-farm-director']]) {
    const selectionPoolIds = [...new Set([...selectedIds, ...NONTRADITIONAL_STAFF_ROSTER.map(({ id }) => id).filter((id) => !selectedIds.includes(id))])].slice(0, 3);
    const initial = createNonTraditionalStaffState(selectionPoolIds);
    const selectedTraditionalIds = traditionalIds.slice(0, 10 - selectedIds.length);
    const result = planNonTraditionalStaffSelection({ staffState: initial, selectedTraditionalIds, selectedNonTraditionalIds: selectedIds });
    assert.equal(result.ok, true, result.errors?.join('\n'));
    assert.equal(result.staffing.initialSelectionComplete, true);
    assert.equal(result.staffing.traditionalActiveIds.length + result.staffing.nonTraditionalActiveIds.length, 10);
    assert.deepEqual(result.staffing.nonTraditionalActiveIds, selectedIds);
    assert.equal(Object.hasOwn(result.staffing, 'nonTraditionalSelectionPoolIds'), false);
    assert.ok(selectedIds.every((id) => JSON.stringify(result.staffing).includes(id)));
    assert.ok(selectionPoolIds.filter((id) => !selectedIds.includes(id)).every((id) => !JSON.stringify(result.staffing).includes(id)));
    assert.equal(validateNonTraditionalStaffState(result.staffing).valid, true);
  }
});

test('selection rejects outsiders, missing Chief, nontraditional over-selection, and incomplete rosters', () => {
  const pool = ['etsy-witch', 'ghost-medium', 'bot-farm-director'];
  const setup = createNonTraditionalStaffState(pool);
  const validTraditional = traditionalIds.slice(0, 9);
  assert.equal(planNonTraditionalStaffSelection({ staffState: setup, selectedTraditionalIds: validTraditional.slice(1), selectedNonTraditionalIds: ['etsy-witch'] }).reason, 'chief-required');
  assert.equal(planNonTraditionalStaffSelection({ staffState: setup, selectedTraditionalIds: validTraditional, selectedNonTraditionalIds: ['not-sampled'] }).reason, 'nontraditional-selection-invalid');
  assert.equal(planNonTraditionalStaffSelection({ staffState: setup, selectedTraditionalIds: validTraditional.slice(0, 7), selectedNonTraditionalIds: ['etsy-witch'] }).reason, 'ten-active-staff-required');
  assert.equal(planNonTraditionalStaffSelection({ staffState: setup, selectedTraditionalIds: traditionalIds.slice(0, 8), selectedNonTraditionalIds: pool }).reason, 'ten-active-staff-required');
  assert.equal(planNonTraditionalStaffSelection({ staffState: setup, selectedTraditionalIds: [...validTraditional.slice(0, 8), 'unknown-role'], selectedNonTraditionalIds: ['etsy-witch'] }).reason, 'traditional-selection-invalid');
});

test('weekly upkeep charges selected staff only at the first weekly boundary and is idempotent', () => {
  const staffing = completeStaffing(['etsy-witch', 'ghost-medium', 'bot-farm-director']);
  const opening = planNonTraditionalStaffUpkeep({ staffState: staffing, campaignId: 'c1', week: 0 });
  assert.equal(opening.total, 0);
  const upkeep = planNonTraditionalStaffUpkeep({ staffState: staffing, campaignId: 'c1', week: 1 });
  assert.equal(upkeep.total, 6);
  assert.deepEqual(upkeep.lines.map(({ staffId }) => staffId), staffing.nonTraditionalActiveIds);
  assert.equal(planNonTraditionalStaffUpkeep({ staffState: staffing, campaignId: 'c1', week: 1, appliedReceiptIds: [upkeep.receiptId] }).reason, 'already-applied');
  assert.equal(planNonTraditionalStaffUpkeep({ staffState: completeStaffing([]), campaignId: 'c1', week: 1 }).total, 0);
});

test('legacy separate hiring is disabled and effects require selected active staff plus real receipts', () => {
  const staffing = completeStaffing(['etsy-witch']);
  assert.equal(planNonTraditionalStaffHire({ staffState: staffing, staffId: 'etsy-witch' }).reason, 'separate-hiring-removed');
  const evidence = { naturalRandomRoll: true, firstRollForActor: true, actor: 'player' };
  const receipt = { receiptId: 'r1', campaignId: 'c1', week: 1, actionId: 'visit', receiptType: 'campaign-action', committed: true, evidence };
  const base = { staffState: staffing, staffId: 'etsy-witch', campaignId: 'c1', week: 1, sourceReceipt: receipt };
  const plan = planNonTraditionalStaffEffect(base);
  assert.equal(plan.ok, true);
  assert.equal(plan.command.effectId, NONTRADITIONAL_STAFF_ROSTER[0].effectId);
  assert.equal(applyNonTraditionalResolverInputs({ qualityRoll: 0.98 }, plan.command).qualityRoll, 1);
  assert.equal(planNonTraditionalStaffEffect({ ...base, sourceReceipt: { ...receipt, committed: false } }).reason, 'ineligible-source-receipt');
  assert.equal(planNonTraditionalStaffEffect({ ...base, appliedEffectReceiptIds: [plan.command.receiptId] }).reason, 'effect-use-limit-reached');
  const inactive = completeStaffing([]);
  assert.equal(planNonTraditionalStaffEffect({ ...base, staffState: inactive }).reason, 'staff-not-active');
});

test('action unlocks use only active staff, native-eligible targets, and normal action costs', () => {
  const staffState = completeStaffing(['influencer-director', 'podcast-consultant']);
  const context = {
    eligibleInfluencerIds: ['creator-a'],
    inActiveAgenda: false,
    interviewTargets: [
      { legal: true, issueId: 'jobs', reachableGroupIds: ['existing-group'] },
      { legal: false, issueId: 'not-legal', reachableGroupIds: ['existing-group'] },
    ],
  };
  const options = listNonTraditionalActionOptions({ staffState, campaignId: 'c1', week: 0, availableActions: 1, context });
  assert.equal(options.length, 2);
  assert.equal(options[0].actionCost, 1);
  assert.deepEqual(options[1].targets.map((target) => target.issueId), ['jobs']);
  assert.equal(listNonTraditionalActionOptions({ staffState, campaignId: 'c1', week: 0, availableActions: 0, context }).length, 0);
  const agenda = listNonTraditionalActionOptions({ staffState, campaignId: 'c1', week: 0, availableActions: 0, context: { ...context, inActiveAgenda: true } });
  assert.equal(agenda[0].actionCost, 0);
  assert.ok(agenda.every(({ staffId }) => staffState.nonTraditionalActiveIds.includes(staffId)));
  const usedReceipt = 'c1:week-0:nontraditional-staff:influencer-director:v1:weekly';
  const afterUse = listNonTraditionalActionOptions({ staffState, campaignId: 'c1', week: 0, availableActions: 1, context, appliedEffectReceiptIds: [usedReceipt] });
  assert.deepEqual(afterUse.map(({ id }) => id), ['podcast-interview']);
});

test('all thirty effects require profile-specific evidence and remain bounded at the native seam', () => {
  assert.equal(Object.keys(NONTRADITIONAL_EFFECT_SPECS).length, 30);
  assert.equal(validateNonTraditionalEffectSpecs().valid, true);
  for (const profile of NONTRADITIONAL_STAFF_ROSTER) {
    const spec = NONTRADITIONAL_EFFECT_SPECS[profile.id];
    assert.ok(spec, profile.id);
    const evidence = Object.fromEntries([
      ...spec.truths.map((key) => [key, true]),
      ...spec.strings.map((key) => [key, 'evidence']),
      ...spec.lists.map((key) => [key, ['existing-group']]),
    ]);
    for (const key of spec.booleans || []) evidence[key] = false;
    if (spec.actors) evidence.actor = 'player';
    if (spec.equal) evidence[spec.equal[1]] = evidence[spec.equal[0]];
    const staffing = completeStaffing([profile.id]);
    const sourceReceipt = {
      receiptId: `receipt-${profile.id}`,
      campaignId: 'c1',
      week: 1,
      actionId: profile.effect.actionIds[0],
      receiptType: profile.effect.receiptTypes[0],
      committed: true,
      evidence,
    };
    const plan = planNonTraditionalStaffEffect({ staffState: staffing, staffId: profile.id, campaignId: 'c1', week: 1, sourceReceipt });
    assert.equal(plan.ok, true, `${profile.id}: ${plan.reason}`);
    assert.equal(plan.command.effectId, profile.effectId);
    const missing = planNonTraditionalStaffEffect({ staffState: staffing, staffId: profile.id, campaignId: 'c1', week: 1, sourceReceipt: { ...sourceReceipt, evidence: {} } });
    assert.equal(missing.reason, 'effect-evidence-required', profile.id);
    assert.ok(plan.command.adjustments.every((item) => item.operation !== 'multiply' || (item.factor >= 0.9 && item.factor <= 1.1)), profile.id);
  }
});

test('seat projection leaves missing leans unresolved and keeps calls separate', () => {
  const seats = [
    { seatId: 's1', state: 'AA', chamber: 'lower', seatUpIn2028: true, baselineLeanDMinusR: 2, holderParty2024: 'rep', voterWeight: 1 },
    { seatId: 's2', state: 'AA', chamber: 'lower', seatUpIn2028: true, baselineLeanDMinusR: null, holderParty2024: 'dem', voterWeight: 1 },
  ];
  const schedules = [{ abbr: 'AA', name: 'Test State', chambers: [{ chamber: 'lower', totalSeats: 2, seatsUp2028: 2 }] }];
  const result = projectStateLegislatureSeats({ stateGeneric: { AA: -1 } }, {
    seats,
    schedules,
    resultsByState: { AA: [{ chamber: 'lower', dem: 1, rep: 1, other: 0, totalSeats: 2 }] },
    actualCalls: [{ seatId: 's1', party: 'rep', source: 'official call' }],
  });
  const chamber = result.byState.AA.chambers[0];
  assert.equal(chamber.forecasts[0].projectedParty, 'dem');
  assert.equal(chamber.forecasts[1].unresolvedReason, 'seat-lean-unavailable');
  assert.equal(chamber.forecastCounts.unresolved, 1);
  assert.equal(chamber.calls[0].party, 'rep');
  assert.equal(chamber.forecasts[0].projectedParty, 'dem');
});

test('four-party projections use the supplied shared share resolver and remain unresolved without it', () => {
  const seats = [{ seatId: 's1', state: 'AA', chamber: 'lower', seatUpIn2028: true, baselineLeanDMinusR: 2, voterWeight: 1 }];
  const schedules = [{ abbr: 'AA', name: 'Test', chambers: [{ chamber: 'lower', totalSeats: 1, seatsUp2028: 1 }] }];
  const game = { thirdMode: 'surge', stateGeneric: { AA: 0 } };
  assert.equal(projectStateLegislatureSeats(game, { seats, schedules }).byState.AA.chambers[0].forecasts[0].unresolvedReason, 'shared-multiparty-resolver-unavailable');
  const projection = projectStateLegislatureSeats(game, {
    seats,
    schedules,
    resolveVoteShares: () => ({ dem: 25, rep: 24, lib: 30, grn: 21 }),
  });
  assert.equal(projection.byState.AA.chambers[0].forecasts[0].projectedParty, 'lib');
});
