// The synthetic large project of the figures-at-size suites (round 12, P): the shape of a real core-banking design at
// the size the owner's workbook reached (1,400 requirements in about 60 groups, about 180 components, 400 interfaces,
// 100 running parts), with none of its text. Every name is generated here from generic words and numbers; the same
// arguments give the same document on every machine (a fixed seed, a fixed clock).
// It is built through the chapters' own command appliers, one command per record, as scripts/build-scale-fixture.mjs
// builds the 500-per-chapter project, so every record passed its validator and the model reads it as it reads a real
// project: requirements needed by journey steps and held by requirement groups; quality drivers and decisions that
// answer requirements; responsibilities in modules that fulfil requirements; components allocated to them that own
// data, need platform capabilities, call each other through contracts and run as placements in the zones of an
// environment behind trust boundaries; threats and controls on the data.
//   import {buildFiguresProject, FIGURES_COUNTS} from './figures-at-size-fixture.mjs';
//   const {document, counts, ms} = await buildFiguresProject();
//   node figures-at-size-fixture.mjs --out project.json
import {createProject} from './shared/projects-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {applyRequirementsCommand} from './public/requirement-commands.js';
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

export const FIGURES_AT = '2026-10-08T09:00:00.000Z';
export const FIGURES_COUNTS = Object.freeze({requirements: 1400, groups: 60, journeys: 24, actors: 6, drivers: 40, decisions: 60, modules: 18, responsibilities: 120, components: 180, parties: 12, data: 120, contracts: 400, capabilities: 40, threats: 20, controls: 20, zones: 8, placements: 100, allocations: 1});

