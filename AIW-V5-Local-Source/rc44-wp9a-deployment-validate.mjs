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
import {withFinalReview, inheritedFindings, reviewSource, designOf, reviewSourceStamp, reviewDesignStamp, evidenceStamp, CHAPTERS, reviewBlockers, nonWaivable, treatmentsFor, DISPOSITIONS, finalMilestones} from './public/review-domain.js';
import * as rt from './public/runtime-domain.js';
import * as runtimeModel from './public/runtime-model.js';
import {technologyFindings, technologyReviewCurrent, technologyHandoffCurrent} from './public/technology-domain.js';
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
import {neutraliseImportedAuthority} from './recovery-service.js';
import {deploySource} from './public/deploy-model.js';

const {A, B, C, AGENT} = F, PACKAGE = 'p30-deployment', AT = '2026-11-19T10:00:00.000Z';
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
    // (ruling L9; was: "… A signed-in person chooses that first (runtime.topology-start)", which named a command type)
    refuses(p0, type, payload, /^This project's topology is not typed yet\. A signed-in person chooses typed topology for this project first\.$/, type + ' before the marker');
  const h = await F.server(worker);
  try {
    // a signed-in person's step: an agent account, a draft by Sol and an import are refused
    // (ruling M7; was: the refusal matched /person/) in the shared sentences, each from where it comes: authorship.js refuseUnreviewable for an agent
    // account and a draft by Sol (before the project is read), S0's boundary (design-extension-boundary.js) for an import. They name the command type;
    // KNOWN LIMIT (rulings L9 and M7): they are the workbench's and every package's, reworded with the other shared sentences in wp9b (ruling A5)
    for (const [as, extra, who, words] of [[AGENT, {}, 'an agent account', 'An agent or service account does not review, confirm, accept or approve (runtime.topology-start). A person signs in to do that.'], [A, {authorKind: 'sol-draft'}, 'a draft by Sol', 'A draft by Sol does not review, confirm, accept or approve (runtime.topology-start). A person signs in to do that.'], [A, {authorKind: 'import'}, 'an import', 'runtime.topology-start is a signed-in person\'s step: an import, a draft by Sol and an agent account review, accept and approve nothing.']]) {
      const r = await h.send('runtime.topology-start', {}, as, extra);
      assert.equal(r.status, 400, who + ' does not type a project\'s topology: ' + JSON.stringify(r.body).slice(0, 200)); assert.equal(r.error, words, who + ': the shared sentence');
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
  // (ruling L5; was: "the copy takes topology commands" before anyone there took the step) the copy reads typed, and its
  // topology commands are refused until a person takes the step there
  for (const [type, payload] of [['runtime.node', {title: 'A node of the copy', kind: 'site'}], ['technology.domain', {title: 'A domain of the copy'}], ['technology.domain-proposals', {}], ['runtime.locate', {zoneId: F.ids().zone3, reason: 'Moved in the copy.'}]])
    refuses(copy, type, payload, /topology of this project is typed, but nobody here has chosen it yet\. A signed-in person chooses typed topology for this project first\./, type + ' in a copy before a person there takes the step');
  assert.equal(runtimeModel.failureDomainKey(zoneOf(copy, F.ids().zone1)), runtimeModel.failureDomainKey(zoneOf(typed, F.ids().zone1)), 'the readings stay typed');
  const retaken = doc(copy, 'runtime.topology-start', {}, B);
  assert.deepEqual({actor: retaken.runtime.topology.review.actor, account: retaken.runtime.topology.review.account}, {actor: B, account: 'person'}, 'a person takes the step in the copy');
  assert.equal(run(retaken, 'runtime.node', {title: 'A node of the copy', kind: 'site'}).selected, 'dn-00' + (typed.runtime.nodes.length + 1), 'then the copy takes topology commands');
  // What the step is to the design: choosing it is a change of Chapter 10 (its version moves, and with it the design
  // stamp); who chose it is bookkeeping, which neither fingerprint reads, so a step taken again moves no stamp (ruling J3).
  { const base = F.tidewater(), first = started();
    assert.notEqual(reviewSourceStamp(first), reviewSourceStamp(base)); assert.equal(evidenceStamp(first), evidenceStamp(base), 'the marker is no evidence');
    assert.deepEqual([reviewSourceStamp(retaken), evidenceStamp(retaken), retaken.runtime.version], [reviewSourceStamp(copy), evidenceStamp(copy), copy.runtime.version], 'taken again in the copy it moves no stamp and no version');
    // (ruling L5; was: [evidenceKeys, designKeys] are [['runtime.topology'], ['technology.domains', 'runtime.nodes']]) the
    // marker and the two collections are stated through S0's design row; no key of the package is evidence
    assert.deepEqual([mine().evidenceKeys, mine().designKeys, Object.keys(mine().design)], [undefined, ['runtime.topology', 'technology.domains', 'runtime.nodes'], ['runtime.topology', 'technology.domains', 'runtime.nodes']]); }
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
  // (ruling L8; was: refused as "not two capital letters"; 'ZZ' and 'UK' were accepted) the officially assigned ISO 3166-1 alpha-2 codes only (S1.19)
  for (const jurisdiction of ['Norway', 'no', 'N', 'NOR', 'N0', ['NO'], {code: 'NO'}, 78, 'ZZ', 'UK']) refuses(d, 'runtime.node', {id: 'dn-001', jurisdiction}, /officially assigned ISO 3166-1 alpha-2 code/, 'jurisdiction ' + JSON.stringify(jurisdiction));
  for (const [field, value] of [['parentId', ['dn-001']], ['domainId', ['fd-001']], ['address', ['10.0.0.0/8']], ['boundaryIds', 'tb-001']]) assert.throws(() => run(d, 'runtime.node', {title: 'Odd', kind: 'site', [field]: value}), /Choose|Give/, field + ' is an id, a prefix or a list of ids, never another shape');
  // one strictly parsed prefix
  for (const address of ['10.20.0.0/16', '10.0.0.0/8', '0.0.0.0/0', '192.168.4.128/25', '2001:db8::/32', '::/0', 'fd00:1:2:3::/64', '2001:db8:0:0:0:0:0:1/128']) assert.equal(nodeOf(doc(d, 'runtime.node', {title: 'Net', kind: 'network', address}), 'dn-002').address, address === '2001:db8:0:0:0:0:0:1/128' ? '2001:db8::1/128' : address.toLowerCase(), address); // (ruling L8; was: the text as sent, lower-cased) the canonical text
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
  // (ruling L8; was: 2,000 nodes filled in by hand, the 2,001st refused) the bound is reached through the commands, with
  // every field at its limit, in S1.18: 120 nodes, the 121st refused
  assert.equal(T.TOPOLOGY_LIMITS.nodes, 120);
  pass('S1.1: runtime.node writes DN-001 from the chapter\'s counter, as a patch with its history; it refuses a missing or unknown kind, a jurisdiction that is no officially assigned code, an address that is not one strict prefix (14 forms), a tier outside a network or subnet, a missing parent, a cycle, a ninth level, an unknown failure domain or boundary, words past a limit, and a node past the bound (S1.18)');
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
  // (ruling L6; was: the counter is technology.counters.domain) the id comes from Chapter 10's counters, which the design fingerprint does not read
  assert.deepEqual([d2.id, d2.ref, d2.revision, d2.scope, d2.cause, d2.parentId, d2.origin, d2.state, p.runtime.counters.domain, 'domain' in p.technology.counters], ['fd-002', 'FD-002', 1, 'zone', 'location', 'fd-001', 'user', undefined, 2, false]);
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
    // (ruling L4; was: r.selected is the plan, I.apiPlan) the command answers the record it wrote, the placement
    assert.deepEqual([l.nodeId, l.revision, r.selected, r.selectedIds], ['dn-003', placement.revision + 1, placement.id, [placement.id]]); }
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
    assert.ok(!('topology' in q.runtime) && !('nodes' in q.runtime) && !('domains' in q.technology) && !('node' in q.runtime.counters) && !('domain' in q.runtime.counters) && !('domain' in q.technology.counters), t + ': no key of the package exists until it is first written');
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
  // (ruling L6; was: "the records are design: the design fingerprint reads them", the stamp moved) a proposal says
  // nothing to the design fingerprint: the generator moves no design stamp and no evidence stamp; keeping one is a
  // design change (the record joins the design, its chapter's version moves and its check is cleared)
  assert.deepEqual([reviewSourceStamp(p), evidenceStamp(p)], [reviewSourceStamp(p0), evidenceStamp(p0)], 'AIW\'s proposals move no design stamp');
  { const kept = doc(p, 'record.keep', {id: made[0].id, chapter: 6});
    assert.notEqual(reviewSourceStamp(kept), reviewSourceStamp(p), 'keeping a proposal is a design change'); assert.equal(kept.technology.version, p.technology.version + 1); assert.equal(rt.runtimeReviewCurrent(kept), false, 'and the checks after it are no longer current');
    assert.deepEqual(reviewSource(kept).technology.domains.map(d => d.id), [made[0].id], 'the design source holds the kept record and no proposal'); }
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
  // (ruling L8; was: 498 domains filled in by hand, the proposals refused at 503, two more by hand, the 501st refused) the
  // same, reached through the commands with every field at its limit, in S1.18: 60 domains
  assert.equal(T.TOPOLOGY_LIMITS.domains, 60);
  // what counts as a name in use: a capability's alternate failure domain too; not a zone people connect from, a name
  // kept open, a text too long to be a name, nor a second spelling of a name already proposed
  { let q = doc(started(), 'technology.capability', {id: I.identity, alternateDomain: 'Second issuer'});
    q = doc(q, 'runtime.zone', {environmentId: I.production, title: 'Passenger devices', kind: 'access', failureDomain: 'The public internet'});
    q = doc(q, 'runtime.zone', {id: I.zone3, failureDomain: ' recovery REGION '}); q = doc(q, 'technology.capability', {id: I.storage, failureDomain: 'Recovery region'});
    q = doc(q, 'runtime.zone', {id: I.zone2, failureDomain: 'x'.repeat(170)});
    assert.deepEqual(doc(q, 'technology.domain-proposals').technology.domains.map(d => [d.title, d.legacyKeys]), [['AZ-1', ['az-1']], ['recovery REGION', ['recovery region']], ['Identity issuer', ['identity issuer']], ['Second issuer', ['second issuer']]], 'in the order the zones and then the capabilities state them, each once'); }
  pass('S1.4: technology.domain-proposals proposes FD-001 to FD-005 from the five names in use, each AIW\'s proposal with no scope or cause guessed; no zone, capability or placement changes; the review stamps of Chapters 6 and 10 and every finding stay as they were; the SDD counts five proposals more; sent again, after a dismissal, or over typed names it proposes nothing twice; a capability\'s alternate domain is a name in use, a zone people connect from, a text too long to be a name and a second spelling are not; the bound holds for proposals and by hand (S1.18)');
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
  // (ruling L1; was: the handler's keep alone made it bind) the keep binds once the person's stamp the server writes for
  // it stands (S1.6 and S1.12 hold that through POST /api/commands); a keep that stamps nobody binds nothing
  refuses(p, 'runtime.locate', {zoneId: I.zone1, domainIds: [az1.id]}, new RegExp(az1.ref + ' is no person\'s record yet'));
  domainOf(p, az1.id).provenance = {reviewed: {by: A, at: AT, how: 'kept'}};
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
  assert.equal(run(gone, 'technology.domain', {title: 'Another domain'}).selected, 'fd-00' + (p.runtime.counters.domain + 1));
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
      // (ruling L4; was: r.body.selected is the plan, I.apiPlan) the placement, the record the command wrote
      assert.deepEqual([r.body.selected, event.source, event.fields.map(f => [f.key, f.before, f.after]), event.actor], [placement.id, {chapter: 10, id: placement.id, ref: placement.id, kind: 'placement', title: placement.id}, [['nodeId', '', cluster]], B]);
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
  // (the lead's ruling K8) and the chain that explains a pair of built-in records is the one the document without the
  // package's records gives: a zone's node or failure domain is no way between two built-in records. The helper comes
  // with the adoption record's follow-up (rc44/wp2-s1-lead at ec0cd3c), which this branch does not hold yet: held there
  // on a trial merge (8c6237d), and here once the lead merges it.
  // (rulings K8 and M5; was: called only when the helper existed, so it was skipped until the adoption record's follow-up was merged) unconditional:
  // the chains that explain pairs of built-in records, and the built-in records of every record's trace, are the ones the untyped design gives
  assert.ok(R.assertBuiltInChainsUnchanged(base, p) > 0, 'the package\'s records move no chain between built-in records (ruling K8)');
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
    // (ruling L6) Chapters 6 and 10 checked by a person first, so that a draft that moved a stamp, a version or a check would show
    for (const type of ['technology.review', 'runtime.review']) assert.equal((await h.send(type, {})).status, 200, type);
    const checked = withFinalReview(structuredClone(d())), still = () => { const q = withFinalReview(structuredClone(d())); return [reviewSourceStamp(q), evidenceStamp(q), q.technology.version, q.runtime.version, rt.runtimeReviewCurrent(q), q.technology.review, q.runtime.handoff]; };
    const unmoved = (why) => assert.deepEqual(still(), [reviewSourceStamp(checked), evidenceStamp(checked), checked.technology.version, checked.runtime.version, true, checked.technology.review, checked.runtime.handoff], why + ': a proposal moves no design stamp and no version, and clears no check or handoff (ruling L6)');
    // a reviewed batch keeps its receipt in workbench.history, which the design fingerprint reads for every batch on
    // rc.10.73.42: that is the batch's, not its proposals'. Beside it the design source is what it was.
    const besides = q => { const s = designOf(reviewSource(withFinalReview(structuredClone(q))))[0]; delete s.workbench; return JSON.stringify(s); }, sourceChecked = besides(checked);
    assert.equal(rt.runtimeReviewCurrent(checked), true);
    // a draft by Sol, sent on its own: its proposal, unreviewed
    let r = await h.send('runtime.node', {title: 'Sweden Central', kind: 'region', origin: 'sol-draft'}, A, SOL);
    assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300));
    let node = nodeOf(d(), 'dn-001'), event = events().at(-1);
    assert.deepEqual([node.state, node.origin, authorship(node).kind, node.provenance?.author], ['proposed', 'sol-draft', 'sol-draft', undefined], 'it arrives as Sol\'s proposal');
    assert.deepEqual([event.source.id, event.authorKind, event.reviewed, event.reason], ['dn-001', 'sol-draft', false, 'Drafted from the brief.'], 'and unreviewed, with the reason the request gave');
    // (ruling L6; was: the chapter's check is null after the draft, as the step before it had cleared it) the check a person ran stands
    unmoved('a node Sol drafted');
    // the review plan asks a person to keep or dismiss it, as it asks for every proposal Sol's draft made
    assert.deepEqual(reviewPlan(withFinalReview(d())).steps.filter(x => x.id === 'proposals:sol:10:1').map(x => [x.commandType, x.target]), [['record.keep', {ids: ['dn-001'], chapter: 10}]]);
    // it says so, or it is refused: a draft never arrives as a person's record
    r = await h.send('runtime.node', {title: 'Finland Central', kind: 'region'}, A, SOL); assert.equal(r.status, 400); assert.match(r.error, /A draft by Sol or an agent account sends a deployment node or a failure domain as its proposal \(origin: sol-draft\); a person keeps it/);
    r = await h.send('technology.domain', {title: 'Carrier'}, AGENT); assert.equal(r.status, 400); assert.match(r.error, /as its proposal \(origin: sol-draft\)/);
    // an agent account: the same; and it claims no review
    r = await h.send('technology.domain', {title: 'Shared carrier', cause: 'carrier', origin: 'sol-draft'}, AGENT); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300));
    assert.deepEqual([domainOf(d(), 'fd-001').state, domainOf(d(), 'fd-001').origin, events().at(-1).account, events().at(-1).reviewed], ['proposed', 'sol-draft', 'agent', false]);
    unmoved('a failure domain an agent account drafted');
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
    assert.deepEqual(still().slice(2), [checked.technology.version, checked.runtime.version, true, checked.technology.review, checked.runtime.handoff], 'a batch of proposals moves no version and clears no check or handoff (ruling L6)');
    assert.equal(besides(d()), sourceChecked, 'and beside the batch\'s own receipt the design source is what it was');
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
    const beforeKeep = withFinalReview(structuredClone(d()));
    r = await h.send('record.keep', {id: 'dn-001', chapter: 10}, B); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); node = nodeOf(d(), 'dn-001');
    { const q = withFinalReview(structuredClone(d())); assert.notEqual(reviewSourceStamp(q), reviewSourceStamp(beforeKeep), 'keeping a proposal is a design change (ruling L6)'); assert.equal(q.runtime.version, beforeKeep.runtime.version + 1); }
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

