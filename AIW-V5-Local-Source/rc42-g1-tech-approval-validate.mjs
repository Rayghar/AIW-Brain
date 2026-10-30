// AIW v0.10.0-rc.10.73.42, group G1 (handbook gap review D1, D2, D3; deep-dive technology-selection): a Chapter 7
// technology selection is recorded by a signed-in person only after every inherited driver is judged and no hard
// constraint is pending or broken; approval evidence is attached by a second signed-in person, never by the one who
// recorded the selection, whatever the four-eyes setting; an approval kept with no actor still loads but is not counted;
// and the SDD prints a design basis only from a recorded selection and only the drivers actually judged for it.
// Run: npm run test:rc42-g1-tech-approval
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyTechnologyRealisationCommand, realizationCriteria, inputSnapshot, selectionState, selectionLabel, selectionCurrent, approvalCurrent, technologyRealisationFindings, exportTechnologyRealisationMarkdown} from './public/technology-realisation-domain.js';
import {designQuestions} from './public/design-questions.js';
import {sddDocument} from './public/sdd-document.js';
import {refuseUnreviewable} from './authorship.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';

const checks = [], failed = [], pass = n => { checks.push(n); console.log('PASS', n); };
// Each block reports on its own, so a run on the base commit shows every defect it reproduces; any failure fails the suite.
const block = async (name, fn) => { try { await fn(); } catch (e) { failed.push(name); console.log('FAIL', name + ': ' + (e?.message || e)); } };
const at = '2026-10-30T12:00:00.000Z', A = 'architect-a', B = 'architect-b';
const person = id => ({kind: 'person', id, account: 'person', reviewed: true});
const cmd = (p, type, payload, actor = null, author = actor ? person(actor) : null) => applyTechnologyRealisationCommand(p, {type: 'techrealisation.' + type, payload}, at, actor, author ? {author} : {}).document;
const id = 'tr-002', rec = (p, rid = id) => p.technologyRealisation.records.find(r => r.id === rid);
const drivers = (p, rid = id) => realizationCriteria(p, rid).filter(c => c.kind === 'driver');
const judge = (p, criterionId, effect, actor = A, rid = id, optionId = rec(p, rid).selectedOptionId) => cmd(p, 'assessment', {id: rid, optionId, criterionId, effect, reason: 'Synthetic judgement of ' + criterionId + ' (' + effect + ').', evidence: 'Synthetic fixture evidence; nothing measured.'}, actor);
const judgeAll = (p, effect = 'supports', except = [], rid = id) => { for (const c of drivers(p, rid)) if (!except.includes(c.id)) p = judge(p, c.id, effect, A, rid); return p; };
const sdd = p => sddDocument(p, {figures: false}).markdown;
const approval = {id, reviewer: 'Architecture board chair', authority: 'Architecture board', evidence: 'Board minutes AB-2026-41, item 3', confirmed: true};

// The reference project with TR-002 (transactional persistence) ready to record but for its judgements.
let base = withFinalReview(seedProject());
base = cmd(base, 'plan', {id, rationale: 'The relational option gives one atomic place for the unique payment reference.'});
const optionId = rec(base).options[0].id;
base = cmd(base, 'preference', {id, optionId});
assert.ok(drivers(base).length >= 4, 'TR-002 inherits the reference drivers');

