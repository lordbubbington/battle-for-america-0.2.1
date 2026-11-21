// 2028 election map. `lean` is the Democratic-minus-Republican margin in the
// 2024 presidential result (positive = Democratic). Electoral votes use the 2020
// census apportionment, which is what 2028 uses.
//
// The campaign does not start in 2024, though: it starts in a national
// environment running roughly D+4.6. `BASE_LEANS` is the 2024 result shifted by
// that environment, which is the map a player sees on turn one.

export const NATIONAL_ENV = 0;

export const REGIONS = {
  northeast: 'Northeast',
  south: 'South',
  midwest: 'Midwest',
  west: 'West',
};

export const STATE_LIST = [
  { abbr: 'AL', name: 'Alabama', ev: 9, lean: -26.35, region: 'south', col: 6, row: 6 },
  { abbr: 'AK', name: 'Alaska', ev: 3, lean: -12, region: 'west', col: 0, row: 8 },
  { abbr: 'AZ', name: 'Arizona', ev: 11, lean: -3.52, region: 'west', col: 1, row: 5 },
  { abbr: 'AR', name: 'Arkansas', ev: 6, lean: -29.23, region: 'south', col: 4, row: 5 },
  { abbr: 'CA', name: 'California', ev: 54, lean: 19, region: 'west', col: 0, row: 4 },
  { abbr: 'CO', name: 'Colorado', ev: 10, lean: 11.58, region: 'west', col: 2, row: 4 },
  { abbr: 'CT', name: 'Connecticut', ev: 7, lean: 15.33, region: 'northeast', col: 10, row: 3 },
  { abbr: 'DE', name: 'Delaware', ev: 3, lean: 15.09, region: 'northeast', col: 9, row: 4 },
  { abbr: 'DC', name: 'District of Columbia', ev: 3, lean: 88, region: 'northeast', col: 8, row: 5 },
  { abbr: 'FL', name: 'Florida', ev: 30, lean: -12.48, region: 'south', col: 8, row: 6 },
  { abbr: 'GA', name: 'Georgia', ev: 16, lean: 0, region: 'south', col: 7, row: 6 },
  { abbr: 'HI', name: 'Hawaii', ev: 4, lean: 28.67, region: 'west', col: 1, row: 7 },
  { abbr: 'ID', name: 'Idaho', ev: 4, lean: -36.5, region: 'west', col: 1, row: 2 },
  { abbr: 'IL', name: 'Illinois', ev: 19, lean: 11.53, region: 'midwest', col: 5, row: 3 },
  { abbr: 'IN', name: 'Indiana', ev: 11, lean: -15.13, region: 'midwest', col: 6, row: 3 },
  { abbr: 'IA', name: 'Iowa', ev: 6, lean: -10.92, region: 'midwest', col: 4, row: 3 },
  { abbr: 'KS', name: 'Kansas', ev: 6, lean: -9, region: 'midwest', col: 3, row: 5 },
  { abbr: 'KY', name: 'Kentucky', ev: 8, lean: -27.03, region: 'south', col: 5, row: 4 },
  { abbr: 'LA', name: 'Louisiana', ev: 8, lean: -20.45, region: 'south', col: 4, row: 6 },
  { abbr: 'ME', name: 'Maine', ev: 4, lean: 4.59, region: 'northeast', col: 11, row: 0 },
  { abbr: 'MD', name: 'Maryland', ev: 10, lean: 27.99, region: 'northeast', col: 8, row: 4 },
  { abbr: 'MA', name: 'Massachusetts', ev: 11, lean: 25.0, region: 'northeast', col: 10, row: 2 },
  { abbr: 'MI', name: 'Michigan', ev: 15, lean: -0.5, region: 'midwest', col: 7, row: 2 },
  { abbr: 'MN', name: 'Minnesota', ev: 10, lean: 1.25, region: 'midwest', col: 4, row: 2 },
  { abbr: 'MS', name: 'Mississippi', ev: 6, lean: -16.43, region: 'south', col: 5, row: 6 },
  { abbr: 'MO', name: 'Missouri', ev: 10, lean: -16.67, region: 'midwest', col: 4, row: 4 },
  { abbr: 'MT', name: 'Montana', ev: 4, lean: -18.72, region: 'west', col: 2, row: 2 },
  { abbr: 'NE', name: 'Nebraska', ev: 5, lean: -20.95, region: 'midwest', col: 3, row: 4 },
  { abbr: 'NV', name: 'Nevada', ev: 6, lean: -1, region: 'west', col: 1, row: 3 },
  { abbr: 'NH', name: 'New Hampshire', ev: 4, lean: 3.2, region: 'northeast', col: 11, row: 1 },
  { abbr: 'NJ', name: 'New Jersey', ev: 14, lean: 10.45, region: 'northeast', col: 9, row: 3 },
  { abbr: 'NM', name: 'New Mexico', ev: 5, lean: 10.1, region: 'west', col: 2, row: 5 },
  { abbr: 'NY', name: 'New York', ev: 28, lean: 15.33, region: 'northeast', col: 9, row: 2 },
  { abbr: 'NC', name: 'North Carolina', ev: 16, lean: 1.15, region: 'south', col: 6, row: 5 },
  { abbr: 'ND', name: 'North Dakota', ev: 3, lean: -35.23, region: 'midwest', col: 3, row: 2 },
  { abbr: 'OH', name: 'Ohio', ev: 17, lean: -9.55, region: 'midwest', col: 7, row: 3 },
  { abbr: 'OK', name: 'Oklahoma', ev: 7, lean: -32.28, region: 'south', col: 3, row: 6 },
  { abbr: 'OR', name: 'Oregon', ev: 8, lean: 10.53, region: 'west', col: 0, row: 3 },
  { abbr: 'PA', name: 'Pennsylvania', ev: 19, lean: -1.33, region: 'northeast', col: 8, row: 3 },
  { abbr: 'RI', name: 'Rhode Island', ev: 4, lean: 18.8, region: 'northeast', col: 11, row: 2 },
  { abbr: 'SC', name: 'South Carolina', ev: 9, lean: -14.15, region: 'south', col: 7, row: 5 },
  { abbr: 'SD', name: 'South Dakota', ev: 3, lean: -33.75, region: 'midwest', col: 3, row: 3 },
  { abbr: 'TN', name: 'Tennessee', ev: 11, lean: -26.05, region: 'south', col: 5, row: 5 },
  { abbr: 'TX', name: 'Texas', ev: 40, lean: -8, region: 'west', col: 3, row: 7 },
  { abbr: 'UT', name: 'Utah', ev: 6, lean: -19, region: 'west', col: 1, row: 4 },
  { abbr: 'VT', name: 'Vermont', ev: 3, lean: 29.77, region: 'northeast', col: 10, row: 1 },
  { abbr: 'VA', name: 'Virginia', ev: 13, lean: 6.6, region: 'south', col: 7, row: 4 },
  { abbr: 'WA', name: 'Washington', ev: 12, lean: 20, region: 'west', col: 0, row: 2 },
  { abbr: 'WV', name: 'West Virginia', ev: 4, lean: -40.0, region: 'south', col: 6, row: 4 },
  { abbr: 'WI', name: 'Wisconsin', ev: 10, lean: -1, region: 'midwest', col: 5, row: 2 },
  { abbr: 'WY', name: 'Wyoming', ev: 3, lean: -45.0, region: 'west', col: 2, row: 3 },
];

