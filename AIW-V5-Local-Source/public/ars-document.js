// The Architecture requirements specification (round 11): the Chapter 2 quality drivers framed as a specification,
// read from the records the design already holds. Each driver is one requirement: its id, its scenario (stimulus,
// conditions, response), its measurable target (metric, operator, value, unit, window, measurement), how it is
// verified, its priority, owner and source, and its trace through the design (the Chapter 1 requirements, the
// responsibilities, components, decisions, controls and runtime plans that carry it, and the Chapter 6, 7 and 10 fields
// that name it through driverId). The conflicts Chapter 2 records follow, then the open items: targets that are not
// measurable, targets with no verification, targets no runtime plan carries, fields whose figure disagrees with the
// target, and categories no driver covers. Every driver appears exactly once. The same reading is a document of its own
// (Chapter 2 Output: Markdown, HTML, JSON), an annex of the SDD, and the Validate gate "every driver measurable,
// verified and carried by a plan". Pure functions: nothing here changes the project, and nothing is approved by being
// written down.
// Round 12 (workstream F): a stated figure always prints, followed by what keeps it from being measurable, in the words
// the component specification uses (GR-DRV-05); a driver is carried only when a Chapter 6 capability, a Chapter 7
// realisation or a Chapter 10 plan names it, and the plans its components run under are listed apart as reached
// through them (GR-DRV-06); the Chapter 1 constraints and assumptions follow the requirements, each with the records it
// constrains or informs, and the open ones are open items (GR-DRV-07). Then the Chapter 8 invariants the data must keep,
// each with the data it binds and the contracts that must keep it, and the batch chain as the sequence its contracts run
// in, with their windows and cut-offs; an invariant without its condition, check or owner and a batch contract that
// does not say when it runs, its window or its cut-off are open items (GR-SDD-28).
import {driverChain} from './design-reasoning.js';
import {reasoningFor} from './design-spec.js';
import {attribute} from './playbook-knowledge.js';
import {QUALITY_TYPES, targetIsMeasurable, statedText, targetText, orderedDrivers, conflictIsResolved, isQualityDriver, isPlaceholder, driverPriority, driverCodes, driversByKind, TARGET_FIELDS} from './quality-domain.js';
import {fieldOpen} from './open-fields.js';
import {sddPriority} from './priority-scale.js';
import {linksToDriver, linksIndex} from './driver-links.js';
import {list, str, plural, joinAnd} from './util.js';
import {passValue} from './document-memo.js';
import {invariants as invariantRecords, batchChain} from './interfaces-domain.js';

export const ARS_TITLE = 'Architecture requirements specification';
// The quality drivers alone (round 12, D-02): the other kinds of driver carry no measurable target, and the scope names them.
const qualityOrdered = p => (p?.quality ? orderedDrivers(p).filter(isQualityDriver) : []);
// A verification is named when it says how, not when it holds an open question or a placeholder (round 12, G-31).
const verifies = d => !!str(d.measurement) && !fieldOpen(d, 'measurement');

// What a category covers, in the playbook's words where it has them and the category's own otherwise.
function categoryText(t) {
  const k = attribute(t.id);
  return str(t.description) || str(k?.guide?.definition) || str(k?.note) || '';
}
// Why a target is not measurable, in the words of the check that says so (quality-domain.js targetIsMeasurable).
function unmeasurableWhy(d) {
  const missing = [];
  if (!statedText(d.metric)) missing.push('a metric');
  if (!str(d.operator)) missing.push('a comparator');
  if (d.targetValue === '' || d.targetValue == null || !Number.isFinite(Number(d.targetValue)) || Number(d.targetValue) < 0) missing.push('a numeric target');
  if (!statedText(d.unit)) missing.push('a unit');
  if (!statedText(d.window)) missing.push('a measurement window');
  if (!statedText(d.measurement)) missing.push('a verification');
  if (missing.length) return 'needs ' + joinAnd(missing);
  const open = TARGET_FIELDS.filter(k => fieldOpen(d, k));
  if (open.length) return `leaves its ${joinAnd(open.map(k => k === 'measurement' ? 'verification' : k))} open: no source states ${open.length === 1 ? 'it' : 'them'}, or ${open.length === 1 ? 'it is' : 'they are'} an open question`;
  if ([d.metric, d.unit, d.measurement, d.window].some(isPlaceholder)) return 'still holds a placeholder or a subjective word';
  return 'is not measurable as recorded';
}

