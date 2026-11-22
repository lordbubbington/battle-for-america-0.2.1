export const TRADITIONAL_STAFF_SCHEMA_VERSION = 2;
export const STAFF_SELECTION_POLICY_VERSION = 1;
export const LEGACY_STAFF_ACTIVE_CAPACITY = 10;
export const TRADITIONAL_STAFF_ACTIVE_CAPACITY = 4;
export const TRADITIONAL_STAFF_SELECTION_COUNT = TRADITIONAL_STAFF_ACTIVE_CAPACITY - 1;
export const TRADITIONAL_GENERIC_PORTRAIT_IDS = Object.freeze(
  Array.from({ length: 14 }, (_, index) => `traditional-generic-${String(index + 1).padStart(2, '0')}`),
);
export const TRADITIONAL_STAFF_ACTION_IDS = Object.freeze([
  'visit', 'townhall', 'volunteers', 'promise', 'ops', 'fundraise', 'shift', 'prep', 'oppo',
  'ad', 'spin', 'endorsement',
]);

const makeVoicePack = (dem, rep) => ({
  dem: { recommendation: dem[0], disagreement: dem[1], debrief: dem[2] },
  rep: { recommendation: rep[0], disagreement: rep[1], debrief: rep[2] },
  coalition: {
    recommendation: dem[0].map((line) => `For {faction}: ${line}`),
    disagreement: dem[1].map((line) => `For {faction}: ${line}`),
    debrief: dem[2].map((line) => `For {faction}: ${line}`),
  },
});

const role = (id, title, responsibility, expertise, actionIds, portraitMark, dialogue, options = {}) => ({
  id,
  title,
  responsibility,
  expertise,
  recommendableActionIds: actionIds,
  portraitMark,
  dialogue,
  effect: {
    id: `traditional-staff:${id}:v1`,
    scope: options.scope || `staff.${id}.scoped-execution`,
    actionIds,
    maxEffectMultiplier: 1.1,
    requiresNativeResolver: true,
    informationalOnlyByDefault: true,
    description: options.effectDescription || expertise,
  },
  recommendationRequiresEvidence: options.recommendationRequiresEvidence || false,
});

