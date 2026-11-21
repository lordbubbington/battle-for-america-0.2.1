/** Build 34 follow-up content. Numeric effects are resolved by the game engine. */

const chain = (id, mode, starterEventId, title, summary, choices, additionalStarterEventIds = []) => ({
  chainId: id,
  mode,
  starterEventId,
  additionalStarterEventIds,
  followUpEventId: `derived_${id}`,
  title,
  summary,
  chain: true,
  drawRandomly: false,
  queueDelayWeeks: 1,
  linkAllStarterChoices: true,
  requiresStarterReceipt: true,
  choices,
});

const effect = (type, amount, scope = 'campaign', extra = {}) => ({ type, amount, scope, ...extra });
const CHOICE_EFFECTS = Object.freeze({
  publish_sample: [effect('credibility', 1), effect('voter-group-fit', -0.5, 'weakest-poll-group')],
  keep_private: [effect('momentum', -0.5)],
  name_funder: [effect('opponent-momentum', -1), effect('scandal-risk', 0.15)],
  buy_local_response: [effect('cash', -1.5), effect('voter-group-fit', 0.15, 'starter-state', { groupTag: 'local-audience' })],
  accept_condition: [effect('cash', 3), effect('voter-group-fit', -1, 'conflicting-faction')],
  reject_condition: [effect('cash', -1.5), effect('voter-group-fit', 0.5, 'party-base')],
  expand_phonebank: [effect('turnout', 1.5, 'starter-state'), effect('cash', -1)],
  focus_one_state: [effect('turnout', 1, 'starter-state'), effect('cash', -0.5)],
  open_field_operation: [effect('ground-game-level', 1, 'starter-state'), effect('weekly-upkeep', 0.5, 'starter-state')],
  one_week_canvass: [effect('turnout', 1.25, 'starter-state'), effect('cash', -0.5)],
  release_evidence: [effect('credibility', 1), effect('scandal-risk', 0.1)],
  seek_takedown: [effect('credibility', 0.5), effect('opponent-momentum', -0.25)],
  use_documented_contrast: [effect('opponent-momentum', -1), effect('scandal-risk', 0.1)],
  wait_for_inquiry: [effect('opponent-momentum', -0.5)],
  support_limited_authorization: [effect('voter-group-fit', 1, 'security-moderates'), effect('voter-group-fit', -0.75, 'antiwar-groups')],
  oppose_authorization: [effect('voter-group-fit', 1, 'antiwar-groups'), effect('voter-group-fit', -0.75, 'security-moderates')],
  fund_immediate_service: [effect('turnout', 1, 'starter-state'), effect('cash', -1.5)],
  wait_for_state_plan: [effect('cash', 0), effect('scandal-risk', 0.1)],
  publish_price_plan: [effect('issue-reception', 0.75, 'economy'), effect('cash', -1)],
  verify_figures: [effect('credibility', 0.75), effect('momentum', -0.25)],
  support_local_buyer: [effect('voter-group-fit', 0.25, 'starter-state', { groupTag: 'local-workers' }), effect('cash', -1.5)],
  wait_for_private_bid: [effect('cash', 0), effect('scandal-risk', 0.1)],
  send_mobile_clinics: [effect('turnout', 1.25, 'starter-state'), effect('cash', -1.5)],
  follow_health_schedule: [effect('turnout', 0.5, 'starter-state')],
  speed_repairs: [effect('voter-group-fit', 0.25, 'starter-state', { groupTag: 'local-residents' }), effect('cash', -1), effect('scandal-risk', 0.1)],
  audit_bids: [effect('credibility', 0.5), effect('cash', -0.25)],
  fast_permit_plan: [effect('voter-group-fit', 0.25, 'starter-state', { groupTag: 'local-housing' }), effect('voter-group-fit', -0.5, 'local-opposition')],
  publish_slow_plan: [effect('credibility', 0.25, 'starter-state')],
  correct_ad: [effect('credibility', 1), effect('momentum', -0.5)],
  defend_claim: [effect('voter-group-fit', 0.75, 'party-base'), effect('scandal-risk', 0.2)],
  fund_legal_challenge: [effect('cash', -2), effect('ballot-access', 1, 'starter-state')],
  accept_ruling: [effect('ballot-access', -1, 'starter-state'), effect('cash', 0)],
  remove_costly_rule: [effect('issue-reception', 1, 'libertarian-cost-of-living'), effect('voter-group-fit', -0.5, 'safety-groups')],
  keep_narrow_safety_rule: [effect('issue-reception', 0.5, 'libertarian-cost-of-living'), effect('voter-group-fit', 0.25, 'safety-groups')],
  small_employer_exemption: [effect('issue-reception', 0.75, 'small-business'), effect('scandal-risk', 0.1)],
  simpler_standards: [effect('issue-reception', 0.5, 'small-business')],
  broad_warrant_rule: [effect('issue-reception', 1, 'civil-liberties'), effect('voter-group-fit', -0.5, 'security-groups')],
  narrow_oversight_fix: [effect('issue-reception', 0.5, 'civil-liberties'), effect('voter-group-fit', 0.25, 'security-groups')],
  end_tax_credit: [effect('issue-reception', 0.75, 'fiscal-conservatives'), effect('voter-group-fit', -0.75, 'business-groups')],
  cap_tax_credit: [effect('issue-reception', 0.4, 'fiscal-conservatives'), effect('voter-group-fit', -0.2, 'business-groups')],
  congress_defines_authority: [effect('credibility', 0.75), effect('momentum', -0.25)],
  agency_narrows_rule: [effect('issue-reception', 0.4, 'civil-liberties')],
  fund_storage: [effect('issue-reception', 1, 'climate'), effect('cash', -1.5)],
  keep_backup_generation: [effect('issue-reception', 0.5, 'reliability'), effect('issue-reception', -0.25, 'climate')],
  replace_line_now: [effect('turnout', 1, 'starter-state'), effect('cash', -1.5)],
  install_filters: [effect('turnout', 0.5, 'starter-state'), effect('cash', -0.75)],
  pollution_prevention: [effect('issue-reception', 1, 'public-health'), effect('cash', -1.25)],
  clinic_access: [effect('turnout', 0.5, 'starter-state'), effect('cash', -0.5)],
  expand_soil_program: [effect('issue-reception', 0.75, 'climate'), effect('cash', -1.25)],
  commission_second_year_review: [effect('credibility', 0.5), effect('cash', -0.25)],
  start_cleanup: [effect('turnout', 0.75, 'starter-state'), effect('cash', -1.5)],
  audit_liability: [effect('credibility', 0.5), effect('cash', -0.25)],
});

