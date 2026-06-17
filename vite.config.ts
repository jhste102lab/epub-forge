import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The production build is served from the GitHub Pages project subpath,
// while dev and Playwright E2E use the root path.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/epub-forge/' : '/',
  plugins: [react()],
  worker: { format: 'es' },
}));
