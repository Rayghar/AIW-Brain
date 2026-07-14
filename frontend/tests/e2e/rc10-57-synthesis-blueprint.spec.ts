import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.57/screenshots';

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

function expectNoErrors(errors: string[]) {
  expect(errors.filter((entry) => !/favicon|React DevTools|ResizeObserver loop|net::ERR_ABORTED/i.test(entry))).toEqual([]);
}

async function openSynthesis(page: Page) {
  await mountAiw(page);
  await page.getByRole('button', { name: /open sample architecture/i }).click();
  await expect(page.locator('.guided-delivery')).toBeVisible();
  await page.getByRole('button', { name: /^Command$/i }).click();
  const palette = page.getByRole('dialog', { name: /AIW command palette/i });
  await expect(palette).toBeVisible();
  await palette.getByPlaceholder(/Search workspaces/i).fill('Architecture Synthesis');
  await palette.getByRole('button').filter({ hasText: /Architecture Synthesis/i }).first().click();
  await expect(page.locator('.synthesis-workspace')).toBeVisible();
  await expect(page.getByText('rc.10.57 · Architecture Synthesis, Interfaces and Deployment')).toBeVisible();
}

async function generateAlternatives(page: Page) {
  await openSynthesis(page);
  const generate = page.getByRole('button', { name: /Generate governed alternatives/i });
  await expect(generate).toBeEnabled();
  await generate.click();
  await page.getByRole('button', { name: /^Alternatives$/i }).click();
  await expect(page.locator('.alternative-card')).toHaveCount(5, { timeout: 30_000 });
}

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true });
});

test.describe('AIW rc.10.57 Architecture Synthesis, Interfaces and Deployment', () => {
  test('generates five materially different governed alternatives', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await generateAlternatives(page);

    const cards = page.locator('.alternative-card');
    await expect(cards).toHaveCount(5);
    const labels = await cards.locator('header span').allInnerTexts();
    expect(new Set(labels).size).toBe(5);
    await expect(page.locator('.synthesis-alternative-layout')).toBeVisible();
    await expect(page.getByText(/Pattern DNA/i).first()).toBeVisible();

    await page.screenshot({ path: `${evidenceDir}/01-governed-alternatives-${testInfo.project.name}.png`, fullPage: false });
    expectNoErrors(errors);
  });

  test('exposes complete blueprint, contracts, provider overlays and resilience analysis', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await generateAlternatives(page);
    await page.getByRole('button', { name: /Blueprint & interfaces/i }).click();

    await expect(page.locator('.synthesis-blueprint-layout')).toBeVisible();
    await expect(page.getByText('Ten model-derived diagrams')).toBeVisible();
    await expect(page.locator('.handoff-steps > div')).toHaveCount(10);
    await expect(page.getByText('Provider, consumer and executable semantics')).toBeVisible();
    await expect(page.getByText('Neutral first, provider overlay second')).toBeVisible();
    await expect(page.getByText('Trust boundaries and failure-path analysis')).toBeVisible();
    await expect(page.getByText(/Required views/i).first()).toContainText('Required views');

    const interfaceRows = page.locator('.synthesis-blueprint-layout table tbody tr');
    await expect(interfaceRows.first()).toBeVisible();

    await page.screenshot({ path: `${evidenceDir}/02-blueprint-interfaces-deployment-${testInfo.project.name}.png`, fullPage: false });
    expectNoErrors(errors);
  });
});
