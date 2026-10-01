import { test, expect } from '@playwright/test';
test('third person is default, camera is remappable, and passing can be held until release', async ({ page }) => {
  await page.goto('/'); await page.locator('#settings-open').click();
  await page.locator('[data-binding="camera"]').click(); await page.keyboard.press('c');
  await page.locator('#settings-back').click(); await page.locator('#solo').click();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  expect(await page.evaluate(() => window.sideoutDebug?.().firstPerson)).toBe(false);
  await page.keyboard.down('z');
  await expect.poll(() => page.evaluate(() => window.sideoutDebug?.().authoritative?.players[0].action)).toBe('pass');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.sideoutDebug?.().authoritative?.players[0].action)).toBe('pass');
  await page.screenshot({ path: 'test-results/third-person-pass.png' });
  await page.keyboard.press('c'); expect(await page.evaluate(() => window.sideoutDebug?.().firstPerson)).toBe(true);
  await page.screenshot({ path: 'test-results/first-person-pass.png' });
  await page.keyboard.up('z');
  await page.keyboard.press('g'); await page.keyboard.down('z');
  await expect.poll(() => page.evaluate(() => window.sideoutDebug?.().authoritative?.players[0].action)).toBe('pass');
  await page.evaluate(() => document.exitPointerLock());
  expect(await page.evaluate(() => window.sideoutDebug?.().input.pass)).toBe(false);
});

test('stationary held platform rebounds a reachable ball without a target or extra contacts', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/src/game/Simulation.ts', inputs = '/src/controls/InputManager.ts';
    const { Simulation } = await import(path) as typeof import('../../src/game/Simulation');
    const { neutralInput } = await import(inputs) as typeof import('../../src/controls/InputManager');
    const s = new Simulation(true, 15), events: string[] = []; s.onEvent = name => events.push(name);
    const p = s.players[0]; p.position.z = 5; s.rules.beginRally(1);
    s.physics.reset({ x: 0, y: 1.1, z: 4.3 }); s.physics.launch({ x: 0, y: -5, z: 5 });
    const input = { ...neutralInput(0), pass: true };
    s.setInput('host', input); s.step(); const after = s.physics.state().velocity;
    for (let n = 0; n < 20; n++) { s.setInput('host', input); s.step(); }
    const result = { after, bumps: events.filter(e => e === 'bump').length }; s.dispose(); return result;
  });
  expect(result.after.y).toBeGreaterThan(0); expect(result.after.z).toBeLessThan(0); expect(result.bumps).toBe(1);
});
