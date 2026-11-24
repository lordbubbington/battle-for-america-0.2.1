import { BUILD40_SIX_TICKET_CANDIDATES } from './build40Elections.js';
import { REGIONAL_EXISTING_NOMINEES, SCENARIO_PARTIES } from './build39Scenarios.js';
import { BUILD39_CANDIDATES } from './build39Candidates.js';
import { BUILD45_HISTORICAL_CANDIDATES } from './build45HistoricalCandidates.js';
import { UNLOCKABLE_CANDIDATES } from './unlockableCandidates.js';
import { isCandidateUnlocked } from '@/lib/achievements';
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
    portrait: '/art/candidates/fdr.png',
    bio: 'A reanimated Franklin Roosevelt campaigning on a modern adaptation of the New Deal. Where contemporary policy debates have no direct 1930s parallel, his platform follows the broader direction of his four terms in office.',
    strengths: ['Broad coalition support across the Northeast, Midwest, and South', 'Strong appeal among working-class voters on economic policy'],
    weaknesses: ['Centralized 1930s governing approach draws skepticism from modern voters', 'Depends on voters accepting a modernized historical platform'],
    nat: 5.0,
    region: { northeast: 7.5, midwest: 7.0, south: 5.5, west: 2.5 },
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
    portrait: '/art/candidates/ossoff.png',
    bio: 'A two-term senator who won back-to-back competitive races in a Sun Belt battleground, powered by a strong ground game and disciplined fundraising. Supporters see a tested politician who has proven he can win in swing states while having enough charisma to boost the party nationally, while critics question whether his low-key profile can carry a national campaign.',
    strengths: ['Proven statewide winner in the competitive South', 'Disciplined messaging with few established vulnerabilities'],
    weaknesses: ['Lower national name recognition than senior rivals', 'Less prominent in national media coverage'],
    nat: 2.8,
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
    portrait: '/art/candidates/newsom.png',
    bio: 'A two-term governor of the largest state in the union, with one of the largest donor networks in the Democratic Party and a frequent presence on national television. Supporters view him as an assertive messenger for the party, while critics argue his choice to define himself as the foil to Trump makes him a man for the 2020s, not the 2030s.',
    strengths: ['Deep fundraising network and high national media visibility', 'Experienced debater comfortable in hostile interviews'],
    weaknesses: ['California governance record is a primary target for Republican ads', 'Regional weaknesses in the South and parts of the Midwest'],
    nat: 2.3,
    region: { west: 4.5, northeast: 1.0, south: -4.5, midwest: -0.5 },
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
    portrait: '/art/candidates/aoc.png',
    bio: 'A congresswoman who rose to the front of the party\'s progressive wing through grassroots organizing and an unmatched digital following. Supporters point to her ability to turn out young and left-leaning voters at scale, while skeptics argue her national brand makes it harder to hold suburban moderates.',
    strengths: ['Large grassroots volunteer base and strong rally attendance', 'High turnout potential among youth and progressive voters'],
    weaknesses: ['Persistent resistance from centrist and swing voters', 'High negative name recognition in conservative media'],
    nat: -1.2,
    region: { northeast: 4.5, west: 2.5, south: -2.5, midwest: -1.0 },
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
    portrait: '/art/candidates/harris.png',
    bio: 'The former Vice President and 2024 Democratic nominee, entering the race with universal name recognition and an existing national donor network. Supporters point to her executive experience and institutional backing, while critics argue voters have already formed fixed opinions about her from the last cycle.',
    strengths: ['Highest national name recognition in the Democratic field', 'Established national fundraising and party network'],
    weaknesses: ['Voter impressions remain heavily defined by the 2024 campaign', 'Extensive opposition research already familiar to general-election voters'],
    nat: -0.6,
    region: { west: 3.5, northeast: 1.5, south: 0, midwest: -1.0 },
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
    portrait: '/art/candidates/beshear.png',
    bio: 'A two-term governor who twice won statewide office in deeply Republican territory by focusing on infrastructure, local jobs, and crisis management. Supporters argue he can cut into Republican margins in rural counties, while critics note his low national visibility and lukewarm standing with the party\'s left.',
    strengths: ['Demonstrated crossover appeal in Republican-leaning states', 'Strong credibility on infrastructure and disaster response'],
    weaknesses: ['Limited national name recognition outside Kentucky', 'Slower enthusiasm among the party\'s progressive base'],
    nat: 1.6,
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
    portrait: '/art/candidates/buttigieg.png',
    bio: 'A former South Bend mayor and Transportation Secretary who built his national profile through frequent television appearances and disciplined messaging. Supporters point to his command of policy in hostile interviews, while critics argue his delivery can come across as overly rehearsed.',
    strengths: ['Consistent performer in television interviews and policy exchanges', 'Favorable standing in the industrial Midwest'],
    weaknesses: ['Historically softer support among Black voters', 'Delivery can read as overly polished to some swing voters'],
    nat: 2.4,
    region: { midwest: 5.5, northeast: 2.0, south: -2.5, west: 0.5 },
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
    portrait: '/art/candidates/whitmer.png',
    bio: 'A two-term governor of a core Midwest battleground who won reelection comfortably on infrastructure and kitchen-table economics. Supporters view her as the natural anchor for the Great Lakes states, while skeptics point to her thinner record on foreign policy and limited footprint outside the Midwest.',
    strengths: ['Two-term governor of a core Midwest battleground', 'Strong performance among suburban voters in the Great Lakes'],
    weaknesses: ['Electoral map leans heavily on the Midwest states', 'Limited prior exposure on foreign policy and national security'],
    nat: 2.6,
    region: { midwest: 6.5, northeast: 1.5, south: -0.5, west: 0 },
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
    portrait: '/art/candidates/shapiro.png',
    bio: 'A former attorney general who won the governorship of a must-win swing state by double digits and kept strong approval ratings across party lines. Supporters highlight his crossover appeal with independents and prosecutorial polish, while critics on the left remain wary of his moderate instincts.',
    strengths: ['Strong crossover performance among independent voters', 'Clear, prosecutorial style in debates and interviews'],
    weaknesses: ['Ongoing friction with the party\'s progressive wing', 'Untested in a sustained fifty-state national campaign'],
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
    portrait: '/art/candidates/klobuchar.png',
    bio: 'A four-term senator with a prolific legislative record on antitrust and farm policy who has never lost a race in the Upper Midwest. Supporters regard her as a steady general-election nominee with rural credibility, while critics question whether she can generate real enthusiasm among base voters.',
    strengths: ['Strong historical performance in rural Midwestern counties', 'Extensive bipartisan legislative record'],
    weaknesses: ['Lower enthusiasm among younger and activist base voters', 'Past scrutiny over Senate office management'],
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
    portrait: '/art/candidates/booker.png',
    bio: 'A former Newark mayor and multi-term senator with a long record on criminal justice reform and infrastructure. Supporters point to his fundraising reach and deep ties with Black voters, while critics argue his coastal voting record and broad rhetoric make it harder to land a sharp general-election contrast.',
    strengths: ['Strong standing with Black voters nationwide', 'Reliable fundraising network across major donor markets'],
    weaknesses: ['Campaign message can read as overly broad', 'Northeast liberal voting record is a target in swing states'],
    nat: 1.8,
    region: { northeast: 4.0, south: 1.5, midwest: 0, west: 0 },
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
    portrait: '/art/candidates/warnock.png',
    bio: 'The senior pastor of Ebenezer Baptist Church and a two-time Senate runoff winner backed by an established Sun Belt turnout operation. Supporters highlight his oratory and ability to mobilize Black and faith-oriented voters, while skeptics point to his lower profile in the West and softer standing among secular voters.',
    strengths: ['High turnout potential among Black voters in the South', 'Credibility with religious voters across denominations'],
    weaknesses: ['Limited name recognition in Western states', 'Softer appeal among secular white voters'],
    nat: 2.4,
    region: { south: 5.5, northeast: 0.5, midwest: 0.5, west: -1.0 },
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
    portrait: '/art/candidates/moore.png',
    bio: 'A combat veteran, Rhodes scholar, and first-term governor who entered national Democratic conversation quickly on the strength of his public speaking. Supporters view him as a generational communicator who can appeal to swing voters, while critics point to his brief executive record.',
    strengths: ['Strong public speaker with broad national appeal', 'Military background adds credibility with moderate voters'],
    weaknesses: ['Limited executive record after one term as governor', 'Unproven under sustained national campaign scrutiny'],
    nat: 1.7,
    region: { northeast: 1.5, south: 1.5, midwest: 1.0, west: 0.5 },
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
    portrait: '/art/candidates/reagan.png',
    bio: 'A reanimated Ronald Reagan campaigning on a modern application of his conservative platform, centered on tax cuts, deregulation, and a firm foreign policy. Supporters point to his historical strength in the West and South and broad cross-party appeal, while critics question how a 1980s coalition holds up on contemporary issues.',
    strengths: ['Historic strength across the West, South, and Midwest', 'Broad message capable of reaching beyond the Republican base'],
    weaknesses: ['Softer support in the Northeast and among voters wary of deregulation', 'Requires adapting a historical platform to current policy debates'],
    nat: 2.1,
    region: { west: 5.0, south: 4.0, midwest: 1.5, northeast: -4 },
    states: { CA: 3, AZ: 1.5, TX: 1.5 },
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
    portrait: '/art/candidates/vance.png',
    bio: 'The sitting Vice President and former senator, entering the cycle as the clear Republican primary frontrunner with strong ties to the populist wing and conservative media. Supporters point to his Midwest roots and consolidated base loyalty, while critics note his ceiling in the suburbs and direct exposure to the sitting administration\'s record.',
    strengths: ['Consolidated support across the Republican base', 'Strong regional familiarity in the industrial Midwest'],
    weaknesses: ['Persistent resistance in college-educated suburban districts', 'Tied directly to the record of the sitting administration'],
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
    portrait: '/art/candidates/rubio.png',
    bio: 'The sitting Secretary of State and former senator with a deep foreign-policy resume and established outreach to Hispanic voters. Supporters view him as a disciplined general-election contender with strong Sun Belt roots, while skeptics point to lingering distrust from parts of the populist base.',
    strengths: ['Strongest Republican performer among Hispanic voters', 'Foreign-policy experience adds credibility with national security voters'],
    weaknesses: ['Lingering skepticism from segments of the populist base', 'Limited crossover enthusiasm among swing centrists'],
    nat: -1.0,
    region: { south: -1, west: 1.5, northeast: 1, midwest: -1.5 },
    states: { FL: 5, CA: -5 },
    // A machine, not a message: nobody in the South turns out like his people do.
    turnoutRegion: { south: 1 },
    groups: { hispanic: 10, evangelical: 6, irrelegious: -10 },
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
    portrait: '/art/candidates/trumpjr.png',
    bio: 'A prominent conservative media figure and longtime campaign surrogate who consistently polls near the top of early Republican primary surveys. Supporters point to his immediate fundraising reach and arena-level pull with core base voters, while critics note his lack of governing experience and high unfavorable ratings with independents.',
    strengths: ['Immediate loyalty and turnout pull with core base voters', 'Strong fundraising and arena-level rally attendance'],
    weaknesses: ['High unfavorable ratings among swing and independent voters', 'No prior record in elected or executive office'],
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
    portrait: '/art/candidates/desantis.png',
    bio: 'A two-term governor backed by a formidable state turnout machine and a high-profile record of enacted conservative legislation. Supporters cite his administrative discipline and landslide reelection, while critics point to his uneven retail-campaign performance during the 2024 primary.',
    strengths: ['Well-funded Florida turnout and donor operation', 'Concrete legislative record on conservative priorities'],
    weaknesses: ['Mixed reviews on retail campaigning and unscripted events', 'Extensive opposition research carried over from 2024'],
    nat: -0.8,
    region: { south: 2.5, midwest: 0, west: -1.5, northeast: -2.5 },
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
    portrait: '/art/candidates/haley.png',
    bio: 'A former governor and United Nations ambassador with a deep corporate donor base and consistent strength in suburban counties. Supporters argue she offers the clearest path back to college-educated swing voters, while critics note persistent resistance from the party\'s MAGA wing left over from 2024.',
    strengths: ['Established national donor network ready from launch', 'Strong performance in college-educated suburban areas'],
    weaknesses: ['Risk of depressed turnout among core MAGA voters', 'Unresolved primary divisions left over from 2024'],
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
    portrait: '/art/candidates/carlson.png',
    bio: 'A former prime-time cable host with one of the largest independent audiences in conservative media and the ability to shift party debate simply by going on the air. Supporters point to his unmatched earned-media reach, while critics emphasize his lack of campaign infrastructure and a long archive of controversial broadcasts.',
    strengths: ['Substantial earned-media reach without paid advertising', 'Significant influence over conservative policy priorities'],
    weaknesses: ['No traditional fundraising or field infrastructure', 'Extensive archive of past broadcasts available for attack ads'],
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
    portrait: '/art/candidates/cruz.png',
    bio: 'A multi-term senator and former solicitor general known for his command of policy detail in debates and a large home-state donor network. Supporters point to his conservative consistency and prior presidential run, while critics argue his favorability with independents has barely moved since 2016.',
    strengths: ['Experienced debater with strong command of policy detail', 'Large Texas donor network and secure home-state base'],
    weaknesses: ['Longstanding favorability ceiling among independent voters', 'High media visibility does not consistently translate into swing votes'],
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
    portrait: '/art/candidates/burlison.png',
    bio: 'A congressman representing a traditional Midwestern populist lane within the Republican caucus. Supporters point to his working-class economic framing and familiarity across the lower Midwest, while critics note his limited national profile and modest donor reach.',
    strengths: ['Working-class economic message suited to the Midwest and Rust Belt', 'Anti-establishment positioning can appeal to disaffected voters'],
    weaknesses: ['Limited national name recognition outside Missouri and neighboring states', 'Populist positioning can alienate traditional donors and suburban moderates'],
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
    portrait: '/art/candidates/abbott.png',
    bio: 'A 3 term governor of the 2nd largest state in the country who has made border security the centerpiece of his administration and commands an enormous donor network. Supporters highlight his executive record and turnout machine, while critics note he has never had to introduce himself to voters outside Texas, and still lost his most recent election there.',
    strengths: ['Major Texas fundraising network and statewide turnout record', 'Strong issue ownership on border and immigration policy'],
    weaknesses: ['Lower name recognition outside the South', 'Policy profile is heavily concentrated around a single state and issue'],
    nat: -0.7,
    region: { south: 3.0, west: 0.5, midwest: -1.0, northeast: -2.0 },
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
    portrait: '/art/candidates/timscott.png',
    bio: 'A senator with broad goodwill among Senate colleagues and traditional Republican donors who campaigns on an optimistic economic message. Supporters argue his tone softens partisan resistance among swing voters, while critics note his low-key trail style can struggle to hold attention in a combative primary.',
    strengths: ['Strong Senate relationships and traditional donor trust', 'Optimistic tone softens partisan resistance among swing voters'],
    weaknesses: ['Lower energy and visibility on the campaign trail', 'Can struggle to satisfy base voters seeking a confrontational style'],
    nat: -1.4,
    region: { south: 1.0, northeast: -1.0, midwest: -1.0, west: -0.5 },
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
    portrait: '/art/candidates/youngkin.png',
    bio: 'A former private-equity executive who won the governorship of a Democratic-leaning state by focusing on education and economic growth. Supporters point to his suburban credibility and corporate donor appeal, while critics note lukewarm enthusiasm from the populist base and no national campaign track record.',
    strengths: ['Proven winner in a Democratic-leaning state', 'Strong standing with corporate and traditional Republican donors'],
    weaknesses: ['Modest enthusiasm among the party\'s populist base', 'Untested in national media and multi-state campaigning'],
    nat: -1.4,
    region: { south: 0.5, northeast: 0.5, midwest: -1.5, west: -0.5 },
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
    portrait: '/art/candidates/kemp.png',
    bio: 'A two-term governor who won statewide elections in a swing state during difficult national cycles for Republicans, all thanks to his turnout organization. Supporters emphasize his winning record and administrative competence, while critics point to lingering tensions with Trump-aligned base voters over 2020 and his limited national profile.',
    strengths: ['Proven Georgia turnout organization and swing-state winning record', 'Strong performance across competitive election cycles'],
    weaknesses: ['Ongoing friction with segments of the party base over 2020', 'Low national name recognition outside Georgia'],
    nat: -0.6,
    region: { south: 2.5, midwest: -1.0, northeast: -1.5, west: -1.0 },
  },
];