const choice = (id, label, tradeoff) => ({
  id,
  label,
  tradeoff,
  effectCommands: CHOICE_EFFECTS[id] || [],
});

export const GENERAL_CAMPAIGN_CHAINS = [
  chain('internal_poll_cross_tabs', 'standard', 'm1_internal_poll', 'The Cross-Tabs Change the Story',
    'The detailed poll sample reveals which groups moved and which did not.', [
      choice('publish_sample', 'Publish the sample details', 'Small credibility lift; risk highlighting a weak voter group.'),
      choice('keep_private', 'Keep the poll private', 'Protect the message; give up some short-term momentum.'),
    ]),
  chain('superpac_donor_list', 'standard', 'm1_superpac', 'The Ad’s Donor List Is Public',
    'A public filing identifies who paid for the outside ad.', [
      choice('name_funder', 'Name the funder', 'Larger contrast; legal and credibility risk if the claim is imprecise.'),
      choice('buy_local_response', 'Answer with a local ad', 'Spend campaign funds; avoid repeating the accusation.'),
    ]),
  chain('donor_ultimatum_answer', 'standard', 'donor_ultimatum', 'The Donor Wants an Answer',
    'A major donor asks for a clear response to a documented policy condition.', [
      choice('accept_condition', 'Accept the condition', 'Secure more funds; risk alienating a voter group and a faction.'),
      choice('reject_condition', 'Reject the condition', 'Protect the platform; accept less cash.'),
    ]),
  chain('phonebank_close_states', 'standard', 'volunteer_phonebank', 'The Calls Reach the Close States',
    'Phone-bank results show where volunteer calls are reaching persuadable voters.', [
      choice('expand_phonebank', 'Expand the phone bank', 'Improve turnout reach at a funds cost.'),
      choice('focus_one_state', 'Concentrate on one close state', 'Smaller, safer turnout lift with less spending.'),
    ]),
  chain('precinct_list_ready', 'standard', 'precinct_captains', 'The Volunteer List Is Ready',
    'Precinct captains deliver an updated list of volunteers ready to work.', [
      choice('open_field_operation', 'Open a field operation', 'Lasting turnout capacity with weekly upkeep.'),
      choice('one_week_canvass', 'Run a one-week canvass', 'Smaller immediate lift without recurring upkeep.'),
    ]),
  chain('deepfake_platform_review', 'standard', 'm1_deepfake', 'The Platform Posts Its Review',
    'The platform publishes its review of the disputed campaign clip.', [
      choice('release_evidence', 'Release the evidence', 'Gain credibility and coverage; increase exposure to the dispute.'),
      choice('seek_takedown', 'Seek a fast takedown', 'Limit exposure; earn a smaller trust gain.'),
    ]),
  chain('opponent_scandal_timeline', 'standard', 'm2_opponent_scandal', 'The Records Fill in the Timeline',
    'New records establish the order of events behind the opponent story.', [
      choice('use_documented_contrast', 'Use the documented facts', 'Reduce opponent momentum; accept some scandal risk.'),
      choice('wait_for_inquiry', 'Let the inquiry continue', 'Take a smaller, safer gain.'),
    ]),
  chain('war_powers_vote', 'standard', 'm1_foreign_war', 'Congress Sets a War-Powers Vote',
    'Congress schedules a vote that will define the limits of the military action.', [
      choice('support_limited_authorization', 'Support limited authorization', 'Gain institutional credibility; risk an antiwar-group cost.'),
      choice('oppose_authorization', 'Oppose authorization', 'Gain a base lift; risk looking weak on security.'),
    ]),
  chain('water_tests_confirm', 'standard', 'm1_water_crisis', 'Independent Tests Confirm the Results',
    'Independent testing confirms the reported water problem.', [
      choice('fund_immediate_service', 'Fund immediate water service', 'Help turnout and health groups; spend public funds.'),
      choice('wait_for_state_plan', 'Wait for a state plan', 'Preserve cash; risk another week of bad coverage.'),
    ]),
  chain('grocery_price_check', 'standard', 'm2_grocery_tour', 'The Price Check Reaches the Stores',
    'The campaign checks its grocery-price claims against local store data.', [
      choice('publish_price_plan', 'Publish a price plan', 'Gain issue support; spend funds on implementation.'),
      choice('verify_figures', 'Ask stores to verify the figures', 'Respond more slowly with lower risk.'),
    ]),
  chain('plant_buyer_offer', 'standard', 'plant_closure', 'A Buyer Makes an Offer for the Plant',
    'A local buyer proposes keeping the closed plant site in production.', [
      choice('support_local_buyer', 'Support the local buyer', 'Gain a local lift; commit public spending.'),
      choice('wait_for_private_bid', 'Wait for a private bid', 'Save funds; risk losing the jobs story.'),
    ]),
  chain('outbreak_capacity', 'standard', 'm2_outbreak', 'Hospitals Report Their Capacity',
    'Hospitals publish current capacity and expected patient load.', [
      choice('send_mobile_clinics', 'Send mobile clinics', 'Help turnout and health groups at a cost.'),
      choice('follow_health_schedule', 'Follow the health department schedule', 'Save funds; risk a slower response.'),
    ]),
  chain('flood_contract_review', 'standard', 'm2_flood', 'The Repair Contracts Come Up for Review',
    'Reviewers examine the contracts for flood repairs.', [
      choice('speed_repairs', 'Speed up repairs', 'Gain a local benefit; accept oversight risk.'),
      choice('audit_bids', 'Audit the bids', 'Protect funds; accept slower recovery.'),
    ]),
  chain('housing_permit_count', 'standard', 'm2_housing', 'The Permit Count Tests the Housing Pledge',
    'New permit totals show whether the housing pledge can be delivered.', [
      choice('fast_permit_plan', 'Back a fast permit plan', 'Immediate margin opportunity; risk local opposition.'),
      choice('publish_slow_plan', 'Publish a slower plan', 'Smaller gain with lower implementation risk.'),
    ]),
  chain('ad_factcheck_second_question', 'standard', 'ad_flashpoint', 'The Fact-Check Adds a Second Question',
    'A fact-checker raises a new question about the disputed campaign ad.', [
      choice('correct_ad', 'Correct the ad', 'Gain credibility; lose its short-term lift.'),
      choice('defend_claim', 'Defend the claim', 'Gain with the base; increase scandal risk.'),
    ]),
  chain('third_party_ballot_ruling', 'standard', 'third_party', 'The Ballot Office Posts Its Ruling',
    'Election officials publish a ruling on the party’s ballot-access filing.', [
      choice('fund_legal_challenge', 'Fund a legal challenge', 'Keep a chance to preserve access; spend campaign funds.'),
      choice('accept_ruling', 'Accept the ruling', 'Save resources; redirect effort to a targeted state.'),
    ]),
];

