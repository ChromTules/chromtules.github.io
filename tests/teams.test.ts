import { it, expect } from 'vitest';
import { createRoster, formation } from '../src/game/Roster';
it('fills asymmetric teams with bots around human slots', () => {
  const roster = createRoster([3, 6], ['host', 'guest']);
  expect(roster.filter(p => p.team === 0)).toHaveLength(3); expect(roster.filter(p => p.team === 1)).toHaveLength(6);
  expect(roster.filter(p => p.controller === 'human').map(p => p.id)).toEqual(['host', 'guest']);
  expect(new Set(roster.map(p => p.id)).size).toBe(9);
});
it('supports a single human against an AI team and validates roster sizes', () => {
  expect(createRoster([1, 1], ['host']).find(p => p.id === 'guest')?.controller).toBe('ai');
  expect(() => createRoster([0, 7], ['host'])).toThrow();
});
it('spreads six teammates into distinct in-bounds formation positions', () => {
  const positions = Array.from({ length: 6 }, (_, i) => formation(0, i, 6));
  expect(new Set(positions.map(p => `${p.x},${p.z}`)).size).toBe(6);
  expect(positions.every(p => Math.abs(p.x) < 4.5 && p.z > 0 && p.z < 9)).toBe(true);
});
