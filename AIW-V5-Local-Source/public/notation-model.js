// The standard diagrams: every chapter's design drawn in the notation the sponsor's solution
// architecture documents use — typed elements with a kicker (PHYSICAL APPLICATION COMPONENT,
// APPLICATION SERVICE, LOGICAL TECHNOLOGY COMPONENT …), relationships drawn in the line and ends
// of their family (realization dotted with a hollow head, serving solid with an open head, flow
// dashed with a filled head, access dotted with a small head, composition with a diamond …), titled
// groups, and a header strip.
//
// A diagram is a projection of the connected model (architecture-model.js): nothing is drawn that
// the project does not record, and a position is never a model fact. Each scene names the records
// it reads, the words it puts on each edge, and the layer each element belongs to, so the reader
// can strip a diagram to the layers wanted. Directions follow ArchiMate 3.2: the realizer points at
// what it realizes, the server at what it serves, the consumer at what it uses, the whole at its parts.
import {architectureModel, OBJECT_TYPES} from './architecture-model.js';
import {FAMILIES, familyOf} from './platform-model.js';
import {processElements, processTransitions, processGraph} from './process-model.js';
import {KINDS, GROUP_KINDS, STYLES, styleOf, capabilityKind} from './notation-palette.js';
import {list} from './util.js';
import {moduleTree} from './module-model.js';
import {recordModules} from './module-scope.js';
import {PARTY_KINDS} from './interfaces-domain.js';
import {partyGroupTitle} from './figure-budget.js';
import {plateausOf, migrationsOf, PLATEAU_WORDS} from './roadmap-domain.js';

export {KINDS, GROUP_KINDS, STYLES, styleOf};
const text = (v, n = 120) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
// A cut word keeps its full text beside it, so nothing is silently truncated.
const cut = (v, n) => { const full = String(v ?? '').replace(/\s+/g, ' ').trim(); return full.length > n ? full.slice(0, n - 1) + '…' : full; };

export {LAYERS, LAYER_NAMES} from './chapter-names.js';
import {LAYERS} from './chapter-names.js';
import {ICONS, iconFor} from './technology-icons.js';

// The viewpoint catalogue: one scene per picture of the standard, each a projection of the one
// model. `chapters` lists where the scene is offered; `arrangement` is what it opens with;
// `audience` and `purpose` say who the picture is for and what question it answers. `needs` (round 11)
// names the records a picture cannot draw without: while the project holds none, the picture is not in
// a chapter's picker and the chapter that creates them is named instead (instrument-tray.js); a chapter's
// first picture is always offered, since it carries the empty card.
export const SCENES = [
  {id: 'process', chapters: [1], title: 'Process', standard: 'BPMN swimlanes', arrangement: 'lanes', audience: 'Business owners, operations', purpose: 'The journey as a process: who does which step, in which order, with its decisions and events.'},
  {id: 'context', chapters: [1, 5], needs: ['component'], title: 'Context', standard: 'System context (C4 level 1)', arrangement: 'tree', audience: 'Sponsors, integration reviewers', purpose: 'The system, the people who take part in its journey and the external systems it exchanges with.'},
  {id: 'motivation', chapters: [1, 2, 3], title: 'Motivation', standard: 'Motivation view', arrangement: 'tree', audience: 'Sponsors, architects', purpose: 'Actors, outcomes, requirements, quality scenarios and decisions, and what they shape.'},
  {id: 'drivers', chapters: [2], title: 'Quality drivers', standard: 'Architecture requirements', arrangement: 'tree', audience: 'Architects, quality reviewers', purpose: 'The quality scenarios, the requirements they fulfil and the elements they constrain.'},
  {id: 'decisions', chapters: [3], title: 'Decisions', standard: 'Decision record', arrangement: 'tree', audience: 'Design authority', purpose: 'Each decision, the alternatives it considered, the one it selected and what it justifies.'},
  {id: 'rationale', chapters: [3, 11], title: 'Design rationale', standard: 'Architecture decision record', arrangement: 'tree', audience: 'Design authority, reviewers', purpose: 'Requirements, what fulfils them, the decisions that justify the design and the evidence recorded for it.'},
  {id: 'logical', chapters: [4], title: 'Logical application', standard: 'Application architecture (logical)', arrangement: 'grouped', audience: 'Architects, product owners', purpose: 'Responsibilities in their modules and the flows between them.'},
  {id: 'application', chapters: [5], title: 'Application architecture', standard: 'Application architecture', arrangement: 'tree', audience: 'Architects, delivery leads', purpose: 'The application and its components, what they realize, implement and use.'},
  {id: 'container', chapters: [5, 7], needs: ['component'], title: 'Containers', standard: 'Container view (C4 level 2)', arrangement: 'grouped', audience: 'Delivery teams, operations', purpose: 'The deployable parts inside the system with their chosen technology, the stores, and the contracts between them.'},
  {id: 'cooperation', chapters: [8], needs: ['contract'], title: 'Application cooperation', standard: 'Application cooperation view', arrangement: 'orthogonal', audience: 'Integration architects', purpose: 'Components and the services they implement and use, labelled by contract and protocol.'},
  {id: 'solution', chapters: [6], title: 'Solution architecture', standard: 'Solution architecture', arrangement: 'layered', audience: 'Solution and platform architects', purpose: 'The platform capabilities, by family, that serve each component, and their dependencies.'},
  {id: 'stack', chapters: [7], title: 'Technology realization', standard: 'Solution architecture (technology)', arrangement: 'layered', audience: 'Platform architects, procurement', purpose: 'The products that realize each capability, chosen or still open.'},
  {id: 'usage', chapters: [7, 10], needs: ['instance'], title: 'Technology usage', standard: 'Technology usage view', arrangement: 'layered', audience: 'Platform and operations architects', purpose: 'Capability, the product that realizes it, and where that product is placed.'},
  {id: 'integration', chapters: [8], title: 'Integration', standard: 'Channel & vendor integration', arrangement: 'orthogonal', audience: 'Integration architects, vendors', purpose: 'Components, external systems and the application services between them.'},
  {id: 'data', chapters: [8], title: 'Data & authority', standard: 'Database architecture', arrangement: 'radial', audience: 'Data architects, data owners', purpose: 'Data definitions, who owns each, the stores that keep them and the services that carry them.'},
  {id: 'lineage', chapters: [8], title: 'Data lineage', standard: 'Data lineage view', arrangement: 'orthogonal', audience: 'Data architects, compliance', purpose: 'Data definitions, their owners and what is transformed into what.'},
  {id: 'security', chapters: [9], title: 'Security & trust', standard: 'Security architecture', arrangement: 'grouped', audience: 'Security architects, risk', purpose: 'Trust boundaries, the controls and threats on the components, services and data, and which edges cross a boundary.'},
  {id: 'deployment', chapters: [10], title: 'Deployment', standard: 'Channel integration (deployment)', arrangement: 'grouped', audience: 'Operations, infrastructure', purpose: 'Per environment: trust boundaries, zones, the placements in them, what each stands on and the numbered runtime paths.'},
  // Round 6 (Contract T): the messages of a contract or a journey step in order, and the states a data definition moves through.
  {id: 'sequence', chapters: [8, 1], needs: ['contract'], title: 'Sequence', standard: 'Sequence diagram (UML)', arrangement: 'sequence', audience: 'Integration architects, delivery teams', purpose: 'The components, external systems and data each contract touches as lifelines, and its messages in order: request, then response.'},
  {id: 'lifecycle', chapters: [8], needs: ['data:lifecycle'], title: 'Data lifecycle', standard: 'State diagram (UML)', arrangement: 'grouped', audience: 'Data architects, data owners', purpose: 'The states a data definition moves through, and the contract that moves it from one to the next.'},
  // Round 24 (D-24-07): the functional decomposition the requirements are organised by (module-model.js), drawn from the
  // import on, before anything is designed; it opens the SDD's section 5 (sdd-document.js).
  {id: 'module-map', chapters: [1, 11], needs: ['requirement'], title: 'Module map', standard: 'Functional decomposition', arrangement: 'grouped', audience: 'Sponsors, product owners, architects', purpose: 'The modules the requirements fall into: each business module with its sub-modules, the platform modules that serve them, the people who use the system and the external systems by kind, with the links between them.'}
];
// Each chapter opens on its own picture (the first); the shared viewpoints follow in the picker. Round 11: the
// cooperation picture reads Chapter 8 contracts and is offered there alone. Round 24: the module map follows in Chapters 1 and 11.
export const CHAPTER_SCENES = {1: ['process', 'context', 'motivation', 'sequence', 'module-map'], 2: ['drivers', 'motivation'], 3: ['decisions', 'rationale', 'motivation'], 4: ['logical'], 5: ['application', 'context', 'container'], 6: ['solution'], 7: ['stack', 'container', 'usage'], 8: ['integration', 'data', 'lineage', 'cooperation', 'sequence', 'lifecycle'], 9: ['security'], 10: ['deployment', 'usage'], 11: ['rationale', 'module-map']};
export const notationScenes = chapter => (CHAPTER_SCENES[Number(chapter)] || []).map(id => SCENES.find(s => s.id === id)).filter(Boolean);
export const ARRANGEMENTS = [
  {id: 'tree', title: 'Hierarchical', sub: 'top to bottom; cycles share a rank and arrowheads keep recorded direction'},
  {id: 'radial', title: 'Radial', sub: 'bring a shared element and its neighbours together'},
  {id: 'orthogonal', title: 'Orthogonal', sub: 'left to right; cycles share a rank with right-angled routes'},
  {id: 'layered', title: 'Layered', sub: 'separate the viewpoint’s recorded roles into horizontal bands'},
  {id: 'grouped', title: 'Grouped', sub: 'keep elements inside their recorded modules, systems or zones'},
  {id: 'lanes', title: 'Swimlanes', sub: 'separate recorded actors or containers along the flow'},
  {id: 'sequence', title: 'Sequence', sub: 'lifelines as columns, messages in order'}
];

// By layer (round 3, D): one horizontal lane per model layer, in the sidebar's order. It is a reading of the
// picture like the others, offered once a picture spans two layers; it is kept apart from ARRANGEMENTS, the list a
// saved pin command accepts (workbench-domain.js), because pins are never saved for it.
export const BY_LAYER = {id: 'by-layer', title: 'Concern bands', sub: 'separate motivation, core architecture and supporting concerns'};
export const ALL_ARRANGEMENTS = [...ARRANGEMENTS, BY_LAYER];
// Swimlanes need lanes: they are offered only when the picture has containers that hold elements
// (a lane, a pool, a module, a zone), never as a single squashed band.
// The sequence arrangement reads lifelines and messages: it is the sequence picture's only arrangement (columns and rows
// are what a sequence diagram is), and is offered for no other picture.
export const arrangementsFor = D => (D?.nodes?.some(n => n.kind === 'lifeline') ? ALL_ARRANGEMENTS.filter(a => a.id === 'sequence') : ALL_ARRANGEMENTS.filter(a => a.id !== 'sequence' && (a.id !== 'lanes' || !!D?.groups?.some(g => D.nodes.some(n => n.group === g.id))) && (a.id !== 'by-layer' || new Set((D?.nodes || []).map(n => n.layer)).size > 1)));

