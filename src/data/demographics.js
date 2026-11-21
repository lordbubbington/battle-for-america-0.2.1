// Who lives where. These are shares of each state's population, nothing else.
// No lean, no stance, no baseline vote share is derived from them — they only
// decide how much a group-based effect is worth inside a given state.
//
// Ethnic shares are Census-shaped: white means non-Hispanic, and Hispanic is its
// own category rather than a subset of white. "Other" carries two-or-more-race,
// Pacific Islander and everybody else the five named groups miss.
//
// Religious shares follow the usual survey buckets: mainline and Black Protestant
// sit together under Other Protestant, and Other Christian holds Orthodox,
// Jehovah's Witness and the smaller Christian bodies. Mormon is its own bucket.
// Irreligious is the remainder of the state, so every column sums to 100.
//
// Ideology is the one modelled table: it leans on the state's baseline and is
// computed rather than surveyed.

import { BASE_LEANS } from '@/data/states';
import { modeledStateShares } from '@/lib/syntheticElectorate';

export const ETHNIC_GROUPS = [
  { id: 'white', label: 'White voters', short: 'White', color: '#DCD6C8' },
  { id: 'black', label: 'Black voters', short: 'Black', color: '#B07A4E' },
  { id: 'asian', label: 'Asian voters', short: 'Asian', color: '#4FBFA8' },
  { id: 'hispanic', label: 'Hispanic voters', short: 'Hispanic', color: '#F0A45C' },
  { id: 'native', label: 'Native American voters', short: 'Native', color: '#C97B84' },
  { id: 'other', label: 'Other voters', short: 'Other', color: '#8FA3C8' },
];

// Order matters: it is the order of every row in RELIGION_PCT below.
export const RELIGION_GROUPS = [
  { id: 'catholic', label: 'Catholic voters', short: 'Catholic', color: '#C9A227' },
  { id: 'evangelical', label: 'Evangelical voters', short: 'Evangelical', color: '#C25E5E' },
  { id: 'protestant', label: 'Other Protestant voters', short: 'Protestant', color: '#5B8DEF' },
  { id: 'christian', label: 'Other Christian voters', short: 'Other Christian', color: '#8E7CC3' },
  { id: 'irreligious', label: 'Irreligious voters', short: 'Irreligious', color: '#9AA7B8' },
  { id: 'mormon', label: 'Mormon voters', short: 'Mormon', color: '#3FA36B' },
  { id: 'muslim', label: 'Muslim voters', short: 'Muslim', color: '#2F9E8F' },
  { id: 'jewish', label: 'Jewish voters', short: 'Jewish', color: '#4C7BFF' },
  { id: 'otherReligion', label: 'Other religious voters', short: 'Other religion', color: '#D08BC8' },
];

export const IDEOLOGY_GROUPS = [
  { id: 'far left', label: 'Progressive voters', short: 'Progressive', color: '#1dfa96ff' },
  { id: 'populistleft', label: 'Bernie Bros', short: 'Progressive2', color: '#9427aaff' },
  { id: 'religiousleft', label: 'The Religious Left', short: 'Religious Left', color: '#032f88ff' },
  { id: 'liberal', label: 'Traditional Dems', short: 'Liberal', color: '#5274b8ff' },
  { id: 'moderate', label: 'Moderate voters', short: 'Moderate', color: '#A0AEC0' },
  { id: 'religiousright', label: 'Evangelicals', short: 'Religious Right', color: '#5e0404ff' },
  { id: 'conservative', label: 'Traditional Republicans', short: 'Conservative', color: '#da3621ff' },
  { id: 'populistright', label: 'Maga voters', short: 'MAGA', color: '#bb590aff' },
  { id: 'libertarian', label: 'Libertarians', short: 'Libertarian', color: '#c8db18ff' },
];

export const GROUP_BY_ID = [...ETHNIC_GROUPS, ...RELIGION_GROUPS, ...IDEOLOGY_GROUPS].reduce((acc, g) => {
  acc[g.id] = g;
  return acc;
}, {});

