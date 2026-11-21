import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { CANDIDATE_EVENTS as cards } from '../../src/data/candidateEvents/batch-03.js';
import { eligibleCandidateEvents, ensureCandidateGuarantees, candidateEventState, recordCandidateEventPresented, recordCandidateEventResolved } from '../../src/lib/candidateEvents.js';

const roster = JSON.parse(fs.readFileSync(new URL('../../../evidence/candidate-roster.json', import.meta.url))).slice(14, 20);
const sizes = { momentum: [1, 3, 5, 10], turnout: [1, 2, 3, 6], persuasion: [0.1, 0.25, 0.5, 1], cash: [2, 5, 10, 20], group: [1, 2, 5, 10] };
const json = (value) => JSON.parse(JSON.stringify(value));
const tier = (v) => v.kind === 'scandal' ? `scandal:${v.probability}${v.severity ? ':double' : ''}` : `${v.target.side === 'opponent' ? 'opponent:' : ''}${v.amount < 0 ? '-' : '+'}${['S', 'M', 'L', 'X'][sizes[v.kind].indexOf(Math.abs(v.amount))]}`;
const signatures = {
  1: [['+L,+L,scandal:0.7'], ['-S'], ['+X,+X', '-X,-X']],
  2: [['+S,-S'], ['+L,-S,-S,-S'], ['+L,-L,+M,-M']],
  3: [['+M,-L'], ['', '-L'], ['+S', '-X']],
  4: [['+L,scandal:0.5'], ['+L,scandal:0.3'], ['+M,scandal:0.05']],
  5: [['+L,-L'], ['+S,-S'], ['+X', '-X']],
  6: [['+L,+M,+S'], ['+L,+M,+S'], ['+L,+M,+S']],
  7: [['-L,-M,-S'], ['-L,-M,-S'], ['-L,-M,-S']],
  8: [['opponent:-L,opponent:-L'], ['opponent:-X,opponent:-X', '']],
  9: [['+M,+M,scandal:1'], ['scandal:0.6:double']],
  10: [['+M'], ['+S', '+L', '+X']],
};
const probabilities = { 1: [[1], [1], [0.5, 0.5]], 2: [[1], [1], [1]], 3: [[1], [0.25, 0.75], [0.5, 0.5]], 4: [[1], [1], [1]], 5: [[1], [1], [0.5, 0.5]], 6: [[1], [1], [1]], 7: [[1], [1], [1]], 8: [[1], [0.6, 0.4]], 9: [[1], [1]], 10: [[1], [0.5, 0.45, 0.05]] };
const report = { scope: 'CE-15 through CE-20; authored catalog and dedicated scheduler. Native applied-effect integration belongs to Integration.', total: cards.length, packs: [], fixtures: [], cards };

test('all third-batch cards pass schema, exact frameworks and affordable-choice audit', () => {
  assert.equal(cards.length, 60);
  assert.equal(new Set(cards.map((c) => c.id)).size, cards.length);
  assert.equal(new Set(cards.map((c) => c.title)).size, cards.length);
  assert.equal(new Set(cards.map((c) => c.flavor)).size, cards.length);
  for (const card of cards) {
    assert.ok(card.title && card.flavor && card.authorship.grounding && card.authorship.tradeoff);
    assert.deepEqual(card.trigger, { kind: 'candidate-event', minWeek: 1, maxWeek: null, scenarios: [], states: [] });
    assert.ok(card.choices.length >= 2 && card.choices.length <= 3);
    if (card.mashup) assert.equal(card.choices.length, 3);
    assert.deepEqual(card.choices.map((c) => c.branches.map((b) => b.effects.map(tier).join(','))), signatures[card.style], card.id);
    assert.deepEqual(card.choices.map((c) => c.branches.map((b) => b.probability)), probabilities[card.style], card.id);
    assert.ok(card.choices.some((c) => c.branches.every((b) => b.effects.every((e) => e.kind !== 'cash' || e.amount >= 0))), `${card.id}: zero cash path`);
    assert.equal(new Set(card.choices.map((c) => JSON.stringify(c.branches))).size, card.choices.length);
    assert.ok(!/[0-9]+%|\b50\/50\b|one in/i.test([card.flavor, ...card.choices.map((c) => c.label)].join(' ')));
    for (const choice of card.choices) {
      assert.ok(choice.label && choice.preview === '');
      assert.ok(choice.branches.some((b) => b.effects.length));
      for (const b of choice.branches) {
        assert.ok(b.effects.length <= 5);
        for (const e of b.effects) {
          if (e.kind === 'scandal') { assert.equal(e.scalable, false); assert.equal(e.target.side, 'actor'); continue; }
          assert.ok(sizes[e.kind].includes(Math.abs(e.amount)));
          assert.equal(e.scalable, true);
          if (e.kind === 'group') assert.ok(['moderate', 'far left', 'conservative', 'libertarian'].includes(e.target.selector));
        }
      }
    }
    if (card.style === 10) assert.equal(card.choices[1].branches[2].hidden, true);
  }
  assert.equal(new Set(cards.map((c) => c.style)).size, 10);
  for (const r of roster) {
    const pack = cards.filter((c) => c.candidateId === r.candidateId);
    assert.equal(pack.length, r.minimumEvents);
    const tally = Object.fromEntries(['positive', 'negative', 'mixed'].map((p) => [p, pack.filter((c) => c.polarity === p).length]));
    assert.ok(tally.positive > 0 && tally.negative > 0);
    assert.ok(r.corruption >= 12 ? tally.negative > pack.length / 2 : tally.positive > pack.length / 2);
    report.packs.push({ packId: r.packId, candidateId: r.candidateId, corruption: r.corruption, count: pack.length, tally, status: 'PASS' });
  }
});

