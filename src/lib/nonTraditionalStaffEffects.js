/** Versioned inputs for native action resolvers. Evidence is copied from committed receipts. */
import { NONTRADITIONAL_STAFF_ROSTER } from '../data/nonTraditionalStaffRoster.js';

export const NONTRADITIONAL_EFFECT_CONTRACT_VERSION = 1;

const spec = (truths, strings, lists, resolver, adjustments, extra = {}) => ({ truths, strings, lists, resolver, adjustments, ...extra });
const mul = (component, factor) => ({ component, operation: 'multiply', factor });
const flag = (component) => ({ component, operation: 'enable' });

// Components are inputs to existing action resolvers, not direct votes, polls, or seats.
// An integration adapter must map each component to its native resolver before execution.
export const NONTRADITIONAL_EFFECT_SPECS = Object.freeze({
  'etsy-witch': spec(['naturalRandomRoll', 'firstRollForActor'], ['actor'], [], 'action-quality', [{ component: 'qualityRoll', operation: 'add-clamped', delta: 0.04, min: 0, max: 1 }], { actors: ['player', 'rival'] }),
  'influencer-director': spec(['outreachAvailable'], ['endorserId'], [], 'endorsement', [flag('influencerOutreach')], { booleans: ['inActiveAgenda'] }),
  'bot-farm-director': spec(['socialMediaAction', 'rivalMomentumGainRecorded'], [], [], 'momentum', [mul('rivalMomentumGain', 0.9), flag('sourceBackedExposureRisk')]),
  'cow-abduction-witness': spec(['appearanceRecorded'], ['state'], [], 'earned-media-and-field', [mul('earnedMediaReach', 1.08), mul('volunteerConversion', 1.08), flag('localFitRisk')]),
  'astrology-consultant': spec(['agendaUnconsumed', 'originalActionUntaken', 'alternativeActionUntaken', 'actionsCompatible'], ['agendaId', 'alternativeActionId'], [], 'agenda', [flag('reassignExistingAgendaBonus')]),
  'podcast-consultant': spec(['interviewAvailable'], ['issueId'], ['reachableGroupIds'], 'interview', [flag('longFormInterview'), mul('issueMessageQuality', 1.08), flag('normalActionCost'), flag('recordedGaffeRisk')]),
  'cow-abductor-denialist': spec(['cowIncident', 'rivalResponseRecorded'], ['incidentId', 'responseIncidentId'], [], 'incident-response', [mul('matchingRivalResponseImpact', 0.9), flag('storyRevivalRisk')], { equal: ['incidentId', 'responseIncidentId'] }),
  'openly-alien': spec(['publicAppearanceRecorded'], ['state'], ['reachableGroupIds'], 'earned-media-and-voter-response', [mul('earnedMediaReach', 1.1), flag('useExistingVoterAffinities'), flag('polarizingCoverage')]),
  'bigfoot-tracker': spec(['ruralTarget', 'existingLowTurnoutData'], ['state'], [], 'field', [mul('eligibleFieldConversion', 1.08)]),
  'ghost-medium': spec(['incidentRecorded', 'eligibleResponseExists'], ['incidentId', 'responseId'], [], 'incident-response', [flag('offerRecordedResponse')]),
  'cryptid-zoologist': spec(['environmentOrLandUseIssue', 'matchingIssueFit'], ['issueId'], ['reachableGroupIds'], 'voter-response', [mul('issueMessageQuality', 1.08)]),
  'ufo-convention-organizer': spec(['scheduledEvent', 'venueRecorded'], ['state', 'eventId'], [], 'field', [mul('volunteerConversion', 1.08)]),
  'asmr-streamer': spec(['digitalPlacementBatch'], ['batchId'], [], 'advertising', [mul('generalFatigue', 0.9), mul('persuasionCeiling', 0.9)]),
  'mothman-historian': spec(['localStoryRecorded', 'storyActive'], ['incidentId', 'state'], [], 'incident-response', [flag('allowAffectedStateTarget')]),
  'crop-circle-artist': spec(['outdoorStopRecorded'], ['state', 'eventId'], [], 'earned-media-and-field', [mul('earnedMediaReach', 1.08), mul('volunteerConversion', 1.08), flag('localFitRisk')]),
  'wrestling-promoter': spec(['scheduledRallyOrTownHall'], ['eventId'], [], 'event-and-field', [mul('eventAttendance', 1.08), mul('volunteerConversion', 1.08), mul('candidateFatigue', 1.1)]),
  'carnival-barker': spec(['volunteerDrive', 'attendanceRecorded'], ['eventId'], [], 'field', [mul('volunteerConversion', 1.08)]),
  'haunted-house-owner': spec(['eligibleVenue', 'venueBooked'], ['state', 'venueId'], [], 'finance', [mul('venueCost', 0.9)]),
  'zine-librarian': spec(['lowCostPrintOrLeaflet'], ['issueId'], [], 'advertising', [mul('printCost', 0.9), mul('issueTargetingPrecision', 1.08), flag('normalPrintFatigue')]),
  'time-share-salesman': spec(['majorDonorFundraiser'], ['donorFactionId'], [], 'fundraising', [mul('majorDonorYield', 1.08), flag('recordDonorObligation'), flag('commitmentConflictRisk')]),
  'fermentation-creator': spec(['affordabilityOrFoodCostIssue'], ['issueId'], ['reachableGroupIds'], 'voter-response', [mul('issueMessageQuality', 1.08)]),
  'survivalist-prepper': spec(['ruralTarget', 'existingLowTurnoutData', 'turnoutGapRecorded'], ['state'], [], 'field', [mul('eligibleFieldConversion', 1.08)]),
  'haunted-sign-blacksmith': spec(['eligibleSignOrGroundAction'], ['state'], [], 'field-and-finance', [mul('signageCost', 0.9)]),
  'ufo-radio-operator': spec(['rivalAttackRecorded', 'sameState'], ['attackReceiptId', 'state'], [], 'ad-response', [mul('matchingAttackImpact', 0.9)]),
  'county-fair-psychic': spec(['pollActionAvailable', 'secondSampleAvailable'], ['state', 'sampleSourceId'], [], 'polling-information', [mul('samplingUncertainty', 0.9), flag('preserveSampledResult')]),
  'ghost-hunting-paralegal': spec(['publicEvidenceRecorded'], ['claimId', 'evidenceReceiptId'], [], 'risk', [mul('sourceBackedResponseRisk', 0.9)]),
  'eccentric-public-records-librarian': spec(['publicRecordAvailable'], ['recordId', 'sourceUrl'], [], 'opposition-research', [mul('researchEvidenceQuality', 1.08), flag('normalActionCost')]),
  'reality-tv-producer': spec(['eventOccurred', 'footageRecorded'], ['eventId', 'footageReceiptId'], [], 'earned-media', [mul('clipReach', 1.08), mul('generalFatigue', 1.1)]),
  'meme-archivist': spec(['sourceStoryRecorded'], ['storyReceiptId', 'issueId'], [], 'rapid-response', [mul('responseDelay', 0.9), mul('issueRelevance', 1.08), flag('normalFatigueRisk')]),
  'sentient-cow-consultant': spec(['animalWelfareOrAgricultureIssue', 'interviewRecorded'], ['issueId', 'interviewReceiptId', 'state'], ['reachableGroupIds'], 'issue-briefing-and-earned-media', [mul('briefingCredibility', 1.08), flag('localInterview'), flag('noveltyDistractionRisk')]),
});

