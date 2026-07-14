import { createHash, createPublicKey, verify } from 'node:crypto';
import { canonicalReleasePayload, releaseChecksum, signKnowledgeRelease } from './knowledgeReleaseSigning.js';
import { signAwsRequest } from './awsSigV4.js';

export type EnterpriseSignerProvider = 'local-ed25519' | 'vault-transit' | 'aws-kms' | 'azure-key-vault' | 'gcp-kms';
export interface EnterpriseSignature {
  provider: EnterpriseSignerProvider; keyId: string; algorithm: string; checksumSha256: string;
  signatureBase64: string; signedAt: string; publicKeyPem?: string; providerEvidence: Record<string, unknown>;
}
export interface EnterpriseReleaseSigner {
  provider: EnterpriseSignerProvider;
  sign(release: unknown): Promise<EnterpriseSignature>;
  health(): Promise<{ ready: boolean; detail: string }>;
  verify?(release: unknown, signature: EnterpriseSignature): Promise<{ verified: boolean; detail: string; publicKeyPem?: string }>;
}
type FetchLike = typeof fetch;
async function responseBody<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`SIGNER_HTTP_${response.status}:${(await response.text()).slice(0, 300)}`);
  return response.json() as Promise<T>;
}

export class LocalEd25519ReleaseSigner implements EnterpriseReleaseSigner {
  readonly provider = 'local-ed25519' as const;
  constructor(private readonly privateKeyPem: string, private readonly signedBy = 'aiw-release-service') {}
  async sign(release: unknown): Promise<EnterpriseSignature> {
    const result = signKnowledgeRelease({ releaseId: 'enterprise-release', release, privateKeyPem: this.privateKeyPem, signedBy: this.signedBy });
    return { provider: this.provider, keyId: result.publicKeyId, algorithm: result.signatureAlgorithm, checksumSha256: result.checksumSha256, signatureBase64: result.signatureBase64, signedAt: result.signedAt, publicKeyPem: result.publicKeyPem, providerEvidence: { verificationStatus: result.verificationStatus } };
  }
  async health() { return { ready: this.privateKeyPem.includes('PRIVATE KEY'), detail: 'Local Ed25519 reference signer' }; }
  async verify(release: unknown, signature: EnterpriseSignature) { const key = signature.publicKeyPem ?? ''; return { verified: Boolean(key) && independentlyVerifyPemSignature(release, signature, key), detail: 'Independent Ed25519 verification', ...(key ? { publicKeyPem: key } : {}) }; }
}

export class VaultTransitReleaseSigner implements EnterpriseReleaseSigner {
  readonly provider = 'vault-transit' as const;
  constructor(private readonly config: { address: string; token: string; keyName: string }, private readonly fetcher: FetchLike = fetch) {}
  async sign(release: unknown): Promise<EnterpriseSignature> {
    const payload = canonicalReleasePayload(release);
    const result = await responseBody<{ data: { signature: string } }>(await this.fetcher(`${this.config.address.replace(/\/$/, '')}/v1/transit/sign/${encodeURIComponent(this.config.keyName)}`, { method: 'POST', headers: { 'X-Vault-Token': this.config.token, 'content-type': 'application/json' }, body: JSON.stringify({ input: payload.toString('base64'), prehashed: false }) }));
    const [prefix, version, signature] = result.data.signature.split(':');
    if (!signature) throw new Error('VAULT_SIGNATURE_INVALID');
    return { provider: this.provider, keyId: this.config.keyName, algorithm: `${prefix}:${version}`, checksumSha256: releaseChecksum(release), signatureBase64: signature, signedAt: new Date().toISOString(), providerEvidence: { vaultSignature: result.data.signature } };
  }
  async health() {
    try { const response = await this.fetcher(`${this.config.address.replace(/\/$/, '')}/v1/sys/health`, { headers: { 'X-Vault-Token': this.config.token } }); return { ready: response.ok || response.status === 429, detail: `Vault HTTP ${response.status}` }; }
    catch (error) { return { ready: false, detail: error instanceof Error ? error.message : String(error) }; }
  }
  async verify(release: unknown, signature: EnterpriseSignature) {
    const payload = canonicalReleasePayload(release);
    const vaultSignature = String(signature.providerEvidence.vaultSignature ?? `${signature.algorithm}:${signature.signatureBase64}`);
    const result = await responseBody<{ data: { valid: boolean } }>(await this.fetcher(`${this.config.address.replace(/\/$/, '')}/v1/transit/verify/${encodeURIComponent(this.config.keyName)}`, { method: 'POST', headers: { 'X-Vault-Token': this.config.token, 'content-type': 'application/json' }, body: JSON.stringify({ input: payload.toString('base64'), signature: vaultSignature, prehashed: false }) }));
    return { verified: Boolean(result.data.valid) && releaseChecksum(release) === signature.checksumSha256, detail: 'Vault Transit verify endpoint' };
  }
}

