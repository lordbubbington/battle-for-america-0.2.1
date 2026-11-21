// Four-party news desk: 50 stories each that independently favor the
// Libertarians and Greens, then 100 stories that favor two campaigns apiece.
// The shared stories are balanced so each party gets exactly 50 extra boosts.
const PARTY_NAMES = { dem: 'Democratic', rep: 'Republican', lib: 'Libertarian', grn: 'Green' };

const SOLO_STORIES = {
  lib: [
    ['A county-by-county audit finds the new licensing rules cost more than the permits they replace', 'The report is dry, the arithmetic is not, and local radio keeps asking why nobody caught it sooner.'],
    ['A small-business coalition breaks with both major parties over a new federal mandate', 'Owners describe the paperwork in practical terms, and the Libertarian answer finds an audience beyond its usual circle.'],
    ['A privacy ruling puts warrantless data collection back on the front page', 'Civil-liberties groups from across the spectrum agree on the narrow point that the government went too far.'],
    ['A state budget office publishes the real price of a long-running tax credit', 'The figures make a once-quiet provision a campaign issue and revive calls to let households keep more of their pay.'],
    ['A federal agency pauses a rule after an appeals court questions its authority', 'The ruling is limited, but the argument over who gets to make the rules is suddenly everywhere.'],
    ['A local entrepreneur turns a stalled rail depot into a thriving private workshop', 'The project took years of local permits and a fraction of the subsidy first proposed; the contrast writes its own headline.'],
    ['A bipartisan group of mayors asks Washington to return a narrow power to the states', 'The request is modest, specific, and signed by officials who rarely share a press release.'],
    ['A new report finds licensing barriers keep experienced workers out of fast-growing fields', 'The workers interviewed are not political regulars, but they know exactly which form is keeping them from a paycheck.'],
    ['A civil-liberties lawsuit forces a public accounting of a domestic surveillance program', 'The documents reveal years of data collection under a legal interpretation few lawmakers had seen.'],
    ['A fee study shows families pay more to comply with a rule than to meet its stated goal', 'The number is easy to repeat, hard to wave away, and the policy desk spends the afternoon defending it.'],
  ],
  grn: [
    ['A regional grid operator says clean power kept the lights on during a record heat wave', 'The dispatch data show the new storage and wind projects doing exactly what their planners promised.'],
    ['A neighborhood wins a long fight to replace a contaminated water line', 'Parents describe the years of bottled water, and the final test results give the story a rare clean ending.'],
    ['A public-health review links a familiar pollutant to a sharp rise in childhood asthma', 'Doctors call for prevention before treatment, and families ask why the warning took so long to reach them.'],
    ['A farm co-op cuts fertilizer costs after restoring soil and changing how it plants', 'The change was measured field by field; neighboring growers now want to see the books.'],
    ['A court orders the cleanup of a leaking industrial waste site', 'The ruling follows years of neighborhood complaints and a paper trail the company said did not exist.'],
    ['A city bus fleet completes its first year with lower costs and cleaner air', 'Drivers, mechanics and riders agree on the part that matters most: the service stayed reliable.'],
    ['A new study finds wetlands protected three towns from the worst of a coastal storm', 'Researchers put a dollar value on the damage that never happened, and the number travels well beyond the coast.'],
    ['A union and a solar installer open a paid apprenticeship for displaced workers', 'The first class is already on roofs, earning a wage while learning a trade with a visible future.'],
    ['A state hospital network reports fewer emergency visits after expanding neighborhood clinics', 'The results are strongest in places where families used to drive an hour for basic care.'],
    ['A school district replaces aging boilers and uses the savings to restore library hours', 'Students notice the warmer classrooms; taxpayers notice that the operating budget went down.'],
  ],
};

const SHARED_STORIES = [
  ['A teachers’ pension board votes to disclose every outside investment', 'The new filings show where public money was going and who had been paid to manage it.'],
  ['A county clerk publishes a plain-language guide to the coming election', 'The guide answers the questions voters actually call about, not the ones consultants predicted.'],
  ['A jury acquits a whistleblower who disclosed a hidden public contract', 'Jurors say the missing records mattered more than the politics around the case.'],
  ['A state audit traces an overrun to a contract nobody could explain', 'The audit names the offices involved and gives lawmakers a deadline to answer.'],
  ['A regional newspaper wins access to records on a closed-door utility deal', 'The documents show which communities paid more and who approved the rate change.'],
  ['A public library stays open late after residents vote to fund the extra hours', 'The last bus now lines up with closing time, and the attendance numbers rise immediately.'],
  ['A neighborhood association settles a dispute without waiting for a state agency', 'The agreement is specific enough to enforce and simple enough that both sides can explain it.'],
  ['A hospital posts its prices after patients challenge an opaque billing policy', 'The new page is not elegant, but families can finally compare the bills before they arrive.'],
  ['A city council rejects a rushed procurement and starts the bid over in public', 'Two bidders object, but the final process draws more offers and a lower price.'],
  ['A veteran-run food pantry expands after local grocers pool their surplus', 'The volunteers make the new route work without a federal press conference or a new office.'],
  ['A state college publishes graduate earnings by program for the first time', 'Students discover which certificates pay off and which promises were mostly brochure copy.'],
  ['A court restores a family’s access to a public shoreline', 'The path had been closed by a private gate; the judge says the public easement never disappeared.'],
  ['A small town replaces its failing water pumps ahead of the next dry season', 'A local bond and a state engineer keep the repair on schedule and under the revised estimate.'],
  ['A watchdog group finds duplicate fees buried in a routine renewal form', 'The agency removes the second charge and agrees to refund people who paid it.'],
  ['A rural clinic keeps its maternity ward open with a shared staffing plan', 'Three counties split the call schedule, and expectant parents no longer need to cross a mountain pass.'],
  ['A storm-damaged bridge reopens months ahead of the original estimate', 'Inspectors credit local crews who reused sound materials instead of waiting for a new procurement cycle.'],
  ['A public school turns an unused wing into a community health center', 'Parents can book appointments after work, and nurses can use the school’s existing bus routes.'],
  ['A state pension fund exits a costly investment and posts the full fee schedule', 'The change follows a year of questions from retirees who could not get a straight answer.'],
  ['A county restores a closed park by hiring the people who live nearby', 'The opening day is quiet, the paths are clear, and the new crew has a year-round paycheck.'],
  ['A local manufacturer brings a stalled factory back with worker ownership', 'The new owners reopen one line at a time and publish the monthly production figures.'],
];

