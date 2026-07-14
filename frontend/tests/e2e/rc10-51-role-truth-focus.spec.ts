import { expect, test, type Page } from '@playwright/test';
import { mountAiw } from './support/staticAiwHarness';

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  return errors;
}

async function chooseRole(page: Page, role: RegExp) {
  await mountAiw(page);
  await page.getByRole('button', { name: /continue locally/i }).click();
  await page.locator('.role-card').filter({ hasText: role }).click();
  const tour = page.getByRole('dialog', { name: /guided tour/i });
  if (await tour.count()) await tour.getByRole('button', { name: /close guided tour/i }).click();
  await expect(page.locator('#aiw-main')).toBeVisible();
}

test.describe('AIW rc.10.51 role truth and studio focus', () => {
  test('reviewer is bound to reviewer principal and cannot generate the delivery pack', async ({ page }) => {
    const errors = collectErrors(page);
    await chooseRole(page, /Reviewer/i);
    await expect(page.locator('.role-trust-status')).toContainText(/Role-bound reference/i);
    await expect(page.locator('.role-trust-status')).toContainText(/architecture-reviewer/i);
    await page.getByRole('button', { name: /Review Queue/i }).first().click();
    await expect(page.getByRole('heading', { name: /Intelligent Architecture Review/i })).toBeVisible();
    await expect(page.getByTestId('reviewer-disposition')).toBeVisible();
    await expect(page.getByRole('button', { name: /generate handoff artifacts/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /download handoff ZIP/i })).toHaveCount(0);
    expect(errors.filter((entry) => !/favicon|React DevTools/i.test(entry))).toEqual([]);
  });

  test('solution architect retains governed pack generation and a distraction-free focus mode', async ({ page }) => {
    const errors = collectErrors(page);
    await chooseRole(page, /Solution Architect/i);
    await expect(page.locator('.role-trust-status')).toContainText(/solution-architect/i);
    await page.getByRole('button', { name: /^Focus$/i }).click();
    await expect(page.locator('.app-shell')).toHaveClass(/focus-mode/);
    await expect(page.locator('.role-journey-compass')).toHaveCount(0);
    await expect(page.getByLabel('Focused architecture workspace')).toBeVisible();
    await page.getByRole('button', { name: /Guided view/i }).click();
    await page.getByRole('button', { name: /^SDD Delivery Pack$/i }).click();
    await expect(page.getByRole('button', { name: /generate final SDD/i })).toBeEnabled();
    expect(errors.filter((entry) => !/favicon|React DevTools/i.test(entry))).toEqual([]);
  });

  test('enterprise comparison starts with a guided alternative workflow instead of a dead end', async ({ page }) => {
    const errors = collectErrors(page);
    await chooseRole(page, /Enterprise Architect/i);
    await page.getByRole('button', { name: /^Compare$/i }).first().click();
    await expect(page.getByRole('heading', { name: /Compare a governed baseline with an alternative/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Create and open alternative/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Create reviewed snapshot/i })).toBeVisible();
    expect(errors.filter((entry) => !/favicon|React DevTools/i.test(entry))).toEqual([]);
  });

  test('knowledge curator lands directly in a scoped Mind Factory task surface', async ({ page }) => {
    const errors = collectErrors(page);
    await chooseRole(page, /Knowledge Curator/i);
    await page.getByRole('button', { name: /^Mind Factory$/i }).first().click();
    await expect(page.locator('.admin-task-header')).toContainText(/Mind factory/i);
    await expect(page.locator('.admin-hero')).toHaveCount(0);
    await expect(page.locator('.admin-tabs button')).toHaveCount(5);
    await expect(page.locator('.admin-tabs')).not.toContainText(/Security & RBAC|Tenant & flags|Model routes/i);
    expect(errors.filter((entry) => !/favicon|React DevTools/i.test(entry))).toEqual([]);
  });

  test('portfolio reuse and risk steps create distinct task lenses', async ({ page }) => {
    const errors = collectErrors(page);
    await chooseRole(page, /Enterprise Architect/i);
    await page.getByRole('button', { name: /^Reuse$/i }).first().click();
    await expect(page.locator('.task-lens-banner')).toContainText(/Reuse/i);
    await expect(page.locator('.task-filter-chip')).toContainText(/Reuse opportunities/i);
    await page.getByRole('button', { name: /^Risks$/i }).first().click();
    await expect(page.locator('.task-lens-banner')).toContainText(/Risks/i);
    await expect(page.locator('.task-filter-chip')).toContainText(/Portfolio risks/i);
    expect(errors.filter((entry) => !/favicon|React DevTools/i.test(entry))).toEqual([]);
  });
});
