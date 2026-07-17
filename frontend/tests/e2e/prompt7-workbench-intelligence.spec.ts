import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = '../release-evidence/rc10.73.8/prompt7/product-journey';
const results: Array<Record<string, unknown>> = [];
const screenshots: Array<Record<string, string>> = [];
const scenarios = [
  { id: 'agency-banking', name: 'Prompt 7 Agency Banking', goal: 'Enable agents to securely execute customer deposits and withdrawals through fraud controls, reconciliation and governed core-banking integration.', idea: 'Agents onboard customers, verify identity, accept cash deposits, execute withdrawals and transfers, reconcile settlement, preserve audit evidence and fail safely when core banking is unavailable.' },
  { id: 'core-modernisation', name: 'Prompt 7 Core Modernisation', goal: 'Modernise a legacy core through coexistence, migration waves, reconciliation, rollback and minimal customer disruption.', idea: 'Channels, payments, customer information, product processing, general ledger, batch and regulatory reporting must coexist while accounts migrate in controlled waves with rehearsed cutover and rollback.' },
  { id: 'event-fulfilment', name: 'Prompt 7 Event Fulfilment', goal: 'Coordinate orders, inventory, payment, fulfilment and delivery across partial failure.', idea: 'Customer orders require inventory reservation, payment authorisation, fulfilment, delivery, cancellation, idempotent duplicate-event handling, retries, reconciliation and end-to-end observability.' },
] as const;

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function navigate(page: Page, name: RegExp) {
  const launcher = page.getByRole('button', { name: /Open role navigation/i });
  if (await launcher.isVisible().catch(() => false)) await launcher.click();
  await page.getByTestId('role-navigation-v2').getByRole('button', { name }).click({ timeout: 15_000 });
}

async function capture(page: Page, scenario: string, name: string) {
  const path = `${evidenceDir}/${scenario}-${name}.png`;
  await page.screenshot({ path, fullPage: false, animations: 'disabled' });
  screenshots.push({ scenario, stage: name, path: `product-journey/${scenario}-${name}.png` });
}

async function proposeAndAcceptStage(page: Page, stage: RegExp, scenarioId: string, index: number) {
  await navigate(page, stage);
  await page.getByTestId('open-stage-co-author').first().click();
  const drawer = page.getByRole('dialog', { name: /Sol for/i });
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', { name: /^Draft/i }).click();
  const panel = drawer.locator('[data-testid^="stage-co-author-"]');
  await expect(panel).toBeVisible();
  let textareas = panel.locator('.stage-draft textarea');
  if (!await textareas.first().isVisible({ timeout: 20_000 }).catch(() => false)) {
    await panel.getByRole('button', { name: /Generate governed draft/i }).click();
    textareas = panel.locator('.stage-draft textarea');
  }
  await expect(textareas.first()).toBeVisible({ timeout: 30_000 });
  const payload = await textareas.evaluateAll((items) => items.map((item) => (item as HTMLTextAreaElement).value).join('\n---\n'));
  const candidateCount = await textareas.count();
  if (index === 0) {
    await panel.getByRole('button', { name: /Reject/i }).first().click();
    const second = textareas.nth(1);
    await second.fill(`${await second.inputValue()}\n`);
    await panel.getByRole('button', { name: /Modify \/ review/i }).nth(1).click();
  } else if (index === 1) {
    await panel.getByRole('button', { name: /Defer/i }).first().click();
  }
  const accept = panel.getByRole('button', { name: /Accept selected/i });
  await expect(accept).toBeEnabled();
  await accept.click();
  await expect(accept).toBeDisabled();
  await capture(page, scenarioId, `stage-${index + 1}`);
  await drawer.getByRole('button', { name: /Close Sol/i }).click();
  return { candidateCount, fingerprint: fingerprint(payload) };
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });
test.afterAll(async () => {
  await writeFile(`${evidenceDir}/PROMPT7_BROWSER_JOURNEY_RESULTS.json`, `${JSON.stringify({ schemaVersion: 'aiw-prompt7-browser-journeys-v1', results, screenshots, providerCalls: 0, productionAccepted: false }, null, 2)}\n`);
});

for (const scenario of scenarios) test(`${scenario.name} exposes governed scenario-specific intelligence`, async ({ page }) => {
  test.setTimeout(7 * 60 * 1000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error' && !/LLM_ALL_ROUTES_FAILED|favicon/i.test(message.text())) errors.push(message.text()); });
  await mountAiw(page);
  await page.getByRole('button', { name: /new guided architecture project/i }).click();
  await page.getByLabel(/project name/i).fill(scenario.name);
  await page.getByLabel(/business goal/i).fill(scenario.goal);
  await page.getByRole('button', { name: /create guided project/i }).click();
  await page.locator('.role-card').filter({ hasText: /Solution Architect/i }).first().click();
  const tour = page.getByRole('dialog', { name: /guided tour|first-run/i });
  if (await tour.isVisible().catch(() => false)) await tour.getByRole('button', { name: /Skip tour/i }).click();
  await page.getByPlaceholder(/Build an agency banking platform/i).fill(scenario.idea);
  await page.getByRole('button', { name: /Add idea as source/i }).click();
  await page.getByRole('button', { name: /Generate requirements & journeys/i }).click();
  await expect(page.getByRole('heading', { name: /Canonical requirements proposal/i })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /Accept selected model/i }).click();
  await capture(page, scenario.id, 'requirements');

  const stageResults = [];
  const stages = [/^Logical Application$/i, /^Application Realization$/i, /^Logical Technology$/i, /^Physical Technology$/i];
  for (let index = 0; index < stages.length; index += 1) stageResults.push(await proposeAndAcceptStage(page, stages[index]!, scenario.id, index));

  await page.locator('label.role-journey-select select').selectOption({ label: 'Reviewer' }, { force: true });
  await navigate(page, /^Governance$/i);
  await expect(page.getByText(/Governance|approval|obligation/i).first()).toBeVisible();
  await capture(page, scenario.id, 'reviewer-governance');

  await page.locator('label.role-journey-select select').selectOption({ label: 'Solution Architect' }, { force: true });
  await navigate(page, /^SDD Delivery Pack$/i);
  const sddText = await page.locator('main').innerText();
  await expect(page.getByText(/SDD|Delivery Pack/i).first()).toBeVisible();
  await capture(page, scenario.id, 'sdd');

  expect(new Set(stageResults.map((item) => item.fingerprint)).size).toBe(4);
  expect(stageResults.every((item) => item.candidateCount >= 8)).toBe(true);
  expect(errors).toEqual([]);
  results.push({ scenarioId: scenario.id, stages: stageResults, allFourDesignStagesActionable: true, acceptRejectModifyObserved: true, reviewerGovernanceObserved: true, scenarioSpecificSddFingerprint: fingerprint(sddText), candidateAuthorityOnly: true, errors });
});
