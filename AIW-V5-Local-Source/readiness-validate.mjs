// SDD readiness checks: the chapters' own checks and milestones, and Chapter 11's treatments,
// read as one line across the journey. Run: npm run test:readiness
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview, applyFinalReviewCommand, inheritedFindings, reviewBlockers} from './public/review-domain.js';
import {sddReadiness, SHORT, chapterChecks, sddBoard, sddContributionHTML, CHECK_WORDS, projectHasRecords} from './public/readiness-model.js';
import {applyLogicalCommand} from './public/logical-domain.js';
import {createProject} from './shared/projects-domain.js';
import {applyLensCommand, lensReport} from './public/domain-lens.js';

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
assert.equal(R.summary, '211 findings to fix in 7 chapters stand between this design and a reviewable SDD.');
assert.ok(!/blocking/i.test(R.summary), 'the summary follows the one vocabulary (to fix, to confirm), never "blocking" (round 12, G, GR-UX-14)');
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
assert.match(T.summary, /^210 findings to fix in 7 chapters stand between this design and a reviewable SDD\. 1 more is treated in Chapter 11\.$/);
pass('a finding repaired in its own chapter stops blocking the SDD — while the chapters built on the changed requirement are asked to review it — and a finding treated in Chapter 11 with a reviewed disposition is counted as treated');

// 3. Each chapter's checks as SDD passages (round 3, C): what Validate counts and Output documents.
assert.deepEqual(Object.values(CHECK_WORDS), ['passing', 'to fix', 'to confirm']);
for (const c of R.chapters.slice(0, 10)) {
  const C = chapterChecks(project, c.id);
  assert.equal(C.toFix, c.blockers, 'Chapter ' + c.id + ': to fix is the readiness line\'s untreated content gaps');
  assert.equal(C.toConfirm, c.review, 'Chapter ' + c.id + ': to confirm is its review items');
  assert.equal(C.passages.reduce((n, x) => n + x.fix.length + x.confirm.length + x.treated.length, 0), c.gaps + c.review, 'Chapter ' + c.id + ': every finding sits on one passage');
  assert.equal(C.passing, C.passages.filter(x => x.status === 'pass').length);
}
const C4 = chapterChecks(project, 4);
assert.deepEqual(C4.passages.map(x => x.ref), ['Chapter 4', 'LR-001', 'LR-002', 'LR-003', 'LR-004', 'LR-005'], 'the chapter as a whole, then each responsibility in register order');
assert.deepEqual([C4.passing, C4.total, C4.toFix, C4.toConfirm], [0, 6, 0, 11]);
assert.equal(C4.passages[1].url, '/?chapter=4&tab=work&object=api', 'each passage names the Work record that fills it');
const C8 = chapterChecks(project, 8), if1 = C8.passages.find(x => x.ref === 'IF-001');
assert.equal(C8.total, 12); assert.equal(if1.status, 'fix');
assert.ok(if1.missing.some(m => /^Define IF-001 contract: Complete purpose, owner, operation, protocol, and contract version\.$/.test(m)), 'what is missing, in the check\'s own words');
const C6 = chapterChecks(project, 6);
assert.ok(C6.passages.some(x => x.ref === 'APP-001' && x.from === 5 && /Chapter 5 record, as Chapter 6 reads it/.test(x.kind)), 'a finding Chapter 6 raises on a Chapter 5 record is its own passage');
const C10 = chapterChecks(project, 10);
assert.ok(!C10.passages.some(x => /^(PL|RP)-/.test(x.id)), 'a placement or path finding belongs to its plan or environment');
const C11 = chapterChecks(project, 11);
assert.deepEqual(C11.passages.map(x => x.id), ['ownership', 'summary', 'scope', 'approach', 'trace', 'findings', 'actions', 'specification', 'performance', 'review', 'baseline'], 'round 11: the Architecture requirements specification stands before the performance specification');
assert.deepEqual([C11.toFix, C11.toConfirm], [2, 8], 'Chapter 11 counts its own final checks');
assert.deepEqual(C11.passages.filter(x => x.status === 'fix').map(x => x.id), ['ownership', 'summary', 'scope', 'approach', 'findings']);
assert.match(C11.passages.find(x => x.id === 'performance').confirm[0].title, /No load stated: no objective is recorded/);
// Round 11: the specification's gate (every driver measurable, verified and carried by a runtime plan) passes when a plan
// names each driver, informs on a project with one unmeasurable driver, and blocks nothing: it never counts as to fix.
// Round 12 (GR-DRV-06): a driver is carried only when a plan, capability or realisation names it, and the reference names
// none, so there the gate asks to confirm each driver's carrier.
{
  const ars = C11.passages.find(x => x.id === 'specification');
  assert.equal(ars.ref, 'Architecture requirements specification'); assert.match(ars.url, /chapter=2&tab=work/);
  assert.equal(ars.status, 'confirm'); assert.deepEqual(ars.fix, []); assert.deepEqual(ars.confirm.map(f => f.id).sort(), project.quality.drivers.filter(d => !d.kind || d.kind === 'quality').map(d => 'ars:carried:' + d.id).sort(), 'one item per driver nothing names');
  const named = structuredClone(project);
  for (const d of named.quality.drivers) { const plan = named.runtime.plans[0]; plan.targets = [...(Array.isArray(plan.targets) ? plan.targets : []), {kind: 'availability', driverId: d.id, operator: '', value: '', unit: '', window: '', basis: '', confirmed: false}]; }
  const N = chapterChecks(named, 11).passages.find(x => x.id === 'specification');
  assert.equal(N.status, 'pass'); assert.deepEqual(N.confirm, []);
  const vague = structuredClone(named); Object.assign(vague.quality.drivers[2], {targetValue: '', measurement: ''});
  const V = chapterChecks(vague, 11).passages.find(x => x.id === 'specification');
  assert.equal(V.status, 'confirm'); assert.deepEqual(V.fix, []);
  assert.deepEqual(V.confirm.map(f => f.id), ['ars:measurable:QD-003', 'ars:verified:QD-003']);
  assert.match(V.confirm[0].detail, /needs a numeric target and a verification/);
  assert.deepEqual([chapterChecks(vague, 11).toFix, chapterChecks(vague, 11).toConfirm], [C11.toFix, C11.toConfirm], 'the gate changes no count of Chapter 11\'s own checks');
  assert.deepEqual([chapterChecks(named, 11).toFix, chapterChecks(named, 11).toConfirm], [C11.toFix, C11.toConfirm], 'nor does a plan naming a driver');
  const empty = structuredClone(project); empty.quality.drivers = []; empty.quality.conflicts = [];
  assert.deepEqual(chapterChecks(empty, 11).passages.find(x => x.id === 'specification').confirm.map(f => f.id), ['ars:none','empty:specification']);
  empty.artefacts = empty.artefacts.filter(a => a.type !== 'requirement'); empty.finalReview.actions = [];
  for (const id of ['trace','actions']) {
    const passage = chapterChecks(structuredClone(empty), 11).passages.find(x => x.id === id);
    assert.notEqual(passage.status, 'pass', 'an empty ' + id + ' passage is not verified');
    assert.ok(passage.confirm.some(f => f.id === 'empty:' + id));
  }
  pass('round 11: Chapter 11 carries the Architecture requirements specification as a passage whose gate passes when a plan names each driver, asks to confirm each driver nothing names on the reference (round 12, GR-DRV-06), names the one that falls short on a project with an unmeasurable driver, and blocks nothing');
}
assert.equal(chapterChecks(project, 4), C4, 'read once per saved document');
assert.equal(chapterChecks(project, 12), null);
// A treatment moves a content gap from to fix to treated.
const T6 = chapterChecks(t, 6);
assert.deepEqual([T6.toFix, T6.treated], [3, 1]);
assert.equal(JSON.stringify(project), before, 'reading the checks changes nothing');
pass('each chapter\'s checks read as its passages in the SDD: the chapter as a whole and each record it keeps, to fix while a content gap on it is untreated, to confirm while a review item is open, passing otherwise — the same counts as the readiness line, every finding on one passage, what is missing in the check\'s own words, and the Work record that fills it; Chapter 11 reads its own framing, traceability, findings and performance specification');

