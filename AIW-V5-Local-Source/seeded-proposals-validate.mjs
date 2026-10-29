// AIW's proposals (round 12, D-13, DM-17). In a person's project the records AIW makes by itself (technology needs read
// from a component's words, a contract for each interaction, a plan for each part of a saved environment and a path for
// each contract that reaches one) are proposals: state 'proposed', origin 'seeded'. A proposal counts in no check but
// one finding per chapter that names it. A person keeps it (it becomes theirs, origin 'suggestion'), completes it (an
// edit makes it authored, origin 'user', the earlier origin kept in its history) or dismisses it with a reason: it
// leaves for the project's retired records with who, when and why, AIW does not propose it again, and a restore brings
// it back as it was. Plans and paths are created and retired on purpose; a contract still named by an authored record is
// not retired. Each decision is a governed command, journalled through the Worker.
// Round 12 (GR-GOV-23): keeping, dismissing, removing and restoring go through the one lifecycle family of every chapter
// (record.keep, record.retire, record.restore; record-lifecycle.js); the per-chapter commands are retired, refused when
// a request names one and read as the family when a stored journal does. (GR-SEC-05) The trust boundaries AIW gives a
// project's Chapter 6 are proposals too. Run: npm run test:seeded-proposals
import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {applyCommand, seedProject} from './public/requirements-domain.js';
import {applyCanonical, STAGED_COMMANDS, migrateCommand, isRetiredCommand} from './public/canonical-command.js';
import {applyWorkbenchCommand, rebaseWorkingAlternative} from './public/workbench-domain.js';
import {withRuntime} from './public/runtime-domain.js';
import * as tech from './public/technology-domain.js';
import * as itf from './public/interfaces-domain.js';
import * as rt from './public/runtime-domain.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {previewWorkingChange} from './public/workbench-domain.js';
import {authorOf, recordLabel} from './public/provenance.js';

const checks = [], pass = n => { checks.push(n); console.log('PASS', n); };
const at = '2026-10-08T10:00:00.000Z', later = '2026-10-08T11:00:00.000Z';
let p = createProject({name: 'Permits', template: 'blank'}, 'proposals-1', at);
const run = (type, payload, actor = 'architect-a', when = at) => { const r = applyCanonical(p, {type, payload}, when, actor); p = r.document; return r.selected; };
const tryRun = (type, payload) => applyCanonical(p, {type, payload}, at, 'architect-a');
p = applyCommand(p, {type: 'artefact', payload: {type: 'requirement', title: 'Accept an application', description: 'The service accepts a permit application.'}}, at).document;
const intake = run('realisation.component', {title: 'Intake service', kind: 'service', purpose: 'Takes applications.', technologyNeeds: 'Persist each application record and authenticate the caller.'});
const notices = run('realisation.component', {title: 'Notice worker', kind: 'worker', purpose: 'Sends notices.', technologyNeeds: 'Dispatch notices through a durable queue.'});
run('realisation.interaction', {from: intake, to: notices, label: 'Hands over an accepted application', interaction: 'event'});
run('technology.boundary', {title: 'Service zone', owner: 'Platform team', policy: 'Only named services cross.'});
const envId = run('runtime.environment', {title: 'Production', assetIds: [intake, notices]});

