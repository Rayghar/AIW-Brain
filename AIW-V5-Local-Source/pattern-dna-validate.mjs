// Pattern DNA (rc39, PLAN §4.1): every design question names playbook tactics, patterns and styles that exist, method
// options that exist, a chapter, a caution and a source; the triggers read the quality types and driver kinds the
// domain defines; a target shape is read from a driver's words. Run: npm run test:pattern-dna
import assert from 'node:assert/strict';
import {DESIGN_QUESTIONS, QUESTION_INDEX, TARGET_SHAPES, RECORD_FACTS, targetShape, driverOpens, attributeOf, questionKnowledge, PATTERN_DNA} from './public/pattern-dna.js';
import {TACTICS, PATTERNS, STYLES, ATTRIBUTES} from './public/playbook-knowledge.js';
import {QUALITY_TYPES, DRIVER_KINDS} from './public/quality-domain.js';
import {READ_OPTIONS} from './public/read-design-knowledge.js';
import {PERSISTENCE_OPTIONS} from './public/persistence-knowledge.js';
import {COMPOSITION_TOPICS} from './public/composition-knowledge.js';
import {INTERACTION_OPTIONS} from './public/architecture-knowledge.js';
const checks = [], pass = n => checks.push(n);
const ids = xs => new Set((Array.isArray(xs) ? xs : Object.values(xs)).map(x => x.id));
const tactics = ids(TACTICS), patterns = ids(PATTERNS), styles = ids(STYLES), attributes = ids(ATTRIBUTES), types = new Set(QUALITY_TYPES.map(t => t.id)), kinds = new Set(DRIVER_KINDS.map(k => k.id));
const options = {reads: READ_OPTIONS, persistence: PERSISTENCE_OPTIONS, interaction: INTERACTION_OPTIONS, ...Object.fromEntries(Object.entries(COMPOSITION_TOPICS).map(([k, t]) => [k, t.options]))};

// 1. The table is the owner's list and more: the twelve questions, each with the fields a reading needs.
assert.equal(DESIGN_QUESTIONS.length, 12);
assert.deepEqual(DESIGN_QUESTIONS.map(q => q.id), ['read-path', 'persistence', 'partitioning', 'handoff', 'edge', 'protected-call', 'idempotency', 'throttling', 'observability', 'recovery', 'protection', 'structure']);
for (const q of DESIGN_QUESTIONS) {
  assert.ok(q.title.endsWith('?') && q.question.length > 80 && q.question.endsWith('?'), q.id + ' asks a question');
  assert.ok([3, 5, 6, 7, 8, 9, 10].includes(q.chapter), q.id + ' lands in a chapter');
  assert.ok(q.caution.length > 40 && q.sources.length >= 1 && q.sources.every(s => s.title && s.locator), q.id + ' carries a caution and a source');
  assert.ok(QUESTION_INDEX[q.id] === q);
}
pass('twelve questions, each asked, placed, cautioned and sourced');

// 2. Every playbook id exists, every method option exists, every trigger word is the domain's.
for (const q of DESIGN_QUESTIONS) {
  for (const t of q.tactics) assert.ok(tactics.has(t), `${q.id}: tactic ${t} is in the playbook`);
  for (const x of q.patterns) assert.ok(patterns.has(x), `${q.id}: pattern ${x} is in the playbook`);
  for (const x of q.styles) assert.ok(styles.has(x), `${q.id}: style ${x} is in the playbook`);
  for (const a of q.trigger.attributes || []) assert.ok(types.has(a), `${q.id}: ${a} is a quality type`);
  for (const k of q.trigger.kinds || []) assert.ok(kinds.has(k), `${q.id}: ${k} is a driver kind`);
  for (const s of q.trigger.shapes || []) assert.ok(TARGET_SHAPES.some(x => x.id === s), `${q.id}: ${s} is a target shape`);
  for (const f of q.trigger.facts || []) assert.ok(RECORD_FACTS[f], `${q.id}: ${f} is a record fact`);
  if (q.decide.topic) { assert.ok(options[q.decide.topic], `${q.id}: ${q.decide.topic} is a method`); for (const o of q.decide.options) assert.ok(options[q.decide.topic].some(x => x.id === o), `${q.id}: option ${o} exists in ${q.decide.topic}`); }
  else assert.ok(q.decide.chapter && q.decide.record, q.id + ' names the chapter record that decides it');
  const k = questionKnowledge(q.id);
  assert.equal(k.tactics.length, q.tactics.length); assert.equal(k.patterns.length, q.patterns.length); assert.equal(k.styles.length, q.styles.length);
  assert.ok(k.tactics.every(t => t.name && t.src), q.id + ': tactics carry their name and locator');
}
assert.equal(questionKnowledge('structure').antiPatterns.length, 4, 'the structure question carries the playbook’s anti-patterns');
assert.equal(questionKnowledge('nope'), null);
pass('every id resolves in the playbook and the methods');

