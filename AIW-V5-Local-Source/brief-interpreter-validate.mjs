// The interpreted brief (round 4, Contract 1): shared/brief-interpreter.js and the text a brief file yields
// (public/brief-reader.js). Four briefs (a clear one, a terse one, one with numbered steps, one of prose alone) and the
// edges: every passage's offsets give back its text, every proposal cites passages that exist, a value that is not in
// the words of its passages is marked inferred (and one that is, is not), acceptance criteria are always inferred
// stubs, a proposal is accepted as it stands by the Chapter 1 artefact command, an empty brief proposes nothing, the
// input is bounded and the reading is deterministic and quick on hostile text. A .docx is written here with node's
// zlib and read through the bounded OOXML reader. Run: node brief-interpreter-validate.mjs
import assert from 'node:assert/strict';
import {deflateRawSync, crc32} from 'node:zlib';
import {createHash} from 'node:crypto';
import {interpretBrief, briefCounts, BRIEF_LIMIT, BRIEF_RULES, BRIEF_KINDS} from './shared/brief-interpreter.js';
import * as browserRules from './public/brief-interpreter.js';
import {readBrief, documentText} from './public/brief-reader.js';
import {seedProject, applyCommand, TYPES, PRIORITIES} from './public/requirements-domain.js';

const checks = [];
const check = (name, fn) => { fn(); checks.push(name); };
const plain = (s) => String(s).toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const ARTEFACT_FIELDS = {common: ['type', 'title', 'description', 'owner', 'source'], requirement: ['acceptance', 'priority'], scope: ['scopeMode'], journey: ['order']};
const META = ['key', 'passages', 'confidence', 'inferred', 'accountable'];
const TYPE_IDS = TYPES.map((t) => t.id);

