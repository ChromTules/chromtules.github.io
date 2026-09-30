import { it, expect, vi } from 'vitest';
import { HostInputs } from '../src/network/Host';
import { ClientPrediction } from '../src/network/Client';
import { createPlayer } from '../src/entities/PlayerMotor';
import { neutralInput } from '../src/controls/InputManager';
it('host only accepts input/actions from guest and rejects replays', () => {
  const input = vi.fn(), action = vi.fn(), reset = vi.fn(); const h = new HostInputs(input, action, reset);
  h.receive({ v: 1, type: 'action', request: { sequence: 1, action: 'spike' } }); h.receive({ v: 1, type: 'action', request: { sequence: 1, action: 'spike' } });
  expect(action).toHaveBeenCalledTimes(1); expect(action).toHaveBeenCalledWith('guest', 'spike');
  h.receive({ v: 1, type: 'input', frame: { ...neutralInput(0), sequence: 4 } }); h.receive({ v: 1, type: 'input', frame: { ...neutralInput(0), sequence: 3 } }); expect(input).toHaveBeenCalledTimes(1);
});
it('predicts immediately and drops acknowledged input history', () => {
  const c = new ClientPrediction(); const p = createPlayer('guest', 1); c.reconcile(p, 0, 0);
  c.step({ ...neutralInput(Math.PI), sequence: 1, moveZ: 1 }, 1 / 60, 0); expect(c.player!.position.z).toBeGreaterThan(-6);
  c.reconcile(p, 1, 0.02); expect(c.pendingCount).toBe(0);
});
it('newer motion does not discard a separately sequenced jump', () => {
  const action = vi.fn(); const h = new HostInputs(vi.fn(), action, vi.fn());
  h.receive({ v: 1, type: 'input', frame: { ...neutralInput(0), sequence: 100 } });
  h.receive({ v: 1, type: 'action', request: { sequence: 1, action: 'jump' } });
  h.receive({ v: 1, type: 'action', request: { sequence: 1, action: 'jump' } });
  expect(action).toHaveBeenCalledExactlyOnceWith('guest', 'jump');
});
