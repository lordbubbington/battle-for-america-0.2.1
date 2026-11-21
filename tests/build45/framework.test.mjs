import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import fs from 'node:fs';
import { candidateEventState, participatingCandidates, eligibleCandidateEvents, ensureCandidateGuarantees, recordCandidateEventPresented, recordCandidateEventResolved } from '../../src/lib/candidateEvents.js';
import { base, ticket, definition, fixtures, resume } from './framework.fixtures.mjs';

const evidence = { item: 'CEF-01', scope: 'dedicated module; native engine integration remains separate', checks: [], modes: {} };
const check = (name, fn) => test(name, () => { fn(); evidence.checks.push({ name, status: 'PASS' }); });
after(() => {
  const directory = new URL('../../../evidence/framework/', import.meta.url);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(new URL('results.json', directory), JSON.stringify(evidence, null, 2) + '\n');
});

check('old saves normalize additively, clone safely and repair malformed entries', () => {
  assert.deepEqual(candidateEventState(), { version: 1, triggeredCounts: {}, resolvedCounts: {}, queue: [], deliveredKeys: [], resolvedKeys: [] });
  const queue = { candidateId: 'shapiro', party: 'dem', eventId: 'fixture-shapiro-1', week: 11 };
  const saved = { triggeredCounts: { shapiro: -1, bad: NaN }, resolvedCounts: { shapiro: 2.8 }, queue: [null, queue, queue], deliveredKeys: ['x', 'x', null], resolvedKeys: ['y', 'y'] };
  const state = candidateEventState(saved);
  assert.equal(state.triggeredCounts.shapiro, 2);
  assert.equal(state.resolvedCounts.shapiro, 2);
  assert.equal(state.queue.length, 1);
  assert.deepEqual(state.deliveredKeys, ['x', 'y']);
  assert.deepEqual(state.resolvedKeys, ['y']);
  state.queue[0].week = 99;
  assert.equal(saved.queue[1].week, 11);
  assert.equal(candidateEventState({ ...state, resolvedKeys: [state.queue[0].key] }).queue.length, 0);
});

check('active nominees deduplicate by candidate, exclude VP/absent parties and use current party', () => {
  const game = base({ build39: { scenario: { id: 'six-party' } } });
  const nominees = [ticket('vance', 'maga'), ticket('vance', 'rep'), { ...ticket('vp-only', 'dem'), role: 'vp' }, { ...ticket('retired', 'dem'), active: false }, ticket('missing', 'localist'), null];
  assert.deepEqual(participatingCandidates(game, nominees), [ticket('vance', 'maga')]);
  assert.deepEqual(participatingCandidates(base(), [ticket('vance', 'maga')]), []);
});

check('normal pool has one equal interval per unique eligible event and no absent candidate leakage', () => {
  const game = base();
  const participants = [ticket('shapiro', 'dem'), ticket('vance', 'rep')];
  const a = definition('shapiro', 1), b = definition('shapiro', 2);
  const definitions = [a, a, b, definition('vance'), definition('not-nominated')];
  const rows = eligibleCandidateEvents(game, definitions, participants);
  assert.deepEqual(rows.map(({ definition: d }) => d.id), [a.id, b.id]);
  const existing = [{ id: 'regular-1' }, { id: 'regular-2' }];
  const pool = [...existing, ...rows.map(({ definition: d }) => d)];
  const selected = Array.from({ length: pool.length }, (_, i) => pool[Math.floor(((i + 0.5) / pool.length) * pool.length)].id);
  assert.deepEqual(selected, ['regular-1', 'regular-2', a.id, b.id]);
  assert.equal(eligibleCandidateEvents(game, definitions, participants, { usedIds: new Set([a.id]) }).length, 1);
  assert.equal(eligibleCandidateEvents(game, definitions, [], {}).length, 0);
  evidence.normalDraw = { pool: selected, intervalWidth: 1 / pool.length, duplicatedRegistrationCountedOnce: true };
});

