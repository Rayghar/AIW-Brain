import { test, expect } from '@playwright/test';

test.describe('AIW golden architecture journey', () => {
  test('create project, enter lifecycle, use canvas, and reach SDD pack', async ({ page }) => {
    await page.goto('/');

    // Project entry
    await expect(page.getByText(/project/i).first()).toBeVisible();

    // Create or start a guided project.
    // Adjust selectors to AIW's concrete data-testid values when applied.
    const createProject = page.getByRole('button', { name: /create|new|start/i }).first();
    if (await createProject.isVisible()) {
      await createProject.click();
    }

    const nameField = page.getByLabel(/project name/i).first();
    if (await nameField.isVisible()) {
      await nameField.fill('Golden Journey Architecture Project');
      const submit = page.getByRole('button', { name: /create|continue|start/i }).first();
      await submit.click();
    }

    // Solution architect journey / cockpit
    await expect(page.getByText(/solution architect|architecture lifecycle|cockpit/i).first()).toBeVisible();

    // Requirements stage
    await page.getByText(/requirements|intent/i).first().click();
    await expect(page.getByText(/requirements|intent/i).first()).toBeVisible();

    // Quality drivers stage
    await page.getByText(/quality drivers/i).first().click();
    await expect(page.getByText(/quality/i).first()).toBeVisible();

    // Logical application stage
    await page.getByText(/logical application/i).first().click();
    await expect(page.getByText(/canvas|architecture kit|library/i).first()).toBeVisible();

    // Open library/kit if hidden
    const libraryButton = page.getByRole('button', { name: /library|kit/i }).first();
    if (await libraryButton.isVisible()) {
      await libraryButton.click();
    }

    // Verify quiet intelligence surfaces are present but not noisy.
    await expect(page.getByText(/info center|decision radar|co-architect|brain/i).first()).toBeVisible();

    // SDD Pack stage
    await page.getByText(/sdd pack|generate sdd/i).first().click();
    await expect(page.getByText(/sdd|delivery pack/i).first()).toBeVisible();
  });
});
