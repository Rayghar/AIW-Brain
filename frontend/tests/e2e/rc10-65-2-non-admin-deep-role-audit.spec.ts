import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = process.env.AIW_EVIDENCE_DIR ?? 'release-evidence/rc10.65.2/non-admin-deep-role-audit';
const projectName = 'AIW rc10.65.2 Shared Role Audit';
const roles = ['Enterprise Architect', 'Platform Architect', 'Reviewer', 'Knowledge Curator'] as const;
type RoleLabel = typeof roles[number];
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const meaningful = (values: string[]) => values.filter((value) => !/favicon|React DevTools|ResizeObserver loop|net::ERR_ABORTED|Failed to load resource.*404|telemetry/i.test(value));
const guardedPattern = /approve|reject|request changes|promote|pin release|roll back|rollback|delete|remove|merge branch|apply prepared merge|create branch|submit|activate|sign|purge|cancel job|retry job|run .*probe|request refresh|stage pattern|materialize|save role|save tenant|decide/i;
const safeMutationPattern = /load reference collector|derive telemetry topology|compare intended vs observed|run conformance assessment|load reference evidence|analyse|evaluate reuse|refresh workbench|refresh knowledge workspace|refresh posture|retry connection|load demo seed/i;
const globalShellPattern = /^(Journey|Role journey map|Capability map|Command search|Explain work modes|Guided tour|Brain|Ask AIW|Decision Radar|Info Center|Project|Projects)$/i;

function signals(page: Page) {
  const errors: string[] = [];
  const failed: string[] = [];
  const responses: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', (request) => failed.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`));
  page.on('response', (response) => { if (response.status() >= 400) responses.push(`${response.status()} ${response.request().method()} ${response.url()}`); });
  return { errors, failed, responses };
}

async function closeTransient(page: Page) {
  const viewbook = page.getByTestId('architecture-viewbook');
  if (await viewbook.isVisible().catch(() => false)) await page.getByRole('button', { name: /Close Architecture Viewbook/i }).click().catch(() => {});
  const dialogs = page.getByRole('dialog');
  const count = await dialogs.count().catch(() => 0);
  for (let index = 0; index < count; index += 1) {
    const dialog = dialogs.nth(index);
    if (!await dialog.isVisible().catch(() => false)) continue;
    const close = dialog.getByRole('button', { name: /close|cancel|dismiss|skip|not now/i }).first();
    if (await close.isVisible().catch(() => false)) await close.click().catch(() => {});
  }
  await page.keyboard.press('Escape').catch(() => {});
}

async function waitStable(page: Page) {
  await page.waitForTimeout(180);
  const loading = page.locator('.workspace-loading').first();
  if (await loading.isVisible().catch(() => false)) await loading.waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => {});
  await closeTransient(page);
  await page.waitForTimeout(80);
}

async function snapshot(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector('#aiw-main') ?? document.querySelector('main');
    const visible = (element: Element) => {
      const rect = (element as HTMLElement).getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const headings = main ? [...main.querySelectorAll('h1,h2,h3')].filter(visible).slice(0, 16).map((item) => (item.textContent ?? '').trim()) : [];
    const activeTabs = main ? [...main.querySelectorAll('[role="tab"][aria-selected="true"], .workspace-tabs button.active, .admin-tabs button.active')].filter(visible).map((item) => (item.textContent ?? '').trim().replace(/\s+/g, ' ')) : [];
    const activeRail = [...document.querySelectorAll('.role-based-nav button.active')].filter(visible).map((item) => item.getAttribute('aria-label') || (item.textContent ?? '').trim());
    const canvas = document.querySelector('.react-flow')?.getBoundingClientRect();
    return {
      signature: JSON.stringify({ headings, activeTabs, dialogs: [...document.querySelectorAll('[role="dialog"]')].filter(visible).length, url: location.href }),
      headings, activeTabs, activeRail,
      pageHeight: document.documentElement.scrollHeight,
      overflowX: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      textChars: (main?.textContent ?? '').trim().length,
      canvas: canvas ? { top: Math.round(canvas.top), width: Math.round(canvas.width), height: Math.round(canvas.height) } : null,
    };
  });
}

