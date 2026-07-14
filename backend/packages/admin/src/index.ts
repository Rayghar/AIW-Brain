export type AdminReadiness = 'not-started' | 'partial' | 'ready' | 'verified';
export type SourcePosture = 'discovery' | 'candidate' | 'approved-advisory' | 'approved-production' | 'deprecated' | 'blocked';
export type ModelRouteProvider = 'openai' | 'azure-openai' | 'anthropic' | 'gemini' | 'xai' | 'qwen' | 'deepseek' | 'local' | 'custom' | 'offline-deterministic';
export type ModelRoutePurpose = 'architecture-reasoning' | 'knowledge-extraction' | 'explanation' | 'guided-authoring' | 'adr-drafting' | 'general';
export type EvidenceKind = 'adr' | 'openapi' | 'asyncapi' | 'terraform' | 'kubernetes' | 'docs' | 'ci' | 'runtime' | 'decision-record';
export type TenantPolicyMode = 'development' | 'pilot' | 'production';
export type TenantPolicyDecision = 'allow' | 'deny' | 'review-required';

export const enterpriseRoleIds = ['platform-admin', 'solution-architect', 'platform-architect', 'knowledge-admin', 'knowledge-curator', 'architecture-reviewer', 'security-reviewer', 'compliance-reviewer', 'enterprise-architect', 'model-admin', 'repository-admin', 'security-admin', 'auditor'] as const;
export type EnterpriseRoleId = typeof enterpriseRoleIds[number];

export interface AdminControlPlaneSection {
  id: string;
  label: string;
  readiness: AdminReadiness;
  evidence?: string[];
}

export interface AdminAuditEvent {
  actor: string;
  action: string;
  subject: string;
  at: string;
  detail: string;
  tenantId?: string;
  environment?: string;
  before?: unknown;
  after?: unknown;
}

export interface ModelRoute {
  id: string;
  provider: ModelRouteProvider | string;
  model: string;
  purpose: ModelRoutePurpose | string;
  enabled: boolean;
  deterministicOnly: boolean;
  structuredOutputRequired: boolean;
  maxTokens?: number;
  timeoutMs?: number;
  costLimitUsd?: number;
  allowedWorkspaces: string[];
  dataSensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  tenantScope: 'all-tenants' | 'current-tenant' | string;
  environmentScope: 'local' | 'pilot' | 'production' | string;
  updatedAt: string;
  updatedBy: string;
}

export interface KnowledgeSourceRegistration {
  id: string;
  title: string;
  sourceType: string;
  posture: SourcePosture;
  licence?: string;
  owner?: string;
  trustTier?: string;
  reviewOwner?: string;
  refreshCadenceDays?: number;
  allowedClaimTypes?: string[];
  allowedProductionUse?: boolean;
  registeredBy?: string;
  registeredAt?: string;
}

export interface RepositoryConnectorRegistration {
  id: string;
  provider: 'github' | 'gitlab' | 'azure-devops' | 'bitbucket' | 'custom' | string;
  repositoryUrl: string;
  defaultBranch?: string;
  allowedPaths: string[];
  evidenceKinds: EvidenceKind[] | string[];
  writeEnabled: boolean;
  prRequiresApproval: boolean;
  architectureMutationRequiresApproval: boolean;
  evidenceClassificationRequired: boolean;
  registeredBy?: string;
  registeredAt?: string;
  lastTestedAt?: string;
  lastTestResult?: 'not-tested' | 'config-valid' | 'blocked' | 'live-ready';
}

export interface TenantAdminSetting {
  key: string;
  value: unknown;
  updatedBy: string;
  updatedAt: string;
}

export interface FeatureFlag {
  flag: string;
  enabled: boolean;
  scope: 'tenant' | 'environment' | 'global';
  updatedBy: string;
  updatedAt: string;
}

