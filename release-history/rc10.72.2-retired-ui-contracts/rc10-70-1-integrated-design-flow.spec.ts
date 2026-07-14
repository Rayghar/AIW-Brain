import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.70.1/screenshots';

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

async function assertStableRail(page: Page) {
  const rail = page.getByTestId('role-navigation-v2');
  const main = page.locator('#aiw-main');
  const beforeRail = await rail.boundingBox();
  const beforeMain = await main.boundingBox();
  expect(beforeRail).not.toBeNull();
  expect(beforeMain).not.toBeNull();
  await rail.hover();
  await page.waitForTimeout(250);
  const afterRail = await rail.boundingBox();
  const afterMain = await main.boundingBox();
  expect(afterRail?.width).toBeCloseTo(beforeRail!.width, 0);
  expect(afterMain?.x).toBeCloseTo(beforeMain!.x, 0);
  expect(afterMain?.width).toBeCloseTo(beforeMain!.width, 0);
}

async function openOutput(page: Page) {
  await page.getByRole('button', { name: /^Outputs$/i }).click();
  await expect(page.getByTestId('actual-stage-output-requirements')).toBeVisible();
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });

test('video-observed design flow gaps are structurally remediated', async ({ page }, info) => {
  test.setTimeout(60_000);
  const errors = observe(page);
  await openReference(page);

  await page.waitForTimeout(250);
  const rail = page.getByTestId('role-navigation-v2');
  const railToggle = page.getByTestId('role-rail-toggle');
  if (info.project.name.includes('laptop')) {
    const launcher = page.getByRole('button', { name: /Open role navigation/i });
    await expect(launcher).toBeVisible();
    const beforeMain = await page.locator('#aiw-main').boundingBox();
    await launcher.hover();
    await page.waitForTimeout(180);
    const afterMain = await page.locator('#aiw-main').boundingBox();
    expect(afterMain?.x).toBeCloseTo(beforeMain!.x, 0);
    expect(afterMain?.width).toBeCloseTo(beforeMain!.width, 0);
    await launcher.click();
    await expect(rail).toHaveClass(/is-pinned/);
    await assertStableRail(page);
    await noOverflow(page);
    await page.screenshot({ path: `${evidenceDir}/navigation-overlay-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
    await page.getByRole('button', { name: /Close role navigation/i }).click();
    await expect(rail).toHaveClass(/is-collapsed/);
  } else {
    await assertStableRail(page);
    if (await rail.evaluate((element) => element.classList.contains('is-pinned'))) await railToggle.click();
    await expect(rail).toHaveClass(/is-collapsed/);
    await assertStableRail(page);
    await noOverflow(page);
    await page.screenshot({ path: `${evidenceDir}/navigation-collapsed-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
    await railToggle.click();
    await expect(rail).toHaveClass(/is-pinned/);
    await assertStableRail(page);
    await noOverflow(page);
    await page.screenshot({ path: `${evidenceDir}/navigation-pinned-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
  }

  await openOutput(page);
  const actualOutput = page.getByTestId('actual-stage-output-requirements');
  await expect(actualOutput).toContainText(/Problem statement/i);
  await expect(actualOutput).toContainText(/Business objectives/i);
  await expect(actualOutput).toContainText(/Stakeholders/i);
  await expect(actualOutput).toContainText(/Constraints/i);
  await expect(page.locator('.guided-design-rationale')).toContainText(/Why this design makes sense/i);

  const rationale = page.getByTestId('stage-co-author-requirements');
  await expect(rationale).toBeVisible();
  await rationale.locator('summary').click();
  await expect(rationale).toContainText(/How this stage enables the business outcome/i);
  await expect(rationale).toContainText(/Trade-offs accepted/i);
  await noOverflow(page);
  await page.screenshot({ path: `${evidenceDir}/actual-output-rationale-${info.project.name}.png`, fullPage: false, animations: 'disabled' });

  await page.getByRole('button', { name: /^Work area$/i }).click();
  await page.getByTestId('open-stage-co-author').last().click();
  const drawer = page.locator('.stage-co-author-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText(/Auto-populate missing fields/i);
  await expect(drawer.getByRole('button', { name: /Auto-populate missing fields with Sol/i })).toBeVisible();
  await expect(drawer).toContainText(/Structured field proposals/i);
  await page.screenshot({ path: `${evidenceDir}/stage-co-author-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
  await drawer.getByRole('button', { name: /Close stage co-author/i }).click();
  await expect(drawer).toBeHidden();

  const brainLauncher = page.getByRole('button', { name: /Open Sol Architecture Brain/i });
  await brainLauncher.click();
  const brain = page.locator('.sol-brain-shell');
  await expect(brain).toBeVisible();
  const brainBox = await brain.boundingBox();
  expect(brainBox).not.toBeNull();
  expect(brainBox!.width).toBeGreaterThanOrEqual(info.project.name.includes('laptop') ? 420 : 480);
  await expect(brain).toContainText(/Current guidance/i);
  await expect(brain).toContainText(/Guidance/i);
  await expect(brain).toContainText(/History/i);
  await noOverflow(page);
  await page.screenshot({ path: `${evidenceDir}/architecture-brain-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
  await page.getByRole('button', { name: /Close Architecture Brain/i }).click();

  if (info.project.name.includes('laptop')) await page.getByRole('button', { name: /Open role navigation/i }).click();
  await page.getByTestId('role-navigation-v2').getByRole('button', { name: /^Quality Drivers$/i }).click();
  await page.getByRole('button', { name: /^Outputs$/i }).click();
  await expect(page.getByTestId('actual-stage-output-quality')).toContainText(/Prioritised quality drivers/i);
  await expect(page.getByTestId('actual-stage-output-quality')).toContainText(/Measurable quality scenarios/i);

  await page.locator('.notice-toast').waitFor({ state: 'hidden', timeout: 7_000 }).catch(() => undefined);
  await page.screenshot({ path: `${evidenceDir}/integrated-flow-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
  expect(meaningful(errors)).toEqual([]);
});
