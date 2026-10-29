// A selected object's connected reading for every chapter Model companion. The document and its
// canonical graph are the only sources; this module never interprets a missing link as a fact.
// Chapter 5's full Specification view remains the place for an exhaustive component sheet.
import {architectureModel} from './architecture-model.js';
import {findRecord, homeChapter} from './chapter-reasoning.js';
import {reasoningFor, specFor, componentSpec} from './design-spec.js';
import {optionSpecification, realizationSources, realizationCriteria, optionAssessmentCurrent, ASSESSMENT_EFFECTS, selectionLabel, selectionState} from './technology-realisation-domain.js';
import {driverPriority, driverKind, driverKindOf} from './quality-domain.js';
import {technologyProductUsage} from './technology-catalogue.js';
import {linkedRequirementIds} from './requirement-links.js';
import {projectURL} from './project-context.js';
import {esc, safeUrl} from './html-escape.js';
import {observedEvidenceForObject} from './model-conformance.js';
import {enterpriseReferences} from './enterprise-references.js';

const text = value => typeof value === 'string' ? value.trim() : value == null ? '' : String(value);
const title = r => text(r?.title || r?.question || r?.name || r?.id);
const ref = r => text(r?.ref || r?.id);
const unique = records => [...new Map(records.filter(Boolean).map(r => [r.id, r])).values()];
const get = (p, id) => findRecord(p, id)?.record || null;
const href = (p, id, chapter = null, model = '') => {
  const ch = chapter || homeChapter(p, id) || architectureModel(p).objects.get(id)?.chapter;
  return ch ? projectURL(`/?chapter=${encodeURIComponent(ch)}&tab=model${model ? '&model=' + encodeURIComponent(model) : ''}&object=${encodeURIComponent(id)}`) : '';
};
const go = (p, id, label, chapter, model) => {
  const url = href(p, id, chapter, model);
  return url ? `<a href="${esc(url)}">${esc(label)}</a>` : `<span>${esc(label)}</span>`;
};
const row = (name, value) => text(value) ? `<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>` : '';
const paragraphs = lines => lines.filter(([, value]) => text(value)).map(([label, value]) => `<div class="nt-dossier-text"><b>${esc(label)}</b><p>${esc(value)}</p></div>`).join('');
// Keep the first reading short in the 300px companion, while preserving an exact route to
// every related record. A count without the remaining records made large dossiers dead ends.
const remaining = (records, limit, label, render, listClass = 'nt-dossier-links') => records.length > limit
  ? `<details class="nt-dossier-rest"><summary>Show ${records.length - limit} remaining ${esc(label)}</summary><ul class="${esc(listClass)}">${records.slice(limit).map(render).join('')}</ul></details>` : '';
const linkList = (p, records, empty, chapter = null) => records.length
  ? `<ul class="nt-dossier-links">${records.slice(0, 8).map(r => `<li>${go(p, r.id, `${ref(r)} · ${title(r)}`, chapter)}</li>`).join('')}</ul>${remaining(records, 8, 'connected records', r => `<li>${go(p, r.id, `${ref(r)} · ${title(r)}`, chapter)}</li>`)}`
  : `<p class="nt-dossier-empty">${esc(empty)}</p>`;

