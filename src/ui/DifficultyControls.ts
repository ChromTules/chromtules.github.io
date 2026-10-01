import { DIFFICULTIES, normalizeDifficulty, type Difficulty } from '../ai/Difficulty';

export class DifficultyControls {
  root = document.createElement('fieldset');
  constructor(parent: HTMLElement, onChange: () => void) {
    this.root.id = 'ai-settings'; this.root.innerHTML = '<legend>AI difficulty</legend><p>Changes apply immediately to your hosted match. Each team can use different settings.</p>';
    let saved: unknown[] = []; try { const value = JSON.parse(localStorage.getItem('sideout.difficulty') ?? '[]'); if (Array.isArray(value)) saved = value; } catch { /* Optional storage. */ }
    for (const team of [0, 1]) {
      const section = document.createElement('div'); section.className = 'difficulty-team';
      section.innerHTML = `<label for="ai-preset-${team}">${team === 0 ? 'Blue' : 'Coral'} AI</label><select id="ai-preset-${team}"><option value="easy">Easy</option><option value="normal" selected>Normal</option><option value="hard">Hard</option><option value="custom">Custom</option></select>` + (['reaction', 'accuracy', 'aggression'] as const).map(key => `<label for="ai-${key}-${team}">${key === 'reaction' ? 'Reaction delay (seconds)' : key === 'accuracy' ? 'Aim accuracy' : 'Attack aggression'} <output id="ai-${key}-value-${team}"></output></label><input id="ai-${key}-${team}" type="range" min="${key === 'reaction' ? '0.05' : '0'}" max="${key === 'reaction' ? '0.5' : '1'}" step="0.01">`).join('');
      this.root.append(section);
      const preset = section.querySelector('select')!;
      const show = (d: Difficulty) => { for (const key of ['reaction', 'accuracy', 'aggression'] as const) { const input = section.querySelector<HTMLInputElement>(`#ai-${key}-${team}`)!; input.value = String(d[key]); section.querySelector(`#ai-${key}-value-${team}`)!.textContent = key === 'reaction' ? d[key].toFixed(2) : `${Math.round(d[key] * 100)}%`; } };
      const d = normalizeDifficulty(saved[team]); show(d);
      preset.value = Object.entries(DIFFICULTIES).find(([, v]) => JSON.stringify(v) === JSON.stringify(d))?.[0] ?? 'custom';
      const save = () => { try { localStorage.setItem('sideout.difficulty', JSON.stringify(this.value())); } catch { /* In-memory settings still apply. */ } onChange(); };
      preset.addEventListener('change', () => { if (preset.value !== 'custom') show(DIFFICULTIES[preset.value as keyof typeof DIFFICULTIES]); save(); });
      section.querySelectorAll('input').forEach(input => input.addEventListener('input', () => { preset.value = 'custom'; show(this.team(team)); save(); }));
    }
    parent.append(this.root);
  }
  private team(team: number): Difficulty { return normalizeDifficulty(Object.fromEntries(['reaction', 'accuracy', 'aggression'].map(key => [key, Number(this.root.querySelector<HTMLInputElement>(`#ai-${key}-${team}`)!.value)]))); }
  value(): [Difficulty, Difficulty] { return [this.team(0), this.team(1)]; }
}
