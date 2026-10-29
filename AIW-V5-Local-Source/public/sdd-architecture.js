// The SDD's architecture edition (round 12, decision D-01; audit/round12/SDD-SPEC.md): a design document in the order
// and reading style of the reference SDD, built entirely from AIW's records. Front matter (cover, document control,
// contents), then 1. Introduction, 2. Architectural drivers, 3. Architecture decisions, 4. Components, interfaces,
// properties and composition, 5. Architecture models, 6. Model refinements and 7. Appendix (A requirements analysis and
// component mapping, B open items, C domain lens, D annexes, E provenance). The audiences are views of it: delivery
// keeps sections 1, 4 and 5, the delivery obligations and Appendices A and D; review keeps sections 2, 3 and 6, the
// shape in brief, the assurance and Appendices B, C and E.
// Principles (SDD-SPEC): the body explains the design and the registers are annexes (Appendix D lists the exports);
// every statement names the records it rests on, by their codes; an empty field is listed in Appendix B; the cover and
// each section say how far the content has come (drafted by Sol and not reviewed, written by a person, confirmed), and
// approval is printed only from approval records; a section groups before it lists and no list prints more than
// LIST_MAX items inline, the rest counted with a pointer; codes come from the records.
// Format 2 (round 24, D-24-06; sdd-content.js), what every export writes: a record prints only what is stated, and an
// empty optional field prints nothing. What sections 1 to 4 and 6 (and the delivery obligations) leave open is said
// once, in the section's "Open questions" list (one line per question, naming the records and fields it is asked of; one
// line per set of fields the same records leave unstated), and each record carries a marker the renderers skip that
// names the statements it leaves open, so the content reading is the same as format 1's. Format 1 (an "open: …" marker
// in place, the first time, and "open" after) is what editions printed before round 24 and what baselines frozen then
// keep; it is printed here only for the suites that prove both formats read the same (format: 1), never by an export.
// By module (round 24, D-24-03): format 2 prints the key functionalities of a project with modules by module, and its
// section 4 module by module (componentsByModule), each module with its own open questions; the content reader reads the
// same records from either layout.
// The decision reading (round 25, D-25-05 to D-25-07 and D-25-09; decision-reading.js): section 3 prints AIW's reading of
// each decision, computed when the edition is read and never saved: in the decision line and the decision log the lean
// as the drivers' lean (never a proposal, a choice or an approval), beside an alternative not chosen without a reason
// AIW's reading of it (the question stays open), and in the trade-off analysis the arithmetic itself.
// Pure and DOM-free: the server, the export thread and the suites build it. Nothing here writes the document, confirms a
// record, chooses an alternative or approves anything.
import {reviewRequirements, CHAPTERS, latestDesignReview, latestGovernance, independentApproval, sddTitle, recordRef, raisedFindings} from './review-domain.js';
import {driversByKind, driverCodes, driverPriority, isQualityDriver, QUALITY_TYPES, DRIVER_KINDS, driverKind} from './quality-domain.js';
import {DECISION_CATEGORIES, decisionCategory, chosen, statusLabel, governanceLabel, recommendation, solAssessed, rulesAssessed} from './decisions-domain.js';
import {readDecision, readingLines, signed, DEFAULT_WEIGHTS, READING_NOTE} from './decision-reading.js';
import {reasoningFor, componentSpec, qualityDriverInteractions} from './design-spec.js';
import {PERSONA_FIELDS, USER_CATEGORIES, PROCESS_KINDS, processKind} from './requirements-domain.js';
import {requirementGroups, groupIndex, kindName, GROUP_RULE_FIELDS} from './requirement-groups.js';
import {moduleTree, concernTitle, hasModules} from './module-model.js';
import {recordModules, recordAttachments} from './module-scope.js';
import {linkedRequirementIds, deliveryOf} from './requirement-links.js';
import {fieldOpen, questionOf} from './open-fields.js';
import {partyIntegrations, PARTY_INTEGRATION, invariants as invariantRecords, batchChain, transitionText} from './interfaces-domain.js';
import {assessContractExecution, contractExecutionContext, executionMethodSource, executionJourney} from './architecture-applicability.js';
import {scenarioProjection} from './guidance-record.js';
import {enterpriseReferences} from './enterprise-references.js';
import {architectureObligationsFor, OBLIGATION_STATES} from './architecture-obligations.js';
import {verificationContext,verificationForAction,VERIFICATION_OPERATORS} from './architecture-verification.js';
import {designBasisCurrent} from './design-task-state.js';
import {planOperation, seededRecords} from './runtime-domain.js';
import {DUAL_CONTROL} from './security-domain.js';
import {realizationTargets, realizationOption, selectionLabel, COVERAGE} from './technology-realisation-domain.js';
import {technologyCatalogue} from './technology-catalogue.js';
import {TECHNOLOGY_CATEGORIES} from './technology-domain.js';
import {lensReport} from './domain-lens.js';
import {plateausOf, roadmapOf, PLATEAU_WORDS, plateauGroups, groupPlacements, migrationsOf, migrationNeeds, MIGRATION_FIELDS} from './roadmap-domain.js';
import {mappingRole, LAYER_KINDS} from './logical-domain.js';
import {retiredRecords, isProposed, solDraftOf} from './record-lifecycle.js';
import {stepOfNode} from './model-scope.js';
import {acceptedNarratives} from './brain-authoring.js';
import {noteCurrent} from './aiw-brain.js';
// rc39 (PLAN §4.4): the design questions a component faces, from the one projection, for its passage.
import {designQuestions} from './design-questions.js';
import {sourceCurrent} from './evidence-domain.js';
import {sourceAssurance} from './assurance-domain.js';
import {targetWords} from './ars-document.js';
import {baselineDiff} from './architecture-analysis.js';
import {sddOpenCounts} from './readiness-model.js';
import {changeEvents} from './changes-domain.js';
import {changeSummaryMarkdown} from './change-summary.js';
import {C4_SCENES, containersInBody, BODY_CONTAINERS, modulesInBody, BODY_MODULES, moduleHomes} from './sdd-c4.js';
import {passValue, memoPass} from './document-memo.js';
import {unescapeMd, slugger} from './sdd-renderer.js';
import {FIGURE_BUDGET as FIGURE_BUDGET_WORDS} from './figure-budget.js';
import {componentKindName} from './realisation-domain.js';
import {contentReading, skeletonBanner, SDD_FORMAT, formatMarker, openMarkerLine, plain, markerQuestion, isOpenMarker} from './sdd-content.js';
import {list, str, refList as sharedRefList} from './util.js';
// Who wrote each record and whether a person confirmed it: workstream D3's provenance reader, the one every page reads.
import {sddAuthor, confirmedByPerson, provenanceBlocksMarkdown} from './provenance.js';

// ---------------------------------------------------------------- Markdown text
// No list prints more than LIST_MAX items inline (SDD-SPEC principle 4); the rest are counted with a pointer.
export const LIST_MAX = 12;
const count = n => Number(n).toLocaleString('en-GB');
export const plural = (n, one, many = one + 's') => count(n) + ' ' + (n === 1 ? one : many);
const isAre = n => (n === 1 ? 'is' : 'are');
const more = n => count(n) + ' more';
// A record's words in Markdown, on one line (GR-SDD-23): pasted markup is escaped ("<" prints as text, as the HTML
// edition prints it), and so are the characters that would start emphasis, code or a link.
export const md = v => String(v ?? '').replace(/\s+/g, ' ').trim().replace(/\\/g, '\\\\').replace(/[<>*`[\]]/g, c => '\\' + c);
// A record's words as paragraphs: each line escaped as `md` does. A heading line of the record's own ("## Background" in
// a brief) is demoted to a bold line, so it adds no section and prints no "#" (GR-SDD-07); a line that would open a list,
// a quote, a table or a fence starts with its first character escaped.
export function mdText(v) {
  return String(v ?? '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(block => block.split('\n').map(line => {
    const raw = String(line).replace(/[ \t]+/g, ' ').trim(), heading = /^#{1,6}\s+(.*?)\s*#*$/.exec(raw);
    const t = (heading ? heading[1] : raw).replace(/\\/g, '\\\\').replace(/[<>*`[\]]/g, c => '\\' + c);
    if (heading) return t ? '**' + t + '**' : '';
    return /^(?:#|>|[-+]\s|\d+[.)]\s|\||={3,}|-{3,}|~{3,})/.test(t) ? '\\' + t : t;
  }).filter(Boolean).join('\n')).filter(Boolean).join('\n\n');
}
// A table cell: one line, the pipe escaped.
export const mdCell = v => md(v).replace(/\|/g, '\\|');
// The escapes read back and the anchors of the headings are the renderer's (sdd-renderer.js), one definition for every format.
export {unescapeMd, slugger};
const clip = (v, max) => { const t = String(v ?? '').replace(/\s+/g, ' ').trim(); return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t; };
const sentence = t => { const s = String(t || '').trim(); return !s ? '' : /[.!?…:]$/.test(s) ? s : s + '.'; };
const upFirst = t => (t ? t[0].toUpperCase() + t.slice(1) : t);
const lowFirst = t => String(t || '').replace(/^([A-Z])(?=[a-z])/, c => c.toLowerCase()).replace(/^(A|An|The|Each|Every|Any|All|No|One)(?= )/, w => w.toLowerCase());
// A record's code: its display reference, never its internal id (GR-SDD-20).
export const refOf = r => str(r?.ref) || str(r?.code) || str(r?.id);
// References as a short list: a run of one prefix becomes a range (REQ-001–REQ-009), across a change of digit width too
// (REQ-999–REQ-1000, GR-SDD-18); past LIST_MAX parts the rest are counted. One definition (util.js), shared with the
// chapter registers.
export const refList = (refs, max = LIST_MAX) => sharedRefList(refs, max);
// A bulleted list of at most LIST_MAX lines; the rest counted on a line of its own, with where they are listed.
export function bullets(lines, {max = LIST_MAX, rest = n => 'And ' + more(n) + '.'} = {}) {
  const xs = lines.filter(Boolean);
  if (!xs.length) return '';
  return xs.slice(0, max).map(l => '- ' + l).join('\n') + (xs.length > max ? '\n\n' + rest(xs.length - max) : '') + '\n\n';
}
// A short inline list of named items: the first `max`, then "and N more".
const named = (xs, max = LIST_MAX) => (xs.length > max ? xs.slice(0, max).join('; ') + '; and ' + more(xs.length - max) : xs.join('; '));
// The same with "and" before the last, for a few names inside a sentence that uses semicolons itself.
const andList = (xs, max = LIST_MAX) => (xs.length > max ? xs.slice(0, max).join(', ') + ' and ' + more(xs.length - max) : xs.length > 1 ? xs.slice(0, -1).join(', ') + ' and ' + xs.at(-1) : xs.join(''));
// An empty section or part: one line that says so and where the records are made (SDD-SPEC acceptance).
const none = (what, where = '') => 'None recorded: ' + what + (where ? ' (' + where + ')' : '') + '.\n\n';
const table = (head, rows) => (rows.length ? '| ' + head.join(' | ') + ' |\n| ' + head.map(() => '---').join(' | ') + ' |\n' + rows.map(r => '| ' + r.join(' | ') + ' |').join('\n') + '\n\n' : '');

// ---------------------------------------------------------------- the records, by chapter
// Every record of the design the SDD reads, with its chapter and kind (proposals included; retired records are kept in
// p.retired and read by no chapter). Round 12: the invariants and responsibility groups (D4), and the Chapter 11 records
// of the plan (plateaus, migration records, delivery actions) and the SDD narrative, which the drafter drafts too (E).
const COLLECTIONS = [
  [1, 'requirement group', p => requirementGroups(p).filter(g => !g.legacy)], [1, 'Chapter 1 record', p => list(p.artefacts)],
  [2, 'driver', p => list(p.quality?.drivers)], [3, 'decision', p => list(p.decisions?.records)],
  [4, 'responsibility', p => list(p.logical?.responsibilities)], [4, 'responsibility group', p => list(p.logical?.groups)], [5, 'component', p => list(p.realisation?.components)],
  [6, 'capability', p => list(p.technology?.capabilities)], [6, 'technology need', p => list(p.technology?.needs)], [7, 'realisation', p => list(p.technologyRealisation?.records)],
  [8, 'contract', p => list(p.interfaces?.contracts)], [8, 'data definition', p => list(p.interfaces?.data)], [8, 'external party', p => list(p.interfaces?.parties)], [8, 'invariant', p => list(p.interfaces?.invariants)],
  [9, 'threat', p => list(p.security?.threats)], [9, 'control', p => list(p.security?.controls)],
  [10, 'environment', p => list(p.runtime?.environments)], [10, 'zone', p => list(p.runtime?.zones)], [10, 'runtime plan', p => list(p.runtime?.plans)], [10, 'runtime path', p => list(p.runtime?.paths)],
  [11, 'plateau', p => list(p.roadmap?.plateaus)], [11, 'migration record', p => list(p.roadmap?.migrations)], [11, 'delivery action', p => list(p.finalReview?.actions)], [11, 'document', p => { const n = p.finalReview?.narrative; return n && (solDraftOf(n) || ['summary', 'scope', 'approach', 'owner', 'audience'].some(k => str(n[k]))) ? [n] : []; }]
];
const chapterTitle = n => CHAPTERS.find(c => c.id === n)?.title || (n === 11 ? 'Review & realize' : 'Chapter ' + n);

// ---------------------------------------------------------------- provenance (who and what wrote the records)
// The one reading of authorship every edition prints (GR-SDD-10; SDD-SPEC principle 3 and Appendix E), read through
// workstream D3's provenance reader (provenance.js), the one the chapter pages, the review plan and the footer read
// (round 12): sddAuthor says who wrote a record in the words below (Sol's draft, an import, the journey rules, a person,
// AIW's reference content, AIW's proposal), from its proposal state, Sol's mark (record-lifecycle.js solDraftOf), the
// server's stamp of the commit that wrote it and its origin; confirmedByPerson whether a person confirmed it (a
// recorded confirmation, keep or acceptance, or a review plan judgement that kept it as drafted). A record Sol drafted
// is drafted by Sol, not reviewed by a person, while it is a proposal, and the person's once a person keeps it or saves
// a change to it; a journey draft is its drafter's until a person edits it.
export const AUTHOR_WORDS = {sol: 'drafted by Sol', import: 'imported from a source', rules: 'drafted by the journey rules', person: 'written by a person', reference: 'AIW reference content', proposal: 'proposed by AIW'};
export function provenanceReading(p) {
  return passValue(p, 'sdd:provenance', () => {
    const by = {sol: 0, import: 0, rules: 0, person: 0, reference: 0, proposal: 0}, reviewed = {sol: 0, import: 0, rules: 0, person: 0, reference: 0, proposal: 0}, chapters = new Map();
    // Which engine drafted Sol's records (the drafter's mark, record-lifecycle.js solDraftOf): the model through the
    // architecture contract, with its provider and model; the drafting rules, worded with the model or not.
    const engines = {model: 0, assisted: 0, rules: 0}, models = new Map();
    let total = 0, confirmed = 0;
    for (const [chapter, , read] of COLLECTIONS) for (const r of read(p)) {
      const a = sddAuthor(r), ok = confirmedByPerson(p, r, chapter); total++; by[a]++; if (ok) { confirmed++; reviewed[a]++; }
      if (a === 'sol') { const d = solDraftOf(r), e = d?.engine; if (e === 'model') { engines.model++; const m = [str(d.provider), str(d.model)].filter(Boolean).join(' · '); if (m) models.set(m, (models.get(m) || 0) + 1); } else if (e === 'model-assisted') engines.assisted++; else if (e === 'rules') engines.rules++; }
      const c = chapters.get(chapter) || {chapter, title: chapterTitle(chapter), total: 0, sol: 0, import: 0, rules: 0, person: 0, reference: 0, proposal: 0, confirmed: 0};
      c.total++; c[a]++; if (ok) c.confirmed++; chapters.set(chapter, c);
    }
    const datasets = list(p.intake?.datasets), brief = str(p.brief?.problem), sources = [];
    for (const d of datasets) sources.push({kind: 'workbook', title: d.filename || d.id, detail: [d.sheet ? 'sheet ' + d.sheet : '', d.rowCount != null ? plural(d.rowCount, 'row') : '', d.revision ? 'revision ' + d.revision : '', d.at ? 'imported ' + String(d.at).slice(0, 10) : '', d.actor ? 'by ' + d.actor : ''].filter(Boolean).join(', '), hash: d.workbookHash || ''});
    // An evidence source (evidence-domain.js) is read at its latest version: its title, revision, state, the source's own
    // version and date, where it is and who confirmed it.
    for (const s of list(p.coauthoring?.sources)) { const v = list(s.versions).at(-1) || s; sources.push({kind: s.kind || v.kind || 'evidence source', title: (s.id && v.title ? s.id + ' · ' + v.title : v.title || s.title || s.id), detail: [v.revision != null && s.versions ? 'revision ' + v.revision : '', v.status, v.version ? 'version ' + v.version : '', v.date ? 'dated ' + v.date : '', clip(v.location, 160), v.confirmedBy ? 'confirmed by ' + v.confirmedBy : ''].filter(Boolean).join(', '), hash: v.hash || s.hash || ''}); }
    const people = [...new Set([...list(p.changes?.events).map(e => e.actor), ...list(p.finalReview?.reviews).map(r => r.actor || r.reviewer), ...list(p.intake?.datasets).map(d => d.actor)].filter(x => typeof x === 'string' && x.trim()))];
    const from = [datasets.length ? 'the requirements workbook' : '', brief ? 'the brief' : ''].filter(Boolean).join(' and ') || 'the records';
    const parts = Object.entries(by).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).map(([k, n]) => count(n) + ' ' + AUTHOR_WORDS[k]);
    const lead = Object.entries(by).filter(([, n]) => n).sort((a, b) => b[1] - a[1])[0]?.[0], checked = confirmed ? count(confirmed) + ' of ' + plural(total, 'record') + ' confirmed by a person.' : by.sol ? 'none confirmed by a person.' : 'not reviewed by a person.';
    // The line names who wrote most of the records, and Sol's drafts whenever there are any, in the words SDD-SPEC
    // gives them: "drafted by Sol, not reviewed by a person" until a person has reviewed them.
    const solPart = !by.sol ? '' : reviewed.sol ? count(reviewed.sol) + ' of the ' + plural(by.sol, 'record') + ' Sol drafted ' + isAre(reviewed.sol) + ' reviewed by a person, the others not' : (by.sol === total ? 'not reviewed by a person' : plural(by.sol, 'record') + ' drafted by Sol, not reviewed by a person');
    let line;
    if (!total) line = 'None recorded yet, so nothing in this document was written by anyone.';
    else if (lead === 'sol') line = 'Drafted by Sol from ' + from + '; ' + solPart + (by.sol < total ? '; ' + checked : '.');
    else {
      const head = lead === 'import' ? 'Imported from ' + from + (by.rules ? ' and drafted further by AIW’s journey rules' : '') : lead === 'rules' ? 'Drafted by AIW’s journey rules from ' + from : lead === 'reference' ? 'Mostly AIW reference content, a teaching example' : lead === 'proposal' ? 'Mostly proposed by AIW and not yet written by a person' : 'Written by people on the project';
      line = head + (solPart ? '; ' + solPart : '') + '; ' + (lead === 'person' && !confirmed ? 'nothing is confirmed by a person yet.' : checked);
    }
    const engineParts = [engines.model ? count(engines.model) + ' with the model' + (models.size ? ' (' + [...models.keys()].join('; ') + ')' : '') : '', engines.assisted ? count(engines.assisted) + ' by AIW’s drafting rules and worded with the model' : '', engines.rules ? count(engines.rules) + ' by AIW’s drafting rules' : ''].filter(Boolean);
    const detail = total ? 'Of ' + plural(total, 'record') + ': ' + parts.join(', ') + '; ' + (confirmed ? count(confirmed) + ' confirmed by a person' : 'none confirmed by a person') + '.' + (engineParts.length ? ' Of Sol’s drafts: ' + engineParts.join(', ') + '.' : '') + ' Approval is printed only from approval records.' : '';
    return {total, by, reviewed, confirmed, engines: {...engines, models: Object.fromEntries(models)}, chapters: [...chapters.values()].sort((a, b) => a.chapter - b.chapter), sources, people, line, detail};
  });
}
// How far a set of records has come, in one line: "12 records: 10 drafted by Sol and not reviewed by a person, 2
// written by a person; none confirmed."
export function standing(p, records) {
  const n = records.length;
  if (!n) return '';
  const by = {}, ok = records.filter(r => confirmedByPerson(p, r)).length;
  for (const r of records) { const a = sddAuthor(r); by[a] = (by[a] || 0) + 1; }
  if (n === 1) { const a = sddAuthor(records[0]); return upFirst(AUTHOR_WORDS[a]) + (a === 'sol' && !ok ? ', not reviewed by a person' : '') + '; ' + (ok ? 'confirmed by a person' : 'not confirmed by a person') + '.'; }
  const parts = Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, x]) => count(x) + ' ' + AUTHOR_WORDS[k] + (k === 'sol' && !ok ? ' and not reviewed by a person' : ''));
  return plural(n, 'record') + ': ' + parts.join(', ') + '; ' + (ok === n ? 'all confirmed by a person' : ok ? count(ok) + ' confirmed by a person' : 'none confirmed by a person') + '.';
}

// ---------------------------------------------------------------- version and status (GR-SDD-24)
// The version is derived from the baseline sequence: the k-th frozen baseline is version 0.k, and the working draft is
// the version after the last one (0.1 before the first). A frozen document says what it was when it was frozen;
// approval is recorded later, against a baseline, and is printed only from those records.
const APPROVED = ['Approved', 'Approved with conditions'];
export function documentStatus(p, meta = {}) {
  const bs = list(p.finalReview?.baselines), at = i => '0.' + (i + 1), frozenAt = meta.id ? bs.findIndex(b => b.id === meta.id) : -1;
  const index = meta.id ? (frozenAt >= 0 ? frozenAt : bs.length) : bs.length, version = at(index);
  const approvals = bs.map((b, i) => ({b, version: at(i), g: latestGovernance(p, b.id)})).filter(x => x.g && APPROVED.includes(x.g.outcome));
  const last = bs.at(-1), events = list(p.changes?.events), date = String(meta.at || events.at(-1)?.at || p.workspace?.createdAt || '').slice(0, 10);
  const hasRecords = list(p.artefacts).length || ['quality','decisions','logical','realisation','technology','technologyRealisation','interfaces','security','runtime'].some(k => Object.values(p[k] || {}).some(v => Array.isArray(v) && v.some(r => r && typeof r === 'object' && r.id)));
  const status = meta.id ? 'Frozen baseline ' + meta.id + ' · ' + (meta.classification || 'Working draft') + ' · not approved when frozen' : hasRecords ? 'Working draft · not approved' : 'Empty template · no design records · not approved';
  return {version, status, line: 'Version ' + version + ' · ' + status, date: date || 'not recorded', baselines: bs.map((b, i) => ({id: b.id, title: b.title, version: at(i), at: String(b.at || '').slice(0, 10), classification: b.classification, governance: latestGovernance(p, b.id) || null})), approvals, last: meta.id ? null : last ? {id: last.id, version: at(bs.length - 1), at: String(last.at || '').slice(0, 10), classification: last.classification} : null};
}
// The solution's name: the SDD's title (review-domain.js sddTitle: the sample's default title read on another project
// is no title, GR-SDD-21) without the document words, else the project's name.
export function solutionName(p) {
  return sddTitle(p).replace(/\s*[—–-]\s*Solution Design(?: Document)?\s*$/i, '').trim() || str(p.name) || 'The solution';
}