// Order: white, black, asian, hispanic, native, other.
const ETHNIC_PCT = {
  AL: [65.5, 26.0, 1.5, 5.3, 0.5, 1.2],
  AK: [58.0, 3.0, 6.5, 7.2, 15.0, 10.3],
  AZ: [53.0, 4.5, 3.5, 32.0, 4.0, 3.0],
  AR: [70.0, 15.0, 1.7, 8.5, 0.7, 4.1],
  CA: [35.0, 5.5, 15.5, 40.0, 1.0, 3.0],
  CO: [66.0, 4.0, 3.5, 22.0, 1.0, 3.5],
  CT: [63.0, 10.0, 5.0, 17.5, 0.4, 4.1],
  DE: [60.0, 22.0, 4.0, 10.5, 0.5, 3.0],
  DC: [37.0, 41.0, 4.5, 11.5, 0.4, 5.6],
  FL: [51.0, 15.0, 3.0, 27.0, 0.4, 3.6],
  GA: [50.0, 31.0, 4.5, 10.5, 0.4, 3.6],
  HI: [21.0, 1.5, 36.0, 11.0, 0.3, 30.2],
  ID: [79.0, 0.8, 1.5, 13.0, 1.5, 4.2],
  IL: [58.5, 14.0, 6.0, 18.0, 0.4, 3.1],
  IN: [76.0, 9.5, 2.5, 8.0, 0.3, 3.7],
  IA: [84.0, 4.0, 2.5, 6.5, 0.4, 2.6],
  KS: [74.0, 5.5, 3.0, 13.0, 1.0, 3.5],
  KY: [83.0, 8.0, 1.6, 4.0, 0.3, 3.1],
  LA: [57.0, 32.0, 1.8, 6.0, 0.7, 2.5],
  ME: [90.0, 1.5, 1.2, 2.0, 0.7, 4.6],
  MD: [47.0, 30.0, 6.5, 11.0, 0.4, 5.1],
  MA: [67.0, 7.0, 7.5, 13.0, 0.3, 5.2],
  MI: [73.0, 13.5, 3.5, 5.5, 0.6, 3.9],
  MN: [77.0, 7.0, 5.0, 6.0, 1.1, 3.9],
  MS: [55.0, 37.0, 1.1, 3.5, 0.6, 2.8],
  MO: [77.0, 11.5, 2.2, 5.0, 0.5, 3.8],
  MT: [84.0, 0.6, 1.0, 4.5, 6.0, 3.9],
  NE: [76.0, 4.8, 2.5, 12.0, 1.0, 3.7],
  NV: [46.0, 9.0, 9.0, 30.0, 1.0, 5.0],
  NH: [88.0, 1.5, 3.0, 4.5, 0.3, 2.7],
  NJ: [51.0, 13.0, 10.0, 22.0, 0.3, 3.7],
  NM: [36.0, 2.0, 1.7, 49.0, 9.0, 2.3],
  NY: [52.0, 14.0, 9.0, 19.5, 0.4, 5.1],
  NC: [60.5, 21.0, 3.5, 10.5, 1.0, 3.5],
  ND: [82.0, 2.5, 1.5, 4.5, 5.0, 4.5],
  OH: [76.0, 12.0, 2.5, 4.5, 0.3, 4.7],
  OK: [63.0, 7.0, 2.5, 11.5, 7.0, 9.0],
  OR: [71.0, 2.0, 5.0, 14.0, 1.0, 7.0],
  PA: [74.0, 11.0, 4.0, 8.5, 0.3, 2.2],
  RI: [68.0, 6.0, 3.5, 17.0, 0.4, 5.1],
  SC: [62.0, 26.0, 1.8, 6.5, 0.4, 3.3],
  SD: [80.0, 2.0, 1.5, 4.5, 9.0, 3.0],
  TN: [73.0, 16.0, 2.0, 6.0, 0.3, 2.7],
  TX: [39.0, 12.0, 5.5, 40.0, 0.5, 3.0],
  UT: [75.0, 1.2, 2.5, 15.0, 1.0, 5.3],
  VT: [89.0, 1.0, 1.6, 2.5, 0.3, 5.6],
  VA: [59.0, 19.0, 7.0, 10.5, 0.4, 4.1],
  WA: [63.0, 4.0, 9.5, 14.0, 1.5, 8.0],
  WV: [90.0, 3.5, 0.8, 1.8, 0.2, 3.7],
  WI: [79.0, 6.0, 3.0, 7.5, 0.9, 3.6],
  WY: [82.0, 1.0, 1.0, 10.0, 2.5, 3.5],
};

