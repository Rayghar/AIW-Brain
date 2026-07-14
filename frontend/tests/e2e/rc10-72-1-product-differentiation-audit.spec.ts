import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.72.1/product-differentiation-audit';
const projectName = `Sol Differentiation Audit ${Date.now()}`;
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const highImpact = /delete|remove|approve|reject|promote|publish|activate|sign|pin release|merge|purge|submit for|request changes|apply prepared|rollback|roll back|accept change|accept context|accept selected|create branch/i;
const safeClick = /task plan|work area|outputs|validate|handoff|compose|inspect|review|present|readiness|alternatives|blueprint|simulate|select & handoff|candidate fit|preview & apply|explore design catalogue|guidance|history|details|evidence|interfaces|findings|audit|posture|show|hide|expand|collapse|open|close|journey atlas|requirements studio|source intake|canonical requirements|clarification queue|previous|next|fit view|zoom|refresh|recompute|generate alternatives|analyse|compare/i;
const shellClass = /role-based-nav|role-journey-rail|top-bar|topbar|app-header|studio-topbar|guided-delivery-header/i;

function observe(page: Page) {
  const errors: string[] = [];
  const failed: string[] = [];
  const responses: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', (request) => {
    const value = `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`;
    if (!/presence\/heartbeat/i.test(value)) failed.push(value);
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !/favicon|telemetry/i.test(response.url())) responses.push(`${response.status()} ${response.request().method()} ${response.url()}`);
  });
  return { errors, failed, responses };
}

const meaningful = (values: string[]) => values.filter((value) => !/favicon|React DevTools|ResizeObserver loop|ERR_ABORTED|LLM_ALL_ROUTES_FAILED|telemetry/i.test(value));

async function closeTransient(page: Page) {
  const viewbook = page.getByTestId('architecture-viewbook');
  if (await viewbook.isVisible().catch(() => false)) await page.getByRole('button', { name: /Close Architecture Viewbook/i }).click().catch(() => {});
  const dialogs = page.getByRole('dialog');
  for (let index = (await dialogs.count().catch(() => 0)) - 1; index >= 0; index -= 1) {
    const dialog = dialogs.nth(index);
    if (!await dialog.isVisible().catch(() => false)) continue;
    const close = dialog.getByRole('button', { name: /close|cancel|dismiss|skip|not now/i }).first();
    if (await close.isVisible().catch(() => false)) await close.click().catch(() => {});
  }
  await page.keyboard.press('Escape').catch(() => {});
}

async function waitStable(page: Page) {
  await page.waitForTimeout(70);
  for (const selector of ['.workspace-loading', '.stage-co-author-loading', '[aria-busy="true"]']) {
    const loading = page.locator(selector).first();
    if (await loading.isVisible().catch(() => false)) await loading.waitFor({ state: 'hidden', timeout: 12_000 }).catch(() => {});
  }
  await page.waitForTimeout(30);
}

async function pageSnapshot(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector('#aiw-main') ?? document.querySelector('main') ?? document.body;
    const visible = (element: Element) => {
      const rect = (element as HTMLElement).getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const rect = (main as HTMLElement).getBoundingClientRect();
    const canvas = document.querySelector('.react-flow')?.getBoundingClientRect();
    const headings = [...main.querySelectorAll('h1,h2,h3')].filter(visible).slice(0, 24).map((item) => (item.textContent ?? '').trim().replace(/\s+/g, ' '));
    const cards = [...main.querySelectorAll('section,article,.card,.panel')].filter(visible).length;
    const activeTabs = [...main.querySelectorAll('[role="tab"][aria-selected="true"], button.active, button.is-active')].filter(visible).slice(0, 16).map((item) => (item.getAttribute('aria-label') || item.textContent || '').trim().replace(/\s+/g, ' '));
    return {
      headings,
      activeTabs,
      pageHeight: document.documentElement.scrollHeight,
      documentOverflowX: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      mainOverflowX: Math.max(0, (main as HTMLElement).scrollWidth - (main as HTMLElement).clientWidth),
      textChars: (main.textContent ?? '').trim().length,
      cards,
      main: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
      canvas: canvas ? { top: Math.round(canvas.top), width: Math.round(canvas.width), height: Math.round(canvas.height) } : null,
      signature: JSON.stringify({ headings, activeTabs, dialogs: [...document.querySelectorAll('[role="dialog"]')].filter(visible).length }),
    };
  });
}

