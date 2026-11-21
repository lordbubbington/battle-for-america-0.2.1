import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TRADITIONAL_GENERIC_PORTRAIT_IDS,
  TRADITIONAL_STAFF_BY_ID,
  TRADITIONAL_STAFF_ROSTER,
  validateTraditionalStaffRoster,
} from '../src/data/traditionalStaffRoster.js';
import {
  appendStaffBriefHistory,
  applyTraditionalStaffNativePayload,
  buildStaffBriefing,
  buildStaffDebrief,
  buildStaffDisagreement,
  createInitialTraditionalStaffing,
  createStaffAgenda,
  getTraditionalStaffDialogue,
  isTraditionalStaffingReady,
  inspectPolicyPromiseConflicts,
  planStaffAgendaEffect,
  previewTraditionalPortraits,
  recordStaffAgendaResolution,
  selectInitialTraditionalStaff,
  validateStaffRecommendation,
  validateTraditionalStaffing,
} from '../src/lib/traditionalStaffRules.js';

const selectedRoleIds = ['operations', 'pollster', 'communications', 'field', 'fundraising', 'small-donor', 'base-liaison', 'policy', 'muckraker'];
const selectionPool = ['etsy-witch', 'asmr-streamer', 'wrestling-promoter'];
const campaignId = 'traditional-staff-test';
const setup = () => createInitialTraditionalStaffing({ nonTraditionalSelectionPoolIds: selectionPool });
const confirm = (ids, staffing = setup()) => selectInitialTraditionalStaff(ids, staffing, campaignId);

function selectedRoster() {
  const result = confirm(selectedRoleIds);
  assert.equal(result.ok, true);
  return result.staffing;
}

function legalOptionsFor(staffing, overrides = {}) {
  return staffing.traditionalActiveIds.map((staffId, index) => {
    const staff = TRADITIONAL_STAFF_BY_ID[staffId];
    const actionId = staff.recommendableActionIds[0];
    const base = {
      optionId: `${staffId}-${index}`,
      actionId,
      actionLabel: actionId,
      targetId: `T-${index}`,
      targetName: `Target ${index}`,
      ruleKey: `native-rule-${staffId}`,
      cost: index % 2 ? 2 : 0,
      legal: true,
      reasonCodes: ['public-record-available'],
      reasonSummary: 'The native rules report a current, documented opportunity.',
      staffRoleIds: [staffId],
      supportedStaffEffectIds: [staff.effect.id],
      expectedValue: { status: 'available', value: 1.25, source: 'test-native-evaluator' },
    };
    return { ...base, ...(overrides[staffId] || {}) };
  });
}

test('traditional roster has 14 unique role and effect IDs', () => {
  assert.equal(validateTraditionalStaffRoster().length, 0);
  assert.equal(TRADITIONAL_STAFF_ROSTER.length, 14);
  assert.equal(new Set(TRADITIONAL_STAFF_ROSTER.map((staff) => staff.effect.id)).size, 14);
  assert.ok(TRADITIONAL_STAFF_BY_ID.chief);
});

test('initial staffing requires nine unique choices across the combined pool and can be confirmed once', () => {
  const initial = setup();
  assert.deepEqual(initial.traditionalActiveIds, ['chief']);
  assert.deepEqual(initial.nonTraditionalSelectionPoolIds, selectionPool);
  assert.equal(initial.initialSelectionComplete, false);
  assert.equal(isTraditionalStaffingReady(initial), false);
  assert.deepEqual(validateTraditionalStaffing(initial), []);

  const invalidCount = confirm(selectedRoleIds.slice(0, 8), initial);
  assert.equal(invalidCount.ok, false);
  assert.equal(invalidCount.staffing, null);
  const duplicate = confirm([...selectedRoleIds.slice(0, 8), selectedRoleIds[0]], initial);
  assert.equal(duplicate.ok, false);
  assert.equal(confirm([...selectedRoleIds.slice(0, 8), 'chief'], initial).ok, false);
  assert.equal(confirm([...selectedRoleIds.slice(0, 8), 'bot-farm-director'], initial).ok, false);
  assert.equal(confirm(selectedRoleIds, { ...initial, nonTraditionalSelectionPoolIds: ['etsy-witch', 'etsy-witch', 'asmr-streamer'] }).ok, false);
  assert.equal(selectInitialTraditionalStaff(selectedRoleIds, initial).ok, false);

  const before = JSON.stringify(initial);
  for (let count = 0; count <= 3; count += 1) {
    const choices = [...selectedRoleIds.slice(0, 9 - count), ...selectionPool.slice(0, count)];
    const result = confirm(choices, initial);
    assert.equal(result.ok, true, result.errors.join(' '));
    const { staffing } = result;
    assert.deepEqual(staffing.traditionalActiveIds, ['chief', ...selectedRoleIds.slice(0, 9 - count)]);
    assert.deepEqual(staffing.nonTraditionalActiveIds, selectionPool.slice(0, count));
    assert.equal(staffing.traditionalActiveIds.length + staffing.nonTraditionalActiveIds.length, 10);
    assert.equal(Object.hasOwn(staffing, 'nonTraditionalSelectionPoolIds'), false);
    assert.equal(Object.hasOwn(staffing, 'traditionalBenchIds'), false);
    assert.deepEqual(staffing.agendaByWeek, {});
    assert.deepEqual(staffing.briefingHistory, []);
    assert.equal(isTraditionalStaffingReady(staffing), true);
    assert.equal(confirm(choices, staffing).ok, false);
    assert.deepEqual(validateTraditionalStaffing(JSON.parse(JSON.stringify(staffing))), []);
  }
  assert.equal(JSON.stringify(initial), before);
});

