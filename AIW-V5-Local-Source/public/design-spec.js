// Design specification and anti-patterns — read from the recorded design across chapters.
//
// specFor: one part's specification, whatever chapter it is selected in — the responsibility it
// answers for (Ch 4), the component (Ch 5), the platform capabilities it stands on (Ch 6), the
// products that realise them with version, vendor and operating model (Ch 7), and where and how it
// runs (Ch 10), with the drivers it carries, the decisions behind it and what is still missing.
// detectAntiPatterns: failure boundaries found in recorded facts, each named as the pattern
// catalogue and the SA Playbook name it, with the objects it concerns. Pure; nothing is changed.
import {reasoningSource, driverChain, planFacts, productOf, productLabel, catalogueRecord, rowsWith, firstWith, rowsAmong, carriersOf} from './design-reasoning.js';
import {ATTRIBUTES, PATTERNS, STYLES, TACTICS} from './playbook-knowledge.js';
import {QUALITY_TYPES, isQualityDriver} from './quality-domain.js';
import {componentContainer} from './realisation-domain.js';
import {mappingRole} from './logical-domain.js';
import {invariantsFor} from './interfaces-domain.js';
import {priorityRank} from './priority-scale.js';
import {dataAuthorities} from './interfaces-domain.js';
import {optionSpecification} from './technology-realisation-domain.js';
import {linkedRequirementIds} from './requirement-links.js';
import {driverScope} from './driver-scope.js';
import {architectureSolutionsFor, architectureObligationsFor} from './architecture-obligations.js';
import {list,str,num,uniq,joinAnd,plural} from './util.js';

const cache = new WeakMap();
// The playbook's own advice on synchronous work, quoted from its scalability entry.
function asyncAdvice() {
  const g = ATTRIBUTES.find(a => a.id === 'scalability')?.guide, i = (g?.decisions || []).findIndex(d => /^Asynchronous Communication/i.test(d));
  return i < 0 ? null : {text: g.decisions[i], src: 'QR-Guidebook!G5 (Scalability · key decisions)'};
}
export function reasoningFor(p) { if (!p || typeof p !== 'object') return reasoningSource(p); if (!cache.has(p)) cache.set(p, reasoningSource(p)); return cache.get(p); }

// ---------------------------------------------------------------- relations

// Each reads its list through the reasoning source's lookups (design-reasoning.js): the records a scan of the list finds.
function componentsOfResponsibility(R, id) { return uniq(rowsWith(R, 'logicalByLogical', id).map(m => m.physicalId)).map(x => R.comps.get(x)).filter(Boolean); }
function responsibilitiesOfComponent(R, id) { return uniq(rowsWith(R, 'logicalByPhysical', id).map(m => m.logicalId)).map(x => R.resp.get(x)).filter(Boolean); }
function capabilitiesOfComponent(R, id) {
  const needs = rowsWith(R, 'needsByApp', id);
  return needs.map(n => { const m = firstWith(R, 'techByNeed', n.id); const c = m ? R.caps.get(m.capabilityId) : null; return c ? {cap: c, need: n} : null; }).filter(Boolean);
}
function componentsOfCapability(R, id) {
  const needIds = new Set(rowsWith(R, 'techByCap', id).map(m => m.needId));
  return uniq(rowsAmong(R, 'needsById', needIds).map(n => n.applicationId)).map(x => R.comps.get(x)).filter(Boolean);
}
function realisationsOfCapability(R, id) { return uniq(rowsWith(R, 'realByCap', id).map(m => m.realizationId)).map(x => R.reals.get(x)).filter(Boolean); }
function capabilitiesOfRealisation(R, id) { return uniq(rowsWith(R, 'realByReal', id).map(m => m.capabilityId)).map(x => R.caps.get(x)).filter(Boolean); }
const plansOf = (R, assetId) => rowsWith(R, 'plansByAsset', assetId).map(r => planFacts(R, r));

