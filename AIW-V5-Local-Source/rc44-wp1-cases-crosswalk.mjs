// rc44, work package 1, slice S2 (audit/rc44/design/wp1-knowledge.md, section g): the crosswalk and one identity.
// A crosswalk row (knowledge.crosswalk[], KA) maps another id of a mechanism (a Playbook entry, a catalogue record, a
// built-in comparison option, a handbook entry) onto the concept id of the register. One resolver (resolveConcept).
// What these cases hold:
//   - a row that is proposed, verified by its own author, or verified and in no release never resolves an identity and
//     reaches no score, hard constraint, eligibility gate or conformance reading (candidate knowledge is inert);
//   - the review of a row is a second person's step stated on its command (S0's `second`; the lead's rulings D1 and
//     D7.1): refused for its author, its last editor, an agent account, a draft by Sol and an import, and for a person
//     when no other person stands behind the row as it stands until a person confirms it (ruling F4);
//   - a draft by Sol proposes rows and nothing else; targetContent is the server's, never the client's;
//   - the private table MAPPINGS of knowledge-coverage.js is retired, with parity for its 16 catalogue ids;
//   - the seed (candidate-sets/crosswalk-seed.json) is built from the product's own Playbook and catalogue only, every
//     row proposed, none verified;
//   - a document with no crosswalk row reads as it did (findings, stamps, fingerprint, SDD, release checksums).
// Synthetic fixtures only. Nothing here is knowledge; productionAccepted stays false.
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as F from './rc44-wp1-knowledge-fixtures.mjs';
import * as R from './rc44-s0-readings.mjs';
import * as K from './public/knowledge-governance.js';
import * as rv from './public/review-domain.js';
import {designReadings, moved, graft} from './rc44-wp1-cases-forms.mjs';
import {knowledgeConceptCoverage} from './public/knowledge-coverage.js';
import {createProject} from './shared/projects-domain.js';
import {sha256} from './public/brain-integrity.js';
import {architectureOptions} from './public/architecture-knowledge.js';
import {PATTERNS, ANTI_PATTERNS, STYLES} from './public/playbook-knowledge.js';
import {catalogue} from './public/catalogue-store.js';
import {catalogueMark} from './public/catalogue-curation.js';
import {isReviewCommand} from './authorship.js';
import {neutraliseImportedAuthority} from './recovery-service.js';

const AT = F.AT, clone = v => structuredClone(v);
const mods = async () => ({CF: await import('./public/concept-form.js'), KC: await import('./public/knowledge-concepts.js'), CC: await import('./public/knowledge-concept-commands.js')});
const TYPES = ['knowledge.crosswalk', 'knowledge.crosswalk-confirm', 'knowledge.crosswalk-review', 'knowledge.crosswalk-retire'];
const PACKAGE = 'p10-knowledge';
export const cases = [];
const add = (name, run) => cases.push({name, run});

// ------------------------------------------------------------------------------------------------ the synthetic library
// A short entry written for these cases (no handbook text): the strangler fig, whose catalogue record PAT-STRANGLER-FIG
// is the concept's id (design b.1: where a catalogue record is the same mechanism, the concept takes that id).
const SYN_S001 = [
  '# SYN-S001 Strangler fig',
  'Synthetic Integration Handbook | pattern | Incremental replacement',
  '',
  '## Definition',
  'A strangler fig replaces a legacy system one capability at a time, routing each migrated capability to the new system while the rest stays on the old one.',
  'The legacy system is retired only after its last capability has moved.'
];
const STRANGLER = {conceptId: 'PAT-STRANGLER-FIG', title: 'Strangler fig', kind: 'pattern', family: 'Incremental replacement', scope: ['component'], stages: [5], lenses: [], steward: 'Integration guild', reviewDue: '2027-11-16', reviewTriggers: [], notAdopted: [], forms: []};
const DEFINITION = {sourceId: null, lineStart: 5, lineEnd: 6, subjectId: 'PAT-STRANGLER-FIG', predicate: 'is defined as', statement: 'A strangler fig replaces a legacy system one capability at a time.', claimType: 'definition', polarity: 'neutral', conditions: [], limitations: [], tags: ['form:definition'],
  form: {type: 'definition', v: 1, short: 'A legacy system is replaced one capability at a time; the legacy system is retired after its last capability moved.', quotes: [{field: 'short', quote: 'replaces a legacy system one capability at a time'}]}};
const LIBRARY_MARK = {enabled: true, reason: 'This project authors one tranche of the synthetic handbook.', reviewer: 'Synthetic steward', reviewed: true};
const CONCEPT_REVIEW = {decision: 'verified', reviewer: 'Synthetic second person', reason: 'Checked the identity, each form and its membership.', reviewed: true, identityChecked: true, formsChecked: true, crosswalkChecked: true};
const ROW_REVIEW = {decision: 'verified', reviewer: 'Synthetic second person', reason: 'Checked the alias against the Playbook entry and the catalogue record.', reviewed: true, aliasChecked: true};
const PERSON_STEP = {reviewer: 'Synthetic steward', reason: 'Checked the row as it reads.', reviewed: true};
const P_STRANGLER = {conceptId: 'PAT-STRANGLER-FIG', scheme: 'playbook', aliasId: 'P-STRANGLER', label: 'Strangler (SA Playbook)', relation: 'same', note: 'The Playbook names the catalogue record Strangler Fig.'};

