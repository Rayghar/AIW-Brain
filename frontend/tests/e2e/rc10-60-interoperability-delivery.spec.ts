import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.60/screenshots';
function collectErrors(page: Page) { const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message)); page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); }); return errors; }
function meaningful(errors: string[]) { return errors.filter((entry) => !/favicon|React DevTools|ResizeObserver loop|net::ERR_ABORTED/i.test(entry)); }
async function openProject(page: Page) { await mountAiw(page); await page.getByRole('button', { name: /open sample architecture/i }).click(); }

async function openSdd(page: Page) {
  await openProject(page);
  const stage = page.locator('.guided-delivery__rail button').filter({ hasText: 'SDD Pack' });
  await stage.click();
  const workArea = page.getByRole('button', { name: /^Work area$/i });
  if (await workArea.isVisible()) await workArea.click();
  await expect(page.getByTestId('architecture-exchange-delivery')).toBeVisible();
}

async function openCanvas(page: Page) {
  await openProject(page);
  await page.locator('.guided-delivery__rail button').filter({ hasText: 'Realization' }).click();
  const workArea = page.getByRole('button', { name: /^Work area$/i });
  if (await workArea.isVisible()) await workArea.click();
  await expect(page.locator('.react-flow')).toBeVisible();
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });

test.describe('AIW rc.10.60 architecture interoperability and delivery hardening', () => {
  test('SDD workspace exposes governed exchange formats and accessible PDF delivery', async ({ page }, testInfo) => {
    const errors = collectErrors(page); await openSdd(page);
    await expect(page.getByRole('button', { name: /Export \.dsl/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export CALM/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export \.c4/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Download accessible PDF/i })).toBeVisible();
    await page.getByRole('button', { name: /Validate all formats/i }).click();
    await expect(page.locator('.architecture-exchange-delivery__status')).toContainText('3/3 architecture-as-code formats passed');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `${evidenceDir}/01-exchange-delivery-${testInfo.project.name}.png`, fullPage: false });
    expect(meaningful(errors)).toEqual([]);
  });

  test('Viewbook applies viewpoint-aware layout without changing canonical identity', async ({ page }, testInfo) => {
    const errors = collectErrors(page); await openCanvas(page);
    await page.getByRole('button', { name: /Viewbook/i }).click();
    await expect(page.getByTestId('architecture-viewbook')).toBeVisible();
    const layoutButton = page.getByRole('button', { name: /Auto layout/i });
    await expect(layoutButton).toHaveClass(/active/);
    await page.locator('.architecture-viewbook__strip').getByRole('button', { name: /Deployment/i }).click();
    await expect(page.getByTestId('architecture-viewbook')).toContainText('Physical Deployment');
    await expect(page.locator('.architecture-viewbook__canvas .react-flow__node').first()).toBeVisible();
    const canvasHeight = await page.locator('.architecture-viewbook__canvas').evaluate((element) => element.getBoundingClientRect().height);
    expect(canvasHeight).toBeGreaterThan(300);
    await page.screenshot({ path: `${evidenceDir}/02-viewbook-layout-${testInfo.project.name}.png`, fullPage: false });
    expect(meaningful(errors)).toEqual([]);
  });
});
