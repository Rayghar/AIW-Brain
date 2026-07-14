import { createId, type ArchitectureProject, type AuditEvent, type AuthenticatedPrincipal, type Finding, type SecretReference } from '@aiw/domain';

const unsafeLocatorPatterns = [/^\s*(?:sk-|eyJ|AKIA)/i, /password\s*=/i, /secret\s*=/i, /api[_-]?key\s*=/i];

export function principalCanAccessTenant(principal: AuthenticatedPrincipal, tenantId: string): boolean {
  return principal.tenantId === tenantId && new Date(principal.expiresAt).getTime() > Date.now();
}

export function validateSecretReference(reference: SecretReference): string[] {
  const errors: string[] = [];
  if (!reference.locator.includes('://')) errors.push('Secret locators must use an explicit provider URI such as env://NAME or vault://path.');
  if (unsafeLocatorPatterns.some((pattern) => pattern.test(reference.locator))) errors.push('Secret locators must not contain plaintext credentials or credential-shaped values.');
  if (reference.provider === 'environment' && !reference.locator.startsWith('env://')) errors.push('Environment secret references must use the env:// prefix.');
  return errors;
}

export function validateProjectSecurity(project: ArchitectureProject): Finding[] {
  const findings: Finding[] = [];
  if (project.securitySettings.requireSso && project.identityProviders.filter((provider) => provider.enabled && provider.type !== 'development').length === 0) {
    findings.push({
      id: createId('finding'), ruleId: 'SEC-SSO-PROVIDER', severity: 'HARD', title: 'SSO is required but no production identity provider is enabled',
      message: 'Enable at least one OIDC or SAML identity provider before enforcing SSO.',
      rationale: 'A tenant cannot enforce SSO without a trusted production identity provider.', affectedNodeIds: [], affectedEdgeIds: [],
      mitigations: ['Configure and validate an OIDC or SAML provider.', 'Temporarily disable SSO enforcement only in non-production environments.'], canOverride: false,
    });
  }
  for (const reference of project.secretReferences) {
    const errors = validateSecretReference(reference);
    if (errors.length) findings.push({
      id: createId('finding'), ruleId: 'SEC-SECRET-REFERENCE', severity: 'HARD', title: `Unsafe secret reference: ${reference.purpose}`,
      message: errors.join(' '), rationale: 'Canonical architecture documents must contain references to secrets, never secret material.', affectedNodeIds: [], affectedEdgeIds: [],
      mitigations: ['Replace the value with a provider-backed secret URI.', 'Rotate any credential that may have been committed.'], canOverride: false,
    });
  }
  const providerIds = new Set(project.identityProviders.filter((provider) => provider.enabled).map((provider) => provider.id));
  for (const providerId of project.securitySettings.allowedIdentityProviderIds) {
    if (!providerIds.has(providerId)) findings.push({
      id: createId('finding'), ruleId: 'SEC-IDP-REFERENCE', severity: 'SIGNIFICANT', title: 'Security policy references an unavailable identity provider',
      message: `Identity provider ${providerId} is not enabled in this tenant configuration.`, rationale: 'Authentication policy must only reference active, validated identity providers.', affectedNodeIds: [], affectedEdgeIds: [],
      mitigations: ['Enable the provider or remove it from the allowed identity-provider list.'], canOverride: true,
    });
  }
  return findings;
}

export function retentionUntil(retentionDays: number, now = new Date()): string {
  const value = new Date(now);
  value.setUTCDate(value.getUTCDate() + retentionDays);
  return value.toISOString();
}

export function createAuditEvent(input: {
  tenantId: string; actorId: string; eventType: string; action: string; targetType: string; outcome: AuditEvent['outcome'];
  projectId?: string; branchId?: string; targetId?: string; correlationId: string; metadata?: Record<string, unknown>; retentionDays: number; now?: Date;
}): AuditEvent {
  const now = input.now ?? new Date();
  return {
    id: createId('audit'), tenantId: input.tenantId, actorId: input.actorId, eventType: input.eventType, action: input.action,
    targetType: input.targetType, outcome: input.outcome, occurredAt: now.toISOString(), retentionUntil: retentionUntil(input.retentionDays, now),
    correlationId: input.correlationId, metadata: redactSensitive(input.metadata ?? {}),
    ...(input.projectId ? { projectId: input.projectId } : {}), ...(input.branchId ? { branchId: input.branchId } : {}), ...(input.targetId ? { targetId: input.targetId } : {}),
  };
}

export function redactSensitive<T>(value: T): T {
  const sensitive = /token|secret|password|authorization|cookie|api[-_]?key/i;
  const visit = (candidate: unknown): unknown => {
    if (Array.isArray(candidate)) return candidate.map(visit);
    if (candidate && typeof candidate === 'object') {
      return Object.fromEntries(Object.entries(candidate as Record<string, unknown>).map(([key, item]) => [key, sensitive.test(key) ? '[REDACTED]' : visit(item)]));
    }
    return candidate;
  };
  return visit(value) as T;
}
