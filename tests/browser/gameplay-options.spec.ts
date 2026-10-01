import { test, expect } from '@playwright/test';
test('difficulty controls apply live and serving styles are controllable', async ({ page }) => {
  await page.goto('/'); await page.locator('#settings-open').click();
  await page.locator('#ai-preset-0').selectOption('easy'); await page.locator('#ai-preset-1').selectOption('hard');
  await page.locator('#settings-back').click(); await page.locator('#ai-match').click();
  await expect.poll(() => page.evaluate(() => window.sideoutDebug?.().difficulty?.[0].reaction)).toBe(0.28);
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.keyboard.press('b'); await expect(page.locator('#serve-hud')).toContainText('Float');
  await page.keyboard.down('f'); await page.waitForTimeout(700); await page.keyboard.up('f');
  await expect.poll(() => page.evaluate(() => window.sideoutDebug?.().authoritative?.players[0].serve.stage)).toBe('toss');
  await page.keyboard.press('f'); await expect(page.locator('#rally-status')).toHaveText('Ball in play');
  await page.screenshot({ path: 'test-results/humanoid-match.png' });
  await page.evaluate(() => document.exitPointerLock()); await page.locator('#pause-settings').click();
  await page.locator('#ai-accuracy-0').fill('0.75'); await expect(page.locator('#ai-preset-0')).toHaveValue('custom');
  expect(await page.evaluate(() => window.sideoutDebug?.().difficulty?.[0].accuracy)).toBe(0.75);
  await page.reload(); await page.locator('#settings-open').click(); await expect(page.locator('#ai-accuracy-0')).toHaveValue('0.75');
});

test('all serve styles launch physically and incoming serves cannot be blocked or spiked', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#solo')).toBeVisible();
  const result = await page.evaluate(async () => {
    const path = '/src/game/Simulation.ts', inputs = '/src/controls/InputManager.ts';
    const { Simulation } = await import(path) as typeof import('../../src/game/Simulation');
    const { neutralInput } = await import(inputs) as typeof import('../../src/controls/InputManager');
    const launches: string[] = [], protections: boolean[] = [];
    for (const style of ['underhand', 'float', 'topspin'] as const) {
      const s = new Simulation(false, 15), events: string[] = []; s.onEvent = name => events.push(name);
      const p = s.players[0]; p.serve.style = style; s.setInput('host', neutralInput(0)); s.action('host', 'serve');
      for (let n = 0; n < 40; n++) s.step(); s.action('host', 'serve-release');
      for (let n = 0; n < 20; n++) { s.setInput('host', { ...neutralInput(0), jump: style === 'topspin' && n === 10 }); s.step(); }
      s.action('host', 'serve'); if (events.includes('serve')) launches.push(style);
      const receiver = s.players[1]; receiver.position = { x: 0, y: 1, z: -0.6 }; receiver.grounded = false;
      s.physics.reset({ x: 0, y: 3.1, z: -0.1 }); s.physics.launch({ x: 0, y: -0.1, z: -3 });
      s.setInput('guest', { ...neutralInput(Math.PI), block: true }); s.action('guest', 'spike'); s.step();
      protections.push(!events.includes('spike') && !events.includes('block') && s.rules.serveProtected);
      s.rules.touch(1); protections.push(s.rules.canAttackServe('spike')); s.dispose();
    }
    return { launches, protections };
  });
  expect(result.launches).toEqual(['underhand', 'float', 'topspin']); expect(result.protections.every(Boolean)).toBe(true);
});

test('serve boundary checks hold and missed practice tosses do not award points', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#solo')).toBeVisible();
  const result = await page.evaluate(async () => {
    const path = '/src/game/Simulation.ts'; const { Simulation } = await import(path) as typeof import('../../src/game/Simulation');
    const s = new Simulation(true, 15), p = s.players[0];
    s.action('host', 'serve'); p.position.z = 8; s.action('host', 'serve-release');
    const rejected = p.serve.stage === 'ready';
    p.position.z = 10; s.action('host', 'serve'); s.action('host', 'serve-release');
    for (let n = 0; n < 180; n++) s.step();
    const score = s.rules.state.score; s.dispose(); return { rejected, score };
  });
  expect(result.rejected).toBe(true); expect(result.score).toEqual([0, 0]);
});
