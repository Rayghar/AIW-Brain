// AIW rc44, work package wp9a (audit/rc44/design/wp9a-deployment.md): deployment topology, reference blueprints and
// location gates, the design package p30-deployment (the lead's ruling D8). One section per slice; a later slice
// fills its own section and touches no other. The fixtures are in rc44-wp9a-deployment-fixtures.mjs (synthetic:
// "Tidewater Ferries — vehicle-deck reservation service"). Run: npm run test:rc44-wp9a-deployment
//
// Slice 1, typed failure domains, nodes and registration (design section g, cases 0 to 8, and what the registration
// contract of slice S0 asks of every package: audit/rc44/build-notes/s0-extensions.md, the rulings of 2026-11-18):
//   S1.0  runtime.topology-start is a signed-in person's step and writes the marker; before it every other topology
//         command is refused; a project copied from a template keeps the typed topology and not who chose it;
//   S1.1  runtime.node (fails on the base: "Unknown Deployment / runtime action."): the record, its patch save, the
//         parent, jurisdiction, address and tier rules and its bound;
//   S1.2  two zones named "AZ-1" and "az one", both standing in one typed failure domain, read as one hosting failure
//         domain in planFacts and in Chapter 10's checks (on the base: two); what runtime.locate takes and refuses;
//   S1.3  old documents: the three references read byte for byte as at 94dbd4f with the package registered, gain no
//         key and need no upgrade;
//   S1.4  technology.domain-proposals proposes one failure domain a name in use, binds nothing, moves no review stamp
//         of Chapter 10 and raises no finding;
//   S1.5  the lifecycle: a domain a zone names is not retired, record.keep makes a proposal authored, retire and restore;
//   S1.6  through the server: a save is journalled with who sent it and stamped as the commit's; a save that changes
//         nothing writes neither; a restored zone or placement names nothing that left the design meanwhile;
//   S1.7  the trace: from a component to its zone's node and failure domain, and back from a failure domain to the
//         requirement; the built-in layers of every trail and spine are unchanged; no finding id is shared;
//   S1.8  a draft by Sol arrives as its proposal, unreviewed, alone and in a governed batch; an agent account claims
//         no review; a draft names no jurisdiction; a proposal binds nothing until a person keeps it;
//   S1.9  staging, and candidate knowledge reaches no topology reading;
//   S1.11 the package is one registration assembled from its parts, of which slice 1 fills one;
//   S1.10 the client build: every gate with its cap unchanged, the route delta itemised, 148 script files, "opens
//         with records" (the lead's rulings A4 and D10).
// What the route stub does in a browser is held in rc44-wp9a-deployment-browser-validate.mjs.
import assert from 'node:assert/strict';
import {readFileSync, existsSync, writeFileSync, mkdirSync} from 'node:fs';
import * as R from './rc44-s0-readings.mjs';
import * as F from './rc44-wp9a-deployment-fixtures.mjs';
import worker, {commandHandler} from './worker.js';
import * as X from './public/design-extensions.js';
import * as boundary from './design-extension-boundary.js';
import {storageUpgradeNeeded} from './storage-upgrade.js';
import {withFinalReview, inheritedFindings, reviewSourceStamp, evidenceStamp} from './public/review-domain.js';
import * as rt from './public/runtime-domain.js';
import * as runtimeModel from './public/runtime-model.js';
import {technologyFindings} from './public/technology-domain.js';
import {applyKnowledgeCommand} from './public/knowledge-governance.js';
import {reasoningSource, planFacts} from './public/design-reasoning.js';
import {recordGraph, OBJECT_TYPES} from './public/record-graph.js';
import {architectureModel} from './public/architecture-model.js';
import * as kernel from './public/trace-kernel.js';
import * as canonical from './public/canonical-command.js';
import {COLLECTIONS} from './public/record-lifecycle.js';
import {authorship, RECORD_NOUNS, findRecord} from './public/provenance.js';
import {provenanceReading} from './public/sdd-architecture.js';
import {previewWorkingChange, previewScenarioAlternative, rebaseWorkingAlternative} from './public/workbench-domain.js';
import {reviewPlan} from './public/review-plan.js';
import {instantiateTemplate} from './project-lifecycle.js';

const {A, B, AGENT} = F, PACKAGE = 'p30-deployment', AT = '2026-11-19T10:00:00.000Z';
const checks = [], failed = [], pass = n => { checks.push(n); console.log('PASS ' + n); };
const ONLY = process.env.AIW_WP9A_ONLY ? process.env.AIW_WP9A_ONLY.split(',') : null; // while working on one case: AIW_WP9A_ONLY=S1.2,S1.7
const block = async (name, fn) => { if (ONLY && !ONLY.some(x => name.startsWith(x + ' '))) return; try { await fn(); } catch (e) { failed.push(name); console.log('FAIL ' + name + ': ' + (e?.stack || e?.message || e).split('\n').slice(0, process.env.AIW_WP9A_VERBOSE ? 40 : 4).join(' | ')); } };

// The package's own module, read through a namespace so that this file links on the base too and each case fails there
// by itself.
let T = null, loadError = '';
try { T = await import('./public/topology-domain.js'); } catch (e) { loadError = e.message; }
const mine = () => X.EXTENSIONS.find(e => e.id === PACKAGE) || null;
const need = () => { assert.ok(T, 'the package\'s module exists (public/topology-domain.js): ' + loadError); assert.ok(mine(), 'the server registers ' + PACKAGE + ' (design-packages.js)'); };

// A command through the handler the server calls for its type (worker.js commandHandler: the boundary of the design
// packages, or the built-in handler), on a copy, as a signed-in person unless told otherwise.
const person = actor => ({kind: 'person', id: actor, account: 'person', reviewed: true});
const run = (p, type, payload = {}, actor = A, author = person(actor)) => { const r = commandHandler(type)(structuredClone(p), {type, payload}, AT, actor, {author}); return {...r, document: withFinalReview(r.document)}; };
const doc = (p, type, payload, actor, author) => run(p, type, payload, actor, author).document;
const refuses = (p, type, payload, words, why) => assert.throws(() => run(p, type, payload), e => { assert.match(e.message, words, (why || type) + ': ' + e.message); return true; }, why || type);
const started = () => doc(F.tidewater(), 'runtime.topology-start');
// The Tidewater project with its topology typed (rc44-wp9a-deployment-fixtures.mjs typeTopology), and the ids it made.
function typedTidewater() { let p = F.tidewater(); const made = F.typeTopology((type, payload) => { const r = run(p, type, payload); p = r.document; return r.selected; }); return {p, made}; }
const zoneOf = (p, id) => p.runtime.zones.find(z => z.id === id), nodeOf = (p, id) => (p.runtime.nodes || []).find(n => n.id === id), domainOf = (p, id) => (p.technology.domains || []).find(d => d.id === id);
const ids = xs => xs.map(x => x.id), sameText = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ================================================================ Slice 1: typed failure domains, nodes, registration
await block('S1.0 the marker', async () => {
  need();
  const p0 = F.tidewater(), I = F.ids();
  // every other topology command is refused before it, in words that name the step
  for (const [type, payload] of [['runtime.node', {title: 'Norway East', kind: 'region'}], ['technology.domain', {title: 'Norway East region'}], ['technology.domain-proposals', {}], ['runtime.locate', {zoneId: I.zone1, nodeId: 'dn-001'}]])
    refuses(p0, type, payload, /topology is not typed yet\. A signed-in person chooses that first \(runtime\.topology-start\)/, type + ' before the marker');
  const h = await F.server(worker);
  try {
    // a signed-in person's step: an agent account, a draft by Sol and an import are refused
    for (const [as, extra, who] of [[AGENT, {}, 'an agent account'], [A, {authorKind: 'sol-draft'}, 'a draft by Sol'], [A, {authorKind: 'import'}, 'an import']]) {
      const r = await h.send('runtime.topology-start', {}, as, extra);
      assert.equal(r.status, 400, who + ' does not type a project\'s topology: ' + JSON.stringify(r.body).slice(0, 200)); assert.match(r.error, /person/);
      assert.equal((await h.read()).document.runtime.topology, undefined, 'nothing is written for ' + who);
    }
    assert.equal((await h.read()).document.workspace.packages, undefined, 'a refused step names no package in the document');
    const before = (await h.read()).document.runtime, taken = await h.send('runtime.topology-start', {});
    assert.equal(taken.status, 200, JSON.stringify(taken.body).slice(0, 300));
    const d = h.state.document, mark = d.runtime.topology;
    assert.deepEqual(Object.keys(mark).sort(), ['review', 'schemaVersion']); assert.equal(mark.schemaVersion, 1);
    assert.deepEqual({actor: mark.review.actor, account: mark.review.account, at: typeof mark.review.at}, {actor: A, account: 'person', at: 'string'}, 'who chose it, with what kind of account and when, kept under the key a template copy clears (ruling F3)');
    assert.deepEqual(d.workspace.packages, [PACKAGE], 'the document names the package that wrote into it (ruling D2)');
    assert.equal(d.runtime.version, before.version + 1, 'like any content change of Chapter 10'); assert.equal(d.runtime.review, null);
    const event = d.changes.events.at(-1);
    assert.deepEqual([event.source.kind, event.source.chapter, event.actor, event.authorKind, event.reviewed], ['topology', 10, A, 'person', true], 'the journal says who typed the topology');
    // idempotent: a second person's request changes nothing
    const again = await h.send('runtime.topology-start', {}, B);
    assert.equal(again.status, 200); assert.equal(h.state.document.runtime.topology.review.actor, A); assert.equal(h.state.document.runtime.version, d.runtime.version, 'and moves no version'); assert.equal(h.state.document.changes.events.length, d.changes.events.length, 'and journals nothing');
  } finally { h.close(); }
  // a project copied from a template: the typed topology is kept (the checks stay on), who chose it there is not (ruling F3)
  const {p: typed} = typedTidewater();
  R.assertTemplateCopyClearsSteps(typed, p => [p.runtime?.topology].filter(Boolean));
  const copy = instantiateTemplate(withFinalReview({...typed, workspace: {...typed.workspace, reusableTemplate: true}}), 'tidewater-copy', 'A copy', AT);
  assert.deepEqual(copy.runtime.topology, {schemaVersion: 1, review: null}, 'the copy is typed, by nobody here yet');
  assert.equal(copy.runtime.nodes.length, typed.runtime.nodes.length); assert.equal(copy.technology.domains.length, typed.technology.domains.length);
  assert.equal(mine().needs === undefined, true, 'the package states no needs itself: its route stub does');
  assert.equal(run(copy, 'runtime.node', {title: 'A node of the copy', kind: 'site'}).selected, 'dn-00' + (typed.runtime.nodes.length + 1), 'the copy takes topology commands');
  const retaken = doc(copy, 'runtime.topology-start', {}, B);
  assert.deepEqual({actor: retaken.runtime.topology.review.actor, account: retaken.runtime.topology.review.account}, {actor: B, account: 'person'}, 'a person takes the step in the copy');
  // What the step is to the design: choosing it is a change of Chapter 10 (its version moves, and with it the design
  // stamp); who chose it is bookkeeping, which neither fingerprint reads, so a step taken again moves no stamp (ruling J3).
  { const base = F.tidewater(), first = started();
    assert.notEqual(reviewSourceStamp(first), reviewSourceStamp(base)); assert.equal(evidenceStamp(first), evidenceStamp(base), 'the marker is no evidence');
    assert.deepEqual([reviewSourceStamp(retaken), evidenceStamp(retaken), retaken.runtime.version], [reviewSourceStamp(copy), evidenceStamp(copy), copy.runtime.version], 'taken again in the copy it moves no stamp and no version');
    assert.deepEqual([mine().evidenceKeys, mine().designKeys], [['runtime.topology'], ['technology.domains', 'runtime.nodes']]); }
  pass('S1.0: before the marker runtime.node, technology.domain, technology.domain-proposals and runtime.locate are refused; runtime.topology-start is refused for an agent account, a draft by Sol and an import, and for a person writes the marker, names the package in the document and is journalled; sent again it changes nothing; a template copy stays typed and clears who chose it; choosing it moves the design stamp through Chapter 10\'s version, and who chose it moves no stamp');
});