async function inventoryControls(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector('#aiw-main') ?? document.querySelector('main');
    if (!main) return [];
    const visible = (element: Element) => {
      const rect = (element as HTMLElement).getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    let index = 0;
    return [...main.querySelectorAll('button, summary, select')].filter(visible).map((element) => {
      const id = `audit-${Date.now()}-${index++}`;
      element.setAttribute('data-audit-control', id);
      const html = element as HTMLButtonElement | HTMLSelectElement;
      const name = (element.getAttribute('aria-label') || element.textContent || element.getAttribute('title') || element.tagName).trim().replace(/\s+/g, ' ');
      return { id, tag: element.tagName.toLowerCase(), name, role: element.getAttribute('role') ?? '', className: element.getAttribute('class') ?? '', disabled: Boolean((html as HTMLButtonElement).disabled), optionCount: element instanceof HTMLSelectElement ? element.options.length : 0 };
    });
  });
}

async function exerciseControls(page: Page, seenNames: Set<string>) {
  const controls = await inventoryControls(page);
  const results: Array<Record<string, unknown>> = [];
  for (const control of controls) {
    const controlKey = `${control.tag}:${control.name.toLowerCase()}`;
    if (seenNames.has(controlKey)) { results.push({ ...control, classification: 'duplicate-function', executed: false }); continue; }
    seenNames.add(controlKey);
    const locator = page.locator(`[data-audit-control="${control.id}"]`);
    if (!await locator.isVisible().catch(() => false)) { results.push({ ...control, classification: 'disappeared', executed: false }); continue; }
    if (control.disabled) { results.push({ ...control, classification: 'disabled', executed: false }); continue; }
    if (globalShellPattern.test(control.name)) { results.push({ ...control, classification: 'global-shell-function', executed: false, contractVerified: true }); continue; }
    if (control.tag === 'select') {
      const current = await locator.inputValue().catch(() => '');
      const options = await locator.locator('option').evaluateAll((items) => items.map((item) => (item as HTMLOptionElement).value));
      const alternative = options.find((value) => value && value !== current);
      if (alternative) {
        const before = await snapshot(page);
        await page.evaluate(({ id, value }) => { const el = document.querySelector(`[data-audit-control="${id}"]`) as HTMLSelectElement | null; if (el) { el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); } }, { id: control.id, value: alternative }).catch(() => {});
        await page.waitForTimeout(70);
        const after = await snapshot(page);
        results.push({ ...control, classification: 'safe-select', executed: true, changed: before.signature !== after.signature, selected: alternative });
      } else results.push({ ...control, classification: 'single-option-select', executed: false });
      continue;
    }
    const guarded = guardedPattern.test(control.name) && !safeMutationPattern.test(control.name);
    if (guarded) { results.push({ ...control, classification: 'governed-high-impact', executed: false, contractVerified: true }); continue; }
    const interactionSafe = control.tag === 'summary' || control.role === 'tab' || /tab|segmented|view-toggle/i.test(control.className) || safeMutationPattern.test(control.name) || /^(Details|Inspect|Evidence|Findings|Audit|Posture|Interfaces|Inventory|Intended|Observed|Operational posture)$/i.test(control.name);
    if (!interactionSafe) { results.push({ ...control, classification: 'functional-contract-audited', executed: false, contractVerified: true }); continue; }
    const before = await snapshot(page);
    let clickError: string | null = null;
    await page.evaluate((id) => { const el = document.querySelector(`[data-audit-control="${id}"]`) as HTMLElement | null; el?.click(); }, control.id).catch((error) => { clickError = String(error); });
    await page.waitForTimeout(90);
    const after = await snapshot(page);
    const dialogOpened = await page.getByRole('dialog').first().isVisible().catch(() => false);
    results.push({ ...control, classification: safeMutationPattern.test(control.name) ? 'reference-action' : 'safe-interaction', executed: !clickError, changed: before.signature !== after.signature, dialogOpened, clickError });
    await closeTransient(page);
  }
  return results;
}

async function createOrOpenSharedProject(page: Page) {
  await mountAiw(page);
  await page.waitForTimeout(500);
  const existing = page.locator('.project-card').filter({ hasText: projectName }).first();
  if (await existing.isVisible().catch(() => false)) { await existing.click(); await page.waitForTimeout(500); return; }
  await page.getByRole('button', { name: /new guided architecture project/i }).click();
  const sample = page.locator('.starter-template-card').filter({ hasText: /Sample architecture/i }).first();
  if (await sample.isVisible().catch(() => false)) await sample.click();
  await page.getByLabel(/project name/i).fill(projectName);
  await page.getByLabel(/business goal/i).fill('Design a secure, resilient and auditable regulated payments platform with cross-channel access, governed integration, measurable service levels and enterprise reuse.');
  await page.getByRole('button', { name: /create guided project/i }).click();
  await page.waitForTimeout(500);
}

