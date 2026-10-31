// The component library's builders (round 11, workstream F): the snapshot of a project component, and the Chapter 5
// proposals from a library entry or from one of the catalogue's component archetypes (brain-catalogue.js, recordType
// component-archetype). Loaded by the library surfaces (component-library-ui.js) and the suites, not by the domains:
// the core they need is component-library.js.
//
// componentSnapshot reads one component through componentSpec (design-spec.js) and keeps names and texts, nothing
// else; secrets are redacted on the way out. libraryProposal and archetypeProposal build a proposal in the shape
// Chapter 5's own proposals have (realisation-domain.js realisationProposal): the component's fields, status
// candidate, origin `library` or `archetype`, and beside it the interface contracts and technology needs it would
// bring, as proposals. A proposal is not a record: it becomes a candidate component only through the chapter's reviewed
// path (realisation.candidate with reviewed: true), and the contracts and needs stay proposals on that record for
// Chapter 8 and Chapter 6 to take up through their own editors. The archetype's knowledge authority travels as a
// reading, never as weight. Pure.
import {reasoningFor, componentSpec} from './design-spec.js';
import {redactSecretsDeep} from './secret-redaction.js';
import {CATALOGUE} from './catalogue-index.js';
import {list, str, num} from './util.js';
import {SNAPSHOT_SCHEMA, COMPONENT_LIBRARY_KIND, LIST, NAME, clip, names, readComponentSnapshot, cleanProposed, cleanLibraryRef} from './component-library.js';

const OP = {'At least': 'at least', 'At most': 'at most', Exactly: 'exactly'};
const targetText = d => (num(d.targetValue) == null ? 'no target yet' : `${OP[d.operator] || str(d.operator).toLowerCase()} ${d.targetValue} ${str(d.unit)}`.trim());
const refTitle = r => `${str(r?.ref) || str(r?.id)} ${str(r?.title)}`.trim();
const endText = e => (e?.record ? refTitle(e.record) : '');

// ---------------------------------------------------------------- the snapshot

// One component's specification snapshot, read from the project through componentSpec. Null when the id is not a
// component. Secrets are redacted on the way out (secret-redaction.js), so a snapshot never carries a credential.
export function componentSnapshot(p, id, {at = new Date().toISOString()} = {}) {
  if (!p || !id) return null;
  const C = componentSpec(reasoningFor(p), id);
  if (!C) return null;
  const c = C.component;
  const face = f => ({title: clip(str(f.contract.title), NAME), ref: clip(str(f.contract.ref), 40), kind: f.kind, provider: clip(endText(f.provider), NAME), consumer: clip(endText(f.consumer), NAME), promises: Object.fromEntries(Object.entries(f.promises).map(([k, v]) => [k, clip(v, 300)])), exchanges: list(f.exchanges).slice(0, LIST).map(x => ({role: str(x.role), data: clip(x.data ? refTitle(x.data) : x.dataId, NAME)}))});
  const snapshot = {
    schema: SNAPSHOT_SCHEMA,
    identity: {ref: clip(C.ref, 40), title: clip(C.title, NAME), kind: clip(c.kind, 40), status: clip(C.status, 40), owner: clip(C.owner, 180), revision: c.revision ?? 1},
    purpose: clip(C.purpose), boundary: clip(C.boundary),
    responsibilities: list(C.responsibilities).slice(0, LIST).map(r => clip(`${refTitle(r)}${str(r.purpose) ? ' · ' + str(r.purpose) : ''}`, 400)),
    interfaces: {provides: list(C.provides).slice(0, LIST).map(face), requires: list(C.uses).slice(0, LIST).map(face)},
    data: {owned: names(C.data.owned.map(refTitle)), consumed: names(C.data.consumed.map(refTitle)), produced: names(C.data.produced.map(refTitle)), inputs: clip(c.inputs), outputs: clip(c.outputs)},
    technology: {needs: list(C.needs).slice(0, LIST).map(n => ({category: clip(n.need.category, 40), description: clip(n.need.description, 400), criticality: clip(n.need.criticality, 40), capability: n.capability ? clip(refTitle(n.capability), NAME) : ''})), asWritten: clip(c.technologyNeeds)},
    obligations: [...list(C.drivers).slice(0, LIST).map(d => ({kind: 'quality', title: clip(`${d.id} ${str(d.title)}`, NAME), detail: clip(`${targetText(d)}${str(d.priority) ? ' · ' + str(d.priority) : ''}`, 300)})), ...list(C.controls).slice(0, LIST).map(k => ({kind: 'control', title: clip(refTitle(k), NAME), detail: clip(k.purpose, 400)}))],
    origin: {project: {id: clip(p.id, 80), name: clip(p.name, NAME)}, component: {id: clip(c.id, 100), ref: clip(C.ref, 40), title: clip(C.title, NAME)}, at: clip(at, 40)},
  };
  return redactSecretsDeep(snapshot);
}
// A short reading of a snapshot for a list or a card.
export function snapshotSummary(s) {
  return `${s.interfaces.provides.length} provided and ${s.interfaces.requires.length} required interfaces · ${s.data.owned.length + s.data.consumed.length + s.data.produced.length} data definitions · ${s.technology.needs.length} technology needs · ${s.obligations.length} obligations`;
}

