// The scale gate (round 5, R5-G). A project of 500 records in each of Chapters 1–10, built through the chapters' own
// command appliers (scripts/build-scale-fixture.mjs), checked four ways:
//   1. the bounds: every capped collection holds exactly its 500 and refuses the next record with "This workspace
//      keeps up to 500 …"; the document's size against the import route's limit;
//   2. the storage: the document is restored through /api/recovery, read back, and saved through /api/commands on a
//      local database, the way the workbench stores it;
//   3. identical results: what the memoised paths (document-memo.js: indexes per settled document or pass) compute
//      equals what the same functions compute with every cache switched off, on the reference project, the three
//      reference journeys, a blank project and the 500-record project itself;
//   4. the budget, measured in Node on the 500-record document as the browser holds it (settled, every cache cold):
//      each chapter's checks under 300 ms (Chapter 11's too), the readiness board (all eleven chapterChecks) under
//      500 ms (the restored project's board and a board with a review intake recorded are reported beside it), the SDD
//      under 2 s, the connected model under 500 ms, the Chapter 4 and 5 diagrams laid out under 1.5 s
//      (the Chapter 5 tree's crowded ranks stand as grids, and above STRAIGHT_EDGES connectors every one is drawn
//      straight: notation-layout.js).
// A measurement is the best of up to three cold runs, so a machine busy with other suites does not decide it. Every
// bound is asserted (round 5, phase 2: the budgets measured over in phase 1 were brought within them); --strict is
// kept for the release scripts that pass it and changes nothing. The SDD export route on the restored project (with
// its figures, every scene drawn at 500 records) is timed and reported, not bounded.
// The fixture takes about half a minute to build; it is kept in .aiw-local/scale-fixture/ under a hash of every source
// file that shapes it, so it is rebuilt exactly when one of them changes (--rebuild rebuilds it anyway).
// Run: npm run test:scale [-- --rebuild]
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync} from 'node:fs';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {buildScaleProject, scaleCounts} from './scripts/build-scale-fixture.mjs';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {createProject} from './shared/projects-domain.js';
import {settleDocument, unmemoised, documentClone} from './public/document-memo.js';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview, CHAPTERS, finalFindings, finalMilestones, chapterSummaries, inheritedFindings, reviewTrace, assembleSDD} from './public/review-domain.js';
import {sddBoard, sddReadiness, chapterChecks} from './public/readiness-model.js';
import {logicalGraph, applyLogicalCommand, LOGICAL_LIMITS} from './public/logical-domain.js';
import {applyQualityCommand, QUALITY_LIMITS} from './public/quality-domain.js';
import {applyDecisionCommand, DECISION_LIMITS} from './public/decisions-domain.js';
import {applyRealisationCommand, REALISATION_LIMITS} from './public/realisation-domain.js';
import {applyTechnologyCommand, TECHNOLOGY_LIMITS} from './public/technology-domain.js';
import {applyTechnologyRealisationCommand, REALIZATION_LIMITS} from './public/technology-realisation-domain.js';
import {applyInterfacesCommand, INTERFACE_LIMITS} from './public/interfaces-domain.js';
import {applySecurityCommand, SECURITY_LIMITS} from './public/security-domain.js';
import {applyRuntimeCommand, RUNTIME_LIMITS} from './public/runtime-domain.js';
import {architectureModel} from './public/architecture-model.js';
import {notationDiagram} from './public/notation-model.js';
import {notationLayout, STRAIGHT_EDGES} from './public/notation-layout.js';
import {reasoningSource, driverChain} from './public/design-reasoning.js';
import {detectAntiPatterns} from './public/design-spec.js';
import {capacityObjective, capacityPlan} from './public/desk-capacity.js';
import {choiceForDesign} from './public/product-choice.js';
import {rankedFindings} from './public/chapter-brief.js';
import {exchangeSource} from './public/exchange-model.js';
import {memoPass} from './public/document-memo.js';
import {contentOf} from './public/source-fingerprint.js';
import {anatomySource, anatomyModel} from './public/anatomy-model.js';
import {anatomyLayout} from './public/anatomy-layout.js';

