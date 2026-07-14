import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.72.0/screenshots';

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

async function noOverflow(page: Page) {
  const result = await page.evaluate(() => {
    const main = document.getElementById('aiw-main');
    return {
      document: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      main: main ? Math.max(0, main.scrollWidth - main.clientWidth) : 0,
    };
  });
  expect(result.document).toBeLessThanOrEqual(1);
  expect(result.main).toBeLessThanOrEqual(1);
}

async function dismissNotice(page: Page) {
  const toast = page.locator('.notice-toast');
  if (await toast.isVisible().catch(() => false)) await toast.waitFor({ state: 'hidden', timeout: 7_000 }).catch(() => undefined);
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });

test('one Architecture Brain governs requirements, workspace projection and stage co-authoring', async ({ page }, info) => {
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

  const idea = 'Build an agency banking platform that lets agents onboard customers, verify identity, process deposits and withdrawals, integrate with core banking, support reversals, reconcile transactions and remain available during dependency failures.';
  await page.getByPlaceholder(/Build an agency banking platform/i).fill(idea);
  await page.getByRole('button', { name: /Add idea as source/i }).click();
  await page.getByRole('button', { name: /Generate requirements & journeys/i }).click();

  await expect(page.getByRole('heading', { name: /Canonical requirements proposal/i })).toBeVisible({ timeout: 30_000 });
  const receipt = page.locator('[aria-label="Architecture Brain proposal receipt"]');
  await expect(receipt).toBeVisible();
  await expect(receipt).toContainText(/Kernel/);
  await expect(receipt).toContainText(/CAMBRIDGE-SA-1\.0/i);
  await expect(page.locator('[aria-label="Architecture Context Graph summary"]')).toContainText(/typed nodes/i);
  await noOverflow(page);
  await dismissNotice(page);
  await page.screenshot({ path: `${evidenceDir}/requirements-brain-receipt-${info.project.name}.png`, fullPage: false, animations: 'disabled' });

  await page.getByRole('button', { name: /Accept selected model/i }).click();
  await page.getByRole('button', { name: /^Work area$/i }).click();
  await page.getByTestId('open-stage-co-author').last().click();
  const drawer = page.locator('.stage-co-author-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer.locator('[aria-label="Architecture Brain authority receipt"]')).toBeVisible({ timeout: 30_000 });
  await expect(drawer).toContainText(/Kernel/);
  await expect(drawer).toContainText(/Knowledge/);
  await expect(drawer).toContainText(/Cambridge/);
  await expect(drawer).not.toContainText(/browser-generated architecture substitute/i);
  await noOverflow(page);
  await dismissNotice(page);
  await page.screenshot({ path: `${evidenceDir}/stage-co-author-brain-receipt-${info.project.name}.png`, fullPage: false, animations: 'disabled' });

  const authority = await page.request.get('http://127.0.0.1:4100/api/architecture-brain/authority-audit', { headers: { 'x-aiw-tenant-id': 'tenant-reference', 'x-aiw-user-id': 'user-owner' } });
  expect(authority.ok()).toBeTruthy();
  const audit = await authority.json();
  expect(audit.summary.migrationRequiredPaths).toBe(0);
  expect(audit.paths.filter((item: { category: string }) => item.category === 'architecture-runtime').every((item: { orchestrated: boolean }) => item.orchestrated)).toBe(true);

  expect(meaningful(errors)).toEqual([]);
});
