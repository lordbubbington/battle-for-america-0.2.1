import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'node:zlib';

const executable = path.resolve(process.argv[2] || 'release-output/win-unpacked/Battle for America 2028.exe');
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDir = path.resolve(projectRoot, '..', 'evidence', 'v0.2.1-package-smoke');
mkdirSync(evidenceDir, { recursive: true });
const profile = mkdtempSync(path.join(os.tmpdir(), 'bfa-021-difficulty-'));
const portProbe = createServer();
await new Promise((resolve, reject) => {
  portProbe.once('error', reject);
  portProbe.listen(0, '127.0.0.1', resolve);
});
const debugPort = portProbe.address().port;
await new Promise((resolve) => portProbe.close(resolve));
const app = spawn(executable, [
  '--remote-debugging-port=' + debugPort,
  '--remote-debugging-address=127.0.0.1',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--user-data-dir=' + profile,
], { cwd: profile, windowsHide: true, stdio: 'ignore' });

let socket;
let closeBrowser;
try {
  let launchError;
  app.once('error', (error) => { launchError = error; });
  let page;
  for (let i = 0; i < 180 && !page; i++) {
    if (launchError) throw launchError;
    if (app.exitCode != null) throw new Error(`Packaged game exited early with code ${app.exitCode}`);
    try {
      const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((response) => response.json());
      page = targets.find((target) => target.type === 'page' && target.url.includes('/dist/index.html'));
    } catch {}
    if (!page) await delay(100);
  }
  assert.ok(page, 'packaged app loaded its local index.html');
  assert.match(page.url, /^file:/);
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  const pending = new Map();
  const rendererErrors = [];
  let sequence = 0;
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') rendererErrors.push(message.params.exceptionDetails.text);
  });
  function cdp(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  closeBrowser = async () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const closed = new Promise((resolve) => socket.addEventListener('close', resolve, { once: true }));
    try { await Promise.race([cdp('Browser.close'), closed, delay(2000)]); } catch {}
    await Promise.race([closed, delay(500)]);
  };
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
    const state = await evaluate('({ title: document.title, readyState: document.readyState, body: document.body?.innerText?.slice(-1600) ?? null })');
    throw new Error(`${label} missing: ${JSON.stringify(state)}`);
  }
  async function click(selector, label = selector) {
    await waitFor(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element || element.disabled) return false; element.click(); return true; })()`, label);
  }
  async function clickText(text, label = text) {
    const expression = `(() => { const element = [...document.querySelectorAll('button')].find((button) => button.innerText.trim() === ${JSON.stringify(text)}); if (!element || element.disabled) return false; element.click(); return true; })()`;
    await waitFor(expression, label);
  }
  async function clickDifficulty(label) {
    const expression = `(() => { const section = document.querySelector('[aria-label="Difficulty and starting map"]'); const button = [...section.querySelectorAll('button')].find((element) => element.querySelector('p')?.textContent.trim() === ${JSON.stringify(label)}); if (!button) return false; button.click(); return true; })()`;
    await waitFor(expression, `difficulty ${label}`);
    await delay(50);
  }
  async function selectMode(modeId) {
    await waitFor(`(() => { const details = document.querySelector('details'); if (!details) return false; if (!details.open) details.querySelector('summary').click(); return details.open; })()`, 'open Advanced Options');
    const expression = `(() => { const input = document.querySelector('input[name="build40-election-mode"][value="${modeId}"]'); if (!input) return false; input.click(); return input.checked; })()`;
    await waitFor(expression, `presidential mode ${modeId}`);
    await delay(100);
  }
  const nationalInput = `(() => [...document.querySelectorAll('[aria-label="Difficulty and starting map"] input[type="range"]')].find((input) => input.closest('.panel-lite')?.querySelector('.label-xs')?.textContent.trim() === 'National generic ballot'))()`;
  const stateInput = `document.querySelector('[aria-label$=" nudge"]')`;
  const storageKey = 'election2028.save.v40';
  const setupSelector = '[aria-label="Difficulty and starting map"]';
  const staffSelector = '[aria-label="Staff choices"]';
  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Network.enable');
  await cdp('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await waitFor('document.title.includes("0.2.1")', '0.2.1 application title');
  await waitFor(`!!document.querySelector(${JSON.stringify(setupSelector)})`, 'visible setup controls');
  assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(storageKey)})`), null, 'isolated profile starts without a saved campaign');

  const report = { version: '0.2.1', offline: true, executable, setup: {}, difficulty: {}, turnout: {}, freshResume: {} };
  for (const [width, height, label] of [[1440, 900, 'wide'], [960, 640, 'narrow']]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    const layout = await evaluate(`(() => {
      document.documentElement.scrollTop = 0;
      const section = document.querySelector('[aria-label="Difficulty and starting map"]');
      const party = document.querySelector('[data-testid="party-dem"]');
      return {
        width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth,
        visibleAtTop: section.getBoundingClientRect().top < innerHeight,
        beforeParty: !!(section.compareDocumentPosition(party) & Node.DOCUMENT_POSITION_FOLLOWING),
        detailsClosed: [...document.querySelectorAll('details')].every((element) => !element.open),
        titles: [...section.querySelectorAll('h2')].map((element) => element.innerText),
        gridColumns: getComputedStyle(section).gridTemplateColumns.split(' ').length,
        slider: (() => { const input = ${nationalInput}; return { min: input.min, max: input.max, value: input.value, left: input.closest('.panel-lite').querySelector('.text-slate-500')?.textContent }; })(),
      };
    })()`);
    assert.equal(layout.width, width);
    assert.equal(layout.height, height);
    assert.ok(layout.documentWidth <= width + 1, `${label} layout has no horizontal overflow`);
    assert.ok(layout.visibleAtTop, `${label} setup controls are present at the top of the page`);
    assert.ok(layout.beforeParty, `${label} difficulty/map controls precede party selection`);
    assert.equal(layout.detailsClosed, true, `${label} controls do not depend on opening Advanced Options`);
    assert.deepEqual(layout.titles, ['How difficult should this be?', 'Set the starting map']);
    assert.equal(layout.slider.min, '-25');
    assert.equal(layout.slider.max, '25');
    const screenshot = await cdp('Page.captureScreenshot', { format: 'png' });
    writeFileSync(path.join(evidenceDir, `setup-${label}.png`), Buffer.from(screenshot.data, 'base64'));
    report.setup[label] = layout;
  }

  async function selectedNational() { return evaluate(`(() => { const input = ${nationalInput}; return { min: input.min, max: input.max, value: Number(input.value) }; })()`); }
  async function keyOn(expression, key) {
    await evaluate(`(() => { const element = ${expression}; if (!element || element.disabled) throw new Error('Control is missing or disabled'); element.focus(); return true; })()`);
    const code = key === 'ArrowRight' ? 'ArrowRight' : key;
    const keyCode = key === 'ArrowRight' ? 39 : key === 'End' ? 35 : key === 'Home' ? 36 : undefined;
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode });
  }
  async function stepSlider(expression, key, count = 1) {
    for (let i = 0; i < count; i++) await keyOn(expression, key);
    await delay(40);
  }

  await selectMode('four-parties');
  await click('[data-testid="party-lib"]', 'third-party national environment setup');
  const thirdPartyRange = await selectedNational();
  assert.equal(thirdPartyRange.min, '-15', 'third-party national slider preserves its existing -15 lower bound');
  assert.equal(thirdPartyRange.max, '25', 'third-party national slider preserves its existing +25 upper bound');
  await stepSlider(nationalInput, 'Home');
  assert.equal((await selectedNational()).value, -15, 'third-party range does not expand to -25');
  await stepSlider(nationalInput, 'End');
  assert.equal((await selectedNational()).value, 25, 'third-party upper bound remains +25');
  report.setup.thirdPartyRange = { min: -15, max: 25, low: -15, high: 25 };

  await click('[data-testid="party-dem"]', 'Democratic party setup');
  await selectMode('two-parties');
  await clickDifficulty('Cupcake');
  await stepSlider(nationalInput, 'End');
  assert.equal((await selectedNational()).value, 25, 'Cupcake reaches Democratic-favored +25');
  await stepSlider(nationalInput, 'Home');
  assert.equal((await selectedNational()).value, -25, 'Cupcake reaches Republican-favored -25');
  await click('[data-testid="party-rep"]', 'Republican party setup');
  await stepSlider(nationalInput, 'End');
  assert.equal((await selectedNational()).value, 25, 'Republican orientation reaches Democratic-favored +25');
  await stepSlider(nationalInput, 'Home');
  assert.equal((await selectedNational()).value, -25, 'Republican orientation reaches Republican-favored -25');
  await clickDifficulty('Normal');
  assert.equal((await selectedNational()).value, 0, 'Normal resets the national environment to neutral');
  await click('[data-testid="party-dem"]', 'reset Democratic orientation');
  await clickDifficulty('Easy');
  await stepSlider(nationalInput, 'End');
  assert.equal((await selectedNational()).value, 7, 'Democratic favorable endpoint is clamped to the Easy +7 cap');
  await click('[data-testid="party-rep"]', 'reset Republican orientation');
  await stepSlider(nationalInput, 'Home');
  assert.equal((await selectedNational()).value, -7, 'Republican favorable endpoint is clamped to the Easy +7 cap');
  const easyRepSlider = await selectedNational();
  report.difficulty.national = { cupcakeDem: [-25, 25], cupcakeRep: [-25, 25], normal: 0, easyDemFavorableCap: 7, easyRepFavorableCap: -7, fixedBounds: [easyRepSlider.min, easyRepSlider.max] };

  await click('[data-testid="party-dem"]', 'select Democratic party for state edit test');
  await clickDifficulty('Easy');
  await waitFor(`!(${stateInput}).disabled`, 'Easy state adjustment enabled');
  await stepSlider(stateInput, 'ArrowRight', 5);
  const easyNudge = await evaluate(`Number((${stateInput}).value)`);
  assert.equal(easyNudge, 2.5, 'Easy state nudge accepts a manual edit');
  await clickDifficulty('Normal');
  const restricted = await evaluate(`(() => { const input = ${stateInput}; return { disabled: input.disabled, value: Number(input.value), resetVisible: [...input.parentElement.parentElement.querySelectorAll('button')].some((button) => button.innerText.trim() === 'Reset'), note: document.body.innerText.includes('State-by-state adjustments are limited to Cupcake and Easy.') }; })()`);
  assert.deepEqual(restricted, { disabled: true, value: 0, resetVisible: false, note: true }, 'Normal clears the Easy edit and makes the state map read-only');
  const randomnessEnabled = await evaluate(`!([...document.querySelectorAll('[aria-label="Difficulty and starting map"] input[type="range"]')].find((input) => input.closest('.panel-lite')?.querySelector('.label-xs')?.textContent.trim() === 'Randomness')).disabled`);
  assert.equal(randomnessEnabled, true, 'map randomness remains available');
  await clickDifficulty('Cupcake');
  await waitFor(`!(${stateInput}).disabled`, 'Cupcake state adjustment enabled');
  await stepSlider(stateInput, 'ArrowRight');
  assert.equal(await evaluate(`Number((${stateInput}).value)`), 0.5, 'Cupcake accepts state edits');
  await clickDifficulty('Easy');
  await waitFor(`!(${stateInput}).disabled`, 'Easy state adjustment remains enabled');
  await stepSlider(stateInput, 'ArrowRight');
  assert.equal(await evaluate(`Number((${stateInput}).value)`), 1, 'Easy accepts state edits after Cupcake');
  report.difficulty.stateEdits = { easyEditBeforeSwitch: easyNudge, normalAfterSwitch: restricted, randomnessEnabled, cupcakeEdit: 0.5, easyEdit: 1 };

  await click('[data-testid="party-dem"]', 'choose Democratic ticket for fresh campaign');
  await clickDifficulty('Normal');
  await clickDifficulty('Easy');
  await stepSlider(stateInput, 'ArrowRight', 5);
  const display = await evaluate(`(() => {
    const section = document.querySelector('[aria-label="Difficulty and starting map"]');
    const line = [...section.querySelectorAll('p')].find((element) => element.innerText.includes('starting lean'));
    const readout = line?.querySelector('span')?.innerText || '';
    const match = /^([DR])\\+([0-9.]+)$/.exec(readout);
    if (!match) return null;
    return (match[1] === 'D' ? 1 : -1) * Number(match[2]);
  })()`);
  assert.ok(Number.isFinite(display), 'setup displays the edited Pennsylvania lean');
  await click('[data-testid="launch"]', 'launch fresh campaign');
  await waitFor(`!!document.querySelector(${JSON.stringify(staffSelector)})`, 'new campaign staff selection');
  await waitFor(`[...document.querySelectorAll('[aria-label="Staff choices"] img')].some((image) => image.complete && image.naturalWidth > 0)`, 'staff art loaded');
  for (let i = 0; i < 3; i++) await click(`[aria-label="Staff choices"] button:nth-child(${i + 1})`, `staff pick ${i + 1}`);
  await clickText('Confirm inner circle');
  await waitFor('!!document.querySelector("[data-testid=action-bar]")', 'fresh campaign action screen');
  let campaign = await waitFor(`localStorage.getItem(${JSON.stringify(storageKey)})`, 'saved fresh campaign');
  const decodeCampaign = (packed) => JSON.parse(packed.startsWith('b35:z1:')
    ? unzipSync(Buffer.from(packed.slice(7), 'base64')).toString()
    : packed);
  campaign = decodeCampaign(campaign);
  assert.equal(campaign.week, 0, 'fresh campaign starts at week zero');
  assert.equal(campaign.difficultyId, 'easy');
  assert.ok(Math.abs(campaign.leans.PA - display) <= 0.05, 'allowed state edit is saved within the displayed one-decimal precision');
  await cdp('Page.reload');
  await waitFor('!!document.querySelector("[data-testid=action-bar]")', 'resumed campaign');
  const resumedPacked = await waitFor(`localStorage.getItem(${JSON.stringify(storageKey)})`, 'persisted resumed campaign');
  const resumed = decodeCampaign(resumedPacked);
  assert.equal(resumed.week, 0);
  assert.equal(resumed.difficultyId, 'easy');
  assert.ok(Math.abs(resumed.leans.PA - display) <= 0.05, 'resumed lean matches the setup display precision');
  assert.deepEqual(rendererErrors, []);
  report.freshResume = { started: true, resumed: true, week: resumed.week, difficultyId: resumed.difficultyId, paLean: resumed.leans.PA, expectedPaLean: display, loadedArt: true };
  report.rendererErrors = rendererErrors;
  writeFileSync(path.join(evidenceDir, 'results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  try { await closeBrowser?.(); } catch {}
  socket?.close();
  app.kill();
  if (app.exitCode == null) {
    await Promise.race([new Promise((resolve) => app.once('exit', resolve)), delay(2000)]);
  }
}
process.exit(0);