test('every card/choice/branch has deterministic player/rival target and JSON-save fixture', () => {
  for (const card of cards) for (const choice of card.choices) for (const [branchIndex, b] of choice.branches.entries()) {
    const lower = choice.branches.slice(0, branchIndex).reduce((sum, v) => sum + v.probability, 0);
    const draw = lower + b.probability / 2;
    let cursor = 0;
    const chosen = choice.branches.find((v) => { cursor += v.probability; return draw < cursor; });
    assert.equal(chosen, b);
    for (const actor of ['player-ticket', 'rival-ticket']) {
      const opponent = actor === 'player-ticket' ? 'rival-ticket' : 'player-ticket';
      const resolvedTargets = b.effects.map((e) => e.target.side === 'actor' ? actor : opponent);
      const entry = { candidateId: card.candidateId, party: roster.find((r) => r.candidateId === card.candidateId).party, eventId: card.id, week: 11 };
      let saved = candidateEventState({ queue: [entry] });
      saved = json(recordCandidateEventPresented(saved, entry));
      const resolved = json(recordCandidateEventResolved(saved, entry));
      assert.equal(resolved.resolvedCounts[card.candidateId], 1);
      assert.equal(resolved.queue.length, 0);
      assert.deepEqual(recordCandidateEventResolved(resolved, entry), resolved);
      report.fixtures.push({ eventId: card.id, choice: choice.id, branchIndex, draw, actor, resolvedTargets, savedBefore: saved, savedAfter: resolved });
    }
  }
});

test('each pack is eligible only for its nominee and guarantees a deterministic resumed card', () => {
  for (const r of roster) for (const mode of ['two-parties', 'four-parties', 'six-party', 'regional-parties', 'favorite-sons-daughters']) {
    const game = { party: r.party, week: 11, totalWeeks: 24, build40: { modeId: mode }, build39: { scenario: { id: ['two-parties', 'four-parties'].includes(mode) ? 'standard' : mode } } };
    const participants = [{ candidateId: r.candidateId, party: r.party }];
    assert.equal(eligibleCandidateEvents(game, cards, participants).length, r.minimumEvents);
    assert.equal(eligibleCandidateEvents(game, cards, [], {}).length, 0);
    assert.equal(eligibleCandidateEvents(game, cards, participants, { actingParty: r.party === 'rep' ? 'dem' : 'rep' }).length, 0);
    assert.equal(eligibleCandidateEvents({ ...game, week: 0 }, cards, participants).length, 0);
    const queued = ensureCandidateGuarantees(game, cards, participants);
    assert.equal(queued.queue.length, 1);
    assert.deepEqual(ensureCandidateGuarantees(json({ ...game, candidateEvents: queued }), [...cards].reverse(), participants), queued);
    report.fixtures.push({ candidateId: r.candidateId, mode, queue: queued.queue, resume: 'PASS' });
  }
  const sixParty = { party: 'maga', week: 11, totalWeeks: 24, build40: { modeId: 'six-party' }, build39: { scenario: { id: 'six-party' } } };
  const vanceMaga = [{ candidateId: 'vance', party: 'maga' }];
  assert.equal(eligibleCandidateEvents(sixParty, cards, vanceMaga).length, 15);
  assert.equal(eligibleCandidateEvents(sixParty, cards, vanceMaga, { actingParty: 'rep' }).length, 0);
  const queuedMaga = ensureCandidateGuarantees(sixParty, cards, vanceMaga);
  assert.equal(queuedMaga.queue[0].party, 'maga');
  assert.deepEqual(ensureCandidateGuarantees(json({ ...sixParty, candidateEvents: queuedMaga }), cards, vanceMaga), queuedMaga);
  report.fixtures.push({ candidateId: 'vance', mode: 'six-party', actualParty: 'maga', queue: queuedMaga.queue, resume: 'PASS' });
  const directory = new URL('../../../evidence/content/', import.meta.url);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(new URL('batch-03-validation.json', directory), JSON.stringify(report, null, 2) + '\n');
});


