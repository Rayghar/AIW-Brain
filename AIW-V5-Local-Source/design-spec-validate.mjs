// Specification and anti-pattern checks: what realises each part, from the logical responsibility to
// the product and where it runs, and the anti-patterns found in recorded facts. Run: npm run test:design-spec
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import * as KNOWLEDGE from './public/playbook-knowledge.js';
import {catalogueRecord, productLabel, reasoningSource} from './public/design-reasoning.js';
import {specFor, detectAntiPatterns, antiPatternsFor, runsOn, productsOfComponent} from './public/design-spec.js';

const checks = [], pass = n => checks.push(n);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const clone = x => structuredClone(x);
const R = reasoningSource(project);

// 1. Every Chapter 7 option names a product with its version and vendor; composites read by name.
const reals = project.technologyRealisation.records;
assert.equal(reals.length, 9);
for (const r of reals) { const o = r.options.find(x => x.product); assert.ok(o && o.version && o.vendor && o.benefits && o.drawbacks, r.id + ' names a product with version, vendor, benefits and drawbacks'); }
assert.deepEqual(reals.map(r => r.options.find(x => x.product).product), ['Kubernetes', 'PostgreSQL', 'RabbitMQ', 'Redis', 'Kong Gateway', 'Keycloak', 'OpenTelemetry · Prometheus · Grafana', 'pgBackRest', 'Patroni']);
assert.ok(reals.every(r => r.options.length >= 2), 'each realisation keeps an alternative product to compare');
assert.ok(reals.some(r => r.options.some(o => o.product === 'Apache Kafka')) && reals.some(r => r.options.some(o => o.product === 'MongoDB')), 'the alternatives name Kafka and MongoDB');
assert.ok(reals.every(r => !r.selectedOptionId), 'no product is chosen for the user: every option stays a candidate');
assert.equal(productLabel({product: 'PostgreSQL', version: '17'}), 'PostgreSQL 17');
assert.equal(productLabel({product: 'OpenTelemetry · Prometheus · Grafana', version: 'Collector 0.110 · Prometheus 3.0 · Grafana 11'}), 'OpenTelemetry · Prometheus · Grafana');
pass('every Chapter 7 realisation names a product with version, vendor, benefits and drawbacks, and an alternative (Kafka, MongoDB, Memcached…); none is chosen for the user');

// 2. A component's specification: its responsibility, platform, products, runtime, drivers and decisions.
const S = specFor(R, 'api-pod');
assert.equal(S.kind, 'component'); assert.equal(S.ref, 'APP-001');
assert.deepEqual(S.responsibilities.map(r => r.ref), ['LR-001']);
assert.deepEqual(S.capabilities.map(c => c.category), ['compute', 'transactional', 'connectivity', 'identity', 'observability', 'backup']);
assert.deepEqual(S.products.map(x => productLabel(x.product)), ['Kubernetes 1.31', 'PostgreSQL 17', 'Kong Gateway 3.9', 'Keycloak 26', 'OpenTelemetry · Prometheus · Grafana', 'pgBackRest 2.54']);
assert.deepEqual(S.plans.map(f => f.plan.ref), ['RUN-001']);
assert.ok(S.drivers.some(d => d.id === 'QD-002') && S.decisions.some(d => d.id === 'ADR-001'));
assert.ok(S.gaps.includes('RUN-001 runs one replica with no standby') && S.gaps.includes('RUN-001 records no recovery time') && S.gaps.includes('Kubernetes is a candidate, not yet the chosen option'), 'what is not yet specified is said, not filled in');
assert.deepEqual(productsOfComponent(R, 'api-pod').map(x => x.cap.ref), S.capabilities.map(c => c.ref));
pass('a component\'s specification reads through every chapter: LR-001 → APP-001 → six platform capabilities → Kubernetes 1.31, PostgreSQL 17, Kong Gateway 3.9… → RUN-001, with its drivers, decisions and what is still missing');