// ---------------------------------------------------------------- archetypes

// The full record (component kit, interface kit, obligations) from the loaded catalogue (catalogue-store.js).
export function archetypeRecord(catalogue, id) {
  const r = list(catalogue?.records).find(r => r.id === id && r.recordType === 'component-archetype');
  return r || null;
}
// The component kind an archetype proposes, from what it is: data archetypes keep state, brokers, routers and locks
// queue work, gateways and meshes adapt, the rest serve.
export function archetypeKind(id) {
  const s = String(id || '');
  if (/DATA|STORAGE|CACHE|FEATURE-STORE|SCHEMA-REGISTRY|SERVICE-CATALOG|SECRETS/.test(s)) return 'store';
  if (/BROKER|EVENT-ROUTER|LOCK/.test(s)) return 'queue';
  if (/GATEWAY|MESH/.test(s)) return 'adapter';
  return 'service';
}
// rc42 (D11): the kind of capability an archetype is, read from its name as archetypeKind reads its component kind. The
// archive files its twenty archetypes under five categories in turn, each with that category's kit, so Relational Data
// carries the security kit (identity assertion, policy decision); a kit part of another category than this one is never
// proposed (archetypeProposal). AIW's reading, not reviewed by a person; it only ever leaves content out.
export function archetypeCategory(id) {
  const s = String(id || '');
  if (/MODEL/.test(s)) return 'ai';
  if (/CI-CD/.test(s)) return 'deployment';
  if (/IDENTITY|SECRETS|POLICY/.test(s)) return 'security';
  if (/OBSERVABILITY/.test(s)) return 'observability';
  if (/DATA|STORAGE|CACHE|VECTOR|FEATURE-STORE|SCHEMA-REGISTRY/.test(s)) return 'data';
  if (/GATEWAY|BROKER|EVENT-ROUTER|WORKFLOW/.test(s)) return 'integration';
  return 'platform';
}

// rc42 (D11, K-06): the catalogue generator's template, read per field. At AKR-0.10.73.5, 318 of the 328 records hold the
// archive generator's sentences with only their name, record type or category put in, and every component and interface
// kit is a category's generic kit named after the record (catalogue-curation.js says so of the records it marks).
// templateFields names the fields of a record that hold nothing else: what they say is not specific to the record, so no
// proposal carries them into a design as if it were. The catalogue stays unedited and hash-checkable; this is a reading
// in AIW's words, not reviewed by a person, and it informs no score, check or conformance result.
export const TEMPLATE_LABEL = 'Generic catalogue template';
const generated = r => new Set([`${r.name} normalized as an AIW ${r.recordType} record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.`, `Address architecture forces for ${r.name} without hiding its operational and governance consequences.`, `Use when ${r.name} is relevant to the selected ${r.category} scope.`, 'Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions.', `Named owner and measurable quality scenario for ${r.name}.`, `The selected scope must contain a ${r.category}-relevant responsibility or capability.`, `Do not adopt ${r.name} only because a technology or repository is popular.`, `${r.name} operating obligation`, `Define ownership, monitoring, failure handling and review criteria introduced by ${r.name}.`]);
// templateItem(r) tests one value or list item of a field; a list is template as a whole only when every item is, and
// ownItems keeps a list's other items, so a list mixing authored and template items proposes only the authored ones. An
// obligation whose title or description is the template's is template.
const templateItem = r => {
  const g = generated(r), key = str(r.id).toLowerCase() + '-', has = x => g.has(x);
  return {summary: has, problem: has, context: has, prerequisites: has, applicabilityRules: has, exclusions: has, obligations: o => has(o?.title) || has(o?.description),
    componentKit: k => str(k?.key).startsWith(key) && k.name === `${r.name} ${k.archetype}`, interfaceKit: k => str(k?.key).startsWith(key) && str(k.name).startsWith(r.name + ' ')};
};
export function templateFields(r) {
  if (!r) return [];
  const t = templateItem(r);
  return Object.keys(t).filter(f => (Array.isArray(r[f]) ? r[f].length > 0 && r[f].every(t[f]) : t[f](r[f])));
}
export function ownItems(r, f) { const t = templateItem(r)[f]; return list(r[f]).filter(x => !t(x)); }

