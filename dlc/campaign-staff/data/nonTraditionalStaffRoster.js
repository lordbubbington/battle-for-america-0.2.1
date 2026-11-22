export const NONTRADITIONAL_STAFF_SCHEMA_VERSION = 2;
export const NONTRADITIONAL_SELECTION_POOL_SIZE = 3;
// Import-compatible aliases while Build 36 integration replaces the legacy adapter.
export const NONTRADITIONAL_STAFF_OFFER_COUNT = NONTRADITIONAL_SELECTION_POOL_SIZE;
export const NONTRADITIONAL_STAFF_HIRE_CAP = NONTRADITIONAL_SELECTION_POOL_SIZE;

const staff = (id, name, description, weeklyUpkeep, actionIds, commandType, scope, gate, drawback, receiptTypes = ['campaign-action'], useLimit = 'weekly') => {
  const effectId = `nontraditional-staff:${id}:v1`;
  return {
    id,
    name,
    description,
    weeklyUpkeep,
    artKey: `/art/staff/nontraditional/${id}.png`,
    artStatus: 'verified-build35-art',
    effectId,
    effect: {
      id: effectId,
      commandType,
      scope,
      actionIds,
      receiptTypes,
      useLimit,
      eligibilityGate: gate,
      maxEffectMultiplier: 1.1,
      drawback,
    },
  };
};

