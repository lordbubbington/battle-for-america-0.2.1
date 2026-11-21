import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { unzipSync } from 'node:zlib';

assert.ok(process.argv[2], 'Usage: node tests/build44/map-packaged.mjs <exe> [evidence-directory]');
const executable = path.resolve(process.argv[2]);
const report = path.resolve(process.argv[3] || '../workers/maps/packaged');
const profile = await mkdtemp(path.join(tmpdir(), 'bfa44-map-package-'));
const probe = createServer();
await new Promise((resolve, reject) => {
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', resolve);
});
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
await mkdir(report, { recursive: true });

const game = spawn(executable, [
  '--remote-debugging-port=' + port, '--remote-debugging-address=127.0.0.1',
  '--disable-background-networking', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows', '--user-data-dir=' + profile,
], { cwd: profile, windowsHide: true, stdio: 'ignore' });
let socket;

try {
  let launchError;
  game.once('error', (error) => { launchError = error; });
  let page;
  for (let attempt = 0; attempt < 180 && !page; attempt++) {
    if (launchError) throw launchError;
    if (game.exitCode != null) throw new Error('Packaged game exited with code ' + game.exitCode);
    try {
      const targets = await fetch('http://127.0.0.1:' + port + '/json/list').then((response) => response.json());
      page = targets.find((target) => target.type === 'page' && target.url.includes('/dist/index.html'));
    } catch {}
    if (!page) await delay(100);
  }
  assert.ok(page, 'Packaged renderer loaded');
  assert.match(page.url, /^file:/);
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (!pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  async function read(expression) {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  }
  async function waitFor(expression, label, timeout = 18000) {
    const end = Date.now() + timeout;
    do {
      const value = await read(expression);
      if (value) return value;
      await delay(100);
    } while (Date.now() < end);
    throw new Error(label + ' missing. ' + await read('document.body.innerText.slice(0, 1000)'));
  }
  const get = (selector) => `document.querySelector(${JSON.stringify(selector)})`;
  const press = (name, scope = 'document') => `[...${scope}.querySelectorAll('button')].find(button => !button.disabled && ${name}.test(button.textContent.trim()))`;
  const click = (node) => waitFor(`(() => { const el=${node}; if (!el) return false; el.dispatchEvent(new MouseEvent('click', {bubbles:true})); return true; })()`, node);
  const findMap = (name) => get('svg[aria-label="' + name + '"]');
  const presidential = findMap('Electoral map of the United States');
  const downballot = findMap('Downballot map of the United States');
  const legislature = findMap('Projected control of state legislatures');
  const quick = get('svg[aria-label$="state win frequency map"]');
  const evidence = {};

  async function frames(label, node, { select = false, count = false, district = false } = {}) {
    await waitFor(`!!${node}?.querySelector('[data-state-label="FL"]')`, label);
    if (select) {
      const state = `${node}.querySelector('path[role=button][aria-label^="Florida"]')`;
      if (await read(`!['2.8','3'].includes(${state}?.getAttribute('stroke-width'))`)) {
        await read(`${state}.focus({preventScroll:true})`);
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      }
      await waitFor(`['2.8','3'].includes(${state}?.getAttribute('stroke-width'))`, label + ' Florida selection');
    }
    if (district) {
      assert.ok(await read(`document.body.textContent.includes('Split votes') && !!${press(/^ME-2/)}`));
    }
    const measurements = [];
    for (const [size, width, height] of [['normal', 1440, 900], ['narrow', 960, 640]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, mobile: false, deviceScaleFactor: 1 });
      await read(`${node}.scrollIntoView({block:'center'})`);
      await delay(180);
      const data = await read(`(() => {
        const svg = ${node};
        const text = abbr => svg.querySelector('text[data-state-label="'+abbr+'"]');
        const xy = (abbr, axis) => Number(text(abbr)?.getAttribute(axis));
        const florida = [...svg.querySelectorAll('path > title')].find(el => /^Florida\\b/.test(el.textContent.trim())).parentElement;
        const bbox = svg.getBoundingClientRect();
        const ctx = document.createElement('canvas').getContext('2d');
        const glyphX = (abbr, index) => {
          const el = text(abbr), css = getComputedStyle(el);
          ctx.font = css.fontWeight + ' ' + css.fontSize + ' ' + css.fontFamily;
          const ink = ctx.measureText(el.textContent[index]);
          const x = el.getStartPositionOfChar(index).x;
          return [x - ink.actualBoundingBoxLeft, x + ink.actualBoundingBoxRight];
        };
        const c = glyphX('CA', 0), a = glyphX('AK', 0), k = glyphX('AK', 1);
        return { size: [innerWidth, innerHeight], labels: svg.querySelectorAll('text[data-state-label]').length,
          viewport: [bbox.left, bbox.top, bbox.right, bbox.bottom], documentWidth: document.documentElement.scrollWidth,
          anchors: [xy('CA','x'), xy('CA','y'), xy('AK','x'), xy('AK','y'), xy('LA','x'), xy('AR','x'), xy('LA','y'), xy('ID','x'), xy('ID','y'), xy('FL','x'), xy('SC','x'), xy('FL','y')],
          callouts: ['RI','CT','NJ','DE','MD','DC'].every(abbr=>text(abbr)?.parentElement.querySelector('path')),
          caCenter: (c[0]+c[1])/2, akGap: (a[1]+k[0])/2,
          flInk: text('FL').getAttribute('fill'), flFill: florida.getAttribute('fill'),
          flInside: florida.isPointInFill(new DOMPoint(xy('FL','x'),xy('FL','y'))),
          flTitle: florida.textContent.trim(), flStroke: florida.getAttribute('stroke-width'),
          markers: [...svg.querySelectorAll('g > circle + title')].map(el=>el.textContent),
          passThrough: getComputedStyle(text('FL')).pointerEvents === 'none' };
      })()`);
      assert.deepEqual(data.size, [width, height], label);
      assert.ok(data.documentWidth <= width + 1 && data.viewport[0] >= -1 && data.viewport[2] <= width + 1, label + ' fits window width');
      assert.equal(data.labels, 51, label);
      assert.deepEqual(data.anchors, [131, 217.3, 110.8, 530.9, 544.3, 544.3, 373.9, 249.5, 115.6, 713.6, 713.6, 417.1], label);
      assert.ok(Math.abs(data.caCenter - 131) <= 0.65 && Math.abs(data.akGap - 110.8) <= 0.65, label + ' CA and AK ink alignment');
      assert.ok(data.callouts && data.flInside && data.passThrough, label);
      if (count) assert.match(data.flTitle, /100% counted · called/, label);
      if (select) assert.ok(['2.8', '3'].includes(data.flStroke), label);
      assert.ok(!data.markers.some((name) => ['Indianapolis', 'Little Rock'].includes(name)), label);
      const file = label + '-' + size + '.png';
      const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(path.join(report, file), Buffer.from(screenshot.data, 'base64'));
      measurements.push({ file, ...data });
    }
    evidence[label] = measurements;
    await writeFile(path.join(report, 'measurements.json'), JSON.stringify({ executable, evidence }, null, 2) + '\n');
    console.log(label, 'verified at both sizes');
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await click(get('summary'));
  await frames('setup', presidential, { select: true });
  await click(press(/^50,000 quick outcomes$/));
  await waitFor(`!!${quick}?.querySelector('[data-state-label="FL"]')`, 'quick simulation map', 240000);
  const partyGroup = get('[aria-label="Map party"]');
  const activeParty = await read(`${partyGroup}.querySelector('[aria-pressed=true]').textContent.trim()`);
  await click(`${partyGroup}.querySelector('button[aria-pressed=false]')`);
  await waitFor(`${partyGroup}.querySelector('[aria-pressed=true]').textContent.trim() !== ${JSON.stringify(activeParty)}`, 'alternate party selected');
  await frames('quick', quick);
  await click(get('[aria-label="Close outcome report"]'));

  await click(get('[data-testid=launch]'));
  for (let i = 1; i <= 9; i++) await click(get(`[aria-label="Staff choices"] button:nth-child(${i})`));
  await click(press(/^Confirm inner circle$/));
  await waitFor(`!!${get('[data-testid=action-bar]')}`, 'campaign start');
  await frames('campaign-president', presidential, { select: true, district: true });
  for (const [label, name] of [['senate', /^Senate$/], ['house', /^House$/], ['governors', /^Governors$/]]) {
    await click(press(name));
    await frames('campaign-' + label, downballot, { select: true });
  }
  await click(press(/^State legislatures$/));
  await frames('campaign-legislature', legislature, { select: true });
  await click(press(/^Path to 270$/));
  await frames('campaign-path', presidential, { select: true });

  // The fresh campaign save supplies the finished-campaign fixture inside the
  // isolated profile. Jump to coverage without replaying the whole calendar.
  const key = 'election2028.save.v40';
  const packed = await read(`localStorage.getItem('${key}')`);
  assert.ok(packed);
  const save = JSON.parse(packed.startsWith('b35:z1:') ? unzipSync(Buffer.from(packed.slice(7), 'base64')).toString() : packed);
  save.finished = true;
  await read(`localStorage.setItem('${key}', ${JSON.stringify(JSON.stringify(save))})`);
  await send('Page.reload');
  await waitFor(`!!${get('[aria-label^="Election night phase"]')}`, 'Election Night');
  await frames('night-unreported', presidential, { select: true, district: true });
  await click(press(/^Skip to the end$/));
  await waitFor(`!!${press(/^See the full results$/)}`, 'finished Election Night');
  await frames('night-president', presidential, { select: true, count: true, district: true });
  await click(press(/^Senate$/));
  await frames('night-senate', downballot, { select: true });
  await click(press(/^See the full results$/));
  await frames('results-president', presidential);
  await click(press(/^Margin of victory$/));
  await frames('results-margin', presidential);
  await click(press(/^House$/));
  await frames('results-house', downballot);
  assert.deepEqual(errors, []);
} finally {
  socket?.close();
  game.kill();
}
