// The national desk: one hundred stories the country wakes up to.
//
// Nothing here is the player's choice. One card is dealt every week before the
// week's own card, and it moves the national environment — which is why the map
// moves even when the campaign does nothing right.
//
// Fields, in tuple order:
//   [id, desk, icon, headline, body, nat, opts]
//
//   nat  — immediate shift in the national environment, Democratic-minus-
//          Republican points. Positive helps the Democrats, negative helps the
//          Republicans. Small numbers, because the country is stubborn.
//   opts.gen      national generic-ballot shift (defaults to 1.6 × nat), spread
//                 across every state with a little local variation
//   opts.mom      momentum, for the stories that are about the campaign itself
//   opts.swing    the battlegrounds feel this one harder than the rest
//   opts.issue    an issue id from '@/data/platform' that gets louder where it lands
//   opts.states   specific states the story lands on
//   opts.arc      starts a running story ('slump', 'boom', 'inflation',
//                 'shutdown', 'war') that pays out again every week
//   opts.end      ends the running story with this id
//   opts.follow   the card that files next week, so the story carries on
//   opts.tone     the kind of week-card this story sets up (crisis, hope,
//                 scandal, chaos, wild, nation). No tone means the week's card is
//                 drawn with no idea what the news said.
//   opts.weight   how often it shows up in the draw (default 1)

import { extendBuild34NationalNewsCatalog } from './nationalNewsAdditions.js';
import { ISSUES } from './platform.js';

const round2 = (v) => Math.round(v * 100) / 100;

// Running stories. `perWeek` is the environment shift every week the story runs,
// written Democratic-plus: a contraction drags the Republicans down, an AI boom
// carries them.
export const NATIONAL_ARCS = {
  slump: {
    id: 'slump',
    label: 'The economy is contracting',
    weeks: 6,
    perWeek: 0.3,
    color: '#FDA4AF',
    note: 'Layoffs, missed payments, and a front page nobody wants to read. The party that owns Washington takes the blame every week it runs.',
    tone: 'crisis',
  },
  boom: {
    id: 'boom',
    label: 'The AI boom is lifting everything',
    weeks: 6,
    perWeek: -0.28,
    color: '#6EE7B7',
    note: 'Productivity, hiring, and a stock market with no ceiling. Every week it runs, the incumbent party gets a little more credit than it deserves.',
    tone: 'hope',
  },
  inflation: {
    id: 'inflation',
    label: 'Prices are climbing again',
    weeks: 5,
    perWeek: 0.22,
    color: '#FCD34D',
    note: 'Every grocery run is a campaign ad for the other side. It grinds the governing party down slowly.',
    tone: 'crisis',
  },
  shutdown: {
    id: 'shutdown',
    label: 'The government is shut down',
    weeks: 4,
    perWeek: 0.26,
    color: '#FDA4AF',
    note: 'Parks closed, paychecks frozen, and nobody in Washington looking competent. It costs the party in charge every week it lasts.',
    tone: 'crisis',
  },
  war: {
    id: 'war',
    label: 'The war scare grinds on',
    weeks: 5,
    perWeek: -0.2,
    color: '#93C5FD',
    note: 'A country at attention rallies around the flag, and around whoever it thinks is holding it.',
    tone: 'crisis',
  },
};

