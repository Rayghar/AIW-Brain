import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.72.2/clean-project';
const projectName = `Agency Banking Recovery ${Date.now()}`;

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
function meaningful(errors: string[]) { return errors.filter((entry) => !/favicon|React DevTools|ResizeObserver loop|ERR_ABORTED|LLM_ALL_ROUTES_FAILED/i.test(entry)); }

async function openNav(page: Page) {
  const launcher = page.getByRole('button', { name: /Open role navigation/i });
  if (await launcher.isVisible().catch(() => false)) await launcher.click();
  const rail = page.getByTestId('role-navigation-v2');
  await expect(rail).toBeVisible();
  return rail;
}
async function go(page: Page, title: RegExp) {
  const rail = await openNav(page);
  await rail.getByRole('button', { name: title }).click();
}
async function closeNotices(page: Page) {
  const toast = page.locator('.notice-toast');
  if (await toast.isVisible().catch(() => false)) await toast.waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => undefined);
}
async function acceptOneSolDesignChange(page: Page, stageTitle: RegExp) {
  console.log('STAGE start', String(stageTitle));
  await go(page, stageTitle);
  console.log('STAGE navigated', String(stageTitle));
  const node = page.locator('.react-flow__node:not(.living-canvas-ghost-node)').first();
  if (await node.isVisible().catch(() => false)) await node.click({ force: true });
  await page.getByTestId('open-stage-co-author').click();
  console.log('STAGE Sol opened', String(stageTitle));
  const drawer = page.getByRole('complementary', { name: /Sol for/i });
  await drawer.getByRole('button', { name: /^Design/i }).click();
  await drawer.getByRole('button', { name: /Open Sol Design on canvas/i }).click();
  console.log('STAGE Sol Design opened', String(stageTitle));
  const cursor = page.getByTestId('generative-cursor-controller');
  await expect(cursor).toBeVisible();
  if (await cursor.getByRole('button', { name: /Sol Design/i }).getAttribute('aria-expanded') === 'false') await cursor.getByRole('button', { name: /Sol Design/i }).click();
  let action = cursor.locator('.generative-cursor__action-main').first();
  if (!await action.isVisible().catch(() => false)) {
    const recompute = cursor.getByRole('button', { name: /Recompute/i });
    if (await recompute.isVisible().catch(() => false)) await recompute.click();
    await page.waitForTimeout(800);
    action = cursor.locator('.generative-cursor__action-main').first();
  }
  await expect(action).toBeVisible({ timeout: 20_000 });
  const label = (await action.innerText()).replace(/\s+/g, ' ').trim();
  await action.click();
  const tray = page.getByTestId('generative-preview-tray');
  await expect(tray).toBeVisible();
  const accept = tray.getByRole('button', { name: /Accept change/i });
  await expect(accept).toBeEnabled();
  await accept.click();
  await expect(cursor.getByRole('button', { name: /Sol Design/i })).toHaveAttribute('aria-expanded', 'false');
  await page.waitForTimeout(900);
  console.log('STAGE accepted', String(stageTitle), label);
  console.log('STAGE waiting notices', String(stageTitle));
  await closeNotices(page);
  console.log('STAGE notices done', String(stageTitle));
  return label;
}

async function noOverflow(page: Page) {
  const value = await page.evaluate(() => ({
    document: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    main: Math.max(0, (document.getElementById('aiw-main')?.scrollWidth ?? 0) - (document.getElementById('aiw-main')?.clientWidth ?? 0)),
  }));
  expect(value.document).toBeLessThanOrEqual(1);
  expect(value.main).toBeLessThanOrEqual(1);
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });

