// The field spark's popover, the fill action and the Proposals list in a DOM without a browser (round 2, I2-12; round 5):
// sparks on free-text fields only (none on numbers, selects, links or checkboxes, none for a read-only role); a
// popover with three bands always in the same order (Stated, Inferred, Sol draft), each offer citing the
// record it came from; Accept fills the open form only and records the suggestion in the form's pending
// solSuggestions, with a visible marker and a footer line, and nothing is saved; editing flips the marker, clearing
// drops it; Dismiss and No record nothing; Escape closes the popover and leaves the editor open; "Fill empty fields
// from your project" fills only empty fields from the first band, lists them and offers one Undo; Sol drafts only on
// an explicit click, packet first, with the run id and prompt pin, the exact "not connected" line otherwise, and none
// for owners or numbers; Proposals (the list that was the Co-author panel) names each row's source and where it would
// go, opens the record's editor with the field filled and the provenance pending, records a dismissal only with a
// one-line reason, sets other rows aside for the session only, and Ask Sol's "Put this in <field>" does the same with a
// saved answer. Needs happy-dom (a pinned development dependency). Run: npm run test:coauthor
import assert from 'node:assert/strict';
const {Window} = await import(process.env.AIW_DOM_MODULE || 'happy-dom');
import {pathToFileURL, fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '');
const w = new Window({url: 'https://aiw.test/?chapter=9&tab=work', width: 1440, height: 900});
for (const key of ['window', 'document', 'history', 'location', 'localStorage', 'CustomEvent', 'Event', 'KeyboardEvent', 'MouseEvent', 'FormData', 'Node', 'Element', 'HTMLElement', 'SVGElement', 'MutationObserver', 'ResizeObserver', 'navigator', 'CSS']) if (w[key] !== undefined) Object.defineProperty(globalThis, key, {value: key === 'window' ? w : w[key], configurable: true, writable: true});
for (const key of ['matchMedia', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) globalThis[key] = w[key].bind(w);
document.body.innerHTML = '<div id="app"><button type="button" id="opener">Open</button></div><div id="toast"></div>';
const checks = [];
const pass = n => { checks.push(n); console.log('PASS', n); };
const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));
// A read that waits for the state it reads (round 12, G, GR-TST-09): polled every 5 ms up to a bound, then a failure that
// names what never came, so a machine busy with other suites cannot outrun a fixed tick.
const until = async (read, what, ms = 15000) => { const end = Date.now() + ms; for (;;) { const v = read(); if (v) return v; if (Date.now() > end) throw new assert.AssertionError({message: `waited ${ms} ms for ${what}`}); await tick(5); } };
const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
const click = el => { assert.ok(el, 'an element to click'); el.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true})); };
const type = (el, value) => { el.value = value; el.dispatchEvent(new Event('input', {bubbles: true})); };

// The server, stubbed: Sol's status, its field context and draft, its saved runs. Every request is logged.
const requests = [];
let solConfigured = false;
const json = (body, status = 200) => new w.Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});
const RUN = '0f2a6c1e-5b7d-4c3e-9a1b-2d3e4f5a6b7c', ASK = '1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d', REVIEW_RUN = '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b';
// Ask Sol's saved answers (rc41): about SEC-001, the accepted one and, newer, one its source checks withheld, whose text
// is AIW's own fallback (intelligence-provider.js groundedFallback); about SEC-002, two longer than its title allows.
const WITHHELD = '2b3c4d5e-6f7a-4b2c-9d3e-4f5a6b7c8d9e', LONG = '3c4d5e6f-7a8b-4c3d-8e4f-5a6b7c8d9e0f', TOO_LONG = '4d5e6f7a-8b9c-4d4e-9f5a-6b7c8d9e0f1a';
const ANSWERS = {
  [WITHHELD]: {objectId: 'oauth', mode: 'author', status: 'completed', createdAt: '2026-10-01T09:30:00Z', result: {summary: 'The generated explanation was withheld because its claims did not pass the source checks.', passage: 'The saved object “Identity & consent” remains the working context (S1). No original evidence excerpt was supplied for this context.'}, groundingReview: {accepted: false, issues: ['The passage names a mechanism no source records.']}},
  [ASK]: {objectId: 'oauth', mode: 'design', status: 'completed', createdAt: '2026-10-01T09:00:00Z', result: {summary: 'Check identity and mandate at the payment entry.', passage: 'Check the caller’s identity and the payer’s mandate at the payment entry, before the instruction is accepted (S1).'}, packet: {brainReceipt: {instructions: {promptVersion: 'sol-generate-1', sha256: 'fedcba9876543210'}}}, groundingReview: {accepted: true}},
  [LONG]: {objectId: 'audit', mode: 'design', status: 'completed', createdAt: '2026-10-01T08:00:00Z', result: {summary: 'Write every change to a payment instruction to an append-only trail, with who made it and when (S1). Keep each entry with the instruction’s end-to-end reference, so one payment can be followed from receipt to settlement (S1).', passage: ''}, groundingReview: {accepted: true}},
  [TOO_LONG]: {objectId: 'audit', mode: 'design', status: 'completed', createdAt: '2026-10-01T07:00:00Z', result: {summary: 'Write every change to a payment instruction, every refusal of one and every change to a payer’s mandate to an append-only trail that names who made the change, when it was made and from which channel (S1).', passage: ''}, groundingReview: {accepted: true}}
};
globalThis.fetch = async (url, init = {}) => {
  const path = new URL(String(url), 'https://aiw.test').pathname, body = init.body ? JSON.parse(init.body) : null;
  requests.push({path, method: init.method || 'GET', body});
  if (path === '/api/intelligence/status') return json(solConfigured ? {configured: true, provider: 'OpenAI', model: 'mock-sol', missing: []} : {configured: false, provider: 'OpenAI', providerId: 'openai', model: 'gpt-4.1-mini', modelDefaulted: true, missing: ['OPENAI_API_KEY']});
  if (path === '/api/intelligence/reasonings') return json({runs: []});
  if (path === '/api/intelligence/field-context') return json({packet: {stamp: 'a1b2c3d4e5f6a7b8c9d0', sources: [{ref: 'S1', kind: 'record', title: 'SEC-001 Identity & consent'}, {ref: 'S2', kind: 'quality-driver', title: 'QD-005 Reject an unauthorised instruction'}], omissions: [], brainReceipt: {instructions: {promptVersion: 'sol-field-1', sha256: 'abcdef0123456789'}}}, configuration: {configured: true}});
  if (path === '/api/intelligence/field') return json({id: RUN, status: 'completed', mode: 'field', request: {command: body.command, field: body.field, recordId: body.recordId}, result: {field: body.field, value: 'Verify the bearer token and the payer’s mandate before accepting the instruction.', basis: 'It follows from S1 and QD-005 (S2).', sourceRefs: ['S1', 'S2']}, instructions: {promptVersion: 'sol-field-1', sha256: 'abcdef0123456789'}, groundingReview: {accepted: true, packetStamp: 'a1b2c3d4e5f6a7b8c9d0'}});
  if (path === '/api/intelligence/review-runs') return json({runs: new URL(String(url), 'https://aiw.test').searchParams.get('chapter') === '4' ? [{id: REVIEW_RUN, createdAt: '2026-10-02T08:00:00Z', model: 'mock-sol', request: {chapter: 4}, result: {findings: [{id: 'F1', elementId: 'api', severity: 'fix', title: 'Name the owner of LR-001', reason: 'The record names no owner (S2).', sourceRefs: ['S2']}]}, instructions: {promptVersion: 'sol-review-1', sha256: 'abcdef0123456789'}, packetStamp: 'p1', accepted: true}] : []});
  if (path === '/api/intelligence/field-runs') return json({runs: [{id: RUN, createdAt: '2026-10-01T10:00:00Z', request: {command: 'security.control', field: 'telemetry', recordId: 'oauth'}, result: {field: 'telemetry', value: 'Count refused instructions per caller and alert on a rise.', basis: 'From S1 and S2.', sourceRefs: ['S1', 'S2']}, instructions: {promptVersion: 'sol-field-1', sha256: 'abcdef0123456789'}, packetStamp: 'a1b2c3d4e5f6', accepted: true}]});
  const object = new URL(String(url), 'https://aiw.test').searchParams.get('object'), id = new URL(String(url), 'https://aiw.test').searchParams.get('id');
  if (path === '/api/intelligence/runs' && object) return json({runs: Object.entries(ANSWERS).filter(([, a]) => a.objectId === object).map(([id, a]) => ({id, objectId: a.objectId, mode: a.mode, status: a.status}))});
  if (path === '/api/intelligence/runs' && ANSWERS[id]) return json({id, ...ANSWERS[id]});
  return json({error: 'Not stubbed: ' + path}, 404);
};

