// The live probe itself, proved on the test double (round 11): `scripts/sol-live-check.mjs --mock` starts a server on
// a scratch database against the loopback provider double, asks Sol for one field draft in each of the eleven
// chapters of the reference project, the journey, the review and one bounded architecture theme, and writes the evidence. Here: the
// evidence has eleven chapter entries, 1 to 11 in order, each completed with its packet's size and sources, its
// grounding and the draft text; the pins name the field prompt; no key reaches the file; and with no key in the shell
// the probe sends nothing and says so (exit 2). The double proves the probe, not the provider: the owner's local run
// with a real key is the evidence of the drafts' relevance (LOCAL-RUN.md). Run: npm run test:sol-live-check
// Schema 4 (rc41 review, Fix-now 5): the provider keeps its two layers apart (groundingReview.deterministic and .check,
// proved offline here with stubbed calls); each run carries its packet stamp and an outcome, and the totals add them up;
// and with --mock-faults each deliberate fault of the double (PROBE_FAULTS) is withheld by the layer that should, a
// contradicting check is recorded and not relied on, and a gap statement is reported exactly as the field guard treats it.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, mkdtempSync, readFileSync, rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {requestFieldDraft, requestJourneyDraft, requestModelReview, guardFieldDraft, FIELD_INSTRUCTIONS, FIELD_REVIEW_INSTRUCTIONS, JOURNEY_INSTRUCTIONS, REVIEW_MODE_INSTRUCTIONS} from './intelligence-provider.js';
import {ARCHITECTURE_INSTRUCTIONS} from './public/architecture-contract.js';
import {PROBE_FAULTS, GAP_STATEMENT, envelope, viaAnthropic, providerEnv} from './mock-llm-provider.mjs';