// A knowledge library behind the real boundary (worker.js, POST /api/commands), so that the server's author, its
// stamps and the design packages' boundary (design-extension-boundary.js) are the ones every request meets. `importer`
// owns it; the other accounts are editors; `bot` is an agent account.
async function service() {
  const {default: worker} = await import('./worker.js'), {localDatabase} = await import('./local-db.js');
  const files = new Map(), env = {AIW_AGENT_ACTORS: 'bot', DB: localDatabase(':memory:'), FILES: {async put(k, v) { files.set(k, v); }, async get(k) { return files.has(k) ? {text: async () => files.get(k)} : null; }, async delete(k) { files.delete(k); }}, ASSETS: {fetch: () => new Response('asset')}};
  const api = async (path, body, as = 'importer') => { const r = await worker.fetch(new Request('https://aiw.test' + path, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': as, Origin: 'https://aiw.test', ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env); let data = null; try { data = await r.json(); } catch { data = null; } return {status: r.status, data}; };
  const created = await api('/api/projects', {name: 'Northquay knowledge library', template: 'blank'}); assert(created.status < 300, JSON.stringify(created.data)); const projectId = created.data.document.id;
  for (const actor of ['reviewer', 'releaser', 'architect', 'steward', 'second-architect', 'bot']) await env.DB.prepare('INSERT INTO project_access(owner_id,project_id,actor_id,role,created_at) VALUES(?,?,?,?,?)').bind('importer', projectId, actor, 'editor', AT).run();
  let state = created.data;
  const send = async (type, payload, as = 'importer', extra = {}) => { const r = await api('/api/commands?project=' + projectId, {revision: state.revision, command: {type, payload}, ...extra}, as); if (r.status === 200) state = r.data; return r; };
  const ok = async (...args) => { const r = await send(...args); assert.equal(r.status, 200, args[0] + ' by ' + (args[2] || 'importer') + ': ' + JSON.stringify(r.data).slice(0, 400)); return r.data.selected; };
  const refused = async (pattern, ...args) => { const before = JSON.stringify(state.document); const r = await send(...args); assert.notEqual(r.status, 200, args[0] + ' by ' + (args[2] || 'importer') + ' ' + JSON.stringify(args[3] || {}) + ' was accepted'); assert.match(String(r.data?.error || r.data?.reason || JSON.stringify(r.data)), pattern, args[0] + ' by ' + (args[2] || 'importer')); assert.equal(JSON.stringify(state.document), before, 'a refused request writes nothing'); return r; };
  return {send, ok, refused, api, projectId, get document() { return state.document; }, set state(v) { state = v; }, get state() { return state; }, close: () => env.DB.close?.()};
}
// The library with the strangler fig as a reviewed concept (its definition verified by `reviewer`), and, as asked, a
// second draft concept; then rows proposed through `row`, and the release of the concept's forms by `releaser`.
async function strangler({second = false} = {}) {
  const S = await service();
  await S.ok('knowledge.library', LIBRARY_MARK, 'importer');
  const sourceId = await S.ok('knowledge.source', F.sourcePayload('SYN-S001 Strangler fig', SYN_S001), 'importer');
  const conceptRecordId = await S.ok('knowledge.concept', STRANGLER, 'importer');
  const definition = await S.ok('knowledge.claim', {...DEFINITION, sourceId}, 'importer');
  await S.ok('knowledge.concept', {...STRANGLER, id: conceptRecordId, forms: [{type: 'definition', claimId: definition}]}, 'importer');
  await S.ok('knowledge.review', {...F.REVIEW, formChecked: true, id: definition}, 'reviewer');
  await S.ok('knowledge.concept-review', {...CONCEPT_REVIEW, id: conceptRecordId}, 'reviewer');
  if (second) await S.ok('knowledge.concept', {...STRANGLER, conceptId: 'PAT-ADAPTER', title: 'Adapter'}, 'importer');
  // (ruling P5 c: a release holds the verified rows the concept's standing review saw, so the concept is reviewed again, by
  // the same second person, once its rows are verified, before its release)
  const reviewAgain = () => S.ok('knowledge.concept-review', {...CONCEPT_REVIEW, id: conceptRecordId}, 'reviewer');
  const release = async ({again = true} = {}) => { if (again) await reviewAgain(); const id = await S.ok('knowledge.release', {...F.REVIEW, title: 'Synthetic strangler fig 1', claimIds: [definition]}, 'releaser'); await S.ok('knowledge.activate', {...F.REVIEW, id, stamp: K.knowledgeStamp(S.document)}, 'releaser'); return id; };
  return {S, sourceId, conceptRecordId, definition, release, reviewAgain};
}
// Another concept of the same library, registered, defined on the synthetic passage, reviewed and released by a third
// person, its release active.
async function releasedConcept(S, sourceId, conceptId, title) {
  const record = await S.ok('knowledge.concept', {...STRANGLER, conceptId, title}, 'importer');
  const claim = await S.ok('knowledge.claim', {...DEFINITION, sourceId, subjectId: conceptId}, 'importer');
  await S.ok('knowledge.concept', {...STRANGLER, conceptId, title, id: record, forms: [{type: 'definition', claimId: claim}]}, 'importer');
  await S.ok('knowledge.review', {...F.REVIEW, formChecked: true, id: claim}, 'reviewer'); await S.ok('knowledge.concept-review', {...CONCEPT_REVIEW, id: record}, 'reviewer');
  const id = await S.ok('knowledge.release', {...F.REVIEW, title: 'Synthetic ' + title + ' 1', claimIds: [claim]}, 'releaser'); await S.ok('knowledge.activate', {...F.REVIEW, id, stamp: K.knowledgeStamp(S.document)}, 'releaser');
  return {record, claim, release: id};
}
const rows = d => d.knowledge?.crosswalk || [];
const row = (d, id) => rows(d).find(r => r.id === id);

// ------------------------------------------------------------------------------------------------ 0 (ruling I2)
add('S2.0 (ruling I2, the first item of this slice): the structured unit of an applicability form is read by the number rule: its mechanism, rationale, obligation and every other text states a number only where a quote of the form holds it, at knowledge.claim and on every read', async () => {
  const {CF, CC, KC} = await mods(), all = F.p001Forms(), f = all.applicability, ctx = {excerpt: F.SYN_P001.slice(f.passage[0] - 1, f.passage[1]).join('\n'), lineStart: f.passage[0]};
  const claim = unit => ({statement: f.statement, conditions: f.conditions, limitations: f.limitations, architectureUnit: unit});
  assert.deepEqual(CF.conceptFormIssues(f.content, {...ctx, claim: claim(F.UNIT)}), [], 'the fixture unit states no number');
  const probes = [[u => { u.mechanism += ' A relay runs within 7 seconds.'; }, /architectureUnit\.mechanism states the number 7, which no quote of the form contains/],
    [u => { u.effects[0].rationale += ' Measured at 99.95 percent.'; }, /architectureUnit\.effects\[0\]\.rationale states the number 99\.95/],
    [u => { u.obligations[0].action = 'Receivers keep 30 days of identities.'; }, /architectureUnit\.obligations\[0\]\.action states the number 30/],
    [u => { u.obligations[0].evidence += ' Over 1000 bookings.'; }, /architectureUnit\.obligations\[0\]\.evidence states the number 1000/],
    [u => { u.exclusions = ['Not above 12 carriers.']; }, /architectureUnit\.exclusions\[0\] states the number 12/],
    [u => { u.placement[0].reason += ' Within ４ seconds.'; }, /architectureUnit\.placement\[0\]\.reason states the number 4/]];
  for (const [change, pattern] of probes) { const u = clone(F.UNIT); change(u); assert.match(CF.conceptFormIssues(f.content, {...ctx, claim: claim(u)}).join(' '), pattern); }
  // A number a quote of the form holds is the source's: a unit may state it.
  { const excerpt = 'Use the outbox where a booking must lead to a notice within 2 retries of the relay.', form = {type: 'applicability', v: 1, useWhen: [{text: 'A booking must lead to a notice within 2 retries.', at: [1, 1], quote: 'a booking must lead to a notice within 2 retries'}]}, u = clone(F.UNIT); u.mechanism += ' Within 2 retries.';
    assert.doesNotMatch(CF.conceptFormIssues(form, {excerpt, lineStart: 1, claim: {statement: 'Use it.', conditions: ['A booking.'], limitations: ['None.'], architectureUnit: u}}).join(' '), /architectureUnit/, 'a number a quote holds'); }
  // At the command: a person's form claim whose unit states a threshold no quote holds is refused, and nothing is written.
  const k = (doc, type, payload, actor = 'importer') => CC.applyConceptCommand(doc, {type: 'knowledge.' + type, payload}, AT, actor, F.person(actor)).document;
  let p = k(F.blankProject(), 'library', LIBRARY_MARK, 'steward'); p = k(p, 'source', F.sourcePayload('SYN-P001 Transactional outbox', F.SYN_P001)); const sourceId = p.knowledge.sources[0].id;
  p = k(p, 'concept', {conceptId: 'SYN-P001', title: 'Transactional outbox', kind: 'pattern', family: 'Reliable publication', scope: [], stages: [], lenses: [], forms: []});
  { const u = clone(F.UNIT); u.mechanism += ' A relay runs within 7 seconds.'; assert.throws(() => k(p, 'claim', {...F.formClaim(sourceId, 'SYN-P001', f), architectureUnit: u}), /architectureUnit\.mechanism states the number 7, which no quote of the form contains/); }
  p = k(p, 'claim', F.formClaim(sourceId, 'SYN-P001', f)); const id = p.knowledge.claims.at(-1).id;
  // On every read: a unit changed in the document afterwards makes the form unusable, and the reading says why.
  assert.deepEqual(KC.formIssues(p.knowledge.claims.at(-1)), []);
  const q = clone(p); q.knowledge.claims.find(c => c.id === id).architectureUnit.mechanism += ' Within 7 seconds.';
  assert.match(KC.formIssues(q.knowledge.claims.find(c => c.id === id)).join(' '), /architectureUnit\.mechanism states the number 7/);
  assert.match(KC.formStatus(q, {claim: q.knowledge.claims.find(c => c.id === id)}).reasons.join(' '), /The form is invalid: .*architectureUnit\.mechanism states the number 7/);
});

// ------------------------------------------------------------------------------------------------ 1 (fails today)
add('S2.1 (fails today): resolveConcept(p, "P-STRANGLER") is null while the row is proposed, while it reads verified by its own author, and while a second person verified it and no release holds it; once its concept is released with it and the release is active, it is PAT-STRANGLER-FIG, governed; deactivated, it is null again', async () => {
  const {KC} = await mods(), {S, release} = await strangler();
  try {
    assert.equal(typeof KC.resolveConcept, 'function', 'resolveConcept exists');
    assert.equal(KC.resolveConcept(S.document, 'P-STRANGLER'), null, 'no row: nothing resolves');
    const id = await S.ok('knowledge.crosswalk', P_STRANGLER, 'architect');
    assert.match(id, /^KA-\d{4}$/); assert.equal(KC.crosswalkRecords(S.document).find(r => r.id === id).state, 'proposed');
    assert.equal(KC.resolveConcept(S.document, 'P-STRANGLER'), null, 'proposed: nothing resolves');
    // Verified by its own author, as a document could say it (written into it): the review does not stand.
    { const q = clone(S.document), r = row(q, id); r.review = {decision: 'verified', actor: 'architect', account: 'person', reviewer: 'Architect', at: AT, reason: 'Mine.', aliasChecked: true, rowHash: KC.crosswalkRowHash(r)};
      assert.equal(KC.crosswalkRecords(q).find(x => x.id === id).state, 'proposed', 'a review by the row\'s author is no review'); assert.equal(KC.resolveConcept(q, 'P-STRANGLER'), null); }
    await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, id}, 'reviewer');
    assert.equal(KC.crosswalkRecords(S.document).find(r => r.id === id).state, 'verified');
    assert.equal(KC.resolveConcept(S.document, 'P-STRANGLER'), null, 'verified, in no release: nothing resolves');
    const releaseId = await release(), held = S.document.knowledge.releases.find(r => r.id === releaseId);
    assert.deepEqual(held.parts.crosswalk.map(r => [r.id, r.aliasId, r.conceptId, r.review.decision]), [[id, 'P-STRANGLER', 'PAT-STRANGLER-FIG', 'verified']], 'the release holds the verified row of its concept');
    { const {checksum, ...rest} = held; assert.equal(checksum, (await import('./public/brain-integrity.js')).digest(rest), 'the release checksum covers its parts'); }
    assert.deepEqual(KC.resolveConcept(S.document, 'P-STRANGLER'), {conceptId: 'PAT-STRANGLER-FIG', relation: 'same', via: {scheme: 'playbook', aliasId: 'P-STRANGLER', rowId: id, releaseId}, authority: 'governed'});
    assert.deepEqual(KC.resolveConcept(S.document, 'PAT-STRANGLER-FIG'), {conceptId: 'PAT-STRANGLER-FIG', relation: 'same', via: {scheme: 'concept', aliasId: 'PAT-STRANGLER-FIG', rowId: null, releaseId}, authority: 'governed'}, 'a released concept is its own identity');
    assert.equal(KC.resolveConcept(S.document, 'P-ADAPTER'), null, 'another Playbook entry resolves to nothing');
    // The concept view lists its aliases with their standing.
    assert.deepEqual(KC.conceptReading(S.document, 'PAT-STRANGLER-FIG').aliases.filter(a => a.authority === 'governed').map(a => [a.scheme, a.aliasId, a.relation, a.state, a.targetContent]), [['playbook', 'P-STRANGLER', 'same', 'released', 'template']]);
    // Fail closed: a tampered copy in the release, the release deactivated, the row retired here.
    { const q = clone(S.document); q.knowledge.releases.find(r => r.id === releaseId).parts.crosswalk[0].conceptId = 'PAT-ADAPTER'; assert.equal(KC.resolveConcept(q, 'P-STRANGLER'), null, 'a release whose parts were changed resolves nothing'); }
    await S.ok('knowledge.crosswalk-retire', {...PERSON_STEP, id}, 'steward'); assert.equal(KC.resolveConcept(S.document, 'P-STRANGLER'), null, 'a row retired in this project resolves nothing, even from its release');
    assert.equal(KC.crosswalkRecords(S.document).find(r => r.id === id).state, 'retired');
  } finally { S.close(); }
  { const {S, release} = await strangler();
    try { const id = await S.ok('knowledge.crosswalk', P_STRANGLER, 'architect'); await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, id}, 'reviewer'); const releaseId = await release();
      assert.equal(KC.resolveConcept(S.document, 'P-STRANGLER').conceptId, 'PAT-STRANGLER-FIG');
      await S.ok('knowledge.deactivate', {...F.REVIEW, id: releaseId, stamp: K.knowledgeStamp(S.document)}, 'releaser'); assert.equal(KC.resolveConcept(S.document, 'P-STRANGLER'), null, 'a release that is not active resolves nothing'); }
    finally { S.close(); } }
});

