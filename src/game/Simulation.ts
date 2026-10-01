import { C } from './Constants';
import { clamp, side, v3, type RequestedAction, type InputFrame, type PlayerState, type Snapshot } from './Types';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { createPlayer, movePlayer, startDive } from '../entities/PlayerMotor';
import { createRoster, formation, type TeamSizes } from './Roster';
import { decideTeam, clearsNet } from '../ai/TeamAI';
import { DIFFICULTIES, normalizeDifficulty, applyDifficulty, type Difficulty } from '../ai/Difficulty';
import { neutralInput } from '../controls/InputManager';
import { Rules } from '../volleyball/Rules';
import { beginAction, contactQuality } from '../volleyball/Actions';
import { passVelocity } from '../volleyball/Passing';
import { SERVE_STYLES, serveVelocity, serveContactQuality } from '../volleyball/Serving';
import { calculateArcVelocity, calculateSpikeVelocity, cameraSpikeTarget } from '../volleyball/Trajectory';
export class Simulation {
  physics = new PhysicsWorld(); rules: Rules; players: PlayerState[];
  time = 0; tick = 0; practice: boolean;
  onEvent: (name: string, player?: string) => void = () => {};
  private inputs = new Map<string, { frame: InputFrame; received: number }>();
  private contacts = new Map<string, number>(); private jumps = new Set<string>(); private pointAt = 0;
  private drill: 'receive' | 'attack' | null = null;
  private aiAt = [0, 0]; private touches = 0; private lastPlayer: string | null = null;
  difficulty: [Difficulty, Difficulty] = [{ ...DIFFICULTIES.normal }, { ...DIFFICULTIES.normal }];
  setDifficulty(settings: [Difficulty, Difficulty]) { this.difficulty = [normalizeDifficulty(settings[0]), normalizeDifficulty(settings[1])]; this.aiAt = [0, 0]; }
  aiRoles = new Map<string, string>();
  constructor(practice: boolean, targetScore: number, options?: { sizes?: TeamSizes; humanIds?: string[] }) {
    this.practice = practice; this.rules = new Rules(targetScore);
    this.players = practice ? [createPlayer('host', 0)] : createRoster(options?.sizes ?? [1, 1], options?.humanIds ?? ['host', 'guest']);
    this.prepareServe();
  }
  setInput(id: string, frame: InputFrame) { if (frame.jump) this.jumps.add(id); this.inputs.set(id, { frame: { ...frame, jump: false }, received: this.time }); }
  input(id: string) { const p = this.players.find(p => p.id === id)!; const entry = this.inputs.get(id); return entry && (p.controller === 'ai' || this.time - entry.received < C.inputTimeout) ? entry.frame : neutralInput(p.yaw); }
  setController(id: string, controller: 'human' | 'ai') { const p = this.players.find(p => p.id === id); if (!p) return; p.controller = controller; this.inputs.delete(id); this.jumps.delete(id); this.aiAt = [0, 0]; }
  action(id: string, action: RequestedAction) {
    const p = this.players.find(p => p.id === id); if (!p || this.rules.state.phase === 'match-over') return;
    if (action === 'jump') { this.jumps.add(id); return; }
    if (action === 'dive') { if (startDive(p, this.input(id), this.time)) this.onEvent('dive', id); return; }
    if (action === 'serve-style') { if (p.serve.stage === 'ready') p.serve.style = SERVE_STYLES[(SERVE_STYLES.indexOf(p.serve.style) + 1) % SERVE_STYLES.length]; return; }
    if (action === 'serve-cancel') { if (p.serve.stage === 'charging') p.serve.stage = 'ready'; return; }
    if (action === 'serve-release') {
      if (p.serve.stage !== 'charging' || this.rules.state.phase !== 'serving') return;
      if (Math.abs(p.position.z) < C.courtZ) { p.serve.stage = 'ready'; this.onEvent('Toss from behind the end line', id); return; }
      p.serve.power = clamp(0.25 + (this.time - p.serve.started) / 1.2 * 0.75, 0.25, 1);
      p.serve.stage = 'toss'; p.serve.started = this.time; p.action = 'serve'; p.actionUntil = this.time + 1.5;
      this.physics.reset({ x: p.position.x, y: p.position.y + 1.5, z: p.position.z - side(p.team) * 0.75 });
      this.physics.launch(v3(0, p.serve.style === 'underhand' ? 3.6 : p.serve.style === 'float' ? 5 : 7, 0));
      this.rules.state.reason = 'Toss in air · F to strike'; return;
    }
    if (action === 'serve') {
      if (this.rules.state.phase !== 'serving' || this.players.find(member => member.team === this.rules.state.servingTeam)?.id !== id) return;
      if (p.serve.stage === 'ready') {
        if (Math.abs(p.position.z) < C.courtZ || !p.grounded) { this.onEvent('Start your serve behind the end line', id); return; }
        p.serve.stage = 'charging'; p.serve.started = this.time; this.rules.state.reason = 'Hold F for power · release to toss'; return;
      }
      if (p.serve.stage !== 'toss') return;
      if (p.grounded && Math.abs(p.position.z) < C.courtZ) { this.onEvent('Stay behind the end line to serve', id); return; }
      const ball = this.physics.state(); const quality = serveContactQuality(p, ball.position);
      if (!quality) { this.onEvent(p.serve.style === 'topspin' && p.grounded ? 'Jump to strike the topspin serve' : 'Move into reach of the toss', id); return; }
      this.physics.launch(serveVelocity(ball.position, this.input(id).yaw, this.input(id).pitch, p.team, p.serve.style, p.serve.power, quality));
      this.physics.ball.setAngvel(p.serve.style === 'float' ? v3() : v3(-side(p.team) * (p.serve.style === 'topspin' ? 25 : 5), 0, 0), true);
      p.serve.stage = 'ready'; p.action = 'serve'; p.actionUntil = this.time + 0.45;
      this.rules.beginRally(p.team, true); this.contacts.set(id, this.time); this.touches = 1; this.lastPlayer = id; this.onEvent('serve', id);
      return;
    }
    if (!this.rules.canAttackServe(action)) { this.onEvent('Receive the serve before attacking', id); return; }
    if (this.rules.state.phase === 'rally' && beginAction(p, action, this.time)) this.onEvent(`${action}-attempt`, id);
  }
  step() {
    this.time += C.dt; this.tick++;
    if (!this.practice) for (const team of [0, 1] as const) if (this.time >= this.aiAt[team]) {
      this.aiAt[team] = this.time + this.difficulty[team].reaction;
      for (const raw of decideTeam({ players: this.players, ball: this.physics.state(), team, time: this.time, phase: this.rules.state.phase, servingTeam: this.rules.state.servingTeam, lastTeam: this.rules.lastTouch, lastPlayer: this.lastPlayer, touches: this.touches, serveProtected: this.rules.serveProtected })) {
        const decision = applyDifficulty(raw, this.difficulty[team], this.time);
        this.aiRoles.set(decision.id, decision.role); this.setInput(decision.id, decision.input);
        if (decision.action) this.action(decision.id, decision.action);
      }
    }
    for (const p of this.players) {
      const input = { ...this.input(p.id), jump: this.jumps.delete(p.id) };
      if (this.rules.serveProtected) input.block = false;
      if (this.rules.state.phase === 'serving' && p.serve.stage === 'toss' && p.grounded && Math.abs(p.position.z) < C.courtZ) input.jump = false;
      movePlayer(p, input, C.dt, this.time); this.physics.syncPlayer(p);
    }
    if (this.rules.state.phase === 'serving') {
      const server = this.players.find(p => p.team === this.rules.state.servingTeam)!;
      if (server.serve.stage === 'charging') server.serve.power = clamp(0.25 + (this.time - server.serve.started) / 1.2 * 0.75, 0.25, 1);
      if (server.serve.stage !== 'toss') {
        this.physics.reset({ x: server.position.x, y: server.position.y + 1.5, z: server.position.z - side(server.team) * 0.75 }); return;
      }
      if (this.time - server.serve.started > 2.5 || this.physics.state().position.y < 0.3) {
        if (this.practice) { this.rules.state.phase = 'point'; this.rules.state.reason = 'Missed toss · try again'; }
        else { this.rules.beginRally(server.team, true); this.rules.award(server.team === 0 ? 1 : 0, 'Missed serve'); }
        this.pointAt = this.time; server.serve.stage = 'ready'; this.onEvent('point');
      }
    }
    if (this.rules.state.phase === 'rally') {
      for (const p of this.players) {
        if (this.time - (this.contacts.get(p.id) ?? -Infinity) < C.contactGap) continue;
        const action = p.action;
        if (!action || action === 'serve' || (action !== 'block' && action !== 'pass' && this.time > p.actionUntil)) continue;
        if (!this.rules.canAttackServe(action)) continue;
        const ball = this.physics.state();
        if (action === 'block' && (Math.sign(ball.velocity.z) !== side(p.team) || this.rules.lastTouch === p.team)) continue;
        const quality = contactQuality(p, ball.position, action, this.time); if (!quality) continue;
        const target = { ...this.input(p.id).target };
        let velocity;
        if (action === 'pass' || action === 'bump' || action === 'dive') { velocity = passVelocity(p, ball.velocity, this.time, quality); if (!velocity) continue; }
        else if (action === 'block') velocity = { x: ball.velocity.x * 0.7 + (ball.position.x - p.position.x) * 3, y: ball.position.y > p.position.y + 2.35 ? -3 : 4, z: -side(p.team) * Math.max(4, Math.abs(ball.velocity.z) * 0.65) };
        else if (action === 'spike') {
          const aimed = cameraSpikeTarget(ball.position, p.yaw, p.pitch, p.team, target); velocity = calculateSpikeVelocity(ball.position, aimed, -p.pitch, quality);
          // Recheck at contact: the ball can move during the AI decision/swing window.
          if (p.controller === 'ai' && !clearsNet(ball.position, velocity)) { p.actionUntil = this.time; continue; }
        }
        else {
          target.y = action === 'set' ? 2.65 : 1.3;
          // Sets stay on our side for an approach; bumps can be aimed across court.
          if (action === 'set') target.z = side(p.team) * clamp(Math.abs(target.z), 1.3, 5);
          target.x = clamp(target.x + Math.sin(this.tick * 1.73) * (1 - quality) * 0.9, -4.3, 4.3);
          velocity = calculateArcVelocity(ball.position, target, action === 'set' ? C.setApex : C.bumpApex);
        }
        this.physics.launch(velocity); this.recordTouch(p, action === 'block'); this.contacts.set(p.id, this.time); this.onEvent(action === 'dive' || action === 'pass' ? 'bump' : action, p.id);
      }
    }
    this.physics.step(kind => {
      if (kind === 'floor') { this.onEvent('floor'); if (this.rules.state.phase === 'rally') this.finishFloor(); }
      else if (kind === 'net') this.onEvent('net');
      else { const p = this.players.find(p => p.id === kind); if (p && this.rules.state.phase === 'rally' && this.time - (this.contacts.get(p.id) ?? -Infinity) > C.contactGap) { this.recordTouch(p); this.contacts.set(p.id, this.time); this.onEvent('bump', p.id); } }
    });
    const ball = this.physics.state();
    this.rules.track(ball.position.z);
    if (this.rules.state.phase === 'rally' && (ball.position.y < 0.1 || Math.abs(ball.position.x) > 14 || Math.abs(ball.position.z) > 17.5)) this.finishFloor();
    if (this.rules.state.phase === 'point' && this.time - this.pointAt >= C.pointDelay) {
      if (this.practice && this.drill) this.feed(this.drill); else this.prepareServe();
    }
  }
  private recordTouch(p: PlayerState, block = false) { this.touches = block ? 0 : this.rules.lastTouch === p.team ? this.touches + 1 : 1; this.lastPlayer = p.id; this.rules.touch(p.team); }
  private finishFloor() {
    if (this.rules.state.phase !== 'rally') return;
    if (this.practice) { this.rules.state.phase = 'point'; this.rules.state.reason = 'Ball down · R to reset, G for receive, H for attack'; }
    else this.rules.floorContact(this.physics.state().position);
    this.pointAt = this.time; this.onEvent('point');
  }
  prepareServe() {
    if (this.practice) this.rules.state.servingTeam = 0;
    this.rules.state.phase = 'serving'; this.rules.state.reason = 'F to charge · release to toss · F to strike'; this.rules.serveProtected = false; this.contacts.clear(); this.jumps.clear();
    this.touches = 0; this.lastPlayer = null;
    for (const team of [0, 1] as const) {
      const members = this.players.filter(p => p.team === team);
      members.forEach((p, slot) => { const controller = p.controller, style = p.serve.style; Object.assign(p, createPlayer(p.id, p.team)); p.controller = controller; p.serve.style = style; p.position = formation(team, slot, members.length); if (team === this.rules.state.servingTeam && slot === 0) p.position.z = side(team) * 10; });
    }
    const p = this.players.find(p => p.team === this.rules.state.servingTeam)!;
    this.physics.reset(v3(p.position.x, 1.5, p.position.z - side(p.team) * 0.75));
  }
  feed(kind: 'receive' | 'attack') {
    if (!this.practice) return;
    this.drill = kind; this.rules.serveProtected = false;
    const p = this.players[0]; p.position = v3(0, 0, kind === 'attack' ? 2.2 : 5.5); p.velocity = v3();
    const from = kind === 'receive' ? v3(0, 3.2, -7) : v3(0, 3.8, 2.4);
    this.physics.reset(from); this.physics.launch(calculateArcVelocity(from, v3(0, kind === 'attack' ? 3.1 : 1, kind === 'attack' ? 1.4 : 4.7), kind === 'attack' ? 6.3 : 5));
    this.rules.beginRally(1); this.rules.state.reason = kind === 'attack' ? 'Attack drill · Track, jump, E to spike' : 'Receive drill · Hold LMB to pass, release to swing'; this.contacts.clear(); this.jumps.clear();
  }
  reset() { this.rules.reset(); this.drill = null; this.prepareServe(); this.onEvent('reset'); }
  snapshot(): Snapshot { return { tick: this.tick, timestamp: this.time * 1000, acknowledgedInput: this.inputs.get('guest')?.frame.sequence ?? 0, players: structuredClone(this.players), ball: this.physics.state(), match: structuredClone(this.rules.state) }; }
  dispose() { this.physics.dispose(); this.inputs.clear(); }
}
