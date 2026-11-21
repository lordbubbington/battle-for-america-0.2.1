/** Portable Build 34 faction and endorsement rules. */

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

export const ENDORSEMENT_TURNOUT_TARGET_PER_STATE = 10;
export const ENDORSEMENT_LOCAL_PERSUASION_CAP = 1;

export function endorsementEligibility({
  group,
  candidateId,
  relationshipScore,
  factionStanding,
  endorsementRegistry = {},
  unavailablePersonIds = [],
  candidateParty = null,
}) {
  if (!group?.id) return { eligible: false, reason: 'missing-group-id' };
  if (group.candidateId && group.candidateId === candidateId) return { eligible: false, reason: 'self-endorsement' };
  if (group.party && group.party !== candidateParty) return { eligible: false, reason: 'party-mismatch' };
  if (group.personId && unavailablePersonIds.includes(group.personId)) return { eligible: false, reason: 'person-unavailable' };
  const existing = endorsementRegistry[group.id];
  if (existing && existing.candidateId !== candidateId) return { eligible: false, reason: 'endorsed-another-candidate' };
  if (existing?.candidateId === candidateId) return { eligible: false, reason: 'already-endorsed' };
  if (!Number.isFinite(Number(relationshipScore)) || Number(relationshipScore) < Number(group.endorsementThreshold ?? 0)) {
    return { eligible: false, reason: 'relationship-threshold' };
  }
  if (!Number.isFinite(Number(factionStanding)) || Number(factionStanding) < Number(group.minimumFactionStanding ?? 0)) {
    return { eligible: false, reason: 'faction-threshold' };
  }
  return { eligible: true, reason: null };
}

/**
 * Register an endorsement once. Campaign activity has its own higher threshold
 * and does not retroactively repeat the endorsement benefit.
 */
export function recordEndorsement({
  group,
  candidateId,
  party,
  week,
  relationshipScore,
  factionStanding,
  endorsementRegistry = {},
  unavailablePersonIds = [],
  candidateParty = party,
}) {
  const eligibility = endorsementEligibility({
    group,
    candidateId,
    relationshipScore,
    factionStanding,
    endorsementRegistry,
    unavailablePersonIds,
    candidateParty,
  });
  if (!eligibility.eligible) return { ...eligibility, endorsementRegistry };

  const record = {
    endorserId: group.id,
    candidateId,
    party,
    week,
    factionId: group.factionId,
    relationshipScore,
    factionStanding,
    benefitApplied: true,
    campaignThresholdMet: Number(relationshipScore) >= Number(group.campaignThreshold ?? Infinity),
    campaignFactionGateMet: Number(factionStanding) >= Number(group.minimumCampaignFactionStanding ?? group.minimumFactionStanding ?? 0),
    activelyCampaigning:
      Number(relationshipScore) >= Number(group.campaignThreshold ?? Infinity) &&
      Number(factionStanding) >= Number(group.minimumCampaignFactionStanding ?? group.minimumFactionStanding ?? 0),
  };
  return {
    eligible: true,
    reason: null,
    record,
    endorsementRegistry: { ...endorsementRegistry, [group.id]: record },
  };
}

/**
 * Allocate endorsement turnout through the existing turnout resolver. The
 * aggregate target is +10 points/state for the whole campaign, with a hard
 * remaining-cap check to prevent each endorser granting the full amount.
 */
export function allocateEndorsementTurnout({
  potentialByState = {},
  earnedByState = {},
  targetPerState = ENDORSEMENT_TURNOUT_TARGET_PER_STATE,
}) {
  const turnoutByState = {};
  const nextEarned = { ...earnedByState };
  for (const [stateId, potentialRaw] of Object.entries(potentialByState)) {
    const alreadyEarned = clamp(earnedByState[stateId], 0, targetPerState);
    const potential = Math.max(0, Number(potentialRaw) || 0);
    const applied = Math.min(potential, targetPerState - alreadyEarned);
    if (applied > 0) {
      turnoutByState[stateId] = applied;
      nextEarned[stateId] = alreadyEarned + applied;
    }
  }
  return { turnoutByState, earnedByState: nextEarned };
}

