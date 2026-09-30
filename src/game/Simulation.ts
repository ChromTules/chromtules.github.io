import { C } from './Constants';
import { clamp, side, v3, type RequestedAction, type InputFrame, type PlayerState, type Snapshot } from './Types';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { createPlayer, movePlayer, startDive } from '../entities/PlayerMotor';
import { neutralInput } from '../controls/InputManager';
import { Rules } from '../volleyball/Rules';
import { beginAction, contactQuality } from '../volleyball/Actions';
import { calculateArcVelocity, calculateServeVelocity, calculateSpikeVelocity } from '../volleyball/Trajectory';
export class Simulation {
  physics = new PhysicsWorld(); rules: Rules; players: PlayerState[];
  time = 0; tick = 0; practice: boolean;
  onEvent: (name: string, player?: string) => void = () => {};
  private inputs = new Map<string, { frame: InputFrame; received: number }>();
  private contacts = new Map<string, number>(); private jumps = new Set<string>(); private pointAt = 0; private tossUntil = 0;
  private practiceFeedAt = 0; private drill: 'receive' | 'attack' | null = null;
  constructor(practice: boolean, targetScore: number) {
    this.practice = practice; this.rules = new Rules(targetScore);
    this.players = [createPlayer('host', 0), ...(!practice ? [createPlayer('guest', 1)] : [])];
    this.prepareServe();
  }
  setInput(id: string, frame: InputFrame) { if (frame.jump) this.jumps.add(id); this.inputs.set(id, { frame: { ...frame, jump: false }, received: this.time }); }
  input(id: string) { const p = this.players.find(p => p.id === id)!; const entry = this.inputs.get(id); return entry && this.time - entry.received < C.inputTimeout ? entry.frame : neutralInput(p.yaw); }
  action(id: string, action: RequestedAction) {
    const p = this.players.find(p => p.id === id); if (!p || this.rules.state.phase === 'match-over') return;
    if (action === 'jump') { this.jumps.add(id); return; }
    if (action === 'dive') { if (startDive(p, this.input(id), this.time)) this.onEvent('dive', id); return; }
    if (action === 'serve') {
      if (this.rules.state.phase !== 'serving' || p.team !== this.rules.state.servingTeam || this.tossUntil) return;
      if (Math.abs(p.position.z) < C.courtZ) { this.onEvent('Move behind the end line to serve', id); return; }
      p.action = 'serve'; p.actionUntil = this.time + 0.5; this.tossUntil = this.time + 0.45;
      this.physics.reset({ x: p.position.x, y: 1.9, z: p.position.z - side(p.team) * 0.8 }); this.physics.launch(v3(0, 4, 0));
      return;
    }
    if (this.rules.state.phase === 'rally' && beginAction(p, action, this.time)) this.onEvent(`${action}-attempt`, id);
  }
  step() {
    this.time += C.dt; this.tick++;
    for (const p of this.players) { const input = { ...this.input(p.id), jump: this.jumps.delete(p.id) }; movePlayer(p, input, C.dt, this.time); this.physics.syncPlayer(p); }
    if (this.rules.state.phase === 'serving' && !this.tossUntil) {
      const server = this.players.find(p => p.team === this.rules.state.servingTeam)!;
      this.physics.reset({ x: server.position.x, y: 1.5, z: server.position.z - side(server.team) * 0.75 });
      return;
    }
    if (this.tossUntil && this.time >= this.tossUntil) {
      const server = this.players.find(p => p.team === this.rules.state.servingTeam)!;
      const target = { ...this.input(server.id).target, y: C.ballRadius };
      target.z = -side(server.team) * clamp(Math.abs(target.z), 3, 8);
      this.physics.launch(calculateServeVelocity(this.physics.state().position, target));
      this.rules.beginRally(server.team); this.contacts.set(server.id, this.time); this.tossUntil = 0; this.onEvent('serve', server.id);
    }
    if (this.rules.state.phase === 'rally') {
      for (const p of this.players) {
        if (this.time - (this.contacts.get(p.id) ?? -Infinity) < C.contactGap) continue;
        const action = p.action;
        if (!action || action === 'serve' || (action !== 'block' && this.time > p.actionUntil)) continue;
        const ball = this.physics.state();
        if (action === 'block' && (Math.sign(ball.velocity.z) !== side(p.team) || this.rules.lastTouch === p.team)) continue;
        const quality = contactQuality(p, ball.position, action, this.time); if (!quality) continue;
        const target = { ...this.input(p.id).target };
        let velocity;
        if (action === 'block') velocity = { x: ball.velocity.x * 0.7 + (ball.position.x - p.position.x) * 3, y: ball.position.y > p.position.y + 2.35 ? -3 : 4, z: -side(p.team) * Math.max(4, Math.abs(ball.velocity.z) * 0.65) };
        else if (action === 'spike') { target.z = -side(p.team) * clamp(Math.abs(target.z), 1, 9); velocity = calculateSpikeVelocity(ball.position, target, -p.pitch, quality); }
        else {
          target.y = action === 'set' ? 2.65 : 1.3;
          // Sets stay on our side for an approach; bumps can be aimed across court.
          if (action === 'set') target.z = side(p.team) * clamp(Math.abs(target.z), 1.3, 5);
          target.x = clamp(target.x + Math.sin(this.tick * 1.73) * (1 - quality) * 0.9, -4.3, 4.3);
          velocity = calculateArcVelocity(ball.position, target, action === 'set' ? C.setApex : C.bumpApex);
        }
        this.physics.launch(velocity); this.rules.touch(p.team); this.contacts.set(p.id, this.time); p.actionUntil = this.time; this.onEvent(action === 'dive' ? 'bump' : action, p.id);
      }
    }
    this.physics.step(kind => {
      if (kind === 'floor') { this.onEvent('floor'); if (this.rules.state.phase === 'rally') this.finishFloor(); }
      else if (kind === 'net') this.onEvent('net');
      else { const p = this.players.find(p => p.id === kind); if (p && this.rules.state.phase === 'rally' && this.time - (this.contacts.get(p.id) ?? -Infinity) > C.contactGap) { this.rules.touch(p.team); this.contacts.set(p.id, this.time); this.onEvent('bump', p.id); } }
    });
    const ball = this.physics.state();
    this.rules.track(ball.position.z);
    if (this.rules.state.phase === 'rally' && (ball.position.y < 0.1 || Math.abs(ball.position.x) > 14 || Math.abs(ball.position.z) > 17.5)) this.finishFloor();
    if (this.rules.state.phase === 'point' && this.time - this.pointAt >= C.pointDelay) {
      if (this.practice && this.drill) this.feed(this.drill); else this.prepareServe();
    }
    if (this.practiceFeedAt && this.time >= this.practiceFeedAt) { this.practiceFeedAt = 0; this.feed(this.drill ?? 'receive'); }
  }
  private finishFloor() {
    if (this.rules.state.phase !== 'rally') return;
    if (this.practice) { this.rules.state.phase = 'point'; this.rules.state.reason = 'Ball down · R to reset, G for receive, H for attack'; }
    else this.rules.floorContact(this.physics.state().position);
    this.pointAt = this.time; this.onEvent('point');
  }
  prepareServe() {
    if (this.practice) this.rules.state.servingTeam = 0;
    this.rules.state.phase = 'serving'; this.rules.state.reason = 'F to toss & serve'; this.tossUntil = 0; this.contacts.clear(); this.jumps.clear();
    for (const p of this.players) { Object.assign(p, createPlayer(p.id, p.team)); if (p.team === this.rules.state.servingTeam) p.position.z = side(p.team) * 10; }
    const p = this.players.find(p => p.team === this.rules.state.servingTeam)!;
    this.physics.reset(v3(p.position.x, 1.5, p.position.z - side(p.team) * 0.75));
  }
  feed(kind: 'receive' | 'attack') {
    if (!this.practice) return;
    this.drill = kind; this.tossUntil = 0;
    const p = this.players[0]; p.position = v3(0, 0, kind === 'attack' ? 2.2 : 5.5); p.velocity = v3();
    const from = kind === 'receive' ? v3(0, 3.2, -7) : v3(0, 3.8, 2.4);
    this.physics.reset(from); this.physics.launch(calculateArcVelocity(from, v3(0, kind === 'attack' ? 3.1 : 1, kind === 'attack' ? 1.4 : 4.7), kind === 'attack' ? 6.3 : 5));
    this.rules.beginRally(1); this.rules.state.reason = kind === 'attack' ? 'Attack drill · Track, jump, E to spike' : 'Receive drill · Left click, then right click to set'; this.contacts.clear(); this.jumps.clear();
  }
  reset() { this.rules.reset(); this.drill = null; this.prepareServe(); this.onEvent('reset'); }
  snapshot(): Snapshot { return { tick: this.tick, timestamp: this.time * 1000, acknowledgedInput: this.inputs.get('guest')?.frame.sequence ?? 0, players: structuredClone(this.players), ball: this.physics.state(), match: structuredClone(this.rules.state) }; }
  dispose() { this.physics.dispose(); this.inputs.clear(); }
}
