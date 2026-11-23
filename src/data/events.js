// The headline deck. Every event is drawn at random from the pool; nothing is
// scripted to a week. `weight` controls rarity, `tone` controls the card's look.
//
// Effects are always written from YOUR candidate's point of view:
//   mom      — momentum points you gain
//   oppMom   — momentum points your opponent loses
//   funds    — millions of dollars
//   region   — permanent margin shift in a region
//   states   — permanent margin shift in specific states
//   risk     — 0..1 chance of a scandal whose severity the player never sees

import { EXTRA_EVENTS } from '@/data/eventsExtra';
import { MEGA_EVENTS_A } from '@/data/eventsMega';
import { MEGA_EVENTS_B } from '@/data/eventsMega2';
import { NATION_EVENTS } from '@/data/nationEvents';
import { EASTER_EGGS } from '@/data/easterEggs';
import { DEMOGRAPHIC_EVENTS } from '@/data/eventsDemographics';
import { DERIVED_EVENTS } from '@/data/derivedEvents';
import { BOOST_EVENTS } from '@/data/eventsBoosts';
import { FOUR_PARTY_NEWS_EVENTS } from '@/data/fourPartyNews';
import { FACTION_CONFLICT_EVENTS } from '@/data/factionConflicts';
import { VANCE_SUCCESSION_EVENTS } from '@/data/vanceSuccession';
import {
  attachTriggeredEventChainLinks,
  materializeTriggeredEventChains,
} from '@/data/triggeredEventChains';

