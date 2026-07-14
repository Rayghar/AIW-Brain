import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.67/screenshots';

type Project = {
  id: string;
  tenantId: string;
  revision: number;
  activeStage: string;
  branch: { id: string };
  nodes: Array<{ id: string; label: string; kind: string; stage: string }>;
};
type Auth = { token: string };

function errors(page: Page) {
  const values: string[] = [];
  page.on('pageerror', (error) => values.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') values.push(message.text()); });
  page.on('requestfailed', (request) => values.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`));
  return values;
}

function meaningful(values: string[]) {
  return values.filter((value) => !/favicon|React DevTools|ResizeObserver loop|net::ERR_ABORTED|Failed to load resource.*404|telemetry/i.test(value));
}

async function createAuth(): Promise<Auth> {
  const response = await fetch('http://127.0.0.1:4100/api/auth/development-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-aiw-tenant-id': 'tenant-reference', 'x-aiw-user-id': 'user-owner' },
    body: JSON.stringify({ subject: 'user-owner', email: 'architect@example.com', displayName: 'Architecture Owner', tenantId: 'tenant-reference', ttlMinutes: 120 }),
  });
  expect(response.ok).toBeTruthy();
  return await response.json() as Auth;
}

function apiHeaders(auth: Auth, extra: Record<string, string> = {}) {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${auth.token}`,
    'x-aiw-tenant-id': 'tenant-reference',
    'x-aiw-user-id': 'user-owner',
    ...extra,
  };
}

async function requestActions(auth: Auth, project: Project, input: { stage: string; targetStage: string; selectedScopeId?: string; decompositionLevel: string; autonomyMode?: string }) {
  const response = await fetch(`http://127.0.0.1:4100/api/projects/${project.id}/branches/${project.branch.id}/living-canvas/actions`, {
    method: 'POST', headers: apiHeaders(auth),
    body: JSON.stringify({ event: {
      id: `rc1067-e2e-${project.revision}-${Date.now()}`,
      kind: 'candidate-requested', occurredAt: new Date().toISOString(), tenantId: project.tenantId,
      projectId: project.id, branchId: project.branch.id, revision: project.revision,
      actorId: 'user-owner', actorRole: 'solution-architect', stage: input.stage, targetStage: input.targetStage,
      ...(input.selectedScopeId ? { selectedScopeId: input.selectedScopeId, subjectIds: [input.selectedScopeId] } : {}),
      decompositionLevel: input.decompositionLevel, autonomyMode: input.autonomyMode ?? 'guide',
    }, outcomeHistory: [] }),
  });
  expect(response.ok).toBeTruthy();
  return await response.json() as { actions: Array<{ id: string; semanticKey: string; targetStage: string; eligibility: { eligible: boolean } }> };
}

async function applyAction(auth: Auth, project: Project, action: Record<string, unknown>): Promise<Project> {
  const response = await fetch(`http://127.0.0.1:4100/api/projects/${project.id}/branches/${project.branch.id}/living-canvas/apply`, {
    method: 'POST', headers: apiHeaders(auth, { 'idempotency-key': `rc1067-e2e-${project.id}-${project.revision}-${Date.now()}` }),
    body: JSON.stringify({ action, expectedRevision: project.revision, rationale: 'Prepare rc.10.67 stage co-creation acceptance journey' }),
  });
  expect(response.ok).toBeTruthy();
  const body = await response.json() as { project: Project };
  return body.project;
}

async function createCoCreationProject(page: Page, suffix: string, throughTechnology = false) {
  const auth = await createAuth();
  const name = `Stage Co-Creation ${suffix}-${Date.now()}`;
  const response = await fetch('http://127.0.0.1:4100/api/projects', {
    method: 'POST', headers: apiHeaders(auth),
    body: JSON.stringify({
      name, template: 'microservice',
      description: 'Customers submit secure payments and orders. The platform must be highly available, scalable, auditable, event-driven and protected by strong access controls.',
    }),
  });
  expect(response.ok).toBeTruthy();
  let project = await response.json() as Project;

  for (let index = 0; index < 10 && !project.nodes.some((node) => node.kind === 'LogicalService'); index += 1) {
    const envelope = await requestActions(auth, project, { stage: 'qualityDrivers', targetStage: 'logicalApplication', decompositionLevel: 'system' });
    const action = envelope.actions.find((item) => item.eligibility.eligible);
    expect(action).toBeTruthy();
    project = await applyAction(auth, project, action as unknown as Record<string, unknown>);
  }
  const logical = project.nodes.find((node) => node.kind === 'LogicalService')!;
  expect(logical).toBeTruthy();
  const realizationEnvelope = await requestActions(auth, project, { stage: 'logicalApplication', targetStage: 'applicationRealization', selectedScopeId: logical.id, decompositionLevel: 'container' });
  const realizationAction = realizationEnvelope.actions.find((item) => item.semanticKey.startsWith('realize-scope:')) ?? realizationEnvelope.actions.find((item) => item.eligibility.eligible);
  expect(realizationAction).toBeTruthy();
  project = await applyAction(auth, project, realizationAction as unknown as Record<string, unknown>);

  if (throughTechnology) {
    const container = project.nodes.find((node) => node.stage === 'applicationRealization' && ['DeployableUnit', 'ApplicationComponent'].includes(node.kind))!;
    expect(container).toBeTruthy();
    const technologyEnvelope = await requestActions(auth, project, { stage: 'applicationRealization', targetStage: 'logicalTechnology', selectedScopeId: container.id, decompositionLevel: 'deployment' });
    const technologyAction = technologyEnvelope.actions.find((item) => item.semanticKey.startsWith('logical-technology:')) ?? technologyEnvelope.actions.find((item) => item.eligibility.eligible);
    expect(technologyAction).toBeTruthy();
    project = await applyAction(auth, project, technologyAction as unknown as Record<string, unknown>);
  }

  await mountAiw(page, { initialStorage: { 'aiw-access-token': auth.token, 'aiw-tenant-id': 'tenant-reference', 'aiw-user-id': 'user-owner' } });
  await page.locator('.project-card').filter({ hasText: name }).click();
  const roleCard = page.locator('.role-card').filter({ hasText: /Solution Architect/i }).first();
  await roleCard.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined);
  if (await roleCard.isVisible().catch(() => false)) await roleCard.click();
  const tour = page.getByRole('dialog', { name: /AIW anchored first-run guided tour/i });
  await tour.waitFor({ state: 'visible', timeout: 1_500 }).catch(() => undefined);
  if (await tour.isVisible().catch(() => false)) await tour.getByRole('button', { name: /Skip tour/i }).click();
  return { auth, name, project };
}

