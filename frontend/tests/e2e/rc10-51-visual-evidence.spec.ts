import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { mountAiw } from './support/staticAiwHarness';

const shotRoot = '/mnt/data/AIW_RC10_51_ACCEPTANCE_SHOTS';
mkdirSync(shotRoot, { recursive: true });

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  return errors;
}

async function chooseRole(page: Page, role: RegExp) {
  await mountAiw(page);
  await page.getByRole('button', { name: /continue locally/i }).click();
  await page.locator('.role-card').filter({ hasText: role }).click();
  const tour = page.getByRole('dialog', { name: /guided tour/i });
  if (await tour.count()) await tour.getByRole('button', { name: /close guided tour/i }).click();
  await expect(page.locator('#aiw-main')).toBeVisible();
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({ path: join(shotRoot, `${testInfo.project.name}-${name}.png`), fullPage: false });
}

function assertQuiet(errors: string[]) {
  expect(errors.filter((entry) => !/favicon|React DevTools/i.test(entry))).toEqual([]);
}

test('reviewer governed review and disposition', async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await chooseRole(page, /Reviewer/i);
  await page.getByRole('button', { name: /Review Queue/i }).first().click();
  await expect(page.getByTestId('reviewer-disposition')).toBeVisible();
  await capture(page, testInfo, 'reviewer-governed-review');
  assertQuiet(errors);
});

test('solution architect canvas focus', async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await chooseRole(page, /Solution Architect/i);
  await page.getByRole('button', { name: /^Focus$/i }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/focus-mode/);
  await capture(page, testInfo, 'solution-architect-focus');
  assertQuiet(errors);
});

test('enterprise comparison guided start', async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await chooseRole(page, /Enterprise Architect/i);
  await page.getByRole('button', { name: /^Compare$/i }).first().click();
  await expect(page.getByRole('heading', { name: /Compare a governed baseline/i })).toBeVisible();
  await capture(page, testInfo, 'enterprise-comparison');
  assertQuiet(errors);
});

test('enterprise reuse task lens', async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await chooseRole(page, /Enterprise Architect/i);
  await page.getByRole('button', { name: /^Reuse$/i }).first().click();
  await expect(page.locator('.task-filter-chip')).toContainText(/Reuse opportunities/i);
  await capture(page, testInfo, 'enterprise-reuse-lens');
  assertQuiet(errors);
});

test('knowledge curator scoped mind factory', async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await chooseRole(page, /Knowledge Curator/i);
  await page.getByRole('button', { name: /^Mind Factory$/i }).first().click();
  await expect(page.locator('.admin-task-header')).toContainText(/Mind factory/i);
  await capture(page, testInfo, 'curator-mind-factory');
  assertQuiet(errors);
});

test('knowledge readiness is honest', async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await chooseRole(page, /Knowledge Curator/i);
  await page.getByRole('button', { name: /^Claims$/i }).first().click();
  await expect(page.getByText(/Release readiness/i)).toBeVisible();
  await capture(page, testInfo, 'curator-claims-readiness');
  assertQuiet(errors);
});

test('administrator security acceptance boundary', async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await chooseRole(page, /Administrator/i);
  await page.getByRole('button', { name: /Security & RBAC/i }).first().click();
  await expect(page.locator('.admin-task-header')).toContainText(/Security/i);
  await capture(page, testInfo, 'administrator-security');
  assertQuiet(errors);
});