await block('S1.1 a deployment node', () => {
  // On the base this is where the case fails: "Unknown Deployment / runtime action."
  const p = started(), made = run(p, 'runtime.node', {title: 'Norway East', kind: 'region', jurisdiction: 'NO', provider: 'A provider (synthetic)', reason: 'Where reservations are taken.'});
  need();
  let d = made.document; const n = () => nodeOf(d, 'dn-001');
  assert.equal(made.selected, 'dn-001');
  assert.deepEqual([n().id, n().ref, n().revision, n().kind, n().title, n().jurisdiction, n().provider, n().reason, n().origin, n().state], ['dn-001', 'DN-001', 1, 'region', 'Norway East', 'NO', 'A provider (synthetic)', 'Where reservations are taken.', 'user', undefined]);
  assert.deepEqual([n().parentId, n().domainId, n().address, n().tier, n().exposure, n().boundaryIds, n().history], ['', '', '', '', '', [], []], 'what is not stated is empty, never guessed');
  assert.equal(d.runtime.counters.node, 1, 'its id comes from the chapter\'s counter'); assert.equal(d.runtime.version, p.runtime.version + 1); assert.equal(d.runtime.review, null);
  assert.ok(sameText(ids(rt.runtimeFindings(d)), ids(rt.runtimeFindings(p))), 'a node raises no finding in this slice (ruling J7: no surface offers the steps yet)');
  // a patch: a field the save leaves out keeps its value; the earlier revision is kept
  d = doc(d, 'runtime.node', {id: 'dn-001', place: 'Bergen'});
  assert.deepEqual([n().revision, n().place, n().kind, n().jurisdiction, n().history.length, n().history[0].revision, n().history[0].title], [2, 'Bergen', 'region', 'NO', 1, 1, 'Norway East']);
  const same = doc(d, 'runtime.node', {id: 'dn-001', place: 'Bergen', kind: 'region'});
  assert.equal(nodeOf(same, 'dn-001').revision, 2, 'a save that changes nothing keeps the revision'); assert.equal(same.runtime.version, d.runtime.version);
  assert.equal(nodeOf(doc(d, 'runtime.node', {id: 'dn-001', jurisdiction: null}), 'dn-001').jurisdiction, '', 'null clears a field');
  // what it refuses
  refuses(d, 'runtime.node', {title: 'No kind'}, /Name the node and choose its kind/);
  refuses(d, 'runtime.node', {title: 'A data centre', kind: 'datacentre'}, /Choose the kind of node/);
  refuses(d, 'runtime.node', {kind: 'region'}, /Name the node and choose its kind/);
  refuses(d, 'runtime.node', {id: 'dn-404', title: 'Gone'}, /Choose an existing deployment node/);
  for (const jurisdiction of ['Norway', 'no', 'N', 'NOR', 'N0', ['NO'], {code: 'NO'}, 78]) refuses(d, 'runtime.node', {id: 'dn-001', jurisdiction}, /two capital letters/, 'jurisdiction ' + JSON.stringify(jurisdiction));
  for (const [field, value] of [['parentId', ['dn-001']], ['domainId', ['fd-001']], ['address', ['10.0.0.0/8']], ['boundaryIds', 'tb-001']]) assert.throws(() => run(d, 'runtime.node', {title: 'Odd', kind: 'site', [field]: value}), /Choose|Give/, field + ' is an id, a prefix or a list of ids, never another shape');
  // one strictly parsed prefix
  for (const address of ['10.20.0.0/16', '10.0.0.0/8', '0.0.0.0/0', '192.168.4.128/25', '2001:db8::/32', '::/0', 'fd00:1:2:3::/64', '2001:db8:0:0:0:0:0:1/128']) assert.equal(nodeOf(doc(d, 'runtime.node', {title: 'Net', kind: 'network', address}), 'dn-002').address, address.toLowerCase(), address);
  for (const address of ['10.20.0.0', '10.20.1.5/16', '10.0.0.0/33', '010.0.0.0/8', '10.0.0/8', '10.0.0.0/08', '256.0.0.0/8', '2001:db8::1/32', '2001:db8::/129', '2001::db8::/32', '2001:db8:0:0:0:0:0:0:0/32', '::ffff:10.0.0.0/104', 'reservations-net', '10.0.0.0/8, 10.1.0.0/16'])
    refuses(d, 'runtime.node', {title: 'Net', kind: 'network', address}, /one IPv4 or IPv6 prefix/, 'address ' + address);
  if (T.parsePrefix) { assert.deepEqual(T.parsePrefix('10.20.0.0/16'), {family: 4, parts: [10, 20, 0, 0], length: 16, text: '10.20.0.0/16'}); assert.equal(T.parsePrefix('2001:DB8::/32').text, '2001:db8::/32'); assert.equal(T.parsePrefix('10.20.1.5/16'), null); } else assert.fail('the prefix reader is exported for the address checks of slice 3 (parsePrefix)');
  // a tier is a network's or a subnet's
  refuses(d, 'runtime.node', {title: 'Tiered region', kind: 'region', tier: 'data'}, /Only a network or a subnet has a tier/);
  assert.equal(nodeOf(doc(d, 'runtime.node', {title: 'Data subnet', kind: 'subnet', tier: 'data', exposure: 'private', parentId: 'dn-001'}), 'dn-002').tier, 'data');
  refuses(d, 'runtime.node', {title: 'Odd tier', kind: 'subnet', tier: 'secret'}, /Choose the tier/);
  // the parent: it exists, the tree has no cycle and is at most 8 deep
  refuses(d, 'runtime.node', {title: 'Orphan', kind: 'site', parentId: 'dn-404'}, /Choose an existing deployment node as its parent/);
  let deep = d; for (let i = 2; i <= 8; i++) deep = doc(deep, 'runtime.node', {title: 'Level ' + i, kind: 'cell', parentId: 'dn-00' + (i - 1)});
  assert.equal(deep.runtime.nodes.length, 8, 'eight levels are kept');
  refuses(deep, 'runtime.node', {title: 'Level 9', kind: 'cell', parentId: 'dn-008'}, /at most 8 deep/);
  refuses(deep, 'runtime.node', {id: 'dn-001', parentId: 'dn-008'}, /cannot lie inside itself/, 'a cycle');
  refuses(deep, 'runtime.node', {id: 'dn-003', parentId: 'dn-003'}, /cannot lie inside itself/, 'its own parent');
  { const two = doc(doc(deep, 'runtime.node', {title: 'Another root', kind: 'region'}), 'runtime.node', {title: 'Its child', kind: 'site', parentId: 'dn-009'});
    refuses(two, 'runtime.node', {id: 'dn-001', parentId: 'dn-010'}, /at most 8 deep/, 'moving a tree of eight levels under two more');
    assert.equal(nodeOf(doc(two, 'runtime.node', {id: 'dn-008', parentId: 'dn-010'}), 'dn-008').parentId, 'dn-010', 'a leaf moves'); }
  // the failure domain a node is: one a person wrote or kept; the boundaries it holds: existing ones
  refuses(d, 'runtime.node', {id: 'dn-001', domainId: 'fd-404'}, /Choose an existing failure domain/);
  refuses(d, 'runtime.node', {id: 'dn-001', boundaryIds: ['tb-404']}, /existing trust boundaries/);
  // words past a limit are refused, never cut
  refuses(d, 'runtime.node', {id: 'dn-001', reason: 'x'.repeat(601)}, /600/);
  // the bound
  { const full = structuredClone(d); full.runtime.nodes = Array.from({length: T.TOPOLOGY_LIMITS.nodes}, (_, i) => ({...structuredClone(n()), id: 'dn-b' + i, ref: 'DN-B' + i}));
    assert.equal(T.TOPOLOGY_LIMITS.nodes, 2000); refuses(withFinalReview(full), 'runtime.node', {title: 'One more', kind: 'site'}, /keeps up to 2,000 deployment nodes/); }
  pass('S1.1: runtime.node writes DN-001 from the chapter\'s counter, as a patch with its history; it refuses a missing or unknown kind, a jurisdiction that is not two capitals, an address that is not one strict prefix (14 forms), a tier outside a network or subnet, a missing parent, a cycle, a ninth level, an unknown failure domain or boundary, words past a limit and a 2,001st node');
});