// The product a part runs on: a realisation's own product, or a component's compute platform.
export function runsOn(R, assetId) {
  if (R.reals.has(assetId)) { const pr = productOf(R.reals.get(assetId)); return pr?.product ? {label: productLabel(pr), selected: pr.selected, via: null} : null; }
  if (R.comps.has(assetId)) {
    const compute = capabilitiesOfComponent(R, assetId).find(x => x.cap.category === 'compute');
    const r = compute ? realisationsOfCapability(R, compute.cap.id)[0] : null, pr = r ? productOf(r) : null;
    return pr?.product ? {label: productLabel(pr), selected: pr.selected, via: compute.cap.ref} : null;
  }
  return null;
}
// The products a component stands on, one per platform capability.
export function productsOfComponent(R, id) {
  return capabilitiesOfComponent(R, id).map(({cap}) => { const r = realisationsOfCapability(R, cap.id)[0], pr = r ? productOf(r) : null; return {cap, realisation: r, product: pr}; });
}
function driversOfComponents(R, comps) {
  const ids = new Set(comps.map(c => c.id));
  return R.drivers.filter(d => driverChain(R, d.id)?.components.some(c => ids.has(c.id)));
}

// ---------------------------------------------------------------- specification

export function specFor(R, id) {
  if (!R || !id) return null;
  let kind = null, subject = null, comps = [], caps = [], reals = [], plans = [], resps = [];
  if (R.resp.has(id)) { kind = 'responsibility'; subject = R.resp.get(id); resps = [subject]; comps = componentsOfResponsibility(R, id); }
  else if (R.comps.has(id)) { kind = 'component'; subject = R.comps.get(id); comps = [subject]; resps = responsibilitiesOfComponent(R, id); }
  else if (R.caps.has(id)) { kind = 'capability'; subject = R.caps.get(id); caps = [subject]; comps = componentsOfCapability(R, id); reals = realisationsOfCapability(R, id); }
  else if (R.reals.has(id)) { kind = 'realisation'; subject = R.reals.get(id); reals = [subject]; caps = capabilitiesOfRealisation(R, id); comps = uniq(caps.flatMap(c => componentsOfCapability(R, c.id))); }
  else if (R.plans.has(id)) { const pl = R.plans.get(id); const inner = specFor(R, pl.assetId); if (!inner) return null; return {...inner, kind: 'plan', id, ref: pl.ref, title: pl.title, plans: [planFacts(R, pl)], asset: {kind: inner.kind, id: inner.id, ref: inner.ref, title: inner.title}}; }
  else return null;
  if (kind === 'responsibility' || kind === 'component') {
    const rows = comps.flatMap(c => capabilitiesOfComponent(R, c.id));
    caps = uniq(rows.map(r => r.cap));
    reals = uniq(caps.flatMap(c => realisationsOfCapability(R, c.id)));
    plans = comps.flatMap(c => plansOf(R, c.id));
  } else plans = reals.flatMap(r => plansOf(R, r.id));
  if (!resps.length) resps = uniq(comps.flatMap(c => responsibilitiesOfComponent(R, c.id)));
  const products = reals.map(r => {const product=productOf(r);return {realisation:r,product,configuration:product?.option?optionSpecification(product.option):null,capabilities:capabilitiesOfRealisation(R,r.id).filter(c=>caps.includes(c))};});
  const respIds = new Set(resps.map(r => r.id));
  const drivers = kind === 'responsibility'
    ? R.drivers.filter(d => driverScope(R.p, d, R.scopes).responsibilityIds.some(x => respIds.has(x)))
    : driversOfComponents(R, comps);
  const driverIds = new Set(drivers.map(d => d.id)), named = new Set([...comps.flatMap(c => list(c.decisionIds)), ...resps.flatMap(r => list(r.decisionIds))]);
  const decisions = R.decisions.filter(d => list(d.driverIds).some(x => driverIds.has(x)) || named.has(d.id));
  const gaps = [];
  for (const x of products) {
    if (!x.product?.product) gaps.push(`${x.realisation.ref} names no product`);
    else if (!x.product.version || !x.product.vendor) gaps.push(`${x.product.product} (${x.realisation.ref}) has no ${!x.product.version && !x.product.vendor ? 'version or vendor' : !x.product.version ? 'version' : 'vendor'}`);
    if (x.product?.product && !x.product.selected) gaps.push(`${x.product.product} is a candidate, not yet the chosen option`);
    if (x.product?.selected && x.configuration) {const s=x.configuration,missing=[['serviceTier','service tier'],['topology','topology'],['replicaCount','instance count'],['failureDomains','failure domains'],['workloadProfile','workload profile'],['specEvidence','configuration basis']].filter(([f])=>s[f]===''||s[f]==null).map(([,label])=>label);if(missing.length)gaps.push(`${x.realisation.ref} proposed configuration needs ${missing.join(', ')}`);}
    if (str(x.realisation.capacityValue) === '') gaps.push(`${x.realisation.ref} records no capacity`);
  }
  for (const f of plans) {
    // A placement whose copies are not stated counts as nothing, never as one (round 12, DM-08): it is said.
    if (!f.placements.length) gaps.push(`${f.plan.ref} is not placed`);
    else if (f.open) gaps.push(`${f.plan.ref}: copies not stated for ${plural(f.open, 'placement', 'placements')}`);
    else if (f.active < 2 && !f.standby) gaps.push(`${f.plan.ref} runs one replica with no standby`);
    if (f.recoveryMinutes == null && f.placements.length) gaps.push(`${f.plan.ref} records no recovery time`);
    if (f.stateMode === 'Unspecified') gaps.push(`${f.plan.ref} does not say whether it holds state`);
  }
  if (kind !== 'capability' && kind !== 'realisation' && !comps.length) gaps.push('No component realises it yet');
  return {kind, id, ref: subject.ref || subject.id, title: subject.title, responsibilities: resps, components: comps, capabilities: caps, products, plans, drivers, decisions, gaps: uniq(gaps)};
}

