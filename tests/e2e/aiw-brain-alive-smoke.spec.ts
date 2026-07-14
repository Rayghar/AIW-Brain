import { test, expect } from '@playwright/test';

test.describe('AIW Brain Alive quiet intelligence smoke', () => {
  test('driver weights and style choices produce quiet intelligence, not noisy panels', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /start|create|new project/i }).first().click();
    await page.getByRole('textbox').first().fill('Brain Alive Smoke Project');
    await page.getByRole('button', { name: /create|continue|start/i }).first().click();

    await page.getByText(/Quality Drivers/i).first().click();
    await expect(page.getByText(/Quality Drivers/i).first()).toBeVisible();

    // Exact controls depend on current AIW UI. Keep this test as a wiring scaffold.
    // It should be tightened after integration into the live rc.10.47.3 source.
    await page.getByText(/Logical Application/i).first().click();
    await expect(page.getByText(/Logical Application/i).first()).toBeVisible();

    // Quiet intelligence should be represented as chips/badges or Info Center, not many always-visible cards.
    const noisyCards = await page.locator('text=/Embedded Intelligence|Inspector Cards|Sprint/i').count();
    expect(noisyCards).toBeLessThan(2);
  });
});
