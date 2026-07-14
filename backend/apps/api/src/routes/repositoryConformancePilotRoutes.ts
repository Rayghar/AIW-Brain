import type { FastifyInstance, FastifyRequest } from 'fastify';
import { hasPermission } from '@aiw/engine';
import { actorName } from '@aiw/admin';
import {
  createCiFitnessLoopPlan,
  createReadOnlyRepositoryPilotScan,
  createRuntimeEvidenceIngestionPlan,
  generateConformanceControlsFromCoverage,
  type RepositoryOnboardingInput,
} from '@aiw/integrations';
import { adminRepositories } from '../repositories/adminRepositories.js';
import { repositoryConformancePilotRepository } from '../repositories/repositoryConformancePilotRepository.js';

export interface RepositoryConformancePilotDeps { principalFor: (request: FastifyRequest) => unknown; }
const actorOf = actorName;

function guard(request: FastifyRequest, permission: string, principalFor: RepositoryConformancePilotDeps['principalFor']) {
  const principal = principalFor(request);
  const verdict = hasPermission(principal, permission);
  if (!verdict.ok) {
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'rbac.denied', subject: permission, at: new Date().toISOString(), detail: `roles: ${verdict.roles.join(',') || 'none'}` });
  }
  return { principal, verdict };
}

function connectorInput(connectorId: string): RepositoryOnboardingInput | undefined {
  const connector = adminRepositories.repositoryConnectors.get(connectorId);
  if (!connector) return undefined;
  return {
    connectorId: connector.id,
    provider: String(connector.provider),
    repositoryUrl: connector.repositoryUrl,
    defaultBranch: connector.defaultBranch,
    allowedPaths: connector.allowedPaths,
    evidenceKinds: connector.evidenceKinds.map(String),
    writeEnabled: connector.writeEnabled,
    prRequiresApproval: connector.prRequiresApproval,
    architectureMutationRequiresApproval: connector.architectureMutationRequiresApproval,
  };
}

export async function repositoryConformancePilotRoutes(app: FastifyInstance, deps: RepositoryConformancePilotDeps): Promise<void> {
  const { principalFor } = deps;

  app.get('/api/admin/repository-conformance/pilot', async (request, reply) => {
    const { verdict } = guard(request, 'repository.read', principalFor);
    if (!verdict.ok) return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'repository.read', roles: verdict.roles });
    const connectors = [...adminRepositories.repositoryConnectors.values()];
    return {
      connectors,
      ...repositoryConformancePilotRepository.snapshot(),
      doctrine: {
        scanMode: 'read-only evidence onboarding',
        repositoryWrites: 'disabled-by-default',
        prCreation: 'preview-only-requires-explicit-approval',
        architectureMutation: 'human-approval-required',
        runtimeEvidence: 'evidence-only-no-architecture-mutation',
      },
    };
  });

  app.post('/api/admin/repository-conformance/connectors/:connectorId/scan', async (request, reply) => {
    const { principal, verdict } = guard(request, 'connector.scan', principalFor);
    if (!verdict.ok) return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'connector.scan', roles: verdict.roles });
    const connectorId = (request.params as { connectorId: string }).connectorId;
    const input = connectorInput(connectorId);
    if (!input) return reply.code(404).send({ error: 'CONNECTOR_NOT_FOUND' });
    const scan = createReadOnlyRepositoryPilotScan(input);
    repositoryConformancePilotRepository.saveScan(scan);
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'repository-conformance.scan', subject: connectorId, at: new Date().toISOString(), detail: `${scan.coverage.coverageScore}% coverage; ${scan.controls.length} controls seeded; read-only` });
    return { scan };
  });

  app.post('/api/admin/repository-conformance/connectors/:connectorId/generate-controls', async (request, reply) => {
    const { principal, verdict } = guard(request, 'conformance.generate', principalFor);
    if (!verdict.ok) return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'conformance.generate', roles: verdict.roles });
    const connectorId = (request.params as { connectorId: string }).connectorId;
    const input = connectorInput(connectorId);
    if (!input) return reply.code(404).send({ error: 'CONNECTOR_NOT_FOUND' });
    const scan = createReadOnlyRepositoryPilotScan(input);
    const controls = generateConformanceControlsFromCoverage(scan.coverage);
    repositoryConformancePilotRepository.saveScan({ ...scan, controls });
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'repository-conformance.controls-generated', subject: connectorId, at: new Date().toISOString(), detail: `${controls.length} conformance controls generated from repository evidence; human approval required` });
    return { controls, scanId: scan.scanId, humanApprovalRequired: true };
  });

  app.post('/api/admin/repository-conformance/connectors/:connectorId/fitness-loop', async (request, reply) => {
    const { principal, verdict } = guard(request, 'fitness-loop.generate', principalFor);
    if (!verdict.ok) return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'fitness-loop.generate', roles: verdict.roles });
    const connectorId = (request.params as { connectorId: string }).connectorId;
    const input = connectorInput(connectorId);
    if (!input) return reply.code(404).send({ error: 'CONNECTOR_NOT_FOUND' });
    const scan = createReadOnlyRepositoryPilotScan(input);
    const plan = createCiFitnessLoopPlan(input, scan.controls);
    repositoryConformancePilotRepository.saveFitnessLoop(plan);
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'repository-conformance.fitness-loop-generated', subject: connectorId, at: new Date().toISOString(), detail: `${plan.proposedChecks.length} CI fitness-loop checks proposed; PR creation preview only` });
    return { plan };
  });

  app.post('/api/admin/repository-conformance/connectors/:connectorId/runtime-ingestion', async (request, reply) => {
    const { principal, verdict } = guard(request, 'runtime-evidence.plan', principalFor);
    if (!verdict.ok) return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'runtime-evidence.plan', roles: verdict.roles });
    const connectorId = (request.params as { connectorId: string }).connectorId;
    const input = connectorInput(connectorId);
    if (!input) return reply.code(404).send({ error: 'CONNECTOR_NOT_FOUND' });
    const plan = createRuntimeEvidenceIngestionPlan(input);
    repositoryConformancePilotRepository.saveRuntimePlan(plan);
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'repository-conformance.runtime-plan-generated', subject: connectorId, at: new Date().toISOString(), detail: `${plan.sources.length} runtime evidence sources mapped; evidence-only` });
    return { plan };
  });
}
