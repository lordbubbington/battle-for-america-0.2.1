// The shipped encyclopedia. Anything saved from the in-game editor lands on the
// WikiArticle record with the same slug and replaces only the body, so the pages
// below stay the fallback if a record is ever deleted.
export const WIKI_ARTICLES = [
  {
    slug: 'how-to-play',
    title: 'How a campaign works',
    section: 'Basics',
    body: `Campaigns begin on the selected launch date (**January 1, April 1, or August 1, 2028**) and conclude on Election Day, **November 7**. A January start provides forty-four campaign weeks, while an August start provides fourteen. Once a weekly action is taken, it cannot be reversed.

Each week provides six core campaign actions: rallies, town halls, volunteer drives, fundraising, position changes, and debate preparation. Advertising and Ground Game draw from campaign funds, while Detailed Polling is free to consult. These three menus remain accessible alongside the weekly action list. The opening week contains no decision card. Subsequent weeks schedule one, two, or three choice-bearing events, and the final week schedules five. A decision card pauses further actions until the player selects an outcome.

Between one campaign week and the next, the active event card resolves, the opposing campaign executes its seven weekly actions, and independent outside groups place paid media.

Once the weekly action allowance is exhausted, the player advances the week. Passive income is credited, field operations apply weekly persuasion, and state margins update until Election Day arrives and ballots are counted.`,
  },
  {
    slug: 'electoral-college',
    title: 'The electoral map',
    section: 'Basics',
    body: `A presidential candidate requires **270 electoral votes** to win outright under the 2020 census apportionment.

Forty-eight states and the District of Columbia award their electors on a winner-take-all basis. **Maine and Nebraska** allocate electors by congressional district, awarding one elector to each district winner and two to the statewide plurality winner. Those five congressional districts appear as separate selectable units beneath the national map and accept campaign actions like states.

In any state contested by three or more tickets, the candidate who receives the **highest vote share** wins the state's electoral votes. A simple plurality is sufficient, allowing third-party or regional tickets to win electoral votes without clearing 50 percent.

If no candidate reaches 270 electoral votes, including in a 269-269 tie, the House of Representatives selects the president through a contingent election. Each state delegation casts one vote, and the party controlling a majority of state delegations prevails.

When the **decide it by the popular vote** option is enabled at setup, electoral allocations are advisory and the presidency is awarded directly to the national popular-vote leader.`,
  },
  {
    slug: 'alternative-election-rules',
    title: 'House and Electoral College rule options',
    section: 'Mechanics',
    body: `The House allocation rule and the Electoral College allocation rule are configured independently at setup. The national popular-vote setting remains separate and overrides the Electoral College outcome whenever enabled.

**House PR** retains the 435-seat chamber and distributes each state's delegation according to modeled House vote share. A party must reach **5% of the national House vote** to qualify for seats, and qualifying shares are renormalized prior to each state's calculation. Largest-remainder rounding preserves exact state and chamber seat totals.

**Mixed-member proportional (MMP)** expands the chamber to **870 seats**, combining 435 single-member constituency seats from the district projection with 435 state party-list seats. Parties qualify at 5% nationally or by winning at least three constituency seats. Constituency winners keep their seats, and each state's list seats are assigned to qualifying parties with the largest proportional shortfalls using deterministic rounding.

Under the default Electoral College rule, states are winner-take-all except Maine and Nebraska. **Proportional electors** distributes each state's electors among parties reaching at least 5% of that state's vote. **District plan** awards two electors to the statewide winner and allocates the remaining electors according to projected House district totals, while the District of Columbia retains its three constitutional electors. Both alternative systems preserve the 538-elector total.`,
  },
  {
    slug: 'polling',
    title: 'Polls, ratings, and polling error',
    section: 'Mechanics',
    body: `Each state's polling margin is derived from its partisan baseline, policy alignment with the state's electorate, accumulated campaign persuasion, national trend, and sampling noise.

Campaign momentum does not enter the polling margin directly. Instead, momentum governs turnout conversion and weekly vote drift. A campaign whose momentum exceeds its voters' baseline turnout propensity by five or more points receives a weekly probability equal to that gap of lifting turnout by three points, at a cost of three momentum points (never dropping below 50). Conversely, a campaign whose voters are fifteen points more likely to turn out than its momentum indicates loses two turnout points per week.

Momentum also applies a narrow persuasion modifier ranging from **-0.5% at zero** to **+0.5% at one hundred**, with 50 acting as neutral. Additional voter movement generated by this modifier draws against a shared weekly cap of **0.5% of the modeled electorate**. Once that cap is reached, standard persuasion continues normally and direct turnout actions remain unaffected.

Displayed figures represent **polls**, whereas Election Night tallies reflect the **result**, which adds a hidden polling error generated at campaign start. That error combines national, regional, and state-level components, allowing correlated misses across adjacent states in either direction.

Permanent field operations are the sole mechanism capable of reducing a state's hidden polling error.

On Medium difficulty and higher, state displays report **categorical ratings** (Lean, Likely, Solid) rather than exact margins. Any margin within **two points** is classified as a **Tossup** and highlighted in teal across all maps.`,
  },
  {
    slug: 'turnout',
    title: 'Turnout and the vote count',
    section: 'Mechanics',
    body: `Polling shares measure voter preference, while state outcomes are determined by **raw ballots cast**, calculated by multiplying each party's support by the share of its voters who turn out. Vote totals are tracked in hundreds to keep arithmetic in whole numbers.

Every party begins with the same baseline turnout rate within a given state, ranging between 55 and 65 percent (highest in the Northeast and lowest in the South), with distinct starting figures for each state. Modeled turnout never drops below **40 percent** for any party, including third-party tickets.

Direct campaign activity moves turnout. Rallies, volunteer drives, mailers, and positive advertisements raise the acting campaign's turnout, while attack advertisements, gaffes, and adverse news suppress an opponent's turnout. Regional bonuses operate as turnout shifts across the entire region, whereas single-state bonuses continue to affect persuasion.

Because turnout gains draw from the remaining non-voting population, marginal returns decline as turnout rises. For example, a ten-point nominal gain at 80 percent turnout yields 82 percent rather than 90 percent. The interface displays rounded percentages, while the engine retains four decimal places internally.

Certain nominees carry regional or state turnout modifiers, such as **Rubio** adding one point in the South and **DeSantis** adding one point in Florida. These mechanics follow the same rules for every candidate on the ballot.

Debates and news stories alter voter preference rather than voting habits, shifting polling margins without directly modifying turnout.`,
  },
  {
    slug: 'money',
    title: 'Campaign finance and upkeep',
    section: 'Mechanics',
    body: `At the start of each campaign week, base passive income is drawn once from **$8M to $12M** and stored with the campaign state. Field operations contribute a smaller supplemental income stream. Donor faction standing then adjusts gross income, and weekly expenses are deducted at the week boundary. Momentum does not affect fundraising or passive income.

Weekly expenses consist of fixed campaign overhead plus the recurring upkeep of all active state field operations. Expanding infrastructure beyond what weekly income can cover steadily drains funds available for paid media.

Starting campaign balances scale by difficulty: $750M on Cupcake, $300M on Easy, $225M on Medium, $187.5M on Hard, $82.5M on Brutal, and $60M on Nightmare. Third-party campaigns begin with $15M, and major-party opponents begin with $225M.

Advertising rates scale with each state's media market and rise over the course of the calendar, costing roughly 40% more in the final week than in the opening week. Attack advertisements carry a 15% cost premium. The HUD displays the current cash balance without a fixed net-income badge, since weekly income vary with income draws and faction standing.

The engine does not model debt or bankruptcy, and campaign balances are floored at zero.`,
  },
  {
    slug: 'actions',
    title: 'The six actions',
    section: 'Mechanics',
    body: `**Campaign stop** conducts a rally in one state, adding three points of local turnout along with smaller spillover effects in neighboring states and the surrounding region. Roughly one stop in ten also produces a small persuasion gain.

**Town hall marathon** carries an approximately even outcome split, producing two points of turnout and a modest persuasion gain when well received, or a one-point turnout penalty in the state following a misstep.

**Volunteer drive** normally costs **$3M** and generates direct state turnout. An active faction mobilization perk can waive the cost and increase the effect for one use before expiration.

**Fundraise** solicits donors in a selected state. Larger states and states favorable to the ticket yield higher totals. Repeated visits to the same state return eight percent less each time, and each fundraising action costs three points of momentum.

**Change a position** adjusts the candidate's stance on a single issue. Each subsequent shift carries escalating momentum and polling penalties, and prior stances remain recorded for opponent attacks.

**Debate prep** banks preparation sessions for the upcoming debate, up to a maximum of three stored sessions.`,
  },
  {
    slug: 'ground-game',
    title: 'Field operations',
    section: 'Mechanics',
    body: `The **Ground Game** planner is located beneath Buy Ads during an active campaign. Players may select target infrastructure levels for any state where their ticket holds ballot access. The planner displays total upfront cost, remaining cash, and added weekly upkeep. Selecting **Buy upgrades** commits the entire plan using campaign funds without consuming weekly actions, while closing the planner discards unconfirmed changes. Purchased levels persist in saved games across three tiers per state: **field office**, **regional operation**, and **full state machine**.

Field operations provide three ongoing effects:

- **Turnout:** Each tier raises the campaign's turnout in that state, adding directly to its Election Night ballot count.
- **Persuasion:** Each tier applies recurring weekly persuasion in the campaign's favor, subject to diminishing returns as the state moves further from even.
- **Polling accuracy:** Reaching level three reduces the state's hidden polling error by roughly one quarter.

Exact infrastructure levels and weekly upkeep for any state can be reviewed in the **More information** drawer beneath the map.`,
  },
  {
    slug: 'detailed-polling',
    title: 'Detailed Polling',
    section: 'Mechanics',
    body: `The **Detailed Polling** menu beneath Ground Game provides state-level survey reports at no cost. Selecting a state displays a modeled 600-voter sample, party vote shares, margin of error, and demographic insights that update as campaign conditions change.`,
  },
  {
    slug: 'ads',
    title: 'Advertising',
    section: 'Mechanics',
    body: `Paid advertising consumes campaign funds rather than weekly actions. The player selects target states, an issue, a medium, and either a positive or attack framing. Campaigns may purchase placements in as many states as available funds permit. Each state placement is priced independently and rolls its own execution quality, meaning the same campaign message can perform well in one state and underperform in another.

An advertisement affects **only the states in which it airs**. It does not alter campaign momentum, the national environment, or adjacent states.

Baseline effectiveness depends on two variables: **alignment between the candidate's stance and the state's electorate** on the chosen issue, and **local salience of that issue**. High alignment on a salient issue delivers substantial turnout returns, whereas poor alignment on a low-salience issue produces minimal return.

Each placement then undergoes a quality roll. Roughly one in five placements underperforms and moves the state against the sponsor, while roughly one in seven outperforms its baseline projection.

Paid media primarily governs **turnout** rather than persuasion. Positive advertisements raise the sponsor's turnout, and attack advertisements suppress the opponent's turnout at comparable overall election-night impact.

Two adverse risks are rolled independently, allowing both to occur on a single buy. A **local backfire** shifts one to two points of state margin and reduces the sponsor's local turnout, and **attack advertisements backfire more frequently than positive spots**. In rare cases, a story spreads nationally, costing four points in the target state and one point across the national map.`,
  },
  {
    slug: 'platform',
    title: 'Issues, stances, and voter blocs',
    section: 'Mechanics',
    body: `Every candidate holds a defined stance on each tracked policy issue. Each state contains a distinct distribution of **voter blocs**, and each bloc carries its own issue preferences.

Combining candidate stances with state bloc distributions yields a state's **policy fit**, which enters directly into the state's polling margin. A platform aligned with regional priorities can be worth several points across a region prior to any campaign travel.

The **More information** drawer for any state displays its bloc breakdown and, for the eight highest-salience issues, compares the state's median preference against the candidate's current position.

Candidates may alter their position on an issue during the campaign, but each shift imposes a momentum cost followed by a nationwide polling penalty that escalates with each subsequent change.`,
  },
  {
    slug: 'debates',
    title: 'The three debates',
    section: 'Mechanics',
    body: `Campaigns include three scheduled debates, each consisting of three sequential questions. Debate answers affect persuasion (including momentum, regional margins, and individual state margins), and high-risk responses can trigger a follow-up scandal during the following week.

**Debate prep** is the only action that improves baseline performance beforehand. Each banked session raises answer scores, lowers gaffe probability, and stacks up to a cap of three sessions.

At the close of each debate, all three responses are scored together. A decisive win reduces the opposing campaign's momentum, while a poor showing shifts momentum and polling margins unfavorably.`,
  },
  {
    slug: 'events',
    title: 'Events, scandals, and risk',
    section: 'Mechanics',
    body: `Campaign weeks open with a decision or news card tied to current game state. Stories are selected based on the national headline, recent local coverage in states where the campaign has operated, prior actions or policy shifts, or structural pressures such as finances and coalition standing. Each card indicates the condition that triggered it.

Event choices include deterministic options and probabilistic rolls with two possible branches, where one branch is drawn at random and only its effects apply. Any **risk** indicator reflects a live probability of triggering a scandal whose severity is not disclosed in advance. A sixty percent risk can produce either a minor momentum loss or a major setback.

Certain follow-up events require a recorded incident receipt before they can enter the queue. The receipt logs the event type, location, and week, and the follow-up card cites that record. For example, a completed town hall records all three questions, selected response styles, and the audience score before a follow-up media choice becomes eligible. A story that remains active across two news cycles can also unlock a response choice after spin is applied, and leaked-memo follow-ups quote the text stored in the original event. Catalog entries without matching in-game evidence remain inactive.

Because paid advertisements primarily affect turnout rather than polling, ad follow-up cards reference the state turnout report and do not award an additional polling bonus.

The opposing campaign draws from the same context-aware event rules, and its choices appear in the campaign log with explanations. Scheduled debates, town halls, conventions, Easter eggs, and national bulletins operate in separate queues. When no unused event fits the current week, the campaign receives a standard planning briefing covering travel, fundraising, or message discipline.

Scandals also impose an immediate nationwide vote penalty regardless of where the story originated: **0.1%** of the vote for a minor scandal, **0.5%** for a serious scandal, and **2%** for a major scandal.

Higher difficulty settings increase both scandal frequency and severity.`,
  },
  {
    slug: 'downballot',
    title: 'Senate, House, and governors',
    section: 'Mechanics',
    body: `The Senate begins at **40 Democrats and 26 Republicans** following the 2026 midterms, leaving the 34 Class 3 seats contested in 2028 to determine chamber control. A majority requires 51 seats.

Downballot contests respond to state political environments and local candidate quality at different rates:

- **Senate:** Tracks roughly 55% of the state's presidential margin, adjusted for local candidate quality.
- **House:** Each of the 435 districts starts from its own partisan baseline, which moves with the state's generic ballot and House-specific local effects rather than presidential nominee or running-mate modifiers. District listings indicate whether each baseline uses reported 2026 returns or a labeled 2024 fallback. Chamber control requires 218 seats.
- **Governors:** Eleven states hold gubernatorial elections, with a smaller top-of-ticket coattail effect than federal legislative races.

Every downballot contest also receives a hidden local candidate-quality roll revealed in October, plus an independent election-night error term. Any race within two points is rated as a **Tossup**.

When enabled at setup, independent candidates can also appear on the Senate ballot in North Dakota, South Dakota, and Idaho.`,
  },
  {
    slug: 'state-legislatures',
    title: 'State legislatures and the 2028 schedule',
    section: 'Mechanics',
    body: `The **State legislatures** tab tracks 7,386 statutory legislative seats alongside the 2024 chamber baseline and available district results. Each seat carries equal weight regardless of district population. Opening a district entry displays available source metadata, incumbent or party records, election years, and redistricting boundary vintages.

Scheduled 2028 seats are projected from their state's current generic ballot combined with the sourced district lean, while unscheduled seats carry forward their 2024 holders. Where a district lean, incumbent record, boundary match, or seat class is unavailable, the forecast leaves the seat unresolved. Because Nebraska maintains a nonpartisan legislature, the model does not assign partisan winners to its seats.

The 2024 baseline, the 2028 projection, and Election Night calls are maintained separately. Projections do not certify outcomes, and unmodeled legislative races are not called on Election Night.`,
  },
  {
    slug: 'ballot-measures',
    title: 'Ballot measure tracker',
    section: 'Mechanics',
    body: `The **Ballot measures** tab serves as a reference index for source-checked 2028 statewide ballot measures and constitutionally scheduled questions. Each entry records official status, election date, a brief summary, and a reference to the public election authority. Listing a measure as eligible or constitutionally due does not imply final ballot certification.

The California initiative recorded in this dataset has verified signatures and is classified as eligible pending formal qualification, which the Secretary of State projects for June 29, 2028 unless withdrawn (based on the listed 874,641 signature threshold). Connecticut, Hawaii, and Illinois have constitutional-convention questions scheduled under their state constitutions, with final certification pending.

This reference index is separate from campaign decision events. It does not supply polling data or automatically generate campaign cards; the event engine requires a verified state-specific legal pathway and measure record before activating a ballot-measure decision.`,
  },
  {
    slug: 'third-parties',
    title: 'Third parties and independents',
    section: 'Mechanics',
    body: `Third-party baseline strength is chosen at setup from three tiers: **fringe**, **serious**, or **insurgent**. At campaign launch, the engine applies a randomized regional tilt favoring one minor party over the other in areas such as the Mountain West.

Third-party vote shares are drawn from the total electorate rather than added on top of major-party totals. Any minor-party candidate who finishes first in a state wins that state's electoral votes outright.

In Senate races, optional independent candidates can contest North Dakota, South Dakota, and Idaho, and Evan McMullin can appear on the Utah ballot. Standard independent candidates are shaded purple in maps and charts, while McMullin uses orange in Utah. All independent Senate seats are counted outside major-party caucuses in chamber control totals.`,
  },
  {
    slug: 'difficulty',
    title: 'Difficulty levels',
    section: 'Basics',
    body: `**Cupcake** begins with $750M in campaign funds and applies the most forgiving opponent behavior and polling accuracy settings.

**Easy** begins with $300M, displays exact state polling margins, uses a less efficient opponent, and applies narrower polling errors.

**Medium** represents the standard campaign balance, starting with $225M, categorical state ratings instead of exact numbers, and full opponent adaptation.

**Hard** begins with $187.5M, sharper opponent targeting, tighter state margins, and a more demanding news cycle.

**Brutal** begins with $82.5M, an adverse news environment, and sustained opponent pressure in competitive states.

**Nightmare** begins with $60M, highly disciplined opponent scheduling, wider polling errors, elevated scandal risk, and continuous pressure across battleground states. Difficulty selection also applies a multiplier to the final campaign score.`,
  },
  {
    slug: 'national-desk',
    title: 'The national desk',
    section: 'Mechanics',
    body: `Each week opens with a national news item drawn from **one hundred cataloged stories** before the campaign's own event card is dealt. Topics range from macroeconomic releases and foreign-policy developments to weather emergencies and candidate-level controversies.

National desk stories shift the **national environment** (the shared baseline against which states poll) and update the **generic ballot** across all fifty states. Competitive battleground states register larger shifts than safe states, and geographically localized events such as severe storms or plant closures affect the entire ballot in the impacted state.

Certain stories operate as **running stories** that persist across multiple weeks. An economic contraction penalizes the governing party each week it remains active, while a sustained growth cycle benefits it. Active running stories and their remaining durations appear in the national environment panel and conclude only through subsequent news developments rather than direct player actions.

Twenty optional stories cover fictional Republican campaign missteps. These trigger only when the rival campaign's recorded plan produces a matching evidence receipt, which the News Desk displays alongside the headline. Each receipt fires at most once, with diminishing national impact on later occurrences, and all entries represent in-game scenarios rather than claims about real individuals.

National headlines also supply context for weekly campaign cards. When the national story does not match an eligible card, recent field activity, local coverage, policy changes, finances, or coalition standing determine the week's briefing.`,
  },
  {
    slug: 'election-night-forecast',
    title: 'Election Night and the live forecast',
    section: 'Mechanics',
    body: `Election Night reports presidential, congressional, and gubernatorial tallies as precincts report. The **Nick Bronze live forecast** blends counted ballots with modeled expectations for outstanding votes. As reporting percentages increase, race uncertainty narrows and projected probabilities update ahead of formal race calls.

The House and Senate panels also display simulated chamber-control probabilities and median seat projections. These figures are probabilistic estimates rather than formal calls, which follow separate thresholds based on both vote lead and remaining uncounted ballots.`,
  },
  {
    slug: 'vance-succession',
    title: 'Vance’s alternate-history succession story',
    section: 'Mechanics',
    body: `When JD Vance is an active Republican presidential candidate while Donald Trump is set as the sitting president, the campaign may deal a five-part **fictional alternate-history** succession sequence. Its opening card states explicitly that the scenario depicts an imagined transfer of power rather than real events or predictions.

The sequence uses the normal weekly event queue, dealing at most one part per week. Across the arc, Vance's modeled moderate support increases while MAGA faction standing and Republican turnout decline. Player choices adjust that balance, and the save file records the sitting president, completed parts, and cumulative modifiers.`,
  },
  {
    slug: 'state-environments',
    title: 'State environments and the generic ballot',
    section: 'Mechanics',
    body: `Alongside the presidential map, every jurisdiction maintains its own **generic ballot** reflecting underlying House and Senate polling. The **State environments** panel ranks all fifty-one jurisdictions from closest to widest margin.

Three factors move a state's environment:

- **Local news:** Produces the largest shift, moving the entire state ballot rather than only the presidential race.
- **National stories:** Apply across all states simultaneously, weighted by local political composition.
- **Campaign rallies:** Affect the state environment at **half** the strength applied to the presidential margin, and at **one quarter** strength where the House or Senate race is already within five points.

Each week, state environments revert partially toward each state's baseline lean, and the **national environment adjusts toward their combined average**. Senate, House, and gubernatorial projections all read directly from these state environments.`,
  },
  {
    slug: 'campaign-calendar',
    title: 'Debates, early voting, and deadlines',
    section: 'Campaign',
    body: `The **Campaign office -> Calendar** tab tracks upcoming campaign milestones. Debate weeks compete with preparation and field activity for weekly actions. Early presidential ballots are tallied at the close of the two weeks preceding the final week, locking in party totals for voters who cast ballots at those checkpoints. Subsequent persuasion and turnout shifts apply only to the remaining electorate. The calendar displays early ballots already cast and marks states or rules where district-level ballot data is unavailable.

Each milestone lists priority states, a recommended action, and a **Focus** control that selects the state on the main map for immediate follow-up.

Because the campaign is set in 2028, milestone dates follow a simplified game calendar for planning purposes rather than an official state-by-state statutory schedule.`,
  },
  {
    slug: 'opponent-adaptation',
    title: 'How the opponent adapts',
    section: 'Campaign',
    body: `The opposing campaign updates its weekly schedule in response to the polling map, local news, and the player's recent activity. Competitive states remain primary targets. Heavy investment by the player can draw counter-campaigning, while neglected battleground states invite opponent expansion. Field-oriented rivals prioritize permanent offices and volunteer drives, whereas media-oriented candidates more often respond to public messaging.

The opponent budgets across remaining weeks by holding a reserve for late advertising, releasing more reserve funds when the national race tightens, and adjusting spending risk according to candidate style. When the rival logs a stop or paid advertisement in a state the player has not recently visited, the rival log records the action and may trigger a response card. The opponent also allocates effort to competitive Senate, House, gubernatorial, and scheduled state-legislative races.

The opposing campaign can also encounter internal faction disputes. Its chosen response alters its saved faction standing, affecting future turnout efficiency and donor income. Its seven-action weekly plan may include local surrogates, town halls, issue ads, fundraising, debate preparation, downballot support, and recovery days alongside rallies and field operations, with paid media attached to ad actions so the log remains within seven entries.

Repeated advertisements, promises, and messaging establish an issue profile that the opponent can challenge. If a campaign makes a promise and later shifts its stance on that issue, the contradiction becomes a recorded attack line (applied locally for state-specific pledges or in a competitive state for national debate pledges).

Because recent campaign focus decays over time, opponent targeting shifts as polling evolves. The rival log summarizes where the opponent is active and which issues it is contesting. Libertarian and Green campaigns follow separate weekly objectives: building toward the modeled 5% national threshold, defending it when close, or consolidating support in their strongest states.`,
  },
  {
    slug: 'incidents-and-news-desk',
    title: 'Campaign incidents and the News Desk',
    section: 'Campaign',
    body: `The News Desk functions as a read-only briefing. Opening or dismissing a story does not re-apply its mechanical effects.

Contextual decision cards require a committed campaign outcome with matching recorded evidence, such as an ad result, a debate response, or a broken promise. Beginning in campaign week ten, an opponent can exploit a neglected competitive state; if resolved, that interruption deducts five points from the player's margin before presenting response options. Unverified ballot and access scenarios remain disabled.

Standard weeks schedule one, two, or three decision cards with 10%, 30%, and 60% probabilities, respectively. Week one has no decision cards and the final week contains five slots. Earned incidents appear at subsequent action checkpoints, and empty checkpoints are noted in the campaign log. Ending a week early forfeits unused actions and resolves any remaining due decisions before the week closes.`,
  },
  {
    slug: 'super-pac-weekly-pressure',
    title: 'Super PAC pressure',
    section: 'Campaign',
    body: `Independent expenditure groups purchase issue advertisements in states aligned with their issue, party, and regional priorities. The weekly campaign log reports total spending along with breakdowns by PAC, state, issue, and ad format.

Outside advertisements operate at one-fifth the strength of official campaign buys and contribute to general campaign fatigue in the states where they air. Weekly summaries are recorded once per week, and reloading a saved game does not re-apply outside placements.`,
  },
  {
    slug: 'party-factions',
    title: 'Party factions, crises, and milestones',
    section: 'Campaign',
    body: `Each party's internal factions maintain individual **0 to 100 standing** scores. Faction names, priorities, and routine bonuses vary by party: organizers support field work and turnout, labor strengthens operations in priority states, moderates aid persuasion, party officials assist with campaign coordination, and donors influence campaign income. Higher standing strengthens the corresponding bonus, and faction standing updates in response to actions and event choices. Organizer, labor, moderate, official, donor, faith, youth, climate, and ballot-access groups each follow separate effect curves rather than a single shared bonus. The faction panel also displays specialist reach, including faith-based turnout, youth volunteer reach, climate pledges, and third-party ballot-access work.

A faction triggers its **0-support crisis** once per campaign if its standing reaches zero. The associated penalty applies immediately before queuing a response card, potentially reducing voter support, turnout, field or downballot strength, cash reserves, or weekly income. Ongoing crisis penalties persist until faction standing recovers to at least 20. Response choices can begin restoring standing, though they do not reverse penalties already applied.

A faction triggers its **100-support milestone** once per campaign upon reaching maximum standing. The follow-up card offers faction-specific deployment options, such as a volunteer operation, targeted turnout, downballot coordination, media backing, or a short-term capped income boost. These cards use the normal decision queue without replacing national news or exceeding the weekly event limit.

Campaigns may also draw one-time internal conflict cards pitting two party factions against each other, such as labor versus suburban moderates for Democrats or social conservatives versus business groups for Republicans, as well as donor-versus-activist trade-offs. Each choice adjusts faction standing, voter support, and campaign resources.

Milestone flags and active crisis states are stored in campaign saves. Crossing a boundary again does not re-trigger a completed milestone, and 0-support and 100-support milestones are tracked independently.`,
  },
  {
    slug: 'candidate-ratings',
    title: 'Candidate skill ratings',
    section: 'Reference',
    body: `Every candidate profile lists four ratings on a **1 to 20** scale: debate, speech, rally, and corruption. These figures provide a quick comparison across the candidate field. The scale is calibrated so that each category averages **10** across all candidates, with only a few ratings at the 1 or 20 extremes.

Skill ratings supplement each candidate's regional, national, and issue modifiers. They do not function as a standalone polling forecast, and high ratings do not offset poor policy alignment, adverse events, or ineffective state targeting.`,
  },
  {
    slug: 'synthetic-voters',
    title: 'The voter model',
    section: 'Reference',
    body: `State policy alignment, coalition estimates, and ballot totals are computed from a versioned synthetic electorate sample. Each modeled voter holds an individual issue-position profile and may belong to multiple overlapping demographic or ideological groups (such as age brackets, education tiers, ideology, religion, or race). Overlapping group memberships are not double-counted; each modeled voter represents a single voter.

Voter profiles determine demographic support and coalition responses to position changes. National generic-ballot news is distributed across states using an equal blend of partisan fit and issue alignment. Final ballot totals reflect modeled state vote counts, while polling margins incorporate candidate modifiers, state baselines, campaign work, news, and sampling error. The campaign map displays first-choice voter preferences, and turnout determines Election Day ballot counts alongside early votes locked in at prior checkpoints.`,
  },
  {
    slug: 'developer-actions',
    title: 'Developer actions',
    section: 'Reference',
    body: `The local developer panel is intended for testing and scenario inspection. Pressing **Ctrl/Cmd + Shift + D** and selecting **DEV** in the header opens controls to inject events, adjust campaign funds, modify state or national persuasion, adjust turnout, restore weekly actions, and clear fatigue.

Because these actions alter campaign state directly, using developer controls makes a run unsuitable for standard score comparisons.`,
  },
  {
    slug: 'easter-eggs',
    title: 'Rare unscheduled event cards',
    section: 'Mechanics',
    body: `The event deck contains a small set of extremely rare, unscheduled novelty cards that sit outside standard balance parameters.

These cards trigger at very low probability during ordinary play, and the **developer panel** (accessible via the DEV header button or Ctrl/Cmd + Shift + D) can inspect the full deck inventory or force a specific card into the current week for testing.`,
  },
];

export const WIKI_BY_SLUG = WIKI_ARTICLES.reduce((acc, a) => ({ ...acc, [a.slug]: a }), {});

export const WIKI_SECTIONS = ['Basics', 'Mechanics', 'Campaign', 'Reference'];