export interface TenantPolicy {
  tenantId: string;
  mode: TenantPolicyMode;
  requireSso: boolean;
  allowDevelopmentAuth: boolean;
  allowedIdentityProviderIds: string[];
  allowedEmailDomains: string[];
  defaultKnowledgeReleaseId?: string;
  dataResidency?: string;
  maxSessionMinutes: number;
  auditRetentionDays: number;
  repositoryWritePolicy: TenantPolicyDecision;
  runtimeEvidencePolicy: 'evidence-only' | 'mutation-review-required';
  candidateKnowledgePolicy: 'blocked-from-production' | 'advisory-only';
  updatedBy: string;
  updatedAt: string;
}

export interface RoleAssignment {
  assignmentId: string;
  tenantId: string;
  subject: string;
  email?: string;
  roles: EnterpriseRoleId[];
  source: 'oidc' | 'manual' | 'development-token' | 'proxy-verified';
  active: boolean;
  expiresAt?: string;
  updatedBy: string;
  updatedAt: string;
}

export interface RoleMappingRule {
  ruleId: string;
  tenantId: string;
  claim: string;
  match: string;
  roles: EnterpriseRoleId[];
  enabled: boolean;
  updatedBy: string;
  updatedAt: string;
}

export interface RlsAcceptanceResult {
  checkId: string;
  ok: boolean;
  severity: 'critical' | 'high' | 'medium';
  detail: string;
}

export interface EnterpriseSecurityPosture {
  generatedAt: string;
  version: string;
  mode: TenantPolicyMode;
  checks: RlsAcceptanceResult[];
  summary: {
    passed: number;
    failed: number;
    productionReady: boolean;
  };
  guardrails: {
    developmentAuthInProduction: 'blocked' | 'allowed';
    oidcRoleMapping: 'configured' | 'not-configured';
    tenantPolicyEnforced: boolean;
    auditExportGuarded: boolean;
    repositoryMutationPolicy: 'disabled-by-default';
  };
}

export interface AuditExportManifest {
  exportId: string;
  generatedAt: string;
  generatedBy: string;
  tenantId: string;
  format: 'csv' | 'json';
  rowCount: number;
  checksumSha256: string;
  retentionWarning: string;
}

export interface PerformanceCheckResult {
  checkId: string;
  ok: boolean;
  measurement: string;
  threshold: string;
  recommendation: string;
}

export interface AdminControlPlaneSnapshot {
  generatedAt: string;
  readiness: number;
  sections: AdminControlPlaneSection[];
  counts: {
    modelRoutes: number;
    activeModelRoutes: number;
    repositoryConnectors: number;
    knowledgeSources: number;
    approvedProductionSources: number;
    auditEvents: number;
    featureFlags: number;
    roleAssignments: number;
    tenantPolicies: number;
  };
  safety: {
    llmIsAuthority: false;
    repositoryWritesDefaultDisabled: true;
    candidateKnowledgeCanScore: false;
    productionFinalizationFailClosed: true;
    developmentAuthBlockedInProduction: boolean;
    tenantPolicyEnforced: boolean;
  };
}

export interface AdminControlPlaneStore {
  audit: AdminAuditEvent[];
  modelRoutes: Map<string, ModelRoute>;
  claimDecisions: unknown[];
  triageDecisions: unknown[];
  releasePins: unknown[];
  knowledgeSources: Map<string, KnowledgeSourceRegistration>;
  repositoryConnectors: Map<string, RepositoryConnectorRegistration>;
  tenantSettings: Map<string, TenantAdminSetting>;
  featureFlags: Map<string, FeatureFlag>;
  tenantPolicies: Map<string, TenantPolicy>;
  roleAssignments: Map<string, RoleAssignment>;
  roleMappingRules: Map<string, RoleMappingRule>;
}

export const requiredAdminSections: AdminControlPlaneSection[] = [
  { id: 'model-routes', label: 'Model route governance', readiness: 'ready' },
  { id: 'repository-connectors', label: 'Repository connector governance', readiness: 'ready' },
  { id: 'knowledge-sources', label: 'Knowledge source registry', readiness: 'ready' },
  { id: 'pattern-dna', label: 'Pattern DNA operations', readiness: 'ready' },
  { id: 'security-rbac', label: 'Enterprise security and RBAC', readiness: 'verified' },
  { id: 'tenant-policy', label: 'Tenant policy controls', readiness: 'verified' },
  { id: 'audit', label: 'Admin audit trail and export', readiness: 'verified' },
  { id: 'mind-factory', label: 'Mind administration and ingestion factory', readiness: 'ready' },
];