// 4. The run: when the chapter last ran its checks, and whether that still holds.
assert.deepEqual(C4.run, {at: null, current: false});
const ran = applyLogicalCommand(structuredClone(project), {type: 'logical.review', payload: {}}).document;
assert.equal(chapterChecks(ran, 4).run.current, true); assert.ok(chapterChecks(ran, 4).run.at);
pass('the last run is the chapter\'s own review record, current until the chapter or its inputs change');

// 5. The board: every chapter, in the same words; nothing called blocking on a project with no records (U2-05).
const B = sddBoard(project);
assert.equal(B.chapters.length, 11); assert.equal(B.toFix, 211 + 2); assert.equal(B.clear, 0);
assert.ok(B.chapters.every(c => c.next?.text && c.validateURL === '/?chapter=' + c.chapter + '&tab=validate'), 'each tile has its next action and its checks');
assert.equal(B.chapters[0].next.text, 'Make acceptance testable · REQ-005');
const blank = createProject({name: 'Blank', template: 'blank'}, 'blank-1');
assert.equal(projectHasRecords(blank), false);
const BB = sddBoard(blank), html = [1, 4, 8, 11].map(n => sddContributionHTML(blank, n)).join('');
assert.ok(BB.chapters.every(c => !c.started));
assert.ok(!/block/i.test(html) && !/block/i.test(JSON.stringify(BB.chapters.map(c => c.next.text))), 'no "blocking" before the first record');
assert.match(sddContributionHTML(project, 4, {where: 'output'}), /What Chapter 4 puts in the SDD[\s\S]*Chapter 4 · Logical application[\s\S]*approves nothing/);
pass('the readiness board reads every chapter in the same three words with its next action and its checks; on a project with no records nothing is called blocking');

