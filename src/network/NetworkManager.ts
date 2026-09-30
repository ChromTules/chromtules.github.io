import { ICE } from '../game/Constants';
import { decodeSignal, encodeSignal, gatherIce } from './Signaling';
import { parseMessage, type Message } from './Protocol';
export class NetworkManager {
  readonly peer: RTCPeerConnection;
  private fast?: RTCDataChannel; private reliable?: RTCDataChannel;
  private abort = new AbortController(); private disposed = false; private opened = false; private greeted = false;
  private timer?: ReturnType<typeof setTimeout>; private heartbeat?: ReturnType<typeof setInterval>;
  onStatus: (status: string) => void = () => {}; onReady = () => {}; onMessage: (message: Message) => void = () => {}; onDisconnect = () => {};
  rtt = 0; sent = 0; received = 0;
  constructor(public readonly role: 'host' | 'guest', factory = () => new RTCPeerConnection(ICE)) {
    this.peer = factory();
    this.peer.onconnectionstatechange = () => {
      if (this.disposed) return;
      const state = this.peer.connectionState;
      if (state === 'failed' || state === 'disconnected' || state === 'closed') { this.onStatus(state === 'failed' ? 'Connection failed. Try a new code or a different network.' : 'Disconnected'); this.onDisconnect(); }
      else if (state === 'connecting') this.onStatus('Connecting…');
    };
    if (role === 'guest') this.peer.ondatachannel = e => this.channel(e.channel);
  }
  private channel(channel: RTCDataChannel) {
    if (channel.label === 'state') this.fast = channel; else if (channel.label === 'events') this.reliable = channel; else { channel.close(); return; }
    channel.onopen = () => this.checkReady();
    channel.onclose = () => { if (!this.disposed) { this.onStatus('Disconnected'); this.onDisconnect(); } };
    channel.onmessage = e => {
      const message = parseMessage(e.data); if (!message) return;
      this.received += (e.data as string).length;
      if (message.type === 'hello') { if (message.role === this.role) return; this.greeted = true; this.checkReady(); return; }
      if (!this.opened) return;
      if (message.type === 'ping') { this.send({ v: 1, type: 'pong', at: message.at }, true); return; }
      if (message.type === 'pong') { this.rtt = Math.max(0, performance.now() - message.at); return; }
      this.onMessage(message);
    };
    channel.onerror = () => this.onStatus('Connection error. Return to the menu and reconnect.');
  }
  private checkReady() {
    if (this.disposed || this.opened || this.fast?.readyState !== 'open' || this.reliable?.readyState !== 'open') return;
    if (!this.greeted) { this.send({ v: 1, type: 'hello', role: this.role }, true); return; }
    this.send({ v: 1, type: 'hello', role: this.role }, true); this.opened = true; clearTimeout(this.timer);
    this.onStatus('Connected'); this.onReady();
    this.heartbeat = setInterval(() => this.send({ v: 1, type: 'ping', at: performance.now() }, true), 2000);
  }
  async createOffer() {
    this.onStatus('Creating offer…'); this.channel(this.peer.createDataChannel('state', { ordered: false, maxRetransmits: 0 })); this.channel(this.peer.createDataChannel('events'));
    await this.peer.setLocalDescription(await this.peer.createOffer()); const complete = await gatherIce(this.peer, this.abort.signal);
    this.onStatus(complete ? 'Waiting for answer…' : 'Waiting for answer. Address discovery limited; same-network play may still work.'); return encodeSignal(this.peer.localDescription!);
  }
  async acceptOffer(code: string) {
    const description = decodeSignal(code); if (description.type !== 'offer') throw new Error('Paste the host’s offer, not an answer.');
    if (this.peer.signalingState !== 'stable' || this.peer.remoteDescription) throw new Error('An offer is already loaded. Send your answer back, or return to the menu to start again.');
    this.onStatus('Creating answer…'); await this.peer.setRemoteDescription(description); await this.peer.setLocalDescription(await this.peer.createAnswer()); const complete = await gatherIce(this.peer, this.abort.signal);
    this.onStatus(complete ? 'Send this answer to the host. Keep this tab open.' : 'Send this answer to the host. Address discovery limited; same-network play may still work.'); return encodeSignal(this.peer.localDescription!);
  }
  async acceptAnswer(code: string) {
    const description = decodeSignal(code); if (description.type !== 'answer') throw new Error('Paste your friend’s answer, not your own offer.');
    if (this.peer.signalingState !== 'have-local-offer') throw new Error('Create a new offer before loading an answer.');
    await this.peer.setRemoteDescription(description); this.onStatus('Connecting…');
    this.timer = setTimeout(() => { if (!this.opened) this.onStatus('Connection timed out. Try new codes or another network.'); }, 25000);
  }
  send(message: Message, reliable = false) {
    const channel = reliable ? this.reliable : this.fast;
    if (this.disposed || channel?.readyState !== 'open' || channel.bufferedAmount > 128 * 1024) return;
    const raw = JSON.stringify(message); try { channel.send(raw); this.sent += raw.length; } catch { this.onStatus('Connection interrupted'); }
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.abort.abort(); clearTimeout(this.timer); clearInterval(this.heartbeat);
    this.peer.ondatachannel = null; this.peer.onconnectionstatechange = null;
    for (const channel of [this.fast, this.reliable]) if (channel) { channel.onopen = null; channel.onclose = null; channel.onmessage = null; channel.onerror = null; channel.close(); }
    this.peer.close(); this.onReady = () => {}; this.onMessage = () => {}; this.onDisconnect = () => {}; this.onStatus = () => {};
  }
}