// Order: catholic, evangelical, protestant, christian, mormon, muslim, jewish,
// otherReligion. Irreligious is whatever is left over.
const RELIGION_PCT = {
  AL: [7, 49, 26, 4, 0.5, 0.5, 0.3, 0.7],
  AK: [11, 27, 20, 4, 3, 0.5, 0.5, 3],
  AZ: [20, 24, 17, 3, 5, 0.8, 1.2, 2],
  AR: [7, 47, 25, 4, 1, 0.5, 0.2, 0.6],
  CA: [27, 17, 16, 3, 1, 1.2, 3, 4],
  CO: [16, 25, 20, 3, 2.5, 0.8, 1.2, 2],
  CT: [33, 13, 20, 3, 0.6, 1, 3, 2],
  DE: [22, 17, 22, 5, 0.3, 1, 2, 1.2],
  DC: [13, 13, 28, 4, 0.5, 2.5, 4.5, 4],
  FL: [21, 25, 22, 3, 0.8, 1, 3, 2.5],
  GA: [9, 38, 26, 4, 0.8, 1, 1.5, 2],
  HI: [20, 25, 12, 3, 3, 0.2, 0.5, 8],
  ID: [10, 27, 15, 4, 19, 0.5, 0.2, 1],
  IL: [28, 20, 20, 3, 0.5, 1.5, 2, 2],
  IN: [18, 33, 20, 4, 1, 0.7, 0.5, 1],
  IA: [18, 28, 22, 4, 0.6, 0.5, 0.3, 0.8],
  KS: [18, 31, 19, 4, 1, 0.7, 0.4, 1.2],
  KY: [10, 45, 22, 4, 1, 0.7, 0.4, 0.8],
  LA: [26, 30, 20, 3, 0.5, 0.6, 0.5, 1],
  ME: [21, 16, 22, 3, 1, 0.3, 0.6, 1.5],
  MD: [20, 18, 24, 3, 0.5, 1.5, 3, 2.5],
  MA: [30, 11, 16, 4, 0.4, 1, 4, 2.5],
  MI: [18, 25, 22, 4, 0.6, 1, 1.5, 1.5],
  MN: [22, 24, 21, 4, 0.6, 0.8, 1, 1.2],
  MS: [4, 55, 27, 3, 0.5, 0.4, 0.2, 0.5],
  MO: [19, 32, 22, 4, 0.7, 0.6, 0.6, 1],
  MT: [17, 28, 20, 4, 3, 0.3, 0.4, 1.5],
  NE: [23, 30, 20, 4, 1, 0.5, 0.4, 1],
  NV: [25, 22, 16, 3, 4, 1, 1.5, 2.5],
  NH: [26, 15, 20, 3, 0.5, 0.5, 0.8, 1.5],
  NJ: [32, 13, 19, 4, 0.3, 1.5, 5.5, 3],
  NM: [34, 22, 16, 3, 2, 0.5, 0.5, 1.5],
  NY: [30, 11, 20, 4, 0.4, 1.5, 7, 4],
  NC: [9, 39, 24, 4, 0.6, 0.7, 1, 1.5],
  ND: [26, 30, 17, 4, 0.5, 0.3, 0.2, 1],
  OH: [18, 29, 22, 4, 0.7, 0.8, 1, 1.2],
  OK: [8, 47, 18, 4, 1, 0.6, 0.3, 1],
  OR: [12, 25, 18, 3, 3, 0.7, 1, 2.5],
  PA: [24, 24, 22, 4, 0.5, 1, 2.5, 2],
  RI: [42, 13, 16, 3, 0.4, 0.8, 2, 1.5],
  SC: [10, 46, 24, 3, 0.6, 0.6, 0.6, 1],
  SD: [22, 34, 17, 4, 0.8, 0.3, 0.2, 1],
  TN: [6, 52, 20, 4, 0.7, 0.7, 0.5, 1],
  TX: [23, 33, 17, 3, 1, 1, 1, 2],
  UT: [5, 15, 12, 3, 48, 0.5, 0.3, 3],
  VT: [22, 12, 18, 3, 0.4, 0.4, 1, 2],
  VA: [12, 30, 24, 4, 0.7, 1, 2, 3],
  WA: [17, 25, 18, 3, 3, 0.8, 1, 4],
  WV: [6, 44, 26, 4, 0.5, 0.3, 0.2, 0.5],
  WI: [25, 22, 21, 4, 0.5, 0.7, 1, 1.5],
  WY: [14, 27, 20, 4, 9, 0.3, 0.3, 1],
};

