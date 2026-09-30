import { test, expect } from '@playwright/test';
test('real Rapier simulation supports assisted contacts, dive, net collision and restart', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#solo')).toBeVisible();
  const result = await page.evaluate(async () => {
    const simulationPath = '/src/game/Simulation.ts', inputPath = '/src/controls/InputManager.ts';
    const { Simulation } = await import(simulationPath) as typeof import('../../src/game/Simulation');
    const { neutralInput } = await import(inputPath) as typeof import('../../src/controls/InputManager');
    const s = new Simulation(true, 15), events: string[] = []; s.onEvent = name => events.push(name);
    const input = neutralInput(0); input.target = { x: 0, y: 0.21, z: 1.5 };
    const step = () => { s.setInput('host', { ...input }); s.step(); };
    const p = s.players[0];
    s.rules.beginRally(0); p.position = { x: 0, y: 0, z: 5 }; s.physics.reset({ x: 0, y: 1.4, z: 4 });
    s.action('host', 'bump'); step(); const bump = s.physics.state().velocity.y > 0 && events.includes('bump');
    for (let n = 0; n < 30; n++) step();
    s.physics.reset({ x: 0, y: 2.5, z: 4.5 }); s.action('host', 'set'); step(); const set = s.physics.state().velocity.y > 0 && events.includes('set');
    for (let n = 0; n < 30; n++) step();
    p.position = { x: 0, y: 1, z: 1.5 }; p.grounded = false; p.velocity.y = 0;
    s.physics.reset({ x: 0, y: 3.3, z: 1 }); s.action('host', 'spike'); step(); const spike = s.physics.state().velocity.z < -8 && events.includes('spike');
    p.position = { x: 0, y: 0, z: 5 }; p.grounded = true; s.action('host', 'dive'); const dive = p.diveReady > s.time && Math.hypot(p.velocity.x, p.velocity.z) > 8;
    const ready = p.diveReady; s.action('host', 'dive'); const cooldown = p.diveReady === ready;
    s.physics.reset({ x: 0, y: 1.8, z: 1 }); s.physics.launch({ x: 0, y: 0, z: -7 });
    for (let n = 0; n < 20; n++) step(); const net = events.includes('net');
    s.reset(); const reset = s.rules.state.phase === 'serving' && s.rules.state.score[0] === 0;
    s.dispose(); s.dispose(); return { bump, set, spike, dive, cooldown, net, reset };
  });
  expect(result).toEqual({ bump: true, set: true, spike: true, dive: true, cooldown: true, net: true, reset: true });
});

test('a player can receive, set, approach, jump and spike a practice feed', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#solo')).toBeVisible();
  const result = await page.evaluate(async () => {
    const simulationPath = '/src/game/Simulation.ts', inputPath = '/src/controls/InputManager.ts', actionsPath = '/src/volleyball/Actions.ts';
    const { Simulation } = await import(simulationPath) as typeof import('../../src/game/Simulation');
    const { neutralInput } = await import(inputPath) as typeof import('../../src/controls/InputManager');
    const { contactQuality } = await import(actionsPath) as typeof import('../../src/volleyball/Actions');
    const s = new Simulation(true, 15), events: string[] = [], trace: unknown[] = []; s.onEvent = (name, id) => { if (id && ['bump', 'set', 'spike'].includes(name)) { events.push(name); trace.push({ name, time: s.time, ball: s.physics.state(), player: structuredClone(s.players[0]) }); } };
    s.feed('receive'); let stage = 0; let jumped = false;
    for (let n = 0; n < 900 && stage < 3; n++) {
      const p = s.players[0], ball = s.physics.state(), i = neutralInput(0); i.sequence = n; i.target = { x: 0, y: 0.21, z: 1.5 };
      if (stage > 0) { i.moveZ = p.position.z > 2.6 ? 1 : p.position.z < 2.1 ? -1 : 0; }
      if (stage === 0 && ball.velocity.y < 0 && contactQuality(p, ball.position, 'bump', s.time)) s.action('host', 'bump');
      if (stage === 1 && ball.velocity.y < 0 && contactQuality(p, ball.position, 'set', s.time)) s.action('host', 'set');
      if (stage === 2) {
        if (!jumped && ball.velocity.y < 0 && ball.position.y < 4.7) { i.jump = true; jumped = true; }
        if (contactQuality(p, ball.position, 'spike', s.time)) s.action('host', 'spike');
      }
      s.setInput('host', i); s.step();
      if (events.includes('bump')) stage = Math.max(stage, 1);
      if (events.includes('set')) stage = Math.max(stage, 2);
      if (events.includes('spike')) stage = 3;
    }
    const result = { events, trace, ball: s.physics.state().position, player: s.players[0].position, phase: s.rules.state.phase }; s.dispose(); return result;
  });
  expect(result.events, JSON.stringify(result)).toEqual(expect.arrayContaining(['bump', 'set', 'spike']));
});

test('latches jump edges and allows an immediate opposing block', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#solo')).toBeVisible();
  const result = await page.evaluate(async () => {
    const simulationPath = '/src/game/Simulation.ts', inputPath = '/src/controls/InputManager.ts';
    const { Simulation } = await import(simulationPath) as typeof import('../../src/game/Simulation');
    const { neutralInput } = await import(inputPath) as typeof import('../../src/controls/InputManager');
    const s = new Simulation(false, 15), events: string[] = []; s.onEvent = name => events.push(name);
    s.setInput('guest', { ...neutralInput(Math.PI), sequence: 1, jump: true }); s.setInput('guest', { ...neutralInput(Math.PI), sequence: 2, jump: false }); s.step();
    const jump = !s.players[1].grounded;
    s.rules.beginRally(0);
    const attacker = s.players[0], blocker = s.players[1];
    attacker.position = { x: 0, y: 1.2, z: 0.7 }; attacker.grounded = false; attacker.velocity.y = 0;
    blocker.position = { x: 0, y: 1.2, z: -0.7 }; blocker.grounded = false; blocker.velocity.y = 0;
    s.physics.reset({ x: 0, y: 3.6, z: 0.25 }); s.setInput('host', { ...neutralInput(0), target: { x: 0, y: 0.21, z: -6 } }); s.action('host', 'spike');
    for (let n = 0; n < 10; n++) s.step();
    const block = events.includes('spike') && events.includes('block') && s.rules.lastTouch === 1;
    s.dispose(); return { jump, block, events };
  });
  expect(result.jump).toBe(true); expect(result.block, JSON.stringify(result)).toBe(true);
});
