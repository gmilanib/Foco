import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(__dirname),
  plugins: [react()],
  base: './',
  server: { port: 5173, strictPort: true },
  build: { outDir: 'dist/renderer', emptyOutDir: true, rollupOptions: {
    input: { main: resolve(__dirname, 'index.html'), overlay: resolve(__dirname, 'overlay.html') },
  } },
  test: { environment: 'jsdom', setupFiles: ['./src/renderer/testSetup.ts'] },
});
