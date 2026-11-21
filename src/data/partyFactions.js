/**
 * Portable mirror of Build 33's canonical faction identities and effect tags.
 * Runtime effect values belong to Build 33's factionEffects and
 * factionGroupBonuses resolvers; this catalog must not apply another bonus.
 */
import {
  CANDIDATE_FACTION_PROFILES,
  validateCandidateFactionProfiles,
  validateLowestCandidateCorruptionScore,
} from './candidateFactionProfiles.js';
import { validateFactionMilestoneEvents } from './factionMilestoneEvents.js';

const frozenList = (values = []) => Object.freeze([...values]);
const faction = (id, label, role, effect, blurb, options = {}) => Object.freeze({
  id,
  label,
  name: label,
  role,
  effect,
  groupIds: frozenList(options.groupIds),
  focusStates: frozenList(options.focusStates),
  pull: options.pull,
  icon: options.icon,
  color: options.color,
  blurb,
});

export const PARTY_FACTIONS_SOURCE = 'build33/src/lib/factions.js';
export const PARTY_FACTIONS_SOURCE_GROUP_IDS = Object.freeze([
  'far left', 'moderate', 'populistright', 'evangelical', 'conservative', 'libertarian',
]);
export const PARTY_FACTIONS_SOURCE_STATE_IDS = Object.freeze(['MI', 'PA', 'WI']);
const PARTY_IDS = Object.freeze(['dem', 'rep', 'grn', 'lib']);
const VALID_ROLES = new Set(['activists', 'wing', 'officials', 'donors']);
const VALID_EFFECTS = new Set([
  'turnout',
  'labor-field',
  'moderate-persuasion',
  'downballot-coordination',
  'income',
  'religious-turnout',
  'youth-outreach',
  'issue-persuasion',
  'ballot-access',
]);