// mulberry32: a small deterministic generator.
function random(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const n2 = i => String(i).padStart(2, '0'), n3 = i => String(i).padStart(3, '0'), n4 = i => String(i).padStart(4, '0');
// Generic words only: a requirement is an action on an object in an area, a module and a component are numbered areas.
const AREAS = ['Accounts', 'Records', 'Payments', 'Limits', 'Products', 'Parties', 'Ledger', 'Reports', 'Access', 'Rates', 'Schedules', 'Notices', 'Batches', 'Archives', 'Channels', 'Settings', 'Balances', 'Statements'];
const ACTIONS = ['record', 'show', 'check', 'export', 'approve', 'reverse', 'calculate', 'notify', 'restrict', 'reconcile', 'search', 'archive', 'post', 'schedule', 'retrieve', 'amend'];
const OBJECTS = ['an entry', 'a balance', 'a profile', 'an instruction', 'an accrual', 'a waiver', 'a posting', 'a repayment', 'a till', 'a role', 'a rate', 'a deposit', 'a report', 'a cheque', 'a limit', 'a conversion'];
const KINDS = ['service', 'worker', 'adapter', 'queue', 'store', 'module'];

// Zipf-like group sizes that sum to `total`: a few large groups and a long tail, as an imported register has.
function groupSizes(total, groups) {
  const w = Array.from({length: groups}, (_, i) => 1 / Math.pow(i + 1, 0.95)), sum = w.reduce((a, b) => a + b, 0);
  const sizes = w.map(x => Math.max(2, Math.floor(total * x / sum)));
  let left = total - sizes.reduce((a, b) => a + b, 0);
  for (let i = 0; left !== 0; i = (i + 1) % groups) { if (left > 0) { sizes[i]++; left--; } else if (sizes[i] > 2) { sizes[i]--; left++; } }
  return sizes;
}

export async function buildFiguresProject({counts = FIGURES_COUNTS, seed = 12, name = 'Synthetic bank platform', log = () => {}} = {}) {
  const C = {...FIGURES_COUNTS, ...counts}, rnd = random(seed), at = FIGURES_AT, started = Date.now(), timings = {};
  let p = createProject({name, template: 'blank'}, 'figures-at-size', at);
  const run = (apply, type, payload) => { const r = apply(handOver(p), {type, payload}, at); p = r.document; return r.selected; };
  const step = (label, fn) => { const t = Date.now(); fn(); p = withFinalReview(p); timings[label] = Date.now() - t; log(label + ' · ' + timings[label] + ' ms'); };
  const pick = (xs, i) => xs[((i % xs.length) + xs.length) % xs.length];

  // Chapter 1: actors, journey steps (each taken part in by an actor), the requirements each step needs, and the
  // requirement groups that hold them (the largest about a fifth of the register, the smallest two).
  let actors = [], journeys = [], reqs = [];
  step('requirements', () => {
    actors = Array.from({length: C.actors}, (_, i) => run(applyCommand, 'artefact', {type: 'actor', title: 'Role ' + n2(i + 1) + ' · ' + pick(AREAS, i * 5) + ' desk', description: 'A synthetic role that works with ' + pick(AREAS, i * 5).toLowerCase() + '.', confirmed: false}));
    for (let i = 0; i < C.journeys; i++) journeys.push(run(applyCommand, 'artefact', {type: 'journey', title: 'Step ' + n2(i + 1) + ' · handle ' + pick(AREAS, i).toLowerCase(), description: 'Journey step ' + (i + 1) + ' of the synthetic platform.', owner: 'Role ' + n2(i % C.actors + 1), links: [[pick(actors, i), 'participates in', 'new'], ...(i ? [[journeys[i - 1], 'precedes', 'new']] : [])]}));
    for (let i = 1; i <= C.requirements; i++) {
      const area = pick(AREAS, Math.floor(rnd() * AREAS.length));
      reqs.push(run(applyCommand, 'artefact', {type: 'requirement', title: `Requirement ${n4(i)}: ${pick(ACTIONS, Math.floor(rnd() * ACTIONS.length))} ${pick(OBJECTS, Math.floor(rnd() * OBJECTS.length))} in ${area.toLowerCase()}`, description: `The platform shall meet synthetic requirement ${i} for ${area.toLowerCase()}.`, priority: ['Must', 'Should', 'Could'][i % 3], owner: 'Area owner ' + (i % 9 + 1), source: 'Synthetic register row ' + i, confirmed: i % 5 === 0, links: [[pick(journeys, Math.floor((i - 1) * C.journeys / C.requirements)), 'requires', 'new']]}));
    }
    const sizes = groupSizes(C.requirements, C.groups); let at0 = 0;
    sizes.forEach((size, g) => { run(applyRequirementsCommand, 'requirements.group', {title: `Functional area ${n2(g + 1)} · ${pick(AREAS, g)}${g >= AREAS.length ? ' ' + (Math.floor(g / AREAS.length) + 1) : ''}`, kind: ['functional-area', 'theme', 'module', 'domain'][g % 4], description: `Synthetic group ${g + 1} of the register.`, owner: '', memberIds: reqs.slice(at0, at0 + size), rule: []}); at0 += size; });
  });
  // Chapter 2: quality drivers, each answering three requirements.
  let drivers = [];
  step('drivers', () => {
    const cats = ['integrity', 'availability', 'performance', 'recoverability', 'security', 'traceability', 'scalability', 'maintainability'];
    drivers = Array.from({length: C.drivers}, (_, k) => { const i = k + 1; return run(applyQualityCommand, 'quality.driver', {category: pick(cats, i), title: 'Quality driver ' + n2(i) + ' · ' + pick(cats, i), priority: ['Critical', 'Important', 'Supporting'][i % 3], operator: 'At most', targetValue: String(200 + i * 10), metric: 'Response time at the 95th percentile', unit: 'ms', stimulus: 'A burst of synthetic requests', conditions: 'Normal operation', response: 'Each request is answered once', window: 'Rolling 1 hour', measurement: 'Load test', rationale: 'Synthetic driver ' + i + '.', owner: 'Quality owner ' + (i % 5 + 1), source: 'Synthetic brief', confirmed: false, targetConfirmed: false, requirementIds: [0, 1, 2].map(j => pick(reqs, k * 35 + j * 11)), responsibilityIds: []}); });
  });
  // Chapter 3: decisions, each framed by two requirements and a driver.
  let decisions = [];
  step('decisions', () => {
    decisions = Array.from({length: C.decisions}, (_, k) => { const i = k + 1; return run(applyDecisionCommand, 'decision.save', {question: 'Decision ' + n2(i) + ': how should ' + pick(AREAS, i).toLowerCase() + ' be handled?', context: 'Synthetic decision ' + i + '.', topic: 'custom', requirementIds: [pick(reqs, k * 23), pick(reqs, k * 23 + 7)], driverIds: [pick(drivers, k)], owner: 'Architecture lead ' + (i % 4 + 1), rationale: 'Synthetic rationale ' + i + '.', assumptions: '', risks: '', mitigation: '', source: 'Synthetic workshop'}); });
  });
  // Chapter 4: modules and their responsibilities, each fulfilling a dozen requirements (every requirement once at least).
  let resp = [];
  step('logical', () => {
    for (let g = 0; g < C.modules; g++) run(applyLogicalCommand, 'logical.group', {title: 'Module ' + n2(g + 1) + ' · ' + pick(AREAS, g), purpose: 'Synthetic module ' + (g + 1) + '.'});
    const groups = p.logical.groups.map(g => g.id), per = Math.ceil(C.requirements / C.responsibilities);
    resp = Array.from({length: C.responsibilities}, (_, k) => run(applyLogicalCommand, 'logical.responsibility', {title: 'Responsibility ' + n3(k + 1) + ' · ' + pick(ACTIONS, k) + ' ' + pick(AREAS, k * 7).toLowerCase(), purpose: 'Owns synthetic responsibility ' + (k + 1) + '.', boundary: 'Keeps its own records.', owner: 'Team ' + (k % 12 + 1), source: 'Synthetic design', groupId: pick(groups, Math.floor(k * C.modules / C.responsibilities)), requirementIds: reqs.slice(k * per, k * per + per).length ? reqs.slice(k * per, k * per + per) : [pick(reqs, k)], decisionIds: [pick(decisions, k)], confirmed: false}));
    for (let k = 1; k < resp.length; k++) run(applyLogicalCommand, 'logical.connection', {from: resp[k - 1], to: resp[k], label: 'hands over to', kind: 'flow', condition: ''});
    for (let k = 0; k < 30; k++) { const a = pick(resp, k * 13 + 5), b = pick(resp, k * 29 + 61); if (a !== b) try { run(applyLogicalCommand, 'logical.connection', {from: a, to: b, label: 'informs', kind: 'trace', condition: ''}); } catch { /* a repeated pair is refused */ } }
  });
  // Chapter 5: components, each allocated one responsibility (so it stands in that responsibility's module), and the
  // interactions between neighbours. Round 12 (G, GR-TST-06): `allocations` above one shares each component with the
  // next responsibilities too (it stays in its first one's module), so a dense Chapter 5 picture carries as many
  // relationships as the drafted design's had (183 elements and 444 relationships or more); the large project keeps one.
  let comps = [];
  step('components', () => {
    comps = Array.from({length: C.components}, (_, k) => run(applyRealisationCommand, 'realisation.component', {title: 'Component ' + n3(k + 1) + ' · ' + pick(AREAS, k * 3) + ' ' + pick(KINDS, k), kind: pick(KINDS, k), purpose: 'Runs synthetic component ' + (k + 1) + '.', boundary: 'Owns its own records.', owner: 'Delivery team ' + (k % 9 + 1), inputs: 'Synthetic input', outputs: 'Synthetic output', rationale: 'Allocated from its responsibility.', source: 'Synthetic design', technologyNeeds: 'Compute and storage.', status: 'draft', allocations: Array.from({length: Math.max(1, Math.min(C.allocations || 1, resp.length))}, (_, j) => ({logicalId: pick(resp, Math.floor(k * C.responsibilities / C.components) + j), scope: j ? 'Shares the responsibility' : 'Part of the responsibility'})), dataIds: [], decisionIds: [pick(decisions, k)]}));
    for (let k = 1; k < comps.length; k += 2) run(applyRealisationCommand, 'realisation.interaction', {from: comps[k - 1], to: comps[k], label: 'passes records to', interaction: 'data', condition: '', failure: ''});
  });
  // Chapter 6: trust boundaries, a need per component, capabilities that meet them.
  let caps = [], bounds = [];
  step('technology', () => {
    for (const t of ['Public edge', 'Service network', 'Data network', 'Partner link']) run(applyTechnologyCommand, 'technology.boundary', {title: t, owner: 'Security architecture', policy: 'Only named service identities cross it.'});
    bounds = p.technology.boundaries.map(b => b.id);
    // The categories of the platform capabilities the components need. An application platform (round 12, K: a packaged
    // product weighed in Chapter 7 against building the components it provides) is not one of them, so the project
    // keeps the shape its pictures were measured at.
    const platforms = new Set(PLATFORM_CATEGORIES.map(c => c[0])), cats = TECHNOLOGY_CATEGORIES.map(c => c[0]).filter(c => !platforms.has(c));
    comps.forEach((id, k) => run(applyTechnologyCommand, 'technology.needs', {applicationId: id, boundaryId: pick(bounds, k % 3 + (k % 11 === 0 ? 1 : 0)), needs: [{category: pick(cats, k), description: 'Component ' + (k + 1) + ' needs ' + pick(cats, k) + '.', criticality: 'essential'}], confirmed: false}));
    const needs = comps.map(id => p.technology.needs.find(n => n.applicationId === id)?.id).filter(Boolean);
    caps = Array.from({length: C.capabilities}, (_, k) => run(applyTechnologyCommand, 'technology.capability', {title: 'Capability ' + n2(k + 1) + ' · ' + pick(cats, k), category: pick(cats, k), purpose: 'Meets the needs of its components.', boundary: 'One shared platform service.', owner: 'Platform team ' + (k % 6 + 1), rationale: 'Synthetic.', source: 'Synthetic catalogue', boundaryId: pick(bounds, k), failureDomain: 'Region ' + (k % 3 + 1), alternateDomain: '', continuity: 'single', status: 'draft', driverIds: [pick(drivers, k)], decisionIds: [pick(decisions, k)], mappings: needs.filter((_, j) => j % C.capabilities === k).map(needId => ({needId, scope: 'Whole need'}))}));
  });
  // Chapter 7: each capability realised by a product.
  step('realisation', () => {
    caps.forEach((cap, k) => run(applyTechnologyRealisationCommand, 'techrealisation.plan', {title: 'Product line ' + n2(k + 1), purpose: 'Provides capability ' + (k + 1) + '.', owner: 'Platform team ' + (k % 6 + 1), operationsPlan: 'On-call rota.', accessPlan: 'Service identities only.', dataPlan: 'Encrypted at rest.', resiliencePlan: 'Two zones.', interfacePlan: 'Published contract.', lifecyclePlan: 'Supported releases.', rationale: '', risks: '', assumptions: '', mappings: [{capabilityId: cap, scope: 'Whole capability'}]}));
  });
  // Chapter 8: external parties, data definitions with a key field and an authoritative component, and the contracts:
  // most between two components, the rest between a party and a component.
  let data = [], parties = [];
  step('interfaces', () => {
    parties = Array.from({length: C.parties}, (_, k) => run(applyInterfacesCommand, 'interfaces.party', {title: 'External system ' + n2(k + 1), purpose: 'A synthetic external system.', owner: 'Partner ' + (k + 1), confirmed: false}));
    data = Array.from({length: C.data}, (_, k) => { const id = run(applyInterfacesCommand, 'interfaces.data', {title: 'Record type ' + n3(k + 1) + ' · ' + pick(AREAS, k).toLowerCase(), purpose: 'Synthetic data ' + (k + 1) + '.', owner: 'Data owner ' + (k % 5 + 1), authorityId: pick(comps, k * 3), classification: ['Internal', 'Confidential', 'Restricted'][k % 3], retentionPolicy: 'Kept for seven years.', retentionBasis: '', retentionDays: '', protection: 'Masked in support views.', evidence: 'Synthetic catalogue', assumptions: ''}); run(applyInterfacesCommand, 'interfaces.field', {id, field: {name: 'recordId', type: 'string', description: 'Stable reference.', key: true, required: true, classification: 'Inherited', example: 'r-' + (k + 1)}}); return id; });
    const external = Math.round(C.contracts / 20);
    for (let k = 0; k < C.contracts; k++) {
      const party = k < external, a = party ? pick(parties, k) : pick(comps, Math.floor(rnd() * comps.length)), b0 = pick(comps, Math.floor(rnd() * comps.length)), b = b0 === a ? pick(comps, comps.indexOf(b0) + 1) : b0;
      run(applyInterfacesCommand, 'interfaces.contract', {title: 'Interface ' + n3(k + 1), kind: k % 9 === 0 ? 'event' : 'request', from: party && k % 2 ? b : a, to: party && k % 2 ? a : b, exchanges: [{dataId: pick(data, k), role: 'request'}], purpose: 'Synthetic interface ' + (k + 1) + '.', owner: 'Integration team ' + (k % 4 + 1), protocol: k % 3 ? 'HTTPS / JSON' : 'Message queue', operation: 'POST /items/' + (k + 1), contractVersion: '1.0', correlationKey: 'recordId', idempotencyKey: 'recordId', duplicatePolicy: 'Return the first outcome.', timeoutMs: '', timeoutBasis: '', timeoutPolicy: 'Keep pending; enquire before replay.', retryPolicy: 'Retry after enquiry only.', failurePolicy: 'Distinguish rejection from an unknown outcome.', authorization: 'Service identity', transport: 'mTLS', compatibility: '', evidence: '', assumptions: ''});
    }
  });
  // Chapter 9: threats on data, controls that protect it and answer them.
  step('security', () => {
    const threats = Array.from({length: C.threats}, (_, k) => run(applySecurityCommand, 'security.threat', {title: 'Threat ' + n2(k + 1) + ' · disclosure of ' + pick(AREAS, k).toLowerCase(), category: pick(THREAT_CATEGORIES, k), priority: ['Critical', 'High', 'Moderate', 'Low'][k % 4], targetIds: [pick(data, k * 5)], actor: 'An operator without need to know', scenario: 'Reads a record in a support view.', consequence: 'Data escapes its audience.', owner: 'Security officer ' + (k % 3 + 1), priorityBasis: 'Regulated data.', assumptions: ''}));
    for (let k = 0; k < C.controls; k++) run(applySecurityCommand, 'security.control', {title: 'Control ' + n2(k + 1) + ' · masking', category: pick(CONTROL_CATEGORIES, k), failureMode: 'Deny or contain', targetIds: [pick(data, k * 5)], threatIds: [pick(threats, k)], purpose: 'Limits who reads the record.', owner: 'Security officer ' + (k % 3 + 1), enforcement: 'Support view', mechanism: 'Field masking', failureResponse: 'Deny the view.', telemetry: 'Access log', verificationPlan: 'Quarterly review', operatingObligations: '', assumptions: ''});
  });
  // Chapter 10: one production environment running the first components as placements in its zones.
  step('runtime', () => {
    const env = run(applyRuntimeCommand, 'runtime.environment', {title: 'Production', stage: 'Production design', purpose: 'Runs the synthetic platform.', owner: 'Run team', basis: 'Synthetic.', confirmed: false, assetIds: comps.slice(0, C.placements)});
    const zones = Array.from({length: C.zones}, (_, k) => run(applyRuntimeCommand, 'runtime.zone', {environmentId: env, title: 'Zone ' + n2(k + 1), owner: 'Run team', failureDomain: 'Region ' + (k % 2 + 1), isolation: 'Own cluster.', boundaryId: pick(bounds, k % 3)}));
    const plans = p.runtime.plans.filter(r => r.environmentId === env);
    plans.forEach((plan, k) => run(applyRuntimeCommand, 'runtime.placement', {planId: plan.id, zoneId: pick(zones, Math.floor(k * C.zones / plans.length)), role: k % 10 === 9 ? 'standby' : 'active', replicas: 2, basis: 'Peak plus one.', confirmed: false}));
  });
  const document = withFinalReview(p);
  return {document, counts: figuresCounts(document), timings, ms: Date.now() - started};
}

// Round 24 (D-24-07): a design shaped like the one AIW drafts from a large register (figures-integrity-validate.mjs), with
// none of its text: requirement groups of two kinds (areas that partition the register and themes that cut across it),
// actors, one responsibility per component, every component in the one container its compute need derives (no container
// named), stores that keep state through one storage capability, external parties of several kinds (interfaces-domain.js
// PARTY_KINDS, some with none stated), contracts between parties and components and among components, and one production
// environment whose one zone holds every placement. `modules` above 0 puts the responsibilities in that many Chapter 4
// responsibility groups (the modules a later round drafts); 0 leaves them in none, as a drafted design is today.
export const DRAFTED_COUNTS = Object.freeze({requirements: 1400, areas: 18, themes: 19, actors: 13, components: 150, stores: 12, parties: 36, data: 60, contracts: 320, modules: 0});
export async function buildDraftedShapeProject({counts = DRAFTED_COUNTS, seed = 24, name = 'Synthetic drafted platform', log = () => {}} = {}) {
  const C = {...DRAFTED_COUNTS, ...counts}, rnd = random(seed), at = FIGURES_AT, started = Date.now();
  const {PARTY_KINDS} = await import('./public/interfaces-domain.js');
  let p = createProject({name, template: 'blank'}, 'figures-drafted', at);
  const run = (apply, type, payload) => { const r = apply(handOver(p), {type, payload}, at); p = r.document; return r.selected; };
  const step = (label, fn) => { const t = Date.now(); fn(); p = withFinalReview(p); log(label + ' · ' + (Date.now() - t) + ' ms'); };
  const pick = (xs, i) => xs[((i % xs.length) + xs.length) % xs.length];
  const reqs = [];
  step('requirements', () => {
    for (let i = 0; i < C.actors; i++) run(applyCommand, 'artefact', {type: 'actor', title: 'Role ' + n2(i + 1) + ' · ' + pick(AREAS, i * 7) + ' desk', description: 'A synthetic role that works with ' + pick(AREAS, i * 7).toLowerCase() + '.', confirmed: false});
    for (let i = 1; i <= C.requirements; i++) reqs.push(run(applyCommand, 'artefact', {type: 'requirement', title: `Requirement ${n4(i)}: ${pick(ACTIONS, Math.floor(rnd() * ACTIONS.length))} ${pick(OBJECTS, Math.floor(rnd() * OBJECTS.length))}`, description: `The platform shall meet synthetic requirement ${i}.`, priority: ['Must', 'Should', 'Could'][i % 3], owner: 'Area owner ' + (i % 9 + 1), source: 'Synthetic register row ' + i, confirmed: false}));
    // The areas partition the register; each theme gathers every n-th requirement across the areas.
    const sizes = groupSizes(C.requirements, C.areas); let at0 = 0;
    sizes.forEach((size, g) => { run(applyRequirementsCommand, 'requirements.group', {title: `Area ${n2(g + 1)} · ${pick(AREAS, g)}`, kind: 'domain', description: `Synthetic area ${g + 1} of the register.`, owner: '', memberIds: reqs.slice(at0, at0 + size), rule: []}); at0 += size; });
    for (let t = 0; t < C.themes; t++) run(applyRequirementsCommand, 'requirements.group', {title: `Theme ${n2(t + 1)} · ${pick(ACTIONS, t)} work`, kind: 'theme', description: `Synthetic theme ${t + 1} across the areas.`, owner: '', memberIds: reqs.filter((_, i) => i % C.themes === t && i % 3 !== 0), rule: []});
  });
  // Chapter 4 and 5: one responsibility per component, each fulfilling a slice of the register (every requirement once).
  let comps = [];
  step('components', () => {
    for (let g = 0; g < C.modules; g++) run(applyLogicalCommand, 'logical.group', {title: 'Module ' + n2(g + 1) + ' · ' + pick(AREAS, g), purpose: 'Synthetic module ' + (g + 1) + '.'});
    const modules = (p.logical.groups || []).map(g => g.id), per = Math.ceil(C.requirements / C.components);
    const resp = Array.from({length: C.components}, (_, k) => run(applyLogicalCommand, 'logical.responsibility', {title: 'Responsibility ' + n3(k + 1) + ' · ' + pick(ACTIONS, k) + ' ' + pick(AREAS, k * 5).toLowerCase(), purpose: 'Owns synthetic responsibility ' + (k + 1) + '.', boundary: 'Keeps its own records.', owner: 'Team ' + (k % 12 + 1), source: 'Synthetic design', ...(modules.length ? {groupId: pick(modules, Math.floor(k * modules.length / C.components))} : {}), requirementIds: reqs.slice(k * per, k * per + per).length ? reqs.slice(k * per, k * per + per) : [pick(reqs, k)], decisionIds: [], confirmed: false}));
    // Mostly services, as a drafted design is; the stores first, then a few adapters, workers and channels.
    const kindOf = k => (k < C.stores ? 'store' : k % 15 === 1 ? 'adapter' : k % 15 === 2 ? 'worker' : k % 25 === 3 ? 'channel' : 'service');
    comps = resp.map((r, k) => run(applyRealisationCommand, 'realisation.component', {title: pick(AREAS, k * 3) + ' ' + kindOf(k) + ' ' + n3(k + 1), kind: kindOf(k), purpose: 'Runs synthetic component ' + (k + 1) + '.', boundary: 'Owns its own records.', owner: 'Delivery team ' + (k % 9 + 1), inputs: 'Synthetic input', outputs: 'Synthetic output', rationale: 'Drafted from its responsibility.', source: 'Synthetic design', technologyNeeds: 'Compute.', status: 'draft', allocations: [{logicalId: r, scope: 'All of it'}], dataIds: [], decisionIds: []}));
    for (let k = 1; k < comps.length; k += 3) run(applyRealisationCommand, 'realisation.interaction', {from: comps[k - 1], to: comps[k], label: 'passes work to', interaction: 'data', condition: '', failure: ''});
  });
  // Chapter 6 and 7: every component needs compute, which one capability meets and one product line realises (the one
  // container every component derives); the stores also need transactional storage, met and realised once.
  step('technology', () => {
    const boundary = run(applyTechnologyCommand, 'technology.boundary', {title: 'Platform boundary', owner: 'Security architecture', policy: 'Only named service identities cross it.'});
    comps.forEach((id, k) => run(applyTechnologyCommand, 'technology.needs', {applicationId: id, boundaryId: boundary, needs: [{category: 'compute', description: 'Component ' + (k + 1) + ' runs on the shared compute.', criticality: 'essential'}, ...(k < C.stores ? [{category: 'transactional', description: 'Component ' + (k + 1) + ' keeps its records.', criticality: 'essential'}] : [])], confirmed: false}));
    const of = cat => p.technology.needs.filter(n => n.category === cat).map(n => ({needId: n.id, scope: 'Whole need'}));
    const capability = (title, category) => run(applyTechnologyCommand, 'technology.capability', {title, category, purpose: 'Meets the needs of every component.', boundary: 'One shared platform service.', owner: 'Platform team', rationale: 'Synthetic.', source: 'Synthetic catalogue', boundaryId: boundary, failureDomain: 'Region 1', alternateDomain: '', continuity: 'single', status: 'draft', driverIds: [], decisionIds: [], mappings: of(category)});
    const compute = capability('Shared compute', 'compute'), storage = capability('Transactional storage', 'transactional');
    for (const [title, cap] of [['Compute implementation', compute], ['Data store implementation', storage]]) run(applyTechnologyRealisationCommand, 'techrealisation.plan', {title, purpose: 'Provides ' + title.toLowerCase() + '.', owner: 'Platform team', operationsPlan: 'On-call rota.', accessPlan: 'Service identities only.', dataPlan: 'Encrypted at rest.', resiliencePlan: 'Two zones.', interfacePlan: 'Published contract.', lifecyclePlan: 'Supported releases.', rationale: '', risks: '', assumptions: '', mappings: [{capabilityId: cap, scope: 'Whole capability'}]});
  });
  // Chapter 8: parties of several kinds (every fourth with none stated), data with an authoritative component, and the
  // contracts: each party calls the platform and is called by it, the rest between components.
  step('interfaces', () => {
    const parties = Array.from({length: C.parties}, (_, k) => run(applyInterfacesCommand, 'interfaces.party', {title: 'External system ' + n2(k + 1), purpose: 'A synthetic external system.', owner: 'Partner ' + (k + 1), ...(k % 4 === 3 ? {} : {kind: pick(PARTY_KINDS, k)}), confirmed: false}));
    const data = Array.from({length: C.data}, (_, k) => { const id = run(applyInterfacesCommand, 'interfaces.data', {title: 'Record type ' + n3(k + 1) + ' · ' + pick(AREAS, k).toLowerCase(), purpose: 'Synthetic data ' + (k + 1) + '.', owner: 'Data owner ' + (k % 5 + 1), authorityId: pick(comps, k * 2), classification: ['Internal', 'Confidential', 'Restricted'][k % 3], retentionPolicy: 'Kept for seven years.', retentionBasis: '', retentionDays: '', protection: 'Masked in support views.', evidence: 'Synthetic catalogue', assumptions: ''}); run(applyInterfacesCommand, 'interfaces.field', {id, field: {name: 'recordId', type: 'string', description: 'Stable reference.', key: true, required: true, classification: 'Inherited', example: 'r-' + (k + 1)}}); return id; });
    for (let k = 0; k < C.contracts; k++) {
      const party = k < 2 * parties.length ? pick(parties, k) : null, c = pick(comps, Math.floor(rnd() * comps.length)), d0 = pick(comps, Math.floor(rnd() * comps.length)), d = d0 === c ? pick(comps, comps.indexOf(d0) + 1) : d0;
      const [from, to] = party ? (k % 2 ? [c, party] : [party, c]) : [c, d];
      run(applyInterfacesCommand, 'interfaces.contract', {title: 'Interface ' + n3(k + 1), kind: 'request', from, to, exchanges: [{dataId: pick(data, k), role: 'request'}], purpose: 'Synthetic interface ' + (k + 1) + '.', owner: 'Integration team ' + (k % 4 + 1), protocol: k % 3 ? 'HTTPS / JSON' : 'Message queue', operation: 'POST /items/' + (k + 1), contractVersion: '1.0', correlationKey: 'recordId', idempotencyKey: 'recordId', duplicatePolicy: 'Return the first outcome.', timeoutMs: '', timeoutBasis: '', timeoutPolicy: 'Keep pending; enquire before replay.', retryPolicy: 'Retry after enquiry only.', failurePolicy: 'Distinguish rejection from an unknown outcome.', authorization: 'Service identity', transport: 'mTLS', compatibility: '', evidence: '', assumptions: ''});
    }
  });
  // Chapter 10: one production environment running every component, its one zone holding every placement.
  step('runtime', () => {
    const env = run(applyRuntimeCommand, 'runtime.environment', {title: 'Production', stage: 'Production design', purpose: 'Runs the synthetic platform.', owner: 'Run team', basis: 'Synthetic.', confirmed: false, assetIds: comps});
    const zone = run(applyRuntimeCommand, 'runtime.zone', {environmentId: env, title: 'Production zone', owner: 'Run team', failureDomain: 'Region 1', isolation: 'Own cluster.'});
    for (const plan of p.runtime.plans.filter(r => r.environmentId === env)) run(applyRuntimeCommand, 'runtime.placement', {planId: plan.id, zoneId: zone, role: 'active', replicas: 2, basis: 'Peak plus one.', confirmed: false});
  });
  const document = withFinalReview(p);
  return {document, counts: figuresCounts(document), ms: Date.now() - started};
}

// Round 24 (D-24-07): a design drafted by module, as the drafting of round 24 makes it (figures-integrity-validate.mjs).
// The synthetic register is imported (sdd-fixtures.mjs syntheticImport: generated text, its domain and capability-theme
// columns), AIW proposes its module structure (requirements.modules-propose) and a person accepts it; then, through the
// chapters' commands, each module gets one Chapter 4 responsibility group that realises it (requirementGroupIds), a
// responsibility for each of its largest sub-modules (up to `perModule`), and a component realising each; the business
// modules' components use the platform modules' services through contracts, call one another and exchange with
// external systems of several kinds; the stores keep their records through one storage capability; every component runs
// on the one shared compute (so no container partitions them) unless `containers` names one Chapter 7 container per
// module; and the production environment places them in two zones, the first holding all but a few.
export async function buildModuleDesignProject({rows = 1400, perModule = 12, parties = 10, name = 'Synthetic module platform', containers = false, accept = true, log = () => {}} = {}) {
  const at = FIGURES_AT, started = Date.now(), {syntheticImport, blankProject} = await import('./sdd-fixtures.mjs'), {moduleTree} = await import('./public/module-model.js'), {PARTY_KINDS} = await import('./public/interfaces-domain.js');
  let p = (await syntheticImport(blankProject(name), {rows, choice: {domain: true, capabilityTheme: true}})).document;
  const run = (apply, type, payload, actor) => { const r = apply(handOver(p), {type, payload}, at, ...(actor ? [actor] : [])); p = r.document; return r.selected; };
  const step = (label, fn) => { const t = Date.now(); fn(); p = withFinalReview(p); log(label + ' · ' + (Date.now() - t) + ' ms'); };
  const pick = (xs, i) => xs[((i % xs.length) + xs.length) % xs.length];
  step('modules', () => { run(applyRequirementsCommand, 'requirements.modules-propose', {}, 'architect-a'); if (accept) run(applyRequirementsCommand, 'requirements.modules-accept', {reviewed: true}, 'architect-a'); });
  const T = moduleTree(p), homes = new Map();
  for (const [rid, h] of T.home) { const k = h.subId || h.moduleId; if (!homes.has(k)) homes.set(k, []); homes.get(k).push(rid); }
  const units = T.modules.map(m => ({module: m.group, platform: m.group.role === 'platform', parts: m.children.length ? m.children.slice().sort((a, b) => (homes.get(b.id) || []).length - (homes.get(a.id) || []).length).slice(0, perModule) : [m.group]}));
  const comps = [], byModule = new Map();
  step('components', () => {
    for (const u of units) {
      const g = run(applyLogicalCommand, 'logical.group', {title: u.module.title, purpose: 'Realises the ' + u.module.title + ' module.', requirementGroupIds: [u.module.id]});
      const gid = g || p.logical.groups.at(-1).id, mine = [];
      u.parts.forEach((part, k) => {
        const reqs = (homes.get(part.id) || []).slice(0, 20), resp = run(applyLogicalCommand, 'logical.responsibility', {title: 'Responsibility · ' + String(part.title).slice(0, 90), purpose: 'Owns ' + String(part.title).slice(0, 90).toLowerCase() + '.', boundary: 'Keeps its own records.', owner: 'Team ' + (comps.length % 12 + 1), source: 'Synthetic design', groupId: gid, requirementIds: reqs.length ? reqs : [], ...(reqs.length ? {} : {requirementGroupIds: [u.module.id]}), decisionIds: [], confirmed: false});
        const kind = u.platform ? 'service' : k === 1 ? 'store' : k === 2 ? 'adapter' : k === 3 ? 'worker' : 'service';
        const id = run(applyRealisationCommand, 'realisation.component', {title: u.module.title.slice(0, 60) + ' ' + kind + ' ' + String(k + 1).padStart(2, '0'), kind, purpose: 'Runs part of ' + u.module.title + '.', boundary: 'Owns its own records.', owner: 'Delivery team ' + (comps.length % 9 + 1), inputs: 'Synthetic input', outputs: 'Synthetic output', rationale: 'Drafted from its responsibility.', source: 'Synthetic design', technologyNeeds: 'Compute.', status: 'draft', allocations: [{logicalId: resp, scope: 'All of it'}], dataIds: [], decisionIds: []});
        comps.push(id); mine.push(id);
      });
      byModule.set(u.module.id, mine);
    }
  });
  const platformComps = units.filter(u => u.platform).flatMap(u => byModule.get(u.module.id)), businessComps = units.filter(u => !u.platform).flatMap(u => byModule.get(u.module.id));
  const stores = new Set(comps.filter(id => p.realisation.components.find(c => c.id === id)?.kind === 'store'));
  step('technology', () => {
    const boundary = run(applyTechnologyCommand, 'technology.boundary', {title: 'Platform boundary', owner: 'Security architecture', policy: 'Only named service identities cross it.'});
    comps.forEach((id, k) => run(applyTechnologyCommand, 'technology.needs', {applicationId: id, boundaryId: boundary, needs: [{category: 'compute', description: 'Component ' + (k + 1) + ' runs on the shared compute.', criticality: 'essential'}, ...(stores.has(id) ? [{category: 'transactional', description: 'Component ' + (k + 1) + ' keeps its records.', criticality: 'essential'}] : [])], confirmed: false}));
    const of = cat => p.technology.needs.filter(n => n.category === cat).map(n => ({needId: n.id, scope: 'Whole need'}));
    const capability = (title, category) => run(applyTechnologyCommand, 'technology.capability', {title, category, purpose: 'Meets the needs of every component.', boundary: 'One shared platform service.', owner: 'Platform team', rationale: 'Synthetic.', source: 'Synthetic catalogue', boundaryId: boundary, failureDomain: 'Region 1', alternateDomain: '', continuity: 'single', status: 'draft', driverIds: [], decisionIds: [], mappings: of(category)});
    const compute = capability('Shared compute', 'compute'), storage = capability('Transactional storage', 'transactional');
    for (const [title, cap] of [['Compute implementation', compute], ['Data store implementation', storage]]) run(applyTechnologyRealisationCommand, 'techrealisation.plan', {title, purpose: 'Provides ' + title.toLowerCase() + '.', owner: 'Platform team', operationsPlan: 'On-call rota.', accessPlan: 'Service identities only.', dataPlan: 'Encrypted at rest.', resiliencePlan: 'Two zones.', interfacePlan: 'Published contract.', lifecyclePlan: 'Supported releases.', rationale: '', risks: '', assumptions: '', mappings: [{capabilityId: cap, scope: 'Whole capability'}]});
    // `containers`: one Chapter 7 container per module, named by each of its components (the containers then partition them).
    if (containers) for (const u of units) {
      const k = run(applyTechnologyRealisationCommand, 'techrealisation.plan', {title: u.module.title.slice(0, 60) + ' runtime', purpose: 'Runs the ' + u.module.title + ' module.', owner: 'Platform team', operationsPlan: 'On-call rota.', accessPlan: 'Service identities only.', dataPlan: 'Encrypted at rest.', resiliencePlan: 'Two zones.', interfacePlan: 'Published contract.', lifecyclePlan: 'Supported releases.', rationale: '', risks: '', assumptions: '', mappings: [{capabilityId: compute, scope: 'Part of the capability'}]});
      const kid = k || p.technologyRealisation.records.at(-1).id;
      for (const id of byModule.get(u.module.id)) run(applyRealisationCommand, 'realisation.component', {id, containerId: kid});
    }
  });
  step('interfaces', () => {
    const ps = Array.from({length: parties}, (_, k) => run(applyInterfacesCommand, 'interfaces.party', {title: 'External system ' + String(k + 1).padStart(2, '0'), purpose: 'A synthetic external system.', owner: 'Partner ' + (k + 1), ...(k % 5 === 4 ? {} : {kind: pick(PARTY_KINDS, k % 4)}), confirmed: false}));
    const data = Array.from({length: 12}, (_, k) => run(applyInterfacesCommand, 'interfaces.data', {title: 'Record type ' + String(k + 1).padStart(3, '0'), purpose: 'Synthetic data ' + (k + 1) + '.', owner: 'Data owner ' + (k % 5 + 1), authorityId: pick(businessComps, k * 3), classification: ['Internal', 'Confidential', 'Restricted'][k % 3], retentionPolicy: 'Kept for seven years.', retentionBasis: '', retentionDays: '', protection: 'Masked in support views.', evidence: 'Synthetic catalogue', assumptions: ''}));
    let n = 0;
    const contract = (from, to) => run(applyInterfacesCommand, 'interfaces.contract', {title: 'Interface ' + String(++n).padStart(3, '0'), kind: 'request', from, to, exchanges: [{dataId: pick(data, n), role: 'request'}], purpose: 'Synthetic interface ' + n + '.', owner: 'Integration team ' + (n % 4 + 1), protocol: n % 3 ? 'HTTPS / JSON' : 'Message queue', operation: 'POST /items/' + n, contractVersion: '1.0', correlationKey: 'recordId', idempotencyKey: 'recordId', duplicatePolicy: 'Return the first outcome.', timeoutMs: '', timeoutBasis: '', timeoutPolicy: 'Keep pending; enquire before replay.', retryPolicy: 'Retry after enquiry only.', failurePolicy: 'Distinguish rejection from an unknown outcome.', authorization: 'Service identity', transport: 'mTLS', compatibility: '', evidence: '', assumptions: ''});
    // Each business component uses a platform service; every third calls the next business component; each external
    // system calls the platform and is called by it.
    businessComps.forEach((id, k) => { if (platformComps.length) contract(id, pick(platformComps, k)); if (k % 3 === 0) contract(id, pick(businessComps, k + 5)); });
    ps.forEach((pt, k) => { contract(pt, pick(businessComps, k * 4)); contract(pick(businessComps, k * 4 + 2), pt); });
  });
  step('runtime', () => {
    const env = run(applyRuntimeCommand, 'runtime.environment', {title: 'Production', stage: 'Production design', purpose: 'Runs the synthetic platform.', owner: 'Run team', basis: 'Synthetic.', confirmed: false, assetIds: comps});
    const zones = ['Zone A', 'Zone B'].map((title, k) => run(applyRuntimeCommand, 'runtime.zone', {environmentId: env, title, owner: 'Run team', failureDomain: 'Region ' + (k + 1), isolation: 'Own cluster.'}));
    p.runtime.plans.filter(r => r.environmentId === env).forEach((plan, k, all) => run(applyRuntimeCommand, 'runtime.placement', {planId: plan.id, zoneId: k >= all.length - 6 ? zones[1] : zones[0], role: 'active', replicas: 2, basis: 'Peak plus one.', confirmed: false}));
  });
  const document = withFinalReview(p);
  return {document, counts: {...figuresCounts(document), modules: T.modules.length, platform: units.filter(u => u.platform).length}, ms: Date.now() - started};
}

// Round 24 (D-24-07): a register organised into `modules` modules and nothing designed (the module map straight after an
// import): requirements with generic titles, the modules (the last `platform` of them platform modules) holding them in
// sizes from large to small, every other business module split into `subs` sub-modules, actors and external systems of
// several kinds. Built through the chapters' commands (requirements.group of kind module and sub-module).
export async function buildModuleRegister({modules = 25, platform = 5, subs = 4, requirements = 600, actors = 4, parties = 8, name = 'Synthetic module register'} = {}) {
  const at = FIGURES_AT, {PARTY_KINDS} = await import('./public/interfaces-domain.js');
  let p = createProject({name, template: 'blank'}, 'figures-modules', at);
  const run = (apply, type, payload, actor) => { const r = apply(handOver(p), {type, payload}, at, ...(actor ? [actor] : [])); p = r.document; return r.selected; };
  const pick = (xs, i) => xs[((i % xs.length) + xs.length) % xs.length];
  for (let i = 0; i < actors; i++) run(applyCommand, 'artefact', {type: 'actor', title: 'Role ' + n2(i + 1) + ' · ' + pick(AREAS, i * 5) + ' desk', description: 'A synthetic role.', confirmed: false});
  const reqs = Array.from({length: requirements}, (_, i) => run(applyCommand, 'artefact', {type: 'requirement', title: `Requirement ${n4(i + 1)}: ${pick(ACTIONS, i)} ${pick(OBJECTS, i * 7)}`, description: `The platform shall meet synthetic requirement ${i + 1}.`, priority: ['Must', 'Should', 'Could'][i % 3], owner: 'Area owner ' + (i % 9 + 1), source: 'Synthetic register row ' + (i + 1), confirmed: false}));
  const sizes = groupSizes(requirements, modules); let from = 0;
  sizes.forEach((size, m) => {
    const ids = reqs.slice(from, from + size), isPlatform = m >= modules - platform; from += size;
    run(applyRequirementsCommand, 'requirements.group', {title: `Module ${n2(m + 1)} · ${pick(AREAS, m)}${m >= AREAS.length ? ' ' + (Math.floor(m / AREAS.length) + 1) : ''}`, kind: 'module', role: isPlatform ? 'platform' : 'business', description: `Synthetic module ${m + 1}.`, owner: '', memberIds: ids, rule: []}, 'architect-a');
    const moduleId = p.requirementGroups.records.at(-1).id;
    if (!isPlatform && m % 2 === 0 && size >= subs * 2) for (let s = 0; s < subs; s++) run(applyRequirementsCommand, 'requirements.group', {title: `${pick(ACTIONS, m + s)} work ${n2(s + 1)}`, kind: 'sub-module', parentId: moduleId, description: `Sub-module ${s + 1} of module ${m + 1}.`, owner: '', memberIds: ids.filter((_, j) => j % subs === s), rule: []}, 'architect-a');
  });
  for (let k = 0; k < parties; k++) run(applyInterfacesCommand, 'interfaces.party', {title: 'External system ' + n2(k + 1), purpose: 'A synthetic external system.', owner: 'Partner ' + (k + 1), ...(k % 4 === 3 ? {} : {kind: pick(PARTY_KINDS, k)}), confirmed: false});
  return {document: withFinalReview(p)};
}

// What the built project holds, by the measures the suites assert.
export function figuresCounts(p) {
  const reqs = (p.artefacts || []).filter(a => a.type === 'requirement');
  return {requirements: reqs.length, groups: (p.requirementGroups?.records || []).length, modules: (p.logical?.groups || []).length, responsibilities: (p.logical?.responsibilities || []).length, components: (p.realisation?.components || []).length, contracts: (p.interfaces?.contracts || []).length, data: (p.interfaces?.data || []).length, parties: (p.interfaces?.parties || []).length, placements: (p.runtime?.placements || []).length, zones: (p.runtime?.zones || []).length};
}

const here = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (here) {
  const arg = (flag, fallback) => { const i = process.argv.indexOf(flag); return i > 0 ? process.argv[i + 1] : fallback; };
  const built = await buildFiguresProject({log: m => console.error(m)});
  const out = arg('--out', null);
  if (out) (await import('node:fs')).writeFileSync(out, JSON.stringify(built.document));
  console.log(JSON.stringify({counts: built.counts, timings: built.timings, ms: built.ms, bytes: JSON.stringify(built.document).length, out}));
}
