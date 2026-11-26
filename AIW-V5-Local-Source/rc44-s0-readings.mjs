// AIW rc44, slice S0: the readings of a reference document that an optional design package must leave as they are
// (BUILD-PLAN-2026-11-16 ruling 7): the record graph, every requirement's trail and spine, the findings with their
// stamps, the design and evidence fingerprints, readiness, the provenance reading and the text of the SDD (registers and
// architecture edition) and of the ARS. It imports only modules that exist at the baseline 94dbd4f, so the same file
// reads the baseline tree: `node rc44-s0-readings.mjs --capture` prints the SHA-256 of each reading per reference
// (rc44-s0-extensions-baseline.json was captured so from an unchanged checkout of 94dbd4f).
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createProject} from './shared/projects-domain.js';
import {withFinalReview, reviewRequirements, inheritedFindings, finalFindings, chapterSummaries, reviewSourceStamp, reviewDesignStamp, evidenceStamp, traceStamp, assembleSDD, reviewBlockerCount, CHAPTERS} from './public/review-domain.js';
import {recordGraph} from './public/record-graph.js';
import {architectureModel} from './public/architecture-model.js';
import {requirementTrace, requirementSpine, BUILT_IN_LAYERS} from './public/trace-kernel.js';
import {recordTrace, tracePath} from './public/trace-record.js';
import {chapterChecks, sddBoard, sddOpenCounts} from './public/readiness-model.js';
import {architectureMarkdown, provenanceReading} from './public/sdd-architecture.js';
import {arsMarkdown} from './public/ars-document.js';
import {retiredRecords} from './public/record-lifecycle.js';
import {eachRecord} from './public/provenance.js';
import {instantiateTemplate} from './project-lifecycle.js';
import {neutraliseImportedAuthority} from './recovery-service.js';

export const AT = '2026-10-01T09:00:00.000Z';
export const REFERENCES = ['bank-payment', 'clinic-appointments', 'parcel-lockers'];
export const reference = template => withFinalReview(createProject({name: template, template}, template, AT));
const sha = text => createHash('sha256').update(text).digest('hex');
const trail = T => (T ? {layers: T.layers, hops: [...T.hops].map(([id, hs]) => [id, hs])} : null);
// Each reading as text: what is compared byte for byte.
export function readings(p) {
  const G = recordGraph(p), M = architectureModel(p), reqs = reviewRequirements(p), records = [];
  eachRecord(p, (r, chapter, path, link) => records.push([chapter, path, r.id ?? null, link]));
  const text = {
    graph: JSON.stringify({root: G.root, objects: [...G.objects.values()].map(o => [o.id, o.type, o.title, o.ref, o.owner, o.source, o.attributes]), relationships: G.relationships.map(e => [e.id, e.type, e.from, e.to, e.label, e.source, e.derived, e.via, e.attributes])}),
    model: JSON.stringify({objects: [...M.objects.values()].map(o => [o.id, o.type, o.chapter, o.level, o.source, o.status]), relationships: M.relationships.map(e => [e.id, e.type, e.from, e.to, e.source]), issues: M.issues}),
    trails: JSON.stringify(reqs.map(r => [r.id, trail(requirementTrace(p, r.id)), trail(requirementSpine(p, r.id)), traceStamp(p, r.id)])),
    findings: JSON.stringify({chapters: CHAPTERS.map(c => [c.id, c.checks(p)]), inherited: inheritedFindings(p), final: finalFindings(p), summaries: chapterSummaries(p), blockers: reviewBlockerCount(p)}),
    stamps: JSON.stringify({design: reviewSourceStamp(p), designVersion: reviewDesignStamp(p), evidence: evidenceStamp(p)}),
    readiness: JSON.stringify({checks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(c => chapterChecks(p, c)), board: sddBoard(p), open: sddOpenCounts(p)}),
    provenance: JSON.stringify({reading: provenanceReading(p), records, retired: retiredRecords(p)}),
    registers: assembleSDD(p),
    sdd: architectureMarkdown(p).markdown,
    ars: arsMarkdown(p)
  };
  return text;
}
export const digests = p => Object.fromEntries(Object.entries(readings(p)).map(([k, v]) => [k, sha(v)]));
export const referenceDigests = () => Object.fromEntries(REFERENCES.map(t => [t, digests(reference(t))]));

