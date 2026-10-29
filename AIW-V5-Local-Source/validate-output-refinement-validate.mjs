// User-facing regressions: partial chapter output, truthful downstream availability,
// count vocabulary and the actionable next step without changing saved records.
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {createProject} from './shared/projects-domain.js';
import {outputStage, documentListHTML} from './public/output-documents.js';
import {chapterChecks} from './public/readiness-model.js';
import {validationNextStep} from './public/validate-view.js';

const full = withFinalReview(seedProject());
const blank = () => withFinalReview(createProject({name: 'Refinement review', template: 'blank'}, 'refinement-review'));
const cases = [
  [1, 'artefacts', full.artefacts.find(r => r.type === 'constraint')],
  [4, 'logical.groups', full.logical.groups[0]],
  [6, 'technology.capabilities', full.technology.capabilities[0]],
  [7, 'technologyRealisation.records', full.technologyRealisation.records[0]],
  [8, 'interfaces.parties', full.interfaces.parties[0]],
  [9, 'security.threats', full.security.threats[0]],
  [10, 'runtime.environments', full.runtime.environments[0]],
  [10, 'runtime.plans', full.runtime.plans[0]]
];
for (const [chapter, path, record] of cases) {
  assert.ok(record, 'Reference record for ' + path);
  const p = blank(), keys = path.split('.'), leaf = keys.pop();
  let target = p; for (const key of keys) target = target[key];
  target[leaf] = [structuredClone(record)];
  const before = JSON.stringify(p);
  assert.ok(outputStage(p, chapter).now.some(d => d.kind === 'register'), path + ': saved records make their chapter register available');
  assert.ok(outputStage(p, 11).now.some(d => d.id === 'sdd'), path + ': a later or secondary record contributes to the SDD');
  assert.equal(JSON.stringify(p), before, path + ': output does not mutate the design');
}
const framed = blank(); framed.finalReview.narrative.summary = 'A design framing ready for discussion.';
assert.ok(outputStage(framed, 11).now.some(d => d.id === 'sdd'), 'Chapter 11 prose can be exported before earlier chapters contain records');
assert.equal(outputStage(blank(), 11).now.length, 0, 'An empty project still explains what to create first');

// Round 27 receipts remain visible alongside the refined current/stale status.
const checked = structuredClone(full);
checked.review = {at: '2026-10-18T08:00:00.000Z', contentVersion: checked.contentVersion};
checked.handoff = {at: '2026-10-18T08:01:00.000Z'};
const checkedHTML = documentListHTML(checked, 1);
assert.match(checkedHTML, /Recorded checks are current/);
assert.match(checkedHTML, /Last recorded check: 2026-10-18T08:00:00.000Z/);
assert.match(checkedHTML, /Last recorded handoff: 2026-10-18T08:01:00.000Z/);
const changed = structuredClone(checked); changed.contentVersion++;
const changedHTML = documentListHTML(changed, 1);
assert.match(changedHTML, /A fresh check is needed/);
assert.match(changedHTML, /A historical receipt does not establish current readiness/);
assert.match(changedHTML, /Last recorded handoff: 2026-10-18T08:01:00.000Z/);

for (let chapter = 1; chapter <= 11; chapter++) {
  const p = structuredClone(full), before = JSON.stringify(p), stage = outputStage(p, chapter), html = documentListHTML(p, chapter);
  for (const later of stage.later.filter(d => !d.here)) {
    assert.equal(later.available, outputStage(p, later.chapter).now.some(d => d.id === later.id), 'Downstream availability matches its own chapter');
    assert.match(later.url, new RegExp('chapter=' + later.chapter + '&tab=output'));
  }
  assert.match(html, /Project backup and exchange data/, 'Every Output keeps the whole project export findable');
  assert.match(html, /A fresh check is needed|Recorded checks are current/, 'Every Output explains check freshness');
  if (chapter === 11) assert.match(html, /final checks? to fix/, 'Final checks retain their actual unit');
  const next = validationNextStep(chapterChecks(p, chapter), chapter);
  if (next) assert.ok(next.text && next.reason && (next.kind === 'run' || next.url), 'The next step has a reason and a working action');
  assert.equal(JSON.stringify(p), before, 'Reading Chapter ' + chapter + ' changes nothing');
}

const finding = {title: 'Define timeout policy', detail: 'An unknown outcome must be reconciled before retrying.'};
const check = {toFix: 1, toConfirm: 0, next: {kind: 'fix', text: finding.title + ' · IF-001', url: '/?chapter=8&tab=work&object=if-001'}, passages: [{fix: [finding], confirm: []}], run: {current: false}};
assert.equal(validationNextStep(check, 8).reason, finding.detail, 'The explanation comes from the actual rule finding');
assert.equal(validationNextStep({...check, toFix: 0, passages: [], run: {current: false}}, 8).kind, 'run', 'Clear but stale checks offer the chapter’s real check command');
assert.equal(validationNextStep({...check, toFix: 0, scope: 'Payments', run: {current: true}}, 8).kind, 'output', 'A clear module does not recommend another module’s finding');
assert.equal(validationNextStep({...check, next: {kind: 'draft'}}, 8), null, 'Draft guidance already on the page is not duplicated');
console.log('Validate / Output refinement: 11 chapters, 8 partial-record cases, downstream links, count units, freshness and reasoned next steps passed.');