check('eligibility rejects wrong actor/mode/week/state and respects regional and legacy ballots', () => {
  const participants = [ticket('shapiro', 'dem'), ticket('vance', 'rep')];
  assert.equal(eligibleCandidateEvents(base(), [definition('shapiro')], participants, { actingParty: 'rep' }).length, 0);
  for (const trigger of [{ minWeek: 4 }, { maxWeek: 2 }, { scenarios: ['six-party'] }, { states: ['XX'] }]) {
    assert.equal(eligibleCandidateEvents(base(), [definition('shapiro', 1, trigger)], participants).length, 0);
  }
  assert.equal(eligibleCandidateEvents(base(), [definition('shapiro', 1, { scenarios: ['two-parties'] })], participants).length, 1);
  const regional = base({ party: 'farmer-labor', build39: { scenario: { id: 'regional-parties' } } });
  const nominees = [ticket('farmer-labor', 'farmer-labor')];
  assert.equal(eligibleCandidateEvents(regional, [definition('farmer-labor', 1, { states: ['FL'] })], nominees).length, 0);
  assert.equal(eligibleCandidateEvents(regional, [definition('farmer-labor', 1, { states: ['WI'] })], nominees).length, 1);
  const legacy = base({ party: 'favorite-me', build39: { scenario: { id: 'favorite-sons-daughters' } } });
  assert.equal(eligibleCandidateEvents(legacy, [definition('favorite-me', 1, { states: ['NH'] })], [ticket('favorite-me', 'favorite-me')]).length, 1);
  assert.equal(eligibleCandidateEvents(legacy, [definition('favorite-me', 1, { states: ['VT'] })], [ticket('favorite-me', 'favorite-me')]).length, 0);
  assert.equal(eligibleCandidateEvents({ ...legacy, finished: true }, [definition('favorite-me')], [ticket('favorite-me', 'favorite-me')]).length, 0);
});

for (const fixture of fixtures) check(`${fixture.id}: all unmet tickets queue and resolve in week 12 across every resume checkpoint`, () => {
  const definitions = fixture.tickets.flatMap(({ candidateId }) => [definition(candidateId, 1), definition(candidateId, 2)]);
  let game = base({ week: 10, build39: { scenario: { id: fixture.scenario } }, build40: { modeId: fixture.id }, eventSchedule: [{ id: 'regular-1', status: 'pending' }, { id: 'regular-2', status: 'pending' }], earlyBallotLedger: { PA: { dem: 1000, rep: 900 } } });
  assert.equal(ensureCandidateGuarantees(game, definitions, fixture.tickets).queue.length, 0);
  game.week = 11;
  const before = resume(game);
  game.candidateEvents = ensureCandidateGuarantees(game, definitions, fixture.tickets);
  assert.equal(game.candidateEvents.queue.length, fixture.tickets.length);
  assert.deepEqual(ensureCandidateGuarantees(game, [...definitions].reverse(), fixture.tickets), game.candidateEvents);
  assert.deepEqual(ensureCandidateGuarantees(resume(game), definitions, fixture.tickets), game.candidateEvents);
  const selected = resume(game.candidateEvents.queue);
  const checkpoints = [];
  while (game.candidateEvents.queue.length) {
    game = resume(game);
    const entry = game.candidateEvents.queue[0];
    game.candidateEvents = recordCandidateEventPresented(game.candidateEvents, entry);
    const shown = resume(game.candidateEvents);
    assert.deepEqual(recordCandidateEventPresented(shown, entry), shown);
    game = resume(game);
    assert.equal(ensureCandidateGuarantees(game, definitions, fixture.tickets).queue[0].key, entry.key);
    game.candidateEvents = recordCandidateEventResolved(game.candidateEvents, entry);
    const resolved = resume(game.candidateEvents);
    assert.deepEqual(recordCandidateEventResolved(resolved, entry), resolved);
    checkpoints.push({ candidateId: entry.candidateId, party: entry.party, week: game.week, pendingBeforeResolve: shown.queue.length, pendingAfterResolve: resolved.queue.length });
    game.candidateEvents = ensureCandidateGuarantees(resume(game), definitions, fixture.tickets);
  }
  for (const { candidateId } of fixture.tickets) {
    assert.equal(game.candidateEvents.triggeredCounts[candidateId], 1);
    assert.equal(game.candidateEvents.resolvedCounts[candidateId], 1);
  }
  assert.equal(game.week, 11);
  assert.deepEqual(game.eventSchedule, before.eventSchedule);
  assert.deepEqual(game.earlyBallotLedger, before.earlyBallotLedger);
  evidence.modes[fixture.id] = { participants: fixture.tickets, selected, checkpoints, regularSchedulePreserved: true, ballotsPreserved: true };
});

