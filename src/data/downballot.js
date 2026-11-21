// The rest of the ballot.
//
// The House is 435 seats allocated from the 2020 census. Governors are the
// eleven states that vote in 2028 (DE, IN, MO, MT, NC, ND, NH, UT, VT, WA, WV).
// The Senate class lives in senate.js; this file holds what the other two
// chambers need, plus the two independent insurgencies the game can switch on.

import { COLOR_TOKENS } from '@/lib/marginColors';

export const HOUSE_MAJORITY = 218;
export const SENATE_MAJORITY = 51;

// 2020 apportionment. Sums to 435.
export const HOUSE_SEATS = {
  AL: 7, AK: 1, AZ: 9, AR: 4, CA: 52, CO: 8, CT: 5, DE: 1, FL: 28, GA: 14,
  HI: 2, ID: 2, IL: 17, IN: 9, IA: 4, KS: 4, KY: 6, LA: 6, ME: 2, MD: 8,
  MA: 9, MI: 13, MN: 8, MS: 4, MO: 8, MT: 2, NE: 3, NV: 4, NH: 2, NJ: 12,
  NM: 3, NY: 26, NC: 14, ND: 1, OH: 15, OK: 5, OR: 6, PA: 17, RI: 2, SC: 7,
  SD: 1, TN: 9, TX: 38, UT: 4, VT: 1, VA: 11, WA: 10, WV: 2, WI: 8, WY: 1,
};

export const HOUSE_TOTAL = 435;

// `mod` is a Democratic-minus-Republican offset: the state's habit of electing a
// governor from the other party than its presidential vote.
//
// `quality` is a guaranteed candidate-quality bonus, also Democratic-minus-
// Republican, for a race where everybody already knows who is running: no dice
// are rolled, the recruit is worth exactly what it says. A Republican who is
// worth ten points is a quality of −10.
export const GOVERNOR_RACES = [
  { state: 'DE', defending: 'dem', mod: 4.0 },
  { state: 'IN', defending: 'rep', mod: -2.0 },
  { state: 'MO', defending: 'rep', mod: -2.0 },
  { state: 'MT', defending: 'rep', mod: -1.0 },
  { state: 'NC', defending: 'dem', mod: 1.0 },
  { state: 'ND', defending: 'rep', mod: -4.0 },
  { state: 'NH', defending: 'rep', mod: 0.0 },
  { state: 'UT', defending: 'rep', mod: -6.0 },
  {
    state: 'VT',
    defending: 'rep',
    mod: -12.0,
    quality: -10,
    candidate: 'Phil Scott',
    note: 'Phil Scott · a Republican who wins this state by 40',
  },
  { state: 'WA', defending: 'dem', mod: 4.0 },
  { state: 'WV', defending: 'rep', mod: -6.0 },
];

export const GOVERNOR_BY_STATE = GOVERNOR_RACES.reduce((acc, r) => {
  acc[r.state] = r;
  return acc;
}, {});

// Democrats can be swapped out for independents in the three states where the
// party brand is the problem. They poll better than the Democrat would, and they
// are not a Democrat.
export const INDIE_SENATE_RACES = {
  ND: {
    name: 'Katrina Christiansen',
    title: 'Independent',
    color: COLOR_TOKENS.independent,
    colorKey: 'ind',
    mod: 5.0,
    note: 'Democrat-turned-independent · the party label stays off the ballot',
  },
  SD: {
    name: 'Sheryl Johnson',
    title: 'Independent',
    color: COLOR_TOKENS.independent,
    colorKey: 'ind',
    mod: 4.0,
    note: 'Democrat-turned-independent · runs against both parties',
  },
  ID: {
    name: 'Kaylee Peterson',
    title: 'Independent',
    color: COLOR_TOKENS.independent,
    colorKey: 'ind',
    mod: 3.0,
    note: 'Democrat-turned-independent · no Democrat on the ballot',
  },
};

// Utah, where the Democrat stands down and endorses the independent.
export const UTAH_INDEPENDENT = {
  state: 'UT',
  name: 'Evan McMullin',
  title: 'Independent',
  color: COLOR_TOKENS.mcmullin,
  colorKey: 'mcmullin',
  note: 'No Democrat on the ballot · the Democratic Party endorsed him',
};

export function houseStartRoll() {
  return { dem: 259, rep: HOUSE_TOTAL - 259 };
}

export function govStartRoll() {
  const dem = 22 + Math.round(Math.random() * 6);
  return { dem, rep: 50 - dem, other: 0 };
}