// ---------------------------------------------------------------- D2: no selection without judgements; no pending hard gate
await block('D2 judgements', async () => {
  assert.throws(() => cmd(base, 'record', {id, reviewed: true}, A), /Assess the preferred option against every driver it inherits[^]*QD-001/, 'a selection with zero assessments is refused');
  const missing = drivers(base).at(-1).id, partly = judgeAll(base, 'supports', [missing]);
  assert.throws(() => cmd(partly, 'record', {id, reviewed: true}, A), new RegExp('every driver it inherits[^]*' + missing), 'one unjudged driver is named and refused');
  // A judgement with no reason is not an assessment.
  const unreasoned = cmd(partly, 'assessment', {id, optionId, criterionId: missing, effect: 'supports', reason: '', evidence: ''}, A);
  assert.throws(() => cmd(unreasoned, 'record', {id, reviewed: true}, A), new RegExp(missing), 'an unexplained judgement does not count');
  // "Does not apply": only a person records it, only for a driver, only with a reason; then it counts.
  const na = {id, optionId, criterionId: missing, effect: 'not-applicable', reason: 'This realization holds no state the driver governs.', evidence: ''};
  assert.throws(() => cmd(partly, 'assessment', {...na, reason: ' '}, A), /why the driver does not apply/);
  assert.throws(() => cmd(partly, 'assessment', na, A, {kind: 'sol-draft', id: A, account: 'person', reviewed: false}), /person records/);
  assert.throws(() => cmd(partly, 'assessment', na, 'svc-agent', {kind: 'sol-draft', id: 'svc-agent', account: 'agent', reviewed: false}), /person records/);
  assert.throws(() => cmd(partly, 'assessment', {...na, criterionId: 'operations'}, A), /driver the realization inherits/);
  const applies = cmd(partly, 'assessment', na, A);
  assert.equal(rec(applies).options[0].assessments[missing].by, A, 'who said it does not apply is kept');
  assert.equal(selectionState(cmd(applies, 'record', {id, reviewed: true}, A), rec(cmd(applies, 'record', {id, reviewed: true}, A))), 'recorded', 'a person\'s reasoned "does not apply" stands for the judgement');
  // A Sol draft or an agent cannot send it in a batch either: the server refuses the claim before anything is applied.
  const batch = {type: 'workspace.apply', payload: {commands: [{type: 'techrealisation.assessment', payload: na}]}};
  assert.throws(() => refuseUnreviewable(batch, {kind: 'sol-draft', account: 'person'}), /not-applicable/);
  assert.throws(() => refuseUnreviewable({type: 'techrealisation.assessment', payload: na}, {kind: 'sol-draft', account: 'agent'}), /not-applicable/);
  assert.doesNotThrow(() => refuseUnreviewable({type: 'techrealisation.assessment', payload: {...na, effect: 'unknown'}}, {kind: 'sol-draft', account: 'person'}), 'a Sol draft may still say a judgement needs evidence');
  pass('D2: recording refuses zero or partial judgements of the inherited drivers and unexplained ones; a reasoned "does not apply" counts only from a person, for a driver, and a Sol draft or agent cannot send it');
});
await block('D2 hard gate', async () => {
  // A hard constraint reaching TR-002's applications (as driver-applicability-validate.mjs adds one).
  const hard = structuredClone(base);
  hard.quality.drivers.push({id: 'C-HOST', kind: 'constraint', code: 'C99', title: 'Approved hosting boundary', description: 'Run only inside the approved hosting boundary.', priority: 'Low', requirementIds: [], responsibilityIds: [], componentIds: ['api-pod'], constraintIds: []});
  assert.ok(realizationCriteria(hard, id).some(c => c.id === 'C-HOST' && c.hard), 'the constraint is a hard criterion of TR-002');
  const pending = judge(judgeAll(hard, 'supports', ['C-HOST']), 'C-HOST', 'unknown');
  assert.throws(() => cmd(pending, 'record', {id, reviewed: true}, A), /hard-constraint judgement is pending[^]*C-HOST/, 'an unknown effect on a hard constraint blocks the record');
  assert.throws(() => cmd(judge(pending, 'C-HOST', 'violates'), 'record', {id, reviewed: true}, A), /breaks a hard constraint: C-HOST/, 'a break still blocks it');
  assert.throws(() => cmd(judgeAll(hard, 'supports', ['C-HOST']), 'record', {id, reviewed: true}, A), /C-HOST/, 'an unjudged hard constraint blocks it');
  assert.equal(selectionState(cmd(judge(pending, 'C-HOST', 'supports'), 'record', {id, reviewed: true}, A), rec(cmd(judge(pending, 'C-HOST', 'supports'), 'record', {id, reviewed: true}, A))), 'recorded');
  pass('D2: a pending (unknown), unjudged or broken hard constraint keeps the option a candidate; a judged gate lets a person record it');
});

