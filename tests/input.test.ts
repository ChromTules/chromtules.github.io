import { it, expect } from 'vitest';
import { InputManager } from '../src/controls/InputManager';
it('clears held movement on input release', () => { const input = new InputManager(); input.setKey('KeyW', true); expect(input.sample(1).moveZ).toBe(1); input.clear(); expect(input.sample(2).moveZ).toBe(0); input.dispose(); });
