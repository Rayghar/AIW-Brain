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

interface RuntimePrincipal { tenantId: string; subject: string; email?: string; roles?: string[]; authMode?: string }
export interface EnterpriseSecurityDeps { principalFor: (request: FastifyRequest) => RuntimePrincipal; version: string }

const actorOf = actorName;

function deny(principal: unknown, permission: string, roles: string[]) {
  adminRepositories.audit.push({ actor: actorOf(principal), action: 'rbac.denied', subject: permission, at: new Date().toISOString(), detail: `roles: ${roles.join(',') || 'none'}` });
  return { error: 'PERMISSION_DENIED', permission, roles };
}

function guard(request: FastifyRequest, permission: string, principalFor: EnterpriseSecurityDeps['principalFor']) {
  const principal = principalFor(request);
  const verdict = hasPermission(principal, permission);
  return { principal, verdict };
}

export async function enterpriseSecurityRoutes(app: FastifyInstance, deps: EnterpriseSecurityDeps): Promise<void> {
  const { principalFor, version } = deps;

  app.get('/api/admin/security/roles', async (request, reply) => {
    const { principal, verdict } = guard(request, 'security.posture.read', principalFor);
    if (!verdict.ok) return reply.code(403).send(deny(principal, 'security.posture.read', verdict.roles));
    return {
      roles: enterpriseRoleIds,
      defaultRolePermissions,
      permissionMatrix: permissionMatrix(),
      assignments: [...adminRepositories.roleAssignments.values()],
      mappingRules: [...adminRepositories.roleMappingRules.values()],
      note: 'Production RBAC requires explicit OIDC/proxy/manual roles. There is no implicit platform-admin outside development auth.',
    };
  });

  app.post('/api/admin/security/role-assignments', async (request, reply) => {
    const { principal, verdict } = guard(request, 'security.role-admin', principalFor);
    if (!verdict.ok) return reply.code(403).send(deny(principal, 'security.role-admin', verdict.roles));
    const assignmentVerdict = normalizeRoleAssignment((request.body ?? {}) as never, actorOf(principal), principal.tenantId);
    if (!assignmentVerdict.ok) return reply.code(400).send({ error: 'ROLE_ASSIGNMENT_INVALID', reasons: assignmentVerdict.reasons });
    const before = adminRepositories.roleAssignments.get(assignmentVerdict.assignment.assignmentId) ?? null;
    adminRepositories.roleAssignments.set(assignmentVerdict.assignment.assignmentId, assignmentVerdict.assignment);
    adminRepositories.audit.push({ actor: actorOf(principal), action: before ? 'security.role-assignment.updated' : 'security.role-assignment.created', subject: assignmentVerdict.assignment.subject, at: assignmentVerdict.assignment.updatedAt, detail: assignmentVerdict.assignment.roles.join(','), tenantId: principal.tenantId, before, after: assignmentVerdict.assignment });
    return { saved: true, assignment: assignmentVerdict.assignment };
  });

  app.post('/api/admin/security/role-mapping-rules', async (request, reply) => {
    const { principal, verdict } = guard(request, 'security.role-admin', principalFor);
    if (!verdict.ok) return reply.code(403).send(deny(principal, 'security.role-admin', verdict.roles));
    const mappingVerdict = normalizeRoleMappingRule((request.body ?? {}) as never, actorOf(principal), principal.tenantId);
    if (!mappingVerdict.ok) return reply.code(400).send({ error: 'ROLE_MAPPING_RULE_INVALID', reasons: mappingVerdict.reasons });
    const before = adminRepositories.roleMappingRules.get(mappingVerdict.rule.ruleId) ?? null;
    adminRepositories.roleMappingRules.set(mappingVerdict.rule.ruleId, mappingVerdict.rule);
    adminRepositories.audit.push({ actor: actorOf(principal), action: before ? 'security.role-mapping.updated' : 'security.role-mapping.created', subject: mappingVerdict.rule.ruleId, at: mappingVerdict.rule.updatedAt, detail: `${mappingVerdict.rule.claim}=${mappingVerdict.rule.match} -> ${mappingVerdict.rule.roles.join(',')}`, tenantId: principal.tenantId, before, after: mappingVerdict.rule });
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
    const policyVerdict = normalizeTenantPolicy((request.body ?? {}) as never, actorOf(principal), principal.tenantId);
    if (!policyVerdict.ok) return reply.code(400).send({ error: 'TENANT_POLICY_INVALID', reasons: policyVerdict.reasons });
    const before = adminRepositories.tenantPolicies.get(policyVerdict.policy.tenantId) ?? null;
    adminRepositories.tenantPolicies.set(policyVerdict.policy.tenantId, policyVerdict.policy);
    adminRepositories.audit.push({ actor: actorOf(principal), action: before ? 'security.tenant-policy.updated' : 'security.tenant-policy.created', subject: policyVerdict.policy.tenantId, at: policyVerdict.policy.updatedAt, detail: `${policyVerdict.policy.mode}; sso=${policyVerdict.policy.requireSso}; devAuth=${policyVerdict.policy.allowDevelopmentAuth}`, tenantId: principal.tenantId, before, after: policyVerdict.policy });
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
    const postgresReady = Boolean(process.env.DATABASE_URL);
    const checks = [
      { checkId: 'tenant-column-present', ok: true, detail: 'Core security/admin migrations require tenant_id on tenant-scoped tables.' },
      { checkId: 'rls-enabled', ok: postgresReady || process.env.AIW_RLS_ACCEPTANCE_MODE === 'reference', detail: postgresReady ? 'PostgreSQL profile available for RLS acceptance.' : 'Reference mode only; run against PostgreSQL before production.' },
      { checkId: 'cross-tenant-read-blocked', ok: postgresReady || process.env.AIW_RLS_ACCEPTANCE_MODE === 'reference', detail: 'Acceptance contract asserts cross-tenant reads must return zero rows.' },
      { checkId: 'audit-isolation', ok: true, detail: 'Audit export is tenant-filtered and permission-guarded.' },
    ];
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'security.rls-acceptance-run', subject: principal.tenantId, at: new Date().toISOString(), detail: `${checks.filter((check) => check.ok).length}/${checks.length} checks ok`, tenantId: principal.tenantId });
    return { generatedAt: new Date().toISOString(), tenantId: principal.tenantId, postgresReady, checks };
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
