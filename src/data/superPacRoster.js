/**
 * Scenario-composite PAC catalog. Names describe modeled coalitions and are
 * not claims that these are real registered organizations or endorsements.
 * Issue and faction IDs mirror the current Build 33 source registries.
 */
import { PARTY_FACTIONS } from './partyFactions.js';
import { validateSuperPacRoster } from '../lib/superPacRules.js';

export const SUPER_PAC_ROSTER_VERSION = 'b34-super-pacs-v1';
export const SUPER_PAC_ISSUE_IDS = Object.freeze([
  'affordability', 'economy', 'health', 'iran', 'corruption', 'prices',
  'immigration', 'inequality', 'abortion', 'gun-control', 'marriage-equality',
  'rent', 'tariffs', 'gerrymandering', 'israel', 'crime', 'datacenters',
  'energy', 'ai', 'trans', 'birthrate',
]);

const REGIONS = Object.freeze(['midwest', 'northeast', 'south', 'west']);
const REGION_SECONDARY = Object.freeze({
  midwest: 'south',
  northeast: 'midwest',
  south: 'west',
  west: 'northeast',
});

function minorPartyFaction(alignment, factionId) {
  if (alignment === 'dem') {
    return factionId === 'suburbs' ? 'climate'
      : factionId === 'officials' ? 'officials'
        : factionId === 'donors' ? 'donors'
          : 'activists';
  }
  if (alignment === 'rep') {
    return factionId === 'officials' ? 'officials'
      : factionId === 'donors' ? 'donors'
        : factionId === 'business' ? 'students'
          : 'activists';
  }
  return factionId;
}

function makeAlignedPac([
  id, name, alignment, factionId, issueId, preferredStance,
  ideologicalRank, region, askType, request,
]) {
  const factionByParty = alignment === 'dem'
    ? { dem: factionId, grn: minorPartyFaction(alignment, factionId) }
    : { rep: factionId, lib: minorPartyFaction(alignment, factionId) };
  const regionWeights = Object.fromEntries(REGIONS.map((key) => [key,
    key === region ? 1.45 : key === REGION_SECONDARY[region] ? 1.12 : 0.78]));
  return Object.freeze({
    id,
    name,
    alignment,
    factionId,
    factionByParty: Object.freeze(factionByParty),
    factionThreshold: 48,
    supportThreshold: 0.58,
    issueIds: Object.freeze([issueId]),
    issueWeights: Object.freeze({ [issueId]: 1 }),
    preferredStance,
    regionWeights: Object.freeze(regionWeights),
    adStyle: askType === 'debate-line' ? 'contrast' : 'issue',
    progressiveRank: alignment === 'dem' ? ideologicalRank : undefined,
    libertarianRank: alignment === 'rep' ? ideologicalRank : undefined,
    asks: Object.freeze([Object.freeze({
      id: `${id}-ask-1`,
      type: askType,
      issueId,
      preferredStance,
      request,
    })]),
    provenance: 'fictional scenario composite',
  });
}