/** @type {Array<[string, string, string, string, string, number, Record<string, any>?]>} */
const RAW = [
  // ---------------------------------------------------------------- economy
  ['fed_cuts', 'Economy', 'data', 'The Fed cuts rates by half a point', 'Mortgage applications double in a week. Everybody with a credit card suddenly has an opinion about monetary policy, and none of them are about you.', -0.4, { issue: 'affordability', tone: 'hope' }],
  ['fed_hikes', 'Economy', 'data', 'The Fed raises rates again', 'The fourth hike this year lands on car loans and small businesses at the same time. The word "overreach" is doing a lot of work on the Sunday shows.', 0.45, { issue: 'affordability', tone: 'crisis' }],
  ['jobs_boom', 'Economy', 'tools', 'Hiring blows past every forecast', 'Two hundred and ninety thousand jobs, wages up, and a labor force that finally grew. Nobody in either party wants to be photographed frowning today.', -0.5, { issue: 'economy' }],
  ['jobs_miss', 'Economy', 'civic-building', 'The jobs report comes in badly wrong', 'Forty thousand jobs, all of them part-time, and revisions that make last quarter look worse than it did. The campaign is asked about it eleven times before noon.', 0.5, { issue: 'economy', tone: 'crisis' }],
  ['credit_seize', 'Economy', 'weather', 'A private credit fund stops letting people withdraw', 'Then a second one does. By Thursday the financial press is using the word "contagion," and every candidate is asked whether 2008 is happening again.', -0.55, { issue: 'economy', tone: 'crisis', follow: 'slump_confirmed' }],
  ['slump_confirmed', 'Economy', 'data', 'The economy contracts for the second straight quarter', 'It is a recession now, officially, with a press release and everything. The party that has been telling the country the fundamentals are strong has to explain the fundamentals.', -0.75, { issue: 'economy', tone: 'crisis', arc: 'slump' }],
  ['slump_deepens', 'Economy', 'brain', 'Layoffs accelerate across three industries', 'Retail, logistics, and — improbably — the consulting firms that advise the other two. The recession has a shape now, and the shape is bad.', -0.5, { issue: 'economy', tone: 'crisis' }],
  ['slump_eases', 'Economy', 'weather', 'The recession bottoms out', 'Two months of better data and one very relieved Federal Reserve. It is not recovery, exactly, but it is no longer freefall, and everyone stops talking about it.', 0.5, { issue: 'economy', end: 'slump', tone: 'hope' }],
  ['ai_boom_first', 'Economy', 'brain', 'An AI productivity report stuns economists', 'Output per worker jumped four percent in a quarter, and the models are not even good yet. Every boardroom in America is redrawing next year on a napkin.', -0.5, { issue: 'ai', follow: 'ai_boom_data' }],
  ['ai_boom_data', 'Economy', 'satellite', 'The AI boom shows up in the actual numbers', 'It is not a stock story anymore. Factories are running leaner, offices are hiring fewer people to do more, and growth is outrunning every forecast in Washington.', -0.65, { issue: 'ai', arc: 'boom', tone: 'hope' }],
  ['ai_bubble', 'Economy', 'mystery', 'The AI trade cracks', 'A trillion dollars of market value gone in nine days, and every datacenter ribbon-cutting photo suddenly looks like a warning. The boom story stops being told.', 0.5, { issue: 'ai', end: 'boom', tone: 'crisis' }],
  ['inflation_print', 'Economy', 'business', 'Inflation comes back at four and a half percent', 'The number is on the front page above the fold, with a photograph of a grocery receipt. Nobody has ever won an election explaining the base effect.', 0.4, { issue: 'prices', tone: 'crisis', arc: 'inflation' }],
  ['inflation_cools', 'Economy', 'plant', 'Inflation cools faster than anyone expected', 'Eggs, rent, and used cars all falling at once. The Fed president says the word "transitory" and immediately regrets it.', -0.4, { issue: 'prices', end: 'inflation' }],
  ['gas_drop', 'Economy', 'water', 'Gas falls under three dollars nationwide', 'The single most reliable number in American politics moves in the governing party\'s favour, and every strategist knows it.', -0.35, { issue: 'affordability', swing: true }],
  ['gas_spike', 'Economy', 'power', 'Gas jumps forty cents in a fortnight', 'Every pump in the country becomes a billboard for change. It does not matter why it happened, and nobody will remember why by November.', 0.4, { issue: 'affordability', swing: true, tone: 'crisis' }],
  ['rent_surge', 'Economy', 'civic-building', 'Rent rises nine percent in a single year', 'The fastest jump on record, concentrated in the twelve states that decide elections. It is, politically, the worst possible place for a number to be bad.', 0.35, { issue: 'rent', swing: true }],

  // ---------------------------------------------------------------- trade & labor
  ['tariff_court', 'Trade', 'justice', 'A court strikes down the tariffs', 'The ruling lands like a tax cut for importers and a headache for everyone who built a factory around the tariffs. Both campaigns claim vindication within the hour.', 0.3, { issue: 'tariffs' }],
  ['tariff_retaliation', 'Trade', 'transit', 'Three countries retaliate on American exports', 'Soybeans, bourbon, and motorcycles, which is to say Iowa, Kentucky, and Wisconsin. Somebody in a war room is crying and somebody else is booking a flight.', 0.4, { issue: 'tariffs', swing: true, tone: 'crisis' }],
  ['factory_returns', 'Trade', 'business', 'A shuttered plant reopens with federal money', 'Nine hundred jobs in a county that had written itself off. The ribbon is enormous and so is the flag behind it.', -0.5, { issue: 'economy', swing: true, tone: 'hope' }],
  ['port_strike', 'Labor', 'tools', 'The ports walk out', 'Container ships stack up off Long Beach and Savannah. Retailers warn about Christmas in October, and everybody learns what "chokepoint" means.', 0.4, { issue: 'prices', tone: 'crisis' }],
  ['union_win', 'Labor', 'community', 'A union wins a shocking election at a Southern plant', 'The first in that state in decades. It is a political story in every direction at once, and nobody knows who it helps.', 0, { issue: 'inequality' }],
  ['auto_layoffs', 'Labor', 'tools', 'Automakers cut twelve thousand white-collar jobs', 'The EV transition arrives as a spreadsheet, and the states that build cars read it very carefully.', 0.5, { issue: 'economy', swing: true }],

  // ---------------------------------------------------------------- washington
  ['shutdown_starts', 'Washington', 'shield', 'The government shuts down', 'No deal by midnight, eight hundred thousand people furloughed, and the Smithsonian closed in the middle of tourist season. Both sides say the other side did it, but voters seem to be blaming the democrats.', -0.5, { issue: 'economy', tone: 'crisis', arc: 'shutdown' }],
  ['shutdown_starts2', 'Washington', 'shield', 'The government shuts down', 'No deal by midnight, eight hundred thousand people furloughed, and the Smithsonian closed in the middle of tourist season. Both sides say the other side did it, but voters seem to be blaming the republicans.', -0.5, { issue: 'economy', tone: 'crisis', arc: 'shutdown' }],
  ['shutdown_deal', 'Washington', 'community', 'A shutdown deal lands at the last hour', 'Nine hours before airport security starts calling out sick. Nobody looks good, but only one party looks relieved.', -0.1, { issue: 'economy', end: 'shutdown', tone: 'hope' }],
  ['debt_downgrade', 'Washington', 'data', 'A ratings agency downgrades the United States', 'The second time in fifteen years, and this time the reason printed on the front page is "governance." Every incumbent in the country reads that word twice.', -1.5, { issue: 'economy', tone: 'crisis' }],
  ['debt_upgrade', 'Washington', 'data', 'A ratings agency upgrades the United States', 'The best economy news of the decade comes at a critical time in the campaign. Every republican in the country read the story and smiled.', -2.5, { issue: 'economy', tone: 'crisis' }],  
  ['budget_deal', 'Washington', 'data', 'A two-year budget passes easily', 'It is boring, it is funded, and nobody has to think about it again until after the election. Voters give the Democrats some credit from reigning Trump in. Boring is the point.', 0.25, { issue: 'economy' }],
  ['impeachment_hearing', 'Washington', 'justice', 'Impeachment hearings open in the House', 'Six weeks of television nobody can avoid, in the middle of a campaign. Every candidate is asked the same question and every answer is wrong.', 0.25, { issue: 'corruption', tone: 'chaos' }],
  ['impeachment_fails', 'Washington', 'justice', 'The impeachment article dies in committee', 'An overreaching impeachment threatens a repeat of 1998 as Trumps approval rating jumps by 5 points', -2, { issue: 'corruption' }],
  ['cabinet_quits', 'Washington', 'civic-building', 'A cabinet secretary resigns by tweet', 'Nine words, no warning, no successor. The department is now run by somebody whose name nobody knows.', -0.5, { tone: 'chaos' }],
  ['vice_leak', 'Washington', 'data', 'A leaked memo contradicts the White House', 'Two pages, one signature, and a week of questions about who wrote it. The official position changes twice before Thursday.', -0.5, { issue: 'corruption', tone: 'scandal' }],
  ['ice_law', 'Washington', 'shield', 'An anti-ice bill is signed into law', 'After more than a year of back and forth debating, congressional democrats and Trump have finally signed a deal limiting ICEs power. Voters are grateful to the dems, but losing the issue makes the campaign harder.', 0.5, { issue: 'immigration' }],

  // ---------------------------------------------------------------- courts
  ['scotus_affirm', 'Courts', 'justice', 'The Supreme Court uphold Objerfell Vs. Hayes', 'Six to three, with a dissent that reads like a campaign speech. Democratic fears die down, and the base relaxes. Good for policy - but bad for the election', -0.5, { tone: 'nation' }],
  ['scotus_strikes', 'Courts', 'justice', 'The Supreme Court overturns Objerfell Vs. Hayes', 'Democrats are up in arms as Gay Marriage is repealed across The United States. By the next morning, more than 100,000 new volunteers have joined the election', 2.5, { tone: 'nation' }],
  ['indictment', 'Courts', 'data', 'A federal grand jury indicts Steven Miller', 'The charges are complicated, and the photograph of the walk into the courthouse runs on every front page for a week.', 2, { issue: 'corruption', tone: 'scandal' }],
  ['state_suit', 'Courts', 'civic-building', 'Nineteen states sue the federal government', 'The complaint is three hundred pages and the press conference is eleven minutes. Voters see it as a cheap political stunt.', -0.5, { tone: 'nation' }],

  // ---------------------------------------------------------------- the world
  ['ceasefire', 'The World', 'weather', 'A ceasefire holds for a second week', 'The world starts to return to normal as aid convoys move, markets relax, and the story drops off the front page.', -0.5, { issue: 'israel', tone: 'hope' }],
  ['war_escalates', 'The World', 'mystery', 'The conflict expands overnight', 'Two new battlefronts opened up in the Iran War last night after Iranian air strikes hit american bases in Turkey and Southern Europe', 1, { issue: 'iran', tone: 'crisis', arc: 'war' }],
  ['war_ends', 'The World', 'ballot', 'A peace framework is signed', 'The iran war has ended! Trump and the Republicans are declaring victory, while Democrats are left wishing it had happened a few months later', -3, { issue: 'iran', end: 'war', tone: 'hope' }],
  ['hostages_home', 'The World', 'community', 'Hostages come home', '3 hostages finally return to their families after Trump negotiates a deal to get them home. The news runs the story all week.', -0.5, { tone: 'hope' }],
  ['cyberattack', 'The World', 'computer', 'A cyberattack takes down a payment network', 'Card readers fail for more than a day, causing a significant economic downturn. A communist group takes the credit, and republicans run with it.', -0.75, { tone: 'crisis' }],
  ['nato_flare', 'The World', 'shield', 'A NATO summit ends without a communique', 'The photograph of the empty chair is worth a thousand words and about two points of national anxiety.', 0.3, { tone: 'nation' }],
  ['trade_deal', 'The World', 'community', 'A Pacific trade deal is signed', 'Eleven countries, one signature, and a fight at home about what it does to a factory in Michigan.', -0.3, { issue: 'tariffs' }],
  ['border_surge', 'The World', 'community', 'Border crossings hit a record', 'The numbers are released on a Friday, the footage is released on a Sunday, and the issue becomes the only thing anybody in six states wants to talk about.', -0.5, { issue: 'immigration', swing: true, tone: 'crisis' }],
  ['border_deal', 'The World', 'shield', 'A border deal actually happens', 'Trump finally completes one of his earliest campaign promises, and signs an immigration deal with more than half a dozen latin american countries, getting, in his words, reparations for immigrants. Democrats are outraged, but the average voter appreciates the extra dollar in their pocket.', -1.5, { issue: 'immigration' }],

  // ---------------------------------------------------------------- technology
  ['rogue_ai', 'Technology', 'brain', 'A rogue AI starts writing its own press releases', 'An experimental model has endorsed a candidate, refused to be shut down, and gained forty million followers. Nobody in Washington agrees on anything except that they want a quote from you.', 3, { issue: 'ai', tone: 'chaos' }],
  ['ai_jobs_study', 'Technology', 'data', 'A study finds AI has eaten a million jobs', 'The methodology is contested. The chart is not, and the chart is what gets shared.', 2, { issue: 'ai', tone: 'crisis' }],
  ['deepfake', 'Technology', 'entertainment', 'A deepfake of Democratic Candidate goes Viral', 'A deepfake of the Democratic candidate saying a slur goes viral on tiktak. The platform takes nearly a week to remove it', -3, { issue: 'ai', mom: -4, tone: 'scandal' }],
  ['ai_layoffs', 'Technology', 'data', 'A major employer replaces its support desk with a model', 'Four thousand people, one announcement, no severance details. Every other company in the country watches the stock price reaction and takes notes.', 0.5, { issue: 'ai', tone: 'crisis' }],
  ['chip_fab', 'Technology', 'tools', 'A chip fab opens in the desert', 'Fourteen billion dollars, three thousand jobs, and a photograph with everybody in a hard hat and a borrowed smile.', -0.4, { issue: 'economy', tone: 'hope' }],
  ['data_breach', 'Technology', 'shield', 'A breach exposes forty million records', 'Names, addresses, and the last four digits. The company apologises in a font nobody has used since 2011.', 0.5, { tone: 'crisis' }],
  ['robotaxi_crash', 'Technology', 'transit', 'A robotaxi kills a pedestrian', 'The fleet is grounded in nine cities within a day. Every mayor who posed with one is now asked about the photograph.', 1, { issue: 'ai', tone: 'crisis' }],
  ['ai_cure', 'Technology', 'brain', 'An AI-designed drug clears a trial', 'A disease with a name most people cannot pronounce suddenly has a treatment and a five-year timeline. Trump is claiming victory, and the voters take note.', -1.5, { issue: 'health', tone: 'hope' }],
  // NEED TO ADJUST NEWS BELOW
  // ---------------------------------------------------------------- climate & disaster
  ['hurricane_landfall', 'Climate', 'weather', 'A Category Four makes landfall', 'Two million people without power, an insurance market in shock, and a governor who suddenly has a national profile whether or not they wanted one.', -0.3, { issue: 'energy', states: { FL: -0.4, GA: -0.2 }, tone: 'crisis' }],
  ['wildfire_season', 'Climate', 'power', 'Wildfires burn through the hills', 'The smoke reaches four states that are not on fire, and the photographs do not need captions.', -0.25, { issue: 'energy', states: { CA: -0.3, NV: -0.15 }, tone: 'crisis' }],
  ['grid_failure', 'Climate', 'tools', 'The grid fails across a third of the country', 'Nine days in the dark in some places. The hearings will outlast the campaign.', -0.35, { issue: 'energy', states: { TX: -0.4 }, tone: 'crisis' }],
  ['flood_midwest', 'Climate', 'water', 'Flooding takes out four bridges', 'The water goes down in a week. The detour does not.', -0.25, { issue: 'energy', tone: 'crisis' }],
  ['heat_dome', 'Climate', 'weather', 'A heat dome parks over the South', 'Nine days over a hundred, an emergency room surge, and a lot of conversations about air conditioning as a public utility.', -0.2, { issue: 'energy' }],
  ['bridge_collapse', 'Climate', 'civic-building', 'A bridge falls into a river', 'The inspection report had been sitting on a desk for two years. Every governor in the country orders a review the same afternoon.', -0.35, { issue: 'economy', tone: 'crisis' }],
  ['tornado_outbreak', 'Climate', 'weather', 'An outbreak flattens three towns', 'Forty-one tornadoes in two days, and a weather service that gave people fifty minutes of warning that saved hundreds of lives.', -0.25, { tone: 'crisis' }],
  ['climate_report', 'Climate', 'brain', 'A climate report lands with a bang', 'Two thousand pages, one graph, and a summary that fits on a single slide. It is worse and later than last time.', 0.25, { issue: 'energy' }],

  // ---------------------------------------------------------------- health
  ['virus_scare', 'Health', 'brain', 'A novel virus clusters in two cities', 'Nine cases, one hospital, and a public health agency that says the word "monitoring" eleven times in a briefing.', -0.45, { issue: 'health', tone: 'crisis' }],
  ['virus_scare_over', 'Health', 'brain', 'The virus cluster fizzles out', 'Forty-one cases, three weeks, no deaths. The country exhales and immediately returns to arguing about something else.', 0.4, { issue: 'health', tone: 'hope' }],
  ['vaccine_news', 'Health', 'health', 'A twenty-year vaccine programme pays off', 'One disease is functionally gone, and there is a photograph of a scientist who has been working on it since 2009 and cannot stop crying.', 0.4, { issue: 'health', tone: 'hope' }],
  ['hospital_fail', 'Health', 'health', 'A hospital chain declares bankruptcy', 'Nine hospitals closing in six states, most of them rural. Every one of them is in a county that will be counted on election night.', -0.3, { issue: 'health', swing: true }],
  ['drug_cap', 'Health', 'health', 'Drug price caps take effect', 'The receipts are real and they are small and everybody can see them at the pharmacy counter.', 0.4, { issue: 'health' }],
  ['cancer_news', 'Health', 'brain', 'A screening test cuts mortality by a third', 'The study is enormous and the effect is real, and by Thursday every candidate has a plan to make it free.', 0.3, { issue: 'health', tone: 'hope' }],

  // ---------------------------------------------------------------- culture
  ['sports_moment', 'Culture', 'award', 'A national team wins something enormous', 'Nobody agrees on the politics of it, everybody watches it, and for one weekend the country is not a 50-50 nation.', 0.1, {}],
  ['hollywood_strike', 'Culture', 'entertainment', 'The industry shuts down again', 'Production stops, the fall schedule evaporates, and every talk show goes to reruns three weeks before the election.', -0.15, {}],
  ['school_board', 'Culture', 'book', 'A school board fight goes national', 'A viral clip, a recall, and a curriculum argument that will be on ballots in nine states this November.', -0.1, { issue: 'trans', tone: 'wild' }],
  ['papal_visit', 'Culture', 'civic-building', 'The Pope visits four cities', 'Crowds, traffic, and one photograph of a candidate in the second row that their team will use for a month.', 0.15, { issue: 'abortion' }],
  ['celeb_endorsement', 'Culture', 'media', 'The biggest star in the country endorses you', 'Forty million followers, one video, and a surge of volunteer sign-ups that the field team cannot process by Monday.', 0.25, { issue: 'abortion', mom: 2, swing: true }],
  ['celeb_against', 'Culture', 'media', 'A beloved star endorses your opponent', 'The clip is warm, funny, and completely unanswerable. Your campaign spends two days deciding not to respond, then responds.', -0.25, { mom: -2, swing: true }],
  ['mega_church', 'Culture', 'weather', 'A megachurch pastor tells the congregation how to vote', 'Legally it is a grey area. Politically it is a very loud Sunday, in a state that will be decided by two points.', -0.15, { issue: 'abortion' }],
  ['time_capsule', 'Culture', 'data', 'A hundred-year-old time capsule is opened', 'A newspaper, a coin, a letter about a flood, and a very pleasant twenty minutes of national television in a bad news month.', 0.1, {}],
  ['lottery_winners', 'Culture', 'entertainment', 'A two-billion-dollar lottery ticket is claimed', 'A single ticket, in a town of nine hundred people, and a country that spends four days arguing about whether the winner should go public.', 0.05, {}],

  // ---------------------------------------------------------------- the campaign itself
  ['old_video', 'The Campaign', 'entertainment', 'An old video of you resurfaces', 'A cable access show, 2009, and an answer you gave about a topic that was not on anybody\'s radar the last time you were asked. It has been shared nine hundred thousand times since breakfast.', -0.45, { mom: -4, swing: true, tone: 'scandal' }],
  ['vp_gaffe', 'The Campaign', 'media', 'Your running mate says the quiet part into an open mic', 'Forty seconds, one word that cannot be unsaid, and a forty-eight-hour apology tour that starts in the state where it happened.', -0.5, { mom: -4, swing: true, tone: 'scandal' }],
  ['hot_mic', 'The Campaign', 'mystery', 'You are caught on a hot mic', 'You were supposed to be off the record, and the microphone disagreed. The clip is already scored to music on three platforms.', -0.4, { mom: -3, tone: 'scandal' }],
  ['leaked_memo', 'The Campaign', 'data', 'A campaign memo leaks', 'The intern wrote it, the manager signed off, and the sentence about "the base problem" is now a paid advertisement by somebody else.', -0.3, { mom: -2, tone: 'scandal' }],
  ['college_thesis', 'The Campaign', 'star', 'Somebody finds your college thesis', 'Ninety pages about a subject you have not thought about since, and a paragraph that the internet has decided is the whole thing.', -0.3, { mom: -3, tone: 'scandal' }],
  ['staffer_tweet', 'The Campaign', 'weather', 'A junior staffer\'s old posts get excavated', 'Nine years old, three screenshots, and a resignation letter filed by lunchtime. It is a small story that will not stop being a small story.', -0.25, { mom: -2, tone: 'scandal' }],
  ['aunt_facebook', 'The Campaign', 'community', 'A relative\'s Facebook post goes viral', 'She has four hundred friends and one very strong opinion about a policy you have never publicly supported. The screenshot is the story.', -0.2, { mom: -1, tone: 'wild' }],
  ['oppo_lands', 'The Campaign', 'data', 'A story lands on your opponent instead', 'A business deal from a decade ago, one very good reporter, and a press shop that goes quiet for three days.', 0.45, { mom: 2, swing: true, tone: 'scandal' }],
  ['oppo_duds', 'The Campaign', 'data', 'The oppo story dies on the launchpad', 'Four newsrooms looked at the document and three of them decided it was not a story. The fourth asked you about it instead.', -0.25, { mom: -2, tone: 'scandal' }],
  ['rally_clip', 'The Campaign', 'ballot', 'A rally clip breaks through', 'Nineteen seconds, a line you had delivered a hundred times, and a crowd that would not stop for four minutes. It is the best free media your campaign has had.', 0.3, { mom: 3, tone: 'hope' }],
  ['health_scare', 'The Campaign', 'health', 'The campaign pauses for a day', 'An unexplained hospital visit, two cancelled events, and a physician\'s note that answers three questions and raises six.', -0.35, { mom: -3, tone: 'crisis' }],
  ['hometown_paper', 'The Campaign', 'data', 'The hometown paper endorses you', 'Circulation eleven thousand, but every network leads with it for six hours because it is a warm story in a cold month.', 0.25, { mom: 2 }],
  ['vp_tour', 'The Campaign', 'transit', 'Your running mate tours their home region', 'Eleven counties, four days, and an unexpectedly good bus tour that nobody had scheduled as a national story.', 0.25, { swing: true, mom: 2 }],
  ['debate_snap', 'The Campaign', 'data', 'Snap polling says you won the night', 'Whatever actually happened on the stage, the number that gets quoted from now on belongs to you.', 0.35, { mom: 3, tone: 'hope' }],
  ['empty_chair', 'The Campaign', 'civic-building', 'Your opponent skips the forum', 'An empty chair on a stage in front of three hundred local reporters is a photograph that will outlive the week.', 0.3, { mom: 2, tone: 'wild' }],
  ['heckler', 'The Campaign', 'brain', 'A heckler gets the better of you', 'Four seconds of you blinking, cut into a nine-second clip, and a week of people asking whether you are tough enough.', -0.25, { mom: -2, tone: 'scandal' }],
  ['money_report', 'The Campaign', 'coin', 'Your campaign reports a monster fundraising quarter', 'Eighty-one million dollars and a donor list that makes the other side\'s finance chair stop taking calls.', 0.25, { mom: 2 }],
  ['money_report_them', 'The Campaign', 'coin', 'Your opponent reports a monster quarter', 'Their money story runs for three days and every panel explains what it means about enthusiasm.', -0.3, { mom: -2 }],
  ['long_lines', 'The Campaign', 'community', 'Early voting lines prompt complaints', 'Six hours in one county, forty minutes in another, and a fight about which counties get the resources that will last past November.', -0.15, { tone: 'crisis' }],
  ['third_party_surge', 'The Campaign', 'ballot', 'A third-party ticket qualifies in all fifty states', 'Ballot access, a debate-stage threat, and a polling number that both major parties insist is not real.', -0.2, { tone: 'wild' }],
  ['staff_shakeup', 'The Campaign', 'data', 'You replace your campaign manager', 'A four-month plan abandoned in October, and a statement that uses the word "restructure" four times.', -0.3, { mom: -3, tone: 'scandal' }],
  ['endorsement_surprise', 'The Campaign', 'community', 'A former rival endorses you', 'The person who said the worst things about you in the spring now says the warmest things about you in the fall. Nobody is surprised and everybody covers it.', 0.3, { mom: 2 }],
  ['candidate_gaffe', 'The Campaign', 'shield', 'You answer a question you should have deflected', 'It was a fair question, you had a plan for it, and the plan did not survive contact with a live audience.', -0.4, { mom: -4, swing: true, tone: 'scandal' }],
];

const BASE_NATIONAL_CARDS = RAW.map(([id, desk, icon, headline, body, nat, opts = {}]) => ({
  id,
  desk,
  icon,
  headline,
  body,
  nat,
  gen: opts.gen ?? round2(nat * 1.6),
  mom: opts.mom || 0,
  swing: !!opts.swing,
  issue: opts.issue || null,
  states: opts.states || null,
  arc: opts.arc || null,
  end: opts.end || null,
  follow: opts.follow || null,
  tone: opts.tone || null,
  weight: opts.weight ?? 1,
}));

export const NATIONAL_CARDS = extendBuild34NationalNewsCatalog(BASE_NATIONAL_CARDS, {
  incumbentParty: 'rep',
  validIssueIds: ISSUES.map((issue) => issue.id),
});

export const CARD_BY_ID = NATIONAL_CARDS.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {});
