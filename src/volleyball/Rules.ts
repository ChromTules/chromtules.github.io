import { C } from '../game/Constants';
import { other, type MatchState, type Team, type Vec3 } from '../game/Types';
export class Rules {
  state: MatchState;
  lastTouch: Team = 0;
  ballSide: Team = 0;
  crossings = 0;
  constructor(targetScore = 15) { this.state = { score: [0, 0], servingTeam: 0, phase: 'serving', winner: null, targetScore, reason: 'Team blue to serve' }; }
  beginRally(team: Team) { this.lastTouch = team; this.ballSide = team; this.crossings = 0; this.state.phase = 'rally'; this.state.reason = 'Ball in play'; }
  touch(team: Team) { this.lastTouch = team; }
  track(z: number) { const team: Team = z >= 0 ? 0 : 1; if (team !== this.ballSide) { this.crossings++; this.ballSide = team; } }
  floorContact(p: Vec3) {
    if (this.state.phase !== 'rally') return;
    const inside = Math.abs(p.x) <= C.courtX + C.ballRadius && Math.abs(p.z) <= C.courtZ + C.ballRadius;
    this.award(inside ? (p.z >= 0 ? 1 : 0) : other(this.lastTouch), inside ? 'Ball down' : 'Out');
  }
  award(team: Team, reason: string) {
    if (this.state.phase !== 'rally') return;
    this.state.score[team]++; this.state.servingTeam = team;
    this.state.reason = `${reason} · ${team === 0 ? 'Blue' : 'Coral'} point`;
    this.state.phase = 'point';
    if (this.state.score[team] >= this.state.targetScore && this.state.score[team] - this.state.score[other(team)] >= 2) {
      this.state.winner = team; this.state.phase = 'match-over'; this.state.reason = `${team === 0 ? 'Blue' : 'Coral'} wins the match`;
    }
  }
  reset() { this.state = { score: [0, 0], servingTeam: 0, phase: 'serving', winner: null, targetScore: this.state.targetScore, reason: 'New match · Blue to serve' }; this.lastTouch = 0; }
}