// What every interpretation must satisfy, whatever the brief.
function invariants(text, r) {
  // Round 12 (GR-DRF-19) adds the brief's problem and the notes of the reading to the contract, before the questions.
  assert.deepEqual(Object.keys(r), ['passages', ...BRIEF_KINDS, 'problem', 'notes', 'questions'], 'the contract shape, in order');
  const ids = new Set();
  let last = -1;
  for (const p of r.passages) {
    assert.match(p.id, /^P-\d{3,}$/);
    assert.deepEqual(Object.keys(p), ['id', 'start', 'end', 'text']);
    assert.equal(text.slice(p.start, p.end), p.text, p.id + ' round-trips its offsets');
    assert(p.start >= last, p.id + ' follows the passage before it');
    assert(p.text.trim() === p.text && p.text, p.id + ' is trimmed and not empty');
    last = p.end; ids.add(p.id);
  }
  const byId = new Map(r.passages.map((p) => [p.id, p]));
  for (const kind of BRIEF_KINDS) {
    const keys = new Set();
    for (const p of r[kind]) {
      const allowed = new Set([...ARTEFACT_FIELDS.common, ...(ARTEFACT_FIELDS[p.type] || []), ...META]);
      for (const k of Object.keys(p)) assert(allowed.has(k), `${p.key} carries ${k}, which the ${p.type} artefact does not take`);
      assert(TYPE_IDS.includes(p.type));
      assert.match(p.key, new RegExp('^' + p.type + '-\\d+$')); assert(!keys.has(p.key)); keys.add(p.key);
      assert(p.passages.length >= 1 && p.passages.every((id) => ids.has(id)), p.key + ' cites passages that exist');
      assert(['stated', 'inferred'].includes(p.confidence));
      assert.equal(p.owner, '', p.key + ': an owner is never guessed');
      assert(p.title && p.title.length <= 160 && (p.description || '').length <= 4000);
      assert.equal(p.source, 'Opening brief · ' + p.passages.join(', '));
      // Stated values are spans of the cited passages' words; every other value is marked inferred.
      const said = plain(p.passages.map((id) => byId.get(id).text).join(' '));
      for (const field of ['title', 'description', 'acceptance']) {
        if (!p[field]) continue;
        assert.equal(p.inferred.includes(field), !said.includes(plain(p[field])), `${p.key}.${field} is marked inferred exactly when it is not in its passages`);
      }
      if (p.type === 'requirement') {
        assert(PRIORITIES.includes(p.priority));
        assert(p.inferred.includes('acceptance') && /\[[^\]]+\]/.test(p.acceptance), p.key + ': the acceptance criterion is an inferred stub with blanks to replace');
      }
      if (p.type === 'scope') assert(['in', 'out'].includes(p.scopeMode));
      if (p.type === 'journey') assert(Number.isInteger(p.order) && p.order >= 1);
    }
  }
  r.journeys.forEach((j, i) => assert.equal(j.order, i + 1, 'journey steps are numbered in reading order'));
  if (r.problem !== null) { assert.deepEqual(Object.keys(r.problem), ['text', 'passages']); assert(r.problem.text && r.problem.passages.length && r.problem.passages.every((id) => ids.has(id)), 'the problem cites passages that exist'); }
  for (const n of r.notes) { assert.deepEqual(Object.keys(n), ['passages', 'note']); assert(n.passages.every((id) => ids.has(id)) && n.note); }
  const keys = r.questions.map((q) => q.key);
  assert.equal(new Set(keys).size, keys.length, 'one question per key');
  for (const q of r.questions) {
    assert(typeof q.key === 'string' && typeof q.question === 'string' && q.question.endsWith('?'));
    assert(TYPE_IDS.includes(q.forType), q.key + ' asks for a Chapter 1 record type');
    if (q.passages) assert(q.passages.every((id) => ids.has(id)));
  }
  // Each proposal is accepted as it stands by the Chapter 1 artefact command (on a scratch copy: nothing is saved).
  let p = seedProject(); p.artefacts = []; p.relationships = []; for (const k of Object.keys(p.counters)) p.counters[k] = 0;
  for (const kind of BRIEF_KINDS) for (const proposal of r[kind]) {
    const {key, passages, confidence, inferred, accountable, ...payload} = proposal;
    p = applyCommand(p, {type: 'artefact', payload}).document;
    const saved = p.artefacts.at(-1);
    assert.equal(saved.type, proposal.type); assert.equal(saved.title, proposal.title);
    if (proposal.scopeMode) assert.equal(saved.scopeMode, proposal.scopeMode);
    if (proposal.order) assert.equal(saved.order, proposal.order);
    if (proposal.priority) assert.equal(saved.priority, proposal.priority);
    assert.equal(saved.confirmed, false, 'a proposal never arrives confirmed');
  }
  assert.deepEqual(briefCounts(r), {passages: r.passages.length, ...Object.fromEntries(BRIEF_KINDS.map((k) => [k, r[k].length])), questions: r.questions.length, inferred: BRIEF_KINDS.flatMap((k) => r[k]).filter((x) => x.confidence === 'inferred').length});
  return r;
}
const read = (text, name) => invariants(text, interpretBrief(text, {name}));
const titles = (list) => list.map((x) => x.title);
const counts = (r) => Object.fromEntries(BRIEF_KINDS.map((k) => [k, r[k].length]));
const question = (r, key) => r.questions.some((q) => q.key === key);

const CLEAR = `Citizen service requests

The city council wants to replace its paper forms with an online service so that residents can report problems and follow them to a resolution. The aim is to halve the time it takes to resolve a request.

Residents must be able to submit a service request online and attach photos. Caseworkers should be able to route each request to the right team. The service must send the resident a reply within 5 working days.

The service must not store card details. It must comply with GDPR. The budget is £250,000 and the service must be live by March 2027.

We assume the existing CRM can expose an API for request records.

Out of scope:
- Payments for permits
- Planning applications

First, the resident submits the request. Then a caseworker reviews it, and then the request is assigned to a field team. Finally, the resident is told the outcome.

The service is owned by the Head of Customer Services. Who approves changes to the routing rules?`;