// ------------------------------------------------------------------------------------------------ 2
// The methods knowledgeConceptCoverage answered for the 16 catalogue ids of MAPPINGS on the start commit 5cae40a (scratch
// capture: a blank project, and the same with the method pack MS-CACHE-ASIDE withdrawn): [topic/option, SHA-256 of the
// methods as JSON on each of the two projects].
const PARITY = {'PAT-CACHE-ASIDE': ['reads/cache-aside', '338b0b74112d49e16703208efe598abe8670a8126450637b3a98813fdd1a1317', '32e14edd6df2e753d54b75a400bd636ac0b2a21bfce6a242a56219efabb3e9ee'], 'PAT-TRANSACTIONAL-OUTBOX': ['delivery/transactional-outbox', '231debd690782ed6059ee46ad8f2e710d3b48089d7b740567eac2cc81f9a28a5', '231debd690782ed6059ee46ad8f2e710d3b48089d7b740567eac2cc81f9a28a5'], 'PAT-CIRCUIT-BREAKER': ['resilience/protected-call', '62a49c03547274242e80da219d7d4729dc72ffd18140863ad80f512980d1562b', '62a49c03547274242e80da219d7d4729dc72ffd18140863ad80f512980d1562b'], 'PAT-BULKHEAD': ['resilience/protected-call', '62a49c03547274242e80da219d7d4729dc72ffd18140863ad80f512980d1562b', '62a49c03547274242e80da219d7d4729dc72ffd18140863ad80f512980d1562b'], 'PAT-RETRY-WITH-BACKOFF': ['resilience/bounded-call', 'b2f7b7189e8688cc91234760a7f771a43c9e997b86cd12ff47db87d6f66c7bad', 'b2f7b7189e8688cc91234760a7f771a43c9e997b86cd12ff47db87d6f66c7bad'], 'PAT-SHARDING': ['partitioning/sharded', 'a310ac17bfbc11a4006df90287b67bff53078e3fd924ca165e4ed26656e8b8b4', 'a310ac17bfbc11a4006df90287b67bff53078e3fd924ca165e4ed26656e8b8b4'], 'STYLE-LAYERED': ['structure/layered-module', '1852358abac3dc0fa7949d86237d12109580bdde4384a8cbf90c5d5f2f97ee9d', '1852358abac3dc0fa7949d86237d12109580bdde4384a8cbf90c5d5f2f97ee9d'], 'PAT-LAYERED-ARCHITECTURE': ['structure/layered-module', '1852358abac3dc0fa7949d86237d12109580bdde4384a8cbf90c5d5f2f97ee9d', '1852358abac3dc0fa7949d86237d12109580bdde4384a8cbf90c5d5f2f97ee9d'], 'STYLE-MODULAR-MONOLITH': ['structure/layered-module', '1852358abac3dc0fa7949d86237d12109580bdde4384a8cbf90c5d5f2f97ee9d', '1852358abac3dc0fa7949d86237d12109580bdde4384a8cbf90c5d5f2f97ee9d'], 'PAT-MODULAR-MONOLITH': ['structure/layered-module', '1852358abac3dc0fa7949d86237d12109580bdde4384a8cbf90c5d5f2f97ee9d', '1852358abac3dc0fa7949d86237d12109580bdde4384a8cbf90c5d5f2f97ee9d'], 'STYLE-MICROSERVICES': ['structure/service-boundaries', 'c7c3765b2644c7e71d36212523e51d695b0c7a3fa408f5df25a995534ebee519', 'c7c3765b2644c7e71d36212523e51d695b0c7a3fa408f5df25a995534ebee519'], 'PAT-REQUEST-REPLY': ['interaction/request-reply', '8314e71d89d6d7a8c4647260c1bf16a431fec7103dccab2a63e5b5fde97695d2', '8314e71d89d6d7a8c4647260c1bf16a431fec7103dccab2a63e5b5fde97695d2'], 'PAT-QUEUE-BASED-LOAD-LEVELING': ['interaction/durable-queue', '3fcc6f8e27db180d9d9da699d9d43d73b4e4f62436cf87cb8634f9879668bd9d', '3fcc6f8e27db180d9d9da699d9d43d73b4e4f62436cf87cb8634f9879668bd9d'], 'ARCH-RELATIONAL-DATA-CAPABILITY': ['persistence/relational-transaction', 'b2300197f06087e7573b519ecfb70dd31401133fed6ea6ded928eabadc06c9f5', 'b2300197f06087e7573b519ecfb70dd31401133fed6ea6ded928eabadc06c9f5'], 'PAT-DOCUMENT-STORE': ['persistence/aggregate-document', '9a949dde770447956d76dc963450b6c036d6d3dfac2fe91c91f392f7f5e85316', '9a949dde770447956d76dc963450b6c036d6d3dfac2fe91c91f392f7f5e85316'], 'ARCH-DOCUMENT-DATA-CAPABILITY': ['persistence/aggregate-document', '9a949dde770447956d76dc963450b6c036d6d3dfac2fe91c91f392f7f5e85316', '9a949dde770447956d76dc963450b6c036d6d3dfac2fe91c91f392f7f5e85316']};
add('S2.2 (migration, ruling J6): MAPPINGS of knowledge-coverage.js is retired in favour of the built-in crosswalk: for each of its 16 catalogue ids knowledgeConceptCoverage answers the methods it answered on the start commit, on two projects; the table no longer exists; the built-in rows are navigation only', async () => {
  const {KC} = await mods(), XW = await import('./public/knowledge-crosswalk.js');
  const blank = createProject({name: 'Synthetic museum reading evidence', template: 'blank'}, 'coverage-museum', '2026-10-21T12:00:00.000Z');
  const review = {reviewed: true, reviewer: 'Synthetic independent curator', reason: 'Checked.', sourceChecked: true, rightsChecked: true, conditionsChecked: true, decision: 'verified'};
  const withdrawn = K.applyKnowledgeCommand(blank, {type: 'knowledge.withdraw', payload: {...review, id: 'MS-CACHE-ASIDE', stamp: K.knowledgeImpactStamp(blank, 'MS-CACHE-ASIDE')}}, '2026-10-21T12:00:00.000Z', 'coverage-author').document;
  assert.equal(Object.keys(PARITY).length, 16);
  for (const [id, [method, a, b]] of Object.entries(PARITY)) {
    const x = knowledgeConceptCoverage(blank, id).methods, y = knowledgeConceptCoverage(withdrawn, id).methods;
    assert.equal(x.map(m => m.topic + '/' + m.optionId).join(','), method, id); assert.equal(sha256(JSON.stringify(x)), a, id + ': the methods on a blank project'); assert.equal(sha256(JSON.stringify(y)), b, id + ': the methods with the method pack withdrawn');
  }
  // The rows that replace it: one built-in row of scheme aiw-method for each catalogue id the table named, each naming a
  // comparison option that exists, never as identity (the option realises the mechanism; it is not the catalogue record).
  const method = KC.BUILT_IN_CROSSWALK.filter(r => r.scheme === 'aiw-method');
  assert.deepEqual(method.map(r => r.conceptId).sort(), Object.keys(PARITY).sort());
  for (const r of method) { const [topic, optionId] = r.aliasId.split('/'); assert(architectureOptions(topic).some(o => o.id === optionId), r.aliasId); assert.equal(r.relation, 'realises'); assert.equal(r.authority, 'built-in'); assert.equal(PARITY[r.conceptId][0], r.aliasId); }
  assert(method.length === XW.METHOD_CROSSWALK.length && method.every((r, i) => r === XW.METHOD_CROSSWALK[i]), 'the coverage module and the concept readers read the same method rows'); assert(Object.isFrozen(KC.BUILT_IN_CROSSWALK) && KC.BUILT_IN_CROSSWALK.every(Object.isFrozen) && Object.isFrozen(XW.METHOD_CROSSWALK));
  // A method alias is no identity: the resolver answers only `same`.
  assert.equal(KC.resolveConcept(blank, 'delivery/transactional-outbox'), null);
  // The table is gone, in the same commit as its replacement: no second path.
  const source = readFileSync('public/knowledge-coverage.js', 'utf8'); assert.doesNotMatch(source, /\bMAPPINGS\b/, 'MAPPINGS no longer exists'); assert.match(source, /METHOD_CROSSWALK/, 'its reader reads the built-in crosswalk');
  for (const file of readdirSync('public').filter(f => f.endsWith('.js'))) assert.doesNotMatch(readFileSync('public/' + file, 'utf8'), /\['reads','cache-aside',\[/, file + ' holds a copy of the retired table');
  // The five style rows: the Playbook's style ids, read from design-reasoning.js STYLE_CATALOGUE, the one definition of them.
  const {STYLE_CATALOGUE} = await import('./public/design-reasoning.js');
  assert.deepEqual(KC.BUILT_IN_CROSSWALK.filter(r => r.scheme === 'playbook').map(r => [r.aliasId, r.conceptId, r.relation]), Object.entries(STYLE_CATALOGUE).map(([a, c]) => [a, c, 'same']));
  for (const [alias, concept] of Object.entries(STYLE_CATALOGUE)) assert.deepEqual(KC.resolveConcept(blank, alias), {conceptId: concept, relation: 'same', via: {scheme: 'playbook', aliasId: alias, rowId: null, releaseId: null}, authority: 'built-in', label: 'AIW built-in mapping, not reviewed by a person'}, alias);
  assert.equal(KC.resolveConcept(blank, 'S-MODMONO').conceptId, 'STYLE-MODULAR-MONOLITH');
});

// ------------------------------------------------------------------------------------------------ 3
add('S2.3 (the seed): candidate-sets/crosswalk-seed.json is what scripts/build-crosswalk-seed.mjs writes from the product\'s own Playbook and catalogue: exactly 13 Playbook rows, each matching one catalogue record by its exact name, P-STANDBY and P-CHECK-POINTED-SYSTEM marked; every row proposed, none verified, nothing promoted; imported into a library as an import, each row is proposed and none resolves', async () => {
  const {KC} = await mods(), seed = JSON.parse(readFileSync('candidate-sets/crosswalk-seed.json', 'utf8')), C = catalogue();
  execFileSync(process.execPath, ['scripts/build-crosswalk-seed.mjs', '--check'], {stdio: 'pipe'});
  assert.equal(seed.status, 'candidate'); assert.equal(seed.productionAccepted, false); assert.deepEqual(seed.influence, {scoring: false, constraints: false, eligibility: false, conformance: false, identity: false, drafter: false, brain: false});
  assert.match(seed.authority, /Candidate only/); assert.equal(seed.catalogueRelease, C.releaseId);
  const named = [...PATTERNS, ...ANTI_PATTERNS].filter(e => e.catalogue);
  assert.equal(named.length, 13); assert.equal(seed.rows.length, 13, 'exactly 13 rows');
  assert.deepEqual(seed.rows.map(r => r.aliasId), named.map(e => e.id), 'one row for each Playbook entry that names a catalogue record');
  assert.deepEqual([seed.rows.filter(r => r.aliasId.startsWith('P-')).length, seed.rows.filter(r => r.aliasId.startsWith('AP-')).length], [10, 3]);
  for (const r of seed.rows) {
    const entry = named.find(e => e.id === r.aliasId), match = C.records.filter(x => x.name === entry.catalogue);
    assert.equal(match.length, 1, r.aliasId + ': one catalogue record by exact name'); assert.equal(r.conceptId, match[0].id);
    assert.deepEqual(Object.keys(r).sort(), ['aliasId', 'basis', 'conceptId', 'label', 'relation', 'scheme', 'status', 'targetContent'].sort(), r.aliasId + ': a row holds ids, names and its basis, nothing more');
    assert.equal(r.scheme, 'playbook'); assert.equal(r.relation, 'same'); assert.equal(r.status, 'proposed', 'every seeded row is proposed');
    assert.equal(r.targetContent, catalogueMark(match[0].id) ? 'marked' : 'template', r.aliasId);
    assert.equal(r.label, entry.name + ' (SA Playbook) · ' + match[0].name + ' (' + C.releaseId + ')');
  }
  assert.deepEqual(seed.rows.filter(r => r.targetContent === 'marked').map(r => r.aliasId).sort(), ['P-CHECK-POINTED-SYSTEM', 'P-STANDBY']);
  assert.doesNotMatch(JSON.stringify(seed), /"(?:review|verified|verification|reviewed|confirmed|approved)"/, 'nothing in the seed is verified or promoted');
  // Imported into a library as an import, through the commands: each row is proposed, carries the server's targetContent and resolves nothing.
  const S = await service();
  try {
    await S.ok('knowledge.library', LIBRARY_MARK, 'importer');
    for (const r of seed.rows) await S.ok('knowledge.concept', {...STRANGLER, conceptId: r.conceptId, title: r.conceptId, kind: r.conceptId.startsWith('ANTI-') ? 'anti-pattern' : 'pattern'}, 'importer', {authorKind: 'import'});
    for (const r of seed.rows) await S.ok('knowledge.crosswalk', {conceptId: r.conceptId, scheme: r.scheme, aliasId: r.aliasId, label: r.label, relation: r.relation, note: r.basis}, 'importer', {authorKind: 'import'});
    assert.deepEqual(KC.crosswalkRecords(S.document).map(x => [x.aliasId, x.state, x.targetContent]), seed.rows.map(r => [r.aliasId, 'proposed', r.targetContent]));
    for (const r of seed.rows) assert.equal(KC.resolveConcept(S.document, r.aliasId), null, r.aliasId + ' resolves nothing');
    assert.equal(rows(S.document).every(x => x.provenance?.author?.kind === 'import'), true, 'each row is stamped as imported');
  } finally { S.close(); }
});

// ------------------------------------------------------------------------------------------------ 4
add('S2.4 (one identity): a second verified `same` row for one (scheme, alias) is refused; a row proposed twice is refused; `narrower`, `broader`, `realises` and `distinct` never resolve as identity, verified and released', async () => {
  const {KC} = await mods(), {S, release} = await strangler({second: true});
  try {
    const a = await S.ok('knowledge.crosswalk', P_STRANGLER, 'architect');
    await S.refused(/P-STRANGLER is already in the crosswalk of PAT-STRANGLER-FIG as KA-\d{4}: edit that row/, 'knowledge.crosswalk', {...P_STRANGLER, label: 'Again'}, 'architect');
    const b = await S.ok('knowledge.crosswalk', {...P_STRANGLER, conceptId: 'PAT-ADAPTER', label: 'Strangler as an adapter'}, 'architect');
    await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, id: a}, 'reviewer');
    await S.refused(/playbook P-STRANGLER is already the same as PAT-STRANGLER-FIG \(KA-\d{4}, verified\): one alias names one concept/, 'knowledge.crosswalk-review', {...ROW_REVIEW, id: b}, 'reviewer');
    // A rejection of the second is a second person's step too, and accepted.
    await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, decision: 'rejected', reason: 'The adapter is not the strangler fig.', id: b}, 'reviewer'); assert.equal(KC.crosswalkRecords(S.document).find(r => r.id === b).state, 'rejected');
    const relations = {};
    for (const [relation, aliasId] of [['narrower', 'P-FACADE'], ['broader', 'P-MEDIATOR'], ['realises', 'P-ADAPTER'], ['distinct', 'P-STRATEGY']]) { relations[relation] = await S.ok('knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'playbook', aliasId, label: aliasId, relation}, 'architect'); await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, id: relations[relation]}, 'reviewer'); }
    await release();
    assert.deepEqual(S.document.knowledge.releases.at(-1).parts.crosswalk.map(r => r.relation), ['same', 'narrower', 'broader', 'realises', 'distinct'], 'the release holds every verified row of its concept, and no rejected one');
    assert.equal(KC.resolveConcept(S.document, 'P-STRANGLER').conceptId, 'PAT-STRANGLER-FIG');
    for (const aliasId of ['P-FACADE', 'P-MEDIATOR', 'P-ADAPTER', 'P-STRATEGY']) assert.equal(KC.resolveConcept(S.document, aliasId), null, aliasId + ' is no identity');
    assert.deepEqual(KC.conceptReading(S.document, 'PAT-STRANGLER-FIG').aliases.filter(x => x.authority === 'governed' && x.state === 'released').map(x => x.relation), ['same', 'narrower', 'broader', 'realises', 'distinct'], 'the concept view lists them, each with its relation');
    // Ruling P3, the concept first: PAT-ADAPTER is a concept of the register, so a `same` row of another concept whose
    // alias is PAT-ADAPTER is refused at the proposal, and an edit that makes a row of that alias `same` is refused too.
    const ANOTHER = /PAT-ADAPTER is a concept of this register \(KN-\d{4}\): one id names one concept, so it is no alias the same as PAT-STRANGLER-FIG/;
    await S.refused(ANOTHER, 'knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'akr', aliasId: 'PAT-ADAPTER', label: 'Adapter', relation: 'same'}, 'architect');
    const near = await S.ok('knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'akr', aliasId: 'PAT-ADAPTER', label: 'Adapter', relation: 'narrower'}, 'architect');
    await S.refused(ANOTHER, 'knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'akr', aliasId: 'PAT-ADAPTER', label: 'Adapter', relation: 'same', id: near}, 'architect');
  } finally { S.close(); }
  // Ruling P3, the row first: a `same` row whose alias becomes the id of a concept registered after it was proposed is
  // refused at verification; one verified and released before the concept was registered resolves nothing once that
  // concept is released too (an id that is both a usable released concept and a governed alias of another names none).
  { const {S, release, sourceId} = await strangler();
    try {
      const early = await S.ok('knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'akr', aliasId: 'PAT-ADAPTER', label: 'Adapter', relation: 'same'}, 'architect');
      const verified = await S.ok('knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'akr', aliasId: 'PAT-CIRCUIT-BREAKER', label: 'Circuit breaker', relation: 'same'}, 'architect');
      await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, id: verified}, 'reviewer'); await release();
      assert.equal(KC.resolveConcept(S.document, 'PAT-CIRCUIT-BREAKER').conceptId, 'PAT-STRANGLER-FIG', 'the released row names the strangler fig while no concept bears the id');
      await S.ok('knowledge.concept', {...STRANGLER, conceptId: 'PAT-ADAPTER', title: 'Adapter'}, 'importer');
      await S.refused(/PAT-ADAPTER is a concept of this register \(KN-\d{4}\): one id names one concept/, 'knowledge.crosswalk-review', {...ROW_REVIEW, id: early}, 'reviewer');
      await releasedConcept(S, sourceId, 'PAT-CIRCUIT-BREAKER', 'Circuit breaker');
      assert.equal(KC.releasedConcepts(S.document).filter(c => c.eligible).map(c => c.conceptId).sort().join(), 'PAT-CIRCUIT-BREAKER,PAT-STRANGLER-FIG', 'both concepts are released and usable');
      assert.equal(KC.resolveConcept(S.document, 'PAT-CIRCUIT-BREAKER'), null, 'one id, two concepts: it names none');
      assert.equal(KC.resolveConcept(S.document, 'PAT-STRANGLER-FIG').conceptId, 'PAT-STRANGLER-FIG', 'a released concept no row claims is still its own identity');
    } finally { S.close(); } }
});

// ------------------------------------------------------------------------------------------------ 5
add('S2.5 (a second person, ruling D1 and D7.1): the review of a row is a second-person step stated on its command, refused for its author, its last editor, an agent account, a draft by Sol and an import; a row that only an import, a draft by Sol or an agent account wrote takes a person\'s confirmation first (ruling F4), and the confirming person does not then verify it; the stored step is checked again on every read; a draft by Sol proposes rows and nothing else', async () => {
  const {KC} = await mods(), {extensionCommand} = await import('./design-extension-boundary.js');
  // Stated on the command, through S0's registration: no check of the package's own.
  { const review = extensionCommand('knowledge.crosswalk-review'), confirm = extensionCommand('knowledge.crosswalk-confirm'), retire = extensionCommand('knowledge.crosswalk-retire'), propose = extensionCommand('knowledge.crosswalk');
    assert.equal(typeof review?.second, 'function', 'the review is a second person\'s step'); assert.equal(confirm?.person, true); assert.equal(retire?.person, true); assert(propose && !propose.person && !propose.second && !propose.staged, 'a proposal is anyone\'s, sent on its own');
    for (const type of ['knowledge.crosswalk-review', 'knowledge.crosswalk-confirm', 'knowledge.crosswalk-retire']) assert(isReviewCommand(type), type + ' is a review command to authorship.js'); assert(!isReviewCommand('knowledge.crosswalk')); }
  const {S} = await strangler();
  try {
    const id = await S.ok('knowledge.crosswalk', P_STRANGLER, 'architect');
    // Its author, from a person's account: verifierRefusal's sentence.
    await S.refused(/A second signed-in person, who did not write or own the action, verifies it\. architect wrote KA-\d{4}\./, 'knowledge.crosswalk-review', {...ROW_REVIEW, id}, 'architect');
    // Its last editor: a person who changed the row.
    await S.ok('knowledge.crosswalk', {...P_STRANGLER, id, note: 'Checked against the Playbook workbook.'}, 'second-architect');
    assert.deepEqual(row(S.document, id).history.map(h => h.actor), ['architect', 'second-architect']); assert.equal(row(S.document, id).lastEditor, 'second-architect');
    await S.refused(/second-architect wrote KA-\d{4}/, 'knowledge.crosswalk-review', {...ROW_REVIEW, id}, 'second-architect');
    // An agent account, a draft by Sol and an import: refused before anything is read or written.
    await S.refused(/An agent or service account does not review, confirm, accept or approve \(knowledge\.crosswalk-review\)/, 'knowledge.crosswalk-review', {...ROW_REVIEW, id}, 'bot');
    await S.refused(/A draft by Sol does not review, confirm, accept or approve \(knowledge\.crosswalk-review\)/, 'knowledge.crosswalk-review', {...ROW_REVIEW, id}, 'reviewer', {authorKind: 'sol-draft'});
    await S.refused(/knowledge\.crosswalk-review is a signed-in person's step: an import, a draft by Sol and an agent account review, accept and approve nothing/, 'knowledge.crosswalk-review', {...ROW_REVIEW, id}, 'reviewer', {authorKind: 'import'});
    // Each check names the outcome too: a verification needs the alias checked.
    await S.refused(/Check the alias against its source and the concept before verifying the row \(aliasChecked\)/, 'knowledge.crosswalk-review', {...ROW_REVIEW, aliasChecked: false, id}, 'reviewer');
    // A second person: accepted; the step is kept under `review` with who took it and the kind of their account.
    await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, id}, 'reviewer');
    { const r = row(S.document, id); assert.deepEqual([r.review.decision, r.review.actor, r.review.account, r.review.rowHash], ['verified', 'reviewer', 'person', KC.crosswalkRowHash(r)]); assert.equal(r.provenance.author.by, 'second-architect', 'the step changes no author stamp'); }
    // Checked again on every read: a step whose account is no person's, a row changed since, a reviewer who wrote a revision.
    for (const [why, change] of [['an agent account', r => { r.review.account = 'agent'; }], ['no account', r => { delete r.review.account; }], ['the row changed since', r => { r.label = 'Changed in the document'; }], ['its reviewer wrote a revision', r => { r.history.push({revision: 3, at: AT, actor: 'reviewer', change: 'Edited'}); }], ['no reviewer', r => { r.review.actor = null; }]]) {
      const q = clone(S.document); change(row(q, id)); assert.equal(KC.crosswalkRecords(q).find(x => x.id === id).state, 'proposed', why); }
    // A person's edit lapses the review, as a concept's does.
    await S.ok('knowledge.crosswalk', {...P_STRANGLER, id, relation: 'narrower'}, 'steward'); assert.equal(KC.crosswalkRecords(S.document).find(x => x.id === id).state, 'proposed', 'a person\'s edit lapses the review');
    // Rows only an import, a draft by Sol or an agent account wrote: no person stands behind them (ruling D1).
    for (const [who, as, extra, aliasId] of [['an import', 'importer', {authorKind: 'import'}, 'P-FACADE'], ['a draft by Sol', 'architect', {authorKind: 'sol-draft'}, 'P-ADAPTER'], ['an agent account', 'bot', {}, 'P-MEDIATOR']]) {
      const x = await S.ok('knowledge.crosswalk', {...P_STRANGLER, aliasId, label: aliasId, relation: 'narrower'}, as, extra);
      assert.equal(KC.crosswalkRecords(S.document).find(r => r.id === x).state, 'proposed', who + ': a proposal');
      await S.refused(/A second person's step needs two persons: no person other than reviewer stands behind KA-\d{4} as it stands .* A second signed-in person saves or confirms KA-\d{4} first\./, 'knowledge.crosswalk-review', {...ROW_REVIEW, id: x}, 'reviewer');
      // A person-only step confirms it (F4): refused to an agent account, a draft by Sol and an import, taken by a person.
      await S.refused(/An agent or service account does not review, confirm, accept or approve/, 'knowledge.crosswalk-confirm', {...PERSON_STEP, id: x}, 'bot');
      await S.refused(/A draft by Sol does not review, confirm, accept or approve/, 'knowledge.crosswalk-confirm', {...PERSON_STEP, id: x}, 'steward', {authorKind: 'sol-draft'});
      await S.refused(/knowledge\.crosswalk-confirm is a signed-in person's step/, 'knowledge.crosswalk-confirm', {...PERSON_STEP, id: x}, 'steward', {authorKind: 'import'});
      await S.ok('knowledge.crosswalk-confirm', {...PERSON_STEP, id: x}, 'steward');
      assert.deepEqual([row(S.document, x).confirmed, row(S.document, x).provenance.reviewed.by, row(S.document, x).provenance.reviewed.how], [true, 'steward', 'confirmed']);
      // The person who confirmed it does not then verify it: that is one person, not two.
      await S.refused(/no person other than steward stands behind KA-\d{4}/, 'knowledge.crosswalk-review', {...ROW_REVIEW, id: x}, 'steward');
      await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, id: x}, 'reviewer'); assert.equal(KC.crosswalkRecords(S.document).find(r => r.id === x).state, 'verified', who + ': verified once a person confirmed it and a second person reviewed it');
    }
    // A draft by Sol proposes rows and nothing else: it claims no review, and what a client sends of the row's standing is not taken.
    await S.refused(/A draft by Sol cannot claim a review \(status verified\)/, 'knowledge.crosswalk', {...P_STRANGLER, aliasId: 'P-STRATEGY', label: 'Strategy', status: 'verified'}, 'architect', {authorKind: 'sol-draft'});
    await S.refused(/A draft by Sol cannot claim a review \(reviewed\)/, 'knowledge.crosswalk', {...P_STRANGLER, aliasId: 'P-STRATEGY', label: 'Strategy', review: {reviewed: true}}, 'architect', {authorKind: 'sol-draft'});
    { const x = await S.ok('knowledge.crosswalk', {...P_STRANGLER, aliasId: 'P-STRATEGY', label: 'Strategy', review: {decision: 'proposed', actor: 'reviewer', account: 'person'}, history: [], actor: 'reviewer', revision: 9}, 'architect', {authorKind: 'sol-draft'});
      const r = row(S.document, x); assert.equal(r.review, undefined, 'a review sent with the row is not stored'); assert.deepEqual([r.actor, r.revision, r.history.length], ['architect', 1, 1]); assert.equal(KC.crosswalkRecords(S.document).find(y => y.id === x).state, 'proposed'); }
    // Retiring is a person's step too.
    await S.refused(/A draft by Sol does not review, confirm, accept or approve \(knowledge\.crosswalk-retire\)/, 'knowledge.crosswalk-retire', {...PERSON_STEP, id}, 'architect', {authorKind: 'sol-draft'});
    // The undo of a person's step is a person's (D6.1): there is no undo receipt for these steps here; a counter-step is how a person reverses them.
  } finally { S.close(); }
  // A non-person changes no row a second person verified here, nor one a release holds (rulings B3, E1 and G2 read for rows).
  { const {S, release} = await strangler();
    try { const id = await S.ok('knowledge.crosswalk', P_STRANGLER, 'architect'); await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, id}, 'reviewer');
      for (const [as, extra] of [['bot', {}], ['architect', {authorKind: 'sol-draft'}], ['importer', {authorKind: 'import'}]]) await S.refused(/KA-\d{4} was verified here or is in a release: only a signed-in person changes it/, 'knowledge.crosswalk', {...P_STRANGLER, id, note: 'Changed by a non-person.'}, as, extra);
      await release();
      await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, decision: 'rejected', id, reason: 'Rejected after release, by a person.'}, 'releaser');
      for (const [as, extra] of [['bot', {}], ['architect', {authorKind: 'sol-draft'}]]) await S.refused(/only a signed-in person changes it/, 'knowledge.crosswalk', {...P_STRANGLER, id, note: 'Changed by a non-person.'}, as, extra); }
    finally { S.close(); } }
});

