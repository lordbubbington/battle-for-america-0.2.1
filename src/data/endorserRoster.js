/**
 * Build 34's versioned endorsement network. National and state organizations
 * are explicitly fictional scenario composites; candidate records refer to
 * real people already present in the candidate roster. Do not present the
 * composite names as real-world endorsements or affiliations.
 */
import { CANDIDATE_FACTION_PROFILES } from './candidateFactionProfiles.js';
import { PARTY_FACTIONS } from './partyFactions.js';
import { SUPER_PAC_ISSUE_IDS } from './superPacRoster.js';
import { validateEndorserRoster } from '../lib/campaignOrganizationRules.js';

export const ENDORSER_ROSTER_VERSION = 1;
export const ENDORSER_ROSTER_PROVENANCE = 'fictional scenario composite';

// These stance preferences belong to modeled composite organizations. They are
// intentionally issue specific so a campaign's platform can move their support.
const POLICY_POSITIONS_BY_FACTION = Object.freeze({
  dem: {
    activists: { economy: 0, affordability: 0, health: 0, abortion: 0, energy: 0, inequality: 0, rent: 0, gerrymandering: 0 },
    labor: { economy: 0, affordability: 0, tariffs: 1, immigration: 1, inequality: 0, health: 0 },
    suburbs: { economy: 1, affordability: 1, immigration: 1, health: 1, energy: 1, ai: 1, corruption: 1 },
    officials: { economy: 1, immigration: 1, crime: 1, corruption: 1, gerrymandering: 0 },
    donors: { economy: 1, affordability: 1, tariffs: 0, ai: 1, datacenters: 2, prices: 1 },
  },
  rep: {
    base: { economy: 2, immigration: 2, crime: 2, tariffs: 2, abortion: 2, corruption: 0 },
    religious: { abortion: 2, trans: 2, birthrate: 2, immigration: 2, health: 1 },
    business: { economy: 2, tariffs: 0, datacenters: 2, immigration: 1, prices: 1, ai: 2 },
    officials: { economy: 1, crime: 1, immigration: 2, corruption: 1, gerrymandering: 2 },
    donors: { economy: 1, tariffs: 0, datacenters: 2, prices: 1, ai: 2 },
  },
  grn: {
    activists: { economy: 0, health: 0, abortion: 0, energy: 0, inequality: 0, rent: 0, gerrymandering: 0 },
    climate: { energy: 0, datacenters: 0, ai: 1, health: 0, economy: 0 },
    officials: { economy: 1, energy: 0, gerrymandering: 0, corruption: 0 },
    donors: { economy: 1, energy: 0, ai: 1, health: 0 },
  },
  lib: {
    activists: { economy: 1, gerrymandering: 0, ai: 0, immigration: 0, iran: 0, crime: 0 },
    students: { ai: 0, gerrymandering: 0, economy: 1, immigration: 0 },
    officials: { gerrymandering: 0, corruption: 0, economy: 1, immigration: 0 },
    donors: { economy: 1, tariffs: 0, ai: 0, datacenters: 1, prices: 1 },
  },
});

const DEMOGRAPHIC_GROUP_BY_FACTION = Object.freeze({
  dem: { activists: 'far left', labor: 'populistleft', suburbs: 'moderate', officials: 'liberal', donors: 'moderate' },
  rep: { base: 'populistright', religious: 'religiousright', business: 'conservative', officials: 'conservative', donors: 'moderate' },
  grn: { activists: 'far left', climate: 'far left', officials: 'liberal', donors: 'liberal' },
  lib: { activists: 'libertarian', students: 'libertarian', officials: 'libertarian', donors: 'libertarian' },
});

function policyPositionsFor(party, factionId) {
  return Object.freeze({ ...(POLICY_POSITIONS_BY_FACTION[party]?.[factionId] || {}) });
}

function demographicGroupFor(party, factionId) {
  return DEMOGRAPHIC_GROUP_BY_FACTION[party]?.[factionId] || null;
}

