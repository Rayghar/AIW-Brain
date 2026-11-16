// The positive links that make a driver relevant to a design boundary, read from the trace kernel's walk over the
// canonical design graph (trace-kernel.js, rc.10.73.42 D7): a driver reaches the responsibilities and components it
// names (constrains), those the requirements it serves name (fulfils), those that name a decision weighing it
// (justifies), and the components its responsibilities are realised by (realizedBy), each path typed by the hop that
// made it. Explicit component links add to inherited links; they never silently remove a responsibility's obligations.
// This is a projection, not a store.
import {linkedRequirementIds} from './requirement-links.js';
import {remember, memoPass} from './document-memo.js';
import {seededTrace, namedBy, namingRequirements, hopsFrom, linkedVia, relationOrder, traceGraph} from './trace-kernel.js';

const list = x => Array.isArray(x) ? x : [];
const unique = xs => [...new Set(xs)];
const index = xs => new Map(xs.map(x => [x.id, x]));
const add = (map, key, value) => { let xs = map.get(key); if (!xs) map.set(key, xs = new Set()); xs.add(value); };

export function driverScopeIndex(p) {
  // One pass (document-memo.js): the kernel's graph is read once for every driver, also on a working copy.
  return remember(p, 'driver-scope', 'index', () => memoPass(p, () => build(p)));
}

// The records a driver's walk starts from: the driver, and the responsibilities and components named by the
// requirements it serves (shared requirements, groups included). The driver chain (design-reasoning.js) walks from the
// same seeds, so its products, plans and controls are those of this scope.
export const driverTraceSeeds = (p, d, graph = null) => seedsOf(p, d, linkedRequirementIds(p, d), graph);
const seedsOf = (p, d, served, graph) => [d.id, ...served.flatMap(r => [...namedBy(p, r, 'responsibility', graph), ...namedBy(p, r, 'component', graph)])];