// ------------------------------------------------------------------------------------------------ 6
add('S2.6 (targetContent): what a crosswalk row\'s catalogue target holds is the server\'s reading, never the client\'s: a value sent is ignored and recomputed; PAT-CIRCUIT-BREAKER reads authored, a template record template, a marked record marked, a stub stub, a target outside the catalogue nothing', async () => {
  const S = await service();
  try {
    await S.ok('knowledge.library', LIBRARY_MARK, 'importer');
    for (const conceptId of ['CON-PATTERN-PROTECTED-CALL', 'PAT-STRANGLER-FIG', 'PAT-ACTIVE-PASSIVE', 'CON-PATTERN-OWN-WORDS']) await S.ok('knowledge.concept', {...STRANGLER, conceptId, title: conceptId}, 'importer');
    const cases = [[{conceptId: 'CON-PATTERN-PROTECTED-CALL', scheme: 'akr', aliasId: 'PAT-CIRCUIT-BREAKER', label: 'Circuit breaker', relation: 'same'}, 'authored'],
      [{conceptId: 'PAT-STRANGLER-FIG', scheme: 'playbook', aliasId: 'P-STRANGLER', label: 'Strangler', relation: 'same'}, 'template'],
      [{conceptId: 'PAT-ACTIVE-PASSIVE', scheme: 'playbook', aliasId: 'P-STANDBY', label: 'Standby', relation: 'same'}, 'marked'],
      [{conceptId: 'CON-PATTERN-PROTECTED-CALL', scheme: 'akr', aliasId: 'ANTI-DUAL-WRITE', label: 'Dual write', relation: 'distinct'}, 'stub'],
      [{conceptId: 'CON-PATTERN-OWN-WORDS', scheme: 'external', aliasId: 'EXT-OWN-WORDS', label: 'A mechanism in our own words', relation: 'same', note: 'An internal glossary entry.'}, undefined]];
    for (const [payload, expected] of cases) {
      const id = await S.ok('knowledge.crosswalk', {...payload, targetContent: 'authored'}, 'architect');
      assert.equal(row(S.document, id).targetContent, expected, payload.aliasId + ': recomputed, whatever was sent');
      if (expected) { await S.ok('knowledge.crosswalk', {...payload, id, note: 'Edited.', targetContent: expected === 'authored' ? 'marked' : 'authored'}, 'architect'); assert.equal(row(S.document, id).targetContent, expected, payload.aliasId + ': recomputed on an edit'); }
    }
    assert.equal('targetContent' in row(S.document, rows(S.document).at(-1).id), false, 'a target outside the catalogue has no such key');
    // The scheme's own check: the alias exists where the scheme says.
    await S.refused(/PAT-NO-SUCH-RECORD is neither a catalogue record nor a relation stub of AKR-0\.10\.73\.5/, 'knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'akr', aliasId: 'PAT-NO-SUCH-RECORD', label: 'None', relation: 'same'}, 'architect');
    await S.refused(/P-NO-SUCH-ENTRY is not an entry of the SA Playbook/, 'knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'playbook', aliasId: 'P-NO-SUCH-ENTRY', label: 'None', relation: 'same'}, 'architect');
    await S.refused(/delivery\/no-such-option is not a built-in comparison option \(topic\/option\)/, 'knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'aiw-method', aliasId: 'delivery/no-such-option', label: 'None', relation: 'realises'}, 'architect');
    await S.refused(/AAP-P999 is neither a topic of this library nor named by the passage of the claim given as evidence/, 'knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'handbook', aliasId: 'AAP-P999', label: 'None', relation: 'same'}, 'architect');
    await S.refused(/PAT-NOT-REGISTERED is not in the concept register/, 'knowledge.crosswalk', {conceptId: 'PAT-NOT-REGISTERED', scheme: 'playbook', aliasId: 'P-ADAPTER', label: 'Adapter', relation: 'same'}, 'architect');
    await S.refused(/A lens row maps a quality lens to a Chapter 2 category/, 'knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'lens', aliasId: 'LENS-AVAILABILITY', label: 'Availability', relation: 'same'}, 'architect');
    await S.refused(/Choose how the alias relates to the concept \(same, narrower, broader, realises, distinct\)/, 'knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'playbook', aliasId: 'P-ADAPTER', label: 'Adapter', relation: 'related'}, 'architect');
    // Written in a knowledge library only (ruling B2).
    { const D = await service(); try { await D.refused(/Concepts, topics and knowledge forms are written in a knowledge library/, 'knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'playbook', aliasId: 'P-STRANGLER', label: 'Strangler', relation: 'same'}, 'architect'); } finally { D.close(); } }
    // A row saved again as it is writes nothing (no revision, no history line).
    { const id = rows(S.document)[0].id, before = clone(row(S.document, id)), r = await S.send('knowledge.crosswalk', {...cases[0][0], id, note: before.note}, 'architect'); assert.equal(r.status, 200); assert.deepEqual(row(S.document, id), before); }
    // A row keeps its alias and its concept.
    await S.refused(/A crosswalk row keeps its alias and its concept: propose another row/, 'knowledge.crosswalk', {...cases[0][0], id: rows(S.document)[0].id, aliasId: 'PAT-BULKHEAD'}, 'architect');
  } finally { S.close(); }
});

// ------------------------------------------------------------------------------------------------ 7
add('S2.7 (no second identity path): no module under public/ reads the `catalogue` name of a Playbook entry, by a source scan of every module that imports the Playbook and by a reading of every reference through the design readings with a trap on the name', async () => {
  const strip = text => text.replace(/^\s*import\s[^;]*;/gm, ' ').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, ' ').replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g, "''");
  const importers = readdirSync('public').filter(f => f.endsWith('.js') && /from\s*['"]\.\/playbook-knowledge\.js['"]/.test(readFileSync('public/' + f, 'utf8')));
  assert(importers.length >= 15, 'the Playbook\'s readers: ' + importers.length);
  for (const f of importers) { const code = strip(readFileSync('public/' + f, 'utf8')); assert.doesNotMatch(code, /\.catalogue\b|\[\s*''\s*\]\s*catalogue|\bcatalogue\s*:|[{,]\s*catalogue\s*[,}]/, f + ' reads the catalogue name of a Playbook entry'); }
  // And at run time: the name is trapped on every Playbook entry while the readings of the three references and of a library are taken.
  const entries = [...PATTERNS, ...ANTI_PATTERNS, ...STYLES], reads = [];
  const held = entries.map(e => [e, Object.getOwnPropertyDescriptor(e, 'catalogue')]);
  try {
    for (const [e, d] of held) if (d) Object.defineProperty(e, 'catalogue', {get() { reads.push(e.id + ': ' + new Error().stack.split('\n')[2]); return d.value; }, configurable: true, enumerable: d.enumerable});
    for (const t of R.REFERENCES) R.readings(R.reference(t)); designReadings(F.bankProject());
    assert.deepEqual(reads, [], 'a runtime module read the catalogue name of a Playbook entry');
  } finally { for (const [e, d] of held) if (d) Object.defineProperty(e, 'catalogue', d); }
  assert(held.some(([, d]) => d && 'value' in d), 'the trap was set');
});

// ------------------------------------------------------------------------------------------------ 8
add('S2.8 (inert): a design document that holds crosswalk rows anyway, proposed, verified by their own author, verified in no release, and in a release that is not active, reads as the same document without them in all 27 readings of S1.10 but the knowledge stamp they carry; no row resolves; the coverage, the released claims and the built-in comparison of the catalogue ids they name are as they were', async () => {
  const {KC} = await mods(), bank = F.bankProject();
  // The library the rows come from, at each stage: proposed, verified by a second person, in an inactive release.
  const stages = [];
  { const {S, release} = await strangler();
    try { const base = clone(S.document); const id = await S.ok('knowledge.crosswalk', P_STRANGLER, 'architect'); const extra = await S.ok('knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'akr', aliasId: 'PAT-CIRCUIT-BREAKER', label: 'Circuit breaker', relation: 'same'}, 'architect');
      stages.push(['proposed', base, clone(S.document)]);
      { const q = clone(S.document); const r = row(q, id); r.review = {decision: 'verified', actor: 'architect', account: 'person', reviewer: 'Architect', at: AT, reason: 'Mine.', aliasChecked: true, rowHash: KC.crosswalkRowHash(r)}; stages.push(['verified by its own author', base, q]); }
      await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, id}, 'reviewer'); await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, id: extra}, 'reviewer'); stages.push(['verified by a second person, in no release', base, clone(S.document)]);
      const releaseId = await release(); await S.ok('knowledge.deactivate', {...F.REVIEW, id: releaseId, stamp: K.knowledgeStamp(S.document)}, 'releaser');
      // The same library without the rows: the same release of the concept, with no parts.
      const without = clone(S.document); without.knowledge.crosswalk = undefined; delete without.knowledge.crosswalk; const r = without.knowledge.releases.at(-1); delete r.parts; const {checksum: _c, ...rest} = r; r.checksum = (await import('./public/brain-integrity.js')).digest(rest);
      stages.push(['in a release that is not active', without, clone(S.document)]); }
    finally { S.close(); } }
  const STAMPS = ['brainContext.governed.receipt.knowledgeStamp', ...['packetMind', 'packetDesign', 'packetChallenge'].flatMap(k => [k + '.brainReceipt.knowledgeStamp', k + '.stamp'])].sort();
  for (const [stage, without, withRows] of stages) {
    const a = graft(bank, without), b = graft(bank, withRows);
    assert(b.knowledge.crosswalk.length >= 2, stage + ': the document holds the rows');
    const ra = designReadings(a), rb = designReadings(b), m = moved(ra, rb).sort();
    assert(m.every(x => STAMPS.includes(x)), stage + ': a reading of the design moved: ' + m.filter(x => !STAMPS.includes(x)).join(', '));
    for (const id of ['P-STRANGLER', 'PAT-CIRCUIT-BREAKER', 'PAT-STRANGLER-FIG']) assert.equal(KC.resolveConcept(b, id), null, stage + ': ' + id + ' resolves nothing');
    for (const id of ['PAT-CIRCUIT-BREAKER', 'PAT-STRANGLER-FIG']) assert.deepEqual(knowledgeConceptCoverage(b, id), knowledgeConceptCoverage(a, id), stage + ': the coverage of ' + id);
    assert.deepEqual(K.releasedClaims(b), K.releasedClaims(a)); assert.deepEqual(rv.inheritedFindings(b).map(({stamp: _s, ...f}) => f), rv.inheritedFindings(a).map(({stamp: _s, ...f}) => f));
    R.assertFindingIdsUnique(b); R.assertBuiltInTrailsUnchanged(a, b); R.assertBuiltInChainsUnchanged(a, b);
  }
});

// ------------------------------------------------------------------------------------------------ 9
add('S2.9 (ruling E1 for the package\'s types; P5 f): every crosswalk command type, sent by an agent account, a draft by Sol, an import, the reviewer\'s and the releaser\'s own accounts as an import and as a draft by Sol, a request that states no author and one whose author names no account, against a reviewed concept and against a released one, leaves the concept\'s standing, its forms, its releases and what it resolves as they were; a person\'s request is saved', async () => {
  const {KC} = await mods(), {S, release, conceptRecordId} = await strangler();
  const standing = d => JSON.stringify({concept: KC.conceptRecords(d).map(c => [c.conceptId, c.state, c.hash]), forms: KC.conceptReading(d, 'PAT-STRANGLER-FIG').forms.map(f => [f.type, f.status]), releases: KC.releasedConcepts(d).map(c => [c.conceptId, c.eligible]), resolves: KC.resolveConcept(d, 'P-STRANGLER'), released: (d.knowledge.releases || []).map(r => r.checksum)});
  try {
    const verified = await S.ok('knowledge.crosswalk', P_STRANGLER, 'architect'); await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, id: verified}, 'reviewer');
    // (ruling P5 f: the kinds S1.29 walks, the reviewer's and the releaser's own accounts as an import and as a draft by Sol
    // included; the request that states no author and the author that names no account, which the service never sends,
    // are walked through the package's handler at the boundary)
    const KINDS = [['an agent account', 'bot', {}], ['a draft by Sol', 'architect', {authorKind: 'sol-draft'}], ['an import', 'importer', {authorKind: 'import'}], ['an import sent from the account of the row\'s reviewer', 'reviewer', {authorKind: 'import'}], ['a draft by Sol sent from the releaser\'s account', 'releaser', {authorKind: 'sol-draft'}], ['a draft by Sol sent from the reviewer\'s account', 'reviewer', {authorKind: 'sol-draft'}], ['an import sent from the releaser\'s account', 'releaser', {authorKind: 'import'}]];
    const {extensionHandler} = await import('./design-extension-boundary.js'), NOBODY = [['a request that states no author', 'architect', null], ['an author that names no account', 'architect', {kind: 'person', id: 'architect', reviewed: true}]];
    const requests = id => ({'knowledge.crosswalk': [{...P_STRANGLER, id, note: 'Changed.'}, {...P_STRANGLER, id, relation: 'narrower'}], 'knowledge.crosswalk-confirm': [{...PERSON_STEP, id}], 'knowledge.crosswalk-review': [{...ROW_REVIEW, id, decision: 'rejected'}, {...ROW_REVIEW, id}], 'knowledge.crosswalk-retire': [{...PERSON_STEP, id}]});
    assert.deepEqual(Object.keys(requests('x')).sort(), [...TYPES].sort(), 'every type of the package is walked');
    let sent = 0;
    for (const stage of ['reviewed', 'released']) {
      if (stage === 'released') await release();
      const before = standing(S.document);
      for (const [type, payloads] of Object.entries(requests(verified))) for (const payload of payloads) for (const [who, as, extra] of KINDS) {
        const r = await S.send(type, payload, as, extra); sent++;
        assert.notEqual(r.status, 200, stage + ': ' + type + ' sent by ' + who + ' was accepted');
        assert.equal(standing(S.document), before, stage + ': ' + type + ' by ' + who);
      }
      for (const [type, payloads] of Object.entries(requests(verified))) for (const payload of payloads) for (const [who, actor, author] of NOBODY) {
        sent++; assert.throws(() => extensionHandler(type)(clone(S.document), {type, payload}, AT, actor, {author}), Error, stage + ': ' + type + ' by ' + who + ' was accepted at the boundary');
      }
    }
    assert.equal(sent, 2 * 6 * (KINDS.length + NOBODY.length)); assert.equal(KINDS.length + NOBODY.length, 9, 'the nine kinds of request');
    // A proposal is saved, an agent account's too: it lowers nothing; a person's retirement is saved, with its effect.
    const fresh = await S.ok('knowledge.crosswalk', {...P_STRANGLER, aliasId: 'P-FACADE', label: 'Facade', relation: 'narrower'}, 'bot');
    assert.equal(KC.crosswalkRecords(S.document).find(r => r.id === fresh).state, 'proposed'); assert.equal(KC.conceptRecords(S.document).find(c => c.id === conceptRecordId).state, 'reviewed', 'a proposed row lowers no concept\'s standing');
    await S.ok('knowledge.crosswalk-retire', {...PERSON_STEP, id: verified}, 'steward'); assert.equal(KC.resolveConcept(S.document, 'P-STRANGLER'), null, 'a person retires the row, with that effect');
  } finally { S.close(); }
});

// ------------------------------------------------------------------------------------------------ 10
add('S2.10 (old documents and S0\'s helpers): with ' + PACKAGE + ' registered, the three references and the document with a review list read as at 94dbd4f; no key of the package exists until it is first written and no document names the package; a library that holds rows names it and a template copy of it does not (ruling P2), its route stub exists, the steps a row holds move no design stamp, a template copy carries no step, the trails and chains are the built-in ones and the findings are unique', async () => {
  const {KC} = await mods(), X = await import('./public/design-extensions.js'), boundary = await import('./design-extension-boundary.js');
  await import('./worker.js');
  const mine = () => X.EXTENSIONS.find(e => e.id === PACKAGE);
  assert(mine(), PACKAGE + ' is registered'); assert.deepEqual(boundary.extensionIssues(mine()), [], 'the package conforms to the registration contract'); assert.deepEqual(boundary.extensionConflicts(), []);
  assert.deepEqual(Object.keys(mine()).sort(), ['commands', 'design', 'id', 'provenance'], 'the package states its commands, the collection they write and what its rows say to the fingerprint, nothing more');
  assert.deepEqual(Object.keys(mine().commands).sort(), [...TYPES].sort());
  const golden = JSON.parse(readFileSync('rc44-s0-extensions-baseline.json', 'utf8')); assert.equal(golden.capturedFrom, '94dbd4f');
  for (const t of R.REFERENCES) {
    const q = R.reference(t), now = R.digests(q);
    for (const k of Object.keys(golden.readings[t])) assert.equal(now[k], golden.readings[t][k], t + ': ' + k + ' reads as at 94dbd4f with ' + PACKAGE + ' registered');
    assert.equal(q.knowledge?.crosswalk, undefined, t + ': no crosswalk key until one is written'); assert.equal(q.workspace.packages, undefined, t + ' names no package');
    assert.equal(KC.resolveConcept(q, 'P-STRANGLER'), null); assert.deepEqual(KC.crosswalkRecords(q), []);
    assert.equal(rv.reviewSource(q).knowledge === undefined || !('crosswalk' in rv.reviewSource(q).knowledge), true);
  }
  { const listed = R.reviewListDocument(), now = R.digests(listed); for (const k of Object.keys(golden.reviewList.readings)) assert.equal(now[k], golden.reviewList.readings[k], 'a document with a review list: ' + k); }
  // The browser can open a document that names the package: its route stub is registered under <id>-route.
  const routes = readFileSync('public/design-package-routes.js', 'utf8'); assert.match(routes, /registerExtension\(\{id:'p10-knowledge-route',needs:p=>p\.knowledge\?\.crosswalk,load:\(\)=>import\('\.\/knowledge-workspace-ui\.js'\)\}\);/);
  assert.match(readFileSync('design-packages.js', 'utf8'), /^import '\.\/knowledge-package-server\.js'; \/\/ p10-knowledge/m);
  assert.match(readFileSync('public/knowledge-workspace-ui.js', 'utf8'), /import '\.\/knowledge-package\.js';/, 'the host entry registers the package in the browser');
  const {S} = await strangler();
  try {
    assert.equal(S.document.workspace.packages, undefined, 'a library whose knowledge holds no row names no package');
    const id = await S.ok('knowledge.crosswalk', P_STRANGLER, 'architect'); await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, id}, 'reviewer');
    const p = S.document; assert.deepEqual(p.workspace.packages, [PACKAGE], 'a library that holds rows names the package that wrote them (ruling D2)');
    assert.equal(R.assertStepsMoveNoStamp(p, d => rows(d)), 1, 'the steps a row holds (history, review, confirmed, provenance), written into it in place, move no design stamp (ruling J3); through the commands the knowledge family\'s log and version still move it (S2.16, a known limit for S3)');
    R.assertTemplateCopyClearsSteps(p, d => rows(d));
    const base = clone(p); delete base.knowledge.crosswalk; R.assertBuiltInTrailsUnchanged(base, p); R.assertBuiltInChainsUnchanged(base, p); R.assertFindingIdsUnique(p);
    assert.deepEqual(rv.reviewSource(p).knowledge.crosswalk.map(r => Object.keys(r).filter(k => ['history', 'review', 'confirmed', 'provenance'].includes(k))), [[]], 'the fingerprint reads what a row says, not its steps');
    // Ruling P2: a document names a package exactly when it holds a record of it. The library, marked a reusable template
    // and copied through the service, gives a project that keeps no knowledge, so no row: it names no package, and a build
    // without the package reads it as missing nothing.
    { const {instantiateTemplate} = await import('./project-lifecycle.js'), {missingPackages} = await import('./public/design-extension-parts.js');
      const marked = await S.api('/api/lifecycle?project=' + S.projectId, {revision: S.state.revision, action: 'template', enabled: true}, 'importer'); assert.equal(marked.status, 200, JSON.stringify(marked.data).slice(0, 300));
      const made = await S.api('/api/projects', {name: 'A copy of the library', sourceProjectId: S.projectId}, 'importer'); assert(made.status < 300, JSON.stringify(made.data).slice(0, 300));
      const copy = made.data.document; assert.equal(copy.knowledge, undefined, 'the copy keeps no knowledge'); assert.equal(copy.workspace.templateOrigin.projectId, S.projectId);
      assert.equal('packages' in copy.workspace, false, 'a copy that keeps no record of ' + PACKAGE + ' names no package (ruling P2)');
      const stored = await S.api('/api/project?project=' + copy.id, null, 'importer'); assert.equal(stored.status, 200); assert.equal('packages' in stored.data.document.workspace, false, 'as stored and read');
      // A name this build does not register is copied as stored (ruling K2). (A registered package whose records the copy
      // keeps stays named: S0's suite holds it for its synthetic package, wp9a's and wp2's for theirs.)
      const source = {...clone(marked.data.document), workspace: {...marked.data.document.workspace, packages: [PACKAGE, 'p99-missing']}}, two = instantiateTemplate(source, 'copy-two', 'Copy two', AT);
      assert.deepEqual(two.workspace.packages, ['p99-missing'], 'an unregistered name is copied as stored; the package whose records the copy drops is not'); assert.deepEqual(missingPackages(two), ['p99-missing']);
      // The recovered library of ruling G5: rows kept, the library mark cleared; it still names the package, truthfully.
      const preview = await S.api('/api/recovery?action=preview', {package: clone(S.document)}, 'importer'); assert.equal(preview.status, 200, JSON.stringify(preview.data).slice(0, 300));
      const restored = await S.api('/api/recovery?action=restore', {package: clone(S.document), hash: preview.data.hash, name: 'The recovered library', reviewed: true}, 'importer'); assert.equal(restored.status, 201, JSON.stringify(restored.data).slice(0, 300));
      const back = (await S.api('/api/project?project=' + restored.data.id, null, 'importer')).data.document;
      assert.deepEqual(back.workspace.packages, [PACKAGE], 'the recovered library names the package'); assert.equal(rows(back).length, 1, 'because it holds its rows'); assert.equal(back.knowledge.library.enabled, false, 'its library mark is cleared (ruling G5)');
      assert.equal(KC.crosswalkRecords(back)[0].state, 'proposed'); assert.equal(KC.resolveConcept(back, 'P-STRANGLER'), null); }
  } finally { S.close(); }
});

// ------------------------------------------------------------------------------------------------ 11
add('S2.11 (recovery import): a row\'s review, in the register and in a release, is an assertion made on the workbench the package came from: a recovered project reads every row proposed and resolves nothing until a second person here reviews it and a release here holds it', async () => {
  const {KC} = await mods(), {S, release} = await strangler();
  try {
    const id = await S.ok('knowledge.crosswalk', P_STRANGLER, 'architect'); await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, id}, 'reviewer'); await release();
    assert.equal(KC.resolveConcept(S.document, 'P-STRANGLER').conceptId, 'PAT-STRANGLER-FIG');
    const imported = neutraliseImportedAuthority(clone(S.document), AT);
    assert.equal(KC.crosswalkRecords(imported).find(r => r.id === id).state, 'proposed', 'the register\'s row reads proposed'); assert.equal(row(imported, id).review.importedActor, 'reviewer');
    assert.equal(imported.knowledge.releases.at(-1).parts.crosswalk[0].review.actor, null, 'the copy in the release names no reviewer here');
    assert.equal(KC.resolveConcept(imported, 'P-STRANGLER'), null, 'nothing resolves');
  } finally { S.close(); }
});