await block('S1.2 one typed failure domain is one hosting failure domain', () => {
  need();
  const I = F.ids(), facts = q => planFacts(reasoningSource(q), q.runtime.plans.find(r => r.id === I.apiPlan)), finding = (q, id) => rt.runtimeFindings(q).find(f => f.id === id);
  // Two zone records of one availability zone, named differently: read by name they are two hosting failure domains.
  let p = doc(started(), 'runtime.zone', {id: I.zone2, failureDomain: 'az one'});
  assert.deepEqual([zoneOf(p, I.zone1).failureDomain, zoneOf(p, I.zone2).failureDomain], ['AZ-1', 'az one']);
  assert.equal(Object.keys(facts(p).domains).length, 2, 'by name: two keys');
  assert.equal(finding(p, 'single-domain:' + I.apiPlan), undefined); assert.equal(finding(p, 'standby:' + I.storePlan), undefined, 'by name the store\'s standby reads as independent');
  const stamp0 = rt.runtimeEnvironmentStamp(p, I.production);
  // Both stand in one typed failure domain.
  p = doc(p, 'technology.domain', {title: 'Norway East region', scope: 'region', cause: 'location'});
  p = doc(p, 'technology.domain', {title: 'Bergen availability zone 1', scope: 'zone', cause: 'location', parentId: 'fd-001'});
  const d2 = domainOf(p, 'fd-002');
  assert.deepEqual([d2.id, d2.ref, d2.revision, d2.scope, d2.cause, d2.parentId, d2.origin, d2.state, p.technology.counters.domain], ['fd-002', 'FD-002', 1, 'zone', 'location', 'fd-001', 'user', undefined, 2]);
  for (const zoneId of [I.zone1, I.zone2]) p = doc(p, 'runtime.locate', {zoneId, domainIds: ['fd-002']});
  assert.equal(runtimeModel.failureDomainKey(zoneOf(p, I.zone1)), 'fd-002', 'the one failure-domain reading answers the typed domain first');
  assert.equal(runtimeModel.failureDomainKey({failureDomain: 'AZ-1'}), 'az-1', 'and the name of a zone that names none, as before');
  assert.deepEqual(facts(p).domains, {'fd-002': 6}, 'planFacts: one hosting failure domain with the six active copies');
  assert.equal(finding(p, 'single-domain:' + I.apiPlan)?.level, 'warning', 'Chapter 10 warns that every active copy shares one failure domain');
  assert.equal(finding(p, 'standby:' + I.storePlan)?.level, 'error', 'and that the store\'s standby is no independent one');
  // a located zone is a changed zone: its revision moves, and with it the environment's stamp (recorded evidence reads earlier)
  assert.equal(zoneOf(p, I.zone1).revision, 2); assert.notEqual(rt.runtimeEnvironmentStamp(p, I.production), stamp0);
  { const again = run(p, 'runtime.locate', {zoneId: I.zone1, domainIds: ['fd-002']}); assert.equal(zoneOf(again.document, I.zone1).revision, 2, 'locating it where it stands changes nothing'); assert.equal(again.document.runtime.version, p.runtime.version); assert.equal(again.selected, I.zone1); }
  // an ordinary edit of the zone keeps where it stands
  { const edited = doc(p, 'runtime.zone', {id: I.zone1, isolation: 'Separate power, network and cooling (synthetic).'}); assert.deepEqual(zoneOf(edited, I.zone1).domainIds, ['fd-002']); }
  // the first domain a zone names is the one it stands in; after it come the causes it shares
  p = doc(p, 'technology.domain', {title: 'Shared carrier', scope: 'provider', cause: 'carrier', treatment: 'accept'});   // fd-003
  refuses(p, 'runtime.locate', {zoneId: I.zone1, domainIds: ['fd-003']}, /first failure domain a zone names is the one it stands in: FD-003 is a shared cause \(carrier\)/);
  refuses(p, 'runtime.locate', {zoneId: I.zone1, domainIds: ['fd-002', 'fd-001']}, /After the domain it stands in a zone names the causes it shares: FD-001 states no shared cause/);
  p = doc(p, 'runtime.locate', {zoneId: I.zone1, domainIds: ['fd-002', 'fd-003']});
  assert.deepEqual(zoneOf(p, I.zone1).domainIds, ['fd-002', 'fd-003']); assert.equal(runtimeModel.failureDomainKey(zoneOf(p, I.zone1)), 'fd-002', 'a shared cause is not the hosting failure domain');
  refuses(p, 'technology.domain', {id: 'fd-002', cause: 'power'}, /ZON-001.* stands? in FD-002: it keeps a location as its cause/, 'a domain a zone stands in does not become a shared cause');
  refuses(p, 'technology.domain', {id: 'fd-003', cause: 'location'}, /ZON-001 names? FD-003 as a cause it shares/, 'and a shared cause a zone names does not become a location');
  refuses(p, 'runtime.locate', {zoneId: I.zone1, domainIds: ['fd-002', 'fd-404']}, /Choose existing failure domains; fd-404 is not in this project/);
  refuses(p, 'runtime.locate', {zoneId: I.zone1, domainIds: 'fd-002'}, /Choose existing failure domains/, 'a list, or what to add and remove');
  assert.deepEqual(zoneOf(doc(p, 'runtime.locate', {zoneId: I.zone1, domainIds: {remove: ['fd-003']}}), I.zone1).domainIds, ['fd-002'], 'a link list is sent whole or as what to add and remove');
  { // a zone names up to twelve failure domains: the one it stands in and eleven causes it shares
    let q = p; for (let i = 0; i < 11; i++) q = doc(q, 'technology.domain', {title: 'Cause ' + i, cause: 'power'});
    const causes = q.technology.domains.filter(d => d.title.startsWith('Cause ')).map(d => d.id);
    refuses(q, 'runtime.locate', {zoneId: I.zone1, domainIds: ['fd-002', 'fd-003', ...causes]}, /A zone names up to 12 failure domains; 13 were sent/);
    assert.equal(zoneOf(doc(q, 'runtime.locate', {zoneId: I.zone1, domainIds: ['fd-002', ...causes]}), I.zone1).domainIds.length, 12); assert.equal(T.TOPOLOGY_LIMITS.zoneDomains, 12); }
  refuses(p, 'runtime.locate', {zoneId: 'zon-404', domainIds: ['fd-002']}, /Choose an existing zone or placement/);
  refuses(p, 'runtime.locate', {}, /Choose an existing zone or placement/);
  // the node a zone sits in, and the node of a placement under it
  p = doc(p, 'runtime.node', {title: 'Norway East', kind: 'region', jurisdiction: 'NO'});                                  // dn-001
  p = doc(p, 'runtime.node', {title: 'Bergen AZ 1', kind: 'availability-zone', parentId: 'dn-001'});                       // dn-002
  p = doc(p, 'runtime.node', {title: 'Reservation cluster', kind: 'cluster', parentId: 'dn-002'});                         // dn-003
  p = doc(p, 'runtime.node', {title: 'Sweden Central', kind: 'region', jurisdiction: 'SE'});                               // dn-004
  refuses(p, 'runtime.locate', {zoneId: I.zone1, nodeId: 'dn-404'}, /Choose an existing deployment node/);
  const placement = p.runtime.placements.find(l => l.planId === I.apiPlan && l.zoneId === I.zone1);
  refuses(p, 'runtime.locate', {placementId: placement.id, nodeId: 'dn-003'}, /Locate ZON-001 in a node first/);
  p = doc(p, 'runtime.locate', {zoneId: I.zone1, nodeId: 'dn-002', reason: 'The first of two zones.'});
  assert.deepEqual([zoneOf(p, I.zone1).nodeId, zoneOf(p, I.zone1).reason, zoneOf(p, I.zone1).domainIds], ['dn-002', 'The first of two zones.', ['fd-002', 'fd-003']], 'a field the request leaves out keeps its value');
  refuses(p, 'runtime.locate', {placementId: placement.id, nodeId: 'dn-004'}, /DN-004 does not lie under DN-002, the node of ZON-001/);
  refuses(p, 'runtime.locate', {placementId: placement.id, nodeId: 'dn-002'}, /does not lie under DN-002/, 'the zone\'s own node is not under it');
  refuses(p, 'runtime.locate', {placementId: 'PL-404', nodeId: 'dn-003'}, /Choose an existing zone or placement/);
  { const r = run(p, 'runtime.locate', {placementId: placement.id, nodeId: 'dn-003'}); p = r.document; const l = p.runtime.placements.find(x => x.id === placement.id);
    assert.deepEqual([l.nodeId, l.revision, r.selected, r.selectedIds], ['dn-003', placement.revision + 1, I.apiPlan, [placement.id]]); }
  refuses(p, 'runtime.locate', {zoneId: I.zone1, nodeId: 'dn-004'}, new RegExp(placement.id + ' stands in DN-003, which does not lie under DN-004'), 'a zone does not move from under its placements');
  refuses(p, 'runtime.locate', {zoneId: I.zone1, nodeId: null}, new RegExp(placement.id + ' stands in DN-003'), 'nor lose its node while a placement stands under it');
  // clearing gives the records back the shape they had
  p = doc(p, 'runtime.locate', {placementId: placement.id, nodeId: null}); assert.ok(!('nodeId' in p.runtime.placements.find(x => x.id === placement.id)));
  p = doc(p, 'runtime.locate', {zoneId: I.zone1, nodeId: null, domainIds: null, reason: null});
  assert.ok(!['nodeId', 'domainIds', 'reason'].some(k => k in zoneOf(p, I.zone1)), 'a zone that names nothing typed holds no key for it'); assert.equal(runtimeModel.failureDomainKey(zoneOf(p, I.zone1)), 'az-1');
  pass('S1.2: zones named "AZ-1" and "az one" read as two hosting failure domains by name and as one (FD-002) once both stand in it: planFacts holds one domain with six copies, Chapter 10 raises single-domain and standby; a shared cause is never the hosting domain; runtime.locate keeps what it is not sent, moves the zone\'s revision and the environment\'s stamp, holds a placement under its zone\'s node, bounds a zone to twelve failure domains and clears back to the earlier shape');
});

await block('S1.3 old documents', async () => {
  need();
  const golden = JSON.parse(readFileSync('rc44-s0-extensions-baseline.json', 'utf8'));
  assert.equal(golden.capturedFrom, '94dbd4f');
  assert.deepEqual(boundary.extensionIssues(mine()), [], 'the package conforms to the registration contract'); assert.deepEqual(boundary.extensionConflicts(), []);
  for (const t of R.REFERENCES) {
    const q = R.reference(t), now = R.digests(q);
    for (const k of Object.keys(golden.readings[t])) assert.equal(now[k], golden.readings[t][k], t + ': ' + k + ' reads as at 94dbd4f with ' + PACKAGE + ' registered');
    assert.ok(!('topology' in q.runtime) && !('nodes' in q.runtime) && !('domains' in q.technology) && !('node' in q.runtime.counters) && !('domain' in q.technology.counters), t + ': no key of the package exists until it is first written');
    assert.equal(q.workspace.packages, undefined, t + ' names no package');
    assert.equal(boundary.extensionUpgradeNeeded(q), false, t + ' needs no upgrade step of the package'); assert.equal(boundary.upgradeExtensions(q), q);
    assert.equal(storageUpgradeNeeded({document: q, keys: new Map()}), false, t + ': the storage upgrade has nothing to store');
  }
  { const listed = R.reviewListDocument(), now = R.digests(listed); for (const k of Object.keys(golden.reviewList.readings)) assert.equal(now[k], golden.reviewList.readings[k], 'a document with a review list: ' + k); }
  assert.equal(mine().upgrade, undefined, 'the package states no upgrade step: no record is converted (design b.4)');
  // The Tidewater project before it is typed reads the same whether or not the package's code is asked: nothing of the
  // package is emitted, and its commands left no key.
  const p = F.tidewater(); assert.ok(!recordGraph(p).relationships.some(e => ['sitsIn', 'failsWith'].includes(e.type)) && ![...recordGraph(p).objects.values()].some(o => ['node', 'failureDomain'].includes(o.type)));
  pass('S1.3: with ' + PACKAGE + ' registered, the graph, model, trails, findings, stamps, readiness, provenance, registers, SDD and ARS of ' + R.REFERENCES.join(', ') + ' and of a document with a review list are byte for byte those of 94dbd4f; no key of the package exists, no document names it and none needs an upgrade');
});

