import { BUILD40_SIX_TICKET_CANDIDATES } from './build40Elections.js';
import { REGIONAL_EXISTING_NOMINEES, SCENARIO_PARTIES } from './build39Scenarios.js';
import { BUILD39_CANDIDATES } from './build39Candidates.js';
import { BUILD45_HISTORICAL_CANDIDATES } from './build45HistoricalCandidates.js';
import { SCENARIO_CANDIDATES } from './build39Scenarios.js';
import { scenarioCandidateOptions } from '../lib/build39Scenarios.js';
import { THIRD_CANDIDATES } from '@/data/thirdParties';
import { STATE_LIST } from '@/data/states';
import { CANDIDATE_RATINGS } from '@/data/candidateRatings';

// Regional modifiers are candidate strengths (percentage points) added to the
// Democratic-minus-Republican margin in each region. `nat` is a flat national
// modifier, `weight` reflects how the candidate is polling in early 2028
// national surveys (NYT/Siena Oct 2026, 270toWin averages, Polymarket odds).

export const DEMOCRATS = [
  {
    id: 'fdr',
    name: 'Franklin D. Roosevelt',
    short: 'FDR',
    state: 'New York',
    title: 'Reanimated New Dealer',
    party: 'dem',
    weight: 2.5,
    color: '#3D5AF1',
    portrait: '/art/candidates/expressions/fdr-smile.png',
    bio: 'A reanimated Franklin Roosevelt, campaigning on a modern translation of the New Deal. Where no modern equivalent existed, his platform is a careful interpretation of his governing record.',
    strengths: ['New Deal coalition draws broad support across the Northeast, Midwest, and South', 'Economic populism resonates with working-class voters'],
    weaknesses: ['His 1930s governing style can feel too centralized today', 'The coalition depends on voters accepting a modernized historical platform'],
    nat: 4.5,
    region: { northeast: 7.5, midwest: 7, south: 5.5, west: 2 },
    states: { NY: 3.5 },
    issueStances: { affordability: 0, economy: 0, health: 0, iran: 1, corruption: 0, prices: 0, immigration: 1, inequality: 0, abortion: 1, rent: 0, tariffs: 1, gerrymandering: 0, israel: 1, crime: 1, datacenters: 0, energy: 0, ai: 0, trans: 1, birthrate: 0 },
  },
    {
    //Strength: High - +3-4 points nationally
    // Divisiveness: High
    
    id: 'ossoff',
    name: 'Jon Ossoff',
    short: 'Ossoff',
    state: 'Georgia',
    title: 'Sun Belt Organizer',
    party: 'dem',
    weight: 13,
    color: '#3D5AF1',
    portrait: '/art/candidates/expressions/ossoff-neutral.png',
    bio: 'He won twice in a state that does not hand Democrats anything for free. Runs on discipline, subpoenas, and a very good ground game.',
    strengths: ['Punches above weight in the South', 'No obvious attack surface'],
    weaknesses: ['Low national name ID', 'Not the loudest voice in the room'],
    nat: 2.02,
    region: { south: 7.5, northeast: 0.5, midwest: 0, west: 0 },
    groups: { jewish:20, black:15},
    turnoutRegion: { south: 1 }
  },

    {
    //Strength: Medium - +0-1 points nationally
    // Divisiveness: High      
    id: 'newsom',
    name: 'Gavin Newsom',
    short: 'Newsom',
    state: 'California',
    title: 'Coastal Fighter',
    party: 'dem',
    weight: 15,
    color: '#3D5AF1',
    portrait: '/art/candidates/expressions/newsom-smile.png',
    bio: 'Hes he best-funded brawler in the party. He will debate anyone, anywhere, at any hour, on any network, twice.',
    strengths: ['Floods the airwaves', 'Relentless counter-puncher'],
    weaknesses: ['California is a 30-second attack ad', 'Coastal instincts in a Midwest year'],
    nat: 1.78,
    region: { west: 4.5, northeast: 1.0, south: -7.5, midwest: -2.0 },
    groups: { jewish: -2, }

  },
  {
    //Strength: Low - -2-3 points nationally
    // Divisiveness: High
    id: 'aoc',
    name: 'Alexandria Ocasio-Cortez',
    short: 'AOC',
    state: 'New York',
    title: 'Movement Builder',
    party: 'dem',
    weight: 14,
    color: '#3D5AF1',
    portrait: '/art/candidates/expressions/aoc-frown.png',
    bio: 'She is a generational organizer with a volunteer army and an enemies list. She can out crowds like nobodys business — and scares the swing voters you need.',
    strengths: ['Rally crowds like a rock tour', 'Dominates youth and progressive turnout'],
    weaknesses: ['Centrists sprint for the exits', 'Fox runs the same clip for 90 days'],
    nat: -2.5,
    region: { northeast: 4.0, west: 2.0, south: -3.0, midwest: -2.0 },
    groups: { jewish: -15, muslim: 8, irrelegious: 4, evangelical: -10}

  },
    //Strength: Low - -2-3 points nationally
    // Divisiveness: High  
  {
    id: 'harris',
    name: 'Kamala Harris',
    short: 'Harris',
    state: 'California',
    title: 'The Return',
    party: 'dem',
    weight: 22,
    color: '#3D5AF1',
    portrait: '/art/candidates/expressions/harris-smile.png',
    bio: 'Shes the polling frontrunner and the most recognizable name in the field. Also the candidate Republicans have spent four years rehearsing attack lines about.',
    strengths: ['Highest name recognition by far', 'Money network already built'],
    weaknesses: ['Ceiling baked in by 2024', 'Every gaffe gets replayed as a rerun'],
    nat: -2.2,
    region: { west: 3.0, northeast: 1.0, south: -1.0, midwest: -2.0 },
  },
  {
    //Strength: Medium - 0-1 points nationally
    // Divisiveness: Medium    
    id: 'beshear',
    name: 'Andy Beshear',
    short: 'Beshear',
    state: 'Kentucky',
    title: 'Red State Democrat',
    party: 'dem',
    weight: 5,
    color: '#3D5AF1',
    portrait: '/art/candidates/expressions/beshear-smile.png',
    bio: 'He won a Trump-plus-30 state twice by talking about roads, jobs, and being a decent human being. Unfortunately, nobody outside Kentucky knows who he is.',
    strengths: ['Plays well in Trump country', 'Disaster-response credibility'],
    weaknesses: ['Needs a national introduction fast', 'Progressives are unenthused'],
    nat: 1,
    region: { south: 15.0, midwest: 2.0, west: -10, northeast: -10 },
  },
  {
    id: 'buttigieg',
    name: 'Pete Buttigieg',
    short: 'Buttigieg',
    state: 'Indiana',
    title: 'Midwest Messenger',
    party: 'dem',
    weight: 7,
    color: '#3D5AF1',
    portrait: '/art/candidates/expressions/buttigieg-neutral.png',
    bio: 'He turned a small-city mayoralty into a cabinet seat through media competence. He can explain anything in 20 seconds, which is either a gift or a tell.',
    strengths: ['Crushes every interview', 'Strong in the industrial Midwest'],
    weaknesses: ['Thin support with Black voters', 'Can read as too smooth'],
    nat: 1.0,
    region: { midwest: 4.0, northeast: 1.0, south: -6, west: -1.0 },
  },
  {
    id: 'whitmer',
    name: 'Gretchen Whitmer',
    short: 'Whitmer',
    state: 'Michigan',
    title: 'The Blue Wall Governor',
    party: 'dem',
    weight: 10,
    color: '#3D5AF1',
    portrait: '/art/candidates/expressions/whitmer-smile.png',
    bio: 'Shes a two-term governor of the state that decides the presidency, with a roads-and-wages record and a suburban manner that travels. But everything in her resume points at the Blue Wall - and nothing else.',
    strengths: ['Owns the industrial Midwest', 'Wins back the suburban women the party lost'],
    weaknesses: ['The map is three states and a prayer', 'Never had to answer a national security question'],
    nat: 1.0,
    region: { midwest: 5.0, northeast: 0.5, south: -1.5, west: -1.0 },
  },
  {
    id: 'shapiro',
    name: 'Josh Shapiro',
    short: 'Shapiro',
    state: 'Pennsylvania',
    title: 'The Swing State Prosecutor',
    party: 'dem',
    weight: 9,
    color: '#3D5AF1',
    portrait: '/art/candidates/expressions/shapiro-neutral.png',
    bio: 'Hes a former attorney general who won Pennsylvania by double digits and has spent two years refusing to answer the obvious question. Hes one of the most plausible general-election candidates, and the least tested in a national glare.',
    strengths: ['Wins independents by a mile', 'Prosecutor’s command of a hostile room'],
    weaknesses: ['The left wing does not trust him', 'One state’s coalition, not fifty’s'],
    nat: 2.0,
    region: { northeast: 4.0, midwest: 1.0, south: -1.0, west: -1.5 },
  },
  {
    id: 'klobuchar',
    name: 'Amy Klobuchar',
    short: 'Klobuchar',
    state: 'Minnesota',
    title: 'The Prairie Pragmatist',
    party: 'dem',
    weight: 6,
    color: '#3D5AF1',
    portrait: '/art/candidates/expressions/klobuchar-neutral.png',
    bio: 'The most productive senator in the caucus and the safest pair of hands in the field. Runs on antitrust, farm bills, and the fact that she has never lost a race in a state that keeps almost voting Republican.',
    strengths: ['Wins rural counties Democrats lost', 'Legislative record nobody can attack'],
    weaknesses: ['Zero excitement in a base-driven year', 'Staff turnover is a running joke'],
    nat: 0.5,
    region: { midwest: 4.5, northeast: 0.5, south: -1.0, west: -0.5 },
  },
  {
    id: 'booker',
    name: 'Cory Booker',
    short: 'Booker',
    state: 'New Jersey',
    title: 'The Bridge Builder',
    party: 'dem',
    weight: 4,
    color: '#3D5AF1',
    portrait: '/art/candidates/expressions/booker-smile.png',
    bio: 'Twenty years of Newark politics, a filibuster record, and genuine cross-party friendships in the Senate. Runs on love and infrastructure, which is either the answer or a parody of one.',
    strengths: ['Strong with Black voters nationally', 'Can raise money in any room'],
    weaknesses: ['Runs as a personality, not a message', 'Coastal liberal voting record'],
    nat: 0.2,
    region: { northeast: 3.5, south: 0.5, midwest: -1.0, west: -0.5 },
  },
  {
    id: 'warnock',
    name: 'Raphael Warnock',
    short: 'Warnock',
    state: 'Georgia',
    title: 'The Pastor',
    party: 'dem',
    weight: 3.5,
    color: '#3D5AF1',
    portrait: '/art/candidates/expressions/warnock-smile.png',
    bio: 'Won two runoffs in a state Republicans need, from a pulpit and a Senate floor. The best orator in the field and the only Democrat with a proven Sun Belt turnout operation.',
    strengths: ['Black turnout will be sky high', 'Religious voters are at ease'],
    weaknesses: ['Unknown west of Texas', 'Irrelegious whites arent enthused'],
    nat: 1.23,
    region: { south: 5, northeast: 0, midwest: 0, west: -2 },
    groups: { black:50, jewish:5, evangelical:10, catholic:3, protestant:3, irrelegious: -15},
    states: { AL:5, MS:4.5, LA:4.5, SC: 5, TX:5, FL:5, CA:-5, OR: -5, WA: -5, NH:-5, ME:-5, CT: -5},
    turnoutRegion: { south: 5, west: -5 },
    turnoutStates: { FL: 1, GA:5, LA:2, MS:2, NC:2, AL:5, SC:2, TX:1 },

  },
  {
    id: 'moore',
    name: 'Wes Moore',
    short: 'Moore',
    state: 'Maryland',
    title: 'The New Governor',
    party: 'dem',
    weight: 2.5,
    color: '#3D5AF1',
    portrait: '/art/candidates/expressions/moore-smile.png',
    bio: 'Combat veteran, Rhodes scholar, first-term governor with the best speech in the party. A national profile built entirely on potential, which is a real currency in an open primary.',
    strengths: ['Best communicator of a new generation', 'Veteran credibility with swing voters'],
    weaknesses: ['One term of executive experience', 'A campaign of vibes and no receipts'],
    nat: 0,
    region: { northeast: 0, south: 0, midwest: 0, west: 0 },
  },
];

