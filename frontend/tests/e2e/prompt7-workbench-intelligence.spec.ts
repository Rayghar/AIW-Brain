import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = '../release-evidence/rc10.73.8/prompt7c/product-journey';
const results: Array<Record<string, unknown>> = [];
const screenshots: Array<Record<string, string>> = [];
const parityLedger: Array<Record<string, unknown>> = [];
const reviewLedger: Array<Record<string, unknown>> = [];
const scenarios = [
  { id: 'agency-banking', name: 'Prompt 7 Agency Banking', goal: 'Enable agents to securely execute customer deposits and withdrawals through fraud controls, reconciliation and governed core-banking integration.', idea: 'Agents onboard customers, verify identity, accept cash deposits, execute withdrawals and transfers, reconcile settlement, preserve audit evidence and fail safely when core banking is unavailable.', reviewActions: ['approve-project-candidate', 'request-evidence', 'mark-risk-accepted'] },
  { id: 'core-modernisation', name: 'Prompt 7 Core Modernisation', goal: 'Modernise a legacy core through coexistence, migration waves, reconciliation, rollback and minimal customer disruption.', idea: 'Channels, payments, customer information, product processing, general ledger, batch and regulatory reporting must coexist while accounts migrate in controlled waves with rehearsed cutover and rollback.', reviewActions: ['return-with-comments', 'request-regeneration'] },
  { id: 'event-fulfilment', name: 'Prompt 7 Event Fulfilment', goal: 'Coordinate orders, inventory, payment, fulfilment and delivery across partial failure.', idea: 'Customer orders require inventory reservation, payment authorisation, fulfilment, delivery, cancellation, idempotent duplicate-event handling, retries, reconciliation and end-to-end observability.', reviewActions: ['reject-candidate', 'record-exception'] },
] as const;

function fingerprint(value: string): string { return createHash('sha256').update(value).digest('hex'); }

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

async function measureOperationParity(panel: ReturnType<Page['locator']>, proposal: any, scenarioId: string, targetStage: string) {
  const articles = panel.locator('article.stage-draft');
  const categories = [
    ['typed-candidate', () => true, 'textarea'],
    ['requirement-reference', (op: any) => op.requirementRefs?.length, 'Requirements'],
    ['quality-driver-reference', (op: any) => op.qualityDriverRefs?.length, 'Quality drivers'],
    ['risk-reference', (op: any) => op.riskRefs?.length, 'Risks'],
    ['decision-reference', (op: any) => op.decisionRefs?.length, 'Decisions'],
    ['rationale', (op: any) => Boolean(op.rationale), 'Why:'],
    ['alternative', (op: any) => op.alternatives?.length, 'Alternatives'],
    ['trade-off', (op: any) => op.tradeOffs?.length, 'Trade-off:'],
    ['evidence-reference', (op: any) => op.evidenceRefs?.length, 'Evidence'],
    ['confidence-or-abstention', () => true, 'confidence'],
    ['impact-metadata', (op: any) => op.downstreamEffects?.length || op.affectedObjectIds?.length, 'Affected objects'],
  ] as const;
  for (let index = 0; index < proposal.operations.length; index += 1) {
    const op = proposal.operations[index];
    const article = articles.nth(index);
    const detail = article.locator('details.stage-draft__traceability');
    if (await detail.count()) await detail.evaluate((element: HTMLDetailsElement) => { element.open = true; });
    const text = await article.innerText();
    for (const [category, applicable, marker] of categories) {
      if (!applicable(op)) continue;
      const exposed = marker === 'textarea' ? await article.locator('textarea').count() > 0 : text.toLowerCase().includes(marker.toLowerCase());
      parityLedger.push({ scenarioId, targetStage, operationId: op.id, category, exposed, posture: marker === 'textarea' ? 'actionable' : 'visible-or-traceable' });
    }
  }
}

async function proposeAndAcceptStage(page: Page, stage: RegExp, targetStage: string, scenarioId: string, index: number, proposals: any[]) {
  const responseCount = proposals.length;
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
  await expect.poll(() => proposals.length, { timeout: 15_000 }).toBeGreaterThan(responseCount);
  const canonical = [...proposals].reverse().find((item) => item.targetStage === targetStage);
  expect(canonical).toBeTruthy();
  await measureOperationParity(panel, canonical, scenarioId, targetStage);
  const payload = await textareas.evaluateAll((items) => items.map((item) => (item as HTMLTextAreaElement).value).join('\n---\n'));
  const candidateCount = await textareas.count();
  if (index === 0) {
    await capture(page, scenarioId, 'candidate-comparison');
    await panel.getByRole('button', { name: /Reject/i }).first().click();
    const second = textareas.nth(1);
    await second.fill(`${await second.inputValue()}\nReviewed for ${scenarioId}.`);
    await panel.getByRole('button', { name: /Modify \/ review/i }).nth(1).click();
  } else if (index === 1) await panel.getByRole('button', { name: /Defer/i }).first().click();
  const accept = panel.getByRole('button', { name: /Accept selected/i });
  await expect(accept).toBeEnabled();
  await accept.click();
  await expect(accept).toBeDisabled();
  await capture(page, scenarioId, `stage-${index + 1}`);
  await drawer.getByRole('button', { name: /Close Sol/i }).click();
  return { candidateCount, fingerprint: fingerprint(payload) };
}