const PER = 500, at = '2026-10-02T12:00:00.000Z';
const BUDGET = {findings: 300, board: 500, sdd: 2000, model: 500, layout: 1500}; // ms, Node, one cold run on a settled document
// The readings' stripping pass per chapter on the next revision of a document (round 12, GR-TST-07), in ms.
const STRIP_BUDGET = 5;
const RECOVERY_LIMIT = 12 * 1024 * 1024; // the /api/recovery body the workbench reads (recovery-service.js MAX)
const checks = [], timings = {};
const began = Date.now(), pass = name => { checks.push(name); console.log('PASS', name, '(' + Math.round((Date.now() - began) / 1000) + ' s)'); };

// ---------------------------------------------------------------- the fixture, built or read from its cache
const sources = () => {
  const files = ['scripts/build-scale-fixture.mjs', ...['public', 'shared'].flatMap(dir => readdirSync(dir).filter(f => f.endsWith('.js')).sort().map(f => dir + '/' + f))];
  const h = createHash('sha256'); for (const f of files) h.update(f + '\0' + readFileSync(f, 'utf8') + '\0'); return h.digest('hex').slice(0, 16);
};
const cacheDir = '.aiw-local/scale-fixture', key = sources(), cached = cacheDir + '/scale-' + PER + '-' + key + '.json';
let raw, built = null, restoredRaw = null;
if (existsSync(cached) && !process.argv.includes('--rebuild')) raw = readFileSync(cached, 'utf8');
else {
  const t = Date.now();
  built = await buildScaleProject({perChapter: PER, log: m => console.log('  built', m)});
  raw = JSON.stringify(built.document);
  mkdirSync(cacheDir, {recursive: true});
  for (const f of readdirSync(cacheDir)) if (f.startsWith('scale-' + PER + '-')) rmSync(cacheDir + '/' + f, {force: true});
  writeFileSync(cached, raw);
  timings.buildMs = Date.now() - t;
  console.log('  fixture built in ' + timings.buildMs + ' ms and kept as ' + cached);
}
const fresh = (settle = true) => { const p = JSON.parse(raw); return settle ? settleDocument(p) : p; };
const doc = fresh(false);
timings.documentBytes = Buffer.byteLength(raw);

// ---------------------------------------------------------------- 1. the bounds
const counts = scaleCounts(doc);
for (let c = 1; c <= 7; c++) assert.equal(counts[c], PER, 'Chapter ' + c + ' holds ' + counts[c] + ' records');
assert.equal(doc.interfaces.contracts.length, PER); assert.equal(doc.interfaces.data.length, PER);
assert.equal(doc.security.threats.length, PER); assert.equal(doc.security.controls.length, PER);
assert.equal(doc.runtime.environments.length, PER); assert(doc.runtime.placements.length >= PER, doc.runtime.placements.length + ' placements');
assert(doc.runtime.plans.length >= PER, doc.runtime.plans.length + ' runtime plans');
pass(`the fixture holds ${PER} records in each of Chapters 1–10 (${JSON.stringify(counts)}), ${doc.logical.connections.length} logical connections, ${doc.realisation.connections.length} interactions, ${doc.technology.dependencies.length} technology dependencies, ${doc.interfaces.data.reduce((n, d) => n + d.fields.length, 0)} fields, ${doc.runtime.zones.length} zones`);

