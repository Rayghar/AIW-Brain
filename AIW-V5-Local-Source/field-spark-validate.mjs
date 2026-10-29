// The field spark's rules, provenance and Sol's field drafts (round 2, I2-12): the deterministic registry on the
// reference project for Chapters 4–11 (every offer cites a record the project holds, carries no score, never copies
// candidate or discovery knowledge and never offers a number or an id field); the `solSuggestions` validator (bad shapes
// refused, good ones stored as provenance.suggestions[] with the server's actor and time, through an ordinary save, a
// reviewed change and a proposal; kept across later edits, superseded when the field changes by hand); Sol's field mode
// (packet first, free text only, disclosure and redaction, budget, the contract, the guard and the second pass, a run
// recorded with its prompt pin) against a loopback provider double; a Sol draft accepted only from a completed run of
// this project for that field, with `edited` worked out by the server; Co-author dismissals kept under the workspace,
// changing no design record; and the stewards' counts. Chapters 1–3 (the page apps): the brief, artefacts, quality
// drivers and conflicts, decisions and their nested alternatives get the same rules, validator and provenance (a
// singleton brief, an alternative named by its alternativeId, a new conflict or alternative found as the one record
// its command added). Run: npm run test:field-spark
import assert from 'node:assert/strict';
import http from 'node:http';
import worker, {suggestionEntries, suggestionCarriers, suggestionTypes} from './worker.js';
import {localDatabase} from './local-db.js';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {previewWorkingChange} from './public/workbench-domain.js';
import * as R from './public/field-suggestions.js';
import {fieldOf, fieldHelp, FORM_IDS, RECORD_FIELDS} from './public/record-fields.js';
import {fieldPacket, fieldRequest} from './intelligence-service.js';
import {fieldDraftSchema, validateFieldDraft, guardFieldDraft, requestFieldDraft, fieldInstructionsPin, FIELD_PROMPT_VERSION, FIELD_INSTRUCTIONS} from './intelligence-provider.js';
import {suggestionStatistics, adoptionStatisticsHTML} from './public/knowledge-ui.js';
import {answer as mockAnswer, envelope} from './mock-llm-provider.mjs';

const checks = [];
const pass = n => { checks.push(n); console.log('PASS', n); };
const p = withFinalReview(seedProject()), before = JSON.stringify(p);
const offers = (command, recordId, values = {}) => R.fieldOffers(p, command, {recordId, values});
const has = (list, band, ref, field) => (list || []).find(o => o.band === band && o.ref === ref && (!field || o.field === field));
const req = id => p.artefacts.find(a => a.id === id);