// A realization's option assessment is the architect's recorded judgement about a scenario,
// not a product guarantee. This concise read uses the same source chain as Chapter 7 Work.
function realizationReading(p, r) {
  const linked = realizationSources(p, r.id), drivers = unique(linked.drivers || []);
  const criteria = new Map(realizationCriteria(p, r.id).filter(c => c.kind === 'driver').map(c => [c.id, c]));
  const options = r.options || [], preferred = options.find(o => o.id === r.selectedOptionId);
  const status = selectionState(p, r), chosen = preferred ? `${preferred.product || preferred.title}${preferred.version ? ` · ${preferred.version}` : ''}` : '';
  const compare = projectURL(`/?chapter=7&tab=work&object=${encodeURIComponent(r.id)}&stage=compare`);
  const assess = (d, o) => {
    const a = o?.assessments?.[d.id], stale = !!a && !optionAssessmentCurrent(p, r, o, a);
    const effect = ASSESSMENT_EFFECTS.find(([id]) => id === a?.effect)?.[1] || 'Needs evidence', excluded = !stale && a?.effect === 'violates' && criteria.get(d.id)?.hard;
    return `<div class="nt-fit-option"><b>${esc(o?.product || o?.title || 'Unnamed option')}</b><span class="nt-fit-effect ${stale ? 'unknown' : a?.effect === 'supports' ? 'supports' : ['tension', 'violates'].includes(a?.effect) ? 'tension' : 'unknown'}">${esc(stale ? 'Review required' : excluded ? 'Excluded · breaks a hard constraint' : effect)}</span>${stale ? `<p class="nt-dossier-alert">${esc(a.reviewRequired || 'The supporting design or configuration changed. Review this earlier judgement.')}</p>` : ''}<p>${esc((stale ? 'Earlier judgement: ' + effect + ' · ' : '') + (a?.reason || 'Project-specific reasoning is still needed.'))}</p><small>${esc(a?.evidence ? `${stale ? 'Earlier evidence' : 'Evidence as recorded (verification separate)'}: ${a.evidence}` : 'No assessment evidence recorded.')}</small></div>`;
  };
  const driver = d => { const c = criteria.get(d.id); return `<li><div class="nt-fit-driver"><a href="${esc(href(p, d.id, 2))}">${esc(`${ref(d)} · ${title(d)}`)}</a><small>${esc(`${c?.hard ? 'Hard constraint' : driverKindOf(driverKind(d)).name} · ${c?.detail || 'Driver context open'} · ${driverPriority(d) || 'Priority open'}`)}</small></div>${preferred ? `${assess(d, preferred)}${options.length > 1 ? `<details class="nt-fit-other"><summary>Read ${options.length - 1} alternative assessment${options.length === 2 ? '' : 's'}</summary>${options.filter(o => o.id !== preferred.id).map(o => assess(d, o)).join('')}</details>` : ''}` : options.length ? `<details class="nt-fit-other"><summary>Read ${options.length} candidate assessment${options.length === 1 ? '' : 's'}</summary>${options.map(o => assess(d, o)).join('')}</details>` : '<p class="nt-dossier-empty">No product options recorded yet.</p>'}</li>`; };
  const alternative = preferred ? options.filter(o => o.id !== preferred.id) : options;
  return `<section class="nt-dossier-reading" aria-label="Technology choice and driver fit">
    <span class="nt-dossier-eyebrow">Decision reading · Chapter 7</span>
    <h5>${esc(chosen || 'Product choice open')}</h5><p class="nt-dossier-state">${esc(selectionLabel(p, r))}</p>
    <p>${esc(text(r.purpose) || 'Describe the capability this realization will serve.')}</p>
    <p><b>Why:</b> ${esc(text(r.rationale) || 'Selection rationale has not been recorded.')}</p>
    ${status === 'stale' ? '<p class="nt-dossier-alert">The recorded selection needs review after changes to its option or linked inputs.</p>' : ''}
    ${alternative.length ? `<p class="nt-dossier-alternatives"><b>${preferred ? 'Other options:' : 'Candidates:'}</b> ${esc(alternative.map(o => o.product || o.title || o.id).join(' · '))}</p>` : '<p class="nt-dossier-empty">No alternative option has been recorded.</p>'}
    ${preferred ? `<p class="nt-dossier-source">${esc(optionSpecification(preferred).sourceStatus)} · ${esc(preferred.evidence ? 'Option evidence as recorded; verify applicability' : 'Option evidence open')}</p>` : ''}
    <div class="nt-fit-heading"><b>Effect on architectural drivers</b><small>${drivers.length} linked through the capability design</small></div>
    ${drivers.length ? `<ul class="nt-fit-list">${drivers.slice(0, 4).map(driver).join('')}</ul>${remaining(drivers, 4, 'architectural drivers', driver, 'nt-fit-list')}` : '<p class="nt-dossier-empty">No architectural driver reaches this realization through its capabilities. Link a Chapter 2 driver before assessing fit.</p>'}
    <p class="nt-dossier-foot">These are recorded comparisons, not measured proof that a target is met. Source review, architect selection and external approval have separate states.</p>
    <a class="nt-dossier-compare" href="${esc(compare)}">Compare options and review evidence →</a>
  </section>`;
}

