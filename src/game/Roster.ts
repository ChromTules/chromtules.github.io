import { createPlayer } from '../entities/PlayerMotor';
import { side, v3, type PlayerState, type Team } from './Types';
export type TeamSizes = [number, number];
export function formation(team: Team, slot: number, count: number) {
  if (count === 1) return v3(0, 0, side(team) * 5.8);
  const front = Math.ceil(count / 2), row = slot < front ? 0 : 1;
  const columns = row === 0 ? front : count - front, column = row === 0 ? slot : slot - front;
  return v3((column - (columns - 1) / 2) * 2.7, 0, side(team) * (row === 0 ? 2.8 : 6.3));
}
export function createRoster(sizes: TeamSizes, humanIds: string[]): PlayerState[] {
  if (!sizes.every(n => Number.isInteger(n) && n >= 1 && n <= 6)) throw new Error('Teams must have between one and six players.');
  const roster: PlayerState[] = [];
  for (const team of [0, 1] as const) for (let slot = 0; slot < sizes[team]; slot++) {
    const id = slot === 0 ? (team === 0 ? 'host' : 'guest') : `team${team}-${slot}`;
    const p = createPlayer(id, team); p.controller = humanIds.includes(id) ? 'human' : 'ai'; p.position = formation(team, slot, sizes[team]); roster.push(p);
  }
  return roster;
}
