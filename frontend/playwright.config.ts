import { defineConfig, devices } from '@playwright/test';
import { chromiumLaunchOptions } from './scripts/playwright-runtime.mjs';

const reuseExistingServer = !process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 75_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: './test-results/rc10-59',
  reporter: [['list'], ['html', { outputFolder: './playwright-report/rc10-59', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'en-GB',
    timezoneId: 'Africa/Lagos',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    launchOptions: chromiumLaunchOptions(),
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 900 } } },
    { name: 'chromium-laptop', use: { ...devices['Desktop Chrome'], viewport: { width: 1100, height: 760 } } },
  ],
  webServer: [
    {
      command: 'node scripts/start-playwright-api.mjs',
      url: 'http://127.0.0.1:4100/health',
      reuseExistingServer,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'node scripts/start-playwright-web.mjs',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