// ---------------------------------------------------------------- the component specification (round 11)
// Everything the design records about one component, read from the links the records already hold: nothing is
// stored twice, the specification is the record. Each entry says the chapter it comes from and keeps the record, so a
// reader, a document and the Chapter 5 Specification view lead back to it. `gaps` names what the specification of
// this component still lacks, on top of specFor's. A contract's two ends are components, realisations or parties: for
// a request or a batch the provider is `to`; for an event the producer is `from` (interfaces-domain.js).
const PROMISE = ['protocol', 'operation', 'contractVersion', 'timeoutMs', 'timeoutPolicy', 'retryPolicy', 'failurePolicy', 'duplicatePolicy', 'idempotencyKey', 'correlationKey', 'authorization', 'transport', 'compatibility'];
// What a component specification reads of the whole design, indexed once per reasoning source (round 12: at 500
// components each specification scanned every contract, data definition, threat, control and connection, and asked
// every data definition its authorities). Each list keeps its register's order, and a record is listed once per id.
const specIndexes = new WeakMap();
function specIndex(R) {
  let X = specIndexes.get(R); if (X) return X;
  const p = R.p, by = () => new Map(), add = (m, key, x) => { let xs = m.get(key); if (!xs) m.set(key, xs = []); if (xs.at(-1) !== x) xs.push(x); };
  // Data by id: Chapter 8's definitions, and the data records Chapter 8 seeds them from while it is not opened yet.
  const data = new Map([...list(p?.logical?.assets).filter(n => n.layer === 'data').map(n => [n.id, {id: n.id, ref: n.ref || n.id, title: n.title, purpose: n.description}]), ...list(p?.interfaces?.data).map(d => [d.id, d])]);
  const contractsByEnd = by(), ownedBy = by(), authored = new Set(), threatsBy = by(), controlsBy = by(), connectionsBy = by();
  for (const k of R.contracts) { add(contractsByEnd, k.from, k); add(contractsByEnd, k.to, k); }
  for (const d of list(p?.interfaces?.data)) { const as = dataAuthorities(p, d); if (as.length) authored.add(d.id); for (const a of as) add(ownedBy, a.id, d); }
  for (const t of list(p?.security?.threats)) for (const x of list(t.targetIds)) add(threatsBy, x, t);
  for (const k of R.controls) for (const x of list(k.targetIds)) add(controlsBy, x, k);
  for (const k of R.connections) { add(connectionsBy, k.from, k); add(connectionsBy, k.to, k); }
  X = {data, parties: new Map(list(p?.interfaces?.parties).map(x => [x.id, x])), contracts: new Map(R.contracts.map(k => [k.id, k])), contractsByEnd, ownedBy, authored, threatsBy, controlsBy, connectionsBy};
  specIndexes.set(R, X); return X;
}
export function componentSpec(R, id) {
  if (!R || !id || !R.comps.has(id)) return null;
  const c = R.comps.get(id), S = specFor(R, id), p = R.p, X = specIndex(R), {data, parties, contracts} = X, mine = X.contractsByEnd.get(id) || [];
  // An interaction's other end: a component, a product, an outside party, or, for the trace interactions Chapter 5 keeps
  // to the platform, a capability, a contract, a zone or a runtime plan, each with the chapter that records it.
  const endOf = x => (R.comps.has(x) ? {kind: 'component', chapter: 5, record: R.comps.get(x)} : R.reals.has(x) ? {kind: 'realisation', chapter: 7, record: R.reals.get(x)} : parties.has(x) ? {kind: 'party', chapter: 8, record: parties.get(x)}
    : R.caps.has(x) ? {kind: 'capability', chapter: 6, record: R.caps.get(x)} : contracts.has(x) ? {kind: 'contract', chapter: 8, record: contracts.get(x)} : R.zones.has(x) ? {kind: 'zone', chapter: 10, record: R.zones.get(x)} : R.plans.has(x) ? {kind: 'plan', chapter: 10, record: R.plans.get(x)} : {kind: 'unknown', chapter: 8, record: {id: x, ref: x, title: x}});
  const promises = k => Object.fromEntries(PROMISE.map(f => [f, f === 'timeoutMs' ? num(k[f]) : (str(k[f]) || null)]).filter(([, v]) => v !== null && v !== ''));
  // A provided event is published by from and consumed by to. Request and batch
  // agreements keep the receiver as provider. These semantic roles are shared by
  // the native dossier and its document/JSON exports.
  const face = k => ({contract: k, kind: str(k.kind) || 'request', provider: endOf(k.kind === 'event' ? k.from : k.to), consumer: endOf(k.kind === 'event' ? k.to : k.from), promises: promises(k), exchanges: list(k.exchanges).map(x => ({role: x.role, data: data.get(x.dataId) || null, dataId: x.dataId}))});
  const provides = mine.filter(k => (str(k.kind) === 'event' ? k.from === id : k.to === id)).map(face);
  const uses = mine.filter(k => (str(k.kind) === 'event' ? k.to === id : k.from === id)).map(face);
  const dataOf = ids => uniq(list(ids)).map(x => data.get(x) || null).filter(Boolean);
  // Round 12 (GR-CMP-07): a component owns the data definitions that name it as their authority (Chapter 8,
  // interfaces-domain.js dataAuthorities), and the data its own list names only where no authority is recorded yet (a
  // data record Chapter 8 has not opened). It consumes and produces what its contracts exchange: a caller produces a
  // request and consumes the response, a provider the reverse; an event's publisher produces it and its receiver
  // consumes it. The lists a component declares itself are read beside them.
  const authorities = X.ownedBy.get(id) || [], authored = X.authored;
  const owned = uniq([...authorities, ...dataOf(c.dataIds).filter(d => !authored.has(d.id))]);
  const flows = {consumed: [], produced: []};
  for (const k of mine) for (const x of list(k.exchanges)) {
    if (k.from === id) flows[x.role === 'response' ? 'consumed' : 'produced'].push(x.dataId);
    if (k.to === id) flows[x.role === 'response' ? 'produced' : 'consumed'].push(x.dataId);
  }
  const consumed = dataOf([...flows.consumed, ...list(c.consumesDataIds)]), produced = dataOf([...flows.produced, ...list(c.producesDataIds)]);
  const threats = X.threatsBy.get(id) || [], controls = X.controlsBy.get(id) || [];
  const needs = rowsWith(R, 'needsByApp', id).map(n => { const m = firstWith(R, 'techByNeed', n.id); return {need: n, capability: m ? R.caps.get(m.capabilityId) || null : null}; });
  const interactions = (X.connectionsBy.get(id) || []).map(k => ({interaction: k, other: endOf(k.from === id ? k.to : k.from), direction: k.from === id ? 'out' : 'in'}));
  const gaps = S.gaps.slice();
  if (!provides.length && !uses.length) gaps.push('No interface contract names it (Chapter 8)');
  if (!owned.length && !consumed.length && !produced.length) gaps.push('No data definition is owned, consumed or produced by it (Chapter 8)');
  else if (!consumed.length && !produced.length && (str(c.inputs) || str(c.outputs))) gaps.push('Its inputs and outputs are prose: no data definition is linked');
  if (threats.length && !controls.length) gaps.push(`${plural(threats.length, 'threat targets', 'threats target')} it and no control protects it (Chapter 9)`);
  if (needs.some(n => !n.capability)) gaps.push(`${plural(needs.filter(n => !n.capability).length, 'technology need has', 'technology needs have')} no supporting capability (Chapter 6)`);
  // Round 12 (SDD-SPEC §4, DM-13, DM-14): the columns of the component specification table. Realised responsibilities
  // come first (an allocation that only supports one says so); technologies are the products of the capabilities it
  // needs; interfaces are the operations of the contracts it provides; dependencies are its outgoing interactions; its
  // drivers are named by their codes; its properties, solution, patterns and container are its own fields (the container
  // derived from its compute need when no one chose it).
  const roles = new Map(rowsWith(R, 'logicalByPhysical', id).map(m => [m.logicalId, mappingRole(m)]));
  const realised = S.responsibilities.map(r => ({responsibility: r, role: roles.get(r.id) || ''})).sort((a, b) => (a.role === 'realises' ? 0 : 1) - (b.role === 'realises' ? 0 : 1));
  const technologies = productsOfComponent(R, id).map(x => ({capability: x.cap, realisation: x.realisation || null, product: x.product?.product ? productLabel(x.product) : null, selected: !!x.product?.selected}));
  const interfaces = provides.map(f => ({contract: f.contract, ref: f.contract.ref || f.contract.id, operation: str(f.contract.operation) || null, payloads: f.exchanges.map(x => x.data?.title || x.dataId).filter(Boolean)}));
  const dependencies = interactions.filter(x => x.direction === 'out').map(x => ({interaction: x.interaction, other: x.other, type: str(x.interaction.interaction) || null}));
  const named = new Map([...PATTERNS, ...STYLES, ...TACTICS].map(x => [x.id, x.name])), concern = k => QUALITY_TYPES.find(t => t.id === k)?.name || R.drivers.find(d => d.id === k)?.code || k;
  // Round 12 (GR-CMP-08): its requirements, those of the responsibilities it realises (and those it names itself), apart
  // from those of the responsibilities it only supports.
  const realisedIds = new Set(), supportedIds = new Set(), inScope = new Set(list(p?.artefacts).filter(a => a.type === 'requirement' && a.scopeMode !== 'out').map(a => a.id));
  for (const m of rowsWith(R, 'logicalByPhysical', id)) { const r = R.resp.get(m.logicalId); if (!r) continue; for (const x of linkedRequirementIds(p, r)) if (inScope.has(x)) (mappingRole(m) === 'supports' ? supportedIds : realisedIds).add(x); }
  for (const x of linkedRequirementIds(p, c)) if (inScope.has(x)) realisedIds.add(x);
  return {kind: 'component', id, ref: c.ref || c.id, title: c.title, component: c, purpose: str(c.purpose), boundary: str(c.boundary), owner: str(c.owner), status: str(c.status),
    responsibilities: S.responsibilities, interactions, provides, uses, data: {owned, consumed, produced}, drivers: S.drivers, needs, capabilities: S.capabilities, products: S.products,
    threats, controls, plans: S.plans, decisions: S.decisions, gaps: uniq(gaps),
    realised, technologies, interfaces, dependencies, driverCodes: S.drivers.map(d => d.code || d.id),
    requirements: {realises: [...realisedIds], supports: [...supportedIds].filter(x => !realisedIds.has(x))},
    properties: list(c.properties).map(x => ({...x, concernName: concern(x.concern)})), architecturalSolution: str(c.architecturalSolution), patterns: list(c.patternIds).map(x => ({id: x, name: named.get(x) || x})),
    architectureSolutions: architectureSolutionsFor(p, id), architectureObligations: architectureObligationsFor(p, id),
    container: componentContainer(p, c),
    // Round 12 (GR-DAT-07): the invariants that bind the data it is the authority of and the contracts it calls or provides.
    invariants: invariantsFor(p, id)};
}

