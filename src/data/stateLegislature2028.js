/**
 * 2028 state legislative election schedule and chamber metadata.
 * Seat totals, term lengths, and 2026 seats-up counts mirror the NCSL 2026
 * chamber table. The 2028 cycle is derived from those terms and the four
 * states that elect their legislatures in odd-numbered years.
 *
 * The game intentionally has no state-legislative district map: each seat up
 * is a generic-ballot slot with zero candidate-quality and zero local lean.
 * Its modeled margin is exactly the state's current generic-ballot margin.
 */
import { validateLegislatureElectionMetadata } from '../lib/electionRuleResolvers.js';

export const STATE_LEGISLATURE_SOURCE = Object.freeze({
  chamberScheduleUrl: 'https://www.ncsl.org/elections-and-campaigns/2026-legislative-races-by-state-and-chamber',
  chamberSizeUrl: 'https://www.ncsl.org/state-legislatures-news/details/number-of-legislators-and-length-of-terms-in-years',
  oddYearScheduleUrl: 'https://www.ncsl.org/elections-and-campaigns/consolidating-election-dates',
  nonpartisanStatusUrl: 'https://www.ncsl.org/about-state-legislatures/state-partisan-composition',
  verifiedDate: '2026-11-10',
});

const ODD_YEAR_LEGISLATURE_STATES = new Set(['LA', 'MS', 'NJ', 'VA']);

// abbr, name, senate seats/term/2026-up, house seats/term/2026-up.
// A zero-seat chamber entry denotes Nebraska's absent lower house.
const STATE_ROWS = [
  ['AL', 'Alabama', 35, 4, 35, 105, 4, 105],
  ['AK', 'Alaska', 20, 4, 10, 40, 2, 40],
  ['AZ', 'Arizona', 30, 2, 30, 60, 2, 60],
  ['AR', 'Arkansas', 35, 4, 17, 100, 2, 100],
  ['CA', 'California', 40, 4, 20, 80, 2, 80],
  ['CO', 'Colorado', 35, 4, 17, 65, 2, 65],
  ['CT', 'Connecticut', 36, 2, 36, 151, 2, 151],
  ['DE', 'Delaware', 21, 4, 11, 41, 2, 41],
  ['FL', 'Florida', 40, 4, 20, 120, 2, 120],
  ['GA', 'Georgia', 56, 2, 56, 180, 2, 180],
  ['HI', 'Hawaii', 25, 4, 13, 51, 2, 51],
  ['ID', 'Idaho', 35, 2, 35, 70, 2, 70],
  ['IL', 'Illinois', 59, 4, 39, 118, 2, 118],
  ['IN', 'Indiana', 50, 4, 25, 100, 2, 100],
  ['IA', 'Iowa', 50, 4, 25, 100, 2, 100],
  ['KS', 'Kansas', 40, 4, 0, 125, 2, 125],
  ['KY', 'Kentucky', 38, 4, 19, 100, 2, 100],
  ['LA', 'Louisiana', 39, 4, 0, 105, 4, 0],
  ['ME', 'Maine', 35, 2, 35, 151, 2, 151],
  ['MD', 'Maryland', 47, 4, 47, 141, 4, 141],
  ['MA', 'Massachusetts', 40, 2, 40, 160, 2, 160],
  ['MI', 'Michigan', 38, 4, 38, 110, 2, 110],
  ['MN', 'Minnesota', 67, 4, 67, 134, 2, 134],
  ['MS', 'Mississippi', 52, 4, 0, 122, 4, 0],
  ['MO', 'Missouri', 34, 4, 17, 163, 2, 163],
  ['MT', 'Montana', 50, 4, 25, 100, 2, 100],
  ['NE', 'Nebraska', 49, 4, 24, 0, 0, 0],
  ['NV', 'Nevada', 21, 4, 11, 42, 2, 42],
  ['NH', 'New Hampshire', 24, 2, 24, 400, 2, 400],
  ['NJ', 'New Jersey', 40, 4, 0, 80, 2, 0],
  ['NM', 'New Mexico', 42, 4, 0, 70, 2, 70],
  ['NY', 'New York', 63, 2, 63, 150, 2, 150],
  ['NC', 'North Carolina', 50, 2, 50, 120, 2, 120],
  ['ND', 'North Dakota', 47, 4, 24, 94, 4, 48],
  ['OH', 'Ohio', 33, 4, 17, 99, 2, 99],
  ['OK', 'Oklahoma', 48, 4, 24, 101, 2, 101],
  ['OR', 'Oregon', 30, 4, 15, 60, 2, 60],
  ['PA', 'Pennsylvania', 50, 4, 25, 203, 2, 203],
  ['RI', 'Rhode Island', 38, 2, 38, 75, 2, 75],
  ['SC', 'South Carolina', 46, 4, 0, 124, 2, 124],
  ['SD', 'South Dakota', 35, 2, 35, 70, 2, 70],
  ['TN', 'Tennessee', 33, 4, 17, 99, 2, 99],
  ['TX', 'Texas', 31, 4, 16, 150, 2, 150],
  ['UT', 'Utah', 29, 4, 15, 75, 2, 75],
  ['VT', 'Vermont', 30, 2, 30, 150, 2, 150],
  ['VA', 'Virginia', 40, 4, 0, 100, 2, 0],
  ['WA', 'Washington', 49, 4, 24, 98, 2, 98],
  ['WV', 'West Virginia', 34, 4, 17, 100, 2, 100],
  ['WI', 'Wisconsin', 33, 4, 17, 99, 2, 99],
  ['WY', 'Wyoming', 31, 4, 16, 62, 2, 62],
];

