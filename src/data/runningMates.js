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
      blurb: 'Six terms of Carolina politics and a record of winning with Trump voters still on the ballot.',
      strengths: ['Puts the Carolinas in play', 'No national baggage at all'],
      weakness: 'Unknown west of the Appalachians',
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
      blurb: 'CIA analyst turned swing-district survivor. The safest possible answer to the Blue Wall question.',
      strengths: ['Locks down the Midwest firewall', 'National security credibility'],
      weakness: 'Does not expand the map beyond it',
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
      blurb: 'A border-state senator with a gun-control record and the best favourables in the party.',
      strengths: ['Owns the Sun Belt and the border argument', 'Enormous independent appeal'],
      weakness: 'Washington press corps finds him boring',
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
      blurb: 'The only pick that puts the biggest Republican prize on the board — and the riskiest.',
      strengths: ['Makes Texas a real spend', 'Latino turnout everywhere'],
      weakness: 'Turns the race into a referendum on the ticket’s ideology',
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
      blurb: 'The conference chair who won a Clinton district three times before she stopped trying to.',
      strengths: ['Staunches the suburban bleed', 'Brings the House fundraising list'],
      weakness: 'Base never fully trusted her',
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
      blurb: 'A former attorney general with the Florida machine behind her and no Washington record to defend.',
      strengths: ['Locks the fastest-growing state', 'Law-and-order message that travels'],
      weakness: 'A national introduction has to start from zero',
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
      blurb: 'The least Trumpy governor in the party, chosen to prove the tent has more than one room.',
      strengths: ['Puts Colorado and Nevada on the board', 'Disarming in interviews'],
      weakness: 'Loses a point of base enthusiasm every week',
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
      blurb: 'A governor with the name, the podium, and the room. Locks the base and dares the suburbs.',
      strengths: ['Base turnout goes up everywhere', 'Rural margins widen'],
      weakness: 'Suburban women were the whole 2020 problem',
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
export function mateOptions(party, excludeId = null, scenarioId = 'standard') {
  return byParty(party, scenarioId)
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
        weakness: (c.weaknesses || [])[0] || 'A national introduction has to start from zero',
        nat: Math.round((weight / 24) * 1.8 * 10) / 10 - 0.9,
        region: { [home?.region || 'midwest']: 0.6 },
        states,
      };
    });
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