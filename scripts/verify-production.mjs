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
  await page.keyboard.press('f');
  await page.waitForFunction(() => document.querySelector('#rally-status')?.textContent === 'Ball in play');
  await page.screenshot({ path: 'test-results/production-game.png' });
  assert.deepEqual(errors, []);
  assert(assets.some(asset => asset.url.endsWith('.wasm') && asset.status === 200));
  assert(assets.every(asset => asset.status === 200), JSON.stringify(assets));
  console.log('Production subpath passed: HTML, JS, CSS, Rapier WASM, WebGL, Pointer Lock, and serve.');
} finally {
  await browser?.close(); await new Promise(resolve => server.close(resolve));
}