// A document whose review list (list 11, the review's own findings: 'EVIDENCE:…') is not empty, which none of the
// references is: the Bank Payment reference with three open semantic findings, on a decision, on a component and on a
// Chapter 1 record (the last is Chapter 1's own, not the review's). Built with baseline code only, so its readings
// are captured from the baseline as the references' are (rc44-s0-extensions-baseline.json, `reviewList`).
export function reviewListDocument() {
  const p = JSON.parse(JSON.stringify(reference('bank-payment'))), finding = (id, chapter, objectId, title) => ({id, chapter, objectId, title, explanation: 'Two records read against each other.', question: 'Which holds?', status: 'open', generation: 'old', kind: 'conflict', leftRef: 'L', leftQuote: 'left', rightRef: 'R', rightQuote: 'right', sources: []});
  p.assurance = {version: 1, counter: 0, records: [], ...p.assurance, semanticFindings: [finding('SF-001', 3, p.decisions.records[0].id, 'A hypothesis on a decision'), finding('SF-002', 5, p.realisation.components[0].id, 'A hypothesis on a component'), finding('SF-003', 1, p.artefacts[0].id, 'A hypothesis on Chapter 1')]};
  return withFinalReview(p);
}
export const reviewListFindings = p => inheritedFindings(p).filter(f => String(f.id).startsWith('EVIDENCE:'));