// ---------------------------------------------------------------- 1. the rules, chapter by chapter (reference project)
{
  // Chapter 4: a responsibility's purpose and source come from the requirement it serves; its boundary from the other
  // responsibilities in its group (to confirm); owners from linked records (to confirm), never invented.
  const o = offers('logical.responsibility', 'api');
  const purpose = has(o.purpose, 'project', 'REQ-001');
  assert.ok(purpose, 'the purpose cites the requirement it copies');
  assert.equal(purpose.value, R.firstSentence(req('REQ-001').description), 'copied verbatim: the first sentence of REQ-001');
  assert.equal(purpose.refLabel, 'REQ-001');
  const boundary = has(o.boundary, 'confirm', 'GRP-001');
  assert.match(boundary.value, /^Outside this responsibility: .*Notification service/, 'the group’s other responsibilities, to confirm');
  assert.equal(boundary.question, 'What is explicitly outside this responsibility?', 'asked in the chapter guide’s own words');
  assert.ok(has(o.owner, 'confirm', 'ADR-001'), 'an owner named on a linked decision, to confirm');
  assert.ok(!(o.owner || []).some(x => x.value === p.logical.responsibilities.find(r => r.id === 'api').owner), 'no offer repeats what the field already holds');
  // A new responsibility follows what its form says before anything is saved: the requirement ticked in the traceability step.
  const fresh = offers('logical.responsibility', null, {requirementIds: ['REQ-004'], title: 'Hold uncertain outcomes'});
  assert.equal(has(fresh.purpose, 'project', 'REQ-004').value, R.firstSentence(req('REQ-004').description));
  assert.deepEqual(Object.keys(offers('logical.responsibility', null, {})), [], 'nothing to offer for a new record that links nothing');
  pass('Chapter 4: purpose and source copied from the linked requirement with its reference; boundary and owners to confirm, in the guide’s words; a new record follows the form');
}
{
  // Chapter 8: a contract's policies come from the interaction it defines, the quality drivers on its endpoints, the
  // Chapter 9 controls on it, and its request payload's key field (a pick, not a draft).
  const o = offers('interfaces.contract', 'if-004');
  assert.ok(has(o.duplicatePolicy, 'project', 'QD-001'), 'the integrity driver’s response');
  assert.ok(has(o.timeoutPolicy, 'project', 'QD-003'), 'the performance driver’s response');
  assert.ok(has(o.failurePolicy, 'project', 'QD-002'), 'the availability driver’s response');
  assert.ok(has(o.authorization, 'project', 'oauth'), 'the control on its caller');
  assert.equal(has(o.idempotencyKey, 'project', 'instruction').value, 'paymentReference', 'the request payload’s key field');
  assert.ok(!o.correlationKey, 'the correlation key already holds that key field, so nothing is offered');
  assert.ok(has(o.purpose, 'confirm', 'INT-001'), 'its purpose, from the interaction it defines, to confirm');
  assert.ok(!o.timeoutMs && !o.from && !o.kind, 'no number, select or link is ever offered');
  pass('Chapter 8: contract policies from the interaction it defines, the drivers on its endpoints and the controls on it; the idempotency key picked from the request payload’s key field');
}
{
  // Chapter 9: a threat's consequence and actor from the threats on the same objects; a control's failure response and
  // verification from the security driver on what it protects; its purpose from the threat it treats (to confirm).
  const t = offers('security.threat', 'thr-001');
  assert.ok(has(t.consequence, 'project', 'thr-003') && has(t.actor, 'project', 'thr-003'), 'THR-003 records them for the payment instruction both threats affect');
  assert.ok(has(t.priorityBasis, 'confirm', 'QD-005'), 'the security driver bearing on it, to confirm');
  const c = offers('security.control', 'oauth');
  assert.equal(has(c.failureResponse, 'project', 'QD-005').value, p.quality.drivers.find(d => d.id === 'QD-005').response);
  assert.equal(has(c.verificationPlan, 'project', 'QD-005').value, p.quality.drivers.find(d => d.id === 'QD-005').measurement);
  assert.ok(has(c.purpose, 'confirm', 'thr-001'));
  assert.deepEqual(R.openSuggestions(p, 9).map(x => [x.recordRef, x.field, x.offer.refLabel]), [['SEC-001', 'failureResponse', 'QD-005'], ['SEC-001', 'verificationPlan', 'QD-005']], 'the Co-author list: empty fields with something to offer');
  pass('Chapter 9: threat consequence and actor from the threats on the same objects; control failure response and verification from the security driver on what it protects; purpose from the threat it treats');
}
{
  // Chapter 10: an operating plan's scaling, recovery and monitoring from the drivers on the part it runs; readiness
  // from the contracts that part provides (to confirm).
  const o = offers('runtime.plan', 'run-001');
  assert.ok(has(o.scalingPolicy, 'project', 'QD-003') && has(o.recoveryPlan, 'project', 'QD-002') && has(o.monitoring, 'project', 'QD-002'));
  assert.match(has(o.readiness, 'confirm', 'rest').value, /^Ready when it can serve IF-001 Payment initiation/);
  assert.ok(!o.minReady && !o.maxReplicas && !o.recoveryMinutes, 'replicas and minutes are never offered');
  pass('Chapter 10: scaling, recovery and monitoring from the drivers on the part a plan runs; readiness from the contracts it provides, to confirm; no replica or minute figure is offered');
}
{
  // Chapters 5, 6, 7 and 11.
  const a = offers('realisation.component', 'api-pod');
  assert.ok(has(a.purpose, 'project', 'api') && has(a.technologyNeeds, 'project', 'TN-001'), 'Chapter 5: from the responsibility it realises and the needs Chapter 6 records');
  assert.ok(has(offers('realisation.interaction', 'INT-002').condition, 'project', 'REL-002'), 'Chapter 5: an interaction’s condition from the logical connection it realises');
  const c = offers('technology.capability', 'tc-001');
  assert.ok(has(c.purpose, 'project', 'TN-001') && has(c.recoveryOwner, 'confirm', 'tr-001'), 'Chapter 6: from the need it supports; recovery owner to confirm');
  assert.ok(has(offers('techrealisation.plan', 'tr-001').dataPlan, 'project', 'tc-001'), 'Chapter 7: from the capability it realises');
  const n = offers('review.narrative', 'SDD');
  assert.ok(has(n.summary, 'project', 'brief') && has(n.scope, 'project', 'SCP-001') && has(n.audience, 'confirm', 'STK-001'), 'Chapter 11: from the brief, the scope and the stakeholders');
  pass('Chapters 5, 6, 7 and 11: components from their responsibilities, capabilities from their needs, realisations from their capabilities, the SDD framing from the brief, scope and stakeholders');
}
{
  // Chapter 1: a requirement's behaviour from the journey step that requires it and the outcome it delivers; its
  // acceptance composed from that step, who takes part in it and that outcome, to confirm; a new requirement follows the
  // links its editor will add; a constraint's description from the brief; the brief's goal from the outcomes.
  const o = offers('artefact', 'REQ-005');
  assert.equal(has(o.description, 'project', 'JRN-005').value, req('JRN-005').description, 'the journey step’s description, verbatim');
  assert.equal(has(o.description, 'project', 'OUT-001').value, req('OUT-001').description);
  const acceptance = has(o.acceptance, 'confirm', 'JRN-005');
  assert.equal(acceptance.value, 'Given Bank customer at “Communicate the outcome”, when the step completes, then customers can follow an instruction to a confirmed, held, or pending outcome.');
  assert.match(acceptance.why, /JRN-005 .*ACT-001 .*OUT-001 /, 'the step, its actor and the outcome are named');
  assert.equal(acceptance.question, 'Does REQ-005 pass when OUT-001 A payment with a known outcome is observed at the end of JRN-005 Communicate the outcome?');
  assert.ok(has(o.source, 'project', 'brief') && !o.title && !o.order && !o.priority, 'the brief’s source; nothing for the title, the order or the priority');
  const fresh = offers('artefact', null, {type: 'requirement', linkedIds: ['JRN-005']});
  assert.equal(has(fresh.description, 'project', 'JRN-005').value, req('JRN-005').description, 'a new requirement follows the step it will be linked to');
  assert.deepEqual(offers('artefact', null, {type: 'requirement'}).description, undefined, 'and offers no behaviour when it links nothing');
  assert.equal(has(offers('artefact', 'CON-001').description, 'project', 'brief').value, p.brief.problem, 'a constraint’s description from the brief');
  assert.equal(has(offers('artefact', 'OUT-001').description, 'project', 'brief').value, p.brief.goal);
  assert.match(has(offers('artefact', 'ACT-001').description, 'confirm', 'JRN-001').value, /^Takes part in JRN-001 Initiate payment; JRN-005 Communicate the outcome\.$/);
  // An existing record's type select is disabled in its editor (the form sends ''): the saved type still decides.
  assert.ok(has(offers('artefact', 'REQ-005', {type: ''}).acceptance, 'confirm', 'JRN-005'));
  const brief = R.fieldOffers(p, 'brief', {recordId: 'brief'});
  assert.ok(has(brief.goal, 'project', 'OUT-001') && has(brief.goal, 'project', 'OUT-002'));
  assert.equal(has(brief.source, 'confirm', 'OUT-001').question, 'Where did this need come from?', 'asked in the chapter guide’s own words');
  // Chapter 2: a driver's scenario read from the acceptance criteria of the requirements it covers (given → conditions,
  // when → stimulus, then → response), its measurement from those criteria, its rationale from them and the brief.
  const d = offers('quality.driver', null, {requirementIds: ['REQ-004']});
  assert.equal(has(d.stimulus, 'project', 'REQ-004').value, 'When the request times out');
  assert.equal(has(d.conditions, 'project', 'REQ-004').value, 'Given no definitive settlement response');
  assert.match(has(d.response, 'project', 'REQ-004').value, /^Then the outcome remains pending/);
  assert.equal(has(d.measurement, 'project', 'REQ-004').value, req('REQ-004').acceptance);
  assert.ok(has(d.rationale, 'confirm', 'REQ-004') && has(d.rationale, 'confirm', 'brief'), 'the requirement’s priority and the brief’s goal, to confirm');
  assert.ok(!d.metric && !d.unit && !d.window && !d.targetValue, 'nothing for a measured target');
  assert.deepEqual(R.sparkFields('quality.driver').map(x => x.name), ['title', 'description', 'impact', 'stimulus', 'conditions', 'response', 'measurement', 'owner', 'rationale', 'source', 'tactic'], 'a driver’s metric, unit and window get no spark; its description and impact do');
  assert.deepEqual(offers('quality.driver', null, {}), {}, 'a new driver that covers no requirement gets nothing');
  const c = offers('quality.conflict', null, {driver0: 'QD-001', driver1: 'QD-003'});
  const effect = has(c.effect, 'confirm', 'QD-001');
  assert.ok(effect.value.includes(p.quality.drivers.find(x => x.id === 'QD-001').response) && effect.value.includes(p.quality.drivers.find(x => x.id === 'QD-003').response), 'a conflict’s effect from the two drivers’ responses, to confirm');
  // Chapter 3: a decision's context and rationale from its linked requirements and drivers; an alternative's approach
  // and consequences from the decision's question and the drivers it weighs.
  const q = offers('decision.save', 'ADR-002');
  assert.ok(has(q.context, 'project', 'CON-001'), 'the constraint on REQ-003, which ADR-002 links');
  assert.equal(has(q.context, 'confirm', 'QD-001').question, 'Which constraints and drivers shape this choice?', 'in the chapter guide’s words');
  assert.equal(has(q.rationale, 'project', 'QD-001').value, p.quality.drivers.find(x => x.id === 'QD-001').rationale);
  assert.ok(has(q.mitigation, 'project', 'QD-001') && !q.question && !q.assumptionEvidence, 'no offer for the question itself or for evidence');
  assert.ok(has(offers('decision.save', 'ADR-003').assumptions, 'project', 'ASM-001'), 'the assumption that informs REQ-004');
  const a = offers('decision.alternative', 'ALT-001');
  assert.ok(has(a.pattern, 'project', 'QD-002'), 'a tactic the drivers name');
  assert.equal(has(a.summary, 'confirm', 'QD-002').question, 'Is this the approach to answer ADR-001: “When should the customer receive a payment acknowledgement?”?', 'asked against the decision’s question');
  assert.match(has(a.consequences, 'confirm', 'QD-002').value, /^Bears on QD-002 Keep instruction intake available \(Important\): /);
  assert.ok(has(a.costs, 'confirm', 'QD-002') && has(a.benefits, 'confirm', 'QD-006'), 'its saved comparison: tension is a cost, support a benefit');
  assert.ok(has(offers('decision.alternative', null, {decisionId: 'ADR-003'}).pattern, 'project', 'QD-004'), 'a new alternative follows the decision its editor names');
  assert.deepEqual(offers('decision.alternative', null, {}), {}, 'an alternative of no decision gets nothing');
  assert.deepEqual([1, 2, 3].map(ch => R.openSuggestions(p, ch, {limit: 500}).map(x => `${x.recordRef}.${x.field}`)), [['REQ-005.acceptance'], [], ['ADR-001.rationale', 'ADR-001.mitigation', 'ADR-002.rationale', 'ADR-002.mitigation', 'ADR-003.rationale', 'ADR-003.mitigation']], 'the Co-author list for Chapters 1–3: empty fields with something to offer');
  pass('Chapters 1–3: a requirement’s description and acceptance from its journey step, actor and outcome; a constraint’s description from the brief; a driver’s stimulus, conditions, response, measurement and rationale from the requirements it covers and the brief; a conflict’s effect from its two drivers; a decision’s context and rationale from its requirements and drivers; an alternative’s approach and consequences from the decision’s question and drivers — each cited, confirmations in the guide’s words');
}
{
  // Invariants over every record of every chapter: a cited record the project holds, a free-text field, no score, no
  // number field, never the current value; the same offers whatever candidate or discovery knowledge the project holds.
  const all = [];
  for (const command of Object.keys(R.RECORD_COLLECTIONS)) for (const r of R.recordsOf(p, command)) for (const [field, list] of Object.entries(R.fieldOffers(p, command, {recordId: command === 'review.narrative' ? 'SDD' : r.id}))) for (const o of list) all.push({command, r, field, o});
  assert.ok(all.length > 120, `the reference project gets ${all.length} offers`);
  for (const {command, r, field, o} of all) {
    assert.ok(R.refExists(p, o.ref), `${command}.${field} cites ${o.ref}, which the project holds`);
    assert.deepEqual(Object.keys(o).filter(k => !['band', 'field', 'value', 'ref', 'refLabel', 'why', 'id', 'question'].includes(k)), [], 'an offer carries no score or rank');
    assert.ok(['project', 'confirm'].includes(o.band));
    assert.ok(['text', 'textarea'].includes(fieldOf(command, field)?.kind), `${command}.${field} is free text`);
    assert.notEqual(o.value, String(r[field] ?? '').trim());
    assert.ok(o.value.length <= R.maxLengthOf(command, field));
    assert.match(o.id, /^sg-[0-9a-z]{7,}$/);
  }
  const withKnowledge = structuredClone(p);
  withKnowledge.knowledge = {sources: [{id: 'KS-CAND', status: 'candidate', title: 'Candidate source', statement: 'Use exponential backoff with jitter for every retry policy.'}], claims: [{id: 'CL-DISC', status: 'discovery', statement: 'Idempotency keys must be UUIDv7.'}]};
  withKnowledge.coauthoring = {...withKnowledge.coauthoring, discoveries: [{id: 'DSC-1', statement: 'Retry three times.'}]};
  for (const ch of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) assert.deepEqual(R.openSuggestions(withKnowledge, ch, {limit: 500}), R.openSuggestions(p, ch, {limit: 500}), `Chapter ${ch}: candidate and discovery knowledge offer nothing`);
  for (const command of ['artefact', 'quality.driver', 'decision.save', 'decision.alternative']) for (const r of R.recordsOf(p, command)) assert.deepEqual(R.fieldOffers(withKnowledge, command, {recordId: r.id}), R.fieldOffers(p, command, {recordId: r.id}), `${command} ${r.id}: candidate and discovery knowledge change no offer`);
  assert.equal(JSON.stringify(p), before, 'reading offers changes nothing');
  assert.deepEqual(R.sparkFields('runtime.plan').map(d => d.kind).filter(k => !['text', 'textarea'].includes(k)), [], 'a spark serves free text only');
  assert.ok(!R.sparkFields('runtime.plan').some(d => ['minReady', 'maxReplicas', 'recoveryMinutes', 'lossMinutes'].includes(d.name)));
  for (const [c, f] of [['runtime.plan', 'owner'], ['interfaces.contract', 'idempotencyKey'], ['interfaces.contract', 'evidence'], ['logical.responsibility', 'source'], ['interfaces.contract', 'timeoutBasis'], ['artefact', 'owner'], ['brief', 'source'], ['quality.driver', 'metric'], ['quality.driver', 'unit'], ['quality.driver', 'window'], ['decision.save', 'assumptionEvidence']]) assert.equal(R.draftable(c, f), false, `Sol does not draft ${c}.${f}`);
  for (const c of ['artefact', 'quality.driver', 'decision.alternative']) assert.ok(!R.sparkFields(c).some(d => ['order', 'targetValue', 'type', 'priority', 'operator', 'reason', 'effect'].includes(d.name)), `${c}: no spark on a number, a select or a per-driver field`);
  assert.equal(R.draftable('interfaces.contract', 'failurePolicy'), true);
  const dismissed = structuredClone(p);
  dismissed.workspace = {coauthor: {dispositions: [{suggestionId: R.openSuggestions(p, 9)[0].offer.id, outcome: 'dismissed'}]}};
  assert.deepEqual(R.openSuggestions(dismissed, 9).map(x => x.field), ['verificationPlan'], 'a dismissed offer leaves the Co-author list');
  pass(`every one of ${all.length} offers on the reference project cites a record it holds, fills a free-text field, carries no score and differs from what the field holds; candidate and discovery knowledge change nothing; Sol drafts no owner, id, evidence, source or basis of a number`);
}