// ---------------------------------------------------------------- open items (Appendix B) and open questions
// Every field the body finds open is recorded here, once per record and field, with its cause; Appendix B lists them by
// cause with their counts and where to resolve them, beside every field the records keep in an open state that the body
// does not print (open-fields.js). A field the body records names the record fields it stands for (`field`, with the
// record's `id`), and Appendix B does not list those again under their own names: one label per open field, so
// openItems counts it once (D-24-06). Nothing here reads the document's text, so no change-history marker is counted
// (GR-SDD-11).
// In format 2, what a record of sections 1 to 4 and 6 (and of the delivery obligations) leaves open is also asked of
// its section (`asks`, read by openQuestions): the record's reference and kind, the field's words, the question when
// one is asked, and the module whose part of section 4 prints the record (round 24: `module`, the module being printed
// when it is asked, '' outside one), so that each module lists its own; each is asked once a section.
function openCollector(format = SDD_FORMAT) {
  const items = new Map(), printed = new Set(), byField = new Map(), labels = new Map(), asks = {1: [], 2: [], 3: [], 4: [], 6: [], obligations: []}, asked_ = new Set();
  const O = {items, asks, format, section: 0, module: ''};
  const ask = (ref, kind, words, question = '', module = O.module) => { const xs = asks[O.section], key = O.section + '|' + ref + '|' + words + '|' + question; if (format < 2 || !xs || !words || asked_.has(key)) return; asked_.add(key); xs.push({ref, kind, words, question, module: module || ''}); };
  const add = (chapter, kind, label, ref, {question = '', state = 'not-stated', where = '', field = null, id = null, words = '', asked = question} = {}) => {
    const key = chapter + '|' + kind + '|' + label + '|' + state;
    if (!items.has(key)) items.set(key, {chapter, kind, label, state, where, refs: [], questions: [], fields: []});
    const it = items.get(key);
    if (!it.refs.includes(ref)) it.refs.push(ref);
    if (question && !it.questions.some(q => q.ref === ref && q.question === question)) it.questions.push({ref, question});
    const fields = [].concat(field ?? []);
    for (const f of fields) { if (!it.fields.includes(f)) it.fields.push(f); if (id != null) byField.set(chapter + '|' + id + '|' + f, key); }
    if (fields.length === 1 && !labels.has(chapter + '|' + kind + '|' + fields[0])) labels.set(chapter + '|' + kind + '|' + fields[0], label);
    if (words) ask(ref, kind, words, asked);
  };
  // Whether the body recorded this field of this record (Appendix B then names it once, under the body's label), and the
  // label the body gives this kind's field (a record the body does not print, beyond a list's bound, is named the same).
  const has = (chapter, id, f) => byField.has(chapter + '|' + id + '|' + f), labelOf = (chapter, kind, f) => labels.get(chapter + '|' + kind + '|' + f) || '';
  // The words for a field: its value when stated; else (format 1) "open: …" the first time this record's field is
  // printed and `short` (or nothing) after that; every time recorded for Appendix B, and in format 2 asked of the section.
  const field = (r, chapter, kind, f, label = f, {short = 'open', value = null, words = label.replace(/^Integration: /, '')} = {}) => {
    const v = value ?? r?.[f], o = fieldOpen(value == null ? r : {[f]: value, open: r?.open}, f);
    if (!o && str(v)) return {stated: true, text: str(v)};
    const ref = refOf(r) || (kind === 'document' ? 'SDD narrative' : kind === 'brief' ? 'Brief' : kind), first = !printed.has(ref + '|' + f); printed.add(ref + '|' + f);
    const asked = o?.state === 'open-question' && o.question ? o.question : '';
    add(chapter, kind, label, ref, {state: o?.state === 'open-question' ? 'open-question' : 'not-stated', question: o?.question || '', field: f, id: r?.id ?? null, words, asked});
    return {stated: false, text: first ? (asked ? 'open: ' + asked : 'open: ' + label + ' not stated') : short};
  };
  const gap = (chapter, kind, label, ref, where = '') => add(chapter, kind, label, ref, {state: 'gap', where});
  // The same, as Markdown: the record's words escaped when stated, the "open: …" marker otherwise.
  const say = (...args) => { const f = field(...args); return f.stated ? md(f.text) : f.text; };
  return Object.assign(O, {add, field, gap, say, has, labelOf, ask});
}
// Format 2: the flag a record's marker carries for a statement it leaves out (sdd-content.js): the field, with "?" when
// the words format 1 printed in its place (as the reader reads them) ask a question.
const flagOf = (field, printed) => field + (markerQuestion(plain(printed)) ? '?' : '');
// A record's marker line, when it leaves any statement out.
const markerOf = (B, opens) => (B.format >= 2 && opens.length ? openMarkerLine(opens) + '\n\n' : '');
// A section's "Open questions" (format 2; D-24-06), at the end of sections 1 to 4 and 6 (and of the delivery
// obligations): each question once, naming the records and the fields it is asked of; then, kind by kind, each set of
// fields the same records leave unstated, one line naming those records (how many of the section's records of that
// kind, then their codes). At most LIST_MAX lines, and LIST_MAX codes a line, inline; the rest are counted with a pointer
// to Appendix B, which lists every open item by cause. A level-2 heading, so the contents link it and no reader takes
// it for a record. Section 4 by module (round 24): each module's own list, of what was asked while it was printed, at
// the end of its part (a level-4 heading, with the module's own counts), and the section's list of the rest.
const KIND_NOUNS = {brief: ['brief', 'briefs'], document: ['SDD narrative', 'SDD narratives'], outcome: ['outcome', 'outcomes'], stakeholder: ['stakeholder', 'stakeholders'], actor: ['actor', 'actors'], driver: ['driver', 'drivers'], decision: ['decision', 'decisions'], component: ['component', 'components'], 'external party': ['external integration', 'external integrations'], 'technology need': ['technology need', 'technology needs'], control: ['control', 'controls'], realisation: ['realisation', 'realisations'], invariant: ['invariant', 'invariants'], contract: ['batch contract', 'batch contracts'], 'responsibility group': ['responsibility group', 'responsibility groups'], capability: ['capability', 'capabilities'], 'requirement group': ['requirement group', 'requirement groups'], 'migration record': ['migration record', 'migration records'], 'delivery action': ['delivery obligation', 'delivery obligations']};
function openQuestions(B, n, {module = '', level = 2, totals = B.totals, scope = 'section', appendix = true} = {}) {
  const xs = (B.O.asks[n] || []).filter(x => x.module === module);
  if (B.format < 2 || !xs.length) return '';
  const where = B.parts.has('B') ? 'Appendix B' : 'Appendix B of the edition for everyone';
  const refs = rs => { const shown = refList(rs), whole = refList(rs, Infinity); return shown === whole || !appendix ? shown : shown + ', each in ' + where; };
  const asked = [], unstatedLines = [], questions = new Map(), unstated = new Map();
  for (const x of xs) {
    if (x.question) { const q = questions.get(x.question) || new Map(); questions.set(x.question, q); const ws = q.get(x.ref) || []; q.set(x.ref, ws); if (!ws.includes(x.words)) ws.push(x.words); continue; }
    const k = unstated.get(x.kind) || new Map(); unstated.set(x.kind, k); const rs = k.get(x.words) || []; k.set(x.words, rs); if (!rs.includes(x.ref)) rs.push(x.ref);
  }
  // A question: the records that ask it of the same fields share their part of the line.
  for (const [q, byRef] of questions) {
    const parts = new Map();
    for (const [ref, ws] of byRef) { const key = ws.join('|'), x = parts.get(key) || {ws, refs: []}; parts.set(key, x); x.refs.push(ref); }
    const ps = [...parts.values()], rest = ps.slice(6).reduce((k, x) => k + x.refs.length, 0);
    asked.push(upFirst(md(q)) + ' (' + ps.slice(0, 6).map(x => refs(x.refs) + ': ' + andList(x.ws)).join('; ') + (rest ? '; and ' + plural(rest, 'more record') + (appendix ? ', each in ' + where : '') : '') + ')');
  }
  // Not stated: fields the same records leave unstated share a line, the widest first.
  for (const [kind, byWords] of unstated) {
    const sets = new Map();
    for (const [w, rs] of byWords) { const key = rs.join('|'), x = sets.get(key) || {ws: [], rs}; sets.set(key, x); x.ws.push(w); }
    const [one, many] = KIND_NOUNS[kind] || [kind, kind + 's'], total = totals?.[kind];
    const who = rs => (total && rs.length === total ? (total === 1 ? rs[0] : (total === 2 ? 'both ' : 'all ' + count(total) + ' ') + many) : (total ? count(rs.length) + ' of ' + plural(total, one, many) : plural(rs.length, one, many)) + ': ' + refs(rs));
    for (const x of [...sets.values()].sort((a, b) => b.rs.length - a.rs.length)) unstatedLines.push('Not stated: ' + andList(x.ws) + ' (' + who(x.rs) + ')');
  }
  // At most LIST_MAX lines: the lines of fields not stated (few, each over many records) are kept, the questions fill the
  // rest in the order they are asked, and what does not fit is counted.
  const u = unstatedLines.slice(0, LIST_MAX), q = asked.slice(0, LIST_MAX - u.length), restQ = asked.length - q.length, restU = unstatedLines.length - u.length;
  const rest = restQ || restU ? 'And ' + [restQ ? plural(restQ, 'more question') : '', restU ? plural(restU, 'more line', 'more lines') + ' of fields not stated' : ''].filter(Boolean).join(' and ') + (appendix ? ', listed by cause in ' + where : '') + '.\n\n' : '';
  return '#'.repeat(level) + ' Open questions\n\nEach question this ' + scope + ' leaves open, once, with the records and fields it is asked of; then the fields not stated, with the records that leave them so.' + (appendix ? ' ' + upFirst(where) + ' lists every open item by cause.' : '') + '\n\n' + bullets([...q, ...u]) + rest;
}

// ---------------------------------------------------------------- the design, indexed once
function designIndex(p) {
  return passValue(p, 'sdd:design-index', () => {
    const reqs = reviewRequirements(p), reqById = new Map(reqs.map(r => [r.id, r])), G = groupIndex(p), groups = requirementGroups(p).filter(g => !g.legacy || (G.members.get(g.id) || []).length);
    const codes = driverCodes(p), drivers = list(p.quality?.drivers), resp = list(p.logical?.responsibilities), comps = list(p.realisation?.components), respById = new Map(resp.map(r => [r.id, r])), compById = new Map(comps.map(c => [c.id, c]));
    const push = (m, k, v) => { let xs = m.get(k); if (!xs) m.set(k, xs = []); if (!xs.includes(v)) xs.push(v); };
    // Curated links only (GR-SDD-16): a responsibility that names the requirement or its group, the component a
    // responsibility is allocated to (realises or supports), and a component that names the requirement or its group.
    const respByReq = new Map(), compsByReq = new Map(), roleOf = new Map(), driversByReq = new Map(), driversByGroup = new Map(), compsByResp = new Map();
    for (const r of resp) for (const id of linkedRequirementIds(p, r)) if (reqById.has(id)) push(respByReq, id, r.id);
    for (const m of list(p.logical?.mappings)) { if (!respById.has(m.logicalId) || !compById.has(m.physicalId)) continue; push(compsByResp, m.logicalId, m.physicalId); roleOf.set(m.logicalId + '>' + m.physicalId, mappingRole(m) || 'realises'); }
    for (const [req, rs] of respByReq) for (const rid of rs) for (const cid of compsByResp.get(rid) || []) push(compsByReq, req, cid);
    for (const c of comps) for (const id of linkedRequirementIds(p, c)) if (reqById.has(id)) push(compsByReq, id, c.id);
    for (const d of drivers) { for (const id of linkedRequirementIds(p, d)) if (reqById.has(id)) push(driversByReq, id, d.id); for (const g of list(d.requirementGroupIds)) push(driversByGroup, g, d.id); }
    // A component's requirements: those of the responsibilities it realises, apart from those it only supports, and
    // those it names itself.
    const reqsOfComp = new Map();
    for (const c of comps) {
      const realises = new Set(), supports = new Set();
      for (const m of list(p.logical?.mappings).filter(x => x.physicalId === c.id)) { const r = respById.get(m.logicalId); if (!r) continue; for (const id of linkedRequirementIds(p, r)) if (reqById.has(id)) ((mappingRole(m) || 'realises') === 'supports' ? supports : realises).add(id); }
      for (const id of linkedRequirementIds(p, c)) if (reqById.has(id)) realises.add(id);
      reqsOfComp.set(c.id, {realises: [...realises], supports: [...supports].filter(id => !realises.has(id))});
    }
    // The drivers that bear on a component: those on its responsibilities (componentSpec's), then those that link the
    // requirements it realises, or their groups, with how many of them.
    const driversOfComp = new Map();
    for (const c of comps) {
      const n = new Map(), {realises} = reqsOfComp.get(c.id);
      for (const id of realises) for (const d of new Set([...(driversByReq.get(id) || []), ...(G.of.get(id) || []).flatMap(g => driversByGroup.get(g) || [])])) n.set(d, (n.get(d) || 0) + 1);
      driversOfComp.set(c.id, [...n].sort((a, b) => b[1] - a[1]).map(([id, k]) => ({id, n: k})));
    }
    return {reqs, reqById, G, groups, codes, drivers, driverById: new Map(drivers.map(d => [d.id, d])), resp, respById, comps, compById, respByReq, compsByReq, compsByResp, roleOf, driversByReq, driversByGroup, reqsOfComp, driversOfComp};
  });
}
const delivery = a => str(a?.assessment?.delivery);
const isDelivered = a => delivery(a).toLowerCase() === 'delivered';
const isGap = a => !!delivery(a) && !isDelivered(a);
const band = a => str(a?.assessment?.priorityBand);
const BAND_ORDER = ['critical', 'high', 'medium', 'low'];
const bandRank = a => { const i = BAND_ORDER.indexOf(band(a).toLowerCase()); return i < 0 ? 9 : i; };
const score = a => { const n = Number(a?.assessment?.priorityScore); return Number.isFinite(n) ? n : -1; };
// Band names in the order of urgency, a band AIW does not know after the known ones.
const byBand = (x, y) => { const i = BAND_ORDER.indexOf(String(x).toLowerCase()), j = BAND_ORDER.indexOf(String(y).toLowerCase()); return (i < 0 ? 9 : i) - (j < 0 ? 9 : j) || String(x).localeCompare(String(y)); };
// The one printer of a requirement group's reference (GR-SDD-25): "RG-001 · Title (N requirements, M delivery gaps)".
export function groupLabel(p, g) {
  const I = designIndex(p), ids = I.G.members.get(g.id) || [], gaps = ids.filter(id => isGap(I.reqById.get(id))).length;
  return refOf(g) + ' · ' + md(g.title) + ' (' + plural(ids.length, 'requirement') + (gaps ? ', ' + plural(gaps, 'delivery gap') : '') + ')';
}
const groupsOf = (p, ids) => { const I = designIndex(p); return list(ids).map(id => I.groups.find(g => g.id === id || g.alias === id)).filter(Boolean); };

// ---------------------------------------------------------------- the modules (round 24, D-24-01 to D-24-03)
// The module structure the SDD is organised by when the project has one (module-model.js moduleTree: business modules,
// each a part of what the system does, and platform modules, the shared services they use, with their sub-modules), and
// the modules each record belongs to, read only through module-scope.js (one reading, D-24-03): recordModules, else
// recordAttachments for a record the module chain does not reach (a party by the components its contracts join, a data
// entity by the components that own it, a contract by its ends, a control or threat by what it protects or threatens),
// as every reader that lays the design out by module places it (the figures alike); a record in neither is in no module.
// A record in several modules prints in full once, under its home: its platform module when it is in one (in several, the one
// that owns or serves the most of the requirements it realises, a reporting service under the reporting module rather
// than under a module whose reporting sub-module it also serves), else its first module in the tree's order; it is
// named by reference where else it belongs. Null without modules.
function moduleLayout(p) {
  return passValue(p, 'sdd:modules', () => {
    const T = moduleTree(p);
    if (!T.modules.length) return null;
    const RM = recordModules(p), RA = recordAttachments(p), rank = new Map(T.modules.map((m, i) => [m.group.id, i])), byId = new Map(T.modules.map(m => [m.group.id, m]));
    const platform = id => byId.get(id)?.group.role === 'platform';
    // A record's modules and its home are the figures' (sdd-c4.js moduleHomes): one rule, so Section 4 prints a component
    // in full under the module whose figure draws it in full.
    const {modulesOf, homeOf} = moduleHomes(p);
    // What a platform module serves (its `serves` rule on the requirements' themes): the requirements of the other
    // modules it serves, each counted once.
    const served = new Map();
    for (const [rid, ms] of T.served) for (const m of ms) if (T.home.get(rid)?.moduleId !== m) { if (!served.has(m)) served.set(m, []); served.get(m).push(rid); }
    return {T, RM, RA, byId, rank, platform, modulesOf, homeOf, served, business: T.modules.filter(m => !platform(m.group.id)), platforms: T.modules.filter(m => platform(m.group.id))};
  });
}
// A module's reference ("RG-001 · Deposit Accounts").
const moduleRef = g => refOf(g) + ' · ' + md(g.title);
// The requirements a serves rule names, in words: "capability theme is “Search, export and reporting” or “Reporting”".
const RULE_WORDS = new Map(GROUP_RULE_FIELDS);
function ruleWords(rule) {
  const quote = v => '“' + md(v) + '”', or = xs => (xs.length > 6 ? xs.slice(0, 6).join(', ') + ' or ' + more(xs.length - 6) : xs.length > 1 ? xs.slice(0, -1).join(', ') + ' or ' + xs.at(-1) : xs.join(''));
  return list(rule).map(c => (RULE_WORDS.get(c.field) || c.field).toLowerCase() + (c.op === 'is one of' ? ' is ' + or(list(c.values).map(quote)) : c.op === 'is not' ? ' is not ' + quote(c.value) : ' is ' + quote(c.value))).join(' and ');
}
// What a platform module serves, in a clause: "serves 11 requirements in 3 other modules, those whose capability theme
// is “User access and roles”" ('' when it serves none).
function servesClause(p, L, g) {
  const rs = L.served.get(g.id) || [];
  if (!rs.length) return '';
  const ms = new Set(rs.map(r => L.T.home.get(r)?.moduleId).filter(Boolean));
  return 'serves ' + plural(rs.length, 'requirement') + ' in ' + plural(ms.size, 'other module') + (list(g.serves).length ? ', those whose ' + ruleWords(g.serves) : '');
}
// The structure's standing (Chapter 1): accepted by a person (requirements.modules-accept), else proposed by AIW from the
// requirements' columns when its modules are AIW's proposal (module-model.js applyModuleProposal), not accepted.
const moduleStanding = L => (L.T.state === 'accepted' ? 'accepted by a person' : L.T.state === 'mixed' ? 'partly accepted by a person' : L.T.modules.every(m => m.group.proposal) ? 'proposed by AIW from the requirements’ columns, not accepted by a person' : 'not accepted by a person');
const driverName = (p, d) => { const I = designIndex(p), code = I.codes.get(d.id) || d.id; return isQualityDriver(d) ? (QUALITY_TYPES.find(t => t.id === d.category)?.name || 'Quality') + ' (' + code + ')' : md(clip(d.title, 60)) + ' (' + code + ')'; };
const codeOf = (p, id) => designIndex(p).codes.get(id) || id;

// ---------------------------------------------------------------- front matter
function cover(B) {
  // Format 2 says plainly that the group is not named yet, and where to name it, as the purpose does (D-24-06).
  const {p, S, name, meta} = B, owner = str(p.finalReview?.narrative?.owner), group = owner && !fieldOpen(p.finalReview.narrative, 'owner') ? md(owner) : B.format < 2 ? 'open: authoring group' : 'not named yet (Chapter 11 · Work · Frame the SDD)';
  if (!owner || fieldOpen(p.finalReview.narrative, 'owner')) B.O.gap(11, 'document', 'Authoring group (the SDD narrative owner)', 'SDD narrative', 'Chapter 11 · Work · Frame the SDD');
  return '<!-- aiw:cover -->\n# ' + md(name.toUpperCase()) + '\n\nSolution Design Document\n\nAuthoring group: ' + group + '\n\n' + S.line + '\n\nDate: ' + S.date + (meta.id ? '' : ' · Baseline: ' + (S.last ? S.last.id + ' (version ' + S.last.version + ', frozen ' + S.last.at + ')' : 'none frozen yet')) + '\n\n' + B.editionLine + '\n<!-- aiw:/cover -->\n\n';
}
function documentControl(B) {
  const {p, S, meta} = B, n = p.finalReview?.narrative || {}, cellOf = f => (str(n[f]) && !fieldOpen(n, f) ? mdCell(n[f]) : B.format < 2 ? 'open' : '—');
  let out = '## Document control\n\n' + table(['Version', 'Status', 'Owner', 'Audience', 'Date', 'Baseline'], [[S.version, S.status, cellOf('owner'), cellOf('audience'), S.date, meta.id ? meta.id : S.last ? S.last.id + ' (' + S.last.version + ')' : 'none frozen']]);
  if (!str(n.audience) || fieldOpen(n, 'audience')) B.O.gap(11, 'document', 'Audience of the SDD narrative', 'SDD narrative', 'Chapter 11 · Work · Frame the SDD');
  out += 'Approvals: ' + (S.approvals.length ? S.approvals.map(x => x.b.id + ' (version ' + x.version + ') ' + x.g.outcome.toLowerCase() + ' on ' + String(x.g.at || '').slice(0, 10) + ', reviewer ' + md(x.g.reviewer) + ', recorded by ' + md(x.g.actor || 'an unnamed account') + (independentApproval(x.b, x.g) ? ', a second signed-in person' : '; not recorded by a second signed-in person, so it unlocks no handoff')).join('; ') + (meta.id ? '.' : '. This working draft itself is not approved.') : 'none recorded.') + '\n\n';
  out += 'Provenance: ' + B.prov.line + (B.prov.detail ? ' ' + B.prov.detail : '') + '\n\n';
  const r = latestDesignReview(p);
  out += 'Architect review: ' + (r ? r.id + ' · ' + r.outcome + ', recorded by ' + md(r.reviewer) + ' on ' + String(r.at || '').slice(0, 10) + '.' : 'none recorded for the current design.') + '\n\n';
  if (S.baselines.length) out += 'Version history:\n\n' + table(['Version', 'Baseline', 'Frozen', 'Classification', 'Governance'], S.baselines.slice(-LIST_MAX).map(b => [b.version, b.id + ' · ' + mdCell(b.title), b.at, mdCell(b.classification), b.governance ? mdCell(b.governance.outcome) : 'none recorded'])) + (S.baselines.length > LIST_MAX ? 'And ' + plural(S.baselines.length - LIST_MAX, 'earlier baseline') + ' (Chapter 11 · Output).\n\n' : '');
  return out;
}

// ---------------------------------------------------------------- 1. Introduction
function introduction(B) {
  const {p, O, name} = B, I = designIndex(p), n = p.finalReview?.narrative || {}, brief = p.brief || {}, arts = list(p.artefacts).filter(a => a.scopeMode !== 'out' || a.type === 'scope');
  let out = '# 1. Introduction: ' + md(name) + '\n\n';
  const ch1 = list(p.artefacts);
  if (ch1.length) out += 'Status: ' + standing(p, ch1) + '\n\n';
  // What the narrative and the brief leave unstated is said once, in a plain sentence with where to write it, and listed
  // once in Appendix B (round 24, D-24-06: no "open: …" marker beside a sentence that says the same).
  B.totals = {...B.totals, brief: 1, document: 1};
  const summary = O.field(n, 11, 'document', 'summary', 'summary of the SDD narrative', {words: 'summary'});
  out += (summary.stated ? mdText(summary.text) : 'The SDD narrative has no summary yet; write it in Chapter 11 · Work · Frame the SDD.') + '\n\n';
  const problem = str(brief.problem);
  if (problem) {
    const paras = problem.replace(/\r\n?/g, '\n').split(/\n\s*\n/), keep = []; let size = 0;
    for (const x of paras) { if (size && size + x.length > 1500) break; keep.push(x); size += x.length; }
    out += 'The problem, as the brief states it:\n\n' + mdText(keep.join('\n\n').slice(0, 2400)) + '\n\n' + (keep.length < paras.length || size > 2400 ? 'The brief continues for ' + plural(paras.slice(keep.length).join(' ').split(/\s+/).filter(Boolean).length + Math.max(0, size - 2400) / 6 | 0, 'more word') + '; the Chapter 1 register holds it whole (Appendix D).\n\n' : '');
  } else O.gap(1, 'brief', 'Problem statement of the brief', 'Brief', 'Chapter 1 · Work · Brief');
  out += '## Purpose\n\n';
  const goal = O.field(brief, 1, 'brief', 'goal', 'goal of the brief', {words: 'goal'});
  out += (goal.stated ? mdText(goal.text) : 'The brief does not state the goal yet; write it in Chapter 1 · Work · Brief.') + '\n\n';
  const aud = str(n.audience) && !fieldOpen(n, 'audience') ? md(n.audience) : '';
  out += (aud ? 'This document is for ' + aud + '.' : 'The SDD narrative does not name the audience yet; name it in Chapter 11 · Work · Frame the SDD.') + '\n\n';
  if (!aud) O.ask('SDD narrative', 'document', 'audience');
  // Key functionalities: by module when the project has modules (round 24, format 2); else the functional drivers, else
  // the groups of the most functional kind, largest first.
  out += '## Key functionalities\n\n';
  const fds = list(p.quality?.drivers).filter(d => driverKind(d) === 'functional');
  const kinds = ['functional-area', 'theme', 'module', 'domain', 'user-group'], kind = kinds.find(k => I.groups.some(g => g.kind === k && (I.G.members.get(g.id) || []).length));
  if (B.L) out += moduleFunctionalities(B, fds);
  else if (fds.length) {
    // Drivers that cover the same requirement groups (and as many requirements) share one line: the groups once, then
    // the drivers (round 24, D-24-06: four drivers each "374 requirements in RG-001" said it four times).
    const lines = new Map();
    for (const d of fds) {
      const gs = groupsOf(p, d.requirementGroupIds), ids = linkedRequirementIds(p, d).filter(id => I.reqById.has(id)), key = gs.length ? gs.map(g => g.id).sort().join('|') + '#' + ids.length : 'driver:' + d.id;
      if (!lines.has(key)) lines.set(key, {gs, n: ids.length, ds: []});
      lines.get(key).ds.push(d);
    }
    const head = d => '**' + codeOf(p, d.id) + ' · ' + md(d.title) + '**', xs = [...lines.values()];
    const union = gs => new Set(gs.flatMap(g => I.G.members.get(g.id) || [])).size;
    const lineOf = x => (x.ds.length === 1 ? head(x.ds[0]) + ': ' + plural(x.n, 'requirement') + (x.gs.length ? ' in ' + named(x.gs.map(g => groupLabel(p, g)), 6) : ', in no requirement group yet') : named(x.gs.map(g => groupLabel(p, g)), 6) + (x.n !== union(x.gs) ? ' (' + plural(x.n, 'requirement') + ' in all)' : '') + ', covered by ' + plural(x.ds.length, 'functional driver') + ': ' + named(x.ds.map(head)));
    const shown = xs.slice(0, LIST_MAX).reduce((k, x) => k + x.ds.length, 0);
    out += 'One line per functional driver, with the requirement groups it covers; drivers that cover the same groups share their line.\n\n' + bullets(xs.map(lineOf), {rest: () => 'And ' + plural(fds.length - shown, 'more functional driver') + ' in section 2.'});
  } else if (kind) {
    const gs = I.groups.filter(g => g.kind === kind).map(g => [g, (I.G.members.get(g.id) || []).length]).filter(([, k]) => k).sort((a, b) => b[1] - a[1] || a[0].id.localeCompare(b[0].id));
    out += 'One line per ' + kindName(kind).toLowerCase() + ', largest first, with its requirement count.\n\n' + bullets(gs.map(([g]) => groupLabel(p, g)), {rest: k => 'And ' + plural(k, 'more ' + kindName(kind).toLowerCase(), 'more ' + kindName(kind).toLowerCase() + 's') + ', each in Appendix A.'});
  } else if (I.reqs.length) {
    out += plural(I.reqs.length, 'requirement') + ' ' + isAre(I.reqs.length) + ' recorded and no requirement group holds them yet (Chapter 1 · Requirement groups); the first are:\n\n' + bullets(I.reqs.map(r => r.id + ' · ' + md(clip(r.title, 140))), {rest: k => 'And ' + plural(k, 'more requirement') + ' in the requirement register (Appendix D).'});
    for (const r of I.reqs) O.gap(1, 'requirement', 'Requirement in no requirement group', r.id, 'Chapter 1 · Requirement groups');
  } else out += none('no requirement and no functional driver', 'Chapters 1 and 2 · Work');
  out += journeys(B);
  // Target users: the actors and stakeholders, by category.
  out += '## Target users\n\n';
  const people = arts.filter(a => a.type === 'actor' || a.type === 'stakeholder');
  if (people.length) {
    const cats = [...USER_CATEGORIES, ['', 'Not categorised yet']];
    for (const [k, label] of cats) { const xs = people.filter(a => (str(a.category) || '') === k || (k === '' && !USER_CATEGORIES.some(([c]) => c === a.category))); if (xs.length) out += '**' + label + (k ? 's' : '') + '**: ' + named(xs.map(a => md(a.title) + ' (' + a.id + ')')) + '.\n\n'; }
  } else out += none('no actor or stakeholder', 'Chapter 1 · Work');
  // Business problems solved: the outcomes, with the problem each answers and what changes.
  out += '## Business problems solved\n\n';
  const outcomes = arts.filter(a => a.type === 'outcome');
  B.totals = {...B.totals, outcome: outcomes.length};
  // Format 2 names an outcome whose problem is not stated by its code alone; the section's list names the problem.
  out += outcomes.length ? bullets(outcomes.map(o => { const prob = O.field(o, 1, 'outcome', 'problem', 'business problem'); const change = [str(o.target) ? 'target ' + md(o.target) : '', str(o.measure) ? 'measured by ' + md(o.measure) : '', str(o.baseline) ? 'from ' + md(o.baseline) : '', str(o.by) ? 'by ' + md(o.by) : ''].filter(Boolean).join(', '); return (prob.stated ? '**' + upFirst(md(prob.text)).replace(/[.]$/, '') + '** (' + o.id + '): ' : '**' + o.id + '**' + (B.format < 2 ? ' (' + prob.text + ')' : '') + ': ') + md(o.title) + (change ? ' (' + change + ')' : ''); }), {rest: k => 'And ' + plural(k, 'more outcome') + ' in the Chapter 1 register (Appendix D).'}) : none('no business outcome', 'Chapter 1 · Work');
  // Personas: every stakeholder, and every actor with a persona field.
  out += '## Stakeholder personas\n\n';
  const personas = people.filter(a => a.type === 'stakeholder' || PERSONA_FIELDS.some(([f]) => str(a[f])));
  if (personas.length) {
    // A persona field not stated: "open" in format 1; a dash in format 2, the section's list naming it.
    B.totals = {...B.totals, stakeholder: personas.filter(a => a.type === 'stakeholder').length, actor: personas.filter(a => a.type === 'actor').length};
    out += table(['Stakeholder', ...PERSONA_FIELDS.map(([, l]) => l)], personas.map(a => [mdCell(a.title) + ' (' + a.id + ')', ...PERSONA_FIELDS.map(([f, l]) => { const v = str(a[f]); if (v && !fieldOpen(a, f)) return mdCell(v); const o = fieldOpen(a, f); O.add(1, a.type, 'Persona: ' + l.toLowerCase(), a.id, {state: o?.state === 'open-question' ? 'open-question' : 'not-stated', question: o?.question || '', field: f, id: a.id, words: l.toLowerCase(), asked: o?.state === 'open-question' ? o.question || '' : ''}); return B.format < 2 ? 'open' : '—'; })]));
  } else out += none('no stakeholder, and no actor with a persona', 'Chapter 1 · Work');
  // Scope: in and out, one line each.
  out += '## Scope\n\n';
  const scope = list(p.artefacts).filter(a => a.type === 'scope'), inScope = scope.filter(a => a.scopeMode !== 'out'), outScope = scope.filter(a => a.scopeMode === 'out');
  if (scope.length || str(n.scope)) {
    out += 'In scope: ' + (inScope.length ? named(inScope.map(a => md(a.title) + ' (' + a.id + ')')) : 'no scope record says what is in scope') + '.\n\nOut of scope: ' + (outScope.length ? named(outScope.map(a => md(a.title) + ' (' + a.id + ')')) : 'no scope record says what is out of scope') + '.\n\n';
    if (str(n.scope) && !fieldOpen(n, 'scope')) out += 'As the SDD narrative frames it: ' + mdText(n.scope) + '\n\n';
  } else out += none('no scope record', 'Chapter 1 · Work');
  return out + openQuestions(B, 1);
}

