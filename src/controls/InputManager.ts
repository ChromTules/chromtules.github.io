import { v3, type InputFrame, type Action, type Vec3 } from '../game/Types';
import { KeyBindings, type Binding } from './KeyBindings';
export const neutralInput = (yaw: number): InputFrame => ({ sequence: 0, moveX: 0, moveZ: 0, yaw, pitch: 0, jump: false, block: false, pass: false, target: v3(0, 0.21, -5) });
export class InputManager {
  private keys = new Set<string>();
  private abort = new AbortController();
  bindings = new KeyBindings();
  yaw = 0; pitch = 0; sensitivity = 0.002; target: Vec3 = v3(0, 0.21, -5); targetHeld = false;
  onAction: (a: Action) => void = () => {};
  onCommand: (key: string) => void = () => {};
  private get passing() { return this.keys.has(this.bindings.code('bump')) || this.keys.has('Mouse0'); }
  setKey(key: string, down: boolean) { const wasPassing = this.passing; if (down) this.keys.add(key); else this.keys.delete(key); if (wasPassing && !this.passing) this.onAction('bump'); }
  attach(canvas: HTMLCanvasElement) {
    const options = { signal: this.abort.signal };
    window.addEventListener('keydown', e => {
      if (document.pointerLockElement !== canvas) return;
      if ((['forward', 'backward', 'left', 'right', 'jump', 'block', 'dive'] as Binding[]).some(b => this.bindings.matches(b, e.code))) e.preventDefault();
      this.setKey(e.code, true);
      if (e.repeat) return;
      for (const action of ['set', 'spike', 'serve', 'dive'] as const) if (this.bindings.matches(action, e.code)) this.onAction(action);
      if (this.bindings.matches('target', e.code)) this.targetHeld = !this.targetHeld;
      const commands = { reset: 'KeyR', receive: 'KeyG', attack: 'KeyH', debug: 'Backquote', camera: 'KeyV' };
      for (const key of Object.keys(commands) as (keyof typeof commands)[]) if (this.bindings.matches(key, e.code)) this.onCommand(commands[key]);
    }, options);
    window.addEventListener('keyup', e => this.setKey(e.code, false), options);
    window.addEventListener('blur', () => this.clear(), options);
    document.addEventListener('pointerlockchange', () => this.clear(), options);
    canvas.addEventListener('contextmenu', e => e.preventDefault(), options);
    canvas.addEventListener('mousedown', e => { if (document.pointerLockElement !== canvas) return; if (e.button === 0) this.setKey('Mouse0', true); else if (e.button === 2) this.onAction('set'); }, options);
    window.addEventListener('mouseup', e => { if (e.button === 0) this.setKey('Mouse0', false); }, options);
    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement !== canvas) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch - e.movementY * this.sensitivity));
    }, options);
  }
  sample(sequence: number, consumeJump = true): InputFrame {
    const held = (binding: Binding) => this.keys.has(this.bindings.code(binding));
    const frame = { sequence, moveX: Number(held('right')) - Number(held('left')), moveZ: Number(held('forward')) - Number(held('backward')), yaw: this.yaw, pitch: this.pitch, jump: held('jump'), block: held('block'), pass: this.passing, target: { ...this.target } };
    if (consumeJump) this.keys.delete(this.bindings.code('jump'));
    return frame;
  }
  clear() { this.keys.clear(); }
  dispose() { this.abort.abort(); this.clear(); }
}