// 1. What AIW made by itself is a proposal, listed, and counted only once per chapter.
{
  const seeds = rt.seededRecords(p);
  assert.deepEqual(seeds.map(x => x.chapter + ':' + x.kind), ['6:need', '6:need', '6:need', '6:need', '8:contract', '10:plan', '10:plan', '10:path']);
  for (const r of [...p.technology.needs, ...p.interfaces.contracts, ...p.runtime.plans, ...p.runtime.paths]) assert.deepEqual([r.state, r.origin], ['proposed', 'seeded'], (r.ref || r.id) + ' is a proposal');
  assert.deepEqual(p.runtime.plans.map(r => [r.minReady, r.maxReplicas]), [['', ''], ['', '']], 'AIW states no replica count');
  assert.deepEqual([...new Set(p.technology.needs.map(n => n.criticality))], [''], 'AIW states no need\'s consequence');
  assert.equal(p.interfaces.contracts[0].kind, 'event', 'an event interaction proposes an event contract');
  assert.equal(p.technology.applicationBoundaries[intake], '', 'no trust boundary is assumed for a person\'s component');
  for (const [findings, n, refs] of [[tech.technologyFindings(p), 4, ['TN-001', 'TN-002', 'TN-003', 'TN-004']], [itf.interfaceFindings(p), 1, ['IF-001']], [rt.runtimeFindings(p), 3, ['RUN-001', 'RUN-002', 'RP-001']]]) {
    const f = findings.filter(x => x.code === 'proposals');
    assert.equal(f.length, 1, 'one proposals finding per chapter');
    assert.equal(f[0].level, 'warning'); assert.equal(f[0].ids.length, n);
    for (const ref of refs) assert.ok(f[0].detail.includes(ref), f[0].detail);
  }
  // A proposal counts in no other check: no need review, no contract definition, no plan or path policy.
  assert.ok(!tech.technologyFindings(p).some(f => ['need-review', 'unsupported', 'need-description'].includes(f.code)));
  assert.ok(!itf.interfaceFindings(p).some(f => f.objectId === 'if-001'));
  assert.ok(!rt.runtimeFindings(p).some(f => ['run-001', 'run-002', 'RP-001'].includes(f.objectId)));
  for (const t of ['record.keep', 'record.retire', 'record.restore']) assert.ok(STAGED_COMMANDS.has(t), t + ' is a design edit');
  pass('AIW\'s needs, contract, plans and path in a person\'s project are proposals (proposed, seeded, no replica count, no consequence, no assumed boundary), listed by seededRecords, named by one warning per chapter and left out of every other check');
}

// 2. Keep: the person's, with AIW as the origin of the words.
{
  const kept = tryRun('record.keep', {ids: ['TN-001'], chapter: 6}).document, n = kept.technology.needs.find(x => x.id === 'TN-001');
  // rc39: keeping makes the record the person's (AIW the origin of its words) and dates it; confirming it is the chapter's own review, never implied by Keep.
  assert.equal(n.state, undefined); assert.equal(n.origin, 'suggestion'); assert.equal(n.confirmed, false, 'kept, not confirmed'); assert.equal(n.keptAt, at);
  assert.ok(tech.technologyFindings(kept).some(f => f.needId === 'TN-001'), 'a kept need is checked');
  assert.ok(tech.technologyFindings(kept).some(f => f.code === 'not-stated' && f.items.some(x => x.objectId === 'TN-001' && x.field === 'criticality')), 'and its consequence is asked for, not taken from AIW');
  assert.throws(() => applyCanonical(kept, {type: 'record.keep', payload: {ids: ['TN-001']}}, at), /TN-001 is not proposed by AIW here/);
  assert.throws(() => tryRun('record.keep', {ids: []}), /Choose the records/);
  assert.ok(!(kept.retired?.records || []).length, 'keeping is not a retirement');
  const c = itf.contract(applyCanonical(p, {type: 'record.keep', payload: {ids: ['if-001']}}, at).document, 'if-001');
  assert.deepEqual([c.state, c.origin, c.revision, c.history.at(-1).origin], [undefined, 'suggestion', 2, 'seeded']);
  pass('keeping a proposal makes it the person\'s (no state, origin suggestion, the earlier origin in its history); it is checked from then on, its consequence asked for; a second keep and an empty keep are refused by name');
}

