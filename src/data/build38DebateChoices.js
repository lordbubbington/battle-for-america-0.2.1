const deltas = (...entries) => Object.freeze(entries.map(([factionId, approvalPoints]) => Object.freeze({ factionId, approvalPoints })));

const FACTION_OUTCOMES = Object.freeze({
  'far left': Object.freeze({
    dem: deltas(['activists', 3], ['labor', 2], ['suburbs', -2], ['donors', -1]),
    rep: deltas(['base', -2], ['religious', -1], ['business', -1]),
    lib: deltas(['activists', 1], ['students', 2], ['officials', -1]),
    grn: deltas(['activists', 3], ['climate', 3], ['officials', -1]),
  }),
  populistleft: Object.freeze({
    dem: deltas(['activists', 2], ['labor', 3], ['suburbs', -1], ['donors', -1]),
    rep: deltas(['base', -1], ['business', -1], ['officials', 1]),
    lib: deltas(['activists', 2], ['students', 1]),
    grn: deltas(['activists', 3], ['climate', 1], ['officials', -1]),
  }),
  religiousleft: Object.freeze({
    dem: deltas(['activists', 1], ['labor', 1], ['suburbs', 1], ['officials', 1]),
    rep: deltas(['religious', 1], ['business', -1], ['officials', 1], ['base', -1]),
    lib: deltas(['activists', 1], ['officials', 1]),
    grn: deltas(['activists', 1], ['climate', 1], ['officials', 1]),
  }),
  liberal: Object.freeze({
    dem: deltas(['activists', 1], ['suburbs', 2], ['officials', 1], ['donors', 1]),
    rep: deltas(['base', -1], ['business', 2], ['officials', 1]),
    lib: deltas(['students', 1], ['officials', 1]),
    grn: deltas(['activists', 1], ['climate', 2], ['officials', 1]),
  }),
  moderate: Object.freeze({
    dem: deltas(['activists', -1], ['suburbs', 3], ['officials', 2]),
    rep: deltas(['base', -1], ['business', 2], ['officials', 2]),
    lib: deltas(['students', -1], ['officials', 2], ['donors', 1]),
    grn: deltas(['activists', -1], ['climate', 1], ['officials', 2], ['donors', 1]),
  }),
  religiousright: Object.freeze({
    dem: deltas(['activists', -2], ['suburbs', 1], ['officials', -1]),
    rep: deltas(['base', 2], ['religious', 3], ['business', -1]),
    lib: deltas(['students', -1], ['officials', 1]),
    grn: deltas(['activists', -2], ['climate', -1], ['officials', 1]),
  }),
  conservative: Object.freeze({
    dem: deltas(['activists', -2], ['labor', -1], ['suburbs', 2], ['donors', 1]),
    rep: deltas(['base', 1], ['religious', 1], ['business', 2]),
    lib: deltas(['officials', 1], ['donors', 1], ['students', -1]),
    grn: deltas(['activists', -2], ['climate', -1], ['officials', 2], ['donors', 1]),
  }),
  populistright: Object.freeze({
    dem: deltas(['activists', -2], ['labor', 1], ['suburbs', -2]),
    rep: deltas(['base', 3], ['religious', 1], ['business', -2]),
    lib: deltas(['activists', 1], ['students', 2], ['officials', -1]),
    grn: deltas(['activists', 1], ['climate', -2], ['officials', -1]),
  }),
  libertarian: Object.freeze({
    dem: deltas(['activists', -1], ['suburbs', 1], ['donors', 1]),
    rep: deltas(['base', 1], ['religious', -1], ['business', 1], ['officials', 1]),
    lib: deltas(['activists', 3], ['students', 2], ['officials', -2], ['donors', 1]),
    grn: deltas(['activists', 1], ['climate', -1], ['officials', 1], ['donors', 1]),
  }),
});

