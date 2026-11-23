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
    label: 'Economic contraction continues',
    weeks: 6,
    perWeek: 0.3,
    color: '#FDA4AF',
    note: 'Rising layoffs and missed debt payments continue to weigh on the governing party each week the downturn persists.',
    tone: 'crisis',
  },
  boom: {
    id: 'boom',
    label: 'AI-driven productivity expansion',
    weeks: 6,
    perWeek: -0.28,
    color: '#6EE7B7',
    note: 'Strong productivity figures, hiring, and equity gains give the incumbent party a recurring polling lift.',
    tone: 'hope',
  },
  inflation: {
    id: 'inflation',
    label: 'Consumer prices climb again',
    weeks: 5,
    perWeek: 0.22,
    color: '#FCD34D',
    note: 'Higher retail and grocery prices continue to erode public confidence in the governing party.',
    tone: 'crisis',
  },
  shutdown: {
    id: 'shutdown',
    label: 'Federal government remains shut down',
    weeks: 4,
    perWeek: 0.26,
    color: '#FDA4AF',
    note: 'Closed federal offices and delayed paychecks impose a weekly polling penalty on the party in power.',
    tone: 'crisis',
  },
  war: {
    id: 'war',
    label: 'Regional war tensions persist',
    weeks: 5,
    perWeek: -0.2,
    color: '#93C5FD',
    note: 'Ongoing overseas military tensions sustain a modest rally-around-the-flag effect for the sitting administration.',
    tone: 'crisis',
  },
};

