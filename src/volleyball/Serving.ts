import { C } from '../game/Constants';
import { clamp, side, type PlayerState, type ServeStyle, type Team, type Vec3 } from '../game/Types';
export const SERVE_STYLES: ServeStyle[] = ['underhand', 'float', 'topspin'];
export function serveContactQuality(p: PlayerState, ball: Vec3) {
  if (p.serve.style === 'topspin' && p.grounded) return 0;
  const height = ball.y - p.position.y;
  const horizontal = Math.hypot(ball.x - p.position.x, ball.z - p.position.z);
  if (horizontal > 1.4 || height < (p.serve.style === 'underhand' ? 0.5 : 1.4) || height > 3.5) return 0;
  const ideal = p.serve.style === 'underhand' ? 1.6 : 2.5;
  return clamp(1 - Math.abs(height - ideal) * 0.45, 0.15, 1);
}
export function serveVelocity(from: Vec3, yaw: number, pitch: number, team: Team, style: ServeStyle, power: number, quality: number): Vec3 {
  const relative = Math.atan2(Math.sin(yaw - (team ? Math.PI : 0)), Math.cos(yaw - (team ? Math.PI : 0)));
  const angle = clamp(relative, -0.5, 0.5) + (1 - quality) * 0.08 * Math.sin(yaw * 7 + power * 9);
  const depth = clamp(5.5 + power * 2 - Math.max(0, -pitch) * 4, 2, 8.5);
  const targetZ = -side(team) * depth;
  const targetX = from.x - side(team) * Math.tan(angle) * Math.abs(targetZ - from.z);
  const flight = (style === 'underhand' ? 2.15 : style === 'float' ? 1.85 : 1.5) - clamp(power, 0, 1) * 0.35;
  return { x: (targetX - from.x) / flight, y: (C.ballRadius - from.y + 0.5 * C.gravity * flight * flight) / flight, z: (targetZ - from.z) / flight };
}
