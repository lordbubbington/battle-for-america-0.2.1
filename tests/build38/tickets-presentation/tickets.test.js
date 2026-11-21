import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BUILD38_IDEOLOGY_GROUP_IDS, BUILD38_TICKET_PROFILES, BUILD38_TICKET_PROFILE_COVERAGE } from '../../../src/data/build38TicketProfiles.js';
import { ticketEffects } from '../../../src/lib/build38TicketEffects.js';

const fixtures = JSON.parse(fs.readFileSync(fileURLToPath(new URL('./fixtures/agent-c-evidence.json', import.meta.url)), 'utf8'));

test('all Build 37 candidate faction profiles have a stable presidential and VP mapping', () => {
  assert.equal(BUILD38_TICKET_PROFILE_COVERAGE.unavailable, 0);
  assert.ok(BUILD38_TICKET_PROFILE_COVERAGE.ready >= 30);
  for (const profile of Object.values(BUILD38_TICKET_PROFILES)) {
    assert.ok(profile.primaryApproval >= 80 && profile.primaryApproval <= 100);
    assert.notEqual(profile.primaryFactionId, profile.secondaryFactionId);
    assert.notEqual(profile.vpBoostFactionId, profile.vpPenaltyFactionId);
  }
});

test('president baseline precedes VP changes on the player and rival tickets', () => {
  for (const role of ['player', 'rival']) {
    const fixture = fixtures.ticketParity[role];
    const result = ticketEffects(fixture);
    assert.equal(result.status, 'ready', role);
    assert.deepEqual(result.factionOverrides, fixture.expectedPrimary, role);
    assert.deepEqual(result.factionDeltas, fixture.expectedDeltas, role);
    assert.deepEqual(result.groupEffects, [fixture.expectedGroupEffect], role);
  }
});

test('VP group bonus is omitted when that voter group is inactive', () => {
  const result = ticketEffects({ ...fixtures.ticketParity.player, activeVoterGroupIds: ['libertarian'] });
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.groupEffects, []);
});

test('all nine supplied ideology group IDs can be named in VP profiles', () => {
  const mappedGroups = new Set(Object.values(BUILD38_TICKET_PROFILES).map(({ vpGroupId }) => vpGroupId));
  assert.deepEqual([...mappedGroups].sort(), [...BUILD38_IDEOLOGY_GROUP_IDS].sort());
});

test('unsupported faction rosters and mismatched party data return structured unavailability', () => {
  assert.equal(ticketEffects({ candidateId: 'shapiro', party: 'ind' }).status, 'unavailable');
  assert.equal(ticketEffects({ candidateId: 'shapiro', party: 'rep' }).status, 'unavailable');
});