// A target in words (GR-DRV-05), the same in this specification, the component specifications and the SDD: the metric,
// then the comparator, value and unit as recorded, the window and the verification; what is missing is named after the
// figure ("window and verification not stated"), never in its place. {figure, metric, window, verification, missing,
// measurable, text}; text is '' when no figure is stated.
const OP_WORDS = {'At least': 'at least', 'At most': 'at most', Exactly: 'exactly'};
const stated = (d, k) => (str(d?.[k]) && !fieldOpen(d, k) ? str(d[k]) : '');
export function targetWords(d) {
  const value = d?.targetValue === '' || d?.targetValue == null ? '' : String(d.targetValue).trim();
  const figure = value ? [OP_WORDS[d.operator] || str(d.operator).toLowerCase(), value, str(d.unit)].filter(Boolean).join(' ') : '';
  const metric = stated(d, 'metric'), window = stated(d, 'window'), verification = stated(d, 'measurement'), measurable = !!d && targetIsMeasurable(d);
  const missing = [!window && 'window', !verification && 'verification'].filter(Boolean);
  const span = /^(?:over|across|from|for|during|in|within|per|each|at|between|on|by|throughout|every|until)\b/i.test(window) ? window.replace(/^\w/, c => c.toLowerCase()) : 'over ' + window.replace(/^([A-Z])(?=[a-z ])/, c => c.toLowerCase());
  const text = figure ? (metric ? metric + ' ' : '') + figure + (window ? ' ' + span : '') + (verification ? '; verification: ' + verification.replace(/[.]$/, '') : '') + (missing.length ? '; ' + joinAnd(missing) + ' not stated' : '') + (!measurable && !missing.length ? '; not measurable as recorded' : '') : '';
  return {figure, metric, window, verification, missing, measurable, text};
}

// Which drivers are carried (GR-DRV-06): those a Chapter 6 capability, a Chapter 7 realisation or a Chapter 10 plan names
// (driver-links.js), read once per pass. A plan that runs one of the driver's components carries nothing by that alone:
// the specification lists such plans apart, as reached through the components.
function carriedDrivers(p) {
  return passValue(p, 'ars:carried', () => new Set([...linksIndex(p).keys()]));
}
const NAMED_BY = 'is named by no runtime plan, capability or realisation (Chapters 6, 7 and 10)';

// One driver as one requirement, with its trace.
function requirementOf(R, p, d, links = linksIndex(p)) {
  const chain = driverChain(R, d.id) || {requirements: [], responsibilities: [], components: [], decisions: [], plans: [], contracts: []};
  const compIds = new Set(chain.components.map(c => c.id)), contractIds = new Set(chain.contracts.map(c => c.id));
  const planControls = new Set(chain.plans.flatMap(f => list(f.plan.controlIds)));
  const controls = R.controls.filter(k => planControls.has(k.id) || list(k.targetIds).some(t => compIds.has(t) || contractIds.has(t)));
  const fields = linksToDriver(p, d.id, links).map(x => ({chapter: x.chapter, kind: x.kind, field: x.field, id: x.record.id, ref: x.ref, title: x.title, recorded: x.link.recorded.text, target: x.link.target ? x.link.target.text : '', state: x.link.state, why: x.link.why}));
  const named = linksToDriver(p, d.id, links), carriers = [...new Map(named.map(x => [x.record.id, {chapter: x.chapter, id: x.record.id, ref: x.ref, title: x.title}])).values()];
  const reached = chain.plans.filter(f => !carriers.some(c => c.id === f.plan.id)).map(f => ({id: f.plan.id, ref: f.plan.ref || f.plan.id, title: str(f.plan.title)}));
  const measurable = targetIsMeasurable(d), verified = verifies(d), carried = carriers.length > 0;
  const open = [];
  if (!measurable) open.push({kind: 'unmeasurable', text: `${d.id} ${unmeasurableWhy(d)}.`});
  if (!verified) open.push({kind: 'unverified', text: `${d.id} names no verification.`});
  if (!carried) open.push({kind: 'uncarried', text: `${d.id} ${NAMED_BY}${reached.length ? '; its components run under ' + reached.map(x => x.ref).join(', ') + ', which do not name it' : ''}.`});
  for (const f of fields) if (f.state === 'breaks') open.push({kind: 'disagreement', text: `${f.ref} (Chapter ${f.chapter}) records ${f.recorded} against ${d.id}'s ${f.target}: ${f.why}`});
  return {id: d.id, code: driverCodes(p).get(d.id) || d.id, scenarioId: str(d.scenarioId), title: str(d.title), category: d.category, categoryName: QUALITY_TYPES.find(t => t.id === d.category)?.name || d.category,
    priority: sddPriority('driver', driverPriority(d)), rank: d.rank, owner: str(d.owner), source: str(d.source), origin: str(d.origin), confirmed: !!d.confirmed, targetConfirmed: !!d.targetConfirmed, rationale: str(d.rationale), tactic: str(d.tactic),
    scenario: {stimulus: str(d.stimulus), conditions: str(d.conditions), response: str(d.response)},
    target: {metric: str(d.metric), operator: str(d.operator), value: d.targetValue == null ? '' : String(d.targetValue), unit: str(d.unit), window: str(d.window), measurement: str(d.measurement), text: targetText(d), words: targetWords(d), measurable},
    verification: str(d.measurement), verified, carried, carriers,
    trace: {requirements: chain.requirements.map(a => ({id: a.id, title: str(a.title)})), responsibilities: chain.responsibilities.map(r => ({id: r.id, ref: r.ref || r.id, title: str(r.title)})),
      components: chain.components.map(c => ({id: c.id, ref: c.ref || c.id, title: str(c.title)})), decisions: chain.decisions.map(x => ({id: x.record.id, question: str(x.record.question), chosen: x.selected ? x.selected.id : null})),
      controls: controls.map(k => ({id: k.id, ref: k.ref || k.id, title: str(k.title)})), plans: chain.plans.map(f => ({id: f.plan.id, ref: f.plan.ref || f.plan.id, title: str(f.plan.title)})), reachedPlans: reached, fields},
    open};
}