// 3. Complete: an edit makes it authored and fixes its origin.
{
  const edited = applyCanonical(p, {type: 'interfaces.contract', payload: {id: 'if-001', purpose: 'Carry an accepted application to the notice worker.'}}, at).document, c = itf.contract(edited, 'if-001');
  assert.deepEqual([c.state, c.origin, c.history.at(-1).origin, c.kind, c.title], [undefined, 'user', 'seeded', 'event', 'Hands over an accepted application'], 'the fields the save left out are kept');
  const plan = rt.plan(applyCanonical(p, {type: 'runtime.plan', payload: {id: 'run-001', owner: 'Intake on-call'}}, at, 'architect-a').document, 'run-001');
  assert.deepEqual([plan.state, plan.origin, plan.history.at(-1).origin, plan.owner], [undefined, 'user', 'seeded', 'Intake on-call']);
  const path = rt.runtimePath(applyCanonical(p, {type: 'runtime.path', payload: {id: 'RP-001', route: 'queue: accepted-applications'}}, at).document, 'RP-001');
  assert.deepEqual([path.state, path.origin, path.route, path.mode], [undefined, 'user', 'queue: accepted-applications', 'buffered']);
  const needs = applyCanonical(p, {type: 'technology.needs', payload: {applicationId: intake, needs: [{id: 'TN-001', category: 'transactional', description: 'Keep each application record durably.'}, {id: 'TN-002', category: 'identity'}]}}, at).document.technology.needs;
  assert.deepEqual(needs.filter(n => n.applicationId === intake).map(n => [n.id, n.state, n.origin]), [['TN-001', undefined, 'user'], ['TN-002', 'proposed', 'seeded']], 'only the need whose words changed becomes the person\'s');
  pass('completing a proposal makes it authored with origin user and the earlier origin in its history, keeps what the save left out, and leaves an untouched proposal a proposal');
}

// 4. Dismiss: retired with who, when and why; not proposed again; restored as it was.
{
  assert.throws(() => tryRun('record.retire', {ids: ['if-001'], chapter: 8}), /Say why IF-001 leaves the design/);
  assert.throws(() => tryRun('record.retire', {ids: ['if-001'], chapter: 8, reason: 'x'.repeat(2001)}), /holds up to 2,000 characters; 2,001 were sent/);
  const before = p;
  run('record.retire', {ids: ['if-001'], chapter: 8, reason: 'The notice worker reads the case store directly.'}, 'architect-b', later);
  assert.equal(p.interfaces.contracts.length, 0, 'the contract left the design');
  assert.equal(p.runtime.paths.length, 0, 'the path AIW proposed for it left with it');
  const kept = p.retired.records.find(x => x.id === 'if-001');
  assert.deepEqual([kept.path, kept.chapter, kept.at, kept.actor, kept.reason, kept.priorState, kept.record.state, kept.record.sourceId], ['interfaces.contracts', 8, later, 'architect-b', 'The notice worker reads the case store directly.', 'proposed', 'retired', before.interfaces.contracts[0].sourceId]);
  assert.deepEqual(p.retired.records.find(x => x.id === 'RP-001').with, 'if-001');
  run('runtime.environment', {id: envId, purpose: 'Serve applicants.'});
  run('technology.boundary', {title: 'Another zone', owner: 'Platform team', policy: 'Named services only.'});
  assert.equal(p.interfaces.contracts.length, 0, 'AIW does not propose the dismissed contract again');
  assert.equal(p.runtime.paths.length, 0);
  assert.equal(itf.interfaceFindings(p).filter(f => f.code === 'proposals').length, 0);
  assert.throws(() => tryRun('record.restore', {ids: ['RP-001']}), /RP-001 left the design with if-001; restore if-001 to bring it back/, 'a record that left with another comes back with it');
  run('record.restore', {ids: ['if-001']});
  assert.deepEqual(p.interfaces.contracts.map(c => [c.id, c.state, c.origin]), [['if-001', 'proposed', 'seeded']], 'restored as it was, a proposal again');
  assert.deepEqual(p.runtime.paths.map(r => [r.id, r.state]), [['RP-001', 'proposed']], 'with the path that left with it');
  assert.ok(!p.retired.records.some(x => ['if-001', 'RP-001'].includes(x.id)));
  assert.throws(() => tryRun('record.restore', {ids: ['if-001']}), /if-001 is not retired/);
  pass('a dismissal needs a reason (refused past 2,000 characters, never cut), retires the contract and the path AIW proposed for it with who, when and why, is not proposed again on later saves, and a restore brings both back as proposals');
}

