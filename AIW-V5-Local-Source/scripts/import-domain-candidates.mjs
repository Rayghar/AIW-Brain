// Imports records of the core-banking domain candidate pack (made by build-domain-candidates.mjs) into a project as
// candidate knowledge, through the project's own governed commands, as the person who imports them (round 12, K).
// A record whose passage is held becomes one knowledge source (the exact passage, its locator, the pack's revision and
// the passage's licence; knowledge.source) and one candidate claim on its lines, in the shape the chapters read once
// released (knowledge.claim). Nothing is reviewed, released or activated: a different signed-in person must verify each
// claim (knowledge.review), and only a release pinned for the project, or for its organisation, offers it. A record
// whose passage is not held (every regulation record and product category) is skipped with why: its passage must come
// from a real source first. Re-running skips what is already there (each claim is tagged with the pack and the record).
// Usage: node scripts/import-domain-candidates.mjs [--pack candidate-sets/core-banking-domain-candidates.json]
//        [--records CBK-TOPIC-POSTING-INTEGRITY,...] [--base http://127.0.0.1:4173] [--project <id>]
//        [--account <id> --secret-env <VAR>] [--dry-run]
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {applyKnowledgeCommand} from '../public/knowledge-governance.js';
import {signIn} from './import-candidate-set.mjs';

const sha256 = s => createHash('sha256').update(s, 'utf8').digest('hex');
const tagOf = pack => 'candidate-pack:' + pack.packId, recordTag = r => 'record:' + r.id;
// What each record becomes: {source, claim} payloads, or the reason it cannot be imported yet.
export function domainCandidatePlan(pack, {ids = null} = {}) {
  if (pack?.schemaVersion !== 'aiw-domain-candidates-v1') throw Error('Choose a pack made by build-domain-candidates.mjs.');
  const wanted = ids ? new Set(ids) : null, plan = [], skipped = [];
  for (const r of pack.records) {
    if (wanted && !wanted.has(r.id)) continue;
    if (!r.passage?.held) { skipped.push({recordId: r.id, reason: 'Its passage is not held: attach the passage from a real source first (' + (r.sourcesNeeded || []).map(s => s.title + ', ' + s.section).join('; ') + ').'}); continue; }
    if (sha256(r.passage.text) !== r.passage.sha256) { skipped.push({recordId: r.id, reason: 'Its passage does not match its hash.'}); continue; }
    if (!r.claim?.statement) { skipped.push({recordId: r.id, reason: 'It has no claim to make.'}); continue; }
    const {lineStart, lineEnd, ...c} = r.claim;
    plan.push({recordId: r.id,
      source: {title: r.title.slice(0, 180), body: r.passage.text, path: r.passage.locator, revision: pack.revision, license: r.passage.licence},
      claim: {...c, lineStart, lineEnd, tags: [...c.tags, tagOf(pack), recordTag(r)]}});
  }
  return {plan, skipped};
}
const alreadyThere = (doc, pack, recordId) => (doc.knowledge?.claims || []).find(c => (c.tags || []).includes(tagOf(pack)) && (c.tags || []).includes('record:' + recordId));
// Applies the plan to a project document as one person (the suites, and a workbench that imports locally).
export function importDomainCandidates(input, pack, {ids = null, at = new Date().toISOString(), actor = 'local-review'} = {}) {
  const {plan, skipped} = domainCandidatePlan(pack, {ids}), created = [];
  let p = input;
  for (const x of plan) {
    const had = alreadyThere(p, pack, x.recordId);
    if (had) { skipped.push({recordId: x.recordId, reason: 'Already imported as ' + had.id + '.'}); continue; }
    const s = applyKnowledgeCommand(p, {type: 'knowledge.source', payload: x.source}, at, actor);
    const c = applyKnowledgeCommand(s.document, {type: 'knowledge.claim', payload: {...x.claim, sourceId: s.selected}}, at, actor);
    p = c.document; created.push({recordId: x.recordId, sourceId: s.selected, claimId: c.selected});
  }
  return {document: p, created, skipped};
}
// The same through a running workbench's command route, as the signed-in person.
export async function importDomainCandidatesRemote({base, pack, ids = null, projectId = null, cookie = '', dryRun = false, fetcher = fetch, log = () => {}}) {
  const {plan, skipped} = domainCandidatePlan(pack, {ids}), headers = {Origin: base, ...(cookie ? {Cookie: cookie} : {})};
  const call = async (route, body) => {
    const r = await fetcher(base + route, {method: body ? 'POST' : 'GET', headers: {...headers, ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})});
    const data = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(Error(data.error || ('The workbench answered ' + r.status + '.')), {status: r.status}); return data;
  };
  const current = await call('/api/project' + (projectId ? '?project=' + encodeURIComponent(projectId) : '')), q = '?project=' + encodeURIComponent(current.document.id);
  let revision = current.revision, doc = current.document;
  const command = async cmd => { const r = await call('/api/commands' + q, {revision, command: cmd}); revision = r.revision; doc = r.document; return r; };
  const created = [];
  for (const x of plan) {
    const had = alreadyThere(doc, pack, x.recordId);
    if (had) { skipped.push({recordId: x.recordId, reason: 'Already imported as ' + had.id + '.'}); continue; }
    if (dryRun) { created.push({recordId: x.recordId, claimId: '(would create)'}); continue; }
    const s = await command({type: 'knowledge.source', payload: x.source}), sourceId = s.document.knowledge.sources.at(-1).id;
    await command({type: 'knowledge.claim', payload: {...x.claim, sourceId}});
    created.push({recordId: x.recordId, sourceId, claimId: doc.knowledge.claims.at(-1).id}); log('claimed ' + x.recordId);
  }
  return {packId: pack.packId, project: current.document.id, dryRun, created, skipped, awaiting: 'Each claim is a candidate authored by the importing account. A different signed-in person must verify it before it can be released, pinned and offered.'};
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  const base = opt('base', 'http://127.0.0.1:4173'), pack = JSON.parse(readFileSync(opt('pack', 'candidate-sets/core-banking-domain-candidates.json'), 'utf8'));
  const account = opt('account', null), secretVar = opt('secret-env', null), ids = opt('records', null)?.split(',').filter(Boolean) || null;
  if (account && !(secretVar && process.env[secretVar])) throw Error('Pass --secret-env naming an environment variable that holds the account secret.');
  const cookie = account ? await signIn(base, account, process.env[secretVar]) : '';
  console.log(JSON.stringify(await importDomainCandidatesRemote({base, pack, ids, projectId: opt('project', null), cookie, dryRun: args.includes('--dry-run'), log: m => console.error(m)}), null, 2));
}
