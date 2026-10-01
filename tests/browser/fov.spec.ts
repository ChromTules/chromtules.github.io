import { test, expect } from '@playwright/test';
test('FOV supports wider views, applies in both camera modes, and persists', async ({ page }) => {
  await page.goto('/'); await page.locator('#settings-open').click();
  const slider = page.getByLabel('Field of view');
  await expect(slider).toHaveValue('78', { timeout: 3000 });
  await slider.fill('110');
  await expect(page.locator('#fov-value')).toHaveText('110°');
  await expect.poll(() => page.evaluate(() => window.sideoutDebug?.().fov)).toBe(110);
  await page.locator('#settings-back').click(); await page.locator('#solo').click();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.keyboard.press('v');
  await expect.poll(() => page.evaluate(() => window.sideoutDebug?.().firstPerson)).toBe(true);
  expect(await page.evaluate(() => window.sideoutDebug?.().fov)).toBe(110);
  await page.reload(); await page.locator('#settings-open').click();
  await expect(slider).toHaveValue('110');
  await expect.poll(() => page.evaluate(() => window.sideoutDebug?.().fov)).toBe(110);
  await slider.fill('120'); await expect.poll(() => page.evaluate(() => window.sideoutDebug?.().fov)).toBe(120);
});