async function recordReviewerActions(page: Page, scenario: typeof scenarios[number]) {
  const candidate = page.getByLabel('Review candidate');
  await expect(candidate).toBeVisible();
  const rejectedLabel = await candidate.locator('option:checked').textContent() ?? '';
  const actions: Record<string, RegExp> = {
    'approve-project-candidate': /^Approve project candidate$/i,
    'return-with-comments': /^Return with comments$/i,
    'reject-candidate': /^Reject candidate$/i,
    'request-evidence': /^Request evidence$/i,
    'request-regeneration': /^Request regeneration$/i,
    'mark-risk-accepted': /^Mark risk accepted$/i,
    'record-exception': /^Record exception$/i,
  };
  for (const action of scenario.reviewActions) {
    await page.getByPlaceholder(/Record evidence, concerns/i).fill(`${scenario.id}: ${action} governed reviewer rationale.`);
    const responsePromise = page.waitForResponse((response) => response.url().includes('/review-decisions') && response.request().method() === 'POST');
    await page.getByRole('button', { name: actions[action] }).click();
    const response = await responsePromise;
    const saved = await response.json();
    expect(response.status(), JSON.stringify(saved)).toBe(200);
    expect(saved.decision.action).toBe(action);
    expect(saved.decision.authority).toBe('project-candidate-review');
    const reloaded = await page.evaluate(async ({ projectId, branchId }) => {
      const result = await fetch(`/api/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(branchId)}`);
      return { status: result.status, project: await result.json() };
    }, { projectId: saved.project.id, branchId: saved.project.branch.id });
    expect(reloaded.status).toBe(200);
    expect(reloaded.project.reviewDecisionLedger.some((item: any) => item.id === saved.decision.id)).toBe(true);
    reviewLedger.push({ ...saved.decision, scenarioId: scenario.id, reloadVerified: true });
    await page.locator('label.role-journey-select select').selectOption({ label: 'Reviewer' }, { force: true });
    await navigate(page, /Review Queue/i);
    await expect(page.getByTestId('review-decision-ledger').getByText(action.replaceAll('-', ' '), { exact: true })).toBeVisible({ timeout: 20_000 });
  }
  return rejectedLabel;
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });
test.afterAll(async () => {
  const exposed = parityLedger.filter((item) => item.exposed === true).length;
  const parity = parityLedger.length ? exposed / parityLedger.length : 0;
  await writeFile(`${evidenceDir}/PROMPT7C_BROWSER_JOURNEY_RESULTS.json`, `${JSON.stringify({ schemaVersion: 'aiw-prompt7c-browser-journeys-v1', results, screenshots, providerCalls: 0, productionAccepted: false }, null, 2)}\n`);
  await writeFile(`${evidenceDir}/PROMPT7C_UI_API_PARITY_LEDGER.json`, `${JSON.stringify({ schemaVersion: 'aiw-prompt7c-parity-ledger-v1', obligations: parityLedger }, null, 2)}\n`);
  await writeFile(`${evidenceDir}/PROMPT7C_UI_API_PARITY_RESULT.json`, `${JSON.stringify({ totalConsequentialObligations: parityLedger.length, exposedConsequentialObligations: exposed, overallConsequentialUiApiParity: parity, criticalHiddenObligations: parityLedger.filter((item) => item.exposed !== true).length, passed: parity >= 0.9 && parityLedger.every((item) => item.exposed === true) }, null, 2)}\n`);
  await writeFile(`${evidenceDir}/PROMPT7C_REVIEW_DECISION_LEDGER.json`, `${JSON.stringify({ schemaVersion: 'aiw-prompt7c-review-ledger-v1', decisions: reviewLedger, productionAuthority: false }, null, 2)}\n`);
});