// 6. The plateaus (round 6, Contract S): none by default and no count moves; with plateaus, a Transition passage in
// Chapter 11 carries the plan's checks, each to confirm, and the chapters' own counts are what they were.
assert.deepEqual(R.plateaus, [], 'no plateaus: the readiness line carries an empty list');
assert.equal(C11.passages.length, 11, 'no plateaus: Chapter 11 has exactly the passages it had (eleven since round 11 added the Architecture requirements specification)');
const withPlateaus = applyFinalReviewCommand(applyFinalReviewCommand(structuredClone(project), {type: 'review.plateau', payload: {title: 'As is', kind: 'current', order: 1}}).document, {type: 'review.plateau', payload: {title: 'Target', kind: 'target', order: 2}}).document;
const RP = sddReadiness(withPlateaus), CP = chapterChecks(withPlateaus, 11);
assert.deepEqual(RP.plateaus.map(x => [x.id, x.kind, x.words]), [['PLT-001', 'current', 'Nothing introduced here'], ['PLT-002', 'target', 'Nothing introduced here']]);
assert.deepEqual(CP.passages.map(x => x.id), ['ownership', 'summary', 'scope', 'approach', 'trace', 'findings', 'actions', 'transition', 'specification', 'performance', 'review', 'baseline']);
assert.deepEqual(CP.passages.find(x => x.id === 'transition').confirm.map(f => f.id), ['ROADMAP-NO-ACTION:PLT-002'], 'the plan\'s checks sit on the Transition passage, to confirm');
assert.equal(CP.toConfirm, C11.toConfirm + 1); assert.equal(CP.toFix, C11.toFix);
assert.deepEqual(RP.chapters.slice(0, 10).map(c => [c.blockers, c.gaps, c.review]), R.chapters.slice(0, 10).map(c => [c.blockers, c.gaps, c.review]), 'the chapters\' counts are untouched by the plan');
pass('plateaus: an empty list and the same passages without them; with them a Transition passage in Chapter 11 carries the plan\'s checks as to confirm and no other count moves');

// 7. The domain lens (round 12, D-14; domain-lens.js): no passage without one; with the lens the person chose, its
// passage after the performance specification, each concern partly or not addressed an item to confirm, nothing to fix,
// no count moved, and the link to the lens on Validate.
const withLens = applyLensCommand(project, {type: 'lens.choose', payload: {lensId: 'core-banking', reason: 'Readiness suite: the lens\'s passage.'}}, '2026-10-07T09:00:00.000Z', 'readiness-suite').document;
const CL = chapterChecks(withLens, 11), lensPart = CL.passages.find(x => x.id === 'lens'), LR = lensReport(withLens);
assert.deepEqual(CL.passages.map(x => x.id), ['ownership', 'summary', 'scope', 'approach', 'trace', 'findings', 'actions', 'specification', 'performance', 'lens', 'review', 'baseline']);
assert.equal(lensPart.ref, 'Domain lens · core banking'); assert.equal(lensPart.fix.length, 0);
assert.equal(lensPart.confirm.length, LR.counts.partly + LR.counts['not-addressed']);
assert.deepEqual([CL.toFix, CL.toConfirm, CL.passing], [C11.toFix, C11.toConfirm, C11.passing], 'the lens blocks nothing and counts no finding');
assert.deepEqual(sddReadiness(withLens).chapters.map(c => [c.blockers, c.gaps, c.review, c.state]), R.chapters.map(c => [c.blockers, c.gaps, c.review, c.state]), 'the readiness line is the same');
assert.match(sddContributionHTML(withLens, 11), /Domain lens · core banking[\s\S]*Open the lens/);
assert.equal(JSON.stringify(project), before, 'choosing works on a copy');
pass('the domain lens: no passage without one; with the lens chosen, "Domain lens · core banking" after the performance specification, one item to confirm per concern partly or not addressed, nothing to fix, no count or readiness state moved, "Open the lens"');

// Round 12 (D2): AIW's proposals and the values no source states are each one item to confirm per chapter.
{
  const at = '2026-10-08T10:00:00.000Z';
  const {applyCanonical} = await import('./public/canonical-command.js');
  let q = createProject({name: 'Readiness proposals', template: 'blank'}, 'readiness-proposals', at);
  const run = (type, payload) => { const r = applyCanonical(q, {type, payload}, at, 'architect-a'); q = r.document; return r.selected; };
  const a = run('realisation.component', {title: 'Intake service', kind: 'service', purpose: 'Takes applications.'});
  const b = run('realisation.component', {title: 'Notice worker', kind: 'worker', purpose: 'Sends notices.'});
  run('realisation.interaction', {from: a, to: b, label: 'Hands over', interaction: 'sync'});
  run('runtime.environment', {title: 'Production', assetIds: [a, b]});
  for (const ch of [8, 10]) {
    const checks = chapterChecks(withFinalReview(q), ch), items = JSON.stringify(checks);
    assert.ok(items.includes('Review the proposals'), 'Chapter ' + ch + ' asks to review the proposals once');
  }
  pass('round 12: AIW\'s proposals are one item to confirm per chapter in the readiness reading');
}

console.log(JSON.stringify({suite: 'SDD readiness', passed: checks.length, checks, limits: ['Readiness counts the chapters\' own findings and Chapter 11\'s treatments; it approves nothing.']}, null, 2));