// Cards where you pick something.
const BASE_EVENTS = [
  {
    id: 'rogue_ai',
    title: 'Rogue AI Escapes Containment',
    icon: 'brain',
    tone: 'chaos',
    weight: 3,
    kicker: 'Emergency bulletin',
    text: 'An experimental model at a national lab has started writing its own press releases, endorsed a third-party candidate, and politely refuses to be shut down. It has 40 million followers in four days. Nobody in Washington agrees on what to do, but everybody wants a quote from you.',
    choices: [
      {
        label: 'Call for an international AI pause',
        detail: 'Serious, somber, extremely televisable.',
        effects: { mom: 8, funds: -6, region: { west: 0.9 }, risk: 0.2 },
        outcome: 'You sound like the only adult in the room. Tech donors quietly close their checkbooks and open a group chat without you in it.',
      },
      {
        label: 'Do a friendly podcast with the AI',
        detail: 'It has a charming voice. It also has no idea what a state is.',
        effects: { mom: 14, risk: 0.55, region: { west: 1.2, midwest: -0.6 } },
        outcome: 'The clip does 60 million views in a day. Half the country thinks you are the future; the other half thinks you are unserious. Both are now talking about you.',
      },
      {
        label: 'Stay on message, say nothing',
        detail: 'Discipline is a strategy until it looks like cowardice.',
        effects: { mom: -4, funds: 4 },
        outcome: 'You raise money off the chaos and cede the entire news cycle. Your press secretary ages four years in one week.',
      },
    ],
  },
  {
    id: 'depression',
    title: 'The Bottom Falls Out',
    icon: 'data',
    tone: 'crisis',
    weight: 2,
    kicker: 'Markets, Monday 9:31am',
    text: 'A private credit fund misses a payment, then another. By Thursday the Dow has lost a fifth of its value and the word "depression" is on the front page of every paper in the country. Voters want to know exactly what you will do, and they want to know before lunch.',
    choices: [
      {
        label: 'Unveil a giant jobs program',
        detail: 'Roosevelt-sized. Expensive. Popular.',
        effects: { mom: 12, funds: -14, region: { midwest: 1.4, south: 0.6 }, risk: 0.25 },
        outcome: 'Crowds show up in hard hats. Your opponent calls it the largest spending bill in history, which is, unfortunately, accurate and also his closing line for the rest of the race.',
      },
      {
        label: 'Blame your opponent for the crash',
        detail: 'Cheap, fast, and it might even work.',
        effects: { mom: 6, oppMom: -9, risk: 0.35 },
        outcome: 'The finger-pointing lands with the base. Independent voters find it exhausting, but exhaustion does not show up in the polls for three weeks.',
      },
      {
        label: 'Reassure the markets, promise stability',
        detail: 'The grown-up option. Nobody claps.',
        effects: { mom: -2, funds: 6, region: { northeast: 0.8 } },
        outcome: 'The bond market loves you. The bond market does not vote. Wall Street maxes out anyway, because of course it does.',
      },
    ],
  },
  {
    id: 'war',
    title: 'A War Nobody Planned For',
    icon: 'mystery',
    tone: 'crisis',
    weight: 2,
    kicker: 'Overnight, three time zones',
    text: 'A regional conflict has gone hot and two American allies are asking directly for help. There is no clean answer, only three different ways to be attacked for the one you pick.',
    choices: [
      {
        label: 'Back the allies, loudly',
        detail: 'Strength and clarity.',
        effects: { mom: 5, oppMom: -3, region: { south: 0.8, west: 0.4 }, risk: 0.3 },
        outcome: 'The flag-pin caucus approves. Anti-war voters in college towns start organizing primary challenges against your allies, which is not your problem until it is.',
      },
      {
        label: 'Demand a ceasefire and negotiations',
        detail: 'The moral high ground has terrible polling.',
        effects: { mom: -3, region: { northeast: 1.2, west: 0.6, south: -1.1 }, risk: 0.15 },
        outcome: 'Peace activists adore you. Three retired generals go on television to use the word "naive" a combined forty-one times.',
      },
      {
        label: 'Say this is a leadership failure by the other party',
        detail: 'Turn a war into a domestic message.',
        effects: { mom: 9, oppMom: -7, risk: 0.45 },
        outcome: 'It is brutal, effective, and will be quoted back at you by a moderator in October.',
      },
    ],
  },
  {
    id: 'hurricane',
    title: 'Hurricane Vireo Makes Landfall',
    icon: 'weather',
    tone: 'crisis',
    weight: 4,
    kicker: 'Category 4, Gulf Coast',
    text: 'Two million people are without power and the governor of a state you need is on television begging for help. Your schedule for the week just got rewritten by the weather.',
    choices: [
      {
        label: 'Go to the coast, hand out water, shut up',
        detail: 'No speech. Just a windbreaker.',
        effects: { mom: 9, funds: -7, region: { south: 1.6 } },
        outcome: 'You are photographed carrying a case of water and saying almost nothing. It is the best week of your campaign.',
      },
      {
        label: 'Hold a fundraiser for relief instead',
        detail: 'Money helps. B-roll of a gala does not.',
        effects: { funds: 10, mom: -3, region: { south: -0.7, northeast: 0.4 } },
        outcome: 'You raise $10 million for relief and get a photo of a cocktail napkin trending for four days.',
      },
      {
        label: 'Attack the response as a failure of government',
        detail: 'Works right up until it does not.',
        effects: { mom: 5, risk: 0.5, region: { south: -0.5 } },
        outcome: 'The clip is devastating and plays everywhere. It also plays in the affected counties, which is where the votes are.',
      },
    ],
  },
  {
    id: 'debate',
    title: 'The First Debate',
    icon: 'media',
    tone: 'wild',
    weight: 5,
    kicker: 'Prime time, 90 minutes, no notes',
    text: 'Ninety minutes, two podiums, one moderator who has clearly decided to be a legend. Your opponent is prepared. So are you. Something has to give.',
    choices: [
      {
        label: 'Stay calm, answer every question',
        detail: 'Competence as a personality.',
        effects: { mom: 7, region: { midwest: 0.5, northeast: 0.5 } },
        outcome: 'You win the focus groups by eleven points and the spin room by forty. The internet decides your opponent won because he was louder.',
      },
      {
        label: 'Land one unforgettable line',
        detail: 'High risk, permanent consequence.',
        effects: { mom: 15, risk: 0.5 },
        outcome: 'It is either the line of the decade or the reason you lose. There is no third option, and you find out which one by Friday.',
      },
      {
        label: 'Attack, attack, attack',
        detail: 'Flood the zone. Never let him finish.',
        effects: { mom: 6, oppMom: -11, risk: 0.4 },
        outcome: 'Your opponent never completes a sentence. Neither do you, but you did it on purpose, which the base loves and the moderates do not.',
      },
    ],
  },
  {
    id: 'old_video',
    title: 'A Very Old Video',
    icon: 'entertainment',
    tone: 'scandal',
    weight: 5,
    kicker: 'Opposition research, delivered at 6am',
    text: 'A twenty-year-old clip of you saying something you absolutely did say has surfaced. It is already at 30 million views. Your communications director is in the doorway holding two coffees and no plan.',
    choices: [
      {
        label: 'Apologize immediately and completely',
        detail: 'Get ahead of it. Kill the story.',
        effects: { mom: -3, oppMom: -2, region: { midwest: 0.4 } },
        outcome: 'The apology lands. The story dies in three days instead of three weeks. Your base grumbles about weakness.',
      },
      {
        label: 'Stand by the original statement',
        detail: 'Convert the scandal into a rally chant.',
        effects: { mom: 11, oppMom: 4, region: { south: -0.9, west: 0.5 }, risk: 0.45 },
        outcome: 'The base goes feral in the best way. Suburban women go feral in the other way. The map gets narrower and much louder.',
      },
      {
        label: 'Refuse to discuss it',
        detail: 'Silence as a strategy.',
        effects: { mom: -7, funds: 3 },
        outcome: 'It runs for nine days. By day four even your own surrogates are tired of being asked.',
      },
    ],
  },
  {
    id: 'leak',
    title: 'The Internal Memo Leaks',
    icon: 'data',
    tone: 'scandal',
    weight: 4,
    kicker: 'Someone on your payroll',
    text: 'An internal strategy memo leaked in full today, including a line stating that "our candidate cannot be trusted with an unscripted lunch." Your campaign manager wants to investigate the leak. Your pollster wants to fix the actual problem.',
    choices: [
      {
        label: 'Do a week of completely unscripted events',
        detail: 'Prove the memo wrong, live, on camera.',
        effects: { mom: 10, risk: 0.4 },
        outcome: 'Three of the five events go beautifully. The fourth becomes a nine-second clip that will follow you to November.',
      },
      {
        label: 'Fire the leaker publicly',
        detail: 'Restore discipline. Look ruthless.',
        effects: { mom: -4, funds: 5, region: { northeast: 0.3 } },
        outcome: 'The leak stops. So does any staffer willing to tell you bad news.',
      },
      {
        label: 'Leak something worse about your opponent',
        detail: 'Change the subject by changing the target.',
        effects: { mom: 5, oppMom: -10, risk: 0.35 },
        outcome: 'The cycle resets instantly. It also establishes that campaigns are now just two people throwing documents at each other.',
      },
    ],
  },
  {
    id: 'endorsement',
    title: 'A Superstar Endorsement',
    icon: 'star',
    tone: 'hope',
    weight: 6,
    kicker: 'Rally, 9,000 people, 40,000 streaming',
    text: 'One of the most popular entertainment figures in the country offered to headline a rally for your campaign. They have one condition: they choose the venue, the speech, and the running mate joke.',
    choices: [
      {
        label: 'Yes. Give them the whole rally.',
        detail: 'Crowds, youth turnout, merch that sells out.',
        effects: { mom: 12, funds: 8, region: { west: 1.2, northeast: 0.8 } },
        outcome: 'Tickets vanish in eleven minutes. Your opponent calls it "the Hollywood wing," which mainly reminds people how much they like the singer.',
      },
      {
        label: 'Yes, but keep them to a 5-minute intro',
        detail: 'Message discipline over spectacle.',
        effects: { mom: 4, funds: 3 },
        outcome: 'It is tasteful, well-produced, and instantly forgettable. You also hold the news cycle for exactly zero minutes.',
      },
      {
        label: 'Politely decline and keep the focus on policy',
        detail: 'No celebrities. Just policy.',
        effects: { mom: -5, region: { midwest: 0.9, south: 0.4 } },
        outcome: 'Rural county chairs thank you for it. Every producer in America now thinks you are stiff.',
      },
    ],
  },
  {
    id: 'strike',
    title: 'The Auto Workers Walk Out',
    icon: 'tools',
    tone: 'wild',
    weight: 4,
    kicker: 'Three plants, 74,000 workers',
    text: 'A strike has shut down three plants in states that will decide the election. Both sides want you to pick a lane on camera by Thursday.',
    choices: [
      {
        label: 'Walk the picket line',
        detail: 'Classic, effective, extremely partisan.',
        effects: { mom: 9, oppMom: -4, region: { midwest: 1.8 } },
        outcome: 'The hall goes wild. Plant managers in the same county start donating to your opponent, which you will notice in the returns.',
      },
      {
        label: 'Offer to mediate as a neutral',
        detail: 'Statesmanlike. Nobody asked.',
        effects: { mom: 1, funds: 4, region: { midwest: 0.4 } },
        outcome: 'You broker absolutely nothing and get credit for being available. It is the least dramatic week of the campaign.',
      },
      {
        label: 'Blame the strike for the economy',
        detail: 'Say what the donors are thinking.',
        effects: { funds: 16, mom: -6, region: { midwest: -1.2, south: 0.5 } },
        outcome: 'Business money floods in. Two locals announce they are sitting out the election altogether.',
      },
    ],
  },
  {
    id: 'border',
    title: 'The Border Breaks the News',
    icon: 'shield',
    tone: 'wild',
    weight: 4,
    kicker: 'Drone footage, 24-hour cable',
    text: 'A new surge of immigration has produced footage that is running on a loop on every channel. Governors in three states are sending buses. Everyone in America has an opinion and most of them are yelling.',
    choices: [
      {
        label: 'Announce a bipartisan reform framework',
        detail: 'Actual policy. Slow to land, hard to attack.',
        effects: { mom: 5, region: { south: -0.4, northeast: 0.6 } },
        outcome: 'Both parties’ loudest voices call it a betrayal, which is usually what a real deal looks like.',
      },
      {
        label: 'Go to the border yourself this week',
        detail: 'A photo op with a backdrop problem.',
        effects: { mom: 8, risk: 0.4, region: { south: 0.7, midwest: 0.6 } },
        outcome: 'The footage is strong. A local official upstages you on the same footage, loudly and in three languages.',
      },
      {
        label: 'Attack your opponent as unserious on security',
        detail: 'Cheap, reliable, corrosive.',
        effects: { mom: 6, oppMom: -8, region: { south: -0.5 }, risk: 0.3 },
        outcome: 'It works. It always works. It is also why nothing has been fixed in three decades.',
      },
    ],
  },
  {
    id: 'groceries',
    title: 'Eggs Cost How Much?',
    icon: 'plant',
    tone: 'crisis',
    weight: 5,
    kicker: 'The grocery aisle, on camera',
    text: 'A reporter films you at a grocery store asking the price of eggs. Whatever you say next becomes the most-quoted sentence of the week, and possibly of the month.',
    choices: [
      {
        label: 'Publish your own detailed grocery list',
        detail: 'Show the work. Be the price guy.',
        effects: { mom: 8, region: { midwest: 0.9, south: 0.5 } },
        outcome: 'People screenshot your list. Half of them complain it is out of date. All of them engage with it.',
      },
      {
        label: 'Pivot hard to your price-control plan',
        detail: 'Turn a gotcha into a launch.',
        effects: { mom: 6, funds: -8, region: { midwest: 0.6 } },
        outcome: 'It is a real policy, and it also sounds like you have never shopped for groceries in your life. Both true.',
      },
      {
        label: 'Blame your opponent directly',
        detail: 'Point the finger at the checkout lane.',
        effects: { mom: 4, oppMom: -5, risk: 0.35 },
        outcome: 'The line lands hard. Economists on every network spend a week explaining why it is nonsense.',
      },
    ],
  },
  {
    id: 'scotus',
    title: 'A Supreme Court Vacancy',
    icon: 'justice',
    tone: 'wild',
    weight: 3,
    kicker: 'A retirement, 41 days out',
    text: 'A justice has announced a retirement with the election less than two months away. Both parties are now describing the same constitutional process in completely different ways, and everyone is calling you.',
    choices: [
      {
        label: 'Make it the central issue of the election',
        detail: 'Motivate voters who need a reason to turn out.',
        effects: { mom: 11, oppMom: -6, risk: 0.3, region: { northeast: 0.8 } },
        outcome: 'Abortion-rights voters volunteer in numbers nobody expected. You have just nationalized the election.',
      },
      {
        label: 'Call for an open, quiet process',
        detail: 'Institutional calm.',
        effects: { mom: -1, region: { northeast: 0.6, south: 0.4 } },
        outcome: 'The Senate nods. The grassroots wonder when your party started enjoying losing.',
      },
      {
        label: 'Promise a specific nominee',
        detail: 'Bold. Names a target on your own back.',
        effects: { mom: 7, risk: 0.45 },
        outcome: 'The grassroots love a fighter. Your nominee spends four weeks being opposition-researched by people with no other job.',
      },
    ],
  },
  {
    id: 'virus',
    title: 'A New Variant, a Bad Map',
    icon: 'brain',
    tone: 'crisis',
    weight: 3,
    kicker: 'Health ministry briefing',
    text: 'A fast-spreading variant has hospitals in three states drafting surge plans. Schools are already emailing parents. You have twelve hours to have a position.',
    choices: [
      {
        label: 'Back mask and vaccine mandates',
        detail: 'The evidence is clear. The politics are not.',
        effects: { mom: 4, region: { northeast: 1.4, west: 0.8, south: -1.6, midwest: -0.8 } },
        outcome: 'Public health officials are thrilled. County chairs in the Midwest send you a very long text message.',
      },
      {
        label: 'Focus on funding hospitals, no mandates',
        detail: 'Help without telling anyone what to do.',
        effects: { mom: 7, funds: -9, region: { midwest: 0.9, south: 0.5 } },
        outcome: 'It is the most popular position available and it satisfies almost nobody who is angry.',
      },
      {
        label: 'Accuse your opponent of playing politics with it',
        detail: 'Make it about them.',
        effects: { mom: 5, oppMom: -6, risk: 0.4 },
        outcome: 'True, effective, and a week later it is the reason a swing county does not trust either of you.',
      },
    ],
  },
  {
    id: 'ufo',
    title: 'Congress Holds a UFO Hearing',
    icon: 'satellite',
    tone: 'chaos',
    weight: 3,
    kicker: 'C-SPAN, for once, goes viral',
    text: 'A retired pilot testifies under oath that there are objects in the sky that are "not ours." It is the single biggest story in the country for six straight days and every candidate has to have a thought about it.',
    choices: [
      {
        label: 'Demand full government transparency on UAPs',
        detail: 'Sensible. Also extremely fun.',
        effects: { mom: 9, region: { west: 0.9, south: 0.6 } },
        outcome: 'You are quoted by people who have never voted in a primary. Your press list doubles overnight.',
      },
      {
        label: 'Joke about it at a rally',
        detail: 'Land the laugh. Risk the serious people.',
        effects: { mom: 7, region: { northeast: 0.5 }, risk: 0.3 },
        outcome: 'The joke kills for two days. A retired admiral calls it a national embarrassment for a week.',
      },
      {
        label: 'Say nothing about aliens all week',
        detail: 'Focus. Discipline. Boring.',
        effects: { mom: -6, funds: 4 },
        outcome: 'For seventy-two hours you are the only person in America not talking about aliens. It reads as out of touch.',
      },
    ],
  },
  {
    id: 'ai_jobs',
    title: 'Two Million Jobs Vanish',
    icon: 'business',
    tone: 'crisis',
    weight: 4,
    kicker: 'A labor report nobody expected',
    text: 'Automation has cut a visible, headline-level hole in white-collar employment. Call centers, tax prep, paralegals. The word "obsolete" is on the cover of three magazines this week.',
    choices: [
      {
        label: 'Propose a worker retraining guarantee',
        detail: 'Big, concrete, and impossible to summarize.',
        effects: { mom: 8, funds: -11, region: { midwest: 1.3, west: 0.5 } },
        outcome: 'The policy is genuinely good and lands with exactly the voters it is designed for. It also takes four minutes to explain.',
      },
      {
        label: 'Attack the companies doing the automating',
        detail: 'Name names. Get loud.',
        effects: { mom: 10, funds: -5, risk: 0.35, region: { midwest: 1.1 } },
        outcome: 'The rally responds to this like a touchdown. Three tech executives say they will relocate headquarters, which turns out to be a lie.',
      },
      {
        label: 'Lean into the future, jobs will be created',
        detail: 'Optimism is risky here.',
        effects: { mom: -9, funds: 9 },
        outcome: 'It is probably true in ten years. It is catastrophic in eleven weeks.',
      },
    ],
  },
  {
    id: 'grid',
    title: 'The Lights Go Out',
    icon: 'tools',
    tone: 'crisis',
    weight: 3,
    kicker: 'Eleven states, thirty-six hours',
    text: 'A cascading failure took down the grid across eleven states. People are filling bathtubs and getting very, very angry at whoever is nearest to a microphone.',
    choices: [
      {
        label: 'Roll out a national grid rebuild plan',
        detail: 'Enormous, popular, and not free.',
        effects: { mom: 9, funds: -13, region: { west: 0.5, northeast: 0.9, midwest: 0.4 } },
        outcome: 'Voters who went two days without a fridge suddenly love infrastructure. Your opponent has to respond and has nothing.',
      },
      {
        label: 'Name who said the grid was fine',
        detail: 'Aimed squarely at your opponent.',
        effects: { mom: 7, oppMom: -10, region: { midwest: 0.5 } },
        outcome: 'You are right. It does not matter, because it lands as blame instead of leadership, and one of those wins elections.',
      },
      {
        label: 'Show up, hand out ice, say little',
        detail: 'Presence over policy.',
        effects: { mom: 5, funds: -3, region: { south: 0.6 } },
        outcome: 'A grandmother hugs you on the news. That is worth more than any speech you gave all summer.',
      },
    ],
  },
  {
    id: 'olympics',
    title: 'The Games Land in Los Angeles',
    icon: 'award',
    tone: 'hope',
    weight: 3,
    kicker: 'Sixteen days of national mood swing',
    text: 'The 2028 Olympics open under a flag that is briefly enormous and briefly uncontroversial. For eleven days, nobody remembers there is an election. Then the closing ceremony happens.',
    choices: [
      {
        label: 'Sit courtside and look patriotic',
        detail: 'Pictures, not paragraphs.',
        effects: { mom: 8, funds: -4, region: { west: 1.4 } },
        outcome: 'You are photographed between two gold medalists looking genuinely happy. It is the most human you have looked all year.',
      },
      {
        label: 'Skip it and campaign in the Midwest',
        detail: 'No media hit. Real voters.',
        effects: { mom: 3, oppMom: -2, region: { midwest: 1.3 } },
        outcome: 'You hold three diner events nobody films and one county chair calls her best week in years.',
      },
      {
        label: 'Buy a national ad campaign during the broadcasts',
        detail: 'Very expensive. Very effective.',
        effects: { mom: 13, funds: -18, region: { northeast: 0.7, midwest: 0.7 } },
        outcome: 'Forty million people see your best ad four times. Your treasurer looks at the burn rate and then at you.',
      },
    ],
  },
  {
    id: 'gaffe',
    title: 'You Say the Wrong Town',
    icon: 'mystery',
    tone: 'scandal',
    weight: 5,
    kicker: 'A microphone that was definitely on',
    text: 'You called a town by the wrong name, then doubled down, then made a joke about it, then made the joke again at a second event. It is now a meme, a T-shirt, and a question from every reporter.',
    choices: [
      {
        label: 'Return to the state for a follow-up event',
        detail: 'Apologize by showing up.',
        effects: { mom: 7, funds: -4, region: { midwest: 1.1 } },
        outcome: 'The town adopts you. You are gifted a key, a jersey, and an extremely large pie.',
      },
      {
        label: 'Ignore it entirely',
        detail: 'Not every story deserves oxygen.',
        effects: { mom: -3, funds: 2 },
        outcome: 'It dies in five days. So does your chance to look human about it.',
      },
      {
        label: 'Blame the coverage',
        detail: 'Attack the messenger, loudly.',
        effects: { mom: 3, oppMom: -2, risk: 0.5, region: { northeast: -0.5 } },
        outcome: 'The base loves the fight. Two local outlets write the letters "we stand by our reporting" in bold.',
      },
    ],
  },
  {
    id: 'health',
    title: 'A Scare in the Motorcade',
    icon: 'health',
    tone: 'crisis',
    weight: 2,
    kicker: 'Seen at Walter Reed, 6:12am',
    text: 'Physicians confirmed you are in good health, but photographs of a dawn hospital visit circulated online and the internet has already held your funeral twice.',
    choices: [
      {
        label: 'Release your full medical records',
        detail: 'Radical transparency. Also a gift to analysis.',
        effects: { mom: 9, risk: 0.3 },
        outcome: 'The story dies within a day. Unfortunately, a doctor on cable finds a sentence he wants to talk about for a week.',
      },
      {
        label: 'Say nothing and keep your schedule',
        detail: 'Prove fitness by working.',
        effects: { mom: 4, region: { midwest: 0.6 } },
        outcome: 'A brutal three-city day in one time zone, no notes. It is a better answer than a letter from a cardiologist.',
      },
      {
        label: 'Demand your opponent release his too',
        detail: 'Deflect by demanding.',
        effects: { mom: 5, oppMom: -7, risk: 0.35 },
        outcome: 'He refuses. The story becomes about him. The story does not become about what the doctor actually said.',
      },
    ],
  },
  {
    id: 'third_party',
    title: 'The Independent Surge',
    icon: 'ballot',
    tone: 'chaos',
    weight: 3,
    kicker: 'A billionaire with a blank checkbook',
    text: 'A celebrity independent has qualified in all fifty states and is polling at 9% nationally, drawing almost entirely from voters who would otherwise be with you. He has no platform, a private jet, and great hair.',
    choices: [
      {
        label: 'Attack him directly',
        detail: 'Rip out the root before it spreads.',
        effects: { mom: 5, risk: 0.35, region: { northeast: 0.4 } },
        outcome: 'It works. It also makes him a martyr with twice the bookings on the Sunday shows.',
      },
      {
        label: 'Ignore him, emphasize the two-way choice',
        detail: 'A wasted vote is a wasted vote.',
        effects: { mom: 7, region: { midwest: 0.5, south: 0.5 } },
        outcome: 'Down-ballot surrogates hammer the message. His number drifts back toward four. It is unglamorous and it works.',
      },
      {
        label: 'Offer him a spot in your administration',
        detail: 'Bribe him with a title, in public.',
        effects: { mom: 2, oppMom: -4, risk: 0.55, funds: 5 },
        outcome: 'He says "interesting" on television, which is technically not a yes. Your base is not sure it was a good idea and neither are you.',
      },
    ],
  },
  {
    id: 'party_infight',
    title: 'Your Party Eats Itself',
    icon: 'business',
    tone: 'scandal',
    weight: 4,
    kicker: 'A donor call that leaked in full',
    text: 'A faction of your own party is publicly demanding you change your message. A major donor has funded a group running ads against your own nominee. This was supposed to be the other side’s problem.',
    choices: [
      {
        label: 'Unify publicly with the faction at a joint event',
        detail: 'Choreograph the peace.',
        effects: { mom: 7, funds: -6, region: { northeast: 0.4, west: 0.4 } },
        outcome: 'The hug is awkward, the coverage is enormous, and the truce holds for roughly nine days.',
      },
      {
        label: 'Purge the dissenters from your campaign',
        detail: 'Total control of the message.',
        effects: { mom: -2, funds: 8, risk: 0.45 },
        outcome: 'Your message is now perfectly consistent. Your coalition is now noticeably smaller.',
      },
      {
        label: 'Rally the base and ignore the donors',
        detail: 'Small-dollar surge, big-dollar silence.',
        effects: { mom: 10, funds: -12, region: { midwest: 0.4, west: 0.6 } },
        outcome: 'Small-dollar donations spike so hard the server crashes. Two bundlers cancel their October events.',
      },
    ],
  },
  {
    id: 'cyberattack',
    title: 'Someone Is Inside the Voter Files',
    icon: 'computer',
    tone: 'crisis',
    weight: 2,
    kicker: 'Election infrastructure, breached',
    text: 'An intrusion has been detected in county registration systems in four states. No votes have changed. Everyone in America is now going to spend a week deciding whether they will believe the result.',
    choices: [
      {
        label: 'Demand paper ballots everywhere',
        detail: 'Boring, credible, expensive.',
        effects: { mom: 8, funds: -9, region: { midwest: 0.6, northeast: 0.6 } },
        outcome: 'Election officials agree with you. Election officials do not make great television, so it lands quietly.',
      },
      {
        label: 'Say your opponent has been using hacked data',
        detail: 'Explosive. Unproven. Very loud.',
        effects: { mom: 9, oppMom: -12, risk: 0.6 },
        outcome: 'It dominates for a week, then it turns out the evidence is thin, which you knew, and the walk-back is excruciating.',
      },
      {
        label: 'Stay quiet and let the experts handle it',
        detail: 'The responsible, invisible option.',
        effects: { mom: -4, funds: 3 },
        outcome: 'Nothing explodes. Nothing improves. A story this big does not have a neutral position and you found that out late.',
      },
    ],
  },
  {
    id: 'protest',
    title: 'Protests Fill Four Cities',
    icon: 'community',
    tone: 'wild',
    weight: 4,
    kicker: 'Night four, still going',
    text: 'Protests that started over one thing are now about seven things. Some are peaceful and enormous. Some are not. Your opponent has already filmed a message. You have a decision.',
    choices: [
      {
        label: 'Speak to the crowd directly',
        detail: 'Walk in. Say something worth hearing.',
        effects: { mom: 11, risk: 0.45, region: { northeast: 0.9, west: 1.0 } },
        outcome: 'For ten minutes it is exactly the moment you want. Then the cameras find something else in the crowd and the frame changes.',
      },
      {
        label: 'Call for calm and order',
        detail: 'The safe center.',
        effects: { mom: 2, region: { south: 0.8, midwest: 0.6, west: -0.4 } },
        outcome: 'Suburban voters relax. Activist groups announce they will not knock doors for you, which has a measurable cost.',
      },
      {
        label: 'Send surrogates, stay at a factory tour',
        detail: 'Contrast by contrast.',
        effects: { mom: -5, oppMom: -3, region: { midwest: 1.0, south: 0.6 } },
        outcome: 'The manufacturing photo-op is beautiful and the contrast is real. It also looks like you left town.',
      },
    ],
  },
  {
    id: 'mars',
    title: 'Americans on Mars',
    icon: 'satellite',
    tone: 'hope',
    weight: 2,
    kicker: 'Landing confirmed, 3:44pm',
    text: 'A crewed American mission has landed successfully on Mars. The footage is the most beautiful thing anyone has seen in a decade and, for one full week, the country is genuinely united about something.',
    choices: [
      {
        label: 'Give a short, unifying speech',
        detail: 'Say the thing everyone is feeling.',
        effects: { mom: 10, region: { west: 0.8, south: 0.5, northeast: 0.5 } },
        outcome: 'Your four-paragraph speech is clipped at 40 seconds and played for forty years. It is the highest approval of your career.',
      },
      {
        label: 'Announce a massive new space program',
        detail: 'Ride the wave into policy.',
        effects: { mom: 6, funds: -12, region: { west: 1.1, south: 0.8 } },
        outcome: 'Florida gets very excited. Fiscal hawks immediately put out an ad with your face, a rocket, and a decimal point.',
      },
      {
        label: 'Use it to argue for American tech leadership',
        detail: 'Tie space to the economy.',
        effects: { mom: 5, funds: 7, region: { northeast: 0.4 } },
        outcome: 'Donors with a stake in the space industry write checks so fast you have to hire someone to open the envelopes.',
      },
    ],
  },
  {
    id: 'crypto',
    title: 'The Coin Goes to Zero',
    icon: 'coin',
    tone: 'chaos',
    weight: 3,
    kicker: 'A wipeout, in one weekend',
    text: 'Bitcoin lost 94% of its value between Friday night and Sunday brunch. Millions of young voters who invested their savings are now extremely online and extremely furious.',
    choices: [
      {
        label: 'Call for a retail investor protection act',
        detail: 'Protect the people who lost the money.',
        effects: { mom: 9, region: { west: 0.7, midwest: 0.5 } },
        outcome: 'Roughly 8 million people who had not voted in nine years now know exactly who you are.',
      },
      {
        label: 'Blame opponents who took the industry money',
        detail: 'Turn the wreck into an attack.',
        effects: { mom: 7, oppMom: -9, risk: 0.35 },
        outcome: 'It is devastating, accurate, and gives your opponent an obvious reply about your own donors.',
      },
      {
        label: 'Decline comment and pivot away from the economic report',
        detail: 'Let it burn itself out.',
        effects: { mom: -7, funds: 6 },
        outcome: 'Crypto donors thank you. A very online, very motivated generation decides you do not care about them.',
      },
    ],
  },
  {
    id: 'celebrity_feud',
    title: 'A Feud You Cannot Win',
    icon: 'entertainment',
    tone: 'chaos',
    weight: 4,
    kicker: 'A 4am post, 2 million replies',
    text: 'A wildly popular athlete has posted that you are, quote, "the worst thing to happen to this country since a bad haircut." The post has more likes than there are people in Ohio. Your team is split on whether to respond.',
    choices: [
      {
        label: 'Respond with genuine humor',
        detail: 'Self-deprecation is the only winning move.',
        effects: { mom: 11, region: { west: 0.8, northeast: 0.6 } },
        outcome: 'You post a photo of your own terrible college haircut. The athlete shares it. The internet declares a truce you did not expect.',
      },
      {
        label: 'Fire back at the athlete',
        detail: 'Show strength. Lose the locker room.',
        effects: { mom: -6, oppMom: 3, funds: 5 },
        outcome: 'Two teammates of the athlete endorse your opponent within forty-eight hours. Two.',
      },
      {
        label: 'Ignore it completely',
        detail: 'Do not punch down.',
        effects: { mom: -2, region: { south: 0.3 } },
        outcome: 'It fades in four days. Someone on your staff screenshots the silence and files it under moments we wasted.',
      },
    ],
  },
  {
    id: 'drought',
    title: 'The Rivers Are Low',
    icon: 'agriculture',
    tone: 'crisis',
    weight: 3,
    kicker: 'Farm belt, third dry year',
    text: 'A third consecutive dry year has cut harvests and river shipping. Farmers who have voted for one party their whole lives are, for the first time, willing to take a meeting with the other one.',
    choices: [
      {
        label: 'Barnstorm the farm belt with a relief plan',
        detail: 'Show up on actual dirt.',
        effects: { mom: 8, funds: -10, region: { midwest: 2.0, south: 0.8 } },
        outcome: 'Three county fairgrounds. Two standing ovations. One farmer tells a reporter he has not voted your way since 1996 and might start.',
      },
      {
        label: 'Push a long-term water infrastructure bill',
        detail: 'Substance, on a slower clock.',
        effects: { mom: 4, funds: -5, region: { west: 1.1, midwest: 0.9 } },
        outcome: 'The bill is genuinely serious. It is written in the kind of language that has never once made a voter look up from a steering wheel.',
      },
      {
        label: 'Use it to attack your opponent climate record',
        detail: 'Point the drought at a target.',
        effects: { mom: 5, oppMom: -7, region: { west: 0.6 }, risk: 0.35 },
        outcome: 'The attack lands in the cities. In the counties that actually dried out, it sounds like a national reporter reading a script.',
      },
    ],
  },
  {
    id: 'vp_shortlist',
    title: 'The Running Mate Question',
    icon: 'community',
    tone: 'wild',
    weight: 4,
    kicker: 'Every reporter, every day',
    text: 'You have to announce a running mate. The shortlist has three names and each one solves a different problem for you while creating a different one.',
    choices: [
      {
        label: 'Pick the boring, competent governor',
        detail: 'Reassure the middle.',
        effects: { mom: 5, region: { midwest: 0.9, south: 0.5, northeast: 0.4 }, risk: 0.1 },
        outcome: 'Nobody is excited. Nobody is alarmed. Your ticket now has a combined seventy years of governing experience and no memes whatsoever.',
      },
      {
        label: 'Pick the firebrand that makes the base scream',
        detail: 'Rally the faithful.',
        effects: { mom: 12, region: { west: 0.8, northeast: 0.5, south: -0.7 }, risk: 0.4 },
        outcome: 'The announcement rally goes so hard the fire marshal shuts the doors. Two swing-state newspapers endorse your opponent the same week.',
      },
      {
        label: 'Pick the historic, high-risk surprise',
        detail: 'Change the shape of the race entirely.',
        effects: { mom: 9, risk: 0.55, region: { south: 0.8, west: 0.8, midwest: -0.5 } },
        outcome: 'It is the single biggest political story of the year. Whether it is a good one depends entirely on how the next three weeks go.',
      },
    ],
  },
  {
    id: 'debate_vp',
    title: 'The Running Mate Debates',
    icon: 'media',
    tone: 'wild',
    weight: 4,
    kicker: 'Ninety minutes, lower stakes, higher weirdness',
    text: 'Your running mate is on the big stage and the whole thing has gone sideways. Thirty minutes in, both candidates are talking over the moderator and one of them has referred to a specific county clerk by name.',
    choices: [
      {
        label: 'Your running mate lands a serious policy answer',
        detail: 'Substance cuts through.',
        effects: { mom: 8, region: { midwest: 0.7, northeast: 0.4 } },
        outcome: 'A genuinely clear explanation of a farm bill becomes the clip of the night. It is not exciting and it is worth three points in Iowa.',
      },
      {
        label: 'Your running mate goes viral for the wrong reason',
        detail: 'Damage control mode.',
        effects: { mom: -8, funds: -4 },
        outcome: 'A facial expression. Fourteen seconds. It is on every late-night show and one of them is not even a comedy show.',
      },
      {
        label: 'Flood the zone with a counter-narrative',
        detail: 'Spin hard, immediately.',
        effects: { mom: 5, oppMom: -6, funds: -6 },
        outcome: 'By midnight the story is about the other side’s gaffe instead. It cost you six million dollars and it was worth it.',
      },
    ],
  },
  {
    id: 'sports_riot',
    title: 'A Title Game and a Bad Night',
    icon: 'award',
    tone: 'scandal',
    weight: 3,
    kicker: 'Celebration turns ugly downtown',
    text: 'A championship celebration in a major city turned destructive. Windows smashed, cars flipped. Your opponent is already filming a law-and-order ad and you are asked about it at four separate events.',
    choices: [
      {
        label: 'Call for accountability without demonizing a city',
        detail: 'Calibrated. Requires three sentences.',
        effects: { mom: 4, region: { northeast: 0.8, west: 0.6, south: -0.4 } },
        outcome: 'You thread the needle. Cable picks one sentence out of three and runs the least flattering one.',
      },
      {
        label: 'Stay on your economic message',
        detail: 'Refuse the frame.',
        effects: { mom: 6, oppMom: -4, region: { midwest: 0.5 } },
        outcome: 'Your opponent spends four days on damage that is already fading. You spend four days talking about wages, which is what you wanted.',
      },
      {
        label: 'Attack your opponent for exploiting it',
        detail: 'Turn the ad against him.',
        effects: { mom: 5, oppMom: -8, risk: 0.4 },
        outcome: 'The counter-ad is brutal and fair. It also guarantees you are both running a crime campaign for the rest of the month.',
      },
    ],
  },
  {
    id: 'gas',
    title: 'Gas Hits $6.40',
    icon: 'water',
    tone: 'crisis',
    weight: 4,
    kicker: 'Every sign in America',
    text: 'Overnight, the national average crossed six dollars and forty cents a gallon. There is a photo of a pump that has run out of digits. Suburban voters, who decide everything, are furious.',
    choices: [
      {
        label: 'Release from the strategic reserve, today',
        detail: 'Visible, immediate, modest.',
        effects: { mom: 8, region: { midwest: 1.2, south: 0.6 } },
        outcome: 'Prices dip eighteen cents and the photo of the announcement runs everywhere. Economists say it does not matter; voters disagree.',
      },
      {
        label: 'Blame your opponent energy policy',
        detail: 'Point the pump at a person.',
        effects: { mom: 6, oppMom: -7, risk: 0.35 },
        outcome: 'It polls well and it explains nothing. Three editorial boards call it the low point of the campaign, which is saying something this year.',
      },
      {
        label: 'Announce a real energy independence plan',
        detail: 'Long-term. Nobody can hear it over the pump.',
        effects: { mom: 3, funds: -7, region: { west: 0.7, midwest: 0.6 } },
        outcome: 'It is the best policy you have put out all year and it gets a total of nine seconds on the evening news.',
      },
    ],
  },
  {
    id: 'town_hall',
    title: 'A Town Hall Gets Away From You',
    icon: 'media',
    tone: 'wild',
    weight: 5,
    kicker: 'A nursing home, a microphone, and a mother',
    text: 'A woman stands up at a town hall and asks you, in front of her daughter, why her insulin costs more than her mortgage. The room goes silent. The camera stays on you for eleven seconds.',
    choices: [
      {
        label: 'Answer honestly, including what you cannot fix',
        detail: 'The unscripted human answer.',
        effects: { mom: 12, region: { midwest: 1.4, south: 0.6, northeast: 0.5 } },
        outcome: 'You look like a person. The clip runs uncut on three networks and one of them is not friendly.',
      },
      {
        label: 'Make a concrete promise on the spot',
        detail: 'Bold. Very binding.',
        effects: { mom: 9, risk: 0.45, funds: -8 },
        outcome: 'The promise is enormous and it lands. Your policy team spends the night deciding whether it is even legal.',
      },
      {
        label: 'Pivot to your prescription drug plan',
        detail: 'Answer the question with a brochure.',
        effects: { mom: -6, funds: 2 },
        outcome: 'The plan is real and good. The delivery is the problem, and she can tell, and so can everyone watching.',
      },
    ],
  },
  {
    id: 'flood',
    title: 'The River Takes the Town',
    icon: 'water',
    tone: 'crisis',
    weight: 3,
    kicker: 'Two hundred miles of floodwater',
    text: 'Record flooding has displaced tens of thousands across two states. Your opponent is already there in a borrowed pair of boots. You are four hours behind and nobody would notice if you stayed home.',
    choices: [
      {
        label: 'Go, and stay past the cameras',
        detail: 'Do the boring part of disaster relief.',
        effects: { mom: 11, funds: -6, region: { south: 1.2, midwest: 0.8 } },
        outcome: 'You stay four days, most of it off-camera. A county sheriff tells a reporter you were the only candidate who helped with the cleanup.',
      },
      {
        label: 'Announce a rapid aid package',
        detail: 'Solve the problem instead of visiting it.',
        effects: { mom: 7, funds: -10, region: { south: 0.9, midwest: 0.6 } },
        outcome: 'Aid starts moving within seventy-two hours. Your opponent photo-op starts looking thin by Friday.',
      },
      {
        label: 'Keep your schedule, send the relief',
        detail: 'Trust the machinery.',
        effects: { mom: -4, funds: 4, region: { south: -0.6 } },
        outcome: 'The aid works. The absence is the story. A local anchor calls it a leadership question, which is the polite version.',
      },
    ],
  },
  {
    id: 'book_deal',
    title: 'Somebody Wrote a Book',
    icon: 'book',
    tone: 'scandal',
    weight: 3,
    kicker: 'Embargo lifts Tuesday',
    text: 'A tell-all by a former senior staffer is coming out with a 200,000-copy first printing. Three excerpts have already leaked and two of them are about you.',
    choices: [
      {
        label: 'Dismiss it as fiction and move on',
        detail: 'Starve the story.',
        effects: { mom: -1, funds: 3 },
        outcome: 'It sells a million copies and nobody in your campaign reads it, on the record.',
      },
      {
        label: 'Do a combative hour-long interview',
        detail: 'Take the fight into the open.',
        effects: { mom: 7, risk: 0.45 },
        outcome: 'You get one great exchange and one honest answer that will be used against you. Net positive, in a way no strategist would have planned.',
      },
      {
        label: 'Release your own book the same week',
        detail: 'Counter-program. Expensive, audacious.',
        effects: { mom: 9, funds: -9, region: { northeast: 0.3 } },
        outcome: 'Nobody has ever done this. It kind of works. The book charts at number two and the tell-all at number three.',
      },
    ],
  },
  {
    id: 'convention',
    title: 'Your Convention Drifts',
    icon: 'entertainment',
    tone: 'chaos',
    weight: 3,
    kicker: 'Confetti, then an unscheduled speaker',
    text: 'On the third night of your convention, the floor revolts and an entirely unplanned speaker takes the podium. The balloon drop happens during a protest chant. It is the most-watched hour of television this year.',
    choices: [
      {
        label: 'Let it play, then land the closing speech of your life',
        detail: 'Chaos into control, in four days.',
        effects: { mom: 14, region: { northeast: 0.9, west: 0.8, midwest: 0.6 } },
        outcome: 'The speech is the one they will teach. You get a seven-point bump that mostly holds.',
      },
      {
        label: 'Have security clear the floor',
        detail: 'Order at any cost.',
        effects: { mom: -5, risk: 0.3, region: { south: 0.5 } },
        outcome: 'It looks, on twenty-four-hour cable, like a party that cannot govern itself. The control room cuts away mid-scuffle.',
      },
      {
        label: 'Give the unscheduled speaker the closing slot',
        detail: 'Radical. Possibly genius.',
        effects: { mom: 10, risk: 0.5 },
        outcome: 'It is the most talked-about convention moment since 1968 and you cannot control what they say next, so you hold your breath for four minutes.',
      },
    ],
  },
  {
    id: 'housing',
    title: 'Rents Jump 14%',
    icon: 'civic-building',
    tone: 'crisis',
    weight: 4,
    kicker: 'A rent notice, photographed by a million people',
    text: 'A viral screenshot of a rent increase has become the defining economic image of the late summer. Every young voter in the country is posting their own. Your opponent has a plan. So should you.',
    choices: [
      {
        label: 'Propose a national housing build program',
        detail: 'Supply. Slow, big, credible.',
        effects: { mom: 8, funds: -12, region: { west: 1.2, northeast: 0.9 } },
        outcome: 'Economists call it the most serious housing proposal in forty years. It also takes four minutes to explain and voters have ninety seconds.',
      },
      {
        label: 'Attack corporate landlords by name',
        detail: 'Populism, aimed precisely.',
        effects: { mom: 12, funds: -6, risk: 0.35, region: { west: 1.0, midwest: 0.6 } },
        outcome: 'The crowd turns feral. A hedge fund runs an ad about property rights and accidentally makes your point for you.',
      },
      {
        label: 'Argue the market will cool on its own',
        detail: 'The honest answer. The worst option.',
        effects: { mom: -10, funds: 8 },
        outcome: 'It might even be true. Every renter under forty hears "you are on your own" and remembers it in November.',
      },
    ],
  },
];

