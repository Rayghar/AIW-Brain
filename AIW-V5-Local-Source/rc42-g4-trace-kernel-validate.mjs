// AIW v0.10.0-rc.10.73.42, group G4 (D7, gap review 2026-10-30 §3; deep-dive traceability): one trace kernel. Every
// reader of a requirement's chain — the trail (review desk, matrix annex, change impact), the narrative and Model trace,
// the Matrix, the component specification and SDD §4, the driver scope, the ARS and the SDD journey line — reports the
// same records per layer for each requirement of the clinic-appointments and bank-payment reference projects, and the
// trail is the kernel's typed walk over the canonical design graph. Before the fix, clinic REQ-005's controls were
// SEC-004 and SEC-005 on the trail, SEC-005 in the narrative, none in the APP-005 specification and SDD §4, and none in
// the ARS for QD-005. Review round 2: the chapters' sources (Chapters 8-10), the guided tasks and the review's coverage
// name exactly what the trails hold; the continuity checks (desk thread, end-to-end case) read the requirement's own
// chain (its spine) and never count what its drivers constrain or its decisions justify; only recorded records stand on
// a trail (the reference graph's illustrative nodes never do); the SDD journey line agrees with Chapter 4's process gaps;
// a Matrix chain cell never closes a gap. Run: npm run test:rc42-g4-trace-kernel
import assert from 'node:assert/strict';
import {createProject, requirementImpact} from './shared/projects-domain.js';
import {withFinalReview, reviewTrace, reviewRequirements, traceStamp} from './public/review-domain.js';
import {traceFrom, matrixModel, matrixHTML, TRACE_ORDER} from './public/model-matrix.js';
import {deskModel} from './public/desk-model.js';
import {traceabilityMatrix, MATRIX_LAYERS} from './public/sdd-annexes.js';
import {reasoningFor, componentSpec} from './public/design-spec.js';
import {driverScope} from './public/driver-scope.js';
import {arsDocument} from './public/ars-document.js';
import {architectureMarkdown} from './public/sdd-architecture.js';
import {architectureModel} from './public/architecture-model.js';
import {linksRequirement} from './public/requirement-links.js';
import {logicalFindings} from './public/logical-domain.js';
import {stepOfNode} from './public/model-scope.js';
import {interfaceSources} from './public/interfaces-domain.js';
import {securitySources} from './public/security-domain.js';
import {runtimeSources, plans as runtimePlans} from './public/runtime-domain.js';
import {applyExchangeTask} from './public/exchange-design.js';
import {applySecurityDesignTask} from './public/security-design.js';
import {applyArchitectureCaseCommand, caseContextBasis, evaluateArchitectureCase} from './public/architecture-case.js';
import {traceCoverage} from './public/review-domain.js';
import {recordTrace} from './public/trace-record.js';

let kernel = null, kernelError = '';
try { kernel = await import('./public/trace-kernel.js'); } catch (e) { kernelError = e.message; }
const checks = [], pass = n => { checks.push(n); console.log('PASS ' + n); };
const AT = '2026-10-30T09:00:00Z';
const ids = xs => (xs || []).map(x => x.id);
const sorted = xs => [...new Set(xs)].sort();
const same = (a, b, msg) => assert.deepEqual(sorted(a), sorted(b), msg);
const within = (a, b, msg) => { const B = new Set(b), out = [...new Set(a)].filter(x => !B.has(x)); assert.deepEqual(out, [], msg + ' (not on the trail: ' + out.join(', ') + ')'); };
const refOf = x => x.ref || x.code || x.id;
// The trail's layers as each reader names them.
const LAYERS = {drivers: 'driver', decisions: 'decision', logical: 'responsibility', applications: 'component', capabilities: 'capability', realizations: 'realization', contracts: 'contract', data: 'data', controls: 'control', runtime: 'plan', threats: 'threat', parties: 'party', paths: 'path', context: 'context'};
const STEP_KEYS = {quality: ['drivers'], decision: ['decisions'], responsibility: ['logical'], component: ['applications'], capability: ['capabilities'], technology: ['realizations'], contract: ['contracts'], data: ['data'], control: ['controls'], runtime: ['runtime']};

const projects = ['clinic-appointments', 'bank-payment'].map(t => [t, withFinalReview(createProject({name: t, template: t}, t, AT))]);

