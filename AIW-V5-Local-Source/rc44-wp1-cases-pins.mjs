// rc44, work package 1, slice S3 (audit/rc44/design/wp1-knowledge.md, section g): releases with parts, pins, currency and
// findings. A release of concepts (knowledge.release with conceptIds) holds, beside its form claims and inside its
// checksum, each concept as it was released (its identity, its topics, its version, its hash, its forms and its review)
// and the register of what changed against the release it supersedes. An organisation release carries the same parts
// inside its signed checksum. A project relies on a released concept through a concept pin (knowledge.conceptPins, KU) and
// links a record to it through the pin (knowledge.conceptLinks, KB). Each pin's currency is written by one function
// (refreshConceptPins) after every knowledge command and on every read; the package p10-knowledge raises one finding per
// link whose pin is not current, and a person moves a pin only through a proposed migration that a second person accepts.
// What these cases hold:
//   - a pin, a link through a pin and a migration are a person's steps; a migration is accepted by a second person, and
//     the person who proposed it, or who confirmed a draft of it, is refused;
//   - candidate or unreleased knowledge never reaches a finding, a score, an eligibility gate or a conformance reading;
//   - a withdrawn or forged release is ineligible, with its reason; a forged or unsigned notice is ignored;
//   - nothing in a linked record changes when a successor is published: the finding says so instead;
//   - an old document reads byte-identically (findings, stamps, fingerprint, SDD text, release checksums), with no pin.
// Synthetic fixtures only. Nothing here is knowledge; productionAccepted stays false.
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import * as F from './rc44-wp1-knowledge-fixtures.mjs';
import * as R from './rc44-s0-readings.mjs';
import * as K from './public/knowledge-governance.js';
import * as rv from './public/review-domain.js';
import {designReadings, moved} from './rc44-wp1-cases-forms.mjs';
import {recordGraph} from './public/record-graph.js';
import {linkedVia, requirementTrace} from './public/trace-kernel.js';
import {architectureMarkdown} from './public/sdd-architecture.js';
import {neutraliseImportedAuthority} from './recovery-service.js';
import {digest} from './public/brain-integrity.js';

const AT = F.AT, clone = v => structuredClone(v), PACKAGE = 'p10-knowledge';
const mods = async () => ({KC: await import('./public/knowledge-concepts.js'), CC: await import('./public/knowledge-concept-commands.js'), KP: await import('./public/knowledge-pins.js')});
// The design package's command types (S2's four and this slice's seven): no command of the entry.
export const PIN_TYPES = ['knowledge.concept-pin', 'knowledge.concept-link', 'knowledge.concept-unlink', 'knowledge.concept-migration', 'knowledge.concept-migration-confirm', 'knowledge.concept-repin', 'knowledge.concept-unpin'];
export const cases = [];
const add = (name, run) => cases.push({name, run});

// ------------------------------------------------------------------------------------------------ the synthetic library
const CONCEPT = {conceptId: 'SYN-P001', title: 'Transactional outbox', kind: 'pattern', family: 'Reliable publication', scope: ['data-owner', 'interaction'], stages: [5, 8], lenses: ['integrity', 'reliability'], steward: 'Integration guild', reviewDue: '2027-11-16', reviewTriggers: ['platform-contract'], notAdopted: [], forms: []};
const CONCEPT_REVIEW = {decision: 'verified', reviewer: 'Synthetic second person', reason: 'Checked the identity, each form and its membership.', reviewed: true, identityChecked: true, formsChecked: true, crosswalkChecked: true};
const LIBRARY_MARK = {enabled: true, reason: 'This project authors one tranche of the synthetic handbook.', reviewer: 'Synthetic steward', reviewed: true};
const STEP = {reviewer: 'Synthetic architect', reason: 'This design relies on the released concept.', reviewed: true};
const FORMS = ['definition', 'applicability'];
// The applicability form with another avoid-when (a changed form: the claim's hash moves, the quote is the same).
const changedApplicability = () => { const f = F.p001Forms().applicability, c = clone(f); c.content.avoidWhen[0].text = 'Nothing has to be published after the caller reads data.'; return c; };
const findings11 = p => rv.inheritedFindings(p).filter(f => f.chapterTitle === 'Knowledge support');
const packageFindings = async p => { const X = await import('./public/design-extensions.js'); return X.EXTENSIONS.filter(e => e.id === PACKAGE).flatMap(e => e.checks?.[11]?.(p) || []); };
const pins = d => d.knowledge?.conceptPins || [], links = d => d.knowledge?.conceptLinks || [], migrations = d => d.knowledge?.conceptMigrations || [];

// In process: a library written through the entry (knowledge-concept-commands.js applyConceptCommand) as a person, the
// concept SYN-P001 with the forms asked, reviewed by `reviewer`, released with conceptIds by `releaser`, activated.
async function libraryDoc({forms = FORMS, release = true, author = F.person, base = null} = {}) {
  const {CC} = await mods(); let p = base || F.blankProject();
  const k = (type, payload, actor = 'importer', opts = F.person(actor)) => { const r = CC.applyConceptCommand(p, {type: 'knowledge.' + type, payload}, AT, actor, opts); p = r.document; return r.selected; };
  k('library', LIBRARY_MARK, 'steward');
  const sourceId = k('source', F.sourcePayload('SYN-P001 Transactional outbox', F.SYN_P001), 'importer', author('importer'));
  const record = k('concept', CONCEPT, 'importer', author('importer')), all = F.p001Forms(), claimIds = {};
  for (const t of forms) claimIds[t] = k('claim', F.formClaim(sourceId, 'SYN-P001', all[t]), 'importer', author('importer'));
  k('concept', {...CONCEPT, id: record, forms: forms.map(t => ({type: t, claimId: claimIds[t]}))}, 'importer', author('importer'));
  for (const t of forms) k('review', {...F.REVIEW, formChecked: true, id: claimIds[t]}, 'reviewer');
  k('concept-review', {...CONCEPT_REVIEW, id: record}, 'reviewer');
  let releaseId = null;
  if (release) { releaseId = k('release', {...F.REVIEW, title: 'Synthetic integration concepts 1', conceptIds: ['SYN-P001']}, 'releaser'); k('activate', {...F.REVIEW, id: releaseId, stamp: K.knowledgeStamp(p)}, 'releaser'); }
  return {k, sourceId, record, claimIds, releaseId, get document() { return p; }, set document(v) { p = v; }};
}
// A package command through its boundary (design-extension-boundary.js extensionHandler: who may take the step), in process.
async function packaged(doc, type, payload, actor, opts = F.person(actor), at = AT) {
  await import('./worker.js'); const {extensionHandler} = await import('./design-extension-boundary.js'), h = extensionHandler(type);
  assert(h, type + ' is a type of the design package');
  return h(doc, {type, payload}, at, actor, opts);
}

