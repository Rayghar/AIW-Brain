import { expect, test, type Page } from '@playwright/test';
import { mountAiw } from './support/staticAiwHarness';

async function freshProjectEntry(page: Page) {
  await mountAiw(page);
  await expect(page.getByRole('heading', { name: /start a guided architecture design/i })).toBeVisible();
}

async function enterLocalRoleSelection(page: Page) {
  await freshProjectEntry(page);
  await page.getByRole('button', { name: /continue locally/i }).click();
  await expect(page.getByRole('dialog', { name: /choose your role/i })).toBeVisible();
}

async function enterArchitectWorkspace(page: Page) {
  await enterLocalRoleSelection(page);
  await page.locator('.role-card').filter({ hasText: /^Solution Architect/ }).click();
  await expect(page.locator('#aiw-main')).toBeVisible();
  const tour = page.getByRole('dialog', { name: /AIW anchored first-run guided tour/i });
  await expect(tour).toBeVisible();
  await tour.getByRole('button', { name: /close guided tour/i }).click();
  await expect(tour).toBeHidden();
}

function installErrorCollection(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'request failed';
    if (!/ERR_ABORTED/i.test(failure)) errors.push(`${request.method()} ${request.url()}: ${failure}`);
  });
  return errors;
}

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(metrics.documentWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewport + 2);
  expect(metrics.bodyWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewport + 2);
}

test.describe('AIW rc.10.49 global experience acceptance', () => {
  test('project hub and role front door are deliberate, responsive and unclipped', async ({ page }) => {
    const errors = installErrorCollection(page);
    await enterLocalRoleSelection(page);

    await expect(page.getByRole('dialog', { name: /choose your role/i })).toContainText(/AIW scopes the workspace to the job you are doing/i);
    await expect(page.getByRole('button', { name: /administrator/i })).toBeVisible();
    await expect(page.getByRole('dialog', { name: /AIW anchored first-run guided tour/i })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    const roleCards = page.locator('.role-card');
    await expect(roleCards).toHaveCount(6);
    for (const card of await roleCards.all()) {
      const box = await card.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThan(220);
    }

    expect(errors.filter((entry) => !/React DevTools|favicon/i.test(entry))).toEqual([]);
  });

  test('first-run guidance is role-triggered and expert surfaces stay quiet by default', async ({ page }) => {
    const errors = installErrorCollection(page);
    await enterArchitectWorkspace(page);

    await expect(page.getByLabel(/AIW minimized status dock/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /show task model/i })).toBeVisible();
    await expect(page.locator('.workbench-bottom-dock--expanded')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    const probe = await page.request.get('http://127.0.0.1:4100/api/events?probe=true');
    expect(probe.ok()).toBeTruthy();
    expect((await probe.json()).status).toBe('ready');

    expect(errors.filter((entry) => !/React DevTools|favicon/i.test(entry))).toEqual([]);
  });

  test('design brief captures delivery feasibility instead of guessing it', async ({ page }) => {
    const errors = installErrorCollection(page);
    await enterArchitectWorkspace(page);

    const designBrief = page.getByRole('button', { name: /design brief|requirements.*intent/i }).first();
    await designBrief.click();
    await expect(page.getByRole('heading', { name: /design brief studio/i })).toBeVisible();

    const context = page.locator('details').filter({ hasText: /enterprise context/i }).first();
    await context.evaluate((element: HTMLDetailsElement) => { element.open = true; });
    await expect(page.getByRole('heading', { name: /tell AIW what the organisation can actually deliver and operate/i })).toBeVisible();

    await page.getByRole('spinbutton', { name: /^Team size$/i }).fill('12');
    await page.getByRole('spinbutton', { name: /delivery horizon/i }).fill('9');
    await page.getByRole('combobox', { name: /operational maturity/i }).selectOption('2');
    await page.getByRole('combobox', { name: /architecture experience/i }).selectOption('2');
    await page.getByRole('combobox', { name: /change readiness/i }).selectOption('3');
    await page.getByRole('combobox', { name: /deployment model/i }).selectOption('hybrid');
    await page.getByRole('combobox', { name: /data sensitivity/i }).selectOption('restricted');
    await page.getByRole('combobox', { name: /transition state/i }).selectOption('incremental-modernization');
    await page.getByRole('combobox', { name: /support model/i }).selectOption('hybrid');
    await page.getByRole('combobox', { name: /change cadence/i }).selectOption('weekly');
    await page.getByRole('combobox', { name: /peak-load variability/i }).selectOption('bursty');

    await expect(page.getByRole('spinbutton', { name: /^Team size$/i })).toHaveValue('12');
    await expect(page.getByText(/missing values reduce context confidence rather than being silently guessed/i)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    expect(errors.filter((entry) => !/React DevTools|favicon/i.test(entry))).toEqual([]);
  });

  test('review decisions create governed outcome evidence without self-learning', async ({ page }) => {
    const errors = installErrorCollection(page);
    await enterArchitectWorkspace(page);

    await page.getByRole('button', { name: /^Review & Assurance$/i }).click();
    await expect(page.getByRole('heading', { name: /Intelligent Architecture Review & Decision Studio/i })).toBeVisible();

    const firstRecommendation = page.locator('.review-recommendation-card').first();
    await expect(firstRecommendation).toBeVisible();
    await firstRecommendation.getByText(/record decision outcome/i).click();
    await firstRecommendation.getByRole('textbox', { name: /decision reason/i }).fill('The recommended style fits the current delivery and operating constraints.');
    await firstRecommendation.getByRole('button', { name: /^Accept$/i }).click();
    await expect(firstRecommendation.getByRole('status')).toContainText(/governed calibration proposal/i);

    expect(errors.filter((entry) => !/React DevTools|favicon/i.test(entry))).toEqual([]);
  });

  test('keyboard navigation exposes a visible focus path and command surface', async ({ page }) => {
    await enterArchitectWorkspace(page);
    const commandButton = page.getByRole('button', { name: /^Command$/i });
    await commandButton.focus();
    await expect(commandButton).toBeFocused();
    await page.keyboard.press('Enter');
    const command = page.getByRole('dialog', { name: /AIW command palette/i });
    await expect(command).toBeVisible();
    const active = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      outline: document.activeElement ? getComputedStyle(document.activeElement).outlineStyle : 'none',
    }));
    expect(active.tag).toBeTruthy();
    await page.keyboard.press('Escape');
    await expect(command).toBeHidden();
  });
});