/** These IDs, labels, groups, pulls, and effect tags mirror the current B33 roster. */
export const PARTY_FACTIONS = Object.freeze({
  dem: Object.freeze([
    faction('activists', 'Progressive Democrats', 'activists', 'turnout', 'Organizers, campus chapters, and the people who knock doors for free.', {
      groupIds: ['far left'], pull: 0.7, icon: 'community', color: '#7C5CFF',
    }),
    faction('labor', 'Labor Democrats', 'wing', 'labor-field', 'The halls, the shop stewards, and the phone banks they can fill.', {
      focusStates: ['MI', 'WI', 'PA'], pull: 0.4, icon: 'tools', color: '#46B0FF',
    }),
    faction('suburbs', 'New Democrat Moderates', 'wing', 'moderate-persuasion', 'College-educated swing voters who will leave at the first whiff of a circus.', {
      groupIds: ['moderate'], pull: -0.5, icon: 'civic-building', color: '#9DB8FF',
    }),
    faction('officials', 'Democratic Party Leadership', 'officials', 'downballot-coordination', 'Governors, mayors and the caucus. They lend you their machines — for now.', {
      groupIds: ['moderate'], pull: -0.2, icon: 'civic-building', color: '#F7C145',
    }),
    faction('donors', 'Democratic Donor Network', 'donors', 'income', 'Bundlers and the big checks. They fund the week, and they keep score.', {
      pull: -0.3, icon: 'business', color: '#6EE7B7',
    }),
  ]),
  rep: Object.freeze([
    faction('base', 'MAGA Populists', 'activists', 'turnout', 'Rallies, truck rallies, and the people who will never not show up.', {
      groupIds: ['populistright'], pull: 0.8, icon: 'power', color: '#E8433C',
    }),
    faction('religious', 'Religious Conservatives', 'wing', 'religious-turnout', 'Pew by pew, and the only precinct-level list anybody actually trusts.', {
      groupIds: ['evangelical'], pull: 0.6, icon: 'civic-building', color: '#D8A657',
    }),
    faction('business', 'Free-Market Republicans', 'wing', 'moderate-persuasion', 'The Chamber, the boardroom, and every donor who wants a boring September.', {
      groupIds: ['conservative', 'moderate'], pull: -0.5, icon: 'civic-building', color: '#8FA3C8',
    }),
    faction('officials', 'Republican Party Leadership', 'officials', 'downballot-coordination', 'Governors and the county machines whose turnout you cannot buy.', {
      groupIds: ['conservative'], pull: -0.2, icon: 'civic-building', color: '#F7C145',
    }),
    faction('donors', 'Republican Donor Network', 'donors', 'income', 'The finance committee and the super PAC nobody admits to running.', {
      pull: -0.3, icon: 'business', color: '#6EE7B7',
    }),
  ]),
  grn: Object.freeze([
    faction('activists', 'Green Party Activists', 'activists', 'turnout', 'Climate organizers and the people who were right about everything first.', {
      groupIds: ['far left'], pull: 0.9, icon: 'plant', color: '#3FBF6F',
    }),
    faction('climate', 'Green Climate Action Greens', 'wing', 'issue-persuasion', 'Scientists, activists and one very determined retired professor.', {
      groupIds: ['far left'], pull: 0.4, icon: 'power', color: '#46B0FF',
    }),
    faction('officials', 'Green Party Local Officials', 'officials', 'ballot-access', 'City council seats, and the only elected offices the party holds.', {
      pull: -0.2, icon: 'civic-building', color: '#F7C145',
    }),
    faction('donors', 'Green Small-Donor Network', 'donors', 'income', 'Ten dollars at a time, and they read every email you send.', {
      pull: -0.3, icon: 'business', color: '#6EE7B7',
    }),
  ]),
  lib: Object.freeze([
    faction('activists', 'Libertarian Party Activists', 'activists', 'turnout', 'County conventions, campus chapters and a deep distrust of anyone who wins.', {
      groupIds: ['libertarian'], pull: 0.8, icon: 'civic-building', color: '#F5C542',
    }),
    faction('students', 'Libertarian Young Voters', 'wing', 'youth-outreach', 'Online, loud, and allergic to both parties.', {
      pull: 0.3, icon: 'star', color: '#C8DB18',
    }),
    faction('officials', 'Libertarian Party Officers', 'officials', 'ballot-access', 'The people who keep ballot access alive on a shoestring.', {
      pull: -0.2, icon: 'civic-building', color: '#F7C145',
    }),
    faction('donors', 'Libertarian Donors', 'donors', 'income', 'A handful of families who fund the whole thing, and say so.', {
      pull: -0.3, icon: 'business', color: '#6EE7B7',
    }),
  ]),
});

/** Planner metadata; the adapter obtains exact effect values from B33 resolvers. */
/** @param {{ party: string, standingByFactionId?: Record<string, number> }} input */
export function describeFactionEffectsForPlanner(input) {
  const { party, standingByFactionId = {} } = input;
  return (PARTY_FACTIONS[party] || []).map((definition) => {
    const raw = Number(standingByFactionId[definition.id]);
    const standing = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 50;
    return {
      party,
      factionId: definition.id,
      role: definition.role,
      effect: definition.effect,
      standing,
      groupIds: [...definition.groupIds],
      focusStates: [...definition.focusStates],
      resolver: 'Build 33 factionEffects/factionGroupBonuses',
    };
  });
}

