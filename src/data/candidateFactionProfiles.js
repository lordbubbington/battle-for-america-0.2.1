/**
 * Build 34 candidate-specific starting relationships.
 * Values are faction standings (0-100), keyed by stable party faction IDs.
 * These profiles initialize new campaigns only; they never replace earned
 * standings in an active campaign.
 */

const profile = (party, factionSupport, suburbanMiddleAffinity = 0, extra = {}) => {
  const { voterGroupAffinity = {}, ...other } = extra;
  return Object.freeze({
    party,
    factionSupport: Object.freeze(factionSupport),
    perceivedCorruptionScore: 25,
    voterGroupAffinity: Object.freeze({ suburban_middle: suburbanMiddleAffinity, ...voterGroupAffinity }),
    ...other,
  });
};

import { SCENARIO_CANDIDATES } from './build39Scenarios.js';

export const CANDIDATE_FACTION_PROFILES = {
  ...Object.fromEntries(Object.keys(SCENARIO_CANDIDATES).map((id) => [id, profile(id, {})])),
  massie: profile('lib', { activists: 68, students: 54, officials: 42, donors: 48 }),
  'rand-paul': profile('lib', { activists: 62, students: 52, officials: 55, donors: 59 }),
  'bernie-sanders': profile('grn', { activists: 72, climate: 65, officials: 47, donors: 42 }),
  fdr: profile('dem', { activists: 64, labor: 61, suburbs: 42, officials: 48, donors: 46 }),
  ossoff: profile('dem', { activists: 48, labor: 51, suburbs: 62, officials: 55, donors: 57 }, 1, { perceivedCorruptionScore: 0 }),
  newsom: profile('dem', { activists: 56, labor: 48, suburbs: 47, officials: 55, donors: 64 }, -1),
  aoc: profile('dem', { activists: 68, labor: 55, suburbs: 37, officials: 42, donors: 43 }, -1),
  harris: profile('dem', { activists: 46, labor: 48, suburbs: 49, officials: 66, donors: 59 }, 1),
  beshear: profile('dem', { activists: 43, labor: 51, suburbs: 64, officials: 49, donors: 50 }, 2),
  buttigieg: profile('dem', { activists: 46, labor: 44, suburbs: 61, officials: 56, donors: 57 }, 2),
  whitmer: profile('dem', { activists: 48, labor: 56, suburbs: 60, officials: 59, donors: 54 }, 2),
  shapiro: profile('dem', { activists: 43, labor: 49, suburbs: 64, officials: 58, donors: 56 }, 2),
  klobuchar: profile('dem', { activists: 43, labor: 53, suburbs: 66, officials: 62, donors: 55 }, 2),
  booker: profile('dem', { activists: 57, labor: 53, suburbs: 53, officials: 55, donors: 52 }, 1),
  warnock: profile('dem', { activists: 55, labor: 56, suburbs: 54, officials: 56, donors: 50 }, 1),
  moore: profile('dem', { activists: 55, labor: 48, suburbs: 59, officials: 51, donors: 52 }, 1),

  reagan: profile('rep', { base: 49, religious: 54, business: 66, officials: 62, donors: 61 }, 2),
  vance: profile('rep', { base: 67, religious: 54, business: 43, officials: 59, donors: 51 }, -1),
  rubio: profile('rep', { base: 42, religious: 57, business: 61, officials: 64, donors: 60 }, 1),
  trumpjr: profile('rep', { base: 66, religious: 45, business: 41, officials: 53, donors: 55 }, -1),
  desantis: profile('rep', { base: 61, religious: 60, business: 48, officials: 56, donors: 53 }, -1),
  haley: profile('rep', { base: 38, religious: 45, business: 66, officials: 61, donors: 65 }, 2),
  carlson: profile('rep', { base: 68, religious: 51, business: 39, officials: 40, donors: 43 }, -2),
  cruz: profile('rep', { base: 57, religious: 57, business: 53, officials: 57, donors: 58 }),
  burlison: profile('rep', { base: 64, religious: 54, business: 43, officials: 39, donors: 38 }, -1),
  abbott: profile('rep', { base: 60, religious: 61, business: 53, officials: 63, donors: 60 }),
  timscott: profile('rep', { base: 43, religious: 56, business: 64, officials: 60, donors: 67 }, 2),
  youngkin: profile('rep', { base: 39, religious: 50, business: 67, officials: 61, donors: 68 }, 2),
  kemp: profile('rep', { base: 48, religious: 58, business: 59, officials: 59, donors: 52 }, 1),

  oliver: profile('lib', { activists: 56, students: 57, officials: 42, donors: 55 }),
  dsmith: profile('lib', { activists: 73, students: 68, officials: 35, donors: 44 }, -1),
  termaat: profile('lib', { activists: 44, students: 42, officials: 65, donors: 61 }, 1),
  mcardle: profile('lib', { activists: 52, students: 48, officials: 70, donors: 55 }),
  stein: profile('grn', { activists: 58, climate: 57, officials: 54, donors: 63 }, 0),
  ware: profile('grn', { activists: 63, climate: 63, officials: 45, donors: 48 }, 1),
  baraka: profile('grn', { activists: 68, climate: 54, officials: 43, donors: 48 }, -1),
  sawant: profile('grn', { activists: 72, climate: 63, officials: 36, donors: 43 }, -1),

  eugene_debs: profile('grn', { activists: 66, climate: 48, officials: 38, donors: 52 }, 0, {
    targetNationalSupportRangeFourParty: [4, 8],
    voterGroupAffinity: Object.freeze({ labor: 2, working_class: 2, progressive: 1 }),
  }),
  george_washington: profile('lib', { activists: 51, students: 38, officials: 55, donors: 45 }, 0, {
    targetNationalSupportRangeFourParty: [6, 10],
    voterGroupAffinity: Object.freeze({ historical_unity: 2 }),
    regionalAffinity: Object.freeze({
      stateIds: Object.freeze(['CT', 'DE', 'GA', 'MD', 'MA', 'NH', 'NJ', 'NY', 'NC', 'PA', 'RI', 'SC', 'VA']),
      voterGroupTag: 'historical_unity',
      multiplier: 1.15,
    }),
  }),
  // Unlockable historical and bonus candidate faction profiles
  obama: profile('dem', { activists: 60, labor: 58, suburbs: 64, officials: 62, donors: 64 }, 0, { perceivedCorruptionScore: 18 }),
  clinton: profile('dem', { activists: 48, labor: 56, suburbs: 62, officials: 64, donors: 66 }, 0, { perceivedCorruptionScore: 48 }),
  jfk: profile('dem', { activists: 56, labor: 62, suburbs: 62, officials: 60, donors: 62 }, 0, { perceivedCorruptionScore: 26 }),
  carter: profile('dem', { activists: 54, labor: 52, suburbs: 56, officials: 48, donors: 46 }, 0, { perceivedCorruptionScore: 8 }),
  lbj: profile('dem', { activists: 56, labor: 64, suburbs: 50, officials: 68, donors: 60 }, 0, { perceivedCorruptionScore: 44 }),
  truman: profile('dem', { activists: 54, labor: 66, suburbs: 54, officials: 58, donors: 50 }, 0, { perceivedCorruptionScore: 16 }),
  hamilton: profile('dem', { activists: 48, labor: 52, suburbs: 64, officials: 66, donors: 72 }, 0, { perceivedCorruptionScore: 30 }),
  trump: profile('rep', { base: 78, religious: 62, business: 56, officials: 52, donors: 62 }, 0, { perceivedCorruptionScore: 68 }),
  ford: profile('rep', { base: 46, religious: 50, business: 58, officials: 62, donors: 54 }, 0, { perceivedCorruptionScore: 18 }),
  ghwb: profile('rep', { base: 48, religious: 52, business: 66, officials: 66, donors: 64 }, 0, { perceivedCorruptionScore: 24 }),
  jq_adams: profile('rep', { base: 46, religious: 54, business: 58, officials: 62, donors: 56 }, 0, { perceivedCorruptionScore: 12 }),
  teddy_roosevelt: profile('rep', { base: 64, religious: 56, business: 48, officials: 58, donors: 52 }, 0, { perceivedCorruptionScore: 20 }),
  nixon: profile('rep', { base: 58, religious: 54, business: 62, officials: 60, donors: 62 }, 0, { perceivedCorruptionScore: 82 }),
  clay: profile('rep', { base: 54, religious: 54, business: 64, officials: 68, donors: 62 }, 0, { perceivedCorruptionScore: 28 }),
  lincoln: profile('rep', { base: 70, religious: 68, business: 64, officials: 70, donors: 64 }, 0, { perceivedCorruptionScore: 8 }),
  eisenhower: profile('dem', { activists: 50, labor: 56, suburbs: 68, officials: 66, donors: 64 }, 0, { perceivedCorruptionScore: 12 }),
  coolidge: profile('lib', { activists: 58, students: 46, officials: 60, donors: 64 }, 0, { perceivedCorruptionScore: 10 }),
  jefferson: profile('lib', { activists: 70, students: 62, officials: 62, donors: 58 }, 0, { perceivedCorruptionScore: 22 }),
  la_follette: profile('grn', { activists: 72, climate: 58, officials: 50, donors: 48 }, 0, { perceivedCorruptionScore: 14 }),
};

