// The project the module-scope suites work on (round 24, D-24-08): the synthetic 1,400-requirement register
// (scripts/synthetic-workbook.mjs, generated text) imported through the HTTP API with its module structure proposed (as
// module-model-validate.mjs imports it), then a design in Chapters 2 to 10 built through the chapters' own command
// appliers, one command per record (as figures-at-size-fixture.mjs builds its project), so every record passed its
// validator. The design is tied to three business modules (A, B, C, the largest) and one platform module (P):
//   - per business module: two drivers on two of its sub-modules' requirements, a decision, a Chapter 4 responsibility
//     group that realises the module with three responsibilities (one per sub-module and one on the module), two
//     components allocated to them with an interaction, a data definition the first owns, a contract between the two;
//   - shared: a driver on requirements of A and B, a contract from A's first component to B's, an external party calling
//     A, a driver that names no requirement, two trust boundaries and two capabilities every component needs, a product
//     for each, a threat and a control on A's data, one environment of two zones running every component;
//   - P's group realises the platform module with one responsibility on the requirements it serves.
// The structure stays proposed: the suites accept it through Chapter 1's structure screen.
//   import {buildModuleScopeProject} from './module-scope-fixture.mjs';
//   const {document, modules: {A, B, C, P}} = await buildModuleScopeProject();
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {syntheticWorkbook} from './scripts/synthetic-workbook.mjs';
import {moduleTree} from './public/module-model.js';
import {moduleScope} from './public/module-scope.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {applyDecisionCommand} from './public/decisions-domain.js';
import {applyLogicalCommand} from './public/logical-domain.js';
import {applyRealisationCommand} from './public/realisation-domain.js';
import {applyTechnologyCommand, TECHNOLOGY_CATEGORIES, PLATFORM_CATEGORIES} from './public/technology-domain.js';
import {applyTechnologyRealisationCommand} from './public/technology-realisation-domain.js';
import {applyInterfacesCommand} from './public/interfaces-domain.js';
import {applySecurityCommand, THREAT_CATEGORIES, CONTROL_CATEGORIES} from './public/security-domain.js';
import {applyRuntimeCommand} from './public/runtime-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {handOver} from './public/document-memo.js';

export const MODULE_SCOPE_AT = '2026-10-14T09:00:00.000Z';

