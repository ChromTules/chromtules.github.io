import { it, expect } from 'vitest';
import { createPlayer, movePlayer } from '../src/entities/PlayerMotor';
import { neutralInput } from '../src/controls/InputManager';
it('normalizes diagonal motion and stops promptly', () => {
  const p = createPlayer('p', 0), i = { ...neutralInput(0), moveX: 1, moveZ: 1 };
  for (let n = 0; n < 30; n++) movePlayer(p, i, 1 / 60, n / 60);
  expect(Math.hypot(p.velocity.x, p.velocity.z)).toBeLessThanOrEqual(5.81);
  for (let n = 0; n < 30; n++) movePlayer(p, neutralInput(0), 1 / 60, 1 + n / 60);
  expect(Math.hypot(p.velocity.x, p.velocity.z)).toBeLessThan(0.01);
});
it('cannot cross net or leave runoff', () => { const p = createPlayer('p', 0); for (let n = 0; n < 1000; n++) movePlayer(p, { ...neutralInput(0), moveZ: 1, moveX: 1 }, 1 / 60, n / 60); expect(p.position.z).toBeGreaterThanOrEqual(0.4); expect(p.position.x).toBeLessThan(6.5); });
it('jumps and returns to the ground', () => { const p = createPlayer('p', 0); movePlayer(p, { ...neutralInput(0), jump: true }, 1 / 60, 0); expect(p.position.y).toBeGreaterThan(0); for (let n = 0; n < 120; n++) movePlayer(p, neutralInput(0), 1 / 60, n / 60); expect(p.grounded).toBe(true); expect(p.position.y).toBe(0); });
