// The component library (round 11, workstream F, first increment): a `component` library kind whose content is a
// component specification snapshot; "Add to the library" from a project component; "From the library" and the
// catalogue's component archetypes as Chapter 5 proposals through the existing reviewed path; organisation review,
// signed releases and pins unchanged; tenant and project boundaries. Library content is knowledge: it enters no
// finding, no anti-pattern reading and no readiness check; a proposal is not a record; nothing is approved by filing,
// proposing or installing. Run: npm run test:component-library
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {reasoningSource} from './public/design-reasoning.js';
import {componentSpec, detectAntiPatterns} from './public/design-spec.js';
import {sddReadiness, chapterChecks} from './public/readiness-model.js';
import {catalogue} from './public/catalogue-store.js';
import {applyWorkbenchCommand, previewGuidanceTemplate, previewGuidanceUse} from './public/workbench-domain.js';
import {applyRealisationCommand, components, component, realisationFindings, COMPONENT_KINDS} from './public/realisation-domain.js';
import {readComponentSnapshot, snapshotText, cleanProposed, cleanLibraryRef, COMPONENT_ARCHETYPES, COMPONENT_LIBRARY_KIND, SNAPSHOT_SCHEMA, LIBRARY_KEYS} from './public/component-library.js';
import {componentSnapshot, snapshotSummary, libraryProposal, archetypeProposal, archetypeRecord, archetypeKind} from './public/component-snapshot.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';

const checks = [], pass = n => { checks.push(n); console.log('PASS', n); };
const at = '2026-10-07T09:00:00.000Z';
const base = withFinalReview(seedProject()), before = JSON.stringify(base);
const readings = p => { const R = reasoningSource(p); return JSON.stringify({anti: detectAntiPatterns(R).map(a => [a.id, a.objects.map(o => o.id)]), findings: realisationFindings(p).map(f => f.id).sort(), readiness: sddReadiness(p), checks: chapterChecks(p, 5), spec: components(p).map(c => [c.id, componentSpec(R, c.id)?.gaps])}); };
const noSecret = text => !/Sup3rS3cret|sk-proj-|hunter2x/.test(text);

// 1. The snapshot: everything the specification names, by name; the project it came from; no secret; nothing changed.
const s = componentSnapshot(base, 'api-pod', {at});
assert.equal(s.schema, SNAPSHOT_SCHEMA);
assert.deepEqual([s.identity.ref, s.identity.title, s.identity.kind, s.identity.status], ['APP-001', 'Payment service', 'service', 'candidate']);
assert.ok(s.purpose && s.boundary, 'purpose and boundary');
assert.equal(s.responsibilities.length, 1); assert.match(s.responsibilities[0], /^LR-001 /);
assert.equal(s.interfaces.provides.length, 1); assert.equal(s.interfaces.requires.length, 1);
assert.deepEqual(Object.keys(s.interfaces.provides[0]), ['title', 'ref', 'kind', 'provider', 'consumer', 'promises', 'exchanges']);
assert.match(s.interfaces.provides[0].consumer, /Initiating channel/); assert.ok(s.interfaces.provides[0].promises.protocol, 'a promise travels by name and value');
assert.deepEqual(s.data.owned, ['DAT-001 Payment instruction']); assert.equal(s.technology.needs.length, 6); assert.ok(s.technology.needs.every(n => n.category && n.description && n.capability));
assert.equal(s.obligations.length, 6); assert.ok(s.obligations.some(o => o.kind === 'quality' && /^QD-001 /.test(o.title) && /at most 0/.test(o.detail)) && s.obligations.some(o => o.kind === 'control' && /^SEC-001 /.test(o.title)));
assert.deepEqual(s.origin, {project: {id: base.id, name: base.name}, component: {id: 'api-pod', ref: 'APP-001', title: 'Payment service'}, at});
assert.equal(componentSnapshot(base, 'nobody'), null); assert.equal(componentSnapshot(base, 'ledger'), null, 'a responsibility is not a component');
assert.deepEqual(readComponentSnapshot(snapshotText(s)), s, 'the stored text reads back as the same snapshot');
assert.throws(() => readComponentSnapshot('not json'), /component specification snapshot/); assert.throws(() => readComponentSnapshot(JSON.stringify({schema: 'other', identity: {title: 'x'}})), /snapshot/);
assert.ok(snapshotText(s).length < 8000 && /1 provided and 1 required interfaces/.test(snapshotSummary(s)));
{ const leaky = structuredClone(base); const c = leaky.realisation.components.find(c => c.id === 'api-pod'); c.technologyNeeds = 'Connect with password=Sup3rS3cret!x and api_key: sk-proj-abcdefghijklmnopqrstuvwxyz0123456789'; c.boundary = 'Password: hunter2x; the rest is prose';
  const t = snapshotText(componentSnapshot(leaky, 'api-pod')); assert.ok(noSecret(t), 'no credential survives into the snapshot: ' + t.slice(0, 200)); assert.match(t, /\[secret redacted\]/); assert.match(t, /\[API key redacted\]/); }
