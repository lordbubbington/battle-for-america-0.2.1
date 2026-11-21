import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import os from 'node:os';
import path from 'node:path';
import { unzipSync } from 'node:zlib';

const executable = path.resolve(process.argv[2] || 'release-output/win-unpacked/Battle for America 2028.exe');
const profile = await mkdtemp(path.join(os.tmpdir(), 'bfa012-launch-'));
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
  async function choose(selector, value) {
    await evaluate(`(() => { const select = document.querySelector(${JSON.stringify(selector)}); if (!select) return false; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, ${JSON.stringify(value)}); select.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
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
  const planner = testId('ground-game-panel');
  const summary = testId('ground-game-summary');
  const list = testId('ground-game-states');
  const buy = testId('purchase-ground-game');
  const level = (state, target) => testId('ground-game-level-' + state + '-' + target);
  const rawSave = () => evaluate('localStorage.getItem(' + JSON.stringify(storageKey) + ')');
  async function restore(value) {
    await evaluate('localStorage.setItem(' + JSON.stringify(storageKey) + ',' + JSON.stringify(typeof value === 'string' ? value : JSON.stringify(value)) + ')');
    await cdp('Page.reload');
    await waitFor(`!!document.querySelector(${JSON.stringify(testId('action-bar'))})`, 'campaign resumed');
  }
  async function keyboardClick(selector) {
    await waitFor(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el || el.disabled || el.tabIndex < 0) return false; el.focus(); return document.activeElement === el; })()`, 'keyboard focus for ' + selector);
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13 });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  }
  async function checkLayout() {
    const order = await evaluate(`(() => { const ad = document.querySelector('[data-testid="ad-buys"]'); return [ad, ad?.nextElementSibling, ad?.nextElementSibling?.nextElementSibling].map(node => node?.dataset.testid); })()`);
    assert.deepEqual(order, ['ad-buys', 'ground-game', 'detailed-polling']);
    assert.equal(await evaluate(`document.querySelectorAll('button[data-testid^="action-"]').length`), 6);
  }
  async function confirmTraditionalStaff() {
    for (let i = 0; i < 9; i += 1) {
      await clickSelector(`[aria-label="Staff choices"] button:nth-child(${i + 1})`, 'select traditional staff ' + (i + 1));
    }
    await click('Confirm inner circle');
  }
  async function scrollPlanner() {
    const layout = await evaluate(`(() => {
      const list = document.querySelector(${JSON.stringify(list)});
      const summary = document.querySelector(${JSON.stringify(summary)});
      summary.scrollIntoView({block:'center'});
      const before = summary.getBoundingClientRect();
      list.scrollTop = list.scrollHeight;
      const after = summary.getBoundingClientRect();
      return { scrollable: list.scrollHeight > list.clientHeight && list.scrollTop > 0,
        summaryVisible: after.top >= 0 && after.bottom <= innerHeight,
        fixedWhileScrolling: Math.abs(before.top - after.top) < 1 };
    })()`);
    assert.deepEqual(layout, { scrollable: true, summaryVisible: true, fixedWhileScrolling: true });
  }
  async function planTotals() {
    return evaluate(`[...document.querySelectorAll(${JSON.stringify(summary + ' strong')})].map((item) => Number(item.textContent.replace(/[^0-9.-]/g,'')))`);
  }

  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await setViewport(1280, 720);
  await waitFor("document.title.includes('0.1.2')", '0.1.2 application title');
  await waitFor("[...document.images].filter((img) => img.src.includes('/art/candidates/') && img.naturalWidth > 0).length >= 2", 'nominee art loaded');
  await clickSelector(testId('launch'), 'Launch campaign');
  await waitFor(`[...document.querySelectorAll('[aria-label="Staff choices"] img')].filter((img) => img.naturalWidth === 96).length === 16`, 'sixteen staff portraits');
  await confirmTraditionalStaff();
  await waitFor(`[...document.querySelectorAll('[data-testid="action-bar"]')].length === 1`, 'campaign action bar');
  await waitFor(`document.querySelectorAll('button[data-testid^="action-"]').length === 6`, 'six campaign action cards');
  await checkLayout();
  assert.equal(await evaluate(`document.querySelector('[data-testid="ad-buys"]').disabled`), true, 'campaign starts with no map state selected');
  const opening = await campaign();
  const openingSave = await rawSave();
  await keyboardClick(testId('ground-game'));
  await waitFor(`document.querySelectorAll('[data-testid^="ground-game-state-"]').length === 51`, '51 ballot-accessible Ground Game states');
  await scrollPlanner();
  await keyboardClick(level('PA', 2));
  await waitFor(`document.querySelector(${JSON.stringify(level('PA', 2))}).getAttribute('aria-pressed') === 'true'`, 'keyboard selects Pennsylvania level two');
  await clickSelector(level('MI', 1));
  const priced = await planTotals();
  assert.deepEqual(priced, [2, 10.6, Math.round((opening.funds - 10.6) * 100) / 100, 1.7]);
  await clickSelector(testId('ground-game-close'));
  assert.equal(await rawSave(), openingSave, 'cancelling makes no save change');
  await clickSelector(testId('ground-game'));
  assert.equal((await planTotals())[0], 0, 'reopening starts with an empty plan');
  await clickSelector(testId('ground-game-close'));

  // Set the fixture to an exhausted weekly counter without advancing the calendar.
  await restore({ ...opening, actionsLeft: 0 });
  const savedBeforeGround = await rawSave();
  await keyboardClick(testId('ground-game'));
  await keyboardClick(level('PA', 2));
  await keyboardClick(level('MI', 1));
  assert.deepEqual(await planTotals(), priced);
  await keyboardClick(buy);
  await waitFor(`localStorage.getItem(${JSON.stringify(storageKey)}) !== ${JSON.stringify(savedBeforeGround)}`, 'batch purchase saved');
  const afterGround = await campaign();
  assert.equal(afterGround.ops?.PA, 2);
  assert.equal(afterGround.ops?.MI, 1);
  assert.equal(afterGround.funds, priced[2]);
  assert.equal(afterGround.actionsLeft, 0);
  assert.deepEqual(afterGround.incidentLedger.at(-1).payload.levels, { MI: 1, PA: 2 });
  assert.deepEqual(afterGround.staffActionReceipts.slice(-2).map(({ targetId }) => targetId).sort(), ['MI', 'PA']);
  assert.ok(afterGround.strategyProfile.stateActions.MI > 0 && afterGround.strategyProfile.stateActions.PA > 0);
  await waitFor(`!!document.querySelector(${JSON.stringify(planner)}) && document.querySelector(${JSON.stringify(buy)})?.disabled`, 'planner stays open and clears bought targets');
  const savedAfterGround = await rawSave();
  await evaluate(`document.querySelector(${JSON.stringify(buy)}).click()`);
  assert.equal(await rawSave(), savedAfterGround, 'repeat confirmation makes no second purchase');
  await clickSelector(testId('ground-game-close'));

  const beforePolling = await campaign();
  await clickSelector(testId('detailed-polling'), 'Detailed Polling entry');
  await choose(testId('state-poll-state'), 'PA');
  await waitFor(`!!document.querySelector(${JSON.stringify(testId('state-poll-report'))})`, 'Pennsylvania polling sample');
  const report = await evaluate(`(() => { const root = document.querySelector(${JSON.stringify(testId('state-poll-report'))}); return { text: root.innerText, results: [...root.querySelectorAll('[data-testid^="poll-result-"]')].map(x => x.innerText), state: document.querySelector(${JSON.stringify(testId('state-poll-state'))})?.value }; })()`);
  assert.equal(report.state, 'PA', 'poll selects Pennsylvania');
  assert.match(report.text, /Pennsylvania/i);
  assert.match(report.text, /Week 1/i);
  assert.match(report.text, /n = 600/i);
  assert.match(report.text, /Modeled insights/i);
  assert.ok(report.results.length >= 2, 'sample reports party estimates');
  for (const row of report.results) assert.match(row, /±\d+\.\d points · \d+ sampled/);
  const afterPolling = await campaign();
  assert.equal(afterPolling.funds, beforePolling.funds, 'Detailed Polling did not change funds');
  assert.equal(afterPolling.actionsLeft, beforePolling.actionsLeft, 'Detailed Polling spent no action');
  await clickSelector('button[aria-label="Close detailed polling"]', 'close Detailed Polling');

  await setViewport(1600, 900);
  await checkLayout();
  await restore(savedAfterGround);
  const resumed = await campaign();
  assert.equal(resumed.ops?.PA, 2);
  assert.equal(resumed.ops?.MI, 1);
  assert.equal(resumed.actionsLeft, 0);
  await keyboardClick(testId('ground-game'));
  await scrollPlanner();
  await keyboardClick(level('PA', 3));
  await keyboardClick(buy);
  await waitFor(`document.querySelector(${JSON.stringify(level('PA', 2))}).disabled`, 'maxed state disables lower levels');
  assert.equal((await campaign()).ops.PA, 3);
  await restore({ ...resumed, funds: 0.01 });
  await keyboardClick(testId('ground-game'));
  await keyboardClick(level('PA', 3));
  await waitFor(`document.querySelector(${JSON.stringify(planner)}).querySelector('[role="alert"]')?.textContent.includes('budget') && document.querySelector(${JSON.stringify(buy)}).disabled`, 'unaffordable batch cannot be submitted');
  assert.equal((await campaign()).ops.PA, 2);
  assert.equal((await campaign()).funds, 0.01);

  // Start a real limited-access Regional Parties ticket through setup.
  await evaluate('localStorage.removeItem(' + JSON.stringify(storageKey) + ')');
  await cdp('Page.reload');
  await clickSelector('summary', 'Advanced Options');
  await clickSelector('input[value="regional-parties"]', 'Regional Parties');
  await clickSelector(testId('party-farmer-labor'), 'Farmer–Labor ticket');
  await clickSelector(testId('launch'), 'Launch regional campaign');
  await confirmTraditionalStaff();
  await keyboardClick(testId('ground-game'));
  await waitFor(`!!document.querySelector(${JSON.stringify(planner)})`, 'regional planner');
  const region = await evaluate(`[...document.querySelectorAll('[data-testid^="ground-game-state-"]')].map((item) => item.dataset.testid.split('-').at(-1)).sort()`);
  assert.deepEqual(region, ['IA', 'MI', 'MN', 'ND', 'SD', 'WI']);
  await keyboardClick(level('MN', 1));
  await keyboardClick(level('WI', 1));
  await keyboardClick(buy);
  await waitFor(`document.querySelector(${JSON.stringify(level('MN', 0))})?.disabled`, 'regional purchase is reflected in planner');
  assert.equal((await campaign()).ops.MN, 1);
  assert.equal((await campaign()).ops.WI, 1);
  assert.deepEqual(errors, []);
  console.log('Packaged 0.1.2 passed offline launch, assets, all six actions and three menus, keyboard and scroll at both viewports, two-state zero-action purchase, exact quote, receipts, cancellation, repeat confirmation, max level, low funds, save/resume, free Detailed Polling, and six-state Farmer–Labor access.');
} finally {
  socket?.close();
  game.kill();
}