// ---------------------------------------------------------------- D1: the actor, a second person, never Sol or an agent
let ready, recorded, approved;
try { ready = judgeAll(base); recorded = cmd(ready, 'record', {id, reviewed: true}, A); approved = cmd(recorded, 'approval', approval, B); } catch (e) { console.log('FAIL fixture: ' + e.message); }
await block('D1 refusals', async () => {
  assert.equal(rec(recorded).recorded.actor, A, 'the selection keeps who recorded it');
  assert.throws(() => cmd(recorded, 'approval', approval, A), /second signed-in person[^]*architect-a recorded/, 'the person who recorded the selection cannot approve it');
  const fourEyes = structuredClone(recorded); fourEyes.workspace = {...(fourEyes.workspace || {}), governance: {fourEyes: true, at, actor: A, reason: 'Four eyes on.'}};
  assert.throws(() => cmd(fourEyes, 'approval', approval, A), /second signed-in person/, 'refused with four eyes on');
  const off = structuredClone(recorded); off.workspace = {...(off.workspace || {}), governance: {fourEyes: false, at, actor: A, reason: 'Four eyes off.'}};
  assert.throws(() => cmd(off, 'approval', approval, A), /second signed-in person/, 'and with four eyes off: approval means a second person');
  assert.throws(() => cmd(recorded, 'approval', approval, null), /Sign in/, 'an approval names its signed-in actor');
  assert.throws(() => cmd(recorded, 'approval', approval, 'svc-agent', {kind: 'sol-draft', id: 'svc-agent', account: 'agent', reviewed: false}), /agent or service account/);
  assert.throws(() => cmd(recorded, 'approval', approval, B, {kind: 'sol-draft', id: B, account: 'person', reviewed: false}), /draft by Sol/);
  const legacyRecord = structuredClone(recorded); delete rec(legacyRecord).recorded.actor;
  assert.throws(() => cmd(legacyRecord, 'approval', approval, B), /no signed-in author[^]*Record the selection again/, 'a selection kept with no actor is recorded again before a second person approves it');
  pass('D1: the selection keeps its actor; approval is refused for the recorder (four eyes on or off), with no actor, for an agent account or a Sol draft, and on a selection kept with no actor');
});
await block('D1 second person', async () => {
  const r = rec(approved);
  assert.equal(r.approval.actor, B); assert.equal(r.approval.recordedBy, A);
  assert.ok(approvalCurrent(approved, r)); assert.equal(selectionState(approved, r), 'approved');
  assert.equal(selectionLabel(approved, r), 'Approval evidence attested by architect-b');
  const doc = sdd(approved);
  assert.match(doc, /PostgreSQL 17 \(Approval evidence attested by architect-b\)/, 'the SDD says who attested the approval evidence');
  assert.doesNotMatch(doc, /External approval evidence recorded/, 'and never the old wording that read as independent approval');
  assert.match(exportTechnologyRealisationMarkdown(approved), /Governance: Architecture board · Architecture board chair · Board minutes AB-2026-41, item 3 · attested by architect-b; selection recorded by architect-a/);
  // The approver records the same selection again: the approval is no longer a second person's.
  const again = cmd(approved, 'record', {id, reviewed: true}, B);
  assert.ok(selectionCurrent(again, rec(again)) && !approvalCurrent(again, rec(again)), 'an approval by the person who now holds the record is not counted');
  assert.ok(technologyRealisationFindings(again).some(f => f.code === 'approval-independence' && f.objectId === id), 'and a finding asks for a second person');
  pass('D1: a second signed-in person attaches approval evidence; the record keeps who attested and who recorded; the SDD label and the register say who; an approval by the person now holding the record does not count');
});
await block('D1 legacy approval', async () => {
  // An approval kept before rc42 names no actor: it loads, is not counted, and asks for re-approval.
  const legacy = structuredClone(approved); delete rec(legacy).approval.actor; delete rec(legacy).approval.recordedBy;
  const loaded = withFinalReview(JSON.parse(JSON.stringify(legacy))), r = rec(loaded);
  assert.equal(r.approval.reviewer, approval.reviewer, 'the kept approval evidence still loads');
  assert.ok(!approvalCurrent(loaded, r)); assert.equal(selectionState(loaded, r), 'recorded', 'a selection with an approval kept with no actor reads as recorded, never approved');
  const f = technologyRealisationFindings(loaded).find(x => x.code === 'approval-independence' && x.objectId === id);
  assert.ok(f && /second signed-in person/.test(f.detail), 'a finding asks a second person to attach the approval evidence again');
  assert.doesNotMatch(sdd(loaded), /Approval evidence attested|External approval evidence recorded/, 'the SDD does not present it as approval');
  assert.match(exportTechnologyRealisationMarkdown(loaded), /Governance: No current external approval evidence/);
  pass('D1: an approval kept with no actor still loads, is read as not independent (recorded, not approved), and raises a finding asking for re-approval');
});

