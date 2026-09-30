export type Team = 0 | 1;
export interface Vec3 { x: number; y: number; z: number }
export type Action = 'bump' | 'set' | 'spike' | 'dive' | 'serve';
export type Phase = 'waiting' | 'serving' | 'rally' | 'point' | 'match-over';
export interface InputFrame { sequence: number; moveX: number; moveZ: number; yaw: number; pitch: number; jump: boolean; target: Vec3 }
export type RequestedAction = Action | 'jump';
export interface ActionRequest { sequence: number; action: RequestedAction }
export interface PlayerState {
  id: string; team: Team; position: Vec3; velocity: Vec3; yaw: number; pitch: number;
  grounded: boolean; action: Action | 'block' | null; actionUntil: number;
  cooldownUntil: number; diveUntil: number; diveReady: number;
}
export interface BallState { position: Vec3; velocity: Vec3; rotation: { x: number; y: number; z: number; w: number }; angularVelocity: Vec3 }
export interface MatchState { score: [number, number]; servingTeam: Team; phase: Phase; winner: Team | null; targetScore: number; reason: string }
export interface Snapshot { tick: number; timestamp: number; acknowledgedInput: number; players: PlayerState[]; ball: BallState; match: MatchState }
export const v3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export const side = (team: Team) => team === 0 ? 1 : -1;
export const other = (team: Team): Team => team === 0 ? 1 : 0;
