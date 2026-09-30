export class GameAudio {
  private context?: AudioContext;
  volume = 0.3;
  unlock() { try { this.context ??= new AudioContext(); void this.context.resume().catch(() => {}); } catch { /* Audio is optional. */ } }
  play(kind: string) {
    if (!this.context || this.context.state !== 'running') return;
    const tones: Record<string, [number, number]> = { bump: [170, 0.09], set: [440, 0.07], spike: [85, 0.16], serve: [240, 0.1], floor: [65, 0.12], net: [100, 0.05], point: [720, 0.3], reset: [950, 0.2] };
    const tone = tones[kind]; if (!tone) return;
    const osc = this.context.createOscillator(), gain = this.context.createGain(), now = this.context.currentTime;
    osc.type = kind === 'point' || kind === 'reset' ? 'sine' : 'triangle'; osc.frequency.setValueAtTime(tone[0], now); osc.frequency.exponentialRampToValueAtTime(tone[0] * 0.45, now + tone[1]);
    gain.gain.setValueAtTime(this.volume * 0.28, now); gain.gain.exponentialRampToValueAtTime(0.001, now + tone[1]); osc.connect(gain).connect(this.context.destination); osc.start(); osc.stop(now + tone[1]); osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  dispose() { void this.context?.close(); }
}