assert.equal(JSON.stringify(base), before, 'reading a snapshot changes nothing');
pass('a component snapshot names identity, purpose, boundary, responsibilities, interfaces with promises, data, technology needs, obligations and its origin; it reads back as itself, refuses anything else, carries no secret and changes nothing');

// 2. The project library: a `component` entry holds the snapshot; other content is refused; the entry is knowledge the
//    template and guidance paths do not use; no record is written by filing it.
let p = applyWorkbenchCommand(base, {type: 'workspace.catalogue', payload: {kind: COMPONENT_LIBRARY_KIND, title: 'Payment API', content: snapshotText(s), owner: 'Platform team', reviewNote: 'A reusable intake service.'}}, at, 'architect').document;
const entry = p.workbench.catalogue[0];
assert.equal(entry.kind, 'component'); assert.equal(entry.status, 'draft'); assert.equal(entry.scope, 'Project library'); assert.equal(entry.revision, 1);
assert.deepEqual(readComponentSnapshot(entry.content), s, 'the entry holds the snapshot, whole');
assert.throws(() => applyWorkbenchCommand(base, {type: 'workspace.catalogue', payload: {kind: 'component', title: 'x', content: 'Some guidance text', owner: 'o'}}, at, 'a'), /component specification snapshot/, 'prose is not a component entry');
assert.throws(() => applyWorkbenchCommand(p, {type: 'workspace.catalogue', payload: {id: entry.id, kind: 'technology', title: 'x', content: snapshotText(s), owner: 'o'}}, at, 'a'), /retain their type/);
assert.throws(() => previewGuidanceTemplate({...p, workbench: {...p.workbench, catalogue: [{...entry, status: 'approved'}]}}, entry.id), /chapter template|Review current/, 'a component entry is not a chapter template');
assert.throws(() => previewGuidanceUse({...p, workbench: {...p.workbench, catalogue: [{...entry, status: 'approved'}]}}, {entryId: entry.id, adaptation: 'x'.repeat(10), owner: 'o', reason: 'r'}), /reviewed guidance|chapter template/);
assert.equal(JSON.stringify(p.realisation), JSON.stringify(base.realisation), 'filing writes no component');
assert.equal(readings(p), readings(base), 'a library entry enters no finding, anti-pattern, gap or readiness check');
{ const leaky = structuredClone(base); leaky.realisation.components.find(c => c.id === 'api-pod').inputs = 'token=eyJabcdefghij.klmnopqrstuv.wxyz0123456789'; const q = applyWorkbenchCommand(leaky, {type: 'workspace.catalogue', payload: {kind: 'component', title: 'Leaky', content: snapshotText(componentSnapshot(leaky, 'api-pod')), owner: 'o'}}, at, 'a').document; assert.ok(!q.workbench.catalogue[0].content.includes('eyJabcdefghij'), 'the library never holds a token'); }
pass('add to the library yields an entry of kind component holding the snapshot and no secret; prose is refused; the entry is knowledge outside the template and guidance paths; filing writes no record and changes no reading');

