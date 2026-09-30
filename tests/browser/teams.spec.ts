import { test, expect } from '@playwright/test';
test('AI teams sustain rallies, set, attack, and obey player limits', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#solo')).toBeVisible();
  const result = await page.evaluate(async () => {
    const path = '/src/game/Simulation.ts'; const { Simulation } = await import(path) as typeof import('../../src/game/Simulation');
    const simulation = new Simulation(false, 99, { sizes: [3, 3], humanIds: [] });
    const hits: Record<string, number> = {}, teamHits = [0, 0], trace: unknown[] = []; let current = 0, longest = 0, invalid = false, crossings = 0, lastSide = 1;
    simulation.onEvent = (name, id) => { if (id && ['bump', 'set', 'spike', 'block', 'serve'].includes(name)) { hits[name] = (hits[name] ?? 0) + 1; teamHits[simulation.players.find(p => p.id === id)!.team]++; if (trace.length < 15) trace.push({ name, id, ball: simulation.physics.state().position }); current++; longest = Math.max(longest, current); } if (name === 'point') current = 0; };
    for (let n = 0; n < 60 * 180; n++) {
      simulation.step();
      const ballSide = Math.sign(simulation.physics.state().position.z); if (simulation.rules.state.phase === 'rally' && ballSide !== lastSide) crossings++; lastSide = ballSide;
      for (const p of simulation.players) if (Math.abs(p.position.x) > 6.5 || Math.abs(p.position.z) > 11.6 || p.position.z * (p.team === 0 ? 1 : -1) < 0.4 || !Number.isFinite(p.position.y)) invalid = true;
    }
    const result = { hits, teamHits, crossings, trace, longest, invalid, score: simulation.rules.state.score, roles: Object.fromEntries(simulation.aiRoles) }; simulation.dispose(); return result;
  });
  console.log('AI match metrics', JSON.stringify({ ...result, trace: undefined }));
  expect(result.invalid).toBe(false); expect(result.longest).toBeGreaterThanOrEqual(5);
  expect(result.hits.set ?? 0).toBeGreaterThan(2); expect(result.hits.spike ?? 0).toBeGreaterThan(2);
  expect(result.score[0] + result.score[1]).toBeGreaterThan(0);
  expect(result.crossings).toBeGreaterThan(8); expect(Math.min(...result.teamHits)).toBeGreaterThan(8);
});

test('six-player teams survive resets and vacant human slots become AI', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#solo')).toBeVisible();
  const result = await page.evaluate(async () => {
    const path = '/src/game/Simulation.ts'; const { Simulation } = await import(path) as typeof import('../../src/game/Simulation');
    const s = new Simulation(false, 15, { sizes: [6, 6], humanIds: ['host', 'guest'] });
    s.setController('guest', 'ai'); s.setController('host', 'ai');
    for (let i = 0; i < 3600; i++) s.step();
    const score = [...s.rules.state.score]; s.reset();
    const result = { count: s.players.length, ai: s.players.filter(p => p.controller === 'ai').length, unique: new Set(s.players.map(p => `${p.position.x},${p.position.z}`)).size, score }; s.dispose(); return result;
  });
  expect(result.count).toBe(12); expect(result.ai).toBe(12); expect(result.unique).toBe(12);
  expect(result.score[0] + result.score[1]).toBeGreaterThan(0);
});

test('team settings, remapping, persistence and scored AI play work through the UI', async ({ page }) => {
  await page.goto('/'); await page.locator('#settings-open').click();
  await page.locator('#team-blue').selectOption('2'); await page.locator('#team-coral').selectOption('4');
  await page.locator('[data-binding="serve"]').click(); await page.keyboard.press('k');
  await expect(page.locator('[data-binding="serve"]')).toHaveText('K');
  await page.locator('#settings-back').click(); await page.locator('#ai-match').click();
  await expect(page.locator('#mode-label')).toHaveText('2 vs 4'); await expect(page.locator('#rally-status')).toContainText('K to toss');
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.keyboard.press('k'); await expect(page.locator('#rally-status')).toHaveText('Ball in play');
  await page.screenshot({ path: 'test-results/team-match.png' });
  await page.evaluate(() => document.exitPointerLock()); await page.locator('#leave').click();
  await page.reload(); await page.locator('#settings-open').click(); await expect(page.locator('[data-binding="serve"]')).toHaveText('K');
  await page.locator('#binding-defaults').click(); await expect(page.locator('[data-binding="serve"]')).toHaveText('F');
  await page.locator('[data-binding="spike"]').click(); await page.locator('#settings-back').click(); await page.keyboard.press('p');
  await page.locator('#settings-open').click(); await expect(page.locator('[data-binding="spike"]')).toHaveText('E');
});
