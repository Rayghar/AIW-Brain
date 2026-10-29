// The Architecture requirements specification (round 11): every Chapter 2 driver once, with its scenario, measurable
// target, verification, priority, owner, source and trace; the conflicts; the open items; the Validate gate; the links
// a Chapter 6, 7 or 10 figure makes to the driver it serves; the SDD section and the export route. Pure readers:
// nothing changes the project. Run: npm run test:ars
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview, assembleSDD, sddHTML} from './public/review-domain.js';
import {sddDocument} from './public/sdd-document.js';
import {applyQualityCommand, ADDED_QUALITY_TYPES, QUALITY_TYPES} from './public/quality-domain.js';
import {applyTechnologyCommand} from './public/technology-domain.js';
import {arsDocument, arsMarkdown, arsSection, arsJSON, arsGate, ARS_TITLE, targetWords} from './public/ars-document.js';
import {componentSpecDocument} from './public/component-spec-document.js';
import {driverLink, driverLinksOf, linksToDriver, driverDisagreements, driverLinkText, driverOptions, LINK_FIELDS} from './public/driver-links.js';
import {createProject} from './shared/projects-domain.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';

const checks = [], pass = n => checks.push(n);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const GAP_WORDS = /Not recorded|Unassigned|Unspecified|Target not defined|\bMissing\b|Open question: /;
const headings = (md, re) => md.split('\n').filter(l => re.test(l));

// 1. Every driver appears exactly once, with its chain through the design.
const A = arsDocument(project);
assert.equal(A.title, ARS_TITLE);
assert.deepEqual([...A.requirements.map(r => r.id)].sort(), project.quality.drivers.map(d => d.id).sort(), 'one requirement per driver');
assert.deepEqual(A.requirements.map(r => r.priority), ['High', 'High', 'High', 'Medium', 'Medium', 'Medium'], 'in priority order, as the register orders them; a priority stored before round 12 reads as High, Medium or Low');
assert.deepEqual(A.requirements.map(r => r.code), A.requirements.map(r => 'QD' + Number(r.id.slice(3))), 'each requirement carries its display code');
assert.equal(new Set(A.requirements.map(r => r.id)).size, A.requirements.length);
for (const r of A.requirements) {
  assert.ok(r.scenario.stimulus && r.scenario.conditions && r.scenario.response, r.id + ' has its scenario');
  assert.ok(r.target.metric && r.target.operator && r.target.value !== '' && r.target.unit && r.target.window && r.target.measurement && r.target.measurable, r.id + ' has a measurable target');
  assert.ok(r.verification && r.priority && r.owner && r.source, r.id + ' names its verification, priority, owner and source');
  assert.ok(r.trace.requirements.length && r.trace.responsibilities.length && r.trace.components.length && r.trace.plans.length, r.id + ' is traced to requirements, responsibilities, components and runtime plans');
  // GR-DRV-06 (round 12): a driver is carried only when a Chapter 6 capability, a Chapter 7 realisation or a Chapter 10
  // plan names it; the plans its components run under are listed apart. No record of the reference names a driver.
  assert.ok(r.verified && !r.carried && !r.carriers.length && r.trace.reachedPlans.length && r.open.map(o => o.kind).join() === 'uncarried', r.id + ' is verified; nothing names it, so it is not carried, and the plans its components run under are listed apart');
}
const q1 = A.requirements.find(r => r.id === 'QD-001');
assert.deepEqual(q1.trace.requirements.map(x => x.id), ['REQ-003']);
// rc39: a driver's responsibilities are its scope (driver-scope.js): the ones it names (api, ledger) and the ones reached
// through the decisions that cite it (ADR-002 and ADR-003 are linked by hub and notify), never fewer.
assert.deepEqual(q1.trace.responsibilities.map(x => x.ref).sort(), ['LR-001', 'LR-003', 'LR-004', 'LR-005'], 'QD-001 reaches the responsibilities it names and those its citing decisions link');
assert.deepEqual(q1.trace.components.map(x => x.ref).sort(), ['APP-001', 'APP-003', 'APP-004', 'APP-005'], 'and the components that realise those four responsibilities');
assert.ok(q1.trace.decisions.some(d => d.id === 'ADR-002') && q1.trace.controls.length && q1.trace.plans.every(x => /^RUN-/.test(x.ref)), 'QD-001 reaches its decisions, controls and plans');
// Open: the twelve categories no driver covers, the six drivers nothing names (GR-DRV-06) and the assumption not yet
// confirmed (GR-DRV-07: the ARS carries the constraints and assumptions).
assert.deepEqual(A.counts, {requirements: 6, categories: 6, measurable: 6, verified: 6, carried: 0, open: 19});
assert.deepEqual([A.open.uncarried.length, A.open.emptyCategories.length, A.open.assumptions.length], [6, 12, 1]);
pass('the specification lists every Chapter 2 driver exactly once with its scenario, measurable target, verification, priority, owner, source and its trace to requirements, responsibilities, components, decisions, controls and runtime plans');

