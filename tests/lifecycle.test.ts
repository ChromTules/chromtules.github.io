import { it, expect, vi } from 'vitest';
import { NetworkManager } from '../src/network/NetworkManager';
it('closes a session exactly once and drops callbacks', () => {
  const peer = { close: vi.fn(), ondatachannel: null, onconnectionstatechange: null } as unknown as RTCPeerConnection;
  const session = new NetworkManager('guest', () => peer);
  const callback = vi.fn(); session.onReady = callback; session.dispose(); session.dispose(); session.onReady();
  expect(peer.close).toHaveBeenCalledTimes(1); expect(peer.ondatachannel).toBeNull(); expect(peer.onconnectionstatechange).toBeNull(); expect(callback).not.toHaveBeenCalled();
});
