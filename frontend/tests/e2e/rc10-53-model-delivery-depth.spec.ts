import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.53/screenshots';

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
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });

test.describe('AIW rc.10.53 model-to-delivery depth', () => {
  test('outputs are projected from canonical evidence and can be exported', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openReference(page);
    await page.getByRole('button', { name: /^Outputs$/i }).click();
    await expect(page.getByRole('heading', { name: /Review what this stage has actually produced/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export stage evidence/i })).toBeVisible();
    await expect(page.locator('.guided-output-grid article')).toHaveCount(4);
    await expect(page.locator('.guided-evidence-matrix__rows article')).toHaveCount(4);
    await page.screenshot({ path: `${evidenceDir}/01-requirements-evidence-${testInfo.project.name}.png`, fullPage: true });
    expect(errors.filter((entry) => !/favicon|React DevTools/i.test(entry))).toEqual([]);
  });

  test('active task shows a clear production and evidence contract', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openReference(page);
    await chooseStage(page, 'Drivers');
    await page.getByRole('button', { name: /^Work area$/i }).click();
    const contract = page.getByRole('region', { name: /Active task contract/i });
    await expect(contract).toBeVisible();
    await expect(contract).toContainText(/Produce/i);
    await expect(contract).toContainText(/Evidence required/i);
    await expect(contract).toContainText(/Task state/i);
    await page.screenshot({ path: `${evidenceDir}/02-active-task-contract-${testInfo.project.name}.png`, fullPage: true });
    expect(errors.filter((entry) => !/favicon|React DevTools/i.test(entry))).toEqual([]);
  });

  test('logical application output exposes model, decisions and obligations', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openReference(page);
    await chooseStage(page, 'Logical App');
    await page.getByRole('button', { name: /^Outputs$/i }).click();
    await expect(page.locator('.guided-output-view')).toContainText(/Logical objects/i);
    await expect(page.locator('.guided-output-view')).toContainText(/Accepted styles/i);
    await expect(page.locator('.guided-output-view')).toContainText(/Accepted patterns/i);
    await expect(page.locator('.guided-artifact-list')).toContainText(/Logical Application View/i);
    await page.screenshot({ path: `${evidenceDir}/03-logical-model-evidence-${testInfo.project.name}.png`, fullPage: true });
    expect(errors.filter((entry) => !/favicon|React DevTools/i.test(entry))).toEqual([]);
  });

  test('SDD preview contains the deep model-to-delivery sections', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openReference(page);
    await chooseStage(page, 'SDD Pack');
    await page.getByRole('button', { name: /^Work area$/i }).click();
    await page.getByRole('button', { name: /Preview SDD/i }).click();
    const preview = page.locator('.guided-sdd-preview');
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(/Interface, API and event contract register/i);
    await expect(preview).toContainText(/Data architecture/i);
    await expect(preview).toContainText(/Security, privacy and trust architecture/i);
    await expect(preview).toContainText(/Migration, coexistence and transition plan/i);
    await expect(preview).toContainText(/Architecture review, risks, fitness tests and approvals/i);
    await page.screenshot({ path: `${evidenceDir}/04-deep-sdd-preview-${testInfo.project.name}.png`, fullPage: true });
    expect(errors.filter((entry) => !/favicon|React DevTools/i.test(entry))).toEqual([]);
  });

  test('final delivery remains governed while draft evidence is inspectable', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openReference(page);
    await chooseStage(page, 'SDD Pack');
    await page.getByRole('button', { name: /^Work area$/i }).click();
    await expect(page.getByRole('button', { name: /Generate final delivery pack/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Download draft/i })).toBeEnabled();
    await expect(page.locator('.guided-sdd-room')).toContainText(/Final generation is locked/i);
    await expect(page.locator('.guided-sdd-room__manifest')).toContainText(/Final SDD/i);
    await page.screenshot({ path: `${evidenceDir}/05-governed-delivery-${testInfo.project.name}.png`, fullPage: true });
    expect(errors.filter((entry) => !/favicon|React DevTools/i.test(entry))).toEqual([]);
  });
});
