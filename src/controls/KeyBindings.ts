export const DEFAULT_BINDINGS = {
  forward: 'KeyW', backward: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', block: 'KeyQ',
  bump: 'KeyZ', set: 'KeyX', spike: 'KeyE', dive: 'ShiftLeft', serve: 'KeyF', target: 'KeyT',
  reset: 'KeyR', receive: 'KeyG', attack: 'KeyH', debug: 'Backquote', camera: 'KeyV',
} as const;
export type Binding = keyof typeof DEFAULT_BINDINGS;
type Mapping = Record<Binding, string>;
export const BINDING_LABELS: Record<Binding, string> = { forward: 'Move forward', backward: 'Move backward', left: 'Move left', right: 'Move right', jump: 'Jump', block: 'Hold block', bump: 'Hold pass / release swing (also LMB)', set: 'Set (also right click)', spike: 'Spike', dive: 'Dive', serve: 'Serve', target: 'Hold target', reset: 'Reset practice', receive: 'Receive drill', attack: 'Attack drill', debug: 'Debug view', camera: 'Toggle camera' };
const validKey = (code: unknown): code is string => typeof code === 'string' && /^(Key[A-Z]|Digit[0-9]|Space|ShiftLeft|ShiftRight|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backquote|Enter|BracketLeft|BracketRight|Semicolon|Quote|Comma|Period|Slash|Backslash|Minus|Equal)$/.test(code);
export class KeyBindings {
  private mapping: Mapping = { ...DEFAULT_BINDINGS };
  static storageKey = 'sideout.keyBindings.v1';
  constructor() { try { if (typeof localStorage !== 'undefined') this.mapping = KeyBindings.parse(localStorage.getItem(KeyBindings.storageKey) ?? ''); } catch { /* Storage is optional. */ } }
  static parse(raw: string): Mapping {
    try {
      const m = JSON.parse(raw); const keys = Object.keys(DEFAULT_BINDINGS) as Binding[];
      if (m && typeof m === 'object' && !Array.isArray(m) && !('camera' in m)) {
        // Extend previous saved mappings without stealing an already assigned key.
        m.camera = ['KeyV', 'KeyC', ...Array.from({ length: 26 }, (_, i) => `Key${String.fromCharCode(65 + i)}`)].find(code => !Object.values(m).includes(code));
      }
      if (!m || !keys.every(k => validKey(m[k])) || new Set(keys.map(k => m[k])).size !== keys.length) return { ...DEFAULT_BINDINGS };
      return Object.fromEntries(keys.map(k => [k, m[k]])) as Mapping;
    } catch { return { ...DEFAULT_BINDINGS }; }
  }
  code(binding: Binding) { return this.mapping[binding]; }
  label(binding: Binding) { return this.code(binding).replace(/^Key|^Digit/, '').replace('ShiftLeft', 'L Shift').replace('ShiftRight', 'R Shift').replace('Arrow', '').replace('Backquote', '`'); }
  bind(binding: Binding, code: string) {
    if (!validKey(code)) throw new Error('Use a letter, number, arrow, Shift, Space, Enter, or punctuation key. Escape cancels.');
    const other = (Object.keys(this.mapping) as Binding[]).find(k => k !== binding && this.mapping[k] === code);
    if (other) this.mapping[other] = this.mapping[binding]; this.mapping[binding] = code; this.save();
  }
  matches(binding: Binding, code: string) { return this.mapping[binding] === code || (binding === 'dive' && this.mapping.dive === 'ShiftLeft' && code === 'ShiftRight' && !Object.values(this.mapping).includes('ShiftRight')); }
  reset() { this.mapping = { ...DEFAULT_BINDINGS }; this.save(); }
  private save() { try { if (typeof localStorage !== 'undefined') localStorage.setItem(KeyBindings.storageKey, JSON.stringify(this.mapping)); } catch { /* In-memory bindings still work in private/restricted storage. */ } }
}
