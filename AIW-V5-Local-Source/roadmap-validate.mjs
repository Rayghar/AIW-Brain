// The roadmap (round 6, Contract S): plateaus, assignments and the plateau an action names, changed only through the
// review commands with their bounds and refusals; what is present as of a plateau, the marks a picture paints for it,
// its readiness, the plan's findings, the SDD's Transition section and the ArchiMate exchange's plateaus, gaps and
// work packages; and a project without plateaus unchanged everywhere. Run: npm run test:roadmap
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import * as rv from './public/review-domain.js';
import {sddReadiness, chapterChecks, CHECK_WORDS} from './public/readiness-model.js';
import * as rd from './shared/roadmap-domain.js';
import {archimateExchange} from './public/model-exchange.js';
import {archimateRelationship} from './public/notation-palette.js';
import {applyCanonical, STAGED_COMMANDS, ROADMAP_COMMANDS} from './public/canonical-command.js';
import {setMarks, clearMarks, mergeMarks, marksInfo} from './public/model-marks.js';
import {createProject} from './shared/projects-domain.js';
import {applyRequirementsCommand} from './public/requirement-commands.js';
import {applyInterfacesCommand} from './public/interfaces-domain.js';
import {draftArchitecture, applyDraftBundle} from './public/architecture-drafter.js';

const checks = [], pass = name => checks.push(name);
const at = '2026-10-02T10:00:00.000Z';
const cmd = (p, type, payload, actor = 'architect-a') => rv.applyFinalReviewCommand(p, {type: 'review.' + type, payload}, at, actor).document;
const refuse = (p, type, payload, re) => assert.throws(() => cmd(p, type, payload), re);
const base = rv.withFinalReview(seedProject()), before = JSON.stringify(base);

// 1. The default: a project without plateaus reads exactly as before.
assert.deepEqual(base.roadmap, {schemaVersion: 1, counters: {plateau: 0}, plateaus: [], assignments: {}, history: []});
assert.equal('roadmap' in rv.reviewSource(base), false, 'the roadmap is outside the design source');
assert.deepEqual(rd.plateausOf(base), []); assert.deepEqual(rd.plateauMarks(base, 'PLT-001'), {marks: [], info: null}); assert.equal(rd.asOf(base, 'PLT-001'), null);
assert.deepEqual(rd.plateauReadiness(base), []); assert.deepEqual(rd.roadmapFindings(base), []); assert.equal(rd.transitionSection(base, 'full'), ''); assert.equal(rd.transitionSection(base, 'executive'), '');
assert.deepEqual(rd.roadmapOf({}).plateaus, [], 'a document without the key reads as empty'); assert.deepEqual(rd.plateauSteps(null, base), []);
assert.deepEqual(sddReadiness(base).plateaus, []); assert.equal(chapterChecks(base, 11).passages.length, 11, 'the ten passages and the Architecture requirements specification gate (round 11)'); assert.equal(rv.finalFindings(base).some(f => f.code.startsWith('ROADMAP')), false);
assert.equal(rv.assembleSDD(base).includes('## Transition'), false);
{const stripped = structuredClone(base); delete stripped.roadmap; const X = archimateExchange(base), Y = archimateExchange(stripped);
 assert.equal(X.document, Y.document, 'the ArchiMate exchange is byte for byte what it was'); assert.equal(X.report.roadmap, undefined); assert.deepEqual(X.report.limits, Y.report.limits); assert.equal(/Plateau|WorkPackage|"Gap"/.test(X.document), false);}
assert.deepEqual(rd.roadmapObjects(base).map(o => o.id).sort(), rv.reviewObjects(base).filter(o => o.chapter >= 4 && o.chapter <= 10).map(o => o.id).sort(), 'the records a plateau can hold are the connected model\'s Chapters 4–10');
assert.equal(JSON.stringify(base), before, 'reading changes nothing');
pass('a project without plateaus is unchanged everywhere: the default roadmap, no marks, no readiness rows, no findings, no SDD section, the same Chapter 11 passages, the same ArchiMate file');