// What every package's suite asserts with its own records in a document (the lead's ruling D6.4 of 2026-11-18). A
// package can put a record on a built-in trail in two ways the registry cannot see: a relation of a type a built-in
// hop reads between two built-in records, and add() with a built-in type that stands on a built-in layer. So:
// assertBuiltInTrailsUnchanged(base, withRecords): for every requirement of `base` (the document without the
// package's records), the built-in layers of its trail and of its spine in `withRecords` hold what they hold in
// `base`; assertFindingIdsUnique(p): no two findings of the review share an id (a treatment is kept by finding id).
// They throw with the requirement, the layer or the id named; they answer how much they read.
export function assertBuiltInTrailsUnchanged(base, withRecords) {
  let layers = 0;
  for (const r of reviewRequirements(base)) for (const [name, read] of [['trail', requirementTrace], ['spine', requirementSpine]]) {
    const a = read(base, r.id), b = read(withRecords, r.id);
    for (const l of Object.keys(a.layers)) { layers++; if (JSON.stringify(b.layers[l]) !== JSON.stringify(a.layers[l])) throw Error('The ' + name + ' of ' + r.id + ' moved on the built-in layer “' + l + '”: ' + JSON.stringify(a.layers[l]) + ' became ' + JSON.stringify(b.layers[l]) + '. A package\'s records join a package\'s layers only.'); }
  }
  return layers;
}
// assertBuiltInChainsUnchanged(base, withRecords) (the lead's ruling K8 of 2026-11-20): the chain that explains a pair
// of built-in records (trace-record.js tracePath, read by the Matrix, the Model trace and the SDD journey line) is the
// chain `base` gives, for every record of `base` as the start and every record on its trace. A package's record on a
// layer of its own may be a shorter way between two built-in records; it explains a pair only when no built-in chain
// does; and the records of every such record's trace on the built-in layers are the ones `base` gives (the Model
// trace and the SDD journey line read them). Answers how many chains it compared.
export function assertBuiltInChainsUnchanged(base, withRecords) {
  let chains = 0;
  for (const start of recordGraph(base).objects.keys()) {
    const a = recordTrace(base, start); if (!a) continue; const b = recordTrace(withRecords, start);
    { const onBuiltIn = T => [...(T ? T.ids : [])].filter(x => BUILT_IN_LAYERS.includes(T.layerOf(x))).sort(), was = JSON.stringify(onBuiltIn(a)), now = JSON.stringify(onBuiltIn(b));
      if (was !== now) throw Error('The trace of ' + start + ' moved on the built-in layers: ' + was + ' became ' + now + '. A package\'s records join a package\'s layers only.'); }
    for (const id of a.ids) { if (id === start) continue; chains++; const was = JSON.stringify(tracePath(a, id)), now = JSON.stringify(b ? tracePath(b, id) : null);
      if (was !== now) throw Error('The chain from ' + start + ' to ' + id + ' moved: ' + was + ' became ' + now + '. A package\'s record explains a pair only when no built-in chain does.'); }
  }
  return chains;
}
// assertTrackerStaysInPaths(extension, cases) (the lead's ruling O2 of 2026-11-21): a package's tracker changes nothing
// of a document but the package's own keys (its design and evidence keys, the keys of its design row, its lifecycle and
// provenance collections), the built-in collections it states as trackPaths, and the change journal, to which it only
// adds: the boundary stamps what a call changed in its trackPaths, and nothing else of the built-in design may move
// unseen. For each case {prior, next, command, at} (next: the commit's document as the command left it) it runs
// extension.track(prior, a copy of next, command, at) and compares: prior is as it was; the events of next stand as
// they were, in their order, and the journal's counter moves by the events the tracker added; the whole document
// outside those keys is as it was. And inside its trackPaths (the lead's rulings R2 and T1 of 2026-11-22: a tracker
// mends content; it decides nothing and makes nothing, and it changes only what it lists): trackPaths is
// {'chapter.collection': [field, …]}, none of its fields one the start check refuses (trackFieldRefused below: a
// record's identity, revision and history, TRACKED_STANDING, and what the chapters read as an acceptance, an approval,
// a review, a confirmation or a snapshot); no record is added and none removed; no field a path does not list moves on
// a record; and a revision moves only forward, by one, and only where a listed field changed (as the boundary puts back
// what it may not change: design-extension-boundary.js trackExtensions). TRACKED_STANDING and trackFieldRefused are
// stated here because this file imports only modules of the baseline; S0's suite holds them equal to the boundary's
// (design-extension-parts.js). Throws with the key, the record and the case named (fields in alphabetical order); answers {cases,
// changed: {path: the cases whose call changed it}, journalled: the events the calls added}.
export const TRACKED_STANDING = Object.freeze(['state', 'origin', 'keptAt', 'confirmed', 'targetConfirmed', 'review', 'reviews', 'provenance']);
const TRACK_NEVER = new Set(['id', 'ref', 'code', 'alias', 'revision', 'history', ...TRACKED_STANDING, 'status', 'governance', 'approval', 'approvals', 'recorded', 'appliedImpact', 'assumptionsResolved', 'sourceDriverIds', 'sourceDecisionIds']);
export const trackFieldRefused = field => TRACK_NEVER.has(field) || /confirm|snapshot|stamp|review|approv|accept|govern|history|resolved|^selected[A-Z]/i.test(field);
export function assertTrackerStaysInPaths(extension, cases) {
  const name = extension?.id || 'the package', plainOf = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}), list = v => (Array.isArray(v) ? v : []), refOf = r => (r && typeof r === 'object' ? r.ref || r.code || r.id : null) || 'a record';
  if (typeof extension?.track !== 'function') throw Error('assertTrackerStaysInPaths: ' + name + ' states no tracker.');
  if (!Array.isArray(cases) || !cases.length) throw Error('assertTrackerStaysInPaths: no case for ' + name + '\'s tracker.');
  if (extension.trackPaths !== undefined && !(Object.keys(plainOf(extension.trackPaths)).length && Object.values(extension.trackPaths).every(v => Array.isArray(v) && v.length && v.every(x => typeof x === 'string')))) throw Error('assertTrackerStaysInPaths: ' + name + ' states trackPaths as {\'chapter.collection\': [field, …]}.');
  const fields = Object.entries(plainOf(extension.trackPaths)), paths = fields.map(([path]) => path), out = {cases: 0, changed: Object.fromEntries(paths.map(x => [x, 0])), journalled: 0};
  for (const [path, listed] of fields) for (const f of listed) if (trackFieldRefused(f)) throw Error('assertTrackerStaysInPaths: ' + name + ' lists “' + f + '” for “' + path + '”, which a tracker never changes.');
  const own = [...list(extension.designKeys), ...list(extension.evidenceKeys), ...Object.keys(plainOf(extension.design)), ...Object.keys(plainOf(extension.lifecycle)), ...Object.keys(plainOf(extension.provenance?.records)), ...Object.values(plainOf(extension.provenance?.paths)).flatMap(list)].filter(k => typeof k === 'string');
  const at = (p, path) => path.split('.').reduce((v, k) => (v && typeof v === 'object' ? v[k] : undefined), p);
  const outside = (p, journal) => { const q = structuredClone(p); for (const path of [...own, ...paths]) { const [a, b] = path.split('.'); if (b === undefined) delete q[a]; else if (q[a] && typeof q[a] === 'object') delete q[a][b]; }
    if (q.changes && typeof q.changes === 'object') { delete q.changes.events; delete q.changes.counter; if (!journal && JSON.stringify(q.changes) === '{"schemaVersion":1}') delete q.changes; } return q; };
  const keyOf = (a, b) => { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) { const x = plainOf(a[k]), y = plainOf(b[k]), inner = [...new Set([...Object.keys(x), ...Object.keys(y)])].find(j => JSON.stringify(x[j]) !== JSON.stringify(y[j])); return inner && (a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) ? k + '.' + inner : k; } return null; };
  const same = (a, b, k) => JSON.stringify(a?.[k]) === JSON.stringify(b?.[k]);
  cases.forEach((c, i) => {
    const where = '(case ' + (i + 1) + ', ' + (c?.command?.type || 'no command') + ')', prior = structuredClone(c.prior), next = structuredClone(c.next), was = JSON.stringify(c.prior);
    extension.track(prior, next, c.command, c.at);
    if (JSON.stringify(prior) !== was) throw Error(name + '\'s tracker changed the document as the request found it (prior, ' + where.slice(1, -1) + '): prior is read, never written.');
    const before = list(c.next.changes?.events), after = list(next.changes?.events), added = after.length - before.length;
    if (added < 0 || JSON.stringify(after.slice(0, before.length)) !== JSON.stringify(before)) throw Error(name + '\'s tracker changed the change journal\'s earlier events ' + where + ': a tracker only adds to the journal.');
    const moved = (next.changes?.counter ?? 0) - (c.next.changes?.counter ?? 0); if (moved !== added) throw Error(name + '\'s tracker moved the change journal\'s counter by ' + moved + ' for ' + added + ' events it added ' + where + '.');
    const key = keyOf(outside(c.next, 'changes' in c.next), outside(next, 'changes' in c.next)); if (key) throw Error(name + '\'s tracker changed “' + key + '” outside its own keys, its trackPaths and the change journal ' + where + ': state the built-in collections it mends as trackPaths, so that the boundary stamps what it changes, or leave them as they are.');
    for (const [path, listed] of fields) {
      const was = new Map(), loose = [], made = ' to “' + path + '” ' + where + ': a tracker mends the records of its trackPaths; it makes none and removes none.', mine = new Set(listed);
      for (const r of list(at(c.next, path))) if (r && typeof r === 'object' && r.id != null) was.set(r.id, [...was.get(r.id) || [], r]); else loose.push(JSON.stringify(r));
      for (const r of list(at(next, path))) {
        const id = r && typeof r === 'object' ? r.id : null, old = id != null ? was.get(id)?.shift() : undefined;
        if (old === undefined) { const n = id == null ? loose.indexOf(JSON.stringify(r)) : -1; if (n < 0) throw Error(name + '\'s tracker added ' + refOf(r) + made); loose.splice(n, 1); continue; }
        const unlisted = [...new Set([...Object.keys(old), ...Object.keys(r)])].filter(k => k !== 'revision' && !mine.has(k) && !same(old, r, k)).sort();
        if (unlisted.length) throw Error(name + '\'s tracker changed ' + unlisted.map(k => '“' + k + '”').join(', ') + ' of ' + refOf(old) + ' in “' + path + '” ' + where + ': a tracker changes only the content fields its trackPaths lists for the path; every other field of a record (its identity and history, whether and how it stands, an acceptance, an approval, a review, a confirmation, a snapshot) is the chapter\'s and the boundary\'s.');
        const mended = listed.some(k => !same(old, r, k)), from = old.revision ?? 0;
        if (!same(old, r, 'revision') && !(mended && Number.isInteger(from) && r.revision === from + 1)) throw Error(name + '\'s tracker moved the revision of ' + refOf(old) + ' in “' + path + '” from ' + JSON.stringify(old.revision) + ' to ' + JSON.stringify(r.revision) + ' ' + where + ': a mend moves a revision forward by one, and only when it changes a field its trackPaths lists.');
      }
      const gone = [...was.values()].flat()[0] ?? (loose.length ? JSON.parse(loose[0]) : undefined);
      if (gone !== undefined) throw Error(name + '\'s tracker removed ' + refOf(gone) + made.replace(' to “', ' from “'));
    }
    out.cases++; out.journalled += added; for (const path of paths) if (JSON.stringify(at(c.next, path)) !== JSON.stringify(at(next, path))) out.changed[path]++;
  });
  return out;
}
export function assertFindingIdsUnique(p) {
  const seen = new Set(), all = inheritedFindings(p);
  for (const f of all) { if (seen.has(f.id)) throw Error('Two findings share the id “' + f.id + '”: a treatment of one would cover the other. A package\'s finding id is its own (by convention code:record id, with a code no other package or chapter uses).'); seen.add(f.id); }
  return all.length;
}

