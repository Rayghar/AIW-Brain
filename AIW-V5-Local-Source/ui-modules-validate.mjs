// The workbench panels that had no test (audit F2-21): restore/import (recovery-ui.js), object discussions
// (discussion-ui.js), revising a saved alternative (alternative-editor.js) and organisation guidance
// (organization-ui.js), each driven through its real dialog against the real Worker and an in-memory SQLite.
// Each dialog is the shared primitive (dialog.js): the page behind is inert, required fields are checked
// inline before anything is sent, a refusal from the server lands in the dialog, and Escape closes it with
// focus back on the opener. Needs happy-dom (a pinned development dependency). Run: npm run test:ui-modules
import assert from 'node:assert/strict';
import {pathToFileURL, fileURLToPath} from 'node:url';
const {Window} = await import(process.env.AIW_DOM_MODULE || 'happy-dom');
const root = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '');
// Main-frame navigation is off: a restore that moves to the new project only changes location.href.
const w = new Window({url: 'https://aiw.test/?chapter=4&tab=work', width: 1440, height: 900, settings: {navigation: {disableMainFrameNavigation: true}}});
for (const key of ['window', 'document', 'history', 'location', 'localStorage', 'CustomEvent', 'Event', 'KeyboardEvent', 'FormData', 'Node', 'Element', 'HTMLElement', 'SVGElement', 'MutationObserver', 'ResizeObserver', 'navigator', 'CSS'])
  if (w[key] !== undefined) Object.defineProperty(globalThis, key, {value: key === 'window' ? w : w[key], configurable: true, writable: true});
for (const key of ['matchMedia', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) globalThis[key] = w[key].bind(w);
w.document.body.innerHTML = '<div id="app"><main><button type="button" id="opener">Open</button></main></div><div id="toast"></div>';
const {default: worker} = await import(pathToFileURL(root + '/worker.js'));
const {localDatabase} = await import(pathToFileURL(root + '/local-db.js'));
const files = new Map(), env = {DB: localDatabase(':memory:'), FILES: {async put(k, v) { files.set(k, v); }, async get(k) { return files.has(k) ? {text: async () => files.get(k), arrayBuffer: async () => new TextEncoder().encode(files.get(k)).buffer} : null; }, async delete(k) { files.delete(k); }}, ASSETS: {fetch: () => new Response('asset')}};
const requests = [];
globalThis.fetch = (path, options = {}) => { requests.push(String(path)); return worker.fetch(new Request(new URL(path, 'https://aiw.test'), {...options, headers: {...options.headers, 'oai-authenticated-user-id': 'ui-modules-test', Origin: 'https://aiw.test'}}), env); };
const errors = []; w.addEventListener('error', (e) => errors.push(e.message));
const checks = [], pass = (n) => { checks.push(n); console.log('PASS', n); };
const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)];
const waitFor = async (fn, message) => { for (let i = 0; i < 200; i++) { const v = fn(); if (v) return v; await new Promise((r) => setTimeout(r, 15)); } throw Error('Timed out: ' + message + ' · ' + (q('dialog[open] [role=alert]')?.textContent || '')); };
const submit = (form) => form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
const openDialog = () => q('dialog[open]');
const escape = () => openDialog().dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
const alertText = () => openDialog()?.querySelector('[role=alert]:not([hidden])')?.textContent || '';

const {createProjectStore} = await import(pathToFileURL(root + '/public/project-store.js'));
const store = createProjectStore(); await store.load();
assert.equal(window.aiwProjectStore, store);
const api = async (path, body) => { const r = await fetch(path, body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {}); const d = await r.json(); if (!r.ok) throw Error(d.error); return d; };

