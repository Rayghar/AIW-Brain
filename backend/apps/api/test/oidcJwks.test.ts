import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { OidcJwksVerifier } from '../src/oidcJwks.js';

function encode(value: unknown): string { return Buffer.from(JSON.stringify(value)).toString('base64url'); }

describe('reference OIDC/JWKS verifier', () => {
  it('verifies an RS256 token using discovery and JWKS documents', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = publicKey.export({ format: 'jwk' });
    const issuer = 'https://identity.example.test';
    const header = encode({ alg: 'RS256', kid: 'key-1', typ: 'JWT' });
    const payload = encode({ sub: 'user-owner', email: 'owner@example.com', name: 'Owner', iss: issuer, aud: 'aiw-client', tenant_id: 'tenant-reference', exp: Math.floor(Date.now() / 1000) + 300 });
    const signature = sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), privateKey).toString('base64url');
    const token = `${header}.${payload}.${signature}`;
    const fetcher = async (url: string | URL | Request) => {
      const value = String(url);
      if (value.endsWith('/.well-known/openid-configuration')) return new Response(JSON.stringify({ jwks_uri: `${issuer}/jwks` }), { status: 200 });
      return new Response(JSON.stringify({ keys: [{ ...jwk, kid: 'key-1', alg: 'RS256', use: 'sig' }] }), { status: 200 });
    };
    const verifier = new OidcJwksVerifier(fetcher as typeof fetch);
    const principal = await verifier.verify(token, { id: 'provider', tenantId: 'tenant-reference', type: 'oidc', name: 'Test', issuer, clientId: 'aiw-client', scopes: ['openid'], enabled: true }, 'tenant-reference');
    expect(principal.subject).toBe('user-owner');
  });
});
