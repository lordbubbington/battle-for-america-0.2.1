import { createSeededRandom } from '../../src/lib/seededRandom.js';
import { BUILD40_EVENTS } from '../../src/data/build40EventCatalog.js';
import { build40DecisionEligibility, build40IncidentSources } from '../../src/lib/build40DecisionEligibility.js';
import { recordCampaignStrategy } from '../../src/lib/campaignOperations.js';
import { recordIncident } from '../../src/lib/incidentLedger.js';
import * as e from '../../src/lib/gameEngine.js';
const staff = ['field', 'pollster', 'communications', 'operations', 'policy', 'fundraising', 'base-liaison', 'social-media', 'media'];
const events = BUILD40_EVENTS.filter((r) => r.bucket === 'Campaign specific');
const sightings = new Map();
const negatives = new Set();
const picks = new Set();
const modes = ['two-parties', 'four-parties', 'six-party', 'regional-parties'];
const tickets = [['dem','harris','abbott','ossoff'],['rep','vance','shapiro','haley'],['lib','oliver','harris','amash'],['grn','stein','abbott','west']];
const seeds = Number(process.argv[2] || 8);
for (let i = 0; i < seeds; i += 1) {
  const [party, candidateId, opponentId, runningMateId] = tickets[i % tickets.length];
  const modeId = i % 4 >= 2 || party === 'rep' ? 'four-parties' : modes[Math.floor(i / 4) % modes.length];
  const campaignId = 'build40:producer:' + i;
  Math.random = createSeededRandom(campaignId);
  let game = e.confirmBuild35Staffing(e.createGame({ party, candidateId, opponentId, runningMateId, modeId,
    campaignId, difficultyId: 'medium', nationalGeneric: 0, electoralRule: i % 2 ? 'proportional' : 'standard' }), staff);
  const record = (value) => {
    const receipts = build40IncidentSources(value);
    for (const event of events) {
      if (sightings.has(event.id) && negatives.has(event.id)) continue;
      const source = build40DecisionEligibility(value, event, { receipts });
      if (source && !sightings.has(event.id)) sightings.set(event.id, { campaignId, week: value.week, receiptId: source.id });
      if (source === false) negatives.add(event.id);
    }
  };
  const resolve = (value, closing = false) => {
    let next = closing ? e.prepareDecisionWeekClose(value) : e.advanceDecisionEvent(value);
    while (e.decisionPending(next)) {
      const event = next.currentEventData;
      const options = event.choices.filter((choice) => !choice.unavailable);
      const choice = options[Math.floor(Math.random() * options.length)];
      const chosen = e.applyChoice(next, choice, event.id);
      if (next === chosen) throw new Error('Unplayable decision ' + event.id);
      picks.add(event.id);
      record(chosen);
      next = closing ? e.prepareDecisionWeekClose(chosen) : e.advanceDecisionEvent(chosen);
    }
    return next;
  };
  const act = (value, next, context) => next === value ? value : resolve(recordCampaignStrategy(value, recordIncident(value, next, context), context));
  for (let w = 0; w < 14; w += 1) {
    game = resolve(e.acknowledgeCampaignNews(game));
    record(game);
    while (game.debate && !game.debate.done) {
      const q = e.debateDefinition(game).questions[game.debate.step];
      const id = game.debate.id + '-q' + (game.debate.step + 1);
      const choices = q.answers.filter((choice) => !choice.unavailable);
      const result = e.answerDebate(game, choices[(w + i) % choices.length]);
      if (result === game) throw new Error('Unplayable debate ' + id);
      picks.add(id);
      if (!e.debateDefinition({ ...game, debate: null })) negatives.add(id);
      sightings.set(id, { campaignId, week: game.week, receiptId: result.incidentLedger.at(-1)?.id });
      game = resolve(result);
    }
    const states = ['PA','TX','AZ','MI','WI','NC'];
    for (const abbr of (i % 2 ? ['PA','PA','PA'] : states.slice(0, 3))) game = act(game, e.applyAction(game, 'visit', abbr), { type: 'action', actionId: 'visit', abbr });
    game = act(game, e.applyAction(game, 'townhall', 'PA', { score: 2, answers: [{ issueId: 'economy', issue: 'Economy', question: 'What would the plan cost?', response: 'Publish the funding model.', responseApproach: 'specific' }] }), { type: 'townhall', abbr: 'PA' });
    game = act(game, e.applyAction(game, 'volunteers', states[i % states.length]), { type: 'action', actionId: 'volunteers', abbr: states[i % states.length] });
    const abbr = states[(w + i) % states.length];
    game = act(game, e.runAdBlitz(game, { abbr, issueId: 'economy', kind: w % 2 ? 'attack' : 'pro', typeId: 'digital' }),
      { type: 'ad', abbrs: [abbr], issueId: 'economy', kind: w % 2 ? 'attack' : 'pro' });
    const story = game.stories.find((entry) => entry.factCheck) || game.stories.find((entry) => entry.abbr === abbr);
    if (story) {
      const { spinStory } = await import('../../src/lib/news.js');
      for (let attempt = 0; attempt < 2; attempt += 1) game = act(game, spinStory(game, story.abbr, story.id, 'amplify'), { type: 'spin', storyId: story.id, abbr: story.abbr });
    }
    game = act(game, e.makePromise(game, abbr, w % 2 ? 'economy' : 'health'), { type: 'promise', issueId: w % 2 ? 'economy' : 'health', abbr });
    const issueId = w % 2 ? 'economy' : 'abortion';
    const from = game.stances[issueId] ?? 1;
    const to = from === 0 ? 2 : 0;
    game = act(game, e.changeStance(game, issueId, to), { type: 'stance', issueId, from, to });
    game = resolve(game, true);
    const rival = e.opponentTurn(game);
    game = recordIncident(game, rival, { type: 'opponent' });
    record(game);
    game = e.advanceWeek(game);
    if (game.finished) break;
  }
  console.log(campaignId, party, modeId, game.finished, sightings.size);
}
console.log(JSON.stringify({ seeds, conditionalRows: events.length, negative: [...negatives].sort(), eligible: Object.fromEntries(sightings), selected: [...picks].sort(), unobserved: events.filter((event) => !sightings.has(event.id)).map(({ id }) => id) }, null, 2));
