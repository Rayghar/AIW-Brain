import { readFile } from 'node:fs/promises';
import { createHash, verify } from 'node:crypto';
const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('data/sprint8_6-release.json', root), 'utf8'));
const signature = JSON.parse(await readFile(new URL('generated/sprint8_6-release.signature.json', root), 'utf8'));
let failures = 0;
for (const [file, expected] of Object.entries(manifest.files)) {
  const actual = createHash('sha256').update(await readFile(new URL(file, root))).digest('hex');
  const ok = actual === expected;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${file}`);
  if (!ok) failures += 1;
}
const signatureOk = verify(null, Buffer.from(JSON.stringify(manifest)), signature.publicKeyPem, Buffer.from(signature.signatureBase64, 'base64'));
console.log(`${signatureOk ? 'PASS' : 'FAIL'} Ed25519 release signature`);
if (!signatureOk) failures += 1;
if (failures) process.exit(1);