// ---------------------------------------------------------------- proposals

const KINDS = ['service', 'worker', 'adapter', 'queue', 'store', 'module'];
const promisesText = pr => Object.entries(pr || {}).map(([k, v]) => `${k} ${v}`).join('; ');
const base = () => ({status: 'candidate', owner: '', dataIds: [], consumesDataIds: [], producesDataIds: [], decisionIds: [], allocations: [], assumptionsResolved: false, sourceId: '', relationship: '', condition: '', failure: ''});

// A Chapter 5 proposal from a library entry. `library` says which library the entry is in (project or organisation).
export function libraryProposal(entry, library = {scope: 'project'}) {
  if (!entry || entry.kind !== COMPONENT_LIBRARY_KIND) throw Error('Choose a component entry of the library.');
  const s = readComponentSnapshot(entry.content), id = s.identity;
  const ref = cleanLibraryRef({...library, entryId: library.entryId || entry.id, revision: entry.revision, title: entry.title, contentHash: library.contentHash || entry.organization?.contentHash || ''});
  const where = ref.scope === 'organisation' ? `the ${ref.organizationTitle || 'organisation'} library` : 'this project’s library';
  const contracts = [...s.interfaces.provides.map(f => ({...f, role: 'provides', other: f.consumer})), ...s.interfaces.requires.map(f => ({...f, role: 'requires', other: f.provider}))].map(f => ({title: f.title, kind: f.kind, role: f.role, other: f.other, promises: promisesText(f.promises), exchanges: f.exchanges.map(x => `${x.role}: ${x.data}`).join('; ')}));
  const needs = s.technology.needs.map(n => ({category: n.category, description: n.description, criticality: n.criticality}));
  const needText = [s.technology.asWritten, ...needs.map(n => `${n.category}: ${n.description}`)].filter(Boolean).join('\n');
  return {
    key: 'library', origin: 'library', library: ref, ...base(),
    title: id.title, kind: KINDS.includes(id.kind) ? id.kind : 'service',
    purpose: s.purpose, boundary: s.boundary, inputs: s.data.inputs, outputs: s.data.outputs, technologyNeeds: clip(needText, 4000),
    rationale: `Proposed from ${where}: ${entry.title} (revision ${entry.revision ?? 1}), a snapshot of ${id.ref} ${id.title} in ${s.origin.project.name || 'another project'}.`,
    source: `Library entry ${entry.id} revision ${entry.revision ?? 1} · ${where}`,
    assumptions: `The snapshot describes another project. Confirm the boundary, the responsibilities it realises, its interfaces and its technology needs against this project before review.${s.obligations.length ? ' Obligations carried: ' + s.obligations.map(o => o.title).join(', ') + '.' : ''}`,
    proposed: cleanProposed({contracts, needs, obligations: s.obligations}),
    effect: `Adds one candidate component from ${where}. Its ${contracts.length} interface contracts and ${needs.length} technology needs stay proposals for Chapter 8 and Chapter 6. Nothing is approved.`,
  };
}
// A Chapter 5 proposal from a catalogue archetype (the loaded record, with its component kit, interface kit and
// obligations). The archetype's knowledge authority travels as a reading: descriptive, never a score.
// rc42 (D11): a template-marked field or list item (templateFields, ownItems) is not proposed, nor a kit part of another
// category than the archetype's own (archetypeCategory), nor an interface kit unless its whole kit is the archetype's
// own. The fields they would have filled are left empty, as open questions for the person, so no template or wrong-kit
// text reaches the component, its checks or the SDD as if it were the archetype's own.
const OPEN_QUESTIONS = {purpose: 'What does it do in this project?', boundary: 'What does it own, and where does its boundary lie?', inputs: 'What does it receive, and from whom?', outputs: 'What does it send or produce, and to whom?', technologyNeeds: 'Which technology capabilities does it need?', assumptions: 'What must hold for it to fit this project?'};
export function archetypeProposal(record, {releaseId = ''} = {}) {
  if (!record || record.recordType !== 'component-archetype') throw Error('Choose one of the catalogue’s component archetypes.');
  const ref = cleanLibraryRef({scope: 'catalogue', archetypeId: record.id, title: record.name, releaseId: releaseId || CATALOGUE.releaseId, recordSha256: record.recordSha256});
  const template = new Set(templateFields(record)), mine = f => ownItems(record, f), all = list(record.componentKit);
  const kit = mine('componentKit').filter(k => str(k.properties?.category) === archetypeCategory(record.id)), whole = all.length > 0 && kit.length === all.length;
  const required = kit.filter(k => k.required), own = new Set(kit.map(k => str(k.archetype).toLowerCase()));
  // The archetype provides a contract when one of its own parts is the provider; it requires one when a part is the consumer.
  const roleOf = k => (own.has(str(k.providerRole).toLowerCase()) ? 'provides' : own.has(str(k.consumerRole).toLowerCase()) ? 'requires' : 'provides');
  const contracts = (whole ? mine('interfaceKit') : []).map(k => ({title: str(k.name), kind: str(k.interaction) === 'event' ? 'event' : 'request', role: roleOf(k), other: roleOf(k) === 'provides' ? str(k.consumerRole) : str(k.providerRole), promises: [str(k.protocol) && 'protocol ' + str(k.protocol), str(k.contractType) && 'contract ' + str(k.contractType), str(k.interaction) && 'interaction ' + str(k.interaction)].filter(Boolean).join('; '), exchanges: k.required ? 'required by the archetype' : 'optional'}));
  const needs = kit.filter(k => k.canonicalKind === 'LogicalTechnologyCapability' || k.canonicalKind === 'Control').map(k => ({category: str(k.properties?.category) || 'platform', description: `${str(k.name)}: ${str(k.responsibility)}`, criticality: k.required ? 'essential' : 'degraded'}));
  const obligations = mine('obligations').map(o => ({kind: 'archetype', title: str(o.title) || str(o.id), detail: `${str(o.description)}${o.mandatory ? ' (mandatory)' : ''}${str(o.verificationHint) ? ' · verify: ' + str(o.verificationHint) : ''}`}));
  const problem = template.has('problem') ? '' : str(record.problem), authority = record.knowledgeAuthority || {};
  const fields = {purpose: clip(template.has('summary') ? '' : str(record.summary), 2000), boundary: clip(required.map(k => `${str(k.name)}: ${str(k.responsibility)}`).join('\n') || problem, 2000),
    inputs: clip(contracts.filter(k => k.role === 'provides').map(k => `Received through ${k.title} from ${k.other}`).join('; '), 2000), outputs: clip(contracts.filter(k => k.role === 'requires').map(k => `Sent through ${k.title} to ${k.other}`).join('; '), 2000),
    technologyNeeds: clip(needs.map(n => `${n.category}: ${n.description}`).join('\n'), 4000), assumptions: clip(['prerequisites', 'applicabilityRules', 'exclusions'].flatMap(mine).map(str).filter(Boolean).join(' '), 4000)};
  const left = Object.keys(fields).filter(k => !fields[k]);
  const open = Object.fromEntries(left.map(k => [k, {state: 'open-question', question: OPEN_QUESTIONS[k], raisedBy: 'AIW', source: `Catalogue archetype ${record.id}: no text of its own for this, so none was proposed`}]));
  return {
    key: 'archetype', origin: 'archetype', library: ref, ...base(),
    title: str(record.name), kind: archetypeKind(record.id), ...fields, open,
    rationale: `Proposed from the catalogue archetype ${record.id} (${CATALOGUE.releaseId}).${problem ? ' ' + clip(problem, 600) : ''}`,
    source: `Catalogue archetype ${record.id} · ${ref.releaseId}${ref.recordSha256 ? ' · record ' + ref.recordSha256.slice(0, 12) : ''} · descriptive knowledge, not a score`,
    proposed: cleanProposed({contracts, needs, obligations}),
    authority: {descriptive: authority.descriptive !== false, scoringCalibrated: authority.scoringCalibrated === true, candidateKnowledgeInfluence: str(authority.candidateKnowledgeInfluence) || 'blocked', conformanceReady: authority.conformanceReady === true},
    effect: `Adds one candidate component named after the archetype ${record.name}.${left.length ? ` The catalogue holds only generic template text, or a kit of another kind, for its ${left.map(k => k.replace(/([A-Z])/g, ' $1').toLowerCase()).join(', ')}: they are left as open questions for you, and none of that text is proposed.` : ''} Its ${contracts.length} interface contracts and ${needs.length} technology needs stay proposals for Chapter 8 and Chapter 6. The archetype is descriptive knowledge: nothing is scored, constrained or approved by proposing it.`,
  };
}