// 2. The categories: all eighteen, each with what it covers; the ones no driver covers are open items.
assert.equal(A.categories.length, QUALITY_TYPES.length);
assert.deepEqual(A.categories.filter(c => c.drivers.length).map(c => c.id), ['integrity', 'availability', 'performance', 'recoverability', 'security', 'traceability']);
assert.ok(A.categories.every(c => c.description), 'every category says what it covers');
assert.deepEqual(A.open.emptyCategories, ['Scalability', 'Maintainability', 'Deployability', 'Testability', 'Usability', 'Interoperability', 'Compliance', 'Privacy', 'Cost', 'Capacity', 'Reliability', 'Operability']);
const withCompliance = applyQualityCommand(project, {type: 'quality.driver', payload: {category: 'compliance', title: 'Show the regulator the trail of a payment', stimulus: 'The regulator asks for the trail of one payment.', conditions: 'Any payment of the last seven years.', response: 'Produce the trail with its evidence.', metric: 'Days to produce the trail', operator: 'At most', targetValue: '5', unit: 'days', window: 'Each request', measurement: 'Time each request.', priority: 'Supporting', rationale: 'A late trail is a finding against the bank.', owner: 'Compliance office', source: 'Regulatory handbook', requirementIds: [project.artefacts.find(a => a.type === 'requirement').id], responsibilityIds: ['api']}}).document;
const Ac = arsDocument(withCompliance);
assert.ok(Ac.categories.find(c => c.id === 'compliance').drivers.length === 1 && Ac.requirements.some(r => r.category === 'compliance' && r.categoryName === 'Compliance') && !Ac.open.emptyCategories.includes('Compliance'), 'a compliance driver fills its category');
assert.ok(ADDED_QUALITY_TYPES.every(t => Ac.categories.some(c => c.id === t.id)), 'the six added categories are listed');
pass('the categories section lists all eighteen categories with what each covers; the twelve no driver covers are an open item, and a compliance driver fills its category');

