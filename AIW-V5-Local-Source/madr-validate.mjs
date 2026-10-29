// Decision records in and out (round 6, Contract F and Contract I): madrExport writes one MADR file per Chapter 3
// decision from the saved records, with every MADR section; interpretMADR reads MADR 4 (front matter, Pros and Cons),
// MADR 2 (status list) and the plain form into decision and alternative elements in the shape of a model brought in,
// citing the lines each came from and asking where a record leaves something unsaid; the round trip keeps the titles,
// the statuses, the option counts and the chosen option; hostile input comes out as inert text, bounded. Nothing here
// touches a record. No network, no model key.
// Run: npm run test:madr
import assert from 'node:assert/strict';
import {interpretMADR, madrExport, madrText, madrRoundTrip, MADR_RULES, MADR_LIMITS} from './shared/madr.js';
import * as pub from './public/madr.js';
import {referenceProject} from './notation-fixtures.mjs';

const checks = [], pass = n => checks.push(n);
const p = referenceProject(), before = JSON.stringify(p);
const decisions = p.decisions.records;

// 1. The export: one file per decision, under decisions/, with every MADR section, derived from the record and saying so.
const ex = madrExport(p);
assert.equal(ex.schema, 'aiw.madr-export/1'); assert.equal(ex.rules, MADR_RULES); assert.equal(ex.count, decisions.length); assert.equal(ex.files.length, decisions.length);
for (const [i, f] of ex.files.entries()) {
  const d = decisions[i];
  assert.match(f.path, new RegExp('^decisions/' + d.id + '-[a-z0-9-]{1,60}\\.md$'), 'the path: ' + f.path);
  assert.ok(f.text.startsWith('---\nstatus: "' + d.status + '"\n'), 'front matter with the status as recorded');
  assert.ok(f.text.includes('\n# ' + d.id + ' · ' + d.question + '\n'), 'the title is the question');
  for (const h of ['## Context and Problem Statement', '## Decision Drivers', '## Considered Options', '## Decision Outcome', '### Consequences', '### Confirmation', '## Pros and Cons of the Options', '## More Information']) assert.ok(f.text.includes('\n' + h + '\n'), f.path + ' has ' + h);
  for (const q of p.quality.drivers.filter(q => d.driverIds.includes(q.id))) assert.ok(f.text.includes('* ' + q.id + ' · ' + q.title), 'driver ' + q.id + ' as a decision driver');
  for (const a of d.alternatives) { assert.ok(f.text.includes('* ' + a.id + ' · ' + a.title), 'option ' + a.id); assert.ok(f.text.includes('### ' + a.id + ' · ' + a.title + '\n'), 'pros and cons of ' + a.id); assert.ok(f.text.includes('* Good, because ' + a.benefits) && f.text.includes('* Bad, because ' + a.costs), 'benefits and costs as good and bad lines'); }
  assert.ok(f.text.includes('Assumptions: ' + d.assumptions), 'assumptions as confirmation');
  assert.ok(f.text.includes('Derived from AIW record ' + d.id) && f.text.includes('the saved record is the authority'), 'the file says what it is');
  assert.ok(!/<[a-z]|<\/|\u0000/.test(f.text), 'no tag, no control character');
  assert.ok(!/```/.test(f.text));
}
assert.ok(ex.files.every(f => f.text.includes('No option is chosen yet')), 'the bank decisions are drafts with no chosen alternative, and the files say so');
assert.equal(JSON.stringify(p), before, 'nothing in the project changed');
pass('madrExport: ' + ex.count + ' files under decisions/, one per decision, each with title, status, context, drivers, options, outcome, consequences, confirmation, pros and cons and more information');

// 2. The round trip: titles and option counts equal, statuses and drivers too.
const R = madrRoundTrip(p);
assert.equal(R.format, 'madr'); assert.equal(R.report.counts.decisions, decisions.length); assert.equal(R.report.counts.alternatives, decisions.reduce((n, d) => n + d.alternatives.length, 0));
const back = R.elements.filter(e => e.kind === 'decision');
assert.deepEqual(back.map(e => e.name), decisions.map(d => d.id + ' · ' + d.question), 'titles equal');
assert.deepEqual(back.map(e => e.attrs.options.length), decisions.map(d => d.alternatives.length), 'option counts equal');
assert.deepEqual(back.map(e => e.attrs.status), decisions.map(d => d.status), 'statuses equal');
assert.deepEqual(back.map(e => e.attrs.drivers.length), decisions.map(d => d.driverIds.length), 'driver counts equal');
assert.deepEqual(back.map(e => e.attrs.deciders), decisions.map(d => d.owner), 'the owner is the decision-maker');
for (const e of back) { assert.ok(e.attrs.context.startsWith(decisions.find(d => e.name.startsWith(d.id)).context), 'the context comes back'); assert.ok(e.passages.length > 10 && e.passages.every(id => R.passages.some(x => x.id === id)), 'it cites its lines'); assert.equal(e.confidence, 'stated'); }
const alts = R.elements.filter(e => e.kind === 'alternative');
assert.deepEqual(alts.map(a => a.name), decisions.flatMap(d => d.alternatives.map(a => a.id + ' · ' + a.title)), 'the alternatives by name, in order');
assert.ok(alts.every(a => a.parent && back.some(d => d.id === a.parent) && a.attrs.good.length === 1 && a.attrs.bad.length === 1 && a.attrs.neutral.length === 1 && a.attrs.chosen === false), 'each alternative under its decision with its good, bad and neutral lines');
assert.equal(R.relationships.length, alts.length); assert.ok(R.relationships.every(r => r.kind === 'association' && r.label === 'considers'));
assert.deepEqual(R.questions.map(q => q.key.split(':')[1]), ['outcome', 'outcome', 'outcome'], 'a draft with no chosen option asks which was chosen');
pass('the round trip keeps every title, status, driver count and option count, the alternatives with their lines, and asks only what the records leave open');

// 3. A chosen, accepted decision: the outcome names it, the consequences come from it, and it comes back chosen.
const chosenP = structuredClone(p), d1 = chosenP.decisions.records[0];
d1.selectedAlternativeId = d1.alternatives[1].id; d1.rationale = 'The acknowledgement must not wait for settlement; the channel can show a pending payment.'; d1.status = 'accepted'; d1.mitigation = 'Reconcile pending instructions every minute.'; d1.assumptionEvidence = 'Channel team confirmed the pending state on 2026-09-30.'; d1.history = [{event: 'Architect accepted', at: '2026-10-01T10:00:00Z'}];
const t1 = madrText(chosenP, d1), R1 = interpretMADR(t1), D1 = R1.elements.find(e => e.kind === 'decision');
assert.ok(t1.includes('status: "accepted"') && t1.includes('date: 2026-10-01'), 'status and date');
assert.ok(t1.includes('Chosen option: "' + d1.alternatives[1].id + ' · ' + d1.alternatives[1].title + '", because ' + d1.rationale), 'the outcome names the chosen alternative and the rationale');
assert.ok(t1.includes('* Good, because ' + d1.alternatives[1].benefits) && t1.includes('* Bad, because risk: ' + d1.risks) && t1.includes('* Neutral, because mitigation: ' + d1.mitigation), 'consequences from the chosen alternative, the risks and the mitigation');
assert.ok(t1.includes('Evidence: ' + d1.assumptionEvidence), 'evidence as confirmation');
assert.equal(D1.attrs.status, 'accepted'); assert.equal(D1.attrs.date, '2026-10-01'); assert.equal(D1.attrs.chosen, d1.alternatives[1].id + ' · ' + d1.alternatives[1].title); assert.equal(D1.attrs.outcome.because, d1.rationale);
assert.deepEqual(R1.elements.filter(e => e.kind === 'alternative').map(a => a.attrs.chosen), [false, true]);
assert.deepEqual(R1.relationships.map(r => r.label), ['considers', 'chooses']);
assert.ok(D1.attrs.consequences.good.length === 1 && D1.attrs.consequences.bad.length === 2 && D1.attrs.consequences.neutral.length === 2, JSON.stringify(D1.attrs.consequences));
assert.ok(!R1.questions.length, 'nothing left to ask');
pass('a chosen, accepted decision comes back chosen (the outcome, the relationship "chooses", the consequences, the evidence)');

// 4. MADR 4 template text, MADR 2 list form and the plain form, in one text and as separate files.
const madr4 = `---
status: "accepted"
date: 2024-05-01
decision-makers: Platform team
consulted: Security
---

# Use a managed message broker for order events

## Context and Problem Statement

Orders must reach fulfilment within seconds even when the warehouse system is down.
Which broker, and who runs it?

## Decision Drivers

* Durable delivery under outage
* Operational ownership

## Considered Options

* Self-managed RabbitMQ
* Managed broker from the cloud provider
* Direct HTTP calls with retries

## Decision Outcome

Chosen option: "Managed broker from the cloud provider", because it gives durable delivery without a team to run it.

### Consequences

* Good, because outages in fulfilment no longer lose orders
* Bad, because the broker's limits bound message size
* Neutral, because costs follow volume

### Confirmation

A replay test every release; the queue depth alert is owned by operations.

## Pros and Cons of the Options

### Self-managed RabbitMQ

Runs in the cluster.

* Good, because it is well known
* Bad, because somebody has to run it

### Managed broker from the cloud provider

* Good, because nobody runs it
* Neutral, because the provider's limits apply

### Direct HTTP calls with retries

* Bad, because an outage loses orders

## More Information

Supersedes nothing.
`;
const madr2 = `# Keep one database per service

* Status: proposed
* Deciders: Data team
* Date: 2023-11-20

Technical Story: ticket 42

## Context and Problem Statement

Shared tables couple the services.

## Considered Options

* One database per service
* One shared database

## Decision Outcome

Chosen option: "One database per service", because coupling through tables has cost us two incidents.

## Pros and Cons of the Options

### One database per service

* Good, because services release independently
* Bad, because reports join across services

### One shared database

* Good, because reports are easy
`;
const plain = `# Record audit events as an append-only log

## Status

Accepted

## Context

Audit needs an order of events nobody can change.

## Decision

We will write audit events to an append-only log.

## Consequences

Reads need a projection; writes stay simple.
`;
const one = interpretMADR(madr4 + '\n---\n\n' + madr2 + '\n' + plain, {name: 'three records'});
assert.equal(one.report.counts.decisions, 3, JSON.stringify(one.report)); assert.equal(one.name, 'three records'); assert.match(one.hash, /^[0-9a-f]{64}$/);
const [A, B, C] = one.elements.filter(e => e.kind === 'decision');
assert.equal(A.name, 'Use a managed message broker for order events'); assert.equal(A.attrs.status, 'accepted'); assert.equal(A.attrs.date, '2024-05-01'); assert.equal(A.attrs.deciders, 'Platform team'); assert.equal(A.attrs.consulted, 'Security');
assert.deepEqual(A.attrs.drivers, ['Durable delivery under outage', 'Operational ownership']); assert.deepEqual(A.attrs.options, ['Self-managed RabbitMQ', 'Managed broker from the cloud provider', 'Direct HTTP calls with retries']);
assert.equal(A.attrs.chosen, 'Managed broker from the cloud provider'); assert.equal(A.attrs.outcome.because, 'it gives durable delivery without a team to run it.');
assert.deepEqual(A.attrs.consequences, {good: ['outages in fulfilment no longer lose orders'], bad: ["the broker's limits bound message size"], neutral: ['costs follow volume']});
assert.equal(A.attrs.confirmation, 'A replay test every release; the queue depth alert is owned by operations.'); assert.equal(A.attrs.moreInformation, 'Supersedes nothing.');
assert.ok(A.description.startsWith('Orders must reach fulfilment'), 'the context is the description');
const A1 = one.elements.filter(e => e.parent === A.id);
assert.deepEqual(A1.map(a => [a.name, a.description, a.attrs.good, a.attrs.bad, a.attrs.neutral, a.attrs.chosen]), [['Self-managed RabbitMQ', 'Runs in the cluster.', ['it is well known'], ['somebody has to run it'], [], false], ['Managed broker from the cloud provider', '', ['nobody runs it'], [], ["the provider's limits apply"], true], ['Direct HTTP calls with retries', '', [], ['an outage loses orders'], [], false]]);
assert.equal(B.name, 'Keep one database per service'); assert.equal(B.attrs.status, 'proposed'); assert.equal(B.attrs.deciders, 'Data team'); assert.equal(B.attrs.date, '2023-11-20'); assert.equal(B.attrs.moreInformation, 'ticket 42');
assert.deepEqual(B.attrs.options, ['One database per service', 'One shared database']); assert.equal(B.attrs.chosen, 'One database per service');
assert.deepEqual(one.questions.filter(q => q.key.startsWith(B.id)).map(q => q.key.split(':')[1]), ['drivers'], 'MADR 2 without drivers asks for them');
assert.equal(C.name, 'Record audit events as an append-only log'); assert.equal(C.attrs.status, 'Accepted'); assert.equal(C.attrs.context, 'Audit needs an order of events nobody can change.');
assert.equal(C.attrs.chosen, 'write audit events to an append-only log'); assert.deepEqual(C.attrs.consequences.neutral, ['Reads need a projection; writes stay simple.']);
assert.ok(one.questions.some(q => q.key === C.id + ':options'), 'the plain form names no options, so it asks for them');
// The same three as separate files, by file boundary; passages carry the file.
const three = interpretMADR([{name: 'a.md', text: madr4}, {name: 'b.md', text: madr2}, {name: 'c.md', text: plain}]);
assert.deepEqual(three.elements.filter(e => e.kind === 'decision').map(e => [e.name, e.attrs.file]), [[A.name, 'a.md'], [B.name, 'b.md'], [C.name, 'c.md']]);
assert.equal(three.report.counts.files, 3); assert.ok(three.passages.every(x => x.file && x.id.startsWith('P-') && x.end >= x.start && typeof x.text === 'string'));
assert.ok(three.elements.every(e => e.passages.length && e.passages.every(id => three.passages.some(x => x.id === id))), 'every element cites passages that exist');
// Every passage cited by an element is a line of the record it came from.
for (const e of three.elements.filter(e => e.kind === 'decision')) { const text = {a: madr4, b: madr2, c: plain}[e.attrs.file[0]]; for (const id of e.passages) assert.ok(text.includes(three.passages.find(x => x.id === id).text.slice(0, 40)), 'a cited line is in the file'); }
// Contract I's shape.
for (const r of [one, three]) { assert.deepEqual(Object.keys(r).sort(), ['elements', 'format', 'hash', 'name', 'passages', 'questions', 'relationships', 'report', 'rules', 'views'].sort()); for (const e of r.elements) assert.deepEqual(Object.keys(e).sort(), ['attrs', 'confidence', 'description', 'external', 'id', 'kind', 'name', 'parent', 'passages', 'tags', 'technology'].sort()); for (const x of r.relationships) assert.deepEqual(Object.keys(x).sort(), ['confidence', 'from', 'id', 'kind', 'label', 'passages', 'technology', 'to'].sort()); }
pass('MADR 4 (front matter, drivers, consequences, confirmation, pros and cons), MADR 2 (status list, technical story) and the plain form read into decisions and alternatives, in one text or by file, in Contract I\'s shape, citing their lines');

// 5. Hostile and odd input is inert and bounded.
const hostile = '# <script>alert(1)</script> {{7*7}} ${x}\n\n## Context and Problem Statement\n\n<img src=x onerror=alert(1)> \u0000\u0007 text\n\n## Considered Options\n\n' + Array.from({length: 60}, (_, i) => '* Option <b>' + i + '</b>').join('\n') + '\n\n## Decision Outcome\n\nChosen option: "Option <b>3</b>", because "quotes" and \\ slashes.\n\n## Not a MADR section\n\nIgnored.\n';
const H = interpretMADR(hostile);
const hd = H.elements.find(e => e.kind === 'decision');
assert.equal(hd.name, '<script>alert(1)</script> {{7*7}} ${x}', 'text stays text: nothing is interpreted');
assert.ok(!/[\u0000-\u0008]/.test(JSON.stringify(H)), 'control characters are dropped');
assert.equal(H.report.counts.alternatives, MADR_LIMITS.options, 'options are capped'); assert.ok(H.report.omitted.some(o => /options/.test(o.reason)) && H.report.omitted.some(o => /Not a MADR section/.test(o.reason)), 'what was not read is listed');
assert.equal(hd.attrs.chosen, 'Option <b>3</b>'); assert.ok(H.elements.find(e => e.name === 'Option <b>3</b>')?.attrs.chosen);
const walk = v => (typeof v === 'string' ? true : Array.isArray(v) ? v.every(walk) : v && typeof v === 'object' ? Object.values(v).every(walk) : ['number', 'boolean'].includes(typeof v) || v === null);
assert.ok(walk(H), 'strings, numbers, booleans, arrays and plain objects only');
assert.doesNotThrow(() => interpretMADR(''), 'an empty text'); assert.equal(interpretMADR('').elements.length, 0); assert.equal(interpretMADR('just a line').elements.length, 1, 'a bare line is read as one record with an inferred title');
assert.equal(interpretMADR('just a line').elements[0].confidence, 'inferred');
const flood = Array.from({length: 900}, (_, i) => '# Decision ' + i + '\n\nsome context\n').join('\n');
const F = interpretMADR(flood);
assert.ok(F.report.counts.decisions <= MADR_LIMITS.decisions, 'decisions are capped'); assert.ok(F.report.omitted.some(o => /decisions/.test(o.reason)));
const long = interpretMADR('# x\n\n' + 'a'.repeat(MADR_LIMITS.text + 5000));
assert.ok(long.report.omitted.some(o => /longer than/.test(o.reason)) && long.hash.length === 64);
assert.doesNotThrow(() => interpretMADR([null, 7, {name: 3, text: null}]), 'odd file entries are tolerated');
pass('hostile input comes out as inert text with control characters dropped; options, decisions and text length are capped and the report says so');

// 6. One module, re-exported.
assert.equal(pub.interpretMADR, interpretMADR); assert.equal(pub.madrExport, madrExport); assert.equal(pub.MADR_RULES, 'madr-rules-1');
pass('shared/madr.js re-exports public/madr.js: one reading of MADR');

console.log(JSON.stringify({suite: 'MADR decision records', passed: checks.length, checks, measure: {files: ex.count, roundTrip: {titles: back.length, equal: back.every((e, i) => e.name === decisions[i].id + ' · ' + decisions[i].question && e.attrs.options.length === decisions[i].alternatives.length)}, bytes: ex.files.reduce((n, f) => n + Buffer.byteLength(f.text), 0)}}, null, 1));