// 1. Restore or import: the file is required inline; the preview shows the package; restoring needs the
// acknowledgement (refused by the server, shown in the dialog); with it, a new project is created and the page
// moves to it.
{
  const {importProject} = await import(pathToFileURL(root + '/public/recovery-ui.js'));
  const pack = await (await fetch('/api/recovery?action=export')).text();
  // A recovery package is NDJSON entries, its manifest last (round 12, GR-STO-03: recovery-package.js); one that fits a
  // request is sent whole by the dialog.
  assert.equal(JSON.parse(pack.trim().split('\n').at(-1)).schema, 'aiw.recovery.v2', 'the recovery export is a package of entries, its manifest last');
  const before = (await api('/api/projects')).projects.length;
  q('#opener').focus(); importProject();
  const d = openDialog(); assert.ok(d, 'the import dialog opened');
  assert.equal(q('#app').hasAttribute('inert'), true, 'the page behind the dialog is inert');
  const form = d.querySelector('form'), sent = requests.length;
  submit(form);
  assert.equal(requests.length, sent, 'nothing is sent without a file');
  assert.equal(form.elements.file.getAttribute('aria-invalid'), 'true', 'the missing file is announced beside the field');
  const dt = new w.DataTransfer(); dt.items.add(new w.File([pack], 'AIW_Recovery.ndjson', {type: 'application/x-ndjson'}));
  form.elements.file.files = dt.files; form.elements.file.dispatchEvent(new Event('change', {bubbles: true}));
  submit(form);
  await waitFor(() => d.querySelector('[data-preview] h3'), 'restore preview');
  assert.match(d.querySelector('[data-preview]').textContent, /\d+ objects · \d+ relationships/);
  assert.equal(form.querySelector('button[type=submit]').textContent, 'Restore as a new project');
  submit(form);
  await waitFor(() => alertText(), 'refusal without the acknowledgement');
  assert.equal((await api('/api/projects')).projects.length, before, 'no project was created without the acknowledgement');
  form.elements.name.value = 'Restored through the dialog'; form.elements.reviewed.checked = true;
  submit(form);
  await waitFor(() => /[?&]project=/.test(location.href), 'move to the restored project');
  const projects = (await api('/api/projects')).projects;
  assert.equal(projects.length, before + 1); assert.ok(projects.some((p) => p.name === 'Restored through the dialog'));
  assert.ok(location.href.includes('project=' + encodeURIComponent(projects.find((p) => p.name === 'Restored through the dialog').id)));
  // The dialog closes once the project is restored (round 4, A: in the shell the new project then opens in place).
  assert.equal(openDialog(), null, 'the dialog closes once the project is restored'); assert.equal(document.activeElement, q('#opener'), 'focus returned to the opener');
  history.replaceState({}, '', '/?chapter=4&tab=work');
  pass('Restore/import: required file inline, preview, refusal without acknowledgement, restore to a new project, the dialog closed and focus returned');
}

// 2. Object discussion: a required title is announced inline; a saved discussion reopens with its thread; a
// response is saved with its acknowledgement.
{
  const {objectDiscussion} = await import(pathToFileURL(root + '/public/discussion-ui.js'));
  const object = store.value.document.logical.responsibilities[0];
  q('#opener').focus(); await objectDiscussion(object.id);
  let d = openDialog(); assert.match(d.getAttribute('aria-label'), new RegExp(object.title + ' · Discussion'));
  assert.match(d.textContent, /No discussion on this object yet/);
  const create = d.querySelector('form[data-create]'), sent = requests.length;
  submit(create);
  assert.equal(requests.length, sent, 'an empty discussion is not sent');
  assert.equal(create.elements.title.getAttribute('aria-invalid'), 'true');
  create.elements.title.value = 'Who owns replay of uncertain outcomes?'; create.elements.text.value = 'The boundary says never replay; confirm the owner of the investigation.';
  submit(create);
  d = await waitFor(() => openDialog()?.querySelector('form[data-thread]') && openDialog(), 'the discussion thread');
  assert.match(d.textContent, /Who owns replay of uncertain outcomes\?/);
  const reply = d.querySelector('form[data-thread]');
  reply.elements.text.value = 'Settlement investigation owns it; recorded in the boundary.'; reply.elements.reviewed.checked = true;
  submit(reply);
  await waitFor(() => openDialog()?.textContent.includes('Settlement investigation owns it'), 'the saved response');
  const saved = await api('/api/discussions?object=' + encodeURIComponent(object.id));
  assert.equal(saved.threads.length, 1); assert.ok(saved.threads[0].events.some((e) => e.text.includes('Settlement investigation owns it')));
  escape(); assert.equal(openDialog(), null);
  pass('Object discussion: inline required title, thread saved and reopened, response saved with its acknowledgement');
}

