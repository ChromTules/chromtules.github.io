import { C } from '../game/Constants';
import { clamp, type Action, type PlayerState, type Vec3 } from '../game/Types';
export function beginAction(p: PlayerState, action: Action, time: number) {
  if (time < p.cooldownUntil) return false;
  p.action = action; p.actionUntil = time + C.actionWindow; p.cooldownUntil = time + C.actionCooldown;
  return true;
}
export function swingPhase(p: PlayerState, time: number) {
  return p.action === 'bump' ? clamp(1 - (p.actionUntil - time) / C.actionWindow, 0, 1) : 0;
}
export function contactQuality(p: PlayerState, ball: Vec3, action: Action | 'block' | 'pass', time: number) {
  const dx = ball.x - p.position.x, dz = ball.z - p.position.z;
  const dy = ball.y - p.position.y;
  const forward = -Math.sin(p.yaw) * dx - Math.cos(p.yaw) * dz;
  const lateral = Math.cos(p.yaw) * dx - Math.sin(p.yaw) * dz;
  const diving = time < p.diveUntil;
  if (action === 'spike' && p.grounded) return 0;
  if (action === 'block' && Math.abs(p.position.z) > 1.05) return 0;
  const passing = action === 'bump' || action === 'pass' || action === 'dive';
  const centerY = passing ? (diving ? 0.48 : 1.0) + Math.sin(swingPhase(p, time) * Math.PI) * 0.22 : action === 'set' ? 2.25 : action === 'block' ? 2.12 : 2.4;
  const centerZ = passing ? (diving ? 1.05 : 0.7) : action === 'set' ? 0.38 : 0.55;
  // Ellipsoids enclose the hands/forearms and ball radius, not the whole player.
  const error = (lateral / (passing ? 0.55 : 0.50)) ** 2 + ((forward - centerZ) / 0.55) ** 2 + ((dy - centerY) / (passing ? 0.42 : 0.55)) ** 2;
  if (error > 1 || forward < 0.08) return 0;
  const elapsed = time - (p.actionUntil - C.actionWindow);
  const timing = p.action === action && action !== 'block' && action !== 'pass' && action !== 'dive'
    ? 1 - clamp(Math.abs(elapsed - C.actionWindow * 0.45) / (C.actionWindow * 0.55), 0, 1) * 0.6 : 1;
  return Math.max(0.05, (1 - Math.sqrt(error) * 0.7) * timing);
}
