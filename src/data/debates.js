// Three debate nights, three questions each, three answers per question.
//
// Effects are written from YOUR campaign's point of view: `mom` is your
// momentum, `oppMom` is theirs (a positive value hurts them), `region` and
// `states` are map swings in your favour, and `risk` is the chance the answer
// follows you around for a week.

export const DEBATES = [
  {
    id: 'debate1',
    week: 3,
    night: 'First debate',
    venue: 'Prime time, all four major networks',
    title: 'The economic debate',
    stakes: 'Inflation, household costs, and the highest television audience of the campaign.',
    questions: [
      {
        q: 'Groceries cost 19% more than they did in 2024 and voters blame Washington. What would you do in your first hundred days?',
        answers: [
          {
            label: 'Target the major grocery chains',
            tag: 'Populist',
            detail: 'Name the four largest chains, pledge an antitrust investigation, and challenge opponents to defend their margins.',
            reply: 'Your opponent dismisses the proposal as price controls in disguise, splitting reaction in the hall.',
            promise: {
              issueId: 'prices',
              text: 'Open an antitrust case against the four largest grocery chains within the first 100 days.',
            },
            effects: { mom: 3, region: { midwest: 0.6, northeast: 0.3 }, states: { PA: 0.5, OH: 0.4 }, risk: 0.1 },
          },
          {
            label: 'Cut federal spending and taxes',
            tag: 'Fiscal',
            detail: 'Tie inflation directly to federal deficits and propose broad tax reductions to spur supply.',
            reply: 'The moderator presses you on which specific tax cuts you would actually send to Congress.',
            effects: { mom: 2, oppMom: -2, region: { south: 0.5 }, states: { TX: 0.6, FL: 0.4 } },
          },
          {
            label: 'Give a direct answer on price limits',
            tag: 'Candor',
            detail: 'Acknowledge plainly that presidents do not set grocery prices, then outline supply-side steps the White House can take.',
            reply: 'The moderator lets the answer stand, and post-debate focus groups respond favorably to the directness.',
            effects: { mom: 4, region: { west: 0.4 }, states: { NH: 0.4, ME: 0.3 } },
          },
        ],
      },
      {
        q: 'Your opponent says you are beholden to major donors. You have thirty seconds to respond.',
        answers: [
          {
            label: 'Pivot to their top contributors',
            tag: 'Attack',
            detail: 'Read your opponent’s top five industry donors into the record and question their independence.',
            reply: 'Your opponent is prepared for the line and immediately counters with figures from your own donor filings.',
            effects: { mom: 1, oppMom: -3, risk: 0.2 },
          },
          {
            label: 'Cite your donor filings',
            tag: 'Safe',
            detail: 'Walk through your average contribution size, total donor count, and public disclosure record.',
            reply: 'The exchange slows the pace of the debate, which blunts the attack effectively.',
            effects: { mom: 2.5, states: { PA: 0.3, MI: 0.3 } },
          },
          {
            label: 'Deflect and pivot back to policy',
            tag: 'Charm',
            detail: 'Brush off the charge with a brief quip and steer the answer back to your core economic message.',
            reply: 'The line draws laughter in the room, and the clip circulates widely on morning broadcasts.',
            evasive: true,
            clipPotential: { minimumMomentum: 2.5 },
            effects: { mom: 1.5, region: { west: 0.3 }, risk: 0.05 },
          },
        ],
      },
      {
        q: 'Closing statement. You have sixty seconds. Why should voters choose you?',
        answers: [
          {
            label: 'Focus on middle-class costs',
            tag: 'Kitchen table',
            detail: 'Center the closing on household budgets and repeat the core commitments of your campaign.',
            reply: 'Analysts contrast your focused closing with your opponent’s broader policy checklist.',
            effects: { mom: 3, region: { midwest: 0.5 }, states: { MI: 0.5, WI: 0.5, PA: 0.5 } },
          },
          {
            label: 'Appeal directly to the base',
            tag: 'Base',
            detail: 'Deliver an aggressive partisan closing aimed at mobilizing volunteers and core supporters.',
            reply: 'Supporters in the hall applaud loudly, though undecided voters in focus groups react coolly.',
            groupResponseByParty: {
              dem: { 'far left': 0.45, moderate: -0.3 },
              rep: { populistright: 0.45, moderate: -0.3 },
              lib: { libertarian: 0.45, moderate: -0.3 },
              grn: { 'far left': 0.45, moderate: -0.3 },
            },
            effects: { mom: 4.5, risk: 0.18 },
          },
          {
            label: 'Frame the general-election choice',
            tag: 'Contrast',
            detail: 'Lay out two competing governing approaches concisely without adding new policy pledges.',
            reply: 'Post-debate panels call it a disciplined closing that leaves opponents little to clip.',
            effects: { mom: 1.5, oppMom: -2.5 },
          },
        ],
      },
    ],
  },
  {
    id: 'debate2',
    week: 7,
    night: 'Second debate',
    venue: 'Town-hall format with undecided voters',
    title: 'The national security debate',
    stakes: 'Border policy, foreign crises, and voter confidence in your command readiness.',
    questions: [
      {
        q: 'On the southern border, what executive action would you take on day one?',
        answers: [
          {
            label: 'Prioritize border enforcement',
            tag: 'Tough',
            detail: 'Call for additional border agents, expanded detention capacity, and strict enforcement benchmarks.',
            reply: 'The audience remains closely divided, with few undecided voters visibly shifting.',
            effects: { mom: 3, region: { south: 0.8 }, states: { AZ: 0.6, TX: 0.5 }, risk: 0.1 },
          },
          {
            label: 'Pair enforcement with legal pathways',
            tag: 'Balanced',
            detail: 'Outline tighter border security first, followed by expanded legal work and asylum channels.',
            reply: 'Activists on both sides express reservations, while undecided voters in the room respond positively.',
            effects: { mom: 2, region: { west: 0.4 }, states: { NV: 0.5, CO: 0.4 } },
          },
          {
            label: 'Emphasize the humanitarian dimension',
            tag: 'Moral',
            detail: 'Focus on conditions for migrant families in detention facilities and criticize harsh enforcement tactics.',
            reply: 'The answer draws a quiet response from the hall and avoids an immediate rebuttal from the opponent.',
            effects: { mom: 2.5, region: { northeast: -0.4 }, states: { CA: 0.5 }, risk: 0.2 },
          },
        ],
      },
      {
        q: 'If a hostile power conducts a weapons test threatening U.S. allies, would you authorize a military strike?',
        answers: [
          {
            label: 'No, lead with sanctions and allies',
            tag: 'Dove',
            detail: 'Commit to allied coordination and economic sanctions first, while stating clear limits on military action.',
            reply: 'Your opponent labels the approach weak, while foreign-policy analysts note the clear coalition framework.',
            effects: { mom: 1, oppMom: -1, region: { west: -0.3 } },
          },
          {
            label: 'Yes, state a clear red line',
            tag: 'Hawk',
            detail: 'Commit publicly to a military response and set an explicit deterrence standard on stage.',
            reply: 'The tough stance plays strongly with security-minded voters, though opposing ad makers immediately clip the exchange.',
            effects: { mom: 3, region: { south: 0.5 }, states: { NC: 0.4, FL: 0.4 }, risk: 0.15 },
          },
          {
            label: 'Seek congressional authorization first',
            tag: 'Institutional',
            detail: 'Emphasize constitutional war powers and pledge to consult Congress before committing U.S. forces.',
            reply: 'Commentators credit the constitutional grounding, even as some note the measured delivery lacked urgency.',
            effects: { mom: 2, oppMom: -1.5 },
          },
        ],
      },
      {
        q: 'A retired four-star general recently questioned your readiness to serve as commander-in-chief. How do you respond?',
        answers: [
          {
            label: 'Challenge his own record',
            tag: 'Punch back',
            detail: 'Respond directly to the general by citing controversial decisions from his own military tenure.',
            reply: 'You score a sharp rhetorical point, though several veterans in the audience react skeptically.',
            effects: { mom: 1, oppMom: -1, risk: 0.25 },
          },
          {
            label: 'Acknowledge his service and answer the critique',
            tag: 'Steady',
            detail: 'Thank the general for his career, then address his strategic argument briefly and calmly.',
            reply: 'The measured tone defuses the confrontation and keeps the exchange on your terms.',
            effects: { mom: 3, region: { south: 0.5 } },
          },
          {
            label: 'Pivot to veterans’ health care',
            tag: 'Pivot',
            detail: 'Shift the focus to VA staffing, rural clinic access, and support for military families.',
            reply: 'The pivot plays well inside the auditorium, though the general’s original quote still leads morning coverage.',
            effects: { mom: 2, states: { NC: 0.5, VA: 0.4, GA: 0.4 } },
          },
        ],
      },
    ],
  },
  {
    id: 'debate3',
    week: 11,
    night: 'Third debate',
    venue: 'One week before Election Day, studio format with no audience',
    title: 'The closing debate',
    stakes: 'Character, energy policy, and the final televised confrontation of the race.',
    questions: [
      {
        q: 'Your opponent has called your candidacy a threat to the country. Do you view them the same way?',
        answers: [
          {
            label: 'Yes, answer in kind',
            tag: 'Fire',
            detail: 'Skip diplomatic caveats and directly label your opponent’s agenda a danger to democratic norms.',
            reply: 'The sharp exchange dominates cable coverage for the remainder of the week.',
            effects: { mom: 3, oppMom: -3, risk: 0.3 },
          },
          {
            label: 'No, focus on their policy record',
            tag: 'Contrast',
            detail: 'Decline the personal label and instead detail specific policies your opponent plans to enact.',
            reply: 'Your opponent’s team appears caught off guard by the shift back to policy specifics.',
            effects: { mom: 3.5, region: { northeast: 0.4 }, states: { PA: 0.4, MI: 0.4 } },
          },
          {
            label: 'Address voters directly',
            tag: 'Statesman',
            detail: 'Ignore the personal attack and spend ninety seconds outlining your governing priorities to viewers.',
            reply: 'Post-debate analysts split over whether the response projected restraint or ducked the question.',
            effects: { mom: 2.5, region: { midwest: 0.5 } },
          },
        ],
      },
      {
        q: 'On energy and climate policy, what concrete legislation would you expect to sign?',
        answers: [
          {
            label: 'Propose a national clean-power standard',
            tag: 'Bold',
            detail: 'Commit to a fixed emissions target and federal investment schedule.',
            reply: 'Western voters and climate groups welcome the commitment, while energy-producing counties push back.',
            effects: { mom: 2.5, region: { west: 0.6 }, states: { CO: 0.5, WA: 0.4 }, risk: 0.12 },
          },
          {
            label: 'Back permitting reform and nuclear power',
            tag: 'Practical',
            detail: 'Emphasize faster project approvals, transmission upgrades, and next-generation nuclear plants.',
            reply: 'The pragmatic answer avoids partisan blowback, though it generates few memorable soundbites.',
            effects: { mom: 2.5, region: { south: 0.5 }, states: { PA: 0.4, WV: 0.4 } },
          },
          {
            label: 'Frame energy policy around industrial jobs',
            tag: 'Economy',
            detail: 'Focus on domestic manufacturing, union construction jobs, and lower household power bills.',
            reply: 'Labor groups circulate the clip widely, while environmental organizations issue a cautious response.',
            effects: { mom: 2, states: { MI: 0.5, OH: 0.4, WI: 0.3 } },
          },
        ],
      },
      {
        q: 'Final question. Is there anything you want to tell voters that has not come up tonight?',
        answers: [
          {
            label: 'Deliver a late surprise attack',
            tag: 'Risky',
            detail: 'Use the closing minutes for an unscripted hit on your opponent’s most sensitive vulnerability.',
            reply: 'The gamble produces the night’s biggest headline, though aides watch closely for backlash.',
            effects: { mom: 4, risk: 0.25 },
          },
          {
            label: 'Make a direct pitch for voter trust',
            tag: 'Earnest',
            detail: 'Set aside talking points and deliver a brief, plainspoken closing appeal.',
            reply: 'The understated closing draws strong marks from undecided voters in post-debate polling.',
            effects: { mom: 3, region: { midwest: 0.4, northeast: 0.3 } },
          },
          {
            label: 'Rebut their closing point by point',
            tag: 'Counter',
            detail: 'Methodically challenge the claims in your opponent’s closing remarks without consulting notes.',
            reply: 'Commentators praise the command of detail, leaving your rebuttal as the final impression of the night.',
            effects: { mom: 1.5, oppMom: -3, risk: 0.1 },
          },
        ],
      },
    ],
  },
];

export const DEBATE_BY_ID = DEBATES.reduce((acc, d) => {
  acc[d.id] = d;
  return acc;
}, {});

export const DEBATE_BY_WEEK = DEBATES.reduce((acc, d) => {
  acc[d.week] = d;
  return acc;
}, {});