// 3. Revising a saved alternative: the revision is previewed, refused without the acknowledgement, and saved as
// revision 2 of the draft with the edited value; the working design is unchanged.
{
  const {previewWorkingChange} = await import(pathToFileURL(root + '/public/workbench-domain.js'));
  const {reviseAlternative} = await import(pathToFileURL(root + '/public/alternative-editor.js'));
  const group = store.value.document.logical.groups[0];
  const commands = [{type: 'logical.group', payload: {id: group.id, title: group.title + ' (alternative)', purpose: group.purpose}}];
  const stamp = previewWorkingChange(store.value.document, commands).stamp;
  await store.command({type: 'workspace.alternative', payload: {commands, stamp, reviewed: true, reason: 'Compare a narrower grouping.', title: 'Narrower grouping'}});
  const alternative = store.value.document.workbench.alternatives.at(-1);
  assert.equal(alternative.status, 'draft'); assert.equal(alternative.revision, 1);
  q('#opener').focus(); reviseAlternative(alternative.id);
  const d = openDialog(), form = d.querySelector('form');
  const titleField = [...form.querySelectorAll('textarea')].find((t) => t.value === group.title + ' (alternative)');
  assert.ok(titleField, 'the proposed title is editable');
  titleField.value = group.title + ' (revised alternative)';
  submit(form);
  await waitFor(() => d.querySelector('[data-save]'), 'the revised preview');
  assert.match(d.querySelector('[data-result]').textContent, /revised alternative/);
  d.querySelector('[data-save]').click();
  await waitFor(() => alertText(), 'refusal without the acknowledgement');
  d.querySelector('[data-reviewed]').checked = true; d.querySelector('[data-save]').click();
  await waitFor(() => !openDialog(), 'the revision saved and the dialog closed');
  const revised = store.value.document.workbench.alternatives.find((a) => a.id === alternative.id);
  assert.equal(revised.revision, 2); assert.equal(revised.commands[0].payload.title, group.title + ' (revised alternative)');
  assert.equal(store.value.document.logical.groups[0].title, group.title, 'the working design is unchanged');
  assert.equal(document.activeElement, q('#opener'));
  pass('Alternative revision: preview, refusal without acknowledgement, revision 2 saved, working design unchanged, focus returned');
}

// 4. Organisation guidance: the list opens; creating a workspace needs its name inline and opens its library.
{
  const {openOrganizations} = await import(pathToFileURL(root + '/public/organization-ui.js'));
  q('#opener').focus(); await openOrganizations();
  let d = openDialog(); assert.equal(d.getAttribute('aria-label'), 'Organisation guidance');
  d.querySelector('[data-org-action="create"]').click();
  d = await waitFor(() => qa('dialog[open]').at(-1)?.querySelector('form') && qa('dialog[open]').at(-1), 'the create form');
  const form = d.querySelector('form');
  form.elements.title.value = 'Payments architecture guild'; form.elements.purpose.value = 'Shared payment patterns and controls.';
  submit(form);
  d = await waitFor(() => qa('dialog[open]').find((x) => x.getAttribute('aria-label') === 'Payments architecture guild'), 'the new library');
  assert.match(d.textContent, /Draft → independent review → signed release/);
  const listed = await api('/api/organizations?action=list');
  assert.ok(listed.organizations.some((o) => o.title === 'Payments architecture guild'));
  while (openDialog()) escape();
  assert.equal(q('#app').hasAttribute('inert'), false, 'the page is live again');
  pass('Organisation guidance: list, create a workspace, open its library, close with the page live again');
}

