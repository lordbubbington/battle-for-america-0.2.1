// 2028 state-legislature election schedule. Chamber totals, term lengths, and
// 2026 seats-up counts come from NCSL's 2026 table; 2028 counts are derived
// from each state's regular term cycle. Individual district class assignments
// for staggered chambers still require state-level calendar verification.
const SOURCE = {
  title: '2026 Legislative Races by State and Chamber',
  url: 'https://www.ncsl.org/elections-and-campaigns/2026-legislative-races-by-state-and-chamber',
  checkedOn: '2026-11-10',
};

/** @type {[string, string, [number, number, number, string], [number, number, number, string]][]} */
const RAW = [
  ['AL', 'Alabama', [35, 4, 35, 'all-in-2026'], [105, 4, 105, 'all-in-2026']],
  ['AK', 'Alaska', [20, 4, 10, 'alternating'], [40, 2, 40, 'even-two-year']],
  ['AZ', 'Arizona', [30, 2, 30, 'even-two-year'], [60, 2, 60, 'even-two-year']],
  ['AR', 'Arkansas', [35, 4, 17, 'alternating'], [100, 2, 100, 'even-two-year']],
  ['CA', 'California', [40, 4, 20, 'alternating'], [80, 2, 80, 'even-two-year']],
  ['CO', 'Colorado', [35, 4, 17, 'alternating'], [65, 2, 65, 'even-two-year']],
  ['CT', 'Connecticut', [36, 2, 36, 'even-two-year'], [151, 2, 151, 'even-two-year']],
  ['DE', 'Delaware', [21, 4, 11, 'alternating'], [41, 2, 41, 'even-two-year']],
  ['FL', 'Florida', [40, 4, 20, 'alternating'], [120, 2, 120, 'even-two-year']],
  ['GA', 'Georgia', [56, 2, 56, 'even-two-year'], [180, 2, 180, 'even-two-year']],
  ['HI', 'Hawaii', [25, 4, 13, 'alternating'], [51, 2, 51, 'even-two-year']],
  ['ID', 'Idaho', [35, 2, 35, 'even-two-year'], [70, 2, 70, 'even-two-year']],
  ['IL', 'Illinois', [59, 4, 39, 'alternating'], [118, 2, 118, 'even-two-year']],
  ['IN', 'Indiana', [50, 4, 25, 'alternating'], [100, 2, 100, 'even-two-year']],
  ['IA', 'Iowa', [50, 4, 25, 'alternating'], [100, 2, 100, 'even-two-year']],
  ['KS', 'Kansas', [40, 4, 0, 'even-2024-2028'], [125, 2, 125, 'even-two-year']],
  ['KY', 'Kentucky', [38, 4, 19, 'alternating'], [100, 2, 100, 'even-two-year']],
  ['LA', 'Louisiana', [39, 4, 0, 'odd-2027'], [105, 4, 0, 'odd-2027']],
  ['ME', 'Maine', [35, 2, 35, 'even-two-year'], [151, 2, 151, 'even-two-year']],
  ['MD', 'Maryland', [47, 4, 47, 'all-in-2026'], [141, 4, 141, 'all-in-2026']],
  ['MA', 'Massachusetts', [40, 2, 40, 'even-two-year'], [160, 2, 160, 'even-two-year']],
  ['MI', 'Michigan', [38, 4, 38, 'all-in-2026'], [110, 2, 110, 'even-two-year']],
  ['MN', 'Minnesota', [67, 4, 67, 'all-in-2026'], [134, 2, 134, 'even-two-year']],
  ['MS', 'Mississippi', [52, 4, 0, 'odd-2027'], [122, 4, 0, 'odd-2027']],
  ['MO', 'Missouri', [34, 4, 17, 'alternating'], [163, 2, 163, 'even-two-year']],
  ['MT', 'Montana', [50, 4, 25, 'alternating'], [100, 2, 100, 'even-two-year']],
  ['NE', 'Nebraska', [49, 4, 24, 'nebraska'], [0, 0, 0, 'none']],
  ['NV', 'Nevada', [21, 4, 11, 'alternating'], [42, 2, 42, 'even-two-year']],
  ['NH', 'New Hampshire', [24, 2, 24, 'even-two-year'], [400, 2, 400, 'even-two-year']],
  ['NJ', 'New Jersey', [40, 4, 0, 'odd-2027'], [80, 2, 0, 'odd-2027']],
  ['NM', 'New Mexico', [42, 4, 0, 'even-2024-2028'], [70, 2, 70, 'even-two-year']],
  ['NY', 'New York', [63, 2, 63, 'even-two-year'], [150, 2, 150, 'even-two-year']],
  ['NC', 'North Carolina', [50, 2, 50, 'even-two-year'], [120, 2, 120, 'even-two-year']],
  ['ND', 'North Dakota', [47, 4, 24, 'alternating'], [94, 4, 48, 'alternating']],
  ['OH', 'Ohio', [33, 4, 17, 'alternating'], [99, 2, 99, 'even-two-year']],
  ['OK', 'Oklahoma', [48, 4, 24, 'alternating'], [101, 2, 101, 'even-two-year']],
  ['OR', 'Oregon', [30, 4, 15, 'alternating'], [60, 2, 60, 'even-two-year']],
  ['PA', 'Pennsylvania', [50, 4, 25, 'alternating'], [203, 2, 203, 'even-two-year']],
  ['RI', 'Rhode Island', [38, 2, 38, 'even-two-year'], [75, 2, 75, 'even-two-year']],
  ['SC', 'South Carolina', [46, 4, 0, 'even-2024-2028'], [124, 2, 124, 'even-two-year']],
  ['SD', 'South Dakota', [35, 2, 35, 'even-two-year'], [70, 2, 70, 'even-two-year']],
  ['TN', 'Tennessee', [33, 4, 17, 'alternating'], [99, 2, 99, 'even-two-year']],
  ['TX', 'Texas', [31, 4, 16, 'alternating'], [150, 2, 150, 'even-two-year']],
  ['UT', 'Utah', [29, 4, 15, 'alternating'], [75, 2, 75, 'even-two-year']],
  ['VT', 'Vermont', [30, 2, 30, 'even-two-year'], [150, 2, 150, 'even-two-year']],
  ['VA', 'Virginia', [40, 4, 0, 'odd-2027'], [100, 2, 0, 'odd-2027']],
  ['WA', 'Washington', [49, 4, 24, 'alternating'], [98, 2, 98, 'even-two-year']],
  ['WV', 'West Virginia', [34, 4, 17, 'alternating'], [100, 2, 100, 'even-two-year']],
  ['WI', 'Wisconsin', [33, 4, 17, 'alternating'], [99, 2, 99, 'even-two-year']],
  ['WY', 'Wyoming', [31, 4, 16, 'alternating'], [62, 2, 62, 'even-two-year']],
];