test('traditional portraits are a seeded permutation and only active assignments survive', () => {
  const portraits = previewTraditionalPortraits(campaignId);
  assert.deepEqual(Object.keys(portraits), TRADITIONAL_STAFF_ROSTER.map(({ id }) => id));
  assert.deepEqual([...new Set(Object.values(portraits))].sort(), [...TRADITIONAL_GENERIC_PORTRAIT_IDS].sort());
  assert.deepEqual(previewTraditionalPortraits(campaignId), portraits);
  assert.notDeepEqual(previewTraditionalPortraits('different-campaign'), portraits);
  const { staffing } = confirm([...selectedRoleIds.slice(0, 6), ...selectionPool]);
  assert.deepEqual(staffing.traditionalPortraitByRole, Object.fromEntries(staffing.traditionalActiveIds.map((id) => [id, portraits[id]])));
  assert.equal(staffing.traditionalPortraitByRole.muckraker, undefined);
  const duplicatePortraits = { ...staffing.traditionalPortraitByRole, field: portraits.chief };
  assert.equal(isTraditionalStaffingReady({ ...staffing, traditionalPortraitByRole: duplicatePortraits }), false);
  assert.equal(isTraditionalStaffingReady({ ...staffing, traditionalBenchIds: [] }), false);
  assert.equal(isTraditionalStaffingReady({ ...staffing, nonTraditionalSelectionPoolIds: selectionPool }), false);
});

test('briefing only emits legal exact targets with native reason codes and deterministic values', () => {
  const staffing = selectedRoster();
  const legalActionOptions = legalOptionsFor(staffing, {
    'muckraker': { sourceReceiptIds: ['receipt-9'] },
    'small-donor': { expectedValue: { status: 'unavailable', reason: 'No marginal donor estimate is registered.' } },
  });
  legalActionOptions.push({ optionId: 'illegal', actionId: 'oppo', targetId: 'X', ruleKey: 'bad', cost: 0, legal: false, reasonCodes: ['x'] });
  const game = { week: 3, party: 'grn', staffing, hiddenVoters: [{ id: 'never-read' }] };
  const before = structuredClone(game);
  const context = { staffing, legalActionOptions, partyVocabulary: { factionLabel: 'Green coalition' } };
  const first = buildStaffBriefing(game, context);
  const second = buildStaffBriefing(game, context);

  assert.equal(first.status, 'ready');
  assert.equal(first.recommendations.length, 10);
  assert.deepEqual(first, second);
  assert.deepEqual(game, before);
  assert.equal(first.recommendations.find((item) => item.staffId === 'small-donor').valueStatus, 'unavailable');
  assert.equal(first.recommendations.find((item) => item.staffId === 'muckraker').evidenceSourceReceiptIds.length, 1);
  assert.ok(first.recommendations.every((item) => item.legal && item.targetId && item.reasonCodes.length && Number.isFinite(item.cost)));
  assert.equal(first.recommendations[0].partyContext, 'grn');
  assert.equal(first.recommendations.find((item) => item.staffId === 'chief').agendaEligible, true);
});

