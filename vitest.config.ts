import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@poker/shared': path.resolve(__dirname, 'shared/dist/index.js'),
    },
  },
  test: {
    include: [
      'server/src/__tests__/**/*.test.ts',
      'client/src/__tests__/**/*.test.{ts,tsx}',
    ],
    globals: true,
    // Node >=25 defines globalThis.localStorage (value: undefined without
    // --localstorage-file), which stops vitest's jsdom env from injecting its
    // own. Disable Node's webstorage so jsdom's localStorage wins.
    poolOptions: {
      forks: { execArgv: ['--no-experimental-webstorage'] },
      threads: { execArgv: ['--no-experimental-webstorage'] },
    },
  },
});
