// Chapter 7 Model checks: the product stack, its slicing and layout, the options matrix, and how
// far each selection has gone. Run: npm run test:stack
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {technologyRealisationProposal, applyTechnologyRealisationCommand} from './public/technology-realisation-domain.js';
import {anatomyModel} from './public/anatomy-model.js';
import {exchangeModel} from './public/exchange-model.js';
import {platformModel} from './public/platform-model.js';
import {stackSource, stackModel, foldStack, stackScope, optionsFor, stackInsights, describeRealisation, OBLIGATIONS} from './public/stack-model.js';
import {stackLayout, optionsLayout, STACK_COLS} from './public/stack-layout.js';
import {syntheticSource} from './anatomy-fixtures.mjs';

const checks = [], pass = name => checks.push(name);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const S = stackSource(project);
const rec = id => S.R.get(id);

// 1. The adapter reads the realisations beneath the platform.
assert.equal(S.R.size, 9); assert.deepEqual(S.holes, [], 'every capability is realised');
assert.deepEqual([...S.R.values()].map(r => r.state), Array(9).fill('none'), 'no choice is made yet');
assert.deepEqual(['tr-001', 'tr-005', 'tr-006', 'tr-002', 'tr-007'].map(id => [rec(id).serves.length, rec(id).stops.length]), [[5, 5], [4, 5], [5, 5], [3, 3], [5, 0]], 'who depends on it, and what stops if it fails, from Chapter 6');
assert.deepEqual([rec('tr-002').criteria.length, rec('tr-002').criteria.filter(c => c.kind === 'driver').length], [10, 6], 'the quality drivers of the components that depend on it come first');
assert.equal(rec('tr-004').criteria.length, 4, 'nothing depends on read acceleration, so it carries no quality driver');
assert.ok([...S.R.values()].every(r => r.options.length === 2 && r.planned === 0));
assert.equal(JSON.stringify(project), before, 'the project is not changed');
pass('the adapter reads 9 realisations — each with the capability it realises, its two illustrative options, who depends on it and what stops if it fails, and the criteria it should be chosen by');

// 2. Selections progress; the model follows.
let q = structuredClone(project);
const run = (type, payload) => { q = applyTechnologyRealisationCommand(q, {type, payload}).document; };
run('techrealisation.preference', {id: 'tr-001', optionId: rec('tr-001').options[0].id});
run('techrealisation.preference', {id: 'tr-002', optionId: rec('tr-002').options[0].id});
q.technologyRealisation.records.find(r => r.id === 'tr-002').rationale = 'PostgreSQL gives the atomic unique-reference guarantee the ledger path needs.';
run('techrealisation.record', {id: 'tr-002', reviewed: true});
Object.assign(q.technologyRealisation.records.find(r => r.id === 'tr-003'), {resiliencePlan: 'Mirror queues across two nodes; replay only after reconciliation.', operationsPlan: 'Integration team runs it.'});
const Q = stackSource(q);
assert.deepEqual(['tr-001', 'tr-002', 'tr-003'].map(id => Q.R.get(id).state), ['preferred', 'recorded', 'none']);
assert.equal(Q.R.get('tr-003').planned, 2);
const qi = stackInsights(Q).map(i => i.text).join('\n');
assert.match(qi, /7 of 9 realisations have no choice yet\. Decide Identity and access decisions; Service connectivity first/);
assert.match(qi, /1 choice is a draft preference, not yet recorded with its rationale: TR-001/);
assert.match(qi, /TR-001 \(10 of 10 criteria\), TR-002 \(10 of 10 criteria\): the preferred option is not yet assessed/);
assert.match(qi, /Selection progress: 2 preferred, 1 recorded, 0 approved, of 9/);
const si = stackInsights(S).map(i => i.text).join('\n');
assert.match(si, /9 of 9 realisations have no choice yet\. Decide Application execution; Identity and access decisions; Service connectivity first: if any of them fails, all 5 components stop/);
assert.match(si, /No implementation obligation is written for any realisation yet/);
assert.match(si, /Transactional persistence; Durable work handoff; Recoverable state copies; Controlled service recovery carry durable state or recovery/);
assert.match(si, /No option has been assessed against any criterion yet/);
assert.match(describeRealisation(S, 'tr-005'), /realises TC-005 Service connectivity, which 4 components depend on; if it fails, 5 of 5 stop\. No option is preferred yet among 2\. 0 of 6/);
pass('a preference, a recorded selection and written obligations are read as they are recorded; the model asks to decide first the choices whose failure stops every component');