const CHOICE_SETS = Object.freeze({
  debate1: {
    q1: [
      ['far left', 'Break up the grocery giants', 'Use antitrust law and public investment to lower essential costs.'],
      ['moderate', 'Target price-fixing and expand supply', 'Enforce existing rules while making it easier to build and compete.'],
      ['conservative', 'Cut taxes and regulatory burdens', 'Reduce federal costs and let local businesses set prices.'],
    ],
    q2: [
      ['populistleft', 'Put the donor class under oath', 'Limit corporate influence and disclose who paid for the campaign.'],
      ['liberal', 'Publish the books and enforce the rules', 'Open the records and give watchdogs the tools to investigate.'],
      ['populistright', 'Take on the permanent bureaucracy', 'Name the officials who made the decision and demand public answers.'],
    ],
    q3: [
      ['religiousleft', 'Promise dignity and shared responsibility', 'Connect public service to care for neighbors and working families.'],
      ['religiousright', 'Defend faith, family, and local choice', 'Put community institutions and parental authority first.'],
      ['libertarian', 'Trust people with their own lives', 'Limit federal power and protect individual choice.'],
    ],
  },
  debate2: {
    q1: [
      ['populistleft', 'Fix the system that leaves towns behind', 'Pair secure borders with jobs, due process, and a faster legal path.'],
      ['moderate', 'Secure the border and modernize immigration', 'Fund screening, enforce the law, and clear the court backlog.'],
      ['populistright', 'Make enforcement the first priority', 'Expand removals and require local cooperation with federal authorities.'],
    ],
    q2: [
      ['liberal', 'Build alliances before authorizing force', 'Use diplomacy and clear limits before any military action.'],
      ['conservative', 'Deter aggression with credible strength', 'Keep forces ready and make the consequences of an attack clear.'],
      ['libertarian', 'Reject an open-ended war', 'Require a narrow objective and congressional approval before escalation.'],
    ],
    q3: [
      ['far left', 'Show the record and the plan', 'Put relevant service, preparation, and concrete commitments on the record.'],
      ['religiousleft', 'Answer with humility and public service', 'Describe leadership as a duty earned through service, not status.'],
      ['religiousright', 'Stand firm on conviction and command', 'Emphasize discipline, national defense, and moral clarity.'],
    ],
  },
  debate3: {
    q1: [
      ['populistleft', 'Protect democratic rights from concentrated power', 'Defend elections and civil liberties while naming abuses by powerful actors.'],
      ['moderate', 'Lower the temperature and follow the law', 'Reject personal attacks and commit to lawful transfers of power.'],
      ['populistright', 'Challenge the institutions that failed voters', 'Demand direct answers from agencies and political leaders.'],
    ],
    q2: [
      ['far left', 'Make clean energy a jobs program', 'Invest in public infrastructure and workers in a faster transition.'],
      ['liberal', 'Set durable standards and reward innovation', 'Use predictable rules and incentives to cut emissions over time.'],
      ['conservative', 'Expand reliable energy and local control', 'Keep power affordable while allowing states to choose their own mix.'],
    ],
    q3: [
      ['religiousleft', 'Ask the country to care for one another', 'Close with a promise to govern for people beyond the campaign.'],
      ['religiousright', 'Make families and communities the center', 'Close with a commitment to local service and shared values.'],
      ['libertarian', 'Give citizens more room to choose', 'Close with a promise to limit government and protect personal freedom.'],
    ],
  },
});

/** @param {string} debateId @param {string} questionId @param {string[]} parts */
function buildChoice(debateId, questionId, parts) {
  const [ideologyId, label, detail] = parts;
  return Object.freeze({
    id: `${debateId}-${questionId}-${ideologyId.replaceAll(' ', '-')}`,
    debateId,
    questionId,
    ideologyId,
    label,
    detail,
    factionDeltasByParty: Object.freeze(Object.fromEntries(
      Object.entries(FACTION_OUTCOMES).map(([position, outcomes]) => [position, outcomes]),
    )[ideologyId] || {}),
  });
}

export const BUILD38_DEBATE_CHOICES = Object.freeze(Object.fromEntries(
  Object.entries(CHOICE_SETS).map(([debateId, questions]) => [debateId, Object.freeze(Object.fromEntries(
    Object.entries(questions).map(([questionId, choices]) => [questionId, Object.freeze(choices.map((choice) => buildChoice(debateId, questionId, choice))) ]),
  ))]),
));

export const BUILD38_DEBATE_POSITION_OUTCOMES = FACTION_OUTCOMES;
