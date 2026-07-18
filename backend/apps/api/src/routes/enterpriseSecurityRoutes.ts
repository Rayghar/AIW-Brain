import type { FastifyInstance, FastifyRequest } from 'fastify';
import { createHash } from 'node:crypto';
import { hasPermission, permissionMatrix } from '@aiw/engine';
import {
  actorName,
  buildEnterpriseSecurityPosture,
  buildReferencePerformanceChecks,
  defaultRolePermissions,
  enterpriseRoleIds,
  normalizeRoleAssignment,
  normalizeRoleMappingRule,
  normalizeTenantPolicy,
} from '@aiw/admin';
import { adminRepositories } from '../repositories/adminRepositories.js';
import { createSaasAdminPersistence } from '../saasAdminPersistence.js';

interface RuntimePrincipal { tenantId: string; subject: string; email?: string; roles?: string[]; authMode?: string }
export interface EnterpriseSecurityDeps { principalFor: (request: FastifyRequest) => RuntimePrincipal; version: string }

const actorOf = actorName;

function deny(principal: unknown, permission: string, roles: string[]) {
  adminRepositories.audit.push({ actor: actorOf(principal), action: 'rbac.denied', subject: permission, at: new Date().toISOString(), detail: `roles: ${roles.join(',') || 'none'}` });
  return { error: 'PERMISSION_DENIED', permission, roles };
}


function scopedTenant(principal: RuntimePrincipal, requestedTenantId?: string): { ok: true; tenantId: string } | { ok: false } {
  const tenantId = requestedTenantId?.trim() || principal.tenantId;
  if (tenantId !== principal.tenantId && !(principal.roles ?? []).includes('platform-admin')) return { ok: false };
  return { ok: true, tenantId };
}

function guard(request: FastifyRequest, permission: string, principalFor: EnterpriseSecurityDeps['principalFor']) {
  const principal = principalFor(request);
  const verdict = hasPermission(principal, permission);
  return { principal, verdict };
}

