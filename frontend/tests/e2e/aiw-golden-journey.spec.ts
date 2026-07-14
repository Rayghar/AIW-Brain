import { test, expect } from '@playwright/test';

test.describe('AIW golden architecture journey', () => {
  test('project entry, role choice, lifecycle focus, quiet brain and SDD path remain usable', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /start a guided architecture design/i })).toBeVisible();
    await page.getByRole('button', { name: /new guided architecture project/i }).click();

    await expect(page.getByText(/create project readiness/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create guided project/i })).toBeDisabled();

    await page.getByLabel(/project name/i).fill('Golden Journey Architecture Project');
    await page.getByLabel(/business goal/i).fill('Reduce settlement risk while improving channel speed');
    await expect(page.getByText(/ready to enter the studio/i)).toBeVisible();
    await page.getByRole('button', { name: /create guided project/i }).click();

    await expect(page.getByRole('dialog', { name: /choose your role/i })).toBeVisible();
    await page.locator('.role-card').filter({ hasText: /^Solution Architect/ }).click();
    await expect(page.locator('#aiw-main')).toBeVisible();

    const tour = page.getByRole('dialog', { name: /AIW anchored first-run guided tour/i });
    if (await tour.isVisible()) await tour.getByRole('button', { name: /close guided tour/i }).click();

    const focus = page.getByRole('button', { name: /focus workspace/i }).first();
    if (await focus.isVisible()) await focus.click();
    await expect(page.locator('#aiw-stage-workspace')).toBeVisible();

    await page.locator('.role-based-nav').getByRole('button', { name: /^Quality Drivers$/i }).click();
    await expect(page.getByText(/quality drivers|quality attribute/i).first()).toBeVisible();

    await page.locator('.role-based-nav').getByRole('button', { name: /^Logical Application$/i }).click();
    await expect(page.locator('#aiw-stage-workspace').getByRole('heading', { name: /^Logical Application Architecture$/i })).toBeVisible();

    const infoButton = page.getByRole('button', { name: /brain details|info center|needs review|guided|stable/i }).first();
    if (await infoButton.isVisible()) {
      await infoButton.click();
      await expect(page.getByLabel(/AIW information center/i)).toBeVisible();
      const close = page.getByLabel(/AIW information center/i).getByRole('button', { name: /close/i }).first();
      if (await close.isVisible()) await close.click();
    }

    // sdd pack terminal path remains part of the canonical golden journey.
    const sdd = page.getByRole('button', { name: /^SDD Delivery Pack$/i });
    await expect(sdd).toBeVisible();
    await sdd.click();
    await expect(page.getByRole('heading', { name: /SDD delivery room/i })).toBeVisible();

    expect(errors.filter((entry) => !/React DevTools|favicon/i.test(entry))).toEqual([]);
  });
});