export const SURGE_CAMPAIGN_CHAINS = [
  chain('lib_permit_costs', 'surge', '4p_lib_02', 'County Clerks Publish the Permit Costs',
    'County reports detail the cost of the licensing rule.', [
      choice('remove_costly_rule', 'Support removing the costly rule', 'Larger Libertarian issue lift; risk safety backlash.'),
      choice('keep_narrow_safety_rule', 'Keep a narrower safety rule', 'Smaller issue lift with less backlash.'),
    ], ['4p_lib_03', '4p_lib_04']),
  chain('lib_compliance_costs', 'surge', '4p_lib_07', 'Small Firms File Their Compliance Costs',
    'Small firms submit their estimated costs for meeting the new rule.', [
      choice('small_employer_exemption', 'Back a time-limited exemption', 'Immediate relief for small employers; risk a carve-out debate.'),
      choice('simpler_standards', 'Back a simpler rule', 'Keep standards while offering less immediate relief.'),
    ]),
  chain('lib_data_order', 'surge', '4p_lib_12', 'The Court Releases the Data-Collection Order',
    'The court publishes the order governing agency data collection.', [
      choice('broad_warrant_rule', 'Call for a broad warrant rule', 'Strong civil-liberties lift; security groups may object.'),
      choice('narrow_oversight_fix', 'Support a narrower oversight fix', 'Smaller lift with less risk on security.'),
    ]),
  chain('lib_tax_credit_cost', 'surge', '4p_lib_17', 'Budget Staff Price the Tax Credit',
    'Budget staff publish the cost of the tax credit.', [
      choice('end_tax_credit', 'End the credit', 'Larger fiscal lift; impose a business-group cost.'),
      choice('cap_tax_credit', 'Cap the credit', 'Smaller lift with less disruption.'),
    ]),
  chain('lib_agency_deadline', 'surge', '4p_lib_22', 'The Appeals Court Sets a Deadline',
    'The appeals court sets a deadline for the agency to explain its authority.', [
      choice('congress_defines_authority', 'Ask Congress to define its authority', 'Institutional lift; slower resolution.'),
      choice('agency_narrows_rule', 'Let the agency narrow its rule', 'Quicker but smaller policy result.'),
    ]),
  chain('grn_grid_reliability', 'surge', '4p_grn_02', 'Grid Data Show Which Plants Stayed Online',
    'Grid records show which power sources remained available during peak demand.', [
      choice('fund_storage', 'Fund energy storage', 'Larger clean-energy lift; spend public funds.'),
      choice('keep_backup_generation', 'Keep more backup generation', 'Protect reliability; take a smaller climate lift.'),
    ], ['4p_grn_03', '4p_grn_04']),
  chain('grn_water_tests', 'surge', '4p_grn_07', 'Independent Tests Confirm the Water Results',
    'Independent testing confirms contamination in the water system.', [
      choice('replace_line_now', 'Replace the line now', 'Larger health lift; higher immediate cost.'),
      choice('install_filters', 'Install filters during review', 'Smaller lift and lower cost.'),
    ]),
  chain('grn_asthma_findings', 'surge', '4p_grn_12', 'The Health Board Releases the Asthma Findings',
    'The health board releases neighborhood asthma data.', [
      choice('pollution_prevention', 'Fund pollution prevention', 'Larger health lift; spend public funds.'),
      choice('clinic_access', 'Expand clinic access', 'Smaller, faster health benefit.'),
    ]),
  chain('grn_soil_program_results', 'surge', '4p_grn_17', 'The Farm Co-op Publishes Its First-Year Results',
    'A farm cooperative publishes results from the soil program’s first year.', [
      choice('expand_soil_program', 'Expand the program', 'Larger climate and agriculture lift; spend funds.'),
      choice('commission_second_year_review', 'Commission another review', 'Smaller lift with less risk.'),
    ]),
  chain('grn_cleanup_bid_review', 'surge', '4p_grn_22', 'Cleanup Bids Come in Above the Estimate',
    'Cleanup bids exceed the initial estimate.', [
      choice('start_cleanup', 'Start cleanup now', 'Local health benefit; pay the higher cost.'),
      choice('audit_liability', 'Audit liability first', 'Save money; risk delay.'),
    ]),
];

