import { it, expect } from 'vitest';
import { predictIntercept, selectReceiver, openCourtTarget, decideTeam } from '../src/ai/TeamAI';
import { createRoster } from '../src/game/Roster';
import type { BallState } from '../src/game/Types';
const ball: BallState = { position: { x: 0, y: 4, z: 2 }, velocity: { x: 1, y: -2, z: 1 }, angularVelocity: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } };
it('predicts a descending interception under gravity', () => { const target = predictIntercept(ball, 1.7); expect(target.time).toBeGreaterThan(0); expect(target.position.y).toBe(1.7); expect(target.position.x).toBeGreaterThan(ball.position.x); });
it('assigns one receiver and accounts for a nearby human', () => { const team = createRoster([3, 3], ['host']).filter(p => p.team === 0); team[0].position = { x: 0, y: 0, z: 4 }; expect(selectReceiver(team, { x: 0, y: 1, z: 4 }, null)?.id).toBe('host'); });
it('targets open court away from defenders', () => { const roster = createRoster([1, 1], []); roster[1].position.x = -3; expect(openCourtTarget(0, roster).x).toBeGreaterThan(0); });
it('bots return bounded movement and use normal action requests', () => {
  const players = createRoster([3, 3], []);
  const decisions = decideTeam({ players, ball, team: 0, time: 1, phase: 'rally', servingTeam: 0, lastTeam: 1, lastPlayer: null, touches: 0 });
  expect(decisions).toHaveLength(3); expect(decisions.every(d => Math.abs(d.input.moveX) <= 1 && Math.abs(d.input.moveZ) <= 1)).toBe(true);
});
it('prepositions and jumps a blocker against an opposing attack set', () => {
  const players = createRoster([3, 3], []); players[0].position = { x: 0, y: 0, z: 0.8 };
  const decisions = decideTeam({ players, ball: { ...ball, position: { x: 0, y: 4.4, z: -1.5 }, velocity: { x: 0, y: -2, z: 0 } }, team: 0, time: 1, phase: 'rally', servingTeam: 1, lastTeam: 1, lastPlayer: 'team1-1', touches: 2 });
  expect(decisions.some(d => d.role === 'block' && d.input.block && d.input.jump)).toBe(true);
});
it('dives for a low receive that cannot reach the standing platform', () => {
  const players = createRoster([1, 1], []); players[0].position = { x: 0, y: 0, z: 5 };
  const decision = decideTeam({ players, ball: { ...ball, position: { x: 0, y: 0.65, z: 3.5 }, velocity: { x: 0, y: -1, z: 1 } }, team: 0, time: 1, phase: 'rally', servingTeam: 1, lastTeam: 1, lastPlayer: 'guest', touches: 1 })[0];
  expect(decision.action).toBe('dive'); expect(decision.input.pass).toBe(false);
});
it('tracks an incoming serve for a receive instead of approaching a forbidden block', () => {
  const players = createRoster([1, 1], []); players[0].position = { x: 0, y: 0, z: 1.2 };
  const decision = decideTeam({ players, ball: { ...ball, position: { x: 0, y: 3, z: -1 }, velocity: { x: 0, y: -1, z: 5 } }, team: 0, time: 1, phase: 'rally', servingTeam: 1, lastTeam: 1, lastPlayer: 'guest', touches: 1, serveProtected: true })[0];
  expect(decision.role).toBe('receive'); expect(decision.input.pass).toBe(true); expect(decision.input.jump).toBe(false);
});
