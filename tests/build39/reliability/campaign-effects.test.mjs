import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePolicyEffect, resolveRallyEffect } from '../../../src/lib/build39CampaignEffects.js';

test('rallies preserve the turnout multiplier and add an unscaled 0.1 persuasion point', () => {
  assert.deepEqual(resolveRallyEffect({ electoralVotes: 4 }), {
    turnoutMultiplier: 1.75,
    persuasionPoints: 0.1,
    persuasionUnit: 'native state margin points',
  });
  assert.equal(resolveRallyEffect({ electoralVotes: 5 }).turnoutMultiplier, 1);
  assert.equal(resolveRallyEffect({ electoralVotes: 10 }).persuasionPoints, 0.1);
});

test('policy response is deterministic, bounded, and balanced over matched seeded outcomes', () => {
  const results = [];
  for (let seed = 0; seed < 1000; seed += 1) {
    const result = resolvePolicyEffect({ campaignId: 'policy-fixture-' + seed, sequence: 1, issueId: 'economy', from: 1, to: 2 });
    const repeated = resolvePolicyEffect({ campaignId: 'policy-fixture-' + seed, sequence: 1, issueId: 'economy', from: 1, to: 2 });
    assert.deepEqual(result, repeated);
    assert.ok(Math.abs(result.pollPoints) <= 0.5);
    results.push(result);
  }
  const hurts = results.filter((result) => result.pollPoints < 0).length;
  assert.ok(hurts >= 450 && hurts <= 550, String(hurts));
});

test('extreme policy movement carries more backlash risk and no-op changes have no effect', () => {
  const centered = resolvePolicyEffect({ campaignId: 'same', sequence: 4, issueId: 'economy', from: 0.8, to: 1.2 });
  const extreme = resolvePolicyEffect({ campaignId: 'same', sequence: 4, issueId: 'economy', from: 0, to: 2 });
  assert.ok(extreme.backlashRisk > centered.backlashRisk);
  assert.deepEqual(resolvePolicyEffect({ campaignId: 'same', sequence: 5, issueId: 'economy', from: 1, to: 1 }), {
    status: 'ready', pollPoints: 0, backlashRisk: 0, backlash: false,
  });
});
