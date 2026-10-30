// rc.10.73.42, group g2-library: D4 and D11 of the handbook gap review (audit/rc41/handbook-review, gaps K-05 and K-06;
// deep-dives library-coverage and component-selection). Each check reproduces one defect and failed on the base commit.
//   D4a A catalogue archetype the project withdrew (or whose catalogue release it withdrew) is neither offered by the
//       chooser and Sol's catalogue reading nor saved by realisation.candidate.
//   D4b An organisation entry reaches a project only through a signed release installed there and still eligible: drafts,
//       approved but unreleased entries and entries withdrawn since are neither offered nor saved.
//   D4c A project library entry is approved by a signed-in person other than the one who wrote it; an agent account or
//       a draft by Sol never approves, and an approval does not change what was reviewed.
//   D11 The catalogue generator's template text and a kit of another kind never enter a design as if they were the
//       archetype's own: template-marked fields are left as open questions, no wrong-kit part is proposed, and nothing of
//       either reaches the component, its checks or the SDD.
// Library content is knowledge: it scores nothing and approves nothing. Run: npm run test:rc42-g2-library
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyEvidenceCommand} from './public/evidence-domain.js';
import {applyKnowledgeCommand, knowledgeImpactStamp} from './public/knowledge-governance.js';
import {applyWorkbenchCommand} from './public/workbench-domain.js';
import {applyRealisationCommand, components, realisationFindings} from './public/realisation-domain.js';
import {architectureMarkdown} from './public/sdd-architecture.js';
import {catalogue} from './public/catalogue-store.js';
import {CATALOGUE} from './public/catalogue-index.js';
import * as CL from './public/component-library.js';
import * as CS from './public/component-snapshot.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';

const at = '2026-10-30T09:00:00.000Z', checks = [], failures = [];
async function check(name, fn) { try { await fn(); checks.push(name); console.log('PASS', name); } catch (e) { failures.push({name, error: String(e?.message || e).split('\n')[0].slice(0, 400)}); console.log('FAIL', name, '\n   ', String(e?.message || e).split('\n')[0].slice(0, 400)); } }
const C = catalogue(), REL = 'ARCH-RELATIONAL-DATA-CAPABILITY', CACHE = 'ARCH-CACHE-CAPABILITY';
const record = id => CS.archetypeRecord(C, id);
const base = withFinalReview(seedProject()), before = JSON.stringify(base);
const withdraw = (p, id) => applyKnowledgeCommand(p, {type: 'knowledge.withdraw', payload: {id, stamp: knowledgeImpactStamp(p, id), reviewed: true, reviewer: 'Synthetic steward', reason: 'Synthetic withdrawal for the rc42 library checks.'}}, at, 'synthetic-steward').document;
const candidate = (p, prop, extra = {}) => applyRealisationCommand(p, {type: 'realisation.candidate', payload: {...prop, reviewed: true, ...extra}}, at).document;
const snap = CS.componentSnapshot(base, 'api-pod', {at}), content = CL.snapshotText(snap);
// An organisation entry as installing a signed release pins it into the project library (organization-service.js install).
const pinned = (id, {eligible = true, status = 'approved', contentHash = 'c'.repeat(64)} = {}) => ({id: 'LIB-pinned-' + id, revision: 1, kind: 'component', title: 'Pinned ' + id, content, owner: 'Payments guild', status, sourceId: '', sourceHash: null, reviewNote: 'Installed signed organization release', reviewAfter: '', scope: 'Project library', at, actor: 'editor-a', history: [], organization: {id: 'org-1', title: 'Payments guild', entryId: id, entryKind: 'component', releaseId: 'rel-1', signature: 's'.repeat(64), contentHash, sourceHash: 'h'.repeat(64), conditions: 'c', limitations: 'l', lifecycle: '', reviewDue: '', assurance: {eligible, status: eligible ? 'Verified signed release' : 'Organization guidance was withdrawn', signature: 's'.repeat(64)}}});
const withEntries = (p, entries) => ({...p, workbench: {...p.workbench, catalogue: [...(p.workbench?.catalogue || []), ...entries]}});
const orgProposal = (id, contentHash = 'c'.repeat(64)) => CS.libraryProposal({id, kind: 'component', title: 'Org ' + id, revision: 2, content}, {scope: 'organisation', organizationId: 'org-1', organizationTitle: 'Payments guild', contentHash});

