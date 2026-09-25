// SDD readiness checks: the chapters' own checks and milestones, and Chapter 11's treatments,
// read as one line across the journey. Run: npm run test:readiness
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview, applyFinalReviewCommand, inheritedFindings, reviewBlockers} from './public/review-domain.js';
import {sddReadiness, SHORT} from './public/readiness-model.js';

const checks = [], pass = name => checks.push(name);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);

// 1. The whole journey, read from what each chapter records.
const R = sddReadiness(project);
assert.deepEqual(R.chapters.map(c => c.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
assert.deepEqual(R.chapters.map(c => c.short), Object.values(SHORT));
assert.deepEqual(R.chapters.slice(0, 10).map(c => c.blockers), [1, 0, 6, 0, 0, 4, 72, 38, 13, 77], 'each chapter\'s blocking findings');
assert.equal(R.blockers, 211); assert.equal(R.blockers, reviewBlockers(project).length, 'the same count Chapter 11 asks to treat');
assert.deepEqual(R.chapters.map(c => c.state), ['gaps', 'review', 'gaps', 'review', 'review', 'gaps', 'gaps', 'gaps', 'gaps', 'gaps', 'gaps']);
assert.deepEqual([R.chapters[10].gaps, R.chapters[10].done, R.chapters[10].total], [2, 0, 8], 'Chapter 11 reads its own readiness: framing the SDD and treating the source findings');
assert.equal(R.summary, '211 blocking findings in 7 chapters stand between this design and a reviewable SDD.');
assert.equal(R.ready, false);
assert.equal(JSON.stringify(project), before, 'reading readiness changes nothing');
pass('readiness reads all eleven chapters from their own checks and milestones: 211 blocking findings in seven chapters — the same count Chapter 11 asks to treat — and Chapter 11\'s own framing and treatment still to do');

// 2. Repairing a finding at its source, or treating it in Chapter 11, moves it out of the way.
const q = structuredClone(project);
q.artefacts.find(a => a.id === 'REQ-005').acceptance = 'Given a settled payment, when its outcome is recorded, then the customer is notified within one minute and the notice cites the payment reference.';
const Q = sddReadiness(q);
assert.equal(Q.chapters[0].blockers, 0, 'repaired in Chapter 1'); assert.notEqual(Q.chapters[0].state, 'gaps');
assert.ok(Q.chapters.slice(1, 10).some((c, i) => c.blockers > R.chapters[i + 1].blockers), 'and the changed requirement asks the chapters built on it for review');
const f = inheritedFindings(project).find(x => x.chapter === 6 && x.level === 'error');
const t = applyFinalReviewCommand(structuredClone(project), {type: 'review.disposition', payload: {findingId: f.id, stamp: f.stamp, treatment: 'Accepted design limitation', rationale: 'Accepted for the pilot; revisit before production.', reviewer: 'Synthetic reviewer', reference: 'ADR-003', reviewed: true}}).document;
const T = sddReadiness(t);
assert.equal(T.chapters[5].blockers, 3); assert.equal(T.chapters[5].treated, 1); assert.equal(T.treated, 1);
assert.match(T.summary, /^210 blocking findings in 7 chapters stand between this design and a reviewable SDD\. 1 more is treated in Chapter 11\.$/);
pass('a finding repaired in its own chapter stops blocking the SDD — while the chapters built on the changed requirement are asked to review it — and a finding treated in Chapter 11 with a reviewed disposition is counted as treated');

console.log(JSON.stringify({suite: 'SDD readiness', passed: checks.length, checks, limits: ['Readiness counts the chapters\' own findings and Chapter 11\'s treatments; it approves nothing.']}, null, 2));