// The design's fictional profiles are deliberately bounded to existing actions,
// receipts, and resolver channels. Shared game-engine application is owned by integration.
export const NONTRADITIONAL_STAFF_ROSTER = Object.freeze([
  staff('etsy-witch', 'The Etsy Witch', 'Once per week, nudges the quality of the first naturally randomized campaign action in the player’s favor and the rival’s first natural quality roll against the rival.', 0.5, ['visit', 'townhall', 'volunteers', 'fundraise', 'promise', 'ops', 'shift', 'prep', 'oppo', 'ad', 'endorsement'], 'candidate-voter-group-fit', 'natural-quality-roll', 'First natural campaign quality roll of the week; no event or factual outcome is created.', 'The bounded, seed-replayable nudge is modest and may not affect a week with no eligible roll.', ['campaign-action', 'rival-action']),
  staff('influencer-director', 'Influencer Director', 'Opens one influencer-endorsement outreach per week, resolved through the existing endorsement and turnout rules.', 0.75, ['endorsement'], 'turnout-capacity', 'endorsement-outreach', 'An eligible influencer endorsement and normal campaign action are available.', 'Outreach consumes the normal action when not already part of the active agenda.'),
  staff('bot-farm-director', 'Bot Farm Director', 'Uses a costly social-media operation to suppress the rival’s momentum gains from social-media actions.', 5, ['social-media'], 'opponent-momentum', 'rival-social-momentum', 'A rival social-media action has a recorded momentum result.', 'High weekly upkeep; a source-backed exposure event can cause a serious credibility penalty.', ['rival-action']),
  staff('cow-abduction-witness', 'Billy Bob’s Cow-Abduction Witness', 'A booked appearance at a real campaign stop or interview can produce local earned media and volunteer response in the host state.', 0.5, ['visit', 'townhall'], 'proxy-stop', 'logged-local-appearance', 'A source receipt confirms the staffer appeared at a real stop or interview in the target state.', 'Low-fit states may treat the appearance as a joke.'),
  staff('astrology-consultant', 'Astrology Consultant', 'Once per week, reassigns the selected agenda’s single execution bonus to a second compatible action before either action is taken.', 0.25, ['visit', 'townhall', 'volunteers', 'fundraise', 'shift', 'prep'], 'ground-game-capacity', 'agenda-bonus-reassignment', 'A selected agenda and two compatible, not-yet-taken actions are recorded.', 'Reassigns the existing bonus; never duplicates it or grants another action.', ['agenda-selection']),
  staff('podcast-consultant', 'Podcast Consultant', 'Adds a long-form interview action that can build issue-specific persuasion among groups the campaign can already reach.', 0.75, ['podcast-interview'], 'issue-reception', 'long-form-interview', 'A long-form interview action and reachable, issue-aligned voter groups are available.', 'The interview consumes an action and can expose the candidate to a recorded gaffe.'),
  staff('cow-abductor-denialist', '“Not a Sentient Cow” Consultant', 'When a cow-related incident is already in the ledger, reduces rival responses tied to that exact incident.', 0.4, ['incident-response'], 'credibility', 'cow-incident-response', 'A matching cow-related incident receipt and rival response are recorded.', 'No effect without the matching source receipt; repeated appearances can revive the story.', ['incident-response'], 'source'),
  staff('openly-alien', 'The Openly Green Alien Consultant', 'Turns a qualifying public appearance into high-reach earned coverage; voter-group reactions follow existing issue and credibility affinities.', 1.25, ['visit', 'townhall'], 'candidate-voter-group-fit', 'public-appearance-coverage', 'A qualifying public appearance and its audience receipt are recorded.', 'Coverage is polarizing; the advisor cannot dictate which groups react positively.'),
  staff('bigfoot-tracker', 'Bigfoot Tracker', 'Improves one rural-targeted field action per week by locating eligible low-turnout areas from existing state and race data.', 0.5, ['volunteers', 'visit'], 'ground-game-capacity', 'rural-low-turnout-targeting', 'Existing state and race data identify an eligible rural low-turnout area.', 'Uses only modeled turnout and geography already in the game; adds no demographic inference.'),
  staff('ghost-medium', 'The Medium', 'When a real scandal or news incident is logged, surfaces one additional eligible response path tied to that same receipt.', 0.5, ['incident-response'], 'scandal-risk', 'incident-response-option', 'A source-backed scandal or news incident receipt has an additional registered response.', 'Cannot reveal future events or create a source incident; limited to one use per incident.', ['incident'], 'source'),
  staff('cryptid-zoologist', 'Cryptid Zoologist', 'Improves outreach to existing rural and outdoors-oriented voter groups on a compatible environment or land-use message.', 0.5, ['shift', 'issue-ad'], 'voter-group-fit', 'rural-outdoors-issue-fit', 'The action targets existing rural or outdoors-oriented groups with a compatible issue.', 'Irrelevant messages gain no effect.'),
  staff('ufo-convention-organizer', 'UFO Convention Organizer', 'Converts one qualifying campaign event into a volunteer sign-up boost in its host state.', 0.75, ['townhall', 'visit'], 'ground-game-capacity', 'event-volunteer-signups', 'A scheduled event and host venue are confirmed by a campaign receipt.', 'The effect is local to the host state and capped.', ['campaign-event']),
  staff('asmr-streamer', 'ASMR Streamer', 'Produces a low-fatigue digital-ad variant that lowers general fatigue for one digital placement batch.', 0.75, ['issue-ad', 'social-media'], 'issue-ad-capacity', 'low-fatigue-digital-batch', 'A digital placement batch is recorded and eligible for the existing ad resolver.', 'The variant has a lower persuasion ceiling than a conventional issue ad.'),
  staff('mothman-historian', 'Mothman Historian', 'Uses a logged local incident to let one response action target the affected state before the story decays.', 0.5, ['incident-response', 'oppo'], 'local-persuasion', 'logged-local-story-timing', 'A current local-news receipt identifies the affected state and has not decayed.', 'Cannot access future news; requires a recorded local story.', ['local-news'], 'source'),
  staff('crop-circle-artist', 'Crop-Circle Artist', 'Adds earned visual coverage to one real outdoor campaign stop and improves volunteer recruitment at that stop.', 0.75, ['visit', 'volunteers'], 'proxy-stop', 'outdoor-stop-coverage', 'A real outdoor stop and its host state are recorded.', 'The normal stop cost still applies; attention may be negative in a low-fit state.'),
  staff('wrestling-promoter', 'Retired Wrestling Promoter', 'Improves attendance and volunteer conversion for one scheduled rally or town hall.', 1, ['visit', 'townhall'], 'turnout-capacity', 'rally-attendance-conversion', 'A scheduled rally or town hall has an attendance receipt.', 'The more demanding event increases candidate fatigue.'),
  staff('carnival-barker', 'County-Fair Barker', 'Improves one volunteer-drive result by converting event attendance into sign-ups through the native field resolver.', 0.5, ['volunteers'], 'ground-game-capacity', 'volunteer-drive-conversion', 'A volunteer-drive action has recorded attendance eligible for conversion.', 'Applies only to volunteer drives and does not directly grant turnout.'),
  staff('haunted-house-owner', 'Haunted-House Owner', 'Provides a one-time venue discount for an eligible in-state rally or fundraiser.', 0.5, ['townhall', 'fundraise'], 'donation', 'one-time-venue-discount', 'An eligible in-state venue is booked for a rally or fundraiser.', 'The discount is local and the venue can be used once per campaign.', ['campaign-action'], 'campaign'),
  staff('zine-librarian', 'Underground Zine Librarian', 'Reduces the cost of one low-cost print or leaflet action and sharpens its issue targeting.', 0.25, ['print-ad'], 'issue-ad-credit', 'print-leaflet-targeting', 'A low-cost print or leaflet action is eligible for the native ad resolver.', 'Does not affect broadcast or digital ads; normal print fatigue still applies.'),
  staff('time-share-salesman', 'Time-Share Salesman', 'Raises the yield of one major-donor fundraiser by widening the donor invitation list.', 0.75, ['fundraise'], 'donation', 'major-donor-fundraiser-yield', 'A major-donor fundraiser and its eligible invitation list are recorded.', 'Creates a donor-faction obligation and credibility risk if recorded commitments conflict.'),
  staff('fermentation-creator', 'Fermentation Creator', 'Improves one affordability or food-cost message placement among reachable groups already responsive to cost-of-living issues.', 0.5, ['issue-ad', 'shift'], 'issue-reception', 'affordability-message-fit', 'The placement addresses affordability or food costs and targets existing responsive groups.', 'The issue gate is narrow; no new voter group is added.'),
  staff('survivalist-prepper', 'Survivalist Prepper', 'Improves field-contact conversion among existing low-turnout rural voters in one targeted state.', 0.5, ['volunteers', 'visit'], 'ground-game-capacity', 'low-turnout-rural-field-conversion', 'Existing state data show a real turnout gap among eligible rural targets.', 'Has no effect where no eligible turnout gap is recorded.'),
  staff('haunted-sign-blacksmith', 'Haunted-Sign Blacksmith', 'Supplies one in-kind signage batch that reduces the cash cost of an eligible sign or ground operation.', 0.25, ['ground-game', 'volunteers'], 'ground-game-level', 'in-kind-signage-batch', 'A compatible signage or ground operation is recorded.', 'Signage provides no direct persuasion effect.', ['campaign-action'], 'campaign'),
  staff('ufo-radio-operator', 'UFO Radio Operator', 'Opens one niche earned-media booking that reduces the impact of a rival attack ad in the same state through the ad-response resolver.', 0.5, ['ad-response'], 'issue-ad-capacity', 'same-state-attack-response', 'A rival attack ad and the matching state are recorded in the source receipt.', 'Only responds to a logged attack; it does not prevent attacks proactively.', ['rival-ad'], 'source'),
  staff('county-fair-psychic', 'County-Fair Psychic', 'Improves the precision of one state polling or uncertainty action by adding a second sample source in that state.', 0.5, ['poll'], 'voter-group-fit', 'state-sample-precision', 'The native information action can run and records the second sample source.', 'Does not alter the sampled result.'),
  staff('ghost-hunting-paralegal', 'Ghost-Hunting Paralegal', 'Audits one campaign or opponent claim against recorded evidence, lowering the risk of a source-backed response.', 0.75, ['oppo', 'promise'], 'scandal-risk', 'recorded-evidence-audit', 'A specific claim and its public evidence are recorded.', 'Cannot uncover private information or fabricate an opponent vulnerability.'),
  staff('eccentric-public-records-librarian', 'Public-Records Librarian', 'Improves one Muckraker research action by finding a matching, already available public record and documenting its source.', 0.5, ['oppo'], 'credibility', 'public-record-research', 'The native research action has a matching public record already available.', 'If the record is absent, no finding is produced and the normal research action is consumed.'),
  staff('reality-tv-producer', 'Reality-TV Producer', 'Improves one debate or campaign-event clip’s earned-media reach after the event actually occurs.', 1.5, ['debate', 'townhall', 'visit'], 'issue-reception', 'recorded-event-clip-reach', 'A debate or campaign event has occurred and its footage receipt is available.', 'Repeated exposure raises general fatigue.'),
  staff('meme-archivist', 'Meme Archivist', 'Improves one rapid-response social post tied to a logged news or event receipt, reducing delay and increasing issue relevance.', 0.5, ['social-media'], 'issue-reception', 'source-backed-rapid-response', 'A social post is tied to an existing news or event receipt.', 'There is no generic viral roll; the response can increase fatigue.'),
  staff('sentient-cow-consultant', 'The Sentient Cow (Not Billy Bob’s Captor)', 'Makes one animal-welfare or agricultural briefing more credible among existing aligned groups and unlocks a local earned-media interview.', 1.25, ['shift', 'townhall'], 'credibility', 'animal-agriculture-briefing', 'An eligible issue and recorded local interview are both present.', 'The novelty can distract from unrelated campaign messages.', ['campaign-action'], 'campaign'),
]);