// "Opens with records" (the lead's ruling D10 of 2026-11-18). The chapters-route gate (client-bundle.mjs sizeReport,
// routes.chapters.code) measures opening a document that holds no package records. A document that holds a package's
// records also loads, before it is first drawn, the lazy entry that holds the package (ruling A3). Each package
// reports that figure in its notes and its size evidence: the code of the chapters route and of the lazy entry's own
// static closure together, each script counted once. opensWithRecords(metafile, entry, dataNames) reads it from the
// build's metafile (bundleClient(...).metafile, parsed): `entry` is the source of the lazy entry the package's route
// stub loads ('public/architecture-task-ui.js'), `dataNames` the data modules the gate sets apart from code
// (Object.keys(BUDGET.data) of client-bundle.mjs). It answers {route, added, total, files}: the route as the gate
// counts it, what the lazy entry adds to it, their sum, and how many scripts the entry adds.
// assertUnder10kCeiling(slice, base, gate) (the lead's rulings P8 and R4 of 2026-11-22): a size case reads the
// files-under-10-KB bucket as a ceiling, as client-bundle.mjs does: at most the gate (BUDGET.tiny), and at most the
// base's count plus the script files the slice adds (slice and base: {scripts, under10k}). A slice may leave fewer
// small files than its base; it may not add one beyond the files it adds. Throws in words; answers the ceiling.
export function assertUnder10kCeiling(slice, base, gate) {
  const added = Math.max(0, slice.scripts - base.scripts), ceiling = Math.min(gate, base.under10k + added);
  if (!(Number.isInteger(slice.under10k) && slice.under10k <= ceiling)) throw Error(slice.under10k + ' script files under 10 KB: at most ' + ceiling + ' (the gate ' + gate + ', and the base\'s ' + base.under10k + ' plus the ' + added + ' script file' + (added === 1 ? '' : 's') + ' the slice adds).');
  return ceiling;
}
// assertRouteWithinCap(measured, base) (the owner's decision AA2 of 2026-11-26, which retired per-slice byte booking:
// the allowances, the shared pool, lead-bookings-size.json's books, routeBookings, assertBookingsAddUp and S0's block
// "O1 the bookings add up"): the one size check of a build, at each merge. `measured` is a build's size report
// (client-bundle.mjs bundleClient(...).report, or dist/client-size-report.json) or a measurement {chapters, scripts,
// under10k, css}; `base` is {scripts, under10k} of the build's base. Every cap is read from client-bundle.mjs (BUDGET),
// none is written here: the chapters route within its cap; the script files at or under the gate, and the gate at or
// under the plan's 150 (beyond 150 is the owner's decision); the files-under-10-KB bucket a ceiling (assertUnder10kCeiling:
// at most the gate, and at most the base's count plus the script files the build adds; rulings P8 and R4); and the
// stylesheet within its cap, the cap unchanged from the one rc44 started with (audit/rc44/build-notes/s0-size.json
// caps.css: new surfaces reuse existing classes, plan 2.4). Throws in words; answers {route, cap, headroom, scripts,
// gate, under10k, ceiling, css, cssCap}, so that a build reports its route bytes before and after.
const PLAN_SCRIPTS = 150;
export async function assertRouteWithinCap(measured, base) {
  const {BUDGET} = await import('./client-bundle.mjs'), r = measured || {}, m = r.routes ? {chapters: r.routes.chapters?.code, scripts: r.scripts, under10k: r.buckets?.under10k, css: r.css} : r;
  for (const k of ['chapters', 'scripts', 'under10k', 'css']) if (!Number.isInteger(m[k])) throw Error('assertRouteWithinCap: the measurement states no ' + k + ' (' + JSON.stringify(m[k]) + ').');
  if (!Number.isInteger(base?.scripts) || !Number.isInteger(base?.under10k)) throw Error('assertRouteWithinCap: the base states its script files and its files under 10 KB ({scripts, under10k}).');
  const cap = BUDGET.routes.chapters, gate = BUDGET.scripts, cssCap = BUDGET.css, started = JSON.parse(readFileSync(new URL('./audit/rc44/build-notes/s0-size.json', import.meta.url), 'utf8')).caps.css;
  if (m.chapters > cap) throw Error('The chapters route is ' + m.chapters + ' B, over its cap of ' + cap + ' B (client-bundle.mjs).');
  if (gate > PLAN_SCRIPTS) throw Error('The script-file gate is ' + gate + ', beyond the plan\'s ' + PLAN_SCRIPTS + ': going beyond ' + PLAN_SCRIPTS + ' is the owner\'s decision.');
  if (m.scripts > gate) throw Error(m.scripts + ' script files, over the gate of ' + gate + ' (client-bundle.mjs).');
  const ceiling = assertUnder10kCeiling(m, base, BUDGET.tiny);
  if (cssCap !== started) throw Error('The stylesheet cap is ' + cssCap + ' B: it stays ' + started + ' B, the cap rc44 started with (new surfaces reuse existing classes).');
  if (m.css > cssCap) throw Error('The stylesheet is ' + m.css + ' B, over its cap of ' + cssCap + ' B (client-bundle.mjs).');
  return {route: m.chapters, cap, headroom: cap - m.chapters, scripts: m.scripts, gate, under10k: m.under10k, ceiling, css: m.css, cssCap};
}
export function opensWithRecords(metafile, entry, dataNames = []) {
  const outputs = metafile.outputs, scripts = Object.keys(outputs).filter(f => f.endsWith('.js'));
  const isData = input => dataNames.some(name => input.endsWith('public/' + name + '.js'));
  const code = f => (outputs[f]?.bytes || 0) - Object.entries(outputs[f]?.inputs || {}).reduce((n, [i, x]) => n + (isData(i) ? x.bytesInOutput : 0), 0);
  const closure = starts => { const seen = new Set(), walk = f => { if (seen.has(f) || !outputs[f]) return; seen.add(f); for (const i of outputs[f].imports || []) if (!i.external && i.kind === 'import-statement') walk(i.path); }; starts.forEach(walk); return seen; };
  const main = scripts.find(f => outputs[f].entryPoint === 'public/entry.js'), held = scripts.find(f => outputs[f].entryPoint === entry);
  if (!main || !held) throw Error('The build holds no ' + (main ? 'lazy entry ' + entry : 'entry script') + '.');
  // The chapters route as the gate reads it: the entry script and every dynamic import of it but the Projects page.
  const route = closure([main, ...(outputs[main].imports || []).filter(i => i.kind === 'dynamic-import' && outputs[i.path]?.entryPoint !== 'public/projects.js').map(i => i.path)]);
  const more = [...closure([held])].filter(f => !route.has(f)), sum = files => [...files].reduce((n, f) => n + code(f), 0);
  return {route: sum(route), added: sum(more), total: sum(route) + sum(more), files: more.length};
}

