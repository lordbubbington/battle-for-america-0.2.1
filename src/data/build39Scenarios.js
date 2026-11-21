import { NEIGHBORS } from './neighbors.js';

// Six Party Mode is removed from new-game selection in 0.2.2; legacy saves
// remain playable through normalizeScenarioId / normalizeBuild40Mode.
export const SCENARIOS = Object.freeze([
  { id: 'standard', label: 'Standard', description: 'Choose the usual or four-party presidential race.', thirdMode: null },
  { id: 'regional-parties', label: 'Regional Parties', description: 'Ten regional parties contest elections across their home regions and neighboring states.', thirdMode: 'fringe' },
  { id: 'favorite-sons-daughters', label: 'Favorite Sons and Daughters', description: 'Independent presidential candidates campaign in their home states and neighboring states.', thirdMode: 'fringe' },
]);

export const LEGACY_SCENARIO_IDS = Object.freeze(['six-party', 'favorite-sons-daughters']);
export const BASE_SCENARIO_PARTIES = Object.freeze(['dem', 'rep', 'lib', 'grn', 'ind']);
export const SIX_PARTY_IDS = Object.freeze(['dem', 'rep', 'lib', 'grn', 'progressive', 'maga']);

// Preserved 0.2.1 presidential home-state opening target for Farmer-Labor and
// Boston Tea Party (formerly New England Localist): 10.25 * 538 / 113.
export const REGIONAL_021_HOME_PRES_SHARE = 10.25 * 538 / 113; // 48.80088495575221
export const REGIONAL_021_HOME_DOWNBALLOT_SHARE = 40;
export const REGIONAL_MAJOR_FLOOR = 5;
export const REGIONAL_CONFLICT_FLAG_THRESHOLD = 10;

export const REGIONAL_FLAVOR_NOTE =
  'Someone hit a button that destroyed all the parties, so Alaska and Hawaii figure they might as well get out now.';

export const REGIONAL_PARTY_IDS = Object.freeze([
  'farmer-labor',
  'localist',
  'west-coast',
  'lone-star',
  'appalachian',
  'southern-heritage',
  'alaskan-ind',
  'hawaiian-ind',
  'deseret',
  'rocky-mountain',
]);

export const REGIONAL_AI_ONLY_PARTIES = Object.freeze([
  'localist',
  'alaskan-ind',
  'hawaiian-ind',
  'rocky-mountain',
]);

export const REGIONAL_PLAYABLE_PARTIES = Object.freeze(
  REGIONAL_PARTY_IDS.filter((id) => !REGIONAL_AI_ONLY_PARTIES.includes(id))
);

// Canonical existing-roster nominees reused as regional presidential candidates.
export const REGIONAL_EXISTING_NOMINEES = Object.freeze({
  'farmer-labor': 'klobuchar',
  'west-coast': 'newsom',
  'lone-star': 'abbott',
  appalachian: 'beshear',
  'southern-heritage': 'desantis',
});