test('a clean project moves from idea through the recovered lifecycle and unified Sol experience', async ({ page }, info) => {
  test.setTimeout(7 * 60 * 1000);
  const errors = observe(page);
  page.on('close', () => console.log('PAGE CLOSED'));
  page.on('crash', () => console.log('PAGE CRASHED'));
  await mountAiw(page);
  await page.getByRole('button', { name: /new guided architecture project/i }).click();
  await page.getByLabel(/project name/i).fill(projectName);
  await page.getByLabel(/business goal/i).fill('Design a secure, resilient, auditable and scalable agency banking platform for agent and customer onboarding, cash deposits, withdrawals, transfers, reversals, settlement and reconciliation with governed identity, core-banking and payment-switch integrations.');
  await page.getByRole('button', { name: /create guided project/i }).click();
  await page.locator('.role-card').filter({ hasText: /Solution Architect/i }).first().click();
  const tour = page.getByRole('dialog', { name: /guided tour|first-run/i });
  if (await tour.isVisible().catch(() => false)) await tour.getByRole('button', { name: /Skip tour/i }).click();
  await expect(page.getByTestId('requirements-genesis-studio')).toBeVisible({ timeout: 20_000 });

  const idea = 'Agents must securely onboard customers, verify identity, perform deposits and withdrawals, initiate transfers, receive reliable status, reverse failed transactions, reconcile settlement, operate during dependency degradation, protect personal and financial data, and provide complete audit evidence.';
  await page.getByPlaceholder(/Build an agency banking platform/i).fill(idea);
  await page.getByRole('button', { name: /Add idea as source/i }).click();
  await page.getByRole('button', { name: /Generate requirements & journeys/i }).click();
  await expect(page.getByRole('heading', { name: /Canonical requirements proposal/i })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /Accept selected model/i }).click();
  await expect(page.getByRole('button', { name: /Journey Atlas/i })).toHaveClass(/is-active/);
  await expect(page.locator('.journey-sequence')).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/01-requirements-journeys-${info.project.name}.png`, fullPage: false, animations: 'disabled' });

  await go(page, /^System Context & Journeys$/i);
  await expect(page.getByTestId('system-context-studio')).toBeVisible();
  const acceptContext = page.getByRole('button', { name: /Accept context model/i });
  if (await acceptContext.isEnabled().catch(() => false)) await acceptContext.click();
  await expect(page.getByText(/Canonical context/i)).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/02-system-context-${info.project.name}.png`, fullPage: false, animations: 'disabled' });

  const accepted: Array<{ stage: string; action: string }> = [];
  for (const [title, label] of [
    [/^Logical Application$/i, 'Logical Application'],
    [/^Application Realization$/i, 'Application Realization'],
    [/^Logical Technology$/i, 'Logical Technology'],
    [/^Physical Technology$/i, 'Physical Technology'],
  ] as const) {
    const action = await acceptOneSolDesignChange(page, title);
    accepted.push({ stage: label, action });
    console.log('STAGE overflow check', label);
    await noOverflow(page);
    console.log('STAGE overflow done', label);
    const index = accepted.length + 2;
    await page.screenshot({ path: `${evidenceDir}/${String(index).padStart(2, '0')}-${label.toLowerCase().replace(/\s+/g, '-')}-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
    if (label === 'Logical Application') {
      await page.getByRole('button', { name: /^Output$/i }).click();
      await expect(page.getByTestId('actual-stage-output-logical')).toBeVisible();
      await expect(page.locator('.guided-design-rationale')).toContainText(/Why this design makes sense/i);
      await expect(page.locator('.guided-design-rationale')).toContainText(/Sol · Ask/i);
      await expect(page.locator('.guided-design-rationale').locator('[data-testid^="stage-co-author-"]')).toHaveCount(0);
      await page.screenshot({ path: `${evidenceDir}/03b-logical-output-rationale-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
      await page.getByRole('button', { name: /^Work$/i }).click();
    }
  }

  await go(page, /^Review & Assurance$/i);
  const readinessNotice = page.locator('.notice-toast');
  if (await readinessNotice.isVisible().catch(() => false)) {
    await expect(readinessNotice).not.toContainText(/problem statement|objective/i);
  }
  await expect(page.locator('.review-workbench-v2')).toBeVisible();
  await expect(page.locator('.review-workbench-v2__lenses')).toContainText(/Summary/);
  await page.screenshot({ path: `${evidenceDir}/07-review-${info.project.name}.png`, fullPage: false, animations: 'disabled' });

  await go(page, /^SDD Delivery Pack$/i);
  await expect(page.getByText(/SDD|Delivery Pack/i).first()).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/08-sdd-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
  await noOverflow(page);

  expect(accepted).toHaveLength(4);
  expect(meaningful(errors)).toEqual([]);
});