// Key functionalities by module (round 24): one line per business module, with its requirements, the functional drivers
// that cover it and its sub-modules with their counts; then the platform modules apart, each with its concern, its own
// requirements and what it serves (its serves rule). The requirements no module holds are named once.
function moduleFunctionalities(B, fds) {
  const {p, L} = B, I = designIndex(p), members = g => I.G.members.get(g.id) || [], gaps = g => members(g).filter(id => isGap(I.reqById.get(id))).length;
  const covered = m => { const ids = new Set([m.group.id, ...m.children.map(s => s.id)]); return fds.filter(d => list(d.requirementGroupIds).some(id => ids.has(id))).map(d => codeOf(p, d.id)); };
  const counts = (g, own = '') => plural(members(g).length, 'requirement') + own + (gaps(g) ? ', ' + plural(gaps(g), 'delivery gap') : '');
  const subs = m => (m.children.length ? '; ' + plural(m.children.length, 'sub-module') + ': ' + named(m.children.map(s => md(s.title) + ' (' + count(members(s).length) + ')'), 6) : '');
  const drivers = m => { const ds = covered(m); return ds.length ? ', covered by ' + refList(ds, 6) : ''; };
  const business = L.business.map(m => '**' + moduleRef(m.group) + '**: ' + counts(m.group) + drivers(m) + subs(m));
  const platform = L.platforms.map(m => {
    const g = m.group, c = concernTitle(g.concern), serves = servesClause(p, L, g);
    return '**' + moduleRef(g) + '**' + (c && c.toLowerCase() !== String(g.title).trim().toLowerCase() ? ' (' + c.toLowerCase() + ')' : '') + ': ' + (members(g).length ? counts(g, ' of its own') : 'no requirement of its own') + drivers(m) + (serves ? '; ' + serves : '') + subs(m);
  });
  let out = 'The functionalities by module, as Chapter 1’s requirement groups structure them (' + moduleStanding(L) + '): one line per business module with its requirements and sub-modules, then the platform modules, the shared services the business modules use, each with what it serves.\n\n';
  if (business.length) out += bullets(business, {rest: k => 'And ' + plural(k, 'more business module') + ', each in Appendix A.'});
  if (platform.length) out += 'Platform modules:\n\n' + bullets(platform, {rest: k => 'And ' + plural(k, 'more platform module') + ', each in Appendix A.'});
  const loose = L.T.unassigned;
  if (loose.length) out += plural(loose.length, 'requirement') + ' ' + isAre(loose.length) + ' in no module: ' + refList(loose) + ' (Chapter 1 · Requirement groups).\n\n';
  return out;
}

// ---------------------------------------------------------------- 2. Architectural drivers
const LETTERS = 'ABCDEFGH';
function drivers(B) {
  const {p, O} = B, I = designIndex(p), kinds = p.quality ? driversByKind(p) : [];
  let out = '# 2. Architectural drivers\n\n';
  if (!kinds.length) return out + none('no architectural driver', 'Chapter 2 · Work');
  const all = kinds.flatMap(x => x.drivers);
  out += 'The drivers guide the design so that it meets the business needs, the functional requirements, the quality expectations and the constraints. Each is named by its code, which stays the same between exports.\n\nStatus: ' + standing(p, all) + '\n\n';
  const num = d => Number(/(\d+)$/.exec(codeOf(p, d.id))?.[1]) || 0, F1 = B.format < 2;
  B.totals = {...B.totals, driver: all.length};
  kinds.forEach((x, i) => {
    out += '## ' + LETTERS[i] + '. ' + x.kind.plural + ' (' + x.kind.prefix + ')\n\n';
    for (const d of [...x.drivers].sort((a, b) => num(a) - num(b))) {
      const code = codeOf(p, d.id), pr = driverPriority(d), why = str(d.rationale) && !fieldOpen(d, 'rationale') ? md(d.rationale) : '', opens = [];
      let body = '';
      // A statement the driver leaves open: its "open: …" marker in format 1; in format 2 nothing in the record, its
      // name on the record's marker and its question in the section's list.
      const said = (label, f, field, words = md) => { if (f.stated) return label + words(f.text) + '\n\n'; if (F1) return label + f.text + '\n\n'; opens.push(flagOf(field, f.text)); return ''; };
      const dr = {...d, ref: code};
      body += said('Description: ', O.field(dr, 2, 'driver', 'description', 'description'), 'description');
      body += said('Impact on the architecture: ', O.field(dr, 2, 'driver', 'impact', 'impact on the architecture'), 'impact');
      if (!pr) O.add(2, 'driver', 'priority', code, {field: 'priority', id: d.id, words: 'priority'});
      // A reason Sol gave (stored "Sol’s reading: …") reads as the reason, then whose reading it is.
      const sol = /^Sol[’']s reading: /.test(why), reason = sol ? why.replace(/^Sol[’']s reading: /, '') : why;
      if (pr || F1) body += 'Priority: ' + (pr || 'open: priority not stated') + (pr && reason ? ', because ' + lowFirst(reason) + (sol ? ' (Sol’s reading)' : '') : '') + (pr && d.priorityBasis ? ' (' + d.priorityBasis + ')' : '') + '\n\n';
      else opens.push('priority');
      const gs = groupsOf(p, d.requirementGroupIds), ids = linkedRequirementIds(p, d).filter(id => I.reqById.has(id)), own = list(d.requirementIds).filter(id => I.reqById.has(id));
      if (x.kind.id === 'functional' || gs.length) {
        if (gs.length || F1) body += 'Requirement groups: ' + (gs.length ? named(gs.map(g => groupLabel(p, g))) : 'none linked') + '; ' + plural(ids.length, 'requirement') + ' in all, ' + plural(ids.filter(id => isGap(I.reqById.get(id))).length, 'delivery gap') + '.\n\n';
        if (!gs.length) O.add(2, 'driver', 'Requirement groups of a functional driver', code, {field: 'requirementGroupIds', id: d.id, words: 'requirement groups'});
      }
      if (x.kind.id === 'quality') {
        const st = O.field(dr, 2, 'driver', 'stimulus', 'stimulus'), cd = O.field(dr, 2, 'driver', 'conditions', 'conditions'), rs = O.field(dr, 2, 'driver', 'response', 'response'), bare = t => lowFirst(md(t)).replace(/\.$/, '');
        if (st.stated && rs.stated) body += 'Scenario: When ' + bare(st.text) + (cd.stated ? (/^(?:during|at|under|while|when|with|in|on|after|before|if|for|across|over|within)\b/i.test(cd.text) ? ', ' + bare(cd.text) : ' (conditions: ' + bare(cd.text) + ')') : '') + ', ' + bare(rs.text) + '.\n\n';
        else if (F1) body += 'Scenario: stimulus ' + (st.stated ? md(st.text) : st.text) + ' · conditions ' + (cd.stated ? md(cd.text) : cd.text) + ' · response ' + (rs.stated ? md(rs.text) : rs.text) + '\n\n';
        else {
          // Format 2: what the scenario states so far; the rest is in the section's list.
          const part = [[st, 'stimulus'], [cd, 'conditions'], [rs, 'response']].filter(([f]) => f.stated).map(([f, w]) => w + ' ' + md(f.text).replace(/\.$/, ''));
          if (part.length) body += 'Scenario, in part: ' + part.join(' · ') + '.\n\n';
          opens.push('scenario');
        }
        const t = targetWords(d);
        // The target stands for its figure's fields; a target that is not measurable, for its window and verification.
        if (!t.figure) O.add(2, 'driver', 'Target of a quality driver', code, {field: ['metric', 'operator', 'targetValue', 'unit', 'window', 'measurement'], id: d.id, words: 'target'});
        else if (!t.measurable) O.add(2, 'driver', 'Measurable target of a quality driver', code, {state: 'gap', field: ['window', 'measurement'], id: d.id});
        if (t.figure || F1) body += 'Target: ' + (t.figure ? md(t.text) : 'open: target not stated') + '\n\n';
        else opens.push('target');
      }
      if (own.length) body += (gs.length ? 'Requirements it names itself: ' : 'Requirements it answers: ') + refList(own) + '.\n\n';
      out += '**' + code + ': ' + md(d.title) + '**\n\n' + markerOf(B, opens) + body;
    }
  });
  // The summary table: a statement not stated is "open" in format 1, a dash in format 2 (the section's list names it).
  const none_ = F1 ? 'open' : '—';
  out += '## Summary table\n\n' + table(['Category', 'Driver', 'Description', 'Impact on architecture', 'Priority'], kinds.flatMap(x => [...x.drivers].sort((a, b) => num(a) - num(b))).map(d => [driverKind(d) === 'quality' ? 'Quality · ' + mdCell(QUALITY_TYPES.find(t => t.id === d.category)?.name || d.category) : DRIVER_KINDS.find(k => k.id === driverKind(d)).name, codeOf(p, d.id) + ' · ' + mdCell(clip(d.title, 80)), str(d.description) ? mdCell(clip(d.description, 200)) : none_, str(d.impact) ? mdCell(clip(d.impact, 200)) : none_, driverPriority(d) || none_]));
  return out + openQuestions(B, 2);
}

// ---------------------------------------------------------------- 3. Architecture decisions
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const EFFECT_WORDS = {supports: 'supports it', tension: 'is in tension with it', violates: 'breaks it', neutral: 'has little direct effect on it', unknown: 'needs evidence'};
// The order decisions print in (round 24, D-24-06), in section 3 and in its decision log: by category (I to V, a
// decision without one under V), and within a category the platform-wide decisions first (the cross-cutting drafting
// pass's, provenance.draft.theme 'cross', and those on the style, the hosting, the integration and the data), then the
// broadest (the requirement groups and drivers it answers, most first), then the order they were recorded in.
const PLATFORM_TOPICS = ['style', 'hosting', 'integration', 'data'];
export const platformWide = d => d?.provenance?.draft?.theme === 'cross' || PLATFORM_TOPICS.includes(str(d?.topic));
export function decisionOrder(p, ds) {
  const I = designIndex(p), breadth = d => groupsOf(p, d.requirementGroupIds).length + list(d.driverIds).filter(id => I.driverById.has(id)).length;
  const rank = new Map(DECISION_CATEGORIES.map((c, i) => [c.id, i]));
  return list(ds).map((d, i) => ({d, i, c: rank.get(decisionCategory(d) || 'additional'), w: platformWide(d) ? 0 : 1, b: breadth(d)})).sort((x, y) => x.c - y.c || x.w - y.w || y.b - x.b || x.i - y.i).map(x => x.d);
}
// AIW's reading of a decision (round 25, D-25-05 to D-25-07; decision-reading.js readDecision): its alternatives weighed on
// the drivers it names at the default weights, those a hard constraint rules out and those another dominates, how firmly
// the lead holds, what the effects not stated could do, and the sensitivity points. Computed when the edition is read and
// never saved; and never a choice: the SDD prints the lead as the drivers' lean, never as a proposal, a choice or an
// approval, in the words "the drivers lean to", "leads on the drivers", "ruled out: it breaks", "dominated by". Sol's
// recorded preference (decisions-domain.js recommendation) is another thing, printed "proposed by Sol, not accepted" until
// a person chooses; a working choice is a person's, and only a person accepts a decision. A live decision's reading speaks
// where it has something to say (SPOKEN: the drivers lean or tie, one alternative alone meets the hard constraints, or none
// does); a decision whose drivers weigh nothing, or whose weighed effects are not stated yet, says so in the trade-off
// analysis alone, and a superseded decision has none.
const SPOKEN = ['read', 'only', 'out'];
const READ_NOTE = 'AIW’s reading of the recorded effects', LEAN_NOTE = READ_NOTE + ' at the default weights; not a choice';
function readingOf(p, d) {
  if (!d || d.status === 'superseded') return null;
  try { return readDecision(p, d); } catch { return null; }
}
// The lean in a few words, for a table cell (the decision log; the executive edition, sdd-document.js): an open decision's
// lean, tie or the alternative that alone meets the hard constraints; for a working choice, where it stands when it is not
// the lead (the lead, a hard constraint it breaks, the alternative that dominates it). '' when the reading says nothing
// more. code names a driver.
export function leanWords(p, d, code = id => id) {
  const r = readingOf(p, d);
  if (!r || !SPOKEN.includes(r.state)) return '';
  const c = r.choice, tie = () => andList(r.tied) + ' tie on the drivers';
  if (!c) return r.state === 'out' ? 'every alternative breaks a hard constraint' : r.state === 'only' ? 'only ' + r.lead + (r.rows.find(x => x.id === r.lead)?.unshown.length ? ' is not ruled out' : ' meets the hard constraints') : r.lead ? 'the drivers lean to ' + r.lead : r.tied.length ? tie() : '';
  return c.standing === 'ruled-out' ? 'it breaks ' + andList(c.breaks.map(code)) + ', a hard constraint' : c.standing === 'dominated' ? 'dominated by ' + c.dominatedBy : c.standing === 'below' ? (r.lead ? 'the drivers lean to ' + r.lead : tie()) : '';
}
// The lean as the decision line says it. An open decision: the drivers' lean, labelled as AIW's reading and not a choice
// (or the tie, or the alternative that alone meets the hard constraints). A working choice: nothing while it leads; the
// lead and its rank when it does not; a hard constraint it breaks, or the alternative that dominates it, stated (the
// decision's findings already block or warn).
function leanSentence(B, d, r, pick) {
  if (!r || !SPOKEN.includes(r.state)) return '';
  const code = id => codeOf(B.p, id), alts = list(d.alternatives), title = id => { const a = alts.find(x => x.id === id); return id + (a ? ' · ' + md(a.title) : ''); };
  // The alternative that alone is not ruled out meets the hard constraints, unless its effect on one is not stated.
  const alone = (them = 'the hard constraints') => { const u = r.rows.find(x => x.id === r.lead)?.unshown || []; return u.length ? 'the only alternative that does not break ' + them + ', though whether it meets ' + andList(u.map(code)) + ' is not stated' : 'the only alternative that meets ' + them; };
  if (!pick) {
    if (r.state === 'out') return ' Every alternative breaks a hard constraint (' + READ_NOTE + '): revisit the alternatives or the constraint.';
    if (r.state === 'only') return ' ' + title(r.lead) + ' is ' + alone() + ' (' + READ_NOTE + '; not a choice).';
    return r.lead ? ' The drivers lean to ' + title(r.lead) + ' (' + LEAN_NOTE + ').' : r.tied.length ? ' The drivers weigh ' + andList(r.tied) + ' alike (' + LEAN_NOTE + ').' : '';
  }
  const c = r.choice, who = d.status === 'accepted' ? 'the chosen alternative' : 'the working choice';
  if (!c) return '';
  if (c.standing === 'ruled-out') return ' ' + upFirst(who) + ' breaks ' + andList(c.breaks.map(code)) + ', ' + (c.breaks.length === 1 ? 'a hard constraint' : 'hard constraints') + (r.state === 'out' ? ', and so does every other alternative: revisit the alternatives or the constraint' : r.state === 'only' ? '; ' + title(r.lead) + ' is ' + alone(c.breaks.length === 1 ? 'it' : 'them') : r.lead ? '; the drivers lean to ' + title(r.lead) : r.tied.length ? '; ' + andList(r.tied) + ' tie on the drivers' : '') + ' (' + READ_NOTE + ').';
  if (c.standing === 'dominated') { const better = r.dominated.get(c.id)?.better || []; return ' ' + upFirst(who) + ' is dominated by ' + title(c.dominatedBy) + ', which is at least as good on every driver this decision names' + (better.length ? ' and better on ' + andList(better.map(code)) : '') + ' (' + READ_NOTE + ').'; }
  if (c.standing === 'below') return (r.lead ? ' The drivers lean to ' + title(r.lead) + ', not to ' + who + ', which ranks ' : ' ' + andList(r.tied) + ' tie for the lead on the drivers; ' + who + ' ranks ') + c.rank + ' of ' + c.of + ' (' + LEAN_NOTE + ').';
  if (c.standing === 'tied') return ' The drivers weigh ' + who + ' and ' + andList(r.tied.filter(id => id !== c.id)) + ' alike (' + LEAN_NOTE + ').';
  return r.state === 'only' ? ' ' + upFirst(who) + ' is ' + alone() + ' (' + READ_NOTE + ').' : '';
}
// AIW's reading of an alternative not chosen that no person gave a reason for (D-25-07): where it stands on the drivers,
// printed after "AIW’s reading:" so that it is never taken for a reason. The question why it was not chosen stays open
// (Appendix B; in format 2 the section's open questions, in format 1 "open: why not chosen"), and a person's reason, when
// stated, is printed instead of this.
function alternativeReading(B, r, a) {
  const row = r?.rows.find(x => x.id === a.id), code = id => codeOf(B.p, id);
  if (!row) return '';
  if (row.out) return 'ruled out, it breaks ' + andList(row.breaks.map(code));
  const unshown = row.unshown.length ? '; whether it meets ' + andList(row.unshown.map(code)) + ' is not stated' : '';
  if (row.dominated?.robust) return 'dominated by ' + row.dominated.by + unshown;
  if (r.state === 'only') return (row.unshown.length ? 'the only alternative not ruled out' : 'the only alternative that meets the hard constraints') + unshown;
  if (r.state === 'unweighed') return 'nothing is weighed, as no driver this decision names has a stated priority' + unshown;
  if (r.state === 'unjudged') return 'nothing is weighed yet, as no effect on a weighed driver is stated' + unshown;
  if (r.state !== 'read') return '';
  const total = id => r.rows.find(x => x.id === id).score;
  return (r.lead === a.id ? 'leads on the drivers, ' + signed(row.score) + ' against ' + signed(total(r.runnerUp)) + ' for ' + r.runnerUp
    : r.tied.includes(a.id) ? 'ties for the lead on the drivers, ' + signed(row.score) + ' each'
    : 'ranks ' + row.rank + ' of ' + r.order.length + ' on the drivers, ' + signed(row.score) + ' against ' + signed(total(r.lead || r.tied[0]))) + (row.dominated ? '; dominated by ' + row.dominated.by + ' as the effects stand' : '') + unshown;
}
function decisions(B) {
  const {p, O} = B, ds = decisionOrder(p, list(p.decisions?.records)), alive = ds.filter(d => d.status !== 'superseded');
  let out = '# 3. Architecture decisions\n\n';
  if (!ds.length) return out + none('no architecture decision', 'Chapter 3 · Work') + scenarioSection(B);
  B.totals = {...B.totals, decision: ds.length};
  out += 'The key decisions, each driven by the drivers above and named by its code; a decision without a category is listed under additional decisions. Within a category the platform-wide decisions come first, then those that answer the most requirement groups and drivers.\n\nStatus: ' + standing(p, ds) + '\n\n';
  // The log names the drivers' lean beside the choice, or its absence (round 25), and says once whose reading that is.
  const rows = ds.map(d => { const c = chosen(d), cat = decisionCategory(d), rec = recommendation(d), lean = leanWords(p, d, id => codeOf(p, id)); return {lean, cells: [d.id, mdCell(clip(d.question, 120)), cat ? DECISION_CATEGORIES.find(x => x.id === cat).name : 'Additional (not stated)', mdCell(statusLabel(d)), (c ? c.id + ' · ' + mdCell(clip(c.title, 70)) + (d.status === 'accepted' ? '' : ' (working choice)') : (B.format < 2 ? 'open: none chosen' : 'none chosen') + (rec ? '; ' + rec.alternativeId + ' proposed by Sol, not accepted' : '')) + (lean ? '; ' + lean : ''), list(d.driverIds).map(id => codeOf(p, id)).join(', ') || 'none']}; });
  out += '## Decision log\n\n' + table(['Decision', 'Question', 'Category', 'Status', 'Chosen option', 'Drivers'], rows.map(x => x.cells));
  if (rows.some(x => x.lean)) out += 'Where the log names the drivers’ lean, a tie, a hard constraint a choice breaks or an alternative that dominates it, that is ' + READ_NOTE + ' at the default weights (' + DEFAULT_WEIGHTS + '), shown in the trade-off analysis below; it is not a choice.\n\n';
  DECISION_CATEGORIES.forEach((cat, i) => {
    const mine = ds.filter(d => (decisionCategory(d) || 'additional') === cat.id);
    if (!mine.length) return;
    out += '## ' + ROMAN[i] + '. ' + cat.plural + '\n\n';
    for (const d of mine) out += decisionText(B, d);
  });
  out += '## Trade-off analysis\n\n' + tradeoffs(B);
  if (alive.some(d => !chosen(d))) for (const d of alive.filter(d => !chosen(d))) O.add(3, 'decision', 'Decision with no chosen alternative', d.id, {state: 'gap'});
  return out + scenarioSection(B) + openQuestions(B, 3);
}
function scenarioSection({p}) {
 const {comparisons,alternatives}=scenarioProjection(p);if(!comparisons.length&&!alternatives.length)return '';
 let out='## Saved design alternatives and shared assumptions\n\nAlternatives retain coordinated native specifications. Numerical results are design estimates; they do not establish measured capacity, availability or accepted cost.\n\n';
 out+=table(['Alternative','Revision and status','Specifications','Working basis'],alternatives.map(a=>[mdCell(a.id+' · '+a.title),mdCell('r'+a.revision+' · '+a.status),mdCell(a.specifications.map(s=>s.type+(s.id?' · '+s.id:' · new record')).join('; ')),a.current?'Current':'Working design changed']));
 for(const a of comparisons.slice(0,LIST_MAX)){
  const input=a.inputs,r=a.result;out+='### '+md(a.id+' · '+a.title)+'\n\n'+(a.current?'Current saved comparison.':'Historical comparison; the working model or an alternative changed.')+' Scope: '+md(input.scope)+'. Evidence basis: '+md(a.basis||'Not stated')+'.\n\n';
  if(input.capacity)out+='Common workload: '+md(input.capacity.demand)+' '+md(input.capacity.unit)+'; growth '+md(input.capacity.growth)+'%; unavailable active replicas '+md(input.capacity.loss)+'.\n\n';
  if(input.cost)out+='Common cost horizon: '+md(input.cost.months)+' months; currency '+md(input.cost.currency)+'.\n\n';
  for(const row of list(r.rows)){
   out+='**'+md(row.id+' · '+row.title)+'** · '+md(row.currentness)+'.'+(row.reason?' '+md(row.reason):'')+'\n\n';
   if(row.conflicts?.length)out+=bullets(row.conflicts.map(c=>md(c.id+' · '+c.field)+': current and proposed specifications require resolution.'));
   const capacity=row.metrics?.capacity,cost=row.metrics?.cost;
   if(capacity)out+=capacity.status==='estimated'?'Capacity evidence: '+md(capacity.basis)+'. '+md(capacity.formula||'')+'\n\n'+table(['Growth','Arrival','Capacity','Headroom'],list(capacity.cases).map(c=>[md(c.growthPercent)+'%',md(c.arrival),md(c.capacity),md(c.headroom)])):'Capacity not assessed: '+md(capacity.reason)+'.\n\n';
   if(cost)out+=cost.status==='estimated'?'Cost estimate: '+md(cost.total)+' '+md(cost.currency)+' over '+md(cost.months)+' months; recurring '+md(cost.monthly)+' per month, upfront '+md(cost.upfront)+', migration '+md(cost.migration)+', exit '+md(cost.exit)+'. Evidence: '+md(cost.basis)+'.\n\n'+table(['Realization','Annual recurring cost','Dated basis'],list(cost.items).map(i=>[mdCell(i.id+' · '+i.title),md(i.annualCost),mdCell(i.basis)])):'Cost not assessed: '+md(cost.reason)+'.\n\n';
  }
  out+=md(r.limits)+'\n\n';
 }
 return out+(comparisons.length>LIST_MAX?more(comparisons.length-LIST_MAX)+' further comparisons in Companion · Proposals · Recorded design analyses.\n\n':'');
}
// A chosen alternative is a decision only once the decision is accepted; before that it is the working choice.
export const workingChoice = d => (d.status === 'accepted' ? '' : d.status === 'superseded' ? ' (superseded)' : d.status === 'recorded' ? ' (the working choice of a recorded decision, not yet accepted by an architect)' : ' (the working choice of a draft decision, not yet accepted)');
// Round 12 (E2): Sol's preferred alternative (decisions-domain.js recommendation) is a proposal a person accepts by
// choosing it or rejects, printed as "proposed by Sol, not accepted" until a person chooses; Sol's assessment of an
// alternative against a driver says it is Sol's and not reviewed. Round 25 (D-25-09): an assessment AIW's rules drafted
// from the SA Playbook's marks (by 'rules') says so, until a person sends it again.
const SOL_ASSESSED = ' (Sol’s assessment, not reviewed by a person)';
const RULES_ASSESSED = ' (drafted by AIW’s rules from the SA Playbook, not reviewed by a person)';
const assessedBy = v => (solAssessed(v) ? SOL_ASSESSED : rulesAssessed(v) ? RULES_ASSESSED : '');
function decisionText(B, d) {
  const {p, O} = B, I = designIndex(p), alts = list(d.alternatives), pick = chosen(d), rec = recommendation(d), preferred = rec && alts.find(a => a.id === rec.alternativeId), arts = new Map(list(p.artefacts).map(a => [a.id, a])), F1 = B.format < 2, opens = [];
  const r = readingOf(p, d);
  let out = '';
  // The decision line names Sol's preference; its reasons print once, under Justification, unless only the line has them.
  // Then AIW's reading, apart from it (round 25): the drivers' lean, or where the working choice stands when it does not lead.
  const recWhy = str(rec?.rationale), told = !!recWhy && str(d.rationale).includes(recWhy.slice(0, 60));
  const proposal = preferred ? (pick ? (preferred === pick ? ' Sol proposed this alternative.' : ' Sol proposed ' + preferred.id + ' · ' + md(preferred.title) + '.') : ' Preferred: ' + preferred.id + ' · ' + md(preferred.title) + ', proposed by Sol, not accepted' + (recWhy && !told ? ': ' + md(recWhy).replace(/[.]$/, '') : '') + '.') : '';
  out += '**Decision**: ' + (pick ? pick.id + ' · ' + md(pick.title) + (str(pick.summary) ? ': ' + md(pick.summary).replace(/[.]$/, '') : '') + workingChoice(d) + '.' + proposal : 'Open: no alternative is chosen yet.' + proposal + (alts.length ? ' Under consideration: ' + named(alts.map(a => a.id + ' · ' + md(a.title))) + '.' : ' No alternative is recorded yet.')) + leanSentence(B, d, r, pick) + '\n\n';
  out += '**Status**: ' + statusLabel(d) + ' · ' + governanceLabel(d, p) + ' · ' + standing(p, [d]) + '\n\n';
  const why = O.field(d, 3, 'decision', 'rationale', 'justification');
  if (why.stated || F1) out += '**Justification**: ' + (why.stated ? md(why.text) : why.text) + '\n\n';
  else opens.push(flagOf('justification', why.text));
  const served = list(d.driverIds).map(id => I.driverById.get(id)).filter(Boolean), read = pick || preferred;
  // Each driver's effect of the chosen (or preferred) alternative. Format 2 prints none before an alternative is chosen
  // or preferred ("weighed once an alternative is chosen", once per driver, said nothing the Answers line does not), and
  // heads them "By driver" when no justification precedes them.
  if (served.length && (read || F1)) out += (why.stated || F1 ? '' : '**By driver**:\n\n') + bullets(served.map(dr => { const a = read?.assessments?.[dr.id]; return driverName(p, dr) + ': ' + (read ? (pick ? '' : 'the preferred ' + read.id + ' ') + (EFFECT_WORDS[a?.effect || 'unknown'] || 'needs evidence') + (str(a?.reason) ? ' — ' + md(a.reason) : '') + assessedBy(a) : 'weighed once an alternative is chosen'); }), {rest: k => 'And ' + plural(k, 'more driver') + ' (Chapter 3 · ' + d.id + ').'});
  const others = alts.filter(a => a !== pick), whyNot = a => (str(a.rejectionReason) ? md(a.rejectionReason) : str(a.costs) ? 'its costs, ' + lowFirst(md(a.costs)) : '');
  // Why an alternative was not chosen is open while a choice gives none: listed in Appendix B, and in format 2 asked of
  // the section instead of "open: why not chosen" beside the alternative. Round 25 (D-25-07): beside such an alternative,
  // AIW's reading of it, labelled as AIW's; it answers nothing, so the question stays open.
  if (pick && others.some(a => !whyNot(a))) O.add(3, 'decision', 'Why an alternative was not chosen', d.id, {words: 'why an alternative was not chosen'});
  const aiw = a => { const t = pick && !whyNot(a) ? alternativeReading(B, r, a) : ''; return t ? ' AIW’s reading: ' + t + '.' : ''; };
  if (others.length) out += '**Alternatives considered**:\n\n' + bullets(others.map(a => { const reading = aiw(a); return a.id + ' · ' + md(a.title) + (str(a.summary) ? ': ' + md(a.summary) : '') + (pick ? (whyNot(a) ? ' Not chosen: ' + whyNot(a) : F1 ? ' Not chosen: open: why not chosen' + (reading ? '.' : '') : '') : str(a.costs) ? ' Costs: ' + md(a.costs) : '') + reading; }), {rest: k => 'And ' + plural(k, 'more alternative') + ' (Chapter 3 · ' + d.id + ').'});
  const impact = O.field(d, 3, 'decision', 'impact', 'impact'), gains = pick ? (str(pick.benefits) ? ' Gains: ' + md(pick.benefits) : '') + (str(pick.costs) ? ' Costs: ' + md(pick.costs) : '') + (str(pick.consequences) ? ' Consequences: ' + md(pick.consequences) : '') : '';
  if (impact.stated || F1) out += '**Impact**: ' + sentence(impact.stated ? md(impact.text) : impact.text) + gains + '\n\n';
  else { opens.push(flagOf('impact', sentence(impact.text) + gains)); if (gains) out += '**Gains and costs of the choice**: ' + gains.trim() + '\n\n'; }
  // Printed when recorded; the fields left open are listed in Appendix B and named once: on one line in format 1, in the
  // section's list in format 2. Each stands for the record fields that state it.
  const stakeholders = list(d.stakeholderIds).map(id => arts.get(id)).filter(Boolean), deps = list(d.dependsOn);
  const opt = [['Stakeholders', stakeholders.length || str(d.stakeholderNote) ? named(stakeholders.map(a => md(a.title) + ' (' + a.id + ')')) + (str(d.stakeholderNote) ? (stakeholders.length ? '; ' : '') + md(d.stakeholderNote) : '') : '', 'stakeholders', ['stakeholderIds', 'stakeholderNote']],
    ['Dependencies', deps.length || str(d.dependencies) ? (deps.length ? 'depends on ' + deps.join(', ') : '') + (str(d.dependencies) ? (deps.length ? '; ' : '') + md(d.dependencies) : '') : '', 'dependencies', ['dependsOn', 'dependencies']],
    ['Licensing', str(d.licensing) ? md(d.licensing) : '', 'licensing', ['licensing']], ['Skills', str(d.skills) ? md(d.skills) : '', 'skills', ['skills']], ['Documentation', str(d.documentation) ? md(d.documentation) : '', 'documentation', ['documentation']]];
  for (const [label, v] of opt) if (v) out += '**' + label + '**: ' + v + '\n\n';
  const open = opt.filter(([, v]) => !v);
  for (const [, , f, fields] of open) O.add(3, 'decision', 'Decision ' + f, d.id, {field: fields, id: d.id, words: f});
  if (open.length && F1) out += 'Open: ' + open.map(([, , f]) => f).join(', ') + ' not stated.\n\n';
  const gs = groupsOf(p, d.requirementGroupIds), reqs = list(d.requirementIds).filter(id => I.reqById.has(id));
  if (gs.length || reqs.length || served.length || F1) out += '**Answers**: ' + [gs.length ? 'requirement groups ' + named(gs.map(g => groupLabel(p, g)), 6) : '', reqs.length ? plural(reqs.length, 'requirement') + (gs.length ? ' named directly' : '') + ' (' + refList(reqs) + ')' : '', served.length ? 'drivers ' + served.map(dr => codeOf(p, dr.id)).join(', ') : ''].filter(Boolean).join('; ') + (gs.length || reqs.length || served.length ? '.' : 'no requirement or driver is linked yet.') + '\n\n';
  return '### ' + d.id + ' · ' + md(d.question) + '\n\n' + markerOf(B, opens) + out;
}
// The trade-off analysis (SDD-SPEC section 3: for each decision compared on weighted drivers, "the criteria, the result
// and the sensitivity"; round 25, D-25-05 to D-25-07 and D-25-09): the reading's arithmetic, shown so that a reader can
// check it, for each live decision that compares two alternatives or more on the drivers it names, in the order section 3
// prints them. Its criteria with their weights (a constraint marked hard or soft), the drivers the weights leave out
// because no priority is stated and the links to drivers no longer recorded; whose the effects are where no person has
// reviewed them (Sol's assessment, or drafted by AIW's rules from the SA Playbook); a table of the alternatives with each
// total (with its range where effects are not stated), its effects and its standing; then the result and how firmly the
// lead holds, and one line each for what else the reading says (an alternative ruled out or dominated, why a constraint
// binds, the effects not stated that could change the lead, where the leader and the runner-up pull apart, the
// sensitivity points, where the working choice stands), in the reading's own sentences (readingLines). A decision whose
// drivers weigh nothing, or whose weighed effects are not stated yet, is named as such.
const EFFECT_MARKS = {supports: '+', tension: '−', neutral: '0', violates: 'breaks', unknown: '?'};
const DRAFT_MARKS = [[solAssessed, 'Sol’s assessment', 'Sol’s assessments'], [rulesAssessed, 'drafted by AIW’s rules from the SA Playbook', 'drafted by AIW’s rules from the SA Playbook']];
const READ_ALONE = ['lead', 'firmness', 'left-out', 'missing'];
function tradeoffs(B) {
  const {p} = B, read = decisionOrder(p, list(p.decisions?.records)).filter(d => list(d.alternatives).length > 1).map(d => ({d, r: readingOf(p, d)})).filter(x => x.r?.drivers.length);
  const shown = read.filter(x => SPOKEN.includes(x.r.state)), unweighed = read.filter(x => x.r.state === 'unweighed'), unjudged = read.filter(x => x.r.state === 'unjudged');
  const waiting = (unweighed.length ? plural(unweighed.length, 'decision') + ' ' + (unweighed.length === 1 ? 'weighs' : 'weigh') + ' nothing yet: no driver ' + (unweighed.length === 1 ? 'it names' : 'they name') + ' has a stated priority (' + refList(unweighed.map(x => x.d.id)) + '; the priorities are set in Chapter 2 · Work).\n\n' : '')
    + (unjudged.length ? plural(unjudged.length, 'decision') + ' compare' + (unjudged.length === 1 ? 's' : '') + ' alternatives whose effect on a weighed driver is not stated yet: ' + refList(unjudged.map(x => x.d.id)) + ' (Chapter 3 · Model · Trade-offs).\n\n' : '');
  if (!shown.length) return waiting || none('no decision compares two alternatives on weighted drivers', 'Chapter 3 · Model · Trade-offs');
  let out = 'Each alternative is weighed on the drivers its decision names, at the default weights (' + DEFAULT_WEIGHTS + '): its total adds each driver’s weight times its effect on that driver, +1 where it supports the driver, −1 where it is in tension with it, 0 where it has little direct effect and 0 where no effect is stated; where effects are not stated, the total is given with its range, those effects read at their worst and at their best. A driver with no stated priority weighs nothing and is named. An alternative that breaks a hard constraint is ruled out (a constraint is hard unless every constraint record its driver links is a Should or a Could; breaking a soft one counts as tension); one that another alternative is at least as good as on every driver, and better on one, is dominated. A sensitivity point is a driver whose priority, moved one step, changes which alternative leads. In the effects column + is support, − tension, 0 little direct effect, ? not stated and “breaks” a constraint broken. The arithmetic is shown so that a reader can check it. ' + READING_NOTE + '\n\n';
  for (const {d, r} of shown) out += tradeoffOf(B, d, r);
  return out + waiting;
}
function tradeoffOf(B, d, r) {
  const code = id => codeOf(B.p, id), lines = readingLines(r, {driver: code}), say = kind => lines.filter(l => l.kind === kind).map(l => l.text);
  // The criteria: each weighed driver with its weight, and a hard constraint that weighs nothing, which binds all the same.
  const criteria = r.drivers.filter(x => x.weight || x.hard).map(x => code(x.id) + (x.weight ? ' ×' + x.weight : '') + (x.kind === 'constraint' ? (x.hard ? ' (hard constraint)' : ' (soft constraint)') : ''));
  let out = '**' + d.id + ' · ' + md(clip(d.question, 140)) + '**\n\n';
  out += 'Criteria: ' + (criteria.length ? criteria.join(', ') : 'none weighed') + '.' + [...say('left-out'), ...say('missing')].map(t => ' ' + t).join('') + draftedEffects(B, r) + '\n\n';
  const standingOf = row => [row.out ? 'ruled out: breaks ' + andList(row.breaks.map(code)) : r.state === 'only' ? (row.unshown.length ? 'the only one not ruled out' : 'the only one that meets the hard constraints') : r.lead === row.id ? 'leads' : r.tied.includes(row.id) ? 'tied' : row.rank + ' of ' + r.order.length,
    !row.out && row.unshown.length ? 'not shown to meet ' + andList(row.unshown.map(code)) : '', row.dominated ? 'dominated by ' + row.dominated.by + (row.dominated.robust ? '' : ' as the effects stand') : '', row.id === d.selectedAlternativeId ? (d.status === 'accepted' ? 'chosen' : 'working choice') : ''].filter(Boolean).join('; ');
  out += table(['Alternative', 'Total', 'Effects', 'Standing'], r.rows.map(row => [row.id + ' · ' + mdCell(clip(row.alt?.title, 70)), signed(row.score) + (row.low !== row.high ? ' (' + signed(row.low) + ' to ' + signed(row.high) + ')' : ''), row.parts.map(q => code(q.driverId) + ' ' + EFFECT_MARKS[q.effect]).join(', ') || '—', standingOf(row)]));
  // The result and how firmly it holds, then the rest of the reading in its own order (the reading names an accepted
  // decision's choice the chosen alternative).
  const sensitivity = say('sensitivity');
  out += 'Result: ' + [...say('lead'), ...say('firmness')].join(' ') + (r.state === 'read' && !sensitivity.length ? ' Sensitivity: none within one priority step.' : '') + '\n\n';
  return out + bullets(lines.filter(l => !READ_ALONE.includes(l.kind)).map(l => l.text), {rest: k => 'And ' + more(k) + ' (Chapter 3 · Model · Trade-offs · ' + d.id + ').'});
}
// Whose the effects are where no person has reviewed them (D-25-09): Sol's assessment, or drafted by AIW's rules from the
// SA Playbook's marks, each kept so until a person sends the assessment again. Every stated effect one's: one sentence;
// else the alternatives and drivers it covers.
function draftedEffects(B, r) {
  const stated = r.rows.flatMap(row => row.parts.filter(q => q.effect !== 'unknown').map(q => ({id: row.id, driver: codeOf(B.p, q.driverId), v: row.alt?.assessments?.[q.driverId]})));
  let out = '';
  for (const [is, one, all] of DRAFT_MARKS) {
    const xs = stated.filter(x => is(x.v));
    if (!xs.length) continue;
    if (xs.length === stated.length) { out += ' The effects are ' + all + ', not reviewed by a person.'; continue; }
    const by = new Map();
    for (const x of xs) by.set(x.id, [...(by.get(x.id) || []), x.driver]);
    out += ' ' + upFirst(one) + ', not reviewed by a person: ' + named([...by].map(([id, ds]) => id + ' on ' + andList(ds))) + '.';
  }
  return out;
}