async function inventoryControls(page: Page, screen: string) {
  return page.evaluate(({ screen, shellClassSource }) => {
    const shellRegex = new RegExp(shellClassSource, 'i');
    const visible = (element: Element) => {
      const rect = (element as HTMLElement).getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    };
    const candidates = [...document.querySelectorAll('button,[role="button"],summary,select,a[href]')].filter(visible);
    const names = candidates.map((element) => (element.getAttribute('aria-label') || element.textContent || element.getAttribute('title') || '').trim().replace(/\s+/g, ' '));
    return candidates.map((element, index) => {
      const html = element as HTMLElement;
      const rect = html.getBoundingClientRect();
      const style = getComputedStyle(html);
      const name = names[index];
      const duplicateCount = name ? names.filter((item) => item.toLowerCase() === name.toLowerCase()).length : 0;
      const scopeClass = [html.className, html.closest('[class]')?.className].filter(Boolean).join(' ');
      const scope = shellRegex.test(scopeClass) || html.closest('.role-based-nav,.role-journey-rail,header') ? 'shell' : 'workspace';
      const textOverflow = html.scrollWidth > html.clientWidth + 1 || html.scrollHeight > html.clientHeight + 2;
      const hasText = Boolean((html.textContent ?? '').trim());
      const hasAccessibleName = Boolean(name);
      const disabled = html instanceof HTMLButtonElement || html instanceof HTMLSelectElement ? html.disabled : html.getAttribute('aria-disabled') === 'true';
      return {
        screen,
        index: index + 1,
        tag: html.tagName.toLowerCase(),
        role: html.getAttribute('role') ?? '',
        name,
        title: html.getAttribute('title') ?? '',
        testId: html.getAttribute('data-testid') ?? '',
        className: html.className,
        scope,
        disabled,
        ariaPressed: html.getAttribute('aria-pressed'),
        ariaSelected: html.getAttribute('aria-selected'),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        textOverflow,
        hasText,
        hasAccessibleName,
        duplicateCount,
        href: html instanceof HTMLAnchorElement ? html.getAttribute('href') ?? '' : '',
        issues: [
          !hasAccessibleName ? 'unnamed-control' : '',
          rect.width < 36 || rect.height < 36 ? 'small-target' : '',
          textOverflow ? 'content-overflow' : '',
          duplicateCount > 1 && name ? 'duplicate-label' : '',
          disabled && !html.getAttribute('title') ? 'disabled-without-explanation' : '',
          !hasText && !html.getAttribute('aria-label') && !html.getAttribute('title') ? 'icon-only-without-label' : '',
          name.length > 55 ? 'overlong-label' : '',
        ].filter(Boolean),
      };
    });
  }, { screen, shellClassSource: shellClass.source });
}

function classifyControl(control: any) {
  const name = String(control.name ?? '');
  if (!name) return { classification: 'accessibility-defect', risk: 'medium', expected: 'Provide a stable accessible name and tooltip.' };
  if (control.disabled) return { classification: 'disabled-state', risk: 'low', expected: 'Explain prerequisite or reason for disabled state.' };
  if (control.scope === 'shell') return { classification: 'global-navigation-or-utility', risk: 'low', expected: 'Move between major product contexts without disturbing project state.' };
  if (highImpact.test(name)) return { classification: 'governed-high-impact', risk: 'high', expected: 'Require explicit evidence, confirmation, audit receipt and reversible mutation where applicable.' };
  if (/generate|draft|analyse|recompute|refresh|simulate/i.test(name)) return { classification: 'compute-or-proposal-action', risk: 'medium', expected: 'Produce visible progress, evidence-bearing output and clear success/failure state.' };
  if (/save|add|create|apply|accept/i.test(name)) return { classification: 'mutation-action', risk: 'medium', expected: 'Preview consequences, validate, then persist with feedback and rollback.' };
  if (/task plan|work area|outputs|validate|handoff|compose|inspect|review|present|readiness|alternatives|blueprint|candidate fit|preview|catalogue|guidance|history|details|evidence|interfaces|findings|audit|posture|show|hide|expand|collapse|open|close|previous|next/i.test(name)) return { classification: 'view-or-workflow-navigation', risk: 'low', expected: 'Change task state immediately and preserve user context.' };
  return { classification: 'functional-control', risk: 'low', expected: 'Perform the labelled function with visible state change or feedback.' };
}