const MULTI_MEMBER = {
  AZ: { lower: { districts: 30, multiMemberDistricts: 30, membersInMultiMemberDistricts: 60, method: 'block-vote' } },
  ID: { lower: { districts: 35, multiMemberDistricts: 35, membersInMultiMemberDistricts: 70, method: 'seat-post' } },
  MD: { lower: { districts: 71, multiMemberDistricts: 41, membersInMultiMemberDistricts: 111, method: 'block-vote' } },
  NH: { lower: { districts: 203, multiMemberDistricts: 103, membersInMultiMemberDistricts: 300, method: 'block-vote' } },
  ND: { lower: { districts: 48, multiMemberDistricts: 46, membersInMultiMemberDistricts: 92, method: 'block-vote' } },
  SD: { lower: { districts: 37, multiMemberDistricts: 33, membersInMultiMemberDistricts: 66, method: 'block-vote' } },
  VT: {
    upper: { districts: 16, multiMemberDistricts: 9, membersInMultiMemberDistricts: 23, method: 'block-vote' },
    lower: { districts: 109, multiMemberDistricts: 41, membersInMultiMemberDistricts: 82, method: 'block-vote' },
  },
  WA: { lower: { districts: 49, multiMemberDistricts: 49, membersInMultiMemberDistricts: 98, method: 'seat-post' } },
  WV: { upper: { districts: 17, multiMemberDistricts: 17, membersInMultiMemberDistricts: 34, method: 'staggered-seat' } },
};