const incident = (graph, id, type) => [
  ...(graph.incoming.get(id) || []).filter(e => e.type === type).map(e => graph.objects.get(e.from)),
  ...(graph.outgoing.get(id) || []).filter(e => e.type === type).map(e => graph.objects.get(e.to))
].filter(x => x && x.id !== id);
const objects = (graph, ids) => unique(ids.map(id => graph.objects.get(id)).filter(Boolean));

function specification(p, kind, r, S, C) {
  const fields = [];
  const put = (name, value) => { if (text(value)) fields.push([name, value]); };
  if (kind === 'component') {
    put('Boundary', r.boundary); put('Inputs', r.inputs); put('Outputs', r.outputs);
    put('Architecture', r.architecturalSolution);
    put('Styles, patterns & tactics', (C?.patterns || []).map(x => x.name).join(' · '));
    put('Container', C?.container && `${ref(C.container)} · ${title(C.container)}${C.container.derived ? ' (derived)' : ''}`);
    put('Technology needs', r.technologyNeeds);
    for (const x of (C?.products || []).slice(0, 6)) put('Product for ' + (x.capabilities?.map(c => ref(c)).join(', ') || ref(x.realisation)), x.product?.product
      ? `${x.product.selected && x.realisation ? selectionLabel(p, x.realisation) : 'Candidate option'}: ${x.product.product}${x.product.version ? ' · release ' + x.product.version : ''}${x.configuration?.serviceTier ? ' · tier ' + x.configuration.serviceTier : ''}${x.product.vendor ? ' · ' + x.product.vendor : ''}${x.configuration?.topology ? ' · proposed ' + x.configuration.topology : ''}`
      : 'No product named');
    for (const x of (C?.properties || []).slice(0, 6)) put('Quality · ' + (x.concernName || x.concern), [x.statement, x.mechanism && 'Mechanism: ' + x.mechanism, x.source && 'Source: ' + x.source].filter(Boolean).join(' · '));
  } else if (kind === 'realisation') {
    const choice = r.options?.find(o => o.id === r.selectedOptionId);
    put('Selection', selectionLabel(p, r));
    if (!choice) put('Candidate products', (r.options || []).map(o => `${title(o)}${o.product ? ' · ' + o.product : ''}${o.version ? ' · ' + o.version : ''}`).join(' ; '));
    if (choice) {const s=optionSpecification(choice),usage=technologyProductUsage(p,choice.product).find(u=>u.realizationId===r.id&&u.optionId===choice.id);put('Product / service', choice.product);put('Product release', choice.version);put('Service tier / edition', s.serviceTier || 'To define');put('Provider', choice.vendor);put('Operating model', choice.operatingModel);put('Proposed topology', s.topology || 'To describe');put('Planned instances', s.replicaCount ?? 'To size');put('Failure domains', s.failureDomains || 'To define');put('Workload assumptions', s.workloadProfile || 'To establish');put('Configuration basis', s.specEvidence || 'Evidence or verification plan needed');put('Configuration status', s.sourceStatus + ' · ' + s.evidenceStatus);put('Source applicability', usage?.sourceVersionMismatch);put('Benefits', choice.benefits);put('Limitations', choice.drawbacks);}
    put('Capacity', text(r.capacityValue) ? `${r.capacityValue} ${text(r.capacityUnit)}` : '');
    put('Capacity basis', r.capacityBasis); put('Annual cost', text(r.annualCost) ? `${r.annualCost} ${text(r.currency)}` : '');
    put('Operations', r.operationsPlan); put('Resilience', r.resiliencePlan); put('Lifecycle / exit', r.lifecyclePlan);
  } else if (kind === 'plan' || kind === 'runtime') {
    put('State', r.stateMode); put('Ready copies', r.minReady); put('Maximum replicas', r.maxReplicas);
    put('Scaling', r.scalingPolicy); put('Recovery target', text(r.recoveryMinutes) ? r.recoveryMinutes + ' minutes' : '');
    put('Data loss target', text(r.lossMinutes) ? r.lossMinutes + ' minutes' : '');
    put('Recovery strategy', r.recoveryStrategy); put('Monitoring', r.monitoring); put('Runbook', r.runbook);
    if (S?.plans?.length) for (const f of S.plans.slice(0, 3)) put('Placement', f.placements.length
      ? `${f.active} active · ${f.standby} standby · ${f.zonesAll.length} zone${f.zonesAll.length === 1 ? '' : 's'}${f.open ? ` · ${f.open} without a stated role or replica count` : ''}`
      : 'Not placed');
  } else if (kind === 'quality' || kind === 'driver') {
    put('Driver kind', driverKindOf(driverKind(r)).name); put('Description', r.description); put('Architectural impact', r.impact); put('Priority', driverPriority(r));
    if (driverKind(r) === 'quality') {
      put('Concern', r.category); put('Stimulus', r.stimulus); put('Conditions', r.conditions); put('Response', r.response);
      put('Target', text(r.targetValue) ? [r.metric, r.operator, r.targetValue, r.unit, r.window].filter(Boolean).join(' ') : '');
      put('Measurement', r.measurement); put('Tactic', r.tactic);
    }
  } else if (kind === 'contract') {
    put('Interaction', r.kind); put('Protocol', r.protocol); put('Operation', r.operation);
    put('Contract version', r.contractVersion); put('Timeout', text(r.timeoutMs) ? r.timeoutMs + ' ms' : '');
    put('Retries', r.retryPolicy); put('Duplicate handling', r.duplicatePolicy); put('Failure response', r.failurePolicy);
    put('Authorisation', r.authorization); put('Transport', r.transport);
  } else if (kind === 'data') {
    put('Authority', get(p, r.authorityId) ? `${ref(get(p, r.authorityId))} · ${title(get(p, r.authorityId))}` : r.authorityId);
    put('Classification', r.classification); put('Retention', r.retentionPolicy); put('Protection', r.protection);
  } else if (kind === 'decision') {
    const choice = r.alternatives?.find(x => x.id === r.selectedAlternativeId);
    put('Question', r.question); put('Status', r.status); put('Selected alternative', choice ? title(choice) : '');
    if (!choice) put('Alternatives under consideration', (r.alternatives || []).map(x => title(x)).join(' · '));
    put('Selected strategy', choice?.strategy); put('Selected pattern', choice?.pattern); put('Why this option could fit', choice?.summary);
    put('Benefits as assessed', choice?.benefits); put('Costs and trade-offs', choice?.costs); put('Impact', choice?.consequences);
    put('Anti-pattern to avoid', choice?.antiPattern);
    for (const [driverId, assessment] of Object.entries(choice?.assessments || {}).slice(0, 8))
      put('Driver · ' + driverId, [assessment.effect, assessment.reason, assessment.evidence && 'Evidence: ' + assessment.evidence].filter(Boolean).join(' · '));
  } else {
    for (const [label, key] of [['Boundary', 'boundary'], ['Category', 'category'], ['Criticality', 'criticality'], ['Response', 'response'], ['Failure domain', 'failureDomain'], ['Recovery plan', 'recoveryPlan'], ['Enforcement', 'enforcement'], ['Mechanism', 'mechanism'], ['Protection', 'protection']]) put(label, r[key]);
  }
  return fields.length ? `<dl class="nt-dossier-fields">${fields.map(([k, v]) => row(k, v)).join('')}</dl>` : '<p class="nt-dossier-empty">No further specifications are recorded for this object.</p>';
}