check('a clear brief: every kind of Chapter 1 record, with its cue', () => {
  const r = read(CLEAR, 'Citizen service requests');
  assert.deepEqual(counts(r), {outcomes: 2, stakeholders: 3, actors: 2, scope: 2, journeys: 4, constraints: 3, assumptions: 1, requirements: 3});
  assert.equal(r.passages.length, 18);
  assert.deepEqual(titles(r.requirements), ['Submit a service request online and attach photos', 'Route each request to the right team', 'Send the resident a reply within 5 working days']);
  assert.deepEqual(r.requirements.map((x) => x.priority), ['Must', 'Should', 'Must'], 'must → Must, should → Should');
  assert(r.requirements.every((x) => x.confidence === 'stated' && x.inferred.join() === 'acceptance'));
  assert.deepEqual(titles(r.outcomes), ['Residents can report problems and follow them to a resolution', 'Halve the time it takes to resolve a request'], 'a "so that" clause and a declared aim');
  assert.deepEqual(r.scope.map((x) => [x.title, x.scopeMode, x.passages.length]), [['Payments for permits', 'out', 2], ['Planning applications', 'out', 2]], 'an Out of scope list; each item cites the heading too');
  assert.deepEqual(titles(r.journeys), ['The resident submits the request', 'A caseworker reviews it', 'The request is assigned to a field team', 'The resident is told the outcome'], 'first / then / and then / finally, in order');
  assert.deepEqual(titles(r.constraints), ['The service must not store card details', 'It must comply with GDPR', 'The budget is £250,000 and the service must be live by March 2027']);
  assert.deepEqual(titles(r.assumptions), ['The existing CRM can expose an API for request records'], 'the title is what follows "assume"');
  const head = r.stakeholders.find((s) => s.title === 'Head of Customer Services');
  assert(head && head.confidence === 'stated' && head.accountable, '"owned by" names an accountable stakeholder');
  assert.equal(r.stakeholders.find((s) => s.title === 'City council').confidence, 'inferred', 'an organisation found in a sentence is inferred');
  assert.deepEqual(r.actors.map((a) => [a.title, a.confidence]), [['Residents', 'inferred'], ['Caseworkers', 'inferred']], 'roles found in sentences are inferred, one per role');
  assert(r.actors[0].passages.length >= 4, 'a role cites every passage that names it (resident, residents)');
  assert(!question(r, 'owner'), 'the owner is stated, so it is not asked');
  assert(question(r, 'success-measure') === false, '"halve" is a measure');
  assert(question(r, 'acceptance') && question(r, 'requirement-owner'));
  const asked = r.questions.find((q) => q.key.startsWith('brief-'));
  assert.equal(asked.question, 'Who approves changes to the routing rules?'); assert.equal(asked.forType, 'stakeholder'); assert.equal(r.passages.find((p) => p.id === asked.passages[0]).text, asked.question);
  assert(!r.requirements.some((x) => /approves/.test(x.title)), 'a question in the brief is not a requirement');
});

check('a terse brief: what it says, and questions for the rest', () => {
  const r = read('Warehouse picking app. Pickers need to scan items. Must work offline.', 'Picking');
  assert.equal(r.passages.length, 3);
  assert.deepEqual(counts(r), {outcomes: 0, stakeholders: 0, actors: 1, scope: 0, journeys: 0, constraints: 0, assumptions: 0, requirements: 2});
  assert.deepEqual(titles(r.requirements), ['Scan items', 'Work offline']);
  assert.match(r.requirements[1].acceptance, /\[the actor\] can work offline/, 'no subject: the actor is a blank, not a guess');
  assert.deepEqual(r.requirements.map((x) => [x.priority, x.inferred.join('+')]), [['Must', 'acceptance+priority'], ['Must', 'acceptance']], '"need to" gives Must as an inference; "must" states it');
  assert.deepEqual(r.questions.map((q) => q.key), ['owner', 'stakeholders', 'outcome', 'success-measure', 'scope-boundary', 'journey', 'acceptance', 'requirement-owner', 'constraints', 'assumptions']);
  assert.equal(r.questions[0].question, 'Who owns Picking and is accountable for its outcome?');
});

const NUMBERED = `# Clinic appointment scheduling

Goal: Patients book appointments without phoning the clinic.

## Users
- Patients
- Receptionists: confirm and reschedule bookings
- Clinicians

## How it works
1. The patient chooses a clinician and a time.
2. The system holds the slot for ten minutes.
3. The receptionist confirms the booking.
4. The patient receives a confirmation by text message.

## Requirements
- Show available slots for the next four weeks
- Patients should be able to cancel a booking online
- Send a reminder 24 hours before the appointment

## Constraints
- Budget: £80k
- Must integrate with the existing patient record system

In scope: booking, cancellation and reminders. Out of scope: billing, prescriptions.

Assumptions:
- Clinicians keep their calendars up to date.

Owner: Practice Manager`;

