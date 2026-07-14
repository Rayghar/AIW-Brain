import { readFile, writeFile } from 'node:fs/promises';
import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';

const [releasePath, privateKeyPath, outputPath = `${releasePath}.signature.json`] = process.argv.slice(2);
if (!releasePath || !privateKeyPath) throw new Error('Usage: node scripts/sign-knowledge-release.mjs <release.json> <private-key.pem> [signature.json]');
const release = JSON.parse(await readFile(releasePath, 'utf8'));
const privateKey = createPrivateKey(await readFile(privateKeyPath, 'utf8'));
const canonical = (value) => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value && typeof value === 'object' ? `{${Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([key,item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}` : JSON.stringify(value);
const payload = Buffer.from(canonical(release));
const publicKeyPem = createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }).toString();
const signatureBase64 = sign(null, payload, privateKey).toString('base64');
const signature = {
  releaseId: release.releaseId ?? release.id ?? 'unknown-release', checksumSha256: createHash('sha256').update(payload).digest('hex'), signatureAlgorithm: 'Ed25519',
  publicKeyId: createHash('sha256').update(publicKeyPem).digest('hex').slice(0,24), publicKeyPem, signatureBase64,
  signedBy: process.env.AIW_RELEASE_SIGNER || 'external-release-signer', signedAt: new Date().toISOString(), verificationStatus: verify(null, payload, createPublicKey(publicKeyPem), Buffer.from(signatureBase64,'base64')) ? 'valid' : 'invalid',
};
await writeFile(outputPath, JSON.stringify(signature, null, 2));
console.log(JSON.stringify({ outputPath, releaseId: signature.releaseId, publicKeyId: signature.publicKeyId, verificationStatus: signature.verificationStatus }, null, 2));