// ---------------------------------------------------------------- quality-driver interactions (round 12, SDD-SPEC §4)
// For each quality driver, High first, then Medium, Low and not stated: how each component that bears on it supports it,
// one entry per component that has something to say: its properties for the driver or its quality concern, the
// controls on it, its runtime plans and the capabilities it stands on. Pure: read from the records; nothing is changed.
//   qualityDriverInteractions(p) -> [{driver, components: [{component, properties, controls, plans, capabilities}]}]
export function qualityDriverInteractions(p) {
  const R = reasoningFor(p);
  if (!R) return [];
  const drivers = R.drivers.filter(isQualityDriver).map((d, i) => [d, i]).sort(([a, i], [b, j]) => priorityRank('driver', a.priority) - priorityRank('driver', b.priority) || i - j).map(([d]) => d);
  return drivers.map(d => {
    const chain = driverChain(R, d.id), components = (chain?.components || []).map(c => {
      const S = specFor(R, c.id);
      return {component: c, properties: list(c.properties).filter(x => x.concern === d.id || x.concern === d.category), controls: R.controls.filter(k => list(k.targetIds).includes(c.id)), plans: S?.plans || [], capabilities: S?.capabilities || []};
    }).filter(x => x.properties.length || x.controls.length || x.plans.length || x.capabilities.length);
    return {driver: d, components};
  });
}

