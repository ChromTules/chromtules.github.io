import { it, expect } from 'vitest';
import { cameraPose } from '../src/world/Camera';
import { createPlayer } from '../src/entities/PlayerMotor';
it('places third person behind and above either team without crossing gym walls', () => {
  const p = createPlayer('host', 0);
  const pose = cameraPose(p, false, 0);
  expect(pose.position.z).toBeGreaterThan(p.position.z + 2);
  expect(pose.position.y).toBeGreaterThan(2);
  p.yaw = Math.PI; p.position.z = -11.5;
  const other = cameraPose(p, false, 0);
  expect(other.position.z).toBeLessThan(p.position.z); expect(other.position.z).toBeGreaterThan(-17);
});
it('first person uses the player eye position without changing aim', () => {
  const p = createPlayer('host', 0); p.pitch = 0.5; p.yaw = 1;
  const pose = cameraPose(p, true, 0);
  expect(pose.position.z).toBe(p.position.z); expect(pose.pitch).toBe(0.5); expect(pose.yaw).toBe(1);
});
