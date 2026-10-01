import { it, expect } from 'vitest';
import { createPlayer } from '../src/entities/PlayerMotor';
import { passVelocity } from '../src/volleyball/Passing';
it('rebounds from incoming velocity and platform angle rather than a target', () => {
  const p = createPlayer('host', 0); p.action = 'pass';
  const a = passVelocity(p, { x: 0, y: -6, z: 7 }, 1, 1)!;
  expect(a.y).toBeGreaterThan(0); expect(a.z).toBeLessThan(0);
  const b = passVelocity(p, { x: 2, y: -9, z: 7 }, 1, 1)!;
  expect(b.x).toBeGreaterThan(a.x); expect(b.y).not.toBe(a.y);
  p.pitch = 0.6; expect(passVelocity(p, { x: 0, y: -6, z: 7 }, 1, 1)!.z).not.toBe(a.z);
});
it('adds energy during a timed swing but never repeats contact with a departing ball', () => {
  const p = createPlayer('host', 0); p.action = 'pass';
  const still = passVelocity(p, { x: 0, y: -6, z: 7 }, 1, 1)!;
  p.action = 'bump'; p.actionUntil = 1.09;
  expect(passVelocity(p, { x: 0, y: -6, z: 7 }, 1, 1)!.y).toBeGreaterThan(still.y);
  p.action = 'pass'; expect(passVelocity(p, { x: 0, y: 10, z: -10 }, 1, 1)).toBeNull();
});
