import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const report = path.resolve(process.argv[2] || path.join(root, '..', 'workers', 'maps', 'visual'));
const edge = process.argv[3] || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const temporary = await mkdtemp(path.join(tmpdir(), 'bfa44-map-check-'));
const output = path.join(temporary, 'fixture');
const fixturePath = '/tests/build44/map-fixture.html';
const svgSelector = 'svg:has([data-state-label="FL"])';
const sizes = [[1440, 900], [960, 640]];
const viewports = ['normal', 'narrow'];
const hashes = {
  states: '091cfb3343787034f1e77b528fd6e5332e759616825bb7c9586fc440c214a2f2',
  cities: '329a8e0e3da6a84f2b747e37414841bdc2385ca360774b8f1be11a7e9891839d',
};
const mimeTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

await mkdir(report, { recursive: true });
await build({
  root,
  configLoader: 'native',
  configFile: path.join(root, 'vite.config.js'),
  publicDir: false,
  build: { outDir: output, rollupOptions: { input: path.join(root, fixturePath.slice(1)) } },
});

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const name = decodeURIComponent(url.pathname).slice(1);
  for (const directory of [output, path.join(root, 'public')]) {
    const file = path.resolve(directory, name);
    if (!file.startsWith(directory + path.sep)) break;
    try {
      const data = await readFile(file);
      response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(file)] || 'application/octet-stream' });
      response.end(data);
      return;
    } catch (error) {
      if (!['ENOENT', 'EISDIR'].includes(error.code)) throw error;
    }
  }
  response.writeHead(404).end();
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = spawn(edge, [
  '--headless=new', '--no-sandbox', '--no-first-run', '--disable-gpu', '--disable-background-networking',
  '--user-data-dir=' + path.join(temporary, 'profile'), '--remote-debugging-port=0', origin + fixturePath,
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let socket;

try {
  const debugUrl = await new Promise((resolve, reject) => {
    let log = '';
    browser.once('error', reject);
    browser.once('exit', (code) => reject(new Error(`Edge exited with code ${code}\n${log}`)));
    browser.stderr.on('data', (chunk) => {
      log += chunk;
      const match = log.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) resolve(match[1]);
    });
  });
  const debug = new URL(debugUrl);
  const pages = await fetch('http://' + debug.host + '/json/list').then((response) => response.json());
  const page = pages.find(({ type }) => type === 'page');
  assert.ok(page, 'Browser page loaded');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener('message', ({ data }) => {
    const response = JSON.parse(data);
    if (response.method === 'Runtime.exceptionThrown') errors.push(response.params.exceptionDetails.text);
    if (!pending.has(response.id)) return;
    const { resolve, reject } = pending.get(response.id);
    pending.delete(response.id);
    if (response.error) reject(new Error(response.error.message));
    else resolve(response.result);
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
  async function waitFor(expression) {
    for (let retry = 0; retry < 80; retry++) {
      const value = await read(expression);
      if (value) return value;
      await delay(100);
    }
    throw new Error('Missing UI: ' + expression);
  }
  const map = `document.querySelector(${JSON.stringify(svgSelector)})`;
  const state = (abbr) => `[...${map}.querySelectorAll('path[d]')].find(path => path.getAttribute('d') === window.mapFixture.states[${JSON.stringify(abbr)}].d)`;
  const button = (regex) => `[...document.querySelectorAll('button')].find(button => ${regex}.test(button.textContent.trim()))`;
  const selected = (abbr) => `${state(abbr)}?.getAttribute('stroke-width')`;
  const near = (actual, expected, limit, context) =>
    assert.ok(Math.abs(actual - expected) <= limit, `${context}: ${actual} vs ${expected}, tolerance ${limit}`);

  function inspect() {
    const svg = document.querySelector('svg:has([data-state-label="FL"])');
    const data = window.mapFixture;
    const canvas = document.createElement('canvas').getContext('2d');
    const path = (abbr) => [...svg.querySelectorAll('path[d]')].find((node) => node.getAttribute('d') === data.states[abbr].d);
    const text = (abbr) => svg.querySelector(`text[data-state-label="${abbr}"]`);
    function metrics(abbr, index) {
      const el = text(abbr);
      const start = el.getStartPositionOfChar(index);
      const style = getComputedStyle(el);
      canvas.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const ink = canvas.measureText(el.textContent[index]);
      const baselineProbe = el.cloneNode(true);
      baselineProbe.setAttribute('dominant-baseline', 'alphabetic');
      baselineProbe.setAttribute('visibility', 'hidden');
      el.after(baselineProbe);
      const baseline = start.y + el.getBBox().y - baselineProbe.getBBox().y;
      baselineProbe.remove();
      return { left: start.x - ink.actualBoundingBoxLeft, right: start.x + ink.actualBoundingBoxRight,
        top: baseline - ink.actualBoundingBoxAscent, bottom: baseline + ink.actualBoundingBoxDescent };
    }
    const centerX = ({ left, right }) => (left + right) / 2;
    const centerY = ({ top, bottom }) => (top + bottom) / 2;
    const c = metrics('CA', 0), a = metrics('AK', 0), k = metrics('AK', 1), f = metrics('FL', 0);
    const florida = text('FL');
    const fx = Number(florida.getAttribute('x')), fy = Number(florida.getAttribute('y'));
    const p = new DOMPoint(fx, fy).matrixTransform(svg.getScreenCTM());
    const flOnTop = document.elementFromPoint(p.x, p.y) === path('FL');
    const position = (abbr, axis) => Number(text(abbr).getAttribute(axis));
    const bounds = svg.getBoundingClientRect();
    const labelBox = (abbr) => {
      const { x, y, width, height } = text(abbr).getBBox();
      return { x, y, width, height };
    };
    const title = (abbr) => path(abbr).querySelector('title').textContent.trim();
    const inShape = (abbr) => path(abbr).isPointInFill(new DOMPoint(position(abbr, 'x'), position(abbr, 'y')));
    const callouts = {};
    for (const abbr of ['RI', 'CT', 'NJ', 'DE', 'MD', 'DC']) {
      const leader = text(abbr).parentElement.querySelector('path');
      const start = leader.getPointAtLength(0);
      const statePath = path(abbr) || svg.querySelector('circle:has(title)');
      callouts[abbr] = {
        x: position(abbr, 'x'), y: position(abbr, 'y'), width: labelBox(abbr).width,
        anchored: statePath.isPointInFill(start), pointer: getComputedStyle(leader).pointerEvents,
      };
    }
    return {
      viewportWidth: innerWidth, viewportHeight: innerHeight, documentWidth: document.documentElement.scrollWidth,
      mapBox: bounds.toJSON(), labels: svg.querySelectorAll('text[data-state-label]').length,
      caGlyphX: centerX(c), caY: position('CA', 'y'), akGap: (a.right + k.left) / 2, akY: centerY(a),
      akShape: inShape('AK'), hiShape: inShape('HI'), akBox: labelBox('AK'), hiBox: labelBox('HI'),
      laX: position('LA', 'x'), laY: position('LA', 'y'), arX: position('AR', 'x'),
      idX: position('ID', 'x'), idY: position('ID', 'y'), scX: position('SC', 'x'), flX: fx, flY: fy,
      flFill: path('FL').getAttribute('fill'), flInk: florida.getAttribute('fill'),
      flOnTop, floridaLeft: f.left, flShape: inShape('FL'), flTitle: title('FL'), flPoint: { x: p.x, y: p.y },
      markers: [...svg.querySelectorAll('g > circle + title')].map((node) => node.textContent),
      labelPointer: getComputedStyle(florida).pointerEvents, callouts,
    };
  }

  await send('Runtime.enable');
  await send('Page.enable');
  const evidence = [];
  for (const [index, [width, height]] of sizes.entries()) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    for (const variant of ['president', 'downballot', 'legislature', 'quick', 'night', 'path', 'tuner']) {
      const fills = ['president', 'downballot', 'legislature', 'quick'].includes(variant) ? ['light', 'dark'] : ['light'];
      for (const fill of fills) {
        const url = `${origin}${fixturePath}?map=${variant}&fill=${fill}`;
        await send('Page.navigate', { url });
        await waitFor(`location.href === ${JSON.stringify(url)} && !!${map}`);
        if (variant === 'quick' && fill === 'light') {
          await read(`${button(/Libertarians/)}.click()`);
          await waitFor(`${map}.getAttribute('aria-label').startsWith('Libertarians')`);
        }
        await read(`${map}.scrollIntoView({ block: 'center' })`);
        const data = await read(`(${inspect})()`);
        const context = `${variant} ${fill} ${width}x${height}`;
        if (evidence.length === 0) {
          for (const [key, expected] of Object.entries(hashes)) {
            const json = await read(`JSON.stringify(window.mapFixture.${key})`);
            assert.equal(createHash('sha256').update(json).digest('hex'), expected, `Build 43 ${key} unchanged`);
          }
        }
        assert.deepEqual([data.viewportWidth, data.viewportHeight], [width, height]);
        assert.ok(data.documentWidth <= width + 1 && data.mapBox.top >= -1 && data.mapBox.bottom <= height + 1, context + ' full map visible');
        assert.equal(data.labels, 51, context + ' one label per state and DC');
        near(data.caGlyphX, 131, 0.65, context + ' CA glyph');
        near(data.akGap, 110.8, 0.65, context + ' AK gap');
        near(data.akY, 530.9, 1.7, context + ' AK row');
        assert.deepEqual([data.caY, data.laX, data.arX, data.laY, data.idX, data.idY, data.flX, data.scX, data.flY],
          [217.3, 544.3, 544.3, 373.9, 249.5, 115.6, 713.6, 713.6, 417.1], context + ' anchor coordinates');
        assert.ok(data.akShape && data.hiShape && data.flShape, context + ' labels stay in projected shapes');
        assert.ok(data.akBox.y + data.akBox.height < 549.1 - 1.7, context + ' both AK glyphs clear Anchorage');
        assert.ok(data.floridaLeft > 707.4, context + ' Florida text east of Tampa');
        assert.ok(data.flOnTop && data.labelPointer === 'none', context + ' position remains clickable');
        assert.match(data.flTitle, /^Florida\b/, context);
        for (const [abbr, callout] of Object.entries(data.callouts)) {
          assert.ok(callout.anchored, `${context} ${abbr} leader starts in shape`);
          assert.equal(callout.pointer, 'none');
          assert.ok(callout.x + callout.width <= 960, `${context} ${abbr} callout inside viewport`);
        }
        assert.ok(!data.markers.includes('Indianapolis') && !data.markers.includes('Little Rock'), context);
        if (['president', 'night', 'path', 'tuner'].includes(variant)) {
          assert.equal(data.markers.length, 52);
          assert.ok(data.markers.includes('Anchorage') && data.markers.includes('Honolulu') && data.markers.includes('Tampa'));
        }
        if (fills.length === 2) {
          assert.equal(data.flInk, fill === 'light' ? '#0B1530' : '#FFFFFF', context + ' FL contrast');
        }

        if (variant === 'quick') {
          const party = fill === 'light' ? /Libertarians/ : /Democrats/;
          assert.equal(await read(`${button(party)}.getAttribute('aria-pressed')`), 'true');
          assert.match(data.flTitle, fill === 'light' ? /100\.0% Libertarians/ : /0\.0% Democrats/);
          assert.equal(await read(`${state('FL')}.hasAttribute('tabindex')`), false);
        } else {
          if (variant === 'president') {
            await read(`${button(/^ME-2/)}.click()`);
            await waitFor(`${selected('ME')} === '2.8'`);
            assert.match(await read(`${button(/^ME-2/)}.style.border`), /^2px solid/);
          }
          await read(`${state('CA')}.focus({ preventScroll: true })`);
          await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
          await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
          const selectedWidth = variant === 'legislature' ? '3' : '2.8';
          await waitFor(`${selected('CA')} === '${selectedWidth}'`);
          const point = { ...data.flPoint, button: 'left', clickCount: 1 };
          await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point });
          await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point });
          await waitFor(`${selected('FL')} === '${selectedWidth}'`);
          if (variant === 'legislature') assert.equal(await read(`${state('FL')}.getAttribute('aria-pressed')`), 'true');
          if (variant === 'tuner') assert.ok(await read(`!!document.querySelector('[aria-label="Florida nudge"]')`));
          if (variant === 'downballot') {
            assert.ok(await read(`[...${map}.querySelectorAll('path')].some(path => path.getAttribute('stroke-width') === '2.2' && path.getAttribute('d') === window.mapFixture.states.AZ.d)`));
          }
          if (variant === 'night') {
            assert.match(data.flTitle, /100% counted · called/);
            assert.match(await read(`${state('NV')}.textContent.trim()`), /too early to call/);
            assert.match(await read(`${state('PA')}.textContent.trim()`), /12% counted · counting/);
            assert.equal(await read(`${state('PA')}.getAttribute('fill-opacity')`), '0.47200000000000003');
          }
          if (variant === 'path') {
            await read(`${button(/^Lean$/)}.click()`);
            await waitFor(`/Lean Democrat · Manual/i.test(document.body.textContent)`);
          }
        }
        await read(`${map}.scrollIntoView({ block: 'center' })`);
        await delay(180);
        const file = `${variant}-${fill}-${viewports[index]}.png`;
        const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        await writeFile(path.join(report, file), Buffer.from(screenshot.data, 'base64'));
        evidence.push({ variant, fill, file, ...data });
        console.log(context, 'verified');
      }
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(path.join(report, 'measurements.json'), JSON.stringify({ hashes, evidence }, null, 2) + '\n');
} finally {
  socket?.close();
  browser.kill();
  server.closeAllConnections();
  server.close();
}