// Explicit opening state targets (percentage of valid votes before campaign effects).
// 'REP_REPLACE' in MS and AL replaces the Republican share and is exempt from the 5% Rep floor.
export const REGIONAL_EXPLICIT_TARGETS = Object.freeze({
  'farmer-labor': Object.freeze({
    MN: REGIONAL_021_HOME_PRES_SHARE, WI: REGIONAL_021_HOME_PRES_SHARE, MI: REGIONAL_021_HOME_PRES_SHARE,
    IA: REGIONAL_021_HOME_PRES_SHARE, ND: REGIONAL_021_HOME_PRES_SHARE, SD: REGIONAL_021_HOME_PRES_SHARE,
    IN: 40, NE: 40, KS: 40, IL: 30, PA: 30, MT: 20,
  }),
  localist: Object.freeze({
    ME: REGIONAL_021_HOME_PRES_SHARE, NH: REGIONAL_021_HOME_PRES_SHARE, VT: REGIONAL_021_HOME_PRES_SHARE,
    MA: REGIONAL_021_HOME_PRES_SHARE, RI: REGIONAL_021_HOME_PRES_SHARE, CT: REGIONAL_021_HOME_PRES_SHARE,
  }),
  'west-coast': Object.freeze({ CA: 40, OR: 40, WA: 40 }),
  'lone-star': Object.freeze({ TX: 65, AR: 40, OK: 40, NM: 40, LA: 30, KS: 5, MO: 5 }),
  appalachian: Object.freeze({ WV: 70, KY: 35, VA: 25, TN: 25, OH: 10, PA: 10, NC: 10 }),
  'southern-heritage': Object.freeze({ MS: 'REP_REPLACE', AL: 'REP_REPLACE', LA: 35, FL: 35, SC: 35, GA: 20, NC: 20, TN: 20 }),
  'alaskan-ind': Object.freeze({ AK: 85 }),
  'hawaiian-ind': Object.freeze({ HI: 85 }),
  deseret: Object.freeze({
    UT: 61.7, ID: 23.4, WY: 11.5, AZ: 5.8, NV: 5.5, HI: 4.8,
    OR: 3.5, WA: 3.5, CO: 2.5, CA: 1.9, TX: 1.2,
  }),
  'rocky-mountain': Object.freeze({ CO: 40, WY: 35, ID: 25, MT: 25, NM: 15, AZ: 15, UT: 10, NV: 10 }),
});

// Four Corners point contacts (AZ-CO and NM-UT) are NOT shared land borders.
const FOUR_CORNERS_EXCLUDED = new Set(['AZ:CO', 'CO:AZ', 'NM:UT', 'UT:NM']);

function buildFrozenBorderTable() {
  const bordersByParty = {};
  const allByParty = {};
  for (const party of REGIONAL_PARTY_IDS) {
    const explicit = REGIONAL_EXPLICIT_TARGETS[party] || {};
    const merged = { ...explicit };
    const borders = new Set();
    if (party !== 'alaskan-ind' && party !== 'hawaiian-ind') {
      const coreStates = Object.entries(explicit)
        .filter(([, val]) => val === 'REP_REPLACE' || (typeof val === 'number' && val >= 25))
        .map(([st]) => st);
      for (const core of coreStates) {
        for (const neighbor of (NEIGHBORS[core] || [])) {
          if (FOUR_CORNERS_EXCLUDED.has(`${core}:${neighbor}`)) continue;
          if (!Object.hasOwn(explicit, neighbor)) {
            borders.add(neighbor);
            merged[neighbor] = 10;
          }
        }
      }
    }
    bordersByParty[party] = Object.freeze([...borders].sort());
    allByParty[party] = Object.freeze(merged);
  }
  return {
    bordersByParty: Object.freeze(bordersByParty),
    allByParty: Object.freeze(allByParty),
  };
}

const FROZEN_REGIONAL = buildFrozenBorderTable();
export const REGIONAL_BORDER_STATES = FROZEN_REGIONAL.bordersByParty;
export const REGIONAL_ALL_TARGETS = FROZEN_REGIONAL.allByParty;

// States where each regional party has ballot access (explicit + 10% border states).
export const REGIONAL_PARTY_STATES = Object.freeze(
  Object.fromEntries(
    REGIONAL_PARTY_IDS.map((party) => [party, Object.freeze(Object.keys(REGIONAL_ALL_TARGETS[party]).sort())])
  )
);

// Legacy 0.2.1 home states retained for reading old saves (e.g. Conservation).
export const LEGACY_REGIONAL_PARTY_STATES = Object.freeze({
  conservation: Object.freeze(['MT', 'ID', 'WY', 'UT', 'CO', 'NV']),
});

// Border lists are scenario data. Utah and New Mexico touch only at Four Corners.
export const FAVORITE_BALLOT_ACCESS = Object.freeze({
  'favorite-mn': { home: 'MN', neighbors: ['IA', 'ND', 'SD', 'WI'], homeShare: 50 },
  'favorite-ut': { home: 'UT', neighbors: ['AZ', 'CO', 'ID', 'NV', 'WY'], homeShare: 54 },
  'favorite-me': { home: 'ME', neighbors: ['NH'], homeShare: 51 },
  'favorite-la': { home: 'LA', neighbors: ['AR', 'MS', 'TX'], homeShare: 50.5 },
});

