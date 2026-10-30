// Open fields and the wording rules Sol is told (rc41 audit/rc41/live/IMPROVEMENTS-2026-10-29.md, FIX NOW items 1 and
// 4), offline: no provider is called (a fetcher stub stands in for one). 1. The live field packets of 2026-10-29 for
// Chapters 7, 8 and 9, rebuilt with the exported fieldPacket on the clinic-appointments reference project as the server
// creates it (a project-<uuid> id, an ISO time to the millisecond; at 24772e0 these rebuilt the evidence's 11,972, 11,878
// and 11,819 characters exactly): the journey drafter's "Open question: …" placeholder is no longer sent as
// target.current, as S1's recorded text or as the retrieval query; it is target.open, and S1 lists it under open. A
// stated value, an empty field, a recorded open state and an answer typed over a placeholder are each sent as they are.
// 2. The field guard withholds a gap statement as the value only when target.open is set: the three accepted live drafts
// are withheld, a real answer passes, an empty value with the question in basis passes, and the same words in a field
// that is not open stay a value (a risk can name a gap); validateFieldDraft does not turn them into a run error; through
// requestFieldDraft the run is withheld with the reason. 3. The journey guard does the same for an open journey field.
// 4. The prompts: "improve" is for a stated value only; the shared drafted-wording and source-figure rules are in every
// draft prompt and the converted-figure defect in every check prompt; the architecture prompt models "this would let …
// / so that …"; the guard's outcome list is not pasted; the wording the prompts model passes the drafted-mode guard.
// 5. Every pinned prompt by version and digest, so neither a prompt nor a shared constant it embeds changes without a
// new version. Every check runs and each failure is named. Run: npm run test:sol-open-fields
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createProject} from './shared/projects-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {recordOf} from './public/field-suggestions.js';
import {isOpenText, questionOf} from './public/open-fields.js';
import {overclaim} from './public/brain-reasoning.js';
import {fieldPacket} from './intelligence-service.js';
import * as P from './intelligence-provider.js';
import * as A from './public/architecture-contract.js';
import * as S from './shared/reasoning-instructions.js';
import {envelope} from './mock-llm-provider.mjs';

const checks = [], failed = [];
const check = async (name, fn) => { try { await fn(); checks.push(name); console.log('PASS', name); } catch (e) { failed.push(name); console.log('FAIL', name, '\n  ' + String(e?.message || e).split('\n').join('\n  ')); } };

// The reference project as the live probe's server held it, and the probe's own requests for Chapters 7, 8 and 9.
const project = withFinalReview(createProject({name: 'Sol live check · reference', template: 'clinic-appointments'}, 'project-00000000-0000-0000-0000-000000000000', '2026-10-29T12:34:56.789Z'));
const evidence = JSON.parse(readFileSync('audit/rc41/live/sol-live-2026-10-29-passed.json', 'utf8'));
const live = [7, 8, 9].map(chapter => evidence.runs.find(r => r.mode === 'field' && r.chapter === chapter));
const packetOf = (command, field, recordId, values = {}, p = project) => fieldPacket(p, {command, field, recordId, values, links: {}});
const S1 = k => JSON.parse(k.sources[0].excerpt);
const kindsOf = k => { const n = {}; for (const s of k.sources) n[s.kind] = (n[s.kind] || 0) + 1; return n; };
const REAL_ANSWER = 'The clinic IT team operates, monitors and supports it.';
const stub = answers => async () => new Response(JSON.stringify(envelope(answers.shift())), {status: 200});
const ENV = {OPENAI_API_KEY: 'k', AIW_LLM_MODEL: 'm', AIW_LLM_BASE_URL: 'http://127.0.0.1:9/v1'};