await block('S1.4 proposals from the names in use', () => {
  need();
  const I = F.ids();
  // Chapters 6 and 10 are checked first, so that a moved stamp would show.
  let p0 = doc(doc(started(), 'technology.review', {}), 'runtime.review', {});
  assert.ok(rt.runtimeReviewCurrent(p0), 'Chapter 10 is checked');
  const r = run(p0, 'technology.domain-proposals'), p = r.document, made = p.technology.domains;
  assert.deepEqual(made.map(d => d.title).sort(), ['AZ-1', 'AZ-2', 'Identity issuer', 'Primary region', 'Recovery region'], 'one a distinct name in use: three zones and two capabilities');
  for (const d of made) {
    assert.deepEqual([d.state, d.origin, d.scope, d.cause, d.parentId, d.revision, d.legacyKeys], ['proposed', 'seeded', '', '', '', 1, [d.title.toLowerCase()]], d.ref + ' is AIW\'s proposal and states no scope and no cause: none is guessed');
    assert.equal(authorship(d).kind, 'seeded'); assert.equal(d.provenance, undefined);
  }
  assert.equal(r.selected, made[0].id);
  // binds nothing
  assert.ok(sameText(p.runtime.zones, p0.runtime.zones) && sameText(p.technology.capabilities, p0.technology.capabilities) && sameText(p.runtime.placements, p0.runtime.placements), 'no zone, capability or placement changes');
  assert.ok(!p.runtime.zones.some(z => 'domainIds' in z)); assert.equal(runtimeModel.failureDomainKey(zoneOf(p, I.zone1)), 'az-1');
  // moves no review stamp of Chapter 10 (nor Chapter 6's), and raises no finding
  assert.ok(rt.runtimeReviewCurrent(p), 'the review stamp of Chapter 10 does not move'); assert.equal(p.technology.version, p0.technology.version); assert.equal(p.runtime.version, p0.runtime.version); assert.deepEqual(p.technology.review, p0.technology.review);
  assert.deepEqual(technologyFindings(p), technologyFindings(p0)); assert.deepEqual(rt.runtimeFindings(p), rt.runtimeFindings(p0)); assert.deepEqual(ids(inheritedFindings(p)), ids(inheritedFindings(p0)), 'a proposal counts in no check');
  assert.notEqual(reviewSourceStamp(p), reviewSourceStamp(p0), 'the records are design: the design fingerprint reads them');
  // the SDD's reading of who wrote the records counts them as AIW's proposals (ruling D5), none as a person's (ruling J9)
  { const before = provenanceReading(p0), after = provenanceReading(p), chapter6 = x => x.chapters.find(c => c.chapter === 6);
    assert.equal(after.by.proposal, before.by.proposal + 5, 'five more proposals: ' + JSON.stringify(after.by)); assert.equal(after.by.person, before.by.person, 'none counted as written by a person'); assert.equal(after.total, before.total + 5);
    assert.deepEqual([chapter6(after).total, chapter6(after).proposal], [chapter6(before).total + 5, chapter6(before).proposal + 5], 'under Chapter 6, where the failure domains are'); }
  // sent again it proposes nothing more; a dismissed proposal is not proposed again while it is retired
  { const again = run(p, 'technology.domain-proposals'); assert.equal(again.document.technology.domains.length, 5); assert.equal(again.selected, null); assert.ok(sameText(again.document.technology, p.technology)); }
  { const az2 = made.find(d => d.title === 'AZ-2'), dismissed = doc(p, 'record.retire', {id: az2.id, chapter: 6, reason: 'Not a failure domain of its own.'});
    assert.equal(dismissed.technology.domains.length, 4); assert.equal(doc(dismissed, 'technology.domain-proposals').technology.domains.length, 4, 'a dismissed proposal is not proposed again'); }
  // a name a typed domain already carries, a zone that already stands in a typed domain and a name nobody states are not proposed
  { let q = doc(started(), 'technology.domain', {title: 'az-1', scope: 'zone', cause: 'location'}); q = doc(q, 'runtime.locate', {zoneId: I.zone2, domainIds: ['fd-001']}); q = doc(q, 'runtime.zone', {id: I.zone3, failureDomain: ''});
    assert.deepEqual(doc(q, 'technology.domain-proposals').technology.domains.filter(d => d.state === 'proposed').map(d => d.title).sort(), ['Identity issuer', 'Primary region'], 'AZ-1 is typed, zone 2 stands in it, zone 3 states none'); }
  // the bound holds for proposals: none is dropped silently
  { const full = structuredClone(p0); full.technology.domains = Array.from({length: T.TOPOLOGY_LIMITS.domains - 2}, (_, i) => ({id: 'fd-b' + i, ref: 'FD-B' + i, revision: 1, title: 'Bound ' + i, scope: '', cause: '', parentId: '', origin: 'user', history: []}));
    const at498 = withFinalReview(full);
    refuses(at498, 'technology.domain-proposals', {}, /keeps up to 500 failure domains; 5 names in use would make 503/); assert.equal(T.TOPOLOGY_LIMITS.domains, 500);
    const at500 = doc(doc(at498, 'technology.domain', {title: 'One more by hand'}), 'technology.domain', {title: 'And the last'});
    assert.equal(at500.technology.domains.length, 500, 'two more by hand still fit'); refuses(at500, 'technology.domain', {title: 'One too many'}, /keeps up to 500 failure domains\.$/); }
  // what counts as a name in use: a capability's alternate failure domain too; not a zone people connect from, a name
  // kept open, a text too long to be a name, nor a second spelling of a name already proposed
  { let q = doc(started(), 'technology.capability', {id: I.identity, alternateDomain: 'Second issuer'});
    q = doc(q, 'runtime.zone', {environmentId: I.production, title: 'Passenger devices', kind: 'access', failureDomain: 'The public internet'});
    q = doc(q, 'runtime.zone', {id: I.zone3, failureDomain: ' recovery REGION '}); q = doc(q, 'technology.capability', {id: I.storage, failureDomain: 'Recovery region'});
    q = doc(q, 'runtime.zone', {id: I.zone2, failureDomain: 'x'.repeat(170)});
    assert.deepEqual(doc(q, 'technology.domain-proposals').technology.domains.map(d => [d.title, d.legacyKeys]), [['AZ-1', ['az-1']], ['recovery REGION', ['recovery region']], ['Identity issuer', ['identity issuer']], ['Second issuer', ['second issuer']]], 'in the order the zones and then the capabilities state them, each once'); }
  pass('S1.4: technology.domain-proposals proposes FD-001 to FD-005 from the five names in use, each AIW\'s proposal with no scope or cause guessed; no zone, capability or placement changes; the review stamps of Chapters 6 and 10 and every finding stay as they were; the SDD counts five proposals more; sent again, after a dismissal, or over typed names it proposes nothing twice; a capability\'s alternate domain is a name in use, a zone people connect from, a text too long to be a name and a second spelling are not; the bound of 500 holds for proposals and by hand');
});

await block('S1.5 the lifecycle', () => {
  need();
  const I = F.ids();
  assert.deepEqual(COLLECTIONS.filter(([path]) => ['technology.domains', 'runtime.nodes'].includes(path)), [['technology.domains', 6], ['runtime.nodes', 10]], 'the two registers retire through the one lifecycle family');
  assert.deepEqual([RECORD_NOUNS['technology.domains'], RECORD_NOUNS['runtime.nodes']], ['failure domain', 'deployment node']);
  assert.deepEqual([OBJECT_TYPES.failureDomain, OBJECT_TYPES.node], [{label: 'Failure domain', chapter: 6, level: 'capability', prefix: 'FD'}, {label: 'Deployment node', chapter: 10, level: 'deployment', prefix: 'DN'}]);
  let p = doc(started(), 'technology.domain-proposals');
  const az1 = p.technology.domains.find(d => d.title === 'AZ-1'), version = p.technology.version;
  // a proposal binds nothing: a zone stands in a domain a person wrote or kept
  refuses(p, 'runtime.locate', {zoneId: I.zone1, domainIds: [az1.id]}, new RegExp(az1.ref + ' is still a proposal: keep it first'));
  refuses(p, 'runtime.node', {title: 'Norway East', kind: 'region', domainId: az1.id}, new RegExp(az1.ref + ' is still a proposal'));
  // only the tree link may name a proposal (so that a drafted tree can stand), and nothing reads a link to one
  { const q = doc(p, 'technology.domain', {title: 'Rack 4', parentId: az1.id}), G = recordGraph(q), rack = q.technology.domains.at(-1);
    assert.deepEqual([rack.parentId, rack.state, G.objects.get(rack.id)?.type, G.objects.has(az1.id)], [az1.id, undefined, 'failureDomain', false], 'a proposal is no object of the record graph');
    assert.ok(!G.relationships.some(e => e.from === az1.id || e.to === az1.id), 'and no relation names it'); assert.deepEqual(architectureModel(q).issues, architectureModel(p).issues); }
  // record.keep makes it authored
  p = doc(p, 'record.keep', {id: az1.id, chapter: 6});
  assert.deepEqual([domainOf(p, az1.id).state, domainOf(p, az1.id).origin, p.technology.version], [undefined, 'suggestion', version + 1], 'kept: authored, AIW\'s words a person kept, and Chapter 6 changed');
  assert.equal(findRecord(p, 6, az1.id)?.path, 'technology.domains', 'the provenance reader finds it');
  p = doc(p, 'runtime.locate', {zoneId: I.zone1, domainIds: [az1.id]});
  // a domain a zone names is not retired
  refuses(p, 'record.retire', {id: az1.id, chapter: 6, reason: 'No longer a failure domain.'}, new RegExp(az1.ref + ' is still named by Chapter 10 · ZON-001'));
  // nor one another domain lies in, nor a node a zone sits in or another node lies in
  p = doc(p, 'technology.domain', {title: 'Rack 4', scope: 'node', cause: 'location', parentId: az1.id});
  const rack = p.technology.domains.at(-1);
  p = doc(p, 'runtime.locate', {zoneId: I.zone1, domainIds: null});
  refuses(p, 'record.retire', {id: az1.id, chapter: 6, reason: 'No longer a failure domain.'}, new RegExp(az1.ref + ' is still named by Chapter 6 · ' + rack.ref));
  p = doc(doc(p, 'runtime.node', {title: 'Norway East', kind: 'region', domainId: az1.id}), 'runtime.node', {title: 'Bergen AZ 1', kind: 'availability-zone', parentId: 'dn-001'});
  refuses(p, 'record.retire', {id: 'dn-001', chapter: 10, reason: 'No longer a node.'}, /DN-001 is still named by Chapter 10 · DN-002/);
  refuses(p, 'record.retire', {id: az1.id, chapter: 6, reason: 'No longer a failure domain.'}, new RegExp(az1.ref + ' is still named by Chapter 6 · ' + rack.ref + ', Chapter 10 · DN-001'), 'nor a domain a node is');
  refuses(p, 'record.retire', {id: rack.id, chapter: 6, reason: 'x'}, /Say why/, 'a retirement states its reason, as for any record');
  p = doc(p, 'runtime.locate', {zoneId: I.zone2, nodeId: 'dn-002'});
  refuses(p, 'record.retire', {id: 'dn-002', chapter: 10, reason: 'No longer a node.'}, /DN-002 is still named by Chapter 10 · ZON-002/);
  // retire and restore
  const gone = doc(p, 'record.retire', {id: rack.id, chapter: 6, reason: 'The rack is no failure domain of its own.'}, B);
  assert.equal(domainOf(gone, rack.id), undefined); assert.deepEqual(gone.retired.records.filter(x => x.id === rack.id).map(x => [x.path, x.chapter, x.actor, x.reason]), [['technology.domains', 6, B, 'The rack is no failure domain of its own.']]);
  refuses(gone, 'technology.domain', {title: 'Shelf 2', parentId: rack.id}, /Choose an existing failure domain as its parent/, 'a retired domain is named by nothing new');
  const back = doc(gone, 'record.restore', {id: rack.id, chapter: 6});
  assert.deepEqual([domainOf(back, rack.id).title, domainOf(back, rack.id).parentId, domainOf(back, rack.id).state], ['Rack 4', az1.id, undefined]);
  // a new record never takes a retired one's id
  assert.equal(run(gone, 'technology.domain', {title: 'Another domain'}).selected, 'fd-00' + (p.technology.counters.domain + 1));
  pass('S1.5: failure domains and deployment nodes retire, restore and keep through the one lifecycle family; a proposal binds nothing and is no object of the record graph until record.keep makes it authored; a domain a zone, a node or another domain names, and a node a zone or another node names, is not retired; a retired record\'s id is not taken again');
});

