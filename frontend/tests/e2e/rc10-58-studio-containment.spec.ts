import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.58/screenshots';
function collectErrors(page: Page) { const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message)); page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); }); return errors; }
function meaningful(errors: string[]) { return errors.filter((entry) => !/favicon|React DevTools|ResizeObserver loop|net::ERR_ABORTED/i.test(entry)); }
async function openRealisationCanvas(page: Page) {
  await mountAiw(page);
  await page.getByRole('button', { name: /open sample architecture/i }).click();
  await page.locator('.guided-delivery__rail button').filter({ hasText: 'Realization' }).click();
  const workArea = page.getByRole('button', { name: /^Work area$/i });
  if (await workArea.isVisible()) await workArea.click();
  await expect(page.locator('.react-flow')).toBeVisible();
  await page.locator('.stage-studio-ribbon').scrollIntoViewIfNeeded();
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });

test.describe('AIW rc.10.58 studio containment and canvas-first remediation', () => {
  test('top bar and work modes remain inside the viewport', async ({ page }, testInfo) => {
    const errors = collectErrors(page); await openRealisationCanvas(page);
    const overflow = await page.evaluate(() => ({ document: document.documentElement.scrollWidth - window.innerWidth, topbar: (() => { const el = document.querySelector('.shell-topbar'); return el ? el.scrollWidth - el.clientWidth : 0; })(), flow: (() => { const el = document.querySelector('.topbar-flow-menu'); return el ? el.scrollWidth - el.clientWidth : 0; })() }));
    expect(overflow.document).toBeLessThanOrEqual(1); expect(overflow.topbar).toBeLessThanOrEqual(1); expect(overflow.flow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `${evidenceDir}/01-topbar-containment-${testInfo.project.name}.png`, fullPage: false });
    expect(meaningful(errors)).toEqual([]);
  });

  test('canvas is primary and empty inspector does not consume space', async ({ page }, testInfo) => {
    const errors = collectErrors(page); await openRealisationCanvas(page);
    await expect(page.getByRole('complementary', { name: /Object Inspector panel/i })).toHaveCount(0);
    await expect(page.getByRole('complementary', { name: /Architecture Library panel/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /Current design context/i })).toBeVisible();
    await expect(page.locator('.library-context-disclosure')).toBeVisible();
    const studioOverflow = await page.locator('.canvas-shell').evaluate((studio) => studio.scrollWidth - studio.clientWidth); const canvasMetrics = await page.locator('.canvas-shell .flow-container').evaluate((el) => ({ width: el.getBoundingClientRect().width, className: el.className, parentGrid: getComputedStyle(el.parentElement!).gridTemplateColumns })); const dimensions = { studioOverflow, canvasWidth: canvasMetrics.width };
    expect(dimensions.studioOverflow).toBeLessThanOrEqual(1); expect(dimensions.canvasWidth).toBeGreaterThan(testInfo.project.name.includes('laptop') ? 430 : 700);
    await page.screenshot({ path: `${evidenceDir}/02-canvas-first-${testInfo.project.name}.png`, fullPage: false });
    expect(meaningful(errors)).toEqual([]);
  });

  test('secondary tools are consolidated and drawers never create spillover', async ({ page }, testInfo) => {
    const errors = collectErrors(page); await openRealisationCanvas(page);
    const more = page.locator('.stage-studio-more'); await more.locator('summary').click();
    await expect(more.getByRole('button', { name: /Brain signals/i })).toBeVisible();
    await more.locator('summary').click();
    await page.locator('button[title="Show selected object inspector"]').click();
    await expect(page.getByRole('complementary', { name: /Object Inspector panel/i })).toBeVisible();
    await expect(page.getByRole('complementary', { name: /Architecture Library panel/i })).toHaveCount(0);
    const overflow = await page.evaluate(() => ({ document: document.documentElement.scrollWidth - window.innerWidth, studio: (() => { const el = document.querySelector('.canvas-shell'); return el ? el.scrollWidth - el.clientWidth : 0; })() }));
    expect(overflow.document).toBeLessThanOrEqual(1); expect(overflow.studio).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `${evidenceDir}/03-overlay-inspector-${testInfo.project.name}.png`, fullPage: false });
    expect(meaningful(errors)).toEqual([]);
  });
});