export const REPUBLICANS = [
  {
    id: 'reagan',
    name: 'Ronald Reagan',
    short: 'Reagan',
    state: 'California',
    title: 'Reanimated Gipper',
    party: 'rep',
    weight: 2.5,
    color: '#F2603C',
    portrait: '/art/candidates/expressions/reagan-smile.png',
    bio: 'A reanimated Ronald Reagan, running on a modern translation of his conservative record: tax cuts, deregulation, a muscular foreign policy, and a broad optimistic appeal.',
    strengths: ['Historic strength in the West and South, with a durable Midwest coalition', 'Optimistic message reaches beyond the Republican base'],
    weaknesses: ['His coalition strains in the Northeast and among voters wary of deregulation', 'Modern issues require interpretation beyond his own era'],
    nat: 3.2,
    region: { west: 6, south: 4.5, midwest: 2.5, northeast: -4 },
    states: { CA: 4, AZ: 2, TX: 2 },
    issueStances: { affordability: 2, economy: 2, health: 2, iran: 2, corruption: 2, prices: 2, immigration: 1, inequality: 2, abortion: 2, rent: 2, tariffs: 0, gerrymandering: 2, israel: 2, crime: 2, datacenters: 2, energy: 2, ai: 2, trans: 2, birthrate: 2 },
  },
  {
    id: 'vance',
    name: 'JD Vance',
    short: 'Vance',
    state: 'Ohio',
    title: 'The Heir',
    party: 'rep',
    weight: 59,
    color: '#F2603C',
    portrait: '/art/candidates/expressions/vance-frown.png',
    bio: 'The sitting Vice President and the clear primary frontrunner. Owns the base, the podcast universe, and the mantle of the movement.',
    strengths: ['Base locked in before Labor Day', 'Midwest authenticity'],
    weaknesses: ['Capped appeal in the suburbs', 'Has to defend every incumbent headache'],
    nat: -3.33,
    region: { midwest: 3, south: 1.0, west: -2, northeast: -2.0 },
    groups: {catholic: 2, jewish: 5, muslim: -20, black:-5},
  },
  {
    id: 'rubio',
    name: 'Marco Rubio',
    short: 'Rubio',
    state: 'Florida',
    title: 'The Diplomat',
    party: 'rep',
    weight: 41,
    color: '#F2603C',
    portrait: '/art/candidates/expressions/rubio-neutral.png',
    bio: 'Secretary of State with a foreign-policy record and real Hispanic outreach. The establishment lane, if the establishment still has a lane.',
    strengths: ['Best Republican with Latino voters', 'Strong Foreign Policy Experience gives him an edge with military voters'],
    weaknesses: ['Primary base suspects him', 'Centrists arent enthralled either'],
    nat: 0,
    region: { south: -1, west: 1.5, northeast: 1, midwest: -1.5 },
    states: { FL: 5, CA: -5 },
    // A machine, not a message: nobody in the South turns out like his people do.
    turnoutRegion: { south: 1 },
    groups: { hispanic:15, evangelical: 10, irrelegious: -10},
  },
  {
    id: 'trumpjr',
    name: 'Donald Trump Jr.',
    short: 'Trump Jr.',
    state: 'Florida',
    title: 'The Inheritor',
    party: 'rep',
    weight: 12,
    color: '#F2603C',
    portrait: '/art/candidates/expressions/trumpjr-frown.png',
    bio: 'The loudest voice in the movement and the second-place name in every national survey. Turns a podcast appearance into a rally, and a rally into a fundraising record.',
    strengths: ['Base instincts nobody has to explain to him', 'Fills arenas on the name alone'],
    weaknesses: ['Swing voters already have opinions', 'No governing record to point at'],
    nat: -10,
    region: { south: -2, midwest: 2.0, west: -1, northeast: -1.5 },
  },
  {
    id: 'desantis',
    name: 'Ron DeSantis',
    short: 'DeSantis',
    state: 'Florida',
    title: 'The Governor',
    party: 'rep',
    weight: 8,
    color: '#F2603C',
    portrait: '/art/candidates/expressions/desantis-frown.png',
    bio: 'A two-term governor with the largest turnout machine in the party and a culture-war record that actually produced laws. Still has to prove it travels north of Jacksonville.',
    strengths: ['Florida machine delivers votes', 'Fights that end in signed bills'],
    weaknesses: ['Stiff on a rope line', 'Four years of opposition research, pre-loaded'],
    nat: 0.3,
    region: { south: 3, midwest: 0.5, west: -1, northeast: -2 },
    // The largest turnout machine in the party, and it lives in Florida.
    turnoutStates: { FL: 1 },
  },
  {
    id: 'haley',
    name: 'Nikki Haley',
    short: 'Haley',
    state: 'South Carolina',
    title: 'The Hawk',
    party: 'rep',
    weight: 4,
    color: '#F2603C',
    portrait: '/art/candidates/expressions/haley-smile.png',
    bio: 'The establishment lane’s best fundraiser and the field’s strongest suburban performer. Also the one candidate the base has already booed in person.',
    strengths: ['Deep donor bench, ready on day one', 'Wins college-educated suburbs'],
    weaknesses: ['MAGA turnout is the whole ballgame', 'The 2024 primary never really ended'],
    nat: 1.0,
    region: { south: 2, northeast: 0.5, midwest: -1, west: 0 },
  },
  {
    id: 'carlson',
    name: 'Tucker Carlson',
    short: 'Carlson',
    state: 'Maine',
    title: 'The Broadcaster',
    party: 'rep',
    weight: 2.5,
    color: '#F2603C',
    portrait: '/art/candidates/expressions/carlson-frown.png',
    bio: 'Owns the largest independent audience in right-wing media and can move a primary poll by going live. Has never asked anyone for a vote.',
    strengths: ['Free media every single night', 'Sets the party’s agenda from a desk'],
    weaknesses: ['No donor infrastructure', 'Every old clip is a new attack ad'],
    nat: -5.0,
    region: { midwest: 8, south: 5, west: -5, northeast: -5.0 },
  },
  {
    id: 'cruz',
    name: 'Ted Cruz',
    short: 'Cruz',
    state: 'Texas',
    title: 'The Debater',
    party: 'rep',
    weight: 2.5,
    color: '#F2603C',
    portrait: '/art/candidates/expressions/cruz-frown.png',
    bio: 'The best pure debater in the field, with Texas money and Texas electoral votes behind him. Ran this race once before and knows exactly where the floor is.',
    strengths: ['Wins every policy exchange on points', 'Texas donors and Texas EVs'],
    weaknesses: ['The 2016 ceiling is still the ceiling', 'Cable hits are not votes'],
    nat: -3.16,
    region: { south: 5.0, midwest: 1.0, west: -4, northeast: -2.5 },
  },
  {
    id: 'burlison',
    name: 'Eric Burlison',
    short: 'Burlison',
    state: 'Missouri',
    title: 'Ozarks Populist',
    party: 'rep',
    weight: 5,
    color: '#F2603C',
    portrait: '/art/candidates/expressions/burlison-neutral.png',
    bio: 'A Missouri populist standing in for the Midwestern Republicans Trump-era politics pushed out of the national spotlight. Who will fill that lane by 2028 is an open question.',
    strengths: ['A working-class message with real Midwest and Rust Belt pull', 'Anti-establishment instincts can break through in the Northeast'],
    weaknesses: ['Thin national profile outside the region', 'His populist edge can alienate donors and suburban moderates'],
    nat: -0.5,
    region: { midwest: 1.5, south: 1, northeast: -2, west: -2 },
    states: { MO: 4, OH: 2, MI: 1, WI: 1, PA: 1.5 },
  },
  {
    id: 'abbott',
    name: 'Greg Abbott',
    short: 'Abbott',
    state: 'Texas',
    title: 'The Border Governor',
    party: 'rep',
    weight: 1.5,
    color: '#F2603C',
    portrait: '/art/candidates/expressions/abbott-frown.png',
    bio: 'Runs the biggest Republican state in the country and has made the border the party’s defining issue. Has never had to introduce himself outside Texas.',
    strengths: ['Texas money, Texas turnout', 'Owns the border argument'],
    weaknesses: ['Unknown above the Mason-Dixon', 'One state, one message'],
    nat: 0.18,
    region: { south: 3.5, west: 1.0, midwest: -0.5, northeast: -2.0 },
  },
  {
    id: 'timscott',
    name: 'Tim Scott',
    short: 'T. Scott',
    state: 'South Carolina',
    title: 'The Optimist',
    party: 'rep',
    weight: 1,
    color: '#F2603C',
    portrait: '/art/candidates/expressions/timscott-smile.png',
    bio: 'The Senate’s most liked Republican and the donor class’s favourite dinner guest. Runs on optimism in a primary that keeps rewarding grievance.',
    strengths: ['Senate relationships and donor trust', 'Softens the party’s image'],
    weaknesses: ['Low voltage on the trail', 'The base wants a fighter'],
    nat: 0,
    region: { south: 0, northeast: 0, midwest: 0, west: 0 },
  },
  {
    id: 'youngkin',
    name: 'Glenn Youngkin',
    short: 'Youngkin',
    state: 'Virginia',
    title: 'The Executive',
    party: 'rep',
    weight: 1,
    color: '#F2603C',
    portrait: '/art/candidates/expressions/youngkin-smile.png',
    bio: 'Won a state Harris carried by double digits, then governed without ever fully claiming the movement. The donor class’s favourite fantasy.',
    strengths: ['Won a blue-leaning state', 'Corporate donors are comfortable'],
    weaknesses: ['The base is unmoved', 'Never tested outside Virginia'],
    nat: 0.4,
    region: { south: 1.5, northeast: 1, midwest: -1, west: 0 },
  },
  {
    id: 'kemp',
    name: 'Brian Kemp',
    short: 'Kemp',
    state: 'Georgia',
    title: 'The Election Ref',
    party: 'rep',
    weight: 0.5,
    color: '#F2603C',
    portrait: '/art/candidates/expressions/kemp-neutral.png',
    bio: 'Won Georgia three times while the rest of the party lost it. Turns out a ground game nobody else in the field can replicate — with a base that remembers 2020.',
    strengths: ['Georgia machine actually works', 'Proven in tough cycles'],
    weaknesses: ['Wrong side of the base’s grievance', 'No national profile at all'],
    nat: 0.3,
    region: { south: 3.0, midwest: -1.0, northeast: -1.0, west: -0.5 },
  },
];