// 3. From the library: a proposal, not a record; the reviewed path makes a candidate with its origin; contracts and needs
//    stay proposals; a later edit keeps the origin; the wrong reference is refused.
const prop = libraryProposal(entry, {scope: 'project'});
assert.deepEqual([prop.key, prop.origin, prop.status], ['library', 'library', 'candidate']);
assert.ok(COMPONENT_KINDS.includes(prop.kind) && prop.title === 'Payment service' && prop.purpose === s.purpose && prop.boundary === s.boundary);
assert.deepEqual(prop.library, {scope: 'project', title: 'Payment API', entryId: entry.id, revision: 1, contentHash: ''});
assert.equal(prop.proposed.contracts.length, 2); assert.deepEqual(prop.proposed.contracts.map(k => k.role), ['provides', 'requires']); assert.equal(prop.proposed.needs.length, 6); assert.equal(prop.proposed.obligations.length, 6);
assert.deepEqual(prop.allocations, []); assert.equal(prop.sourceId, ''); assert.match(prop.effect, /stay proposals for Chapter 8 and Chapter 6/);
assert.equal(JSON.stringify(p.realisation), JSON.stringify(base.realisation), 'proposing writes nothing');
assert.throws(() => applyRealisationCommand(p, {type: 'realisation.candidate', payload: {...prop}}, at), /Review the proposed changes/, 'unreviewed, refused');
assert.throws(() => applyRealisationCommand(p, {type: 'realisation.candidate', payload: {...prop, reviewed: true, library: {...prop.library, entryId: 'LIB-missing'}}}, at), /component entry of this project/);
assert.throws(() => applyRealisationCommand(p, {type: 'realisation.candidate', payload: {...prop, reviewed: true, key: 'archetype'}}, at), /archetype proposal names a catalogue archetype/);
assert.throws(() => applyRealisationCommand(p, {type: 'realisation.candidate', payload: {...prop, reviewed: true, library: {scope: 'nowhere'}}}, at), /where the proposal comes from/);
const contractsBefore = p.interfaces.contracts.length, needsBefore = p.technology.needs.length;
let q = applyRealisationCommand(p, {type: 'realisation.candidate', payload: {...prop, reviewed: true, allocations: [{logicalId: 'api', scope: 'Intake'}]}}, at).document;
const made = components(q).at(-1);
assert.deepEqual([made.ref, made.origin, made.status, made.patternKey], ['APP-006', 'library', 'candidate', null]);
assert.deepEqual(made.library, {scope: 'project', title: 'Payment API', entryId: entry.id, revision: 1, contentHash: ''});
assert.equal(made.proposed.contracts.length, 2); assert.equal(made.proposed.needs.length, 6); assert.ok(made.proposed.contracts.every(k => typeof k.promises === 'string'), 'proposals are text');
assert.equal(q.interfaces.contracts.length, contractsBefore, 'no Chapter 8 contract is written'); assert.equal(q.technology.needs.length, needsBefore, 'no Chapter 6 need is written');
assert.equal(q.realisation.connections.length, p.realisation.connections.length, 'no interaction is written');
assert.equal(q.logical.mappings.filter(m => m.physicalId === made.id).length, 1, 'the reviewed allocation is kept');
assert.equal(q.logical.assets.find(n => n.id === made.id)?.origin, 'suggestion');
assert.ok(realisationFindings(q).some(f => f.code === 'review' && f.objectId === made.id), 'a candidate still needs its review');
q = applyRealisationCommand(q, {type: 'realisation.component', payload: {...made, title: 'Payment intake service', allocations: [{logicalId: 'api', scope: 'Intake'}]}}, at).document;
const edited = component(q, made.id); assert.equal(edited.revision, 2); assert.equal(edited.origin, 'library'); assert.deepEqual(edited.library, made.library); assert.deepEqual(edited.proposed, made.proposed);
pass('propose from the library yields a proposal, not a record; the reviewed path saves a candidate with origin library and its entry; its contracts and needs stay proposals (no Chapter 8 or 6 record, no interaction); a later edit keeps the origin; a wrong reference or an unreviewed proposal is refused');