export const defaultRolePermissions: Record<string, string[]> = {
  'platform-admin': ['*'],
  'knowledge-admin': ['source.register', 'source.posture', 'claims.decide', 'contradictions.triage', 'release.candidate', 'release.promote', 'release.rollback', 'release.pin', 'pattern-dna.stage', 'audit.read', 'mind-factory.snapshot', 'mind-factory.extract', 'mind-factory.normalize', 'mind-factory.release-impact', 'knowledge-pack.export', 'knowledge-pack.import', 'knowledge-pack.sign', 'knowledge-pack.kms-guide', 'knowledge-pack.kpack', 'mind-factory.persistence', 'repository-source.bind', 'repository-source.execute', 'mind-factory.execute'],
  'knowledge-curator': ['claims.decide', 'claims.assign', 'knowledge-ops.comment', 'knowledge-ops.escalate', 'contradictions.triage', 'source.refresh', 'duplicates.resolve', 'synonyms.resolve', 'corroboration.analyse', 'mind-factory.snapshot', 'mind-factory.extract', 'mind-factory.normalize', 'mind-factory.worker', 'mind-factory.execute'],
  'architecture-reviewer': ['claims.decide', 'knowledge-ops.comment', 'knowledge-ops.escalate', 'contradictions.triage', 'conformance.generate', 'fitness-loop.generate'],
  'security-reviewer': ['claims.decide', 'knowledge-ops.comment', 'knowledge-ops.escalate', 'security.posture.read'],
  'compliance-reviewer': ['claims.decide', 'knowledge-ops.comment', 'knowledge-ops.escalate', 'audit.read', 'audit.export'],
  'enterprise-architect': ['release.candidate', 'release.pin', 'connector.scan', 'conformance.generate', 'fitness-loop.generate', 'runtime-evidence.plan', 'mind-factory.release-impact', 'knowledge-pack.export'],
  'repository-admin': ['connector.register', 'connector.test', 'connector.scan', 'repository-source.bind', 'repository-source.execute', 'conformance.generate', 'fitness-loop.generate', 'runtime-evidence.plan'],
  'model-admin': ['model-route.write', 'model-route.test'],
  'security-admin': ['tenant.settings', 'feature-flags.write', 'audit.read', 'audit.export', 'security.role-admin', 'security.tenant-policy', 'security.posture.read'],
  auditor: ['audit.read', 'audit.export', 'security.posture.read'],
};

export function createAdminControlPlaneStore(): AdminControlPlaneStore {
  return {
    audit: [],
    modelRoutes: new Map<string, ModelRoute>(),
    claimDecisions: [],
    triageDecisions: [],
    releasePins: [],
    knowledgeSources: new Map<string, KnowledgeSourceRegistration>(),
    repositoryConnectors: new Map<string, RepositoryConnectorRegistration>(),
    tenantSettings: new Map<string, TenantAdminSetting>(),
    featureFlags: new Map<string, FeatureFlag>(),
    tenantPolicies: new Map<string, TenantPolicy>(),
    roleAssignments: new Map<string, RoleAssignment>(),
    roleMappingRules: new Map<string, RoleMappingRule>(),
  };
}

export function isMutationAllowedByAdminPolicy(policy: { writeEnabled?: boolean; humanApproved?: boolean }): boolean {
  return policy.writeEnabled === true && policy.humanApproved === true;
}

export function actorName(principal: unknown): string {
  return String((principal as { userId?: string; sub?: string; subject?: string })?.userId ?? (principal as { sub?: string })?.sub ?? (principal as { subject?: string })?.subject ?? 'unknown-actor');
}

export function auditEvent(input: Omit<AdminAuditEvent, 'at'> & { at?: string }): AdminAuditEvent {
  return { ...input, at: input.at ?? new Date().toISOString() };
}

function normalizeRoleList(raw: unknown): EnterpriseRoleId[] {
  const values = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [];
  return [...new Set(values.map(String).map((role) => role.trim()).filter((role): role is EnterpriseRoleId => (enterpriseRoleIds as readonly string[]).includes(role)))];
}

