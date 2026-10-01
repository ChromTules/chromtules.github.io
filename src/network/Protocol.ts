import type { ActionRequest, InputFrame, Snapshot } from '../game/Types';
export type Message =
  | { v: 1; type: 'hello'; role: 'host' | 'guest' }
  | { v: 1; type: 'input'; frame: InputFrame }
  | { v: 1; type: 'action'; request: ActionRequest }
  | { v: 1; type: 'snapshot'; state: Snapshot }
  | { v: 1; type: 'event'; name: string; player?: string; state: Snapshot }
  | { v: 1; type: 'reset' }
  | { v: 1; type: 'ping' | 'pong'; at: number };
type Obj = Record<string, unknown>;
const object = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, max = 1e9): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max;
const seq = (v: unknown) => num(v) && Number.isSafeInteger(v) && v >= 0;
const vector = (v: unknown, limit: number) => object(v) && num(v.x, limit) && num(v.y, limit) && num(v.z, limit);
const team = (v: unknown) => v === 0 || v === 1;
const action = (v: unknown) => typeof v === 'string' && ['bump', 'set', 'spike', 'dive', 'serve'].includes(v);
const playerId = (v: unknown) => typeof v === 'string' && /^(host|guest|team[01]-[1-5])$/.test(v);
function snapshot(s: unknown): boolean {
  if (!object(s) || !seq(s.tick) || !num(s.timestamp) || !seq(s.acknowledgedInput) || !Array.isArray(s.players) || s.players.length > 12 || !object(s.ball) || !object(s.match)) return false;
  if (!s.players.every(p => object(p) && playerId(p.id) && (p.controller === 'human' || p.controller === 'ai') && team(p.team) && object(p.serve) && ['underhand', 'float', 'topspin'].includes(String(p.serve.style)) && ['ready', 'charging', 'toss'].includes(String(p.serve.stage)) && num(p.serve.power, 1) && p.serve.power >= 0 && num(p.serve.started) && vector(p.position, 100) && vector(p.velocity, 100) && num(p.yaw, 1e6) && num(p.pitch, 1.5) && typeof p.grounded === 'boolean' && (p.action === null || p.action === 'block' || p.action === 'pass' || action(p.action)) && ['actionUntil', 'cooldownUntil', 'diveUntil', 'diveReady'].every(k => num(p[k])))) return false;
  if (new Set(s.players.map(p => (p as Obj).id)).size !== s.players.length) return false;
  const b = s.ball, m = s.match;
  return (m.serveProtected === undefined || typeof m.serveProtected === 'boolean') && vector(b.position, 1000) && vector(b.velocity, 1000) && vector(b.angularVelocity, 1000) && object(b.rotation) && ['x', 'y', 'z', 'w'].every(k => num((b.rotation as Obj)[k], 1.01)) && Array.isArray(m.score) && m.score.length === 2 && m.score.every(seq) && team(m.servingTeam) && (m.winner === null || team(m.winner)) && typeof m.phase === 'string' && ['waiting', 'serving', 'rally', 'point', 'match-over'].includes(m.phase) && num(m.targetScore, 100) && typeof m.reason === 'string' && m.reason.length < 200;
}
export function parseMessage(raw: unknown): Message | null {
  if (typeof raw !== 'string' || raw.length > 65536) return null;
  try {
    const m: unknown = JSON.parse(raw);
    if (!object(m) || m.v !== 1) return null;
    let valid = false;
    switch (m.type) {
      case 'hello': valid = m.role === 'host' || m.role === 'guest'; break;
      case 'input': { const f = m.frame; valid = object(f) && seq(f.sequence) && num(f.moveX, 1) && num(f.moveZ, 1) && num(f.yaw, 1e6) && num(f.pitch, 1.5) && typeof f.jump === 'boolean' && typeof f.block === 'boolean' && typeof f.pass === 'boolean' && vector(f.target, 12); break; }
      case 'action': valid = object(m.request) && seq(m.request.sequence) && (action(m.request.action) || ['jump', 'serve-release', 'serve-style', 'serve-cancel'].includes(String(m.request.action))); break;
      case 'snapshot': valid = snapshot(m.state); break;
      case 'event': valid = typeof m.name === 'string' && m.name.length < 100 && (m.player === undefined || playerId(m.player)) && snapshot(m.state); break;
      case 'reset': valid = true; break;
      case 'ping': case 'pong': valid = num(m.at, 1e15); break;
    }
    return valid ? m as Message : null;
  } catch { return null; }
}
export class SequenceGate {
  private last = -1;
  accept(sequence: number) { if (!seq(sequence) || sequence <= this.last) return false; this.last = sequence; return true; }
}