// ---------------------------------------------------------------- 2. the provenance validator (pure)
{
  const ok = [{field: 'purpose', source: 'project', ref: 'REQ-004', suggestionId: 'sg-1234567', acceptedBy: 'anyone', acceptedAt: 'whenever', edited: false}];
  assert.deepEqual(suggestionEntries(JSON.stringify(ok), ['logical.responsibility']), [{field: 'purpose', source: 'project', suggestionId: 'sg-1234567', ref: 'REQ-004', edited: false}], 'a form’s JSON string is read; the client’s acceptedBy and acceptedAt are not kept');
  const refuse = (raw, re, types = ['logical.responsibility']) => assert.throws(() => suggestionEntries(raw, types), re);
  refuse([{field: 'minReady', source: 'project', ref: 'REQ-004'}], /not a free-text field/, ['runtime.plan']);
  refuse([{field: 'requirementIds', source: 'project', ref: 'REQ-004'}], /not a free-text field/);
  refuse([{field: 'purpose', source: 'model', ref: 'REQ-004'}], /comes from your project/);
  refuse([{field: 'purpose', source: 'project'}], /names the record/);
  refuse([{field: 'purpose', source: 'project', ref: 'REQ-004', score: 0.9}], /unsupported shape/);
  refuse([{field: 'purpose', source: 'sol'}], /names the run/);
  refuse([{field: 'purpose', source: 'sol', runId: 'run-1'}], /names the run/);
  refuse([{field: 'purpose', source: 'project', ref: 'REQ-004', runId: '00000000-0000-4000-8000-000000000000'}], /Only a Sol draft/);
  refuse([{field: 'purpose', source: 'project', ref: 'REQ-004', edited: 'no'}], /true or false/);
  refuse([{field: 'purpose', source: 'project', ref: 'REQ-004'}, {field: 'purpose', source: 'confirm', ref: 'REQ-001'}], /one accepted suggestion at a time/);
  refuse(Array.from({length: 41}, () => ({field: 'purpose', source: 'project', ref: 'REQ-004'})), /at most 40/);
  refuse('{not json', /could not be read/);
  refuse({field: 'purpose'}, /must be a list/);
  refuse([{field: 'purpose', source: 'project', ref: 'REQ-004'}], /does not carry field suggestions/, []);
  assert.deepEqual(suggestionTypes('security.proposal'), ['security.threat', 'security.control'], 'a reviewed proposal saves one of its chapter’s record types');
  assert.deepEqual(suggestionTypes('workspace.view'), []);
  const nested = suggestionCarriers({type: 'workspace.apply', payload: {commands: [{type: 'security.control', payload: {id: 'oauth', solSuggestions: '[]'}}], stamp: 'x'}});
  assert.deepEqual(nested.map(c => [c.type, c.recordId, c.strip, c.nested]), [['security.control', 'oauth', false, true]], 'a reviewed change’s inner command keeps its suggestions in place (its stamp covers them)');
  assert.deepEqual(suggestionCarriers({type: 'security.proposal', payload: {key: 'k', record: {solSuggestions: '[]'}}}).map(c => [c.type, c.strip]), [['security.proposal', true]]);
  assert.deepEqual(suggestionCarriers({type: 'interfaces.apply-impact', payload: {command: {type: 'interfaces.contract', payload: {id: 'if-004', solSuggestions: '[]'}}, previewStamp: 'x', reviewed: true}}).map(c => [c.type, c.recordId, c.strip]), [['interfaces.contract', 'if-004', false]], 'a Chapter 8 impact review carries its staged command’s suggestions');
  assert.deepEqual(suggestionCarriers({type: 'alternative.apply', payload: {commands: [{type: 'logical.responsibility', payload: {id: 'api', solSuggestions: '[]'}}, {type: 'logical.group', payload: {id: 'GRP-001'}}]}}).map(c => [c.type, c.recordId]), [['logical.responsibility', 'api']], 'a Chapter 4–7 model alternative carries each staged command’s');
  assert.deepEqual(suggestionCarriers({type: 'alternative.save', payload: {commands: [{type: 'logical.responsibility', payload: {id: 'api', solSuggestions: '[]'}}]}}), [], 'saving an alternative applies nothing, so it records nothing yet');
  assert.deepEqual(suggestionCarriers({type: 'decision.alternative', payload: {id: 'ADR-001', alternativeId: 'ALT-002', solSuggestions: '[]'}}).map(c => [c.type, c.recordId]), [['decision.alternative', 'ALT-002']], 'a Chapter 3 alternative is named by its alternativeId (its payload’s id is the decision it is nested in)');
  assert.deepEqual(suggestionCarriers({type: 'workspace.apply', payload: {commands: [{type: 'brief', payload: {problem: 'x', solSuggestions: '[]'}}]}}).map(c => [c.type, c.recordId, c.nested]), [['brief', null, true]], 'the brief has no id: the server finds it as the one brief');
  assert.deepEqual([R.recordOf(p, 'brief', 'brief'), R.recordOf(p, 'brief', null), R.recordOf(p, 'brief', 'REQ-001')], [p.brief, p.brief, null]);
  assert.equal(R.recordOf(p, 'decision.alternative', 'ALT-004').title, p.decisions.records[1].alternatives[1].title, 'an alternative is found inside its decision');
  const grown = structuredClone(p); grown.decisions.records[0].alternatives.push({id: 'ALT-099', title: 'Added'});
  assert.equal(R.addedRecordId(p, grown, ['decision.alternative']), 'ALT-099', 'the one alternative a command added');
  assert.equal(R.addedRecordId(p, p, ['decision.alternative']), null);
  pass('the validator refuses a numeric, linked or unknown field, an unknown source, a missing reference or run, an extra key such as a score, a duplicate field, more than 40 entries and unreadable input; it reads a reviewed change’s and a proposal’s suggestions');
}