export const STATES = STATE_LIST;

export const STATE_BY_ABBR = STATE_LIST.reduce((acc, s) => {
  acc[s.abbr] = s;
  return acc;
}, {});

export const BASE_LEANS = STATE_LIST.reduce((acc, s) => {
  acc[s.abbr] = Math.round((s.lean + NATIONAL_ENV) * 10) / 10;
  return acc;
}, {});

export const EV_TOTAL = STATE_LIST.reduce((sum, s) => sum + s.ev, 0); // 538
export const EV_TO_WIN = 270;

// Nebraska (5 EV) and Maine (4 EV) do not use winner-take-all: two votes go to
// the statewide winner and the rest are decided one congressional district at a
// time. Each district below is worth one electoral vote.
export const SPLIT_AT_LARGE = { NE: 2, ME: 2 };

export const DISTRICT_LIST = [
  { id: 'NE-1', short: 'NE-1', parent: 'NE', name: 'Nebraska 1st District', ev: 1, lean: -16.0 },
  { id: 'NE-2', short: 'NE-2', parent: 'NE', name: 'Nebraska 2nd District', ev: 1, lean: 2.0 },
  { id: 'NE-3', short: 'NE-3', parent: 'NE', name: 'Nebraska 3rd District', ev: 1, lean: -38.0 },
  { id: 'ME-1', short: 'ME-1', parent: 'ME', name: 'Maine 1st District', ev: 1, lean: 15.0 },
  { id: 'ME-2', short: 'ME-2', parent: 'ME', name: 'Maine 2nd District', ev: 1, lean: 1.5 },
];

export const DISTRICT_BY_ID = DISTRICT_LIST.reduce((acc, d) => {
  acc[d.id] = d;
  return acc;
}, {});

// A few starting-map presets for the weighting panel.
//
// `reportSpeed` drives election night: 1 = called within minutes (pre-processed
// mail, fast county reporting), 2 = a few hours, 3 = late night or later (no
// mail preprocessing, ranked-choice tabulation, late-arriving ballots).
const REPORT_SPEED = {
  FL: 1, TX: 1, OH: 1, NC: 1, GA: 1, IN: 1, KY: 1, SC: 1, VT: 1, AL: 1, MS: 1,
  OK: 1, AR: 1, TN: 1, WV: 1, MO: 1, KS: 1, SD: 1, ND: 1, ID: 1, UT: 1, WY: 1,
  MT: 1, LA: 1, NE: 1, IA: 1, NH: 1, RI: 1,
  PA: 3, WI: 3, MI: 3, AZ: 3, NV: 3, CA: 3, WA: 3, OR: 3, AK: 3, ME: 3, NY: 3,
  NJ: 3, HI: 3, MD: 3, CT: 3, DE: 3, DC: 3,
  IL: 2, CO: 2, VA: 2, MN: 2, NM: 2, MA: 2,
};