// ---------------------------------------------------------------- 1. the packet
for (const run of live) {
  await check(`Chapter ${run.chapter} (${run.command}.${run.field} of ${run.recordId}): the live "Open question" placeholder is sent as target.open, never as target.current or S1's recorded text`, () => {
    const saved = String(recordOf(project, run.command, run.recordId)[run.field]);
    assert.ok(/^Open question: /.test(saved) && isOpenText(saved), 'the record holds the journey drafter’s placeholder, as it did live: ' + saved);
    const k = packetOf(run.command, run.field, run.recordId);
    assert.equal(k.target.record, run.record, 'the live record'); assert.equal(k.target.help, run.packet.help, 'the live field meaning');
    assert.deepEqual(kindsOf(k), run.packet.kinds, 'the same kinds of source as the live packet');
    assert.ok(k.coverage.characters <= 12000 && k.sources.length <= 10, 'within the budgets');
    assert.equal(k.target.current, '', 'an open field has no current value to improve');
    assert.deepEqual(k.target.open, {state: 'open-question', question: questionOf(saved)}, 'the open question rides on the target');
    const s1 = S1(k);
    assert.equal(s1.recorded[run.field], undefined, 'the placeholder is not recorded text');
    assert.deepEqual(s1.open[run.field], {state: 'open-question', question: questionOf(saved)}, 'S1 lists the field under open');
    assert.ok(!s1.notRecorded.includes(run.field), 'and not as not recorded');
    assert.deepEqual(Object.entries(s1.recorded).filter(([, v]) => isOpenText(v)), [], 'no other placeholder is sent as recorded text');
    assert.doesNotMatch(JSON.stringify(k.target) + k.sources[0].excerpt, /Open question:|Not stated in the brief/, 'the placeholder words reach neither the target nor S1');
  });
}
await check('a stated value is still sent as target.current, an empty field stays not recorded, and neither carries target.open', () => {
  const stated = packetOf('artefact', 'description', 'OUT-001'), saved = recordOf(project, 'artefact', 'OUT-001').description;
  assert.equal(stated.target.current, saved.trim()); assert.equal(stated.target.open, undefined); assert.equal(S1(stated).recorded.description, saved.trim());
  const empty = packetOf('decision.save', 'rationale', 'ADR-001');
  assert.equal(String(recordOf(project, 'decision.save', 'ADR-001').rationale || ''), '', 'the rationale is empty in the reference project');
  assert.equal(empty.target.current, ''); assert.equal(empty.target.open, undefined, 'an empty field with no recorded state is not open'); assert.ok(S1(empty).notRecorded.includes('rationale'));
});
await check('a recorded open state (round 12, record.open) is sent as target.open; an answer typed over a placeholder is a value', () => {
  const p = structuredClone(project), r = p.technologyRealisation.records.find(x => x.id === 'tr-001');
  r.operationsPlan = ''; r.open = {...(r.open || {}), operationsPlan: {state: 'open-question', question: 'Who runs it out of hours?'}};
  const kept = packetOf('techrealisation.plan', 'operationsPlan', 'tr-001', {}, p);
  assert.deepEqual(kept.target.open, {state: 'open-question', question: 'Who runs it out of hours?'}); assert.equal(kept.target.current, '');
  assert.deepEqual(S1(kept).open.operationsPlan, {state: 'open-question', question: 'Who runs it out of hours?'});
  const typed = packetOf('techrealisation.plan', 'operationsPlan', 'tr-001', {operationsPlan: REAL_ANSWER});
  assert.equal(typed.target.current, REAL_ANSWER); assert.equal(typed.target.open, undefined); assert.equal(S1(typed).recorded.operationsPlan, REAL_ANSWER);
  const typedOverState = packetOf('techrealisation.plan', 'operationsPlan', 'tr-001', {operationsPlan: REAL_ANSWER}, p);
  assert.equal(typedOverState.target.current, REAL_ANSWER, 'what the architect typed wins over the saved open state'); assert.equal(typedOverState.target.open, undefined);
});

