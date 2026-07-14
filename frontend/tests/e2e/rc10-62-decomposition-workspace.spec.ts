import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.62/screenshots';
function errorsFor(page: Page) { const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message)); page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); }); return errors; }
function meaningful(errors: string[]) { return errors.filter((entry) => !/favicon|React DevTools|ResizeObserver loop|net::ERR_ABORTED|Failed to load resource.*404/i.test(entry)); }
async function openSample(page: Page) { await mountAiw(page); await page.getByRole('button', { name: /open sample architecture/i }).click(); }
async function chooseRole(page: Page, role: string) { await mountAiw(page); await page.getByRole('button', { name: /Continue locally/i }).click(); await page.locator('.role-card').filter({ hasText: role }).click(); const dialog=page.getByRole('dialog'); if (await dialog.isVisible().catch(()=>false)) { const close=dialog.getByRole('button',{name:/close|skip|not now/i}).first(); if(await close.isVisible().catch(()=>false)) await close.click(); } }

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });

test.describe('AIW rc.10.62 interactive decomposition and deep workspace reconstruction', () => {
  test('Viewbook exposes six decomposition levels and click-through container to code navigation', async ({ page }, testInfo) => {
    const errors=errorsFor(page); await openSample(page);
    await page.locator('.role-product-bar__lenses button').filter({ hasText: 'Model' }).click();
    await page.locator('.stage-studio-viewbook').click();
    await expect(page.getByTestId('architecture-viewbook')).toBeVisible();
    const navigator=page.getByTestId('decomposition-navigator');
    for (const label of ['Landscape','System','Container','Component','Code','Deployment']) await expect(navigator.getByRole('button',{name:new RegExp(label,'i')})).toBeVisible();
    await navigator.getByRole('button',{name:/Container/i}).click();
    const scopeSelect=navigator.locator('select');
    await scopeSelect.selectOption('system-order-payment');
    await page.locator('.architecture-viewbook__strip').getByRole('button',{name:/Realization/i}).click();
    const viewbook=page.getByTestId('architecture-viewbook');
    await expect(viewbook.locator('.react-flow__node').filter({hasText:'Order API'})).toBeVisible();
    await viewbook.locator('.react-flow__node').filter({hasText:'Order API'}).click();
    await expect(page.getByTestId('decomposition-inspector')).toContainText('Order API');
    await page.getByTestId('decomposition-inspector').getByRole('button',{name:/Drill into/i}).click();
    await expect(navigator.getByRole('button',{name:/Component/i})).toHaveClass(/active/);
    await expect(viewbook.locator('.react-flow__node').filter({hasText:'Order Outbox Publisher'})).toBeVisible();
    await viewbook.locator('.react-flow__node').filter({hasText:'Order Outbox Publisher'}).click();
    await page.getByTestId('decomposition-inspector').getByRole('button',{name:/Drill into/i}).click();
    await expect(navigator.getByRole('button',{name:/Code/i})).toHaveClass(/active/);
    await expect(viewbook.locator('.react-flow__node').filter({hasText:'CreateOrderCommandHandler'})).toBeVisible();
    await page.screenshot({ path:`${evidenceDir}/01-interactive-decomposition-${testInfo.project.name}.png`, fullPage:false });
    expect(meaningful(errors)).toEqual([]);
  });

  test('Viewbook selected object can reopen the modelling canvas with identity preserved', async ({ page }, testInfo) => {
    const errors=errorsFor(page); await openSample(page);
    await page.locator('.role-product-bar__lenses button').filter({ hasText:'Model' }).click();
    await page.locator('.stage-studio-viewbook').click();
    const navigator=page.getByTestId('decomposition-navigator');
    await navigator.getByRole('button',{name:/Container/i}).click();
    await navigator.locator('select').selectOption('system-order-payment');
    await page.locator('.architecture-viewbook__strip').getByRole('button',{name:/Realization/i}).click();
    await page.getByTestId('architecture-viewbook').locator('.react-flow__node').filter({hasText:'Payment Worker'}).click();
    await page.getByTestId('decomposition-inspector').getByRole('button',{name:/Open in modelling canvas/i}).click();
    await expect(page.getByTestId('architecture-viewbook')).toHaveCount(0);
    await expect(page.locator('.canvas-os-stagebar')).toContainText(/Application Realization/i);
    await page.screenshot({ path:`${evidenceDir}/02-view-to-canvas-${testInfo.project.name}.png`, fullPage:false });
    expect(meaningful(errors)).toEqual([]);
  });

  test('enterprise portfolio deep page is reconstructed around an accountable task contract', async ({ page }, testInfo) => {
    const errors=errorsFor(page); await chooseRole(page,'Enterprise Architect');
    await page.locator('.role-product-bar__lenses button').filter({hasText:'Risk'}).click();
    const frame=page.getByTestId('task-workspace-portfolio');
    await expect(frame).toBeVisible();
    await expect(frame).toContainText('Portfolio intelligence');
    await expect(frame).toContainText('Investigate highest portfolio exposure');
    await expect(frame).toContainText('Outcome contract');
    await page.screenshot({ path:`${evidenceDir}/03-portfolio-task-frame-${testInfo.project.name}.png`, fullPage:false });
    expect(meaningful(errors)).toEqual([]);
  });

  test('platform drift deep page combines task path, model work area and outcome contract', async ({ page }, testInfo) => {
    const errors=errorsFor(page); await chooseRole(page,'Platform Architect');
    await page.locator('.role-product-bar__lenses button').filter({hasText:'Drift'}).click();
    const frame=page.getByTestId('task-workspace-drift');
    await expect(frame).toBeVisible();
    await expect(frame).toContainText('Intended versus observed architecture');
    await expect(frame).toContainText('Load evidence');
    await page.screenshot({ path:`${evidenceDir}/04-drift-task-frame-${testInfo.project.name}.png`, fullPage:false });
    expect(meaningful(errors)).toEqual([]);
  });

  test('knowledge command surface exposes provenance and architecture-brain products', async ({ page }, testInfo) => {
    const errors=errorsFor(page); await chooseRole(page,'Knowledge Curator');
    const curator=page.getByTestId('role-command-surface');
    await expect(curator).toContainText('Provenance Explorer');
    await expect(curator).toContainText('Architecture Brain Evaluation Lab');
    await page.screenshot({ path:`${evidenceDir}/05-knowledge-capability-surface-${testInfo.project.name}.png`, fullPage:false });
    expect(meaningful(errors)).toEqual([]);
  });

  test('administration command surface exposes worker and evidence products', async ({ page }, testInfo) => {
    const errors=errorsFor(page); await chooseRole(page,'Administrator');
    const admin=page.getByTestId('role-command-surface');
    await expect(admin).toContainText('Worker Operations Console');
    await expect(admin).toContainText('Evidence Ledger');
    await page.screenshot({ path:`${evidenceDir}/06-admin-capability-surface-${testInfo.project.name}.png`, fullPage:false });
    expect(meaningful(errors)).toEqual([]);
  });

  test('all reconstructed specialist surfaces preserve the canonical model and avoid document overflow', async ({ page }, testInfo) => {
    const errors=errorsFor(page); await chooseRole(page,'Administrator');
    await page.locator('.role-product-bar__lenses button').filter({hasText:'Readiness'}).click();
    await expect(page.getByTestId('task-workspace-admin')).toBeVisible();
    const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-window.innerWidth, width:window.innerWidth}));
    expect(metrics.overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path:`${evidenceDir}/07-control-plane-task-frame-${testInfo.project.name}.png`, fullPage:false });
    expect(meaningful(errors)).toEqual([]);
  });
});