export const ENDORSER_STATES = Object.freeze([
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['FL', 'Florida'], ['GA', 'Georgia'],
  ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
  ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'],
  ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'],
  ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'],
  ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'],
  ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'],
  ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
].map(([abbr, name]) => Object.freeze({ abbr, name })));

const packageOf = (type, options = {}) => Object.freeze({ type, ...options });
const national = (id, name, party, factionId, type, benefitPackage, secondaryBenefitPackages = [], visibility = 1) =>
  Object.freeze({
    id: `national-${id}`,
    name,
    level: 'national',
    benefitScope: 'national',
    type,
    party,
    factionId,
    positionByIssue: policyPositionsFor(party, factionId),
    demographicGroupId: demographicGroupFor(party, factionId),
    benefitPackage,
    secondaryBenefitPackages: Object.freeze(secondaryBenefitPackages),
    endorsementThreshold: 50,
    campaignThreshold: 72,
    minimumFactionStanding: 40,
    minimumCampaignFactionStanding: 58,
    backgroundVisibility: visibility,
    backgroundEndorsementWeight: 0.9,
    fictionalComposite: true,
    provenance: ENDORSER_ROSTER_PROVENANCE,
    displayNote: 'Scenario composite; not a real organization',
  });

const nationalGroups = [
  national('dem-progressive-field', 'National Progressive Field Coalition', 'dem', 'activists', 'advocacy_group', packageOf('turnout'), [packageOf('momentum')]),
  national('dem-labor-council', 'Democratic Labor Council Network', 'dem', 'labor', 'labor', packageOf('turnout'), [packageOf('free-ad', { issueId: 'economy' })]),
  national('dem-mayors', 'Democratic Mayors and County Executives Council', 'dem', 'officials', 'elected_official', packageOf('turnout'), [packageOf('free-ad', { issueId: 'affordability' })]),
  national('dem-donor-collective', 'Democratic Small-Dollar Donor Collective', 'dem', 'donors', 'donor', packageOf('money'), [packageOf('momentum')]),
  national('dem-suburban', 'New Democrat Suburban Coalition', 'dem', 'suburbs', 'professional', packageOf('momentum'), [packageOf('free-ad', { issueId: 'economy' })]),
  national('dem-climate', 'Democratic Climate Organizers Network', 'dem', 'activists', 'advocacy_group', packageOf('free-ad', { issueId: 'energy' }), [packageOf('turnout')]),
  national('dem-health', 'Democratic Community Health Advocates', 'dem', 'labor', 'advocacy_group', packageOf('free-ad', { issueId: 'health' }), [packageOf('turnout')]),
  national('dem-civil-rights', 'Democratic Civil Rights and Voting Coalition', 'dem', 'activists', 'advocacy_group', packageOf('turnout'), [packageOf('momentum')]),
  national('dem-state-leaders', 'Democratic State Leaders Forum', 'dem', 'officials', 'elected_official', packageOf('turnout'), [packageOf('momentum')]),
  national('dem-technology', 'Democratic Technology Professionals Network', 'dem', 'suburbs', 'professional', packageOf('free-ad', { issueId: 'ai' }), [packageOf('money')]),
  national('dem-educators', 'Democratic Educators and Public Workers Alliance', 'dem', 'labor', 'labor', packageOf('turnout'), [packageOf('free-ad', { issueId: 'health' })]),
  national('dem-women', 'Democratic Women’s Civic Coalition', 'dem', 'activists', 'advocacy_group', packageOf('free-ad', { issueId: 'abortion' }), [packageOf('turnout')]),
  national('dem-farm', 'Democratic Rural Communities Network', 'dem', 'officials', 'community', packageOf('turnout'), [packageOf('momentum')]),
  national('dem-finance', 'Democratic Finance and Policy Council', 'dem', 'donors', 'donor', packageOf('money'), [packageOf('free-ad', { issueId: 'affordability' })]),

  national('rep-populist-field', 'Republican Populist Field Coalition', 'rep', 'base', 'advocacy_group', packageOf('turnout'), [packageOf('momentum')]),
  national('rep-faith', 'Republican Faith and Family Network', 'rep', 'religious', 'advocacy_group', packageOf('turnout'), [packageOf('free-ad', { issueId: 'abortion' })]),
  national('rep-governors', 'Republican Governors and State Leaders Council', 'rep', 'officials', 'elected_official', packageOf('turnout'), [packageOf('momentum')]),
  national('rep-business', 'Republican Business and Main Street Council', 'rep', 'business', 'professional', packageOf('money'), [packageOf('free-ad', { issueId: 'economy' })]),
  national('rep-donor', 'Republican Finance Chair Network', 'rep', 'donors', 'donor', packageOf('money'), [packageOf('momentum')]),
  national('rep-veterans', 'Republican Veterans Civic Alliance', 'rep', 'base', 'community', packageOf('turnout'), [packageOf('free-ad', { issueId: 'iran' })]),
  national('rep-law-enforcement', 'Republican Public Safety Coalition', 'rep', 'officials', 'advocacy_group', packageOf('free-ad', { issueId: 'crime' }), [packageOf('turnout')]),
  national('rep-energy', 'Republican Energy Producers Council', 'rep', 'business', 'professional', packageOf('money'), [packageOf('free-ad', { issueId: 'energy' })]),
  national('rep-small-business', 'Republican Small Business Federation', 'rep', 'business', 'professional', packageOf('free-ad', { issueId: 'affordability' }), [packageOf('momentum')]),
  national('rep-county-officials', 'Republican County Officials Association', 'rep', 'officials', 'elected_official', packageOf('turnout'), [packageOf('momentum')]),
  national('rep-rural', 'Republican Rural Communities Council', 'rep', 'religious', 'community', packageOf('turnout'), [packageOf('free-ad', { issueId: 'immigration' })]),
  national('rep-border', 'Republican Border Security Coalition', 'rep', 'base', 'advocacy_group', packageOf('free-ad', { issueId: 'immigration' }), [packageOf('turnout')]),
  national('rep-traditional-values', 'Republican Traditional Values Alliance', 'rep', 'religious', 'advocacy_group', packageOf('turnout'), [packageOf('momentum')]),
  national('rep-investors', 'Republican Investors and Entrepreneurs Network', 'rep', 'donors', 'donor', packageOf('money'), [packageOf('free-ad', { issueId: 'prices' })]),

  national('green-climate', 'Green Climate Action Network', 'grn', 'climate', 'advocacy_group', packageOf('free-ad', { issueId: 'energy' }), [packageOf('turnout')]),
  national('green-grassroots', 'Green Party Grassroots Organizers Council', 'grn', 'activists', 'advocacy_group', packageOf('turnout'), [packageOf('momentum')]),
  national('green-local-officials', 'Green Local Officials Roundtable', 'grn', 'officials', 'elected_official', packageOf('turnout'), [packageOf('free-ad', { issueId: 'energy' })]),
  national('green-small-donors', 'Green Small Donor Circle', 'grn', 'donors', 'donor', packageOf('money'), [packageOf('momentum')]),
  national('green-conservation', 'Green Conservation and Clean Air Coalition', 'grn', 'climate', 'advocacy_group', packageOf('free-ad', { issueId: 'energy' }), [packageOf('turnout')]),
  national('green-labor', 'Green Labor Solidarity Network', 'grn', 'activists', 'labor', packageOf('turnout'), [packageOf('free-ad', { issueId: 'inequality' })]),
  national('green-tenant', 'Green Tenant and Housing Organizers', 'grn', 'activists', 'community', packageOf('free-ad', { issueId: 'rent' }), [packageOf('turnout')]),
  national('green-peace', 'Green Peace and Diplomacy Forum', 'grn', 'officials', 'advocacy_group', packageOf('free-ad', { issueId: 'iran' }), [packageOf('momentum')]),
  national('green-youth', 'Green Youth Climate Assembly', 'grn', 'activists', 'community', packageOf('turnout'), [packageOf('momentum')]),
  national('green-health', 'Green Public Health Advocates', 'grn', 'climate', 'advocacy_group', packageOf('free-ad', { issueId: 'health' }), [packageOf('turnout')]),
  national('green-ballot', 'Green Ballot Access and Democracy Project', 'grn', 'officials', 'advocacy_group', packageOf('turnout'), [packageOf('free-ad', { issueId: 'gerrymandering' })]),

  national('liberty-grassroots', 'Libertarian Grassroots Network', 'lib', 'activists', 'advocacy_group', packageOf('turnout'), [packageOf('momentum')]),
  national('liberty-youth', 'Libertarian Youth Organizers Council', 'lib', 'students', 'community', packageOf('turnout'), [packageOf('free-ad', { issueId: 'ai' })]),
  national('liberty-officials', 'Libertarian State and County Chairs Council', 'lib', 'officials', 'elected_official', packageOf('turnout'), [packageOf('free-ad', { issueId: 'gerrymandering' })]),
  national('liberty-donors', 'Libertarian Donor and Business Circle', 'lib', 'donors', 'donor', packageOf('money'), [packageOf('momentum')]),
  national('liberty-civil-rights', 'Libertarian Civil Liberties Coalition', 'lib', 'activists', 'advocacy_group', packageOf('free-ad', { issueId: 'gerrymandering' }), [packageOf('turnout')]),
  national('liberty-small-business', 'Libertarian Independent Business Council', 'lib', 'donors', 'professional', packageOf('money'), [packageOf('free-ad', { issueId: 'economy' })]),
  national('liberty-privacy', 'Libertarian Privacy and Digital Rights Network', 'lib', 'students', 'advocacy_group', packageOf('free-ad', { issueId: 'ai' }), [packageOf('turnout')]),
  national('liberty-peace', 'Libertarian Peace and Nonintervention Forum', 'lib', 'activists', 'advocacy_group', packageOf('free-ad', { issueId: 'iran' }), [packageOf('momentum')]),
  national('liberty-local', 'Libertarian Local Elected Officials Roundtable', 'lib', 'officials', 'elected_official', packageOf('turnout'), [packageOf('momentum')]),
  national('liberty-taxpayers', 'Libertarian Taxpayer and Fiscal Restraint Council', 'lib', 'donors', 'professional', packageOf('money'), [packageOf('free-ad', { issueId: 'prices' })]),
  national('liberty-ballot', 'Libertarian Ballot Access Project', 'lib', 'officials', 'advocacy_group', packageOf('turnout'), [packageOf('free-ad', { issueId: 'gerrymandering' })]),
];

