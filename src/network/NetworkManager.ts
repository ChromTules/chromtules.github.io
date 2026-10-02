import { ICE } from '../game/Constants';
import { decodeSignal, encodeSignal, gatherIce } from './Signaling';
import { parseMessage, type Message } from './Protocol';
export class NetworkManager {
  readonly peer: RTCPeerConnection;
  private fast?: RTCDataChannel; private reliable?: RTCDataChannel;
  private abort = new AbortController(); private disposed = false; private opened = false; private greeted = false; private ended = false;
  private timer?: ReturnType<typeof setTimeout>; private heartbeat?: ReturnType<typeof setInterval>;
  private recoveryTimer?: ReturnType<typeof setTimeout>;
  status = 'Ready';
  onStatus: (status: string) => void = () => {}; onReady = () => {}; onMessage: (message: Message) => void = () => {}; onDisconnect: (reason: string) => void = () => {};
  rtt = 0; sent = 0; received = 0;
  constructor(public readonly role: 'host' | 'guest', factory = () => new RTCPeerConnection(ICE)) {
    this.peer = factory();
    this.peer.onconnectionstatechange = () => {
      if (this.disposed || this.ended) return;
      const state = this.peer.connectionState;
      if (state === 'failed') this.end(this.failureReason());
      else if (state === 'closed') this.end('Your friend closed the connection. Exchange fresh codes to reconnect.');
      else if (state === 'disconnected') {
        this.report('Connection interrupted. Trying to recover…');
        this.recoveryTimer ??= setTimeout(() => this.end('Connection lost after waiting for recovery. Exchange fresh codes to reconnect.'), 10000);
      } else {
        clearTimeout(this.recoveryTimer); this.recoveryTimer = undefined;
        if (state === 'connected') this.report(this.opened ? 'Connected' : 'Finishing connection…');
        else if (state === 'connecting') this.report('Connecting…');
      }
    };
    if (role === 'guest') this.peer.ondatachannel = e => this.channel(e.channel);
  }
  private report(status: string) { this.status = status; this.onStatus(status); }
  private failureReason() {
    if (this.opened) return 'Connection failed. Exchange fresh codes to reconnect.';
    return 'No connection could be established. Keep both original tabs open and exchange fresh codes. If your networks block direct connections, the site needs a configured TURN relay.';
  }
  private end(reason: string) {
    if (this.disposed || this.ended) return;
    this.ended = true; clearTimeout(this.timer); clearTimeout(this.recoveryTimer); clearInterval(this.heartbeat);
    this.report(reason);
    try { this.onDisconnect(reason); } finally { this.dispose(); }
  }
  private async gatherAddresses() {
    try { return await gatherIce(this.peer, this.abort.signal); }
    catch (error) { if (this.ended) throw new Error(this.status); throw error; }
  }
  private channel(channel: RTCDataChannel) {
    if (channel.label === 'state') this.fast = channel; else if (channel.label === 'events') this.reliable = channel; else { channel.close(); return; }
    channel.onopen = () => this.checkReady();
    channel.onclose = () => this.end(this.opened ? 'Your friend closed the connection. Exchange fresh codes to reconnect.' : this.failureReason());
    channel.onmessage = e => {
      if (this.disposed || this.ended) return;
      const message = parseMessage(e.data); if (!message) return;
      this.received += (e.data as string).length;
      if (message.type === 'hello') { if (message.role === this.role) return; this.greeted = true; this.checkReady(); return; }
      if (!this.opened) return;
      if (message.type === 'ping') { this.send({ v: 1, type: 'pong', at: message.at }, true); return; }
      if (message.type === 'pong') { this.rtt = Math.max(0, performance.now() - message.at); return; }
      this.onMessage(message);
    };
    channel.onerror = () => { if (!this.disposed && !this.ended) this.report('Connection error. Waiting for network recovery…'); };
  }
  private checkReady() {
    if (this.disposed || this.ended || this.opened || this.fast?.readyState !== 'open' || this.reliable?.readyState !== 'open') return;
    if (!this.greeted) { this.send({ v: 1, type: 'hello', role: this.role }, true); return; }
    this.send({ v: 1, type: 'hello', role: this.role }, true); this.opened = true; clearTimeout(this.timer);
    this.report('Connected'); this.onReady();
    this.heartbeat = setInterval(() => this.send({ v: 1, type: 'ping', at: performance.now() }, true), 2000);
  }
  async createOffer() {
    this.report('Creating offer…'); this.channel(this.peer.createDataChannel('state', { ordered: false, maxRetransmits: 0 })); this.channel(this.peer.createDataChannel('events'));
    await this.peer.setLocalDescription(await this.peer.createOffer()); const complete = await this.gatherAddresses();
    if (this.ended) throw new Error(this.status);
    this.report(complete ? 'Waiting for answer…' : 'Waiting for answer. Address discovery limited; same-network play may still work.'); return encodeSignal(this.peer.localDescription!);
  }
  async acceptOffer(code: string) {
    const description = decodeSignal(code); if (description.type !== 'offer') throw new Error('Paste the host’s offer, not an answer.');
    if (this.peer.signalingState !== 'stable' || this.peer.remoteDescription) throw new Error('An offer is already loaded. Send your answer back, or return to the menu to start again.');
    this.report('Creating answer…'); await this.peer.setRemoteDescription(description); await this.peer.setLocalDescription(await this.peer.createAnswer()); const complete = await this.gatherAddresses();
    if (this.ended) throw new Error(this.status);
    this.report(complete ? 'Send this answer to the host. Keep this tab open.' : 'Send this answer to the host. Address discovery limited; same-network play may still work.'); return encodeSignal(this.peer.localDescription!);
  }
  async acceptAnswer(code: string) {
    const description = decodeSignal(code); if (description.type !== 'answer') throw new Error('Paste your friend’s answer, not your own offer.');
    if (this.peer.signalingState !== 'have-local-offer') throw new Error('Create a new offer before loading an answer.');
    if (this.ended) throw new Error(this.status);
    await this.peer.setRemoteDescription(description);
    if (!this.opened && !this.ended) {
      this.report('Connecting…');
      this.timer = setTimeout(() => { if (!this.opened) this.end(this.failureReason()); }, 30000);
    }
  }
  send(message: Message, reliable = false) {
    const channel = reliable ? this.reliable : this.fast;
    if (this.disposed || this.ended || channel?.readyState !== 'open' || channel.bufferedAmount > 128 * 1024) return;
    const raw = JSON.stringify(message); try { channel.send(raw); this.sent += raw.length; } catch { this.report('Connection interrupted'); }
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.abort.abort(); clearTimeout(this.timer); clearTimeout(this.recoveryTimer); clearInterval(this.heartbeat);
    this.peer.ondatachannel = null; this.peer.onconnectionstatechange = null;
    for (const channel of [this.fast, this.reliable]) if (channel) { channel.onopen = null; channel.onclose = null; channel.onmessage = null; channel.onerror = null; channel.close(); }
    this.peer.close(); this.onReady = () => {}; this.onMessage = () => {}; this.onDisconnect = () => {}; this.onStatus = () => {};
  }
}
