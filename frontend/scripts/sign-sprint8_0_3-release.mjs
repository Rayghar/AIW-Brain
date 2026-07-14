import { readFile, writeFile } from 'node:fs/promises';
import { generateKeyPairSync, createHash, sign, verify, createPublicKey } from 'node:crypto';
const releasePath = new URL('../data/sprint8_0_3-release.json', import.meta.url);
const signaturePath = new URL('../generated/sprint8_0_3-release.signature.json', import.meta.url);
const publicKeyPath = new URL('../generated/sprint8_0_3-release-verification-public-key.pem', import.meta.url);
const payload = await readFile(releasePath);
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
const signature = sign(null, payload, privateKey);
if (!verify(null, payload, createPublicKey(publicKeyPem), signature)) throw new Error('Signature self-verification failed');
const tampered = Buffer.concat([payload, Buffer.from('\n')]);
if (verify(null, tampered, createPublicKey(publicKeyPem), signature)) throw new Error('Tamper test failed');
const checksumSha256 = createHash('sha256').update(payload).digest('hex');
const publicKeyId = createHash('sha256').update(publicKeyPem).digest('hex').slice(0, 24);
const record = {
  releaseId: 'AIW-0.9.6',
  checksumSha256,
  signatureAlgorithm: 'Ed25519',
  publicKeyId,
  publicKeyPem,
  signatureBase64: signature.toString('base64'),
  signedBy: 'AIW Sprint 8.0.3 Reconciliation Release Authority',
  signedAt: new Date().toISOString(),
  verificationStatus: 'valid',
  tamperTest: 'rejected'
};
await writeFile(signaturePath, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o644 });
await writeFile(publicKeyPath, publicKeyPem, { mode: 0o644 });
console.log(JSON.stringify({ releaseId: record.releaseId, checksumSha256, publicKeyId, verification: 'valid', tamperTest: 'rejected' }, null, 2));
