import { buildApp } from '../apps/api/dist/app.js';
import { InMemoryProjectRepository } from '../apps/api/dist/repository.js';
import { sampleProject } from '../packages/domain/dist/index.js';
import packageJson from '../package.json' with { type: 'json' };

const app = await buildApp({ repository: new InMemoryProjectRepository(), logger: false });
try {
  const headers = { 'x-aiw-tenant-id': sampleProject.tenantId, 'x-aiw-user-id': 'user-owner' };
  const health = await app.inject({ method: 'GET', url: '/health' });
  if (health.statusCode !== 200 || health.json().version !== packageJson.version) throw new Error('Health check failed');
  const ready = await app.inject({ method: 'GET', url: '/ready' });
  if (ready.statusCode !== 200) throw new Error('Readiness check failed');
  const posture = await app.inject({ method: 'GET', url: `/api/security/posture/${sampleProject.id}/${sampleProject.branch.id}`, headers });
  if (posture.statusCode !== 200) throw new Error(`Security posture failed: ${posture.body}`);
  const presence = await app.inject({ method: 'POST', url: '/api/presence/heartbeat', headers, payload: { connectionId: 'e2e-connection', branchId: sampleProject.branch.id, stage: sampleProject.activeStage } });
  if (presence.statusCode !== 200) throw new Error('Presence heartbeat failed');
  const inventory = await app.inject({ method: 'POST', url: '/api/runtime-inventories/import', headers, payload: { project: sampleProject, name: 'E2E inventory', sourceType: 'manual', raw: { resources: [{ id: 'actual-order', externalId: 'actual-order', resourceType: 'Deployment', name: 'Order API', labels: { 'aiw.node-id': 'deployable-order-api' }, properties: { runtime: 'Node.js' } }], relationships: [] } } });
  if (inventory.statusCode !== 200) throw new Error(`Runtime inventory import failed: ${inventory.body}`);
  const drift = await app.inject({ method: 'POST', url: '/api/drift/analyse', headers, payload: { project: sampleProject, inventory: inventory.json() } });
  if (drift.statusCode !== 200) throw new Error(`Drift analysis failed: ${drift.body}`);
  const metrics = await app.inject({ method: 'GET', url: '/metrics' });
  if (!metrics.body.includes('aiw_http_requests_total')) throw new Error('Metrics endpoint failed');
  console.log(JSON.stringify({ health: health.json(), readiness: ready.json(), securityFindings: posture.json().findings.length, presence: presence.json(), driftSummary: drift.json().summary }, null, 2));
} finally { await app.close(); }
