import { CANDIDATE_BY_ID } from '@/data/candidates';
import { CHOICE_EVENTS, EVENTS } from '@/data/events';
import { mainGameEventCatalog } from '@/lib/endorsementRemoval.mjs';
import { STATE_BY_ABBR } from '@/data/states';
import { factionStandings, factionsFor } from '@/lib/factions';
import { nationalNewsCard } from '@/lib/nationalNews';
import { worldNewsIn } from '@/lib/worldNews';
import { adjustCorruptionStoryWeight } from '@/lib/candidateReputationRules';

const TOPIC_PATTERNS = {
  economy: /\b(econom(?:y|ic)|inflation|recession|market|credit|budget|tax(?:es|payer)?|business(?:es)?|factory|plant|manufactur\w*|job(?:s)?|layoffs?|wages?|tariffs?|trade|imports?|exports?|supply chain|payroll|small business)\b/i,
  prices: /\b(prices?|cost of living|cost-of-living|grocery|groceries|gasoline|gas prices|rent|renters?|affordability|price goug\w*)\b/i,
  jobs: /\b(job(?:s)?|employment|layoffs?|unemployment|workforce|hiring|payroll)\b/i,
  trade: /\b(trade|tariffs?|imports?|exports?|supply chain)\b/i,
  labor: /\b(labor|labour|union|unions|strike|striking|workers?|workplace|collective bargaining|picket|wages?)\b/i,
  energy: /\b(energy|gas prices|gasoline|oil|power grid|electricity|blackout|utility|utilities|renewables?)\b/i,
  climate: /\b(climate|heat wave|heatwave|wildfire|wildfires|drought|flood|flooding|hurricane|storm|storms|water shortage|water allocation|watershed)\b/i,
  disaster: /\b(disaster|emergency response|evacuat\w*|hurricane|flood|flooding|wildfire|wildfires|drought|outbreak|storm|storms|power outage)\b/i,
  water: /\b(water|river|reservoir|drought|flood|flooding|water quality|water allocation|water supply)\b/i,
  health: /\b(health|hospital|clinic|medical|medicare|insurance|insulin|surgeon|veteran(?:s)? hospital|disease|virus|outbreak|vaccine|public health)\b/i,
  retirement: /\b(social security|retirement|medicare trustees|benefit cuts|trust fund|pension)\b/i,
  veterans: /\b(veteran|military family|gold star|service member|armed forces|flag officer)\b/i,
  education: /\b(education|school(?:s| board| district)?|teacher(?:s)?|campus|college|university|student(?:s)?|tuition)\b/i,
  youth: /\b(youth|young voters|young people|student registration|voter registration|campus|college)\b/i,
  technology: /\b(technology|tech|artificial intelligence|\bai\b|deepfake|chip plant|semiconductor|app ban|cyberattack|voter files|data collection|privacy|digital)\b/i,
  privacy: /\b(privacy|surveillance|data collection|warrantless|personal data|app ban|digital rights)\b/i,
  science: /\b(science|space|rocket|launch|mars|ufo|unidentified flying|alien|research lab|national lab)\b/i,
  foreign: /\b(foreign|international|war|conflict|ceasefire|diplomac\w*|allies|alliance|gaza|israel|palestinian|ukraine|china|iran|foreign leader|foreign policy)\b/i,
  immigration: /\b(immigration|immigrant|migrant|border|asylum|deport\w*|raid|detain\w*|refugee)\b/i,
  crime: /\b(crime|carjacking|police|law enforcement|public safety|shooting|violence|protest|riot|campus encampment)\b/i,
  housing: /\b(housing|rent(?:s|ers)?|landlord|eviction|home prices|affordable homes|construction)\b/i,
  justice: /\b(court|supreme court|lawsuit|legal|judge|ruling|rights|whistleblower|audit|public records|procurement)\b/i,
  ballot: /\b(ballot|election law|voting|voter registration|turnout|ballot access|initiative|election administration)\b/i,
  polling: /\b(poll|polling|focus group|survey|approval rating|averages stop moving)\b/i,
  endorsement: /\b(endorse\w*|endorsement|backing|support from|celebrity|former president|superstar)\b/i,
  fundraising: /\b(fundrais\w*|donor|donation|money bomb|small gifts|super pac|outside group|campaign finance|contribution)\b/i,
  scandal: /\b(scandal|allegation|leak|leaked|memo|investigation|corruption|ethics|bribe|payoff|cover.?up|deepfake|fabricated video|opposition research|tell.?all)\b/i,
  faith: /\b(faith|church|sermon|religious|congregation|pastor|clergy|prayer)\b/i,
  sports: /\b(sport|team|league|athlete|player|championship|title game|olympic|games)\b/i,
  media: /\b(interview|broadcast|television|tv network|newsroom|focus group|editorial|anchor|book tour|viral|social media)\b/i,
  advertising: /\b(advertising|advertisement|campaign ad|radio spot|media buy|airtime|ad buy|commercial|super pac)\b/i,
  field: /\b(field operation|field office|organizer|organizers|volunteer|precinct|phone bank|canvass|campaign stop|town hall|door.?to.?door|ground game)\b/i,
  coalition: /\b(coalition|faction|party leadership|party officers|activists|voter group|grassroots|party infight|intra.?party|group speech)\b/i,
  agriculture: /\b(agricultur\w*|farm|farmer|corn|crop|harvest|rural|state fair|food pantry)\b/i,
  transport: /\b(transport|rail|bridge|infrastructure|depot|road|transit|port)\b/i,
  policy: /\b(policy|policies|stance|position|promise|proposal|platform|legislation|bill)\b/i,
};

