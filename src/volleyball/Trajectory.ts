import { C } from '../game/Constants';
import { clamp, type Vec3 } from '../game/Types';
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