// ------------------------------------------------------------------------------------------------ 12
add('S2.12 (size, ruling A4 and M4): the client build passes every gate with the caps unchanged; the route grew by at most 250 B for S2 (wp1\'s 660 B less S1\'s 65 B, shared with S3), as the evidence books it; 148 script files, no new file under 10 KB, no stylesheet rule; the evidence says what a document with rows opens with', async () => {
  const EVIDENCE = 'audit/rc44/evidence/wp1-s2-size.json', size = JSON.parse(readFileSync(EVIDENCE, 'utf8'));
  const {BUDGET} = await import('./client-bundle.mjs');
  assert.ok(Number.isInteger(size.ownBytes) && size.ownBytes >= 0 && size.ownBytes <= 250, 'S2 books its own bytes: ' + size.ownBytes);
  assert.equal(size.allowance.chapters, 250); assert.equal(size.base.commit, '5cae40a'); assert.equal(size.base.chapters, 3230605);
  const booked = R.routeBookings(EVIDENCE);
  assert.equal(booked.others['audit/rc44/evidence/wp9a-s1-size.json'], 342, 'the other packages\' evidence is read');
  // The integrated base of ruling M4 (S0 and wp1 S1, 3,229,840 B), the other packages' own bytes and the shared pool's: what is left is wp1 S2's.
  assert.equal(3229840 + booked.othersTotal + booked.poolTotal, size.base.chapters, 'the start commit is the integrated base and what the other packages and the pool booked');
  assert.equal(size.slice.chapters - 3229840 - booked.othersTotal - booked.poolTotal, size.ownBytes, 'the route at the slice\'s head, less the base and the others, is what S2 books');
  assert.ok(size.slice.chapters <= BUDGET.routes.chapters); assert.deepEqual([size.slice.scripts, size.slice.css], [148, size.base.css]); assert.ok(size.slice.under10k <= size.base.under10k, 'no new file under 10 KB');
  { const w = size['opens with records']; assert.ok(w && w.host === 'public/knowledge-workspace-ui.js' && w.total === w.route + w.added && w.route === size.slice.chapters && w.files >= 1, 'opens with records'); }
  if (existsSync('dist/client-size-report.json') && existsSync('dist/client-metafile.json')) {
    const report = JSON.parse(readFileSync('dist/client-size-report.json', 'utf8')), meta = JSON.parse(readFileSync('dist/client-metafile.json', 'utf8'));
    const measured = {chapters: report.routes.chapters.code, scripts: report.scripts, under10k: report.buckets.under10k, css: report.css};
    assert.deepEqual(report.violations || [], [], 'no gate is broken');
    const mine = measured.chapters - 3229840 - booked.othersTotal - booked.poolTotal; assert.ok(mine <= 250, 'this build: S2 is ' + mine + ' B of its 250 B');
    for (const [f, o] of Object.entries(meta.outputs)) if (o.inputs?.['public/knowledge-crosswalk.js']) assert(!o.inputs['public/knowledge-concepts.js'], f + ' holds the server\'s concept readers');
    assert.equal(measured.scripts, 148); assert.ok(measured.under10k <= size.base.under10k); assert.equal(measured.css, size.base.css); const opens = R.opensWithRecords(meta, 'public/knowledge-workspace-ui.js', Object.keys(BUDGET.data)); assert.equal(opens.route, measured.chapters);
    if (process.argv.includes('--measure') || process.env.AIW_RC44_WP1_MEASURE === '1') { assert.deepEqual({chapters: measured.chapters, scripts: measured.scripts, under10k: measured.under10k}, {chapters: size.slice.chapters, scripts: size.slice.scripts, under10k: size.slice.under10k}, 'at the slice\'s commit the build measures what the evidence says'); assert.deepEqual(opens, {route: size['opens with records'].route, added: size['opens with records'].added, total: size['opens with records'].total, files: size['opens with records'].files}); }
  }
});