test('unsupported opposition research and action options without evidence are omitted', () => {
  const staffing = selectedRoster();
  const legalActionOptions = legalOptionsFor(staffing, {
    muckraker: { sourceReceiptIds: [] },
  });
  const briefing = buildStaffBriefing({ week: 1, party: 'dem', staffing }, { staffing, legalActionOptions });
  assert.equal(briefing.recommendations.some((item) => item.staffId === 'muckraker'), false);
  assert.equal(validateStaffRecommendation({ staffId: 'muckraker', actionId: 'oppo' }, staffing, legalActionOptions).length > 0, true);
});

test('agenda requires the exact live native option and locks after actions begin', () => {
  const staffing = selectedRoster();
  const legalActionOptions = legalOptionsFor(staffing, { muckraker: { sourceReceiptIds: ['receipt-1'] } });
  const briefing = buildStaffBriefing({ week: 4, party: 'dem', staffing }, { staffing, legalActionOptions });
  const recommendation = briefing.recommendations.find((item) => item.staffId === 'field');
  assert.deepEqual(validateStaffRecommendation(recommendation, staffing, legalActionOptions), []);

  const created = createStaffAgenda(recommendation, staffing, legalActionOptions);
  assert.equal(created.ok, true);
  assert.equal(created.agenda.status, 'unconsumed');
  assert.equal(created.agenda.week, 4);
  assert.equal(createStaffAgenda(recommendation, staffing, legalActionOptions, { actionsTakenThisWeek: 1 }).ok, false);
  assert.equal(createStaffAgenda(recommendation, staffing, legalActionOptions, { qualifyingActionConsumed: true }).ok, false);
  const informationalOptions = legalActionOptions.map((option) => option.optionId === recommendation.nativeOptionId
    ? { ...option, supportedStaffEffectIds: [] } : option);
  const informational = buildStaffBriefing({ week: 4, party: 'dem', staffing }, { staffing, legalActionOptions: informationalOptions })
    .recommendations.find((item) => item.staffId === 'field');
  assert.equal(informational.agendaEligible, false);
  assert.equal(createStaffAgenda(informational, staffing, informationalOptions).ok, false);

  const action = { ...legalActionOptions.find((option) => option.optionId === recommendation.nativeOptionId), week: 4 };
  const exact = planStaffAgendaEffect(created.agenda, action, staffing, { legal: true, actionReceiptId: 'action-receipt-1' });
  assert.equal(exact.status, 'ready');
  assert.equal(exact.command.multiplier, 1.1);
  assert.equal(exact.command.maximumMultiplier, 1.1);
  assert.equal(exact.command.effectReceiptId, `action-receipt-1:staff-agenda:${recommendation.effectId}`);
  const capped = planStaffAgendaEffect(created.agenda, action, staffing, { legal: true, actionReceiptId: 'action-receipt-2', effectMultiplier: 1.5 });
  assert.equal(capped.command.multiplier, 1.1);
  const wrongTarget = planStaffAgendaEffect(created.agenda, { ...action, targetId: 'different' }, staffing, { legal: true, actionReceiptId: 'action-receipt-3' });
  assert.equal(wrongTarget.reason, 'exact-action-target-mismatch');
  const duplicate = planStaffAgendaEffect(created.agenda, action, staffing, { legal: true, actionReceiptId: 'action-receipt-1', appliedEffectReceiptIds: [exact.command.effectReceiptId] });
  assert.equal(duplicate.reason, 'duplicate-effect-receipt');
  const missingReceipt = planStaffAgendaEffect(created.agenda, action, staffing, { legal: true });
  assert.equal(missingReceipt.reason, 'action-receipt-missing');
  const replay = planStaffAgendaEffect({ ...created.agenda, status: 'consumed' }, action, staffing, { legal: true, actionReceiptId: 'action-receipt-1', alreadyConsumed: true });
  assert.equal(replay.status, 'not-applied');
  assert.equal(planStaffAgendaEffect(created.agenda, { ...action, week: 5 }, staffing, { legal: true }).reason, 'exact-action-target-mismatch');
  const input = { turnoutPoints: 4.5, cost: 3 };
  const scaled = applyTraditionalStaffNativePayload(exact.command, action, input, { existingStaffMultiplier: 1.05 });
  assert.equal(scaled.status, 'applied');
  assert.ok(Math.abs(scaled.payload.turnoutPoints - 4.5 * 1.1 / 1.05) < 1e-9);
  assert.equal(scaled.payload.cost, 3);
  assert.equal(input.turnoutPoints, 4.5);
  assert.equal(applyTraditionalStaffNativePayload(exact.command, action, input, { appliedEffectReceiptIds: [exact.command.effectReceiptId] }).reason, 'duplicate-effect-receipt');
  const unresolved = recordStaffAgendaResolution(created.agenda, action, { actionReceiptId: 'action-receipt-1', application: scaled });
  assert.equal(unresolved.status, 'not-consumed');
  const consumed = recordStaffAgendaResolution(created.agenda, { ...action, completed: true }, { actionReceiptId: 'action-receipt-1', application: scaled });
  assert.equal(consumed.agenda.status, 'consumed');
  assert.equal(consumed.actionReceiptPatch.staffAgendaEffectReceiptId, exact.command.effectReceiptId);
  assert.equal(recordStaffAgendaResolution(consumed.agenda, { ...action, completed: true }, { actionReceiptId: 'action-receipt-1' }).status, 'already-consumed');
  const backfire = recordStaffAgendaResolution(created.agenda, { ...action, completed: true }, { actionReceiptId: 'action-receipt-9', application: { status: 'not-applied' } });
  assert.equal(backfire.agenda.status, 'consumed');
  assert.equal(backfire.actionReceiptPatch.staffAgendaEffectReceiptId, null);
});

