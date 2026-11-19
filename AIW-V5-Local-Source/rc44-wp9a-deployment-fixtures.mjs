// AIW rc44, work package wp9a (deployment topology, reference blueprints and location gates): the fixtures of
// rc44-wp9a-deployment-validate.mjs. Slice 1 creates this file; later slices append exports at the end only
// (audit/rc44/design/wp9a-deployment.md, sections g and h).
// Synthetic material only: "Tidewater Ferries — vehicle-deck reservation service". Every name, figure and record is
// made up for this suite; no client material is used. The project is built from a blank project through the
// workbench's own design commands, as a person would build it, and holds no typed topology: no marker, no failure
// domain, no node. A case types it through the commands it tests.
import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyCanonical} from './public/canonical-command.js';
import {localDatabase} from './local-db.js';

export const BUILT_AT = '2026-10-05T09:00:00.000Z';
export const A = 'architect-a', B = 'architect-b', C = 'architect-c', AGENT = 'sol-drafter';

// The records the fixture starts with (design section h): two components, two realizations, one data definition, a
// production and a recovery environment, and an availability driver on the Reservation API. The ids are read from the
// document once it is built (ids below), never assumed.
const NAME = 'Tidewater Ferries — vehicle-deck reservation service';
let built = null, names = null, sent = null;
function build() {
  let p = withFinalReview(createProject({name: NAME, template: 'blank'}, 'tidewater-ferries', BUILT_AT));
  sent = [];
  const send = (type, payload) => { sent.push(structuredClone({type, payload})); const r = applyCanonical(p, {type, payload}, BUILT_AT, A); p = r.document; return r.selected; };
  const owner = 'Reservations team (synthetic)', source = 'Tidewater workshop notes (synthetic)';
  send('artefact', {type: 'requirement', title: 'Reserve a vehicle-deck space', description: 'A passenger reserves a deck space for a sailing and is told one outcome.', acceptance: 'One booking reference identifies one reservation outcome.', owner, source, confirmed: true});
  const requirement = p.artefacts.find(a => a.type === 'requirement').id;
  const responsibility = send('logical.responsibility', {title: 'Hold a deck space for a booking', purpose: 'Decide and keep which booking holds which deck space.', boundary: 'Reservations of one sailing.', owner, source, requirementIds: [requirement]});
  const api = send('realisation.component', {title: 'Reservation API', kind: 'service', purpose: 'Take and answer reservation requests.', boundary: 'The reservation of one sailing.', owner, source, allocations: [{logicalId: responsibility, scope: 'Reservation requests and their outcomes'}]});
  const worker = send('realisation.component', {title: 'Allocation worker', kind: 'worker', purpose: 'Allocate deck spaces to accepted bookings.', boundary: 'Deck plans and their allocations.', owner, source, allocations: []});
  const driver = send('quality.driver', {title: 'Reservations stay available', category: 'availability', requirementIds: [requirement], componentIds: [api], stimulus: 'A passenger asks for a reservation.', conditions: 'Any hour of a sailing day.', response: 'The reservation is taken or refused with a reason.', metric: 'Availability of the Reservation API', operator: 'At least', targetValue: '99.9', unit: '%', window: '30 days', measurement: 'Share of answered reservation requests (synthetic).', owner});
  send('technology.needs', {applicationId: api, needs: [{category: 'transactional', description: 'Keep reservations durably.', criticality: 'essential'}, {category: 'identity', description: 'Know who asks for a reservation.', criticality: 'essential'}]});
  const needs = p.technology.needs.filter(n => n.applicationId === api), need = category => needs.find(n => n.category === category).id;
  const storage = send('technology.capability', {title: 'Reservation storage', category: 'transactional', purpose: 'Durable reservations.', owner, failureDomain: 'Primary region', continuity: 'redundant', mappings: [{needId: need('transactional'), scope: 'Reservations'}]});
  const identity = send('technology.capability', {title: 'Passenger identity', category: 'identity', purpose: 'Identify the caller.', owner, failureDomain: 'Identity issuer', continuity: 'single', mappings: [{needId: need('identity'), scope: 'Callers of the Reservation API'}]});
  const store = send('techrealisation.plan', {title: 'Reservation store', purpose: 'A replicated relational store of reservations.', owner, mappings: [{capabilityId: storage, scope: 'Reservations'}]});
  const issuer = send('techrealisation.plan', {title: 'Identity service', purpose: 'Issues and checks caller identities.', owner, mappings: [{capabilityId: identity, scope: 'Caller identities'}]});
  const data = send('interfaces.data', {title: 'Passenger booking record', description: 'Who booked which deck space on which sailing.', classification: 'Confidential', personalData: 'yes', authorityId: api, owner, residency: 'must stay in Norway'});
  const production = send('runtime.environment', {title: 'Tidewater production', stage: 'Production design', purpose: 'Where reservations are taken.', owner, basis: 'Synthetic design scope.', assetIds: [api, worker, store, issuer]});
  const recovery = send('runtime.environment', {title: 'Tidewater recovery', stage: 'Recovery design', purpose: 'Where reservations are taken when production is lost.', owner, basis: 'Synthetic design scope.', assetIds: [store]});
  const zone = (environmentId, title, failureDomain) => send('runtime.zone', {environmentId, title, kind: 'hosting', failureDomain, isolation: 'Separate power and network (synthetic).', owner});
  const zone1 = zone(production, 'Bergen zone 1', 'AZ-1'), zone2 = zone(production, 'Bergen zone 2', 'AZ-2'), zone3 = zone(recovery, 'Oslo recovery zone', 'Recovery region');
  const planOf = (environmentId, assetId) => p.runtime.plans.find(r => r.environmentId === environmentId && r.assetId === assetId).id;
  const plan = (environmentId, assetId, more) => send('runtime.plan', {id: planOf(environmentId, assetId), owner, purpose: 'Run it for reservations.', ...more});
  const place = (planId, zoneId, role, replicas) => send('runtime.placement', {planId, zoneId, role, replicas, basis: 'Synthetic count.'});
  const apiPlan = plan(production, api, {stateMode: 'Stateless process', recoveryStrategy: 'Restart', minReady: 4, maxReplicas: 12, recoveryPlan: 'Restart in the surviving zone.'});
  place(apiPlan, zone1, 'active', 3); place(apiPlan, zone2, 'active', 3);
  const workerPlan = plan(production, worker, {stateMode: 'Stateless process', recoveryStrategy: 'Restart', minReady: 1, maxReplicas: 2, recoveryPlan: 'Restart in the surviving zone.'});
  place(workerPlan, zone1, 'active', 1); place(workerPlan, zone2, 'active', 1);
  const storePlan = plan(production, store, {stateMode: 'Stateful service', recoveryStrategy: 'Failover', minReady: 1, maxReplicas: 2, recoveryPlan: 'Promote the standby once the primary is fenced.', fencing: 'One writer; the old primary is fenced before promotion.', backupPlan: 'Continuous copy to the other zone.', backupZoneId: zone2});
  place(storePlan, zone1, 'active', 1); place(storePlan, zone2, 'standby', 1);
  const issuerPlan = plan(production, issuer, {stateMode: 'Provider managed', recoveryStrategy: 'Provider recovery', minReady: 1, maxReplicas: 1, recoveryPlan: 'The provider restores it.'});
  place(issuerPlan, zone1, 'active', 1);
  const recoveryStorePlan = plan(recovery, store, {stateMode: 'Stateful service', recoveryStrategy: 'Restore', minReady: 1, maxReplicas: 1, recoveryPlan: 'Restore from the continuous copy.', fencing: 'One writer.', backupPlan: 'The continuous copy.'});
  place(recoveryStorePlan, zone3, 'standby', 1);
  names = {requirement, responsibility, api, worker, driver, storage, identity, store, issuer, data, production, recovery, zone1, zone2, zone3, apiPlan, workerPlan, storePlan, issuerPlan, recoveryStorePlan};
  assert.ok(!p.runtime.topology && !p.technology.domains && !p.runtime.nodes, 'the fixture starts without typed topology');
  built = JSON.stringify(p);
}
// The Tidewater project, a fresh settled copy each time; ids() names its records.
export function tidewater() { if (!built) build(); return withFinalReview(JSON.parse(built)); }
export function ids() { if (!names) build(); return {...names}; }