// ------------------------------------------------------------------------------------------------ D4a withdrawn archetype
await check('D4a: realisation.candidate refuses a catalogue archetype the project withdrew, and every archetype once the catalogue release is withdrawn; others still save', () => {
  const q = withdraw(base, REL), rel = CS.archetypeProposal(record(REL)), cache = CS.archetypeProposal(record(CACHE));
  assert.throws(() => candidate(q, rel), /withdrawn/i, 'a withdrawn archetype is not saved as a candidate');
  assert.equal(components(candidate(q, cache)).at(-1).library.archetypeId, CACHE, 'an archetype not withdrawn still saves');
  const all = withdraw(base, CATALOGUE.releaseId);
  assert.throws(() => candidate(all, cache), /withdrawn/i, 'a withdrawn catalogue release withdraws its archetypes');
  assert.equal(JSON.stringify(base), before);
});

// ------------------------------------------------------------------------------------------------ D4b released organisation entries
await check('D4b: realisation.candidate saves an organisation entry only from a signed release installed in this project, still eligible and holding the reviewed content', () => {
  assert.throws(() => candidate(base, orgProposal('org-draft')), /signed release/i, 'an entry never released into the project is refused');
  assert.throws(() => candidate(withEntries(base, [pinned('org-gone', {eligible: false})]), orgProposal('org-gone')), /signed release/i, 'an installed entry no longer eligible (withdrawn) is refused');
  assert.throws(() => candidate(withEntries(base, [pinned('org-ok')]), orgProposal('org-ok', 'd'.repeat(64))), /signed release/i, 'content other than the reviewed content is refused');
  const q = candidate(withEntries(base, [pinned('org-ok')]), orgProposal('org-ok')), c = components(q).at(-1);
  assert.deepEqual([c.origin, c.status, c.library.scope, c.library.organizationId, c.library.entryId, c.library.releaseId], ['library', 'candidate', 'organisation', 'org-1', 'org-ok', 'rel-1'], 'the installed release is named on the candidate');
  assert.throws(() => candidate(withEntries(base, [pinned('org-ok')]), CS.libraryProposal(pinned('org-ok'), {scope: 'project'})), /component entry of this project/, 'an installed organisation entry is not proposed around its release check as a project entry');
});

