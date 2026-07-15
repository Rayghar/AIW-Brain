import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

function portablePath(value: string): string {
  const home = homedir();
  return home && value.toLowerCase().startsWith(home.toLowerCase())
    ? `%USERPROFILE%${value.slice(home.length)}`
    : value;
}

test('managed Chromium opens the local AIW preview', async ({ browser, page }, testInfo) => {
  const consoleErrors: string[] = [];
  const failedRequests: Array<{ url: string; error: string | null }> = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(`PAGEERROR ${error.message}`));
  page.on('requestfailed', (request) => {
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? null });
  });

  const response = await page.goto('/', { waitUntil: 'networkidle' });
  const title = await page.title();
  const configuredExecutable = process.env.AIW_CHROMIUM_PATH?.trim();
  const executable = configuredExecutable
    ? resolve(configuredExecutable)
    : browser.browserType().executablePath();
  const screenshot = testInfo.outputPath('chromium-readiness.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const evidence = {
    mode: process.env.AIW_READINESS_MODE ?? 'unspecified',
    project: testInfo.project.name,
    chromiumVersion: browser.version(),
    executable: portablePath(executable),
    executableSource: configuredExecutable ? 'AIW_CHROMIUM_PATH' : 'Playwright-managed Chromium',
    testUrl: page.url(),
    pageTitle: title,
    httpStatus: response?.status() ?? null,
    consoleErrors,
    failedRequests,
    screenshot: 'chromium-readiness.png',
    trace: 'trace.zip',
  };
  await testInfo.attach('chromium-readiness-evidence', {
    body: Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`),
    contentType: 'application/json',
  });

  expect(response?.ok()).toBe(true);
  expect(title.trim()).not.toBe('');
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
