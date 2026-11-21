// Two cards that move voters instead of states. `groups` names a demographic
// group and the amount its opinion of you moves; the swing it produces in each
// state is that amount scaled by how many of those voters live there.
//
//   groups — permanent group-share shift, weighted by population per state

export const DEMOGRAPHIC_EVENTS = [
  {
    id: 'gaza_rupture',
    title: 'The Ceasefire Vote Comes Due',
    icon: 'weather',
    tone: 'crisis',
    weight: 3,
    kicker: 'Security Council, 4:12am',
    text: 'A resolution is on the table, the cameras are already lit, and both of your foreign-policy advisers are talking at once. One says the base has been waiting two years for a clean answer. The other says six swing states have a Jewish electorate that votes, an evangelical electorate that votes harder, and a Muslim community that has stopped answering the phone. You have one sentence to give the pool reporter.',
    choices: [
      {
        label: 'Call for a ceasefire and a Palestinian state',
        detail: 'The base finally hears the word it has been waiting for.',
        effects: { mom: 6, groups: { muslim: 14, irreligious: 7, jewish: -10, evangelical: -9 } },
        outcome:
          'Muslim and secular voters come back into the fold in Michigan and Minnesota, and the clip plays on a loop in every suburban church in Ohio. Two donor calls are cancelled before you reach the car.',
      },
      {
        label: 'Stand with Israel, without a caveat',
        detail: 'The old coalition, held together by one sentence.',
        effects: { mom: 4, groups: { jewish: 10, evangelical: 9, muslim: -14, irreligious: -7 } },
        outcome:
          'South Florida and the evangelical belt exhale. Then the phone-in shows in Detroit and Minneapolis open, and your youth turnout model quietly loses four points it will not get back before November.',
      },
    ],
  },
  {
    id: 'every_group_speech',
    title: 'The Forty-Minute Speech',
    icon: 'media',
    tone: 'hope',
    weight: 2,
    kicker: 'Prime time, all networks',
    text: 'Nobody expected you to buy forty minutes of network air and then actually use them. You stand in front of one camera and one chart, and you make an argument about who this country is for. By the time the networks cut back in, every demographic firm in Washington is rerunning its cross-tabs, because the numbers moved for every single group at once — some toward you, some away.',
    choices: [
      {
        label: 'The coalition speech — name every group, promise every group',
        detail: 'Broad, generous, and expensive to live up to.',
        effects: {
          mom: 5,
          groups: {
            white: 2,
            black: 9,
            asian: 7,
            hispanic: 8,
            native: 10,
            other: 6,
            catholic: 4,
            evangelical: -5,
            protestant: 3,
            christian: 4,
            irreligious: 7,
            mormon: 1,
            muslim: 9,
            jewish: 5,
            otherReligion: 6,
          },
        },
        outcome:
          'The tent gets wider and the tent gets louder. Evangelical radio spends the next morning calling it a list of demands, which is exactly what your field operation wanted them to say.',
      },
      {
        label: 'The fight speech — pick your people and dare the rest',
        detail: 'Narrow, hot, and it turns out your people are the loud ones.',
        effects: {
          mom: 7,
          groups: {
            white: -3,
            black: 4,
            asian: -2,
            hispanic: 3,
            native: 5,
            other: -1,
            catholic: -3,
            evangelical: 8,
            protestant: 5,
            christian: 3,
            irreligious: -8,
            mormon: 2,
            muslim: -9,
            jewish: -6,
            otherReligion: -2,
          },
        },
        outcome:
          'You trade the outer edge of the coalition for the centre of your own base, and your own base rewards you with money and noise. Three groups you had at 55% start looking up the other party’s phone number.',
      },
    ],
  },
];