async function exerciseSafeControls(page: Page, screen: string, navLabel?: string) {
  const results: any[] = [];
  const seen = new Set<string>();
  const controls = await inventoryControls(page, screen);
  for (const control of controls) {
    if (control.scope !== 'workspace' || control.disabled || !control.name || highImpact.test(control.name) || !safeClick.test(control.name)) continue;
    const key = control.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (results.length >= 24) break;
    if (navLabel) {
      const nav = page.locator('.role-based-nav').getByRole('button', { name: navLabel, exact: true });
      if (await nav.isVisible().catch(() => false)) { await nav.click().catch(() => {}); await waitStable(page); }
    }
    const locator = page.getByRole(control.tag === 'a' ? 'link' : 'button', { name: control.name, exact: true }).first();
    const fallback = page.locator(`[data-testid="${control.testId}"]`).first();
    const target: Locator = await locator.isVisible().catch(() => false) ? locator : fallback;
    if (!await target.isVisible().catch(() => false)) continue;
    const before = await pageSnapshot(page);
    let error = '';
    await target.click({ timeout: 4_000 }).catch((value) => { error = String(value); });
    await page.waitForTimeout(160);
    const after = await pageSnapshot(page);
    const dialogOpened = await page.getByRole('dialog').first().isVisible().catch(() => false);
    const toastVisible = await page.locator('.notice-toast').isVisible().catch(() => false);
    results.push({ name: control.name, executed: !error, changed: before.signature !== after.signature, dialogOpened, toastVisible, error });
    await closeTransient(page);
  }
  return results;
}

async function auditScreen(page: Page, screen: string, ordinal: number, report: any, exercise = false, navLabel?: string) {
  await waitStable(page);
  const snapshot = await pageSnapshot(page);
  const controls = (await inventoryControls(page, screen)).map((control: any) => ({ ...control, ...classifyControl(control) }));
  const executions = exercise ? await exerciseSafeControls(page, screen, navLabel) : [];
  const stem = `${String(ordinal).padStart(2, '0')}-${slug(screen)}`;
  await page.screenshot({ path: `${evidenceDir}/${stem}-viewport.png`, fullPage: false, animations: 'disabled' });
  const gapFlags = [
    snapshot.documentOverflowX > 1 || snapshot.mainOverflowX > 1 ? 'horizontal-overflow' : '',
    snapshot.pageHeight > 2400 ? 'very-long-page' : snapshot.pageHeight > 1700 ? 'long-page' : '',
    snapshot.textChars > 7000 ? 'very-text-heavy' : snapshot.textChars > 4500 ? 'text-heavy' : '',
    controls.length > 45 ? 'control-overload' : controls.length > 28 ? 'high-control-density' : '',
    controls.some((item: any) => item.issues.includes('unnamed-control')) ? 'unnamed-controls' : '',
    controls.some((item: any) => item.issues.includes('content-overflow')) ? 'control-content-overflow' : '',
    snapshot.canvas && snapshot.canvas.top > 360 ? 'canvas-below-primary-work-area' : '',
    snapshot.canvas && snapshot.canvas.height < 430 ? 'canvas-too-shallow' : '',
  ].filter(Boolean);
  report.screens.push({ screen, ordinal, snapshot, controls, executions, gapFlags, screenshot: `${stem}-viewport.png` });
}

async function createProjectFromScratch(page: Page, report: any) {
  let ordinal = 1;
  await mountAiw(page);
  await waitStable(page);
  await auditScreen(page, 'Project home', ordinal++, report, false);
  await page.getByRole('button', { name: /new guided architecture project/i }).click();
  await waitStable(page);
  await auditScreen(page, 'Create project', ordinal++, report, false);
  await page.getByLabel(/project name/i).fill(projectName);
  await page.getByLabel(/business goal/i).fill('Design a secure, resilient, auditable and scalable agency banking platform that supports agent onboarding, customer onboarding, deposits, withdrawals, transfers, reversals, reconciliation and governed integration with identity, core banking and payment-switch services.');
  await page.getByRole('button', { name: /create guided project/i }).click();
  await waitStable(page);
  await auditScreen(page, 'Role selection', ordinal++, report, false);
  const role = page.locator('.role-card').filter({ hasText: /Solution Architect/i }).first();
  await role.click();
  const tour = page.getByRole('dialog', { name: /guided tour|first-run/i });
  await tour.waitFor({ state: 'visible', timeout: 1_500 }).catch(() => undefined);
  if (await tour.isVisible().catch(() => false)) await tour.getByRole('button', { name: /Skip tour/i }).click();
  await waitStable(page);
  return ordinal;
}