// An explainable view recommendation, derived only from the visible recorded graph. It selects
// a presentation, not an architecture solution; no group or dependency is inferred from a name.
export function architectureArrangement(D, {selectedId = null} = {}) {
  const nodes = D?.nodes || [], edges = D?.edges || [], offered = new Set(arrangementsFor(D).map(a => a.id));
  const byNode = new Map(nodes.map(n => [n.id, n])), adj = new Map(nodes.map(n => [n.id, new Set()]));
  for (const e of edges) if (e.from !== e.to && adj.has(e.from) && adj.has(e.to)) { adj.get(e.from).add(e.to); adj.get(e.to).add(e.from); }
  const occupied = (D?.groups || []).filter(g => nodes.some(n => n.group === g.id)), layers = new Set(nodes.map(n => n.layer).filter(Boolean));
  const isolatedIds = nodes.filter(n => !adj.get(n.id).size).map(n => n.id).sort();
  const ranked = nodes.slice().sort((a, b) => adj.get(b.id).size - adj.get(a.id).size || a.id.localeCompare(b.id));
  const hub = byNode.get(selectedId) || ranked[0], connected = hub ? adj.get(hub.id).size : 0;
  let id = D?.scene?.arrangement || 'tree', reason = 'Follow the recorded dependencies; positions do not imply missing relationships.', hubId = null;
  if (!nodes.length) { id = 'tree'; reason = 'Add records to this view before arranging them.'; }
  else if (nodes.some(n => n.kind === 'lifeline')) { id = 'sequence'; reason = 'Keep the recorded participants in columns and their messages in sequence.'; }
  else if (D?.scene?.id === 'connected' && offered.has('by-layer')) { id = 'by-layer'; reason = 'Separate motivation, business, application and technology; retain information, security and deployment as distinct concern bands.'; }
  else if (D?.scene?.id === 'process' && offered.has('lanes')) { id = 'lanes'; reason = `Keep ownership visible along the process flow in ${occupied.length} recorded lane${occupied.length === 1 ? '' : 's'}.`; }
  else if (occupied.length && D?.scene?.arrangement === 'grouped') { id = 'grouped'; reason = `Keep elements inside their ${occupied.length} recorded boundar${occupied.length === 1 ? 'y' : 'ies'} and expose connections between them.`; }
  else if (['integration', 'cooperation', 'lineage'].includes(D?.scene?.id)) { id = 'orthogonal'; reason = `Read ${edges.length} recorded interaction${edges.length === 1 ? '' : 's'} from left to right; arrowheads keep their original direction.`; }
  else if (['application', 'motivation', 'drivers', 'rationale', 'solution', 'stack', 'usage'].includes(D?.scene?.id)) { id = 'layered'; reason = D?.scene?.id === 'application' ? 'Separate application responsibilities, their realizing components and exposed services; reveal their recorded relationships in stages.' : 'Separate the viewpoint’s recorded roles so intent, realization and supporting relationships can be followed.'; }
  else if (['data', 'context'].includes(D?.scene?.id) && nodes.length >= 4 && connected >= Math.ceil((nodes.length - 1) * 0.6)) { id = 'radial'; hubId = hub.id; reason = `${hub.title || hub.id} connects to ${connected} of the other ${nodes.length - 1} visible elements; use it as the reading centre.`; }
  else if (occupied.length > 1 && !['motivation', 'drivers', 'decisions', 'rationale'].includes(D?.scene?.id)) { id = 'grouped'; reason = `${occupied.length} recorded boundaries expose ownership and the connections between their elements.`; }
  else if (id === 'radial' || id === 'grouped' && !occupied.length) id = 'tree';
  if (!offered.has(id)) { id = offered.values().next().value || 'tree'; hubId = null; }
  return {id, reason, hub: hubId, counts: {nodes: nodes.length, relationships: edges.length, layers: layers.size, boundaries: occupied.length, isolated: isolatedIds.length}, isolatedIds};
}

// The chapter's connected model (round 3, D): the chapter's own records and every record one relationship away, each
// in its layer. It is what the Layers, Table and Matrix views read; it is not one of the standard's pages, so it is not
// in SCENES (nor in the SDD's figures).
export const CONNECTED = {id: 'connected', chapters: [], title: 'Architecture concerns', standard: 'AIW architecture viewpoint', arrangement: 'by-layer', audience: 'Architects, reviewers', purpose: 'Separate motivation, business, application and technology, with information, security and deployment concerns; explore exact records and their relationships.'};
export const CONNECTED_TYPES = {1: ['requirement', 'journey', 'actor', 'outcome', 'constraint'], 2: ['quality'], 3: ['decision'], 4: ['responsibility'], 5: ['component'], 6: ['capability'], 7: ['technology'], 8: ['contract', 'data', 'party'], 9: ['threat', 'control'], 10: ['runtime', 'instance'], 11: ['requirement', 'responsibility', 'component', 'runtime']};
// The standard kind of a record type, and so its layer; null for what is a container or a note, not an element.
const TYPE_KIND = {requirement: 'requirement', constraint: 'requirement', assumption: 'requirement', context: 'requirement', outcome: 'outcome', actor: 'actor', journey: 'process', task: 'task', gateway: 'gateway', event: 'event', subprocess: 'subprocess', dataObject: 'dataEntity', quality: 'quality', decision: 'decision', alternative: 'alternative', pattern: 'decision', responsibility: 'logicalApp', component: 'physicalApp', party: 'physicalApp', need: 'techService', technology: 'physicalTech', option: 'physicalTech', contract: 'appService', exchange: 'appService', data: 'logicalData', field: 'dataEntity', account: 'dataEntity', control: 'control', threat: 'threat', risk: 'threat', runtime: 'placement', instance: 'placement', evidence: 'evidence', plateau: 'plateau', action: 'workPackage', course: 'courseOfAction'};
export const kindOfType = (type, record = null) => (type === 'capability' ? capabilityKind(record?.category || record?.attributes?.category) : TYPE_KIND[type] || null);
export const layerOfType = (type, record = null) => KINDS[kindOfType(type, record)]?.layer || null;
// A relationship of the connected model drawn in its family: [style kind, reversed?]; the realizer points at what it
// realizes, the server at what it serves, as in every other picture.
const REL_STYLE = {message: ['message', false], accesses: ['accesses', false], transition: ['transition', false], realizedBy: ['realizes', true], implementedBy: ['realizes', true], metBy: ['realizes', true], operatedAs: ['realizes', true], realizesContract: ['realizes', false], fulfils: ['fulfils', false], provides: ['serves', false], supports: ['serves', false], uses: ['uses', false], requires: ['uses', false], hasNeed: ['uses', false], interaction: ['flow', false], sequence: ['sequence', false], owns: ['owns', false], exchanges: ['exchanges', false], transforms: ['transforms', false], partOf: ['aggregates', true], memberOf: ['aggregates', true], placedAs: ['hosts', true], constrains: ['constrains', false], justifies: ['justifies', false], motivatedBy: ['justifies', true], addresses: ['justifies', false], considers: ['considers', false], evidences: ['evidences', false], asserts: ['evidences', false], protects: ['protects', false], enforces: ['protects', false], mitigates: ['mitigates', false], threatens: ['threatens', false]};
export const CONNECTED_LIMIT = 160, CONNECTED_OWN = 110;