// 2. The commands and their authority: review commands, never staged.
// Round 12 adds a group's place on a plateau and the migration records (GR-DRF-14, GR-RUN-05): review commands too.
assert.deepEqual([...ROADMAP_COMMANDS].sort(), ['review.migration', 'review.migration-remove', 'review.plateau', 'review.plateau-assign', 'review.plateau-group', 'review.plateau-remove']);
for (const type of ROADMAP_COMMANDS) { assert.equal(STAGED_COMMANDS.has(type), false); assert.throws(() => applyCanonical(structuredClone(base), {type, payload: {}}), /chapter review workflow/); }
let p = cmd(structuredClone(base), 'action', {title: 'Earlier action', owner: 'Fixture owner', due: '2026-10-01', acceptance: 'Recorded.', objectIds: ['api'], findingId: ''});
const stamp = rv.reviewSourceStamp(p), version = p.finalReview.version;
p = cmd(p, 'plateau', {title: 'As is', kind: 'current', order: 1, purpose: 'The design as it runs today.'});
p = cmd(p, 'plateau', {title: 'Next', kind: 'transition', order: 2, due: '2026-12-31', purpose: 'The notification path.'});
p = cmd(p, 'plateau', {title: 'Target', kind: 'target', order: 3, due: '2027-06-30'});
assert.deepEqual(rd.plateausOf(p).map(x => [x.id, x.kind, x.order, x.due, x.revision]), [['PLT-001', 'current', 1, '', 1], ['PLT-002', 'transition', 2, '2026-12-31', 1], ['PLT-003', 'target', 3, '2027-06-30', 1]]);
assert.equal(rv.reviewSourceStamp(p), stamp, 'the design stamp does not move'); assert.equal(p.finalReview.version, version + 3, 'each command is a review version'); assert.equal(p.finalReview.checks, null);
assert.ok(rv.actionCurrent(p, p.finalReview.actions[0]), 'the earlier action stays current');
refuse(p, 'plateau', {title: '', kind: 'transition', order: 4}, /Name the plateau/);
refuse(p, 'plateau', {title: 'X', kind: 'milestone', order: 4}, /current state, a transition or the target/);
refuse(p, 'plateau', {title: 'X', kind: 'transition', order: 2}, /already has order 2/);
refuse(p, 'plateau', {title: 'X', kind: 'transition', order: 0}, /whole-number order from 1/);
refuse(p, 'plateau', {title: 'X', kind: 'transition', order: 1.5}, /whole-number order/);
refuse(p, 'plateau', {title: 'Now too', kind: 'current', order: 9}, /one current state/);
refuse(p, 'plateau', {title: 'X', kind: 'transition', order: 4, due: '2026-13-40'}, /YYYY-MM-DD/);
refuse(p, 'plateau', {id: 'PLT-099', title: 'X', kind: 'transition', order: 4}, /existing plateau/);
refuse(p, 'plateau-remove', {id: 'PLT-099'}, /existing plateau/);
{let q = p; for (let i = 4; i <= 50; i++) q = cmd(q, 'plateau', {title: 'Step ' + i, kind: 'transition', order: i}); assert.equal(rd.plateausOf(q).length, 50); refuse(q, 'plateau', {title: 'One more', kind: 'transition', order: 51}, /up to 50 plateaus/); q = cmd(q, 'plateau', {id: 'PLT-050', title: 'Step 50, renamed', kind: 'transition', order: 50}); assert.equal(rd.plateauOf(q, 'PLT-050').revision, 2, 'an edit is a revision, not a new plateau');}
// Edit: the current state may be renamed and keep its kind; the order may move.
p = cmd(p, 'plateau', {id: 'PLT-001', title: 'As is', kind: 'current', order: 1, purpose: 'Today.'}); assert.equal(rd.plateauOf(p, 'PLT-001').revision, 2);
pass('the three commands are review commands and never staged; a plateau needs a name, a kind, a unique whole-number order and a well-formed or empty due date; one current state; fifty plateaus at most; edits are revisions');

// 3. Assignments: Chapters 4–10's records, introduced before retired; null clears.
refuse(p, 'plateau-assign', {objectId: 'REQ-001', introducedIn: 'PLT-002'}, /Chapters 4–10/);
refuse(p, 'plateau-assign', {objectId: 'nowhere', introducedIn: 'PLT-002'}, /Chapters 4–10/);
refuse(p, 'plateau-assign', {objectId: 'api', introducedIn: 'PLT-099'}, /existing plateau for "introduced in"/);
refuse(p, 'plateau-assign', {objectId: 'api', introducedIn: 'PLT-003', retiredIn: 'PLT-002'}, /introduced before it is retired/);
refuse(p, 'plateau-assign', {objectId: 'api', introducedIn: 'PLT-002', retiredIn: 'PLT-002'}, /introduced before it is retired/);
p = cmd(p, 'plateau-assign', {objectId: 'api', introducedIn: 'PLT-002', retiredIn: null});
p = cmd(p, 'plateau-assign', {objectId: 'audit', introducedIn: 'PLT-003', retiredIn: null});
p = cmd(p, 'plateau-assign', {objectId: 'core-adapter', introducedIn: null, retiredIn: 'PLT-003'});
p = cmd(p, 'plateau-assign', {objectId: 'ext-core', introducedIn: 'PLT-001', retiredIn: 'PLT-002'});
p = cmd(p, 'plateau-assign', {objectId: 'env-001', introducedIn: 'PLT-002', retiredIn: 'PLT-003'});
assert.deepEqual(p.roadmap.assignments, {api: {introducedIn: 'PLT-002', retiredIn: null}, audit: {introducedIn: 'PLT-003', retiredIn: null}, 'core-adapter': {introducedIn: null, retiredIn: 'PLT-003'}, 'ext-core': {introducedIn: 'PLT-001', retiredIn: 'PLT-002'}, 'env-001': {introducedIn: 'PLT-002', retiredIn: 'PLT-003'}});
{const q = cmd(cmd(p, 'plateau-assign', {objectId: 'worker', introducedIn: 'PLT-003'}), 'plateau-assign', {objectId: 'worker', introducedIn: null, retiredIn: null}); assert.equal('worker' in q.roadmap.assignments, false, 'null on both sides clears'); assert.equal(q.roadmap.history.at(-1).action, 'cleared');}
refuse(p, 'plateau-remove', {id: 'PLT-002'}, /Clear what names PLT-002 first: 3 assignments \(api, ext-core, env-001\)/);
assert.deepEqual(p.roadmap.history.map(h => h.action), ['added', 'added', 'added', 'changed', 'assigned', 'assigned', 'assigned', 'assigned', 'assigned']);
assert.ok(p.roadmap.history.every(h => h.at === at && h.actor === 'architect-a'), 'every history entry says when and who');
pass('an assignment names a record of Chapters 4–10 and existing plateaus, introduced before retired; null on both sides clears it; a plateau that assignments name cannot be removed; the history says who did what');