if (process.argv[1] && import.meta.url.endsWith('/rc44-s0-readings.mjs') && process.argv[1].endsWith('rc44-s0-readings.mjs') && process.argv.includes('--capture')) { const listed = reviewListDocument(); console.log(JSON.stringify({capturedFrom: process.argv[process.argv.indexOf('--capture') + 1] || 'working tree', at: AT, readings: referenceDigests(), reviewList: {findings: reviewListFindings(listed).map(f => f.id), readings: digests(listed)}}, null, 1)); }

// A person's or a second person's step taken in a template is no step in a project copied from it (the lead's ruling
// F3). A package keeps such a step under the record's key `review`, which the copy clears; a step kept under a key of
// the package's own choosing would be carried into the copy as if taken there. `records` reads the package's records
// from a document; `p` holds at least one of them with a step taken. A step is told by what the boundary hands to
// apply and apply keeps on it: who took it (actor) and of what kind the account was (account).
export function assertTemplateCopyClearsSteps(p, records) {
  const step = v => !!v && typeof v === 'object' && !Array.isArray(v) && 'actor' in v && 'account' in v;
  const source = withFinalReview({...p, workspace: {...p.workspace, reusableTemplate: true}});
  if (!records(source).some(r => Object.values(r || {}).some(step))) throw Error('assertTemplateCopyClearsSteps: the document holds no record with a step taken');
  for (const r of records(instantiateTemplate(source, 'template-copy', 'A copy', AT))) for (const [key, value] of Object.entries(r || {}))
    if (step(value)) throw Error('A step taken in a template is carried into a project copied from it: ' + (r.id || '(record)') + '.' + key + ' (keep a person\'s step under the record\'s key review, which the copy clears)');
}

