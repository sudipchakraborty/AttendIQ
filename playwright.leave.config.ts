import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'leave-review.spec.ts',
  outputDir: 'playwright-report/leave-artifacts',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5181', screenshot: 'only-on-failure' },
  webServer: {
    command: 'node scripts/leave-review-dev.mjs --test',
    url: 'http://127.0.0.1:5181',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