async function runGenesis(page: Page, report: any) {
  const requirements = page.locator('.role-based-nav').getByRole('button', { name: /Requirements & Intent/i });
  if (await requirements.isVisible().catch(() => false)) await requirements.click();
  await expect(page.getByTestId('requirements-genesis-studio')).toBeVisible();
  const idea = 'Agents must securely onboard customers, verify identity, perform cash deposits and withdrawals, initiate transfers, receive reliable status, reverse failed transactions, reconcile settlement, operate during dependency degradation, protect personal and financial data, and provide complete audit evidence.';
  await page.getByPlaceholder(/Build an agency banking platform/i).fill(idea);
  await page.getByRole('button', { name: /Add idea as source/i }).click();
  await page.getByRole('button', { name: /Generate requirements & journeys/i }).click();
  await expect(page.getByRole('heading', { name: /Canonical requirements proposal/i })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /Accept selected model/i }).click();
  await expect(page.getByRole('button', { name: /Journey Atlas/i })).toHaveClass(/is-active/);
  const message = page.locator('.journey-message-row').first();
  if (await message.isVisible().catch(() => false)) await message.click();
  report.journey.genesis = 'completed';

  const context = page.locator('.role-based-nav').getByRole('button', { name: /System Context & Journeys/i });
  await context.click();
  await expect(page.getByTestId('system-context-studio')).toBeVisible();
  const accept = page.getByRole('button', { name: /Accept context model/i });
  if (await accept.isEnabled().catch(() => false)) await accept.click();
  report.journey.systemContext = 'accepted';
}

async function advanceLivingCanvas(page: Page, navLabel: string, report: any) {
  const nav = page.locator('.role-based-nav').getByRole('button', { name: navLabel, exact: true });
  if (!await nav.isVisible().catch(() => false)) return;
  await nav.click();
  await waitStable(page);
  const firstNode = page.locator('.architecture-node').first();
  if (await firstNode.isVisible().catch(() => false)) await firstNode.click().catch(() => {});
  const cursor = page.getByTestId('generative-cursor-controller');
  if (!await cursor.isVisible().catch(() => false)) { report.journey.livingCanvas.push({ stage: navLabel, outcome: 'cursor-not-visible' }); return; }
  let action = cursor.locator('.generative-cursor__action-main').first();
  if (!await action.isVisible().catch(() => false)) {
    const recompute = cursor.getByRole('button', { name: /Recompute|Canonical refresh/i }).first();
    if (await recompute.isEnabled().catch(() => false)) await recompute.click().catch(() => {});
    await waitStable(page);
    action = cursor.locator('.generative-cursor__action-main').first();
  }
  if (!await action.isVisible().catch(() => false)) { report.journey.livingCanvas.push({ stage: navLabel, outcome: 'no-eligible-action' }); return; }
  const label = (await action.innerText()).replace(/\s+/g, ' ').trim();
  await action.click();
  const tray = page.getByTestId('generative-preview-tray');
  if (!await tray.isVisible().catch(() => false)) { report.journey.livingCanvas.push({ stage: navLabel, outcome: 'preview-not-opened', label }); return; }
  const accept = tray.getByRole('button', { name: /Accept change/i });
  if (await accept.isEnabled().catch(() => false)) {
    await accept.click();
    await waitStable(page);
    report.journey.livingCanvas.push({ stage: navLabel, outcome: 'accepted', label });
  } else {
    report.journey.livingCanvas.push({ stage: navLabel, outcome: 'ineligible-preview', label });
    await tray.getByRole('button', { name: /Close change preview/i }).click().catch(() => {});
  }
}

test.beforeAll(async () => mkdir(evidenceDir, { recursive: true }));