// The counterpart of assertTemplateCopyClearsSteps for a recovery import (the lead's ruling Q6 of 2026-11-22): a step
// taken on the workbench a recovery package came from is nobody's here. `records` reads the records that keep steps
// from a document; after the import (recovery-service.js neutraliseImportedAuthority, as the server's import calls it)
// no value of theirs, and no element of a list of theirs, may still be a step a named actor took ({actor, account} with
// an actor), unless it is kept as history under a key that starts with "imported". It throws with the key and the
// record named; it answers how many records it read.
export function assertRecoveryClearsSteps(p, records) {
  const step = v => !!v && typeof v === 'object' && !Array.isArray(v) && 'actor' in v && 'account' in v && v.actor != null;
  const holds = v => step(v) || (Array.isArray(v) && v.some(step));
  if (!records(p).some(r => Object.values(r || {}).some(holds))) throw Error('assertRecoveryClearsSteps: the document holds no record with a step taken');
  const rows = records(neutraliseImportedAuthority(structuredClone(p), AT));
  for (const r of rows) for (const [key, value] of Object.entries(r || {}))
    if (!key.startsWith('imported') && holds(value)) throw Error('A step taken before a recovery import counts on this workbench: ' + (r.id || '(record)') + '.' + key + ' (move it aside under an imported key, as recovery-service.js neutraliseImportedAuthority does for the topology step)');
  return rows.length;
}

