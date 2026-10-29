import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyAssuranceCommand} from './public/assurance-domain.js';
import {observedEvidenceForObject, observedMappingSummary} from './public/model-conformance.js';

let p = withFinalReview(seedProject());
const req = p.artefacts.find(a => a.type === 'requirement'), component = p.realisation.components[0];
p.coauthoring = {schemaVersion: 1, counters: {source: 1, task: 0}, sources: [{id: 'SRC-001', title: 'Run log', versions: [{revision: 1, text: 'Test completed.', location: 'runs/17'}]}], tasks: []};
const save = payload => {p = applyAssuranceCommand(p, {type: 'assurance.record', payload: {
  kind: 'test-result', requirementIds: [req.id], title: 'Run 17', statement: 'Observed response.',
  release: 'R17', environment: 'UAT', observedAt: '2026-10-11', cycle: 'Regression', ...payload
}}, '2026-10-11', 'tester').document;};
save({objectIds: [component.id], status: 'Passed as reported', sourceId: 'SRC-001', reviewed: true, reviewer: 'Test lead', reviewNote: 'Checked source.'});
save({title: 'Untested assertion', objectIds: [component.id], status: 'Unknown'});
save({title: 'Requirements-only run', status: 'Passed as reported'});
let view = observedEvidenceForObject(p, component.id);
assert.deepEqual(view.counts, {total: 2, reviewedCurrent: 1, stale: 0, unreviewed: 1, requirementOnly: 0});
assert.equal(view.records[0].basis, 'reviewed-current');
assert.equal(view.records[0].sourceLocation, 'runs/17');
assert.equal(observedEvidenceForObject(p, req.id).counts.requirementOnly, 1, 'requirement evidence is not silently attributed to a component');
assert.equal(observedEvidenceForObject(p, component.id, {environment: 'PROD'}).counts.total, 0);
assert.deepEqual(observedMappingSummary(p), {total: 3, objectMapped: 2, requirementOnly: 1, reviewedCurrent: 1, sourceChanged: 0, unreviewed: 2});
p.coauthoring.sources[0].versions.push({revision: 2, text: 'Amended run.', location: 'runs/17'});
view = observedEvidenceForObject(p, component.id);
assert.equal(view.counts.stale, 1, 'a changed source cannot remain current evidence');
assert.equal(view.records[0].status, 'Passed as reported', 'the canvas does not reinterpret source wording as a verified system result');
assert.equal(JSON.stringify(p).includes('Passed as reported'), true, 'the projection does not mutate the project');
console.log('Model conformance: explicit object mapping, source freshness, scope and unreviewed boundary passed.');