// ------------------------------------------------------------------------------------------------ D4c project library approval
await check('D4c: a project library entry is approved only by a signed-in person other than its writer; agents and drafts by Sol never approve; an approval changes nothing it approves', () => {
  let p = applyEvidenceCommand(base, {type: 'evidence.source', payload: {title: 'Reusable intake', excerpt: 'A reviewed intake service.', location: 'Library note 1', status: 'Unconfirmed'}}, at).document;
  const sourceId = p.coauthoring.sources.at(-1).id, payload = {kind: 'control', title: 'Audit preservation', content: 'Preserve the original audit event', owner: 'Architecture', sourceId, reviewed: true, reviewNote: 'Checked for this project'};
  const ws = (q, raw, actor, options) => applyWorkbenchCommand(q, {type: 'workspace.catalogue', payload: raw}, at, actor, options).document;
  assert.throws(() => ws(p, {...payload, status: 'approved'}, 'architect-a'), /second signed-in person|another signed-in person/i, 'one person cannot write and approve in one command');
  p = ws(p, {...payload, status: 'draft'}, 'architect-a'); const id = p.workbench.catalogue.at(-1).id;
  assert.throws(() => ws(p, {...payload, id, status: 'approved'}, 'architect-a'), /second signed-in person|another signed-in person/i, 'the writer cannot approve their own entry');
  assert.throws(() => ws(p, {...payload, id, status: 'approved'}, ''), /signed-in/i, 'nobody signed in cannot approve');
  assert.throws(() => ws(p, {...payload, id, status: 'approved'}, 'agent-x', {author: {kind: 'sol-draft', id: 'agent-x', account: 'agent', reviewed: false}}), /signed-in person/i, 'an agent account never approves');
  assert.throws(() => ws(p, {...payload, id, status: 'approved'}, 'reviewer-b', {author: {kind: 'sol-draft', id: 'reviewer-b', account: 'person', reviewed: false}}), /signed-in person/i, 'a draft by Sol never approves');
  assert.throws(() => ws(p, {...payload, id, content: 'Preserve the original audit event and its hash', status: 'approved'}, 'reviewer-b'), /second signed-in person|another signed-in person/i, 'an approval does not rewrite what it approves');
  const q = ws(p, {...payload, id, status: 'approved'}, 'reviewer-b'), e = q.workbench.catalogue.at(-1);
  assert.deepEqual([e.status, e.author, e.actor, e.revision], ['approved', 'architect-a', 'reviewer-b', 2], 'the second person approves; writer and approver are both kept');
  assert.throws(() => ws(q, {...payload, id, status: 'approved', reviewNote: 'Re-approved by its writer'}, 'architect-a'), /second signed-in person|another signed-in person/i, 'the writer cannot re-approve it later');
  const legacy = {...e, author: undefined, actor: 'architect-a', status: 'approved'}; delete legacy.author;
  assert.throws(() => ws({...q, workbench: {...q.workbench, catalogue: [legacy]}}, {...payload, id, status: 'approved'}, 'architect-a'), /second signed-in person|another signed-in person/i, 'an entry saved before rc42 reads its last saver as its writer');
});