export class AzureKeyVaultReleaseSigner implements EnterpriseReleaseSigner {
  readonly provider = 'azure-key-vault' as const;
  constructor(private readonly config: { vaultHost: string; keyName: string; keyVersion: string; accessToken: string }, private readonly fetcher: FetchLike = fetch) {}
  async sign(release: unknown): Promise<EnterpriseSignature> {
    const digest = Buffer.from(releaseChecksum(release), 'hex').toString('base64url');
    const result = await responseBody<{ value: string; kid: string }>(await this.fetcher(`https://${this.config.vaultHost}/keys/${encodeURIComponent(this.config.keyName)}/${encodeURIComponent(this.config.keyVersion)}/sign?api-version=7.4`, { method: 'POST', headers: { Authorization: `Bearer ${this.config.accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ alg: 'RS256', value: digest }) }));
    return { provider: this.provider, keyId: result.kid, algorithm: 'RS256', checksumSha256: releaseChecksum(release), signatureBase64: Buffer.from(result.value, 'base64url').toString('base64'), signedAt: new Date().toISOString(), providerEvidence: { kid: result.kid } };
  }
  async health() { return { ready: Boolean(this.config.accessToken), detail: `Azure Key Vault ${this.config.vaultHost}` }; }
  async verify(release: unknown, signature: EnterpriseSignature) {
    const result = await responseBody<{ key: { kty: string; n: string; e: string }; kid: string }>(await this.fetcher(`https://${this.config.vaultHost}/keys/${encodeURIComponent(this.config.keyName)}/${encodeURIComponent(this.config.keyVersion)}?api-version=7.4`, { headers: { Authorization: `Bearer ${this.config.accessToken}` } }));
    const key = createPublicKey({ key: result.key, format: 'jwk' });
    const verified = releaseChecksum(release) === signature.checksumSha256 && verify('sha256', canonicalReleasePayload(release), key, Buffer.from(signature.signatureBase64, 'base64'));
    return { verified, detail: `Azure public-key verification ${result.kid}` };
  }
}

export class GcpKmsReleaseSigner implements EnterpriseReleaseSigner {
  readonly provider = 'gcp-kms' as const;
  constructor(private readonly config: { keyVersionResource: string; accessToken: string }, private readonly fetcher: FetchLike = fetch) {}
  async sign(release: unknown): Promise<EnterpriseSignature> {
    const checksum = releaseChecksum(release);
    const result = await responseBody<{ signature: string; name?: string; verifiedDigestCrc32c?: boolean }>(await this.fetcher(`https://cloudkms.googleapis.com/v1/${this.config.keyVersionResource}:asymmetricSign`, { method: 'POST', headers: { Authorization: `Bearer ${this.config.accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ digest: { sha256: Buffer.from(checksum, 'hex').toString('base64') } }) }));
    return { provider: this.provider, keyId: result.name ?? this.config.keyVersionResource, algorithm: 'RSA_SIGN_PKCS1_2048_SHA256', checksumSha256: checksum, signatureBase64: result.signature, signedAt: new Date().toISOString(), providerEvidence: { ...(result.verifiedDigestCrc32c === undefined ? {} : { verifiedDigestCrc32c: result.verifiedDigestCrc32c }) } };
  }
  async health() { return { ready: Boolean(this.config.accessToken), detail: this.config.keyVersionResource }; }
  async verify(release: unknown, signature: EnterpriseSignature) {
    const result = await responseBody<{ pem: string; name?: string }>(await this.fetcher(`https://cloudkms.googleapis.com/v1/${this.config.keyVersionResource}/publicKey`, { headers: { Authorization: `Bearer ${this.config.accessToken}` } }));
    const verified = releaseChecksum(release) === signature.checksumSha256 && verify('sha256', canonicalReleasePayload(release), createPublicKey(result.pem), Buffer.from(signature.signatureBase64, 'base64'));
    return { verified, detail: `GCP KMS public-key verification ${result.name ?? this.config.keyVersionResource}`, publicKeyPem: result.pem };
  }
}

export class AwsKmsReleaseSigner implements EnterpriseReleaseSigner {
  readonly provider = 'aws-kms' as const;
  constructor(private readonly config: { keyId: string; region: string; accessKeyId: string; secretAccessKey: string; sessionToken?: string }, private readonly fetcher: FetchLike = fetch) {}
  async sign(release: unknown): Promise<EnterpriseSignature> {
    const checksum = releaseChecksum(release);
    const url = `https://kms.${this.config.region}.amazonaws.com/`;
    const requestBody = JSON.stringify({ KeyId: this.config.keyId, Message: Buffer.from(checksum, 'hex').toString('base64'), MessageType: 'DIGEST', SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256' });
    const headers = signAwsRequest({ method: 'POST', url, service: 'kms', region: this.config.region, accessKeyId: this.config.accessKeyId, secretAccessKey: this.config.secretAccessKey, ...(this.config.sessionToken ? { sessionToken: this.config.sessionToken } : {}), body: requestBody, headers: { 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': 'TrentService.Sign' } });
    const result = await responseBody<{ Signature: string; KeyId: string; SigningAlgorithm: string }>(await this.fetcher(url, { method: 'POST', headers, body: requestBody }));
    return { provider: this.provider, keyId: result.KeyId, algorithm: result.SigningAlgorithm, checksumSha256: checksum, signatureBase64: result.Signature, signedAt: new Date().toISOString(), providerEvidence: { region: this.config.region } };
  }
  async health() { return { ready: Boolean(this.config.accessKeyId && this.config.secretAccessKey), detail: `AWS KMS ${this.config.region}` }; }
  async verify(release: unknown, signature: EnterpriseSignature) {
    const url = `https://kms.${this.config.region}.amazonaws.com/`;
    const requestBody = JSON.stringify({ KeyId: this.config.keyId });
    const headers = signAwsRequest({ method: 'POST', url, service: 'kms', region: this.config.region, accessKeyId: this.config.accessKeyId, secretAccessKey: this.config.secretAccessKey, ...(this.config.sessionToken ? { sessionToken: this.config.sessionToken } : {}), body: requestBody, headers: { 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': 'TrentService.GetPublicKey' } });
    const result = await responseBody<{ PublicKey: string; KeyId: string }>(await this.fetcher(url, { method: 'POST', headers, body: requestBody }));
    const publicKeyDer = Buffer.from(result.PublicKey, 'base64');
    const key = createPublicKey({ key: publicKeyDer, format: 'der', type: 'spki' });
    const verified = releaseChecksum(release) === signature.checksumSha256 && verify('sha256', canonicalReleasePayload(release), key, Buffer.from(signature.signatureBase64, 'base64'));
    return { verified, detail: `AWS KMS GetPublicKey verification ${result.KeyId}`, publicKeyPem: key.export({ format: 'pem', type: 'spki' }).toString() };
  }
}

export function independentlyVerifyPemSignature(release: unknown, signature: EnterpriseSignature, publicKeyPem: string): boolean {
  try {
    const algorithm = signature.algorithm.toLowerCase().includes('ed25519') ? null : 'sha256';
    return releaseChecksum(release) === signature.checksumSha256
      && verify(algorithm, canonicalReleasePayload(release), createPublicKey(publicKeyPem), Buffer.from(signature.signatureBase64, 'base64'));
  } catch { return false; }
}
export function signatureFingerprint(signature: EnterpriseSignature): string { return createHash('sha256').update(JSON.stringify(signature)).digest('hex'); }


export async function verifyEnterpriseSignature(release: unknown, signature: EnterpriseSignature, signer?: EnterpriseReleaseSigner): Promise<{ verified: boolean; detail: string; publicKeyPem?: string }> {
  if (releaseChecksum(release) !== signature.checksumSha256) return { verified: false, detail: 'Release checksum does not match signature envelope.' };
  if (signature.publicKeyPem) return { verified: independentlyVerifyPemSignature(release, signature, signature.publicKeyPem), detail: 'Embedded public key verification', publicKeyPem: signature.publicKeyPem };
  if (!signer?.verify) return { verified: false, detail: `Independent verification adapter unavailable for ${signature.provider}.` };
  return signer.verify(release, signature);
}
