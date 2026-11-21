import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { createServer as portProbe } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'node:zlib';
import { createServer as viteServer } from 'vite';
import { presentationCases } from './presentation.cases.mjs';

const { bridgeCases, cost, engine } = presentationCases();
const sandbox = await mkdtemp(join(tmpdir(), 'bfa44-event-browser-'));
const evidence = fileURLToPath(new URL('../../../workers/event-ui/', import.meta.url));
const packaged = process.argv[2] === '--packaged';
const imagePrefix = packaged ? 'packaged-' : '';
const executable = process.argv[2] ? resolve(process.argv[packaged ? 3 : 2])
  : 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const stage = '[data-testid="event-stage"]';
const choices = '[data-testid="choice"]';
const preview = '[data-testid="event-choice-presentation"]';
const outcome = '[data-testid="event-outcome-presentation"]';
const forbidden = /hidden|massive|coin flip|\+4(?:\b|\.)|\+5(?:\b|\.)|\+6(?:\b|\.)|\b(?:5|45|50|95)%/i;
let server;
let browser;
let socket;

try {
  const probe = portProbe();
  await new Promise((done, reject) => probe.once('error', reject).listen(0, '127.0.0.1', done));
  const { port } = probe.address();
  await new Promise((done, reject) => probe.close((error) => error ? reject(error) : done()));
  const flags = [
    '--remote-debugging-port=' + port, '--remote-debugging-address=127.0.0.1',
    '--user-data-dir=' + join(sandbox, 'profile'), '--disable-background-networking', '--no-first-run',
  ];
  if (!packaged) {
    server = await viteServer({
      cacheDir: join(sandbox, 'cache'), configLoader: 'runner', server: { host: '127.0.0.1', ws: false },
    });
    await server.listen(0);
    flags.push('--headless=new', '--disable-gpu', '--no-sandbox', server.resolvedUrls.local[0]);
  }
  browser = spawn(executable, flags, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let browserError;
  let diagnostics = '';
  browser.on('error', (error) => { browserError = error; });
  browser.stderr.on('data', (chunk) => { diagnostics = (diagnostics + chunk).slice(-2500); });

  async function waitFor(check, label) {
    for (let attempt = 0; attempt < 250; attempt++) {
      if (browserError) throw browserError;
      assert.equal(browser.exitCode, null, diagnostics || 'Test browser must stay open');
      const value = await check();
      if (value) return value;
      await delay(100);
    }
    throw new Error('Timed out waiting for ' + label + '\n' + diagnostics);
  }

  let targetDebug;
  const page = await waitFor(async () => {
    try {
      const list = await fetch('http://127.0.0.1:' + port + '/json/list').then((response) => response.json());
      targetDebug = JSON.stringify(list.map(({ type, url }) => [type, url]));
      return list.find(({ type, url }) => type === 'page' && (packaged ? url.startsWith('file:') : url.startsWith(server.resolvedUrls.local[0])));
    } catch (error) { targetDebug = String(error.cause || error); return null; }
  }, 'game page').catch((error) => {
    throw new Error(error.message + '\nTargets: ' + targetDebug, { cause: error });
  });
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((done, reject) => {
    socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const requests = new Map();
  const errors = [];
  let sequence = 0;
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    const pending = requests.get(message.id);
    if (pending) {
      requests.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.done(message.result);
    }
  });
  const cdp = (method, params = {}) => new Promise((done, reject) => {
    const id = ++sequence;
    requests.set(id, { done, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await cdp('Runtime.evaluate', { expression, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
    return result.value;
  };
  const state = async () => {
    const raw = await evaluate('localStorage.getItem(' + JSON.stringify(engine.STORAGE_KEY) + ')');
    return JSON.parse(raw.startsWith('b35:z1:') ? unzipSync(Buffer.from(raw.slice(7), 'base64')).toString() : raw);
  };
  const ready = (selector) => waitFor(async () => {
    try { return await evaluate('!!document.querySelector(' + JSON.stringify(selector) + ')'); }
    catch { return false; }
  }, selector);
  const save = async (game, selector) => {
    await evaluate('localStorage.setItem(' + JSON.stringify(engine.STORAGE_KEY) + ', ' + JSON.stringify(JSON.stringify(game)) + ')');
    await cdp('Page.reload');
    await ready(selector);
  };

  await cdp('Page.enable');
  await cdp('Runtime.enable');
  if (packaged) {
    await cdp('Network.enable');
    await cdp('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  }
  await mkdir(evidence, { recursive: true });
  const report = [];
  for (const test of bridgeCases) {
    const width = test.name === 'rare' ? 960 : 1440;
    const height = test.name === 'rare' ? 640 : 900;
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await save(test.save, stage + ' ' + choices);
    const card = await evaluate(`(() => {
      const card = document.querySelector('${stage}'), rect = card.getBoundingClientRect();
      const attrs = [...card.querySelectorAll('[title], [aria-label], [aria-description], [alt]')].flatMap(node =>
        ['title','aria-label','aria-description','alt'].map(attribute => node.getAttribute(attribute)).filter(Boolean));
      return { text: card.innerText, attrs, fits: rect.left >= 0 && rect.right <= innerWidth
        && [...card.querySelectorAll('${preview} > span')].every(node => node.scrollWidth <= node.clientWidth + 1),
        chips: [...card.querySelectorAll('${choices}')].map(choice => [...choice.querySelectorAll('${preview} > span')].map(node => node.textContent)) };
    })()`);
    assert.ok(card.fits, width + 'px card and chips fit');
    assert.deepEqual(card.chips, [[test.fixed], test.visible]);
    assert.doesNotMatch([card.text, ...card.attrs].join(' '), forbidden);
    const { nodes } = await cdp('Accessibility.getFullAXTree');
    const choiceName = nodes.find((node) => node.role?.value === 'button' && node.name?.value?.startsWith(test.label))?.name.value;
    assert.ok(choiceName, 'choice exposed as a named native button');
    assert.doesNotMatch(choiceName, forbidden);
    assert.ok(test.visible.every((text) => choiceName.includes(text)), choiceName);
    await evaluate(`document.querySelector('${stage}').scrollIntoView({block:'start'})`);
    await delay(250);
    const image = await cdp('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(evidence, `${imagePrefix}preview-${test.name}-${width}.png`), Buffer.from(image.data, 'base64'));

    await evaluate(`[...document.querySelectorAll('${stage} ${choices}:enabled')].find((button) =>
      button.textContent.includes(${JSON.stringify(test.label)})).click()`);
    await ready(outcome);
    const result = await evaluate(`document.querySelector('${outcome}').innerText`);
    assert.equal(result, test.actual);
    const played = await waitFor(async () => {
      const current = await state();
      return current.outcome?.choiceId === test.choiceId && current;
    }, 'saved choice');
    const receipts = played.build40.decisionReceipts.filter((receipt) => receipt.eventId === test.eventId);
    assert.equal(receipts.length, 1);
    assert.ok(Math.abs(played.stateMods[test.state] - (test.save.stateMods[test.state] || 0) - test.amount) < 1e-7);
    await cdp('Page.reload');
    await ready(outcome);
    assert.equal(await evaluate(`document.querySelector('${outcome}').innerText`), test.actual);
    assert.deepEqual((await state()).build40.decisionReceipts, played.build40.decisionReceipts);
    if (test.name === 'rare') {
      await evaluate(`document.querySelector('${stage}').scrollIntoView({block:'start'})`);
      await delay(250);
      const resultImage = await cdp('Page.captureScreenshot', { format: 'png' });
      await writeFile(join(evidence, `${imagePrefix}outcome-rare-${width}.png`), Buffer.from(resultImage.data, 'base64'));
    }
    report.push({ mode: packaged ? 'packaged' : 'source', name: test.name, viewport: [width, height], preview: card.chips,
      accessibleName: choiceName, result, receipts: receipts.length });
  }

  await save({ ...cost, funds: 1 }, stage + ' ' + choices);
  const disabledCost = await evaluate(`[...document.querySelectorAll('${stage} ${choices}:disabled')].map(node => node.innerText)`);
  assert.ok(disabledCost.some((text) => text.includes('Insufficient campaign funds.') && text.includes('Campaign cost: $1.6–$2.4M')));
  assert.deepEqual(errors, []);
  const output = { branches: report, disabledCost };
  await writeFile(join(evidence, 'browser-' + (packaged ? 'packaged' : 'source') + '.json'), JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify(output, null, 2));
} finally {
  socket?.close();
  browser?.kill();
  await server?.close();
}
