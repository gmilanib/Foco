import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const projectDirectory=dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(projectDirectory),
  plugins: [react()],
  base: './',
  server: { port: 5173, strictPort: true },
  build: { outDir: 'dist/renderer', emptyOutDir: true, rollupOptions: {
    input: { main: resolve(projectDirectory, 'index.html'), overlay: resolve(projectDirectory, 'overlay.html') },
  } },
  test: { environment: 'jsdom', setupFiles: ['./src/renderer/testSetup.ts'] },
});
