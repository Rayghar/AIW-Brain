import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.69/screenshots';

function observe(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', (request) => errors.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`));
  return errors;
}
function meaningful(errors: string[]) {
  return errors.filter((value) => !/favicon|React DevTools|ResizeObserver loop|ERR_ABORTED|telemetry/i.test(value));
}
async function chooseRole(page: Page, role: string) {
  await mountAiw(page);
  const continueLocally = page.getByRole('button', { name: /Continue locally/i });
  if (await continueLocally.isVisible().catch(() => false)) await continueLocally.click();
  const roleCard = page.locator('.role-card').filter({ hasText: role }).first();
  await roleCard.waitFor({ state: 'visible' });
  await roleCard.click();
  const tour = page.getByRole('dialog');
  if (await tour.isVisible().catch(() => false)) {
    const close = tour.getByRole('button', { name: /close|skip|not now/i }).first();
    if (await close.isVisible().catch(() => false)) await close.click();
  }
}
async function assertNoHorizontalOverflow(page: Page) {
  const result = await page.evaluate(() => ({
    document: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    main: (() => { const element = document.getElementById('aiw-main'); return element ? Math.max(0, element.scrollWidth - element.clientWidth) : 0; })(),
  }));
  expect(result.document).toBeLessThanOrEqual(1);
  expect(result.main).toBeLessThanOrEqual(1);
}
async function openEvaluationLab(page: Page) {
  const toggle = page.getByTestId('role-rail-toggle');
  const viewport = page.viewportSize()!;
  if (viewport.width < 1440) {
    await expect(toggle).toHaveAttribute('aria-label', 'Expand role navigation');
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Close role navigation' })).toBeVisible();
  } else {
    await expect(toggle).toHaveAttribute('aria-label', 'Collapse role navigation');
  }
  const evaluationItem = page.locator('.role-based-nav').getByRole('button', { name: 'Architecture Brain Evaluation Lab', exact: true });
  if (viewport.width < 1440) {
    const openLabel = evaluationItem.locator('.nav-item-label strong');
    await expect(openLabel).toBeVisible();
    expect(await openLabel.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(24);
  }
  await evaluationItem.click();
  await expect(page.getByTestId('architecture-outcome-lab')).toBeVisible();
  if (viewport.width < 1440) {
    await expect(page.getByRole('button', { name: 'Close role navigation' })).toHaveCount(0);
    await expect(page.locator('#aiw-main')).toBeFocused();
  }
  await expect(page.locator('.role-based-nav button.active')).toHaveCount(1);
  await expect(page.locator('.role-based-nav button.active')).toHaveAttribute('aria-label', 'Architecture Brain Evaluation Lab');
  if (viewport.width >= 1440) {
    const activeLabel = page.locator('.role-based-nav button.active .nav-item-label strong');
    await expect(activeLabel).toBeVisible();
    expect(await activeLabel.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(24);
  }
}

async function exerciseLab(page: Page) {
  await expect(page.getByTestId('architecture-outcome-lab').getByRole('heading', { name: /Seven scenarios\. Three modes/i })).toBeVisible();
  await expect(page.locator('.aoe-hero')).not.toContainText(/rc\.10\.69/i);
  await expect(page.locator('.aoe-list > button')).toHaveCount(7);
  for (const label of ['Mode comparison', 'Lifecycle evidence', 'Expert review pack', 'Navigation & UX', 'Pilot readiness', 'Outcome overview']) {
    const tab = page.locator('.aoe-tabs').getByRole('button', { name: label, exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-current', 'page');
  }
  await page.locator('.aoe-tabs').getByRole('button', { name: 'Navigation & UX', exact: true }).click();
  await expect(page.getByTestId('architecture-outcome-lab')).toContainText(/responsive|active state|focus|backdrop/i);
  await page.locator('.aoe-tabs').getByRole('button', { name: 'Pilot readiness', exact: true }).click();
  await expect(page.getByTestId('architecture-outcome-lab')).toContainText(/Independent expert review|Measured human baseline|Authorised enterprise initiative/i);
  await expect(page.getByTestId('architecture-outcome-lab')).toContainText(/does not claim|remain required|reference-calibration|Independent expert scoring/i);
  await assertNoHorizontalOverflow(page);
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });

test('enterprise architect can evaluate outcomes through a stable responsive navigation journey', async ({ page }, info) => {
  const errors = observe(page);
  await chooseRole(page, 'Enterprise Architect');
  await openEvaluationLab(page);
  await exerciseLab(page);
  if ((page.viewportSize()?.width ?? 0) >= 1440) {
    const persistentLabel = page.locator('.role-based-nav button.active .nav-item-label strong');
    await expect(persistentLabel).toBeVisible();
    expect(await persistentLabel.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(24);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.locator('.notice-toast').waitFor({ state: 'hidden', timeout: 7_000 }).catch(() => undefined);
  await page.screenshot({ path: `${evidenceDir}/01-enterprise-evaluation-lab-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
  expect(meaningful(errors)).toEqual([]);
});

test('knowledge curator reaches the same evaluation evidence through a distinct accountable role journey', async ({ page }, info) => {
  const errors = observe(page);
  await chooseRole(page, 'Knowledge Curator');
  await openEvaluationLab(page);
  await expect(page.locator('.role-nav-intent')).toContainText(/Knowledge Curator|Curate governed architecture knowledge/i);
  await page.locator('.aoe-tabs').getByRole('button', { name: 'Expert review pack', exact: true }).click();
  await expect(page.getByTestId('architecture-outcome-lab')).toContainText(/blinded|rubric|independent experts/i);
  await assertNoHorizontalOverflow(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.locator('.notice-toast').waitFor({ state: 'hidden', timeout: 7_000 }).catch(() => undefined);
  await page.screenshot({ path: `${evidenceDir}/02-curator-evaluation-lab-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
  expect(meaningful(errors)).toEqual([]);
});