export const TRIGGERED_EVENT_CHAINS = [...GENERAL_CAMPAIGN_CHAINS, ...SURGE_CAMPAIGN_CHAINS];

/** Convert a chain record to the derived-event shape expected by the adapter. */
export function materializeFollowUpEvent(definition) {
  if (!definition?.chainId || !definition?.followUpEventId || !definition?.starterEventId) {
    throw new Error('A follow-up definition needs stable chain, starter, and event IDs');
  }
  return {
    id: definition.followUpEventId,
    title: definition.title,
    icon: 'data',
    tone: 'hope',
    kicker: 'The story continues',
    text: definition.summary,
    priority: 3,
    chain: true,
    drawRandomly: false,
    when: () => false,
    why: `Follow-up to recorded event ${definition.starterEventId}; queued only after its choice receipt.`,
    chainId: definition.chainId,
    starterEventId: definition.starterEventId,
    modeOnly: definition.mode === 'surge' ? 'surge' : null,
    queueDelayWeeks: 1,
    choices: definition.choices.map((option) => ({
      id: option.id,
      label: option.label,
      detail: option.tradeoff,
      tradeoff: option.tradeoff,
      effects: { build34Commands: option.effectCommands },
    })),
  };
}

/** Attach the same continuation to each starter choice, preserving source data. */
export function attachTriggeredEventChainLinks(starterEvents, definitions = TRIGGERED_EVENT_CHAINS) {
  const byId = new Map((starterEvents || []).map((event) => [event.id, event]));
  const result = new Map(byId);
  for (const definition of definitions || []) {
    const starterIds = [...new Set([definition.starterEventId, ...(definition.additionalStarterEventIds || [])])];
    for (const starterEventId of starterIds) {
      const starter = result.get(starterEventId);
      if (!starter) throw new Error(`Missing starter event ${starterEventId} for ${definition.chainId}`);
      const choices = (starter.choices || []).map((option, index) => {
        const oldLink = option.then?.event ? option.then : null;
        if (oldLink && oldLink.event !== definition.followUpEventId) {
          throw new Error(`Conflicting continuation on ${starter.id}:${option.id}: ${oldLink.event}`);
        }
        return {
          ...option,
          id: option.id || `${starter.id}:choice-${index + 1}`,
          then: {
            event: definition.followUpEventId,
            delay: 1,
            chainId: definition.chainId,
            starterEventId: starter.id,
            modeOnly: definition.mode === 'surge' ? 'surge' : null,
            why: `This follows your recorded choice in ${starter.id}.`,
            teaser: definition.title,
          },
        };
      });
      if (!choices.length) throw new Error(`Starter ${starter.id} needs at least one choice to link a follow-up`);
      result.set(starter.id, { ...starter, choices });
    }
  }
  return [...result.values()];
}

