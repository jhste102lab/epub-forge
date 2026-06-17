import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const require = createRequire(import.meta.url);

// mammoth ships a `browser` field that remaps two CJS files to browser-safe
// equivalents (swapping out the Node.js file-system unzip for a JSZip-based
// one). Vite applies these substitutions when bundling for the browser.
// In vitest's node runner, CJS-internal require() calls bypass ESM resolution,
// so the alias must target the whole package entry point, redirecting it to the
// pre-built browser bundle that mammoth ships as `mammoth.browser.js`.
const mammothDir = path.dirname(require.resolve('mammoth/package.json'));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: 'mammoth',
        replacement: path.join(mammothDir, 'mammoth.browser.js'),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
