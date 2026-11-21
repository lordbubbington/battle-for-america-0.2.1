// Congress and the governorships, in the four-party scenario.
//
// In the four-party world the seats already held when the campaign starts are
// split as the scenario demands: the Libertarians take half of the seats the
// Republicans held, the Greens half of the Democrats' — and the 2028 races then
// fill the rest so the chamber lands roughly even, four ways.
//
// Everything in this file is a fixed, editable table. Change a number here and
// that state's result changes; the game reads these tables directly in surge
// mode and nothing rolls at random.
//
//   Senate — 66 seats are not on the 2028 ballot:
//     Republicans' 26 = 13 R + 13 Libertarian
//     Democrats'   40 = 20 D + 20 Green
//   The 34 races below then take the chamber to about 25 seats a party.
//
//   House — all 435 seats, state by state. Third-party seats are concentrated
//   in the Northeast and the West, where the two parties actually run well.
//
//   Governors — 39 seats are not up; the eleven 2028 races fill in the rest.

export const SENATE_4P_BASE = { dem: 29, rep: 16, lib: 13, grn: 8 };
export const GOV_4P_BASE = { dem: 15, rep: 14, lib: 6, grn: 4 };

// Who wins the Class 3 race, and by how much (a four-way lead in points).
export const SENATE_4P_RACES = {
  AL: { winner: 'lib', lead: 6.0 },
  AK: { winner: 'rep', lead: 2.2 },
  AR: { winner: 'lib', lead: 5.1 },
  FL: { winner: 'lib', lead: 3.4 },
  ID: { winner: 'lib', lead: 8.5 },
  IN: { winner: 'lib', lead: 2.6 },
  IA: { winner: 'lib', lead: 1.8 },
  KS: { winner: 'lib', lead: 4.2 },
  KY: { winner: 'lib', lead: 9.4 },
  LA: { winner: 'lib', lead: 3.1 },
  MO: { winner: 'rep', lead: 3.6 },
  NC: { winner: 'rep', lead: 1.2 },
  ND: { winner: 'lib', lead: 1.4 },
  OH: { winner: 'rep', lead: 2.4 },
  OK: { winner: 'lib', lead: 7.2 },
  SC: { winner: 'lib', lead: 2.1 },
  SD: { winner: 'rep', lead: 4.5 },
  UT: { winner: 'rep', lead: 5.8 },
  WI: { winner: 'rep', lead: 1.1 },
  AZ: { winner: 'rep', lead: 1.3 },
  CA: { winner: 'grn', lead: 9.1 },
  CO: { winner: 'dem', lead: 5.2 },
  CT: { winner: 'dem', lead: 8.4 },
  GA: { winner: 'rep', lead: 1.6 },
  HI: { winner: 'grn', lead: 12.3 },
  IL: { winner: 'dem', lead: 6.2 },
  MD: { winner: 'grn', lead: 6.4 },
  NV: { winner: 'rep', lead: 1.1 },
  NH: { winner: 'dem', lead: 1.5 },
  NY: { winner: 'grn', lead: 8.2 },
  OR: { winner: 'grn', lead: 4.3 },
  PA: { winner: 'rep', lead: 2.0 },
  VT: { winner: 'grn', lead: 15.1 },
  WA: { winner: 'dem', lead: 6.0 },
};