// 5. Needs: dismissed with their mappings, never proposed again, restored.
{
  run('record.retire', {ids: ['TN-003', 'TN-004'], chapter: 6, reason: 'The notice worker keeps no records.'});
  assert.deepEqual(p.technology.needs.map(n => n.id), ['TN-001', 'TN-002']);
  run('realisation.component', {id: notices, title: 'Notice worker', kind: 'worker', purpose: 'Sends notices by email.', technologyNeeds: 'Dispatch notices through a durable queue.'});
  p = tech.applyTechnologyCommand(p, {type: 'technology.intake', payload: {}}, at).document;
  assert.deepEqual(p.technology.needs.map(n => n.id), ['TN-001', 'TN-002'], 'a known component is not read again');
  run('record.restore', {ids: ['TN-004']});
  assert.deepEqual(p.technology.needs.map(n => [n.id, n.state]), [['TN-001', 'proposed'], ['TN-002', 'proposed'], ['TN-004', 'proposed']]);
  pass('dismissed needs leave with their mappings and are not proposed again; one is restored as it was');
}

// 6. Plans and paths: created and retired on purpose; a plan retires with its placements and its part leaves the scope.
{
  const zoneId = run('runtime.zone', {environmentId: envId, title: 'Primary', failureDomain: 'Site A', isolation: 'Own power', owner: 'Ops', boundaryIds: [p.technology.boundaries[0].id]});
  run('record.keep', {ids: ['run-001', 'run-002'], chapter: 10});
  run('runtime.placement', {planId: 'run-001', zoneId, role: 'active', replicas: 2});
  assert.throws(() => tryRun('record.retire', {id: 'run-001'}), /Say why RUN-001 leaves the design/);
  run('record.retire', {id: 'run-001', reason: 'Intake moves to the shared platform.'});
  assert.ok(!p.runtime.plans.some(r => r.id === 'run-001') && !p.runtime.placements.length, 'the plan left with its placement');
  assert.ok(!rt.environment(p, envId).assetIds.includes(intake), 'its part left the environment');
  run('runtime.environment', {id: envId, assetIds: {add: [intake]}});
  assert.ok(!p.runtime.plans.some(r => r.assetId === intake), 'AIW proposes no new plan while the plan is retired');
  run('runtime.environment', {id: envId, assetIds: {remove: [intake]}});
  run('record.restore', {ids: ['run-001']});
  assert.deepEqual([rt.plan(p, 'run-001')?.state, p.runtime.placements.map(l => l.planId), rt.environment(p, envId).assetIds.includes(intake)], [undefined, ['run-001'], true], 'restored with its placement and its part');
  // A plan created on purpose: its part joins the scope.
  const third = run('realisation.component', {title: 'Payment adapter', kind: 'adapter', purpose: 'Takes fees.'});
  const made = run('runtime.plan', {environmentId: envId, assetId: third, title: 'Payment adapter runtime'});
  assert.deepEqual([rt.plan(p, made).origin, rt.plan(p, made).state, rt.environment(p, envId).assetIds.includes(third)], ['user', undefined, true]);
  assert.throws(() => tryRun('runtime.plan', {environmentId: envId, assetId: third, title: 'Twice'}), /already has a runtime plan/);
  // A path retired with its reason is not proposed again; one created on purpose is the person's, once.
  run('record.retire', {id: 'RP-001', reason: 'Notices go through the platform queue.'});
  run('runtime.environment', {id: envId, purpose: 'Serve applicants and staff.'});
  assert.ok(!p.runtime.paths.some(r => r.contractId === 'if-001'), 'AIW does not propose the retired path again');
  const pathId = run('runtime.path', {contractId: 'if-001', environmentId: envId, route: 'queue: applications'}), made2 = rt.runtimePath(p, pathId);
  assert.deepEqual([made2.origin, made2.state, made2.route, made2.mode], ['user', undefined, 'queue: applications', 'buffered']);
  assert.throws(() => tryRun('runtime.path', {contractId: 'if-001', environmentId: envId}), /already has a runtime path/);
  pass('a plan is created on purpose (its part joins the scope, once per part) and retired with a reason, its placements and its part leaving with it; AIW proposes no other plan while it is retired; a restore brings all of it back; a path is retired the same way');
}

