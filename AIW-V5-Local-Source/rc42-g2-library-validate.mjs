// rc.10.73.42, group g2-library: D4 and D11 of the handbook gap review (audit/rc41/handbook-review, gaps K-05 and K-06;
// deep-dives library-coverage and component-selection). Each check reproduces one defect and failed on the base commit.
//   D4a A catalogue archetype the project withdrew (or whose catalogue release it withdrew) is neither offered by the
//       chooser and Sol's catalogue reading nor saved by realisation.candidate.
//   D4b An organisation entry reaches a project only through a signed release installed there and still eligible: drafts,
//       approved but unreleased entries and entries withdrawn since are neither offered nor saved.
//   D4c A project library entry is approved by a signed-in person other than its author (who created it, kept ever after)
//       and its last editor (who last changed its title, content or source), as the organisation library asks; an entry
//       saved before rc42 reads both from its history. An agent account or a draft by Sol never approves, and an approval
//       does not change what was reviewed. A package restored here brings no approval: its library entries are drafts,
//       the restorer stands as their author and last editor, and a second signed-in person here approves them before
//       workspace.guidance or workspace.template use them. An installed organisation entry names the organisation's author.
//   D11 The catalogue generator's template text and a kit of another kind never enter a design as if they were the
//       archetype's own: template-marked fields are left as open questions, no wrong-kit part is proposed, a list mixing
//       authored and template items proposes only the authored ones, and nothing of either reaches the component, its
//       checks or the SDD.
// Library content is knowledge: it scores nothing and approves nothing. Run: npm run test:rc42-g2-library
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyEvidenceCommand} from './public/evidence-domain.js';
import {applyKnowledgeCommand, knowledgeImpactStamp} from './public/knowledge-governance.js';
import {applyWorkbenchCommand, previewGuidanceUse, previewGuidanceTemplate} from './public/workbench-domain.js';
import {applyRealisationCommand, components, realisationFindings} from './public/realisation-domain.js';
import {architectureMarkdown} from './public/sdd-architecture.js';
import {catalogue} from './public/catalogue-store.js';
import {CATALOGUE} from './public/catalogue-index.js';
import * as CL from './public/component-library.js';
import * as CS from './public/component-snapshot.js';
import worker from './worker.js';
import {buildRecovery, neutraliseImportedAuthority, IMPORTED_AUTHORITY} from './recovery-service.js';
import {saveStoredProject} from './project-storage.js';
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
  const legacy = {...e, author: undefined, actor: 'architect-a', status: 'approved'}; delete legacy.author; delete legacy.lastEditor; legacy.history = legacy.history.map(({author, lastEditor, ...v}) => v);
  assert.throws(() => ws({...q, workbench: {...q.workbench, catalogue: [legacy]}}, {...payload, id, status: 'approved'}, 'architect-a'), /second signed-in person|another signed-in person/i, 'an entry saved before rc42 reads its author from its history');
});