check('a brief with headings and numbered steps: sections declare, numbered items order', () => {
  const r = read(NUMBERED, 'Clinic appointments');
  assert.equal(r.passages.length, 23);
  assert.deepEqual(counts(r), {outcomes: 1, stakeholders: 2, actors: 3, scope: 5, journeys: 4, constraints: 2, assumptions: 1, requirements: 3});
  assert.deepEqual(r.journeys.map((j) => [j.order, j.title]), [[1, 'The patient chooses a clinician and a time'], [2, 'The system holds the slot for ten minutes'], [3, 'The receptionist confirms the booking'], [4, 'The patient receives a confirmation by text message']]);
  const heading = r.passages.find((p) => p.text === '## How it works').id;
  assert(r.journeys.every((j) => j.passages[0] === heading && j.confidence === 'stated'), 'each step cites the heading that makes it a step');
  assert.deepEqual(r.actors.map((a) => [a.title, a.confidence]), [['Patients', 'stated'], ['Receptionists', 'stated'], ['Clinicians', 'stated']], 'a Users list declares actors; "Receptionists: …" names the role before the colon');
  assert.deepEqual(r.stakeholders.map((s) => [s.title, s.confidence, !!s.accountable]), [['Practice Manager', 'stated', true], ['Clinic', 'inferred', false]], 'an Owner label declares the accountable stakeholder, and is not repeated as an actor');
  assert.deepEqual(r.scope.map((s) => s.title + ':' + s.scopeMode), ['Booking:in', 'Cancellation:in', 'Reminders:in', 'Billing:out', 'Prescriptions:out'], 'two labels in one line, each enumerated');
  assert.deepEqual(r.requirements.map((x) => [x.title, x.priority, x.inferred.join('+')]), [['Show available slots for the next four weeks', 'Must', 'acceptance+priority'], ['Cancel a booking online', 'Should', 'acceptance'], ['Send a reminder 24 hours before the appointment', 'Must', 'acceptance+priority']], 'a listed requirement with no modal defaults to Must and says so');
  assert.deepEqual(titles(r.constraints), ['Budget: £80k', 'Must integrate with the existing patient record system']);
  assert.deepEqual(titles(r.assumptions), ['Clinicians keep their calendars up to date']);
  assert.deepEqual(r.questions.map((q) => q.key), ['success-measure', 'acceptance', 'requirement-owner']);
});

const PROSE = `Our warehouse ships about four thousand orders a day and most of the work is still done on paper. Orders arrive from the web shop overnight and the morning shift prints pick lists. Mistakes happen when items are out of stock or stored in the wrong bin, and customers complain when parcels are late. The operations director thinks a better system would help, but nobody has looked at it in detail yet.`;

check('a brief of prose alone: no requirement is invented', () => {
  const r = read(PROSE, 'Warehouse');
  assert.equal(r.passages.length, 4);
  assert.deepEqual(counts(r), {outcomes: 0, stakeholders: 1, actors: 1, scope: 0, journeys: 0, constraints: 0, assumptions: 0, requirements: 0});
  assert.deepEqual([r.stakeholders[0].title, r.stakeholders[0].confidence, r.actors[0].title, r.actors[0].confidence], ['Operations director', 'inferred', 'Customers', 'inferred']);
  assert(question(r, 'requirements') && question(r, 'outcome') && question(r, 'journey') && question(r, 'owner'));
  assert(!question(r, 'acceptance'), 'no acceptance question without a requirement');
});

check('an empty brief proposes nothing', () => {
  for (const text of ['', '   ', '\n\n\t\n', '---\n\n***']) {
    const r = read(text);
    assert.equal(r.passages.length, 0);
    for (const kind of BRIEF_KINDS) assert.equal(r[kind].length, 0, kind + ' from an empty brief');
    assert.equal(briefCounts(r).inferred, 0);
    assert(question(r, 'requirements') && question(r, 'owner'), 'what Chapter 1 needs is asked');
  }
});