// (the lead's ruling L1; the review's must-fix 1) A proposal stays inert until a signed-in person keeps it: record.keep
// from an agent account, a draft by Sol or an import is refused alone, in a reviewed batch and in a saved alternative,
// for a node Sol drafted and a failure domain AIW proposed; neither binds, neither reads as a person's. A person keeps them.
await block('S1.12 keeping a proposal is a person\'s step', async () => {
  need();
  const I = F.ids(), h = await F.server(worker), d = () => h.state.document, SOL = {authorKind: 'sol-draft', reason: 'Drafted.'}, IMPORT = {authorKind: 'import', reason: 'Imported.'};
  const batch = async (commands, as, extra) => { await h.read(as); return h.send('workspace.apply', {commands, stamp: previewWorkingChange(d(), commands).stamp, reason: 'A batch.', reviewed: !extra?.authorKind}, as, extra); };
  const alternative = async (commands, as, extra) => { await h.read(as); return h.send('workspace.alternative', {commands, stamp: previewScenarioAlternative(d(), commands, undefined).stamp, title: 'Kept proposals', reason: 'An alternative.'}, as, extra); };
  try {
    assert.equal((await h.send('runtime.topology-start', {})).status, 200);
    assert.equal((await h.send('runtime.node', {title: 'Sweden Central', kind: 'region', origin: 'sol-draft'}, AGENT)).status, 200);
    assert.equal((await h.send('technology.domain-proposals', {}, AGENT)).status, 200);
    const node = 'dn-001', domain = d().technology.domains.find(x => x.state === 'proposed' && x.origin === 'seeded').id;
    const proposals = () => [nodeOf(d(), node), domainOf(d(), domain)], keeps = [{type: 'record.keep', payload: {id: node, chapter: 10}}, {type: 'record.keep', payload: {id: domain, chapter: 6}}];
    for (const [as, extra, who] of [[AGENT, {}, 'an agent account'], [A, SOL, 'a draft by Sol'], [A, IMPORT, 'an import']]) for (const c of keeps)
      for (const [how, send] of [['alone', () => h.send(c.type, c.payload, as, extra)], ['in a reviewed batch', () => batch([c], as, extra)], ['in a saved alternative', () => alternative([c], as, extra)]]) {
        const r = await send(); assert.equal(r.status, 400, who + ' keeps ' + c.payload.id + ' ' + how + ': ' + JSON.stringify(r.body).slice(0, 200)); assert.equal(r.body.code, 'authorship');
        await h.read(); assert.deepEqual(proposals().map(x => x.state), ['proposed', 'proposed'], who + ' ' + how + ': both stay proposals');
        assert.ok(proposals().every(x => authorship(x).kind !== 'person'), 'neither reads as a person\'s');
      }
    // neither binds
    { const r = await h.send('runtime.locate', {zoneId: I.zone3, nodeId: node}); assert.equal(r.status, 400); assert.match(r.error, /is still a proposal: keep it first/); }
    { const r = await h.send('runtime.locate', {zoneId: I.zone3, domainIds: [domain]}); assert.equal(r.status, 400); assert.match(r.error, /is still a proposal: keep it first/); }
    // a person keeps both: then they bind
    assert.equal((await h.send('record.keep', {id: node, chapter: 10}, B)).status, 200); { const r = await batch([keeps[1]], B); assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 300)); }
    assert.deepEqual(proposals().map(x => [x.state, x.provenance?.reviewed?.by, x.provenance?.reviewed?.how, authorship(x).kind]), [[undefined, B, 'kept', 'person'], [undefined, B, 'kept', 'person']]);
    assert.equal((await h.send('runtime.locate', {zoneId: I.zone3, nodeId: node})).status, 200);
  } finally { h.close(); }
  // No record is authored on the strength of a keep that carries no person's stamp (a keep inside a merged alternative
  // stamps nobody: ruling D12): a node or a domain of AIW's or Sol's words that is no proposal and that no person's stamp
  // stands behind binds nothing.
  { const {p, made} = typedTidewater(), q = structuredClone(p); q.runtime.nodes.push({id: 'dn-090', ref: 'DN-090', revision: 1, title: 'Kept by nobody', kind: 'region', parentId: '', domainId: '', jurisdiction: '', place: '', provider: '', tier: '', exposure: '', address: '', reason: '', owner: '', basis: '', boundaryIds: [], origin: 'sol-draft', history: []});
    q.technology.domains.push({id: 'fd-090', ref: 'FD-090', revision: 1, title: 'Kept by nobody', scope: '', cause: 'location', basis: '', owner: '', recoveryOwner: '', treatment: '', parentId: '', origin: 'suggestion', history: []});
    const r = withFinalReview(q); refuses(r, 'runtime.locate', {zoneId: I.zone3, nodeId: 'dn-090'}, /DN-090 is no person's record yet: a person keeps it first/);
    refuses(r, 'runtime.locate', {zoneId: I.zone3, domainIds: ['fd-090']}, /FD-090 is no person's record yet/); refuses(r, 'runtime.node', {id: made.region, domainId: 'fd-090'}, /FD-090 is no person's record yet/);
    const kept = structuredClone(r); kept.runtime.nodes.at(-1).provenance = {reviewed: {by: B, at: AT, how: 'kept'}}; assert.equal(doc(kept, 'runtime.locate', {zoneId: I.zone3, nodeId: 'dn-090'}).runtime.zones.find(z => z.id === I.zone3).nodeId, 'dn-090', 'kept by a person, it binds'); }
  pass('S1.12: record.keep of a node Sol drafted and of a failure domain AIW proposed is refused from an agent account, a draft by Sol and an import, alone, in a reviewed batch and in a saved alternative; both stay proposals, bind nothing and read as no person\'s; a person keeps them, alone and in a batch, stamped as kept by them, and then they bind');
});

// (the lead's ruling L2; the review's must-fix 2 and 4) Zones of one environment are compared for independence only when
// they can be: the package's one reader (hostingComparison) answers whether the hosting zones of an environment are
// comparable, and while they are not one error of Chapter 10 names the zones and what a person does. The reviewer's
// walk: in every state either the six findings of the all-named design stand or this error does.
await block('S1.13 zones compared only when they can be', () => {
  need();
  const I = F.ids(), ch10 = q => CHAPTERS.find(c => c.id === 10).checks(withFinalReview(q)), ids10 = q => ch10(q).map(f => f.id), ERR = 'topology-incomparable:' + I.production;
  const facts = q => Object.keys(planFacts(reasoningSource(q), q.runtime.plans.find(r => r.id === I.apiPlan)).domains).sort();
  // both production zones named AZ-1: the six findings of one shared failure domain
  let p = doc(doc(started(), 'runtime.zone', {id: I.zone2, failureDomain: 'AZ-1'}), 'technology.domain-proposals');
  const six = ids10(p).filter(id => /^(standby|backup-domain|single-domain|isolate)/.test(id) && !id.includes(I.recovery)), level = (q, id) => ch10(q).find(f => f.id === id)?.level;
  assert.ok(six.length >= 5 && six.includes('standby:' + I.storePlan) && six.includes('backup-domain:' + I.storePlan), 'the all-named design reads one shared domain: ' + six.join(', '));
  assert.deepEqual(facts(p), ['az-1']);
  const held = (q, why) => { const now = ids10(q); assert.ok(six.every(id => now.includes(id)) || level(q, ERR) === 'error', why + ': the six findings stand, or the error does: ' + now.join(', ')); };
  held(p, 'all named');
  // the reviewer's walk: keep AIW's proposal for AZ-1, locate zone 1 into it, then zone 2
  const fd = p.technology.domains.find(d => d.title === 'AZ-1').id; p = doc(p, 'record.keep', {id: fd, chapter: 6}); domainOf(p, fd).provenance = {reviewed: {by: A, at: AT, how: 'kept'}}; held(p, 'kept');
  p = doc(p, 'runtime.locate', {zoneId: I.zone1, domainIds: [fd]}); held(p, 'zone 1 typed, zone 2 named');
  { const f = ch10(p).find(x => x.id === ERR); assert.deepEqual([f?.level, f?.hard, f?.objectId], ['error', true, I.production], 'one error of Chapter 10, which no treatment waives');
    assert.match(f.detail, /ZON-001 stands in a typed failure domain .*ZON-002 is only named/); assert.match(f.detail, /Locate ZON-002 in its failure domain/); assert.ok(!/runtime\.|record\./.test(f.title + f.detail), 'it names no command type');
    assert.deepEqual(T.hostingComparison(p, I.production).issues.map(x => x.kind), ['mixed']); assert.equal(T.hostingComparison(p, I.recovery).comparable, true);
    const q = withFinalReview(p); assert.ok(reviewBlockers(q).some(b => String(b.id || b.findingId || '').includes(ERR) || JSON.stringify(b).includes(ERR)), 'it blocks the review'); }
  p = doc(p, 'runtime.locate', {zoneId: I.zone2, domainIds: [fd]}); held(p, 'both typed'); assert.ok(six.every(id => ids10(p).includes(id)) && !ids10(p).includes(ERR), 'both typed into one domain: the six findings, no error'); assert.deepEqual(facts(p), [fd]);
  // (b) a hosting domain inside another's: not compared
  { let q = doc(p, 'technology.domain', {title: 'Norway East region', scope: 'region', cause: 'location'}); const region = q.technology.domains.at(-1).id;
    q = doc(q, 'technology.domain', {title: 'Bergen AZ 2', scope: 'zone', cause: 'location', parentId: region}); const az2 = q.technology.domains.at(-1).id;
    q = doc(doc(q, 'runtime.locate', {zoneId: I.zone1, domainIds: [region]}), 'runtime.locate', {zoneId: I.zone2, domainIds: [az2]});
    assert.equal(level(q, ERR), 'error', 'a zone in a domain inside the domain of another zone is not compared'); assert.deepEqual(T.hostingComparison(q, I.production).issues.map(x => x.kind), ['nested']);
    assert.match(ch10(q).find(x => x.id === ERR).detail, new RegExp(domainOf(q, az2).ref + ', where ZON-002 stands, lies inside ' + domainOf(q, region).ref + ', where ZON-001 stands')); }
  // (c) a zone that names a domain, a cause or a node that is not standing
  for (const [why, spoil] of [['a domain not there', q => { q.technology.domains = q.technology.domains.filter(d => d.id !== fd); }], ['a domain that is a proposal', q => { domainOf(q, fd).state = 'proposed'; }], ['a node not there', q => { zoneOf(q, I.zone1).nodeId = 'dn-404'; }], ['a cause not there', q => { zoneOf(q, I.zone1).domainIds = [fd, 'fd-404']; }]]) {
    const q = structuredClone(p); spoil(q); assert.equal(level(q, ERR), 'error', why); assert.ok(T.hostingComparison(q, I.production).issues.some(x => x.kind === 'not-standing'), why); }
  // an untyped project and an environment whose zones are all named read as before: no such finding
  assert.ok(!ids10(doc(F.tidewater(), 'runtime.zone', {id: I.zone2, failureDomain: 'AZ-1'})).some(id => id.startsWith('topology-')));
  // MARKED FOR SLICE 2 (ruling L2; the retirement list): two zones that share a stated cause (domainIds after the first)
  // still read as independent in the built-in checks today. Slice 2's finding for a shared cause, evaluated over the
  // ancestors, flips this: it then asserts the opposite.
  { let q = doc(p, 'technology.domain', {title: 'Bergen AZ 2', scope: 'zone', cause: 'location'}); const other = q.technology.domains.at(-1).id;
    q = doc(q, 'technology.domain', {title: 'One power feed', scope: 'site', cause: 'power'}); const power = q.technology.domains.at(-1).id;
    q = doc(doc(q, 'runtime.locate', {zoneId: I.zone1, domainIds: [fd, power]}), 'runtime.locate', {zoneId: I.zone2, domainIds: [other, power]});
    assert.ok(T.hostingComparison(q, I.production).comparable, 'comparable');
    assert.equal(level(q, 'standby:' + I.storePlan), undefined, 'SLICE 2 FLIPS THIS: a shared stated cause reads as independent in the built-in checks today'); assert.deepEqual(facts(q), [fd, other].sort()); }
  pass('S1.13: the hosting zones of an environment are compared only when they can be (hostingComparison): partly typed, one hosting domain inside another\'s, or naming a domain, a cause or a node that is not standing, they raise one error of Chapter 10 that no treatment waives, names the zones and says what a person does; in every state of the reviewer\'s walk the six findings or the error stand; a shared stated cause still reads as independent (held for slice 2 to flip)');
});