const LOCAL_TEMPLATES = Object.freeze([
  { key: 'dem-officials', title: 'Democratic Elected Officials Council', party: 'dem', factionId: 'officials', type: 'elected_official', benefit: packageOf('turnout'), secondary: packageOf('free-ad', { issueId: 'affordability' }) },
  { key: 'dem-labor', title: 'Democratic Labor Council', party: 'dem', factionId: 'labor', type: 'labor', benefit: packageOf('turnout'), secondary: packageOf('free-ad', { issueId: 'economy' }) },
  { key: 'dem-community', title: 'Progressive Community Action Network', party: 'dem', factionId: 'activists', type: 'advocacy_group', benefit: packageOf('persuasion'), secondary: packageOf('turnout') },
  { key: 'rep-officials', title: 'Republican County Leaders Council', party: 'rep', factionId: 'officials', type: 'elected_official', benefit: packageOf('turnout'), secondary: packageOf('free-ad', { issueId: 'immigration' }) },
  { key: 'rep-business', title: 'Republican Small Business Coalition', party: 'rep', factionId: 'business', type: 'professional', benefit: packageOf('persuasion'), secondary: packageOf('free-ad', { issueId: 'economy' }) },
  { key: 'rep-faith', title: 'Faith and Family Advocacy Network', party: 'rep', factionId: 'religious', type: 'advocacy_group', benefit: packageOf('turnout'), secondary: packageOf('free-ad', { issueId: 'abortion' }) },
  { key: 'green-climate', title: 'Green Climate Organizers Council', party: 'grn', factionId: 'climate', type: 'advocacy_group', benefit: packageOf('persuasion'), secondary: packageOf('free-ad', { issueId: 'energy' }) },
  { key: 'liberty-civic', title: 'Libertarian Civil Liberties Committee', party: 'lib', factionId: 'activists', type: 'advocacy_group', benefit: packageOf('persuasion'), secondary: packageOf('free-ad', { issueId: 'gerrymandering' }) },
]);