// 3. Slicing.
for (const S2 of [S, Q]) {
  const F = foldStack(S2, {kind: 'system'}, 'realisations'), FO = foldStack(S2, {kind: 'system'}, 'options');
  assert.equal(F.rows.filter(r => r.kind === 'realisation').length, 9);
  assert.equal(FO.rows.length, 9 + [...S2.R.values()].reduce((n, r) => n + r.options.length, 0), 'each realisation followed by its options');
  assert.deepEqual(F.rows.map(r => r.id).slice(0, 4), ['tr-001', 'tr-002', 'tr-008', 'tr-004'], 'rows keep Chapter 6\'s order: run, then keep state');
}
assert.deepEqual(foldStack(S, {kind: 'family', id: 'connect'}).rows.map(r => r.id), ['tr-005', 'tr-003']);
assert.deepEqual(stackScope(S, {kind: 'x', id: 'tr-006'}), {kind: 'family', id: 'trust', focus: 'tr-006'});
const h = structuredClone(project); h.technologyRealisation.mappings = h.technologyRealisation.mappings.filter(m => m.capabilityId !== 'tc-009');
const H = stackSource(h), FH = foldStack(H, {kind: 'system'});
assert.deepEqual(H.holes, ['tc-009']); assert.ok(FH.rows.some(r => r.id === 'HOLE:tc-009' && r.kind === 'hole'), 'an unrealised capability stands as a hole');
const miss = technologyRealisationProposal(h, 'missing'), FM = foldStack(H, {kind: 'system'}, 'realisations', {proposal: miss});
assert.ok(FM.rows.some(r => r.id === 'HOLE:tc-009' && r.kind === 'proposed'), 'and a proposed realisation takes its place');
pass('slicing shows every realisation once in Chapter 6\'s order, opens a family, lists every option in place, and shows an unrealised capability as a hole a proposal can fill');

// 4. Layout.
function checkStack(F, L, tag) {
  L.rows.forEach((r, i) => { if (i) assert.ok(r.y >= L.rows[i - 1].y + L.rows[i - 1].h - 0.01, tag + ': rows never overlap'); });
  for (const g of L.groups) assert.ok(!L.rows.some(r => r.y < g.y + g.h && g.y < r.y + r.h), tag + ': family bands have their own space');
  L.cols.forEach((c, i) => { if (i) assert.equal(c.x, L.cols[i - 1].x + L.cols[i - 1].w, tag + ': columns are contiguous'); });
  assert.equal(L.cells.length, L.rows.length * L.cols.length);
  for (const b of L.cells) { const r = L.rows.find(x => x.id === b.row), c = L.cols.find(x => x.id === b.col); assert.ok(b.x >= c.x && b.x + b.w <= c.x + c.w && b.y >= r.y && b.y + b.h <= r.y + r.h, tag + ': a cell stays in its row and column'); }
  assert.ok(L.x0 >= L.rail);
  assert.equal(JSON.stringify(stackLayout(F)), JSON.stringify(L), tag + ': layout is deterministic');
}
function checkOptions(G, L, tag) {
  L.rows.forEach((r, i) => { if (i) assert.ok(r.y >= L.rows[i - 1].y + L.rows[i - 1].h - 0.01); });
  L.cols.forEach((c, i) => { if (i) assert.ok(c.x >= L.cols[i - 1].x + L.cols[i - 1].w, tag + ': option columns never overlap'); });
  assert.equal(L.cells.length, G.rows.length * G.cols.length, tag + ': a judgement for every option and criterion');
  for (const c of L.cells) { const k = L.cols.find(x => x.id === c.col), r = L.rows.find(x => x.id === c.row); assert.ok(c.x >= k.x && c.x + c.w <= k.x + k.w && c.y >= r.y && c.y + c.h <= r.y + r.h); }
  for (const n of L.notes) assert.ok(n.y >= L.rows.at(-1).y + L.rows.at(-1).h, tag + ': benefits and limits follow the criteria');
  assert.equal(JSON.stringify(optionsLayout(G)), JSON.stringify(L));
}
let layouts = 0;
const props = [null, technologyRealisationProposal(project, 'recover', 'tr-002'), technologyRealisationProposal(project, 'operate', 'tr-001'), {recordId: 'tr-002', optionId: rec('tr-002').options[1].id}];
for (const S2 of [S, Q, H]) for (const sc of [{kind: 'system'}, {kind: 'family', id: 'state'}]) for (const depth of ['realisations', 'options']) for (const prop of props) { const F = foldStack(S2, sc, depth, {proposal: prop}); checkStack(F, stackLayout(F), `${sc.id || 'system'}:${depth}:${prop?.key || (prop ? 'preview' : '')}`); layouts++; }
for (const S2 of [S, Q]) for (const id of S2.R.keys()) for (const prop of [null, props[3]]) { const G = optionsFor(S2, id, {proposal: prop}); checkOptions(G, optionsLayout(G), 'options:' + id); layouts++; }
assert.equal(stackLayout.length, 1); assert.ok(!/\blens\b|structure|reasoning/.test(stackLayout.toString() + optionsLayout.toString()), 'neither layout reads the lens');
assert.deepEqual(STACK_COLS.filter(c => c.obligation).map(c => c.id), OBLIGATIONS.map(o => o.id), 'one column per obligation');
pass(`${layouts} stack and options layouts: rows, family bands and columns never collide, every cell stays in its row and column, every option meets every criterion, and neither layout reads the lens`);

