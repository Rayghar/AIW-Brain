import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.59/screenshots';
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

test.describe('AIW rc.10.59 canonical model, transition and Viewbook', () => {
  test('canvas remains the dominant steady-state surface with no spillover', async ({ page }, testInfo) => {
    const errors = collectErrors(page); await openRealisationCanvas(page);
    await expect(page.locator('.canvas-toolbar')).toBeHidden();
    await expect(page.locator('.canvas-mode-banner')).toBeHidden();
    await expect(page.getByRole('button', { name: /Viewbook/i })).toBeVisible();
    const metrics = await page.evaluate(() => {
      const shell = document.querySelector('.canvas-shell') as HTMLElement | null;
      const canvas = document.querySelector('.canvas-shell .flow-container') as HTMLElement | null;
      const ribbon = document.querySelector('.stage-studio-ribbon') as HTMLElement | null;
      return { documentOverflow: document.documentElement.scrollWidth - innerWidth, shellOverflow: shell ? shell.scrollWidth - shell.clientWidth : 999, canvasWidth: canvas?.getBoundingClientRect().width ?? 0, ribbonOverflow: ribbon ? ribbon.scrollWidth - ribbon.clientWidth : 999 };
    });
    expect(metrics.documentOverflow).toBeLessThanOrEqual(1);
    expect(metrics.shellOverflow).toBeLessThanOrEqual(1);
    expect(metrics.ribbonOverflow).toBeLessThanOrEqual(1);
    expect(metrics.canvasWidth).toBeGreaterThan(testInfo.project.name.includes('laptop') ? 500 : 850);
    await page.screenshot({ path: `${evidenceDir}/01-canvas-centre-${testInfo.project.name}.png`, fullPage: false });
    expect(meaningful(errors)).toEqual([]);
  });

  test('Viewbook provides ten clickable viewpoint projections', async ({ page }, testInfo) => {
    const errors = collectErrors(page); await openRealisationCanvas(page);
    await page.getByRole('button', { name: /Viewbook/i }).click();
    const viewbook = page.getByTestId('architecture-viewbook');
    await expect(viewbook).toBeVisible();
    await expect(viewbook.locator('.architecture-viewbook__strip button')).toHaveCount(10);
    await viewbook.getByRole('button', { name: /Deployment/i }).click();
    await expect(viewbook.getByRole('heading', { name: /Physical Deployment/i })).toBeVisible();
    const overflow = await viewbook.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `${evidenceDir}/02-viewbook-deployment-${testInfo.project.name}.png`, fullPage: false });
    expect(meaningful(errors)).toEqual([]);
  });

  test('stage transition opens a reviewable proposal before mutation', async ({ page }, testInfo) => {
    const errors = collectErrors(page); await openRealisationCanvas(page);
    await page.getByRole('button', { name: /Transition/i }).click();
    const studio = page.getByTestId('stage-transition-studio');
    await expect(studio).toBeVisible();
    await expect(studio.getByText(/Nothing is changed until/i)).toBeVisible();
    await expect(studio.getByRole('button', { name: /Apply .* governed projection/i })).toBeVisible();
    const overflow = await studio.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `${evidenceDir}/03-stage-transition-${testInfo.project.name}.png`, fullPage: false });
    expect(meaningful(errors)).toEqual([]);
  });

  test('governed knowledge is exposed as distinct design tools', async ({ page }, testInfo) => {
    const errors = collectErrors(page); await openRealisationCanvas(page);
    const library = page.locator('.architecture-library');
    await library.scrollIntoViewIfNeeded();
    await expect(library).toBeInViewport();
    await library.getByRole('button', { name: /Risks and anti-patterns/i }).click();
    await expect(library.getByText(/Anti-patterns are detection and remediation tools/i)).toBeVisible();
    const antiPattern = library.locator('.library-record--anti-pattern').first();
    await expect(antiPattern).toBeVisible();
    await expect(antiPattern).not.toHaveAttribute('draggable', 'true');
    await page.screenshot({ path: `${evidenceDir}/04-knowledge-tooling-${testInfo.project.name}.png`, fullPage: false });
    expect(meaningful(errors)).toEqual([]);
  });

});
