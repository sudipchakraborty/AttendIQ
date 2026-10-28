import { defineConfig } from '@playwright/test';

/** @brief Exercise the production static build with no API or backend server. */
export default defineConfig({
  testDir: './tests',
  testMatch: 'standalone.spec.ts',
  outputDir: 'playwright-report/standalone-artifacts',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5176',
    channel: process.env.PLAYWRIGHT_CHANNEL,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5176 --strictPort',
    url: 'http://127.0.0.1:5176',
    reuseExistingServer: false,
  },
});
