import { C } from '../game/Constants';
import { clamp, type Action, type PlayerState, type Vec3 } from '../game/Types';
export function beginAction(p: PlayerState, action: Action, time: number) {
  if (time < p.cooldownUntil) return false;
  p.action = action; p.actionUntil = time + C.actionWindow; p.cooldownUntil = time + C.actionCooldown;
  return true;
}
export function contactQuality(p: PlayerState, ball: Vec3, action: Action | 'block', time: number) {
  const dx = ball.x - p.position.x, dz = ball.z - p.position.z;
  const dy = ball.y - p.position.y, horizontal = Math.hypot(dx, dz);
  const forward = horizontal < 0.15 ? 1 : (-Math.sin(p.yaw) * dx - Math.cos(p.yaw) * dz) / horizontal;
  const diving = time < p.diveUntil;
  const range = action === 'set' ? C.setRange : action === 'spike' ? C.spikeRange : action === 'block' ? C.blockRange : C.bumpRange + (diving ? 0.85 : 0);
  if (horizontal > range || forward < -0.4) return 0;
  if (action === 'spike' && (p.grounded || dy < 1.5 || dy > 3.25)) return 0;
  if (action === 'set' && (dy < 1.4 || dy > 3.0)) return 0;
  if ((action === 'bump' || action === 'dive') && (dy < 0.08 || dy > (diving ? 1.4 : 2.1))) return 0;
  if (action === 'block' && (Math.abs(p.position.z) > 1.35 || dy < 1.55 || dy > (p.grounded ? 2.35 : 3.0))) return 0;
  const elapsed = time - (p.actionUntil - C.actionWindow);
  const timing = p.action === action && action !== 'block' && action !== 'dive'
    ? 1 - clamp(Math.abs(elapsed - C.actionWindow * 0.45) / (C.actionWindow * 0.55), 0, 1) * 0.25 : 1;
  const height = action === 'spike' ? 1 - Math.min(0.15, Math.abs(dy - 2.4) * 0.12) : 1;
  return clamp((1 - horizontal / range * 0.45 - Math.max(0, 0.5 - forward) * 0.2) * timing * height, 0.25, 1);
}
