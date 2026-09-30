import { it, expect } from 'vitest';
import { Rules } from '../src/volleyball/Rules';
it('awards only one point for repeated floor contacts', () => {
  const r = new Rules(15); r.beginRally(0); r.floorContact({ x: 0, y: 0, z: -4 }); r.floorContact({ x: 0, y: 0, z: -4 }); expect(r.state.score).toEqual([1, 0]); expect(r.state.servingTeam).toBe(0);
});
it('counts the boundary including ball radius as in', () => { const r = new Rules(15); r.beginRally(0); r.floorContact({ x: 4.6, y: 0, z: -9 }); expect(r.state.score).toEqual([1, 0]); });
it('awards an out ball against the last touch', () => { const r = new Rules(15); r.beginRally(0); r.touch(1); r.floorContact({ x: 7, y: 0, z: -3 }); expect(r.state.score).toEqual([1, 0]); });
it('requires win by two then resets fully', () => { const r = new Rules(15); r.state.score = [14, 14]; r.beginRally(0); r.floorContact({ x: 0, y: 0, z: -3 }); expect(r.state.winner).toBeNull(); r.beginRally(0); r.floorContact({ x: 0, y: 0, z: -3 }); expect(r.state.winner).toBe(0); r.reset(); expect(r.state.score).toEqual([0, 0]); expect(r.state.phase).toBe('serving'); });