test('four-party dialogue keeps party context and uses supplied coalition vocabulary', () => {
  for (const party of ['dem', 'rep', 'lib', 'grn']) {
    const voice = getTraditionalStaffDialogue('field', 'recommendation', party, { factionLabel: `${party}-faction`, week: 2 }, 'stable');
    assert.equal(voice.status, 'available');
    assert.equal(voice.partyId, party);
    assert.equal(voice.text.includes('{'), false);
  }
  const thirdParty = getTraditionalStaffDialogue('chief', 'recommendation', 'grn', { factionLabel: 'Green coalition', week: 2 }, 'stable');
  assert.equal(thirdParty.partyKey, 'coalition');
  assert.match(thirdParty.text, /Green coalition/);
  assert.equal(getTraditionalStaffDialogue('field', 'recommendation', 'ind', {}).status, 'unavailable');
});

test('native legal-option briefings accept all four campaign rule contexts', () => {
  const staffing = selectedRoster();
  const legalActionOptions = legalOptionsFor(staffing, { muckraker: { sourceReceiptIds: ['receipt-1'] } });
  for (const party of ['dem', 'rep', 'lib', 'grn']) {
    const briefing = buildStaffBriefing(
      { week: 5, party, staffing },
      { staffing, legalActionOptions, partyVocabulary: { factionLabel: `${party} faction` } },
    );
    assert.equal(briefing.status, 'ready');
    assert.equal(briefing.partyContext, party);
    assert.equal(briefing.recommendations.length, staffing.traditionalActiveIds.length);
    assert.ok(briefing.recommendations.every((recommendation) => recommendation.partyContext === party));
  }
});

test('staff disagreement requires an actual scheduling conflict', () => {
  const recommendations = [
    { id: 'a', staffId: 'field', actionId: 'volunteers', targetId: 'MI', actionSlots: 1, reasonCodes: ['field-need'] },
    { id: 'b', staffId: 'pollster', actionId: 'visit', targetId: 'WI', actionSlots: 1, reasonCodes: ['close-race'] },
  ];
  assert.equal(buildStaffDisagreement(recommendations, 'dem', { week: 2, actionsLeft: 7 }), null);
  assert.ok(buildStaffDisagreement(recommendations, 'dem', { week: 2, actionsLeft: 1 }));
  assert.equal(buildStaffDisagreement(recommendations, 'dem', { week: 2 }), null);
});