// 7. A contract that an authored record names is not retired; an interaction whose type is not stated seeds none.
{
  run('record.keep', {ids: ['if-001']});
  const threat = run('security.threat', {title: 'Applications read by the wrong worker', category: 'Data disclosure', priority: 'High', targetIds: ['if-001'], actor: 'A misrouted worker', scenario: 'Reads an application it should not.', consequence: 'Disclosure.', owner: 'Security lead', priorityBasis: 'Personal data.'});
  const route = p.runtime.paths.find(r => r.contractId === 'if-001').id;
  assert.throws(() => tryRun('record.retire', {id: 'if-001', reason: 'Replaced by a shared queue.'}), new RegExp('IF-001 is still named by Chapter 9 · THR-001, Chapter 10 · ' + route + '\\. Remove those links first\\.'));
  run('security.threat', {id: threat, targetIds: {remove: ['if-001'], add: [intake]}});
  run('record.retire', {id: route, reason: 'The path goes with the contract.'});
  run('record.retire', {id: 'if-001', reason: 'Replaced by a shared queue.'});
  assert.ok(!p.interfaces.contracts.length && p.retired.records.some(x => x.id === 'if-001' && x.priorState === 'authored'), 'an authored contract retires as authored');
  const q = structuredClone(p); q.realisation.connections.push({id: 'INT-099', from: intake, to: notices, label: 'Not stated yet', interaction: '', kind: 'trace'});
  assert.ok(!itf.contractInputs(q).some(x => x.id === 'INT-099'), 'an interaction whose type is not stated seeds no contract');
  pass('a contract that an authored threat and an authored path name is refused retirement, naming them, until they let go; an authored contract retires as authored; an interaction whose type is not stated seeds no contract');
}

// 9. One lifecycle path (GR-GOV-23): the per-chapter commands are retired. A request that names one is refused by its
// chapter as unknown and is no design edit to stage; a stored journal that names one (an alternative staged before)
// is read as the family: its dismissal merges as a record.retire with its reason, chapter and dependents.
{
  const retired = ['technology.keep-seed', 'technology.dismiss-seed', 'technology.restore-seed', 'interfaces.keep-seed', 'interfaces.dismiss-seed', 'interfaces.restore-seed', 'interfaces.remove-contract', 'runtime.keep-seed', 'runtime.dismiss-seed', 'runtime.restore-seed', 'runtime.remove-plan', 'runtime.remove-path'];
  for (const t of retired) {
    assert.ok(!STAGED_COMMANDS.has(t) && isRetiredCommand(t), t + ' is retired');
    const apply = {technology: tech.applyTechnologyCommand, interfaces: itf.applyInterfacesCommand, runtime: rt.applyRuntimeCommand}[t.split('.')[0]];
    assert.throws(() => apply(p, {type: t, payload: {ids: ['x'], id: 'x', reason: 'A retired command.'}}, at), /^Error: Unknown .* action\.$/, t + ' is unknown to its chapter');
  }
  assert.deepEqual(migrateCommand({type: 'runtime.remove-plan', payload: {id: 'run-002', reason: 'Gone.'}}), {type: 'record.retire', payload: {ids: ['run-002'], chapter: 10, reason: 'Gone.'}});
  assert.deepEqual(migrateCommand({type: 'interfaces.keep-seed', payload: {ids: ['if-009']}}), {type: 'record.keep', payload: {ids: ['if-009'], chapter: 8}});
  // A project with a proposed contract and an alternative staged before the retirement, naming interfaces.dismiss-seed.
  let q = createProject({name: 'Journal', template: 'blank'}, 'journal-1', at);
  const step = (type, payload) => { const r = applyCanonical(q, {type, payload}, at, 'architect-a'); q = r.document; return r.selected; };
  const a = step('realisation.component', {title: 'Front desk', kind: 'service', purpose: 'Takes requests.'}), b = step('realisation.component', {title: 'Archive', kind: 'store', purpose: 'Keeps requests.'});
  step('realisation.interaction', {from: a, to: b, label: 'Files each request', interaction: 'sync'});
  q = itf.applyInterfacesCommand(q, {type: 'interfaces.intake', payload: {}}, at).document;
  const seed = q.interfaces.contracts[0].id;
  q.workbench = {version: 1, alternatives: [{id: 'WA-journal', revision: 1, title: 'Dismiss the filing contract', reason: 'Filing is a shared store read.', commands: [{type: 'interfaces.dismiss-seed', payload: {ids: [seed], reason: 'Filing is a shared store read.'}}], targets: [null], status: 'draft', at, actor: 'architect-a'}], analyses: [], catalogue: [], views: [], assignments: []};
  const r = rebaseWorkingAlternative(q, q.workbench.alternatives[0]);
  const merged = applyWorkbenchCommand(q, {type: 'workspace.merge', payload: {id: 'WA-journal', stamp: r.stamp, reviewed: true, reason: 'Staged before the one retire path.'}}, later, 'architect-b').document;
  assert.deepEqual(merged.interfaces.contracts.map(c => c.id), [], 'the stored dismissal retired the contract');
  const entry = merged.retired.records.find(x => x.id === seed);
  assert.deepEqual([entry.path, entry.chapter, entry.reason, entry.priorState], ['interfaces.contracts', 8, 'Filing is a shared store read.', 'proposed'], 'as record.retire keeps it');
  assert.equal(merged.workbench.alternatives[0].status, 'accepted');
  pass('one lifecycle path: the twelve per-chapter commands are retired (no design edit to stage, unknown to their chapters); a stored journal that names one is read as the family, so an alternative staged with interfaces.dismiss-seed merges as a record.retire with its reason, chapter and prior state');
}

