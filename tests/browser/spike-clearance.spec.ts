import { test, expect } from '@playwright/test';
test('AI spikes clear the net in sustained matches', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#solo')).toBeVisible();
  const result = await page.evaluate(async () => {
    const path = '/src/game/Simulation.ts';
    const { Simulation } = await import(path) as typeof import('../../src/game/Simulation');
    const s = new Simulation(false, 99, { sizes: [3, 3], humanIds: [] });
    let spikes = 0; const unsafe: unknown[] = [];
    s.onEvent = (name, id) => {
      if (name !== 'spike' || !id) return;
      spikes++; const b = s.physics.state(), t = -b.position.z / b.velocity.z;
      const y = b.position.y + b.velocity.y * t - 4.905 * t * t;
      if (t > 0 && y < 2.43 + 0.21) unsafe.push({ position: b.position, velocity: b.velocity, netHeight: y });
    };
    for (let n = 0; n < 60 * 360; n++) s.step();
    s.dispose(); return { spikes, unsafe };
  });
  console.log('AI spike clearance', JSON.stringify(result));
  expect(result.spikes).toBeGreaterThan(2); expect(result.unsafe).toEqual([]);
});