// 4. As of a plateau, and the marks a picture paints.
const total = rd.roadmapObjects(p).length; assert.equal(total, 69);
assert.deepEqual([rd.asOf(p, 'PLT-001').size, rd.asOf(p, 'PLT-002').size, rd.asOf(p, 'PLT-003').size], [total - 3, total - 2, total - 3]);
assert.ok(rd.asOf(p, 'PLT-001').has('ext-core') && !rd.asOf(p, 'PLT-002').has('ext-core'), 'retired at a plateau is absent from it on');
assert.ok(!rd.asOf(p, 'PLT-001').has('api') && rd.asOf(p, 'PLT-002').has('api') && rd.asOf(p, 'PLT-003').has('api'), 'introduced at a plateau is present from it on');
assert.ok(rd.asOf(p, 'PLT-001').has('worker') && rd.asOf(p, 'PLT-003').has('worker'), 'an unassigned record is present at every plateau');
const M1 = rd.plateauMarks(p, 'PLT-001'), M2 = rd.plateauMarks(p, 'PLT-002'), M3 = rd.plateauMarks(p, 'PLT-003');
assert.deepEqual(M1.marks, [{id: 'api', state: 'ghost', note: 'Introduced in Next'}, {id: 'audit', state: 'ghost', note: 'Introduced in Target'}, {id: 'env-001', state: 'ghost', note: 'Introduced in Next'}, {id: 'ext-core', state: 'changed', note: 'Introduced here'}]);
assert.deepEqual(M2.marks, [{id: 'api', state: 'changed', note: 'Introduced here'}, {id: 'audit', state: 'ghost', note: 'Introduced in Target'}, {id: 'env-001', state: 'changed', note: 'Introduced here'}, {id: 'ext-core', state: 'dimmed', note: 'Retired here'}]);
assert.deepEqual(M3.marks, [{id: 'audit', state: 'changed', note: 'Introduced here'}, {id: 'core-adapter', state: 'dimmed', note: 'Retired here'}, {id: 'env-001', state: 'dimmed', note: 'Retired here'}, {id: 'ext-core', state: 'dimmed', note: 'Retired in Next'}]);
assert.deepEqual([M2.info.introduced, M2.info.retired, M2.info.actions], [['api', 'env-001'], ['ext-core'], []]);
assert.deepEqual(M2.info.plateau, {id: 'PLT-002', title: 'Next', kind: 'transition', order: 2, due: '2026-12-31'}); assert.deepEqual(M2.info.words, {changed: 'Introduced here', ghost: 'Not yet introduced', dimmed: 'Retired'});
// Through the marks channel (model-marks.js), source `plateau`: a ghost is a ghost, dimmed dims, changed is the state.
setMarks('plateau', M2.marks, M2.info); const merged = mergeMarks();
assert.equal(merged.get('audit').ghost, true); assert.equal(merged.get('ext-core').dimmed, true); assert.equal(merged.get('api').state, 'changed'); assert.equal(merged.get('api').word, 'changed'); assert.equal(marksInfo('plateau').plateau.id, 'PLT-002'); clearMarks('plateau');
assert.deepEqual(rd.plateauSteps(null, p).map(s => [s.id, s.title, s.marks.length]), [['PLT-001', 'Current state · As is', 4], ['PLT-002', 'Transition · Next', 4], ['PLT-003', 'Target · Target', 4]], 'one build-up step per plateau, in order');
pass('as of a plateau: introduced at or before and not retired at or before, unassigned records everywhere; the marks: introduced here is changed, later is a ghost, retired at or before is dimmed, each with its note, and they travel the marks channel; one build-up step per plateau');