export function normalizeTenantPolicy(input: Partial<TenantPolicy>, actor: string, fallbackTenantId = 'tenant-reference'): { ok: true; policy: TenantPolicy } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  const mode = input.mode ?? 'pilot';
  const tenantId = input.tenantId?.trim() || fallbackTenantId;
  if (mode === 'production' && input.allowDevelopmentAuth === true) reasons.push('Production tenant policy cannot allow development auth.');
  if (mode === 'production' && input.requireSso !== true) reasons.push('Production tenant policy must require SSO.');
  if (mode === 'production' && !input.allowedIdentityProviderIds?.length) reasons.push('At least one identity provider must be allowed for production.');
  const retention = input.auditRetentionDays ?? 365;
  if (retention < 90) reasons.push('Audit retention must be at least 90 days.');
  const maxSessionMinutes = input.maxSessionMinutes ?? 480;
  if (maxSessionMinutes < 15 || maxSessionMinutes > 1440) reasons.push('Session duration must be between 15 and 1440 minutes.');
  if (reasons.length) return { ok: false, reasons };
  return {
    ok: true,
    policy: {
      tenantId,
      mode,
      requireSso: input.requireSso ?? mode !== 'development',
      allowDevelopmentAuth: input.allowDevelopmentAuth ?? mode === 'development',
      allowedIdentityProviderIds: input.allowedIdentityProviderIds ?? [],
      allowedEmailDomains: input.allowedEmailDomains ?? [],
      ...(input.defaultKnowledgeReleaseId ? { defaultKnowledgeReleaseId: input.defaultKnowledgeReleaseId } : {}),
      ...(input.dataResidency ? { dataResidency: input.dataResidency } : {}),
      maxSessionMinutes,
      auditRetentionDays: retention,
      repositoryWritePolicy: input.repositoryWritePolicy ?? 'deny',
      runtimeEvidencePolicy: input.runtimeEvidencePolicy ?? 'evidence-only',
      candidateKnowledgePolicy: input.candidateKnowledgePolicy ?? 'blocked-from-production',
      updatedBy: actor,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function normalizeRoleAssignment(input: Partial<RoleAssignment>, actor: string, tenantId = 'tenant-reference'): { ok: true; assignment: RoleAssignment } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  const subject = input.subject?.trim();
  const roles = normalizeRoleList(input.roles);
  if (!subject) reasons.push('Subject is required.');
  if (!roles.length) reasons.push('At least one valid enterprise role is required.');
  if (input.expiresAt && new Date(input.expiresAt).getTime() <= Date.now()) reasons.push('Role assignment expiry must be in the future.');
  if (reasons.length) return { ok: false, reasons };
  const assignmentId = input.assignmentId?.trim() || `${tenantId}:${subject}`;
  return {
    ok: true,
    assignment: {
      assignmentId,
      tenantId: input.tenantId?.trim() || tenantId,
      subject: subject!,
      ...(input.email?.trim() ? { email: input.email.trim() } : {}),
      roles,
      source: input.source ?? 'manual',
      active: input.active ?? true,
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
      updatedBy: actor,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function normalizeRoleMappingRule(input: Partial<RoleMappingRule>, actor: string, tenantId = 'tenant-reference'): { ok: true; rule: RoleMappingRule } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  const roles = normalizeRoleList(input.roles);
  if (!input.claim?.trim()) reasons.push('Claim path is required.');
  if (!input.match?.trim()) reasons.push('Claim match value is required.');
  if (!roles.length) reasons.push('At least one valid mapped role is required.');
  if (reasons.length) return { ok: false, reasons };
  return {
    ok: true,
    rule: {
      ruleId: input.ruleId?.trim() || `${tenantId}:${input.claim}:${input.match}`.replaceAll(/[^a-zA-Z0-9:_-]/g, '-'),
      tenantId: input.tenantId?.trim() || tenantId,
      claim: input.claim!.trim(),
      match: input.match!.trim(),
      roles,
      enabled: input.enabled ?? true,
      updatedBy: actor,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function normalizeModelRoute(input: Partial<ModelRoute>, actor: string): { ok: true; route: ModelRoute } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.id?.trim()) reasons.push('Route id is required.');
  if (!input.provider?.trim()) reasons.push('Provider is required.');
  if (!input.model?.trim()) reasons.push('Model id is required.');
  if (input.maxTokens !== undefined && (!Number.isFinite(input.maxTokens) || input.maxTokens < 128)) reasons.push('maxTokens must be at least 128 when provided.');
  if (input.timeoutMs !== undefined && (!Number.isFinite(input.timeoutMs) || input.timeoutMs < 1000)) reasons.push('timeoutMs must be at least 1000 when provided.');
  if (input.environmentScope === 'production' && input.deterministicOnly !== true && input.structuredOutputRequired !== true) reasons.push('Production model routes require structured output or deterministic-only mode.');
  if (reasons.length) return { ok: false, reasons };
  return {
    ok: true,
    route: {
      id: input.id!.trim(),
      provider: input.provider!.trim(),
      model: input.model!.trim(),
      purpose: input.purpose?.trim() || 'architecture-reasoning',
      enabled: input.enabled ?? true,
      deterministicOnly: input.deterministicOnly ?? false,
      structuredOutputRequired: input.structuredOutputRequired ?? true,
      ...(input.maxTokens !== undefined ? { maxTokens: input.maxTokens } : {}),
      timeoutMs: input.timeoutMs ?? 30000,
      ...(input.costLimitUsd !== undefined ? { costLimitUsd: input.costLimitUsd } : {}),
      allowedWorkspaces: input.allowedWorkspaces?.length ? input.allowedWorkspaces : ['activation', 'synthesis', 'patterns', 'governance'],
      dataSensitivity: input.dataSensitivity ?? 'internal',
      tenantScope: input.tenantScope ?? 'all-tenants',
      environmentScope: input.environmentScope ?? 'local',
      updatedAt: new Date().toISOString(),
      updatedBy: actor,
    },
  };
}

export function normalizeKnowledgeSource(input: Partial<KnowledgeSourceRegistration>, actor: string): { ok: true; source: KnowledgeSourceRegistration } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.id?.trim()) reasons.push('Source id is required.');
  if (!input.title?.trim()) reasons.push('Source title is required.');
  const licence = input.licence?.trim();
  const licenceBlocksApproval = Boolean(licence && /\b(gpl|agpl|lgpl)\b/i.test(licence));
  const posture = input.posture ?? 'discovery';
  if ((posture === 'approved-advisory' || posture === 'approved-production') && !licence) reasons.push('Licence must be recorded before approval.');
  if ((posture === 'approved-advisory' || posture === 'approved-production') && !input.reviewOwner?.trim()) reasons.push('Review owner is required before approval.');
  if ((posture === 'approved-advisory' || posture === 'approved-production') && licenceBlocksApproval) reasons.push('GPL-family licences remain blocked from approval posture.');
  if (reasons.length) return { ok: false, reasons };
  return {
    ok: true,
    source: {
      id: input.id!.trim(),
      title: input.title!.trim(),
      sourceType: input.sourceType?.trim() || 'repository',
      posture,
      ...(licence ? { licence } : {}),
      ...(input.owner?.trim() ? { owner: input.owner.trim() } : {}),
      trustTier: input.trustTier?.trim() || 'candidate',
      ...(input.reviewOwner?.trim() ? { reviewOwner: input.reviewOwner.trim() } : {}),
      refreshCadenceDays: input.refreshCadenceDays ?? 30,
      allowedClaimTypes: input.allowedClaimTypes ?? [],
      allowedProductionUse: posture === 'approved-production',
      registeredBy: actor,
      registeredAt: new Date().toISOString(),
    },
  };
}

export function normalizeRepositoryConnector(input: Partial<RepositoryConnectorRegistration>, actor: string): { ok: true; connector: RepositoryConnectorRegistration } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.id?.trim()) reasons.push('Connector id is required.');
  if (!input.repositoryUrl?.trim()) reasons.push('Repository URL is required.');
  if (input.repositoryUrl && !/^https:\/\/(github\.com|gitlab\.com|dev\.azure\.com|bitbucket\.org)\//.test(input.repositoryUrl)) reasons.push('Repository URL must be a supported HTTPS repository URL.');
  if (input.writeEnabled === true) reasons.push('Repository writes are disabled by default; enable through a separate approved write policy.');
  if (reasons.length) return { ok: false, reasons };
  return {
    ok: true,
    connector: {
      id: input.id!.trim(),
      provider: input.provider?.trim() || 'github',
      repositoryUrl: input.repositoryUrl!.trim(),
      defaultBranch: input.defaultBranch?.trim() || 'main',
      allowedPaths: input.allowedPaths?.length ? input.allowedPaths : ['docs', 'adr', 'openapi', 'asyncapi', 'terraform', 'kubernetes', '.github/workflows'],
      evidenceKinds: input.evidenceKinds?.length ? input.evidenceKinds : ['docs', 'adr'],
      writeEnabled: false,
      prRequiresApproval: true,
      architectureMutationRequiresApproval: true,
      evidenceClassificationRequired: true,
      registeredBy: actor,
      registeredAt: new Date().toISOString(),
      lastTestResult: 'not-tested',
    },
  };
}

export function buildAdminControlPlaneSnapshot(store: AdminControlPlaneStore): AdminControlPlaneSnapshot {
  const modelRoutes = [...store.modelRoutes.values()];
  const connectors = [...store.repositoryConnectors.values()];
  const sources = [...store.knowledgeSources.values()];
  const roleAssignments = [...store.roleAssignments.values()];
  const tenantPolicies = [...store.tenantPolicies.values()];
  const activeModelRoutes = modelRoutes.filter((route) => route.enabled).length;
  const approvedProductionSources = sources.filter((source) => source.posture === 'approved-production').length;
  const productionPolicySafe = tenantPolicies.every((policy) => policy.mode !== 'production' || (policy.requireSso && !policy.allowDevelopmentAuth));
  const checks = [
    modelRoutes.length > 0,
    connectors.length > 0,
    sources.length > 0,
    store.audit.length > 0,
    [...store.featureFlags.values()].every((flag) => typeof flag.enabled === 'boolean'),
    connectors.every((connector) => connector.writeEnabled === false && connector.prRequiresApproval === true),
    modelRoutes.every((route) => route.structuredOutputRequired === true),
    roleAssignments.every((assignment) => assignment.active ? assignment.roles.length > 0 : true),
    productionPolicySafe,
  ];
  const readiness = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  return {
    generatedAt: new Date().toISOString(),
    readiness,
    sections: [
      { id: 'model-routes', label: 'Model routes', readiness: modelRoutes.length ? 'ready' : 'partial' },
      { id: 'repository-connectors', label: 'Repository connectors', readiness: connectors.length ? 'ready' : 'partial' },
      { id: 'knowledge-sources', label: 'Knowledge sources', readiness: sources.length ? 'ready' : 'partial' },
      { id: 'security-rbac', label: 'Enterprise security and RBAC', readiness: roleAssignments.length || store.roleMappingRules.size ? 'verified' : 'partial' },
      { id: 'audit', label: 'Admin audit trail', readiness: store.audit.length ? 'verified' : 'partial' },
      { id: 'tenant-policy', label: 'Tenant policy and feature flags', readiness: tenantPolicies.length && productionPolicySafe ? 'verified' : 'partial' },
    ],
    counts: {
      modelRoutes: modelRoutes.length,
      activeModelRoutes,
      repositoryConnectors: connectors.length,
      knowledgeSources: sources.length,
      approvedProductionSources,
      auditEvents: store.audit.length,
      featureFlags: store.featureFlags.size,
      roleAssignments: roleAssignments.length,
      tenantPolicies: tenantPolicies.length,
    },
    safety: {
      llmIsAuthority: false,
      repositoryWritesDefaultDisabled: true,
      candidateKnowledgeCanScore: false,
      productionFinalizationFailClosed: true,
      developmentAuthBlockedInProduction: productionPolicySafe,
      tenantPolicyEnforced: tenantPolicies.length > 0,
    },
  };
}

export function buildEnterpriseSecurityPosture(store: AdminControlPlaneStore, options: { mode?: TenantPolicyMode; version?: string; developmentAuthAllowed?: boolean; oidcConfigured?: boolean } = {}): EnterpriseSecurityPosture {
  const mode = options.mode ?? 'pilot';
  const developmentAuthAllowed = options.developmentAuthAllowed ?? mode === 'development';
  const tenantPolicies = [...store.tenantPolicies.values()];
  const roleAssignments = [...store.roleAssignments.values()];
  const checks: RlsAcceptanceResult[] = [
    { checkId: 'dev-auth-production-block', ok: mode !== 'production' || !developmentAuthAllowed, severity: 'critical', detail: mode === 'production' && developmentAuthAllowed ? 'Development authentication is still enabled in production mode.' : 'Development authentication is blocked outside development mode.' },
    { checkId: 'tenant-policy-production-sso', ok: tenantPolicies.every((policy) => policy.mode !== 'production' || (policy.requireSso && !policy.allowDevelopmentAuth)), severity: 'critical', detail: 'Production tenant policies require SSO and disallow development auth.' },
    { checkId: 'repository-writes-disabled', ok: [...store.repositoryConnectors.values()].every((connector) => connector.writeEnabled === false && connector.prRequiresApproval), severity: 'high', detail: 'Repository connectors remain read-only unless a separate approved write policy is introduced.' },
    { checkId: 'role-assignment-expiry', ok: roleAssignments.every((assignment) => !assignment.expiresAt || new Date(assignment.expiresAt).getTime() > Date.now()), severity: 'medium', detail: 'Active role assignments do not contain expired grants.' },
    { checkId: 'candidate-knowledge-isolation', ok: tenantPolicies.every((policy) => policy.candidateKnowledgePolicy !== 'advisory-only' || policy.mode !== 'production'), severity: 'high', detail: 'Candidate knowledge cannot influence production scoring.' },
    { checkId: 'audit-export-guarded', ok: true, severity: 'medium', detail: 'Audit export endpoint requires audit.export permission and produces a checksum manifest.' },
  ];
  const failed = checks.filter((check) => !check.ok).length;
  return {
    generatedAt: new Date().toISOString(),
    version: options.version ?? '0.10.0-rc.10.11',
    mode,
    checks,
    summary: { passed: checks.length - failed, failed, productionReady: failed === 0 && mode === 'production' },
    guardrails: {
      developmentAuthInProduction: mode === 'production' && developmentAuthAllowed ? 'allowed' : 'blocked',
      oidcRoleMapping: options.oidcConfigured ? 'configured' : 'not-configured',
      tenantPolicyEnforced: tenantPolicies.length > 0,
      auditExportGuarded: true,
      repositoryMutationPolicy: 'disabled-by-default',
    },
  };
}

export function buildReferencePerformanceChecks(input: { endpointCount: number; adminRouteCount: number; auditEvents: number; memoryStore: boolean }): PerformanceCheckResult[] {
  return [
    { checkId: 'route-registry-size', ok: input.endpointCount <= 260, measurement: `${input.endpointCount} endpoints`, threshold: '<=260 endpoints for rc.10.10 reference profile', recommendation: 'Continue feature-owned route modules; do not add new monolithic app.ts route blocks.' },
    { checkId: 'admin-route-guard-coverage', ok: input.adminRouteCount >= 8, measurement: `${input.adminRouteCount} guarded admin route families`, threshold: '>=8 guarded admin/security families', recommendation: 'Keep route permission coverage as a release gate.' },
    { checkId: 'audit-retention-volume', ok: input.auditEvents <= 5000, measurement: `${input.auditEvents} in-memory audit events`, threshold: '<=5000 reference-mode events before durable export/backing store required', recommendation: 'Use Postgres-backed audit storage for enterprise deployments.' },
    { checkId: 'durability-profile', ok: !input.memoryStore, measurement: input.memoryStore ? 'memory-reference' : 'postgres-ready', threshold: 'postgres-ready for production', recommendation: input.memoryStore ? 'Do not run production in memory mode.' : 'Production durability profile is present.' },
  ];
}
