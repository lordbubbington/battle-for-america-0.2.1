import assert from 'node:assert/strict';

const staff = ['field', 'pollster', 'communications', 'operations', 'policy', 'fundraising', 'base-liaison', 'social-media', 'media'];

export async function exerciseInterruptionRoutes(server, engine, events) {
  const { recordIncident } = await server.ssrLoadModule('/src/lib/incidentLedger.js');
  const { createSeededRandom } = await server.ssrLoadModule('/src/lib/seededRandom.js');
  const { recordCampaignStrategy } = await server.ssrLoadModule('/src/lib/campaignOperations.js');
  const { spinStory } = await server.ssrLoadModule('/src/lib/news.js');
  const { BALLOT_MEASURE_RULES } = await server.ssrLoadModule('/src/data/ballotMeasureRules.js');
  const candidates = await server.ssrLoadModule('/src/data/candidates.js');
  const { build40IncidentSources } = await server.ssrLoadModule('/src/lib/build40DecisionEligibility.js');
  const { CANDIDATE_EVENTS = [] } = await server.ssrLoadModule('/src/data/candidateEvents/index.js');
  const { TRADITIONAL_STAFF_SELECTION_COUNT } = await server.ssrLoadModule('/src/data/traditionalStaffRoster.js');
  const allIds = [...events,...CANDIDATE_EVENTS].map(({id})=>id);
  const numbered = new Map(events.filter(({ id }) => id.startsWith('interrupt-')).map((event) => [event.id.split('-')[1], event]));
  const checks = {};
  const byId = {};
  const originalRandom = Math.random;
  const originalStorage = globalThis.localStorage;
  const memory = new Map();
  globalThis.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };

  const game = (party, seed, extra = {}) => {
    Math.random = createSeededRandom(seed);
    const candidateId = ({ dem: 'shapiro', rep: 'vance', grn: 'stein', lib: 'oliver' })[party];
    const opponentId = party === 'dem' ? 'vance' : 'shapiro';
    assert.ok(candidates.CANDIDATE_BY_ID[candidateId], candidateId);
    const fresh = engine.createGame({ party, candidateId, opponentId, startId: 'aug', campaignId: seed, difficultyId: 'hard', ...extra });
    const ready = engine.confirmBuild35Staffing(fresh, staff.slice(0,TRADITIONAL_STAFF_SELECTION_COUNT));
    return { ...ready, funds: 100, currentEventData: null, currentEventId: null, outcome: null, eventSchedule: [], eventScheduleIndex: -1, usedEvents: [] };
  };
  const selectedFixtures = new Map();
  const isolate = (state, number, options = {}) => { const card = engine.nextEventFor(state, {
    excludedEventIds: allIds.filter((id) => id !== numbered.get(number).id),
    random: () => 0, ...options,
  }).event; if (card?.sourceReceiptId && card.id === numbered.get(number).id) selectedFixtures.set(number, { state: structuredClone(state), card }); return card; };
  const schedule = (state, number) => engine.advanceDecisionEvent({
    ...state,
    usedEvents: allIds.filter((id) => id !== numbered.get(number).id),
    eventSchedule: [{ status: 'pending', afterActions: 0 }], eventScheduleIndex: -1,
    currentEventData: null, currentEventId: null, outcome: null,
  });
  const note = (number, fields) => { byId[number] = { ...byId[number], ...fields }; };
  const observe = (state, numbers, detail = {}) => {
    for (const number of numbers) {
      if (byId[number]?.nativePositive) continue;
      const card = isolate({ ...state, usedEvents: [] }, number);
      const source = state.incidentLedger.find(({ id }) => id === card?.sourceReceiptId);
      if (source) note(number, { nativePositive: true, sourceId: source.id, state: card.context.stateId, ...detail });
    }
  };
  const commit = (before, after, context) => recordCampaignStrategy(before, recordIncident(before, after, context), context);
  const openWeek = (before, week) => engine.startTurn({ ...before, week, eventScheduleWeek: -1 });
  const clearCard = (before) => ({ ...before, currentEventId: null, currentEventData: null, outcome: null, eventSchedule: [], eventScheduleIndex: -1, usedEvents: [] });

  try {
    assert.equal(BALLOT_MEASURE_RULES.length, 0);
    checks.stockOfficialMeasureRoutes = 0;
    for (const [number, definition] of numbered) {
      if (definition.trigger.kind !== 'general-draw') continue;
      const party = definition.bucket.toLowerCase().includes('republican') ? 'rep' : 'dem';
      const base = { ...game(party, 'b43:draw:' + number, { modeId: 'four-parties' }), week: 3, incidentLedger: [], ballotMeasures: [] };
      const drawn = isolate(base, number, { onlyDraw: true });
      assert.equal(drawn?.id, definition.id, number);
      assert.ok(drawn.context.stateId, number);
      assert.equal(isolate({ ...base, usedEvents: [definition.id] }, number), null, number);
      if (definition.bucket !== 'Any' && definition.bucket !== 'Anyone') {
        const wrong = party === 'rep' ? 'dem' : 'rep';
        if (/republican|democrat/i.test(definition.bucket)) assert.equal(isolate(base, number, { onlyDraw: true, actingParty: wrong }), null, number);
      }
      note(number, { drawWithoutLedger: true, usedIdRejected: true, state: drawn.context.stateId, sourceReceiptId: drawn.sourceReceiptId });
    }
    const rep = { ...game('rep', 'b43:069'), week: 3, incidentLedger: [], ballotMeasures: [] };
    const card069 = schedule(rep, '069');
    assert.equal(card069.currentEventId, numbered.get('069').id);
    assert.equal(card069.currentEventData.sourceReceiptId, null);
    assert.ok(engine.saveGame(card069));
    const resumed069 = engine.loadGame();
    assert.equal(resumed069.currentEventData.context.stateId, card069.currentEventData.context.stateId);
    assert.equal(resumed069.currentEventData.sourceReceiptId, null);
    const resolved069 = engine.applyChoice(resumed069, 'choice-2');
    const appliedCost = Math.round((resumed069.funds - resolved069.funds) * 100) / 100;
    assert.equal(appliedCost, -resolved069.build40.decisionReceipts.at(-1).effects.find(({ kind }) => kind === 'cash').amount);
    assert.ok(appliedCost > 0);
    assert.equal(resolved069.build40.decisionReceipts.at(-1).stateId, resumed069.currentEventData.context.stateId);
    assert.equal(engine.applyChoice({ ...resolved069, outcome: null }, 'choice-2').funds, resolved069.funds);
    note('069', { scheduledSavedResumed: true, choice2AppliedCost: appliedCost, retryRejected: true, normalScheduleState: resumed069.currentEventData.context.stateId });

    const field = game('dem', 'b43:field');
    let canvass;
    for (let i = 0; i < 80 && !canvass; i++) {
      const before = { ...field, build34CampaignId: 'b43:field:' + i, week: 3 };
      const after = engine.applyAction(before, 'volunteers', 'PA');
      assert.notEqual(after, before, 'Native volunteer operation is legal');
      const recorded = recordIncident(before, after, { type: 'action', actionId: 'volunteers', abbr: 'PA' });
      const receipt = recorded.incidentLedger.at(-1);
      for (const number of ['029', '032']) {
        const event = isolate(recorded, number);
        if (event?.sourceReceiptId === receipt.id) note(number, { nativePositive: true, sourceId: receipt.id });
      }
      if (receipt.payload.canvassReport) canvass = { before, recorded, receipt };
    }
    assert.ok(canvass, 'Native volunteers wrote the canvass error payload');
    const { before, recorded, receipt } = canvass;
    assert.ok(receipt.payload.canvassReport.districtId && receipt.payload.canvassReport.affectedAddresses > 0);
    assert.equal(receipt.stateId, 'PA');
    assert.equal(receipt.campaignId, before.build34CampaignId);
    assert.equal(isolate(before, '038'), null);
    assert.equal(isolate({ ...recorded, incidentLedger: [{ ...receipt, campaignId: 'another-campaign' }] }, '038'), null);
    assert.equal(isolate({ ...recorded, incidentLedger: [{ ...receipt, payload: { ...receipt.payload, canvassReport: { affectedAddresses: 0 } } }] }, '038'), null);
    const stale038 = isolate({ ...recorded, week: recorded.week + 4 }, '038');
    assert.equal(stale038, null, 'Current stale receipt rejection');
    selectedFixtures.set('038',{state:structuredClone(recorded),card:{sourceReceiptId:receipt.id}});
    const pending = schedule(recorded, '038');
    assert.equal(pending.currentEventData?.sourceReceiptId, receipt.id);
    assert.equal(pending.currentEventData.context.stateId, 'PA');
    assert.ok(engine.saveGame(pending));
    const resumed = engine.loadGame();
    assert.equal(resumed.currentEventData.sourceReceiptId, receipt.id);
    assert.equal(resumed.currentEventData.context.stateId, 'PA');
    assert.deepEqual(resumed.incidentLedger.find((source) => source.id === receipt.id)?.payload.canvassReport, receipt.payload.canvassReport);
    const resolved = engine.applyChoice(resumed, resumed.currentEventData.choices[0]);
    assert.equal(resolved.build40.decisionReceipts.length, resumed.build40.decisionReceipts.length + 1);
    assert.equal(resolved.build40.decisionReceipts.at(-1).sourceReceiptId, receipt.id);
    assert.equal(resolved.build40.decisionReceipts.at(-1).stateId, 'PA');
    assert.equal(isolate(resolved, '038'), null);
    const replay = { ...resolved, outcome: null };
    assert.equal(engine.applyChoice(replay, resumed.currentEventData.choices[0]), replay);
    assert.ok(engine.saveGame(resolved));
    assert.equal(engine.loadGame().build40.decisionReceipts.at(-1).id, resolved.build40.decisionReceipts.at(-1).id);
    note('038', { nativePositive: true, sourceId: receipt.id, sourceState: receipt.stateId, ...receipt.payload.canvassReport,
      noReceiptRejected: true, wrongCampaignRejected: true, malformedPayloadRejected: true, staleRejected: true,
      scheduledSavedResumed: true, retryRejected: true, resolvedSaveReloaded: true });

    const stripped = { ...pending, incidentLedger: [] };
    assert.ok(engine.saveGame(stripped));
    const strippedResumed = engine.loadGame();
    assert.equal(strippedResumed.currentEventData, null, 'Missing saved source retires pending card');
    assert.equal(engine.applyChoice(strippedResumed, 'choice-1'), strippedResumed);
    note('038', { savedContextWithoutSourceRejected: true });

    const rival = { ...game('dem', 'b43:rival'), week: 3 };
    let rivalProof;
    for (let i = 0; i < 12 && !rivalProof; i++) {
      const seed = 'b43:rival:' + i;
      Math.random = createSeededRandom(seed);
      const beforeRival = { ...rival, build34CampaignId: seed };
      const afterRival = engine.opponentTurn(beforeRival);
      const committed = recordIncident(beforeRival, afterRival, { type: 'opponent' });
      const source = committed.incidentLedger.at(-1);
      const card = isolate(committed, '072');
      if (card?.sourceReceiptId === source.id) rivalProof = { beforeRival, committed, source, card, seed };
      const attendance = isolate(committed, '079');
      if (attendance?.sourceReceiptId === source.id) note('079', { nativePositive: true, sourceId: source.id, state: attendance.context.stateId });
    }
    assert.ok(rivalProof, 'Native rival schedule produced a matching move and interruption');
    const { source: rivalSource, card: rivalCard, committed: committedRival, seed: rivalSeed } = rivalProof;
    const move = rivalSource.payload.neglectedStateMove;
    assert.equal(rivalCard.context.stateId, move.abbr);
    assert.ok(rivalSource.payload.moves.some(({ state, type }) => state === move.abbr && type === move.type));
    assert.equal(isolate(rivalProof.beforeRival, '072'), null);
    assert.equal(isolate({ ...committedRival, incidentLedger: [{ ...rivalSource, payload: { ...rivalSource.payload,
      neglectedStateMove: { ...move, effectApplied: false } } }] }, '072'), null);
    assert.equal(isolate({ ...committedRival, week: 9 }, '072'), null);
    note('072', { nativePositive: true, seed: rivalSeed, sourceId: rivalSource.id, week: rivalSource.week, state: move.abbr,
      type: move.type, margin: move.sourceMargin, effect: move.effectMagnitude, attention: move.playerAttention,
      noReceiptRejected: true, unappliedMoveRejected: true, staleRejected: true });

    const debateGame = game('dem', 'b43:debate', { runningMateId: 'beshear' });
    let withPledge;
    for (const debateId of ['debate1', 'debate2', 'debate3']) {
      const base = { ...debateGame, week: 5, debatePrep: 4, debate: { id: debateId, step: 0, picks: [], done: false, verdict: null } };
      for (const openingChoice of [0, 1, 2]) {
        let state = base;
        while (!state.debate.done) {
          const options = engine.debateDefinition(state).questions[state.debate.step].answers;
          const choice = options[openingChoice] || options[0];
          const next = engine.answerDebate(state, choice);
          assert.notEqual(next, state, debateId);
          const source = next.incidentLedger.at(-1);
          if (source.payload.promise?.issueId === 'economy' && !withPledge) withPledge = next;
          for (const number of ['001', '002', '003', '004', '005', '006', '007', '009', '010', '044', '078', '090']) {
            const card = isolate(next, number);
            if (card?.sourceReceiptId === source.id && !byId[number]?.nativePositive) {
              note(number, { nativePositive: true, sourceId: source.id, debateId, question: state.debate.step + 1, choice: choice.id,
                unrelatedReceiptRejected: isolate({ ...next, incidentLedger: [{ ...source, sourceType: 'campaign-briefing' }] }, number) === null });
            }
          }
          state = next;
        }
      }
    }
    assert.ok(withPledge);
    const oldPromise = withPledge.promiseLedger.findLast(({ issueId }) => issueId === 'economy');
    const promiseFollowUp = openWeek(withPledge, 6);
    observe(promiseFollowUp, ['061']);
    const briefing = engine.answerDebate({ ...withPledge, week: 9, debate: { id: 'debate3', step: 0, picks: [], done: false, verdict: null } }, { id: 'choice-2' });
    observe(briefing, ['009']);
    const shiftIssue = (state, issueId, to) => {
      const from = state.stances?.[issueId] ?? 1;
      return commit(state, engine.changeStance(state, issueId, to), { type: 'stance', issueId, from, to });
    };
    const reversal = shiftIssue(withPledge, 'economy', oldPromise.stance > 1 ? 0 : 2);
    assert.ok(reversal.promiseLedger.find(({ id }) => id === oldPromise.id).broken);
    observe(openWeek(reversal, 6), ['065', '068']);
    observe(recordIncident(reversal, engine.opponentTurn(reversal), { type: 'opponent' }), ['062', '071']);

    for (const [party, mate] of [['dem', 'beshear'], ['dem', 'harris'], ['rep', 'rubio'], ['rep', 'youngkin']]) {
      if (!candidates.CANDIDATE_BY_ID[mate]) continue;
      for (let i = 0; i < 7; i++) {
        const state = { ...game(party, 'b43:vp:' + mate + ':' + i, { runningMateId: mate }), week: 2 };
        observe(openWeek(state, 3), ['088']);
        const visit = commit({ ...state, week: 3 }, engine.applyAction({ ...state, week: 3 }, 'visit', 'PA'), { type: 'action', actionId: 'visit', abbr: 'PA' });
        observe(openWeek(visit, 4), ['081']);
        const week6 = { ...state, week: 6 };
        const old = week6.stances?.abortion ?? 1;
        const shifted = shiftIssue(week6, 'abortion', old < 2 ? 2 : 0);
        observe(shifted, ['042']);
        observe(openWeek(shifted, 7), ['008', '082', '083', '086', '093']);
      }
    }

    const town = { ...game('dem', 'b43:town'), week: 4 };
    const answers = ['economy', 'energy', 'immigration'].map((issueId) => ({ issueId, issue: issueId, question: 'Local question on ' + issueId,
      response: 'Campaign answer on ' + issueId, responseApproach: 'Describe the plan' }));
    observe(commit(town, engine.applyAction(town, 'townhall', 'PA', { score: 2, answers }), { type: 'townhall', abbr: 'PA', score: 2, answers }), ['015']);
    for (let i = 0; i < 10; i++) {
      let state = { ...town, build34CampaignId: 'b43:rally:' + i };
      for (let stop = 0; stop < 4; stop++) {
        state = commit(state, engine.applyAction(state, 'visit', 'PA'), { type: 'action', actionId: 'visit', abbr: 'PA' });
        observe(state, ['033', '034', '035']);
      }
    }
    for (let i = 0; i < 30; i++) {
      const seed = 'b43:ads:' + i;
      const state = { ...game('dem', seed), week: 3 };
      const buy = (before, kind, typeId) => commit(before, engine.runAdBlitz(before, { abbr: 'PA', issueId: 'economy', kind, typeId }),
        { type: 'ad', abbrs: ['PA'], issueId: 'economy', kind, adTypeId: typeId });
      const ad = buy(state, 'attack', 'digital');
      observe(ad, ['021', '022', '014'], { seed });
      const story = ad.stories.find(({ abbr, factCheck }) => abbr === 'PA' && factCheck);
      if (!story) continue;
      const spun = commit(ad, spinStory(ad, 'PA', story.id, 'amplify'), { type: 'spin', abbr: 'PA', storyId: story.id, spinMode: 'amplify' });
      observe(spun, ['012', '020'], { seed });
      observe(buy(spun, 'attack', 'digital'), ['026'], { seed });
    }
    const finance = { ...game('dem', 'b43:finance'), week: 3 };
    observe(engine.advanceWeek(finance), ['095']);
    const early = { ...game('dem', 'b43:early'), strategyProfile: { stateActions: { PA: 2 } } };
    const preEarly = { ...early, week: engine.totalWeeksOf(early) - 3 };
    const earlyField = commit(preEarly, engine.applyAction(preEarly, 'volunteers', 'PA'), { type: 'action', actionId: 'volunteers', abbr: 'PA' });
    observe(engine.advanceWeek(clearCard(earlyField)), ['039']);

    for (const [starter, numbers] of [['leak', ['013']], ['surrogate_speech', ['084', '087']], ['m1_donor_price', ['094']]]) {
      const initial = { ...game('dem', 'b43:starter:' + starter), week: 3 };
      const opened = engine.forceEvent(initial, starter);
      if (opened.currentEventId !== starter) continue;
      const resolved = engine.applyChoice(opened, opened.currentEventData.choices.find(({ unavailable }) => !unavailable));
      for (const number of numbers) {
        const card = isolate(resolved, number);
        if (card?.sourceReceiptId) note(number, { nativePositive: true, sourceId: card.sourceReceiptId, prerequisite: starter });
      }
    }

    let foundPetition = false;
    let foundCorrection = false;
    for (const party of ['grn', 'lib', 'rep']) {
      const base = game(party, 'b43:election:' + party, { modeId: 'four-parties' });
      for (let week = 1; week < engine.totalWeeksOf(base); week++) {
        const days = engine.daysUntilElection(base, week);
        if (!(days >= 49 && days <= 55) && days > 10) continue;
        for (let i = 0; i < (party === 'rep' && days <= 10 ? 12 : 1); i++) {
          const seed = 'b43:election:' + party + ':' + i;
          Math.random = createSeededRandom(seed);
          const opened = engine.startTurn({ ...base, build34CampaignId: seed, week, eventScheduleWeek: -1 });
          const sources = build40IncidentSources(opened).filter((source) => source.sourceType === 'election-update' && source.payload.simulated);
          for (const [number, kind] of [['048', 'petition'], ['096', 'petition'], ['097', 'petition-challenge'], ['099', 'polling-place-change'], ['100', 'administration-correction']]) {
            const source = sources.find(({ payload }) => payload.kind === kind);
            if (!source || byId[number]?.nativePositive || (number === '048' && party !== 'grn')) continue;
            const state = { ...opened, usedEvents: [] };
            const event = isolate(state, number);
            if (!event) continue;
            assert.equal(event.sourceReceiptId, source.id, number);
            assert.equal(event.context.stateId, source.stateId, number);
            assert.equal(isolate({ ...state, incidentLedger: [] }, number), null, number);
            assert.ok(Object.values(source.payload).some((value) => String(value).startsWith('simulation:')) || kind === 'petition', number);
            if (kind === 'petition') assert.ok(source.payload.signatures < source.payload.threshold, number);
            note(number, { nativePositive: true, modelOnly: true, party, days, sourceId: source.id, sourceKey: source.sourceId,
              state: source.stateId, payload: source.payload, noReceiptRejected: true });
            foundPetition ||= number === '048';
            foundCorrection ||= number === '100';
          }
        }
      }
    }
    assert.equal(foundPetition || foundCorrection, false, 'Modeled notice does not establish official records');
    assert.ok(['048', '096', '097', '099', '100'].every((number) => !byId[number]?.nativePositive));
    checks.modeledOfficialLanesFailClosed = ['048', '096', '097', '099', '100'];
    checks.authoredDraws = Object.values(byId).filter(({ drawWithoutLedger }) => drawWithoutLedger).length;

    if (!byId['079']?.nativePositive) {
      for (let i=0;i<100&&!byId['079']?.nativePositive;i++) {
        const base={...game('dem','qa45:attendance:'+i),week:5};
        const next=commit(base,engine.opponentTurn(base),{type:'opponent'});
        observe(next,['079'],{seed:'qa45:attendance:'+i});
      }
    }
    for (const [number, result] of Object.entries(byId)) {
      if (!result.nativePositive) continue;
      const fixture = selectedFixtures.get(number);
      assert.ok(fixture, number + ' native fixture retained');
      const state = { ...fixture.state, usedEvents: [] };
      const receipt = state.incidentLedger.find(row=>row.id===fixture.card.sourceReceiptId);
      assert.ok(receipt, number + ' native source retained');
      const missing = isolate({ ...state, incidentLedger: [] },number);
      const stale = isolate({ ...state, week: state.week+4 },number);
      const wrongCampaign = isolate({ ...state, incidentLedger: [{ ...receipt, campaignId: 'wrong-campaign' }] },number);
      assert.equal(missing,null,number+' missing source'); assert.equal(stale,null,number+' stale'); assert.equal(wrongCampaign,null,number+' wrong campaign');
      const pending = schedule(state,number);
      assert.equal(pending.currentEventId,numbered.get(number).id,number+' scheduled');
      assert.ok(engine.saveGame(pending)); const resumed = engine.loadGame();
      assert.equal(resumed.currentEventId,pending.currentEventId,number+' pending resume');
      assert.equal(resumed.currentEventData.context.stateId,pending.currentEventData.context.stateId,number+' target resume');
      let wrongTarget = 'not-applicable: source state is null (national/debate source)';
      if (receipt.stateId || receipt.state) {
        const wrongState = pending.currentEventData.context.stateId==='PA'?'FL':'PA';
        const altered={...pending,currentEventData:{...pending.currentEventData,context:{...pending.currentEventData.context,stateId:wrongState}}};
        const rejected=engine.applyChoice(altered,altered.currentEventData.choices.find(c=>!c.unavailable));
        assert.equal(rejected.build40.decisionReceipts.length,pending.build40.decisionReceipts.length,number+' wrong target');wrongTarget='rejected';
      }
      const resolved = engine.applyChoice(resumed,resumed.currentEventData.choices.find(c=>!c.unavailable));
      assert.ok(resolved.outcome,number+' resolved'); const replay=engine.applyChoice({...resolved,outcome:null},'choice-1');assert.equal(replay.funds,resolved.funds,number+' replay cash');assert.deepEqual(replay.build40.decisionReceipts,resolved.build40.decisionReceipts,number+' replay receipt count');
      assert.ok(engine.saveGame(resolved)); assert.deepEqual(engine.loadGame().build40.decisionReceipts,JSON.parse(JSON.stringify(resolved.build40.decisionReceipts)),number+' settled resume');
      assert.ok(engine.saveGame({...pending,incidentLedger:[]})); assert.equal(engine.loadGame().currentEventData,null,number+' missing pending source');
      const mutated = state.incidentLedger.map(row=>row.id===receipt.id?{...row,payload:{...row.payload,qaTampered:true}}:row);
      assert.ok(engine.saveGame({...pending,incidentLedger:mutated})); assert.equal(engine.loadGame().currentEventData,null,number+' changed pending source');
      note(number,{independentContract:{noSource:true,stale:true,crossCampaign:true,pendingResume:true,targetPreserved:true,wrongTarget,settledResume:true,missingPendingRetired:true,changedPendingRetired:true,onceOnly:true}, fixture:{week:state.week,party:state.party,candidateId:state.candidateId,campaignId:state.build34CampaignId,source:receipt}});
    }
    return { checks, byId };
  } finally {
    Math.random = originalRandom;
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
}
