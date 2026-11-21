// The shipped encyclopedia. Anything saved from the in-game editor lands on the
// WikiArticle record with the same slug and replaces only the body, so the pages
// below stay the fallback if a record is ever deleted.
export const WIKI_ARTICLES = [
  {
    slug: 'how-to-play',
    title: 'How a campaign works',
    section: 'Basics',
    body: `The clock starts on the date you pick — **January 1, April 1 or August 1, 2028** — and always stops on **November 7**. A January launch is forty-four weeks of campaign; August is fourteen. Every one of them is a set of choices you cannot take back.

Your six campaign actions are rallies, town halls, volunteer drives, fundraising, changing a position, and debate prep. Advertising and Ground Game use campaign funds. Detailed Polling is free. These three menus are available alongside your campaign actions. The opening week has no decision card. Later weeks schedule one, two, or three choice-bearing events, and the final week schedules five. A card pauses your next action only until you choose an outcome.

Between your week and the next one, three other things happen: the event card in front of you resolves, the opponent takes their own seven actions, and an outside group spends money nobody approved.

When you run out of actions, advance the week. Money comes in, the field operation keeps persuading, and the map drifts. Do that until the calendar runs out and the votes are counted.`,
  },
  {
    slug: 'electoral-college',
    title: 'The electoral map',
    section: 'Basics',
    body: `**270 electoral votes** wins, and the map is fixed at 2020 census allocations.

Every state is winner-take-all except **Maine and Nebraska**, which split by congressional district — one vote per district, two to the statewide winner. Those five districts appear as separate chips under the map and can be campaigned in like a state.

A state with three or more candidates is won by whoever has the **most votes**, not by one of the two major parties. That is how a third-party campaign can actually take electoral votes.

If nobody reaches 270, the House decides the presidency by state delegation, one vote per state — whoever controls the most delegations wins. In a 269–269 tie, the same rule applies.

Switch on **decide it by the popular vote** at setup and none of this matters: the presidency goes to whoever wins the most votes nationally, and the College becomes a very elaborate opinion poll.`,
  },
  {
    slug: 'alternative-election-rules',
    title: 'House and Electoral College rule options',
    section: 'Mechanics',
    body: `The House rule and Electoral College rule are separate setup choices. The popular-vote option remains independent and still decides the presidency when selected.

**House PR** keeps 435 seats and allocates each state’s seats by modeled House vote share. A party must reach **5% of the national House vote** to receive seats; qualifying votes are renormalized before each state allocation. Largest-remainder rounding keeps every state and the chamber at the correct seat total.

**Mixed-member proportional (MMP)** uses **870 seats**: 435 constituency seats from the House projection plus 435 state list seats. National parties qualify at 5%, or by winning at least three constituency seats. Constituency wins are retained. Each state’s fixed list seats then go to qualifying parties with the largest proportional shortfalls, with deterministic rounding.

The standard Electoral College rule is winner-take-all except for Maine and Nebraska, which split by district. **Proportional electors** divides each state’s electors among parties with at least 5% of that state’s vote. **District plan** gives two electors to the statewide winner and assigns the remaining electors using the state’s projected House district seat totals; the District of Columbia keeps its constitutional three electors. Both alternatives preserve 538 total electors.`,
  },  {
    slug: 'polling',
    title: 'Polls, ratings, and why they lie',
    section: 'Mechanics',
    body: `Every margin on the map is built from the same ingredients: the state's base lean, how well your platform fits its voters, your campaign's accumulated work there, national drift, and sampling noise.

Momentum is not one of those ingredients. It moves voters and nothing else: a campaign running hot drags its own turnout up, cools itself doing it, and pulls vote share off every party it is running against. A party five or more points hotter than its own people are likely to vote gets, every week, a chance equal to that gap of lifting its turnout three points, and each lift costs three points of momentum, never below fifty. A party whose people are fifteen points more likely to vote than its mood suggests sheds two points a week instead.

Momentum also changes persuasion very slightly: it ranges from **−0.5% at zero** to **+0.5% at one hundred**, with 50 neutral. Only the extra voter movement caused by this modifier counts toward a shared weekly limit of **0.5% of the modeled electorate**. Once that small budget is used, ordinary persuasion still works; direct turnout actions are not affected by this modifier.

What you see is a **poll**. What you get is the **result** — the same number plus a hidden miss that was rolled before the campaign started. It is shared nationally, tilted by region, and noisy state by state, which is how you get the real-world pattern: under-polling by two nationally, five in the Midwest, seven in Iowa, two in Ohio. It runs both ways.

Field operations shave a little off that miss. Nothing else does.

On Medium and above you get **ratings instead of numbers** — Lean, Likely, Solid. Anything inside **two points** is a **Tossup** and turns teal across every map.`,
  },
  {
    slug: 'turnout',
    title: 'Turnout and the vote count',
    section: 'Mechanics',
    body: `A poll is not a vote. Each party has its own **turnout** in each state, and a state is called on **raw votes**: what a party's own people believe, multiplied by how many of them actually show up. Votes are counted in hundreds, so the arithmetic stays in whole numbers.

Every party starts on the same number in a given state, and the number belongs to the state: 55 to 65 percent, highest in the Northeast and lowest in the South, and no two states on the same figure. Nobody ever counts below **40 percent**, third parties included.

Campaign work is what moves it. A rally, a volunteer drive, a mailer or a spot for yourself lifts your own number; an attack ad, a gaffe or a bad night suppresses theirs. Regional bonuses are turnout bonuses too — a good week in the South reminds the whole South to vote — while a bonus to a single state still moves minds.

Turnout eats into the non-voting share, so it gets harder to move the higher it climbs: ten points at 80 percent becomes 82, not 90. You see the number rounded to the nearest percent; the game keeps four decimal places.

**Rubio** turns out the South a point better. **DeSantis** turns out Florida a point better. Whoever the nominee is, the same rules apply to everyone on the ballot.

Debates and the news are different: they change minds, not habits. The polls move, the turnout does not.`,
  },
  {
    slug: 'money',
    title: 'Money in, money out',
    section: 'Mechanics',
    body: `At the start of each campaign week, the game draws base income once from **$8M to $12M** and saves that amount with the campaign. Field operations add a smaller income stream. The donor faction then adjusts the total, and expenses are taken out at the week boundary. Momentum brings in no money at all: it moves voters, and nothing else.

Expenses are a fixed overhead plus the weekly cost of every field operation you own. If you build a state machine you cannot fund, it eats your ad budget one week at a time.

New campaigns start with 50% more money than the prior build: $750M on Cupcake, $300M on Easy, $225M on Medium, $187.5M on Hard, $82.5M on Brutal, and $60M on Nightmare. Third-party campaigns start with $15M; major-party opponents start with $225M.

Ad buys scale with the media market of the state and get **more expensive late**: the same buy costs about 40% more in the last week than in the first. Attack ads carry a 15% premium. The HUD shows your current balance; the weekly net-income badge has been removed so a variable draw is not mistaken for guaranteed income.

There is no debt and no bankruptcy. Funds simply refuse to go below zero.`,
  },
  {
    slug: 'actions',
    title: 'The six actions',
    section: 'Mechanics',
    body: `**Campaign stop** — a rally in one state. Three points of turnout there, a nudge across the region, a whisper in the neighbours. One stop in ten also changes a few minds, at a quarter of what a rally used to be worth.

**Town hall marathon** — roughly a coin flip: two points of turnout and a fraction of a point of persuasion when it breaks out, or a gaffe that costs the state a point of turnout.

**Volunteer drive** — normally costs **$3M** and moves real turnout. A faction mobilization can waive the cost and strengthen one operation; use it before the perk expires. Turnout is what saves you when the polls are wrong.

**Fundraise** — work the donor room in one state. Bigger states and states that already lean your way hand over more, the same room gives eight percent less each time you return, and it costs three momentum.

**Change a position** — every flip costs more than the last, and the other side keeps the clips.

**Debate prep** — three sessions max, banked for the night.`,
  },
  {
    slug: 'ground-game',
    title: 'Field operations',
    section: 'Mechanics',
    body: `Open **Ground Game** below Buy Ads during a campaign. Choose target levels for any states where your ticket has ballot access. The planner shows the price, cash remaining, and added weekly upkeep. **Buy upgrades** confirms the whole plan with campaign funds and uses no weekly actions. Closing the planner discards your draft. Purchased levels remain in your save. There are three levels per state: **field office**, **regional operation**, and **full state machine**.

What it buys:

- **Turnout** — each level lifts your own turnout in the state, and every vote you bank there is counted when the state is called.
- **Persuasion** — each level keeps nudging the state your way every week, with diminishing returns as the state gets further from even.
- **A shorter miss** — level three knocks roughly a quarter off that state's hidden polling error.

You can inspect any state's exact level and weekly bill in the **More information** drawer under the map.`,
  },
  {
    slug: 'detailed-polling',
    title: 'Detailed Polling',
    section: 'Mechanics',
    body: `Open **Detailed Polling** below Ground Game and select a state. The free report shows the current modeled 600-voter sample, polling shares, uncertainty, and available insights. It updates as the campaign changes.`,
  },
  {
    slug: 'ads',
    title: 'Advertising',
    section: 'Mechanics',
    body: `Ads cost money, not time. Pick your states, an issue, a medium, and whether you are promoting yourself or attacking them. You can buy in as many states at once as the war chest allows: each one is priced on its own and rolls its own quality, so the same spot can land in Ohio and bomb in Nevada.

A buy moves **only the states it runs in**. It never touches momentum, the national mood, or the state next door.

Strength depends on two things: **how much that state agrees with your stance** on the issue, and **how much the issue matters there**. A perfectly aligned buy in a state that cares is worth several rallies; a mismatched one in a state that does not is a receipt.

Every buy then rolls quality. About one in five simply bombs — you lose money and the state moves against you. Roughly one in seven lands clean and hits above its weight.

A spot decides **who shows up**, not what they think: a positive spot lifts your own turnout, an attack suppresses theirs, and the two are worth roughly the same on election night.

Two things can go wrong on top, and they are rolled separately, so one buy can manage both. A **local backfire** makes the spot itself the story in that state: one to two points of mind gone, and your own turnout there down with it. **Attack ads backfire more often than positive ones.** Far more rarely the story escapes the state altogether — four points where it ran, one across the whole map.`,
  },
  {
    slug: 'platform',
    title: 'Issues, stances, and voter blocs',
    section: 'Mechanics',
    body: `Every candidate carries a position on each of the issues in the game — a stance, not a slogan. Every state has a mix of **voter blocs**, and each bloc has its own preference on each issue.

Put them together and you get a state's **policy fit**: how many of its voters your platform actually speaks to. That number is a direct term in the state's polling margin, so a platform that fits the Midwest is worth several points in the Midwest without a single rally.

The **More information** drawer on any state shows the bloc composition and, for the eight highest-salience issues, the state's median answer next to how well your own stance fits it.

Changing a position is allowed and always costs: momentum first, then a spread across every state, both escalating with each flip.`,
  },
  {
    slug: 'debates',
    title: 'The three debates',
    section: 'Mechanics',
    body: `Three nights, one question at a time, three questions each. Answers change minds — momentum, regions, individual states — and risky answers can follow you for a week as a scandal.

**Debate prep** is the only thing that changes the math before you walk in: each banked session adds a little to every answer on the night, blunts the chance of a gaffe, and caps at three.

At the end of the night the three answers are scored. Win it decisively and your opponent's momentum takes the hit; lose it and the map barely moves, in the wrong direction.`,
  },
  {
    slug: 'events',
    title: 'Events, scandals, and risk',
    section: 'Mechanics',
    body: `The week opens with a campaign card, sometimes with a choice and sometimes with no choice at all. A story can appear when it connects to the national headline, recent local coverage where your campaign has worked, a recent action or policy choice, or a real campaign pressure such as money or coalition support. The card explains why it fits this week.

Choices are graded and some are rolls: two possible branches, one drawn at random, and only its effects land. **Risk** on a card is a real chance of a scandal, and the severity is hidden. A sixty percent risk sometimes costs three points of momentum and sometimes eleven.

Some follow-up cards require a saved incident receipt first. The receipt records what happened, where, and when; the interruption explains why it appeared. For example, the completed town hall stores all three prompts, the selected response approaches, and the audience score in campaign history before a Q&A-sharing choice can appear. A story that remains prominent after two recorded news updates can also lead to a response choice after you spin it. The leaked-memo follow-up quotes the line stored in the original event. Catalog entries with no matching in-game evidence stay dormant.

Paid ads primarily change turnout, not opinion polls. Their follow-up uses the buy’s state-level turnout report, and it does not grant a second polling bonus.

The rival draws from the same context-aware rules and its choice appears in the campaign history with a reason. Scheduled debates, town halls, conventions, Easter eggs, and national bulletin cards stay in their own systems. If no unused story fits the week, the campaign gets a planning briefing about stops, fundraising, or message discipline instead.

A scandal also costs you **voters**, nationally and at once: a minor one **0.1%** of the vote, a serious one **0.5%**, and a career-level one **2%** — the same everywhere, no matter which state the story broke in.

Difficulty scales both the chance and the severity. The press corps is not neutral.`,
  },
  {
    slug: 'downballot',
    title: 'Senate, House, and governors',
    section: 'Mechanics',
    body: `The Senate starts at **40 Democrats and 26 Republicans** — the result of the 2026 midterms — and the 34 Class 3 seats up in 2028 decide the rest. 51 seats is control.

Downballot races respond to state conditions and local candidates, but not in the same way:

- **Senate** — about 55% of the presidential margin, plus the quality of the recruit.
- **House** — each district starts with its own partisan lean. The state's generic ballot and House-specific local effects move that baseline; presidential candidate and running-mate effects do not. The district list shows whether its baseline uses reported 2026 totals or a clearly marked 2024 historical fallback. 218 of 435 seats wins it.
- **Governors** — eleven states, and a smaller top-of-ticket effect than either chamber.

Each race also has a local candidate-quality roll nobody sees until October, and its own election-night error. Anything inside two points shows as a **Tossup**.

In North Dakota, South Dakota and Idaho an independent can be on the Senate ballot if you switch that option on at setup.`,
  },
  {
    slug: 'state-legislatures',
    title: 'State legislatures and the 2028 schedule',
    section: 'Mechanics',
    body: `The **State legislatures** tab lists 7,386 statutory seats, the 2024 chamber baseline and available district results. A seat counts as one seat regardless of its population. Open district details to see available sources, candidate or party information, election years and boundary vintages.

A scheduled seat is projected from its state's current generic ballot plus its sourced district lean. Seats outside the election carry forward their known 2024 holders. When a district lean, holder, boundary match, or seat class is missing, the forecast leaves it unresolved. Nebraska is nonpartisan; the forecast does not assign its seats a party winner from the statewide generic ballot.

The 2024 baseline, 2028 forecast and actual calls are separate. A forecast does not certify an election result. The playtest does not call unmodeled legislative races on Election Night.`,
  },
  {
    slug: 'ballot-measures',
    title: 'Ballot measure tracker',
    section: 'Mechanics',
    body: `The **Ballot measures** tab is a reference tracker for source-checked 2028 statewide measures and constitutionally due questions. It records official status, election date, a short description, and a link to the responsible public source. A measure shown as eligible or constitutionally due is not necessarily certified for the final ballot.

The California initiative in this snapshot has verified signatures and is eligible but not yet qualified. The Secretary of State says it is expected to qualify on June 29, 2028 unless withdrawn; the listed 874,641 figure is the signature threshold. Connecticut, Hawaii, and Illinois have constitutional-convention questions due under their respective schedules, with final ballot certification pending.

This reference list is separate from campaign decision events. It provides no public polling and does not itself create campaign choices. The campaign event system requires a verified state-specific legal route and measure record before it can generate a ballot-measure event; unsupported measures remain inactive.`,
  },
  {
    slug: 'third-parties',
    title: 'Third parties and independents',
    section: 'Mechanics',
    body: `Third-party strength is set at setup: **fringe**, **serious**, or a full **insurgent** run. The board tilts randomly on top of that — one party does better in the Mountain West than the other, and which one is decided when the campaign begins.

Third-party votes are not added to a major party's total, they come out of it. A candidate who clears the field in a small state can win its electoral votes outright.

On the Senate side, the independent options are North Dakota, South Dakota and Idaho, and Evan McMullin can be on the Utah ballot. Independent candidates use purple in maps and charts; McMullin keeps his own orange in his Utah race. All independent seats still count as "not a major party" in the chamber math.`,
  },
  {
    slug: 'difficulty',
    title: 'The five difficulties',
    section: 'Basics',
    body: `**Cupcake** starts you with $750M and offers the gentlest opponent and polling settings.

**Easy** starts you with $300M, gives you exact margins, a clumsy opponent and polls that mostly tell the truth.

**Medium** is the intended race: $225M, ratings instead of numbers, a real opponent.

**Hard** starts with $187.5M and gives the opponent a skill multiplier above one. It also turns on **Drift**: every state slides **0.1** points toward your opponent each week, and states inside five points slide an extra **0.1**.

**Brutal** starts with $82.5M, a news cycle that hunts you, and a hard drift: **0.2** a week everywhere, **0.3 more** in the states that decide it.

**Nightmare** starts with $60M, an opponent who rarely errs, polls that miss wide, a press corps with receipts, and drift of **0.5** a week — **1 full point** in a swing state. Difficulty also multiplies your final score.`,
  },
  {
    slug: 'national-desk',
    title: 'The national desk',
    section: 'Mechanics',
    body: `Every week opens with the country's news, before your own card: **one of a hundred stories**, filed whether or not anybody asked. A recession print, a war scare, a hurricane, a tape of you from 2009, your running mate on an open mic.

The desk moves the **national environment** — the mood every state is polling against — and the **generic ballot** in all fifty states. The battlegrounds feel a story harder than the rest, and a national story that lands on one state (a hurricane, a plant closure) drags its whole ballot with it.

Some stories **run for weeks**. A contraction pays out against the governing party every week it lasts; an AI boom pays out for them. Those are called **running stories**, they show on the national environment panel with how many weeks are left, and nothing you do ends one — only the news does.

Twenty optional stories can cover fictional Republican-campaign mistakes. They appear only after the rival’s recorded plan creates a receipt with supporting evidence; the News Desk shows that evidence with the headline. Each receipt publishes once, and later stories have smaller national effects. These stories are in-game scenarios, not claims about real people.

The national headline is one of several ways to make a campaign card timely. When it does not connect, recent field work, local reporting, policy moves, finances, and coalition health can supply the context. If no story fits, the campaign uses its planning briefing.`,
  },
  {
    slug: 'election-night-forecast',
    title: 'Election Night and the live forecast',
    section: 'Mechanics',
    body: `Election Night reports state, district, and down-ballot results as ballots arrive. The **Nick Bronze live forecast** combines counted vote shares with the campaign model for ballots still outstanding. As more votes are reported, the uncertainty attached to that race shrinks; the forecast updates before the desk is ready to call it.

The House and Senate panels also show simulated control chances and middle-of-the-range seat estimates. These are projections, not race calls. Calls follow separate rules that account for the lead and how much of the vote has been counted.`
  },
  {
    slug: 'vance-succession',
    title: 'Vance’s alternate-history succession story',
    section: 'Mechanics',
    body: `If JD Vance is an active Republican presidential candidate while Donald Trump is the sitting president, the game can deal a five-part **fictional alternate-history** succession arc. Its first card explicitly describes an imagined transfer of power; it is not a claim or prediction about real events.

The cards use the normal weekly event schedule, with at most one part in a week. Vance’s modeled moderate support rises across the story while the MAGA faction and Republican turnout take a cost. Your responses change the balance, and the game saves the sitting president, delivered parts, and cumulative effects.`,
  },
  {
    slug: 'state-environments',
    title: 'State environments and the generic ballot',
    section: 'Mechanics',
    body: `The presidential map is not the only map. Every state carries its own **generic ballot** — what a House or Senate race there is actually polling — and the **State environments** panel tracks all fifty-one of them, tightest race first.

Three things move a state's environment:

- **Local news**, hardest. A plant closing or a hospital opening moves the whole ballot in that state, not just the top of it.
- **National stories**, which land in every state at once, unevenly.
- **Your rallies** — but only at **half** the strength they hit the state's presidential margin, and **a quarter** where the House or Senate race is already inside five points, because those voters are drowning in ads and mail already.

Environments settle back toward the state's own lean every week, and the **national environment is pulled around by the average of them**: when fifty state environments move, the country moves with them.

The Senate, House and governor models all read the state's environment, not just its presidential margin.`,
  },
  {
    slug: 'campaign-staff',
    title: 'The campaign staff',
    section: 'Campaign',
    body: `Before week one, choose three advisors alongside the permanent Chief of Staff. Choose from thirteen traditional advisors and three specialists sampled for your campaign. Your selections are final.

The **Staff** tab shows what your active advisors recommend and the evidence they used. Field staff look at local turnout, the pollster reads the map, policy checks promises and message fit, and the Chief of Staff helps you compare competing priorities. Operations can flag an affordability or upkeep problem. When changing a stance, the Policy Director flags a conflict with an open promise.

Before you act, choose one agenda for the week. **Open action** takes you to the existing control with its recommended target; it does not spend anything. The exact matching action can use the agenda once, within its listed scope. Ads and press work can still backfire. The weekly debrief reports whether you used the agenda, carried out the priority without its bonus, or did something else.

Each selected specialist occupies one position. Staff have no weekly upkeep. Specialist effects require the situation shown on the card. The selection menu labels effects that have no supported campaign action. A resumed campaign keeps its active roster.`,
  },
  {
    slug: 'campaign-calendar',
    title: 'Debates, early voting, and deadlines',
    section: 'Campaign',
    body: `The **Campaign office → Calendar** tab tracks the major milestones remaining in your run. Debate weeks compete with preparation and field work. Early presidential ballots are modeled at the close of the two weeks before the final week. Their party totals are saved at each closing checkpoint. Later persuasion and turnout affect the remaining electorate. The calendar shows ballots already cast and labels electoral rules or states where district ballot data is unavailable.

Each milestone lists states to consider, a suggested tactic, and a **Focus** button. Focusing a state selects it on the map so the next action or ad buy can go there.

The election is set in 2028, so these dates are a simplified game schedule for campaign decisions. They are not an official state-by-state legal calendar. Check current election officials for real registration and voting dates.`,
  },
  {
    slug: 'opponent-adaptation',
    title: 'How the opponent adapts',
    section: 'Campaign',
    body: `The rival’s weekly plan changes with the polling map, local news, and your campaign’s recent focus. Close states remain attractive targets. States where you have invested heavily can draw a counter-campaign, while close states you have neglected can become openings for the opponent. Field-oriented rivals may spend on permanent operations or volunteer drives; media candidates are more likely to answer your public message.

The rival budgets across the remaining weeks: it keeps a reserve for later advertising, releases more of that reserve when the national race is close, and lets candidate style affect spending risk. When it records a stop or paid ad in a state your campaign has not recently worked, the rival log names the state and the move; that documented entry can lead to a response card. It also targets competitive Senate, House, governor, and scheduled state-legislature races.

The rival can also face a conflict between its own party factions. Its choice changes its saved faction standing; that can affect the value of future turnout work and donor income. Its seven-action weekly plan can include local surrogates, town halls, issue ads, fundraising, debate preparation, downballot support, and recovery days, alongside rallies and field operations. Paid media details are attached to the planned ad action so the action log stays within seven.

Repeated ads, promises, and message work build an issue signal. The opponent can challenge that message; candidates with different campaign styles respond in different ways. If you make a promise and later change your position on the same issue, that promise becomes a recorded attack line. A state-specific promise can be used in that state; a national debate pledge without a state is used in a close competitive state.

Your recent focus fades over time, so the opponent’s response changes as polling and campaign attention shift. Check the rival log to see where they are campaigning and what they are answering. Libertarian and Green campaigns also set their own weekly goals: build toward the modeled national 5% vote-share threshold, protect it when support is close, or consolidate in states where their ticket is already strongest. The rival log shows which goal is guiding their state targeting.`,
  },
  {
    slug: 'incidents-and-news-desk',
    title: 'Campaign incidents and the News Desk',
    section: 'Campaign',
    body: `The News Desk is a passive briefing. Reading or dismissing a story does not apply its effects again.

Contextual decisions require a committed campaign result with matching evidence. An ad result, a debate answer or a broken promise can produce a decision when its exact conditions are met. A rival can take advantage of a neglected close state starting in campaign week ten. If the movement can be resolved, that interruption takes five points from the player's margin before the response is shown. Unverified ballot and access scenarios stay off.

Ordinary weeks target one, two, or three cards with 10%, 30%, and 60% probabilities. Week one has no decisions and the final week has five slots. Later cards arrive at their action checkpoints. An incident earned this week can appear at the next eligible checkpoint. An empty checkpoint is recorded in the campaign log. Ending the week gives up the remaining actions and presents any due decisions before the week closes.`,
  },
  {
    slug: 'super-pac-weekly-pressure',
    title: 'Super PAC pressure',
    section: 'Campaign',
    body: `Independent groups buy issue ads in states that match their issue, party and regional priorities. Open the weekly campaign log to see placement totals, issue and state breakdowns, and grouped detail by PAC, state, issue and ad type.

Outside ads operate at one-fifth of campaign ad strength. They create general campaign fatigue in the states where they air. A weekly summary is filed once; loading a save does not air those ads again.`,
  },
  {
    slug: 'party-factions',
    title: 'Party factions, crises, and milestones',
    section: 'Campaign',
    body: `Your party’s factions have separate **0–100 standing**. Their names, priorities, and routine benefits depend on your party: organizers affect field work and turnout, labor improves operations in its priority states, moderates improve persuasion, officials help with campaign coordination, and donors affect income. High standing increases the relevant benefit; faction changes also reflect campaign actions and choices. Organizer, labor, moderate, official, donor, faith, youth, climate, and ballot-access strengths use separate effect curves instead of one shared faction bonus. The faction panel shows specialist reach, including faith-supported turnout, youth volunteer reach, climate promises, and third-party ballot-access work.

A faction can trigger its **0-support crisis** once per campaign when its standing crosses to zero. The campaign applies the faction-specific loss immediately, then queues a response card. That loss can include weaker voter support or turnout, reduced field or downballot strength, lost funds, or lower income. The ongoing crisis penalty remains until that faction’s standing is rebuilt to at least 20. A response can begin repairing the relationship, but it cannot undo damage already applied.

A faction can also trigger its **100-support milestone** once per campaign when standing reaches 100. The next response card offers faction-specific ways to deploy its boost, such as a volunteer operation, targeted turnout, downballot coordination, media support, or a short capped income increase. The card uses the existing decision queue and does not replace national news or exceed the week’s event schedule.

The campaign also presents one-time conflict cards that pit two valid party factions against each other. For example, the Democratic labor-versus-suburbs card asks you to choose between a stronger workplace pledge and flexible language for competitive districts; the Republican faith-versus-business card weighs a social-policy commitment against the economic message. Donor-versus-activist cards can trade a platform change for a major fundraising event. These choices change faction standing, voter support, and campaign resources.

Milestone keys and active crises are saved with the campaign. Reaching the same boundary again does not repeat that milestone; a faction’s 0 and 100 milestones are tracked separately.`,
  },
  {
    slug: 'candidate-ratings',
    title: 'Candidate skill ratings',
    section: 'Reference',
    body: `Each candidate card lists four ratings from **1 to 20**: debate, speech, rally, and corruption. These summarize candidate strengths for comparing the field. The rating scale is balanced across all candidates: each category averages **10**, with only a handful of 1s and 20s across the whole field.

The ratings complement the candidate’s regional, national, and issue modifiers. They are not a polling forecast by themselves, and a strong rating does not erase a poor policy fit, a bad event, or a weak state strategy.`,
  },
  {
    slug: 'synthetic-voters',
    title: 'The voter model',
    section: 'Reference',
    body: `State issue fit, coalition estimates, and ballot totals use a versioned synthetic electorate sample. Each modeled voter has an individual issue-position profile and can belong to several overlapping groups such as an age range, education level, ideology, religion, or racial group. A voter who belongs to three groups is still one voter; group estimates are not added together.

The profiles feed group support and the coalition response to policy changes. National generic-ballot news is redistributed by state using an even blend of partisan fit and agreement with the issue. Ballot totals use modeled state vote counts, while polling margins also reflect candidate quality, state leans, campaign work, news, and sampling noise. The campaign map shows first-choice voter preferences. Turnout affects the count of Election Day ballots and the early votes recorded at each earlier checkpoint.` ,
  },
  {
    slug: 'developer-actions',
    title: 'Developer actions',
    section: 'Reference',
    body: `The local developer panel is for testing. Press **Ctrl/Cmd + Shift + D** and select **DEV** in the game header. It can inject an event, adjust campaign funds, persuade swing states or the whole map, raise turnout, restore actions, and clear fatigue.

These controls change the campaign state immediately. Use them to inspect events and mechanics or to move quickly through scenarios; developer actions can make a run unsuitable for comparing normal campaign scores.`,
  },
  {
    slug: 'easter-eggs',
    title: 'The deck with no business being here',
    section: 'Mechanics',
    body: `There are cards in the deck that should not exist. They are extremely rare, they are not balanced, and they were not reviewed by anyone.

You will know one when it happens. Nobody else will believe you.

The **developer panel** — the DEV button in the header, admin only, or ctrl/cmd + shift + D on any device — can force a card into the open week, hand you cash, and shows the deck's full inventory.`,
  },
];

export const WIKI_BY_SLUG = WIKI_ARTICLES.reduce((acc, a) => ({ ...acc, [a.slug]: a }), {});

export const WIKI_SECTIONS = ['Basics', 'Mechanics', 'Campaign', 'Reference'];
