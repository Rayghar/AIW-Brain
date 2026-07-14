import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const roots = ['apps', 'packages', 'data', 'database', 'scripts'];
const findings = [];
const patterns = [
  { name: 'OpenAI key', regex: /(?<![A-Za-z0-9_-])sk-[A-Za-z0-9_-]{20,}/g },
  { name: 'AWS access key', regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'Private key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'Plaintext password assignment', regex: /(?:password|passwd)\s*[:=]\s*["'][^"']{8,}["']/gi },
];
async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const full = join(path, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (/\.(?:ts|tsx|js|mjs|json|sql|md|env|example)$/.test(entry.name)) {
      const text = await readFile(full, 'utf8');
      for (const pattern of patterns) for (const match of text.matchAll(pattern.regex)) findings.push({ file: full, type: pattern.name, sample: match[0].slice(0, 12) + '…' });
    }
  }
}
for (const root of roots) await walk(root);
if (findings.length) { console.error(JSON.stringify(findings, null, 2)); process.exit(1); }
console.log('Security source scan passed: no credential-shaped values found.');