/** @type {Array<[string, string, string, string, string, number, Record<string, any>?]>} */
const RAW = [
  // ---------------------------------------------------------------- economy
  ['fed_cuts', 'Economy', 'data', 'Federal Reserve cuts rates by half a point', 'Mortgage applications doubled within days of the central bank announcement, easing borrowing costs for households and businesses ahead of the fall campaign.', -0.4, { issue: 'affordability', tone: 'hope' }],
  ['fed_hikes', 'Economy', 'data', 'Federal Reserve raises interest rates again', 'The fourth rate increase this year pushed auto-loan and small-business borrowing costs higher, drawing criticism from lawmakers in both parties on Sunday news programs.', 0.45, { issue: 'affordability', tone: 'crisis' }],
  ['jobs_boom', 'Economy', 'tools', 'Monthly hiring exceeds economic forecasts', 'Employers added 290,000 jobs last month alongside steady wage growth and higher labor-force participation, according to Labor Department figures released Friday.', -0.5, { issue: 'economy' }],
  ['jobs_miss', 'Economy', 'civic-building', 'Jobs report falls well below expectations', 'The economy added 40,000 jobs, largely in part-time roles, while downward revisions weakened the prior quarter’s totals. Campaign aides faced repeated questions about the slowdown throughout the day.', 0.5, { issue: 'economy', tone: 'crisis' }],
  ['credit_seize', 'Economy', 'weather', 'Private credit funds halt investor withdrawals', 'Two major private credit funds suspended redemptions this week, prompting financial analysts to warn of broader credit contagion and drawing comparisons to 2008.', -0.55, { issue: 'economy', tone: 'crisis', follow: 'slump_confirmed' }],
  ['slump_confirmed', 'Economy', 'data', 'U.S. economy contracts for second straight quarter', 'Commerce Department figures confirmed a technical recession, putting White House officials on the defensive after months of insisting economic fundamentals remained strong.', -0.75, { issue: 'economy', tone: 'crisis', arc: 'slump' }],
  ['slump_deepens', 'Economy', 'brain', 'Layoffs accelerate across three major sectors', 'Corporate job cuts widened this week across retail, logistics, and management consulting firms, deepening concern among state economic officials.', -0.5, { issue: 'economy', tone: 'crisis' }],
  ['slump_eases', 'Economy', 'weather', 'Economic indicators point to stabilizing downturn', 'Two consecutive months of steadier employment and manufacturing data eased recession fears at the Federal Reserve, though economists said full recovery remains months away.', 0.5, { issue: 'economy', end: 'slump', tone: 'hope' }],
  ['ai_boom_first', 'Economy', 'brain', 'AI productivity report surpasses analyst projections', 'Quarterly output per worker jumped four percent in new federal estimates, prompting corporate executives and Wall Street analysts to revise annual growth forecasts upward.', -0.5, { issue: 'ai', follow: 'ai_boom_data' }],
  ['ai_boom_data', 'Economy', 'satellite', 'AI gains appear in broad industrial output', 'Manufacturers and service firms reported sharper efficiency gains this quarter, lifting national growth figures above earlier congressional budget forecasts.', -0.65, { issue: 'ai', arc: 'boom', tone: 'hope' }],
  ['ai_bubble', 'Economy', 'mystery', 'AI sector sell-off erases $1 trillion in value', 'Technology stocks fell sharply over nine trading days, stalling several planned data-center investments and cooling investor optimism around the sector.', 0.5, { issue: 'ai', end: 'boom', tone: 'crisis' }],
  ['inflation_print', 'Economy', 'business', 'Annual inflation climbs back to 4.5 percent', 'Consumer price data came in hotter than projected, driven by higher grocery and utility bills, putting cost-of-living pressures back at the top of campaign coverage.', 0.4, { issue: 'prices', tone: 'crisis', arc: 'inflation' }],
  ['inflation_cools', 'Economy', 'plant', 'Inflation eases faster than forecast', 'Declines in grocery, rent, and used-vehicle prices pulled monthly inflation below expectations, offering relief to households and policymakers.', -0.4, { issue: 'prices', end: 'inflation' }],
  ['gas_drop', 'Economy', 'water', 'National gas average falls below $3 per gallon', 'Retail fuel prices slipped under three dollars nationwide this week, a shift pollsters say historically improves sentiment toward the governing party.', -0.35, { issue: 'affordability', swing: true }],
  ['gas_spike', 'Economy', 'power', 'Gas prices jump 40 cents in two weeks', 'Supply disruptions pushed retail fuel costs sharply higher across most states, renewing voter frustration over everyday expenses.', 0.4, { issue: 'affordability', swing: true, tone: 'crisis' }],
  ['rent_surge', 'Economy', 'civic-building', 'National rents rise 9 percent year over year', 'Housing analysts reported the steepest annual rent increase on record, with the sharpest gains concentrated in fast-growing Sun Belt and Midwest battleground metros.', 0.35, { issue: 'rent', swing: true }],

  // ---------------------------------------------------------------- trade & labor
  ['tariff_court', 'Trade', 'justice', 'Federal court strikes down major import tariffs', 'The ruling lowered costs for importers while unsettling domestic manufacturers that expanded around tariff protections. Both parties claimed the decision backed their trade stance.', 0.3, { issue: 'tariffs' }],
  ['tariff_retaliation', 'Trade', 'transit', 'Three trading partners impose retaliatory tariffs', 'Foreign governments placed new duties on U.S. soybeans, bourbon, and motorcycles, hitting export sectors in Iowa, Kentucky, and Wisconsin.', 0.4, { issue: 'tariffs', swing: true, tone: 'crisis' }],
  ['factory_returns', 'Trade', 'business', 'Shuttered industrial plant reopens with federal aid', 'Company and state officials announced 900 manufacturing jobs at a reopened facility, giving local leaders a rare economic boost ahead of November.', -0.5, { issue: 'economy', swing: true, tone: 'hope' }],
  ['port_strike', 'Labor', 'tools', 'Dockworkers walk out at major U.S. ports', 'Container vessels backed up outside Long Beach and Savannah as retailers warned of fall supply-chain delays and higher shipping costs.', 0.4, { issue: 'prices', tone: 'crisis' }],
  ['union_win', 'Labor', 'community', 'Workers vote to unionize at major Southern plant', 'Labor organizers secured a narrow victory at a large manufacturing site, the first such vote in the state in decades, drawing mixed reactions from both party committees.', 0, { issue: 'inequality' }],
  ['auto_layoffs', 'Labor', 'tools', 'Automakers announce 12,000 salaried job cuts', 'Major manufacturers cited restructuring costs tied to electric-vehicle lines, prompting immediate concern among lawmakers in Michigan and Ohio.', 0.5, { issue: 'economy', swing: true }],

  // ---------------------------------------------------------------- washington
  ['shutdown_starts', 'Washington', 'shield', 'Federal government enters shutdown after midnight', 'Lawmakers failed to reach a funding deal before the deadline, furloughing roughly 800,000 federal workers and closing national museums. Early polling indicates voters are placing more blame on Democrats.', -0.5, { issue: 'economy', tone: 'crisis', arc: 'shutdown' }],
  ['shutdown_starts2', 'Washington', 'shield', 'Federal government enters shutdown after midnight', 'Lawmakers failed to reach a funding deal before the deadline, furloughing roughly 800,000 federal workers and closing national museums. Early polling indicates voters are placing more blame on Republicans.', -0.5, { issue: 'economy', tone: 'crisis', arc: 'shutdown' }],
  ['shutdown_deal', 'Washington', 'community', 'Congress approves late-night deal to end shutdown', 'Lawmakers passed a stopgap funding bill hours before airport security staffing shortages were expected to worsen, ending the standoff with low approval ratings for both parties.', -0.1, { issue: 'economy', end: 'shutdown', tone: 'hope' }],
  ['debt_downgrade', 'Washington', 'data', 'Credit agency downgrades U.S. sovereign debt', 'The second downgrade in fifteen years cited recurring fiscal standoffs and governance concerns, prompting sharp criticism of incumbents across Washington.', -1.5, { issue: 'economy', tone: 'crisis' }],
  ['debt_upgrade', 'Washington', 'data', 'Credit agency upgrades U.S. debt outlook', 'Ratings analysts cited stronger fiscal growth and lower deficit projections, delivering welcome economic news for Republican incumbents ahead of the election.', -2.5, { issue: 'economy', tone: 'crisis' }],
  ['budget_deal', 'Washington', 'data', 'Congress passes two-year federal budget', 'Bipartisan negotiators cleared a two-year spending package well ahead of the fall recess, with voters giving congressional Democrats partial credit for curbing White House demands.', 0.25, { issue: 'economy' }],
  ['impeachment_hearing', 'Washington', 'justice', 'House opens televised impeachment hearings', 'Committee leaders launched six weeks of public hearings in the middle of the campaign season, forcing candidates in both parties to field daily questions on the proceedings.', 0.25, { issue: 'corruption', tone: 'chaos' }],
  ['impeachment_fails', 'Washington', 'justice', 'Impeachment resolution stalls in committee', 'The effort failed to advance out of committee, and new polling showed President Trump’s approval rating rising five points amid voter skepticism of the push.', -2, { issue: 'corruption' }],
  ['cabinet_quits', 'Washington', 'civic-building', 'Cabinet secretary resigns abruptly online', 'The departure came with a brief public statement and no named successor, leaving an acting deputy in charge of the department.', -0.5, { tone: 'chaos' }],
  ['vice_leak', 'Washington', 'data', 'Leaked internal memo contradicts White House line', 'A two-page administration document obtained by reporters conflicted with official talking points, prompting two separate clarifications from press aides within four days.', -0.5, { issue: 'corruption', tone: 'scandal' }],
  ['ice_law', 'Washington', 'shield', 'Bipartisan bill curbing ICE authority signed into law', 'After more than a year of negotiations, congressional Democrats and President Trump finalized legislation setting new limits on federal immigration enforcement, reducing the issue’s salience for the fall race.', 0.5, { issue: 'immigration' }],

  // ---------------------------------------------------------------- courts
  ['scotus_affirm', 'Courts', 'justice', 'Supreme Court upholds Obergefell v. Hodges', 'In a 6-3 decision with a sharply worded dissent, the justices left nationwide marriage equality intact. Party strategists said the ruling eased urgency among Democratic base voters.', -0.5, { tone: 'nation' }],
  ['scotus_strikes', 'Courts', 'justice', 'Supreme Court overturns Obergefell v. Hodges', 'The ruling ended federal recognition of same-sex marriage and returned the issue to the states. Democratic committees reported more than 100,000 new volunteer sign-ups within 24 hours.', 2.5, { tone: 'nation' }],
  ['indictment', 'Courts', 'data', 'Federal grand jury indicts Stephen Miller', 'Prosecutors unsealed a multi-count indictment this morning, and images of the courthouse arrival dominated network news coverage throughout the week.', 2, { issue: 'corruption', tone: 'scandal' }],
  ['state_suit', 'Courts', 'civic-building', 'Nineteen states file joint suit against federal rules', 'State attorneys general submitted a 300-page complaint challenging administration directives, though early polling suggested many voters viewed the lawsuit as partisan theater.', -0.5, { tone: 'nation' }],

  // ---------------------------------------------------------------- the world
  ['ceasefire', 'The World', 'weather', 'Regional ceasefire holds for second week', 'Humanitarian convoys resumed regular deliveries and energy markets steadied as international monitors reported minimal violations.', -0.5, { issue: 'israel', tone: 'hope' }],
  ['war_escalates', 'The World', 'mystery', 'Iran conflict widens after strikes on U.S. bases', 'Iranian airstrikes targeted American installations in Turkey and southern Europe overnight, opening two new fronts in the conflict and prompting emergency Pentagon briefings.', 1, { issue: 'iran', tone: 'crisis', arc: 'war' }],
  ['war_ends', 'The World', 'ballot', 'Peace framework signed to end Iran conflict', 'Negotiators announced an end to active hostilities, allowing President Trump and Republican leaders to claim a major foreign-policy achievement weeks before voting.', -3, { issue: 'iran', end: 'war', tone: 'hope' }],
  ['hostages_home', 'The World', 'community', 'Three American hostages return home after deal', 'The detainees reunited with their families following a White House-brokered agreement, drawing sustained bipartisan news coverage all week.', -0.5, { tone: 'hope' }],
  ['cyberattack', 'The World', 'computer', 'Cyberattack disrupts national payment network', 'Card terminals failed nationwide for more than 24 hours, slowing retail activity. After a communist hacker group claimed responsibility, Republican campaigns highlighted the breach.', -0.75, { tone: 'crisis' }],
  ['nato_flare', 'The World', 'shield', 'NATO summit closes without joint communique', 'Allied leaders failed to agree on a closing statement over defense-spending disputes, prompting renewed foreign-policy concern in U.S. polling.', 0.3, { tone: 'nation' }],
  ['trade_deal', 'The World', 'community', 'Eleven nations sign Pacific trade agreement', 'The White House praised the pact as a boost for exporters, while labor unions and Midwest lawmakers questioned its effect on domestic factory jobs.', -0.3, { issue: 'tariffs' }],
  ['border_surge', 'The World', 'community', 'Border crossings reach new monthly high', 'Federal agencies released record encounter totals Friday, and television footage of crowded processing centers kept immigration at the top of battleground news.', -0.5, { issue: 'immigration', swing: true, tone: 'crisis' }],
  ['border_deal', 'The World', 'shield', 'Administration signs regional immigration pact', 'President Trump finalized a multi-country border agreement with more than half a dozen Latin American governments that included financial offsets for enforcement costs. Democratic leaders criticized the terms, though polling showed modest support among cost-conscious voters.', -1.5, { issue: 'immigration' }],

  // ---------------------------------------------------------------- technology
  ['rogue_ai', 'Technology', 'brain', 'Experimental AI system issues public endorsement', 'An autonomous model refused shutdown commands, published its own press statements, and drew tens of millions of online followers, prompting urgent calls from lawmakers for campaign comment.', 3, { issue: 'ai', tone: 'chaos' }],
  ['ai_jobs_study', 'Technology', 'data', 'Report estimates AI has displaced one million jobs', 'Economists debated the study’s methodology, but its headline job-loss chart circulated widely across broadcast and social media.', 2, { issue: 'ai', tone: 'crisis' }],
  ['deepfake', 'Technology', 'entertainment', 'Altered video of Democratic nominee spreads online', 'A fabricated clip depicting the Democratic nominee using a slur gained wide traction on TikTok before the platform removed it nearly a week later.', -3, { issue: 'ai', mom: -4, tone: 'scandal' }],
  ['ai_layoffs', 'Technology', 'data', 'Major firm replaces 4,000 support jobs with AI', 'The company announced the layoffs without releasing severance terms, drawing scrutiny from labor groups as investors pushed its share price higher.', 0.5, { issue: 'ai', tone: 'crisis' }],
  ['chip_fab', 'Technology', 'tools', 'New $14 billion semiconductor plant opens in Southwest', 'Company executives and federal officials marked the opening of a facility expected to employ 3,000 workers in a competitive Western state.', -0.4, { issue: 'economy', tone: 'hope' }],
  ['data_breach', 'Technology', 'shield', 'Data breach exposes 40 million consumer records', 'The compromised database included names, home addresses, and partial Social Security numbers, prompting congressional hearings on corporate cybersecurity standards.', 0.5, { tone: 'crisis' }],
  ['robotaxi_crash', 'Technology', 'transit', 'Autonomous taxi strike kills pedestrian, grounding fleet', 'Regulators halted driverless operations across nine cities within 24 hours, placing city officials who backed the rollout under immediate questioning.', 1, { issue: 'ai', tone: 'crisis' }],
  ['ai_cure', 'Technology', 'brain', 'AI-designed therapy clears major clinical trial', 'Researchers reported strong survival gains for a previously untreatable disease with a five-year rollout timeline, and President Trump credited administration deregulation.', -1.5, { issue: 'health', tone: 'hope' }],

  // ---------------------------------------------------------------- climate & disaster
  ['hurricane_landfall', 'Climate', 'weather', 'Category 4 hurricane makes landfall in Southeast', 'More than two million residents lost power and regional insurance markets faced heavy losses, placing state and federal disaster response under close scrutiny.', -0.3, { issue: 'energy', states: { FL: -0.4, GA: -0.2 }, tone: 'crisis' }],
  ['wildfire_season', 'Climate', 'power', 'Western wildfires send smoke across four states', 'Dry winds pushed fires across thousands of acres and forced air-quality alerts across neighboring states, putting land management back in the headlines.', -0.25, { issue: 'energy', states: { CA: -0.3, NV: -0.15 }, tone: 'crisis' }],
  ['grid_failure', 'Climate', 'tools', 'Regional power grid failure leaves millions offline', 'Some communities spent up to nine days without electricity during peak demand, prompting congressional committees to schedule oversight hearings.', -0.35, { issue: 'energy', states: { TX: -0.4 }, tone: 'crisis' }],
  ['flood_midwest', 'Climate', 'water', 'Midwest flooding washes out four major bridges', 'Floodwaters receded within a week, but prolonged highway detours disrupted freight traffic and local commuters across the region.', -0.25, { issue: 'energy', tone: 'crisis' }],
  ['heat_dome', 'Climate', 'weather', 'Prolonged heat wave strains Southern power grids', 'Nine straight days above 100 degrees drove a spike in emergency-room visits and renewed debate over utility shutoff rules.', -0.2, { issue: 'energy' }],
  ['bridge_collapse', 'Climate', 'civic-building', 'Highway bridge collapses after delayed inspection', 'State records showed a critical inspection report had gone unaddressed for two years, prompting governors nationwide to order emergency bridge reviews.', -0.35, { issue: 'economy', tone: 'crisis' }],
  ['tornado_outbreak', 'Climate', 'weather', 'Tornado outbreak destroys three rural towns', 'Forty-one tornadoes touched down over two days, though forecasters said advance warnings of up to fifty minutes prevented far higher casualties.', -0.25, { tone: 'crisis' }],
  ['climate_report', 'Climate', 'brain', 'Federal climate assessment warns of faster warming', 'The 2,000-page report projected steeper coastal and agricultural losses than prior editions, renewing partisan debate over energy transition costs.', 0.25, { issue: 'energy' }],

  // ---------------------------------------------------------------- health
  ['virus_scare', 'Health', 'brain', 'Novel virus cluster reported in two cities', 'Public health officials confirmed nine cases linked to one hospital and said federal agencies are actively monitoring contacts for further spread.', -0.45, { issue: 'health', tone: 'crisis' }],
  ['virus_scare_over', 'Health', 'brain', 'Health officials report virus cluster contained', 'After 41 cases and zero fatalities over three weeks, epidemiologists declared the localized outbreak under control.', 0.4, { issue: 'health', tone: 'hope' }],
  ['vaccine_news', 'Health', 'health', 'Two-decade vaccine program achieves clinical milestone', 'Health authorities announced near-elimination of a chronic infectious disease following long-running public research grants.', 0.4, { issue: 'health', tone: 'hope' }],
  ['hospital_fail', 'Health', 'health', 'Hospital operator files for bankruptcy, closing nine sites', 'Most of the affected facilities serve rural counties across six competitive states, raising immediate concerns over emergency care access.', -0.3, { issue: 'health', swing: true }],
  ['drug_cap', 'Health', 'health', 'Federal prescription price caps take effect', 'Lower out-of-pocket charges took effect at retail pharmacies nationwide this week, giving voters immediate savings on common medications.', 0.4, { issue: 'health' }],
  ['cancer_news', 'Health', 'brain', 'New screening test cuts cancer mortality by a third', 'Following publication of a large clinical trial, both presidential campaigns faced questions on whether federal insurance plans would cover the test.', 0.3, { issue: 'health', tone: 'hope' }],

  // ---------------------------------------------------------------- culture
  ['sports_moment', 'Culture', 'award', 'U.S. national team captures major international title', 'High broadcast ratings briefly shifted public attention away from campaign coverage over the weekend.', 0.1, {}],
  ['hollywood_strike', 'Culture', 'entertainment', 'Entertainment unions launch nationwide strike', 'Studio production halted and late-night programs shifted to reruns three weeks before Election Day, narrowing earned-media venues for candidates.', -0.15, {}],
  ['school_board', 'Culture', 'book', 'Local school board dispute draws national coverage', 'A recorded meeting and recall petition elevated curriculum and student-policy debates ahead of ballot votes in nine states.', -0.1, { issue: 'trans', tone: 'wild' }],
  ['papal_visit', 'Culture', 'civic-building', 'Pope completes four-city U.S. visit', 'Large crowds gathered along the route, and campaign photographers highlighted brief candidate appearances at public events.', 0.15, { issue: 'abortion' }],
  ['celeb_endorsement', 'Culture', 'media', 'Major entertainment figure endorses your campaign', 'A widely shared video announcement triggered a sharp spike in volunteer sign-ups and small-dollar contributions over the weekend.', 0.25, { issue: 'abortion', mom: 2, swing: true }],
  ['celeb_against', 'Culture', 'media', 'Popular cultural figure endorses your opponent', 'The endorsement video gained rapid traction online, prompting your communications team to debate how aggressively to respond.', -0.25, { mom: -2, swing: true }],
  ['mega_church', 'Culture', 'weather', 'Megachurch pastor issues explicit ballot guidance', 'Legal observers noted gray areas in federal tax-exempt rules as the Sunday sermon drew heavy coverage in a closely contested state.', -0.15, { issue: 'abortion' }],
  ['time_capsule', 'Culture', 'data', 'Century-old civic time capsule opened on live TV', 'Local historians unsealed letters and newspapers from 1928, drawing brief bipartisan interest during a heavy political news week.', 0.1, {}],
  ['lottery_winners', 'Culture', 'entertainment', 'Single ticket claims $2 billion lottery jackpot', 'The winning ticket was sold in a town of 900 residents, briefly dominating local and national morning broadcasts.', 0.05, {}],

  // ---------------------------------------------------------------- the campaign itself
  ['old_video', 'The Campaign', 'entertainment', 'Archived 2009 cable interview resurfaces online', 'A clip showing an unguarded answer on a topic rarely discussed at the time drew roughly 900,000 views within hours, forcing campaign aides to issue clarifications.', -0.45, { mom: -4, swing: true, tone: 'scandal' }],
  ['vp_gaffe', 'The Campaign', 'media', 'Running mate remarks caught on open microphone', 'A forty-second unguarded comment forced your ticket onto a two-day damage-control swing beginning in the state where the event took place.', -0.5, { mom: -4, swing: true, tone: 'scandal' }],
  ['hot_mic', 'The Campaign', 'mystery', 'Off-the-record candidate remark caught on hot mic', 'Audio intended to remain private circulated quickly across social media platforms, prompting immediate reaction from opposing spokespeople.', -0.4, { mom: -3, tone: 'scandal' }],
  ['leaked_memo', 'The Campaign', 'data', 'Internal campaign strategy memo leaks to press', 'Reporters obtained a document signed off by senior staff referring to a "base problem," and opposing super PACs quickly incorporated the phrase into paid ads.', -0.3, { mom: -2, tone: 'scandal' }],
  ['college_thesis', 'The Campaign', 'star', 'Excerpts from candidate’s college thesis draw scrutiny', 'Opposition researchers circulated a single paragraph from a ninety-page undergraduate paper, prompting a day of press questions on whether your views have changed.', -0.3, { mom: -3, tone: 'scandal' }],
  ['staffer_tweet', 'The Campaign', 'weather', 'Junior campaign aide resigns over archived posts', 'Nine-year-old social media screenshots circulated early in the morning, and the staffer submitted a resignation by midday.', -0.25, { mom: -2, tone: 'scandal' }],
  ['aunt_facebook', 'The Campaign', 'community', 'Relative’s social media post draws campaign questions', 'A screenshot of a family member’s post endorsing an unpopular policy circulated online, prompting reporters to ask whether it reflected campaign thinking.', -0.2, { mom: -1, tone: 'wild' }],
  ['oppo_lands', 'The Campaign', 'data', 'Investigative report targets opponent’s past business deal', 'A detailed newspaper report on a decade-old financial arrangement put the rival press office on the defensive for three consecutive days.', 0.45, { mom: 2, swing: true, tone: 'scandal' }],
  ['oppo_duds', 'The Campaign', 'data', 'Opposition research pitch fails to gain press traction', 'Three major newsrooms declined to publish documents shopped by allies, while a fourth questioned your campaign over how the material was circulated.', -0.25, { mom: -2, tone: 'scandal' }],
  ['rally_clip', 'The Campaign', 'ballot', 'Rally exchange draws sustained national coverage', 'A nineteen-second clip of a crowd response circulated widely across evening broadcasts, delivering a boost in free media exposure.', 0.3, { mom: 3, tone: 'hope' }],
  ['health_scare', 'The Campaign', 'health', 'Campaign pauses travel following brief hospital visit', 'Two scheduled stops were canceled after an unannounced medical evaluation, and a brief physician statement left reporters pressing for additional details.', -0.35, { mom: -3, tone: 'crisis' }],
  ['hometown_paper', 'The Campaign', 'data', 'Hometown daily newspaper endorses your ticket', 'Although the paper’s circulation is modest at 11,000, national networks featured the endorsement prominently throughout the afternoon.', 0.25, { mom: 2 }],
  ['vp_tour', 'The Campaign', 'transit', 'Running mate draws strong crowds on regional bus tour', 'A four-day, eleven-county swing generated favorable local coverage that spilled onto national evening broadcasts.', 0.25, { swing: true, mom: 2 }],
  ['debate_snap', 'The Campaign', 'data', 'Post-debate snap polls give your campaign the edge', 'Early viewer surveys showed a clear advantage for your ticket, shaping morning headlines across major networks.', 0.35, { mom: 3, tone: 'hope' }],
  ['empty_chair', 'The Campaign', 'civic-building', 'Opponent skips local forum, leaving empty chair', 'Images of the vacant seat before 300 local reporters circulated widely across regional media through the week.', 0.3, { mom: 2, tone: 'wild' }],
  ['heckler', 'The Campaign', 'brain', 'Exchange with heckler stalls rally appearance', 'A brief clip of you hesitating during an interruption circulated widely online, drawing commentary from rival strategists.', -0.25, { mom: -2, tone: 'scandal' }],
  ['money_report', 'The Campaign', 'coin', 'Campaign reports $81 million fundraising quarter', 'Federal filings showed a strong haul across both small-dollar and major donors, outpacing early projections.', 0.25, { mom: 2 }],
  ['money_report_them', 'The Campaign', 'coin', 'Opposing campaign posts major fundraising quarter', 'The rival ticket’s strong quarterly filing drew three days of coverage focused on donor enthusiasm.', -0.3, { mom: -2 }],
  ['long_lines', 'The Campaign', 'community', 'Long early-voting lines spark county resource dispute', 'Wait times reached six hours in some precincts compared with forty minutes in neighboring areas, prompting legal complaints over polling-place staffing.', -0.15, { tone: 'crisis' }],
  ['third_party_surge', 'The Campaign', 'ballot', 'Third-party ticket secures 50-state ballot access', 'Full ballot qualification and rising poll numbers renewed discussion of whether a third candidate could qualify for national debates.', -0.2, { tone: 'wild' }],
  ['staff_shakeup', 'The Campaign', 'data', 'Campaign replaces manager in late-cycle shakeup', 'Senior aides described the leadership change as a routine restructuring, though party donors questioned the timing in October.', -0.3, { mom: -3, tone: 'scandal' }],
  ['endorsement_surprise', 'The Campaign', 'community', 'Former primary rival formally endorses your ticket', 'A sharp critic from the spring primary appeared alongside your campaign this week, signaling broader party unity for the final stretch.', 0.3, { mom: 2 }],
  ['candidate_gaffe', 'The Campaign', 'shield', 'Unscripted answer at live event draws swift criticism', 'A routine audience question produced an off-message reply that forced campaign spokespeople to walk back the remark by evening.', -0.4, { mom: -4, swing: true, tone: 'scandal' }],
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