const TOPIC_LABELS = {
  economy: 'the economy and jobs', prices: 'prices and affordability', labor: 'labor and unions',
  energy: 'energy', climate: 'weather and climate', disaster: 'an emergency', water: 'water',
  health: 'health care', retirement: 'retirement security', veterans: 'veterans and military families',
  education: 'schools and education', youth: 'young voters', technology: 'technology',
  privacy: 'privacy and data', science: 'science and space', foreign: 'foreign affairs',
  immigration: 'immigration', crime: 'public safety', housing: 'housing', justice: 'courts and accountability',
  ballot: 'voting and ballot access', polling: 'polling', endorsement: 'endorsements',
  fundraising: 'fundraising', scandal: 'ethics and campaign scrutiny', faith: 'faith communities',
  sports: 'sports', media: 'press and public attention', advertising: 'campaign advertising',
  field: 'field organizing', coalition: 'the campaign coalition', agriculture: 'agriculture and rural communities',
  transport: 'infrastructure and transportation', policy: 'campaign policy positions',
};

const EVENT_TOPICS = {
  rogue_ai: ['technology', 'science'], depression: ['economy'], war: ['foreign'], hurricane: ['disaster', 'climate'],
  old_video: ['scandal'], leak: ['scandal'], endorsement: ['endorsement'], strike: ['labor'], border: ['immigration'],
  groceries: ['prices'], scotus: ['justice'], virus: ['health', 'disaster'], ufo: ['science'], ai_jobs: ['technology', 'jobs'],
  grid: ['energy', 'disaster'], olympics: ['sports'], gaffe: ['scandal'], health: ['health'], third_party: ['ballot', 'coalition'],
  party_infight: ['coalition'], cyberattack: ['technology', 'privacy', 'scandal'], protest: ['crime', 'education'], mars: ['science'],
  crypto: ['economy', 'technology'], celebrity_feud: ['endorsement'], drought: ['water', 'climate', 'disaster'],
  vp_shortlist: ['coalition', 'endorsement'], sports_riot: ['sports'], gas: ['prices', 'energy'], flood: ['water', 'climate', 'disaster'],
  book_deal: ['scandal'], housing: ['housing', 'prices'], plant_closure: ['jobs', 'labor'], donor_ultimatum: ['fundraising', 'scandal'],
  gold_star: ['veterans', 'foreign'], union_split: ['labor', 'coalition'], soft_interview: ['media'], trust_fund: ['retirement', 'health'],
  flood_swing: ['water', 'disaster'], foreign_leak: ['foreign', 'scandal'], running_mate_file: ['scandal'],
  flag_officers: ['veterans', 'endorsement'], viral_rescue: ['media', 'field'], water_cuts: ['water', 'energy', 'climate'],
  m1_hurricane: ['disaster', 'climate'], m1_union_hall: ['labor'], m1_farm_belt: ['agriculture', 'climate'],
  m1_church_visit: ['faith'], m1_tech_layoffs: ['technology', 'jobs'], m1_deepfake: ['technology', 'scandal'],
  m1_ballot_initiative: ['ballot'], m1_small_business: ['economy', 'field'], m1_gas_prices: ['prices', 'energy'],
  m1_veterans: ['veterans', 'health'], m1_seniors_medicare: ['retirement', 'health'], m1_youth_registration: ['youth', 'ballot'],
  m1_sports_boycott: ['sports'], m1_strike: ['labor'], m1_foreign_war: ['foreign'], m1_rival_endorsement: ['endorsement', 'coalition'],
  m1_internal_poll: ['polling'], m1_donor_price: ['fundraising'], m1_superpac: ['fundraising', 'advertising'],
  m1_crime_wave: ['crime'], m1_school_board: ['education'], m1_water_crisis: ['water', 'health'], m1_tariffs: ['trade'],
  m1_wildfire: ['climate', 'disaster'], m1_immigration_raid: ['immigration', 'crime'], m2_hospital_visit: ['health'],
  m2_celebrity_endorsement: ['endorsement'], m2_app_ban: ['technology', 'privacy'], m2_sermon: ['faith'],
  m2_grocery_tour: ['prices'], m2_focus_group: ['polling'], m2_campus_protest: ['education', 'youth', 'crime'],
  m2_police_union: ['crime', 'labor'], m2_outbreak: ['health', 'disaster'], m2_infrastructure: ['transport', 'economy'],
  m2_state_fair: ['agriculture', 'field'], m2_opponent_scandal: ['scandal'], m2_money_bomb: ['fundraising'],
  m2_poll_consolidation: ['polling'], m2_foreign_endorsement: ['foreign', 'endorsement'], m2_space_launch: ['science'],
  m2_drought: ['water', 'climate', 'disaster'], m2_chip_plant: ['technology', 'jobs'], m2_book_deal: ['scandal'],
  m2_former_president: ['endorsement', 'coalition'], m2_ballot_lawsuit: ['ballot', 'justice'],
  m2_staffer_allegation: ['scandal'], m2_flood: ['water', 'climate', 'disaster'], m2_teacher_strike: ['labor', 'education'],
  m2_housing: ['housing', 'prices'], m2_final_ad_war: ['advertising', 'fundraising'], gaza_rupture: ['foreign'],
  every_group_speech: ['coalition'], ad_flashpoint: ['advertising', 'media'], issue_spotlight: ['policy', 'advertising'],
  free_ad_one: ['advertising'], free_ad_two: ['advertising'], free_ad_three: ['advertising'], free_ad_four: ['advertising'],
  ground_pa_union: ['field', 'labor'], ground_mi_chairs: ['field', 'coalition'], ground_wi_neighbors: ['field'],
  ground_ga_faith: ['field', 'faith'], ground_az_organizers: ['field'], ground_nc_captains: ['field'],
  pac_affordability: ['fundraising', 'prices'], pac_economy: ['fundraising', 'economy'], pac_health: ['fundraising', 'health'],
  pac_prices: ['fundraising', 'prices'], pac_immigration: ['fundraising', 'immigration'], pac_housing: ['fundraising', 'housing'],
  volunteer_phonebank: ['field'], local_anchor: ['endorsement'], donor_match: ['fundraising'], regional_organizers: ['field'],
  precinct_captains: ['field', 'ballot'], surrogate_speech: ['endorsement', 'field'], membership_drive: ['field', 'coalition'],
  campus_coalition: ['education', 'coalition'], rural_radio: ['agriculture', 'advertising'], mailing_list: ['field', 'advertising'],
};