test('installed product is created from scratch and audited through the design lifecycle', async ({ page }) => {
  test.setTimeout(12 * 60 * 1000);
  const signals = observe(page);
  const report: any = {
    release: '0.10.0-rc.10.72.0',
    audit: 'rc.10.72.1 installed-product differentiation audit',
    project: projectName,
    createdFromScratch: true,
    role: 'Solution Architect',
    screens: [],
    journey: { genesis: 'not-run', systemContext: 'not-run', livingCanvas: [] },
    signals: {},
  };

  let ordinal = await createProjectFromScratch(page, report);
  await runGenesis(page, report);
  for (const stage of ['Logical Application', 'Application Realization', 'Logical Technology', 'Physical Technology']) {
    await advanceLivingCanvas(page, stage, report);
  }

  const rail = page.locator('.role-based-nav');
  const labels = await rail.locator('nav button').evaluateAll((items) => items.filter((item) => {
    const rect = (item as HTMLElement).getBoundingClientRect(); return rect.width > 0 && rect.height > 0;
  }).map((item) => item.getAttribute('aria-label') || (item.textContent ?? '').trim().replace(/\s+/g, ' ')));
  report.navigationDestinations = [...new Set(labels)].filter(Boolean);

  for (const label of report.navigationDestinations) {
    const nav = rail.getByRole('button', { name: label, exact: true });
    if (!await nav.isVisible().catch(() => false)) continue;
    await nav.click();
    await waitStable(page);
    await auditScreen(page, label, ordinal++, report, false, label);
  }

  // Cross-project Brain assessment from a model-bearing stage.
  const brainLauncher = page.getByRole('button', { name: /Open Sol Architecture Brain/i });
  if (await brainLauncher.isVisible().catch(() => false)) {
    await brainLauncher.click();
    await waitStable(page);
    await auditScreen(page, 'Sol Architecture Brain', ordinal++, report, false);
    await page.getByRole('button', { name: /Close Architecture Brain/i }).click().catch(() => {});
  }

  // Reviewer hand-off: assess the key independent review surfaces on the same project.
  const selector = page.locator('label.role-journey-select select');
  if (await selector.isVisible().catch(() => false)) {
    const reviewerOption = await selector.locator('option').filter({ hasText: /Reviewer|Architecture Reviewer/i }).first().getAttribute('value').catch(() => null);
    if (reviewerOption) {
      await selector.selectOption(reviewerOption, { force: true });
      await waitStable(page);
      const reviewerRail = page.locator('.role-based-nav');
      const reviewerLabels = await reviewerRail.locator('nav button').evaluateAll((items) => items.map((item) => item.getAttribute('aria-label') || (item.textContent ?? '').trim().replace(/\s+/g, ' ')));
      for (const label of [...new Set(reviewerLabels)].filter((value) => /Queue|Findings|Evidence|Disposition|Governance|Conformance/i.test(value)).slice(0, 5)) {
        const nav = reviewerRail.getByRole('button', { name: label, exact: true });
        if (!await nav.isVisible().catch(() => false)) continue;
        await nav.click();
        await waitStable(page);
        await auditScreen(page, `Reviewer — ${label}`, ordinal++, report, false, label);
      }
    }
  }

  const allControls = report.screens.flatMap((screen: any) => screen.controls.map((control: any) => ({ ...control, screen: screen.screen })));
  const issueCounts: Record<string, number> = {};
  for (const control of allControls) for (const issue of control.issues) issueCounts[issue] = (issueCounts[issue] ?? 0) + 1;
  report.totals = {
    screens: report.screens.length,
    controls: allControls.length,
    workspaceControls: allControls.filter((item: any) => item.scope === 'workspace').length,
    shellControls: allControls.filter((item: any) => item.scope === 'shell').length,
    highImpactControls: allControls.filter((item: any) => item.classification === 'governed-high-impact').length,
    disabledControls: allControls.filter((item: any) => item.disabled).length,
    executedSafeControls: report.screens.reduce((sum: number, screen: any) => sum + screen.executions.filter((item: any) => item.executed).length, 0),
    noVisibleEffect: report.screens.reduce((sum: number, screen: any) => sum + screen.executions.filter((item: any) => item.executed && !item.changed && !item.dialogOpened && !item.toastVisible).length, 0),
    issueCounts,
    pagesWithGapFlags: report.screens.filter((screen: any) => screen.gapFlags.length).map((screen: any) => ({ screen: screen.screen, gaps: screen.gapFlags })),
  };
  report.signals = { errors: meaningful(signals.errors), failed: meaningful(signals.failed), responses: meaningful(signals.responses) };

  await writeFile(`${evidenceDir}/AIW_RC10_72_1_PRODUCT_AUDIT.json`, JSON.stringify(report, null, 2));
  const csv = ['screen,index,scope,tag,name,classification,risk,disabled,width,height,issues,expected'];
  for (const control of allControls) {
    const values = [control.screen, control.index, control.scope, control.tag, control.name, control.classification, control.risk, control.disabled, control.width, control.height, control.issues.join('|'), control.expected];
    csv.push(values.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','));
  }
  await writeFile(`${evidenceDir}/AIW_RC10_72_1_CONTROL_MATRIX.csv`, csv.join('\n'));
  await writeFile(`${evidenceDir}/AIW_RC10_72_1_SCREEN_INDEX.json`, JSON.stringify(report.screens.map((screen: any) => ({ screen: screen.screen, screenshot: screen.screenshot, snapshot: screen.snapshot, gapFlags: screen.gapFlags })), null, 2));

  expect(report.signals.errors).toEqual([]);
  expect(report.signals.failed).toEqual([]);
  expect(report.signals.responses).toEqual([]);
});
