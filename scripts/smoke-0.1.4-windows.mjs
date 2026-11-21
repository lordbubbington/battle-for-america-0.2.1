import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import os from 'node:os';
import path from 'node:path';
import { unzipSync } from 'node:zlib';

const executable = path.resolve(process.argv[2] || 'release-output/win-unpacked/Battle for America 2028.exe');
const profile = await mkdtemp(path.join(os.tmpdir(), 'bfa014-launch-'));
const portProbe = createServer();
await new Promise((resolve, reject) => {
  portProbe.once('error', reject);
  portProbe.listen(0, '127.0.0.1', resolve);
});
const debugPort = portProbe.address().port;
await new Promise((resolve) => portProbe.close(resolve));
const game = spawn(executable, [
  '--remote-debugging-port=' + debugPort,
  '--remote-debugging-address=127.0.0.1',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--user-data-dir=' + profile,
], { cwd: profile, windowsHide: true, stdio: 'ignore' });
let socket;
try {
  let launchError;
  game.once('error', (error) => { launchError = error; });
  let page;
  for (let i = 0; i < 180 && !page; i++) {
    if (launchError) throw launchError;
    if (game.exitCode != null) throw new Error('Packaged game exited early with code ' + game.exitCode);
    try {
      const targets = await fetch('http://127.0.0.1:' + debugPort + '/json/list').then((response) => response.json());
      page = targets.find((target) => target.type === 'page' && target.url.includes('/dist/index.html'));
    } catch {}
    if (!page) await delay(100);
  }
  assert.ok(page, 'Packaged app loaded its local index.html');
  assert.match(page.url, /^file:/);
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const requests = new Map();
  const errors = [];
  let sequence = 0;
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && requests.has(message.id)) {
      const { resolve, reject } = requests.get(message.id);
      requests.delete(message.id);
      if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  });
  function cdp(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      requests.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await cdp('Runtime.evaluate', { expression, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  async function waitFor(expression, label, attempts = 120) {
    for (let i = 0; i < attempts; i++) {
      const value = await evaluate(expression);
      if (value) return value;
      await delay(100);
    }
    throw new Error(label + ' missing: ' + await evaluate('document.body.innerText.slice(-1800)'));
  }
  async function click(label) {
    await waitFor("(() => { const button = [...document.querySelectorAll('button')].find((item) => !item.disabled && item.innerText.trim() === " + JSON.stringify(label) + "); if (!button) return false; button.click(); return true; })()", label);
  }
  const testId = (id) => '[data-testid="' + id + '"]';
  async function clickSelector(selector, label = selector) {
    await waitFor(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!node || node.disabled) return false; node.click(); return true; })()`, label);
  }
  async function setViewport(width, height) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await delay(150);
    const metrics = await evaluate(`({ width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth })`);
    assert.equal(metrics.width, width, `${width} viewport applied`);
    assert.equal(metrics.height, height, `${height} viewport applied`);
    assert.ok(metrics.documentWidth <= width + 1, `${width} viewport has no horizontal page overflow`);
  }
  async function campaign() {
    const packed = await waitFor("localStorage.getItem('election2028.save.v40')", 'v40 campaign save');
    return JSON.parse(packed.startsWith('b35:z1:') ? unzipSync(Buffer.from(packed.slice(7), 'base64')).toString() : packed);
  }
  const storageKey = 'election2028.save.v40';
  const base = process.argv.includes('--baseline');
  const version = base ? '0.1.2' : '0.1.4';
  const modeSelector = 'input[name="build40-election-mode"]';
  async function setup() {
    await evaluate('localStorage.removeItem(' + JSON.stringify(storageKey) + ')');
    await cdp('Page.reload');
    await clickSelector('summary', 'Advanced Options');
  }
  async function confirmStaff() {
    for (let i = 1; i <= 9; i++) {
      await clickSelector('[aria-label="Staff choices"] button:nth-child(' + i + ')');
    }
    await click('Confirm inner circle');
    await waitFor('!!document.querySelector("[data-testid=action-bar]")', 'campaign action bar');
  }
  const order = (prefix) => evaluate('[...document.querySelectorAll("button[data-testid^=' + prefix + '-]")].map(x => x.dataset.testid.slice(' + (prefix.length + 1) + '))');
  const historical = ['fdr', 'reagan'];
  const model = JSON.parse(readFileSync(new URL('../src/data/syntheticVoterModel.json', import.meta.url), 'utf8'));
  const weights = Object.fromEntries(model.states.map(state => [state.abbr, state.ballots]));
  function weightedGeneric(stateGeneric) {
    const denominator = Object.keys(stateGeneric).reduce((total, state) => total + weights[state], 0);
    const numerator = Object.entries(stateGeneric).reduce((total, [state, value]) => total + weights[state] * value, 0);
    return Math.round(100 * numerator / denominator) / 100;
  }
  async function enterNational(value) {
    const input = 'input[aria-label="National generic ballot — type a value"]';
    await waitFor('!!document.querySelector(' + JSON.stringify(input) + ')', 'National generic ballot control');
    await evaluate('document.querySelector(' + JSON.stringify(input) + ').focus()');
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
    await cdp('Input.insertText', { text: String(value) });
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await waitFor('document.querySelector(' + JSON.stringify(input) + ').value === ' + JSON.stringify(value.toFixed(1)), 'national value ' + value);
  }
  async function nudgePennsylvania(value) {
    await evaluate('(() => { const el=document.querySelector("[aria-label=\\"Pennsylvania nudge\\"]"); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,' + value + '); el.dispatchEvent(new Event("input",{bubbles:true})); })()');
    await waitFor('document.querySelector("[aria-label=\\"Pennsylvania nudge\\"]").parentElement.innerText.includes(' + JSON.stringify((value > 0 ? 'D+' : 'R+') + Math.abs(value).toFixed(1)) + ')', 'state map nudge ' + value);
  }
  async function setOffline() {
    await cdp('Network.enable');
    await cdp('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  }
  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await setOffline();
  await setViewport(960, 640);
  await waitFor('document.title.includes(' + JSON.stringify(version) + ')', 'application title ' + version);
  await clickSelector('summary', 'Advanced Options');
  const difficulty = await evaluate(`(() => {
    const title = [...document.querySelectorAll('h2')].find(el => el.textContent.includes('How brutal'));
    return [...title.closest('section').querySelectorAll('button:has(span[class*="h-[60px]"])')].map(button => {
      const icon = button.querySelector('span[class*="h-[60px]"]').getBoundingClientRect();
      const label = button.querySelector('p');
      return { label: label.textContent, width: Math.round(icon.width), height: Math.round(icon.height), fits: label.scrollWidth <= label.clientWidth + 1 };
    });
  })()`);
  assert.ok(difficulty.length >= 3 && difficulty.every(x => x.width === 60 && x.height === 60 && x.fits), JSON.stringify(difficulty));
  const scenarios = {};
  for (const mode of await evaluate(`[...document.querySelectorAll('${modeSelector}')].map(e=>e.value)`)) {
    await clickSelector(modeSelector + '[value="' + mode + '"]');
    for (const party of ['dem', 'rep']) {
      await clickSelector(testId('party-' + party));
      const choices = [await order('cand'), await order('opp')];
      assert.ok(choices.every(list => list.length > 0));
      if (!base) for (const list of choices) {
        const id = list.find(entry => historical.includes(entry));
        if (id) assert.equal(list.at(-1), id, mode + '/' + party);
      }
      scenarios[mode + '/' + party] = choices;
    }
  }
  assert.equal(Object.keys(scenarios).length, 8);
  if (base) {
    assert.equal(scenarios['two-parties/dem'][0][0], 'fdr');
    assert.equal(scenarios['two-parties/dem'][1][0], 'reagan');
    console.log(JSON.stringify({ version, scenarios, difficulty }, null, 2));
  } else {
    const tickets = [];
    for (const [party, nominee, rival, value, nudge] of [['dem', 'fdr', 'reagan', 2.3, 2.5], ['rep', 'reagan', 'fdr', -2.3, -2.5]]) {
      await setup();
      await clickSelector(testId('party-' + party));
      await clickSelector(testId('cand-' + nominee));
      await clickSelector(testId('opp-' + rival));
      const mate = await waitFor(`(() => {
        const section = [...document.querySelectorAll('h2')].find(x=>x.textContent === 'Pick your running mate').closest('section');
        const buttons = [...section.querySelectorAll('button')];
        const first = buttons.find(b=>!b.disabled && b.querySelector('img')?.naturalWidth > 0);
        if (!first) return false;
        const rect = first.querySelector('span[class*="h-20"]').getBoundingClientRect();
        return { labels: buttons.map(b=>b.querySelector('p').textContent), width: Math.round(rect.width), height: Math.round(rect.height) };
      })()`, 'loaded VP art');
      assert.equal(mate.width, 80);
      assert.equal(mate.height, 80);
      assert.ok(!mate.labels.some(name => /Roosevelt|Reagan/.test(name)));
      const vp = '(() => [...document.querySelectorAll("h2")].find(x=>x.textContent === "Pick your running mate").closest("section"))()';
      const missingPortrait = await evaluate(`(() => {
        const section = ${vp};
        const card = [...section.querySelectorAll('button')].find(b => !b.disabled && b.querySelector('img')?.naturalWidth > 0);
        const name = card.querySelector('p').textContent;
        card.querySelector('img').dispatchEvent(new Event('error'));
        return name;
      })()`);
      await waitFor(`(() => {
        const card = [...(${vp}).querySelectorAll('button')].find(b=>b.querySelector('p')?.textContent === ${JSON.stringify(missingPortrait)});
        return !card.querySelector('img') && [...card.querySelectorAll('[aria-hidden="true"]')].some(el => el.textContent === ${JSON.stringify(missingPortrait[0])});
      })()`, 'VP portrait error falls back to initials');
      await enterNational(value);
      await nudgePennsylvania(nudge);
      await clickSelector(testId('launch'), 'Launch');
      await waitFor(`[...document.querySelectorAll('[aria-label="Staff choices"] img')].filter(img => img.naturalWidth === 96).length === 16`, '16 loaded staff portraits');
      await confirmStaff();
      const started = await campaign();
      assert.equal(started.candidateId, nominee);
      assert.equal(started.opponentId, rival);
      assert.equal(started.natGeneric, value);
      assert.equal(started.genericBaseline, value);
      assert.equal(weightedGeneric(started.stateGeneric), value);
      const opening = { candidate: started.candidateId, opponent: started.opponentId, nationalGeneric: started.natGeneric, weightedGeneric: weightedGeneric(started.stateGeneric), paGeneric: started.stateGeneric.PA };
      await cdp('Page.reload');
      await waitFor('!!document.querySelector("[data-testid=action-bar]")', 'saved campaign resumed');
      const resumed = await campaign();
      assert.equal(resumed.candidateId, nominee);
      assert.equal(resumed.opponentId, rival);
      assert.equal(resumed.natGeneric, value);
      assert.deepEqual(resumed.stateGeneric, started.stateGeneric);
      tickets.push({ ...opening, resume: true, vpCards: mate.labels.length, vpPortrait: [mate.width, mate.height], vpMissingImageFallback: true });
    }
    let selected = null;
    for (let step = 0; step < 8; step++) {
      const state = await campaign();
      if (state.currentEventId && !state.outcome) {
        const choice = await evaluate(`(() => { const x=document.querySelector('[data-testid="choice"]:enabled'); if (!x) return false; x.click(); return true; })()`);
        if (choice) {
          const before = state.build40.decisionReceipts.length;
          for (let attempt = 0; attempt < 50; attempt++) {
            const after = await campaign();
            if (after.build40.decisionReceipts.length > before) {
              selected = after.build40.decisionReceipts.at(-1);
              break;
            }
            await delay(100);
          }
        }
      }
      if (selected && (await campaign()).lastOpponent?.forecastPlan) break;
      await clickSelector(testId('advance'), 'next decision/turn');
      await delay(500);
    }
    const played = await campaign();
    assert.ok(selected, 'native event choice committed');
    assert.equal(played.lastOpponent?.forecastPlan?.source, 'shared-election-forecast', 'native rival forecast turn');
    assert.match(played.lastOpponent.forecastPlan.scheduleId, /^weekly-schedule-[1-5]$/);
    assert.ok(played.lastOpponent.actionMix.length > 0);
    await cdp('Page.reload');
    await waitFor('!!document.querySelector("[data-testid=action-bar]")', 'played campaign resumed');
    assert.deepEqual((await campaign()).build40.decisionReceipts, played.build40.decisionReceipts);
    const fixtures = new URL('../../fixtures/', import.meta.url);
    async function loadFixture(name) {
      const fixture = JSON.parse(readFileSync(new URL(name, fixtures)));
      await evaluate('localStorage.setItem(' + JSON.stringify(storageKey) + ',' + JSON.stringify(JSON.stringify(fixture)) + ')');
      await cdp('Page.reload');
      await waitFor('!!document.querySelector("[data-testid=action-bar]")', name + ' loaded');
      return fixture;
    }
    const beforeAction = await loadFixture('038-native-before-action.json');
    await evaluate('document.querySelector("[data-testid=state-PA]").dispatchEvent(new MouseEvent("click",{bubbles:true}))');
    await clickSelector(testId('action-volunteers'));
    await waitFor('!!document.querySelector("[data-testid=event-choice-presentation]")', 'native receipt decision');
    const nativePending = await campaign();
    assert.match(nativePending.currentEventId,/interrupt-038-/);
    assert.equal(nativePending.currentEventData.context.stateId,'PA');
    const nativeSource = nativePending.incidentLedger.find(receipt => receipt.id === nativePending.currentEventData.sourceReceiptId);
    assert.equal(nativeSource.sourceId,'volunteers');
    assert.ok(nativeSource.payload.canvassReport.affectedAddresses > 0);
    assert.equal(nativePending.actionsLeft,beforeAction.actionsLeft-1);
    await cdp('Page.reload');
    await waitFor('!!document.querySelector("[data-testid=event-choice-presentation]")','native pending resumed');
    await clickSelector(testId('choice')+':enabled');
    await waitFor('!!document.querySelector("[data-testid=event-outcome-presentation]")','native outcome');
    const nativeDone = await campaign();
    assert.equal(nativeDone.build40.decisionReceipts.filter(receipt=>receipt.eventId===nativePending.currentEventId).length,1);
    await cdp('Page.reload');
    await waitFor('!!document.querySelector("[data-testid=event-outcome-presentation]")','native settled resume');
    assert.deepEqual((await campaign()).build40.decisionReceipts,nativeDone.build40.decisionReceipts);
    const nativeChain={action:'volunteers',state:'PA',sourceReceipt:nativeSource.id,selectionWeek:nativePending.week,resumed:true,decision:nativeDone.build40.decisionReceipts.at(-1)};
    const retired = await loadFixture('038-missing-source.json');
    await waitFor('!document.querySelector("[data-testid=choice]")','invalid pending retired');
    assert.equal((await campaign()).funds,retired.funds);
    await clickSelector(testId('advance'));
    await waitFor('!document.querySelector("[data-testid=choice]")','invalid save remains playable');
    const receiptFixtures=[];
    for (const name of ['038-legacy-pending.json','072-valid-pending.json','069-pending.json']) {
      const fixture=await loadFixture(name);
      await waitFor('!!document.querySelector("[data-testid=choice]")',name+' choices');
      const before=await campaign();
      assert.equal(before.currentEventData.context.stateId,fixture.currentEventData.context.stateId);
      if(name.startsWith('069')) assert.match(await evaluate('document.querySelector("[data-testid=event-stage]").innerText'),/fictional/i);
      await clickSelector(testId('choice')+':enabled');
      await waitFor('!!document.querySelector("[data-testid=event-outcome-presentation]")',name+' outcome');
      const after=await campaign();
      await cdp('Page.reload');
      await waitFor('!!document.querySelector("[data-testid=event-outcome-presentation]")',name+' settled resume');
      assert.deepEqual((await campaign()).build40.decisionReceipts,after.build40.decisionReceipts);
      receiptFixtures.push({name,state:before.currentEventData.context.stateId,onceOnly:after.build40.decisionReceipts.filter(r=>r.eventId===before.currentEventId).length===1});
    }
    const oldScandal = JSON.parse(readFileSync(new URL('build43-settled-scandal.json', fixtures)));
    await evaluate(`localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(oldScandal.storage)})`);
    await cdp('Page.reload');
    const recapText = `Scandal — ${oldScandal.scandal.level}. Momentum −${oldScandal.scandal.hit}.`;
    await waitFor(`document.querySelector('[data-testid="event-outcome-presentation"]')?.innerText.includes(${JSON.stringify(recapText)})`, 'Build 43 settled scandal recap');
    const scandalResumed = await campaign();
    assert.equal(scandalResumed.currentEventId, oldScandal.eventId);
    assert.equal(scandalResumed.momentum, oldScandal.momentum);
    assert.equal(scandalResumed.funds, oldScandal.funds);
    assert.deepEqual(scandalResumed.build40.decisionReceipts, oldScandal.receipts);
    const legacyScandalRecap = { eventId: oldScandal.eventId, text: recapText, unchangedFundsAndMomentum: true, receiptsUnchanged: true };
    for (const [width,height] of [[1440,900],[960,640]]) {
      await setViewport(width,height);
      const shot=await cdp('Page.captureScreenshot',{format:'png'});
      writeFileSync(new URL('../../evidence/packaged-campaign-'+width+'.png',import.meta.url),Buffer.from(shot.data,'base64'));
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ version, offline: true, scenarios, difficulty, tickets, decision: selected, rival: played.lastOpponent.forecastPlan,nativeChain,receiptFixtures,invalidRetiredWithoutCharge:true,legacyScandalRecap }, null, 2));
  }
} finally {
  socket?.close();
  game.kill();
}
