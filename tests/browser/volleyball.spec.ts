import { test, expect } from '@playwright/test';
test('opens a rendered court and enters practice without runtime errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await expect(page.getByRole('button', { name: /Play solo/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/menu.png' });
  await page.getByRole('button', { name: /Play solo/ }).click(); await expect(page.locator('#hud')).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.keyboard.press('f'); await expect(page.locator('#rally-status')).toHaveText('Ball in play');
  await page.keyboard.press('g'); await expect(page.locator('#rally-status')).toContainText('Receive drill');
  await page.keyboard.press('h'); await expect(page.locator('#rally-status')).toContainText('Attack drill');
  await page.keyboard.press('Backquote'); await expect(page.locator('#debug-stats')).toBeVisible();
  await page.keyboard.press('r'); await expect(page.locator('#rally-status')).toContainText('F to toss');
  await page.screenshot({ path: 'test-results/practice.png' });
  await page.evaluate(() => document.exitPointerLock()); await expect(page.locator('#pause')).toBeVisible();
  await page.getByRole('button', { name: 'Leave court' }).click(); await expect(page.getByRole('button', { name: /Play solo/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('manual signaling connects two players, scores a rally, and handles disconnect', async ({ browser }) => {
  const hostContext = await browser.newContext(), guestContext = await browser.newContext();
  const host = await hostContext.newPage(), guest = await guestContext.newPage();
  const errors: string[] = []; host.on('pageerror', e => errors.push(e.message)); guest.on('pageerror', e => errors.push(e.message));
  await host.goto('/'); await guest.goto('/');
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
  await host.keyboard.press('f'); await expect(host.locator('#rally-status')).toHaveText('Ball in play');
  await expect(guest.locator('#rally-status')).toHaveText('Ball in play');
  await expect(host.locator('#score-blue')).toHaveText('1', { timeout: 15000 }); await expect(guest.locator('#score-blue')).toHaveText('1');
  await host.evaluate(() => document.exitPointerLock()); await host.getByRole('button', { name: 'Restart match' }).click();
  await expect(host.locator('#score-blue')).toHaveText('0'); await expect(guest.locator('#score-blue')).toHaveText('0');
  // A second rally exercises guest inputs and authoritative hit feedback, not just snapshots.
  await host.getByRole('button', { name: 'Enter court' }).click(); await host.keyboard.press('f');
  await guest.bringToFront(); await guest.getByRole('button', { name: 'Enter court' }).click();
  await guest.keyboard.press('Backquote'); await guest.keyboard.down('w');
  await guest.waitForTimeout(430); await guest.keyboard.up('w');
  await guest.waitForFunction(() => {
    const match = document.querySelector('#debug-stats')?.textContent?.match(/Ball (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/);
    return match && Number(match[2]) > 1.1 && Number(match[2]) < 2.1 && Number(match[3]) < -1;
  });
  await guest.mouse.click(640, 360); await expect(guest.locator('#notice')).toHaveText('Bump!', { timeout: 3000 });
  await guestContext.close(); await expect(host.locator('#pause-title')).toHaveText('Connection lost', { timeout: 10000 });
  await host.getByRole('button', { name: 'Leave court' }).click(); await host.getByRole('button', { name: /Play solo/ }).click(); await expect(host.locator('#hud')).toBeVisible();
  expect(errors).toEqual([]); await hostContext.close();
});