// 10. The trust boundaries AIW gives a project's Chapter 6 are proposals (GR-SEC-05): a new blank project records none as
// if a person had; a project whose Chapter 6 AIW seeds gets three, each proposed, naming no owner and no policy, listed
// with the chapter's proposals and counted in no check until a person keeps, completes or dismisses it.
{
  assert.deepEqual(createProject({name: 'Empty', template: 'blank'}, 'empty-1', at).technology.boundaries, [], 'a new blank project records no trust boundary on anyone\'s behalf');
  // A project whose Chapter 6 AIW seeds the first time it is opened (its technology chapter was never written).
  let q = withRuntime({id: 'opened-1', name: 'Opened', workspace: {template: 'blank'}, artefacts: [], relationships: [], counters: {}, contentVersion: 1, brief: {problem: ''}});
  const bs = q.technology.boundaries;
  assert.deepEqual(bs.map(b => [b.id, b.state, b.origin, b.owner, b.policy, b.open.owner.state, b.open.policy.state]), ['tb-001', 'tb-002', 'tb-003'].map(id => [id, 'proposed', 'seeded', '', '', 'not-stated', 'not-stated']), 'proposals that state no owner and no crossing policy');
  assert.ok(!bs.some(b => /payment/i.test(b.title)), 'in words that belong to no domain');
  assert.deepEqual(rt.seededRecords(q).filter(x => x.kind === 'boundary').map(x => x.ref), ['TB-001', 'TB-002', 'TB-003']);
  const fs = tech.technologyFindings(q), f = fs.find(x => x.code === 'proposals');
  assert.ok(f && ['tb-001', 'tb-002', 'tb-003'].every(id => f.ids.includes(id)) && /trust boundaries a new project starts with/.test(f.detail), f?.detail);
  assert.ok(!fs.some(x => x.code === 'boundary-policy' || (x.code === 'not-stated' && x.items?.some(i => i.objectId.startsWith('tb-')))), 'a proposed boundary counts in no check');
  const step = (type, payload, actor = 'architect-a') => { const r = applyCanonical(q, {type, payload}, at, actor); q = r.document; return r.selected; };
  step('record.keep', {ids: ['tb-003'], chapter: 6});
  const kept = q.technology.boundaries.find(b => b.id === 'tb-003');
  assert.deepEqual([kept.state, kept.origin], [undefined, 'suggestion'], 'kept as the person\'s');
  assert.ok(tech.technologyFindings(q).some(x => x.code === 'not-stated' && x.items.some(i => i.objectId === 'tb-003' && i.field === 'owner')), 'its owner is asked for, not invented');
  // Dismissing a proposal another record names waits until it lets go.
  assert.throws(() => step('record.retire', {ids: ['tb-001'], chapter: 6, reason: 'Callers arrive through the shared gateway.'}), /TB-001 is still named by Chapter 6 · TC-005/);
  step('technology.capability', {id: 'gateway', boundaryId: 'tb-003'});
  step('record.retire', {ids: ['tb-001'], chapter: 6, reason: 'Callers arrive through the shared gateway.'}, 'architect-b');
  assert.ok(!q.technology.boundaries.some(b => b.id === 'tb-001') && q.retired.records.some(x => x.id === 'tb-001' && x.priorState === 'proposed' && x.actor === 'architect-b'));
  step('record.restore', {ids: ['tb-001']});
  assert.deepEqual(q.technology.boundaries.map(b => [b.id, b.state || 'authored']), [['tb-001', 'proposed'], ['tb-002', 'proposed'], ['tb-003', 'authored']], 'restored where it was, a proposal again');
  // The Bank Payment reference keeps its illustrative boundaries as they were.
  assert.deepEqual(withRuntime(seedProject()).technology.boundaries.map(b => [b.id, b.title, b.state, b.origin]), [['tb-001', 'Channel entry', undefined, undefined], ['tb-002', 'Payment services', undefined, undefined], ['tb-003', 'Restricted state', undefined, undefined]]);
  pass('the trust boundaries AIW gives a project\'s Chapter 6 are proposals that state no owner or policy: a new blank project has none recorded on anyone\'s behalf; each is listed with the chapter\'s proposals and in no other check; kept, its owner is asked for; dismissed once nothing names it, with who and why, and restored as a proposal; the Bank Payment reference keeps its own');
}