// 5. Readiness per plateau, in readiness-model.js's words.
const R = rd.plateauReadiness(p);
assert.deepEqual(R.map(r => [r.id, r.introduced, r.retired, r.records, r.state, r.words]), [
  ['PLT-001', 1, 0, {pass: 0, fix: 0, confirm: 0, unknown: 1}, 'none', '1 not checked'],
  ['PLT-002', 2, 1, {pass: 0, fix: 1, confirm: 1, unknown: 0}, 'fix', '1 ' + CHECK_WORDS.fix + ' · 1 ' + CHECK_WORDS.confirm],
  ['PLT-003', 1, 2, {pass: 0, fix: 1, confirm: 0, unknown: 0}, 'fix', '1 ' + CHECK_WORDS.fix]
], 'the records each plateau introduces, as their passages read: a party the checks never read is counted, not judged');
assert.equal(R[1].marked, '✕ 1 to fix · ○ 1 to confirm'); assert.ok(R.every(r => r.known));
assert.deepEqual(R.map(r => r.actions), [{total: 0}, {total: 0}, {total: 0}]);
assert.deepEqual(sddReadiness(p).plateaus, R, 'sddReadiness carries the same rows');
// The reading is readiness-model.js's, registered when it loads; without it the words say so rather than count what was not read.
assert.ok(rd.recordReadinessRegistered(), 'readiness-model.js registered its per-record reading');
{const was = rd.registerRecordReadiness(null); try { const R0 = rd.plateauReadiness(structuredClone(p)); assert.deepEqual(R0.map(r => [r.known, r.state, r.words, r.marked]), Array(3).fill([false, 'none', 'Readiness not read', 'Readiness not read'])); assert.ok(rd.transitionSection(structuredClone(p), 'full').includes('| Readiness not read |')); } finally { rd.registerRecordReadiness(was); } assert.ok(rd.recordReadinessRegistered());}
{const S = sddReadiness(p), S0 = sddReadiness(structuredClone(base)); assert.deepEqual(S.chapters.slice(0, 10).map(c => [c.gaps, c.review, c.blockers]), S0.chapters.slice(0, 10).map(c => [c.gaps, c.review, c.blockers]), 'no chapter count moves');}
pass('readiness per plateau counts the records it introduces in the one vocabulary (passing, to fix, to confirm; a record the checks never read is "not checked"), with its actions\' states; sddReadiness carries the rows and no other count moves; without readiness-model.js\'s reading the words say "Readiness not read"');

// 6. The plan's findings, before and after an action; the Transition passage in Chapter 11.
// The earlier action already names api, so api is planned; audit and env-001 are introduced with no action naming them.
assert.deepEqual(rd.roadmapFindings(p).map(f => f.id), ['ROADMAP-NO-ACTION:PLT-002', 'ROADMAP-NO-ACTION:PLT-003', 'ROADMAP-UNPLANNED:audit', 'ROADMAP-UNPLANNED:env-001']);
assert.ok(rd.roadmapFindings(p).every(f => f.level === 'warning' && f.title && f.detail && f.objectId));
refuse(p, 'action', {title: 'x', owner: '', due: '', acceptance: '', objectIds: ['api'], findingId: '', plateauId: 'PLT-999'}, /existing plateau for this action/);
p = cmd(p, 'action', {title: 'Build the API', owner: 'Team', due: '2026-11-30', acceptance: 'The API answers in production design.', objectIds: ['api', 'env-001'], findingId: '', plateauId: 'PLT-002'});
assert.equal(p.finalReview.actions.at(-1).plateauId, 'PLT-002');
assert.deepEqual(rd.roadmapFindings(p).map(f => f.id), ['ROADMAP-NO-ACTION:PLT-003', 'ROADMAP-UNPLANNED:audit'], 'an action naming the plateau and the record settles the plateau\'s and the record\'s finding');
assert.deepEqual(rd.plateauMarks(p, 'PLT-002').info.actions, ['RA-002']); assert.deepEqual(rd.plateauReadiness(p)[1].actions, {total: 1, Planned: 1});
assert.deepEqual(rv.finalFindings(p).filter(f => f.code.startsWith('ROADMAP')).map(f => [f.id, f.level, f.objectId]), [['ROADMAP-NO-ACTION:PLT-003', 'warning', 'PLT-003'], ['ROADMAP-UNPLANNED:audit', 'warning', 'audit']]);
const C11 = chapterChecks(p, 11), T = C11.passages.find(x => x.id === 'transition');
assert.deepEqual(C11.passages.map(x => x.id), ['ownership', 'summary', 'scope', 'approach', 'trace', 'findings', 'actions', 'transition', 'specification', 'performance', 'review', 'baseline']);
assert.deepEqual(T.confirm.map(f => f.id), ['ROADMAP-NO-ACTION:PLT-003', 'ROADMAP-UNPLANNED:audit']); assert.equal(T.status, 'confirm');
assert.equal(C11.toConfirm, chapterChecks(structuredClone(base), 11).toConfirm + 2, 'readiness counts them as to confirm');
// A target with no path; an assignment put out of order by moving a plateau.
{let q = cmd(structuredClone(base), 'plateau', {title: 'Only a target', kind: 'target', order: 5}); assert.deepEqual(rd.roadmapFindings(q).map(f => f.id), ['ROADMAP-NO-ACTION:PLT-001', 'ROADMAP-NO-PATH:PLT-001']); q = cmd(q, 'plateau', {title: 'Today', kind: 'current', order: 1}); assert.deepEqual(rd.roadmapFindings(q).map(f => f.id), ['ROADMAP-NO-ACTION:PLT-001']);}
{const q = cmd(p, 'plateau', {id: 'PLT-002', title: 'Next', kind: 'transition', order: 5, due: '2026-12-31'}); assert.deepEqual(rd.plateausOf(q).map(x => x.id), ['PLT-001', 'PLT-003', 'PLT-002'], 'the order moved'); assert.deepEqual(rd.roadmapFindings(q).filter(f => f.code === 'ROADMAP-ORDER').map(f => f.id), ['ROADMAP-ORDER:env-001'], 'introduced (now order 5) after retired (order 3) is a finding; ext-core, order 1 to 5, is still in order');}
pass('the plan\'s findings: a transition or target without an action, a record introduced with no action naming it, a target with no path, an assignment out of order; an action with the plateau and the record settles its two; they sit on Chapter 11\'s Transition passage as to confirm');