// Internal win-rate / strength tiers (1-5 for existing modern roster, 4-10 for unlockables).
// Strictly internal metadata: never displayed in any UI component.
const EXISTING_INTERNAL_TIERS = Object.freeze({
  fdr: 9,
  reagan: 9,
  // Existing modern Democrats (1-5)
  buttigieg: 5,
  whitmer: 5,
  ossoff: 5,
  warnock: 5,
  shapiro: 4,
  newsom: 4,
  moore: 4,
  booker: 4,
  beshear: 3,
  klobuchar: 3,
  harris: 2,
  aoc: 2,
  // Existing modern Republicans (1-5)
  haley: 5,
  kemp: 5,
  burlison: 4,
  abbott: 4,
  desantis: 4,
  rubio: 4,
  timscott: 3,
  youngkin: 3,
  cruz: 2,
  vance: 2,
  carlson: 1,
  trumpjr: 1,
  // Existing minor-party roster (1-5)
  massie: 5,
  'rand-paul': 5,
  'bernie-sanders': 5,
  oliver: 4,
  dsmith: 3,
  termaat: 2,
  ware: 2,
  mcardle: 1,
  sawant: 1,
  baraka: 1,
  stein: 1,
});

const EXISTING_UNLOCK_REQUIREMENTS = Object.freeze({
  fdr: 'win_brutal',
  reagan: 'win_brutal',
});

