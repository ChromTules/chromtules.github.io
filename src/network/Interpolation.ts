import { C } from '../game/Constants';
import type { Snapshot, Vec3 } from '../game/Types';
export const interpolateAngle = (a: number, b: number, t: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), z: mix(a.z, b.z, t) });
export class SnapshotBuffer {
  private frames: Snapshot[] = []; private offset = 0;
  push(state: Snapshot, arrival: number, immediate = false) {
    const last = this.frames.at(-1);
    if (last && state.tick <= last.tick && !immediate) return false;
    if (last && state.tick < last.tick) return false;
    this.offset = arrival - state.timestamp;
    if (immediate) this.frames = [];
    this.frames.push(structuredClone(state)); if (this.frames.length > 30) this.frames.shift(); return true;
  }
  sample(now: number): Snapshot | undefined {
    if (!this.frames.length) return;
    const time = now - this.offset - C.interpolationDelay;
    let a = this.frames[0], b = a;
    for (const frame of this.frames) { if (frame.timestamp <= time) a = frame; if (frame.timestamp >= time) { b = frame; break; } b = frame; }
    const out = structuredClone(a);
    if (a === b) {
      const dt = Math.max(0, Math.min(C.extrapolationLimit, time - a.timestamp)) / 1000;
      if (a.match.phase === 'rally') { out.ball.position.x += a.ball.velocity.x * dt; out.ball.position.z += a.ball.velocity.z * dt; out.ball.position.y += a.ball.velocity.y * dt - 0.5 * C.gravity * dt * dt; }
      return out;
    }
    const t = Math.max(0, Math.min(1, (time - a.timestamp) / (b.timestamp - a.timestamp)));
    out.ball.position = lerp(a.ball.position, b.ball.position, t); out.ball.velocity = lerp(a.ball.velocity, b.ball.velocity, t);
    // Quaternion nlerp with hemisphere correction avoids spinning through the long arc.
    const qa = a.ball.rotation, qb = b.ball.rotation;
    const sign = qa.x * qb.x + qa.y * qb.y + qa.z * qb.z + qa.w * qb.w < 0 ? -1 : 1;
    const q = { x: mix(qa.x, qb.x * sign, t), y: mix(qa.y, qb.y * sign, t), z: mix(qa.z, qb.z * sign, t), w: mix(qa.w, qb.w * sign, t) };
    const length = Math.hypot(q.x, q.y, q.z, q.w) || 1; out.ball.rotation = { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };
    out.players = a.players.map(p => { const next = b.players.find(n => n.id === p.id); return next ? { ...p, position: lerp(p.position, next.position, t), yaw: interpolateAngle(p.yaw, next.yaw, t), pitch: mix(p.pitch, next.pitch, t) } : p; });
    out.timestamp = time; return out;
  }
}