// What is wanted of a diagram: the environment (Chapter 10) and the hub (radial) are choices.
// `objectId` (round 6) narrows the sequence picture to one contract or one journey step, and the lifecycle picture to
// one data definition; without it each draws every record it reads. `map` (round 24) is what the module map draws:
// {lines, modules, edges} (MAP; the SDD draws it smaller until it fits a page).
export function notationDiagram(p, sceneId, {environmentId = null, chapter = null, objectId = null, map = null} = {}) {
  const scene = sceneId === CONNECTED.id ? CONNECTED : SCENES.find(s => s.id === sceneId);
  if (!p || !scene) return null;
  const M = architectureModel(p), objs = [...M.objects.values()], rels = M.relationships;
  const O = id => M.objects.get(id);
  const ofType = t => objs.filter(o => o.type === t);
  const relsOf = (t, pred = () => true) => rels.filter(e => e.type === t && pred(e));
  const D = {scene, nodes: [], groups: [], edges: [], notes: [], header: header(p), environmentId: null, icons: ICONS};
  const seenN = new Set(), seenG = new Set(), seenE = new Set(), nodeById = new Map(), groupById = new Map();
  // `glyph` (round 6) is the BPMN mark inside an event or a gateway ({position, eventType} or {gatewayType}); `attachedTo`
  // the task a boundary event hangs on (a hint to the arrangement); `icon` a technology icon the Key lists (D.icons).
  const node = (id, kind, title, {sub = '', group = null, hatched = false, ref = '', record = null, muted = false, sol = null, type = null, glyph = null, attachedTo = null, icon = null} = {}) => {
    if (!id || seenN.has(id)) return nodeById.get(id) || null;
    seenN.add(id);
    const k = KINDS[kind];
    const n = {id, kind, kicker: k.kicker, family: k.family, layer: k.layer, level: k.level, title: cut(title, 80) || id, fullTitle: text(title, 400), sub: cut(sub, 80), ref: text(ref, 24), group, hatched, muted, record, sol, type: type || O(id)?.type || null};
    if (glyph) n.glyph = glyph; if (attachedTo) n.attachedTo = attachedTo; if (icon) n.icon = icon;
    D.nodes.push(n); nodeById.set(id, n); return n;
  };
  const group = (id, kind, title, {sub = '', parent = null} = {}) => {
    if (!id || seenG.has(id)) return groupById.get(id) || null;
    seenG.add(id);
    const g = {id, kind, layer: GROUP_KINDS[kind]?.layer || 'physical', title: cut(title, 60) || id, fullTitle: text(title, 200), sub: cut(sub, 80), parent};
    D.groups.push(g); groupById.set(id, g); return g;
  };
  // An edge carries its kind (the style family), its word, optional ends (none, one, both),
  // a qualifier at the source end (protocol, operation, criticality), a cardinality where the
  // model records one (replicas), `weak` when the record attenuates it (not essential, not
  // selected), `up` when the target stands above the source in a hierarchy, and a crossing mark
  // when it crosses a trust boundary.
  // `self` (round 6) allows a message from a lifeline to itself; `reply` marks a response, drawn dashed.
  // `archimate` (round 6) is the connected model's typing of the relationship drawn ({type, valid, rule}); without it
  // the Key names the kind's own ArchiMate type.
  const edge = (from, to, label, {kind = 'relation', step = null, id = null, ends = 'one', qualifier = '', cardinality = null, weak = false, up = null, record = null, self = false, reply = false, archimate = null} = {}) => {
    if (!from || !to || (from === to && !self) || !seenN.has(from) || !seenN.has(to)) return null;
    const key = id || `${from}>${to}>${label}`;
    if (seenE.has(key)) return null;
    seenE.add(key);
    const st = styleOf(kind);
    // The word and the qualifier are drawn shortened; their full text tells one relationship from another that shortens
    // alike (notation-layout.js lineStyle, sameFact), and the reading says them in full.
    const e = {id: key, from, to, label: cut(label, 40), fullLabel: text(label, 200), kind, family: st.family, step, ends, qualifier: cut(qualifier, 24), fullQualifier: text(qualifier, 200), cardinality, weak, up: up ?? !!st.up, record, crossing: false};
    if (reply) e.reply = true; if (archimate) e.archimate = {type: archimate.type, valid: archimate.valid, rule: archimate.rule};
    D.edges.push(e); return e;
  };
  const moduleOf = new Map(list(p.logical?.responsibilities).map(r => [r.id, r.groupId || null]));
  const realises = new Map(); // component → responsibilities
  for (const e of relsOf('realizedBy')) { if (!realises.has(e.to)) realises.set(e.to, []); realises.get(e.to).push(e.from); }
  const componentModule = id => { const ms = (realises.get(id) || []).map(r => moduleOf.get(r)).filter(Boolean); return ms[0] || null; };
  const capKind = c => capabilityKind(c.attributes?.category);
  const product = t => { const r = t.record || {}, o = list(r.options).find(x => x.id === r.selectedOptionId); return o ? {title: o.product || o.title, sub: [o.version, o.vendor, o.operatingModel].filter(Boolean).join(' · ')} : null; };
  const system = () => node(M.root, 'physicalApp', O(M.root)?.title || p.name, {sub: 'The application as a whole', ref: '', type: 'system'});
  const contractNode = c => {
    const provider = O(c.record?.to), party = provider?.type === 'party';
    if (party) group(provider.id, 'external', provider.title, {sub: 'External system'});
    return node(c.id, 'appService', c.title, {sub: [c.record?.operation, c.record?.protocol].filter(Boolean).join(' · '), ref: c.ref, group: party ? provider.id : null, record: c.record});
  };
  // An external participant is drawn once: as the box of the external system when it provides
  // services (they stand inside it), or as one element when it only calls ours; only a participant
  // that does both has its caller drawn inside its own box.
  const partyNode = (pt, sub) => node('party:' + pt.id, 'physicalApp', pt.title, {sub, group: seenG.has(pt.id) ? pt.id : null, record: pt.record, type: 'party'});
  // The product a component runs on: its needs, met by capabilities, realized by a chosen product.
  const productsOf = compId => { const caps = relsOf('requires', e => e.from === compId).map(e => e.to); return [...new Set(caps.flatMap(c => relsOf('implementedBy', x => x.from === c).map(x => O(x.to)).filter(Boolean)))].map(t => product(t)?.title).filter(Boolean); };

  if (scene.id === 'process') {
    const steps = list(p.artefacts).filter(a => a.type === 'journey'), elements = processElements(p), G = processGraph(p);
    const laneOf = s => text(s.owner || s.actor || 'Journey', 40);
    const partyOf = id => O(id);
    group('pool:' + M.root, 'pool', O(M.root)?.title || p.name, {sub: 'Pool · our process'});
    for (const s of steps) { group('lane:' + laneOf(s), 'lane', laneOf(s), {parent: 'pool:' + M.root}); node(s.id, 'task', s.title, {sub: text(s.description, 60), ref: s.id, group: 'lane:' + laneOf(s), record: s, type: 'journey'}); }
    // An event or gateway stands in the lane of the step it follows or precedes, so one actor is one lane.
    const transitions = processTransitions(p), stepLane = new Map(steps.map(s => [s.id, 'lane:' + laneOf(s)]));
    const near = (id, seen = new Set()) => { if (stepLane.has(id)) return stepLane.get(id); if (seen.has(id)) return null; seen.add(id); for (const t of transitions) { const o = t.from === id ? t.to : t.to === id ? t.from : null; if (o) { const l = near(o, seen); if (l) return l; } } return null; };
    // Round 6 (Contract T): an element in an external participant's pool stands in that pool; a sub-process is a
    // container inside its lane, collapsed into one task-like element with a count when it holds more than twelve; a
    // boundary event hangs on its task; a data object is a data entity its steps access; events and gateways carry
    // their type as a glyph.
    const subs = elements.filter(e => e.kind === 'subprocess'), inside = new Map();
    for (const e of elements) if (e.parentId) { if (!inside.has(e.parentId)) inside.set(e.parentId, []); inside.get(e.parentId).push(e.id); }
    const collapsed = new Set(subs.filter(sp => (inside.get(sp.id) || []).length > SUBPROCESS_OPEN).map(sp => sp.id));
    const hidden = new Set(); const hide = id => { for (const c of inside.get(id) || []) { hidden.add(c); hide(c); } }; for (const id of collapsed) hide(id);
    const placeOf = e => {
      if (e.partyId && partyOf(e.partyId)?.type === 'party') { const pt = partyOf(e.partyId); group('pool:' + pt.id, 'pool', pt.title, {sub: 'Pool · external participant'}); return 'pool:' + pt.id; }
      if (e.parentId && seenG.has('sub:' + e.parentId)) return 'sub:' + e.parentId;
      const lane = near(e.id) || 'lane:' + text(e.lane || 'Process', 40); group(lane, 'lane', lane.slice(5), {parent: 'pool:' + M.root}); return lane;
    };
    const glyphOf = e => (e.kind === 'event' ? {position: G.nodes.get(e.id)?.position || 'intermediate', eventType: G.nodes.get(e.id)?.eventType || 'none'} : e.kind === 'gateway' ? {gatewayType: G.nodes.get(e.id)?.gatewayType || 'exclusive'} : null);
    // Sub-processes first (outer before inner), so their elements find their container.
    const depthOf = e => { let d = 0, up = e; while (up?.parentId) { d++; up = elements.find(x => x.id === up.parentId); } return d; };
    for (const sp of subs.slice().sort((a, b) => depthOf(a) - depthOf(b))) {
      if (hidden.has(sp.id)) continue;
      const place = placeOf(sp), n = (inside.get(sp.id) || []).length;
      if (collapsed.has(sp.id)) node(sp.id, 'subprocess', sp.title, {sub: `Sub-process · ${n} element${n === 1 ? '' : 's'} inside`, ref: sp.id, group: place, record: sp, type: 'subprocess'});
      else group('sub:' + sp.id, 'subprocess', sp.title, {sub: 'Sub-process', parent: place});
    }
    for (const e of elements) {
      if (hidden.has(e.id) || e.kind === 'subprocess') continue;
      if (e.kind === 'account') continue;
      const place = placeOf(e);
      if (e.kind === 'data') { const d = O(e.dataId); node(e.id, 'dataEntity', e.title, {sub: d ? d.title : 'Data object', ref: d?.ref || e.id, group: place, record: e, type: 'dataObject'}); continue; }
      const attachedTo = e.kind === 'event' && e.attachedTo && (seenN.has(e.attachedTo) || elements.some(x => x.id === e.attachedTo)) ? e.attachedTo : null;
      node(e.id, e.kind === 'gateway' ? 'gateway' : e.kind === 'event' ? 'event' : 'task', e.title, {ref: e.id, group: place, record: e, type: e.kind, glyph: glyphOf(e), attachedTo});
    }
    // A flow into or out of a collapsed sub-process's element lands on the sub-process.
    const surface = id => { let x = id; while (hidden.has(x)) x = elements.find(e => e.id === x)?.parentId; return x; };
    for (const t of transitions) {
      const from = surface(t.from), to = surface(t.to); if (from === to) continue;
      const typing = rels.find(e => e.id === t.id)?.archimate || null;
      if (t.kind === 'message') { const c = t.contractId ? O(t.contractId) : null; edge(from, to, c ? c.ref || c.title : t.label || 'message', {kind: 'message', id: t.id, qualifier: text(t.label && c ? t.label : c?.record?.protocol, 24), record: t, archimate: typing}); }
      else edge(from, to, t.label || t.condition || '', {kind: 'sequence', id: t.id, qualifier: t.condition && t.condition !== t.label ? t.condition : '', record: t, archimate: typing});
    }
    // A recorded precedence already drawn as a transition is one flow, not two.
    for (const r of list(p.relationships).filter(r => r.kind === 'precedes')) if (!D.edges.some(e => e.from === r.from && e.to === r.to)) edge(r.from, r.to, '', {kind: 'sequence', id: r.id, archimate: rels.find(e => e.id === r.id)?.archimate || null});
    // A step that an external participant calls into, through a contract, receives a message flow from that participant's pool.
    const stepOfResp = new Map(relsOf('implementedBy', e => O(e.from)?.type === 'journey').map(e => [e.to, e.from]));
    for (const c of ofType('contract')) {
      const caller = O(c.record?.from), provider = O(c.record?.to);
      if (caller?.type !== 'party' || provider?.type !== 'component') continue;
      const step = (realises.get(provider.id) || []).map(r => stepOfResp.get(r)).find(s => s && seenN.has(s));
      if (!step) continue;
      group('pool:' + caller.id, 'pool', caller.title, {sub: 'Pool · external participant'});
      node('party:' + caller.id, 'task', caller.title, {sub: 'Calls ' + (c.ref || c.title), group: 'pool:' + caller.id, record: caller.record, type: 'party'});
      edge('party:' + caller.id, step, c.ref || c.title, {kind: 'message', id: 'msg:' + c.id, qualifier: text(c.record?.protocol, 24), record: c.record});
    }
    // A data object is accessed by the steps whose components own or exchange its data definition.
    const compsOfStep = new Map(); for (const [resp, step] of stepOfResp) for (const [comp, resps] of realises) if (resps.includes(resp)) { if (!compsOfStep.has(step)) compsOfStep.set(step, new Set()); compsOfStep.get(step).add(comp); }
    for (const e of elements.filter(e => e.kind === 'data' && seenN.has(e.id))) {
      const touching = new Set([...relsOf('owns', x => x.to === e.dataId).map(x => x.from), ...relsOf('exchanges', x => x.to === e.dataId).flatMap(x => [O(x.from)?.record?.from, O(x.from)?.record?.to])]);
      for (const [step, comps] of compsOfStep) if (seenN.has(step) && [...comps].some(c => touching.has(c))) edge(step, e.id, 'accesses', {kind: 'accesses', id: 'acc:' + step + ':' + e.id, qualifier: text(O(e.dataId)?.ref, 12)});
    }
    if (!steps.length && !elements.length) D.notes.push('No journey step is recorded yet; the process has nothing to draw.');
    if (collapsed.size) D.notes.push(`${collapsed.size} sub-process${collapsed.size === 1 ? ' is' : 'es are'} collapsed: more than ${SUBPROCESS_OPEN} elements inside; its elements are listed in the Table.`);
  }

  if (scene.id === 'sequence') sequenceScene(p, M, D, {node, edge, group, O, ofType, relsOf, realises, objectId});
  if (scene.id === 'lifecycle') lifecycleScene(p, M, D, {node, edge, group, O, ofType, objectId});
  if (scene.id === 'module-map') moduleMapScene(p, M, D, {node, edge, group, O, ofType, componentModule}, map || {});

  if (scene.id === 'context') {
    const comps = ofType('component'), compIds = new Set(comps.map(c => c.id));
    if (comps.length) system();
    // The steps the system realises: those a responsibility its components realise implements (through a requirement's
    // model reference), or serves or realises (a Chapter 4 connection of kind serves or realises, round 12).
    const stepOfResp = new Map(), stepFor = (r, s) => { let xs = stepOfResp.get(r); if (!xs) stepOfResp.set(r, xs = []); if (!xs.includes(s)) xs.push(s); };
    for (const e of relsOf('implementedBy', e => O(e.from)?.type === 'journey')) stepFor(e.to, e.from);
    for (const e of rels) { const a = O(e.from)?.type, b = O(e.to)?.type; if (['serves', 'realises'].includes(e.type) && a === 'responsibility' && b === 'journey') stepFor(e.from, e.to); else if (['uses', 'realizedBy'].includes(e.type) && a === 'journey' && b === 'responsibility') stepFor(e.to, e.from); }
    const stepsIn = new Set(comps.flatMap(c => (realises.get(c.id) || []).flatMap(r => stepOfResp.get(r) || [])));
    // Round 12 (GR-FIG-13): every recorded actor and external party stands in the context, whether or not a requirement
    // reaches it in the model. An actor takes part in the steps the system realises that it participates in; a party
    // uses the system, or is used by it, through its contracts. One with no such step or contract yet is drawn with its
    // line attenuated and saying so, so the picture shows who is there without claiming a link no record makes.
    for (const a of comps.length ? ofType('actor') : []) {
      const steps = rels.filter(e => e.type === 'participates in' && e.from === a.id && stepsIn.has(e.to)).map(e => O(e.to)?.ref || e.to);
      node(a.id, 'actor', a.title, {sub: text(a.record?.description, 60), ref: a.ref, record: a.record});
      edge(a.id, M.root, 'takes part in', steps.length ? {kind: 'uses', qualifier: steps.join(', ')} : {kind: 'uses', qualifier: 'no step traced yet', weak: true});
    }
    for (const pt of comps.length ? ofType('party') : []) {
      const callsIn = ofType('contract').filter(c => c.record?.from === pt.id && compIds.has(c.record?.to)), callsOut = ofType('contract').filter(c => c.record?.to === pt.id && compIds.has(c.record?.from));
      node(pt.id, 'physicalApp', pt.title, {sub: 'External system', ref: pt.ref, record: pt.record, type: 'party'});
      if (callsIn.length) edge(pt.id, M.root, 'uses', {kind: 'uses', qualifier: callsIn.map(c => c.ref || c.title).join(', '), ends: 'one'});
      if (callsOut.length) edge(M.root, pt.id, 'uses', {kind: 'uses', qualifier: callsOut.map(c => c.ref || c.title).join(', '), ends: 'one'});
      if (!callsIn.length && !callsOut.length) edge(M.root, pt.id, 'exchanges with', {kind: 'uses', qualifier: 'no contract yet', ends: 'one', weak: true});
    }
    if (!comps.length) D.notes.push('No application component is recorded yet; the context has no system to draw.');
  }

  if (scene.id === 'motivation') {
    for (const a of ofType('actor')) node(a.id, 'actor', a.title, {sub: text(a.record?.description, 60), ref: a.ref, record: a.record});
    for (const o of ofType('outcome')) node(o.id, 'outcome', o.title, {sub: text(o.record?.description, 60), ref: o.ref, record: o.record});
    for (const r of ofType('requirement')) node(r.id, 'requirement', r.title, {sub: r.record?.priority, ref: r.ref, record: r.record});
    for (const q of ofType('quality')) node(q.id, 'quality', q.title, {sub: [q.record?.category, q.record?.priority].filter(Boolean).join(' · '), ref: q.id, record: q.record});
    for (const d of ofType('decision')) node(d.id, 'decision', d.title, {sub: d.record?.status, ref: d.id, record: d.record});
    for (const e of rels.filter(e => e.type === 'delivers' && seenN.has(e.from) && seenN.has(e.to))) edge(e.from, e.to, 'delivers', {kind: 'realizes', id: e.id});
    for (const e of rels.filter(e => e.type === 'participates in' && seenN.has(e.from))) { const t = O(e.to); if (t?.type === 'journey') { for (const r of rels.filter(x => x.type === 'delivers' && x.from === t.id && seenN.has(x.to))) edge(e.from, r.to, 'takes part in', {kind: 'uses', qualifier: t.ref || t.id}); } }
    for (const e of relsOf('fulfils')) if (O(e.from)?.type === 'quality' && seenN.has(e.to)) edge(e.from, e.to, 'fulfils', {kind: 'fulfils'});
    for (const e of relsOf('fulfils')) if (O(e.from)?.type === 'requirement' && O(e.to)?.type === 'quality') edge(e.to, e.from, 'fulfils', {kind: 'fulfils'});
    for (const e of relsOf('justifies')) if (seenN.has(e.to) && seenN.has(e.from)) edge(e.from, e.to, 'justifies', {kind: 'justifies'});
    for (const e of relsOf('constrains')) if (seenN.has(e.to) && seenN.has(e.from)) edge(e.from, e.to, 'constrains', {kind: 'constrains'});
    if (!D.nodes.length) D.notes.push('No actor, outcome, requirement, quality scenario or decision is recorded yet.');
  }

  if (scene.id === 'drivers') {
    for (const q of ofType('quality')) node(q.id, 'quality', q.title, {sub: [q.record?.category, q.record?.priority].filter(Boolean).join(' · '), ref: q.id, record: q.record});
    for (const e of relsOf('constrains')) { const t = O(e.to); if (!t) continue; if (t.type === 'responsibility') node(t.id, 'logicalApp', t.title, {ref: t.ref, record: t.record}); if (t.type === 'component') node(t.id, 'physicalApp', t.title, {ref: t.ref, record: t.record}); if (t.type === 'capability') node(t.id, capKind(t), t.title, {ref: t.ref, record: t.record}); edge(e.from, e.to, 'constrains', {kind: 'constrains'}); }
    // A quality scenario fulfils the requirement it refines: the realizer points at what it realizes.
    for (const e of relsOf('fulfils')) { const q = O(e.from), t = O(e.to); if (q?.type === 'requirement' && t?.type === 'quality') { node(q.id, 'requirement', q.title, {sub: q.record?.priority, ref: q.id, record: q.record}); edge(t.id, q.id, 'fulfils', {kind: 'fulfils'}); } }
    if (!D.nodes.length) D.notes.push('No quality scenario is recorded yet.');
  }

  if (scene.id === 'decisions') {
    for (const d of ofType('decision')) node(d.id, 'decision', d.title, {sub: d.record?.status, ref: d.id, record: d.record});
    for (const e of relsOf('considers', e => O(e.from)?.type === 'decision')) { const a = O(e.to); if (!a) continue; node(a.id, 'alternative', a.title, {sub: e.attributes?.selected ? 'Selected' : 'Not selected', hatched: !e.attributes?.selected, record: a.record}); edge(e.from, a.id, e.attributes?.selected ? 'selects' : 'considers', {kind: e.attributes?.selected ? 'selects' : 'considers', weak: !e.attributes?.selected}); }
    for (const e of relsOf('justifies')) { const t = O(e.to); if (!t) continue; if (t.type === 'responsibility') node(t.id, 'logicalApp', t.title, {ref: t.ref, record: t.record}); else if (t.type === 'component') node(t.id, 'physicalApp', t.title, {ref: t.ref, record: t.record}); else if (t.type === 'capability') node(t.id, capKind(t), t.title, {ref: t.ref, record: t.record}); else continue; edge(e.from, t.id, 'justifies', {kind: 'justifies'}); }
    if (!D.nodes.length) D.notes.push('No decision is recorded yet.');
  }

  if (scene.id === 'logical') {
    for (const g of ofType('module')) group(g.id, 'module', g.title, {sub: text(g.description, 60)});
    for (const r of ofType('responsibility')) node(r.id, 'logicalApp', r.title, {sub: text(r.record?.boundary, 60), ref: r.ref, group: moduleOf.get(r.id) || null, record: r.record});
    for (const e of relsOf('interaction', e => e.source === 'logical.connections')) edge(e.from, e.to, e.label || 'flows to', {kind: 'flow', id: e.id, qualifier: e.attributes?.condition && e.attributes.condition !== e.label ? e.attributes.condition : '', record: e.attributes});
    if (!D.nodes.length) D.notes.push('No responsibility is recorded yet.');
  }

  if (scene.id === 'application') {
    const comps = ofType('component');
    if (comps.length) system();
    for (const g of ofType('module')) group(g.id, 'module', g.title);
    for (const c of comps) node(c.id, 'physicalApp', c.title, {sub: text(c.record?.kind, 20), ref: c.ref, group: componentModule(c.id), record: c.record});
    for (const r of ofType('responsibility')) node(r.id, 'logicalApp', r.title, {ref: r.ref, group: moduleOf.get(r.id) || null, record: r.record});
    // The application is composed of its components (the diamond at the whole); a component realizes its logical component.
    for (const c of comps) edge(M.root, c.id, 'composes', {kind: 'composes', ends: 'none'});
    for (const e of relsOf('realizedBy')) edge(e.to, e.from, 'realizes', {kind: 'realizes', up: false, record: e.attributes});
    for (const c of ofType('contract')) { const provider = O(c.record?.to), consumer = O(c.record?.from); if (provider?.type === 'component' || consumer?.type === 'component') contractNode(c); }
    for (const e of relsOf('provides')) if (O(e.from)?.type === 'component') edge(e.from, e.to, 'implements', {kind: 'implements', qualifier: text(O(e.to)?.record?.kind, 12)});
    for (const e of relsOf('uses')) if (O(e.from)?.type === 'component') edge(e.from, e.to, 'uses', {kind: 'uses'});
    // An external participant that calls in is an application outside ours, in its own box.
    for (const pt of ofType('party')) {
      const calls = relsOf('uses', e => e.from === pt.id);
      if (!calls.length && seenG.has(pt.id)) continue;
      partyNode(pt, calls.length ? 'External caller' : 'No contract recorded');
      if (!calls.length) D.nodes.find(n => n.id === 'party:' + pt.id).hatched = true;
      for (const e of calls) if (seenN.has(e.to)) edge('party:' + pt.id, e.to, 'uses', {kind: 'uses'});
    }
    for (const e of relsOf('interaction', e => e.source === 'realisation.connections')) if (O(e.from)?.type === 'component' && O(e.to)?.type === 'component') edge(e.from, e.to, e.label || 'interacts with', {kind: 'flow', id: e.id, qualifier: text(e.attributes?.interaction, 12), record: e.attributes});
    if (!comps.length) D.notes.push('No application component is recorded yet.');
  }

  if (scene.id === 'container') {
    const comps = ofType('component'), compIds = new Set(comps.map(c => c.id));
    if (comps.length) group(M.root, 'system', O(M.root)?.title || p.name, {sub: 'System boundary'});
    for (const c of comps) { const prods = productsOf(c.id); node(c.id, 'physicalApp', c.title, {sub: prods.length ? prods.slice(0, 2).join(' · ') : (c.record?.kind || 'technology not chosen'), ref: c.ref, group: M.root, record: c.record, hatched: false}); }
    // Stores: the state capabilities a component requires, realized by a product.
    for (const c of comps) for (const e of relsOf('requires', x => x.from === c.id)) { const cap = O(e.to); if (cap?.type !== 'capability' || familyOf(cap.attributes?.category) !== 'state') continue; for (const i of relsOf('implementedBy', x => x.from === cap.id)) { const t = O(i.to); if (!t) continue; const pr = product(t); node(t.id, 'physicalData', pr ? pr.title : t.title, {sub: pr ? pr.sub : 'No choice yet', ref: t.ref, hatched: !pr, group: M.root, record: t.record}); edge(c.id, t.id, cap.title, {kind: 'uses', qualifier: text(cap.attributes?.category, 16)}); } }
    for (const c of ofType('contract')) {
      const from = O(c.record?.from), to = O(c.record?.to); if (!from || !to) continue;
      for (const o of [from, to]) if (o.type === 'party') node(o.id, 'physicalApp', o.title, {sub: 'External system', ref: o.ref, record: o.record, type: 'party'});
      if ((compIds.has(from.id) || from.type === 'party') && (compIds.has(to.id) || to.type === 'party')) edge(from.id, to.id, c.ref || c.title, {kind: 'uses', id: 'c4:' + c.id, qualifier: text(c.record?.protocol, 24), record: c.record});
    }
    if (!comps.length) D.notes.push('No application component is recorded yet.');
  }

  if (scene.id === 'cooperation') {
    const comps = ofType('component');
    for (const c of comps) node(c.id, 'physicalApp', c.title, {ref: c.ref, record: c.record});
    for (const c of ofType('contract')) { const provider = O(c.record?.to), consumer = O(c.record?.from); if (provider?.type === 'component' && consumer?.type === 'component') { node(c.id, 'appService', c.title, {sub: [c.record?.operation, c.record?.protocol].filter(Boolean).join(' · '), ref: c.ref, record: c.record}); edge(provider.id, c.id, 'implements', {kind: 'implements'}); edge(consumer.id, c.id, 'uses', {kind: 'uses', qualifier: text(c.record?.protocol, 20)}); } }
    for (const e of relsOf('interaction', e => e.source === 'realisation.connections')) if (seenN.has(e.from) && seenN.has(e.to)) edge(e.from, e.to, e.label || 'interacts with', {kind: 'flow', id: e.id, qualifier: text(e.attributes?.interaction, 12), record: e.attributes});
    if (!D.edges.length) D.notes.push('No contract between two components is recorded yet.');
  }

  if (scene.id === 'solution' || scene.id === 'stack') {
    const caps = ofType('capability'), comps = ofType('component');
    for (const f of FAMILIES) if (caps.some(c => familyOf(c.attributes?.category) === f.id)) group('family:' + f.id, 'family', f.title, {sub: f.sub});
    for (const c of comps) node(c.id, 'physicalApp', c.title, {ref: c.ref, record: c.record});
    for (const c of caps) node(c.id, capKind(c), c.title, {sub: text(c.record?.category, 20), ref: c.ref, group: 'family:' + familyOf(c.attributes?.category), record: c.record});
    // A capability serves the component that requires it (the server points at the served).
    for (const e of relsOf('requires')) if (O(e.from)?.type === 'component' && O(e.to)?.type === 'capability') edge(e.to, e.from, 'serves', {kind: 'serves', id: 'serves:' + e.id, qualifier: e.attributes?.criticality && e.attributes.criticality !== 'essential' ? text(e.attributes.criticality, 12) : '', weak: !!(e.attributes?.criticality && e.attributes.criticality !== 'essential'), record: e.attributes});
    for (const e of rels.filter(e => e.source === 'technology.dependencies' && seenN.has(e.from) && seenN.has(e.to))) edge(e.from, e.to, 'depends on', {kind: 'dependsOn', id: e.id, qualifier: e.attributes?.critical === false ? 'not critical' : '', weak: e.attributes?.critical === false, record: e.attributes});
    if (scene.id === 'stack') {
      for (const t of ofType('technology')) { const pr = product(t); node(t.id, 'physicalTech', pr ? pr.title : t.title, {sub: pr ? ['Preferred option', pr.sub].filter(Boolean).join(' · ') : `No choice yet · ${list(t.record?.options).length} option${list(t.record?.options).length === 1 ? '' : 's'}`, ref: t.ref, hatched: !pr, record: t.record, icon: iconFor([pr?.title, pr?.sub, t.title, t.record?.category].filter(Boolean).join(' '))}); }
      // A product realizes the capability (the realizer points at what it realizes).
      for (const e of relsOf('implementedBy')) if (O(e.from)?.type === 'capability') edge(e.to, e.from, 'realizes', {kind: 'realizes', id: e.id, record: e.attributes});
      for (const e of rels.filter(e => e.source === 'technologyRealisation.connections')) edge(e.from, e.to, e.label || 'depends on', {kind: 'dependsOn', id: e.id, record: e.attributes});
    } else {
      for (const b of ofType('boundary')) group(b.id, 'boundary', b.title, {sub: 'Trust boundary'});
      for (const e of relsOf('withinBoundary')) { const n = D.nodes.find(n => n.id === e.from); if (n && seenG.has(e.to) && !n.group?.startsWith?.('family:')) n.group = e.to; }
    }
    if (!caps.length) D.notes.push('No platform capability is recorded yet.');
  }

  if (scene.id === 'usage') {
    const caps = ofType('capability');
    for (const c of caps) node(c.id, capKind(c), c.title, {sub: text(c.record?.category, 20), ref: c.ref, record: c.record});
    for (const e of relsOf('implementedBy')) if (O(e.from)?.type === 'capability') { const t = O(e.to); if (!t) continue; const pr = product(t); node(t.id, 'physicalTech', pr ? pr.title : t.title, {sub: pr ? ['Preferred option', pr.sub].filter(Boolean).join(' · ') : 'No choice yet', ref: t.ref, hatched: !pr, record: t.record}); edge(t.id, e.from, 'realizes', {kind: 'realizes', id: e.id}); }
    const envs = ofType('environment'), env = envs.find(e => e.id === environmentId) || envs[0];
    D.environmentId = env?.id || null;
    if (env) { const plans = ofType('runtime').filter(r => r.record?.environmentId === env.id); for (const pl of ofType('instance')) { const plan = plans.find(r => r.id === pl.record?.planId); if (!plan || !seenN.has(plan.record?.assetId)) continue; const z = O(pl.record?.zoneId); node(pl.id, 'placement', (z?.title || 'Placement') + ' · ' + (pl.record?.role || 'copy'), {sub: `${pl.record?.replicas ?? 1} ${pl.record?.role || 'copy'}${(pl.record?.replicas ?? 1) === 1 ? '' : 's'} · ${env.title}`, ref: pl.ref, hatched: pl.record?.role === 'standby', record: pl.record, sol: plan.id}); edge(plan.record.assetId, pl.id, 'placed as', {kind: 'hosts', cardinality: {from: '1', to: String(pl.record?.replicas ?? 1)}}); } }
    if (!caps.length) D.notes.push('No platform capability is recorded yet.');
  }

  if (scene.id === 'integration') {
    const comps = ofType('component');
    for (const c of comps) node(c.id, 'physicalApp', c.title, {ref: c.ref, record: c.record});
    for (const c of ofType('contract')) contractNode(c);
    for (const e of relsOf('provides')) if (O(e.from)?.type === 'component') edge(e.from, e.to, 'implements', {kind: 'implements'});
    for (const e of relsOf('uses')) { const from = O(e.from), c = O(e.to); if (from?.type === 'component') edge(e.from, e.to, 'uses', {kind: 'uses', qualifier: text(c?.record?.kind, 12)}); else if (from?.type === 'party') { partyNode(from, 'External caller'); edge('party:' + from.id, e.to, 'uses', {kind: 'uses', qualifier: text(c?.record?.kind, 12)}); } }
    if (!D.nodes.some(n => n.kind === 'appService')) D.notes.push('No interface contract is recorded yet.');
  }

  if (scene.id === 'data') {
    const comps = ofType('component'), stores = ofType('technology').filter(t => ['state'].includes(familyOf(O(relsOf('implementedBy', e => e.to === t.id)[0]?.from)?.attributes?.category)));
    for (const t of stores) { const pr = product(t); node(t.id, 'physicalData', pr ? pr.title : t.title, {sub: pr ? pr.sub : 'No choice yet', ref: t.ref, hatched: !pr, record: t.record}); }
    for (const d of ofType('data')) node(d.id, 'logicalData', d.title, {sub: text(d.record?.classification, 30), ref: d.ref, record: d.record});
    for (const c of comps) if (relsOf('owns', e => e.from === c.id).length || relsOf('requires', e => e.from === c.id).length) node(c.id, 'physicalApp', c.title, {ref: c.ref, record: c.record});
    // An authority outside ours (a party) owns its data as an external system.
    for (const e of relsOf('owns')) { const a = O(e.from); if (!seenN.has(e.to)) continue; if (a?.type === 'component') edge(e.from, e.to, 'owns', {kind: 'owns'}); else if (a?.type === 'party') { partyNode(a, 'External authority'); edge('party:' + a.id, e.to, 'owns', {kind: 'owns'}); } }
    for (const e of relsOf('requires')) { const cap = O(e.to); if (cap?.type !== 'capability' || familyOf(cap.attributes?.category) !== 'state') continue; for (const i of relsOf('implementedBy', x => x.from === cap.id)) edge(e.from, i.to, 'uses', {kind: 'uses', qualifier: text(cap.attributes?.category, 16)}); }
    for (const e of relsOf('exchanges')) { const c = O(e.from); if (c?.type === 'contract') { node(c.id, 'appService', c.title, {ref: c.ref, record: c.record}); edge(c.id, e.to, 'exchanges', {kind: 'exchanges', qualifier: text(e.attributes?.role, 12), ends: 'both'}); } }
    for (const e of relsOf('transforms')) if (seenN.has(e.from) && seenN.has(e.to)) edge(e.from, e.to, 'transforms into', {kind: 'transforms', id: e.id, record: e.attributes});
    if (!D.nodes.some(n => n.layer === 'data')) D.notes.push('No data definition is recorded yet.');
  }

  if (scene.id === 'lineage') {
    for (const d of ofType('data')) node(d.id, 'logicalData', d.title, {sub: text(d.record?.classification, 30), ref: d.ref, record: d.record});
    for (const e of relsOf('owns')) { const a = O(e.from); if (!seenN.has(e.to) || !a) continue; if (a.type === 'component') node(a.id, 'physicalApp', a.title, {ref: a.ref, record: a.record}); else if (a.type === 'party') partyNode(a, 'External authority'); else continue; edge(a.type === 'party' ? 'party:' + a.id : a.id, e.to, 'owns', {kind: 'owns'}); }
    for (const e of relsOf('transforms')) if (seenN.has(e.from) && seenN.has(e.to)) edge(e.from, e.to, text(e.attributes?.label || 'transforms into', 40), {kind: 'transforms', id: e.id, record: e.attributes});
    for (const e of relsOf('exchanges')) { const c = O(e.from); if (c?.type === 'contract' && seenN.has(e.to)) { node(c.id, 'appService', c.title, {ref: c.ref, record: c.record}); edge(c.id, e.to, 'carries', {kind: 'exchanges', qualifier: text(e.attributes?.role, 12)}); } }
    if (!relsOf('transforms').length) D.notes.push('No lineage (what transforms into what) is recorded yet; owners and carriers are drawn.');
    if (!D.nodes.length) D.notes.push('No data definition is recorded yet.');
  }

  if (scene.id === 'security') {
    for (const b of ofType('boundary')) group(b.id, 'boundary', b.title, {sub: text(b.record?.policy, 60)});
    const inB = new Map(relsOf('withinBoundary').map(e => [e.from, e.to]));
    for (const c of ofType('component')) node(c.id, 'physicalApp', c.title, {ref: c.ref, group: inB.get(c.id) || null, record: c.record});
    for (const c of ofType('capability')) if (inB.has(c.id)) node(c.id, capKind(c), c.title, {ref: c.ref, group: inB.get(c.id), record: c.record});
    for (const k of ofType('control')) node(k.id, 'control', k.title, {sub: text(k.record?.category, 30), ref: k.ref, record: k.record});
    for (const t of ofType('threat')) node(t.id, 'threat', t.title, {sub: text(t.record?.priority ? t.record.priority + ' priority' : '', 30), ref: t.ref, record: t.record});
    const target = id => { const o = O(id); if (!o) return null; if (o.type === 'contract') return contractNode(o); if (o.type === 'data') return node(o.id, 'logicalData', o.title, {ref: o.ref, record: o.record}); if (o.type === 'component') return D.nodes.find(n => n.id === id); return null; };
    for (const e of relsOf('protects')) if (target(e.to)) edge(e.from, e.to, 'protects', {kind: 'protects'});
    for (const e of relsOf('threatens')) if (target(e.to)) edge(e.from, e.to, 'threatens', {kind: 'threatens', qualifier: text(O(e.from)?.record?.priority, 12)});
    for (const e of relsOf('mitigates')) edge(e.from, e.to, 'mitigates', {kind: 'mitigates'});
    // The contracts between the components cross the boundaries: those edges carry a crossing mark.
    for (const c of ofType('contract')) { const from = O(c.record?.from), to = O(c.record?.to); if (seenN.has(from?.id) && seenN.has(to?.id) && from.type === 'component' && to.type === 'component') edge(from.id, to.id, c.ref || c.title, {kind: 'uses', id: 'uses:' + c.id, qualifier: text(c.record?.authorization || c.record?.protocol, 20), record: c.record}); }
    if (!ofType('control').length && !ofType('threat').length) D.notes.push('No control or threat is recorded yet.');
  }

  if (scene.id === 'deployment') {
    const envs = ofType('environment'), env = envs.find(e => e.id === environmentId) || envs[0];
    D.environmentId = env?.id || null;
    if (env) {
      group(env.id, 'environment', env.title, {sub: text(env.record?.stage, 40)});
      // A zone stands in its trust boundary, inside the environment; a zone without one stands in the environment.
      const zones = ofType('zone').filter(z => z.record?.environmentId === env.id);
      for (const z of zones) { const b = z.record?.boundaryId ? O(z.record.boundaryId) : null; if (b) group('boundary:' + env.id + ':' + b.id, 'boundary', b.title, {sub: 'Trust boundary', parent: env.id}); group(z.id, 'zone', z.title, {sub: text(z.record?.failureDomain, 50), parent: b ? 'boundary:' + env.id + ':' + b.id : env.id}); }
      const plans = ofType('runtime').filter(r => r.record?.environmentId === env.id), placed = new Set();
      for (const pl of ofType('instance')) {
        const plan = plans.find(r => r.id === pl.record?.planId); if (!plan || !seenG.has(pl.record?.zoneId)) continue;
        const asset = O(plan.record?.assetId), tech = asset?.type === 'technology', pr = tech ? product(asset) : null;
        node(pl.id, tech ? 'physicalTech' : 'physicalApp', tech ? (pr ? pr.title : asset.title) : (asset?.title || plan.title), {sub: `${pl.record?.replicas ?? 1} ${pl.record?.role || 'copy'}${pr?.sub ? ' · ' + pr.sub : ''}`, ref: asset?.ref || plan.ref, group: pl.record.zoneId, hatched: pl.record?.role === 'standby', record: pl.record, sol: plan.id, type: 'instance'});
        placed.add(plan.record?.assetId);
      }
      const unplaced = list(env.record?.assetIds).filter(id => !placed.has(id) && O(id));
      if (unplaced.length) { group('unplaced:' + env.id, 'unplaced', 'Not placed', {sub: 'parts without a place to run', parent: env.id}); for (const id of unplaced) { const a = O(id), tech = a.type === 'technology', pr = tech ? product(a) : null; node('unplaced:' + id, tech ? 'physicalTech' : 'physicalApp', tech ? (pr ? pr.title : a.title) : a.title, {sub: 'Not placed', ref: a.ref, group: 'unplaced:' + env.id, hatched: true, record: a.record, sol: plans.find(r => r.record?.assetId === id)?.id || id, type: a.type}); } }
      // A runtime path realises a contract between two parts: it runs between their placements.
      const placementOf = assetId => D.nodes.find(n => n.record?.planId && plans.find(r => r.id === n.record.planId)?.record?.assetId === assetId)?.id || (seenN.has('unplaced:' + assetId) ? 'unplaced:' + assetId : null);
      let step = 0;
      for (const path of ofType('path').filter(r => r.record?.environmentId === env.id)) {
        const c = O(path.record?.contractId); if (!c) continue;
        const from = placementOf(c.record?.from), to = placementOf(c.record?.to);
        if (from && to) edge(from, to, c.ref || c.title, {kind: 'path', step: ++step, id: path.id, qualifier: text(c.record?.protocol, 20), record: path.record});
        else D.notes.push(`${path.ref || path.id} realises ${c.ref || c.title}, whose ${from ? 'provider' : 'caller'} has no placement in this environment.`);
      }
      // A part placed on a platform service stands on it: the copy of the technology it needs. The
      // cardinality says how many copies stand on how many.
      for (const n of D.nodes.filter(n => n.kind === 'physicalApp' && n.record?.planId)) {
        const assetId = plans.find(r => r.id === n.record.planId)?.record?.assetId;
        for (const e of relsOf('requires', x => x.from === assetId)) for (const i of relsOf('implementedBy', x => x.from === e.to)) { const t = placementOf(i.to); if (t && !t.startsWith('unplaced:')) { const tn = D.nodes.find(x => x.id === t); edge(n.id, t, 'stands on', {kind: 'standsOn', cardinality: {from: String(n.record?.replicas ?? 1), to: String(tn?.record?.replicas ?? 1)}, qualifier: text(O(e.to)?.attributes?.category, 16)}); } }
      }
    } else D.notes.push('No environment is recorded yet.');
  }

  if (scene.id === 'rationale') {
    for (const r of ofType('requirement')) node(r.id, 'requirement', r.title, {sub: r.record?.priority, ref: r.id, record: r.record});
    // What fulfils a requirement points at it (realization): a quality scenario, a responsibility, a component, a capability.
    for (const e of relsOf('fulfils')) { const t = O(e.to), q = O(e.from); if (!t || q?.type !== 'requirement') continue; if (t.type === 'responsibility') node(t.id, 'logicalApp', t.title, {ref: t.ref, record: t.record}); else if (t.type === 'component') node(t.id, 'physicalApp', t.title, {ref: t.ref, record: t.record}); else if (t.type === 'capability') node(t.id, capKind(t), t.title, {ref: t.ref, record: t.record}); else if (t.type === 'quality') node(t.id, 'quality', t.title, {ref: t.id, record: t.record}); else continue; edge(t.id, e.from, 'fulfils', {kind: 'fulfils'}); }
    for (const d of ofType('decision')) node(d.id, 'decision', d.title, {sub: d.record?.status, ref: d.id, record: d.record});
    for (const e of relsOf('justifies')) if (seenN.has(e.to)) edge(e.from, e.to, 'justifies', {kind: 'justifies'});
    for (const e of relsOf('evidences')) { const ev = O(e.from); if (ev && seenN.has(e.to)) { node(ev.id, 'evidence', ev.title, {sub: 'Evidence', ref: ev.ref, record: ev.record}); edge(ev.id, e.to, 'evidences', {kind: 'evidences'}); } }
    if (!D.nodes.length) D.notes.push('No requirement or decision is recorded yet.');
  }

  if (scene.id === CONNECTED.id) {
    const ch = Number(chapter) || 4, own = new Set(CONNECTED_TYPES[ch] || []);
    const drawable = o => !!o && !!kindOfType(o.type, o.record) && o.type !== 'system';
    const all = objs.filter(o => own.has(o.type) && drawable(o)), degree = new Map();
    for (const e of rels) for (const id of [e.from, e.to]) degree.set(id, (degree.get(id) || 0) + 1);
    // A very large chapter draws its most connected records (the Table lists them all) and keeps room for their
    // neighbours; the note says how many of each wait.
    const mine = all.length > CONNECTED_OWN ? all.slice().sort((x, y) => (degree.get(y.id) || 0) - (degree.get(x.id) || 0) || String(x.ref).localeCompare(String(y.ref), undefined, {numeric: true})).slice(0, CONNECTED_OWN) : all, mineIds = new Set(mine.map(o => o.id));
    const near = new Map();
    for (const e of rels) { const a = O(e.from), b = O(e.to); if (!drawable(a) || !drawable(b)) continue; if (mineIds.has(a.id) && !own.has(b.type)) near.set(b.id, (near.get(b.id) || 0) + 1); if (mineIds.has(b.id) && !own.has(a.type)) near.set(a.id, (near.get(a.id) || 0) + 1); }
    const room = Math.max(0, CONNECTED_LIMIT - mine.length), ranked = [...near].sort((x, y) => y[1] - x[1] || String(x[0]).localeCompare(String(y[0])));
    const shown = [...mine, ...ranked.slice(0, room).map(([id]) => O(id))];
    if (all.length > mine.length) D.notes.push(`${all.length - mine.length} of Chapter ${ch}'s ${all.length} records are not drawn: the ${mine.length} most connected are; the Table lists every one.`);
    for (const o of shown) { const kind = kindOfType(o.type, o.record); node(o.id, kind, o.title, {sub: OBJECT_TYPES[o.type]?.label || '', ref: o.ref && o.ref !== o.id ? o.ref : String(o.ref || o.id).slice(0, 24), record: o.record, type: o.type}); }
    for (const e of rels) {
      const st = REL_STYLE[e.type]; if (!st || !seenN.has(e.from) || !seenN.has(e.to) || e.from === e.to) continue;
      const [kind, flip] = st, [from, to] = flip ? [e.to, e.from] : [e.from, e.to];
      edge(from, to, kind === 'flow' || kind === 'sequence' ? (e.attributes?.label || e.label || '') : '', {kind, id: 'c:' + e.id, record: e.attributes?.id ? e.attributes : null, archimate: e.archimate});
    }
    // Implementation & Migration (rc41, W1; PLAN §2 W1.3): Chapter 11's own records — the roadmap's plateaus, the delivery
    // actions assigned to them and the migrations between them — join the chapter's connected model: a delivery action
    // realizes its plateau (the standard: a work package realizes a plateau) and delivers the records it names; a migration
    // is the transition from its first plateau to its last (triggering). Nothing is drawn while none is recorded, so the
    // Implementation & Migration lane appears only then.
    if (ch === 11) {
      for (const x of plateausOf(p)) if (x?.id) node(x.id, 'plateau', x.title, {sub: PLATEAU_WORDS[x.kind] || x.kind || '', ref: x.id, record: x, type: 'plateau'});
      for (const a of list(p.finalReview?.actions)) {
        if (!a?.id) continue;
        node(a.id, 'workPackage', a.title, {sub: a.status || 'Delivery action', ref: a.id, record: a, type: 'action'});
        if (a.plateauId && seenN.has(a.plateauId)) edge(a.id, a.plateauId, 'realizes', {kind: 'realizes', id: 'c:' + a.id + '>' + a.plateauId});
        for (const id of list(a.objectIds)) if (seenN.has(id) && id !== a.id) edge(a.id, id, 'delivers', {kind: 'realizes', id: 'c:' + a.id + '>' + id});
      }
      for (const m of migrationsOf(p)) { const ids = list(m?.plateauIds).filter(id => seenN.has(id)); if (ids.length >= 2 && ids[0] !== ids.at(-1)) edge(ids[0], ids.at(-1), cut(m.title || 'migrates to', 60), {kind: 'transition', id: 'c:' + m.id, record: m}); }
    }
    const left = ranked.length - Math.min(room, ranked.length);
    if (left > 0) D.notes.push(`${left} more connected record${left === 1 ? ' is' : 's are'} not drawn; the ${Math.min(room, ranked.length)} most connected are.`);
    if (!mine.length) D.notes.push(`Chapter ${ch} records nothing yet; its connected model has nothing to draw.`);
  }

  // A module, family, external system or trust zone nobody stands in is not drawn; a recorded
  // environment, zone or lane is, even empty — an empty recovery site is a finding.
  const used = new Set(D.nodes.map(n => n.group).filter(Boolean));
  for (const g of D.groups) if (g.parent) used.add(g.parent);
  D.groups = D.groups.filter(g => ['environment', 'zone', 'lane'].includes(g.kind) || used.has(g.id) || D.groups.some(x => x.parent === g.id && (used.has(x.id) || ['environment', 'zone', 'lane'].includes(x.kind))));
  const keptGroups = new Map(D.groups.map(g => [g.id, g]));
  for (const n of D.nodes) if (n.group && !keptGroups.has(n.group)) n.group = null;
  for (const g of D.groups) if (g.parent && !keptGroups.has(g.parent)) g.parent = null;
  // An edge whose ends stand in different trust boundaries crosses one: the picture marks it.
  const boundaryOf = id => { let g = keptGroups.get(nodeById.get(id)?.group); while (g && g.kind !== 'boundary') g = keptGroups.get(g.parent); return g?.id || null; };
  if (D.groups.some(g => g.kind === 'boundary')) for (const e of D.edges) { const a = boundaryOf(e.from), b = boundaryOf(e.to); e.crossing = !!a && !!b && a !== b; }
  D.counts = {nodes: D.nodes.length, groups: D.groups.length, edges: D.edges.length};
  return D;
}

