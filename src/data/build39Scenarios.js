export const SCENARIOS = Object.freeze([
  { id: 'standard', label: 'Standard', description: 'Choose the usual or four-party presidential race.', thirdMode: null },
  { id: 'six-party', label: 'Six-party race', description: 'Progressive and MAGA tickets join the race. The Green ticket becomes Socialist.', thirdMode: 'surge' },
  { id: 'regional-parties', label: 'Regional Parties', description: 'Three regional parties contest elections in their home states.', thirdMode: 'fringe' },
  { id: 'favorite-sons-daughters', label: 'Favorite Sons and Daughters', description: 'Independent presidential candidates campaign in their home states and neighboring states.', thirdMode: 'fringe' },
]);

export const BASE_SCENARIO_PARTIES = Object.freeze(['dem', 'rep', 'lib', 'grn', 'ind']);
export const SIX_PARTY_IDS = Object.freeze(['dem', 'rep', 'lib', 'grn', 'progressive', 'maga']);

export const REGIONAL_PARTY_STATES = Object.freeze({
  'farmer-labor': Object.freeze(['MN', 'WI', 'MI', 'IA', 'ND', 'SD']),
  conservation: Object.freeze(['MT', 'ID', 'WY', 'UT', 'CO', 'NV']),
  localist: Object.freeze(['ME', 'NH', 'VT', 'MA', 'RI', 'CT']),
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
  'farmer-labor': { id: 'farmer-labor', label: 'Farmer–Labor', name: 'Farmer–Labor Party', short: 'FL', color: '#BC9029' },
  conservation: { id: 'conservation', label: 'Conservation', name: 'Mountain Conservation Party', short: 'C', color: '#36B7AA' },
  localist: { id: 'localist', label: 'New England Localist', name: 'New England Localist Party', short: 'NL', color: '#6B8EC7' },
  'favorite-mn': { id: 'favorite-mn', label: 'Lindholm (I)', name: 'Nora Lindholm (Independent)', short: 'NL', color: '#CB8DE3' },
  'favorite-ut': { id: 'favorite-ut', label: 'Hale (I)', name: 'Micah Hale (Independent)', short: 'MH', color: '#D38A52' },
  'favorite-me': { id: 'favorite-me', label: 'Bouchard (I)', name: 'Elise Bouchard (Independent)', short: 'EB', color: '#4FB4C8' },
  'favorite-la': { id: 'favorite-la', label: 'Broussard (I)', name: 'Jules Broussard (Independent)', short: 'JB', color: '#BC9D50' },
});

const nominee = (id, name, short, state, home, title, bio, ratings = {}) => Object.freeze({
  id, name, short, state, home, title, bio, party: id, weight: 1, color: SCENARIO_PARTIES[id].color,
  portrait: null, strengths: ['Dedicated home-state organizers'], weaknesses: ['Limited crossover support'],
  nat: 0, region: {}, ratings: { debate: 10, speech: 10, rally: 10, corruption: 10, ...ratings },
});

export const SCENARIO_CANDIDATES = Object.freeze({
  progressive: nominee('progressive', 'Carmen Vega', 'Vega', 'California', 'CA', 'The Reform Organizer', 'A fictional organizer leading a nationwide progressive campaign.'),
  maga: nominee('maga', 'Grant Mercer', 'Mercer', 'Florida', 'FL', 'The Populist Broadcaster', 'A fictional broadcaster mobilizing the MAGA party across the country.'),
  'farmer-labor': nominee('farmer-labor', 'Maren Solberg', 'Solberg', 'Minnesota', 'MN', 'The Co-op Organizer', 'A fictional leader of a Midwest farm and labor coalition.'),
  conservation: nominee('conservation', 'Rowan Pike', 'Pike', 'Montana', 'MT', 'The Public Lands Advocate', 'A fictional candidate building a Mountain West campaign around conservation and local stewardship.'),
  localist: nominee('localist', 'Eleanor March', 'March', 'Vermont', 'VT', 'The Town Meeting Candidate', 'A fictional municipal reformer running on local control across New England.'),
  'favorite-mn': nominee('favorite-mn', 'Nora Lindholm', 'Lindholm', 'Minnesota', 'MN', 'Minnesota’s Favorite', 'A fictional independent with a coalition built through Minnesota civic institutions.'),
  'favorite-ut': nominee('favorite-ut', 'Micah Hale', 'Hale', 'Utah', 'UT', 'Utah’s Favorite', 'A fictional independent who starts with a powerful Utah network.'),
  'favorite-me': nominee('favorite-me', 'Elise Bouchard', 'Bouchard', 'Maine', 'ME', 'Maine’s Favorite', 'A fictional independent with support in Maine and across its New Hampshire border.'),
  'favorite-la': nominee('favorite-la', 'Jules Broussard', 'Broussard', 'Louisiana', 'LA', 'Louisiana’s Favorite', 'A fictional independent focused on Louisiana and its immediate neighbors.'),
});