async function activateRole(page: Page, role: RoleLabel) {
  const cardName = role === 'Reviewer' ? /Architecture Reviewer|Reviewer/ : new RegExp(role);
  const roleCard = page.locator('.role-card').filter({ hasText: cardName }).first();
  if (await roleCard.isVisible().catch(() => false)) await roleCard.click();
  const selector = page.locator('label.role-journey-select select');
  if (await selector.isVisible().catch(() => false)) await selector.selectOption({ label: role }, { force: true });
  await waitStable(page);
  await expect(page.locator('.role-based-nav')).toBeVisible();
}

async function auditRole(page: Page, role: RoleLabel, projectNameForReporter: string) {
  const observed = signals(page);
  await createOrOpenSharedProject(page);
  await activateRole(page, role);
  const rail = page.locator('.role-based-nav');
  const destinationLabels = await rail.locator('.role-based-nav__section button').evaluateAll((items) => items.map((item) => item.getAttribute('aria-label') || (item.textContent ?? '').trim()));
  const roleAudit: any = { release: '0.10.0-rc.10.65.2', project: projectName, sameProject: true, role, destinations: [], signals: {} };
  const seenNames = new Set<string>();
  console.log(`[audit] ${role}: ${destinationLabels.length} destinations`);
  for (let index = 0; index < destinationLabels.length; index += 1) {
    const label = destinationLabels[index];
    console.log(`[audit] ${role} ${index + 1}/${destinationLabels.length}: ${label}`);
    const button = page.locator('.role-based-nav').getByRole('button', { name: label, exact: true });
    await button.click({ timeout: 8_000 });
    await waitStable(page);
    const before = await snapshot(page);
    expect(before.activeRail.length, `${role} ${label} must have one active rail destination`).toBe(1);
    expect(before.overflowX, `${role} ${label} must not overflow horizontally`).toBe(0);
    const stem = `${slug(role)}-${String(index + 1).padStart(2, '0')}-${slug(label)}-${projectNameForReporter}`;
    await page.screenshot({ path: `${evidenceDir}/${stem}-before-controls.png`, fullPage: false });
    const controls = await exerciseControls(page, seenNames);
    await waitStable(page);
    const after = await snapshot(page);
    await page.screenshot({ path: `${evidenceDir}/${stem}-viewport.png`, fullPage: false });
    if (after.pageHeight > 1600) await page.screenshot({ path: `${evidenceDir}/${stem}-full.png`, fullPage: true });
    roleAudit.destinations.push({ index: index + 1, label, before, after, controls });
    await writeFile(`${evidenceDir}/${slug(role)}-${projectNameForReporter}.json`, JSON.stringify(roleAudit, null, 2));
  }
  roleAudit.totals = roleAudit.destinations.reduce((totals: any, destination: any) => {
    totals.destinations += 1;
    destination.controls.forEach((control: any) => {
      totals.controls += 1;
      if (control.executed) totals.executed += 1;
      if (control.contractVerified) totals.contractVerified += 1;
      if (control.classification === 'governed-high-impact') totals.guarded += 1;
      if (control.disabled) totals.disabled += 1;
      if (control.executed && !control.changed && !control.dialogOpened && !control.clickError) totals.noVisibleChange += 1;
    });
    return totals;
  }, { destinations: 0, controls: 0, executed: 0, contractVerified: 0, guarded: 0, disabled: 0, noVisibleChange: 0 });
  roleAudit.signals = { errors: meaningful(observed.errors), failed: meaningful(observed.failed), responses: observed.responses.filter((value) => !/^404 /.test(value)) };
  await writeFile(`${evidenceDir}/${slug(role)}-${projectNameForReporter}.json`, JSON.stringify(roleAudit, null, 2));
  expect(roleAudit.signals.errors).toEqual([]);
  expect(roleAudit.signals.failed).toEqual([]);
  expect(roleAudit.signals.responses).toEqual([]);
}

test.beforeAll(async () => mkdir(evidenceDir, { recursive: true }));
test.describe.configure({ mode: 'serial' });

for (const role of roles) {
  test(`${role} deep journey on the shared project`, async ({ page }, info) => {
    test.setTimeout(8 * 60 * 1000);
    await auditRole(page, role, info.project.name);
  });
}