for (const [name, p] of projects) {
  const reqs = reviewRequirements(p), trails = new Map(reqs.map(r => [r.id, reviewTrace(p, r.id)]));
  const placementsOf = t => (p.runtime?.placements || []).filter(l => ids(t.runtime).includes(l.planId)).map(l => l.id);
  const union = (reqIds, key) => reqIds.flatMap(r => ids(trails.get(r)?.[key]));

  // 1. The review desk's thread and the matrix annex are the trail, layer for layer.
  const D = deskModel(p);
  for (const r of reqs) {
    const t = trails.get(r.id), row = D.trace.find(x => x.id === r.id);
    for (const k of ['drivers', 'decisions', 'logical', 'applications', 'capabilities', 'contracts', 'controls']) same(ids(row.cells[k]), ids(t[k]), `${name} ${r.id}: the desk's ${k} are the trail's`);
    if (t.realizations.length) same(ids(row.cells.platform), ids(t.realizations), `${name} ${r.id}: the desk's products are the trail's realisations`);
    same(ids(row.cells.runtime), ids(t.runtime.filter(x => !D.env || x.environmentId === D.env)), `${name} ${r.id}: the desk's running parts are the trail's`);
  }
  const annex = traceabilityMatrix(p);
  for (const r of reqs) {
    const t = trails.get(r.id), row = annex.find(x => x.id === r.id);
    for (const [k] of MATRIX_LAYERS) same([...row.layers[k].named, ...row.layers[k].through], (t[k] || []).map(refOf), `${name} ${r.id}: the annex's ${k} are the trail's`);
    for (const x of t.logical) assert.equal(row.layers.logical.named.includes(refOf(x)), linksRequirement(p, x, r.id), `${name} ${r.id}: ${refOf(x)} is named only when it names the requirement`);
  }
  pass(`${name}: the review desk's thread and the matrix annex report the trail's records per layer`);

  // 2. Change impact routes a requirement's change to the records on its trail.
  for (const r of reqs) {
    const after = structuredClone(p); after.artefacts.find(a => a.id === r.id).title += ' (revised)';
    const I = requirementImpact(p, after, AT, r.id, [r.id]), t = trails.get(r.id), of = ch => ids(I.groups.find(g => g.chapter === ch)?.objects);
    for (const [ch, keys] of [[2, ['drivers']], [3, ['decisions']], [4, ['logical']], [5, ['applications']], [6, ['capabilities']], [7, ['realizations']], [8, ['contracts', 'data']], [9, ['controls']], [10, ['runtime']]]) same(of(ch), keys.flatMap(k => ids(t[k])), `${name} ${r.id}: change impact opens Chapter ${ch} on the trail's records`);
  }
  pass(`${name}: change impact names the trail's records, chapter by chapter`);

  // 3. The narrative and the Model trace (traceFrom) read the same chain, step for step; the Matrix shows every record
  // on it, and what protects and threatens a requirement in the Matrix is what its trail says.
  for (const r of reqs) {
    const t = trails.get(r.id), T = traceFrom(p, r.id);
    assert.equal(T.steps.length, TRACE_ORDER.length);
    for (const st of T.steps) {
      if (st.types.includes('requirement')) { assert.deepEqual(ids(st.records), [r.id]); continue; }
      const want = st.types.includes('instance') ? placementsOf(t) : st.types.flatMap(type => STEP_KEYS[type].flatMap(k => ids(t[k])));
      same(ids(st.records), want, `${name} ${r.id}: the narrative's ${st.word} step is the trail's`);
    }
    for (const [k, type] of [['controls', 'control'], ['threats', 'threat']]) {
      const X = matrixModel(p, {rows: 'requirement', cols: type});
      same(X.cols.filter(c => X.cells.has(r.id + '|' + c.id)).map(c => c.id), ids(t[k]), `${name} ${r.id}: the Matrix's ${type}s for the requirement are the trail's`);
    }
    for (const [k, type] of [['decisions', 'decision'], ['logical', 'responsibility'], ['applications', 'component'], ['capabilities', 'capability'], ['realizations', 'technology'], ['contracts', 'contract'], ['data', 'data'], ['runtime', 'runtime']]) {
      const X = matrixModel(p, {rows: 'requirement', cols: type});
      for (const x of t[k]) assert.ok(X.cells.has(r.id + '|' + x.id), `${name} ${r.id}: ${refOf(x)} is on the trail and has a Matrix cell`);
      for (const [key, cell] of X.cells) if (key.startsWith(r.id + '|') && cell.kind === 'chain') assert.ok(ids(t[k]).includes(key.slice(r.id.length + 1)), `${name} ${r.id}: a Matrix chain through the design ends on the trail (${key})`);
    }
  }
  pass(`${name}: the narrative, the Model trace and the Matrix report the trail's records per layer`);

  // 4. Backwards: the requirements a record's Model trace leads back to are those whose trail holds it.
  const holders = new Map();
  for (const r of reqs) for (const k of Object.values(STEP_KEYS).flat()) for (const x of trails.get(r.id)[k]) { if (!holders.has(x.id)) holders.set(x.id, new Set()); holders.get(x.id).add(r.id); }
  const inScope = new Set(reqs.map(r => r.id));
  for (const [id, rs] of holders) {
    const T = traceFrom(p, id), st = T.steps.find(s => s.types.includes('requirement'));
    same(ids(st.records).filter(x => inScope.has(x)), [...rs], `${name}: ${id} leads back to the requirements whose trail holds it`);
  }
  pass(`${name}: every record on a trail leads back, in the Model trace, to exactly the requirements whose trail holds it`);

  // 5. The component specification and SDD §4 read the protection the trail reads: each component's controls and
  // threats are on the trail of every requirement whose trail holds the component, and together they are the trail's.
  const R = reasoningFor(p), md = architectureMarkdown(p).markdown;
  const partOf = c => { const lines = md.split('\n'), at = lines.findIndex(l => l.startsWith('### ' + (c.ref || c.id) + ' · ')); if (at < 0) return ''; const end = lines.findIndex((l, i) => i > at && /^#{1,3} /.test(l)); return lines.slice(at, end < 0 ? undefined : end).join('\n'); };
  for (const r of reqs) {
    const t = trails.get(r.id), specs = t.applications.map(c => componentSpec(R, c.id));
    for (const S of specs) { within(ids(S.controls), ids(t.controls), `${name} ${r.id}: ${S.ref}'s specified controls`); within(ids(S.threats), ids(t.threats), `${name} ${r.id}: ${S.ref}'s specified threats`); }
    same(specs.flatMap(S => ids(S.controls)), ids(t.controls), `${name} ${r.id}: the specifications of the trail's components name the trail's controls`);
    same(specs.flatMap(S => ids(S.threats)), ids(t.threats), `${name} ${r.id}: the specifications of the trail's components name the trail's threats`);
    for (const S of specs) { const part = partOf(S.component), line = part.split('\n').find(l => l.startsWith('Protection: ')) || ''; for (const k of S.controls) assert.ok(line.includes(refOf(k)), `${name}: SDD §4 ${S.ref} names ${refOf(k)} under Protection: ${line || '(no Protection line)'}`); }
  }
  pass(`${name}: the component specifications and SDD §4 name the trail's controls and threats`);

  // 6. The driver scope and the ARS stay on the trails of the requirements a driver serves; a driver that alone
  // carries a requirement it alone serves reports exactly that requirement's trail.
  const A = arsDocument(p).requirements;
  for (const r of reqs) for (const d of trails.get(r.id).drivers) {
    const S = driverScope(p, d.id), served = S.requirementIds.filter(x => inScope.has(x));
    within(S.responsibilityIds, union(served, 'logical'), `${name} ${d.id}: the driver scope's responsibilities`);
    within(S.componentIds, union(served, 'applications'), `${name} ${d.id}: the driver scope's components`);
    const row = A.find(x => x.id === d.id); if (!row) continue;
    for (const [k, key] of [['responsibilities', 'logical'], ['components', 'applications'], ['decisions', 'decisions'], ['controls', 'controls'], ['plans', 'runtime']]) within(ids(row.trace[k]), union(served, key), `${name} ${d.id}: the ARS's ${k}`);
    if (served.length === 1 && served[0] === r.id && trails.get(r.id).drivers.length === 1) for (const [k, key] of [['responsibilities', 'logical'], ['components', 'applications'], ['decisions', 'decisions'], ['controls', 'controls'], ['plans', 'runtime']]) same(ids(row.trace[k]), ids(trails.get(r.id)[key]), `${name} ${d.id}: the ARS's ${k} are ${r.id}'s trail's`);
  }
  pass(`${name}: the driver scope and the ARS report the records on the trails of the requirements each driver serves`);

  // 7. The SDD journey line says "served or realised by" only for the responsibilities a Chapter 4 connection draws to its
  // steps (the kernel's step hops, source logical.connections), so it agrees with Chapter 4's process-gap findings: a
  // journey whose every step has a process gap prints "no responsibility serves or realises its steps yet". The
  // responsibilities its steps' requirements name are listed apart, in a clause of their own ("assigned to").
  const journeyLine = md.split('\n').filter(l => /^- \*\*.*\*\*: \d+ steps? \(/.test(l));
  const steps = p.artefacts.filter(a => a.type === 'journey' && a.scopeMode !== 'out');
  const gapSteps = new Set(logicalFindings(p).filter(f => f.code === 'process-gap').map(f => stepOfNode(p, f.objectId)));
  // A run of consecutive references prints as one range (util.js refList: LR-001–LR-006).
  const expand = s => { const m = /^(.*?)(\d+)–\1(\d+)$/.exec(s); if (!m) return [s]; const out = []; for (let i = Number(m[2]); i <= Number(m[3]); i++) out.push(m[1] + String(i).padStart(m[2].length, '0')); return out; };
  const refsIn = (line, re) => [...line.matchAll(re)].flatMap(m => m[1].split(/, | and /)).map(s => s.trim()).filter(Boolean).flatMap(expand);
  for (const line of journeyLine) {
    const listed = refsIn(line, /\b(?:realised|served) by ([^;]+)/g), assigned = refsIn(line, /\bassigned to ([^;]+)/g);
    const mine = steps.filter(s => line.startsWith('- **' + (String(s.journeyId || '').trim() || 'The journey') + '**: '));
    assert.ok(mine.length, `${name}: the journey line ${line.slice(0, 60)} has its steps`);
    const connected = [...new Set(mine.flatMap(s => { const T = recordTrace(p, s.id); return T.layers.responsibility.filter(r => (T.hops.get(r) || []).some(h => h.source === 'logical.connections' && h.from === s.id)); }))].map(id => refOf(p.logical.responsibilities.find(x => x.id === id)));
    same(listed, connected, `${name}: the journey line's served and realised responsibilities are those Chapter 4 connects to its steps: ${line}`);
    const open = mine.filter(s => !gapSteps.has(s.id));
    assert.equal(listed.length > 0, open.length > 0, `${name}: the journey line agrees with Chapter 4's process gaps (${open.length} of ${mine.length} steps connected): ${line}`);
    assert.equal(/no responsibility serves or realises its steps yet/.test(line), open.length === 0, `${name}: "no responsibility serves or realises its steps yet" exactly when Chapter 4 finds every step a process gap: ${line}`);
    const asked = reqs.filter(r => trails.get(r.id).context.some(c => mine.some(s => s.id === c.id))).map(r => r.id);
    const namedRefs = [...new Set(asked.flatMap(id => trails.get(id).logical.filter(x => linksRequirement(p, x, id)).map(refOf)))];
    same([...listed, ...assigned], [...new Set([...connected, ...namedRefs])], `${name}: the journey line lists the responsibilities its steps' requirements name, apart from those serving its steps: ${line}`);
    for (const ref of assigned) assert.ok(!listed.includes(ref), `${name}: ${ref} is listed once`);
  }
  assert.ok(journeyLine.length > 0, name + ' prints its journeys');
  pass(`${name}: the SDD journey line names as serving its steps only what Chapter 4 connects to them, in agreement with its process gaps`);

  // 7b. The chapters' sources (Chapters 8, 9 and 10: interface, security and runtime sources) name, for every contract,
  // data definition, control, threat and operating plan, exactly the requirements whose trail holds it.
  const holdersOf = new Map();
  for (const r of reqs) for (const k of ['contracts', 'data', 'controls', 'threats', 'runtime']) for (const x of trails.get(r.id)[k]) { if (!holdersOf.has(x.id)) holdersOf.set(x.id, []); holdersOf.get(x.id).push(r.id); }
  const sourceRows = [...p.interfaces.contracts.map(c => ['contract', c, interfaceSources(p, c)]), ...p.interfaces.data.map(d => ['data definition', d, interfaceSources(p, d)]), ...p.security.controls.map(c => ['control', c, securitySources(p, c)]), ...p.security.threats.map(t => ['threat', t, securitySources(p, t)]), ...runtimePlans(p).map(r => ['plan', r, runtimeSources(p, r)])];
  for (const [kind, x, s] of sourceRows) assert.deepEqual(ids(s.requirements).filter(id => inScope.has(id)), holdersOf.get(x.id) || [], `${name}: the ${kind} ${refOf(x)}'s chapter sources name the requirements whose trail holds it`);
  for (const r of reqs) for (const c of trails.get(r.id).contracts) assert.doesNotThrow(() => applyExchangeTask(p, {type: 'exchange.start', payload: {contractId: c.id, requirementId: r.id}}, AT), `${name}: an exchange task starts on ${refOf(c)} for ${r.id}, whose trail holds it`);
  for (const r of reqs) for (const t of trails.get(r.id).threats) assert.doesNotThrow(() => applySecurityDesignTask(p, {type: 'protection.start', payload: {threatId: t.id, requirementId: r.id}}, AT), `${name}: a protection task starts on ${refOf(t)} for ${r.id}, whose trail holds it`);
  for (const c of p.interfaces.contracts) for (const r of reqs.filter(r => !(holdersOf.get(c.id) || []).includes(r.id))) assert.throws(() => applyExchangeTask(p, {type: 'exchange.start', payload: {contractId: c.id, requirementId: r.id}}, AT), /Choose a requirement traced/, `${name}: no exchange task on ${refOf(c)} for ${r.id}, whose trail does not hold it`);
  pass(`${name}: every contract, data definition, control, threat and plan names in its chapter's sources exactly the requirements whose trail holds it, and the guided tasks accept those requirements`);

  // 7c. The review's coverage reads the trails: a requirement is traced to a layer when its trail holds a record of that
  // layer that names it (a fulfils hop), to components when its own chain (its spine) reaches one, and inherits
  // products and runtime through the components on that chain.
  const C = Object.fromEntries(traceCoverage(p).layers.map(l => [l.key, l]));
  const S = new Map(reqs.map(r => [r.id, kernel.requirementSpine(p, r.id)]));
  const namesOn = (r, ...layers) => layers.some(l => S.get(r.id).layers[l].some(x => (S.get(r.id).hops.get(x) || []).some(h => h.type === 'fulfils' && h.from === r.id)));
  const by = (...ts) => (r, l) => S.get(r.id).layers[l].some(x => (S.get(r.id).hops.get(x) || []).some(h => ts.includes(h.type)));
  const direct = {logical: reqs.filter(r => namesOn(r, 'responsibility')), applications: reqs.filter(r => S.get(r.id).layers.component.length), realizations: reqs.filter(r => namesOn(r, 'realization', 'capability')), runtime: reqs.filter(r => namesOn(r, 'plan', 'path'))};
  assert.deepEqual(Object.fromEntries(Object.entries(C).map(([k, l]) => [k, l.direct])), Object.fromEntries(Object.entries(direct).map(([k, xs]) => [k, xs.length])), `${name}: coverage counts the requirements whose trail holds a record of the layer that names them`);
  assert.equal(C.realizations.inherited, reqs.filter(r => !direct.realizations.includes(r) && by('implementedBy')(r, 'realization')).length, `${name}: products inherited through the chain's components`);
  assert.equal(C.runtime.inherited, reqs.filter(r => !direct.runtime.includes(r) && by('operatedAs')(r, 'plan')).length, `${name}: runtime inherited through the chain's components and products`);
  pass(`${name}: the review's coverage counts what the trails hold`);

  // 8. The kernel: the trail is its typed walk over the canonical design graph.
  assert.ok(kernel, 'the trace kernel exists (public/trace-kernel.js): ' + kernelError);
  const M = architectureModel(p), rel = new Map(M.relationships.map(e => [e.id, e]));
  for (const r of reqs) {
    const K = kernel.requirementTrace(p, r.id), t = trails.get(r.id);
    for (const [k, layer] of Object.entries(LAYERS)) assert.deepEqual(K.layers[layer], ids(t[k]), `${name} ${r.id}: the trail's ${k} are the kernel's ${layer} layer, in register order`);
    assert.deepEqual(K.layers.zone, t.zoneIds, `${name} ${r.id}: the trail's zones are the kernel's`);
    for (const id of K.ids) {
      if (id === r.id) continue;
      const hops = K.hops.get(id) || [];
      assert.ok(hops.length > 0, `${name} ${r.id}: ${id} is linked by a hop`);
      for (const h of hops) {
        const e = rel.get(h.relation);
        assert.ok(e && e.type === h.type && [e.from, e.to].includes(id) || h.source === 'logical.connections', `${name} ${r.id}: ${id}'s hop is a typed relation of the canonical graph (${h.relation})`);
        assert.ok(K.has(h.from) && kernel.TRACE_LAYERS.indexOf(K.layerOf(h.from)) < kernel.TRACE_LAYERS.indexOf(K.layerOf(id)), `${name} ${r.id}: ${id}'s hop comes from an earlier layer of the trail`);
      }
    }
    assert.ok(traceStamp(p, r.id), 'the trail has a stamp');
  }
  pass(`${name}: the trail is the kernel's walk, each record linked by a typed relation of the canonical graph from an earlier layer`);
}

// 9. The defect as the gap review found it, now one answer (clinic REQ-005; bank REQ-003).
{
  const [, clinic] = projects[0], [, bank] = projects[1], R = reasoningFor(clinic);
  const t = reviewTrace(clinic, 'REQ-005');
  assert.deepEqual(ids(t.controls), ['sec-004', 'sec-005'], 'clinic REQ-005: the trail protects with SEC-004 and SEC-005');
  assert.deepEqual(ids(traceFrom(clinic, 'REQ-005').steps.find(s => s.types.includes('control')).records), ['sec-004', 'sec-005'], 'the narrative says the same');
  assert.deepEqual(ids(componentSpec(R, 'obj-005').controls), ['sec-004', 'sec-005'], 'the APP-005 specification says the same');
  assert.deepEqual(ids(arsDocument(clinic).requirements.find(x => x.id === 'QD-005').trace.controls), ['sec-004', 'sec-005'], 'the ARS for QD-005 says the same');
  assert.match(architectureMarkdown(clinic).markdown, /### APP-005 · [^\n]*\n[\s\S]*?\nProtection: controls SEC-004 [^\n]*SEC-005/, 'SDD §4 names both under APP-005');
  assert.match(architectureMarkdown(clinic).markdown, /\n- \*\*The journey\*\*: 5 steps \(JRN-001–JRN-005\), [^;\n]+; no responsibility serves or realises its steps yet; its steps' requirements are assigned to LR-001–LR-006\n/, 'clinic: no Chapter 4 connection serves the steps (as its five process gaps say); the responsibilities their requirements name are listed apart');
  const b = reviewTrace(bank, 'REQ-003');
  assert.ok(ids(b.logical).includes('api') && ids(b.contracts).includes('rest'), 'bank REQ-003: QD-001 names api, so api and its payment-initiation contract IF-001 are on the trail');
  assert.ok(ids(traceFrom(bank, 'audit').steps.find(s => s.types.includes('requirement')).records).includes('REQ-003'), 'bank SEC-002 leads back to REQ-003, whose trail holds it');
  pass('the gap review\'s case: clinic REQ-005\'s controls read SEC-004 and SEC-005 in the trail, narrative, APP-005 specification, SDD §4 and ARS; bank REQ-003 reaches api and IF-001, and SEC-002 leads back to it');
}

// 10. The requirement's own chain (its spine) carries the governance checks; what its drivers constrain and its decisions
// justify stays on the trail as context and never closes a gap. Bank, with api's own mapping removed: REQ-001's fulfilling
// responsibility (api) is realised by no component, so the desk thread breaks at components and the end-to-end case's
// continuous trail is not done, with its trace blocker, though the trail still lists the components of the
// responsibilities its drivers and decisions bear on.
{
  const at = '2026-10-11T09:00:00.000Z', base = () => createProject({name: 'Synthetic payment trail', template: 'bank-payment'}, 'journey-fixture', at);
  const save = q => applyArchitectureCaseCommand(q, {type: 'case.save', payload: {title: 'Payment handoff', purpose: 'Trace a recorded payment design and its evidence.', mode: 'end-to-end', requirementIds: ['REQ-001'], basis: caseContextBasis(q)}}, at, 'first-architect').document;
  const journey = q => { const r = evaluateArchitectureCase(save(q), {caseId: 'AC-001'}); return {done: r.journey.checks.find(x => x.key === 'continuous-trail').done, blocked: r.blockers.some(x => /Trace one requirement through design and runtime/.test(x))}; };
  assert.deepEqual(journey(base()), {done: true, blocked: false}, 'the bank reference traces REQ-001 through design and runtime');
  assert.ok(deskModel(base()).trace.every(t => !t.firstBreak), 'every bank thread reaches where it runs');
  const unmapped = base(); unmapped.logical.mappings = unmapped.logical.mappings.filter(m => m.logicalId !== 'api');
  assert.equal(deskModel(unmapped).trace.find(x => x.id === 'REQ-001').firstBreak?.id, 'applications', 'with no component on its own chain, the thread breaks at components');
  assert.deepEqual(journey(unmapped), {done: false, blocked: true}, 'the case\'s continuous trail is not done, and its trace blocker stands');
  const t = reviewTrace(unmapped, 'REQ-001'), K = kernel.requirementSpine(unmapped, 'REQ-001');
  assert.ok(t.applications.length > 0, 'the trail keeps the components its drivers and decisions bear on, as context');
  assert.deepEqual(K.layers.component, [], 'REQ-001\'s own chain reaches no component');
  assert.deepEqual(ids(t.spine.applications), [], 'the trail\'s spine reaches no component');
  for (const [k, layer] of Object.entries(LAYERS)) { if (!t.spine[k]) continue; assert.deepEqual(ids(t.spine[k]), K.layers[layer], `the trail's spine ${k} are the kernel's spine`); within(ids(t.spine[k]), ids(t[k]), `the spine's ${k} are on the trail`); }
  for (const id of K.ids) for (const h of K.hops.get(id) || []) assert.ok(!['constrains', 'justifies'].includes(h.type) || !['responsibility', 'component'].includes(K.layerOf(id)), `${id} is on the spine by its own chain, not by ${h.type}`);
  const none = base(); none.realisation.components = [];
  assert.deepEqual(journey(none), {done: false, blocked: true}, 'with no component recorded, the case\'s continuous trail is not done');
  pass('the spine: REQ-001 with api unmapped breaks at components on the desk and blocks the case\'s continuous trail; constrained and justified records stay on the trail as context only');
}

// 11. Only recorded design joins a trail: the reference graph's illustrative nodes (record-graph.js, 'model.context.*')
// stay in the graph to resolve relations but never stand on a layer. Deleting a component, a data definition or a contract
// removes it from every reader's layers; with no component recorded the desk breaks at components.
{
  const [, bank] = projects[1];
  for (const [what, id, ref, drop] of [['component', 'api-pod', 'APP-001', q => { q.realisation.components = q.realisation.components.filter(c => c.id !== 'api-pod'); }], ['data definition', 'instruction', 'DAT-001', q => { q.interfaces.data = q.interfaces.data.filter(d => d.id !== 'instruction'); }], ['contract', 'rest', 'IF-001', q => { q.interfaces.contracts = q.interfaces.contracts.filter(c => c.id !== 'rest'); }]]) {
    const q = structuredClone(bank); drop(q);
    const reqs = reviewRequirements(q), D = deskModel(q), annex = traceabilityMatrix(q);
    for (const r of reqs) {
      const K = kernel.requirementTrace(q, r.id), t = reviewTrace(q, r.id);
      assert.ok(!K.has(id), `${what} ${id} deleted: not on ${r.id}'s kernel trail`);
      for (const k of K.ids) assert.ok(!String(K.record(k)?.source).startsWith('model.context.'), `${r.id}: ${k} on the trail is a recorded record (source ${K.record(k)?.source})`);
      for (const k of [...Object.keys(LAYERS), 'needs']) assert.ok(!ids(t[k]).includes(id), `${what} ${id} deleted: not in ${r.id}'s trail ${k}`);
      assert.ok(!t.nodeIds.includes(id), `${what} ${id} deleted: not among ${r.id}'s trail nodes`);
      const row = D.trace.find(x => x.id === r.id); for (const [k, xs] of Object.entries(row.cells)) assert.ok(!ids(xs).includes(id), `${what} ${id} deleted: not in ${r.id}'s desk ${k}`);
      const a = annex.find(x => x.id === r.id); for (const [k] of MATRIX_LAYERS) assert.ok(![...a.layers[k].named, ...a.layers[k].through].some(x => x === id || x === ref), `${what} ${id} deleted: not in ${r.id}'s annex ${k}`);
      for (const st of traceFrom(q, r.id).steps) assert.ok(!ids(st.records).includes(id), `${what} ${id} deleted: not in ${r.id}'s narrative ${st.word} step`);
      const after = structuredClone(q); after.artefacts.find(x => x.id === r.id).title += ' (revised)';
      for (const g of requirementImpact(q, after, AT, r.id, [r.id]).groups) assert.ok(!ids(g.objects).includes(id), `${what} ${id} deleted: change impact does not open it for ${r.id}`);
    }
  }
  const empty = structuredClone(bank); empty.realisation.components = [];
  const D = deskModel(empty);
  for (const r of reviewRequirements(empty)) { assert.deepEqual(ids(reviewTrace(empty, r.id).applications), [], `${r.id}: no component on the trail once none is recorded`); assert.equal(D.trace.find(x => x.id === r.id).firstBreak?.id, 'applications', `${r.id}: the desk thread breaks at components`); }
  pass('only recorded records stand on a trail: a deleted component, data definition or contract leaves every reader\'s layers, and with no component recorded every thread breaks at components');
}

// 12. The review's coverage agrees with the trail where a plan that names a requirement is out of scope (its asset is no
// longer in its environment): the trail holds no such plan, so the requirement is not traced to runtime.
{
  const [, bank] = projects[1], plan = bank.runtime.plans.find(r => r.id === 'run-001');
  const named = structuredClone(bank); named.runtime.plans.find(r => r.id === plan.id).requirementIds = ['REQ-002'];
  assert.ok(ids(reviewTrace(named, 'REQ-002').runtime).includes(plan.id), 'REQ-002\'s trail holds the plan that names it');
  assert.equal(traceCoverage(named).layers.find(l => l.key === 'runtime').direct, 1, 'one requirement traced to runtime through a plan that names it');
  const out = structuredClone(named), env = out.runtime.environments.find(e => e.id === plan.environmentId); env.assetIds = env.assetIds.filter(a => a !== plan.assetId);
  assert.ok(!ids(reviewTrace(out, 'REQ-002').runtime).includes(plan.id), 'out of scope, the plan is not on REQ-002\'s trail');
  assert.equal(traceCoverage(out).layers.find(l => l.key === 'runtime').direct, 0, 'and coverage does not count REQ-002 as traced to runtime');
  assert.deepEqual(ids(runtimeSources(out, out.runtime.plans.find(r => r.id === plan.id)).requirements), [], 'nor does the plan\'s chapter source name it');
  pass('coverage and the chapter sources agree with the trail when a plan that names a requirement falls out of scope');
}

// 13. The Matrix: a chain cell stands for a pair on the row's trace even where other pairs of the two sets meet directly
// or through one record, but a gap is read on the nearest kind the sets share (the basis), so there a chain cell alone
// never closes one; the caption says so.
{
  const TYPES = ['requirement', 'quality', 'decision', 'responsibility', 'component', 'capability', 'technology', 'contract', 'data', 'control', 'threat', 'runtime', 'journey'];
  let seen = 0, direct = 0;
  for (const [name, p] of projects) for (const rows of TYPES) for (const cols of TYPES) {
    if (rows === cols) continue;
    const X = matrixModel(p, {rows, cols});
    if (!X || !X.counts.chain || X.basis === 'chain') continue;
    seen++; if (X.basis === 'direct') direct++;
    const hit = (r, c) => X.cells.get(r + '|' + c)?.kind === X.basis;
    assert.deepEqual([...X.emptyRows].sort(), X.rows.filter(r => !X.cols.some(c => hit(r.id, c.id))).map(r => r.id).sort(), `${name} ${rows} × ${cols}: a row is a gap when no ${X.basis} cell meets it, whatever its chain cells`);
    assert.deepEqual([...X.emptyCols].sort(), X.cols.filter(c => !X.rows.some(r => hit(r.id, c.id))).map(c => c.id).sort(), `${name} ${rows} × ${cols}: a column likewise`);
    assert.match(matrixHTML(X, {chapter: 11}), /a dotted mark a longer chain through the design; an empty row or column is a gap, and a dotted mark alone does not close one\.<\/caption>/, `${name} ${rows} × ${cols}: the caption says a chain cell does not close a gap`);
  }
  assert.ok(direct > 0, 'a direct-basis matrix with chain cells is checked');
  pass(`the Matrix: in ${seen} matrices with chain cells beside closer ones (${direct} direct), gaps are read on the closer kind alone, and the caption says so`);
}

console.log(`rc42-g4-trace-kernel: ${checks.length} checks passed`);
