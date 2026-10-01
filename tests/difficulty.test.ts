import { it, expect } from 'vitest';
import { DIFFICULTIES, normalizeDifficulty, applyDifficulty } from '../src/ai/Difficulty';
import { neutralInput } from '../src/controls/InputManager';
it('presets change reaction and accuracy without changing player physics', () => {
  expect(DIFFICULTIES.easy.reaction).toBeGreaterThan(DIFFICULTIES.hard.reaction);
  expect(DIFFICULTIES.easy.accuracy).toBeLessThan(DIFFICULTIES.hard.accuracy);
  const decision = { id: 'host', input: neutralInput(0), action: 'spike' as const, role: 'attack' };
  const easy = applyDifficulty(decision, { reaction: 0.2, accuracy: 0, aggression: 0 }, 1);
  expect(easy.action).toBeUndefined(); expect(easy.input.yaw).not.toBe(0);
  expect(decision.input.yaw).toBe(0);
});
it('validates custom difficulty bounds and rejects malformed saved settings', () => {
  expect(normalizeDifficulty({ reaction: 99, accuracy: -1, aggression: 5 })).toEqual({ reaction: 0.5, accuracy: 0, aggression: 1 });
  expect(normalizeDifficulty(null)).toEqual(DIFFICULTIES.normal);
});