test('communications improves only a favorable matching promise persuasion payload', () => {
  const staffing = selectedRoster();
  const effectId = TRADITIONAL_STAFF_BY_ID.communications.effect.id;
  const option = {
    optionId: 'promise-MI-economy', actionId: 'promise', targetId: 'MI', issueId: 'economy',
    issueLabel: 'Economy', actionLabel: 'Campaign promise', targetName: 'Michigan', week: 3, party: 'rep',
    nativeOutlookTier: 'hit', ruleKey: 'rules', cost: 0, legal: true,
    reasonCodes: ['native-promise-outlook'], supportedStaffEffectIds: [effectId],
  };
  const briefing = buildStaffBriefing({ week: 3, party: 'rep', staffing }, { staffing, legalActionOptions: [option] });
  const rec = briefing.recommendations.find((item) => item.staffId === 'communications');
  const agenda = createStaffAgenda(rec, staffing, [option]).agenda;
  const planned = planStaffAgendaEffect(agenda, option, staffing, { legal: true, actionReceiptId: 'promise-receipt' });
  const payload = { outcomeTier: 'hit', persuasion: { MI: { base: -1, actual: -0.9 }, WI: { base: -0.2, actual: -0.18 } }, turnoutPoints: 0.8 };
  const result = applyTraditionalStaffNativePayload(planned.command, option, payload);
  assert.equal(result.status, 'applied');
  assert.ok(Math.abs(result.payload.persuasion.MI.base + 1.1) < 1e-9);
  assert.equal(result.payload.turnoutPoints, 0.8);
  assert.equal(payload.persuasion.MI.base, -1);
  assert.equal(applyTraditionalStaffNativePayload(planned.command, { ...option, issueId: 'health' }, payload).status, 'unavailable');
  assert.equal(applyTraditionalStaffNativePayload(planned.command, option, { ...payload, outcomeTier: 'miss' }).reason, 'invalid-native-effect');
  const policyId = TRADITIONAL_STAFF_BY_ID.policy.effect.id;
  const policyOption = { ...option, supportedStaffEffectIds: [policyId] };
  const policyBrief = buildStaffBriefing({ week: 3, party: 'rep', staffing }, { staffing, legalActionOptions: [policyOption] });
  const policyRec = policyBrief.recommendations.find((item) => item.staffId === 'policy');
  const policyAgenda = createStaffAgenda(policyRec, staffing, [policyOption]).agenda;
  const policyPlan = planStaffAgendaEffect(policyAgenda, policyOption, staffing, { legal: true, actionReceiptId: 'policy-promise' });
  const policyResult = applyTraditionalStaffNativePayload(policyPlan.command, policyOption, payload, { existingStaffMultiplier: 1.05 });
  assert.equal(policyResult.status, 'applied');
  assert.equal(policyResult.combinedStaffMultiplier, 1.1);
  assert.ok(Math.abs(policyResult.payload.persuasion.MI.base + 1.1 / 1.05) < 1e-9);
});

test('establishment liaison scales only existing official outreach progress', () => {
  const staffing = confirm([...selectedRoleIds.slice(0, 8), 'establishment-liaison']).staffing;
  const effectId = TRADITIONAL_STAFF_BY_ID['establishment-liaison'].effect.id;
  const option = {
    optionId: 'endorsement:national-test', actionId: 'endorsement', targetId: 'national-test',
    actionLabel: 'Court party officials', targetName: 'Officials', week: 3, ruleKey: 'rules', cost: 0, legal: true,
    reasonCodes: ['native-endorsement-outreach'], supportedStaffEffectIds: [effectId],
    nativeEligibilityReason: 'relationship-threshold', nativeRelationship: 40,
  };
  const briefing = buildStaffBriefing({ week: 3, party: 'dem', staffing }, { staffing, legalActionOptions: [option] });
  const rec = briefing.recommendations.find((item) => item.staffId === 'establishment-liaison');
  const agenda = createStaffAgenda(rec, staffing, [option]).agenda;
  const planned = planStaffAgendaEffect(agenda, option, staffing, { legal: true, actionReceiptId: 'outreach-receipt' });
  const payload = { relationshipBefore: 40, relationshipChange: 8, factionStanding: 55 };
  const result = applyTraditionalStaffNativePayload(planned.command, option, payload);
  assert.equal(result.status, 'applied');
  assert.ok(Math.abs(result.payload.relationshipChange - 8.8) < 1e-9);
  assert.equal(result.payload.factionStanding, 55);
  assert.equal(payload.relationshipChange, 8);
  assert.equal(applyTraditionalStaffNativePayload(planned.command, option, { ...payload, relationshipChange: 0 }).reason, 'invalid-native-effect');
});