// No person's and no second person's step moves a design stamp (the lead's ruling J3 of 2026-11-19): the design
// fingerprint never reads the history, review, confirmed or provenance of a package's record. A package whose records
// keep any of them states what its records say to the fingerprint (design {key: p => …}), and its suite calls this with
// a document that holds its records and `records`, which reads them from a document: each of the four keys is written
// on every record, as a step, a confirmation and the boundary's stamps write them, and the design fingerprint and the
// design version stamp must stay where they were. It throws with the key and the record named; it answers how many
// records it read.
export function assertStepsMoveNoStamp(p, records) {
  const stamp = d => { const q = withFinalReview(d, {upgrade: false}); return reviewSourceStamp(q) + ' ' + reviewDesignStamp(q); }, was = stamp(structuredClone(p)), rows = records(p);
  if (!rows.length) throw Error('assertStepsMoveNoStamp: the document holds no record of the package');
  const STEPS = {history: r => [...(Array.isArray(r.history) ? r.history : []), {revision: r.revision ?? 1, actor: 'a-second-person', at: AT, event: 'step'}], review: () => ({actor: 'a-second-person', at: AT, account: 'person', note: 'A step taken.'}), confirmed: r => !r.confirmed, provenance: () => ({author: {kind: 'person', by: 'a-person', at: AT}, reviewed: {by: 'a-second-person', at: AT, how: 'confirmed'}})};
  for (const [key, value] of Object.entries(STEPS)) { const q = structuredClone(p); for (const r of records(q)) r[key] = value(r); if (stamp(q) !== was) throw Error('A person\'s step moves the design stamp: the design fingerprint reads “' + key + '” of ' + (rows[0].id || 'a record') + '. State what the package\'s records say to the fingerprint (design {key: p => …}): all but their history, review, confirmed and provenance.'); }
  return rows.length;
}
