import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import os from 'node:os';
import path from 'node:path';
import { unzipSync } from 'node:zlib';

const executable = path.resolve(process.argv[2] || 'release-output/win-unpacked/Battle for America 2028.exe');
const profile = await mkdtemp(path.join(os.tmpdir(), 'bfa40-launch-'));
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
    throw new Error(label + ' missing: ' + await evaluate('document.body.innerText.slice(-1600)'));
  }
  async function click(label) {
    await waitFor("(() => { const button = [...document.querySelectorAll('button')].find((item) => !item.disabled && item.innerText.trim() === " + JSON.stringify(label) + "); if (!button) return false; button.click(); return true; })()", label);
  }
  await cdp('Runtime.enable');
  await waitFor("document.title.includes('Build 40')", 'Build 40 title');
  const testId = (id) => '[data-testid="' + id + '"]';
  async function clickSelector(selector, label = selector) {
    await waitFor(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!node || node.disabled) return false; if (typeof node.click === 'function') node.click(); else node.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; })()`, label);
  }
  const runToNight = process.env.BFA40_NIGHT === '1';
  await waitFor(`(() => { const item = [...document.querySelectorAll('summary')].find(x => x.innerText.trim().startsWith('Advanced Options')); if (!item) return false; item.click(); return true; })()`, 'Advanced Options');
  await clickSelector('input[value="four-parties"]', 'Four Parties mode');
  await clickSelector('input[value="two-parties"]', 'Two Parties mode');
  if (runToNight) {
    await waitFor(`(() => { const item = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Simulate election · all campaigns run by AI')); if (!item) return false; item.click(); return true; })()`, 'AI simulation');
  } else {
    await click('Ground Game');
    await clickSelector(testId('field-level-PA-1'), 'Pennsylvania opening field level');
    await click('Confirm Ground Game');
  }
  await clickSelector(testId('launch'), 'Launch');
  await waitFor(`[...document.querySelectorAll('[aria-label="Staff choices"] img')].filter((img) => img.naturalWidth === 96).length === 16`, 'sixteen setup portraits');
  await click('Randomize Staff');
  await click('Confirm inner circle');
  async function campaign() {
    const packed = await waitFor("localStorage.getItem('election2028.save.v40')", 'Build 40 campaign save');
    return JSON.parse(packed.startsWith('b35:z1:') ? unzipSync(Buffer.from(packed.slice(7), 'base64')).toString() : packed);
  }
  if (runToNight) {
    await waitFor(`!!document.querySelector('[aria-label^="Election night phase"]')`, 'Election Night', 2200);
    await clickSelector(testId('state-PA'));
    await waitFor("document.querySelector('#build40-race-title')?.innerText.includes('Presidential')", 'presidential state detail');
    await click('Skip to the end');
    await waitFor(`document.querySelector('#build40-race-title')?.closest('section').innerText.includes('counted')`, 'final count detail');
    await click('Senate');
    await waitFor("document.querySelector('#build40-race-title')?.innerText.includes('Senate')", 'Senate state detail');
    await click('Governors');
    await waitFor("document.querySelector('#build40-race-title')?.innerText.includes('Governor')", 'governor state detail');
    assert.equal((await campaign()).finished, true);
  } else {
    assert.equal((await campaign()).ops.PA, 1);
    await waitFor(`(() => { const item = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Commission a State Poll')); if (!item) return false; item.click(); return true; })()`, 'state poll action');
    await evaluate(`(() => { const select = document.querySelector('[data-testid="state-poll-state"]'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, 'PA'); select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await clickSelector(testId('commission-state-poll'));
    await waitFor(`!!document.querySelector('[data-testid="state-poll-report"]')`, 'reported sample');
    assert.equal(Object.values((await campaign()).statePollReceipts)[0].sampleSize, 600);
    await click('Close');
    await clickSelector(testId('advance'), 'close first week');
    await waitFor(`(() => { const choices = [...document.querySelectorAll('[data-testid="choice"]')]; const choice = choices.find(x => !x.disabled); if (!choice) return false; choice.click(); return true; })()`, 'resolve authored decision', 900);
    await waitFor(`document.body.innerText.includes('response has been filed') || document.body.innerText.includes('persuasion points') || document.body.innerText.includes('persuasion +')`, 'event outcome', 150);
    assert.ok((await campaign()).build40.decisionReceipts.length);
    await cdp('Page.reload');
    await waitFor(`!!document.querySelector('[data-testid="action-bar"]')`, 'resumed campaign');
    assert.equal((await campaign()).ops.PA, 1);
    assert.equal(Object.keys((await campaign()).statePollReceipts).length, 1);
    await click('Staff');
    await waitFor(`new Set([...document.images].filter((img) => img.src.includes('/art/staff/') && img.naturalWidth === 96).map((img) => img.src)).size === 10`, 'ten active staff portraits');
    await waitFor('window.__build37ForecastResults > 0', 'Nick Bronze worker result', 500);
    await click('President');
    await clickSelector(testId('state-PA'));
    await waitFor(`document.body.innerText.includes('Pennsylvania win chances')`, 'state-level Nick Bronze probabilities');
    await click('State legislatures');
    await waitFor(`!!document.querySelector('[aria-label="Projected control of state legislatures"]')`, 'state legislature map');
  }
  assert.deepEqual(errors, []);
  console.log(runToNight ? 'Packaged Build 40 ran to Election Night and showed all three state details.' : 'Packaged Build 40 launched offline, loaded staff art, and preserved the opening field plan, poll, and decision across reload.');
} finally {
  socket?.close();
  game.kill();
}

