import { isBuild39VpEligible } from '@/lib/build39Candidates';
// Running mates. Each one opens a piece of the map: a home state, its
// neighbours, and a regional pull — paid for with a national penalty that comes
// from putting a less-known name a heartbeat from the presidency.
//
// `states` and `region` are written from the perspective of YOUR ticket, so a
// Republican running mate's +2 in Florida is +2 for the Republican campaign.
//
// The modern game builds the shortlist out of your own candidate file: anyone
// who did not win the nomination is a possible running mate, and their home
// state and neighbours come with them.

import { byParty, homeAbbr } from '@/data/candidates';
import { STATE_BY_ABBR } from '@/data/states';
import { NEIGHBORS } from '@/data/neighbors';

export const RUNNING_MATES = {
  dem: [
    {
      id: 'cooper',
      name: 'Roy Cooper',
      short: 'Cooper',
      state: 'North Carolina',
      stateAbbr: 'NC',
      title: 'The Southern Governor',
      blurb: 'A two-term governor and former attorney general who repeatedly won statewide in a Republican-leaning battleground alongside presidential turnout.',
      strengths: ['Puts North Carolina and nearby Southern states in play', 'Clean statewide record with minimal national baggage'],
      weakness: 'Limited name recognition west of the Appalachians',
      nat: -0.6,
      region: { south: 0.7 },
      states: { NC: 2.4, GA: 1.1, SC: 0.7 },
    },
    {
      id: 'slotkin',
      name: 'Elissa Slotkin',
      short: 'Slotkin',
      state: 'Michigan',
      stateAbbr: 'MI',
      title: 'The Blue Wall Shield',
      blurb: 'A former CIA analyst and swing-district representative who won statewide in Michigan, offering a steady national-security profile for the Upper Midwest.',
      strengths: ['Strengthens the Midwest battleground coalition', 'National security and defense credibility'],
      weakness: 'Adds little geographic reach outside the Great Lakes',
      nat: -0.2,
      region: { midwest: 0.6 },
      states: { MI: 2.2, WI: 1.2, PA: 0.8 },
    },
    {
      id: 'kelly',
      name: 'Mark Kelly',
      short: 'Kelly',
      state: 'Arizona',
      stateAbbr: 'AZ',
      title: 'The Astronaut',
      blurb: 'A former astronaut, Navy veteran, and border-state senator who consistently posts some of the strongest favorability numbers in the Democratic caucus.',
      strengths: ['Credibility on border security and Sun Belt outreach', 'Strong crossover appeal with independent voters'],
      weakness: 'Low-key media style rarely drives national headlines',
      nat: 0.4,
      region: { west: 0.6 },
      states: { AZ: 2.6, NV: 1.1, NM: 0.7 },
    },
    {
      id: 'castro',
      name: 'Julián Castro',
      short: 'Castro',
      state: 'Texas',
      stateAbbr: 'TX',
      title: 'The Texas Play',
      blurb: 'A former San Antonio mayor and Housing Secretary whose selection signals an aggressive play for Texas and Southwest turnout, though it carries higher national risk.',
      strengths: ['Forces Republicans to spend in Texas', 'Broadens outreach to Hispanic voters in the Southwest'],
      weakness: 'Invites heavier ideological attacks from Republicans nationally',
      nat: -1.1,
      region: { south: 0.5, west: 0.3 },
      states: { TX: 2.0, NV: 0.8, AZ: 0.6 },
    },
  ],
  rep: [
    {
      id: 'stefanik',
      name: 'Elise Stefanik',
      short: 'Stefanik',
      state: 'New York',
      stateAbbr: 'NY',
      title: 'The Suburb Shield',
      blurb: 'A former House Republican Conference chair who won a competitive upstate New York district before moving firmly into party leadership.',
      strengths: ['Brings an established House fundraising network', 'Familiar with Northeast suburban and swing-district messaging'],
      weakness: 'Mixed trust among segments of the populist base',
      nat: -0.3,
      region: { northeast: 0.6 },
      states: { NY: 1.2, PA: 1.1, NH: 0.8, ME: 0.7 },
    },
    {
      id: 'moody',
      name: 'Ashley Moody',
      short: 'Moody',
      state: 'Florida',
      stateAbbr: 'FL',
      title: 'The Sun Belt Anchor',
      blurb: 'A former Florida attorney general backed by a well-funded state party apparatus, entering national politics without a Washington voting record.',
      strengths: ['Reinforces Republican margins in Florida and the Southeast', 'Law-and-order background translates cleanly to swing states'],
      weakness: 'Low national name recognition outside Florida',
      nat: -0.1,
      region: { south: 0.6 },
      states: { FL: 2.2, GA: 1.1, NC: 0.8 },
    },
    {
      id: 'cox',
      name: 'Spencer Cox',
      short: 'Cox',
      state: 'Utah',
      stateAbbr: 'UT',
      title: 'The Mountain West Bet',
      blurb: 'A Mountain West governor known for a consensus-oriented governing style, selected to broaden the party\'s appeal among suburban and Western moderates.',
      strengths: ['Improves competitiveness in Nevada, Arizona, and Mountain West suburbs', 'Disciplined, disarming presence in national interviews'],
      weakness: 'Generates less enthusiasm among the party\'s populist base',
      nat: -0.9,
      region: { west: 0.6 },
      states: { UT: 2.0, NV: 1.0, AZ: 0.9, CO: 0.5 },
    },
    {
      id: 'huckabee',
      name: 'Sarah Huckabee Sanders',
      short: 'Sanders',
      state: 'Arkansas',
      stateAbbr: 'AR',
      title: 'The Base Pick',
      blurb: 'A governor and former White House press secretary with immediate national name recognition, strong conservative media ties, and solid backing among core Republican voters.',
      strengths: ['Lifts base turnout across rural and Southern counties', 'Experienced national spokesperson comfortable on television'],
      weakness: 'Polarizing profile among college-educated suburban voters',
      nat: 0.6,
      region: { south: 0.5, midwest: 0.3 },
      states: { AR: 2.2, MO: 1.0, TN: 0.8, LA: 0.7 },
    },
  ],
};

