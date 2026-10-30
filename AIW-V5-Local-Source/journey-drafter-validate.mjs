// The journey drafter (round 4, Contract 2; shared/journey-drafter.js), the governed commit of its records (Contract 3;
// guide.commit-draft with provenance, public/chapter-guide.js) and Sol's journey mode (intelligence-service.js,
// intelligence-provider.js; prompt pin sol-journey-3). Two briefs are interpreted (shared/brief-interpreter.js) and
// drafted through all
// eleven chapters on an in-memory copy. The suite asserts: every chapter drafts at least one record; the answers are
// shaped exactly for each chapter's creation questions; the compiled document raises no "source-change" or key
// finding in any chapter; every value cites a brief passage or a named upstream record, or is a gap; nothing is
// confirmed; every created record carries provenance.journey; only eligible released claims and Playbook passages are
// cited; Chapter 8 data has a key and a status field; Chapter 11 is titled with the project's name; and the input
// project is never changed. Then one chapter is committed over HTTP through guide.start → guide.draft-answer →
// guide.commit-draft with provenance, and Sol's journey mode is checked: 503 without a key, the packet's bounds, the
// strict answer contract and its guards, the second check and the fallback. Round 6 (Contract I): the same brief with
// a model beside it (the Structurizr, BPMN, ArchiMate and MADR fixtures in evaluation/model-fixtures): the model's
// stated elements are preferred and the brief rules fill in what the model lacks; a record read from the model carries
// provenance {mode: 'model', sourceId} and cites the model's lines; a BPMN model's events, gateways and flows follow the
// last step as process commands; without a model the output is byte for byte what it was.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync} from 'node:fs';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {createProject} from './shared/projects-domain.js';
import {interpretBrief} from './shared/brief-interpreter.js';
import {draftChapter, draftJourney, modelDraft, briefOf, briefSource, modelOf, modelSource, objectPhrase, titleKey} from './shared/journey-drafter.js';
import {interpretModel} from './shared/model-interpreter.js';
import {creationFields, compileCreation} from './public/guided-creation.js';
import {CHAPTERS} from './public/review-domain.js';
import {journeyProvenance, applyGuideCommand} from './public/chapter-guide.js';
import {guideBasis} from './public/guidance-record.js';
import {sha256} from './public/brain-integrity.js';
import {journeyRequest, journeyPacket, JOURNEY_SOL_LIMITS} from './public/intelligence-context.js';
import {referenceBrief} from './shared/reference-journeys.js';
import {journeyDraftSchema, validateJourneyDraft, guardJourneyDraft, requestJourneyDraft, journeyInstructionsPin, JOURNEY_PROMPT_VERSION} from './intelligence-provider.js';
import * as rv from './public/review-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {applyRequirementsCommand} from './public/requirement-commands.js';
import {requirementGroups, groupMembers} from './public/requirement-groups.js';
import {draftArchitecture, applyDraftBundle, nounPhrase, slug} from './public/architecture-drafter.js';

const checks = [], pass = name => checks.push(name), at = '2026-10-01T09:00:00Z';

// The interpreted brief (shared/brief-interpreter.js, Contract 1), as the server reads it.
// ---------------------------------------------------------------- two briefs
const BRIEFS = {
  permits: {name: 'Riverside event permits', text: [
    'Riverside Council wants residents to apply for street-event permits online so that applications are decided within 10 working days instead of six weeks.',
    'Residents must be able to submit a permit application with a site plan and contact details.',
    'The system must check each application for missing documents before it reaches a case officer.',
    'Case officers should review applications, request changes and record a decision with its reasons.',
    'Applicants must be notified by email when the status of their application changes.',
    'The licensing team needs a weekly report of open applications and decisions.',
    'The service must not store card details; payments are taken by the council\'s existing payment provider.',
    'Personal data must be kept for no longer than 2 years after a decision.',
    'We assume residents have an email address.',
    'In scope: street-event permits for the Riverside area.',
    'Out of scope: alcohol licences and market stalls.',
    'The licensing manager owns the service.',
    'Journey:',
    '1. A resident submits an application online.',
    '2. The system checks the application for completeness.',
    '3. A case officer reviews the application and records a decision.',
    '4. The resident is notified of the decision.'].join('\n')},
  returns: {name: 'Harbour Freight returns', text: [
    'Harbour Freight needs a returns service so that customers receive a refund decision within 3 days of the parcel arriving.',
    'Customers must be able to request a return and receive a return label.',
    'The warehouse team must record the condition of each returned item when it is received.',
    'The system should calculate the refund from the recorded condition and the original order.',
    'Refunds must be paid through the existing payment gateway, and each refund must be paid exactly once.',
    'Customers should be able to see the status of their return at any time.',
    'The service must handle 500 returns per day during the January peak.',
    'The finance team approves refunds above 200 pounds.',
    'We assume the carrier provides tracking events for return parcels.',
    'Out of scope: exchanges for a different product.',
    'Steps:',
    '1. The customer requests a return.',
    '2. The carrier delivers the parcel to the warehouse.',
    '3. Warehouse staff inspect the item and record its condition.',
    '4. The system calculates the refund.',
    '5. The payment gateway pays the refund and the customer is notified.'].join('\n')},
  // A longer brief (579 words) with every kind of Chapter 1 record: 2 outcomes, 9 stakeholders, 3 actors, 8 scope items
  // (6 in, 2 out), 7 journey steps, 4 constraints, 3 assumptions and 9 requirements, as the interpreter reads it.
  bikes: {name: 'Town bike share', text: readFileSync('evaluation/model-fixtures/bike-share-brief.txt', 'utf8').replace(/\n$/, '')}
};

// ---------------------------------------------------------------- 1. the whole journey, per brief
const RECORDS = {1: p => p.artefacts, 2: p => p.quality.drivers, 3: p => p.decisions.records, 4: p => p.logical.responsibilities, 5: p => p.realisation.components, 6: p => p.technology.capabilities, 7: p => p.technologyRealisation.records, 8: p => [...p.interfaces.contracts, ...p.interfaces.data], 9: p => [...p.security.threats, ...p.security.controls], 10: p => p.runtime.plans, 11: p => [p.finalReview.narrative].filter(n => n.summary)};
const everyRecord = p => [...p.artefacts, ...p.quality.drivers, ...p.decisions.records, ...p.logical.responsibilities, ...p.realisation.components, ...p.technology.capabilities, ...p.technology.needs, ...p.technologyRealisation.records, ...p.interfaces.contracts, ...p.interfaces.data, ...p.interfaces.parties, ...p.security.threats, ...p.security.controls, ...p.runtime.environments, ...p.runtime.plans, ...p.runtime.placements, p.finalReview.narrative];
const measured = {};
const journeys = {};
for (const [id, b] of Object.entries(BRIEFS)) {
  const p = createProject({name: b.name, template: 'blank', brief: b.text}, id, at, {briefHash: sha256(b.text.trim())}), before = JSON.stringify(p);
  const brief = interpretBrief(b.text, {name: b.name});
  const run = draftJourney(p, {brief}), doc = run.document;
  journeys[id] = {p, brief, run};
  assert.equal(JSON.stringify(p), before, `${id}: draftJourney never changes its input`);
  assert.equal(JSON.stringify(draftJourney(p, {brief}).chapters), JSON.stringify(run.chapters), `${id}: the same brief drafts the same journey`);
  measured[id] = {};
  for (const d of run.chapters) {
    const ch = d.chapter;
    assert.ok(d.records.length >= 1, `${id}: Chapter ${ch} drafts at least one record (${d.empty || d.note || ''})`);
    assert.deepEqual(d.records.filter(r => r.blocked).map(r => r.key + ': ' + r.blocked), [], `${id}: Chapter ${ch} has no record its own rules could not compile`);
    for (const r of d.records) {
      assert.equal(r.kind, 'guided', 'every record, of every chapter and every Chapter 1 type, goes through the guided chain');
      assert.deepEqual(Object.keys(r.answers).sort(), creationFields(doc, ch, r.answers).map(f => f.key).sort(), `${id}: Chapter ${ch} ${r.key} answers exactly the chapter's creation questions`);
      for (const f of r.fields) assert.ok(f.basis === 'gap' || f.passages.length || f.upstream.length, `${id}: Chapter ${ch} ${r.key}.${f.key} cites a passage or an upstream record, or is a gap (${f.basis})`);
      for (const f of r.fields) assert.ok(['stated', 'inferred', 'upstream', 'gap'].includes(f.basis));
      for (const f of r.fields.filter(f => f.basis === 'stated')) assert.ok(f.passages.length, `${id}: a stated value cites the passage that states it (${ch} ${r.key}.${f.key})`);
      for (const f of r.fields.filter(f => f.passages.length)) for (const pid of f.passages) assert.ok(brief.passages.some(x => x.id === pid), `${id}: ${pid} is a passage of the brief`);
      assert.equal(r.provenance.mode, 'deterministic');
      assert.deepEqual(journeyProvenance(doc, r.provenance), r.provenance, `${id}: Chapter ${ch} ${r.key}: its provenance passes the guide's own check`);
    }
    for (const c of d.citations) assert.ok(['governed-claim', 'brain-method'].includes(c.kind), `${id}: Chapter ${ch} cites only released claims and Playbook passages`);
    measured[id][ch] = {records: d.records.length, saved: RECORDS[ch](doc).length, gaps: d.gaps.length, stated: d.records.flatMap(r => r.fields).filter(f => f.basis === 'stated').length, inferred: d.records.flatMap(r => r.fields).filter(f => f.basis === 'inferred').length, upstream: d.records.flatMap(r => r.fields).filter(f => f.basis === 'upstream').length};
  }
  // Chapter 1 proposes one record per interpreted proposal of every kind: the types match the kinds, and the counts match
  // once proposals of one kind with the same title words are one record, which cites all their passages.
  const KIND = {outcomes: 'outcome', stakeholders: 'stakeholder', actors: 'actor', scope: 'scope', journeys: 'journey', constraints: 'constraint', assumptions: 'assumption', requirements: 'requirement'};
  const one = run.chapters[0].records, proposed = {}, drafted = {};
  for (const r of one) drafted[r.type] = (drafted[r.type] || 0) + 1;
  for (const [kind, type] of Object.entries(KIND)) {
    const groups = new Map();
    for (const x of briefOf({passages: brief.passages, [kind]: brief[kind] || []})[kind]) groups.set(titleKey(x.title), [...(groups.get(titleKey(x.title)) || []), ...x.passages]);
    proposed[type] = groups.size;
    assert.equal(drafted[type] || 0, groups.size, `${id}: Chapter 1 drafts one ${type} per interpreted ${kind.replace(/s$/, '')} (${groups.size})`);
    for (const r of one.filter(r => r.type === type)) { const own = [...new Set(groups.get(titleKey(r.title)) || [])], cited = new Set(r.provenance.passages); assert.ok(own.length, `${id}: ${r.key} keeps an interpreted ${type}`); if (own.length <= 40) assert.ok(own.every(pid => cited.has(pid)), `${id}: ${r.key} ${type} cites every passage of the proposals it keeps`); }
  }
  for (const r of one.filter(r => r.type === 'scope')) { const x = brief.scope.find(y => titleKey(y.title) === titleKey(r.title)); if (x?.scopeMode) assert.equal(r.answers.scopeMode, x.scopeMode, `${id}: ${r.title} keeps its ${x.scopeMode} scope`); }
  measured[id].proposed = proposed;
  // Chapter 3: a decision for each constraint, once a requirement with a quality scenario exists to decide on.
  const afterTwo = draftJourney(p, {brief, upTo: 2}).document;
  if (afterTwo.quality.drivers.length) for (const c of afterTwo.artefacts.filter(a => a.type === 'constraint')) assert.ok(run.chapters[2].records.some(r => r.provenance.upstream.includes(c.id)), `${id}: Chapter 3 proposes a decision for ${c.id}`);
  for (const c of CHAPTERS) { const fs = c.checks(doc); assert.deepEqual(fs.filter(f => f.code === 'source-change' || f.code === 'key').map(f => f.code + ':' + (f.objectId || f.artefactId || '')), [], `${id}: Chapter ${c.id} raises no source-change or key finding`); }
  for (let ch = 1; ch <= 11; ch++) assert.ok(RECORDS[ch](doc).length >= 1, `${id}: Chapter ${ch} holds records after the journey`);
  assert.deepEqual(everyRecord(doc).filter(r => r?.confirmed === true || r?.targetConfirmed === true).map(r => r.id), [], `${id}: nothing is confirmed`);
  const guided = run.chapters.flatMap(d => d.records.filter(r => r.kind === 'guided').flatMap(r => r.creates || []));
  const byId = new Map(everyRecord(doc).filter(r => r?.id).map(r => [r.id, r]));
  for (const rid of guided) if (byId.has(rid)) assert.ok(byId.get(rid).provenance?.journey?.mode === 'deterministic', `${id}: ${rid} carries provenance.journey`);
  assert.ok(doc.finalReview.narrative.provenance?.journey, `${id}: the narrative carries provenance.journey`);
  assert.ok(doc.artefacts.length >= 8 && doc.artefacts.every(a => a.provenance?.journey?.chapter === 1), `${id}: every Chapter 1 artefact, of every type, carries provenance.journey`);
  assert.deepEqual([...new Set(doc.artefacts.map(a => a.type))].sort(), [...new Set(run.chapters[0].records.map(r => r.answers.type))].sort(), `${id}: each artefact has the type its record answered`);
  assert.ok(doc.relationships.length >= 3, `${id}: the drafted links follow the records`);
  assert.ok(doc.relationships.some(r => r.kind === 'requires') && (!brief.outcomes.length || doc.relationships.some(r => r.kind === 'delivers')), `${id}: journey steps require requirements, and requirements deliver outcomes`);
  assert.equal(doc.finalReview.narrative.title, b.name + ' — Solution Design', `${id}: Chapter 11 is titled with the project's name, as every SDD is`);
  // Each record carries the provenance of the chapter that drafted it: a later commit that only updates it (Chapter 6
  // adds technology needs to the Chapter 5 component it supports) leaves that provenance as it is.
  const drafter = new Map();
  for (const d of run.chapters) for (const r of d.records) for (const rid of r.creates || []) if (!drafter.has(rid)) drafter.set(rid, d.chapter);
  for (const rec of everyRecord(doc).filter(x => x?.id && drafter.has(x.id))) assert.equal(rec.provenance?.journey?.chapter, drafter.get(rec.id), `${id}: ${rec.ref || rec.id} keeps the provenance of Chapter ${drafter.get(rec.id)}, which drafted it`);
  assert.ok(doc.realisation.components.every(c => c.provenance.journey.chapter === 5) && run.chapters[5].records.some(r => r.creates.some(x => doc.realisation.components.some(c => c.id === x))), `${id}: APP components keep Chapter 5 provenance though Chapter 6 lists them among what it touched`);
  for (const d of doc.interfaces.data) { assert.ok(d.fields.length >= 2, `${id}: ${d.ref} proposes at least two fields`); assert.ok(d.fields.some(f => f.key && f.required), `${id}: ${d.ref} has a required key field`); assert.ok(d.fields.some(f => f.name === 'status')); }
  // Re-drafting a chapter the journey already drafted proposes nothing new.
  assert.equal(draftChapter(doc, 2, {brief}).records.length, 0, `${id}: Chapter 2 drafts only for requirements without a scenario`);
  assert.equal(draftChapter(doc, 1, {brief}).records.length, 0, `${id}: Chapter 1 drafts only what the project does not hold`);
}
pass('three briefs drafted through all eleven chapters: Chapter 1 drafts one record per interpreted proposal of every kind (duplicates kept once, citing all their passages; scope keeps its side); Chapter 3 decides on every constraint; every chapter drafts records shaped exactly for its creation questions; no source-change or key finding; every value cites a passage or an upstream record or is a gap; nothing confirmed; provenance on every created record; only released claims and Playbook passages cited; Chapter 8 data keyed; Chapter 11 titled with the project name; the input unchanged; re-drafting proposes nothing twice');

