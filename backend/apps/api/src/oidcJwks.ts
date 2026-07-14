import { createPublicKey, verify } from 'node:crypto';
import type { AuthenticatedPrincipal, IdentityProviderConfig } from '@aiw/domain';
import { mapExternalClaims, type ExternalIdentityClaims } from './identity.js';

interface JwtHeader { alg?: string; kid?: string; typ?: string }
interface JwkRecord { kid?: string; kty?: string; alg?: string; use?: string; n?: string; e?: string; x5c?: string[] }

function decodePart<T>(value: string): T { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T; }

export class OidcJwksVerifier {
  private readonly discoveryCache = new Map<string, { jwksUri: string; expiresAt: number }>();
  private readonly keyCache = new Map<string, { keys: JwkRecord[]; expiresAt: number }>();
  constructor(private readonly fetcher: typeof fetch = fetch, private readonly cacheTtlMs = 5 * 60_000) {}

  private async jwksUri(issuer: string): Promise<string> {
    const cached = this.discoveryCache.get(issuer); if (cached && cached.expiresAt > Date.now()) return cached.jwksUri;
    const response = await this.fetcher(`${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`);
    if (!response.ok) throw new Error('OIDC_DISCOVERY_FAILED');
    const body = await response.json() as { jwks_uri?: string };
    if (!body.jwks_uri) throw new Error('OIDC_JWKS_URI_MISSING');
    this.discoveryCache.set(issuer, { jwksUri: body.jwks_uri, expiresAt: Date.now() + this.cacheTtlMs });
    return body.jwks_uri;
  }

  private async keys(uri: string): Promise<JwkRecord[]> {
    const cached = this.keyCache.get(uri); if (cached && cached.expiresAt > Date.now()) return cached.keys;
    const response = await this.fetcher(uri); if (!response.ok) throw new Error('OIDC_JWKS_FETCH_FAILED');
    const body = await response.json() as { keys?: JwkRecord[] };
    const keys = body.keys ?? []; if (!keys.length) throw new Error('OIDC_JWKS_EMPTY');
    this.keyCache.set(uri, { keys, expiresAt: Date.now() + this.cacheTtlMs }); return keys;
  }


  async health(issuer: string): Promise<{ ready: boolean; issuer: string; jwksUri?: string; keyCount: number; algorithms: string[]; detail: string }> {
    try {
      const jwksUri = await this.jwksUri(issuer);
      const keys = await this.keys(jwksUri);
      const algorithms = [...new Set(keys.map((key) => key.alg).filter((value): value is string => Boolean(value)))];
      return { ready: keys.length > 0, issuer, jwksUri, keyCount: keys.length, algorithms, detail: `${keys.length} signing key(s) discovered.` };
    } catch (error) {
      return { ready: false, issuer, keyCount: 0, algorithms: [], detail: error instanceof Error ? error.message : String(error) };
    }
  }

  async verify(token: string, provider: IdentityProviderConfig, tenantId: string): Promise<AuthenticatedPrincipal> {
    const parts = token.split('.'); if (parts.length !== 3) throw new Error('OIDC_TOKEN_MALFORMED');
    const [encodedHeader, encodedPayload, encodedSignature] = parts as [string,string,string];
    const header = decodePart<JwtHeader>(encodedHeader); if (header.alg !== 'RS256' || !header.kid) throw new Error('OIDC_ALGORITHM_NOT_ALLOWED');
    const claims = decodePart<ExternalIdentityClaims>(encodedPayload);
    const jwks = await this.keys(await this.jwksUri(provider.issuer));
    const jwk = jwks.find((candidate) => candidate.kid === header.kid && candidate.kty === 'RSA'); if (!jwk) throw new Error('OIDC_SIGNING_KEY_NOT_FOUND');
    const publicKey = createPublicKey({ key: jwk as unknown as import('node:crypto').JsonWebKey, format: 'jwk' });
    const valid = verify('RSA-SHA256', Buffer.from(`${encodedHeader}.${encodedPayload}`), publicKey, Buffer.from(encodedSignature, 'base64url'));
    if (!valid) throw new Error('OIDC_SIGNATURE_INVALID');
    return mapExternalClaims(provider, claims, tenantId);
  }
}
