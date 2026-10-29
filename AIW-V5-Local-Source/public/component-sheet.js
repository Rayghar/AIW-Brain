// The component specification sheet model (rc40 W3, PLAN §4.3): one component as a document template in the TOGAF
// Architecture Building Block / arc42 building-block sense — identity, purpose and responsibilities, design basis,
// interfaces, data, qualities and targets, realization and placement, security, decisions and obligations,
// provenance — with the completeness of the template's fields and the omissions as a list the reader can act on.
//
// componentSheet(project, id) returns ten sections of typed fields, each field {id, label, state: recorded | inferred |
// open, where: {chapter, section, path}, value | values | rows, empty}, read from the records through the readings the
// product already holds — specificationReading (specification-reading.js: the source-aware facts), designQuestions
// (design-questions.js: rc39's drivers → design questions with their state and the Decide action), componentSpec
// (design-spec.js), the driver scope, the architecture model's objects and the record provenance. A linked value
// carries the chapter, id and unscoped Model path of the record it was read from; the view (component-spec-view.js)
// applies the project and scope and draws, the export (component-spec-document.js) prints the same model. Pure and
// memoised per document; no DOM, no window: the server reads it too. Nothing here writes the document, approves,
// scores or proposes.
import {specificationReading, specReviewItems} from './specification-reading.js';
import {designQuestions} from './design-questions.js';
import {productLabel} from './design-reasoning.js';
import {architectureModel} from './architecture-model.js';
import {recordProvenance} from './provenance.js';
import {driverKind, driverKindOf, isQualityDriver, targetText, targetIsMeasurable} from './quality-domain.js';
import {statusLabel, solAssessed, rulesAssessed} from './decisions-domain.js';
import {OBLIGATION_STATES} from './architecture-obligations.js';
import {remember} from './document-memo.js';
import {list, str, plural} from './util.js';

// The template: the sections of the sheet in reading order, the chapters each reads, and what it answers.
export const SHEET_SECTIONS = [
  {id: 'header', no: 0, title: 'Identity and completeness', nav: 'Identity', chapters: [5], lead: 'Who it is, how complete its specification is, and what is still to record.'},
  {id: 'purpose', no: 1, title: 'Purpose and responsibilities', nav: 'Purpose', chapters: [5, 4, 1], lead: 'What it is for, the responsibilities it realises and the requirements behind them.'},
  {id: 'basis', no: 2, title: 'Design basis', nav: 'Design basis', chapters: [2, 3], lead: 'The drivers reaching it, and the design questions they open with their state.'},
  {id: 'interfaces', no: 3, title: 'Interfaces', nav: 'Interfaces', chapters: [8, 5], lead: 'The contracts it provides and consumes: operation, protocol, failure policy and the data crossing.'},
  {id: 'data', no: 4, title: 'Data', nav: 'Data', chapters: [8], lead: 'The data it owns, reads and writes, with its classification and invariants.'},
  {id: 'qualities', no: 5, title: 'Qualities and targets', nav: 'Qualities', chapters: [2, 3], lead: 'Each quality driver with its target, measure and status, and what is recorded to meet it.'},
  {id: 'realization', no: 6, title: 'Realization and placement', nav: 'Realization', chapters: [6, 7, 10], lead: 'The capabilities it needs, the products chosen or still open, and where and how it runs.'},
  {id: 'security', no: 7, title: 'Security', nav: 'Security', chapters: [9], lead: 'The threats recorded against it, the controls protecting it, and what remains uncovered.'},
  {id: 'decisions', no: 8, title: 'Decisions and obligations', nav: 'Decisions', chapters: [3, 5, 11], lead: 'The decisions that touch it, its assumptions, applied designs and verification obligations.'},
  {id: 'provenance', no: 9, title: 'Provenance', nav: 'Provenance', chapters: [5], lead: 'Where the record came from, whether a person confirmed it, and when it last changed.'}
];
export const SECTION = Object.fromEntries(SHEET_SECTIONS.map(s => [s.id, s]));
// The names of the chapter Work sections a field is recorded in, as the omissions name them.
const WORK = {
  1: {requirements: 'Requirements'}, 2: {scenarios: 'Quality scenarios', drivers: 'Architectural drivers'}, 3: {decisions: 'Decisions'},
  4: {responsibilities: 'Responsibilities', mappings: 'Allocation'}, 5: {components: 'Components', properties: 'Quality properties', needs: 'Technology needs'},
  6: {needs: 'Technology needs', capabilities: 'Capabilities'}, 7: {realizations: 'Realizations', options: 'Product options'},
  8: {contracts: 'Contracts', data: 'Data definitions', invariants: 'Invariants'}, 9: {threats: 'Threats', controls: 'Controls'},
  10: {plans: 'Runtime plans', placements: 'Placements'}, 11: {actions: 'Verification actions'}
};
export const refOf = r => str(r?.ref) || str(r?.code) || str(r?.id);
export const named = r => `${refOf(r)} ${str(r?.title || r?.question)}`.trim();
const unique = xs => [...new Set(xs.filter(Boolean))];
const stated = v => { const t = str(v); return !!t && !/^(unspecified|not stated|unknown|not classified yet|unclassified)$/i.test(t); };
const kindOf = chapter => chapter === 2 ? 'driver' : chapter === 3 ? 'decision' : 'object';
// Where a record is read on the Model tab, and where a field is recorded on the Work tab. Paths are unscoped: the view
// applies the project and scope (projectURL, scopeProjectLinks); the export prints them as they are.
export const modelPath = (chapter, id) => `/?chapter=${chapter}&tab=model&${kindOf(chapter)}=${encodeURIComponent(id)}`;
export const workPath = (chapter, id) => `/?chapter=${chapter}&tab=work${id ? '&object=' + encodeURIComponent(id) : ''}`;
const where = (chapter, section, object = null) => ({chapter, section: WORK[chapter]?.[section] || section, path: workPath(chapter, object)});
// A linked value: the text, the record's chapter and id (a Chapter 5 component is held in place by the view).
export const to = (chapter, record, text = named(record), extra = {}) => ({text, chapter, id: record?.id || '', path: record?.id ? modelPath(chapter, record.id) : '', ...extra});
const end = e => e?.kind === 'unknown' || !e?.record ? {text: str(e?.record?.title || e?.record?.id || 'Endpoint not found'), chapter: 8, id: '', path: '', state: 'open'} : to(e.chapter, e.record);
const EFFECT = {supports: 'Supports · assessment', tension: 'Creates tension · assessment', violates: 'Violates · assessment', neutral: 'Neutral · assessment', unknown: 'Effect not assessed'};
const effectTone = effect => ['violates', 'tension'].includes(effect) ? 'attention' : 'quiet';
const day = at => typeof at === 'string' && /^\d{4}-\d{2}-\d{2}/.test(at) ? at.slice(0, 10) : '';

