import { C } from '../game/Constants';
import { clamp, side, type BallState, type InputFrame, type Phase, type PlayerState, type RequestedAction, type Team, type Vec3 } from '../game/Types';
import { formation } from '../game/Roster';
import { neutralInput } from '../controls/InputManager';
import { contactQuality } from '../volleyball/Actions';

export interface AIContext {
  players: PlayerState[]; ball: BallState; team: Team; time: number; phase: Phase;
  servingTeam: Team; lastTeam: Team; lastPlayer: string | null; touches: number;
}
export interface AIDecision { id: string; input: InputFrame; action?: RequestedAction; role: string }
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.z - b.z);

/** Descending root of y(t)=y0+vy*t-g*t²/2. No privileged future physics state. */
export function predictIntercept(ball: BallState, height = 1.7) {
  const discriminant = ball.velocity.y ** 2 + 2 * C.gravity * (ball.position.y - height);
  const time = discriminant < 0 ? 0 : Math.max(0, (ball.velocity.y + Math.sqrt(discriminant)) / C.gravity);
  return { time, position: { x: ball.position.x + ball.velocity.x * time, y: height, z: ball.position.z + ball.velocity.z * time } };
}
export function selectReceiver(players: PlayerState[], target: Vec3, exclude: string | null) {
  const eligible = players.filter(p => p.id !== exclude);
  return (eligible.length ? eligible : players).reduce<PlayerState | undefined>((best, p) => {
    const cost = (candidate: PlayerState) => distance(candidate.position, target) - (candidate.controller === 'human' ? 0.35 : 0);
    return !best || cost(p) < cost(best) ? p : best;
  }, undefined);
}
export function openCourtTarget(team: Team, players: PlayerState[]): Vec3 {
  const opponents = players.filter(p => p.team !== team);
  let best = { x: 0, y: C.ballRadius, z: -side(team) * 6 }, clearance = -Infinity;
  for (const x of [-3.3, 0, 3.3]) for (const depth of [3.5, 7.5]) {
    const target = { x, y: C.ballRadius, z: -side(team) * depth };
    const nearest = opponents.reduce((d, p) => Math.min(d, distance(p.position, target)), 20);
    if (nearest > clearance) { clearance = nearest; best = target; }
  }
  return best;
}
function moveToward(p: PlayerState, point: Vec3, yaw: number): InputFrame {
  const input = neutralInput(yaw), dx = point.x - p.position.x, dz = point.z - p.position.z;
  const length = Math.hypot(dx, dz), speed = clamp((length - 0.13) / 0.6, 0, 1);
  if (length > 0.01) {
    input.moveX = clamp((Math.cos(yaw) * dx - Math.sin(yaw) * dz) / length * speed, -1, 1);
    input.moveZ = clamp((-Math.sin(yaw) * dx - Math.cos(yaw) * dz) / length * speed, -1, 1);
  }
  return input;
}