// The requirements, worked out once for the length of a pass over the document (document-memo.js): the SDD section,
// the gate and the Output document read the same reading. The reasoning source and its chains are kept per project
// object (design-spec.js reasoningFor), so the companion reads the same chains too.
function arsRequirements(p) {
  return passValue(p, 'ars:requirements', () => { const R = reasoningFor(p), links = linksIndex(p); return qualityOrdered(p).map(d => requirementOf(R, p, d, links)); });
}

// The specification as data: what the Markdown prints and the JSON export carries.
export function arsDocument(p) {
  const requirements = arsRequirements(p), drivers = requirements.map(r => ({id: r.id, category: r.category}));
  const categories = QUALITY_TYPES.map(t => ({id: t.id, name: t.name, description: categoryText(t), drivers: drivers.filter(d => d.category === t.id).map(d => d.id)}));
  const conflicts = list(p?.quality?.conflicts).map(c => ({id: c.id, title: str(c.title), driverIds: list(c.driverIds), status: str(c.status) || 'open', resolved: p?.quality ? conflictIsResolved(p, c) : false, owner: str(c.owner), effect: str(c.effect), resolution: str(c.resolution)}));
  const open = {
    unmeasurable: requirements.filter(r => !r.target.measurable).map(r => ({id: r.id, text: r.open.find(o => o.kind === 'unmeasurable').text})),
    unverified: requirements.filter(r => !r.verified).map(r => ({id: r.id, text: r.open.find(o => o.kind === 'unverified').text})),
    uncarried: requirements.filter(r => !r.carried).map(r => ({id: r.id, text: r.open.find(o => o.kind === 'uncarried').text})),
    disagreements: requirements.flatMap(r => r.open.filter(o => o.kind === 'disagreement').map(o => ({id: r.id, text: o.text}))),
    emptyCategories: categories.filter(c => !c.drivers.length).map(c => c.name),
    conflicts: conflicts.filter(c => !c.resolved).map(c => ({id: c.id, text: `${c.id} ${c.title} (${c.driverIds.join(' and ')}) is ${c.status === 'resolved' ? 'resolved, but a driver changed since' : 'open'}.`}))
  };
  // The Chapter 1 constraints and assumptions (GR-DRV-07), each with the records it constrains or informs: its links,
  // the constraint drivers that name it and the rules that refine it. A constraint that constrains nothing and an
  // assumption nobody confirmed are open items.
  const arts = list(p?.artefacts), byId = new Map(arts.map(a => [a.id, a])), rels = list(p?.relationships), codesOf = p?.quality ? driverCodes(p) : new Map();
  const bound = a => { const out = new Map(); for (const r of rels) { const other = r.from === a.id ? r.to : r.to === a.id ? r.from : null; if (other && byId.has(other)) out.set(other, {id: other, ref: other, title: str(byId.get(other).title), kind: r.kind}); } for (const d of list(p?.quality?.drivers)) if (list(d.constraintIds).includes(a.id)) out.set(d.id, {id: d.id, ref: codesOf.get(d.id) || d.id, title: str(d.title), kind: 'constraint driver'}); for (const x of arts) if (x.type === 'rule' && x.refinesId === a.id) out.set(x.id, {id: x.id, ref: x.id, title: str(x.title), kind: 'refines'}); return [...out.values()]; };
  const ofType = t => arts.filter(a => a.type === t && a.scopeMode !== 'out').map(a => ({id: a.id, title: str(a.title), description: str(a.description), owner: str(a.owner), source: str(a.source), confirmed: !!a.confirmed, records: bound(a)}));
  const constraints = ofType('constraint'), assumptions = ofType('assumption');
  open.constraints = constraints.filter(c => !c.records.length).map(c => ({id: c.id, text: `${c.id} ${c.title} constrains no recorded record yet.`}));
  open.assumptions = assumptions.filter(a => !a.confirmed).map(a => ({id: a.id, text: `${a.id} ${a.title} is not confirmed.`}));
  // The invariants and the batch chain (GR-SDD-28): what the data must keep and the order the batch contracts run in.
  const dataById = new Map(list(p?.interfaces?.data).map(d => [d.id, d])), contractById = new Map(list(p?.interfaces?.contracts).map(c => [c.id, c])), said = (r, k) => (fieldOpen(r, k) ? '' : str(r?.[k]));
  const named = (m, id) => ({id, ref: str(m.get(id)?.ref) || id, title: str(m.get(id)?.title)});
  const invariants = invariantRecords(p).map(r => ({id: r.id, ref: str(r.ref) || r.id, title: str(r.title), kind: said(r, 'kind'), condition: said(r, 'condition'), check: said(r, 'check'), owner: said(r, 'owner'), data: list(r.dataIds).map(id => named(dataById, id)), contracts: list(r.contractIds).map(id => named(contractById, id))}));
  const chain = p?.interfaces ? batchChain(p) : {steps: [], cycles: [], text: ''}, refOf = id => str(contractById.get(id)?.ref) || id;
  const batch = {sequence: chain.steps.length ? chain.text : '', steps: chain.steps.map(x => ({id: x.id, ref: x.ref, title: str(x.title), order: x.level + 1, trigger: x.trigger, schedule: x.schedule, window: x.window, cutOff: x.cutOff, after: x.after.map(refOf), restartPoint: x.restartPoint, volume: x.volume, windows: x.windows.map(w => ({plan: w.planRef || w.planId, name: w.name}))})), cycles: chain.cycles.map(refOf)};
  const missing = (x, fields) => fields.filter(([k]) => !str(x[k])).map(([, w]) => w);
  open.invariants = invariants.map(r => [r, missing(r, [['condition', 'its condition'], ['check', 'how it is checked'], ['owner', 'who owns it']])]).filter(([, m]) => m.length).map(([r, m]) => ({id: r.ref, text: `${r.ref} ${r.title} does not say ${joinAnd(m)}.`}));
  open.batch = [...batch.steps.map(x => [x, missing(x, [['trigger', 'what triggers it'], ['schedule', 'when it runs'], ['window', 'its window'], ['cutOff', 'its cut-off']])]).filter(([, m]) => m.length).map(([x, m]) => ({id: x.ref, text: `${x.ref} ${x.title} does not say ${joinAnd(m)}.`})), ...batch.cycles.map(ref => ({id: ref, text: `${ref} waits, through the contracts before it, for itself, so the chain has no first run there.`}))];
  const covered = categories.filter(c => c.drivers.length).length;
  const purpose = 'This specification states what the design must achieve beyond its functions: how fast, how available, how safe, how recoverable, and under what conditions. Each requirement is a quality scenario from Chapter 2 with a measurable target, and each is traced to the parts of the design that carry it.';
  const scope = drivers.length
    ? `It covers ${plural(drivers.length, 'requirement')} in ${plural(covered, 'category', 'categories')}, for ${str(p?.name) || 'this project'}. A requirement is traced to its Chapter 1 requirements, the responsibilities, components, decisions, controls and runtime plans that carry it, and the Chapter 6, 7 and 10 figures that name it. It leaves out what is not recorded, and says so under open items. Reference content and unconfirmed targets keep their status; nothing here is approved by being written down.`
    : `No quality driver is recorded yet for ${str(p?.name) || 'this project'}. Record the first scenario in Chapter 2 and this specification fills from it.`;
  // The drivers of the other kinds, named by code in the scope (round 12, D-02): they carry no measurable target.
  const codes = p?.quality ? driverCodes(p) : new Map(), others = p?.quality ? driversByKind(p).filter(x => x.kind.id !== 'quality').map(x => ({kind: x.kind.id, name: x.kind.name, codes: x.drivers.map(d => codes.get(d.id))})) : [];
  const scopeOthers = others.length ? ` The driver register also holds ${joinAnd(others.map(o => o.name.toLowerCase() + (o.codes.length === 1 ? ' driver ' : ' drivers ') + joinAnd(o.codes)))}. They say what the design must answer and carry no measurable target, so this specification names them and Chapter 2 holds them.` : '';
  const total = Object.values(open).reduce((n, xs) => n + xs.length, 0);
  const scopeData = invariants.length || batch.steps.length ? ` From Chapter 8 it carries ${joinAnd([invariants.length ? plural(invariants.length, 'invariant') + ' the data must keep' : '', batch.steps.length ? 'the batch chain of ' + plural(batch.steps.length, 'contract') : ''].filter(Boolean))}.` : '';
  return {title: ARS_TITLE, project: str(p?.name), purpose, scope: scope + scopeOthers + scopeData, others, categories, requirements, conflicts, constraints, assumptions, invariants, batch, open,
    counts: {requirements: requirements.length, categories: covered, measurable: requirements.filter(r => r.target.measurable).length, verified: requirements.filter(r => r.verified).length, carried: requirements.filter(r => r.carried).length, open: total}};
}