// (the lead's ruling L3; the review's must-fix 3, should-fix 3 and 4) No zone or placement is left naming a record that
// is not there: the tracker mends every zone and placement at the end of every commit and journals what it drops; a
// zone made and located in one commit has its location journalled; a node or a domain is not restored while its parent
// or its failure domain is not standing, nor deeper than its tree goes.
await block('S1.14 nothing left naming what is not there', async () => {
  need();
  const I = F.ids();
  for (const as of [A, AGENT]) {
    const h = await F.server(worker), d = () => h.state.document, events = () => d().changes?.events || [], ok = (r, why) => assert.equal(r.status, 200, (why || 'accepted') + ': ' + JSON.stringify(r.body).slice(0, 300));
    const batch = async (commands, who = as) => { await h.read(who); return h.send('workspace.apply', {commands, stamp: previewWorkingChange(d(), commands).stamp, reason: 'Moved out and back.', ...(who === AGENT ? {reviewed: false} : {reviewed: true})}, who); };
    try {
      // a typed zone 2 on the server, through its commands: its domain, its node and a cluster its placement stands in
      const sent = {}; for (const [type, payload, key] of [['runtime.topology-start', {}], ['technology.domain', {title: 'Bergen availability zone 2', scope: 'zone', cause: 'location'}, 'fd'], ['runtime.node', {title: 'Bergen AZ 2', kind: 'availability-zone'}, 'az'], ['runtime.node', {title: 'Cluster 2', kind: 'cluster', parentId: 'dn-001'}, 'cluster']]) { const r = await h.send(type, payload); ok(r, type); if (key) sent[key] = r.body.selected; }
      ok(await h.send('runtime.locate', {zoneId: I.zone2, nodeId: sent.az, domainIds: [sent.fd]}));
      const placement = d().runtime.placements.find(l => l.planId === I.apiPlan && l.zoneId === I.zone2); ok(await h.send('runtime.locate', {placementId: placement.id, nodeId: sent.cluster}));
      const plans = [...new Set(d().runtime.placements.filter(l => l.zoneId === I.zone2).map(l => l.planId))], n = events().length, retire = (id, chapter) => ({type: 'record.retire', payload: {id, chapter, reason: 'Moved out for a while.'}});
      // one batch: the plans with copies in the zone, the zone, the node and the domain only it names, then the zone and the plans back
      const r = await batch([...plans.map(id => retire(id, 10)), retire(I.zone2, 10), retire(sent.cluster, 10), retire(sent.az, 10), retire(sent.fd, 6), {type: 'record.restore', payload: {id: I.zone2, chapter: 10}}, ...plans.map(id => ({type: 'record.restore', payload: {id, chapter: 10}}))]);
      if (r.status === 200) {
        const z = zoneOf(d(), I.zone2), l = d().runtime.placements.find(x => x.id === placement.id);
        assert.ok(!('domainIds' in z) && !('nodeId' in z), as + ': the zone names no record that is not there: ' + JSON.stringify([z.nodeId, z.domainIds]));
        assert.ok(l && !('nodeId' in l), as + ': nor the placement: ' + JSON.stringify(l));
        assert.equal(runtimeModel.failureDomainKey(z), 'az-2', 'it reads by its name again');
        const added = events().slice(n); assert.ok(added.some(e => e.source.id === I.zone2 && e.fields.some(f => f.key === 'domainIds' && sameText(f.before, [sent.fd]) && sameText(f.after, []))), as + ': what was dropped of the zone is journalled');
        assert.ok(added.some(e => e.source.id === placement.id && e.fields.some(f => f.key === 'nodeId' && f.before === sent.cluster && f.after === '')), as + ': and of the placement');
      } else assert.equal(r.status, 400, as + ': or the batch is refused');
      // a zone made and located in one commit: its location is journalled
      { const id = 'zon-' + String(d().runtime.counters.zone + 1).padStart(3, '0'), m = events().length; ok(await h.send('technology.domain', {title: 'Bergen availability zone 3', scope: 'zone', cause: 'location'}, A));
        const r2 = await batch([{type: 'runtime.zone', payload: {environmentId: I.production, title: 'Bergen zone 3', kind: 'hosting', failureDomain: 'AZ-3', isolation: 'Separate power (synthetic).', owner: 'Reservations team (synthetic)'}}, {type: 'runtime.locate', payload: {zoneId: id, domainIds: [d().technology.domains.at(-1).id]}}], A); ok(r2, 'made and located');
        assert.deepEqual(zoneOf(d(), id)?.domainIds, [d().technology.domains.at(-1).id]);
        assert.ok(events().slice(m).some(e => e.source.id === id && e.source.kind === 'zone' && e.fields.some(f => f.key === 'domainIds')), 'the location of a zone made in the same commit is journalled'); }
    } finally { h.close(); }
  }
  // the package's own collections: a node is not restored while its parent or its failure domain is not standing, nor into a ninth level
  { let {p} = typedTidewater();
    p = doc(p, 'technology.domain', {title: 'Rack 9', scope: 'node', cause: 'location'}); const fd = p.technology.domains.at(-1).id;
    p = doc(p, 'runtime.node', {title: 'Spare site', kind: 'site'}); const parent = p.runtime.nodes.at(-1).id;
    p = doc(p, 'runtime.node', {title: 'Spare rack', kind: 'node-pool', parentId: parent, domainId: fd}); const leaf = p.runtime.nodes.at(-1).id;
    p = doc(p, 'record.retire', {id: leaf, chapter: 10, reason: 'Not built yet.'});
    let q = doc(p, 'record.retire', {id: parent, chapter: 10, reason: 'Not built yet.'});
    refuses(q, 'record.restore', {id: leaf, chapter: 10}, new RegExp(nodeOf(p, parent).ref + ', which it lies in, is not standing in the design'), 'not while its parent is retired');
    q = doc(p, 'record.retire', {id: fd, chapter: 6, reason: 'Not a domain of its own.'});
    refuses(q, 'record.restore', {id: leaf, chapter: 10}, new RegExp(domainOf(p, fd).ref + ', the failure domain it is, is not standing in the design'), 'nor while its failure domain is');
    // the depth bound through the lifecycle: retire the leaf of an eight-level chain, put the chain under a new root, restore the leaf
    let c = doc(p, 'runtime.node', {title: 'L1', kind: 'site'}); const ids8 = [c.runtime.nodes.at(-1).id];
    for (let i = 2; i <= 8; i++) { c = doc(c, 'runtime.node', {title: 'L' + i, kind: 'network', parentId: ids8.at(-1)}); ids8.push(c.runtime.nodes.at(-1).id); }
    const leaf8 = ids8.at(-1); c = doc(c, 'record.retire', {id: leaf8, chapter: 10, reason: 'Moved out for a while.'});
    c = doc(c, 'runtime.node', {title: 'Root', kind: 'account'}); c = doc(c, 'runtime.node', {id: ids8[0], parentId: c.runtime.nodes.at(-1).id});
    refuses(c, 'record.restore', {id: leaf8, chapter: 10}, /Deployment nodes nest at most 8 deep/, 'nor into a ninth level');
    // failure domains likewise: not under a domain that is not standing, nor deeper than six
    let e = doc(p, 'technology.domain', {title: 'Site D', scope: 'site', cause: 'location'}); const top = e.technology.domains.at(-1).id;
    e = doc(e, 'technology.domain', {title: 'Room D', scope: 'node', cause: 'location', parentId: top}); const room = e.technology.domains.at(-1).id;
    // (ruling M5; was: matched by /FD-/i only, because the parent's ref was read from a document that does not hold it) the exact sentence, each ref
    // read from the document that holds the record
    const [roomRef, topRef] = [domainOf(e, room).ref, domainOf(e, top).ref]; assert.ok(/^FD-\d{3}$/.test(roomRef) && /^FD-\d{3}$/.test(topRef) && roomRef !== topRef);
    e = doc(doc(e, 'record.retire', {id: room, chapter: 6, reason: 'Moved out for a while.'}), 'record.retire', {id: top, chapter: 6, reason: 'Moved out for a while.'});
    refuses(e, 'record.restore', {id: room, chapter: 6}, new RegExp('^' + roomRef + ' cannot come back yet: ' + topRef + ', which it lies in, is not standing in the design\\. Restore it first, or bring ' + roomRef + ' back elsewhere\\.$'), 'a domain is not restored under a domain that is not there'); }
  pass('S1.14: after a batch that retires the plans, the zone, the node and the domain only it names and restores the zone and the plans, by a person and by an agent account, no zone or placement names a record that is not there and what was dropped is journalled; a zone made and located in one commit has its location journalled; a node is not restored while its parent or its failure domain is not standing, nor into a ninth level, and a domain not under a domain that is not there');
});

// (the lead's ruling L4; the review's must-fix 5) A command answers the record it wrote: runtime.locate on a placement
// answers the placement, so that a batch restamps it as the commit's. A zone or a placement a merged alternative
// relocates keeps its earlier stamp until the lead's slice for ruling D12 (a merge stamps no author).
await block('S1.15 a locate answers what it wrote', async () => {
  need();
  const I = F.ids(), h = await F.server(worker), d = () => h.state.document, ok = (r, why) => assert.equal(r.status, 200, (why || 'accepted') + ': ' + JSON.stringify(r.body).slice(0, 300));
  const batch = async (commands, as) => { await h.read(as); return h.send('workspace.apply', {commands, stamp: previewWorkingChange(d(), commands).stamp, reason: 'Located.', reviewed: as !== AGENT}, as); };
  try {
    ok(await h.send('runtime.topology-start', {})); ok(await h.send('runtime.node', {title: 'Bergen AZ 1', kind: 'availability-zone'})); const az = h.state.selected;
    ok(await h.send('runtime.node', {title: 'Cluster A', kind: 'cluster', parentId: az})); const a = h.state.selected; ok(await h.send('runtime.node', {title: 'Cluster B', kind: 'cluster', parentId: az})); const b = h.state.selected;
    ok(await h.send('runtime.locate', {zoneId: I.zone1, nodeId: az})); const placement = d().runtime.placements.find(l => l.planId === I.apiPlan && l.zoneId === I.zone1);
    { const r = await h.send('runtime.locate', {placementId: placement.id, nodeId: a}); ok(r); assert.equal(r.body.selected, placement.id, 'alone, the placement is the record it wrote'); }
    assert.deepEqual(d().runtime.placements.find(l => l.id === placement.id).provenance?.author?.by, A);
    // the agent's batch: the placement is restamped as the draft it is
    ok(await batch([{type: 'runtime.locate', payload: {placementId: placement.id, nodeId: b}}], AGENT), 'the agent\'s batch');
    { const l = d().runtime.placements.find(x => x.id === placement.id); assert.deepEqual([l.nodeId, l.provenance?.author?.kind, authorship(l).kind], [b, 'sol-draft', 'sol-draft'], 'restamped as the commit\'s, in a batch too'); }
    // a zone in a batch likewise
    ok(await batch([{type: 'runtime.locate', payload: {zoneId: I.zone1, reason: 'Drafted reason.'}}], AGENT)); assert.equal(zoneOf(d(), I.zone1).provenance?.author?.kind, 'sol-draft');
    // a merged alternative (ruling D12): the placement and the zone it relocates keep their earlier stamps; the case says so
    { const commands = [{type: 'runtime.locate', payload: {placementId: placement.id, nodeId: a}}, {type: 'runtime.locate', payload: {zoneId: I.zone1, reason: 'Merged reason.'}}];
      ok(await h.send('workspace.alternative', {commands, stamp: previewScenarioAlternative(d(), commands, undefined).stamp, title: 'Back to A', reason: 'Back.'}, B)); const alt = d().workbench.alternatives.at(-1);
      ok(await h.send('workspace.merge', {id: alt.id, stamp: rebaseWorkingAlternative(d(), alt).stamp, reviewed: true, reason: 'Merged.'}, C));
      const l = d().runtime.placements.find(x => x.id === placement.id); assert.equal(l.nodeId, a);
      assert.deepEqual([l.provenance?.author?.kind, zoneOf(d(), I.zone1).provenance?.author?.kind], ['sol-draft', 'sol-draft'], 'KNOWN LIMIT (ruling D12): a merge stamps no author, so the relocated placement and zone keep the stamp they had'); }
  } finally { h.close(); }
  pass('S1.15: runtime.locate on a placement answers the placement as the record it wrote, alone and in a batch, so the agent\'s batch restamps it as the draft it is (a zone likewise); a placement and a zone a merged alternative relocates keep their earlier stamps until the slice of ruling D12');
});

