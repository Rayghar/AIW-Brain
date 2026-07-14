import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.68/screenshots';
type Auth = { token: string };
type Project = { id: string; tenantId: string; revision: number; activeStage: string; branch: { id: string }; nodes: Array<{ id: string; label: string; kind: string; stage: string }> };

function observe(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', (request) => errors.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`));
  return errors;
}
function meaningful(errors: string[]) { return errors.filter((value) => !/favicon|React DevTools|ResizeObserver loop|ERR_ABORTED|telemetry/i.test(value)); }
async function auth(): Promise<Auth> {
  const response = await fetch('http://127.0.0.1:4100/api/auth/development-token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subject: 'user-owner', email: 'architect@example.com', displayName: 'Architecture Owner', tenantId: 'tenant-reference', ttlMinutes: 120 }) });
  expect(response.ok).toBeTruthy(); return response.json() as Promise<Auth>;
}
function headers(session: Auth) { return { 'content-type': 'application/json', authorization: `Bearer ${session.token}`, 'x-aiw-tenant-id': 'tenant-reference', 'x-aiw-user-id': 'user-owner' }; }
async function actions(session: Auth, project: Project, stage: string, targetStage: string, selectedScopeId?: string) {
  const response = await fetch(`http://127.0.0.1:4100/api/projects/${project.id}/branches/${project.branch.id}/living-canvas/actions`, { method: 'POST', headers: headers(session), body: JSON.stringify({ event: { id: `rc1068-${Date.now()}`, kind: 'candidate-requested', occurredAt: new Date().toISOString(), tenantId: project.tenantId, projectId: project.id, branchId: project.branch.id, revision: project.revision, actorId: 'user-owner', actorRole: 'solution-architect', stage, targetStage, ...(selectedScopeId ? { selectedScopeId, subjectIds: [selectedScopeId] } : {}), decompositionLevel: targetStage === 'applicationRealization' ? 'container' : 'system', autonomyMode: 'guide' } }) });
  expect(response.ok).toBeTruthy(); return response.json() as Promise<{ actions: Array<Record<string, any>> }>;
}
async function apply(session: Auth, project: Project, action: Record<string, any>): Promise<Project> {
  const response = await fetch(`http://127.0.0.1:4100/api/projects/${project.id}/branches/${project.branch.id}/living-canvas/apply`, { method: 'POST', headers: { ...headers(session), 'idempotency-key': `rc1068-${project.revision}-${Date.now()}` }, body: JSON.stringify({ action, expectedRevision: project.revision, rationale: 'Prepare governed LLM co-creation acceptance.' }) });
  expect(response.ok).toBeTruthy(); return (await response.json() as { project: Project }).project;
}
async function createProject(page: Page) {
  const session = await auth();
  const name = `Governed Co-Creation ${Date.now()}`;
  const created = await fetch('http://127.0.0.1:4100/api/projects', { method: 'POST', headers: headers(session), body: JSON.stringify({ name, template: 'microservice', description: 'Customers use a secure, resilient and auditable digital payment service with external settlement integrations.' }) });
  expect(created.ok).toBeTruthy(); let project = await created.json() as Project;
  for (let i = 0; i < 10 && !project.nodes.some((node) => node.kind === 'LogicalService'); i += 1) {
    const envelope = await actions(session, project, 'qualityDrivers', 'logicalApplication');
    const action = envelope.actions.find((item) => item.eligibility?.eligible); expect(action).toBeTruthy(); project = await apply(session, project, action!);
  }
  const logical = project.nodes.find((node) => node.kind === 'LogicalService')!;
  const realization = await actions(session, project, 'logicalApplication', 'applicationRealization', logical.id);
  const candidate = realization.actions.find((item) => String(item.semanticKey).startsWith('realize-scope:')) ?? realization.actions.find((item) => item.eligibility?.eligible);
  project = await apply(session, project, candidate!);
  await mountAiw(page, { initialStorage: { 'aiw-access-token': session.token, 'aiw-tenant-id': 'tenant-reference', 'aiw-user-id': 'user-owner' } });
  await page.locator('.project-card').filter({ hasText: name }).click();
  const role = page.locator('.role-card').filter({ hasText: /Solution Architect/i }).first();
  await role.waitFor({ state: 'visible', timeout: 6_000 }).catch(() => undefined); if (await role.isVisible().catch(() => false)) await role.click();
  const tour = page.getByRole('dialog'); if (await tour.isVisible().catch(() => false)) { const close = tour.getByRole('button', { name: /skip|close|not now/i }).first(); if (await close.isVisible().catch(() => false)) await close.click(); }
  return { session, project };
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });

test('governed co-creation falls back safely without surrendering model authority', async ({ page }, info) => {
  const errors = observe(page);
  const { session, project } = await createProject(page);
  await page.getByRole('button', { name: 'Application Realization', exact: true }).click();
  const cursor = page.getByTestId('generative-cursor-controller'); await expect(cursor).toBeVisible();
  const assistResponsePromise = page.waitForResponse((response) => response.url().includes('/living-canvas/actions') && response.request().method() === 'POST' && (response.request().postData() ?? '').includes('hybrid'));
  await cursor.getByRole('button', { name: 'Ask Sol', exact: true }).click();
  const assistResponse = await assistResponsePromise;
  expect(assistResponse.status()).toBe(200);
  const assisted = await assistResponse.json() as { assistance?: { mode?: string; notice?: string } };
  expect(['llm-assisted', 'deterministic-fallback', 'deterministic']).toContain(assisted.assistance?.mode);
  await expect(page.locator('body')).toContainText(/deterministic guidance remains active|deterministic design guidance remains active|Sol assembled|Sol refined|Governed co-creation guidance refreshed/i, { timeout: 20_000 });
  await expect(cursor).toContainText(/Deterministic fallback active|cannot write directly to the canonical model|Eligibility, policy, mutation and validation remain deterministic/i);
  await page.screenshot({ path: `${evidenceDir}/01-governed-cursor-${info.project.name}.png`, fullPage: false, animations: 'disabled' });

  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
  expect(overflow).toBeLessThanOrEqual(1);
  expect(meaningful(errors)).toEqual([]);
});