test('fundraising director boosts only the existing major-donor room yield', () => {
  const staffing = selectedRoster();
  const effectId = TRADITIONAL_STAFF_BY_ID.fundraising.effect.id;
  const option = {
    optionId: 'fundraise:MI', actionId: 'fundraise', targetId: 'MI', actionLabel: 'Fundraise',
    targetName: 'Michigan', week: 3, ruleKey: 'rules', cost: 0, legal: true,
    reasonCodes: ['native-donor-room-outlook'], supportedStaffEffectIds: [effectId], donorCategory: 'major-donor-room',
  };
  const briefing = buildStaffBriefing({ week: 3, party: 'dem', staffing }, { staffing, legalActionOptions: [option] });
  const rec = briefing.recommendations.find((item) => item.staffId === 'fundraising');
  const agenda = createStaffAgenda(rec, staffing, [option]).agenda;
  const planned = planStaffAgendaEffect(agenda, option, staffing, { legal: true, actionReceiptId: 'fundraiser-receipt' });
  const payload = { donorCategory: 'major-donor-room', donorYieldM: 10, fatiguePoints: 2 };
  const result = applyTraditionalStaffNativePayload(planned.command, option, payload);
  assert.equal(result.status, 'applied');
  assert.equal(result.payload.donorYieldM, 11);
  assert.equal(result.payload.fatiguePoints, 2);
  assert.equal(payload.donorYieldM, 10);
  assert.equal(applyTraditionalStaffNativePayload(planned.command, option, { ...payload, donorCategory: 'small-donor' }).reason, 'invalid-native-effect');
});

test('social director improves only the matching favorable digital ad turnout', () => {
  const staffing = confirm([...selectedRoleIds.slice(0, 8), 'social-media']).staffing;
  const effectId = TRADITIONAL_STAFF_BY_ID['social-media'].effect.id;
  const option = {
    optionId: 'ad:MI:economy', actionId: 'ad', targetId: 'MI', issueId: 'economy',
    adTypeId: 'digital', adKind: 'pro', actionLabel: 'Digital ad', targetName: 'Michigan',
    week: 3, ruleKey: 'rules', cost: 2, legal: true,
    reasonCodes: ['native-digital-ad-outlook'], supportedStaffEffectIds: [effectId],
  };
  const briefing = buildStaffBriefing({ week: 3, party: 'dem', staffing }, { staffing, legalActionOptions: [option] });
  const rec = briefing.recommendations.find((item) => item.staffId === 'social-media');
  const agenda = createStaffAgenda(rec, staffing, [option]).agenda;
  const planned = planStaffAgendaEffect(agenda, option, staffing, { legal: true, actionReceiptId: 'ad-receipt' });
  const payload = { swing: 1, turnoutPoints: 2, cost: 2, fatiguePoints: 1 };
  const result = applyTraditionalStaffNativePayload(planned.command, option, payload);
  assert.equal(result.status, 'applied');
  assert.equal(result.payload.turnoutPoints, 2.2);
  assert.equal(result.payload.cost, 2);
  assert.equal(result.payload.fatiguePoints, 1);
  assert.equal(payload.turnoutPoints, 2);
  assert.equal(applyTraditionalStaffNativePayload(planned.command, { ...option, adTypeId: 'tv' }, payload).status, 'unavailable');
  assert.equal(applyTraditionalStaffNativePayload(planned.command, option, { ...payload, swing: -1 }).reason, 'invalid-native-effect');
});

test('press secretary modifies only successful coverage of the selected saved story', () => {
  const staffing = confirm([...selectedRoleIds.slice(0, 8), 'media']).staffing;
  const effectId = TRADITIONAL_STAFF_BY_ID.media.effect.id;
  const option = {
    optionId: 'spin:story1:bury', actionId: 'spin', targetId: 'MI', storyId: 'story1', spinMode: 'bury',
    actionLabel: 'Respond to a news story', targetName: 'Michigan', week: 3, ruleKey: 'rules', cost: 1, legal: true,
    reasonCodes: ['native-press-story'], supportedStaffEffectIds: [effectId],
  };
  const briefing = buildStaffBriefing({ week: 3, party: 'dem', staffing }, { staffing, legalActionOptions: [option] });
  const rec = briefing.recommendations.find((item) => item.staffId === 'media');
  const agenda = createStaffAgenda(rec, staffing, [option]).agenda;
  const planned = planStaffAgendaEffect(agenda, option, staffing, { legal: true, actionReceiptId: 'press-receipt' });
  const payload = { storyId: 'story1', backfire: false, salienceChange: -42, cost: 1 };
  const result = applyTraditionalStaffNativePayload(planned.command, option, payload);
  assert.equal(result.status, 'applied');
  assert.ok(Math.abs(result.payload.salienceChange + 46.2) < 1e-9);
  assert.equal(result.payload.cost, 1);
  assert.equal(payload.salienceChange, -42);
  assert.equal(applyTraditionalStaffNativePayload(planned.command, option, { ...payload, backfire: true }).reason, 'invalid-native-effect');
  assert.equal(applyTraditionalStaffNativePayload(planned.command, { ...option, storyId: 'other' }, payload).status, 'unavailable');
});

