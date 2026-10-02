import * as T from 'three';
import { C } from './Constants';
import { v3, type Snapshot } from './Types';
import { InputManager } from '../controls/InputManager';
import { Renderer } from '../world/Renderer';
import { UI } from '../ui/UI';
import { GameAudio } from '../audio/Audio';
import { Simulation } from './Simulation';
import { NetworkManager } from '../network/NetworkManager';
import { HostInputs } from '../network/Host';
import { ClientPrediction } from '../network/Client';
import { SnapshotBuffer } from '../network/Interpolation';
import type { Message } from '../network/Protocol';
import { startDive } from '../entities/PlayerMotor';
import { beginAction } from '../volleyball/Actions';
export class Game {
  view: Renderer; ui: UI; input = new InputManager(); audio = new GameAudio();
  simulation?: Simulation; frame?: Snapshot;
  mode: 'menu' | 'solo' | 'ai' | 'host' | 'guest' = 'menu';
  network?: NetworkManager;
  private hostInputs?: HostInputs; private prediction = new ClientPrediction(); private buffer = new SnapshotBuffer();
  private actionSequence = 0; private snapshotAt = 0; private inputAt = 0; private networkTime = 0; private disconnected = false;
  private raf = 0; private last = 0; private accumulator = 0; private sequence = 0;
  private abort = new AbortController(); private projected = new T.Vector3();
  constructor(container: HTMLElement) {
    this.view = new Renderer(container); this.ui = new UI(container); this.input.attach(this.view.renderer.domElement);
    this.ui.setupBindings(this.input.bindings);
    this.ui.onSolo = () => this.startSolo(); this.ui.onResume = () => this.resume(); this.ui.onLeave = () => this.leave();
    this.ui.onMatch = () => this.startMatch();
    this.ui.onReset = () => { if (this.mode === 'guest') this.network?.send({ v: 1, type: 'reset' }, true); else this.simulation?.reset(); this.syncOrientation(); };
    this.ui.onHost = () => { void this.connect('host'); }; this.ui.onJoin = () => { void this.connect('guest'); };
    this.ui.onGenerateAnswer = code => { void this.signal(() => this.network!.acceptOffer(code)); };
    this.ui.onAcceptAnswer = code => { void this.signal(() => this.network!.acceptAnswer(code)); };
    this.ui.onSettings = () => { this.input.sensitivity = Number(this.ui.value('sensitivity')) * 0.002; this.audio.volume = Number(this.ui.value('volume')); this.view.quality(this.ui.value('quality') === 'high'); this.view.setFov(Number(this.ui.value('fov'))); this.simulation?.setDifficulty(this.ui.difficulty()); };
    this.ui.onSettings();
    this.input.onAction = a => {
      if (this.disconnected) return;
      if (this.mode === 'guest') {
        // Send the current aim before its reliable action request.
        this.network?.send({ v: 1, type: 'input', frame: { ...this.input.sample(++this.sequence, false), jump: false } }, true);
        this.network?.send({ v: 1, type: 'action', request: { sequence: ++this.actionSequence, action: a } }, true);
        if (this.prediction.player) { if (a === 'dive') startDive(this.prediction.player, this.input.sample(this.sequence, false), this.networkTime); else if (a === 'bump' || a === 'set' || a === 'spike') beginAction(this.prediction.player, a, this.networkTime); }
      } else { this.simulation?.setInput('host', { ...this.input.sample(this.sequence, false), jump: false }); this.simulation?.action('host', a); }
    };
    this.input.onCommand = key => { if (key === 'KeyV') { this.view.firstPerson = !this.view.firstPerson; this.ui.notice(this.view.firstPerson ? 'First-person view' : 'Third-person view'); } if (key === 'Backquote') this.view.debug = !this.view.debug; if (this.mode !== 'solo') return; if (key === 'KeyR') { this.simulation?.reset(); this.syncOrientation(); } if (key === 'KeyG' || key === 'KeyH') { this.simulation?.feed(key === 'KeyG' ? 'receive' : 'attack'); this.input.yaw = 0; this.input.pitch = 0.15; } };
    document.addEventListener('pointerlockchange', () => { if (this.mode !== 'menu') this.ui.pause(!this.locked); }, { signal: this.abort.signal });
    document.addEventListener('pointerlockerror', () => this.ui.notice('Mouse capture unavailable. Click Enter court again.'), { signal: this.abort.signal });
    this.view.renderer.domElement.addEventListener('click', () => { if (this.mode !== 'menu' && !this.locked) this.resume(); }, { signal: this.abort.signal });
    this.raf = requestAnimationFrame(t => this.animate(t));
  }
  get locked() { return document.pointerLockElement === this.view.renderer.domElement; }
  inspect() { return structuredClone({ mode: this.mode, firstPerson: this.view.firstPerson, fov: this.view.camera.fov, difficulty: this.simulation?.difficulty, camera: this.view.camera.position.toArray(), frame: this.frame, predicted: this.prediction.player, authoritative: this.simulation?.snapshot(), input: this.input.sample(this.sequence, false), locked: this.locked }); }
  private syncOrientation() { this.input.yaw = this.mode === 'guest' ? Math.PI : 0; this.input.pitch = 0; this.input.target = v3(0, C.ballRadius, this.mode === 'guest' ? -1.5 : 1.5); }
  startSolo() {
    this.cleanupSession(); this.mode = 'solo'; this.simulation = new Simulation(true, Number(this.ui.value('points')));
    this.simulation.setDifficulty(this.ui.difficulty()); this.simulation.onEvent = (name, id) => this.event(name, id); this.frame = this.simulation.snapshot(); this.syncOrientation(); this.ui.showPlay(true); this.resume();
  }
  startMatch() {
    this.cleanupSession(); this.mode = 'ai'; this.simulation = new Simulation(false, Number(this.ui.value('points')), { sizes: this.ui.teamSizes(), humanIds: ['host'] });
    this.simulation.setDifficulty(this.ui.difficulty()); this.simulation.onEvent = (name, id) => this.event(name, id); this.frame = this.simulation.snapshot(); this.syncOrientation(); this.ui.showPlay(false); this.resume();
  }
  private event(name: string, id?: string) {
    this.audio.play(name);
    if (id === (this.mode === 'guest' ? 'guest' : 'host') && !name.endsWith('-attempt')) this.ui.notice(['bump', 'set', 'spike', 'block', 'serve'].includes(name) ? `${name[0].toUpperCase()}${name.slice(1)}!` : name);
    if (this.mode === 'host' && this.simulation && !name.endsWith('-attempt')) this.network?.send({ v: 1, type: 'event', name, player: id, state: this.simulation.snapshot() }, true);
  }
  private async connect(role: 'host' | 'guest') {
    this.cleanupSession(); this.mode = 'menu'; this.ui.showConnection(role);
    let network: NetworkManager;
    try { network = new NetworkManager(role); }
    catch (error) { this.ui.status(error instanceof Error ? error.message : 'WebRTC is unavailable in this browser.'); return; }
    this.network = network;
    network.onStatus = message => this.ui.status(message);
    network.onReady = () => this.startOnline(role);
    network.onMessage = message => this.receive(message);
    network.onDisconnect = reason => {
      // A setup failure belongs on the code exchange panel, with its reason.
      if (this.mode === 'menu') { this.ui.status(reason); return; }
      if (this.mode === 'host' && this.simulation && this.network === network) {
        this.simulation.setController('guest', 'ai'); network.dispose(); this.network = undefined; this.hostInputs = undefined;
        this.ui.notice('Your friend left. AI has taken over their slot.'); this.ui.status('AI replaced guest'); return;
      }
      if (this.disconnected) return; this.disconnected = true; this.input.clear();
      if (document.pointerLockElement) document.exitPointerLock();
      this.ui.pause(true); this.ui.el('pause-title').textContent = 'Connection lost'; this.ui.el('pause-copy').textContent = reason;
      this.ui.notice('Disconnected. Leave the court to reconnect.');
    };
    if (role === 'host') await this.signal(() => network.createOffer()); else this.ui.status('Paste an offer to get started.');
  }
  private async signal(operation: () => Promise<string | void>) {
    const network = this.network; this.ui.busy(true);
    try { const code = await operation(); if (this.network === network && code) this.ui.code(code); }
    catch (error) { if (this.network === network) this.ui.status(error instanceof Error ? error.message : 'Connection failed. Try again.'); }
    finally { if (this.network === network) this.ui.busy(false); }
  }
  private startOnline(role: 'host' | 'guest') {
    this.mode = role; this.ui.difficultyEditable(role !== 'guest'); this.syncOrientation(); this.ui.showPlay(false); this.ui.status('Connected');
    if (role === 'host') {
      this.simulation = new Simulation(false, Number(this.ui.value('points')), { sizes: this.ui.teamSizes(), humanIds: ['host', 'guest'] });
      this.simulation.setDifficulty(this.ui.difficulty()); this.simulation.onEvent = (name, id) => this.event(name, id);
      this.hostInputs = new HostInputs((id, input) => this.simulation?.setInput(id, input), (id, action) => this.simulation?.action(id, action), () => { if (this.simulation?.rules.state.phase === 'match-over') this.simulation.reset(); });
      this.frame = this.simulation.snapshot(); this.network?.send({ v: 1, type: 'snapshot', state: this.frame }, true);
    }
  }
  private receive(message: Message) {
    if (this.mode === 'host') { this.hostInputs?.receive(message); return; }
    if (this.mode !== 'guest' || (message.type !== 'snapshot' && message.type !== 'event')) return;
    const state = message.state;
    const immediate = message.type === 'event';
    if (!this.buffer.push(state, performance.now(), immediate)) return;
    this.networkTime = state.timestamp / 1000;
    const player = state.players.find(p => p.id === 'guest');
    if (player) this.prediction.reconcile(player, state.acknowledgedInput, this.networkTime);
    this.frame = state;
    if (message.type === 'event') this.event(message.name, message.player);
  }
  resume() { if (this.disconnected) return; this.audio.unlock(); try { const result = this.view.renderer.domElement.requestPointerLock(); result?.catch(() => this.ui.notice('Click Enter court to capture the mouse.')); } catch { this.ui.notice('Mouse capture requires a desktop browser.'); } }
  leave() { this.ui.difficultyEditable(true); this.cleanupSession(); this.mode = 'menu'; if (document.pointerLockElement) document.exitPointerLock(); this.ui.showMenu(); }
  private cleanupSession() { this.network?.dispose(); this.network = undefined; this.hostInputs = undefined; this.simulation?.dispose(); this.simulation = undefined; this.frame = undefined; this.input.clear(); this.accumulator = 0; this.disconnected = false; this.prediction = new ClientPrediction(); this.buffer = new SnapshotBuffer(); this.snapshotAt = 0; this.inputAt = 0; this.networkTime = 0; }
  private animate(timestamp: number) {
    const delta = Math.min(0.1, Math.max(0, (timestamp - this.last) / 1000)); this.last = timestamp;
    if (this.simulation && !this.disconnected && (this.locked || (this.mode !== 'solo' && this.mode !== 'ai'))) {
      this.accumulator += delta;
      while (this.accumulator >= C.dt) {
        const input = this.input.sample(++this.sequence); if (!this.locked) { input.moveX = 0; input.moveZ = 0; input.jump = false; input.block = false; input.pass = false; }
        this.simulation.setInput('host', input); this.simulation.step(); this.accumulator -= C.dt;
      }
      this.frame = this.simulation.snapshot();
      if (this.mode === 'host' && timestamp - this.snapshotAt >= C.snapshotInterval * 1000) { this.snapshotAt = timestamp; this.network?.send({ v: 1, type: 'snapshot', state: this.frame }); }
    }
    if (this.mode === 'guest' && !this.disconnected) {
      this.accumulator += delta;
      while (this.accumulator >= C.dt) {
        this.networkTime += C.dt;
        const input = this.input.sample(++this.sequence); if (!this.locked) { input.moveX = 0; input.moveZ = 0; input.jump = false; input.block = false; input.pass = false; }
        this.prediction.step(input, C.dt, this.networkTime);
        // Jump edges have their own reliable action sequence; newer motion cannot erase them.
        if (input.jump) this.network?.send({ v: 1, type: 'action', request: { sequence: ++this.actionSequence, action: 'jump' } }, true);
        if (timestamp - this.inputAt >= C.inputInterval * 1000) { this.network?.send({ v: 1, type: 'input', frame: { ...input, jump: false } }); this.inputAt = timestamp; }
        this.accumulator -= C.dt;
      }
      const latest = this.buffer.sample(timestamp); if (latest) { if (this.frame) latest.match = this.frame.match; this.frame = latest; }
    }
    const local = this.mode === 'guest' && this.prediction.player ? this.prediction.display() : this.frame?.players.find(p => p.id === 'host');
    if (local) {
      local.yaw = this.input.yaw; local.pitch = this.input.pitch;
      if (!this.input.targetHeld && this.input.pitch < -0.05) {
        const distance = Math.min(18, (local.position.y + C.eye) / Math.tan(-this.input.pitch));
        this.input.target = { x: Math.max(-4.3, Math.min(4.3, local.position.x - Math.sin(this.input.yaw) * distance)), y: C.ballRadius, z: Math.max(-8.7, Math.min(8.7, local.position.z - Math.cos(this.input.yaw) * distance)) };
      }
      if (!this.disconnected) this.ui.update(this.frame!.match, local, this.frame!.timestamp / 1000, this.input.targetHeld, this.mode === 'solo' ? 'Solo session' : this.mode === 'ai' ? 'Match vs AI' : this.mode === 'host' && !this.network ? 'AI replaced guest' : this.network?.status === 'Connected' ? `Connected / ${Math.round(this.network.rtt)} ms` : this.network?.status ?? 'Disconnected');
      if (this.mode !== 'solo') this.ui.el('mode-label').textContent = `${this.frame!.players.filter(p => p.team === 0).length} vs ${this.frame!.players.filter(p => p.team === 1).length}`;
    }
    const ball = this.frame?.ball ?? { position: v3(0, 0.25, 4), velocity: v3(), rotation: { x: 0, y: 0, z: 0, w: 1 }, angularVelocity: v3() };
    this.view.update(ball, this.frame?.players ?? [], local, this.input.target, this.frame?.timestamp ? this.frame.timestamp / 1000 : 0, this.mode === 'menu');
    if (local) {
      // Project the player's actual aim, not the offset third-person camera center.
      this.projected.set(local.position.x - Math.sin(local.yaw) * Math.cos(local.pitch) * 8, local.position.y + C.eye + Math.sin(local.pitch) * 8, local.position.z - Math.cos(local.yaw) * Math.cos(local.pitch) * 8).project(this.view.camera);
      const crosshair = this.ui.el('crosshair');
      crosshair.style.left = `${50 + this.projected.x * 50}%`; crosshair.style.top = `${50 - this.projected.y * 50}%`;
      this.projected.copy(ball.position).project(this.view.camera);
      const outside = Math.abs(this.projected.x) > 0.85 || Math.abs(this.projected.y) > 0.75 || this.projected.z > 1;
      const guide = this.ui.el('ball-guide'); guide.hidden = !outside;
      const sign = this.projected.z > 1 ? -1 : 1;
      guide.style.left = `${50 + Math.max(-42, Math.min(42, this.projected.x * sign * 45))}%`;
      guide.style.top = `${50 - Math.max(-33, Math.min(33, this.projected.y * sign * 40))}%`;
      const stats = this.ui.el('debug-stats'); stats.hidden = !this.view.debug;
      if (this.view.debug) stats.textContent = `FPS ${Math.round(1 / Math.max(delta, 0.001))}\nPhysics ${this.frame!.tick} @ 60 Hz\nBall ${ball.position.x.toFixed(1)}, ${ball.position.y.toFixed(1)}, ${ball.position.z.toFixed(1)}\nSpeed ${Math.hypot(ball.velocity.x, ball.velocity.y, ball.velocity.z).toFixed(1)} m/s\nGreen bump / yellow set / orange spike\nPurple block / white colliders\nSent ${Math.round((this.network?.sent ?? 0) / 1024)} KB / received ${Math.round((this.network?.received ?? 0) / 1024)} KB`;
    }
    this.raf = requestAnimationFrame(t => this.animate(t));
  }
  dispose() { cancelAnimationFrame(this.raf); this.abort.abort(); this.cleanupSession(); this.input.dispose(); this.audio.dispose(); this.ui.dispose(); this.view.dispose(); }
}
