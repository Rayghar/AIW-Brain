import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';
import type { KnowledgeReleaseSignature } from '@aiw/domain';

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([key,item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function canonicalReleasePayload(release: unknown): Buffer { return Buffer.from(canonical(release), 'utf8'); }
export function releaseChecksum(release: unknown): string { return createHash('sha256').update(canonicalReleasePayload(release)).digest('hex'); }

export function generateKnowledgeReleaseKeyPair(): { privateKeyPem: string; publicKeyPem: string; publicKeyId: string } {
  const pair = generateKeyPairSync('ed25519');
  const privateKeyPem = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const publicKeyPem = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  return { privateKeyPem, publicKeyPem, publicKeyId: createHash('sha256').update(publicKeyPem).digest('hex').slice(0, 24) };
}

export function signKnowledgeRelease(input: { releaseId: string; release: unknown; privateKeyPem: string; signedBy: string; signedAt?: string }): KnowledgeReleaseSignature {
  const privateKey = createPrivateKey(input.privateKeyPem);
  const publicKeyPem = createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }).toString();
  const publicKeyId = createHash('sha256').update(publicKeyPem).digest('hex').slice(0, 24);
  const signature = sign(null, canonicalReleasePayload(input.release), privateKey);
  const record: KnowledgeReleaseSignature = {
    releaseId: input.releaseId,
    checksumSha256: releaseChecksum(input.release),
    signatureAlgorithm: 'Ed25519',
    publicKeyId,
    publicKeyPem,
    signatureBase64: signature.toString('base64'),
    signedBy: input.signedBy,
    signedAt: input.signedAt ?? new Date().toISOString(),
    verificationStatus: 'unverified',
  };
  return { ...record, verificationStatus: verifyKnowledgeRelease(input.release, record) ? 'valid' : 'invalid' };
}

export function verifyKnowledgeRelease(release: unknown, signature: KnowledgeReleaseSignature): boolean {
  if (signature.signatureAlgorithm !== 'Ed25519') return false;
  if (releaseChecksum(release) !== signature.checksumSha256) return false;
  try { return verify(null, canonicalReleasePayload(release), createPublicKey(signature.publicKeyPem), Buffer.from(signature.signatureBase64, 'base64')); }
  catch { return false; }
}