// 7. The Transition section of the SDD, both editions, and where the full edition carries it.
const full = rd.transitionSection(p, 'full'), exec = rd.transitionSection(p, 'executive');
assert.ok(full.startsWith('## Transition\n\n3 plateaus: As is as the current state, 1 transition, Target as the target.'));
assert.ok(full.includes('| Plateau | Kind | Due | Introduces | Retires | Readiness | Actions |'));
assert.ok(full.includes('| PLT-001 · As is | Current state | — | 1 | 0 | 1 not checked | 0 |'));
assert.ok(full.includes('| PLT-002 · Next | Transition | 2026-12-31 | 2 | 1 | 1 to fix · 1 to confirm | 1 |'));
assert.ok(full.includes('| PLT-003 · Target | Target | 2027-06-30 | 1 | 2 | 1 to fix | 0 |'));
assert.ok(full.includes('### Gap · As is → Next\n\nThe notification path.\n\nIntroduced here: LR-001 · Payment API; ENV-001 · Payment production design.\n\nRetired here: EXT-002 · Core banking authority.\n\nActions: RA-002 · Build the API — planned, owner Team, due 2026-11-30.'));
assert.ok(full.includes('### Gap · Next → Target\n\nIntroduced here: SEC-002 · Audit trail.\n\nRetired here: APP-003 · Core connector; ENV-001 · Payment production design.\n\nActions: none yet.'));
assert.ok(full.includes('Nothing here establishes that a transition has happened.'));
assert.ok(exec.includes('| PLT-002 · Next | Transition | 2026-12-31 | 2 | 1 | 1 to fix · 1 to confirm | 1 |'));
assert.ok(exec.includes('- Gap · As is → Next: introduces 2 (LR-001, ENV-001); retires 1 (EXT-002); 1 action (1 planned); due 2026-12-31.\n- Gap · Next → Target: introduces 1 (SEC-002); retires 2 (APP-003, ENV-001); no action yet; due 2027-06-30.'));
assert.equal(exec.includes('### Gap'), false, 'the executive edition gets one line per gap');
const md = rv.assembleSDD(p);
assert.ok(md.indexOf('\n## Transition\n') > md.indexOf('## Delivery and verification obligations') && md.indexOf('\n## Transition\n') < md.indexOf('## Source findings and review treatments'), 'the full edition carries it after the delivery obligations');
pass('the Transition section: the plateaus table with kind, due, introduces, retires, readiness and actions, then per transition the gap with what is introduced, what is retired and the actions with their states; the executive edition gets the table and one line per gap; the full edition carries it after the delivery obligations');