// The whole deck: choice cards plus the nationwide weeks nobody gets a say in.
const CAMPAIGN_BRIEFING = {
  id: 'campaign_briefing',
  title: 'The Campaign Sets Its Priorities',
  icon: 'globe',
  tone: 'hope',
  weight: 0.1,
  kicker: 'The week’s planning meeting',
  fallback: true,
  text: 'No single emergency has taken over the schedule. The campaign has seven days, limited money, and a map of close states where a few conversations may matter. The team needs a clear priority for the week.',
  choices: [
    {
      label: 'Prioritize stops in close states',
      detail: 'Put the candidate and field team where a small shift could change the map.',
      effects: { mom: 1, region: { midwest: 0.2, south: 0.2 } },
      outcome: 'The team puts its stops on the battlegrounds and asks the field operation to get the week moving.',
    },
    {
      label: 'Keep the schedule lean and raise funds',
      detail: 'Save time for donors and leave more money for the final weeks.',
      effects: { funds: 3, mom: -1 },
      outcome: 'The campaign protects the calendar and adds $3M to its reserve.',
    },
    {
      label: 'Hold the message steady',
      detail: 'Keep the campaign’s current line and steady the team without adding a new risk.',
      effects: { mom: 0.5 },
      outcome: 'The campaign keeps its message disciplined and gives the team a small lift.',
    },
  ],
};

