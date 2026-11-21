import { STATE_LIST } from '@/data/states';

export const BUILD40_MODE_IDS = Object.freeze([
  'two-parties',
  'four-parties',
  'six-party',
  'regional-parties',
]);

export const BUILD40_MODE_OPTIONS = Object.freeze([
  { id: 'two-parties', label: 'Two Parties', description: 'A Democratic and Republican presidential contest.' },
  { id: 'four-parties', label: 'Four Parties', description: 'Libertarian and Green tickets begin with broader support.' },
  { id: 'six-party', label: 'Six Parties', description: 'Progressive and MAGA tickets join the race; Green is shown as Socialist.' },
  { id: 'regional-parties', label: 'Regional Parties', description: 'Farmer–Labor, Conservation, and Localist tickets lead in their home regions.' },
]);

export const BUILD40_REGIONAL_PARTY_STATES = Object.freeze({
  'farmer-labor': Object.freeze(['MN', 'WI', 'MI', 'IA', 'ND', 'SD']),
  conservation: Object.freeze(['MT', 'ID', 'WY', 'UT', 'CO', 'NV']),
  localist: Object.freeze(['ME', 'NH', 'VT', 'MA', 'RI', 'CT']),
});

export const BUILD40_REGIONAL_PARTY_IDS = Object.freeze(Object.keys(BUILD40_REGIONAL_PARTY_STATES));
export const BUILD40_SIX_PARTY_IDS = Object.freeze(['dem', 'rep', 'lib', 'grn', 'progressive', 'maga']);
export const BUILD40_SIX_TICKET_CANDIDATES = Object.freeze({
  progressive: Object.freeze(['bernie-sanders']),
  maga: Object.freeze(['vance']),
});
export const BUILD40_RESERVED_BLOC_POINTS = 20;
export const BUILD40_SIX_CROSSOVER_POINTS = 1.5;
// Retain 8% of the four-party proportional differences in Six Parties. The
// shared four-ticket baseline then averages 19.25 points when the exclusive
// tickets take 23 points, while retaining visible state and candidate inputs.
export const BUILD40_SIX_BASELINE_DEVIATION_FACTOR = 0.08;
export const BUILD40_FOUR_PARTY_TRANSFER_POINTS = 5;

// State-level population proxy used for reported national opening shares.
// Electoral votes are the game's canonical modeled electorate weights.
export const BUILD40_STATE_ELECTORATE_WEIGHTS = Object.freeze(Object.fromEntries(
  STATE_LIST.map(({ abbr, ev }) => [abbr, ev])
));

// Build 39's explicit independent scenarios are retained only for loading old saves.
export const BUILD40_LEGACY_MODE_IDS = Object.freeze(['favorite-sons-daughters']);

export const BUILD40_DEMOGRAPHIC_GROUPS = Object.freeze([
  { id: 'white', label: 'White voters' },
  { id: 'black', label: 'Black voters' },
  { id: 'hispanic', label: 'Hispanic voters' },
  { id: 'asian', label: 'Asian voters' },
  { id: 'other', label: 'Other modeled voters' },
]);

export const BUILD40_RACE_KINDS = Object.freeze(['pres', 'senate', 'gov']);