export function validateNonTraditionalEffectSpecs(roster = NONTRADITIONAL_STAFF_ROSTER) {
  const errors = [];
  const ids = new Set(roster.map((profile) => profile.id));
  for (const profile of roster) {
    const entry = NONTRADITIONAL_EFFECT_SPECS[profile.id];
    if (!entry) { errors.push(`Missing effect implementation for ${profile.id}.`); continue; }
    if (!entry.resolver || !entry.truths?.length || !entry.adjustments?.length) errors.push(`Incomplete effect implementation for ${profile.id}.`);
    for (const adjustment of entry.adjustments || []) {
      if (!adjustment.component || !['multiply', 'enable', 'add-clamped'].includes(adjustment.operation)) errors.push(`Invalid resolver adjustment for ${profile.id}.`);
      if (adjustment.operation === 'multiply' && (!Number.isFinite(adjustment.factor) || adjustment.factor < 0.9 || adjustment.factor > 1.1)) errors.push(`Out-of-bounds multiplier for ${profile.id}.`);
      if (adjustment.operation === 'add-clamped' && (!Number.isFinite(adjustment.delta) || Math.abs(adjustment.delta) > 0.1 || adjustment.min !== 0 || adjustment.max !== 1)) errors.push(`Invalid roll adjustment for ${profile.id}.`);
    }
  }
  for (const id of Object.keys(NONTRADITIONAL_EFFECT_SPECS)) if (!ids.has(id)) errors.push(`Effect implementation ${id} has no roster profile.`);
  return { valid: errors.length === 0, errors };
}