export const TRADITIONAL_STAFF_ROSTER = [
  role('chief', 'Chief of Staff', 'Coordinates the inner circle and resolves competing priorities.', 'Arbitrates the weekly agenda and caps its scoped execution effect.', ['visit', 'townhall', 'volunteers', 'promise', 'ops', 'fundraise', 'shift', 'prep', 'oppo', 'ad', 'spin', 'endorsement'], 'CS', makeVoicePack(
    [
      ['The clearest opening is {target}; {action} follows the record: {reason}.', 'I recommend {action} in {target}. The reason is in the briefing: {reason}.', 'The team can act on {target} now. {action} is legal because {reason}.'],
      ['Field and message priorities differ. I would resolve that by checking {reason}.', 'Two priorities compete; the available evidence favors {target}: {reason}.', 'We can revisit the other need next week. Today the record supports {reason}.'],
      ['The agenda was {result}. I have recorded the outcome without scoring anyone.', 'The receipt is our debrief: {result}. We will carry the other priority forward.', 'That is the week on paper: {result}. The next briefing starts from this record.'],
    ],
    [
      ['The strongest opening is {target}; {action} is grounded in {reason}.', 'I recommend {action} in {target}. It is legal and the evidence says {reason}.', 'Let’s set one clear priority. {action} in {target} follows {reason}.'],
      ['The team has two legitimate needs. The evidence for this one is {reason}.', 'We can protect one priority now and return to the other. Here, {reason}.', 'This is a tradeoff, not a loyalty test. The public case is {reason}.'],
      ['The saved receipt says {result}. That is the basis for our debrief.', 'We have the outcome: {result}. The missed priority stays visible for next week.', 'The record is {result}. No one gets blamed for a hard choice.'],
    ],
  ), { scope: 'staff.agenda.execution-quality', effectDescription: 'Coordinates one agenda and caps its matching native action effect.' }),
  role('operations', 'Campaign Operations Manager', 'Schedule, action sequencing, upkeep and operational conflicts.', 'Flags action conflicts and upkeep cliffs before commitment.', ['ops', 'volunteers', 'fundraise'], 'CO', makeVoicePack(
    [
      ['Check the calendar before the spend: {reason}. {action} in {target} fits the available window.', 'The operating constraint is {reason}; {action} is the legal move in {target}.', 'I have checked timing and cost. The plan points to {target}: {reason}.'],
      ['That plan competes with a real schedule constraint: {reason}.', 'We can do both only if the sequence works. Right now, {reason}.', 'I would protect the schedule first; the documented conflict is {reason}.'],
      ['The action receipt records {result}. I will carry its actual timing into next week.', 'Here is the logged operational result: {result}.', 'The schedule is closed out against the receipt: {result}.'],
    ],
    [
      ['Before we commit, check the operating window: {reason}. {action} fits {target}.', 'The cost and sequence are workable here: {reason}.', 'My schedule check points to {target}; the reason is {reason}.'],
      ['This is a sequencing call. The documented constraint is {reason}.', 'I would not promise both until the schedule clears. Right now, {reason}.', 'The calendar has a conflict; {reason} is the concrete one.'],
      ['The receipt confirms {result}. I will use that when we plan the next week.', 'The completed operation is logged as {result}.', 'Our actual result is {result}; the schedule can now reset.'],
    ],
  ), { scope: 'staff.operations.schedule-quality', effectDescription: 'Improves a registered operational component without granting an action.' }),
  role('pollster', 'Head Pollster', 'Polling quality, uncertainty and target selection.', 'Improves an existing poll or target-selection action; never changes the vote model.', ['visit', 'townhall', 'prep'], 'HP', makeVoicePack(
    [
      ['The estimate is uncertain, so keep the claim narrow: {reason}.', 'I would target {target}; the measurable reason is {reason}.', 'Do not turn a thin reading into certainty. {action} is supported by {reason}.'],
      ['I disagree on priority because the uncertainty is not the same everywhere: {reason}.', 'The close target deserves measurement before a broad message: {reason}.', 'We should separate what is measured from what is assumed. Here, {reason}.'],
      ['The saved result is {result}. I will update the uncertainty from that receipt.', 'We learned what the action actually returned: {result}.', 'The poll or target action is logged as {result}; no estimate was filled in.'],
    ],
    [
      ['The estimate still has limits. The evidence supports {reason}, not a broader claim.', 'My target recommendation is {target}; the measurable case is {reason}.', '{action} in {target} is worth considering because {reason}.'],
      ['We have different priorities, but the uncertainty is documented: {reason}.', 'I would measure the close target before widening the message: {reason}.', 'Keep the known result separate from the guess. Here, {reason}.'],
      ['The receipt records {result}. I will keep that distinction in the next read.', 'Here is the measured outcome: {result}.', 'The action returned {result}; nothing missing has been set to zero.'],
    ],
  ), { scope: 'staff.pollster.target-information-quality', effectDescription: 'Improves precision or utility only when a native information resolver supports it.' }),
  role('communications', 'Chief of Communications', 'Message strategy and rapid response.', 'Improves message fit on a compatible existing message or response action.', ['promise', 'townhall', 'oppo', 'ad', 'spin'], 'CC', makeVoicePack(
    [
      ['Keep the answer tied to the issue voters are already discussing: {reason}.', 'The message has a real opening in {target}; {action} is supported by {reason}.', 'A focused response beats a louder one here: {reason}.'],
      ['I would not chase both messages at once. The stronger documented fit is {reason}.', 'Those priorities compete for attention; {reason} is the clearer opening.', 'We can return to the other message. This one has {reason}.'],
      ['The response receipt says {result}. That is what the audience actually heard.', 'We have the message outcome: {result}.', 'The action is logged as {result}; we should build from that.'],
    ],
    [
      ['Stay on the issue with a real opening: {reason}.', 'The message can be focused in {target}; {action} follows {reason}.', 'A clear answer is stronger than a scattered one here: {reason}.'],
      ['I would choose one message to carry. The current fit is {reason}.', 'The two messages compete for attention. This record favors {reason}.', 'Keep the other line ready; this one has {reason}.'],
      ['The saved response says {result}. That is the message we can evaluate.', 'The campaign receipt records {result}.', 'The audience-facing result is logged as {result}.'],
    ],
  ), { scope: 'staff.communications.message-fit-quality' }),
  role('field', 'Field Director', 'Turnout, volunteers and ground-game execution.', 'Improves a registered field or turnout component in the selected state.', ['volunteers', 'ops', 'visit'], 'FD', makeVoicePack(
    [
      ['The field opportunity is local and specific: {reason}. Put {action} in {target}.', 'Organizers can work on {target}; the reason is {reason}.', 'I am recommending a reachable field move, not a statewide promise: {reason}.'],
      ['The volunteer plan and the competing priority cannot both lead today: {reason}.', 'We have a field constraint to resolve first: {reason}.', 'I would keep the crews focused. The real opening is {reason}.'],
      ['The field receipt reports {result}. I will plan from the recorded work.', 'The completed operation is logged as {result}.', 'Here is the actual field outcome: {result}.'],
    ],
    [
      ['The field opening is in {target}; the reason is {reason}.', 'Give organizers a concrete route: {action} in {target}, because {reason}.', 'This is a local operation, not a national shortcut: {reason}.'],
      ['Crews need one clear assignment. The documented opening is {reason}.', 'We have two needs, but the field constraint is {reason}.', 'I would keep the operation focused; the evidence is {reason}.'],
      ['The receipt says {result}. We will plan the next shift from that.', 'That field work is logged as {result}.', 'The recorded field outcome is {result}.'],
    ],
  ), { scope: 'staff.field.turnout-component' }),
  role('fundraising', 'Fundraising Director', 'Major donors, bundlers and fundraising obligations.', 'Improves completed, legal major-donor fundraising through the native donor rules.', ['fundraise'], 'FR', makeVoicePack(
    [
      ['Check the donor room before counting on it: {reason}.', 'A legal fundraiser in {target} has a documented opening: {reason}.', 'I recommend {action}; the donor evidence says {reason}.'],
      ['A fundraising ask has a real opportunity cost. Here, {reason}.', 'I would compare the donor opening with the competing field need: {reason}.', 'Do not book expected money before the native result. The known case is {reason}.'],
      ['The fundraising receipt records {result}. Any obligation stays in the native ledger.', 'Here is the realized outcome, not a projection: {result}.', 'The donor result is logged as {result}.'],
    ],
    [
      ['The donor room has a real opening: {reason}.', 'We can ask in {target}; the current record says {reason}.', 'I recommend {action} only on the evidence we have: {reason}.'],
      ['A fundraiser uses time and carries obligations. The present case is {reason}.', 'Compare the donor room with the other need before committing: {reason}.', 'I will not book projected cash. The record supports {reason}.'],
      ['The receipt shows {result}; obligations remain governed by the native rules.', 'Here is the money actually raised: {result}.', 'The recorded donor outcome is {result}.'],
    ],
  ), { scope: 'staff.fundraising.major-donor-yield' }),
  role('small-donor', 'Small Donor Director', 'Recurring gifts, grassroots contributions and retention.', 'Improves recurring or small-donor yield and retention, not major-donor actions.', ['fundraise'], 'SD', makeVoicePack(
    [
      ['The grassroots case is about repeat support, not one large check: {reason}.', 'A small-donor ask in {target} is supported by {reason}.', 'Keep retention in view when you choose {action}: {reason}.'],
      ['A major gift and a recurring donor are different plans. The evidence for this one is {reason}.', 'I would not trade long-term retention for a headline total: {reason}.', 'The current record points to grassroots capacity: {reason}.'],
      ['The native donor receipt records {result}. That is our actual retention picture.', 'The completed ask is logged as {result}.', 'We have a result, not a promise: {result}.'],
    ],
    [
      ['This is about repeat support rather than a single large check: {reason}.', 'The small-donor opening in {target} is {reason}.', 'Keep retention attached to the ask: {reason}.'],
      ['Small gifts and major gifts are different lanes. Here, {reason}.', 'Do not trade the recurring base for a headline number: {reason}.', 'The record points to grassroots capacity: {reason}.'],
      ['The donor receipt says {result}; that is the retention record we have.', 'The completed ask is recorded as {result}.', 'Here is what the native result returned: {result}.'],
    ],
  ), { scope: 'staff.small-donor.retention' }),
  role('establishment-liaison', 'Party Establishment Liaison', 'Party leadership, elected officials and institutional support.', 'Improves relationship progress and its endorsement gate under native faction rules.', ['endorsement'], 'EL', makeVoicePack(
    [
      ['Institutional support depends on a real relationship threshold: {reason}.', 'A direct step in {target} is available; the faction record shows {reason}.', 'Do not assume an endorsement. The current gate says {reason}.'],
      ['The leadership request and the field need compete for the same attention: {reason}.', 'I would not ask before the gate is ready. The documented status is {reason}.', 'Relationship work has a threshold; the record says {reason}.'],
      ['The faction receipt records {result}. We can now check the actual gate.', 'Here is the relationship outcome: {result}.', 'The institutional result is logged as {result}.'],
    ],
    [
      ['Institutional backing has a real gate. The current record shows {reason}.', 'A relationship step in {target} is legal; the evidence says {reason}.', 'We should not assume support before the threshold: {reason}.'],
      ['The leadership request competes with another priority: {reason}.', 'Wait until the relationship gate is ready; the record says {reason}.', 'This support has to be earned through the native rules: {reason}.'],
      ['The faction receipt says {result}. We can evaluate the gate from that.', 'The relationship outcome is recorded as {result}.', 'The actual institutional result is {result}.'],
    ],
  ), { scope: 'staff.establishment.relationship-gate' }),
  role('base-liaison', 'Party Base Liaison', 'Activists, volunteers and core supporters.', 'Improves a compatible mobilization action among currently aligned reachable groups.', ['volunteers', 'visit'], 'BL', makeVoicePack(
    [
      ['Mobilize the supporters who are already reachable: {reason}.', 'The base has a concrete opening in {target}; {action} fits because {reason}.', 'This is about organizing aligned supporters, not changing their views: {reason}.'],
      ['The activist network cannot cover every priority at once: {reason}.', 'I would focus the organizers where the current base has room: {reason}.', 'The competing need is real; so is this documented opening: {reason}.'],
      ['The mobilization receipt records {result}. That is the work we can build on.', 'The field result is logged as {result}.', 'Here is the actual organizer outcome: {result}.'],
    ],
    [
      ['Put organizers behind reachable supporters: {reason}.', 'The base has a local opening in {target}; {reason}.', 'We are organizing supporters, not granting votes: {reason}.'],
      ['The volunteer network has to choose one focus: {reason}.', 'I would organize where the base has a documented opening: {reason}.', 'The other need matters, but this opening is {reason}.'],
      ['The mobilization receipt says {result}. That is the work on record.', 'The field result is recorded as {result}.', 'The organizer outcome is {result}.'],
    ],
  ), { scope: 'staff.base.aligned-supporter-reach' }),
  role('policy', 'Policy Director', 'Platform, promises and issue alignment.', 'Improves policy preparation and flags recorded promise conflicts before resolution.', ['promise', 'shift'], 'PD', makeVoicePack(
    [
      ['Check the position against recorded promises first: {reason}.', 'The issue work in {target} is grounded in {reason}.', 'A policy move should fit the record already made: {reason}.'],
      ['The proposed line conflicts with a real commitment: {reason}.', 'I would not rewrite the platform until we resolve {reason}.', 'The tradeoff is between a new stance and an existing promise: {reason}.'],
      ['The policy receipt says {result}. I will compare it with the commitments on file.', 'The completed issue action is recorded as {result}.', 'Our actual policy outcome is {result}.'],
    ],
    [
      ['Check the existing commitments before moving the position: {reason}.', 'The issue opportunity in {target} is {reason}.', 'A new stance must fit what we already promised: {reason}.'],
      ['There is a recorded commitment to resolve first: {reason}.', 'I would keep the platform steady until {reason} is addressed.', 'The real tradeoff is this promise against the proposed stance: {reason}.'],
      ['The policy receipt records {result}. I will compare it to the file.', 'The completed issue action is {result}.', 'Here is the actual policy outcome: {result}.'],
    ],
  ), { scope: 'staff.policy.issue-alignment' }),
  role('muckraker', 'Muckraker / Opposition Research Director', 'Source-backed opponent research and documented vulnerabilities.', 'Adds evidence quality only when a valid source receipt exists; unsupported claims remain ineligible.', ['oppo'], 'MR', makeVoicePack(
    [
      ['Show me the source before we use the claim: {reason}.', 'The available record supports a narrow research step: {reason}.', 'I can recommend this only because the source is already logged: {reason}.'],
      ['The allegation has no usable source in this record: {reason}.', 'Do not turn a rumor into a campaign claim. The evidence gap is {reason}.', 'We should hold the response until the receipt is verified: {reason}.'],
      ['The source-linked receipt records {result}. That is the limit of what we can say.', 'The completed research action is logged as {result}.', 'The outcome is {result}; no extra claim is added.'],
    ],
    [
      ['Put the source on the table before using the claim: {reason}.', 'The existing record supports only this research step: {reason}.', 'This is actionable because the source receipt is already saved: {reason}.'],
      ['There is no usable source for the allegation: {reason}.', 'Do not campaign on an unsupported rumor. The gap is {reason}.', 'Hold the response until the evidence is recorded: {reason}.'],
      ['The source-linked receipt says {result}. We should stay within it.', 'The research result is logged as {result}.', 'That is the recorded outcome: {result}.'],
    ],
  ), { scope: 'staff.research.source-backed-evidence', recommendationRequiresEvidence: true }),
  role('social-media', 'Social Media Director', 'Social content, creator engagement and digital reach.', 'Improves registered social engagement through existing reach and fatigue rules.', ['ad'], 'SM', makeVoicePack(
    [
      ['A short message can travel if the audience fit is real: {reason}.', 'The digital opening in {target} supports {action}: {reason}.', 'Keep the post tied to a recorded issue signal: {reason}.'],
      ['Reach without audience fit is wasted effort. The competing evidence is {reason}.', 'I would not chase a trend that the campaign record does not support: {reason}.', 'The audience is split between priorities; {reason} is the useful signal.'],
      ['The action receipt records {result}. That is the engagement we can report.', 'The digital result is logged as {result}.', 'Here is the recorded reach outcome: {result}.'],
    ],
    [
      ['Digital reach works when audience fit is documented: {reason}.', 'The opening in {target} supports {action}: {reason}.', 'Tie the content to an issue signal already in the record: {reason}.'],
      ['Reach alone is not a reason to act. The current evidence is {reason}.', 'Do not chase a trend outside our record: {reason}.', 'The audience has competing priorities; this is the useful signal: {reason}.'],
      ['The receipt records {result}. That is the engagement we can claim.', 'The digital outcome is logged as {result}.', 'The recorded reach result is {result}.'],
    ],
  ), { scope: 'staff.social-media.engagement' }),
  role('media', 'Media Director / Press Secretary', 'Press access, interviews and earned coverage.', 'Improves an earned-media action and reduces fatigue only when native recovery is recorded.', ['townhall', 'spin'], 'MD', makeVoicePack(
    [
      ['The public question is already on the record: {reason}.', 'An interview or response in {target} can address {reason}.', 'Earned coverage should answer the actual question: {reason}.'],
      ['More airtime is not always more access. The conflict in the schedule is {reason}.', 'I would protect the candidate’s recovery window; the record says {reason}.', 'There is a real press tradeoff here: {reason}.'],
      ['The coverage receipt records {result}. Recovery counts only if it was logged.', 'The public-facing result is {result}.', 'The media outcome is in the receipt: {result}.'],
    ],
    [
      ['The public question is documented: {reason}.', 'A response in {target} would address {reason}.', 'Earned coverage should answer what people actually asked: {reason}.'],
      ['More airtime may cost recovery time. The record shows {reason}.', 'I would protect the candidate’s documented recovery window: {reason}.', 'We have a real press tradeoff: {reason}.'],
      ['The coverage receipt says {result}. Recovery counts only when recorded.', 'The public result is logged as {result}.', 'Here is the media outcome on file: {result}.'],
    ],
  ), { scope: 'staff.media.earned-coverage' }),
  role('legal', 'General Counsel / Compliance Director', 'Finance, ballot, advertising and campaign compliance.', 'Reduces avoidable compliance risk and validates required records before submission.', ['promise', 'oppo', 'fundraise', 'ad', 'endorsement'], 'GC', makeVoicePack(
    [
      ['The record needs to be complete before the campaign files it: {reason}.', 'This action is usable only inside the current rule gate: {reason}.', 'My recommendation is the compliant path shown by {reason}.'],
      ['The proposed step has a documented compliance issue: {reason}.', 'Do not waive a requirement on intuition; the native rule says {reason}.', 'I would pause the filing until the evidence is complete: {reason}.'],
      ['The submitted action is recorded as {result}. The rule check remains in the receipt.', 'The compliance outcome is logged: {result}.', 'Our record shows {result}; no missing fact was certified.'],
    ],
    [
      ['Complete the required record before filing: {reason}.', 'The current rule gate allows this path because {reason}.', 'The compliant recommendation is the one supported by {reason}.'],
      ['This step has a compliance issue on record: {reason}.', 'Do not waive a requirement based on a guess: {reason}.', 'Hold the filing until its evidence is complete: {reason}.'],
      ['The action receipt records {result}; the rule check remains attached.', 'The compliance result is logged as {result}.', 'The record says {result}; no absent fact has been certified.'],
    ],
  ), { scope: 'staff.legal.compliance-risk' }),
];

