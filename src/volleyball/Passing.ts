import { clamp, type PlayerState, type Vec3 } from '../game/Types';
import { swingPhase } from './Actions';

/** A moving forearm platform: restitution reflects relative incoming speed;
 * the swing adds bounded surface velocity. No target or random aim correction. */
export function passVelocity(p: PlayerState, incoming: Vec3, time: number, quality: number): Vec3 | null {
  const tilt = clamp(0.72 + p.pitch * 0.55, 0.2, 1.25);
  const normal = { x: -Math.sin(p.yaw) * Math.sin(tilt), y: Math.cos(tilt), z: -Math.cos(p.yaw) * Math.sin(tilt) };
  const swing = p.action === 'bump' ? Math.sin(swingPhase(p, time) * Math.PI) * 3.8 : 0;
  const surface = { x: p.velocity.x * 0.65 + normal.x * swing, y: p.velocity.y * 0.4 + normal.y * swing, z: p.velocity.z * 0.65 + normal.z * swing };
  const relative = { x: incoming.x - surface.x, y: incoming.y - surface.y, z: incoming.z - surface.z };
  const approach = relative.x * normal.x + relative.y * normal.y + relative.z * normal.z;
  if (approach >= -0.05) return null;
  const impulse = -(1.25 + quality * 0.4) * approach;
  const out = { x: incoming.x + normal.x * impulse, y: incoming.y + normal.y * impulse, z: incoming.z + normal.z * impulse };
  const scale = Math.min(1, 26 / Math.hypot(out.x, out.y, out.z));
  return { x: out.x * scale, y: out.y * scale, z: out.z * scale };
}
