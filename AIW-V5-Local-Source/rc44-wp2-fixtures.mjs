// AIW rc44, work package wp2 (applied patterns bound to the model): the fixtures of rc44-wp2-adoption-validate.mjs.
// Slice S1 creates this file; later slices append exports at the end only (audit/rc44/design/wp2-adoption.md §g).
// Synthetic material only: the Bank Payment reference with three guided design tasks applied the way a project applied
// them before the adoption record existed (architecture.start, architecture.answers, architecture.prepare,
// alternative.apply: a typed reviewer name, no signed-in second person), and a server that holds that project.
import assert from 'node:assert/strict';
import {reference} from './rc44-s0-readings.mjs';
import {compositionFixtureAnswers} from './composition-fixtures.mjs';
import {applyArchitectureCommand} from './public/architecture-design.js';
import {previewAlternative, applyAlternativeCommand} from './public/model-alternatives.js';
import {withFinalReview} from './public/review-domain.js';
import {localDatabase} from './local-db.js';

export const APPLIED_AT = '2026-10-02T09:00:00.000Z';
export const A = 'architect-a', B = 'architect-b', C = 'architect-c', AGENT = 'sol-drafter';
const CONTEXT = {contextReview: 'Retain the recorded decisions and constraints.'};
const PERSISTENCE = {dataScope: 'Payment instructions', classification: 'Internal', retention: 'Retain completed instructions for the declared audit period.', isolation: 'Only the payment authority writes; recovery material uses separate credentials and audited restore access.', owner: 'Payments operations', transactionScope: 'aggregate', invariant: 'A single instruction holds its outcome; no instruction is settled twice.', accessPattern: 'Lookup an instruction by ID and record its outcome.', writePolicy: 'Only the payment application commits state; acknowledge success after the selected durable commit policy.', concurrency: 'Use a version condition on the instruction; re-read after conflict.', failure: 'On timeout, query the original request reference before retrying; never report failure as proof that no commit occurred.', schemaPlan: 'Version the schema, validate writes and exercise an upgrade and rollback with representative records.', aggregateBound: 'Bound each instruction and archive settled ones.', rpoSeconds: '300', rtoSeconds: '900', recoveryPlan: 'Retain a protected backup and a complete required change chain in a separately controlled location. Monitor gaps; restore into isolation and reconcile before opening writes. Align backup expiry and deletion with retention.', restoreTest: 'Exercise a corrupt active store, restore a selected point, compare acknowledged references, measure loss and total outage, and record the owner sign-off.', processorTitle: 'Instruction authority', storeTitle: 'Instruction persistence', recoveryTitle: 'Instruction recovery repository', trustName: 'Payments data boundary', trustPolicy: 'Authenticated authority and isolated recovery access.', reason: 'Keep the declared invariant local and accept operating duties for protected recovery material.', ...CONTEXT};
// The three applied tasks: an outbox between the Payment service and the Notification worker (its store, relay and
// channel are new components), a protected call from the Payment service to the Core connector, and the persistence
// of payment instructions (three new components).
export const APPLIED = [
  {topic: 'delivery', optionId: 'transactional-outbox', requirementId: 'REQ-005', driverId: 'QD-006', answers: {...compositionFixtureAnswers, ...CONTEXT, processorId: 'api-pod', consumerId: 'notify-worker'}},
  {topic: 'resilience', optionId: 'protected-call', requirementId: 'REQ-004', driverId: 'QD-004', answers: {...compositionFixtureAnswers, ...CONTEXT, callerId: 'api-pod', processorId: 'core-adapter'}},
  {topic: 'persistence', optionId: 'aggregate-document', requirementId: 'REQ-001', driverId: 'QD-002', answers: PERSISTENCE}
];
const lastTask = d => d.coauthoring.designTasks.at(-1);
// One task applied through the path a project used before the adoption record: the four commands, in order, each sent
// through `send(type, payload)`, which answers the document after it (a pure handler here, the server below).
export async function applyLegacy(read, send, {topic, optionId, requirementId, driverId, answers}) {
  await send('architecture.start', {requirementId, driverId, topic});
  let t = lastTask(await read());
  await send('architecture.answers', {id: t.id, taskRevision: t.revision, answers});
  t = lastTask(await read());
  const prepared = await send('architecture.prepare', {id: t.id, taskRevision: t.revision, optionId});
  const d = await read(), alt = d.modelAlternatives.records.find(a => a.id === prepared.selected), preview = previewAlternative(withFinalReview(structuredClone(d)), alt);
  await send('alternative.apply', {id: alt.id, alternativeRevision: alt.revision, previewStamp: preview.stamp, reviewed: true, reviewer: 'Synthetic architect', reason: 'Fixture: apply ' + topic + '.'});
  return lastTask(await read()).id;
}
// The Bank Payment reference with the three tasks applied, as a document written before the adoption record: it holds
// no adoption, and nothing in it names one.
let applied = null;
export function bankPaymentApplied() {
  if (!applied) {
    let d = structuredClone(reference('bank-payment'));
    const send = (type, payload) => { const r = (type.startsWith('alternative.') ? applyAlternativeCommand : applyArchitectureCommand)(d, {type, payload}, APPLIED_AT); d = withFinalReview(r.document, {upgrade: false}); return r; };
    for (const task of APPLIED) { const before = d.coauthoring?.designTasks?.length || 0; applySync(() => d, send, task); assert.equal(d.coauthoring.designTasks.length, before + 1); assert.equal(lastTask(d).status, 'applied'); }
    applied = JSON.stringify(d);
  }
  return withFinalReview(beforeAdoptions(JSON.parse(applied)), {upgrade: false});
}
// A document as it was written before the adoption record existed. Where the package is registered (the server, and
// this suite once worker.js is imported) every read of a document runs the read upgrades, the package's step among
// them, and the handlers read the document they are handed; so a document built here through the handlers may hold
// adoptions already. This takes out what that step writes (the adoptions, each task's adoptionId, the package's name),
// which the suite asserts is all it writes.
export function beforeAdoptions(d) {
  const x = structuredClone(d); delete x.adoptions;
  for (const t of x.coauthoring?.designTasks || []) delete t.adoptionId;
  if (x.workspace?.packages) { x.workspace.packages = x.workspace.packages.filter(id => id !== 'p40-adoption'); if (!x.workspace.packages.length) delete x.workspace.packages; }
  return x;
}
// The same four commands without the promises (the pure handlers answer at once).
function applySync(read, send, {topic, optionId, requirementId, driverId, answers}) {
  send('architecture.start', {requirementId, driverId, topic});
  let t = lastTask(read());
  send('architecture.answers', {id: t.id, taskRevision: t.revision, answers});
  t = lastTask(read());
  const prepared = send('architecture.prepare', {id: t.id, taskRevision: t.revision, optionId});
  const d = read(), alt = d.modelAlternatives.records.find(a => a.id === prepared.selected), preview = previewAlternative(d, alt);
  send('alternative.apply', {id: alt.id, alternativeRevision: alt.revision, previewStamp: preview.stamp, reviewed: true, reviewer: 'Synthetic architect', reason: 'Fixture: apply ' + topic + '.'});
}
// A server with the reference project and four accounts (three persons and an agent account), as rc44-s0's harness
// builds it. `send` answers {status, body, error}; `read` the project as the account reads it; `apply` applies the
// tasks above through the server, as person A, so that the next read finds applied tasks without adoptions.
export async function server(worker) {
  const files = new Map(), FILES = {async put(k, v) { files.set(k, v); }, async get(k) { return files.has(k) ? {text: async () => files.get(k)} : null; }, async delete(k) { files.delete(k); }};
  const env = {DB: localDatabase(':memory:'), FILES, ASSETS: {fetch: () => new Response('asset')}, AIW_AGENT_ACTORS: AGENT};
  const api = (path, method = 'GET', body = null, owner = A) => { const headers = new Headers({'oai-authenticated-user-id': owner}); if (body) { headers.set('Content-Type', 'application/json'); headers.set('Origin', 'https://aiw.test'); } return worker.fetch(new Request('https://aiw.test' + path, {method, headers, ...(body ? {body: JSON.stringify(body)} : {})}), env); };
  const h = {env, api, files, state: await (await api('/api/project')).json()};
  h.pid = h.state.document.id; h.q = '?project=' + encodeURIComponent(h.pid);
  for (const actorId of [B, C, AGENT]) assert.equal((await api('/api/access' + h.q, 'POST', {actorId, role: 'editor'})).status, 200);
  h.read = async (as = A) => (h.state = await (await api('/api/project' + h.q, 'GET', null, as)).json());
  h.send = async (type, payload, as = A, extra = {}) => { const cur = await h.read(as), res = await api('/api/commands' + h.q, 'POST', {revision: cur.revision, command: {type, payload}, ...extra}, as), body = await res.json(); if (res.status === 200) h.state = body; return {status: res.status, body, error: body.error || ''}; };
  h.ok = async (type, payload, as = A, extra = {}) => { const r = await h.send(type, payload, as, extra); assert.equal(r.status, 200, type + ': ' + JSON.stringify(r.body).slice(0, 400)); return r.body; };
  h.doc = () => h.state.document;
  h.apply = async (tasks = APPLIED) => { for (const task of tasks) await applyLegacy(async () => (await h.read()).document, (type, payload) => h.ok(type, payload), task); return (await h.read()).document; };
  h.activity = async () => (await api('/api/activity' + h.q)).json();
  h.close = () => env.DB.close();
  return h;
}

