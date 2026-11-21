/** Portable schema and event gates for announced social ballot measures. */

const SOCIAL_MEASURE_ISSUES = new Set([
  'abortion',
  'gun_control',
  'same_sex_marriage',
  'trans_rights',
]);

export const BALLOT_MEASURE_EVENT_THRESHOLDS = Object.freeze({
  minimumAgreementFraction: 0.6,
  minimumTrailingMargin: 10,
});

export const BALLOT_MEASURE_ISSUES = Object.freeze([...SOCIAL_MEASURE_ISSUES]);

const ISSUE_LABELS = Object.freeze({
  abortion: 'abortion rights',
  gun_control: 'gun policy',
  same_sex_marriage: 'marriage equality',
  trans_rights: 'transgender rights',
});

/** Economic proposals are deliberately excluded from this campaign-event system. */
export function isEligibleSocialBallotIssue(issueId) {
  return SOCIAL_MEASURE_ISSUES.has(issueId);
}

/** Require a trailing campaign and strong local agreement with its position. */
export function canTriggerBallotMeasurePush({
  issueId,
  campaignPosition,
  stateAgreementWithCampaignPosition,
  stateMarginForCampaign,
} = {}) {
  const rawAgreement = Number(stateAgreementWithCampaignPosition);
  const agreement = rawAgreement > 1 ? rawAgreement / 100 : rawAgreement;
  const margin = Number(stateMarginForCampaign);
  const eligible = isEligibleSocialBallotIssue(issueId) &&
    (campaignPosition === 'support' || campaignPosition === 'oppose') &&
    Number.isFinite(agreement) && agreement >= BALLOT_MEASURE_EVENT_THRESHOLDS.minimumAgreementFraction &&
    Number.isFinite(margin) && margin <= -BALLOT_MEASURE_EVENT_THRESHOLDS.minimumTrailingMargin;
  return {
    eligible,
    reason: eligible ? null : !isEligibleSocialBallotIssue(issueId)
      ? 'issue-not-in-social-ballot-measure-scope'
      : agreement < BALLOT_MEASURE_EVENT_THRESHOLDS.minimumAgreementFraction
        ? 'local-issue-agreement-below-60-percent'
        : margin > -BALLOT_MEASURE_EVENT_THRESHOLDS.minimumTrailingMargin
          ? 'campaign-is-not-trailing-by-10-points'
          : 'missing-position-or-state-data',
  };
}

/** Materialize the ballot-measure event only after its state conditions pass. */
export function createSocialBallotMeasurePushEvent({
  issueId,
  stateId,
  stateName,
  campaignPosition,
  stateAgreementWithCampaignPosition,
  stateMarginForCampaign,
} = {}) {
  const eligibility = canTriggerBallotMeasurePush({
    issueId,
    campaignPosition,
    stateAgreementWithCampaignPosition,
    stateMarginForCampaign,
  });
  if (!eligibility.eligible) return { event: null, ...eligibility };
  if (!stateId) throw new Error('A ballot-measure event needs a state ID');
  const label = ISSUE_LABELS[issueId];
  return {
    ...eligibility,
    event: {
      id: `ballot_measure_push_${issueId}_${stateId.toLowerCase()}`,
      title: `A ${label} Measure Could Reach the Ballot`,
      icon: 'ballot',
      tone: 'hope',
      kicker: 'A state campaign opportunity',
      text: `You are trailing in ${stateName || stateId}, where at least 60% of voters agree with your ${label} position. Organizers say a ballot campaign could bring that issue to the center of the race, but it will take time and local coordination.`,
      chain: false,
      drawRandomly: false,
      requiredContext: { stateIds: [stateId], issueIds: [issueId] },
      triggerRecord: {
        stateId,
        issueId,
        campaignPosition,
        agreement: stateAgreementWithCampaignPosition,
        stateMarginForCampaign,
      },
      choices: [
        {
          id: 'campaign_led',
          label: 'Put campaign organizers on the petition drive',
          detail: 'More effort to qualify the measure, with a larger demand on the state operation.',
          effects: { build34Commands: [{
            type: 'ballot-measure-petition-effort',
            amount: 1,
            scope: 'state',
            stateId,
            issueId,
            campaignPosition,
            organizer: 'campaign',
          }] },
        },
        {
          id: 'ally_led',
          label: 'Coordinate with local supporters and let them lead',
          detail: 'A smaller petition push that preserves more campaign staff time.',
          effects: { build34Commands: [{
            type: 'ballot-measure-petition-effort',
            amount: 0.5,
            scope: 'state',
            stateId,
            issueId,
            campaignPosition,
            organizer: 'local-allies',
          }] },
        },
      ],
    },
  };
}

/**
 * Validate an officially announced ballot measure before content is loaded.
 * The record stores the actual question and result metadata; it does not grant
 * polling, turnout, or seats by itself.
 */
export function validateAnnouncedBallotMeasure(measure, validStateIds = []) {
  const errors = [];
  if (!measure?.id) errors.push('Missing stable ballot measure id');
  if (!measure?.stateId || !validStateIds.includes(measure.stateId)) errors.push(`Unknown ballot measure state: ${measure?.stateId}`);
  if (!isEligibleSocialBallotIssue(measure?.issueId)) errors.push(`Unsupported or non-social ballot measure issue: ${measure?.issueId}`);
  if (!['support', 'oppose'].includes(measure?.campaignPosition)) errors.push(`Invalid campaign position on ${measure?.id}`);
  if (!measure?.officialQuestion?.trim()) errors.push(`Missing official ballot question on ${measure?.id}`);
  if (!['yes', 'no'].includes(measure?.campaignSide)) errors.push(`Missing campaignSide yes/no on ${measure?.id}`);
  if (measure?.result !== undefined && !['passed', 'failed', 'pending'].includes(measure.result)) {
    errors.push(`Invalid result on ${measure?.id}`);
  }
  return { valid: errors.length === 0, errors };
}

/** Add/update official measure content by stable ID without duplicating records. */
export function upsertAnnouncedBallotMeasure({ measuresById = {}, measure, validStateIds = [] } = {}) {
  const validation = validateAnnouncedBallotMeasure(measure, validStateIds);
  if (!validation.valid) throw new Error(validation.errors.join('; '));
  const previous = measuresById[measure.id];
  if (previous && previous.stateId !== measure.stateId) {
    throw new Error(`Ballot measure ${measure.id} cannot move from ${previous.stateId} to ${measure.stateId}`);
  }
  return {
    measuresById: { ...measuresById, [measure.id]: { ...previous, ...measure } },
    created: !previous,
  };
}

/**
 * Convert a campaign choice/official result to an adapter command. The adapter
 * sends voter-level effects through its existing issue response model.
 */
export function buildBallotMeasureCommand({ campaignId, measure, choiceId, receiptIds = [] } = {}) {
  if (!campaignId || !measure?.id || !choiceId) throw new Error('Ballot measure command requires campaign, measure, and choice IDs');
  const receiptId = `${campaignId}:ballot-measure:${measure.id}:${choiceId}`;
  if (receiptIds.includes(receiptId)) return { command: null, receiptIds, applied: false };
  return {
    command: {
      type: 'resolve-ballot-measure-through-voter-model',
      campaignId,
      measureId: measure.id,
      stateId: measure.stateId,
      issueId: measure.issueId,
      campaignPosition: measure.campaignPosition,
      campaignSide: measure.campaignSide,
      result: measure.result || 'pending',
      choiceId,
    },
    receiptIds: [...receiptIds, receiptId],
    applied: true,
  };
}