// ------------------------------------------------------------------------------------------------ 13 (ruling P1)
// A release holds no row its releaser stands behind: the forms' release rule read for every row the release would hold.
// The rows of one library: `a` written by architect and edited by second-architect (a person's), and `b` imported, which
// steward confirmed (ruling F4) and reviewer verified. Each of those four, sending the release, is refused, in words
// that name the row and why; nothing resolves after a refusal; a third person (releaser) is accepted.
const releaseOf = definition => ({...F.REVIEW, title: 'Synthetic strangler fig 1', claimIds: [definition]});
add('S2.13 (ruling P1): a release holds no row its releaser stands behind: the author, the last editor, the person who confirmed a row no person wrote, and the person who verified an imported row are each refused the release, naming the row; a third person releases it', async () => {
  const {KC} = await mods(), {S, definition, reviewAgain} = await strangler();
  try {
    const a = await S.ok('knowledge.crosswalk', P_STRANGLER, 'architect');
    await S.ok('knowledge.crosswalk', {...P_STRANGLER, id: a, note: 'Checked against the Playbook workbook.'}, 'second-architect');
    await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, id: a}, 'reviewer');
    const b = await S.ok('knowledge.crosswalk', {...P_STRANGLER, aliasId: 'P-FACADE', label: 'Facade', relation: 'narrower'}, 'importer', {authorKind: 'import'});
    await S.ok('knowledge.crosswalk-confirm', {...PERSON_STEP, id: b}, 'steward');
    await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, id: b}, 'reviewer');
    assert.deepEqual(KC.crosswalkRecords(S.document).map(r => r.state), ['verified', 'verified']);
    await reviewAgain();
    const words = {architect: new RegExp(a + ' \\(playbook P-STRANGLER, a crosswalk row of PAT-STRANGLER-FIG\\): .*architect wrote ' + a + '\\. A release holds no crosswalk row its releaser wrote'),
      'second-architect': new RegExp(a + ' \\(playbook P-STRANGLER, a crosswalk row of PAT-STRANGLER-FIG\\): .*second-architect wrote ' + a),
      steward: new RegExp(b + ' \\(playbook P-FACADE, a crosswalk row of PAT-STRANGLER-FIG\\): steward confirmed ' + b + ', which no person wrote, and so stands in its author\'s place: a third person releases it\\.'),
      reviewer: new RegExp(b + ' \\(playbook P-FACADE, a crosswalk row of PAT-STRANGLER-FIG\\): reviewer verified ' + b + ', which was imported: a third person releases it\\.')};
    for (const [as, pattern] of Object.entries(words)) {
      await S.refused(pattern, 'knowledge.release', releaseOf(definition), as);
      assert.equal(KC.resolveConcept(S.document, 'P-STRANGLER'), null, as + ': nothing resolves after a refusal'); assert.equal((S.document.knowledge.releases || []).length, 0, as + ': no release is stored');
    }
    // A third person: accepted; the release holds both rows, and the identity resolves once the release is active.
    const id = await S.ok('knowledge.release', releaseOf(definition), 'releaser');
    assert.deepEqual(S.document.knowledge.releases.at(-1).parts.crosswalk.map(r => r.id), [a, b]);
    await S.ok('knowledge.activate', {...F.REVIEW, id, stamp: K.knowledgeStamp(S.document)}, 'releaser');
    assert.equal(KC.resolveConcept(S.document, 'P-STRANGLER').conceptId, 'PAT-STRANGLER-FIG');
  } finally { S.close(); }
  // The same rule for a row drafted by Sol and one an agent account wrote: the confirming person and the verifier stand behind it.
  for (const [as, extra, kind] of [['architect', {authorKind: 'sol-draft'}, 'drafted by Sol or by an agent account'], ['bot', {}, 'drafted by Sol or by an agent account']]) {
    const {S, definition, reviewAgain} = await strangler();
    try {
      const x = await S.ok('knowledge.crosswalk', P_STRANGLER, as, extra); await S.ok('knowledge.crosswalk-confirm', {...PERSON_STEP, id: x}, 'steward'); await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, id: x}, 'reviewer'); await reviewAgain();
      await S.refused(new RegExp('steward confirmed ' + x + ', which no person wrote'), 'knowledge.release', releaseOf(definition), 'steward');
      await S.refused(new RegExp('reviewer verified ' + x + ', which was ' + kind + ': a third person releases it'), 'knowledge.release', releaseOf(definition), 'reviewer');
      await S.ok('knowledge.release', releaseOf(definition), 'releaser');
    } finally { S.close(); }
  }
});

