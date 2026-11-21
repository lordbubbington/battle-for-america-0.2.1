// The four-party scenario ("Third parties are a threat" in setup).
//
// When this mode is on, the Libertarian and Green presidential vote is a fixed
// table, not a roll of the dice: the same map every time the mode is played.
// Both parties are set state by state, so edit any number below and the map,
// the Senate, the House and the governorships all follow it.
//
// How the two tables were built (kept here so the numbers can be re-tuned):
//
//   Libertarians — 10 to 30 points almost everywhere, averaging 20, with two
//   outliers: Wyoming at 58 (a state the party actually carries) and California
//   knocked down to 15.
//     · Best in the West and the Northeast, worst in the Midwest, weak across
//       the South.
//     · They do better where the state leans Republican than where it leans
//       Democratic.
//     · Kentucky, West Virginia and Tennessee are the three southern states
//       where the party actually breaks 20 — the rest of the South does not.
//     · Heavy losses in states with a large Black population.
//
//   Greens — 5 to 35 points everywhere.
//     · Best in the Northeast and the West, worst in the South and the Midwest.
//     · They run strongest in Democratic states with large white populations.
//     · Under 10 points in every state that leans Republican by 10 or more,
//       and under 15 in every state that leans Republican by less, or has no
//       lean at all — whatever the region.

export const LIBERTARIAN_SHARE = {
  AL: 13.5, AK: 37.9, AZ: 27.57, AR: 14.5, CA: 14.66, CO: 33.3,
  CT: 14, DE: 12, DC: 3, FL: 19.5, GA: 8, HI: 15.9,
  ID: 41, IL: 10, IN: 21.7, IA: 7.2, KS: 36.1, KY: 35.5,
  LA: 9.06, ME: 35.1, MD: 8.2, MA: 18.62, MI: 9.8, MN: 9.8,
  MS: 6.6, MO: 12.4, MT: 35.25, NE: 31.1, NV: 30.1, NH: 45.9,
  NJ: 11.3, NM: 30.4, NY: 8.2, NC: 9.2, ND: 35.9, OH: 9.4,
  OK: 31.5, OR: 20.4, PA: 5.1, RI: 17.5, SC: 10, SD: 40,
  TN: 28.91, TX: 31.6, UT: 22.1, VT: 32.41, VA: 16.55, WA: 11.12,
  WV: 31.1, WI: 13.3, WY: 48.69,
};

export const GREEN_SHARE = {
  AL: 3, AK: 6.5, AZ: 8.1, AR: 1.7, CA: 31.3, CO: 21.8,
  CT: 31.3, DE: 13.4, DC: 33, FL: 5.6, GA: 3.2, HI: 31.9,
  ID: 2.5, IL: 14.2, IN: 3.1, IA: 5.9, KS: 12.9, KY: 3.3,
  LA: 3, ME: 11.3, MD: 14.9, MA: 37.7, MI: 5.6, MN: 7.6,
  MS: 5, MO: 6.2, MT: 11.5, NE: 16.16, NV: 8.6, NH: 21.3,
  NJ: 11.9, NM: 12.9, NY: 23.9, NC: 3.5, ND: 2.7, OH: 6.1,
  OK: 12.1, OR: 38.6, PA: 6.9, RI: 34, SC: 4.27, SD: 5.31,
  TN: 3.87, TX: 11.3, UT: 2.5, VT: 44, VA: 6.9, WA: 41,
  WV: 2.37, WI: 11.4, WY: 9.5,
};

// Sensible fallback for a state missing from the tables above.
export const FOUR_PARTY_DEFAULTS = { lib: 10, grn: 10 };

export function libertarianShare(abbr) {
  return LIBERTARIAN_SHARE[abbr] ?? FOUR_PARTY_DEFAULTS.lib;
}

export function greenShare(abbr) {
  return GREEN_SHARE[abbr] ?? FOUR_PARTY_DEFAULTS.grn;
}