// The Validate gate: every driver measurable, verified and carried by a runtime plan. It informs; it blocks nothing.
// It reads the drivers, the carried set and the links alone, not the whole document with its chains, so Chapter 11's
// checks and the readiness board stay light; its items say what the document's open items say.
export function arsGate(p) {
  const drivers = qualityOrdered(p), carriedSet = carriedDrivers(p), links = linksIndex(p), items = [];
  if (!drivers.length) items.push({id: 'ars:none', driverId: null, title: 'No quality driver is recorded', detail: 'Record a quality scenario in Chapter 2; the specification fills from it.'});
  let measurable = 0, verified = 0, carried = 0;
  for (const d of drivers) {
    const ok = targetIsMeasurable(d), seen = verifies(d), run = carriedSet.has(d.id);
    measurable += ok ? 1 : 0; verified += seen ? 1 : 0; carried += run ? 1 : 0;
    if (!ok) items.push({id: 'ars:measurable:' + d.id, driverId: d.id, title: `${d.id} is not measurable yet`, detail: `${d.id} ${unmeasurableWhy(d)}.`});
    if (!seen) items.push({id: 'ars:verified:' + d.id, driverId: d.id, title: `${d.id} names no verification`, detail: 'Say how the target will be checked (Chapter 2 · the scenario\'s verification).'});
    if (!run) items.push({id: 'ars:carried:' + d.id, driverId: d.id, title: `${d.id} is carried by no runtime plan`, detail: `${d.id} ${NAMED_BY}: name it on the plan, capability or realisation that carries it.`});
    for (const x of linksToDriver(p, d.id, links)) if (x.link.state === 'breaks') items.push({id: 'ars:disagree:' + d.id + ':' + x.ref, driverId: d.id, title: `${x.ref} disagrees with ${d.id}`, detail: `${x.ref} (Chapter ${x.chapter}) records ${x.link.recorded.text} against ${d.id}'s ${x.link.target.text}: ${x.link.why}`});
  }
  const n = drivers.length;
  return {drivers: n, measurable, verified, carried, pass: n > 0 && !items.length, items, text: n ? `${measurable} of ${n} measurable · ${verified} verified · ${carried} named by a plan, capability or realisation` : 'No quality driver is recorded'};
}

