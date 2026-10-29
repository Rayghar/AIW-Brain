// The component specification as a document (round 11): one component with everything the design records about it,
// read through componentSpec (design-spec.js) from the links the records already hold. Identity, purpose and boundary;
// responsibilities (Chapter 4); interactions (5); provided and required interfaces with their contracts and promises
// (8); data owned, consumed and produced (8); quality targets inherited through its responsibilities (2); technology
// needs and the capabilities that support them (6); product choices (7); controls that protect it and threats that
// target it (9); runtime plans and placements (10); decisions it rests on (3); open gaps. A document of its own
// (Chapter 5 Output: Markdown, HTML, JSON) and a section of the SDD, one part per component. Pure: nothing here changes
// the project, and nothing is approved by being written down. It prints no word the SDD reads as a gap: what the
// specification lacks is listed once, in its own words, under Open gaps.
// Round 12 (workstream F): the data it owns are the definitions that name it as their authority (GR-CMP-07, read by
// componentSpec); its requirements are listed by group with their external id and delivery status, those of the
// responsibilities it realises apart from those it only supports, at most REQUIREMENTS_SHOWN named and the rest counted
// with a pointer to the traceability matrix (GR-CMP-08); a quality target is worded as the ARS words it (GR-DRV-05).
// Every specification together is an annex of the SDD (componentSpecsAnnex).
import {reasoningFor, componentSpec} from './design-spec.js';
import {productLabel} from './design-reasoning.js';
import {targetWords} from './ars-document.js';
import {groupIndex, requirementGroups} from './requirement-groups.js';
import {list, str, num} from './util.js';
import {driverScope} from './driver-scope.js';
import {OBLIGATION_STATES} from './architecture-obligations.js';
// rc40 W3: the Chapter 5 Specification sheet and this export read one sheet model (component-sheet.js): the JSON
// carries it whole (sections, fields, completeness, omissions), the Markdown prints its completeness and omissions.
import {componentSheet} from './component-sheet.js';

export const COMPONENT_SPECS_TITLE = 'Component specifications';
const or = (v, words) => (str(v) ? str(v) : words);
const refOf = r => str(r?.ref) || str(r?.id);
const endText = e => (e ? `${refOf(e.record)} ${str(e.record?.title)}`.trim() : 'unknown');
const PROMISE_WORDS = {protocol: 'protocol', operation: 'operation', contractVersion: 'version', timeoutMs: 'timeout', timeoutPolicy: 'on timeout', retryPolicy: 'retries', failurePolicy: 'on failure', duplicatePolicy: 'duplicates', idempotencyKey: 'idempotency key', correlationKey: 'correlation key', authorization: 'authorisation', transport: 'transport', compatibility: 'compatibility'};
const promisesText = pr => Object.entries(pr).map(([k, v]) => `${PROMISE_WORDS[k] || k} ${k === 'timeoutMs' ? v + ' ms' : v}`).join('; ');
const tier = f => {
  if (!f.placements.length) return 'not placed yet';
  return [`${f.active} active${f.standby ? ', ' + f.standby + ' standby' : ''}`, `${f.zonesAll.length} zone${f.zonesAll.length === 1 ? '' : 's'}`, f.stateMode === 'Unspecified' ? 'state not said' : f.stateMode.toLowerCase(), f.recoveryMinutes == null ? 'no recovery time yet' : `recovers in ${f.recoveryMinutes} min`].join(' · ');
};

