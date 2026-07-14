import { expect, test, type Page } from '@playwright/test';
import { mountAiw } from './support/staticAiwHarness';

async function enterArchitectWorkspace(page: Page) {
  await mountAiw(page);
  await page.getByRole('button', { name: /continue locally/i }).click();
  await page.locator('.role-card').filter({ hasText: /^Solution Architect/ }).click();
  const tour = page.getByRole('dialog', { name: /AIW anchored first-run guided tour/i });
  if (await tour.count()) await tour.getByRole('button', { name: /close guided tour/i }).click();
  await expect(page.locator('#aiw-main')).toBeVisible();
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  return errors;
}

test.describe('AIW rc.10.50 journey closure', () => {
  test('accessible model workbench supports add, edit, move, connect and remove without drag gestures', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await enterArchitectWorkspace(page);
    await page.locator('button').filter({ hasText: 'Logical Application' }).first().click();
    await expect(page.getByLabel('Focused architecture workspace').getByRole('heading', { name: /Logical Application Architecture/i })).toBeVisible();

    await page.locator('.stage-studio-actions button').filter({ hasText: 'Outline' }).click();
    const workbench = page.getByTestId('accessible-model-workbench');
    await expect(workbench).toBeVisible();
    await expect(workbench.getByRole('heading', { name: /operate the model without drag and drop/i })).toBeVisible();

    const rowsBefore = await workbench.locator('tbody tr').count();
    await workbench.getByTestId('accessible-record-select').selectOption('COMP-ACTOR');
    await workbench.getByTestId('review-accessible-placement').click();
    const placement = page.getByRole('dialog', { name: /review architecture placement/i });
    await expect(placement).toBeVisible();
    await expect(placement).toContainText(/semantic drop preflight/i);
    await placement.getByRole('button', { name: /apply to architecture|accept trade-offs & apply/i }).click();

    await expect(workbench.locator('tbody tr')).toHaveCount(rowsBefore + 1);
    const editor = workbench.getByTestId('accessible-object-editor');
    await expect(editor).toBeVisible();
    await editor.getByRole('textbox', { name: /selected object label/i }).fill('Accessible Stakeholder');
    await expect(workbench.getByRole('button', { name: 'Accessible Stakeholder', exact: true })).toBeVisible();

    const positionBefore = await editor.locator('small').innerText();
    await editor.getByRole('button', { name: /move accessible stakeholder right/i }).click();
    await expect(editor.locator('small')).not.toHaveText(positionBefore);

    if (await workbench.locator('tbody tr').count() > 1) {
      await workbench.getByTestId('review-accessible-relationship').click();
      const connectionReview = page.getByRole('dialog', { name: /define interaction semantics before connecting/i });
      await expect(connectionReview).toBeVisible();
      await connectionReview.getByRole('button', { name: /apply reviewed connection/i }).click();
      await expect(workbench.locator('.accessible-relationship-list li').first()).toBeVisible();
    }
    await page.screenshot({ path: `release-evidence/rc10.50/screenshots/01-accessible-model-${testInfo.project.name}.png` });

    page.once('dialog', (dialog) => dialog.accept());
    const actorRow = workbench.locator('tbody tr').filter({ hasText: 'Accessible Stakeholder' });
    await actorRow.getByRole('button', { name: /remove accessible stakeholder/i }).click();
    await expect(workbench.getByRole('button', { name: 'Accessible Stakeholder', exact: true })).toHaveCount(0);

    expect(errors.filter((entry) => !/favicon|React DevTools/i.test(entry))).toEqual([]);
  });

  test('review outputs become governed ADR and fitness evidence before approval handoff', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await enterArchitectWorkspace(page);
    await page.getByRole('button', { name: /^Review & Assurance$/i }).click();
    await expect(page.getByRole('heading', { name: /Intelligent Architecture Review & Decision Studio/i })).toBeVisible();

    const recordButton = page.getByTestId('record-review-outputs').first();
    await expect(recordButton).toBeVisible();
    await recordButton.click();
    await expect(page.locator('.notice-toast')).toContainText(/proposed ADR|already recorded/i);

    await page.getByRole('button', { name: /create reviewed snapshot/i }).click();
    await expect(page.locator('.notice-toast')).toContainText(/snapshot/i);

    await page.getByRole('button', { name: /generate handoff artifacts/i }).click();
    await expect(page.locator('.handoff-export-status')).toContainText(/handoff pack ready/i);

    await page.getByTestId('request-review-approval').click();
    await expect(page.locator('.notice-toast')).toContainText(/approval not ready|submitted for approval/i);
    await page.screenshot({ path: `release-evidence/rc10.50/screenshots/02-governed-review-${testInfo.project.name}.png` });

    expect(errors.filter((entry) => !/favicon|React DevTools/i.test(entry))).toEqual([]);
  });

  test('final SDD can be previewed, generated and reopened from the lifecycle', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await enterArchitectWorkspace(page);
    await page.getByRole('button', { name: /^SDD Delivery Pack$/i }).click();
    await expect(page.getByRole('heading', { name: /SDD delivery room/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /generate final SDD/i })).toBeVisible();
    const sddHeading = page.getByRole('heading', { name: /Generated Software\/System Design Description/i });
    await expect(sddHeading).toBeVisible();
    await page.getByRole('button', { name: /hide SDD preview/i }).click();
    await expect(sddHeading).toBeHidden();
    await page.getByLabel('SDD terminal delivery room').getByRole('button', { name: /preview SDD/i }).click();
    await expect(sddHeading).toBeVisible();
    await page.screenshot({ path: `release-evidence/rc10.50/screenshots/03-sdd-delivery-${testInfo.project.name}.png` });
    await page.getByRole('button', { name: /generate final SDD/i }).click();
    await expect(page.getByText(/final SDD|handoff recorded|completed/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Reopen$/i })).toBeVisible();
    await page.getByRole('button', { name: /^Reopen$/i }).click();
    await expect(page.getByRole('button', { name: /generate final SDD/i })).toBeVisible();
    expect(errors.filter((entry) => !/favicon|React DevTools/i.test(entry))).toEqual([]);
  });
});