// A sub-process is drawn open (a container) up to this many elements; beyond it, collapsed with a count.
export const SUBPROCESS_OPEN = 12;
// The most messages the sequence picture draws (the contracts of one workspace are bounded at 500).
export const SEQUENCE_LIMIT = 500;

// The sequence picture (round 6, Contract T). For a contract: lifelines for its caller, its provider and each data
// definition it exchanges (the data as a store the provider handles), and its messages in order — the request (the
// operation), the data the provider takes in or gives out by exchange role, and the response. For a journey step: the
// contracts of the components that implement its responsibilities, in that order. Without an object: every journey step
// in process order when transitions or precedences exist, else the contracts as recorded.
function sequenceScene(p, M, D, {node, edge, O, ofType, relsOf, realises, objectId}) {
  const contracts = ofType('contract'), steps = list(p.artefacts).filter(a => a.type === 'journey');
  const stepOfResp = new Map(relsOf('implementedBy', e => O(e.from)?.type === 'journey').map(e => [e.to, e.from]));
  const compsOf = step => { const set = new Set(); for (const [comp, resps] of realises) for (const r of resps) if (stepOfResp.get(r) === step) set.add(comp); return set; };
  const contractsOfStep = step => { const comps = compsOf(step); return contracts.filter(c => comps.has(c.record?.from) || comps.has(c.record?.to)); };
  // Process order: the journey steps by their transitions and precedences (a topological walk from the steps nothing
  // precedes), else as recorded.
  const order = () => {
    const G = processGraph(p), ids = steps.map(s => s.id), set = new Set(ids), before = new Map(ids.map(id => [id, new Set()]));
    for (const t of G.sequence) if (set.has(t.from) && set.has(t.to)) before.get(t.to).add(t.from);
    for (const r of list(p.relationships).filter(r => r.kind === 'precedes')) if (set.has(r.from) && set.has(r.to)) before.get(r.to).add(r.from);
    // Steps joined only through reference events and gateways: reachability along the process graph.
    for (const a of ids) { const seen = new Set(), q = (G.outgoing.get(a) || []).map(t => t.to); while (q.length) { const id = q.shift(); if (seen.has(id)) continue; seen.add(id); if (set.has(id)) { if (id !== a) before.get(id).add(a); continue; } for (const t of G.outgoing.get(id) || []) q.push(t.to); } }
    const out = [], done = new Set();
    while (out.length < ids.length) { const next = ids.find(id => !done.has(id) && [...before.get(id)].every(b => done.has(b))) || ids.find(id => !done.has(id)); done.add(next); out.push(next); }
    return out;
  };
  let plan = []; // [{contract, step}]
  const subject = objectId ? O(objectId) : null;
  if (subject?.type === 'contract') plan = [{contract: subject, step: null}];
  else if (subject?.type === 'journey') plan = contractsOfStep(subject.id).map(contract => ({contract, step: subject.id}));
  else if (steps.length && stepOfResp.size) plan = order().flatMap(step => contractsOfStep(step).map(contract => ({contract, step})));
  else plan = contracts.map(contract => ({contract, step: null}));
  if (plan.length > SEQUENCE_LIMIT) { D.notes.push(`${plan.length - SEQUENCE_LIMIT} contracts are not drawn: the picture holds the first ${SEQUENCE_LIMIT}.`); plan = plan.slice(0, SEQUENCE_LIMIT); }
  const lifeline = o => { if (!o) return null; const party = o.type === 'party', data = o.type === 'data'; return node(o.id, 'lifeline', o.title, {sub: data ? 'Data definition' : party ? 'External participant' : 'Application component', ref: o.ref, record: o.record, type: o.type}); };
  let n = 0, lastStep = undefined;
  for (const {contract: c, step} of plan) {
    const from = O(c.record?.from), to = O(c.record?.to); if (!from || !to) continue;
    lifeline(from); lifeline(to);
    const stepWord = step && step !== lastStep ? (O(step)?.ref || step) + ' · ' : ''; lastStep = step;
    const exchanges = list(c.record?.exchanges).filter(x => O(x.dataId)), res = exchanges.filter(x => x.role === 'response');
    edge(from.id, to.id, stepWord + (c.record?.operation || c.title || 'request'), {kind: 'message', id: `msg:${c.id}:${++n}`, step: n, qualifier: text(c.record?.protocol, 24), record: c.record, self: true});
    // The data the contract exchanges: the provider takes a request payload in and gives a response payload out.
    for (const x of exchanges) { const d = O(x.dataId); lifeline(d); edge(to.id, d.id, `${x.role} · ${d.title}`, {kind: 'message', id: `msg:${c.id}:${++n}`, step: n, qualifier: text(d.ref, 12), record: c.record}); }
    if (c.record?.kind !== 'event') edge(to.id, from.id, res.length ? 'response · ' + res.map(x => O(x.dataId)?.title).join(', ') : 'response', {kind: 'message', id: `msg:${c.id}:${++n}`, step: n, record: c.record, self: true, reply: true});
  }
  if (!D.nodes.length) D.notes.push(subject ? 'No contract is recorded for this record yet.' : 'No interface contract is recorded yet; the sequence has nothing to draw.');
}