const RELIGION_ORDER = ['catholic', 'evangelical', 'protestant', 'christian', 'mormon', 'muslim', 'jewish', 'otherReligion'];

// Ideology is modelled off the state's own baseline: an even state is the most
// moderate, and every point of lean trades moderates for one wing or the other.
function ideologyPct(abbr) {
  const lean = BASE_LEANS[abbr] ?? 0;
  const d = 0.5 + 0.5 * Math.tanh(lean / 25);
  const moderate = 24 + 16 * (1 - Math.abs(2 * d - 1));
  const left = (100 - moderate) * d;
  const right = 100 - moderate - left;
  return {
    progressive: left * 0.45,
    liberal: left * 0.55,
    moderate,
    conservative: right * 0.72,
    populist: right * 0.28,
  };
}

function normalise(groups, values) {
  const total = values.reduce((sum, v) => sum + v, 0) || 1;
  return groups.map((g, i) => ({
    ...g,
    share: Math.round(((values[i] || 0) / total) * 1000) / 10,
  }));
}

function buildState(abbr) {
  const sample = modeledStateShares(abbr) || {};
  const ethnic = normalise(ETHNIC_GROUPS, ETHNIC_PCT[abbr] || ETHNIC_PCT.US || [60, 12, 6, 19, 1, 2])
    .map((group) => sample[group.id] == null ? group : { ...group, share: sample[group.id] });
  const raw = RELIGION_PCT[abbr] || [20, 25, 20, 4, 1, 0.7, 1.5, 2];
  const rest = 100 - raw.reduce((sum, v) => sum + v, 0);
  const religion = normalise(RELIGION_GROUPS, [...raw.slice(0, 4), rest, ...raw.slice(4)])
    .map((group) => sample[group.id] == null ? group : { ...group, share: sample[group.id] });
  const ideologyMap = ideologyPct(abbr);
  const ideology = normalise(
    IDEOLOGY_GROUPS,
    IDEOLOGY_GROUPS.map((g) => ideologyMap[g.id])
  ).map((group) => sample[group.id] == null ? group : { ...group, share: sample[group.id] });
  const share = {};
  [ethnic, religion, ideology].forEach((list) => list.forEach((g) => (share[g.id] = g.share)));
  Object.assign(share, sample);
  return { ethnic, religion, ideology, share };
}

export const STATE_DEMOGRAPHICS = Object.keys(ETHNIC_PCT).reduce((acc, abbr) => {
  acc[abbr] = buildState(abbr);
  return acc;
}, {});

// What a group-based effect is actually worth in one state: the effect is
// scaled by that group's share of the population, so +10 among a group that is
// 2% of a state is worth two tenths of a point there.
export function stateGroupShift(abbr, mods) {
  const demo = STATE_DEMOGRAPHICS[abbr];
  if (!demo || !mods) return 0;
  let shift = 0;
  Object.entries(mods).forEach(([id, amount]) => {
    if (!amount) return;
    const share = demo.share[id] || 0;
    if (share) shift += (share / 100) * amount;
  });
  return shift;
}

// The national value of the same effect, for the panel readouts.
export function nationalGroupShift(mods, abbrs) {
  if (!mods || !abbrs || !abbrs.length) return 0;
  const total = abbrs.reduce((sum, abbr) => sum + stateGroupShift(abbr, mods), 0);
  return total / abbrs.length;
}
