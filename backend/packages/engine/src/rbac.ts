// Enterprise RBAC executable core. Roles must be explicit on the principal.
// Development fallback roles are attached by the API only when dev-auth is
// explicitly enabled; production mode never infers platform-admin.

export const ROLES = ['platform-admin', 'solution-architect', 'platform-architect', 'knowledge-admin', 'knowledge-curator', 'architecture-reviewer', 'security-reviewer', 'compliance-reviewer', 'enterprise-architect', 'model-admin', 'repository-admin', 'security-admin', 'auditor'] as const;
export type Role = typeof ROLES[number];

const MATRIX: Record<string, Role[]> = {
  'review.run': ['platform-admin', 'solution-architect', 'platform-architect', 'enterprise-architect', 'architecture-reviewer'],
  'review.disposition': ['platform-admin', 'enterprise-architect', 'architecture-reviewer'],
  'artifact.generate': ['platform-admin', 'solution-architect'],
  'architecture.write': ['platform-admin', 'solution-architect', 'platform-architect'],
  'admin.control-plane.read': ['platform-admin', 'auditor'],
  'saas.read': ['platform-admin', 'security-admin', 'auditor'],
  'saas.organisation.write': ['platform-admin'],
  'saas.subscription.write': ['platform-admin'],
  'saas.usage.read': ['platform-admin', 'auditor'],
  'saas.usage.write': ['platform-admin'],
  'saas.budget.write': ['platform-admin'],
  'saas.identity.read': ['platform-admin', 'security-admin', 'auditor'],
  'saas.identity.write': ['platform-admin', 'security-admin'],
  'saas.identity.test': ['platform-admin', 'security-admin'],
  'saas.billing.ingest': ['platform-admin'],
  'saas.operations.read': ['platform-admin', 'security-admin', 'auditor'],
  'saas.operations.execute': ['platform-admin'],
  'knowledge.read': ['platform-admin', 'knowledge-admin', 'knowledge-curator', 'enterprise-architect'],
  'release.read': ['platform-admin', 'knowledge-admin', 'knowledge-curator', 'enterprise-architect'],
  'repository.read': ['platform-admin', 'repository-admin', 'enterprise-architect', 'platform-architect', 'architecture-reviewer'],
  'tenant.read': ['platform-admin', 'security-admin', 'auditor'],
  'model-route.read': ['platform-admin', 'model-admin', 'auditor'],
  'claims.decide': ['platform-admin', 'knowledge-admin', 'knowledge-curator', 'architecture-reviewer', 'security-reviewer', 'compliance-reviewer'],
  'claims.assign': ['platform-admin', 'knowledge-admin', 'knowledge-curator'],
  'knowledge-ops.comment': ['platform-admin', 'knowledge-admin', 'knowledge-curator', 'architecture-reviewer', 'security-reviewer', 'compliance-reviewer'],
  'knowledge-ops.escalate': ['platform-admin', 'knowledge-admin', 'knowledge-curator', 'architecture-reviewer', 'security-reviewer', 'compliance-reviewer'],
  'contradictions.triage': ['platform-admin', 'knowledge-admin', 'knowledge-curator', 'architecture-reviewer'],
  'source.refresh': ['platform-admin', 'knowledge-admin', 'knowledge-curator'],
  'duplicates.resolve': ['platform-admin', 'knowledge-admin', 'knowledge-curator'],
  'synonyms.resolve': ['platform-admin', 'knowledge-admin', 'knowledge-curator'],
  'corroboration.analyse': ['platform-admin', 'knowledge-admin', 'knowledge-curator', 'architecture-reviewer'],
  'release.candidate': ['platform-admin', 'knowledge-admin', 'knowledge-curator', 'enterprise-architect'],
  'release.promote': ['platform-admin', 'knowledge-admin'],
  'release.rollback': ['platform-admin', 'knowledge-admin'],
  'release.pin': ['platform-admin', 'knowledge-admin', 'enterprise-architect'],
  'calibration.ratify': ['platform-admin', 'enterprise-architect'],
  'pattern-dna.stage': ['platform-admin', 'knowledge-admin', 'knowledge-curator'],
  'source.register': ['platform-admin', 'knowledge-admin'],
  'source.posture': ['platform-admin', 'knowledge-admin'],
  'connector.register': ['platform-admin', 'repository-admin'],
  'connector.test': ['platform-admin', 'repository-admin'],
  'connector.scan': ['platform-admin', 'repository-admin', 'enterprise-architect', 'platform-architect'],
  'conformance.generate': ['platform-admin', 'repository-admin', 'enterprise-architect', 'platform-architect', 'architecture-reviewer'],
  'fitness-loop.generate': ['platform-admin', 'repository-admin', 'enterprise-architect', 'platform-architect'],
  'runtime-evidence.plan': ['platform-admin', 'repository-admin', 'enterprise-architect', 'platform-architect', 'architecture-reviewer'],
  'model-route.write': ['platform-admin', 'model-admin'],
  'model-route.test': ['platform-admin', 'model-admin'],
  'tenant.settings': ['platform-admin', 'security-admin'],
  'feature-flags.write': ['platform-admin', 'security-admin'],
  'security.role-admin': ['platform-admin', 'security-admin'],
  'security.tenant-policy': ['platform-admin', 'security-admin'],
  'security.posture.read': ['platform-admin', 'security-admin', 'auditor', 'compliance-reviewer'],
  'audit.read': ['platform-admin', 'auditor', 'knowledge-admin', 'knowledge-curator', 'architecture-reviewer', 'enterprise-architect', 'compliance-reviewer', 'security-admin'],
  'audit.export': ['platform-admin', 'auditor', 'compliance-reviewer', 'security-admin'],
  'mind-factory.snapshot': ['platform-admin', 'knowledge-admin', 'knowledge-curator'],
  'mind-factory.extract': ['platform-admin', 'knowledge-admin', 'knowledge-curator'],
  'mind-factory.normalize': ['platform-admin', 'knowledge-admin', 'knowledge-curator'],
  'mind-factory.release-impact': ['platform-admin', 'knowledge-admin', 'enterprise-architect'],
  'knowledge-pack.export': ['platform-admin', 'knowledge-admin', 'enterprise-architect'],
  'knowledge-pack.import': ['platform-admin', 'knowledge-admin'],
  'mind-factory.worker': ['platform-admin', 'knowledge-admin', 'knowledge-curator'],
  'evidence.write': ['platform-admin', 'knowledge-admin', 'knowledge-curator', 'architecture-reviewer', 'compliance-reviewer'],
  'environment.promote': ['platform-admin', 'knowledge-admin'],
  'knowledge-pack.activate': ['platform-admin', 'knowledge-admin'],
  'mind-factory.persistence': ['platform-admin', 'knowledge-admin'],
  'knowledge-pack.sign': ['platform-admin', 'knowledge-admin'],
  'repository-source.execute': ['platform-admin', 'repository-admin', 'knowledge-admin'],
  'mind-factory.execute': ['platform-admin', 'knowledge-admin'],
  'repository-source.bind': ['platform-admin', 'repository-admin', 'knowledge-admin'],
  'knowledge-pack.kms-guide': ['platform-admin', 'knowledge-admin'],
  'knowledge-pack.kpack': ['platform-admin', 'knowledge-admin'],
};

export function rolesOf(principal: unknown): Role[] {
  const raw = (principal as { roles?: unknown }).roles;
  if (!Array.isArray(raw) || !raw.length) return [];
  return [...new Set(raw.map(String).filter((role): role is Role => (ROLES as readonly string[]).includes(role)))];
}

export function hasPermission(principal: unknown, permission: keyof typeof MATRIX | string): { ok: boolean; roles: Role[]; permission: string } {
  const roles = rolesOf(principal);
  const key = String(permission);
  const allowed = MATRIX[key];
  if (!allowed) return { ok: false, roles, permission: key };
  return { ok: roles.some((role) => allowed.includes(role)), roles, permission: key };
}

export function permissionMatrix(): Record<string, Role[]> {
  return Object.fromEntries(Object.entries(MATRIX).map(([permission, roles]) => [permission, [...roles]]));
}