for (let index = 1; index <= 8; index += 1) EVENT_TOPICS[`issue_favor_${index}`] = ['policy'];
for (let index = 1; index <= 4; index += 1) EVENT_TOPICS[`issue_backlash_${index}`] = ['policy'];

const RETIRED_EVENTS = new Set([
  'debate', 'debate_vp', 'fourth_debate', 'town_hall', 'm1_debate_moment', 'm1_debate_refusal', 'm2_vp_debate', 'convention',
  'm1_ballot_initiative',
]);

const REGIONAL_EVENTS = {
  plant_closure: ['OH', 'MI', 'PA'], m1_union_hall: ['PA'],
  m1_farm_belt: ['IA', 'IL', 'MN', 'MO', 'NE', 'OH', 'WI'], m1_church_visit: ['GA'],
  m1_hurricane: ['TX', 'LA', 'MS', 'AL', 'FL'], m1_wildfire: ['CA', 'AZ', 'CO', 'NM', 'OR', 'WA'],
  m1_water_crisis: ['MI', 'OH', 'PA', 'AZ', 'CA'], water_cuts: ['AZ', 'CA', 'CO', 'NM', 'NV', 'UT'],
  m2_drought: ['AZ', 'CA', 'CO', 'NM', 'NV', 'UT'], m2_flood: ['IA', 'IL', 'MO', 'MS', 'TN', 'KY', 'PA', 'WV'],
  flood_swing: ['FL', 'GA', 'NC', 'SC', 'VA', 'WI'],
};

