// Specification and anti-pattern checks: what realises each part, from the logical responsibility to
// the product and where it runs, and the anti-patterns found in recorded facts. Run: npm run test:design-spec
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import * as KNOWLEDGE from './public/playbook-knowledge.js';
import {catalogueRecord, productLabel, reasoningSource, driverChain} from './public/design-reasoning.js';
import {specFor, componentSpec, detectAntiPatterns, antiPatternsFor, runsOn, productsOfComponent} from './public/design-spec.js';
import {componentSpecDocument, componentSpecMarkdown, componentSpecsSection, COMPONENT_SPECS_TITLE} from './public/component-spec-document.js';
import {componentSheetHTML, componentSheet, specEmptyHTML, SHEET_SECTIONS} from './public/component-spec-view.js';
import {assembleSDD} from './public/review-domain.js';
import {sddDocument} from './public/sdd-document.js';
import {richProject} from './sdd-fixtures.mjs';

const checks = [], pass = n => checks.push(n);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const clone = x => structuredClone(x), list = x => (Array.isArray(x) ? x : []);
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

// 2b. Round 11: the component specification reads every chapter's links of one component and names what it lacks.
{
  const C = componentSpec(R, 'api-pod');
  assert.equal(C.ref, 'APP-001'); assert.deepEqual(C.responsibilities.map(r => r.ref), S.responsibilities.map(r => r.ref));
  assert.deepEqual(C.capabilities.map(c => c.ref), S.capabilities.map(c => c.ref)); assert.deepEqual(C.plans.map(f => f.plan.ref), ['RUN-001']);
  const faces = [...C.provides, ...C.uses];
  assert.ok(faces.length, 'the reference component carries interface contracts');
  for (const f of faces) { assert.ok(['request', 'event', 'batch'].includes(f.kind) && f.provider.record && f.consumer.record, f.contract.id + ' names both ends'); assert.ok(Object.keys(f.promises).every(k => f.promises[k] !== null && f.promises[k] !== ''), 'only recorded promises are listed'); }
  assert.ok(C.provides.every(f => (f.kind === 'event' ? f.contract.from : f.contract.to) === 'api-pod') && C.uses.every(f => (f.kind === 'event' ? f.contract.to : f.contract.from) === 'api-pod'), 'provided and used interfaces by the contract\'s roles');
  // Round 12 (GR-CMP-07): a component owns the data definitions that name it as their authority (its own list counts only
  // for a definition with no authority recorded); it consumes and produces what its contracts exchange.
  {
    const auth = structuredClone(project), d0 = auth.interfaces.data[0], other = auth.interfaces.data.find(d => d.id !== d0.id);
    Object.assign(d0, {authorityId: 'api-pod', authorities: [{id: 'api-pod', role: 'owns'}]}); Object.assign(other, {authorityId: 'risk-engine', authorities: [{id: 'risk-engine', role: 'owns'}]});
    auth.realisation.components.find(c => c.id === 'api-pod').dataIds = [other.id];
    const Ca = componentSpec(reasoningSource(auth), 'api-pod');
    assert.ok(Ca.data.owned.some(d => d.id === d0.id) && !Ca.data.owned.some(d => d.id === other.id), 'a component named as the authority of a data definition owns it; one another component is the authority of is not its own, whatever its list says');
    const flows = {consumed: new Set(), produced: new Set()};
    for (const k of auth.interfaces.contracts) for (const x of list(k.exchanges)) { if (k.from === 'api-pod') flows[x.role === 'response' ? 'consumed' : 'produced'].add(x.dataId); if (k.to === 'api-pod') flows[x.role === 'response' ? 'produced' : 'consumed'].add(x.dataId); }
    assert.ok(flows.consumed.size + flows.produced.size > 0, 'the reference component exchanges data through its contracts');
    for (const kind of ['consumed', 'produced']) for (const id of flows[kind]) assert.ok(Ca.data[kind].some(d => d.id === id), id + ': ' + kind + ', as its contracts exchange it');
  }
  assert.ok(C.controls.every(k => list(k.targetIds).includes('api-pod')) && C.threats.every(t => list(t.targetIds).includes('api-pod')), 'controls and threats are those that name it');
  assert.ok(C.needs.length && C.needs.every(n => n.need.applicationId === 'api-pod'), 'its technology needs, each with the capability that supports it');
  assert.ok(S.gaps.every(g => C.gaps.includes(g)), 'specFor\'s gaps are kept');
  const bare = structuredClone(project); bare.interfaces.contracts = []; bare.security.controls = [];
  const Cb = componentSpec(reasoningSource(bare), 'api-pod');
  assert.ok(Cb.gaps.includes('No interface contract names it (Chapter 8)'), 'a component with no contract says so');
  assert.ok(!Cb.threats.length || Cb.gaps.some(g => /no control protects it/.test(g)), 'a threatened component with no control says so');
  assert.equal(componentSpec(R, 'LR-001'), null, 'only a component has a component specification');
  pass('the component specification (round 11) reads responsibilities, interfaces with their promises, data owned/consumed/produced, drivers, needs and capabilities, products, threats and controls, runtime plans and decisions of one component, and names what it lacks');
}

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
assert.deepEqual(found[2].objects.map(o => o.ref), ['IF-001', 'IF-002', 'IF-003', 'IF-004', 'IF-005', 'IF-006']);
// The settlement hub already carries QD-001 through its named ADR-003. The shared
// scope must preserve that existing link without spreading a driver along calls.
const integrityChain = driverChain(R, 'QD-001');
assert.deepEqual(integrityChain.components.map(c => c.id), ['api-pod', 'core-adapter', 'worker', 'notify-worker']);
assert.ok(integrityChain.scope.paths.some(x => x.kind === 'decision' && x.to === 'hub' && x.via === 'ADR-003'));
const withoutSettlementDecision = clone(project);
withoutSettlementDecision.logical.responsibilities.find(r => r.id === 'hub').decisionIds = ['ADR-001'];
assert.ok(!detectAntiPatterns(reasoningSource(withoutSettlementDecision)).find(a => a.id === 'idempotency').objects.some(o => o.ref === 'IF-003'), 'the settlement contract leaves integrity scope when its carrying decision is removed; connected contracts do not spread the driver');
assert.match(found[3].text, /TR-003 .*\(RabbitMQ\)/);
assert.deepEqual(antiPatternsFor(found, 'run-001').map(a => a.id), ['spof', 'observability']);
pass('five anti-patterns are found in the reference, each from recorded facts, named from the pattern catalogue, pointing at its objects and quoting the SA Playbook where it speaks');