await block('S1.6 journalled and stamped by the server', async () => {
  need();
  const I = F.ids(), h = await F.server(worker), d = () => h.state.document, events = () => d().changes?.events || [], ok = (r, why) => assert.equal(r.status, 200, (why || 'accepted') + ': ' + JSON.stringify(r.body).slice(0, 300));
  try {
    ok(await h.send('runtime.topology-start', {}));
    const n0 = events().length, made = await h.send('runtime.node', {title: 'Norway East', kind: 'region', jurisdiction: 'NO'});
    ok(made); assert.equal(made.body.selected, 'dn-001');
    let event = events().at(-1), node = nodeOf(d(), 'dn-001');
    assert.equal(events().length, n0 + 1, 'one change in the journal');
    assert.deepEqual(event.source, {chapter: 10, id: 'dn-001', ref: 'DN-001', kind: 'node', title: 'Norway East'});
    assert.deepEqual([event.actor, event.authorKind, event.reviewed, event.before, event.after.jurisdiction, event.items], [A, 'person', true, null, 'NO', []], 'who sent the commit, of what kind, is the server\'s to say');
    assert.match(event.quiet.reason, /opens no review/, 'it says why no other record is asked to be reviewed');
    assert.ok(/^CHG-\d{3,}$/.test(event.id) && event.fields.some(f => f.key === 'jurisdiction' && f.after === 'NO' && f.label === 'Jurisdiction'));
    assert.deepEqual({kind: node.provenance?.author?.kind, by: node.provenance?.author?.by}, {kind: 'person', by: A}, 'the record is stamped as the commit\'s');
    { const activity = await h.activity(); assert.ok(activity.includes('runtime.node') && activity.includes(event.id), 'the activity row names the command and the change'); }
    // a second person's edit: journalled with what it changed, restamped as theirs
    ok(await h.send('runtime.node', {id: 'dn-001', place: 'Bergen'}, B)); event = events().at(-1); node = nodeOf(d(), 'dn-001');
    assert.deepEqual([event.source.id, event.actor, event.fields.map(f => [f.key, f.before, f.after]), event.before.place, event.after.place], ['dn-001', B, [['place', '', 'Bergen']], '', 'Bergen']);
    assert.equal(node.provenance.author.by, B);
    // a save that changes nothing writes no change and no stamp
    { const n = events().length, stamp = JSON.stringify(node.provenance); ok(await h.send('runtime.node', {id: 'dn-001', place: 'Bergen'}, A)); assert.equal(events().length, n); assert.equal(JSON.stringify(nodeOf(d(), 'dn-001').provenance), stamp); }
    // a failure domain, and a zone located in both: each journalled under its own record, the zone restamped
    ok(await h.send('technology.domain', {title: 'Bergen availability zone 1', scope: 'zone', cause: 'location'})); event = events().at(-1);
    assert.deepEqual([event.source.chapter, event.source.id, event.source.kind, event.actor], [6, 'fd-001', 'failureDomain', A]); assert.equal(domainOf(d(), 'fd-001').provenance.author.by, A);
    const zone0 = zoneOf(d(), I.zone1); assert.equal(zone0.provenance.author.by, A);
    ok(await h.send('runtime.locate', {zoneId: I.zone1, nodeId: 'dn-001', domainIds: ['fd-001']}, B)); event = events().at(-1);
    assert.deepEqual([event.source.chapter, event.source.id, event.source.ref, event.source.kind, event.actor], [10, I.zone1, 'ZON-001', 'zone', B]);
    assert.deepEqual(event.fields.map(f => [f.key, f.before, f.after]), [['nodeId', '', 'dn-001'], ['domainIds', [], ['fd-001']]]);
    assert.equal(zoneOf(d(), I.zone1).provenance.author.by, B, 'the zone is the one who located it\'s now'); assert.equal(runtimeModel.failureDomainKey(zoneOf(d(), I.zone1)), 'fd-001');
    // AIW's proposals are not changes of the design: no journal line each, no author stamp; the activity row names the command
    { const n = events().length; ok(await h.send('technology.domain-proposals', {})); assert.equal(events().length, n); const proposed = d().technology.domains.filter(x => x.state === 'proposed'); assert.ok(proposed.length >= 4 && proposed.every(x => !x.provenance?.author)); assert.ok((await h.activity()).includes('technology.domain-proposals'));
      // a person keeps one: stamped as kept by them, and the record reads as the person's, from AIW's proposal
      ok(await h.send('record.keep', {id: proposed[0].id, chapter: 6}, B)); const kept = domainOf(d(), proposed[0].id);
      assert.deepEqual([kept.state, kept.provenance?.reviewed?.by, kept.provenance?.reviewed?.how, authorship(kept)], [undefined, B, 'kept', {kind: 'person', from: 'seeded'}]); }
    // a placement located under its zone's node is journalled under the placement
    { ok(await h.send('runtime.node', {title: 'Reservation cluster', kind: 'cluster', parentId: 'dn-001'})); const cluster = h.state.selected, placement = d().runtime.placements.find(l => l.planId === I.apiPlan && l.zoneId === I.zone1);
      const r = await h.send('runtime.locate', {placementId: placement.id, nodeId: cluster}, B); ok(r); event = events().at(-1);
      assert.deepEqual([r.body.selected, event.source, event.fields.map(f => [f.key, f.before, f.after]), event.actor], [I.apiPlan, {chapter: 10, id: placement.id, ref: placement.id, kind: 'placement', title: placement.id}, [['nodeId', '', cluster]], B]);
      assert.equal(d().runtime.placements.find(l => l.id === placement.id).provenance.author.by, B, 'and the placement is stamped as the commit\'s (selectedIds)'); }
    // what is no change of what a record says is not journalled: a keep, a retirement, a restore, and the zone's own save
    { ok(await h.send('runtime.node', {title: 'Spare site', kind: 'site'})); const spare = h.state.selected, last = events().at(-1).id, same = why => assert.equal(events().at(-1).id, last, why);
      ok(await h.send('record.retire', {id: spare, chapter: 10, reason: 'Not a site of this design.'})); same('a retirement is kept with who, when and why by the lifecycle family');
      ok(await h.send('record.restore', {id: spare, chapter: 10})); same('a restored record was not made by the commit'); assert.equal(nodeOf(d(), spare).title, 'Spare site');
      ok(await h.send('runtime.zone', {id: I.zone1, isolation: 'Separate power, network and cooling (synthetic).'})); same('the zone\'s own save changes nothing of where it stands'); assert.deepEqual(zoneOf(d(), I.zone1).domainIds, ['fd-001']); }
    // A zone a restore brings back names nothing that left the design while it was retired (nothing held those records
    // then): the names are dropped, so it reads by its own name again and never as standing in a domain that is not
    // there, and the change is journalled with who restored it. A placement that comes back with its plan likewise.
    { ok(await h.send('runtime.zone', {environmentId: I.production, title: 'Bergen zone 3', kind: 'hosting', failureDomain: 'AZ-1', isolation: 'Separate power and network (synthetic).', owner: 'Reservations team (synthetic)'})); const z3 = h.state.selected;
      ok(await h.send('technology.domain', {title: 'Bergen availability zone 3', scope: 'zone', cause: 'location'})); const fd = h.state.selected;
      ok(await h.send('runtime.node', {title: 'Bergen AZ 3', kind: 'availability-zone', parentId: 'dn-001'})); const dn = h.state.selected;
      ok(await h.send('runtime.locate', {zoneId: z3, nodeId: dn, domainIds: [fd]})); assert.equal(runtimeModel.failureDomainKey(zoneOf(d(), z3)), fd);
      ok(await h.send('record.retire', {id: z3, chapter: 10, reason: 'A third zone is not built.'}));
      ok(await h.send('record.retire', {id: fd, chapter: 6, reason: 'A third zone is not built.'})); ok(await h.send('record.retire', {id: dn, chapter: 10, reason: 'A third zone is not built.'}));
      ok(await h.send('record.restore', {id: z3, chapter: 10}, B)); const zone = zoneOf(d(), z3); event = events().at(-1);
      assert.ok(!('domainIds' in zone) && !('nodeId' in zone), 'the restored zone names no record that is not there: ' + JSON.stringify([zone.nodeId, zone.domainIds]));
      assert.equal(runtimeModel.failureDomainKey(zone), 'az-1', 'so it reads by its name, as a zone that names no typed domain does');
      assert.deepEqual([event.source.id, event.source.kind, event.actor, event.fields.map(f => [f.key, f.before, f.after])], [z3, 'zone', B, [['nodeId', dn, ''], ['domainIds', [fd], []]]], 'what the restore dropped is journalled under the zone');
      // restored while the records it names are there, it comes back as it left, and nothing is journalled
      ok(await h.send('runtime.locate', {zoneId: z3, nodeId: 'dn-001', domainIds: ['fd-001']})); ok(await h.send('record.retire', {id: z3, chapter: 10, reason: 'A third zone is not built.'})); const last = events().at(-1).id;
      ok(await h.send('record.restore', {id: z3, chapter: 10})); assert.deepEqual([zoneOf(d(), z3).nodeId, zoneOf(d(), z3).domainIds, events().at(-1).id], ['dn-001', ['fd-001'], last]);
      // a placement that left with its plan and names a node retired meanwhile
      const cluster = d().runtime.nodes.find(n => n.title === 'Reservation cluster').id, placement = d().runtime.placements.find(l => l.nodeId === cluster);
      ok(await h.send('record.retire', {id: I.apiPlan, chapter: 10, reason: 'Planned again later.'})); ok(await h.send('record.retire', {id: cluster, chapter: 10, reason: 'No cluster of its own.'}));
      ok(await h.send('record.restore', {id: I.apiPlan, chapter: 10}, B)); const back = d().runtime.placements.find(l => l.id === placement.id); event = events().at(-1);
      assert.ok(back && !('nodeId' in back), 'the restored placement names no node that is not there'); assert.deepEqual([event.source.id, event.source.kind, event.actor, event.fields.map(f => [f.key, f.before, f.after])], [placement.id, 'placement', B, [['nodeId', cluster, '']]]); }
    // validated as built-in commands are
    { const r = await h.send('runtime.node', {title: 'No kind'}); assert.equal(r.status, 400); assert.match(r.error, /Name the node and choose its kind/); }
    { const stale = await h.api('/api/commands' + h.q, 'POST', {revision: h.state.revision - 1, command: {type: 'runtime.node', payload: {title: 'Stale', kind: 'site'}}}); assert.equal(stale.status, 409, 'the revision check is the boundary\'s'); }
  } finally { h.close(); }
  pass('S1.6: through POST /api/commands a node, a failure domain and a located zone are each journalled under their own record with the server\'s actor and author kind, with what changed, and stamped as the commit\'s; a located placement likewise; a save that changes nothing writes neither; AIW\'s proposals, a keep, a retirement, a restore and the zone\'s own save are no changes of the journal, and a kept proposal is stamped as kept; a zone or a placement a restore brings back names nothing that left the design meanwhile, and what was dropped is journalled');
});