function build(p) {
  const drivers = list(p?.quality?.drivers), responsibilities = list(p?.logical?.responsibilities), components = list(p?.realisation?.components);
  const rr = index(responsibilities), cc = index(components);
  const requirements = index(list(p?.artefacts).filter(a => a.type === 'requirement'));
  // The driver scope's graph (record-graph.js upto 'component': what its walks read, up to the components), read once
  // for every driver.
  const G = traceGraph(p, 'component');
  // A record's requirements: those that name it, and for a component those that name a responsibility it realises.
  const realisedBy = id => linkedVia(p, id, 'realizedBy', 'in', 'logical.mappings', G);
  const naming = new Map(), namers = id => { let xs = naming.get(id); if (!xs) naming.set(id, xs = namingRequirements(p, id, G)); return xs; };
  const carried = new Map(), recordRequirements = id => { let xs = carried.get(id); if (!xs) carried.set(id, xs = unique([...namers(id), ...(cc.has(id) ? realisedBy(id).flatMap(namers) : [])])); return xs; };
  // The paths, one for each hop that brought a record onto the driver's scope: the components it names, then each
  // responsibility's, then the mappings, then each component's, every list in the order its records state it; with the
  // components it inherits and the requirements that are its context.
  const detail = (d, reqs, T, responsibilityIds, componentIds, directComponentIds, direct) => {
    const order = relationOrder(p, G), served = new Set(reqs), paths = [];
    const byRelation = (id, test) => hopsFrom(T, id, test).sort((a, b) => order.get(a.relation) - order.get(b.relation));
    for (const id of [...directComponentIds].sort((a, b) => order.get(byRelation(a, h => h.from === d.id && h.type === 'constrains')[0].relation) - order.get(byRelation(b, h => h.from === d.id && h.type === 'constrains')[0].relation))) paths.push({kind: 'direct-component', from: d.id, to: id});
    for (const id of responsibilityIds) {
      if (direct(id)) paths.push({kind: 'direct-responsibility', from: d.id, to: id});
      for (const req of namers(id)) if (served.has(req)) paths.push({kind: 'shared-requirement', from: d.id, to: id, via: req});
      for (const h of byRelation(id, h => h.type === 'justifies')) paths.push({kind: 'decision', from: d.id, to: id, via: h.from});
    }
    const inherited = new Set();
    for (const [id, h] of componentIds.flatMap(id => hopsFrom(T, id, h => h.type === 'realizedBy').map(h => [id, h])).sort((a, b) => order.get(a[1].relation) - order.get(b[1].relation))) { inherited.add(id); paths.push({kind: 'responsibility-mapping', from: d.id, to: id, via: h.from}); }
    for (const id of componentIds) {
      for (const req of recordRequirements(id)) if (served.has(req)) { inherited.add(id); paths.push({kind: 'component-requirement', from: d.id, to: id, via: req}); }
      for (const h of byRelation(id, h => h.type === 'justifies')) { inherited.add(id); paths.push({kind: 'component-decision', from: d.id, to: id, via: h.from}); }
    }
    // Context may walk back from an explicitly named component. It must not
    // walk back through an inherited shared component into another requirement:
    // that component carries both drivers, but neither requirement owns the
    // other's intent merely because the implementation is shared.
    return {paths, inheritedComponentIds: componentIds.filter(id => inherited.has(id)), contextRequirementIds: unique([...reqs, ...[...responsibilityIds, ...directComponentIds].flatMap(recordRequirements)])};
  };
  const scopes = new Map();
  for (const d of drivers) {
    const reqs = linkedRequirementIds(p, d), missing = [];
    for (const id of reqs) if (!requirements.has(id)) missing.push({kind: 'requirement', id});
    for (const id of list(d.responsibilityIds)) if (!rr.has(id)) missing.push({kind: 'responsibility', id});
    for (const id of unique(list(d.componentIds))) if (!cc.has(id)) missing.push({kind: 'component', id});
    const T = seededTrace(p, seedsOf(p, d, reqs, G), {until: 'component', graph: G});
    const responsibilityIds = T.layers.responsibility.filter(id => rr.has(id)), componentIds = T.layers.component.filter(id => cc.has(id));
    const direct = id => hopsFrom(T, id, h => h.from === d.id && h.type === 'constrains').length > 0, directComponentIds = componentIds.filter(direct);
    // The paths, the inherited components and the context are worked out when first read, once: a command that asks
    // which drivers bear on a component (realisation-domain.js componentSources) reads only the scopes' records.
    let more = null;
    const read = () => more ??= detail(d, reqs, T, responsibilityIds, componentIds, directComponentIds, direct);
    scopes.set(d.id, {driverId: d.id, requirementIds: reqs, get contextRequirementIds() { return read().contextRequirementIds; }, responsibilityIds, componentIds,
      directComponentIds, get inheritedComponentIds() { return read().inheritedComponentIds; }, get paths() { return read().paths; }, missing});
  }
  const componentDrivers = new Map();
  for (const s of scopes.values()) for (const id of s.componentIds) add(componentDrivers, id, s.driverId);
  let requirementDrivers = null;
  return {drivers, scopes, componentDrivers, get requirementDrivers() {
    if (!requirementDrivers) { requirementDrivers = new Map(); for (const s of scopes.values()) for (const id of s.contextRequirementIds) add(requirementDrivers, id, s.driverId); }
    return requirementDrivers;
  }};
}

export function driverScope(p, driverOrId, scopes = driverScopeIndex(p)) {
  const id = typeof driverOrId === 'string' ? driverOrId : driverOrId?.id;
  return scopes.scopes.get(id) || {driverId: id || '', requirementIds: [], contextRequirementIds: [], responsibilityIds: [], componentIds: [], directComponentIds: [], inheritedComponentIds: [], paths: [], missing: id ? [{kind: 'driver', id}] : []};
}

export function driversForComponent(p, componentId) {
  const x = driverScopeIndex(p), ids = x.componentDrivers.get(componentId) || new Set();
  return x.drivers.filter(d => ids.has(d.id));
}

export function driversForRequirement(p, requirementId) {
  const x = driverScopeIndex(p), ids = x.requirementDrivers.get(requirementId) || new Set();
  return x.drivers.filter(d => ids.has(d.id));
}

// A task's saved context identifies the boundaries to inspect, not the drivers
// they still carry. Resolve membership from today's canonical positive links.
export function driverForTask(p, task) {
  const x = driverScopeIndex(p), driver = x.drivers.find(d => d.id === task?.driverId);
  if (!driver) return null;
  if (x.requirementDrivers.get(task.requirementId)?.has(driver.id)) return driver;
  const contexts = unique([...list(task.basis?.contextIds), ...Object.entries(task.answers || {})
    .filter(([key, value]) => key.endsWith('Id') && typeof value === 'string').map(([, value]) => value)]);
  return contexts.some(id => x.componentDrivers.get(id)?.has(driver.id)) ? driver : null;
}