// The specification read for one component, with the project it was read from. Null when the id is not a component.
export function componentSpecDocument(p, id) {
  if (!p || !id) return null;
  const R = reasoningFor(p), C = componentSpec(R, id);
  if (!C) return null;
  const sheet = componentSheet(p, id);
  return {ref: C.ref, title: C.title, spec: C, sheet, markdown: componentSpecMarkdown(C, {level: 1, project: str(p.name), p, sheet}), json: {...componentSpecJSON(p, C), sheet: sheetJSON(sheet)}};
}
// The sheet as the JSON export carries it: the template's sections with their typed fields (state, chapter, section
// and the unscoped path of each linked value), the completeness count and the omissions. Plain data, nothing twice.
export function sheetJSON(sheet) {
  if (!sheet) return null;
  return {completeness: sheet.completeness, omissions: sheet.omissions, header: sheet.header, sections: sheet.sections.map(s => ({id: s.id, no: s.no, title: s.title, chapters: s.chapters, fields: s.fields.map(f => ({id: f.id, label: f.label, state: f.state, counted: f.counted, where: f.where, value: f.value ?? null, values: f.values ?? null, rows: f.rows ?? null, empty: f.state === 'recorded' ? null : f.empty ?? null}))}))};
}
// The Completeness section of the Markdown: recorded fields of the template, then the omissions with where to record each.
function completenessMarkdown(sheet) {
  if (!sheet) return '';
  const k = sheet.completeness;
  return `${k.recorded} of ${k.total} fields of the specification template are recorded (${k.percent} %); ${k.inferred} inferred from the links, ${k.open} open.\n\n` + (sheet.omissions.length ? sheet.omissions.map(o => `- ${o.label} — Chapter ${o.chapter} · ${o.where}: ${o.text}`).join('\n') : 'Every field of the template is recorded.') + '\n\n';
}

// The data the JSON export carries: ids and references, never the whole records twice.
export function componentSpecJSON(p, C) {
  const brief = r => ({id: r.id, ref: refOf(r), title: str(r.title)});
  const face = f => ({id: f.contract.id, ref: refOf(f.contract), title: str(f.contract.title), kind: f.kind, provider: endText(f.provider), consumer: endText(f.consumer), promises: f.promises, exchanges: f.exchanges.map(x => ({role: x.role, data: x.data ? refOf(x.data) : x.dataId}))});
  return {exportedAt: new Date().toISOString(), document: 'component-specification', project: str(p?.name), id: C.id, ref: C.ref, title: C.title, kind: str(C.component.kind), status: C.status, owner: C.owner, purpose: C.purpose, boundary: C.boundary, revision: C.component.revision ?? null,
    responsibilities: C.responsibilities.map(brief), interactions: C.interactions.map(x => ({id: x.interaction.id, direction: x.direction, other: endText(x.other), label: str(x.interaction.label), interaction: str(x.interaction.interaction), failure: str(x.interaction.failure)})),
    provides: C.provides.map(face), uses: C.uses.map(face), data: {owned: C.data.owned.map(brief), consumed: C.data.consumed.map(brief), produced: C.data.produced.map(brief), inputs: str(C.component.inputs), outputs: str(C.component.outputs), invariants: list(C.invariants).map(brief)},
    qualityTargets: C.drivers.filter(d=>!d.kind||d.kind==='quality').map(d => ({id: d.id, code: d.code || d.id, title: str(d.title), category: d.category, priority: str(d.priority), target: num(d.targetValue) == null ? null : targetWords(d).figure, words: targetWords(d).text || null})),
    architectureDrivers: C.drivers.map(d=>({id:d.id,code:d.code||d.id,kind:d.kind||'quality',title:str(d.title),priority:str(d.priority),description:str(d.description),impact:str(d.impact),scope:driverScope(p,d)})),
    architectureSolutions: list(C.architectureSolutions).map(s=>({id:s.id,taskId:s.taskId,decisionId:s.decisionId,state:s.state,driverIds:s.driverIds,mechanism:s.mechanism,placement:s.placement.filter(x=>x.componentId===C.id),specifications:s.specifications.filter(x=>x.componentId===C.id),receipt:s.receipt,verification:s.verification})),
    architectureObligations: list(C.architectureObligations),
    requirements: {realises: list(C.requirements?.realises), supports: list(C.requirements?.supports)},
    needs: C.needs.map(n => ({id: n.need.id, ref: refOf(n.need), category: str(n.need.category), criticality: str(n.need.criticality), capability: n.capability ? brief(n.capability) : null})),
    capabilities: C.capabilities.map(brief), products: C.products.map(x => ({capability: refOf(x.capabilities?.[0]) || null, realisation: brief(x.realisation), product: x.product?.product ? productLabel(x.product) : null, chosen: !!x.product?.selected, configuration: x.configuration || null})),
    controls: C.controls.map(brief), threats: C.threats.map(brief), plans: C.plans.map(f => ({id: f.plan.id, ref: refOf(f.plan), title: str(f.plan.title), placement: tier(f)})), decisions: C.decisions.map(d => ({id: d.id, question: str(d.question), chosen: d.selectedAlternativeId || null})),
    gaps: C.gaps, guidance: 'Read by rule from the links the design records; no independent evidence verification, and nothing approved.'};
}

