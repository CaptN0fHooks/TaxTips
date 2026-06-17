import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['tools/rule-pack-test/src/cli.js', 'tools/rule-pack-validate/src/cli.js'],
      thresholds: {
        lines: 90,
        branches: 80,
      },
    },
  },
});
