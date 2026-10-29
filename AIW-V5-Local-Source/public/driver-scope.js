// The positive links that make a driver relevant to a design boundary, read from the
// canonical project. Explicit component links add to inherited links; they never
// silently remove a responsibility's obligations. This is a projection, not a store.
import {linkedRequirementIds} from './requirement-links.js';
import {remember} from './document-memo.js';

const list = x => Array.isArray(x) ? x : [];
const unique = xs => [...new Set(xs)];
const index = xs => new Map(xs.map(x => [x.id, x]));
const add = (map, key, value) => { let xs = map.get(key); if (!xs) map.set(key, xs = new Set()); xs.add(value); };

export function driverScopeIndex(p) {
  return remember(p, 'driver-scope', 'index', () => build(p));
}

function build(p) {
  const drivers = list(p?.quality?.drivers), responsibilities = list(p?.logical?.responsibilities), components = list(p?.realisation?.components);
  const dr = index(drivers), rr = index(responsibilities), cc = index(components), decisions = index(list(p?.decisions?.records));
  const requirements = index(list(p?.artefacts).filter(a => a.type === 'requirement'));
  const byRequirement = new Map(), byResponsibility = new Map(), scopes = new Map();
  const recordRequirements = new Map([...responsibilities, ...components].map(r => [r.id, linkedRequirementIds(p, r)]));
  for (const m of list(p?.logical?.mappings)) if (cc.has(m.physicalId) && rr.has(m.logicalId)) recordRequirements.set(m.physicalId, unique([...(recordRequirements.get(m.physicalId) || []), ...(recordRequirements.get(m.logicalId) || [])]));
  for (const d of drivers) {
    const reqs = linkedRequirementIds(p, d), direct = unique(list(d.componentIds)), missing = [];
    for (const id of reqs) if (!requirements.has(id)) missing.push({kind: 'requirement', id});
    for (const id of list(d.responsibilityIds)) if (!rr.has(id)) missing.push({kind: 'responsibility', id});
    for (const id of direct) if (!cc.has(id)) missing.push({kind: 'component', id});
    const scope = {driverId: d.id, requirementIds: reqs, contextRequirementIds: [], responsibilityIds: [], componentIds: [],
      directComponentIds: direct.filter(id => cc.has(id)), inheritedComponentIds: [], paths: [], missing};
    scopes.set(d.id, scope);
    for (const id of reqs) add(byRequirement, id, d.id);
    for (const id of list(d.responsibilityIds)) if (rr.has(id)) add(byResponsibility, id, d.id);
    for (const id of scope.directComponentIds) scope.paths.push({kind: 'direct-component', from: d.id, to: id});
  }
  // A responsibility already carries drivers through explicit links, shared
  // requirements (including group members), and its named decisions.
  for (const r of responsibilities) {
    const paths = new Map();
    const note = (id, kind, via) => { if (!dr.has(id)) return; add(byResponsibility, r.id, id); let ps = paths.get(id); if (!ps) paths.set(id, ps = []); ps.push({kind, from: id, to: r.id, ...(via ? {via} : {})}); };
    for (const id of byResponsibility.get(r.id) || []) note(id, 'direct-responsibility');
    for (const req of recordRequirements.get(r.id) || []) for (const id of byRequirement.get(req) || []) note(id, 'shared-requirement', req);
    for (const decisionId of list(r.decisionIds)) for (const id of list(decisions.get(decisionId)?.driverIds)) note(id, 'decision', decisionId);
    for (const [id, ps] of paths) { const scope = scopes.get(id); scope.responsibilityIds.push(r.id); scope.paths.push(...ps); }
  }
  const inherited = new Map(drivers.map(d => [d.id, new Set()]));
  for (const m of list(p?.logical?.mappings)) {
    if (!cc.has(m.physicalId) || !rr.has(m.logicalId)) continue;
    for (const id of byResponsibility.get(m.logicalId) || []) {
      inherited.get(id).add(m.physicalId);
      scopes.get(id).paths.push({kind: 'responsibility-mapping', from: id, to: m.physicalId, via: m.logicalId});
    }
  }
  // Direct component requirements and decisions are also positive context. They
  // do not invent a responsibility or propagate a component link to its siblings.
  for (const c of components) {
    const note = (id, kind, via) => { if (!dr.has(id)) return; inherited.get(id).add(c.id); scopes.get(id).paths.push({kind, from: id, to: c.id, via}); };
    for (const req of recordRequirements.get(c.id) || []) for (const id of byRequirement.get(req) || []) note(id, 'component-requirement', req);
    for (const decisionId of list(c.decisionIds)) for (const id of list(decisions.get(decisionId)?.driverIds)) note(id, 'component-decision', decisionId);
  }
  const componentDrivers = new Map(), requirementDrivers = new Map();
  for (const d of drivers) {
    const s = scopes.get(d.id), all = new Set([...s.directComponentIds, ...inherited.get(d.id)]);
    s.inheritedComponentIds = components.filter(c => inherited.get(d.id).has(c.id)).map(c => c.id);
    s.componentIds = components.filter(c => all.has(c.id)).map(c => c.id);
    // Context may walk back from an explicitly named component. It must not
    // walk back through an inherited shared component into another requirement:
    // that component carries both drivers, but neither requirement owns the
    // other's intent merely because the implementation is shared.
    s.contextRequirementIds = unique([...s.requirementIds, ...[...s.responsibilityIds, ...s.directComponentIds].flatMap(id => recordRequirements.get(id) || [])]);
    for (const id of s.componentIds) add(componentDrivers, id, d.id);
    for (const id of s.contextRequirementIds) add(requirementDrivers, id, d.id);
  }
  return {drivers, scopes, componentDrivers, requirementDrivers};
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