const REQUIRED_GROUND_STATES = {
  ground_pa_union: 'PA', ground_mi_chairs: 'MI', ground_wi_neighbors: 'WI',
  ground_ga_faith: 'GA', ground_az_organizers: 'AZ', ground_nc_captains: 'NC',
};

const PARTY_NAMES = { dem: 'Democratic', rep: 'Republican', lib: 'Libertarian', grn: 'Green' };
const issueStory = (event) => /^issue_(?:favor|backlash)_/.test(event.id) || event.id === 'issue_spotlight';

function topicsIn(value) {
  const text = String(value || '');
  return Object.entries(TOPIC_PATTERNS).filter(([, pattern]) => pattern.test(text)).map(([topic]) => topic);
}

function uniqueTopics(values) {
  return [...new Set(values.flatMap(topicsIn))];
}

function firstOverlap(left, right) {
  return left.find((topic) => right.includes(topic)) || null;
}

function storyText(story) {
  if (!story) return '';
  return [story.title || story.headline || '', story.text || story.body || '', story.issue || ''].join(' ');
}

function stringsIn(value) {
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringsIn);
  return typeof value === 'string' ? [value] : [];
}

function stateFocus(game, historyValues) {
  const focused = new Set(Object.entries(game.ops || {}).filter(([, value]) => Number(value) > 0).map(([abbr]) => abbr));
  const stateText = [...historyValues, game.lastAction, game.lastPromise, game.lastAd, game.lastOutside, game.lastSpin]
    .flatMap(stringsIn).join(' ').toLowerCase();
  Object.entries(STATE_BY_ABBR).forEach(([abbr, state]) => {
    if (state?.name && stateText.includes(state.name.toLowerCase())) focused.add(abbr);
  });
  (game.campaignTrail?.entries || []).slice(-8).forEach((entry) => {
    if (!entry?.changes) return;
    Object.keys(entry.changes).forEach((abbr) => {
      if ((game.ops || {})[abbr] > 0) focused.add(abbr);
    });
  });
  [game.lastPromise?.abbr, game.lastAd?.abbr, game.lastOutside?.abbr, game.lastSpin?.abbr]
    .filter(Boolean).forEach((abbr) => focused.add(abbr));
  return focused;
}

function eventHistory(game, rival) {
  const values = [];
  (game.history || []).slice(-4).forEach((entry) => {
    if (rival) values.push(entry.opp?.eventTitle, entry.opp?.choice, entry.oppRival, entry.outside?.text);
    else values.push(entry.eventTitle, entry.choice, entry.actions, entry.outside?.text);
  });
  (game.campaignTrail?.entries || []).slice(-8).forEach((entry) => values.push(entry.label));
  values.push(game.weekLog, game.lastAction, game.lastPromise, game.lastAd, game.lastOutside, game.lastSpin);
  return values.flatMap(stringsIn);
}

function candidateRating(game, rival, rating) {
  const id = rival ? game.opponentId : game.candidateId;
  return Math.max(1, Math.min(20, Number(CANDIDATE_BY_ID[id]?.ratings?.[rating]) || 10));
}

function factionSignals(game) {
  const values = Object.values(factionStandings(game)).filter(Number.isFinite);
  return {
    uneven: values.length > 1 && Math.max(...values) - Math.min(...values) >= 24,
    weak: values.some((value) => value <= 34),
  };
}