/** One coordinated decision for the entire team, run at 10 Hz on the host. */
export function decideTeam(ctx: AIContext): AIDecision[] {
  const team = ctx.players.filter(p => p.team === ctx.team), sign = side(ctx.team);
  const { ball } = ctx;
  const ownContact = ctx.lastTeam === ctx.team;
  const touches = ownContact ? ctx.touches : 0;
  const intercept = predictIntercept(ball, touches === 1 ? 2.2 : 1.7);
  const attackIntercept = predictIntercept(ball, 3.5);
  const target = { x: clamp(intercept.position.x, -5.9, 5.9), y: 0, z: sign * clamp(sign * intercept.position.z + 0.55, 0.65, 10.7) };
  const onOurSide = sign * intercept.position.z > -0.35 && Math.abs(intercept.position.x) < 7;
  const receiver = selectReceiver(team, target, ownContact && team.length > 1 ? ctx.lastPlayer : null);
  const setter = team.filter(p => p.id !== receiver?.id).sort((a, b) => Math.abs(a.position.z) - Math.abs(b.position.z))[0];
  const attacking = ownContact && touches >= 2;
  const netTime = Math.abs(ball.velocity.z) > 0.01 ? -ball.position.z / ball.velocity.z : -1;
  const netX = ball.position.x + ball.velocity.x * Math.max(0, netTime);
  const blockPoint = { x: clamp(netX, -4.2, 4.2), y: 0, z: sign * 0.65 };
  const blocker = selectReceiver(team, blockPoint, null);
  const approachingNet = !ownContact && sign * ball.velocity.z > 0 && netTime >= 0 && netTime < 0.55 && ball.position.y > 2.6;
  const anticipatingAttack = !ownContact && ctx.touches >= 2 && sign * ball.position.z < 0 && Math.abs(ball.position.z) < 4.5 && ball.position.y > 3;
  const attackTarget = openCourtTarget(ctx.team, ctx.players);

  return team.filter(p => p.controller === 'ai').map(p => {
    const slot = team.findIndex(member => member.id === p.id);
    let desired = formation(ctx.team, slot, team.length), action: RequestedAction | undefined, role = 'cover';
    let yaw = Math.atan2(-(ball.position.x - p.position.x), -(ball.position.z - p.position.z));
    let aim = { ...attackTarget }, jump = false, block = false;
    if (ctx.phase === 'serving') {
      if (ctx.servingTeam === ctx.team && p.id === team[0].id) { desired = { x: p.position.x, y: 0, z: sign * 10 }; role = 'serve'; if (Math.abs(p.position.z) > 9.1 && ctx.time - p.actionUntil > 0.6) action = 'serve'; }
    } else if (ctx.phase === 'rally') {
      if ((approachingNet || anticipatingAttack) && p.id === blocker?.id && distance(p.position, blockPoint) < 4) {
        desired = blockPoint; role = 'block'; block = true;
        jump = p.grounded && distance(p.position, blockPoint) < 1.2 && ((approachingNet && netTime < 0.4) || (anticipatingAttack && ball.velocity.y < 0 && ball.position.y < 4.8));
        yaw = ctx.team === 0 ? 0 : Math.PI;
      } else if (onOurSide && p.id === receiver?.id) {
        desired = target; role = touches === 1 ? 'set' : attacking ? 'attack' : 'receive';
        if (attacking && Math.abs(attackIntercept.position.z) < 4.7 && attackIntercept.position.z * sign > 0) {
          desired = { x: clamp(attackIntercept.position.x, -4.3, 4.3), y: 0, z: sign * clamp(sign * attackIntercept.position.z + 0.55, 0.65, 4.7) };
          jump = p.grounded && attackIntercept.time < 0.48 && ball.velocity.y < 0 && distance(p.position, desired) < 1.6;
          if (!p.grounded && contactQuality(p, ball.position, 'spike', ctx.time)) action = 'spike';
        }
        if (!action && ball.velocity.y < 0.5) {
          if (touches === 1 && team.length > 1 && contactQuality(p, ball.position, 'set', ctx.time)) {
            action = 'set'; const hitter = team.filter(member => member.id !== p.id).sort((a, b) => Math.abs(a.position.z) - Math.abs(b.position.z))[0];
            aim = { x: clamp(hitter?.position.x ?? 0, -3.2, 3.2), y: 2.65, z: sign * 1.7 };
          } else if (contactQuality(p, ball.position, 'bump', ctx.time)) {
            action = 'bump';
            if (touches === 0 && team.length > 1 && setter) aim = { x: clamp(setter.position.x, -3.2, 3.2), y: 1.3, z: sign * 2.5 };
          } else if (ball.position.y < 1.5 && distance(p.position, ball.position) < 3 && ctx.time >= p.diveReady) action = 'dive';
        }
      } else if (ownContact && touches === 1 && p.id === setter?.id) {
        desired = { x: p.position.x, y: 0, z: sign * 2.8 }; role = 'prepare set';
      } else if (ownContact && touches >= 1 && p.id !== ctx.lastPlayer) {
        desired.z = sign * Math.min(Math.abs(desired.z), 3.8); role = 'approach';
      }
    }
    if (action === 'spike' || action === 'serve') yaw = Math.atan2(-(aim.x - p.position.x), -(aim.z - p.position.z));
    const input = moveToward(p, desired, yaw);
    input.pitch = action === 'spike' ? -Math.atan2(Math.max(1, ball.position.y - 0.21), distance(ball.position, aim)) * 0.75 : 0.1;
    input.target = aim; input.jump = jump; input.block = block; input.sequence = Math.floor(ctx.time * 60);
    return { id: p.id, input, action, role };
  });
}