const ALIGNED_DEFINITIONS = [
  // Democratic PACs: the top ten progressive ranks transfer to the Greens.
  ['blue-future-action', 'Blue Future Action', 'dem', 'activists', 'affordability', 0, 20, 'west', 'pledge', 'Back a price-gouging bill and a larger child credit.'],
  ['climate-and-care', 'Climate and Care Coalition', 'dem', 'activists', 'energy', 0, 19, 'west', 'debate-line', 'Make the clean-energy transition a central debate answer.'],
  ['health-justice-majority', 'Health Justice Majority', 'dem', 'activists', 'health', 0, 18, 'northeast', 'pledge', 'Commit to a public option and lower prescription costs.'],
  ['homes-for-all-action', 'Homes for All Action', 'dem', 'activists', 'rent', 0, 17, 'west', 'pledge', 'Support federal housing construction and tenant protections.'],
  ['workers-bargain-fund', 'Workers’ Bargain Fund', 'dem', 'labor', 'economy', 0, 16, 'midwest', 'debate-line', 'Put union jobs and collective bargaining in the economic argument.'],
  ['fair-maps-defense', 'Fair Maps Defense Fund', 'dem', 'activists', 'gerrymandering', 0, 15, 'midwest', 'pledge', 'Promise a national standard for independent redistricting commissions.'],
  ['reproductive-freedom-majority', 'Reproductive Freedom Majority', 'dem', 'activists', 'abortion', 0, 14, 'northeast', 'debate-line', 'Commit to restoring federal abortion protections.'],
  ['safe-storage-network', 'Safe Storage Network', 'dem', 'labor', 'gun-control', 0, 13, 'south', 'pledge', 'Back universal background checks and safe-storage rules.'],
  ['digital-dignity-project', 'Digital Dignity Project', 'dem', 'activists', 'ai', 0, 12, 'west', 'appointment', 'Name a technology accountability advocate to the transition team.'],
  ['equality-forward', 'Equality Forward', 'dem', 'activists', 'trans', 0, 11, 'northeast', 'debate-line', 'Defend access to care and equal treatment in a debate answer.'],
  // The remaining ten favor abundance, suburban persuasion, party coordination, or donors.
  ['abundance-builders', 'Abundance Builders Fund', 'dem', 'suburbs', 'datacenters', 1, 10, 'midwest', 'pledge', 'Support grid upgrades before approving new data-center demand.'],
  ['new-deal-innovation', 'New Deal Innovation Fund', 'dem', 'donors', 'ai', 1, 9, 'west', 'pledge', 'Choose enforceable AI safety rules while keeping research open.'],
  ['main-street-democrats', 'Main Street Democrats Action', 'dem', 'suburbs', 'affordability', 1, 8, 'midwest', 'debate-line', 'Emphasize lower fees, more housing supply, and targeted tax relief.'],
  ['better-markets-partnership', 'Better Markets Partnership', 'dem', 'donors', 'economy', 1, 7, 'northeast', 'appointment', 'Include a small-business and competition voice in the economic team.'],
  ['rural-health-voice', 'Rural Health Voice', 'dem', 'officials', 'health', 1, 6, 'south', 'pledge', 'Protect rural hospitals while expanding coverage options.'],
  ['neighborhood-housing-table', 'Neighborhood Housing Table', 'dem', 'suburbs', 'rent', 1, 5, 'west', 'debate-line', 'Make faster home construction part of the housing message.'],
  ['union-families-now', 'Union Families Now', 'dem', 'labor', 'tariffs', 1, 4, 'midwest', 'pledge', 'Keep targeted manufacturing support for workers in transition.'],
  ['civic-integrity-project', 'Civic Integrity Project', 'dem', 'officials', 'corruption', 0, 3, 'northeast', 'pledge', 'Support stronger disclosure and public-integrity enforcement.'],
  ['medicaid-access-fund', 'Medicaid Access Fund', 'dem', 'donors', 'health', 1, 2, 'south', 'appointment', 'Put a state-level health administrator on the policy advisory council.'],
  ['national-service-fund', 'National Service Fund', 'dem', 'officials', 'birthrate', 1, 1, 'midwest', 'pledge', 'Support paid family leave and a stronger child-care tax credit.'],

  // Republican PACs: the top ten libertarian ranks transfer to Libertarians.
  ['liberty-defense-project', 'Liberty Defense Project', 'rep', 'business', 'gun-control', 2, 20, 'south', 'pledge', 'Oppose new federal restrictions on lawful firearm ownership.'],
  ['taxpayer-freedom-fund', 'Taxpayer Freedom Fund', 'rep', 'business', 'economy', 2, 19, 'south', 'debate-line', 'Make lower taxes and deregulation the core growth argument.'],
  ['free-speech-and-privacy', 'Free Speech and Privacy PAC', 'rep', 'base', 'ai', 2, 18, 'west', 'pledge', 'Reject federal licensing of AI models and expand speech protections.'],
  ['open-trade-liberty', 'Open Trade Liberty Fund', 'rep', 'business', 'tariffs', 0, 17, 'midwest', 'debate-line', 'Challenge broad tariffs as a hidden tax on households.'],
  ['patient-choice-network', 'Patient Choice Network', 'rep', 'business', 'health', 2, 16, 'south', 'pledge', 'Protect private coverage choices and reduce federal mandates.'],
  ['property-rights-action', 'Property Rights Action', 'rep', 'business', 'rent', 2, 15, 'west', 'pledge', 'Oppose national rent controls and defend local property rights.'],
  ['energy-independence-fund', 'Energy Independence Fund', 'rep', 'base', 'energy', 2, 14, 'midwest', 'appointment', 'Put an energy producer or grid operator on the transition team.'],
  ['border-security-partnership', 'Border Security Partnership', 'rep', 'base', 'immigration', 2, 13, 'south', 'debate-line', 'Call for a tougher border and faster removal of criminal offenders.'],
  ['pro-life-families-action', 'Pro-Life Families Action', 'rep', 'religious', 'abortion', 2, 12, 'south', 'pledge', 'Support federal limits on abortion and protections for unborn life.'],
  ['family-liberty-council', 'Family Liberty Council', 'rep', 'religious', 'trans', 2, 11, 'midwest', 'debate-line', 'Oppose federal mandates on sports eligibility and youth care.'],
  // The remaining ten favor party leadership, faith networks, and donor priorities.
  ['national-security-forum', 'National Security Forum', 'rep', 'officials', 'iran', 2, 10, 'northeast', 'debate-line', 'Promise a stronger deterrence posture toward Iran.'],
  ['main-street-growth-fund', 'Main Street Growth Fund', 'rep', 'donors', 'economy', 2, 9, 'midwest', 'appointment', 'Add a small-business owner to the economic advisory team.'],
  ['public-safety-partnership', 'Public Safety Partnership', 'rep', 'officials', 'crime', 2, 8, 'south', 'pledge', 'Support more local police staffing and tougher repeat-offender rules.'],
  ['american-manufacturing-first', 'American Manufacturing First', 'rep', 'base', 'tariffs', 2, 7, 'midwest', 'pledge', 'Keep broad tariffs as leverage for domestic production.'],
  ['traditional-families-fund', 'Traditional Families Fund', 'rep', 'religious', 'birthrate', 2, 6, 'south', 'pledge', 'Prioritize a larger child tax credit and marriage incentives.'],
  ['reliable-power-coalition', 'Reliable Power Coalition', 'rep', 'business', 'datacenters', 2, 5, 'south', 'debate-line', 'Back rapid data-center construction with private grid investment.'],
  ['state-sovereignty-project', 'State Sovereignty Project', 'rep', 'officials', 'gerrymandering', 2, 4, 'midwest', 'pledge', 'Keep election and district rules under state control.'],
  ['all-of-the-above-energy', 'All-of-the-Above Energy Fund', 'rep', 'donors', 'energy', 2, 3, 'west', 'appointment', 'Name a production-focused energy adviser to the transition team.'],
  ['small-business-tax-relief', 'Small Business Tax Relief PAC', 'rep', 'donors', 'prices', 2, 2, 'northeast', 'pledge', 'Reject price controls and extend business tax relief.'],
  ['defense-readiness-fund', 'Defense Readiness Fund', 'rep', 'officials', 'israel', 2, 1, 'northeast', 'pledge', 'Maintain unconditional security assistance to Israel.'],
];