// The Markdown: a document of its own (level 1) or one part of the SDD section (level 3, under "## Component specifications").
// The requirements a component answers, by requirement group, each with its external id and delivery status.
export const REQUIREMENTS_SHOWN = 12;
// Chapter 7 records a proposed product configuration; Chapter 10 remains the source of deployed placements. Printing
// the assumption and its evidence separately keeps an author-entered number from reading as measured performance.
function configurationMarkdown(x){const s=x.configuration;if(!s)return '';const filled=['serviceTier','topology','replicaCount','failureDomains','workloadProfile','specEvidence'].some(f=>s[f]!==''&&s[f]!=null)||Object.keys(s.configurationFacts||{}).length>0;if(!filled&&!x.product?.selected)return '';const v=f=>s[f]===''||s[f]==null?'to establish':s[f];return `\n  Proposed configuration (${s.sourceStatus}): service tier ${v('serviceTier')}; topology ${v('topology')}; planned instances ${v('replicaCount')}; failure domains ${v('failureDomains')}.\n  Workload assumptions: ${v('workloadProfile')}. Configuration basis: ${v('specEvidence')}. Evidence cited is not independent verification; actual placement is recorded in Chapter 10.${Object.keys(s.configurationFacts||{}).length?'\n  Declared configuration facts: '+Object.entries(s.configurationFacts).map(([k,v])=>k+' = '+String(v&&typeof v==='object'?v.value:v)).join('; ')+'.':''}`;}
function requirementsMarkdown(p, C) {
  const R = C.requirements || {realises: [], supports: []};
  if (!p || (!R.realises.length && !R.supports.length)) return 'None: the responsibilities it realises name no requirement yet.';
  const byId = new Map(list(p.artefacts).map(a => [a.id, a])), G = groupIndex(p), groups = new Map(requirementGroups(p).map(g => [g.id, g]));
  const line = id => { const a = byId.get(id), d = str(a?.assessment?.delivery); return `${id}${a?.externalId ? ' (' + a.externalId + ')' : ''} ${str(a?.title)} · ${d ? d.toLowerCase() : 'delivery not assessed'}`; };
  const part = (ids, word) => {
    if (!ids.length) return '';
    const by = new Map(); for (const id of ids) { const g = (G.of.get(id) || [])[0] || ''; if (!by.has(g)) by.set(g, []); by.get(g).push(id); }
    let shown = 0, out = word + ': ' + ids.length + (ids.length === 1 ? ' requirement' : ' requirements') + '.\n\n';
    for (const [g, xs] of [...by].sort((a, b) => b[1].length - a[1].length)) {
      if (shown >= REQUIREMENTS_SHOWN) break;
      const G1 = groups.get(g), take = xs.slice(0, REQUIREMENTS_SHOWN - shown); shown += take.length;
      out += (G1 ? `${G1.id} · ${str(G1.title)} (${xs.length})` : 'In no requirement group (' + xs.length + ')') + ':\n\n' + take.map(id => '- ' + line(id)).join('\n') + '\n\n';
    }
    return out + (ids.length > shown ? `And ${ids.length - shown} more, each in the traceability matrix (the SDD's Appendix D).\n\n` : '');
  };
  return (part(R.realises, 'It realises') + part(R.supports, 'It supports, without realising')).trim();
}
export function componentSpecMarkdown(C, {level = 1, project = '', p = null, sheet = null} = {}) {
  const H = n => '#'.repeat(Math.max(1, Math.min(6, level + n - 1))) + ' ';
  const c = C.component;
  let md = H(1) + (level === 1 ? 'Component specification · ' : '') + `${C.ref} · ${C.title}\n\n`;
  if (level === 1) md += (project ? project + ' · ' : '') + 'Working draft, read from the links the design records. Nothing here is approved by being written down.\n\n';
  md += H(2) + 'Identity\n\n' + `Reference: ${C.ref} · Kind: ${or(c.kind, 'no kind')} · Status: ${or(C.status, 'draft')} · Owner: ${or(C.owner, 'no owner named')} · Revision: ${c.revision ?? 1} · Source: ${or(c.source, 'no source named')}\n\nPurpose: ${or(C.purpose, 'none written')}\n\nBoundary: ${or(C.boundary, 'none written')}\n\n`;
  md += H(2) + 'Responsibilities (Chapter 4)\n\n' + (C.responsibilities.length ? C.responsibilities.map(r => `- ${refOf(r)} ${str(r.title)}${str(r.purpose) ? ' · ' + str(r.purpose) : ''}`).join('\n') : 'None allocated yet.') + '\n\n';
  md += H(2) + 'Requirements (Chapter 1)\n\n' + requirementsMarkdown(p, C) + '\n\n';
  md += H(2) + 'Interactions (Chapter 5)\n\n' + (C.interactions.length ? C.interactions.map(x => `- ${x.interaction.id} · ${x.direction === 'out' ? 'to' : 'from'} ${endText(x.other)} · ${or(x.interaction.label, 'no label')} · ${or(x.interaction.interaction, 'kind not said')}${str(x.interaction.failure) ? ' · on failure: ' + str(x.interaction.failure) : ''}`).join('\n') : 'None recorded yet.') + '\n\n';
  const faces = (xs, who) => (xs.length ? xs.map(f => `- ${refOf(f.contract)} ${str(f.contract.title)} · ${f.kind} · ${who === 'provides' ? 'for ' + endText(f.consumer) : 'from ' + endText(f.provider)}${Object.keys(f.promises).length ? ' · ' + promisesText(f.promises) : ''}${f.exchanges.length ? ' · exchanges ' + f.exchanges.map(x => `${x.role}: ${x.data ? refOf(x.data) + ' ' + str(x.data.title) : x.dataId}`).join(', ') : ''}`).join('\n') : 'None yet.');
  md += H(2) + 'Interfaces (Chapter 8)\n\nProvides:\n\n' + faces(C.provides, 'provides') + '\n\nRequires:\n\n' + faces(C.uses, 'uses') + '\n\n';
  const dataList = xs => (xs.length ? xs.map(d => `${refOf(d)} ${str(d.title)}`).join(', ') : 'none');
  md += H(2) + 'Data (Chapter 8)\n\n' + `Owned: ${dataList(C.data.owned)} · Consumed: ${dataList(C.data.consumed)} · Produced: ${dataList(C.data.produced)}\n\n` + (str(c.inputs) || str(c.outputs) ? `Inputs, as written: ${or(c.inputs, 'none')}\n\nOutputs, as written: ${or(c.outputs, 'none')}\n\n` : '')
    // Round 12 (GR-SDD-28): the invariants that bind the data it is the authority of or govern the contracts it calls or provides.
    + (list(C.invariants).length ? 'Invariants: ' + C.invariants.map(r => `${refOf(r)} ${str(r.title)}${str(r.condition) && !r.open?.condition ? ' (' + str(r.condition).replace(/[.]$/, '') + ')' : ''}`).join('; ') + '\n\n' : '');
  md += H(2) + 'Architecture drivers and quality targets (Chapter 2)\n\n' + (C.drivers.length ? C.drivers.map(d => `- ${d.code || d.id} ${str(d.title)} · ${d.kind||'quality'} · ${or(d.priority, 'no priority')} · ${!d.kind||d.kind==='quality'?targetWords(d).text||'no target yet':str(d.description)||str(d.impact)||'Describe the required outcome.'}`).join('\n') : 'No driver reaches this component through a direct or inherited link yet.') + '\n\n';
  if(list(C.architectureSolutions).length)md+=H(2)+'Architecture mechanisms and placement\n\n'+C.architectureSolutions.map(s=>`- ${s.taskId} · ${s.decisionId} · ${s.mechanism.pattern}${s.mechanism.tactic?' · '+s.mechanism.tactic:''}. Design: ${s.state}; verification is recorded with the obligations below.\n  ${s.placement.filter(x=>x.componentId===C.id).map(x=>x.role+' — '+x.responsibility).join('; ')}\n  Drivers: ${s.driverIds.join(', ')}. Method: ${s.receipt?.methodId||s.receipt?.packId||'retained with the task'}; source fingerprint: ${s.receipt?.fingerprint||'retained with the task'}.`).join('\n')+'\n\n';
  if(list(C.architectureObligations).length)md+=H(2)+'Implementation and verification obligations\n\n'+C.architectureObligations.map(o=>`- ${o.id} · ${o.kind}: ${o.action}\n  Evidence required: ${o.evidence||'Define the verification evidence.'}\n  Current evidence state: ${OBLIGATION_STATES[o.verificationState]||'Open obligation'}. Linked actions: ${list(o.verificationActions).map(a=>a.id).join(', ')||'None'}.${list(o.evidenceRefs).map(e=>`\n  Reviewed evidence: ${e.actionId} · ${e.reference} · ${e.reviewer} · ${e.at}`).join('')}${o.verificationReasons?.length?'\n  Review required: '+o.verificationReasons.join(' '):''}`).join('\n')+'\n\n';
  md += H(2) + 'Technology needs and capabilities (Chapter 6)\n\n' + (C.needs.length ? C.needs.map(n => `- ${refOf(n.need)} ${or(n.need.category, 'need')}${str(n.need.criticality) ? ' (' + str(n.need.criticality) + ')' : ''}${str(n.need.description) ? ' · ' + str(n.need.description) : ''} · ${n.capability ? 'supported by ' + refOf(n.capability) + ' ' + str(n.capability.title) : 'no capability supports it yet'}`).join('\n') : (str(c.technologyNeeds) ? `As written: ${str(c.technologyNeeds)}` : 'None recorded yet.')) + '\n\n';
  md += H(2) + 'Products (Chapter 7)\n\n' + (C.products.length ? C.products.map(x => `- ${refOf(x.capabilities?.[0]) ? refOf(x.capabilities[0]) + ' → ' : ''}${refOf(x.realisation)} ${str(x.realisation.title)} · ${x.product?.product ? productLabel(x.product) + (x.product.selected ? ' (draft preference)' : ' (candidate)') : 'no product named yet'}${configurationMarkdown(x)}`).join('\n') : 'None yet.') + '\n\n';
  md += H(2) + 'Protection (Chapter 9)\n\n' + `Controls: ${C.controls.length ? C.controls.map(k => `${refOf(k)} ${str(k.title)}`).join(', ') : 'none'} · Threats: ${C.threats.length ? C.threats.map(t => `${refOf(t)} ${str(t.title)}`).join(', ') : 'none'}\n\n`;
  md += H(2) + 'Runtime (Chapter 10)\n\n' + (C.plans.length ? C.plans.map(f => `- ${refOf(f.plan)} ${str(f.plan.title)} · ${tier(f)}`).join('\n') : 'No runtime plan yet.') + '\n\n';
  md += H(2) + 'Decisions (Chapter 3)\n\n' + (C.decisions.length ? C.decisions.map(d => `- ${d.id} ${str(d.question)} · ${d.selectedAlternativeId ? 'chosen ' + d.selectedAlternativeId : 'open'}`).join('\n') : 'None linked yet.') + '\n\n';
  if (sheet) md += H(2) + 'Completeness\n\n' + completenessMarkdown(sheet);
  md += H(2) + 'Open gaps\n\n' + (C.gaps.length ? C.gaps.map(g => '- ' + g).join('\n') : 'Nothing the specification lacks under the current rules.') + '\n\n';
  return md;
}