// 8. Through the Worker: each decision is a governed command, journalled with its actor.
{
  const DB = localDatabase(':memory:'), env = {DB, ASSETS: {fetch: () => new Response('asset')}};
  const api = (path, method = 'GET', body = null, owner = 'architect-a') => worker.fetch(new Request('https://aiw.test' + path, {method, headers: {'oai-authenticated-user-id': owner, ...(body ? {'Content-Type': 'application/json', Origin: 'https://aiw.test'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env);
  try {
    const created = await api('/api/projects', 'POST', {name: 'Journal', template: 'blank', brief: ''});
    assert.equal(created.status, 201);
    const id = (await created.json()).document.id;
    let state = await (await api('/api/project?project=' + id)).json();
    const send = async (type, payload) => { const res = await api('/api/commands?project=' + id, 'POST', {revision: state.revision, command: {type, payload}}); const body = await res.json(); assert.equal(res.status, 200, type + ': ' + JSON.stringify(body).slice(0, 300)); state = body; return body.selected; };
    const a = await send('realisation.component', {title: 'Intake service', kind: 'service', purpose: 'Takes applications.'});
    const b = await send('realisation.component', {title: 'Notice worker', kind: 'worker', purpose: 'Sends notices.'});
    await send('realisation.interaction', {from: a, to: b, label: 'Hands over an application', interaction: 'sync'});
    await send('interfaces.intake', {});
    assert.deepEqual(state.document.interfaces.contracts.map(c => c.state), ['proposed']);
    const retiredType = await api('/api/commands?project=' + id, 'POST', {revision: state.revision, command: {type: 'interfaces.dismiss-seed', payload: {ids: [state.document.interfaces.contracts[0].id], reason: 'Not an exchange we design.'}}});
    assert.equal(retiredType.status, 400, 'a request that names a retired per-chapter command is refused');
    assert.equal((await retiredType.json()).code, 'unknown_command');
    await send('record.retire', {ids: [state.document.interfaces.contracts[0].id], chapter: 8, reason: 'Not an exchange we design.'});
    const kept = state.document.retired.records[0];
    assert.deepEqual([kept.actor, kept.reason, kept.priorState], ['architect-a', 'Not an exchange we design.', 'proposed']);
    const activity = await (await api('/api/activity?project=' + id)).json();
    assert.ok(JSON.stringify(activity).includes('record.retire'), 'the dismissal is in the project\'s activity');
    const refused = await api('/api/commands?project=' + id, 'POST', {revision: state.revision, command: {type: 'record.retire', payload: {ids: ['if-001'], chapter: 8}}});
    assert.equal(refused.status, 400);
    pass('through the Worker a dismissal is a governed command of the one lifecycle family: it keeps the authenticated person as its actor, appears in the project\'s activity, and an empty reason is refused; a request naming a retired per-chapter command is refused as unknown');
  } finally { DB.close(); }
}

// 9. Completed through a reviewed workspace change (round 12, GR-TST-05): the proposal becomes the person's record, written
// by the signed-in person from AIW's proposal; the same change without the review is refused and changes nothing.
{
  const files = new Map(), DB = localDatabase(':memory:'), env = {DB, FILES: {async put(k, v) { files.set(k, v); }, async get(k) { return files.has(k) ? {text: async () => files.get(k)} : null; }, async delete(k) { files.delete(k); }}, ASSETS: {fetch: () => new Response('asset')}};
  const api = (path, method = 'GET', body = null, owner = 'architect-a') => worker.fetch(new Request('https://aiw.test' + path, {method, headers: {'oai-authenticated-user-id': owner, ...(body ? {'Content-Type': 'application/json', Origin: 'https://aiw.test'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env);
  try {
    const id = (await (await api('/api/projects', 'POST', {name: 'Completed proposals', template: 'blank', brief: ''})).json()).document.id;
    let state = await (await api('/api/project?project=' + id)).json();
    const post = async command => { const res = await api('/api/commands?project=' + id, 'POST', {revision: state.revision, command}); const body = await res.json(); if (res.status === 200) state = body; return {status: res.status, body}; };
    const send = async (type, payload) => { const r = await post({type, payload}); assert.equal(r.status, 200, type + ': ' + JSON.stringify(r.body).slice(0, 300)); return r.body.selected; };
    const a = await send('realisation.component', {title: 'Intake service', kind: 'service', purpose: 'Takes applications.'});
    const b = await send('realisation.component', {title: 'Notice worker', kind: 'worker', purpose: 'Sends notices.'});
    await send('realisation.interaction', {from: a, to: b, label: 'Hands over an application', interaction: 'sync'});
    await send('interfaces.intake', {});
    const seed = state.document.interfaces.contracts.find(c => c.state === 'proposed');
    assert.ok(seed, 'AIW proposed a contract'); assert.equal(authorOf(seed), 'seeded');
    const commands = [{type: 'interfaces.contract', payload: {id: seed.id, purpose: 'Carry an accepted application to the notice worker.', owner: 'Integration team'}}];
    const stamp = previewWorkingChange(state.document, commands).stamp, revision = state.revision;
    const unreviewed = await post({type: 'workspace.apply', payload: {commands, stamp, reviewed: false}});
    assert.equal(unreviewed.status, 400); assert.match(unreviewed.body.error, /Review/);
    assert.equal((await (await api('/api/project?project=' + id)).json()).revision, revision, 'the refused change saved nothing');
    const reviewed = await post({type: 'workspace.apply', payload: {commands, stamp, reviewed: true, reason: 'The contract is ours now.'}});
    assert.equal(reviewed.status, 200, JSON.stringify(reviewed.body).slice(0, 300));
    const c = state.document.interfaces.contracts.find(x => x.id === seed.id);
    assert.deepEqual([c.state, c.origin, c.purpose, c.owner], [undefined, 'user', 'Carry an accepted application to the notice worker.', 'Integration team']);
    assert.equal(authorOf(c), 'person');
    assert.deepEqual([c.provenance.author.kind, c.provenance.author.by, c.provenance.author.from], ['person', 'architect-a', 'seeded']);
    assert.equal(recordLabel(state.document, c, 8), 'Written by architect-a (from AIW\'s proposal)');
    assert.deepEqual(state.document.workbench.history.at(-1).author, {kind: 'person', account: 'person', reviewed: true});
    pass('a proposal completed through a reviewed workspace change becomes the person\'s record (no state, origin user, written by the signed-in person from AIW\'s proposal); the same change without the review is refused and saves nothing');
  } finally { DB.close(); }
}

console.log(JSON.stringify({suite: 'seeded-proposals', passed: checks.length, checks}, null, 1));