const {seedProject} = await import(pathToFileURL(root + '/public/requirements-domain.js'));
const {withFinalReview} = await import(pathToFileURL(root + '/public/review-domain.js'));
const {fieldsFor, fieldHTML} = await import(pathToFileURL(root + '/public/record-fields.js'));
const {openDialog, closeDialog} = await import(pathToFileURL(root + '/public/dialog.js'));
const {sparkStudio, pendingSuggestions} = await import(pathToFileURL(root + '/public/field-spark.js'));
const {proposalsSlot, mountProposals} = await import(pathToFileURL(root + '/public/coauthor-ui.js'));
const {solLoad, reviewSectionHTML} = await import(pathToFileURL(root + '/public/brain-reasoning-ui.js'));
const p = withFinalReview(seedProject());
const commands = [];
const store = {value: {document: p, revision: 1}, role: 'owner', async command(c) { commands.push(c); if (c.type === 'coauthor.disposition') { const d = structuredClone(this.value.document); d.workspace = {...(d.workspace || {}), coauthor: {version: 1, dispositions: [...(d.workspace?.coauthor?.dispositions || []), {...c.payload, outcome: 'dismissed'}]}}; this.value = {document: d, revision: this.value.revision + 1}; } return {selected: null}; }};
window.aiwProjectStore = store;

// Two small studios built like the real ones: their editors render the record descriptors (record-fields.js) and open
// through the shared dialog primitive; each makes the one sparkStudio call.
let editing = null;
const formHTML = (command, formId, r, names) => `<form id="${formId}">${fieldsFor(command).filter(d => names.includes(d.name)).map(d => fieldHTML(d, r[d.name], {options: d.name === 'requirementIds' ? p.artefacts.filter(a => a.type === 'requirement').map(a => [a.id, a.title]) : d.name === 'groupId' ? p.logical.groups.map(g => [g.id, g.title]) : d.name === 'targetIds' ? [['rest', 'Payment initiation'], ['api-pod', 'Payment service']] : d.options})).join('')}<div class="l-dialog-actions"><button type="submit" class="btn primary">Save</button></div></form>`;
function editResponsibility(id) { const r = id ? p.logical.responsibilities.find(x => x.id === id) : {requirementIds: ['REQ-004'], title: 'Hold uncertain outcomes'}; editing = id || null; openDialog({className: 'dialog l-dialog logical-dialog', label: 'Responsibility', html: formHTML('logical.responsibility', 'l-responsibility-form', r, ['title', 'purpose', 'boundary', 'owner', 'groupId', 'source', 'requirementIds', 'confirmed'])}); }
// The control editor draws its targets beside the described fields, as security-ui.js does (targetChecks).
function editControl(id) { const c = p.security.controls.find(x => x.id === id); editing = id; openDialog({className: 'dialog l-dialog sec-dialog', label: 'Control', html: formHTML('security.control', 'sec-control-form', c, ['title', 'purpose', 'owner', 'enforcement', 'mechanism', 'failureResponse', 'telemetry', 'verificationPlan', 'category']).replace('<div class="l-dialog-actions">', `<fieldset class="l-checks"><legend>Protected objects</legend>${['rest', 'api-pod', 'posting-api'].map(t => `<label class="l-checkbox"><input type="checkbox" name="targetIds" value="${t}" ${c.targetIds.includes(t) ? 'checked' : ''}>${t}</label>`).join('')}</fieldset><div class="l-dialog-actions">`)}); }
function editPlan(id) { const r = p.runtime.plans.find(x => x.id === id); editing = id; openDialog({className: 'dialog l-dialog rt-dialog', label: 'Plan', html: formHTML('runtime.plan', 'rt-editor', r, ['title', 'owner', 'minReady', 'maxReplicas', 'scalingPolicy', 'recoveryPlan', 'monitoring'])}); }
sparkStudio({store, dialog: '.logical-dialog', recordId: () => editing, editors: {'logical.responsibility': editResponsibility}});
sparkStudio({store, dialog: '.sec-dialog', recordId: () => editing, editors: {'security.control': editControl}});
sparkStudio({store, dialog: '.rt-dialog', recordId: () => editing, editors: {'runtime.plan': editPlan}});
const dialogOpen = () => q('dialog[open]') || q('dialog');
const closeAll = () => { for (const d of qa('dialog')) closeDialog(d, {restoreFocus: false}); };
const spark = field => dialogOpen().querySelector(`[data-spark-for="${field}"]`);
const pop = () => dialogOpen().querySelector('.spark-pop');
const bands = () => [...pop().querySelectorAll('[data-spark-band]')].map(b => b.dataset.sparkBand);
await solLoad('bank-payment');