// ---------------------------------------------------------------- 2. the field guard
for (const run of live) {
  await check(`Chapter ${run.chapter}: the accepted live draft ("${run.draft.value.slice(0, 48)}…") is withheld as a gap restated, and a real answer or an empty value passes`, () => {
    const k = packetOf(run.command, run.field, run.recordId), raw = {field: run.field, value: run.draft.value, basis: run.draft.basis, sourceRefs: run.draft.sourceRefs};
    const draft = P.validateFieldDraft(raw, k);
    assert.equal(draft.value, run.draft.value, 'the structure is valid: the gap is the guard’s to withhold, not a run error');
    assert.ok(P.guardFieldDraft(k, draft).some(x => /restates the open question as the value/.test(x)), 'withheld: ' + JSON.stringify(P.guardFieldDraft(k, draft)));
    assert.deepEqual(P.guardFieldDraft(k, {field: run.field, value: REAL_ANSWER, basis: 'S1 asks who operates it.', sourceRefs: ['S1']}), [], 'a real answer passes: no word-overlap test');
    assert.deepEqual(P.guardFieldDraft(k, {field: run.field, value: '', basis: `No source answers the open question: ${k.target.open?.question}`, sourceRefs: ['S1']}), [], 'an empty value with the question in basis passes');
  });
}
await check('the gap words are withheld only for an open target: in a field that is not open (a risk, an assumption) they stay a value', () => {
  for (const field of ['risks', 'assumptions']) {
    const k = packetOf('techrealisation.plan', field, 'tr-001');
    assert.equal(k.target.open, undefined, field + ' is not open');
    assert.deepEqual(P.guardFieldDraft(k, {field, value: 'Operations ownership is unassigned, so an incident could go unanswered until an owner is named.', basis: 'S1 records no owner.', sourceRefs: ['S1']}), [], field + ': a gap named as content is a value');
  }
  assert.equal(P.restatesGap('Unassigned'), true, 'a bare placeholder restates the gap'); assert.equal(P.restatesGap('Open question: who runs it?'), true);
  assert.equal(P.restatesGap(REAL_ANSWER), false); assert.equal(P.restatesGap(''), false, 'an empty value restates nothing');
});
await check('through requestFieldDraft (a fetcher stub, no provider): the Chapter 7 gap draft is withheld with the reason even when the check passes; a real answer is offered', async () => {
  const run = live[0], k = packetOf(run.command, run.field, run.recordId), raw = {field: run.field, value: run.draft.value, basis: run.draft.basis, sourceRefs: run.draft.sourceRefs};
  const withheld = await P.requestFieldDraft(ENV, k, {fetcher: stub([raw, {supported: true, defects: [], notes: ['Checked against S1.']}])});
  assert.equal(withheld.result.withheld, true); assert.equal(withheld.result.value, ''); assert.equal(withheld.groundingReview.accepted, false);
  assert.ok(withheld.result.issues.some(x => /restates the open question/.test(x)), JSON.stringify(withheld.result.issues));
  const offered = await P.requestFieldDraft(ENV, k, {fetcher: stub([{field: run.field, value: REAL_ANSWER, basis: 'S1 asks who operates it.', sourceRefs: ['S1']}, {supported: true, defects: [], notes: []}])});
  assert.equal(offered.groundingReview.accepted, true, JSON.stringify(offered.groundingReview.issues)); assert.equal(offered.result.value, REAL_ANSWER);
  assert.deepEqual(offered.instructions, P.fieldInstructionsPin(), 'the run records the pinned field prompt');
});