// ------------------------------------------------------------------------------------------------ 14 (ruling P4)
add('S2.14 (ruling P4): the bound of 24 rows per concept counts the rows that stand: an agent account fills a reviewed concept with proposals, a person retires them (and a second person rejects one), and the person\'s proposal is then accepted', async () => {
  const {KC} = await mods(), {S} = await strangler();
  try {
    const filled = [];
    for (let i = 1; i <= 24; i++) filled.push(await S.ok('knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'external', aliasId: 'EXT-FILL-' + String(i).padStart(2, '0'), label: 'Filler ' + i, relation: 'narrower', note: 'Proposed by an agent account.'}, 'bot'));
    const FULL = /PAT-STRANGLER-FIG has 24 crosswalk rows that stand \(neither retired nor rejected\), the most a concept holds: retire or reject one first\./;
    await S.refused(FULL, 'knowledge.crosswalk', P_STRANGLER, 'architect');
    // A person retires 23 of them; a person confirms the last and a second person rejects it.
    for (const id of filled.slice(0, 23)) await S.ok('knowledge.crosswalk-retire', {...PERSON_STEP, id, reason: 'Not a mechanism of this concept.'}, 'steward');
    await S.ok('knowledge.crosswalk-confirm', {...PERSON_STEP, id: filled[23]}, 'steward'); await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, decision: 'rejected', id: filled[23], reason: 'Not a mechanism of this concept.'}, 'reviewer');
    assert.deepEqual([...new Set(KC.crosswalkRecords(S.document).map(r => r.state))].sort(), ['rejected', 'retired']);
    const id = await S.ok('knowledge.crosswalk', P_STRANGLER, 'architect');
    assert.equal(KC.crosswalkRecords(S.document).find(r => r.id === id).state, 'proposed', 'the person\'s proposal is accepted');
    // The bound still holds for rows that stand: 23 more proposals fill it again, and the next is refused.
    for (let i = 25; i <= 47; i++) await S.ok('knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'external', aliasId: 'EXT-FILL-' + i, label: 'Filler ' + i, relation: 'narrower', note: 'Proposed by an agent account.'}, 'bot');
    await S.refused(FULL, 'knowledge.crosswalk', {...P_STRANGLER, aliasId: 'P-FACADE', label: 'Facade', relation: 'narrower'}, 'architect');
  } finally { S.close(); }
});

// ------------------------------------------------------------------------------------------------ 15 (ruling P5 a)
add('S2.15 (ruling P5 a): a released row whose register row no longer has the released copy\'s hash resolves nothing (a person\'s later edit, a register that lost the row); the concept view shows the register\'s state beside the release\'s', async () => {
  const {KC} = await mods(), {S, release} = await strangler();
  try {
    const id = await S.ok('knowledge.crosswalk', P_STRANGLER, 'architect'); await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, id}, 'reviewer'); const releaseId = await release();
    assert.equal(KC.resolveConcept(S.document, 'P-STRANGLER').conceptId, 'PAT-STRANGLER-FIG');
    { const a = KC.conceptAliases(S.document, 'PAT-STRANGLER-FIG').find(x => x.rowId === id); assert.deepEqual([a.relation, a.state, a.register, a.release], ['same', 'released', 'verified', {releaseId, relation: 'same', resolves: true}]); }
    { const q = clone(S.document); q.knowledge.crosswalk = []; assert.equal(KC.resolveConcept(q, 'P-STRANGLER'), null, 'a register that no longer holds the released row resolves nothing'); }
    // A person changes the released row from same to distinct: the register reads it proposed, and nothing resolves from the release.
    await S.ok('knowledge.crosswalk', {...P_STRANGLER, id, relation: 'distinct', reason: 'Not the same mechanism after all.'}, 'steward');
    assert.equal(KC.crosswalkRecords(S.document).find(r => r.id === id).state, 'proposed');
    assert.equal(KC.resolveConcept(S.document, 'P-STRANGLER'), null, 'the register\'s row no longer reads as the release copied it');
    const a = KC.conceptAliases(S.document, 'PAT-STRANGLER-FIG').filter(x => x.rowId === id);
    assert.deepEqual(a.map(x => [x.relation, x.state, x.register, x.release]), [['distinct', 'proposed', 'proposed', {releaseId, relation: 'same', resolves: false}]], 'one entry: the register\'s pending edit beside what the release holds');
  } finally { S.close(); }
});

