import type { EnterpriseIdentityProvider, RoleMappingRule, TenantPolicy } from '@aiw/admin';
import { enterpriseRoleIds } from '@aiw/admin';

export interface IdentityAcceptanceCheck {
  id: string;
  ok: boolean;
  detail: string;
}

export interface IdentityAcceptanceResult {
  tenantId: string;
  generatedAt: string;
  providers: Array<{
    providerId: string;
    type: 'oidc' | 'saml';
    enabled: boolean;
    checks: IdentityAcceptanceCheck[];
    mappedRoles: string[];
    passed: boolean;
  }>;
  policyChecks: IdentityAcceptanceCheck[];
  passed: boolean;
  productionProof: boolean;
}

function httpsUrl(value: string): boolean {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

function claimValue(attributes: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, attributes);
}

function values(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return value === undefined || value === null ? [] : [String(value)];
}

export function mapEnterpriseRoles(attributes: Record<string, unknown>, rules: RoleMappingRule[]): string[] {
  const valid = new Set<string>(enterpriseRoleIds as readonly string[]);
  const result = new Set<string>();
  for (const rule of rules.filter((item) => item.enabled)) {
    const candidates = values(claimValue(attributes, rule.claim));
    if (candidates.some((candidate) => candidate === rule.match)) {
      for (const role of rule.roles) if (valid.has(role)) result.add(role);
    }
  }
  return [...result].sort();
}

export function validateEnterpriseIdentityProvider(provider: EnterpriseIdentityProvider): IdentityAcceptanceCheck[] {
  const checks: IdentityAcceptanceCheck[] = [
    { id: 'provider-enabled', ok: provider.enabled, detail: provider.enabled ? 'Provider is enabled.' : 'Provider is disabled.' },
    { id: 'issuer-https', ok: httpsUrl(provider.issuer), detail: httpsUrl(provider.issuer) ? 'Issuer uses HTTPS.' : 'Issuer must be a valid HTTPS URL.' },
    { id: 'client-or-entity-id', ok: Boolean(provider.clientId.trim()), detail: provider.clientId.trim() ? 'Client/entity identifier is present.' : 'Client/entity identifier is required.' },
    { id: 'role-claim-path', ok: Boolean(provider.roleClaimPath?.trim()), detail: provider.roleClaimPath?.trim() ? `Role claim path=${provider.roleClaimPath}.` : 'Role claim path is not configured.' },
  ];
  if (provider.type === 'oidc') {
    checks.push({ id: 'oidc-openid-scope', ok: provider.scopes.includes('openid'), detail: provider.scopes.includes('openid') ? 'openid scope is present.' : 'OIDC requires the openid scope.' });
  } else {
    const metadataReady = Boolean(provider.metadataUrl && httpsUrl(provider.metadataUrl));
    const signingReady = Boolean(provider.signingCertificateReference?.trim());
    checks.push(
      { id: 'saml-metadata', ok: metadataReady, detail: metadataReady ? 'SAML metadata URL uses HTTPS.' : 'SAML metadata URL is missing or not HTTPS.' },
      { id: 'saml-signing-reference', ok: signingReady, detail: signingReady ? 'SAML signing certificate reference is present.' : 'SAML signing certificate reference is required.' },
    );
  }
  return checks;
}

export function runEnterpriseIdentityAcceptance(input: {
  tenantId: string;
  policy: TenantPolicy | null;
  providers: EnterpriseIdentityProvider[];
  mappingRules: RoleMappingRule[];
}): IdentityAcceptanceResult {
  const tenantProviders = input.providers.filter((provider) => provider.tenantId === input.tenantId);
  const tenantRules = input.mappingRules.filter((rule) => rule.tenantId === input.tenantId && rule.enabled);
  const providerResults = tenantProviders.map((provider) => {
    const checks = validateEnterpriseIdentityProvider(provider);
    const sampleAttributes = provider.type === 'oidc'
      ? { groups: ['AIW-Architects'], roles: ['solution-architect'], tenant_id: input.tenantId }
      : { attributes: { groups: ['AIW-Architects'] }, groups: ['AIW-Architects'], tenant_id: input.tenantId };
    const mappedRoles = mapEnterpriseRoles(sampleAttributes, tenantRules);
    checks.push({ id: 'role-mapping-exercised', ok: mappedRoles.length > 0, detail: mappedRoles.length ? `Mapped roles: ${mappedRoles.join(', ')}.` : 'No configured mapping rule produced a valid enterprise role.' });
    return { providerId: provider.providerId, type: provider.type, enabled: provider.enabled, checks, mappedRoles, passed: checks.every((check) => check.ok) };
  });
  const policyChecks: IdentityAcceptanceCheck[] = [
    { id: 'tenant-policy-present', ok: Boolean(input.policy), detail: input.policy ? `Tenant policy mode=${input.policy.mode}.` : 'Tenant policy is not configured.' },
    { id: 'sso-policy', ok: Boolean(input.policy && (!input.policy.requireSso || tenantProviders.some((provider) => provider.enabled))), detail: input.policy?.requireSso ? 'At least one enabled provider is required.' : 'SSO is not mandatory for this tenant mode.' },
    { id: 'development-auth-production-blocked', ok: !input.policy || input.policy.mode !== 'production' || input.policy.allowDevelopmentAuth === false, detail: input.policy?.mode === 'production' ? 'Production policy must block development auth.' : 'Non-production policy evaluated.' },
    { id: 'provider-allowlist', ok: !input.policy || input.policy.allowedIdentityProviderIds.every((id) => tenantProviders.some((provider) => provider.providerId === id && provider.enabled)), detail: 'Every policy allowlisted provider must exist and be enabled.' },
  ];
  const passed = providerResults.length > 0 && providerResults.every((item) => item.passed) && policyChecks.every((item) => item.ok);
  return { tenantId: input.tenantId, generatedAt: new Date().toISOString(), providers: providerResults, policyChecks, passed, productionProof: false };
}