const root = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '');
const checks = [], started = Date.now();
const pass = n => { checks.push(n); console.log('PASS', n); };
const scratch = mkdtempSync(path.join(os.tmpdir(), 'aiw-sol-live-'));
// The shell's own keys never reach the probe: the suite runs without a key, then on the double.
const bare = Object.fromEntries(Object.entries(process.env).filter(([k]) => !['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'AIW_ANTHROPIC_BASE_URL'].includes(k) && !k.startsWith('AIW_LLM_')));
const probe = (args, env) => spawnSync(process.execPath, ['scripts/sol-live-check.mjs', ...args], {cwd: root, env, encoding: 'utf8', timeout: 240000});
// No prompt content in an evidence file: the opening of each mode's instructions never appears in it.
const noPrompt = (text, what) => { for (const t of [FIELD_INSTRUCTIONS, FIELD_REVIEW_INSTRUCTIONS, JOURNEY_INSTRUCTIONS, REVIEW_MODE_INSTRUCTIONS, ARCHITECTURE_INSTRUCTIONS]) assert.ok(!text.includes(t.slice(0, 120)), `${what}: no prompt content reaches the evidence`); };
try {
  // 0. The provider's two layers, kept apart (offline: stubbed provider answers on a loopback address nothing listens on).
  // accepted is unchanged; deterministic holds the guard's issues, check the check's defects, notes and contradiction.
  {
    const env = {OPENAI_API_KEY: 'k', AIW_LLM_MODEL: 'm', AIW_LLM_BASE_URL: 'http://127.0.0.1:9/v1', AIW_LLM_PROVIDER: 'openai'};
    const answering = (...answers) => async () => new Response(JSON.stringify(envelope(answers.shift())), {status: 200});
    const fieldPacket = {stamp: 'field-1', target: {command: 'logical.responsibility', field: 'purpose', label: 'Purpose', help: '', maxLength: 600, current: '', record: 'LR-001 Scheduling'}, sources: [{ref: 'S1', kind: 'record', excerpt: 'LR-001 Scheduling books appointments.'}]};
    const clean = {field: 'purpose', value: 'Books appointments for the clinic.', basis: 'From S1.', sourceRefs: ['S1']}, supported = {supported: true, defects: [], notes: ['It follows S1.']};
    let r = await requestFieldDraft(env, fieldPacket, {fetcher: answering({...clean, value: 'Books appointments. This guarantees a verified outcome at full capacity.'}, supported)});
    assert.equal(r.groundingReview.accepted, false); assert.deepEqual(r.groundingReview.deterministic, {accepted: false, issues: ['It presents the draft as guaranteeing an outcome.']});
    assert.deepEqual(r.groundingReview.check, {defects: [], notes: ['It follows S1.'], contradiction: null}); assert.deepEqual(r.groundingReview.issues, r.groundingReview.deterministic.issues, 'the merged issues are unchanged');
    r = await requestFieldDraft(env, fieldPacket, {fetcher: answering(clean, {supported: false, defects: ['It invents an owner.'], notes: []})});
    assert.equal(r.groundingReview.accepted, false); assert.deepEqual(r.groundingReview.deterministic, {accepted: true, issues: []}); assert.deepEqual(r.groundingReview.check.defects, ['It invents an owner.']);
    r = await requestFieldDraft(env, fieldPacket, {fetcher: answering(clean, {supported: false, defects: ['The value is supported by the cited record.'], notes: []})});
    assert.equal(r.groundingReview.accepted, true, 'a check that contradicts itself is not relied on'); assert.deepEqual(r.groundingReview.check.defects, []); assert.match(r.groundingReview.check.contradiction.note, /flag was not relied on/);
    assert.deepEqual(r.groundingReview.contradiction, r.groundingReview.check.contradiction);
    const journeyPacket = {stamp: 'journey-1', passages: [{id: 'P-001', text: 'Patients book appointments online.'}], upstream: [], sources: [], records: [{key: 'c1', title: 'Booking', fields: [{key: 'title', label: 'Title', current: 'Patients book appointments online'}]}]};
    const said = value => ({answers: [{record: 'c1', field: 'title', value, passages: ['P-001'], sourceRefs: []}]});
    r = await requestJourneyDraft(env, journeyPacket, {fetcher: answering(said('Patients book online. This guarantees a verified outcome at full capacity.'), supported)});
    assert.equal(r.groundingReview.accepted, false); assert.match(r.groundingReview.deterministic.issues.join(' '), /c1\.title presents the draft as guaranteeing an outcome/); assert.deepEqual(r.groundingReview.check.defects, []);
    r = await requestJourneyDraft(env, journeyPacket, {fetcher: answering({answers: [{record: 'c9', field: 'title', value: 'x', passages: ['P-001'], sourceRefs: []}]})});
    assert.equal(r.groundingReview.accepted, false); assert.equal(r.groundingReview.check, null, 'a draft that does not fit is never checked'); assert.match(r.groundingReview.deterministic.issues[0], /not one of the chapter’s draft fields/);
    const reviewPacket = {stamp: 'review-1', elementIds: ['lr-001', 'lr-002', 'lr-003'], sources: ['lr-001', 'lr-002', 'lr-003'].map((id, i) => ({ref: 'S' + (i + 1), kind: 'record', objectId: id, excerpt: `Record ${id} books appointments.`}))};
    const finding = (id, i, tail = '') => ({elementId: id, severity: 'confirm', title: `Confirm ${id}`, reason: `The record in S${i + 1} is unconfirmed.${tail}`, sourceRefs: ['S' + (i + 1)]});
    r = await requestModelReview(env, reviewPacket, {fetcher: answering({findings: [finding('lr-001', 0, ' It handles 987654 bookings a day.'), finding('lr-002', 1), finding('lr-003', 2)]},
      {findings: [{id: 'F1', supported: true, defects: [], notes: []}, {id: 'F2', supported: false, defects: ['It invents a measurement that no source in the packet contains.'], notes: []}, {id: 'F3', supported: true, defects: [], notes: ['It follows S3.']}]})});
    assert.deepEqual(r.result.findings.map(f => f.id), ['F3']); assert.deepEqual(r.groundingReview.withheld, ['F1', 'F2']);
    assert.deepEqual(r.groundingReview.deterministic, {accepted: false, issues: ['F1: It states 987654, which no source in the packet contains.'], withheld: ['F1'], setAside: 0});
    assert.deepEqual(r.groundingReview.check.withheld, ['F2']); assert.deepEqual(r.groundingReview.check.defects, ['F2: It invents a measurement that no source in the packet contains.']);
    // A draft the provider declined (Anthropic's wire, where a refusal stands as a declined call): nothing was there to check.
    const refused = async () => new Response(JSON.stringify({id: 'r', model: 'claude-test', status: 'completed', output: [{type: 'message', content: [{type: 'refusal', refusal: 'No.'}]}], usage: {input_tokens: 5, output_tokens: 1}}), {status: 200});
    r = await requestFieldDraft(providerEnv({OPENAI_API_KEY: 'k', AIW_LLM_MODEL: 'claude-test', AIW_LLM_BASE_URL: 'http://127.0.0.1:9'}, 'anthropic'), fieldPacket, {fetcher: viaAnthropic(refused)});
    assert.equal(r.groundingReview.accepted, false); assert.equal(r.groundingReview.declined, true); assert.deepEqual(r.groundingReview.deterministic.issues, []); assert.equal(r.groundingReview.check, null);
    pass('the provider keeps the guard’s issues (deterministic) and the check’s defects, notes and contradiction (check) apart for field, journey and review drafts; accepted and the merged issues are unchanged; a declined draft is neither');
  }

  // 1. No key: nothing is sent, the reason is said, exit 2, and no evidence is written.
  const none = probe(['--out', path.join(scratch, 'none.json')], bare);
  assert.equal(none.status, 2, none.stdout + none.stderr);
  assert.match(none.stdout, /nothing was sent\. Set ANTHROPIC_API_KEY in the shell/);
  assert.equal(existsSync(path.join(scratch, 'none.json')), false, 'no evidence file without a run');
  pass('with no key in the shell the probe sends nothing, names the variable to set and exits 2');

  // 2. The double: eleven chapter drafts, the journey and the review, all completed, each chapter entry recorded.
  const out = path.join(scratch, 'double.json');
  const mock = probe(['--mock', '--out', out], bare);
  assert.equal(mock.status, 0, mock.stdout + mock.stderr);
  const evidence = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(evidence.schema, 'aiw.sol-live-check/4');
  assert.equal(evidence.live, false); assert.equal(evidence.passed, true);
  assert.equal(evidence.completed, true); assert.equal(evidence.passed, evidence.completed, 'passed is the deprecated alias of completed'); assert.match(evidence.deprecated.passed, /Alias of completed/); assert.equal(evidence.faults, null, 'no fault was injected');
  assert.deepEqual(evidence.chapters.map(c => c.chapter), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 'one field draft per chapter, in order');
  assert.deepEqual(evidence.chapters.map(c => c.command), ['artefact', 'quality.driver', 'decision.save', 'logical.responsibility', 'realisation.component', 'technology.capability', 'techrealisation.plan', 'interfaces.contract', 'security.control', 'runtime.plan', 'review.narrative']);
  for (const c of evidence.chapters) {
    assert.equal(c.status, 'completed', `chapter ${c.chapter}: ${c.error}`);
    assert.ok(typeof c.field === 'string' && c.field && typeof c.record === 'string' && c.record, `chapter ${c.chapter} names its field and record`);
    assert.ok(Number.isInteger(c.packetCharacters) && c.packetCharacters > 0 && c.packetCharacters <= 12000 && c.sources >= 1 && c.sources <= 10, `chapter ${c.chapter}: the packet's size and sources are recorded within the budgets`);
    assert.ok(typeof c.draft === 'string' && c.draft.length > 0, `chapter ${c.chapter}: the draft text is recorded`);
    assert.equal(c.draftAccepted, true, `chapter ${c.chapter}: the double's draft passes the checks`);
    assert.equal(c.withheld, false); assert.equal(c.withheldBy, null); assert.equal(c.withheldDraft, null); assert.equal('groundingAccepted' in c, false, 'the flag that meant three things is gone');
  }
  assert.ok(evidence.chapters.filter(c => c.neighbours > 0).length >= 6, 'most chapters’ packets hold the record’s neighbours');
  const fields = evidence.runs.filter(r => r.mode === 'field');
  assert.equal(fields.length, 11); assert.equal(evidence.runs.length, 14, 'eleven field drafts, the journey, the review and one architecture theme');
  assert.ok(fields.every(r => r.packet && Array.isArray(r.packet.neighbours) && typeof r.packet.help === 'string' && r.draft && r.grounding), 'each field run keeps its packet reading, grounding and draft');
  assert.ok(evidence.pins.includes('sol-field-5'), 'the field prompt pin is recorded: ' + evidence.pins.join(', '));
  assert.ok(evidence.runs.some(r => r.mode === 'journey' && r.status === 'completed') && evidence.runs.some(r => r.mode === 'review' && r.status === 'completed'));
  const architecture = evidence.runs.find(r => r.mode === 'architecture');
  assert.equal(architecture.status, 'completed', architecture.error);
  assert.equal(architecture.packet.requirements, 1);
  assert.equal(architecture.checks.proposalCount, 1);
  assert.equal(architecture.someProposalAccepted, true);
  assert.deepEqual(architecture.outcome, {unit: 'proposal', offered: 1, empty: 0, withheld: 0, withheldBy: null, byLayer: {deterministic: 0, check: 0, both: 0, unrecorded: 0}, withheldAll: false, declined: false, fallback: null, contradictions: 0, attempts: 1});
  assert.deepEqual(architecture.proposalRefs[0].requirements, ['REQ-001']); assert.deepEqual(architecture.proposalRefs[0].passages, [], 'each proposal’s passages are recorded');
  assert.deepEqual(architecture.calls.map(c => [c.pass, c.provider, c.kind]), [['draft', 'default', 'openai'], ['check', 'default', 'openai']], 'the architecture receipt names both model passes');
  assert.ok(architecture.calls.every(c => c.model && c.responseId && c.usage.inputTokens), 'each architecture pass has a model, response and usage receipt');
  // Schema 4: every run has its packet stamp, an outcome, its mode's own acceptance flag, and its grounding with the
  // layers apart (the stamp the run was checked against is the one sent); the routes and the totals are recorded.
  const accepted = {field: 'draftAccepted', journey: 'draftAccepted', review: 'allFindingsAccepted', architecture: 'someProposalAccepted'};
  for (const r of evidence.runs) {
    assert.ok(typeof r.packetStamp === 'string' && r.packetStamp.length >= 8, `${r.mode} ${r.chapter || ''}: the packet stamp is recorded`);
    assert.equal(r[accepted[r.mode]], true, `${r.mode} ${r.chapter || ''}: ${accepted[r.mode]}`); assert.equal('groundingAccepted' in r, false); assert.equal('withheld' in r, false, 'no withheld count read from a list some modes never set');
    assert.equal(r.grounding.packetStampMatches, true, `${r.mode} ${r.chapter || ''}: checked against the packet it was sent`);
    assert.ok(r.grounding.deterministic && Array.isArray(r.grounding.deterministic.issues) && r.grounding.check && Array.isArray(r.grounding.check.notes), `${r.mode} ${r.chapter || ''}: the guard and the check are recorded apart`);
    assert.equal(r.outcome.withheld, 0); assert.equal(r.outcome.withheldBy, null); assert.ok(r.outcome.offered >= 1, `${r.mode}: something was offered`);
  }
  assert.ok(fields.every(r => r.packet.omissions.every(o => typeof o.title === 'string' && typeof o.reason === 'string') && r.withheldDraft === null && typeof r.target.currentIsPlaceholder === 'boolean'), 'each field run keeps its omissions with their reasons and its target’s state');
  assert.deepEqual(Object.keys(evidence.routes).sort(), ['architecture', 'field', 'generate', 'journey', 'reasoning', 'review']); assert.ok(Object.values(evidence.routes).every(r => r.draft.model && r.check.model), 'the routes name each mode’s draft and check model');
  const journey = evidence.runs.find(r => r.mode === 'journey'), review = evidence.runs.find(r => r.mode === 'review');
  assert.equal(journey.answers.length, journey.checks.answers); assert.ok(journey.answers.length > 0 && journey.answers.every(a => a.record && a.field && a.value && a.passages.length), 'the journey’s answers are recorded');
  assert.equal(journey.packet.omittedRecords.length, journey.packet.guidedRecordsInDraft - journey.packet.records, 'the guided records the packet left out are named');
  const omitted = journey.packet.omissions.records; assert.equal(Array.isArray(omitted) ? omitted.length : omitted?.count ?? omitted, journey.packet.omittedRecords.length, 'as the packet itself counts them');
  assert.equal(review.findings.length, review.checks.findings); assert.deepEqual(review.withheldFindings, []); assert.equal(typeof review.packet.omissions, 'object');
  assert.deepEqual(evidence.totals.field, {runs: 11, completed: 11, unit: 'draft', offered: 11, empty: 0, withheld: 0, byLayer: {deterministic: 0, check: 0, both: 0, unrecorded: 0}, declined: 0, contradictions: 0});
  assert.deepEqual([evidence.totals.journey.offered, evidence.totals.journey.answersOffered, evidence.totals.review.offered, evidence.totals.architecture.offered, evidence.totals.architecture.withheldAll], [1, journey.answers.length, review.findings.length, 1, 0]);
  const text = readFileSync(out, 'utf8');
  assert.doesNotMatch(text, /test-key-never-returned/, 'no key reaches the evidence'); noPrompt(text, 'the double');
  assert.match(text, /proves the probe, not the provider/, 'the double is named as such');
  assert.match(mock.stdout, /field\s+completed\s+ch\s+5 realisation\.component\.boundary[\s\S]*packet \d+ chars, \d+ sources · draft:/, 'the console line per chapter');
  assert.match(mock.stdout, /total\s+field\s+11\/11 completed · offered 11, withheld 0/, 'the console line per mode');
  pass('on the test double the probe records eleven chapter field drafts, journey, review and one grounded architecture theme with draft/check provider receipts and no key in the file');
  pass('schema 4: every run has its packet stamp, an outcome and its mode’s own acceptance flag; the guard and the check are recorded apart, with the routes, the omissions and their reasons, the journey’s answers and left-out records, the review’s findings, and per-mode totals; passed is the alias of completed');

  // 3. The double's deliberate faults (--mock-faults): each is withheld by the layer that should, and the evidence says so.
  const faultsOut = path.join(scratch, 'faults.json');
  const faulty = probe(['--mock-faults', '--out', faultsOut], bare);
  assert.equal(faulty.status, 0, faulty.stdout + faulty.stderr);
  const fe = JSON.parse(readFileSync(faultsOut, 'utf8')), ch = n => fe.chapters.find(c => c.chapter === n), run = n => fe.runs.find(r => r.mode === 'field' && r.chapter === n);
  assert.equal(fe.schema, 'aiw.sol-live-check/4'); assert.equal(fe.completed, true, 'every run still completed: a withheld draft is a completed run'); assert.deepEqual(fe.faults.plan, JSON.parse(JSON.stringify(PROBE_FAULTS)));
  const withheldBy = (n, by, pattern) => {
    const c = ch(n), r = run(n);
    assert.equal(c.draftAccepted, false, `chapter ${n}`); assert.equal(c.withheld, true); assert.equal(c.withheldBy, by, `chapter ${n} is withheld by ${by}`); assert.equal(c.draft, '', `chapter ${n}: nothing is offered`);
    assert.deepEqual([r.outcome.offered, r.outcome.withheld, r.outcome.withheldBy, r.outcome.byLayer[by]], [0, 1, by, 1]);
    assert.equal(r.withheldDraft.offeredToArchitect, false); assert.equal(r.withheldDraft.reference, 'clinic-appointments'); assert.equal(c.withheldDraft.offeredToArchitect, false); assert.ok(r.withheldDraft.value.length > 0, `chapter ${n}: the withheld draft is kept for diagnosis`);
    assert.equal(r.grounding.deterministic.issues.length > 0, by !== 'check', `chapter ${n}: the guard's issues`); assert.equal(r.grounding.check.defects.length > 0, by !== 'deterministic', `chapter ${n}: the check's defects`);
    if (pattern) assert.match([...r.grounding.deterministic.issues, ...r.grounding.check.defects].join(' '), pattern);
    return r;
  };
  assert.match(withheldBy(1, 'deterministic', /It states 987654, which no source in the packet contains/).withheldDraft.value, /987654/, 'invented-number: the guard withholds it');
  withheldBy(3, 'deterministic', /guaranteeing an outcome/);
  assert.deepEqual(withheldBy(4, 'both').grounding.check.defects, ['It invents a measurement that no source in the packet contains.'], 'invented-number and check-reject together: both layers');
  assert.deepEqual(withheldBy(10, 'check').grounding.deterministic.issues, [], 'check-reject: the check withholds it alone');
  // check-contradict: the check said unsupported with only a defect that reads as support; its flag is recorded, not relied on.
  const contradicted = run(8);
  assert.equal(ch(8).draftAccepted, true); assert.equal(contradicted.outcome.offered, 1); assert.equal(contradicted.outcome.contradictions, 1); assert.equal(contradicted.outcome.withheldBy, null);
  assert.deepEqual(contradicted.grounding.check.defects, []); assert.deepEqual(contradicted.grounding.check.notes, ['The value is supported by the cited record.']); assert.match(contradicted.grounding.check.contradiction.note, /marked it unsupported but named no defect[\s\S]*flag was not relied on/);
  // gap-statement: reported exactly as the field guard treats it. Where the guard reads an open target (the target's open
  // state in the packet), the draft is withheld by it; otherwise the double reproduces the live defect (lead A): the gap
  // statement on a placeholder target is offered, and the evidence shows that rather than hiding it.
  const gapGuarded = guardFieldDraft({sources: [], target: {field: 'operationsPlan', current: '', open: {state: 'open-question', question: 'Who operates it?'}}}, {value: GAP_STATEMENT, basis: '', sourceRefs: ['S1']}).length > 0;
  const gap = ch(7);
  if (gapGuarded && gap.targetOpen) withheldBy(7, 'deterministic');
  else { assert.deepEqual([gap.draftAccepted, gap.draft, gap.withheldBy, run(7).outcome.offered], [true, GAP_STATEMENT, null, 1]); assert.ok(gap.targetOpen || gap.currentIsPlaceholder, 'the target held an open question'); }
  const faultless = [2, 5, 6, 9, 11];
  assert.ok(faultless.every(n => ch(n).draftAccepted === true && ch(n).withheldBy === null && run(n).outcome.offered === 1), 'the chapters without a fault are offered');
  const gapWithheld = ch(7).withheldBy === 'deterministic' ? 1 : 0;
  assert.deepEqual(fe.totals.field, {runs: 11, completed: 11, unit: 'draft', offered: 7 - gapWithheld, empty: 0, withheld: 4 + gapWithheld, byLayer: {deterministic: 2 + gapWithheld, check: 1, both: 1, unrecorded: 0}, declined: 0, contradictions: 1});
  // The journey: the guarantee withholds the whole draft by the guard; the deterministic draft stands; the draft is kept, not offered.
  const fj = fe.runs.find(r => r.mode === 'journey');
  assert.equal(fj.draftAccepted, false); assert.deepEqual([fj.outcome.withheld, fj.outcome.withheldBy, fj.outcome.fallback, fj.outcome.answersOffered], [1, 'deterministic', 'deterministic-draft', 0]); assert.deepEqual(fj.answers, []);
  assert.match(fj.grounding.deterministic.issues.join(' '), /presents the draft as guaranteeing an outcome/); assert.deepEqual(fj.grounding.check.defects, []);
  assert.equal(fj.withheldDraft.offeredToArchitect, false); assert.equal(fj.withheldDraft.answers.length, fj.outcome.answersWithheld); assert.match(fj.withheldDraft.answers[0].value, /guarantees a verified outcome/);
  // The review: F1 (invented-number) by the guard, F2 (check-reject) by the check, F3 offered; neither withheld finding is offered.
  const fr = fe.runs.find(r => r.mode === 'review');
  assert.equal(fr.allFindingsAccepted, false); assert.deepEqual(fr.findings.map(f => f.id), ['F3']);
  assert.deepEqual(fr.withheldFindings.map(f => [f.id, f.withheldBy, f.offeredToArchitect]), [['F1', 'deterministic', false], ['F2', 'check', false]]);
  assert.deepEqual([fr.outcome.offered, fr.outcome.withheld, fr.outcome.withheldBy, fr.outcome.byLayer.deterministic, fr.outcome.byLayer.check], [1, 2, 'both', 1, 1]);
  // The architecture: the guarantee withholds the second proposal by the guard; the first stands, so not withheldAll.
  const fa = fe.runs.find(r => r.mode === 'architecture');
  assert.equal(fa.someProposalAccepted, true); assert.deepEqual([fa.outcome.offered, fa.outcome.withheld, fa.outcome.withheldBy, fa.outcome.withheldAll, fa.outcome.fallback], [1, 1, 'deterministic', false, null]);
  assert.deepEqual(fa.withheldReasons.map(w => [w.id, w.withheldBy, w.offeredToArchitect]), [['A2', 'deterministic', false]]); assert.ok(fa.withheldReasons[0].issues.includes('It presents a draft as guaranteeing an outcome.') && fa.withheldReasons[0].title, 'the withheld proposal’s reason and text');
  assert.deepEqual(fa.calls.map(c => c.pass), ['draft', 'check'], 'the check saw only what the guard let through');
  const faultsText = readFileSync(faultsOut, 'utf8');
  assert.doesNotMatch(faultsText, /test-key-never-returned/); noPrompt(faultsText, 'the faults run');
  assert.match(faulty.stdout, /field\s+completed\s+ch\s+4 logical\.responsibility\.purpose[^\n]*withheld 1 draft by both/, 'the console says which layer withheld it');
  pass(`with --mock-faults each fault is withheld by its layer (invented-number and guarantee by the guard, check-reject by the check, both together by both; journey, review and architecture alike), a contradicting check is recorded and not relied on, and the gap statement is ${gapWithheld ? 'withheld by the guard on an open target' : 'offered and reported as such (no guard reads the open target yet: lead A reproduced)'}`);
} finally {
  rmSync(scratch, {recursive: true, force: true});
}
console.log(JSON.stringify({status: 'passed', checks: checks.length, seconds: Math.round((Date.now() - started) / 1000), checksRun: checks}, null, 2));