const localGroups = ENDORSER_STATES.flatMap((state) => LOCAL_TEMPLATES.map((template) => Object.freeze({
  id: `state-${state.abbr.toLowerCase()}-${template.key}`,
  name: `${state.name} ${template.title}`,
  level: 'state',
  benefitScope: 'state',
  state: state.abbr,
  type: template.type,
  party: template.party,
  factionId: template.factionId,
  positionByIssue: policyPositionsFor(template.party, template.factionId),
  demographicGroupId: demographicGroupFor(template.party, template.factionId),
  benefitPackage: template.benefit,
  secondaryBenefitPackages: Object.freeze([template.secondary]),
  endorsementThreshold: 46,
  campaignThreshold: 68,
  minimumFactionStanding: 38,
  minimumCampaignFactionStanding: 56,
  backgroundVisibility: 0.9,
  backgroundEndorsementWeight: 0.85,
  fictionalComposite: true,
  provenance: ENDORSER_ROSTER_PROVENANCE,
  displayNote: 'Scenario composite; not a real organization',
})));

const CANDIDATE_NAMES = Object.freeze({
  fdr: 'Franklin D. Roosevelt', ossoff: 'Jon Ossoff', newsom: 'Gavin Newsom', aoc: 'Alexandria Ocasio-Cortez',
  harris: 'Kamala Harris', beshear: 'Andy Beshear', buttigieg: 'Pete Buttigieg', whitmer: 'Gretchen Whitmer',
  shapiro: 'Josh Shapiro', klobuchar: 'Amy Klobuchar', booker: 'Cory Booker', warnock: 'Raphael Warnock', moore: 'Wes Moore',
  reagan: 'Ronald Reagan', vance: 'JD Vance', rubio: 'Marco Rubio', trumpjr: 'Donald Trump Jr.', desantis: 'Ron DeSantis',
  haley: 'Nikki Haley', carlson: 'Tucker Carlson', cruz: 'Ted Cruz', burlison: 'Eric Burlison', abbott: 'Greg Abbott',
  timscott: 'Tim Scott', youngkin: 'Glenn Youngkin', kemp: 'Brian Kemp', oliver: 'Chase Oliver', dsmith: 'Dave Smith',
  termaat: 'Mike ter Maat', mcardle: 'Angela McArdle', stein: 'Jill Stein', ware: 'Butch Ware', baraka: 'Ajamu Baraka',
  sawant: 'Kshama Sawant', eugene_debs: 'Eugene V. Debs', george_washington: 'George Washington',
});