const BASE_EVENT_CATALOG = [
  ...BASE_EVENTS,
  CAMPAIGN_BRIEFING,
  ...EXTRA_EVENTS,
  ...MEGA_EVENTS_A,
  ...MEGA_EVENTS_B,
  ...NATION_EVENTS,
  ...DEMOGRAPHIC_EVENTS,
  ...BOOST_EVENTS,
  ...FOUR_PARTY_NEWS_EVENTS,
  ...FACTION_CONFLICT_EVENTS,
  ...EASTER_EGGS,
  ...VANCE_SUCCESSION_EVENTS,
];

// The story engine can only queue continuations whose starter choices carry a
// concrete link, and only those IDs should be available to its lookup table.
// Keep the continuations out of the random draw pool.
export const EVENTS = attachTriggeredEventChainLinks(BASE_EVENT_CATALOG);
const TRIGGERED_CHAIN_EVENTS = materializeTriggeredEventChains();

// The opponent campaign needs a card it can actually play, so it never draws a
// nationwide week, and it never draws an easter egg.
export const CHOICE_EVENTS = EVENTS.filter((e) => e.choices && e.choices.length > 0 && !e.easterEgg && !e.fallback && !e.scriptedOnly);

// Cards the story engine can play are looked up but never drawn at random:
// only EVENTS is in the random pool, so a card that exists must be earned.
export const EVENT_BY_ID = [...EVENTS, ...DERIVED_EVENTS, ...TRIGGERED_CHAIN_EVENTS].reduce((acc, e) => {
  if (acc[e.id]) throw new Error(`Duplicate event ID in Build 34 catalog: ${e.id}`);
  acc[e.id] = e;
  return acc;
}, {});