export const SCENARIO_PARTIES = Object.freeze({
  grn: { id: 'grn', label: 'Socialist', name: 'Socialist Party', short: 'S', color: '#D65F9D',
    issues: ['economy', 'affordability', 'health'], stances: { economy: 0, affordability: 0, health: 0 }, description: 'Labor organizing and affordability, with its strongest base in the Midwest.' },
  progressive: { id: 'progressive', label: 'Progressive', name: 'Progressive Party', short: 'P', color: '#9477F7' },
  maga: { id: 'maga', label: 'MAGA', name: 'MAGA Party', short: 'M', color: '#B76037' },
  'farmer-labor': { id: 'farmer-labor', label: 'Farmer–Labor', name: 'Farmer–Labor Party', short: 'FL', color: '#B78B16' },
  localist: { id: 'localist', label: 'Boston Tea Party', name: 'Boston Tea Party', short: 'BT', color: '#8E76D1', aiOnly: true },
  'west-coast': { id: 'west-coast', label: 'West Coast Alliance', name: 'West Coast Alliance', short: 'WC', color: '#008C86' },
  'lone-star': { id: 'lone-star', label: 'Lone Star Alliance', name: 'Lone Star Alliance', short: 'LS', color: '#B43555' },
  appalachian: { id: 'appalachian', label: 'Appalachian Commons', name: 'Appalachian Commons', short: 'AC', color: '#788D2B' },
  'southern-heritage': { id: 'southern-heritage', label: 'Southern Heritage', name: 'Southern Heritage Party', short: 'SH', color: '#76233F' },
  'alaskan-ind': { id: 'alaskan-ind', label: 'Alaskan Independence', name: 'Alaskan Independence Party', short: 'AK', color: '#31A3CC', aiOnly: true },
  'hawaiian-ind': { id: 'hawaiian-ind', label: 'Hawaiian Independence', name: 'Hawaiian Independence Party', short: 'HI', color: '#CC469A', aiOnly: true },
  deseret: { id: 'deseret', label: 'Deseret Party', name: 'Deseret Party', short: 'DS', color: '#F28C28' },
  'rocky-mountain': { id: 'rocky-mountain', label: 'Rocky Mountain', name: 'Rocky Mountain Party', short: 'RM', color: '#24754B', aiOnly: true },
  // Retained for legacy 0.2.1 saves only (removed from new regional campaigns).
  conservation: { id: 'conservation', label: 'Conservation', name: 'Mountain Conservation Party', short: 'C', color: '#36B7AA', legacy: true },
  'favorite-mn': { id: 'favorite-mn', label: 'Lindholm (I)', name: 'Nora Lindholm (Independent)', short: 'NL', color: '#CB8DE3' },
  'favorite-ut': { id: 'favorite-ut', label: 'Hale (I)', name: 'Micah Hale (Independent)', short: 'MH', color: '#D38A52' },
  'favorite-me': { id: 'favorite-me', label: 'Bouchard (I)', name: 'Elise Bouchard (Independent)', short: 'EB', color: '#4FB4C8' },
  'favorite-la': { id: 'favorite-la', label: 'Broussard (I)', name: 'Jules Broussard (Independent)', short: 'JB', color: '#BC9D50' },
});

const nominee = (id, name, short, state, home, title, bio, extra = {}) => Object.freeze({
  id, name, short, state, home, title, bio, party: id, weight: 1, color: SCENARIO_PARTIES[id].color,
  portrait: null, strengths: ['Dedicated home-state organizers'], weaknesses: ['Limited crossover support'],
  nat: 0, region: {}, ratings: { debate: 10, speech: 10, rally: 10, corruption: 10, ...(extra.ratings || {}) },
  ...extra,
});

