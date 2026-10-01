import type { MatchState, PlayerState } from '../game/Types';
import { KeyBindings, BINDING_LABELS, type Binding } from '../controls/KeyBindings';
import type { TeamSizes } from '../game/Roster';
import { DifficultyControls } from './DifficultyControls';
export class UI {
  root: HTMLElement;
  difficultyControls: DifficultyControls;
  onSolo = () => {}; onMatch = () => {}; onHost = () => {}; onJoin = () => {}; onResume = () => {}; onLeave = () => {}; onReset = () => {};
  onGenerateAnswer: (value: string) => void = () => {}; onAcceptAnswer: (value: string) => void = () => {};
  onSettings = () => {};
  private abort = new AbortController();
  private noticeUntil = 0;
  private bindings?: KeyBindings; private capturing?: Binding; private practice = true;
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
        <label for="fov">Field of view</label><output id="fov-value" for="fov">78°</output><input id="fov" type="range" min="60" max="120" step="1" value="78"><p class="fine">Vertical FOV · applies to both camera views.</p>
        <label for="volume">Sound volume</label><input id="volume" type="range" min="0" max="1" step="0.05" value="0.3">
        <label for="quality">Graphics</label><select id="quality"><option value="high">Full lighting</option><option value="low">Performance</option></select>
        <label for="points">Match points (next match)</label><select id="points"><option>15</option><option>21</option><option>25</option></select>
        <div class="control-list"><p><kbd>W A S D</kbd> Move <kbd>Mouse</kbd> Look</p><p><kbd>Space</kbd> Jump / hold Q to block</p><p><kbd>LMB</kbd> Hold pass / release swing <kbd>RMB</kbd> Set</p><p><kbd>E</kbd> Spike <kbd>Shift</kbd> Dive</p><p><kbd>F</kbd> Toss & serve <kbd>T</kbd> Hold target</p><p><kbd>R</kbd> Reset <kbd>G</kbd> Receive drill</p><p><kbd>H</kbd> Attack drill <kbd>\`</kbd> Debug</p></div>
      </section>
      <section id="hud" hidden><div class="scoreboard"><div class="team blue"><span>Blue</span><strong id="score-blue">0</strong></div><div class="score-center"><span id="mode-label">Practice</span><small id="server-label">Blue serves</small></div><div class="team coral"><strong id="score-coral">0</strong><span>Coral</span></div></div><div class="match-info"><span id="team-label">Team blue</span><span id="net-status">Solo session</span></div><div id="crosshair">+</div><div id="ball-guide" aria-label="Ball direction">●</div><div id="notice" role="status"></div><div id="rally-status"></div><div class="action-bar"><span><kbd>LMB</kbd> Hold pass / release swing</span><span><kbd>RMB</kbd> Set</span><span><kbd>E</kbd> Spike</span><span><kbd>Space</kbd> Jump</span><span><kbd>Shift</kbd> Dive</span><span><kbd>T</kbd> <b id="target-state">Aim target</b></span></div><div class="bottom-hint" id="practice-hint">G Receive drill / H Attack drill / R Reset / Esc Menu</div><progress id="cooldown" max="1" value="1" aria-label="Action ready"></progress><pre id="debug-stats" hidden></pre></section>
      <section id="pause" class="panel pause" hidden><span class="court-tag">Take a breath</span><h2 id="pause-title">Ready for<br>the next ball?</h2><p id="pause-copy">Click below to capture your mouse and step onto the court.</p><button id="resume" class="primary">Enter court</button><button id="reset">Restart match</button><button id="pause-settings">Settings & controls</button><button id="leave" class="text-button">Leave court</button></section>
      <footer id="menu-footer"><span>Your player. Your perspective.</span><span>Practice solo. Play together.</span></footer>`;
    const click = (id: string, fn: () => void) => this.el(id).addEventListener('click', fn, { signal: this.abort.signal });
    click('solo', () => this.onSolo()); click('host', () => this.onHost()); click('join', () => this.onJoin()); click('resume', () => this.onResume()); click('leave', () => this.onLeave()); click('reset', () => this.onReset()); click('connection-back', () => this.onLeave());
    click('settings-open', () => this.showSettings()); click('pause-settings', () => this.showSettings());
    click('settings-back', () => { this.capturing = undefined; this.refreshBindings(); this.el('settings').hidden = true; this.el(this.el('hud').hidden ? 'menu' : 'pause').hidden = false; });
    click('signal-submit', () => { const value = this.value('signal-in'); if (this.role === 'host') this.onAcceptAnswer(value); else this.onGenerateAnswer(value); });
    click('copy-code', () => { const value = this.value('signal-out'); if (!value) return; navigator.clipboard?.writeText(value).then(() => this.status('Code copied. Send it to your friend.')).catch(() => { (this.el('signal-out') as HTMLTextAreaElement).select(); this.status('Select and copy the code above.'); }); });
    try {
      const saved = Number(localStorage.getItem('sideout.fov'));
      if (Number.isFinite(saved) && saved >= 60 && saved <= 120) (this.el('fov') as HTMLInputElement).value = String(Math.round(saved));
    } catch { /* In-memory settings still work when storage is unavailable. */ }
    this.el('fov-value').textContent = `${this.value('fov')}°`;
    this.el('fov').addEventListener('input', () => {
      this.el('fov-value').textContent = `${this.value('fov')}°`;
      try { localStorage.setItem('sideout.fov', this.value('fov')); } catch { /* Storage is optional. */ }
    }, { signal: this.abort.signal });
    ['sensitivity', 'fov', 'volume', 'quality', 'points'].forEach(id => this.el(id).addEventListener('input', () => this.onSettings(), { signal: this.abort.signal }));
    this.root.querySelector('a')!.addEventListener('click', e => e.preventDefault(), { signal: this.abort.signal });
    const matchButton = document.createElement('button'); matchButton.id = 'ai-match'; matchButton.innerHTML = '<span>Play a match</span><small>Team up with AI. Take on the other side.</small><b>↗</b>';
    this.el('solo').after(matchButton); click('ai-match', () => this.onMatch());
    const teamSettings = document.createElement('div'); teamSettings.className = 'team-settings';
    teamSettings.innerHTML = '<h3>Match teams</h3><p>Each unclaimed slot is controlled by AI. Applies to your next match.</p>' + ([['team-blue', 'Blue players'], ['team-coral', 'Coral players']] as const).map(([id, label]) => `<label for="${id}">${label}</label><select id="${id}">${[1, 2, 3, 4, 5, 6].map(n => `<option value="${n}"${n === 3 ? ' selected' : ''}>${n}</option>`).join('')}</select>`).join('');
    this.el('points').after(teamSettings);
    this.difficultyControls = new DifficultyControls(teamSettings, () => this.onSettings());
    const serveHud = document.createElement('div'); serveHud.id = 'serve-hud'; serveHud.hidden = true; this.el('hud').append(serveHud);
    if (matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches) { this.el('device-note').textContent = 'This game needs a desktop keyboard and mouse.'; ['solo', 'ai-match', 'host', 'join'].forEach(id => (this.el(id) as HTMLButtonElement).disabled = true); }
  }
  role: 'host' | 'guest' = 'host';
  el(id: string) { return this.root.querySelector<HTMLElement>(`#${id}`)!; }
  value(id: string) { return (this.el(id) as HTMLInputElement).value; }
  teamSizes(): TeamSizes { return [Number(this.value('team-blue')), Number(this.value('team-coral'))]; }
  difficulty() { return this.difficultyControls.value(); }
  difficultyEditable(editable: boolean) { this.difficultyControls.root.hidden = !editable; }
  setupBindings(bindings: KeyBindings) {
    this.bindings = bindings;
    const controls = this.root.querySelector<HTMLElement>('.control-list')!;
    controls.innerHTML = '<h3>Keyboard controls</h3><p id="binding-help">Click a key to change it. Duplicate keys swap places. Escape cancels.</p><div id="binding-grid"></div><button id="binding-defaults">Restore default keys</button><p>Mouse: look. Hold left mouse: pass platform. Release: swing. Right click: set. V: camera toggle (remappable). Escape: menu.</p>';
    this.el('binding-defaults').addEventListener('click', () => { bindings.reset(); this.capturing = undefined; this.refreshBindings(); }, { signal: this.abort.signal });
    window.addEventListener('keydown', e => {
      if (!this.capturing) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.code === 'Escape') { this.capturing = undefined; this.refreshBindings(); return; }
      try { bindings.bind(this.capturing, e.code); this.capturing = undefined; this.el('binding-help').textContent = 'Saved. Duplicate keys swap places. Escape cancels.'; this.refreshBindings(); }
      catch (error) { this.el('binding-help').textContent = (error as Error).message; }
    }, { signal: this.abort.signal, capture: true });
    this.refreshBindings();
  }
  private refreshBindings() {
    const bindings = this.bindings; if (!bindings) return;
    const grid = this.el('binding-grid'); grid.replaceChildren();
    for (const binding of Object.keys(BINDING_LABELS) as Binding[]) {
      const row = document.createElement('div'), label = document.createElement('span'), button = document.createElement('button');
      label.textContent = BINDING_LABELS[binding]; button.textContent = this.capturing === binding ? 'Press a key…' : bindings.label(binding); button.dataset.binding = binding;
      button.setAttribute('aria-label', `Change ${BINDING_LABELS[binding]}`);
      button.addEventListener('click', () => { this.capturing = binding; this.refreshBindings(); }); row.append(label, button); grid.append(row);
    }
    this.root.querySelector<HTMLElement>('.action-bar')!.innerHTML = `<span><kbd>LMB / ${bindings.label('bump')}</kbd> Hold pass / release swing</span><span><kbd>RMB / ${bindings.label('set')}</kbd> Set</span><span><kbd>${bindings.label('spike')}</kbd> Spike</span><span><kbd>${bindings.label('jump')}</kbd> Jump</span><span><kbd>${bindings.label('block')}</kbd> Block</span><span><kbd>${bindings.label('dive')}</kbd> Dive</span><span><kbd>${bindings.label('target')}</kbd> <b id="target-state">Aim target</b></span><span><kbd>${bindings.label('camera')}</kbd> Camera</span>`;
    this.el('practice-hint').textContent = this.practice ? `${bindings.label('receive')} Receive drill / ${bindings.label('attack')} Attack drill / ${bindings.label('reset')} Reset / Esc Menu` : `${bindings.label('serve')} Serve / Hold ${bindings.label('block')} + ${bindings.label('jump')} Jump to block / Esc Menu`;
  }
  showMenu() { ['connection', 'settings', 'hud', 'pause'].forEach(id => this.el(id).hidden = true); ['menu', 'court-caption', 'menu-footer'].forEach(id => this.el(id).hidden = false); this.root.classList.remove('playing'); }
  showPlay(solo: boolean) { this.practice = solo; ['menu', 'connection', 'settings', 'court-caption', 'menu-footer'].forEach(id => this.el(id).hidden = true); this.el('hud').hidden = false; this.el('pause').hidden = false; this.root.classList.add('playing'); this.el('mode-label').textContent = solo ? 'Open practice' : `${this.teamSizes()[0]} vs ${this.teamSizes()[1]}`; this.refreshBindings(); }
  showSettings() { this.capturing = undefined; this.refreshBindings(); this.el('menu').hidden = true; this.el('pause').hidden = true; this.el('settings').hidden = false; }
  showConnection(role: 'host' | 'guest') { this.showMenu(); this.role = role; this.el('menu').hidden = true; this.el('connection').hidden = false; this.el('connection-title').textContent = role === 'host' ? 'Your court. Your invite.' : 'Meet at the net.'; this.el('connection-help').textContent = role === 'host' ? 'Send your offer to a friend. Paste their answer below to connect.' : 'Paste your friend’s offer below, generate an answer, and send it back. Keep this tab open.'; this.el('signal-submit').textContent = role === 'host' ? 'Connect with answer' : 'Generate answer'; (this.el('signal-out') as HTMLTextAreaElement).value = ''; (this.el('signal-in') as HTMLTextAreaElement).value = ''; this.busy(false); }
  code(code: string) { (this.el('signal-out') as HTMLTextAreaElement).value = code; }
  busy(value: boolean) { (this.el('signal-submit') as HTMLButtonElement).disabled = value; }
  status(message: string) { this.el('connection-status').textContent = message; this.el('net-status').textContent = message; }
  notice(message: string) { this.el('notice').textContent = message; this.noticeUntil = performance.now() + 1700; }
  pause(visible: boolean) { if (!this.el('settings').hidden) return; this.el('pause').hidden = !visible; }
  update(match: MatchState, player: PlayerState, time: number, held: boolean, network: string) {
    const serveHud = this.el('serve-hud'); serveHud.hidden = match.phase !== 'serving' && !match.serveProtected;
    const style = player.serve.style === 'topspin' ? 'Jump topspin' : player.serve.style === 'float' ? 'Float' : 'Underhand';
    serveHud.textContent = match.serveProtected ? 'Receive first · no blocks or spikes on serve' : `${style} · ${this.bindings?.label('serveStyle') ?? 'B'} change style · ${Math.round(player.serve.power * 100)}% power · ${player.serve.stage === 'charging' ? 'Release to toss' : player.serve.stage === 'toss' ? `${player.serve.style === 'topspin' ? 'Jump + ' : ''}${this.bindings?.label('serve') ?? 'F'} strike` : `Hold ${this.bindings?.label('serve') ?? 'F'} to charge`}`;
    this.el('score-blue').textContent = String(match.score[0]); this.el('score-coral').textContent = String(match.score[1]); this.el('server-label').textContent = `${match.servingTeam === 0 ? 'Blue' : 'Coral'} serves / to ${match.targetScore}`;
    this.el('team-label').textContent = `Team ${player.team === 0 ? 'blue' : 'coral'}`;
    const labels: Record<string, Binding> = { F: 'serve', R: 'reset', G: 'receive', H: 'attack', E: 'spike' };
    this.el('rally-status').textContent = match.reason.replace(/\b[F RGHE]\b/g, key => labels[key] && this.bindings ? this.bindings.label(labels[key]) : key);
    this.el('target-state').textContent = held ? 'Target held' : 'Aim target'; this.el('net-status').textContent = network;
    (this.el('cooldown') as HTMLProgressElement).value = Math.min(1, Math.max(0, 1 - (player.cooldownUntil - time) / 0.32));
    if (performance.now() > this.noticeUntil) this.el('notice').textContent = '';
    if (match.phase === 'match-over') { this.el('pause-title').textContent = match.reason; this.el('pause-copy').textContent = 'Restart for another match, or leave the court.'; }
    else { this.el('pause-title').innerHTML = 'Ready for<br>the next ball?'; this.el('pause-copy').textContent = 'Click below to capture your mouse and step onto the court.'; }
  }
  dispose() { this.abort.abort(); this.root.remove(); }
}
