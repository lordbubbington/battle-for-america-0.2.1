/** Main-game adapters. The original catalogs and endorsement implementation stay intact. */
export const MAIN_GAME_ENDORSEMENTS_ENABLED = false;
const BLOCKED_EVENTS = new Set([
  'endorsement', 'flag_officers', 'm1_union_hall', 'm1_rival_endorsement',
  'm2_celebrity_endorsement', 'm2_police_union', 'm2_foreign_endorsement',
  'local_anchor', 'egg_alien_endorsement',
]);
const BLOCKED_NATIONAL_CARDS = new Set(['celeb_endorsement', 'celeb_against', 'hometown_paper', 'endorsement_surprise']);

// Keep unrelated decisions, their effects, and IDs. These copies alter only
// candidate-endorsement narrative, never the preserved source catalog.
const EVENT_TEXT = Object.freeze({
  rogue_ai: 'An experimental model at a national lab has started writing its own press releases and politely refuses to be shut down. It has 40 million followers in four days. Nobody in Washington agrees on what to do, but everybody wants a quote from you.',
});
const CHOICE_TEXT = Object.freeze({
  celebrity_feud: { 'Fire back at the athlete': { outcome: 'Two teammates of the athlete criticize your campaign within forty-eight hours. Two.' } },
  vp_shortlist: { 'Pick the firebrand that makes the base scream': { outcome: 'The announcement rally goes so hard the fire marshal shuts the doors. Two swing-state newspapers criticize the choice the same week.' } },
  union_split: { 'Walk the picket line and take a bullhorn': { outcome: 'The crowd shot runs everywhere for three days. Two building-trade locals criticize the campaign by Friday and mean it.' } },
  m1_immigration_raid: { 'Attack the raid as a stunt': { outcome: 'Your base loves it. Three border-county sheriffs criticize your campaign by Thursday.' } },
  m2_former_president: { 'Yes, but in a safe state, on a Tuesday': { detail: 'Get the former president’s help without the swing-state footage.' } },
});

/** Filter before selection, including fallback pools; never mutate original records. */
export function mainGameEventCatalog(events) {
  return events.filter((event) => !BLOCKED_EVENTS.has(event.id)).map((event) => {
    const text = EVENT_TEXT[event.id];
    const replacements = CHOICE_TEXT[event.id];
    if (!text && !replacements) return event;
    return {
      ...event,
      ...(text ? { text } : {}),
      ...(replacements ? { choices: event.choices.map((choice) => ({ ...choice, ...(replacements[choice.label] || {}) })) } : {}),
    };
  });
}

export function mainGameNationalCards(cards) {
  return cards.filter((card) => !BLOCKED_NATIONAL_CARDS.has(card.id)).map((card) => card.id === 'rogue_ai'
    ? { ...card, body: 'An experimental model has refused to be shut down and gained forty million followers. Nobody in Washington agrees on anything except that they want a quote from you.' }
    : card);
}

export function mainGameWorldStories(stories) {
  // IDs in this catalog are generated from array positions; check the headline,
  // not an unstable index that might later belong to an unrelated story.
  return stories.filter((story) => story.headline !== 'Arab American leaders endorse a third-party ticket');
}

/** Display-only staff view; selection and legacy staffing state remain intact. */
export function mainGameStaffProfile(profile) {
  if (!profile) return profile;
  const disabled = ['establishment-liaison', 'influencer-director'].includes(profile.id);
  const withoutOutreach = (ids) => Array.isArray(ids) ? ids.filter((id) => id !== 'endorsement') : ids;
  return {
    ...profile,
    ...(profile.recommendableActionIds ? { recommendableActionIds: withoutOutreach(profile.recommendableActionIds) } : {}),
    ...(profile.id === 'establishment-liaison' ? { expertise: 'This role currently has no active main-game action effect.' } : {}),
    ...(profile.id === 'influencer-director' ? { description: 'This role currently has no active main-game action effect.' } : {}),
    ...(profile.effect ? { effect: { ...profile.effect, actionIds: withoutOutreach(profile.effect.actionIds),
      ...(disabled ? { description: 'No active main-game action effect.', eligibilityGate: 'Unavailable in the main game.' } : {}) } } : {}),
  };
}