// The lifecycle picture (round 6, Contract T): the states a data definition records (interfaces.data lifecycle), the
// first as the initial state, and the contract that moves it from one to the next on each transition.
function lifecycleScene(p, M, D, {node, edge, group, O, ofType, objectId}) {
  const all = ofType('data').filter(d => list(d.record?.lifecycle?.states).length), subject = objectId ? all.find(d => d.id === objectId) : null;
  const drawn = subject ? [subject] : all, many = drawn.length > 1;
  for (const d of drawn) {
    const lc = d.record.lifecycle, gid = 'data:' + d.id;
    if (many) group(gid, 'record', d.title, {sub: 'Data definition · ' + (lc.field || 'state')});
    lc.states.forEach((st, i) => node(`state:${d.id}:${st}`, 'state', st, {sub: i === 0 ? 'Initial · ' + (lc.field || 'state') : lc.field || '', ref: d.ref, group: many ? gid : null, record: d.record, type: 'data'}));
    // A transition moved by time (round 12, GR-DAT-04) is labelled by its schedule.
    list(lc.transitions).forEach((t, i) => { const c = t.contractId ? O(t.contractId) : null; edge(`state:${d.id}:${t.from}`, `state:${d.id}:${t.to}`, c ? c.ref || c.title : t.trigger?.schedule ? 'on ' + text(t.trigger.schedule, 40) : 'moves to', {kind: 'transition', id: `tr:${d.id}:${i}`, qualifier: text(c?.record?.operation, 24), record: c?.record || null}); });
  }
  if (!drawn.length) D.notes.push(all.length ? 'This data definition records no lifecycle yet.' : 'No data definition records a lifecycle yet: add its states and the contracts that move them on Chapter 8.');
}