// ---------------------------------------------------------------- 3. the journey guard
await check('the journey guard withholds a gap restated as an open journey field’s value (basis gap or a placeholder), and spares a stated field and a real answer', () => {
  const open = 'Open question: what triggers rollback and how is it checked? Not stated in the brief or the upstream records.';
  const packet = {passages: [{id: 'P1', text: 'Patients book, move or cancel an appointment at any time of day.'}], upstream: [], records: [{key: 'e1', title: 'Appointment scheduling service production design', fields: [
    {key: 'rollback', label: 'Rollback', current: open, basis: 'gap'}, {key: 'owner', label: 'Owner', current: 'Unassigned', basis: 'gap'}, {key: 'zone', label: 'Zone', current: 'Unassigned'},
    {key: 'readiness', label: 'Readiness', current: 'Appointment scheduling service is ready when Compute for Appointment scheduling service answers for it.', basis: 'upstream'}]}]};
  const said = answers => P.guardJourneyDraft(packet, {answers: answers.map(([field, value]) => ({record: 'e1', field, value, passages: ['P1'], sourceRefs: []}))});
  assert.match(said([['rollback', 'The rollback trigger is undefined and must be clarified with the operations team.']]).join(' '), /e1\.rollback restates its open question/);
  assert.match(said([['owner', 'Unassigned']]).join(' '), /e1\.owner restates its open question/, 'a placeholder as the answer');
  assert.match(said([['zone', 'The placement zone is unspecified.']]).join(' '), /e1\.zone restates/, 'a placeholder value is open whatever its basis');
  assert.deepEqual(said([['rollback', 'Roll back when the readiness check fails after a release.'], ['owner', 'The clinic IT team']]), [], 'real answers pass');
  assert.deepEqual(said([['readiness', 'Ready when the compute answers; the alert route is unspecified.']]), [], 'a stated field is not an open one');
});