// 4b. Round 12 (DM-08): a placement whose copies are not stated counts as nothing, never as one. Its plan is not a single
// point of failure; the specification and the finding say its copies are not stated.
{
  const open = clone(project);
  for (const l of open.runtime.placements.filter(l => l.planId === 'run-001')) l.replicas = '';
  const R2 = reasoningSource(open), spof = detectAntiPatterns(R2).find(a => a.id === 'spof');
  assert.deepEqual(spof.objects.map(o => o.ref), ['RUN-002', 'RUN-004'], 'RUN-001 is not judged a single point of failure');
  assert.match(spof.text, /RUN-001 is not judged: copies not stated\./);
  const S2 = specFor(R2, 'run-001');
  assert.ok(S2.gaps.includes('RUN-001: copies not stated for 1 placement') && !S2.gaps.includes('RUN-001 runs one replica with no standby'), 'the specification says its copies are not stated');
  for (const l of open.runtime.placements.filter(l => ['run-002', 'run-004'].includes(l.planId))) l.replicas = null;
  assert.ok(!detectAntiPatterns(reasoningSource(open)).some(a => a.id === 'spof'), 'with no copies stated anywhere, no plan is a single point of failure');
  pass('a placement whose copies are not stated counts as nothing, never as one: its plan is not a single point of failure, and the finding and the specification say its copies are not stated');
}

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

