import test from 'node:test';
import assert from 'node:assert/strict';
import { ballotsFromCohortSnapshot, createCohortBallotLedger, inspectCohortBallotLedger, recordCohortEarlyBallots, composeCohortElection, tallyRecordedRankings, nationalPopularVote, resolveCohortScenario, electionRuleInputs, migrateEmptyAggregateLedger } from '../../src/lib/cohortBallots.js';

const ballot = (ranking, count, rankingComplete = true) => ({ ranking, count, rankingComplete });
const cohorts = [
  { stateId: 'PA', cohortId: 'one', districtId: 'PA-01', population: 50 },
  { stateId: 'PA', cohortId: 'two', districtId: 'PA-02', population: 50 },
];

test('cohort tally preserves the D+1 early and Election Day example', () => {
  const start = createCohortBallotLedger({ campaignId: 'example', cohorts: [{ stateId: 'PA', cohortId: 'all', population: 100 }] });
  const early = recordCohortEarlyBallots({ ledger: start, stateId: 'PA', week: 12, checkpoint: 'end', castByCohort: [{
    cohortId: 'all', eligibleVolume: 100 / 3,
    ballots: ballotsFromCohortSnapshot({ eligibleVolume: 100 / 3, support: { dem: 52.5, rep: 47.5 }, turnout: { dem: 1, rep: 1 } }),
  }] }).ledger;
  const final = composeCohortElection({ ledger: early, stateId: 'PA', electionDayByCohort: [{
    cohortId: 'all', eligibleVolume: 200 / 3,
    ballots: ballotsFromCohortSnapshot({ eligibleVolume: 200 / 3, support: { dem: 49.5, rep: 50.5 }, turnout: { dem: 1, rep: 1 } }),
  }] });
  assert.ok(Math.abs(final.votes.dem - 50.5) < 1e-8);
  assert.ok(Math.abs(final.votes.rep - 49.5) < 1e-8);
});

test('cohort snapshots apply turnout and keep absent rankings explicitly incomplete', () => {
  const ballotGroups = ballotsFromCohortSnapshot({ eligibleVolume: 100, support: { dem: 40, rep: 35, lib: 25 },
    turnout: { dem: 0.5, rep: 1, lib: 0.8 }, rankingsByParty: {
      dem: [{ ranking: ['dem', 'lib', 'rep'], fraction: 0.25 }, { ranking: ['dem', 'rep', 'lib'], fraction: 0.75 }],
    } });
  assert.equal(ballotGroups.reduce((sum, item) => sum + item.count, 0), 75);
  assert.equal(ballotGroups.filter((item) => item.ranking[0] === 'dem').reduce((sum, item) => sum + item.count, 0), 20);
  assert.equal(ballotGroups.find((item) => item.ranking[0] === 'rep').rankingComplete, false);
  assert.equal(tallyRecordedRankings(ballotGroups, ['dem', 'rep', 'lib']).status, 'unavailable');
  assert.throws(() => ballotsFromCohortSnapshot({ eligibleVolume: 10, support: { dem: 100 }, turnout: { dem: 1 },
    rankingsByParty: { dem: [{ ranking: ['rep', 'dem'], fraction: 1 }] } }), /Invalid recorded rankings/);
});

test('independent and four-party votes are retained in the same tally', () => {
  const ledger = createCohortBallotLedger({ campaignId: 'five-way', cohorts: [{ stateId: 'AZ', cohortId: 'all', population: 100 }] });
  const groups = ballotsFromCohortSnapshot({ eligibleVolume: 100, support: { dem: 30, rep: 30, lib: 15, grn: 15, ind: 10 },
    turnout: { dem: 1, rep: 1, lib: 1, grn: 1, ind: 1 } });
  const result = composeCohortElection({ ledger, stateId: 'AZ', electionDayByCohort: [{ cohortId: 'all', eligibleVolume: 100, ballots: groups }] });
  assert.deepEqual(result.votes, { dem: 30, rep: 30, lib: 15, grn: 15, ind: 10 });
  assert.deepEqual(nationalPopularVote([result], ['AZ']).votes, result.votes);
});