// Every component's specification as one document, an annex of the SDD (Appendix D): one part each, in register order.
export function componentSpecsAnnex(p) {
  return '# ' + COMPONENT_SPECS_TITLE + (str(p?.name) ? ' · ' + str(p.name) : '') + '\n\nWorking draft, read from the links the design records; an annex of the SDD. Nothing here is approved by being written down.\n\n' + componentSpecsSection(p).replace(/^## [^\n]*\n\n/, '').replace(/^### /gm, '## ').replace(/^#### /gm, '### ').replace(/^##### /gm, '#### ');
}
// The registers' section: every component, one part each, in register order.
export function componentSpecsSection(p) {
  const R = reasoningFor(p), comps = list(p?.realisation?.components);
  let md = '## ' + COMPONENT_SPECS_TITLE + '\n\n';
  if (!comps.length) return md + 'No application component is recorded yet (Chapter 5).\n\n';
  md += `${comps.length} component${comps.length === 1 ? '' : 's'}, each read from the links the design records: responsibilities, interfaces, data, quality targets, technology, products, protection, runtime and decisions. What a specification lacks is listed under its open gaps.\n\n`;
  for (const c of comps) { const C = componentSpec(R, c.id); if (C) md += componentSpecMarkdown(C, {level: 3, p}); }
  return md;
}