// ---- appended by the fix-up of slice S1 (the lead's rulings J1 to J12 of 2026-11-19)
import {createProject} from './shared/projects-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {applyKnowledgeCommand, knowledgeStamp} from './public/knowledge-governance.js';
// A released design concern compared and applied the way a project applied one before the adoption record (ruling
// J4): a synthetic source, one claim that offers a design concern with two options, reviewed, released and activated,
// then architecture.start on that concern, its answers, a prepared alternative and alternative.apply. Answers the
// document as it was written (no adoption), the claim receipt its task pins and the id of the release.
export function governedConcernApplied() {
  const at = '2026-10-11T12:00:00.000Z', k = (p, type, payload, actor = 'author') => applyKnowledgeCommand(p, {type, payload}, at, actor).document, arc = (p, type, payload) => applyArchitectureCommand(p, {type, payload}, at);
  let p = applyCommand(createProject({name: 'Synthetic equipment project', template: 'blank'}, 'concern-fixture'), {type: 'artefact', payload: {type: 'requirement', title: 'Reserve equipment', description: 'Report an authoritative reservation outcome.', acceptance: 'The original reference identifies one result.', owner: 'Facilities', source: 'Synthetic workshop', confirmed: true}}, at).document;
  p = withFinalReview(applyQualityCommand(p, {type: 'quality.driver', payload: {title: 'Reliable reservation', category: 'recoverability', requirementIds: ['REQ-001'], stimulus: 'Processing is unavailable.', conditions: 'Reservation intake remains open.', response: 'Restore accepted reservations.', metric: 'Recovery time', operator: 'At most', targetValue: '30', unit: 'minutes', window: 'For each accepted request', measurement: 'Failure exercise', targetConfirmed: true, confirmed: true, owner: 'Facilities'}}, at).document, {upgrade: false});
  p = k(p, 'knowledge.source', {title: 'Synthetic architecture note', body: 'Synthetic architecture note\nCompare owning the schedule in one application with a separate service. Evaluate responsibility ownership and the cost of coordination.\n', path: 'synthetic/note.txt', revision: '1', license: 'Synthetic test material'});
  p = k(p, 'knowledge.claim', {sourceId: p.knowledge.sources.at(-1).id, lineStart: 2, lineEnd: 2, subjectId: 'design-concern:service-ownership', predicate: 'offers a design concern', claimType: 'applicability', polarity: 'neutral', statement: 'Compare local ownership and a separate service boundary.', conditions: ['For an architecture with two responsibilities.'], limitations: ['The source makes no measured reliability claim.'], tags: ['title:Service ownership', 'question:Where should reservation ownership live?', 'criterion:ownership|Ownership|Who owns the schedule and its changes?', 'criterion:recovery|Recovery|What happens during an outage?', 'option:local|One application|The modules share one release boundary.', 'option:separate|Separate service|A network contract and recovery coordination are required.']});
  p = k(p, 'knowledge.review', {id: p.knowledge.claims[0].id, reviewed: true, reviewer: 'Second reviewer', reason: 'Verified source and limited interpretation.', decision: 'verified', sourceChecked: true, rightsChecked: true, conditionsChecked: true}, 'reviewer');
  p = k(p, 'knowledge.release', {reviewed: true, reviewer: 'Second reviewer', reason: 'Release this synthetic concern.', title: 'Synthetic concern', claimIds: [p.knowledge.claims[0].id]});
  p = k(p, 'knowledge.activate', {reviewed: true, reviewer: 'Second reviewer', reason: 'Use the reviewed concern.', id: p.knowledge.releases[0].id, stamp: knowledgeStamp(p)});
  p = arc(p, 'architecture.start', {requirementId: 'REQ-001', driverId: 'QD-001', topic: 'knowledge:service-ownership'}).document;
  let t = p.coauthoring.designTasks[0];
  p = arc(p, 'architecture.answers', {id: t.id, taskRevision: t.revision, answers: {criteriaNotes: JSON.stringify({local: {ownership: 'Facilities owns both modules and the schedule.', recovery: 'Restore one process and reconcile reservations.'}, separate: {ownership: 'A separate team owns the schedule contract.', recovery: 'Coordinate partial failure across services.'}}), owner: 'Facilities architect', reason: 'Local ownership fits the present team; accept shared deployment.'}}).document;
  t = p.coauthoring.designTasks[0];
  const prepared = arc(p, 'architecture.prepare', {id: t.id, taskRevision: t.revision, optionId: 'local'}); p = prepared.document;
  const alternative = p.modelAlternatives.records.find(a => a.id === prepared.selected), preview = previewAlternative(p, alternative);
  p = applyAlternativeCommand(p, {type: 'alternative.apply', payload: {id: alternative.id, alternativeRevision: alternative.revision, previewStamp: preview.stamp, reviewed: true, reviewer: 'Independent project architect', reason: 'Reviewed both source-grounded options and criterion notes.'}}, at).document;
  const document = withFinalReview(beforeAdoptions(p), {upgrade: false});
  assert.equal(document.coauthoring.designTasks[0].status, 'applied');
  return {document, receipt: document.coauthoring.designTasks[0].governedConcern.receipt, releaseId: document.knowledge.releases[0].id, at};
}
// A knowledge command of that fixture, with a typed reviewer and the stamp an activation step asks for.
export const knowledgeCommand = (p, type, payload, at, actor = 'author') => applyKnowledgeCommand(p, {type, payload: {reviewed: true, reviewer: 'Second reviewer', ...payload, ...(type === 'knowledge.deactivate' || type === 'knowledge.activate' ? {stamp: knowledgeStamp(p)} : {})}}, at, actor).document;
// The Bank Payment reference with one applied task of another kind (an exchange), as a document written before the
// adoption record: its applied records name a component, a contract, a data definition and a technology need (records
// the graph holds as objects), a Chapter 4 allocation (a record the graph keeps as a relation) and a record that has
// left the document since.
export function otherKindApplied() {
  const d = structuredClone(reference('bank-payment'));
  (d.coauthoring ??= {schemaVersion: 1, counters: {source: 0, task: 0}, sources: [], tasks: []}).designTasks = [{id: 'DES-009', kind: 'exchange', title: 'Exchange instruction status', status: 'applied', requirementId: 'REQ-001', answers: {}, basis: {contextIds: []}, history: [],
    applied: {at: APPLIED_AT, alternativeId: 'ALT-009', reviewer: 'Synthetic architect', reason: 'Fixture.', changeIds: [], records: [
      {id: 'api-pod', ref: 'OBJ-001', title: 'Payment service', chapter: 5, slot: 'provider', isNew: false}, {id: 'rest', ref: 'IF-001', title: 'A contract', chapter: 8, slot: 'contract', isNew: true},
      {id: 'instruction', ref: 'DAT-001', title: 'Payment instruction', chapter: 8, slot: 'payload', isNew: false}, {id: 'TN-001', ref: 'TN-001', title: 'A need', chapter: 6, slot: 'need', isNew: false},
      {id: 'MAP-001', ref: 'MAP-001', title: 'An allocation', chapter: 4, slot: 'allocation', isNew: true}, {id: 'gone-001', ref: 'OBJ-099', title: 'A component that left', chapter: 5, slot: 'consumer', isNew: true}]}}];
  return withFinalReview(d, {upgrade: false});
}

