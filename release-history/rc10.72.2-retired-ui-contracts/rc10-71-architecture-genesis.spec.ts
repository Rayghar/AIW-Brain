import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.71/screenshots';

function observe(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', (request) => {
    const value = `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`;
    if (!/presence\/heartbeat/i.test(value)) errors.push(value);
  });
  return errors;
}

function meaningful(errors: string[]) {
  return errors.filter((entry) => !/favicon|React DevTools|ResizeObserver loop|ERR_ABORTED|LLM_ALL_ROUTES_FAILED/i.test(entry));
}

async function dismissNotice(page: Page) {
  const toast = page.locator('.notice-toast');
  if (await toast.isVisible().catch(() => false)) await toast.waitFor({ state: 'hidden', timeout: 7_000 }).catch(() => undefined);
}

async function noOverflow(page: Page) {
  const result = await page.evaluate(() => {
    const main = document.getElementById('aiw-main');
    return { document: Math.max(0, document.documentElement.scrollWidth - innerWidth), main: main ? Math.max(0, main.scrollWidth - main.clientWidth) : 0 };
  });
  expect(result.document).toBeLessThanOrEqual(1);
  expect(result.main).toBeLessThanOrEqual(1);
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });

test('an idea becomes governed requirements, interactive journeys and a reviewable System Context', async ({ page }, info) => {
  test.setTimeout(90_000);
  const errors = observe(page);
  await mountAiw(page);
  await page.getByRole('button', { name: /open sample architecture/i }).click();
  if (!await page.getByTestId('requirements-genesis-studio').isVisible().catch(() => false)) {
    const launcher = page.getByRole('button', { name: /Open role navigation/i });
    if (await launcher.isVisible().catch(() => false)) await launcher.click();
    await page.getByTestId('role-navigation-v2').getByRole('button', { name: /Requirements & Intent/i }).click();
    const workArea = page.getByRole('button', { name: /^Work area$/i });
    if (await workArea.isVisible().catch(() => false)) await workArea.click();
  }
  await expect(page.getByTestId('requirements-genesis-studio')).toBeVisible();

  const idea = 'Build an agency banking platform that enables agents to onboard customers, verify identity, complete cash deposits, cash withdrawals and transfers, integrate with core banking and the payment switch, reconcile transactions, reverse failed transactions, protect customer information, and must be highly available, fast and scalable during dependency failures.';
  await page.getByPlaceholder(/Build an agency banking platform/i).fill(idea);
  await page.getByRole('button', { name: /Add idea as source/i }).click();
  await expect(page.getByText('Solution idea', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Generate requirements & journeys/i }).click();

  await expect(page.getByRole('heading', { name: /Canonical requirements proposal/i })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/source-derived|architect-confirmed/i).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /Requirements health/i })).toBeVisible();
  await expect(page.getByText(/Unmeasured qualitative target/i).first()).toBeVisible();
  await noOverflow(page);
  await dismissNotice(page);
  await page.screenshot({ path: `${evidenceDir}/requirements-proposal-${info.project.name}.png`, fullPage: false, animations: 'disabled' });

  await page.getByRole('button', { name: /Accept selected model/i }).click();
  await expect(page.getByRole('button', { name: /Journey Atlas/i })).toHaveClass(/is-active/);
  await expect(page.locator('.journey-sequence')).toBeVisible();
  await expect(page.getByText(/Architecture obligations/i).first()).toBeVisible();
  const firstMessage = page.locator('.journey-message-row').first();
  await firstMessage.click();
  await expect(page.getByText(/Selected interaction/i)).toBeVisible();
  await noOverflow(page);
  await dismissNotice(page);
  await page.screenshot({ path: `${evidenceDir}/journey-atlas-${info.project.name}.png`, fullPage: false, animations: 'disabled' });

  const launcher = page.getByRole('button', { name: /Open role navigation/i });
  if (await launcher.isVisible().catch(() => false)) await launcher.click();
  const contextNav = page.getByTestId('role-navigation-v2').getByRole('button', { name: /System Context & Journeys/i });
  await contextNav.click();
  await expect(page.getByTestId('system-context-studio')).toBeVisible();
  await expect(page.getByText(/Candidate preview/i)).toBeVisible();
  await expect(page.getByText(/Compiled by CAMBRIDGE-SA-1.0/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Accept context model/i })).toBeVisible();
  await noOverflow(page);
  await dismissNotice(page);
  await page.screenshot({ path: `${evidenceDir}/system-context-preview-${info.project.name}.png`, fullPage: false, animations: 'disabled' });

  await page.getByRole('button', { name: /Accept context model/i }).click();
  await expect(page.getByText(/Canonical context/i)).toBeVisible();
  await page.getByRole('button', { name: /^Outputs$/i }).click();
  await expect(page.getByTestId('actual-stage-output-context')).toBeVisible();
  await expect(page.getByTestId('actual-stage-output-context')).toContainText(/Context participants/i);
  await expect(page.getByTestId('actual-stage-output-context')).toContainText(/Boundary interactions/i);
  await noOverflow(page);
  await dismissNotice(page);
  await page.screenshot({ path: `${evidenceDir}/system-context-output-${info.project.name}.png`, fullPage: false, animations: 'disabled' });

  expect(meaningful(errors)).toEqual([]);
});
