import { test, expect, chromium } from '@playwright/test';
test('opens a rendered court and enters practice without runtime errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await expect(page.getByRole('button', { name: /Play solo/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/menu.png' });
  await page.getByRole('button', { name: /Play solo/ }).click(); await expect(page.locator('#hud')).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.keyboard.press('f'); await page.keyboard.press('f'); await expect(page.locator('#rally-status')).toHaveText('Ball in play');
  await page.keyboard.press('g'); await expect(page.locator('#rally-status')).toContainText('Receive drill');
  await page.keyboard.press('h'); await expect(page.locator('#rally-status')).toContainText('Attack drill');
  await page.keyboard.press('Backquote'); await expect(page.locator('#debug-stats')).toBeVisible();
  await page.keyboard.press('r'); await expect(page.locator('#rally-status')).toContainText('F to charge');
  await page.screenshot({ path: 'test-results/practice.png' });
  await page.evaluate(() => document.exitPointerLock()); await expect(page.locator('#pause')).toBeVisible();
  await page.getByRole('button', { name: 'Leave court' }).click(); await expect(page.getByRole('button', { name: /Play solo/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('host team sizes and AI state synchronize to the guest', async ({ browser }) => {
  const a = await browser.newContext(), b = await browser.newContext(); const host = await a.newPage(), guest = await b.newPage();
  await host.goto('/'); await guest.goto('/');
  for (const page of [host, guest]) { await page.locator('#settings-open').click(); await page.locator('#quality').selectOption('low'); await page.locator('#settings-back').click(); }
  await host.locator('#settings-open').click(); await host.locator('#team-blue').selectOption('2'); await host.locator('#team-coral').selectOption('3'); await host.locator('#settings-back').click();
  await host.locator('#host').click(); await expect(host.locator('#signal-out')).not.toHaveValue('', { timeout: 20000 });
  await guest.locator('#join').click(); await guest.locator('#signal-in').fill(await host.locator('#signal-out').inputValue()); await guest.locator('#signal-submit').click(); await expect(guest.locator('#signal-out')).not.toHaveValue('', { timeout: 20000 });
  await host.locator('#signal-in').fill(await guest.locator('#signal-out').inputValue()); await host.locator('#signal-submit').click();
  await expect(guest.locator('#mode-label')).toHaveText('2 vs 3');
  expect(await guest.evaluate(() => window.sideoutDebug?.().frame?.players.filter(p => p.controller === 'ai').length)).toBe(3);
  const initialAI = await guest.evaluate(() => window.sideoutDebug?.().frame?.players.filter(p => p.controller === 'ai').map(p => ({ id: p.id, position: p.position })) ?? []);
  await host.bringToFront(); await host.locator('#resume').click(); await expect.poll(() => host.evaluate(() => !!document.pointerLockElement)).toBe(true); await host.keyboard.press('f'); await host.keyboard.press('f');
  // The human guest may be assigned the receive; verify bot movement reaches the peer without requiring a bot to steal that ball.
  await expect.poll(() => guest.evaluate(initial => window.sideoutDebug?.().frame?.players.some(p => initial.some(before => before.id === p.id && Math.hypot(before.position.x - p.position.x, before.position.z - p.position.z) > 0.3)), initialAI), { timeout: 15000 }).toBe(true);
  await guest.bringToFront(); await guest.locator('#resume').click(); await guest.keyboard.down('z');
  await expect.poll(() => host.evaluate(() => window.sideoutDebug?.().authoritative?.players.find(p => p.id === 'guest')?.action)).toBe('pass');
  await guest.evaluate(() => document.exitPointerLock());
  await expect.poll(() => host.evaluate(() => window.sideoutDebug?.().authoritative?.players.find(p => p.id === 'guest')?.action)).not.toBe('pass');
  await guest.getByRole('button', { name: 'Leave court' }).click();
  await expect(host.locator('#net-status')).toHaveText('AI replaced guest', { timeout: 15000 });
  expect(await host.evaluate(() => window.sideoutDebug?.().authoritative?.players.filter(p => p.controller === 'ai').length)).toBe(4);
  await b.close(); await a.close();
});

test('manual signaling connects two players, scores a rally, and handles disconnect', async ({ browser }) => {
  const guestBrowser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  const hostContext = await browser.newContext(), guestContext = await guestBrowser.newContext();
  const host = await hostContext.newPage(), guest = await guestContext.newPage();
  const errors: string[] = []; host.on('pageerror', e => errors.push(e.message)); guest.on('pageerror', e => errors.push(e.message));
  await host.goto('/'); await guest.goto('/');
  for (const page of [host, guest]) { await page.locator('#settings-open').click(); await page.locator('#quality').selectOption('low'); await page.locator('#team-blue').selectOption('1'); await page.locator('#team-coral').selectOption('1'); await page.locator('#settings-back').click(); }
  await host.getByRole('button', { name: /Create multiplayer game/ }).click();
  await expect(host.locator('#signal-out')).not.toHaveValue('', { timeout: 20000 });
  const offer = await host.locator('#signal-out').inputValue();
  await guest.getByRole('button', { name: /Join multiplayer game/ }).click();
  await guest.locator('#signal-in').fill('not-a-code'); await guest.locator('#signal-submit').click(); await expect(guest.locator('#connection-status')).toContainText('Invalid connection code');
  await guest.locator('#signal-in').fill(offer); await guest.locator('#signal-submit').click();
  await expect(guest.locator('#signal-out')).not.toHaveValue('', { timeout: 20000 });
  const answer = await guest.locator('#signal-out').inputValue();
  await host.locator('#signal-in').fill(answer); await host.locator('#signal-submit').click();
  await expect(host.locator('#hud')).toBeVisible({ timeout: 20000 }); await expect(guest.locator('#hud')).toBeVisible({ timeout: 20000 });
  await expect(guest.locator('#team-label')).toHaveText('Team coral');
  await host.bringToFront(); await host.getByRole('button', { name: 'Enter court' }).click();
  await expect.poll(() => host.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await host.keyboard.press('f'); await host.keyboard.press('f'); await expect(host.locator('#rally-status')).toHaveText('Ball in play');
  await expect(guest.locator('#rally-status')).toHaveText('Ball in play');
  await expect(host.locator('#score-blue')).toHaveText('1', { timeout: 15000 }); await expect(guest.locator('#score-blue')).toHaveText('1');
  await host.evaluate(() => document.exitPointerLock()); await host.getByRole('button', { name: 'Restart match' }).click();
  await expect(host.locator('#score-blue')).toHaveText('0'); await expect(guest.locator('#score-blue')).toHaveText('0');
  // A second rally exercises guest inputs and authoritative hit feedback, not just snapshots.
  await guest.bringToFront(); await guest.getByRole('button', { name: 'Enter court' }).click();
  await expect.poll(() => guest.evaluate(() => !!document.pointerLockElement)).toBe(true);
  // The new low-power underhand serve lands in the receiver's initial lane.
  await guest.keyboard.down('z');
  await expect.poll(() => host.evaluate(() => window.sideoutDebug?.().authoritative?.players.find(p => p.id === 'guest')?.action)).toBe('pass');
  await host.getByRole('button', { name: 'Enter court' }).click();
  await expect.poll(() => host.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await host.keyboard.press('f'); await host.keyboard.press('f');
  await expect(guest.locator('#notice')).toContainText('Bump!', { timeout: 8000 });
  await guestContext.close(); await expect(host.locator('#net-status')).toHaveText('AI replaced guest', { timeout: 10000 });
  await host.evaluate(() => document.exitPointerLock());
  await host.getByRole('button', { name: 'Leave court' }).click(); await host.getByRole('button', { name: /Play solo/ }).click(); await expect(host.locator('#hud')).toBeVisible();
  expect(errors).toEqual([]); await hostContext.close(); await guestBrowser.close();
});