// 3. Open items: an unmeasurable target, a target without a verification, a target no runtime plan carries, and the gate.
// A project where a Chapter 10 plan names each driver (a plan its components run under): every driver is carried.
const named = structuredClone(project);
for (const r of A.requirements) { const plan = named.runtime.plans.find(x => x.id === r.trace.reachedPlans[0].id); plan.targets = [...(Array.isArray(plan.targets) ? plan.targets : []), {kind: 'availability', driverId: r.id, operator: '', value: '', unit: '', window: '', basis: '', confirmed: false}]; }
const An = arsDocument(named);
assert.ok(An.requirements.every(r => r.carried && r.carriers.length === 1 && r.carriers[0].chapter === 10 && !r.trace.reachedPlans.some(x => x.id === r.carriers[0].id) && !r.open.length), 'a plan that names a driver carries it, and is not listed again among the plans reached through components');
const vague = structuredClone(named);
Object.assign(vague.quality.drivers.find(d => d.id === 'QD-003'), {targetValue: '', measurement: ''});
Object.assign(vague.quality.drivers.find(d => d.id === 'QD-006'), {responsibilityIds: []});
for (const plan of vague.runtime.plans) if (Array.isArray(plan.targets)) plan.targets = plan.targets.filter(t => t.driverId !== 'QD-006');
const Av = arsDocument(vague);
assert.deepEqual(Av.open.unmeasurable.map(x => x.id), ['QD-003']); assert.match(Av.open.unmeasurable[0].text, /^QD-003 needs a numeric target and a verification\.$/);
assert.deepEqual(Av.open.unverified.map(x => x.id), ['QD-003']);
// GR-DRV-03 (round 23): a dash as the window states no window: the target is not measurable and the specification says why.
{
  const dashed = structuredClone(named); Object.assign(dashed.quality.drivers.find(d => d.id === 'QD-002'), {window: '—'});
  const Ad = arsDocument(dashed);
  assert.deepEqual(Ad.open.unmeasurable.map(x => x.id), ['QD-002']); assert.match(Ad.open.unmeasurable[0].text, /^QD-002 needs a measurement window\.$/);
  assert.equal(Ad.counts.measurable, An.counts.measurable - 1, 'counted as not measurable');
}
assert.deepEqual(Av.open.uncarried.map(x => x.id), ['QD-006']); // rc39: the open item also lists the plans the driver's components run under, which do not name it (GR-DRV-06's "listed apart" in one sentence).
assert.match(Av.open.uncarried[0].text, /^QD-006 is named by no runtime plan, capability or realisation \(Chapters 6, 7 and 10\); its components run under RUN-\d{3}(?:, RUN-\d{3})+, which do not name it\.$/);
assert.match(A.open.uncarried[0].text, /^QD-001 is named by no runtime plan, capability or realisation \(Chapters 6, 7 and 10\); its components run under RUN-001, [^;]*, which do not name it\.$/, 'a plan reached through the components is named apart, not counted');
assert.equal(Av.requirements.length, 6, 'a driver with an open item still appears once');
const G = arsGate(named), Gv = arsGate(vague), G0 = arsGate(project);
assert.deepEqual(G, {drivers: 6, measurable: 6, verified: 6, carried: 6, pass: true, items: [], text: '6 of 6 measurable · 6 verified · 6 named by a plan, capability or realisation'});
assert.deepEqual([G0.carried, G0.pass, G0.items.map(i => i.id)], [0, false, A.requirements.map(r => 'ars:carried:' + r.id)], 'on the reference, which names no driver, the gate names each driver nothing carries');
assert.deepEqual(Gv.items.map(i => i.id), ['ars:measurable:QD-003', 'ars:verified:QD-003', 'ars:carried:QD-006']);
assert.deepEqual([Gv.measurable, Gv.verified, Gv.carried], [Av.counts.measurable, Av.counts.verified, Av.counts.carried], 'the gate, which reads no chain, counts what the document counts');
assert.deepEqual(Gv.items.map(i => i.detail).slice(0, 1), [Av.open.unmeasurable[0].text], 'and says it in the same words');
assert.equal(Gv.pass, false); assert.equal(Gv.text, '5 of 6 measurable · 5 verified · 5 named by a plan, capability or realisation');
const empty = structuredClone(project); empty.quality.drivers = []; empty.quality.conflicts = [];
assert.deepEqual(arsGate(empty).items.map(i => i.id), ['ars:none']); assert.equal(arsDocument(empty).requirements.length, 0);
assert.match(arsMarkdown(empty), /No requirement yet: no quality driver is recorded in Chapter 2\./);
pass('the open items name the unmeasurable target with what it needs, the target without a verification and the target nothing names (a driver is carried only when a plan, capability or realisation names it; the plans its components run under are listed apart); the gate passes when a plan names each driver, names every driver on the reference, which names none, names each shortfall on a project with one unmeasurable driver and one uncarried driver, and says so when no driver is recorded');

