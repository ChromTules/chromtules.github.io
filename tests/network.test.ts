import { it, expect, vi } from 'vitest';
import { encodeSignal, decodeSignal, gatherIce } from '../src/network/Signaling';
import { parseMessage, SequenceGate } from '../src/network/Protocol';
import { interpolateAngle, SnapshotBuffer } from '../src/network/Interpolation';
import type { Snapshot } from '../src/game/Types';
it('round trips signaling descriptions and rejects malformed inputs', () => {
  const offer = { type: 'offer' as const, sdp: 'v=0\r\na=test\r\n' }; expect(decodeSignal(encodeSignal(offer))).toEqual(offer);
  for (const code of ['!', btoa('{}'), 'A'.repeat(200_000), btoa(JSON.stringify({ version: 999, description: offer }))]) expect(() => decodeSignal(code)).toThrow();
});
it('rejects unbounded and nonfinite movement', () => { expect(parseMessage(JSON.stringify({ v: 1, type: 'input', frame: { moveX: 9 } }))).toBeNull(); expect(parseMessage('{')).toBeNull(); expect(parseMessage(JSON.stringify({ v: 1, type: 'score', score: [99, 0] }))).toBeNull(); });
it('rejects duplicate and stale action sequences', () => { const gate = new SequenceGate(); expect(gate.accept(3)).toBe(true); expect(gate.accept(3)).toBe(false); expect(gate.accept(2)).toBe(false); expect(gate.accept(4)).toBe(true); });
it('accepts independently numbered reliable jump requests', () => { expect(parseMessage(JSON.stringify({ v: 1, type: 'action', request: { sequence: 1, action: 'jump' } }))).not.toBeNull(); });
it('takes the short route across the yaw seam', () => expect(Math.abs(interpolateAngle(Math.PI - 0.1, -Math.PI + 0.1, 0.5))).toBeCloseTo(Math.PI));
const snapshot = (tick: number, x: number): Snapshot => ({ tick, timestamp: tick * 50, acknowledgedInput: 0, players: [], ball: { position: { x, y: 3, z: 0 }, velocity: { x: 2, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }, match: { score: [0, 0], servingTeam: 0, phase: 'rally', winner: null, targetScore: 15, reason: '' } });
it('buffers movement, rejects stale snapshots and bounds extrapolation', () => {
  const b = new SnapshotBuffer(); expect(b.push(snapshot(1, 0), 1000)).toBe(true); expect(b.push(snapshot(3, 2), 1100)).toBe(true); expect(b.push(snapshot(2, 1), 1200)).toBe(false);
  expect(b.sample(1150)!.ball.position.x).toBeCloseTo(1); expect(b.sample(5000)!.ball.position.x).toBeCloseTo(2.2);
});
it('still allows LAN signaling if STUN stalls after gathering a local candidate', async () => {
  vi.useFakeTimers();
  const peer = Object.assign(new EventTarget(), { iceGatheringState: 'gathering', localDescription: { sdp: 'v=0\r\na=candidate:1 1 udp 1 127.0.0.1 5555 typ host\r\n' } }) as unknown as RTCPeerConnection;
  const result = gatherIce(peer, new AbortController().signal);
  const assertion = expect(result).resolves.toBe(false);
  await vi.advanceTimersByTimeAsync(15000); await assertion; vi.useRealTimers();
});