function strongestFactionId(candidateId, party) {
  const support = CANDIDATE_FACTION_PROFILES[candidateId]?.factionSupport || {};
  const available = new Set((PARTY_FACTIONS[party] || []).map(({ id }) => id));
  return Object.entries(support)
    .filter(([id]) => available.has(id))
    .sort(([leftId, left], [rightId, right]) => Number(right) - Number(left) || leftId.localeCompare(rightId))[0]?.[0];
}

export const ENDORSER_CANDIDATES = Object.freeze(Object.entries(CANDIDATE_FACTION_PROFILES).filter(([id]) => Object.hasOwn(CANDIDATE_NAMES, id)).map(([candidateId, profile]) => {
  const factionId = strongestFactionId(candidateId, profile.party);
  return Object.freeze({ id: candidateId, name: CANDIDATE_NAMES[candidateId], party: profile.party, factionSupport: profile.factionSupport, factionId });
}));

const candidateGroups = ENDORSER_CANDIDATES.map((candidate) => Object.freeze({
  id: `candidate-${candidate.id}`,
  candidateId: candidate.id,
  personId: candidate.id,
  name: candidate.name,
  level: 'candidate',
  benefitScope: 'national',
  type: 'candidate',
  party: candidate.party,
  factionId: candidate.factionId,
  positionByIssue: policyPositionsFor(candidate.party, candidate.factionId),
  demographicGroupId: demographicGroupFor(candidate.party, candidate.factionId),
  benefitPackage: packageOf('turnout'),
  secondaryBenefitPackages: Object.freeze([packageOf('momentum')]),
  endorsementThreshold: 65,
  campaignThreshold: 78,
  minimumFactionStanding: 42,
  minimumCampaignFactionStanding: 60,
  backgroundVisibility: 0.7,
  backgroundEndorsementWeight: 0.7,
  isRealFigure: true,
  fictionalComposite: false,
  provenance: 'candidate profile; real person represented in the game roster',
}));

