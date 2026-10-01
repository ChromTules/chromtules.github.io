import { it, expect } from 'vitest';
import { createPlayer } from '../src/entities/PlayerMotor';
import { beginAction, contactQuality } from '../src/volleyball/Actions';
import { Rules } from '../src/volleyball/Rules';
it('adds modest contact and timing forgiveness without reaching remote balls', () => {
  const p = createPlayer('host', 0); beginAction(p, 'set', 1);
  expect(p.actionUntil).toBeCloseTo(1.22);
  expect(contactQuality(p, { x: 0.5, y: 1, z: 5.3 }, 'pass', 1)).toBeGreaterThan(0);
  expect(contactQuality(p, { x: 1.2, y: 1, z: 5.3 }, 'pass', 1)).toBe(0);
});
it('protects serves until an opposing receive, including after a net crossing', () => {
  const rules = new Rules(); rules.beginRally(0, true); rules.track(-1);
  expect(rules.canAttackServe('block')).toBe(false); expect(rules.canAttackServe('spike')).toBe(false);
  expect(rules.canAttackServe('set')).toBe(true);
  rules.touch(0); expect(rules.canAttackServe('spike')).toBe(false);
  rules.touch(1); expect(rules.canAttackServe('spike')).toBe(true);
  rules.beginRally(1, true); rules.reset(); expect(rules.canAttackServe('block')).toBe(true);
});