function seatsUp2028(totalSeats, termYears, seatsUp2026, cycle) {
  if (totalSeats === 0) return 0;
  if (cycle === 'nebraska') return totalSeats - seatsUp2026;
  if (cycle === 'alternating') return totalSeats - seatsUp2026;
  if (cycle === 'even-2024-2028') return totalSeats;
  if (cycle === 'even-two-year') return totalSeats;
  return 0;
}

function chamberRecord(abbr, chamber, [totalSeats, termYears, seatsUp2026, cycle]) {
  if (!totalSeats) return null;
  const seatsUp = seatsUp2028(totalSeats, termYears, seatsUp2026, cycle);
  const special = MULTI_MEMBER[abbr]?.[chamber];
  const districtCount = special?.districts || totalSeats;
  return {
    chamber,
    totalSeats,
    termYears,
    seatsUp2026,
    seatsUp2028: seatsUp,
    nextRegularElection: seatsUp > 0 ? 2028 : (cycle === 'odd-2027' ? 2027 : 2030),
    districtCount,
    districtStructure: special
      ? {
          kind: 'multi-member',
          multiMemberDistricts: special.multiMemberDistricts,
          membersInMultiMemberDistricts: special.membersInMultiMemberDistricts,
          method: special.method,
        }
      : { kind: abbr === 'NE' ? 'nonpartisan-single-member' : 'single-member' },
    districtCycleStatus: cycle === 'alternating' ? 'district-class-list-required' : 'all-districts-or-no-race',
  };
}

export const STATE_LEGISLATURE_SOURCE = SOURCE;
export const STATE_LEGISLATURES_2028 = RAW.map(([abbr, name, upper, lower]) => ({
  abbr,
  name,
  nonpartisanUnicameral: abbr === 'NE',
  chambers: abbr === 'NE'
    ? [
        {
          chamber: 'unicameral',
          totalSeats: upper[0],
          termYears: upper[1],
          seatsUp2026: upper[2],
          seatsUp2028: seatsUp2028(upper[0], upper[1], upper[2], upper[3]),
          nextRegularElection: 2028,
          districtCount: upper[0],
          districtStructure: { kind: 'nonpartisan-single-member' },
          districtCycleStatus: 'alternating-districts-require-official-list',
        },
      ]
    : [chamberRecord(abbr, 'upper', upper), chamberRecord(abbr, 'lower', lower)].filter(Boolean),
}));

export const STATE_LEGISLATURE_2028_SUMMARY = STATE_LEGISLATURES_2028.reduce((summary, state) => {
  const activeChambers = state.chambers.filter((chamber) => chamber.seatsUp2028 > 0);
  if (activeChambers.length) summary.statesWithElections += 1;
  summary.chambersWithElections += activeChambers.length;
  summary.seatsUp += activeChambers.reduce((sum, chamber) => sum + chamber.seatsUp2028, 0);
  summary.totalSeats += state.chambers.reduce((sum, chamber) => sum + chamber.totalSeats, 0);
  summary.districts += state.chambers.reduce((sum, chamber) => sum + chamber.districtCount, 0);
  return summary;
}, { statesWithElections: 0, chambersWithElections: 0, seatsUp: 0, totalSeats: 0, districts: 0 });

