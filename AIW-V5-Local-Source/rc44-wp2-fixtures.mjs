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