export const ALL_CANDIDATES = [...DEMOCRATS, ...REPUBLICANS, ...THIRD_CANDIDATES, ...BUILD39_CANDIDATES, ...BUILD45_HISTORICAL_CANDIDATES, ...Object.values(SCENARIO_CANDIDATES)].map((candidate) => ({ ...candidate, ratings: CANDIDATE_RATINGS[candidate.id] || ('ratings' in candidate ? candidate.ratings : null) || { debate: 10, speech: 10, rally: 10, corruption: 10 } }));

for (const candidate of [...DEMOCRATS, ...REPUBLICANS, ...THIRD_CANDIDATES]) candidate.ratings = ALL_CANDIDATES.find(({ id }) => id === candidate.id).ratings;

export const CANDIDATE_BY_ID = ALL_CANDIDATES.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {});

export const FIELD_BY_PARTY = {
  dem: DEMOCRATS,
  rep: REPUBLICANS,
  lib: ALL_CANDIDATES.filter((c) => c.party === 'lib'),
  grn: ALL_CANDIDATES.filter((c) => c.party === 'grn'),
};

export function byParty(party, scenarioId = 'standard') {
  const field = FIELD_BY_PARTY[party] || scenarioCandidateOptions(scenarioId).filter((candidate) => candidate.party === party);
  if (scenarioId === 'regional-parties') {
    const claimed = new Set(Object.values(REGIONAL_EXISTING_NOMINEES));
    if (party === 'dem' || party === 'rep') {
      return field.filter(({ id }) => !claimed.has(id));
    }
    const baseId = REGIONAL_EXISTING_NOMINEES[party];
    if (baseId && CANDIDATE_BY_ID[baseId]) {
      const base = CANDIDATE_BY_ID[baseId];
      const meta = SCENARIO_PARTIES[party];
      return [{
        ...base,
        id: party,
        baseCandidateId: baseId,
        party,
        color: meta?.color || base.color,
      }];
    }
    return field;
  }
  if (scenarioId !== 'six-party') return field;
  const assigned = BUILD40_SIX_TICKET_CANDIDATES[party] || [];
  const exclusive = new Set(Object.values(BUILD40_SIX_TICKET_CANDIDATES).flat());
  return [...field.filter(({ id }) => !exclusive.has(id)),
    ...assigned.map((id) => ({ ...CANDIDATE_BY_ID[id], party }))];
}

const ABBR_BY_STATE_NAME = STATE_LIST.reduce((acc, s) => {
  acc[s.name] = s.abbr;
  return acc;
}, {});

// Every candidate file lists a home state by name; the map wants an abbreviation.
export function homeAbbr(candidate) {
  return ABBR_BY_STATE_NAME[candidate?.state] || 'DC';
}

