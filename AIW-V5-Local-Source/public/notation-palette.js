// One vocabulary for every picture of the same record: the notation kind and its kicker, the short
// name the chapter maps and the explorer use, the fill the Diagram and the SDD figure use, the ink
// the explorer and the anatomy use, the icon, the ArchiMate 3.2 type and the C4 type. The Diagram,
// the Key, the SVG export, the code exports, the connected explorer and the anatomy read this table;
// none keeps a palette of its own. A record type is typed by its recorded attributes, never by a
// guess (a capability by its recorded category, a contract by its operation and protocol).

// Fills of the standard, by family (light, for the element boxes on screen and in the export).
export const FAMILY_FILL = {
  application: '#c7d3e6', 'application-logical': '#8ea6c8', service: '#d4e7ee', 'data-logical': '#b9a9d0', data: '#f4c9a4', 'data-entity': '#dbe3ee',
  technology: '#bcd4a6', 'technology-physical': '#9fc487', 'technology-service': '#e6e79a', business: '#f2c9a3', 'business-dark': '#3d6fb0',
  process: '#d9e7f2', intent: '#e6e2f2', decision: '#e2d6ea', security: '#e7d2df', threat: '#f0d2c8', deployment: '#cfdce8',
  'bpmn-task': '#eef1ee', 'bpmn-event': '#ffffff', 'bpmn-gateway': '#ffffff', implementation: '#f3dcd6', strategy: '#efe3c6'
};
// Inks, by family (dark, for chips, legends and the explorer's cards).
export const FAMILY_INK = {
  application: '#2f6177', 'application-logical': '#286954', service: '#9b6643', 'data-logical': '#776097', data: '#6f5a93', 'data-entity': '#776097',
  technology: '#66733a', 'technology-physical': '#7a5f33', 'technology-service': '#69773a', business: '#687b66', 'business-dark': '#234e42',
  process: '#376857', intent: '#587448', decision: '#805d83', security: '#99677e', threat: '#a06450', deployment: '#3f6d86',
  'bpmn-task': '#376857', 'bpmn-event': '#688199', 'bpmn-gateway': '#9c7540', implementation: '#8c5a52', strategy: '#8a6a2a'
};
// Icons, by family: 24-unit stroke paths, drawn with currentColor.
export const ICONS = {
  application: 'M4 5h16v14H4zM4 9h16', 'application-logical': 'M4 5h16v14H4zM4 9h16M9 9v10', service: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 8v8M8 12h8',
  data: 'M12 3c-4.4 0-8 1.3-8 3v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6c0-1.7-3.6-3-8-3M4 6c0 1.7 3.6 3 8 3s8-1.3 8-3M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  'data-logical': 'M5 4h14v16H5zM8 9h8M8 13h8M8 17h5', 'data-entity': 'M4 6h16v12H4zM4 11h16M9 6v12',
  technology: 'M6 6h12v12H6zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4', 'technology-physical': 'M4 4h16v6H4zM4 14h16v6H4zM7 7h.01M7 17h.01',
  'technology-service': 'M12 2 2 7l10 5 10-5-10-5M2 17l10 5 10-5M2 12l10 5 10-5',
  business: 'M12 3a3 3 0 1 0 0 6 3 3 0 1 0 0-6M6 21v-6a6 6 0 0 1 12 0v6', 'business-dark': 'M3 12h13m-4-5 5 5-5 5', process: 'M3 6h11l4 6-4 6H3l4-6z',
  intent: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7m-7 4h7', decision: 'M12 2 2 12l10 10 10-10z', security: 'M12 2 3 7v6c0 5 4 8 9 9 5-1 9-4 9-9V7zM9 12l2 2 4-4',
  threat: 'M12 3 2 21h20zM12 9v5M12 17h.01', deployment: 'M7 18a5 5 0 0 1-.5-10 7 7 0 0 1 13 1.5A4 4 0 0 1 18 18z',
  'bpmn-task': 'M4 5h16v14H4zM7 10h10m-10 4h7', 'bpmn-event': 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18', 'bpmn-gateway': 'M12 2 22 12 12 22 2 12zM8 12h8',
  group: 'M3 3h7v7H3zM14 14h7v7h-7zM6 10v8h8', evidence: 'M5 4h14v16H5zM8 10l2 2 5-5M8 16h8',
  implementation: 'M5 21V4h12l-2 4 2 4H5', strategy: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 12h.01'
};
export const iconSVG = (family, cls = '') => (ICONS[family] ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${cls ? ` class="${cls}"` : ''}><path d="${ICONS[family]}"/></svg>` : '');

// The element kinds of the standard: kicker, family, model layer, level (the layered arrangement's
// band order), the ArchiMate 3.2 type and the C4 type the exports write.
export const KINDS = {
  physicalApp: {kicker: 'Physical application component', short: 'Component', family: 'application', layer: 'physical', level: 2, archimate: 'ApplicationComponent', c4: 'container'},
  logicalApp: {kicker: 'Logical application component', short: 'Responsibility', family: 'application-logical', layer: 'logical', level: 2, archimate: 'ApplicationComponent', c4: 'component'},
  appService: {kicker: 'Application service', short: 'Interface', family: 'service', layer: 'interface', level: 3, archimate: 'ApplicationService', c4: 'relationship'},
  logicalData: {kicker: 'Logical data component', short: 'Data', family: 'data-logical', layer: 'data', level: 4, archimate: 'DataObject', c4: 'component'},
  physicalData: {kicker: 'Physical data component', short: 'Store', family: 'data', layer: 'data', level: 4, archimate: 'Artifact', c4: 'container'},
  dataEntity: {kicker: 'Data entity', short: 'Entity', family: 'data-entity', layer: 'data', level: 4, archimate: 'BusinessObject', c4: 'component'},
  logicalTech: {kicker: 'Logical technology component', short: 'Capability', family: 'technology', layer: 'technology', level: 5, archimate: 'Node', c4: 'container'},
  physicalTech: {kicker: 'Physical technology component', short: 'Product', family: 'technology-physical', layer: 'technology', level: 6, archimate: 'SystemSoftware', c4: 'container'},
  techService: {kicker: 'Technology service', short: 'Capability', family: 'technology-service', layer: 'technology', level: 5, archimate: 'TechnologyService', c4: 'container'},
  businessService: {kicker: 'Business service', short: 'Service', family: 'business', layer: 'process', level: 0, archimate: 'BusinessService', c4: 'none'},
  process: {kicker: 'Process', short: 'Process', family: 'process', layer: 'process', level: 1, archimate: 'BusinessProcess', c4: 'none'},
  actor: {kicker: 'Actor', short: 'Actor', family: 'business', layer: 'process', level: 0, archimate: 'BusinessActor', c4: 'person'},
  outcome: {kicker: 'Value stream', short: 'Outcome', family: 'business-dark', layer: 'process', level: 0, archimate: 'Outcome', c4: 'none'},
  requirement: {kicker: 'Requirement', short: 'Requirement', family: 'intent', layer: 'process', level: 0, archimate: 'Requirement', c4: 'none'},
  quality: {kicker: 'Quality scenario', short: 'Quality', family: 'intent', layer: 'process', level: 0, archimate: 'Requirement', c4: 'none'},
  decision: {kicker: 'Decision', short: 'Decision', family: 'decision', layer: 'process', level: 1, archimate: 'Assessment', c4: 'none'},
  alternative: {kicker: 'Alternative', short: 'Alternative', family: 'decision', layer: 'process', level: 2, archimate: 'Assessment', c4: 'none'},
  control: {kicker: 'Security control', short: 'Control', family: 'security', layer: 'security', level: 3, archimate: 'Requirement', c4: 'none'},
  threat: {kicker: 'Threat', short: 'Threat', family: 'threat', layer: 'security', level: 3, archimate: 'Assessment', c4: 'none'},
  placement: {kicker: 'Placement', short: 'Placement', family: 'deployment', layer: 'deployment', level: 7, archimate: 'Node', c4: 'deploymentNode'},
  evidence: {kicker: 'Evidence', short: 'Evidence', family: 'intent', layer: 'process', level: 0, archimate: 'Assessment', c4: 'none'},
  task: {kicker: '', short: 'Task', family: 'bpmn-task', layer: 'process', level: 1, archimate: 'BusinessProcess', c4: 'none'},
  event: {kicker: '', short: 'Event', family: 'bpmn-event', layer: 'process', level: 1, archimate: 'BusinessEvent', c4: 'none'},
  gateway: {kicker: '', short: 'Gateway', family: 'bpmn-gateway', layer: 'process', level: 1, archimate: 'OrJunction', c4: 'none'},
  // Round 6 (Contract T): a collapsed sub-process (a task that holds a process), a lifeline of the sequence picture and
  // a state of a data definition's lifecycle.
  subprocess: {kicker: '', short: 'Sub-process', family: 'bpmn-task', layer: 'process', level: 1, archimate: 'BusinessProcess', c4: 'none'},
  lifeline: {kicker: 'Lifeline', short: 'Lifeline', family: 'application', layer: 'interface', level: 2, archimate: 'ApplicationComponent', c4: 'container'},
  state: {kicker: 'State', short: 'State', family: 'data-logical', layer: 'data', level: 4, archimate: 'DataObject', c4: 'component'},
  // rc41 (W1; PLAN §2 W1.3): the Implementation & Migration elements of Chapter 11's records (a plateau, a delivery action as
  // a work package) and a course of action for a record kept as strategy. Their repository layer stays an AIW layer (the
  // sidebar's filters); their concern band is the standard's (layers-view.js VIEW_BANDS).
  plateau: {kicker: 'Plateau', short: 'Plateau', family: 'implementation', layer: 'deployment', level: 7, archimate: 'Plateau', c4: 'none'},
  workPackage: {kicker: 'Work package', short: 'Delivery action', family: 'implementation', layer: 'deployment', level: 7, archimate: 'WorkPackage', c4: 'none'},
  courseOfAction: {kicker: 'Course of action', short: 'Strategy', family: 'strategy', layer: 'process', level: 0, archimate: 'CourseOfAction', c4: 'none'}
};
// The groups of the standard: an application, a module, an external system, a trust zone, an
// environment, a site or cluster, a capability family, a swimlane, a pool.
export const GROUP_KINDS = {
  system: {layer: 'physical', label: 'application', archimate: 'ApplicationComponent'}, module: {layer: 'logical', label: 'module', archimate: 'Grouping'},
  external: {layer: 'interface', label: 'external system', archimate: 'ApplicationComponent'}, boundary: {layer: 'security', label: 'trust boundary', archimate: 'Grouping'},
  environment: {layer: 'deployment', label: 'environment', archimate: 'Grouping'}, zone: {layer: 'deployment', label: 'site or zone', archimate: 'Location'},
  lane: {layer: 'process', label: 'swimlane', archimate: 'BusinessRole'}, pool: {layer: 'process', label: 'pool', archimate: 'BusinessActor'},
  unplaced: {layer: 'deployment', label: 'not placed', archimate: 'Grouping'}, family: {layer: 'technology', label: 'capability family', archimate: 'Grouping'},
  node: {layer: 'deployment', label: 'hosting node', archimate: 'Node'},
  subprocess: {layer: 'process', label: 'sub-process', archimate: 'BusinessProcess'}, record: {layer: 'data', label: 'data definition', archimate: 'Grouping'}
};

// A capability's kind comes from its recorded category: what reaches other parts or decides who
// may act is a technology service; what runs, keeps state or operates is a logical technology component.
export const CAPABILITY_KIND = {connectivity: 'techService', messaging: 'techService', identity: 'techService', compute: 'logicalTech', transactional: 'logicalTech', caching: 'logicalTech', backup: 'logicalTech', observability: 'logicalTech', recovery: 'logicalTech'};
export const capabilityKind = category => CAPABILITY_KIND[category] || 'logicalTech';

// Record type → notation kind (or group kind) → short name, ink, icon, ArchiMate and C4 type.
const T = (kind, label, extra = {}) => ({kind, label, family: (KINDS[kind] || GROUP_KINDS[kind])?.family || extra.family || 'business', ...extra});
export const PALETTE = {
  system: T('physicalApp', 'System', {c4: 'softwareSystem', group: 'system'}),
  module: {kind: null, group: 'module', label: 'Responsibility group', family: 'application-logical'},
  requirement: T('requirement', 'Requirement'), outcome: T('outcome', 'Outcome'), actor: T('actor', 'Actor'),
  journey: T('task', 'Journey step'), task: T('task', 'Process task'), gateway: T('gateway', 'Decision gateway'), event: T('event', 'Process event'),
  subprocess: T('subprocess', 'Sub-process'), dataObject: T('dataEntity', 'Process data object'),
  account: T('dataEntity', 'Process account'), claim: T('evidence', 'Source claim'), constraint: T('requirement', 'Constraint'), assumption: T('requirement', 'Assumption'),
  context: T('requirement', 'Context'), quality: T('quality', 'Quality scenario'), decision: T('decision', 'Decision'), alternative: T('alternative', 'Alternative'),
  responsibility: T('logicalApp', 'Responsibility'), component: T('physicalApp', 'Application component'),
  capability: T('logicalTech', 'Technology capability', {byCategory: true}), need: T('logicalTech', 'Technology need'),
  boundary: {kind: null, group: 'boundary', label: 'Trust boundary', family: 'security'},
  technology: T('physicalTech', 'Technology realization'), option: T('physicalTech', 'Technology option'),
  contract: T('appService', 'Interface contract'), data: T('logicalData', 'Data definition'), field: T('dataEntity', 'Data field'), exchange: T('appService', 'Data exchange'),
  party: T('physicalApp', 'External participant', {c4: 'externalSystem', group: 'external', family: 'application'}),
  control: T('control', 'Security control'), threat: T('threat', 'Threat'), risk: T('threat', 'Risk'),
  environment: {kind: null, group: 'environment', label: 'Environment', family: 'deployment'}, zone: {kind: null, group: 'zone', label: 'Deployment zone', family: 'deployment'},
  runtime: T('placement', 'Operating plan'), instance: T('placement', 'Planned placement'), path: {kind: null, edge: 'path', label: 'Runtime path', family: 'deployment'},
  plateau: T('plateau', 'Plateau'), action: T('workPackage', 'Delivery action'), migration: {kind: null, edge: 'transition', label: 'Migration', family: 'implementation'}, course: T('courseOfAction', 'Course of action'),
  evidence: T('evidence', 'Evidence'), pattern: T('decision', 'Applied design reasoning'), baseline: T('evidence', 'Frozen baseline'), view: T('evidence', 'Saved view')
};
// The ink of each record type: the accent the connected explorer, the anatomy, the chapter maps and
// the Diagram's top edge share, so one record reads in one colour everywhere. (Before round 2 the
// explorer and the anatomy kept their own; where they differed the anatomy's value is kept.)
export const TYPE_INK = {
  system: '#234e42', module: '#285e4b', requirement: '#587448', outcome: '#75618c', actor: '#687b66', journey: '#947334', task: '#376857', gateway: '#9c7540', event: '#688199', subprocess: '#376857', dataObject: '#80668d',
  account: '#80668d', claim: '#916e5c', constraint: '#976941', assumption: '#976941', context: '#697d80', quality: '#987431', decision: '#805d83', alternative: '#805d83',
  responsibility: '#286954', component: '#2f6177', capability: '#66733a', need: '#66733a', boundary: '#936180', technology: '#7a5f33', option: '#7a5f33',
  contract: '#9b6643', data: '#776097', field: '#776097', exchange: '#9b6643', party: '#687c82', control: '#99677e', threat: '#a06450', risk: '#a06450',
  environment: '#637f9c', zone: '#637f9c', runtime: '#3f6d86', instance: '#3f6d86', path: '#3f6d86', evidence: '#778478', pattern: '#805d83', baseline: '#697d80', view: '#697d80',
  plateau: '#8c5a52', action: '#8c5a52', migration: '#8c5a52', course: '#8a6a2a'
};
export const paletteOf = type => PALETTE[type] || {kind: 'requirement', label: type, family: 'intent'};
export const inkOf = type => TYPE_INK[type] || FAMILY_INK[paletteOf(type).family] || '#4c5852';
export const fillOf = type => FAMILY_FILL[paletteOf(type).family] || '#eeeeee';
export const iconOf = type => ICONS[paletteOf(type).family] || ICONS.group;
export const shortNameOf = type => paletteOf(type).label;

// The relationship styles of the standard: one line and one pair of ends per family, so a reader
// can tell realization from serving, flow from access, a dependency from a threat. `dash` is the
// stroke-dasharray, `head` the end marker at the target, `tail` the marker at the source.
// `up` says the target stands above the source in a hierarchy (a realizer below what it realizes,
// a server below what it serves), which the layered arrangements honour.
export const STYLES = {
  composes: {family: 'composition', label: 'composes', dash: '', head: 'none', tail: 'diamond', stroke: '#3c4a44', archimate: 'Composition'},
  aggregates: {family: 'composition', label: 'aggregates', dash: '', head: 'none', tail: 'diamond-open', stroke: '#3c4a44', archimate: 'Aggregation'},
  realizes: {family: 'realization', label: 'realizes', dash: '2 2', head: 'hollow', tail: 'none', stroke: '#3c4a44', archimate: 'Realization', up: true},
  implements: {family: 'realization', label: 'implements', dash: '2 2', head: 'hollow', tail: 'none', stroke: '#3c4a44', archimate: 'Realization'},
  fulfils: {family: 'realization', label: 'fulfils', dash: '2 2', head: 'hollow', tail: 'none', stroke: '#3c4a44', archimate: 'Realization', up: true},
  serves: {family: 'serving', label: 'serves', dash: '', head: 'open', tail: 'none', stroke: '#3c4a44', archimate: 'Serving', up: true},
  uses: {family: 'dependency', label: 'uses', dash: '7 4', head: 'open', tail: 'none', stroke: '#3c4a44', archimate: 'Serving', reverse: true},
  flow: {family: 'flow', label: 'flows to', dash: '7 4', head: 'filled', tail: 'none', stroke: '#3c4a44', archimate: 'Flow'},
  sequence: {family: 'sequence', label: 'then', dash: '', head: 'filled', tail: 'none', stroke: '#3c4a44', archimate: 'Triggering'},
  message: {family: 'message', label: 'message', dash: '5 3', head: 'open', tail: 'circle', stroke: '#3c4a44', archimate: 'Flow'},
  owns: {family: 'access', label: 'owns', dash: '1 3', head: 'small', tail: 'none', stroke: '#3c4a44', archimate: 'Access'},
  exchanges: {family: 'access', label: 'exchanges', dash: '1 3', head: 'small', tail: 'none', stroke: '#3c4a44', archimate: 'Access'},
  transforms: {family: 'access', label: 'transforms into', dash: '1 3', head: 'filled', tail: 'none', stroke: '#6f5a93', archimate: 'Flow'},
  dependsOn: {family: 'association', label: 'depends on', dash: '', head: 'half', tail: 'none', stroke: '#3c4a44', archimate: 'Association'},
  standsOn: {family: 'assignment', label: 'stands on', dash: '', head: 'filled', tail: 'dot', stroke: '#3c4a44', archimate: 'Assignment', reverse: true},
  hosts: {family: 'assignment', label: 'hosts', dash: '', head: 'filled', tail: 'dot', stroke: '#3c4a44', archimate: 'Assignment'},
  constrains: {family: 'influence', label: 'constrains', dash: '4 3', head: 'open', tail: 'none', stroke: '#587448', archimate: 'Influence'},
  justifies: {family: 'influence', label: 'justifies', dash: '4 3', head: 'open', tail: 'none', stroke: '#805d83', archimate: 'Influence'},
  considers: {family: 'association', label: 'considers', dash: '2 2', head: 'none', tail: 'none', stroke: '#8a7f90', archimate: 'Association'},
  selects: {family: 'sequence', label: 'selects', dash: '', head: 'filled', tail: 'none', stroke: '#805d83', archimate: 'Association'},
  evidences: {family: 'access', label: 'evidences', dash: '1 3', head: 'dot', tail: 'none', stroke: '#778478', archimate: 'Association'},
  protects: {family: 'protection', label: 'protects', dash: '', head: 'dot', tail: 'none', stroke: '#2f6b4f', archimate: 'Influence'},
  mitigates: {family: 'protection', label: 'mitigates', dash: '', head: 'open', tail: 'none', stroke: '#2f6b4f', archimate: 'Influence'},
  threatens: {family: 'threat', label: 'threatens', dash: '6 3', head: 'filled', tail: 'none', stroke: '#b0493a', archimate: 'Influence'},
  path: {family: 'path', label: 'reaches over', dash: '', head: 'filled', tail: 'none', stroke: '#b0493a', archimate: 'Flow', numbered: true},
  accesses: {family: 'access', label: 'accesses', dash: '1 3', head: 'open', tail: 'none', stroke: '#6f5a93', archimate: 'Access'},
  transition: {family: 'sequence', label: 'moves to', dash: '', head: 'filled', tail: 'none', stroke: '#6f5a93', archimate: 'Triggering'},
  relation: {family: 'association', label: 'relates to', dash: '', head: 'none', tail: 'none', stroke: '#3c4a44', archimate: 'Association'}
};
export const styleOf = kind => STYLES[kind] || STYLES.relation;
// The style families, in the order the Key lists them, with a plain reading.
export const STYLE_FAMILIES = [
  ['composition', 'Composition · a whole and its parts'], ['realization', 'Realization · what makes something real'], ['serving', 'Serving · a capability at the service of a part'],
  ['dependency', 'Dependency · a consumer of a service'], ['flow', 'Flow · work or data handed on'], ['sequence', 'Sequence · one step, then the next'], ['message', 'Message · a call across a pool'],
  ['access', 'Access · data read, written or carried'], ['assignment', 'Assignment · where a part runs'], ['association', 'Association · a recorded link'],
  ['influence', 'Influence · a driver shaping an element'], ['protection', 'Protection · a control at work'], ['threat', 'Threat · a threat on its target'], ['path', 'Runtime path · numbered, in call order']
];
// Markers, defined once for screen and export; `id` prefix keeps them unique per document.
export const MARKERS = [
  ['filled', '<path d="M1 1 9 5 1 9z" fill="{c}"/>', 9], ['hollow', '<path d="M1 1 9 5 1 9z" fill="#fff" stroke="{c}" stroke-width="1.2"/>', 9],
  ['open', '<path d="M1 1 9 5 1 9" fill="none" stroke="{c}" stroke-width="1.4"/>', 9], ['small', '<path d="M3 2 8 5 3 8" fill="none" stroke="{c}" stroke-width="1.3"/>', 8],
  ['half', '<path d="M1 1 9 5" fill="none" stroke="{c}" stroke-width="1.4"/>', 9], ['dot', '<circle cx="5" cy="5" r="3" fill="{c}"/>', 8],
  // A start mark too (the diamonds and the circle, drawn at the source with orient auto-start-reverse): the marker's +x
  // then points away from the line at either end, so each shape's far x is its refX and the shape lies along the line,
  // outside the element (the review of round 10: at refX 1 and 2 they stood inside the source box).
  ['diamond', '<path d="M1 5 5 1 9 5 5 9z" fill="{c}"/>', 9], ['diamond-open', '<path d="M1 5 5 1 9 5 5 9z" fill="#fff" stroke="{c}" stroke-width="1.2"/>', 9],
  ['circle', '<circle cx="5" cy="5" r="3" fill="#fff" stroke="{c}" stroke-width="1.2"/>', 8]
];
// `kinds` (the relationship kinds drawn) limits the markers to those in use; without it, all.
export function markerDefs(prefix = 'nt', kinds = null) {
  const want = kinds ? new Set([...kinds].flatMap(k => { const s = styleOf(k); return [s.head, s.tail, s.head === 'none' ? 'open' : s.head].filter(m => m && m !== 'none').map(m => m + '|' + s.stroke); })) : null;
  const colours = [...new Set(Object.values(STYLES).map(s => s.stroke))];
  return colours.map(c => MARKERS.filter(([m]) => !want || want.has(m + '|' + c)).map(([m, body, refX]) => `<marker id="${prefix}-${m}-${c.slice(1)}" viewBox="0 0 10 10" refX="${refX}" refY="5" markerWidth="${m.startsWith('diamond') ? 10 : 8}" markerHeight="${m.startsWith('diamond') ? 10 : 8}" orient="auto-start-reverse">${body.replace(/\{c\}/g, c)}</marker>`).join('')).join('');
}
export const markerRef = (prefix, marker, stroke) => (marker && marker !== 'none' ? `url(#${prefix}-${marker}-${stroke.slice(1)})` : '');

// ArchiMate 3.1 relationship rules, the subset the exporters and the connected model's typing need: a relationship
// is written (and counts as valid) with its own type only where the specification allows it between the two element
// types; otherwise it is written as an Association that keeps the AIW kind as a property, and the report says so. The
// table is deliberately conservative: a tool that checks relationships on import (Archi does) opens every file this
// writes. Round 6 (Contract T) adds Specialization, the realization chain inside the motivation layer (a requirement
// realizes an outcome, an outcome a goal) and influence between a motivation element and a core element, which the
// 3.1 text allows and the Chapter 1 links (a constraint constrains a journey step) record; each rule names itself.
// Round 12 (GR-CMP-09) adds an application component serving or realizing a business process: both are derived
// relationships the 3.1 tables allow, and they are how a responsibility answers for a journey step.
const MOTIVATION = new Set(['Stakeholder', 'Driver', 'Assessment', 'Goal', 'Outcome', 'Principle', 'Requirement', 'Constraint', 'Meaning', 'Value']);
const REALIZABLE_MOTIVATION = new Set(['Requirement', 'Constraint', 'Outcome', 'Goal', 'Principle']);
const OTHER = new Set(['Grouping', 'Location', 'AndJunction', 'OrJunction']);
const isCore = t => !MOTIVATION.has(t) && !OTHER.has(t);
const any = (list, s, t) => list.some(([a, b]) => (a === '*' || a === s) && (b === '*' || b === t));
const BEHAVIOUR_FLOW = new Set(['ApplicationComponent', 'ApplicationFunction', 'ApplicationProcess']);
const BUSINESS_FLOW = new Set(['BusinessProcess', 'BusinessEvent', 'BusinessFunction', 'BusinessActor', 'BusinessRole', 'OrJunction', 'AndJunction']);
const TECH_FLOW = new Set(['Node', 'SystemSoftware', 'TechnologyService', 'Device', 'Path', 'CommunicationNetwork']);
// The core elements by aspect (ArchiMate 3.2 §3.4, chapters 8 to 11): active structure (actors, roles, collaborations,
// interfaces, components, nodes, devices, system software, networks, equipment, facilities), behaviour (processes,
// functions, interactions, events, services) and passive structure (business and data objects, contracts,
// representations, artifacts, material). rc41 close (C14): the views' aspect columns read an element's aspect from here,
// so a box, its column and the exchange agree on what the element is.
const ACTIVE_STRUCTURE = new Set(['BusinessActor', 'BusinessRole', 'BusinessCollaboration', 'BusinessInterface', 'ApplicationComponent', 'ApplicationCollaboration', 'ApplicationInterface', 'Node', 'Device', 'SystemSoftware', 'TechnologyCollaboration', 'TechnologyInterface', 'Path', 'CommunicationNetwork', 'Equipment', 'Facility', 'DistributionNetwork']);
const BEHAVIOUR_ELEMENTS = new Set(['BusinessProcess', 'BusinessFunction', 'BusinessInteraction', 'BusinessEvent', 'BusinessService', 'ApplicationProcess', 'ApplicationFunction', 'ApplicationInteraction', 'ApplicationEvent', 'ApplicationService', 'TechnologyProcess', 'TechnologyFunction', 'TechnologyInteraction', 'TechnologyEvent', 'TechnologyService']);
const PASSIVE_STRUCTURE = new Set(['BusinessObject', 'Contract', 'Representation', 'DataObject', 'Artifact', 'Material']);
// The aspect of a core element ('active', 'behaviour', 'passive'), or null for an element of another kind (motivation,
// strategy, implementation and migration, a junction, a grouping or location).
export const archimateAspect = type => (ACTIVE_STRUCTURE.has(type) ? 'active' : BEHAVIOUR_ELEMENTS.has(type) ? 'behaviour' : PASSIVE_STRUCTURE.has(type) ? 'passive' : null);
const isCoreElement = t => !!archimateAspect(t);
// The strategy elements (ArchiMate 3.2 chapter 7): the Strategy band holds them (layers-view.js strategic).
export const STRATEGY_ELEMENTS = Object.freeze(new Set(['Resource', 'Capability', 'ValueStream', 'CourseOfAction']));
// rc41 close (C15): the Implementation & Migration relationships Chapter 11's records draw and the exchange writes —
// a work package or an implementation event triggers (and flows to) another; a plateau triggers the next (a transition);
// a work package triggers the plateau it works towards; a deliverable realizes a plateau or a core element, a work package
// realizes a deliverable and, derived through it, a plateau or a core element.
const IMPLEMENTATION_FLOW = new Set(['WorkPackage', 'ImplementationEvent']);
const RULES = {
  Composition: (s, t) => s === t || s === 'Grouping' || any([['ApplicationComponent', 'ApplicationInterface'], ['Node', 'SystemSoftware'], ['Node', 'Device']], s, t),
  Aggregation: (s, t) => s === t || s === 'Grouping' || s === 'Location' || any([['Node', 'SystemSoftware'], ['Node', 'Device'], ['ApplicationComponent', 'ApplicationInterface']], s, t),
  Assignment: (s, t) => any([['BusinessActor', 'BusinessProcess'], ['BusinessActor', 'BusinessRole'], ['BusinessActor', 'BusinessEvent'], ['BusinessRole', 'BusinessProcess'], ['ApplicationComponent', 'ApplicationFunction'], ['ApplicationComponent', 'ApplicationProcess'], ['Node', 'Artifact'], ['SystemSoftware', 'Artifact'], ['Node', 'SystemSoftware'], ['Device', 'SystemSoftware']], s, t),
  Realization: (s, t) => (isCore(s) && REALIZABLE_MOTIVATION.has(t)) || ((s === 'WorkPackage' || s === 'Deliverable') && (t === 'Plateau' || isCoreElement(t))) || any([['WorkPackage', 'Deliverable'], ['Requirement', 'Outcome'], ['Requirement', 'Goal'], ['Requirement', 'Principle'], ['Constraint', 'Outcome'], ['Constraint', 'Goal'], ['Constraint', 'Principle'], ['Outcome', 'Goal'], ['Principle', 'Goal'], ['Principle', 'Outcome'], ['ApplicationComponent', 'ApplicationService'], ['ApplicationComponent', 'BusinessProcess'], ['ApplicationFunction', 'ApplicationService'], ['Node', 'TechnologyService'], ['SystemSoftware', 'TechnologyService'], ['Device', 'TechnologyService'], ['BusinessProcess', 'BusinessService'], ['Artifact', 'DataObject'], ['Artifact', 'ApplicationComponent'], ['Artifact', 'SystemSoftware'], ['DataObject', 'BusinessObject']], s, t),
  Serving: (s, t) => any([['ApplicationService', 'ApplicationComponent'], ['ApplicationService', 'BusinessProcess'], ['ApplicationService', 'BusinessActor'], ['ApplicationComponent', 'ApplicationComponent'], ['ApplicationComponent', 'BusinessProcess'], ['ApplicationInterface', 'ApplicationComponent'], ['TechnologyService', 'ApplicationComponent'], ['TechnologyService', 'Node'], ['TechnologyService', 'SystemSoftware'], ['TechnologyService', 'TechnologyService'], ['Node', 'ApplicationComponent'], ['Node', 'Node'], ['SystemSoftware', 'ApplicationComponent'], ['SystemSoftware', 'SystemSoftware'], ['BusinessService', 'BusinessActor'], ['BusinessService', 'BusinessProcess']], s, t),
  Access: (s, t) => ['DataObject', 'BusinessObject', 'Artifact'].includes(t) && ['ApplicationComponent', 'ApplicationFunction', 'ApplicationProcess', 'ApplicationService', 'ApplicationInterface', 'BusinessProcess', 'BusinessActor', 'BusinessRole', 'BusinessEvent', 'Node', 'SystemSoftware', 'TechnologyService'].includes(s),
  Flow: (s, t) => (BEHAVIOUR_FLOW.has(s) && BEHAVIOUR_FLOW.has(t)) || (BUSINESS_FLOW.has(s) && BUSINESS_FLOW.has(t)) || (TECH_FLOW.has(s) && TECH_FLOW.has(t)) || (IMPLEMENTATION_FLOW.has(s) && IMPLEMENTATION_FLOW.has(t)),
  Triggering: (s, t) => (BUSINESS_FLOW.has(s) && BUSINESS_FLOW.has(t)) || (BEHAVIOUR_FLOW.has(s) && BEHAVIOUR_FLOW.has(t)) || (IMPLEMENTATION_FLOW.has(s) && IMPLEMENTATION_FLOW.has(t)) || (s === 'Plateau' && t === 'Plateau') || (s === 'WorkPackage' && t === 'Plateau'),
  Influence: (s, t) => MOTIVATION.has(s) || MOTIVATION.has(t),
  Specialization: (s, t) => s === t && !OTHER.has(s),
  Association: () => true
};
// What each rule checks, in a line the finding and the export report can cite.
export const ARCHIMATE_RULES = {
  Composition: 'Composition (ArchiMate 3.1, structural relationships): a whole and a part of the same type, a grouping and its members, a component and its interface, a node and its system software or device.',
  Aggregation: 'Aggregation (ArchiMate 3.1, structural relationships): a whole and a part of the same type, a grouping or location and its members, a node and its system software or device.',
  Assignment: 'Assignment (ArchiMate 3.1, structural relationships): an actor or role assigned to a process or event, a component to a function or process, a node to an artifact or system software.',
  Realization: 'Realization (ArchiMate 3.1, structural relationships): a core element realizes a requirement, constraint, outcome, goal or principle; a requirement realizes an outcome or goal; a component realizes a service, or a business process it automates (derived: through the application process assigned to it); a node, device or system software realizes a technology service; a process realizes a business service; an artifact realizes a data object, component or system software; a deliverable realizes a plateau or a core element, a work package a deliverable (and, derived through it, a plateau or a core element).',
  Serving: 'Serving (ArchiMate 3.1, dependency relationships): a service serves a component, process or actor; a component, interface, node or system software serves a component; a component serves a business process (derived: through the application service it realizes); a technology service or node serves a node, system software or technology service.',
  Access: 'Access (ArchiMate 3.1, dependency relationships): a behaviour or active structure element accesses a data object, business object or artifact.',
  Influence: 'Influence (ArchiMate 3.1, dependency relationships): an element influences a motivation element, or a motivation element influences another element.',
  Flow: 'Flow (ArchiMate 3.1, dynamic relationships): between two behaviour or active structure elements of one layer (business, application or technology), or between work packages and implementation events.',
  Triggering: 'Triggering (ArchiMate 3.1, dynamic relationships): between two business or application behaviour elements, events or junctions; between work packages and implementation events; from a plateau to the next (a transition) and from a work package to the plateau it works towards.',
  Specialization: 'Specialization (ArchiMate 3.1, other relationships): between two elements of the same type.',
  Association: 'Association (ArchiMate 3.1, dependency relationships): allowed between any two elements.'
};
export const ARCHIMATE_RELATIONSHIPS = Object.keys(RULES);
// The type to write for a wanted relationship between two element types, whether it was kept (valid between those
// types) and the rule that decided it.
export function archimateRelationship(wanted, sourceType, targetType) {
  const rule = RULES[wanted];
  const kept = !!rule && rule(sourceType, targetType);
  return kept ? {type: wanted, kept: true, rule: ARCHIMATE_RULES[wanted]} : {type: 'Association', kept: wanted === 'Association', rule: ARCHIMATE_RULES[wanted] || ARCHIMATE_RULES.Association};
}

// ---------------------------------------------------------------- the connected model's typing (round 6, Contract T)
// The ArchiMate element type of a record: its notation kind's type (a capability by its recorded category), or the
// grouping type of a record drawn as a container (a module, a trust boundary, an environment, a zone).
// A record type the standard names more exactly than its notation kind does: a constraint is a Constraint, an assumption
// and a source claim are Assessments, a context record is a Driver, a technology need a Requirement, a runtime path a Path.
const RECORD_ARCHIMATE = {need: 'Requirement', constraint: 'Constraint', assumption: 'Assessment', context: 'Driver', path: 'Path', claim: 'Assessment'};
export function archimateTypeOf(type, record = null) {
  if (RECORD_ARCHIMATE[type]) return RECORD_ARCHIMATE[type];
  if (type === 'capability') return KINDS[capabilityKind(record?.category || record?.attributes?.category)].archimate;
  const pal = PALETTE[type];
  if (!pal) return 'Grouping';
  if (pal.kind) return KINDS[pal.kind]?.archimate || 'Grouping';
  if (pal.group) return GROUP_KINDS[pal.group]?.archimate || 'Grouping';
  return 'Grouping';
}
// The ArchiMate relationships an AIW relationship kind asks for, in order, and whether the arrow turns round (the
// standard draws it the other way: a component realizes the responsibility that is "realized by" it, a capability
// serves the component that "requires" it): [[type, fallback…], reversed]. The first type is what the kind means; a
// fallback is what the standard offers where that type is not allowed between the two element types (a decision
// "fulfils" a requirement by influence, not realization). A chain that ends in Association is a loose kind the standard
// has no one relationship for (ownership, support, information): it is never invalid. A kind not named here is an
// Association. A source may say otherwise for one kind (`requires` through a technology mapping is serving; `owns` of a
// data definition is access). This is the one table: the connected model, the chapter checks and the ArchiMate exchange
// all read it.
const RELATION_ARCHIMATE = {
  'participates in': [['Assignment'], false], requires: [['Realization', 'Influence'], false], delivers: [['Realization', 'Influence'], false], precedes: [['Triggering'], false], constrains: [['Influence'], false],
  supports: [['Influence', 'Association'], false], informs: [['Influence', 'Association'], false], owns: [['Access', 'Influence', 'Association'], false],
  sequence: [['Triggering'], false], message: [['Flow'], false], interaction: [['Flow'], false], flow: [['Flow'], false], transition: [['Triggering'], false],
  realizedBy: [['Realization'], true], implementedBy: [['Realization'], true], metBy: [['Realization'], true], realizesContract: [['Realization'], false], fulfils: [['Realization', 'Influence'], true], provides: [['Realization'], false],
  serves: [['Serving'], false], realises: [['Realization'], false],
  uses: [['Serving'], true], dependency: [['Serving', 'Association'], true], data: [['Flow', 'Access', 'Association'], false], hasNeed: [['Association'], false], exchanges: [['Access'], false], transforms: [['Flow'], false], accesses: [['Access'], false],
  partOf: [['Composition', 'Aggregation'], true], memberOf: [['Aggregation'], true], withinBoundary: [['Aggregation'], true], inEnvironment: [['Aggregation'], true], locatedIn: [['Aggregation'], true], placedAs: [['Aggregation'], false],
  operatedAs: [['Association'], false], justifies: [['Influence'], false], motivatedBy: [['Influence'], true], addresses: [['Influence'], false], assesses: [['Influence'], false], considers: [['Association'], false],
  protects: [['Influence'], false], mitigates: [['Influence'], false], threatens: [['Influence'], false], enforces: [['Influence'], false], evidences: [['Association'], false], asserts: [['Association'], false], conflictsWith: [['Association'], false]
};
const RELATION_BY_SOURCE = {'technology.mappings': {requires: [['Serving'], true]}, 'realisation.components.dataIds': {owns: [['Access'], false]}, 'interfaces.data.authorityId': {owns: [['Access'], false]}, 'process.elements.authorityId': {owns: [['Access'], false]}};
export function archimateWanted(kind, source = '') {
  return RELATION_BY_SOURCE[source]?.[kind] || RELATION_ARCHIMATE[kind] || [['Association'], false];
}
// The typing of one relationship of the connected model: {type, valid, rule, wanted, reversed, source, target}. `wanted`
// is the first type the kind asks for; `valid` says whether that type or one of its fallbacks is allowed, `type` is the
// one kept (Association when none is), `rule` the rule that decided it; `source` and `target` are the element types as
// the standard reads them (after any reversal, which `reversed` reports so a writer can turn the ends round).
// A few hundred distinct (kind, source type, target type, source) combinations stand behind the thousands of relationships
// of a large model, so each is worked out once and the frozen reading shared (the model builds at 500 records a chapter
// inside the chapter budget this way).
const typings = new Map();
export function archimateOf(kind, sourceType, targetType, source = '') {
  const key = kind + '\0' + sourceType + '\0' + targetType + '\0' + (RELATION_BY_SOURCE[source]?.[kind] ? source : '');
  let out = typings.get(key);
  if (out) return out;
  const [chain, reversed] = archimateWanted(kind, source), s = reversed ? targetType : sourceType, t = reversed ? sourceType : targetType;
  let r = null;
  for (const wanted of chain) { r = archimateRelationship(wanted, s, t); if (r.kept) break; }
  out = Object.freeze({type: r.type, valid: r.kept, rule: r.kept ? r.rule : ARCHIMATE_RULES[chain[0]] || ARCHIMATE_RULES.Association, wanted: chain[0], reversed, source: s, target: t});
  typings.set(key, out);
  return out;
}