// (the lead's rulings L5 and L6; the review's should-fix 1, 2 and 6) The choice to type a project is design; who chose
// it, and when, is not: the package states the marker through S0's design row (ruling J3), typed or not, and leaves
// `review` out. A recovery import moves the step aside (importedReview: ruling M2), as a template copy clears it (ruling
// F3): the topology commands are refused there until a person takes the step, and the readings stay typed. What the
// package's records say leaves out their history, review, confirmed and provenance, and a proposal says nothing.
await block('S1.16 typed or not is design; who chose it is not', async () => {
  need();
  const I = F.ids(), base = F.tidewater(), stamps = p => [reviewSourceStamp(p), reviewDesignStamp(p), evidenceStamp(p)];
  const marked = review => withFinalReview({...base, runtime: {...base.runtime, topology: {schemaVersion: 1, review}}});
  // a hand-made pair at one version: typed and untyped are two designs
  const typedByHand = marked({actor: A, at: AT, account: 'person'});
  assert.equal(typedByHand.runtime.version, base.runtime.version, 'the pair is at one version');
  assert.notEqual(reviewSourceStamp(typedByHand), reviewSourceStamp(base), 'typed or not is read by the design fingerprint: two stamps at one version');
  assert.equal(evidenceStamp(typedByHand), evidenceStamp(base), 'the choice is no evidence');
  for (const review of [null, {actor: B, at: '2026-12-01T00:00:00.000Z', account: 'person'}]) assert.deepEqual(stamps(marked(review)), stamps(typedByHand), 'who chose it, and when, moves no stamp');
  assert.deepEqual(reviewSource(typedByHand).runtime.topology, {schemaVersion: 1}, 'the design source holds what the package states of the marker');
  assert.ok(!('topology' in reviewSource(base).runtime) && !('nodes' in reviewSource(base).runtime) && !('domains' in reviewSource(base).technology), 'an untyped document\'s design source holds none of it');
  // the package's records: their history, review, confirmed and provenance move no design stamp (S0's rule for every package, ruling J3)
  const {p: typed, made} = typedTidewater();
  assert.equal(R.assertStepsMoveNoStamp(typed, d => [...d.runtime.nodes, ...d.technology.domains]), typed.runtime.nodes.length + typed.technology.domains.length);
  // a recovery import: the step was taken on the workbench the package came from, so it is nobody's here
  const IMPORTED = '2026-11-20T00:00:00.000Z', recovered = withFinalReview(neutraliseImportedAuthority(structuredClone(typed), IMPORTED, C));
  // (ruling M2; was: recovered.runtime.topology.review.actor is A, "the recovery keeps what the other workbench wrote")
  // the recovery keeps what the other workbench wrote as history, under importedReview, and the step is nobody's here
  assert.equal(recovered.finalReview.imported.at, IMPORTED); assert.deepEqual([recovered.runtime.topology.review, recovered.runtime.topology.importedReview], [null, typed.runtime.topology.review], 'the recovery keeps what the other workbench wrote as history, and no step');
  assert.equal(recovered.runtime.topology.importedReview.actor, A); assert.deepEqual(Object.keys(recovered.runtime.topology).sort(), ['importedReview', 'review', 'schemaVersion']);
  // (ruling M2; the verifier's new problem 2) a recovery import carries no topology step, whatever the package says of
  // itself: neutraliseImportedAuthority moves it aside before anything else, so no date is compared. A package whose
  // step is dated after the import (forged, or a clock that runs ahead), and one without finalReview, are refused alike.
  for (const [why, forge] of [['a step dated after the import', q => { q.runtime.topology.review = {...q.runtime.topology.review, at: '2099-01-01T00:00:00.000Z'}; }], ['a package without finalReview', q => { delete q.finalReview; }], ['both', q => { q.runtime.topology.review = {...q.runtime.topology.review, at: '2099-01-01T00:00:00.000Z'}; delete q.finalReview; }]]) {
    const q = structuredClone(typed); forge(q); const back = withFinalReview(neutraliseImportedAuthority(q, IMPORTED, C));
    assert.deepEqual([back.runtime.topology.schemaVersion, back.runtime.topology.review, back.runtime.topology.importedReview?.actor], [1, null, A], why + ': the step is moved aside and kept as history');
    for (const [actor, author, payload] of [[A, person(A), {title: 'A node', kind: 'site'}], [AGENT, {kind: 'sol-draft', id: AGENT, account: 'agent'}, {title: 'A node', kind: 'site', origin: 'sol-draft'}]])
      assert.throws(() => run(back, 'runtime.node', payload, actor, author), e => e.message === T.NOT_HERE, why + ': ' + actor + '\'s runtime.node is refused until a person here takes the step');
    assert.equal(runtimeModel.failureDomainKey(zoneOf(back, I.zone1)), made.fdZone1, why + ': the readings stay typed');
  }
  // a document with no marker gains none, and a copy's cleared step stays cleared
  { const plain = neutraliseImportedAuthority(structuredClone(F.tidewater()), IMPORTED, C); assert.equal(plain.runtime.topology, undefined, 'an untyped document gains no marker');
    const copied = structuredClone(typed); copied.runtime.topology.review = null; assert.deepEqual(neutraliseImportedAuthority(copied, IMPORTED, C).runtime.topology, {schemaVersion: 1, review: null}, 'a step nobody took is no history'); }
  for (const [type, payload] of [['runtime.node', {title: 'A node', kind: 'site'}], ['technology.domain', {title: 'A domain'}], ['technology.domain-proposals', {}], ['runtime.locate', {zoneId: I.zone3, reason: 'Moved.'}], ['runtime.node', {id: made.region, reason: 'Changed after the recovery.'}]])
    refuses(recovered, type, payload, /topology of this project is typed, but nobody here has chosen it yet\. A signed-in person chooses typed topology for this project first\./, type + ' in a recovered project before a person here takes the step');
  // the readings stay typed
  assert.equal(runtimeModel.failureDomainKey(zoneOf(recovered, I.zone1)), made.fdZone1); assert.ok(recordGraph(recovered).objects.has(made.region), 'its records are in the record graph');
  // a person takes the step here: the marker names them, no design stamp and no version moves, the step is journalled, and the commands are taken
  const LATER = '2026-11-21T09:00:00.000Z', taken = withFinalReview(commandHandler('runtime.topology-start')(structuredClone(recovered), {type: 'runtime.topology-start', payload: {}}, LATER, C, {author: person(C)}).document);
  assert.deepEqual([taken.runtime.topology.review.actor, taken.runtime.topology.review.account, taken.runtime.topology.review.at > IMPORTED], [C, 'person', true], 'a person here took the step');
  assert.deepEqual([reviewSourceStamp(taken), taken.runtime.version], [reviewSourceStamp(recovered), recovered.runtime.version], 'taking it again moves no design stamp and no version');
  { const next = structuredClone(taken); mine().track(recovered, next, {type: 'runtime.topology-start', payload: {}}, AT);
    assert.deepEqual(next.changes.events.slice((recovered.changes?.events || []).length).map(e => [e.source.kind, e.after]), [['topology', {typed: true}]], 'the step taken here is journalled'); }
  assert.equal(run(taken, 'runtime.node', {title: 'A node', kind: 'site'}).selected, 'dn-00' + (typed.runtime.nodes.length + 1), 'then the topology commands are taken');
  assert.equal(run(taken, 'runtime.topology-start', {}, B).document.runtime.topology.review.actor, C, 'and a second request changes nothing');
  // a proposal says nothing to the design fingerprint (ruling L6): the design source holds no proposal, and the document
  // with only proposals reads as the one without them
  { const q = doc(started(), 'technology.domain-proposals'); assert.ok(q.technology.domains.length > 0);
    assert.ok(!('domains' in reviewSource(q).technology), 'proposals only: the design source holds no failure domain');
    const sol = doc(doc(started(), 'runtime.node', {title: 'Drafted region', kind: 'region', origin: 'sol-draft'}, AGENT, {kind: 'sol-draft', id: AGENT, account: 'agent'}), 'technology.domain', {title: 'Drafted domain', origin: 'sol-draft'}, AGENT, {kind: 'sol-draft', id: AGENT, account: 'agent'});
    assert.deepEqual([sol.runtime.nodes[0].state, sol.technology.domains[0].state], ['proposed', 'proposed']);
    assert.deepEqual([reviewSourceStamp(sol), sol.runtime.version, sol.technology.version], [reviewSourceStamp(started()), started().runtime.version, started().technology.version], 'a draft that arrives as a proposal moves no design stamp and no version'); }
  pass('S1.16: typed and untyped read as two designs at one version, and who chose it and when moves no stamp (the marker stated through S0\'s design row, review left out); the history, review, confirmed and provenance of a node and a failure domain move no design stamp; in a recovered project the step taken elsewhere is nobody\'s: the topology commands are refused until a person here takes it, the readings stay typed, and taking it moves no stamp and no version and is journalled; a proposal says nothing to the design fingerprint and moves no version');
});

// (the lead's ruling L7) The readers that still went by name and erred towards independence read failureDomainKey:
// the walkthrough's "lose a failure domain" (simulateRuntime, design hook H4) and the Chapter 10 Model view's key
// (deploy-model.js, design hook H15). Two zones typed into one failure domain fail together whatever they are named;
// two zones typed into two domains do not, though they share a name. An untyped project reads by name as before.
await block('S1.17 the walkthrough and the Model view read the typed domain', () => {
  need();
  const I = F.ids(), lose = (p, zoneId) => rt.simulateRuntime(p, {environmentId: I.production, zoneId, mode: 'domain', durationMinutes: 60}).failedZoneIds.slice().sort();
  const groups = p => deploySource(p, {envId: I.production}).domains.map(d => [d.key, d.zones.slice().sort()]), scenarios = p => deploySource(p, {envId: I.production}).scenarios.filter(s => s.mode === 'domain').map(s => s.id);
  const {p: typed, made} = typedTidewater();
  // one domain under two names: the zones are named AZ-1 and AZ-2, and both stand in Bergen availability zone 1
  const one = doc(typed, 'runtime.locate', {zoneId: I.zone2, nodeId: made.az1, domainIds: [made.fdZone1]});
  assert.deepEqual([zoneOf(one, I.zone1).failureDomain, zoneOf(one, I.zone2).failureDomain], ['AZ-1', 'AZ-2']);
  assert.deepEqual(lose(one, I.zone1), [I.zone1, I.zone2].sort(), 'losing the failure domain of zone 1 loses zone 2 with it');
  assert.deepEqual(groups(one), [[made.fdZone1, [I.zone1, I.zone2].sort()]], 'the Model view groups the two zones as one failure domain');
  assert.deepEqual(scenarios(one), ['domain:' + made.fdZone1], 'and offers losing it as one scenario');
  // two domains under one name: both zones are named AZ-1 and stand in two typed domains
  const two = doc(typed, 'runtime.zone', {id: I.zone2, failureDomain: 'AZ-1'});
  assert.deepEqual(lose(two, I.zone1), [I.zone1], 'losing zone 1\'s domain loses zone 1 only'); assert.deepEqual(groups(two).map(g => g[1].length), [1, 1]); assert.deepEqual(scenarios(two), []);
  // an untyped project reads by name, as on rc.10.73.42
  { const named = doc(F.tidewater(), 'runtime.zone', {id: I.zone2, failureDomain: 'AZ-1'});
    assert.deepEqual(lose(named, I.zone1), [I.zone1, I.zone2].sort()); assert.deepEqual(groups(named), [['az-1', [I.zone1, I.zone2].sort()]]); assert.deepEqual(lose(F.tidewater(), I.zone1), [I.zone1]); }
  pass('S1.17: simulateRuntime\'s "lose a failure domain" and the Chapter 10 Model view read failureDomainKey: two zones typed into one domain under two names fail together and form one group and one scenario; two typed domains under one name do not; an untyped project reads by name as before');
});