export async function enterpriseSecurityRoutes(app: FastifyInstance, deps: EnterpriseSecurityDeps): Promise<void> {
  const { principalFor, version } = deps;
  const saasPersistence = createSaasAdminPersistence(adminRepositories);

  app.get('/api/admin/security/roles', async (request, reply) => {
    const { principal, verdict } = guard(request, 'security.posture.read', principalFor);
    if (!verdict.ok) return reply.code(403).send(deny(principal, 'security.posture.read', verdict.roles));
    return {
      roles: enterpriseRoleIds,
      defaultRolePermissions,
      permissionMatrix: permissionMatrix(),
      assignments: [...adminRepositories.roleAssignments.values()].filter((assignment: { tenantId: string }) => assignment.tenantId === principal.tenantId || verdict.roles.includes('platform-admin')),
      mappingRules: [...adminRepositories.roleMappingRules.values()].filter((rule: { tenantId: string }) => rule.tenantId === principal.tenantId || verdict.roles.includes('platform-admin')),
      note: 'Production RBAC requires explicit OIDC/proxy/manual roles. There is no implicit platform-admin outside development auth.',
    };
  });

  app.post('/api/admin/security/role-assignments', async (request, reply) => {
    const { principal, verdict } = guard(request, 'security.role-admin', principalFor);
    if (!verdict.ok) return reply.code(403).send(deny(principal, 'security.role-admin', verdict.roles));
    const body = (request.body ?? {}) as { tenantId?: string };
    const scope = scopedTenant(principal, body.tenantId);
    if (!scope.ok) return reply.code(403).send({ error: 'TENANT_BOUNDARY_VIOLATION' });
    const assignmentVerdict = normalizeRoleAssignment(body as never, actorOf(principal), scope.tenantId);
    if (!assignmentVerdict.ok) return reply.code(400).send({ error: 'ROLE_ASSIGNMENT_INVALID', reasons: assignmentVerdict.reasons });
    const before = adminRepositories.roleAssignments.get(assignmentVerdict.assignment.assignmentId) ?? null;
    adminRepositories.roleAssignments.set(assignmentVerdict.assignment.assignmentId, assignmentVerdict.assignment);
    adminRepositories.audit.push({ actor: actorOf(principal), action: before ? 'security.role-assignment.updated' : 'security.role-assignment.created', subject: assignmentVerdict.assignment.subject, at: assignmentVerdict.assignment.updatedAt, detail: assignmentVerdict.assignment.roles.join(','), tenantId: assignmentVerdict.assignment.tenantId, before, after: assignmentVerdict.assignment });
    return { saved: true, assignment: assignmentVerdict.assignment };
  });

  app.post('/api/admin/security/role-mapping-rules', async (request, reply) => {
    const { principal, verdict } = guard(request, 'security.role-admin', principalFor);
    if (!verdict.ok) return reply.code(403).send(deny(principal, 'security.role-admin', verdict.roles));
    const body = (request.body ?? {}) as { tenantId?: string };
    const scope = scopedTenant(principal, body.tenantId);
    if (!scope.ok) return reply.code(403).send({ error: 'TENANT_BOUNDARY_VIOLATION' });
    const mappingVerdict = normalizeRoleMappingRule(body as never, actorOf(principal), scope.tenantId);
    if (!mappingVerdict.ok) return reply.code(400).send({ error: 'ROLE_MAPPING_RULE_INVALID', reasons: mappingVerdict.reasons });
    const before = adminRepositories.roleMappingRules.get(mappingVerdict.rule.ruleId) ?? null;
    await saasPersistence.saveRoleMappingRule(mappingVerdict.rule, scope.tenantId !== principal.tenantId);
    adminRepositories.roleMappingRules.set(mappingVerdict.rule.ruleId, mappingVerdict.rule);
    adminRepositories.audit.push({ actor: actorOf(principal), action: before ? 'security.role-mapping.updated' : 'security.role-mapping.created', subject: mappingVerdict.rule.ruleId, at: mappingVerdict.rule.updatedAt, detail: `${mappingVerdict.rule.claim}=${mappingVerdict.rule.match} -> ${mappingVerdict.rule.roles.join(',')}`, tenantId: mappingVerdict.rule.tenantId, before, after: mappingVerdict.rule });
    return { saved: true, rule: mappingVerdict.rule };
  });

  app.get('/api/admin/security/tenant-policies', async (request, reply) => {
    const { principal, verdict } = guard(request, 'security.posture.read', principalFor);
    if (!verdict.ok) return reply.code(403).send(deny(principal, 'security.posture.read', verdict.roles));
    return { policies: [...adminRepositories.tenantPolicies.values()].filter((policy: { tenantId: string }) => policy.tenantId === principal.tenantId || verdict.roles.includes('platform-admin')) };
  });

  app.post('/api/admin/security/tenant-policies', async (request, reply) => {
    const { principal, verdict } = guard(request, 'security.tenant-policy', principalFor);
    if (!verdict.ok) return reply.code(403).send(deny(principal, 'security.tenant-policy', verdict.roles));
    const body = (request.body ?? {}) as { tenantId?: string };
    const scope = scopedTenant(principal, body.tenantId);
    if (!scope.ok) return reply.code(403).send({ error: 'TENANT_BOUNDARY_VIOLATION' });
    const policyVerdict = normalizeTenantPolicy(body as never, actorOf(principal), scope.tenantId);
    if (!policyVerdict.ok) return reply.code(400).send({ error: 'TENANT_POLICY_INVALID', reasons: policyVerdict.reasons });
    const before = adminRepositories.tenantPolicies.get(policyVerdict.policy.tenantId) ?? null;
    adminRepositories.tenantPolicies.set(policyVerdict.policy.tenantId, policyVerdict.policy);
    adminRepositories.audit.push({ actor: actorOf(principal), action: before ? 'security.tenant-policy.updated' : 'security.tenant-policy.created', subject: policyVerdict.policy.tenantId, at: policyVerdict.policy.updatedAt, detail: `${policyVerdict.policy.mode}; sso=${policyVerdict.policy.requireSso}; devAuth=${policyVerdict.policy.allowDevelopmentAuth}`, tenantId: policyVerdict.policy.tenantId, before, after: policyVerdict.policy });
    return { saved: true, policy: policyVerdict.policy };
  });

  app.get('/api/admin/security/posture', async (request, reply) => {
    const { principal, verdict } = guard(request, 'security.posture.read', principalFor);
    if (!verdict.ok) return reply.code(403).send(deny(principal, 'security.posture.read', verdict.roles));
    const mode = process.env.AIW_DEPLOYMENT_MODE === 'production' ? 'production' : process.env.AIW_DEPLOYMENT_MODE === 'development' ? 'development' : 'pilot';
    const posture = buildEnterpriseSecurityPosture(adminRepositories, {
      mode,
      version,
      developmentAuthAllowed: process.env.AIW_ALLOW_DEV_AUTH !== 'false',
      oidcConfigured: Boolean(process.env.AIW_OIDC_ISSUER && process.env.AIW_OIDC_CLIENT_ID),
    });
    return {
      ...posture,
      principal: { subject: principal.subject, tenantId: principal.tenantId, roles: principal.roles ?? [], authMode: principal.authMode ?? 'unknown' },
    };
  });

  app.post('/api/admin/security/rls-acceptance', async (request, reply) => {
    const { principal, verdict } = guard(request, 'security.posture.read', principalFor);
    if (!verdict.ok) return reply.code(403).send(deny(principal, 'security.posture.read', verdict.roles));
    const receipt = await saasPersistence.runRlsIsolationAcceptance();
    const checks = receipt.checks.map((item) => ({ checkId: item.id, ok: item.ok, detail: item.detail }));
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'security.rls-acceptance-run', subject: principal.tenantId, at: new Date().toISOString(), detail: `${checks.filter((item) => item.ok).length}/${checks.length} checks ok on ${receipt.adapter}`, tenantId: principal.tenantId });
    return {
      generatedAt: new Date().toISOString(),
      tenantId: principal.tenantId,
      adapter: receipt.adapter,
      executed: receipt.executed,
      passed: receipt.passed,
      productionProof: false,
      checks,
      note: receipt.adapter === 'postgresql'
        ? 'Active database isolation checks executed. Production acceptance still requires the designated target environment and independent evidence.'
        : 'Reference isolation checks only. Execute against the designated PostgreSQL target before production.',
    };
  });

  app.get('/api/admin/audit/export/v2', async (request, reply) => {
    const { principal, verdict } = guard(request, 'audit.export', principalFor);
    if (!verdict.ok) return reply.code(403).send(deny(principal, 'audit.export', verdict.roles));
    const events = adminRepositories.audit.filter((event: { tenantId?: string }) => !event.tenantId || event.tenantId === principal.tenantId || verdict.roles.includes('platform-admin'));
    const rows = events.map((event: { at: string; actor: string; action: string; subject: string; detail: string; tenantId?: string }) => [event.at, event.tenantId ?? principal.tenantId, event.actor, event.action, event.subject, `"${String(event.detail).replaceAll('"', "'")}"`].join(','));
    const payload = ['at,tenantId,actor,action,subject,detail', ...rows].join('\n');
    const checksumSha256 = createHash('sha256').update(payload).digest('hex');
    const manifest = { exportId: `audit-export-${Date.now()}`, generatedAt: new Date().toISOString(), generatedBy: actorOf(principal), tenantId: principal.tenantId, format: 'csv', rowCount: events.length, checksumSha256, retentionWarning: 'Export is tenant-filtered and should be stored according to the tenant audit-retention policy.' };
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'audit.exported', subject: manifest.exportId, at: manifest.generatedAt, detail: `${manifest.rowCount} rows; sha256=${checksumSha256.slice(0, 12)}`, tenantId: principal.tenantId });
    reply.header('content-type', 'text/csv; charset=utf-8');
    reply.header('x-aiw-audit-export-manifest', Buffer.from(JSON.stringify(manifest)).toString('base64url'));
    return payload;
  });

  app.get('/api/admin/security/performance-checks', async (request, reply) => {
    const { principal, verdict } = guard(request, 'security.posture.read', principalFor);
    if (!verdict.ok) return reply.code(403).send(deny(principal, 'security.posture.read', verdict.roles));
    return {
      generatedAt: new Date().toISOString(),
      checks: buildReferencePerformanceChecks({ endpointCount: 230, adminRouteCount: 11, auditEvents: adminRepositories.audit.length, memoryStore: !process.env.DATABASE_URL }),
      note: 'Reference checks are release-gate heuristics; production load testing should run against the deployment profile in deploy/security/production-security-profile.md.',
    };
  });
}