/** Build the ready-to-register derived-event set without random draw access. */
export function materializeTriggeredEventChains(definitions = TRIGGERED_EVENT_CHAINS) {
  return (definitions || []).map(materializeFollowUpEvent);
}

/** Build a receipt-backed command batch for the shared campaign resolvers. */
/**
 * @param {{ campaignId?: string, starterEventId?: string, choice?: any, starterReceipt?: any, resolvedChoiceReceiptIds?: string[] }} input
 */
export function resolveTriggeredEventChoiceCommands({
  campaignId,
  starterEventId,
  choice,
  starterReceipt,
  resolvedChoiceReceiptIds = [],
} = {}) {
  const commands = choice?.effects?.build34Commands || choice?.effectCommands;
  if (!campaignId || !starterEventId || !choice || !Array.isArray(commands)) {
    throw new Error('Triggered-event choice needs campaign, starter, choice, and effect command data');
  }
  const choiceId = choice.id || choice.choiceId || choice.label;
  if (!choiceId) throw new Error('Triggered-event choice needs a stable ID');
  if (!starterReceipt?.eventId || starterReceipt.eventId !== starterEventId || !starterReceipt.choiceId) {
    throw new Error('Triggered-event effects require a matching recorded starter event and choice');
  }
  const receiptId = `${campaignId}:${starterEventId}:${choiceId}`;
  if (resolvedChoiceReceiptIds.includes(receiptId)) {
    return { commands: [], resolvedChoiceReceiptIds, receiptId, applied: false };
  }
  const resolvedCommands = commands.map((command, index) => {
    if (!command?.type || !Number.isFinite(Number(command.amount))) {
      throw new Error(`Invalid triggered-event effect on ${starterEventId}:${choiceId}`);
    }
    const scoped = {
      ...command,
      sourceEventId: starterEventId,
      choiceId,
      choiceReceiptId: receiptId,
      receiptId: `${receiptId}:effect-${index + 1}`,
    };
    if (command.scope === 'starter-state') {
      if (!starterReceipt?.stateId) throw new Error(`Event ${starterEventId} has no recorded state for a local effect`);
      scoped.stateId = starterReceipt.stateId;
    }
    if (command.scope === 'starter-issue') {
      if (!starterReceipt?.issueId) throw new Error(`Event ${starterEventId} has no recorded issue for an issue effect`);
      scoped.issueId = starterReceipt.issueId;
    }
    if (starterReceipt?.party) scoped.party = starterReceipt.party;
    return scoped;
  });
  return {
    commands: resolvedCommands,
    resolvedChoiceReceiptIds: [...resolvedChoiceReceiptIds, receiptId],
    receiptId,
    applied: true,
  };
}