export const TRADITIONAL_STAFF_BY_ID = Object.freeze(
  Object.fromEntries(TRADITIONAL_STAFF_ROSTER.map((staff) => [staff.id, staff])),
);

// Transitional export for the Build 35 renderer, replaced at integration.
/** @deprecated Use the campaign's traditionalPortraitByRole. */
export const TRADITIONAL_STAFF_PORTRAIT_MAP = Object.freeze(
  Object.fromEntries(TRADITIONAL_STAFF_ROSTER.map((staff) => [staff.id, {
    status: 'unavailable',
    assetPath: null,
    reason: 'No verified generic staff portraits are present in the Build 34 art pool.',
  }])),
);

export function validateTraditionalStaffRoster(roster = TRADITIONAL_STAFF_ROSTER) {
  const errors = [];
  if (!Array.isArray(roster) || roster.length !== 14) {
    return ['Traditional staff roster must contain exactly 14 roles.'];
  }
  const ids = new Set();
  const effectIds = new Set();
  const effectScopes = new Set();
  roster.forEach((staff) => {
    if (!staff?.id || ids.has(staff.id)) errors.push(`Missing or duplicate traditional staff ID: ${staff?.id || '(blank)'}.`);
    ids.add(staff?.id);
    if (!staff?.effect?.id || effectIds.has(staff.effect.id)) errors.push(`Missing or duplicate effect ID for ${staff?.id || 'unknown staff'}.`);
    effectIds.add(staff?.effect?.id);
    if (!staff?.effect?.scope || effectScopes.has(staff.effect.scope)) errors.push(`Missing or duplicate effect scope for ${staff?.id || 'unknown staff'}.`);
    effectScopes.add(staff?.effect?.scope);
    if (!Array.isArray(staff?.recommendableActionIds) || staff.recommendableActionIds.length === 0) {
      errors.push(`${staff?.id || 'Unknown staff'} has no explicit recommendation action IDs.`);
    }
    if (staff?.recommendableActionIds?.some((actionId) => !TRADITIONAL_STAFF_ACTION_IDS.includes(actionId))) {
      errors.push(`${staff?.id || 'Unknown staff'} references an unregistered action ID.`);
    }
    if (!Number.isFinite(staff?.effect?.maxEffectMultiplier) || staff.effect.maxEffectMultiplier < 1 || staff.effect.maxEffectMultiplier > 1.1) {
      errors.push(`${staff?.id || 'Unknown staff'} has an effect cap outside 1.0–1.1.`);
    }
    ['dem', 'rep', 'coalition'].forEach((partyKey) => {
      ['recommendation', 'disagreement', 'debrief'].forEach((situation) => {
        const lines = staff?.dialogue?.[partyKey]?.[situation];
        if (!Array.isArray(lines) || lines.length < 2 || lines.some((line) => typeof line !== 'string' || !line.trim())) {
          errors.push(`${staff?.id || 'Unknown staff'} needs multiple ${partyKey} ${situation} dialogue lines.`);
        }
      });
    });
  });
  if (!ids.has('chief')) errors.push('Chief of Staff must be in the traditional roster.');
  return errors;
}