export const ENDORSER_ROSTER = Object.freeze([
  ...nationalGroups,
  ...localGroups,
  ...candidateGroups,
]);

export const ENDORSER_COUNTS = Object.freeze({
  national: nationalGroups.length,
  state: localGroups.length,
  candidate: candidateGroups.length,
  total: ENDORSER_ROSTER.length,
});

export const ENDORSER_FACTION_IDS_BY_PARTY = Object.freeze(Object.fromEntries(
  Object.entries(PARTY_FACTIONS).map(([party, factions]) => [party, factions.map(({ id }) => ({ id }))]),
));

/** Validate the catalog against native records supplied by the receiving build. */
export function validateBuild34EndorserRoster({
  states = ENDORSER_STATES,
  candidates = ENDORSER_CANDIDATES,
  factionIdsByParty = ENDORSER_FACTION_IDS_BY_PARTY,
  validIssueIds = SUPER_PAC_ISSUE_IDS,
} = {}) {
  const result = validateEndorserRoster(ENDORSER_ROSTER, states, candidates, factionIdsByParty);
  const errors = [...result.errors];
  const validIssues = new Set(validIssueIds || []);
  if (ENDORSER_COUNTS.national !== 50) errors.push(`Catalog source must contain exactly 50 national endorsers, found ${ENDORSER_COUNTS.national}`);
  if (ENDORSER_COUNTS.state !== ENDORSER_STATES.length * 8) {
    errors.push(`Expected exactly 8 state endorsers per state, found ${ENDORSER_COUNTS.state} across ${ENDORSER_STATES.length} states`);
  }
  if (ENDORSER_COUNTS.candidate !== Object.keys(CANDIDATE_NAMES).length) {
    errors.push(`Candidate endorser coverage mismatch: ${ENDORSER_COUNTS.candidate} records for ${Object.keys(CANDIDATE_NAMES).length} profiles`);
  }
  const missingNames = ENDORSER_CANDIDATES.filter((candidate) => !candidate.name);
  if (missingNames.length) errors.push(`Candidate endorser names missing for: ${missingNames.map(({ id }) => id).join(', ')}`);
  for (const group of ENDORSER_ROSTER) {
    if (!group.demographicGroupId) errors.push(`Endorser ${group.id} has no voter-group response mapping`);
    for (const [issueId, position] of Object.entries(group.positionByIssue || {})) {
      if (!validIssues.has(issueId)) errors.push(`Unknown policy issue ${issueId} on endorser ${group.id}`);
      if (!Number.isFinite(position) || position < 0 || position > 2) errors.push(`Invalid policy position on endorser ${group.id}:${issueId}`);
    }
    for (const benefit of [group.benefitPackage, ...(group.secondaryBenefitPackages || [])].filter(Boolean)) {
      if (benefit.issueId && validIssues.size && !validIssues.has(benefit.issueId)) {
        errors.push(`Unknown issue ${benefit.issueId} on endorser ${group.id}`);
      }
    }
  }
  return { ...result, valid: errors.length === 0, errors, counts: ENDORSER_COUNTS };
}