// One more record in each collection at its cap is refused, with the workspace's wording; the document is unchanged.
const one = (apply, type, payload) => () => apply(documentClone(doc), {type, payload}, at);
const reqs = doc.artefacts.filter(a => a.type === 'requirement').map(a => a.id), comps = doc.realisation.components.map(c => c.id);
const refusals = [
  ['quality drivers', QUALITY_LIMITS.drivers, one(applyQualityCommand, 'quality.driver', {category: 'performance', title: 'One driver too many', requirementIds: [reqs[0]], responsibilityIds: []}), /This workspace keeps up to 500 quality scenarios\./],
  ['decisions', DECISION_LIMITS.records, one(applyDecisionCommand, 'decision.save', {question: 'One question too many?', requirementIds: [reqs[0]], driverIds: []}), /This workspace keeps up to 500 decision questions\./],
  ['responsibilities', LOGICAL_LIMITS.responsibilities, one(applyLogicalCommand, 'logical.responsibility', {title: 'One responsibility too many', requirementIds: [reqs[0]], decisionIds: []}), /This workspace keeps up to 500 responsibilities\./],
  ['application components', REALISATION_LIMITS.components, one(applyRealisationCommand, 'realisation.component', {title: 'One component too many', kind: 'service', allocations: [], dataIds: [], decisionIds: []}), /This workspace keeps up to 500 application components\./],
  ['technology capabilities', TECHNOLOGY_LIMITS.capabilities, one(applyTechnologyCommand, 'technology.capability', {title: 'One capability too many', category: 'compute', mappings: [], driverIds: [], decisionIds: []}), /This workspace keeps up to 500 technology capabilities\./],
  ['realizations', REALIZATION_LIMITS.records, one(applyTechnologyRealisationCommand, 'techrealisation.plan', {title: 'One realization too many', mappings: [{capabilityId: doc.technology.capabilities[0].id, scope: 'x'}]}), /This workspace keeps up to 500 realizations\./],
  ['contracts', INTERFACE_LIMITS.contracts, one(applyInterfacesCommand, 'interfaces.contract', {title: 'One contract too many', kind: 'request', from: comps[0], to: comps[1], exchanges: []}), /This workspace keeps up to 500 contracts\./],
  ['data definitions', INTERFACE_LIMITS.data, one(applyInterfacesCommand, 'interfaces.data', {title: 'One data definition too many', classification: 'Internal'}), /This workspace keeps up to 500 data definitions\./],
  ['threats', SECURITY_LIMITS.threats, one(applySecurityCommand, 'security.threat', {title: 'One threat too many', category: 'Data disclosure', priority: 'Low', targetIds: [doc.interfaces.data[0].id]}), /This workspace keeps up to 500 threats\./],
  ['controls', SECURITY_LIMITS.controls, one(applySecurityCommand, 'security.control', {title: 'One control too many', category: 'Data protection', failureMode: 'Deny or contain', targetIds: [doc.interfaces.data[0].id], threatIds: []}), /This workspace keeps up to 500 controls\./],
  ['environments', RUNTIME_LIMITS.environments, one(applyRuntimeCommand, 'runtime.environment', {title: 'One environment too many', stage: 'Production design', assetIds: [comps[0]]}), /This workspace keeps up to 500 environments\./]
];
for (const [what, limit, attempt, words] of refusals) { assert.equal(limit, PER, what + ' are bounded at ' + PER); assert.throws(attempt, words, 'the ' + (PER + 1) + 'th of the ' + what + ' is refused'); }
assert.deepEqual([LOGICAL_LIMITS.connections, REALISATION_LIMITS.interactions, TECHNOLOGY_LIMITS.dependencies, REALIZATION_LIMITS.connections, INTERFACE_LIMITS.fields, RUNTIME_LIMITS.zones, RUNTIME_LIMITS.placements], [2000, 2000, 2000, 2000, 2000, 2000, 2000], 'relationships and fields are bounded at 2,000');
pass(`each of the ${refusals.length} capped collections refuses its ${PER + 1}st record ("This workspace keeps up to ${PER} …"); relationships and fields are bounded at 2,000`);
assert(timings.documentBytes < RECOVERY_LIMIT, `the document (${timings.documentBytes} bytes) fits the ${RECOVERY_LIMIT}-byte import limit`);
pass(`the 500-per-chapter document is ${(timings.documentBytes / 1024 / 1024).toFixed(2)} MB of JSON, ${((RECOVERY_LIMIT - timings.documentBytes) / 1024 / 1024).toFixed(2)} MB under the 12 MB the import route reads`);