const UNLOCKABLE_DEM = UNLOCKABLE_CANDIDATES.filter((c) => c.party === 'dem');
const UNLOCKABLE_REP = UNLOCKABLE_CANDIDATES.filter((c) => c.party === 'rep');
const EISENHOWER_BASE = UNLOCKABLE_CANDIDATES.find((c) => c.id === 'eisenhower');
const EISENHOWER_REP = EISENHOWER_BASE
  ? { ...EISENHOWER_BASE, party: 'rep', nat: EISENHOWER_BASE.repNat ?? EISENHOWER_BASE.nat }
  : null;

const enrichCandidate = (candidate) => ({
  ...candidate,
  ratings: CANDIDATE_RATINGS[candidate.id] || ('ratings' in candidate ? candidate.ratings : null) || { debate: 10, speech: 10, rally: 10, corruption: 10 },
  internalTier: candidate.internalTier ?? EXISTING_INTERNAL_TIERS[candidate.id] ?? 3,
  unlockAchievementId: candidate.unlockAchievementId ?? EXISTING_UNLOCK_REQUIREMENTS[candidate.id] ?? null,
});

export const ALL_CANDIDATES = [
  ...DEMOCRATS,
  ...REPUBLICANS,
  ...UNLOCKABLE_CANDIDATES,
  ...THIRD_CANDIDATES,
  ...BUILD39_CANDIDATES,
  ...BUILD45_HISTORICAL_CANDIDATES,
  ...Object.values(SCENARIO_CANDIDATES),
].map(enrichCandidate);

