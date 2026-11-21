// NCSL's Dec. 9, 2024 post-election snapshot. It explicitly describes the
// totals as unofficial and assumes all uncalled leads hold. It is chamber-level
// only; it does not identify a party holder for each statutory seat.
export const STATE_LEGISLATURE_RESULTS_2024_SOURCE = Object.freeze({
  title: '2024 State & Legislative Partisan Composition (post-election preliminary)',
  url: 'https://documents.ncsl.org/wwwncsl/Elections/LegisControl_2024_Post%20Election_Prelim_12.09.pdf',
  checkedOn: '2026-11-11',
  publishedOn: '2024-12-09',
  status: 'unofficial-preliminary',
  limitation: 'Chamber totals only; not a district-by-district roster. The source says uncalled leads are assumed to hold.',
});

// state, senate D/R/other, lower-house D/R/other. Nebraska has no lower house.
const RAW = [
  ['AL', [8, 27, 0], [29, 76, 0]], ['AK', [9, 11, 0], [14, 21, 5]],
  ['AZ', [13, 17, 0], [27, 33, 0]], ['AR', [6, 29, 0], [19, 81, 0]],
  ['CA', [30, 10, 0], [60, 20, 0]], ['CO', [23, 12, 0], [44, 21, 0]],
  ['CT', [25, 11, 0], [102, 49, 0]], ['DE', [15, 6, 0], [27, 14, 0]],
  ['FL', [12, 28, 0], [35, 85, 0]], ['GA', [23, 33, 0], [80, 100, 0]],
  ['HI', [22, 3, 0], [42, 9, 0]], ['ID', [6, 29, 0], [9, 61, 0]],
  ['IL', [40, 19, 0], [78, 40, 0]], ['IN', [10, 40, 0], [30, 70, 0]],
  ['IA', [15, 35, 0], [33, 67, 0]], ['KS', [9, 31, 0], [37, 88, 0]],
  ['KY', [7, 30, 1], [20, 80, 0]], ['LA', [11, 28, 0], [32, 73, 0]],
  ['ME', [20, 15, 0], [76, 73, 2]], ['MD', [34, 13, 0], [102, 39, 0]],
  ['MA', [35, 5, 0], [134, 25, 1]], ['MI', [20, 18, 0], [52, 58, 0]],
  ['MN', [34, 33, 0], [67, 67, 0]], ['MS', [16, 36, 0], [41, 79, 2]],
  ['MO', [10, 24, 0], [52, 111, 0]], ['MT', [18, 32, 0], [42, 58, 0]],
  ['NE', [0, 0, 49], null], ['NV', [13, 8, 0], [27, 15, 0]],
  ['NH', [8, 16, 0], [178, 222, 0]], ['NJ', [25, 15, 0], [52, 28, 0]],
  ['NM', [26, 16, 0], [44, 26, 0]], ['NY', [41, 22, 0], [103, 47, 0]],
  ['NC', [20, 30, 0], [49, 71, 0]], ['ND', [5, 42, 0], [11, 83, 0]],
  ['OH', [9, 24, 0], [34, 65, 0]], ['OK', [8, 40, 0], [20, 81, 0]],
  ['OR', [18, 12, 0], [36, 24, 0]], ['PA', [22, 28, 0], [102, 101, 0]],
  ['RI', [34, 4, 0], [64, 10, 1]], ['SC', [12, 34, 0], [36, 88, 0]],
  ['SD', [3, 32, 0], [6, 64, 0]], ['TN', [6, 27, 0], [24, 75, 0]],
  ['TX', [11, 20, 0], [62, 88, 0]], ['UT', [6, 23, 0], [14, 61, 0]],
  ['VT', [16, 13, 1], [87, 56, 7]], ['VA', [21, 19, 0], [51, 49, 0]],
  ['WA', [30, 19, 0], [59, 39, 0]], ['WV', [2, 32, 0], [9, 91, 0]],
  ['WI', [15, 18, 0], [45, 54, 0]], ['WY', [2, 29, 0], [6, 56, 0]],
];

const makeChamber = (abbr, chamber, counts) => counts && Object.freeze({
  abbr,
  chamber,
  totalSeats: counts.reduce((sum, value) => sum + value, 0),
  dem: counts[0],
  rep: counts[1],
  other: counts[2],
  sourceStatus: STATE_LEGISLATURE_RESULTS_2024_SOURCE.status,
});

export const STATE_LEGISLATURE_RESULTS_2024 = Object.freeze(RAW.flatMap(([abbr, upper, lower]) => [
  makeChamber(abbr, abbr === 'NE' ? 'unicameral' : 'upper', upper),
  makeChamber(abbr, 'lower', lower),
].filter(Boolean)));

export const STATE_LEGISLATURE_RESULTS_2024_BY_STATE = Object.freeze(
  STATE_LEGISLATURE_RESULTS_2024.reduce((lookup, chamber) => {
    (lookup[chamber.abbr] ||= []).push(chamber);
    return lookup;
  }, {}),
);

export const STATE_LEGISLATURE_RESULTS_2024_TOTALS = Object.freeze(
  STATE_LEGISLATURE_RESULTS_2024.reduce((totals, chamber) => ({
    seats: totals.seats + chamber.totalSeats,
    dem: totals.dem + chamber.dem,
    rep: totals.rep + chamber.rep,
    other: totals.other + chamber.other,
  }), { seats: 0, dem: 0, rep: 0, other: 0 }),
);

const EXPECTED_NCSL_TOTALS = { seats: 7386, dem: 3227, rep: 4090, other: 69 };
const totalsMatch = Object.entries(EXPECTED_NCSL_TOTALS).every(([key, value]) => STATE_LEGISLATURE_RESULTS_2024_TOTALS[key] === value);
if (STATE_LEGISLATURE_RESULTS_2024.length !== 99 || !totalsMatch) {
  throw new Error('2024 state-legislature chamber aggregates do not match the NCSL national table.');
}
