import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import os from 'node:os';
import path from 'node:path';
import { unzipSync } from 'node:zlib';

const executable = path.resolve(process.argv[2] || 'release-output/win-unpacked/Battle for America 2028.exe');
const profile = await mkdtemp(path.join(os.tmpdir(), 'bfa38-launch-'));
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
  await waitFor("document.title.includes('Build 38')", 'Build 38 title');
  await evaluate(`(() => {
    const NativeWorker = window.Worker;
    window.__build37ForecastResults = 0;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        this.addEventListener('message', (event) => {
          if (event.data?.type === 'forecast-result') window.__build37ForecastResults++;
        });
      }
    };
  })()`);
  await waitFor("!!document.querySelector('select option[value=mandatory-turnout]')", 'Build 38 voting rule selector');
  const adFixture = process.env.BFA38_AD_FIXTURE;
  if (adFixture) {
    const save = await readFile(adFixture, 'utf8');
    await evaluate(`localStorage.setItem('election2028.save.v38', ${JSON.stringify(save)})`);
    await cdp('Page.reload');
    await waitFor(`document.body.innerText.includes('The Ad That Moved the Number')`, 'Ad Works card');
    await waitFor(`(() => { const options = [...document.querySelectorAll('[data-testid="choice"]')]; if (options.length !== 3 || !options[1].innerText.includes('each equally likely')) return false; options[1].click(); return true; })()`, 'three Ad Works choices');
    await waitFor(`document.body.innerText.includes('Texas: ') && document.body.innerText.includes('persuasion points.')`, 'Ad Works result');
    assert.deepEqual(errors, []);
    console.log('Packaged Build 38 resolved the owner-approved Ad Works card in its original state.');
    process.exitCode = 0;
  } else {
  const runToNight = process.env.BFA38_ELECTION_NIGHT === '1';
  if (runToNight) {
    await waitFor(`(() => { const item = [...document.querySelectorAll('button,summary')].find(x => x.innerText.trim().startsWith('Advanced Options')); if (!item) return false; item.click(); return true; })()`, 'Advanced Options');
    await evaluate(`(() => { const option = document.querySelector('select option[value=mandatory-turnout]'); const select = option.closest('select'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, option.value); select.dispatchEvent(new Event('change', { bubbles:true })); })()`);
    await waitFor(`(() => { const item = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Simulate election · all campaigns run by AI')); if (!item) return false; item.click(); return true; })()`, 'AI simulation toggle');
  }
  await click(runToNight ? 'Run AI election simulation' : 'Launch the campaign');
  await waitFor(`document.querySelectorAll('[aria-label="Staff choices"] button').length === 16`, 'sixteen setup choices');
  await waitFor(`[...document.querySelectorAll('[aria-label="Staff choices"] img')].filter((img) => img.naturalWidth === 96).length === 16`, 'sixteen loaded setup portraits');
  await click('Randomize Staff');
  await click('Confirm inner circle');
  if (runToNight) {
    await waitFor(`document.body.innerText.includes('Election simulation running')`, 'running AI election');
    for (const week of [4, 8, 12]) {
      const label = 'Week ' + week + ' of';
      await waitFor(`document.body.innerText.includes(${JSON.stringify(label)}) || !!document.querySelector('[aria-label^="Election night phase"]')`, label, 900);
      console.log('Packaged AI campaign reached week ' + week + '.');
    }
    await waitFor(`!!document.querySelector('[aria-label^="Election night phase"]')`, 'Election Night', 1400);
    const saveReady = `(() => { const value = localStorage.getItem('election2028.save.v38'); return value && value; })()`;
    const packed = await waitFor(saveReady, 'campaign save');
    const saved = JSON.parse(packed.startsWith('b35:z1:') ? unzipSync(Buffer.from(packed.slice(7), 'base64')).toString() : packed);
    assert.equal(saved.build38.votingRuleId, 'mandatory-turnout');
    assert.equal(saved.finished, true);
    assert.equal(saved.earlyBallotLedger.batches.length, 98);
    assert.deepEqual(errors, []);
    console.log('Packaged Build 38 ran from setup through Election Night with the mandatory-turnout rule.');
  } else {
  await click('Staff');
  const staffPortraits = `new Set([...document.images].filter((img) => img.src.includes("/art/staff/") && img.naturalWidth === 96).map((img) => img.src)).size === 10`;
  await waitFor(staffPortraits, 'ten active portraits');
  await waitFor('window.__build37ForecastResults > 0', 'Nick Bronze worker result in the packaged app');
  await waitFor(`document.body.innerText.includes('Modeled early voting')`, 'early voting calendar');
  assert.ok(!(await evaluate(`[...document.querySelectorAll('button')].some((item) => item.textContent.trim() === 'Endorsements')`)));
  await click('President');
  await waitFor(`(() => { const map = document.querySelector('[data-testid="state-PA"]'); if (!map) return false; map.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; })()`, 'persuasion map selection');
  await waitFor(`document.body.innerText.includes('Pennsylvania win chances')`, 'state-level Nick Bronze probability');
  await click('State legislatures');
  await waitFor(`document.body.innerText.includes('2028 legislative seats')`, 'legislature view');
  await cdp('Page.reload');
  await click('Staff');
  await waitFor(staffPortraits, 'saved roster after reload');
  assert.deepEqual(errors, []);
  console.log('Verified packaged Build 38 launches from its executable, renders staff art, starts a campaign, opens the legislature view, receives a Nick Bronze result from the packaged worker, displays the early voting calendar and state odds, and resumes after reload.');
  }
  }
} finally {
  socket?.close();
  game.kill();
}