await block('S1.7 the trace', () => {
  need();
  const I = F.ids(), base = F.tidewater(), {p, made} = typedTidewater(), G = recordGraph(p), rel = (type, from, to) => G.relationships.find(e => e.type === type && e.from === from && e.to === to);
  // the records and the relations they state, from the fields that state them
  for (const [id, type, source] of [[made.region, 'node', 'runtime.nodes.' + made.region], [made.fdZone1, 'failureDomain', 'technology.domains.' + made.fdZone1]]) { const o = G.objects.get(id); assert.deepEqual([o?.type, o?.source, o?.ref], [type, source, id.toUpperCase()]); }
  assert.equal(rel('sitsIn', I.zone1, made.az1)?.source, 'runtime.zones.nodeId');
  assert.deepEqual([rel('sitsIn', I.zone1, made.region)?.derived, rel('sitsIn', I.zone1, made.region)?.via], [true, [made.az1]], 'a zone sits in each node its node lies in, derived by way of the parents');
  assert.equal(rel('partOf', made.az1, made.region)?.source, 'runtime.nodes.parentId'); assert.equal(rel('partOf', made.fdZone1, made.fdRegion)?.source, 'technology.domains.parentId');
  assert.equal(rel('failsWith', I.zone1, made.fdZone1)?.source, 'runtime.zones.domainIds'); assert.equal(rel('failsWith', made.region, made.fdRegion)?.source, 'runtime.nodes.domainId');
  assert.deepEqual([rel('failsWith', I.zone1, made.fdRegion)?.derived, rel('failsWith', I.zone1, made.fdRegion)?.via, rel('failsWith', I.zone1, made.fdZone1)?.derived], [true, [made.fdZone1], false], 'a zone fails with each domain its domain lies in, derived by way of the parents');
  assert.deepEqual(kernel.linkedVia(p, made.fdRegion, 'failsWith', 'in').sort(), [I.zone1, I.zone2, made.region, made.az1, made.az2].sort(), 'so what a lost region takes with it is one hop of the graph');
  // from a component to its zones' nodes and failure domains
  const forward = kernel.forwardTrace(p, I.api);
  assert.deepEqual([...forward.layers.node].sort(), [made.region, made.az1, made.az2, made.recoveryRegion].sort(), 'the nodes its zones sit in, with the region they lie in; not the cluster nothing stands in');
  assert.deepEqual([...forward.layers.domain].sort(), [made.fdRegion, made.fdZone1, made.fdZone2, made.fdRecovery].sort());
  assert.ok(forward.hops.get(made.az1).some(x => x.type === 'sitsIn' && x.from === I.zone1 && x.source === 'runtime.zones.nodeId'), 'each with the hop that linked it');
  assert.deepEqual(kernel.linkedVia(p, I.zone1, 'sitsIn'), [made.az1, made.region]); assert.deepEqual(kernel.linkedVia(p, made.fdZone1, 'failsWith', 'in'), [I.zone1, made.az1]);
  // and back from a failure domain to the requirement
  assert.deepEqual(kernel.servingRequirements(p, made.fdZone1).map(r => r.id), [I.requirement], 'the reverse walk from a failure domain reaches the requirement');
  assert.deepEqual(kernel.servingRequirements(p, made.region).map(r => r.id), [I.requirement]);
  // on the requirement's trail and on its own chain; a placement's node joins once the placement stands in it
  const trail = kernel.requirementTrace(p, I.requirement), spine = kernel.requirementSpine(p, I.requirement);
  assert.ok(trail.layers.node.includes(made.az1) && trail.layers.domain.includes(made.fdZone1) && spine.layers.node.includes(made.az1) && spine.layers.domain.includes(made.fdZone1));
  assert.ok(!trail.layers.node.includes(made.cluster));
  { const placement = p.runtime.placements.find(l => l.planId === I.apiPlan && l.zoneId === I.zone1), q = doc(p, 'runtime.locate', {placementId: placement.id, nodeId: made.cluster});
    assert.ok(kernel.requirementTrace(q, I.requirement).layers.node.includes(made.cluster)); assert.equal(recordGraph(q).relationships.find(e => e.type === 'sitsIn' && e.from === placement.id && e.to === made.cluster)?.source, 'runtime.placements.nodeId'); }
  // the package's records join the package's layers only (ruling D6.4): every built-in layer of every trail and spine is as it was
  assert.ok(R.assertBuiltInTrailsUnchanged(base, p) > 0); assert.ok(R.assertFindingIdsUnique(p) > 0);
  assert.deepEqual(kernel.TRACE_LAYERS.slice(kernel.BUILT_IN_LAYERS.length).filter(l => ['node', 'domain'].includes(l)), ['node', 'domain'], 'its layers follow the built-in ones, node before domain');
  assert.equal(kernel.requirementTrace(base, I.requirement).layers.node, undefined, 'a trail without such a record lists no such layer');
  // the connected model has the issues it had (ruling J2): every relation the package states is between records that exist
  assert.deepEqual(architectureModel(p).issues, architectureModel(base).issues);
  { const broken = structuredClone(p); zoneOf(broken, I.zone2).nodeId = 'dn-404'; zoneOf(broken, I.zone2).domainIds = ['fd-404']; nodeOf(broken, made.az1).parentId = 'dn-405'; const q = withFinalReview(broken);
    assert.ok(!recordGraph(q).relationships.some(e => /dn-40|fd-40/.test(e.from + e.to)), 'a field that names a record that is not there states no relation'); assert.deepEqual(architectureModel(q).issues, architectureModel(base).issues); }
  // without the marker nothing of the package is read into the graph, whatever a document holds
  { const unmarked = structuredClone(p); delete unmarked.runtime.topology; const q = withFinalReview(unmarked); assert.ok(![...recordGraph(q).objects.values()].some(o => ['node', 'failureDomain'].includes(o.type)) && !recordGraph(q).relationships.some(e => ['sitsIn', 'failsWith'].includes(e.type))); }
  pass('S1.7: nodes and failure domains are objects of the record graph with sitsIn, partOf and failsWith stated from their fields; forwardTrace from the Reservation API reaches its zones\' nodes and failure domains and the reverse walk from FD-002 reaches ' + I.requirement + '; a zone fails with each domain its domain lies in; the built-in layers of every trail and spine are unchanged, no finding id is shared and the connected model has the issues it had');
});

await block('S1.8 a draft by Sol and an agent account', async () => {
  need();
  const I = F.ids(), h = await F.server(worker), d = () => h.state.document, events = () => d().changes?.events || [], SOL = {authorKind: 'sol-draft', reason: 'Drafted from the brief.'};
  const batch = async (commands, as, extra = {}) => { const cur = await h.read(as); return h.send('workspace.apply', {commands, stamp: previewWorkingChange(cur.document, commands).stamp, reason: 'A drafted topology.', ...extra}, as); };
  try {
    assert.equal((await h.send('runtime.topology-start', {})).status, 200);
    // a draft by Sol, sent on its own: its proposal, unreviewed
    let r = await h.send('runtime.node', {title: 'Sweden Central', kind: 'region', origin: 'sol-draft'}, A, SOL);
    assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300));
    let node = nodeOf(d(), 'dn-001'), event = events().at(-1);
    assert.deepEqual([node.state, node.origin, authorship(node).kind, node.provenance?.author], ['proposed', 'sol-draft', 'sol-draft', undefined], 'it arrives as Sol\'s proposal');
    assert.deepEqual([event.source.id, event.authorKind, event.reviewed, event.reason], ['dn-001', 'sol-draft', false, 'Drafted from the brief.'], 'and unreviewed, with the reason the request gave');
    assert.equal(d().runtime.review, null);
    // the review plan asks a person to keep or dismiss it, as it asks for every proposal Sol's draft made
    assert.deepEqual(reviewPlan(withFinalReview(d())).steps.filter(x => x.id === 'proposals:sol:10:1').map(x => [x.commandType, x.target]), [['record.keep', {ids: ['dn-001'], chapter: 10}]]);
    // it says so, or it is refused: a draft never arrives as a person's record
    r = await h.send('runtime.node', {title: 'Finland Central', kind: 'region'}, A, SOL); assert.equal(r.status, 400); assert.match(r.error, /A draft by Sol or an agent account sends a deployment node or a failure domain as its proposal \(origin: sol-draft\); a person keeps it/);
    r = await h.send('technology.domain', {title: 'Carrier'}, AGENT); assert.equal(r.status, 400); assert.match(r.error, /as its proposal \(origin: sol-draft\)/);
    // an agent account: the same; and it claims no review
    r = await h.send('technology.domain', {title: 'Shared carrier', cause: 'carrier', origin: 'sol-draft'}, AGENT); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300));
    assert.deepEqual([domainOf(d(), 'fd-001').state, domainOf(d(), 'fd-001').origin, events().at(-1).account, events().at(-1).reviewed], ['proposed', 'sol-draft', 'agent', false]);
    r = await h.send('runtime.node', {title: 'Reviewed by nobody', kind: 'region', origin: 'sol-draft', reviewed: true}, AGENT); assert.equal(r.status, 400); assert.equal(r.body.code, 'authorship'); assert.match(r.error, /cannot claim a review/);
    r = await h.send('runtime.node', {title: 'Confirmed by nobody', kind: 'region', origin: 'sol-draft', confirmed: true}, A, SOL); assert.equal(r.status, 400); assert.equal(r.body.code, 'authorship');
    // a draft names no jurisdiction: a person states where a node lies
    r = await h.send('runtime.node', {title: 'Denmark East', kind: 'region', origin: 'sol-draft', jurisdiction: 'DK'}, A, SOL); assert.equal(r.status, 400); assert.match(r.error, /A jurisdiction is stated by a signed-in person/);
    r = await h.send('runtime.node', {id: 'dn-001', jurisdiction: 'SE', origin: 'sol-draft'}, AGENT); assert.equal(r.status, 400); assert.match(r.error, /A jurisdiction is stated by a signed-in person/);
    assert.equal(nodeOf((await h.read()).document, 'dn-001').jurisdiction, '');
    // in a governed batch drafted by Sol: applied unreviewed, each record its proposal; without saying so, refused whole
    r = await batch([{type: 'runtime.node', payload: {title: 'Finland Central', kind: 'region', origin: 'sol-draft'}}, {type: 'technology.domain', payload: {title: 'Finland Central region', scope: 'region', cause: 'location', origin: 'sol-draft'}}], AGENT, {reviewed: false});
    assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300));
    assert.deepEqual([nodeOf(d(), 'dn-002').state, nodeOf(d(), 'dn-002').origin, domainOf(d(), 'fd-002').state, domainOf(d(), 'fd-002').origin], ['proposed', 'sol-draft', 'proposed', 'sol-draft']);
    assert.deepEqual(events().slice(-2).map(e => [e.source.id, e.authorKind, e.reviewed]), [['dn-002', 'sol-draft', false], ['fd-002', 'sol-draft', false]], 'journalled once a record, as the draft it is');
    { const n = d().runtime.nodes.length; r = await batch([{type: 'runtime.node', payload: {title: 'Iceland', kind: 'region'}}], AGENT, {reviewed: false}); assert.equal(r.status, 400); assert.match(r.error, /as its proposal \(origin: sol-draft\)/); assert.equal((await h.read()).document.runtime.nodes.length, n, 'nothing of the refused batch is kept'); }
    r = await batch([{type: 'runtime.node', payload: {title: 'Norway West', kind: 'region', origin: 'sol-draft', jurisdiction: 'NO'}}], A, {reviewed: false, authorKind: 'sol-draft'}); assert.equal(r.status, 400); assert.match(r.error, /A jurisdiction is stated by a signed-in person/);
    // kept as an alternative by an agent account: saved only with its records as proposals; a person merges it, and the
    // record arrives as Sol's proposal, journalled once with who merged (a merge stamps no author: the lead's ruling D12)
    { const alternative = commands => h.send('workspace.alternative', {commands, stamp: previewScenarioAlternative(d(), commands, undefined).stamp, title: 'A drafted region', reason: 'Drafted by the agent account.'}, AGENT);
      r = await alternative([{type: 'runtime.node', payload: {title: 'Iceland', kind: 'region'}}]); assert.equal(r.status, 400); assert.match(r.error, /as its proposal \(origin: sol-draft\)/);
      r = await alternative([{type: 'runtime.node', payload: {title: 'Iceland', kind: 'region', origin: 'sol-draft'}}]); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300));
      const a = d().workbench.alternatives.at(-1), last = events().at(-1).id;
      r = await h.send('workspace.merge', {id: a.id, stamp: rebaseWorkingAlternative(d(), a).stamp, reviewed: true, reason: 'Merged to look at it.'}, B); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300));
      const merged = d().runtime.nodes.at(-1), added = events().slice(events().findIndex(e => e.id === last) + 1);
      assert.deepEqual([merged.title, merged.state, merged.origin, authorship(merged).kind, merged.provenance?.author], ['Iceland', 'proposed', 'sol-draft', 'sol-draft', undefined]);
      assert.deepEqual(added.map(e => [e.source.id, e.source.kind, e.actor, e.before]), [[merged.id, 'node', B, null]], 'one change for the merged record'); }
    // a proposal binds nothing
    r = await h.send('runtime.locate', {zoneId: I.zone3, nodeId: 'dn-001'}); assert.equal(r.status, 400); assert.match(r.error, /DN-001 is still a proposal: keep it first/);
    // a person keeps it: authored, the person's from Sol's draft, stamped as kept by them; then it binds
    r = await h.send('record.keep', {id: 'dn-001', chapter: 10}, B); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); node = nodeOf(d(), 'dn-001');
    assert.deepEqual([node.state, node.origin, authorship(node), node.provenance.reviewed.by, node.provenance.reviewed.how], [undefined, 'sol-draft', {kind: 'person', from: 'sol-draft'}, B, 'kept']);
    assert.equal((await h.send('runtime.locate', {zoneId: I.zone3, nodeId: 'dn-001'})).status, 200);
    // a draft that locates a zone in a record a person kept: applied as the draft it is, the zone stamped as Sol's and journalled unreviewed
    r = await h.send('runtime.locate', {zoneId: I.zone2, nodeId: 'dn-001'}, AGENT); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300));
    assert.deepEqual([zoneOf(d(), I.zone2).nodeId, zoneOf(d(), I.zone2).provenance.author.kind, authorship(zoneOf(d(), I.zone2)).kind, events().at(-1).source.id, events().at(-1).reviewed, events().at(-1).account], ['dn-001', 'sol-draft', 'sol-draft', I.zone2, false, 'agent']);
    // a person's save of Sol's proposal makes it the person's record
    r = await h.send('runtime.node', {id: 'dn-002', jurisdiction: 'FI'}, B); assert.equal(r.status, 200); node = nodeOf(d(), 'dn-002');
    assert.deepEqual([node.state, node.origin, node.jurisdiction, node.provenance.author.kind, node.provenance.author.by, authorship(node).kind], [undefined, 'sol-draft', 'FI', 'person', B, 'person']);
    // Sol's change to a person's record leaves it authored and is stamped as what it is (ruling H2): no person stands behind it as it now reads
    r = await h.send('runtime.node', {id: 'dn-002', reason: 'Drafted reason.', origin: 'sol-draft'}, AGENT); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); node = nodeOf(d(), 'dn-002');
    assert.deepEqual([node.state, node.jurisdiction, node.provenance.author.kind, authorship(node).kind, events().at(-1).reviewed], [undefined, 'FI', 'sol-draft', 'sol-draft', false]);
  } finally { h.close(); }
  pass('S1.8: a draft by Sol and an agent account send runtime.node and technology.domain only as their proposal, alone and in a governed batch: the record arrives proposed, origin sol-draft, journalled as unreviewed; without saying so, claiming a review or naming a jurisdiction it is refused; the review plan asks a person to keep or dismiss it; an alternative an agent account saves holds only proposals, and merged by a person its record is still Sol\'s proposal; a proposal binds nothing until a person keeps it, and a kept or changed one is the person\'s; Sol\'s change to a person\'s record, and a zone it locates, are stamped as Sol\'s');
});