function contextFor(event, game, rival = false) {
  if (!event || !game || event.fallback || event.nationalOnly || event.easterEgg || RETIRED_EVENTS.has(event.id)) return null;
  const party = rival ? game.opponentParty : game.party;
  const mode = game.thirdMode || 'fringe';
  if (event.partyOnly && event.partyOnly !== party) return null;
  if (event.modeOnly && event.modeOnly !== mode) return null;
  if (event.factionConflict) {
    const validFactions = new Set(factionsFor(party).map((faction) => faction.id));
    if (!event.factionConflict.factions?.every((id) => validFactions.has(id))) return null;
    const labels = factionsFor(party).filter((faction) => event.factionConflict.factions.includes(faction.id)).map((faction) => faction.label);
    return `${labels[0]} and ${labels[1]} have competing campaign priorities that need a decision.`;
  }

  const week = game.week || 0;
  const weeks = Math.max(1, Number(game.totalWeeks) || 14);
  if (event.id === 'm1_rival_endorsement' && week > 4) return null;
  if (event.id === 'm2_final_ad_war' && week < Math.max(1, weeks - 2)) return null;
  if (event.id === 'm2_poll_consolidation' && week < 5) return null;
  if (['m2_book_deal', 'book_deal'].includes(event.id) && week < 4) return null;
  if (event.id === 'vp_shortlist' && game.runningMateId) return null;
  if (event.id === 'running_mate_file' && !game.runningMateId) return null;
  if (event.id === 'third_party' && mode !== 'surge') return null;

  if (event.id.startsWith('4p_pair_')) {
    const partyName = PARTY_NAMES[party];
    if (!partyName || !event.title.includes(partyName)) return null;
  }

  const history = eventHistory(game, rival);
  const focusedStates = stateFocus(game, history);
  const requiredState = REQUIRED_GROUND_STATES[event.id];
  if (requiredState && !focusedStates.has(requiredState)) return null;

  const localStories = [...focusedStates].flatMap((abbr) => worldNewsIn(game, abbr).map(storyText));
  const national = nationalNewsCard(game);
  const newsText = [storyText(national), game.arc?.label, game.arc?.note, ...localStories].filter(Boolean).join(' ');
  const historyText = history.join(' ');
  const campaignText = [
    historyText,
    JSON.stringify(game.lastPromise || {}),
    JSON.stringify(game.lastAd || {}),
    JSON.stringify(game.lastOutside || {}),
    JSON.stringify(game.lastSpin || {}),
    JSON.stringify(game.scandals || []),
    JSON.stringify(game.ops || {}),
    game.strategyProfile?.messages?.join(' '),
    game.strategyProfile?.issueFocus ? Object.keys(game.strategyProfile.issueFocus).join(' ') : '',
  ].filter(Boolean).join(' ');
  const signals = factionSignals(game);
  const campaignSignals = [
    campaignText,
    signals.uneven ? 'faction coalition disagreement party leadership' : '',
    signals.weak ? 'party coalition support weakening' : '',
  ].join(' ');
  const eventTopics = EVENT_TOPICS[event.id] || topicsIn([event.title, event.kicker, event.text].join(' '));
  const newsTopics = topicsIn(newsText);
  const campaignTopics = topicsIn(campaignSignals);

  if (event.id === 'm2_state_fair' && !focusedStates.has('IA') && !newsTopics.includes('agriculture') && !campaignTopics.includes('agriculture')) return null;

  const newsTopic = firstOverlap(eventTopics, newsTopics);
  if (newsTopic) return `Current coverage of ${TOPIC_LABELS[newsTopic] || newsTopic} makes this story relevant to the campaign.`;
  if (rival) return null;

  const localTopic = firstOverlap(eventTopics, topicsIn(localStories.join(' ')));
  if (localTopic) return `Recent reporting in states on the campaign’s route puts ${TOPIC_LABELS[localTopic] || localTopic} in focus.`;
  const regional = (REGIONAL_EVENTS[event.id] || []).find((abbr) => focusedStates.has(abbr));
  if (regional) return `The campaign has recently focused on ${STATE_BY_ABBR[regional]?.name || regional}, where this development matters.`;

  const hasRecentAd = !!game.lastAd || /\b(advertising|advertisement|campaign ad|radio spot|media buy|airtime|ad buy)\b/i.test(campaignSignals);
  if (['ad_flashpoint', 'free_ad_one', 'free_ad_two', 'free_ad_three', 'free_ad_four'].includes(event.id) && !hasRecentAd && !newsTopics.includes('advertising')) return null;

  const policyActive = (game.flips || 0) > 0 || !!game.lastPromise
    || Object.values(game.issueEdge || {}).some((value) => Math.abs(Number(value) || 0) > 0.05)
    || /\b(position on|promise|policy|stance)\b/i.test(historyText);
  for (const topic of eventTopics) {
    if (topic === 'policy' && policyActive && issueStory(event)) return 'Recent campaign work has made policy positions part of the week’s conversation.';
    if (topic === 'coalition' && (signals.uneven || signals.weak)) return 'The campaign’s coalition needs attention as support inside the party becomes uneven.';
    if (topic === 'fundraising' && (Number(game.funds || 0) < 28 || (factionStandings(game).donors ?? 50) < 38)) return 'The campaign’s finances and donor relationships are under pressure this week.';
  }

  const campaignTopic = firstOverlap(eventTopics, campaignTopics.filter((topic) => topic !== 'policy'));
  if (campaignTopic) return `Recent campaign activity has put ${TOPIC_LABELS[campaignTopic] || campaignTopic} on the agenda.`;
  if (event.id === 'm2_former_president' && !['dem', 'rep'].includes(party)) return null;
  if (['m2_book_deal', 'book_deal'].includes(event.id) && candidateRating(game, rival, 'speech') >= 14) {
    return 'The candidate’s public profile makes a book or interview story plausible this late in the campaign.';
  }
  return null;
}