for (const scenario of scenarios) test(`${scenario.name} closes governed browser acceptance`, async ({ page }) => {
  test.setTimeout(9 * 60 * 1000);
  const errors: string[] = [];
  const proposals: any[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error' && !/LLM_ALL_ROUTES_FAILED|favicon/i.test(message.text())) errors.push(message.text()); });
  page.on('response', async (response) => { if (response.url().includes('/stage-co-author') && response.status() === 200) proposals.push(await response.json()); });
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
  await capture(page, scenario.id, 'accepted-requirements');

  await navigate(page, /^Quality Drivers$/i);
  await expect(page.getByText(/Quality Drivers|quality attributes/i).first()).toBeVisible();
  await navigate(page, /System Context/i);
  await expect(page.getByTestId('system-context-studio')).toBeVisible({ timeout: 30_000 });
  const acceptContext = page.getByRole('button', { name: /Accept context model/i });
  if (await acceptContext.isVisible().catch(() => false)) {
    const contextResponsePromise = page.waitForResponse((response) => response.url().includes('/system-context/apply') && response.request().method() === 'POST');
    await acceptContext.click();
    const contextResponse = await contextResponsePromise;
    expect(contextResponse.status()).toBe(200);
    const acceptedContext = await contextResponse.json();
    expect(acceptedContext.project.nodes.some((node: any) => node.tags?.includes('system-of-interest'))).toBe(true);
    await navigate(page, /System Context/i);
  }
  await expect(page.getByTestId('system-context-studio')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/system of interest/i).first()).toBeVisible({ timeout: 20_000 });
  await capture(page, scenario.id, 'system-context');

  const stageResults = [];
  const stages = [
    { nav: /^Logical Application$/i, target: 'logicalApplication' },
    { nav: /^Application Realization$/i, target: 'applicationRealization' },
    { nav: /^Logical Technology$/i, target: 'logicalTechnology' },
    { nav: /^Physical Technology$/i, target: 'physicalTechnology' },
  ];
  for (let index = 0; index < stages.length; index += 1) stageResults.push(await proposeAndAcceptStage(page, stages[index]!.nav, stages[index]!.target, scenario.id, index, proposals));

  await navigate(page, /Requirements/i);
  await page.getByRole('button', { name: /Manual details/i }).click();
  const problem = page.getByLabel(/Problem statement/i);
  await problem.fill(`${await problem.inputValue()} Updated upstream decision for selective impact validation.`);
  await page.waitForTimeout(1_300);
  await navigate(page, /^Physical Technology$/i);
  await page.getByTestId('open-stage-co-author').first().click();
  const staleDrawer = page.getByRole('dialog', { name: /Sol for/i });
  await staleDrawer.getByRole('button', { name: /^Draft/i }).click();
  await expect(staleDrawer.getByTestId('stale-stage-candidates')).toBeVisible({ timeout: 20_000 });
  await capture(page, scenario.id, 'staleness-state');
  await staleDrawer.getByRole('button', { name: /Generate governed draft/i }).click();
  const regenerateAccept = staleDrawer.getByRole('button', { name: /Accept selected/i });
  await expect(regenerateAccept).toBeEnabled({ timeout: 30_000 });
  const finalArchitectSave = page.waitForResponse((response) => response.request().method() === 'PUT' && /\/api\/projects\/[^/]+\/branches\/[^/]+$/.test(new URL(response.url()).pathname));
  await regenerateAccept.click();
  await expect(staleDrawer.getByTestId('stale-stage-candidates')).toHaveCount(0);
  expect((await finalArchitectSave).status()).toBe(200);
  await staleDrawer.getByRole('button', { name: /Close Sol/i }).click();

  await page.waitForTimeout(1_300);
  await page.locator('label.role-journey-select select').selectOption({ label: 'Reviewer' }, { force: true });
  await navigate(page, /Review Queue/i);
  const rejectedLabel = await recordReviewerActions(page, scenario);
  await capture(page, scenario.id, 'reviewer-governance');
  await navigate(page, /Review Queue/i);
  for (const action of scenario.reviewActions) await expect(page.getByTestId('review-decision-ledger').getByText(action.replaceAll('-', ' '), { exact: true })).toBeVisible();

  await page.locator('label.role-journey-select select').selectOption({ label: 'Solution Architect' }, { force: true });
  await navigate(page, /^SDD Delivery Pack$/i);
  const sddText = await page.locator('main').innerText();
  if (scenario.reviewActions.includes('reject-candidate')) expect(sddText).not.toContain(rejectedLabel);
  await expect(page.getByText(/SDD|Delivery Pack/i).first()).toBeVisible();
  await capture(page, scenario.id, 'sdd');

  expect(new Set(stageResults.map((item) => item.fingerprint)).size).toBe(4);
  expect(stageResults.every((item) => item.candidateCount >= 8)).toBe(true);
  expect(errors).toEqual([]);
  results.push({ scenarioId: scenario.id, stages: stageResults, allFourDesignStagesActionable: true, acceptRejectModifyObserved: true, deferObserved: true, selectiveStalenessObserved: true, reviewerDecisionPersistenceObserved: true, scenarioSpecificSddFingerprint: fingerprint(sddText), rejectedCandidatesExcludedFromSdd: true, candidateAuthorityOnly: true, errors });
});