// ---------------------------------------------------------------- Markdown
// The same text as a document of its own (level 1: the title is "#") or as a section of the SDD (level 2: the title is
// "##" and the SDD's section splitter keeps it as one front section). It prints no word the SDD's open-item rules read
// as a gap ("Not recorded", "Unassigned", "Target not defined"): what is open is listed in its own words, once, under
// Open items, so the SDD's Appendix A is not doubled.
const or = (v, words) => (str(v) ? str(v) : words);
const refs = xs => (xs.length ? xs.map(x => x.ref || x.id).join(', ') : 'none');
const STATE_WORD = {holds: 'agrees', breaks: 'disagrees', unknown: 'not compared'};
export function arsMarkdown(p, {level = 1, follow = ''} = {}) {
  const A = arsDocument(p), H = n => '#'.repeat(Math.max(1, Math.min(6, level + n - 1))) + ' ';
  let md = H(1) + ARS_TITLE + '\n\n' + (A.project ? A.project + ' · ' : '') + 'Working draft, read from the Chapter 2 drivers and the records that carry them. Nothing here is approved by being written down.\n\n';
  md += H(2) + 'Purpose and scope\n\n' + A.purpose + '\n\n' + A.scope + '\n\n';
  md += H(2) + 'Categories\n\n| Category | Drivers | What it covers |\n| --- | --- | --- |\n' + A.categories.map(c => `| ${c.name} | ${c.drivers.length ? c.drivers.join(', ') : 'none'} | ${c.description || ''} |`).join('\n') + '\n\n';
  md += H(2) + 'Requirements\n\n';
  if (!A.requirements.length) md += 'No requirement yet: no quality driver is recorded in Chapter 2.\n\n';
  for (const r of A.requirements) {
    const t = r.target;
    md += H(3) + `${r.id} · ${r.title}\n\n`;
    md += `Code: ${r.code} · Category: ${r.categoryName} · Scenario: ${or(r.scenarioId, r.id)} · Priority: ${or(r.priority, 'none yet')} · Owner: ${or(r.owner, 'no owner named')} · Source: ${or(r.source, 'no source named')} · Status: ${r.origin || 'user'}, ${r.confirmed ? 'confirmed' : 'unconfirmed'}${r.targetConfirmed ? ', target confirmed' : ', target an assumption'}\n\n`;
    md += `Stimulus: ${or(r.scenario.stimulus, 'none written')}\n\nConditions: ${or(r.scenario.conditions, 'none written')}\n\nResponse: ${or(r.scenario.response, 'none written')}\n\n`;
    md += `Target: ${t.words.text || 'no figure stated' + (t.metric ? ' for ' + t.metric : '')} · Measurable: ${t.measurable ? 'yes' : 'no, ' + unmeasurableWhy({...t, targetValue: t.value})}\n\n`;
    md += `Verification: ${or(r.verification, 'no verification named')}\n\n`;
    if (r.rationale) md += `Why this priority: ${r.rationale}\n\n`;
    if (r.tactic) md += `Candidate tactic: ${r.tactic}\n\n`;
    md += `Trace: Requirements: ${refs(r.trace.requirements)} · Responsibilities: ${refs(r.trace.responsibilities)} · Components: ${refs(r.trace.components)} · Decisions: ${r.trace.decisions.length ? r.trace.decisions.map(d => d.id + (d.chosen ? ' (chosen ' + d.chosen + ')' : ' (open)')).join(', ') : 'none'} · Controls: ${refs(r.trace.controls)}\n\nCarried by: ${r.carriers.length ? r.carriers.map(c => c.ref + ' (Chapter ' + c.chapter + ')').join(', ') : 'no plan, capability or realisation names it'} · Runtime plans reached through its components: ${refs(r.trace.reachedPlans)}\n\n`;
    if (r.trace.fields.length) md += 'Linked figures:\n\n' + r.trace.fields.map(f => `- ${f.ref} ${f.title} (Chapter ${f.chapter}, ${f.kind}): records ${f.recorded} against ${f.target || 'no target'} · ${STATE_WORD[f.state] || f.state}: ${f.why}`).join('\n') + '\n\n';
  }
  md += H(2) + 'Conflicts\n\n' + (A.conflicts.length ? A.conflicts.map(c => `- ${c.id} · ${c.title} · ${c.driverIds.join(' and ')} · ${c.resolved ? 'resolved' : c.status === 'resolved' ? 'resolved, but a driver changed since' : 'open'}${c.owner ? ' · Owner: ' + c.owner : ''}${c.resolution ? ' · ' + c.resolution : ''}`).join('\n') : 'No conflict is recorded between these requirements.') + '\n\n';
  md += H(2) + 'Constraints\n\n' + (A.constraints.length ? A.constraints.map(c => `- ${c.id} · ${c.title}${c.description && c.description !== c.title ? ': ' + c.description : ''} · ${c.confirmed ? 'confirmed' : 'unconfirmed'} · Constrains: ${c.records.length ? c.records.map(x => x.ref + ' ' + x.title).join('; ') : 'no recorded record yet'}`).join('\n') : 'No constraint is recorded in Chapter 1.') + '\n\n';
  md += H(2) + 'Assumptions\n\n' + (A.assumptions.length ? A.assumptions.map(a => `- ${a.id} · ${a.title}${a.description && a.description !== a.title ? ': ' + a.description : ''} · ${a.confirmed ? 'confirmed' : 'not confirmed'} · Informs: ${a.records.length ? a.records.map(x => x.ref + ' ' + x.title).join('; ') : 'no recorded record yet'}`).join('\n') : 'No assumption is recorded in Chapter 1.') + '\n\n';
  md += H(2) + 'Data invariants\n\n' + (A.invariants.length ? A.invariants.map(r => `- ${r.ref} · ${r.title} · ${r.kind || 'kind not stated'}: ${r.condition || 'condition not stated'} · Binds: ${r.data.map(d => d.ref + (d.title ? ' ' + d.title : '')).join('; ')} · Kept by: ${r.contracts.length ? r.contracts.map(c => c.ref + (c.title ? ' ' + c.title : '')).join('; ') : 'no contract named'} · Checked: ${r.check || 'no check named'} · Owner: ${r.owner || 'no owner named'}`).join('\n') : 'No invariant is recorded in Chapter 8.') + '\n\n';
  md += H(2) + 'Batch chain\n\n' + (A.batch.steps.length ? `The batch contracts in the order they run: ${A.batch.sequence}.\n\n` + A.batch.steps.map(x => `- ${x.order}. ${x.ref} · ${x.title} · Trigger: ${x.trigger || 'not stated'} · When: ${x.schedule || 'not stated'} · Window: ${x.window || 'not stated'}${x.windows.length ? ' (' + x.windows.map(w => w.plan + ' ' + w.name).join(', ') + ')' : ''} · Cut-off: ${x.cutOff || 'not stated'} · After: ${x.after.length ? x.after.join(', ') : 'nothing'} · Restart point: ${x.restartPoint || 'not stated'} · Volume: ${x.volume || 'not stated'}`).join('\n') : 'No batch contract is recorded in Chapter 8.') + '\n\n';
  md += H(2) + 'Open items\n\n';
  const O = A.open, lines = [];
  for (const [k, label] of [['unmeasurable', 'Targets not yet measurable'], ['unverified', 'Targets without a verification'], ['uncarried', 'Targets no plan, capability or realisation names'], ['disagreements', 'Figures that disagree with their target'], ['conflicts', 'Conflicts still open'], ['constraints', 'Constraints that constrain no record yet'], ['assumptions', 'Assumptions not confirmed'], ['invariants', 'Invariants that leave something unsaid'], ['batch', 'Batch contracts that leave their schedule unsaid']]) if (O[k].length) lines.push(`${label}:\n\n` + O[k].map(x => '- ' + x.text).join('\n'));
  if (O.emptyCategories.length) lines.push(`Categories no driver covers: ${O.emptyCategories.join(', ')}.`);
  md += (lines.length ? lines.join('\n\n') : 'Nothing is open: every requirement is measurable, verified and named by what carries it, every category has a driver, every constraint constrains a record, every assumption is confirmed, and every invariant and batch contract says what it keeps and when it runs.') + '\n\n';
  if (follow) md += follow + '\n\n';
  return md;
}
// The SDD section: the same text one level down, so the SDD keeps it as one front section with its parts inside; it
// hands over to the performance specification that follows it, which works out the capacity target part by part.
export const arsSection = p => arsMarkdown(p, {level: 2, follow: 'The performance specification that follows works out what the review objective or the scalability target asks of each running part.'});
// The JSON export: the data, with when it was read and what it is.
export const arsJSON = p => ({exportedAt: new Date().toISOString(), document: 'architecture-requirements-specification', ...arsDocument(p), guidance: 'Read by rule from the Chapter 2 drivers and the records that carry them; no independent evidence verification, and nothing approved.'});
