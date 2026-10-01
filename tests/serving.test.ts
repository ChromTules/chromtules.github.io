import { it, expect } from 'vitest';
import { serveVelocity, serveContactQuality } from '../src/volleyball/Serving';
import { createPlayer } from '../src/entities/PlayerMotor';
it('serving styles and charge affect flight, and camera heading aims it', () => {
  const from = { x: 0, y: 2.3, z: 9.5 };
  const under = serveVelocity(from, 0, 0, 0, 'underhand', 0.5, 1);
  const float = serveVelocity(from, 0, 0, 0, 'float', 0.5, 1);
  expect(under.y).not.toBe(float.y);
  expect(serveVelocity(from, 0, 0, 0, 'float', 1, 1).z).toBeLessThan(float.z);
  expect(serveVelocity(from, 0.25, 0, 0, 'float', 0.5, 1).x).toBeLessThan(0);
});
it('jump topspin requires a jump and every serve requires nearby ball contact', () => {
  const p = createPlayer('host', 0); p.serve.style = 'topspin';
  expect(serveContactQuality(p, { x: 0, y: 2.5, z: 5.3 })).toBe(0);
  p.grounded = false; expect(serveContactQuality(p, { x: 0, y: 2.5, z: 5.3 })).toBeGreaterThan(0);
  expect(serveContactQuality(p, { x: 3, y: 2.5, z: 5.3 })).toBe(0);
});
