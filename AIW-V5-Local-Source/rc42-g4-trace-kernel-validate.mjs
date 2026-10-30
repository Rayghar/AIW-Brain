// AIW v0.10.0-rc.10.73.42, group G4 (D7, gap review 2026-10-30 §3; deep-dive traceability): one trace kernel. Every
// reader of a requirement's chain — the trail (review desk, matrix annex, change impact), the narrative and Model trace,
// the Matrix, the component specification and SDD §4, the driver scope, the ARS and the SDD journey line — reports the
// same records per layer for each requirement of the clinic-appointments and bank-payment reference projects, and the
// trail is the kernel's typed walk over the canonical design graph. Before the fix, clinic REQ-005's controls were
// SEC-004 and SEC-005 on the trail, SEC-005 in the narrative, none in the APP-005 specification and SDD §4, and none in
// the ARS for QD-005. Run: npm run test:rc42-g4-trace-kernel
import assert from 'node:assert/strict';
import {createProject, requirementImpact} from './shared/projects-domain.js';
import {withFinalReview, reviewTrace, reviewRequirements, traceStamp} from './public/review-domain.js';
import {traceFrom, matrixModel, TRACE_ORDER} from './public/model-matrix.js';
import {deskModel} from './public/desk-model.js';
import {traceabilityMatrix, MATRIX_LAYERS} from './public/sdd-annexes.js';
import {reasoningFor, componentSpec} from './public/design-spec.js';
import {driverScope} from './public/driver-scope.js';
import {arsDocument} from './public/ars-document.js';
import {architectureMarkdown} from './public/sdd-architecture.js';
import {architectureModel} from './public/architecture-model.js';
import {linksRequirement} from './public/requirement-links.js';

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

  // 7. The SDD journey line names the responsibilities on its steps' trails, and every responsibility a step's
  // requirement names.
  const journeyLine = md.split('\n').filter(l => /^- \*\*.*\*\*: \d+ steps? \(/.test(l));
  const steps = p.artefacts.filter(a => a.type === 'journey' && a.scopeMode !== 'out');
  for (const line of journeyLine) {
    // A run of consecutive references prints as one range (util.js refList: LR-001–LR-006).
    const expand = s => { const m = /^(.*?)(\d+)–\1(\d+)$/.exec(s); if (!m) return [s]; const out = []; for (let i = Number(m[2]); i <= Number(m[3]); i++) out.push(m[1] + String(i).padStart(m[2].length, '0')); return out; };
    const listed = [...line.matchAll(/\b(?:realised|served) by ([^;]+)/g)].flatMap(m => m[1].split(/, | and /)).map(s => s.trim()).filter(Boolean).flatMap(expand);
    const mine = steps.filter(s => line.startsWith('- **' + (String(s.journeyId || '').trim() || 'The journey') + '**: '));
    assert.ok(mine.length, `${name}: the journey line ${line.slice(0, 60)} has its steps`);
    const served = reqs.filter(r => trails.get(r.id).context.some(c => mine.some(s => s.id === c.id))).map(r => r.id);
    const onTrails = served.flatMap(id => trails.get(id).logical.map(refOf)), namedRefs = served.flatMap(id => trails.get(id).logical.filter(x => linksRequirement(p, x, id)).map(refOf));
    within(listed, onTrails, `${name}: the journey line's responsibilities`);
    for (const ref of namedRefs) assert.ok(listed.includes(ref), `${name}: the journey line names ${ref}, which a requirement of its steps names: ${line}`);
  }
  assert.ok(journeyLine.length > 0, name + ' prints its journeys');
  pass(`${name}: the SDD journey line names the responsibilities on its steps' trails`);

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
  assert.doesNotMatch(architectureMarkdown(clinic).markdown, /no responsibility serves or realises its steps yet/, 'the SDD journey line no longer says no responsibility serves the steps');
  const b = reviewTrace(bank, 'REQ-003');
  assert.ok(ids(b.logical).includes('api') && ids(b.contracts).includes('rest'), 'bank REQ-003: QD-001 names api, so api and its payment-initiation contract IF-001 are on the trail');
  assert.ok(ids(traceFrom(bank, 'audit').steps.find(s => s.types.includes('requirement')).records).includes('REQ-003'), 'bank SEC-002 leads back to REQ-003, whose trail holds it');
  pass('the gap review\'s case: clinic REQ-005\'s controls read SEC-004 and SEC-005 in the trail, narrative, APP-005 specification, SDD §4 and ARS; bank REQ-003 reaches api and IF-001, and SEC-002 leads back to it');
}

console.log(`rc42-g4-trace-kernel: ${checks.length} checks passed`);
