import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import os from 'node:os';
import path from 'node:path';
import { unzipSync } from 'node:zlib';

const executable = path.resolve(process.argv[2] || 'release-output/win-unpacked/Battle for America 2028.exe');
const profile = await mkdtemp(path.join(os.tmpdir(), 'bfa011-launch-'));
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

  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await setViewport(1280, 720);
  await waitFor("document.title.includes('0.1.1')", '0.1.1 application title');
  await waitFor("[...document.images].filter((img) => img.src.includes('/art/candidates/') && img.naturalWidth > 0).length >= 2", 'nominee art loaded');
  await clickSelector(testId('launch'), 'Launch campaign');
  await waitFor(`[...document.querySelectorAll('[aria-label="Staff choices"] img')].filter((img) => img.naturalWidth === 96).length === 16`, 'sixteen staff portraits');
  await click('Randomize Staff');
  await click('Confirm inner circle');
  await waitFor(`[...document.querySelectorAll('[data-testid="action-bar"]')].length === 1`, 'campaign action bar');
  await waitFor(`document.querySelectorAll('button[data-testid^="action-"]').length === 6`, 'six campaign action cards');
  const order = await evaluate(`(() => { const ad = document.querySelector('[data-testid="ad-buys"]'); return [ad, ad?.nextElementSibling, ad?.nextElementSibling?.nextElementSibling].map(node => node?.dataset.testid); })()`);
  assert.deepEqual(order, ['ad-buys', 'ground-game', 'detailed-polling'], 'ads, Ground Game, and Detailed Polling entries present');
  await waitFor(`document.querySelector('[data-testid="ad-buys"]')?.innerText.includes('Buy ads')`, 'ad buy menu');

  const beforeGround = await campaign();
  assert.equal(beforeGround.ops?.PA || 0, 0, 'new campaign has no purchased Pennsylvania field setup');
  const savedBeforeGround = await evaluate("localStorage.getItem('election2028.save.v40')");
  await clickSelector(testId('ground-game'), 'Ground Game entry');
  await choose(testId('ground-game-state'), 'PA');
  await waitFor(`!!document.querySelector(${JSON.stringify(testId('purchase-ground-game'))}) && !document.querySelector(${JSON.stringify(testId('purchase-ground-game'))}).disabled`, 'affordable Pennsylvania ground operation');
  await clickSelector(testId('purchase-ground-game'), 'purchase Pennsylvania ground level');
  await waitFor(`localStorage.getItem('election2028.save.v40') !== ${JSON.stringify(savedBeforeGround)}`, 'ground purchase saved');
  const afterGround = await campaign();
  assert.equal(afterGround.ops?.PA, 1, 'Pennsylvania field operation reached level one');
  assert.ok(afterGround.funds < beforeGround.funds, 'ground purchase reduced campaign funds');
  assert.equal(afterGround.actionsLeft, beforeGround.actionsLeft, 'ground purchase spent no action');

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
  const layout = await evaluate(`(() => { const bar = document.querySelector(${JSON.stringify(testId('action-bar'))}); const cards = [...document.querySelectorAll('button[data-testid^="action-"]')]; const menu = ['ad-buys', 'ground-game', 'detailed-polling'].map(id => document.querySelector('[data-testid="'+id+'"]')); return { bar: !!bar, cards: cards.length, menuVisible: menu.every(node => { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right <= innerWidth + 1; }) }; })()`);
  assert.deepEqual(layout, { bar: true, cards: 6, menuVisible: true }, 'main campaign actions fit the larger viewport');
  await cdp('Page.reload');
  await waitFor(`!!document.querySelector(${JSON.stringify(testId('action-bar'))})`, 'campaign resumed after reload');
  const resumed = await campaign();
  assert.equal(resumed.ops?.PA, 1, 'Pennsylvania field level survived resume');
  assert.equal(resumed.actionsLeft, beforePolling.actionsLeft, 'campaign action count survived resume');
  const rawResume = await evaluate("localStorage.getItem('election2028.save.v40')");
  await clickSelector(testId('advance'), 'advance first week');
  await waitFor(`localStorage.getItem('election2028.save.v40') !== ${JSON.stringify(rawResume)}`, 'advanced campaign save');
  assert.equal((await campaign()).week, resumed.week + 1, 'the rival turn completes and the campaign advances');
  assert.deepEqual(errors, []);
  console.log('Packaged 0.1.1 launched offline, loaded nominee and staff art, showed the six action cards plus ads/ground/polling, purchased PA field level without spending an action, opened free polling, fit both viewports, and resumed the saved campaign.');
} finally {
  socket?.close();
  game.kill();
}
