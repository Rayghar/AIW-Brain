import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

test('rc10.73.7 exposes a truthful all-source acquisition posture', async ({ browser, page }, testInfo) => {
  const productRoot = resolve(process.cwd(), '..');
  const evidenceRoot = resolve(productRoot, 'release-evidence/rc10.73.7');
  const summary = JSON.parse(await readFile(resolve(evidenceRoot, 'ALL_47_LIVE_ACQUISITION_SUMMARY.json'), 'utf8'));
  const consoleErrors: string[] = [];
  const failedRequests: Array<{ url: string; error: string | null }> = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(`PAGEERROR ${error.message}`));
  page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? null }));

  const response = await page.goto('/', { waitUntil: 'networkidle' });
  const pageTitle = await page.title();
  const artifactRoot = resolve(evidenceRoot, 'playwright-acquisition-posture');
  await mkdir(artifactRoot, { recursive: true });
  const screenshotPath = resolve(artifactRoot, 'acquisition-posture.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const receipt = {
    schemaVersion: 'aiw-playwright-acquisition-posture-v1',
    releaseId: 'AIW v0.10.0-rc.10.73.7',
    executedAt: new Date().toISOString(),
    project: testInfo.project.name,
    browserVersion: browser.version(),
    browserSource: process.env.AIW_CHROMIUM_PATH?.trim() ? 'AIW_CHROMIUM_PATH' : 'Playwright-managed Chromium',
    testUrl: page.url(),
    httpStatus: response?.status() ?? null,
    pageTitle,
    selectedRepositories: summary.expectedGovernedRepositories,
    completedRepositories: summary.completed,
    failedRepositories: summary.failed,
    controlledStops: summary.controlledStops,
    completeAcquisitionFinished: summary.completeAcquisitionFinished,
    knowledgeAuthority: 'candidate',
    productionAccepted: false,
    consoleErrors,
    failedRequests,
    screenshot: 'playwright-acquisition-posture/acquisition-posture.png',
    tracePolicy: 'retain-on-failure',
  };
  await writeFile(resolve(evidenceRoot, 'PLAYWRIGHT_ACQUISITION_POSTURE_RESULTS.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  await testInfo.attach('acquisition-posture', { body: Buffer.from(JSON.stringify(receipt, null, 2)), contentType: 'application/json' });

  expect(summary.results).toHaveLength(47);
  expect(summary.completed).toBe(47);
  expect(summary.failed).toBe(0);
  expect(summary.controlledStops).toBe(0);
  expect(summary.completeAcquisitionFinished).toBe(true);
  expect(summary.productionAccepted).toBe(false);
  expect(response?.ok()).toBe(true);
  expect(pageTitle).toBe('Architecture Intelligence Workbench');
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
