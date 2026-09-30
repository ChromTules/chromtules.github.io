import { movePlayer } from '../entities/PlayerMotor';
import type { InputFrame, PlayerState, Vec3 } from '../game/Types';
export class ClientPrediction {
  player?: PlayerState;
  private pending: { input: InputFrame; dt: number; time: number }[] = [];
  private offset: Vec3 = { x: 0, y: 0, z: 0 };
  get pendingCount() { return this.pending.length; }
  step(input: InputFrame, dt: number, time: number) {
    if (!this.player) return;
    this.pending.push({ input: structuredClone(input), dt, time }); if (this.pending.length > 120) this.pending.shift();
    movePlayer(this.player, input, dt, time);
    const decay = Math.exp(-18 * dt); this.offset.x *= decay; this.offset.y *= decay; this.offset.z *= decay;
  }
  reconcile(authoritative: PlayerState, acknowledged: number, _time: number) {
    const old = this.player ? this.display().position : undefined;
    this.pending = this.pending.filter(p => p.input.sequence > acknowledged);
    this.player = structuredClone(authoritative);
    for (const step of this.pending) movePlayer(this.player, step.input, step.dt, step.time);
    if (old) {
      const delta = { x: old.x - this.player.position.x, y: old.y - this.player.position.y, z: old.z - this.player.position.z };
      this.offset = Math.hypot(delta.x, delta.y, delta.z) < 1.5 ? delta : { x: 0, y: 0, z: 0 };
    }
  }
  display(): PlayerState {
    const p = structuredClone(this.player!); p.position.x += this.offset.x; p.position.y += this.offset.y; p.position.z += this.offset.z; return p;
  }
}