function isCorruptionStory(event) {
  return event.tone === 'scandal' || /\b(corrupt|corruption|bribe|ethics|cover.?up|investigation|payoff)\b/i.test(
    `${event.id} ${event.title} ${event.kicker} ${event.text}`
  );
}

function pickWeighted(events, negativeBias, random) {
  const weighted = events.map((event) => {
    const isBad = event.tone === 'crisis' || event.tone === 'scandal';
    const bias = isBad ? negativeBias : 2 - negativeBias * 0.6;
    return { event, weight: Math.max(0.2, (event.weight || 1) * Math.max(0.25, bias)) };
  });
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = random() * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.event;
  }
  return weighted[weighted.length - 1]?.event || null;
}

const MAIN_GAME_EVENTS = mainGameEventCatalog(EVENTS);
const MAIN_GAME_CHOICES = mainGameEventCatalog(CHOICE_EVENTS);

export function drawContextualEvent(game, { rival = false, negativeBias = 1, tone = null, extraEvents = [], excludedEventIds = [], random = Math.random } = {}) {
  const party = rival ? game.opponentParty : game.party;
  const mode = game.thirdMode || 'fringe';
  const excluded = new Set(excludedEventIds);
  const extras = !rival && Array.isArray(extraEvents) ? mainGameEventCatalog(extraEvents) : [];
  const pool = (rival ? MAIN_GAME_CHOICES : MAIN_GAME_EVENTS).concat(extras).filter((event) =>
    !excluded.has(event.id) && event.choices?.length && !event.nationalOnly && !event.easterEgg && !event.fallback && !event.scriptedOnly
      && (!event.partyOnly || event.partyOnly === party) && (!event.modeOnly || event.modeOnly === mode)
  );
  const eligible = pool.flatMap((event) => {
    const why = event.contextWhy || event.why || contextFor(event, game, rival);
    return why ? [{ ...event, contextWhy: why }] : [];
  });
  const unused = eligible.filter((event) => !(game.usedEvents || []).includes(event.id));
  const repeatable = eligible.filter((event) => !event.oncePerScenario);
  const available = unused.length ? unused : repeatable;
  const fallback = MAIN_GAME_EVENTS.find((event) => event.fallback);
  if (!available.length) {
    return fallback
      ? { ...fallback, contextWhy: 'No unused story matched this week’s news or recent campaign activity, so the team is setting its route and message priorities.' }
      : null;
  }

  const corruption = rival ? 10 : candidateRating(game, false, 'corruption');
  const weighted = available.map((event) => {
    let copy = event;
    if (!rival && isCorruptionStory(event)) {
      copy = { ...copy, weight: (event.weight || 1) * Math.max(0.05, 1 - (corruption - 1) * 0.045) };
      copy.weight = adjustCorruptionStoryWeight({
        baseWeight: copy.weight,
        perceivedCorruptionScore: game.perceivedCorruptionScore,
        isCorruptionStory: true,
      });
    }
    if (tone && tone !== 'nation' && event.tone === tone) copy = { ...copy, weight: (copy.weight || 1) * 4 };
    return copy;
  });
  return pickWeighted(weighted, Number(negativeBias) || 1, random) || fallback || null;
}

export function eventContextReason(event, game, rival = false) {
  return contextFor(event, game, rival);
}
