import { defineConfig, devices } from '@playwright/test';
import { chromiumLaunchOptions } from './scripts/playwright-runtime.mjs';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: './test-results/rc10-78-2',
  reporter: [['list'], ['html', { outputFolder: './playwright-report/rc10-78-2', open: 'never' }]],
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
    { name: 'solution-architect-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 900 } } },
    { name: 'enterprise-architect-laptop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
  ],
  webServer: [
    { command: 'node scripts/start-playwright-api-postgres.mjs', url: 'http://127.0.0.1:4100/health', reuseExistingServer: false, timeout: 120_000, stdout: 'ignore', stderr: 'pipe' },
    { command: 'node scripts/start-playwright-web.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 120_000, stdout: 'ignore', stderr: 'pipe' },
  ],
});
