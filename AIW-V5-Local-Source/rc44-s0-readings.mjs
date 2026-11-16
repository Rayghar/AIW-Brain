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

if (process.argv[1] && import.meta.url.endsWith('/rc44-s0-readings.mjs') && process.argv[1].endsWith('rc44-s0-readings.mjs') && process.argv.includes('--capture')) console.log(JSON.stringify({capturedFrom: process.argv[process.argv.indexOf('--capture') + 1] || 'working tree', at: AT, readings: referenceDigests()}, null, 1));