// ------------------------------------------------------------------------------------------------ D11 template text and the wrong kit
const GENERATED = r => [r.summary, r.problem, ...(r.context || []), ...(r.prerequisites || []), ...(r.applicabilityRules || []), ...(r.exclusions || []), ...(r.obligations || []).flatMap(o => [o.title, o.description]), ...(r.componentKit || []).flatMap(k => [k.name, k.responsibility]), ...(r.interfaceKit || []).flatMap(k => [k.name, k.contractType])].filter(Boolean);
const OPEN_FIELDS = ['purpose', 'boundary', 'inputs', 'outputs', 'technologyNeeds', 'assumptions'];
await check('D11: the generator template is marked per field (318 of 328 summaries; every archetype; an authored record keeps its own fields)', () => {
  assert.equal(typeof CS.templateFields, 'function', 'a template reading exists');
  assert.deepEqual(CS.templateFields(record(REL)).sort(), ['applicabilityRules', 'componentKit', 'context', 'exclusions', 'interfaceKit', 'obligations', 'prerequisites', 'problem', 'summary'].sort());
  const cb = C.records.find(r => r.id === 'PAT-CIRCUIT-BREAKER'), own = CS.templateFields(cb);
  for (const f of ['summary', 'problem', 'context', 'prerequisites', 'applicabilityRules', 'exclusions', 'obligations']) assert.ok(!own.includes(f), 'an authored ' + f + ' is not template');
  assert.equal(C.records.filter(r => CS.templateFields(r).includes('summary')).length, 318, '318 of the 328 summaries are the generator template');
  assert.ok(CL.COMPONENT_ARCHETYPES.every(a => CS.templateFields(record(a.id)).includes('summary')), 'every archetype is template at AKR-0.10.73.5');
});
await check('D11: no archetype proposal carries generator template text; the template-marked fields are left as open questions and no template contract, need or obligation is proposed', () => {
  for (const a of CL.COMPONENT_ARCHETYPES) {
    const r = record(a.id), ap = CS.archetypeProposal(r), {title, library, ...rest} = ap, text = JSON.stringify(rest);
    for (const s of GENERATED(r)) assert.ok(!text.includes(s), a.id + ' proposes the template text: ' + s);
    for (const f of OPEN_FIELDS) { assert.equal(ap[f], '', a.id + ' ' + f + ' is left for the person'); assert.equal(ap.open?.[f]?.state, 'open-question', a.id + ' ' + f + ' is an open question'); }
    assert.deepEqual(ap.proposed, {contracts: [], needs: [], obligations: []}, a.id + ' proposes no template contract, need or obligation');
    assert.ok(ap.source.includes(a.id) && ap.rationale.includes(a.id), 'where it came from is still said');
  }
});
await check('D11: proposing the relational data archetype brings no identity-token or policy-decision contract (a kit of another kind)', () => {
  const text = JSON.stringify(CS.archetypeProposal(record(REL)));
  for (const s of ['Identity Assertion', 'OIDC', 'Policy Decision', 'Policy Enforcement Point', 'Trust Service', 'Protected Workload']) assert.ok(!text.includes(s), 'the security kit is proposed: ' + s);
});
await check('D11: a kit part whose category is not the archetype\'s own kind is never proposed, even when its text is authored; a kit of its own kind is', () => {
  const authored = r => ({...structuredClone(r), summary: 'Keeps the system of record in normalised relational tables with transactional integrity.', problem: 'Several services must read and change one consistent record of payments.', context: ['Payments are changed by several services.'], prerequisites: ['A schema owner is named.'], applicabilityRules: ['Writes need transactional integrity.'], exclusions: ['Not for append-only telemetry.'], obligations: [{id: 'OBL-REL-1', title: 'Back up the ledger tables', description: 'Daily backups with a tested restore.', mandatory: true}]});
  const kit = (category, names) => names.map((n, i) => ({archetype: 'Part ' + i, canonicalKind: i === 1 ? 'LogicalTechnologyCapability' : 'LogicalService', key: 'synthetic-' + category + '-' + i, name: n, properties: {category}, required: true, responsibility: 'Responsibility of ' + n}));
  const wrong = {...authored(record(REL)), componentKit: kit('security', ['Session identity check', 'Token signing service']), interfaceKit: [{consumerRole: 'session identity check', providerRole: 'caller', contractType: 'JWT', interaction: 'request-response', key: 'synthetic-identity', name: 'Session token exchange', protocol: 'HTTPS', required: true}]};
  const w = CS.archetypeProposal(wrong), wt = JSON.stringify(w);
  assert.ok(w.purpose.startsWith('Keeps the system of record'), 'authored text is proposed');
  for (const s of ['Session identity check', 'Token signing service', 'Session token exchange', 'JWT']) assert.ok(!wt.includes(s), 'a kit of another kind is proposed: ' + s);
  assert.deepEqual([w.proposed.contracts.length, w.proposed.needs.length], [0, 0]);
  assert.equal(w.proposed.obligations.length, 1, 'an authored obligation is proposed');
  const right = {...authored(record(REL)), componentKit: kit('data', ['Ledger tables', 'Relational engine']), interfaceKit: [{consumerRole: 'caller', providerRole: 'ledger tables', contractType: 'SQL', interaction: 'request-response', key: 'synthetic-ledger', name: 'Ledger write', protocol: 'SQL', required: true}]};
  const g = CS.archetypeProposal(right);
  assert.ok(g.boundary.includes('Ledger tables') && g.proposed.contracts.some(k => k.title === 'Ledger write') && g.proposed.needs.some(n => n.description.startsWith('Relational engine')), 'a kit of the archetype\'s own kind is proposed');
});
await check('D11: a candidate saved from an archetype carries no template text into its record, its checks or the SDD; its open questions are kept', () => {
  const q = candidate(base, CS.archetypeProposal(record(REL)), {allocations: [{logicalId: 'api', scope: 'Intake'}]}), c = components(q).at(-1), r = record(REL);
  assert.equal(c.library.archetypeId, REL);
  const md = architectureMarkdown(q).markdown, findings = JSON.stringify(realisationFindings(q)), saved = JSON.stringify(c);
  assert.ok(md.includes(c.ref), 'the SDD prints the candidate');
  for (const s of GENERATED(r)) { assert.ok(!md.includes(s), 'the SDD prints template text: ' + s); assert.ok(!saved.includes(s), 'the record holds template text: ' + s); assert.ok(!findings.includes(s), 'a check reads template text: ' + s); }
  assert.equal(c.open?.purpose?.state, 'open-question', 'the purpose is kept as an open question');
  const answered = components(candidate(base, {...CS.archetypeProposal(record(REL)), purpose: 'Keeps the payment ledger in relational tables.'})).at(-1);
  assert.deepEqual([answered.purpose, answered.open?.purpose, answered.open?.boundary?.state], ['Keeps the payment ledger in relational tables.', undefined, 'open-question'], 'a question the person answered in review is not kept open; the others are');
});