/** Check exact event IDs/modes and that every starter option now links forward. */
export function validateMaterializedTriggeredChains({ starterEvents = [], definitions = TRIGGERED_EVENT_CHAINS } = {}) {
  const errors = [];
  const starterById = new Map((starterEvents || []).map((event) => [event.id, event]));
  const followUpIds = new Set((definitions || []).map((definition) => definition.followUpEventId));
  for (const definition of definitions || []) {
    const starterIds = [...new Set([definition.starterEventId, ...(definition.additionalStarterEventIds || [])])];
    for (const starterId of starterIds) {
      const starter = starterById.get(starterId);
      if (!starter) {
        errors.push(`Missing starter ${starterId}`);
        continue;
      }
      if (!(starter.choices || []).length) errors.push(`Starter ${starter.id} has no choices`);
      for (const option of starter.choices || []) {
        if (option.then?.event !== definition.followUpEventId || Number(option.then?.delay) !== 1) {
          errors.push(`Starter choice ${starter.id}:${option.id || option.label} does not queue ${definition.followUpEventId} next week`);
        }
      }
    }
    if (!followUpIds.has(definition.followUpEventId)) errors.push(`Missing derived follow-up ${definition.followUpEventId}`);
  }
  return { valid: errors.length === 0, errors, chainCount: (definitions || []).length };
}