// The module map (round 24, D-24-07): the functional decomposition the requirements are organised by (module-model.js),
// readable straight after an import, before anything is designed. The people who use the system and the external
// systems by their kind (interfaces-domain.js PARTY_KINDS) stand first; then the system, with its business modules, each
// a box that names its sub-modules (the largest first, up to `lines`, each with its requirements, then "and N more")
// and its own requirements, and the platform modules as a band below them. Where the design has drafted the modules (a
// component in a module through the Chapter 4 responsibility group that realises it, module-scope.js), a line joins two
// modules whose components use one another through contracts, and a module to each kind of external system its
// components exchange with, each line counting its contracts; where nothing is drafted yet, a line joins a platform
// module to each business module whose requirements it serves, counting them. A box keeps its LINKS heaviest lines (the
// rest are counted in a note: the container and component views draw every contract); above `modules` boxes the smallest
// business modules stand together as one box, and above `edges` lines the lightest are left out too (the SDD draws the map
// smaller until it fits a page: sdd-figures.js moduleMapFigures). A project with no module structure draws its Chapter 4
// responsibility groups as the modules and says so. Nothing here changes the project.
export const MAP = Object.freeze({W: 136, LINES: 3, LINKS: 2});
// A catch-all sub-module ("Other … requirements", module-model.js) is listed after the sub-modules that name a part.
const CATCH_ALL_PART = /^other\b/i;
function moduleMapScene(p, M, D, {node, edge, group, O, ofType, componentModule}, {lines = MAP.LINES, modules: most = Infinity, edges: edgeMax = Infinity, links = MAP.LINKS} = {}) {
  const T = moduleTree(p), byTree = T.modules.length > 0, own = new Map(), inSub = new Map(), fmt = n => Number(n).toLocaleString('en-GB'), plural = (n, one, many = one + 's') => `${fmt(n)} ${n === 1 ? one : many}`;
  for (const [, h] of T.home) { own.set(h.moduleId, (own.get(h.moduleId) || 0) + 1); if (h.subId) inSub.set(h.subId, (inSub.get(h.subId) || 0) + 1); }
  // What each platform module serves in each business module (requirements whose theme it serves, homed elsewhere).
  const serves = new Map();
  for (const [rid, ms] of T.served) { const h = T.home.get(rid); if (!h) continue; for (const m of ms) { if (m === h.moduleId) continue; let x = serves.get(m); if (!x) serves.set(m, x = new Map()); x.set(h.moduleId, (x.get(h.moduleId) || 0) + 1); } }
  const byCount = (a, b) => CATCH_ALL_PART.test(a.title) - CATCH_ALL_PART.test(b.title) || b.n - a.n || String(a.title).localeCompare(String(b.title), 'en', {numeric: true});
  const units = byTree
    ? T.modules.map((m, i) => { const g = m.group, platform = g.role === 'platform', x = serves.get(g.id), served = [...(x?.values() || [])].reduce((a, b) => a + b, 0); return {id: g.id, ref: g.id, title: g.title, platform, n: own.get(g.id) || 0, served, servedIn: x?.size || 0, parts: m.children.map(s => ({id: s.id, title: s.title, n: inSub.get(s.id) || 0})).sort(byCount), word: 'sub-module', order: i, record: g, type: 'requirement-group'}; })
    : list(p.logical?.groups).map((g, i) => { const rs = list(p.logical?.responsibilities).filter(r => r.groupId === g.id); return {id: g.id, ref: O(g.id)?.ref || g.id, title: g.title || g.id, platform: false, n: new Set(rs.flatMap(r => list(r.requirementIds))).size, served: 0, parts: rs.map(r => ({id: r.id, title: r.title || r.id, n: list(r.requirementIds).length})).sort(byCount), word: 'responsibility', order: i, record: g, type: 'module'}; });
  if (!units.length) { D.notes.push('No module structure is recorded yet: Chapter 1 proposes one from the requirements’ columns, or Chapter 4 groups the responsibilities.'); return; }
  // Above `most` boxes, the smallest business modules stand together (platform modules are few, one per concern, and
  // stay unless they alone pass half the boxes).
  const platform = units.filter(u => u.platform), business = units.filter(u => !u.platform), weight = u => u.n + u.served, big = (a, b) => weight(b) - weight(a) || a.order - b.order;
  let keepP = platform.length, keepB = business.length;
  if (units.length > most) { keepP = Math.min(platform.length, Math.max(1, Math.floor(most / 2))); keepB = Math.max(1, most - keepP - (platform.length > keepP ? 1 : 0) - 1); }
  // (a box of one would only stand for the module it holds: that module stays itself)
  if (platform.length - keepP === 1) keepP++; if (business.length - keepB === 1) keepB++;
  const keptP = new Set(platform.slice().sort(big).slice(0, keepP).map(u => u.id)), keptB = new Set(business.slice().sort(big).slice(0, keepB).map(u => u.id));
  // What the map draws, for a caller that draws it smaller (sdd-figures.js moduleMapFigures).
  D.map = {modules: units.length, platform: platform.length, kept: keptB.size + keptP.size, lines, by: byTree ? 'module' : 'responsibility group'};
  const unitOf = new Map(), MW = MAP.W, kind = u => (byTree ? (u.platform ? 'Platform module' : 'Business module') : 'Responsibility group');
  // People first, then the external systems by kind, together in one dashed band above the system: each a box like a
  // module's, with its count and the most connected of its members.
  const actors = ofType('actor'), parties = ofType('party'), contracts = ofType('contract'), touches = new Map();
  for (const c of contracts) for (const id of [c.record?.from, c.record?.to]) if (id) touches.set(id, (touches.get(id) || 0) + 1);
  const kinds = new Map();
  for (const pt of parties) { const k = PARTY_KINDS.includes(pt.record?.kind) ? pt.record.kind : ''; if (!kinds.has(k)) kinds.set(k, []); kinds.get(k).push(pt); }
  if (actors.length || parties.length) { const g = group('map:outside', 'external', actors.length && parties.length ? 'People and external systems' : actors.length ? 'People' : 'External systems', {sub: parties.length ? 'external systems by kind' : ''}); g.grid = true; }
  // (a box keeps its kind's own kicker, which it does not draw: a code export names the kind by it, and its reader reads it back)
  const outside = (id, kind, title, xs, sub, type) => { const n = node(id, kind, title, {sub, group: 'map:outside', type}); n.listing = {list: xs.slice(0, lines).map(x => ({id: x.id, ref: '', title: x.title})), count: xs.length, n: xs.length, compact: true, w: MW}; return n; };
  if (actors.length) outside('map:actors', 'actor', 'Actors', actors, plural(actors.length, 'actor'), 'actor-group');
  const kindOf = new Map();
  for (const k of [...PARTY_KINDS, ''].filter(k => kinds.has(k))) {
    const xs = kinds.get(k).slice().sort((a, b) => (touches.get(b.id) || 0) - (touches.get(a.id) || 0)), id = 'map:parties:' + (k || 'none');
    outside(id, 'physicalApp', partyGroupTitle(k), xs, plural(xs.length, 'external system'), 'party-kind');
    for (const pt of xs) kindOf.set(pt.id, id);
  }
  // The system: its business modules, then the platform band. Its boxes say what they are, so its key keys the lines.
  const sys = group('map:system', 'system', O(M.root)?.title || p.name || 'The system', {sub: byTree ? 'Business modules' : 'Responsibility groups'}); sys.grid = true; D.grid = true; D.key = 'relationships';
  // A platform module's last line counts the requirements it serves in the business modules (a platform module that owns
  // none of its own shows that instead of a count of none); its sub-line, read in its title, says in how many modules.
  const box = (u, gid) => { const n = node(u.id, 'logicalApp', u.title, {sub: [kind(u), plural(u.n, 'requirement'), u.parts.length ? plural(u.parts.length, u.word) : '', u.served ? `serves ${plural(u.served, 'requirement')} in ${plural(u.servedIn, 'module')}` : ''].filter(Boolean).join(' · '), ref: u.ref, group: gid, record: u.record, type: u.type}); n.listing = {list: u.parts.slice(0, lines), count: u.parts.length, n: u.n || !u.served ? u.n : null, compact: true, w: MW, ...(u.served ? {note: `${fmt(u.served)} served`} : {})}; unitOf.set(u.id, u.id); return n; };
  const others = (us, gid, word) => { if (!us.length) return; const id = 'map:other:' + gid, n = node(id, 'logicalApp', `Other ${word} (${us.length})`, {sub: plural(us.reduce((t, u) => t + u.n, 0), 'requirement'), group: gid, type: 'module-group'}); n.listing = {list: us.slice().sort(big).slice(0, Math.max(lines, 1)).map(u => ({id: u.id, ref: '', title: u.title, n: u.n})), count: us.length, n: us.reduce((t, u) => t + u.n, 0), compact: true, w: MW}; for (const u of us) unitOf.set(u.id, id); };
  for (const u of business) if (keptB.has(u.id)) box(u, 'map:system');
  others(business.filter(u => !keptB.has(u.id)), 'map:system', byTree ? 'business modules' : 'responsibility groups');
  if (platform.length) {
    const band = group('map:platform', 'module', 'Platform modules', {sub: 'shared services the business modules use', parent: 'map:system'}); band.grid = true;
    for (const u of platform) if (keptP.has(u.id)) box(u, 'map:platform');
    others(platform.filter(u => !keptP.has(u.id)), 'map:platform', 'platform modules');
  }
  // The lines: through the design where it has drafted the modules, else what the platform modules serve. A component
  // stands in its module as module-scope.js places it (recordModules: the first in the tree's order when it is in
  // several), an external system in the box of its kind (where it is drawn), whatever module its contracts reach.
  const RM = byTree ? recordModules(p) : null, rank = new Map(units.map(u => [u.id, u.order]));
  const homeOf = id => { if (!byTree) { const g = componentModule(id); return g ? unitOf.get(g) || null : null; } const ms = RM.get(id)?.modules; if (!ms?.length) return null; const m = ms.length === 1 ? ms[0] : ms.slice().sort((a, b) => (rank.get(a) ?? 1e9) - (rank.get(b) ?? 1e9))[0]; return unitOf.get(m) || null; };
  const drafted = ofType('component').some(c => homeOf(c.id)), pairs = new Map(), endOf = id => kindOf.get(id) || homeOf(id);
  const add = (from, to, kind, n = 1) => { if (!from || !to || from === to) return; const k = from + '>' + to; const x = pairs.get(k) || {from, to, kind, n: 0}; x.n += n; pairs.set(k, x); };
  if (drafted) for (const c of contracts) { const a = c.record?.from, b = c.record?.to; if (!(kindOf.has(a) && kindOf.has(b))) add(endOf(a), endOf(b), 'uses'); }
  else for (const [pm, x] of serves) for (const [bm, n] of x) add(unitOf.get(pm), unitOf.get(bm), 'serves', n);
  // The heaviest lines first, each box keeping `links` at most, the page `edges`.
  const all = [...pairs.values()].sort((a, b) => b.n - a.n || String(a.from + '>' + a.to).localeCompare(String(b.from + '>' + b.to))), held = new Map(), shown = [];
  for (const x of all) { if (shown.length >= edgeMax) break; if ((held.get(x.from) || 0) >= links || (held.get(x.to) || 0) >= links) continue; shown.push(x); for (const id of [x.from, x.to]) held.set(id, (held.get(id) || 0) + 1); }
  for (const x of shown) { const e = edge(x.from, x.to, x.n === 1 ? (x.kind === 'uses' ? 'uses' : 'serves') : `${x.kind} ×${fmt(x.n)}`, {kind: x.kind, id: 'map:' + x.from + '>' + x.to}); if (e) { e.aggregate = true; e.fullLabel = x.kind === 'uses' ? `uses, through ${plural(x.n, 'contract')} between their components` : `serves ${plural(x.n, 'requirement')} of it`; } }
  // What the map says about itself, the most important first (a printed figure carries the first notes).
  if (!byTree) D.notes.push('No module structure is recorded in the requirements yet: the Chapter 4 responsibility groups stand for the modules.');
  else if (T.state !== 'accepted') D.notes.push(`${T.state === 'mixed' ? 'Part of the module structure is' : 'The module structure is'} proposed by AIW, not yet accepted by a person (Chapter 1).`);
  if (byTree && T.unassigned.length) D.notes.push(`${plural(T.unassigned.length, 'requirement')} ${T.unassigned.length === 1 ? 'is' : 'are'} in no module (Chapter 1 lists ${T.unassigned.length === 1 ? 'it' : 'them'}).`);
  const folded = units.length - keptB.size - keptP.size;
  if (folded) D.notes.push(`The ${fmt(folded)} smallest ${byTree ? 'modules' : 'groups'} stand together in ${keptB.size < business.length && keptP.size < platform.length ? 'two boxes' : 'one box'}.`);
  if (!drafted && byTree && all.length) D.notes.push('Nothing is drafted yet: a line joins a platform module to a business module whose requirements it serves.');
  const left = all.length - shown.length;
  if (left) D.notes.push(`${plural(left, 'lighter link')} ${left === 1 ? 'is' : 'are'} not drawn (each box keeps its ${plural(links, 'heaviest', 'heaviest')})${drafted ? '; the container and component views draw every contract.' : '; each platform box counts the requirements it serves.'}`);
}