function evidenceHTML(p, r, graph, id, choice) {
  const refs = unique([...incident(graph, id, 'supports'), ...incident(graph, id, 'evidences')].filter(x => x.type === 'evidence'));
  const cited = paragraphs([['Source as recorded', r.source], ['Option evidence as recorded', choice?.evidence], ['Configuration basis as recorded', choice?.specEvidence]]);
  const url = choice?.sourceUrl && safeUrl(choice.sourceUrl);
  return `${refs.length ? `<h5>Linked source records</h5>${linkList(p, refs, '')}` : ''}${cited || (!refs.length ? '<p class="nt-dossier-empty">No supporting source or evidence is linked or written on this object.</p>' : '')}${url && url !== '#' ? `<p><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Option source address ↗</a></p>` : ''}`;
}

function observedHTML(p, id) {
  const {records, counts} = observedEvidenceForObject(p, id);
  const basis = {'reviewed-current': 'Reviewed against current source', 'reviewed-stale': 'Reviewed source changed', unreviewed: 'Review or source needed'};
  const source = location => {
    const url = safeUrl(location);
    return location ? `<small>Source: ${url && url !== '#' ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(location)}</a>` : esc(location)}</small>` : '';
  };
  const comparison = c => c ? `<p><b>${esc(c.label)}</b> · Expected ${esc(c.expected == null ? 'not stated' : String(c.expected))}${c.unit?' '+esc(c.unit):''}; observed ${esc(c.observed == null ? 'not recorded' : String(c.observed))}${c.observedUnit?' '+esc(c.observedUnit):''}.</p><small>${esc(c.reason||'Numerical comparison; delivery approval is recorded separately.')}</small>` : '';
  const observation = x => `<li><b>${esc(x.title)}</b><small>${esc([x.kind, x.release && 'Release ' + x.release, x.environment, x.observedAt, x.cycle && 'Cycle ' + x.cycle].filter(Boolean).join(' · '))}</small><span class="nt-observed-basis ${esc(x.basis)}">${esc(basis[x.basis] || 'Review needed')}</span>${x.status ? `<p>Status in source: ${esc(x.status)}</p>` : ''}${x.statement ? `<p>${esc(x.statement)}</p>` : ''}${comparison(x.comparison)}${source(x.sourceLocation)}</li>`;
  return `<details class="nt-dossier-observed"><summary>Observed evidence <small>${counts.total} explicitly linked · ${counts.reviewedCurrent} current review${counts.stale ? ` · ${counts.stale} source changed` : ''}${counts.unreviewed ? ` · ${counts.unreviewed} review needed` : ''}</small></summary>
    <p class="nt-dossier-foot">Designed properties above describe intent. These observations were linked to this object by a recorded object ID; their source status is shown as recorded. A linked observation does not approve conformance.</p>
    ${records.length ? `<ul class="nt-dossier-observations">${records.slice(0, 8).map(observation).join('')}</ul>${remaining(records, 8, 'linked observations', observation, 'nt-dossier-observations')}` : '<p class="nt-dossier-empty">No delivery observation explicitly linked to this object.</p>'}
    ${counts.requirementOnly ? `<p class="nt-dossier-empty">${counts.requirementOnly} observation${counts.requirementOnly === 1 ? '' : 's'} linked to this requirement without an explicit object mapping; this is not evidence about its implementation.</p>` : ''}
  </details>`;
}

const decisionRow = (p, d) => {
  const r = get(p, d.id) || d.record || {}, choice = r.alternatives?.find(a => a.id === r.selectedAlternativeId);
  return `<li>${go(p, d.id, `${ref(d)} · ${title(d)}`, 3)}<small>${esc(choice ? (r.status === 'accepted' ? 'Accepted' : 'Preferred, review state: ' + (r.status || 'draft')) + ' · ' + title(choice) : 'No alternative selected')}${r.rationale ? ' · ' + esc(r.rationale) : ' · rationale not recorded'}</small></li>`;
};
const decisionList = (p, decisions, empty) => decisions.length
  ? `<ul class="nt-dossier-decisions">${decisions.slice(0, 6).map(d => decisionRow(p, d)).join('')}</ul>${remaining(decisions, 6, 'decisions', d => decisionRow(p, d), 'nt-dossier-decisions')}`
  : `<p class="nt-dossier-empty">${esc(empty)}</p>`;

function sharedServiceHTML(p,item){
 const uses=enterpriseReferences(p).filter(r=>r.identity===item.id),consumer=r=>`<li><b>${go(p,r.targetId,r.targetTitle)}</b><small>${esc(r.state)} · ${r.critical?'Critical':'Supporting'} dependency · ${esc(r.environmentId||'Design scope')}</small><p>Contract version: ${esc(r.expectedVersion||'Not stated')} · release ${esc(r.releaseId)}</p><p>${esc(r.scope)}</p><p>${esc(r.contract)}</p>${r.reasons.length?`<p class="nt-dossier-alert">${esc(r.reasons.join(' '))}</p>`:''}</li>`;
 return `<section class="nt-dossier" data-nt-dossier="${esc(item.id)}" aria-label="Shared enterprise service"><span class="nt-dossier-eyebrow">Shared enterprise service · declared dependencies</span><h4>${esc(item.title)}</h4><p>${esc(item.status)}</p><details><summary>Enterprise identity and authority</summary><dl>${row('Identity',item.id)}${row('Organisation',uses[0]?.organizationTitle||uses[0]?.organizationId)}${row('Service owner',item.owner||'Inspect each contract version')}</dl><p class="nt-dossier-foot">${esc(uses[0]?.authority||'Declared enterprise dependency; no live service health is inferred.')}</p></details><h5>Consumers in this project · ${uses.length}</h5><ul class="nt-dossier-links">${uses.slice(0,8).map(consumer).join('')}</ul>${remaining(uses,8,'declared consumers',consumer)}<button type="button" class="btn" data-wb-action="organization">Organisation guidance</button></section>`;
}

// Public pure renderer, also used by the focused validation suite. The caller owns selection and
// opens the object's own Work editor; this stays read-only and never creates facts from playbook text.
export function modelDossierHTML(p, id, {chapter = null, open = false} = {}) {
  if (!p || !id || /^(?:G:|LINK:|HOLE:|EMPTY:|fold:|lane:|family:|pool:|unplaced:)/.test(String(id))) return '';
  const graph = architectureModel(p), item = graph.objects.get(id);
  if (!item || item.type === 'system' || item.type === 'view' || item.type === 'baseline') return '';
  if(item.type==='sharedService')return sharedServiceHTML(p,item);
  const hit = findRecord(p, id), r = hit?.record || item.record || {}, type = hit?.type || item.type;
  const R = reasoningFor(p), S = specFor(R, id), C = type === 'component' ? componentSpec(R, id) : null;
  // Direct edges are labeled as such. The specification also lists indirect drivers and choices;
  // those lists are described as inherited context, never as a direct assertion about this record.
  const directRequirements = unique(incident(graph, id, 'fulfils').filter(x => x.type === 'requirement'));
  const inheritedRequirements = unique(objects(graph, [
    ...(C?.requirements?.realises || []),
    ...(S?.responsibilities || []).flatMap(x => linkedRequirementIds(p, x)),
    ...(S?.components || []).flatMap(x => linkedRequirementIds(p, x))
  ]).filter(x => x.type === 'requirement' && !directRequirements.some(d => d.id === x.id)));
  const drivers = unique([...incident(graph, id, 'constrains').filter(x => x.type === 'quality'), ...objects(graph, S?.drivers?.map(d => d.id) || []), ...(type === 'realisation' ? objects(graph, realizationSources(p, id).drivers.map(d => d.id)) : [])]);
  const directDecisions = unique(incident(graph, id, 'justifies').filter(x => x.type === 'decision'));
  const inheritedDecisions = unique((S?.decisions || []).filter(d => !directDecisions.some(x => x.id === d.id)).map(d => graph.objects.get(d.id)));
  const choice = type === 'realisation' || type === 'technology' ? r.options?.find(x => x.id === r.selectedOptionId) : null;
  const risks = unique([...incident(graph, id, 'threatens').filter(x => x.type === 'threat'), ...objects(graph, C?.threats?.map(t => t.id) || [])]);
  const controls = unique([...incident(graph, id, 'protects').filter(x => x.type === 'control'), ...objects(graph, C?.controls?.map(t => t.id) || [])]);
  const relations = [...(graph.incoming.get(id) || []), ...(graph.outgoing.get(id) || [])].filter(e => !['supports', 'evidences', 'threatens', 'protects', 'fulfils', 'constrains', 'justifies', 'frames'].includes(e.type));
  const related = unique(relations.map(e => graph.objects.get(e.from === id ? e.to : e.from)).filter(x => x && !['system', 'view', 'baseline', 'option', 'alternative', 'field', 'exchange'].includes(x.type)));
  const relationRow = o => {
    const words = [...new Set(relations.filter(e => e.from === o.id || e.to === o.id).map(e => `${e.from === id ? '→' : '←'} ${e.label}`))];
    return `<li>${go(p, o.id, `${ref(o)} · ${title(o)}`)}<small>${esc(words.slice(0, 3).join(' · '))}</small></li>`;
  };
  const relationList = related.length ? `<ul class="nt-dossier-links">${related.slice(0, 8).map(relationRow).join('')}</ul>${remaining(related, 8, 'connected objects', relationRow)}` : '<p class="nt-dossier-empty">No further connected objects recorded.</p>';
  const why = paragraphs([['Rationale', r.rationale], ['Design / decision context', r.context], ['Unresolved assumptions', r.assumptions], ['Selected alternative reason', type === 'decision' ? r.alternatives?.find(x => x.id === r.selectedAlternativeId)?.reason : '']]);
  const concerns = paragraphs([['Recorded risks', r.risks || r.consequence], ['Assumptions', r.assumptions], ['Failure response', r.failureResponse]]);
  const spec = specification(p, type, r, S, C);
  const home = chapter || item.chapter;
  const specLink = type === 'component' ? `<a href="${esc(href(p, id, 5, 'specification'))}">Full component specification →</a>` : '';
  return `<section class="nt-dossier" data-nt-dossier="${esc(id)}" aria-label="Connected dossier for ${esc(item.title)}">
    <header><div><h4>Connected dossier</h4><p>Saved design · ${esc(item.ref)} · ${esc(item.type)} · ${esc(item.status)}</p></div>${specLink}</header>
    ${type === 'realisation' ? realizationReading(p, r) : ''}
    <details${open && type !== 'realisation' ? ' open' : ''}><summary>Why and design drivers <small>${directRequirements.length + inheritedRequirements.length} requirements · ${drivers.length} drivers · ${directDecisions.length + inheritedDecisions.length} decisions</small></summary>
      ${!text(r.rationale) ? '<p class="nt-dossier-empty">No rationale is written on this object. Inspect linked decisions and evidence before accepting its design.</p>' : ''}${why}
      <h5>Requirements · direct links</h5>${linkList(p, directRequirements, 'No direct requirement link recorded.')}
      ${inheritedRequirements.length ? `<h5>Requirements · through mapped responsibilities or components</h5>${linkList(p, inheritedRequirements, '')}` : ''}
      <h5>Architectural drivers${S?.drivers?.length ? ' · through the recorded design chain' : ' · direct links'}</h5>${linkList(p, drivers, 'No architectural driver linked.')}
      <h5>Decisions · direct links</h5>${decisionList(p, directDecisions, 'No direct decision link recorded.')}
      ${inheritedDecisions.length ? `<h5>Decisions · through carried drivers or responsibilities</h5>${decisionList(p, inheritedDecisions, '')}` : ''}
    </details>
    <details><summary>Properties and operating specification</summary>${spec}${specLink ? `<p class="nt-dossier-end-link">${specLink}</p>` : ''}</details>
    <details><summary>Relationships <small>${related.length} connected objects</small></summary>${relationList}${related.length ? `<p class="nt-dossier-end-link">${go(p, id, 'Explore the whole design →', home, 'whole')}</p>` : ''}</details>
    <details><summary>Evidence and open concerns <small>${risks.length} threats · ${controls.length} controls · ${C?.gaps?.length ?? S?.gaps?.length ?? 0} specification gaps</small></summary>
      ${evidenceHTML(p, r, graph, id, choice)}${concerns}
      ${risks.length ? `<h5>Threats that target it</h5>${linkList(p, risks, '')}` : ''}${controls.length ? `<h5>Controls that protect it</h5>${linkList(p, controls, '')}` : ''}
      ${(C?.gaps || S?.gaps)?.length ? `<h5>Specification gaps</h5><ul class="nt-dossier-gaps">${(C?.gaps || S.gaps).slice(0, 8).map(g => `<li>${esc(g)}</li>`).join('')}</ul>${remaining(C?.gaps || S.gaps, 8, 'specification gaps', g => `<li>${esc(g)}</li>`, 'nt-dossier-gaps')}` : ''}
      <p class="nt-dossier-foot">These are recorded facts and links. Product selection, external approval and measured quality are separate records; review the status above before relying on a product.</p>
    </details>
    ${observedHTML(p, id)}
  </section>`;
}
