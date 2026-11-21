// Election night's clock.
//
// Poll closing times are minutes after midnight, Eastern — roughly the real
// calendar: the Eastern states close first, the Mountain and Pacific states
// later, and Alaska after midnight in New York. Each state then takes its own
// time to count, from two hours in the smallest states to six in the largest.

import { STATE_BY_ABBR } from '@/data/states';

// 7:00 PM ET — the first polls close.
export const NIGHT_START = 19 * 60;

export const POLL_CLOSE = {
  // 7:00 PM ET
  GA: 1140, IN: 1140, KY: 1140, SC: 1140, VT: 1140, VA: 1140,
  // 7:30 PM ET
  NC: 1170, OH: 1170, WV: 1170,
  // 8:00 PM ET
  AL: 1200, CT: 1200, DC: 1200, DE: 1200, FL: 1200, IL: 1200, KS: 1200, ME: 1200,
  MD: 1200, MA: 1200, MI: 1200, MS: 1200, MO: 1200, NH: 1200, NJ: 1200, OK: 1200,
  PA: 1200, RI: 1200, TN: 1200, TX: 1200,
  // 8:30 PM ET
  AR: 1230,
  // 9:00 PM ET
  AZ: 1260, CO: 1260, IA: 1260, LA: 1260, MN: 1260, NE: 1260, NM: 1260, NY: 1260,
  ND: 1260, SD: 1260, WI: 1260, WY: 1260,
  // 10:00 PM ET
  MT: 1320, NV: 1320, UT: 1320,
  // 11:00 PM ET
  CA: 1380, ID: 1380, OR: 1380, WA: 1380,
  // after midnight
  HI: 1440, AK: 1500,
};

export function closeMinutes(abbr) {
  return POLL_CLOSE[abbr] ?? 1200;
}

// Two hours for the smallest state, six for the biggest.
export function countMinutes(abbr) {
  const ev = STATE_BY_ABBR[abbr]?.ev ?? 10;
  const hours = 2 + 4 * Math.min(1, Math.max(0, (ev - 3) / 51));
  return Math.round(hours * 60);
}

// "10:42 PM ET"
export function clockLabel(t) {
  const total = ((Math.round(NIGHT_START + t) % 1440) + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, '0')} ${h24 >= 12 ? 'PM' : 'AM'} ET`;
}