export const NONTRADITIONAL_STAFF_BY_ID = Object.freeze(
  Object.fromEntries(NONTRADITIONAL_STAFF_ROSTER.map((profile) => [profile.id, profile])),
);

const ROUTED_COMMAND_TYPES = new Set([
  'national-momentum', 'momentum', 'opponent-momentum', 'local-persuasion', 'voter-group-fit',
  'candidate-voter-group-fit', 'candidate-group-fit', 'issue-reception', 'credibility', 'turnout',
  'turnout-capacity', 'donation', 'cash', 'one-time-donation', 'next-week-donor-income',
  'ground-game-level', 'ground-game-capacity', 'weekly-upkeep', 'issue-ad-credit', 'issue-ad-capacity',
  'super-pac-ad', 'proxy-stop', 'scandal-risk', 'ballot-access', 'ballot-measure-petition-effort',
  'resolve-ballot-measure-through-voter-model',
]);
const REGISTERED_ACTION_IDS = new Set([
  'visit', 'townhall', 'volunteers', 'promise', 'ops', 'fundraise', 'shift', 'prep', 'oppo', 'ad',
  'endorsement', 'incident-response', 'podcast-interview', 'social-media', 'issue-ad', 'ground-game',
  'print-ad', 'ad-response', 'poll', 'debate',
]);