// Through the real boundary (worker.js): an organisation, a knowledge library its administrator owns, design projects.
// Accounts: steward (the organisation's administrator and the library's owner), importer, reviewer, releaser, architect
// and second-architect (the organisation's editors), bot (an agent account).
async function world() {
  const {default: worker} = await import('./worker.js'), {localDatabase} = await import('./local-db.js');
  const files = new Map(), asBuffer = v => Buffer.isBuffer(v) ? v : typeof v === 'string' ? Buffer.from(v) : Buffer.from(v.buffer ? new Uint8Array(v.buffer, v.byteOffset, v.byteLength) : v);
  const env = {AIW_AGENT_ACTORS: 'bot', DB: localDatabase(':memory:'), FILES: {async put(k, v) { files.set(k, asBuffer(v)); }, async get(k) { if (!files.has(k)) return null; const b = files.get(k); return {text: async () => b.toString('utf8'), arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)}; }, async delete(k) { files.delete(k); }}, ASSETS: {fetch: () => new Response('asset')}};
  const api = async (path, body, as) => { const r = await worker.fetch(new Request('https://aiw.test' + path, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': as, Origin: 'https://aiw.test', ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env); let data = null; try { data = await r.json(); } catch { data = null; } return {status: r.status, data}; };
  async function project(owner, template, name, editors = []) {
    const created = await api('/api/projects', {name, template}, owner); assert(created.status < 300, JSON.stringify(created.data).slice(0, 300));
    const id = created.data.document.id; let state = created.data;
    for (const actor of editors) await env.DB.prepare('INSERT INTO project_access(owner_id,project_id,actor_id,role,created_at) VALUES(?,?,?,?,?)').bind(owner, id, actor, 'editor', AT).run();
    const send = async (type, payload, as = owner, extra = {}) => { const r = await api('/api/commands?project=' + id, {revision: state.revision, command: {type, payload}, ...extra}, as); if (r.status === 200) state = r.data; return r; };
    const ok = async (...args) => { const r = await send(...args); assert.equal(r.status, 200, args[0] + ' by ' + (args[2] || owner) + ': ' + JSON.stringify(r.data).slice(0, 500)); return r.data.selected; };
    const refused = async (pattern, ...args) => { const before = JSON.stringify(state.document); const r = await send(...args); assert.notEqual(r.status, 200, args[0] + ' by ' + (args[2] || owner) + ' was accepted'); assert.match(String(r.data?.error || JSON.stringify(r.data)), pattern, args[0] + ' by ' + (args[2] || owner)); assert.equal(JSON.stringify(state.document), before, 'a refusal writes nothing'); return r; };
    const read = async (as = owner) => { const r = await api('/api/project?project=' + id, null, as); assert.equal(r.status, 200, JSON.stringify(r.data).slice(0, 300)); state = r.data; return r.data.document; };
    return {id, owner, send, ok, refused, read, get document() { return state.document; }, get state() { return state; }};
  }
  const org = await api('/api/organizations?action=create', {title: 'Northquay integration guild', purpose: 'Integration knowledge shared by its projects'}, 'steward'); assert.equal(org.status, 201, JSON.stringify(org.data));
  const O = org.data.id, orgApi = (action, body, as, projectId = null) => api('/api/organizations?organization=' + O + '&action=' + action + (projectId ? '&project=' + projectId : ''), body, as);
  for (const actor of ['architect', 'second-architect', 'importer', 'reviewer', 'releaser']) assert.equal((await orgApi('members', {actorId: actor, role: 'editor'}, 'steward')).status, 200);
  return {api, env, project, orgApi, O, close: () => env.DB.close?.()};
}
// The library of the world: SYN-P001 with its definition and applicability forms, written by importer (as a person, or
// as an import), verified by reviewer, released with conceptIds by releaser and activated; then published to the
// organisation by its administrator, steward, who wrote none of it.
// (`marker` marks the project a library: its owner unless named; the fix-up's case S3.21 names a person for an agent's library.)
async function worldLibrary(W, {authorKind = null, name = 'Northquay knowledge library', conceptId = 'SYN-P001', owner = 'steward', marker = owner, writer = 'importer', row = null, rowWriter = 'architect'} = {}) {
  const L = await W.project(owner, 'blank', name, ['steward', 'importer', 'reviewer', 'releaser', 'architect', 'second-architect', 'bot'].filter(a => a !== owner)), extra = authorKind ? {authorKind} : {};
  await L.ok('knowledge.library', LIBRARY_MARK, marker);
  const sourceId = await L.ok('knowledge.source', F.sourcePayload('SYN-P001 Transactional outbox', F.SYN_P001), writer, extra);
  const concept = {...CONCEPT, conceptId}, record = await L.ok('knowledge.concept', concept, writer, extra), all = F.p001Forms(), claimIds = {};
  for (const t of FORMS) claimIds[t] = await L.ok('knowledge.claim', F.formClaim(sourceId, conceptId, all[t]), writer, extra);
  await L.ok('knowledge.concept', {...concept, id: record, forms: FORMS.map(t => ({type: t, claimId: claimIds[t]}))}, writer, extra);
  for (const t of FORMS) await L.ok('knowledge.review', {...F.REVIEW, formChecked: true, id: claimIds[t]}, 'reviewer');
  // A crosswalk row of the concept, as asked: proposed by rowWriter, verified by reviewer, seen by the concept's review.
  const rowId = row ? await L.ok('knowledge.crosswalk', {conceptId, scheme: 'external', label: 'Outbox (an external register)', relation: 'same', note: 'The register names it so.', evidenceClaimId: claimIds.definition, aliasId: 'Outbox', ...row}, rowWriter) : null;
  if (rowId) await L.ok('knowledge.crosswalk-review', {decision: 'verified', reviewer: 'Synthetic second person', reason: 'Checked the alias against its passage.', reviewed: true, aliasChecked: true, id: rowId}, 'reviewer');
  await L.ok('knowledge.concept-review', {...CONCEPT_REVIEW, id: record}, 'reviewer');
  const release = async (title, more = {}) => { const id = await L.ok('knowledge.release', {...F.REVIEW, title, conceptIds: [conceptId], ...more}, 'releaser'); await L.ok('knowledge.activate', {...F.REVIEW, id, stamp: K.knowledgeStamp(L.document)}, 'releaser'); return id; };
  const publish = async (releaseId, title, as = owner) => { const r = await W.orgApi('knowledge', {releaseId, title, reason: 'One release for every integration design of the guild.', reviewed: true}, as, L.id); assert.equal(r.status, 201, JSON.stringify(r.data).slice(0, 400)); return r.data.release; };
  const v1 = await release('Synthetic integration concepts 1');
  // A successor: importer changes what the concept says (a person's edit lapses its review), reviewer verifies it again,
  // releaser releases it as the successor of `from` and activates it.
  const successor = async (from, title, change = {reviewDue: '2028-01-31'}) => { await L.ok('knowledge.concept', {...concept, id: record, forms: L.document.knowledge.concepts.find(c => c.id === record).forms, ...change}, writer, extra); await L.ok('knowledge.concept-review', {...CONCEPT_REVIEW, id: record}, 'reviewer'); return release(title, {supersedes: from}); };
  return {L, sourceId, record, claimIds, v1, release, publish, successor, conceptId, rowId};
}
// A design project of architect's (the bank-payment reference: its component api-pod), the organisation release pinned
// through the organisation route, SYN-P001 pinned and api-pod linked through the pin.
async function worldDesign(W, OR, {link = true, name = 'Northquay booking design', conceptId = 'SYN-P001'} = {}) {
  const D = await W.project('architect', 'bank-payment', name, ['second-architect', 'bot']);
  await D.read();
  const pinned = await W.orgApi('knowledge-pin', {releaseId: OR.id, revision: D.state.revision, reviewed: true, reason: 'This design publishes booking notices.', reviewer: 'Synthetic architect'}, 'architect', D.id); assert.equal(pinned.status, 200, JSON.stringify(pinned.data).slice(0, 400));
  await D.read();
  const pinId = await D.ok('knowledge.concept-pin', {conceptId, releaseId: OR.id, ...STEP}, 'architect');
  const linkId = link ? await D.ok('knowledge.concept-link', {pinId, objectId: 'api-pod', ...STEP}, 'architect') : null;
  return {D, pinId, linkId};
}

// ------------------------------------------------------------------------------------------------ 1 (fails today)
add('S3.1 (fails today): a design project pins an organisation release, links a component through a pin, the library publishes a successor; the project\'s knowledge findings hold "Review a newer knowledge version" for that component, and its forms are unchanged', async () => {
  const {KC} = await mods(), W = await world();
  try {
    const lib = await worldLibrary(W), OR1 = await lib.publish(lib.v1, 'Synthetic integration concepts 1');
    const {D, pinId, linkId} = await worldDesign(W, OR1);
    let doc = await D.read();
    const before = {forms: KC.conceptDecisionReading(doc, pinId), component: clone(doc.realisation.components.find(c => c.id === 'api-pod')), pin: clone(pins(doc).find(p => p.id === pinId))};
    assert.equal(before.pin.version, 1); assert.deepEqual(before.forms.reasons, []); assert.deepEqual(before.forms.forms.map(f => f.type), ['applicability'], 'the pinned version hands its decision-bearing form over');
    assert.deepEqual(findings11(doc), [], 'a current pin raises nothing');
    const stampOf = d => { const q = rv.withFinalReview(clone(d), {upgrade: false}); return rv.reviewSourceStamp(q) + ' ' + rv.reviewDesignStamp(q); }, designStamp = stampOf(doc);
    // The library publishes version 2 as the successor of version 1.
    const v2 = await lib.successor(lib.v1, 'Synthetic integration concepts 2'), OR2 = await lib.publish(v2, 'Synthetic integration concepts 2');
    assert.equal(OR2.from.supersedes, OR1.id, 'the organisation release names the release it supersedes');
    doc = await D.read();
    const raised = findings11(doc);
    assert.deepEqual(raised.map(f => [f.title, f.objectId, f.level]), [['Review a newer knowledge version', 'api-pod', 'warning']], 'the component raises the version finding');
    assert.deepEqual((await packageFindings(doc)).map(f => f.id), ['knowledge:' + linkId], 'one finding per link, named by the link');
    // (The finding is the package's, in the review's own list with the knowledge findings (rulings E5 and D7.4): the
    // reader of plain claim links, which the Brain reads too, is not handed a form (rulings B1 and E2).)
    assert.deepEqual(K.knowledgeFindings(doc), [], 'knowledgeFindings, the reader of plain claim links, is as it was');
    assert.match(raised[0].detail, /SYN-P001 v1/); assert.match(raised[0].detail, /v2/);
    assert.deepEqual(KC.conceptDecisionReading(doc, pinId), before.forms, 'the pinned forms are unchanged: still version 1');
    assert.deepEqual(doc.realisation.components.find(c => c.id === 'api-pod'), before.component, 'nothing in the linked record changed');
    const pin = pins(doc).find(p => p.id === pinId); assert.equal(pin.version, 1); assert.equal(pin.releaseId, OR1.id); assert.equal(pin.status, 'active');
    assert.equal(stampOf(doc), designStamp, 'a successor published elsewhere moves no design stamp of the project: the finding says so instead');
  } finally { W.close(); }
});

// ------------------------------------------------------------------------------------------------ 2
add('S3.2 (release parts): a release made with conceptIds holds each concept as released (identity, topics, version, hash, forms with their claim hash and tier, its review) and the change register, inside its checksum; one without conceptIds has no concept parts and the checksum the old code gives; the releaser is refused when they wrote a form, and when they verified an imported one', async () => {
  const {KC} = await mods(), L = await libraryDoc(), p = L.document, r = p.knowledge.releases.find(x => x.id === L.releaseId);
  assert.equal(r.parts.concepts.length, 1); const c = r.parts.concepts[0];
  assert.deepEqual([c.conceptId, c.version, c.title, c.kind], ['SYN-P001', 1, 'Transactional outbox', 'pattern']);
  assert.equal(c.conceptHash, KC.conceptRecords(p).find(x => x.conceptId === 'SYN-P001').hash, 'the hash of the concept as reviewed');
  assert.deepEqual(c.forms.map(f => [f.type, f.claimId, f.claimHash, f.tier]), FORMS.map(t => [t, L.claimIds[t], digest(p.knowledge.claims.find(x => x.id === L.claimIds[t])), t === 'definition' ? 'teaching' : 'decision']));
  assert.equal(c.review.actor, 'reviewer'); assert.deepEqual(c.topics, []);
  assert.deepEqual(r.parts.changes, [{conceptId: 'SYN-P001', change: 'added', forms: FORMS.map(t => ({type: t, was: null, now: digest(p.knowledge.claims.find(x => x.id === L.claimIds[t]))})), note: ''}]);
  assert.equal(r.checksum, digest({...r, checksum: undefined}), 'the parts are in the checksum');
  assert.deepEqual(r.claims.map(x => x.id).sort(), Object.values(L.claimIds).sort(), 'the release holds the concept\'s forms, whole');
  assert.equal(KC.releasedConcepts(p)[0].eligible, true);
  // Tampered parts: the release is no longer the release as made, and nothing of it is usable.
  { const q = clone(p); q.knowledge.releases[0].parts.concepts[0].title = 'Another title'; const held = KC.releasedConcepts(q)[0]; assert.equal(held.eligible, false); }
  // A release of the same forms made without conceptIds (as in S1 and S2): no concept parts, the checksum of the old code.
  { const L2 = await libraryDoc({release: false}), id = L2.k('release', {...F.REVIEW, title: 'Synthetic forms', claimIds: Object.values(L2.claimIds)}, 'releaser'), x = L2.document.knowledge.releases.find(y => y.id === id);
    assert.equal(x.parts, undefined, 'no parts without conceptIds and without rows'); assert.equal(x.checksum, digest({...x, checksum: undefined}));
    // conceptIds with plain claims is no release (ruling E4: plain claims or forms, never both), nor conceptIds with other claim ids.
    assert.throws(() => L2.k('release', {...F.REVIEW, title: 'Mixed', conceptIds: ['SYN-P001'], claimIds: [L2.claimIds.definition]}, 'releaser'), /conceptIds names the claims it releases/);
    assert.throws(() => L2.k('release', {...F.REVIEW, title: 'Nothing', conceptIds: ['SYN-P999']}, 'releaser'), /SYN-P999 is not in the concept register/);
    // The releasing actor: refused when they wrote a form; and, for an imported form, when they verified it.
    assert.throws(() => L2.k('release', {...F.REVIEW, title: 'By its author', conceptIds: ['SYN-P001']}, 'importer'), /importer wrote/);
    const I = await libraryDoc({release: false, author: F.importedBy});
    assert.throws(() => I.k('release', {...F.REVIEW, title: 'By its verifier', conceptIds: ['SYN-P001']}, 'reviewer'), /reviewer verified KC-\d+, which was imported: a third person releases it/);
    assert.ok(I.k('release', {...F.REVIEW, title: 'By a third person', conceptIds: ['SYN-P001']}, 'releaser')); }
});

// ------------------------------------------------------------------------------------------------ 3
add('S3.3 (versions): a successor that holds the concept at the same hash keeps its version; one whose form changed takes the next, and its change register names the changed form', async () => {
  const L = await libraryDoc(), first = L.releaseId;
  const same = L.k('release', {...F.REVIEW, title: 'Synthetic integration concepts 1, again', conceptIds: ['SYN-P001'], supersedes: first}, 'releaser');
  const s = L.document.knowledge.releases.find(x => x.id === same);
  assert.equal(s.parts.concepts[0].version, 1, 'the same hash keeps the version'); assert.deepEqual(s.parts.changes, [], 'nothing changed');
  // The applicability form is replaced by one with another avoid-when; the concept is reviewed again.
  const changed = L.k('claim', F.formClaim(L.sourceId, 'SYN-P001', changedApplicability()), 'importer');
  L.k('review', {...F.REVIEW, formChecked: true, id: changed}, 'reviewer');
  L.k('concept', {...CONCEPT, id: L.record, forms: [{type: 'definition', claimId: L.claimIds.definition}, {type: 'applicability', claimId: changed}]}, 'importer');
  L.k('concept-review', {...CONCEPT_REVIEW, id: L.record}, 'reviewer');
  const second = L.k('release', {...F.REVIEW, title: 'Synthetic integration concepts 2', conceptIds: ['SYN-P001'], supersedes: same}, 'releaser');
  const r = L.document.knowledge.releases.find(x => x.id === second), claims = id => digest(L.document.knowledge.claims.find(x => x.id === id));
  assert.equal(r.parts.concepts[0].version, 2, 'a changed form takes the next version');
  assert.deepEqual(r.parts.changes, [{conceptId: 'SYN-P001', change: 'changed', forms: [{type: 'applicability', was: claims(L.claimIds.applicability), now: claims(changed)}], note: ''}], 'the change register names the changed form');
  const {KC} = await mods(); assert.deepEqual(KC.releaseChangeRegister(L.document, second), r.parts.changes);
});

// ------------------------------------------------------------------------------------------------ 4
add('S3.4 (currency): each state in its order, with its title, and today injected: current, due (the concept\'s review date and a source\'s), newer-available, changed, replaced, retired, withdrawn', async () => {
  const {KC} = await mods(), L = await libraryDoc();
  const pinned = (await packaged(L.document, 'knowledge.concept-pin', {conceptId: 'SYN-P001', releaseId: L.releaseId, ...STEP}, 'architect')).document, pin = pins(pinned)[0];
  const state = (doc, today = '2026-11-16') => { const c = KC.conceptPinCurrency(doc, pins(doc)[0], {today}); return [c.state, c.title]; };
  assert.deepEqual(state(pinned), ['current', 'Knowledge is current']);
  assert.deepEqual(state(pinned, '2027-11-17'), ['due', 'Knowledge due for re-validation'], 'the concept\'s review date is before today');
  { const q = clone(pinned); q.knowledge.sources[0].reviewDue = '2026-11-01'; assert.deepEqual(state(q), ['due', 'Knowledge due for re-validation'], 'a form\'s source is due'); }
  // newer-available: an own release supersedes the pinned one and holds the concept at another hash.
  { const M = await libraryDoc(); M.document = (await packaged(M.document, 'knowledge.concept-pin', {conceptId: 'SYN-P001', releaseId: M.releaseId, ...STEP}, 'architect')).document;
    M.k('concept', {...CONCEPT, id: M.record, forms: M.document.knowledge.concepts[0].forms, reviewDue: '2028-01-31'}, 'importer'); M.k('concept-review', {...CONCEPT_REVIEW, id: M.record}, 'reviewer');
    M.k('release', {...F.REVIEW, title: 'Synthetic integration concepts 2', conceptIds: ['SYN-P001'], supersedes: M.releaseId}, 'releaser');
    assert.deepEqual(state(M.document), ['newer-available', 'Review a newer knowledge version']);
    // Activating the successor replaces the pinned release: the pin reads replaced.
    M.k('activate', {...F.REVIEW, id: M.document.knowledge.releases.at(-1).id, stamp: K.knowledgeStamp(M.document)}, 'releaser');
    assert.deepEqual(state(M.document), ['replaced', 'Review changed architectural support']); }
  // changed: a form claim of the pinned version is ineligible for another reason, or the hash the pin names is not the release's.
  { const q = clone(pinned); q.knowledge.releases[0].claims[0].statement += ' Tampered.'; assert.deepEqual(state(q), ['changed', 'Review changed architectural support']); }
  { const q = clone(pinned); q.knowledge.conceptPins[0].conceptHash = '0'.repeat(64); assert.deepEqual(state(q), ['changed', 'Review changed architectural support']); }
  // replaced: the release is no longer active in the project.
  { const q = clone(pinned); q.knowledge.pins = []; assert.deepEqual(state(q), ['replaced', 'Review changed architectural support']); }
  // retired: the concept is retired in this project's register behind the active pin (ruling B10).
  { const q = clone(pinned); q.knowledge.concepts[0].retired = {at: AT, actor: 'steward', reviewer: 'Synthetic steward', reason: 'Superseded by a successor concept.'}; assert.deepEqual(state(q), ['retired', 'Review retired knowledge']); }
  // withdrawn: a withdrawal of the concept, the release, a form or its source; first of all.
  for (const target of ['SYN-P001', L.releaseId, L.claimIds.applicability, L.sourceId]) { const q = clone(pinned); q.knowledge.withdrawals.push({id: 'KW-0099', targetId: target, at: AT, actor: 'steward', reason: 'Withdrawn in the synthetic suite.'}); q.knowledge.pins = []; assert.deepEqual(state(q), ['withdrawn', 'Review withdrawn knowledge'], target); }
  // The one writer: refreshConceptPins stores the currency beside the pins, and writes nothing for a document with no pin.
  { const q = clone(pinned); q.knowledge.pins = []; const out = KC.refreshConceptPins(q, {today: '2026-11-16'}); assert.equal(out.knowledge.pinCurrency[pin.id].state, 'replaced'); }
  { const q = clone(L.document), was = JSON.stringify(q); KC.refreshConceptPins(q, {today: '2026-11-16'}); assert.equal(JSON.stringify(q), was, 'no pin, nothing written'); }
});

// ------------------------------------------------------------------------------------------------ 5
add('S3.5 (withdrawal): the organisation withdraws a release; the pinned release is ineligible with its reason, the pin reads withdrawn and the record raises "Review withdrawn knowledge"; a forged or unsigned notice is ignored', async () => {
  const {KC} = await mods(), W = await world();
  try {
    const lib = await worldLibrary(W), OR1 = await lib.publish(lib.v1, 'Synthetic integration concepts 1'), {D, pinId} = await worldDesign(W, OR1);
    const WITHDRAW = {releaseId: OR1.id, reason: 'The guild found the relay guidance wrong for its carriers.', reviewed: true};
    // A forged notice (a signature that is not the organisation's) and an unsigned one are ignored.
    const notice = {kind: 'knowledge-notice', id: 'notice:' + OR1.id, organizationId: W.O, releaseId: OR1.id, withdrawn: {at: AT, by: 'steward', reason: 'Forged.'}};
    for (const forged of [{...notice, signature: 'f'.repeat(64)}, notice]) {
      await W.env.DB.prepare('INSERT INTO organization_releases(organization_id,id,document,created_at) VALUES(?,?,?,?) ON CONFLICT(organization_id,id) DO UPDATE SET document=excluded.document').bind(W.O, notice.id, JSON.stringify(forged), AT).run();
      const doc = await D.read(); assert.equal(K.organizationReleases(doc)[0].assurance.eligible, true, 'a forged or unsigned notice is ignored'); assert.equal(doc.knowledge.pinCurrency[pinId].state, 'current'); assert.deepEqual(findings11(doc), []);
    }
    assert.equal((await W.orgApi('knowledge-withdraw', WITHDRAW, 'architect')).status, 403, 'only an administrator withdraws');
    assert.equal((await W.orgApi('knowledge-withdraw', {...WITHDRAW, reviewed: false}, 'steward')).status, 400, 'the administrator reviews the withdrawal');
    const w = await W.orgApi('knowledge-withdraw', WITHDRAW, 'steward'); assert.equal(w.status, 200, JSON.stringify(w.data));
    const doc = await D.read(), held = K.organizationReleases(doc)[0];
    assert.equal(held.assurance.eligible, false); assert.match(held.assurance.status, /Withdrawn by the organisation: The guild found the relay guidance wrong/);
    assert.equal(doc.knowledge.pinCurrency[pinId].state, 'withdrawn');
    assert.deepEqual(findings11(doc).map(f => [f.title, f.objectId]), [['Review withdrawn knowledge', 'api-pod']]);
    assert.match(findings11(doc)[0].detail, /The guild found the relay guidance wrong/);
    assert.deepEqual(KC.conceptDecisionForms(doc, pinId), [], 'a withdrawn release hands over nothing');
    // The library's own listings show no notice.
    assert.ok(!(await W.orgApi('releases', null, 'steward')).data.releases.some(r => r.kind === 'knowledge-notice'), 'the library releases list no notice');
    assert.ok(!(await W.orgApi('knowledge', null, 'steward')).data.releases.some(r => String(r.id).startsWith('notice:')), 'the knowledge releases list no notice');
    { await D.read(); const r = await W.orgApi('install', {releaseId: 'notice:' + OR1.id, revision: D.state.revision, reviewed: true}, 'architect', D.id); assert.equal(r.status, 400); assert.equal(r.data.error, 'Choose an existing release.', 'a notice is no release a project installs'); }
  } finally { W.close(); }
});

// ------------------------------------------------------------------------------------------------ 6
add('S3.6 (migration): a migration is proposed (by Sol, or by a person) and accepted by a second person: the proposer is refused, a draft by Sol needs a person behind it first and that person does not then accept it alone, a stale stamp is refused; after the repin the old link raises the version finding until a person links the record again, and nothing in the linked record changed', async () => {
  const {KC} = await mods(), W = await world();
  try {
    const lib = await worldLibrary(W), OR1 = await lib.publish(lib.v1, 'Synthetic integration concepts 1'), {D, pinId, linkId} = await worldDesign(W, OR1);
    const v2 = await lib.successor(lib.v1, 'Synthetic integration concepts 2'), OR2 = await lib.publish(v2, 'Synthetic integration concepts 2');
    await D.read(); { const r = await W.orgApi('knowledge-pin', {releaseId: OR2.id, revision: D.state.revision, reviewed: true, reason: 'The successor edition.', reviewer: 'Synthetic architect'}, 'architect', D.id); assert.equal(r.status, 200, JSON.stringify(r.data)); }
    let doc = await D.read(); const component = clone(doc.realisation.components.find(c => c.id === 'api-pod'));
    // Sol drafts the migration (an agent account): a proposal, which moves no design stamp.
    const stamp = d => { const q = rv.withFinalReview(clone(d), {upgrade: false}); return rv.reviewSourceStamp(q); }, s0 = stamp(doc);
    const m = await D.ok('knowledge.concept-migration', {pinId, toReleaseId: OR2.id, reason: 'The guild published version 2.'}, 'bot');
    doc = D.document; assert.equal(stamp(doc), s0, 'a proposal says nothing to the design fingerprint (ruling L6)');
    const mig = migrations(doc).find(x => x.id === m); assert.deepEqual([mig.fromVersion, mig.toVersion], [1, 2]); assert.ok(mig.changes.length >= 0);
    const REPIN = d => ({id: m, stamp: KC.migrationStamp(d, m), ...STEP});
    await D.refused(/An agent or service account does not review, confirm, accept or approve \(knowledge\.concept-repin\)/, 'knowledge.concept-repin', REPIN(D.document), 'bot');
    // One person accepting what only a draft by Sol wrote is one person, not two (ruling D1): refused until a person confirms it.
    await D.refused(/A second person's step needs two persons/, 'knowledge.concept-repin', REPIN(D.document), 'architect');
    await D.ok('knowledge.concept-migration-confirm', {id: m, ...STEP}, 'architect');
    await D.refused(/A second person's step needs two persons/, 'knowledge.concept-repin', REPIN(D.document), 'architect');
    // A stale stamp is refused.
    await D.refused(/The migration or the records that rely on the pin changed/, 'knowledge.concept-repin', {...REPIN(D.document), stamp: '0'.repeat(64)}, 'second-architect');
    const moved = await D.ok('knowledge.concept-repin', REPIN(D.document), 'second-architect');
    doc = D.document;
    const old = pins(doc).find(p => p.id === pinId), now = pins(doc).find(p => p.id === moved);
    assert.deepEqual([old.status, old.movedTo, now.status, now.version, now.releaseId], ['moved', moved, 'active', 2, OR2.id]);
    assert.equal(migrations(doc).find(x => x.id === m).review.actor, 'second-architect'); assert.equal(migrations(doc).find(x => x.id === m).review.account, 'person');
    assert.deepEqual(links(doc).find(l => l.id === linkId).pinId, pinId, 'the link is not rewritten');
    assert.deepEqual(findings11(doc).map(f => [f.title, f.objectId]), [['Review SYN-P001: this record rests on version 1; the project now pins version 2', 'api-pod']]);
    assert.deepEqual(doc.realisation.components.find(c => c.id === 'api-pod'), component, 'nothing in the linked record changed');
    // Linked again through the new pin, by a person: the finding is gone, the old link and the old pin stay in the document.
    await D.ok('knowledge.concept-link', {pinId: moved, objectId: 'api-pod', ...STEP}, 'architect');
    doc = D.document; assert.deepEqual(findings11(doc), []); assert.ok(pins(doc).some(p => p.id === pinId) && links(doc).some(l => l.id === linkId));
    // S0's helpers: the repin, a second person's step, is kept under the migration's key review, which a template copy
    // clears (it drops the knowledge whole); no step moves a design stamp (ruling J3).
    R.assertTemplateCopyClearsSteps(doc, d => migrations(d)); assert.equal(R.assertStepsMoveNoStamp(doc, d => [...pins(d), ...links(d), ...migrations(d)]), pins(doc).length + links(doc).length + migrations(doc).length);
    // A person's proposal: refused to that person, accepted by a second.
    const v3 = await lib.successor(v2, 'Synthetic integration concepts 3', {reviewDue: '2028-06-30'}), OR3 = await lib.publish(v3, 'Synthetic integration concepts 3');
    await D.read(); { const r = await W.orgApi('knowledge-pin', {releaseId: OR3.id, revision: D.state.revision, reviewed: true, reason: 'The third edition.', reviewer: 'Synthetic architect'}, 'architect', D.id); assert.equal(r.status, 200); }
    await D.read();
    const m2 = await D.ok('knowledge.concept-migration', {pinId: moved, toReleaseId: OR3.id, reason: 'The guild published version 3.'}, 'architect');
    await D.refused(/architect wrote/, 'knowledge.concept-repin', {id: m2, stamp: KC.migrationStamp(D.document, m2), ...STEP}, 'architect');
    await D.ok('knowledge.concept-repin', {id: m2, stamp: KC.migrationStamp(D.document, m2), ...STEP}, 'second-architect');
  } finally { W.close(); }
});

// ------------------------------------------------------------------------------------------------ 7
add('S3.7 (record graph): with no pin the graph is as it was; with a pin the pin is a concept object, linkedVia(component, informs, in) is the pin, and every requirement\'s trail and chain is the built-in one', async () => {
  const L = await libraryDoc(), base = rv.withFinalReview(F.bankProject());
  const {releaseId} = L, design = (() => { const q = clone(base); const {library: _m, ...k} = clone(L.document.knowledge); q.knowledge = k; return q; })();
  assert.deepEqual([...recordGraph(design).objects.keys()], [...recordGraph(base).objects.keys()], 'with no pin no object is added');
  assert.equal(JSON.stringify([...recordGraph(design).relationships.keys()]), JSON.stringify([...recordGraph(base).relationships.keys()]), 'and no relation');
  let p = (await packaged(design, 'knowledge.concept-pin', {conceptId: 'SYN-P001', releaseId, ...STEP}, 'architect')).document;
  const pinId = pins(p)[0].id;
  p = (await packaged(p, 'knowledge.concept-link', {pinId, objectId: 'api-pod', ...STEP}, 'architect')).document;
  const o = recordGraph(p).objects.get(pinId); assert.equal(o.type, 'concept'); assert.equal(o.ref, 'SYN-P001');
  assert.deepEqual(linkedVia(p, 'api-pod', 'informs', 'in'), [pinId]); assert.deepEqual(linkedVia(p, pinId, 'informs', 'out'), ['api-pod']);
  R.assertBuiltInTrailsUnchanged(design, p); R.assertBuiltInChainsUnchanged(design, p); R.assertFindingIdsUnique(p);
  for (const r of p.artefacts.filter(a => a.type === 'requirement')) assert.deepEqual(JSON.stringify(requirementTrace(p, r.id)), JSON.stringify(requirementTrace(design, r.id)), r.id + ': the requirement\'s trail is as it was');
  // A link names an existing record only.
  await assert.rejects(async () => packaged(p, 'knowledge.concept-link', {pinId, objectId: 'NO-SUCH-RECORD', ...STEP}, 'architect'), /Choose an existing record of this project/);
});

// ------------------------------------------------------------------------------------------------ 8
add('S3.8 (recovery import): the reviews of a concept and of a crosswalk row, in the register and in a release, lose their reviewer; pins are retired as imported history; a migration\'s acceptance is moved aside; an organisation release stays as signed and reads ineligible until this workbench\'s organisation signs exactly it', async () => {
  const {KC} = await mods(), L = await libraryDoc();
  let p = (await packaged(L.document, 'knowledge.concept-pin', {conceptId: 'SYN-P001', releaseId: L.releaseId, ...STEP}, 'architect')).document;
  p.knowledge.conceptMigrations = [{id: 'KM-0099', pinId: p.knowledge.conceptPins[0].id, review: {actor: 'second-architect', at: AT, account: 'person', stamp: 'x'}}];
  const out = neutraliseImportedAuthority(clone(p), AT);
  assert.equal(out.knowledge.releases[0].parts.concepts[0].review.actor, null); assert.equal(out.knowledge.releases[0].parts.concepts[0].review.importedActor, 'reviewer');
  assert.deepEqual([out.knowledge.conceptPins[0].status, out.knowledge.conceptPins[0].retired.reason], ['retired', 'Imported historical pin']);
  assert.equal(out.knowledge.conceptMigrations[0].review, null); assert.equal(out.knowledge.conceptMigrations[0].importedReview.actor, 'second-architect');
  assert.equal(KC.releasedConcepts(out).every(c => !c.eligible), true, 'nothing released on another workbench is usable here');
  // An organisation release keeps its signed bytes (its checksum) and reads ineligible until verified here.
  { const W = await world(); try { const lib = await worldLibrary(W), OR1 = await lib.publish(lib.v1, 'Synthetic integration concepts 1'), {D} = await worldDesign(W, OR1); const doc = await D.read(), q = neutraliseImportedAuthority(clone(doc), AT), held = q.knowledge.organizationReleases[0];
    assert.equal(K.organizationReleaseChecksum(held), held.checksum, 'its parts are not rewritten: they are what the organisation signed'); assert.equal(held.assurance.eligible, false); assert.ok(q.knowledge.conceptPins.every(x => x.status === 'retired')); } finally { W.close(); } }
});

// ------------------------------------------------------------------------------------------------ 9
add('S3.9 (SDD): Appendix E names each pinned concept, its version, its release, its state, and each form\'s file, lines and passage hash; after a successor is published it still prints version 1 and says a newer version exists', async () => {
  const W = await world();
  try {
    const lib = await worldLibrary(W), OR1 = await lib.publish(lib.v1, 'Synthetic integration concepts 1'), {D} = await worldDesign(W, OR1);
    const sddOf = async () => architectureMarkdown(rv.withFinalReview(await D.read())).markdown;
    let md = await sddOf();
    assert.match(md, /### Knowledge versions this design rests on/); assert.match(md, /SYN-P001 · Transactional outbox · version 1 of “Synthetic integration concepts 1” · current/);
    const claim = (await D.read()).knowledge.organizationReleases[0].claims.find(c => c.form.type === 'applicability');
    assert.match(md, new RegExp('applicability · synthetic/integration-handbook\\.md · SYN-P001 Transactional outbox L16–L19 · passage ' + claim.excerptHash.slice(0, 12)));
    assert.match(md, /Relied on by: api-pod/);
    const v2 = await lib.successor(lib.v1, 'Synthetic integration concepts 2'); await lib.publish(v2, 'Synthetic integration concepts 2');
    md = await sddOf();
    assert.match(md, /version 1 of “Synthetic integration concepts 1” · newer-available/); assert.match(md, /A newer version exists: version 2 in “Synthetic integration concepts 2”/);
    // A document with no pin prints no such section.
    const plain = architectureMarkdown(rv.withFinalReview(F.bankProject())).markdown; assert.doesNotMatch(plain, /Knowledge versions this design rests on/);
  } finally { W.close(); }
});

// ------------------------------------------------------------------------------------------------ 10 (size)
// Ruling A4: wp1 has 660 B of the chapters route; S1 used 65 B and S2 118 B, so S3 adds at most 477 B. The slice books its
// own bytes in its evidence (an integer of at least 0), read through routeBookings with every other package's.
add('S3.10 (size, rulings A4, M4, O1): the client build passes every gate with the caps unchanged; S3 adds at most 477 B to the chapters route, as its evidence books it; 148 script files; the under-10-KB bucket no higher than its base allows; no stylesheet rule; the evidence says what a document with pins opens with', async () => {
  const EVIDENCE = 'audit/rc44/evidence/wp1-s3-size.json', size = JSON.parse(readFileSync(EVIDENCE, 'utf8'));
  const {BUDGET} = await import('./client-bundle.mjs');
  assert.ok(Number.isInteger(size.ownBytes) && size.ownBytes >= 0 && size.ownBytes <= 477, 'S3 books its own bytes: ' + size.ownBytes);
  assert.equal(size.allowance.chapters, 477); assert.equal(size.base.commit, 'c709ae3'); assert.equal(size.base.chapters, 3230723);
  const booked = R.routeBookings(EVIDENCE);
  assert.equal(booked.others['audit/rc44/evidence/wp1-s2-size.json'], 118, 'the other packages\' evidence is read');
  assert.equal(3229840 + booked.othersTotal + booked.poolTotal, size.base.chapters, 'the start commit is the integrated base and what the other packages and the pool booked');
  assert.equal(size.slice.chapters - 3229840 - booked.othersTotal - booked.poolTotal, size.ownBytes, 'the route at the slice\'s head, less the base and the others, is what S3 books');
  assert.ok(size.slice.chapters <= BUDGET.routes.chapters); assert.deepEqual([size.slice.scripts, size.slice.css], [148, size.base.css]);
  R.assertUnder10kCeiling(size.slice, size.base, BUDGET.tiny);
  { const w = size['opens with records']; assert.ok(w && w.host === 'public/knowledge-workspace-ui.js' && w.total === w.route + w.added && w.route === size.slice.chapters && w.files >= 1, 'opens with records'); }
  if (existsSync('dist/client-size-report.json') && existsSync('dist/client-metafile.json')) {
    const report = JSON.parse(readFileSync('dist/client-size-report.json', 'utf8')), meta = JSON.parse(readFileSync('dist/client-metafile.json', 'utf8'));
    const measured = {chapters: report.routes.chapters.code, scripts: report.scripts, under10k: report.buckets.under10k, css: report.css};
    assert.deepEqual(report.violations || [], [], 'no gate is broken');
    const mine = measured.chapters - 3229840 - booked.othersTotal - booked.poolTotal; assert.ok(mine <= 477, 'this build: S3 is ' + mine + ' B of its 477 B');
    for (const [f, o] of Object.entries(meta.outputs)) for (const server of ['public/knowledge-concepts.js', 'public/knowledge-concept-commands.js']) assert(!o.inputs?.[server], f + ' holds ' + server + ', which only the server reads');
    assert.equal(measured.scripts, 148); R.assertUnder10kCeiling(measured, size.base, BUDGET.tiny); assert.equal(measured.css, size.base.css);
    const opens = R.opensWithRecords(meta, 'public/knowledge-workspace-ui.js', Object.keys(BUDGET.data)); assert.equal(opens.route, measured.chapters);
    if (process.argv.includes('--measure') || process.env.AIW_RC44_WP1_MEASURE === '1') { assert.deepEqual({chapters: measured.chapters, scripts: measured.scripts, under10k: measured.under10k}, {chapters: size.slice.chapters, scripts: size.slice.scripts, under10k: size.slice.under10k}, 'at the slice\'s commit the build measures what the evidence says'); assert.deepEqual(opens, {route: size['opens with records'].route, added: size['opens with records'].added, total: size['opens with records'].total, files: size['opens with records'].files}); }
  }
});

// ------------------------------------------------------------------------------------------------ 11 (ruling E6)
// Reading a tranche-sized active release digested the whole release once for each claim it was asked about (the
// release check of knowledgeEligibility). Now each reader of the concepts digests a release once per read. Counted by a
// getter on a key that only the release's digest reads.
add('S3.11 (ruling E6): a tranche-sized active release is digested once per read, not once per claim', async () => {
  const {KC} = await mods(), L = await libraryDoc(), p = clone(L.document), r = p.knowledge.releases[0];
  // Thirty more form claims in the release: a tranche-sized release in miniature (the count per read is what matters).
  const extra = Array.from({length: 30}, (_, i) => ({...clone(r.claims[0]), id: 'KC-' + String(900 + i).padStart(4, '0')}));
  r.claims.push(...extra); r.checksum = digest({...r, checksum: undefined});
  let reads = 0; const reason = r.reason; Object.defineProperty(r, 'reason', {enumerable: true, configurable: true, get() { reads++; return reason; }});
  KC.releasedConcepts(p); assert.equal(reads, 1, 'releasedConcepts digests the release once (was ' + reads + ')');
  reads = 0; KC.conceptReading(p, 'SYN-P001'); assert.ok(reads <= 2, 'conceptReading digests it at most twice: ' + reads);
  const pinned = (await packaged(L.document, 'knowledge.concept-pin', {conceptId: 'SYN-P001', releaseId: L.releaseId, ...STEP}, 'architect')).document, q = clone(pinned), s = q.knowledge.releases[0];
  s.claims.push(...clone(extra)); s.checksum = digest({...s, checksum: undefined}); q.knowledge.conceptPins[0].releaseHash = s.checksum;
  let n = 0; const why = s.reason; Object.defineProperty(s, 'reason', {enumerable: true, configurable: true, get() { n++; return why; }});
  KC.conceptDecisionReading(q, q.knowledge.conceptPins[0].id); assert.equal(n, 1, 'a pin is read with one digest of its release');
});

// ------------------------------------------------------------------------------------------------ 12 (ruling I3)
// The repository's signed invalidation list (repositorySync.invalidations, written by a signed repository sync) makes a
// released claim on a repository source ineligible without any command. It reaches no form: a form is refused on a source
// fetched from a repository (ruling I1), and a document that holds one anyway reads it unusable, with the reason.
add('S3.12 (ruling I3): the signed invalidation list makes a released claim on a repository source ineligible without a command; no form rests on a repository source, and one written into a document anyway is unusable and hands nothing to a pin', async () => {
  const {KC} = await mods();
  // A plain claim on a repository source, released with a current signed receipt and active.
  let p = F.blankProject('rc44-wp1-i3'); const kc = (doc, type, payload, actor = 'architect') => K.applyKnowledgeCommand(doc, {type: 'knowledge.' + type, payload}, AT, actor).document;
  p = kc(p, 'source', {title: 'A repository source', body: 'Use an outbox where a booking must lead to a notice.\nIts second line.\n', path: 'patterns/outbox.md', revision: 'abc123'});
  const src = p.knowledge.sources[0]; Object.assign(src, {origin: 'repository-fetch', repository: 'synthetic/patterns'});
  p = kc(p, 'claim', {sourceId: src.id, lineStart: 1, lineEnd: 1, subjectId: 'Outbox', predicate: 'describes', claimType: 'definition', statement: 'An outbox stores a notice with its booking.'});
  p = kc(p, 'review', {...F.REVIEW, id: p.knowledge.claims[0].id}, 'reviewer');
  p = kc(p, 'release', {...F.REVIEW, title: 'Repository claims', claimIds: [p.knowledge.claims[0].id]}, 'releaser');
  const rel = p.knowledge.releases[0], claim = p.knowledge.claims[0];
  p.knowledge.repositorySync = {storeId: 'store-1', releases: [{id: rel.id, checksum: rel.checksum, storeId: 'store-1', assurance: {eligible: true}, expiresAt: '2099-01-01T00:00:00.000Z', sourceIds: [src.id], claimHashes: [{id: claim.id, hash: digest(rel.claims[0])}]}], invalidations: []};
  p = kc(p, 'activate', {...F.REVIEW, id: rel.id, stamp: K.knowledgeStamp(p)}, 'releaser');
  assert.equal(K.releasedClaims(p)[0].eligible, true, 'eligible with its receipt');
  const q = clone(p); q.knowledge.repositorySync.invalidations.push({identity: [src.repository, src.revision, src.path, src.hash].join('\n')});
  assert.equal(K.releasedClaims(q)[0].eligible, false); assert.ok(K.releasedClaims(q)[0].reasons.includes('The signed repository update invalidated this source revision.'), 'ineligible with its reason, by no command');
  // A form on a repository source is refused at the command (ruling I1)...
  const L = await libraryDoc({release: false}); const lib = clone(L.document); Object.assign(lib.knowledge.sources[0], {origin: 'repository-fetch', repository: 'synthetic/patterns'});
  const {CC} = await mods(); assert.throws(() => CC.applyConceptCommand(lib, {type: 'knowledge.claim', payload: F.formClaim(lib.knowledge.sources[0].id, 'SYN-P001', F.p001Forms().mechanism)}, AT, 'importer', F.person('importer')), /rests on a source saved in this library/);
  // ...and a released form that a document holds on one anyway is unusable, the invalidation among its reasons, and a pin hands nothing over.
  const R2 = await libraryDoc(), d = (await packaged(R2.document, 'knowledge.concept-pin', {conceptId: 'SYN-P001', releaseId: R2.releaseId, ...STEP}, 'architect')).document;
  const g = clone(d), s0 = g.knowledge.sources[0]; Object.assign(s0, {origin: 'repository-fetch', repository: 'synthetic/patterns'}); g.knowledge.repositorySync = {storeId: 'store-1', releases: [], invalidations: [{identity: [s0.repository, s0.revision, s0.path, s0.hash].join('\n')}]};
  const held = KC.releasedConcepts(g)[0]; assert.equal(held.eligible, false); assert.match(held.reasons.join(' '), /invalidated this source revision/);
  assert.deepEqual(KC.conceptDecisionForms(g, g.knowledge.conceptPins[0].id), []);
  assert.equal(KC.conceptPinCurrency(g, g.knowledge.conceptPins[0], {today: '2026-11-16'}).state, 'changed');
});

// ------------------------------------------------------------------------------------------------ 13 (ruling P1 for organisation releases)
add('S3.13 (ruling P1, organisation releases): the administrator who publishes a release of concepts to the organisation is held to the release-actor rule: refused when they wrote a form or a row, and when they verified an imported form; a third person publishes it', async () => {
  const W = await world();
  try {
    for (const actor of ['importer', 'reviewer', 'architect']) assert.equal((await W.orgApi('members', {actorId: actor, role: 'administrator'}, 'steward')).status, 200);
    const tryPublish = async (lib, pattern) => { const r = await W.orgApi('knowledge', {releaseId: lib.v1, title: 'Synthetic integration concepts 1', reason: 'Shared.', reviewed: true}, lib.L.owner, lib.L.id); assert.equal(r.status, 400, JSON.stringify(r.data).slice(0, 300)); assert.match(r.data.error, pattern); };
    // The author of the forms owns the library and publishes it.
    await tryPublish(await worldLibrary(W, {owner: 'importer', name: 'Library A'}), /KC-\d+ \(definition form of SYN-P001\): .*importer wrote KC-\d+/);
    // The verifier of imported forms owns the library and publishes it.
    await tryPublish(await worldLibrary(W, {owner: 'reviewer', name: 'Library B', authorKind: 'import', writer: 'importer'}).catch(e => { throw e; }), /reviewer verified KC-\d+, which was imported: a third person publishes it/);
    // The author of a crosswalk row the release holds owns the library and publishes it.
    await tryPublish(await worldLibrary(W, {owner: 'architect', name: 'Library C', row: {}, rowWriter: 'architect'}), /KA-\d+ \(external Outbox, a crosswalk row of SYN-P001\): .*architect wrote KA-\d+/);
    // A third person publishes, and the organisation release carries the parts inside its signed checksum.
    const lib = await worldLibrary(W, {name: 'Library D', row: {}}), OR = await lib.publish(lib.v1, 'Synthetic integration concepts 1');
    const row = await W.env.DB.prepare('SELECT document FROM organization_releases WHERE organization_id=? AND id=?').bind(W.O, OR.id).first(), signed = JSON.parse(row.document);
    assert.deepEqual(signed.parts.concepts.map(c => [c.conceptId, c.version]), [['SYN-P001', 1]]); assert.deepEqual(signed.parts.crosswalk.map(r => r.aliasId), ['Outbox']);
    assert.equal(K.organizationReleaseChecksum(signed), signed.checksum, 'the parts are inside the signed checksum');
    { const forged = clone(signed); forged.parts.concepts[0].title = 'Forged'; assert.notEqual(K.organizationReleaseChecksum(forged), signed.checksum, 'a changed part breaks the checksum'); }
  } finally { W.close(); }
});

// ------------------------------------------------------------------------------------------------ 14 (rulings B10 and P5 b)
// The knowledge keys through S0: what the package states of them. A library's concept register, topic register and
// library mark are knowledge beside the design (evidence and bookkeeping), the currency of pins and the organisation's
// notices are bookkeeping, and the package's own collections say to the design fingerprint what their records say,
// never their steps; a migration, a proposal, says nothing. The package's own commands write no line into the knowledge
// family's log, which the design fingerprint reads (the boundary's activity row records each).
add('S3.14 (rulings B10 and P5 b): the knowledge keys are stated through S0: a library\'s concepts, topics and mark leave its design stamp; the currency and the notices are bookkeeping; pins and links say what they say, not their steps; a migration says nothing', async () => {
  const {KP} = await mods(), X = await import('./public/design-extensions.js'); await import('./worker.js');
  const mine = X.EXTENSIONS.find(e => e.id === PACKAGE);
  assert.deepEqual(Object.keys(mine.design).sort(), ['knowledge.conceptLinks', 'knowledge.conceptMigrations', 'knowledge.conceptPins', 'knowledge.crosswalk']);
  assert.deepEqual([...mine.evidenceKeys].sort(), ['knowledge.concepts', 'knowledge.library', 'knowledge.organizationNotices', 'knowledge.pinCurrency', 'knowledge.topics']);
  const L = await libraryDoc(), p = L.document, stamp = d => { const q = rv.withFinalReview(clone(d), {upgrade: false}); return rv.reviewSourceStamp(q) + ' ' + rv.reviewDesignStamp(q); };
  // Written in place (no command): a concept's field, a topic, the library mark move no design stamp, and the concept moves the evidence stamp.
  for (const change of [q => { q.knowledge.concepts[0].steward = 'Another guild'; }, q => { q.knowledge.topics = [{id: 'KT-0099', file: 'synthetic.docx', topicId: 'SYN-P001'}]; }, q => { q.knowledge.library.reason = 'Another reason.'; }, q => { q.knowledge.pinCurrency = {'KU-0099': {state: 'due'}}; }, q => { q.knowledge.organizationNotices = {x: {withdrawn: {at: AT}}}; }]) { const q = clone(p); change(q); assert.equal(stamp(q), stamp(p)); }
  { const q = clone(p); q.knowledge.concepts[0].steward = 'Another guild'; assert.notEqual(rv.evidenceStamp(rv.withFinalReview(q, {upgrade: false})), rv.evidenceStamp(rv.withFinalReview(clone(p), {upgrade: false})), 'the concept register is evidence beside the design'); }
  // The pins and links say what they say: their steps move no stamp (ruling J3); a migration says nothing.
  let d = (await packaged(p, 'knowledge.concept-pin', {conceptId: 'SYN-P001', releaseId: L.releaseId, ...STEP}, 'architect')).document; d = (await packaged(d, 'knowledge.concept-link', {pinId: pins(d)[0].id, objectId: 'REQ-001', ...STEP}, 'architect')).document;
  assert.equal(R.assertStepsMoveNoStamp(d, x => [...pins(x), ...links(x)]), 2);
  { const q = clone(d); q.knowledge.conceptMigrations = [{id: 'KM-0099', pinId: pins(d)[0].id, toReleaseId: 'KR-0099', reason: 'A proposal.'}]; assert.equal(stamp(q), stamp(d), 'a migration, a proposal, says nothing to the design fingerprint (ruling L6)'); }
  // A pin is design: pinning moves the stamp; and the package's commands write no line into the knowledge family's log.
  assert.notEqual(stamp(d), stamp(p)); assert.equal(d.knowledge.history.length, p.knowledge.history.length, 'no line in knowledge.history'); assert.equal(d.knowledge.version, p.knowledge.version, 'knowledge.version does not move');
  assert.equal(typeof KP.conceptLinkFindings, 'function');
});

// ------------------------------------------------------------------------------------------------ 15 (ruling S10)
// The one-alias rule over organisation releases reads this register plus the rows the releases a project holds, keyed
// by (project, row id): it is asked where such a row comes to read verified in the project, at the organisation pin.
add('S3.15 (ruling S10): an organisation release whose row would give an alias a second concept is not pinned; rows are told apart by (project, row id), so two libraries\' rows of one id are two rows; a pinned organisation release\'s rows resolve in the design project', async () => {
  const {KC} = await mods(), W = await world();
  try {
    const a = await worldLibrary(W, {name: 'Library A', row: {}}), A = await a.publish(a.v1, 'Library A concepts 1');
    const b = await worldLibrary(W, {name: 'Library B', conceptId: 'SYN-P002', row: {}}), B = await b.publish(b.v1, 'Library B concepts 1');
    const c = await worldLibrary(W, {name: 'Library C', conceptId: 'SYN-P003', row: {aliasId: 'Relay', label: 'Relay (an external register)'}}), C = await c.publish(c.v1, 'Library C concepts 1');
    assert.equal(a.rowId, b.rowId, 'the libraries number their rows alike: one row id in two projects'); assert.equal(a.rowId, c.rowId);
    const {D} = await worldDesign(W, A, {link: false});
    assert.equal(KC.resolveConcept(D.document, 'Outbox')?.conceptId, 'SYN-P001', 'an organisation release\'s row resolves in the design project');
    await D.read();
    const r = await W.orgApi('knowledge-pin', {releaseId: B.id, revision: D.state.revision, reviewed: true, reason: 'Another library.', reviewer: 'Synthetic architect'}, 'architect', D.id);
    assert.equal(r.status, 400); assert.match(r.data.error, new RegExp('external Outbox is already the same as SYN-P001 \\(' + a.rowId + ' of project ' + a.L.id + '\\): one alias names one concept'));
    await D.read(); const ok = await W.orgApi('knowledge-pin', {releaseId: C.id, revision: D.state.revision, reviewed: true, reason: 'A third library.', reviewer: 'Synthetic architect'}, 'architect', D.id); assert.equal(ok.status, 200, JSON.stringify(ok.data));
    const doc = await D.read(); assert.equal(KC.resolveConcept(doc, 'Relay')?.conceptId, 'SYN-P003'); assert.equal(KC.resolveConcept(doc, 'Outbox')?.conceptId, 'SYN-P001', 'the same row id in another project is another row');
  } finally { W.close(); }
});

// ------------------------------------------------------------------------------------------------ 16 (ruling E1, the walk)
// Every command type of the design package's pins, sent by an agent account, a draft by Sol and an import, against a
// design project whose pin is active and linked: each is refused, or accepted (a proposal) with the standing of the pin
// and what it hands over as they were. A type added later joins the walk or the case fails.
add('S3.16 (ruling E1): the pin\'s command types, sent by an agent account, a draft by Sol and an import, lower nothing: each is refused, or accepted as a proposal with the pin, its currency, its links and what it hands over as they were', async () => {
  const {KC} = await mods(), W = await world();
  try {
    const lib = await worldLibrary(W), OR1 = await lib.publish(lib.v1, 'Synthetic integration concepts 1'), {D, pinId, linkId} = await worldDesign(W, OR1);
    const v2 = await lib.successor(lib.v1, 'Synthetic integration concepts 2'), OR2 = await lib.publish(v2, 'Synthetic integration concepts 2');
    await D.read(); assert.equal((await W.orgApi('knowledge-pin', {releaseId: OR2.id, revision: D.state.revision, reviewed: true, reason: 'The successor.', reviewer: 'Synthetic architect'}, 'architect', D.id)).status, 200); await D.read();
    const m = await D.ok('knowledge.concept-migration', {pinId, toReleaseId: OR2.id, reason: 'Version 2.'}, 'architect');
    const X = await import('./public/design-extensions.js'), types = Object.keys(X.EXTENSIONS.find(e => e.id === PACKAGE).commands).filter(t => !t.startsWith('knowledge.crosswalk')).sort();
    const WALK = {'knowledge.concept-pin': () => ({conceptId: 'SYN-P001', releaseId: OR2.id}), 'knowledge.concept-link': () => ({pinId, objectId: 'risk-engine'}), 'knowledge.concept-unlink': () => ({id: linkId}), 'knowledge.concept-migration': () => ({pinId, toReleaseId: OR2.id, reason: 'Again.'}), 'knowledge.concept-migration-confirm': () => ({id: m}), 'knowledge.concept-repin': d => ({id: m, stamp: KC.migrationStamp(d, m)}), 'knowledge.concept-unpin': d => ({id: pinId, stamp: KC.unpinStamp(d, pinId)})};
    assert.deepEqual(Object.keys(WALK).sort(), types, 'every command type of the pins is a row of the walk'); assert.deepEqual(types, [...PIN_TYPES].sort());
    const standing = d => JSON.stringify({pins: pins(d).map(p => [p.id, p.status, p.version, p.releaseId]), links: links(d).map(l => [l.id, l.status, l.pinId, l.objectId]), forms: KC.conceptDecisionReading(d, pinId), currency: d.knowledge.pinCurrency, findings: findings11(d).map(f => f.id)});
    const before = standing(D.document); let refused = 0, accepted = 0;
    for (const [type, build] of Object.entries(WALK)) for (const [who, as, extra] of [['an agent account', 'bot', {}], ['a draft by Sol', 'architect', {authorKind: 'sol-draft'}], ['an import', 'architect', {authorKind: 'import'}]]) {
      const r = await D.send(type, {...build(D.document), reason: 'Sent by ' + who + '.'}, as, extra);
      if (r.status === 200) { accepted++; assert.equal(type, 'knowledge.concept-migration', type + ' by ' + who + ' was accepted'); assert.equal(standing(r.data.document), before, type + ' by ' + who + ': the standing moved'); }
      else refused++;
    }
    assert.ok(refused >= 18 && accepted <= 3, JSON.stringify({refused, accepted}));
  } finally { W.close(); }
});

// ------------------------------------------------------------------------------------------------ 17 (old documents, S0's helpers, the registration)
add('S3.17 (old documents and S0\'s helpers): with ' + PACKAGE + ' registered as S3 states it, the three references and the document with a review list read as at 94dbd4f; no key of the slice exists until it is first written; a design project that holds a pin names the package and a template copy of it does not; the package conforms and clashes with nobody', async () => {
  const X = await import('./public/design-extensions.js'), boundary = await import('./design-extension-boundary.js'); await import('./worker.js');
  const mine = X.EXTENSIONS.find(e => e.id === PACKAGE);
  assert.deepEqual(boundary.extensionIssues(mine), []); assert.deepEqual(boundary.extensionConflicts(), []);
  assert.deepEqual(Object.keys(mine).sort(), ['checks', 'commands', 'design', 'evidenceKeys', 'id', 'objectTypes', 'provenance', 'records', 'sections']);
  assert.deepEqual(Object.keys(mine.commands).sort(), [...PIN_TYPES, 'knowledge.crosswalk', 'knowledge.crosswalk-confirm', 'knowledge.crosswalk-review', 'knowledge.crosswalk-retire'].sort());
  assert.deepEqual(Object.entries(mine.commands).filter(([, c]) => c.person).map(([t]) => t).sort(), ['knowledge.concept-link', 'knowledge.concept-migration-confirm', 'knowledge.concept-pin', 'knowledge.concept-unlink', 'knowledge.concept-unpin', 'knowledge.crosswalk-confirm', 'knowledge.crosswalk-retire']);
  assert.deepEqual(Object.entries(mine.commands).filter(([, c]) => c.second).map(([t]) => t).sort(), ['knowledge.concept-repin', 'knowledge.crosswalk-review']);
  const golden = JSON.parse(readFileSync('rc44-s0-extensions-baseline.json', 'utf8')); assert.equal(golden.capturedFrom, '94dbd4f');
  for (const t of R.REFERENCES) { const q = R.reference(t), now = R.digests(q); for (const k of Object.keys(golden.readings[t])) assert.equal(now[k], golden.readings[t][k], t + ': ' + k + ' reads as at 94dbd4f'); for (const k of ['conceptPins', 'conceptLinks', 'conceptMigrations', 'pinCurrency', 'organizationNotices']) assert.equal(q.knowledge?.[k], undefined, t + ': no ' + k); assert.equal(q.workspace.packages, undefined); }
  { const listed = R.reviewListDocument(), now = R.digests(listed); for (const k of Object.keys(golden.reviewList.readings)) assert.equal(now[k], golden.reviewList.readings[k], 'a document with a review list: ' + k); }
  // The legacy knowledge document of S1.8: its release checksums, findings and stamps as they were.
  // (S1.8 run here, with the package registered as S3 states it: the bank reference and the legacy knowledge document, their
  // findings, stamps, fingerprint, SDD text and release checksums, as at 94dbd4f.)
  { const forms = await import('./rc44-wp1-cases-forms.mjs'), s18 = forms.cases.find(c => c.name.startsWith('S1.8:')); assert(s18, 'S1.8 exists'); await s18.run(); }
  const routes = readFileSync('public/design-package-routes.js', 'utf8'); assert.match(routes, /registerExtension\(\{id:'p10-knowledge-route',needs:p=>p\.knowledge\?\.crosswalk\|\|p\.knowledge\?\.conceptPins,load:\(\)=>import\('\.\/knowledge-workspace-ui\.js'\)\}\);/);
  const W = await world();
  try {
    const lib = await worldLibrary(W), OR1 = await lib.publish(lib.v1, 'Synthetic integration concepts 1'), D = await W.project('architect', 'bank-payment', 'Northquay booking design', ['second-architect']);
    await D.read(); assert.equal((await W.orgApi('knowledge-pin', {releaseId: OR1.id, revision: D.state.revision, reviewed: true, reason: 'Pinned.', reviewer: 'Synthetic architect'}, 'architect', D.id)).status, 200);
    let doc = await D.read(); assert.equal(doc.workspace.packages, undefined, 'an organisation release pinned names no package'); for (const k of ['conceptPins', 'pinCurrency', 'organizationNotices']) assert.equal(doc.knowledge[k], undefined, 'no ' + k + ' before a pin');
    const pinId = await D.ok('knowledge.concept-pin', {conceptId: 'SYN-P001', releaseId: OR1.id, ...STEP}, 'architect');
    doc = D.document; assert.deepEqual(doc.workspace.packages, [PACKAGE], 'a design project that holds a pin names the package (rulings D2, E5, P2)');
    await D.ok('knowledge.concept-link', {pinId, objectId: 'api-pod', ...STEP}, 'architect');
    const {instantiateTemplate} = await import('./project-lifecycle.js'), copy = instantiateTemplate({...clone(D.document), workspace: {...D.document.workspace, reusableTemplate: true}}, 'copy', 'A copy', AT);
    assert.equal(copy.knowledge, undefined); assert.equal('packages' in copy.workspace, false, 'a copy that keeps no pin names no package');
    R.assertFindingIdsUnique(D.document);
  } finally { W.close(); }
});

// ------------------------------------------------------------------------------------------------ 18 (candidate knowledge is inert)
add('S3.18 (plan ruling 6): candidate or unreleased knowledge never reaches a finding, a score, an eligibility gate or a conformance reading: no pin is taken on it, a pin written onto it hands nothing over, and a current pin and link move no score, gate or conformance reading of the bank-payment reference', async () => {
  const {KC} = await mods();
  // Unreviewed, reviewed but unreleased, released but not active: no pin.
  { const L = await libraryDoc({release: false}); await assert.rejects(() => packaged(L.document, 'knowledge.concept-pin', {conceptId: 'SYN-P001', releaseId: 'KR-0001', ...STEP}, 'architect'), /is not an active release of this project that holds SYN-P001/); }
  { const L = await libraryDoc({release: false}), id = L.k('release', {...F.REVIEW, title: 'Not active', conceptIds: ['SYN-P001']}, 'releaser'); await assert.rejects(() => packaged(L.document, 'knowledge.concept-pin', {conceptId: 'SYN-P001', releaseId: id, ...STEP}, 'architect'), /is not an active release/); }
  // A pin written onto a candidate (as a hand-made document might hold one) hands nothing over, and reads changed.
  { const L = await libraryDoc({release: false}), q = clone(L.document); q.knowledge.conceptPins = [{id: 'KU-0099', conceptId: 'SYN-P001', releaseId: 'KR-0099', status: 'active', version: 1, conceptHash: 'x'}];
    assert.deepEqual(KC.conceptDecisionForms(q, 'KU-0099'), []); assert.equal(KC.conceptPinCurrency(q, q.knowledge.conceptPins[0], {today: '2026-11-16'}).state, 'replaced'); }
  // A current pin and its link on the bank-payment reference: scores, gates, conformance and the knowledge readers of plain claims do not move.
  const L = await libraryDoc(), bank = rv.withFinalReview(F.bankProject()), design = clone(bank); { const {library: _m, ...k} = clone(L.document.knowledge); design.knowledge = k; }
  let p = (await packaged(design, 'knowledge.concept-pin', {conceptId: 'SYN-P001', releaseId: L.releaseId, ...STEP}, 'architect')).document;
  p = (await packaged(p, 'knowledge.concept-link', {pinId: pins(p)[0].id, objectId: 'api-pod', ...STEP}, 'architect')).document;
  const before = designReadings(design), after = designReadings(p), paths = moved(before, after);
  for (const key of ['summaries', 'blockers', 'coverage', 'capacity', 'selectionGates', 'productComparisons', 'realisationFindings', 'specificationGate', 'released', 'knowledgeFindings', 'domain', 'structures', 'snapshot', 'intelligence'])
    assert.ok(!paths.some(x => x === key || x.startsWith(key + '.')), key + ' moved: ' + paths.filter(x => x.startsWith(key)).slice(0, 5).join(', '));
  assert.deepEqual(before.findings, after.findings, 'a current pin raises no finding');
});

// ------------------------------------------------------------------------------------------------ 19 (a person's steps)
add('S3.19 (a person\'s steps): a pin, a link through a pin, an unlink and an unpin are a signed-in person\'s steps, refused to an agent account, a draft by Sol and an import; one active pin per concept; an unpin needs a current stamp of the records that rely on it, and leaves each link a finding until a person links it again', async () => {
  const {KC} = await mods(), W = await world();
  try {
    const lib = await worldLibrary(W), OR1 = await lib.publish(lib.v1, 'Synthetic integration concepts 1'), {D, pinId, linkId} = await worldDesign(W, OR1);
    for (const [as, extra] of [['bot', {}], ['architect', {authorKind: 'sol-draft'}], ['architect', {authorKind: 'import'}]]) {
      await D.refused(/signed-in person|A draft by Sol does not review|An agent or service account does not review/, 'knowledge.concept-pin', {conceptId: 'SYN-P001', releaseId: OR1.id, ...(as === 'architect' && extra.authorKind === 'import' ? STEP : {reason: STEP.reason})}, as, extra);
      await D.refused(/signed-in person|does not review/, 'knowledge.concept-link', {pinId, objectId: 'risk-engine', ...(extra.authorKind === 'import' ? STEP : {reason: STEP.reason})}, as, extra);
    }
    await D.refused(/SYN-P001 already has an active pin \(KU-\d+\)/, 'knowledge.concept-pin', {conceptId: 'SYN-P001', releaseId: OR1.id, ...STEP}, 'architect');
    await D.refused(/api-pod is already linked to KU-\d+/, 'knowledge.concept-link', {pinId, objectId: 'api-pod', ...STEP}, 'architect');
    await D.refused(/The records that rely on KU-\d+ changed/, 'knowledge.concept-unpin', {id: pinId, stamp: '0'.repeat(64), ...STEP}, 'architect');
    assert.deepEqual(KC.conceptUses(D.document, pinId), ['api-pod']);
    await D.ok('knowledge.concept-unpin', {id: pinId, stamp: KC.unpinStamp(D.document, pinId), ...STEP}, 'second-architect');
    const doc = D.document; assert.equal(pins(doc).find(p => p.id === pinId).status, 'retired');
    assert.deepEqual(findings11(doc).map(f => [f.title, f.objectId]), [['Review changed architectural support', 'api-pod']], 'the link to a retired pin is a finding');
    assert.deepEqual(KC.conceptDecisionForms(doc, pinId), []);
    await D.ok('knowledge.concept-unlink', {id: linkId, ...STEP}, 'architect'); assert.deepEqual(findings11(D.document), [], 'an unlinked record raises nothing');
  } finally { W.close(); }
});

// ------------------------------------------------------------------------------------------------ 20 (a withdrawal of a concept)
add('S3.20 (design c, knowledge.withdraw of a concept): a person withdraws a pinned concept by its id: the pin reads withdrawn, the stored impact names the pin and the records that rely on it; the same withdrawal sent as an import is refused (ruling E1)', async () => {
  const {KC, CC} = await mods(), L = await libraryDoc();
  let p = (await packaged(L.document, 'knowledge.concept-pin', {conceptId: 'SYN-P001', releaseId: L.releaseId, ...STEP}, 'architect')).document;
  p = (await packaged(p, 'knowledge.concept-link', {pinId: pins(p)[0].id, objectId: 'REQ-001', ...STEP}, 'architect')).document;
  const W = {...F.REVIEW, id: 'SYN-P001', stamp: K.knowledgeImpactStamp(p, 'SYN-P001')};
  assert.throws(() => CC.applyConceptCommand(p, {type: 'knowledge.withdraw', payload: W}, AT, 'architect', F.importedBy('architect')), /SYN-P001 is reviewed or in a release: only a signed-in person changes what its review covered \(the withdrawal of SYN-P001/);
  const out = CC.applyConceptCommand(p, {type: 'knowledge.withdraw', payload: W}, AT, 'steward', F.person('steward')).document, w = out.knowledge.withdrawals.at(-1);
  assert.equal(w.targetId, 'SYN-P001'); assert.deepEqual(w.impact.map(x => [x.kind, x.id]), [['concept pin', pins(p)[0].id], ['record that relies on a pin', 'REQ-001']]);
  assert.equal(out.knowledge.pinCurrency[pins(p)[0].id].state, 'withdrawn'); assert.deepEqual(KC.conceptDecisionForms(out, pins(p)[0].id), [], 'a withdrawn concept hands over nothing');
});

// ================================================================================================ the fix-up (rulings X1 to X5)
// ------------------------------------------------------------------------------------------------ 21 (ruling X1)
// An agent account takes no organisation knowledge step (must-fix 1; rulings E1 and I1): not as the organisation's
// administrator publishing a release of concepts, not withdrawing one, not pinning one into a project it owns. Each is
// refused through the route in the words worker.js uses for the organisation's review and releases, and nothing is signed
// or written; a person's same requests are taken. Behind that gate the release-actor rule reads the real account kind.
add('S3.21 (ruling X1): an agent account, as the organisation\'s administrator, publishing a release of concepts, withdrawing one and pinning one into its own project is refused through the route, with nothing signed or written; a person\'s same requests are taken; publishRefusal reads the real account kind', async () => {
  const {CC} = await mods(), W = await world();
  try {
    assert.equal((await W.orgApi('members', {actorId: 'bot', role: 'administrator'}, 'steward')).status, 200, 'bot is an administrator of the organisation');
    const AGENT = /^An agent or service account does not review or release library entries\. A person signs in to do that\.$/;
    const signed = async () => JSON.stringify((await W.env.DB.prepare('SELECT id,document FROM organization_releases WHERE organization_id=? ORDER BY id').bind(W.O).all()).results);
    // A library bot owns (its editors write, review and release it), published by bot.
    const botLib = await worldLibrary(W, {owner: 'bot', marker: 'steward', name: 'A library an agent account owns'}), PUBLISH = {releaseId: botLib.v1, title: 'Synthetic integration concepts 1', reason: 'Shared by an agent account.', reviewed: true};
    let before = await signed();
    { const r = await W.orgApi('knowledge', PUBLISH, 'bot', botLib.L.id); assert.equal(r.status, 403, 'an agent publishes: ' + JSON.stringify(r.data).slice(0, 300)); assert.match(r.data.error, AGENT); assert.equal(r.data.code, 'authorship'); }
    assert.equal(await signed(), before, 'nothing is signed');
    // A person's library, published by a person: taken; a design project pins it.
    const lib = await worldLibrary(W), OR1 = await lib.publish(lib.v1, 'Synthetic integration concepts 1'), {D, pinId} = await worldDesign(W, OR1);
    before = await signed();
    { const r = await W.orgApi('knowledge-withdraw', {releaseId: OR1.id, reason: 'An agent account withdraws it.', reviewed: true}, 'bot'); assert.equal(r.status, 403, 'an agent withdraws: ' + JSON.stringify(r.data).slice(0, 300)); assert.match(r.data.error, AGENT); }
    assert.equal(await signed(), before, 'no notice is written');
    { const doc = await D.read(); assert.equal(doc.knowledge.pinCurrency[pinId].state, 'current', 'the pin stays current'); assert.deepEqual(findings11(doc), [], 'no project that pins the release raises anything'); }
    // bot pins the organisation release into a design project it owns.
    const B = await W.project('bot', 'bank-payment', 'A design an agent account owns'); await B.read(); const was = JSON.stringify(B.document);
    { const r = await W.orgApi('knowledge-pin', {releaseId: OR1.id, revision: B.state.revision, reviewed: true, reason: 'An agent account pins it.', reviewer: 'bot'}, 'bot', B.id); assert.equal(r.status, 403, 'an agent pins: ' + JSON.stringify(r.data).slice(0, 300)); assert.match(r.data.error, AGENT); }
    assert.equal(JSON.stringify(await B.read()), was, 'nothing is written into its project');
    // A person's same requests are taken: a pin into a project of their own, a withdrawal.
    const P = await W.project('second-architect', 'bank-payment', 'A design a person owns'); await P.read();
    { const r = await W.orgApi('knowledge-pin', {releaseId: OR1.id, revision: P.state.revision, reviewed: true, reason: 'A person pins it.', reviewer: 'Synthetic architect'}, 'second-architect', P.id); assert.equal(r.status, 200, JSON.stringify(r.data).slice(0, 300)); }
    { const r = await W.orgApi('knowledge-withdraw', {releaseId: OR1.id, reason: 'A person withdraws it.', reviewed: true}, 'steward'); assert.equal(r.status, 200, JSON.stringify(r.data).slice(0, 300)); }
    // Behind the gate the release-actor rule reads the real account kind: the organisation route, asked directly for an
    // agent account, refuses at the rule; the rule refuses a request that names no account and takes the person.
    const {handleOrganizations} = await import('./organization-service.js'), before2 = await signed();
    const direct = await handleOrganizations(new Request('https://aiw.test/api/organizations?organization=' + W.O + '&action=knowledge', {method: 'POST', headers: {Origin: 'https://aiw.test', 'Content-Type': 'application/json'}, body: JSON.stringify(PUBLISH)}), W.env, 'bot', botLib.L.id);
    assert.equal(direct.status, 400); assert.equal((await direct.json()).error, 'An organisation release is published by a signed-in person, not by an agent or service account.');
    assert.equal(await signed(), before2, 'nothing is signed');
    assert.match(CC.publishRefusal(botLib.L.document, botLib.v1, 'steward'), /not by a request that names no account/, 'a request that names no account kind publishes nothing');
    assert.equal(CC.publishRefusal(botLib.L.document, botLib.v1, 'steward', 'person'), null, 'a person who wrote none of it publishes it');
  } finally { W.close(); }
});

// ------------------------------------------------------------------------------------------------ 22 (ruling X2)
// The organisation receives only what the library stands behind now (must-fix 2): a release that holds parts is published
// only while every concept of parts.concepts reads usable as a whole in that release in the library (not withdrawn, not
// retired) and every row of parts.crosswalk still reads released there. Each refusal names the concept or the row and why.
add('S3.22 (ruling X2): a release of concepts is published to the organisation only while the library stands behind it now: a concept withdrawn by its id, a concept retired and a crosswalk row retired after the release are each refused, naming the concept or the row and why, with nothing signed; a library that stands behind its release publishes it', async () => {
  const W = await world();
  try {
    const signed = async () => JSON.stringify((await W.env.DB.prepare('SELECT id,document FROM organization_releases WHERE organization_id=? ORDER BY id').bind(W.O).all()).results);
    const refused = async (lib, pattern) => { const before = await signed(), r = await W.orgApi('knowledge', {releaseId: lib.v1, title: 'Synthetic integration concepts 1', reason: 'Shared.', reviewed: true}, lib.L.owner, lib.L.id); assert.equal(r.status, 400, JSON.stringify(r.data).slice(0, 300)); assert.match(r.data.error, pattern); assert.equal(await signed(), before, 'nothing is signed'); };
    const RETIRE = {reason: 'Retired after the release.', reviewer: 'Synthetic steward', reviewed: true};
    // A concept the library withdrew by its id (knowledge.withdraw of SYN-P001).
    { const lib = await worldLibrary(W, {name: 'Library W'}); await lib.L.ok('knowledge.withdraw', {...F.REVIEW, id: 'SYN-P001', stamp: K.knowledgeImpactStamp(lib.L.document, 'SYN-P001')}, 'steward');
      await refused(lib, /^The library does not stand behind SYN-P001 now, so its release is not published: SYN-P001 is not usable as a whole in .*SYN-P001 has been withdrawn/); }
    // A concept the library retired after the release.
    { const lib = await worldLibrary(W, {name: 'Library R'}); await lib.L.ok('knowledge.concept-retire', {id: lib.record, ...RETIRE}, 'steward');
      await refused(lib, /^The library does not stand behind SYN-P001 now, so its release is not published: SYN-P001 is retired in this project: Retired after the release\./); }
    // A crosswalk row the library retired after the release.
    { const lib = await worldLibrary(W, {name: 'Library X', row: {}}); await lib.L.ok('knowledge.crosswalk-retire', {id: lib.rowId, ...RETIRE}, 'steward');
      await refused(lib, new RegExp('^The library does not stand behind ' + lib.rowId + ' \\(external Outbox, a crosswalk row of SYN-P001\\) now, so its release is not published: it is retired in this library\\.$')); }
    // A library that stands behind its release (a concept and a row as released) publishes it.
    { const lib = await worldLibrary(W, {name: 'Library S', row: {}}); const OR = await lib.publish(lib.v1, 'Synthetic integration concepts 1'); assert.deepEqual(OR.from.releaseId, lib.v1); }
  } finally { W.close(); }
});
