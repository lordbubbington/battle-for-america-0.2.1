// 2024 resident population estimates, Census Vintage 2024, July 1, states + DC.
// Rounded to persons as published; PR excluded because it is not in the game map.
export const POPULATION_BY_STATE = Object.freeze({
  AL: 5162894, AK: 740133, AZ: 7582384, AR: 3088354, CA: 39431263, CO: 5957493,
  CT: 3675069, DE: 1051917, DC: 702250, FL: 23372215, GA: 11180878, HI: 1446146,
  ID: 2001619, IL: 12549689, IN: 6940057, IA: 3241488, KS: 2970606, KY: 4588372,
  LA: 4597740, ME: 1405012, MD: 6263220, MA: 7020058, MI: 10140459, MN: 5793151,
  MS: 2943045, MO: 6215144, MT: 1132812, NE: 2005465, NV: 3267467, NH: 1409032,
  NJ: 9500851, NM: 2130256, NY: 19867248, NC: 11046024, ND: 796568, OH: 11813594,
  OK: 4095393, OR: 4272371, PA: 13078751, RI: 1112308, SC: 5478831, SD: 924669,
  TN: 7227750, TX: 31290831, UT: 3503613, VT: 648493, VA: 8811195, WA: 7960064,
  WV: 1769979, WI: 5960975, WY: 587618,
});
export const POPULATION_SOURCE = Object.freeze({
  publisher: 'U.S. Census Bureau, Population Estimates Program',
  vintage: 2024,
  estimateDate: '2024-07-01',
  table: 'NST-EST2024-POP',
  url: 'https://www2.census.gov/programs-surveys/popest/tables/2020-2024/state/totals/NST-EST2024-POP.xlsx',
  note: 'Resident population, not voting-age, eligible, registered, or modeled electorate. Used only to weight national ideology targets.',
});