// ---------------------------------------------------------------- 4. Components, interfaces, properties, composition
// Each component prints its high-level line (its kind, purpose, responsibilities and the drivers it serves), its row in
// the specification table and its detail; then the quality-driver interactions, the external integrations, the data
// invariants and the batch chain. Round 24 (D-24-03): format 2 reads a project with modules by module
// (componentsByModule); the content reader (sdd-content.js) reads either layout the same.
function components(B) {
  const {p} = B, I = designIndex(p), comps = I.comps;
  let out = '# 4. Architectural components, interfaces, properties and composition\n\n';
  if (!comps.length) return out + none('no application component', 'Chapter 5 · Work') + executionSection(B) + enterpriseSection(B);
  const R = reasoningFor(p), specs = comps.map(c => componentSpec(R, c.id)).filter(Boolean);
  // Each component's specification once, and the components that own, consume or produce each data definition, for the
  // data coupling of the component detail (read once here, not once per pair of components).
  B.specById = new Map(specs.map(S => [S.id, S])); B.dataUsers = new Map();
  for (const S of specs) for (const id of new Set([...S.data.owned, ...S.data.consumed, ...S.data.produced].map(d => d.id))) { if (!B.dataUsers.has(id)) B.dataUsers.set(id, new Set()); B.dataUsers.get(id).add(S.id); }
  out += 'Status: ' + standing(p, comps) + '\n\n';
  // The styles and patterns: of the chosen alternatives, and of the components themselves.
  const styles = new Map(), add = (name, where) => { const k = str(name); if (!k) return; if (!styles.has(k)) styles.set(k, []); if (!styles.get(k).includes(where)) styles.get(k).push(where); };
  for (const d of list(p.decisions?.records)) { const c = chosen(d); if (c?.pattern) add(c.pattern, d.id); }
  for (const S of specs) for (const x of S.patterns) add(x.name, S.ref);
  out += styles.size ? 'The architectural styles and patterns the design uses, each with where it applies:\n\n' + bullets([...styles].map(([k, w]) => md(k) + ': ' + refList(w, 6)), {rest: k => 'And ' + plural(k, 'more pattern') + ' (Chapters 3 and 5).'}) : none('no chosen alternative or component names an architectural style or pattern', 'Chapters 3 and 5');
  B.capabilities = new Set(specs.flatMap(S => S.technologies.map(t => t.capability.id))).size;
  if (B.L) return out + componentsByModule(B, specs);
  // High-level description: the responsibility groups, then each component numbered, as a paragraph.
  out += '## High-level component description\n\n' + responsibilityGroups(B, list(p.logical?.groups));
  B.totals = {...B.totals, component: specs.length, capability: B.capabilities}; B.kindOpen = new Set();
  specs.forEach((S, i) => { out += highLevelLine(B, S, i + 1); });
  out += '## Component specification table\n\n' + specTable(B, specs);
  out += '## Component detail\n\n';
  for (const S of specs) out += componentDetail(B, S);
  out += '## Quality-driver-focused interactions\n\n' + qualityInteractions(B);
  out += '## External integrations\n\n' + integrations(B);
  out += invariantsSection(B) + batchSection(B) + executionSection(B) + enterpriseSection(B) + acceptedObligationsSection(B, specs);
  return out + openQuestions(B, 4);
}
// A current reading of the saved agreements; acceptance supplies no implementation evidence.
function executionSection({p}) {
  const contracts=list(p.interfaces?.contracts).filter(c=>c.execution);if(!contracts.length)return '';
  const method=executionMethodSource(p),ref=id=>md(recordRef(p,id)||'not named'),words=v=>md((v||'not stated').replaceAll('-',' '));
  let out='## Execution agreements and authoritative outcomes\n\nCurrent declarations are assessed in their saved operating scope. Implementation and outcome verification remain pending.\n\n';
  out+=method?'Method: '+md(method.receipt.packId)+' · version '+method.receipt.version+'. Inspected sources: '+refList(method.receipt.sourceIds)+'.\n\n':'The composition method is unavailable or withdrawn; no consistency reading is asserted.\n\n';
  for(const c of contracts.slice(0,LIST_MAX)){
    const a=c.execution,ctx=contractExecutionContext(p,c),r=method&&assessContractExecution(c,ctx),target=ctx.outcome?.contract;
    out+='**'+ref(c.id)+' · '+md(c.title)+'**\n\n';
    out+='Scope: environment '+ref(a.environmentId)+'; submission path '+ref(ctx.path?.id)+'.';
    if(ctx.outcome)out+=' Result contract '+ref(a.outcomeContractId)+(target?' · '+md(target.title):'')+'; result path '+ref(ctx.outcome.path?.id)+'; authority '+ref(a.outcomeAuthorityId)+'.';
    out+='\n\nDeclared completion: '+words(a.completion)+'; discovery: '+words(a.discovery)+'.';
    if(ctx.outcome)out+=' Result meaning: '+words(a.outcomeMeaning)+'; correlation: '+words(a.outcomeCorrelation)+'; result field: '+md(a.outcomeResultKey||'not stated')+'. Result dictionaries: '+refList((ctx.outcome.resultData||[]).filter(Boolean).map(refOf))+'.';
    if(ctx.outcome?.read){const read=ctx.outcome.read;out+='\n\nResult read: '+md(read.task?.id||a.outcomeReadTaskId||'not named')+(read.task?' · '+md(read.task.title):'')+'; accepted approach '+md(read.solution?.mechanism?.pattern||'not available')+'. Required freshness: '+words(a.outcomeFreshness)+(a.outcomeFreshness==='bounded'?'; maximum source age '+md(a.outcomeMaxAgeSeconds??'not stated')+' seconds':'')+'. Read design support: '+(read.current?'current declarations; verification remains separate':'review required')+'.';}
    out+='\n\n';
    if(r){out+='Current reading: '+({'context-match':'consistent declarations; implementation unverified','needs-context':'unknown — required declarations are missing',excluded:'conflict — declared mechanisms do not compose'}[r.state])+'.\n\n';
      out+=bullets([...r.blockers,...r.unknown].map(x=>ref(x.target?.objectId||x.source?.id||c.id)+' · '+md(x.target?.fieldKey||x.source?.field||x.fact)+': '+md(x.detail)),{rest:n=>more(n)+' further questions in Chapter 8 · Work.'});
      out+='Pending verification:\n\n'+bullets(r.obligations.map(o=>md(o.action)+' '+md(o.evidence)),{rest:n=>more(n)+' further obligations in Chapter 8 · Work.'});
    }
  }
  const journeys=[...new Map(contracts.map(c=>executionJourney(p,c.id)).filter(Boolean).map(j=>[j.id,j])).values()];
  if(journeys.length){
   out+='## Linked execution journeys\n\nOnly explicitly declared waiting and result links are composed. These are bounded checks of saved declarations; implementation timing, cancellation and business completion require verification.\n\n';
   const journeyMethod=executionMethodSource(p,{journey:true});
   out+=journeyMethod?'Method: '+md(journeyMethod.receipt.packId)+' · version '+journeyMethod.receipt.version+'.\n\n':'The journey method is unavailable or withdrawn; no consistency reading is asserted.\n\n';
   for(const j of journeys.slice(0,LIST_MAX)){
    out+='### '+md(j.id)+'\n\nContracts: '+refList(j.scope.contractIds)+'. Environments: '+refList(j.scope.environmentIds)+'. Runtime paths: '+refList(j.scope.pathIds)+'.\n\n';
    if(j.scope.omittedContractIds?.length)out+='Bounded traversal omitted '+refList(j.scope.omittedContractIds)+'. The full journey remains unassessed.\n\n';
    if(journeyMethod){out+=bullets(j.calculations.map(c=>md(c.statement)));out+=bullets([...j.blockers,...j.unknown].map(c=>ref(c.target?.objectId)+' · '+md(c.target?.fieldKey||c.fact)+': '+md(c.detail)));out+='Pending verification:\n\n'+bullets(j.obligations.map(o=>md(o.action)+' '+md(o.evidence)));}
   }
  }
  return out+(contracts.length>LIST_MAX?more(contracts.length-LIST_MAX)+' further execution agreements in Chapter 8 · Output.\n\n':'');
}
function enterpriseSection({p}) {
 const rows=enterpriseReferences(p);if(!rows.length)return '';
 return '## Shared enterprise dependencies\n\nEach dependency names a shared organisation identity, a reviewed release and an authored consumer. This is declared architecture; no live service health, connection or reserved capacity is inferred. Cross-project impact includes only projects the reader can access.\n\n'+table(['Shared service and identity','Consumer and environment','Relied-on contract','Source state'],rows.map(r=>[mdCell(r.title+' · '+r.identity+' · '+r.releaseId),mdCell(r.targetId+(r.environmentId?' · '+r.environmentId:' · design scope')+(r.critical?' · critical dependency':'')),mdCell((r.expectedVersion?'Version '+r.expectedVersion+'. ':'')+r.contract+' Scope: '+r.scope),mdCell(r.state+(r.reasons.length?'. '+r.reasons.join(' '):''))]));
}

