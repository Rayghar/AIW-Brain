import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = JSON.parse(await fs.readFile(path.join(root, 'data', 'sprint7_6-trusted-sources.json'), 'utf8'));
const enabled = process.env.AIW_ENABLE_KNOWLEDGE_REFRESH === 'true';
if (!enabled) {
  console.error('Knowledge refresh is disabled. Set AIW_ENABLE_KNOWLEDGE_REFRESH=true to retrieve metadata from the approved allowlist.');
  process.exit(3);
}
const sources = registry.sources.filter((source) => source.status === 'approved' && source.ingestionMode === 'allowlisted-refresh' && source.url.startsWith('https://'));
const proposals = [];
for (const source of sources) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(source.url, { headers: { 'user-agent': 'AIW-Knowledge-Refresh/0.8.8' }, signal: controller.signal, redirect: 'follow' });
    const body = new Uint8Array(await response.arrayBuffer());
    const limited = body.slice(0, Math.min(body.length, 65_536));
    proposals.push({
      sourceId: source.id,
      retrievedAt: new Date().toISOString(),
      finalUrl: response.url,
      httpStatus: response.status,
      contentType: response.headers.get('content-type'),
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
      contentLength: body.length,
      sampleSha256: crypto.createHash('sha256').update(limited).digest('hex'),
      reviewStatus: 'pending-human-review',
      note: 'Metadata and a non-reversible content fingerprint were captured. No knowledge record is changed automatically.',
    });
  } catch (error) {
    proposals.push({ sourceId: source.id, retrievedAt: new Date().toISOString(), error: error instanceof Error ? error.message : String(error), reviewStatus: 'retrieval-failed' });
  } finally {
    clearTimeout(timeout);
  }
}
const output = path.join(root, 'generated', 'knowledge-refresh');
await fs.mkdir(output, { recursive: true });
await fs.writeFile(path.join(output, 'refresh-proposals.json'), JSON.stringify({ version: '0.8.8', generatedAt: new Date().toISOString(), proposals }, null, 2) + '\n');
console.log(`Staged ${proposals.length} allowlisted source refresh proposal(s). No library changes were applied.`);