// ---------------------------------------------------------------- 2. the storage: restore, read, save on a local database
{
  const dir = await mkdtemp(tmpdir() + '/aiw-scale-'), env = {DB: localDatabase(dir + '/scale.sqlite'), FILES: localFiles(dir + '/files'), ASSETS: {fetch: () => new Response('ok')}};
  const api = async (path, body) => { const r = await worker.fetch(new Request('https://aiw.test' + path, {headers: {'oai-authenticated-user-id': 'architect', Origin: 'https://aiw.test', ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {method: 'POST', body: JSON.stringify(body)} : {})}), env); return {status: r.status, data: await r.json()}; };
  try {
    let t = Date.now();
    const preview = await api('/api/recovery?action=preview', {package: doc});
    assert.equal(preview.status, 200, JSON.stringify(preview.data).slice(0, 300));
    const restored = await api('/api/recovery?action=restore', {package: doc, hash: preview.data.hash, name: 'Scale fixture · restored', reviewed: true});
    assert.equal(restored.status, 201, JSON.stringify(restored.data).slice(0, 300));
    timings.restoreMs = Date.now() - t;
    t = Date.now();
    const loaded = await api('/api/project?project=' + encodeURIComponent(restored.data.id));
    assert.equal(loaded.status, 200);
    timings.loadMs = Date.now() - t;
    assert.deepEqual(scaleCounts(loaded.data.document), counts, 'the stored document reads back with every record');
    restoredRaw = JSON.stringify(loaded.data.document); // an imported project: the journey's own steps, not the reference's
    const row = await env.DB.prepare('SELECT length(document) AS bytes FROM projects WHERE id=?').bind(restored.data.id).first();
    timings.storedRowBytes = row.bytes;
    // One ordinary save at scale: an edit of an existing driver through /api/commands, and the cap through the same route.
    const d = loaded.data.document.quality.drivers.at(-1);
    t = Date.now();
    const saved = await api('/api/commands?project=' + encodeURIComponent(restored.data.id), {revision: loaded.data.revision, command: {type: 'quality.driver', payload: {...d, title: d.title + ' (edited at scale)'}}});
    assert.equal(saved.status, 200, JSON.stringify(saved.data).slice(0, 300));
    timings.saveMs = Date.now() - t;
    const refused = await api('/api/commands?project=' + encodeURIComponent(restored.data.id), {revision: saved.data.revision, command: {type: 'quality.driver', payload: {category: 'performance', title: 'One driver too many', requirementIds: [], responsibilityIds: []}}});
    assert.equal(refused.status, 400); assert.match(refused.data.error, /This workspace keeps up to 500 quality scenarios/);
    pass(`the document restores through /api/recovery in ${timings.restoreMs} ms, reads back whole in ${timings.loadMs} ms (a ${(timings.storedRowBytes / 1024 / 1024).toFixed(2)} MB row; requirements kept in parts), saves an edit through /api/commands in ${timings.saveMs} ms, and the route refuses the 501st driver`);
    // The SDD export route on the restored project: the full edition as Markdown, assembled in one pass with its figures
    // (every scene of the 500-record project drawn), twice: the second request finds the figure set kept by content.
    const route = async () => { const t0 = Date.now(), r = await worker.fetch(new Request('https://aiw.test/api/export?project=' + encodeURIComponent(restored.data.id) + '&chapter=11&format=md', {headers: {'oai-authenticated-user-id': 'architect', Origin: 'https://aiw.test'}}), env), body = await r.text(); return {status: r.status, ms: Date.now() - t0, bytes: body.length}; };
    const first = await route(), second = await route();
    assert.equal(first.status, 200); assert.equal(second.bytes, first.bytes, 'the same document twice');
    Object.assign(timings, {sddRouteFirstMs: first.ms, sddRouteSecondMs: second.ms, sddRouteBytes: first.bytes});
    pass(`the SDD export route serves the restored project's full edition (${(first.bytes / 1024 / 1024).toFixed(1)} MB of Markdown with its figures) in ${first.ms} ms, and ${second.ms} ms once its figure set is kept (reported, not bounded)`);
  } finally { env.DB.close(); await rm(dir, {recursive: true, force: true}); }
}