// 8. The ArchiMate exchange: plateaus, gaps and work packages, every relationship through the one palette rule.
const X = archimateExchange(p), doc = X.document;
const elements = [...doc.matchAll(/<element identifier="([^"]+)" xsi:type="(\w+)">/g)].map(m => [m[1], m[2]]), typeOf = new Map(elements);
assert.deepEqual(X.report.roadmap, {plateaus: 3, gaps: 2, workPackages: 2, relationships: 17, downgraded: (archimateRelationship('Triggering', 'Plateau', 'Plateau').kept ? 0 : 2) + (archimateRelationship('Triggering', 'WorkPackage', 'Plateau').kept ? 0 : 1)});
assert.deepEqual(elements.filter(([, t]) => ['Plateau', 'Gap', 'WorkPackage'].includes(t)).map(([, t]) => t).sort(), ['Gap', 'Gap', 'Plateau', 'Plateau', 'Plateau', 'WorkPackage', 'WorkPackage']);
assert.ok(['Gap', 'Plateau', 'WorkPackage'].every(t => X.report.elementTypes.includes(t)));
const ids = [...doc.matchAll(/ identifier="([^"]+)"/g)].map(m => m[1]); assert.equal(ids.length, new Set(ids).size, 'identifiers are unique');
const known = new Set(ids); for (const m of doc.matchAll(/(?:source|target)="([^"]+)"/g)) assert.ok(known.has(m[1]), m[1] + ' resolves');
const rels = [...doc.matchAll(/<relationship identifier="([^"]+)" xsi:type="(\w+)" source="([^"]+)" target="([^"]+)"/g)];
for (const [, , type, s, t] of rels) assert.ok(archimateRelationship(type, typeOf.get(s), typeOf.get(t)).kept, type + ' from ' + typeOf.get(s) + ' to ' + typeOf.get(t) + ' is allowed');
const decode = id => Buffer.from(id.replace(/^aiw_/, ''), 'hex').toString('utf8');
const road = rels.map(([, id, type, s, t]) => [decode(id), type, typeOf.get(s), typeOf.get(t)]).filter(([id]) => id.startsWith('roadmap:'));
assert.equal(road.length, 17);
assert.deepEqual(road.filter(([id]) => /^roadmap:PLT-00\d>PLT-00\d$/.test(id)).map(([, , s, t]) => [s, t]), [['Plateau', 'Plateau'], ['Plateau', 'Plateau']], 'a plateau to the next');
// rc41 close (C15): the palette's Implementation & Migration rules keep the triggerings — a plateau triggers the next and a
// work package the plateau it works towards — so the roadmap writes them as Triggering and downgrades none.
assert.deepEqual(road.filter(([id]) => /^roadmap:PLT-00\d>PLT-00\d$/.test(id) || id.endsWith(':towards')).map(([, type]) => type), ['Triggering', 'Triggering', 'Triggering'], 'the triggerings are kept');
assert.equal(X.report.roadmap.downgraded, 0, 'no roadmap relationship is downgraded');
assert.deepEqual(road.filter(([id]) => id.includes(':introduces:')).length, 4); assert.deepEqual(road.filter(([id]) => id.includes(':retires:')).length, 3);
assert.deepEqual(road.filter(([id]) => id.startsWith('roadmap:gap:')).map(([, type, s, t]) => [type, s, t]), Array(4).fill(['Association', 'Gap', 'Plateau']), 'each gap associated with both plateaus');
assert.deepEqual(road.filter(([id]) => id.endsWith(':towards')).map(([, , s, t]) => [s, t]), [['WorkPackage', 'Plateau']]);
assert.ok(doc.includes('<element identifier="' + 'aiw_' + Buffer.from('plateau:PLT-002').toString('hex') + '" xsi:type="Plateau"><name xml:lang="en">Next</name><documentation xml:lang="en">Transition · due 2026-12-31 · The notification path.</documentation>'));
assert.ok(doc.includes('xsi:type="Gap"><name xml:lang="en">Gap · As is → Next</name><documentation xml:lang="en">Introduces api, env-001; retires ext-core.</documentation>'));
assert.ok(doc.includes('xsi:type="WorkPackage"><name xml:lang="en">Build the API</name>'));
assert.ok(X.report.limits.at(-1).startsWith('Plateaus, gaps and work packages carry Chapter 11'));
assert.ok(X.report.downgradedRelationships.filter(d => d.id.startsWith('roadmap:')).every(d => d.wanted === 'Triggering'));
pass('the ArchiMate exchange carries each plateau as a Plateau, each step as a Gap associated with both plateaus, each action as a WorkPackage, with the plateau-to-plateau and work-package-to-plateau triggerings and the associations to what is introduced, retired and addressed; identifiers unique, every reference resolves, every relationship passes the one palette rule or is written as Association and reported');

// 9. A fresh project behaves the same; readers never write.
const blank = rv.withFinalReview(createProject({name: 'Blank', template: 'blank'}, 'blank-roadmap', at)), blankBefore = JSON.stringify(blank);
assert.deepEqual(rd.roadmapObjects(blank), []); assert.equal(rd.transitionSection(cmd(structuredClone(blank), 'plateau', {title: 'Today', kind: 'current', order: 1}), 'full').includes('| PLT-001 · Today | Current state | — | 0 | 0 | Nothing introduced here | 0 |'), true);
assert.equal(JSON.stringify(blank), blankBefore); assert.equal(JSON.stringify(base), before, 'the base document is untouched by every reading and by the commands on its copies');
pass('a blank project reads the same way; no reading writes the document');