/** Turn an endorsement's primary/secondary package into scoped resolver commands. */
/** @param {any} input */
export function buildEndorsementEffectCommands(input) {
  const {
    group,
    candidateId,
    campaignParty,
    benefitValues = {},
    turnoutEarnedByState = {},
    persuasionEarnedByState = {},
    issueAdCredits = [],
    appliedEndorsementIds = [],
  } = input;
  if (!group?.id || !candidateId) throw new Error('Endorsement effects require a group id and candidate id');
  if (appliedEndorsementIds.includes(group?.id)) {
    return { commands: [], turnoutEarnedByState, persuasionEarnedByState, issueAdCredits, appliedEndorsementIds, applied: false };
  }
  const packageTypes = [group?.benefitPackage, ...(group?.secondaryBenefitPackages || [])].filter(Boolean);
  const commands = [];
  let nextTurnoutEarned = turnoutEarnedByState;
  let nextPersuasionEarned = persuasionEarnedByState;
  let nextAdCredits = [...issueAdCredits];

  for (const benefit of packageTypes) {
    if (benefit.type === 'momentum') {
      if ((group.benefitScope || group.level) === 'national') {
        commands.push({ type: 'national-momentum', candidateId, amount: Number(benefitValues.momentum) || 0 });
      }
    } else if (benefit.type === 'persuasion') {
      if (group.level !== 'national' && group.state) {
        const stateId = group.state;
        const alreadyEarned = clamp(nextPersuasionEarned[stateId], 0, ENDORSEMENT_LOCAL_PERSUASION_CAP);
        const requested = clamp(benefitValues.persuasion, 0, ENDORSEMENT_LOCAL_PERSUASION_CAP);
        const amount = Math.min(requested, ENDORSEMENT_LOCAL_PERSUASION_CAP - alreadyEarned);
        if (amount > 0) {
          commands.push({ type: 'local-persuasion', candidateId, stateId, amount, source: group.id });
          nextPersuasionEarned = { ...nextPersuasionEarned, [stateId]: alreadyEarned + amount };
        }
      }
    } else if (benefit.type === 'turnout') {
      const allocation = allocateEndorsementTurnout({
        potentialByState: benefitValues.turnoutByState || {},
        earnedByState: nextTurnoutEarned,
      });
      nextTurnoutEarned = allocation.earnedByState;
      for (const [stateId, points] of Object.entries(allocation.turnoutByState)) {
        commands.push({ type: 'turnout', party: campaignParty, stateId, points, source: group.id });
      }
    } else if (benefit.type === 'free-ad') {
      const credit = {
        id: `${group.id}:${candidateId}:ad`,
        sourceEndorserId: group.id,
        candidateId,
        issueId: benefit.issueId || null,
        stateId: benefit.state || group.state || null,
        expiresWeek: benefitValues.adExpiryWeek ?? null,
        usesRemaining: 1,
      };
      nextAdCredits.push(credit);
      commands.push({ type: 'issue-ad-credit', credit });
    } else if (benefit.type === 'money') {
      if (Number.isFinite(Number(benefitValues.moneyM))) {
        const amountM = clamp(benefitValues.moneyM, 1, 4);
        commands.push({ type: 'donation', candidateId, amountM, source: group.id });
      }
    }
  }

  return {
    commands,
    turnoutEarnedByState: nextTurnoutEarned,
    persuasionEarnedByState: nextPersuasionEarned,
    issueAdCredits: nextAdCredits,
    appliedEndorsementIds: [...appliedEndorsementIds, group.id],
    applied: true,
  };
}

/** Keep endorser benefits separate from the endorser's relationship meter. */
export function endorsementRelationshipCanChange({ group, oldScore, newScore, candidateId }) {
  if (!group || !candidateId) return false;
  const oldValue = clamp(oldScore, 0, 100);
  const newValue = clamp(newScore, 0, 100);
  return oldValue !== newValue;
}