const HISTORICAL_LAST_BY_PARTY = Object.freeze({ dem: 'fdr', rep: 'reagan' });

/** Keep the historical major-party novelty candidates at the end of selection. */
export function orderCandidatesForSelection(candidates, party) {
  const historicalId = HISTORICAL_LAST_BY_PARTY[party];
  if (!historicalId) return [...(candidates || [])];
  const ordinary = [];
  const historical = [];
  for (const candidate of candidates || []) {
    (candidate.id === historicalId ? historical : ordinary).push(candidate);
  }
  return [...ordinary, ...historical];
}

export function candidateStartProfile(candidateId, party) {
  const result = CANDIDATE_FACTION_PROFILES[candidateId];
  if (!candidateId) return null;
  if (!result) throw new Error(`Missing Build 34 faction profile for candidate: ${candidateId}`);
  if (result.party !== party) {
    throw new Error(`Build 34 faction profile party mismatch for ${candidateId}: expected ${party}, got ${result.party}`);
  }
  return result;
}

/** Return a bounded model-fit multiplier; this is not a direct polling bonus. */
export function candidateRegionalAffinity(candidateId, stateId, voterGroupTag) {
  const regional = CANDIDATE_FACTION_PROFILES[candidateId]?.regionalAffinity;
  if (!regional || regional.voterGroupTag !== voterGroupTag || !regional.stateIds.includes(stateId)) return 1;
  return regional.multiplier;
}