// ---------------------------------------------------------------- 3. identical results, memoised and not
const derived = (p, {sdd = true} = {}) => {
  const out = {};
  for (const c of CHAPTERS) { out['findings ' + c.id] = c.checks(p); out['milestones ' + c.id] = c.milestones(p); out['export ' + c.id] = c.export(p); }
  out.final = finalFindings(p); out.finalMilestones = finalMilestones(p); out.summaries = chapterSummaries(p);
  out.inherited = inheritedFindings(p).map(f => ({...f})); out.board = sddBoard(p); out.readiness = sddReadiness(p);
  for (let c = 1; c <= 11; c++) out['checks ' + c] = chapterChecks(p, c);
  out.graph = logicalGraph(p);
  out.traces = p.artefacts.filter(a => a.type === 'requirement').slice(0, 60).map(r => reviewTrace(p, r.id));
  Object.assign(out, reasoned(p));
  if (sdd) out.sdd = assembleSDD(p);
  return plainOf(out);
};
// Maps and Sets read as their entries, so a comparison of plain values compares them too.
const plainOf = v => JSON.parse(JSON.stringify(v, (k, x) => (x instanceof Map || x instanceof Set ? [...x] : x)));
// The round-5 (phase 2) indexes: the connected model, the reasoning chains, the anti-pattern scan, the capacity plan, the
// product choices (in a pass, as the SDD reads them), the ranked findings of Chapters 4 and 10, and the exchange model.
const reasoned = (p, {choices = true} = {}) => {
  const m = architectureModel(p), R = reasoningSource(p);
  return {model: {objects: [...m.objects.values()], relationships: m.relationships, issues: m.issues, signature: m.signature},
    chains: R.drivers.map(d => driverChain(R, d.id)), anti: detectAntiPatterns(R), capacity: capacityPlan(R, capacityObjective(R, p.finalReview?.capacity || null)),
    ...(choices ? {choices: memoPass(p, () => (p.technologyRealisation?.records || []).map(r => choiceForDesign(p, r.id)))} : {}), ranked: [4, 10].map(c => rankedFindings(p, c, 8)), exchange: exchangeSource(p, {})};
};
const references = [['the reference project', () => withFinalReview(seedProject())], ...['service-permits', 'warehouse-fulfilment', 'clinic-appointments', 'blank'].map(t => ['the ' + t + ' project', () => withFinalReview(createProject({name: 'Scale reference ' + t, template: t}, 'scale-' + t, at))])];
for (const [name, make] of references) {
  const base = JSON.stringify(make()), memo = derived(settleDocument(JSON.parse(base))), plain = unmemoised(() => derived(JSON.parse(base)));
  for (const k of Object.keys(plain)) assert.deepEqual(memo[k], plain[k], name + ': ' + k + ' is the same memoised and not');
  // A command's working copy is never settled: its checks run in a pass of their own and match too.
  const working = derived(JSON.parse(base));
  for (const k of Object.keys(plain)) assert.deepEqual(working[k], plain[k], name + ': ' + k + ' is the same in a pass');
}
pass(`on the reference project, the three reference journeys and a blank project, every chapter's checks, milestones and export, the inherited findings, the readiness board, the connected graph and model, the reasoning chains, anti-patterns, capacity plan and product choices, the ranked findings, the exchange model, the requirement trails and the SDD are identical memoised (settled, or in a pass) and with every cache off`);
{
  const memo = fresh(), plain = fresh(false);
  for (const c of CHAPTERS) assert.deepEqual(JSON.parse(JSON.stringify(c.checks(memo))), JSON.parse(JSON.stringify(unmemoised(() => c.checks(plain)))), 'Chapter ' + c.id + ' checks at scale');
  const traced = p => p.artefacts.filter(a => a.type === 'requirement').filter((r, i) => i % 100 === 7).map(r => reviewTrace(p, r.id));
  assert.deepEqual(JSON.parse(JSON.stringify(traced(fresh()))), JSON.parse(JSON.stringify(unmemoised(() => traced(fresh(false))))), 'requirement trails at scale');
  pass('on the 500-record project, every chapter\'s checks and the requirement trails are identical memoised and with every cache off');
  // What the round-5 (phase 2) indexes serve at scale, against the searches they replace (every cache off). The board, the
  // SDD and the product choices are compared on the references above: with every cache off at this size each reads every
  // chapter's sources as before round 5 and takes minutes.
  const t2 = Date.now(), memo2 = fresh(), plain2 = fresh(false);
  const a = plainOf(reasoned(memo2, {choices: false})), b = plainOf(unmemoised(() => reasoned(plain2, {choices: false})));
  for (const k of Object.keys(b)) assert.deepEqual(a[k], b[k], k + ' at scale is the same memoised and with every cache off');
  timings.scaledEqualityMs = Date.now() - t2;
  pass(`on the 500-record project, the connected model, the reasoning chains, anti-patterns, capacity plan, the ranked findings of Chapters 4 and 10 and the exchange model are identical memoised and with every cache off (${timings.scaledEqualityMs} ms)`);
  // Whole design (round 10, V7): its column order is the one result smartOrder computes on another path with every cache
  // off (anatomy-layout.js), and the spines, the lit routes along them and the recorded fallbacks follow the cards.
  const t3 = Date.now(), whole = (p, chapter) => { const L = anatomyLayout(anatomyModel(anatomySource(p)), {chapter, scope: {kind: 'system'}, peel: null, order: {}, viewW: 1180}); return plainOf({cols: L.cols.map(c => [c.id, c.x, c.w]), cards: L.items.filter(i => i.obj).map(i => [i.id, i.x, i.y, i.w, i.h]), threads: L.threads, pillars: L.pillars, fallbacks: L.spineFallbacks}); };
  let spines = 0, fallbacks = 0;
  for (const [name, make, chapters] of [...references.map(([n, m]) => [n, () => JSON.stringify(m()), [6, 10]]), ['the 500-record project', () => raw, [10]]]) {
    const base = make();
    for (const chapter of chapters) {
      const a = whole(settleDocument(JSON.parse(base)), chapter), b = unmemoised(() => whole(JSON.parse(base), chapter));
      assert.deepEqual(a, b, name + ': Whole design at Chapter ' + chapter + ' (columns, cards, spines, lit routes, fallbacks) is the same memoised and with every cache off');
      spines += a.threads.filter(t => t.kind === 'spine').length; fallbacks += a.fallbacks.length;
    }
  }
  timings.wholeDesignEqualityMs = Date.now() - t3;
  pass(`Whole design (column order, cards, ${spines} component spines and their lit routes, ${fallbacks} recorded spine fallbacks) is identical memoised and with every cache off on the references at Chapters 6 and 10 and on the 500-record project at Chapter 10 (${timings.wholeDesignEqualityMs} ms)`);
  // The same project restored through /api/recovery is an imported one, read through its journey steps (the blank
  // project's paths): its checks name every record they leave disconnected, about 6,500 in Chapter 4.
  const restoredMemo = settleDocument(JSON.parse(restoredRaw)), restoredPlain = JSON.parse(restoredRaw);
  for (const c of CHAPTERS) assert.deepEqual(JSON.parse(JSON.stringify(c.checks(restoredMemo))), JSON.parse(JSON.stringify(unmemoised(() => c.checks(restoredPlain)))), 'Chapter ' + c.id + ' checks of the restored project');
  pass('on the same project as restored through /api/recovery (an imported project), every chapter\'s checks are identical memoised and with every cache off');
}

