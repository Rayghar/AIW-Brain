import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.72.3/sol-intelligence';

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

async function openSample(page: Page) {
  await mountAiw(page);
  await page.getByRole('button', { name: /open sample architecture/i }).click();
  await expect(page.locator('.guided-delivery')).toBeVisible();
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });

test('Sol exposes stage-correct quality, context, reasoning, lineage and governance receipts', async ({ page }, info) => {
  test.setTimeout(60_000);
  const errors = observe(page);
  await openSample(page);

  await page.getByTestId('open-stage-co-author').click();
  const drawer = page.getByRole('complementary', { name: /Sol for Requirements & Intent/i });
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', { name: /^Ask/i }).click();
  await drawer.getByRole('button', { name: /Which requirement is most ambiguous/i }).click();

  await expect(drawer.getByText('Primary recommendation')).toBeVisible({ timeout: 30_000 });
  await expect(drawer.locator('.sol-quality-badge')).toContainText(/100|conditional|passed/i);
  await expect(drawer.getByLabel('Current architecture context')).toContainText('Requirements & Intent');
  await expect(drawer.getByLabel('Context used by Sol')).toBeVisible();

  await drawer.getByText(/Why this answer passed its quality gate/i).click();
  await expect(drawer.locator('.sol-quality-gates article')).toHaveCount(8);
  await expect(drawer.getByText(/stage alignment/i)).toBeVisible();
  await expect(drawer.getByText(/governance transparency/i)).toBeVisible();

  await drawer.getByText(/Context, reasoning and lineage/i).click();
  await expect(drawer.getByText('Context included')).toBeVisible();
  await expect(drawer.getByText('Deterministic controls', { exact: true })).toBeVisible();
  await expect(drawer.getByText('LLM contribution')).toBeVisible();

  await drawer.getByText('Governance receipt').click();
  await expect(drawer.getByText(/No direct model mutation/i)).toBeVisible();
  await expect(drawer.getByText(/Quality evaluator/i)).toBeVisible();
  await expect(drawer.getByText(/Reasoning mode/i)).toBeVisible();

  await expect(drawer.getByText(/Record decision outcome/i)).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/sol-receipt-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
  expect(meaningful(errors)).toEqual([]);
});