for (const candidate of [...DEMOCRATS, ...REPUBLICANS, ...THIRD_CANDIDATES]) {
  const full = ALL_CANDIDATES.find(({ id }) => id === candidate.id);
  if (full) {
    candidate.ratings = full.ratings;
    candidate.internalTier = full.internalTier;
    candidate.unlockAchievementId = full.unlockAchievementId;
  }
}

export const CANDIDATE_BY_ID = ALL_CANDIDATES.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {});

export const FIELD_BY_PARTY = {
  dem: [...DEMOCRATS, ...UNLOCKABLE_DEM].map((c) => CANDIDATE_BY_ID[c.id] || enrichCandidate(c)),
  rep: [
    ...REPUBLICANS.map((c) => CANDIDATE_BY_ID[c.id] || enrichCandidate(c)),
    ...UNLOCKABLE_REP.map((c) => CANDIDATE_BY_ID[c.id] || enrichCandidate(c)),
    ...(EISENHOWER_REP ? [enrichCandidate(EISENHOWER_REP)] : []),
  ],
  lib: ALL_CANDIDATES.filter((c) => c.party === 'lib'),
  grn: ALL_CANDIDATES.filter((c) => c.party === 'grn'),
};

export function byParty(party, scenarioId = 'standard', opts = {}) {
  const includeLocked = Boolean(opts?.includeLocked);
  const profile = opts?.profile;
  const filterUnlocked = (list) => (includeLocked ? list : list.filter((c) => isCandidateUnlocked(c.id, profile)));
  const field = filterUnlocked(
    FIELD_BY_PARTY[party] || scenarioCandidateOptions(scenarioId).filter((candidate) => candidate.party === party)
  );
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
  return filterUnlocked([
    ...field.filter(({ id }) => !exclusive.has(id)),
    ...assigned.map((id) => ({ ...CANDIDATE_BY_ID[id], party })),
  ]);
}

const ABBR_BY_STATE_NAME = STATE_LIST.reduce((acc, s) => {
  acc[s.name] = s.abbr;
  return acc;
}, {});

// Every candidate file lists a home state by name; the map wants an abbreviation.
export function homeAbbr(candidate) {
  return ABBR_BY_STATE_NAME[candidate?.state] || 'DC';
}