// ---------------------------------------------------------------- anti-patterns

// The reasoning source reads every driver's priority as High, Medium or Low (round 12, D-02).
const CRIT = new Set(['High', 'Medium']);
const AP = (catalogueId, extra) => ({catalogueId, name: catalogueRecord(catalogueId)?.name || catalogueId, ...extra});

// Longest chain of synchronous calls between components, as recorded in Chapter 5.
function syncChains(R) {
  const sync = R.connections.filter(c => c.interaction === 'sync' && R.comps.has(c.from) && R.comps.has(c.to));
  const out = new Map(); for (const c of sync) { if (!out.has(c.from)) out.set(c.from, []); out.get(c.from).push(c.to); }
  const reached = new Set(sync.map(c => c.to)), starts = [...R.comps.keys()].filter(id => out.has(id) && !reached.has(id));
  let best = [];
  const walk = (path) => { const nx = (out.get(path.at(-1)) || []).filter(n => !path.includes(n)); if (!nx.length) { if (path.length > best.length) best = path; return; } for (const n of nx) walk([...path, n]); };
  for (const s of (starts.length ? starts : [...out.keys()])) walk([s]);
  return best;
}

export function detectAntiPatterns(R) {
  const found = [];
  // The drivers whose chain reaches a plan, in driver order (worked out once for every plan: carriersOf).
  const carried = f => (carriersOf(R).plans.get(f.plan.id) || []).slice();
  // Single point of failure: a placed part carrying a High or Medium driver, one replica, no standby. A plan with a
  // placement whose copies are not stated is not judged (round 12, DM-08: those copies count as nothing, never as one);
  // it is named as one whose copies are not stated.
  const fewer = [...R.plans.values()].map(r => planFacts(R, r)).filter(f => f.placements.length && f.active < 2 && !f.standby).map(f => ({f, ds: carried(f).filter(d => CRIT.has(d.priority))})).filter(x => x.ds.length);
  const spof = fewer.filter(x => !x.f.open), unstated = fewer.filter(x => x.f.open);
  if (spof.length) found.push(AP('ANTI-SINGLE-POINT-OF-FAILURE', {id: 'spof', chapter: 10, severity: 'risk', objects: spof.map(x => ({id: x.f.plan.id, ref: x.f.plan.ref, title: x.f.plan.title, chapter: 10})),
    text: `${joinAnd(spof.map(x => x.f.plan.ref + ' ' + x.f.plan.title))} ${spof.length === 1 ? 'runs' : 'each run'} as one replica with no standby, yet carr${spof.length === 1 ? 'ies' : 'y'} ${joinAnd(uniq(spof.flatMap(x => x.ds.map(d => d.id))).sort())}.${unstated.length ? ` ${joinAnd(unstated.map(x => x.f.plan.ref))} ${unstated.length === 1 ? 'is' : 'are'} not judged: copies not stated.` : ''}`,
    ask: 'Which of them can stop without stopping the service, and which need redundancy?', playbook: {text: 'Risk of single points of failure, unexpected failures, human error, and challenges in maintaining availability during updates.', src: 'QR-Guidebook!J7'}}));
  // Synchronous chain: three or more synchronous calls in a row.
  const chain = syncChains(R);
  if (chain.length >= 4) {
    const comps = chain.map(id => R.comps.get(id)), perf = R.drivers.filter(d => d.attr === 'performance' || d.attr === 'availability');
    found.push(AP('ANTI-SYNCHRONOUS-CHAIN', {id: 'sync-chain', chapter: 5, severity: 'risk', objects: comps.map(c => ({id: c.id, ref: c.ref, title: c.title, chapter: 5})),
      text: `${comps.map(c => c.ref + ' ' + c.title).join(' → ')}: ${chain.length - 1} synchronous calls in a row. Each waits on the next, so one slow or failed part holds up the whole request${perf.length ? ` — ${joinAnd(perf.map(d => d.id))} ${perf.length === 1 ? 'depends' : 'depend'} on it` : ''}.`,
      ask: 'Which of these calls could hand work on asynchronously instead?', playbook: asyncAdvice()}));
  }
  // Missing idempotency: requests that carry a financial-integrity driver with no idempotency key or duplicate policy.
  const integ = R.drivers.filter(d => d.attr === 'integrity');
  const integComps = new Set(integ.flatMap(d => driverChain(R, d.id)?.components.map(c => c.id) || []));
  const exposed = R.contracts.filter(c => (c.kind === 'request' || !c.kind) && (integComps.has(c.from) || integComps.has(c.to)) && !str(c.idempotencyKey) && !str(c.duplicatePolicy));
  if (exposed.length && integ.length) found.push(AP('ANTI-MISSING-IDEMPOTENCY', {id: 'idempotency', chapter: 8, severity: 'risk', objects: exposed.map(c => ({id: c.id, ref: c.ref, title: c.title, chapter: 8})),
    text: `${plural(exposed.length, 'request', 'requests')} that touch${exposed.length === 1 ? 'es' : ''} what carries ${joinAnd(integ.map(d => d.id + ' ' + d.title))} record${exposed.length === 1 ? 's' : ''} no idempotency key or duplicate policy: ${exposed.map(c => c.ref).join(', ')}. A repeated request could repeat its effect.`,
    ask: 'Which of these can be repeated safely, and how is a repeat recognised?'}));
  // Retry storm: a retry policy with no backoff or limit.
  const storm = R.contracts.filter(c => str(c.retryPolicy) && !/backoff|jitter|limit|max|at most|budget/i.test(c.retryPolicy));
  if (storm.length) found.push(AP('ANTI-RETRY-STORM', {id: 'retry', chapter: 8, severity: 'risk', objects: storm.map(c => ({id: c.id, ref: c.ref, title: c.title, chapter: 8})), text: `${plural(storm.length, 'retry policy names', 'retry policies name')} no backoff or limit: ${storm.map(c => c.ref).join(', ')}.`, ask: 'What bounds the retries when the callee is already struggling?'}));
  // Shared data: one data record held by more than one component.
  const holders = new Map();
  for (const c of R.comps.values()) for (const d of list(c.dataIds)) { if (!holders.has(d)) holders.set(d, []); holders.get(d).push(c); }
  const shared = [...holders].filter(([, cs]) => cs.length > 1);
  if (shared.length) found.push(AP('ANTI-SHARED-DATABASE-COUPLING', {id: 'shared-data', chapter: 5, severity: 'risk', objects: shared.flatMap(([, cs]) => cs.map(c => ({id: c.id, ref: c.ref, title: c.title, chapter: 5}))), text: shared.map(([d, cs]) => `${d} is held by ${joinAnd(cs.map(c => c.ref + ' ' + c.title))}`).join('; ') + '.', ask: 'Who is the single owner, and how do the others reach it?', playbook: {text: 'Tight coupling between services can make it difficult to modify or update individual services without affecting others.', src: 'anti patterns!B41'}}));
  // God service: one component realising most responsibilities.
  const n = R.resp.size;
  const gods = [...R.comps.values()].filter(c => { const k = responsibilitiesOfComponent(R, c.id).length; return n >= 4 && (k > 3 || k / n > 0.5); });
  if (gods.length) found.push(AP('ANTI-GOD-SERVICE', {id: 'god', chapter: 5, severity: 'risk', objects: gods.map(c => ({id: c.id, ref: c.ref, title: c.title, chapter: 5})), text: `${joinAnd(gods.map(c => c.ref + ' ' + c.title))} realise${gods.length === 1 ? 's' : ''} most of the logical responsibilities.`, ask: 'Which responsibilities belong elsewhere?', playbook: {text: 'Services that have too many responsibilities or handle unrelated functionalities can become complex and difficult to maintain.', src: 'anti patterns!B42'}}));
  // Unbounded queue: a messaging realisation with no capacity bound recorded.
  const msg = [...R.reals.values()].filter(r => capabilitiesOfRealisation(R, r.id).some(c => c.category === 'messaging') && str(r.capacityValue) === '');
  if (msg.length) found.push(AP('ANTI-UNBOUNDED-QUEUE', {id: 'queue', chapter: 7, severity: 'gap', objects: msg.map(r => ({id: r.id, ref: r.ref, title: r.title, chapter: 7})), text: `${joinAnd(msg.map(r => `${r.ref} ${r.title}${productOf(r)?.product ? ' (' + productOf(r).product + ')' : ''}`))} record${msg.length === 1 ? 's' : ''} no capacity: nothing says how much work may wait, or what happens when it is full.`, ask: 'What is the bound, and what does the sender do when it is reached?'}));
  // Observability as an afterthought: parts carrying Critical drivers with no monitoring recorded.
  const blind = [...R.plans.values()].map(r => planFacts(R, r)).filter(f => f.placements.length && !str(f.plan.monitoring) && carried(f).some(d => d.priority === 'High'));
  if (blind.length) found.push(AP('ANTI-OBSERVABILITY-AS-AFTERTHOUGHT', {id: 'observability', chapter: 10, severity: 'gap', objects: blind.map(f => ({id: f.plan.id, ref: f.plan.ref, title: f.plan.title, chapter: 10})), text: `${plural(blind.length, 'running part carries', 'running parts carry')} a high-priority driver with no monitoring recorded: ${blind.map(f => f.plan.ref).join(', ')}.`, ask: 'How would you know it is failing before the customer does?', playbook: {text: 'Heartbeat: Components periodically send "heartbeat" messages to indicate that they are alive and functioning.', src: 'Architectural Tactics!B88:B91'}}));
  return found;
}
export function antiPatternsFor(found, id) { return found.filter(a => a.objects.some(o => o.id === id)); }
export {ATTRIBUTES};