// (the lead's ruling L8, first part; ruling B8; the review's should-fix 7) Every limit of the package is reached through
// the commands, with every field, open entry and history at its limit: 60 failure domains, a chain six deep, 120
// deployment nodes, a chain eight deep, twenty trust boundaries on a node, twelve failure domains on a zone. The
// document is measured there against the 8,000,000-character bound of a document (rulings B8 and E3): the package's
// limits bind first, and the case says by how much.
const DOCUMENT_BOUND = 8000000;
await block('S1.18 every limit reached through the commands', () => {
  need();
  const I = F.ids(), L = T.TOPOLOGY_LIMITS;
  assert.deepEqual({...L}, {nodes: 120, domains: 60, nodeDepth: 8, domainDepth: 6, zoneDomains: 12}, 'the package\'s limits');
  let {p, made} = typedTidewater();
  // in place, as the handler works on the copy it is handed (a copy per command would make the case quadratic)
  const send = (type, payload) => { const r = commandHandler(type)(p, {type, payload}, AT, A, {author: person(A)}); p = r.document; return r.selected; };
  const fails = (type, payload, words, why) => assert.throws(() => commandHandler(type)(structuredClone(p), {type, payload}, AT, A, {author: person(A)}), e => { assert.match(e.message, words, why + ': ' + e.message); return true; }, why);
  const x = n => 'x'.repeat(n), OPEN = fields => Object.fromEntries(fields.map(f => [f, {state: 'open-question', question: x(600), raisedBy: x(180), at: x(40), source: x(600)}]));
  const DOMAIN_OPEN = ['scope', 'cause', 'basis', 'owner', 'recoveryOwner', 'treatment'], NODE_OPEN = ['place', 'provider', 'jurisdiction', 'tier', 'exposure', 'address', 'reason', 'owner', 'basis'];
  for (let i = 0; i < 21; i++) send('technology.boundary', {title: 'Boundary ' + i, owner: 'Owner (synthetic)', policy: 'Crossing policy (synthetic)'});
  const boundaries = p.technology.boundaries.map(b => b.id).slice(-21);
  // failure domains to one short of the bound, the first six a chain six deep; every field and open entry at its limit
  const domain = parentId => send('technology.domain', {title: x(160), scope: 'region', cause: 'power', basis: x(2400), owner: x(180), recoveryOwner: x(180), treatment: 'isolate', parentId, open: OPEN(DOMAIN_OPEN)});
  const chain = []; for (let i = 0; i < L.domainDepth; i++) chain.push(domain(chain.at(-1) || ''));
  fails('technology.domain', {title: 'A seventh level', parentId: chain.at(-1)}, /Failure domains nest at most 6 deep/, 'a seventh level of failure domains');
  while (p.technology.domains.length < L.domains - 1) domain('');
  // AIW's proposals: none is dropped silently at the bound (two names in use would make 61)
  fails('technology.domain-proposals', {}, /This workspace keeps up to 60 failure domains; 2 names in use would make 61\./, 'proposals past the bound');
  domain(''); assert.equal(p.technology.domains.length, L.domains);
  fails('technology.domain', {title: 'One too many'}, /^This workspace keeps up to 60 failure domains\.$/, 'the 61st failure domain');
  // a zone names twelve failure domains: the one it stands in and eleven causes it shares; a thirteenth is refused
  const causes = p.technology.domains.filter(d => d.cause === 'power').map(d => d.id);
  fails('runtime.locate', {zoneId: I.zone1, domainIds: [made.fdZone1, ...causes.slice(0, 12)]}, /A zone names up to 12 failure domains; 13 were sent/, 'a thirteenth failure domain on a zone');
  send('runtime.locate', {zoneId: I.zone1, domainIds: [made.fdZone1, ...causes.slice(0, 11)], reason: x(600)}); assert.equal(zoneOf(p, I.zone1).domainIds.length, L.zoneDomains);
  // deployment nodes to the bound, a chain eight deep under the region; every field and open entry at its limit, twenty trust boundaries each
  const node = parentId => send('runtime.node', {title: x(160), kind: 'network', place: x(160), provider: x(160), tier: 'data', exposure: 'private', reason: x(600), owner: x(180), basis: x(2400), jurisdiction: 'NO', address: '2001:db8:1234:5678:9abc:def0:1234:5600/120', domainId: causes[0], parentId, boundaryIds: boundaries.slice(0, 20), open: OPEN(NODE_OPEN)});
  fails('runtime.node', {title: 'Twenty-one boundaries', kind: 'site', boundaryIds: boundaries}, /A deployment node names up to 20 trust boundaries; 21 were sent/, 'a twenty-first trust boundary on a node');
  const nodes = [made.region]; while (nodes.length < L.nodeDepth) nodes.push(node(nodes.at(-1)));
  fails('runtime.node', {title: 'A ninth level', kind: 'site', parentId: nodes.at(-1)}, /Deployment nodes nest at most 8 deep/, 'a ninth level of deployment nodes');
  while (p.runtime.nodes.length < L.nodes) node('');
  fails('runtime.node', {title: 'One too many', kind: 'site'}, /^This workspace keeps up to 120 deployment nodes\.$/, 'the 121st deployment node');
  // every record's history to its bound: 24 revisions kept
  for (let i = 0; i < 25; i++) { for (const d of p.technology.domains) send('technology.domain', {id: d.id, title: x(150) + String(i).padStart(10, '0')}); for (const n of p.runtime.nodes) send('runtime.node', {id: n.id, title: x(150) + String(i).padStart(10, '0')}); }
  assert.ok([...p.technology.domains, ...p.runtime.nodes].every(r => r.history.length === 24), 'every history at its bound');
  // the document there, against the bound: the server stamps each record once more (provenance), at most STAMP characters
  // (two actor ids of 128 and their times); the journal of each change is kept apart from the document (project-storage.js)
  const STAMP = JSON.stringify({provenance: {author: {kind: 'person', by: x(128), at: AT, account: 'person'}, reviewed: {by: x(128), at: AT, how: 'confirmed'}}}).length;
  const records = p.runtime.nodes.length + p.technology.domains.length, own = JSON.stringify([p.runtime.nodes, p.technology.domains]).length + records * STAMP;
  const zoneFields = JSON.stringify({nodeId: 'dn-120', domainIds: zoneOf(p, I.zone1).domainIds, reason: x(600)}).length, whole = JSON.stringify(p).length + records * STAMP;
  assert.ok(own <= DOCUMENT_BOUND / 2, 'at its limits the package\'s records take at most half of the document bound: ' + own + ' characters');
  assert.ok(whole < DOCUMENT_BOUND, 'the document at the package\'s limits is inside the bound: ' + whole + ' characters');
  // what one change of a node at its limits journals (before and after), which the journal keeps apart from the document
  const journalled = (() => { const before = structuredClone(p), next = structuredClone(p), r = commandHandler('runtime.node')(next, {type: 'runtime.node', payload: {id: nodes[1], basis: 'y'.repeat(2400)}}, AT, A, {author: person(A)}); mine().track(before, r.document, {type: 'runtime.node', payload: {}}, AT); return JSON.stringify(r.document.changes.events.at(-1)).length; })();
  pass('S1.18: every limit is reached through the commands with every field, open entry and history at its limit: 60 failure domains (proposals past the bound and the 61st refused, a seventh level refused), 12 failure domains on a zone (the 13th refused), 120 deployment nodes (the 121st and a ninth level refused, 20 trust boundaries a node); the package\'s records then take ' + own + ' characters (' + Math.round(own / records) + ' a record with its stamp), the whole document ' + whole + ' of the ' + DOCUMENT_BOUND + '-character bound, so the package\'s limits bind first while the rest of a project holds under ' + (DOCUMENT_BOUND - own) + ' characters; a zone\'s typed fields add at most ' + zoneFields + ' characters; one change of a node at its limits journals ' + journalled + ' characters, kept apart from the document');
});

// (the lead's rulings L8, second part, and L9; the review's should-fix 8, 9 and 10) Input: the jurisdiction is an
// officially assigned ISO 3166-1 alpha-2 code; a locate names a zone or a placement, not both; words are sent as text;
// a location takes no treatment; an address is stored in its canonical text, and the IPv4-mapped form is refused in hex
// as it is dotted. No refusal of the package names a command type.
await block('S1.19 input and words', () => {
  need();
  const I = F.ids(), {p, made} = typedTidewater();
  // jurisdiction: the officially assigned codes (249), never one reserved, user-assigned or lower-cased
  for (const code of ['NO', 'SE', 'GB', 'DE', 'US', 'AX', 'SS', 'ZW']) assert.equal(nodeOf(doc(p, 'runtime.node', {id: made.region, jurisdiction: code}), made.region).jurisdiction, code, code + ' is officially assigned');
  for (const code of ['ZZ', 'UK', 'EU', 'XK', 'AA', 'QM', 'XX', 'no', 'Gb', 'GBR']) refuses(p, 'runtime.node', {id: made.region, jurisdiction: code}, /Give the jurisdiction as an officially assigned ISO 3166-1 alpha-2 code \(NO, SE, GB\), or leave it not stated\./, 'jurisdiction ' + code);
  assert.equal(T.JURISDICTIONS.size, 249, 'the officially assigned codes');
  // a locate names a zone or a placement, not both
  const placement = p.runtime.placements.find(l => l.zoneId === I.zone1 && l.planId === I.apiPlan);
  refuses(p, 'runtime.locate', {zoneId: I.zone1, placementId: placement.id, nodeId: made.cluster}, /^Name a zone or a placement to locate, not both\.$/);
  // words are sent as text: an object, a number, a list or a truth value is refused, never stored as '[object Object]'
  for (const value of [{text: 'A name'}, 42, ['A name'], true]) {
    refuses(p, 'runtime.node', {id: made.region, title: value}, /The node name is words: send it as text\./, 'a node name sent as ' + JSON.stringify(value));
    refuses(p, 'technology.domain', {id: made.fdRegion, basis: value}, /The basis is words: send it as text\./, 'a basis sent as ' + JSON.stringify(value));
    refuses(p, 'runtime.locate', {zoneId: I.zone1, reason: value}, /The reason is words: send it as text\./, 'a reason sent as ' + JSON.stringify(value));
  }
  // a location takes no treatment: it is where something stands, not a cause shared
  refuses(p, 'technology.domain', {title: 'A site', scope: 'site', cause: 'location', treatment: 'accept'}, /A location is where something stands: it takes no treatment\. Leave the treatment not stated, or state a cause that is no location\./);
  { const shared = doc(p, 'technology.domain', {title: 'Shared power feed', scope: 'site', cause: 'power', treatment: 'isolate'}), id = shared.technology.domains.at(-1).id;
    assert.equal(domainOf(shared, id).treatment, 'isolate', 'a shared cause takes one');
    refuses(shared, 'technology.domain', {id, cause: 'location'}, /takes no treatment/, 'nor does a cause changed to a location while it keeps one'); }
  // an address is stored in its canonical text (RFC 5952; IPv4 dotted decimal) and the overlap check reads the parts
  for (const [sent, kept] of [['2001:0db8::/32', '2001:db8::/32'], ['2001:DB8:0:0:0:0:0:0/32', '2001:db8::/32'], ['2001:db8:0:0:1:0:0:1/128', '2001:db8::1:0:0:1/128'], ['2001:db8:0:1:0:0:0:1/128', '2001:db8:0:1::1/128'], ['0:0:0:0:0:0:0:0/0', '::/0'], ['0:0:0:0:0:0:0:1/128', '::1/128'], ['fd00:0:0:0:0:0:0:0/8', 'fd00::/8'], ['2001:db8:1:2:3:4:5:6/128', '2001:db8:1:2:3:4:5:6/128'], [' 10.20.0.0/16 ', '10.20.0.0/16']]) {
    assert.equal(nodeOf(doc(p, 'runtime.node', {id: made.region, address: sent}), made.region).address, kept, sent + ' is kept as ' + kept);
    assert.deepEqual(T.parsePrefix(sent).parts, T.parsePrefix(kept).parts, 'and reads as the same parts'); }
  for (const address of ['::ffff:0a00:0000/104', '::ffff:0:0/96', '0:0:0:0:0:ffff:c0a8:0100/120', '::FFFF:10.0.0.0/104']) refuses(p, 'runtime.node', {id: made.region, address}, /one IPv4 or IPv6 prefix/, 'the IPv4-mapped form ' + address);
  // no refusal of the package names a command type (ruling L9)
  { const source = readFileSync('public/topology-domain.js', 'utf8'), said = [...source.matchAll(/Error\(([^;]*?)\)(?:;|\})/g)].map(m => m[1]).concat([T.UNTYPED, T.NOT_HERE]);
    const TYPE = /\b(?:runtime\.(?:topology-start|node|locate)|technology\.domain(?:-proposals)?|record\.(?:keep|retire|restore)|workspace\.[a-z-]+)\b/;
    assert.ok(said.length > 30 && TYPE.test('(runtime.topology-start)') && !TYPE.test('technology.domains'), 'the scan reads the refusals');
    for (const words of said) assert.ok(!TYPE.test(words), 'a refusal names a command type: ' + words); }
  pass('S1.19: the jurisdiction is one of the 249 officially assigned ISO 3166-1 alpha-2 codes (ZZ, UK, EU, XK and lower case refused); a locate of a zone and a placement at once is refused; a name, a basis and a reason sent as anything but text are refused; a location takes no treatment; an address is kept in its canonical text and reads as the same parts, the IPv4-mapped form refused in hex as dotted; no refusal of the package names a command type');
});

// (the lead's ruling L10, second part; the review's concern 10) A defect of rc.10.73.42, fixed here: patchLinks in
// public/technology-domain.js named its limit through `fmt`, which that module does not define, so a list past its limit
// was answered with a general fault. A zone saved with 21 trust boundaries is answered with its own sentence.
await block('S1.20 a list past its limit is answered with its sentence', async () => {
  need();
  const I = F.ids(), h = await F.server(worker);
  try {
    for (let i = 0; i < 21; i++) assert.equal((await h.send('technology.boundary', {title: 'Boundary ' + i, owner: 'Owner (synthetic)', policy: 'Crossing policy (synthetic)'})).status, 200);
    const ids = h.state.document.technology.boundaries.map(b => b.id).slice(-21), r = await h.send('runtime.zone', {id: I.zone1, boundaryIds: ids});
    assert.equal(r.status, 400); assert.equal(r.error, 'A record links up to 20 trust boundaries; 21 were sent.', 'the sentence of the limit, not a general fault: ' + r.error);
    assert.equal((await h.send('runtime.zone', {id: I.zone1, boundaryIds: ids.slice(0, 20)})).status, 200, 'twenty are taken');
  } finally { h.close(); }
  assert.throws(() => run(F.tidewater(), 'runtime.zone', {id: I.zone1, boundaryIds: Array.from({length: 21}, (_, i) => 'tb-' + i)}), /Choose existing trust boundaries/, 'unknown ids are refused before the count, as before');
  pass('S1.20: a zone saved with 21 trust boundaries is refused with "A record links up to 20 trust boundaries; 21 were sent." through the server (on rc.10.73.42 a general fault), and twenty are taken');
});

