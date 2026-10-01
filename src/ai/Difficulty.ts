import { clamp } from '../game/Types';
import type { AIDecision } from './TeamAI';
export interface Difficulty { reaction: number; accuracy: number; aggression: number }
export const DIFFICULTIES = {
  easy: { reaction: 0.28, accuracy: 0.65, aggression: 0.4 },
  normal: { reaction: 0.1, accuracy: 0.92, aggression: 0.8 },
  hard: { reaction: 0.05, accuracy: 1, aggression: 1 },
} satisfies Record<string, Difficulty>;
export function normalizeDifficulty(value: unknown): Difficulty {
  const d = value as Difficulty | null;
  if (!d || ![d.reaction, d.accuracy, d.aggression].every(Number.isFinite)) return { ...DIFFICULTIES.normal };
  return { reaction: clamp(d.reaction, 0.05, 0.5), accuracy: clamp(d.accuracy, 0, 1), aggression: clamp(d.aggression, 0, 1) };
}
export function applyDifficulty(decision: AIDecision, difficulty: Difficulty, time: number): AIDecision {
  const phase = [...decision.id].reduce((n, c) => n + c.charCodeAt(0), 0) + Math.floor(time * 2);
  const error = (1 - difficulty.accuracy) * Math.sin(phase * 1.37);
  const result = { ...decision, input: { ...decision.input, target: { ...decision.input.target } } };
  result.input.yaw += error * 0.22; result.input.pitch += error * 0.12;
  result.input.target.x = clamp(result.input.target.x + error * 1.4, -4.3, 4.3);
  if ((Math.sin(phase * 2.1) + 1) / 2 >= difficulty.aggression) {
    if (result.action === 'spike') result.action = undefined;
    result.input.block = false;
  }
  return result;
}