// The main SDD reads the same accepted duties and current evidence as the
// component specification and delivery actions. A scoped export uses only its
// remaining component targets, while the accepted receipt stays unchanged.
function acceptedObligationsSection({p}, specs) {
  const rows=architectureObligationsFor(p,specs.map(s=>s.id));if(!rows.length)return '';
  const groups=new Map();for(const row of rows){if(!groups.has(row.taskId))groups.set(row.taskId,[]);groups.get(row.taskId).push(row);}
  let out='## Accepted architecture obligations\n\nThese duties follow the reviewed design into implementation. Verification states describe architect-recorded evidence; AIW has not independently tested the implementation.\n\n';
  for(const [taskId,items] of [...groups].slice(0,LIST_MAX)){
    const task=list(p.coauthoring?.designTasks).find(t=>t.id===taskId),solution=task?.applied?.reasoningGraph?.solution;
    out+='### '+md(taskId)+' · '+md(solution?.mechanism?.pattern||task?.title||'Accepted design')+'\n\n';
    out+='Decision: '+md(solution?.decisionId||'not named')+'. Requirements: '+refList(list(solution?.requirementIds))+'. Drivers: '+refList(list(solution?.driverIds))+'. Source support: '+(task&&designBasisCurrent(p,task)?'current declarations':'review required')+'.\n\n';
    out+=bullets(items.map(o=>md(o.id)+' · '+md(o.action)+'. Applies to '+refList(list(o.targetIds).map(id=>recordRef(p,id)||id))+'. Verification: '+md(OBLIGATION_STATES[o.verificationState]||'Open obligation')+'. Evidence required: '+md(o.evidence||'Define verification with the accountable owner.')+(o.verificationReasons.length?' Review: '+o.verificationReasons.map(md).join('; ')+'.':'')+(o.evidenceRefs.length?' Recorded evidence: '+o.evidenceRefs.map(e=>md(e.actionId+' · '+e.reference+' · '+e.reviewer)).join('; ')+'.':'')),{rest:n=>more(n)+' further duties in the linked component specifications and Chapter 11 delivery actions.'});
  }
  return out+(groups.size>LIST_MAX?more(groups.size-LIST_MAX)+' further accepted designs in component specifications.\n\n':'')+verificationSection(p,list(p.finalReview?.actions).filter(a=>list(a.objectIds).some(id=>specs.some(s=>s.id===id))));
}
function verificationSection(p,actions){
 const checks=actions.filter(a=>a.verificationContract);if(!checks.length)return '';
 let out='## Expected checks and observed evidence\n\nThese authored checks compare supplied observations with explicit thresholds. AIW does not execute tests or a delivery gate. Evidence review and architecture approval remain separate.\n\n';
 for(const a of checks){const context=verificationContext(p,a),c=a.verificationContract,comparison=verificationForAction(p,a),environment=list(p.runtime?.environments).find(e=>e.id===c.environmentId);
  out+='### '+md(a.id+' · '+c.metric)+'\n\nExpected: '+md(VERIFICATION_OPERATORS[c.operator]||c.operator)+' '+md(String(c.expected))+(c.unit?' '+md(c.unit):'')+'. Environment: '+md((environment?.title||c.environmentId)+' ('+c.environmentId+')')+'. Release: '+md(c.release)+'.\n\nProcedure: '+md(c.procedure)+'. Objects: '+refList(list(a.objectIds))+'. Requirements: '+refList(context.receipt?.requirementIds||[]) +'. Current check basis: '+(context.ready?'available':'review required — '+md(context.reason))+'. Comparison: '+md(comparison.label)+'. Delivery review: '+md(a.status)+'.\n\n';
  out+=comparison.records.length?table(['Observation','Observed value','Unit','Comparison','Original source','Observation review'],comparison.records.map(r=>[md(r.id),md(r.observed===null?'Not observed':String(r.observed)),md(r.observedUnit)||'—',md(r.label),md(r.sourceId||'Not attached'),r.reviewed?'Recorded':'Not recorded'])):'No observation is linked to this check.\n\n';
 }
 return out;
}
// A component's line in the high-level description: its kind in brackets after its name (service, worker, adapter,
// queue, store, module, UI or channel; the content standard asks for it beside the responsibilities and the drivers,
// SDD-SPEC; not stated is open, once), its purpose, the responsibilities it realises or supports and its drivers.
// Format 1 prints every part, an open one as its marker. Format 2 prints what is stated, each part under its own label
// (sdd-content.js reads them), and nothing for what is not: no responsibility realised and no driver reaching it are
// what the content reading counts, not lines to print.
function highLevelLine(B, S, n) {
  const {O} = B, realised = S.realised.filter(x => x.role !== 'supports').map(x => refOf(x.responsibility) + ' ' + md(x.responsibility.title)), supported = S.realised.filter(x => x.role === 'supports').map(x => refOf(x.responsibility));
  const drv = componentDrivers(B, S), kind = str(S.component?.kind), stated = !!kind && kind !== 'not-stated', kindWord = stated ? componentKindName(kind).replace(/^(?!UI)(.)/, c => c.toLowerCase()) : 'kind not stated';
  if (!stated) { O.add(5, 'component', 'Kind of a component', S.ref, {field: 'kind', id: S.id, words: 'kind'}); B.kindOpen.add(S.id); }
  if (B.format < 2) return '**' + n + '. ' + S.ref + ' · ' + md(S.title) + '** (' + kindWord + '): ' + (str(S.purpose) ? md(S.purpose) + ' ' : '') + 'Responsibilities: ' + (realised.length ? named(realised) : 'none realised yet') + (supported.length ? '; supports ' + refList(supported) : '') + '. Drivers: ' + (drv.length ? named(drv.map(x => x.text)) : 'none reaches it through its responsibilities or requirements yet') + '.\n\n';
  const parts = [str(S.purpose) ? md(S.purpose) : '', realised.length ? 'Responsibilities: ' + named(realised) + (supported.length ? '; supports ' + refList(supported) : '') + '.' : supported.length ? 'Supported responsibilities: ' + refList(supported) + '.' : '', driversPart(B, S, drv)].filter(Boolean);
  return '**' + n + '. ' + S.ref + ' · ' + md(S.title) + '**' + (stated ? ' (' + kindWord + ')' : '') + (parts.length ? ': ' + parts.join(' ') : '.') + '\n\n';
}
// The drivers a component serves (realisation-domain.js serves; round 24, D-24-05), each once and with why it serves it.
function servedDrivers(B, S) {
  const I = designIndex(B.p), seen = new Set();
  return list(S.component?.serves).map(s => ({driver: I.driverById.get(s?.driverId), reason: str(s?.reason)})).filter(x => x.driver && !seen.has(x.driver.id) && seen.add(x.driver.id));
}
const because = t => lowFirst(md(t)).replace(/^because\s+/i, '').replace(/[.]$/, '');
// Format 2: "Serves: FD1 Deposit Accounts, because it keeps the work on time; …", the drivers the component names with
// their reasons; a component that names none says how many drivers reach it through its responsibilities and the
// requirements it realises, not the list (the specification table names their codes).
function driversPart(B, S, drv) {
  const served = servedDrivers(B, S);
  if (served.length) return 'Serves: ' + served.map(x => codeOf(B.p, x.driver.id) + ' ' + md(clip(x.driver.title, 80)) + (x.reason ? ', because ' + because(x.reason) : '')).join('; ') + '.';
  if (!drv.length) return '';
  const resp = drv.some(x => x.via === 'responsibility'), reqs = drv.some(x => x.via === 'requirements');
  return 'Drivers: ' + count(drv.length) + ' reach' + (drv.length === 1 ? 'es' : '') + ' it through ' + (resp && reqs ? 'its responsibilities and the requirements it realises' : resp ? 'its responsibilities' : 'the requirements it realises') + '.';
}
// The drivers that bear on a component, each once: those it serves (format 1 prints them in its driver list, so that
// both formats read a driver where format 2 prints one), then those through a responsibility it realises
// (componentSpec), then those through the requirements it realises (a driver that links them or their group), most
// requirements first.
function componentDrivers(B, S) {
  const {p} = B, I = designIndex(p), seen = new Set(), out = [];
  for (const x of servedDrivers(B, S)) { seen.add(x.driver.id); out.push({id: x.driver.id, via: 'served', text: codeOf(p, x.driver.id) + ' (served)'}); }
  for (const d of S.drivers) { if (seen.has(d.id)) continue; seen.add(d.id); const via = S.responsibilities.find(r => list(d.responsibilityIds).includes(r.id)); out.push({id: d.id, via: 'responsibility', text: codeOf(p, d.id) + (via ? ' (through ' + refOf(via) + ')' : '')}); }
  for (const x of I.driversOfComp.get(S.id) || []) { if (seen.has(x.id)) continue; seen.add(x.id); out.push({id: x.id, via: 'requirements', text: codeOf(p, x.id) + ' (through ' + plural(x.n, 'requirement') + ' it realises)'}); }
  return out;
}
const cellDrivers = xs => (xs.length ? xs.slice(0, 8).map(x => x.text.split(' ')[0]).join(', ') + (xs.length > 8 ? ' and ' + more(xs.length - 8) : '') : '—');
// A capability a component stands on with no product named (Chapter 7 names one): listed once in Appendix B and, in
// format 2, asked once of the section, whichever module prints the component (round 24: not "no product yet" beside
// each capability of each component).
function productOpen(B, cap) {
  const ref = refOf(cap);
  B.O.add(7, 'capability', 'Product not named for a capability', ref, {where: 'Chapter 7 · Work'});
  B.O.ask(ref, 'capability', 'product', '', '');
  return '';
}
// The specification table, landscape in Word and PDF: one row per component, in the order given. By module, each row's
// open fields are asked of the module that prints the component (homeOf).
function specTable(B, specs, homeOf = null) {
  const {O} = B, F1 = B.format < 2, cell = (xs, max = 6) => (xs.length ? xs.slice(0, max).join('; ') + (xs.length > max ? '; and ' + (xs.length - max) + ' more' : '') : '—');
  const rows = specs.map(S => {
    if (homeOf) O.module = homeOf(S.id);
    const sol = O.field(S.component, 5, 'component', 'architecturalSolution', 'architectural solution', {short: 'open'});
    // A capability's product where one is named; format 2 prints the capability alone where none is.
    const tech = S.technologies.map(t => mdCell(refOf(t.capability) + (t.product ? ' ' + t.product + ' (' + (t.selected && t.realisation ? selectionLabel(B.p, t.realisation) : 'Candidate option') + ')' : productOpen(B, t.capability) + (F1 ? ' (no product yet)' : ''))));
    return [S.ref + ' · ' + mdCell(S.title), cell(S.realised.map(x => refOf(x.responsibility) + (x.role === 'supports' ? ' (supports)' : ''))), cell(S.properties.map(x => mdCell(x.concernName + ': ' + x.statement))), cell(tech), cell(S.interfaces.map(f => f.ref + (f.operation ? ' ' + mdCell(f.operation) : ''))), cell(S.dependencies.map(x => refOf(x.other.record) + (x.type ? ' (' + mdCell(x.type) + ')' : ''))), sol.stated ? mdCell(clip(sol.text, 200)) : F1 ? sol.text : '—', cellDrivers(componentDrivers(B, S))];
  });
  if (homeOf) O.module = '';
  return '<!-- aiw:landscape -->\n' + table(['Component', 'Responsibilities', 'Properties', 'Technologies', 'Interfaces', 'Dependencies', 'Architectural solution', 'Architectural drivers'], rows) + '<!-- aiw:/landscape -->\n\n';
}
// A component's detail, under a heading of the level given (3, or 4 inside a module's part). Format 2 prints a line only
// for what is recorded: no "no … yet" line for an empty part, and the kind and container it leaves open in the
// section's list (the kind on its marker too, for the content reading); by module, a component several modules hold
// names the others ("Shared with …").
function componentDetail(B, S, {level = 3, shared = []} = {}) {
  const {p, O} = B, I = designIndex(p), key = f => (f || []).filter(x => x?.key).map(x => x.name), F1 = B.format < 2;
  let out = '#'.repeat(level) + ' ' + S.ref + ' · ' + md(S.title) + '\n\n' + markerOf(B, B.kindOpen?.has(S.id) ? ['kind'] : []);
  if (shared.length) out += 'Shared with ' + andList(shared.map(g => moduleRef(g)), LIST_MAX) + '.\n\n';
  const k = S.container;
  if (k || F1) out += 'Runs in: ' + (k ? (k.ref || k.id) + (k.title ? ' ' + md(k.title) : '') + (k.derived ? ' (derived from its compute need)' : '') : 'open: container not stated') + '.\n\n';
  if (!k) O.add(5, 'component', 'Container a component runs in', S.ref, {words: 'container'});
  const provides = S.interfaces.length ? 'provides ' + named(S.interfaces.map(f => f.ref + (f.operation ? ' ' + md(f.operation) : '') + (f.payloads.length ? ' (' + f.payloads.slice(0, 4).map(md).join(', ') + ')' : ''))) : F1 ? 'provides no contract yet' : '', uses = S.uses.length ? 'uses ' + named(S.uses.map(f => refOf(f.contract) + ' ' + md(clip(f.contract.title, 50)))) : '';
  if (provides || uses) out += 'Interfaces: ' + [provides, uses].filter(Boolean).join('; ') + '.\n\n';
  const data = (xs, word) => (xs.length ? word + ' ' + named(xs.map(d => refOf(d) + ' ' + md(d.title) + (key(d.fields).length ? ' (key ' + key(d.fields).slice(0, 3).map(md).join(', ') + ')' : ''))) : '');
  const owned = [data(S.data.owned, 'owns'), data(S.data.consumed, 'consumes'), data(S.data.produced, 'produces')].filter(Boolean).join('; ');
  if (owned || F1) out += 'Data model: ' + (owned || 'no data definition is owned, consumed or produced by it yet') + '.\n\n';
  // Round 12 (GR-SDD-28, GR-DAT-04): the invariants that bind its data or govern its contracts (each printed once, under
  // Data invariants), and the lifecycle of each definition it owns with what moves each transition: a contract, or time.
  if (list(S.invariants).length) out += 'Invariants: ' + named(S.invariants.map(r => refOf(r) + ' ' + md(clip(r.title, 60)))) + ' (Data invariants, below).\n\n';
  const cycles = S.data.owned.filter(d => list(d.lifecycle?.transitions).length);
  if (cycles.length) out += 'Lifecycles: ' + named(cycles.map(d => { const ts = list(d.lifecycle.transitions); return refOf(d) + ' on ' + md(d.lifecycle.field || 'its state') + ': ' + ts.slice(0, 6).map(t => md(t.from) + ' → ' + md(t.to) + ' ' + md(transitionText(p, t))).join(', ') + (ts.length > 6 ? ' and ' + more(ts.length - 6) : ''); })) + '.\n\n';
  // Coupling: data shared with other components, and the interactions that make one call another.
  const mine = new Set([...S.data.owned, ...S.data.consumed, ...S.data.produced].map(d => d.id)), others = [];
  const near = new Set(); for (const id of mine) for (const x of B.dataUsers.get(id) || []) near.add(x);
  for (const c of I.comps) { if (c.id === S.id || !near.has(c.id)) continue; const T = B.specById.get(c.id), shared_ = [...T.data.owned, ...T.data.consumed, ...T.data.produced].filter(d => mine.has(d.id)); if (shared_.length) { const ids = [...new Set(shared_.map(d => refOf(d)))]; others.push(T.ref + ' (' + (ids.length > 3 ? plural(ids.length, 'definition') + ': ' + refList(ids, 3) : ids.join(', ')) + ')'); } }
  const calls = S.interactions.length ? named(S.interactions.map(x => (x.direction === 'out' ? 'calls ' : 'called by ') + refOf(x.other.record) + (str(x.interaction.interaction) ? ' (' + md(x.interaction.interaction) + ')' : ''))) : '';
  if (F1) out += 'Coupling: data coupling ' + (others.length ? 'with ' + named(others) : 'with no other component') + '; control coupling through ' + (calls || 'no interaction') + '.\n\n';
  else if (others.length || calls) out += 'Coupling: ' + [others.length ? 'data coupling with ' + named(others) : '', calls ? 'control coupling through ' + calls : ''].filter(Boolean).join('; ') + '.\n\n';
  const bare = t => md(t).replace(/[.]$/, '');
  if (S.properties.length || F1) out += 'Quality properties: ' + (S.properties.length ? named(S.properties.map(x => md(x.concernName) + ': ' + bare(x.statement) + (str(x.mechanism) ? ' (' + lowFirst(bare(x.mechanism)) + ')' : ''))) : 'none recorded') + '.\n\n';
  // rc39 (PLAN §4.4): the design basis, each decided question's story as one sentence, and the open ones listed as such,
  // so the document never implies a decision that is not recorded (a draft answer is said to be a draft).
  const DQ = designQuestions(p, S.id);
  if (DQ) {
    const decided = DQ.questions.filter(q => q.state === 'decided'), open = DQ.questions.filter(q => q.state !== 'decided');
    const codes = text => String(text).replace(/\bQD-\d{3}\b/g, id => codeOf(p, id));
    if (decided.length) out += 'Design basis: ' + decided.map(q => md(codes(q.story))).join(' ') + '\n\n';
    if (open.length) out += 'Open design questions: ' + named(open.map(q => md(q.title) + ' (' + q.because.map(id => codeOf(p, id)).join(', ') + (q.state === 'draft' ? '; a draft answer is recorded' : '') + ')')) + '.\n\n';
  }
  // Requirements (GR-SDD-13, GR-CMP-08): those of the responsibilities it realises, by group with their delivery status.
  const R = I.reqsOfComp.get(S.id) || {realises: [], supports: []};
  if (R.realises.length || F1) out += 'Requirements: ' + requirementsLine(p, S, R.realises) + (R.supports.length ? ' It also supports ' + plural(R.supports.length, 'requirement') + ' it does not realise.' : '') + '\n\n';
  else if (R.supports.length) out += 'Requirements: it supports ' + plural(R.supports.length, 'requirement') + ' it does not realise.\n\n';
  const threats = S.threats.length ? 'threats ' + named(S.threats.map(t => refOf(t) + ' ' + md(clip(t.title, 60)) + (t.priority ? ' (' + t.priority + ')' : ''))) : '';
  if (F1) out += 'Protection: ' + (S.controls.length ? 'controls ' + named(S.controls.map(c => refOf(c) + ' ' + md(clip(c.title, 60)) + controlFacts(B, c))) : 'no control protects it yet') + (threats ? '; ' + threats : '') + '.\n\n';
  else if (S.controls.length || threats) out += 'Protection: ' + [S.controls.length ? 'controls ' + named(S.controls.map(c => refOf(c) + ' ' + md(clip(c.title, 60)) + controlFacts(B, c))) : '', threats].filter(Boolean).join('; ') + '.\n\n';
  // The capabilities it stands on with their products: format 2 names a product where one is named, under
  // "Technologies", and the section's open questions name the capabilities that have none, once (round 24).
  if (S.technologies.length || F1) out += (F1 ? 'Products: ' : 'Technologies: ') + (S.technologies.length ? named(S.technologies.map(t => techLine(B, S, t))) : 'no technology need is recorded yet') + '.\n\n';
  if (S.plans.length || F1) out += 'Placement: ' + (S.plans.length ? named(S.plans.map(f => refOf(f.plan) + ': ' + (f.placements.length ? plural(f.placements.length, 'placement') + ', ' + plural(f.active, 'active copy', 'active copies') + (f.standby ? ', ' + plural(f.standby, 'standby copy', 'standby copies') : '') : 'not placed yet') + (restsOn(B, f.plan) ? '; ' + restsOn(B, f.plan) : ''))) : 'no runtime plan runs it yet') + '.\n\n';
  const starts = startupNeeds(B, S);
  if (starts.length) out += 'At start-up it needs: ' + named(starts) + '.\n\n';
  return out;
}

// ---------------------------------------------------------------- 4 by module (round 24, D-24-03; format 2)
// The module overview (one row per module: its role, sub-modules, requirements, components and open questions) and the
// specification table, its rows in the order the components print; then the business modules and the platform modules
// as parts of their own, each module with what it is (its role, requirements and sub-modules; a platform module what it
// serves), its purpose (the Chapter 4 group that realises it, else its own description), the modules it uses and is used
// by (the Chapter 8 contracts between their components), its components in full (high-level line and detail), the
// components it shares named by reference ("Also part of this module: …"), the interfaces and data that touch its
// components, the integrations, invariants and batch chain that belong to it alone, and its own open questions; then the
// records in no module (components, responsibility groups, integrations, invariants or a batch chain that neither
// recordModules nor recordAttachments places), and the parts several modules share (the quality-driver interactions,
// the integrations, invariants and batch chain of several modules) with the section's open questions. Each record prints
// in full once, under its home (moduleLayout); membership is read only through module-scope.js.
function componentsByModule(B, specs) {
  const {p, O, L} = B, I = designIndex(p), order = [...L.business, ...L.platforms], ids = order.map(m => m.group.id);
  const push = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
  // The components each module prints in full (by home), in print order, and those each module holds (home or shared).
  const home = new Map(), holds = new Map(), loose = [];
  for (const S of specs) { const h = L.homeOf(S.id); if (h) push(home, h, S); else loose.push(S); for (const m of L.modulesOf(S.id)) push(holds, m, S); }
  const ordered = [...ids.flatMap(id => home.get(id) || []), ...loose], number = new Map(ordered.map((S, i) => [S.id, i + 1]));
  // The Chapter 4 groups, the integrations, the invariants and the batch chain, by module where they belong to one.
  const groups = new Map(), looseGroups = [];
  for (const g of list(p.logical?.groups)) { const h = L.homeOf(g.id); if (h) push(groups, h, g); else looseGroups.push(g); }
  const parties = partyIntegrations(p).filter(Boolean), partiesOf = new Map(), sharedParties = [], looseParties = [];
  for (const x of parties) { const ms = L.modulesOf(x.id); if (ms.length === 1) push(partiesOf, ms[0], x); else (ms.length ? sharedParties : looseParties).push(x); }
  // An invariant is no record of the module chain: it belongs where all the data and contracts it binds do.
  const invs = invariantRecords(p), invsOf = new Map(), sharedInvs = [], looseInvs = [];
  for (const r of invs) { const ms = new Set([...list(r.dataIds), ...list(r.contractIds)].flatMap(id => L.modulesOf(id))); if (ms.size === 1) push(invsOf, [...ms][0], r); else (ms.size ? sharedInvs : looseInvs).push(r); }
  const chain = batchChain(p), chainModules = new Set(chain.steps.flatMap(x => L.modulesOf(x.id))), chainHome = chain.steps.length && chainModules.size === 1 ? [...chainModules][0] : '', chainPart = !chain.steps.length || chainHome ? '' : chainModules.size ? 'shared' : 'loose';
  B.totals = {...B.totals, component: specs.length, capability: B.capabilities, 'external party': parties.length}; B.kindOpen = new Set();
  // Built in reading order, so that each module asks what its records leave open; the overview, which counts them, is
  // printed first.
  const spec = specTable(B, ordered, id => L.homeOf(id));
  const part = ms => ms.map(m => moduleBlock(B, m, {home: home.get(m.group.id) || [], holds: holds.get(m.group.id) || [], number, groups: groups.get(m.group.id) || [], parties: partiesOf.get(m.group.id) || [], invariants: invsOf.get(m.group.id) || [], chain: chainHome === m.group.id})).join('');
  const business = part(L.business), platform = part(L.platforms);
  O.module = '';
  let rest = '';
  const anyLoose = loose.length || looseGroups.length || looseParties.length || looseInvs.length || chainPart === 'loose';
  if (anyLoose) {
    rest += '## Records in no module\n\nThe records no module holds, each described here in full: ' + andList([loose.length ? plural(loose.length, 'component') : '', looseGroups.length ? plural(looseGroups.length, 'responsibility group') : '', looseParties.length ? plural(looseParties.length, 'external integration') : '', looseInvs.length ? plural(looseInvs.length, 'data invariant') : '', chainPart === 'loose' ? 'the batch chain' : ''].filter(Boolean)) + '.\n\n' + responsibilityGroups(B, looseGroups);
    for (const S of loose) rest += highLevelLine(B, S, number.get(S.id));
    for (const S of loose) rest += componentDetail(B, S, {level: 4});
    if (looseParties.length) rest += 'The external integrations no module holds:\n\n' + integrations(B, {subset: looseParties, level: 4});
    if (looseInvs.length) rest += invariantsSection(B, {subset: looseInvs, level: 4});
    if (chainPart === 'loose') rest += batchSection(B, {level: 4});
  }
  rest += '## Quality-driver-focused interactions\n\n' + qualityInteractions(B);
  if (sharedParties.length || !parties.length) rest += '## External integrations\n\n' + (sharedParties.length < parties.length ? 'The external integrations several modules share; each module names its own' + (looseParties.length ? ', and the records in no module name those no module holds' : '') + '.\n\n' : '') + integrations(B, {subset: parties.length ? sharedParties : null});
  rest += invariantsSection(B, {subset: sharedInvs}) + (chainPart === 'shared' ? batchSection(B) : '') + executionSection(B) + enterpriseSection(B) + acceptedObligationsSection(B, specs);
  // The overview: one row per module.
  const members = g => I.G.members.get(g.id) || [];
  const rows = order.map(m => {
    const g = m.group, id = g.id, platform_ = L.platform(id), c = concernTitle(g.concern), n = members(g).length, gaps = members(g).filter(r => isGap(I.reqById.get(r))).length, served = (L.served.get(id) || []).length, cs = holds.get(id) || [], asked = O.asks[4].filter(x => x.module === id).length;
    const reqs = platform_ ? (n ? count(n) + ' of its own' : 'none of its own') + (served ? '; serves ' + count(served) : '') : count(n) + (gaps ? ' (' + plural(gaps, 'delivery gap') + ')' : '');
    return [refOf(g) + ' · ' + mdCell(g.title), platform_ ? 'Platform' + (c ? ': ' + c.toLowerCase() : '') : 'Business', m.children.length ? count(m.children.length) : '—', reqs, cs.length ? count(cs.length) + ' (' + refList(cs.map(S => S.ref), 6) + ')' : '—', asked ? count(asked) : '—'];
  });
  const overview = '## Module overview\n\nThe design is organised by module, as Chapter 1’s requirement groups structure it (' + moduleStanding(L) + '): ' + plural(L.business.length, 'business module') + ', each a part of what the system does, and ' + plural(L.platforms.length, 'platform module') + ', the shared services the business modules use. Each module below gives its purpose, its sub-modules, its components in full with the interfaces and data that touch them, and its own open questions. A component several modules hold is described once, under its platform module, else under its first module, and named in the others' + (anyLoose ? '; the records no module holds follow the modules' : '') + '.\n\n' + table(['Module', 'Role', 'Sub-modules', 'Requirements', 'Components', 'Open questions'], rows);
  const intro = (n, what) => (n ? what + '\n\n' : '');
  return overview + '## Component specification table\n\nOne row per component, in the order the modules below describe them.\n\n' + spec +
    (L.business.length ? '## Business modules\n\n' + intro(L.business.length, 'The ' + plural(L.business.length, 'business module') + ', in the order of the requirement structure.') + business : '') +
    (L.platforms.length ? '## Platform modules\n\n' + intro(L.platforms.length, 'The ' + plural(L.platforms.length, 'platform module') + ', the shared services the business modules use; each also says what it serves and which modules use it.') + platform : '') +
    rest + openQuestions(B, 4);
}
// One module's part (see componentsByModule): its records asked of it while it is printed (O.module), and its own open
// questions at its end, counted against its own records.
function moduleBlock(B, m, ctx) {
  const {p, O, L} = B, I = designIndex(p), g = m.group, id = g.id, platform = L.platform(id), members = x => I.G.members.get(x.id) || [];
  O.module = id;
  let out = '### ' + moduleRef(g) + '\n\n';
  // What it is: its role, its requirements and sub-modules; a platform module, its concern and what it serves.
  const n = members(g).length, gaps = members(g).filter(r => isGap(I.reqById.get(r))).length, c = concernTitle(g.concern), serves = platform ? servesClause(p, L, g) : '';
  out += (platform ? 'A platform module' + (c ? ' for ' + c.toLowerCase() : '') : 'A business module') + ': ' + (n ? plural(n, 'requirement') + (platform ? ' of its own' : '') + (gaps ? ', ' + plural(gaps, 'delivery gap') : '') : platform ? 'no requirement of its own' : 'no requirement') + (m.children.length ? ', in ' + plural(m.children.length, 'sub-module') : '') + (serves ? '; it ' + serves : '') + '.\n\n';
  // Its purpose: the Chapter 4 group that realises it (format 2 asks a purpose not stated of the module), else its own
  // description.
  const purposes = ctx.groups.map(x => O.field(x, 4, 'responsibility group', 'purpose', 'purpose')).filter(x => x.stated).map(x => md(x.text).replace(/[.]$/, ''));
  const purpose = purposes.length ? purposes.join('; ') : str(g.description) ? md(g.description).replace(/[.]$/, '') : '';
  if (purpose) out += 'Purpose: ' + purpose + '.\n\n';
  const resp = list(p.logical?.responsibilities);
  if (ctx.groups.length) out += 'Realised in Chapter 4 by ' + andList(ctx.groups.map(x => { const rs = resp.filter(r => r.groupId === x.id); return refOf(x) + ' · ' + md(x.title) + (rs.length ? ' (' + refList(rs.map(refOf), 6) + ')' : ''); }), 6) + '.\n\n';
  if (m.children.length) out += 'Sub-modules: ' + named(m.children.map(s => groupLabel(p, s))) + '.\n\n';
  // The modules it uses and is used by: the Chapter 8 contracts its components use whose provider another module prints
  // in full, and those they provide to the components of another (design-spec.js: an event's provider is its sender).
  const mods = new Map(), note = (key, other, ref) => { if (!other || other === id) return; const k = key + '|' + other; if (!mods.has(k)) mods.set(k, {key, other, refs: []}); if (!mods.get(k).refs.includes(ref)) mods.get(k).refs.push(ref); };
  const otherEnd = (c, S) => (c.from === S.id ? c.to : c.from);
  for (const S of ctx.home) {
    for (const f of S.uses) { const o = otherEnd(f.contract, S); if (B.specById.has(o)) note('uses', L.homeOf(o), refOf(f.contract)); }
    for (const f of S.interfaces) { const o = otherEnd(f.contract, S); if (B.specById.has(o)) note('used', L.homeOf(o), f.ref); }
  }
  const relation = key => { const xs = [...mods.values()].filter(x => x.key === key).sort((a, b) => L.rank.get(a.other) - L.rank.get(b.other)); return named(xs.map(x => moduleRef(L.byId.get(x.other).group) + ' (' + refList(x.refs, 6) + ')')); };
  const uses = relation('uses'), used = relation('used');
  if (uses) out += 'Uses: ' + uses + '.\n\n';
  if (used) out += 'Used by: ' + used + '.\n\n';
  // Its components: each it prints in full, numbered as in the specification table; those it shares, by reference.
  for (const S of ctx.home) out += highLevelLine(B, S, ctx.number.get(S.id));
  const others = ctx.holds.filter(S => !ctx.home.includes(S));
  if (others.length) out += 'Also part of this module: ' + named(others.map(S => S.ref + ' · ' + md(S.title) + ' (in full under ' + moduleRef(L.byId.get(L.homeOf(S.id)).group) + ')')) + '.\n\n';
  // The interfaces and data that touch its components.
  const contracts = [...new Set(ctx.home.flatMap(S => [...S.interfaces.map(f => f.ref), ...S.uses.map(f => refOf(f.contract))]))], data = [...new Set(ctx.home.flatMap(S => [...S.data.owned, ...S.data.consumed, ...S.data.produced].map(refOf)))];
  if (contracts.length || data.length) out += 'Interfaces and data that touch its components: ' + [contracts.length ? plural(contracts.length, 'contract') + ' (' + refList(contracts) + ')' : '', data.length ? plural(data.length, 'data definition') + ' (' + refList(data) + ')' : ''].filter(Boolean).join(' and ') + '.\n\n';
  for (const S of ctx.home) out += componentDetail(B, S, {level: 4, shared: L.modulesOf(S.id).filter(x => x !== id).map(x => L.byId.get(x).group)});
  if (ctx.parties.length) out += 'The external integrations of this module alone:\n\n' + integrations(B, {subset: ctx.parties, level: 4});
  if (ctx.invariants.length) out += invariantsSection(B, {subset: ctx.invariants, level: 4});
  if (ctx.chain) out += batchSection(B, {level: 4});
  out += openQuestions(B, 4, {module: id, level: 4, scope: 'module', totals: {component: ctx.home.length, 'external party': ctx.parties.length, 'responsibility group': ctx.groups.length}});
  O.module = '';
  return out;
}
// "N requirements, through RG-001 · Title (N requirements, M delivery gaps) …; delivery, as the source states it: …. The
// gaps, the most urgent band first: REQ-… (external id) not delivered, Critical; …", at most LIST_MAX named, the rest
// counted with a pointer to the matrix annex. The groups are those the component's responsibilities (or the component
// itself) link: the curated links, not every group a requirement happens to be in.
function requirementsLine(p, S, ids) {
  const I = designIndex(p);
  if (!ids.length) return 'none realised yet.';
  const linked = [...new Set([...S.realised.filter(x => x.role !== 'supports').flatMap(x => list(x.responsibility.requirementGroupIds)), ...list(S.component.requirementGroupIds)])].map(id => I.groups.find(g => g.id === id || g.alias === id)).filter(Boolean);
  const inLinked = new Set(linked.flatMap(g => I.G.members.get(g.id) || [])), alone = ids.filter(id => !inLinked.has(id));
  const states = {}; for (const id of ids) { const s = delivery(I.reqById.get(id)); if (s) states[s] = (states[s] || 0) + 1; }
  const assessed = Object.keys(states).length, gaps = ids.filter(id => isGap(I.reqById.get(id))).sort((x, y) => bandRank(I.reqById.get(x)) - bandRank(I.reqById.get(y)) || score(I.reqById.get(y)) - score(I.reqById.get(x)));
  const shown = (assessed ? gaps : ids).slice(0, LIST_MAX).map(id => { const r = I.reqById.get(id); return id + (r?.externalId ? ' (' + md(r.externalId) + ')' : '') + (assessed ? ' ' + md(delivery(r)).toLowerCase() + (band(r) ? ', ' + md(band(r)) : '') : ''); });
  const rest = (assessed ? gaps : ids).length - shown.length;
  return plural(ids.length, 'requirement') + (linked.length ? ', through ' + named(linked.map(g => groupLabel(p, g)), 6) + (alone.length ? ' and ' + plural(alone.length, 'requirement') + ' named directly' : '') : '') + '; ' +
    (assessed ? 'delivery, as the source states it: ' + Object.entries(states).sort((x, y) => y[1] - x[1]).map(([s, n]) => count(n) + ' ' + md(s).toLowerCase()).join(', ') + '. ' + (gaps.length ? 'The gaps, the most urgent band first: ' + shown.join('; ') + (rest ? '; and ' + more(rest) + ' in the traceability matrix (Appendix D)' : '') + '.' : 'No delivery gap.') : 'the source carries no delivery assessment for them: ' + shown.join('; ') + (rest ? '; and ' + more(rest) + ' in the traceability matrix (Appendix D)' : '') + '.');
}
function qualityInteractions(B) {
  const {p} = B, Q = qualityDriverInteractions(p);
  if (!Q.length) return none('no quality driver', 'Chapter 2 · Work');
  let out = 'For each quality driver, High priority first, how each component supports it: its properties, the controls on it, its runtime plan and the capabilities it stands on.\n\n';
  const silent = [];
  for (const x of Q) {
    if (!x.components.length) { silent.push(codeOf(p, x.driver.id)); continue; }
    out += '**' + codeOf(p, x.driver.id) + ': ' + md(x.driver.title) + '**' + (driverPriority(x.driver) || B.format < 2 ? ' (' + (driverPriority(x.driver) || 'priority not stated') + ')' : '') + '\n\n' + bullets(x.components.map(c => refOf(c.component) + ' ' + md(clip(c.component.title, 60)) + ': ' + [c.properties.length ? 'properties ' + c.properties.map(y => md(y.statement).replace(/[.]$/, '')).join('; ') : '', c.controls.length ? 'controls ' + c.controls.map(refOf).join(', ') : '', c.plans.length ? 'runs under ' + c.plans.map(f => refOf(f.plan)).join(', ') : '', c.capabilities.length ? 'stands on ' + refList(c.capabilities.map(refOf), 6) : ''].filter(Boolean).join('; ')), {rest: k => 'And ' + plural(k, 'more component') + ' (Chapter 5 · Specification).'});
  }
  if (silent.length) out += 'No component bears on ' + refList(silent) + ' yet: their responsibilities reach no component.\n\n';
  return out;
}
// The external integrations: every party (its count for the section's open questions), or, by module, those given, under
// headings of the level given.
function integrations(B, {subset = null, level = 3} = {}) {
  const {p, O} = B, all = partyIntegrations(p).filter(Boolean), xs = subset || all, parties = new Map(list(p.interfaces?.parties).map(r => [r.id, r]));
  if (!xs.length) return none('no external party', 'Chapter 8 · Work');
  let out = '';
  if (!subset) B.totals = {...B.totals, 'external party': xs.length};
  const F1 = B.format < 2, SOURCE = / \(read from (?:its contracts|AIW’s proposed contracts, not decided)\)$/;
  xs.forEach((x, i) => {
    const rec = parties.get(x.id), xr = {...x, open: rec?.open}, opens = [];
    let body = '';
    // A field as format 1 prints it. Format 2 prints what is stated and leaves out a field that is open, naming it on the
    // party's marker (as the content reader reads format 1's line) and asking it once in the section's list.
    const line = (field, label, text, open) => { if (!open || F1) return label + ': ' + text + '\n\n'; opens.push(flagOf(field, plain(text).replace(SOURCE, ''))); return ''; };
    const purpose = O.field(xr, 8, 'external party', 'purpose', 'purpose');
    body += line('purpose', 'Purpose', purpose.stated ? md(purpose.text) : purpose.text, !purpose.stated);
    for (const [f, label] of PARTY_INTEGRATION) {
      const v = x[f];
      // A contract's field a journey draft left as an open question ("Open question: …? Not stated …", open-fields.js) reads as
      // the marker it is; the contract's own open item is listed in Appendix B. In format 2, a field read from its
      // contracts that is only such a question is asked in the section's list instead.
      if (v?.text) {
        // Format 2 keeps such a question in the words as the question it is ("…?", not "open: …"), which reads the same.
        const raw = String(v.text), source = v.source === 'contracts' ? ' (read from its contracts)' : v.source === 'proposed' ? ' (read from AIW’s proposed contracts, not decided)' : '';
        const asks = as => raw.replace(/Open question: ([^?]+)\?(?: Not stated in the brief or the upstream records\.)?/g, (m, w) => as(w.trim())), text = md(asks(w => 'open: ' + w)) + source;
        const asked = /^\s*Open question:/i.test(raw) && isOpenMarker(plain(text).replace(SOURCE, ''));
        body += line(f, label, F1 || asked ? text : md(asks(w => w + '?')) + source, asked);
        if (asked && !F1) O.ask(x.ref, 'external party', label.toLowerCase(), questionOf(raw) || '');
      } else {
        // Not stated by the party and by its contracts: the question the party's record keeps on the field, when it asks
        // one (open-fields.js; the content standard asks for it), else the marker alone. Format 2 asks a question once for
        // every field it is asked of.
        const o = rec ? fieldOpen(rec, f) : null, q = o?.state === 'open-question' && o.question ? o.question : '';
        O.add(8, 'external party', 'Integration: ' + label.toLowerCase(), x.ref, {state: q ? 'open-question' : 'not-stated', question: q, field: f, id: x.id, words: label.toLowerCase()});
        body += line(f, label, 'open: ' + (q ? md(q) : label.toLowerCase() + ' not stated'), true);
      }
    }
    // The parts AIW's proposed contracts reach (a drafted design's, not decided yet) follow the decided ones, named as proposals.
    const pr = x.proposed || {components: [], contracts: []}, users = xs => named(xs.map(c => c.ref + ' ' + md(clip(c.title, 50))));
    const proposed = pr.components.length ? 'proposed, not decided: ' + users(pr.components) + ' through ' + refList(pr.contracts.map(c => c.ref)) : '';
    if (F1) body += 'Used by: ' + (x.components.length ? users(x.components) : pr.components.length && !x.contracts.length ? '' : 'no component yet') + (x.contracts.length ? ' through ' + refList(x.contracts.map(c => c.ref)) : '') + (proposed ? (x.components.length || x.contracts.length ? '; ' : '') + proposed : '') + '.\n\n';
    else {
      // Format 2: the parts that use it, decided then proposed; contracts no component holds are named as its contracts.
      const used = [x.components.length ? users(x.components) + (x.contracts.length ? ' through ' + refList(x.contracts.map(c => c.ref)) : '') : '', proposed].filter(Boolean);
      if (used.length) body += 'Used by: ' + used.join('; ') + '.\n\n';
      if (!x.components.length && x.contracts.length) body += 'Its contracts: ' + refList(x.contracts.map(c => c.ref)) + '.\n\n';
    }
    out += '#'.repeat(level) + ' ' + (i + 1) + '. ' + x.ref + ' · ' + md(x.title) + '\n\n' + markerOf(B, opens) + body;
  });
  return out;
}