// 6. Round 11: the component specification as a document, a view and an SDD section: every linked record named, no other.
{
  const D = componentSpecDocument(project, 'api-pod'), C = D.spec, md = D.markdown;
  assert.equal(D.ref, 'APP-001'); assert.ok(md.startsWith('# Component specification · APP-001 · Payment service\n\n'));
  for (const h of ['## Identity', '## Responsibilities (Chapter 4)', '## Requirements (Chapter 1)', '## Interactions (Chapter 5)', '## Interfaces (Chapter 8)', '## Data (Chapter 8)', '## Architecture drivers and quality targets (Chapter 2)', '## Technology needs and capabilities (Chapter 6)', '## Products (Chapter 7)', '## Protection (Chapter 9)', '## Runtime (Chapter 10)', '## Decisions (Chapter 3)', '## Open gaps']) assert.ok(md.includes('\n' + h + '\n'), h);
  // Every linked record is named, and no record that is not linked.
  const named = new Set((md.match(/\b[A-Z]{2,5}-\d{3}\b/g) || []));
  // Round 12 (GR-CMP-08): the requirements of the responsibilities it realises and of those it supports are linked too.
  const linked = new Set([C.ref, ...C.responsibilities.map(r => r.ref), ...C.requirements.realises, ...C.requirements.supports, ...C.interactions.map(x => x.interaction.id), ...C.interactions.map(x => x.other.record?.ref).filter(Boolean), ...C.provides.map(f => f.contract.ref), ...C.uses.map(f => f.contract.ref), ...[...C.provides, ...C.uses].flatMap(f => [f.provider.record?.ref, f.consumer.record?.ref, ...f.exchanges.map(x => x.data?.ref)]).filter(Boolean),
    ...C.data.owned.map(d => d.ref), ...C.data.consumed.map(d => d.ref), ...C.data.produced.map(d => d.ref), ...C.needs.flatMap(n => [n.need.ref || n.need.id, n.capability?.ref]).filter(Boolean), ...C.capabilities.map(c => c.ref), ...C.products.map(x => x.realisation.ref), ...C.controls.map(k => k.ref), ...C.threats.map(t => t.ref), ...C.plans.map(f => f.plan.ref), ...C.decisions.map(d => d.id)]);
  const notLinked = [...named].filter(x => !linked.has(x)), notNamed = [...linked].filter(x => /^[A-Z]{2,5}-\d{3}$/.test(x) && !named.has(x));
  assert.deepEqual(notLinked, [], 'the document names no record the specification does not link: ' + notLinked.join(', '));
  assert.deepEqual(notNamed, [], 'and every linked record is named: ' + notNamed.join(', '));
  // The drivers are named by their display codes (round 12: QD1 rather than QD-001), each once under its quality targets.
  for (const d of C.drivers) assert.ok(md.includes('\n- ' + (d.code || d.id) + ' '), (d.code || d.id) + ': named under the quality targets');
  assert.ok(named.has('LR-001') && named.has('IF-001') && named.has('DAT-001') && md.includes('\n- QD2 ') && named.has('TC-001') && named.has('TR-001') && named.has('SEC-001') && named.has('RUN-001') && named.has('ADR-001'), 'the reference component names its responsibility, interfaces, data, targets, capabilities, products, controls, plans and decisions');
  assert.ok(C.interactions.some(x => x.other.kind === 'capability' && x.other.chapter === 6) && !/\bgateway gateway\b/.test(md), 'a trace interaction to the platform names the capability, not its id twice');
  assert.ok(!/Not recorded|Unassigned|Unspecified|Target not defined|\bMissing\b/.test(md), 'the text prints no word the SDD reads as a gap');
  assert.equal(componentSpecDocument(project, 'LR-001'), null); assert.equal(componentSpecDocument(project, ''), null);
  const J = D.json; assert.equal(J.document, 'component-specification'); assert.equal(J.ref, 'APP-001'); assert.deepEqual(J.responsibilities.map(r => r.ref), ['LR-001']); assert.ok(J.provides.length && J.qualityTargets.length && J.plans.length && J.guidance);
  // With data definitions linked, the data group names them; without any, the prose stays as description.
  const withData = structuredClone(project); Object.assign(withData.realisation.components.find(c => c.id === 'api-pod'), {consumesDataIds: ['instruction'], producesDataIds: ['risk-record']});
  const Dd = componentSpecDocument(withData, 'api-pod');
  // Round 12 (GR-CMP-07): its contracts' exchanges are read beside the lists it declares (IF-001 brings it the instruction,
  // IF-004 sends the instruction and brings back the risk decision).
  assert.match(Dd.markdown, /Owned: DAT-001 Payment instruction · Consumed: DAT-001 Payment instruction, DAT-002 Risk decision · Produced: DAT-001 Payment instruction, DAT-002 Risk decision/);
  // The prose gap stands while no data definition reaches the component (round 12: its contracts' exchanges count, so the
  // reference, whose contracts exchange data, is read without its contracts) and closes once one is linked.
  const prose = structuredClone(project); prose.interfaces.contracts = [];
  const proseLinked = structuredClone(prose); Object.assign(proseLinked.realisation.components.find(c => c.id === 'api-pod'), {consumesDataIds: ['instruction']});
  assert.ok(!Dd.spec.gaps.some(g => /inputs and outputs are prose/.test(g)) && componentSpecDocument(prose, 'api-pod').spec.gaps.some(g => /inputs and outputs are prose/.test(g)) && !componentSpecDocument(proseLinked, 'api-pod').spec.gaps.some(g => /inputs and outputs are prose/.test(g)), 'the prose gap closes once a data definition is linked');
  // The SDD section: one part per component, after the performance specification, in every edition.
  const sec = componentSpecsSection(project);
  assert.ok(sec.startsWith('## ' + COMPONENT_SPECS_TITLE + '\n\n') && (sec.match(/^### APP-\d{3} · /gm) || []).length === project.realisation.components.length, 'one part per component');
  const sdd = assembleSDD(project);
  assert.ok(sdd.indexOf('\n## ' + COMPONENT_SPECS_TITLE + '\n') > sdd.indexOf('\n## Performance specification\n') && sdd.indexOf('\n## ' + COMPONENT_SPECS_TITLE + '\n') < sdd.indexOf('\n## Delivery and verification obligations\n'), 'the SDD carries the component specifications after the performance specification');
  // The architecture edition (round 12, F; SDD-SPEC §4) prints the component specification table and each component's
  // detail in its section 4 and lists the specifications as an annex in Appendix D (componentSpecsAnnex); the review
  // registers annex (assembleSDD, above) carries the section whole. The review audience reads the shape in brief.
  for (const audience of ['all', 'delivery']) { const m = sddDocument(project, {audience, figures: false}).markdown; assert.ok(m.includes('\n## Component specification table\n') && /\| Component specifications \| [^|]+ \| \/api\/export\?chapter=11&annex=specifications&format=md /.test(m), 'the architecture edition for ' + audience + ' prints the table and lists the specifications in Appendix D'); }
  const none = structuredClone(project); none.realisation.components = [];
  assert.match(componentSpecsSection(none), /No application component is recorded yet \(Chapter 5\)/);
  assert.equal(componentSpecMarkdown(C, {level: 3}).split('\n')[0], '### APP-001 · Payment service');
  // The Specification sheet (rc40 W3) renders the template's ten sections from the same reading, every value linked.
  const v = componentSheetHTML(project, 'api-pod'), sheet = componentSheet(project, 'api-pod');
  assert.ok(v.includes('data-spec-of="api-pod"') && (v.match(/data-spec-section=/g) || []).length === 10, 'the reference component renders the ten sections of the template, open areas included');
  assert.ok(v.includes('data-spec-field="approach"') && v.includes('data-spec-field="mechanisms"') && v.includes('data-spec-field="drivers-table"'), 'solution approach, quality properties and the per-driver table with decision effects are on the sheet');
  assert.ok(/chapter=4&amp;tab=model&amp;object=api(?:&amp;|")/.test(v) && /chapter=2&amp;tab=model&amp;driver=QD-002(?:&amp;|")/.test(v) && /chapter=3&amp;tab=model&amp;decision=ADR-001(?:&amp;|")/.test(v) && /data-sel="risk-engine"/.test(v), 'each entry links to its record in its chapter; a Chapter 5 record is held in place');
  assert.ok(/document=spec&amp;id=api-pod&amp;format=md/.test(v) && /format=json/.test(v) && /format=html&amp;view=1/.test(v), 'the view offers the document as Markdown, HTML and JSON');
  assert.deepEqual(sheet.sections.map(s => s.id), SHEET_SECTIONS.slice(1).map(s => s.id)); assert.ok(sheet.completeness.total >= 30 && sheet.completeness.recorded + sheet.completeness.inferred + sheet.completeness.open === sheet.completeness.total, 'the template counts its fields once');
  assert.ok(sheet.omissions.every(o => /^\/\?chapter=\d+&tab=work/.test(o.path) && o.chapter && o.where), 'every omission names the chapter and section that records it');
  assert.deepEqual(JSON.parse(JSON.stringify(D.sheet)), JSON.parse(JSON.stringify(sheet)), 'the export reads the same sheet model'); assert.equal(D.json.sheet.omissions.length, sheet.omissions.length); assert.ok(md.includes('\n## Completeness\n') && md.includes(`${sheet.completeness.recorded} of ${sheet.completeness.total} fields`), 'the Markdown prints the sheet’s completeness');
  const described = structuredClone(project), comp = described.realisation.components.find(x => x.id === 'api-pod');
  Object.assign(comp, {architecturalSolution: 'A bounded payment service with an accountable ledger boundary.', patternIds: [KNOWLEDGE.PATTERNS[0].id], rationale: 'The posting boundary must own the result.', properties: [{concern: 'reliability', statement: 'Duplicates retain the original result.', mechanism: 'Atomic reference record.', source: 'Design review DR-22.'}]});
  const detail = componentSheetHTML(described, 'api-pod');
  assert.match(detail, /A bounded payment service/); assert.match(detail, /Duplicates retain the original result/); assert.match(detail, /Atomic reference record/); assert.match(detail, /Design review DR-22/);
  assert.match(detail, /The posting boundary must own the result/);
  assert.ok(componentSheet(described, 'api-pod').fields.find(f => f.id === 'approach').state === 'recorded' && componentSheet(project, 'api-pod').fields.find(f => f.id === 'approach').state === 'open', 'a recorded approach turns its field from open to recorded');
  described.decisions.records.find(x => x.id === 'ADR-001').selectedAlternativeId = 'ALT-001';
  const withEffects = componentSheetHTML(described, 'api-pod');
  assert.match(withEffects, /data-spec-effect="QD-002" data-spec-decision="ADR-001"/, 'the selected alternative’s assessment of a carried driver is a decision effect on that driver’s row');
  assert.match(withEffects, /evidence needed/i, 'driver effect distinguishes an assessment from proof');
  const e = componentSheetHTML(project, null), e2 = specEmptyHTML(none);
  assert.ok(/Choose a component to read its specification/.test(e) && /purpose, design basis, interfaces, data, qualities, realization, security, decisions and provenance/.test(e) && (e.match(/data-sel="/g) || []).length === project.realisation.components.length, 'nothing held: the empty state names the template and offers every component');
  assert.ok(/Define the first application component/.test(e2) && /Chapter 4/.test(e2) && /data-a-action="new"/.test(e2), 'no component at all: the empty state anchors it in logical responsibilities and offers creation');
  pass('the component specification names the reference component’s linked records, solution and quality reasoning; its sheet renders the template’s ten sections with completeness, omissions, chapter links and an empty state, while the document, SDD and annex retain their own structure');
}

// Round 12 (GR-CMP-08): a component specification lists the requirements of the responsibilities it realises, by group
// with their external id and delivery status, apart from those of the responsibilities it only supports; twelve at most,
// then a count with the traceability matrix.
{
  // Each reading on its own copy: a project's reasoning source is read once per document object.
  const {document: rich} = await richProject(), q = withFinalReview(structuredClone(rich)), lr2 = q.logical.responsibilities.find(r => r.ref === 'LR-002');
  // APP-001 realises LR-001 and only supports LR-002 (the fixture's MAP-006); REQ-002, which LR-001 names too, is realised.
  const before = componentSpecDocument(withFinalReview(structuredClone(rich)), 'api-pod').spec.requirements;
  assert.ok(q.logical.mappings.find(m => m.physicalId === 'api-pod' && m.logicalId === lr2.id).role === 'supports' && before.realises.includes('REQ-002') && !before.supports.length, 'a requirement it realises through one responsibility is not listed again as supported');
  // LR-002 names REQ-003 as well, which no responsibility APP-001 realises names: APP-001 supports it, without realising it.
  lr2.requirementIds = [...(lr2.requirementIds || []), 'REQ-003'];
  const D = componentSpecDocument(q, 'api-pod'), Rq = D.spec.requirements, md = D.markdown, sec = md.slice(md.indexOf('\n## Requirements (Chapter 1)\n'), md.indexOf('\n## Interactions (Chapter 5)\n'));
  assert.deepEqual(Rq.supports, ['REQ-003'], 'the requirement of the responsibility it only supports is listed apart'); assert.ok(!Rq.realises.includes('REQ-003') && Rq.realises.includes('REQ-001') && Rq.realises.includes('REQ-002'));
  assert.ok(sec.includes('It realises: ' + Rq.realises.length + ' requirements.') && sec.includes('It supports, without realising: 1 requirement.'), 'the two lists, each counted');
  const byId = new Map(q.artefacts.map(a => [a.id, a])), lines = sec.split('\n').filter(l => /^- REQ-\d{3}/.test(l)), shown = lines.map(l => /^- (REQ-\d{3})/.exec(l)[1]);
  assert.ok(lines.length <= 13 && shown.every(id => Rq.realises.includes(id) || Rq.supports.includes(id)), 'twelve realised at most, and the supported one');
  for (const l of lines) { const a = byId.get(/^- (REQ-\d{3})/.exec(l)[1]), d = String(a.assessment?.delivery || '').trim(); assert.ok((!a.externalId || l.includes('(' + a.externalId + ')')) && l.endsWith(' · ' + (d ? d.toLowerCase() : 'delivery not assessed')), l + ': its external id and delivery status'); }
  assert.ok(/^RG-\d{3} · [^\n]+ \(\d+\):$/m.test(sec) && lines.some(l => /\(\S+\)/.test(l)), 'by requirement group, with the external ids the workbook gave');
  if (Rq.realises.length > 12) assert.match(sec, new RegExp('And ' + (Rq.realises.length - 12) + ' more, each in the traceability matrix \\(the SDD\'s Appendix D\\)\\.'));
  pass('round 12 (GR-CMP-08): APP-001\'s specification lists the ' + Rq.realises.length + ' requirements of the responsibilities it realises by group, with external id and delivery status, twelve at most and the rest counted with the matrix, apart from the requirement of the responsibility it only supports');
}

// Round 11 (workstream F): the library's component snapshot reads the same specification, by name: every interface,
// data definition, need and obligation of componentSpec, and no other, with the project and component it came from.
{
  const {readComponentSnapshot, snapshotText} = await import('./public/component-library.js'), {componentSnapshot} = await import('./public/component-snapshot.js');
  const C = componentSpec(R, 'api-pod'), s = componentSnapshot(project, 'api-pod', {at: '2026-10-07T09:00:00.000Z'});
  assert.deepEqual([s.identity.ref, s.identity.title, s.purpose, s.boundary], [C.ref, C.title, C.purpose, C.boundary]);
  assert.deepEqual(s.interfaces.provides.map(f => f.title), C.provides.map(f => f.contract.title)); assert.deepEqual(s.interfaces.requires.map(f => f.title), C.uses.map(f => f.contract.title));
  assert.deepEqual(s.interfaces.provides.map(f => f.promises), C.provides.map(f => f.promises), 'the promises travel as read');
  assert.deepEqual(s.data.owned, C.data.owned.map(d => `${d.ref} ${d.title}`)); assert.deepEqual(s.responsibilities.length, C.responsibilities.length);
  assert.deepEqual(s.technology.needs.map(n => n.category), C.needs.map(n => n.need.category)); assert.deepEqual(s.technology.needs.map(n => n.capability), C.needs.map(n => `${n.capability.ref} ${n.capability.title}`));
  assert.deepEqual(s.obligations.filter(o => o.kind === 'quality').map(o => o.title.split(' ')[0]), C.drivers.map(d => d.id)); assert.deepEqual(s.obligations.filter(o => o.kind === 'control').map(o => o.title.split(' ')[0]), C.controls.map(k => k.ref));
  assert.deepEqual(s.origin.component, {id: 'api-pod', ref: 'APP-001', title: 'Payment service'});
  assert.deepEqual(readComponentSnapshot(snapshotText(s)), s);
  assert.equal(componentSnapshot(project, 'ledger'), null, 'only a component has a snapshot');
  pass('round 11: the library snapshot of a component names the same interfaces, promises, data, needs and obligations as its specification, and no other, with the component it came from');
}

assert.equal(JSON.stringify(project), before, 'reading the specification changes nothing');
pass('reading specifications and anti-patterns changes nothing in the project');

console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