// ------------------------------------------------------------------------------------------------ D4 through the service
await check('D4b/D4c through the service: a draft or unreleased organisation entry is refused, an installed one saves, a withdrawn one is refused again; nobody approves their own project entry', async () => {
  const dir = await mkdtemp(tmpdir() + '/aiw-rc42-g2-'), env = {DB: localDatabase(dir + '/test.sqlite'), FILES: localFiles(dir + '/files'), ASSETS: {fetch: () => new Response('ok')}};
  const api = async (path, raw, actor = 'editor-a') => { const response = await worker.fetch(new Request('https://aiw.test' + path, {headers: {'oai-authenticated-user-id': actor, Origin: 'https://aiw.test', ...(raw ? {'Content-Type': 'application/json'} : {})}, ...(raw ? {method: 'POST', body: JSON.stringify(raw)} : {})}), env); let data = null; try { data = await response.json(); } catch { data = null; } return {status: response.status, data}; };
  const command = async (type, payload, actor = 'editor-a') => { const project = (await api('/api/project', null, actor)).data; return api('/api/commands', {revision: project.revision, command: {type, payload}}, actor); };
  try {
    const org = await api('/api/organizations?action=create', {title: 'Payments guild', purpose: 'Shared components'}); assert.equal(org.status, 201); const id = org.data.id, lib = '/api/organizations?organization=' + id + '&action=';
    assert.equal((await api(lib + 'members', {actorId: 'reviewer-b', role: 'reviewer'})).status, 200);
    const mine = (await api('/api/project')).data, s2 = CS.componentSnapshot(mine.document, 'risk-engine', {at});
    const source = {location: 'Project ' + mine.document.name + ' · Chapter 5 · APP-002', passage: s2.purpose + '\n\n' + s2.boundary, revision: 'APP-002 revision 1 · ' + at};
    const filed = await api(lib + 'library', {kind: 'component', title: 'Risk decision service', content: CL.snapshotText(s2), conditions: 'Where a decision must be explicit and auditable.', limitations: 'A snapshot of one project; carries no approval.', source}); assert.equal(filed.status, 200, JSON.stringify(filed.data)); const entryId = filed.data.id;
    const current = async () => (await api(lib + 'library')).data.entries.find(x => x.id === entryId);
    const propose = async e => command('realisation.candidate', {...CS.libraryProposal(e, {scope: 'organisation', organizationId: id, organizationTitle: 'Payments guild', contentHash: e.review?.contentHash || ''}), reviewed: true});
    let e = await current(), saved = await propose(e);
    assert.equal(saved.status, 400, 'a draft organisation entry is not saved: ' + JSON.stringify(saved.data)); assert.match(saved.data.error, /signed release/i);
    assert.equal((await api(lib + 'review', {id: entryId, revision: e.revision, outcome: 'approved', reviewed: true, rationale: 'Exact snapshot checked', evidence: 'Compared with the source project'}, 'reviewer-b')).status, 200);
    e = await current(); saved = await propose(e);
    assert.equal(saved.status, 400, 'an approved entry not released into the project is not saved'); assert.match(saved.data.error, /signed release/i);
    const release = (await api(lib + 'releases', {title: 'Components 1', entryIds: [entryId], reviewed: true})).data.release;
    const project = (await api('/api/project')).data; assert.equal((await api(lib + 'install', {revision: project.revision, releaseId: release.id, reviewed: true})).status, 200);
    saved = await propose(e); assert.equal(saved.status, 200, 'an installed entry saves: ' + JSON.stringify(saved.data));
    const c = saved.data.document.realisation.components.at(-1); assert.deepEqual([c.library.scope, c.library.entryId, c.library.releaseId], ['organisation', entryId, release.id]);
    e = await current(); assert.equal((await api(lib + 'review', {id: entryId, revision: e.revision, outcome: 'withdrawn', reviewed: true, rationale: 'Superseded', evidence: 'Steward decision'}, 'reviewer-b')).status, 200);
    saved = await propose(e); assert.equal(saved.status, 400, 'an entry withdrawn since its release is not saved'); assert.match(saved.data.error, /signed release/i);
    assert.equal((await command('evidence.source', {title: 'Reusable intake', excerpt: 'A reviewed intake service.', location: 'Library note 1', status: 'Unconfirmed'})).status, 200);
    const sourceId = (await api('/api/project')).data.document.coauthoring.sources.at(-1).id, payload = {kind: 'control', title: 'Audit preservation', content: 'Preserve the original audit event', owner: 'Architecture', sourceId, reviewed: true, reviewNote: 'Checked'};
    let r = await command('workspace.catalogue', {...payload, status: 'approved'}); assert.equal(r.status, 400, 'one person cannot write and approve in one request'); assert.match(r.data.error, /second signed-in person|another signed-in person/i);
    r = await command('workspace.catalogue', {...payload, status: 'draft'}); assert.equal(r.status, 200); const libId = r.data.document.workbench.catalogue.at(-1).id;
    r = await command('workspace.catalogue', {...payload, id: libId, status: 'approved'}); assert.equal(r.status, 400, 'the writer cannot approve it'); assert.match(r.data.error, /second signed-in person|another signed-in person/i);
  } finally { env.DB.close(); await rm(dir, {recursive: true, force: true}); }
});

