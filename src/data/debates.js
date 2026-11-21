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
    venue: 'Prime time, all four networks',
    title: 'The kitchen-table debate',
    stakes: 'The economy, and the cost of everything. The highest-rated night of the cycle.',
    questions: [
      {
        q: 'Groceries cost 19% more than they did in 2024 and voters blame Washington. What do you do in your first hundred days?',
        answers: [
          {
            label: 'Take on the grocery chains',
            tag: 'Populist',
            detail: 'Name the four companies, promise an antitrust case, dare anyone to stop you.',
            reply: 'Your opponent calls it “price controls with a nicer font.” The room half-agrees.',
            promise: {
              issueId: 'prices',
              text: 'Open an antitrust case against the four largest grocery chains within the first 100 days.',
            },
            effects: { mom: 3, region: { midwest: 0.6, northeast: 0.3 }, states: { PA: 0.5, OH: 0.4 }, risk: 0.1 },
          },
          {
            label: 'Cut spending, cut taxes',
            tag: 'Fiscal',
            detail: 'The deficit is the inflation, you say, and you have the chart to prove it.',
            reply: 'The moderator asks which of the four tax cuts you just named you would actually sign.',
            effects: { mom: 2, oppMom: -2, region: { south: 0.5 }, states: { TX: 0.6, FL: 0.4 } },
          },
          {
            label: 'Straight answer: nobody can set prices',
            tag: 'Candor',
            detail: 'Say out loud that presidents do not control grocery bills, then explain what does.',
            reply: 'The moderator lets it sit. The room goes quiet in the good way.',
            effects: { mom: 4, region: { west: 0.4 }, states: { NH: 0.4, ME: 0.3 } },
          },
        ],
      },
      {
        q: 'Your opponent says you are bought and paid for. Thirty seconds.',
        answers: [
          {
            label: 'Pivot to their donors',
            tag: 'Attack',
            detail: 'Read their top five contributors into the record, slowly.',
            reply: 'They are ready for it — the counterpunch lands on your own fundraising list.',
            effects: { mom: 1, oppMom: -3, risk: 0.2 },
          },
          {
            label: 'Show the receipts',
            tag: 'Safe',
            detail: 'Average donation, number of donors, the whole ledger on screen.',
            reply: 'It is boring television, which is exactly why it works.',
            effects: { mom: 2.5, states: { PA: 0.3, MI: 0.3 } },
          },
          {
            label: 'Laugh and change the subject',
            tag: 'Charm',
            detail: 'One good line, then back to the question you wanted to answer anyway.',
            reply: 'It plays in the room. The clip will be everywhere by morning.',
            evasive: true,
            clipPotential: { minimumMomentum: 2.5 },
            effects: { mom: 1.5, region: { west: 0.3 }, risk: 0.05 },
          },
        ],
      },
      {
        q: 'Closing statement. Sixty seconds. Why you?',
        answers: [
          {
            label: 'The middle class, over and over',
            tag: 'Kitchen table',
            detail: 'One family, one kitchen, the same three promises you have made all year.',
            reply: 'Your opponent’s closing is a list. Yours is a story.',
            effects: { mom: 3, region: { midwest: 0.5 }, states: { MI: 0.5, WI: 0.5, PA: 0.5 } },
          },
          {
            label: 'Fire up the base',
            tag: 'Base',
            detail: 'Give the people who will knock the doors something to be angry about.',
            reply: 'The hall stands up. The swing voters at home change the channel.',
            groupResponseByParty: {
              dem: { 'far left': 0.45, moderate: -0.3 },
              rep: { populistright: 0.45, moderate: -0.3 },
              lib: { libertarian: 0.45, moderate: -0.3 },
              grn: { 'far left': 0.45, moderate: -0.3 },
            },
            effects: { mom: 4.5, risk: 0.18 },
          },
          {
            label: 'Frame the choice',
            tag: 'Contrast',
            detail: 'Two futures, two sentences each, no new promises.',
            reply: 'It is the cleanest minute of the night and the hardest to attack.',
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
    venue: 'Town-hall format, undecided voters in the room',
    title: 'The commander-in-chief debate',
    stakes: 'The border, the world, and the first time voters see you handle a crisis.',
    questions: [
      {
        q: 'The border. What happens on day one?',
        answers: [
          {
            label: 'Sign the enforcement bill',
            tag: 'Tough',
            detail: 'More agents, more detention, and a number you are willing to repeat.',
            reply: 'The room is split down the middle and neither half moves.',
            effects: { mom: 3, region: { south: 0.8 }, states: { AZ: 0.6, TX: 0.5 }, risk: 0.1 },
          },
          {
            label: 'Enforcement plus a legal pathway',
            tag: 'Balanced',
            detail: 'Two sentences of each, in that order, so nobody can quote you out of context.',
            reply: 'Both wings of your own party wince. Undecideds nod.',
            effects: { mom: 2, region: { west: 0.4 }, states: { NV: 0.5, CO: 0.4 } },
          },
          {
            label: 'Call it what it is: a humanitarian crisis',
            tag: 'Moral',
            detail: 'Talk about the children in the holding facilities and refuse to move on.',
            reply: 'It is the most human moment of the night and the least answerable.',
            effects: { mom: 2.5, region: { northeast: -0.4 }, states: { CA: 0.5 }, risk: 0.2 },
          },
        ],
      },
      {
        q: 'A hostile power tests a weapon. Do you authorize a strike?',
        answers: [
          {
            label: 'No — sanctions and allies',
            tag: 'Dove',
            detail: 'Coalition first, then consequences, and say plainly what you will not do.',
            reply: 'Your opponent calls it weakness. The moderator calls it a plan.',
            effects: { mom: 1, oppMom: -1, region: { west: -0.3 } },
          },
          {
            label: 'Yes — and say it out loud',
            tag: 'Hawk',
            detail: 'Draw the red line, name the date, let the room hear the certainty.',
            reply: 'It lands hard. So does the three a.m. ad they cut from it.',
            effects: { mom: 3, region: { south: 0.5 }, states: { NC: 0.4, FL: 0.4 }, risk: 0.15 },
          },
          {
            label: 'Consult Congress first',
            tag: 'Institutional',
            detail: 'One branch, one vote, one precedent you would rather set now than later.',
            reply: 'The answer is correct and the delivery is slow, and the room notices both.',
            effects: { mom: 2, oppMom: -1.5 },
          },
        ],
      },
      {
        q: 'A retired general says you are not ready to be commander-in-chief. Respond.',
        answers: [
          {
            label: 'Name his record',
            tag: 'Punch back',
            detail: 'Take the general on directly, with the parts of his career he would rather forget.',
            reply: 'You win the exchange and lose the veterans in the third row.',
            effects: { mom: 1, oppMom: -1, risk: 0.25 },
          },
          {
            label: 'Respect the uniform, keep the substance',
            tag: 'Steady',
            detail: 'Thank him, then answer the actual criticism in two sentences.',
            reply: 'The moderator visibly relaxes, which tells you how the night is going.',
            effects: { mom: 3, region: { south: 0.5 } },
          },
          {
            label: 'Pivot to veterans’ care',
            tag: 'Pivot',
            detail: 'Turn it into the one issue you can talk about for an hour without notes.',
            reply: 'It works in the room. The general’s quote still leads the morning shows.',
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
    venue: 'One week out, no audience, no notes',
    title: 'The closing debate',
    stakes: 'Character, climate, and the last hour of persuasion anyone will sit through.',
    questions: [
      {
        q: 'Your opponent calls you a threat to the country. Do you call them one back?',
        answers: [
          {
            label: 'Yes. Say it plainly',
            tag: 'Fire',
            detail: 'No hedging, no “with respect” — put the words in the same sentence they used.',
            reply: 'The clip is brutal and it will run for six days.',
            effects: { mom: 3, oppMom: -3, risk: 0.3 },
          },
          {
            label: 'No — but list what they would do',
            tag: 'Contrast',
            detail: 'Specific policy, specific consequences, no adjectives.',
            reply: 'Their campaign has no answer prepared, and it shows.',
            effects: { mom: 3.5, region: { northeast: 0.4 }, states: { PA: 0.4, MI: 0.4 } },
          },
          {
            label: 'Talk past them, straight to camera',
            tag: 'Statesman',
            detail: 'Ignore the table entirely and answer the country for ninety seconds.',
            reply: 'It is either the moment of the campaign or an evasion, and the spin room splits.',
            effects: { mom: 2.5, region: { midwest: 0.5 } },
          },
        ],
      },
      {
        q: 'Climate. What would you actually get done?',
        answers: [
          {
            label: 'A national clean-power standard',
            tag: 'Bold',
            detail: 'One number, one date, and a promise to spend the capital on it.',
            reply: 'The West lights up. The coal counties in three states do not.',
            effects: { mom: 2.5, region: { west: 0.6 }, states: { CO: 0.5, WA: 0.4 }, risk: 0.12 },
          },
          {
            label: 'Permitting reform and nuclear',
            tag: 'Practical',
            detail: 'Build things faster, argue about the rest later.',
            reply: 'It is the answer nobody can attack and nobody will remember.',
            effects: { mom: 2.5, region: { south: 0.5 }, states: { PA: 0.4, WV: 0.4 } },
          },
          {
            label: 'It is a jobs plan',
            tag: 'Economy',
            detail: 'Talk about the plant, the paycheck, and the town that gets both.',
            reply: 'Union halls clip it. Environmental groups issue a careful statement.',
            effects: { mom: 2, states: { MI: 0.5, OH: 0.4, WI: 0.3 } },
          },
        ],
      },
      {
        q: 'Last question. Anything you want to say that you have not?',
        answers: [
          {
            label: 'Go for the kill',
            tag: 'Risky',
            detail: 'One final, unrehearsed attack on the thing they are most sensitive about.',
            reply: 'It might be the line people remember — if it does not blow up first.',
            effects: { mom: 4, risk: 0.25 },
          },
          {
            label: 'Ask for the country’s trust',
            tag: 'Earnest',
            detail: 'Drop the register entirely and say the plainest true thing you know.',
            reply: 'The room, the moderator, and the control room all go silent.',
            effects: { mom: 3, region: { midwest: 0.4, northeast: 0.3 } },
          },
          {
            label: 'Rebuttal, from memory',
            tag: 'Counter',
            detail: 'Take their closing apart, sentence by sentence, without notes.',
            reply: 'It is a masterclass, and it is also the last thing voters hear.',
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
