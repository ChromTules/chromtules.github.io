import { C } from '../game/Constants';
import { clamp, side, type Team, type Vec3 } from '../game/Types';
export function calculateArcVelocity(from: Vec3, target: Vec3, apex: number, gravity = C.gravity): Vec3 {
  if (![...Object.values(from), ...Object.values(target), apex, gravity].every(Number.isFinite) || gravity <= 0) throw new Error('Invalid trajectory');
  const top = Math.max(apex, from.y + 0.15, target.y + 0.15);
  const vy = Math.sqrt(2 * gravity * (top - from.y));
  const t = vy / gravity + Math.sqrt(2 * (top - target.y) / gravity);
  return { x: (target.x - from.x) / t, y: vy, z: (target.z - from.z) / t };
}
export function calculateSpikeVelocity(from: Vec3, target: Vec3, downPitch: number, quality: number): Vec3 {
  const dx = target.x - from.x, dz = target.z - from.z;
  const distance = Math.max(0.2, Math.hypot(dx, dz));
  const slope = clamp((target.y - from.y) / distance - Math.max(0, downPitch) * 0.35, -1.2, -0.08);
  const speed = C.spikePower * (0.72 + 0.28 * quality);
  const horizontal = speed / Math.sqrt(1 + slope * slope);
  return { x: dx / distance * horizontal, y: horizontal * slope, z: dz / distance * horizontal };
}
export const calculateServeVelocity = (from: Vec3, target: Vec3) => calculateArcVelocity(from, target, C.serveApex);
export function cameraSpikeTarget(from: Vec3, yaw: number, pitch: number, team: Team, marker: Vec3): Vec3 {
  const base = team === 0 ? 0 : Math.PI;
  const relative = Math.atan2(Math.sin(yaw - base), Math.cos(yaw - base));
  const heading = base + clamp(relative, -1.25, 1.25);
  const reach = clamp((from.y - C.ballRadius) / Math.tan(Math.max(0.12, -pitch)), 2, 13);
  const x = from.x - Math.sin(heading) * reach;
  const z = from.z - Math.cos(heading) * reach;
  return { x: clamp(x * 0.9 + marker.x * 0.1, -4.3, 4.3), y: C.ballRadius, z: -side(team) * clamp(-side(team) * z * 0.9 + Math.abs(marker.z) * 0.1, 0.8, 8.7) };
}