// 5. The component library (round 11, workstream F): "Add to the library" files a component's snapshot as a draft
//    entry of kind component; "From the library" lists the entry and the twenty catalogue archetypes and hands the
//    chapter a proposal, not a record; the project is unchanged until the chapter's reviewed path saves it.
{
  const {addToLibrary, fromLibrary} = await import(pathToFileURL(root + '/public/component-library-ui.js'));
  const p = store.value.document, target = p.realisation.components[0], before = JSON.stringify(p.realisation);
  q('#opener').focus(); await addToLibrary({store, id: target.id});
  let d = openDialog(); assert.equal(d.getAttribute('aria-label'), 'Add to the library');
  const form = d.querySelector('#cl-add-form'); assert.ok(form, 'the form has its id');
  assert.equal(form.elements.title.value, target.title); assert.ok([...form.elements.scope.options].some((o) => o.value === 'project'));
  assert.match(d.textContent, /No record is copied and no secret is kept/);
  const sent = requests.length; form.elements.title.value = ''; submit(form);
  assert.equal(requests.length, sent, 'nothing is sent without a title'); assert.equal(form.elements.title.getAttribute('aria-invalid'), 'true', 'the missing title is announced beside the field');
  form.elements.title.value = 'Reusable ' + target.title; form.elements.owner.value = 'Platform team'; form.elements.reviewNote.value = 'Filed through the dialog.';
  submit(form); await waitFor(() => !openDialog(), 'the entry filed and the dialog closed');
  const entry = store.value.document.workbench.catalogue.find((e) => e.kind === 'component');
  assert.ok(entry, 'an entry of kind component'); assert.equal(entry.status, 'draft'); assert.equal(entry.title, 'Reusable ' + target.title);
  const snapshot = JSON.parse(entry.content); assert.equal(snapshot.schema, 'aiw.component-snapshot.v1'); assert.equal(snapshot.origin.component.id, target.id);
  assert.equal(JSON.stringify(store.value.document.realisation), before, 'filing writes no component');
  let proposed = null;
  q('#opener').focus(); await fromLibrary({store, propose: (prop) => { proposed = prop; }});
  d = openDialog(); assert.equal(d.getAttribute('aria-label'), 'From the library');
  assert.equal(d.querySelectorAll('[data-cl-archetype]').length, 20, 'the twenty catalogue archetypes');
  assert.equal(d.querySelectorAll('[data-cl-entry="' + entry.id + '"]').length, 1, 'the project entry');
  await waitFor(() => d.querySelector('[data-cl-orgs] .brain-note, [data-cl-orgs] article'), 'the organisation libraries were read');
  d.querySelector('[data-cl-entry="' + entry.id + '"] [data-cl-action="propose"]').click();
  await waitFor(() => proposed, 'the proposal was handed over');
  assert.deepEqual([proposed.key, proposed.origin, proposed.status, proposed.library.entryId], ['library', 'library', 'candidate', entry.id]);
  assert.ok(proposed.proposed.contracts.length >= 1 || proposed.proposed.needs.length >= 1, 'contracts and needs travel as proposals');
  await waitFor(() => !openDialog(), 'the chooser closed');
  assert.equal(JSON.stringify(store.value.document.realisation), before, 'proposing writes nothing');
  proposed = null; q('#opener').focus(); await fromLibrary({store, propose: (prop) => { proposed = prop; }});
  d = openDialog(); d.querySelector('[data-cl-archetype="ARCH-CACHE-CAPABILITY"] [data-cl-action="propose"]').click();
  await waitFor(() => proposed, 'the archetype proposal was handed over');
  assert.deepEqual([proposed.key, proposed.origin, proposed.library.archetypeId, proposed.kind], ['archetype', 'archetype', 'ARCH-CACHE-CAPABILITY', 'store']);
  assert.equal(proposed.authority.scoringCalibrated, false);
  await waitFor(() => !openDialog(), 'the chooser closed');
  assert.equal(JSON.stringify(store.value.document.realisation), before, 'an archetype proposal writes nothing either');
  pass('Component library: add to the library files a draft component entry with the snapshot; from the library lists it with the twenty archetypes and hands over a proposal (origin library or archetype), and nothing is written');
}