// 10. Round 12 (GR-DRF-14): a requirement group placed on a plateau, by a person or, as Sol's proposal, by the imported
// delivery status: a group delivered whole on the current plateau, a group with gaps on the target.
const statuses = {'REQ-001': 'Delivered', 'REQ-002': 'Delivered', 'REQ-003': 'Partially delivered', 'REQ-004': 'Partially delivered', 'REQ-005': 'Not delivered'};
let g = rv.withFinalReview(seedProject());
for (const a of g.artefacts) if (statuses[a.id]) { a.assessment = {delivery: statuses[a.id]}; a.provenance = {datasetId: 'DS-001'}; }
g = applyRequirementsCommand(g, {type: 'requirements.group', payload: {title: 'Payment intake', kind: 'functional-area', memberIds: ['REQ-001', 'REQ-002']}}, at, 'architect-a').document;
g = applyRequirementsCommand(g, {type: 'requirements.group', payload: {title: 'Duplicate control', kind: 'functional-area', memberIds: ['REQ-003', 'REQ-004', 'REQ-005']}}, at, 'architect-a').document;
const ungrouped = g;
{let q = cmd(structuredClone(g), 'plateau', {title: 'Today', kind: 'current', order: 1});
 q = cmd(q, 'plateau', {title: 'Tomorrow', kind: 'target', order: 2});
 q = cmd(q, 'plateau-group', {groupId: 'RG-002', plateauId: 'PLT-002'});
 assert.deepEqual(rd.groupPlacements(q), {'RG-002': {plateauId: 'PLT-002', basis: 'person', at, actor: 'architect-a'}}, 'a person places a group');
 assert.deepEqual(rd.plateauGroups(q).map(x => [x.id, x.groups.map(y => [y.id, y.members, y.delivered, y.gaps])]), [['PLT-001', []], ['PLT-002', [['RG-002', 3, 0, 3]]]], 'each plateau reads its groups with their members, delivered rows and gaps');
 assert.equal(q.roadmap.history.at(-1).action, 'group placed');
 refuse(q, 'plateau-group', {groupId: 'RG-099', plateauId: 'PLT-002'}, /existing requirement group/);
 refuse(q, 'plateau-group', {groupId: 'RG-001', plateauId: 'PLT-099'}, /existing plateau for the group/);
 refuse(q, 'plateau-remove', {id: 'PLT-002'}, /Clear what names PLT-002 first: 1 assignment \(RG-002\)/);
 const cleared = cmd(q, 'plateau-group', {groupId: 'RG-002', plateauId: ''});
 assert.deepEqual(rd.groupPlacements(cleared), {}, 'and clears the place'); assert.equal(cleared.roadmap.history.at(-1).action, 'group cleared');
 assert.equal(STAGED_COMMANDS.has('review.plateau-group'), false);}
// Drafting proposes the delivery status as each group's default plateau; the person who applies it applies a proposal.
const drafted = draftArchitecture(g, {chapters: ['delivery']}), places = drafted.chapters[0].records.filter(r => r.kind === 'placement');
assert.deepEqual(places.map(r => [r.commands[0].payload.groupId, r.commands[0].payload.plateauId, r.commands[0].payload.basis]), [['RG-001', '@draft:d.plateau.current', 'delivery status'], ['RG-002', '@draft:d.plateau.target', 'delivery status']], 'the group delivered whole on the current plateau, the group with gaps on the target');
const placed = applyDraftBundle(g, drafted, {actor: 'architect-a', jobId: 'roadmap', at}).document;
assert.deepEqual(rd.plateauGroups(placed).map(x => [x.kind, x.groups.map(y => [y.id, y.basis, y.delivered, y.gaps])]), [['current', [['RG-001', 'delivery status', 2, 0]]], ['target', [['RG-002', 'delivery status', 0, 3]]]]);
assert.ok(rd.plateausOf(placed).every(x => x.state === 'proposed' && x.origin === 'sol-draft'), 'the plateaus are Sol\'s proposals');
assert.deepEqual(draftArchitecture(placed, {chapters: ['delivery']}).counts.records, 0, 'a group placed already keeps its place');
pass('GR-DRF-14: a requirement group is placed on a plateau by a review command (refused for an unknown group or plateau; a plateau a group stands on is not removed until it is cleared), each plateau reads its groups with their members, delivered rows and gaps, and drafting proposes the imported delivery status as each group\'s default plateau (delivered whole on the current platform, with gaps on the target); a placed group keeps its place');

