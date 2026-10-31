// AIW v0.10.0-rc.10.73.42, group G1 (handbook gap review D1, D2, D3; deep-dive technology-selection): a Chapter 7
// technology selection is recorded by a signed-in person only after every inherited driver is judged and no hard
// constraint is pending or broken; approval evidence is attached by a second signed-in person, never by the one who
// recorded the selection, whatever the four-eyes setting; an approval kept with no actor still loads but is not counted;
// and the SDD prints a design basis only from a recorded selection and only the drivers actually judged for it.
// Review r2: a hard constraint is never judged "does not apply" (its Chapter 2 scope decides); a "does not apply" is never
// read as support; the open drivers of a decided question reach every reader; the approver's id is escaped; a second
// person on a shared project approves through the server; the selection basis is registered at every entry point.
// Run: npm run test:rc42-g1-tech-approval
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import * as TR from './public/technology-realisation-domain.js';
import {applyTechnologyRealisationCommand, realizationCriteria, inputSnapshot, selectionState, selectionLabel, selectionCurrent, approvalCurrent, technologyRealisationFindings, exportTechnologyRealisationMarkdown} from './public/technology-realisation-domain.js';
import {designQuestions} from './public/design-questions.js';
import {sddDocument} from './public/sdd-document.js';
import {reasoningSource, tuneDriver} from './public/design-reasoning.js';
import {designBasisHTML} from './public/record-card.js';
import {designStarters} from './public/intelligence-context.js';
import {refuseUnreviewable} from './authorship.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {readFileSync} from 'node:fs';
import path from 'node:path';

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
  assert.throws(() => cmd(base, 'record', {id, reviewed: true}, A), /Judge every driver it inherits, with a reason: [^]*QD-001/, 'a selection with zero assessments is refused');
  const missing = drivers(base).at(-1).id, partly = judgeAll(base, 'supports', [missing]);
  assert.throws(() => cmd(partly, 'record', {id, reviewed: true}, A), new RegExp('every driver it inherits[^]*' + missing), 'one unjudged driver is named and refused');
  // A judgement with no reason is not an assessment.
  const unreasoned = cmd(partly, 'assessment', {id, optionId, criterionId: missing, effect: 'supports', reason: '', evidence: ''}, A);
  assert.throws(() => cmd(unreasoned, 'record', {id, reviewed: true}, A), new RegExp(missing), 'an unexplained judgement does not count');
  // "Does not apply": only a person records it, only for a driver, only with a reason; then it counts.
  const na = {id, optionId, criterionId: missing, effect: 'not-applicable', reason: 'This realization holds no state the driver governs.', evidence: ''};
  assert.throws(() => cmd(partly, 'assessment', {...na, reason: ' '}, A), /signed-in person says why a driver does not apply/);
  assert.throws(() => cmd(partly, 'assessment', na, null), /signed-in person says why a driver does not apply/, 'a "does not apply" names the signed-in person who made it');
  assert.throws(() => cmd(partly, 'assessment', {...na, criterionId: 'operations'}, A), /signed-in person says why a driver does not apply/, 'only for a driver');
  // A Sol draft or an agent account never sends it: authorship.js, the server's one check of who may claim a review,
  // refuses the claim before anything is applied (and the server run below proves it for an agent account).
  assert.throws(() => refuseUnreviewable({type: 'techrealisation.assessment', payload: na}, {kind: 'sol-draft', account: 'person'}), /draft by Sol cannot claim a review \(effect not-applicable\)/);
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
await block('D2 hard constraint never "does not apply"', async () => {
  // Review r2, must-fix 1: where a hard constraint applies is decided by its Chapter 2 scope, never by one person's judgement
  // in Chapter 7. The reviewer's sequence: violates (refused), then "does not apply", then record.
  const hard = structuredClone(base);
  hard.quality.drivers.push({id: 'C-HOST', kind: 'constraint', code: 'C99', title: 'Approved hosting boundary', description: 'Run only inside the approved hosting boundary.', priority: 'Low', requirementIds: [], responsibilityIds: [], componentIds: ['api-pod'], constraintIds: []});
  const broken = judge(judgeAll(hard, 'supports', ['C-HOST']), 'C-HOST', 'violates');
  assert.throws(() => cmd(broken, 'record', {id, reviewed: true}, A), /breaks a hard constraint: C-HOST/);
  assert.throws(() => cmd(broken, 'assessment', {id, optionId, criterionId: 'C-HOST', effect: 'not-applicable', reason: 'Any reason at all.', evidence: ''}, A), /hard constraint applies as its Chapter 2 scope says/, 'a person cannot judge a hard constraint not to apply');
  assert.equal(rec(broken).options[0].assessments['C-HOST'].effect, 'violates', 'the break stands');
  assert.throws(() => cmd(broken, 'record', {id, reviewed: true}, A), /breaks a hard constraint: C-HOST/, 'and the record is still refused');
  // A "does not apply" on a hard constraint that reaches a document by other means (an import, an earlier build) is a
  // pending gate: the record is refused and no design basis prints it as not applying.
  const planted = structuredClone(broken); rec(planted).options[0].assessments['C-HOST'] = {...rec(planted).options[0].assessments['C-HOST'], effect: 'not-applicable', reason: 'Any reason at all.', by: A};
  assert.deepEqual(TR.selectionGate(planted, rec(planted)).pending.map(c => c.id), ['C-HOST'], 'a hard constraint judged not to apply is a pending gate');
  assert.throws(() => cmd(planted, 'record', {id, reviewed: true}, A), /hard-constraint judgement is pending[^]*C-HOST/);
  // The judgement dialog offers "Does not apply" only for a driver that is not a hard constraint.
  const crit = c => realizationCriteria(hard, id).find(x => x.id === c), offers = c => TR.assessmentEffects(crit(c)).map(([v]) => v);
  assert.ok(!offers('C-HOST').includes('not-applicable') && offers('C-HOST').includes('violates'), 'not offered for a hard constraint');
  assert.ok(offers('QD-001').includes('not-applicable') && !offers('QD-001').includes('violates'), 'offered for another driver');
  assert.ok(!offers('operations').includes('not-applicable'), 'never for a general criterion');
  pass('D2: a hard constraint is never judged "does not apply": the command refuses it (its Chapter 2 scope decides), one that arrives by other means is a pending gate, and the dialog does not offer it');
});
await block('D2 "does not apply" is never read as support', async () => {
  // Review r2, must-fix 2: a person's "does not apply" is its own reading wherever an option's judgements are read.
  const na = cmd(judge(base, 'QD-003', 'supports'), 'assessment', {id, optionId, criterionId: 'QD-001', effect: 'not-applicable', reason: 'The ledger path keeps no duplicate state here.', evidence: ''}, A);
  const row = tuneDriver(reasoningSource(na), 'QD-001', {}).effects.find(e => e.kind === 'product' && e.id === id);
  assert.ok(row, 'TR-002 is read for QD-001');
  assert.notEqual(row.state, 'holds', 'a "does not apply" is not a supporting judgement');
  assert.equal(row.state, 'unknown');
  assert.match(row.why, /^PostgreSQL: QD-001 recorded as not applying to TR-002 by architect-a: The ledger path keeps no duplicate state here\.$/);
  assert.doesNotMatch(row.why, /supporting/);
  const moved = tuneDriver(reasoningSource(na), 'QD-001', {targetValue: '0'}).effects.find(e => e.kind === 'product' && e.id === id);
  assert.equal(moved.state, 'unknown', 'nor when the target moves');
  const supports = tuneDriver(reasoningSource(judge(base, 'QD-003', 'supports')), 'QD-003', {}).effects.find(e => e.kind === 'product' && e.id === id);
  assert.equal(supports.state, 'holds', 'a recorded support still reads as one');
  pass('D2: the driver tuning reads a person\'s "does not apply" as its own sentence, never as a judgement supporting the driver');
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
  // An agent account or a Sol draft neither approves nor records: authorship.js refuses both commands on the server.
  assert.throws(() => refuseUnreviewable({type: 'techrealisation.approval', payload: approval}, {kind: 'sol-draft', account: 'agent'}), /agent or service account does not review, confirm, accept or approve \(techrealisation\.approval\)/);
  assert.throws(() => refuseUnreviewable({type: 'techrealisation.approval', payload: approval}, {kind: 'sol-draft', account: 'person'}), /draft by Sol does not review, confirm, accept or approve \(techrealisation\.approval\)/);
  assert.throws(() => refuseUnreviewable({type: 'techrealisation.record', payload: {id, reviewed: true}}, {kind: 'sol-draft', account: 'person'}), /draft by Sol does not review, confirm, accept or approve \(techrealisation\.record\)/, 'nor does a Sol draft record the selection');
  const legacyRecord = structuredClone(recorded); delete rec(legacyRecord).recorded.actor;
  assert.throws(() => cmd(legacyRecord, 'approval', approval, B), /second signed-in person[^]*record the selection again, signed in/, 'a selection kept with no actor is recorded again before a second person approves it');
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
  assert.match(exportTechnologyRealisationMarkdown(approved), /Governance: Architecture board · Architecture board chair · Board minutes AB-2026-41, item 3 · attested by architect-b; recorded by architect-a/);
  // The approver records the same selection again: the approval is no longer a second person's.
  const again = cmd(approved, 'record', {id, reviewed: true}, B);
  assert.ok(selectionCurrent(again, rec(again)) && !approvalCurrent(again, rec(again)), 'an approval by the person who now holds the record is not counted');
  assert.ok(technologyRealisationFindings(again).some(f => f.code === 'approval-independence' && f.objectId === id), 'and a finding asks for a second person');
  pass('D1: a second signed-in person attaches approval evidence; the record keeps who attested and who recorded; the SDD label and the register say who; an approval by the person now holding the record does not count');
});
await block('D1 approver named safely', async () => {
  // Review r2: the label carries the approver's id, which the Worker's identity header does not restrict; the SDD escapes it.
  const odd = cmd(recorded, 'approval', approval, 'eve*<b>x</b>');
  const doc = sdd(odd);
  assert.ok(!doc.includes('eve*<b>'), 'the SDD never prints the id as markup');
  assert.match(doc, /Approval evidence attested by eve\\\*\\<b\\>x\\<\/b\\>/, 'it prints the id escaped');
  const ui = readFileSync(new URL('./public/technology-realisation-ui.js', import.meta.url), 'utf8');
  assert.doesNotMatch(ui, /'<p>'\+state\(r\)\+'<\/p>'/, 'the inspector escapes the label');
  assert.doesNotMatch(ui, /External approval recorded|Current approval evidence/, 'the Work view keeps no wording that reads as independent approval');
  // The register names who judged a driver not to apply.
  const na = cmd(base, 'assessment', {id, optionId, criterionId: 'QD-001', effect: 'not-applicable', reason: 'No duplicate state here.', evidence: ''}, A);
  assert.match(exportTechnologyRealisationMarkdown(na), /QD-001 · [^\n]*\n  Recorded judgement: not-applicable · by architect-a · No duplicate state here\./);
  // The Model tab offers "Record the selection" only once the drivers are judged (stack-view.js reads the same gate).
  const stack = readFileSync(new URL('./public/stack-view.js', import.meta.url), 'utf8');
  assert.match(stack, /selectionGate\(project\(\), rec\)/); assert.match(stack, /preparation === 'ready' && !unjudged\.length && [^\n]*'Record the selection'/);
  pass('D1: the approver\'s id is escaped in the SDD and the inspector; the Work view uses the attested-by wording; the register names who judged a driver not to apply; the Model tab gates its record offer on the judged drivers');
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
  assert.equal(q.story, 'PostgreSQL for APP-004, because QD-001, accepting a trade-off on QD-003 (TR-002).', 'the story names only the drivers judged supported, and the trade-off accepted');
  assert.deepEqual(q.pending, ['QD-006'], 'the driver still needing evidence is kept open (QD-004, judged not to apply, is neither basis nor open)');
  const doc = sdd(p), basis = doc.split('\n').filter(l => l.startsWith('Design basis: ') && l.includes('APP-004'));
  assert.ok(basis.some(l => /PostgreSQL for APP-004, because QD1, accepting a trade-off on QD3 \(TR-002\)\./.test(l)), 'the SDD prints it by the drivers\' codes: ' + basis.join(' | '));
  assert.ok(!basis.some(l => /PostgreSQL[^.]*\b(QD4|QD6)\b/.test(l)), 'never "because" a driver that merely opens the question');
  // A selection judged to support none of the question's drivers answers it as a draft, never as decided.
  let t = base; for (const c of drivers(t)) t = judge(t, c.id, ['QD-001', 'QD-003', 'QD-004', 'QD-006'].includes(c.id) ? 'tension' : 'supports');
  t = cmd(t, 'record', {id, reviewed: true}, A);
  assert.equal(designQuestions(t, 'worker').questions.find(x => x.id === 'persistence').state, 'draft', 'trade-offs alone decide nothing');
  assert.match(doc, /Open design questions: [^\n]*\(QD6; the recorded selection still needs evidence against it\)/, 'the unjudged driver is printed as an open item');
  pass('D3: a recorded selection decides a question only because of the drivers judged supported for it, naming the trade-offs accepted; a driver still needing evidence is printed as an open item; trade-offs alone decide nothing');
});
await block('D3 open items reach every reader', async () => {
  // Review r2: a question decided through a Chapter 7 selection keeps its open drivers in the record card, the model's
  // basis panel and Sol's packet, not only in the SDD.
  let p = base;
  for (const c of drivers(p)) p = c.id === 'QD-006' ? judge(p, c.id, 'unknown') : judge(p, c.id, 'supports');
  p = cmd(p, 'record', {id, reviewed: true}, A);
  const q = designQuestions(p, 'worker').questions.find(x => x.id === 'persistence');
  assert.equal(q.state, 'decided'); assert.deepEqual(q.pending, ['QD-006']);
  const card = designBasisHTML(p, 5, 'worker').html, item = card.split('data-design-question="persistence"')[1]?.split('class="design-q"')[0] || '';
  assert.match(item, /Still needs evidence: QD-006/, 'the record card names the open driver of a decided question');
  const starter = designStarters(p, 5, 'worker').map(s => s[2]).join(' ');
  assert.match(starter, /Decided: [^]*PostgreSQL for APP-004, because QD-001[^]*\(TR-002\)\. Still needs evidence: QD-006\./, 'Sol\'s starter says what is still open: ' + starter.slice(0, 600));
  const notation = readFileSync(new URL('./public/notation-view.js', import.meta.url), 'utf8');
  assert.match(notation, /q\.pending\?\.length[^\n]*Still needs evidence: /, 'the model\'s basis panel prints the open drivers of a decided question');
  pass('D3: the open drivers of a question decided through a selection reach the record card, the model\'s basis panel and Sol\'s starters');
});
await block('D3 selection basis is registered at every entry point', async () => {
  // Review r2: design-questions.js reads the Chapter 7 judgement through registerSelectionBasis (a static import would be a
  // cycle). Every entry point's import graph loads technology-realisation-domain.js, which registers it; unregistered, no
  // realization answer is decided (fails closed).
  const IMPORTS = /(?:^|[\s;{}()])(?:import|export)\s*(?:[\w*${},\s]*?from\s*)?['"](\.{1,2}\/[^'"]+\.m?js)['"]|\bimport\(\s*['"](\.{1,2}\/[^'"]+\.m?js)['"]\s*\)/g;
  const root = path.dirname(new URL(import.meta.url).pathname), graph = entry => { const seen = new Set(), queue = [entry]; while (queue.length) { const file = path.normalize(queue.shift()); if (seen.has(file)) continue; seen.add(file); const src = readFileSync(path.join(root, file), 'utf8'); for (const m of src.matchAll(IMPORTS)) queue.push(path.join(path.dirname(file), m[1] || m[2])); } return seen; };
  for (const entry of ['worker.js', 'server.js', 'export-thread.js', 'public/entry.js']) {
    const g = graph(entry);
    assert.ok(g.has('public/design-questions.js') && g.has('public/technology-realisation-domain.js'), entry + ' loads the module that registers the selection basis');
  }
  pass('D3: worker.js, server.js, export-thread.js and the client entry all load technology-realisation-domain.js, which registers the selection basis design-questions.js reads');
});