// 4. A Chapter 6 figure that names the driver it serves: the trace shows the chain and flags a disagreement.
const tc = project.technology.capabilities.find(c => c.ref === 'TC-002');
const linked = applyTechnologyCommand(project, {type: 'technology.capability', payload: {...tc, mappings: project.technology.mappings.filter(m => m.capabilityId === tc.id).map(m => ({needId: m.needId, scope: m.scope})), recoveryMinutes: '30', driverId: 'QD-004'}}).document;
const Al = arsDocument(linked), q4 = Al.requirements.find(r => r.id === 'QD-004');
assert.deepEqual(q4.trace.fields.map(f => [f.chapter, f.kind, f.ref, f.state]), [[6, 'recovery', 'TC-002', 'breaks']]);
assert.deepEqual(Al.open.disagreements.map(x => x.id), ['QD-004']); assert.match(Al.open.disagreements[0].text, /^TC-002 \(Chapter 6\) records 30 minutes against QD-004's at most 15 minutes: Recovers in 30 min, longer than QD-004's 15 min\./);
assert.deepEqual(arsGate(linked).items.filter(i => !i.id.startsWith('ars:carried:')).map(i => i.id), ['ars:disagree:QD-004:TC-002']);
assert.ok(q4.carried && q4.carriers.map(c => c.ref).join() === 'TC-002' && !arsGate(linked).items.some(i => i.id === 'ars:carried:QD-004'), 'a capability that names QD-004 carries it');
assert.match(arsMarkdown(linked), /Linked figures:\n\n- TC-002 [^\n]* \(Chapter 6, recovery\): records 30 minutes against at most 15 minutes · disagrees: Recovers in 30 min, longer than QD-004's 15 min\./);
const agreed = applyTechnologyCommand(linked, {type: 'technology.capability', payload: {...tc, mappings: linked.technology.mappings.filter(m => m.capabilityId === tc.id).map(m => ({needId: m.needId, scope: m.scope})), recoveryMinutes: '10', driverId: 'QD-004'}}).document;
assert.equal(arsDocument(agreed).open.disagreements.length, 0); assert.equal(arsDocument(agreed).requirements.find(r => r.id === 'QD-004').trace.fields[0].state, 'holds');
assert.throws(() => applyTechnologyCommand(project, {type: 'technology.capability', payload: {...tc, mappings: [], driverId: 'QD-404'}}), /existing quality driver/);
{
  const l = driverLinksOf(linked, tc.id)[0];
  assert.equal(driverLinkText(l), 'Serves QD-004 Resolve uncertainty without unsafe retries · recorded 30 minutes · target at most 15 minutes · disagrees: Recovers in 30 min, longer than QD-004\'s 15 min.');
  assert.deepEqual(linksToDriver(linked, 'QD-004').map(x => [x.chapter, x.ref, x.link.state]), [[6, 'TC-002', 'breaks']]);
  assert.deepEqual(driverDisagreements(linked).map(x => x.ref), ['TC-002']); assert.deepEqual(driverDisagreements(project), []);
  assert.equal(driverLink(project, tc, LINK_FIELDS[0]), null, 'no link without a driverId');
  const gone = structuredClone(linked); gone.quality.drivers = gone.quality.drivers.filter(d => d.id !== 'QD-004');
  assert.match(driverLinksOf(gone, tc.id)[0].why, /not a Chapter 2 driver any more/);
  assert.deepEqual(driverOptions(project)[0], ['', 'Not linked to a quality driver']); assert.equal(driverOptions(project).length, 7); assert.match(driverOptions(project)[4][1], /^QD-004 · Resolve uncertainty without unsafe retries · At most 15 minutes$/);
}
pass('a Chapter 6 recovery target that names QD-004 appears in that requirement\'s trace with its chain; 30 minutes against at most 15 is flagged as a disagreement in the open items, the gate and the text, 10 minutes agrees, an unknown driver is refused, and the picker offers every driver with its target');

// Round 12 (GR-DRV-05): a driver with a figure but no window prints its comparator, value and unit, then "window and
// verification not stated", in the words the component specification uses for the same driver.
{
  const q = structuredClone(project), d = q.quality.drivers.find(x => x.id === 'QD-001'); Object.assign(d, {window: '', measurement: ''});
  const words = targetWords(d).text, qm = arsMarkdown(q), spec = componentSpecDocument(withFinalReview(q), 'api-pod').markdown;
  assert.equal(words, d.metric + ' at most ' + d.targetValue + ' ' + d.unit + '; window and verification not stated');
  assert.ok(qm.includes('Target: ' + words + ' · Measurable: no'), 'the specification prints the figure and what it lacks');
  assert.ok(spec.includes('\n- QD1 ' + d.title + ' · quality · High · ' + words + '\n'), 'and the component specification words it the same (rc39: the line also names the driver kind)');
  pass('a target with its figure but no window prints its comparator, value and unit, then "window and verification not stated", as the component specification prints it');
}
// Round 12 (GR-DRV-07): the Chapter 1 constraints and assumptions, each with the records it constrains or informs, and in
// the open items: an assumption not yet confirmed, a constraint that constrains nothing.
{
  const A0 = arsDocument(project), md0 = arsMarkdown(project);
  assert.deepEqual(A0.constraints.map(c => [c.id, c.records.map(x => x.ref)]), [['CON-001', ['REQ-003']]]);
  assert.deepEqual(A0.assumptions.map(a => [a.id, a.records.map(x => x.ref)]), [['ASM-001', ['REQ-004']]]);
  assert.ok(md0.includes('\n## Constraints\n\n- CON-001 · ') && /Constrains: REQ-003 /.test(md0) && md0.includes('\n## Assumptions\n\n- ASM-001 · ') && /Informs: REQ-004 /.test(md0), 'each with the records it constrains or informs');
  assert.ok(md0.indexOf('\n## Constraints\n') > md0.indexOf('\n## Requirements\n') && md0.indexOf('\n## Assumptions\n') < md0.indexOf('\n## Open items\n'), 'after the requirements, before the open items');
  assert.deepEqual(A0.open.assumptions.map(x => x.id), ['ASM-001']); assert.ok(md0.includes('Assumptions not confirmed:\n\n- ASM-001 '), 'an assumption not yet confirmed is open');
  const loose = structuredClone(project); loose.relationships = loose.relationships.filter(r => !(r.from === 'CON-001' && r.kind === 'constrains'));
  assert.deepEqual(arsDocument(loose).open.constraints.map(x => x.id), ['CON-001'], 'a constraint that constrains nothing is open');
  pass('the Chapter 1 constraints and assumptions follow the requirements, each with the records it constrains or informs, and the open items list an assumption not yet confirmed and a constraint that constrains nothing');
}

// Round 12 (GR-SDD-28): the Chapter 8 invariants with the data they bind and the contracts that must keep them, and the
// batch chain as its sequence with its windows and cut-offs; an invariant that leaves its check or owner unsaid and a
// batch contract that leaves its window or cut-off unsaid are open items.
{
  const {applyInterfacesCommand} = await import('./public/interfaces-domain.js');
  const cmd = (q, type, payload) => applyInterfacesCommand(q, {type: 'interfaces.' + type, payload});
  const A0 = arsDocument(project), m0 = arsMarkdown(project);
  assert.deepEqual([A0.invariants, A0.batch.steps, A0.open.invariants, A0.open.batch], [[], [], [], []], 'the reference records neither');
  assert.ok(m0.includes('\n## Data invariants\n\nNo invariant is recorded in Chapter 8.\n\n## Batch chain\n\nNo batch contract is recorded in Chapter 8.\n\n## Open items\n'), 'and says so, after the assumptions and before the open items');
  let q = cmd(project, 'invariant', {title: 'Postings balance', condition: 'For every posting, debits equal credits.', kind: 'balance', dataIds: ['posting'], contractIds: ['posting-api'], check: 'Reconcile debits and credits at the end of each day.', owner: 'Finance operations'}).document;
  q = cmd(q, 'invariant', {title: 'One posting per instruction', condition: 'An instruction posts once.', kind: 'uniqueness', dataIds: ['posting', 'instruction'], open: {check: {state: 'not-stated'}, owner: {state: 'not-stated'}}}).document;
  const batch = (doc, title, extra) => { const x = cmd(doc, 'contract', {title, kind: 'batch', from: 'worker', to: 'ext-core', exchanges: [{dataId: 'posting', role: 'request'}], ...extra}); return [x.document, x.selected]; };
  let close, interest;
  [q, close] = batch(q, 'Close the business day', {batchTrigger: 'calendar', batchSchedule: 'Each business day', batchWindow: '22:00 to 23:00 UTC', cutOff: '21:45', restartPoint: 'The last committed branch', volume: '2 million postings'});
  [q, interest] = batch(q, 'Accrue interest', {batchTrigger: 'event', batchSchedule: 'When the day is closed', predecessorIds: [close]});
  const A1 = arsDocument(q), m1 = arsMarkdown(q), ref = id => q.interfaces.contracts.find(c => c.id === id).ref, data = id => q.interfaces.data.find(d => d.id === id);
  assert.deepEqual(A1.invariants.map(r => [r.ref, r.kind, r.data.map(x => x.ref), r.contracts.map(x => x.ref)]), [['INV-001', 'balance', [data('posting').ref], [ref('posting-api')]], ['INV-002', 'uniqueness', [data('posting').ref, data('instruction').ref], []]], 'each invariant with the data it binds and the contracts that keep it');
  assert.ok(m1.includes('\n## Data invariants\n\n- INV-001 · Postings balance · balance: For every posting, debits equal credits. · Binds: ' + data('posting').ref + ' ' + data('posting').title + ' · Kept by: ' + ref('posting-api') + ' ' + q.interfaces.contracts.find(c => c.id === 'posting-api').title + ' · Checked: Reconcile debits and credits at the end of each day. · Owner: Finance operations\n'), 'printed with them');
  assert.ok(m1.includes('- INV-002 · One posting per instruction · uniqueness: An instruction posts once. · Binds: ' + data('posting').ref + ' ' + data('posting').title + '; ' + data('instruction').ref + ' ' + data('instruction').title + ' · Kept by: no contract named · Checked: no check named · Owner: no owner named'), 'what it leaves unsaid, said so');
  assert.deepEqual(A1.batch.steps.map(x => [x.ref, x.order, x.after]), [[ref(close), 1, []], [ref(interest), 2, [ref(close)]]], 'the chain in the order it runs');
  assert.ok(m1.includes('\n## Batch chain\n\nThe batch contracts in the order they run: ' + ref(close) + ' → ' + ref(interest) + '.\n\n- 1. ' + ref(close) + ' · Close the business day · Trigger: calendar · When: Each business day · Window: 22:00 to 23:00 UTC · Cut-off: 21:45 · After: nothing · Restart point: The last committed branch · Volume: 2 million postings\n- 2. ' + ref(interest) + ' · Accrue interest · Trigger: event · When: When the day is closed · Window: not stated · Cut-off: not stated · After: ' + ref(close) + ' · Restart point: not stated · Volume: not stated\n'), 'its sequence, each with its window and cut-off');
  assert.deepEqual(A1.open.invariants, [{id: 'INV-002', text: 'INV-002 One posting per instruction does not say how it is checked and who owns it.'}]);
  assert.deepEqual(A1.open.batch, [{id: ref(interest), text: ref(interest) + ' Accrue interest does not say its window and its cut-off.'}]);
  assert.ok(m1.includes('Invariants that leave something unsaid:\n\n- INV-002 One posting per instruction does not say how it is checked and who owns it.') && m1.includes('Batch contracts that leave their schedule unsaid:\n\n- ' + ref(interest) + ' Accrue interest does not say its window and its cut-off.'), 'both in the open items');
  assert.equal(A1.counts.open, A0.counts.open + 2, 'counted');
  assert.ok(A1.scope.endsWith(' From Chapter 8 it carries 2 invariants the data must keep and the batch chain of 2 contracts.'), 'the scope names them');
  assert.ok(!GAP_WORDS.test(m1), 'no gap word');
  assert.deepEqual([arsJSON(q).invariants.length, arsJSON(q).batch.sequence], [2, ref(close) + ' → ' + ref(interest)], 'the JSON export carries them');
  const looped = cmd(q, 'contract', {id: close, predecessorIds: [interest]}).document;
  assert.ok(arsDocument(looped).open.batch.some(x => / waits, through the contracts before it, for itself/.test(x.text)), 'a circular order is open');
  pass('the invariants print with the data they bind and the contracts that keep them, the batch chain as its sequence with each contract’s trigger, schedule, window, cut-off, predecessors, restart point and volume; what they leave unsaid, and a circular order, are open items');
}

// 5. Markdown as a document of its own, as an SDD section, and in every SDD edition; HTML and JSON; no gap words.
const md = arsMarkdown(project);
assert.ok(md.startsWith('# ' + ARS_TITLE + '\n\n'));
for (const h of ['## Purpose and scope', '## Categories', '## Requirements', '## Conflicts', '## Constraints', '## Assumptions', '## Data invariants', '## Batch chain', '## Open items']) assert.ok(md.includes('\n' + h + '\n'), h);
assert.equal(headings(md, /^### QD-\d{3} · /).length, 6, 'one heading per driver'); assert.equal(headings(md, /^### QD-001 · /).length, 1);
assert.ok(!GAP_WORDS.test(md), 'the text prints no word the SDD reads as a gap: it lists what is open in its own words');
assert.match(md, /Categories no driver covers: Scalability, [^\n]*Capacity, Reliability, Operability\./);
const sec = arsSection(project);
assert.ok(sec.startsWith('## ' + ARS_TITLE + '\n\n') && sec.includes('\n### Requirements\n') && sec.includes('\n#### QD-001 · ') && /performance specification that follows/.test(sec), 'the SDD section is the same text one level down, handing over to the performance specification');
const sdd = assembleSDD(project);
assert.ok(sdd.indexOf('\n## ' + ARS_TITLE + '\n') > 0 && sdd.indexOf('\n## ' + ARS_TITLE + '\n') < sdd.indexOf('\n## Performance specification\n'), 'the SDD carries the specification before the performance specification it widens');
// The architecture edition (round 12, F; SDD-SPEC) prints each driver once in section 2, by kind under its display code,
// and lists the specification as an annex in Appendix D; the review registers annex (assembleSDD, above) carries it whole.
for (const audience of ['all', 'delivery', 'review']) {
  const m = sddDocument(project, {audience, figures: false}).markdown, s2 = m.includes('\n# 2. ') ? m.slice(m.indexOf('\n# 2. '), m.indexOf('\n# 3. ')) : '', printed = A.requirements.map(r => (s2.match(new RegExp('^\\*\\*' + r.code + ': ', 'gm')) || []).length);
  if (audience !== 'delivery') assert.deepEqual(printed, A.requirements.map(() => 1), 'the architecture edition for ' + audience + ' prints every driver once in section 2');
  if (audience !== 'review') assert.match(m, /\| Architecture requirements specification \| [^|]+ \| \/api\/export\?chapter=2&document=ars&format=md \|/, 'the architecture edition for ' + audience + ' lists the specification in Appendix D');
}
const html = sddHTML(md);
assert.ok(/<h1[^>]*>Architecture requirements specification<\/h1>/.test(html) && html.includes('QD-001') && !html.includes('<script'), 'the HTML renders the headings');
const J = arsJSON(project);
assert.equal(J.document, 'architecture-requirements-specification'); assert.equal(J.requirements.length, 6); assert.ok(J.exportedAt && J.guidance && J.counts.requirements === 6);
pass('the specification reads as a Markdown document with its nine sections (the constraints, the assumptions, the data invariants and the batch chain among them) and one heading per driver, as a section of the review registers before the performance specification, as an annex the architecture edition lists in Appendix D beside each driver printed once in its section 2, as HTML and as JSON, and prints no word the SDD reads as a gap');

// 6. The export route serves it as Markdown, HTML and JSON for the signed-in owner's project.
{
  const DB = localDatabase(':memory:'), env = {DB, ASSETS: {fetch: () => new Response('asset')}};
  const api = async path => { const headers = new Headers(); headers.set('oai-authenticated-user-id', 'architect-a'); return worker.fetch(new Request('https://aiw.test' + path, {headers}), env); };
  assert.equal((await api('/api/project')).status, 200);
  const m = await api('/api/export?chapter=2&document=ars&format=md'); assert.equal(m.status, 200); assert.match(m.headers.get('Content-Disposition'), /attachment; filename=".*Architecture_Requirements_Specification\.md"/); assert.ok((await m.text()).startsWith('# ' + ARS_TITLE));
  const h = await api('/api/export?chapter=2&document=ars&format=html&view=1'); assert.equal(h.status, 200); assert.match(h.headers.get('Content-Type'), /text\/html/); assert.match(h.headers.get('Content-Disposition'), /^inline/); assert.ok((await h.text()).includes('QD-001'));
  const j = await api('/api/export?chapter=2&document=ars&format=json'); assert.equal(j.status, 200); assert.equal((await j.json()).document, 'architecture-requirements-specification');
  assert.equal((await api('/api/export?chapter=2&document=ars&format=docx')).status, 400);
  assert.equal((await api('/api/export?chapter=2&document=nothing')).status, 400);
  DB.close?.();
  pass('the export route serves the specification as Markdown, HTML (inline when viewed) and JSON, and refuses another format or an unknown document');
}

// 7. A blank project: the specification says what to record first, and nothing breaks.
const blank = withFinalReview(createProject({name: 'Blank', template: 'blank'}, 'blank-ars'));
const Ab = arsDocument(blank);
assert.ok(Ab.requirements.length >= 0 && Ab.categories.length === QUALITY_TYPES.length && typeof arsMarkdown(blank) === 'string' && arsGate(blank).text, 'a blank project reads without error');
pass('a blank project reads: the categories stand, the requirements are what Chapter 2 holds, and the gate says what is recorded');

assert.equal(JSON.stringify(project), before, 'reading the specification changes nothing');
pass('reading the specification, the gate and the links changes nothing in the project');

console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