/** Measure linked starter/follow-up coverage against the complete registered mode catalogs. */
export function validateTriggeredChainParticipation({
  standardEvents = [],
  surgeEvents = [],
  definitions = TRIGGERED_EVENT_CHAINS,
  minimumParticipation = 0.2,
} = {}) {
  const errors = [];
  const rawMinimum = Number(minimumParticipation);
  const configuredMinimum = Number.isFinite(rawMinimum) ? Math.max(0, Math.min(1, rawMinimum)) : 0.2;
  if (!Number.isFinite(rawMinimum) || rawMinimum < 0 || rawMinimum > 1) {
    errors.push('minimumParticipation must be a number from 0 to 1');
  }
  const modeDefinitions = {
    standard: (definitions || []).filter((definition) => definition.mode === 'standard'),
    surge: (definitions || []).filter((definition) => ['standard', 'surge'].includes(definition.mode)),
  };

  const inspectMode = (mode, catalog) => {
    const ids = new Set();
    const duplicateEventIds = [];
    for (const event of catalog || []) {
      if (!event?.id) {
        errors.push(`${mode} catalog has an event without an id`);
        continue;
      }
      if (ids.has(event.id)) duplicateEventIds.push(event.id);
      ids.add(event.id);
    }
    if (duplicateEventIds.length) {
      errors.push(`${mode} catalog has duplicate event IDs: ${[...new Set(duplicateEventIds)].join(', ')}`);
    }

    const participantIds = new Set(modeDefinitions[mode].flatMap((definition) => [
      definition.starterEventId,
      definition.followUpEventId,
    ]));
    for (const event of catalog || []) {
      if (event?.chain === true) participantIds.add(event.id);
      for (const choice of event?.choices || []) {
        if (choice?.then?.event) {
          participantIds.add(event.id);
          participantIds.add(choice.then.event);
        }
      }
    }
    const missingParticipantIds = [...participantIds].filter((id) => !ids.has(id));
    if (missingParticipantIds.length) {
      errors.push(`${mode} catalog is missing chain participants: ${missingParticipantIds.join(', ')}`);
    }
    const participatingEventCount = [...participantIds].filter((id) => ids.has(id)).length;
    const totalEventCount = ids.size;
    const participationRate = totalEventCount ? participatingEventCount / totalEventCount : 0;
    if (participationRate < configuredMinimum) {
      errors.push(`${mode} chain participation ${(participationRate * 100).toFixed(1)}% is below ${(configuredMinimum * 100).toFixed(1)}%`);
    }
    return {
      totalEventCount,
      participatingEventCount,
      participationRate,
      missingParticipantIds,
      duplicateEventIds: [...new Set(duplicateEventIds)],
    };
  };

  return {
    valid: errors.length === 0,
    minimumParticipation: configuredMinimum,
    modes: {
      standard: inspectMode('standard', standardEvents),
      surge: inspectMode('surge', surgeEvents),
    },
    errors,
  };
}

/** Verify starters exist and every starter choice is required to link forward. */
export function validateTriggeredEventChains(chains, starterEventsByMode) {
  const errors = [];
  const chainIds = new Set();
  const followUpIds = new Set();
  for (const definition of chains || []) {
    if (!definition?.chainId || chainIds.has(definition.chainId)) errors.push(`Missing or duplicate chain id: ${definition?.chainId}`);
    chainIds.add(definition?.chainId);
    if (!definition?.followUpEventId || followUpIds.has(definition.followUpEventId)) {
      errors.push(`Missing or duplicate follow-up event id: ${definition?.followUpEventId}`);
    }
    followUpIds.add(definition?.followUpEventId);
    for (const starterEventId of [definition.starterEventId, ...(definition.additionalStarterEventIds || [])]) {
      if (!starterEventsByMode?.[definition.mode]?.has(starterEventId)) {
        errors.push(`Unknown ${definition.mode} starter ${starterEventId}`);
      }
    }
    if (definition.queueDelayWeeks !== 1 || definition.drawRandomly !== false ||
        definition.linkAllStarterChoices !== true || definition.requiresStarterReceipt !== true) {
      errors.push(`Invalid chain delivery contract for ${definition.chainId}`);
    }
    if (!Array.isArray(definition.choices) || definition.choices.length < 2) {
      errors.push(`Follow-up ${definition.followUpEventId} needs at least two meaningful choices`);
    }
    const choiceIds = new Set();
    for (const option of definition.choices || []) {
      if (!option.id || choiceIds.has(option.id) || !option.tradeoff || !option.effectCommands?.length) {
        errors.push(`Invalid or non-mechanical choice in ${definition.followUpEventId}`);
      }
      choiceIds.add(option.id);
    }
  }
  return { valid: errors.length === 0, errors, count: chainIds.size };
}