// 4. The twenty archetypes: each a proposal with contracts and needs; the reviewed path makes a candidate with origin
//    archetype; the archetype's knowledge authority travels as a reading, never a score; an unknown id is refused.
assert.equal(COMPONENT_ARCHETYPES.length, 20); assert.ok(COMPONENT_ARCHETYPES.every(a => /^ARCH-/.test(a.id) && a.name));
const C = catalogue(); assert.ok(C.loaded !== false && C.records.length, 'the catalogue is installed under node');
for (const a of COMPONENT_ARCHETYPES) {
  const record = archetypeRecord(C, a.id); assert.ok(record, a.id + ' is in the catalogue');
  const ap = archetypeProposal(record);
  assert.deepEqual([ap.key, ap.origin, ap.status, ap.title, ap.kind], ['archetype', 'archetype', 'candidate', record.name, archetypeKind(a.id)]);
  assert.ok(COMPONENT_KINDS.includes(ap.kind)); assert.ok(ap.purpose && ap.boundary && ap.technologyNeeds && ap.rationale && ap.source && ap.assumptions);
  assert.deepEqual(ap.library, {scope: 'catalogue', title: record.name, archetypeId: a.id, releaseId: C.releaseId, recordSha256: record.recordSha256});
  assert.equal(ap.proposed.contracts.length, record.interfaceKit.length); assert.ok(ap.proposed.needs.length >= 1); assert.equal(ap.proposed.obligations.length, record.obligations.length);
  assert.deepEqual(ap.authority, {descriptive: true, scoringCalibrated: false, candidateKnowledgeInfluence: 'blocked', conformanceReady: false}, 'the archetype says it is descriptive');
  const z = applyRealisationCommand(p, {type: 'realisation.candidate', payload: {...ap, reviewed: true}}, at).document, c = components(z).at(-1);
  assert.deepEqual([c.origin, c.status, c.library.archetypeId, c.proposed.contracts.length], ['archetype', 'candidate', a.id, record.interfaceKit.length]);
  assert.equal(c.authority, undefined, 'no authority or score is stored on the record'); assert.equal(c.score, undefined);
  assert.equal(z.interfaces.contracts.length, contractsBefore); assert.equal(z.technology.needs.length, needsBefore);
}
assert.throws(() => archetypeProposal(archetypeRecord(C, 'STYLE-LAYERED') || {recordType: 'style'}), /component archetypes/);
assert.throws(() => cleanLibraryRef({scope: 'catalogue', archetypeId: 'ARCH-NOT-THERE'}), /component archetypes/);
assert.throws(() => applyRealisationCommand(p, {type: 'realisation.candidate', payload: {...archetypeProposal(archetypeRecord(C, 'ARCH-CACHE-CAPABILITY')), reviewed: true, library: {scope: 'catalogue', archetypeId: 'ARCH-NOT-THERE'}}}, at), /component archetypes/);
assert.deepEqual(cleanProposed({contracts: [{title: 'T', kind: 'odd', role: 'x', other: 1, promises: {a: 1}}], needs: [{description: ''}], obligations: [{title: 'O'}]}), {contracts: [{title: 'T', kind: 'request', role: 'provides', other: '1', promises: '[object Object]', exchanges: ''}], needs: [], obligations: [{kind: 'obligation', title: 'O', detail: ''}]}, 'what travels with a proposal is bounded text');
assert.deepEqual(LIBRARY_KEYS, ['library', 'archetype']);
pass('each of the twenty catalogue archetypes proposes a component with its interface contracts, technology needs and obligations; accepting through the reviewed path saves a candidate with origin archetype and the archetype id; the knowledge authority is a reading (descriptive, not calibrated, candidate influence blocked) and no score is stored; an unknown archetype is refused');

// 5. Knowledge never weighs: a candidate from the library reads exactly as the same component authored by hand. Every
//    finding, gap, anti-pattern and readiness check is the same with origin library as with origin user.
{ const fromLibrary = applyRealisationCommand(p, {type: 'realisation.candidate', payload: {...prop, reviewed: true, allocations: [{logicalId: 'api', scope: 'Intake'}]}}, at).document;
  const byHand = structuredClone(fromLibrary); const c = components(byHand).at(-1); c.origin = 'user'; delete c.library; delete c.proposed; byHand.workbench.catalogue = [];
  assert.equal(readings(fromLibrary), readings(byHand), 'origin, library reference and proposals change no reading');
  assert.ok(readings(fromLibrary) !== readings(base), 'the candidate itself is read, as any component is'); }