// Numbers only from the brief: the permit brief states "within 10 working days"; no scenario carries a number the
// brief does not state.
{
  const {brief, run} = journeys.permits, texts = brief.passages.map(x => x.text).join(' ');
  for (const r of run.chapters[1].records) { const t = r.answers.targetValue; if (t) assert.ok(texts.includes(t), `the target ${t} is stated in the brief`); }
  const numbers = run.chapters.flatMap(d => d.records.flatMap(r => r.fields)).filter(f => f.basis !== 'gap' && !['order', 'replicas', 'minReady', 'links'].includes(f.key) && /\d/.test(f.value) && !/^(?:P-|REQ-|OUT-|ACT-|JRN-|STK-|SCP-|CON-|ASM-|QD-|ADR-|ALT-|lr-|obj-|tc-|tb-|tr-|if-|dat-|ext-|thr-|sec-|env-|zon-|run-)/.test(f.value));
  for (const f of numbers) for (const n of f.value.match(/\d+(?:\.\d+)?/g)) assert.ok(texts.includes(n) || ['1'].includes(n) || /\b(?:REQ|OUT|ACT|JRN|STK|SCP|CON|ASM|QD|ADR|ALT|LR|APP|TC|TB|TR|IF|DAT|EXT|THR|SEC|ENV|RUN|P)-\d+/.test(f.value), `the number ${n} in ${f.key} is in the brief or names a record`);
  assert.equal(objectPhrase('Accept a traceable service request from a citizen'), 'traceable service request');
  // The brief the draft reads: the kept opening source; a copy without it whose brief still matches the recorded hash;
  // a changed brief, said so.
  const p = journeys.permits.p, kept = briefSource(p);
  assert.equal(kept.kept, true); assert.equal(kept.text, BRIEFS.permits.text.trim()); assert.equal(kept.sourceId, p.brief.interpreted.sourceId);
  const copy = structuredClone(p); delete copy.coauthoring;
  const same = briefSource(copy);
  assert.deepEqual([same.kept, same.text === p.brief.problem], [false, true]); assert.match(same.note, /matches the hash/);
  copy.brief.problem += ' Members may cancel.';
  assert.match(briefSource(copy).note, /not kept and the brief has changed/);
  delete copy.brief.interpreted.sourceId;
  assert.equal(briefSource(copy).note, 'Drafted from the brief as Chapter 1 records it.', 'a brief that was never kept as a source is read as Chapter 1 records it');
  pass('numbers only from the brief (a journey step\'s place in the list, and one instance of an application that exists, aside); the noun a requirement acts on; the brief read from the kept source, or from a brief that matches its recorded hash, or said to be changed');
}

// ---------------------------------------------------------------- 2. the governed commit: guide.* with provenance
{
  const {p, brief} = journeys.returns;
  let doc = structuredClone(p);
  const d = draftChapter(doc, 1, {brief}), r = d.records[0];
  doc = applyGuideCommand(doc, {type: 'guide.start', payload: {chapter: 1}}, at, 'architect').document;
  for (const f of creationFields(doc, 1, r.answers)) doc = applyGuideCommand(doc, {type: 'guide.draft-answer', payload: {chapter: 1, field: f.key, answer: r.answers[f.key], basis: guideBasis(doc, 1, null)}}, at, 'architect').document;
  const answers = doc.guidance.sessions[0].creation.answers, stamp = compileCreation(doc, 1, answers).stamp;
  const commit = provenance => applyGuideCommand(doc, {type: 'guide.commit-draft', payload: {chapter: 1, stamp, reviewed: true, provenance}}, at, 'architect');
  assert.throws(() => commit({...r.provenance, mode: 'model'}), /model source/, 'a model draft names the model source it was read from');
  assert.throws(() => commit({...r.provenance, mode: 'other'}), /mode/);
  assert.throws(() => commit({...r.provenance, extra: 1}), /only/);
  assert.throws(() => commit({...r.provenance, passages: Array.from({length: 41}, (_, i) => 'P-' + (i + 1))}), /at most 40/);
  assert.throws(() => commit({...r.provenance, upstream: ['REQ-999']}), /does not hold/);
  assert.throws(() => commit({...r.provenance, claimIds: Array.from({length: 21}, (_, i) => 'C' + i)}), /at most 20/);
  assert.throws(() => commit({...r.provenance, mode: 'sol'}), /names the run/);
  assert.throws(() => commit({...r.provenance, mode: 'sol', runId: 'x'.repeat(65)}), /64/);
  assert.throws(() => applyGuideCommand(doc, {type: 'guide.commit-draft', payload: {chapter: 1, stamp, reviewed: false, provenance: r.provenance}}, at, 'architect'), /Review/);
  const done = commit(r.provenance).document, req = done.artefacts.find(a => a.type === r.type);
  assert.deepEqual(req.provenance.journey, {...r.provenance, chapter: 1, at});
  assert.equal(req.confirmed, false);
  assert.deepEqual(done.guidance.sessions[0].history.at(-1).provenance, r.provenance, 'the session history keeps the provenance');
  const plain = commit(undefined).document;
  assert.equal(plain.artefacts.find(a => a.type === r.type).provenance, undefined, 'a commit without provenance writes none');
  // Another Chapter 1 type through the same chain: the guide starts as a requirement, the draft answers the type first,
  // and the questions that follow are that type's.
  const outcome = d.records.find(x => x.type === 'journey');
  let next = applyGuideCommand(done, {type: 'guide.start', payload: {chapter: 1}}, at, 'architect').document;
  assert.deepEqual(next.guidance.sessions[0].creation.answers, {type: 'requirement'}, 'the guide starts a Chapter 1 record as a requirement, as before');
  next = applyGuideCommand(next, {type: 'guide.draft-answer', payload: {chapter: 1, field: 'type', answer: 'journey', basis: guideBasis(next, 1, null)}}, at, 'architect').document;
  for (const f of creationFields(next, 1, outcome.answers).filter(f => f.key !== 'type')) next = applyGuideCommand(next, {type: 'guide.draft-answer', payload: {chapter: 1, field: f.key, answer: outcome.answers[f.key], basis: guideBasis(next, 1, null)}}, at, 'architect').document;
  const step = applyGuideCommand(next, {type: 'guide.commit-draft', payload: {chapter: 1, stamp: compileCreation(next, 1, next.guidance.sessions[0].creation.answers).stamp, reviewed: true, provenance: outcome.provenance}}, at, 'architect').document.artefacts.find(a => a.type === 'journey');
  assert.deepEqual([step.title, step.order, step.confirmed, step.provenance.journey.mode], [outcome.answers.title, Number(outcome.answers.order), false, 'deterministic']);
  // Through the guide: a Chapter 6 commit on a component the person made (no journey provenance) marks only what it
  // created, never the component it supports.
  {
    const {p: q, brief: qb} = journeys.returns;
    let doc = draftJourney(q, {brief: qb, upTo: 5}).document;
    for (const c of doc.realisation.components) delete c.provenance;
    const six = draftChapter(doc, 6, {brief: qb}).records[0];
    doc = applyGuideCommand(doc, {type: 'guide.start', payload: {chapter: 6}}, at, 'architect').document;
    for (const f of creationFields(doc, 6, six.answers)) doc = applyGuideCommand(doc, {type: 'guide.draft-answer', payload: {chapter: 6, field: f.key, answer: six.answers[f.key], basis: guideBasis(doc, 6, null)}}, at, 'architect').document;
    const before = doc, s6 = doc.guidance.sessions.find(x => x.chapter === 6);
    doc = applyGuideCommand(doc, {type: 'guide.commit-draft', payload: {chapter: 6, stamp: compileCreation(doc, 6, s6.creation.answers).stamp, reviewed: true, provenance: six.provenance}}, at, 'architect').document;
    const made = doc.guidance.sessions.find(x => x.chapter === 6).lastCreated, app = doc.realisation.components.find(c => c.id === six.answers.applicationId);
    assert.ok(made.includes(app.id), 'the Chapter 6 commit lists the component it supports among what it touched');
    assert.equal(app.provenance?.journey, undefined, 'and does not mark it: it existed before the commit');
    assert.ok(doc.technology.capabilities.filter(c => !before.technology.capabilities.some(x => x.id === c.id)).every(c => c.provenance.journey.chapter === 6), 'what the commit created carries Chapter 6 provenance');
  }
  pass('guide.commit-draft takes an optional provenance, checked (mode, keys, list sizes, upstream records held, a run for Sol), written to the records the commit created (never to one it only updates, never over an earlier chapter\'s) and the session history; the basis and stamp checks stand; every Chapter 1 type goes through the same chain, the guide starting as a requirement');
}

