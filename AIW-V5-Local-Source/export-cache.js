// The SDD builds the local server keeps (round 12, D-11: exports are cached per revision and built off the request path).
// The export thread (export-thread.js) holds one cache and hands it to the Worker's export route as env.EXPORT_CACHE;
// without it (the Cloudflare Worker, the suites that call the route directly) every export is built as before.
//
// A build is kept under a key that names everything it is made from: the account and the project, the project's
// revision and saved time, the assurance the route refreshes on every read (organisation releases and repository
// proofs can change, or expire, without a new revision), and the edition, audience and figures asked for. The same key
// always names the same build, so a kept build is the build the request would make; a new revision is a new key, and
// the least recently used builds are let go. A build is read, never changed, by the requests that share it.
import {digest} from './public/brain-integrity.js';

// The builds kept are bounded by their size (characters of Markdown, HTML, SVG and Mermaid text, and the bytes of the Word
// and PDF files the SDD route builds: workstream F), not their number: a project's whole set of exports (six editions,
// their HTML, the Mermaid edition) stays together, and the least recently used builds are let go first.
export const EXPORT_CACHE_CHARS = 200 * 1024 * 1024;
const weigh = value => typeof value === 'string' ? value.length : typeof value?.byteLength === 'number' ? value.byteLength : (value?.markdown?.length || 0) + (value?.figures?.figures || []).reduce((n, f) => n + (f.svg?.length || 0) + (f.text?.length || 0) + (f.mermaid?.length || 0), 0);
export function exportCache({chars = EXPORT_CACHE_CHARS} = {}) {
  const held = new Map();
  let size = 0, built = 0, reused = 0;
  return {
    get(key, build) {
      if (held.has(key)) { const entry = held.get(key); held.delete(key); held.set(key, entry); reused++; return entry.value; }
      const value = build(), weight = weigh(value); built++;
      held.set(key, {value, weight}); size += weight;
      for (const [oldest, entry] of held) { if (size <= chars || oldest === key) break; held.delete(oldest); size -= entry.weight; }
      return value;
    },
    has: key => held.has(key),
    state: () => ({entries: held.size, chars: size, built, reused})
  };
}
// What the route's refreshers write on every read (organization-service.js, repository-sync.js), as one fingerprint.
export function assuranceKey(p) {
  return digest({
    repositoryTrust: p.workspace?.repositoryTrust || null,
    releases: (p.knowledge?.repositorySync?.releases || []).map(r => [r.id, r.assurance || null]),
    organizations: (p.workbench?.catalogue || []).filter(e => e.organization).map(e => [e.id, e.organization.assurance || null])
  });
}
export const exportKey = (owner, projectId, row, project, parts) => JSON.stringify([owner, projectId, row.revision, row.updated_at, assuranceKey(project), ...parts]);
// build() through the cache the environment holds, or at once without one.
export const cachedBuild = (env, key, build) => env?.EXPORT_CACHE ? env.EXPORT_CACHE.get(key, build) : build();