check('early random presentation satisfies guarantee and pending cards remain blocked from random draw', () => {
  const tickets = fixtures[0].tickets;
  const definitions = tickets.map(({ candidateId }) => definition(candidateId));
  let game = base({ week: 2 });
  game.candidateEvents = recordCandidateEventPresented(undefined, { ...tickets[0], eventId: definitions[0].id, week: 2 });
  assert.equal(eligibleCandidateEvents(game, definitions, tickets).length, 0);
  game.week = 11;
  game.candidateEvents = ensureCandidateGuarantees(game, definitions, tickets);
  assert.deepEqual(game.candidateEvents.queue.map(({ candidateId }) => candidateId), ['vance']);
  assert.equal(eligibleCandidateEvents(game, definitions, tickets, { actingParty: 'rep' }).length, 0);
});

check('retired candidates disappear from queue without losing resolved history', () => {
  const tickets = fixtures[0].tickets;
  const definitions = tickets.map(({ candidateId }) => definition(candidateId));
  let game = base({ week: 11 });
  game.candidateEvents = ensureCandidateGuarantees(game, definitions, tickets);
  const old = game.candidateEvents.queue[0];
  game.candidateEvents = recordCandidateEventResolved(game.candidateEvents, old);
  const next = ensureCandidateGuarantees(game, definitions, []);
  assert.equal(next.queue.length, 0);
  assert.equal(next.resolvedCounts.shapiro, 1);
  assert.ok(next.resolvedKeys.includes(old.key));
  assert.equal(ensureCandidateGuarantees(game, [], tickets).queue.length, 0);
});

check('short campaigns use final week and finished campaigns do not enqueue', () => {
  const tickets = fixtures[0].tickets;
  const definitions = tickets.map(({ candidateId }) => definition(candidateId));
  assert.equal(ensureCandidateGuarantees(base({ totalWeeks: 8, week: 6 }), definitions, tickets).queue.length, 0);
  assert.equal(ensureCandidateGuarantees(base({ totalWeeks: 8, week: 7 }), definitions, tickets).queue.length, 2);
  assert.equal(ensureCandidateGuarantees(base({ totalWeeks: 8, week: 8 }), definitions, tickets).queue.length, 0);
  assert.equal(ensureCandidateGuarantees(base({ week: 11, finished: true }), definitions, tickets).queue.length, 0);
});

check('canonical receipts prevent duplicate resolution despite alternate caller keys', () => {
  const entry = { ...ticket('shapiro', 'dem'), eventId: 'fixture-shapiro-1', week: 11, key: 'caller-key' };
  const once = recordCandidateEventResolved(undefined, entry);
  assert.deepEqual(recordCandidateEventResolved(once, { ...entry, key: 'different-caller-key' }), once);
  assert.equal(once.triggeredCounts.shapiro, 1);
  assert.equal(once.resolvedCounts.shapiro, 1);
  assert.deepEqual(recordCandidateEventResolved(once, null), once);
});

check('player and rival selections carry their actual actor ticket identity', () => {
  const fixture = fixtures[2];
  const game = base({ build39: { scenario: { id: fixture.scenario } }, build40: { modeId: fixture.id } });
  const definitions = fixture.tickets.map(({ candidateId }) => definition(candidateId));
  const player = eligibleCandidateEvents(game, definitions, fixture.tickets)[0];
  const rival = eligibleCandidateEvents(game, definitions, fixture.tickets, { actingParty: 'maga' })[0];
  assert.equal(player.candidateId, 'shapiro');
  assert.equal(player.party, 'dem');
  assert.equal(rival.candidateId, 'vance');
  assert.equal(rival.party, 'maga');
  evidence.perspective = { player: { candidateId: player.candidateId, party: player.party }, rival: { candidateId: rival.candidateId, party: rival.party }, appliedEffects: 'Integration-owned native fixture required' };
});