const PERSUADABLE_DEFINITIONS = [
  ['american-jobs-coalition', 'American Jobs Coalition', 'economy', 1, 'midwest', 'pledge', 'Tie new incentives to domestic hiring and job training.'],
  ['energy-reliability-table', 'Energy Reliability Table', 'energy', 1, 'west', 'debate-line', 'Promise reliable power alongside lower emissions.'],
  ['veterans-security-forum', 'Veterans and Security Forum', 'iran', 1, 'south', 'appointment', 'Include a veteran or security practitioner in foreign-policy review.'],
  ['rural-power-partnership', 'Rural Power Partnership', 'datacenters', 1, 'south', 'pledge', 'Require large data centers to pay a fair share of grid upgrades.'],
  ['caregivers-network', 'Caregivers Network', 'health', 1, 'northeast', 'pledge', 'Protect coverage while lowering out-of-pocket costs.'],
  ['community-safety-partnership', 'Community Safety Partnership', 'crime', 1, 'midwest', 'debate-line', 'Pair public safety with accountable local policing.'],
  ['open-internet-compact', 'Open Internet Compact', 'ai', 1, 'west', 'pledge', 'Adopt clear AI safety rules without closing off innovation.'],
  ['homeownership-coalition', 'Homeownership Coalition', 'rent', 1, 'south', 'pledge', 'Expand housing supply and help first-time buyers.'],
  ['civic-accountability-network', 'Civic Accountability Network', 'corruption', 1, 'northeast', 'debate-line', 'Commit to transparent lobbying and ethics rules.'],
  ['family-budget-alliance', 'Family Budget Alliance', 'affordability', 1, 'midwest', 'pledge', 'Focus on lower everyday costs without sweeping price controls.'],
];

function makePersuadablePac([id, name, issueId, preferredStance, region, askType, request]) {
  const regionWeights = Object.fromEntries(REGIONS.map((key) => [key,
    key === region ? 1.35 : key === REGION_SECONDARY[region] ? 1.1 : 0.84]));
  return Object.freeze({
    id,
    name,
    alignment: 'persuadable',
    factionByParty: Object.freeze({ dem: 'suburbs', rep: 'business', grn: 'climate', lib: 'students' }),
    factionThreshold: 52,
    supportThreshold: 0.62,
    issueIds: Object.freeze([issueId]),
    issueWeights: Object.freeze({ [issueId]: 1 }),
    preferredStance,
    regionWeights: Object.freeze(regionWeights),
    adStyle: 'issue',
    asks: Object.freeze([Object.freeze({
      id: `${id}-ask-1`,
      type: askType,
      issueId,
      preferredStance,
      request,
    })]),
    provenance: 'fictional scenario composite',
  });
}

export const SUPER_PAC_ROSTER = Object.freeze([
  ...ALIGNED_DEFINITIONS.map(makeAlignedPac),
  ...PERSUADABLE_DEFINITIONS.map(makePersuadablePac),
]);

const factionIdsByParty = Object.fromEntries(Object.entries(PARTY_FACTIONS)
  .map(([party, factions]) => [party, factions.map((definition) => definition.id)]));
const rosterValidation = validateSuperPacRoster([...SUPER_PAC_ROSTER], {
  validIssueIds: [...SUPER_PAC_ISSUE_IDS],
  factionIdsByParty,
});
if (!rosterValidation.valid) {
  throw new Error(`Invalid Build 34 Super PAC catalog: ${rosterValidation.errors.join('; ')}`);
}

export const SUPER_PAC_ROSTER_VALIDATION = Object.freeze(rosterValidation);