// ---------------------------------------------------------------- D3: the SDD's design basis
await block('D3 draft preference', async () => {
  // A draft preference for Kafka (TR-003, durable work handoff) that nobody recorded.
  const kafka = cmd(base, 'preference', {id: 'tr-003', optionId: rec(base, 'tr-003').options.find(o => o.product === 'Apache Kafka').id});
  const handoff = designQuestions(kafka, 'worker').questions.find(q => q.id === 'handoff');
  assert.notEqual(handoff.state, 'decided', 'a draft preference never decides a design question');
  assert.equal(handoff.story, '');
  assert.ok(handoff.answers.some(a => a.kind === 'realization' && a.ref === 'TR-003' && a.state === 'draft'));
  const doc = sdd(kafka);
  assert.doesNotMatch(doc, /Design basis: [^\n]*Apache Kafka/, 'the SDD prints no design basis from a draft preference');
  assert.match(doc, /Open design questions: [^\n]*a draft answer is recorded/, 'it prints the question as open');
  // The persistence preference (TR-002) is unrecorded too.
  assert.doesNotMatch(doc, /Design basis: [^\n]*PostgreSQL/);
  pass('D3: a draft preference (Kafka, never recorded) is printed as an open design question, never as a design basis');
});
await block('D3 legacy zero-assessment selection', async () => {
  // A selection kept before rc42, recorded with zero assessments: its reading is kept (current), but nothing was judged.
  const legacy = structuredClone(base), r = rec(legacy);
  r.recorded = {at, revision: r.revision, optionId: r.selectedOptionId, sourceSnapshot: inputSnapshot(legacy, r), rationale: r.rationale, findings: []};
  r.sourceSnapshot = r.recorded.sourceSnapshot;
  assert.ok(selectionCurrent(legacy, r), 'the kept selection still reads as recorded');
  const persistence = designQuestions(legacy, 'worker').questions.find(q => q.id === 'persistence');
  assert.notEqual(persistence.state, 'decided', 'no driver of the question was judged for it');
  assert.doesNotMatch(sdd(legacy), /Design basis: [^\n]*PostgreSQL/, 'so the SDD prints no design basis from it');
  pass('D3: a selection recorded with zero assessments (kept from before rc42) decides no design question');
});
await block('D3 judged drivers only', async () => {
  // A recorded selection judged driver by driver: supports, a trade-off, needs evidence, does not apply.
  let p = base;
  for (const c of drivers(p)) p = c.id === 'QD-003' ? judge(p, c.id, 'tension') : c.id === 'QD-006' ? judge(p, c.id, 'unknown') : c.id === 'QD-004' ? cmd(p, 'assessment', {id, optionId, criterionId: c.id, effect: 'not-applicable', reason: 'The settlement worker writes no state through this store in the fixture.', evidence: ''}, A) : judge(p, c.id, 'supports');
  p = cmd(p, 'record', {id, reviewed: true}, A);
  const q = designQuestions(p, 'worker').questions.find(x => x.id === 'persistence');
  assert.deepEqual(q.because, ['QD-001', 'QD-003', 'QD-004', 'QD-006'], 'the drivers that open the question');
  assert.equal(q.state, 'decided');
  assert.equal(q.story, 'PostgreSQL for APP-004, supported by QD-001; a trade-off on QD-003; QD-004 recorded as not applying (TR-002).', 'the story names only the judgements recorded for the selection');
  assert.deepEqual(q.pending, ['QD-006'], 'the driver still needing evidence is kept open');
  const doc = sdd(p), basis = doc.split('\n').filter(l => l.startsWith('Design basis: ') && l.includes('APP-004'));
  assert.ok(basis.some(l => /PostgreSQL for APP-004, supported by QD1; a trade-off on QD3; QD4 recorded as not applying \(TR-002\)\./.test(l)), 'the SDD prints it by the drivers\' codes: ' + basis.join(' | '));
  assert.ok(!basis.some(l => /because/.test(l) && /PostgreSQL/.test(l)), 'never "because" the drivers that merely open the question');
  assert.match(doc, /Open design questions: [^\n]*\(QD6; the recorded selection still needs evidence against it\)/, 'the unjudged driver is printed as an open item');
  pass('D3: a recorded selection decides a question only through the drivers judged for it (supported by, a trade-off on, recorded as not applying); a driver still needing evidence is printed as an open item');
});

