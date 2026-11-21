import { createSeededRandom, weightedPick } from './seededRandom.js';
import {
  buildEndorsementEffectCommands,
  endorsementEligibility,
  recordEndorsement,
} from './campaignOrganizationRules.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const maxBackgroundEndorsements = 2;

function targetBackgroundVolume(totalWeeks) {
  return clamp(Math.round(Number(totalWeeks) * 1.25), 15, 30);
}

function drawBackgroundCount({ campaignId, week, targetCount, alreadyAnnounced, weeksRemaining }) {
  const remaining = Math.max(0, targetCount - alreadyAnnounced);
  const expected = clamp(remaining / Math.max(1, weeksRemaining), 0, maxBackgroundEndorsements);
  const random = createSeededRandom(`${campaignId}:${week}:endorsement-announcements`)();
  if (expected <= 1) return random < expected ? 1 : 0;
  return random < expected - 1 ? 2 : 1;
}

function announcementWeight(group, relationship, factionStanding) {
  const relationshipThreshold = Number(group.endorsementThreshold) || 0;
  const factionThreshold = Number(group.minimumFactionStanding) || 0;
  const relationshipReach = clamp((Number(relationship) - relationshipThreshold + 5) /
    Math.max(5, 100 - relationshipThreshold), 0.15, 1);
  const factionReach = clamp((Number(factionStanding) - factionThreshold + 5) /
    Math.max(5, 100 - factionThreshold), 0.15, 1);
  const visibility = clamp(group.backgroundVisibility ?? group.visibility ?? 1, 0, 3);
  const sourceWeight = Math.max(0, Number(group.backgroundEndorsementWeight ?? 1) || 0);
  return visibility * sourceWeight * relationshipReach * factionReach;
}

/**
 * Deterministically schedule a small background endorsement wave. Eligibility
 * still requires the live relationship and party-faction gates; this helper
 * cannot manufacture an endorsement or bypass the one-time benefit registry.
 */
export function resolveBackgroundEndorsementWeek({
  campaignId,
  candidateId,
  party,
  week,
  totalWeeks,
  groups = [],
  relationshipByGroupId = {},
  factionStandingById = {},
  endorsementRegistry = {},
  unavailablePersonIds = [],
  benefitValuesByGroupId = {},
  turnoutEarnedByState = {},
  persuasionEarnedByState = {},
  issueAdCredits = [],
  appliedEndorsementIds = [],
  lastEligibleWeek = totalWeeks,
  weeklyAnnouncementReceipts = {},
}) {
  if (!campaignId || !candidateId || !party || !Number.isInteger(Number(week)) ||
      !Number.isInteger(Number(totalWeeks)) || Number(week) < 1 || Number(totalWeeks) < Number(week)) {
    throw new Error('Background endorsement scheduling needs campaign, candidate, party, and valid campaign weeks');
  }
  const weeklyReceiptId = `${campaignId}:${week}:background-endorsements`;
  if (weeklyAnnouncementReceipts[weeklyReceiptId]) {
    return {
      ...weeklyAnnouncementReceipts[weeklyReceiptId],
      weeklyAnnouncementReceipts,
      created: false,
    };
  }
  const targetCount = targetBackgroundVolume(totalWeeks);
  const alreadyAnnounced = Object.values(endorsementRegistry).filter((record) => record?.source === 'background').length;
  const withinAnnouncementWindow = Number(week) <= Number(lastEligibleWeek);
  const weeksRemaining = Math.max(1, Math.min(Number(totalWeeks) - Number(week) + 1,
    Number(lastEligibleWeek) - Number(week) + 1));
  const requestedCount = withinAnnouncementWindow
    ? drawBackgroundCount({ campaignId, week, targetCount, alreadyAnnounced, weeksRemaining })
    : 0;
  const rng = createSeededRandom(`${campaignId}:${week}:endorsement-order`);
  let nextRegistry = endorsementRegistry;
  let nextTurnout = turnoutEarnedByState;
  let nextPersuasion = persuasionEarnedByState;
  let nextAdCredits = issueAdCredits;
  let nextAppliedIds = appliedEndorsementIds;
  const announcements = [];
  const proxyEndorsements = [];
  const effectCommands = [];
  const eligible = [...(groups || [])].filter((group) => {
    const relationship = relationshipByGroupId[group.id];
    const standing = factionStandingById[group.factionId];
    return group?.backgroundEndorsement !== false &&
      endorsementEligibility({
        group,
        candidateId,
        relationshipScore: relationship,
        factionStanding: standing,
        endorsementRegistry: nextRegistry,
        unavailablePersonIds,
        candidateParty: party,
      }).eligible && announcementWeight(group, relationship, standing) > 0;
  }).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const eligibleGroupCount = eligible.length;

  for (let index = 0; index < requestedCount && eligible.length; index += 1) {
    const group = weightedPick(eligible, (candidate) => announcementWeight(
      candidate,
      relationshipByGroupId[candidate.id],
      factionStandingById[candidate.factionId],
    ), rng);
    if (!group) break;
    const relationship = relationshipByGroupId[group.id];
    const factionStanding = factionStandingById[group.factionId];
    const result = recordEndorsement({
      group,
      candidateId,
      party,
      week,
      relationshipScore: relationship,
      factionStanding,
      endorsementRegistry: nextRegistry,
      unavailablePersonIds,
      candidateParty: party,
    });
    if (!result.eligible) {
      eligible.splice(eligible.indexOf(group), 1);
      index -= 1;
      continue;
    }
    const record = { ...result.record, source: 'background' };
    nextRegistry = { ...result.endorsementRegistry, [group.id]: record };
    const benefit = buildEndorsementEffectCommands({
      group,
      candidateId,
      campaignParty: party,
      benefitValues: benefitValuesByGroupId[group.id] || {},
      turnoutEarnedByState: nextTurnout,
      persuasionEarnedByState: nextPersuasion,
      issueAdCredits: nextAdCredits,
      appliedEndorsementIds: nextAppliedIds,
    });
    nextTurnout = benefit.turnoutEarnedByState;
    nextPersuasion = benefit.persuasionEarnedByState;
    nextAdCredits = benefit.issueAdCredits;
    nextAppliedIds = benefit.appliedEndorsementIds;
    effectCommands.push(...benefit.commands.map((command) => ({
      ...command,
      source: group.id,
      sourceType: 'endorsement',
    })));
    announcements.push({ group, record, commands: benefit.commands });
    if (record.activelyCampaigning && group.personId && group.isRealFigure === true) {
      proxyEndorsements.push({ group, endorsement: record });
    }
    eligible.splice(eligible.indexOf(group), 1);
  }

  const receipt = {
    weeklyReceiptId,
    targetBackgroundEndorsements: targetCount,
    alreadyAnnounced,
    requestedCount,
    scheduledCount: announcements.length,
    eligibleGroupCount,
    announcements,
    proxyEndorsements,
    effectCommands,
    endorsementRegistry: nextRegistry,
    turnoutEarnedByState: nextTurnout,
    persuasionEarnedByState: nextPersuasion,
    issueAdCredits: nextAdCredits,
    appliedEndorsementIds: nextAppliedIds,
    seedKey: `${campaignId}:${week}:endorsement-announcements`,
  };
  return {
    ...receipt,
    weeklyAnnouncementReceipts: { ...weeklyAnnouncementReceipts, [weeklyReceiptId]: receipt },
    created: true,
  };
}