check('user stories, a .docx-shaped brief and wrapped lines', () => {
  const story = read('As a dispatcher, I want to see every late parcel on one screen so that I can call the carrier before the customer calls us.', 'Dispatch');
  assert.deepEqual([story.requirements[0].title, story.actors[0].title, story.actors[0].confidence, story.outcomes[0].title], ['See every late parcel on one screen', 'Dispatcher', 'stated', 'I can call the carrier before the customer calls us']);
  assert.match(story.requirements[0].acceptance, /then the dispatcher can see every late parcel/);
  assert.deepEqual(story.requirements[0].inferred, ['acceptance', 'priority'], 'a user story states no priority');
  // What brief-reader.js makes of a .docx: one paragraph per line, list items prefixed "- ", headings as plain lines.
  const docx = read('Warehouse fulfilment\nGoals\n- Ship every order received before 2 pm on the same day\n- Reduce picking errors by 50%\nOut of scope\n- Returns handling\nRequirements\n- Pickers must scan each item into the order\n- Supervisors should see unpicked orders by zone\nThe new system must run on the existing warehouse network.');
  assert.deepEqual(counts(docx), {outcomes: 2, stakeholders: 0, actors: 2, scope: 1, journeys: 0, constraints: 1, assumptions: 0, requirements: 2});
  assert.equal(docx.scope[0].scopeMode, 'out');
  assert.deepEqual(docx.constraints[0].passages.length, 1, 'a sentence read by its own shape does not cite the heading above it');
  const wrapped = read('The clinic wants patients to book appointments online so that the reception\ndesk spends less time on the phone. Patients must be able to see free slots\nfor the next four weeks and choose one.', 'Clinic');
  assert.equal(wrapped.passages.length, 2, 'wrapped lines join into sentences');
  assert(wrapped.passages[1].text.includes('\n'), 'a passage keeps the text exactly, line break included');
  assert.equal(wrapped.requirements[0].title, 'See free slots for the next four weeks and choose one');
  assert.deepEqual(wrapped.requirements[0].inferred, ['acceptance'], 'a title across a line break is still stated');
});

check('cue boundaries: problems are not constraints, conditions are not steps, budgets do not override a must', () => {
  const r = read('Citizens cannot currently see the status of a request. If a request is urgent, then a supervisor is told. Managers must be able to see spend against the budget. The data is then archived.');
  assert.equal(r.constraints.length, 0, '"cannot" describing today is not a constraint; a budget inside a requirement is its own content');
  assert.equal(r.journeys.length, 0, '"if … then" is a condition and "is then archived" is not a sequence');
  assert.deepEqual(titles(r.requirements), ['See spend against the budget']);
  const deadline = read('The service must be live by March 2027. Requests must be answered within two days.');
  assert.deepEqual([titles(deadline.constraints), titles(deadline.requirements)], [['The service must be live by March 2027'], ['Be answered within two days']]);
});

check('GR-DRF-19: workbook text: a thousands separator is not a list, a long item is kept with a note, a name that lists its parts is one name, and a Problem section is the problem', () => {
  const text = ['Core banking replacement', '', 'Problem', 'Branch staff re-key every payment into three systems, and errors are found only at month end.', '', 'In scope: 1,400 requirements across 18 modules; the teller, lending and deposit services', 'Out of scope: card issuing, and the move of the twelve years of archived statements that the old platform keeps in its own format for auditors', '', 'Stakeholders', '- Finance, ledger and control — owns the general ledger', '- Branch staff, who serve customers at the counter', '', 'Tellers must post each payment once.'].join('\n');
  const r = read(text, 'Core banking');
  assert.deepEqual(r.problem, {text: 'Branch staff re-key every payment into three systems, and errors are found only at month end.', passages: ['P-002', 'P-003']}, 'the Problem section is read whole as the problem, citing its heading');
  assert.ok(![...r.outcomes, ...r.constraints, ...r.requirements, ...r.journeys].some((x) => x.passages.includes('P-003')), 'the problem proposes no record');
  const inScope = titles(r.scope.filter((x) => x.scopeMode === 'in'));
  assert.ok(inScope.includes('1,400 requirements across 18 modules'), 'the thousands separator stays: ' + inScope.join(' | '));
  assert.ok(!inScope.some((t) => /^(?:1|400\b.*)$/.test(t)), 'no item is cut at the separator');
  const long = 'The move of the twelve years of archived statements that the old platform keeps in its own format for auditors';
  assert.equal(long.split(' ').length, 20);
  assert.ok(titles(r.scope.filter((x) => x.scopeMode === 'out')).includes(long), 'a 20-word item is kept, not dropped');
  const noted = r.notes.find((n) => n.note.includes('20 words'));
  assert.ok(noted && noted.passages.length === 1 && r.passages.find((x) => x.id === noted.passages[0]).text.startsWith('Out of scope:'), 'and the reading notes it, citing its passage');
  assert.ok(titles(r.stakeholders).includes('Finance, ledger and control'), 'a name that lists its parts stays one name: ' + titles(r.stakeholders).join(' | '));
  assert.ok(![...titles(r.stakeholders), ...titles(r.actors)].includes('Finance'), 'and is not cut at its comma');
  assert.ok([...titles(r.stakeholders), ...titles(r.actors)].includes('Branch staff'), 'a description after a comma is still cut off');
  assert.deepEqual(titles(r.requirements), ['Post each payment once'], 'a requirement after the problem is still a requirement');
  assert.equal(read('Problem: the ledger closes three days late every month.').problem.text, 'the ledger closes three days late every month.', 'a Problem label too');
  assert.equal(read(CLEAR, 'A').problem, null, 'a brief with no Problem section has none');
  assert.deepEqual(read('In scope: 1,400 requirements across 18 modules').scope.map((x) => x.title), ['1,400 requirements across 18 modules']);
});

