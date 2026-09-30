import type { RequestedAction, InputFrame } from '../game/Types';
import { SequenceGate, type Message } from './Protocol';
export class HostInputs {
  private moves = new SequenceGate(); private actions = new SequenceGate(); private resetAt = -Infinity;
  constructor(private input: (id: string, frame: InputFrame) => void, private action: (id: string, action: RequestedAction) => void, private reset: () => void) {}
  receive(message: Message) {
    if (message.type === 'input' && this.moves.accept(message.frame.sequence)) this.input('guest', message.frame);
    else if (message.type === 'action' && this.actions.accept(message.request.sequence)) this.action('guest', message.request.action);
    else if (message.type === 'reset' && performance.now() - this.resetAt > 2000) { this.resetAt = performance.now(); this.reset(); }
    // Guests can never write a snapshot, score, player ID, or contact event.
  }
}