// ---------------------------------------------------------------- round 12, D4's and E's records (GR-SDD-26, GR-SDD-28)
// The journeys the functionalities run in (Chapter 1's journey steps, by journey), each with its kind of process
// (requirements-domain.js processKind) and the responsibilities that serve or realise its steps (Chapter 4 connections of
// kind serves or realises, logical-domain.js LAYER_KINDS, read with the responsibility as the source whichever end the
// connection is drawn from; a structural connection drawn from a step to a responsibility reads as serving it, as the
// architecture model types it: architecture-model.js connectionType, Serving with the responsibility as the source).
function journeys(B) {
  const {p} = B, steps = list(p.artefacts).filter(a => a.type === 'journey' && a.scopeMode !== 'out');
  if (!steps.length) return '';
  const byJourney = new Map();
  for (const s of steps) { const k = str(s.journeyId) || 'The journey'; if (!byJourney.has(k)) byJourney.set(k, []); byJourney.get(k).push(s); }
  // A connection's step end, by id (GR-REQ-19): the step itself, or the process node that stands for it on the Bank
  // Payment reference (model-scope.js stepOfNode); never by title, so a step keeps what serves it when either is renamed.
  const resp = new Map(list(p.logical?.responsibilities).map(r => [r.id, r])), stepAt = new Map(steps.map(s => [s.id, s])), by = new Map();
  const stepOf = id => stepAt.get(id) || stepAt.get(stepOfNode(p, id)) || null;
  for (const e of list(p.logical?.connections)) {
    const structural = !e.kind || e.kind === 'trace', kind = LAYER_KINDS.includes(e.kind) ? e.kind : structural && resp.has(e.to) && stepOf(e.from) ? 'serves' : null;
    if (!kind) continue;
    const [r, x] = resp.has(e.from) && stepOf(e.to) ? [e.from, e.to] : resp.has(e.to) && stepOf(e.from) ? [e.to, e.from] : [];
    if (!r) continue;
    const s = stepOf(x).id;
    let m = by.get(s); if (!m) by.set(s, m = {serves: new Set(), realises: new Set()}); m[kind].add(r);
  }
  const KIND = Object.fromEntries(PROCESS_KINDS.map(([k, label]) => [k, (/^[aeiou]/i.test(label) ? 'an ' : 'a ') + label.toLowerCase()]));
  const lines = [...byJourney].map(([name, xs]) => {
    const kinds = new Map(); for (const s of xs) { const k = processKind(s); kinds.set(k, (kinds.get(k) || 0) + 1); }
    const kindText = kinds.size === 1 ? KIND[[...kinds.keys()][0]] : [...kinds].map(([k, n]) => plural(n, 'step') + ' of ' + KIND[k]).join(', ');
    const serves = new Set(), realises = new Set();
    for (const s of xs) { const m = by.get(s.id); if (m) { m.serves.forEach(x => serves.add(x)); m.realises.forEach(x => realises.add(x)); } }
    const refs = ids => refList([...ids].map(id => refOf(resp.get(id))), 6);
    return '**' + md(name) + '**: ' + plural(xs.length, 'step') + ' (' + refList(xs.map(s => s.id), 6) + '), ' + kindText + (realises.size ? '; realised by ' + refs(realises) : '') + (serves.size ? '; served by ' + refs(serves) : '') + (serves.size || realises.size ? '' : '; no responsibility serves or realises its steps yet');
  });
  return 'The journeys they run in, each with its kind of process and the responsibilities that realise or serve its steps:\n\n' + bullets(lines, {rest: k => 'And ' + plural(k, 'more journey') + ' (Chapter 1 · Journey).'});
}
// The responsibility groups of Chapter 4 given (every one; by module, those no module holds), each with its purpose and
// its responsibilities, before the components that realise them.
function responsibilityGroups(B, gs) {
  const {p, O} = B, resp = list(p.logical?.responsibilities);
  if (!gs.length) return '';
  // Format 2: a group's purpose when stated (the section's list names the others) and its responsibilities when any.
  return 'The responsibilities fall in ' + plural(gs.length, 'responsibility group') + ':\n\n' + bullets(gs.map(g => {
    const rs = resp.filter(r => r.groupId === g.id), purpose = O.field(g, 4, 'responsibility group', 'purpose', 'purpose');
    if (B.format < 2) return refOf(g) + ' · ' + md(g.title) + ': ' + (purpose.stated ? md(purpose.text) : purpose.text).replace(/[.]$/, '') + ' (' + (rs.length ? refList(rs.map(refOf), 6) : 'no responsibility yet') + ')';
    return refOf(g) + ' · ' + md(g.title) + (purpose.stated ? ': ' + md(purpose.text).replace(/[.]$/, '') : '') + (rs.length ? ' (' + refList(rs.map(refOf), 6) + ')' : '');
  }), {rest: k => 'And ' + plural(k, 'more group') + ' (Chapter 4 · Work).'});
}
// What a control or a plan rests on (requirement-links.js deliveryOf, GR-SEC-04): the delivery of the requirements it
// links, as their source states it; those not yet delivered named, the others counted. Once per record and build.
function restsOn(B, r) {
  const key = 'rests:' + r.id;
  if (B.memo.has(key)) return B.memo.get(key);
  const d = deliveryOf(B.p, r), delivered = d.rows.length - d.undelivered.length - d.notStated.length;
  const notYet = d.rows.filter(x => d.undelivered.includes(x.id)), text = !d.rows.length ? '' : 'rests on ' + plural(d.rows.length, 'requirement') + ': ' + [notYet.length ? count(notYet.length) + ' not yet delivered (' + notYet.slice(0, 6).map(x => x.id + ' ' + md(x.delivery).toLowerCase()).join(', ') + (notYet.length > 6 ? ' and ' + more(notYet.length - 6) : '') + ')' : '', delivered ? count(delivered) + ' delivered' : '', d.notStated.length ? count(d.notStated.length) + ' with no delivery status' : ''].filter(Boolean).join(', ');
  B.memo.set(key, text);
  return text;
}
// An "open: …" marker for a value that is not a record's own field (a parameter's value, an option's fit for a group):
// printed once per record and value, "open" after, as O.field prints a field's; Appendix B lists it once.
function openOnce(B, key, words) {
  if (!B.memo.has('open-once')) B.memo.set('open-once', new Set());
  const seen = B.memo.get('open-once');
  if (seen.has(key)) return 'open';
  seen.add(key); return 'open: ' + words;
}
// A control's round-12 facts in brackets after it: who makes and who checks under dual control (GR-SEC-03), its
// parameters and the delivery of the requirements it rests on (GR-SEC-04).
function controlFacts(B, c) {
  const {O} = B, parts = [], F1 = B.format < 2;
  // Format 2 names what is stated (a dual control's maker and checker, a parameter's value); the section's list names
  // what is not.
  const said = (r, chapter, kind, f, label, words) => { const x = O.field(r, chapter, kind, f, label); return x.stated ? words + ' ' + md(x.text) : F1 ? x.text : ''; };
  if (c.category === DUAL_CONTROL) { const roles = [said(c, 9, 'control', 'makerRole', 'maker role', 'maker'), said(c, 9, 'control', 'checkerRole', 'checker role', 'checker')]; parts.push('dual control' + (F1 ? ': ' + roles.join(', ') : roles.some(Boolean) ? ': ' + roles.filter(Boolean).join(', ') : '')); }
  const ps = list(c.parameters);
  const valued = ps.slice(0, 6).map(x => { if (str(x.value)) return md(x.name) + ' ' + md(x.value) + (str(x.unit) ? ' ' + md(x.unit) : ''); O.add(9, 'control', 'Parameter value', refOf(c), {words: 'the value of ' + md(x.name)}); return F1 ? md(x.name) + ' ' + openOnce(B, refOf(c) + '|parameter|' + x.name, 'value not stated') : ''; }).filter(Boolean);
  if (valued.length) parts.push('parameters ' + valued.join(', ') + (ps.length > 6 ? ' and ' + more(ps.length - 6) : ''));
  const d = restsOn(B, c);
  if (d) parts.push(d);
  return parts.length ? ' (' + parts.join('; ') + ')' : '';
}
// A technology the component stands on: its capability with its category (the five round-12 categories among them), the
// product, the consequence if it is unavailable (the need's criticality, GR-RUN-08), the targets its realization states
// (GR-TEC-09) and how the preferred option covers the requirement groups the realization names (requirement fit, GR-TEC-06).
function techLine(B, S, t) {
  const {p, O} = B, cap = t.capability, cat = TECHNOLOGY_CATEGORIES.find(([k]) => k === cap.category)?.[1] || '';
  const F1 = B.format < 2;
  // A product where one is named; format 1 says where none is, format 2 prints the capability alone (productOpen asks it
  // of the section once).
  let s = refOf(cap) + ' ' + md(clip(cap.title, 50)) + (cat && !String(cap.title || '').toLowerCase().includes(cat.toLowerCase()) ? ' (' + cat.toLowerCase() + ')' : '') + (t.product ? ' → ' + md(t.product) + ' (' + (t.selected && t.realisation ? selectionLabel(p, t.realisation) : 'Candidate option') + ')' : productOpen(B, cap) + (F1 ? ' → no product named yet' : ''));
  const facts = [], need = S.needs.find(n => n.capability?.id === cap.id)?.need;
  // Format 2 says the consequence when it is stated; the section's list names the needs that leave it open.
  if (need) { const x = O.field(need, 6, 'technology need', 'criticality', 'consequence if unavailable'); if (x.stated || F1) facts.push(x.stated ? 'if unavailable: ' + md(x.text) : x.text); }
  const r = t.realisation;
  if (r) {
    if (t.selected) {
      if (!B.memo.has('product-applicability')) B.memo.set('product-applicability', new Map(technologyCatalogue(p).entries.flatMap(e => e.uses.map(u => [`${u.realizationId}|${u.optionId}`, {warning:u.sourceVersionMismatch, withdrawn:e.provenance.status==='Source pack withdrawn'}]))));
      const o=realizationOption(r), source=o&&B.memo.get('product-applicability').get(`${r.id}|${o.id}`);
      if (source?.warning) facts.push('source applicability: '+md(source.warning));
      if (source?.withdrawn) facts.push('bundled product guidance withdrawn; verify any mechanism claim separately');
    }
    const T = realizationTargets(p, r).targets.filter(x => x.figure);
    if (T.length) facts.push('targets ' + T.slice(0, 4).map(x => x.label + ' ' + (x.operator ? x.operator.toLowerCase() + ' ' : '') + md(x.figure) + (x.window ? ' over ' + md(x.window) : '') + (x.driverId ? ' for ' + codeOf(p, x.driverId) : '')).join(', '));
    const gids = list(r.requirementGroupIds);
    if (gids.length) {
      const o = realizationOption(r), I = designIndex(p);
      // Format 2 names the groups the chosen option is assessed against; the section's list, those it is not.
      const fit = o ? gids.slice(0, 6).map(g => { const k = o.assessments?.[g]?.coverage, word = COVERAGE.find(([x]) => x === k)?.[1], gr = refOf(I.groups.find(x => x.id === g) || {id: g}); if (!word) O.add(7, 'realisation', 'Requirement fit of the chosen option', refOf(r), {words: 'requirement fit for ' + gr}); return word ? gr + ' ' + word.toLowerCase() : F1 ? gr + ' ' + openOnce(B, refOf(r) + '|fit|' + g, 'not assessed') : ''; }).filter(Boolean) : [];
      if (!o || fit.length) facts.push('requirement fit ' + (o ? fit.join(', ') + (gids.length > 6 ? ' and ' + more(gids.length - 6) : '') : 'not read: no option is chosen yet'));
    }
  }
  return s + (facts.length ? ' (' + facts.join('; ') + ')' : '');
}
// The start-up needs of a component (GR-RUN-06): the runtime paths, in any environment, that say the call they carry is
// needed at start-up, read from the caller's side.
function startupNeeds(B, S) {
  if (!B.memo.has('startup')) {
    const {p} = B, cs = new Map(list(p.interfaces?.contracts).map(c => [c.id, c])), envs = new Map(list(p.runtime?.environments).map(e => [e.id, e])), parts = new Map([...list(p.realisation?.components), ...list(p.technologyRealisation?.records), ...list(p.interfaces?.parties)].map(x => [x.id, x])), by = new Map();
    for (const r of list(p.runtime?.paths)) {
      if (r.startup !== 'needed') continue;
      const c = cs.get(r.contractId); if (!c) continue;
      const to = parts.get(c.to), e = envs.get(r.environmentId);
      if (!by.has(c.from)) by.set(c.from, []);
      by.get(c.from).push((to ? refOf(to) + ' ' + md(clip(to.title, 40)) : md(c.to)) + ' through ' + refOf(c) + (e ? ' in ' + refOf(e) : ''));
    }
    B.memo.set('startup', by);
  }
  return B.memo.get('startup').get(S.id) || [];
}
// The data invariants (GR-SDD-28, GR-DAT-07): each once, with the data it binds, the contracts that must keep it, how it
// is checked and who owns it. Printed when any is recorded; a component's detail names those that bind it. By module,
// the invariants whose data and contracts are all one module's print in its part (a level-4 heading), the rest here.
function invariantsSection(B, {subset = null, level = 2} = {}) {
  const {p, O} = B, xs = subset || invariantRecords(p);
  if (!xs.length) return '';
  const data = new Map(list(p.interfaces?.data).map(d => [d.id, d])), cs = new Map(list(p.interfaces?.contracts).map(c => [c.id, c]));
  const name = (m, id) => { const x = m.get(id); return x ? refOf(x) + ' ' + md(clip(x.title, 50)) : md(id) + ' (removed)'; };
  let out = '#'.repeat(level) + ' Data invariants\n\n' + plural(xs.length, 'invariant') + ' the data must keep, each with the data it binds, the contracts that must keep it, how it is checked and who owns it (Chapter 8):\n\n';
  for (const r of xs.slice(0, LIST_MAX)) {
    if (B.format < 2) {
      const kind = str(r.kind) && !fieldOpen(r, 'kind') ? md(r.kind) : O.say(r, 8, 'invariant', 'kind', 'kind of invariant');
      out += '**' + refOf(r) + ' · ' + md(r.title) + '** (' + kind + '): ' + sentence(O.say(r, 8, 'invariant', 'condition', 'condition')) + ' Binds ' + andList(list(r.dataIds).map(id => name(data, id)), 6) + '; kept by ' + (list(r.contractIds).length ? andList(list(r.contractIds).map(id => name(cs, id)), 6) : 'no contract named') + '. Checked: ' + sentence(O.say(r, 8, 'invariant', 'check', 'how it is checked')) + ' Owner: ' + sentence(O.say(r, 8, 'invariant', 'owner', 'owner')) + '\n\n';
      continue;
    }
    // Format 2: the sentences that are stated; the section's list names the others.
    const f = (x, label) => O.field(r, 8, 'invariant', x, label), kind = str(r.kind) && !fieldOpen(r, 'kind') ? {stated: true, text: r.kind} : f('kind', 'kind of invariant'), condition = f('condition', 'condition'), check = f('check', 'how it is checked'), owner = f('owner', 'owner');
    const binds = list(r.dataIds).length ? 'Binds ' + andList(list(r.dataIds).map(id => name(data, id)), 6) + (list(r.contractIds).length ? '; kept by ' + andList(list(r.contractIds).map(id => name(cs, id)), 6) : '') + '.' : list(r.contractIds).length ? 'Kept by ' + andList(list(r.contractIds).map(id => name(cs, id)), 6) + '.' : '';
    const said = [condition.stated ? sentence(md(condition.text)) : '', binds, check.stated ? 'Checked: ' + sentence(md(check.text)) : '', owner.stated ? 'Owner: ' + sentence(md(owner.text)) : ''].filter(Boolean);
    out += '**' + refOf(r) + ' · ' + md(r.title) + '**' + (kind.stated ? ' (' + md(kind.text) + ')' : '') + (said.length ? ': ' + said.join(' ') : '.') + '\n\n';
  }
  if (xs.length > LIST_MAX) out += 'And ' + plural(xs.length - LIST_MAX, 'more invariant') + ' in the Chapter 8 register (Appendix D).\n\n';
  return out;
}
// The batch chain (GR-SDD-28, GR-RUN-03): the batch contracts as the sequence they run in (interfaces-domain.js
// batchChain), each with its trigger, schedule, window (and the runtime plans' batch windows that run it), cut-off, the
// contracts it waits for, where it restarts and its volume. Printed when any batch contract is recorded; by module, in
// the part of the one module that holds all its contracts (a level-4 heading), else as a part of its own.
function batchSection(B, {level = 2} = {}) {
  const {p, O} = B, C = batchChain(p);
  if (!C.steps.length) return '';
  const cs = new Map(list(p.interfaces?.contracts).map(c => [c.id, c])), ref = id => refOf(cs.get(id) || {id}), F1 = B.format < 2;
  // A cell not stated: its "open: …" marker in format 1, a dash in format 2 (the section's list names it).
  const cell = (c, f, label) => { const x = O.field(c, 8, 'contract', f, label); return x.stated ? mdCell(clip(x.text, 120)) : F1 ? x.text : '—'; };
  let out = '#'.repeat(level) + ' Batch chain\n\nThe batch contracts in the order they run, each after the contracts it waits for (Chapter 8): ' + md(C.text) + '.\n\n';
  out += '<!-- aiw:landscape -->\n' + table(['Order', 'Contract', 'Trigger', 'When', 'Window', 'Cut-off', 'After', 'Restart point', 'Volume'], C.steps.slice(0, LIST_MAX).map(x => {
    const c = cs.get(x.id), runs = x.windows.map(w => md(w.planRef || w.planId) + ' ' + md(w.name));
    // What runs first: the contracts it waits for; "open" when its predecessors are recorded as not stated (E2).
    return [count(x.level + 1), refOf(c) + ' · ' + mdCell(clip(c.title, 60)), cell(c, 'batchTrigger', 'batch trigger'), cell(c, 'batchSchedule', 'batch schedule'), cell(c, 'batchWindow', 'batch window') + (runs.length ? ' (' + mdCell(runs.join(', ')) + ')' : ''), cell(c, 'cutOff', 'cut-off'), x.after.length ? refList(x.after.map(ref), 6) : c.open?.predecessorIds ? (t => (F1 ? t : '—'))(O.field(c, 8, 'contract', 'predecessorIds', 'predecessors').text) : '—', cell(c, 'restartPoint', 'restart point'), cell(c, 'volume', 'volume')];
  })) + '<!-- aiw:/landscape -->\n\n';
  if (C.steps.length > LIST_MAX) out += 'And ' + plural(C.steps.length - LIST_MAX, 'more batch contract') + ' later in the chain (the Chapter 8 register, Appendix D).\n\n';
  if (C.cycles.length) { out += (F1 ? 'open: the order of ' : 'The order of ') + refList(C.cycles.map(ref)) + ' leads back to itself, so the chain has no first run there (Chapter 8 · Validate).\n\n'; for (const id of C.cycles) O.gap(8, 'contract', 'Batch order that leads back to itself', ref(id), 'Chapter 8 · Work'); }
  return out;
}

