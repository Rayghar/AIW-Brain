import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.56/screenshots';

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

async function openCompositionStudio(page: Page) {
  await openReference(page);
  await chooseStage(page, 'Realization');
  await expect(page.getByRole('heading', { name: 'Architecture Kit' })).toBeVisible();
  await page.getByRole('button', { name: /Compose kit/i }).click();
  await expect(page.locator('.rc56-composition-studio')).toBeVisible();
}

async function currentModelObjectCount(page: Page) {
  const article = page.locator('.rc56-before-after article').filter({ hasText: 'Current model' });
  return Number(await article.locator('strong').innerText());
}

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true });
});

test.describe('AIW rc.10.56 Visual Architecture Composition Studio', () => {
  test('every modelling stage exposes canvas-first composition entry', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openReference(page);

    for (const stage of ['Logical App', 'Realization', 'Logical Tech', 'Physical Tech']) {
      await chooseStage(page, stage);
      await expect(page.locator('.react-flow')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Architecture Kit' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Compose kit/i })).toBeVisible();
    }

    await page.screenshot({ path: `${evidenceDir}/01-canvas-first-entry-${testInfo.project.name}.png`, fullPage: false });
    expectNoErrors(errors);
  });

  test('search, stage facets, inspector and provenance are directly usable', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openCompositionStudio(page);

    await expect(page.getByRole('navigation', { name: /Governed composition workflow/i }).locator('span')).toHaveCount(8);
    await expect(page.getByRole('heading', { name: /Search → compare → inspect → preview topology → apply to scope/i })).toBeVisible();

    const search = page.getByPlaceholder('Search styles, patterns, components, interfaces and aliases');
    await search.fill('outbox');
    const outbox = page.locator('.rc56-record-list button').filter({ hasText: /Transactional Outbox/i });
    await expect(outbox.first()).toBeVisible();
    await expect(page.getByText('Current-stage kit')).toBeVisible();
    await expect(page.getByText('Pattern DNA inspector')).toBeVisible();
    await expect(page.getByText('Canonical validation')).toBeVisible();

    await page.getByRole('button', { name: /^Evidence$/i }).click();
    const evidence = page.getByRole('dialog', { name: /Pattern evidence and provenance/i });
    await expect(evidence).toBeVisible();
    await expect(evidence).toContainText(/Knowledge release/i);
    await expect(evidence).toContainText(/Evidence references/i);
    await expect(evidence).toContainText(/Counterfactual explanation/i);
    await evidence.locator('header button').click();
    await expect(evidence).toBeHidden();

    await page.screenshot({ path: `${evidenceDir}/02-search-inspect-evidence-${testInfo.project.name}.png`, fullPage: false });
    expectNoErrors(errors);
  });

  test('selected patterns can be compared before the model changes', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openCompositionStudio(page);

    await page.getByRole('button', { name: /^Compare$/i }).click();
    const compare = page.locator('.rc56-compare-grid');
    await expect(compare).toBeVisible();
    await expect(compare.locator('article')).toHaveCount(2);
    await expect(compare).toContainText(/Use when/i);
    await expect(compare).toContainText(/Question when/i);
    await expect(compare).toContainText(/Obligations/i);
    await expect(compare).toContainText(/Evidence/i);

    await page.screenshot({ path: `${evidenceDir}/03-pattern-comparison-${testInfo.project.name}.png`, fullPage: false });
    expectNoErrors(errors);
  });

  test('preview shows canonical topology and before-after impact for all core stages', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openCompositionStudio(page);

    const stageSelect = page.locator('.rc56-stage-strip label').filter({ hasText: 'Design stage' }).locator('select');
    for (const stage of ['logicalApplication', 'applicationRealization', 'logicalTechnology', 'physicalTechnology']) {
      await stageSelect.selectOption(stage);
      await expect(page.locator('.rc56-topology-viewport svg')).toBeVisible();
      await expect(page.locator('.rc56-before-after article')).toHaveCount(2);
      await expect(page.locator('.rc56-generation-grid article')).toHaveCount(6);
      await expect(page.locator('.rc56-plan-status')).toContainText(/Eligible to apply/i);
      await expect(page.locator('.rc56-checks .failed')).toHaveCount(0);
    }

    await page.screenshot({ path: `${evidenceDir}/04-stage-topology-preview-${testInfo.project.name}.png`, fullPage: false });
    expectNoErrors(errors);
  });

  test('accepted composition changes the canonical model and exact rollback restores it', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openCompositionStudio(page);

    const before = await currentModelObjectCount(page);
    const apply = page.getByRole('button', { name: /Accept and apply/i });
    await expect(apply).toBeEnabled();
    await apply.click();

    await expect.poll(() => currentModelObjectCount(page)).toBeGreaterThan(before);
    await expect(page.getByRole('button', { name: /Roll back last composition/i })).toBeVisible();
    await expect(page.getByRole('navigation', { name: /Governed composition workflow/i }).locator('span.active')).toHaveCount(8);
    await expect(page.locator('.rc56-apply-bar')).toContainText(/duplicate item\(s\) will be safely skipped/i);

    await page.getByRole('button', { name: /Roll back last composition/i }).click();
    await expect.poll(() => currentModelObjectCount(page)).toBe(before);
    await expect(page.getByRole('button', { name: /Roll back last composition/i })).toBeHidden();

    await page.screenshot({ path: `${evidenceDir}/05-apply-and-rollback-${testInfo.project.name}.png`, fullPage: false });
    expectNoErrors(errors);
  });
});