// D4c, review 2: one author and one last editor, as the organisation library keeps them (organization-service.js review).
const SECOND = /second signed-in person|another signed-in person/i;
const libraryProject = () => { let p = applyEvidenceCommand(base, {type: 'evidence.source', payload: {title: 'Reusable intake', excerpt: 'A reviewed intake service.', location: 'Library note 1', status: 'Unconfirmed'}}, at).document; p = applyEvidenceCommand(p, {type: 'evidence.source', payload: {title: 'Other evidence', excerpt: 'An unrelated note.', location: 'Library note 2', status: 'Unconfirmed'}}, at).document; return p; };
const ws = (q, raw, actor, options) => applyWorkbenchCommand(q, {type: 'workspace.catalogue', payload: raw}, at, actor, options).document;
const entryOf = (q, id) => q.workbench.catalogue.find(x => x.id === id);
await check('D4c review 2: the author stays its creator after anyone else\'s edit, the last editor is who last changed its title, content or source, and neither approves; a third person does', () => {
  let p = libraryProject(); const [s1, s2] = p.coauthoring.sources.slice(-2).map(s => s.id);
  const payload = {kind: 'control', title: 'Audit preservation', content: 'Preserve the original audit event', owner: 'Architecture', sourceId: s1, reviewed: true, reviewNote: 'Checked for this project'};
  p = ws(p, {...payload, status: 'draft'}, 'creator-a'); const id = p.workbench.catalogue.at(-1).id;
  const typo = {...payload, id, content: payload.content + '.'}, t = ws(p, {...typo, status: 'draft'}, 'editor-b');
  assert.throws(() => ws(t, {...typo, status: 'approved'}, 'creator-a'), SECOND, 'the creator cannot approve once another person has corrected a typo');
  assert.throws(() => ws(t, {...typo, status: 'approved'}, 'editor-b'), SECOND, 'the last editor cannot approve');
  assert.deepEqual([entryOf(p, id).author, entryOf(p, id).lastEditor], ['creator-a', 'creator-a'], 'the creator is author and last editor');
  assert.deepEqual([entryOf(t, id).author, entryOf(t, id).lastEditor, entryOf(t, id).actor], ['creator-a', 'editor-b', 'editor-b'], 'another person\'s edit keeps the creator as author and makes them the last editor');
  const ok = entryOf(ws(t, {...typo, status: 'approved'}, 'reviewer-c'), id);
  assert.deepEqual([ok.status, ok.author, ok.lastEditor, ok.actor, ok.revision], ['approved', 'creator-a', 'editor-b', 'reviewer-c', 3], 'a third person approves; author, last editor and approver are all kept');
  const retitled = {...payload, id, title: 'Audit event preservation'}, r = ws(p, {...retitled, status: 'draft'}, 'editor-b');
  assert.throws(() => ws(r, {...retitled, status: 'approved'}, 'creator-a'), SECOND, 'the creator cannot approve after a title edit by another person');
  assert.throws(() => ws(r, {...retitled, status: 'approved'}, 'editor-b'), SECOND, 'the person who changed the title cannot approve');
  const owned = {...payload, id, owner: 'Platform'}, o = ws(p, {...owned, status: 'draft'}, 'editor-b');
  assert.deepEqual([entryOf(o, id).author, entryOf(o, id).lastEditor], ['creator-a', 'creator-a'], 'changing only the owner edits neither title, content nor source');
  assert.throws(() => ws(o, {...owned, status: 'approved'}, 'creator-a'), SECOND, 'the creator cannot approve after another person re-saved it');
  assert.throws(() => ws(p, {...payload, id, sourceId: s2, status: 'approved'}, 'editor-b'), SECOND, 'an approval does not swap the evidence it approves');
  const swapped = ws(p, {...payload, id, sourceId: s2, status: 'draft'}, 'editor-b');
  assert.equal(entryOf(swapped, id).lastEditor, 'editor-b', 'changing the source makes its editor the last editor');
  assert.throws(() => ws(swapped, {...payload, id, sourceId: s2, status: 'approved'}, 'editor-b'), SECOND);
  assert.equal(entryOf(ws(swapped, {...payload, id, sourceId: s2, status: 'approved'}, 'reviewer-c'), id).status, 'approved');
  assert.throws(() => ws(ws(t, {...typo, status: 'approved'}, 'reviewer-c'), {...typo, status: 'approved', reviewNote: 'Re-approved by its creator'}, 'creator-a'), SECOND, 'the creator cannot re-approve it later');
});
await check('D4c review 2: an entry saved before rc42 reads its author (its first saver) and last editor (who saved its current title, content and source) from its history', () => {
  let p = libraryProject(); const sourceId = p.coauthoring.sources.at(-2).id;
  const payload = {kind: 'control', title: 'Audit preservation', content: 'Preserve the original audit event', owner: 'Architecture', sourceId, reviewed: true, reviewNote: 'Checked for this project'};
  const legacy = q => ({...q, workbench: {...q.workbench, catalogue: q.workbench.catalogue.map(({author, lastEditor, ...e}) => ({...e, history: (e.history || []).map(({author, lastEditor, ...v}) => v)}))}});
  p = legacy(ws(p, {...payload, status: 'draft'}, 'creator-a')); const id = p.workbench.catalogue.at(-1).id;
  const owned = legacy(ws(p, {...payload, id, owner: 'Platform', status: 'draft'}, 'saver-b'));
  assert.equal(entryOf(owned, id).author, undefined, 'the fixture is in the shape saved before rc42');
  assert.throws(() => ws(owned, {...payload, id, owner: 'Platform', status: 'approved'}, 'creator-a'), SECOND, 'its creator cannot approve after another person re-saved only the owner');
  const byB = entryOf(ws(owned, {...payload, id, owner: 'Platform', status: 'approved'}, 'saver-b'), id);
  assert.deepEqual([byB.status, byB.author, byB.lastEditor], ['approved', 'creator-a', 'creator-a'], 'a re-save that changed no text does not make its saver the last editor');
  const edited = legacy(ws(p, {...payload, id, content: payload.content + '.', status: 'draft'}, 'saver-b'));
  assert.throws(() => ws(edited, {...payload, id, content: payload.content + '.', status: 'approved'}, 'creator-a'), SECOND, 'its creator cannot approve');
  assert.throws(() => ws(edited, {...payload, id, content: payload.content + '.', status: 'approved'}, 'saver-b'), SECOND, 'who last changed its content cannot approve');
  const c = entryOf(ws(edited, {...payload, id, content: payload.content + '.', status: 'approved'}, 'reviewer-c'), id);
  assert.deepEqual([c.status, c.author, c.lastEditor, c.actor], ['approved', 'creator-a', 'saver-b', 'reviewer-c']);
});
await check('D4c review 2: a project library approval restored from a package is history: the entry is a draft that neither guidance nor a template uses until a second signed-in person here approves it', () => {
  let p = libraryProject(); const sourceId = p.coauthoring.sources.at(-2).id, plan = p.runtime.plans[0];
  const runbook = {kind: 'runbook', title: 'Restore method', content: 'Validate the retained backup hash before restoring service.', owner: 'Operations', sourceId, reviewed: true, reviewNote: 'Checked for this project', reviewAfter: '2030-01-01'};
  const narrative = {kind: 'document-template', title: 'Design review narrative', content: JSON.stringify({summary: 'A source-backed draft narrative', scope: 'Explicit scope for this review'}), owner: 'Architecture', sourceId, reviewed: true, reviewNote: 'Checked chapter fields'};
  p = ws(p, {...runbook, status: 'draft'}, 'mallory'); const rid = p.workbench.catalogue.at(-1).id; p = ws(p, {...runbook, id: rid, status: 'approved'}, 'mallory-alt');
  p = ws(p, {...narrative, status: 'draft'}, 'mallory'); const tid = p.workbench.catalogue.at(-1).id; p = ws(p, {...narrative, id: tid, status: 'approved'}, 'mallory-alt');
  const raw = {entryId: rid, targetId: plan.id, adaptation: 'Inspect the signed backup manifest; restore in an isolated test zone.', owner: 'Recovery lead', reason: 'This stateful service uses retained snapshots.'};
  const use = (q, actor) => applyWorkbenchCommand(q, {type: 'workspace.guidance', payload: {...raw, stamp: previewGuidanceUse(q, raw).stamp, reviewed: true}}, at, actor).document;
  assert.equal(use(p, 'mallory').runtime.plans.find(x => x.id === plan.id).runbook, raw.adaptation, 'the fixture is usable on the workbench it came from');
  previewGuidanceTemplate(p, tid);
  const restored = neutraliseImportedAuthority(structuredClone(p), at, 'mallory'), e = entryOf(restored, rid);
  assert.throws(() => previewGuidanceUse(restored, raw), /reviewed guidance/, 'restored guidance is not used before a review here');
  assert.throws(() => use(restored, 'mallory'), /reviewed guidance/, 'workspace.guidance refuses a restored approval');
  assert.throws(() => previewGuidanceTemplate(restored, tid), /Review current source-backed guidance/, 'workspace.template refuses a restored approval');
  assert.deepEqual([e.status, e.actor, e.importedActor, e.importedAuthor, e.importedLastEditor, e.author, e.lastEditor, e.reviewNote], ['draft', null, 'mallory-alt', 'mallory', 'mallory', 'mallory', 'mallory', runbook.reviewNote], 'the imported approver and authors are kept as history; the restorer stands as author and last editor; the review note is kept');
  assert.deepEqual([e.importedApproval?.actor, e.importedApproval?.reviewNote, e.importedApproval?.authority], ['mallory-alt', runbook.reviewNote, IMPORTED_AUTHORITY], 'the imported approval is recorded as history');
  assert.equal(entryOf(restored, tid).status, 'draft');
  assert.throws(() => ws(restored, {...runbook, id: rid, status: 'approved'}, 'mallory'), SECOND, 'the restorer cannot approve it alone');
  const approved = ws(ws(restored, {...runbook, id: rid, status: 'approved'}, 'carol'), {...narrative, id: tid, status: 'approved'}, 'carol');
  assert.equal(use(approved, 'mallory').runtime.plans.find(x => x.id === plan.id).runbook, raw.adaptation, 'a second signed-in person here approves it, and it is used');
  previewGuidanceTemplate(approved, tid);
  assert.equal(entryOf(neutraliseImportedAuthority({...structuredClone(p), workspace: {...p.workspace, restoredBy: 'mallory'}}, at), rid).author, 'mallory', 'the restore\'s own restorer is used when none is passed');
  const bare = neutraliseImportedAuthority({workbench: structuredClone(p.workbench)}, at, 'mallory');
  assert.ok(bare.workbench.catalogue.every(x => x.status === 'draft' && x.author === 'mallory'), 'a package without a final review brings no library approval either');
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
await check('D11 review 2: a list mixing authored and template items proposes only the authored ones (prerequisites, obligations, kit parts)', () => {
  const r = record(REL), key = REL.toLowerCase() + '-';
  const own = {archetype: 'Ledger tables', canonicalKind: 'LogicalService', key: 'synthetic-ledger', name: 'Ledger tables', properties: {category: 'data'}, required: true, responsibility: 'Hold the payment ledger'};
  const generic = {archetype: 'Store', canonicalKind: 'LogicalService', key: key + 'store', name: r.name + ' Store', properties: {category: 'data'}, required: true, responsibility: 'Generic store responsibility'};
  const mixed = {...structuredClone(r), prerequisites: ['A schema owner is named.', ...r.prerequisites], obligations: [{id: 'OBL-REL-1', title: 'Back up the ledger tables', description: 'Daily backups with a tested restore.', mandatory: true}, ...r.obligations], componentKit: [own, generic, ...r.componentKit]};
  const g = CS.archetypeProposal(mixed), text = JSON.stringify(g);
  for (const s of [...GENERATED(r), generic.name, generic.responsibility]) assert.ok(!text.includes(s), 'a template item of a mixed list is proposed: ' + s);
  assert.ok(g.assumptions.includes('A schema owner is named.'), 'the authored prerequisite is proposed');
  assert.deepEqual(g.proposed.obligations.map(o => o.title), ['Back up the ledger tables'], 'only the authored obligation is proposed');
  assert.ok(g.boundary.includes('Ledger tables: Hold the payment ledger'), 'the authored kit part is proposed');
  assert.deepEqual(g.proposed.contracts, [], 'no interface kit comes with a kit that is not wholly the archetype\'s own');
  assert.deepEqual(CS.templateFields(mixed).filter(f => ['prerequisites', 'obligations', 'componentKit'].includes(f)), [], 'a mixed list is not marked template as a whole');
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

await check('D4c review 2 through the service: a package restored by one person brings no approved library entry and the restorer cannot approve one alone; an installed organisation entry names the organisation\'s author', async () => {
  const dir = await mkdtemp(tmpdir() + '/aiw-rc42-g2r2-'), env = {DB: localDatabase(dir + '/test.sqlite'), FILES: localFiles(dir + '/files'), ASSETS: {fetch: () => new Response('ok')}};
  const api = async (path, raw, actor) => { const response = await worker.fetch(new Request('https://aiw.test' + path, {headers: {'oai-authenticated-user-id': actor, Origin: 'https://aiw.test', ...(raw ? {'Content-Type': 'application/json'} : {})}, ...(raw ? {method: 'POST', body: JSON.stringify(raw)} : {})}), env); let data = null; try { data = await response.json(); } catch { data = null; } return {status: response.status, data}; };
  try {
    // On another workbench: 'mallory' files a runbook and 'mallory-alt' approves it; 'ghost' files a draft control.
    let p = libraryProject(); const sourceId = p.coauthoring.sources.at(-2).id, plan = p.runtime.plans[0];
    const runbook = {kind: 'runbook', title: 'Restore method', content: 'Validate the retained backup hash before restoring service.', owner: 'Operations', sourceId, reviewed: true, reviewNote: 'Checked for this project', reviewAfter: '2030-01-01'};
    const control = {kind: 'control', title: 'Audit preservation', content: 'Preserve the original audit event', owner: 'Architecture', sourceId, reviewed: true, reviewNote: 'Checked'};
    p = ws(p, {...runbook, status: 'draft'}, 'mallory'); const rid = p.workbench.catalogue.at(-1).id; p = ws(p, {...runbook, id: rid, status: 'approved'}, 'mallory-alt');
    p = ws(p, {...control, status: 'draft'}, 'ghost'); const cid = p.workbench.catalogue.at(-1).id;
    const originId = 'origin-rc42-library', origin = 'origin-owner';
    await env.DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,1,?)').bind(origin, originId, JSON.stringify({...p, id: originId}), at).run();
    assert.ok((await saveStoredProject(env, origin, originId, {...p, id: originId}, 1, at, new Map())).meta.changes);
    const pack = await buildRecovery(env, {owner: origin, actor: origin, role: 'owner'}, originId);
    const previewed = await api('/api/recovery?action=preview', {package: pack}, 'mallory'); assert.equal(previewed.status, 200, JSON.stringify(previewed.data));
    const restored = await api('/api/recovery?action=restore', {package: pack, hash: previewed.data.hash, name: 'Restored library', reviewed: true}, 'mallory'); assert.equal(restored.status, 201, JSON.stringify(restored.data));
    const pid = restored.data.id, state = async () => (await api('/api/project?project=' + pid, null, 'mallory')).data;
    const command = async (type, payload) => api('/api/commands?project=' + pid, {revision: (await state()).revision, command: {type, payload}}, 'mallory');
    const raw = {entryId: rid, targetId: plan.id, adaptation: 'Inspect the signed backup manifest; restore in an isolated test zone.', owner: 'Recovery lead', reason: 'This stateful service uses retained snapshots.'};
    let res = await command('workspace.guidance', {...raw, stamp: 'any', reviewed: true}); assert.equal(res.status, 400, 'restored guidance is not applied: ' + JSON.stringify(res.data)); assert.match(res.data.error, /reviewed guidance/);
    res = await command('workspace.catalogue', {...control, id: cid, status: 'approved'}); assert.equal(res.status, 400, 'the restorer cannot approve an entry another identity is said to have written: ' + JSON.stringify(res.data)); assert.match(res.data.error, SECOND);
    res = await command('workspace.catalogue', {...runbook, id: rid, status: 'approved'}); assert.equal(res.status, 400, 'the restorer cannot re-approve the restored approval alone'); assert.match(res.data.error, SECOND);
    let s = await state(); const r = entryOf(s.document, rid), c = entryOf(s.document, cid);
    assert.ok(s.document.workbench.catalogue.every(e => e.status === 'draft'), 'nothing restored is approved');
    assert.deepEqual([r.status, r.actor, r.author, r.lastEditor, r.importedAuthor, r.importedApproval?.actor], ['draft', null, 'mallory', 'mallory', 'mallory', 'mallory-alt'], 'the restored approval is history and the restorer stands as author and last editor');
    assert.deepEqual([c.status, c.author, c.lastEditor, c.importedAuthor], ['draft', 'mallory', 'mallory', 'ghost'], 'an imported author is history too');
    assert.equal(entryOf(ws(s.document, {...runbook, id: rid, status: 'approved'}, 'carol'), rid).status, 'approved', 'a second signed-in person approves it');

    // An organisation entry filed by 'editor-c', reviewed by 'reviewer-b' and installed by 'editor-a' names its author.
    const org = await api('/api/organizations?action=create', {title: 'Payments guild', purpose: 'Shared guidance'}, 'editor-a'); assert.equal(org.status, 201); const lib = '/api/organizations?organization=' + org.data.id + '&action=';
    for (const [actorId, role] of [['editor-c', 'editor'], ['reviewer-b', 'reviewer']]) assert.equal((await api(lib + 'members', {actorId, role}, 'editor-a')).status, 200);
    const filed = await api(lib + 'library', {kind: 'control', title: 'Audit preservation', content: 'Preserve the original audit event', conditions: 'Where audit events are kept.', limitations: 'A synthetic entry.', source: {location: 'Synthetic note 1', passage: 'Preserve the original audit event.', revision: 'r1'}}, 'editor-c'); assert.equal(filed.status, 200, JSON.stringify(filed.data));
    const entry = (await api(lib + 'library', null, 'editor-a')).data.entries.find(x => x.id === filed.data.id);
    assert.equal((await api(lib + 'review', {id: entry.id, revision: entry.revision, outcome: 'approved', reviewed: true, rationale: 'Checked', evidence: 'Compared with the source'}, 'reviewer-b')).status, 200);
    const release = (await api(lib + 'releases', {title: 'Controls 1', entryIds: [entry.id], reviewed: true}, 'editor-a')).data.release;
    const mine = (await api('/api/project', null, 'editor-a')).data; const installed = await api(lib + 'install', {revision: mine.revision, releaseId: release.id, reviewed: true}, 'editor-a'); assert.equal(installed.status, 200, JSON.stringify(installed.data));
    const pinned = (await api('/api/project', null, 'editor-a')).data.document.workbench.catalogue.find(e => e.organization?.entryId === entry.id);
    assert.deepEqual([pinned.status, pinned.author, pinned.lastEditor, pinned.actor], ['approved', 'editor-c', 'editor-c', 'editor-a'], 'the organisation\'s author and last editor are named, not the installer');
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