// The header strip of the standard: what the project records about itself, and nothing more.
function header(p) {
  const w = p.workspace || {};
  return {model: text(p.name, 80), template: 'AIW notation · TOGAF element types · ArchiMate relationships', author: text(p.owner || w.owner || p.brief?.owner || '', 60), created: text(p.createdAt || w.createdAt || '', 30), modified: text(p.updatedAt || w.updatedAt || '', 30), version: p.contentVersion != null ? 'v' + p.contentVersion : '', baseline: ''};
}

// A diagram stripped to the layers wanted: nodes of other layers go, with their edges; groups of
// other layers open up (their nodes stay, ungrouped).
// A list given is the reader's choice, even when empty (every layer hidden draws nothing); no list keeps every layer.
export function stripToLayers(D, layers) {
  const keep = new Set(Array.isArray(layers) ? layers : LAYERS);
  const nodes = D.nodes.filter(n => keep.has(n.layer)), ids = new Set(nodes.map(n => n.id));
  const groups = D.groups.filter(g => keep.has(g.layer));
  const gids = new Set(groups.map(g => g.id));
  const out = {...D, nodes: nodes.map(n => (n.group && !gids.has(n.group) ? {...n, group: groups.find(g => g.id === D.groups.find(x => x.id === n.group)?.parent)?.id || null} : n)), groups: groups.map(g => (g.parent && !gids.has(g.parent) ? {...g, parent: null} : g)), edges: D.edges.filter(e => ids.has(e.from) && ids.has(e.to))};
  out.counts = {nodes: out.nodes.length, groups: out.groups.length, edges: out.edges.length, hidden: D.nodes.length - out.nodes.length};
  return out;
}
// A diagram reduced to one element and its neighbourhood (n hops along the edges), or to one group.
export function focusDiagram(D, {id = null, hops = 1, groupId = null} = {}) {
  let keep;
  if (groupId) { const inside = new Set(D.groups.filter(g => g.id === groupId || g.parent === groupId).map(g => g.id)); keep = new Set(D.nodes.filter(n => inside.has(n.group)).map(n => n.id)); }
  else if (id && D.nodes.some(n => n.id === id)) { keep = new Set([id]); for (let h = 0; h < hops; h++) { const ring = new Set(keep); for (const e of D.edges) { if (ring.has(e.from)) keep.add(e.to); if (ring.has(e.to)) keep.add(e.from); } } }
  else return D;
  const nodes = D.nodes.filter(n => keep.has(n.id)), used = new Set(nodes.map(n => n.group).filter(Boolean));
  for (const g of D.groups) if (used.has(g.id) && g.parent) used.add(g.parent);
  const out = {...D, nodes, groups: D.groups.filter(g => used.has(g.id)), edges: D.edges.filter(e => keep.has(e.from) && keep.has(e.to))};
  out.counts = {nodes: out.nodes.length, groups: out.groups.length, edges: out.edges.length, hidden: D.nodes.length - out.nodes.length};
  return out;
}

