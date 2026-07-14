import type { FastifyInstance, FastifyRequest } from 'fastify';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hasPermission, validatePostureTransition, type SourcePosture } from '@aiw/engine';
import { actorName, normalizeKnowledgeSource, normalizeRepositoryConnector, buildAdminControlPlaneSnapshot } from '@aiw/admin';
import { adminRepositories } from '../repositories/adminRepositories.js';

export interface ControlPlaneDeps { principalFor: (request: FastifyRequest) => unknown; }
const actorOf = actorName;
const registryPath = fileURLToPath(new URL('../../../../data/trusted-architecture-sources.json', import.meta.url));
const bundledSources = (): unknown[] => { try { const parsed = JSON.parse(readFileSync(registryPath, 'utf8')); return Array.isArray(parsed) ? parsed : parsed.sources ?? []; } catch { return []; } };

function denyRead(reply: { code: (status: number) => { send: (payload: unknown) => unknown } }, principal: unknown, permission: string) {
  const guard = hasPermission(principal, permission);
  if (guard.ok) return null;
  adminRepositories.audit.push({ actor: actorOf(principal), action: 'rbac.denied', subject: permission, at: new Date().toISOString(), detail: `roles: ${guard.roles.join(',') || 'none'}` });
  return reply.code(403).send({ error: 'PERMISSION_DENIED', permission, roles: guard.roles });
}

