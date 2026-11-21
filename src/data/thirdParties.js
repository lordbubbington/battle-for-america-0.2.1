import { SCENARIO_CANDIDATES } from './build39Scenarios.js';
// Third parties, 2028. Real people who could plausibly hold a Libertarian or
// Green nomination, plus the machinery the game needs to put them on the map.
//
// A third-party run is hard on purpose: the baseline is small, the map does not
// know your name, and the only way to a state is to live in it for a month. The
// "surge" switch in setup is what happens when the country actually loses it.

export const THIRD_PARTIES = {
  lib: {
    id: 'lib',
    label: 'Libertarian Party',
    short: 'Libertarian',
    color: '#F5C542',
    blurb:
      'Ballot access almost everywhere, a base that wants the government to leave it alone, and a debate stage nobody lets them on.',
  },
  grn: {
    id: 'grn',
    label: 'Green Party',
    short: 'Green',
    color: '#3FBF6F',
    blurb:
      'Can fill a hall and not a statehouse. Twenty years of being told a vote for them is a vote for the other guy.',
  },
};

export const THIRD_PARTY_IDS = ['lib', 'grn'];

export function isThirdParty(party) {
  return party === 'lib' || party === 'grn' || Object.hasOwn(SCENARIO_CANDIDATES, party);
}

export const THIRD_CANDIDATES = [
  // ------------------------------------------------------------------ Libertarian
  {
    id: 'oliver',
    name: 'Chase Oliver',
    short: 'Oliver',
    state: 'Georgia',
    title: 'The 2024 Nominee',
    party: 'lib',
    weight: 22,
    color: '#F5C542',
    portrait: '/art/candidates/expressions/oliver-smile.png',
    bio: 'Ran the whole country in 2024 on a folding table and a podcast. Now has name recognition, a donor list, and nothing to lose.',
    strengths: ['Every state already knows the name', 'Genuinely funny on camera'],
    weaknesses: ['The party machine still resents him', 'No money worth a media market'],
    nat: 1.0,
    region: { south: 2.2, west: 1.1, midwest: 0.4, northeast: -0.8 },
  },
  {
    id: 'dsmith',
    name: 'Dave Smith',
    short: 'Smith',
    state: 'California',
    title: 'The Comedian',
    party: 'lib',
    weight: 18,
    color: '#F5C542',
    portrait: '/art/candidates/expressions/dsmith-smile.png',
    bio: 'A stand-up with a libertarian podcast bigger than the party. Fills theaters, which is not the same as filling ballot boxes.',
    strengths: ['Enormous online reach', 'Makes isolationism sound reasonable'],
    weaknesses: ['Has never held an office of any kind', 'Coastal accent in a rural party'],
    nat: 0.4,
    region: { west: 2.6, northeast: 0.6, south: 0.2, midwest: -0.6 },
  },
  {
    id: 'termaat',
    name: 'Mike ter Maat',
    short: 'ter Maat',
    state: 'Virginia',
    title: 'The Economist',
    party: 'lib',
    weight: 12,
    color: '#F5C542',
    portrait: '/art/candidates/expressions/termaat-neutral.png',
    bio: 'An economist and former cop who can explain the Federal Reserve to a diner at 6am. The party’s adult in the room.',
    strengths: ['Credible on spending', 'Wins the post-debate clip'],
    weaknesses: ['Zero charisma', 'Boring people into voting for someone else'],
    nat: -0.4,
    region: { south: 1.0, northeast: 0.8, midwest: 0.4, west: -0.2 },
  },
  {
    id: 'mcardle',
    name: 'Angela McArdle',
    short: 'McArdle',
    state: 'Texas',
    title: 'The Chair',
    party: 'lib',
    weight: 10,
    color: '#F5C542',
    portrait: '/art/candidates/expressions/mcardle-neutral.png',
    bio: 'Ran the party itself, which means she knows where every county chair lives and which ones will not return a call.',
    strengths: ['The ballot-access machine is hers', 'Ruthless with a party rulebook'],
    weaknesses: ['Unknown outside the movement', 'Spends the first month explaining the movement'],
    nat: -1.2,
    region: { south: 2.4, west: 1.2, midwest: 0.2, northeast: -1.2 },
  },

  // ------------------------------------------------------------------------ Green
  {
    id: 'stein',
    name: 'Jill Stein',
    short: 'Stein',
    state: 'Massachusetts',
    title: 'The Perennial',
    party: 'grn',
    weight: 24,
    color: '#3FBF6F',
    portrait: '/art/candidates/expressions/stein-neutral.png',
    bio: 'Three presidential runs and a name that half the country already has an opinion about. The one Green who gets on television.',
    strengths: ['Instant national name ID', 'Raises money in small checks'],
    weaknesses: ['The spoiler label is welded on', 'Every interview starts with 2016'],
    nat: -1.6,
    region: { northeast: 2.6, west: 1.4, midwest: 0.2, south: -0.8 },
  },
  {
    id: 'ware',
    name: 'Butch Ware',
    short: 'Ware',
    state: 'California',
    title: 'The Professor',
    party: 'grn',
    weight: 14,
    color: '#3FBF6F',
    portrait: '/art/candidates/expressions/ware-smile.png',
    bio: 'A historian who talks about empire for an hour without notes. The 2024 running mate, now at the top of the ticket.',
    strengths: ['Best speechwriter in the field', 'Turns out young crowds'],
    weaknesses: ['No executive record', 'The press asks about the running mate’s posts'],
    nat: -0.8,
    region: { west: 2.0, northeast: 1.0, south: 0.2, midwest: -0.4 },
  },
  {
    id: 'baraka',
    name: 'Ajamu Baraka',
    short: 'Baraka',
    state: 'Illinois',
    title: 'The Organizer',
    party: 'grn',
    weight: 11,
    color: '#3FBF6F',
    portrait: '/art/candidates/expressions/baraka-neutral.png',
    bio: 'A human-rights organizer who has been at this since before the party had a budget. Speaks to rooms the Democrats have stopped visiting.',
    strengths: ['Real roots in forgotten precincts', 'Unshakeable in a hostile interview'],
    weaknesses: ['Unelectable to the middle', 'The party’s own moderates flinch'],
    nat: -1.4,
    region: { midwest: 1.8, northeast: 1.2, south: 0.4, west: 0.2 },
  },
  {
    id: 'sawant',
    name: 'Kshama Sawant',
    short: 'Sawant',
    state: 'Washington',
    title: 'The Councilmember',
    party: 'grn',
    weight: 13,
    color: '#3FBF6F',
    portrait: '/art/candidates/expressions/sawant-frown.png',
    bio: 'Won a citywide seat four times by running against her own party. Believes the Green Party should stop apologizing for existing.',
    strengths: ['Actually wins elections', 'Working-class base that shows up'],
    weaknesses: ['Socialist label, national electorate', 'Burns bridges on purpose'],
    nat: -1.0,
    region: { west: 2.8, northeast: 0.8, midwest: 0.2, south: -0.6 },
  },
];

export function thirdCandidatesFor(party) {
  return THIRD_CANDIDATES.filter((c) => c.party === party);
}

export const THIRD_BY_ID = THIRD_CANDIDATES.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {});

