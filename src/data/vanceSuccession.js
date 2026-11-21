// A clearly fictional alternate-history campaign arc. The event cards are scripted
// by the story engine and never enter the random event pool.

const part = (id, number, title, text, choices) => ({
  id,
  vanceSuccessionPart: number,
  scriptedOnly: true,
  title,
  kicker: 'Fictional alternate-history scenario',
  icon: 'globe',
  tone: 'nation',
  weight: 0,
  text,
  choices,
});

const choice = (label, detail, outcome, adjustment = {}) => ({
  label,
  detail,
  outcome,
  effects: {},
  vanceSuccessionResponse: adjustment,
});

export const VANCE_SUCCESSION_EVENTS = [
  part(
    'vance_succession_handoff',
    1,
    'A Fictional Handoff',
    'This is an explicitly fictional alternate-history campaign scenario. In this imagined timeline, President Donald Trump leaves office before the election and Vice President JD Vance is sworn in. The transfer is part of the game’s story, not a claim about real events.',
    [
      choice('Lead with continuity', 'Emphasize a stable transfer and a focus on governing.', 'Vance takes office and promises a steady hand. Moderates respond to the orderly transition while some movement organizers want a sharper break.', { moderate: 0.2, populistCost: 0 }),
      choice('Lead with the movement', 'Promise that the administration’s priorities will continue without pause.', 'Vance takes office and promises the movement will keep its influence. The base stays engaged, while persuadable voters see less distance from the old administration.', { moderate: -0.2, populistCost: -0.5 }),
    ]
  ),
  part(
    'vance_succession_address',
    2,
    'The First Address',
    'Fictional alternate-history scenario. President Vance gives his first national address. He can try to reset the tone for voters outside the Republican base, but a visible break with the movement risks backlash from its organizers.',
    [
      choice('Make a governing case', 'Center competence, prices, and practical results.', 'The address sounds more measured. Moderate voters give Vance a hearing; movement voices complain that the message lacks fight.', { moderate: 0.4, populistCost: 0.5 }),
      choice('Promise an unbroken fight', 'Keep the movement’s confrontational tone and priorities.', 'The address reassures the movement’s most loyal supporters but makes it harder to sell a fresh start to less partisan voters.', { moderate: -0.3, populistCost: -0.5 }),
    ]
  ),
  part(
    'vance_succession_cabinet',
    3,
    'A Cabinet Signal',
    'Fictional alternate-history scenario. Vance’s early personnel choices are read as a signal about what kind of president he intends to be. A broader governing team could reassure swing voters while disappointing the movement that put him in office.',
    [
      choice('Broaden the governing team', 'Elevate experienced officials with cross-party credibility.', 'The personnel signal helps Vance look independent and capable. Movement activists warn that the administration is drifting toward the establishment.', { moderate: 0.5, populistCost: 0.75 }),
      choice('Keep movement loyalists close', 'Choose trusted allies who will defend the administration’s core agenda.', 'The base sees continuity in the new team, while moderates see fewer signs of a break with the previous administration.', { moderate: -0.2, populistCost: -0.25 }),
    ]
  ),
  part(
    'vance_succession_pushback',
    4,
    'The Movement Pushes Back',
    'Fictional alternate-history scenario. Activists and media allies publicly challenge the new president’s choices. Vance can absorb the criticism and keep courting the middle, or make a show of loyalty that restores trust with the movement.',
    [
      choice('Hold the governing line', 'Ask allies to let the new administration make its own decisions.', 'Vance keeps the moderate opening, but some of the movement’s most active supporters become less eager to turn out.', { moderate: 0.4, populistCost: 0.75 }),
      choice('Make a public show of loyalty', 'Reaffirm the movement’s influence and promise to consult its leaders.', 'The public reassurance repairs some ties with the base but narrows the contrast Vance has built with the old administration.', { moderate: -0.2, populistCost: -0.25 }),
    ]
  ),
  part(
    'vance_succession_coalition',
    5,
    'The Incumbent Coalition',
    'Fictional alternate-history scenario. The campaign has to decide what Vance’s new incumbency means for November. He can run as a fresh governing voice or ask the Republican coalition to unite behind the movement’s existing direction.',
    [
      choice('Run on a fresh start', 'Ask moderate voters to judge the new president on his own record.', 'Vance finishes the arc with a clearer opening among moderates. Some movement voters remain skeptical, and the Republican turnout model reflects that strain.', { moderate: 0.5, populistCost: 1 }),
      choice('Unite behind the movement', 'Make coalition unity and continuity the campaign’s closing message.', 'The party’s most loyal voters hear a familiar call, while Vance gives up part of the moderate opening created by his first months in office.', { moderate: -0.25, populistCost: -0.25 }),
    ]
  ),
];

export const VANCE_SUCCESSION_BY_ID = Object.fromEntries(VANCE_SUCCESSION_EVENTS.map((event) => [event.id, event]));

export function vanceSuccessionEventFor(game) {
  const playerIsVance = game?.party === 'rep' && game?.candidateId === 'vance';
  const rivalIsVance = game?.opponentParty === 'rep' && game?.opponentId === 'vance';
  if (!playerIsVance && !rivalIsVance) return null;

  const president = game?.sittingPresidentId || 'trump';
  const completed = Math.max(0, Math.min(VANCE_SUCCESSION_EVENTS.length, Number(game?.vanceSuccessionPart) || 0));
  if (completed >= VANCE_SUCCESSION_EVENTS.length || game?.vanceSuccessionDeliveredWeek === (game?.week || 0)) return null;
  if (completed === 0 && president === 'trump' && !game?.vanceSuccessionStarted) return VANCE_SUCCESSION_EVENTS[0];
  if (completed > 0 && game?.vanceSuccessionStarted && president === 'vance') return VANCE_SUCCESSION_EVENTS[completed];
  return null;
}
export const VANCE_SUCCESSION_PART_EFFECTS = [
  { moderate: 0.7, magaLoss: 1, turnoutLoss: 0.08 },
  { moderate: 2.4, magaLoss: 3, turnoutLoss: 0.16 },
  { moderate: 2.8, magaLoss: 4, turnoutLoss: 0.24 },
  { moderate: 3, magaLoss: 4.5, turnoutLoss: 0.3 },
  { moderate: 2.6, magaLoss: 5, turnoutLoss: 0.36 },
];