// 3. The owner's list is covered: cache, PostgreSQL or MySQL, sharding, queue, reverse proxy or load balancer, circuit breaker.
const by = id => QUESTION_INDEX[id];
assert.deepEqual(by('read-path').decide.options, ['direct-read', 'cache-aside']); assert.ok(by('read-path').products.includes('Redis'));
assert.ok(by('persistence').products.includes('PostgreSQL') && by('persistence').products.includes('MySQL'));
assert.deepEqual(by('partitioning').decide.options, ['single-partition', 'sharded']);
assert.deepEqual(by('handoff').decide.options, ['request-reply', 'durable-queue']); assert.ok(by('handoff').products.includes('Kafka'));
assert.deepEqual(by('edge').decide.options, ['single-endpoint', 'reverse-proxy', 'balanced-pool', 'proxy-balanced-pool']);
assert.deepEqual(by('protected-call').decide.options, ['bounded-call', 'protected-call']); assert.match(by('protected-call').question, /circuit breaker/);
assert.ok(by('structure').styles.length >= 4, 'the style question weighs the playbook styles');
pass('the owner’s when-do-I list is covered');

// 4. Target shapes read a driver's words; a driver with none keeps its category.
assert.equal(targetShape({metric: '95th percentile acknowledgement latency', unit: 'seconds'}), 'latency');
assert.equal(targetShape({metric: 'Extra debits per instruction', unit: 'extra debits', response: 'exactly one financial effect'}), 'integrity');
assert.equal(targetShape({metric: 'Intake availability', unit: '%', response: 'Intake stays available'}), 'availability');
assert.equal(targetShape({metric: 'Instructions per second at peak', unit: 'per second'}), 'throughput');
assert.equal(targetShape({metric: 'Minutes to restore the ledger', unit: 'minutes', response: 'restore within'}), 'recovery');
assert.equal(targetShape({metric: 'Unauthorised operations', unit: 'operations'}), 'protection');
assert.equal(targetShape({title: 'Keep a payment trail', metric: 'Instructions with an audit trail', unit: '%'}), 'trail');
assert.equal(targetShape({}), null); assert.equal(targetShape(null), null);
pass('target shapes');

// 5. A trigger is three-valued over the driver: attribute and shape for quality drivers, kind for the others.
assert.equal(driverOpens(by('read-path'), {kind: 'quality', category: 'performance', shape: 'latency'}), true);
assert.equal(driverOpens(by('read-path'), {kind: 'quality', category: 'performance', shape: 'growth'}), false, 'a growth target does not open the read path');
assert.equal(driverOpens(by('read-path'), {kind: 'quality', category: 'performance', shape: null}), true, 'a performance driver without a measurable target still opens it');
assert.equal(driverOpens(by('read-path'), {kind: 'quality', category: 'security', shape: 'latency'}), false);
assert.equal(driverOpens(by('recovery'), {kind: 'business-continuity', category: 'business-continuity', shape: null}), true, 'a business-continuity driver opens recovery');
assert.equal(driverOpens(by('recovery'), {kind: 'business', category: 'business', shape: null}), false);
pass('three-valued triggers');

// 6. Attributes resolve to the playbook's families and tactics; one the playbook lacks says so.
const perf = attributeOf('performance'); assert.equal(perf.family.id, 'efficiency'); assert.ok(perf.tactics.some(t => t.id === 'T-PF-CACHE')); assert.equal(perf.inPlaybook, true);
const cost = attributeOf('cost'); assert.equal(cost.inPlaybook, false); assert.equal(cost.tactics.length, 0); assert.equal(cost.family, null);
assert.ok(attributes.size >= 12);
pass('attributes');

// 7. Descriptive, never choosing: no rule carries a preferred option, a score or a weight; the posture says so.
for (const q of DESIGN_QUESTIONS) assert.ok(!('preferred' in q) && !('score' in q) && !('weight' in q), q.id + ' picks nothing');
assert.match(PATTERN_DNA.posture, /never|Nothing here approves/);
pass('descriptive posture');

console.log(`pattern-dna: ${checks.length} checks passed (${checks.join('; ')})`);