// Use every pair 16 times, with two opposite pairs appearing twice more. This
// gives each party exactly 50 appearances across the 100 two-party stories.
/** @type {Array<[string, string, number]>} */
const PAIRS = [
  ['dem', 'rep', 18], ['lib', 'grn', 18],
  ['dem', 'lib', 16], ['dem', 'grn', 16], ['rep', 'lib', 16], ['rep', 'grn', 16],
];

const storyEvent = (id, title, text, parties, tone, serial, points = parties.length === 1 ? 0.72 : 0.52) => {
  const beneficiaries = parties.map((party) => PARTY_NAMES[party]);
  // These editions are part of the surge chain stories named in the Build 34
  // design. Give their story cards to the campaign event deck; other solo
  // stories remain passive National News Desk items.
  const chainStarter = parties.length === 1 && serial <= 25 && serial % 5 === 2;
  const chainStarterEdition = parties.length === 1 && serial >= 3 && serial <= 4;
  return {
    id,
    title,
    icon: 'data',
    tone,
    weight: 1,
    kicker: 'Four-party campaign bulletin',
    text: `${text} The coverage treats it as a clear argument for the ${beneficiaries.join(' and ')} campaigns, whose candidates make the case in their own words.`,
    modeOnly: 'surge',
    nationalOnly: parties.length === 1 && !chainStarter && !chainStarterEdition,
    newsFavor: parties,
    choices: [{
      label: 'Let the story run',
      detail: `A national opinion shift toward ${beneficiaries.join(' and ')} voters.`,
      effects: { fourPartyNews: { parties, points } },
      outcome: `The story stays in the news and moves opinion toward ${beneficiaries.join(' and ')}.`,
    }],
    serial,
  };
};

export const FOUR_PARTY_NEWS_EVENTS = [
  ...['lib', 'grn'].flatMap((party) => SOLO_STORIES[party].flatMap(([headline, detail], theme) =>
    Array.from({ length: 5 }, (_, edition) => {
      const serial = theme * 5 + edition + 1;
      const angle = edition === 0 ? 'The story leads the evening broadcast.'
        : edition === 1 ? 'A follow-up report brings residents directly into the debate.'
          : edition === 2 ? 'Local officials are pressed to explain the decision on camera.'
            : edition === 3 ? 'New records give the original reporting a second news cycle.'
              : 'The issue reaches the Sunday panels, where neither major campaign can ignore it.';
      const title = `${headline}: ${['The disclosure', 'Neighbors weigh in', 'The figures go public', 'A court reviews the record', 'The local impact'][edition]}`;
      const nationalBreakout = edition === 0 && theme < 6;
      const outsiderLine = party === 'lib'
        ? 'The reporting follows a candidate with no established party machine, whose outsider campaign has spent the year challenging the donor class and federal bureaucracy.'
        : 'The reporting follows an outsider campaign built outside the usual corporate donor networks, giving local organizers and community advocates the national microphone.';
      const points = nationalBreakout ? [5.2, 5.7, 6.1, 6.6, 7.2, 7.8][theme] : 0.72;
      return storyEvent(`4p_${party}_${String(serial).padStart(2, '0')}`, title, `${detail} ${angle}${nationalBreakout ? ` ${outsiderLine}` : ''}`, [party], party === 'grn' ? 'hope' : 'wild', serial, points);
    })
  )),
  ...PAIRS.flatMap(([left, right, count], pairIndex) => Array.from({ length: count }, (_, index) => {
    const [headline, detail] = SHARED_STORIES[(pairIndex * 7 + index) % SHARED_STORIES.length];
    const edition = index % 5;
    const angle = edition === 0 ? 'The report puts a public record beside the promises made about it.'
      : edition === 1 ? 'People affected by the decision describe what changed in their daily lives.'
        : edition === 2 ? 'The local paper obtains a second set of records that confirms the timeline.'
          : edition === 3 ? 'A public hearing turns the dispute into a question of accountability.'
            : 'The outcome gives both campaigns a concrete example for their case to voters.';
    const title = `A local issue enters the ${PARTY_NAMES[left]} and ${PARTY_NAMES[right]} contest: ${headline}: ${['The audit trail', 'A public response', 'The record checked', 'Officials answer', 'A local test'][edition]}`;
    const serial = PAIRS.slice(0, pairIndex).reduce((sum, row) => sum + row[2], 0) + index + 1;
    return storyEvent(`4p_pair_${String(serial).padStart(3, '0')}`, title, `${detail} ${angle}`, [left, right], 'hope', serial);
  })),
];

