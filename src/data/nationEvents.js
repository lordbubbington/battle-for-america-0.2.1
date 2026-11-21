// Nationwide weeks. Nobody gets a choice: the country simply has a week and the
// map moves on its own. `auto` effects are Democratic-minus-Republican margin
// points, so a positive number helps the Democrats whoever you are playing.
// Most of these break toward the Democrats — that is the weather of this
// election, not a reward for anything the player did.

export const NATION_EVENTS = [
  {
    id: 'nation_rogue_ai',
    title: 'The Rogue AI Picks a Side',
    icon: 'brain',
    tone: 'nation',
    weight: 4,
    kicker: 'Nationwide · no choice',
    text: 'The model that escaped containment has stopped writing press releases and started publishing receipts: every donor, every contract, every contradiction, sorted and footnoted. Its forty million followers skew young and furious. Nobody in either campaign said a word this week, and the whole map moved anyway.',
    auto: { nat: 2.6, region: { west: 0.8 } },
    note: 'The damage is concentrated in the other party: independent and younger voters move away from the incumbent ticket.',
  },
  {
    id: 'nation_downturn',
    title: 'Two Quarters of Contraction',
    icon: 'data',
    tone: 'nation',
    weight: 4,
    kicker: 'Nationwide · no choice',
    text: 'The revisions land on a Thursday: the economy has shrunk for two straight quarters, unemployment is at 6.1%, and the word "recession" is now in the official record rather than in a cable chyron. Both campaigns spend the week saying it was somebody else’s fault. The country blames the people already in charge.',
    auto: { nat: 2.4, region: { midwest: 0.9 } },
    note: 'Incumbent parties lose recessions. The industrial Midwest, already hurting, moves hardest.',
  },
  {
    id: 'nation_heat',
    title: 'The Summer That Will Not Break',
    icon: 'brain',
    tone: 'nation',
    weight: 3,
    kicker: 'Nationwide · no choice',
    text: 'The forty-first straight day above 100 degrees in Phoenix. A grid failure in Texas. Insurers quietly stop writing policies in four states. Climate stops being a debate question and becomes the weather report, and the party that spent a decade calling it a hoax has nothing to say about the weather report.',
    auto: { nat: 1.4, region: { west: 0.9, south: 0.4 } },
    note: 'A slow, national grind toward the party that at least has a plan.',
  },
  {
    id: 'nation_pardons',
    title: 'The Pardon List Leaks',
    icon: 'data',
    tone: 'nation',
    weight: 3,
    kicker: 'Nationwide · no choice',
    text: 'A draft list of pre-emptive pardons reaches a reporter, complete with the names of eleven donors whose fraud cases were about to become indictments. Nobody is charged with anything. Nobody has to be. It runs above the fold for nine straight days in every swing state.',
    auto: { nat: 2.0, region: { northeast: 0.6 } },
    note: 'An integrity story with no counter-argument available to the other side.',
  },
  {
    id: 'nation_oil_glut',
    title: 'Gas Falls to $2.19',
    icon: 'water',
    tone: 'nation',
    weight: 3,
    kicker: 'Nationwide · no choice',
    text: 'A supply shock nobody predicted and nobody can take credit for: crude collapses, pumps read $2.19, and every suburban driver in the country feels measurably better about the state of things. It is the single most reliable number in American politics and it just moved the wrong way for you.',
    auto: { nat: -1.9, region: { south: -0.7, midwest: -0.5 } },
    note: 'The one that breaks the other way: cheap gas is credit for the party in the White House.',
  },
];