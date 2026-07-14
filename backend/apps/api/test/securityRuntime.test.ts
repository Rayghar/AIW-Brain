import { describe, expect, it } from 'vitest';
import { sampleProject, type AuthenticatedPrincipal } from '@aiw/domain';
import { mapExternalClaims, validateIdentityProvider } from '../src/identity.js';
import { EnvironmentSecretProvider } from '../src/secrets.js';
import { IdempotencyStore, issueDevelopmentToken, verifyDevelopmentToken } from '../src/securityRuntime.js';

describe('Sprint 4 identity, secret and idempotency runtime', () => {
  it('issues and verifies signed development tokens', () => {
    const principal: AuthenticatedPrincipal = {
      subject: 'user-owner', email: 'owner@example.com', displayName: 'Owner', tenantId: sampleProject.tenantId,
      providerId: 'idp-reference-development', issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    const token = issueDevelopmentToken(principal, 'test-secret');
    expect(verifyDevelopmentToken(token, 'test-secret')?.subject).toBe('user-owner');
    expect(verifyDevelopmentToken(token, 'wrong-secret')).toBeNull();
  });

  it('validates and maps production identity claims', () => {
    const provider = { id: 'oidc-1', tenantId: sampleProject.tenantId, type: 'oidc' as const, name: 'Enterprise OIDC', issuer: 'https://identity.example.com', clientId: 'aiw-client', scopes: ['openid','profile','email'], enabled: true };
    expect(validateIdentityProvider(provider)).toHaveLength(0);
    const principal = mapExternalClaims(provider, { sub: 'user-1', email: 'user@example.com', iss: provider.issuer, aud: provider.clientId, exp: Math.floor(Date.now()/1000) + 60 }, sampleProject.tenantId);
    expect(principal.providerId).toBe(provider.id);
  });

  it('resolves environment secret references without exposing them in the model', async () => {
    process.env.AIW_TEST_SECRET = 'runtime-only-value';
    const value = await new EnvironmentSecretProvider().resolve({ id: 'secret-1', provider: 'environment', locator: 'env://AIW_TEST_SECRET', purpose: 'Test' });
    expect(value).toBe('runtime-only-value');
    delete process.env.AIW_TEST_SECRET;
  });

  it('returns the original response for a repeated idempotency key', async () => {
    const store = new IdempotencyStore();
    let calls = 0;
    const first = await store.execute('tenant', 'scope', 'idempotency-key', { value: 1 }, async () => ({ calls: ++calls }));
    const replay = await store.execute('tenant', 'scope', 'idempotency-key', { value: 1 }, async () => ({ calls: ++calls }));
    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(replay.response.calls).toBe(1);
  });

  it('coalesces simultaneous duplicate requests', async () => {
    const store = new IdempotencyStore();
    let calls = 0;
    const operation = async () => { calls += 1; await new Promise((resolve) => setTimeout(resolve, 10)); return { calls }; };
    const [first, second] = await Promise.all([
      store.execute('tenant', 'concurrent', 'same-key', { value: 1 }, operation),
      store.execute('tenant', 'concurrent', 'same-key', { value: 1 }, operation),
    ]);
    expect(calls).toBe(1);
    expect([first.replayed, second.replayed].sort()).toEqual([false, true]);
  });

});