// ------------------------------------------------------------------------------------------------ D4 in the chooser (happy-dom)
await check('D4a/D4b/D11 in the chooser and Sol\'s catalogue reading: no withdrawn archetype, no draft or unreleased organisation entry; template archetypes are labelled', async () => {
  const {Window} = await import(process.env.AIW_DOM_MODULE || 'happy-dom');
  const root = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '');
  const w = new Window({url: 'https://aiw.test/?chapter=5&tab=work', width: 1440, height: 900, settings: {navigation: {disableMainFrameNavigation: true}}});
  for (const key of ['window', 'document', 'history', 'location', 'localStorage', 'CustomEvent', 'Event', 'KeyboardEvent', 'FormData', 'Node', 'Element', 'HTMLElement', 'SVGElement', 'MutationObserver', 'ResizeObserver', 'navigator', 'CSS'])
    if (w[key] !== undefined) Object.defineProperty(globalThis, key, {value: key === 'window' ? w : w[key], configurable: true, writable: true});
  for (const key of ['matchMedia', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) globalThis[key] = w[key].bind(w);
  w.document.body.innerHTML = '<div id="app"><main><button type="button" id="opener">Open</button></main></div><div id="toast"></div>';
  // The organisation library as its route answers a member: a draft, an approved entry never released, the released one.
  const orgEntry = (id, status) => ({id, kind: 'component', title: 'Org ' + id, content, status, revision: 1, review: status === 'draft' ? undefined : {contentHash: 'c'.repeat(64)}});
  const realFetch = globalThis.fetch;
  globalThis.fetch = async path => { const u = String(path); const body = u.includes('action=list') ? {organizations: [{id: 'org-1', title: 'Payments guild', role: 'editor'}]} : u.includes('action=library') ? {organization: {id: 'org-1', title: 'Payments guild'}, entries: [orgEntry('org-draft', 'draft'), orgEntry('org-approved', 'approved'), orgEntry('org-ok', 'approved'), orgEntry('org-gone', 'approved')]} : null; return new Response(JSON.stringify(body || {error: 'Not here'}), {status: body ? 200 : 404, headers: {'Content-Type': 'application/json'}}); };
  try {
    let p = withdraw(base, REL);
    p = applyWorkbenchCommand(p, {type: 'workspace.catalogue', payload: {kind: 'component', title: 'Payment API', content, owner: 'Platform team', reviewNote: 'Reusable.'}}, at, 'architect-a').document;
    p = withEntries(p, [pinned('org-ok'), pinned('org-gone', {eligible: false})]);
    const store = {value: {document: p}}; window.aiwProjectStore = store;
    const UI = await import(pathToFileURL(root + '/public/component-library-ui.js'));
    const q = s => document.querySelector(s), waitFor = async (fn, message, n = 200) => { for (let i = 0; i < n; i++) { const v = fn(); if (v) return v; await new Promise(r => setTimeout(r, 15)); } throw Error('Timed out: ' + message); };
    let proposed = null; q('#opener').focus(); await UI.fromLibrary({store, propose: prop => { proposed = prop; }});
    const d = q('dialog[open]'); assert.equal(d.getAttribute('aria-label'), 'From the library');
    assert.equal(d.querySelectorAll('[data-cl-archetype]').length, 19, 'nineteen archetypes: the withdrawn one is not offered');
    assert.equal(d.querySelector('[data-cl-archetype="' + REL + '"]'), null);
    await waitFor(() => d.querySelector('[data-cl-orgs] .brain-note, [data-cl-orgs] article'), 'the organisation section');
    await new Promise(r => setTimeout(r, 60));
    for (const id of ['org-draft', 'org-approved', 'org-gone']) assert.equal(d.querySelector('[data-cl-entry="' + id + '"]'), null, id + ' is not offered');
    assert.ok(d.querySelector('[data-cl-orgs] [data-cl-entry="org-ok"] [data-cl-action="propose"]'), 'the entry installed from a signed release is offered');
    assert.equal(d.querySelector('[data-cl-entry="LIB-pinned-org-ok"]'), null, 'an installed organisation entry is not offered again as a project entry');
    await waitFor(() => d.querySelectorAll('[data-cl-archetype] [data-cl-template]').length === 19, 'the template label on each archetype', 120);
    d.querySelector('[data-cl-orgs] [data-cl-entry="org-ok"] [data-cl-action="propose"]').click(); await waitFor(() => proposed, 'the proposal');
    assert.deepEqual([proposed.library.scope, proposed.library.organizationId, proposed.library.entryId, proposed.library.contentHash], ['organisation', 'org-1', 'org-ok', 'c'.repeat(64)]);
    assert.equal(components(candidate(p, proposed)).at(-1).library.releaseId, 'rel-1', 'the chooser\'s proposal saves through the reviewed path');
    while (q('dialog[open]')) q('dialog[open]').dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
    await assert.rejects(UI.openLibraryToken('archetype:' + REL), /withdrawn/i, 'an address cannot propose a withdrawn archetype');
    await assert.rejects(UI.openLibraryToken('org:org-1:org-draft'), /signed release/i, 'an address cannot propose an unreleased organisation entry');
    const el = document.createElement('details'); document.body.append(el); await UI.mountCatalogueReading(el, {chapter: 3}); await new Promise(r => setTimeout(r, 60));
    assert.equal(el.querySelectorAll('[data-cl-archetype]').length, 19, 'Sol\'s catalogue reading offers no withdrawn archetype');
    assert.deepEqual([...el.querySelectorAll('[data-cl-orgs] [data-cl-entry]')].map(x => x.dataset.clEntry), ['org-ok'], 'Sol\'s catalogue reading offers only the released entry');
  } finally { globalThis.fetch = realFetch; }
});

assert.equal(JSON.stringify(base), before, 'the seed project is unchanged throughout');
console.log(JSON.stringify({suite: 'rc42 g2-library (D4, D11)', passed: checks.length, failed: failures.length, checks, failures}, null, 2));
if (failures.length) process.exit(1);