// (the lead's ruling M1; the verifier's new problem 1) The mend drops only names of records that are not there: absent,
// retired or a proposal. A zone or a placement keeps a name while the record is in the design and is no proposal,
// whoever changed it last: a record a person kept and a draft then changed is standing to the comparison (the draft is
// a person's to review through the review plan), and so is one a template copy holds. The verifier's two paths, through
// the server, for a failure domain AIW proposed and for one Sol drafted: in every state the six findings or the error
// stand. What the mend does change is stamped as the commit's: by the boundary, which copies the package's trackPaths
// before each call of the tracker (ruling O2, which retired the tracker's answer of M1).
await block('S1.21 the mend drops only what is not there', async () => {
  need();
  const I = F.ids(), ch10 = q => CHAPTERS.find(c => c.id === 10).checks(withFinalReview(q)), ids10 = q => ch10(q).map(f => f.id), ERR = 'topology-incomparable:' + I.production;
  const named = doc(doc(started(), 'runtime.zone', {id: I.zone2, failureDomain: 'AZ-1'}), 'technology.domain-proposals'), six = ids10(named).filter(id => /^(standby|backup-domain|single-domain|isolate)/.test(id) && !id.includes(I.recovery));
  assert.ok(six.length >= 5 && six.includes('standby:' + I.storePlan) && six.includes('backup-domain:' + I.storePlan), 'the all-named design reads one shared domain: ' + six.join(', '));
  const held = (q, why) => { const now = ids10(q); assert.ok(six.every(id => now.includes(id)) || ch10(q).find(f => f.id === ERR)?.level === 'error', why + ': the six findings stand, or the error does: ' + now.join(', ')); };
  const typedIn = (q, fd, why) => { held(q, why); assert.deepEqual([I.zone1, I.zone2].map(id => zoneOf(q, id).domainIds), [[fd], [fd]], why + ': both zones still stand in ' + fd); assert.ok(six.every(id => ids10(q).includes(id)) && !ids10(q).includes(ERR), why + ': the six findings, and no error'); };
  const ok = (r, why) => assert.equal(r.status, 200, (why || 'accepted') + ': ' + JSON.stringify(r.body).slice(0, 300));
  for (const kind of ['AIW', 'Sol']) {
    const h = await F.server(worker), d = () => h.state.document, events = () => d().changes?.events || [];
    const inProject = async (q, type, payload, as = A) => { const cur = await (await h.api('/api/project' + q, 'GET', null, as)).json(), res = await h.api('/api/commands' + q, 'POST', {revision: cur.revision, command: {type, payload}}, as); return {status: res.status, body: await res.json()}; };
    const readIn = async q => (await (await h.api('/api/project' + q)).json()).document;
    try {
      ok(await h.send('runtime.topology-start', {})); ok(await h.send('runtime.zone', {id: I.zone2, failureDomain: 'AZ-1'})); held(d(), kind + ': all named');
      let fd;
      if (kind === 'AIW') { ok(await h.send('technology.domain-proposals', {}, AGENT)); fd = d().technology.domains.find(x => x.title === 'AZ-1' && x.state === 'proposed').id; }
      else { ok(await h.send('technology.domain', {title: 'AZ-1', scope: 'zone', cause: 'location', origin: 'sol-draft'}, AGENT)); fd = d().technology.domains.at(-1).id; assert.equal(domainOf(d(), fd).state, 'proposed'); }
      held(d(), kind + ': proposed'); ok(await h.send('record.keep', {id: fd, chapter: 6}, B), 'B keeps it'); held(d(), kind + ': kept by B');
      ok(await h.send('runtime.locate', {zoneId: I.zone1, domainIds: [fd]})); held(d(), kind + ': zone 1 typed, zone 2 named');
      ok(await h.send('runtime.locate', {zoneId: I.zone2, domainIds: [fd]})); typedIn(d(), fd, kind + ': both typed');
      // the zones keep their names AZ-1 and AZ-2: only the typed domain says they share one
      ok(await h.send('runtime.zone', {id: I.zone2, failureDomain: 'AZ-2'})); typedIn(d(), fd, kind + ': zone 2 named AZ-2 again');
      // path 2: a template copy of this design; a person takes the step there, then commits again
      { const cur = await h.read(), r = await h.api('/api/lifecycle' + h.q, 'POST', {action: 'template', enabled: true, revision: cur.revision}); assert.equal(r.status, 200, 'marked as a template'); }
      const made = await h.api('/api/projects', 'POST', {name: 'Tidewater copy', sourceProjectId: h.pid}); assert.equal(made.status, 201, 'the copy is made');
      const copy = (await made.json()).document, q2 = '?project=' + encodeURIComponent(copy.id);
      assert.equal(domainOf(copy, fd).provenance?.reviewed, false, 'the copy holds the domain with its keep reset'); typedIn(copy, fd, kind + ': the template copy');
      ok(await inProject(q2, 'runtime.topology-start', {}), 'a person takes the step in the copy'); typedIn(await readIn(q2), fd, kind + ': the copy after a person takes the step there');
      ok(await inProject(q2, 'runtime.locate', {zoneId: I.zone3, reason: 'A later commit in the copy.'})); typedIn(await readIn(q2), fd, kind + ': the copy after a later commit');
      // path 1: the agent account edits the basis of the domain B kept, as the draft it is; then a person commits again
      const stamps = () => [I.zone1, I.zone2].map(id => JSON.stringify(zoneOf(d(), id).provenance)), was = stamps(), n = events().length;
      ok(await h.send('technology.domain', {id: fd, basis: 'Drafted basis.', origin: 'sol-draft'}, AGENT), 'the agent\'s draft edit');
      assert.deepEqual([domainOf(d(), fd).state, domainOf(d(), fd).provenance?.author?.kind], [undefined, 'sol-draft'], 'the domain is no proposal and is stamped as the draft (ruling H2)');
      typedIn(d(), fd, kind + ': after the agent\'s draft edit of the domain B kept'); assert.ok(T.hostingComparison(d(), I.production).comparable, 'a record a person kept and a draft changed is standing to the comparison');
      assert.deepEqual(stamps(), was, 'the mend changed no zone'); assert.ok(!events().slice(n).some(e => e.source?.kind === 'zone'), 'and journalled no drop');
      ok(await h.send('runtime.locate', {zoneId: I.zone3, reason: 'A later commit.'})); typedIn(d(), fd, kind + ': after a later commit');
      // the draft is a person's to review through the review plan, as for every record
      { const step = reviewPlan(withFinalReview(d())).steps.find(s => s.id === 'records:sol-draft:6:technology.domains'); assert.ok(step && step.count >= 1 && /^Review 1 failure domain /.test(step.title), 'the review plan asks a person to review the draft: ' + JSON.stringify(step)); }
    } finally { h.close(); }
  }
  // what the mend changes is stamped as the commit's: a batch that retires a zone's domain and node and restores the zone
  for (const as of [A, AGENT]) {
    const h = await F.server(worker), d = () => h.state.document, events = () => d().changes?.events || [];
    const batch = async commands => { await h.read(as); return h.send('workspace.apply', {commands, stamp: previewWorkingChange(d(), commands).stamp, reason: 'Moved out and back.', reviewed: as !== AGENT}, as); };
    try {
      const sent = {}; for (const [type, payload, key] of [['runtime.topology-start', {}], ['technology.domain', {title: 'Bergen availability zone 2', scope: 'zone', cause: 'location'}, 'fd'], ['runtime.node', {title: 'Bergen AZ 2', kind: 'availability-zone'}, 'az'], ['runtime.node', {title: 'Cluster 2', kind: 'cluster', parentId: 'dn-001'}, 'cluster']]) { const r = await h.send(type, payload); ok(r, type); if (key) sent[key] = r.body.selected; }
      ok(await h.send('runtime.locate', {zoneId: I.zone2, nodeId: sent.az, domainIds: [sent.fd]}));
      const placement = d().runtime.placements.find(l => l.planId === I.apiPlan && l.zoneId === I.zone2); ok(await h.send('runtime.locate', {placementId: placement.id, nodeId: sent.cluster}));
      const plans = [...new Set(d().runtime.placements.filter(l => l.zoneId === I.zone2).map(l => l.planId))], n = events().length, retire = (id, chapter) => ({type: 'record.retire', payload: {id, chapter, reason: 'Moved out for a while.'}});
      ok(await batch([...plans.map(id => retire(id, 10)), retire(I.zone2, 10), retire(sent.cluster, 10), retire(sent.az, 10), retire(sent.fd, 6), {type: 'record.restore', payload: {id: I.zone2, chapter: 10}}, ...plans.map(id => ({type: 'record.restore', payload: {id, chapter: 10}}))]), as + '\'s batch');
      const z = zoneOf(d(), I.zone2), l = d().runtime.placements.find(x => x.id === placement.id), drop = events().slice(n).find(e => e.source.id === I.zone2 && e.fields.some(f => f.key === 'domainIds'));
      assert.ok(drop && !('domainIds' in z) && !('nodeId' in z) && !('nodeId' in l), as + ': the zone and the placement name nothing that is not there');
      const want = {kind: as === AGENT ? 'sol-draft' : 'person', by: as, at: drop.at};
      for (const [what, r] of [['the zone', z], ['the placement', l]]) assert.deepEqual([r.provenance?.author?.kind, r.provenance?.author?.by, r.provenance?.author?.at, authorship(r).kind], [want.kind, want.by, want.at, want.kind], as + ': ' + what + ' the mend changed is stamped as the commit\'s');
    } finally { h.close(); }
  }
  pass('S1.21: the mend drops only names of records that are absent, retired or a proposal: through the server, for a failure domain AIW proposed and one Sol drafted, kept by B and standing for both zones (named AZ-1 and AZ-2), a template copy after a person takes the step there and commits again, and the agent account\'s draft edit of the domain followed by a person\'s commit, each keep both zones in the domain, and in every state the six findings or the error stand (here the six); a zone and a placement the mend changes are stamped as the commit\'s, a person\'s and an agent account\'s');
});

// (the lead's ruling M3; the verifier's new problem 3) "Cannot be checked" in ruling L2 is the non-waivable class of
// rc.10.73.42, and nothing stricter: topology-incomparable blocks the review and the freeze as every built-in
// non-waivable error does, with no row of its own, and Chapter 10's own check (runtime.review) and its handoff keep their
// built-in rule, which reads no error. Through the server, beside a built-in non-waivable error of the same chapter
// (state-protection, the invariant class): step by step the two read and block alike.
await block('S1.22 the error blocks as every non-waivable error does', async () => {
  need();
  const I = F.ids(), h = await F.server(worker), d = () => withFinalReview(h.state.document), ok = (r, why) => assert.equal(r.status, 200, (why || 'accepted') + ': ' + JSON.stringify(r.body).slice(0, 300));
  const find = code => inheritedFindings(d()).find(f => f.chapter === 10 && f.code === code), blocking = f => reviewBlockers(d()).some(x => x.id === f.id);
  try {
    ok(await h.send('runtime.topology-start', {})); const fd = (await h.send('technology.domain', {title: 'Bergen availability zone 1', scope: 'zone', cause: 'location'})).body.selected;
    ok(await h.send('runtime.locate', {zoneId: I.zone1, domainIds: [fd]}), 'zone 1 typed, zone 2 only named');
    const mine = find('topology-incomparable'), builtIn = find('state-protection');
    assert.ok(mine && builtIn, 'the document holds the package\'s error and a built-in non-waivable error of Chapter 10');
    assert.deepEqual([mine.level, mine.hard, nonWaivable(mine), builtIn.level, nonWaivable(builtIn)], ['error', true, true, 'error', 'invariant'], 'both are in the one non-waivable class');
    assert.deepEqual(treatmentsFor(mine), ['Fix before review', 'Carry as action']); assert.deepEqual(treatmentsFor(mine), treatmentsFor(builtIn), 'the dialog offers the same treatments for both, and no waiver');
    assert.deepEqual([blocking(mine), blocking(builtIn)], [true, true], 'both block the review');
    // Chapter 10's own check and its handoff keep their built-in rule, which reads no error: both are taken while either error stands
    ok(await h.send('runtime.review', {}), 'runtime.review with both errors standing'); assert.ok(h.state.document.runtime.review?.stamp, 'the chapter\'s check is recorded');
    ok(await h.send('runtime.handoff', {acknowledge: true}), 'runtime.handoff with both errors standing'); assert.ok(h.state.document.runtime.handoff?.stamp, 'and its handoff');
    assert.ok(find('topology-incomparable') && find('state-protection'), 'neither check nor handoff clears an error');
    // no waiver is taken, for either; 'fix before review' is recorded and keeps both blockers
    const treat = (f, treatment) => h.send('review.disposition', {findingId: f.id, stamp: find(f.code).stamp, treatment, rationale: 'Synthetic.', reviewer: 'A reviewer (synthetic)', reference: 'REF-1', reviewBy: '2099-12-31', reviewed: true});
    for (const waiver of DISPOSITIONS.filter(t => !treatmentsFor(mine).includes(t))) {
      const a = await treat(mine, waiver), b = await treat(builtIn, waiver);
      assert.deepEqual([a.status, b.status], [400, 400], waiver + ' is refused for both');
      assert.equal(a.error, '“' + mine.title + '” cannot be waived: change the design. Until then, fix it before review or carry it as an action.', 'in the words of ruling A1');
      assert.match(b.error, /breaks an invariant: change the design\. It cannot be waived; until then, fix it before review or carry it as an action\./, 'and the built-in one in its own words'); }
    ok(await treat(mine, 'Fix before review')); ok(await treat(builtIn, 'Fix before review'));
    assert.deepEqual([blocking(mine), blocking(builtIn)], [true, true], 'fix before review keeps both blockers');
    // the review: its checks count both among the blockers, the findings milestone stays open, and a positive review is refused
    ok(await h.send('review.checks', {})); assert.equal(h.state.document.finalReview.checks.blockers, reviewBlockers(d()).length, 'the review\'s checks count the blockers, both among them');
    { const m = finalMilestones(d()).find(x => x.id === 'findings'); assert.deepEqual([m.done, m.detail], [false, reviewBlockers(d()).length + ' still need treatment']); }
    { const r = await h.send('review.record', {stamp: reviewDesignStamp(d()), outcome: 'Ready with actions / limitations', reviewed: true, reviewer: 'A reviewer (synthetic)', reference: 'REF-1', rationale: 'Synthetic.'}); assert.equal(r.status, 400); assert.match(r.error, /finding treatment before a positive review/, 'no positive review while they need treatment'); }
    // the freeze: taken as a working draft only, which holds both errors; never as architect reviewed while they block
    { const requestId = 'wp9a-freeze-' + Date.now().toString(36), started = await h.api('/api/baselines' + h.q + '&action=freeze', 'POST', {requestId, title: 'With the errors standing', reviewed: true, stamp: reviewDesignStamp(d())});
      assert.equal(started.status, 202, 'the freeze is a job: ' + (await started.clone().text()).slice(0, 300));
      for (let i = 0, job; ; i++) { await new Promise(resolve => setTimeout(resolve, 50)); job = (await (await h.api('/api/baselines' + h.q + '&action=status&id=' + requestId)).json()).job; if (!['queued', 'running'].includes(job.status)) { assert.equal(job.status, 'completed', JSON.stringify(job).slice(0, 300)); break; } assert.ok(i < 1200, 'the freeze ends'); }
      await h.read(); const b = h.state.document.finalReview.baselines.at(-1); assert.equal(b.classification, 'Working draft', 'a working draft, not architect reviewed');
      const whole = await (await h.api('/api/baselines' + h.q + '&action=open&part=whole&id=' + encodeURIComponent(b.id))).json();
      assert.ok(whole.findings.some(f => f.id === mine.id) && whole.findings.some(f => f.id === builtIn.id), 'it holds both errors'); }
    // changing the design resolves it: the review then has exactly one blocker fewer, this one
    const before = reviewBlockers(d()).map(f => f.id); ok(await h.send('runtime.locate', {zoneId: I.zone1, domainIds: []}), 'zone 1 named again');
    assert.deepEqual(before.filter(id => !reviewBlockers(d()).some(f => f.id === id)), [mine.id], 'the package\'s error is gone and no other blocker moved'); assert.ok(blocking(builtIn));
  } finally { h.close(); }
  pass('S1.22: through the server, topology-incomparable reads and blocks as the built-in non-waivable state-protection error of Chapter 10 does, step by step: the same treatments and no waiver (each refused, the package\'s in the words of ruling A1), fix before review keeps both blockers, the review\'s checks count them, no positive review is taken and a freeze is a working draft holding both; runtime.review and runtime.handoff keep their built-in rule, which reads no error, and are taken while both stand; changing the design removes exactly this blocker');
});

