import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({
  cacheDir: './.vite-traditional-staff-check',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
});

try {
  const engine = await server.ssrLoadModule('/src/lib/gameEngine.js');
  const staff = await server.ssrLoadModule('/src/lib/traditionalStaffRules.js');
  const rosterData = await server.ssrLoadModule('/src/data/traditionalStaffRoster.js');
  const endorsers = await server.ssrLoadModule('/src/data/endorserRoster.js');
  const adapter = await server.ssrLoadModule('/src/lib/traditionalStaffNativeAdapter.js');
  const turnout = await server.ssrLoadModule('/src/lib/turnout.js');
  const field = await server.ssrLoadModule('/src/lib/fieldOperations.js');
  const news = await server.ssrLoadModule('/src/lib/news.js');
  const { default: StaffSelection } = await server.ssrLoadModule('/src/components/game/StaffSelection.jsx');
  const { default: StaffPanel } = await server.ssrLoadModule('/src/components/game/StaffPanel.jsx');
  const campaignId = 'staff-native-fixture';
  const pool = ['etsy-witch', 'asmr-streamer', 'wrestling-promoter'];
  const setup = staff.createInitialTraditionalStaffing({ nonTraditionalSelectionPoolIds: pool });
  const confirm = (ids) => staff.selectInitialTraditionalStaff(ids, setup, campaignId).staffing;
  const Portrait = ({ portraitId, alt, size }) => React.createElement('span', { 'data-portrait': portraitId, 'data-size': size, 'aria-label': alt });
  const setupHtml = renderToString(React.createElement(StaffSelection, { staffing: setup, campaignId, Portrait }));
  assert.match(setupHtml, /Choose your inner circle/);
  assert.equal((setupHtml.match(/aria-pressed="false"/g) || []).length, 16);
  assert.equal(new Set([...setupHtml.matchAll(/data-portrait="(traditional-generic-\d+)"/g)].map(([, id]) => id)).size, 14);
  assert.ok(pool.every((id) => setupHtml.includes(`data-portrait="${id}"`)));
  assert.doesNotMatch(setupHtml, /Bot Farm Director|On the bench|signing fee/i);
  const roster = confirm([
    'operations', 'pollster', 'communications', 'field', 'fundraising',
    'small-donor', 'base-liaison', 'policy', 'muckraker',
  ]);
  const mixedRoster = confirm(['operations', 'pollster', 'communications', 'field', 'fundraising', 'small-donor', 'base-liaison', 'policy', pool[0]]);
  assert.equal(renderToString(React.createElement(StaffSelection, { staffing: mixedRoster, campaignId, Portrait })), '');
  const mixedHtml = renderToString(React.createElement(StaffPanel, {
    game: { staffing: mixedRoster, week: 1, party: 'dem' },
    briefing: { recommendations: [{ staffId: 'muckraker', legal: true, title: 'STALE_UNSELECTED_RECOMMENDATION' }] },
    Portrait,
  }));
  assert.equal((mixedHtml.match(/data-portrait=/g) || []).length, 10);
  assert.match(mixedHtml, /data-portrait="etsy-witch"/);
  assert.doesNotMatch(mixedHtml, /asmr-streamer|wrestling-promoter|Muckraker|STALE_UNSELECTED_RECOMMENDATION/);
  const recapHtml = renderToString(React.createElement(StaffPanel, {
    game: { staffing: mixedRoster, week: 1, party: 'dem' },
    agenda: { staffId: 'muckraker', title: 'STALE_UNSELECTED_AGENDA' },
    debrief: { staffId: 'field', status: 'used', dialogue: 'The team contacted voters.', unmetPriority: { staffId: pool[1], actionId: 'ad', targetId: 'MI' } },
    Portrait,
  }));
  assert.match(recapHtml, new RegExp(`data-portrait="${mixedRoster.traditionalPortraitByRole.field}" data-size="compact"`));
  assert.doesNotMatch(recapHtml, /asmr-streamer|Muckraker|STALE_UNSELECTED_AGENDA/);
  const fixtures = [
    { party: 'dem', candidateId: 'shapiro', opponentId: 'vance', houseRule: 'standard', electoralRule: 'standard' },
    { party: 'rep', candidateId: 'vance', opponentId: 'shapiro', houseRule: 'pr', electoralRule: 'proportional' },
    { party: 'lib', candidateId: 'oliver', opponentId: 'shapiro', houseRule: 'mmp', electoralRule: 'district' },
    { party: 'grn', candidateId: 'stein', opponentId: 'vance', houseRule: 'standard', electoralRule: 'standard' },
  ];

  for (const fixture of fixtures) {
    const game = engine.createGame({ ...fixture, campaignId: `staff-native-${fixture.party}`, difficultyId: 'medium', startId: 'aug', thirdMode: 'surge' });
    Object.assign(game, { staffing: roster, currentEventId: null, currentEventData: null, actionsLeft: 7 });
    const before = JSON.stringify(game);
    if (fixture.party === 'dem') {
      const unregistered = adapter.buildNativeStaffActionOptions(game);
      assert.ok(unregistered.options.every((option) => !option.supportedStaffEffectIds?.length), 'unwired native effects remain informational');
      const noSlots = adapter.buildNativeStaffActionOptions({ ...game, actionsLeft: 0 });
      assert.ok(noSlots.options.some((option) => option.actionId === 'ad'));
      assert.ok(noSlots.options.every((option) => option.actionSlots === 0));
    }
    const briefing = adapter.buildNativeStaffBriefing(game, { enabledNativeEffectIds: [
      rosterData.TRADITIONAL_STAFF_BY_ID.field.effect.id,
      rosterData.TRADITIONAL_STAFF_BY_ID['base-liaison'].effect.id,
      rosterData.TRADITIONAL_STAFF_BY_ID.communications.effect.id,
      rosterData.TRADITIONAL_STAFF_BY_ID.policy.effect.id,
      rosterData.TRADITIONAL_STAFF_BY_ID.fundraising.effect.id,
    ] });
    assert.equal(briefing.status, 'ready', fixture.party);
    if (fixture.party === 'dem') assert.match(renderToString(React.createElement(StaffPanel, { game, staffing: roster, briefing, Portrait })), /Your staff briefing/);
    assert.equal(JSON.stringify(game), before, 'briefing does not mutate campaign state');
    assert.ok(briefing.native.options.every((option) => option.legal && option.cost <= game.funds));
    if (fixture.party === 'rep') {
      assert.ok(briefing.native.options.some((option) => option.reasonCodes.includes('public-elector-threshold')
        && option.reasonCodes.includes('public-house-vote-share')));
    }
    if (fixture.party === 'lib') {
      assert.ok(briefing.native.options.some((option) => option.reasonCodes.includes('public-house-district-poll')
        && option.reasonCodes.includes('public-house-vote-share')));
    }
    const operation = briefing.native.options.find((option) => option.actionId === 'ops');
    assert.equal(operation.cost, field.groundSetupCost(operation.targetId));
    const recommendation = briefing.recommendations.find((item) => item.staffId === 'field');
    assert.equal(recommendation.actionId, 'volunteers');
    assert.equal(recommendation.agendaEligible, true);
    const agenda = staff.createStaffAgenda(recommendation, roster, briefing.native.options).agenda;
    const action = briefing.native.options.find((option) => option.optionId === recommendation.nativeOptionId);
    const plan = staff.planStaffAgendaEffect(agenda, action, roster, { legal: true, actionReceiptId: `${fixture.party}-action` });
    assert.equal(plan.status, 'ready');
    const actual = engine.applyAction(game, 'volunteers', action.targetId);
    assert.equal(actual.actionsLeft, game.actionsLeft - 1);
    assert.equal(Math.round((game.funds - actual.funds) * 10) / 10, action.cost);
    const nativePoints = 4.5 * engine.actionDamp(game, action.targetId, 'volunteers')
      * (Number(game.campaignPerks?.freeVolunteerOps) > 0 ? 1.5 : 1);
    const boosted = staff.applyTraditionalStaffNativePayload(plan.command, action, { turnoutPoints: nativePoints });
    const boostedState = structuredClone(game);
    turnout.addTurnoutState(boostedState, game.party, action.targetId, boosted.payload.turnoutPoints);
    assert.ok(turnout.turnoutOf(boostedState, action.targetId, game.party) > turnout.turnoutOf(actual, action.targetId, game.party));
    assert.equal(staff.planStaffAgendaEffect({ ...agenda, status: 'consumed' }, action, roster, { legal: true, actionReceiptId: 'retry' }).status, 'not-applied');
    const fundraiser = briefing.recommendations.find((item) => item.staffId === 'fundraising');
    assert.equal(fundraiser.agendaEligible, true);
    const donorAction = briefing.native.options.find((option) => option.optionId === fundraiser.nativeOptionId);
    const donorYieldM = engine.fundraiseOutlook(game, donorAction.targetId).cash;
    const nativeFundraise = engine.applyAction(game, 'fundraise', donorAction.targetId);
    assert.equal(Math.round((nativeFundraise.funds - game.funds) * 10) / 10, donorYieldM);
    const donorAgenda = staff.createStaffAgenda(fundraiser, roster, briefing.native.options).agenda;
    const donorPlan = staff.planStaffAgendaEffect(donorAgenda, donorAction, roster, { legal: true, actionReceiptId: `${fixture.party}-donor` });
    const boostedDonor = staff.applyTraditionalStaffNativePayload(donorPlan.command, donorAction, { donorCategory: 'major-donor-room', donorYieldM });
    assert.ok(boostedDonor.payload.donorYieldM > donorYieldM);
    const comms = briefing.recommendations.find((item) => item.staffId === 'communications');
    if (comms?.agendaEligible) {
      const promise = briefing.native.options.find((option) => option.optionId === comms.nativeOptionId);
      const nativePromise = engine.promiseOutlook(game, promise.targetId, promise.issueId);
      assert.ok(nativePromise.swing > 0);
      const commsAgenda = staff.createStaffAgenda(comms, roster, briefing.native.options).agenda;
      const commsPlan = staff.planStaffAgendaEffect(commsAgenda, promise, roster, { legal: true, actionReceiptId: `${fixture.party}-promise` });
      const direction = fixture.party === 'rep' ? -1 : 1;
      const persuasion = { [promise.targetId]: { base: nativePromise.swing * direction, actual: nativePromise.swing * direction } };
      const adjusted = staff.applyTraditionalStaffNativePayload(commsPlan.command, promise, { outcomeTier: nativePromise.tier, persuasion });
      assert.equal(adjusted.status, 'applied');
      assert.ok(Math.abs(adjusted.payload.persuasion[promise.targetId].base) > Math.abs(persuasion[promise.targetId].base));
    }
    if (fixture.party === 'dem') {
      const group = endorsers.ENDORSER_ROSTER.find((item) => item.party === 'dem' && item.factionId === 'officials' && item.level === 'national');
      assert.ok(group);
      const outreachGame = structuredClone(game);
      outreachGame.factions = { ...outreachGame.factions, officials: 100 };
      outreachGame.build34EndorserRelationships = { ...outreachGame.build34EndorserRelationships, [group.id]: group.endorsementThreshold - 10 };
      const outreachRoster = confirm([
        'operations', 'pollster', 'communications', 'field', 'fundraising',
        'small-donor', 'base-liaison', 'policy', 'establishment-liaison',
      ]);
      outreachGame.staffing = outreachRoster;
      const liaisonEffect = rosterData.TRADITIONAL_STAFF_BY_ID['establishment-liaison'].effect.id;
      const outreachBrief = adapter.buildNativeStaffBriefing(outreachGame, { enabledNativeEffectIds: [liaisonEffect] });
      const outreach = outreachBrief.native.options.find((item) => item.actionId === 'endorsement' && item.targetId === group.id);
      assert.ok(outreach, 'eligible official outreach is available');
      const actualOutreach = engine.requestBuild34Endorsement(outreachGame, group.id);
      assert.equal(actualOutreach.actionsLeft, outreachGame.actionsLeft - 1);
      assert.equal(actualOutreach.build34EndorserRelationships[group.id] - outreach.nativeRelationship, 8);
      const recommendation = staff.buildStaffBriefing(outreachGame, { staffing: outreachRoster, legalActionOptions: [outreach] }).recommendations.find((item) => item.staffId === 'establishment-liaison');
      const selected = staff.createStaffAgenda(recommendation, outreachRoster, [outreach]).agenda;
      const plan = staff.planStaffAgendaEffect(selected, outreach, outreachRoster, { legal: true, actionReceiptId: 'native-outreach' });
      const adjusted = staff.applyTraditionalStaffNativePayload(plan.command, outreach, { relationshipBefore: outreach.nativeRelationship, relationshipChange: 8 });
      assert.ok(Math.abs(adjusted.payload.relationshipChange - 8.8) < 1e-9);
      const policyGame = structuredClone(game);
      policyGame.stances.economy = 1;
      policyGame.promiseLedger = [{ id: 'recorded-promise', issueId: 'economy', stance: 1, abbr: 'MI', week: policyGame.week, broken: false }];
      const warning = staff.inspectPolicyPromiseConflicts(policyGame, { issueId: 'economy', proposedStance: 2 });
      assert.equal(warning.conflicts[0].promiseId, 'recorded-promise');
      const changed = engine.changeStance(policyGame, 'economy', 2);
      assert.equal(changed.promiseLedger[0].broken, true);
      const warnings = adapter.buildStaffOperationalWarnings({ ...game, funds: 0 });
      assert.equal(warnings.status, 'ready');
      assert.equal(warnings.warnings.find((item) => item.code === 'current-cash-below-weekly-expenses').weeklyExpenses, engine.expensesFor(game));
      const socialRoster = confirm([
        'operations', 'pollster', 'communications', 'field', 'fundraising',
        'small-donor', 'base-liaison', 'policy', 'social-media',
      ]);
      const socialEffect = rosterData.TRADITIONAL_STAFF_BY_ID['social-media'].effect.id;
      const random = Math.random;
      let socialBrief;
      try {
        Math.random = () => { throw new Error('Briefing must not sample random outcomes'); };
        socialBrief = adapter.buildNativeStaffBriefing({ ...game, staffing: socialRoster }, { enabledNativeEffectIds: [socialEffect] });
      } finally {
        Math.random = random;
      }
      const socialRec = socialBrief.recommendations.find((item) => item.staffId === 'social-media');
      const ad = socialBrief.native.options.find((item) => item.optionId === socialRec.nativeOptionId);
      const expectedAdCost = engine.freeAdsForIssue(game, ad.issueId) > 0 ? 0 : engine.adCost(game, ad.targetId, 'digital', 'pro');
      assert.equal(ad.cost, expectedAdCost);
      const socialAgenda = staff.createStaffAgenda(socialRec, socialRoster, socialBrief.native.options).agenda;
      const socialPlan = staff.planStaffAgendaEffect(socialAgenda, ad, socialRoster, { legal: true, actionReceiptId: 'native-digital-ad' });
      const socialPayload = staff.applyTraditionalStaffNativePayload(socialPlan.command, ad, { swing: 1, turnoutPoints: 2 });
      assert.equal(socialPayload.payload.turnoutPoints, 2.2);
      const mediaRoster = confirm([
        'operations', 'pollster', 'communications', 'field', 'fundraising',
        'small-donor', 'base-liaison', 'policy', 'media',
      ]);
      const mediaGame = { ...game, staffing: mediaRoster, stories: [
        ...(game.stories || []), { id: 'verified-story', abbr: 'MI', tone: 'good', headline: 'A recorded campaign event', salience: 40, life: 2, topic: 'economy', week: game.week },
      ] };
      const mediaEffect = rosterData.TRADITIONAL_STAFF_BY_ID.media.effect.id;
      const mediaOptions = adapter.buildNativeStaffActionOptions(mediaGame, { enabledNativeEffectIds: [mediaEffect] }).options;
      const press = mediaOptions.find((item) => item.storyId === 'verified-story');
      assert.equal(press.cost, news.spinCost(mediaGame, 'MI', 'amplify'));
      let nativePress;
      const randomBeforePress = Math.random;
      try {
        Math.random = () => 0.99;
        nativePress = news.spinStory(mediaGame, 'MI', 'verified-story', 'amplify');
      } finally {
        Math.random = randomBeforePress;
      }
      assert.equal(nativePress.lastSpin.salienceAfter - nativePress.lastSpin.salienceBefore, 26);
      const pressRec = staff.buildStaffBriefing(mediaGame, { staffing: mediaRoster, legalActionOptions: [press] }).recommendations.find((item) => item.staffId === 'media');
      const pressAgenda = staff.createStaffAgenda(pressRec, mediaRoster, [press]).agenda;
      const pressPlan = staff.planStaffAgendaEffect(pressAgenda, press, mediaRoster, { legal: true, actionReceiptId: 'native-press' });
      const pressPayload = staff.applyTraditionalStaffNativePayload(pressPlan.command, press, { storyId: 'verified-story', backfire: false, salienceChange: 26 });
      assert.ok(Math.abs(pressPayload.payload.salienceChange - 28.6) < 1e-9);
    }
    console.log(`${fixture.party}: ${briefing.native.options.length} legal native options, ${briefing.recommendations.length} recommendations`);
  }

  const broke = engine.createGame({ party: 'dem', candidateId: 'shapiro', opponentId: 'vance', difficultyId: 'medium', startId: 'aug' });
  Object.assign(broke, { funds: 0, actionsLeft: 7, currentEventId: null, currentEventData: null });
  broke.campaignPerks = { ...broke.campaignPerks, freeVolunteerOps: 0 };
  assert.ok(!adapter.buildNativeStaffActionOptions(broke).options.some((option) => option.actionId === 'volunteers'));
  broke.campaignPerks.freeVolunteerOps = 1;
  assert.ok(adapter.buildNativeStaffActionOptions(broke).options.some((option) => option.actionId === 'volunteers' && option.cost === 0));
  console.log('Native staff adapter checks passed.');
} finally {
  await server.close();
}