// ---------------------------------------------------------------- co-authored passages and the evidence trail
// The passages a person accepted into the SDD from the co-author (brain-authoring.js acceptedNarratives): each under the
// section of its source chapter, with the record it explains, who accepted it and why, whether its source changed since
// and the knowledge it consulted. Knowledge informs exploration; it adopts no pattern and approves nothing.
const SECTION_OF_CHAPTER = {1: 1, 2: 2, 3: 3, 4: 4, 5: 4, 6: 4, 7: 4, 8: 4, 9: 4, 10: 5, 11: 6};
function explanations(B, section) {
  const {p} = B;
  let xs = []; try { xs = acceptedNarratives(p).filter(n => (SECTION_OF_CHAPTER[Number(n.context?.chapter)] || 6) === section); } catch { xs = []; }
  if (!xs.length) return '';
  return '## Co-authored design explanations\n\n' + xs.map(n => {
    let current = false; try { current = noteCurrent(p, n); } catch { current = false; }
    const k = list(n.knowledge), id = n.context?.id;
    return '**' + md(n.id) + ' · ' + md(n.title) + '** (explains ' + (id && id !== 'project' ? md(recordRef(p, id)) : 'the project') + ', Chapter ' + md(n.context?.chapter) + ')\n\n' + mdText(n.body) + '\n\n' +
      'Co-authored with Sol and accepted by ' + md(n.reviewer || 'an unnamed reviewer') + (n.at ? ' on ' + String(n.at).slice(0, 10) : '') + (str(n.reason) ? ', who gave as the reason: ' + md(n.reason).replace(/[.]$/, '') : '') + '. Its source: ' + (current ? 'current' : 'changed since it was accepted; review required') + '.' +
      (k.length ? ' Knowledge consulted: ' + k.map(r => md(r.patternId) + ' · ' + md(r.releaseId) + (r.posture ? ' (' + md(r.posture) + ')' : '')).join('; ') + '; knowledge informs exploration, and no pattern adoption or compliance approval is implied.' : '') + '\n\n';
  }).join('');
}
// The co-authoring trail (evidence-domain.js), in Appendix E: each task a person applied or withdrew, the source revision
// it cites and whether that source changed since, the records it created, who applied it and why, and the
// considerations explored with their outcomes and reasons.
function evidenceTrail(B) {
  const {p} = B, tasks = list(p.coauthoring?.tasks).filter(t => ['applied', 'withdrawn'].includes(t.status));
  if (!tasks.length) return '';
  return 'Co-authoring trail, each task a person applied or withdrew:\n\n' + bullets(tasks.map(t => {
    let current = false; try { current = sourceCurrent(p, t); } catch { current = false; }
    const made = Object.values(t.applied?.ids || {}).map(id => recordRef(p, String(id))), pats = list(t.patterns);
    return md(t.id) + ' · ' + md(t.title) + ': ' + md(t.status) + (t.applied?.reviewer ? ' by ' + md(t.applied.reviewer) : '') + (str(t.applied?.reason) ? ' (' + md(t.applied.reason).replace(/[.]$/, '') + ')' : '') +
      '; cites ' + md(t.sourceId) + (t.sourceRevision != null ? ' revision ' + md(t.sourceRevision) : '') + ' (' + (current ? 'current' : 'the source changed since; review required') + ')' +
      (made.length ? '; created ' + refList(made, 6) : '') + (pats.length ? '; considerations: ' + pats.map(r => md(r.patternId) + ' ' + md(String(r.outcome || '').toLowerCase()) + (str(r.reason) ? ': ' + md(r.reason).replace(/[.]$/, '') : '')).join('; ') : '');
  }), {rest: k => 'And ' + plural(k, 'more task') + ' (Chapter 1 · Evidence).'});
}

// ---------------------------------------------------------------- 5. Architecture models
// The C4 levels, each with its purpose and its figures in reading order (the figure set's numbers run in the same order),
// then the deployment. Round 24 (D-24-07; the figure set of W4's sdd-document.js and sdd-c4.js, read here, never edited):
// where the project has modules, the module map opens the section (moduleMapPart), and where the containers are not
// decided yet (sdd-c4.js byModule) the modules stand for them at levels 2 and 3 (containersByModulePart,
// componentsByModulePart). Without modules, the section is what it was.
function models(B) {
  const {F} = B, mapped = hasModules(B.p);
  let out = '# 5. Architecture models\n\n' + (mapped ? 'The module map comes first: the modules the requirements fall into, as Chapter 1 structures them. Then the models follow the C4 levels: the system in its context (level 1), the containers it runs in (level 2) and the components inside each container (level 3), with the deployment that runs them' + (F.c4.byModule ? '; the deployable containers are not decided yet, so the modules stand for them at levels 2 and 3' : '') + '. ' : 'The models follow the C4 levels: the system in its context (level 1), the containers it runs in (level 2) and the components inside each container (level 3), with the deployment that runs them. ') + 'Each figure is drawn from the saved records by the same model and renderer as the pictures on screen; positions are a projection, never facts.\n\n';
  // A level's figures where they stand (a figure that fits only a landscape page in a landscape section of its own), then
  // what the level leaves to the figures annex: the groups its overview folds that have no detail in the body, and the
  // budget it was drawn within when it had to be folded again to fit a page.
  const place = (key, empty) => {
    const fs = F.figures(key);
    if (!fs.length) return (F.drawn ? empty : 'Not drawn in this export (figures=none); an export with figures draws it.') + '\n\n';
    let o = fs.map(f => (f.print?.orientation === 'landscape' ? '<!-- aiw:landscape -->\n' + F.block(f) + '\n<!-- aiw:/landscape -->' : F.block(f))).join('\n\n') + '\n\n';
    const L = F.level?.(key), listed = L?.fold?.listed || [];
    if (listed.length) o += 'The overview folds ' + plural(listed.length + (L.fold.details || 0), 'group') + ' of several elements: ' + (L.fold.details ? count(L.fold.details) + ' drawn in detail here, the other ' + count(listed.length) : 'all ' + count(listed.length)) + ' (' + named(listed.map(g => md(clip(g.title, 40)) + ' (' + g.count + ')'), 6) + ') in the figures annex (Appendix D).\n\n';
    if (L?.budget && L.budget < FIGURE_BUDGET_WORDS) o += 'Each figure of this level draws ' + L.budget + ' elements at most (the budget is ' + FIGURE_BUDGET_WORDS + '), so that it fits one page at 7 pt or more.\n\n';
    return o;
  };
  if (mapped) out += moduleMapPart(B, place);
  out += '## Context diagram (Level 1)\n\nPurpose: ' + C4_SCENES.context.purpose + '\n\n' + place('context', 'None recorded: ' + lowFirst(F.c4.contextNote || 'no application component is recorded yet, so the context has no system to draw.'));
  if (F.c4.byModule) out += containersByModulePart(B, place) + componentsByModulePart(B, place);
  else out += containerLevels(B, place);
  out += '## Deployment diagram\n\nPurpose: ' + C4_SCENES.deployment.purpose + '\n\n' + (F.c4.environment ? 'Environment: ' + refOf(F.c4.environment) + ' · ' + md(F.c4.environment.title) + (F.c4.otherEnvironments.length ? '; the others (' + refList(F.c4.otherEnvironments.map(refOf)) + ') are drawn in Chapter 10.' : '.') + '\n\n' : '') + place('deployment', 'None recorded: nothing is placed in an environment yet; ' + (F.c4.deploymentNote || 'no environment is recorded.'));
  out += '<!-- aiw:chapter-models -->\n\n';
  for (const view of list(F.section5).filter(x => x.level === 'chapter-model')) out += '## Chapter ' + view.chapter + ' · ' + md(view.title) + '\n\nPurpose: ' + md(view.purpose) + '\n\n' + place(view.key, view.reason || 'No relevant saved records are available for this chapter model.');
  return out + '<!-- aiw:figure-manifest -->\n\n';
}
// Levels 2 and 3 by container: the container diagram, then the component diagrams of the containers that hold the most
// components (the others in the figures annex), the containers of one component and the components no container holds.
function containerLevels(B, place) {
  const {F} = B;
  let out = '## Container diagram (Level 2)\n\nPurpose: ' + C4_SCENES.container.purpose + '\n\n' + place('container', 'None recorded: no application component is recorded yet, so there is no container to draw.');
  out += '## Component diagrams (Level 3)\n\nPurpose: ' + C4_SCENES.component.purpose + '\n\n';
  const inBody = containersInBody(F.c4.components), rest = F.c4.components.filter(x => !inBody.has(x));
  if (F.c4.components.length) for (const x of F.c4.components.filter(x => inBody.has(x))) out += '### ' + md((x.container.ref ? x.container.ref + ' · ' : '') + x.container.title) + '\n\n' + 'It holds ' + plural(x.container.components.length, 'component') + ': ' + refList(x.container.components.map(refOf)) + '.\n\n' + place('component:' + (x.container.ref || x.container.id), 'This container is not drawn in this export.');
  if (rest.length) out += 'The body draws the ' + plural(inBody.size, 'container') + ' that hold the most components (at most ' + BODY_CONTAINERS + '); the component diagrams of the other ' + plural(rest.length, 'container') + ' (' + named(rest.map(x => (x.container.ref || x.container.id) + ', ' + plural(x.container.components.length, 'component')), 6) + ') are in the figures annex (Appendix D).\n\n';
  // Only where no container is drawn: with a container decomposed above, "no container holds two components" would be
  // false (round 24, a defect from round 12).
  else if (!inBody.size) out += (F.c4.single.length || F.c4.unplaced.length ? 'No container holds two components or more, so no container is decomposed further.\n\n' : none('no container holds an application component', 'Chapter 5 · Work'));
  if (F.c4.single.length) out += 'Containers that hold one component, which section 4 describes: ' + named(F.c4.single.map(k => (k.ref || k.id) + ' (' + refOf(k.components[0]) + ')')) + '.\n\n';
  if (F.c4.unplaced.length) out += 'Components no container holds yet: ' + refList(F.c4.unplaced.map(refOf)) + (B.format < 2 ? ' (open: container, Appendix B)' : ', whose container section 4’s open questions name as not stated') + '.\n\n';
  return out;
}
// The module map (round 24, D-24-07): the functional decomposition the requirements fall into, before the C4 levels, so
// that the figures number from it. Where it draws the modules within fewer boxes to fit a page, it says so.
function moduleMapPart(B, place) {
  const {F} = B, e = list(F.section5).find(x => x.level === 'module-map');
  let out = '## ' + C4_SCENES.moduleMap.title + '\n\nPurpose: ' + C4_SCENES.moduleMap.purpose + '\n\n' + place('module-map', 'None recorded: the module structure has nothing to draw.');
  if (e?.modules && e.drawn && e.drawn < e.modules) out += 'The map draws the ' + plural(e.modules, 'module') + ' within ' + plural(e.drawn, 'box', 'boxes') + ' so that it fits one page: the smallest stand together, as its notes say; section 4 describes each module.\n\n';
  return out;
}
// Level 2 by module: the modules stand for the containers, which are not decided yet (sdd-c4.js containerWhy says why).
function containersByModulePart(B, place) {
  const {F} = B;
  return '## ' + C4_SCENES.moduleContainer.title + ' (Level 2)\n\nPurpose: ' + C4_SCENES.moduleContainer.purpose + '\n\n' + (F.c4.containerWhy ? md(F.c4.containerWhy) + '\n\n' : '') + place('container', 'None recorded: no application component is recorded yet, so there is no container to draw.');
}
// Level 3 by module, as the figure set lists it (sdd-document.js section5: one entry per module, in Chapter 1's order).
// Where some module is not drawn in the body, a table first: one row per module with what the level draws of it, its
// figures below, its figure in the figures annex (a module of two components or more beyond the BODY_MODULES that hold
// the most, as the figure set chooses them), or why it has none (one component, which section 4 describes, or none).
// Then each module the body draws, with its components and its figures; then the components no module holds.
function componentsByModulePart(B, place) {
  const {F} = B, C = F.c4, inBody = modulesInBody(C.components), drawn = new Map(C.components.map(x => [x.module.id, x])), key = u => 'component:' + u.ref;
  // A module lists the components it is home to (sdd-c4.js moduleHomes: where the figures draw a component in full) and
  // names the ones it shares with modules that are home to them (round 24, part 3).
  const own = u => list(u.home || u.components), sharedOf = u => list(u.components).filter(c => !own(u).includes(c));
  const rows = list(C.modules?.modules).map(u => { const x = drawn.get(u.id) || null; return {u, x, body: !!x && inBody.has(x)}; });
  const body = rows.filter(r => r.body), annex = rows.filter(r => r.x && !r.body);
  let out = '## ' + C4_SCENES.moduleComponent.title + ' (Level 3)\n\nPurpose: ' + C4_SCENES.moduleComponent.purpose + '\n\n';
  if (body.length < rows.length) {
    const where = r => {
      if (r.body) { const ns = F.figures(key(r.u)).map(f => f.n); return ns.length ? (ns.length > 1 ? 'Figures ' + ns[0] + '–' + ns.at(-1) : 'Figure ' + ns[0]) + ', below' : F.drawn ? 'Below' : 'Below, in an export with figures'; }
      if (r.x) return 'In the figures annex (Appendix D): “Components of ' + mdCell(r.u.ref + ' ' + r.u.title) + '”';
      if (!own(r.u).length && sharedOf(r.u).length) return 'Not drawn: each of its components is shared, and drawn in full in the figure of its home module';
      return own(r.u).length ? 'Not drawn: one component, which section 4 describes' : 'Not drawn: it holds no component';
    };
    const lead = annex.length ? 'the body draws the ' + plural(body.length, 'module') + ' that hold the most components (at most ' + BODY_MODULES + '), below; the figures annex (Appendix D) draws every other module with a figure of its own: one that holds two components or more, or is home to a component other modules share.' : 'the body draws every module with a figure of its own, below.';
    out += (body.length ? (F.drawn ? lead[0].toUpperCase() + lead.slice(1) : 'In an export with figures, ' + lead) : 'No module holds two components or more or is home to a shared one, so no module is drawn at this level.') + ' Each module, in Chapter 1’s order, with the components it is home to, the ones it shares, and what this level draws of it:\n\n';
    const cell = u => [own(u).length ? count(own(u).length) + ' (' + refList(own(u).map(refOf), 6) + ')' : '', sharedOf(u).length ? 'shares ' + refList(sharedOf(u).map(refOf), 6) : ''].filter(Boolean).join('; ') || '—';
    out += table(['Module', 'Components', 'Figure'], rows.map(r => [mdCell(r.u.ref + ' · ' + r.u.title), cell(r.u), where(r)]));
  }
  for (const {u, x} of body) out += '### ' + md(u.ref + ' · ' + u.title) + '\n\n' + 'It holds ' + plural(x.container.components.length, 'component') + ': ' + refList(x.container.components.map(refOf)) + '.' + (list(x.container.shared).length ? ' It shares ' + refList(x.container.shared.map(refOf)) + ', each drawn in full in its home module’s figure.' : '') + '\n\n' + place(key(u), 'This module is not drawn in this export.');
  if (C.unplaced.length) out += 'Components no module holds: ' + refList(C.unplaced.map(refOf)) + ', described with the records in no module in section 4.\n\n';
  return out;
}

// ---------------------------------------------------------------- 6. Architecture model refinements
function refinements(B) {
  const {p, meta, changes} = B, bs = list(p.finalReview?.baselines), plats = plateausOf(p);
  let out = '# 6. Architecture model refinements\n\n';
  if (!bs.length && !plats.length) out += 'None recorded: this is the first version; no refinement is recorded yet.\n\n';
  if (bs.length) {
    out += '## Versions\n\n';
    const rows = [];
    for (let i = 0; i < bs.length; i++) {
      let diff = null; if (i) { try { diff = baselineDiff(bs[i - 1].source, bs[i].source); } catch { diff = null; } }
      const k = kind => (diff ? diff.records.filter(r => r.kind === kind).length : null);
      rows.push(['0.' + (i + 1), bs[i].id + ' · ' + mdCell(clip(bs[i].title, 60)), String(bs[i].at || '').slice(0, 10), mdCell(bs[i].classification), i ? count(k('added')) + ' added, ' + count(k('changed')) + ' changed, ' + count(k('removed')) + ' removed' : 'the first version']);
    }
    out += table(['Version', 'Baseline', 'Frozen', 'Classification', 'Records against the version before'], rows.slice(-LIST_MAX)) + (rows.length > LIST_MAX ? 'And ' + plural(rows.length - LIST_MAX, 'earlier version') + ' (Chapter 11 · Output).\n\n' : '');
  }
  if (changes && !meta.id) {
    const c = changes, sum = kind => c.chapters.reduce((n, r) => n + r[kind].length, 0);
    out += '## Since ' + c.baseline.id + '\n\nCompared with ' + c.baseline.id + ' (frozen ' + String(c.baseline.at || '').slice(0, 10) + '), the saved records show ' + plural(sum('added'), 'record') + ' added, ' + count(sum('changed')) + ' changed and ' + count(sum('removed')) + ' removed' + (c.edges ? ', and ' + plural(c.edges, 'relationship') + ' added or removed' : '') + '. A difference here is between saved records; it says nothing about whether the change was reviewed.\n\n' + table(['Chapter', 'Added', 'Changed', 'Removed'], c.chapters.map(r => [r.chapter + ' · ' + chapterTitle(r.chapter), refList(r.added.map(x => x.ref), 6) || '—', (r.changed.length ? named(r.changed.map(x => md(x.ref) + (x.fields?.length ? ' (' + x.fields.slice(0, 3).map(md).join(', ') + (x.fields.length > 3 ? ' and ' + more(x.fields.length - 3) : '') + ')' : '')), 6) : '—'), refList(r.removed.map(x => x.ref), 6) || '—']));
  }
  // The change review (SDD-SPEC §6; round 12, D-05): the change summary the SDD prints (change-summary.js, workstream
  // A2): the latest change of each record and the reviews it leaves open, by cause and by chapter, a dozen changes at most.
  // Every change, with its fields before and after and each affected record, is the change journal annex (Appendix D).
  if (changeEvents(p).length) out += changeSummaryMarkdown(p);
  // Round 12 (GR-SDD-14 with E's plan): the plateaus with the requirement groups placed on them, the gap plan, the
  // migration records that plan the move, and the records retired from the design.
  if (plats.length) out += plateausPart(B);
  out += gapPlan(B) + migrationPart(B) + retiredPart(B);
  return out + openQuestions(B, 6);
}
// The plateaus (round 6, Contract S; round 12, GR-DRF-14): per plateau its kind and due date, the requirement groups placed
// on it (roadmap-domain.js plateauGroups: where a group is delivered, by its imported delivery status or by a person)
// with their delivery gaps counted once each, whichever groups hold them, the records it introduces and retires, and
// the delivery actions towards it.
function plateausPart(B) {
  const {p} = B, I = designIndex(p), A = Object.values(roadmapOf(p).assignments || {}), placed = new Map(plateauGroups(p).map(x => [x.id, x.groups])), acts = list(p.finalReview?.actions);
  const any = [...placed.values()].some(gs => gs.length);
  const rows = plateausOf(p).map(x => {
    const gs = placed.get(x.id) || [], members = new Set(gs.flatMap(g => I.G.members.get(g.id) || [])), gaps = [...members].filter(id => isGap(I.reqById.get(id))).length, bases = [...new Set(gs.map(g => g.basis))];
    return [x.id + ' · ' + mdCell(x.title), PLATEAU_WORDS[x.kind] || x.kind, x.due || '—', count(A.filter(a => a?.introducedIn === x.id).length), count(A.filter(a => a?.retiredIn === x.id).length), ...(!any ? [] : [gs.length ? plural(gs.length, 'group') + ' (' + plural(members.size, 'requirement') + (bases.length ? '; by ' + bases.map(b => (b === 'person' ? 'a person' : mdCell(b))).join(' and ') : '') + ')' : '—', gs.length ? count(gaps) : '—']), count(acts.filter(a => a.plateauId === x.id).length)];
  });
  return '## Plateaus\n\n' + (any ? 'A requirement group is placed on the plateau where it is delivered, by its imported delivery status or by a person; a plateau’s gaps count each requirement once, whichever of its groups hold it.\n\n' : '') + table(['Plateau', 'Kind', 'Due', 'Introduces', 'Retires', ...(any ? ['Requirement groups placed', 'Delivery gaps'] : []), 'Actions'], rows);
}
// The migration records (GR-RUN-05): where the work moves from and to, its scope and volumes, how the move is reconciled,
// run side by side, rolled back and rehearsed, each as recorded (format 1: "open: …" where not stated; format 2: nothing,
// the section's open questions naming it once, round 24); the plateaus it moves between and the delivery actions that
// carry it. Without one, a design that names an existing system to move from (roadmap-domain.js migrationNeeds) says
// that no record plans the move.
function migrationPart(B) {
  const {p, O} = B, ms = migrationsOf(p), need = migrationNeeds(p);
  if (!ms.length && !need.any) return '';
  let out = '## Migration\n\n';
  if (!ms.length) {
    const names = [...need.parties, ...need.contracts].map(refOf);
    O.gap(11, 'document', 'Migration record for the move from an existing system', 'Delivery plan', 'Chapter 11 · Work · Delivery plan');
    return out + 'None recorded: the design names ' + refList(names, 6) + ', which move' + (names.length === 1 ? 's' : '') + ' from an existing system, and no migration record plans the move (Chapter 11 · Work · Delivery plan).\n\n';
  }
  const plats = new Map(plateausOf(p).map(x => [x.id, x])), acts = new Map(list(p.finalReview?.actions).map(a => [a.id, a])), F1 = B.format < 2;
  out += plural(ms.length, 'migration record') + ' plan' + (ms.length === 1 ? 's' : '') + ' the move between the plateaus, ' + (ms.length === 1 ? 'with' : 'each with') + ' how it is reconciled, run side by side, rolled back and rehearsed.\n\n';
  B.totals = {...B.totals, 'migration record': ms.length};
  const WORDS = {source: 'where it moves from', target: 'where it moves to'};
  for (const m of ms.slice(0, LIST_MAX)) {
    out += '**' + refOf(m) + ' · ' + md(m.title) + '**: ' + standing(p, [m]) + '\n\n';
    if (F1) out += bullets(MIGRATION_FIELDS.map(([f, label]) => label + ': ' + O.say(m, 11, 'migration record', f, label.toLowerCase())), {max: MIGRATION_FIELDS.length});
    else out += bullets(MIGRATION_FIELDS.map(([f, label]) => { const x = O.field(m, 11, 'migration record', f, label.toLowerCase(), {words: WORDS[f] || label.toLowerCase()}); return x.stated ? label + ': ' + md(x.text) : ''; }), {max: MIGRATION_FIELDS.length});
    const ps = list(m.plateauIds), as = list(m.actionIds);
    if (!ps.length) O.add(11, 'migration record', 'Plateaus a migration moves between', refOf(m), {words: 'the plateaus it moves between'});
    if (!as.length) O.add(11, 'migration record', 'Delivery actions that carry a migration', refOf(m), {words: 'the delivery actions that carry it'});
    const at = id => (plats.get(id) ? id + ' · ' + md(plats.get(id).title) : md(id) + ' (removed)');
    const moves = ps.length === 2 ? 'Moves from ' + at(ps[0]) + ' to ' + at(ps[1]) : ps.length ? 'Moves through ' + ps.map(at).join(' → ') : F1 ? 'Moves between plateaus: open: no plateau named' : '';
    const carried = as.length ? named(as.map(id => { const a = acts.get(id); return a ? id + ' · ' + md(clip(a.title, 60)) + ' (' + md(str(a.status || 'Planned').toLowerCase()) + ')' : md(id) + ' (removed)'; }), 6) : F1 ? 'open: no delivery action named' : '';
    if (moves || carried) out += (moves ? moves + (carried ? '; carried by ' + carried : '') : 'Carried by ' + carried) + '.\n\n';
  }
  if (ms.length > LIST_MAX) out += 'And ' + plural(ms.length - LIST_MAX, 'more migration record') + ' (Chapter 11 · Delivery plan).\n\n';
  return out;
}
// The records retired from the design (record-lifecycle.js retiredRecords, GR-GOV-23), newest first: each kept whole with
// who retired it, when and why, and read by no other part of this document.
function retiredPart(B) {
  const xs = retiredRecords(B.p);
  if (!xs.length) return '';
  return '## Retired records\n\n' + plural(xs.length, 'record') + ' ' + isAre(xs.length) + ' retired: ' + (xs.length === 1 ? 'it is' : 'each is') + ' kept whole with who retired it, when and why, and no other part of this document reads ' + (xs.length === 1 ? 'it' : 'them') + '.\n\n' + bullets(xs.slice().reverse().map(x => md(x.ref || x.id) + (x.title ? ' · ' + md(clip(x.title, 80)) : '') + ' (Chapter ' + x.chapter + '), retired' + (x.at ? ' on ' + String(x.at).slice(0, 10) : '') + (x.actor ? ' by ' + md(x.actor) : '') + (str(x.reason) ? ': ' + md(clip(x.reason, 160)).replace(/[.]$/, '') : '') + (list(x.with).length ? '; with ' + refList(x.with, 6) : '')), {rest: k => 'And ' + plural(k, 'more retired record') + ' (each chapter’s retired records).'});
}
// The plan from the value gaps to the next version (GR-SDD-14): per requirement group, its delivery gaps by band, the
// components that close them (those that realise the requirements) and its plateau: the one the group is placed on
// (roadmap-domain.js groupPlacements: where it is delivered), else the plateaus that introduce its components.
function gapPlan(B) {
  const {p} = B, I = designIndex(p), gaps = I.reqs.filter(isGap), F1 = B.format < 2;
  let out = '## Gap plan to the next version\n\n';
  if (!gaps.length) return out + (I.reqs.some(r => delivery(r)) ? 'Every assessed requirement is delivered; no delivery gap is recorded.\n\n' : none('no requirement carries a delivery assessment, so there is no gap to plan', 'Chapter 1 · Import'));
  const A = roadmapOf(p).assignments, P = groupPlacements(p), plats = new Map(plateausOf(p).map(x => [x.id, x])), compRef = id => refOf(I.compById.get(id)), at = id => { const a = A[id]; return a?.introducedIn && plats.get(a.introducedIn) ? plats.get(a.introducedIn).title : ''; };
  const placedOn = g => { const x = P[g.id], y = x && plats.get(x.plateauId); return y ? mdCell(y.title) + ' (placed ' + (x.basis === 'person' ? 'by a person' : 'by ' + mdCell(x.basis || 'delivery status')) + ')' : ''; };
  const rows = [];
  for (const g of I.groups) {
    const ids = (I.G.members.get(g.id) || []).filter(id => isGap(I.reqById.get(id)));
    if (!ids.length) continue;
    const bands = {}; for (const id of ids) { const b = band(I.reqById.get(id)) || 'no band'; bands[b] = (bands[b] || 0) + 1; }
    const comps = [...new Set(ids.flatMap(id => I.compsByReq.get(id) || []))];
    rows.push({g, ids, bands, comps, rank: Math.min(...ids.map(id => bandRank(I.reqById.get(id))))});
  }
  rows.sort((a, b) => a.rank - b.rank || b.ids.length - a.ids.length || a.g.id.localeCompare(b.g.id));
  const plateaus = plats.size > 0;
  out += plural(gaps.length, 'requirement') + ' ' + isAre(gaps.length) + ' not delivered or only partly delivered, by the source assessment; by group, the most urgent band first (the first ' + Math.min(LIST_MAX, rows.length) + ' of ' + plural(rows.length, 'group') + '), with the components that close each gap' + (plateaus ? ' and its plateau: the one the group is placed on, else the plateaus that introduce its components' : '') + '.\n\n';
  // A group no component closes: "open: …" in its cell in format 1; a dash in format 2, the section's open questions
  // naming it once (round 24).
  out += table(['Group', 'Gaps by band', 'Components that close them', ...(plateaus ? ['Plateau'] : [])], rows.slice(0, LIST_MAX).map(x => [refOf(x.g) + ' · ' + mdCell(clip(x.g.title, 60)), Object.entries(x.bands).sort((a, b) => byBand(a[0], b[0])).map(([b, n]) => mdCell(b) + ' ' + n).join(', '), x.comps.length ? refList(x.comps.map(compRef), 6) : F1 ? 'open: no component realises them' : '—', ...(plateaus ? [placedOn(x.g) || [...new Set(x.comps.map(at).filter(Boolean))].map(mdCell).join(', ') || 'not placed on a plateau'] : [])]));
  if (rows.length > LIST_MAX) out += 'And ' + plural(rows.length - LIST_MAX, 'more group') + ' with delivery gaps, each in Appendix A with its gaps by band.\n\n';
  const loose = gaps.filter(r => !(I.G.of.get(r.id) || []).length);
  if (loose.length) out += plural(loose.length, 'gap') + ' sit' + (loose.length === 1 ? 's' : '') + ' in no group: ' + refList(loose.map(r => r.id)) + '.\n\n';
  B.totals = {...B.totals, 'requirement group': rows.length};
  for (const x of rows) if (!x.comps.length) B.O.add(1, 'requirement group', 'Delivery gaps no component closes', refOf(x.g), {state: 'gap', words: 'a component that closes its delivery gaps'});
  return out;
}