// 5. Proposals and previews are drawn in place.
const FR = foldStack(S, {kind: 'system'}, 'realisations', {proposal: props[1]});
assert.deepEqual(FR.rows.find(r => r.id === 'tr-002').proposedPlans, ['data', 'resilience', 'interface'], 'the recovery proposal writes data, recovery and interface obligations');
const FP = foldStack(S, {kind: 'system'}, 'realisations', {proposal: props[3]}), GP = optionsFor(S, 'tr-002', {proposal: props[3]});
assert.equal(FP.rows.find(r => r.id === 'tr-002').preview, props[3].optionId); assert.ok(GP.cols.find(c => c.id === props[3].optionId).preview);
assert.equal(JSON.stringify(project), before);
pass('a recovery proposal marks the three obligations it would write, and an option preview stands in the choice column and its options column until dismissed');

// 6. Scale: a synthetic 160-component system on twelve capabilities, each with up to six options.
{
  const X = exchangeModel(anatomyModel(syntheticSource({modules: 40, comps: 4, caps: 12, seed: 5})));
  const cats = ['compute', 'transactional', 'messaging', 'caching', 'connectivity', 'identity', 'observability', 'backup', 'recovery'];
  const capabilities = Array.from({length: 12}, (_, i) => ({id: 'K' + i, ref: 'TC-' + i, category: cats[i % cats.length], title: 'Capability ' + i, failureDomain: 'D', continuity: 'single'}));
  const needs = [], mappings = [];
  X.M.comp.forEach((c, i) => { for (const k of [0, 1 + (i % 5), 6 + (i % 6)]) { const id = 'N' + i + '-' + k; needs.push({id, applicationId: c.id, category: capabilities[k].category, criticality: 'essential', description: 'need'}); mappings.push({id: 'M' + id, needId: id, capabilityId: 'K' + k}); } });
  const t0 = performance.now();
  const Pf = platformModel(X, {capabilities, needs, mappings});
  const records = capabilities.map((c, i) => ({id: 'R' + i, ref: 'TR-' + i, title: c.title + ' realisation', options: Array.from({length: 1 + (i % 6)}, (_, j) => ({id: 'O' + i + '-' + j, title: 'Option ' + j, product: j % 2 ? 'Product ' + j : '', operatingModel: 'Self managed', assessments: {}})), selectedOptionId: i % 3 ? 'O' + i + '-0' : null, operationsPlan: i % 2 ? 'plan' : ''}));
  const SS = stackModel(Pf, {records, mappings: records.slice(0, 11).map((r, i) => ({id: 'RM' + i, realizationId: r.id, capabilityId: 'K' + i})), extra: new Map(records.map(r => [r.id, {criteria: Array.from({length: 8}, (_, k) => ({id: 'C' + k, title: 'Criterion ' + k}))}]))});
  const F = foldStack(SS, {kind: 'system'}, 'options'), L = stackLayout(F), G = optionsFor(SS, 'R5'), LO = optionsLayout(G);
  const ms = performance.now() - t0;
  checkStack(F, L, 'synthetic'); checkOptions(G, LO, 'synthetic:R5');
  assert.deepEqual(SS.holes, ['K11']); assert.equal(G.cols.length, 6);
  assert.ok(ms < 2000, 'in ' + Math.round(ms) + ' ms');
  pass(`a synthetic stack of twelve realisations with up to six options each lays out ${F.rows.length} rows (${L.W} × ${L.H}) and a six-option comparison of eight criteria without a collision in ${Math.round(ms)} ms`);
}

console.log(JSON.stringify({suite: 'chapter 7 model (technology realisation)', passed: checks.length, checks, limits: ['Options are compared by recorded judgements with reasons and evidence; no score is calculated.', 'The synthetic stack is generated only for structure and scale.']}, null, 2));