// 6. Organisation knowledge releases (round 12, workstream K, GR-DOM-09): the library's "Knowledge releases" dialog
//    lists none at first and offers an administrator the open project's active release to publish; publishing and
//    pinning each need the person's review (the refusal lands in the form); the published release lists who verified
//    each claim, and pinning it through its form makes its claims eligible in the open project while the project's own
//    knowledge is unchanged. The release is synthetic: one candidate topic of the domain pack, imported by this account
//    and verified by a second synthetic account, written to storage as that person's session would.
{
  const {openOrganizations} = await import(pathToFileURL(root + '/public/organization-ui.js'));
  const {applyKnowledgeCommand, knowledgeStamp, organizationReleases, releasedClaims} = await import(pathToFileURL(root + '/public/knowledge-governance.js'));
  const {readStoredProject, saveStoredProject} = await import(pathToFileURL(root + '/project-storage.js'));
  const {importDomainCandidates} = await import(pathToFileURL(root + '/scripts/import-domain-candidates.mjs'));
  const {domainTopics} = await import(pathToFileURL(root + '/public/domain-knowledge.js'));
  const {readFileSync} = await import('node:fs');
  const ME = 'ui-modules-test', AT = new Date().toISOString(), named = (label) => qa('dialog[open]').find((x) => x.getAttribute('aria-label') === label);
  const formAlert = (x) => x.querySelector('[role=alert]:not([hidden])')?.textContent || '';
  await store.load();
  const id = store.value.document.id, row = await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(ME, id).first(), held = await readStoredProject(env, ME, row.document);
  const pack = JSON.parse(readFileSync(root + '/candidate-sets/core-banking-domain-candidates.json', 'utf8'));
  const made = importDomainCandidates(held.document, pack, {ids: ['CBK-TOPIC-POSTING-INTEGRITY'], at: AT, actor: ME}), claimIds = made.created.map((x) => x.claimId);
  const REVIEW = {reviewed: true, reviewer: 'Synthetic second reviewer', reason: 'Synthetic test of the dialog; not a real knowledge approval.'};
  let doc = made.document;
  for (const claimId of claimIds) doc = applyKnowledgeCommand(doc, {type: 'knowledge.review', payload: {...REVIEW, id: claimId, decision: 'verified', sourceChecked: true, rightsChecked: true, conditionsChecked: true}}, AT, 'ui-modules-second').document;
  doc = applyKnowledgeCommand(doc, {type: 'knowledge.release', payload: {...REVIEW, title: 'Synthetic posting topic', claimIds}}, AT, ME).document;
  const own = doc.knowledge.releases.at(-1).id;
  doc = applyKnowledgeCommand(doc, {type: 'knowledge.activate', payload: {...REVIEW, id: own, stamp: knowledgeStamp(doc)}}, AT, ME).document;
  assert.ok((await saveStoredProject(env, ME, id, doc, row.revision, AT, held.keys)).meta.changes, 'the project\'s own release is stored');
  await store.load();
  const ownKnowledge = [store.value.document.knowledge.sources.length, store.value.document.knowledge.claims.length];
  assert.deepEqual(domainTopics(store.value.document).map((t) => t.id), ['posting-integrity'], 'the project offers its own released topic');
  q('#opener').focus(); await openOrganizations();
  [...openDialog().querySelectorAll('article')].find((a) => a.querySelector('h3')?.textContent === 'Payments architecture guild').querySelector('[data-org-action="open"]').click();
  let d = await waitFor(() => named('Payments architecture guild'), 'the library');
  d.querySelector('[data-org-action="knowledge"]').click();
  d = await waitFor(() => named('Organisation knowledge releases'), 'the knowledge releases');
  assert.match(d.textContent, /No knowledge release yet/);
  d.querySelector('[data-org-action="publish-knowledge"]').click();
  let f = await waitFor(() => named('Publish knowledge for the organisation'), 'the publish form'), form = f.querySelector('form');
  assert.deepEqual([...form.elements.releaseId.options].map((o) => o.value), [own], 'the open project\'s active release is offered');
  form.elements.title.value = 'Banking knowledge for the guild'; form.elements.reason.value = 'Shared by the guild\'s banking projects.';
  submit(form);
  assert.match(await waitFor(() => formAlert(f), 'refusal without the publisher\'s review'), /confirm you reviewed it/);
  form.elements.reviewed.checked = true; submit(form);
  d = await waitFor(() => named('Organisation knowledge releases')?.querySelector('article') && named('Organisation knowledge releases'), 'the published release listed');
  assert.match(d.querySelector('article h3').textContent, /Banking knowledge for the guild/);
  assert.match(d.textContent, /Verified by Synthetic second reviewer/, 'with who verified each claim');
  d.querySelector('[data-org-action="pin"]').click();
  f = await waitFor(() => named('Pin Banking knowledge for the guild'), 'the pin form'); form = f.querySelector('form');
  assert.match(f.textContent, /count against none of the project's knowledge limits/);
  form.elements.reason.value = 'This project designs a core-banking platform.'; form.elements.reviewer.value = 'Synthetic project reviewer';
  submit(form);
  assert.match(await waitFor(() => formAlert(f), 'refusal without the person\'s review'), /Review this release/);
  assert.equal(organizationReleases(store.value.document).length, 0, 'nothing is pinned without the review');
  form.elements.reviewed.checked = true; submit(form);
  await waitFor(() => organizationReleases(store.value.document).length === 1 && !named('Pin Banking knowledge for the guild'), 'the release pinned and the project reloaded');
  const p = store.value.document, pinned = organizationReleases(p)[0];
  assert.equal(pinned.assurance.eligible, true, 'verified against the organisation\'s signature on load');
  assert.ok(p.knowledge.pins.includes(pinned.id));
  const orgClaims = releasedClaims(p).filter((h) => h.release.organizationId);
  assert.equal(orgClaims.length, claimIds.length); assert.ok(orgClaims.every((h) => h.eligible), 'its claims are eligible in the project');
  assert.deepEqual([p.knowledge.sources.length, p.knowledge.claims.length], ownKnowledge, 'the project\'s own knowledge is as it was');
  while (openDialog()) escape();
  assert.equal(q('#app').hasAttribute('inert'), false, 'the page is live again');
  pass('Organisation knowledge releases: none listed at first; the open project\'s active release offered to the administrator; publishing and pinning each refused without the person\'s review, in the form; the release listed with who verified each claim; pinned through its form, its claims eligible and the project\'s own knowledge unchanged');
}

assert.deepEqual(errors, [], 'no window errors');
console.log(`\n${checks.length} checks passed.`);
await w.happyDOM.close();
process.exit(0);