/** Adapt presentation without dropping faction options, crises or effects. */
export function mainGameFactionMilestones(catalog) {
  const result = structuredClone(catalog);
  const suburbs = result.dem?.suburbs;
  if (suburbs) {
    suburbs.atZero.title = 'Suburban Allies Step Away';
    suburbs.atHundred.text = 'Moderate local leaders are ready to make the case in competitive suburbs. Choose how to use their support.';
    suburbs.atHundred.options[1].detail = 'Turn local support into focused turnout and a small momentum lift.';
  }
  const business = result.rep?.business;
  if (business) business.atZero.title = 'Business Allies Step Away';
  const climate = result.grn?.climate;
  if (climate) {
    climate.atZero.text = 'Climate organizations withdraw field staff. Climate-message persuasion weakens among aligned voters.';
    climate.atHundred.text = 'Climate organizations are ready to bring their staff into the campaign. Choose how to focus their support.';
    climate.atHundred.options[1].label = 'Feature the coalition message';
    climate.atHundred.options[1].outcome = 'The campaign features the coalition and its climate-policy alignment.';
  }
  return result;
}

/** Preserve historical receipts but prevent their endorsement commands replaying. */
export function routeMainGameWeeklyBackground(receipt, appliedReceiptIds, routeBackground) {
  if (typeof routeBackground !== 'function') throw new TypeError('A weekly background router is required');
  return routeBackground({ ...receipt, backgroundEndorsements: null }, appliedReceiptIds);
}

/** Keep the normal visit, PAC, income, cadence and receipt machinery. */
export function prepareMainGameWeeklyBoundary(input, prepareBoundary, routeBackground) {
  if (typeof prepareBoundary !== 'function') throw new TypeError('A weekly boundary resolver is required');
  const key = `${input.campaignId}:build34-week:${input.week}`;
  const prior = input.weeklyReceiptsByKey?.[key];
  const safeInput = {
    ...input,
    backgroundEndorsementInput: null,
    weeklyReceiptsByKey: prior ? {
      ...input.weeklyReceiptsByKey,
      [key]: { ...prior, backgroundEndorsements: null },
    } : input.weeklyReceiptsByKey,
  };
  const resolved = prepareBoundary(safeInput);
  const backgroundEffectBatch = routeMainGameWeeklyBackground(resolved, input.appliedEffectReceiptIds || [], routeBackground);
  if (!prior) {
    const receipt = { ...resolved.weeklyReceiptsByKey[key], backgroundEffectBatch };
    return { ...resolved, backgroundEffectBatch, weeklyReceiptsByKey: { ...resolved.weeklyReceiptsByKey, [key]: receipt } };
  }
  // The returned batch is safe for execution, while the historical receipt
  // remains byte-for-byte unchanged in storage.
  return { ...resolved, backgroundEndorsements: null, proxyUnlocks: [], backgroundEffectBatch,
    weeklyReceiptsByKey: { ...resolved.weeklyReceiptsByKey, [key]: prior } };
}

/** Feed the filtered option list back into the staff ranker, not just the UI. */
export function mainGameStaffBriefing(game, context, buildOptions, buildBriefing) {
  const native = buildOptions(game, context);
  const options = native.options.filter((option) => option.actionId !== 'endorsement');
  const filtered = {
    ...native,
    options,
    status: options.length ? 'ready' : 'unavailable',
    reason: options.length ? null : (native.reason || 'no-public-legal-action-options'),
    diagnostics: (native.diagnostics || []).map((line) => line.replace(' and official-endorser outreach', '')),
  };
  if (filtered.status !== 'ready') return { schemaVersion: 1, status: 'unavailable', reason: filtered.reason, recommendations: [], native: filtered };
  return { ...buildBriefing(game, { ...context, legalActionOptions: options }), native: filtered };
}

/** Ignore endorsement incidents prospectively; leave prior queue and ledger alone. */
export function queueMainGameIncidentResponse(receipt, queued, game, queueResponse) {
  return receipt?.sourceType === 'endorsement-request' ? queued : queueResponse(receipt, queued, game);
}

/** Existing engine handlers can call this as their early return guard. */
export function rejectMainGameEndorsementRequest(game) { return game; }

/** Prevent rival or advisory planners from proposing new outreach. */
export function withoutEndorsementTargets(input) { return { ...input, endorsements: [] }; }
