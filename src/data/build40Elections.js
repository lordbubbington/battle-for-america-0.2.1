import { STATE_LIST } from '@/data/states';
import {
  REGIONAL_AI_ONLY_PARTIES,
  REGIONAL_ALL_TARGETS,
  REGIONAL_BORDER_STATES,
  REGIONAL_EXPLICIT_TARGETS,
  REGIONAL_FLAVOR_NOTE,
  REGIONAL_PARTY_IDS,
  REGIONAL_PARTY_STATES,
  REGIONAL_PLAYABLE_PARTIES,
} from '@/data/build39Scenarios';

// R01: Six Party Mode is removed from new-game mode selection; legacy saves
// continue to load via BUILD40_LEGACY_MODE_IDS.
export const BUILD40_MODE_IDS = Object.freeze([
  'two-parties',
  'four-parties',
  'regional-parties',
]);

export const BUILD40_MODE_OPTIONS = Object.freeze([
  { id: 'two-parties', label: 'Two Parties', description: 'A Democratic and Republican presidential contest.' },
  { id: 'four-parties', label: 'Four Parties', description: 'Libertarian and Green tickets begin with broader support.' },
  {
    id: 'regional-parties',
    label: 'Regional Parties',
    description: `Ten regional parties contest their home regions and neighboring states. ${REGIONAL_FLAVOR_NOTE}`,
  },
]);

// Single source of truth imported from build39Scenarios.js.
export const BUILD40_REGIONAL_PARTY_STATES = REGIONAL_PARTY_STATES;
export const BUILD40_REGIONAL_PARTY_IDS = REGIONAL_PARTY_IDS;
export const BUILD40_REGIONAL_AI_ONLY_PARTIES = REGIONAL_AI_ONLY_PARTIES;
export const BUILD40_REGIONAL_PLAYABLE_PARTIES = REGIONAL_PLAYABLE_PARTIES;
export const BUILD40_REGIONAL_EXPLICIT_TARGETS = REGIONAL_EXPLICIT_TARGETS;
export const BUILD40_REGIONAL_BORDER_STATES = REGIONAL_BORDER_STATES;
export const BUILD40_REGIONAL_ALL_TARGETS = REGIONAL_ALL_TARGETS;
export const BUILD40_REGIONAL_FLAVOR_NOTE = REGIONAL_FLAVOR_NOTE;

export const BUILD40_SIX_PARTY_IDS = Object.freeze(['dem', 'rep', 'lib', 'grn', 'progressive', 'maga']);
export const BUILD40_SIX_TICKET_CANDIDATES = Object.freeze({
  progressive: Object.freeze(['bernie-sanders']),
  maga: Object.freeze(['vance']),
});
export const BUILD40_RESERVED_BLOC_POINTS = 20;
export const BUILD40_SIX_CROSSOVER_POINTS = 1.5;
export const BUILD40_SIX_BASELINE_DEVIATION_FACTOR = 0.08;
export const BUILD40_FOUR_PARTY_TRANSFER_POINTS = 5;

// Kept for backward compatibility; national popular vote totals (R09) use actual
// modeled state ballot units (voteUnits) rather than electoral votes.
export const BUILD40_STATE_ELECTORATE_WEIGHTS = Object.freeze(Object.fromEntries(
  STATE_LIST.map(({ abbr, ev }) => [abbr, ev])
));

// Legacy modes retained strictly for loading and resuming old saves.
export const BUILD40_LEGACY_MODE_IDS = Object.freeze(['six-party', 'favorite-sons-daughters']);

export const BUILD40_DEMOGRAPHIC_GROUPS = Object.freeze([
  { id: 'white', label: 'White voters' },
  { id: 'black', label: 'Black voters' },
  { id: 'hispanic', label: 'Hispanic voters' },
  { id: 'asian', label: 'Asian voters' },
  { id: 'other', label: 'Other modeled voters' },
]);

export const BUILD40_RACE_KINDS = Object.freeze(['pres', 'senate', 'gov']);