export function reportSpeed(abbr) {
  return REPORT_SPEED[abbr] ?? 2;
}

// Ad markets: bigger states cost more, and the four mega-states cost a lot more
// than their electoral votes alone would suggest.
export function mediaCost(abbr) {
  const ev = STATE_BY_ABBR[abbr]?.ev ?? 10;
  const premium = Math.max(0, ev - 25) * 0.14;
  return Math.round((1.8 + ev * 0.1 + premium) * 10) / 10;
}

// Share of the state living outside an urban area. Radio is the medium of empty
// counties, so this is what a drive-time buy is worth: a rounding error in New
// Jersey, the whole ballgame in Montana.
const RURAL_PCT = {
  AL: 41, AK: 34, AZ: 10, AR: 44, CA: 5, CO: 14, CT: 12, DE: 17, DC: 0, FL: 9,
  GA: 25, HI: 9, ID: 30, IL: 12, IN: 26, IA: 36, KS: 30, KY: 41, LA: 27, ME: 60,
  MD: 12, MA: 8, MI: 23, MN: 28, MS: 50, MO: 31, MT: 43, NE: 27, NV: 5, NH: 39,
  NJ: 6, NM: 23, NY: 12, NC: 33, ND: 40, OH: 22, OK: 34, OR: 19, PA: 21, RI: 7,
  SC: 34, SD: 43, TN: 32, TX: 15, UT: 8, VT: 64, VA: 24, WA: 15, WV: 51, WI: 30,
  WY: 35,
};

export function ruralShare(abbr) {
  return RURAL_PCT[abbr] ?? 20;
}

// A permanent field operation costs weekly, scaled to the size of the state.
export function groundCost(abbr) {
  const ev = STATE_BY_ABBR[abbr]?.ev ?? 10;
  return Math.round((0.9 + ev * 0.075) * 10) / 10;
}

// ---------------------------------------------------------------------------
// The national environment.
//
// The starting map is the 2024 result plus a national environment: the generic
// ballot. `LEAD_2024` is the electoral-vote-weighted national margin of the raw
// 2024 map, so a target of D+7 shifts every state by the same number of points
// and the weighted average lands exactly on D+7.
// ---------------------------------------------------------------------------

function weightedLead(pick) {
  let sum = 0;
  STATE_LIST.forEach((s) => {
    sum += pick(s) * s.ev;
  });
  return sum / EV_TOTAL;
}

export const LEAD_2024 = weightedLead((s) => s.lean);

export function nationalLead(leans) {
  return weightedLead((s) => leans[s.abbr] ?? 0);
}

export function leansForNational(target) {
  const shift = (Number.isFinite(target) ? target : 0) - LEAD_2024;
  return STATE_LIST.reduce((acc, s) => {
    acc[s.abbr] = s.lean + shift;
    return acc;
  }, {});
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Randomness: how much of the historical map survives the shuffle.
//
// At 0% every state is its 2024 result plus the generic ballot. Below that the
// state's own lean is blended with a fresh draw, so the map stays the country and
// still reads wrong. At 100% the lean is gone entirely: every state draws its own
// margin from a bell around the national mood, so California and Wyoming flip as
// often as anywhere else and the map is a pure roll of the dice.
//
// The draw is a bell rather than a coin: three uniform picks averaged, so most
// states land within a dozen points of the national mood and a handful fly out to
// forty. The whole field is then re-centred on its electoral-vote-weighted average,
// so no votes are created or destroyed and the generic ballot never budges.
const FULL_SPREAD = 39; // a full draw runs ±39, sd about 13
const MARGIN_FLOOR = -80;
const MARGIN_CEILING = 90; // DC is the one place that can go higher than anything a draw produces

export function addRandomness(leans, amount, seed = 1) {
  const pct = Math.max(0, Math.min(100, Number(amount) || 0));
  if (!pct) return { ...leans };

  // 20% already throws away a third of the lean; 100% throws away all of it.
  const weight = Math.pow(pct / 100, 0.65);
  const rand = mulberry32(seed + 1013);
  const bell = () => ((rand() + rand() + rand()) / 3) * 2 - 1;

  const rolls = STATE_LIST.map((s) => ({ abbr: s.abbr, ev: s.ev, draw: bell() * FULL_SPREAD }));
  const leanMean = STATE_LIST.reduce((sum, s) => sum + (leans[s.abbr] ?? 0) * s.ev, 0) / EV_TOTAL;

  const out = {};
  let mean = 0;
  rolls.forEach((r) => {
    const lean = leans[r.abbr] ?? 0;
    out[r.abbr] = (1 - weight) * lean + weight * r.draw;
    mean += out[r.abbr] * r.ev;
  });
  mean /= EV_TOTAL;

  // Put the national mood back where the player set it, and keep every margin in
  // the range a state can actually produce.
  const shift = leanMean - mean;
  rolls.forEach((r) => {
    out[r.abbr] = Math.max(MARGIN_FLOOR, Math.min(MARGIN_CEILING, out[r.abbr] + shift));
  });
  return out;
}