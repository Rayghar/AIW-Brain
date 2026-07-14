import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.52/screenshots';

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
  await expect(page.getByRole('heading', { name: /Requirements & Intent/i })).toBeVisible();
}

async function chooseSolutionArchitect(page: Page) {
  await page.locator('.role-card').filter({ hasText: /^Solution Architect/ }).click();
  await expect(page.locator('.guided-delivery')).toBeVisible();
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });

test.describe('AIW rc.10.52 guided architecture delivery', () => {
  test('a newly created project enters Requirements with one authoritative task flow', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await mountAiw(page);
    await page.getByRole('button', { name: /new guided architecture project/i }).click();
    await page.getByLabel(/project name/i).fill('Global Payments Renewal');
    await page.getByLabel(/business goal/i).fill('Deliver resilient real-time payments with controlled migration risk');
    await page.getByLabel(/quality focus/i).fill('Security, resilience, recoverability and observability');
    await page.getByLabel(/known constraints/i).fill('Legacy core ledger, regulated data residency and phased coexistence');
    await page.getByLabel(/problem/i).fill('The current payments platform is slow to change, difficult to recover and cannot provide complete transaction traceability across digital and partner channels.');
    await page.getByRole('button', { name: /create guided project/i }).click();
    await chooseSolutionArchitect(page);

    await expect(page.getByRole('heading', { name: /Requirements & Intent/i })).toBeVisible();
    await expect(page.getByText(/Define the business problem, scope, stakeholders, constraints/i)).toBeVisible();
    await expect(page.getByText(/Done means:/i)).toBeVisible();
    await expect(page.locator('.guided-task-grid article')).toHaveCount(4);
    await expect(page.locator('.role-journey-compass')).toHaveCount(0);
    await expect(page.locator('.architecture-lifecycle-journey')).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: /guided tour/i })).toHaveCount(0);
    await page.screenshot({ path: `${evidenceDir}/01-new-project-requirements-${testInfo.project.name}.png`, fullPage: true });
    expect(errors.filter((entry) => !/favicon|React DevTools/i.test(entry))).toEqual([]);
  });

  test('stage handoff is blocked by explicit evidence and routes the user to the fix', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openReference(page);
    const primary = page.locator('.guided-stage-footer .button--primary');
    await primary.click();
    await expect(page.locator('.guided-pane-tabs button.is-active')).toContainText(/Validation/i);
    await expect(page.locator('.guided-validation-list article.is-blocker').first()).toBeVisible();
    const firstFix = page.locator('.guided-validation-list article.is-blocker button').first();
    await firstFix.click();
    await expect(page.locator('.guided-pane-tabs button.is-active')).toContainText(/Work area/i);
    await expect(page.getByText(/Stakeholders — one per line/i)).toBeVisible();
    await expect(page.locator('.guided-delivery-workarea .brief-field--intent:visible')).toHaveCount(0);
    await expect(page.locator('.topbar-flow-menu')).not.toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/02-evidence-gated-handoff-${testInfo.project.name}.png`, fullPage: true });
    expect(errors.filter((entry) => !/favicon|React DevTools/i.test(entry))).toEqual([]);
  });

  test('all eight stages explain purpose, output and evidence without competing process navigation', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openReference(page);
    const expected = [
      ['Requirements', /Requirements & Intent/i],
      ['Drivers', /Quality Drivers/i],
      ['Logical App', /Logical Application Architecture/i],
      ['Realization', /Application Realization/i],
      ['Logical Tech', /Logical Technology Architecture/i],
      ['Physical Tech', /Physical Technology & Deployment/i],
      ['Review', /Review & Assurance/i],
      ['SDD Pack', /SDD & Delivery Pack/i],
    ] as const;
    for (const [railLabel, heading] of expected) {
      await page.locator('.guided-delivery__rail button').filter({ hasText: railLabel }).click();
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      await expect(page.locator('.guided-stage-outcome')).toBeVisible();
      await expect(page.locator('.guided-pane-tabs')).toBeVisible();
    }
    await page.screenshot({ path: `${evidenceDir}/03-sdd-governed-stage-${testInfo.project.name}.png`, fullPage: true });
    expect(errors.filter((entry) => !/favicon|React DevTools/i.test(entry))).toEqual([]);
  });

  test('review output is persisted before approval and final SDD remains approval-gated', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openReference(page);
    await page.locator('.guided-delivery__rail button').filter({ hasText: 'Review' }).click();
    await page.getByRole('button', { name: /Work area/i }).click();
    await page.getByRole('button', { name: /Record review outputs/i }).click();
    await expect(page.locator('.notice-toast')).toContainText(/review finding|already recorded|proposed ADR/i);
    await page.getByRole('button', { name: /Validation/i }).click();
    await expect(page.locator('.guided-validation-list')).toContainText(/A review run is persisted/i);

    await page.locator('.guided-delivery__rail button').filter({ hasText: 'SDD Pack' }).click();
    await page.getByRole('button', { name: /Work area/i }).click();
    await expect(page.getByRole('button', { name: /Generate final delivery pack/i })).toBeDisabled();
    await expect(page.locator('.guided-sdd-room')).toContainText(/approved baseline/i);
    await page.screenshot({ path: `${evidenceDir}/04-review-persistence-sdd-gate-${testInfo.project.name}.png`, fullPage: true });
    expect(errors.filter((entry) => !/favicon|React DevTools/i.test(entry))).toEqual([]);
  });

  test('quality-driver work opens the task-specific scenario editor rather than the complete studio', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openReference(page);
    await page.locator('.guided-delivery__rail button').filter({ hasText: 'Drivers' }).click();
    await page.getByRole('button', { name: /Work area/i }).click();
    await expect(page.locator('.quality-scenario-section')).toBeVisible();
    await expect(page.locator('.quality-list')).not.toBeVisible();
    await expect(page.locator('.calibration-governance')).not.toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/05-quality-task-focus-${testInfo.project.name}.png`, fullPage: true });
    expect(errors.filter((entry) => !/favicon|React DevTools/i.test(entry))).toEqual([]);
  });

});