// ---------------------------------------------------------------- through the server: the signed-in actor reaches the command
await block('server actor', async () => {
  const storedFiles = new Map(), FILES = {async put(k, v) { storedFiles.set(k, v); }, async get(k) { return storedFiles.has(k) ? {text: async () => storedFiles.get(k)} : null; }, async delete(k) { storedFiles.delete(k); }};
  const env = {DB: localDatabase(':memory:'), FILES, ASSETS: {fetch: () => new Response('asset')}};
  const api = (path, method = 'GET', body = null, owner = A) => { const headers = new Headers({'oai-authenticated-user-id': owner}); if (body) { headers.set('Content-Type', 'application/json'); headers.set('Origin', 'https://aiw.test'); } return worker.fetch(new Request('https://aiw.test' + path, {method, headers, ...(body ? {body: JSON.stringify(body)} : {})}), env); };
  let state = await (await api('/api/project')).json();
  const send = async (type, payload) => { const res = await api('/api/commands', 'POST', {revision: state.revision, command: {type, payload}}); const body = await res.json(); if (res.status === 200) state = body; return {status: res.status, body}; };
  const p0 = state.document, opt = rec(p0).options[0].id;
  assert.equal((await send('techrealisation.plan', {id, rationale: 'Synthetic rationale for the server run.'})).status, 200);
  assert.equal((await send('techrealisation.preference', {id, optionId: opt})).status, 200);
  const refused = await send('techrealisation.record', {id, reviewed: true});
  assert.equal(refused.status, 400); assert.match(refused.body.error, /Assess the preferred option/, 'the server refuses a selection with zero assessments');
  for (const c of drivers(state.document)) assert.equal((await send('techrealisation.assessment', {id, optionId: opt, criterionId: c.id, effect: 'supports', reason: 'Synthetic server judgement.', evidence: 'Synthetic.'})).status, 200);
  assert.equal((await send('techrealisation.record', {id, reviewed: true})).status, 200);
  assert.equal(rec(state.document).recorded.actor, A, 'the server passes the signed-in actor to the record');
  const self = await send('techrealisation.approval', approval);
  assert.equal(self.status, 400); assert.match(self.body.error, /second signed-in person/, 'the same signed-in person cannot approve through the server');
  assert.equal(rec(state.document).approval, null);
  pass('server: the signed-in actor is kept on the record; a zero-assessment record and a self-approval are refused');
});

assert.deepEqual(failed, [], 'every rc42 G1 block passes');
console.log(`rc42 G1 tech approval: ${checks.length} checks passed`);
