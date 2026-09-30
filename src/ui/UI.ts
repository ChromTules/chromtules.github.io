import type { MatchState, PlayerState } from '../game/Types';
export class UI {
  root: HTMLElement;
  onSolo = () => {}; onHost = () => {}; onJoin = () => {}; onResume = () => {}; onLeave = () => {}; onReset = () => {};
  onGenerateAnswer: (value: string) => void = () => {}; onAcceptAnswer: (value: string) => void = () => {};
  onSettings = () => {};
  private abort = new AbortController();
  private noticeUntil = 0;
  constructor(container: HTMLElement) {
    this.root = document.createElement('div'); this.root.id = 'interface'; container.append(this.root);
    this.root.innerHTML = `
      <header class="masthead"><a class="wordmark" href="#" aria-label="Sideout home">SIDEOUT<span class="ball-icon">◒</span></a><span class="edition">Indoor volleyball<br><b>Your next rally starts here.</b></span></header>
      <section id="menu" class="menu"><div class="menu-intro"><span class="court-tag">Court 01 / Open gym</span><h1>One more<br>rally.</h1><p>Find your touch. Read the ball.<br>Take the next point.</p></div>
        <div class="menu-actions"><button id="solo" class="primary"><span>Play solo</span><small>Practice your bump, set & spike</small><b>↗</b></button><button id="host"><span>Create multiplayer game</span><small>Invite a friend for 1v1</small><b>+</b></button><button id="join"><span>Join multiplayer game</span><small>Have a connection code?</small><b>↗</b></button><button id="settings-open" class="text-button">Settings & controls</button></div>
        <p class="desktop-note" id="device-note">Made for keyboard + mouse. Headphones welcome.</p>
      </section>
      <div id="court-caption"><span class="live-dot"></span> Open practice court <span>9 × 18 m</span></div>
      <section id="connection" class="panel" hidden><button class="back" id="connection-back">← Back to gym</button><h2 id="connection-title">Play with a friend</h2><p id="connection-help"></p><p class="connection-status" id="connection-status" role="status">Ready</p>
        <label for="signal-out">Your connection code</label><textarea id="signal-out" readonly placeholder="Your code will appear here" spellcheck="false"></textarea><button id="copy-code">Copy code</button>
        <label for="signal-in" id="signal-label">Paste your friend’s code</label><textarea id="signal-in" placeholder="Paste the entire code here" spellcheck="false"></textarea><button id="signal-submit" class="primary">Connect</button><p class="fine">Send codes using any messaging app. Some networks prevent a direct connection; try another network if connection fails.</p>
      </section>
      <section id="settings" class="panel" hidden><button class="back" id="settings-back">← Back</button><h2>Make yourself<br>at home.</h2>
        <label for="sensitivity">Mouse sensitivity</label><input id="sensitivity" type="range" min="0.5" max="3" step="0.1" value="1">
        <label for="volume">Sound volume</label><input id="volume" type="range" min="0" max="1" step="0.05" value="0.3">
        <label for="quality">Graphics</label><select id="quality"><option value="high">Full lighting</option><option value="low">Performance</option></select>
        <label for="points">Match points (next match)</label><select id="points"><option>15</option><option>21</option><option>25</option></select>
        <div class="control-list"><p><kbd>W A S D</kbd> Move <kbd>Mouse</kbd> Look</p><p><kbd>Space</kbd> Jump / block near net</p><p><kbd>LMB</kbd> Bump <kbd>RMB</kbd> Set</p><p><kbd>E</kbd> Spike <kbd>Shift</kbd> Dive</p><p><kbd>F</kbd> Toss & serve <kbd>T</kbd> Hold target</p><p><kbd>R</kbd> Reset <kbd>G</kbd> Receive drill</p><p><kbd>H</kbd> Attack drill <kbd>\`</kbd> Debug</p></div>
      </section>
      <section id="hud" hidden><div class="scoreboard"><div class="team blue"><span>Blue</span><strong id="score-blue">0</strong></div><div class="score-center"><span id="mode-label">Practice</span><small id="server-label">Blue serves</small></div><div class="team coral"><strong id="score-coral">0</strong><span>Coral</span></div></div><div class="match-info"><span id="team-label">Team blue</span><span id="net-status">Solo session</span></div><div id="crosshair">+</div><div id="ball-guide" aria-label="Ball direction">●</div><div id="notice" role="status"></div><div id="rally-status"></div><div class="action-bar"><span><kbd>LMB</kbd> Bump</span><span><kbd>RMB</kbd> Set</span><span><kbd>E</kbd> Spike</span><span><kbd>Space</kbd> Jump</span><span><kbd>Shift</kbd> Dive</span><span><kbd>T</kbd> <b id="target-state">Aim target</b></span></div><div class="bottom-hint" id="practice-hint">G Receive drill / H Attack drill / R Reset / Esc Menu</div><progress id="cooldown" max="1" value="1" aria-label="Action ready"></progress><pre id="debug-stats" hidden></pre></section>
      <section id="pause" class="panel pause" hidden><span class="court-tag">Take a breath</span><h2 id="pause-title">Ready for<br>the next ball?</h2><p id="pause-copy">Click below to capture your mouse and step onto the court.</p><button id="resume" class="primary">Enter court</button><button id="reset">Restart match</button><button id="pause-settings">Settings & controls</button><button id="leave" class="text-button">Leave court</button></section>
      <footer id="menu-footer"><span>First-person. Full-court.</span><span>Practice solo. Play together.</span></footer>`;
    const click = (id: string, fn: () => void) => this.el(id).addEventListener('click', fn, { signal: this.abort.signal });
    click('solo', () => this.onSolo()); click('host', () => this.onHost()); click('join', () => this.onJoin()); click('resume', () => this.onResume()); click('leave', () => this.onLeave()); click('reset', () => this.onReset()); click('connection-back', () => this.onLeave());
    click('settings-open', () => this.showSettings()); click('pause-settings', () => this.showSettings());
    click('settings-back', () => { this.el('settings').hidden = true; this.el(this.el('hud').hidden ? 'menu' : 'pause').hidden = false; });
    click('signal-submit', () => { const value = this.value('signal-in'); if (this.role === 'host') this.onAcceptAnswer(value); else this.onGenerateAnswer(value); });
    click('copy-code', () => { const value = this.value('signal-out'); if (!value) return; navigator.clipboard?.writeText(value).then(() => this.status('Code copied. Send it to your friend.')).catch(() => { (this.el('signal-out') as HTMLTextAreaElement).select(); this.status('Select and copy the code above.'); }); });
    ['sensitivity', 'volume', 'quality', 'points'].forEach(id => this.el(id).addEventListener('input', () => this.onSettings(), { signal: this.abort.signal }));
    this.root.querySelector('a')!.addEventListener('click', e => e.preventDefault(), { signal: this.abort.signal });
    if (matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches) { this.el('device-note').textContent = 'This game needs a desktop keyboard and mouse.'; ['solo', 'host', 'join'].forEach(id => (this.el(id) as HTMLButtonElement).disabled = true); }
  }
  role: 'host' | 'guest' = 'host';
  el(id: string) { return this.root.querySelector<HTMLElement>(`#${id}`)!; }
  value(id: string) { return (this.el(id) as HTMLInputElement).value; }
  showMenu() { ['connection', 'settings', 'hud', 'pause'].forEach(id => this.el(id).hidden = true); ['menu', 'court-caption', 'menu-footer'].forEach(id => this.el(id).hidden = false); this.root.classList.remove('playing'); }
  showPlay(solo: boolean) { ['menu', 'connection', 'settings', 'court-caption', 'menu-footer'].forEach(id => this.el(id).hidden = true); this.el('hud').hidden = false; this.el('pause').hidden = false; this.root.classList.add('playing'); this.el('mode-label').textContent = solo ? 'Open practice' : '1 vs 1'; this.el('practice-hint').textContent = solo ? 'G Receive drill / H Attack drill / R Reset / Esc Menu' : 'F Serve / T Hold target / Esc Menu'; }
  showSettings() { this.el('menu').hidden = true; this.el('pause').hidden = true; this.el('settings').hidden = false; }
  showConnection(role: 'host' | 'guest') { this.showMenu(); this.role = role; this.el('menu').hidden = true; this.el('connection').hidden = false; this.el('connection-title').textContent = role === 'host' ? 'Your court. Your invite.' : 'Meet at the net.'; this.el('connection-help').textContent = role === 'host' ? 'Send your offer to a friend. Paste their answer below to connect.' : 'Paste your friend’s offer below, generate an answer, and send it back. Keep this tab open.'; this.el('signal-submit').textContent = role === 'host' ? 'Connect with answer' : 'Generate answer'; (this.el('signal-out') as HTMLTextAreaElement).value = ''; (this.el('signal-in') as HTMLTextAreaElement).value = ''; this.busy(false); }
  code(code: string) { (this.el('signal-out') as HTMLTextAreaElement).value = code; }
  busy(value: boolean) { (this.el('signal-submit') as HTMLButtonElement).disabled = value; }
  status(message: string) { this.el('connection-status').textContent = message; this.el('net-status').textContent = message; }
  notice(message: string) { this.el('notice').textContent = message; this.noticeUntil = performance.now() + 1700; }
  pause(visible: boolean) { if (!this.el('settings').hidden) return; this.el('pause').hidden = !visible; }
  update(match: MatchState, player: PlayerState, time: number, held: boolean, network: string) {
    this.el('score-blue').textContent = String(match.score[0]); this.el('score-coral').textContent = String(match.score[1]); this.el('server-label').textContent = `${match.servingTeam === 0 ? 'Blue' : 'Coral'} serves / to ${match.targetScore}`;
    this.el('team-label').textContent = `Team ${player.team === 0 ? 'blue' : 'coral'}`; this.el('rally-status').textContent = match.reason;
    this.el('target-state').textContent = held ? 'Target held' : 'Aim target'; this.el('net-status').textContent = network;
    (this.el('cooldown') as HTMLProgressElement).value = Math.min(1, Math.max(0, 1 - (player.cooldownUntil - time) / 0.32));
    if (performance.now() > this.noticeUntil) this.el('notice').textContent = '';
    if (match.phase === 'match-over') { this.el('pause-title').textContent = match.reason; this.el('pause-copy').textContent = 'Restart for another match, or leave the court.'; }
    else { this.el('pause-title').innerHTML = 'Ready for<br>the next ball?'; this.el('pause-copy').textContent = 'Click below to capture your mouse and step onto the court.'; }
  }
  dispose() { this.abort.abort(); this.root.remove(); }
}