// (the lead's ruling M6; the verifier's new problem 9, as ruling L6 reads) Dismissing a package's proposal is no design
// change: the retirement of a failure domain or a node that is a proposal moves no version and clears no check or
// handoff, and its restore brings it back a proposal with neither moved, through the row quietProposals the package
// states for its own lifecycle collections. A record a person kept is design: keeping it, and retiring it then, move the
// version and clear the check, as before. Built-in seeds keep their rc.10.73.42 rule (the design fingerprint reads them
// in their collections): recorded for the lifecycle family's owner, wp9b.
await block('S1.23 dismissing a proposal is no design change', () => {
  need();
  const SOL = {kind: 'sol-draft', id: AGENT, account: 'agent'}, versions = q => [q.technology.version, q.runtime.version];
  const checked = q => doc(doc(doc(doc(q, 'technology.review'), 'technology.handoff', {acknowledge: true}), 'runtime.review'), 'runtime.handoff', {acknowledge: true});
  const current = q => [technologyReviewCurrent(q), technologyHandoffCurrent(q), rt.runtimeReviewCurrent(q), rt.runtimeHandoffCurrent(q)];
  let p = doc(started(), 'technology.domain-proposals'); p = doc(p, 'runtime.node', {title: 'Drafted region', kind: 'region', origin: 'sol-draft'}, AGENT, SOL); p = checked(p);
  const fd = p.technology.domains.find(d => d.state === 'proposed' && d.origin === 'seeded').id, dn = p.runtime.nodes.find(n => n.state === 'proposed').id;
  assert.deepEqual(current(p), [true, true, true, true], 'Chapters 6 and 10 checked and handed off by a person');
  assert.deepEqual(Object.keys(mine().quietProposals || {}).sort(), ['runtime.nodes', 'technology.domains'], 'the package states that its proposals say nothing to the design');
  // AIW's proposal and Sol's drafted node are dismissed: no version moves, no check or handoff is cleared
  let q = doc(p, 'record.retire', {id: fd, chapter: 6, reason: 'Not a failure domain of ours.'}, B);
  assert.equal(domainOf(q, fd), undefined); assert.deepEqual(q.retired.records.filter(x => x.id === fd).map(x => x.priorState), ['proposed']);
  assert.deepEqual(versions(q), versions(p), 'dismissing AIW\'s proposal moves no version'); assert.deepEqual(current(q), [true, true, true, true], 'and clears no check or handoff');
  q = doc(q, 'record.retire', {id: dn, chapter: 10, reason: 'Not a node we run.'}, B);
  assert.deepEqual([versions(q), current(q)], [versions(p), [true, true, true, true]], 'nor does dismissing Sol\'s drafted node');
  // restored, each is a proposal again, with no version moved and nothing cleared
  q = doc(doc(q, 'record.restore', {id: fd, chapter: 6}, B), 'record.restore', {id: dn, chapter: 10}, B);
  assert.deepEqual([domainOf(q, fd).state, nodeOf(q, dn).state], ['proposed', 'proposed']); assert.deepEqual([versions(q), current(q)], [versions(p), [true, true, true, true]], 'a proposal restored moves nothing either');
  // KNOWN LIMIT (for wp9b, with ruling M9 (e)): the retirement list is read by the design fingerprint on rc.10.73.42, for every retirement, so the
  // design stamp moves by the dismissal's entry there although no version and no check does; the dismissal and its restore leave it as it was
  { const out = doc(p, 'record.retire', {id: fd, chapter: 6, reason: 'Not a failure domain of ours.'}, B); assert.notEqual(reviewSourceStamp(out), reviewSourceStamp(p), 'KNOWN LIMIT: the design stamp moves by the retirement list'); }
  // a record a person kept is design: keeping it moves the version and clears the check; retiring it then does too
  { const kept = doc(p, 'record.keep', {id: fd, chapter: 6}, B); assert.equal(kept.technology.version, p.technology.version + 1, 'a keep is a design change'); assert.equal(kept.technology.review, null);
    const again = checked(kept), out = doc(again, 'record.retire', {id: fd, chapter: 6, reason: 'Not a failure domain of ours.'}, B);
    assert.deepEqual([out.technology.version, out.technology.review, out.technology.handoff], [again.technology.version + 1, null, null], 'retiring a kept record moves the version and clears the check and the handoff, as before'); }
  // built-in seeds keep their rc.10.73.42 rule: AIW's proposed needs of a component, dismissed, move Chapter 6's version and clear its check
  { const built = checked(doc(p, 'realisation.component', {title: 'Probe service', kind: 'service', purpose: 'Takes probes.', technologyNeeds: 'Persist each probe record and authenticate the caller.'}));
    const seed = built.technology.needs.find(n => n.state === 'proposed' && n.origin === 'seeded'); assert.ok(seed, 'AIW proposed a need');
    const out = doc(built, 'record.retire', {id: seed.id, chapter: 6, reason: 'Not a need of ours.'}, B);
    assert.deepEqual([out.technology.version, out.technology.review, out.technology.handoff], [built.technology.version + 1, null, null], 'RECORDED FOR wp9b: a built-in seed\'s dismissal moves the version and clears the check and the handoff (rc.10.73.42)'); }
  pass('S1.23: dismissing a failure domain AIW proposed and a node Sol drafted, and restoring them, moves no version and clears no check or handoff of Chapters 6 and 10 (the package\'s row quietProposals); a kept record\'s keep and retirement are design changes as before; built-in seeds keep their rc.10.73.42 rule (recorded for wp9b); the design stamp still moves by the retirement list (known limit, with M9 (e))');
});

// (the lead's ruling O2; new problem 2 of the second verifier, which amends M1) The boundary, not the package, says what
// the tracker changed: the package states the built-in collections its mend changes as trackPaths (the zones and the
// placements), the boundary copies them before each call of the tracker and stamps as the commit's each record whose
// content the call changed (S1.21 holds that through the server), and the tracker answers nothing. It changes no other
// built-in collection: rc44-s0-readings.mjs assertTrackerStaysInPaths runs it on its cases (a document with no
// topology, the step that types the project, a node and a failure domain saved, a zone and a placement located, a zone
// and a placement a restore brings back naming what is no longer there, a proposal kept) and compares the whole
// document outside the package's own keys, its trackPaths and the change journal.
await block('S1.24 the tracker stays in its paths', () => {
  need();
  const I = F.ids(), kase = (p, type, payload, actor = A) => ({prior: p, next: run(p, type, payload, actor).document, command: {type, payload}, at: AT}), cases = [];
  cases.push(kase(F.tidewater(), 'runtime.zone', {id: I.zone1, isolation: 'Separate power, network and cooling (synthetic).'}));
  cases.push(kase(F.tidewater(), 'runtime.topology-start', {}));
  const {p, made} = typedTidewater(), placement = p.runtime.placements.find(l => l.planId === I.apiPlan && l.zoneId === I.zone1);
  cases.push(kase(p, 'runtime.node', {title: 'Spare site', kind: 'site'}), kase(p, 'technology.domain', {title: 'Rack 9', scope: 'node', cause: 'location'}));
  cases.push(kase(p, 'runtime.locate', {zoneId: I.zone2, nodeId: made.az1, domainIds: [made.fdZone1], reason: 'Moved into the first zone.'}), kase(p, 'runtime.locate', {placementId: placement.id, nodeId: made.cluster}));
  // a zone a restore brings back while the node and the domain it names are retired: the mend drops both names
  { let q = doc(p, 'runtime.zone', {environmentId: I.production, title: 'Bergen zone 4', kind: 'hosting', failureDomain: 'AZ-4', isolation: 'Separate power and network (synthetic).', owner: 'Reservations team (synthetic)'}); const z = q.runtime.zones.at(-1).id;
    q = doc(q, 'technology.domain', {title: 'Bergen availability zone 4', scope: 'zone', cause: 'location'}); const fd = q.technology.domains.at(-1).id;
    q = doc(q, 'runtime.node', {title: 'Bergen AZ 4', kind: 'availability-zone', parentId: made.region}); const dn = q.runtime.nodes.at(-1).id;
    q = doc(q, 'runtime.locate', {zoneId: z, nodeId: dn, domainIds: [fd]}); for (const [id, chapter] of [[z, 10], [fd, 6], [dn, 10]]) q = doc(q, 'record.retire', {id, chapter, reason: 'A fourth zone is not built.'});
    cases.push(kase(q, 'record.restore', {id: z, chapter: 10}, B)); }
  // a placement that comes back with its plan while the node it names is retired
  { let q = doc(p, 'runtime.locate', {placementId: placement.id, nodeId: made.cluster}); q = doc(q, 'record.retire', {id: I.apiPlan, chapter: 10, reason: 'Planned again later.'}); q = doc(q, 'record.retire', {id: made.cluster, chapter: 10, reason: 'No cluster of its own.'});
    cases.push(kase(q, 'record.restore', {id: I.apiPlan, chapter: 10}, B)); }
  { const q = doc(p, 'technology.domain-proposals'), proposal = q.technology.domains.find(x => x.state === 'proposed'); cases.push(kase(q, 'record.keep', {id: proposal.id, chapter: 6}, B)); }
  const misses = [], check = (why, test) => { try { test(); } catch (e) { misses.push(why + ': ' + e.message.split('\n')[0]); } };
  check('the package states the built-in collections its mend changes', () => assert.deepEqual(mine().trackPaths, ['runtime.zones', 'runtime.placements']));
  // the tracker answers nothing, also where it mends
  for (const c of cases.slice(-3, -1)) check('the tracker answers nothing (' + c.command.type + ')', () => { const next = structuredClone(c.next), answer = T.trackTopology(c.prior, next, c.command, AT); assert.equal(answer, undefined, 'it answered ' + String(JSON.stringify(answer)).slice(0, 120)); assert.notEqual(JSON.stringify(next.runtime), JSON.stringify(c.next.runtime), 'and it mended'); });
  check('the tracker stays in its paths', () => {
    assert.equal(typeof R.assertTrackerStaysInPaths, 'function', 'rc44-s0-readings.mjs states assertTrackerStaysInPaths');
    const read = R.assertTrackerStaysInPaths(mine(), cases);
    assert.equal(read.cases, cases.length); assert.deepEqual(read, {cases: cases.length, changed: {'runtime.zones': 1, 'runtime.placements': 1}, journalled: 7}, 'the tracker\'s calls mend a zone and a placement (the two restores) and journal seven changes: ' + JSON.stringify(read));
  });
  assert.deepEqual(misses, [], misses.join(' | '));
  pass('S1.24: the package states the built-in collections its mend changes (trackPaths: runtime.zones, runtime.placements); its tracker answers nothing, where it mends too; on ' + cases.length + ' cases (no topology, the step, a node, a failure domain, a zone and a placement located, a zone and a placement a restore brings back naming what is not there, a proposal kept) it changes nothing outside its own keys, its trackPaths and the change journal (rc44-s0-readings.mjs assertTrackerStaysInPaths)');
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
  // (ruling O2; was, by ruling M1: "the trackers' answers are joined in the parts' order", j.track() deep-equal to the parts' [was, is] pairs) the
  // parts' trackPaths are joined in their order, each path once, and what a part's tracker answers is ignored: the assembly answers nothing
  { const calls = [], j = P.assembleParts('p-test', [{track: () => { calls.push(1); return [[{id: 'z1'}, {id: 'z1', n: 1}]]; }, trackPaths: ['runtime.zones']}, {track: () => { calls.push(2); }}, {track: () => { calls.push(3); return 'an answer'; }, trackPaths: ['runtime.placements', 'runtime.zones']}]);
    assert.deepEqual(j.trackPaths, ['runtime.zones', 'runtime.placements'], 'the parts\' trackPaths are joined in their order, each path once'); assert.equal(j.track(), undefined, 'what a part\'s tracker answers is ignored: the assembly answers nothing'); assert.deepEqual(calls, [1, 2, 3], 'and every part\'s tracker runs, in the parts\' order'); }
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
  // (ruling L2; was: the keys without `checks`, "slice 1 states no check") slice 1 states one check, Chapter 10's error
  // for zones that cannot be compared, and no upgrade step and no section (rulings J7 and J3; design b.4)
  // (ruling L3) and the restore rules of its own two collections
  assert.deepEqual(Object.keys(mine().canRestore).sort(), ['runtime.nodes', 'technology.domains']);
  // (ruling L5; was: the keys hold evidenceKeys and no design) the marker and the two collections are stated through the design row
  // (ruling M6; was: the keys without quietProposals) and that its proposals say nothing to the design, on its two own collections
  // (ruling O2; was: the keys without trackPaths) and the built-in collections its tracker's mend changes
  assert.deepEqual(Object.keys(mine()).sort(), ['canRestore', 'checks', 'commands', 'design', 'designKeys', 'hops', 'id', 'layers', 'lifecycle', 'objectTypes', 'provenance', 'quietProposals', 'records', 'track', 'trackPaths'], 'slice 1 states one check, no upgrade step and no section');
  assert.deepEqual(mine().quietProposals, {'technology.domains': true, 'runtime.nodes': true}); assert.deepEqual(mine().trackPaths, ['runtime.zones', 'runtime.placements']);
  assert.deepEqual(Object.keys(mine().checks), ['10'], 'the check is Chapter 10\'s');
  pass('S1.11: the package is one registration assembled from five parts, of which slice 1 fills one: tables joined, lists in order, emitters, trackers and a chapter\'s findings of every part; a row two parts state and a part the assembly does not carry are refused');
});