// The register imported through the API with the module structure proposed (groups.modules), in a workbench of its own.
export async function importedRegister({rows = 1400} = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'aiw-module-scope-')), db = localDatabase(path.join(root, 'd.sqlite'));
  const env = {DB: db, FILES: localFiles(path.join(root, 'files')), ASSETS: {fetch: () => new Response('asset')}}, origin = 'https://aiw.test';
  const call = async (route, {body, bytes, project} = {}) => {
    const r = await worker.fetch(new Request(origin + route + (project ? (route.includes('?') ? '&' : '?') + 'project=' + project : ''), {method: body || bytes ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': 'architect-modules', Origin: origin, ...(body ? {'Content-Type': 'application/json'} : {})}, body: bytes || (body ? JSON.stringify(body) : undefined)}), env);
    const data = await r.json(); if (r.status >= 300) throw Error(route + ' → ' + (data.error || r.status)); return data;
  };
  try {
    const id = (await call('/api/projects', {body: {name: 'Modules · synthetic register', template: 'blank'}})).document.id, {bytes, manifest} = syntheticWorkbook({rows});
    const up = await call('/api/intake?action=upload&filename=Synthetic.xlsx', {bytes, project: id}), ins = await call('/api/intake?action=inspect', {body: {uploadId: up.id, sheet: manifest.sheet}, project: id});
    const input = {uploadId: up.id, sheet: ins.sheet, headerRow: ins.headerRow, mapping: ins.mapping, priorityMap: ins.bands.map, groups: {domain: true, capabilityTheme: true, modules: true}};
    const pre = await call('/api/intake?action=preview', {body: input, project: id});
    const applied = await call('/api/intake?action=apply', {body: {...input, revision: pre.projectRevision, previewStamp: pre.stamp, reviewed: true}, project: id});
    return {document: applied.document, manifest};
  } finally { db.close(); await rm(root, {recursive: true, force: true}); }
}

export async function buildModuleScopeProject({rows = 1400} = {}) {
  let {document: p, manifest} = await importedRegister({rows});
  const at = MODULE_SCOPE_AT, run = (apply, type, payload) => { const r = apply(handOver(p), {type, payload}, at); p = r.document; return r.selected; };
  const tree = moduleTree(p), reqs = id => [...(moduleScope(p, id)?.requirements || [])].sort();
  const business = tree.modules.filter(m => m.group.role !== 'platform' && m.children.length >= 2).sort((a, b) => reqs(b.group.id).length - reqs(a.group.id).length);
  const platform = tree.modules.filter(m => m.group.role === 'platform').sort((a, b) => (moduleScope(p, b.group.id)?.served.size || 0) - (moduleScope(p, a.group.id)?.served.size || 0));
  const [A, B, C] = business, P = platform[0];
  if (!A || !B || !C || !P) throw Error('The synthetic register no longer proposes three business modules with sub-modules and a platform module.');
  const cats = ['integrity', 'availability', 'performance', 'recoverability', 'security', 'traceability'];
  const driver = (title, requirementIds, i) => run(applyQualityCommand, 'quality.driver', {category: cats[i % cats.length], title, priority: ['Critical', 'Important', 'Supporting'][i % 3], operator: 'At most', targetValue: String(200 + i * 10), metric: 'Response time at the 95th percentile', unit: 'ms', stimulus: 'A burst of synthetic requests', conditions: 'Normal operation', response: 'Each request is answered once', window: 'Rolling 1 hour', measurement: 'Load test', rationale: 'Synthetic driver ' + i + '.', owner: 'Quality owner', source: 'Synthetic brief', confirmed: false, targetConfirmed: false, requirementIds, responsibilityIds: []});
  const made = {};
  let i = 0;
  for (const [key, m] of [['A', A], ['B', B], ['C', C]]) {
    const [s1, s2] = m.children, r1 = reqs(s1.id), r2 = reqs(s2.id), all = reqs(m.group.id), x = made[key] = {module: m.group.id, subs: [s1.id, s2.id]};
    x.drivers = [driver(`Driver ${key}1 · ${s1.title}`, r1.slice(0, 3), i++), driver(`Driver ${key}2 · ${s2.title}`, r2.slice(0, 3), i++)];
    x.decision = run(applyDecisionCommand, 'decision.save', {question: `Decision ${key}: how should ${m.group.title.toLowerCase()} be handled?`, context: 'Synthetic decision for module ' + key + '.', topic: 'custom', requirementIds: [r1[0], r2[0]], driverIds: [x.drivers[0]], owner: 'Architecture lead', rationale: 'Synthetic rationale ' + key + '.', assumptions: '', risks: '', mitigation: '', source: 'Synthetic workshop'});
    run(applyLogicalCommand, 'logical.group', {title: `Realises ${m.group.title}`, purpose: `The responsibilities of module ${key}.`, requirementGroupIds: [m.group.id]});
    x.group = p.logical.groups.at(-1).id;
    const resp = (title, requirementIds) => run(applyLogicalCommand, 'logical.responsibility', {title, purpose: 'Owns ' + title.toLowerCase() + '.', boundary: 'Keeps its own records.', owner: 'Team ' + key, source: 'Synthetic design', groupId: x.group, requirementIds, decisionIds: [x.decision], confirmed: false});
    x.responsibilities = [resp(`Responsibility ${key}1 · ${s1.title}`, r1.slice(0, 6)), resp(`Responsibility ${key}2 · ${s2.title}`, r2.slice(0, 6)), resp(`Responsibility ${key}3 · ${m.group.title}`, all.slice(-4))];
    run(applyLogicalCommand, 'logical.connection', {from: x.responsibilities[0], to: x.responsibilities[1], label: 'hands over to', kind: 'flow', condition: ''});
    const comp = (n, logicalId) => run(applyRealisationCommand, 'realisation.component', {title: `Component ${key}${n} · ${m.group.title}`, kind: 'service', purpose: 'Runs module ' + key + ' part ' + n + '.', boundary: 'Owns its own records.', owner: 'Delivery team ' + key, inputs: 'Synthetic input', outputs: 'Synthetic output', rationale: 'Allocated from its responsibility.', source: 'Synthetic design', technologyNeeds: 'Compute and storage.', status: 'draft', allocations: [{logicalId, scope: 'Part of the responsibility'}], dataIds: [], decisionIds: [x.decision]});
    x.components = [comp(1, x.responsibilities[0]), comp(2, x.responsibilities[1])];
    run(applyRealisationCommand, 'realisation.interaction', {from: x.components[0], to: x.components[1], label: 'passes records to', interaction: 'data', condition: '', failure: ''});
  }
  made.shared = {driver: driver('Driver AB · shared posting rules', [...reqs(made.A.subs[0]).slice(3, 5), ...reqs(made.B.subs[0]).slice(3, 5)], i++), unlinked: driver('Driver · no requirement named', [], i++)};
  // The platform module: realised by a group of its own, one responsibility on the requirements it serves.
  {
    const served = [...moduleScope(p, P.group.id).served].filter(id => p.artefacts.some(a => a.id === id && a.type === 'requirement')).sort();
    const own = reqs(P.group.id), linked = (own.length ? own : served).slice(0, 4);
    run(applyLogicalCommand, 'logical.group', {title: `Realises ${P.group.title}`, purpose: 'The platform service.', requirementGroupIds: [P.group.id]});
    made.P = {module: P.group.id, group: p.logical.groups.at(-1).id};
    made.P.responsibility = run(applyLogicalCommand, 'logical.responsibility', {title: `Platform service · ${P.group.title}`, purpose: 'Serves the business modules.', boundary: 'A shared service.', owner: 'Platform team', source: 'Synthetic design', groupId: made.P.group, requirementIds: linked, decisionIds: [], confirmed: false});
  }
  // Chapters 6 and 7: two trust boundaries, a need per component, two capabilities that meet them, a product for each.
  const components = ['A', 'B', 'C'].flatMap(k => made[k].components);
  for (const t of ['Service network', 'Data network']) run(applyTechnologyCommand, 'technology.boundary', {title: t, owner: 'Security architecture', policy: 'Only named service identities cross it.'});
  const bounds = p.technology.boundaries.map(b => b.id), platforms = new Set(PLATFORM_CATEGORIES.map(c => c[0])), tcats = TECHNOLOGY_CATEGORIES.map(c => c[0]).filter(c => !platforms.has(c));
  components.forEach((id, k) => run(applyTechnologyCommand, 'technology.needs', {applicationId: id, boundaryId: bounds[k % 2], needs: [{category: tcats[k % 2], description: 'Component ' + (k + 1) + ' needs ' + tcats[k % 2] + '.', criticality: 'essential'}], confirmed: false}));
  const needs = components.map(id => p.technology.needs.find(n => n.applicationId === id)?.id).filter(Boolean);
  made.capabilities = [0, 1].map(k => run(applyTechnologyCommand, 'technology.capability', {title: 'Capability ' + (k + 1) + ' · ' + tcats[k], category: tcats[k], purpose: 'Meets the needs of its components.', boundary: 'One shared platform service.', owner: 'Platform team', rationale: 'Synthetic.', source: 'Synthetic catalogue', boundaryId: bounds[k], failureDomain: 'Region ' + (k + 1), alternateDomain: '', continuity: 'single', status: 'draft', driverIds: [], decisionIds: [], mappings: needs.filter((_, j) => j % 2 === k).map(needId => ({needId, scope: 'Whole need'}))}));
  made.capabilities.forEach((cap, k) => run(applyTechnologyRealisationCommand, 'techrealisation.plan', {title: 'Product line ' + (k + 1), purpose: 'Provides capability ' + (k + 1) + '.', owner: 'Platform team', operationsPlan: 'On-call rota.', accessPlan: 'Service identities only.', dataPlan: 'Encrypted at rest.', resiliencePlan: 'Two zones.', interfacePlan: 'Published contract.', lifecyclePlan: 'Supported releases.', rationale: '', risks: '', assumptions: '', mappings: [{capabilityId: cap, scope: 'Whole capability'}]}));
  // Chapter 8: a party, a data definition per module owned by its first component, the contracts.
  made.party = run(applyInterfacesCommand, 'interfaces.party', {title: 'External system · clearing house', purpose: 'A synthetic external system.', owner: 'Partner', confirmed: false});
  const contract = (title, from, to, dataId) => run(applyInterfacesCommand, 'interfaces.contract', {title, kind: 'request', from, to, exchanges: [{dataId, role: 'request'}], purpose: 'Synthetic interface.', owner: 'Integration team', protocol: 'HTTPS / JSON', operation: 'POST /items', contractVersion: '1.0', correlationKey: 'recordId', idempotencyKey: 'recordId', duplicatePolicy: 'Return the first outcome.', timeoutMs: '', timeoutBasis: '', timeoutPolicy: 'Keep pending; enquire before replay.', retryPolicy: 'Retry after enquiry only.', failurePolicy: 'Distinguish rejection from an unknown outcome.', authorization: 'Service identity', transport: 'mTLS', compatibility: '', evidence: '', assumptions: ''});
  for (const key of ['A', 'B', 'C']) {
    const x = made[key];
    x.data = run(applyInterfacesCommand, 'interfaces.data', {title: 'Record type · module ' + key, purpose: 'Synthetic data of module ' + key + '.', owner: 'Data owner', authorityId: x.components[0], classification: 'Confidential', retentionPolicy: 'Kept for seven years.', retentionBasis: '', retentionDays: '', protection: 'Masked in support views.', evidence: 'Synthetic catalogue', assumptions: ''});
    run(applyInterfacesCommand, 'interfaces.field', {id: x.data, field: {name: 'recordId', type: 'string', description: 'Stable reference.', key: true, required: true, classification: 'Inherited', example: 'r-1'}});
    x.contract = contract('Interface within module ' + key, x.components[0], x.components[1], x.data);
  }
  made.shared.contract = contract('Interface from module A to module B', made.A.components[0], made.B.components[0], made.A.data);
  made.shared.partyContract = contract('Interface from the clearing house to module A', made.party, made.A.components[0], made.A.data);
  // Chapter 9: a threat on A's data, a control that answers it.
  made.threat = run(applySecurityCommand, 'security.threat', {title: 'Threat · disclosure of module A records', category: THREAT_CATEGORIES[0], priority: 'High', targetIds: [made.A.data], actor: 'An operator without need to know', scenario: 'Reads a record in a support view.', consequence: 'Data escapes its audience.', owner: 'Security officer', priorityBasis: 'Regulated data.', assumptions: ''});
  made.control = run(applySecurityCommand, 'security.control', {title: 'Control · masking of module A records', category: CONTROL_CATEGORIES[0], failureMode: 'Deny or contain', targetIds: [made.A.data], threatIds: [made.threat], purpose: 'Limits who reads the record.', owner: 'Security officer', enforcement: 'Support view', mechanism: 'Field masking', failureResponse: 'Deny the view.', telemetry: 'Access log', verificationPlan: 'Quarterly review', operatingObligations: '', assumptions: ''});
  // Chapter 10: one environment of two zones running every component.
  const envId = run(applyRuntimeCommand, 'runtime.environment', {title: 'Production', stage: 'Production design', purpose: 'Runs the synthetic platform.', owner: 'Run team', basis: 'Synthetic.', confirmed: false, assetIds: components});
  const zones = [0, 1].map(k => run(applyRuntimeCommand, 'runtime.zone', {environmentId: envId, title: 'Zone ' + (k + 1), owner: 'Run team', failureDomain: 'Region ' + (k + 1), isolation: 'Own cluster.', boundaryId: bounds[k]}));
  p.runtime.plans.filter(r => r.environmentId === envId).forEach((plan, k) => run(applyRuntimeCommand, 'runtime.placement', {planId: plan.id, zoneId: zones[k % 2], role: 'active', replicas: 2, basis: 'Peak plus one.', confirmed: false}));
  made.environment = envId; made.zones = zones;
  const document = withFinalReview(p);
  return {document, manifest, modules: {A: made.A.module, B: made.B.module, C: made.C.module, P: made.P.module}, made};
}