await block('S1.9 staging; candidate knowledge reaches no topology reading', () => {
  need();
  const I = F.ids();
  for (const type of ['technology.domain', 'runtime.node', 'runtime.locate']) { assert.ok(canonical.stagedBy(type), type + ' is a design edit a reviewed change may carry'); assert.ok(canonical.reviewsOnItsOwn(type), 'and a single edit of it is reviewed as a built-in design edit is'); }
  for (const type of ['runtime.topology-start', 'technology.domain-proposals']) assert.ok(!canonical.stagedBy(type), type + ' is not staged');
  assert.throws(() => canonical.applyCanonical(F.tidewater(), {type: 'runtime.topology-start', payload: {}}, AT, A), /chapter review workflow/);
  // The types the later slices will state are still free, and none is stated before the slice that builds its readers.
  for (const type of ['technology.capability-domains', 'technology.fallback', 'technology.domain-evidence', 'runtime.environment-link', 'runtime.transition', 'runtime.failure', 'runtime.failure-accept', 'runtime.gate', 'runtime.gate-evidence', 'runtime.copy', 'runtime.copy-proposals']) { assert.equal(boundary.extensionCommand(type), null, type + ' waits for its slice'); assert.equal(boundary.builtInType(type), false, type + ' is free'); }
  assert.deepEqual(Object.keys(mine().commands).sort(), ['runtime.locate', 'runtime.node', 'runtime.topology-start', 'technology.domain', 'technology.domain-proposals']);
  // a reviewed change previews and applies the staged types through the package's own handler
  const {p, made} = typedTidewater(), commands = [{type: 'runtime.node', payload: {title: 'Bergen AZ 3', kind: 'availability-zone', parentId: made.region}}, {type: 'technology.domain', payload: {title: 'Bergen availability zone 3', scope: 'zone', cause: 'location', parentId: made.fdRegion}}];
  const preview = previewWorkingChange(p, commands, AT, A);
  assert.equal(preview.document.runtime.nodes.length, p.runtime.nodes.length + 1); assert.equal(preview.document.technology.domains.length, p.technology.domains.length + 1);
  // Candidate knowledge is inert (plan ruling 6). Slice 1 reads no knowledge at all; the proof is the readings, with
  // and without an unreleased claim that speaks of the very records.
  const AUTHOR = 'author';
  let k = applyKnowledgeCommand(structuredClone(p), {type: 'knowledge.source', payload: {title: 'Synthetic topology note', body: 'Synthetic topology note\nBergen availability zone 1 and Bergen availability zone 2 share one failure domain and must be read as one.\n', path: 'synthetic/topology.txt', revision: '1', license: 'Synthetic test material'}}, AT, AUTHOR).document;
  k = withFinalReview(applyKnowledgeCommand(k, {type: 'knowledge.claim', payload: {sourceId: k.knowledge.sources.at(-1).id, lineStart: 2, lineEnd: 2, subjectId: 'deployment-blueprint:regional-standby', predicate: 'states a failure domain', claimType: 'applicability', polarity: 'neutral', statement: 'Bergen availability zone 1 and 2 share one failure domain.', conditions: ['For this fixture.'], limitations: ['Synthetic.'], tags: ['title:Shared failure domain']}}, AT, AUTHOR).document);
  assert.equal(k.knowledge.claims.length, 1); assert.notEqual(k.knowledge.claims[0].status, 'released', 'the claim is a candidate');
  const reading = q => JSON.stringify({keys: q.runtime.zones.map(runtimeModel.failureDomainKey), facts: planFacts(reasoningSource(q), q.runtime.plans.find(r => r.id === I.apiPlan)).domains, checks10: rt.runtimeFindings(q), checks6: technologyFindings(q), trail: kernel.requirementTrace(q, I.requirement).layers, topology: recordGraph(q).relationships.filter(e => ['sitsIn', 'failsWith', 'partOf'].includes(e.type)).map(e => [e.type, e.from, e.to, e.source]), proposals: doc(q, 'technology.domain-proposals').technology.domains.map(d => [d.id, d.title, d.state])});
  assert.equal(reading(k), reading(p), 'no candidate claim reaches the failure-domain reading, a check, the trail, the topology relations or the proposals');
  pass('S1.9: technology.domain, runtime.node and runtime.locate are staged design edits (previewed and applied by the package\'s handler), the person\'s step and the generator are not; eleven command types of the later slices are free and unstated; an unreleased claim about the same records moves no topology reading');
});

await block('S1.11 the parts of the package', async () => {
  need();
  // The package is one registration assembled from its parts (public/topology.js): a later slice fills its own part.
  const P = await import('./public/topology.js'), emitted = [], tracked = [];
  assert.equal(P.DEPLOYMENT_PACKAGE, mine(), 'what the server registered is the assembly');
  const a = {objectTypes: {one: {label: 'One'}}, commands: {'x.one': {apply: () => 1}}, hops: [{layer: 'one'}], designKeys: ['x.ones'], lifecycle: {'x.ones': 6}, provenance: {nouns: {'x.ones': 'one'}, paths: {'x.one': ['x.ones']}}, records: () => emitted.push('a'), track: () => tracked.push('a'), checks: {10: () => [{id: 'a:1'}]}};
  const b = {objectTypes: {two: {label: 'Two'}}, commands: {'x.two': {apply: () => 2}}, hops: [{layer: 'two'}], evidenceKeys: ['x.marks'], provenance: {paths: {'x.one': ['x.twos'], 'x.two': ['x.twos']}, records: {'x.twos': 10}}, records: () => emitted.push('b'), track: () => tracked.push('b'), checks: {10: () => [{id: 'b:1'}], 6: () => [{id: 'b:2'}]}};
  const e = P.assembleParts('p-test', [a, {}, b]);
  assert.deepEqual([e.id, Object.keys(e.objectTypes), Object.keys(e.commands), e.hops.map(h => h.layer), e.designKeys, e.evidenceKeys, e.lifecycle, e.provenance], ['p-test', ['one', 'two'], ['x.one', 'x.two'], ['one', 'two'], ['x.ones'], ['x.marks'], {'x.ones': 6}, {nouns: {'x.ones': 'one'}, paths: {'x.one': ['x.ones', 'x.twos'], 'x.two': ['x.twos']}, records: {'x.twos': 10}}]);
  e.records(); e.track(); assert.deepEqual([emitted, tracked], [['a', 'b'], ['a', 'b']], 'the emitters and the trackers each run, in the parts\' order');
  assert.deepEqual([e.checks[10]({}).map(f => f.id), e.checks[6]({}).map(f => f.id), Object.keys(e.checks).sort()], [['a:1', 'b:1'], ['b:2'], ['10', '6']], 'a chapter\'s findings are those of every part');
  assert.deepEqual(Object.keys(P.assembleParts('p-test', [{}, {}])), ['id'], 'a part that states nothing adds no row');
  assert.throws(() => P.assembleParts('p-test', [a, {commands: {'x.one': {apply: () => 3}}}]), /p-test: two parts state commands “x\.one”/, 'a row is one part\'s');
  assert.throws(() => P.assembleParts('p-test', [a, {provenance: {nouns: {'x.ones': 'other'}}}]), /two parts state provenance\.nouns “x\.ones”/);
  // (ruling L10; was: a part that states `upgrade` is refused as a row the assembly does not carry) The rows design,
  // prefixes and upgrade are carried: design and prefixes as tables (a key one part's), the upgrade steps chained in the
  // parts' order (the document itself when no step changes it), its note one part's; what is still not carried is refused.
  { const one = p => p.n === 1 ? {...p, n: 2} : p, two = p => p.n === 2 ? {...p, n: 3, by: 'b'} : p, u = P.assembleParts('p-test', [{design: {xOnes: p => p.n}, prefixes: {risk: 'XR'}, upgrade: one, upgradeNote: 'One sentence.'}, {design: {xTwos: () => 2}, prefixes: {pattern: 'XP'}, upgrade: two}]), same = {n: 0};
    assert.deepEqual([Object.keys(u.design), u.design.xOnes({n: 7}), u.prefixes, u.upgradeNote, u.upgrade({n: 1}), u.upgrade(same) === same], [['xOnes', 'xTwos'], 7, {risk: 'XR', pattern: 'XP'}, 'One sentence.', {n: 3, by: 'b'}, true], 'the rows design, prefixes and upgrade are carried');
    assert.throws(() => P.assembleParts('p-test', [{design: {xOnes: () => 1}}, {design: {xOnes: () => 2}}]), /two parts state design “xOnes”/);
    assert.throws(() => P.assembleParts('p-test', [{prefixes: {risk: 'XR'}}, {prefixes: {risk: 'XS'}}]), /two parts state prefixes “risk”/);
    assert.throws(() => P.assembleParts('p-test', [{upgrade: one, upgradeNote: 'One.'}, {upgrade: two, upgradeNote: 'Two.'}]), /two parts state upgradeNote/);
    assert.throws(() => P.assembleParts('p-test', [{needs: () => true}]), /a part states “needs”, which the assembly does not carry/, 'what the assembly does not carry is refused, never dropped'); }
  // Slice 1 states one part; the other four are in place and state nothing yet.
  for (const [file, name] of [['failures', 'FAILURES_PART'], ['gates', 'GATES_PART'], ['blueprints', 'BLUEPRINTS_PART'], ['fallback', 'FALLBACK_PART']]) assert.deepEqual((await import('./public/topology-' + file + '.js'))[name], {}, name + ' waits for its slice');
  assert.deepEqual(Object.keys(mine()).sort(), ['commands', 'designKeys', 'evidenceKeys', 'hops', 'id', 'layers', 'lifecycle', 'objectTypes', 'provenance', 'records', 'track'], 'slice 1 states no check, no upgrade step and no section (rulings J7 and J3; design b.4)');
  pass('S1.11: the package is one registration assembled from five parts, of which slice 1 fills one: tables joined, lists in order, emitters, trackers and a chapter\'s findings of every part; a row two parts state and a part the assembly does not carry are refused');
});