test('policy warning follows saved unbroken promises without changing the proposal', () => {
  const staffing = selectedRoster();
  const game = { staffing, stances: { economy: 1 }, promiseLedger: [
    { id: 'p1', issueId: 'economy', stance: 1, abbr: 'MI', week: 1, broken: false },
    { id: 'p2', issueId: 'economy', stance: 0, abbr: 'WI', week: 1, broken: true },
    { id: 'p3', issueId: 'health', stance: 1, abbr: 'PA', week: 1, broken: false },
  ] };
  const before = structuredClone(game);
  const result = inspectPolicyPromiseConflicts(game, { issueId: 'economy', proposedStance: 2 });
  assert.deepEqual(result.conflicts.map((item) => item.promiseId), ['p1']);
  assert.deepEqual(game, before);
  assert.equal(inspectPolicyPromiseConflicts(game, { issueId: 'economy', proposedStance: 1 }).conflicts.length, 0);
  assert.equal(inspectPolicyPromiseConflicts({ ...game, promiseLedger: null }, { issueId: 'economy', proposedStance: 2 }).status, 'unavailable');
});

test('debrief uses only a matching saved receipt and briefing history stays capped', () => {
  const agenda = { week: 2, staffId: 'field', recommendationId: 'field:2:volunteers:MI', actionId: 'volunteers', targetId: 'MI', status: 'unconsumed' };
  const incomplete = buildStaffDebrief(agenda, [], { receiptWindowComplete: false, party: 'rep' });
  assert.equal(incomplete.status, 'unavailable');
  const noAction = buildStaffDebrief(agenda, [], {
    receiptWindowComplete: true,
    party: 'rep',
    otherRecommendations: [{ week: 2, id: 'pollster:2:visit:WI', staffId: 'pollster', actionId: 'visit', targetId: 'WI', legal: true, reasonCodes: ['competitive-state'] }],
  });
  assert.equal(noAction.status, 'not-acted-on');
  assert.equal(noAction.unmetPriority.recommendationId, 'pollster:2:visit:WI');
  const used = buildStaffDebrief(agenda, [{ week: 2, actionId: 'volunteers', targetId: 'MI', receiptId: 'receipt-2', staffAgendaEffectReceiptId: 'effect-2', outcomeSummary: 'Turnout operation completed.' }], { receiptWindowComplete: true, party: 'rep' });
  assert.equal(used.status, 'used');
  assert.equal(used.outcomeReceiptId, 'receipt-2');
  assert.match(used.dialogue, /Turnout operation completed/);
  assert.equal(buildStaffDebrief(agenda, [{ week: 2, actionId: 'volunteers', targetId: 'MI', receiptId: 'receipt-3' }], { receiptWindowComplete: true, party: 'rep' }).status, 'acted-on');
  const issueAgenda = { ...agenda, actionId: 'promise', issueId: 'economy' };
  assert.equal(buildStaffDebrief(issueAgenda, [{ week: 2, actionId: 'promise', targetId: 'MI', issueId: 'health', receiptId: 'receipt-4' }], { receiptWindowComplete: true, party: 'rep' }).status, 'not-acted-on');
  const adAgenda = { ...issueAgenda, actionId: 'ad', adTypeId: 'digital', adKind: 'pro' };
  assert.equal(buildStaffDebrief(adAgenda, [{ week: 2, actionId: 'ad', targetId: 'MI', issueId: 'economy', adTypeId: 'tv', adKind: 'pro', receiptId: 'receipt-5' }], { receiptWindowComplete: true, party: 'rep' }).status, 'not-acted-on');

  const history = Array.from({ length: 10 }, (_, index) => ({ week: index, recommendationId: `rec-${index}` }));
  const capped = appendStaffBriefHistory(history, { week: 10, recommendationId: 'rec-10' });
  assert.equal(capped.length, 8);
  assert.equal(capped.at(-1).recommendationId, 'rec-10');
});
