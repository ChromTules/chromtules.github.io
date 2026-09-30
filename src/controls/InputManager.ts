import { v3, type InputFrame, type Action, type Vec3 } from '../game/Types';
export const neutralInput = (yaw: number): InputFrame => ({ sequence: 0, moveX: 0, moveZ: 0, yaw, pitch: 0, jump: false, target: v3(0, 0.21, -5) });
export class InputManager {
  private keys = new Set<string>();
  private abort = new AbortController();
  yaw = 0; pitch = 0; sensitivity = 0.002; target: Vec3 = v3(0, 0.21, -5); targetHeld = false;
  onAction: (a: Action) => void = () => {};
  onCommand: (key: string) => void = () => {};
  setKey(key: string, down: boolean) { if (down) this.keys.add(key); else this.keys.delete(key); }
  attach(canvas: HTMLCanvasElement) {
    const options = { signal: this.abort.signal };
    window.addEventListener('keydown', e => {
      if (document.pointerLockElement !== canvas) return;
      if (['Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) e.preventDefault();
      this.setKey(e.code, true);
      if (e.repeat) return;
      const actions: Record<string, Action> = { KeyE: 'spike', KeyF: 'serve', ShiftLeft: 'dive', ShiftRight: 'dive' };
      if (actions[e.code]) this.onAction(actions[e.code]);
      if (e.code === 'KeyT') this.targetHeld = !this.targetHeld;
      if (['KeyR', 'KeyG', 'KeyH', 'Backquote'].includes(e.code)) this.onCommand(e.code);
    }, options);
    window.addEventListener('keyup', e => this.setKey(e.code, false), options);
    window.addEventListener('blur', () => this.clear(), options);
    document.addEventListener('pointerlockchange', () => this.clear(), options);
    canvas.addEventListener('contextmenu', e => e.preventDefault(), options);
    canvas.addEventListener('mousedown', e => { if (document.pointerLockElement === canvas) this.onAction(e.button === 2 ? 'set' : 'bump'); }, options);
    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement !== canvas) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch - e.movementY * this.sensitivity));
    }, options);
  }
  sample(sequence: number): InputFrame {
    const frame = { sequence, moveX: Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')), moveZ: Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS')), yaw: this.yaw, pitch: this.pitch, jump: this.keys.has('Space'), target: { ...this.target } };
    this.keys.delete('Space');
    return frame;
  }
  clear() { this.keys.clear(); }
  dispose() { this.abort.abort(); this.clear(); }
}