// The size evidence of the slice (audit/rc44/evidence/, ruling A7), written by `node rc44-wp9a-deployment-validate.mjs
// --measure` from the build the case makes; BASE is the build of the commit the slice started from (9673661: S0 and
// wp1 S1 merged), measured there by the slice before any change to the client.
const EVIDENCE = 'audit/rc44/evidence/wp9a-s1-size.json', HOST = 'public/deploy-view.js';
const BASE = {commit: '9673661', chapters: 3229840, projects: 506829, scripts: 148, under10k: 53, css: 901873};
// What the same lazy entry added to the route at the base, before it held the package (opensWithRecords on the base's build).
const BASE_OPENS = {route: 3229840, added: 833044, total: 4062884, files: 12};
await block('S1.10 the client build', async () => {
  need();
  const {bundleClient, BUDGET} = await import('./client-bundle.mjs');
  const built = await bundleClient('.aiw-local/rc44-wp9a/client'), report = built.report, meta = JSON.parse(readFileSync(built.metafile, 'utf8'));
  assert.deepEqual(report.violations, [], 'the client build passes every size gate');
  assert.deepEqual([BUDGET.routes.chapters, BUDGET.routes.projects, BUDGET.scripts, BUDGET.tiny, BUDGET.css], [3233792, 1213 * 1024, 148, 61, 881 * 1024], 'no gate is raised');
  // the package is held in the lazy entry of the Chapter 10 Model view (design d.3, ruling A3), in one chunk, off the route
  const holders = Object.entries(meta.outputs).filter(([, o]) => Object.keys(o.inputs || {}).some(i => /^public\/topology(-[a-z]+)?\.js$/.test(i))).map(([f]) => f);
  assert.equal(holders.length, 1, 'the package\'s modules are in one script: ' + holders.join(', '));
  assert.ok(Object.keys(meta.outputs[holders[0]].inputs).includes(HOST), 'the script of ' + HOST);
  for (const o of Object.values(meta.outputs)) for (const i of Object.keys(o.inputs || {})) assert.ok(!/design-packages\.js|rc44-wp9a/.test(i), i + ' is not in the client');
  const measured = {chapters: report.routes.chapters.code, projects: report.routes.projects.code, scripts: report.scripts, under10k: report.buckets.under10k, css: report.css};
  // "Opens with records" (ruling D10): a document that holds the package's records also loads this lazy entry before it is first drawn.
  const opens = R.opensWithRecords(meta, HOST, Object.keys(BUDGET.data));
  assert.equal(opens.route, measured.chapters, 'the helper counts the chapters route as the gate does'); assert.ok(opens.added > 0 && opens.total === opens.route + opens.added);
  const stub = readFileSync('public/design-package-routes.js', 'utf8'); assert.match(stub, /registerExtension\(\{id:'p30-deployment-route',needs:[^\n]+load:\(\)=>import\('\.\/deploy-view\.js'\)\}\);/, 'the route stub loads the host entry');
  if (process.argv.includes('--measure')) { mkdirSync('audit/rc44/evidence', {recursive: true}); writeFileSync(EVIDENCE, JSON.stringify({schema: 'aiw.rc44.slice-size.v1', name: 'wp9a slice 1: typed failure domains, nodes and registration (p30-deployment)', measuredWith: 'client-bundle.mjs bundleClient, as node build.mjs builds the client (dist/client-size-report.json: routes.chapters.code)', allowance: {chapters: 500, scripts: 148, ruling: 'A4 of 2026-11-18: 500 B on the chapters route for all of wp9a; slice 1 well under half'}, caps: {chapters: BUDGET.routes.chapters, projects: BUDGET.routes.projects, scripts: BUDGET.scripts, under10k: BUDGET.tiny, css: BUDGET.css}, baseline: BASE, slice: measured, delta: measured.chapters - BASE.chapters, projectsDelta: measured.projects - BASE.projects, headroomAfter: BUDGET.routes.chapters - measured.chapters,
    onRoute: 'Read from the metafiles of the two builds, output by output. The package\'s own: its route stub in public/design-package-routes.js with the import of registerExtension there (118 B), and the typed-domain reading in public/runtime-model.js failureDomainKey (design hook H1, 21 B). The first package to register a stub also brings registerExtension itself onto the route: 94 B in the registry\'s chunk and 16 B in the import lists of two route chunks whose aliases move with the new export. That part is paid once, by whichever package merges first (wp2\'s first slice measures it too). The package\'s modules import only what the route already exports, so they add no export.',
    itemised: {stubWithItsImport: 118, failureDomainKey: 21, registerExtensionOnTheRouteOnce: 94, aliasShiftsOfThatExport: 16},
    'opens with records': {gate: 'The chapters-route gate is unchanged and measures opening a document that holds no package records (ruling D10 of 2026-11-18).', host: HOST, ...opens, beforeThePackage: BASE_OPENS, note: 'A document that holds the marker runtime.topology also loads the lazy entry of the Chapter 10 Model view, which holds the package, before it is first drawn: the route and the static closure of that entry, each script counted once.'}}, null, 1) + '\n'); }
  assert.ok(existsSync(EVIDENCE), 'the slice\'s measurement is kept (node rc44-wp9a-deployment-validate.mjs --measure)');
  const size = JSON.parse(readFileSync(EVIDENCE, 'utf8'));
  assert.deepEqual(size.baseline, BASE); assert.equal(size.delta, size.slice.chapters - BASE.chapters);
  assert.ok(size.delta > 0 && size.delta < 250, 'slice 1 uses under half of the 500 B of wp9a on the chapters route, measured against the base alone: ' + size.delta + ' B');
  assert.ok(size.itemised.stubWithItsImport + size.itemised.failureDomainKey < 150, 'of which the package\'s own are well under half; the rest is the registry\'s registerExtension, which the first package to merge brings onto the route once');
  assert.deepEqual([size.slice.scripts, size.slice.under10k, size.slice.css], [148, BASE.under10k, BASE.css], '148 script files, no new file under 10 KB, no stylesheet rule');
  assert.ok(size.slice.chapters <= BUDGET.routes.chapters); assert.equal(size.allowance.chapters, 500);
  { const w = size['opens with records']; assert.ok(w && w.host === HOST && w.total === w.route + w.added && w.route === size.slice.chapters && w.files > 0, 'the size file says what a document with the package\'s records opens with');
    assert.deepEqual(w.beforeThePackage, BASE_OPENS); assert.equal(w.files, BASE_OPENS.files, 'the package adds no script to what the entry loads'); assert.ok(w.added - BASE_OPENS.added < 20000, 'the package itself is ' + (w.added - BASE_OPENS.added) + ' B of what the entry adds');
    assert.equal(Object.values(size.itemised).reduce((n, x) => n + x, 0), size.delta, 'the itemised bytes add up to the delta'); }
  if (process.argv.includes('--measure')) assert.deepEqual(measured, size.slice, 'at the slice\'s commit the build measures what the evidence says');
  pass('S1.10: the client build passes every gate with the caps unchanged; slice 1 measured ' + size.delta + ' B on the chapters route (' + BASE.chapters + ' → ' + size.slice.chapters + ' of ' + BUDGET.routes.chapters + '; ' + (size.itemised.stubWithItsImport + size.itemised.failureDomainKey) + ' B the package\'s own, ' + (size.itemised.registerExtensionOnTheRouteOnce + size.itemised.aliasShiftsOfThatExport) + ' B the registry\'s registerExtension joining the route with the first package), 148 script files, ' + size.slice.under10k + ' under 10 KB; opens with records: ' + size['opens with records'].total + ' B (' + size['opens with records'].added + ' B in ' + size['opens with records'].files + ' more scripts); this build: ' + measured.chapters + ' B');
});

// ================================================================ Slice 2: declared failure set, evaluation, acceptance
// (design section g, Slice 2. Slice 2 adds its cases here, as blocks named 'S2.n …'.)

// ================================================================ Slice 3: location gates and data copies
// (design section g, Slice 3. Slice 3 adds its cases here, as blocks named 'S3.n …'.)

// ================================================================ Slice 4: blueprint adoption glue, transitional populations
// (design section g, Slice 4. Slice 4 adds its cases here, as blocks named 'S4.n …'.)

// ================================================================ Slice 5: qualified fallback and the Chapter 6 migration
// (design section g, Slice 5. Slice 5 adds its cases here, as blocks named 'S5.n …'.)

// ================================================================ Slice 6: surface, output, retirements and the size gate
// (design section g, Slice 6. Slice 6 adds its node cases here, as blocks named 'S6.n …'; its browser cases are a suite of their own.)

if (failed.length) { console.log('\nrc44 wp9a deployment: ' + failed.length + ' failed (' + failed.join('; ') + '), ' + checks.length + ' passed'); process.exit(1); }
console.log('\nrc44 wp9a deployment: ' + checks.length + ' checks passed (slice 1; slices 2 to 6 have no cases yet)');
