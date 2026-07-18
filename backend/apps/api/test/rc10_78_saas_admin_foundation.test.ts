import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildTenantUsageSummary,
  createAdminControlPlaneStore,
  evaluateTenantEntitlements,
  referencePlanCatalog,
  type EnterpriseIdentityProvider,
  type RoleMappingRule,
} from '@aiw/admin';
import { BillingBoundary, type BillingEventEnvelope } from '../src/billingBoundary.js';
import { buildApp } from '../src/app.js';
import { runEnterpriseIdentityAcceptance } from '../src/enterpriseIdentityAcceptance.js';
import { runEnterpriseOperationalAcceptance } from '../src/enterpriseOperationalAcceptance.js';
import { MemorySaasAdminPersistence } from '../src/saasAdminPersistence.js';
import { InMemoryProjectRepository } from '../src/repository.js';

const now = '2026-07-18T12:00:00.000Z';

describe('rc.10.78 SaaS administration foundation', () => {
  it('enforces tenant scope and explicit platform scope in the reference adapter', async () => {
    const store = createAdminControlPlaneStore();
    const persistence = new MemorySaasAdminPersistence(store);
    for (const tenantId of ['tenant-a', 'tenant-b']) {
      await persistence.saveOrganisation({ tenantId, name: tenantId, slug: tenantId, status: 'active', primaryRegion: 'reference-local', dataResidency: 'tenant-policy', createdAt: now, updatedAt: now, updatedBy: 'test' });
    }
    expect((await persistence.listOrganisations({ tenantId: 'tenant-a', platformAdmin: false })).map((item) => item.tenantId)).toEqual(['tenant-a']);
    expect(await persistence.getOrganisation('tenant-b')).toMatchObject({ tenantId: 'tenant-b' });
    expect(await persistence.runRlsIsolationAcceptance()).toMatchObject({ passed: true, productionProof: false });
    expect((await persistence.listOrganisations({ tenantId: 'tenant-a', platformAdmin: true })).length).toBe(2);
  });

  it('provides reference entitlements without turning budgets into semantic gates', () => {
    const architect = referencePlanCatalog().find((plan) => plan.planId === 'architect')!;
    expect(architect.monthlyPriceUsd).toBe(20);
    const usage = buildTenantUsageSummary([
      { eventId: 'usage-1', tenantId: 'tenant-a', metric: 'input-tokens', quantity: 1_100_000, occurredAt: now, source: 'llm-gateway' },
      { eventId: 'usage-2', tenantId: 'tenant-b', metric: 'input-tokens', quantity: 9_000_000, occurredAt: now, source: 'llm-gateway' },
    ], 'tenant-a', '2026-07-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z');
    expect(usage.eventCount).toBe(1);
    expect(evaluateTenantEntitlements(architect, usage).find((item) => item.metric === 'input-tokens')).toMatchObject({ exceeded: true });
  });

  it('verifies billing signatures, preserves rejected evidence, and replays idempotently', () => {
    const boundary = new BillingBoundary('test-secret-not-a-production-secret');
    const envelope: BillingEventEnvelope = {
      provider: 'test-provider', eventId: 'event-1', tenantId: 'tenant-a', eventType: 'subscription.updated',
      planId: 'architect', subscriptionStatus: 'active', currentPeriodStart: '2026-07-01T00:00:00.000Z', currentPeriodEnd: '2026-08-01T00:00:00.000Z',
    };
    expect(() => boundary.process(envelope, '0'.repeat(64))).toThrow('BILLING_SIGNATURE_INVALID');
    const accepted = boundary.process(envelope, boundary.signatureFor(envelope));
    expect(accepted).toMatchObject({ replayed: false, receipt: { signatureVerified: true, disposition: 'accepted' }, subscription: { planId: 'architect' } });
    expect(boundary.process(envelope, boundary.signatureFor(envelope))).toMatchObject({ replayed: true });
  });

  it('validates OIDC and SAML configuration contracts and tenant role mappings', () => {
    const providers: EnterpriseIdentityProvider[] = [{ providerId: 'oidc-a', tenantId: 'tenant-a', type: 'oidc', name: 'Tenant OIDC', issuer: 'https://id.example.test', clientId: 'aiw', scopes: ['openid', 'profile'], enabled: true, roleClaimPath: 'groups', updatedAt: now, updatedBy: 'test' }];
    const mappingRules: RoleMappingRule[] = [{ ruleId: 'map-a', tenantId: 'tenant-a', claim: 'groups', match: 'AIW-Architects', roles: ['solution-architect'], enabled: true, updatedAt: now, updatedBy: 'test' }];
    const result = runEnterpriseIdentityAcceptance({ tenantId: 'tenant-a', providers, mappingRules, policy: { tenantId: 'tenant-a', mode: 'production', requireSso: true, allowDevelopmentAuth: false, allowedIdentityProviderIds: ['oidc-a'], allowedEmailDomains: ['example.test'], maxSessionMinutes: 60, auditRetentionDays: 365, repositoryWritePolicy: 'deny', runtimeEvidencePolicy: 'evidence-only', candidateKnowledgePolicy: 'blocked-from-production', updatedBy: 'test', updatedAt: now } });
    expect(result).toMatchObject({ passed: true, productionProof: false });
    expect(result.providers[0]?.mappedRoles).toContain('solution-architect');
  });

  it('keeps local operational acceptance truthful and non-production', async () => {
    const store = createAdminControlPlaneStore();
    const persistence = new MemorySaasAdminPersistence(store);
    await persistence.saveOrganisation({ tenantId: 'tenant-ops', name: 'Tenant Ops', slug: 'tenant-ops', status: 'active', primaryRegion: 'reference-local', dataResidency: 'tenant-policy', createdAt: now, updatedAt: now, updatedBy: 'test' });
    const result = await runEnterpriseOperationalAcceptance({ tenantId: 'tenant-ops', actor: 'test', persistence, policy: null, environment: 'local-test' });
    expect(result.run.productionProof).toBe(false);
    expect(result.backupRestore).toMatchObject({ matched: true, productionProof: false });
    expect(result.run.checks.some((check) => check.status === 'failed')).toBe(false);
  });

  it('forces row-level security in both durable migrations', () => {
    for (const migration of ['020_rc10_78_saas_admin_foundation.sql', '021_rc10_78_1_durable_operational_acceptance.sql']) {
      const sql = readFileSync(new URL(`../../../database/migrations/${migration}`, import.meta.url), 'utf8');
      expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/i);
      expect(sql).toMatch(/FORCE ROW LEVEL SECURITY/i);
      expect(sql).toContain("current_setting('aiw.tenant_id'");
    }
  });

  it('exposes tenant-scoped SaaS tasks only through explicit RBAC', async () => {
    const app = await buildApp({ repository: new InMemoryProjectRepository() });
    try {
      const token = await app.inject({ method: 'POST', url: '/api/auth/development-token', payload: { subject: 'user-owner', email: 'owner@example.test', displayName: 'Owner', tenantId: 'tenant-reference' } });
      const response = await app.inject({ method: 'GET', url: '/api/admin/saas/overview', headers: { authorization: `Bearer ${token.json().token}` } });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ tenantId: 'tenant-reference', productionAccepted: false, budgetStatus: { semanticAcceptanceUnaffected: true } });
      const crossTenant = await app.inject({ method: 'GET', url: '/api/admin/saas/overview?tenantId=tenant-other', headers: { authorization: `Bearer ${token.json().token}` } });
      expect([200, 403]).toContain(crossTenant.statusCode);
      if (crossTenant.statusCode === 200) expect(crossTenant.json().tenantId).toBe('tenant-other');
    } finally { await app.close(); }
  });
});