// ---------------------------------------------------------------- 3. the routes: provenance stored, Sol's field mode
// A loopback double of the provider for the two field calls (the desk's own calls go to mock-llm-provider.mjs).
let draftMode = 'good';
const calls = [];
const llm = http.createServer((q, s) => { let d = ''; q.on('data', c => { d += c; }); q.on('end', () => {
  const body = JSON.parse(d || '{}'), name = body.text?.format?.name, input = JSON.parse(body.input?.[0]?.content || '{}');
  calls.push(name);
  let out;
  if (name === 'aiw_field_draft') {
    const refs = input.sources.map(x => x.ref);
    out = envelope({field: input.target.field, value: draftMode === 'number' ? 'Retry 987654 times before giving up.' : draftMode === 'empty' ? '' : `Keep the outcome pending and answer status enquiries from the recorded result for ${input.target.record}.`, basis: `It follows from the record (S1) and the requirement it serves (${refs.at(-1)}).`, sourceRefs: draftMode === 'empty' ? [] : [...new Set(['S1', refs.at(-1)])]});
  } else if (name === 'aiw_field_draft_check') out = envelope(draftMode === 'defect' ? {supported: false, defects: ['The value names a mechanism the packet does not record.'], notes: []} : {supported: true, defects: [], notes: ['Checked against S1.']});
  else out = mockAnswer(body);
  s.writeHead(200, {'Content-Type': 'application/json'}); s.end(JSON.stringify(out));
}); });
await new Promise(r => llm.listen(0, '127.0.0.1', r));
const files = new Map();
const env = {DB: localDatabase(':memory:'), OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'mock-sol', AIW_LLM_BASE_URL: `http://127.0.0.1:${llm.address().port}/v1`, FILES: {async put(k, v) { files.set(k, v); }, async get(k) { return files.has(k) ? {text: async () => files.get(k)} : null; }, async delete(k) { files.delete(k); }}, ASSETS: {fetch: () => new Response('asset')}};
const owner = 'architect-a';
const api = async (path, body, {project = 'bank-payment', bindings = env, origin = 'https://aiw.test'} = {}) => { const r = await worker.fetch(new Request('https://aiw.test' + path + (path.includes('?') ? '&' : '?') + 'project=' + project, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': owner, Origin: origin, 'Content-Type': 'application/json'}, body: body ? JSON.stringify(body) : undefined}), bindings); return {status: r.status, data: await r.json()}; };
const state = {revision: (await api('/api/project')).data.revision};
const doc = async () => (await api('/api/project')).data.document;
const send = async (command, project = 'bank-payment') => { const rev = project === 'bank-payment' ? state.revision : (await api('/api/project', null, {project})).data.revision; const r = await api('/api/commands', {revision: rev, command}, {project}); if (r.status === 200 && project === 'bank-payment') state.revision = r.data.revision; return r; };
const uuid = () => crypto.randomUUID();
const responsibilityPayload = (extra = {}) => ({title: 'Hold uncertain outcomes', purpose: R.firstSentence(req('REQ-004').description), boundary: '', owner: '', source: '', groupId: 'GRP-003', requirementIds: ['REQ-004'], decisionIds: [], confirmed: false, ...extra});
let created;
{
  const r = await send({type: 'logical.responsibility', payload: responsibilityPayload({solSuggestions: JSON.stringify([{field: 'purpose', source: 'project', ref: 'REQ-004', suggestionId: 'sg-1kphqp6', acceptedBy: 'mallory', acceptedAt: '1999-01-01T00:00:00.000Z', edited: false}])})});
  assert.equal(r.status, 200, r.data.error);
  created = r.data.selected;
  const lr = (await doc()).logical.responsibilities.find(x => x.id === created);
  assert.equal(lr.purpose, R.firstSentence(req('REQ-004').description));
  assert.equal(lr.solSuggestions, undefined, 'the carried copy is not stored on the record');
  const [s] = lr.provenance.suggestions;
  assert.deepEqual({...s, acceptedAt: undefined}, {field: 'purpose', source: 'project', ref: 'REQ-004', suggestionId: 'sg-1kphqp6', command: 'logical.responsibility', acceptedBy: owner, acceptedAt: undefined, edited: false}, 'acceptedBy is the authenticated actor, not the client’s value');
  assert.notEqual(s.acceptedAt, '1999-01-01T00:00:00.000Z', 'acceptedAt is the server’s time');
  assert.deepEqual(lr.provenance.history.map(h => [h.event, h.actor, h.fields.join()]), [['Accepted suggestions', owner, 'purpose']]);
  pass('an ordinary save stores the accepted suggestion as provenance.suggestions[] with a history event; the server sets acceptedBy and acceptedAt and keeps no copy of the carried list');
}
{
  const revision = state.revision;
  const bad = [
    [[{field: 'purpose', source: 'project', ref: 'NOWHERE-1'}], /cites NOWHERE-1, which this project does not hold/],
    [[{field: 'purpose', source: 'sol', runId: uuid()}], /names no completed Sol run of this project/],
    [[{field: 'groupId', source: 'project', ref: 'GRP-001'}], /not a free-text field/],
  ];
  for (const [list, re] of bad) { const r = await send({type: 'logical.responsibility', payload: {...responsibilityPayload({title: 'Refused ' + Math.random()}), solSuggestions: list}}); assert.equal(r.status, 400); assert.match(r.data.error, re); assert.equal(r.data.code, 'invalid_suggestions'); }
  const view = await send({type: 'workspace.view', payload: {title: 'Mine', chapter: 4, tab: 'work', objectId: '', solSuggestions: [{field: 'purpose', source: 'project', ref: 'REQ-004'}]}});
  assert.equal(view.status, 400); assert.match(view.data.error, /does not carry field suggestions/);
  assert.equal(state.revision, revision, 'a refused change saves nothing');
  const forged = await send({type: 'logical.responsibility', payload: {...responsibilityPayload({title: 'Forged provenance'}), provenance: {suggestions: [{field: 'purpose', source: 'sol', runId: uuid(), acceptedBy: 'someone-else'}]}}});
  assert.equal(forged.status, 200, forged.data.error);
  // Round 12 (D-06): the server stamps who wrote the record (provenance.author); nothing else of a payload's provenance is kept.
  const forgedProvenance = (await doc()).logical.responsibilities.find(x => x.id === forged.data.selected).provenance;
  assert.deepEqual(Object.keys(forgedProvenance || {}), ['author'], 'provenance is the server’s: a payload cannot bring its own');
  assert.equal(forgedProvenance.author.kind, 'person');
  pass('the server refuses a reference the project does not hold, a Sol run that does not exist here, a field that is not free text and suggestions on an action that saves no record, saving nothing; a payload cannot bring provenance of its own');
}
{
  // Later edits keep the provenance; a field changed by hand marks its suggestion superseded. A reviewed change
  // (workspace.apply, the in-editor review) carries the suggestions of its inner command.
  const now = await doc(), lr = now.logical.responsibilities.find(x => x.id === created);
  let r = await send({type: 'logical.responsibility', payload: {...lr, boundary: 'Uncertain settlement outcomes only.'}});
  assert.equal(r.status, 200, r.data.error);
  let kept = (await doc()).logical.responsibilities.find(x => x.id === created);
  assert.equal(kept.provenance.suggestions.length, 1, 'a later edit keeps the provenance the chapter’s save rebuilt the record without');
  assert.equal(kept.provenance.suggestions[0].superseded, undefined, 'the purpose was not touched');
  const inner = {type: 'logical.responsibility', payload: {...kept, boundary: 'Outside this responsibility: Settlement hub.', owner: 'Payments team', solSuggestions: JSON.stringify([{field: 'boundary', source: 'confirm', ref: 'GRP-003', suggestionId: 'sg-0000001', edited: true}, {field: 'owner', source: 'confirm', ref: 'REQ-004', suggestionId: 'sg-0000002', edited: false}])}};
  const stamp = previewWorkingChange(await doc(), [inner]).stamp;
  r = await send({type: 'workspace.apply', payload: {commands: [inner], stamp, reviewed: true, reason: 'Accepting the co-author suggestions.'}});
  assert.equal(r.status, 200, r.data.error);
  kept = (await doc()).logical.responsibilities.find(x => x.id === created);
  assert.deepEqual(kept.provenance.suggestions.map(s => [s.field, s.source, s.ref, s.edited, !!s.superseded]), [['purpose', 'project', 'REQ-004', false, false], ['boundary', 'confirm', 'GRP-003', true, false], ['owner', 'confirm', 'REQ-004', false, false]], 'a reviewed change stores its inner command’s suggestions');
  assert.equal(kept.solSuggestions, undefined);
  r = await send({type: 'logical.responsibility', payload: {...kept, purpose: 'Typed by hand.'}});
  assert.equal(r.status, 200, r.data.error);
  kept = (await doc()).logical.responsibilities.find(x => x.id === created);
  assert.equal(kept.provenance.suggestions.find(s => s.field === 'purpose').superseded, true, 'changed by hand, the suggestion no longer describes the value');
  assert.equal(kept.provenance.suggestions.find(s => s.field === 'boundary').superseded, undefined);
  pass('provenance survives later edits that rebuild the record, a reviewed change carries its inner command’s suggestions, and a field changed by hand marks its suggestion superseded');
}
{
  // A proposal (security.proposal) carries its suggestions on the record it proposes.
  const project = await doc(), control = project.security.controls.find(c => c.id === 'oauth');
  const failure = project.quality.drivers.find(d => d.id === 'QD-005').response;
  const inner = {type: 'security.control', payload: {...control, failureResponse: failure, solSuggestions: JSON.stringify([{field: 'failureResponse', source: 'project', ref: 'QD-005', suggestionId: 'sg-0000003', edited: false}])}};
  const r = await send({type: 'workspace.apply', payload: {commands: [inner], stamp: previewWorkingChange(project, [inner]).stamp, reviewed: true, reason: 'Co-author offer reviewed.'}});
  assert.equal(r.status, 200, r.data.error);
  const saved = (await doc()).security.controls.find(c => c.id === 'oauth');
  assert.equal(saved.failureResponse, failure);
  assert.deepEqual(saved.provenance.suggestions.map(s => [s.field, s.source, s.ref, s.command]), [['failureResponse', 'project', 'QD-005', 'security.control']]);
  pass('Chapter 9: a control saved through the in-editor review keeps the accepted offer and the driver it came from');
}
// Sol's field mode: the packet first, then the draft, recorded.
const request = {command: 'logical.responsibility', field: 'boundary', recordId: null, values: {title: 'Hold uncertain outcomes', purpose: 'Keep it pending. Key: sk-live-0123456789abcdefghijklmnop'}, links: {requirementIds: ['REQ-004'], groupId: 'GRP-003'}};
let run;
{
  assert.throws(() => fieldRequest({...request, field: 'owner'}), /does not draft owners/);
  assert.throws(() => fieldRequest({command: 'runtime.plan', field: 'maxReplicas'}), /free-text field/);
  const packet = fieldPacket(await doc(), request);
  assert.deepEqual(packet.sources.slice(0,3).map(s => s.kind), ['record', 'parent', 'neighbour'], 'the unsaved form, saved parent and filed group retain their distinct source roles');
  assert.deepEqual(packet.sources.filter(s => s.kind==='quality-driver').map(s => s.objectId), ['QD-001','QD-002','QD-003','QD-004'], 'positively scoped architecture drivers accompany the field instead of disappearing behind the form');
  assert(packet.sources.length<=10&&packet.sources.reduce((n,s)=>n+s.excerpt.length,0)<=12000,'field context stays within its original source and character bounds');
  assert.equal(new Set(packet.sources.map(s=>s.id)).size,packet.sources.length,'canonical model sources are reused without duplicate source slots');
  assert.match(packet.sources[2].title, /^GRP-003 Settlement$/);
  assert.equal(packet.target.help, 'What is explicitly outside this responsibility, and who owns that instead.', 'the field’s meaning travels with the packet');
  const S1 = JSON.parse(packet.sources[0].excerpt);
  assert.deepEqual(Object.keys(S1.recorded).filter(k => !['text', 'textarea'].includes(fieldOf('logical.responsibility', k)?.kind)), [], 'free-text fields only: no number reaches the packet from the form');
  assert.doesNotMatch(JSON.stringify(packet), /sk-live-0123456789/, 'a secret typed into the form is redacted');
  assert.deepEqual(packet.brainReceipt.instructions, fieldInstructionsPin());
  assert.equal(packet.brainReceipt.instructions.promptVersion, FIELD_PROMPT_VERSION);
  assert.equal(packet.brainReceipt.scoring, false);
  assert.equal(fieldPacket(await doc(), request).stamp, packet.stamp, 'the same record and form give the same packet');
  const ctx = await api('/api/intelligence/field-context', request);
  assert.equal(ctx.status, 200, ctx.data.error);
  assert.equal(ctx.data.packet.stamp, packet.stamp);
  assert.equal(calls.length, 0, 'preparing sends nothing to the provider');
  const stale = await api('/api/intelligence/field', {...request, requestId: uuid(), packetStamp: 'not-the-packet'});
  assert.equal(stale.status, 409, 'a packet the architect did not see is not sent');
  const r = await api('/api/intelligence/field', {...request, requestId: uuid(), packetStamp: packet.stamp});
  assert.equal(r.status, 200, r.data.error);
  run = r.data;
  assert.equal(run.status, 'completed');
  assert.equal(run.mode, 'field');
  assert.deepEqual(calls, ['aiw_field_draft', 'aiw_field_draft_check'], 'a draft and a source check');
  assert.equal(run.groundingReview.accepted, true);
  assert.deepEqual(run.instructions, fieldInstructionsPin(), 'the run says which prompt it answered');
  assert.equal(run.groundingReview.packetStamp, packet.stamp);
  assert.match(run.result.value, /Keep the outcome pending/);
  assert.ok(run.result.sourceRefs.includes('S1'));
  const listed = await api('/api/intelligence/field-runs');
  assert.deepEqual(listed.data.runs.map(x => [x.id, x.request.field, x.accepted]), [[run.id, 'boundary', true]], 'saved and listed for the Co-author panel');
  const unconfigured = await api('/api/intelligence/field', {...request, requestId: uuid(), packetStamp: packet.stamp}, {bindings: {...env, OPENAI_API_KEY: ''}});
  assert.equal(unconfigured.status, 503); assert.match(unconfigured.data.error, /not configured/);
  pass('Sol’s field mode: the packet is prepared and shown first (free text only, secrets redacted, the prompt pinned), sent only as the architect saw it, drafted, source-checked and recorded as a run with its pin; without a provider nothing is sent');
}
{
  // The guard and the second pass withhold a draft; a withheld draft cannot be accepted.
  draftMode = 'number';
  const k = fieldPacket(await doc(), request);
  let r = await api('/api/intelligence/field', {...request, requestId: uuid(), packetStamp: k.stamp});
  assert.equal(r.data.result.withheld, true); assert.match(r.data.result.issues.join(' '), /987654/);
  const withheld = r.data;
  draftMode = 'defect';
  r = await api('/api/intelligence/field', {...request, requestId: uuid(), packetStamp: k.stamp});
  assert.equal(r.data.result.withheld, true); assert.match(r.data.result.issues.join(' '), /mechanism the packet does not record/);
  draftMode = 'good';
  const refused = await send({type: 'logical.responsibility', payload: responsibilityPayload({title: 'From a withheld draft', boundary: 'x', solSuggestions: [{field: 'boundary', source: 'sol', runId: withheld.id}]})});
  assert.equal(refused.status, 400); assert.match(refused.data.error, /withheld/);
  pass('a draft that states a number the packet lacks, or that the source check finds unsupported, is withheld, and a withheld draft cannot be accepted');
}
{
  // A Sol draft is accepted only from a completed run of this project for that field; the server works out `edited`.
  const second = await api('/api/projects', {name: 'Other project', template: 'blank', brief: 'Equipment reservations.'});
  const other = second.data.document.id;
  const foreign = await api('/api/intelligence/field', {command: 'review.narrative', field: 'summary', recordId: 'SDD', values: {}, links: {}, requestId: uuid(), packetStamp: fieldPacket((await api('/api/project', null, {project: other})).data.document, {command: 'review.narrative', field: 'summary', recordId: 'SDD'}).stamp}, {project: other});
  assert.equal(foreign.status, 200, foreign.data.error);
  let r = await send({type: 'review.narrative', payload: {...(await doc()).finalReview.narrative, summary: foreign.data.result.value, solSuggestions: [{field: 'summary', source: 'sol', runId: foreign.data.id}]}});
  assert.equal(r.status, 400); assert.match(r.data.error, /names no completed Sol run of this project/, 'another project’s run is refused');
  r = await send({type: 'logical.responsibility', payload: responsibilityPayload({title: 'Wrong field', purpose: run.result.value, solSuggestions: [{field: 'purpose', source: 'sol', runId: run.id}]})});
  assert.equal(r.status, 400); assert.match(r.data.error, /drafted for another field/);
  r = await send({type: 'logical.responsibility', payload: responsibilityPayload({title: 'Bounded by Sol', boundary: run.result.value + ' Reviewed by the architect.', solSuggestions: [{field: 'boundary', source: 'sol', runId: run.id, edited: false}]})});
  assert.equal(r.status, 200, r.data.error);
  const s = (await doc()).logical.responsibilities.find(x => x.id === r.data.selected).provenance.suggestions[0];
  assert.deepEqual([s.field, s.source, s.runId, s.edited], ['boundary', 'sol', run.id, true], 'edited, as the server reads the saved value against the run, whatever the client said');
  r = await send({type: 'logical.responsibility', payload: responsibilityPayload({title: 'Bounded by Sol, as drafted', boundary: run.result.value, solSuggestions: [{field: 'boundary', source: 'sol', runId: run.id, edited: true}]})});
  assert.equal((await doc()).logical.responsibilities.find(x => x.id === r.data.selected).provenance.suggestions[0].edited, false);
  pass('a Sol draft is accepted only from a completed run of this project drafted for that field; another project’s run or another field’s is refused; whether it was edited is the server’s reading');
}
{
  // The contract, on its own: structure, citations, length, markup, numbers and claims.
  const packet = fieldPacket(await doc(), request), good = {field: 'boundary', value: 'Outcomes stay pending until an enquiry resolves them.', basis: 'It follows from S1 and S2.', sourceRefs: ['S1', 'S2']};
  assert.deepEqual(fieldDraftSchema(packet).properties.field.enum, ['boundary']);
  assert.deepEqual(fieldDraftSchema(packet).properties.sourceRefs.items.enum, packet.sources.map(s => s.ref));
  assert.deepEqual(validateFieldDraft(good, packet).sourceRefs, ['S1', 'S2']);
  assert.throws(() => validateFieldDraft({...good, extra: 1}, packet), /unsupported field draft/);
  assert.throws(() => validateFieldDraft({...good, field: 'purpose'}, packet), /different field/);
  assert.throws(() => validateFieldDraft({...good, sourceRefs: ['S9']}, packet), /outside the reviewed packet/);
  assert.throws(() => validateFieldDraft({...good, sourceRefs: []}, packet), /cites no source/);
  assert.throws(() => validateFieldDraft({...good, value: '<b>x</b>'}, packet), /markup/);
  assert.throws(() => validateFieldDraft({...good, value: 'x'.repeat(packet.target.maxLength + 1)}, packet), /longer than the field allows/);
  assert.deepEqual(guardFieldDraft(packet, validateFieldDraft(good, packet)), []);
  assert.match(guardFieldDraft(packet, {...good, value: 'This guarantees zero loss.'}).join(' '), /guaranteeing/);
  assert.match(guardFieldDraft(packet, {...good, sourceRefs: ['S2']}).join(' '), /does not cite the record/);
  // A second pass that names a defect withholds the draft (the provider call itself, with a fetcher stub).
  const answers = [envelope(good), envelope({supported: false, defects: ['It invents an owner.'], notes: []})];
  const stub = async () => new Response(JSON.stringify(answers.shift()), {status: 200});
  const drafted = await requestFieldDraft({OPENAI_API_KEY: 'k', AIW_LLM_MODEL: 'm', AIW_LLM_BASE_URL: 'http://127.0.0.1:9/v1'}, packet, {fetcher: stub});
  assert.equal(drafted.result.withheld, true); assert.deepEqual(drafted.result.issues, ['It invents an owner.']); assert.equal(drafted.groundingReview.accepted, false);
  pass('the field-draft contract: the asked field only, refs inside the packet, the field’s length, no markup, no number the packet lacks, no guarantee, the record cited; the second pass’s defect withholds');
}
{
  // Co-author dismissals: kept under the workspace with their reason; no design record changes.
  const project = await doc(), first = R.openSuggestions(project, 9)[0];
  assert.ok(first, 'the Co-author list still offers something in Chapter 9');
  const designBefore = JSON.stringify({logical: project.logical, security: project.security, contentVersion: project.contentVersion});
  let r = await send({type: 'coauthor.disposition', payload: {suggestionId: first.offer.id, command: first.command, recordId: first.recordId, field: first.field, source: first.offer.band, ref: first.offer.ref, reason: 'Verification is planned with the bank’s test team.'}});
  assert.equal(r.status, 200, r.data.error);
  const after = await doc();
  assert.equal(JSON.stringify({logical: after.logical, security: after.security, contentVersion: after.contentVersion}), designBefore, 'a dismissal is not a design change');
  assert.deepEqual(after.workspace.coauthor.dispositions.map(d => [d.suggestionId, d.field, d.source, d.outcome, d.actor]), [[first.offer.id, first.field, 'project', 'dismissed', owner]]);
  assert.ok(!R.openSuggestions(after, 9).some(x => x.offer.id === first.offer.id), 'and it leaves the list');
  for (const [payload, re] of [[{reason: 'short'}, /one-line reason/], [{reason: 'Two\nlines of reason here.'}, /one-line reason/], [{field: 'owner2'}, /field of a record/], [{source: 'sol', runId: 'nope'}, /run it came from/], [{ref: 'NOWHERE-9'}, /does not hold/]]) {
    r = await send({type: 'coauthor.disposition', payload: {suggestionId: first.offer.id, command: first.command, recordId: first.recordId, field: first.field, source: first.offer.band, ref: first.offer.ref, reason: 'A long enough reason.', ...payload}});
    assert.equal(r.status, 400); assert.match(r.data.error, re);
  }
  pass('a Co-author dismissal is kept under the workspace with its one-line reason and actor, removes the offer from the list and changes no design record; a short or multi-line reason, an unknown field or a citation the project lacks is refused');
}
{
  const stats = suggestionStatistics(await doc());
  // Accepted: REQ-004's purpose (since changed by hand) and QD-005's failure response from the project; GRP-003's boundary
  // (edited) and REQ-004's owner confirmed; Sol's boundary twice (once edited). Dismissed: one Chapter 9 offer.
  assert.deepEqual([stats.accepted, stats.edited, stats.superseded, stats.dismissed], [6, 2, 1, 1]);
  assert.deepEqual(stats.bySource.map(r => [r.key, r.accepted, r.edited, r.dismissed]), [['project', 2, 0, 1], ['confirm', 2, 1, 0], ['sol', 2, 1, 0]]);
  const boundary = stats.byField.find(r => r.key === 'logical.responsibility:boundary');
  assert.deepEqual([boundary.label, boundary.accepted, boundary.edited], ['Boundary · responsibility', 3, 2]);
  const html = adoptionStatisticsHTML(await doc());
  assert.match(html, /What architects did with field suggestions[\s\S]*6 accepted \(2 edited before saving, 1 since changed by hand\) · 1 dismissed with a reason[\s\S]*By source[\s\S]*Sol draft[\s\S]*By field/);
  assert.doesNotMatch(html, /<th>[^<]*(?:score|rank|rate)/i, 'no column scores, ranks or rates a source');
  pass('the stewards’ view counts field suggestions per source and field: accepted, edited, since changed by hand and dismissed — counts only');
}
{
  // Chapters 1–3 through the server: the brief (one record, no id), a requirement through the in-editor review, a new
  // conflict and a new alternative (their commands select nothing or the decision: the record added is found), an
  // existing alternative (named by its alternativeId), each stored as provenance; a measured target's metric refused.
  const project = await doc();
  const goal = project.artefacts.find(a => a.id === 'OUT-002').description;
  let r = await send({type: 'brief', payload: {...project.brief, goal, solSuggestions: JSON.stringify([{field: 'goal', source: 'project', ref: 'OUT-002', suggestionId: 'sg-0000010', edited: false}])}});
  assert.equal(r.status, 200, r.data.error);
  let now = await doc();
  assert.equal(now.brief.goal, goal);
  assert.deepEqual(now.brief.provenance.suggestions.map(s => [s.field, s.source, s.ref, s.command, s.acceptedBy]), [['goal', 'project', 'OUT-002', 'brief', owner]], 'the brief keeps the outcome its goal was copied from');
  r = await send({type: 'brief', payload: {...now.brief, problem: now.brief.problem + ' Edited by hand.'}});
  assert.equal(r.status, 200, r.data.error);
  assert.equal((await doc()).brief.provenance.suggestions.length, 1, 'kept across a later save that rebuilds the brief');
  // REQ-005's acceptance, confirmed, saved through the in-editor review (workspace.apply) as its page does.
  now = await doc();
  const acceptance = R.fieldOffers(now, 'artefact', {recordId: 'REQ-005'}).acceptance.find(o => o.band === 'confirm');
  const inner = {type: 'artefact', payload: {...now.artefacts.find(a => a.id === 'REQ-005'), acceptance: acceptance.value, solSuggestions: JSON.stringify([{field: 'acceptance', source: 'confirm', ref: acceptance.ref, suggestionId: acceptance.id, edited: false}])}};
  r = await send({type: 'workspace.apply', payload: {commands: [inner], stamp: previewWorkingChange(now, [inner]).stamp, reviewed: true, reason: 'Acceptance confirmed from the journey.'}});
  assert.equal(r.status, 200, r.data.error);
  const req5 = (await doc()).artefacts.find(a => a.id === 'REQ-005');
  assert.equal(req5.acceptance, acceptance.value);
  assert.deepEqual(req5.provenance.suggestions.map(s => [s.field, s.source, s.ref, s.command]), [['acceptance', 'confirm', 'JRN-005', 'artefact']]);
  // A new conflict: its command selects nothing; the one conflict it added carries the suggestion.
  const conflictOffer = R.fieldOffers(await doc(), 'quality.conflict', {values: {driver0: 'QD-001', driver1: 'QD-003'}}).effect[0];
  r = await send({type: 'quality.conflict', payload: {driver0: 'QD-001', driver1: 'QD-003', driverIds: ['QD-001', 'QD-003'], title: 'Integrity versus acknowledgement time', effect: conflictOffer.value, resolution: '', owner: '', status: 'open', solSuggestions: JSON.stringify([{field: 'effect', source: 'confirm', ref: conflictOffer.ref, suggestionId: conflictOffer.id, edited: false}])}});
  assert.equal(r.status, 200, r.data.error);
  const conflict = (await doc()).quality.conflicts.at(-1);
  assert.deepEqual(conflict.provenance.suggestions.map(s => [s.field, s.source, s.ref, s.command]), [['effect', 'confirm', 'QD-001', 'quality.conflict']]);
  // A new alternative: its command selects the decision; the alternative it added carries the suggestion.
  now = await doc();
  const decisionNow = now.decisions.records.find(x => x.id === 'ADR-003'), tactic = now.quality.drivers.find(x => x.id === 'QD-004').tactic;
  const assessments = Object.fromEntries(decisionNow.driverIds.map(id => [id, {effect: 'unknown', reason: '', evidence: ''}]));
  r = await send({type: 'decision.alternative', payload: {id: 'ADR-003', alternativeId: null, title: 'Hold and reconcile', summary: '', benefits: '', costs: '', consequences: '', pattern: tactic, antiPattern: '', responsibilityIds: [], relationships: [], assessments, solSuggestions: JSON.stringify([{field: 'pattern', source: 'project', ref: 'QD-004', suggestionId: 'sg-0000011', edited: false}])}});
  assert.equal(r.status, 200, r.data.error);
  const added = (await doc()).decisions.records.find(x => x.id === 'ADR-003').alternatives.at(-1);
  assert.equal(added.title, 'Hold and reconcile');
  assert.deepEqual(added.provenance.suggestions.map(s => [s.field, s.source, s.ref, s.command]), [['pattern', 'project', 'QD-004', 'decision.alternative']]);
  // Round 12 (D-06): the decision carries only the server's stamp of who wrote it, none of the alternative's suggestions.
  assert.deepEqual(Object.keys((await doc()).decisions.records.find(x => x.id === 'ADR-003').provenance || {}), ['author'], 'the decision it is nested in carries nothing');
  // An existing alternative, named by its alternativeId.
  const alt1 = (await doc()).decisions.records.find(x => x.id === 'ADR-001').alternatives.find(x => x.id === 'ALT-001');
  const consequence = R.fieldOffers(await doc(), 'decision.alternative', {recordId: 'ALT-001'}).consequences[0];
  r = await send({type: 'decision.alternative', payload: {...alt1, id: 'ADR-001', alternativeId: 'ALT-001', consequences: consequence.value, solSuggestions: JSON.stringify([{field: 'consequences', source: 'confirm', ref: consequence.ref, suggestionId: consequence.id, edited: false}])}});
  assert.equal(r.status, 200, r.data.error);
  const altSaved = (await doc()).decisions.records.find(x => x.id === 'ADR-001').alternatives.find(x => x.id === 'ALT-001');
  assert.deepEqual(altSaved.provenance.suggestions.map(s => [s.field, s.source, s.ref, s.edited]), [['consequences', 'confirm', consequence.ref, false]]);
  // A new alternative saved through the in-editor review (its page reviews it, since the payload names its decision):
  // the reviewed change's inner command names no alternative, so the one it added carries the suggestion.
  now = await doc();
  const innerAlt = {type: 'decision.alternative', payload: {id: 'ADR-002', alternativeId: null, title: 'Reviewed approach', summary: '', benefits: '', costs: '', consequences: '', pattern: now.quality.drivers.find(x => x.id === 'QD-001').tactic, antiPattern: '', responsibilityIds: [], relationships: [], assessments: Object.fromEntries(now.decisions.records.find(x => x.id === 'ADR-002').driverIds.map(id => [id, {effect: 'unknown', reason: '', evidence: ''}])), solSuggestions: JSON.stringify([{field: 'pattern', source: 'project', ref: 'QD-001', suggestionId: 'sg-0000012', edited: false}])}};
  r = await send({type: 'workspace.apply', payload: {commands: [innerAlt], stamp: previewWorkingChange(now, [innerAlt]).stamp, reviewed: true, reason: 'Alternative reviewed in its editor.'}});
  assert.equal(r.status, 200, r.data.error);
  const reviewedAlt = (await doc()).decisions.records.find(x => x.id === 'ADR-002').alternatives.at(-1);
  assert.equal(reviewedAlt.title, 'Reviewed approach');
  assert.deepEqual(reviewedAlt.provenance.suggestions.map(s => [s.field, s.source, s.ref, s.command]), [['pattern', 'project', 'QD-001', 'decision.alternative']]);
  // Sol drafts a Chapter 2 field the same way (against the provider double): the packet anchored on the requirement the
  // form links, the run recorded, then accepted only for that field.
  const solRequest = {command: 'quality.driver', field: 'stimulus', recordId: null, values: {title: 'Hold an uncertain settlement'}, links: {requirementIds: ['REQ-004'], category: 'recoverability'}};
  const driverPacket = fieldPacket(await doc(), solRequest);
  assert.deepEqual(driverPacket.sources.slice(0,2).map(x => [x.kind, x.objectId]), [['record', null], ['parent', 'REQ-004']], 'the uncommitted driver wording remains anchored to the saved requirement');
  assert(driverPacket.sources.filter(s=>s.kind==='quality-driver').every(s=>['QD-001','QD-002','QD-003','QD-004'].includes(s.objectId)),'existing driver context is scoped; the new unsaved driver is never represented as an approved fact');
  const driverRun = (await api('/api/intelligence/field', {...solRequest, requestId: uuid(), packetStamp: driverPacket.stamp})).data;
  assert.equal(driverRun.status, 'completed', driverRun.error);
  const driverPayload = {category: 'recoverability', title: 'Hold an uncertain settlement', stimulus: driverRun.result.value, conditions: '', response: '', metric: '', operator: 'At most', targetValue: '', unit: '', window: '', measurement: '', requirementIds: ['REQ-004'], responsibilityIds: [], priority: 'Important', owner: '', rationale: '', source: '', tactic: '', confirmed: false, targetConfirmed: false};
  r = await send({type: 'quality.driver', payload: {...driverPayload, response: driverRun.result.value, solSuggestions: [{field: 'response', source: 'sol', runId: driverRun.id}]}});
  assert.equal(r.status, 400); assert.match(r.data.error, /drafted for another field/);
  r = await send({type: 'quality.driver', payload: {...driverPayload, solSuggestions: [{field: 'stimulus', source: 'sol', runId: driverRun.id, edited: true}]}});
  assert.equal(r.status, 200, r.data.error);
  const drafted = (await doc()).quality.drivers.find(x => x.id === r.data.selected);
  assert.deepEqual(drafted.provenance.suggestions.map(s => [s.field, s.source, s.runId, s.edited]), [['stimulus', 'sol', driverRun.id, false]], 'saved as drafted, whatever the client said');
  // A driver's metric is part of its measured target: no suggestion can be carried for it.
  const qd = (await doc()).quality.drivers.find(x => x.id === 'QD-004'), revision = state.revision;
  r = await send({type: 'quality.driver', payload: {...qd, solSuggestions: [{field: 'metric', source: 'project', ref: 'REQ-004'}]}});
  assert.equal(r.status, 400); assert.match(r.data.error, /not a free-text field/); assert.equal(state.revision, revision);
  r = await send({type: 'quality.driver', payload: {...qd, solSuggestions: [{field: 'stimulus', source: 'project', ref: 'NOWHERE-2'}]}});
  assert.equal(r.status, 400); assert.match(r.data.error, /does not hold/);
  pass('Chapters 1–3 through the server: the brief, a requirement saved through its review, a new conflict, a new nested alternative (directly and through its review) and an existing one each keep the accepted suggestion as provenance with the server’s actor; a Sol draft of a driver’s stimulus (provider double) is accepted for that field only; a driver’s metric or a citation the project lacks is refused');
}
{
  // Added by the hygiene workstream (round 2, R2-G, at the lead's request): the stewards' view counts the suggestions
  // kept on the brief, on Chapter 1 artefacts and on the alternatives nested in decisions (the Chapters 1–3 saves
  // above), each under its own noun; Sol's packet names the brief as the brief, a new artefact by its type and a
  // parent decision by its question.
  const now = await doc(), stats = suggestionStatistics(now), row = key => stats.byField.find(r => r.key === key);
  assert.deepEqual([row('brief:goal')?.label, row('brief:goal')?.accepted], ['Goal · project brief', 1]);
  assert.deepEqual([row('artefact:acceptance')?.label, row('artefact:acceptance')?.accepted], ['Acceptance · artefact', 1]);
  assert.deepEqual([row('decision.alternative:pattern')?.label, row('decision.alternative:pattern')?.accepted], ['Pattern · alternative', 2]);
  assert.equal(row('decision.alternative:consequences')?.accepted, 1);
  assert.equal(row('quality.conflict:effect')?.label, 'Effect · quality conflict');
  const target = q => fieldPacket(now, q).target.record;
  assert.equal(target({command: 'brief', field: 'goal', recordId: null, values: {}, links: {}}), 'Project brief');
  assert.equal(target({command: 'artefact', field: 'description', recordId: null, values: {title: 'Pay'}, links: {type: 'requirement'}}), 'A new requirement');
  assert.equal(target({command: 'decision.save', field: 'context', recordId: null, values: {question: 'Which?'}, links: {}}), 'A new decision');
  const parent = fieldPacket(now, {command: 'decision.alternative', field: 'consequences', recordId: 'ALT-001', values: {}, links: {}}).sources.find(x => x.kind === 'parent');
  assert.equal(parent.title, ('ADR-001 ' + now.decisions.records.find(x => x.id === 'ADR-001').question).slice(0, 160), 'the parent decision is titled by its question');
  pass('the stewards’ view counts suggestions on the brief, Chapter 1 artefacts and nested alternatives under their own nouns; Sol’s packet names the brief, a new artefact by its type and a parent decision by its question');
}
{
  // Round 11: the packet is about this record in this design. Its neighbours by chapter come as short readings right
  // after the parent, before the requirements, drivers and claims, so the budget trims the lower-value sources first;
  // the field's meaning (record-fields.js fieldHelp) rides on the target and the instruction says to write for it.
  const now = await doc(), packetOf = q => fieldPacket(now, q), kinds = k => k.sources.map(s => s.kind), neighbours = k => k.sources.filter(s => s.kind === 'neighbour');
  // A component: the responsibilities it realises (the first is its parent), with their purposes.
  const comp = packetOf({command: 'realisation.component', field: 'boundary', recordId: 'api-pod', values: {}, links: {logicalIds: ['api', 'risk']}});
  assert.equal(comp.sources.find(s => s.kind === 'parent').title, 'LR-001 Payment API');
  const risk = neighbours(comp).find(s => s.objectId === 'risk');
  assert.ok(risk && /^LR-002 /.test(risk.title) && /a Chapter 4 responsibility, a responsibility this component realises/i.test(risk.posture), 'the second responsibility is a neighbour with its chapter and relation');
  assert.equal(JSON.parse(risk.excerpt).purpose, now.logical.responsibilities.find(r => r.id === 'risk').purpose.slice(0, 320), 'with its purpose, verbatim and short');
  assert.ok(neighbours(comp).some(s => s.objectId === 'instruction'), 'and the data it handles');
  assert.ok(neighbours(comp).some(s => /^TN-\d{3} compute need$/.test(s.title)), 'and the platform needs Chapter 6 records for it, named by category');
  assert.deepEqual(kinds(comp).slice(0, 3), ['record', 'parent', 'neighbour'], 'the form, its saved parent and immediate neighbours precede optional derived guidance');
  assert.ok(kinds(comp).indexOf('neighbour') < kinds(comp).indexOf('requirement') && kinds(comp).indexOf('requirement') < kinds(comp).indexOf('quality-driver'), 'then the neighbours, then the requirements, then the drivers');
  assert.ok(comp.omissions.length && comp.omissions.every(o => /^(?:driver|claim|requirement|reading|catalogue|architecture-intelligence):/.test(o.id)), 'bounded context names each omitted driver, source or derived reading: ' + JSON.stringify(comp.omissions));
  assert(kinds(comp).includes('chapter-reading')||comp.omissions.some(o=>o.id==='reading:api-pod'),'the chapter reading is retained or explicitly reported as omitted');
  assert.equal(comp.criticalContext.complete,false,'omitted critical drivers cannot be assumed satisfied by field wording');
  assert.ok(comp.coverage.characters <= comp.coverage.maxCharacters && comp.coverage.maxCharacters === 12000 && comp.coverage.maxSources === 10, 'the budgets are unchanged');
  // A contract: its two ends (a party and a component), the payloads and the controls on it.
  const contract = packetOf({command: 'interfaces.contract', field: 'failurePolicy', recordId: 'rest', values: {}, links: {}});
  assert.deepEqual(neighbours(contract).slice(0, 2).map(s => [s.objectId, s.title, /\(caller\)/.test(s.posture) ? 'caller' : /\(provider\)/.test(s.posture) ? 'provider' : '?']), [['ext-channel', 'EXT-001 Initiating channel', 'caller'], ['api-pod', 'APP-001 Payment service', 'provider']], 'the two components at its ends, caller and provider');
  assert.ok(neighbours(contract).some(s => s.objectId === 'instruction') && neighbours(contract).some(s => s.objectId === 'oauth'), 'its request payload and the control on it');
  assert.equal(contract.target.help, 'What the caller does when the provider fails or does not answer.');
  // A control: the threats it treats and the objects it protects; a runtime plan: the part it runs and the capabilities that part needs.
  const control = packetOf({command: 'security.control', field: 'mechanism', recordId: 'oauth', values: {}, links: {}});
  assert.ok(neighbours(control).some(s => s.objectId === 'thr-001' && /threat/.test(s.posture)) && neighbours(control).some(s => s.objectId === 'api-pod'), 'a control: its threat and a protected component');
  const plan = packetOf({command: 'runtime.plan', field: 'readiness', recordId: 'run-001', values: {}, links: {}});
  assert.equal(plan.sources.find(s => s.kind === 'parent').objectId, 'api-pod', 'a plan: the component it runs');
  assert.ok(neighbours(plan).some(s => s.objectId === 'tc-001' && /capability/.test(s.posture)), 'and a capability that component needs');
  // A requirement: its drivers; a trade-off (decision): its alternatives; a responsibility: its group and the components that realise it.
  const req = packetOf({command: 'artefact', field: 'description', recordId: 'REQ-001', values: {}, links: {}});
  assert.ok(req.sources.some(s => s.kind === 'quality-driver' && s.objectId === 'QD-002'), 'a requirement: a driver that covers it');
  const dec = packetOf({command: 'decision.save', field: 'rationale', recordId: 'ADR-001', values: {}, links: {}});
  assert.deepEqual(neighbours(dec).map(s => [s.objectId, /an alternative of this decision/.test(s.posture)]), [['ALT-001', true], ['ALT-002', true]], 'a decision: its alternatives, each a short reading');
  const choosing = {...now, decisions: {...now.decisions, records: now.decisions.records.map(d => d.id === 'ADR-001' ? {...d, selectedAlternativeId: 'ALT-002'} : d)}};
  assert.deepEqual(neighbours(fieldPacket(choosing, {command: 'decision.save', field: 'rationale', recordId: 'ADR-001', values: {}, links: {}})).slice(0, 2).map(s => [s.objectId, /the working choice/.test(s.posture)]), [['ALT-002', true], ['ALT-001', false]], 'once one is chosen, the working choice comes first and says so');
  const lr = packetOf({command: 'logical.responsibility', field: 'boundary', recordId: 'api', values: {}, links: {}});
  assert.ok(neighbours(lr).some(s => s.objectId === 'GRP-001') && neighbours(lr).some(s => s.objectId === 'api-pod'), 'a responsibility: its group and the component that realises it');
  // Every record type the spark serves has a neighbour reading that does not throw, and every spark field a meaning.
  for (const command of Object.keys(R.RECORD_COLLECTIONS)) {
    const sample = R.recordsOf(now, command)[0] || {};
    assert.ok(Array.isArray(R.relatedOf(now, command, sample).neighbours), command + ' reads its neighbours');
    for (const d of R.sparkFields(command)) assert.ok(fieldHelp(command, d.name).length > 12, `${command}.${d.name} has a meaning for the packet`);
  }
  assert.equal(FIELD_PROMPT_VERSION, 'sol-field-3');
  assert.match(FIELD_INSTRUCTIONS, /target\.help says what this field means[\s\S]*sources of kind neighbour/, 'the instruction reads the help and the neighbours');
  pass('field context preserves the saved parent and neighbours, adds positively scoped drivers and bounded architecture knowledge, reports omitted critical context, and uses the pinned field instructions');
}
{
  // Round 11, coverage: a rule provider for every record type the spark serves (the seven that had none: dependency,
  // boundary, TI connection, party, lineage, environment, zone; and the placement, the data field and the reviewed
  // ghost, brought into the spark), and descriptors for every form. Each provider is deterministic and cites records
  // the project holds; no offer carries a score.
  const now = await doc();
  assert.deepEqual(Object.keys(R.RECORD_COLLECTIONS).filter(c => !R.PROVIDED_TYPES.includes(c)), [], 'every record type the spark serves has a provider');
  assert.deepEqual(Object.keys(FORM_IDS).filter(c => !RECORD_FIELDS[c]), [], 'every form has descriptors');
  assert.ok(!R.sparkFields('logical.candidate').some(d => d.name === 'relationship') && R.sparkFields('logical.candidate').map(d => d.name).join() === 'title,purpose,boundary,owner,source', 'a ghost’s form is sparked like a responsibility’s; its own relationship field is not');
  const cites = (command, ctx) => { const o = R.fieldOffers(now, command, ctx); const all = Object.values(o).flat(); assert.ok(all.length, command + ' offers something on the reference project'); for (const x of all) assert.ok(R.refExists(now, x.ref) && !('score' in x) && x.value, `${command}.${x.field} cites ${x.ref}, which the project holds, without a score`); return o; };
  const dep = cites('technology.dependency', {recordId: 'TD-001'});
  assert.equal(has(dep.label, 'confirm', 'tc-001').value, 'Application execution needs Service connectivity.', 'a dependency’s meaning from its two capabilities, to confirm');
  assert.ok(has(dep.policy, 'project', 'tb-001') && has(dep.policy, 'project', 'tb-002'), 'its policy from the boundaries the capabilities sit in');
  const boundary = cites('technology.boundary', {recordId: 'tb-001'});
  assert.ok(has(boundary.policy, 'project', 'mtls'), 'a boundary’s policy from a Chapter 9 transport control');
  assert.ok((boundary.owner || []).some(x => x.band === 'confirm' && x.refLabel === 'TC-005'), 'its owner from a capability inside it, to confirm');
  const ti = cites('techrealisation.connection', {recordId: null, values: {from: 'tr-001', to: 'tr-002'}});
  assert.ok(has(ti.contract, 'project', 'if-004') && has(ti.failure, 'project', 'if-004'), 'a technology interface’s obligations from the contracts between the components its realizations serve');
  assert.match(has(ti.data, 'confirm', 'instruction').value, /^Payment instruction \(Confidential\)/, 'the payloads with their classification, to confirm');
  const party = cites('interfaces.party', {recordId: 'ext-channel'});
  assert.equal(has(party.purpose, 'confirm', 'rest').value, 'Takes part in IF-001 Payment initiation (calls).');
  const lineage = cites('interfaces.lineage', {recordId: null, values: {from: 'instruction', to: 'posting', contractId: 'posting-api'}});
  assert.ok(has(lineage.transformation, 'project', 'posting-api') && has(lineage.title, 'confirm', 'instruction'), 'a lineage’s transformation from the contract it passes through');
  const env = cites('runtime.environment', {recordId: 'env-001'});
  assert.match(has(env.purpose, 'confirm', 'api-pod').value, /^Runs Payment service, Risk engine/, 'an environment’s purpose from the assets it runs');
  assert.ok(has(env.basis, 'project', 'zone-a') && has(env.basis, 'project', 'QD-002'), 'its basis from its zones’ isolation and the availability conditions');
  const zone = cites('runtime.zone', {recordId: 'zone-a'});
  assert.ok(has(zone.isolation, 'project', 'tb-002') && has(zone.failureDomain, 'project', 'tc-001'), 'a zone’s isolation from the boundary it enforces and its failure domain from a capability in it');
  const placement = cites('runtime.placement', {recordId: 'PL-001'});
  assert.ok(has(placement.basis, 'project', 'run-001') && has(placement.basis, 'confirm', 'zone-a'), 'a placement’s basis from its plan’s capacity basis and the zone it names');
  const field = cites('interfaces.field', {recordId: 'DF-001'});
  assert.ok(has(field.constraints, 'confirm', 'rest') && has(field.description, 'confirm', 'instruction'), 'a data field: the contract that uses it as a key, and its definition’s purpose');
  const ghost = cites('logical.candidate', {recordId: null, values: {requirementIds: ['REQ-004'], groupId: 'GRP-003', title: 'Hold'}});
  assert.deepEqual([ghost.purpose?.[0]?.ref, ghost.boundary?.[0]?.ref], ['REQ-004', 'GRP-003'], 'a reviewed ghost’s form is read like a responsibility’s');
  // Through the server: a ghost accepted as a responsibility, a placement and a data field each keep the accepted
  // suggestion as provenance; a ghost's suggestions resolve to its chapter's record types.
  assert.deepEqual(suggestionTypes('logical.candidate'), ['logical.responsibility', 'logical.group', 'logical.connection', 'logical.mapping'], 'a candidate’s save is one of its chapter’s record types, never a candidate');
  assert.deepEqual(suggestionTypes('runtime.placement'), ['runtime.placement']); assert.deepEqual(suggestionTypes('interfaces.field'), ['interfaces.field']);
  let r = await send({type: 'logical.candidate', payload: {key: 'review', title: 'Held payment review', purpose: R.firstSentence(req('REQ-004').description), boundary: '', owner: '', source: '', groupId: 'GRP-003', requirementIds: ['REQ-004'], decisionIds: [], relationship: 'routes held payments to', solSuggestions: [{field: 'purpose', source: 'project', ref: 'REQ-004'}]}});
  assert.equal(r.status, 200, r.data.error);
  const held = (await doc()).logical.responsibilities.find(x => x.id === r.data.selected);
  assert.deepEqual(held.provenance.suggestions.map(s => [s.field, s.source, s.ref, s.command]), [['purpose', 'project', 'REQ-004', 'logical.responsibility']], 'the ghost’s accepted offer is kept on the responsibility it became');
  r = await send({type: 'runtime.placement', payload: {planId: 'run-001', zoneId: 'zone-b', role: 'standby', replicas: 1, basis: (await doc()).runtime.plans.find(x => x.id === 'run-001').capacityBasis, confirmed: false, solSuggestions: [{field: 'basis', source: 'project', ref: 'run-001'}]}});
  assert.equal(r.status, 200, r.data.error);
  const placed = (await doc()).runtime.placements.find(l => l.planId === 'run-001' && l.zoneId === 'zone-b' && l.role === 'standby');
  assert.deepEqual(placed.provenance.suggestions.map(s => [s.field, s.source, s.ref, s.command]), [['basis', 'project', 'run-001', 'runtime.placement']], 'a placement keeps the accepted offer');
  r = await send({type: 'interfaces.field', payload: {id: 'instruction', field: {name: 'channelReference', type: 'string', classification: 'Inherited', description: 'Part of Payment instruction: stores the immutable customer instruction and its end-to-end reference.', required: false, key: false, enumeration: '', constraints: '', example: '', solSuggestions: [{field: 'description', source: 'confirm', ref: 'instruction'}]}}});
  assert.equal(r.status, 200, r.data.error);
  const added = (await doc()).interfaces.data.find(d => d.id === 'instruction').fields.find(f => f.name === 'channelReference');
  assert.deepEqual(added.provenance.suggestions.map(s => [s.field, s.source, s.ref, s.command]), [['description', 'confirm', 'instruction', 'interfaces.field']], 'a data field keeps the accepted offer, carried inside its definition’s payload');
  assert.equal(added.solSuggestions, undefined);
  r = await send({type: 'interfaces.field', payload: {id: 'instruction', field: {name: 'otherReference', type: 'string', classification: 'Inherited', description: 'x', solSuggestions: [{field: 'description', source: 'project', ref: 'NOWHERE-9'}]}}});
  assert.equal(r.status, 400); assert.match(r.data.error, /does not hold/, 'a field’s citation is checked like any other');
  pass('coverage: a provider for every record type the spark serves (dependency, boundary, TI connection, party, lineage, environment, zone, placement, data field, reviewed ghost), each deterministic and citing the project’s own records, and descriptors for every form; through the server a ghost accepted as a responsibility, a placement and a data field keep the accepted offer as provenance');
}
{
  // Round 11: one provenance vocabulary across the spark, Proposals and the journey draft. The recorded keys stay
  // (a suggestion's source, a journey value's basis); the words shown are the four, and no surface shows the old ones.
  const {PROVENANCE_WORDS, provenanceWord, provenanceKey, OPEN_WORD} = await import('./public/provenance-words.js');
  assert.deepEqual(PROVENANCE_WORDS, {stated: 'Stated', inferred: 'Inferred', sol: 'Sol draft', edited: 'Edited'});
  assert.deepEqual(['project', 'stated', 'upstream', 'confirm', 'inferred', 'sol', 'edited'].map(provenanceWord), ['Stated', 'Stated', 'Stated', 'Inferred', 'Inferred', 'Sol draft', 'Edited'], 'the old words map onto the four');
  assert.deepEqual([provenanceKey('upstream'), provenanceKey('gap'), provenanceWord('gap'), OPEN_WORD], ['stated', null, '', 'Open question'], 'an open question is not a provenance');
  assert.deepEqual(R.BAND_LABELS, {project: 'Stated', confirm: 'Inferred', sol: 'Sol draft'});
  const {readFileSync} = await import('node:fs');
  for (const f of ['public/field-spark.js', 'public/coauthor-ui.js', 'public/journey-draft-ui.js', 'public/field-suggestions.js']) {
    const src = readFileSync(f, 'utf8').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(src, /From your project ·|Confirmed from your project|From upstream|Edited by you|'Confirm'/, f + ' shows none of the old provenance words');
  }
  assert.deepEqual(JSON.stringify(R.dispositionsOf(await doc()).at(-1)?.outcome), '"dismissed"', 'the audit trail keeps what was recorded');
  pass('one provenance vocabulary (stated · inferred · Sol draft · edited): the old words map onto it, the bands and the journey draft show it, the recorded keys are unchanged');
}
llm.close();
console.log(`\n${checks.length} checks passed.`);
