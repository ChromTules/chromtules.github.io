import './style.css';
const app = document.querySelector<HTMLElement>('#app')!;
try {
  const { Game } = await import('./game/Game');
  app.replaceChildren();
  const game = new Game(app);
  window.addEventListener('pagehide', () => game.dispose(), { once: true });
  if (import.meta.hot) import.meta.hot.dispose(() => game.dispose());
} catch (error) {
  app.replaceChildren(); const message = document.createElement('p'); message.className = 'fatal'; message.textContent = `The gym could not open. This game needs a modern browser with WebGL 2 and WebAssembly.\n\n${error instanceof Error ? error.message : 'Reload to try again.'}`; app.append(message); console.error(error);
}