// 1. Sparks on free-text fields only; three bands in order; offers cite their record.
{
  q('#opener').focus(); editResponsibility('api'); await tick();
  assert.deepEqual(qa('dialog [data-spark]').map(b => b.dataset.sparkFor), ['title', 'purpose', 'boundary', 'owner', 'source'], 'free-text fields only: no spark on the group select, the requirement checkboxes or the review tick');
  assert.equal(spark('purpose').getAttribute('aria-label'), 'Suggestions for What does it do?');
  assert.equal(spark('purpose').classList.contains('live'), false); await tick(5);
  assert.equal(spark('purpose').classList.contains('live'), true, 'live where the rules have something to offer');
  assert.equal(spark('title').classList.contains('live'), false, 'never live for nothing');
  const purpose = dialogOpen().querySelector('[name="purpose"]');
  assert.equal(document.getElementById(purpose.getAttribute('aria-labelledby')).textContent, 'What does it do?', 'the control is still named by its caption alone');
  click(spark('purpose'));
  assert.ok(pop(), 'the popover opens beside the field');
  assert.deepEqual(bands(), ['project', 'confirm', 'sol'], 'Stated, Inferred, Sol draft — always in this order');
  assert.match(pop().querySelector('[data-spark-band="project"]').textContent, /^Stated[\s\S]*rule-based[\s\S]*no model consulted[\s\S]*The service shall accept a valid instruction[\s\S]*REQ-001\s*The description of REQ-001/);
  assert.match(pop().querySelector('[data-spark-band="confirm"]').textContent, /^Inferred[\s\S]*rule-based[\s\S]*your answer decides/);
  assert.match(pop().querySelector('[data-spark-band="sol"]').textContent, /^Sol draft/);
  assert.equal(pop().querySelector('[data-spark-sol-status]').textContent, 'Sol is not connected in this workspace. Ask your workspace administrator to connect a provider; rule-based guidance stands on its own meanwhile.', 'the one honest status line, word for word: the selected provider and exactly what is missing');
  assert.equal(pop().querySelector('[data-spark-act="prepare"]'), null, 'no draft button without a provider');
  assert.equal(spark('purpose').getAttribute('aria-expanded'), 'true');
  pass('sparks sit on free-text fields only and light up only where the rules offer something; the popover shows Stated, Inferred and Sol draft in that order, each offer citing its record, and the exact "not connected" line');
}
// 2. Accept fills the form only; the pending provenance, marker and footer; editing and clearing.
{
  click(pop().querySelector('[data-spark-band="project"] [data-spark-act="accept"]'));
  const purpose = dialogOpen().querySelector('[name="purpose"]');
  assert.equal(purpose.value, 'The service shall accept a valid instruction and return a stable request reference.');
  assert.equal(pop(), null, 'the popover closes');
  const hidden = dialogOpen().querySelector('input[type=hidden][name="solSuggestions"]');
  const [entry] = JSON.parse(hidden.value);
  assert.deepEqual({...entry, acceptedAt: typeof entry.acceptedAt}, {field: 'purpose', source: 'project', suggestionId: entry.suggestionId, ref: 'REQ-001', acceptedBy: '', acceptedAt: 'string', edited: false});
  assert.equal(new FormData(dialogOpen().querySelector('form')).get('solSuggestions'), hidden.value, 'the chapter’s own form reading carries it with the record');
  assert.equal(dialogOpen().querySelector('[data-spark-mark="purpose"]').textContent, 'Stated · REQ-001');
  assert.equal(purpose.classList.contains('spark-accepted'), true);
  assert.equal(dialogOpen().querySelector('[data-spark-pending]').textContent, '1 field carries a suggestion. It is saved only when you save this record.');
  assert.equal(commands.length, 0, 'nothing is saved');
  type(purpose, purpose.value + ' Edited.');
  assert.equal(pendingSuggestions(dialogOpen().querySelector('form'))[0].edited, true);
  assert.equal(dialogOpen().querySelector('[data-spark-mark="purpose"]').textContent, 'Stated · REQ-001 · edited');
  type(purpose, '');
  assert.equal(dialogOpen().querySelector('[name="solSuggestions"]'), null, 'cleared, the suggestion is no longer carried');
  assert.equal(dialogOpen().querySelector('[data-spark-mark]'), null);
  assert.equal(dialogOpen().querySelector('[data-spark-pending]'), null);
  pass('Accept fills the field in the open form, records the suggestion in its pending solSuggestions with a marker and a footer line, and saves nothing; editing marks it edited; clearing the field drops it');
}
// 3. Confirm (Yes/No), Dismiss, Escape and Tab.
{
  click(spark('boundary'));
  const confirm = pop().querySelector('[data-spark-band="confirm"]');
  assert.match(confirm.textContent, /What is explicitly outside this responsibility\?[\s\S]*Outside this responsibility:[\s\S]*GRP-001/, 'the guide’s question with the implied value and its source');
  click(confirm.querySelector('[data-spark-act="no"]'));
  assert.match(pop().querySelector('[data-spark-band="confirm"]').textContent, /Nothing to confirm/, 'No removes it from the popover');
  assert.equal(dialogOpen().querySelector('[name="solSuggestions"]'), null, 'and records nothing');
  click(pop().querySelector('[data-spark-act="close"]'));
  click(spark('owner'));
  const owners = pop().querySelectorAll('[data-spark-band="confirm"] [data-spark-offer]').length;
  click(pop().querySelector('[data-spark-band="confirm"] [data-spark-act="yes"]'));
  const owner = pendingSuggestions(dialogOpen().querySelector('form')).find(e => e.field === 'owner');
  assert.equal(owner.source, 'confirm'); assert.ok(owners >= 1);
  // Dismiss asks why, in one line, and records a coauthor.disposition with the project (round 11): the offer is not
  // made again when the editor is reopened.
  click(spark('purpose'));
  click(pop().querySelector('[data-spark-band="project"] [data-spark-act="dismiss"]'));
  const box = pop().querySelector('[data-spark-dismiss]');
  assert.ok(box && document.activeElement === box.querySelector('[data-spark-reason]'), 'Dismiss asks why, with the cursor in the one-line reason');
  assert.equal(commands.length, 0, 'nothing is recorded until the reason is given');
  box.querySelector('[data-spark-reason]').value = 'short';
  click(box.querySelector('[data-spark-act="record-dismissal"]')); await tick();
  assert.match(pop().querySelector('[data-spark-dismiss] [role=alert]').textContent, /at least 8 characters/); assert.equal(commands.length, 0, 'not without a reason');
  pop().querySelector('[data-spark-reason]').value = 'REQ-001 describes the request path, not this responsibility.';
  click(pop().querySelector('[data-spark-act="record-dismissal"]')); await tick(5);
  assert.deepEqual(commands.map(c => c.type), ['coauthor.disposition']);
  assert.deepEqual([commands[0].payload.command, commands[0].payload.field, commands[0].payload.source, commands[0].payload.ref, commands[0].payload.recordId, commands[0].payload.reason], ['logical.responsibility', 'purpose', 'project', 'REQ-001', 'api', 'REQ-001 describes the request path, not this responsibility.']);
  assert.match(pop().querySelector('[data-spark-band="project"]').textContent, /Nothing your project records offers/, 'the dismissed offer leaves the band');
  closeAll(); editResponsibility('api'); await tick(5);
  assert.equal(spark('purpose').classList.contains('live'), false, 'reopened, the dismissed offer is not made again: the dismissal is kept with the project');
  commands.length = 0;
  click(spark('boundary'));
  const first = pop().querySelector('[data-spark-act]'), last = [...pop().querySelectorAll('button')].at(-1);
  last.focus(); pop().dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true}));
  assert.equal(document.activeElement, first, 'Tab stays inside the popover');
  pop().dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
  assert.equal(pop(), null, 'Escape closes the popover');
  assert.ok(q('dialog[open]') || q('dialog'), 'and leaves the editor open');
  assert.equal(document.activeElement, spark('boundary'), 'focus returns to its spark');
  pass('Confirm asks the guide’s question with the implied value: Yes accepts it as a confirmation, No records nothing; Dismiss asks why in one line and records it with the project, so the offer is not made again on reopening; the popover keeps Tab inside and Escape closes it alone, returning focus to its spark');
  closeAll();
  // A reopened editor shows the provenance its record already carries (read again on open), in the one vocabulary;
  // a superseded entry is not shown.
  const api = store.value.document.logical.responsibilities.find(r => r.id === 'api');
  api.provenance = {suggestions: [{field: 'boundary', source: 'project', ref: 'GRP-001', command: 'logical.responsibility', acceptedBy: 'architect', acceptedAt: '2026-10-01T10:00:00.000Z', edited: false}, {field: 'owner', source: 'sol', runId: RUN, command: 'logical.responsibility', acceptedBy: 'architect', acceptedAt: '2026-10-02T10:00:00.000Z', edited: true}, {field: 'source', source: 'confirm', ref: 'REQ-001', command: 'logical.responsibility', acceptedBy: 'architect', acceptedAt: '2026-09-30T10:00:00.000Z', edited: false, superseded: true}]};
  editResponsibility('api'); await tick(5);
  assert.deepEqual(qa('dialog [data-spark-provenance]').map(m => [m.dataset.sparkProvenance, m.textContent]), [['boundary', 'Stated · GRP-001 · accepted 2026-10-01'], ['owner', 'Sol draft · run 0f2a6c1e · accepted 2026-10-02 · edited']], 'the record’s accepted provenance under its fields, the superseded one left out');
  delete api.provenance;
  pass('a reopened editor shows the provenance its record carries, under each field, in the one vocabulary (stated · inferred · Sol draft · edited)');
  closeAll();
}
// 4. On open, one line says what the project offers for the empty fields (round 11); Fill puts the copied values in
// the empty fields only, from the first band, lists them and offers one Undo.
{
  // Round 12 (G, GR-TST-09): the fill bar is read once it stands with its offers counted, not after a fixed tick.
  editResponsibility(null);
  const bar = await until(() => dialogOpen()?.querySelector('form [data-spark-fillbar] [data-spark-offer-count]')?.closest('[data-spark-fillbar]'), 'the fill bar with its offers counted');
  const form = dialogOpen().querySelector('form');
  assert.equal(bar.getAttribute('role'), 'status');
  assert.match(bar.textContent, /^4 suggestions from your project · 4 empty fieldsFillFill copies the proposed values into 2 empty fields\. Use the suggestion button beside a field to review its question\. Nothing is saved until you save this record\.$/, 'said without a click: every empty field’s offers counted, and what Fill will do');
  assert.equal(bar.querySelector('[data-spark-offer-count]').dataset.sparkOfferCount, '4');
  assert.equal(bar.querySelector('[data-spark-act="fill"]').textContent, 'Fill');
  const title = form.querySelector('[name="title"]').value;
  click(bar.querySelector('[data-spark-act="fill"]'));
  const report = form.querySelector('[data-spark-fill-report]');
  assert.match(report.textContent, /Filled 2 empty fields from your project: What does it do\? \(REQ-004\), Source \/ project evidence \(REQ-004\)\. Nothing is saved until you save\./);
  assert.equal(form.querySelector('[name="title"]').value, title, 'a field that holds text is never filled');
  assert.equal(form.querySelector('[name="owner"]').value, '', 'nor from the Confirm band');
  assert.deepEqual(pendingSuggestions(form).map(e => [e.field, e.source, e.ref]), [['purpose', 'project', 'REQ-004'], ['source', 'project', 'REQ-004']]);
  assert.equal(form.querySelector('[data-spark-fillbar]'), null);
  assert.equal(commands.length, 0);
  click(report.querySelector('[data-spark-act="undo-fill"]'));
  assert.equal(form.querySelector('[name="purpose"]').value, ''); assert.equal(form.querySelector('[name="source"]').value, '');
  assert.deepEqual(pendingSuggestions(form), [], 'Undo takes the values and their provenance back');
  assert.equal(form.querySelector('[data-spark-fill-report]'), null);
  assert.ok(await until(() => form.querySelector('[data-spark-fillbar]'), 'the fill bar offered again'), 'and the action is offered again');
  pass('on open, one line counts the project’s offers for the empty fields; Fill fills only empty fields from the first band, lists each with its record, saves nothing, and one Undo takes them back');
  closeAll();
}
// 5. Sol drafts: no spark on numbers, no draft for owners, an explicit click, the packet first, run id and pin.
{
  // The status line names the selected provider and exactly what the server says is missing (round 11): never the
  // other provider's settings, whichever provider is selected.
  const {SOL, solStatusLine, solAdminDetail} = await import(pathToFileURL(root + '/public/brain-reasoning-ui.js'));
  SOL.config = {configured: false, provider: 'Anthropic', providerId: 'anthropic', model: 'claude-opus-5-5', modelDefaulted: true, missing: ['ANTHROPIC_API_KEY']};
  assert.equal(solStatusLine(), 'Sol is not connected in this workspace. Ask your workspace administrator to connect a provider; rule-based guidance stands on its own meanwhile.');
  assert.equal(solAdminDetail(), 'Anthropic is the selected provider; set ANTHROPIC_API_KEY on the server.', 'the administrator’s detail names the provider and the variable (round 26, R26-W-29)');
  SOL.config = {configured: false, provider: 'Not set', providerId: 'gemini', model: null, modelDefaulted: false, missing: ['a valid AIW_LLM_PROVIDER (anthropic or openai)']};
  assert.equal(solStatusLine(), 'Sol is not connected in this workspace. Ask your workspace administrator to connect a provider; rule-based guidance stands on its own meanwhile.');
  assert.equal(solAdminDetail(), 'No provider is selected; set a valid AIW_LLM_PROVIDER (anthropic or openai) on the server.');
  SOL.config = {configured: true, provider: 'OpenAI', providerId: 'openai', model: 'gpt-4.1-mini', modelDefaulted: true, missing: []};
  assert.equal(solStatusLine({short: true}), 'Sol · OpenAI · gpt-4.1-mini', 'a key alone: connected with the default model');
  pass('the status line names the selected provider and exactly the variable the server reports missing, for either provider, and never the other provider’s settings');
  solConfigured = true; SOL.projectId = null; SOL.config = null; await solLoad('bank-payment');
  editPlan('run-001'); await tick();
  assert.deepEqual(qa('dialog [data-spark]').map(b => b.dataset.sparkFor), ['title', 'owner', 'scalingPolicy', 'recoveryPlan', 'monitoring'], 'no spark on replicas');
  click(spark('owner'));
  assert.match(pop().querySelector('[data-spark-band="sol"]').textContent, /Sol does not draft owners, identifiers, evidence, sources or the basis of a number/);
  assert.equal(pop().querySelector('[data-spark-act="prepare"]'), null);
  closeAll();
  // On open, the packet for the record's primary fields (its first two draftable long-text fields) is prepared on the
  // server, nothing sent to a model (round 11): the first click in those sparks sends. Other fields prepare on click.
  requests.length = 0;
  editControl('oauth'); await tick(10);
  assert.deepEqual(requests.filter(r => r.path.startsWith('/api/intelligence/field')).map(r => [r.path, r.body.field]), [['/api/intelligence/field-context', 'purpose'], ['/api/intelligence/field-context', 'enforcement']], 'opening the editor prepares the primary fields’ packets and sends nothing');
  click(spark('purpose'));
  assert.ok(pop().querySelector('[data-spark-packet]') && pop().querySelector('[data-spark-act="send"]') && !pop().querySelector('[data-spark-act="prepare"]'), 'a primary field’s spark shows the prepared packet: the first click sends');
  assert.equal(requests.filter(r => r.path === '/api/intelligence/field').length, 0, 'and nothing was sent to a model');
  click(pop().querySelector('[data-spark-act="close"]'));
  requests.length = 0;
  click(spark('mechanism'));
  const before = requests.filter(r => r.path.startsWith('/api/intelligence/field')).length;
  assert.equal(before, 0, 'opening the popover of another field calls nothing');
  click(pop().querySelector('[data-spark-act="prepare"]')); await tick(5);
  assert.deepEqual(requests.filter(r => r.path.startsWith('/api/intelligence/field')).map(r => r.path), ['/api/intelligence/field-context'], 'Draft with Sol prepares the packet; nothing is sent to Sol yet');
  const ctx = requests.find(r => r.path === '/api/intelligence/field-context').body;
  assert.deepEqual([ctx.command, ctx.field, ctx.recordId, ctx.links.targetIds], ['security.control', 'mechanism', 'oauth', ['rest', 'api-pod']]);
  assert.ok(!('minReady' in ctx.values) && Object.keys(ctx.values).every(k => ['title', 'purpose', 'owner', 'enforcement', 'mechanism', 'failureResponse', 'telemetry', 'verificationPlan'].includes(k)), 'free text only');
  assert.match(pop().querySelector('[data-spark-packet]').textContent, /Sol will read 2 sources for this field, and nothing else:[\s\S]*S1 SEC-001 Identity & consent[\s\S]*Packet a1b2c3d4e5f6 · prompt sol-field-1 · abcdef012345/);
  click(pop().querySelector('[data-spark-act="send"]')); await tick(5);
  const sent = requests.find(r => r.path === '/api/intelligence/field').body;
  assert.match(sent.requestId, /^[a-f0-9-]{36}$/); assert.equal(sent.packetStamp, 'a1b2c3d4e5f6a7b8c9d0', 'sent only as the packet shown');
  assert.match(pop().querySelector('[data-spark-band="sol"]').textContent, /Verify the bearer token[\s\S]*Run 0f2a6c1e-5b7d-4c3e-9a1b-2d3e4f5a6b7c · packet a1b2c3d4e5f6 · prompt sol-field-1 · abcdef012345 · source-checked · draft, not saved/);
  click(pop().querySelector('[data-spark-band="sol"] [data-spark-act="accept"]'));
  const e = pendingSuggestions(dialogOpen().querySelector('form')).find(x => x.field === 'mechanism');
  assert.deepEqual([e.source, e.runId, e.ref], ['sol', RUN, undefined]);
  assert.equal(dialogOpen().querySelector('[data-spark-mark="mechanism"]').textContent, 'Sol draft · not saved · run 0f2a6c1e');
  assert.equal(commands.length, 0);
  // A prepared packet for a form that changed since is prepared again when its spark opens, so what is shown is current.
  closeAll(); requests.length = 0;
  editControl('oauth'); await tick(10);
  type(dialogOpen().querySelector('[name="purpose"]'), 'Changed since the packet was prepared.');
  assert.equal(requests.filter(r => r.path === '/api/intelligence/field-context').length, 2, 'typing prepares nothing by itself');
  click(spark('purpose')); await tick(5);
  const again = requests.filter(r => r.path === '/api/intelligence/field-context');
  assert.equal(again.length, 3, 'the spark opening prepares the packet again for the changed form');
  assert.equal(again.at(-1).body.values.purpose, 'Changed since the packet was prepared.');
  assert.ok(pop().querySelector('[data-spark-act="send"]'), 'and shows it ready to send');
  pass('Sol drafts only on an explicit click: the packet for the primary fields is prepared when the editor opens (nothing sent), prepared again when the form changed, and sent only as shown; the draft shows its run id, packet stamp and prompt pin and is marked "Sol draft · not saved" when accepted; no spark on numbers and no Sol draft for owners');
  closeAll();
}
// 6. Proposals: one list with a source column; a field offer's Accept opens the editor with the field filled, its Set
// aside needs a reason; rows from Sol's panel keep their own controls; a session set-aside records nothing.
{
  const panel = document.createElement('aside'); panel.id = 'brain-panel'; document.body.append(panel);
  const c = {chapter: 9, selected: {id: 'oauth', ref: 'SEC-001'}};
  const task = {id: 'task-protection', source: 'task', what: 'Develop protection', why: 'A guided design of the protection.', where: 'Chapter 9 · a guided task', accept: '<button type="button" class="btn primary" data-brain-action="protection">Start</button>', aside: 'session'};
  const pattern = {id: 'rule-sec-key-authority', source: 'rule', what: 'Authority for the specific instruction', why: 'Identity alone does not explain whether the caller may perform this operation.', where: 'Chapter 9 · previewed on the chapter’s model', accept: '<span data-proposal-native><button type="button" class="btn primary" data-sec-key="authority">Accept…</button></span>', aside: 'session'};
  panel.innerHTML = proposalsSlot(c); await mountProposals(panel, {rows: [pattern, task]}); await tick(5);
  const slot = panel.querySelector('[data-proposals]');
  assert.equal(slot.__view.scope, 'selected', 'selected-object proposals are the initial scope');
  assert.equal(slot.querySelectorAll('[data-proposal]').length, 4, 'chapter-wide rows do not displace selected-object work');
  assert.equal(slot.querySelector(`[data-proposal="answer-${WITHHELD}"]`), null, 'an answer its source checks withheld is not offered for a field (rc41)');
  assert.doesNotMatch(slot.textContent, /generated explanation was withheld/, 'AIW’s own fallback text is never offered as a Sol draft');
  assert.ok([...slot.querySelectorAll('[data-proposal]')].every(x => x.dataset.proposalScope === 'selected'));
  assert.equal(slot.querySelector('.pp-advanced').open, false, 'advanced filters initially leave room for suggestions');
  assert.equal(slot.querySelector('.pp-review-tools').open, false, 'whole-chapter review starts below selected work');
  assert.equal(slot.querySelector('[data-proposal-act=accept]').textContent, 'Preview draft');
  assert.match(slot.querySelector('[data-proposal-act=put]').textContent, /^Open draft for/);
  click(slot.querySelector('[data-proposal-act=scope][data-scope=all]'));
  assert.match(slot.querySelector('[data-proposals-summary]').textContent, /^6 items in Chapter 9: 5 design suggestions · 1 guided task · 0 questions\. 4 directly tied to selected SEC-001; 2 chapter-wide or about other records\.$/);
  const rows = () => [...slot.querySelectorAll('[data-proposal]')];
  assert.deepEqual(rows().map(li => [li.dataset.proposalSource, li.querySelector('.pp-src').textContent, li.querySelector('.pp-what b').textContent]), [['sol', 'Sol', 'Sol’s answer about SEC-001'], ['sol', 'Sol', 'SEC-001 · Detection, evidence, and response ownership'], ['rule', 'Rule', 'SEC-001 · Failure response and accountable exception'], ['rule', 'Rule', 'SEC-001 · Verification plan and expected results'], ['rule', 'Rule', 'Authority for the specific instruction'], ['task', 'Task', 'Develop protection']], 'within each action type selected-object work comes first, with each source named');
  assert.deepEqual([...slot.querySelectorAll('.pp-group h4')].map(x => x.textContent.trim()), ['Design suggestions 5', 'Guided tasks 1'], 'tasks are not presented as design proposals');
  assert.deepEqual(rows().map(li => li.dataset.proposalScope), ['selected', 'selected', 'selected', 'selected', 'chapter', 'chapter'], 'the selected record is distinguished from other chapter work');
  assert.ok(rows().every(li => /^Where it would go\s\S/.test(li.querySelector('.pp-where').textContent)), 'every row says where it would go');
  assert.equal(rows()[1].querySelector('.pp-what small').textContent, 'Sol draft · run 0f2a6c1e · packet a1b2c3d4e5f6 · prompt sol-field-1 · abcdef012345');
  assert.equal(rows()[2].querySelector('.pp-what small').textContent, 'Stated · QD-005');
  assert.ok(rows()[4].querySelector('[data-proposal-native] [data-sec-key="authority"]') && rows()[5].querySelector('[data-brain-action="protection"]'), 'a rule proposal and a task keep the very controls of their own surfaces');
  click(rows()[2].querySelector('[data-proposal-act="accept"]')); await tick(5);
  const form = dialogOpen().querySelector('#sec-control-form');
  assert.equal(form.querySelector('[name="failureResponse"]').value, p.quality.drivers.find(d => d.id === 'QD-005').response, 'the editor opens with the field filled');
  assert.deepEqual(pendingSuggestions(form).map(e => [e.field, e.source, e.ref]), [['failureResponse', 'project', 'QD-005']], 'and the provenance pending');
  assert.match(form.querySelector('[data-spark-prefill]').textContent, /A proposal is in “Failure response and accountable exception” \(Stated · QD-005\)\. Review it; nothing is saved until you save this record\./);
  assert.equal(commands.length, 0, 'the list writes nothing');
  closeAll();
  click(rows()[1].querySelector('[data-proposal-act="edit"]')); await tick(5);
  const solForm = dialogOpen().querySelector('#sec-control-form');
  assert.deepEqual(pendingSuggestions(solForm).map(e => [e.field, e.source, e.runId]), [['telemetry', 'sol', RUN]]);
  assert.equal(document.activeElement, solForm.querySelector('[name="telemetry"]'), 'Open editor puts the cursor in the field');
  closeAll();
  const plan = rows()[3];
  click(plan.querySelector('[data-proposal-act="dismiss"]'));
  const box = plan.querySelector('[data-proposal-dismiss]');
  assert.equal(box.hidden, false);
  box.querySelector('[data-proposal-reason]').value = 'short';
  click(box.querySelector('[data-proposal-act="record-dismissal"]')); await tick();
  assert.match(box.querySelector('[role=alert]').textContent, /at least 8 characters/); assert.equal(commands.length, 0, 'not without a reason');
  box.querySelector('[data-proposal-reason]').value = 'The bank’s test team plans verification separately.';
  click(box.querySelector('[data-proposal-act="record-dismissal"]')); await tick(5);
  assert.deepEqual(commands.map(x => x.type), ['coauthor.disposition']);
  assert.deepEqual(Object.keys(commands[0].payload).sort(), ['command', 'field', 'reason', 'recordId', 'ref', 'source', 'suggestionId']);
  assert.deepEqual([commands[0].payload.field, commands[0].payload.source, commands[0].payload.ref], ['verificationPlan', 'project', 'QD-005']);
  assert.equal(rows().length, 5, 'the dismissed offer leaves the list');
  assert.match(slot.querySelector('.pp-history').textContent, /1 recorded decline in this chapter[\s\S]*SEC-001 · Verification plan and expected results[\s\S]*The bank’s test team plans verification separately/, 'the recorded decline, target and reason remain visible as project history');
  click(slot.querySelector('[data-proposal="task-protection"] [data-proposal-act="aside"]')); await tick();
  assert.equal(rows().length, 4, 'a row set aside leaves the list'); assert.equal(commands.length, 1, 'and nothing is recorded for it');
  assert.match(slot.querySelector('.pp-hidden').textContent, /1 item temporarily hidden/);
  assert.match(slot.querySelector('[data-proposals-summary]').textContent, /0 guided tasks/);
  click(slot.querySelector('.pp-hidden [data-proposal-act="restore"]')); await tick();
  assert.equal(rows().length, 5, 'a hidden native task can be restored in this session');
  click(slot.querySelector('[data-proposal-act="scope"][data-scope="selected"]')); await tick();
  assert.ok(rows().every(li => li.dataset.proposalScope === 'selected'), 'selection scope excludes other chapter records');
  click(slot.querySelector('[data-proposal-act="scope"][data-scope="all"]')); await tick();
  click(slot.querySelector('[data-proposal-act="group"][data-group="task"]')); await tick();
  assert.deepEqual(rows().map(li => li.dataset.proposalSource), ['task'], 'guided tasks have their own filter');
  click(slot.querySelector('[data-proposal-act="group"][data-group="all"]')); await tick();
  slot.querySelector('.pp-source-filter').open = true;
  click(slot.querySelector('[data-proposal-act="filter"][data-source="rule"]')); await tick();
  assert.deepEqual(rows().map(li => li.dataset.proposalSource), ['rule', 'rule'], 'the source filter shows one source');
  assert.equal(slot.querySelector('.pp-source-filter').open, true, 'source controls remain open while changing source');
  click(slot.querySelector('[data-proposal-act="filter"][data-source="all"]')); await tick();
  const search = slot.querySelector('[data-proposal-search]'); search.value = 'authority'; search.dispatchEvent(new Event('input', {bubbles:true})); await tick();
  assert.deepEqual(rows().map(li => li.querySelector('.pp-what b').textContent), ['Authority for the specific instruction'], 'search matches title and rationale');
  assert.equal(document.activeElement?.matches?.('[data-proposal-search]'), false, 'an unfocused programmatic search does not unexpectedly take focus');
  const focusedSearch = slot.querySelector('[data-proposal-search]'); focusedSearch.focus(); focusedSearch.value = 'Failure response'; focusedSearch.dispatchEvent(new Event('input', {bubbles:true})); await tick();
  assert.equal(document.activeElement, slot.querySelector('[data-proposal-search]'), 'typing into search retains the cursor after results redraw');
  assert.deepEqual(rows().map(li => li.querySelector('.pp-what b').textContent), ['SEC-001 · Failure response and accountable exception'], 'multi-word search remains typeable and finds the field offer');
  slot.querySelector('[data-proposal-search]').value = ''; slot.querySelector('[data-proposal-search]').dispatchEvent(new Event('input', {bubbles:true})); await tick();
  pass('Proposals separates suggestions, guided tasks and questions; selected-object scope is accurate, search and source filters are available; field edits still use native commands; durable decline records a reason; session-hidden items can be restored');
  // 7. Ask Sol: "Put this in <field>" for a saved answer about the selected record.
  const ask = rows()[0];
  assert.match(ask.textContent, /Sol’s answer about SEC-001[\s\S]*run 1a2b3c4d · 2026-10-01 09:00 · design · prompt sol-generate-1 · fedcba987654 · proposal only[\s\S]*Check identity and mandate/);
  const select = ask.querySelector('[data-proposal-field]');
  assert.ok(![...select.options].some(o => ['owner', 'evidence'].includes(o.value)), 'never into an owner or evidence');
  select.value = 'mechanism'; select.dispatchEvent(new Event('change', {bubbles: true}));
  assert.equal(ask.querySelector('[data-proposal-field-label]').textContent, 'How the control works');
  click(ask.querySelector('[data-proposal-act="put"]')); await tick(5);
  const putForm = dialogOpen().querySelector('#sec-control-form');
  assert.match(putForm.querySelector('[name="mechanism"]').value, /^Check the caller’s identity and the payer’s mandate/, 'a long field takes the answer’s passage');
  assert.deepEqual(pendingSuggestions(putForm).map(e => [e.field, e.source, e.runId]), [['mechanism', 'sol', ASK]]);
  pass('Ask Sol’s "Put this in <field>" opens the selected record’s editor with the saved answer in the chosen field and provenance source "sol" with its run; owners and evidence are not offered as targets');
  closeAll();
  const longPanel = document.createElement('aside'); document.body.append(longPanel);
  longPanel.innerHTML = proposalsSlot(c); await mountProposals(longPanel, {rows: Array.from({length: 60}, (_, i) => ({id: 'task-large-'+i, source: 'task', what: 'Continue design '+i, where: 'Guided steps', accept: '<button type="button">Continue</button>', aside: 'session'}))}); await tick(5);
  const long = longPanel.querySelector('[data-proposals]');
  click(long.querySelector('[data-proposal-act=scope][data-scope=all]'));
  assert.equal(long.querySelectorAll('[data-proposal]').length, 12, 'large lists render only the first 12');
  assert.match(long.querySelector('[data-proposal-act="more"]').textContent, /Show next 25 of \d+/);
  click(long.querySelector('[data-proposal-act="more"]')); await tick();
  assert.equal(long.querySelectorAll('[data-proposal]').length, 37, 'show more adds a bounded page');
  assert.ok(long.querySelector('[data-proposal-act="more"]'), 'a large list is never expanded to 1000 rows at once');
  longPanel.remove();
  pass('Proposals progressively reveals bounded pages rather than expanding a large chapter list at once');
}
// 7b. rc41: an Ask Sol answer longer than the field is cut after its last whole sentence that fits, never mid-sentence,
// and the editor says it was shortened; one whose first sentence alone is too long is not put in the field at all.
{
  const panel = document.createElement('aside'), sent = commands.length; document.body.append(panel);
  panel.innerHTML = proposalsSlot({chapter: 9, selected: {id: 'audit', ref: 'SEC-002'}}); await mountProposals(panel); await tick(5);
  const slot = panel.querySelector('[data-proposals]'), row = id => slot.querySelector(`[data-proposal="answer-${id}"]`), label = fieldsFor('security.control').find(d => d.name === 'title').label;
  const into = (id, field) => { const select = row(id).querySelector('[data-proposal-field]'); select.value = field; select.dispatchEvent(new Event('change', {bubbles: true})); click(row(id).querySelector('[data-proposal-act="put"]')); };
  const long = ANSWERS[LONG].result.summary, first = long.slice(0, long.indexOf('(S1).') + 5);
  assert.ok(long.length > 160 && first.length <= 160, 'the answer: two sentences, longer together than the title allows (160)');
  into(LONG, 'title'); await tick(5);
  const form = dialogOpen().querySelector('#sec-control-form');
  assert.equal(form.querySelector('[name="title"]').value, first, 'cut after the last whole sentence that fits, never mid-sentence');
  assert.equal(form.querySelector('[data-spark-prefill]').textContent, `A proposal is in “${label}” (Sol draft · run ${LONG.slice(0, 8)}). Shortened from ${long.length} to ${first.length} characters, after the last whole sentence that fits the field; saved, it is recorded as edited, since it is not the whole answer. Review it; nothing is saved until you save this record.`);
  assert.equal(form.querySelector('[data-spark-mark="title"]').textContent, `Sol draft · not saved · run ${LONG.slice(0, 8)} · shortened`);
  assert.deepEqual(pendingSuggestions(form).map(e => Object.keys(e).sort().join()), ['acceptedAt,acceptedBy,edited,field,runId,source,suggestionId'], 'the shortening is said, not carried: the server reads the saved text against the run');
  closeAll();
  const whole = ANSWERS[TOO_LONG].result.summary;
  into(TOO_LONG, 'title'); await tick(5);
  assert.equal(q('dialog[open]'), null, 'no editor opens');
  assert.equal(row(TOO_LONG).querySelector('.pp-note').textContent, `Sol’s answer is ${whole.length} characters and its first sentence alone is longer than “${label}” allows (160), so nothing was put in the field. Choose a longer field, or write it yourself.`);
  assert.equal(commands.length, sent, 'nothing is recorded');
  panel.remove();
  pass('an Ask Sol answer longer than the field is cut after its last whole sentence that fits and the editor says “shortened from N to M characters”; one whose first sentence alone does not fit is not put in the field, and the row says why');
}
// 9. Sol's review (round 5): one state per chapter, read once each; a change redraws the review's own section in place
// and never asks a chapter model to redraw (no aiw:sol-changed), so two chapters drawn side by side cannot feed each other.
{
  const remounts = []; document.addEventListener('aiw:sol-changed', e => remounts.push(e.detail));
  const host = document.createElement('div'); document.body.append(host);
  const read = () => requests.filter(r => r.path === '/api/intelligence/review-runs').length, before = read();
  const draw = () => { host.innerHTML = `<div class="cm-companion" data-c="4">${reviewSectionHTML(p, 4)}</div><div class="cm-companion" data-c="8">${reviewSectionHTML(p, 8)}</div>`; };
  draw(); await tick(20); draw(); draw(); await tick(20);
  assert.equal(read() - before, 2, 'each chapter’s saved reviews are read once, however often the sections are drawn');
  const four = () => host.querySelector('[data-c="4"] [data-sol-review-section="4"]'), eight = () => host.querySelector('[data-c="8"] [data-sol-review-section="8"]');
  assert.match(four().textContent, /Sol · review of Chapter 4[\s\S]*Latest review · run 9e8d7c6b[\s\S]*✕ to fix[\s\S]*Name the owner of LR-001/);
  assert.match(eight().textContent, /Sol · review of Chapter 8[\s\S]*Review this chapter/); assert.ok(!eight().querySelector('[data-sol-finding]'), 'Chapter 8 keeps its own state');
  const companion = four().parentElement;
  click(four().querySelector('[data-sol-review="adopt"]')); await tick();
  assert.equal(four().parentElement, companion, 'the section is replaced in place, inside the same companion');
  assert.match(four().querySelector('.sr-confirm').textContent, /(?:Record it as a Chapter 11 delivery action|This is historical advice: the chapter has changed since Sol reviewed it\.)[\s\S]*on LR-001/);
  if (four().querySelector('[data-sol-historical-reason]')) assert.match(four().querySelector('.sr-confirm').textContent, /Why retain this historical finding\?/);
  click(four().querySelector('[data-sol-review="adopt-cancel"]')); await tick();
  click(four().querySelector('[data-sol-review="aside"]')); await tick();
  assert.ok(!four().querySelector('.sr-group.consider [data-sol-finding]'), 'a finding set aside leaves "To consider"');
  assert.ok(four().querySelector('.sr-group.aside [data-sol-finding]') && !four().querySelector('.sr-group.aside [data-sol-review="adopt"]'), 'and stands under "Set aside" without its actions (round 7)');
  assert.match(four().querySelector('h4 .sr-state').textContent, /nothing left to consider|the chapter changed since/, 'the heading’s state chip reports either the empty queue or the source currency');
  assert.deepEqual(remounts, [], 'no review change asks a chapter model to redraw');
  assert.equal(read() - before, 2, 'and nothing is read again');
  host.remove();
  pass('Sol’s review keeps one state per chapter, reads each chapter’s saved reviews once, and a change (a run read, Adopt…, Set aside) redraws only the review’s own section in place, never a chapter model');
}
// 8. A read-only role gets no spark; the guided design task's fill lists and undoes (window bridge).
{
  store.role = 'viewer';
  editResponsibility('api'); await tick();
  assert.equal(qa('dialog [data-spark]').length, 0, 'a reader gets no spark');
  closeAll(); store.role = 'owner';
  const host = document.createElement('section');
  host.innerHTML = '<details open><summary>Use existing design context</summary></details><label>Boundary<textarea data-dc-answer="boundary">Kept</textarea></label><label>Owner<input data-dc-answer="owner"></label><label>Category<select data-dc-answer="category"><option value=""></option><option value="compute">Compute</option></select></label>';
  document.body.append(host);
  const seen = []; host.addEventListener('input', e => seen.push([e.target.dataset.dcAnswer, e.target.value]));
  const fill = window.aiwFieldSpark.fillControls([{key: 'boundary', label: 'Boundary', value: 'From LR-001', refLabel: 'LR-001'}, {key: 'owner', label: 'Accountable owner', value: 'Channels team', refLabel: 'APP-001'}, {key: 'category', label: 'Capability', value: 'compute', refLabel: 'TC-001'}], {controlFor: k => host.querySelector(`[data-dc-answer="${k}"]`), anchor: host.querySelector('details'), what: 'from the saved design context'});
  assert.deepEqual(fill.filled.map(f => f.key), ['owner', 'category'], 'the answer that holds text is kept');
  assert.deepEqual(seen, [['owner', 'Channels team'], ['category', 'compute']], 'each fill reaches the task as typing would');
  assert.match(host.querySelector('[data-spark-fill-report]').textContent, /Filled 2 empty fields from the saved design context: Accountable owner \(APP-001\), Capability \(TC-001\)/);
  click(host.querySelector('[data-spark-fill-report] button'));
  assert.deepEqual([host.querySelector('[data-dc-answer="owner"]').value, host.querySelector('[data-dc-answer="category"]').value, host.querySelector('[data-dc-answer="boundary"]').value], ['', '', 'Kept']);
  assert.equal(host.querySelector('[data-spark-fill-report]'), null);
  pass('a read-only role gets no spark; the guided design task’s fill (through the spark’s bridge) fills only empty answers, lists them with their records and undoes in one step');
}
// An old project's delayed field-run response cannot replace the new project's cache or clear its in-flight request.
{
  const {adoptProject} = await import(pathToFileURL(root + '/public/project-context.js'));
  const priorFetch = globalThis.fetch;
  const makeRun = (id, value) => ({id, accepted: true, request: {command: 'security.control', field: 'telemetry', recordId: 'oauth'}, result: {value}, packetStamp: 'race-stamp'});
  let releaseOld;
  globalThis.fetch = (url, init) => {
    const u = new URL(String(url), 'https://aiw.test');
    if (u.pathname === '/api/intelligence/field-runs' && u.searchParams.get('project') === 'race-old') return new Promise(resolve => { releaseOld = () => resolve(json({runs: [makeRun('11111111-1111-4111-8111-111111111111', 'OLD project field draft')]})); });
    if (u.pathname === '/api/intelligence/field-runs' && u.searchParams.get('project') === 'race-new') return Promise.resolve(json({runs: [makeRun('22222222-2222-4222-8222-222222222222', 'NEW project field draft')]}));
    return priorFetch(url, init);
  };
  const c = {chapter: 9, selected: {id: 'oauth', ref: 'SEC-001'}};
  adoptProject('race-old'); document.dispatchEvent(new Event('aiw:project-switched'));
  const oldPanel = document.createElement('aside'); document.body.append(oldPanel); oldPanel.innerHTML = proposalsSlot(c);
  const oldMount = mountProposals(oldPanel);
  await until(() => releaseOld, 'delayed old project field runs');
  adoptProject('race-new'); document.dispatchEvent(new Event('aiw:project-switched')); oldPanel.remove();
  const newPanel = document.createElement('aside'); document.body.append(newPanel); newPanel.innerHTML = proposalsSlot(c);
  await mountProposals(newPanel);
  assert.match(newPanel.textContent, /NEW project field draft/);
  releaseOld(); await oldMount;
  const freshSlot = newPanel.querySelector('[data-proposals]'); freshSlot.innerHTML = '<p>Refreshing the active project…</p>';
  document.dispatchEvent(new Event('aiw:project-command'));
  await until(() => !!freshSlot.querySelector('[data-proposal-source="sol"]'), 'new project proposals after stale response', 2000);
  assert.match(newPanel.textContent, /NEW project field draft/, 'redraw uses the active project’s cached field runs');
  assert.doesNotMatch(newPanel.textContent, /OLD project field draft/, 'old project response never replaces new project field drafts');
  newPanel.remove(); globalThis.fetch = priorFetch;
  adoptProject('bank-payment'); document.dispatchEvent(new Event('aiw:project-switched'));
  pass('a late field-run response from the prior project cannot overwrite or invalidate the active project’s proposals cache');
}
// A transport failure is unknown, never evidence that no saved suggestions exist.
{
  const {adoptProject} = await import(pathToFileURL(root + '/public/project-context.js'));
  const priorFetch = globalThis.fetch;
  let fail = true;
  globalThis.fetch = (url, init) => {
    const u = new URL(String(url), 'https://aiw.test');
    if (fail && ['/api/intelligence/field-runs', '/api/intelligence/runs'].includes(u.pathname)) return Promise.resolve(json({error:'Unavailable'},503));
    return priorFetch(url, init);
  };
  adoptProject('proposal-error-test'); document.dispatchEvent(new Event('aiw:project-switched'));
  const host=document.createElement('aside');document.body.append(host);
  host.innerHTML=proposalsSlot({chapter:9,selected:{id:'oauth',ref:'SEC-001'}});
  await mountProposals(host);
  const slot=host.querySelector('[data-proposals]');
  assert.match(slot.querySelector('.pp-load-error').textContent,/incomplete, not an empty result/);
  assert.ok(slot.querySelector('[data-proposal-source=rule]'),'local rule proposals remain available during a saved-answer failure');
  assert.equal(slot.__view.scope,'selected');
  fail=false;click(slot.querySelector('[data-proposal-act=retry]'));
  await until(()=>!slot.querySelector('.pp-load-error')&&slot.querySelector('[data-proposal-source=sol]'),'retry restores saved proposals');
  assert.equal(slot.__view.scope,'selected','retry preserves the selected-object view');
  host.remove();globalThis.fetch=priorFetch;
  adoptProject('bank-payment');document.dispatchEvent(new Event('aiw:project-switched'));
  pass('failed saved-answer reads are explicitly incomplete; retry restores Sol proposals without discarding local rules or selected-object scope');
}
console.log(`\n${checks.length} checks passed.`);
process.exit(0);
