import { it, expect } from 'vitest';
import { KeyBindings, DEFAULT_BINDINGS } from '../src/controls/KeyBindings';
it('swaps conflicting keys and can restore defaults', () => {
  const bindings = new KeyBindings(); bindings.bind('forward', 'KeyE');
  expect(bindings.code('forward')).toBe('KeyE'); expect(bindings.code('spike')).toBe('KeyW');
  bindings.reset(); expect(bindings.code('forward')).toBe('KeyW');
});
it('rejects reserved keys and recovers corrupt stored mappings', () => {
  const bindings = new KeyBindings(); expect(() => bindings.bind('spike', 'Escape')).toThrow();
  expect(KeyBindings.parse('{broken')).toEqual(DEFAULT_BINDINGS);
  expect(KeyBindings.parse(JSON.stringify({ ...DEFAULT_BINDINGS, spike: 'KeyW' }))).toEqual(DEFAULT_BINDINGS);
});
it('does not alias right Shift to dive after assigning it to jump', () => { const b = new KeyBindings(); b.bind('jump', 'ShiftRight'); expect(b.matches('jump', 'ShiftRight')).toBe(true); expect(b.matches('dive', 'ShiftRight')).toBe(false); });
it('preserves old custom bindings when adding the camera control, including occupied V', () => {
  const { camera: _, ...old } = DEFAULT_BINDINGS;
  const upgraded = KeyBindings.parse(JSON.stringify({ ...old, spike: 'KeyV' }));
  expect(upgraded.spike).toBe('KeyV'); expect(upgraded.camera).not.toBe('KeyV');
  expect(new Set(Object.values(upgraded)).size).toBe(Object.keys(DEFAULT_BINDINGS).length);
});