// ---------------------------------------------------------------- 7. Appendix
function appendixA(B) {
  const {p} = B, I = designIndex(p);
  let out = '## A. Requirements analysis and component mapping\n\n';
  if (!I.reqs.length) return out + none('no requirement', 'Chapter 1 · Work');
  const grouped = new Set(I.reqs.filter(r => (I.G.of.get(r.id) || []).length).map(r => r.id)), loose = I.reqs.filter(r => !grouped.has(r.id));
  const realised = I.reqs.filter(r => (I.compsByReq.get(r.id) || []).length).length;
  out += plural(I.reqs.length, 'requirement') + ' in scope: ' + count(grouped.size) + ' in at least one of the ' + plural(I.groups.length, 'requirement group') + ' below and ' + count(loose.length) + ' in none. ' + count(realised) + ' ' + isAre(realised) + ' realised by a component through a responsibility that names it or its group, or by a component that names it (a curated link); the derived trails beyond are in the traceability matrix, with every requirement (Appendix D).\n\n';
  const states = {}; for (const r of I.reqs) { const s = delivery(r); if (s) states[s] = (states[s] || 0) + 1; }
  if (Object.keys(states).length) out += 'Delivery, as the source assessment states it: ' + Object.entries(states).sort((a, b) => b[1] - a[1]).map(([s, n]) => count(n) + ' ' + md(s).toLowerCase()).join(', ') + '. These are the source’s assertions, not verified delivery.\n\n';
  for (const g of I.groups) {
    const ids = I.G.members.get(g.id) || [], rs = ids.map(id => I.reqById.get(id)).filter(Boolean);
    out += '### ' + groupLabel(p, g) + '\n\n';
    out += 'Kind: ' + kindName(g.kind).toLowerCase() + (str(g.description) ? '. ' + md(g.description) : '') + '\n\n';
    // A platform module that owns no requirement says why it exists (round 24): what it serves, by its serves rule.
    if (!rs.length) { const L = B.format >= 2 && g.kind === 'module' ? moduleLayout(p) : null, serves = L?.platform(g.id) ? servesClause(p, L, g) : ''; out += (serves ? 'It owns no requirement of its own; it ' + serves + '.' : 'No requirement is in this group yet.') + '\n\n'; continue; }
    out += 'Key functionalities:\n\n' + bullets(rs.map(r => r.id + (r.externalId ? ' (' + md(r.externalId) + ')' : '') + ' · ' + md(clip(r.title, 160))), {rest: k => 'And ' + more(k) + ', in the requirement register by group (Appendix D).'});
    const st = {}; for (const r of rs) { const s = delivery(r); if (s) st[s] = (st[s] || 0) + 1; }
    const gapsBy = {}; for (const r of rs.filter(isGap)) { const b = band(r) || 'no band'; gapsBy[b] = (gapsBy[b] || 0) + 1; }
    if (Object.keys(st).length) out += 'Delivery: ' + Object.entries(st).sort((a, b) => b[1] - a[1]).map(([s, n]) => count(n) + ' ' + md(s).toLowerCase()).join(', ') + (Object.keys(gapsBy).length ? '; gaps by band: ' + Object.entries(gapsBy).sort((a, b) => byBand(a[0], b[0])).map(([b, n]) => md(b) + ' ' + n).join(', ') : '') + '.\n\n';
    const comps = [...new Set(ids.flatMap(id => I.compsByReq.get(id) || []))], drv = [...new Set([...(I.driversByGroup.get(g.id) || []), ...ids.flatMap(id => I.driversByReq.get(id) || [])])];
    out += 'Realised by: ' + (comps.length ? refList(comps.map(id => refOf(I.compById.get(id)))) + ' (' + count(ids.filter(id => (I.compsByReq.get(id) || []).length).length) + ' of ' + count(ids.length) + ' requirements realised)' : 'no component yet') + '. Drivers: ' + (drv.length ? refList(drv.map(id => codeOf(p, id))) : 'none linked') + '.\n\n';
  }
  if (loose.length) out += '### Requirements in no group\n\n' + plural(loose.length, 'requirement') + ': ' + refList(loose.map(r => r.id)) + '. Each is in the requirement register (Appendix D).\n\n';
  return out;
}
function appendixB(B) {
  const {p, O} = B;
  // The fields the records keep in an open state that the body did not record: a field the body recorded is listed
  // once, under the body's label, and a field of a kind the body labels is listed under that label for every record
  // (D-24-06). A driver is named by its code, as everywhere in the document.
  for (const [chapter, kind, read] of COLLECTIONS) if (kind !== 'document') for (const r of read(p)) for (const [f, e] of Object.entries(r?.open && typeof r.open === 'object' ? r.open : {})) if (e?.state && !O.has(chapter, r.id, f)) O.add(chapter, kind, O.labelOf(chapter, kind, f) || f.replace(/([A-Z])/g, ' $1').toLowerCase(), kind === 'driver' ? codeOf(p, r.id) : refOf(r), {state: e.state, question: e.question || '', field: f, id: r.id});
  // Sol's drafts that no person has kept or saved yet (record-lifecycle.js solDraftOf), apart from AIW's seeded proposals.
  const drafted = new Set();
  for (const [chapter, kind, read] of COLLECTIONS) for (const r of read(p)) if (solDraftOf(r) && isProposed(r)) { drafted.add(r.id); O.add(chapter, kind, 'Drafted by Sol, to keep, change or retire', refOf(r) || (kind === 'document' ? 'SDD narrative' : kind), {state: 'proposal'}); }
  const props = seededRecords(p).filter(x => !drafted.has(x.id));
  for (const x of props) O.add(x.chapter, x.kind, 'Proposals by AIW to keep, complete or dismiss', x.ref || x.id, {state: 'proposal'});
  const items = [...O.items.values()].sort((a, b) => a.chapter - b.chapter || b.refs.length - a.refs.length || a.label.localeCompare(b.label));
  const C = B.counts, words = {'not-stated': 'not stated', 'open-question': 'open questions', gap: 'missing', proposal: 'awaiting a person'};
  let out = '## B. Open items\n\n';
  out += 'What is open, grouped by cause with its count and where to resolve it. ' + (C ? 'The chapters’ checks leave ' + plural(C.toFix, 'finding') + ' to fix and ' + plural(C.toConfirm, 'item') + ' to confirm (the Output tab’s readiness board counts the same).' : '') + '\n\n';
  if (!items.length) out += none('no field is open and no required record is missing');
  else {
    const total = items.reduce((n, it) => n + it.refs.length, 0);
    out += plural(total, 'open item') + ' in ' + plural(items.length, 'cause') + '.\n\n';
    let chapter = null;
    for (const it of items) {
      if (it.chapter !== chapter) { chapter = it.chapter; out += '### Chapter ' + chapter + ' · ' + (chapter === 11 ? 'Review & realize' : chapterTitle(chapter)) + '\n\n'; }
      out += '**' + upFirst(md(it.label)) + '** (' + md(it.kind) + ', ' + words[it.state] + '): ' + plural(it.refs.length, 'record') + ', ' + refList(it.refs.map(String)) + '. Resolve in ' + (it.where || 'Chapter ' + chapter + ' · Work') + '.\n\n';
      if (it.questions.length) out += bullets(it.questions.map(q => md(q.ref) + ': ' + md(q.question)), {rest: k => 'And ' + plural(k, 'more open question') + ' (Chapter ' + chapter + ' · Validate).'});
    }
  }
  // Round 12 (GR-SRC-07): what the source does not say, raised with the source's owner (a finding treated "source
  // silent, raised with the owner", review-domain.js raisedFindings): open until the owner answers, listed as raised,
  // never as work the design has left undone (the readiness board counts it as treated).
  const raised = raisedFindings(p);
  if (raised.length) out += '### Raised with their owners\n\n' + (raised.length === 1 ? '1 finding asks' : count(raised.length) + ' findings ask') + ' what the source does not say. ' + (raised.length === 1 ? 'It was' : 'They were') + ' raised with the owner of the source: open until the owner answers, and not unfinished work of the design.\n\n' + bullets(raised.map(({finding: f, disposition: d}) => md(f.id) + ' · ' + md(f.title) + ': raised by ' + md(d.actor || d.reviewer || 'a reviewer') + ' on ' + (String(d.at || '').slice(0, 10) || 'a date not recorded') + ' with ' + md(d.reference || 'the owner')), {rest: k => 'And ' + plural(k, 'more finding') + ' raised with their owners (Chapter 11 · Validate).'});
  // The checks, by what they say, with their counts: the same items the readiness board counts (one counting function,
  // GR-SDD-18), findings to fix before items to confirm.
  const rules = (C?.rules || []).slice().sort((a, b) => (a.level === 'fix' ? 0 : 1) - (b.level === 'fix' ? 0 : 1) || b.count - a.count || a.chapter - b.chapter);
  if (rules.length) out += '### Checks to fix and to confirm\n\n' + bullets(rules.map(r => { const counted = plural(r.count, r.level === 'fix' ? 'finding' : 'item') + ' ' + (r.level === 'fix' ? 'to fix' : 'to confirm') + (r.refs.length ? ' (' + refList(r.refs, 6) + ')' : ''); return 'Chapter ' + r.chapter + ' · ' + (r.titles > 1 && r.details === 1 && r.detail ? md(clip(r.detail, 160)).replace(/[.]$/, '') + ' — ' + counted : md(clip(r.title, 90)) + (r.titles > 1 ? ' and ' + plural(r.titles - 1, 'similar check') : '') + ' — ' + counted + (r.details > 1 ? '; each record’s detail is in Chapter ' + r.chapter + ' · Validate' : r.detail ? ': ' + md(clip(r.detail, 160)) : '')); }), {rest: k => 'And ' + plural(k, 'more kind') + ' of check, ' + plural(rules.slice(LIST_MAX).reduce((n, r) => n + r.count, 0), 'more item') + ' (each chapter’s Validate).'});
  return out;
}
function appendixC(B) {
  const {p} = B, R = lensReport(p);
  let out = '## C. Domain lens\n\n';
  if (!R.lens || !R.chosen) return out + 'None recorded: no domain lens is chosen for this project' + (R.suggestion?.lensId ? '; the brief and the requirements use the words of one (Chapter 11 · Validate)' : '') + '. A lens is chosen by a person; it informs and blocks nothing.\n\n';
  out += md(R.text) + ' ' + md(R.rule) + '\n\n';
  out += table(['Concern', 'State', 'Addressed by', 'Next question'], R.concerns.map(c => [mdCell(c.title), mdCell(c.word || c.state), c.records.length ? refList(c.records.map(r => r.ref), 6) : '—', c.questions?.[0] ? mdCell(clip(c.questions[0], 140)) : '—']));
  return out;
}
function appendixD(B) {
  const q = 'chapter=11&annex=';
  const rows = [
    ['Requirement register, by group', 'Every requirement with its external id, statement, priority and source assertions, group by group, a page at a time', '/api/export?' + q + 'requirements&format=md&page=1 (also csv, json)'],
    ['Traceability matrix', 'Every requirement against each layer of the design, the curated links apart from the trails derived from them', '/api/export?' + q + 'matrix&format=csv'],
    ['Change journal', 'Every recorded change with its fields before and after and its affected records, a page at a time', B.journalAnnex],
    ['Architecture requirements specification', 'Each quality driver as a requirement with its scenario, target, verification and trace; constraints and assumptions', '/api/export?chapter=2&document=ars&format=md'],
    ['Component specifications', 'One specification per component: responsibilities, interfaces, data, requirements, quality, technology, protection and runtime', '/api/export?' + q + 'specifications&format=md (one: chapter=5&document=spec&id=)'],
    ['Interface specifications', 'The contracts as OpenAPI and AsyncAPI documents', '/api/export?chapter=8&format=openapi (and format=asyncapi)'],
    ['Figures', 'Every figure of section 5: each level’s overview with the detail of every group it folds, and the component diagram of every container, each fitting one page', '/api/export?' + q + 'figures&format=html (also pdf, and zip for the SVG files with their manifest)'],
    ['Chapter registers', 'Every record of each chapter with every field', '/api/export?chapter=1&format=md (chapters 1 to 10)'],
    ['Review registers', 'The review records: findings and treatments, delivery obligations, change review, performance and reasoning records', '/api/export?' + q + 'registers&format=md']
  ];
  return '## D. Annexes\n\nThe registers are separate exports, never printed in this document’s body. Each is read from the same saved records.\n\n' + table(['Annex', 'What it holds', 'How to export it'], rows.map(r => r.map(mdCell)));
}
function appendixE(B) {
  const {p, prov} = B;
  let out = '## E. Provenance\n\n' + prov.line + (prov.detail ? ' ' + prov.detail : '') + '\n\n';
  if (prov.chapters.length) out += table(['Chapter', 'Records', 'Drafted by Sol', 'Imported', 'Journey rules', 'By a person', 'AIW reference', 'Proposed by AIW', 'Confirmed'], prov.chapters.map(c => [c.chapter + ' · ' + c.title, count(c.total), count(c.sol), count(c.import), count(c.rules), count(c.person), count(c.reference), count(c.proposal), count(c.confirmed)]));
  out += 'People: ' + (prov.people.length ? named(prov.people.map(md)) + ', as the change journal, the imports and the reviews record them' : 'no person is recorded against a change, an import or a review') + '.\n\n';
  out += 'Sources:' + (prov.sources.length ? '\n\n' + bullets(prov.sources.map(s => md(s.title) + ' (' + md(s.kind) + (s.detail ? '; ' + md(s.detail) : '') + (s.hash ? '; SHA-256 ' + s.hash.slice(0, 16) + '…' : '') + ')'), {rest: k => 'And ' + plural(k, 'more source') + ' (Chapter 1 · Evidence).'}) : ' no source document is kept with the project.\n\n');
  out += evidenceTrail(B);
  const r = latestDesignReview(p), d = list(p.finalReview?.dispositions).length, g = list(p.finalReview?.governance);
  out += 'Reviewed: ' + (prov.total ? count(prov.confirmed) + ' of ' + plural(prov.total, 'record') + ' confirmed by a person' : 'no record to confirm') + '; ' + (r ? 'architect review ' + r.id + ' (' + r.outcome + ')' : 'no architect review recorded') + '; ' + plural(d, 'finding treatment') + ' recorded; ' + (g.length ? plural(g.length, 'governance record') : 'no governance record') + '. Nothing in this document is approved by being written down.\n\n';
  // Round 12 (GR-GOV-09): the records that name their source, the passages they cite or the basis of their claim, each
  // apart from what it says (provenance.js); the first LIST_MAX here, every one in the review registers.
  out += provenanceBlocksMarkdown(p, {heading: '**Where the records come from**', limit: LIST_MAX, rest: k => 'And ' + plural(k, 'more record') + ' with a provenance block, each in the review registers (Appendix D).'});
  return out;
}

// ---------------------------------------------------------------- the audience extras
// The delivery obligations (the delivery edition): each delivery action with its owner, due date, status, objects,
// acceptance and plateau. Format 1 prints "open: …" for an owner, a due date or an acceptance not stated; format 2 prints
// what is stated and names the rest once, in the part's open questions (round 24; the delivery edition alone builds this
// part, so they are not Appendix B's items).
function obligations(B) {
  const {p, O} = B, acts = list(p.finalReview?.actions), F1 = B.format < 2;
  let out = '# Delivery obligations\n\n';
  if (!acts.length) return out + none('no delivery obligation', 'Chapter 11 · Work · Delivery actions');
  B.totals = {...B.totals, 'delivery action': acts.length};
  for (const a of acts) {
    const owner = str(a.owner) && !fieldOpen(a, 'owner') ? md(a.owner) : '', acceptance = str(a.acceptance) ? md(a.acceptance) : '', plateau = a.plateauId ? ' Plateau: ' + a.plateauId + (plateausOf(p).find(x => x.id === a.plateauId) ? ' · ' + md(plateausOf(p).find(x => x.id === a.plateauId).title) : '') + '.' : '';
    const status = str(a.status || 'Planned').toLowerCase() + (a.status === 'Verified' ? '' : '; verification remains separate'), objects = ' Objects: ' + refList(list(a.objectIds).map(id => recordRef(p, id))) + '.';
    if (F1) { out += '**' + a.id + ' · ' + md(a.title) + '**: owner ' + (owner || 'open: owner not stated') + ', ' + (a.due ? 'due ' + a.due : 'open: due date not stated') + ', ' + status + '.' + objects + ' Acceptance: ' + (acceptance || 'open: acceptance not stated') + plateau + '\n\n'; continue; }
    for (const [v, words] of [[owner, 'owner'], [a.due, 'due date'], [acceptance, 'acceptance']]) if (!v) O.ask(a.id, 'delivery action', words);
    out += '**' + a.id + ' · ' + md(a.title) + '**: ' + [owner ? 'owner ' + owner : '', a.due ? 'due ' + a.due : '', status].filter(Boolean).join(', ') + '.' + objects + (acceptance ? ' Acceptance: ' + acceptance : '') + plateau + '\n\n';
  }
  return out + verificationSection(p,acts) + openQuestions(B, 'obligations', {scope: 'part', appendix: false});
}
function summaries(B) {
  const {p} = B, I = designIndex(p), cs = list(p.interfaces?.contracts), ds = list(p.interfaces?.data), envs = list(p.runtime?.environments), zones = list(p.runtime?.zones), plans = list(p.runtime?.plans);
  return '# The shape, interfaces and deployment in brief\n\n## The shape\n\n' + (I.comps.length ? plural(I.resp.length, 'responsibility', 'responsibilities') + ' are allocated to ' + plural(I.comps.length, 'application component') + ' (' + refList(I.comps.map(refOf)) + '); section 4 of the architecture edition specifies each.' : 'No application component is recorded yet.') + '\n\n## Interfaces\n\n' + (cs.length || ds.length ? plural(cs.length, 'interface contract') + ' (' + refList(cs.map(refOf)) + ') and ' + plural(ds.length, 'data definition') + ' are recorded; ' + plural(list(p.interfaces?.parties).length, 'external party', 'external parties') + '.' : 'No interface contract or data definition is recorded yet.') + '\n\n## Deployment\n\n' + (envs.length ? plural(envs.length, 'environment') + ', ' + plural(zones.length, 'zone') + ' and ' + plural(plans.length, 'runtime plan') + ' are recorded; ' + plans.slice(0, LIST_MAX).map(r => { const o = planOperation(p, r); return refOf(r) + ' ' + (o.availability ? md(o.availability.text) : 'no availability target'); }).join('; ') + (plans.length > LIST_MAX ? '; and ' + plural(plans.length - LIST_MAX, 'more plan') : '') + '.' : 'No environment is recorded yet.') + '\n\n';
}
function assurance(B) {
  const {p} = B, a = sourceAssurance(list(p.artefacts), p), controls = list(p.security?.controls), ev = list(p.security?.evidence), disp = list(p.finalReview?.dispositions), r = latestDesignReview(p);
  let out = '# Assurance\n\n';
  out += 'Source assertions: ' + (a.counts.assessed ? plural(a.counts.assessed, 'imported assessment') + ': ' + plural(a.counts.deliveryGaps, 'delivery gap') + ', ' + count(a.counts.missingEvidence) + ' without an evidence reference' + (a.counts.evidenceTreated ? ' (' + count(a.counts.evidenceTreated) + ' with a reviewed reason why none exists)' : '') + '. These are the source’s assertions, not verified delivery.' : 'no imported assessment.') + '\n\n';
  out += 'Controls: ' + (controls.length ? plural(controls.length, 'control') + ', ' + plural(new Set(ev.filter(e => e.kind === 'verification').map(e => e.controlId)).size, 'with a verification recorded', 'with a verification recorded') + '. A planned control is a design intent until evidence shows it works.' : 'none recorded.') + '\n\n';
  out += 'Review treatments: ' + plural(disp.length, 'finding treatment') + ' recorded; architect review: ' + (r ? r.id + ' · ' + r.outcome : 'none recorded') + '.\n\n';
  return out;
}

// ---------------------------------------------------------------- the edition
// Which parts each audience keeps (SDD-SPEC: editions, audiences and formats).
export const AUDIENCE_PARTS = {
  all: ['introduction', 'drivers', 'decisions', 'components', 'models', 'refinements', 'A', 'B', 'C', 'D', 'E'],
  delivery: ['introduction', 'components', 'models', 'obligations', 'A', 'D'],
  review: ['drivers', 'decisions', 'summaries', 'refinements', 'assurance', 'B', 'C', 'E']
};
// p: the project; options: {audience, meta (a freeze's {id, title, at, classification}), figures: {c4, figures(key) ->
// [figure], block(figure) -> Markdown} or null, editionLine, changes (since the last baseline), journalAnnex, format (2,
// what every export writes; 1 only for the suites that compare the formats, sdd-content.js), modules (true: format 2
// organises sections 1 and 4 by module when the project has modules, round 24; false only for the suites that compare
// the layouts)}.
// A caller outside the export's pass (a suite, a scratch run) gets one of its own, so the design is indexed once.
export function architectureMarkdown(p, options = {}) { return memoPass(p, () => editionMarkdown(p, options)); }
function editionMarkdown(p, {audience = 'all', meta = {}, figures = null, editionLine = '', changes = null, journalAnnex = '/api/export?chapter=11&document=changes&format=md&page=1 (also csv, json; a hundred changes a page)', format = SDD_FORMAT, modules = true} = {}) {
  if (format !== 1 && format !== SDD_FORMAT) throw Error('The architecture edition is printed in format 1 or ' + SDD_FORMAT + '.');
  const O = openCollector(format), S = documentStatus(p, meta), prov = provenanceReading(p), parts = new Set(AUDIENCE_PARTS[audience] || AUDIENCE_PARTS.all);
  let counts = null; try { counts = sddOpenCounts(p); } catch { counts = null; }
  const F = figures || {c4: {components: [], single: [], unplaced: [], environment: null, otherEnvironments: []}, figures: () => [], block: () => '', drawn: false};
  const B = {p, O, S, prov, meta, name: solutionName(p), editionLine, changes, journalAnnex, counts, F, memo: new Map(), format, parts, totals: {}, L: format >= 2 && modules !== false ? moduleLayout(p) : null};
  // The front matter first: it marks the narrative's open fields that Appendix B lists.
  const front = cover(B), control = documentControl(B);
  // Every part is built for every audience, in reading order, so that the open items Appendix B lists (and their first
  // "open: …" markers) are the same whoever reads; each audience prints its own parts. O.section tells the collector
  // which section asks what a record leaves open (format 2: sections 2, 3 and 4 list it).
  const part = (n, build) => { O.section = n; const out = build(); O.section = 0; return out; };
  const built = {introduction: part(1, () => introduction(B) + explanations(B, 1)), drivers: part(2, () => drivers(B)) + explanations(B, 2), decisions: part(3, () => decisions(B)) + explanations(B, 3), summaries: parts.has('summaries') ? summaries(B) : '', components: part(4, () => components(B)) + explanations(B, 4), models: part(5, () => models(B) + explanations(B, 5)), obligations: parts.has('obligations') ? part('obligations', () => obligations(B)) : '', refinements: part(6, () => refinements(B) + explanations(B, 6)), assurance: parts.has('assurance') ? assurance(B) : ''};
  // Appendix A runs before B so that B lists what A marks open.
  Object.assign(built, {A: appendixA(B), D: appendixD(B)}); Object.assign(built, {B: appendixB(B), C: appendixC(B), E: appendixE(B)});
  // The content standard (sdd-content.js; SDD-SPEC "Content standard", round 12 C2): sections 2, 3 and 4 are read as a
  // reader reads them. A section that is a skeleton (one statement in five or more open, or most of its records
  // drafted by rules) says so above its content instead of pretending. The reading of the sections this audience
  // prints is the edition's content readiness: one line on the cover, and the structure the Output screen and the JSON
  // export carry. Nothing here changes a record.
  const CONTENT_PARTS = [['drivers', 2], ['decisions', 3], ['components', 4]], records = {2: list(p.quality?.drivers), 3: list(p.decisions?.records), 4: [...list(p.realisation?.components), ...list(p.interfaces?.parties)]};
  const full = contentReading(CONTENT_PARTS.map(([k]) => built[k]).join(''), {records, format});
  for (const [k, n] of CONTENT_PARTS) { const s = full.sections.find(x => x.n === n); if (s?.skeleton) built[k] = built[k].replace(/^(# \d\. [^\n]+\n\n)/, '$1' + skeletonBanner(s, format) + '\n\n'); }
  const shown = CONTENT_PARTS.every(([k]) => parts.has(k)) ? full : contentReading(CONTENT_PARTS.filter(([k]) => parts.has(k)).map(([k]) => built[k]).join(''), {records, format});
  const content = {score: shown.score, pass: shown.pass, records: shown.records, met: shown.met, line: shown.line, sections: shown.sections.map(({findings: _f, ...s}) => s), findings: shown.findings};
  const body = ['introduction', 'drivers', 'decisions', 'summaries', 'components', 'models', 'obligations', 'refinements', 'assurance'].filter(k => parts.has(k)).map(k => built[k]);
  const appendix = ['A', 'B', 'C', 'D', 'E'].filter(x => parts.has(x));
  if (appendix.length) body.push('# 7. Appendix\n\n' + appendix.map(x => built[x]).join(''));
  const text = body.join('');
  // The contents, from the headings (levels 1 and 2), with the anchors every format gives them.
  const slug = slugger(), heads = [];
  for (const line of (front + control + '## Contents\n\n' + text).split('\n')) { const m = /^(#{1,6}) (.+)$/.exec(line); if (m) heads.push({level: m[1].length, title: m[2], anchor: slug(m[2])}); }
  const top = heads.filter(h => h.level === 1 && !/^[A-Z0-9 ]+$/.test(unescapeMd(h.title)) || h.level === 2 && /^(?:Document control|Contents)$/.test(h.title)), lines = [];
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i]; if (h.level !== 1 || !top.includes(h)) continue;
    const kids = []; for (let j = i + 1; j < heads.length && heads[j].level > 1; j++) if (heads[j].level === 2) kids.push('[' + heads[j].title + '](#' + heads[j].anchor + ')');
    lines.push('[' + h.title + '](#' + h.anchor + ')' + (kids.length ? ': ' + kids.join(' · ') : ''));
  }
  const contents = '## Contents\n\n<!-- aiw:contents -->\n' + lines.join('\n\n') + '\n<!-- aiw:/contents -->\n\n';
  // The cover says how far the content has come against the standard (SDD-SPEC principle 3), after the edition line;
  // format 2 names its format after the cover (D-24-06: the content reader reads either; renderers skip the marker).
  const cover_ = front.replace('\n<!-- aiw:/cover -->', '\n\nContent readiness: ' + content.line + '\n<!-- aiw:/cover -->' + (format >= 2 ? '\n' + formatMarker(format) : ''));
  const markdown = (cover_ + control + contents + text).replace(/\n{3,}/g, '\n\n');
  // Each cause with the record fields it stands for (`fields`; none for a cause that is not a field), so that a field is
  // seen to be counted once.
  const open = [...O.items.values()].map(it => ({chapter: it.chapter, kind: it.kind, cause: it.label, state: it.state, count: it.refs.length, records: it.refs, questions: it.questions, fields: it.fields}));
  return {markdown, sections: heads.map(h => ({level: h.level, title: unescapeMd(h.title), anchor: h.anchor})), openItems: {total: open.reduce((n, x) => n + x.count, 0), causes: open, checks: counts}, provenance: {line: prov.line, detail: prov.detail, by: prov.by, confirmed: prov.confirmed, total: prov.total}, status: S, content};
}