// The size evidence of the slice (audit/rc44/evidence/, ruling A7), written by `node rc44-wp9a-deployment-validate.mjs
// --measure` from the build the case makes (ruling L9: the file says what was measured). Two bases, each built with node
// build.mjs from an archive of its commit: BASE, the commit the slice started from (9673661: S0 and wp1 S1 merged), and
// ADOPTION, the adoption record as closed, which this branch merged (rc44/integration at a4c1690; ruling M8: the bytes
// are restated after that merge). ITEMISED is read from the metafiles of this build and of ADOPTION's, route output by
// route output.
const EVIDENCE = 'audit/rc44/evidence/wp9a-s1-size.json', HOST = 'public/deploy-view.js';
const BASE = {commit: '9673661', chapters: 3229840, projects: 506829, scripts: 148, under10k: 53, css: 901873};
const ADOPTION = {commit: 'a4c1690 (rc44/integration: the adoption record as closed)', chapters: 3230165, projects: 507069, scripts: 148, under10k: 53, css: 901873};
const ITEMISED = {stubWithItsImport: 105, failureDomainKeyH1: 21, restoreRuleReadL3: 47, quietProposalsReadM6: 96, designRowChapterKeysL5: 64, simulateRuntimeH4: -10, modelViewH15: -5, aliasAndImportShifts: 88, baselineDefectFmtL10: 34};
// What is booked where (rulings K6, L10 and M8): the registry's one-time cost is in ADOPTION's figure (wp2's stub paid it,
// and wp2's evidence records it in its own delta); the fix of the baseline defect (L10) and S0's design row that L5 needed
// (M8) are the shared pool's; every other byte is wp9a's own, against its 500 B.
const SHARED_POOL = {baselineDefectFmtL10: ITEMISED.baselineDefectFmtL10, designRowChapterKeysL5: ITEMISED.designRowChapterKeysL5};
// What the same lazy entry added to the route at the base, before it held the package (opensWithRecords on the base's build).
const BASE_OPENS = {route: 3229840, added: 833044, total: 4062884, files: 12};
// (ruling M5) What it adds at the adoption record (opensWithRecords on a4c1690's build), and the package's share of it, set
// from the measurement and itemised by module: each module's bytes in the entry's script (bytesInOutput), and the
// script's import and export lists with the rest of the entry's closure (lists). The figures are in the notes.
// (ruling O5, re-measured after O2 in the third fix-up; was: topology.js 1,448 B and the share 22,569 B: assembleParts
// joins the parts' trackPaths and its tracker answers nothing, +55 B; topology-domain.js is 20,903 B as before)
const ADOPTION_OPENS = {route: 3230165, added: 833120, total: 4063285, files: 12};
const LAZY_SHARE = {modules: {'public/topology-blueprints.js': 10, 'public/topology-domain.js': 20903, 'public/topology-failures.js': 10, 'public/topology-fallback.js': 10, 'public/topology-gates.js': 10, 'public/topology.js': 1503}, lists: 178, total: 22624};
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
  if (process.argv.includes('--measure')) { mkdirSync('audit/rc44/evidence', {recursive: true}); const fromAdoption = measured.chapters - ADOPTION.chapters; writeFileSync(EVIDENCE, JSON.stringify({schema: 'aiw.rc44.slice-size.v3', name: 'wp9a slice 1 after its third fix-up: typed failure domains, nodes and registration (p30-deployment)',
    measuredWith: 'client-bundle.mjs bundleClient, as node build.mjs builds the client (dist/client-size-report.json: routes.chapters.code, scripts, buckets)',
    whatWasMeasured: 'The chapters route of this build, against two bases each built with node build.mjs from an archive of its commit: the integrated base the slice started from, and the adoption record the branch merged. The itemised bytes are read from the metafiles of this build and of the adoption record\'s, route output by route output (a module\'s bytes in its output, and the import and export lists of each output).',
    allowance: {chapters: 500, of: 'all of wp9a on the chapters route', scripts: 148, rulings: 'A4 of 2026-11-18 (500 B for wp9a); K6 (the registry\'s one-time cost to the shared pool); L10 (the baseline defect\'s fix to the shared pool); M4 (a package\'s size case: the route\'s growth less the integrated base, less every other package\'s own bytes and the shared pool\'s); M8 (S0\'s design row to the shared pool)'},
    caps: {chapters: BUDGET.routes.chapters, projects: BUDGET.routes.projects, scripts: BUDGET.scripts, under10k: BUDGET.tiny, css: BUDGET.css}, bases: {integrated: BASE, adoption: ADOPTION}, slice: measured,
    fromIntegrated: measured.chapters - BASE.chapters, fromAdoption, projectsFromAdoption: measured.projects - ADOPTION.projects, headroomAfter: BUDGET.routes.chapters - measured.chapters,
    itemised: ITEMISED, ownBytes: fromAdoption - Object.values(SHARED_POOL).reduce((n, x) => n + x, 0), sharedPoolBytes: SHARED_POOL, registryOnceK6: 'in the adoption record\'s figure (its stub brought registerExtension onto the route; wp2\'s evidence records it in its delta)',
    onRoute: 'Against the adoption record as closed (a4c1690): the route stub with its import of registerExtension in design-package-routes.js (105 B); failureDomainKey reads the typed domain (runtime-model.js, H1, 21 B); the lifecycle reads a package\'s restore rule (record-lifecycle.js, L3, 47 B) and its statement that a proposal\'s dismissal and restore are no design change (record-lifecycle.js, M6, 96 B); S0\'s design row takes chapter.key (review-domain.js reviewSource, L5 and L6, 64 B, the shared pool\'s by M8); simulateRuntime reads the typed domain (runtime-domain.js, H4 of L7, -10 B) and the Chapter 10 Model view keys a zone by it (deploy-model.js, H15 of L7, -5 B); alias and import shifts of the route outputs whose imports and exports moved (88 B: the outputs\' import and export lists, with +3, -1 and -2 B in composition-design.js, model-impact.js and architecture-design.js); the definition of fmt in technology-domain.js that patchLinks named and the module lacked since rc.10.73.42 (L10, 34 B, the shared pool\'s). registerExtension itself reached the route with the adoption record\'s stub (K6: 110 to 123 B, measured by two reviewers; in the adoption record\'s figure).',
    'opens with records': {gate: 'The chapters-route gate is unchanged and measures opening a document that holds no package records (ruling D10 of 2026-11-18).', host: HOST, ...opens, beforeThePackage: BASE_OPENS, atTheAdoptionRecord: ADOPTION_OPENS, packageShare: LAZY_SHARE, note: 'A document that holds the marker runtime.topology also loads the lazy entry of the Chapter 10 Model view, which holds the package, before it is first drawn: the route and the static closure of that entry, each script counted once.'}}, null, 1) + '\n'); }
  assert.ok(existsSync(EVIDENCE), 'the slice\'s measurement is kept (node rc44-wp9a-deployment-validate.mjs --measure)');
  const size = JSON.parse(readFileSync(EVIDENCE, 'utf8'));
  assert.deepEqual([size.bases.integrated, size.bases.adoption, size.itemised], [BASE, ADOPTION, ITEMISED]); assert.equal(size.fromIntegrated, size.slice.chapters - BASE.chapters); assert.equal(size.fromAdoption, size.slice.chapters - ADOPTION.chapters);
  assert.match(size.whatWasMeasured, /against two bases/); assert.ok(!/well under half/.test(JSON.stringify(size)), 'the evidence claims nothing it did not measure (ruling L9)');
  // (ruling L9 with K6 and L10; was: "slice 1 uses under half of the 500 B of wp9a, measured against the base alone" (delta < 250) and "the package's own
  // are under 150 B") every byte against the adoption record is itemised; wp9a's own bytes are inside its 500 B; the registry's one-time cost and the
  // shared pool's bytes are booked apart
  assert.equal(Object.values(size.itemised).reduce((n, x) => n + x, 0), size.fromAdoption, 'the itemised bytes add up to the delta against the adoption record');
  // (rulings M4 and M8; was: booked.wp9a = fromAdoption - registryOnceK6 - baselineDefectL10, inside 500 B, the 64 B of S0's design row counted as wp9a's)
  // the figure recorded at wp9a's own head: its own bytes are the delta against the adoption record less the shared pool's (the baseline defect's fix
  // and S0's design row, each pinned to its itemised figure), inside its 500 B
  assert.deepEqual(size.sharedPoolBytes, SHARED_POOL, 'the shared pool\'s bytes are the two items of rulings L10 and M8');
  assert.equal(size.ownBytes, size.fromAdoption - Object.values(size.sharedPoolBytes).reduce((n, x) => n + x, 0)); assert.ok(size.ownBytes > 0 && size.ownBytes <= 500, 'wp9a\'s own bytes on the chapters route are inside its 500 B: ' + size.ownBytes + ' B');
  // (ruling M4) and this build: the route's growth against the integrated base, less the bytes every other package's evidence records as its own and less
  // the shared pool's, is inside wp9a's 500 B
  const booked = R.routeBookings(EVIDENCE), mine = measured.chapters - BASE.chapters - booked.othersTotal - booked.poolTotal;
  assert.ok(Object.keys(booked.others).length >= 1, 'the other packages\' evidence is read: ' + JSON.stringify(booked)); for (const [item, bytes] of Object.entries(SHARED_POOL)) assert.equal(booked.pool[EVIDENCE + ':' + item], bytes, 'and the shared pool\'s ' + item);
  assert.ok(mine > 0 && mine <= 500, 'this build is inside the allowance of wp9a: ' + mine + ' B (the route grew ' + (measured.chapters - BASE.chapters) + ' B; other packages\' own ' + booked.othersTotal + ' B; the shared pool ' + booked.poolTotal + ' B)');
  assert.deepEqual([size.slice.scripts, size.slice.under10k, size.slice.css], [148, BASE.under10k, BASE.css], '148 script files, no new file under 10 KB, no stylesheet rule');
  assert.ok(size.slice.chapters <= BUDGET.routes.chapters); assert.equal(size.allowance.chapters, 500);
  { const w = size['opens with records']; assert.ok(w && w.host === HOST && w.total === w.route + w.added && w.route === size.slice.chapters && w.files > 0, 'the size file says what a document with the package\'s records opens with');
    assert.deepEqual(w.beforeThePackage, BASE_OPENS); assert.equal(w.files, BASE_OPENS.files, 'the package adds no script to what the entry loads');
    // (ruling M5; was: "the package itself is under 25,000 B of what the entry adds" against the base's entry, loosened from 20,000 B without record) set
    // from the measurement, itemised by module: the evidence records the share and its items, each module of this build's entry script is as measured,
    // and the share, in the evidence and in this build, is no more than the measured total
    assert.deepEqual([w.atTheAdoptionRecord, w.packageShare], [ADOPTION_OPENS, LAZY_SHARE], 'the evidence records the measured share'); assert.equal(Object.values(LAZY_SHARE.modules).reduce((n, x) => n + x, 0) + LAZY_SHARE.lists, LAZY_SHARE.total);
    assert.ok(w.added - ADOPTION_OPENS.added <= LAZY_SHARE.total, 'the package is ' + (w.added - ADOPTION_OPENS.added) + ' B of what the entry adds, at most ' + LAZY_SHARE.total); }
  { const live = Object.fromEntries(Object.entries(meta.outputs[holders[0]].inputs).filter(([i]) => /^public\/topology(-[a-z]+)?\.js$/.test(i)).map(([i, x]) => [i, x.bytesInOutput]).sort(([a], [b]) => a < b ? -1 : 1));
    assert.deepEqual(live, LAZY_SHARE.modules, 'each module of the package in the entry\'s script is as measured'); assert.ok(opens.added - ADOPTION_OPENS.added <= LAZY_SHARE.total, 'this build: the package is ' + (opens.added - ADOPTION_OPENS.added) + ' B of what the entry adds, at most ' + LAZY_SHARE.total); }
  if (process.argv.includes('--measure')) assert.deepEqual(measured, size.slice, 'at the slice\'s commit the build measures what the evidence says');
  pass('S1.10: the client build passes every gate with the caps unchanged; the chapters route is ' + size.slice.chapters + ' B of ' + BUDGET.routes.chapters + ' (+' + size.fromIntegrated + ' B against ' + BASE.commit + ', +' + size.fromAdoption + ' B against the adoption record ' + ADOPTION.commit + '); wp9a\'s own ' + size.ownBytes + ' B of its 500 B (this build: ' + mine + ' B once the other packages\' own bytes and the shared pool\'s are taken out, ruling M4), the shared pool\'s ' + JSON.stringify(size.sharedPoolBytes) + ' booked apart; 148 script files, ' + size.slice.under10k + ' under 10 KB; opens with records: ' + size['opens with records'].total + ' B (' + size['opens with records'].added + ' B in ' + size['opens with records'].files + ' more scripts); this build: ' + measured.chapters + ' B');
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