/** Cross-check profiles, milestone coverage, and source-backed target IDs. */
export function validatePartyFactionCatalog({
  factionsByParty = PARTY_FACTIONS,
  candidates = [],
  validGroupIds = PARTY_FACTIONS_SOURCE_GROUP_IDS,
  validStateIds = PARTY_FACTIONS_SOURCE_STATE_IDS,
} = {}) {
  const errors = [];
  const idsByParty = {};
  const allNames = new Set();

  for (const party of PARTY_IDS) {
    const factions = factionsByParty[party] || [];
    const expectedCount = party === 'dem' || party === 'rep' ? 5 : 4;
    if (factions.length !== expectedCount) errors.push(`Expected ${expectedCount} factions for ${party}, found ${factions.length}`);
    idsByParty[party] = factions.map(({ id }) => id);
    const ids = new Set();
    for (const definition of factions) {
      if (!definition.id || ids.has(definition.id)) errors.push(`Missing or duplicate ${party} faction id: ${definition.id}`);
      ids.add(definition.id);
      if (!definition.label?.trim() || !definition.blurb?.trim()) errors.push(`Missing label or description for ${party}:${definition.id}`);
      const nameKey = String(definition.label || '').trim().toLowerCase();
      if (nameKey && allNames.has(nameKey)) errors.push(`Faction name must be party-specific and unique: ${definition.label}`);
      allNames.add(nameKey);
      if (!VALID_ROLES.has(definition.role)) errors.push(`Invalid role on ${party}:${definition.id}`);
      if (!VALID_EFFECTS.has(definition.effect)) errors.push(`Invalid Build 33 effect tag on ${party}:${definition.id}`);
      if (!Number.isFinite(Number(definition.pull)) || definition.pull < -1 || definition.pull > 1) {
        errors.push(`Invalid faction pull on ${party}:${definition.id}`);
      }
      for (const groupId of definition.groupIds || []) {
        if (validGroupIds && !validGroupIds.includes(groupId)) errors.push(`Unknown voter group ${groupId} on ${party}:${definition.id}`);
      }
      for (const stateId of definition.focusStates || []) {
        if (validStateIds && !validStateIds.includes(stateId)) errors.push(`Unknown focus state ${stateId} on ${party}:${definition.id}`);
      }
    }
  }

  for (const candidate of candidates) {
    const expected = new Set(idsByParty[candidate.party] || []);
    const candidateKeys = Object.keys(candidate.factionSupport || {});
    for (const id of expected) if (!Object.hasOwn(candidate.factionSupport || {}, id)) errors.push(`Candidate ${candidate.id} is missing faction ${candidate.party}:${id}`);
    for (const id of candidateKeys) if (!expected.has(id)) errors.push(`Candidate ${candidate.id} has unknown faction ${candidate.party}:${id}`);
  }

  return { valid: errors.length === 0, errors, idsByParty };
}

/** Validate portable identities/profiles against the native Build 33 event roster. */
/** @param {{ milestoneCatalog?: any, candidates?: any[] }} input */
export function validateBuild34FactionContent(input = {}) {
  const { milestoneCatalog, candidates: candidateRoster } = input;
  const profileCandidates = Object.entries(CANDIDATE_FACTION_PROFILES).map(([id, profile]) => ({
    id,
    party: profile.party,
    factionSupport: profile.factionSupport,
  }));
  const catalog = validatePartyFactionCatalog({ candidates: profileCandidates });
  const milestones = validateFactionMilestoneEvents(PARTY_FACTIONS, milestoneCatalog);
  const errors = [...catalog.errors, ...milestones.errors];
  let corruptionCandidateCount = 0;
  if (!Array.isArray(candidateRoster)) {
    errors.push('Native Build 33 candidate roster is required for profile-coverage validation');
  } else {
    try {
      validateCandidateFactionProfiles(candidateRoster, PARTY_FACTIONS);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
    const allSelectableCandidates = [...new Map([
      ...profileCandidates,
      ...candidateRoster,
    ].map((candidate) => [candidate.id, candidate])).values()];
    corruptionCandidateCount = allSelectableCandidates.length;
    const corruption = validateLowestCandidateCorruptionScore(allSelectableCandidates);
    errors.push(...corruption.errors);
  }
  return {
    valid: errors.length === 0,
    errors,
    idsByParty: catalog.idsByParty,
    milestoneCount: milestones.milestoneCount,
    candidateCount: Array.isArray(candidateRoster) ? candidateRoster.length : 0,
    corruptionCandidateCount,
  };
}