// ---- appended by slice S5 (component selection as a recorded decision; audit/rc44/design/wp2-adoption.md §g S5)
import {applyWorkbenchCommand} from './public/workbench-domain.js';
import {componentSnapshot} from './public/component-snapshot.js';
import {snapshotText, COMPONENT_ARCHETYPES} from './public/component-library.js';
export const SELECTION_AT = '2026-10-20T09:00:00.000Z';
// A released design concern whose criteria are tied to a quality category and a driver kind (the K2 shapes of
// design-concern-validate.mjs, synthetic): four drivers, a source, the concern released and activated. The guided
// comparison of it and the selection of its options are compared on this document (design §e.1 row 9).
export const CONCERN_NOTES = {local: {recovery: 'Restore one process and reconcile reservations.', operations: 'Facilities runs the rebuild.'}, separate: {recovery: 'Coordinate partial failure across services.', operations: 'A platform team runs the rebuild.'}};
export const CONCERN_ANSWERS = {criteriaNotes: JSON.stringify(CONCERN_NOTES), owner: 'Facilities architect', reason: 'One application fits the present team.'};
export function concernProject() {
  const at = SELECTION_AT, k = (p, type, payload, actor = 'author') => applyKnowledgeCommand(p, {type, payload}, at, actor).document, REVIEW = {reviewed: true, reviewer: 'Second reviewer', reason: 'Verified source and limited interpretation.'};
  let q = applyCommand(createProject({name: 'Synthetic scheduling project', template: 'blank'}, 'selection-concern'), {type: 'artefact', payload: {type: 'requirement', title: 'Reserve equipment', description: 'Report an authoritative reservation outcome.', acceptance: 'The original reference identifies one result.', owner: 'Facilities', source: 'Synthetic workshop', confirmed: true}}, at).document;
  const scenario = {requirementIds: ['REQ-001'], stimulus: 'Processing is unavailable.', conditions: 'Intake remains open.', response: 'Restore accepted reservations.', metric: 'Recovery time', operator: 'At most', targetValue: '30', unit: 'minutes', window: 'For each accepted request', measurement: 'Failure exercise', owner: 'Facilities'};
  for (const x of [{...scenario, title: 'Reliable reservation', category: 'recoverability', priority: 'High', targetConfirmed: true, confirmed: true}, {...scenario, title: 'Bookings stay open', category: 'availability', priority: 'Medium'}, {kind: 'operational', title: 'Nightly schedule rebuild', description: 'The schedule is rebuilt every night.', priority: 'Medium', owner: 'Facilities', requirementIds: ['REQ-001']}, {...scenario, title: 'Restore the schedule', category: 'recoverability', priority: 'Low'}]) q = withFinalReview(applyQualityCommand(q, {type: 'quality.driver', payload: x}, at).document, {upgrade: false});
  q = k(q, 'knowledge.source', {title: 'Synthetic scheduling note', body: 'Synthetic scheduling note\nCompare owning the schedule in one application with a separate service.\n', path: 'synthetic/schedule.txt', revision: '1', license: 'Synthetic test material'});
  const TAGS = ['title:Schedule ownership', 'question:Where should the schedule live?', 'criterion:recovery|Recovery|What happens during an outage?|recoverability|quality', 'criterion:operations|Operations|Who runs the nightly rebuild?||operational', 'option:local|One application|The modules share one release boundary.|A restore rehearsal of the shared release.', 'option:separate|Separate service|A network contract and recovery coordination are required.|A failover test across both services.', 'consequence:local|recovery|One restore point covers both modules.', 'consequence:separate|recovery|Each service restores on its own; reconcile across them.', 'consequence:local|operations|One team runs the nightly rebuild.', 'consequence:separate|operations|Two teams coordinate the nightly rebuild.'];
  q = k(q, 'knowledge.claim', {sourceId: q.knowledge.sources.at(-1).id, lineStart: 2, lineEnd: 2, subjectId: 'design-concern:schedule-ownership', predicate: 'offers a design concern', claimType: 'applicability', polarity: 'neutral', statement: 'Compare owning the schedule in one application with a separate service.', conditions: ['For a schedule two teams change.'], limitations: ['The source makes no measured recovery claim.'], tags: TAGS});
  q = k(q, 'knowledge.review', {...REVIEW, id: q.knowledge.claims[0].id, decision: 'verified', sourceChecked: true, rightsChecked: true, conditionsChecked: true}, 'reviewer');
  q = k(q, 'knowledge.release', {...REVIEW, title: 'Synthetic K2 concern', claimIds: [q.knowledge.claims[0].id]});
  q = k(q, 'knowledge.activate', {...REVIEW, id: q.knowledge.releases.at(-1).id, stamp: knowledgeStamp(q)});
  return withFinalReview(q, {upgrade: false});
}
// The guided comparison of that concern as a project made it before selections were records: architecture.start,
// its answers, a prepared alternative and the preview its reviewed apply takes (architecture-design.js). Answers the
// document the alternative was prepared on and the preview.
export function guidedConcernPreview(p = concernProject(), optionId = 'local') {
  const at = SELECTION_AT, arc = (d, type, payload) => applyArchitectureCommand(d, {type, payload}, at);
  let q = arc(p, 'architecture.start', {requirementId: 'REQ-001', driverId: 'QD-001', topic: 'knowledge:schedule-ownership'}).document, t = q.coauthoring.designTasks.at(-1);
  q = arc(q, 'architecture.answers', {id: t.id, taskRevision: t.revision, answers: CONCERN_ANSWERS}).document; t = q.coauthoring.designTasks.at(-1);
  const prepared = arc(q, 'architecture.prepare', {id: t.id, taskRevision: t.revision, optionId}); q = prepared.document;
  return {document: q, preview: previewAlternative(q, q.modelAlternatives.records.find(a => a.id === prepared.selected))};
}
// What a comparison's decision says, as the parity case compares it (design §e.4 for row 9): the decision's own fields
// and each alternative's, without the ids, revisions, history and source snapshots each command writes.
const DECISION_SAYS = ['question', 'context', 'requirementIds', 'driverIds', 'owner', 'source', 'rationale', 'assumptions', 'risks', 'mitigation', 'status', 'topic'], ALTERNATIVE_SAYS = ['title', 'summary', 'benefits', 'costs', 'consequences', 'pattern', 'antiPattern', 'assessments', 'rejectionReason', 'responsibilityIds', 'componentIds', 'relationships'];
export const decisionSays = d => d && {...Object.fromEntries(DECISION_SAYS.map(k => [k, d[k] ?? null])), chosen: d.alternatives.find(a => a.id === d.selectedAlternativeId)?.title ?? null, alternatives: d.alternatives.map(a => Object.fromEntries(ALTERNATIVE_SAYS.map(k => [k, a[k] ?? null])))};
// The Bank Payment reference made ready for a component selection: two constraint drivers on the Payment API's
// requirement (each hard: no constraint record says Should or Could), a project library entry, and knowledge of three
// synthetic component profiles, each a claim with a structured architecture unit whose scope states its typed facts:
// two reviewed by a second person, released and activated, one left a candidate nobody reviewed (read, never selected).
export const PROFILE_FACTS = {inbox: {product: 'Synthetic inbox', version: '2.1', topology: 'single-region-north'}, relay: {product: 'Synthetic relay', version: '1.4', topology: 'multi-region'}, outbox: {product: 'Synthetic outbox relay', version: '0.9', topology: 'single-region-north'}};
export function selectionProject() {
  const at = SELECTION_AT, k = (p, type, payload, actor = 'author') => applyKnowledgeCommand(p, {type, payload}, at, actor).document, REVIEW = {reviewed: true, reviewer: 'Second reviewer', reason: 'Verified source and limited interpretation.'};
  let p = structuredClone(reference('bank-payment'));
  for (const x of [{kind: 'constraint', title: 'Customer records stay in region North', description: 'Payment instructions and customer records are kept in region North.', impact: 'Rules out a component that stores them elsewhere.', priority: 'High', requirementIds: ['REQ-001']}, {kind: 'constraint', title: 'Run only what the platform team operates', description: 'Every component of the payment path runs on the platform the platform team operates.', impact: 'Rules out a component outside that platform.', priority: 'High', requirementIds: ['REQ-001']}]) p = withFinalReview(applyQualityCommand(p, {type: 'quality.driver', payload: x}, at).document, {upgrade: false});
  p = applyWorkbenchCommand(p, {type: 'workspace.catalogue', payload: {kind: 'component', title: 'Ticket consumer v2', content: snapshotText(componentSnapshot(p, 'notify-worker', {at})), owner: 'Platform team', reviewNote: 'A consumer filed from the notification worker.'}}, at, 'architect').document;
  p = k(p, 'knowledge.source', {title: 'Synthetic component profiles', body: 'Synthetic component profiles\nAn inbox that deduplicates by message id and keeps its data in region North.\nA relay that forwards messages across regions.\nAn outbox relay that publishes committed intents from the store.\n', path: 'synthetic/profiles.txt', revision: '1', license: 'Synthetic test material'});
  const sid = p.knowledge.sources.at(-1).id, profile = (key, line, title, mechanism) => ({sourceId: sid, lineStart: line, lineEnd: line, subjectId: 'component-profile:' + key, predicate: 'is profiled as', claimType: 'component-attribute', polarity: 'neutral', statement: mechanism, conditions: ['For a payment path of this kind.'], limitations: ['The source makes no measured claim.'], tags: ['title:' + title],
    architectureUnit: {kind: 'product-mechanism', mechanism, scope: PROFILE_FACTS[key], effects: [{quality: 'integrity', direction: 'supports', rationale: 'One effect per message id, as the profile states.'}], obligations: [{action: 'Keep the deduplication key with each message.', evidence: 'A replay test shows one effect per message id.'}, {action: 'Name the region the data is kept in.', evidence: 'The deployment record names the region.'}]}});
  p = k(p, 'knowledge.claim', profile('inbox', 2, 'Inbox and deduplication component', 'An inbox that deduplicates by message id and keeps its data in region North.'));
  p = k(p, 'knowledge.claim', profile('relay', 3, 'Regional message relay', 'A relay that forwards messages across regions.'));
  p = k(p, 'knowledge.claim', profile('outbox', 4, 'MSG 004 Transactional outbox relay', 'An outbox relay that publishes committed intents from the store.'));
  const [inbox, relay] = p.knowledge.claims.slice(-3);
  for (const c of [inbox, relay]) p = k(p, 'knowledge.review', {...REVIEW, id: c.id, decision: 'verified', sourceChecked: true, rightsChecked: true, conditionsChecked: true}, 'reviewer');
  p = k(p, 'knowledge.release', {...REVIEW, title: 'Synthetic component profiles', claimIds: [inbox.id, relay.id]});
  p = k(p, 'knowledge.activate', {...REVIEW, id: p.knowledge.releases.at(-1).id, stamp: knowledgeStamp(p)});
  return withFinalReview(p, {upgrade: false});
}
export const ARCHETYPE = COMPONENT_ARCHETYPES[0];
