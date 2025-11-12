import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 10000,
    setupFiles: ['./test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,ts}'],
      exclude: ['src/pgn.js', 'src/workerParser.js'],
    },
  },
})