const SPEC_VALIDATION = validateNonTraditionalEffectSpecs();
if (!SPEC_VALIDATION.valid) throw new Error(`Invalid nontraditional effect contract:\n${SPEC_VALIDATION.errors.join('\n')}`);

export function validateNonTraditionalEffectEvidence(staffId, evidence = {}) {
  const entry = NONTRADITIONAL_EFFECT_SPECS[staffId];
  if (!entry) return { valid: false, missing: ['registered-effect'] };
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) evidence = {};
  const missing = [
    ...entry.truths.filter((key) => evidence[key] !== true),
    ...entry.strings.filter((key) => typeof evidence[key] !== 'string' || !evidence[key].trim()),
    ...entry.lists.filter((key) => !Array.isArray(evidence[key]) || !evidence[key].length || evidence[key].some((value) => typeof value !== 'string' || !value.trim())),
  ];
  if (entry.actors && !entry.actors.includes(evidence.actor)) missing.push('valid-actor');
  if (entry.booleans) missing.push(...entry.booleans.filter((key) => typeof evidence[key] !== 'boolean'));
  if (entry.equal && evidence[entry.equal[0]] !== evidence[entry.equal[1]]) missing.push('matching-incident');
  return { valid: missing.length === 0, missing };
}

export function nonTraditionalEffectAdjustments(staffId, evidence = {}) {
  const entry = NONTRADITIONAL_EFFECT_SPECS[staffId];
  if (!entry || !validateNonTraditionalEffectEvidence(staffId, evidence).valid) return [];
  const adjustments = entry.adjustments.map((adjustment) => ({
    ...adjustment,
    ...(staffId === 'etsy-witch' && evidence.actor === 'rival' ? { delta: -0.04 } : {}),
  }));
  if (staffId === 'influencer-director' && !evidence.inActiveAgenda) adjustments.push(flag('normalActionCost'));
  return adjustments;
}

/** Apply only declared resolver components. Missing components remain missing. */
export function applyNonTraditionalResolverInputs(inputs, command) {
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) throw new Error('Native resolver inputs are required.');
  const entry = NONTRADITIONAL_EFFECT_SPECS[command?.staffId];
  if (!entry || command?.effectContractVersion !== NONTRADITIONAL_EFFECT_CONTRACT_VERSION || command?.resolver !== entry.resolver) throw new Error('Unsupported nontraditional effect command.');
  if (!validateNonTraditionalEffectEvidence(command.staffId, command.evidence).valid) throw new Error('Effect evidence is incomplete.');
  const output = { ...inputs };
  for (const adjustment of nonTraditionalEffectAdjustments(command.staffId, command.evidence)) {
    if (adjustment.operation === 'enable') output[adjustment.component] = true;
    else if (adjustment.operation === 'multiply' && Number.isFinite(output[adjustment.component])) output[adjustment.component] *= adjustment.factor;
    else if (adjustment.operation === 'add-clamped' && Number.isFinite(inputs[adjustment.component])) {
      output[adjustment.component] = Math.max(adjustment.min, Math.min(adjustment.max, inputs[adjustment.component] + adjustment.delta));
    }
  }
  return output;
}
