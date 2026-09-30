import { describe, it, expect } from 'vitest';
import { calculateArcVelocity, calculateSpikeVelocity } from '../src/volleyball/Trajectory';
describe('gravity-aware trajectories', () => {
  it.each([0.2, 2.5])('arrives at target height %s', y => {
    const from = { x: -2, y: 1.8, z: 6 }, to = { x: 2, y, z: -4 };
    const v = calculateArcVelocity(from, to, 6, 9.81);
    const t = (to.z - from.z) / v.z;
    expect(from.x + v.x * t).toBeCloseTo(to.x);
    expect(from.y + v.y * t - 0.5 * 9.81 * t * t).toBeCloseTo(to.y);
  });
  it('rejects nonfinite trajectories', () => expect(() => calculateArcVelocity({ x: NaN, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 5, 9.81)).toThrow());
  it('keeps low requested apex above both endpoints', () => expect(calculateArcVelocity({ x: 0, y: 4, z: 0 }, { x: 1, y: 5, z: 1 }, 1, 9.81).y).toBeGreaterThan(0));
  it('spikes downward toward the chosen side', () => { const v = calculateSpikeVelocity({ x: 0, y: 3.5, z: 1 }, { x: 2, y: 0, z: -5 }, 0.5, 1); expect(v.z).toBeLessThan(0); expect(v.y).toBeLessThan(0); });
});