// Types the Tidewater topology as design section h lays it out, through `send(type, payload)`, which answers the id of
// the record each command wrote (the pure handlers in a case, a server's commands in another): a primary region with
// two availability zones and a cluster in the first, a recovery region, a failure domain for each of the four places,
// and each zone in its node and its domain. Answers the ids it made. The jurisdictions are synthetic statements of the
// fixture's author, a person.
export function typeTopology(send) {
  const I = ids();
  send('runtime.topology-start', {});
  const fdRegion = send('technology.domain', {title: 'Norway East region', scope: 'region', cause: 'location', basis: 'One provider region (synthetic).', owner: 'Platform team (synthetic)'});
  const fdZone1 = send('technology.domain', {title: 'Bergen availability zone 1', scope: 'zone', cause: 'location', parentId: fdRegion, basis: 'Its own power and network (synthetic).'});
  const fdZone2 = send('technology.domain', {title: 'Bergen availability zone 2', scope: 'zone', cause: 'location', parentId: fdRegion, basis: 'Its own power and network (synthetic).'});
  const fdRecovery = send('technology.domain', {title: 'Recovery region', scope: 'region', cause: 'location', basis: 'A second provider region (synthetic).'});
  const region = send('runtime.node', {title: 'Norway East', kind: 'region', jurisdiction: 'NO', domainId: fdRegion, reason: 'Where reservations are taken.'});
  const az1 = send('runtime.node', {title: 'Bergen AZ 1', kind: 'availability-zone', parentId: region, domainId: fdZone1});
  const az2 = send('runtime.node', {title: 'Bergen AZ 2', kind: 'availability-zone', parentId: region, domainId: fdZone2});
  const recoveryRegion = send('runtime.node', {title: 'Sweden Central', kind: 'region', jurisdiction: 'SE', domainId: fdRecovery, reason: 'Where reservations are taken when Norway East is lost.'});
  const cluster = send('runtime.node', {title: 'Reservation cluster', kind: 'cluster', parentId: az1, reason: 'Runs the Reservation API.'});
  send('runtime.locate', {zoneId: I.zone1, nodeId: az1, domainIds: [fdZone1], reason: 'The first of two zones.'});
  send('runtime.locate', {zoneId: I.zone2, nodeId: az2, domainIds: [fdZone2]});
  send('runtime.locate', {zoneId: I.zone3, nodeId: recoveryRegion, domainIds: [fdRecovery]});
  return {fdRegion, fdZone1, fdZone2, fdRecovery, region, az1, az2, recoveryRegion, cluster};
}

