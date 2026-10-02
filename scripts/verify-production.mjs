import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const root = resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (!url.pathname.startsWith('/volleyball/')) { response.writeHead(404).end(); return; }
    const path = resolve(root, decodeURIComponent(url.pathname.slice('/volleyball/'.length)) || 'index.html');
    if (!path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    const data = await readFile(path); response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' }).end(data);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(4180, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], assets = []; page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().startsWith('http://127.0.0.1:4180')) assets.push({ url: response.url(), status: response.status() }); });
  await page.goto('http://127.0.0.1:4180/volleyball/');
  await page.locator('#solo').waitFor(); await page.screenshot({ path: 'test-results/production-menu.png' });
  await page.locator('#solo').click();
  await page.waitForFunction(() => document.pointerLockElement !== null);
  await page.keyboard.press('f'); await page.keyboard.press('f');
  await page.waitForFunction(() => document.querySelector('#rally-status')?.textContent === 'Ball in play');
  await page.screenshot({ path: 'test-results/production-game.png' });
  assert.deepEqual(errors, []);
  assert(assets.some(asset => asset.url.endsWith('.wasm') && asset.status === 200));
  assert(assets.every(asset => asset.status === 200), JSON.stringify(assets));
  console.log('Production subpath passed: HTML, JS, CSS, Rapier WASM, WebGL, Pointer Lock, and serve.');

  const host = await browser.newPage(), guest = await browser.newPage();
  for (const client of [host, guest]) {
    client.on('pageerror', error => errors.push(error.message));
    await client.addInitScript(() => {
      const Original = window.RTCPeerConnection;
      window.RTCPeerConnection = class extends Original {
        constructor(...args) { super(...args); window.testPeer = this; }
      };
    });
    await client.goto('http://127.0.0.1:4180/volleyball/');
    await client.locator('#settings-open').click(); await client.locator('#quality').selectOption('low'); await client.locator('#settings-back').click();
  }
  await host.locator('#host').click();
  await host.waitForFunction(() => !!document.querySelector('#signal-out')?.value, null, { timeout: 20000 });
  await guest.locator('#join').click(); await guest.locator('#signal-in').fill(await host.locator('#signal-out').inputValue()); await guest.locator('#signal-submit').click();
  await guest.waitForFunction(() => !!document.querySelector('#signal-out')?.value, null, { timeout: 20000 });
  await host.locator('#signal-in').fill(await guest.locator('#signal-out').inputValue()); await host.locator('#signal-submit').click();
  for (const client of [host, guest]) await client.locator('#hud').waitFor({ state: 'visible', timeout: 20000 });
  await guest.waitForFunction(() => document.querySelector('#team-label')?.textContent === 'Team coral');
  // Deliver a transient browser transport event to the real production Game.
  // This must not latch its permanent-disconnect flag or trigger AI takeover.
  await guest.evaluate(() => {
    Object.defineProperty(window.testPeer, 'connectionState', { configurable: true, value: 'disconnected' });
    window.testPeer.dispatchEvent(new Event('connectionstatechange'));
  });
  await guest.waitForFunction(() => document.querySelector('#net-status')?.textContent?.includes('Trying to recover'));
  assert(!await guest.locator('#pause-title').textContent().then(text => text.includes('Connection lost')));
  await guest.evaluate(() => { delete window.testPeer.connectionState; window.testPeer.dispatchEvent(new Event('connectionstatechange')); });
  await guest.waitForFunction(() => document.querySelector('#net-status')?.textContent?.startsWith('Connected /'));
  await guest.locator('#leave').click();
  await host.waitForFunction(() => document.querySelector('#net-status')?.textContent === 'AI replaced guest', null, { timeout: 15000 });
  await host.locator('#leave').click(); await host.locator('#host').click();
  await host.waitForFunction(() => !!document.querySelector('#signal-out')?.value, null, { timeout: 20000 });
  await host.evaluate(() => {
    Object.defineProperty(window.testPeer, 'connectionState', { configurable: true, value: 'failed' });
    window.testPeer.dispatchEvent(new Event('connectionstatechange'));
  });
  await host.waitForFunction(() => document.querySelector('#connection-status')?.textContent?.includes('TURN relay'));
  assert(await host.locator('#connection').isVisible()); assert(!await host.locator('#pause').isVisible());
  await host.evaluate(() => { delete window.testPeer.connectionState; });
  assert.equal(await host.evaluate(() => window.testPeer.connectionState), 'closed');
  assert.deepEqual(errors, []);
  console.log('Production multiplayer passed: offer/answer, shared match, transient recovery, AI takeover, and visible setup failure.');
} finally {
  await browser?.close(); await new Promise(resolve => server.close(resolve));
}