// What the viewpoint says about itself: audience, purpose, and a readiness read from the picture.
export function viewpointOf(D) {
  const s = D.scene, hatched = D.nodes.filter(n => n.hatched).length;
  const readiness = !D.nodes.length ? 'empty' : hatched || D.notes.length ? 'partial' : 'drawn';
  const because = [!D.nodes.length ? 'nothing is recorded for this picture yet' : '', hatched ? `${hatched} element${hatched === 1 ? '' : 's'} not chosen, placed or selected` : '', ...D.notes].filter(Boolean);
  const notation = s.id === 'process' ? 'BPMN conventions for process flow, with AIW records and extensions.' : ['sequence', 'lifecycle'].includes(s.id) ? 'UML conventions for interaction or state, with AIW records and extensions.' : ['context', 'container'].includes(s.id) ? 'C4 conventions for system context and containers, with AIW records and extensions.' : 'ArchiMate-inspired element and relationship conventions, with AIW record types and extensions.';
  return {id: s.id, title: s.title, standard: s.standard, audience: s.audience, purpose: s.purpose, notation, method: 'TOGAF informs stakeholder concerns and viewpoint selection; it does not prescribe this diagram notation.', readiness, because};
}

// A plain reading of an element for the companion, the hover tip and the text alternative.
const say = (D, e, to) => { const q = e.qualifier ? ` (${e.qualifier})` : ''; return e.kind === 'path' ? `reaches ${to} over ${e.label}${q} as step ${e.step}` : e.kind === 'message' && e.step ? `${e.reply ? 'answers' : 'sends'} ${to} “${e.label}”${q} as message ${e.step}` : e.kind === 'flow' || e.kind === 'sequence' ? `hands ${to} “${e.label || 'then'}”${q}` : `${e.label} ${to}${q}`; };
export function describeNode(D, id) {
  const n = D.nodes.find(x => x.id === id); if (!n) return '';
  const name = x => D.nodes.find(y => y.id === x)?.title || x;
  const out = D.edges.filter(e => e.from === id).map(e => say(D, e, name(e.to)));
  const inn = D.edges.filter(e => e.to === id && e.from !== id).map(e => { const from = name(e.from); const q = e.qualifier ? ` (${e.qualifier})` : ''; return e.kind === 'path' ? `${from} reaches it over ${e.label}${q}` : e.kind === 'message' && e.step ? `${from} ${e.reply ? 'answers' : 'sends'} it “${e.label}”${q} as message ${e.step}` : e.kind === 'flow' || e.kind === 'sequence' ? `${from} hands it “${e.label || 'then'}”${q}` : `${from} ${e.label} it${q}`; });
  const g = D.groups.find(g => g.id === n.group);
  return [`${n.kicker || KINDS[n.kind]?.short || 'Element'}${n.ref ? ' ' + n.ref : ''}: ${n.fullTitle || n.title}${n.sub ? ' (' + n.sub + ')' : ''}.`, glyphWords(n), g ? `In ${g.title}.` : '', n.attachedTo ? `Attached to ${name(n.attachedTo)}.` : '', out.length ? 'It ' + out.join('; ') + '.' : '', inn.length ? inn.join('; ') + '.' : '', n.hatched ? 'Not chosen or not placed yet.' : ''].filter(Boolean).join(' ');
}
// The words of a BPMN glyph (round 6): the event's position and type, the gateway's type.
export const glyphWords = n => (!n?.glyph ? '' : n.glyph.gatewayType ? `${n.glyph.gatewayType[0].toUpperCase() + n.glyph.gatewayType.slice(1)} gateway.` : `${(n.glyph.position || 'intermediate')[0].toUpperCase() + (n.glyph.position || 'intermediate').slice(1)} event${n.glyph.eventType && n.glyph.eventType !== 'none' ? ' (' + n.glyph.eventType + ')' : ''}.`);
export function describeEdge(D, id) {
  const e = D.edges.find(x => x.id === id); if (!e) return '';
  const name = x => D.nodes.find(y => y.id === x)?.title || x, st = styleOf(e.kind);
  const card = e.cardinality ? ` ${e.cardinality.from} : ${e.cardinality.to}.` : '';
  const type = e.archimate?.type ? ` ArchiMate ${e.archimate.type}${e.archimate.valid === false ? ' (the recorded kind is not allowed here)' : ''}.` : '';
  return `${name(e.from)} ${e.label || st.label} ${name(e.to)}${e.qualifier ? ' (' + e.qualifier + ')' : ''}.${e.step ? (e.kind === 'message' ? ` Message ${e.step}${e.reply ? ', a response' : ''}.` : ` Step ${e.step}.`) : ''}${card} ${st.family[0].toUpperCase() + st.family.slice(1)} relationship${e.weak ? ', attenuated' : ''}${e.crossing ? ', crossing a trust boundary' : ''}.${type}`;
}

// Two pictures of the same scene (a frozen baseline and the working document, or two baselines)
// as one: every element and relationship keyed by id, classed added, removed, changed or same.
export function notationDiff(A, B) {
  if (!A || !B) return null;
  const nodes = new Map(), edges = new Map();
  const nodeSig = n => [n.title, n.sub, n.group, n.hatched, n.kind].join('\u0001'), edgeSig = e => [e.label, e.kind, e.weak, e.qualifier].join('\u0001');
  for (const n of B.nodes) nodes.set(n.id, {...n, change: 'added'});
  for (const n of A.nodes) { const b = nodes.get(n.id); if (!b) nodes.set(n.id, {...n, change: 'removed', hatched: true}); else b.change = nodeSig(n) === nodeSig(b) ? 'same' : 'changed'; }
  const groups = [...B.groups]; for (const g of A.groups) if (!groups.some(x => x.id === g.id)) groups.push({...g});
  for (const e of B.edges) edges.set(e.id, {...e, change: 'added'});
  for (const e of A.edges) { const b = edges.get(e.id); if (!b) edges.set(e.id, {...e, change: 'removed', weak: true}); else b.change = edgeSig(e) === edgeSig(b) ? 'same' : 'changed'; }
  const out = {...B, nodes: [...nodes.values()], groups, edges: [...edges.values()].filter(e => nodes.has(e.from) && nodes.has(e.to)), diff: true};
  for (const n of out.nodes) if (n.group && !out.groups.some(g => g.id === n.group)) n.group = null;
  const changes = [...out.nodes.filter(n => n.change !== 'same').map(n => ({kind: 'element', id: n.id, title: n.title, change: n.change})), ...out.edges.filter(e => e.change !== 'same').map(e => ({kind: 'relationship', id: e.id, title: `${nodes.get(e.from)?.title || e.from} ${e.label} ${nodes.get(e.to)?.title || e.to}`, change: e.change}))];
  out.changes = changes;
  out.counts = {nodes: out.nodes.length, groups: out.groups.length, edges: out.edges.length, added: changes.filter(c => c.change === 'added').length, removed: changes.filter(c => c.change === 'removed').length, changed: changes.filter(c => c.change === 'changed').length};
  return out;
}