export function validateNonTraditionalStaffRoster(roster = NONTRADITIONAL_STAFF_ROSTER, { availableArtKeys = null } = {}) {
  const errors = [];
  if (!Array.isArray(roster)) return { valid: false, errors: ['Nontraditional staff roster must be a list.'], count: 0 };
  if (roster.length !== 30) errors.push('Nontraditional staff roster must contain exactly 30 profiles.');
  const ids = new Set();
  const effectIds = new Set();
  const artKeys = new Set();
  roster.forEach((profile) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(profile?.id ?? '') || ids.has(profile.id)) errors.push(`Missing, invalid, or duplicate nontraditional staff ID: ${profile?.id || '(blank)'}.`);
    ids.add(profile?.id);
    if (profile?.effectId !== `nontraditional-staff:${profile?.id}:v1` || profile.effect?.id !== profile.effectId || effectIds.has(profile.effectId)) errors.push(`Missing, mismatched, or duplicate effect ID for ${profile?.id || 'unknown staff'}.`);
    effectIds.add(profile?.effectId);
    if (!Number.isFinite(profile?.weeklyUpkeep) || profile.weeklyUpkeep < 0 || profile.weeklyUpkeep > 5) errors.push(`${profile?.id || 'Unknown staff'} has an invalid weekly upkeep.`);
    if (profile?.artKey !== `/art/staff/nontraditional/${profile?.id}.png`) errors.push(`${profile?.id || 'Unknown staff'} has an unexpected art key.`);
    if (profile?.artKey && artKeys.has(profile.artKey)) errors.push(`Duplicate nontraditional staff art key: ${profile.artKey}.`);
    artKeys.add(profile?.artKey);
    if (Array.isArray(availableArtKeys) && !availableArtKeys.includes(profile?.artKey)) errors.push(`Missing portrait asset for ${profile?.id || 'unknown staff'}: ${profile?.artKey}.`);
    if (!profile?.effect?.scope || !profile.effect?.commandType || !profile.effect?.eligibilityGate || !profile.effect?.drawback) errors.push(`${profile?.id || 'Unknown staff'} has an incomplete effect gate or tradeoff.`);
    if (profile?.effect?.commandType && !ROUTED_COMMAND_TYPES.has(profile.effect.commandType)) errors.push(`${profile?.id || 'Unknown staff'} uses unsupported command type ${profile.effect.commandType}.`);
    if (!Array.isArray(profile?.effect?.receiptTypes) || profile.effect.receiptTypes.length === 0) errors.push(`${profile?.id || 'Unknown staff'} has no eligible source receipt types.`);
    if (profile?.effect?.useLimit && !['weekly', 'campaign', 'source'].includes(profile.effect.useLimit)) errors.push(`${profile?.id || 'Unknown staff'} has an invalid use limit.`);
    if (!Number.isFinite(profile?.effect?.maxEffectMultiplier) || profile.effect.maxEffectMultiplier < 1 || profile.effect.maxEffectMultiplier > 1.1) errors.push(`${profile?.id || 'Unknown staff'} has an effect cap outside 1.0–1.1.`);
    if (!Array.isArray(profile?.effect?.actionIds) || profile.effect.actionIds.length === 0) errors.push(`${profile?.id || 'Unknown staff'} has no eligible action IDs.`);
    if (!Array.isArray(profile?.effect?.actionIds)) return;
    profile.effect.actionIds.forEach((actionId) => {
      if (!REGISTERED_ACTION_IDS.has(actionId)) errors.push(`${profile?.id || 'Unknown staff'} references unknown action ID ${actionId}.`);
    });
  });
  return { valid: errors.length === 0, errors, count: roster?.length || 0 };
}

const NONTRADITIONAL_STAFF_VALIDATION = validateNonTraditionalStaffRoster();
if (!NONTRADITIONAL_STAFF_VALIDATION.valid) {
  throw new Error(`Nontraditional staff catalog is invalid:\n${NONTRADITIONAL_STAFF_VALIDATION.errors.join('\n')}`);
}