export const ALL_RUNNING_MATES = [...RUNNING_MATES.dem, ...RUNNING_MATES.rep];

export const MATE_BY_ID = ALL_RUNNING_MATES.reduce((acc, m) => {
  acc[m.id] = m;
  return acc;
}, {});

// The shortlist: your party's whole field, minus whoever is at the top of the
// ticket, each carrying the map they would bring.
const REGIONAL_VP_SOURCE = {
  'farmer-labor': ['dem'],
  'west-coast': ['dem'],
  appalachian: ['dem'],
  'lone-star': ['rep'],
  'southern-heritage': ['rep'],
  deseret: ['dem', 'rep'],
};

export function mateOptions(party, excludeId = null, scenarioId = 'standard') {
  const pool = scenarioId === 'regional-parties' && REGIONAL_VP_SOURCE[party]
    ? REGIONAL_VP_SOURCE[party].flatMap((src) => byParty(src, scenarioId))
    : byParty(party, scenarioId);
  return pool
    .filter((c) => c.id !== excludeId && isBuild39VpEligible(c.id))
    .map((c) => {
      const abbr = homeAbbr(c);
      const home = STATE_BY_ABBR[abbr];
      const states = { [abbr]: 2.4 };
      (NEIGHBORS[abbr] || []).slice(0, 3).forEach((n) => {
        states[n] = 0.9;
      });
      const weight = c.weight || 10;
      return {
        id: c.id,
        candidateId: c.id,
        name: c.name,
        short: c.short,
        state: c.state,
        stateAbbr: abbr,
        title: c.title,
        portrait: c.portrait,
        blurb: c.bio,
        color: c.color,
        strengths: c.strengths || [],
        weakness: (c.weaknesses || [])[0] || 'Limited national name recognition',
        nat: Math.round((weight / 24) * 1.8 * 10) / 10 - 0.9,
        region: { [home?.region || 'midwest']: 0.6 },
        states,
      };
    })
    .concat((RUNNING_MATES[party] || []).filter((m) => m.modId && m.id !== excludeId));
}

// The Twelfth Amendment gives each state's electors a single vote, so no ticket
// carries two names from the same state. This is the check the setup screen uses
// and the one `createGame` enforces.
export function sameStateTicket(mate, nominee) {
  if (!mate || !nominee) return false;
  return mate.stateAbbr === homeAbbr(nominee);
}

export function runningMatesFor(party) {
  const built = mateOptions(party);
  return built.length ? built : RUNNING_MATES[party] || RUNNING_MATES.dem;
}

export function runningMateFor(party, id, excludeId = null, scenarioId = 'standard') {
  const built = mateOptions(party, excludeId, scenarioId);
  const found = built.find((m) => m.id === id);
  if (found) return found;
  const legacy = (RUNNING_MATES[party] || []).find((m) => m.id === id && isBuild39VpEligible(m.id));
  return legacy || built[0] || null;
}