// ------------------------------------------------------------------------------------------------ 16 (ruling P5 b)
// What a crosswalk step does to the library's design stamp, through the commands: the rows' own steps move no stamp (S2.10,
// assertStepsMoveNoStamp, which writes the steps into the row in place), but every knowledge command, the crosswalk's
// included, appends to knowledge.history and moves knowledge.version, which the design fingerprint reads on rc.10.73.42:
// a known limit, owned by S3 with the knowledge keys (rulings B10 and P5 b). This case states it; S3 turns it around.
add('S2.16 (ruling P5 b, a known limit for S3): through the commands, a person\'s confirmation and a second person\'s review of a row move the library\'s design stamp only through knowledge.history and knowledge.version', async () => {
  const {S} = await strangler();
  const stamp = d => { const q = rv.withFinalReview(clone(d), {upgrade: false}); return rv.reviewSourceStamp(q) + ' ' + rv.reviewDesignStamp(q); };
  try {
    const id = await S.ok('knowledge.crosswalk', {...P_STRANGLER, aliasId: 'P-FACADE', label: 'Facade', relation: 'narrower'}, 'importer', {authorKind: 'import'});
    for (const [type, payload, as] of [['knowledge.crosswalk-confirm', {...PERSON_STEP, id}, 'steward'], ['knowledge.crosswalk-review', {...ROW_REVIEW, id}, 'reviewer']]) {
      const before = clone(S.document); await S.ok(type, payload, as);
      assert.notEqual(stamp(S.document), stamp(before), type + ' moves the library\'s design stamp (the known limit)');
      assert.equal(S.document.knowledge.history.length, before.knowledge.history.length + 1); assert.notEqual(S.document.knowledge.version, before.knowledge.version);
      const back = clone(S.document); back.knowledge.history = before.knowledge.history; back.knowledge.version = before.knowledge.version;
      assert.equal(stamp(back), stamp(before), type + ': with the family\'s log and version put back, the stamp is the earlier one');
    }
  } finally { S.close(); }
});

// ------------------------------------------------------------------------------------------------ 17 (ruling P5 c)
add('S2.17 (ruling P5 c): the concept\'s review records the rows it saw; a release holds only the verified rows its standing review saw verified, as they read: a row verified after the review waits for the next review of the concept, and nothing lapses', async () => {
  const {KC} = await mods(), {S, release, conceptRecordId} = await strangler();
  try {
    const before = await S.ok('knowledge.crosswalk', P_STRANGLER, 'architect');
    await S.ok('knowledge.concept-review', {...CONCEPT_REVIEW, id: conceptRecordId}, 'reviewer');
    { const c = S.document.knowledge.concepts.find(x => x.id === conceptRecordId); assert.deepEqual(c.review.crosswalkSeen, [[before, KC.crosswalkRowHash(row(S.document, before)), 'proposed']], 'the review records each row that stands, with its hash and its state'); }
    await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, id: before}, 'reviewer');
    const after = await S.ok('knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'akr', aliasId: 'PAT-CIRCUIT-BREAKER', label: 'Circuit breaker', relation: 'narrower'}, 'architect'); await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, id: after}, 'reviewer');
    assert.equal(KC.conceptRecords(S.document).find(c => c.id === conceptRecordId).state, 'reviewed', 'a row verified after the concept\'s review lapses nothing');
    const first = await release({again: false});
    assert.equal(S.document.knowledge.releases.find(r => r.id === first).parts, undefined, 'the review saw neither row verified: the release holds none');
    assert.equal(KC.resolveConcept(S.document, 'P-STRANGLER'), null, 'a row verified after the concept\'s review waits for its next review');
    // The next review sees both, verified; the next release holds them.
    const second = await release();
    assert.deepEqual(S.document.knowledge.releases.find(r => r.id === second).parts.crosswalk.map(r => r.id), [before, after]);
    assert.equal(KC.resolveConcept(S.document, 'P-STRANGLER').conceptId, 'PAT-STRANGLER-FIG');
    // A concept with no row records no list (a review of rc44 S1 reads as it did).
    { const q = (await strangler()); try { const c = q.S.document.knowledge.concepts[0]; assert.equal('crosswalkSeen' in c.review, false); } finally { q.S.close(); } }
  } finally { S.close(); }
});

// ------------------------------------------------------------------------------------------------ 18 (ruling P5 d)
add('S2.18 (ruling P5 d, B3 for rows): a row whose review stands, of either decision, is changed only by a signed-in person: a second person\'s rejection of a row never verified is not undone by an agent account, a draft by Sol or an import', async () => {
  const {KC} = await mods(), {S} = await strangler();
  try {
    const id = await S.ok('knowledge.crosswalk', {...P_STRANGLER, conceptId: 'PAT-STRANGLER-FIG', aliasId: 'P-ADAPTER', label: 'Adapter'}, 'architect');
    await S.ok('knowledge.crosswalk-review', {...ROW_REVIEW, decision: 'rejected', reason: 'The adapter is not the strangler fig.', id}, 'reviewer');
    assert.equal(KC.crosswalkRecords(S.document).find(r => r.id === id).state, 'rejected');
    for (const [as, extra] of [['bot', {}], ['architect', {authorKind: 'sol-draft'}], ['importer', {authorKind: 'import'}]]) await S.refused(new RegExp(id + ' was rejected here or is in a release: only a signed-in person changes it'), 'knowledge.crosswalk', {...P_STRANGLER, aliasId: 'P-ADAPTER', label: 'Adapter', id, note: 'Proposed again.'}, as, extra);
    assert.equal(KC.crosswalkRecords(S.document).find(r => r.id === id).state, 'rejected', 'the rejection stands');
    await S.ok('knowledge.crosswalk', {...P_STRANGLER, aliasId: 'P-ADAPTER', label: 'Adapter', id, note: 'A person proposes it again.'}, 'steward');
    assert.equal(KC.crosswalkRecords(S.document).find(r => r.id === id).state, 'proposed', 'a person\'s edit is taken, and the rejection lapses');
  } finally { S.close(); }
});

// ------------------------------------------------------------------------------------------------ 19 (ruling P5 e)
add('S2.19 (ruling P5 e): an alias with the shape of a design record\'s reference is refused in every scheme; a handbook alias is a topic of the library or a whole id-shaped token of the evidence passage, never a fragment or a word of it', async () => {
  const {S, sourceId} = await strangler();
  try {
    for (const aliasId of ['REQ-001', 'COMP-001', 'ADR-001', 'IF-001']) await S.refused(new RegExp(aliasId + ' has the shape of a design record\'s reference \\(a prefix and a number, such as REQ-001\\): an alias names no design record'), 'knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'external', aliasId, label: aliasId, relation: 'narrower', note: 'From another register.'}, 'architect');
    // The evidence: a plain claim of the library on the passage's first line, which names SYN-S001.
    const evidence = await S.ok('knowledge.claim', {sourceId, lineStart: 1, lineEnd: 1, subjectId: 'The synthetic handbook entry', predicate: 'names', statement: 'The entry is SYN-S001, the strangler fig.', claimType: 'definition'}, 'importer');
    for (const aliasId of ['A', 'the', 'fig', 'SYN', 'S001', 'SYN-S00']) await S.refused(new RegExp(aliasId + ' is neither a topic of this library nor named by the passage of the claim given as evidence \\(' + evidence + '\\) as a whole identifier'), 'knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'handbook', aliasId, label: aliasId, relation: 'narrower', evidenceClaimId: evidence}, 'architect');
    await S.ok('knowledge.crosswalk', {conceptId: 'PAT-STRANGLER-FIG', scheme: 'handbook', aliasId: 'SYN-S001', label: 'Strangler fig (synthetic handbook)', relation: 'narrower', evidenceClaimId: evidence}, 'architect');
  } finally { S.close(); }
});

// ------------------------------------------------------------------------------------------------ 20 (ruling P5 g)
// No row is written by a merge or a template copy, so none needs a confirmation for that reason (correcting the
// builder's statement): a template copy keeps no knowledge (S2.10), and an alternative or a reviewed batch that carries a
// crosswalk command is refused, so a merge has none to apply. (A guard: green on 37520d6 as after.)
add('S2.20 (ruling P5 g): no crosswalk row can be written by a merge or a template copy: an alternative and a reviewed batch that carry a crosswalk command are refused through the service, and a template copy keeps no knowledge', async () => {
  const {S} = await strangler();
  try {
    const commands = [{type: 'knowledge.crosswalk', payload: P_STRANGLER}];
    for (const [type, payload] of [['workspace.alternative', {commands, stamp: 'x', title: 'An alternative with a row', reason: 'Holds a crosswalk row.'}], ['workspace.apply', {commands, stamp: 'x', reviewed: true, reason: 'A batch with a row.'}]])
      await S.refused(/This action must use its chapter review workflow|Unknown Review & realize action/, type, payload, 'architect');
    assert.equal(S.document.knowledge.crosswalk, undefined, 'no row was written'); assert.deepEqual(S.document.workbench?.alternatives || [], []);
  } finally { S.close(); }
});