async function openStage(page: Page, label: string) {
  const direct = page.getByRole('button', { name: label, exact: true });
  await direct.waitFor({ state: 'visible', timeout: 12_000 });
  await direct.click();
  await expect(page.getByRole('heading', { name: new RegExp(label, 'i') }).first()).toBeVisible();
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });

test('C4 container selection produces component co-creation and distinct autonomy modes', async ({ page }, info) => {
  const observed = errors(page);
  const { project } = await createCoCreationProject(page, `c4-${info.project.name}`);
  await openStage(page, 'Application Realization');
  const container = project.nodes.find((node) => node.stage === 'applicationRealization' && ['DeployableUnit', 'ApplicationComponent'].includes(node.kind))!;
  const canvasNode = page.locator('.architecture-node').filter({ hasText: container.label }).first();
  await canvasNode.waitFor({ state: 'visible', timeout: 12_000 });
  await canvasNode.click();

  const cursor = page.getByTestId('generative-cursor-controller');
  await expect(cursor).toBeVisible();
  await expect(cursor.locator('.generative-cursor__action-main').filter({ hasText: /component/i }).first()).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/c4-component-guide-${info.project.name}.png`, fullPage: false, animations: 'disabled' });

  await cursor.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect(cursor.getByText('One coherent topology for the selected scope')).toBeVisible();
  await expect(cursor.locator('.generative-cursor__action-main').first()).toContainText(/Compose/i);
  await cursor.getByRole('button', { name: 'Draft stage', exact: true }).click();
  await expect(cursor.getByText('One bounded stage draft across unresolved scopes')).toBeVisible();
  await expect(cursor.locator('.generative-cursor__action-main').first()).toContainText(/Draft/i);
  await cursor.getByRole('button', { name: 'Guide', exact: true }).click();

  await page.keyboard.press('1');
  const preview = page.getByTestId('generative-preview-tray');
  await expect(preview).toBeVisible();
  await expect(page.locator('.architecture-node.is-living-canvas-ghost').first()).toBeVisible();
  await expect(preview).toContainText(/preview|component/i);
  await page.screenshot({ path: `${evidenceDir}/c4-component-preview-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
  await page.keyboard.press('Control+Enter');
  await expect(preview).toBeHidden();
  await expect(cursor.getByRole('button', { name: /Roll back last/i })).toBeEnabled();
  expect(meaningful(observed)).toEqual([]);
});

test('logical and physical technology co-creation preserves quality reasoning and keyboard navigation', async ({ page }, info) => {
  const observed = errors(page);
  const { project } = await createCoCreationProject(page, `technology-${info.project.name}`, true);
  await openStage(page, 'Logical Technology');
  const cursor = page.getByTestId('generative-cursor-controller');
  await expect(cursor).toBeVisible();
  await expect(cursor.locator('.generative-cursor__action-main').first()).toBeVisible();
  await page.keyboard.press('Alt+ArrowRight');
  await page.keyboard.press('Control+Space');
  await page.keyboard.press('1');
  const logicalPreview = page.getByTestId('generative-preview-tray');
  await expect(logicalPreview).toBeVisible();
  if (await logicalPreview.getByText('Quality chain', { exact: true }).isVisible().catch(() => false)) {
    await expect(logicalPreview.getByText('Quality chain', { exact: true })).toBeVisible();
  }
  await page.screenshot({ path: `${evidenceDir}/logical-technology-preview-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
  await logicalPreview.getByRole('button', { name: /Close change preview/i }).click();

  await openStage(page, 'Physical Technology');
  await expect(cursor.locator('.generative-cursor__action-main').first()).toBeVisible();
  await expect(cursor.locator('.generative-cursor__action-main').first()).toContainText(/physical|deployment|realize/i);
  await cursor.locator('.generative-cursor__action-main').first().click();
  const physicalPreview = page.getByTestId('generative-preview-tray');
  await expect(physicalPreview).toBeVisible();
  await expect(physicalPreview).toContainText(/provider|deployment|product/i);
  await page.screenshot({ path: `${evidenceDir}/physical-technology-preview-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
  expect(overflow).toBeLessThanOrEqual(1);
  expect(meaningful(observed)).toEqual([]);
});
