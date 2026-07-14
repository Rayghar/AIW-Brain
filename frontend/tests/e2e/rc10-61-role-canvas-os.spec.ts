import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.61/screenshots';
function collectErrors(page: Page) { const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message)); page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); }); return errors; }
function meaningful(errors: string[]) { return errors.filter((entry) => !/favicon|React DevTools|ResizeObserver loop|net::ERR_ABORTED|Failed to load resource.*404/i.test(entry)); }
async function chooseRole(page: Page, role: string) {
  await mountAiw(page);
  await page.getByRole('button', { name: /Continue locally/i }).click();
  await page.locator('.role-card').filter({ hasText: role }).click();
  const tour = page.getByRole('dialog');
  if (await tour.isVisible().catch(() => false)) {
    const close = tour.getByRole('button', { name: /close|skip|not now/i }).first();
    if (await close.isVisible().catch(() => false)) await close.click();
  }
}
async function openSample(page: Page) {
  await mountAiw(page);
  await page.getByRole('button', { name: /open sample architecture/i }).click();
}
async function assertNoOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - window.innerWidth,
    roleBar: (() => { const el = document.querySelector('.role-product-bar'); return el ? el.scrollWidth - el.clientWidth : 0; })(),
  }));
  expect(overflow.document).toBeLessThanOrEqual(1);
  expect(overflow.roleBar).toBeLessThanOrEqual(1);
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });

test.describe('AIW rc.10.61 role-centred experience and Canvas Operating System', () => {
  test('solution architect opens directly into a visible canvas-first composition surface', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openSample(page);
    await expect(page.locator('.role-product-bar')).toContainText('Architecture Studio');
    await page.locator('.role-product-bar__lenses button').filter({ hasText: 'Model' }).click();
    await expect(page.locator('.canvas-os-stagebar')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Compose$/i })).toHaveClass(/is-active/);
    await expect(page.locator('.react-flow')).toBeVisible();
    const metrics = await page.locator('.react-flow').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, height: rect.height, bottom: rect.bottom, viewport: window.innerHeight };
    });
    expect(metrics.top).toBeLessThan(metrics.viewport - 250);
    expect(metrics.height).toBeGreaterThan(testInfo.project.name.includes('laptop') ? 300 : 420);
    await expect(page.locator('.role-journey-compass')).toHaveCount(0);
    await expect(page.locator('.role-tools-tray')).toHaveCount(0);
    await expect(page.locator('.bottom-dock')).toHaveCount(0);
    await assertNoOverflow(page);
    await page.screenshot({ path: `${evidenceDir}/01-architecture-studio-${testInfo.project.name}.png`, fullPage: false });
    expect(meaningful(errors)).toEqual([]);
  });

  test('reference architecture becomes progressively more concrete across lifecycle views', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await openSample(page);
    await page.locator('.role-product-bar__lenses button').filter({ hasText: 'Model' }).click();
    await expect(page.locator('.canvas-os-stagebar')).toBeVisible();
    await expect(page.locator('.stage-studio-viewbook')).toBeVisible();
    await page.locator('.stage-studio-viewbook').click();
    await expect(page.getByTestId('architecture-viewbook')).toBeVisible();
    const counts: Record<string, number> = {};
    for (const [label, key] of [['Logical','logical'],['Realization','realization'],['Technology','technology'],['Deployment','deployment']] as const) {
      const viewButton = page.locator('.architecture-viewbook__strip').getByRole('button', { name: new RegExp(label, 'i') }).first();
      counts[key] = Number(await viewButton.locator('small').textContent());
      await viewButton.click();
    }
    expect(counts.realization).toBeGreaterThanOrEqual(counts.logical);
    expect(counts.technology).toBeGreaterThanOrEqual(6);
    expect(counts.deployment).toBeGreaterThanOrEqual(8);
    await page.screenshot({ path: `${evidenceDir}/02-progressive-viewbook-${testInfo.project.name}.png`, fullPage: false });
    expect(meaningful(errors)).toEqual([]);
  });

  test('enterprise architect receives a portfolio intelligence product rather than a renamed project cockpit', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await chooseRole(page, 'Enterprise Architect');
    await expect(page.locator('.role-product-bar')).toContainText('Portfolio Intelligence Studio');
    await expect(page.getByTestId('role-command-surface')).toContainText('Portfolio Intelligence Studio');
    await expect(page.getByTestId('role-command-surface')).toContainText('Risk concentration');
    await page.screenshot({ path: `${evidenceDir}/03-enterprise-portfolio-${testInfo.project.name}.png`, fullPage: false });
    await assertNoOverflow(page);
    expect(meaningful(errors)).toEqual([]);
  });

  test('platform architect receives intended, observed, drift and controls as one command surface', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await chooseRole(page, 'Platform Architect');
    await expect(page.locator('.role-product-bar')).toContainText('Platform Architecture Command Surface');
    await expect(page.getByTestId('role-command-surface')).toContainText('Observed architecture');
    await expect(page.getByTestId('role-command-surface')).toContainText('Drift and remediation');
    await page.locator('.role-product-bar__lenses button').filter({ hasText: 'Topology' }).click();
    await expect(page.locator('.canvas-os-stagebar')).toBeVisible();
    await expect(page.locator('.react-flow')).toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/04-platform-topology-${testInfo.project.name}.png`, fullPage: false });
    await assertNoOverflow(page);
    expect(meaningful(errors)).toEqual([]);
  });

  test('reviewer lands in a three-pane assurance studio with producer actions removed', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await chooseRole(page, 'Architecture Reviewer');
    await expect(page.locator('.role-product-bar')).toContainText('Architecture Assurance Studio');
    await expect(page.getByTestId('assurance-studio')).toBeVisible();
    await expect(page.getByRole('complementary', { name: /Assigned review queue/i })).toBeVisible();
    await expect(page.getByRole('main', { name: /Model and findings/i })).toBeVisible();
    await expect(page.getByRole('complementary', { name: /Evidence and disposition/i })).toBeVisible();
    await expect(page.getByText(/They cannot generate or silently modify/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Generate SDD|Generate delivery|Create artifact/i })).toHaveCount(0);
    await page.screenshot({ path: `${evidenceDir}/05-reviewer-assurance-${testInfo.project.name}.png`, fullPage: false });
    await assertNoOverflow(page);
    expect(meaningful(errors)).toEqual([]);
  });

  test('knowledge curator receives a dedicated Knowledge Studio command surface', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await chooseRole(page, 'Knowledge Curator');
    await expect(page.locator('.role-product-bar')).toContainText('Knowledge Studio');
    await expect(page.getByTestId('role-command-surface')).toContainText('Knowledge Studio');
    await expect(page.getByTestId('role-command-surface')).toContainText('Provenance Explorer');
    await page.screenshot({ path: `${evidenceDir}/06-knowledge-studio-${testInfo.project.name}.png`, fullPage: false });
    await assertNoOverflow(page);
    expect(meaningful(errors)).toEqual([]);
  });

  test('administrator receives a dedicated AIW Control Plane command surface', async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await chooseRole(page, 'Administrator');
    await expect(page.locator('.role-product-bar')).toContainText('AIW Control Plane');
    await expect(page.getByTestId('role-command-surface')).toContainText('AIW Control Plane');
    await expect(page.getByTestId('role-command-surface')).toContainText('Worker Operations Console');
    await page.screenshot({ path: `${evidenceDir}/07-control-plane-${testInfo.project.name}.png`, fullPage: false });
    await assertNoOverflow(page);
    expect(meaningful(errors)).toEqual([]);
  });
});
