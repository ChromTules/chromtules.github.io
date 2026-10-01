import { it, expect } from 'vitest';
import { createPlayer, movePlayer } from '../src/entities/PlayerMotor';
import { InputManager, neutralInput } from '../src/controls/InputManager';
import { contactQuality } from '../src/volleyball/Actions';

it('requires forearm contact instead of accepting balls beside or far in front of the player', () => {
  const p = createPlayer('host', 0);
  expect(contactQuality(p, { x: 1.2, y: 1, z: 5.6 }, 'bump', 0)).toBe(0);
  expect(contactQuality(p, { x: 0, y: 1, z: 4.2 }, 'bump', 0)).toBe(0);
  expect(contactQuality(p, { x: 0, y: 1, z: 5.3 }, 'bump', 0)).toBeGreaterThan(0);
});
it('keeps the passing platform out while held and clears it without a swing on focus loss', () => {
  const i = new InputManager(), p = createPlayer('host', 0);
  i.setKey('KeyZ', true);
  for (let n = 1; n < 600; n++) movePlayer(p, i.sample(n), 1 / 60, n / 60);
  expect(p.action).toBe('pass');
  i.clear(); movePlayer(p, i.sample(600), 1 / 60, 10);
  expect(p.action).toBe(null);
});
it('swings on the last passing input release, without repeating while held', () => {
  const i = new InputManager(), actions: string[] = []; i.onAction = a => actions.push(a);
  i.setKey('KeyZ', true); i.setKey('KeyZ', true); expect(actions).toEqual([]);
  i.setKey('KeyZ', false); expect(actions).toEqual(['bump']);
  i.setKey('KeyZ', false); expect(actions).toEqual(['bump']);
  expect(neutralInput(0).pass).toBe(false);
});
it('a centered held platform has no timing penalty even after an old swing', () => {
  const p = createPlayer('host', 0); p.action = 'pass'; p.actionUntil = 1;
  expect(contactQuality(p, { x: 0, y: 1, z: 5.3 }, 'pass', 100)).toBeCloseTo(1);
});