// 11. Round 12 (GR-RUN-05): a design that names an existing system to move from, with no plateau or no migration record
// tying the move to the plateaus, raises one finding; a migration record ties to plateaus and delivery actions.
assert.deepEqual(rd.migrationNeeds(ungrouped).any, false); assert.deepEqual(rd.roadmapFindings(ungrouped), []);
let m = applyInterfacesCommand(structuredClone(ungrouped), {type: 'interfaces.party', payload: {title: 'Ledger of record', purpose: 'The existing ledger the platform replaces.', kind: 'legacy system', status: 'retiring'}}, at).document;
m = applyInterfacesCommand(m, {type: 'interfaces.party', payload: {title: 'Card network', purpose: 'Clears card payments.', kind: 'payment network', status: 'current'}}, at).document;
let found = rd.roadmapFindings(m).filter(f => f.code.startsWith('ROADMAP-MIGRATION'));
const legacy = rd.migrationNeeds(m).parties;
assert.deepEqual(legacy.map(x => x.title), ['Ledger of record'], 'the retiring legacy system, not the current network');
assert.equal(found.length, 1, 'one finding for the design'); assert.equal(found[0].code, 'ROADMAP-MIGRATION'); assert.equal(found[0].detail.startsWith('The design names ' + legacy[0].ref + ', which moves from an existing system, and no plateau plans the transition.'), true);
assert.ok(rv.finalFindings(m).some(f => f.code === 'ROADMAP-MIGRATION'), 'Chapter 11\'s checks carry it');
const legacyId = legacy[0].id;
const plain = applyInterfacesCommand(structuredClone(ungrouped), {type: 'interfaces.party', payload: {title: 'Card network', purpose: 'Clears card payments.', kind: 'payment network', status: 'current'}}, at).document;
assert.equal(rd.roadmapFindings(plain).length, 0, 'a party that is not an existing system to move from asks for nothing');
m = cmd(m, 'plateau', {title: 'Today', kind: 'current', order: 1}); m = cmd(m, 'plateau', {title: 'Tomorrow', kind: 'target', order: 2});
found = rd.roadmapFindings(m).filter(f => f.code.startsWith('ROADMAP-MIGRATION'));
assert.equal(found.length, 1); assert.match(found[0].detail, /no migration record ties the move to the plateaus/);
m = cmd(m, 'action', {title: 'Cut over from the ledger of record', owner: 'Delivery lead', due: '2027-03-31', acceptance: 'Reconciled and rehearsed.', objectIds: [legacyId], findingId: '', plateauId: 'PLT-002'});
const cutover = m.finalReview.actions.at(-1).id;
refuse(m, 'migration', {title: '', plateauIds: []}, /Name the migration/);
refuse(m, 'migration', {title: 'Move', plateauIds: ['PLT-099']}, /existing plateaus: PLT-099 is not in the plan/);
refuse(m, 'migration', {title: 'Move', actionIds: ['RA-099']}, /existing delivery actions: RA-099 is not in the plan/);
refuse(m, 'migration', {title: 'Move', reconciliation: 'x'.repeat(2001)}, /at most 2000 characters/);
const unlinked = cmd(m, 'migration', {title: 'Move from the ledger of record'});
assert.deepEqual(rd.roadmapFindings(unlinked).filter(f => f.code.startsWith('ROADMAP-MIGRATION')).map(f => [f.code, f.objectId]), [['ROADMAP-MIGRATION', 'project'], ['ROADMAP-MIGRATION-LINKS', 'MIG-001']], 'a migration record with no plateau and no action is tied to nothing');
m = cmd(m, 'migration', {title: 'Move from the ledger of record', source: 'Ledger of record', target: 'The new ledger', scope: 'Accounts and balances', volumes: '', reconciliation: 'Balances agree to the cent at cut-over.', parallelRun: 'Two month-ends side by side.', rollback: 'Return to the ledger of record within the window.', rehearsal: '', plateauIds: ['PLT-001', 'PLT-002'], actionIds: [cutover], open: {volumes: {state: 'not-stated'}, rehearsal: {state: 'not-stated'}}});
const mig = rd.migrationsOf(m)[0];
assert.deepEqual([mig.id, mig.plateauIds, mig.actionIds, mig.open.volumes.state, mig.reconciliation], ['MIG-001', ['PLT-001', 'PLT-002'], [cutover], 'not-stated', 'Balances agree to the cent at cut-over.']);
assert.deepEqual(rd.roadmapFindings(m).filter(f => f.code.startsWith('ROADMAP-MIGRATION')), [], 'a migration record tied to the plateaus and an action answers it');
refuse(m, 'plateau-remove', {id: 'PLT-001'}, /Clear what names PLT-001 first: 1 migration record \(MIG-001\)/);
assert.equal(STAGED_COMMANDS.has('review.migration'), false);
const removed = cmd(m, 'migration-remove', {id: 'MIG-001'});
assert.deepEqual(rd.migrationsOf(removed), []); assert.equal(rd.roadmapFindings(removed).filter(f => f.code === 'ROADMAP-MIGRATION').length, 1, 'removed, the finding is back');
refuse(removed, 'migration-remove', {id: 'MIG-001'}, /existing migration record/);
pass('GR-RUN-05: a design naming a legacy or retiring party raises one finding (no plateau; then plateaus but no migration record), carried by Chapter 11\'s checks; a migration record names its source, target, scope, volumes, reconciliation, parallel run, rollback and rehearsal (each stated or not stated), is refused untitled, with an unknown plateau or action, or past its bounds, and tied to both plateaus and a delivery action it answers the finding; a record tied to nothing raises its own; a plateau a migration names is not removed; removing the record brings the finding back');

console.log(JSON.stringify({suite: 'Roadmap: plateaus, transitions and the target', passed: checks.length, checks, limits: ['Readiness per plateau reads the chapters\' own checks and the actions\' recorded states; it approves nothing and establishes no transition.', 'The ArchiMate triggerings between plateaus and from a work package to its plateau are kept by the palette\'s Implementation & Migration rules; what a plateau introduces or retires, and what an action addresses, stays an Association.']}, null, 2));