// ---------------------------------------------------------------- 4. the budget
// Each measurement reads a fresh copy of the document, settled as the store settles what the server sends, so no
// cache is warm; the best of up to three runs counts (it stops at the first run within the bound, and after one run
// more than twice the bound, which a second run would not bring within it). The sections above leave the heap full
// of their own garbage (about 1.9 GB after the identity checks, round 11), and a collection that lands inside a
// measured run is the suite's cost, not the function's: when the process exposes gc (test:scale runs with
// --expose-gc), a full collection runs before each measured run, so the run pays only for what it allocates, as the
// browser does on a document it holds alone. The live heap after the first collection is reported.
const collect = () => { globalThis.gc?.(); };
collect(); timings.liveHeapMB = Math.round(process.memoryUsage().heapUsed / 1e6);
const measure = (name, bound, fn, {settle = true, prepare = null} = {}) => {
  let best = Infinity, result;
  for (let i = 0; i < 3; i++) { const p = fresh(settle); prepare?.(p); collect(); const t = performance.now(); result = fn(p); const ms = Math.round(performance.now() - t); best = Math.min(best, ms); if (best <= bound || ms > 2 * bound) break; }
  timings[name] = best; return result;
};
const own = (name, bound, fn, options) => { measure(name, bound, fn, options); assert(timings[name] <= bound, `${name} took ${timings[name]} ms (bound ${bound} ms)`); };
for (const c of CHAPTERS) own('findings ' + c.id, BUDGET.findings, p => c.checks(p));
pass(`each of Chapters 1–10 checks itself under ${BUDGET.findings} ms (${CHAPTERS.map(c => timings['findings ' + c.id]).join(' / ')} ms)`);
// The readings' stripping pass (round 12, A3: GR-TST-07): what a reading reads of a record leaves its review state out
// (source-fingerprint.js contentOf), and a settled document's record is stripped once per record revision. Cold, every
// record of a chapter is stripped (reported); on the next revision of the document (one record changed, the rest kept as
// a save's answer keeps them, project-store.js) only the changed record is, each chapter's pass under STRIP_BUDGET ms.
{
  const sections = {1: ['artefacts', 'relationships'], 2: ['quality'], 3: ['decisions'], 4: ['logical'], 5: ['realisation'], 6: ['technology'], 7: ['technologyRealisation'], 8: ['interfaces'], 9: ['security'], 10: ['runtime']};
  const recordsOf = (p, chapter) => sections[chapter].flatMap(k => Array.isArray(p[k]) ? p[k] : Object.values(p[k] || {}).filter(Array.isArray).flat()).filter(r => r && typeof r === 'object');
  const strip = (p, chapter) => { const t = performance.now(); for (const r of recordsOf(p, chapter)) contentOf(p, r); return performance.now() - t; };
  const before = fresh(), counts = {};
  for (const chapter of Object.keys(sections)) { counts[chapter] = recordsOf(before, chapter).length; timings['stripping cold ' + chapter] = Math.round(strip(before, chapter) * 10) / 10; }
  const edited = before.artefacts.findIndex(a => a.type === 'requirement'), next = settleDocument({...before, artefacts: before.artefacts.map((a, i) => i === edited ? {...a, description: a.description + ' Edited.'} : a)});
  for (const chapter of Object.keys(sections)) { const ms = Math.round(strip(next, chapter) * 10) / 10; timings['stripping next revision ' + chapter] = ms; assert(ms <= STRIP_BUDGET, `Chapter ${chapter}'s stripping pass on the next revision took ${ms} ms (bound ${STRIP_BUDGET} ms)`); }
  assert.equal(contentOf(next, next.artefacts[edited]).description, next.artefacts[edited].description, 'the changed record is read as it is now');
  pass(`the readings' stripping pass, once per record revision: cold ${Object.keys(sections).map(c => timings['stripping cold ' + c]).join(' / ')} ms over ${Object.values(counts).join(' / ')} records (reported); on the next revision ${Object.keys(sections).map(c => timings['stripping next revision ' + c]).join(' / ')} ms (bound ${STRIP_BUDGET} ms a chapter)`);
}
// The restored project's board reads about 5,500 more passages than the fixture's (an imported project names every
// record Chapter 4 leaves disconnected): measured and reported beside the bounded one.
{ const keep = raw; raw = restoredRaw; for (const c of CHAPTERS) own('findings ' + c.id + ' (restored)', BUDGET.findings, p => c.checks(p)); measure('readiness board (restored)', BUDGET.board, p => sddBoard(p)); raw = keep; }
pass(`restored through /api/recovery (an imported project, ${JSON.parse(restoredRaw).logical.responsibilities.length} responsibilities), each of Chapters 1–10 still checks itself under ${BUDGET.findings} ms (${CHAPTERS.map(c => timings['findings ' + c.id + ' (restored)']).join(' / ')} ms); its readiness board takes ${timings['readiness board (restored)']} ms (reported)`);
// Chapter 11's checks read every chapter's: measured once those are worked out (as on the board), and cold.
own('findings 11', BUDGET.findings, p => finalFindings(p), {prepare: p => { for (const c of CHAPTERS) c.checks(p); }});
measure('findings 11 cold, with every chapter', Infinity, p => finalFindings(p));
// A project under review records its intake and its checks against the whole design's fingerprint: with them recorded
// the fingerprint is read (with none, the answer is no without reading it).
const reviewed = p => { p.finalReview.intake = {at, stamp: 'recorded before the last change'}; p.finalReview.checks = {at, stamp: 'recorded before the last change'}; };
own('findings 11 (review recorded)', BUDGET.findings, p => finalFindings(p), {prepare: p => { reviewed(p); for (const c of CHAPTERS) c.checks(p); }});
pass(`Chapter 11 checks itself under ${BUDGET.findings} ms once the chapters have (${timings['findings 11']} ms; ${timings['findings 11 (review recorded)']} ms with a review intake recorded, which reads the design's fingerprint; ${timings['findings 11 cold, with every chapter']} ms including all ten)`);
own('readiness board (11 chapterChecks)', BUDGET.board, p => sddBoard(p));
measure('readiness board (review recorded)', BUDGET.board, p => sddBoard(p), {prepare: reviewed});
pass(`the readiness board (all eleven chapterChecks) takes ${timings['readiness board (11 chapterChecks)']} ms (bound ${BUDGET.board} ms); with a review intake recorded, which reads the whole design's fingerprint, ${timings['readiness board (review recorded)']} ms (reported)`);
own('assembleSDD', BUDGET.sdd, p => assembleSDD(p).length);
pass(`the SDD assembles in ${timings.assembleSDD} ms (bound ${BUDGET.sdd} ms): one pass over the document, the capacity plan worked out once for every product choice`);
own('connected model (architectureModel)', BUDGET.model, p => architectureModel(p));
pass(`the connected model builds in ${timings['connected model (architectureModel)']} ms (bound ${BUDGET.model} ms)`);
const pictures = {};
for (const scene of ['logical', 'application']) {
  let D = null;
  measure('diagram ' + scene, Infinity, p => { D = notationDiagram(p, scene); return D; });
  timings['diagram ' + scene + ' elements'] = D.nodes.length + ' nodes, ' + D.edges.length + ' edges';
  pictures[scene] = {D, L: null};
  own('layout ' + scene, BUDGET.layout, () => (pictures[scene].L = notationLayout(D)));
}
{
  const {D, L} = pictures.logical, A = pictures.application;
  assert(D.edges.length > STRAIGHT_EDGES && L.edges.every(e => e.pts.length === 2), `Chapter 4's ${D.edges.length} flows are drawn straight (above ${STRAIGHT_EDGES})`);
  assert.equal(L.through, L.edges.filter(e => e.through).length, 'a straight line across an element is marked and counted');
  assert(A.L.W <= 9000 && A.L.H <= 30000, `Chapter 5's ${A.D.nodes.length}-element tree stands ${A.L.W}×${A.L.H} px: its crowded ranks are grids, not ranks of dummies`);
  Object.assign(timings, {'layout logical size': L.W + '×' + L.H + ' px, ' + L.through + ' lines across an element', 'layout application size': A.L.W + '×' + A.L.H + ' px, ' + A.L.through + ' lines across an element'});
  pass(`the Chapter 4 picture (${timings['diagram logical elements']}) lays out in ${timings['layout logical']} ms and the Chapter 5 tree (${timings['diagram application elements']}) in ${timings['layout application']} ms (bound ${BUDGET.layout} ms): Chapter 4's flows drawn straight above ${STRAIGHT_EDGES} connectors, Chapter 5 ${A.L.W}×${A.L.H} px with its crowded ranks as grids`);
}
measure('findings 10 on the server (not settled)', Infinity, p => CHAPTERS[9].checks(p), {settle: false});
measure('readiness board on the server (not settled)', Infinity, p => sddBoard(p), {settle: false});

console.log('TIMINGS ' + JSON.stringify(timings));
console.log(`\n${checks.length} checks passed.`);