// How each state's House delegation splits, four ways. Each row sums to that
// state's seat count.
export const HOUSE_4P_SEATS = {
  AL: { dem: 2, rep: 3, lib: 1, grn: 1 },
  AK: { dem: 0, rep: 0, lib: 1, grn: 0 },
  AZ: { dem: 2, rep: 2, lib: 3, grn: 2 },
  AR: { dem: 1, rep: 2, lib: 1, grn: 0 },
  CA: { dem: 12, rep: 6, lib: 14, grn: 20 },
  CO: { dem: 2, rep: 1, lib: 2, grn: 3 },
  CT: { dem: 1, rep: 1, lib: 1, grn: 2 },
  DE: { dem: 0, rep: 0, lib: 0, grn: 1 },
  FL: { dem: 8, rep: 11, lib: 6, grn: 3 },
  GA: { dem: 5, rep: 5, lib: 2, grn: 2 },
  HI: { dem: 1, rep: 0, lib: 0, grn: 1 },
  ID: { dem: 0, rep: 1, lib: 1, grn: 0 },
  IL: { dem: 6, rep: 4, lib: 3, grn: 4 },
  IN: { dem: 3, rep: 3, lib: 2, grn: 1 },
  IA: { dem: 1, rep: 1, lib: 1, grn: 1 },
  KS: { dem: 1, rep: 1, lib: 1, grn: 1 },
  KY: { dem: 1, rep: 2, lib: 2, grn: 1 },
  LA: { dem: 2, rep: 3, lib: 1, grn: 0 },
  ME: { dem: 0, rep: 0, lib: 1, grn: 1 },
  MD: { dem: 2, rep: 1, lib: 1, grn: 4 },
  MA: { dem: 2, rep: 1, lib: 2, grn: 4 },
  MI: { dem: 5, rep: 4, lib: 2, grn: 2 },
  MN: { dem: 3, rep: 2, lib: 1, grn: 2 },
  MS: { dem: 1, rep: 2, lib: 1, grn: 0 },
  MO: { dem: 2, rep: 3, lib: 2, grn: 1 },
  MT: { dem: 0, rep: 1, lib: 1, grn: 0 },
  NE: { dem: 1, rep: 1, lib: 1, grn: 0 },
  NV: { dem: 1, rep: 1, lib: 1, grn: 1 },
  NH: { dem: 0, rep: 0, lib: 1, grn: 1 },
  NJ: { dem: 2, rep: 2, lib: 3, grn: 5 },
  NM: { dem: 1, rep: 0, lib: 1, grn: 1 },
  NY: { dem: 6, rep: 3, lib: 6, grn: 11 },
  NC: { dem: 5, rep: 5, lib: 2, grn: 2 },
  ND: { dem: 0, rep: 1, lib: 0, grn: 0 },
  OH: { dem: 5, rep: 5, lib: 3, grn: 2 },
  OK: { dem: 1, rep: 2, lib: 1, grn: 1 },
  OR: { dem: 1, rep: 1, lib: 2, grn: 2 },
  PA: { dem: 3, rep: 3, lib: 6, grn: 5 },
  RI: { dem: 0, rep: 0, lib: 1, grn: 1 },
  SC: { dem: 2, rep: 3, lib: 1, grn: 1 },
  SD: { dem: 0, rep: 1, lib: 0, grn: 0 },
  TN: { dem: 2, rep: 4, lib: 2, grn: 1 },
  TX: { dem: 7, rep: 9, lib: 14, grn: 8 },
  UT: { dem: 0, rep: 1, lib: 2, grn: 1 },
  VT: { dem: 0, rep: 0, lib: 0, grn: 1 },
  VA: { dem: 4, rep: 3, lib: 2, grn: 2 },
  WA: { dem: 2, rep: 1, lib: 3, grn: 4 },
  WV: { dem: 0, rep: 1, lib: 1, grn: 0 },
  WI: { dem: 2, rep: 3, lib: 2, grn: 1 },
  WY: { dem: 0, rep: 0, lib: 1, grn: 0 },
};

// The eleven governorships on the 2028 ballot.
export const GOV_4P_RACES = {
  DE: { winner: 'dem', lead: 6.0 },
  IN: { winner: 'rep', lead: 4.2 },
  MO: { winner: 'rep', lead: 5.4 },
  MT: { winner: 'dem', lead: 2.1 },
  NC: { winner: 'dem', lead: 1.2 },
  ND: { winner: 'lib', lead: 3.0 },
  NH: { winner: 'grn', lead: 1.5 },
  UT: { winner: 'rep', lead: 7.5 },
  VT: { winner: 'grn', lead: 14.2 },
  WA: { winner: 'dem', lead: 5.0 },
  WV: { winner: 'lib', lead: 6.2 },
};