/** Validate the versioned endorser catalog before a campaign can load it. */
export function validateEndorserRoster(groups, states, candidates, factionIdsByParty = {}) {
  const errors = [];
  const allowedTypes = new Set(['candidate', 'elected_official', 'advocacy_group', 'labor', 'community', 'professional', 'donor', 'other']);
  const allowedBenefits = new Set(['momentum', 'persuasion', 'turnout', 'free-ad', 'money']);
  const ids = new Set();
  const stateIds = new Set((states || []).map((state) => state.abbr || state.id));
  const candidateIds = new Set((candidates || []).map((candidate) => candidate.id));
  const nationalCount = (groups || []).filter((group) => group.level === 'national').length;
  if (nationalCount !== 50) errors.push(`Expected 50 national endorsers, found ${nationalCount}`);
  if ((groups || []).length < 450 || (groups || []).length > 550) {
    errors.push(`Expected about 500 total endorsers, found ${(groups || []).length}`);
  }

  const localByState = {};
  for (const group of groups || []) {
    if (!group || typeof group !== 'object') {
      errors.push('Invalid empty endorser record');
      continue;
    }
    if (!group?.id || ids.has(group.id)) errors.push(`Missing or duplicate endorser id: ${group?.id}`);
    ids.add(group?.id);
    if (group.level === 'state') {
      const stateId = group.state;
      if (!stateIds.has(stateId)) errors.push(`Unknown state ${stateId} on endorser ${group.id}`);
      localByState[stateId] = (localByState[stateId] || 0) + 1;
    } else if (group.level === 'candidate') {
      if (group.type !== 'candidate') errors.push(`Candidate-level endorser ${group.id} must have candidate type`);
    } else if (group.level !== 'national') {
      errors.push(`Invalid level on endorser ${group.id}`);
    }
    if (!allowedTypes.has(group.type)) errors.push(`Invalid type on endorser ${group.id}`);
    if (!group.factionId) errors.push(`Endorser ${group.id} has no associated party faction`);
    if (!['national', 'state'].includes(group.benefitScope || group.level)) {
      errors.push(`Invalid benefit scope on endorser ${group.id}`);
    }
    if (group.level === 'national' && (group.benefitScope || 'national') !== 'national') {
      errors.push(`National endorser ${group.id} must use national benefit scope`);
    }
    if (group.level === 'state' && (group.benefitScope || 'state') !== 'state') {
      errors.push(`State endorser ${group.id} must use state benefit scope`);
    }
    if (!Number.isFinite(Number(group.minimumFactionStanding)) || Number(group.minimumFactionStanding) < 0 || Number(group.minimumFactionStanding) > 100) {
      errors.push(`Invalid minimum faction standing on ${group.id}`);
    }
    if (!Number.isFinite(Number(group.endorsementThreshold)) || Number(group.endorsementThreshold) < 0 || Number(group.endorsementThreshold) > 100) {
      errors.push(`Invalid endorsement threshold on ${group.id}`);
    }
    if (!Number.isFinite(Number(group.campaignThreshold)) || Number(group.campaignThreshold) < Number(group.endorsementThreshold)) {
      errors.push(`Campaign threshold must be at least the endorsement threshold on ${group.id}`);
    }
    if (group.type === 'candidate' && (!group.candidateId || !candidateIds.has(group.candidateId))) {
      errors.push(`Candidate endorser ${group.id} does not map to a candidate`);
    }
    if (group.type === 'candidate' && group.level !== 'candidate') {
      errors.push(`Candidate endorser ${group.id} must use candidate level`);
    }
    if (group.type !== 'candidate' && group.level === 'candidate') {
      errors.push(`Non-candidate endorser ${group.id} cannot use candidate level`);
    }
    if (group.type === 'candidate' && group.party !== (candidates || []).find((candidate) => candidate.id === group.candidateId)?.party) {
      errors.push(`Candidate endorser ${group.id} has a party mismatch`);
    }
    if (!group.provenance) errors.push(`Endorser ${group.id} has no provenance classification`);
    if (group.type === 'candidate' && group.fictionalComposite !== false) {
      errors.push(`Candidate endorser ${group.id} must be marked as a real-person record`);
    }
    if (group.type !== 'candidate' && group.fictionalComposite !== true) {
      errors.push(`Organization endorser ${group.id} must be marked as a fictional composite`);
    }
    if (group.factionId) {
      const partyFactions = factionIdsByParty[group.party] || [];
      if (!partyFactions.some((faction) => faction.id === group.factionId)) {
        errors.push(`Unknown ${group.party || 'party'} faction ${group.factionId} on endorser ${group.id}`);
      }
    }
    const benefits = [group.benefitPackage, ...(group.secondaryBenefitPackages || [])].filter(Boolean);
    for (const benefit of benefits) {
      const benefitScope = group.benefitScope || group.level;
      if (!allowedBenefits.has(benefit.type)) errors.push(`Unknown endorsement benefit ${benefit.type} on ${group.id}`);
      if (benefit.type === 'momentum' && benefitScope !== 'national') {
        errors.push(`Local endorser ${group.id} cannot grant national momentum`);
      }
      if (benefit.type === 'persuasion' && benefitScope === 'national') {
        errors.push(`National endorser ${group.id} cannot grant local persuasion`);
      }
    }
  }

  for (const state of states || []) {
    const stateId = state.abbr || state.id;
    const count = localByState[stateId] || 0;
    if (count < 5 || count > 20) errors.push(`State ${stateId} has ${count} local endorsers; expected 5-20`);
  }
  for (const candidate of candidates || []) {
    if (!(groups || []).some((group) => group.type === 'candidate' && group.candidateId === candidate.id)) {
      errors.push(`Candidate ${candidate.id} has no endorser record`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    total: ids.size,
    national: nationalCount,
    candidate: (groups || []).filter((group) => group.level === 'candidate').length,
    localByState,
  };
}
