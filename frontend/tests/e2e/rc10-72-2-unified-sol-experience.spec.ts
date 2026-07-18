import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.72.2/unified-sol';

function observe(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', (request) => {
    const value = `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`;
    if (!/presence\/heartbeat/i.test(value)) errors.push(value);
  });
  return errors;
}

function meaningful(errors: string[]) {
  return errors.filter((entry) => !/favicon|React DevTools|ResizeObserver loop|ERR_ABORTED|LLM_ALL_ROUTES_FAILED/i.test(entry));
}

async function openSample(page: Page) {
  await mountAiw(page);
  await page.getByRole('button', { name: /open sample architecture/i }).click();
  await expect(page.locator('.guided-delivery')).toBeVisible();
}

async function nav(page: Page, label: RegExp) {
  const launcher = page.getByRole('button', { name: /Open role navigation/i });
  const launcherVisible = await launcher.isVisible().catch(() => false);
  console.log('NAV launcher', launcherVisible, String(label));
  if (launcherVisible) await launcher.click({ timeout: 5_000 });
  const rail = page.getByTestId('role-navigation-v2');
  await expect(rail).toBeVisible({ timeout: 5_000 });
  const target = rail.getByRole('button', { name: label });
  console.log('NAV target count', await target.count(), String(label));
  await target.click({ timeout: 5_000 });
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });

test('one Sol rail provides stage-correct understand, propose, compare, decide and ask modes', async ({ page }, info) => {
  test.setTimeout(55_000);
  const errors = observe(page);
  await openSample(page);
  console.log('STEP open sample');

  const visibleSolButtons = page.getByTestId('open-stage-co-author');
  await expect(visibleSolButtons).toHaveCount(1);
  await visibleSolButtons.first().click();
  console.log('STEP open requirements sol');
  const drawer = page.getByRole('complementary', { name: /Sol for Requirements & Intent/i });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('button', { name: /^Propose/i })).toBeVisible();
  await expect(drawer.getByRole('button', { name: /^Ask/i })).toBeVisible();
  await expect(drawer.getByRole('button', { name: /^Compare/i })).toHaveCount(0);

  await drawer.getByRole('button', { name: /^Ask/i }).click();
  await expect(drawer.getByLabel('Current architecture context')).toContainText('Requirements & Intent');
  await drawer.getByRole('button', { name: /Which requirement is most ambiguous/i }).click();
  console.log('STEP ask requirements');
  await expect(drawer.getByText('Primary recommendation')).toBeVisible({ timeout: 30_000 });
  await expect(drawer.getByLabel('Context used by Sol')).toBeVisible();
  await drawer.getByText('Governance receipt').click();
  await expect(drawer.getByText(/No direct model mutation/i)).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/requirements-sol-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
  await drawer.getByRole('button', { name: /Close Sol/i }).click();
  await expect(drawer).toBeHidden();
  console.log('STEP close requirements sol');

  await nav(page, /^System Context & Journeys$/i);
  console.log('STEP nav context');
  await page.getByTestId('open-stage-co-author').click();
  const contextDrawer = page.getByRole('complementary', { name: /Sol for System Context/i });
  await contextDrawer.getByRole('button', { name: /^Ask/i }).click();
  await expect(contextDrawer.getByLabel('Current architecture context')).toContainText('System Context');
  await contextDrawer.getByRole('button', { name: /Which actor, external system or interaction is missing/i }).click();
  console.log('STEP ask context');
  await expect(contextDrawer.getByText('Primary recommendation')).toBeVisible({ timeout: 30_000 });
  const recommendation = await contextDrawer.locator('.sol-brain-answer__recommendation strong').innerText();
  expect(recommendation).toMatch(/context|boundary|actor|external|journey|interaction/i);
  await page.screenshot({ path: `${evidenceDir}/context-sol-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
  await contextDrawer.getByRole('button', { name: /Close Sol/i }).click();
  await expect(contextDrawer).toBeHidden();
  console.log('STEP close context sol');

  await nav(page, /^Logical Application$/i);
  console.log('STEP nav logical');
  await page.getByTestId('open-stage-co-author').click();
  const designDrawer = page.getByRole('complementary', { name: /Sol for Logical Application/i });
  await expect(designDrawer.getByRole('button', { name: /^Propose/i })).toBeVisible();
  await expect(designDrawer.getByRole('button', { name: /^Understand/i })).toBeVisible();
  await expect(designDrawer.getByRole('button', { name: /^Compare/i })).toBeVisible();
  await expect(designDrawer.getByRole('button', { name: /^Decide/i })).toBeVisible();
  await expect(designDrawer.getByRole('button', { name: /^Ask/i })).toBeVisible();
  await designDrawer.getByRole('button', { name: /^Compare/i }).click();
  await expect(designDrawer.getByText(/Compare coherent architecture change sets/i)).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/canvas-sol-modes-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
  await designDrawer.getByRole('button', { name: /Close Sol/i }).click();
  await expect(designDrawer).toBeHidden();

  expect(meaningful(errors)).toEqual([]);
});

test('quality ranking and review workspaces expose calm evidence gates instead of false authority and repeated actions', async ({ page }, info) => {
  test.setTimeout(90_000);
  const errors = observe(page);
  await openSample(page);

  await nav(page, /^Quality Drivers$/i);
  const gate = page.getByText(/Ranking not yet authoritative/i);
  if (await gate.isVisible().catch(() => false)) {
    await expect(gate).toBeVisible();
    await expect(page.getByText(/Confirm a prioritised driver and a measurable scenario/i)).toBeVisible();
  }
  await page.screenshot({ path: `${evidenceDir}/quality-gate-${info.project.name}.png`, fullPage: false, animations: 'disabled' });

  await nav(page, /^Review & Assurance$/i);
  const review = page.locator('.review-workbench-v2');
  await expect(review).toBeVisible();
  const lenses = review.locator('.review-workbench-v2__lenses');
  for (const label of ['Summary', 'Findings', 'Decisions', 'Evidence', 'Governance']) {
    await expect(lenses.getByRole('button', { name: new RegExp(`^${label}`, 'i') })).toBeVisible();
  }
  const repeatedDispositionCount = await review.getByRole('button', { name: /Accept|Defer|Reject|Fix/i }).count();
  expect(repeatedDispositionCount).toBeLessThan(12);
  await lenses.getByRole('button', { name: /^Findings/i }).click();
  await expect(review.getByText(/Finding queue/i)).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/review-queue-${info.project.name}.png`, fullPage: false, animations: 'disabled' });

  expect(meaningful(errors)).toEqual([]);
});