// ---------------------------------------------------------------- the model

export function componentSheet(p, id) {
  if (!p || !id) return null;
  return remember(p, 'component-sheet', 'sheet:' + id, () => buildSheet(p, id));
}
function buildSheet(p, id) {
  const reading = specificationReading(p, id);
  if (!reading) return null;
  const C = reading.C, c = C.component, dq = designQuestions(p, id), M = architectureModel(p), provenance = recordProvenance(p, c, 5);
  const sections = [], fields = [];
  // field(section, id, label, where, spec): spec.state recorded | inferred | open; spec.counted (default true) joins the
  // completeness; spec.empty says what to record when the field is open.
  const field = (section, fid, label, at, spec) => { const f = {id: fid, section, label, where: at, state: 'recorded', counted: true, ...spec}; fields.push(f); return f; };
  const section = (sid, own) => { const s = {...SECTION[sid], fields: fields.filter(f => f.section === sid), ...own}; sections.push(s); return s; };

  // 0 · Identity. The module is the responsibility group of the responsibilities it realises (Chapter 4).
  const groupIds = unique(C.realised.map(r => r.responsibility.groupId)), modules = groupIds.map(g => M.objects.get(g)).filter(Boolean);
  const header = {ref: C.ref, title: C.title, kind: str(c.kind) || 'component', status: str(C.status) || 'draft', objectStatus: M.objects.get(id)?.status || '', owner: C.owner, revision: c.revision ?? 1,
    module: modules.length ? modules.map(m => to(4, m.record || m, named(m))) : [], provenance: {label: provenance.label, line: provenance.line, kind: provenance.kind, reviewed: !!provenance.reviewed}, sourceChanged: reading.sourceChanged, purpose: C.purpose};
  field('header', 'owner', 'Owner', where(5, 'components', id), {state: C.owner ? 'recorded' : 'open', value: C.owner, empty: 'Name the accountable owner of this component.'});

  // 1 · Purpose and responsibilities.
  field('purpose', 'purpose', 'Purpose', where(5, 'components', id), {state: C.purpose ? 'recorded' : 'open', value: C.purpose, empty: 'Describe the responsibility this component fulfils, in one or two sentences.'});
  field('purpose', 'boundary', 'Boundary', where(5, 'components', id), {state: C.boundary ? 'recorded' : 'open', value: C.boundary, empty: 'State what this component owns and what stays outside it.'});
  const roleWord = {realises: 'realises', supports: 'supports'};
  field('purpose', 'realises', 'Realises', where(4, 'mappings', id), {state: C.realised.length ? 'recorded' : 'open', empty: 'Allocate a logical responsibility to this component.',
    values: C.realised.map(({responsibility: r, role}) => to(4, r, named(r), {note: role ? roleWord[role] : 'role not stated', state: role ? 'recorded' : 'open', detail: str(r.purpose)}))});
  const reqs = key => list(C.requirements?.[key]).map(rid => { const r = reading.requirements.get(rid); return r ? to(1, r, `${r.externalId ? r.externalId + ' · ' : ''}${named(r)}`, {note: str(r.assessment?.delivery) ? str(r.assessment.delivery).toLowerCase() : ''}) : {text: rid, chapter: 1, id: rid, path: modelPath(1, rid), state: 'open'}; });
  field('purpose', 'requirements', 'Requirements realised', where(4, 'responsibilities', C.realised[0]?.responsibility.id || null), {state: list(C.requirements?.realises).length ? 'recorded' : 'open', values: reqs('realises'), empty: 'Link a requirement to the responsibility it realises.'});
  field('purpose', 'requirements-supported', 'Requirements supported', where(4, 'responsibilities', null), {counted: false, values: reqs('supports'), state: list(C.requirements?.supports).length ? 'recorded' : 'inferred', empty: 'It supports no requirement without realising it.'});
  field('purpose', 'inputs', 'Takes in', where(5, 'components', id), {state: str(c.inputs) ? 'recorded' : 'open', value: str(c.inputs), empty: 'Say what this component takes in.'});
  field('purpose', 'outputs', 'Gives out', where(5, 'components', id), {state: str(c.outputs) ? 'recorded' : 'open', value: str(c.outputs), empty: 'Say what this component gives out.'});
  field('purpose', 'rationale', 'Why this component', where(5, 'components', id), {counted: false, state: str(c.rationale) ? 'recorded' : 'open', value: str(c.rationale), empty: 'Record why this component exists as a unit of its own.'});
  const placements = list(C.architectureSolutions).flatMap(s => list(s.placement).filter(x => x.componentId === id).map(x => ({text: `${str(x.role || 'component').replaceAll('-', ' ')} · ${str(x.scope || 'responsibility').replaceAll('-', ' ')}`, chapter: 5, id: s.taskId, path: workPath(5, s.taskId), detail: `${str(x.responsibility || 'Responsibility to define')}${x.hostRole ? ' · hosted by the ' + str(x.hostRole) : ''}`, note: 'applied design ' + str(s.taskId)})));
  if (placements.length) field('purpose', 'roles', 'Roles in applied designs', where(5, 'components', id), {counted: false, values: placements});
  section('purpose');

  // 2 · Design basis: the drivers reaching it (with their paths and targets) and the design questions (rc39).
  const byDriver = new Map(dq?.drivers.map(d => [d.id, d]) || []);
  const paths = item => unique(item.paths.map(path => driverPath(reading, path)).map(x => x.text)).join('; ');
  const drivers = reading.drivers.map(item => {
    const d = item.record, r = byDriver.get(d.id), quality = isQualityDriver(d), kind = driverKindOf(driverKind(d))?.name || 'Quality';
    const confirmed = !!d.confirmed && (!quality || !!d.targetConfirmed);
    return {id: d.id, code: d.code || d.id, link: to(2, d, named(d)), kind, priority: str(d.priority), quality,
      target: quality ? targetText(d) : str(d.impact) || str(d.description) || '', targetState: quality ? (d.targetValue !== '' && d.targetValue != null ? 'recorded' : 'open') : 'recorded',
      confirmed, basis: confirmed ? 'Basis confirmed' : 'Basis to confirm', attribute: r?.attribute?.name || '',
      paths: item.paths.map(path => driverPath(reading, path)), pathText: paths(item),
      decisions: item.decisions.map(x => ({link: to(3, x.record), selected: x.selected ? str(x.selected.title) : '', effect: x.selected ? EFFECT[x.selected.assessments?.[d.id]?.effect] || EFFECT.unknown : '', tone: x.selected ? effectTone(x.selected.assessments?.[d.id]?.effect) : 'quiet', sourceChanged: x.sourceChanged}))};
  });
  field('basis', 'drivers', 'Drivers reaching it', where(2, 'scenarios', null), {state: drivers.length ? 'recorded' : 'open', empty: 'Link a driver to a responsibility this component realises, or to the component itself.', rows: drivers});
  const questions = list(dq?.questions).map(q => ({id: q.id, title: q.title, question: q.question, state: q.state, chapter: q.chapter, because: q.because.map(x => ({id: x, title: byDriver.get(x)?.title || x})), answers: q.answers.map(a => ({kind: a.kind, ref: a.ref, title: a.title, state: a.state, chapter: a.chapter})), story: q.story, caution: q.caution, toConfirm: q.toConfirm, decide: q.decide}));
  const counts = dq?.counts || {open: 0, draft: 0, decided: 0};
  field('basis', 'questions', 'Design questions', where(5, 'components', id), {state: !drivers.length ? 'open' : counts.open ? 'open' : 'recorded', rows: questions, counts,
    value: questions.length ? ['decided', 'draft', 'open'].filter(k => counts[k]).map(k => counts[k] + ' ' + k).join(' · ') : drivers.length ? 'No design question opens from its drivers.' : '',
    empty: drivers.length ? 'Decide each open question on this sheet, or record its answer in the chapter the question names.' : 'A design question opens once a driver reaches this component.'});
  section('basis');

  // 3 · Interfaces: the contracts it provides and consumes, then the Chapter 5 interactions no contract formalises.
  const contracts = reading.contracts.map(item => {
    const {record: k, face, other, role} = item, event = face.kind === 'event', batch = face.kind === 'batch';
    const direction = event ? role === 'provides' ? 'Publishes to' : 'Receives from' : batch ? role === 'provides' ? 'Receives from' : 'Sends to' : role === 'provides' ? 'Serves' : 'Calls';
    const failure = str(k.failurePolicy) || [str(k.timeoutPolicy) && 'on timeout: ' + str(k.timeoutPolicy), str(k.retryPolicy) && 'retries: ' + str(k.retryPolicy)].filter(Boolean).join('; ');
    const review = item.sourceChanged ? 'Source changed' : item.reviewChanged ? 'Review needs updating' : item.reviewed ? 'Current review recorded' : 'Review not recorded';
    return {id: k.id, role: role === 'provides' ? 'Provided' : 'Consumed', direction, kind: event ? 'Event' : batch ? 'Batch' : 'Request', link: to(8, k), counterpart: end(other), purpose: str(k.purpose),
      operation: str(k.operation), protocol: [str(k.protocol), str(k.contractVersion)].filter(Boolean).join(' · '), failure, failureState: failure ? 'recorded' : 'open',
      timeout: k.timeoutMs !== '' && k.timeoutMs != null ? `${k.timeoutMs} ms${k.timeoutConfirmed ? ' · confirmed' : ' · to confirm'}` : '', idempotency: str(k.idempotencyKey) || str(k.duplicatePolicy), authorization: str(k.authorization), transport: str(k.transport),
      data: face.exchanges.map(x => x.data ? to(8, x.data, named(x.data), {note: event ? 'published' : x.role === 'response' ? 'response' : 'request'}) : {text: 'Missing data reference ' + str(x.dataId), chapter: 8, id: '', path: '', state: 'open'}),
      review, reviewTone: item.sourceChanged || item.reviewChanged ? 'attention' : 'quiet', reviewEvidence: item.review?.evidence ? `${item.reviewChanged ? 'Earlier review reference' : 'Review reference'}: ${str(item.review.evidence)}${item.review.reviewer ? ' · ' + str(item.review.reviewer) : ''}` : '', evidence: str(k.evidence)};
  });
  const covered = new Set(reading.contracts.map(x => x.record.sourceId).filter(Boolean));
  const flows = C.interactions.filter(x => str(x.interaction.kind) !== 'trace' && !covered.has(x.interaction.id)).map(x => ({id: x.interaction.id, direction: x.direction === 'out' ? 'Sends to' : 'Receives from', counterpart: end(x.other), label: str(x.interaction.label) || x.interaction.id, kind: str(x.interaction.interaction) || 'interaction type not stated', failure: str(x.interaction.failure), failureState: str(x.interaction.failure) ? 'recorded' : 'open'}));
  const provided = contracts.filter(x => x.role === 'Provided'), consumed = contracts.filter(x => x.role === 'Consumed'), outgoing = flows.filter(f => f.direction === 'Sends to');
  field('interfaces', 'provided', 'Provided contracts', where(8, 'contracts', null), {state: provided.length ? 'recorded' : 'open', values: provided.map(x => x.link), empty: 'Record the contract this component provides, naming it as the provider.'});
  field('interfaces', 'consumed', 'Consumed contracts', where(8, 'contracts', null), {state: consumed.length ? 'recorded' : outgoing.length ? 'open' : 'inferred', values: consumed.map(x => x.link), empty: outgoing.length ? `Record a contract for ${plural(outgoing.length, 'interaction', 'interactions')} this component sends (${outgoing.map(f => f.id).join(', ')}).` : 'It calls nothing the design records; said as inferred from the absence of an outgoing interaction.'});
  const noPolicy = [...contracts.filter(x => x.failureState === 'open').map(x => x.link.text), ...flows.filter(f => f.failureState === 'open').map(f => f.id)];
  field('interfaces', 'failure-policies', 'Failure policies', where(8, 'contracts', contracts.find(x => x.failureState === 'open')?.id || null), {state: !contracts.length && !flows.length ? 'open' : noPolicy.length ? 'open' : 'recorded', value: contracts.length || flows.length ? `${contracts.length + flows.length - noPolicy.length} of ${contracts.length + flows.length} boundaries say what happens on failure` : '', empty: noPolicy.length ? 'Record what happens on failure for ' + noPolicy.join(', ') + '.' : 'A failure policy is recorded on each contract.'});
  field('interfaces', 'contracts', 'Contracts', where(8, 'contracts', null), {counted: false, state: contracts.length ? 'recorded' : 'open', rows: contracts, empty: 'No interface contract names this component as provider or consumer.'});
  field('interfaces', 'interactions', 'Interactions without a contract', where(8, 'contracts', null), {counted: false, state: flows.length ? 'open' : 'recorded', rows: flows, empty: 'Every recorded interaction of this component has a contract.'});
  section('interfaces');

  // 4 · Data: owns (the definitions naming it as authority; its own list without an authority is inferred), reads, writes.
  const classified = d => stated(d.classification);
  const dataValue = d => to(8, d, named(d), {note: str(d.classification) || 'not classified', state: classified(d) ? 'recorded' : 'open'});
  const authored = C.data.owned.filter(d => d.authorityId === id), listed = C.data.owned.filter(d => d.authorityId !== id);
  field('data', 'owns', 'Owns', where(8, 'data', C.data.owned[0]?.id || null), {state: authored.length ? 'recorded' : listed.length ? 'inferred' : 'open', values: [...authored.map(dataValue), ...listed.map(d => ({...dataValue(d), note: (str(d.classification) || 'not classified') + ' · listed by the component, no authority recorded', state: 'inferred'}))], empty: 'Name this component as the authority of the data it owns.'});
  field('data', 'reads', 'Reads', where(8, 'contracts', null), {state: C.data.consumed.length ? 'recorded' : str(c.inputs) ? 'open' : 'inferred', values: C.data.consumed.map(dataValue), empty: str(c.inputs) ? 'Its inputs are prose; link the data definition a contract exchanges.' : 'No contract exchange names data this component reads.'});
  field('data', 'writes', 'Writes', where(8, 'contracts', null), {state: C.data.produced.length ? 'recorded' : str(c.outputs) ? 'open' : 'inferred', values: C.data.produced.map(dataValue), empty: str(c.outputs) ? 'Its outputs are prose; link the data definition a contract exchanges.' : 'No contract exchange names data this component writes.'});
  const unclassified = C.data.owned.filter(d => !classified(d));
  field('data', 'classification', 'Classification', where(8, 'data', unclassified[0]?.id || C.data.owned[0]?.id || null), {state: !C.data.owned.length ? 'open' : unclassified.length ? 'open' : 'recorded', value: C.data.owned.length && !unclassified.length ? unique(C.data.owned.map(d => str(d.classification))).join(' · ') : '', empty: unclassified.length ? 'Classify ' + unclassified.map(refOf).join(', ') + '.' : 'Classify the data this component owns.'});
  const invariants = list(C.invariants).map(inv => ({id: inv.id, link: to(8, inv), kind: str(inv.kind) || 'rule', condition: str(inv.condition) || str(inv.open?.condition?.question) || '', owner: str(inv.owner), check: str(inv.check)}));
  field('data', 'invariants', 'Invariants', where(8, 'invariants', null), {counted: false, state: invariants.length ? 'recorded' : 'inferred', rows: invariants, empty: 'No invariant binds the data it owns or the contracts it uses.'});
  section('data');

  // 5 · Qualities and targets: per driver the target, measure and status; the recorded assessments and mechanisms.
  const qualities = reading.drivers.map(item => {
    const d = item.record, quality = isQualityDriver(d), has = d.targetValue !== '' && d.targetValue != null;
    const status = quality ? !has ? 'none' : d.targetConfirmed ? 'recorded' : 'unconfirmed' : d.confirmed ? 'recorded' : 'unconfirmed';
    return {id: d.id, link: to(2, d, named(d)), quality, kind: driverKindOf(driverKind(d))?.name || 'Quality', priority: str(d.priority),
      target: quality ? (has ? targetText(d) : '') : str(d.impact) || str(d.description), measure: quality ? [str(d.metric), str(d.window)].filter(Boolean).join(' · ') : '', measurement: quality ? str(d.measurement) : '', measurable: quality && targetIsMeasurable(d),
      status, statusWord: {recorded: quality ? 'Target confirmed' : 'Driver confirmed', unconfirmed: quality ? 'Target unconfirmed' : 'Driver unconfirmed', none: 'No target'}[status],
      effects: reading.effects.filter(e => e.driver.id === d.id).map(e => ({decision: to(3, e.decision.record), selected: str(e.decision.selected.title), effect: EFFECT[e.assessment.effect] || EFFECT.unknown, tone: effectTone(e.assessment.effect), reason: str(e.assessment.reason), evidence: str(e.assessment.evidence), origin: solAssessed(e.assessment) ? 'Sol assessment · not yet reviewed by a person' : rulesAssessed(e.assessment) ? 'SA Playbook rule assessment · not yet reviewed by a person' : '', sourceChanged: e.decision.sourceChanged, hard: e.hardViolation})),
      mechanisms: [...item.properties.map(x => ({statement: str(x.statement), mechanism: str(x.mechanism), source: str(x.source), note: (x.concern === d.id ? 'Property explicitly names this driver' : 'Property names the same quality concern') + ' · ' + (str(x.source) ? 'basis recorded' : 'basis not recorded')})),
        ...item.solutions.map(s => ({statement: [s.mechanism?.pattern, s.mechanism?.tactic, s.mechanism?.capability].filter(Boolean).map(str).join(' · ') || 'Applied approach', mechanism: '', source: '', note: 'Applied design ' + str(s.taskId) + ' names this driver and component'}))]};
  });
  const qd = qualities.filter(q => q.quality), noTarget = qd.filter(q => q.status === 'none');
  field('qualities', 'targets', 'Quality targets', where(2, 'scenarios', noTarget[0]?.id || null), {state: !qd.length ? (drivers.length ? 'inferred' : 'open') : noTarget.length ? 'open' : 'recorded', value: qd.length ? `${qd.length - noTarget.length} of ${qd.length} quality drivers carry a target · ${qd.filter(q => q.status === 'recorded').length} confirmed` : '', empty: noTarget.length ? 'Define the target of ' + noTarget.map(q => q.link.text).join(', ') + '.' : drivers.length ? 'No quality driver reaches it; its drivers state an impact instead of a target.' : 'A target is read once a quality driver reaches this component.'});
  field('qualities', 'mechanisms', 'Quality properties', where(5, 'properties', id), {state: C.properties.length || list(C.architectureSolutions).length ? 'recorded' : 'open', empty: 'Record the quality property and mechanism this component contributes to each driver it carries.',
    values: C.properties.map(x => ({text: str(x.statement) || 'Effect not described', chapter: 5, id: '', path: '', note: [str(x.concernName || x.concern), str(x.mechanism) ? 'mechanism: ' + str(x.mechanism) : 'mechanism to record'].filter(Boolean).join(' · '), detail: str(x.source) ? 'Basis: ' + str(x.source) : 'Basis to record; a property describes intent, not a verified result.'}))});
  field('qualities', 'drivers-table', 'Per driver', where(2, 'scenarios', null), {counted: false, state: qualities.length ? 'recorded' : 'open', rows: qualities, empty: 'No driver reaches this component.'});
  section('qualities');

  // 6 · Realization and placement.
  const byCap = new Map(reading.products.flatMap(product => list(product.capabilities).map(cap => [cap.id, product])));
  const needs = C.needs.map(({need, capability}) => {
    const product = capability ? byCap.get(capability.id) : null, r = product?.record, selected = product?.selected || null;
    return {need: {id: need.id, ref: refOf(need), category: str(need.category), criticality: str(need.criticality) || 'criticality not stated', confirmed: !!need.confirmed, description: str(need.description)},
      capability: capability ? to(6, capability) : null, realisation: r ? to(7, r) : null, product: selected ? productLabel({product: selected.product || selected.title, version: selected.version}) : '', productDetail: selected ? [str(selected.vendor), str(selected.operatingModel)].filter(Boolean).join(' · ') : '',
      options: product ? product.options.length : 0, productState: selected ? 'recorded' : product ? 'open' : capability ? 'open' : 'open',
      choice: selected ? product.selectionCurrent ? 'Current selection recorded' : 'Working selection' : product ? `Open comparison · ${plural(product.options.length, 'option')}` : capability ? 'No realization' : 'No capability'};
  });
  const products = reading.products.map(product => {
    const r = product.record, selected = product.selected, configuration = product.configuration || {};
    const options = (selected ? product.options.filter(o => o.id !== selected.id) : product.options).map(o => ({id: o.id, title: str(o.product || o.title || o.id), benefits: str(o.benefits), drawbacks: str(o.drawbacks), evidence: str(o.evidence)}));
    return {id: r.id, link: to(7, r), capabilities: list(product.capabilities).map(cap => to(6, cap)), title: selected ? productLabel({product: selected.product || selected.title, version: selected.version}) : 'Product choice is open',
      state: selected ? product.selectionCurrent ? 'Current selection recorded' : 'Working selection' : 'No product selected', tone: selected ? 'quiet' : 'attention', sourceChanged: product.sourceChanged,
      rationale: selected ? str(r.rationale) : '', benefits: selected ? str(selected.benefits) : '', drawbacks: selected ? str(selected.drawbacks) : '', operating: selected ? [str(selected.vendor), str(selected.operatingModel)].filter(Boolean).join(' · ') : '',
      configuration: selected ? [['Service tier', configuration.serviceTier], ['Topology', [configuration.topology, configuration.replicaCount == null ? '' : `${configuration.replicaCount} instances`].filter(Boolean).join(' · ')], ['Failure domains', configuration.failureDomains], ['Workload', configuration.workloadProfile], ['Configuration basis', configuration.specEvidence], ['Selection evidence', selected.evidence]].map(([label, value]) => ({label, value: str(value)})) : [],
      capacity: r.capacityValue !== '' && r.capacityValue != null ? `${r.capacityValue} ${str(r.capacityUnit)}`.trim() : '', options,
      comparisons: list(product.comparisons).map(x => ({option: str(x.option.product || x.option.title), driver: to(2, x.driver), effect: EFFECT[x.assessment.effect] || EFFECT.unknown, tone: effectTone(x.assessment.effect), current: x.current, reason: str(x.assessment.reason), evidence: str(x.assessment.evidence), origin: solAssessed(x.assessment) ? 'Sol assessment · not yet reviewed by a person' : rulesAssessed(x.assessment) ? 'SA Playbook rule assessment · not yet reviewed by a person' : ''}))};
  });
  const unsupported = C.needs.filter(n => !n.capability), unchosen = reading.products.filter(x => !x.selected), noCapacity = reading.products.filter(x => x.record.capacityValue === '' || x.record.capacityValue == null);
  field('realization', 'capabilities', 'Capabilities needed', where(6, 'needs', unsupported[0]?.need.id || null), {state: !C.needs.length ? 'open' : unsupported.length ? 'open' : 'recorded', values: C.needs.filter(n => n.capability).map(n => to(6, n.capability, named(n.capability), {note: str(n.need.category)})), empty: C.needs.length ? `${plural(unsupported.length, 'technology need has', 'technology needs have')} no supporting capability (${unsupported.map(n => refOf(n.need)).join(', ')}).` : str(c.technologyNeeds) ? 'Its technology needs are prose; record each need and map it to a capability.' : 'Record what this component needs from the platform, then map each need to a capability.'});
  field('realization', 'products', 'Products', where(7, 'realizations', unchosen[0]?.record.id || null), {state: !reading.products.length ? (C.needs.length ? 'open' : 'inferred') : unchosen.length ? 'open' : 'recorded', values: reading.products.filter(x => x.selected).map(x => to(7, x.record, productLabel({product: x.selected.product || x.selected.title, version: x.selected.version}))), empty: unchosen.length ? 'Choose the product for ' + unchosen.map(x => refOf(x.record)).join(', ') + ' from the recorded options.' : 'Record a realization of each capability and choose its product.'});
  field('realization', 'capacity', 'Capacity', where(7, 'realizations', noCapacity[0]?.record.id || null), {state: !reading.products.length ? 'inferred' : noCapacity.length ? 'open' : 'recorded', values: reading.products.filter(x => !(x.record.capacityValue === '' || x.record.capacityValue == null)).map(x => to(7, x.record, `${refOf(x.record)} · ${x.record.capacityValue} ${str(x.record.capacityUnit)}`.trim())), empty: noCapacity.length ? 'Record the capacity of ' + noCapacity.map(x => refOf(x.record)).join(', ') + '.' : 'Capacity is read from the realizations once one is recorded.'});
  const plans = C.plans.map(f => {
    const env = list(reading.p.runtime?.environments).find(e => e.id === f.plan.environmentId) || null, zones = f.zonesAll.map(z => reading.R.zones.get(z)).filter(Boolean);
    return {id: f.plan.id, link: to(10, f.plan), environment: env ? named(env) : str(f.plan.environmentId), zones: zones.map(z => to(10, z)), placements: f.placements.length ? `${f.active} active${f.standby ? ', ' + f.standby + ' standby' : ''}${f.open ? ' · copies unstated in ' + plural(f.open, 'placement') : ''}` : '',
      placed: !!f.placements.length && !f.open, scaling: str(f.plan.scalingPolicy) || (f.minReady != null && f.maxReplicas != null ? `${f.minReady}–${f.maxReplicas} replicas` : ''), scalingBasis: str(f.plan.capacityBasis), capacityConfirmed: !!f.plan.capacityConfirmed,
      domains: zones.length, standby: f.standby, backup: f.plan.backupZoneId ? reading.R.zones.get(f.plan.backupZoneId) : null, recovery: f.recoveryMinutes == null ? '' : `recovers in ${f.recoveryMinutes} min`, loss: f.lossMinutes == null ? '' : `loses at most ${f.lossMinutes} min`, strategy: f.recoveryStrategy !== 'Unspecified' ? f.recoveryStrategy : '', recoveryPlan: str(f.plan.recoveryPlan), stateMode: f.stateMode !== 'Unspecified' ? f.stateMode : '', targetsConfirmed: !!f.plan.targetsConfirmed};
  });
  const placed = plans.filter(x => x.placed), unplaced = plans.filter(x => !x.placed);
  field('realization', 'placement', 'Placement and zone', where(10, 'placements', unplaced[0]?.id || plans[0]?.id || null), {state: !plans.length ? 'open' : unplaced.length ? 'open' : 'recorded', values: placed.flatMap(x => x.zones.map(z => ({...z, note: `${x.link.text} · ${x.placements}`}))), empty: plans.length ? 'State the role and copies of each placement of ' + unplaced.map(x => x.link.text).join(', ') + '.' : 'Place this component in a runtime plan, in a zone of an environment.'});
  field('realization', 'scaling', 'Scaling', where(10, 'plans', plans.find(x => !x.scaling)?.id || plans[0]?.id || null), {state: !plans.length ? 'open' : plans.some(x => !x.scaling) ? 'open' : plans.every(x => x.capacityConfirmed) ? 'recorded' : 'inferred', values: plans.filter(x => x.scaling).map(x => ({...x.link, text: `${x.link.text} · ${x.scaling}`, note: x.capacityConfirmed ? 'capacity confirmed' : x.scalingBasis ? x.scalingBasis : 'capacity to confirm'})), empty: plans.length ? 'Record the scaling policy or the replica range of each plan.' : 'Scaling is read from the runtime plan once the component is placed.'});
  const weak = plans.filter(x => x.domains < 2 && !x.standby);
  field('realization', 'failure-domains', 'Failure domains', where(10, 'placements', weak[0]?.id || plans[0]?.id || null), {state: !plans.length ? 'open' : weak.length ? 'open' : 'recorded', value: plans.length ? plans.map(x => `${x.link.text}: ${plural(x.domains, 'zone')}${x.standby ? ', ' + x.standby + ' standby' : ', no standby'}${x.backup ? ', backup in ' + named(x.backup) : ''}`).join(' · ') : '', empty: weak.length ? weak.map(x => x.link.text).join(', ') + ' runs in one zone with no standby: place a second copy or a standby in another zone.' : 'Failure domains are read from the placements once the component is placed.'});
  const noRecovery = plans.filter(x => !x.recovery);
  field('realization', 'recovery', 'Recovery target', where(10, 'plans', noRecovery[0]?.id || plans[0]?.id || null), {state: !plans.length ? 'open' : noRecovery.length ? 'open' : plans.every(x => x.targetsConfirmed) ? 'recorded' : 'inferred', value: plans.filter(x => x.recovery).map(x => `${x.link.text}: ${[x.recovery, x.loss, x.strategy].filter(Boolean).join(' · ')}${x.targetsConfirmed ? '' : ' · to confirm'}`).join(' · '), empty: plans.length ? 'Record the recovery time, the tolerated loss and the recovery strategy of ' + noRecovery.map(x => x.link.text).join(', ') + '.' : 'A recovery target is read from the runtime plan once the component is placed.'});
  const noState = plans.filter(x => !x.stateMode);
  field('realization', 'state', 'State', where(10, 'plans', noState[0]?.id || plans[0]?.id || null), {state: !plans.length ? 'open' : noState.length ? 'open' : 'recorded', value: plans.filter(x => x.stateMode).map(x => `${x.link.text}: ${x.stateMode}`).join(' · '), empty: plans.length ? 'Say whether ' + noState.map(x => x.link.text).join(', ') + ' holds state.' : 'Whether it holds state is read from the runtime plan.'});
  if (C.container) field('realization', 'container', 'Container', where(7, 'realizations', C.container.id), {counted: false, state: C.container.derived ? 'inferred' : 'recorded', values: [to(7, C.container, named(C.container), {note: C.container.derived ? 'inferred from its compute need' : 'recorded'})]});
  field('realization', 'needs-table', 'Capability to product', where(6, 'needs', null), {counted: false, state: needs.length ? 'recorded' : 'open', rows: needs, empty: 'No technology need is recorded for this component.'});
  field('realization', 'products-detail', 'Product choices', where(7, 'realizations', null), {counted: false, state: products.length ? 'recorded' : 'inferred', rows: products, empty: 'No realization is linked to the capabilities it needs.'});
  field('realization', 'plans-table', 'Runtime plans', where(10, 'plans', null), {counted: false, state: plans.length ? 'recorded' : 'open', rows: plans, empty: 'No runtime plan places this component.'});
  section('realization');

  // 7 · Security: threats on it, controls protecting it, and what no control covers (said as inferred from the links).
  const threats = C.threats.map(t => ({id: t.id, link: to(9, t), category: str(t.category), scenario: str(t.scenario), consequence: str(t.consequence), priority: str(t.priority), covered: C.controls.filter(k => list(k.threatIds).includes(t.id)).map(k => to(9, k))}));
  const controls = C.controls.map(k => ({id: k.id, link: to(9, k), category: str(k.category), enforcement: str(k.enforcement), mechanism: str(k.mechanism), failureMode: stated(k.failureMode) ? str(k.failureMode) : '', verificationPlan: str(k.verificationPlan), threats: list(k.threatIds).map(tid => { const t = reading.p.security?.threats?.find?.(x => x.id === tid); return t ? to(9, t) : null; }).filter(Boolean)}));
  const uncovered = threats.filter(t => !t.covered.length);
  field('security', 'threats', 'Threats on it', where(9, 'threats', null), {state: threats.length ? 'recorded' : 'open', rows: threats, values: threats.map(t => t.link), empty: 'No threat names this component. The absence of a record is not an assessment: record the threats that target it.'});
  field('security', 'controls', 'Controls protecting it', where(9, 'controls', null), {state: controls.length ? 'recorded' : 'open', rows: controls, values: controls.map(k => k.link), empty: 'No control targets this component. Record the control that protects each threat, with its enforcement point.'});
  field('security', 'residual', 'Residual', where(9, 'controls', uncovered[0]?.id || null), {state: !threats.length ? 'inferred' : uncovered.length ? 'open' : 'recorded', value: threats.length ? (uncovered.length ? '' : `Every recorded threat (${threats.length}) has a control, read from the controls’ threat links; a control is not evidence that it is enforced.`) : 'Nothing to compare: no threat is recorded against it.', empty: uncovered.length ? 'No control covers ' + uncovered.map(t => t.link.text).join(', ') + ': record the control or accept the risk in Chapter 9.' : ''});
  section('security');

  // 8 · Decisions and obligations.
  const decisions = reading.decisions.map(({record: d, selected, sourceChanged, approved}) => ({id: d.id, link: to(3, d), question: str(d.question), status: selected ? statusLabel(d) : 'Choice open', tone: selected ? 'quiet' : 'attention', sourceChanged, approved,
    selected: selected ? {title: str(selected.title), rationale: str(d.rationale) || str(selected.summary), benefits: str(selected.benefits), costs: str(selected.costs), consequences: str(selected.consequences)} : null,
    context: str(d.context), alternatives: list(d.alternatives).map(a => str(a.title)), assumption: str(d.assumptions), assumptionResolved: !!d.assumptionsResolved}));
  const openDecisions = decisions.filter(d => !d.selected);
  field('decisions', 'decisions', 'Decisions that touch it', where(3, 'decisions', openDecisions[0]?.id || null), {state: !decisions.length ? 'open' : openDecisions.length ? 'open' : 'recorded', values: decisions.map(d => ({...d.link, note: d.selected ? d.selected.title : 'choice open', state: d.selected ? 'recorded' : 'open'})), rows: decisions, empty: decisions.length ? 'Select an alternative of ' + openDecisions.map(d => d.id).join(', ') + '.' : 'Link a decision to this component or to a driver it carries.'});
  field('decisions', 'assumptions', 'Assumptions', where(5, 'components', id), {state: str(c.assumptions) ? (c.assumptionsResolved ? 'recorded' : 'open') : 'inferred', value: str(c.assumptions), note: str(c.assumptions) ? (c.assumptionsResolved ? 'reviewed' : 'open') : '', empty: str(c.assumptions) ? 'Resolve the assumption and mark it reviewed.' : 'No assumption is recorded on the component.'});
  field('decisions', 'approach', 'Solution approach', where(5, 'components', id), {state: str(C.architecturalSolution) ? 'recorded' : 'open', value: str(C.architecturalSolution), empty: 'Describe the architectural approach this component takes.'});
  if (C.patterns.length) field('decisions', 'patterns', 'Patterns, styles and tactics', where(5, 'components', id), {counted: false, value: C.patterns.map(x => str(x.name)).join(' · ')});
  const solutions = list(C.architectureSolutions).map(s => ({id: s.id, taskId: str(s.taskId), mechanism: [s.mechanism?.pattern, s.mechanism?.style, s.mechanism?.tactic, s.mechanism?.capability].filter(Boolean).map(str).join(' · ') || 'Reviewed approach', decision: s.decisionId ? {text: str(s.decisionId), chapter: 3, id: s.decisionId, path: modelPath(3, s.decisionId)} : null, drivers: list(s.driverIds).map(did => ({text: did, chapter: 2, id: did, path: modelPath(2, did)})), state: str(s.state)}));
  if (solutions.length) field('decisions', 'applied', 'Applied designs', where(5, 'components', id), {counted: false, rows: solutions});
  const obligations = reading.obligations.map(o => {
    const state = o.verificationState || 'open';
    const refs = [...list(o.evidenceRefs).map(r => ({...r, earlier: false})), ...list(o.verificationActions).filter(a => !a.verified && a.verification?.reference).map(a => ({...a.verification, actionId: a.id, earlier: true}))];
    return {id: o.id, kind: str(o.kind) || 'verification', state, stateWord: OBLIGATION_STATES[state] || 'Open obligation', tone: state === 'review-required' ? 'attention' : 'quiet', declared: !!o.declared, action: str(o.action || o.detail || o.title) || 'Define the obligation', evidence: str(o.evidence),
      references: refs.map(r => ({reference: str(r.reference) || 'Evidence reference', reviewer: str(r.reviewer), at: str(r.at), earlier: r.earlier, action: r.actionId ? {text: 'Open verification action', chapter: 11, id: r.actionId, path: workPath(11, r.actionId)} : null})), reasons: list(o.verificationReasons).map(str), verified: state === 'current-verified', firstAction: list(o.verificationActions)[0]?.id || null};
  });
  if (obligations.length) field('decisions', 'obligations', 'Verification obligations', where(11, 'actions', obligations.find(o => !o.verified)?.firstAction || null), {state: obligations.every(o => o.verified) ? 'recorded' : 'open', rows: obligations, value: `${obligations.filter(o => o.verified).length} of ${obligations.length} verified`, empty: 'Verify each obligation with current evidence in Chapter 11.'});
  section('decisions');

  // 9 · Provenance.
  const last = list(c.history).at(-1);
  field('provenance', 'source', 'Source', where(5, 'components', id), {state: str(c.source) ? 'recorded' : 'open', value: str(c.source), empty: 'Name where this component came from (a decision, a catalogue archetype, a document).'});
  field('provenance', 'authorship', 'Authorship', where(5, 'components', id), {counted: false, value: provenance.line || provenance.label});
  field('provenance', 'confirmation', 'Confirmation', where(5, 'components', id), {state: provenance.reviewed ? 'recorded' : 'open', value: provenance.reviewed ? provenance.label : '', empty: 'Review and confirm this component as a person; a seeded or drafted record is not confirmed by being read.'});
  field('provenance', 'origin', 'Origin', where(5, 'components', id), {counted: false, value: [str(c.origin), header.objectStatus].filter(Boolean).join(' · ')});
  field('provenance', 'revision', 'Revision', where(5, 'components', id), {counted: false, value: 'Revision ' + (c.revision ?? 1) + (list(c.history).length ? ' · ' + plural(list(c.history).length, 'change') : '')});
  field('provenance', 'changed', 'Last change', where(5, 'components', id), {counted: false, state: last ? 'recorded' : 'inferred', value: last ? [str(last.event || last.action || ('revision ' + (last.revision || ''))), day(last.at)].filter(Boolean).join(' · ') : '', empty: 'No record-specific change is written; saved changes stay in the project history.'});
  if (header.sourceChanged) field('provenance', 'source-changed', 'Source basis', where(5, 'components', id), {counted: false, state: 'open', empty: 'An allocated responsibility, requirement, driver, decision or mapping changed since the component basis was recorded: review the component.'});
  section('provenance');

  // Completeness over the template's fields; the omissions are the open ones, each with where to record it.
  const counted = fields.filter(f => f.counted), recorded = counted.filter(f => f.state === 'recorded').length, inferred = counted.filter(f => f.state === 'inferred').length, open = counted.filter(f => f.state === 'open');
  const completeness = {recorded, inferred, open: open.length, total: counted.length, percent: counted.length ? Math.round(100 * recorded / counted.length) : 0};
  const omissions = open.map(f => ({id: f.id, label: f.label, section: f.section, sectionTitle: SECTION[f.section].title, chapter: f.where.chapter, where: f.where.section, path: f.where.path, text: f.empty || 'Record it.'}));
  const attention = specReviewItems(C, reading).map(item => ({...item, action: item.action.kind === 'work' ? {...item.action, path: workPath(item.action.chapter, item.action.id)} : item.action}));
  const perSection = Object.fromEntries(sections.map(s => { const own = s.fields.filter(f => f.counted); return [s.id, {recorded: own.filter(f => f.state === 'recorded').length, total: own.length, open: own.filter(f => f.state === 'open').length, inferred: own.filter(f => f.state === 'inferred').length}]; }));
  perSection.header = {recorded: counted.filter(f => f.section === 'header' && f.state === 'recorded').length, total: counted.filter(f => f.section === 'header').length, open: open.filter(f => f.section === 'header').length, inferred: 0};
  return {id, ref: C.ref, title: C.title, header, sections, completeness, omissions, attention, perSection, gaps: C.gaps.slice(), fields: fields.map(f => ({id: f.id, section: f.section, label: f.label, state: f.state, counted: f.counted, chapter: f.where.chapter, where: f.where.section}))};
}
// Why a driver reaches this component, as the driver scope recorded it.
function driverPath(reading, path) {
  const r = reading.R;
  if (path.kind === 'direct-component') return {text: 'Directly scoped to this component', link: null};
  if (path.kind === 'responsibility-mapping') { const via = r.resp.get(path.via); return {text: 'Allocated through ' + (via ? named(via) : str(path.via)), link: via ? to(4, via) : null}; }
  if (path.kind === 'component-requirement') { const via = reading.requirements.get(path.via); return {text: 'Linked through requirement ' + (via ? named(via) : str(path.via)), link: via ? to(1, via) : null}; }
  if (path.kind === 'component-decision') { const via = r.decisions.find(d => d.id === path.via); return {text: 'Named by component decision ' + (via ? named(via) : str(path.via)), link: via ? to(3, via) : null}; }
  return {text: str(path.kind).replaceAll('-', ' ') + (path.via ? ' · ' + str(path.via) : ''), link: null};
}