export const SCENARIO_CANDIDATES = Object.freeze({
  progressive: nominee('progressive', 'Carmen Vega', 'Vega', 'California', 'CA', 'The Reform Organizer', 'A fictional organizer leading a nationwide progressive campaign.'),
  maga: nominee('maga', 'Grant Mercer', 'Mercer', 'Florida', 'FL', 'The Populist Broadcaster', 'A fictional broadcaster mobilizing the MAGA party across the country.'),
  'farmer-labor': nominee('farmer-labor', 'Amy Klobuchar', 'Klobuchar', 'Minnesota', 'MN', 'Farmer–Labor Standard-Bearer', 'Minnesota senator leading the Midwest Farmer–Labor coalition.', { baseCandidateId: 'klobuchar' }),
  localist: nominee('localist', 'Eleanor March', 'March', 'Vermont', 'VT', 'The Town Meeting Candidate', 'A fictional municipal reformer leading the Boston Tea Party across New England.', { aiOnly: true, fictional: true }),
  'west-coast': nominee('west-coast', 'Gavin Newsom', 'Newsom', 'California', 'CA', 'West Coast Alliance Nominee', 'California governor heading the West Coast Alliance ticket across the Pacific states.', { baseCandidateId: 'newsom' }),
  'lone-star': nominee('lone-star', 'Greg Abbott', 'Abbott', 'Texas', 'TX', 'Lone Star Alliance Nominee', 'Texas governor anchoring the Lone Star Alliance across Texas and its neighbors.', { baseCandidateId: 'abbott' }),
  appalachian: nominee('appalachian', 'Andy Beshear', 'Beshear', 'Kentucky', 'KY', 'Appalachian Commons Nominee', 'Kentucky governor rallying the Appalachian Commons across the mountain and border states.', { baseCandidateId: 'beshear' }),
  'southern-heritage': nominee('southern-heritage', 'Ron DeSantis', 'DeSantis', 'Florida', 'FL', 'Southern Heritage Nominee', 'Florida governor leading the far-right Southern Heritage Party across the Deep South.', { baseCandidateId: 'desantis' }),
  'alaskan-ind': nominee('alaskan-ind', 'Mara Kitt', 'Kitt', 'Alaska', 'AK', 'Alaskan Independence Nominee', 'A fictional Alaska organizer advocating Alaskan independence.', { aiOnly: true, fictional: true }),
  'hawaiian-ind': nominee('hawaiian-ind', 'Leilani Kealoha', 'Kealoha', 'Hawaii', 'HI', 'Hawaiian Independence Nominee', 'A fictional Hawaii organizer advocating Hawaiian independence.', { aiOnly: true, fictional: true }),
  deseret: nominee('deseret', 'Evan McMullin', 'McMullin', 'Utah', 'UT', 'Deseret Party Nominee', 'Utah independent and former presidential contender leading the Deseret Party across the Mountain West.', { portrait: '/art/candidates/expressions/mcmullin-smile.png' }),
  'rocky-mountain': nominee('rocky-mountain', 'Jordan Mercer', 'Mercer', 'Colorado', 'CO', 'Rocky Mountain Nominee', 'A fictional Colorado coalition builder leading the Rocky Mountain Party.', { aiOnly: true, fictional: true }),
  // Legacy 0.2.1 save compatibility only:
  conservation: nominee('conservation', 'Rowan Pike', 'Pike', 'Montana', 'MT', 'The Public Lands Advocate', 'A fictional candidate building a Mountain West campaign around conservation and local stewardship.', { legacy: true }),
  'favorite-mn': nominee('favorite-mn', 'Nora Lindholm', 'Lindholm', 'Minnesota', 'MN', 'Minnesota’s Favorite', 'A fictional independent with a coalition built through Minnesota civic institutions.'),
  'favorite-ut': nominee('favorite-ut', 'Micah Hale', 'Hale', 'Utah', 'UT', 'Utah’s Favorite', 'A fictional independent who starts with a powerful Utah network.'),
  'favorite-me': nominee('favorite-me', 'Elise Bouchard', 'Bouchard', 'Maine', 'ME', 'Maine’s Favorite', 'A fictional independent with support in Maine and across its New Hampshire border.'),
  'favorite-la': nominee('favorite-la', 'Jules Broussard', 'Broussard', 'Louisiana', 'LA', 'Louisiana’s Favorite', 'A fictional independent focused on Louisiana and its immediate neighbors.'),
});