// ---------------------------------------------------------------- through the server: the signed-in actor reaches the command
await block('server actor', async () => {
  const storedFiles = new Map(), FILES = {async put(k, v) { storedFiles.set(k, v); }, async get(k) { return storedFiles.has(k) ? {text: async () => storedFiles.get(k)} : null; }, async delete(k) { storedFiles.delete(k); }};
  const AGENT = 'sol-drafter', env = {DB: localDatabase(':memory:'), FILES, ASSETS: {fetch: () => new Response('asset')}, AIW_AGENT_ACTORS: AGENT};
  const api = (path, method = 'GET', body = null, owner = A) => { const headers = new Headers({'oai-authenticated-user-id': owner}); if (body) { headers.set('Content-Type', 'application/json'); headers.set('Origin', 'https://aiw.test'); } return worker.fetch(new Request('https://aiw.test' + path, {method, headers, ...(body ? {body: JSON.stringify(body)} : {})}), env); };
  let state = await (await api('/api/project')).json();
  const pid = state.document.id, q = '?project=' + encodeURIComponent(pid);
  // A second person and Sol's drafting account share the project as editors.
  for (const actorId of [B, AGENT]) assert.equal((await api('/api/access' + q, 'POST', {actorId, role: 'editor'})).status, 200);
  const send = async (type, payload, as = A) => { state = await (await api('/api/project' + q, 'GET', null, as)).json(); const res = await api('/api/commands' + q, 'POST', {revision: state.revision, command: {type, payload}}, as); const body = await res.json(); if (res.status === 200) state = body; return {status: res.status, body}; };
  const p0 = state.document, opt = rec(p0).options[0].id;
  assert.equal((await send('techrealisation.plan', {id, rationale: 'Synthetic rationale for the server run.'})).status, 200);
  assert.equal((await send('techrealisation.preference', {id, optionId: opt})).status, 200);
  const refused = await send('techrealisation.record', {id, reviewed: true});
  assert.equal(refused.status, 400); assert.match(refused.body.error, /Judge every driver it inherits/, 'the server refuses a selection with zero assessments');
  for (const c of drivers(state.document)) assert.equal((await send('techrealisation.assessment', {id, optionId: opt, criterionId: c.id, effect: 'supports', reason: 'Synthetic server judgement.', evidence: 'Synthetic.'})).status, 200);
  assert.equal((await send('techrealisation.record', {id, reviewed: true})).status, 200);
  assert.equal(rec(state.document).recorded.actor, A, 'the server passes the signed-in actor to the record');
  const self = await send('techrealisation.approval', approval);
  assert.equal(self.status, 400); assert.match(self.body.error, /second signed-in person/, 'the same signed-in person cannot approve through the server');
  assert.equal(rec(state.document).approval, null);
  const agent = await send('techrealisation.approval', approval, AGENT);
  assert.equal(agent.status, 400); assert.match(agent.body.error, /agent or service account does not review, confirm, accept or approve/, 'Sol\'s drafting account cannot approve');
  const agentNa = await send('techrealisation.assessment', {id, optionId: opt, criterionId: drivers(state.document)[0].id, effect: 'not-applicable', reason: 'Sol says so.', evidence: ''}, AGENT);
  assert.equal(agentNa.status, 400); assert.match(agentNa.body.error, /not-applicable/, 'nor judge a driver not to apply');
  // The second signed-in person attaches the approval evidence; the label and the SDD name them.
  const second = await send('techrealisation.approval', approval, B);
  assert.equal(second.status, 200, JSON.stringify(second.body).slice(0, 300));
  const r = rec(state.document);
  assert.equal(r.approval.actor, B); assert.equal(r.approval.recordedBy, A); assert.equal(selectionState(state.document, r), 'approved');
  assert.equal(selectionLabel(state.document, r), 'Approval evidence attested by architect-b');
  assert.match(sdd(state.document), /PostgreSQL 17 \(Approval evidence attested by architect-b\)/);
  pass('server: the signed-in actor is kept on the record; a zero-assessment record, a self-approval and Sol\'s drafting account are refused; a second person on the shared project attaches approval evidence and the label names them');
});

assert.deepEqual(failed, [], 'every rc42 G1 block passes');
console.log(`rc42 G1 tech approval: ${checks.length} checks passed`);