check('bounded, typed, deterministic and quick on hostile text', () => {
  assert.throws(() => interpretBrief(42), /read from text/);
  assert.throws(() => interpretBrief(null), /read from text/);
  assert.throws(() => interpretBrief({text: 'x'}), /read from text/);
  assert.throws(() => interpretBrief('x'.repeat(BRIEF_LIMIT + 1)), /20,000 characters/);
  assert.equal(BRIEF_LIMIT, 20000); assert.equal(BRIEF_RULES, 'brief-rules-1');
  read('x'.repeat(BRIEF_LIMIT));
  assert.equal(browserRules.interpretBrief, interpretBrief, 'one set of rules for the server and the browser');
  assert.deepEqual(interpretBrief(CLEAR, {name: 'A'}), interpretBrief(CLEAR, {name: 'A'}), 'the same brief reads the same way');
  const hostile = ['. '.repeat(10000), '- x\n'.repeat(5000), '\n'.repeat(BRIEF_LIMIT), ('reduce the must so that '.repeat(900)).slice(0, BRIEF_LIMIT), ('customer staff team council '.repeat(800)).slice(0, BRIEF_LIMIT), ('As a '.repeat(4000)).slice(0, BRIEF_LIMIT), '# Goals\n'.repeat(2500), ('then, '.repeat(3400)).slice(0, BRIEF_LIMIT), ('Residents must submit a request. '.repeat(700)).slice(0, BRIEF_LIMIT)];
  for (const text of hostile) {
    const t0 = performance.now(), r = read(text), ms = performance.now() - t0;
    assert(ms < 1500, 'read within 1.5 s: ' + ms.toFixed(0) + ' ms');
    assert(r.passages.length <= 1500 && BRIEF_KINDS.every((k) => r[k].length <= 250), 'passages and proposals are bounded');
  }
  const many = read('- x\n'.repeat(5000));
  assert.equal(many.passages.length, 1500); assert(question(many, 'truncated'), 'a brief read only in part says so');
  const repeated = read('Residents must submit a request. '.repeat(600));
  assert.equal(repeated.requirements.length, 1, 'one proposal per title'); assert.equal(repeated.requirements[0].passages.length, repeated.passages.length);
});

// ------------------------------------------------------------------------------------------------ brief files
function zip(files, {method = 8} = {}) {
  const locals = [], central = []; let offset = 0;
  for (const [n, content] of Object.entries(files)) {
    const data = Buffer.from(content), body = method === 8 ? deflateRawSync(data) : data, name = Buffer.from(n), crc = crc32(data);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(method, 8); local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
    const entry = Buffer.alloc(46); entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0x0800, 8); entry.writeUInt16LE(method, 10); entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(body.length, 20); entry.writeUInt32LE(data.length, 24); entry.writeUInt16LE(name.length, 28); entry.writeUInt32LE(offset, 42);
    locals.push(local, name, body); central.push(entry, name); offset += 30 + name.length + body.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, directory, end]));
}
const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function docx(paragraphs, extra = {}) {
  const body = paragraphs.map((p) => typeof p === 'string' ? `<w:p><w:r><w:t xml:space="preserve">${xml(p)}</w:t></w:r></w:p>` : p.list ? `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>${xml(p.list)}</w:t></w:r></w:p>` : p.raw).join('');
  return zip({'[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>', '_rels/.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>', 'word/document.xml': `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr/></w:body></w:document>`, ...extra});
}