/** Enforce Ossoff's unique cleanest score across the supplied candidate roster. */
export function validateLowestCandidateCorruptionScore(candidates) {
  const errors = [];
  for (const candidate of candidates || []) {
    const score = Number(candidate.perceivedCorruptionScore ?? CANDIDATE_FACTION_PROFILES[candidate.id]?.perceivedCorruptionScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) errors.push(`Missing or out-of-range perceived-corruption score for ${candidate.id}`);
    else if (candidate.id === 'ossoff' ? score !== 0 : score <= 0) {
      errors.push(candidate.id === 'ossoff'
        ? 'Ossoff must remain at the zero corruption-score floor'
        : `${candidate.id} must score above Ossoff`);
    }
  }
  if (!(candidates || []).some((candidate) => candidate.id === 'ossoff')) errors.push('Ossoff is missing from the candidate roster');
  return { valid: errors.length === 0, errors };
}

/** Validate complete roster coverage and exact stable faction IDs at load time. */
export function validateCandidateFactionProfiles(candidates, factionsByParty) {
  const errors = [];
  for (const candidate of candidates || []) {
    const candidateProfile = CANDIDATE_FACTION_PROFILES[candidate.id];
    if (!candidateProfile) {
      errors.push(`Missing faction profile for candidate ${candidate.id}`);
      continue;
    }
    if (candidateProfile.party !== candidate.party) {
      errors.push(`Party mismatch for candidate ${candidate.id}`);
      continue;
    }
    const factionIds = new Set((factionsByParty?.[candidate.party] || []).map((faction) => faction.id));
    for (const id of factionIds) {
      if (!Object.hasOwn(candidateProfile.factionSupport, id)) {
        errors.push(`Missing faction ${candidate.party}:${id} for candidate ${candidate.id}`);
      }
    }
    for (const id of Object.keys(candidateProfile.factionSupport)) {
      if (!factionIds.has(id)) errors.push(`Unknown faction ${candidate.party}:${id} on candidate ${candidate.id}`);
      const standing = Number(candidateProfile.factionSupport[id]);
      if (!Number.isFinite(standing) || standing < 0 || standing > 100) errors.push(`Invalid faction standing ${candidate.party}:${id} on ${candidate.id}`);
    }
    const affinity = candidateProfile.voterGroupAffinity.suburban_middle;
    if (affinity < -2 || affinity > 2) errors.push(`Suburban Middle affinity out of range for ${candidate.id}`);
    const regional = candidateProfile.regionalAffinity;
    if (regional && (!regional.stateIds?.length || !Number.isFinite(Number(regional.multiplier)) || regional.multiplier < 1 || regional.multiplier > 1.25)) {
      errors.push(`Invalid bounded regional affinity on ${candidate.id}`);
    }
    const targetRange = candidateProfile.targetNationalSupportRangeFourParty;
    if (targetRange && (targetRange.length !== 2 || targetRange[0] < 0 || targetRange[1] > 100 || targetRange[0] > targetRange[1])) {
      errors.push(`Invalid four-party national support target on ${candidate.id}`);
    }
  }

  if (errors.length) throw new Error(`Invalid Build 34 candidate profiles:\n${errors.join('\n')}`);
  return true;
}


