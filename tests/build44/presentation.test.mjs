import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { presentationCases } from './presentation.cases.mjs';

const server = await createServer({
  appType: 'custom',
  cacheDir: await mkdtemp(join(tmpdir(), 'bfa44-presentation-')),
  configLoader: 'runner',
  server: { middlewareMode: true, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
});

try {
  const { default: EventCard } = await server.ssrLoadModule('/src/components/game/EventCard.jsx');
  const render = (event, outcome) => renderToStaticMarkup(createElement(EventCard, {
    game: {}, event, outcome, onChoose() {},
  }));
  const frame = { title: 'The field launch', text: 'The team has a plan.', tone: 'wild' };
  const compiled = {
    ...frame,
    context: { stateId: 'PA', sourceReceiptId: 'INTERNAL-SOURCE' },
    choices: [
      {
        id: 'bank-it', label: 'Bank it', detail: 'Send the standard packet.',
        costM: 913.27, build40Score: 999.67, roll: true,
        effects: { mom: 913.27, risk: 0.98 },
        presentation: { effects: [
          { text: 'Pennsylvania persuasion +1 point', tone: 'positive' },
          { text: 'Cost $2M', tone: 'negative' },
        ] },
      },
      {
        id: 'take-the-chance', label: 'Take the chance', detail: 'Run the expanded event.',
        branches: [{ hidden: true, probability: 0.05, effects: [{ hidden: true, name: 'SECRET-TARGET' }] }],
        presentation: { effects: [
          { text: 'Large chance of Pennsylvania persuasion +0.4 to +0.6 points', tone: 'positive' },
          { text: 'Large chance of Pennsylvania persuasion +2 to +3 points', tone: 'positive' },
        ] },
      },
      {
        id: 'buy-airtime', label: 'Buy airtime', unavailable: 'Insufficient campaign funds.',
        presentation: { effects: [{ text: 'Cost $6M', tone: 'negative' }] },
      },
    ],
  };
  const preview = render(compiled);
  assert.equal([...preview.matchAll(/data-testid="event-choice-presentation"/g)].length, 3);
  assert.match(preview, /Bank it.*Send the standard packet\..*Pennsylvania persuasion \+1 point.*Cost \$2M/);
  assert.match(preview, /Take the chance.*Run the expanded event\..*Large chance of Pennsylvania persuasion \+0\.4 to \+0\.6 points.*Large chance of Pennsylvania persuasion \+2 to \+3 points/);
  assert.match(preview, /data-testid="choice" disabled="".*Buy airtime.*Insufficient campaign funds\..*Cost \$6M/);
  assert.doesNotMatch(preview, /SECRET-TARGET|INTERNAL-SOURCE|913\.27|999\.67|Coin flip|Scandal risk|(?:0\.05|5%|95%)/);
  assert.doesNotMatch(preview, /(?:title|aria-label|aria-description)="[^"]+"/);

  const outcome = {
    label: 'Take the chance',
    text: 'The expanded event drew additional support.',
    scandal: { level: 'SECRET-SCANDAL', hit: 913.27 },
    followUp: { teaser: 'SECRET-FOLLOW-UP', weeks: 99 },
    roll: true,
    presentation: { effects: [{ text: 'Pennsylvania persuasion +4.8 points', tone: 'positive' }] },
  };
  const result = render(compiled, outcome);
  assert.match(result, /data-testid="event-outcome".*Take the chance.*data-testid="event-outcome-presentation".*Pennsylvania persuasion \+4\.8 points/);
  assert.doesNotMatch(result, /SECRET|913\.27|chance of Pennsylvania|data-testid="choice"|5%|95%/);
  assert.doesNotMatch(render(compiled, { label: 'Take the chance', presentation: { effects: [] } }), /event-outcome-presentation/);

  const legacy = { ...frame, choices: [{ label: 'Keep going', effects: { mom: 1 }, roll: true }] };
  assert.match(render(legacy), /Momentum \+1.*Coin flip/);
  assert.match(render(legacy, { label: 'Keep going', scandal: { level: 'minor', hit: 1 },
    followUp: { weeks: 1, teaser: 'Another event follows.' } }), /Scandal — minor.*Another event follows\./);
  assert.doesNotMatch(render({ ...legacy, context: {} }), /Momentum \+1|Coin flip/);
  assert.doesNotMatch(render({ ...legacy, choices: [{ ...legacy.choices[0], presentation: { effects: [] } }] }),
    /Momentum \+1|Coin flip/);

  const { bridgeCases, conditional, engine, cost } = presentationCases();
  for (const test of bridgeCases) {
    const event = test.save.currentEventData;
    const previewMarkup = render(event);
    for (const text of [test.fixed, ...test.visible]) assert.ok(previewMarkup.includes(text), test.name + ': ' + text);
    assert.doesNotMatch(previewMarkup, /massive|hidden tier|hidden branch|coin flip|\+4(?:\b|\.)|\+5(?:\b|\.)|\+6(?:\b|\.)|\b(?:5|45|50|95)%/i);
    const result = engine.applyChoice(test.save, test.choiceId, test.eventId);
    assert.ok(render(event, result.outcome).includes(test.actual), test.name + ': ' + test.actual);
    assert.equal(engine.applyChoice(result, test.choiceId, test.eventId), result);
    console.log('PASS authored bridge ' + test.name + ': ' + test.actual);
  }
  const conditionalPreview = render(conditional.event);
  const conditionalResult = render(conditional.event,
    engine.applyChoice(conditional.game, conditional.outcome.choiceId, conditional.event.id).outcome);
  assert.ok(conditionalPreview.includes('Campaign House support -2.4 to -1.6 points · Pennsylvania'));
  assert.ok(conditionalResult.includes('Campaign House support -2.4 points · Pennsylvania'));
  const costPreview = render(cost.currentEventData);
  assert.ok(costPreview.includes('Campaign cost: $1.6–$2.4M'));
  assert.ok(costPreview.includes('Campaign turnout -3.6 to -2.4 points · Illinois'));
  const oldSave = JSON.parse(await readFile(new URL('../../../fixtures/build43-settled-scandal.json', import.meta.url), 'utf8'));
  const saves = new Map([[engine.STORAGE_KEY, oldSave.storage]]);
  globalThis.localStorage = { getItem: (key) => saves.get(key) ?? null, setItem: (key, value) => saves.set(key, value) };
  const resumed = engine.loadGame();
  assert.equal(resumed.currentEventId, oldSave.eventId);
  assert.match(render(resumed.currentEventData, resumed.outcome), new RegExp(`Scandal — ${oldSave.scandal.level}\\. Momentum −${oldSave.scandal.hit}\\.`));
  assert.equal(resumed.momentum, oldSave.momentum);
  assert.equal(resumed.funds, oldSave.funds);
  assert.deepEqual(resumed.build40.decisionReceipts, oldSave.receipts);
  assert.equal(engine.applyChoice(resumed, resumed.outcome.choiceId), resumed);
  assert.ok(engine.saveGame(resumed));
  assert.deepEqual(engine.loadGame().outcome, resumed.outcome);
  console.log('PASS settled Build 43 scandal recap survives load and resave without replaying effects');
  console.log('PASS EventCard approved previews, disabled costs, applied results, legacy fallback and raw-field suppression');
} finally {
  await server.close();
}