function seatsUpIn2028({ stateId, totalSeats, termYears, seatsUp2026 }) {
  if (totalSeats === 0 || ODD_YEAR_LEGISLATURE_STATES.has(stateId)) return 0;
  if (termYears === 2) return totalSeats;
  if (seatsUp2026 === totalSeats) return 0;
  return totalSeats - seatsUp2026;
}

function cycleRule({ stateId, totalSeats, termYears, seatsUp2026 }) {
  if (ODD_YEAR_LEGISLATURE_STATES.has(stateId)) return 'odd-year-cycle-no-2028-election';
  if (termYears === 2) return 'biennial-all-seats';
  if (seatsUp2026 === totalSeats) return 'four-year-class-next-up-2030';
  if (seatsUp2026 === 0) return 'four-year-full-chamber-up-2028';
  return 'four-year-alternating-seat-classes';
}

function buildChamber(stateId, stateName, id, type, totalSeats, termYears, seatsUp2026, isNonpartisan = false) {
  if (totalSeats === 0) return null;
  const seatsUpCount2028 = seatsUpIn2028({ stateId, totalSeats, termYears, seatsUp2026 });
  const races2028 = Array.from({ length: seatsUpCount2028 }, (_, index) => ({
    id: `${stateId.toLowerCase()}-${id}-seat-${String(index + 1).padStart(3, '0')}`,
    seatSlotIndex: index + 1,
    baselineMargin: 0,
    candidateQuality: 0,
    districtId: null,
    baselineSource: 'exact state generic ballot; no district or candidate-quality adjustment',
  }));
  const chamberInput = { stateId, totalSeats, termYears, seatsUp2026 };
  return Object.freeze({
    id,
    type,
    totalSeatCount: totalSeats,
    termLengthYears: termYears,
    seatsUp2026,
    seatsUpCount2028,
    electionYear: seatsUpCount2028 > 0 ? 2028 : null,
    electionCycleRule: cycleRule({ stateId, ...chamberInput }),
    electionRuleId: isNonpartisan ? 'nonpartisan-generic-ballot-projection' : 'partisan-generic-ballot-projection',
    seatAllocationRule: 'one-seat-per-modeled-contest; state generic ballot applied uniformly',
    districtPlanId: 'statewide-generic-projection-no-district-map',
    projectionModel: isNonpartisan ? 'nonpartisan-ballot-unofficial-party-projection' : 'state-generic-ballot-no-candidate-quality',
    races2028: Object.freeze(races2028),
    sourceRecord: Object.freeze({
      title: `${stateName} 2028 chamber schedule derived from NCSL seat totals, terms, and 2026 seats-up table`,
      url: STATE_LEGISLATURE_SOURCE.chamberScheduleUrl,
      verifiedDate: STATE_LEGISLATURE_SOURCE.verifiedDate,
    }),
  });
}