// The commands that built it, in order, for a server to build the same project (the ids come from counters, so the
// same commands on a blank project give the same ids).
export function tidewaterCommands() { if (!sent) build(); return structuredClone(sent); }

// A server that holds the Tidewater project for person A, built there through POST /api/commands, with B and C as
// editors and an agent account, as the S0 harness has them. `send(type, payload, as, extra)` answers {status, body,
// error}; `extra` is what a request says of itself beside the command (authorKind, reason). `read(as)` answers the
// project as that account reads it, and keeps it as `state`.
export async function server(worker) {
  const files = new Map(), FILES = {async put(k, v) { files.set(k, v); }, async get(k) { return files.has(k) ? {text: async () => files.get(k)} : null; }, async delete(k) { files.delete(k); }};
  const env = {DB: localDatabase(':memory:'), FILES, ASSETS: {fetch: () => new Response('asset')}, AIW_AGENT_ACTORS: AGENT};
  const api = (path, method = 'GET', body = null, owner = A) => { const headers = new Headers({'oai-authenticated-user-id': owner}); if (body) { headers.set('Content-Type', 'application/json'); headers.set('Origin', 'https://aiw.test'); } return worker.fetch(new Request('https://aiw.test' + path, {method, headers, ...(body ? {body: JSON.stringify(body)} : {})}), env); };
  const made = await api('/api/projects', 'POST', {name: NAME, template: 'blank'}); assert.equal(made.status, 201, 'the server makes a blank project');
  const h = {env, api, files, state: await made.json()};
  h.pid = h.state.document.id; h.q = '?project=' + encodeURIComponent(h.pid);
  h.read = async (as = A) => (h.state = await (await api('/api/project' + h.q, 'GET', null, as)).json());
  h.send = async (type, payload, as = A, extra = {}) => { const cur = await h.read(as), res = await api('/api/commands' + h.q, 'POST', {revision: cur.revision, command: {type, payload}, ...extra}, as), body = await res.json(); if (res.status === 200) h.state = body; return {status: res.status, body, error: body.error || ''}; };
  for (const c of tidewaterCommands()) { const r = await h.send(c.type, c.payload); assert.equal(r.status, 200, 'the server takes ' + c.type + ': ' + r.error); }
  for (const actorId of [B, C, AGENT]) assert.equal((await api('/api/access' + h.q, 'POST', {actorId, role: 'editor'})).status, 200);
  h.activity = async () => JSON.stringify(await (await api('/api/activity' + h.q)).json());
  h.close = () => env.DB.close();
  return h;
}
