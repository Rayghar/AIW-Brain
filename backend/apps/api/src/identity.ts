import type { AuthenticatedPrincipal, IdentityProviderConfig } from '@aiw/domain';

export interface ExternalIdentityClaims {
  sub: string;
  email?: string;
  name?: string;
  iss: string;
  aud?: string | string[];
  iat?: number;
  exp: number;
  tenant_id?: string;
  roles?: string[];
  groups?: string[];
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
  [claim: string]: unknown;
}

const enterpriseRoles = new Set(['platform-admin', 'solution-architect', 'platform-architect', 'knowledge-admin', 'knowledge-curator', 'architecture-reviewer', 'security-reviewer', 'compliance-reviewer', 'enterprise-architect', 'model-admin', 'repository-admin', 'security-admin', 'auditor']);

function normalizeRole(value: unknown): string[] {
  const items = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return items.map(String).map((role) => role.trim()).filter((role) => enterpriseRoles.has(role));
}

function readClaimPath(claims: ExternalIdentityClaims, path: string): unknown {
  return path.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[part];
  }, claims);
}

export function deriveRolesFromClaims(provider: IdentityProviderConfig, claims: ExternalIdentityClaims): { roles: string[]; source: 'claim' | 'group' | 'mapping' } {
  const configuredPath = process.env.AIW_OIDC_ROLE_CLAIM_PATH;
  const configured = configuredPath ? normalizeRole(readClaimPath(claims, configuredPath)) : [];
  const direct = normalizeRole(claims.roles);
  const groups = normalizeRole(claims.groups);
  const realm = normalizeRole(claims.realm_access?.roles);
  const clientRoles = normalizeRole(claims.resource_access?.[provider.clientId]?.roles);
  const roles = [...new Set([...configured, ...direct, ...groups, ...realm, ...clientRoles])];
  if (configured.length) return { roles, source: 'mapping' };
  if (direct.length || realm.length || clientRoles.length) return { roles, source: 'claim' };
  return { roles, source: 'group' };
}

export function validateIdentityProvider(provider: IdentityProviderConfig): string[] {
  const errors: string[] = [];
  if (provider.type !== 'development') {
    try {
      const url = new URL(provider.issuer);
      if (url.protocol !== 'https:') errors.push('Production identity-provider issuers must use HTTPS.');
    } catch { errors.push('Identity-provider issuer must be a valid URL.'); }
  }
  if (!provider.clientId.trim()) errors.push('Identity-provider client ID is required.');
  if (!provider.scopes.includes('openid') && provider.type === 'oidc') errors.push('OIDC providers must request the openid scope.');
  return errors;
}

export function mapExternalClaims(provider: IdentityProviderConfig, claims: ExternalIdentityClaims, tenantId: string): AuthenticatedPrincipal {
  if (!provider.enabled) throw new Error('IDENTITY_PROVIDER_DISABLED');
  if (claims.iss !== provider.issuer) throw new Error('IDENTITY_ISSUER_MISMATCH');
  const audiences = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
  if (audiences.length && !audiences.includes(provider.clientId)) throw new Error('IDENTITY_AUDIENCE_MISMATCH');
  if (claims.exp * 1000 <= Date.now()) throw new Error('IDENTITY_TOKEN_EXPIRED');
  if (claims.tenant_id && claims.tenant_id !== tenantId) throw new Error('TENANT_BOUNDARY_VIOLATION');
  const roleMapping = deriveRolesFromClaims(provider, claims);
  return {
    subject: claims.sub,
    email: claims.email ?? `${claims.sub}@unknown.invalid`,
    displayName: claims.name ?? claims.email ?? claims.sub,
    tenantId,
    providerId: provider.id,
    issuedAt: new Date((claims.iat ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    expiresAt: new Date(claims.exp * 1000).toISOString(),
    roles: roleMapping.roles,
    authMode: 'oidc',
    roleSource: roleMapping.source,
  };
}
