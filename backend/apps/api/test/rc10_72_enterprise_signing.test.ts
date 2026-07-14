import { describe, expect, it } from 'vitest';
import { generateKeyPairSync, sign as signData } from 'node:crypto';
import { canonicalReleasePayload, generateKnowledgeReleaseKeyPair } from '../src/knowledgeReleaseSigning.js';
import {
  AwsKmsReleaseSigner,
  AzureKeyVaultReleaseSigner,
  GcpKmsReleaseSigner,
  LocalEd25519ReleaseSigner,
  VaultTransitReleaseSigner,
  signatureFingerprint,
  verifyEnterpriseSignature,
} from '../src/enterpriseReleaseSigning.js';

const ok = (value: unknown) => new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });

describe('rc.10.72 enterprise signing contract', () => {
  it('signs and independently verifies a release without retaining the private key in the envelope', async () => {
    const keys = generateKnowledgeReleaseKeyPair();
    const signer = new LocalEd25519ReleaseSigner(keys.privateKeyPem, 'rc10.72 independent validation');
    const release = { releaseId: 'AKR-0.10.72.0', artifacts: [{ id: 'CAMBRIDGE-SA-1.0', sha256: 'abc' }] };
    const signature = await signer.sign(release);
    const verified = await verifyEnterpriseSignature(release, signature, signer);
    expect(signature.algorithm).toBe('Ed25519');
    expect(signature.publicKeyPem).toContain('PUBLIC KEY');
    expect(JSON.stringify(signature)).not.toContain('PRIVATE KEY');
    expect(verified.verified).toBe(true);
    expect(signatureFingerprint(signature)).toHaveLength(64);
    expect((await verifyEnterpriseSignature({ ...release, changed: true }, signature, signer)).verified).toBe(false);
  });

  it('exercises the Vault Transit sign and verify adapter without granting local mutation authority', async () => {
    const release = { releaseId: 'AKR-VAULT', claims: ['c-1'] };
    const calls: string[] = [];
    const fetcher: typeof fetch = async (input, init) => {
      const url = String(input); calls.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.includes('/transit/sign/')) return ok({ data: { signature: 'vault:v1:c2lnbmF0dXJl' } });
      if (url.includes('/transit/verify/')) return ok({ data: { valid: true } });
      return new Response('', { status: 404 });
    };
    const signer = new VaultTransitReleaseSigner({ address: 'https://vault.example', token: 'test-token', keyName: 'aiw-release' }, fetcher);
    const signature = await signer.sign(release);
    const result = await verifyEnterpriseSignature(release, signature, signer);
    expect(signature.provider).toBe('vault-transit');
    expect(result.verified).toBe(true);
    expect(calls.some((item) => item.includes('/transit/sign/'))).toBe(true);
    expect(calls.some((item) => item.includes('/transit/verify/'))).toBe(true);
  });

  it('exercises Azure Key Vault and GCP KMS asymmetric signing with independent public-key verification', async () => {
    const release = { releaseId: 'AKR-CLOUD', artifacts: [{ sha256: 'def' }] };
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const signatureBase64 = signData('sha256', canonicalReleasePayload(release), privateKey).toString('base64');
    const jwk = publicKey.export({ format: 'jwk' });
    const pem = publicKey.export({ format: 'pem', type: 'spki' }).toString();

    const azureFetch: typeof fetch = async (input, init) => {
      if ((init?.method ?? 'GET') === 'POST') return ok({ value: Buffer.from(signatureBase64, 'base64').toString('base64url'), kid: 'https://vault.example/keys/aiw/v1' });
      return ok({ key: jwk, kid: 'https://vault.example/keys/aiw/v1' });
    };
    const azure = new AzureKeyVaultReleaseSigner({ vaultHost: 'vault.example', keyName: 'aiw', keyVersion: 'v1', accessToken: 'token' }, azureFetch);
    expect((await verifyEnterpriseSignature(release, await azure.sign(release), azure)).verified).toBe(true);

    const gcpFetch: typeof fetch = async (input) => String(input).endsWith(':asymmetricSign')
      ? ok({ signature: signatureBase64, name: 'projects/p/locations/l/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1' })
      : ok({ pem, name: 'projects/p/locations/l/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1' });
    const gcp = new GcpKmsReleaseSigner({ keyVersionResource: 'projects/p/locations/l/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1', accessToken: 'token' }, gcpFetch);
    expect((await verifyEnterpriseSignature(release, await gcp.sign(release), gcp)).verified).toBe(true);
  });

  it('exercises AWS KMS Sign and GetPublicKey request paths with independent verification', async () => {
    const release = { releaseId: 'AKR-AWS', artifacts: [{ sha256: 'ghi' }] };
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const signatureBase64 = signData('sha256', canonicalReleasePayload(release), privateKey).toString('base64');
    const publicKeyDer = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
    const fetcher: typeof fetch = async (_input, init) => {
      const target = new Headers(init?.headers).get('x-amz-target') ?? '';
      if (target.endsWith('.Sign')) return ok({ Signature: signatureBase64, KeyId: 'arn:aws:kms:eu-west-1:111:key/aiw', SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256' });
      if (target.endsWith('.GetPublicKey')) return ok({ PublicKey: publicKeyDer, KeyId: 'arn:aws:kms:eu-west-1:111:key/aiw' });
      return new Response('', { status: 400 });
    };
    const aws = new AwsKmsReleaseSigner({ keyId: 'arn:aws:kms:eu-west-1:111:key/aiw', region: 'eu-west-1', accessKeyId: 'AKIATEST', secretAccessKey: 'secret' }, fetcher);
    expect((await verifyEnterpriseSignature(release, await aws.sign(release), aws)).verified).toBe(true);
  });
});