const DEFAULT_FACTION_SUPPORT_BY_PARTY = {
  dem: { activists: 50, labor: 50, suburbs: 50, officials: 50, donors: 50 },
  rep: { base: 50, religious: 50, business: 50, officials: 50, donors: 50 },
  lib: { activists: 50, students: 50, officials: 50, donors: 50 },
  grn: { activists: 50, climate: 50, officials: 50, donors: 50 },
};

const MOD_REGISTERED_PROFILE_IDS = new Set();

export function registerModCandidateFactionProfile(candidate) {
  if (!candidate?.id || !candidate?.party) return;
  if (CANDIDATE_FACTION_PROFILES[candidate.id] && !MOD_REGISTERED_PROFILE_IDS.has(candidate.id)) return;
  const baseSupport = DEFAULT_FACTION_SUPPORT_BY_PARTY[candidate.party] || {};
  const customSupport = candidate.factionSupport && typeof candidate.factionSupport === 'object'
    ? { ...baseSupport, ...candidate.factionSupport }
    : { ...baseSupport };
  CANDIDATE_FACTION_PROFILES[candidate.id] = profile(candidate.party, customSupport, 0, {
    perceivedCorruptionScore: 25,
  });
  MOD_REGISTERED_PROFILE_IDS.add(candidate.id);
}

export function clearModCandidateFactionProfiles() {
  for (const id of MOD_REGISTERED_PROFILE_IDS) {
    delete CANDIDATE_FACTION_PROFILES[id];
  }
  MOD_REGISTERED_PROFILE_IDS.clear();
}
