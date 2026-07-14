import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.70/screenshots';

function observe(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || /React Flow.*not initialized/i.test(message.text())) errors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    const failure = `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`;
    if (!/presence\/heartbeat/i.test(failure)) errors.push(failure);
  });
  return errors;
}

function meaningful(errors: string[]) {
  return errors.filter((entry) => !/favicon|React DevTools|ResizeObserver loop|ERR_ABORTED/i.test(entry));
}

async function noOverflow(page: Page) {
  const result = await page.evaluate(() => {
    const main = document.getElementById('aiw-main');
    return {
      document: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      main: main ? Math.max(0, main.scrollWidth - main.clientWidth) : 0,
    };
  });
  expect(result.document).toBeLessThanOrEqual(1);
  expect(result.main).toBeLessThanOrEqual(1);
}

async function openReference(page: Page) {
  await mountAiw(page);
  await page.getByRole('button', { name: /open sample architecture/i }).click();
  await expect(page.locator('.guided-delivery')).toBeVisible();
}

async function assertExplanation(page: Page, testId: string) {
  const panel = page.getByTestId(testId);
  await expect(panel).toBeVisible();
  if (!(await panel.getAttribute('open'))) await panel.locator('summary').click();
  await expect(panel).toContainText(/Why this design makes sense/i);
  await expect(panel).toContainText(/How this stage enables the business outcome/i);
  await expect(panel).toContainText(/Requirements and business drivers enabled/i);
  await expect(panel).toContainText(/Trade-offs accepted/i);
  await expect(panel).toContainText(/Risks and open questions/i);
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });

test('Sol explains the lifecycle and the responsive studio remains contained', async ({ page }, info) => {
  test.setTimeout(45_000);
  const errors = observe(page);
  await openReference(page);

  await assertExplanation(page, 'stage-co-author-requirements');
  await noOverflow(page);

  await page.locator('.role-based-nav').getByRole('button', { name: /^Quality Drivers$/i }).click();
  await assertExplanation(page, 'stage-co-author-qualityDrivers');
  await noOverflow(page);

  await page.locator('.role-based-nav').getByRole('button', { name: /^Logical Application$/i }).click();
  await expect(page.getByTestId('stage-co-author-logicalApplication')).toBeVisible();
  await noOverflow(page);

  await page.locator('.role-based-nav').getByRole('button', { name: /^Application Realization$/i }).click();
  await expect(page.getByTestId('stage-co-author-applicationRealization')).toBeVisible();
  await noOverflow(page);

  await page.locator('.role-based-nav').getByRole('button', { name: /^Logical Technology$/i }).click();
  await expect(page.getByTestId('stage-co-author-logicalTechnology')).toBeVisible();
  await noOverflow(page);

  await page.locator('.role-based-nav').getByRole('button', { name: /^Physical Technology$/i }).click();
  await expect(page.getByTestId('stage-co-author-physicalTechnology')).toBeVisible();
  await noOverflow(page);

  await page.locator('.role-based-nav').getByRole('button', { name: /^Review & Assurance$/i }).click();
  await assertExplanation(page, 'stage-co-author-reviewAssurance');
  await noOverflow(page);

  await page.locator('.role-based-nav').getByRole('button', { name: /^SDD Delivery Pack$/i }).click();
  await assertExplanation(page, 'stage-co-author-sddPack');
  await noOverflow(page);

  await page.locator('.notice-toast').waitFor({ state: 'hidden', timeout: 7_000 }).catch(() => undefined);
  await page.screenshot({ path: `${evidenceDir}/stage-co-author-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
  expect(meaningful(errors)).toEqual([]);
});
