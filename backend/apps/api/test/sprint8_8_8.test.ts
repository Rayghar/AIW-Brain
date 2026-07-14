import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { mapExternalClaims } from '../src/identity.js';
import { hasPermission } from '@aiw/engine';

const auth = { 'x-aiw-user-id': 'user-owner', 'x-aiw-roles': 'platform-admin' };

describe('Sprint 8.8.8 enterprise security/RBAC hardening', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => { process.env.AIW_ALLOW_DEV_AUTH = 'true'; app = await buildApp({ logger: false }); });
  afterEach(async () => { await app.close(); delete process.env.AIW_ALLOW_DEV_AUTH; delete process.env.AIW_DEPLOYMENT_MODE; });

  it('maps OIDC roles from production identity claims', () => {
    const provider = { id: 'oidc-1', tenantId: 'tenant-reference', type: 'oidc' as const, name: 'OIDC', issuer: 'https://identity.example.com', clientId: 'aiw-client', scopes: ['openid'], enabled: true };
    const principal = mapExternalClaims(provider, { sub: 'u1', email: 'u1@example.com', iss: provider.issuer, aud: provider.clientId, roles: ['security-admin'], exp: Math.floor(Date.now()/1000)+300 }, 'tenant-reference');
    expect(principal.roles).toContain('security-admin');
    expect(hasPermission(principal, 'security.tenant-policy').ok).toBe(true);
  });

  it('exposes the RBAC administration surface and explicit role assignments', async () => {
    const list = await app.inject({ method: 'GET', url: '/api/admin/security/roles', headers: auth });
    expect(list.statusCode).toBe(200);
    expect(list.json().roles).toContain('security-admin');
    const saved = await app.inject({ method: 'POST', url: '/api/admin/security/role-assignments', headers: auth, payload: { subject: 'auditor-1', email: 'auditor@example.com', roles: ['auditor'], source: 'manual', active: true } });
    expect(saved.statusCode).toBe(200);
    const after = await app.inject({ method: 'GET', url: '/api/admin/security/roles', headers: auth });
    expect(after.json().assignments.some((item: { subject: string }) => item.subject === 'auditor-1')).toBe(true);
  });

  it('enforces production tenant policy against development auth', async () => {
    const refused = await app.inject({ method: 'POST', url: '/api/admin/security/tenant-policies', headers: auth, payload: { tenantId: 'tenant-reference', mode: 'production', requireSso: true, allowDevelopmentAuth: true, allowedIdentityProviderIds: ['oidc-1'], auditRetentionDays: 365 } });
    expect(refused.statusCode).toBe(400);
    const saved = await app.inject({ method: 'POST', url: '/api/admin/security/tenant-policies', headers: auth, payload: { tenantId: 'tenant-reference', mode: 'production', requireSso: true, allowDevelopmentAuth: false, allowedIdentityProviderIds: ['oidc-1'], auditRetentionDays: 365 } });
    expect(saved.statusCode).toBe(200);
  });

  it('runs RLS acceptance and guarded audit export', async () => {
    const rls = await app.inject({ method: 'POST', url: '/api/admin/security/rls-acceptance', headers: auth });
    expect(rls.statusCode).toBe(200);
    expect(rls.json().checks.length).toBeGreaterThanOrEqual(4);
    const exportResponse = await app.inject({ method: 'GET', url: '/api/admin/audit/export/v2', headers: auth });
    expect(exportResponse.statusCode).toBe(200);
    expect(exportResponse.headers['x-aiw-audit-export-manifest']).toBeTruthy();
  });
});