// ---------------------------------------------------------------- 3. over HTTP, and Sol's journey mode
let llmMode = 'good';
const llm = http.createServer((q, s) => { let body = ''; q.on('data', c => { body += c; }); q.on('end', () => {
  const req = JSON.parse(body || '{}'), name = req.text?.format?.name, input = JSON.parse(req.input?.[0]?.content || '{}');
  let out;
  if (name === 'aiw_journey_draft') {
    const rec = input.records[0], text = rec.fields.find(f => !f.options && !f.numeric);
    out = {answers: llmMode === 'number' ? [{record: rec.key, field: text.key, value: 'Answer within 987654 seconds.', passages: [], sourceRefs: []}] : llmMode === 'foreign' ? [{record: rec.key, field: 'nonsense', value: 'x', passages: [], sourceRefs: []}] : [{record: rec.key, field: text.key, value: 'Drafted from the passages the packet holds.', passages: input.passages.slice(0, 1).map(x => x.id), sourceRefs: input.upstream.slice(0, 1).map(x => x.ref)}]};
  } else out = llmMode === 'defect' ? {supported: false, defects: ['It names a mechanism the packet does not hold.'], notes: []} : {supported: true, defects: [], notes: ['Checked.']};
  s.writeHead(200, {'Content-Type': 'application/json'});
  s.end(JSON.stringify({id: 'resp-1', status: 'completed', model: 'mock-sol', output: [{type: 'message', content: [{type: 'output_text', text: JSON.stringify(out)}]}], usage: {input_tokens: 10, output_tokens: 5}}));
}); });
await new Promise(r => llm.listen(0, '127.0.0.1', r));
const files = new Map();
const env = {DB: localDatabase(':memory:'), OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'mock-sol', AIW_LLM_BASE_URL: `http://127.0.0.1:${llm.address().port}/v1`, FILES: {async put(k, v) { files.set(k, v); }, async get(k) { return files.has(k) ? {text: async () => files.get(k)} : null; }, async delete(k) { files.delete(k); }}, ASSETS: {fetch: () => new Response('asset')}};
const owner = 'architect-j';
const apiWith = async (bindings, path, body, {project = 'returns-http'} = {}) => { const r = await worker.fetch(new Request('https://aiw.test' + path + (path.includes('?') ? '&' : '?') + 'project=' + project, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': owner, Origin: 'https://aiw.test', 'Content-Type': 'application/json'}, body: body ? JSON.stringify(body) : undefined}), bindings); return {status: r.status, data: await r.json()}; };
const api = (path, body, {bindings = env, project = 'returns-http'} = {}) => apiWith(bindings, path, body, {project});
try {
  const created = await worker.fetch(new Request('https://aiw.test/api/projects', {method: 'POST', headers: {'oai-authenticated-user-id': owner, Origin: 'https://aiw.test', 'Content-Type': 'application/json'}, body: JSON.stringify({name: BRIEFS.returns.name, template: 'blank', brief: BRIEFS.returns.text})}), env);
  const project = (await created.json()).document?.id;
  assert.ok(project, 'a blank project with a brief');
  const call = (path, body, opts = {}) => api(path, body, {project, ...opts});
  let ctx = await call('/api/intelligence/journey-context', {chapter: 1});
  assert.equal(ctx.status, 200, JSON.stringify(ctx.data));
  assert.ok(ctx.data.draft.records.length >= 3, 'the server drafts Chapter 1 from the stored brief');
  assert.equal(ctx.data.configuration.configured, true);
  const packet = ctx.data.packet;
  assert.ok(packet.passages.length <= 60 && packet.upstream.length <= 40);
  assert.ok(packet.records.every(r => r.fields.every(f => !['requirementId', 'logicalId', 'from', 'to', 'targetId', 'assetId'].includes(f.key))), 'Sol never chooses which upstream record a draft hangs from');
  assert.equal(packet.brainReceipt.instructions.promptVersion, JOURNEY_PROMPT_VERSION);
  // Without a key: 503, exactly as the other modes.
  const unconfigured = await call('/api/intelligence/journey', {chapter: 1, requestId: crypto.randomUUID(), packetStamp: packet.stamp}, {bindings: {...env, OPENAI_API_KEY: ''}});
  assert.equal(unconfigured.status, 503); assert.match(unconfigured.data.error, /not configured/);
  // A packet that changed is refused; the one the person saw is sent; a run row and a receipt are kept.
  assert.equal((await call('/api/intelligence/journey', {chapter: 1, requestId: crypto.randomUUID(), packetStamp: 'stale'})).status, 409);
  const sent = await call('/api/intelligence/journey', {chapter: 1, requestId: crypto.randomUUID(), packetStamp: packet.stamp});
  assert.equal(sent.status, 200, JSON.stringify(sent.data));
  assert.equal(sent.data.mode, 'journey'); assert.equal(sent.data.groundingReview.accepted, true); assert.equal(sent.data.result.answers.length, 1);
  assert.equal(sent.data.instructions.promptVersion, 'sol-journey-3');
  const row = await env.DB.prepare("SELECT mode,status FROM intelligence_runs WHERE owner_id=? AND id=?").bind(owner, sent.data.id).first();
  assert.deepEqual({...row}, {mode: 'journey', status: 'completed'});
  // A second check that names a defect: the deterministic answers stand, with the reason.
  llmMode = 'defect';
  const refused = await call('/api/intelligence/journey', {chapter: 1, requestId: crypto.randomUUID(), packetStamp: packet.stamp});
  assert.equal(refused.status, 200); assert.equal(refused.data.result.withheld, true); assert.deepEqual(refused.data.result.answers, []); assert.match(refused.data.result.reason, /deterministic/);
  llmMode = 'good';
  pass('over HTTP: the server drafts a chapter from the stored brief without a key; Sol\'s journey mode answers 503 without one, refuses a changed packet, records a run and its prompt pin, and a refused second check leaves the deterministic draft with its reason');

  // The contract and its guards, directly.
  const schema = journeyDraftSchema(packet);
  assert.equal(schema.properties.answers.items.additionalProperties, false);
  const rec = packet.records[0], text = rec.fields.find(f => !f.options && !f.numeric), good = {answers: [{record: rec.key, field: text.key, value: 'A value.', passages: [packet.passages[0].id], sourceRefs: []}]};
  assert.deepEqual(validateJourneyDraft(good, packet).answers.length, 1);
  assert.throws(() => validateJourneyDraft({answers: [{...good.answers[0], field: 'requirementId'}]}, packet), /field/);
  assert.throws(() => validateJourneyDraft({answers: [{...good.answers[0], passages: ['P-999']}]}, packet), /packet/);
  assert.throws(() => validateJourneyDraft({answers: [{...good.answers[0], value: 'x'.repeat(2001)}]}, packet), /2,000/);
  assert.throws(() => validateJourneyDraft({answers: [{...good.answers[0], value: '<b>x</b>'}]}, packet), /markup/);
  const choice = rec.fields.find(f => f.options);
  if (choice) assert.throws(() => validateJourneyDraft({answers: [{record: rec.key, field: choice.key, value: 'not-an-option', passages: [], sourceRefs: []}]}, packet), /option/);
  assert.match(guardJourneyDraft(packet, {answers: [{...good.answers[0], value: 'Answer within 987654 seconds.'}]}).join(' '), /987654/);
  assert.match(guardJourneyDraft(packet, {answers: [{...good.answers[0], value: 'This guarantees zero loss.'}]}).join(' '), /guarantee/);
  const answers = [{answers: good.answers}, {supported: true, defects: [], notes: []}].map(x => ({id: 'r', status: 'completed', output: [{type: 'message', content: [{type: 'output_text', text: JSON.stringify(x)}]}], usage: {}}));
  const drafted = await requestJourneyDraft({OPENAI_API_KEY: 'k', AIW_LLM_MODEL: 'm', AIW_LLM_BASE_URL: 'http://127.0.0.1:9/v1'}, packet, {fetcher: async () => new Response(JSON.stringify(answers.shift()), {status: 200})});
  assert.equal(drafted.groundingReview.accepted, true); assert.equal(drafted.instructions.sha256, journeyInstructionsPin().sha256);
  assert.throws(() => journeyRequest({chapter: 12}), /chapter/);
  assert.throws(() => journeyPacket(journeys.returns.p, {chapter: 1}, {chapter: 2, records: []}, journeys.returns.brief), /chapter/);
  pass('Sol\'s journey contract: the chapter\'s own fields only, never the upstream choice, options by id, passages and refs inside the packet, at most 2,000 characters, no markup, no number the packet lacks, nothing guaranteed or verified; the prompt pin is recorded');

  // rc41 live run (audit/rc41/live/IMPROVEMENTS-2026-10-29.md, Fix now 8): the live probe's brief project, a blank
  // project keeping the clinic-appointments reference brief, drafts 24 Chapter 1 records, and the first twelve in draft
  // order were its outcomes, steps, actors and stakeholders: none of its requirements, constraints or scope reached Sol.
  // The bound stays twelve; the records that bind the design go first, and omissions names what was left out.
  {
    const tier = r => ({requirement: 0, constraint: 0, scope: 0, outcome: 1, journey: 1, assumption: 1, actor: 2, stakeholder: 2})[r.type] ?? 1;
    const made = await worker.fetch(new Request('https://aiw.test/api/projects', {method: 'POST', headers: {'oai-authenticated-user-id': owner, Origin: 'https://aiw.test', 'Content-Type': 'application/json'}, body: JSON.stringify({name: 'Sol live check · brief', template: 'blank', brief: referenceBrief('clinic-appointments')})}), env);
    const clinic = (await made.json()).document?.id, c = await api('/api/intelligence/journey-context', {chapter: 1}, {project: clinic});
    assert.equal(c.status, 200, JSON.stringify(c.data));
    const {draft: d, packet: k} = c.data, guided = d.records.filter(r => r.kind === 'guided'), sent = new Set(k.records.map(r => r.key)), binding = guided.filter(r => tier(r) === 0);
    assert.ok(guided.length > JOURNEY_SOL_LIMITS.records && binding.length < JOURNEY_SOL_LIMITS.records && ['requirement', 'constraint', 'scope'].every(t => binding.some(r => r.type === t)), `the brief drafts more records than the bound, every kind that binds the design among them (${guided.length} records, ${binding.length} binding)`);
    assert.equal(k.records.length, JOURNEY_SOL_LIMITS.records, 'the twelve-record bound is unchanged');
    assert.deepEqual(binding.filter(r => !sent.has(r.key)).map(r => r.key), [], 'every requirement, constraint and scope boundary of Chapter 1 reaches Sol');
    const expected = guided.map((r, i) => [r, i]).sort((a, b) => tier(a[0]) - tier(b[0]) || a[1] - b[1]).map(([r]) => r);
    assert.deepEqual(k.records.map(r => r.key), expected.slice(0, JOURNEY_SOL_LIMITS.records).map(r => r.key), 'requirements, constraints and scope first, then outcomes, steps and assumptions, then actors and stakeholders, in draft order within each');
    assert.deepEqual(k.omissions.records, expected.slice(JOURNEY_SOL_LIMITS.records).map(r => ({key: r.key, type: r.type})), 'omissions names exactly the records left out, each with its type, in the order they would have been sent');
    const passages = interpretBrief(referenceBrief('clinic-appointments'), {name: 'Sol live check · brief'}).passages.map(x => x.id), cited = new Set(k.records.flatMap(r => guided.find(x => x.key === r.key).provenance.passages));
    assert.ok([...cited].every(id => k.passages.some(x => x.id === id)), 'every passage a sent record cites is in the packet');
    assert.deepEqual(k.omissions.passages, passages.filter(id => !k.passages.some(x => x.id === id)), 'omissions names exactly the brief passages left out');
    assert.deepEqual([k.passages.length + k.omissions.passages.length, k.omissions.excluded, k.brainReceipt.reasoning], [passages.length, 0, 'aiw-journey-draft-3']);
  }
  // The passage bound admits the passages the sent records cite before the brief's others, and a record the disclosure
  // policy withholds is counted, never named; its passages win no place.
  {
    const P = n => 'P-' + String(n).padStart(3, '0'), brief = {passages: Array.from({length: 70}, (_, i) => ({id: P(i + 1), text: `Passage ${i + 1} of the brief.`}))};
    const rec = (key, type, cites, upstream = []) => ({key, kind: 'guided', type, title: `${type} ${key}`, fields: [{key: 'title', label: 'Title', value: `${type} ${key}`, basis: 'stated', passages: cites}], provenance: {mode: 'deterministic', passages: cites, upstream, claimIds: [], playbook: []}});
    const actors = Array.from({length: 12}, (_, i) => rec('a' + (i + 1), 'actor', [P(i + 1)]));
    const draft = {chapter: 1, title: 'Context', records: [...actors, rec('q1', 'requirement', [P(65), P(70)]), rec('private-constraint', 'constraint', [P(69)], ['PRIVATE-1'])], citations: []};
    const k = journeyPacket({workspace: {aiPolicy: {excludedObjectIds: ['PRIVATE-1']}}}, {chapter: 1}, draft, brief), ids = k.passages.map(x => x.id);
    assert.deepEqual(k.records.map(r => r.key), ['q1', ...actors.slice(0, 11).map(r => r.key)], 'the requirement is sent before the actors');
    assert.deepEqual([k.omissions.records, k.omissions.excluded], [[{key: 'a12', type: 'actor'}], 1], 'the actor the bound leaves out is named; the withheld record is counted');
    assert.ok(!JSON.stringify(k).includes('private-constraint'), 'the withheld record is never named');
    assert.equal(ids.length, JOURNEY_SOL_LIMITS.passages);
    assert.ok([P(65), P(70)].every(id => ids.includes(id)), 'the passages the sent requirement cites beyond the sixtieth are admitted');
    assert.deepEqual(ids, brief.passages.map(x => x.id).filter(id => ids.includes(id)), 'the packet keeps the brief\'s order');
    assert.deepEqual(k.omissions.passages, [59, 60, 61, 62, 63, 64, 66, 67, 68, 69].map(P), 'omissions names exactly the passages left out, the withheld record\'s among them');
  }
  pass('the journey packet keeps its twelve-record bound and sends Chapter 1\'s requirements, constraints and scope first, then outcomes, steps and assumptions, then actors and stakeholders (the live probe\'s clinic-appointments brief project: all of them reach Sol); the passages the sent records cite are admitted first; omissions names each record and passage the bounds leave out, and counts, never names, a record the disclosure policy withholds');

  // Draft, accept and edit over HTTP: a scenario committed through the guide keeps where it was drafted from when a
  // person saves it again through Chapter 2's own command, marked edited with the fields that changed; an unrelated
  // save marks nothing.
  {
    let state = await call('/api/project'), revision = state.data.revision, doc = state.data.document;
    const send = async command => { const r = await call('/api/commands', {revision, command}); assert.equal(r.status, 200, JSON.stringify(r.data)); revision = r.data.revision; doc = r.data.document; return r; };
    const answersOf = ch => doc.guidance.sessions.find(x => x.chapter === ch && x.objectId === 'project').creation.answers;
    const accept = async (ch, rec) => {
      await send({type: 'guide.start', payload: {chapter: ch}});
      for (const [k, v] of Object.entries(answersOf(ch))) if (rec.answers[k] !== undefined && rec.answers[k] !== v) await send({type: 'guide.draft-answer', payload: {chapter: ch, field: k, answer: rec.answers[k], basis: guideBasis(doc, ch, null)}});
      for (let i = 0; i < 40; i++) { const a = answersOf(ch), f = creationFields(doc, ch, a).find(x => !Object.hasOwn(a, x.key)); if (!f) break; await send({type: 'guide.draft-answer', payload: {chapter: ch, field: f.key, answer: String(rec.answers[f.key] ?? ''), basis: guideBasis(doc, ch, null)}}); }
      await send({type: 'guide.commit-draft', payload: {chapter: ch, stamp: compileCreation(doc, ch, answersOf(ch)).stamp, reviewed: true, provenance: rec.provenance}});
      return doc.guidance.sessions.find(x => x.chapter === ch && x.objectId === 'project').lastCreated;
    };
    // Chapter 1 in the draft's order: the context records, then the requirements naming them.
    let reqId = null;
    for (const rec of ctx.data.draft.records) { const [made] = await accept(1, rec); if (rec.type === 'requirement' && !reqId) reqId = made; }
    const linked = doc.artefacts.find(a => a.id === reqId);
    assert.ok(doc.relationships.some(x => x.from === reqId || x.to === reqId), `${linked.id} was linked as it was made`);
    assert.equal((doc.changes?.events || []).length, 0, 'committing the drafted records raised no change to review');
    const two = await call('/api/intelligence/journey-context', {chapter: 2});
    assert.equal(two.status, 200);
    const [driverId] = await accept(2, two.data.draft.records[0]);
    const before = doc.quality.drivers.find(x => x.id === driverId);
    assert.equal(before.provenance.journey.edited, undefined);
    const {provenance: _drop, ...form} = before;
    await send({type: 'quality.driver', payload: {...form, title: before.title + ' — checked with the librarians', conditions: 'Weekday opening hours'}});
    const after = doc.quality.drivers.find(x => x.id === driverId);
    assert.equal(after.title, before.title + ' — checked with the librarians');
    assert.deepEqual({...after.provenance.journey, editedAt: undefined}, {...before.provenance.journey, edited: true, editedFields: ['conditions', 'title'], editedAt: undefined}, 'provenance.journey survives the save, marked edited with the fields that changed');
    assert.equal(after.confirmed, false, 'an edit confirms nothing');
    assert.equal(doc.artefacts.find(a => a.id === reqId).provenance.journey.edited, undefined, 'a save of another record marks nothing on this one');
  }
  pass('over HTTP: a drafted record committed through the guide keeps provenance.journey when a person saves it again through its chapter\'s own command, marked edited with the changed fields; other records are not marked');

  // The deterministic draft served over HTTP is the drafter's own.
  const doc = (await call('/api/project')).data.document;
  const fresh = await call('/api/intelligence/journey-context', {chapter: 1});
  assert.deepEqual(fresh.data.draft.records.map(r => r.answers), draftChapter(doc, 1, {brief: interpretBrief(BRIEFS.returns.text, {name: BRIEFS.returns.name})}).records.map(r => r.answers));
  ctx = await call('/api/intelligence/journey-context', {chapter: 0});
  assert.equal(ctx.status, 400);
  pass('the served draft is the drafter\'s own for the stored brief; a chapter outside 1–11 is refused');
} finally { env.DB.close(); llm.close(); }

// ---------------------------------------------------------------- 4. a model in (round 6, Contract I)
// The bike-share brief with a model beside it: the Structurizr fixture through all eleven chapters, the BPMN fixture's
// process commands, the ArchiMate fixture's kinds, the MADR fixture's decision. Without a model, byte for byte as before.
{
  const bikes = BRIEFS.bikes, fixture = f => readFileSync('evaluation/model-fixtures/' + f, 'utf8');
  const start = (file, brief = bikes.text) => {
    const text = fixture(file), p = createProject({name: bikes.name, template: 'blank', brief, model: {text, name: file, kind: file.split('.').pop()}}, 'model-' + file, at, {briefHash: brief ? sha256(brief.trim()) : ''});
    const src = p.coauthoring.sources.find(x => x.kind === 'model');
    return {p, text, src, model: {...interpretModel(text, {name: file}), sourceId: src.id}, brief: brief ? interpretBrief(brief, {name: bikes.name}) : null};
  };
  for (const [id, j] of Object.entries(journeys)) {
    assert.equal(JSON.stringify(draftJourney(j.p, {brief: j.brief, model: null}).chapters), JSON.stringify(j.run.chapters), `${id}: without a model the journey is byte for byte what it was`);
    assert.equal(JSON.stringify(draftJourney(j.p, {brief: j.brief, model: {format: 'structurizr', passages: [], elements: [], relationships: []}}).chapters), JSON.stringify(j.run.chapters), `${id}: an empty model changes nothing`);
    assert.deepEqual(modelSource(j.p), {text: '', sourceId: null, name: '', format: '', kept: false, note: 'This project keeps no model source.'});
  }
  const S = start('bike-share.dsl'), before = JSON.stringify(S.p), kept = modelSource(S.p);
  assert.deepEqual([kept.kept, kept.sourceId, kept.name, kept.format, kept.text === S.text, S.src.id], [true, 'SRC-002', 'bike-share.dsl', 'structurizr', true, 'SRC-002'], 'the model is the second source, after the brief');
  const M = modelOf(S.model);
  assert.deepEqual([M.elements.length, M.relationships.length, M.sourceId, M.empty, M.children.get(M.elements.find(e => e.name === 'Bike share platform').id).length], [26, 13, 'SRC-002', false, 7]);
  assert.equal(modelOf(null), null); assert.equal(modelOf({elements: [{id: 'E-001'}]}).elements.length, 0, 'an element without a name is not read');
  const run = draftJourney(S.p, {brief: S.brief, model: S.model, at}), doc = run.document, modelIds = new Set(S.model.passages.map(x => x.id)), briefIds = new Set(S.brief.passages.map(x => x.id));
  assert.equal(JSON.stringify(S.p), before, 'the input is never changed');
  assert.equal(JSON.stringify(draftJourney(S.p, {brief: S.brief, model: S.model, at}).chapters), JSON.stringify(run.chapters), 'the same brief and model draft the same journey');
  const said = (src, ids) => src.passages.filter(x => ids.includes(x.id)).map(x => x.text).join(' ').toLowerCase().replace(/\s+/g, ' ');
  measured.model = {};
  for (const d of run.chapters) {
    const ch = d.chapter;
    assert.equal(d.mode, 'model', `Chapter ${ch} says it was drafted with the model`);
    assert.deepEqual([d.model.sourceId, d.model.name, d.model.format, d.model.elements], ['SRC-002', 'bike-share.dsl', 'structurizr', 26]);
    assert.ok(d.records.length >= 1, `Chapter ${ch} drafts at least one record`);
    assert.deepEqual(d.records.filter(r => r.blocked).map(r => r.key + ': ' + r.blocked), [], `Chapter ${ch}: no record its rules could not compile`);
    for (const r of d.records) {
      assert.equal(r.kind, 'guided');
      assert.deepEqual(Object.keys(r.answers).sort(), creationFields(doc, ch, r.answers).map(f => f.key).sort(), `Chapter ${ch} ${r.key} answers exactly the chapter's creation questions`);
      const own = r.provenance.mode === 'model', ids = own ? modelIds : briefIds, src = own ? S.model : S.brief;
      if (own) { assert.equal(r.provenance.sourceId, 'SRC-002', `${ch} ${r.key} names the model source`); assert.match(r.element, /^[ER]-\d{3}$/, `${ch} ${r.key} names the element or relationship it was read from`); } else { assert.equal(r.provenance.mode, 'deterministic'); assert.equal(r.provenance.sourceId, undefined); assert.equal(r.element, undefined); }
      for (const pid of r.provenance.passages) assert.ok(ids.has(pid), `${ch} ${r.key} cites ${pid} of the ${own ? 'model' : 'brief'}`);
      for (const f of r.fields) {
        assert.ok(['stated', 'inferred', 'upstream', 'gap'].includes(f.basis));
        assert.ok(f.basis === 'gap' || f.passages.length || f.upstream.length, `${ch} ${r.key}.${f.key} cites a line or an upstream record, or is a gap`);
        for (const pid of f.passages) assert.ok(ids.has(pid), `${ch} ${r.key}.${f.key} cites ${pid} of the ${own ? 'model' : 'brief'}`);
        // A model record's stated value is a span of the model lines it cites; a brief record's stated value cites its passage, as the brief path has always held.
        if (f.basis === 'stated' && own) assert.ok(f.passages.length && said(src, f.passages).includes(String(f.value).toLowerCase().replace(/[.!?;:]+$/, '').replace(/\s+/g, ' ')), `${ch} ${r.key}.${f.key} stated: "${f.value}" is in the model lines it cites`);
        if (f.basis === 'stated') assert.ok(f.passages.length, `${ch} ${r.key}.${f.key} stated: cites the passage that states it`);
      }
      assert.deepEqual(journeyProvenance(doc, r.provenance), r.provenance, `${ch} ${r.key}: its provenance passes the guide's own check`);
    }
    for (const c of d.citations) assert.ok(['governed-claim', 'brain-method'].includes(c.kind));
    const fields = d.records.flatMap(r => r.fields);
    measured.model[ch] = {records: d.records.length, fromModel: d.records.filter(r => r.provenance.mode === 'model').length, fromBrief: d.records.filter(r => r.provenance.mode !== 'model').length, stated: fields.filter(f => f.basis === 'stated').length, inferred: fields.filter(f => f.basis === 'inferred').length, upstream: fields.filter(f => f.basis === 'upstream').length, gaps: fields.filter(f => f.basis === 'gap').length};
  }
  const [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11] = run.chapters, titled = (d, t) => d.records.find(r => r.title === t) || assert.fail(`no record "${t}" in Chapter ${d.chapter}`), field = (r, k) => r.fields.find(f => f.key === k);
  // Chapter 1: the model's three people as actors; the brief's actors stand aside; the brief's other kinds follow, the requirements last.
  assert.deepEqual(c1.records.filter(r => r.provenance.mode === 'model').map(r => [r.type, r.title]), [['actor', 'Resident'], ['actor', 'Transport team'], ['actor', 'Rebalancing contractor']]);
  assert.ok(!c1.records.some(r => r.type === 'actor' && r.provenance.mode !== 'model'), 'the brief\'s actors are not drafted beside the model\'s');
  for (const t of ['outcome', 'journey', 'stakeholder', 'scope', 'constraint', 'assumption', 'requirement']) assert.ok(c1.records.some(r => r.type === t && r.provenance.mode === 'deterministic'), `${t} comes from the brief`);
  assert.ok(c1.records.findIndex(r => r.type === 'requirement') > c1.records.map(r => r.type !== 'requirement').lastIndexOf(true), 'the requirements come after the records they name');
  const resident = titled(c1, 'Resident');
  assert.deepEqual([field(resident, 'type').value, field(resident, 'title').basis, field(resident, 'description').basis, field(resident, 'description').value, field(resident, 'owner').basis, field(resident, 'source').basis, field(resident, 'source').value], ['actor', 'stated', 'stated', 'Signs up, unlocks a bike, rides and pays the fee.', 'gap', 'inferred', 'bike-share.dsl · ' + resident.provenance.passages[0]]);
  assert.match(field(resident, 'type').note, /read P-\d{3} \(person\) as an actor/);
  // Chapters 2 and 3: the model names no driver and no decision, so the brief rules draft them, deterministic.
  assert.ok(c2.records.length >= 9 && c2.records.every(r => r.provenance.mode === 'deterministic') && c3.records.length >= 4 && c3.records.every(r => r.provenance.mode === 'deterministic'), 'Chapters 2 and 3 fall back to the brief rules');
  // Chapter 4: a responsibility per container, title and purpose stated; the system that holds them is the whole.
  assert.deepEqual(c4.records.map(r => r.title), ['Mobile app', 'Dock gateway', 'Trip service', 'Pricing and payment service', 'Fleet console', 'Trip store', 'Trip events']);
  assert.ok(c4.records.every(r => r.provenance.mode === 'model' && field(r, 'title').basis === 'stated' && field(r, 'purpose').basis === 'stated' && field(r, 'boundary').basis === 'inferred' && field(r, 'owner').basis === 'gap'));
  assert.equal(field(titled(c4, 'Trip service'), 'purpose').value, 'Records each trip exactly once, from unlock to return.');
  assert.match(field(titled(c4, 'Trip service'), 'boundary').value, /^Outside: Mobile app; Dock gateway; Pricing and payment service; Fleet console\.$/);
  assert.ok(c4.records.every(r => /^REQ-\d{3}$/.test(r.answers.requirementId)), 'each develops a requirement of the brief');
  // Chapter 5: a component per container with its role from the technology and tags, realising the responsibility of the same name, its inputs and outputs from the relationships.
  const role = t => titled(c5, t).answers.kind;
  assert.deepEqual([role('Trip store'), role('Trip events'), role('Dock gateway'), role('Trip service'), role('Mobile app'), role('Fleet console')], ['store', 'queue', 'adapter', 'service', 'service', 'service']);
  const trip5 = titled(c5, 'Trip service');
  assert.equal(trip5.answers.logicalId, doc.logical.responsibilities.find(x => x.title === 'Trip service').id, 'the responsibility of the same name');
  assert.deepEqual([field(trip5, 'logicalId').note, field(trip5, 'boundary').basis, field(trip5, 'inputs').basis], ['The responsibility of the same name.', 'stated', 'inferred']);
  assert.match(trip5.answers.inputs, /Mobile app: asks for docks and unlocks a bike; Dock gateway: reports unlock and return events\./);
  assert.match(trip5.answers.outputs, /Reads and writes trips to Trip store; Publishes trip completed to Trip events; Sends the sign-up confirmation to Email service\./);
  // Chapter 6: the model names no service, capability or technology element; the brief rules draft the capabilities.
  assert.ok(c6.records.length >= 5 && c6.records.every(r => r.provenance.mode === 'deterministic'));
  // Chapter 7: an implementation per capability whose component the model names a technology for; the technology is option A, stated.
  assert.ok(c7.records.length >= 5 && c7.records.every(r => r.provenance.mode === 'model'));
  const storePlan = c7.records.find(r => /Trip store/.test(r.title));
  assert.deepEqual([storePlan.answers.optionA, field(storePlan, 'optionA').basis, storePlan.answers.operatingA, storePlan.answers.operatingB, /Provider-managed/.test(storePlan.answers.optionB)], ['Relational database', 'stated', 'Self managed', 'Provider managed', true]);
  // Chapter 8: a contract per relationship between containers and to an external system (a new party), events where the model says so, the data the noun the label names.
  assert.equal(c8.records.length, 10); assert.ok(c8.records.every(r => r.provenance.mode === 'model' && field(r, 'title').basis === 'stated'));
  const kind8 = Object.fromEntries(c8.records.map(r => [r.title, r.answers.kind]));
  assert.deepEqual([kind8['Asks for docks and unlocks a bike'], kind8['Reports unlock and return events'], kind8['Publishes trip completed'], kind8['Subscribes to trip completed'], kind8['Reads and writes trips'], kind8['Charges the fee to the tokenised card']], ['request', 'event', 'event', 'event', 'request', 'request']);
  assert.deepEqual(c8.records.filter(r => r.answers.to === 'new-external').map(r => [r.answers.externalTitle, field(r, 'externalTitle').basis]), [['Dock hardware', 'stated'], ['Payment provider', 'stated'], ['Email service', 'stated']]);
  const asks = titled(c8, 'Asks for docks and unlocks a bike');
  assert.deepEqual([asks.answers.from, asks.answers.to, asks.answers.authorityId, asks.answers.classification, field(asks, 'classification').basis, asks.answers.operation], [doc.realisation.components.find(x => x.title === 'Mobile app').id, doc.realisation.components.find(x => x.title === 'Trip service').id, doc.realisation.components.find(x => x.title === 'Mobile app').id, 'Internal', 'gap', 'asks-for-docks-and-unlocks-a-bike']);
  assert.deepEqual(doc.interfaces.parties.map(x => x.title), ['Dock hardware', 'Payment provider', 'Email service']);
  assert.ok(doc.interfaces.data.every(x => x.fields.some(f => f.key && f.required) && x.fields.some(f => f.name === 'status')), 'the data is keyed with a status field, as every drafted data is');
  // Chapter 9: the brief rules. Chapter 10: a plan per placed component: the zone its node, the failure domain the outermost node, the stage from "Live", the replicas the instance count the model states.
  assert.ok(c9.records.length >= 1 && c9.records.every(r => r.provenance.mode === 'deterministic'));
  assert.equal(c10.records.length, 6); assert.ok(c10.records.every(r => r.provenance.mode === 'model'));
  const plan = t => c10.records.find(r => r.title.startsWith(t + ' '));
  assert.deepEqual([plan('Trip service').answers.replicas, plan('Trip store').answers.replicas, plan('Dock gateway').answers.replicas, plan('Trip service').answers.stage, plan('Trip service').answers.zone, plan('Trip service').answers.failureDomain, plan('Dock gateway').answers.zone, field(plan('Dock gateway'), 'failureDomain').basis], ['2', '1', '40', 'Production design', 'Application cluster', 'Council cloud region', 'Dock sites', 'gap'], 'the dock sites sit under no outer node, so their failure domain is an open question');
  assert.deepEqual([field(plan('Trip service'), 'replicas').basis, field(plan('Trip service'), 'zone').basis, field(plan('Trip service'), 'stage').basis, field(plan('Trip service'), 'readiness').basis], ['stated', 'stated', 'inferred', 'gap']);
  assert.equal(c11.records.length, 1);
  // After the journey: what the model drafted carries provenance.journey {mode: 'model', sourceId} citing the model's lines; what the brief rules drafted stays deterministic; nothing is confirmed.
  const ofModel = xs => xs.length && xs.every(x => x.provenance?.journey?.mode === 'model' && x.provenance.journey.sourceId === 'SRC-002' && x.provenance.journey.passages.every(id => modelIds.has(id)));
  assert.ok(ofModel(doc.logical.responsibilities) && ofModel(doc.realisation.components) && ofModel(doc.interfaces.contracts) && ofModel(doc.interfaces.parties) && ofModel(doc.runtime.plans) && ofModel(doc.technologyRealisation.records) && ofModel(doc.artefacts.filter(a => a.type === 'actor')), 'the model\'s records carry mode model with the source and its lines');
  assert.ok(doc.artefacts.filter(a => a.type !== 'actor').every(a => a.provenance.journey.mode === 'deterministic' && a.provenance.journey.passages.every(id => briefIds.has(id))) && doc.quality.drivers.every(x => x.provenance.journey.mode === 'deterministic') && doc.decisions.records.every(x => x.provenance.journey.mode === 'deterministic'), 'the brief\'s records keep the deterministic provenance with the brief\'s passages');
  assert.deepEqual(everyRecord(doc).filter(r => r?.confirmed === true || r?.targetConfirmed === true).map(r => r.id), [], 'nothing is confirmed');
  for (const c of CHAPTERS) assert.deepEqual(c.checks(doc).filter(f => f.code === 'source-change' || f.code === 'key').map(f => f.code), [], `Chapter ${c.id} raises no source-change or key finding`);
  for (const ch of [1, 4, 5, 7, 8, 10]) assert.equal(draftChapter(doc, ch, {brief: S.brief, model: S.model}).records.length, 0, `Chapter ${ch} drafts only what the project does not hold`);
  const afterOne = draftJourney(S.p, {brief: S.brief, model: S.model, upTo: 1, at}).document;
  assert.equal(JSON.stringify(modelDraft(afterOne, 4, S.model)), JSON.stringify(draftChapter(afterOne, 4, {model: S.model}).records), 'modelDraft is the records of the chapter drafted from the model');
  assert.equal(JSON.stringify(draftChapter(afterOne, 4, {brief: S.brief, model: S.model}).records), JSON.stringify(modelDraft(afterOne, 4, S.model)), 'with the model naming elements for the chapter, the brief is not read for it');
  assert.equal(draftChapter(S.p, 4, {brief: S.brief, model: S.model}).note, 'Chapter 4 develops a requirement; draft Chapter 1 first.');
  pass('a model in (Structurizr): the brief with the model beside it through all eleven chapters; the model\'s people, containers, technologies, relationships and placements become actors, responsibilities, components with their roles, implementation options, contracts and parties (events where the model says so) and operating plans with the stated instance counts, each value stated when the model\'s line holds it; Chapters 2, 3, 6 and 9 fall back to the brief rules; every record names its source and its lines and passes the guide\'s check; without a model the journey is byte for byte what it was');

  // BPMN: the tasks become journey steps in the order the flows run; the events, gateways and flows follow the last step as process commands with the Contract T fields.
  const B = start('bike-share.bpmn'), one = draftChapter(B.p, 1, {brief: B.brief, model: B.model}), steps = one.records.filter(r => r.type === 'journey');
  assert.deepEqual(steps.map(r => r.title), ['Present card or app at the dock', 'Validate the member', 'Release the lock', 'Record the trip', 'Store the trip segment', 'Charge the fee', 'Send the receipt', 'Ask the member to update the card'], 'the tasks in the order the flows run; the sub-process and the tasks inside it are steps');
  assert.ok(steps.every(r => r.provenance.mode === 'model' && field(r, 'order').basis === 'inferred' && field(r, 'title').basis === 'stated'));
  assert.ok(!one.records.some(r => r.type === 'journey' && r.provenance.mode !== 'model'), 'the brief\'s steps stand aside');
  assert.ok(one.records.some(r => r.type === 'actor' && r.provenance.mode === 'deterministic'), 'the pools are not people: the brief\'s actors are drafted');
  const last = steps.at(-1), elements = last.extras.filter(c => c.type === 'process.element'), flows = last.extras.filter(c => c.type === 'process.transition'), stepId = t => steps.find(r => r.title === t).creates[0];
  assert.equal(elements.length, 11, 'seven events, three gateways and the sub-process that holds two of the events');
  const el = t => elements.find(c => c.payload.title === t).payload;
  assert.deepEqual(Object.keys(el('Unlock requested')), ['kind', 'title', 'purpose', 'lane', 'owner', 'source', 'sourceLocator', 'requirementIds', 'eventType', 'position', 'attachedTo', 'gatewayType', 'parentId', 'partyId', 'dataId'], 'the process.element payload carries the Contract T fields');
  assert.deepEqual([el('Unlock requested').kind, el('Unlock requested').eventType, el('Unlock requested').position, el('Unlock requested').lane, el('Unlock requested').gatewayType, el('Unlock requested').parentId], ['event', 'message', 'start', 'Dock gateway', '', '']);
  assert.deepEqual([el('Bike returned').eventType, el('Bike returned').position, el('Charge failed').eventType, el('Charge failed').position, el('Charge failed').attachedTo, el('Trip complete').position, el('Unlock refused').eventType], ['timer', 'intermediate', 'error', 'boundary', stepId('Charge the fee'), 'end', 'none']);
  assert.deepEqual([el('Member valid?').kind, el('Member valid?').gatewayType, el('Charge and notify').gatewayType, el('Both done').gatewayType, el('Both done').lane], ['gateway', 'exclusive', 'parallel', 'parallel', 'Trip service']);
  assert.deepEqual(elements.filter(c => c.payload.parentId).map(c => [c.payload.title, c.payload.parentId]), [['start event', '@ref:model:' + B.model.elements.find(e => e.name === 'Record the trip').id + ':sub'], ['end event', '@ref:model:' + B.model.elements.find(e => e.name === 'Record the trip').id + ':sub']], 'the sub-process\'s own events name their parent step');
  assert.ok(elements.every(c => /^@ref:model:E-\d{3}(:sub)?$/.test(c.ref) && /^bike-share\.bpmn · P-\d{3}$/.test(c.payload.source) && /^P-\d{3}$/.test(c.payload.sourceLocator) && c.payload.owner === '' && c.payload.partyId === '' && c.payload.dataId === ''), 'each names the model file and the line it came from, and the reference the flows use');
  assert.equal(flows.length, 17, 'the sequence flows; the message flows end at pools, which are not process objects');
  assert.ok(flows.every(c => c.payload.kind === 'sequence' && c.payload.label && c.payload.condition && c.payload.contractId === '' && /^bike-share\.bpmn · P-\d{3}$/.test(c.payload.source)));
  const valid = flows.find(c => c.payload.label === 'Valid'), notValid = flows.find(c => c.payload.label === 'Not valid'), plain = flows.find(c => c.payload.from === stepId('Present card or app at the dock'));
  assert.deepEqual([valid.payload.from, valid.payload.to, valid.payload.condition, notValid.payload.condition, plain.payload.to, plain.payload.label, plain.payload.condition], ['@ref:model:' + B.model.elements.find(e => e.name === 'Member valid?').id, stepId('Release the lock'), 'member.valid == true', 'No condition stated in the model for Not valid.', stepId('Validate the member'), 'Present card or app at the dock → Validate the member', 'Follows when Present card or app at the dock completes.']);
  // Applied as the person's commit applies them (workspace.apply, each element then the flows): the process model holds the elements and the flows between the steps.
  const afterB = draftJourney(B.p, {brief: B.brief, model: B.model, upTo: 1, at}).document, pm = afterB.processModel;
  assert.deepEqual([pm.elements.length, pm.transitions.length], [11, 17]);
  const made = pm.elements.find(e => e.title === 'Unlock requested'), madeT = pm.transitions.find(t => t.label === 'Valid');
  assert.deepEqual([made.kind, made.lane, made.confirmed, made.origin, made.source, made.sourceLocator, made.purpose], ['event', 'Dock gateway', false, 'architect', el('Unlock requested').source, el('Unlock requested').sourceLocator, '']);
  assert.deepEqual([madeT.from, madeT.to, madeT.condition, madeT.confirmed], [pm.elements.find(e => e.title === 'Member valid?').id, afterB.artefacts.find(a => a.title === 'Release the lock').id, 'member.valid == true', false], 'a flow from an element made in the same batch names the id it was given');
  // Today's process record keeps kind, title, purpose, lane, owner, source and locator: the Contract T fields are in the
  // commands above and not yet on the records. These two assertions tighten to the records once the process model lands.
  assert.deepEqual([made.eventType, made.position, madeT.kind], ['message', 'start', 'sequence'], 'the records carry the event type, its position and the flow kind (Contract T)');
  pass('a model in (BPMN): the tasks become journey steps in flow order, the sub-process and its tasks among them; the last step carries the events and gateways as process.element commands with eventType, position, attachedTo, gatewayType and parentId, and the sequence flows as process.transition commands with their conditions, each naming the model file and its line; applied as the commit applies them, the process model holds ten elements and seventeen flows, unconfirmed');

  // ArchiMate: every kind the model names takes its chapter; a flow is an event; an interface to a node is left for the person.
  const A = start('bike-share.archimate.xml'), runA = draftJourney(A.p, {brief: A.brief, model: A.model, at}), [a1, a2, , a4, a5, a6, , a8, , a10] = runA.chapters, dA = runA.document;
  assert.deepEqual(a1.records.filter(r => r.provenance.mode === 'model').map(r => [r.type, r.title]), [['actor', 'Resident'], ['actor', 'Member'], ['stakeholder', 'Transport team'], ['outcome', 'Fewer car journeys in the neighbourhood'], ['outcome', 'Two thousand trips a day in the first year'], ['journey', 'Unlock a bike'], ['journey', 'Return the bike'], ['constraint', 'Record once, charge once'], ['constraint', 'Trip locations kept no longer than ninety days'], ['requirement', 'Unlock a bike within three seconds'], ['requirement', 'No rebalancing list yet']]);
  assert.deepEqual([...new Set(a1.records.filter(r => r.provenance.mode !== 'model').map(r => r.type))].sort(), ['assumption', 'scope'], 'the brief adds only the kinds the model does not name');
  assert.deepEqual(a2.records.map(r => [r.title, r.provenance.mode, field(r, 'title').basis]), [['Fast unlock at the dock', 'model', 'stated']]);
  assert.deepEqual(a4.records.map(r => r.title), ['Trip service', 'Pricing and payment service'], 'application components; the interface and the grouping are not responsibilities');
  assert.deepEqual(a5.records.map(r => r.title), ['Trip service', 'Pricing and payment service']);
  assert.deepEqual(a6.records.map(r => [r.title, r.answers.category]), [['Bike hire', 'compute'], ['Trip recording', 'compute'], ['Relational database', 'transactional'], ['Container hosting', 'compute'], ['Fleet rebalancing', 'compute'], ['Bike fleet', 'compute']]);
  assert.ok(a6.records.every(r => r.provenance.mode === 'model' && field(r, 'title').basis === 'stated'));
  assert.deepEqual(a8.records.map(r => [r.title, r.answers.kind, field(r, 'kind').note]), [['Trip completed', 'event', 'The model draws it as a flow or a message: something passes without a reply.']]);
  assert.match(a8.note, /1 relationship into the design from outside, or from an element that is not yet a component, is not drafted: Dock → Trip service\./, 'the Dock API serves the Dock, a node: the caller is no component, so the person decides');
  assert.deepEqual(a10.records.map(r => [r.title, r.answers.zone, r.answers.replicas, field(r, 'stage').basis]), [['Trip service production design', 'Application cluster', '1', 'gap']], 'a node that realises the component places it; no environment is named, so the stage is open');
  assert.ok(dA.quality.drivers.length === 1 && dA.quality.drivers[0].provenance.journey.mode === 'model' && dA.interfaces.contracts[0].kind === 'event');
  pass('a model in (ArchiMate): actors and roles, a stakeholder, goals and outcomes, processes as steps in triggering order, a principle and a constraint, requirements and gaps, a driver as a quality scenario, components, services and capabilities with their categories, a flow as an event contract, a realising node as a placement; what is not yet a component is left for the person and said so');

  // MADR: a decision from the record, the chosen alternative first with the reason the record gives, the good and bad lines as the trade-off.
  const D = start('bike-share-decision.md'), runD = draftJourney(D.p, {brief: D.brief, model: D.model, upTo: 3, at}), d3 = runD.chapters[2];
  assert.ok(runD.chapters[0].records.every(r => r.provenance.mode === 'deterministic') && runD.chapters[1].records.every(r => r.provenance.mode === 'deterministic'), 'a decision record names no Chapter 1 or 2 kind: the brief rules draft them');
  assert.equal(d3.records.length, 1); const dec = d3.records[0];
  assert.deepEqual([dec.provenance.mode, dec.answers.question, dec.answers.optionA, dec.answers.optionB, field(dec, 'question').basis, field(dec, 'optionA').basis, field(dec, 'approachA').basis, field(dec, 'tradeoffA').basis, field(dec, 'approachB').basis], ['model', 'Record each trip once in the trip service, not at the dock', 'Trip service owns the trip record', 'Dock gateway owns the trip record', 'stated', 'stated', 'stated', 'inferred', 'gap']);
  assert.match(dec.answers.approachA, /^one owner with idempotent event handling meets exactly-once/);
  assert.equal(dec.answers.tradeoffA, 'Good: one owner and one idempotency key. Bad: the dock needs an outbox.');
  assert.equal(dec.answers.tradeoffB, 'Good: the dock sees the trip first. Bad: forty docks become forty records of truth.');
  assert.match(dec.answers.context, /^A trip must be recorded exactly once even when a dock loses its mobile connection/);
  assert.match(dec.answers.requirementId, /^REQ-\d{3}$/); assert.match(dec.answers.driverId, /^QD-\d{3}$/);
  assert.equal(runD.document.decisions.records.length, 1); assert.deepEqual([runD.document.decisions.records[0].provenance.journey.mode, runD.document.decisions.records[0].alternatives.length, runD.document.decisions.records[0].status], ['model', 2, 'draft']);
  pass('a model in (MADR): the record\'s title is the question, its context the context, the chosen alternative and the next one the two options with the record\'s reason and its good and bad lines, cited line by line; the decision is a draft with nothing chosen for the person');

  // The guide's check of a model draft's provenance: the mode needs the model source this project keeps.
  const base = {passages: ['P-001'], upstream: [], claimIds: [], playbook: []};
  assert.throws(() => journeyProvenance(S.p, {mode: 'model', ...base}), /names the model source/);
  assert.throws(() => journeyProvenance(S.p, {mode: 'model', sourceId: 'SRC-001', ...base}), /model source/, 'the brief is not a model source');
  assert.throws(() => journeyProvenance(S.p, {mode: 'model', sourceId: 'SRC-009', ...base}), /model source/);
  assert.throws(() => journeyProvenance(S.p, {mode: 'model', sourceId: 'x', ...base}), /model source/);
  assert.throws(() => journeyProvenance(S.p, {mode: 'deterministic', sourceId: 'SRC-002', ...base}), /Only a model journey draft names the source/);
  assert.throws(() => journeyProvenance(S.p, {mode: 'sol', runId: 'r1', sourceId: 'SRC-002', ...base}), /Only a model/);
  assert.deepEqual(journeyProvenance(S.p, {mode: 'model', sourceId: 'SRC-002', ...base}), {mode: 'model', passages: ['P-001'], upstream: [], claimIds: [], playbook: [], sourceId: 'SRC-002'});
  assert.deepEqual(journeyProvenance(journeys.permits.p, {mode: 'deterministic', ...base}), {mode: 'deterministic', ...base}, 'the brief path is unchanged');
  pass('journeyProvenance accepts mode model only with a sourceId naming an evidence source of kind model this project keeps; no other mode names a source');
}

// ---------------------------------------------------------------- 5. over HTTP: a chapter drafted from the model
// Its own store: section 3 closes the one above when it ends.
const env2 = {...env, DB: localDatabase(':memory:')};
try {
  const dsl = readFileSync('evaluation/model-fixtures/bike-share.dsl', 'utf8'), api = (path, body, opts = {}) => apiWith(env2, path, body, opts);
  const made = async body => { const r = await worker.fetch(new Request('https://aiw.test/api/projects', {method: 'POST', headers: {'oai-authenticated-user-id': owner, Origin: 'https://aiw.test', 'Content-Type': 'application/json'}, body: JSON.stringify(body)}), env2); assert.equal(r.status, 201, await r.clone().text()); return (await r.json()).document.id; };
  const both = await made({name: BRIEFS.bikes.name, template: 'blank', brief: BRIEFS.bikes.text, model: {text: dsl, name: 'bike-share.dsl', kind: 'dsl'}}), alone = await made({name: 'Model alone', template: 'blank', model: {text: dsl, name: 'bike-share.dsl', kind: 'dsl'}});
  const ctx = await api('/api/intelligence/journey-context', {chapter: 1, mode: 'model'}, {project: both});
  assert.equal(ctx.status, 200, JSON.stringify(ctx.data));
  assert.deepEqual([ctx.data.draft.mode, ctx.data.packet, ctx.data.model.kept, ctx.data.model.sourceId, ctx.data.model.name, ctx.data.model.format, ctx.data.model.elements, ctx.data.model.stated, ctx.data.brief.kept], ['model', null, true, 'SRC-002', 'bike-share.dsl', 'structurizr', 26, 20, true], 'a model draft: no Sol packet, the model named, the brief kept beside it');
  assert.equal(ctx.data.draft.records.filter(r => r.provenance.mode === 'model').length, 3);
  assert.ok(ctx.data.modelPassages.length >= 3 && ctx.data.modelPassages.every(x => /^P-\d{3}$/.test(x.id) && dsl.includes(x.text)), 'the model lines the draft cites are quoted');
  assert.ok(ctx.data.passages.length >= 3 && ctx.data.passages.every(x => BRIEFS.bikes.text.includes(x.text)), 'and the brief passages the brief records cite');
  const plain = await api('/api/intelligence/journey-context', {chapter: 1}, {project: both});
  assert.deepEqual([plain.data.draft.mode, !!plain.data.packet, plain.data.model.kept, plain.data.model.name, plain.data.modelPassages], ['deterministic', true, true, 'bike-share.dsl', []], 'a brief draft says a model is kept, for the switch');
  assert.ok(plain.data.draft.records.some(r => r.type === 'actor' && r.provenance.mode === 'deterministic'), 'drafted from the brief alone, as before');
  const only = await api('/api/intelligence/journey-context', {chapter: 1, mode: 'model'}, {project: alone});
  assert.equal(only.status, 200); assert.deepEqual([only.data.draft.records.length, only.data.brief.kept, only.data.passages], [3, false, []], 'a model without a brief drafts the model\'s records alone');
  const plainAlone = await api('/api/intelligence/journey-context', {chapter: 1}, {project: alone});
  assert.deepEqual([plainAlone.status, plainAlone.data.draft.mode, plainAlone.data.packet, plainAlone.data.draft.records.length], [200, 'model', null, 3], 'asked plainly, a project with no brief and a kept model is drafted from the model (the readiness link and the Work tab need no mode)');
  assert.equal((await api('/api/intelligence/journey-context', {chapter: 1, mode: 'model'}, {project: 'returns-http'})).status, 404);
  const none = await api('/api/intelligence/journey-context', {chapter: 1, mode: 'model'}, {project: await made({name: 'No model', template: 'blank', brief: BRIEFS.returns.text})});
  assert.equal(none.status, 400); assert.match(none.data.error, /keeps no model source/);
  const sol = await api('/api/intelligence/journey', {chapter: 1, mode: 'model', requestId: crypto.randomUUID(), packetStamp: 'x'}, {project: both});
  assert.equal(sol.status, 400); assert.match(sol.data.error, /Sol drafts from the brief/);
  pass('over HTTP: journey-context with mode model drafts from the kept model (no Sol packet; the model and its cited lines quoted beside the brief\'s passages), with or without a brief; a brief draft says a model is kept; a project without a model is refused; Sol is not sent a model draft');
} finally { env2.DB.close(); }

assert.ok(briefOf(null).passages.length === 0);
// ---------------------------------------------------------------- 6. requirements drafted by group (round 12)
// A project of synthetic register rows in three domains and seven capability themes (generic banking words, no client
// text): the journey drafter answers it grouped (readiness-model.js draftsByGroup), and the architecture draft that
// answers it instead (public/architecture-drafter.js) drafts by kind of concern, not one record per requirement.
{
  const ROWS = [
    ['Deposit accounts', 'Account servicing', 'Ensure the account balance is updated after each posting'],
    ['Deposit accounts', 'Account servicing', 'The account balance must be shown to the customer after each posting'],
    ['Deposit accounts', 'Interest and fees', 'The interest rate on savings accounts is 3.5% per annum'],
    ['Deposit accounts', 'Interest and fees', 'The monthly account maintenance fee is GBP 5'],
    ['Deposit accounts', 'Account servicing', 'Ability to open a term deposit for an existing customer'],
    ['Deposit accounts', 'Account servicing', 'The term deposit shall be renewed at maturity unless the customer says otherwise'],
    ['Deposit accounts', 'Approvals', 'A maker enters a manual adjustment and a checker approves it before it is applied'],
    ['Deposit accounts', 'Approvals', 'An authoriser approves each manual adjustment above the limit'],
    ['Payments', 'Clearing', 'Send each outgoing payment to the National Clearing system'],
    ['Payments', 'Clearing', 'Receive the end-of-day card settlement file from the Card Network gateway'],
    ['Payments', 'Clearing', 'Reconcile each outgoing payment with the National Clearing system before the cut-off'],
    ['Payments', 'Day end', 'Run the end-of-day interest accrual for every account'],
    ['Payments', 'Day end', 'Produce the month-end payments report for the operations team'],
    ['Payments', 'Stability and resilience', 'The payment service shall remain available during the end-of-day run'],
    ['Deposit accounts', 'Stability and resilience', 'Recover the deposit ledger after a failure without losing a posting'],
    ['Customer records', 'Record keeping', 'Keep the history of every customer profile'],
    ['Customer records', 'Record keeping', 'Store each customer profile change with the user who made it'],
    ['Customer records', 'Record keeping', 'Retain each customer profile for seven years after closure'],
    ['Customer records', 'Record keeping', 'Archive the customer profile of a closed account']
  ];
  let g = rv.withFinalReview(createProject({name: 'Grouped bank', template: 'blank'}, 'grouped-bank', at));
  for (const [domain, capability, title] of ROWS) g = applyCommand(g, {type: 'artefact', payload: {type: 'requirement', title, description: title + '.', owner: 'Banking operations', source: 'Synthetic register', priority: 'Must', acceptance: 'Given the starting state, when it happens, then the result is recorded and shown.', domain, capability}}).document;
  const reqs = g.artefacts.filter(a => a.type === 'requirement'), idOf = t => reqs.find(a => a.title === t).id;
  for (const domain of new Set(ROWS.map(r => r[0]))) g = applyRequirementsCommand(g, {type: 'requirements.group', payload: {title: domain, kind: 'domain', memberIds: ROWS.filter(r => r[0] === domain).map(r => idOf(r[2]))}}, at, 'architect-r').document;
  for (const theme of new Set(ROWS.map(r => r[1]))) g = applyRequirementsCommand(g, {type: 'requirements.group', payload: {title: theme, kind: 'theme', memberIds: ROWS.filter(r => r[1] === theme).map(r => idOf(r[2]))}}, at, 'architect-r').document;
  const groups = requirementGroups(g), groupOf = title => groups.find(x => x.title === title);
  for (const n of [2, 4, 8, 10]) { const x = draftChapter(g, n); assert.equal(x.grouped, true, 'Chapter ' + n + ' answers grouped'); assert.deepEqual(x.records, [], 'no record per requirement'); }
  const d = draftArchitecture(g), ch = n => d.chapters.find(c => String(c.chapter) === String(n)).records, pay = r => r.commands[0].payload;
  const applied = applyDraftBundle(g, d, {actor: 'architect-r', jobId: 'grouped', at}).document;

  // GR-DRF-08: no functional row becomes a quality scenario; the quality heading drafts its category; a rate or a charge
  // is a Chapter 1 rule, never a target.
  const quality = ch(2).filter(r => pay(r).kind === 'quality'), heading = groupOf('Stability and resilience');
  assert.deepEqual(quality.map(r => pay(r).category), ['availability'], 'one quality driver, of the heading\'s own category');
  assert.deepEqual(pay(quality[0]).requirementGroupIds, [heading.id]);
  assert.ok(pay(quality[0]).requirementIds.every(id => groupMembers(g, heading.id).includes(id)), 'it cites only the rows under its heading');
  assert.deepEqual([pay(quality[0]).stimulus, pay(quality[0]).response, pay(quality[0]).targetValue], ['', '', ''], 'a stub scenario with no target');
  const functional = reqs.filter(a => !groupMembers(g, heading.id).includes(a.id)).map(a => a.id);
  assert.ok(!quality.some(r => pay(r).requirementIds.some(id => functional.includes(id))), 'no functional row is a quality scenario');
  assert.ok(!ch(2).some(r => pay(r).targetValue === '3.5' || pay(r).targetValue === '5'), 'no rate or charge is a target');
  const rules = ch(1).filter(r => r.kind === 'rule').map(pay);
  assert.deepEqual(rules.map(x => [x.title, x.value, x.unit, x.currency]).sort(), [['Interest rate: 3.5%', '3.5', '%', ''], ['Monthly account maintenance fee: GBP 5', '5', '', 'GBP']], 'the rate and the charge are Chapter 1 rules with their value and unit');
  assert.equal(applied.artefacts.filter(a => a.type === 'rule').length, 2);
  pass('GR-DRF-08: grouped synthetic rows: no functional row becomes a quality scenario; the "Stability and resilience" heading drafts one availability driver citing only its own rows, a stub with no target; the interest rate and the maintenance fee are Chapter 1 rules with their value, unit and currency, never targets');

  // Round 25 (D-25-09): that availability driver is weighed by the resilience decision, and its Standby pattern, which
  // the SA Playbook marks as strong support for availability, lands assessed by AIW's rules; nothing else is assessed,
  // chosen or preferred.
  const availability = applied.quality.drivers.find(x => x.category === 'availability');
  const ruled = applied.decisions.records.flatMap(x => x.alternatives.flatMap(a => Object.entries(a.assessments).filter(([, v]) => v.by === 'rules').map(([id, v]) => [x.provenance.draft.key, a.title, id, v.effect])));
  assert.deepEqual(ruled, [['c3.resilience', 'Standby', availability.id, 'supports']], 'one assessment drafted from the marks, on the decision that weighs the availability driver');
  assert.deepEqual(applied.decisions.records.find(x => x.provenance.draft.key === 'c3.resilience').alternatives.find(a => a.title === 'Standby').assessments[availability.id], {effect: 'supports', reason: 'The SA Playbook marks the Standby pattern as strong support for availability.', evidence: 'SA Playbook, Table Analysis_Architectural Patterns and Quality Properties.docx (line 11); Arch PAttern + Quality Prop.!B5:B36', by: 'rules'}, 'with the Playbook\'s words and its cell');
  assert.ok(applied.decisions.records.every(x => x.state === 'proposed' && x.selectedAlternativeId === null && !('recommendation' in x) && x.alternatives.every(a => Object.values(a.assessments).every(v => v.by === 'rules' || (v.effect === 'unknown' && !v.reason && !v.evidence && !v.by)))), 'proposals: nothing chosen or preferred, and nothing else assessed');
  pass('D-25-09 (E2): grouped synthetic rows: the resilience decision weighs the availability driver its heading drafts, and its Standby pattern lands assessed from the SA Playbook\'s mark ("x": supports, citing its cell) and marked as AIW\'s rules\'; no other alternative is assessed, and nothing is chosen or preferred');

  // GR-DRF-09: each named external system is a party with a contract from the component of the rows that name it;
  // end-of-day wording makes a batch contract.
  const parties = ch(8).filter(r => r.kind === 'party').map(r => pay(r).title).sort();
  assert.deepEqual(parties, ['Card Network gateway', 'National Clearing system'], 'a party per named external system');
  const contracts = ch(8).filter(r => r.kind === 'contract');
  for (const name of parties) assert.ok(contracts.some(r => pay(r).to === '@draft:c8.party.' + slug(name) && pay(r).from === '@draft:c5.' + groupOf('Payments').id), name + ': a contract from the Payments component');
  assert.equal(contracts.find(r => pay(r).to === '@draft:c8.party.card-network-gateway').commands[0].payload.kind, 'batch', 'the end-of-day file is a batch contract');
  assert.ok(contracts.some(r => r.key.startsWith('c8.ho.') && pay(r).kind === 'batch'), 'and the end-of-day work hands over to the batch component as a batch contract');
  assert.ok(applied.interfaces.parties.some(x => x.title === 'National Clearing system' && x.kind === 'payment network'), 'the clearing system is a payment network');
  pass('GR-DRF-09: grouped synthetic rows naming the National Clearing system and the Card Network gateway draft one party each, with a contract from the Payments component; end-of-day wording drafts a batch contract to the party and a batch hand-over to the batch component');

  // GR-DRF-10: maker, checker and authoriser wording drafts a dual-control control on the owning component.
  const deposits = '@draft:c5.' + groupOf('Deposit accounts').id, controls = ch(9).filter(r => r.kind === 'control' && /dual control/i.test(pay(r).title));
  assert.equal(controls.length, 1, 'one dual-control control');
  assert.deepEqual(pay(controls[0]).targetIds, [deposits], 'on the component that owns the rows');
  assert.deepEqual([...pay(controls[0]).requirementIds].sort(), [idOf(ROWS[6][2]), idOf(ROWS[7][2])].sort(), 'citing the maker-checker and authoriser rows');
  assert.ok(ch(9).some(r => r.kind === 'threat' && pay(r).targetIds[0] === deposits && /enters and approves/.test(pay(r).title)), 'with the threat it answers');
  pass('GR-DRF-10: maker, checker and authoriser wording drafts one dual-control control, with its threat, on the Deposit accounts component that owns those rows');

  // GR-DRF-11 and GR-DRF-15: data definitions named by entity nouns, one per entity; names are noun phrases.
  const data = ch(8).filter(r => r.kind === 'data').map(r => pay(r).title);
  assert.equal(new Set(data.map(t => t.toLowerCase())).size, data.length, 'one data definition per entity');
  for (const name of ['Account balance', 'Term deposit', 'Customer profile', 'Outgoing payment', 'Manual adjustment']) assert.ok(data.includes(name), name + ' is an entity: ' + data.join(', '));
  // Names read from statements are noun phrases; names of groups are the source's own headings; none has a modal verb.
  const fromStatements = [...data, ...rules.map(x => x.title.split(':')[0])], fromGroups = [...ch(4).filter(r => r.kind === 'responsibility'), ...ch(5).filter(r => r.kind === 'component')].map(r => pay(r).title);
  for (const t of [...fromStatements, ...fromGroups]) assert.doesNotMatch(t, /\b(?:shall|must|should|will|can|may|might|could)\b/i, 'no modal verb in ' + t);
  for (const t of fromStatements) assert.doesNotMatch(t, /^(?:the|ensure|ability|able|keep|store|retain|archive|send|receive|run|produce|recover|record|enter|approve|open)\b/i, 'a noun phrase, not a verb phrase: ' + t);
  for (const t of fromGroups) assert.ok(groups.some(x => t === x.title || t.startsWith(x.title + ' ')) || /^(?:Approval workflow service|Batch scheduler|Audit trail store|Reporting service|Integration adapter|Notification adapter|Identity and access service|Channel and API gateway)$/.test(t), t + ' is named by its group or its cross-cutting concern');
  assert.deepEqual(['Ensure the account balance is updated after each posting', 'The interest rate on savings accounts is 3.5% per annum', 'Ability to open a term deposit for an existing customer', 'A maker enters a manual adjustment and a checker approves it before it is applied'].map(t => nounPhrase(t)), ['account balance', 'interest rate', 'term deposit', 'manual adjustment']);
  assert.equal(objectPhrase('The system shall record each account closure with its reason'), 'account closure', 'the journey drafter names by the same rule');
  // A passive title names the subject of its description, or of the description's clause that says what must be done;
  // never the participle ("counted") or the preposition after it.
  assert.deepEqual([objectPhrase('Be paid through the gateway', 'Refunds must be paid through the gateway.'), objectPhrase('Still be counted', 'Each kiosk reports its stock over the network; some go offline for hours, and a ticket sold offline must still be counted.')], ['refund', 'ticket sold offline']);
  // A record-keeping group drafts a store; each kind of component is chosen by the work of its rows.
  assert.deepEqual(ch(5).filter(r => pay(r).kind === 'store' && r.groups.includes(groupOf('Customer records').id)).map(r => pay(r).title), ['Customer records store'], 'the record-keeping group is a store');
  assert.equal(ch(5).find(r => r.groups.includes(groupOf('Deposit accounts').id)).commands[0].payload.kind, 'service');
  assert.ok(ch(5).some(r => pay(r).kind === 'worker'), 'the day-end theme is a batch worker');
  // Without groups, each statement names its own unit by the same rule.
  const loose = structuredClone(g); loose.requirementGroups.records = [];
  const looseNames = draftArchitecture(loose).chapters.find(c => c.chapter === 4).records.filter(r => r.kind === 'responsibility').map(r => pay(r).title);
  for (const t of ['Account balance', 'Interest rate', 'Term deposit', 'Manual adjustment', 'Customer profile']) assert.ok(looseNames.includes(t), t + ' names a unit of one: ' + looseNames.join(', '));
  for (const t of looseNames) assert.doesNotMatch(t, /\b(?:shall|must|should|will)\b|^(?:the|ensure|ability)\b/i, t);
  pass('GR-DRF-11, GR-DRF-15: data definitions are named by entity nouns (account balance, term deposit, customer profile, outgoing payment, manual adjustment), one per entity; statements starting "Ensure", "The" and "Ability to", and a role with its verb ("A maker enters"), give noun phrases with no modal verb, in both drafters, and a passive title names the subject of the clause that says what must be done; the record-keeping group drafts a store, the day-end theme a batch worker, the others services');

  // GR-DRF-16: each boundary cites rows of its own group; one shared environment per stage.
  for (const r of ch(4).filter(r => r.kind === 'responsibility')) { const own = new Set(groupMembers(g, r.groups[0])); assert.ok(r.cites.length && r.cites.every(id => own.has(id)), r.title + ' cites its own group\'s rows'); for (const id of reqs.map(a => a.id).filter(id => pay(r).boundary.includes(id + ' '))) assert.ok(own.has(id), r.title + ': its boundary names only its own rows'); }
  // Connections are typed edges, not titled responsibility records. Their resolved endpoints must survive apply.
  const logicalLinks = ch(4).filter(r => r.kind === 'connection');
  assert.ok(logicalLinks.length, 'grouped drafts connect responsibilities to journey steps');
  for (const r of logicalLinks) {
    const link = pay(r);
    assert.ok(['realises', 'serves'].includes(link.kind));
    assert.ok(link.from && link.to && link.from !== link.to);
    assert.ok(applied.logical.connections.some(c => c.label === link.label && c.kind === link.kind && !c.from.startsWith('@draft:') && !c.to.startsWith('@draft:')), 'typed connection resolves to canonical endpoints: ' + link.label);
  }
  const environments = applied.runtime.environments;
  assert.deepEqual(environments.map(e => e.stage).sort(), ['Pre-production design', 'Production design', 'Recovery design'], 'one environment per stage (recovery, as the availability heading asks)');
  assert.ok(environments.every(e => applied.runtime.plans.filter(x => x.environmentId === e.id).length === applied.realisation.components.length), 'each shared by every component');
  pass('GR-DRF-16: each drafted responsibility\'s boundary and citations name rows of its own group only; one shared environment per stage (production, pre-production and recovery), each holding a plan for every component');

  // GR-DRF-19: a brief's Problem section is the business problem of the outcomes drafted from it.
  const briefed = draftArchitecture(g, {briefText: 'Grouped bank\n\nProblem\nPostings are re-keyed into two ledgers and errors surface only at month end.\n\nGoals\n- Halve the time to settle a payment'});
  const outcome = briefed.chapters[0].records.find(r => r.key === 'c1.outcome.brief.1');
  assert.equal(pay(outcome).problem, 'Postings are re-keyed into two ledgers and errors surface only at month end.', 'the outcome carries the brief\'s problem');
  assert.equal(draftArchitecture(g, {briefText: 'Goals\n- Halve the time to settle a payment'}).chapters[0].records.find(r => r.key === 'c1.outcome.brief.1').commands[0].payload.open.problem.state, 'not-stated', 'and without one the problem is open');
  pass('GR-DRF-19: the outcomes Sol drafts from a brief carry its Problem section as their business problem, or leave it open');
}

{
  // Round 25 (found by W4): the rules draft of the Bank Payment reference applies. That reference draws its seeded
  // process model, not the steps a draft adds, so the drafter connects no responsibility to a step the model does not
  // draw (Chapter 4 refused it, and with it the whole draft); a project that draws its own steps keeps the connections.
  const bank = rv.withFinalReview(createProject({name: 'Reference bank payment', template: 'bank-payment'}, 'drafter-bank', at));
  const bd = draftArchitecture(bank), links = bd.chapters.find(c => c.chapter === 4).records.filter(r => r.kind === 'connection');
  assert.equal(links.length, 0, 'no connection to a step the seeded model does not draw');
  const bankApplied = applyDraftBundle(bank, bd, {actor: 'architect-r', jobId: 'bank', at}).document;
  assert.ok(bankApplied.logical.responsibilities.length > bank.logical.responsibilities.length && bankApplied.decisions.records.length > bank.decisions.records.length, 'the draft applies');
  const permits = rv.withFinalReview(createProject({name: 'Reference permits', template: 'service-permits'}, 'drafter-permits', at)), pd = draftArchitecture(permits);
  assert.ok(pd.chapters.find(c => c.chapter === 4).records.some(r => r.kind === 'connection'), 'a project that draws its own steps keeps its connections');
  applyDraftBundle(permits, pd, {actor: 'architect-r', jobId: 'permits', at});
  pass('the rules draft of the Bank Payment reference applies: no responsibility is connected to a step its seeded model does not draw; a project that draws its own steps keeps those connections');
}

console.log(JSON.stringify({suite: 'Journey drafter', passed: checks.length, checks, interpreter: 'shared/brief-interpreter.js', measured, limits: ['Rule-based drafts from an interpreted brief; every record is a proposal the person commits through the guided chain. Nothing here is confirmed, reviewed or accepted.']}, null, 1));