pass('scoring, constraints and conformance are unchanged by provenance: a candidate from the library or an archetype reads exactly as the same component authored by hand, and library entries read as nothing');

// 6. The service: an organisation's component entry, its independent review, the signed release and the pin into a
//    project; nothing approved by installing; a member of another organisation cannot read it; reading changes nothing.
const dir = await mkdtemp(tmpdir() + '/aiw-component-library-'), env = {DB: localDatabase(dir + '/test.sqlite'), FILES: localFiles(dir + '/files'), ASSETS: {fetch: () => new Response('ok')}};
async function api(path, raw, actor = 'editor-a') { const response = await worker.fetch(new Request('https://aiw.test' + path, {headers: {'oai-authenticated-user-id': actor, Origin: 'https://aiw.test', ...(raw ? {'Content-Type': 'application/json'} : {})}, ...(raw ? {method: 'POST', body: JSON.stringify(raw)} : {})}), env); let data = null; try { data = await response.json(); } catch { data = null; } return {status: response.status, data}; }
try {
  const org = await api('/api/organizations?action=create', {title: 'Payments guild', purpose: 'Shared components'}); assert.equal(org.status, 201); const id = org.data.id, lib = '/api/organizations?organization=' + id + '&action=';
  assert.equal((await api(lib + 'members', {actorId: 'reviewer-b', role: 'reviewer'})).status, 200);
  const other = await api('/api/organizations?action=create', {title: 'Another guild', purpose: 'Elsewhere'}, 'outsider-d'); assert.equal(other.status, 201);
  // The entry is filed from a project component: its snapshot, with the source it came from.
  const mine = await api('/api/project'); assert.equal(mine.status, 200); const snap = componentSnapshot(mine.data.document, 'risk-engine', {at});
  const source = {location: 'Project ' + mine.data.document.name + ' · Chapter 5 · APP-002', passage: snap.purpose + '\n\n' + snap.boundary, revision: 'APP-002 revision 1 · ' + at};
  const refused = await api(lib + 'library', {kind: 'component', title: 'Risk decision service', content: 'Some prose, not a snapshot', conditions: 'c', limitations: 'l', source}); assert.equal(refused.status, 400); assert.match(refused.data.error, /component specification snapshot/);
  const filed = await api(lib + 'library', {kind: 'component', title: 'Risk decision service', content: snapshotText(snap), conditions: 'Where a decision must be explicit and auditable.', limitations: 'A snapshot of one project; carries no approval.', source}); assert.equal(filed.status, 200, JSON.stringify(filed.data)); const entryId = filed.data.id;
  let listed = await api(lib + 'library'); assert.equal(listed.status, 200); let e = listed.data.entries.find(x => x.id === entryId); assert.equal(e.kind, 'component'); assert.equal(e.status, 'draft'); assert.deepEqual(readComponentSnapshot(e.content), snap);
  assert.equal((await api(lib + 'library', null, 'outsider-d')).status, 404, 'a member of another organisation cannot read the entry');
  assert.equal((await api(lib + 'library', null, 'nobody-e')).status, 404, 'nor can a stranger');
  assert.equal((await api(lib + 'library', {kind: 'component', title: 'x', content: snapshotText(snap), conditions: 'c', limitations: 'l', source}, 'reviewer-b')).status, 403, 'a reviewer does not file entries');
  assert.equal((await api(lib + 'review', {id: entryId, revision: e.revision, outcome: 'approved', reviewed: true, rationale: 'Checked', evidence: 'Read it'})).status, 403, 'the author cannot review');
  assert.equal((await api(lib + 'review', {id: entryId, revision: e.revision, outcome: 'approved', reviewed: true, rationale: 'Exact snapshot checked', evidence: 'Compared with the source project'}, 'reviewer-b')).status, 200);
  const released = await api(lib + 'releases', {title: 'Components 1', entryIds: [entryId], reviewed: true}); assert.equal(released.status, 201, JSON.stringify(released.data)); const release = released.data.release; assert.equal(release.entries[0].kind, 'component');
  // Installing the release pins the entry into the project library and nothing else: no component, no proposal accepted.
  let project = (await api('/api/project')).data; const componentsBefore = JSON.stringify(project.document.realisation.components), revisionBefore = project.revision;
  assert.equal((await api(lib + 'install', {revision: project.revision, releaseId: release.id, reviewed: false})).status, 400);
  assert.equal((await api(lib + 'install', {revision: project.revision, releaseId: release.id, reviewed: true}, 'outsider-d')).status, 404, 'a member of another organisation cannot install it');
  const installed = await api(lib + 'install', {revision: project.revision, releaseId: release.id, reviewed: true}); assert.equal(installed.status, 200, JSON.stringify(installed.data));
  project = (await api('/api/project')).data; const pinned = project.document.workbench.catalogue.find(x => x.organization?.entryId === entryId);
  assert.ok(pinned && pinned.kind === 'component' && pinned.organization.releaseId === release.id && pinned.organization.assurance.eligible === true, 'the entry is pinned from the signed release');
  assert.deepEqual(readComponentSnapshot(pinned.content), snap, 'the pinned entry holds the snapshot');
  assert.equal(JSON.stringify(project.document.realisation.components), componentsBefore, 'no component is created or changed by installing');
  assert.ok(!project.document.realisation.components.some(c => c.origin === 'library' || c.origin === 'archetype'), 'nothing is proposed or approved by installing');
  assert.equal(project.document.workspace.organizationPins.length, 1);
  // Reading the library and the project changes nothing.
  const revisionAfterInstall = project.revision; await api(lib + 'library'); await api('/api/organizations?action=list'); await api(lib + 'releases');
  const again = (await api('/api/project')).data; assert.equal(again.revision, revisionAfterInstall); assert.equal(JSON.stringify(again.document), JSON.stringify(project.document), 'reading changes nothing in the project');
  assert.equal(revisionAfterInstall, revisionBefore + 1);
  // A proposal from the organisation entry travels the one command route and is saved as a candidate with its origin.
  listed = await api(lib + 'library'); e = listed.data.entries.find(x => x.id === entryId);
  const orgProp = libraryProposal(e, {scope: 'organisation', organizationId: id, organizationTitle: 'Payments guild', contentHash: e.review.contentHash});
  assert.equal(orgProp.library.scope, 'organisation'); assert.equal(orgProp.library.organizationId, id); assert.equal(orgProp.library.contentHash, e.review.contentHash);
  const saved = await api('/api/commands', {revision: again.revision, command: {type: 'realisation.candidate', payload: {...orgProp, reviewed: true}}}); assert.equal(saved.status, 200, JSON.stringify(saved.data));
  const c = saved.data.document.realisation.components.at(-1); assert.deepEqual([c.origin, c.status, c.library.scope, c.library.organizationId, c.library.entryId], ['library', 'candidate', 'organisation', id, entryId]);
  assert.equal(saved.data.document.interfaces.contracts.length, again.document.interfaces.contracts.length, 'no Chapter 8 record');
  // The intruder's own project is untouched, and the pinned entry is not theirs to read through the project either.
  assert.equal((await api('/api/project', null, 'outsider-d')).data.document.workbench?.catalogue?.length ?? 0, 0);
  pass('the organisation library files a component entry (its snapshot, its source), refuses prose, keeps it from members of other organisations and strangers, reviews it independently, releases it signed and pins it into a project: no component is created, proposed or approved by installing, reading changes nothing, and a proposal from the pinned entry saves a candidate with origin library and the organisation');
} finally { env.DB.close(); await rm(dir, {recursive: true, force: true}); }

assert.equal(JSON.stringify(base), before, 'the seed project is unchanged throughout');
console.log(JSON.stringify({suite: 'component library', passed: checks.length, checks}, null, 2));