test('cohort receipts lock cast voters and provide statewide, district and ranked tallies', () => {
  const original = createCohortBallotLedger({ campaignId: 'campaign', cohorts });
  const input = { ledger: original, stateId: 'PA', week: 12, checkpoint: 'end', castByCohort: [
    { cohortId: 'one', districtId: 'PA-01', eligibleVolume: 20, ballots: [ballot(['dem', 'rep', 'lib'], 20)] },
    { cohortId: 'two', districtId: 'PA-02', eligibleVolume: 10, ballots: [ballot(['rep', 'dem', 'lib'], 10)] },
  ] };
  const committed = recordCohortEarlyBallots(input);
  assert.equal(original.batches.length, 0);
  assert.equal(committed.created, true);
  assert.equal(inspectCohortBallotLedger(committed.ledger).valid, true);
  const loaded = JSON.parse(JSON.stringify(committed.ledger));
  assert.equal(recordCohortEarlyBallots({ ...input, ledger: loaded }).created, false);
  const result = composeCohortElection({ ledger: loaded, stateId: 'PA', electionDayByCohort: [
    { cohortId: 'one', eligibleVolume: 30, ballots: [ballot(['rep', 'dem', 'lib'], 15), ballot(['dem', 'rep', 'lib'], 15)] },
    { cohortId: 'two', eligibleVolume: 40, ballots: [ballot(['lib', 'dem', 'rep'], 20), ballot(['rep', 'dem', 'lib'], 20)] },
  ] });
  assert.equal(result.totalBallots, 100);
  assert.deepEqual(result.votes, { dem: 35, rep: 45, lib: 20 });
  assert.deepEqual(result.districtResults.votesByDistrict['PA-01'], { dem: 35, rep: 15 });
  assert.deepEqual(result.districtResults.votesByDistrict['PA-02'], { rep: 30, lib: 20 });
  const ranked = tallyRecordedRankings(result.ballotGroups, ['dem', 'rep', 'lib']);
  assert.equal(ranked.status, 'available');
  assert.equal(ranked.winner, 'dem');
  assert.equal(ranked.rounds[0].eliminated, 'lib');
  assert.equal(electionRuleInputs({ result, electoralRule: 'standard', thirdMode: 'fringe' }).state.winner, 'rep');
  assert.deepEqual(electionRuleInputs({ result, electoralRule: 'proportional', thirdMode: 'fringe' }).firstChoiceVotes, result.votes);
  const districtInputs = electionRuleInputs({ result, electoralRule: 'district', thirdMode: 'surge',
    candidateOrder: ['dem', 'rep', 'lib'], expectedDistrictIds: ['PA-01', 'PA-02'] });
  assert.equal(districtInputs.state.winner, 'dem');
  assert.equal(districtInputs.districts['PA-01'].winner, 'dem');
  assert.equal(districtInputs.districts['PA-02'].winner, 'rep');
  assert.equal(electionRuleInputs({ result, electoralRule: 'district', thirdMode: 'fringe' }).reason, 'missing-district-ballots-or-schedule');
  assert.equal(electionRuleInputs({ result: { ...result, totalBallots: 99 }, electoralRule: 'standard', thirdMode: 'fringe' }).reason, 'ballot-total-mismatch');
  assert.deepEqual(nationalPopularVote([result], ['PA']).votes, result.votes);
  assert.equal(nationalPopularVote([result, result], ['PA']).reason, 'invalid-or-duplicate-state-tally');
  assert.equal(nationalPopularVote([result], ['PA', 'ME']).reason, 'incomplete-state-tallies');
  const alternate = composeCohortElection({ ledger: loaded, stateId: 'PA', electionDayByCohort: [
    { cohortId: 'one', eligibleVolume: 30, ballots: [ballot(['lib', 'dem', 'rep'], 30)] },
    { cohortId: 'two', eligibleVolume: 40, ballots: [ballot(['lib', 'dem', 'rep'], 40)] },
  ] });
  assert.deepEqual(alternate.ballotGroups.filter((item) => item.phase === 'early'), result.ballotGroups.filter((item) => item.phase === 'early'),
    'forecast changes to uncast ballots do not alter already-cast votes');
  const restored = resolveCohortScenario({ savedResult: JSON.parse(JSON.stringify(result)), stateId: 'PA', ledger: loaded,
    electionDayByCohort: [] });
  assert.equal(restored.status, 'restored');
  assert.deepEqual(restored.result.votes, result.votes, 'saved Election Night result is retained instead of recalculated');
  assert.equal(resolveCohortScenario({ savedResult: { ...result, stateId: 'ME' }, stateId: 'PA' }).reason, 'invalid-saved-state-result');
  assert.throws(() => composeCohortElection({ ledger: loaded, stateId: 'PA', electionDayByCohort: [
    { cohortId: 'one', eligibleVolume: 31, ballots: [ballot(['dem'], 31)] },
    { cohortId: 'two', eligibleVolume: 40, ballots: [] },
  ] }), /exceed uncast cohort/);
});

test('unavailable district and ranked data stay unavailable; incomplete cohorts fail closed', () => {
  const ledger = createCohortBallotLedger({ campaignId: 'campaign', cohorts: [{ stateId: 'ME', cohortId: 'm', population: 10 }] });
  const result = composeCohortElection({ ledger, stateId: 'ME', electionDayByCohort: [
    { cohortId: 'm', eligibleVolume: 10, ballots: [ballot(['dem'], 10, false)] },
  ] });
  assert.equal(result.districtResults.status, 'unavailable');
  assert.equal(tallyRecordedRankings(result.ballotGroups, ['dem', 'rep']).reason, 'missing-ranked-preferences');
  assert.equal(composeCohortElection({ ledger, stateId: 'ME', electionDayByCohort: [] }).reason, 'missing-uncast-cohort-ballots');
  assert.throws(() => recordCohortEarlyBallots({ ledger, stateId: 'ME', week: 3, checkpoint: 'end', castByCohort: [
    { cohortId: 'm', eligibleVolume: 11, ballots: [ballot(['dem'], 11)] },
  ] }), /exceed remaining cohort/);
});

test('legacy aggregate ballots migrate only when no votes need fabricated cohort assignment', () => {
  assert.equal(migrateEmptyAggregateLedger({ schemaVersion: 1, campaignId: 'x', eligibleFromWeek: 4, batches: [] }, cohorts).status, 'available');
  assert.equal(migrateEmptyAggregateLedger({ schemaVersion: 1, campaignId: 'x', eligibleFromWeek: 4, batches: [{}] }, cohorts).reason, 'legacy-ballots-have-no-cohort-provenance');
});
