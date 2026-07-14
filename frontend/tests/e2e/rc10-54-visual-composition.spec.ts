import { expect, test, type Page } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.54/screenshots';

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  return errors;
}

async function openReference(page: Page) {
  await mountAiw(page);
  await page.getByRole('button', { name: /open sample architecture/i }).click();
  await expect(page.locator('.guided-delivery')).toBeVisible();
}

async function chooseStage(page: Page, label: string) {
  await page.locator('.guided-delivery__rail button').filter({ hasText: label }).click();
  await expect(page.locator('.guided-stage-hero')).toBeVisible();
  const workArea = page.getByRole('button', { name: /^Work area$/i });
  if (await workArea.isVisible()) await workArea.click();
}

function expectNoErrors(errors: string[]) {
  expect(errors.filter((entry) => !/favicon|React DevTools|ResizeObserver loop/i.test(entry))).toEqual([]);
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });

test.describe('AIW rc.10.54 visual architecture composition contract', () => {
  test('logical application opens canvas-first with library and stage diagram visible', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openReference(page);
    await chooseStage(page, 'Logical App');
    await expect(page.getByRole('heading', { name: 'Architecture Kit' })).toBeVisible();
    await expect(page.getByPlaceholder('Search stage library…')).toBeVisible();
    await expect(page.locator('.react-flow')).toBeVisible();
    await expect(page.locator('.react-flow__node').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Define canonical interface and event contracts/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Show view, version and export controls/i })).toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/01-canvas-first-${testInfo.project.name}.png`, fullPage: false });
    expectNoErrors(errors);
  });

  test('Pattern DNA topology is searchable, previewable and applicable', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openReference(page);
    await chooseStage(page, 'Realization');
    await page.getByRole('button', { name: /^Template$/i }).click();
    await page.getByPlaceholder('Search stage library…').fill('Transactional Outbox');
    const record = page.locator('.library-record').filter({ hasText: 'Transactional Outbox Topology' });
    await expect(record).toHaveCount(1);
    const before = await page.locator('.react-flow__node').count();
    await record.getByRole('button', { name: /Preview template/i }).click();
    const review = page.getByRole('dialog', { name: /Review architecture placement/i });
    await expect(review).toBeVisible();
    await expect(review).toContainText(/Transactional Outbox/i);
    const apply = review.getByRole('button', { name: /Apply to architecture|Accept trade-offs & apply/i });
    await expect(apply).toBeEnabled();
    await apply.click();
    await expect.poll(async () => page.locator('.react-flow__node').count()).toBeGreaterThan(before);
    await expect(page.locator('.library-authority-notice')).toContainText(/AKR-0.10.60|release/i);
    await page.screenshot({ path: `${evidenceDir}/02-pattern-dna-application-${testInfo.project.name}.png`, fullPage: false });
    expectNoErrors(errors);
  });

  test('first-class interface contracts are available in the modelling workbench', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openReference(page);
    await chooseStage(page, 'Realization');
    await page.getByRole('button', { name: /Define canonical interface and event contracts/i }).click();
    const studio = page.getByRole('region', { name: /Interface contract studio/i });
    await expect(studio).toBeVisible();
    await expect(studio).toContainText(/Interfaces and contracts/i);
    await expect(studio.getByText('Protocol', { exact: true })).toBeVisible();
    await expect(studio.getByText('Authentication', { exact: true })).toBeVisible();
    await expect(studio.getByText('Retry policy', { exact: true })).toBeVisible();
    await expect(studio.getByText('Idempotency', { exact: true })).toBeVisible();
    await expect(studio.getByText('Data classification', { exact: true })).toBeVisible();
    await expect(studio.getByRole('button', { name: /Save contract/i })).toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/03-interface-contract-${testInfo.project.name}.png`, fullPage: false });
    expectNoErrors(errors);
  });

  test('named views and real diagram export formats are directly available', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openReference(page);
    await chooseStage(page, 'Physical Tech');
    await page.getByRole('button', { name: /Show view, version and export controls/i }).click();
    const panel = page.getByRole('region', { name: /Pro canvas view system/i });
    await expect(panel).toBeVisible();
    await expect(panel.getByText(/Named architecture view/i)).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Export SVG' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Export PNG' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Export PDF' })).toBeVisible();
    await expect(panel.getByRole('button', { name: /Save version/i })).toBeVisible();
    const [svgDownload] = await Promise.all([page.waitForEvent('download'), panel.getByRole('button', { name: 'Export SVG' }).click()]);
    const svgPath = await svgDownload.path();
    expect(svgDownload.suggestedFilename()).toMatch(/\.svg$/);
    expect(svgPath ? await readFile(svgPath, 'utf8') : '').toContain('<svg');
    const [pngDownload] = await Promise.all([page.waitForEvent('download'), panel.getByRole('button', { name: 'Export PNG' }).click()]);
    const pngPath = await pngDownload.path();
    expect(pngDownload.suggestedFilename()).toMatch(/\.png$/);
    expect(pngPath ? (await readFile(pngPath)).subarray(1, 4).toString('utf8') : '').toBe('PNG');
    const [pdfDownload] = await Promise.all([page.waitForEvent('download'), panel.getByRole('button', { name: 'Export PDF' }).click()]);
    const pdfPath = await pdfDownload.path();
    expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/);
    expect(pdfPath ? (await readFile(pdfPath)).subarray(0, 8).toString('utf8') : '').toContain('%PDF-1.4');
    await page.screenshot({ path: `${evidenceDir}/04-views-and-exports-${testInfo.project.name}.png`, fullPage: false });
    expectNoErrors(errors);
  });

  test('SDD preview embeds the rendered stage-diagram references', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openReference(page);
    await chooseStage(page, 'SDD Pack');
    await page.getByRole('button', { name: /Preview SDD/i }).click();
    const preview = page.locator('.guided-sdd-preview');
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(/Logical application architecture/i);
    await expect(preview).toContainText(/Application realization architecture/i);
    await expect(preview).toContainText(/Physical technology architecture/i);
    const gallery = page.getByRole('region', { name: /Rendered architecture diagrams/i });
    await expect(gallery).toBeVisible();
    await expect(gallery.locator('img')).toHaveCount(4);
    await expect(gallery.locator('img').first()).toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/05-rendered-sdd-diagrams-${testInfo.project.name}.png`, fullPage: true });
    expectNoErrors(errors);
  });
});
