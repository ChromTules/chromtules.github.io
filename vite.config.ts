import { defineConfig } from 'vitest/config';
import wasm from 'vite-plugin-wasm';
export default defineConfig({
  base: './', plugins: [wasm()],
  test: { include: ['tests/*.test.ts'] },
  build: { target: 'esnext', chunkSizeWarningLimit: 1800 },
});
