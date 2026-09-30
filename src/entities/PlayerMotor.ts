import { C } from '../game/Constants';
import { clamp, side, v3, type InputFrame, type PlayerState, type Team } from '../game/Types';
export function createPlayer(id: string, team: Team): PlayerState {
  return { id, team, position: v3(0, 0, side(team) * 6), velocity: v3(), yaw: team === 0 ? 0 : Math.PI, pitch: 0, grounded: true, action: null, actionUntil: 0, cooldownUntil: 0, diveUntil: 0, diveReady: 0 };
}
export function movePlayer(p: PlayerState, i: InputFrame, dt: number, time: number) {
  p.yaw = i.yaw; p.pitch = i.pitch;
  const length = Math.max(1, Math.hypot(i.moveX, i.moveZ));
  const x = (Math.cos(i.yaw) * i.moveX - Math.sin(i.yaw) * i.moveZ) / length;
  const z = (-Math.sin(i.yaw) * i.moveX - Math.cos(i.yaw) * i.moveZ) / length;
  if (time >= p.diveUntil) {
    const approach = (v: number, target: number) => v + clamp(target - v, -C.acceleration * dt, C.acceleration * dt);
    p.velocity.x = approach(p.velocity.x, x * C.speed); p.velocity.z = approach(p.velocity.z, z * C.speed);
  }
  if (i.jump && p.grounded && time >= p.diveUntil) { p.velocity.y = C.jumpSpeed; p.grounded = false; }
  p.velocity.y -= C.gravity * dt;
  p.position.x = clamp(p.position.x + p.velocity.x * dt, -C.runX + C.playerRadius, C.runX - C.playerRadius);
  p.position.z = clamp(p.position.z + p.velocity.z * dt, p.team === 0 ? 0.42 : -C.runZ, p.team === 0 ? C.runZ : -0.42);
  p.position.y = Math.max(0, p.position.y + p.velocity.y * dt);
  p.grounded = p.position.y === 0;
  if (p.grounded) p.velocity.y = 0;
  if (time > p.actionUntil) p.action = !p.grounded && Math.abs(p.position.z) < 1.15 ? 'block' : null;
}
export function startDive(p: PlayerState, input: InputFrame, time: number): boolean {
  if (time < p.diveReady || !p.grounded) return false;
  let x = input.moveX, z = input.moveZ;
  if (!x && !z) z = 1;
  const n = Math.hypot(x, z);
  p.velocity.x = (Math.cos(input.yaw) * x - Math.sin(input.yaw) * z) / n * C.diveSpeed;
  p.velocity.z = (-Math.sin(input.yaw) * x - Math.cos(input.yaw) * z) / n * C.diveSpeed;
  p.diveUntil = time + C.diveDuration; p.diveReady = time + C.diveCooldown;
  p.action = 'dive'; p.actionUntil = p.diveUntil;
  return true;
}
