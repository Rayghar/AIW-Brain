// AIW rc44, slice S0: the readings of a reference document that an optional design package must leave as they are
// (BUILD-PLAN-2026-11-16 ruling 7): the record graph, every requirement's trail and spine, the findings with their
// stamps, the design and evidence fingerprints, readiness, the provenance reading and the text of the SDD (registers and
// architecture edition) and of the ARS. It imports only modules that exist at the baseline 94dbd4f, so the same file
// reads the baseline tree: `node rc44-s0-readings.mjs --capture` prints the SHA-256 of each reading per reference
// (rc44-s0-extensions-baseline.json was captured so from an unchanged checkout of 94dbd4f).
import {createHash} from 'node:crypto';
import {createProject} from './shared/projects-domain.js';
import {withFinalReview, reviewRequirements, inheritedFindings, finalFindings, chapterSummaries, reviewSourceStamp, reviewDesignStamp, evidenceStamp, traceStamp, assembleSDD, reviewBlockerCount, CHAPTERS} from './public/review-domain.js';
import {recordGraph} from './public/record-graph.js';
import {architectureModel} from './public/architecture-model.js';
import {requirementTrace, requirementSpine} from './public/trace-kernel.js';
import {chapterChecks, sddBoard, sddOpenCounts} from './public/readiness-model.js';
import {architectureMarkdown, provenanceReading} from './public/sdd-architecture.js';
import {arsMarkdown} from './public/ars-document.js';
import {retiredRecords} from './public/record-lifecycle.js';
import {eachRecord} from './public/provenance.js';
import {instantiateTemplate} from './project-lifecycle.js';

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