export async function adminControlPlaneRoutes(app: FastifyInstance, deps: ControlPlaneDeps): Promise<void> {
  const { principalFor } = deps;

  app.get('/api/admin/control-plane/snapshot', async (request, reply) => {
    const principal = principalFor(request);
    const denied = denyRead(reply, principal, 'admin.control-plane.read');
    if (denied) return denied;
    return buildAdminControlPlaneSnapshot(adminRepositories);
  });

  // ---- Knowledge Source registry (bundled + session-registered overlay) ----
  app.get('/api/admin/knowledge-sources', async (request, reply) => {
    const principal = principalFor(request);
    const denied = denyRead(reply, principal, 'knowledge.read');
    if (denied) return denied;
    return { bundled: bundledSources(), registered: [...adminRepositories.knowledgeSources.values()] };
  });

  app.post('/api/admin/knowledge-sources', async (request, reply) => {
    const rbacPrincipal = principalFor(request);
    const rbacGuard = hasPermission(rbacPrincipal, 'source.register');
    if (!rbacGuard.ok) {
      adminRepositories.audit.push({ actor: actorOf(rbacPrincipal), action: 'rbac.denied', subject: 'source.register', at: new Date().toISOString(), detail: `roles: ${rbacGuard.roles.join(',') || 'none'}` });
      return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'source.register', roles: rbacGuard.roles });
    }
    const principal = principalFor(request);
    const verdict = normalizeKnowledgeSource((request.body ?? {}) as never, actorOf(principal));
    if (!verdict.ok) return reply.code(400).send({ error: 'SOURCE_INVALID', reasons: verdict.reasons });
    const source = verdict.source;
    adminRepositories.knowledgeSources.set(source.id, source);
    adminRepositories.audit.push({ actor: source.registeredBy ?? actorOf(principal), action: 'source.registered', subject: source.id, at: source.registeredAt ?? new Date().toISOString(), detail: `${source.sourceType} @ ${source.posture} posture` });
    return { registered: true, source, note: 'Every source enters at discovery. Climb via posture transitions; approval demands licence + review owner.' };
  });

  app.post('/api/admin/knowledge-sources/:sourceId/posture', async (request, reply) => {
    const rbacPrincipal = principalFor(request);
    const rbacGuard = hasPermission(rbacPrincipal, 'source.posture');
    if (!rbacGuard.ok) {
      adminRepositories.audit.push({ actor: actorOf(rbacPrincipal), action: 'rbac.denied', subject: 'source.posture', at: new Date().toISOString(), detail: `roles: ${rbacGuard.roles.join(',') || 'none'}` });
      return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'source.posture', roles: rbacGuard.roles });
    }
    const principal = principalFor(request);
    const sourceId = (request.params as { sourceId: string }).sourceId;
    const source = adminRepositories.knowledgeSources.get(sourceId);
    if (!source) return reply.code(404).send({ error: 'SOURCE_NOT_FOUND', note: 'bundled sources are governed via the data registry + release pipeline' });
    const body = (request.body ?? {}) as { target?: string };
    const actor = actorOf(principal);
    const verdict = validatePostureTransition(source as never, body.target as SourcePosture, actor);
    if (!verdict.valid) return reply.code(409).send({ error: 'TRANSITION_REFUSED', reasons: verdict.reasons });
    const before = source.posture;
    source.posture = body.target as SourcePosture;
    adminRepositories.audit.push({ actor, action: 'source.posture-changed', subject: sourceId, at: new Date().toISOString(), detail: `${before} → ${source.posture}` });
    return { changed: true, source };
  });

  // ---- Repository Connector registry ----
  app.get('/api/admin/repository-connectors', async (request, reply) => {
    const principal = principalFor(request);
    const denied = denyRead(reply, principal, 'repository.read');
    if (denied) return denied;
    return { connectors: [...adminRepositories.repositoryConnectors.values()] };
  });

  app.post('/api/admin/repository-connectors', async (request, reply) => {
    const rbacPrincipal = principalFor(request);
    const rbacGuard = hasPermission(rbacPrincipal, 'connector.register');
    if (!rbacGuard.ok) {
      adminRepositories.audit.push({ actor: actorOf(rbacPrincipal), action: 'rbac.denied', subject: 'connector.register', at: new Date().toISOString(), detail: `roles: ${rbacGuard.roles.join(',') || 'none'}` });
      return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'connector.register', roles: rbacGuard.roles });
    }
    const principal = principalFor(request);
    const verdict = normalizeRepositoryConnector((request.body ?? {}) as never, actorOf(principal));
    if (!verdict.ok) return reply.code(400).send({ error: 'CONNECTOR_INVALID', reasons: verdict.reasons });
    const connector = verdict.connector;
    adminRepositories.repositoryConnectors.set(connector.id, connector);
    adminRepositories.audit.push({ actor: connector.registeredBy ?? actorOf(principal), action: 'connector.registered', subject: connector.id, at: connector.registeredAt ?? new Date().toISOString(), detail: `${connector.provider} read-only; PR requires approval` });
    return { registered: true, connector };
  });

  app.post('/api/admin/repository-connectors/:id/test', async (request, reply) => {
    const principal = principalFor(request);
    const connector = adminRepositories.repositoryConnectors.get((request.params as { id: string }).id) as { id: string; repositoryUrl: string } | undefined;
    if (!connector) return reply.code(404).send({ error: 'CONNECTOR_NOT_FOUND' });
    // Honest offline-capable test: config validity + credential presence; the
    // live scan runs in the target environment via the refresh worker.
    const urlOk = /^https:\/\/(github\.com|gitlab\.com|dev\.azure\.com|bitbucket\.org)\//.test(connector.repositoryUrl);
    const tokenPresent = Boolean(process.env.AIW_GITHUB_TOKEN);
    const meshEnabled = process.env.AIW_ENABLE_GITHUB_KNOWLEDGE === 'true';
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'repository-connector.tested', subject: connector.id, at: new Date().toISOString(), detail: `urlOk=${urlOk} token=${tokenPresent} mesh=${meshEnabled}` });
    return {
      configValid: urlOk, credentialPresent: tokenPresent, meshEnabled,
      liveScan: meshEnabled && tokenPresent ? 'run knowledge-refresh-worker for a live read-only scan' : 'blocked: enable AIW_ENABLE_GITHUB_KNOWLEDGE and provide AIW_GITHUB_TOKEN in the target environment',
    };
  });

  // ---- Tenant settings + feature flags ----
  app.get('/api/admin/tenant-settings', async (request, reply) => {
    const principal = principalFor(request);
    const denied = denyRead(reply, principal, 'tenant.read');
    if (denied) return denied;
    return { settings: Object.fromEntries(adminRepositories.tenantSettings), flags: Object.fromEntries(adminRepositories.featureFlags) };
  });

  app.post('/api/admin/tenant-settings', async (request, reply) => {
    const rbacPrincipal = principalFor(request);
    const rbacGuard = hasPermission(rbacPrincipal, 'tenant.settings');
    if (!rbacGuard.ok) {
      adminRepositories.audit.push({ actor: actorOf(rbacPrincipal), action: 'rbac.denied', subject: 'tenant.settings', at: new Date().toISOString(), detail: `roles: ${rbacGuard.roles.join(',') || 'none'}` });
      return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'tenant.settings', roles: rbacGuard.roles });
    }
    const principal = principalFor(request);
    const body = (request.body ?? {}) as { key?: string; value?: unknown };
    if (!body.key?.trim()) return reply.code(400).send({ error: 'KEY_REQUIRED' });
    const actor = actorOf(principal);
    const before = adminRepositories.tenantSettings.get(body.key);
    adminRepositories.tenantSettings.set(body.key, body.value);
    adminRepositories.audit.push({ actor, action: 'tenant-setting.changed', subject: body.key, at: new Date().toISOString(), detail: `${JSON.stringify(before)} → ${JSON.stringify(body.value)}`.slice(0, 180) });
    return { saved: true };
  });

  app.post('/api/admin/feature-flags', async (request, reply) => {
    const rbacPrincipal = principalFor(request);
    const rbacGuard = hasPermission(rbacPrincipal, 'feature-flags.write');
    if (!rbacGuard.ok) {
      adminRepositories.audit.push({ actor: actorOf(rbacPrincipal), action: 'rbac.denied', subject: 'feature-flags.write', at: new Date().toISOString(), detail: `roles: ${rbacGuard.roles.join(',') || 'none'}` });
      return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'feature-flags.write', roles: rbacGuard.roles });
    }
    const principal = principalFor(request);
    const body = (request.body ?? {}) as { flag?: string; enabled?: boolean };
    if (!body.flag?.trim() || typeof body.enabled !== 'boolean') return reply.code(400).send({ error: 'FLAG_INVALID' });
    const actor = actorOf(principal);
    adminRepositories.featureFlags.set(body.flag, body.enabled);
    adminRepositories.audit.push({ actor, action: 'feature-flag.changed', subject: body.flag, at: new Date().toISOString(), detail: String(body.enabled) });
    return { saved: true };
  });
}
