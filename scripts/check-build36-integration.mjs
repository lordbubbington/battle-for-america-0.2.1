import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { decode } from 'fast-png';
import { createServer } from 'vite';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
  removeItem: (key) => store.delete(key),
};
const server = await createServer({
  configLoader: 'runner',
  cacheDir: './.vite-build36-integration',
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, ws: false },
});

const read = (name) => readFile(new URL('../public/art/staff/' + name, import.meta.url));
const roles = ['field', 'pollster', 'communications', 'operations', 'policy', 'fundraising', 'base-liaison', 'social-media', 'media'];
const noop = () => {};

try {
  const engine = await server.ssrLoadModule('/src/lib/gameEngine.js');
  const staff = await server.ssrLoadModule('/src/lib/build35Staff.js');
  const { migrateBuild36Staffing } = await server.ssrLoadModule('/src/lib/build36StaffMigration.js');
  const { previewTraditionalPortraits, validateTraditionalStaffing } = await server.ssrLoadModule('/src/lib/traditionalStaffRules.js');
  const { NONTRADITIONAL_STAFF_ROSTER } = await server.ssrLoadModule('/src/data/nonTraditionalStaffRoster.js');
  const { validateStateLegislatureSeatData, STATE_LEGISLATURE_SEATS_2028 } = await server.ssrLoadModule('/src/data/stateLegislatureSeats2028.js');
  const { recordIncident } = await server.ssrLoadModule('/src/lib/incidentLedger.js');
  const { decisionSlots } = await server.ssrLoadModule('/src/lib/build36DecisionSchedule.js');
  const { routeBuild34WeeklyBackground } = await server.ssrLoadModule('/src/lib/build34CommandRouter.js');
  const { turnoutOf } = await server.ssrLoadModule('/src/lib/turnout.js');
  const { createSeededRandom } = await server.ssrLoadModule('/src/lib/seededRandom.js');
  const { default: StaffPortrait, staffPortraitPath } = await server.ssrLoadModule('/src/components/game/StaffPortrait.jsx');
  const { default: StaffSelection } = await server.ssrLoadModule('/src/components/game/StaffSelection.jsx');
  const { default: StaffWorkspace } = await server.ssrLoadModule('/src/components/game/StaffWorkspace.jsx');
  const { default: StaffMention } = await server.ssrLoadModule('/src/components/game/StaffMention.jsx');
  const { default: EventCard } = await server.ssrLoadModule('/src/components/game/EventCard.jsx');
  const { default: HistoryPanel } = await server.ssrLoadModule('/src/components/game/HistoryPanel.jsx');
  const { default: SeatLegislaturePanel } = await server.ssrLoadModule('/src/components/game/SeatLegislaturePanel.jsx');
  const originalRandom = Math.random;
  Math.random = createSeededRandom('build36-integration');
  try {
    const catalog = validateStateLegislatureSeatData();
    assert.equal(catalog.valid, true, catalog.errors.join('\n'));
    assert.equal(STATE_LEGISLATURE_SEATS_2028.length, 7386);
    assert.equal(new Set(STATE_LEGISLATURE_SEATS_2028.map(({ seatId }) => seatId)).size, 7386);
    assert.ok(STATE_LEGISLATURE_SEATS_2028.every(({ voterWeight }) => voterWeight === 1));
    const art = new Map();
    const hashes = new Set();
    const artBatches = [
      ['nontraditional', 'manifest-staff-nontraditional-01-15.json', 15],
      ['nontraditional', 'manifest-staff-nontraditional-16-30.json', 15],
      ['traditional-generic', 'manifest-staff-traditional-generic-01-07.json', 7],
      ['traditional-generic', 'manifest-staff-traditional-generic-08-14.json', 7],
    ];
    for (const [dir, name, count] of artBatches) {
      const manifest = JSON.parse(await read(dir + '/' + name));
      const entries = manifest.assets || manifest.portraits;
      assert.equal(entries.length, count, name);
      for (const { id, file, sha256 } of entries) {
        assert.ok(!art.has(id));
        assert.equal(file, id + '.png');
        const bytes = await read(dir + '/' + file);
        const hash = createHash('sha256').update(bytes).digest('hex');
        assert.equal(hash, sha256.toLowerCase(), id);
        assert.ok(!hashes.has(hash), id + ' duplicates another portrait');
        hashes.add(hash);
        art.set(id, dir);
        const png = decode(bytes);
        assert.deepEqual([png.width, png.height, png.channels, png.depth], [96, 96, 4, 8]);
        let transparent = 0;
        for (let offset = 0; offset < png.data.length; offset += 4) {
          const alpha = png.data[offset + 3];
          assert.ok(alpha === 0 || alpha === 255, id + ' contains partial alpha');
          if (alpha !== 0) continue;
          transparent++;
          assert.equal(png.data[offset] | png.data[offset + 1] | png.data[offset + 2], 0, id + ' contains hidden edge color');
        }
        assert.ok(transparent > 0 && transparent < 96 * 96, id);
        assert.equal(staffPortraitPath(id), './art/staff/' + dir + '/' + file);
      }
    }
    for (const profile of NONTRADITIONAL_STAFF_ROSTER) assert.equal(art.get(profile.id), 'nontraditional');
    assert.equal(art.size, 44);

    const make = (campaignId) => engine.createGame({
      campaignId, party: 'dem', candidateId: 'shapiro', opponentId: 'vance', difficultyId: 'medium',
      startId: 'aug', thirdMode: 'fringe', nationalGeneric: -2.25,
    });
    const saveCycle = (game) => {
      assert.equal(engine.saveGame(game), true);
      const loaded = engine.loadGame();
      assert.ok(loaded);
      return loaded;
    };
    const start = engine.confirmBuild36Staffing || engine.confirmBuild35Staffing;
    const draft = make('build36-selection');
    const pool = draft.staffing.nonTraditionalSelectionPoolIds;
    assert.equal(new Set(pool).size, 3);
    assert.deepEqual(pool, make('build36-selection').staffing.nonTraditionalSelectionPoolIds);
    assert.deepEqual(pool, saveCycle(draft).staffing.nonTraditionalSelectionPoolIds);
    assert.equal(engine.startTurn(draft), draft);
    assert.equal(start(draft, roles.slice(1)), draft);
    const preview = previewTraditionalPortraits(draft.build34CampaignId);
    assert.equal(new Set(Object.values(preview)).size, 14);
    assert.ok(Object.values(preview).every((id) => art.get(id) === 'traditional-generic'));
    const setupMarkup = renderToStaticMarkup(createElement(StaffSelection, {
      staffing: draft.staffing, campaignId: draft.build34CampaignId, Portrait: StaffPortrait, onComplete: noop,
    }));
    assert.equal((setupMarkup.match(/aria-pressed=/g) || []).length, 16);
    for (const member of NONTRADITIONAL_STAFF_ROSTER) {
      assert.equal(setupMarkup.includes(staffPortraitPath(member.id)), pool.includes(member.id));
    }

    let allTraditional;
    for (let n = 0; n <= 3; n++) {
      const chosen = pool.slice(0, n);
      const active = start(draft, [...roles.slice(0, 9 - n), ...chosen]);
      assert.deepEqual(validateTraditionalStaffing(active.staffing), []);
      assert.equal(active.natGeneric, -2.25);
      assert.equal(active.staffing.traditionalActiveIds.length, 10 - n);
      assert.deepEqual(active.staffing.nonTraditionalActiveIds, chosen);
      assert.ok(!Object.hasOwn(active.staffing, 'nonTraditionalSelectionPoolIds'));
      assert.ok(!Object.hasOwn(active.staffing, 'traditionalBenchIds'));
      assert.equal(active.funds, draft.funds);
      assert.equal(active.actionsLeft, 7);
      assert.equal(start(active, roles), active);
      assert.deepEqual(saveCycle(active).staffing, active.staffing);
      if (n === 0) allTraditional = active;

      assert.equal(engine.advanceWeek(active).finance.staffUpkeep, 0);
      const markup = renderToStaticMarkup(createElement(StaffWorkspace, {
        game: active, paused: false, onSetAgenda: noop, onOpenAction: noop,
      }));
      const portraitUrls = new Set([...markup.matchAll(/src="(\.\/art\/staff\/[^"]+)"/g)].map(([, asset]) => asset));
      assert.equal(portraitUrls.size, 10);
      for (const id of pool) assert.equal(markup.includes(staffPortraitPath(id)), chosen.includes(id));
      assert.ok(!/Reorganize staff|Hire \(1 action\)/.test(markup));
    }

    const field = staff.build35StaffBriefing(allTraditional).recommendations
      .find((recommendation) => recommendation.staffId === 'field' && recommendation.actionId === 'volunteers' && recommendation.agendaEligible);
    assert.ok(field);
    const agenda = staff.setBuild35Agenda(allTraditional, field.id);
    const savedAgenda = saveCycle(agenda);
    const plain = engine.applyAction(allTraditional, 'volunteers', field.targetId);
    const applied = engine.applyAction(savedAgenda, 'volunteers', field.targetId);
    assert.ok(turnoutOf(applied, field.targetId, 'dem') > turnoutOf(plain, field.targetId, 'dem'));
    const consumed = saveCycle(applied).staffing.agendaByWeek[0];
    assert.equal(consumed.status, 'consumed');
    assert.ok(consumed.effectReceiptId);
    const repeated = engine.applyAction(applied, 'volunteers', field.targetId);
    assert.deepEqual(repeated.staffing.agendaByWeek[0], consumed);
    assert.deepEqual(agenda.staffing.agendaByWeek[0].status, 'unconsumed');

    const legacy = {
      ...allTraditional,
      staffing: { schemaVersion: 1, traditionalActiveIds: ['chief', ...roles, 'field'],
        traditionalBenchIds: ['muckraker'], hiredNonTraditionalIds: [pool[0], pool[0], pool[1]],
        nonTraditionalOfferIds: pool, initialSelectionComplete: true },
      staffAgendaByWeek: agenda.staffing.agendaByWeek, staffBriefHistory: [{ week: 0, staffId: 'muckraker' }], staffHireReceipts: [{}],
    };
    delete legacy.staffNativeEffectsFromWeek;
    store.clear();
    const old = engine.encodeCampaignSave(legacy);
    store.set('election2028.save.v35', old);
    const migrated = engine.loadGame();
    assert.ok(migrated);
    assert.deepEqual(migrated.staffing.nonTraditionalActiveIds, pool.slice(0, 2));
    assert.equal(migrated.staffing.traditionalActiveIds.length, 8);
    assert.equal(migrated.staffNativeEffectsFromWeek, 1);
    assert.equal(migrated.staffing.briefingHistory.length, 0);
    assert.deepEqual(migrateBuild36Staffing(migrated).staffing, migrated.staffing);
    for (const key of ['staffAgendaByWeek', 'staffBriefHistory', 'staffHireReceipts']) assert.ok(!Object.hasOwn(migrated, key));
    saveCycle(migrated);
    assert.equal(store.get('election2028.save.v35'), old);

    const roleAsset = staffPortraitPath(allTraditional.staffing.traditionalPortraitByRole.pollster);
    const namedText = renderToStaticMarkup(createElement(StaffMention, { game: allTraditional, text: 'Your pollster and compliance director disagree.' }));
    assert.ok(namedText.includes(roleAsset) && namedText.includes('pollster'));
    assert.ok(!namedText.includes('compliance director'));
    const event = { id: 'portrait-check', title: 'Campaign note', text: 'Your pollster checks the route.', choices: [{ label: 'Continue' }], icon: 'news', kicker: 'Campaign' };
    const eventMarkup = renderToStaticMarkup(createElement(EventCard, { game: allTraditional, event, onChoose: noop }));
    assert.ok(eventMarkup.includes(roleAsset));
    const logMarkup = renderToStaticMarkup(createElement(HistoryPanel, {
      game: { ...allTraditional, weekLog: ['Your pollster filed an update.'] }, you: { short: 'You' }, them: { short: 'Rival' }, accent: '#fff', oppAccent: '#eee',
    }));
    assert.ok(logMarkup.includes(roleAsset));
    const seatMarkup = renderToStaticMarkup(createElement(SeatLegislaturePanel, { game: allTraditional, selected: 'WA', onSelect: noop }));
    assert.ok(seatMarkup.includes('Washington') && seatMarkup.includes('Election Night calls'));

    const rival = recordIncident(allTraditional, engine.opponentTurn(allTraditional), { type: 'opponent' });
    const pac = rival.build34SuperPacReceiptsByWeek[1];
    assert.ok(pac.effectsAlreadyApplied && pac.aggregates.length > 0);
    assert.equal(pac.digest.adFatiguePoints, 0);
    assert.equal(pac.digest.generalFatiguePoints, pac.aggregates.reduce((sum, group) => sum + group.totalGeneralFatiguePoints, 0));
    assert.equal(routeBuild34WeeklyBackground({ campaignId: rival.build34CampaignId, week: 1, superPac: pac }).commands.length, 0);
    const rivalLoaded = saveCycle(rival);
    assert.deepEqual(rivalLoaded.build34SuperPacReceiptsByWeek[1], pac);
    assert.equal(engine.opponentTurn(rivalLoaded), rivalLoaded);

    const week10 = {
      ...allTraditional, week: 9, eventScheduleIndex: -1, eventSchedule: decisionSlots(1, 7),
      eventScheduleWeek: 9, stateMods: { ...allTraditional.stateMods }, actionsLeft: 7,
    };
    week10.stateMods.PA = (week10.stateMods.PA || 0) + 9 - engine.pollMargin('PA', week10);
    const neglectedStateMove = {
      type: 'stop', abbr: 'PA', stateName: 'Pennsylvania', moveText: 'The rival rallied in PA.',
      playerAttention: 0, effectMagnitude: 0.7, effectApplied: true, sourceMargin: engine.pollMargin('PA', week10),
    };
    const committed = recordIncident(week10, {
      ...week10, lastAd: { abbr: 'GA' }, lastOpponent: { neglectedStateMove },
      oppMoves: [{ type: 'stop', abbr: 'PA', text: neglectedStateMove.moveText }],
    }, { type: 'opponent' });
    const queued = committed.pendingInterrupts.find(({ event }) => event.id.includes('interrupt-072-opponent-enters-state'));
    assert.ok(queued, 'the rival move has its own state even after a player ad in another state');
    assert.equal(committed.build35RivalInterruptionEffect, undefined);
    const dispatched = engine.advanceDecisionEvent(committed);
    assert.equal(dispatched.currentEventId, queued.event.id);
    assert.ok(Math.abs(engine.pollMargin('PA', committed) - engine.pollMargin('PA', dispatched) - 5) < 0.00001);
    const final = saveCycle(dispatched);
    assert.equal(engine.pollMargin('PA', final), engine.pollMargin('PA', dispatched));
    assert.equal(engine.advanceDecisionEvent(final), final);
    assert.notEqual(engine.applyChoice(final, final.currentEventData.choices[0], final.currentEventId), final);
    console.log('Build 36 portraits, four roster sizes, save migration, agenda replay, legislature display, PAC routing and rival interruption verified.');
  } finally {
    Math.random = originalRandom;
  }
} finally {
  await server.close();
}