export const TONE_STYLES = {
  crisis: { bg: 'rgba(232,67,60,0.14)', border: '#E8433C', chip: '#E8433C' },
  chaos: { bg: 'rgba(155,120,255,0.14)', border: '#9B78FF', chip: '#9B78FF' },
  scandal: { bg: 'rgba(240,180,41,0.14)', border: '#F0B429', chip: '#F0B429' },
  hope: { bg: 'rgba(47,180,140,0.14)', border: '#2FB48C', chip: '#2FB48C' },
  wild: { bg: 'rgba(70,150,255,0.14)', border: '#4696FF', chip: '#4696FF' },
  nation: { bg: 'rgba(90,130,220,0.16)', border: '#5B8DEF', chip: '#5B8DEF' },
  egg: { bg: 'rgba(255,122,217,0.13)', border: '#FF7AD9', chip: '#E24BB8' },
};

// Difficulty shifts how often bad news shows up.
function pickWeighted(pool, negativeBias) {
  const weighted = pool.map((e) => {
    const isBad = e.tone === 'crisis' || e.tone === 'scandal';
    const bias = isBad ? negativeBias : 2 - negativeBias * 0.6;
    return { e, w: Math.max(0.2, e.weight * Math.max(0.25, bias)) };
  });
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const x of weighted) {
    r -= x.w;
    if (r <= 0) return x.e;
  }
  return weighted[weighted.length - 1].e;
}