// 3. The same specification from any chapter: responsibility, capability, realisation, runtime plan.
const Sr = specFor(R, 'api');
assert.equal(Sr.kind, 'responsibility'); assert.deepEqual(Sr.components.map(c => c.ref), ['APP-001']); assert.equal(Sr.products.length, S.products.length);
const Sq = specFor(R, 'tr-003');
assert.equal(Sq.kind, 'realisation'); assert.equal(Sq.products[0].product.product, 'RabbitMQ'); assert.ok(Sq.components.length >= 1 && Sq.plans.some(f => f.plan.ref === 'RUN-008'));
const Sp = specFor(R, 'run-001');
assert.equal(Sp.kind, 'plan'); assert.equal(Sp.asset.ref, 'APP-001'); assert.equal(Sp.plans.length, 1); assert.deepEqual(Sp.products, S.products);
assert.deepEqual(runsOn(R, 'api-pod'), {label: 'Kubernetes 1.31', selected: false, via: 'TC-001'});
assert.equal(runsOn(R, 'tr-003').label, 'RabbitMQ 4.0');
assert.equal(specFor(R, 'nothing'), null);
pass('the specification is the same wherever the part is selected: a responsibility, a component, a realisation or a runtime plan; a runtime plan says what it runs on');

// 4. Anti-patterns found in recorded facts, named as the catalogue names them.
const found = detectAntiPatterns(R), corpus = JSON.stringify(Object.values(KNOWLEDGE).filter(v => typeof v !== 'function'));
assert.deepEqual(found.map(a => a.id), ['spof', 'sync-chain', 'idempotency', 'queue', 'observability']);
assert.deepEqual(found.map(a => a.name), ['Single Point of Failure', 'Synchronous Chain', 'Missing Idempotency', 'Unbounded Queue', 'Observability as Afterthought']);
for (const a of found) {
  assert.ok(catalogueRecord(a.catalogueId), a.catalogueId + ' is in the pattern catalogue');
  assert.ok(a.text && a.ask && a.objects.length, a.id);
  for (const o of a.objects) assert.ok(R.plans.has(o.id) || R.comps.has(o.id) || R.reals.has(o.id) || R.contracts.some(c => c.id === o.id), o.id + ' is a recorded object');
  if (a.playbook) assert.ok(corpus.includes(JSON.stringify(a.playbook.text).slice(1, -1)) || corpus.includes(JSON.stringify(a.playbook.text.split(': ')[1] || '').slice(1, -1)), a.id + ' quotes the playbook verbatim');
}
assert.deepEqual(found[0].objects.map(o => o.ref), ['RUN-001', 'RUN-002', 'RUN-004']);
assert.deepEqual(found[1].objects.map(o => o.ref), ['APP-001', 'APP-002', 'APP-003', 'APP-004']);
assert.match(found[1].playbook.text, /^Asynchronous Communication/); assert.match(found[1].playbook.src, /^QR-Guidebook!G5/);
assert.deepEqual(found[2].objects.map(o => o.ref), ['IF-001', 'IF-002', 'IF-004', 'IF-005', 'IF-006']);
assert.match(found[3].text, /TR-003 .*\(RabbitMQ\)/);
assert.deepEqual(antiPatternsFor(found, 'run-001').map(a => a.id), ['spof', 'observability']);
pass('five anti-patterns are found in the reference, each from recorded facts, named from the pattern catalogue, pointing at its objects and quoting the SA Playbook where it speaks');

// 5. Each finding follows the facts: fix them and it goes; break them and a new one appears.
const fixed = clone(project);
for (const r of fixed.runtime.plans) { r.standbyReplicas = 1; r.monitoring = 'Health checks and alerts on the driver measures'; }
for (const c of fixed.interfaces?.contracts ?? []) { c.idempotencyKey = 'instructionId'; }
for (const r of fixed.technologyRealisation.records) r.capacityValue = r.capacityValue || '5000';
const after = detectAntiPatterns(reasoningSource(fixed)).map(a => a.id);
assert.ok(!after.includes('queue'), 'a recorded capacity clears the unbounded queue');
const broken = clone(project);
const contracts = broken.interfaces?.contracts;
if (contracts?.length) { contracts[0].retryPolicy = 'Retry until it succeeds'; assert.ok(detectAntiPatterns(reasoningSource(broken)).some(a => a.id === 'retry'), 'an unbounded retry policy is a retry storm'); contracts[0].retryPolicy = 'Retry three times with exponential backoff and jitter'; assert.ok(!detectAntiPatterns(reasoningSource(broken)).some(a => a.id === 'retry')); }
pass('findings follow the recorded facts: a capacity clears the unbounded queue; an unbounded retry policy raises a retry storm and a bounded one does not');

assert.equal(JSON.stringify(project), before, 'reading the specification changes nothing');
pass('reading specifications and anti-patterns changes nothing in the project');

console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