export const STATE_LEGISLATURE_2028 = Object.freeze(STATE_ROWS.map(([
  stateId, stateName, senateSeats, senateTerm, senateSeatsUp2026, houseSeats, houseTerm, houseSeatsUp2026,
]) => {
  const isNebraska = stateId === 'NE';
  const chambers = isNebraska
    ? [buildChamber(stateId, stateName, 'unicameral', 'unicameral', senateSeats, senateTerm, senateSeatsUp2026, true)]
    : [
      buildChamber(stateId, stateName, 'senate', 'upper', senateSeats, senateTerm, senateSeatsUp2026),
      buildChamber(stateId, stateName, 'house', 'lower', houseSeats, houseTerm, houseSeatsUp2026),
    ].filter(Boolean);
  return Object.freeze({
    stateId,
    stateName,
    electionYear: chambers.some((chamber) => chamber.seatsUpCount2028 > 0) ? 2028 : null,
    electionMode: isNebraska ? 'officially-nonpartisan; modeled with unofficial party generic ballot' : 'partisan generic ballot',
    trifectaEligible: !isNebraska,
    chambers: Object.freeze(chambers),
  });
}));

export const STATE_LEGISLATURE_2028_BY_ID = Object.freeze(Object.fromEntries(
  STATE_LEGISLATURE_2028.map((state) => [state.stateId, state]),
));

export const STATE_LEGISLATURE_2028_COUNTS = Object.freeze({
  states: STATE_LEGISLATURE_2028.length,
  chambers: STATE_LEGISLATURE_2028.reduce((sum, state) => sum + state.chambers.length, 0),
  electionChambers: STATE_LEGISLATURE_2028.reduce((sum, state) => sum + state.chambers.filter((chamber) => chamber.seatsUpCount2028 > 0).length, 0),
  seats: STATE_LEGISLATURE_2028.reduce((sum, state) => sum + state.chambers.reduce((stateSum, chamber) => stateSum + chamber.totalSeatCount, 0), 0),
  seatsUp2028: STATE_LEGISLATURE_2028.reduce((sum, state) => sum + state.chambers.reduce((stateSum, chamber) => stateSum + chamber.seatsUpCount2028, 0), 0),
});

export function validateBuild34StateLegislatureCatalog({ expectedStateIds = STATE_ROWS.map(([abbr]) => abbr) } = {}) {
  const metadata = validateLegislatureElectionMetadata(STATE_LEGISLATURE_2028, expectedStateIds);
  const errors = [...metadata.errors];
  if (STATE_LEGISLATURE_2028_COUNTS.states !== 50) errors.push(`Expected 50 state records, found ${STATE_LEGISLATURE_2028_COUNTS.states}`);
  if (STATE_LEGISLATURE_2028_COUNTS.chambers !== 99) errors.push(`Expected 99 legislative chambers, found ${STATE_LEGISLATURE_2028_COUNTS.chambers}`);
  if (STATE_LEGISLATURE_2028_COUNTS.electionChambers !== 85) {
    errors.push(`Expected 85 chambers with regular 2028 elections, found ${STATE_LEGISLATURE_2028_COUNTS.electionChambers}`);
  }
  if (STATE_LEGISLATURE_2028_COUNTS.seats !== 7386) errors.push(`Expected 7,386 total state legislative seats, found ${STATE_LEGISLATURE_2028_COUNTS.seats}`);
  return { ...metadata, valid: errors.length === 0, errors, counts: STATE_LEGISLATURE_2028_COUNTS };
}
