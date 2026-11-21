import { CANDIDATE_FACTION_PROFILES } from './candidateFactionProfiles.js';
import { PARTY_FACTIONS } from './partyFactions.js';

export const BUILD38_IDEOLOGY_GROUP_IDS = Object.freeze([
  'far left', 'populistleft', 'religiousleft', 'liberal', 'moderate',
  'religiousright', 'conservative', 'populistright', 'libertarian',
]);

// One named coalition for each person. Values are stable IDs from demographics.js.
const VP_GROUP_BY_CANDIDATE = Object.freeze({
  fdr: 'populistleft', ossoff: 'liberal', newsom: 'liberal', aoc: 'far left',
  harris: 'liberal', beshear: 'moderate', buttigieg: 'moderate', whitmer: 'moderate',
  shapiro: 'moderate', klobuchar: 'moderate', booker: 'populistleft', warnock: 'religiousleft',
  moore: 'liberal',
  reagan: 'conservative', vance: 'populistright', rubio: 'conservative', trumpjr: 'populistright',
  desantis: 'religiousright', haley: 'moderate', carlson: 'populistright', cruz: 'conservative',
  burlison: 'populistright', abbott: 'conservative', timscott: 'conservative', youngkin: 'moderate',
  kemp: 'conservative',
  oliver: 'libertarian', dsmith: 'libertarian', termaat: 'libertarian', mcardle: 'libertarian',
  stein: 'far left', ware: 'populistleft', baraka: 'far left', sawant: 'far left',
  eugene_debs: 'far left', george_washington: 'moderate',
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
// The pinned Build 37 candidate profiles span strongest-faction scores 55–73.
const SOURCE_FACTION_SCORE_LOW = 55;
const SOURCE_FACTION_SCORE_HIGH = 73;

function buildCandidateEntry([candidateId, profile]) {
  const roster = PARTY_FACTIONS[profile.party] || [];
  const rank = Object.entries(profile.factionSupport || {})
    .map(([factionId, standing]) => ({ factionId, standing: Number(standing), rosterIndex: roster.findIndex((item) => item.id === factionId) }))
    .filter((item) => Number.isFinite(item.standing) && item.rosterIndex >= 0)
    .sort((a, b) => b.standing - a.standing || a.rosterIndex - b.rosterIndex);
  const first = rank[0];
  const second = rank.find((item) => item.factionId !== first?.factionId);
  const vpGroupId = VP_GROUP_BY_CANDIDATE[candidateId];
  const complete = Boolean(first && second && vpGroupId && BUILD38_IDEOLOGY_GROUP_IDS.includes(vpGroupId));
  return Object.freeze({
    candidateId,
    party: profile.party,
    primaryFactionId: first?.factionId || null,
    primaryApproval: first
      ? clamp(80 + Math.round(((first.standing - SOURCE_FACTION_SCORE_LOW) / (SOURCE_FACTION_SCORE_HIGH - SOURCE_FACTION_SCORE_LOW)) * 20), 80, 100)
      : null,
    secondaryFactionId: second?.factionId || null,
    vpBoostFactionId: first?.factionId || null,
    vpPenaltyFactionId: second?.factionId || null,
    vpGroupId: vpGroupId || null,
    status: complete ? 'ready' : 'unavailable',
    reason: complete ? null : 'candidate-faction-or-voter-group-mapping-missing',
  });
}

/** Stable candidate/VP faction and coalition map, seeded from Build 37 profiles. */
export const BUILD38_TICKET_PROFILES = Object.freeze(Object.fromEntries(
  Object.entries(CANDIDATE_FACTION_PROFILES).map(([candidateId, profile]) => [candidateId, buildCandidateEntry([candidateId, profile])]),
));

export const BUILD38_TICKET_PROFILE_COVERAGE = Object.freeze(Object.values(BUILD38_TICKET_PROFILES).reduce((result, profile) => {
  result[profile.status] += 1;
  return result;
}, { ready: 0, unavailable: 0 }));