async function checkAsync(name, fn) { await fn(); checks.push(name); }
await checkAsync('a .docx brief: paragraphs and list items of word/document.xml, nothing else', async () => {
  const bytes = docx(['Warehouse fulfilment', 'Orders arrive from the web shop & are picked on paper today.', '', 'Requirements', {list: 'Pickers must scan each item into the order'}, {list: 'Supervisors should see unpicked orders by zone'}, {raw: '<w:p><w:r><w:t>Tab</w:t><w:tab/><w:t>bed</w:t><w:br/><w:t>broken</w:t></w:r><w:del><w:r><w:delText>deleted words</w:delText></w:r></w:del><w:r><w:instrText>HYPERLINK "https://example.test"</w:instrText></w:r></w:p>'}], {'word/footer1.xml': '<w:ftr xmlns:w="x"><w:p><w:r><w:t>Footer secret</w:t></w:r></w:p></w:ftr>', 'word/_rels/document.xml.rels': '<Relationships><Relationship Id="rId9" TargetMode="External" Target="https://example.test"/></Relationships>'});
  const r = await readBrief(new File([bytes], 'Fulfilment brief.docx'));
  assert.equal(r.kind, 'docx'); assert.equal(r.bytes, bytes.length);
  assert.equal(r.hash, createHash('sha256').update(bytes).digest('hex'), 'the hash is of the file bytes');
  assert.equal(r.text, 'Warehouse fulfilment\nOrders arrive from the web shop & are picked on paper today.\n\nRequirements\n- Pickers must scan each item into the order\n- Supervisors should see unpicked orders by zone\nTab\tbed\nbroken');
  assert(!/Footer secret|deleted words|HYPERLINK/.test(r.text), 'no other part, no deleted text, no field code');
  const interpreted = read(r.text, 'Fulfilment');
  assert.deepEqual(titles(interpreted.requirements).slice(0, 2), ['Scan each item into the order', 'See unpicked orders by zone']);
});
await checkAsync('.txt and .md are UTF-8 read whole; PDF, other kinds, broken archives and non-UTF-8 are refused with a reason', async () => {
  const md = await readBrief(new File(['# Brief\r\nResidents must report potholes.\r\n'], 'brief.MD'));
  assert.deepEqual([md.kind, md.text, md.bytes], ['md', '# Brief\nResidents must report potholes.\n', 42]);
  assert.equal((await readBrief(new File(['﻿Plain text'], 'b.txt'))).text, 'Plain text', 'a byte-order mark is not text');
  const refusals = [[new File(['%PDF-1.7'], 'brief.pdf'), /^Error: PDF is not read in this version; paste the text or upload \.docx, \.md or \.txt$/], [new File(['x'], 'brief.rtf'), /\.txt, \.md or \.docx/], [new File([new Uint8Array([0x66, 0xff, 0x66])], 'b.txt'), /not UTF-8/], [new File(['a\u0000b'], 'b.txt'), /plain text/], [new File([''], 'b.md'), /empty/], [new File([docx(['x']).subarray(0, 60)], 'cut.docx'), /not a readable DOCX archive/], [new File([zip({'word/other.xml': '<x/>'})], 'none.docx'), /missing word\/document\.xml/], [new File([zip({'word/document.xml': '<!DOCTYPE x [<!ENTITY a "b">]><w:document/>'})], 'entity.docx'), /XML entity declarations/], [new File([zip({'word/document.xml': '<w:document><w:body><w:p><w:r><w:t>&#x110000;</w:t></w:r></w:p></w:body></w:document>'})], 'ref.docx'), /character reference/], [{name: 'x.txt', size: 13 * 1024 * 1024, arrayBuffer: async () => new ArrayBuffer(0)}, /12 MB/], [null, /Choose a brief file/]];
  for (const [file, message] of refusals) await assert.rejects(readBrief(file), message, String(file?.name));
  assert.equal(await documentText(zip({'word/document.xml': '<w:document><w:body><w:p/><w:p><w:r><w:t>Only</w:t></w:r></w:p><w:p/></w:body></w:document>'}, {method: 0})), 'Only', 'stored (uncompressed) entries are read too; empty paragraphs at the ends are dropped');
});

console.log(`PASS Brief interpreter: ${checks.length} checks — ${checks.join('; ')}.`);