// ---------------------------------------------------------------- 4. the prompts
await check('the field prompt keeps "improve" for a stated value, answers an open field from the sources or leaves it empty with its question in basis, and its check names the gap restated', () => {
  assert.doesNotMatch(P.FIELD_INSTRUCTIONS, /where the field already holds text \(target\.current\), improve it/, 'the old wording, which made Sol rewrite the gap, is gone');
  assert.match(P.FIELD_INSTRUCTIONS, /Where the field holds a stated value \(target\.current\), improve it without changing its meaning\./);
  assert.match(P.FIELD_INSTRUCTIONS, /Where the field is open \(target\.open: not stated, or an open question in target\.open\.question\), target\.current is empty and there is nothing to improve: answer the question, or state the value, only from what the cited sources say, else return an empty value and put the open question in basis; do not write the gap itself/);
  assert.match(P.FIELD_REVIEW_INSTRUCTIONS, /for an open field \(target\.open\), a value that restates its open question or gap[^.]*instead of answering it from the sources/);
  assert.match(P.JOURNEY_INSTRUCTIONS, /A field whose basis is gap is open: answer its question from the packet or leave it out; do not write the gap itself/);
  assert.match(P.JOURNEY_REVIEW_INSTRUCTIONS, /for a field whose basis is gap, a value that restates its open question or gap/);
});
await check('one shared drafted-wording rule: what a part does and which driver or constraint it answers, not an outcome, purpose or must/would/help; with example pairs and a requirement-as-outcome example; no pasted guard vocabulary', () => {
  const W = S.DRAFTED_WORDING;
  assert.equal(typeof W, 'string', 'shared/reasoning-instructions.js exports DRAFTED_WORDING');
  assert.match(W, /what the part does and which driver, requirement or constraint it answers, never as an outcome it ensures, guarantees or achieves/);
  assert.match(W, /as its purpose, or saying the part must, would or helps bring it about, claims it all the same/);
  assert.match(W, /presents the requirement as an outcome the design already achieves/, 'the requirement-as-outcome example');
  const good = [...W.matchAll(/write "([^"]+)"/g)].map(m => m[1]), bad = [...W.matchAll(/not "([^"]+)"(?: or "([^"]+)")?/g)].flatMap(m => [m[1], m[2]]).filter(Boolean);
  assert.ok(good.length >= 3 && bad.length >= 3, 'example pairs');
  for (const g of good) assert.equal(overclaim(g, {drafted: true}), null, `the wording it models passes the drafted-mode guard: ${g}`);
  for (const b of ['Guarantees availability', 'would help ensure availability']) { assert.ok(bad.includes(b)); assert.equal(overclaim('It ' + b.replace(/^Guarantees/, 'guarantees') + '.', {drafted: true}), 'guarantee', `the guard withholds the form it warns against: ${b}`); }
  assert.doesNotMatch(W, /exactly.once|\bzero\b|100 ?%|no loss|atomic|verified|recovery|capacity|compliance|correctness|the target/i, 'the guard’s own outcome list (brain-reasoning.js SOFT/HARD) is not pasted');
  for (const [name, text] of [['field', P.FIELD_INSTRUCTIONS], ['journey', P.JOURNEY_INSTRUCTIONS], ['generate', P.GENERATE_INSTRUCTIONS], ['architecture', A.ARCHITECTURE_INSTRUCTIONS], ['architecture cross', A.ARCHITECTURE_CROSS_INSTRUCTIONS]]) assert.ok(String(text).includes(W), `the ${name} prompt says it`);
});
await check('figures stay in the source’s words: every draft prompt keeps times, frequencies and quantities as written, and every check prompt names a figure converted from words', () => {
  assert.match(String(S.SOURCE_FIGURES), /keep the source's words for times, frequencies and quantities; do not convert them[\s\S]*24\/7[\s\S]*48 hours/i);
  assert.match(String(S.CONVERTED_FIGURE), /^a figure converted from words/);
  for (const [name, text] of [['field', P.FIELD_INSTRUCTIONS], ['journey', P.JOURNEY_INSTRUCTIONS], ['review', P.REVIEW_MODE_INSTRUCTIONS], ['architecture', A.ARCHITECTURE_INSTRUCTIONS], ['architecture cross', A.ARCHITECTURE_CROSS_INSTRUCTIONS]]) assert.ok(String(text).includes(S.SOURCE_FIGURES), `the ${name} draft prompt`);
  for (const [name, text] of [['field', P.FIELD_REVIEW_INSTRUCTIONS], ['journey', P.JOURNEY_REVIEW_INSTRUCTIONS], ['review', P.REVIEW_MODE_CHECK_INSTRUCTIONS], ['architecture', A.ARCHITECTURE_REVIEW_INSTRUCTIONS]]) assert.ok(String(text).includes(S.CONVERTED_FIGURE), `the ${name} check prompt`);
});
await check('the architecture prompt models its interpretation as "this would let … / so that …", which the drafted-mode guard passes, not "this would …"', () => {
  assert.doesNotMatch(A.ARCHITECTURE_INSTRUCTIONS, /"this would …"/); assert.match(A.ARCHITECTURE_INSTRUCTIONS, /"Sol proposes …", "this would let …", "… so that …"/);
  assert.equal(overclaim('Sol proposes a standby store; this would let bookings continue when the primary store fails.', {drafted: true}), null);
  assert.equal(overclaim('Sol proposes a standby store, so that bookings continue when the primary store fails.', {drafted: true}), null);
  assert.equal(overclaim('Sol proposes a standby store; this would ensure availability.', {drafted: true}), 'guarantee', 'the old model wording is what the guard withholds');
});

// ---------------------------------------------------------------- 5. the pins
await check('every changed prompt is pinned by version and digest (field, journey, review, architecture), and generate by version', () => {
  assert.deepEqual(P.fieldInstructionsPin(), {promptVersion: 'sol-field-4', sha256: '7cef6c145670051f574a48af8791cb8fdd816292861aeaffe96a78557ea7fbe3'});
  assert.deepEqual(P.journeyInstructionsPin(), {promptVersion: 'sol-journey-3', sha256: 'bee89def7bb923c4fd1ad6c367dab8881bb25c9fa09d0236864f1df71baea2c9'});
  assert.deepEqual(P.reviewInstructionsPin(), {promptVersion: 'sol-review-3', sha256: 'e2b5d3ef79c706242b436bd063e8cb249c9ca2267b303b5e14aa3c127e7960b7'});
  assert.deepEqual(A.architectureInstructionsPin(), {promptVersion: 'sol-architecture-5', sha256: 'e85683bfef98635b9f11842df75c4153cb1243723f3a6997fb368649b1555d4f'});
  assert.equal(P.GENERATE_PROMPT_VERSION, 'sol-generate-2', 'the generate pin (its digest is per request: requestIntelligence adds the mode’s parts)');
});

console.log(JSON.stringify({suite: 'sol-open-fields', status: failed.length ? 'failed' : 'passed', checks: checks.length, failed}, null, 1));
if (failed.length) process.exitCode = 1;