// `preferTone` is what the week's national story was about: after a recession
// print the deck leans economic, after a tape it leans scandal. Without it the
// week's card has nothing to do with the news at all — which is most weeks.
export function drawEvent(usedIds, negativeBias, party, preferTone = null, thirdMode = 'fringe') {
  const pool = EVENTS.filter((e) =>
    !e.nationalOnly && !e.easterEgg && !e.fallback && !e.scriptedOnly
      && (!e.partyOnly || e.partyOnly === party) && (!e.modeOnly || e.modeOnly === thirdMode)
  );
  const available = pool.filter((e) => !usedIds.includes(e.id));
  const list = available.length ? available : pool;
  const weighted =
    preferTone && preferTone !== 'nation'
      ? list.map((e) => (e.tone === preferTone ? { ...e, weight: e.weight * 4 } : e))
      : list;
  return pickWeighted(weighted, negativeBias);
}

export function drawChoiceEvent(usedIds, negativeBias, thirdMode = 'fringe') {
  const pool = CHOICE_EVENTS.filter((e) => !e.nationalOnly && !e.easterEgg && !e.fallback && !e.scriptedOnly && (!e.modeOnly || e.modeOnly === thirdMode));
  const available = pool.filter((e) => !usedIds.includes(e.id));
  return pickWeighted(available.length ? available : pool, negativeBias);
}
