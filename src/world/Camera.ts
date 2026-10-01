import { C } from '../game/Constants';
import { clamp, type PlayerState } from '../game/Types';

export function cameraPose(p: PlayerState, firstPerson: boolean, time: number) {
  const eye = p.position.y + (time < p.diveUntil ? 0.72 : C.eye);
  if (firstPerson) return { position: { x: p.position.x, y: eye, z: p.position.z }, yaw: p.yaw, pitch: p.pitch };
  // A shoulder offset keeps the platform and ball visible. Aim remains player-relative.
  const distance = 4.2, pitch = clamp(p.pitch - 0.18, -1.2, 1.05);
  return { position: {
    x: clamp(p.position.x + Math.sin(p.yaw) * Math.cos(pitch) * distance + Math.cos(p.yaw) * 0.55, -12.5, 12.5),
    y: clamp(eye + 0.7 - Math.sin(pitch) * distance, 0.5, 10),
    z: clamp(p.position.z + Math.cos(p.yaw) * Math.cos(pitch) * distance - Math.sin(p.yaw) * 0.55, -16.5, 16.5),
  }, yaw: p.yaw, pitch };
}
