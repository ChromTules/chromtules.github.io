import { afterEach, expect, it, vi } from 'vitest';
import { NetworkManager } from '../src/network/NetworkManager';

// Controlled transport events exercise the real session lifecycle without
// depending on a router dropping packets at exactly the right moment.
function session() {
  const channels = ['state', 'events'].map(label => ({ label, readyState: 'open', bufferedAmount: 0, send: vi.fn(), close: vi.fn(), onopen: null, onclose: null, onmessage: null, onerror: null }));
  const peer = Object.assign(new EventTarget(), {
    connectionState: 'new', iceConnectionState: 'new', signalingState: 'stable', iceGatheringState: 'complete',
    localDescription: { type: 'offer', sdp: 'v=0\r\n' }, remoteDescription: null,
    onconnectionstatechange: null as null | (() => void), ondatachannel: null,
    createDataChannel: (label: string) => channels.find(channel => channel.label === label)!,
    createOffer: async () => ({ type: 'offer', sdp: 'v=0\r\n' }), setLocalDescription: async () => {}, close: vi.fn(),
  });
  peer.close.mockImplementation(() => { peer.connectionState = 'closed'; });
  const network = new NetworkManager('host', () => peer as unknown as RTCPeerConnection);
  const disconnected = vi.fn(), ready = vi.fn(); network.onDisconnect = disconnected; network.onReady = ready;
  const change = (state: string) => { peer.connectionState = state; peer.onconnectionstatechange?.(); };
  const connect = async () => {
    await network.createOffer(); change('connected');
    const events = channels[1] as unknown as RTCDataChannel;
    events.onmessage?.({ data: JSON.stringify({ v: 1, type: 'hello', role: 'guest' }) } as MessageEvent);
  };
  return { network, peer, disconnected, ready, channels, change, connect };
}
afterEach(() => vi.useRealTimers());

it('keeps the match alive through a temporary interruption and resumes without starting a second match', async () => {
  vi.useFakeTimers(); const s = session();
  try {
    await s.connect(); expect(s.ready).toHaveBeenCalledTimes(1);
    s.change('disconnected'); await vi.advanceTimersByTimeAsync(2000);
    expect(s.disconnected).not.toHaveBeenCalled();
    s.change('connected'); await vi.advanceTimersByTimeAsync(15000);
    expect(s.disconnected).not.toHaveBeenCalled(); expect(s.ready).toHaveBeenCalledTimes(1);
  } finally { s.network.dispose(); }
});

it('ends an unrecovered interruption exactly once even when both channels close afterward', async () => {
  vi.useFakeTimers(); const s = session();
  try {
    await s.connect(); s.change('disconnected'); await vi.advanceTimersByTimeAsync(15000);
    expect(s.disconnected).toHaveBeenCalledTimes(1);
    s.change('failed');
    for (const channel of s.channels) (channel as unknown as RTCDataChannel).onclose?.({} as Event);
    expect(s.disconnected).toHaveBeenCalledTimes(1);
  } finally { s.network.dispose(); }
});

it('preserves a useful route failure reason instead of replacing it with a generic channel close', async () => {
  const s = session(), statuses: string[] = []; s.network.onStatus = status => statuses.push(status);
  try {
    await s.network.createOffer(); s.change('failed');
    (s.channels[0] as unknown as RTCDataChannel).onclose?.({} as Event);
    expect(statuses.at(-1)).toMatch(/TURN|relay/i);
    expect(s.disconnected).toHaveBeenCalledTimes(1);
    expect(s.disconnected.mock.calls[0][0]).toMatch(/TURN|relay/i);
  } finally { s.network.dispose(); }
});

it('cancels a pending interruption notification when leaving the session', async () => {
  vi.useFakeTimers(); const s = session();
  await s.connect(); s.change('disconnected'); s.network.dispose();
  await vi.advanceTimersByTimeAsync(15000); expect(s.disconnected).not.toHaveBeenCalled();
});

it('closes the transport after recovery expires so the other player can detect the lost session', async () => {
  vi.useFakeTimers(); const s = session();
  try {
    await s.connect(); s.change('disconnected'); await vi.advanceTimersByTimeAsync(15000);
    expect(s.peer.connectionState).toBe('closed');
    expect(s.disconnected).toHaveBeenCalledTimes(1);
  } finally { s.network.dispose(); }
});

it('preserves the terminal reason when transport cleanup interrupts address gathering', async () => {
  vi.useFakeTimers(); const s = session(); s.peer.iceGatheringState = 'gathering';
  const result = s.network.createOffer().then(() => undefined, error => error);
  try {
    await vi.advanceTimersByTimeAsync(1); s.change('failed');
    await vi.advanceTimersByTimeAsync(9000);
    const error = await result; expect(error).toBeInstanceOf(Error); expect(error.message).toMatch(/TURN|relay/i);
  } finally { s.network.dispose(); }
});
