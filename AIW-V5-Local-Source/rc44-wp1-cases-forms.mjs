// rc44, work package 1, slice S1 (audit/rc44/design/wp1-knowledge.md, section g): knowledge forms and the concept register.
// A concept is one maintained identity (knowledge.concepts[], KN) whose forms are ordinary governed claims carrying one
// typed field, `form`, each on its own exact passage. Nine form types in two tiers: teaching (definition, mechanism,
// example, exercise) and decision-bearing (applicability, selection, composition, calculation, verification).
// What these cases hold:
//   - a form is stored whole or refused, never stored without its form; every item names its lines and a verbatim quote;
//   - a concept is reviewed by a second signed-in person: never its author, an editor, an agent account, a draft by Sol
//     or a request marked as an import, and only once every form was verified by someone other than its author;
//   - candidate and unreleased forms are inert: no check, eligibility gate, score, conformance reading, SDD or Sol
//     packet of a design project reads them, and decision-bearing content is returned in state `released` only;
//   - a document with none of the new records reads as it did on rc.10.73.42 (the BASELINE readings below were taken on
//     commit 94dbd4f with `node rc44-wp1-knowledge-validate.mjs --print-baseline`).
// Synthetic fixtures only (rc44-wp1-knowledge-fixtures.mjs). Nothing here is knowledge; productionAccepted stays false.
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import * as F from './rc44-wp1-knowledge-fixtures.mjs';
import * as K from './public/knowledge-governance.js';
import * as rv from './public/review-domain.js';
import {architectureMarkdown} from './public/sdd-architecture.js';
import {sddReadiness} from './public/readiness-model.js';
import {digest, sha256} from './public/brain-integrity.js';
import {claimsReview, isReviewCommand} from './authorship.js';
import {architectureUnitIssues} from './public/architecture-knowledge-unit.js';
import {domainKnowledge} from './public/domain-knowledge.js';
import {knowledgeStructures} from './public/knowledge-structure.js';
import {architectureKnowledgeSnapshot} from './public/architecture-knowledge.js';
import {architectureIntelligence} from './public/architecture-intelligence.js';
import {intelligencePacket} from './public/intelligence-context.js';
import {brainContext} from './public/aiw-brain.js';
import {realizations, realizationCriteria, selectionGate, selectionState, technologyRealisationFindings} from './public/technology-realisation-domain.js';
import {productComparison} from './public/product-comparison.js';
import {arsGate, arsMarkdown} from './public/ars-document.js';
import {recordGraph} from './public/record-graph.js';
import {architectureBrain, brainSources} from './public/architecture-brain.js';
import {reasoningPacket, validateReasoningOutput, guardReasoning, settleReasoning, adoptReasoning} from './public/brain-reasoning.js';
import {stewardshipReading} from './public/knowledge-stewardship.js';
import {mockAssessment, mockReview} from './mock-llm-provider.mjs';
import {knowledgeGraph} from './public/knowledge-graph.js';
import {knowledgeConceptCoverage} from './public/knowledge-coverage.js';
import {neutraliseImportedAuthority} from './recovery-service.js';

const AT = F.AT, clone = v => structuredClone(v);
const mods = async () => ({CF: await import('./public/concept-form.js'), KC: await import('./public/knowledge-concepts.js'), CC: await import('./public/knowledge-concept-commands.js')});
const CONCEPT = {conceptId: 'SYN-P001', title: 'Transactional outbox', kind: 'pattern', family: 'Reliable publication', scope: ['data-owner', 'interaction'], stages: [5, 8], lenses: ['integrity', 'reliability'], steward: 'Integration guild', reviewDue: '2027-11-16', reviewTriggers: ['platform-contract'], notAdopted: ['A broker-side transaction: the handbook rejects it for this case.'], forms: []};
const CONCEPT_REVIEW = {decision: 'verified', reviewer: 'Synthetic second person', reason: 'Checked the identity, each form and its membership.', reviewed: true, identityChecked: true, formsChecked: true, crosswalkChecked: true};
const ctx = f => ({excerpt: F.SYN_P001.slice(f.passage[0] - 1, f.passage[1]).join('\n'), lineStart: f.passage[0]});
const today = () => new Date().toISOString().slice(0, 10);

// A marker placed everywhere a form claim holds words of its own: its statement, a text of the form, its first condition
// and its structured unit. Each holds the marker's own text, so one search finds any of them in a reading.
const FORM_TEXT = {definition: (f, m) => { f.short += m; }, mechanism: (f, m) => { f.steps[0].text += m; }, applicability: (f, m) => { f.useWhen[0].text += m; }, selection: (f, m) => { f.alternatives[0].chooseWhen += m; }, composition: (f, m) => { f.roles[0].responsibility += m; }, calculation: (f, m) => { f.purpose += m; }, verification: (f, m) => { f.scenarios[0].given += m; }, example: (f, m) => { f.scenario += m; }, exercise: (f, m) => { f.items[0].prompt += m; }};
function marked(payload, mark) {
  const q = clone(payload); q.statement += ' ' + mark + '-STATEMENT'; FORM_TEXT[q.form.type](q.form, ' ' + mark + '-FORM');
  if (q.conditions.length) q.conditions[0] += ' ' + mark + '-CONDITION'; if (q.architectureUnit) q.architectureUnit.mechanism += ' ' + mark + '-UNIT';
  return q;
}
// What a person records to mark a project as a knowledge library (knowledge.library): concepts, topics and forms are
// written in a library only (ruling B2 of 2026-11-18).
const LIBRARY_MARK = {enabled: true, reason: 'This project authors one tranche of the synthetic handbook.', reviewer: 'Synthetic steward', reviewed: true};
// A library project as the commands build it: marked as a library by a person (`steward`), then a source, a draft
// concept, one claim per form, the forms attached; then, as asked, each form verified by `reviewer`, the concept
// verified by `reviewer`, the claims released and activated by `releaser`. Every step goes through applyConceptCommand
// with the commit's author stated.
async function library({forms = F.FORM_ORDER, verify = false, review = false, release = false, activate = false, base = null, author = F.person, mark = ''} = {}) {
  const {CC} = await mods(); let p = base || F.blankProject();
  const k = (type, payload, actor = 'importer', opts = F.person(actor)) => { const r = CC.applyConceptCommand(p, {type: 'knowledge.' + type, payload}, AT, actor, opts); p = r.document; return r.selected; };
  if (p.knowledge?.library?.enabled !== true) k('library', LIBRARY_MARK, 'steward');
  const sourceId = k('source', F.sourcePayload('SYN-P001 Transactional outbox', F.SYN_P001), 'importer', author('importer'));
  const conceptRecordId = k('concept', CONCEPT, 'importer', author('importer')), all = F.p001Forms(), claimIds = {};
  for (const t of forms) claimIds[t] = k('claim', mark ? marked(F.formClaim(sourceId, 'SYN-P001', all[t]), mark) : F.formClaim(sourceId, 'SYN-P001', all[t]), 'importer', author('importer'));
  k('concept', {...CONCEPT, id: conceptRecordId, forms: forms.map(t => ({type: t, claimId: claimIds[t]}))}, 'importer', author('importer'));
  if (verify) for (const t of forms) k('review', {...F.REVIEW, formChecked: true, id: claimIds[t]}, 'reviewer');
  if (review) k('concept-review', {...CONCEPT_REVIEW, id: conceptRecordId}, 'reviewer');
  let releaseId = null;
  if (release) releaseId = k('release', {...F.REVIEW, title: 'Synthetic integration concepts 1', claimIds: forms.map(t => claimIds[t])}, 'releaser');
  if (activate) k('activate', {...F.REVIEW, id: releaseId, stamp: K.knowledgeStamp(p)}, 'releaser');
  return {k, sourceId, conceptRecordId, claimIds, releaseId, get document() { return p; }, set document(v) { p = v; }};
}

// ------------------------------------------------------------------------------------------------ old documents
// What a document with none of the new records reads as. `--print-baseline` prints this object; BASELINE is its value
// on commit 94dbd4f (rc.10.73.42). The SDD prints the day it is built, so that one date is set aside.
export function oldDocumentReadings() {
  const bank = F.bankProject(), L = F.legacyKnowledge(), p = L.document, w = K.applyKnowledgeCommand(p, {type: 'knowledge.withdraw', payload: {...F.REVIEW, id: L.structured, stamp: K.knowledgeImpactStamp(p, L.structured)}}, AT, 'architect-b').document;
  const sdd = d => sha256(architectureMarkdown(d).markdown.split(today()).join('DATE'));
  return {
    bank: {findings: sha256(JSON.stringify(rv.inheritedFindings(bank))), findingCount: rv.inheritedFindings(bank).length, chapterStamps: sha256(JSON.stringify(rv.computeChapterStamps(bank))), fingerprint: rv.designFingerprint(bank), sourceStamp: rv.reviewSourceStamp(bank), summaries: sha256(JSON.stringify(rv.chapterSummaries(bank))), sdd: sdd(bank), hasKnowledgeKey: 'knowledge' in bank},
    legacy: {knowledge: sha256(JSON.stringify(p.knowledge)), released: sha256(JSON.stringify(K.releasedClaims(p))), releasedCount: K.releasedClaims(p).filter(x => x.eligible).length, checksum: p.knowledge.releases[0].checksum, stamp: K.knowledgeStamp(p), findings: sha256(JSON.stringify(K.knowledgeFindings(p))), withdrawnFindings: sha256(JSON.stringify(K.knowledgeFindings(w))), withdrawnCount: K.knowledgeFindings(w).length, withdrawnKnowledge: sha256(JSON.stringify(w.knowledge))},
    // The fifteen command types that existed before rc44, each sent through the old entry (rc44-wp1-knowledge-fixtures.mjs legacyWalk).
    walk: (walked => ({knowledge: sha256(JSON.stringify(walked.knowledge)), released: sha256(JSON.stringify(K.releasedClaims(walked))), releasedCount: K.releasedClaims(walked).filter(x => x.eligible).length, findings: sha256(JSON.stringify(K.knowledgeFindings(walked))), stamp: K.knowledgeStamp(walked), types: new Set(walked.knowledge.history.map(h => h.type)).size}))(F.legacyWalk())
  };
}
const BASELINE = {bank: {findings: 'e188b2ccd284a1ab6d7be71b78f989075419b7dfcdcb3a8fdba5509041a6212a', findingCount: 558, chapterStamps: '644600e67df72b09cf78265450199b1645f6f83d13bf52fe699dca8e5c3a7ad2', fingerprint: '61b50cbbcca55207', sourceStamp: '61b50cbbcca55207', summaries: 'dc5268f93d9c7ca3558b9a2d33cf1927db1f8e169288c4130c828ffce2521dd3', sdd: '5e6779324f55d1cd27c938f40f5584779c3d6901f91eccc18ae538f3725372a8', hasKnowledgeKey: false}, legacy: {knowledge: '07138e2668709052750ada4e3dd0eca5eb4fcc73f410292d013da764204e18ec', released: '7f18d3ddfed6a21b3fb185624209d20f14829617685494f0b9c10fa43ebb73bf', releasedCount: 2, checksum: '8471646dd848bbd34a59c6b438d354953ff016c92aed10aba6d44b734e912e84', stamp: '2d6d7243e37f8333b65a26149345954f02ee48b06e5985f0672f4e4aff0b2d01', findings: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945', withdrawnFindings: 'a935821fd3ed19de9a35185d894c328c7d40588b0c64acb2017f697ee9b154e1', withdrawnCount: 1, withdrawnKnowledge: '1383330f720ae764489709941c85894a7353d910a26463e1d480c8579a9ced3a'},
  // Added in the fix-up round (should-fix 10): taken with the product code of 94dbd4f, as the two above were.
  walk: {knowledge: '1d941af67eaa8415252be34a6a21046ec8add8213891f53a7a0c1845721e15d1', released: '2541d47f48665273032b64800a97b9b6a789dccfcc57c3fb6aa88976cb7074d4', releasedCount: 4, findings: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945', stamp: '64f34fa0187c90c8c9001cf974c0ee5c6c3e8bc8d669268899c2be77f48064d6', types: 15}};

// The readings of a design project that a candidate must never move: the checks and readiness, the eligibility of
// knowledge, what released knowledge offers every reader, the SDD, the contextual reading, the Brain's context and
// Sol's packet; and, named one by one, the gates and comparisons a decision passes: the eligibility gate of each of the
// reference's nine technology selections (its criteria, what is pending or unassessed, its state), the comparison of
// products for each (what released knowledge says of each option against the criteria), the Chapter 7 conformance
// findings and the gate of the requirements specification. A finding's `stamp` holds the fingerprint of the whole
// document (knowledge included, as on rc.10.73.42, where a plain candidate source moves it too), so it is compared apart.
// They are the 27 readings the adversarial review of this slice compared (ruling B1 of 2026-11-18), each read whole: the
// checks (1 to 6), the gates and comparisons of a decision (7 to 10), the requirements specification as text (11), what
// released knowledge offers every reader (12 to 16), the SDD (17), the contextual reading (18), the Brain's context, its
// knowledge and the sources it cites (19, 20, 25), Sol's packet in three modes (21 to 23; the review asked for a mode
// "draft", which is not one and throws on any document: "design" is read in its place), the record graph (24), the
// reasoning packet of a decision (26) and the chapter stamps (27).
const PROMPT = 'Explain the transactional outbox and when a relay may repeat a notice.';
const plainJSON = v => JSON.parse(JSON.stringify(v, (_k, x) => x instanceof Map || x instanceof Set ? [...x] : x));
function designReadings(p) {
  const requirement = p.artefacts.find(a => a.type === 'requirement').id, packet = mode => intelligencePacket(p, {chapter: 1, objectId: requirement, mode, prompt: PROMPT}), context = brainContext(p, {id: requirement, chapter: 1});
  return plainJSON({
    findings: rv.inheritedFindings(p).map(({stamp: _stamp, ...f}) => f), summaries: rv.chapterSummaries(p), blockers: rv.reviewBlockerCount(p), readiness: sddReadiness(p), coverage: rv.traceCoverage(p), capacity: rv.reviewCapacity(p),
    selectionGates: realizations(p).map(r => ({id: r.id, criteria: realizationCriteria(p, r.id), gate: selectionGate(p, r), state: selectionState(p, r)})), productComparisons: realizations(p).map(r => productComparison(p, r.id)),
    realisationFindings: technologyRealisationFindings(p).map(({stamp: _stamp, ...f}) => f), specificationGate: arsGate(p), specification: arsMarkdown(p),
    released: K.releasedClaims(p), knowledgeFindings: K.knowledgeFindings(p), domain: domainKnowledge(p), structures: knowledgeStructures(p), snapshot: architectureKnowledgeSnapshot(p),
    sdd: architectureMarkdown(p).markdown, intelligence: architectureIntelligence(p, {id: requirement}), brain: context.knowledge, brainContext: context,
    packetMind: packet('mind'), packetDesign: packet('design'), packetChallenge: packet('challenge'),
    recordGraph: recordGraph(p), brainSources: brainSources(p, architectureBrain(p, context, {query: PROMPT})), reasoning: reasoningPacket(p, {task: 'decisions', ids: ['M:8:rest']}), chapterStamps: rv.computeChapterStamps(p)
  });
}
// The knowledge workspace's own lists: what a person who curates knowledge is shown there. They are expected to move.
const workspaceReadings = p => plainJSON({graph: knowledgeGraph(p), coverage: knowledgeConceptCoverage(p, 'SYN-P001'), history: K.knowledgeMarkdown(p)});
// Every path at which two readings differ (a list that changed length is one path).
function moved(a, b, path = '', out = []) {
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b) && (!Array.isArray(a) || a.length === b.length)) for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) moved(a[k], b[k], path + '.' + k, out);
  else out.push(path.slice(1));
  return out;
}
// A design document that holds a library's knowledge anyway, as a recovery or an older library might leave it: written
// into the document, the library mark not carried over.
const graft = (design, library) => { const q = clone(design), {library: _mark, ...knowledge} = clone(library.knowledge); q.knowledge = knowledge; return q; };

export const cases = [];
const add = (name, run) => cases.push({name, run});

// ------------------------------------------------------------------------------------------------ 1
add('S1.1 (fails on rc.10.73.42): a claim sent with a form is stored with its form, or refused; it is never stored without it', async () => {
  const f = F.p001Forms().definition; let CC = null; try { ({CC} = await mods()); } catch { CC = null; }
  let p = F.blankProject(); const old = (type, payload) => { const r = K.applyKnowledgeCommand(p, {type: 'knowledge.' + type, payload}, AT, 'importer'); p = r.document; return r.selected; };
  const sourceId = old('source', F.sourcePayload('SYN-P001 Transactional outbox', F.SYN_P001)), payload = F.formClaim(sourceId, 'SYN-P001', f);
  // The entry that existed before rc44, with no form capability: refused.
  let stored = null; try { const id = old('claim', payload); stored = p.knowledge.claims.find(c => c.id === id); } catch (e) { assert.match(e.message, /form/i, 'refused for its form: ' + e.message); }
  assert(!stored || stored.form, 'a claim sent with a form was stored without it (the form was silently dropped)');
  assert.equal(stored, null, 'without the form capability a form claim is refused, never stored');
  assert(CC, 'public/knowledge-concept-commands.js exists');
  const q = (type, body, opts = F.importedBy('importer')) => { const r = CC.applyConceptCommand(p, {type: 'knowledge.' + type, payload: body}, AT, 'importer', opts); p = r.document; return r.selected; };
  // Forms are written in a knowledge library (ruling B2): the project is marked as one by a person first.
  assert.throws(() => q('claim', payload), /are written in a knowledge library/); q('library', LIBRARY_MARK, F.person('importer'));
  q('concept', CONCEPT); const id = q('claim', payload), c = p.knowledge.claims.find(x => x.id === id);
  assert.deepEqual(c.form, f.content, 'stored with its form');
  assert.equal(c.authoredAs, 'import', 'and with how it was authored');
  assert.deepEqual([c.claimType, c.predicate, c.subjectId, c.lineStart, c.lineEnd], ['definition', 'is defined as', 'SYN-P001', 5, 7]);
  assert.equal(c.review, undefined, 'a candidate: nothing is reviewed by saving it');
  assert.equal(q('claim', payload, F.agent('bot')) && p.knowledge.claims.at(-1).authoredAs, 'agent', 'an agent account may send a candidate; it is recorded as an agent\'s');
  assert.equal(q('claim', payload, F.solDraft('importer')) && p.knowledge.claims.at(-1).authoredAs, 'sol-draft');
  assert.equal(q('claim', payload, F.person('importer')) && p.knowledge.claims.at(-1).authoredAs, 'person');
  { const r = CC.applyConceptCommand(p, {type: 'knowledge.claim', payload}, AT, 'importer'); assert.equal(r.document.knowledge.claims.at(-1).authoredAs, 'import', 'a request that states no author is never taken for a person\'s'); }
});

// ------------------------------------------------------------------------------------------------ 2
add('S1.2: each of the nine shapes round-trips; an unknown field, an over-limit list, lines outside the passage, a quote not in its lines, a missing passage or quote, a number outside a quote in a decision-bearing form, a claimed evidence level and a reserved field are each refused by name', async () => {
  const {CF} = await mods(), all = F.p001Forms();
  assert.deepEqual(CF.FORM_TYPES, F.FORM_ORDER);
  assert.deepEqual(Object.fromEntries(CF.FORM_TYPES.map(t => [t, CF.FORM_TIER[t]])), {definition: 'teaching', mechanism: 'teaching', applicability: 'decision', selection: 'decision', composition: 'decision', calculation: 'decision', verification: 'decision', example: 'teaching', exercise: 'teaching'});
  for (const t of CF.FORM_TYPES) {
    const f = all[t];
    assert.deepEqual([CF.FORM_CLAIM_TYPE[t], CF.FORM_PREDICATE[t]], F.CLAIM_OF[t], t + ': fixed claim type and predicate');
    assert.deepEqual(CF.conceptFormIssues(f.content, ctx(f)), [], t + ' is valid');
    assert.deepEqual(CF.conceptFormRecord(f.content, ctx(f)), f.content, t + ' round-trips');
    assert.equal(claimsReview(F.formClaim('KS-0001', 'SYN-P001', f)), null, t + ': a valid form claims no review, so an import or an agent account is not refused for its content');
  }
  { const f = all.definition, padded = {...clone(f.content), short: '  ' + f.content.short + '  '}; assert.equal(CF.conceptFormRecord(padded, ctx(f)).short, f.content.short, 'texts are trimmed'); }
  const refused = (type, change, pattern, context = null) => { const f = all[type], form = clone(f.content); change(form); const issues = CF.conceptFormIssues(form, context || ctx(f)); assert(issues.length, type + ' with ' + pattern + ' is refused'); assert.match(issues.join(' '), pattern); assert.throws(() => CF.conceptFormRecord(form, context || ctx(f)), pattern); return issues; };
  refused('definition', f => { f.approvedBy = 'someone'; }, /definition has an unsupported field: approvedBy/);
  refused('applicability', f => { f.useWhen[0].weight = 3; }, /applicability\.useWhen\[0\] has an unsupported field: weight/);
  refused('definition', f => { f.distinctions = Array.from({length: 9}, () => clone(f.distinctions[0])); }, /definition\.distinctions holds 9 items; at most 8/);
  refused('exercise', f => { f.items = Array.from({length: 10}, () => clone(f.items[0])); }, /exercise\.items holds 10 items; at most 9/);
  // A field named as something every object inherits is an unknown field like any other.
  refused('applicability', f => { f.useWhen[0].constructor = 'hidden'; }, /applicability\.useWhen\[0\] has an unsupported field: constructor/);
  refused('definition', f => { f.toString = 'hidden'; }, /definition has an unsupported field: toString/);
  refused('applicability', f => { f.useWhen[0] = JSON.parse(JSON.stringify(f.useWhen[0]).replace('{', '{"__proto__":{"reviewed":true},')); }, /applicability\.useWhen\[0\] has an unsupported field: __proto__/);
  for (const type of ['constructor', '__proto__', 'toString', 7, null]) assert.match(CF.conceptFormIssues({type, v: 1}, ctx(all.definition)).join(' '), /Choose a supported form type/);
  // A value nested more deeply than any form is refused with a sentence, never by exhausting the stack (a form is read again on every read).
  { let deep = 'x'; for (let i = 0; i < 20000; i++) deep = [deep]; const nest = {}; { let o = nest; for (let i = 0; i < 20000; i++) { o.a = {}; o = o.a; } }
    refused('definition', f => { f.extra = deep; }, /definition\.extra(?:\[0\])+ is nested more deeply than a form holds/);
    refused('applicability', f => { f.useWhen[0].text = nest; }, /applicability\.useWhen\[0\]\.text(?:\.a)+ is nested more deeply than a form holds/);
    refused('applicability', f => { f.useWhen = [deep]; }, /applicability\.useWhen\[0\](?:\[0\])+ is nested more deeply than a form holds/); }
  refused('mechanism', f => { f.steps[0].at = [9, 9]; }, /mechanism\.steps\[0\] cites lines 9.9, outside the passage \(lines 10.13\)/);
  refused('mechanism', f => { f.steps[0].at = [12, 14]; }, /mechanism\.steps\[0\] cites lines 12.14, outside the passage/);
  refused('mechanism', f => { f.steps[0].at = [12, 11]; }, /mechanism\.steps\[0\] names no lines/);
  refused('mechanism', f => { f.steps[1].quote = 'the relay publishes every notice exactly once'; }, /mechanism\.steps\[1\]: the quote is not found in lines 11.11/);
  refused('mechanism', f => { f.steps[1].at = [12, 12]; }, /mechanism\.steps\[1\]: the quote is not found in lines 12.12/);
  refused('applicability', f => { delete f.useWhen[0].at; }, /applicability\.useWhen\[0\] names no lines of the passage/);
  refused('applicability', f => { delete f.useWhen[0].quote; }, /applicability\.useWhen\[0\] has no verbatim quote/);
  refused('applicability', f => { f.avoidWhen[0].quote = 'only reads'; }, /applicability\.avoidWhen\[0\] has no verbatim quote \(12 to 240 characters\)/);
  refused('applicability', f => { delete f.guaranteeBoundary.quote; }, /applicability\.guaranteeBoundary has no verbatim quote/);
  refused('verification', f => { delete f.metric.at; }, /verification\.metric names no lines of the passage/);
  refused('definition', f => { delete f.quotes; }, /definition needs a verbatim quote of the passage for each of its texts \(short\)/);
  refused('calculation', f => { f.quotes.pop(); }, /calculation needs a verbatim quote of the passage for each of its texts \(purpose, relation, bounds\)/);
  refused('definition', f => { f.quotes = [{field: 'short', quote: 'a durable outbox guarantees delivery'}]; }, /definition\.quotes\[0\] is not found in the passage/);
  // Numbers: free in a teaching form, and in a decision-bearing form only where the item's own quote holds them.
  { const f = all.mechanism, form = clone(f.content); form.steps[0].text += ' Within 30 seconds.'; assert.deepEqual(CF.conceptFormIssues(form, ctx(f)), [], 'a teaching form may state a number'); }
  refused('applicability', f => { f.useWhen[0].text += ' Within 30 seconds.'; }, /applicability\.useWhen\[0\]\.text states the number 30, which its quote does not contain/);
  refused('calculation', f => { f.bounds += ' At most 15 minutes.'; }, /calculation\.bounds states the number 15, which no quote given for bounds contains/);
  refused('composition', f => { f.parameters[0].selectionBasis = 'Use 50 rows.'; }, /composition\.parameters\[0\]\.selectionBasis states the number 50/);
  { const f = all.calculation, form = clone(f.content); form.workedValues[0].name = 'outage of 120 seconds'; assert.deepEqual(CF.conceptFormIssues(form, ctx(f)), [], 'a number its quote holds is allowed'); }
  refused('selection', f => { f.variants[0].name = 'Polling every 30 seconds'; }, /selection\.variants\[0\]\.name states the number 30/);
  // The model kind of a calculation is an identifier (ruling B7 and should-fix 9; the first build read it as a label and refused 'queue-model-2' for its digit): free text is refused, an identifier may hold digits. Case S1.21.
  refused('calculation', f => { f.modelKind = 'queue model 2'; }, /calculation\.modelKind is an identifier/);
  { const f = all.verification, form = clone(f.content); form.scenarios[0].id = 'SYN-P001-T2'; assert.deepEqual(CF.conceptFormIssues(form, ctx(f)), [], 'an identifier is not a stated number'); }
  refused('calculation', f => { f.workedValues[0].evidenceLevel = 'proposed'; }, /calculation\.workedValues\[0\]: a worked value is illustrative/);
  refused('composition', f => { delete f.parameters[0].example.evidenceLevel; }, /composition\.parameters\[0\]\.example: a worked value is illustrative/);
  // Evidence levels are what the source says of itself; a result is never claimed here.
  assert.deepEqual(CF.EVIDENCE_LEVELS, ['illustrative', 'proposed', 'reported-executed-by-source']);
  for (const level of ['passed', 'pass', 'executed', 'observed', 'verified']) refused('verification', f => { f.scenarios[0].evidenceLevel = level; }, new RegExp('verification\\.scenarios\\[0\\]\\.evidenceLevel: "' + level + '" is not a level a source states of itself'));
  refused('example', f => { f.evidenceLevel = 'confirmed in production'; }, /example\.evidenceLevel: "confirmed in production" is not a level/);
  { const f = all.verification, form = clone(f.content); delete form.scenarios[0].evidenceLevel; assert.deepEqual(CF.conceptFormIssues(form, ctx(f)), [], 'an absent level reads UNKNOWN and is allowed'); }
  // Reserved names: a form records what a passage says and reviews nothing.
  refused('verification', f => { f.scenarios[0].status = 'verified'; }, /verification\.scenarios\[0\] must not carry "status"/);
  refused('definition', f => { f.reviewed = true; }, /definition must not carry "reviewed"/);
  refused('applicability', f => { f.guaranteeBoundary.decision = 'accepted'; }, /applicability\.guaranteeBoundary must not carry "decision"/);
  refused('composition', f => { f.roles[0].confirmed = true; }, /composition\.roles\[0\] must not carry "confirmed"/);
  // Vocabularies, versions and bounds.
  refused('definition', f => { f.v = 2; }, /definition: version 1 is the only form version/);
  refused('definition', f => { f.type = 'opinion'; }, /Choose a supported form type/);
  refused('definition', f => { f.short = 'x'.repeat(401); }, /definition\.short holds 401 characters; at most 400/);
  refused('definition', f => { delete f.short; }, /definition\.short is required/);
  refused('composition', f => { f.relations[0].verb = 'depends-on'; }, /composition\.relations\[0\]\.verb: choose one of requires, /);
  refused('composition', f => { f.relations[0].target = {conceptId: 'not an id'}; }, /composition\.relations\[0\]\.target names a concept id, an alias \(scheme and id\) or a label/);
  refused('composition', f => { f.relations[0].target = {conceptId: 'SYN-P002', label: 'two at once'}; }, /composition\.relations\[0\]\.target names a concept id, an alias/);
  { const f = all.composition, form = clone(f.content); form.relations[0].target = {alias: {scheme: 'handbook', aliasId: 'SYN-P002'}}; assert.deepEqual(CF.conceptFormIssues(form, ctx(f)), [], 'an alias target is a target'); }
  refused('composition', f => { f.roles[0].recordKind = 'microservice'; }, /composition\.roles\[0\]\.recordKind: choose one of responsibility, /);
  refused('composition', f => { f.invariants[0].kind = 'vibes'; }, /composition\.invariants\[0\]\.kind: choose one of identity, /);
  refused('exercise', f => { f.items[0].level = 'expert'; }, /exercise\.items\[0\]\.level: choose one of beginner, intermediate, advanced/);
  refused('exercise', f => { f.items[0].stage = 'party'; }, /exercise\.items\[0\]\.stage: choose one of problem, /);
  refused('applicability', f => { f.useWhen = []; f.avoidWhen = []; f.prerequisites = []; delete f.guaranteeBoundary; }, /applicability holds no content/);
  refused('example', f => { f.numbersAre = 'measured'; }, /example\.numbersAre: choose one of teaching-assumptions/);
  refused('mechanism', f => { f.steps[0].n = '1'; }, /mechanism\.steps\[0\]\.n is a whole number/);
  refused('mechanism', f => { f.diagram = {notation: 'mermaid', source: 'graph TD; A-->B', origin: 'source-figure', at: [10, 10]}; }, /mechanism\.diagram: the diagram source is not found in lines 10.10/);
  assert.deepEqual(CF.conceptFormIssues(null, ctx(all.definition)), ['A form is an object.']);
  assert.match(CF.conceptFormIssues(all.definition.content, {}).join(' '), /passage/, 'a form without its passage is refused');
  // The closed vocabularies other packages read.
  assert.deepEqual(CF.RELATION_VERBS, ['requires', 'requires-when', 'complements', 'alternative-to', 'conflicts-with', 'constrains', 'specialises', 'realises', 'validated-by', 'remediates', 'distinguished-from', 'uses', 'related']);
  assert.deepEqual(CF.CONCEPT_KINDS, ['style', 'pattern', 'tactic', 'technique', 'anti-pattern', 'component', 'composition', 'reference-architecture', 'deployment-topology', 'principle', 'topic']);
  for (const [id, ok] of [['PAT-TRANSACTIONAL-OUTBOX', true], ['CON-COMP-OUTBOX-RELAY', true], ['SYN-P001', true], ['outbox', false], ['PAT', false], ['PAT-', false], ['PAT-a', false], ['A-B-C-D-E-F-G-H-I', false]]) assert.equal(CF.CONCEPT_ID.test(id), ok, id);
  // A concept's scope uses the placement targets of the structured unit: the same seven, checked against the unit itself.
  assert.equal(CF.CONCEPT_SCOPES.length, 7);
  for (const target of [...CF.CONCEPT_SCOPES, 'elsewhere']) assert.equal(architectureUnitIssues({...F.UNIT, placement: [{target, reason: 'Synthetic.'}]}).length === 0, target !== 'elsewhere', target);
  assert.equal(CF.quoteFound('one  two\nthree   four', 7, [7, 8], 'two three four'), true, 'whitespace is collapsed across lines');
  assert.equal(CF.quoteFound('one two\nthree four', 7, [8, 8], 'one two'), false, 'a quote is looked for in its own lines only');
});

// ------------------------------------------------------------------------------------------------ 3
add('S1.3: a form is saved only on a registered concept, with its fixed claim type and predicate and (decision-bearing, on a mechanism) its structured unit; a plain claim on a free subject still saves', async () => {
  const {CC} = await mods(), L = await library({forms: []}), all = F.p001Forms(), before = JSON.stringify(L.document);
  const claim = (payload, opts = F.person('importer')) => CC.applyConceptCommand(L.document, {type: 'knowledge.claim', payload}, AT, 'importer', opts);
  const good = F.formClaim(L.sourceId, 'SYN-P001', all.applicability);
  assert.throws(() => claim({...good, subjectId: 'SYN-P999'}), /SYN-P999 is not in the concept register/);
  assert.throws(() => claim({...good, subjectId: 'Free text subject'}), /not in the concept register/);
  assert.throws(() => claim({...good, predicate: 'is nice when'}), /An applicability form is claimed as "applies when"/);
  assert.throws(() => claim({...good, claimType: 'benefit'}), /An applicability form is an applicability claim/);
  { const {architectureUnit: _unit, ...bare} = good; assert.throws(() => claim(bare), /An applicability form of a pattern carries its structured architecture unit/); }
  assert.throws(() => claim({...good, conditions: []}), /conditions and limitations/);
  assert.throws(() => claim({...good, form: {...good.form, useWhen: [{...good.form.useWhen[0], quote: 'a sentence that is nowhere in the passage'}]}}), /applicability\.useWhen\[0\]: the quote is not found in lines 16.16/);
  assert.throws(() => claim({...good, form: {...good.form, useWhen: [{text: 'No passage and no quote.'}]}}), /applicability\.useWhen\[0\] names no lines of the passage/);
  assert.throws(() => claim({...good, lineStart: 17, lineEnd: 19}), /applicability\.useWhen\[0\] cites lines 16.16, outside the passage \(lines 17.19\)/);
  assert.throws(() => claim({...F.formClaim(L.sourceId, 'SYN-P001', all.mechanism), claimType: 'mechanism', form: undefined}), /Choose a supported claim type/, 'the new claim types exist for forms only');
  assert.equal(JSON.stringify(L.document), before, 'a refused claim changes nothing');
  const saved = claim(good).document, c = saved.knowledge.claims.at(-1);
  assert.deepEqual(c.form, good.form); assert.equal(c.architectureUnit.kind, 'pattern');
  // A plain claim, on any subject, saves as before and carries none of the new keys.
  const plain = claim({sourceId: L.sourceId, lineStart: 5, lineEnd: 5, subjectId: 'Free text subject', predicate: 'stores', statement: 'An outbox stores the notice with the booking.', claimType: 'definition'}).document.knowledge.claims.at(-1);
  assert.equal(plain.subjectId, 'Free text subject'); assert(!('form' in plain) && !('authoredAs' in plain));
  // A concept of kind topic needs no structured unit for its applicability form.
  let p = CC.applyConceptCommand(L.document, {type: 'knowledge.concept', payload: {...CONCEPT, conceptId: 'CON-TOPIC-PUBLICATION', kind: 'topic', title: 'Reliable publication'}}, AT, 'importer', F.person('importer')).document;
  { const {architectureUnit: _unit, ...bare} = good; p = CC.applyConceptCommand(p, {type: 'knowledge.claim', payload: {...bare, subjectId: 'CON-TOPIC-PUBLICATION'}}, AT, 'importer', F.person('importer')).document; assert.equal(p.knowledge.claims.at(-1).form.type, 'applicability'); }
  // A retired concept takes no new form.
  p = CC.applyConceptCommand(L.document, {type: 'knowledge.concept-retire', payload: {id: L.conceptRecordId, reason: 'Synthetic retirement.', reviewer: 'Synthetic steward', reviewed: true}}, AT, 'reviewer', F.person('reviewer')).document;
  assert.throws(() => CC.applyConceptCommand(p, {type: 'knowledge.claim', payload: good}, AT, 'importer', F.person('importer')), /SYN-P001 is retired/);
});

// ------------------------------------------------------------------------------------------------ 4
add('S1.4: the concept register holds one definition per concept and only its own form claims; the concept hash moves with any form claim; an edit lapses the review', async () => {
  const {CC, KC} = await mods(), L = await library({forms: ['definition', 'mechanism', 'applicability'], verify: true, review: true});
  const concept = () => KC.conceptRecords(L.document).find(c => c.conceptId === 'SYN-P001'), reviewedHash = concept().hash;
  assert.equal(concept().state, 'reviewed'); assert.equal(concept().review.conceptHash, reviewedHash); assert.match(reviewedHash, /^[0-9a-f]{64}$/);
  assert.deepEqual(L.document.knowledge.concepts[0].history.map(h => [h.revision, h.actor]), [[1, 'importer'], [2, 'importer']]);
  assert.match(L.document.knowledge.concepts[0].id, /^KN-\d{4}$/);
  const edit = (change, actor = 'importer', p = L.document) => CC.applyConceptCommand(p, {type: 'knowledge.concept', payload: {...CONCEPT, id: L.conceptRecordId, forms: p.knowledge.concepts[0].forms, ...change}}, AT, actor, F.person(actor)).document;
  const forms = L.document.knowledge.concepts[0].forms;
  // One definition; a claim of another subject or another type is refused; a claim is named once.
  let extra = CC.applyConceptCommand(L.document, {type: 'knowledge.claim', payload: F.formClaim(L.sourceId, 'SYN-P001', F.p001Forms().definition)}, AT, 'importer', F.person('importer'));
  assert.throws(() => edit({forms: [...forms, {type: 'definition', claimId: extra.selected}]}, 'importer', extra.document), /SYN-P001 has one definition/);
  assert.throws(() => edit({forms: [{type: 'mechanism', claimId: L.claimIds.definition}]}), /is a definition form, not a mechanism form/);
  assert.throws(() => edit({forms: [...forms, forms[1]]}), /is named twice/);
  assert.throws(() => edit({forms: [...forms, {type: 'example', claimId: 'KC-9999'}]}), /KC-9999 is not a claim of this project/);
  { let p = CC.applyConceptCommand(L.document, {type: 'knowledge.concept', payload: {...CONCEPT, conceptId: 'SYN-P002', title: 'Idempotent receiver'}}, AT, 'importer', F.person('importer')).document;
    const other = CC.applyConceptCommand(p, {type: 'knowledge.claim', payload: F.formClaim(L.sourceId, 'SYN-P002', F.p001Forms().example)}, AT, 'importer', F.person('importer'));
    assert.throws(() => edit({forms: [...forms, {type: 'example', claimId: other.selected}]}, 'importer', other.document), /is a form of SYN-P002, not of SYN-P001/);
    assert.throws(() => CC.applyConceptCommand(p, {type: 'knowledge.concept', payload: {...CONCEPT}}, AT, 'importer', F.person('importer')), /SYN-P001 is already in the concept register/); }
  { const plain = CC.applyConceptCommand(L.document, {type: 'knowledge.claim', payload: {sourceId: L.sourceId, lineStart: 5, lineEnd: 5, subjectId: 'SYN-P001', predicate: 'stores', statement: 'A plain claim.', claimType: 'definition'}}, AT, 'importer', F.person('importer'));
    assert.throws(() => edit({forms: [...forms, {type: 'example', claimId: plain.selected}]}, 'importer', plain.document), /carries no form/); }
  assert.throws(() => edit({conceptId: 'SYN-P009'}), /A concept keeps its identifier/);
  assert.throws(() => edit({kind: 'gadget'}), /Choose a concept kind/);
  assert.throws(() => edit({scope: ['elsewhere']}), /scope/i);
  assert.throws(() => edit({stages: [12]}), /stage/i);
  assert.throws(() => edit({lenses: ['vibes']}), /lens/i);
  assert.throws(() => edit({reviewDue: 'next year'}), /date/i);
  assert.throws(() => edit({reviewTriggers: ['mood']}), /review trigger/i);
  assert.throws(() => edit({successorOf: 'SYN-P404', changeNote: 'rename'}), /SYN-P404 is not in the concept register/);
  assert.throws(() => CC.applyConceptCommand(L.document, {type: 'knowledge.concept', payload: {...CONCEPT, conceptId: 'lower-case'}}, AT, 'importer', F.person('importer')), /concept identifier/i);
  // The hash covers every field of the record but its bookkeeping, and each form claim as it stands: who stewards the
  // concept and when it is due are reviewed with it (ruling B3; the first build left them outside the hash). Case S1.18.
  assert.equal(concept().hash, KC.conceptHash(L.document.knowledge.concepts[0], L.document.knowledge.claims, L.document.knowledge.topics));
  for (const change of [{title: 'Transactional outbox (renamed)'}, {kind: 'tactic'}, {family: 'Another family'}, {scope: ['component']}, {stages: [5]}, {lenses: ['integrity']}, {forms: forms.slice(0, 2)}, {steward: 'Another guild'}, {reviewDue: '2028-01-01'}, {reviewTriggers: ['region']}, {notAdopted: []}]) {
    const q = edit(change, 'architect'), c = KC.conceptRecords(q)[0];
    assert.notEqual(c.hash, reviewedHash, Object.keys(change)[0] + ' moves the hash'); assert.equal(c.state, 'draft', 'an edit of ' + Object.keys(change)[0] + ' lapses the review');
    assert.equal(c.lastEditor, 'architect'); assert.equal(c.actor, 'importer', 'the author is kept'); assert.equal(c.revision, 3);
  }
  // Any change to a form claim moves it: here the claim is reviewed again (its review is part of what it is).
  { const q = clone(L.document), c = q.knowledge.claims.find(x => x.id === L.claimIds.mechanism); c.review.reason = 'Another reason.'; assert.notEqual(KC.conceptRecords(q)[0].hash, reviewedHash); assert.equal(KC.conceptRecords(q)[0].state, 'draft'); }
  { const q = CC.applyConceptCommand(L.document, {type: 'knowledge.review', payload: {...F.REVIEW, formChecked: true, id: L.claimIds.mechanism, decision: 'disputed'}}, AT, 'architect', F.person('architect')).document; assert.equal(KC.conceptRecords(q)[0].state, 'draft', 'a form disputed after the concept review lapses it'); }
  // Retire and restore are a person's steps with a reason; a retired concept is not edited.
  const retire = {id: L.conceptRecordId, reason: 'Superseded in the synthetic handbook.', reviewer: 'Synthetic steward', reviewed: true};
  assert.throws(() => CC.applyConceptCommand(L.document, {type: 'knowledge.concept-retire', payload: {...retire, reviewed: false}}, AT, 'architect', F.person('architect')), /Review the exact change/);
  const retired = CC.applyConceptCommand(L.document, {type: 'knowledge.concept-retire', payload: retire}, AT, 'architect', F.person('architect')).document;
  assert.equal(KC.conceptRecords(retired)[0].state, 'retired'); assert.deepEqual(retired.knowledge.concepts[0].retired, {at: AT, actor: 'architect', reviewer: 'Synthetic steward', reason: retire.reason});
  assert.throws(() => edit({title: 'Edited while retired'}, 'architect', retired), /SYN-P001 is retired/);
  assert.throws(() => CC.applyConceptCommand(retired, {type: 'knowledge.concept-retire', payload: retire}, AT, 'architect', F.person('architect')), /already retired/);
  const restored = CC.applyConceptCommand(retired, {type: 'knowledge.concept-restore', payload: retire}, AT, 'architect', F.person('architect')).document;
  assert.equal(KC.conceptRecords(restored)[0].state, 'reviewed'); assert(!('retired' in restored.knowledge.concepts[0]));
  assert.deepEqual(retired.knowledge.history.at(-1), {at: AT, actor: 'architect', type: 'knowledge.concept-retire', id: L.conceptRecordId, reason: retire.reason, reviewer: 'Synthetic steward'});
});

// ------------------------------------------------------------------------------------------------ 5
add('S1.5: a concept is verified by a second signed-in person: its author, an editor, an agent account, a draft by Sol and a request marked as an import are each refused; so is verifying while a form is unverified or was verified by its own author', async () => {
  const {CC, KC} = await mods(), L = await library({forms: ['definition', 'mechanism', 'applicability'], verify: true});
  const review = (actor, opts = F.person(actor), p = L.document, change = {}) => CC.applyConceptCommand(p, {type: 'knowledge.concept-review', payload: {...CONCEPT_REVIEW, id: L.conceptRecordId, ...change}}, AT, actor, opts);
  assert.throws(() => review('importer'), /A second signed-in person.*importer wrote KN-/, 'the author');
  const edited = CC.applyConceptCommand(L.document, {type: 'knowledge.concept', payload: {...CONCEPT, id: L.conceptRecordId, forms: L.document.knowledge.concepts[0].forms, steward: 'Another guild'}}, AT, 'architect', F.person('architect')).document;
  assert.throws(() => review('architect', F.person('architect'), edited), /A second signed-in person.*architect wrote KN-/, 'the last editor');
  assert.throws(() => review('importer', F.person('importer'), edited), /importer wrote KN-/, 'the author stays an author after someone else edits');
  assert.throws(() => review('bot', F.agent('bot')), /An agent or Sol does not verify KN-/, 'an agent account');
  assert.throws(() => review('reviewer', F.solDraft('reviewer')), /A draft by Sol reviews nothing/, 'a draft by Sol');
  assert.throws(() => review('reviewer', F.importedBy('reviewer')), /An import records what a file says and reviews nothing/, 'a request marked as an import');
  assert.throws(() => review('reviewer', {}), /signed-in person/, 'a request that states no author');
  assert.throws(() => review('', F.person('')), /Sign in to verify KN-/);
  assert.throws(() => review('reviewer', F.person('reviewer'), L.document, {reviewed: false}), /Review the exact change/);
  for (const check of ['identityChecked', 'formsChecked', 'crosswalkChecked']) assert.throws(() => review('reviewer', F.person('reviewer'), L.document, {[check]: false}), /Check the identity, each form and the crosswalk/);
  assert.throws(() => review('reviewer', F.person('reviewer'), L.document, {decision: 'approved'}), /Record a review outcome/);
  // Every form verified, by someone other than its author.
  { const unverified = await library({forms: ['definition', 'mechanism']}); assert.throws(() => review('reviewer', F.person('reviewer'), unverified.document), /KC-\d+ \(definition\): The claim has not passed an explicit source and interpretation review/); }
  { const own = clone(L.document), c = own.knowledge.claims.find(x => x.id === L.claimIds.mechanism); c.review.actor = c.actor; assert.throws(() => review('reviewer', F.person('reviewer'), own), /\(mechanism\): Its author verified it/); }
  { const none = await library({forms: []}); assert.throws(() => review('reviewer', F.person('reviewer'), none.document), /SYN-P001 needs its definition/); }
  // Nor by someone who wrote one of its forms: here `architect` wrote the example.
  { const mixed = await library({forms: ['definition', 'mechanism']}), example = mixed.k('claim', F.formClaim(mixed.sourceId, 'SYN-P001', F.p001Forms().example), 'architect');
    mixed.k('concept', {...CONCEPT, id: mixed.conceptRecordId, forms: [...mixed.document.knowledge.concepts[0].forms, {type: 'example', claimId: example}]});
    for (const id of [...Object.values(mixed.claimIds), example]) mixed.k('review', {...F.REVIEW, formChecked: true, id}, 'reviewer');
    assert.throws(() => review('architect', F.person('architect'), mixed.document), /A second signed-in person.*architect wrote KN-/, 'the author of one of its forms');
    const ok = review('reviewer', F.person('reviewer'), mixed.document).document; assert.equal(KC.conceptRecords(ok)[0].state, 'reviewed');
    const forged = clone(ok); forged.knowledge.concepts[0].review.actor = 'architect'; assert.equal(KC.conceptRecords(forged)[0].state, 'draft', 'and a review recorded for such a person does not stand on any read');
    const self = clone(ok); self.knowledge.concepts[0].review.actor = 'importer'; assert.equal(KC.conceptRecords(self)[0].state, 'draft'); }
  // A form is verified through the register only: with every item checked, by a person, never by its author or as an import.
  const formReview = (id, actor, opts = F.person(actor), change = {}, p = (L.document)) => CC.applyConceptCommand(p, {type: 'knowledge.review', payload: {...F.REVIEW, formChecked: true, id, ...change}}, AT, actor, opts);
  const fresh = await library({forms: ['definition', 'applicability']}), fid = fresh.claimIds.applicability;
  assert.throws(() => formReview(fid, 'reviewer', F.person('reviewer'), {formChecked: false}, fresh.document), /Check each item of the form against its lines/);
  assert.throws(() => formReview(fid, 'importer', F.person('importer'), {}, fresh.document), /importer wrote KC-/);
  assert.throws(() => formReview(fid, 'reviewer', F.importedBy('reviewer'), {}, fresh.document), /An import records what a file says and reviews nothing/);
  assert.throws(() => formReview(fid, 'reviewer', F.solDraft('reviewer'), {}, fresh.document), /A draft by Sol reviews nothing/);
  assert.throws(() => formReview(fid, 'bot', F.agent('bot'), {}, fresh.document), /An agent or Sol does not verify KC-/);
  assert.throws(() => K.applyKnowledgeCommand(fresh.document, {type: 'knowledge.review', payload: {...F.REVIEW, formChecked: true, id: fid}}, AT, 'reviewer'), /form/i, 'the entry without the form capability reviews no form');
  { const bad = clone(fresh.document), c = bad.knowledge.claims.find(x => x.id === fid); c.form.useWhen[0].quote = 'a sentence that is nowhere in the passage'; assert.throws(() => formReview(fid, 'reviewer', F.person('reviewer'), {}, bad), /the quote is not found/, 'the form is validated again at review'); }
  const verified = formReview(fid, 'reviewer', F.person('reviewer'), {}, fresh.document).document.knowledge.claims.find(x => x.id === fid);
  assert.equal(verified.review.formChecked, true); assert.equal(verified.review.actor, 'reviewer');
  // A plain claim's review is what it was: no formChecked is asked or stored.
  { const plainId = CC.applyConceptCommand(fresh.document, {type: 'knowledge.claim', payload: {sourceId: fresh.sourceId, lineStart: 5, lineEnd: 5, subjectId: 'Free subject', predicate: 'stores', statement: 'A plain claim.', claimType: 'definition'}}, AT, 'importer', F.person('importer'));
    const r = CC.applyConceptCommand(plainId.document, {type: 'knowledge.review', payload: {...F.REVIEW, id: plainId.selected}}, AT, 'reviewer', F.importedBy('reviewer')).document.knowledge.claims.at(-1).review;
    assert(!('formChecked' in r)); assert.equal(r.decision, 'verified'); }
  // The verified concept: who, when, what was checked, and the hash it was checked at.
  const done = review('reviewer').document, c = KC.conceptRecords(done)[0];
  assert.equal(c.state, 'reviewed'); assert.deepEqual({...c.review, conceptHash: null}, {decision: 'verified', actor: 'reviewer', account: 'person', reviewer: 'Synthetic second person', at: AT, reason: CONCEPT_REVIEW.reason, identityChecked: true, formsChecked: true, crosswalkChecked: true, conceptHash: null});
  assert.equal(c.review.conceptHash, c.hash);
  const rejected = review('reviewer', F.person('reviewer'), L.document, {decision: 'rejected', identityChecked: false, formsChecked: false, crosswalkChecked: false}).document; assert.equal(KC.conceptRecords(rejected)[0].state, 'draft');
  // The server gate knows the new person-only types (authorship.js).
  for (const type of ['knowledge.library', 'knowledge.concept-review', 'knowledge.concept-retire', 'knowledge.concept-restore']) assert.equal(isReviewCommand(type), true, type);
  for (const type of ['knowledge.concept', 'knowledge.topic', 'knowledge.claim', 'knowledge.source']) assert.equal(isReviewCommand(type), false, type + ' stays a draft anyone may send');
});

// ------------------------------------------------------------------------------------------------ 5b: the command boundary
add('S1.5 through the service: POST /api/commands saves a candidate concept from an agent account, and refuses its review from the agent, from a draft by Sol, from an import and from its author; a second signed-in editor verifies it', async () => {
  const {KC} = await mods(), {default: worker} = await import('./worker.js'), {localDatabase} = await import('./local-db.js');
  const files = new Map(), env = {AIW_AGENT_ACTORS: 'bot', DB: localDatabase(':memory:'), FILES: {async put(k, v) { files.set(k, v); }, async get(k) { return files.has(k) ? {text: async () => files.get(k)} : null; }, async delete(k) { files.delete(k); }}, ASSETS: {fetch: () => new Response('asset')}};
  const api = async (path, body, as = 'importer') => { const r = await worker.fetch(new Request('https://aiw.test' + path, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': as, Origin: 'https://aiw.test', ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env); let data = null; try { data = await r.json(); } catch { data = null; } return {status: r.status, data}; };
  try {
    const created = await api('/api/projects', {name: 'Northquay knowledge library', template: 'blank'}); assert(created.status < 300, JSON.stringify(created.data)); const projectId = created.data.document.id;
    for (const actor of ['reviewer', 'bot']) await env.DB.prepare('INSERT INTO project_access(owner_id,project_id,actor_id,role,created_at) VALUES(?,?,?,?,?)').bind('importer', projectId, actor, 'editor', AT).run();
    let state = created.data; const send = async (type, payload, as = 'importer', extra = {}) => { const r = await api('/api/commands?project=' + projectId, {revision: state.revision, command: {type, payload}, ...extra}, as); if (r.status === 200) state = r.data; return r; };
    const ok = async (...args) => { const r = await send(...args); assert.equal(r.status, 200, JSON.stringify(r.data)); return r.data.selected; };
    const sourceId = await ok('knowledge.source', F.sourcePayload('SYN-P001 Transactional outbox', F.SYN_P001), 'bot'), all = F.p001Forms();
    // A concept is written in a knowledge library (ruling B2): the agent's concept is refused until a person marks the project, which the agent cannot do.
    { const refused = await send('knowledge.concept', CONCEPT, 'bot'); assert.equal(refused.status, 400); assert.match(refused.data.error, /are written in a knowledge library: a person marks this project as one first/);
      const marking = await send('knowledge.library', LIBRARY_MARK, 'bot'); assert.equal(marking.status, 400); assert.equal(marking.data.code, 'authorship'); }
    await ok('knowledge.library', LIBRARY_MARK, 'importer'); assert.equal(state.document.knowledge.library.actor, 'importer');
    const conceptRecordId = await ok('knowledge.concept', CONCEPT, 'bot'), ids = {};
    for (const t of ['definition', 'applicability']) ids[t] = await ok('knowledge.claim', F.formClaim(sourceId, 'SYN-P001', all[t]), 'bot');
    await ok('knowledge.concept', {...CONCEPT, id: conceptRecordId, forms: Object.entries(ids).map(([type, claimId]) => ({type, claimId}))}, 'bot');
    assert.deepEqual(state.document.knowledge.claims.map(c => c.authoredAs), ['agent', 'agent']); assert.equal(state.document.knowledge.concepts[0].actor, 'bot');
    assert.equal(KC.conceptRecords(state.document)[0].state, 'draft');
    const formReview = {...F.REVIEW, formChecked: true, id: ids.definition}, conceptReview = {...CONCEPT_REVIEW, id: conceptRecordId};
    let r = await send('knowledge.review', formReview, 'bot'); assert.equal(r.status, 400); assert.equal(r.data.code, 'authorship'); assert.match(r.data.error, /agent or service account does not review/);
    r = await send('knowledge.review', formReview, 'reviewer', {authorKind: 'import'}); assert.equal(r.status, 400, 'an import never reviews a form'); assert.match(r.data.error, /An import records what a file says and reviews nothing/);
    for (const id of Object.values(ids)) await ok('knowledge.review', {...formReview, id}, 'reviewer');
    r = await send('knowledge.concept-review', conceptReview, 'bot'); assert.equal(r.status, 400); assert.equal(r.data.code, 'authorship'); assert.match(r.data.error, /agent or service account does not review, confirm, accept or approve \(knowledge\.concept-review\)/);
    r = await send('knowledge.concept-review', {...conceptReview, reviewed: false}, 'bot'); assert.equal(r.status, 400, 'nor with the review flag left out'); assert.equal(r.data.code, 'authorship');
    r = await send('knowledge.concept-review', conceptReview, 'reviewer', {authorKind: 'sol-draft'}); assert.equal(r.status, 400); assert.match(r.data.error, /draft by Sol does not review/);
    r = await send('knowledge.concept-review', conceptReview, 'reviewer', {authorKind: 'import'}); assert.equal(r.status, 400); assert.match(r.data.error, /An import records what a file says and reviews nothing/);
    r = await send('knowledge.library', {enabled: true, reason: 'Synthetic library.', reviewer: 'Synthetic steward', reviewed: true}, 'bot'); assert.equal(r.status, 400, 'an agent account marks no library'); assert.equal(r.data.code, 'authorship');
    // The concept's own author is refused: here an editor who is a person edits it, then tries to verify it.
    await ok('knowledge.concept', {...CONCEPT, id: conceptRecordId, forms: state.document.knowledge.concepts[0].forms, steward: 'Another guild'}, 'importer');
    r = await send('knowledge.concept-review', conceptReview, 'importer'); assert.equal(r.status, 400); assert.match(r.data.error, /A second signed-in person.*importer wrote KN-/);
    assert.equal(KC.conceptRecords(state.document)[0].state, 'draft', 'nothing was reviewed by the refused requests');
    await ok('knowledge.concept-review', conceptReview, 'reviewer');
    const c = KC.conceptRecords(state.document)[0]; assert.equal(c.state, 'reviewed'); assert.equal(c.review.actor, 'reviewer');
    assert.deepEqual(state.document.knowledge.history.at(-1), {at: state.document.knowledge.history.at(-1).at, actor: 'reviewer', type: 'knowledge.concept-review', id: conceptRecordId, reason: CONCEPT_REVIEW.reason, reviewer: 'Synthetic second person'});
    assert.deepEqual(K.releasedClaims(state.document), [], 'reviewed, not released: no reader of released knowledge sees it');
    // Only a person changes what that review covered (ruling B3): the agent that wrote the draft cannot move its review date now.
    r = await send('knowledge.concept', {...CONCEPT, id: conceptRecordId, forms: state.document.knowledge.concepts[0].forms, steward: 'Another guild', reviewDue: '2099-12-31'}, 'bot'); assert.equal(r.status, 400); assert.match(r.data.error, /SYN-P001 is reviewed or in a release: only a signed-in person changes what its review covered/);
    assert.equal(state.document.knowledge.concepts[0].reviewDue, '2027-11-16'); assert.equal(KC.conceptRecords(state.document)[0].state, 'reviewed');
    // Nor does it make that review lapse with a claim that carries no form (rulings B3 and B9, case S1.26): the concept's
    // id as its subject, the applicability form's fixed predicate, another polarity. An import is refused it as well.
    const opposing = {sourceId, lineStart: 17, lineEnd: 17, subjectId: 'SYN-P001', predicate: 'applies when', statement: 'An outbox is avoided wherever a caller only reads.', claimType: 'applicability', polarity: 'prohibits', conditions: ['The caller only reads.'], limitations: ['Says nothing of later changes.']};
    const NOBODY = /SYN-P001 is reviewed or in a release: only a signed-in person changes what its review covered \(a claim that contradicts KC-\d+, a form of it\)/;
    r = await send('knowledge.claim', opposing, 'bot'); assert.equal(r.status, 400, 'an agent account opens no contradiction with a form of a reviewed concept'); assert.match(r.data.error, NOBODY);
    r = await send('knowledge.claim', opposing, 'reviewer', {authorKind: 'import'}); assert.equal(r.status, 400, 'nor does an import'); assert.match(r.data.error, NOBODY);
    assert.deepEqual(state.document.knowledge.contradictions, []); assert.equal(KC.conceptRecords(state.document)[0].state, 'reviewed');
    // A claim of the agent that opposes no form is saved as before, and a person's opposing claim opens the contradiction (the fail-safe of rc.10.73.42).
    await ok('knowledge.claim', {...opposing, polarity: 'supports'}, 'bot'); assert.equal(KC.conceptRecords(state.document)[0].state, 'reviewed');
    const plainId = state.document.knowledge.claims.at(-1).id, opposingId = await ok('knowledge.claim', opposing, 'importer');
    assert.deepEqual(state.document.knowledge.contradictions.map(x => [x.status, x.claimIds]), [['open', [ids.applicability, opposingId]], ['open', [plainId, opposingId]]], 'with the form it opposes, and with the agent\'s plain claim of the other polarity'); assert.equal(KC.conceptRecords(state.document)[0].state, 'draft');
  } finally { env.DB.close?.(); }
});

// ------------------------------------------------------------------------------------------------ 6
add('S1.6: decision-bearing content is returned in state released only (and to a design record only through an active pin); teaching content of a candidate is returned labelled as a candidate', async () => {
  const {KC, CF} = await mods();
  const decision = t => CF.FORM_TIER[t] === 'decision', forms = (p, id = 'SYN-P001') => KC.conceptReading(p, id).forms;
  const stages = {candidate: await library(), verified: await library({verify: true}), reviewed: await library({verify: true, review: true}), released: await library({verify: true, review: true, release: true}), active: await library({verify: true, review: true, release: true, activate: true})};
  for (const [stage, expected] of [['candidate', 'candidate'], ['verified', 'reviewed'], ['reviewed', 'reviewed'], ['released', 'reviewed'], ['active', 'released']]) {
    const p = stages[stage].document, list = forms(p);
    assert.deepEqual(list.map(f => f.type), F.FORM_ORDER, stage + ': the nine forms');
    for (const f of list) {
      assert.equal(f.status, expected, stage + ': ' + f.type + ' reads ' + expected);
      assert.equal(f.tier, CF.FORM_TIER[f.type]);
      if (decision(f.type) && expected !== 'released') { assert.equal(f.content, null, stage + ': no decision-bearing content of ' + f.type); assert.equal(f.architectureUnit, null); assert.equal(f.receipt, null); }
      else assert.deepEqual(f.content, F.p001Forms()[f.type].content, stage + ': ' + f.type + ' content');
    }
    // No pin exists in this slice (knowledge.concept-pin is slice S3): a design record is handed nothing.
    assert.deepEqual(KC.conceptDecisionForms(p, 'KU-0001'), [], stage + ': nothing without an active pin');
    assert.deepEqual(KC.conceptDecisionForms(p, 'SYN-P001'), [], stage + ': a concept id is not a pin');
    assert.deepEqual(KC.conceptDecisionForms(p, undefined), []);
    const teaching = KC.conceptTeachingForms(p, 'SYN-P001');
    assert.deepEqual(teaching.map(f => f.type), ['definition', 'mechanism', 'example', 'exercise'], stage + ': the teaching forms');
    assert(teaching.every(f => f.status === expected && f.content && f.label), stage + ': each labelled');
  }
  const label = (stage, type) => forms(stages[stage].document).find(f => f.type === type).label;
  assert.equal(label('candidate', 'definition'), 'Candidate · not reviewed · synthetic/integration-handbook.md · SYN-P001 Transactional outbox L5–L7');
  assert.equal(label('candidate', 'applicability'), 'Candidate · not reviewed · synthetic/integration-handbook.md · SYN-P001 Transactional outbox L16–L19');
  assert.equal(label('verified', 'mechanism'), 'Reviewed · awaiting release');
  assert.equal(label('released', 'mechanism'), 'Reviewed · in the release "Synthetic integration concepts 1", which is not active in this project');
  { const p = stages.active.document, claim = p.knowledge.releases[0].claims.find(c => c.form.type === 'applicability'); assert.equal(label('active', 'applicability'), 'Released · Synthetic integration concepts 1 · verified by reviewer · synthetic/integration-handbook.md · SYN-P001 Transactional outbox L16–L19 · passage ' + claim.excerptHash.slice(0, 12)); }
  // The released reading: content, the structured unit and a receipt that scores nothing.
  const active = stages.active.document, applicability = forms(active).find(f => f.type === 'applicability');
  assert.deepEqual(applicability.architectureUnit.obligations, F.UNIT.obligations); assert.equal(applicability.receipt.kind, 'governed-claim'); assert.equal(applicability.receipt.scoring, false);
  assert.deepEqual(applicability.source, {file: 'synthetic/integration-handbook.md · SYN-P001 Transactional outbox', lineStart: 16, lineEnd: 19, passageSha256: sha256(F.SYN_P001.slice(15, 19).join('\n')), checkedAt: null, versionScope: null});
  assert.deepEqual(KC.releasedConcepts(active).map(c => [c.conceptId, c.release.id, c.eligible, c.forms.length]), [['SYN-P001', stages.active.releaseId, true, 9]]);
  assert.deepEqual(KC.releasedConcepts(stages.released.document), [], 'a release that is not active releases nothing');
  // Through a pin (the row knowledge.concept-pin will write in slice S3; here placed in a fixture document): the
  // decision-bearing forms of that release, and nothing for a pin that is not active, names another release or another concept.
  const pinned = (p, pin) => { const q = clone(p); q.knowledge.conceptPins = [{id: 'KU-0001', conceptId: 'SYN-P001', releaseId: stages.active.releaseId, status: 'active', ...pin}]; return q; };
  const viaPin = KC.conceptDecisionForms(pinned(active), 'KU-0001');
  assert.deepEqual(viaPin.map(f => f.type), ['applicability', 'selection', 'composition', 'calculation', 'verification']);
  for (const f of viaPin) { assert.deepEqual(f.content, F.p001Forms()[f.type].content); assert.equal(f.receipt.scoring, false); }
  assert.deepEqual(viaPin[0].architectureUnit.kind, 'pattern');
  assert.deepEqual(KC.conceptDecisionForms(pinned(active, {status: 'moved'}), 'KU-0001'), []);
  assert.deepEqual(KC.conceptDecisionForms(pinned(active, {status: 'retired'}), 'KU-0001'), []);
  assert.deepEqual(KC.conceptDecisionForms(pinned(active, {releaseId: 'KR-9999'}), 'KU-0001'), []);
  assert.deepEqual(KC.conceptDecisionForms(pinned(active, {conceptId: 'SYN-P002'}), 'KU-0001'), []);
  assert.deepEqual(KC.conceptDecisionForms(pinned(active), 'KU-0002'), []);
  for (const stage of ['candidate', 'verified', 'reviewed', 'released']) assert.deepEqual(KC.conceptDecisionForms(pinned(stages[stage].document, {releaseId: stages[stage].releaseId || 'KR-0001'}), 'KU-0001'), [], stage + ': a pin placed on a concept that is not released hands over nothing');
  // Deactivated, or withdrawn: nothing again.
  const off = stages.active.k('deactivate', {...F.REVIEW, id: stages.active.releaseId, stamp: K.knowledgeStamp(stages.active.document)}, 'releaser') && stages.active.document;
  assert.deepEqual(KC.conceptDecisionForms(pinned(off), 'KU-0001'), []); assert(forms(off).filter(f => decision(f.type)).every(f => f.content === null));
  // A concept that is not in the register and in no active release has no reading.
  assert.equal(KC.conceptReading(active, 'SYN-P404'), null); assert.deepEqual(KC.conceptTeachingForms(active, 'SYN-P404'), []);
});

// ------------------------------------------------------------------------------------------------ 7
add('S1.7: the project tier refuses the 251st claim and the 101st source with the messages of rc.10.73.42; a library project accepts them; only a person marks a library, and unmarking is refused while the project exceeds the project tier', async () => {
  const {CC} = await mods(); assert.deepEqual(CC.KNOWLEDGE_LIMIT_TIERS.project, {sources: 100, claims: 250, concepts: 100, topics: 100, history: 2000}); assert.deepEqual(CC.KNOWLEDGE_LIMIT_TIERS.library, {sources: 300, claims: 1000, concepts: 300, topics: 300, history: 6000});
  const send = (p, type, payload, actor = 'importer', opts = F.person(actor)) => CC.applyConceptCommand(p, {type: 'knowledge.' + type, payload}, AT, actor, opts);
  // A project nobody marked, filled to the project tier with plain sources and claims (it holds no concept, topic or form: ruling B2).
  const plain = {sourceId: 'KS-0001', lineStart: 5, lineEnd: 5, subjectId: 'Outbox', predicate: 'stores', statement: 'An outbox stores the notice with the booking.', claimType: 'definition'};
  const start = send(send(F.blankProject(), 'source', F.sourcePayload('SYN-P001 Transactional outbox', F.SYN_P001)).document, 'claim', plain).document;
  const fill = p => { const q = clone(p), s = q.knowledge, claim = s.claims[0], source = s.sources[0]; while (s.claims.length < 250) s.claims.push({...claim, id: 'KC-F' + s.claims.length}); while (s.sources.length < 100) s.sources.push({...source, id: 'KS-F' + s.sources.length}); return q; };
  const full = fill(start), claim = {...plain, statement: 'One claim more than a project holds.'}, source = F.sourcePayload('SYN-P002 Idempotent receiver', F.SYN_P002);
  assert.throws(() => send(full, 'claim', claim), {message: 'This project has reached its claim limit.'});
  assert.throws(() => send(full, 'source', source), {message: 'This project has reached its source revision limit.'});
  assert.throws(() => K.applyKnowledgeCommand(full, {type: 'knowledge.source', payload: source}, AT, 'importer'), {message: 'This project has reached its source revision limit.'}, 'the old entry keeps the project tier');
  const mark = LIBRARY_MARK;
  assert.throws(() => send(full, 'library', mark, 'bot', F.agent('bot')), /An agent or Sol|agent|person/i);
  assert.throws(() => send(full, 'library', mark, 'architect', F.solDraft('architect')), /A draft by Sol reviews nothing/);
  assert.throws(() => send(full, 'library', mark, 'architect', F.importedBy('architect')), /An import records what a file says and reviews nothing/);
  assert.throws(() => send(full, 'library', {...mark, reason: ''}, 'architect'), /Review the exact change/);
  assert.throws(() => send(full, 'library', {...mark, reviewed: false}, 'architect'), /Review the exact change/);
  assert.throws(() => send(full, 'library', {...mark, enabled: 'yes'}, 'architect'), /enabled: true or false/);
  const lib = send(full, 'library', mark, 'architect').document; assert.deepEqual(lib.knowledge.library, {enabled: true, at: AT, actor: 'architect', reason: mark.reason});
  const more = send(send(lib, 'claim', claim).document, 'source', source).document; assert.equal(more.knowledge.claims.length, 251); assert.equal(more.knowledge.sources.length, 101);
  assert.throws(() => send(more, 'library', {...mark, enabled: false}, 'architect'), /holds more than a project may \(100 sources, 250 claims/);
  const back = send(lib, 'library', {...mark, enabled: false}, 'architect').document; assert.equal(back.knowledge.library.enabled, false);
  assert.throws(() => send(back, 'claim', claim), {message: 'This project has reached its claim limit.'});
  // Eligibility does not depend on the tier: a library's candidate, plain or a form, is as ineligible as any.
  assert.equal(K.knowledgeEligibility(more, more.knowledge.claims.at(-1)).eligible, false);
  { const form = send(send(more, 'concept', CONCEPT).document, 'claim', F.formClaim('KS-0001', 'SYN-P001', F.p001Forms().mechanism)).document; assert.equal(form.knowledge.claims.length, 252); assert.equal(K.knowledgeEligibility(form, form.knowledge.claims.at(-1)).eligible, false); }
});

// ------------------------------------------------------------------------------------------------ 8
add('S1.8: a document with none of the new records reads as on rc.10.73.42: the bank-payment reference (findings, stamps, fingerprint, SDD) and a project of plain governed knowledge (the document the old commands write, released claims, findings, checksum), through the old entry and through the wrapper alike', async () => {
  const {CC} = await mods();
  assert(BASELINE, 'the rc.10.73.42 readings are recorded in this file');
  assert.deepEqual(oldDocumentReadings(), BASELINE, 'an old document no longer reads as it did on rc.10.73.42 (commit 94dbd4f). If the change is meant, state it and print the readings again with --print-baseline');
  // The wrapper writes what the old entry writes for every command that existed, byte for byte, with and without an author.
  const base = F.blankProject('rc44-wp1-legacy'), old = F.legacyKnowledge(K.applyKnowledgeCommand, base).document;
  for (const opts of [undefined, F.person('architect-a')]) { const wrapped = F.legacyKnowledge((p, c, at, actor) => CC.applyConceptCommand(p, c, at, actor, opts), base).document; assert.equal(JSON.stringify(wrapped), JSON.stringify(old)); }
  // And so for each of the fifteen command types that existed (should-fix 10; the walk above sends six of them): project-source,
  // source, suggest, dismiss-suggestion, claim, capture, steward, review, contradiction, release, activate, deactivate, withdraw, unlink, link.
  { const walkBase = F.legacyWalkBase(), walked = F.legacyWalk(K.applyKnowledgeCommand, walkBase);
    assert.deepEqual([...new Set(walked.knowledge.history.map(h => h.type))].sort(), [...F.LEGACY_TYPES].sort(), 'the walk sends each of the fifteen types'); assert.equal(F.LEGACY_TYPES.length, 15);
    for (const opts of [undefined, F.person('architect-a')]) assert.equal(JSON.stringify(F.legacyWalk((p, c, at, actor) => CC.applyConceptCommand(p, c, at, actor, opts), walkBase)), JSON.stringify(walked), 'the wrapper writes what the old entry writes for all fifteen types');
    for (const key of ['library', 'topics', 'concepts', 'crosswalk', 'conceptPins', 'previews']) assert(!(key in walked.knowledge)); assert(walked.knowledge.claims.every(c => !('form' in c) && !('authoredAs' in c))); }
  for (const key of ['library', 'topics', 'concepts', 'crosswalk', 'conceptPins', 'previews']) assert(!(key in old.knowledge), 'no ' + key + ' key until it is first written');
  assert(old.knowledge.claims.every(c => !('form' in c) && !('authoredAs' in c)) && old.knowledge.sources.every(s => !('checkedAt' in s) && !('sourceFile' in s)) && old.knowledge.claims.every(c => !('formChecked' in c.review)));
  // Reading changes nothing, and the new readers find nothing in an old document.
  const {KC} = await mods(), bank = F.bankProject(), frozen = JSON.stringify(bank);
  assert.deepEqual(KC.conceptRecords(bank), []); assert.deepEqual(KC.releasedConcepts(old), []); assert.equal(KC.conceptReading(old, 'PAT-REPLICATED-QUEUE'), null); assert.deepEqual(KC.conceptDecisionForms(old, 'KU-0001'), []);
  assert.equal(JSON.stringify(bank), frozen); assert(!('knowledge' in bank), 'a read creates no knowledge key');
  // A new key appears when it is first written, and only that key.
  const library = CC.applyConceptCommand(old, {type: 'knowledge.library', payload: LIBRARY_MARK}, AT, 'steward', F.person('steward')).document;
  assert.deepEqual(Object.keys(library.knowledge).filter(k => !(k in old.knowledge)), ['library']);
  assert.equal(JSON.stringify(K.releasedClaims(library)), JSON.stringify(K.releasedClaims(old)), 'marking a library changes no reading of the old knowledge');
  const first = CC.applyConceptCommand(library, {type: 'knowledge.concept', payload: CONCEPT}, AT, 'importer', F.person('importer')).document;
  assert.deepEqual(Object.keys(first.knowledge).filter(k => !(k in old.knowledge)), ['library', 'concepts']);
  const topic = CC.applyConceptCommand(first,{type: 'knowledge.topic', payload: {file: 'Synthetic_Integration_Handbook.docx', topicId: 'SYN-P001', title: 'Transactional outbox', lineStart: 1, lineEnd: 58, sliceSha256: sha256(F.SYN_P001.join('\n')), sourceId: null, declaredKind: 'pattern', intendedUse: 'design-method', conceptId: 'SYN-P001', reason: ''}}, AT, 'importer', F.importedBy('importer')).document;
  assert.deepEqual(Object.keys(topic.knowledge).filter(k => !(k in old.knowledge)), ['library', 'concepts', 'topics']);
  assert.equal(JSON.stringify(K.releasedClaims(topic)), JSON.stringify(K.releasedClaims(old)), 'and the released claims of the old knowledge are what they were');
});

// ------------------------------------------------------------------------------------------------ 9
add('S1.9: a released form is checked again on every read: one tampered in the document reads released-ineligible and hands over no content, even when every hash was recomputed around it', async () => {
  const {KC} = await mods(), L = await library({verify: true, review: true, release: true, activate: true}), p = L.document;
  const status = (q, type) => KC.conceptReading(q, 'SYN-P001').forms.find(f => f.type === type);
  assert.equal(status(p, 'applicability').status, 'released');
  // Tampered and left as it is: the existing eligibility already fails (the review no longer matches the claim).
  const crude = clone(p); crude.knowledge.releases[0].claims.find(c => c.form.type === 'applicability').form.useWhen[0].text = 'Use it everywhere.';
  assert.equal(status(crude, 'applicability').status, 'released-ineligible'); assert.equal(status(crude, 'applicability').content, null); assert.match(status(crude, 'applicability').label, /^Not usable: /);
  // Tampered with the claim hash and the release checksum recomputed: the existing gates pass, the form's own check does not.
  const careful = (change, type = 'applicability') => { const q = clone(p), r = q.knowledge.releases[0], c = r.claims.find(x => x.form.type === type); change(c.form); c.review.claimHash = digest({...c, review: undefined}); r.checksum = digest({...r, checksum: undefined}); assert.equal(K.knowledgeEligibility(q, c, r).eligible, true, 'the claim-level gates see nothing wrong'); return q; };
  for (const [what, change, pattern] of [
    ['a quote that is not in its lines', f => { f.useWhen[0].quote = 'a committed booking may be dropped safely'; }, /the quote is not found/],
    ['an item with no passage', f => { delete f.avoidWhen[0].at; }, /names no lines of the passage/],
    ['a number its quote does not hold', f => { f.useWhen[0].text = 'Use it whenever latency is under 5 seconds.'; }, /states the number 5/],
    ['a claimed review', f => { f.reviewed = true; }, /must not carry "reviewed"/]]) {
    const q = careful(change), f = status(q, 'applicability');
    assert.equal(f.status, 'released-ineligible', what); assert.equal(f.content, null, what + ': no content'); assert.equal(f.architectureUnit, null); assert.match(f.label, /^Not usable: /); assert.match(f.reasons.join(' '), pattern);
    assert.equal(status(q, 'selection').status, 'released', 'the other forms are untouched');
    assert.equal(KC.releasedConcepts(q)[0].eligible, false, what + ': the concept in that release is not eligible');
    const pin = clone(q); pin.knowledge.conceptPins = [{id: 'KU-0001', conceptId: 'SYN-P001', releaseId: L.releaseId, status: 'active'}];
    assert.deepEqual(KC.conceptDecisionForms(pin, 'KU-0001'), [], what + ': with one form unusable, nothing of the concept is handed to a design record (ruling B5: fail closed; the first build handed over the other four)');
  }
  // The definition is the anchor: with it unusable, a design record is handed nothing of the concept.
  { const q = careful(f => { f.quotes = [{field: 'short', quote: 'an outbox guarantees exactly-once delivery'}]; }, 'definition'), pin = clone(q); pin.knowledge.conceptPins = [{id: 'KU-0001', conceptId: 'SYN-P001', releaseId: L.releaseId, status: 'active'}];
    assert.equal(status(q, 'definition').status, 'released-ineligible'); assert.deepEqual(KC.conceptDecisionForms(pin, 'KU-0001'), []); assert.equal(status(q, 'applicability').status, 'released'); }
  // What an active release holds is offered as entries, never as the raw claim.
  assert(KC.releasedConcepts(p)[0].forms.every(f => !('claim' in f) && !('form' in f)));
  { const q = careful(f => { f.steps[0].quote = 'the relay publishes before the commit'; }, 'mechanism'); assert.equal(status(q, 'mechanism').status, 'released-ineligible'); assert.equal(status(q, 'mechanism').content, null, 'a teaching form too'); assert(!KC.conceptTeachingForms(q, 'SYN-P001').some(f => f.type === 'mechanism')); }
  // A withdrawn source makes every form of the release ineligible through the existing gate.
  const withdrawn = L.k('withdraw', {...F.REVIEW, id: L.sourceId, stamp: K.knowledgeImpactStamp(p, L.sourceId)}, 'releaser') && L.document;
  assert(KC.conceptReading(withdrawn, 'SYN-P001').forms.every(f => f.status === 'released-ineligible' && f.content === null && /withdrawn/.test(f.label)));
});

// ------------------------------------------------------------------------------------------------ 10
add('S1.10 (inert forms): with the nine forms of a concept held by the bank-payment reference as candidates, then verified, reviewed, released but not active, and released and active, not one of 27 readings of the design moves (the checks, the eligibility gate of each selection, the product comparisons, the conformance findings, readiness, the specification, released knowledge and every reader built on it, the SDD, the contextual reading, the Brain\'s context, Sol\'s packets, the reasoning packet, the record graph, the chapter stamps), and the marker placed in their statement, form, conditions and unit reaches none; what a released, active form does move is named in full', async () => {
  const {KC} = await mods(), bank = F.bankProject(), before = designReadings(bank), frozen = JSON.stringify(bank), workspace = workspaceReadings(bank);
  assert.equal(Object.keys(before).length, 27, 'the 27 readings of the review');
  // The readings are not empty ones: the reference holds checks, nine technology selections with their criteria and a comparison for each, a specification, an SDD, sources for Sol and a record graph.
  assert(before.findings.length > 100 && before.realisationFindings.length > 10 && before.selectionGates.length === 9 && before.selectionGates.every(g => g.criteria.length) && before.productComparisons.every(c => c && c.options.length) && before.specificationGate, 'the reference offers every reading compared here');
  assert(before.specification.length > 1000 && before.sdd.length > 10000 && before.structures.records.length > 100 && before.brain.length > 0 && before.brainSources.length > 0 && Object.keys(before.chapterStamps).length >= 10 && JSON.stringify(before.recordGraph).length > 10000, 'and none of them is an empty reading');
  for (const key of ['packetMind', 'packetDesign', 'packetChallenge', 'reasoning']) assert(before[key].sources.length > 0, key + ' holds sources');
  // As on rc.10.73.42, any knowledge write moves the stamp of the knowledge state: the Brain's receipt names it and each
  // of Sol's packets is stamped over that receipt. A plain candidate source through the old entry moves exactly these
  // seven values and nothing else of the 27; it moves the whole-document fingerprint too. Shown, not hidden.
  const plain = K.applyKnowledgeCommand(bank, {type: 'knowledge.source', payload: F.sourcePayload('SYN-P002 Idempotent receiver', F.SYN_P002)}, AT, 'importer').document;
  const STAMPS = ['brainContext.governed.receipt.knowledgeStamp', ...['packetMind', 'packetDesign', 'packetChallenge'].flatMap(k => [k + '.brainReceipt.knowledgeStamp', k + '.stamp'])].sort();
  assert.deepEqual(moved(before, designReadings(plain)).sort(), STAMPS, 'what a plain candidate source moves on rc.10.73.42');
  assert.notEqual(rv.designFingerprint(plain), rv.designFingerprint(bank), 'a plain candidate source moves the design fingerprint on rc.10.73.42 already');
  // At every stage, released and active included, the nine forms move those seven values and no other: the Brain's
  // receipt lists the active releases the Brain reads, and a release of forms is not one of them (ruling B1).
  const MARKS = ['-STATEMENT', '-FORM', '-CONDITION', '-UNIT'].map(m => F.MARKER + m);
  const inert = (stage, p) => {
    const after = designReadings(p);
    assert.equal(p.knowledge.claims.filter(c => c.form).length, 9, stage + ': the nine forms are in the document'); assert.equal(p.knowledge.concepts.length, 1);
    for (const m of MARKS) assert(JSON.stringify(p.knowledge).includes(m), stage + ': the document holds ' + m);
    assert.deepEqual(moved(before, after).sort(), STAMPS, stage + ': a reading of the design moved');
    for (const [key, reading] of Object.entries(after)) assert(!JSON.stringify(reading).includes(F.MARKER), stage + ': the marker reached ' + key);
    assert.deepEqual(K.releasedClaims(p), [], stage + ': no reader of released claims is handed a form'); assert.deepEqual(K.knowledgeFindings(p), []);
    assert.deepEqual(KC.conceptDecisionForms(p, 'KU-0001'), [], stage + ': and no design record without a pin');
    assert.notEqual(rv.designFingerprint(p), rv.designFingerprint(bank));
    return after;
  };
  const STAGES = [['candidate', {}], ['every form verified', {verify: true}], ['concept reviewed', {verify: true, review: true}], ['released, not active', {verify: true, review: true, release: true}], ['released and active', {verify: true, review: true, release: true, activate: true}]];
  for (const [stage, options] of STAGES) {
    // The document holds them anyway: written into it, as a recovery or an older library might leave it (ruling B2).
    const L = await library({...options, mark: F.MARKER}), p = graft(bank, L.document), active = !!options.activate;
    inert(stage, p); assert.equal(p.knowledge.pins.length, active ? 1 : 0, stage + ': the release of forms is ' + (active ? '' : 'not ') + 'active');
    assert.deepEqual(KC.releasedConcepts(p).length, active ? 1 : 0);
    if (!active) assert(KC.conceptReading(p, 'SYN-P001').forms.filter(f => f.tier === 'decision').every(f => f.content === null && f.architectureUnit === null), stage + ': the concept reading holds no decision-bearing content');
  }
  // The same where a person marked the design project itself as a knowledge library and the commands wrote the forms there.
  for (const [stage, options] of [STAGES[0], STAGES[4]]) { const p = (await library({...options, base: bank, mark: F.MARKER})).document; assert.equal(p.knowledge.library.enabled, true); inert(stage + ', written by the commands into a design project marked as a library', p); }
  // What a released, active form does move, in full (ruling B1 and should-fix 1; the same list is in the build notes):
  { const L = await library({verify: true, review: true, release: true, activate: true, mark: F.MARKER}), p = graft(bank, L.document), release = p.knowledge.releases[0];
    // 1. the concept readers: the concept, its nine forms with their content, and its forms as an active release holds them;
    const reading = KC.conceptReading(p, 'SYN-P001'); assert.deepEqual(reading.forms.map(f => [f.type, f.status, !!f.content]), F.FORM_ORDER.map(t => [t, 'released', true]));
    assert.deepEqual(KC.releasedConcepts(p).map(c => [c.conceptId, c.release.id, c.eligible, c.forms.length]), [['SYN-P001', release.id, true, 9]]);
    assert.deepEqual(KC.conceptTeachingForms(p, 'SYN-P001').map(f => [f.type, f.status]), [['definition', 'released'], ['mechanism', 'released'], ['example', 'released'], ['exercise', 'released']]);
    // 2. the knowledge workspace's own lists (its graph of sources and claims and their counts, and its history text, which names the active release);
    assert.deepEqual([...new Set(moved(workspace, workspaceReadings(p)).map(path => path.split('.').slice(0, 2).join('.')))].sort(), ['graph.counts', 'graph.edges', 'graph.nodes', 'history']);
    assert.match(K.knowledgeMarkdown(p), new RegExp('Active project releases: ' + release.id));
    // 3. stamps: the stamp of the knowledge state (in the Brain's receipt and under each packet's stamp) and the
    //    whole-document fingerprint with what is stamped over it. The Brain's receipt names no release of forms.
    assert.notEqual(K.knowledgeStamp(p), K.knowledgeStamp(bank)); assert.notEqual(rv.designFingerprint(p), rv.designFingerprint(bank)); assert.notEqual(rv.reviewSourceStamp(p), rv.reviewSourceStamp(bank));
    assert.deepEqual(p.knowledge.pins, [release.id]); assert.deepEqual(brainContext(p, {id: p.artefacts.find(a => a.type === 'requirement').id, chapter: 1}).governed.receipt.activeReleases, [], 'the Brain\'s receipt lists the releases the Brain reads: a release of forms is none of them');
    assert(rv.inheritedFindings(p).some((f, i) => f.stamp !== rv.inheritedFindings(bank)[i].stamp), 'a finding\'s stamp holds the fingerprint');
    // And nothing else: a claim receipt, should one be made of a form, carries no form and scores nothing.
    for (const c of release.claims) { const receipt = K.claimReceipt(p, c, release); assert(!('form' in receipt)); assert.equal(receipt.scoring, false); } }
  assert.equal(JSON.stringify(bank), frozen, 'the reference document itself was never changed');
});

// ------------------------------------------------------------------------------------------------ 11
add('S1.11: a form is released with its concept: only when the concept is reviewed, whole, by a person who wrote none of its forms, and who did not review one that was imported or drafted', async () => {
  const {CC} = await mods(), forms = ['definition', 'mechanism', 'applicability'];
  const release = (L, actor, claimIds, opts = F.person(actor)) => CC.applyConceptCommand(L.document, {type: 'knowledge.release', payload: {...F.REVIEW, title: 'Synthetic integration concepts 1', claimIds}}, AT, actor, opts);
  const verified = await library({forms, verify: true}), ids = L => forms.map(t => L.claimIds[t]);
  assert.throws(() => release(verified, 'releaser', ids(verified)), /SYN-P001 is not reviewed/);
  const reviewed = await library({forms, verify: true, review: true});
  assert.throws(() => release(reviewed, 'releaser', ids(reviewed).slice(0, 2)), /SYN-P001 is released whole: add KC-\d+ \(applicability\)/);
  assert.throws(() => release(reviewed, 'importer', ids(reviewed)), /A second signed-in person.*importer wrote KC-\d+/);
  assert.throws(() => release(reviewed, 'releaser', ids(reviewed), F.importedBy('releaser')), /An import records what a file says and reviews nothing/);
  assert.throws(() => release(reviewed, 'releaser', ids(reviewed), F.solDraft('releaser')), /A draft by Sol reviews nothing/);
  assert.throws(() => K.applyKnowledgeCommand(reviewed.document, {type: 'knowledge.release', payload: {...F.REVIEW, title: 'Old entry', claimIds: ids(reviewed)}}, AT, 'releaser'), /form/i, 'the entry without the form capability releases no form');
  assert.equal(release(reviewed, 'reviewer', ids(reviewed)).document.knowledge.releases.length, 1, 'a person-authored form may be released by its reviewer');
  const imported = await library({forms, verify: true, review: true, author: F.importedBy});
  assert.deepEqual(imported.document.knowledge.claims.map(c => c.authoredAs), ['import', 'import', 'import']);
  assert.throws(() => release(imported, 'reviewer', ids(imported)), /reviewer verified KC-\d+, which was imported: a third person releases it/);
  const done = release(imported, 'releaser', ids(imported)).document, r = done.knowledge.releases[0];
  assert.equal(r.actor, 'releaser'); assert.deepEqual(r.claims.map(c => c.form.type), forms); assert.equal(r.checksum, digest({...r, checksum: undefined}));
  assert(!('parts' in r), 'release parts are slice S3');
  // An edit after the review lapses it, so the release is refused again; a retired concept releases nothing.
  const edited = CC.applyConceptCommand(reviewed.document, {type: 'knowledge.concept', payload: {...CONCEPT, id: reviewed.conceptRecordId, forms: reviewed.document.knowledge.concepts[0].forms, title: 'Edited after review'}}, AT, 'architect', F.person('architect')).document;
  assert.throws(() => CC.applyConceptCommand(edited, {type: 'knowledge.release', payload: {...F.REVIEW, title: 'x', claimIds: ids(reviewed)}}, AT, 'releaser', F.person('releaser')), /SYN-P001 is not reviewed/);
  // A form claim no concept lists is not released.
  const stray = CC.applyConceptCommand(reviewed.document, {type: 'knowledge.claim', payload: F.formClaim(reviewed.sourceId, 'SYN-P001', F.p001Forms().example)}, AT, 'importer', F.person('importer'));
  const strayVerified = CC.applyConceptCommand(stray.document, {type: 'knowledge.review', payload: {...F.REVIEW, formChecked: true, id: stray.selected}}, AT, 'reviewer', F.person('reviewer')).document;
  assert.throws(() => CC.applyConceptCommand(strayVerified, {type: 'knowledge.release', payload: {...F.REVIEW, title: 'x', claimIds: [stray.selected]}}, AT, 'releaser', F.person('releaser')), /is not a form of SYN-P001 as its concept record lists them/);
});

// ------------------------------------------------------------------------------------------------ 12
add('S1.12: a recovery import brings no concept review: the imported reviewer is kept as history, the concept reads draft, and a second person here reviews it again', async () => {
  const {KC, CC} = await mods(), L = await library({forms: ['definition', 'mechanism'], verify: true, review: true});
  assert.equal(KC.conceptRecords(L.document)[0].state, 'reviewed');
  const imported = neutraliseImportedAuthority(clone(L.document), AT), c = imported.knowledge.concepts[0];
  assert.equal(c.review.actor, null); assert.equal(c.review.importedActor, 'reviewer'); assert.equal(KC.conceptRecords(imported)[0].state, 'draft');
  assert(KC.conceptReading(imported, 'SYN-P001').forms.every(f => f.status === 'candidate'), 'its forms read as candidates: their reviews were made elsewhere');
  // Even with the concept review's actor forged back, the forms' own reviews do not stand here.
  const forged = clone(imported); forged.knowledge.concepts[0].review.actor = 'reviewer'; assert.equal(KC.conceptRecords(forged)[0].state, 'draft');
  assert.throws(() => CC.applyConceptCommand(imported, {type: 'knowledge.concept-review', payload: {...CONCEPT_REVIEW, id: L.conceptRecordId}}, AT, 'reviewer', F.person('reviewer')), /\(definition\): /, 'the forms are verified here first');
});

// ------------------------------------------------------------------------------------------------ 13
add('S1.13: a source may carry when it was checked, when it is due, its version scope and the file it was rendered from; the topic register takes one row per source topic', async () => {
  const {CC} = await mods(); let p = F.blankProject();
  const send = (type, payload, actor = 'importer', opts = F.importedBy(actor), doc = p) => CC.applyConceptCommand(doc, {type: 'knowledge.' + type, payload}, AT, actor, opts);
  const file = {file: 'Synthetic_Integration_Handbook.docx', fileSha256: 'a'.repeat(64), rendition: 'Synthetic_Integration_Handbook.md', renditionSha256: 'b'.repeat(64), lineStart: 1, lineEnd: 58, topicId: 'SYN-P001'};
  const extras = {checkedAt: '2026-10-29', reviewDue: '2027-10-29', versionScope: 'Synthetic edition 1', sourceFile: file};
  for (const [change, pattern] of [[{checkedAt: '29 October'}, /checkedAt as a date/], [{reviewDue: '2027-13-45'}, /reviewDue as a date/], [{versionScope: 'x'.repeat(241)}, /version scope/], [{sourceFile: {...file, fileSha256: 'short'}}, /SHA-256/], [{sourceFile: {...file, lineEnd: 0}}, /lines/], [{sourceFile: {...file, extra: 1}}, /unsupported field: extra/], [{sourceFile: 'a file'}, /source file/i]])
    assert.throws(() => send('source', F.sourcePayload('SYN-P001', F.SYN_P001, {...extras, ...change})), pattern);
  const s = send('source', F.sourcePayload('SYN-P001 Transactional outbox', F.SYN_P001, extras)); p = s.document; const src = p.knowledge.sources[0];
  assert.deepEqual([src.checkedAt, src.reviewDue, src.versionScope, src.sourceFile], [extras.checkedAt, extras.reviewDue, extras.versionScope, file]);
  assert.equal(src.origin, 'recorded-original', 'the origin of a source keeps its meaning (how it was acquired)'); assert.equal(src.hash, sha256(F.SYN_P001.join('\n')));
  assert.throws(() => K.applyKnowledgeCommand(F.blankProject(), {type: 'knowledge.source', payload: F.sourcePayload('SYN-P001', F.SYN_P001, {sourceFile: {...file, fileSha256: 'short'}})}, AT, 'importer'), /SHA-256/, 'validated on the old entry too');
  p = send('library', LIBRARY_MARK, 'steward', F.person('steward')).document; p = send('concept', CONCEPT).document;
  const topic = {file: file.file, topicId: 'SYN-P001', title: 'Transactional outbox', lineStart: 1, lineEnd: 58, sliceSha256: src.hash, sourceId: s.selected, declaredKind: 'pattern', intendedUse: 'design-method', conceptId: 'SYN-P001', reason: ''};
  for (const [change, pattern] of [[{sliceSha256: 'c'.repeat(64)}, /does not match the source/], [{sourceId: 'KS-9999'}, /saved source/], [{intendedUse: 'decoration'}, /intended use/], [{conceptId: 'SYN-P404'}, /SYN-P404 is not in the concept register/], [{conceptId: null}, /Say why/], [{intendedUse: 'not-imported'}, /Say why/], [{lineEnd: 0}, /lines/], [{file: ''}, /file/], [{topicId: ''}, /topic/], [{surprise: true}, /unsupported field: surprise/]])
    assert.throws(() => send('topic', {...topic, ...change}), pattern);
  const t1 = send('topic', topic); p = t1.document; assert.match(t1.selected, /^KT-\d{4}$/);
  assert.deepEqual(p.knowledge.topics[0], {id: t1.selected, ...topic, at: AT, actor: 'importer'});
  const t2 = send('topic', {...topic, title: 'Transactional outbox (retitled)'}); assert.equal(t2.selected, t1.selected, 'one row per file and topic: saved again, it is replaced'); assert.equal(t2.document.knowledge.topics.length, 1);
  const none = send('topic', {...topic, topicId: 'SYN-X001', title: 'Front matter', conceptId: null, sourceId: null, intendedUse: 'not-imported', reason: 'Front matter holds no concept.'}, 'importer', F.importedBy('importer'), p).document;
  assert.equal(none.knowledge.topics.length, 2); assert.equal(none.knowledge.topics[1].reason, 'Front matter holds no concept.');
  assert.deepEqual(K.releasedClaims(none), []);
});

// ------------------------------------------------------------------------------------------------ 14
add('S1.14 (isolation): the route\'s knowledge module imports none of the new modules, no client module imports them, the command wrapper is reached by the server only, and the built client holds none of them', async () => {
  const NEW = ['concept-form.js', 'knowledge-concepts.js', 'knowledge-concept-commands.js'], IMPORTS = /(?:^|[\s;{}()])(?:import|export)\s*(?:[\w*${},\s]*?from\s*)?['"](\.{1,2}\/[^'"]+\.m?js)['"]|\bimport\(\s*['"](\.{1,2}\/[^'"]+\.m?js)['"]\s*\)/g, imports = file => [...readFileSync(file, 'utf8').matchAll(IMPORTS)].map(m => (m[1] || m[2]).split('/').at(-1));
  for (const name of NEW) assert(!imports('public/knowledge-governance.js').includes(name), 'knowledge-governance.js imports ' + name);
  const importers = Object.fromEntries(NEW.map(n => [n, []]));
  for (const file of readdirSync('public').filter(f => f.endsWith('.js'))) for (const name of imports('public/' + file)) if (importers[name] && !NEW.includes(file)) importers[name].push(file);
  assert.deepEqual(importers, {'concept-form.js': [], 'knowledge-concepts.js': [], 'knowledge-concept-commands.js': []}, 'a client module imports a new knowledge module: it would put it on the route or add a script file');
  assert.deepEqual(imports('public/concept-form.js'), [], 'concept-form.js imports nothing');
  assert(imports('worker.js').includes('knowledge-concept-commands.js') && !imports('worker.js').includes('knowledge-governance.js'), 'the worker reaches knowledge commands through the one wrapper');
  assert.match(readFileSync('worker.js', 'utf8'), /type\.startsWith\('knowledge\.'\)\?applyConceptCommand\(own,input\.command,at,actor,\{author\}\)/);
  if (existsSync('dist/client-metafile.json')) { const meta = JSON.parse(readFileSync('dist/client-metafile.json', 'utf8')), inputs = Object.keys(meta.inputs); for (const name of NEW) assert(!inputs.includes('public/' + name), 'the built client holds ' + name);
    // Nor does it hold the limit tiers (ruling B8 put them beside the commands in knowledge-governance.js, which is on the route:
    // the client reads no tier, and a frozen constant there cost 188 B on the chapters route before it was made a plain literal).
    for (const file of Object.keys(meta.outputs).filter(f => f.endsWith('.js') && existsSync(f))) assert(!/topics:300|history:6e3|history:6000/.test(readFileSync(file, 'utf8')), 'the built client holds the knowledge limit tiers: ' + file); }
  // The tiers are frozen where the commands run.
  { const {CC} = await mods(); assert(Object.isFrozen(CC.KNOWLEDGE_LIMIT_TIERS) && Object.isFrozen(CC.KNOWLEDGE_LIMIT_TIERS.project) && Object.isFrozen(CC.KNOWLEDGE_LIMIT_TIERS.library)); assert(!/KNOWLEDGE_LIMIT_TIERS=Object\.freeze/.test(readFileSync('public/knowledge-governance.js', 'utf8')), 'a call at the top of knowledge-governance.js stays in the client bundle'); }
});

// ================================================================================================ the fix-up round
// Cases added after the adversarial review of this slice and the lead's rulings of 2026-11-18 (RULINGS-2026-11-18.md,
// section B). Each failed on the slice's first head (f9d9bdc) before its change.
// ------------------------------------------------------------------------------------------------ 15
add('S1.15 (review must-fix 1 and 2): a quote is measured as it is matched, with whitespace collapsed, and a verbatim diagram source has the same floor; a target label follows the number rule and an identifier field holds an identifier', async () => {
  const {CF, CC} = await mods(), all = F.p001Forms(), L = await library({forms: []}), frozen = JSON.stringify(L.document);
  // Refused by the validator and by knowledge.claim alike, here sent by an agent account (which may send a candidate).
  const refused = (type, change, pattern) => { const f = all[type], form = clone(f.content); change(form);
    assert.match(CF.conceptFormIssues(form, ctx(f)).join(' '), pattern, type + ': the validator');
    assert.throws(() => CC.applyConceptCommand(L.document, {type: 'knowledge.claim', payload: {...F.formClaim(L.sourceId, 'SYN-P001', f), form}}, AT, 'bot', F.agent('bot')), pattern, type + ': knowledge.claim'); };
  const valid = (type, change) => { const f = all[type], form = clone(f.content); change(form); assert.deepEqual(CF.conceptFormIssues(form, ctx(f)), [], type); };
  // Must-fix 1. Two letters padded with line breaks or spaces are three characters once collapsed, and "e t" is in almost any passage.
  refused('applicability', f => { f.useWhen[0] = {text: 'Use it for every system of the bank, with no exception.', at: [16, 19], quote: 'e\n\n\n\n\n\n\n\n\n\nt'}; }, /applicability\.useWhen\[0\] has no verbatim quote \(12 to 240 characters\)/);
  refused('applicability', f => { f.guaranteeBoundary.quote = 'o' + ' '.repeat(10) + 'c'; }, /applicability\.guaranteeBoundary has no verbatim quote/);
  refused('calculation', f => { f.quotes[0].quote = 'e' + ' '.repeat(10) + 't'; }, /calculation\.quotes\[0\] is a verbatim quote of 12 to 240 characters/);
  refused('definition', f => { f.quotes = [{field: 'short', quote: '\t\t\t\t\t\tin\t\t\t\t\t\t'}]; }, /definition\.quotes\[0\] is a verbatim quote of 12 to 240 characters/);
  // A run of punctuation grounds nothing either: a quote holds at least eight letters or digits.
  { const excerpt = 'A link is drawn as --- --- --- --- between two boxes.', form = {type: 'definition', v: 1, short: 'A link joins two boxes.', quotes: [{field: 'short', quote: '--- --- --- ---'}]};
    assert.match(CF.conceptFormIssues(form, {excerpt, lineStart: 1}).join(' '), /definition\.quotes\[0\] is a verbatim quote of 12 to 240 characters/);
    assert.deepEqual(CF.conceptFormIssues({...form, quotes: [{field: 'short', quote: 'A link is drawn as --- --- --- --- between'}]}, {excerpt, lineStart: 1}), []); }
  // The upper bound is measured the same way: 240 characters of text, however it was wrapped in the source.
  { const words = Array.from({length: 40}, (_, i) => 'word' + String.fromCharCode(97 + i % 26)).join(' '), excerpt = words.split(' ').join('\n'), form = {type: 'definition', v: 1, short: 'Forty words.', quotes: [{field: 'short', quote: words.split(' ').join('   \n')}]};
    assert(words.length <= 240 && form.quotes[0].quote.length > 240); assert.deepEqual(CF.conceptFormIssues(form, {excerpt, lineStart: 1}), [], 'a quote of 240 characters once collapsed is a quote'); }
  // A diagram source is verbatim text of the passage: it has the same floor.
  refused('mechanism', f => { f.diagram = {notation: 'mermaid', source: 'S', origin: 'source-figure', at: [10, 10]}; }, /mechanism\.diagram: the diagram source is the passage's own text \(at least 12 characters/);
  refused('mechanism', f => { f.diagram = {notation: 'mermaid', source: 'e' + '\n'.repeat(12) + 'b', origin: 'source-figure', at: [10, 10]}; }, /mechanism\.diagram: the diagram source is the passage's own text/);
  valid('mechanism', f => { f.diagram = {notation: 'text', source: 'the booking service writes the booking and the outbox row in one commit', origin: 'source-figure', at: [10, 10]}; });
  // Must-fix 2 (1). A target's label is a text of a decision-bearing form: it states a number only where the item's quote holds it.
  refused('selection', f => { f.alternatives[0].target = {label: 'Polling relay every 5 seconds at 99.99%'}; }, /selection\.alternatives\[0\]\.target\.label states the number 5, which its quote does not contain/);
  refused('composition', f => { f.relations[1].target = {label: 'Unsafe dual write (3 of 4 incidents)'}; }, /composition\.relations\[1\]\.target\.label states the number 3/);
  valid('composition', f => { f.relations[1] = {verb: 'related', target: {label: 'A batch of 50 rows'}, reason: 'The handbook names it as a teaching value.', at: [32, 32], quote: 'A teaching value is 50 rows.'}; });
  // Must-fix 2 (2). An identifier is the one text the number rule does not read, so it holds an identifier and no sentence.
  refused('composition', f => { f.roles[0].id = 'SLA 99.999 percent guaranteed'; }, /composition\.roles\[0\]\.id is an identifier \(letters, digits and hyphens only\)/);
  refused('composition', f => { f.roles[0].sameAs = 'the same as 2 relays'; }, /composition\.roles\[0\]\.sameAs is an identifier/);
  refused('composition', f => { f.sequence[0].ownerRole = 'the outbox writer, within 5 seconds'; }, /composition\.sequence\[0\]\.ownerRole is an identifier/);
  refused('verification', f => { f.scenarios[0].id = 'crash after publish in under 30 seconds'; }, /verification\.scenarios\[0\]\.id is an identifier/);
  refused('composition', f => { f.relations[0].target = {alias: {scheme: 'external', aliasId: 'Polling relay every 5 seconds at 99.99%'}}; }, /composition\.relations\[0\]\.target names a concept id, an alias \(scheme and id\) or a label/);
  valid('verification', f => { f.scenarios[0].id = 'SYN-P001-T2'; });
  // (Ruling G1 of 2026-11-18: an identifier holds no point, underscore or colon; the first fix-up accepted 'outbox_writer.v2' and 'role:relay' here. Case S1.27.)
  valid('composition', f => { f.roles[0].id = 'outbox-writer-v2'; f.roles[0].sameAs = 'SYN-C001'; f.sequence[0].ownerRole = 'role-relay'; });
  refused('composition', f => { f.roles[0].id = 'outbox_writer.v2'; }, /composition\.roles\[0\]\.id is an identifier \(letters, digits and hyphens only\)/);
  refused('composition', f => { f.sequence[0].ownerRole = 'role:relay'; }, /composition\.sequence\[0\]\.ownerRole is an identifier \(letters, digits and hyphens only\)/);
  valid('composition', f => { f.relations[0].target = {conceptId: 'SYN-P002'}; f.relations[1].target = {alias: {scheme: 'handbook', aliasId: 'SYN-A001'}}; });
  valid('composition', f => { f.relations[1].target = {alias: {scheme: 'aiw-method', aliasId: 'delivery/transactional-outbox'}}; });
  assert.equal(JSON.stringify(L.document), frozen, 'nothing was stored by a refused request');
});

// ------------------------------------------------------------------------------------------------ 16
add('S1.16 (ruling B1): a claim that carries a form is read only by the concept readers: the reader of released claims hands none to anyone, a form is linked to no record, the stewards\' reading of a record holds none, and an organisation release pinned in a design project offers its forms through the concept readers alone', async () => {
  const {KC} = await mods(), L = await library({forms: ['definition', 'applicability'], verify: true, review: true, mark: F.MARKER});
  // A plain claim beside the two forms. Forms are released apart from plain claims: every reader of released claims is
  // handed the release as well as the claim, so a release that holds a form is the concept readers' alone.
  const plain = L.k('claim', {sourceId: L.sourceId, lineStart: 5, lineEnd: 5, subjectId: 'Outbox', predicate: 'stores', statement: 'An outbox stores the notice with the booking.', claimType: 'definition'}, 'importer');
  L.k('review', {...F.REVIEW, id: plain}, 'reviewer');
  assert.throws(() => L.k('release', {...F.REVIEW, title: 'Mixed', claimIds: [plain, L.claimIds.definition, L.claimIds.applicability]}, 'releaser'), /A release holds plain claims or the forms of concepts, not both/);
  const releaseId = L.k('release', {...F.REVIEW, title: 'Synthetic integration concepts 1', claimIds: [L.claimIds.definition, L.claimIds.applicability]}, 'releaser');
  L.k('activate', {...F.REVIEW, id: releaseId, stamp: K.knowledgeStamp(L.document)}, 'releaser');
  const plainRelease = L.k('release', {...F.REVIEW, title: 'One plain claim', claimIds: [plain]}, 'releaser');
  L.k('activate', {...F.REVIEW, id: plainRelease, stamp: K.knowledgeStamp(L.document)}, 'releaser');
  const p = L.document, requirement = p.artefacts.find(a => a.type === 'requirement').id;
  assert.deepEqual(p.knowledge.pins, [releaseId, plainRelease], 'both releases are active');
  assert.deepEqual(brainContext(p, {id: requirement, chapter: 1}).governed.receipt.activeReleases, [{id: plainRelease, checksum: p.knowledge.releases.find(r => r.id === plainRelease).checksum}], 'the Brain\'s receipt names the release of plain claims, which it reads, and not the release of forms');
  assert.deepEqual(K.releasedClaims(p).map(h => [h.release.id, h.claim.id, h.eligible]), [[plainRelease, plain, true]], 'released claims: the plain claim, and no form');
  assert(!JSON.stringify(K.releasedClaims(p)).includes(F.MARKER), 'neither as a claim nor inside a release handed to a reader');
  // A release that holds both anyway (written into the document) reaches no reader of released claims, whatever else it holds.
  { const q = clone(p), r = q.knowledge.releases.find(x => x.id === releaseId); r.claims.push(clone(q.knowledge.claims.find(c => c.id === plain))); r.checksum = digest({...r, checksum: undefined});
    assert.deepEqual(K.releasedClaims(q).map(h => h.release.id), [plainRelease]); assert.deepEqual(KC.conceptReading(q, 'SYN-P001').forms.map(f => f.status), ['released', 'released']); }
  assert.deepEqual(KC.conceptReading(p, 'SYN-P001').forms.map(f => [f.type, f.status, !!f.content]), [['definition', 'released', true], ['applicability', 'released', true]], 'the concept readers read them');
  for (const reading of [knowledgeStructures(p), architectureKnowledgeSnapshot(p), domainKnowledge(p), architectureIntelligence(p, {id: requirement}), brainContext(p, {id: requirement, chapter: 1}), intelligencePacket(p, {chapter: 1, objectId: requirement, mode: 'mind', prompt: PROMPT})]) assert(!JSON.stringify(plainJSON(reading)).includes(F.MARKER), 'a reader built on released claims was handed a form');
  // A form is linked to no record (a design record relies on one through an active pin: slice S3); a plain claim is linked as before.
  assert.throws(() => L.k('link', {...F.REVIEW, claimId: L.claimIds.applicability, releaseId, objectId: requirement}, 'architect'), /Choose an eligible claim from an active release/);
  const linkId = L.k('link', {...F.REVIEW, claimId: plain, releaseId: plainRelease, objectId: requirement}, 'architect'); assert.equal(K.claimReceiptCurrent(L.document, L.document.knowledge.links.find(l => l.id === linkId).receipt), true);
  // And a link to a form that a document holds anyway is not current support: its record is asked to review it.
  { const q = clone(L.document), release = q.knowledge.releases.find(x => x.id === releaseId), form = release.claims.find(c => c.form?.type === 'applicability');
    q.knowledge.links.push({id: 'KL-9999', objectId: requirement, relationship: 'informs', reason: 'Written into the document.', reviewer: 'Nobody', actor: 'architect', at: AT, receipt: K.claimReceipt(q, form, release)});
    assert.equal(K.claimReceiptCurrent(q, q.knowledge.links.at(-1).receipt), false); assert.deepEqual(K.knowledgeFindings(q).map(f => [f.id, f.title]), [['knowledge:KL-9999', 'Review changed architectural support']]); }
  // The organisation's copies of the two releases, pinned in a design project: the plain claim is a released claim there, the forms are the concept readers' alone.
  { const publish = (id, from) => ({...K.organizationKnowledgeRelease(p, from, {organizationId: 'org-synthetic', id, title: 'Synthetic organisation release ' + id, actor: 'releaser', at: AT}), signature: 'synthetic-signature'}), pin = {at: AT, actor: 'architect', reviewer: 'Synthetic second person', reason: 'The design uses the organisation\'s integration concepts.', verified: true};
    const published = publish('org-release-1', releaseId); assert.equal(published.claims.filter(c => c.form).length, 2, 'the published release carries the forms');
    const design = K.pinOrganizationKnowledge(K.pinOrganizationKnowledge(F.bankProject(), published, pin).document, publish('org-release-2', plainRelease), pin).document;
    assert.deepEqual(K.releasedClaims(design).map(h => [h.release.id, h.claim.id, h.eligible, 'form' in h.claim]), [['org-release-2', plain, true, false]]);
    assert.deepEqual(KC.releasedConcepts(design).map(c => [c.conceptId, c.release.id, c.eligible, c.forms.map(f => f.status)]), [['SYN-P001', 'org-release-1', true, ['released', 'released']]]);
    const after = designReadings(design); for (const [key, reading] of Object.entries(after)) assert(!JSON.stringify(reading).includes(F.MARKER), 'an organisation release: the marker reached ' + key); }
  // The stewards' reading of a record lists the project's knowledge on that record, candidates included. A form claim whose
  // subject is the record's reference (written into the document: no command stores one, ruling B7) is not among it.
  { const bank = F.bankProject(), packet = reasoningPacket(bank, {task: 'decisions', ids: ['M:8:rest']}), raw = mockAssessment(packet), run = {id: 'run-1', status: 'completed', provider: 'OpenAI', model: 'mock-sol', createdAt: AT, packet, result: settleReasoning(packet, guardReasoning(packet, validateReasoningOutput(raw, packet)), mockReview({candidate: raw}))};
    const dismissed = adoptReasoning(bank, {itemId: 'M:8:rest', outcome: 'dismissed', reason: 'The channel gateway already enforces this budget.'}, run, AT).document, sa = dismissed.coauthoring.assessments.at(-1);
    const C = await library({forms: ['definition', 'applicability'], mark: F.MARKER}), q = graft(dismissed, C.document);
    for (const c of q.knowledge.claims) c.subjectId = 'IF-001';
    q.knowledge.claims.push({...clone(q.knowledge.claims[0]), id: 'KC-9001', statement: 'A plain candidate claim on the interface.', form: undefined, authoredAs: undefined});
    const reading = stewardshipReading(q, 'K:' + sa.id); assert(reading, 'the stewards\' reading exists');
    assert.deepEqual(reading.reading.projectKnowledge, ['KC-9001 (candidate): A plain candidate claim on the interface.'], 'a plain candidate is listed as before; no form is');
    assert(!JSON.stringify(reading).includes(F.MARKER)); assert(!JSON.stringify(reasoningPacket(q, {task: 'decisions', ids: ['K:' + sa.id]})).includes(F.MARKER), 'nor does Sol\'s packet for the stewards'); }
});

// ------------------------------------------------------------------------------------------------ 17
add('S1.17 (ruling B2): concepts, topics and claims that carry a form are written in a knowledge library only, which a person marks; a library that holds one of them cannot be unmarked; outside a library the readers return released content only', async () => {
  const {CC, KC} = await mods(), NOT_A_LIBRARY = /are written in a knowledge library: a person marks this project as one first/;
  const send = (doc, type, payload, actor = 'importer', opts = F.person(actor)) => CC.applyConceptCommand(doc, {type: 'knowledge.' + type, payload}, AT, actor, opts);
  const topic = {file: 'Synthetic_Integration_Handbook.docx', topicId: 'SYN-X001', title: 'Front matter', lineStart: 1, lineEnd: 3, sliceSha256: sha256(F.SYN_P001.slice(0, 3).join('\n')), sourceId: null, declaredKind: 'front matter', intendedUse: 'not-imported', conceptId: null, reason: 'Front matter holds no concept.'};
  // A project nobody marked: a plain source and a plain claim save as on rc.10.73.42; a concept and a topic are refused, whoever sends them.
  const design = send(F.blankProject(), 'source', F.sourcePayload('SYN-P001 Transactional outbox', F.SYN_P001)).document, sourceId = design.knowledge.sources[0].id;
  const plain = {sourceId, lineStart: 5, lineEnd: 5, subjectId: 'Outbox', predicate: 'stores', statement: 'An outbox stores the notice with the booking.', claimType: 'definition'};
  assert.equal(send(design, 'claim', plain).document.knowledge.claims.length, 1, 'a plain claim is saved in any project');
  for (const opts of [F.person('importer'), F.importedBy('importer'), F.solDraft('importer'), F.agent('bot')]) { assert.throws(() => send(design, 'concept', CONCEPT, 'importer', opts), NOT_A_LIBRARY); assert.throws(() => send(design, 'topic', topic, 'importer', opts), NOT_A_LIBRARY); }
  // Nor does a project that holds a concept and its forms anyway (written into the document) take another form, an edit, a review or a retirement.
  const L = await library({forms: ['definition', 'mechanism', 'applicability']}), held = graft(F.blankProject(), L.document), forms = held.knowledge.concepts[0].forms, retire = {id: L.conceptRecordId, reason: 'Synthetic.', reviewer: 'Synthetic steward', reviewed: true};
  assert.equal(held.knowledge.library, undefined); assert.equal(held.knowledge.claims.filter(c => c.form).length, 3);
  assert.throws(() => send(held, 'claim', F.formClaim(L.sourceId, 'SYN-P001', F.p001Forms().example)), NOT_A_LIBRARY);
  assert.throws(() => send(held, 'concept', {...CONCEPT, id: L.conceptRecordId, forms, title: 'Edited outside a library'}), NOT_A_LIBRARY);
  assert.throws(() => send(held, 'review', {...F.REVIEW, formChecked: true, id: L.claimIds.definition}, 'reviewer'), NOT_A_LIBRARY);
  assert.throws(() => send(held, 'concept-review', {...CONCEPT_REVIEW, id: L.conceptRecordId}, 'reviewer'), NOT_A_LIBRARY);
  assert.throws(() => send(held, 'concept-retire', retire, 'architect'), NOT_A_LIBRARY); assert.throws(() => send(held, 'concept-restore', retire, 'architect'), NOT_A_LIBRARY);
  { const reviewed = graft(F.blankProject(), (await library({forms: ['definition'], verify: true, review: true})).document); assert.throws(() => send(reviewed, 'release', {...F.REVIEW, title: 'Outside a library', claimIds: [reviewed.knowledge.claims[0].id]}, 'releaser'), NOT_A_LIBRARY); }
  assert.equal(send(held, 'claim', plain).document.knowledge.claims.length, 4, 'a plain claim is still saved there');
  // Marking is a person's step; once marked, the same requests are accepted.
  for (const opts of [F.agent('bot'), F.solDraft('architect'), F.importedBy('architect')]) assert.throws(() => send(held, 'library', LIBRARY_MARK, 'architect', opts), /reviews nothing|agent/i);
  const marked = send(held, 'library', LIBRARY_MARK, 'architect').document;
  assert.equal(send(marked, 'claim', F.formClaim(L.sourceId, 'SYN-P001', F.p001Forms().example)).document.knowledge.claims.at(-1).form.type, 'example');
  assert.equal(send(marked, 'topic', topic).document.knowledge.topics.length, 1);
  // A library that holds a concept, a topic or a form claim stays one: each alone is enough.
  const STAYS = /holds concepts, topics or knowledge forms: it stays a knowledge library/, unmark = {...LIBRARY_MARK, enabled: false};
  assert.throws(() => send(marked, 'library', unmark, 'architect'), STAYS);
  const empty = send(F.blankProject(), 'library', LIBRARY_MARK, 'architect').document;
  assert.throws(() => send(send(empty, 'topic', topic).document, 'library', unmark, 'architect'), STAYS, 'a topic alone');
  assert.throws(() => send(send(empty, 'concept', CONCEPT).document, 'library', unmark, 'architect'), STAYS, 'a concept alone');
  { const only = clone(marked); delete only.knowledge.concepts; assert.throws(() => send(only, 'library', unmark, 'architect'), STAYS, 'a form claim alone'); }
  // A library that holds only plain sources and claims is unmarked by a person, and is then a project again.
  { const back = send(send(send(empty, 'source', F.sourcePayload('SYN-P002 Idempotent receiver', F.SYN_P002)).document, 'claim', {...plain, sourceId: 'KS-0001', lineStart: 4, lineEnd: 4}).document, 'library', unmark, 'architect').document;
    assert.equal(back.knowledge.library.enabled, false); assert.throws(() => send(back, 'concept', CONCEPT), NOT_A_LIBRARY); }
  // What a person is shown of unreleased content (build plan section 6 item 4, until the owner decides): in the library,
  // a candidate's teaching content with its label; in any other project nothing but released content.
  assert.deepEqual(KC.conceptTeachingForms(L.document, 'SYN-P001').map(f => [f.type, f.status, f.label.slice(0, 24)]), [['definition', 'candidate', 'Candidate · not reviewed'], ['mechanism', 'candidate', 'Candidate · not reviewed']]);
  assert.deepEqual(KC.conceptTeachingForms(held, 'SYN-P001'), [], 'outside a library a candidate offers no content');
  assert.deepEqual(KC.conceptReading(held, 'SYN-P001').forms.map(f => [f.type, f.status, f.content]), [['definition', 'candidate', null], ['mechanism', 'candidate', null], ['applicability', 'candidate', null]], 'and the concept reading names the forms without their content');
  { const verified = graft(F.blankProject(), (await library({forms: ['definition', 'mechanism'], verify: true, review: true})).document); assert.deepEqual(KC.conceptTeachingForms(verified, 'SYN-P001'), [], 'nor a reviewed form that is not released'); assert.equal(KC.conceptTeachingForms(send(verified, 'library', LIBRARY_MARK, 'architect').document, 'SYN-P001').length, 2); }
  { const active = graft(F.blankProject(), (await library({forms: ['definition', 'mechanism'], verify: true, review: true, release: true, activate: true})).document); assert.deepEqual(KC.conceptTeachingForms(active, 'SYN-P001').map(f => [f.type, f.status, !!f.content]), [['definition', 'released', true], ['mechanism', 'released', true]], 'released content is returned in any project'); }
});

// ------------------------------------------------------------------------------------------------ 18
add('S1.18 (ruling B3): the concept hash covers every field of the record but its bookkeeping, and the topics mapped to it; only a person changes what a review covered: an agent account, a draft by Sol, an import and a request that states no author are refused an edit, a form and a topic mapping on a concept that is reviewed or in a release, and accepted on a draft; a person\'s edit lapses the review; an upsert that changes nothing writes nothing', async () => {
  const {CC, KC} = await mods(), L = await library({forms: ['definition', 'mechanism'], verify: true}), LATER = '2026-11-17T10:00:00.000Z';
  const send = (doc, type, payload, actor = 'importer', opts = F.person(actor), at = AT) => CC.applyConceptCommand(doc, {type: 'knowledge.' + type, payload}, at, actor, opts);
  const topic = {file: 'Synthetic_Integration_Handbook.docx', topicId: 'SYN-P001', title: 'Transactional outbox', lineStart: 1, lineEnd: 58, sliceSha256: sha256(F.SYN_P001.join('\n')), sourceId: L.sourceId, declaredKind: 'pattern', intendedUse: 'design-method', conceptId: 'SYN-P001', reason: ''};
  // While the concept is a draft an import maps its topic; then a second person reviews the concept.
  L.k('topic', topic, 'importer', F.importedBy('importer')); L.k('concept', {...CONCEPT, conceptId: 'SYN-P002', title: 'Idempotent receiver'}, 'importer', F.importedBy('importer'));
  const draft = L.document; L.k('concept-review', {...CONCEPT_REVIEW, id: L.conceptRecordId}, 'reviewer');
  const p = L.document, read = doc => KC.conceptRecords(doc).find(c => c.conceptId === 'SYN-P001'), reviewed = read(p), forms = p.knowledge.concepts[0].forms, payload = {...CONCEPT, id: L.conceptRecordId, forms};
  assert.equal(reviewed.state, 'reviewed'); assert.equal(reviewed.hash, KC.conceptHash(p.knowledge.concepts[0], p.knowledge.claims, p.knowledge.topics));
  // 1. What the hash covers: every field of the record except the bookkeeping the ruling names.
  const BOOKKEEPING = ['at', 'actor', 'lastEditor', 'history', 'revision', 'changeNote', 'review', 'retired'], other = v => typeof v === 'string' ? v + ' (changed)' : typeof v === 'number' ? v + 1 : Array.isArray(v) ? v.slice(1) : v === null ? 'SYN-P002' : {...v, reason: 'Changed.'};
  const fields = Object.keys(p.knowledge.concepts[0]); assert.deepEqual(fields.filter(k => !BOOKKEEPING.includes(k)).sort(), ['conceptId', 'family', 'forms', 'id', 'kind', 'lenses', 'notAdopted', 'reviewDue', 'reviewTriggers', 'scope', 'splitFrom', 'stages', 'steward', 'successorOf', 'title']);
  for (const key of [...fields, 'retired', 'somethingNoCommandWrites']) { const q = clone(p), c = q.knowledge.concepts[0]; c[key] = key in c ? other(c[key]) : {at: AT, actor: 'architect', reviewer: 'x', reason: 'x'};
    assert.equal(KC.conceptHash(c, q.knowledge.claims, q.knowledge.topics) !== reviewed.hash, !BOOKKEEPING.includes(key), key + (BOOKKEEPING.includes(key) ? ' is bookkeeping: outside the hash' : ' is in the hash')); }
  // ...and the topics mapped to it, by file, topic id and slice hash.
  const withTopic = change => { const q = clone(p); change(q.knowledge.topics); return read(q).hash !== reviewed.hash; };
  for (const [what, change, moves] of [['the slice hash', t => { t[0].sliceSha256 = 'c'.repeat(64); }, true], ['the topic id', t => { t[0].topicId = 'SYN-P001-B'; }, true], ['the file', t => { t[0].file = 'Another.docx'; }, true], ['unmapped', t => { t[0].conceptId = null; }, true], ['mapped elsewhere', t => { t[0].conceptId = 'SYN-P002'; }, true], ['a second topic mapped to it', t => { t.push({...t[0], id: 'KT-9999', topicId: 'SYN-P001-C'}); }, true], ['a topic of another concept', t => { t.push({...t[0], id: 'KT-9998', topicId: 'SYN-P002', conceptId: 'SYN-P002'}); }, false], ['its title', t => { t[0].title = 'Retitled'; }, false], ['the order of two topics', t => { t.unshift({...t[0], id: 'KT-9997', topicId: 'SYN-P000'}); }, true]]) assert.equal(withTopic(change), moves, 'topic: ' + what);
  { const a = clone(p), b = clone(p); a.knowledge.topics.push({...a.knowledge.topics[0], id: 'KT-9999', topicId: 'SYN-A'}); b.knowledge.topics.unshift({...b.knowledge.topics[0], id: 'KT-9999', topicId: 'SYN-A'}); assert.equal(read(a).hash, read(b).hash, 'the topic rows are sorted before they are hashed'); }
  // 2. Only a person changes what the review covered.
  const ONLY = /SYN-P001 is reviewed or in a release: only a signed-in person changes what its review covered/, example = F.formClaim(L.sourceId, 'SYN-P001', F.p001Forms().example);
  const opposing = {...F.formClaim(L.sourceId, 'SYN-P001', F.p001Forms().applicability), polarity: 'prohibits'};
  const requests = doc => [['the review date', 'concept', {...payload, forms: doc.knowledge.concepts[0].forms, reviewDue: '2099-12-31'}], ['the steward', 'concept', {...payload, forms: doc.knowledge.concepts[0].forms, steward: 'Nobody'}], ['the review triggers', 'concept', {...payload, forms: doc.knowledge.concepts[0].forms, reviewTriggers: []}], ['what was not adopted', 'concept', {...payload, forms: doc.knowledge.concepts[0].forms, notAdopted: []}], ['the title', 'concept', {...payload, forms: doc.knowledge.concepts[0].forms, title: 'Renamed'}], ['a form taken off', 'concept', {...payload, forms: doc.knowledge.concepts[0].forms.slice(0, 1)}], ['a successor link', 'concept', {...payload, forms: doc.knowledge.concepts[0].forms, successorOf: 'SYN-P002', changeNote: 'rename', reason: 'Synthetic.'}],
    ['a form added', 'claim', example], ['an opposing candidate form', 'claim', opposing], ['the topic unmapped', 'topic', {...topic, conceptId: null, reason: 'Unmapped.'}], ['the topic mapped elsewhere', 'topic', {...topic, conceptId: 'SYN-P002'}], ['another topic mapped to it', 'topic', {...topic, topicId: 'SYN-P001-B', sourceId: null}], ['the topic\'s slice replaced', 'topic', {...topic, sourceId: null, sliceSha256: 'd'.repeat(64)}]];
  const NON_PERSONS = [['an agent account', 'bot', F.agent('bot')], ['a draft by Sol', 'architect', F.solDraft('architect')], ['an import', 'architect', F.importedBy('architect')], ['a request that states no author', 'architect', {}]];
  for (const [who, actor, opts] of NON_PERSONS) {
    for (const [what, type, body] of requests(p)) assert.throws(() => send(p, type, body, actor, opts), ONLY, who + ': ' + what + ' on a reviewed concept');
    // On a draft concept the same requests are accepted: a draft is nobody's review.
    for (const [what, type, body] of requests(draft)) assert.doesNotThrow(() => send(draft, type, body, actor, opts), who + ': ' + what + ' on a draft concept');
    // A change that the review did not cover is accepted on the reviewed concept too: the topic's title, the change note of an unchanged link.
    assert.equal(send(p, 'topic', {...topic, title: 'Transactional outbox (retitled)'}, actor, opts).document.knowledge.topics[0].title, 'Transactional outbox (retitled)');
    assert.equal(read(send(p, 'topic', {...topic, title: 'Transactional outbox (retitled)'}, actor, opts).document).state, 'reviewed');
  }
  assert.equal(read(p).state, 'reviewed', 'nothing lapsed the review');
  // The same holds once the concept is in a release, even after a person's edit lapsed its review.
  { const R = await library({forms: ['definition', 'mechanism'], verify: true, review: true, release: true}), edited = send(R.document, 'concept', {...CONCEPT, id: R.conceptRecordId, forms: R.document.knowledge.concepts[0].forms, steward: 'Another guild'}, 'architect').document;
    assert.equal(KC.conceptRecords(edited)[0].state, 'draft'); assert.equal(KC.conceptCovered(edited, edited.knowledge.concepts[0]), true);
    for (const [who, actor, opts] of NON_PERSONS) { assert.throws(() => send(edited, 'concept', {...CONCEPT, id: R.conceptRecordId, forms: edited.knowledge.concepts[0].forms, reviewDue: '2099-12-31'}, actor, opts), ONLY, who + ': in a release'); assert.throws(() => send(edited, 'claim', F.formClaim(R.sourceId, 'SYN-P001', F.p001Forms().example), actor, opts), ONLY); } }
  // 3. A person's edit is accepted and lapses the review, whichever covered field it changes; so does a person's topic mapping.
  for (const [what, type, body] of requests(p).filter(([, type]) => type !== 'claim')) { const q = send(p, type, body, 'architect').document, c = read(q); assert.notEqual(c.hash, reviewed.hash, 'a person: ' + what + ' moves the hash'); assert.equal(c.state, 'draft', 'a person: ' + what + ' lapses the review'); }
  { const q = send(p, 'claim', example, 'architect').document; assert.equal(read(q).state, 'reviewed', 'a person\'s new form claim is a candidate until it is attached: the review stands'); assert.equal(read(send(q, 'concept', {...payload, forms: [...forms, {type: 'example', claimId: q.knowledge.claims.at(-1).id}]}, 'architect').document).state, 'draft'); }
  // A person's opposing candidate keeps the fail-safe of rc.10.73.42: a contradiction opens and the review no longer stands until a person resolves it (ruling B9).
  { const q = send(send(p, 'claim', F.formClaim(L.sourceId, 'SYN-P001', F.p001Forms().applicability), 'importer').document, 'claim', opposing, 'architect').document; assert.equal(q.knowledge.contradictions.filter(x => x.status === 'open').length, 1); }
  // 4. An upsert that changes nothing writes nothing: no history line, no new time, no new actor; whoever sends it, whenever.
  for (const [who, actor, opts] of [['a person', 'architect', F.person('architect')], ...NON_PERSONS]) {
    assert.equal(JSON.stringify(send(p, 'concept', payload, actor, opts, LATER).document), JSON.stringify(p), who + ': the concept saved again as it is');
    assert.equal(JSON.stringify(send(p, 'topic', topic, actor, opts, LATER).document), JSON.stringify(p), who + ': the topic saved again as it is');
    assert.equal(send(p, 'concept', payload, actor, opts, LATER).selected, L.conceptRecordId); assert.equal(send(p, 'topic', topic, actor, opts, LATER).selected, p.knowledge.topics[0].id);
  }
  { const q = send(p, 'concept', {...payload, steward: 'Another guild'}, 'architect', F.person('architect'), LATER).document, c = q.knowledge.concepts[0]; assert.deepEqual([c.revision, c.lastEditor, c.history.at(-1).at, q.knowledge.history.length], [p.knowledge.concepts[0].revision + 1, 'architect', LATER, p.knowledge.history.length + 1], 'a change is written as before'); }
});

// ------------------------------------------------------------------------------------------------ 19
add('S1.19 (ruling B4, should-fix 4): a concept review records the reviewer\'s account kind and stands on a read only with a person\'s; a request whose author names no account of a person is nobody\'s review, release, library mark or retirement', async () => {
  const {CC, KC} = await mods(), L = await library({forms: ['definition', 'mechanism'], verify: true});
  const send = (doc, type, payload, actor = 'importer', opts = F.person(actor)) => CC.applyConceptCommand(doc, {type: 'knowledge.' + type, payload}, AT, actor, opts);
  const reviewed = send(L.document, 'concept-review', {...CONCEPT_REVIEW, id: L.conceptRecordId}, 'reviewer').document, review = reviewed.knowledge.concepts[0].review, ids = Object.values(L.claimIds);
  assert.equal(review.account, 'person', 'the review records the reviewer\'s account kind'); assert.deepEqual(Object.keys(review), ['decision', 'actor', 'account', 'reviewer', 'at', 'reason', 'identityChecked', 'formsChecked', 'crosswalkChecked', 'conceptHash']);
  assert.equal(KC.conceptRecords(reviewed)[0].state, 'reviewed'); assert.equal(KC.conceptCovered(reviewed, reviewed.knowledge.concepts[0]), true);
  // On every read the review stands only with a person's account: a review without one (as the first build wrote it), an agent's or any other does not.
  for (const account of ['(absent)', 'agent', 'service', '', null, 'Person']) { const q = clone(reviewed), r = q.knowledge.concepts[0].review; if (account === '(absent)') delete r.account; else r.account = account;
    assert.equal(KC.conceptRecords(q)[0].state, 'draft', 'account ' + account + ': the review does not stand'); assert.equal(KC.conceptCovered(q, q.knowledge.concepts[0]), false);
    assert.throws(() => send(q, 'release', {...F.REVIEW, title: 'Synthetic', claimIds: ids}, 'releaser'), /SYN-P001 is not reviewed/, 'and its forms are not released'); }
  assert.equal(send(reviewed, 'release', {...F.REVIEW, title: 'Synthetic', claimIds: ids}, 'releaser').document.knowledge.releases.length, 1);
  // Should-fix 4: an author object that names no account is not a person's request.
  const NO_ACCOUNT = id => ({author: {kind: 'person', id, reviewed: true}}), NOBODY = /states no account of a signed-in person/, fresh = await library({forms: ['definition', 'mechanism']});
  assert.throws(() => send(L.document, 'concept-review', {...CONCEPT_REVIEW, id: L.conceptRecordId}, 'reviewer', NO_ACCOUNT('reviewer')), NOBODY);
  assert.throws(() => send(fresh.document, 'review', {...F.REVIEW, formChecked: true, id: fresh.claimIds.definition}, 'reviewer', NO_ACCOUNT('reviewer')), NOBODY);
  assert.throws(() => send(fresh.document, 'review', {...F.REVIEW, formChecked: true, id: fresh.claimIds.definition, decision: 'rejected'}, 'reviewer', NO_ACCOUNT('reviewer')), NOBODY);
  assert.throws(() => send(reviewed, 'release', {...F.REVIEW, title: 'Synthetic', claimIds: ids}, 'releaser', NO_ACCOUNT('releaser')), NOBODY);
  assert.throws(() => send(F.blankProject(), 'library', LIBRARY_MARK, 'architect', NO_ACCOUNT('architect')), NOBODY);
  for (const type of ['concept-retire', 'concept-restore']) assert.throws(() => send(L.document, type, {id: L.conceptRecordId, reason: 'Synthetic.', reviewer: 'Synthetic steward', reviewed: true}, 'architect', NO_ACCOUNT('architect')), NOBODY);
  // Nor is it a person's change of what a review covered (ruling B3), nor a person's form: a form it saves is released by a third person, as an import's is.
  assert.throws(() => send(reviewed, 'concept', {...CONCEPT, id: L.conceptRecordId, forms: reviewed.knowledge.concepts[0].forms, steward: 'Nobody'}, 'architect', NO_ACCOUNT('architect')), /only a signed-in person changes what its review covered/);
  assert.equal(send(fresh.document, 'claim', F.formClaim(fresh.sourceId, 'SYN-P001', F.p001Forms().example), 'architect', NO_ACCOUNT('architect')).document.knowledge.claims.at(-1).authoredAs, 'import');
});

// ------------------------------------------------------------------------------------------------ 20
add('S1.20 (ruling B5, should-fix 3 and 5): a pin hands over nothing of a concept that is not eligible as a whole in its release, or that is retired, and the reading says why; a concept that is in a release is not restored', async () => {
  const {KC, CC} = await mods(), L = await library({verify: true, review: true, release: true, activate: true}), p = L.document, DECISION = ['applicability', 'selection', 'composition', 'calculation', 'verification'];
  const send = (doc, type, payload, actor = 'architect', opts = F.person(actor)) => CC.applyConceptCommand(doc, {type: 'knowledge.' + type, payload}, AT, actor, opts);
  const pinned = (doc, pin = {}) => { const q = clone(doc); q.knowledge.conceptPins = [{id: 'KU-0001', conceptId: 'SYN-P001', releaseId: L.releaseId, status: 'active', ...pin}]; return q; };
  // Whole and eligible: the five decision-bearing forms, and no reason.
  const whole = KC.conceptDecisionReading(pinned(p), 'KU-0001');
  assert.deepEqual([whole.pinId, whole.conceptId, whole.releaseId, whole.forms.map(f => f.type), whole.reasons], ['KU-0001', 'SYN-P001', L.releaseId, DECISION, []]); assert.deepEqual(KC.conceptDecisionForms(pinned(p), 'KU-0001'), whole.forms);
  assert.deepEqual(KC.releasedConcepts(p).map(c => [c.eligible, c.reasons]), [[true, []]]); assert.deepEqual(KC.conceptReading(p, 'SYN-P001').releases, [{releaseId: L.releaseId, title: 'Synthetic integration concepts 1', eligible: true, reasons: []}]);
  // One form unusable in that release (tampered, every hash recomputed around it): a concept is reviewed and released
  // whole, so a design record is handed none of it: not the roles and parameters without the use-when and avoid-when.
  const careful = (type, change) => { const q = clone(p), r = q.knowledge.releases[0], c = r.claims.find(x => x.form.type === type); change(c.form); c.review.claimHash = digest({...c, review: undefined}); r.checksum = digest({...r, checksum: undefined}); assert.equal(K.knowledgeEligibility(q, c, r).eligible, true); return q; };
  for (const [type, change, why] of [['applicability', f => { f.useWhen[0].quote = 'a committed booking may be dropped safely'; }, /SYN-P001 is not usable as a whole in "Synthetic integration concepts 1": applicability \(KC-\d+\): The form is invalid: applicability\.useWhen\[0\]: the quote is not found/], ['verification', f => { f.scenarios[0].evidenceLevel = 'passed'; }, /verification \(KC-\d+\): The form is invalid: .*is not a level a source states of itself/], ['exercise', f => { f.items[0].level = 'expert'; }, /exercise \(KC-\d+\): The form is invalid/], ['definition', f => { f.quotes = [{field: 'short', quote: 'an outbox guarantees exactly-once delivery'}]; }, /definition \(KC-\d+\): The form is invalid/]]) {
    const q = careful(type, change), reading = KC.conceptDecisionReading(pinned(q), 'KU-0001');
    assert.deepEqual(reading.forms, [], type + ' unusable: nothing of the concept is handed over'); assert.deepEqual(KC.conceptDecisionForms(pinned(q), 'KU-0001'), []);
    assert.equal(reading.reasons.length, 1); assert.match(reading.reasons[0], why);
    assert.deepEqual(KC.releasedConcepts(q).map(c => c.eligible), [false]); assert.match(KC.releasedConcepts(q)[0].reasons.join(' '), why); assert.match(KC.conceptReading(q, 'SYN-P001').releases[0].reasons.join(' '), why);
    assert.equal(KC.conceptReading(q, 'SYN-P001').forms.filter(f => f.status === 'released').length, 8, 'each other form still reads released on its own'); }
  // A release that holds the concept without its definition is not the concept whole either.
  { const q = clone(p), r = q.knowledge.releases[0]; r.claims = r.claims.filter(c => c.form.type !== 'definition'); r.checksum = digest({...r, checksum: undefined});
    const reading = KC.conceptDecisionReading(pinned(q), 'KU-0001'); assert.deepEqual(reading.forms, []); assert.match(reading.reasons[0], /the release holds no definition of SYN-P001/); }
  // Retired: nothing is handed over, and the reading says so. (A finding for a concept retired behind an active pin is slice S3.)
  const retire = {id: L.conceptRecordId, reason: 'Superseded in the synthetic handbook.', reviewer: 'Synthetic steward', reviewed: true}, retired = send(p, 'concept-retire', retire).document;
  { const reading = KC.conceptDecisionReading(pinned(retired), 'KU-0001'); assert.deepEqual(reading.forms, []); assert.deepEqual(reading.reasons, ['SYN-P001 is retired in this project: Superseded in the synthetic handbook.']);
    assert.equal(KC.conceptReading(retired, 'SYN-P001').state, 'retired'); assert.deepEqual(KC.releasedConcepts(retired).map(c => [c.eligible, c.reasons]), [[false, ['SYN-P001 is retired in this project: Superseded in the synthetic handbook.']]]); }
  // A concept that is in a release is not restored (the design's rule for this command): active or not, a successor concept follows it.
  assert.throws(() => send(retired, 'concept-restore', retire), /SYN-P001 is in the release "Synthetic integration concepts 1": a released concept is not restored\. Record a successor concept/);
  { const R = await library({forms: ['definition'], verify: true, review: true, release: true}); assert.deepEqual(R.document.knowledge.pins, []); assert.throws(() => send(send(R.document, 'concept-retire', {...retire, id: R.conceptRecordId}).document, 'concept-restore', {...retire, id: R.conceptRecordId}), /a released concept is not restored/); }
  { const U = await library({forms: ['definition'], verify: true, review: true}), back = send(send(U.document, 'concept-retire', {...retire, id: U.conceptRecordId}).document, 'concept-restore', {...retire, id: U.conceptRecordId}).document; assert.equal(KC.conceptRecords(back)[0].state, 'reviewed', 'an unreleased concept is restored as before'); }
  // Every other empty answer says why as well.
  assert.match(KC.conceptDecisionReading(p, 'KU-0001').reasons[0], /KU-0001 is not an active concept pin/); assert.match(KC.conceptDecisionReading(pinned(p, {status: 'moved'}), 'KU-0001').reasons[0], /not an active concept pin/);
  assert.match(KC.conceptDecisionReading(pinned(p, {releaseId: 'KR-9999'}), 'KU-0001').reasons[0], /KR-9999 is not an active release that holds SYN-P001/);
  assert.match(KC.conceptDecisionReading(pinned(p, {conceptId: 'SYN-P002'}), 'KU-0001').reasons[0], /is not an active release that holds SYN-P002/);
});

// ------------------------------------------------------------------------------------------------ 21
add('S1.21 (ruling B7, should-fix 9): a concept id is not a design record\'s reference, by its shape or because a record of the project bears it; the model kind of a calculation is an identifier', async () => {
  const {CF, CC} = await mods(), L = await library({forms: []}), all = F.p001Forms();
  const send = (doc, type, payload, actor = 'importer', opts = F.person(actor)) => CC.applyConceptCommand(doc, {type: 'knowledge.' + type, payload}, AT, actor, opts);
  // A prefix and a number is how every chapter numbers its records (REQ-001, IF-001, ADR-001, QD-003, CON-001) and how knowledge numbers its own (KC-0001).
  for (const id of ['REQ-001', 'IF-001', 'ADR-001', 'QD-3', 'CON-001', 'TR-003', 'KC-0001', 'X9-42']) {
    assert.equal(CF.CONCEPT_ID.test(id), false, id + ' is not a concept id');
    for (const opts of [F.person('importer'), F.importedBy('importer'), F.agent('bot')]) assert.throws(() => send(L.document, 'concept', {...CONCEPT, conceptId: id}, 'importer', opts), new RegExp(id + ' has the shape of a design record\'s reference \\(a prefix and a number, such as REQ-001\\)'), id);
  }
  for (const id of ['SYN-P001', 'PAT-TRANSACTIONAL-OUTBOX', 'CON-COMP-OUTBOX-RELAY', 'CON-PATTERN-OUTBOX', 'AAP-P030', 'CL-MSG-004', 'STYLE-MODULAR-MONOLITH', 'REQ-001-A', 'P-STRANGLER']) assert.equal(CF.CONCEPT_ID.test(id), true, id + ' is a concept id');
  assert.equal(send(L.document, 'concept', {...CONCEPT, conceptId: 'CL-MSG-004', title: 'Outbox relay'}).document.knowledge.concepts.length, 2);
  // A form names no record as a concept either.
  { const f = all.composition, form = clone(f.content); form.relations[0].target = {conceptId: 'REQ-001'}; assert.match(CF.conceptFormIssues(form, ctx(f)).join(' '), /composition\.relations\[0\]\.target names a concept id, an alias \(scheme and id\) or a label/); }
  // Whatever its shape, the id or reference a record of this project bears is not a concept's: here in the bank-payment reference, marked as a library by a person.
  { const bank = send(F.bankProject(), 'library', LIBRARY_MARK, 'steward').document, graph = recordGraph(bank), taken = [...graph.objects.values()].find(o => CF.CONCEPT_ID.test(o.id));
    assert(taken, 'the reference holds a record whose id has the shape of a concept id'); assert.match(taken.id, /^PROC-/);
    assert.throws(() => send(bank, 'concept', {...CONCEPT, conceptId: taken.id}), new RegExp(taken.id + ' is the reference of a record of this project'));
    assert.equal(send(bank, 'concept', CONCEPT).document.knowledge.concepts[0].conceptId, 'SYN-P001'); }
  // Should-fix 9: an evaluator kind is an identifier (wp3 and wp4 will register theirs), so it may hold digits and holds no sentence.
  const calculation = change => { const f = all.calculation, form = clone(f.content); change(form); return CF.conceptFormIssues(form, ctx(f)); };
  // (Ruling G1 of 2026-11-18: no point and no colon; the first fix-up accepted 'aiw.queue:mm1' here.)
  for (const kind of ['mm1-queue', 'queue-model-2', 'aiw-queue-mm1', 'oldest-unsent-age']) assert.deepEqual(calculation(f => { f.modelKind = kind; }), [], kind);
  for (const kind of ['queue model 2', 'An M/M/1 queue with 3 servers', 'mm1 queue', 'aiw.queue:mm1']) assert.match(calculation(f => { f.modelKind = kind; }).join(' '), /calculation\.modelKind is an identifier \(letters, digits and hyphens only\)/, kind);
  assert.match(calculation(f => { delete f.modelKind; }).join(' '), /calculation\.modelKind is required/);
});

// ------------------------------------------------------------------------------------------------ 22
add('S1.22 (should-fix 2 and 7): only an applicability form carries a structured architecture unit; a retired concept is not reviewed', async () => {
  const {CC, CF, KC} = await mods(), L = await library({forms: ['definition', 'mechanism'], verify: true}), all = F.p001Forms();
  const send = (doc, type, payload, actor = 'importer', opts = F.person(actor)) => CC.applyConceptCommand(doc, {type: 'knowledge.' + type, payload}, AT, actor, opts);
  // Should-fix 2. The unit is the typed, machine-read decision structure: a teaching form, or any other form, does not carry one.
  for (const type of CF.FORM_TYPES.filter(t => t !== 'applicability')) for (const opts of [F.person('importer'), F.importedBy('importer'), F.agent('bot')])
    assert.throws(() => send(L.document, 'claim', {...F.formClaim(L.sourceId, 'SYN-P001', all[type]), architectureUnit: F.UNIT}, 'importer', opts), new RegExp('(?:A|An) ' + type + ' form carries no structured architecture unit: only an applicability form does'), type);
  assert.equal(send(L.document, 'claim', F.formClaim(L.sourceId, 'SYN-P001', all.applicability)).document.knowledge.claims.at(-1).architectureUnit.kind, 'pattern');
  { const claims = (await library()).document.knowledge.claims; assert.deepEqual(claims.filter(c => 'architectureUnit' in c).map(c => c.form.type), ['applicability'], 'of the nine fixture forms only the applicability form holds a unit'); }
  // A plain claim carries its unit as on rc.10.73.42.
  assert.equal(send(L.document, 'claim', {sourceId: L.sourceId, lineStart: 16, lineEnd: 16, subjectId: 'Outbox', predicate: 'applies to', statement: 'Use an outbox where a booking must lead to a notice.', claimType: 'applicability', polarity: 'supports', conditions: ['A local booking must cause a publication.'], limitations: ['Receivers need their own identity record.'], architectureUnit: F.UNIT}).document.knowledge.claims.at(-1).architectureUnit.kind, 'pattern');
  // Should-fix 7. A retired concept is not reviewed: not verified, and not rejected or disputed either; restored, it is.
  const retire = {id: L.conceptRecordId, reason: 'Superseded in the synthetic handbook.', reviewer: 'Synthetic steward', reviewed: true}, retired = send(L.document, 'concept-retire', retire, 'architect').document;
  for (const decision of ['verified', 'rejected', 'disputed']) assert.throws(() => send(retired, 'concept-review', {...CONCEPT_REVIEW, id: L.conceptRecordId, decision}, 'reviewer'), /SYN-P001 is retired: restore it before reviewing/, decision);
  assert.equal(retired.knowledge.concepts[0].review, undefined); assert.equal(KC.conceptRecords(retired)[0].state, 'retired');
  const restored = send(retired, 'concept-restore', retire, 'architect').document; assert.equal(KC.conceptRecords(send(restored, 'concept-review', {...CONCEPT_REVIEW, id: L.conceptRecordId}, 'reviewer').document)[0].state, 'reviewed');
  // A concept reviewed and then retired reads retired, and its review, still on the record, is no review of a usable concept.
  { const reviewed = send(L.document, 'concept-review', {...CONCEPT_REVIEW, id: L.conceptRecordId}, 'reviewer').document, then = send(reviewed, 'concept-retire', retire, 'architect').document; assert.equal(KC.conceptRecords(then)[0].state, 'retired');
    assert.throws(() => send(then, 'release', {...F.REVIEW, title: 'Synthetic', claimIds: Object.values(L.claimIds)}, 'releaser'), /SYN-P001 is not reviewed/, 'and its forms are not released'); }
});

// ------------------------------------------------------------------------------------------------ 23
add('S1.23 (should-fix 8): a run of this suite that executed no case fails, and so does a case file that exports no case', async () => {
  const {spawnSync} = await import('node:child_process'), {mkdirSync, writeFileSync} = await import('node:fs');
  const run = args => { const r = spawnSync(process.execPath, ['rc44-wp1-knowledge-validate.mjs', ...args], {encoding: 'utf8', env: {...process.env, AIW_RC44_WP1_ALL: ''}}); return {status: r.status, out: r.stdout + r.stderr}; };
  const nothing = run(['--only', 'NO-CASE-HAS-THIS-NAME']); assert.equal(nothing.status, 1, 'a filter that matches nothing is not a pass'); assert.match(nothing.out, /No case was executed/); assert(!/PASS rc44 wp1 knowledge/.test(nothing.out));
  // A pending case alone is not an executed case.
  const pending = run(['--only', 'S2: not yet implemented']); assert.equal(pending.status, 1); assert.match(pending.out, /PENDING S2/); assert.match(pending.out, /No case was executed/);
  // A case file that exports no case fails the run, whatever the other files do.
  const dir = '.aiw-local/scratch/wp1-suite'; mkdirSync(dir, {recursive: true});
  writeFileSync(dir + '/empty-cases.mjs', 'export const cases = [];\n'); writeFileSync(dir + '/no-export.mjs', 'export const other = 1;\n'); writeFileSync(dir + '/one-case.mjs', 'export const cases = [{name: \'T1: a synthetic case\', run() {}}];\n');
  for (const file of ['empty-cases.mjs', 'no-export.mjs']) { const r = run(['--files', './' + dir + '/one-case.mjs,./' + dir + '/' + file]); assert.equal(r.status, 1, file); assert.match(r.out, /exports no case/); assert.match(r.out, /PASS T1: a synthetic case/); }
  const one = run(['--files', './' + dir + '/one-case.mjs']); assert.equal(one.status, 0, one.out); assert.match(one.out, /PASS rc44 wp1 knowledge: 1 cases/);
});

// ------------------------------------------------------------------------------------------------ 24
add('S1.24 (ruling B6, should-fix 6): every statement of a decision-bearing form rests on its own quote: an entry of a sub-list carries one inside its item\'s lines, a quotes entry names the text it grounds and no quote is given twice, the number rule reads each text against its own quote and reads the claim\'s own statement, conditions and limitations; a teaching form keeps one quote for each object', async () => {
  const {CF, CC, KC} = await mods(), all = F.p001Forms(), L = await library({forms: []});
  const issues = (type, change, context = null) => { const f = all[type], form = clone(f.content); change(form); return CF.conceptFormIssues(form, context || ctx(f)).join(' '); };
  const claim = (type, change = () => {}, opts = F.importedBy('importer')) => { const f = all[type], payload = clone(F.formClaim(L.sourceId, 'SYN-P001', f)); change(payload); return CC.applyConceptCommand(L.document, {type: 'knowledge.claim', payload}, AT, 'importer', opts); };
  // 1. A quotes entry names the text it grounds; each text the form states has one of its own.
  assert.match(issues('definition', f => { f.quotes = [f.quotes[0].quote]; }), /definition\.quotes\[0\] names the text it grounds and gives its verbatim quote: \{field, quote\}/);
  assert.match(issues('definition', f => { f.quotes[0].field = 'summary'; }), /definition\.quotes\[0\] names no text this form states \(field: short\)/);
  assert.match(issues('definition', f => { f.quotes.push({field: 'explanation', quote: 'a receiver must tolerate repeats'}); }), /definition\.quotes\[1\] names no text this form states \(field: short\)/, 'a text the form does not state takes no quote');
  assert.equal(issues('definition', f => { f.explanation = 'A receiver must tolerate repeats.'; f.quotes.push({field: 'explanation', quote: 'a receiver must tolerate repeats'}); }), '');
  assert.match(issues('definition', f => { f.quotes[0].weight = 2; }), /definition\.quotes\[0\] has an unsupported field: weight/);
  assert.match(issues('calculation', f => { f.quotes[2].field = 'purpose'; }), /calculation needs a verbatim quote of the passage for each of its texts \(purpose, relation, bounds\): none grounds bounds/, 'two quotes for one text do not ground another');
  // Should-fix 6. One quote repeated grounds one text, not three: quotes are distinct once whitespace is collapsed.
  assert.match(issues('calculation', f => { for (const q of f.quotes) q.quote = f.quotes[0].quote; }), /calculation\.quotes\[1\] repeats quotes\[0\]: each text rests on a quote of its own/);
  assert.match(issues('calculation', f => { f.quotes[1].quote = 'The  oldest unsent\nnotice   age is'; }), /calculation\.quotes\[1\] repeats quotes\[0\]/);
  assert.match(issues('example', f => { f.quotes[1].quote = f.quotes[0].quote; }), /example\.quotes\[1\] repeats quotes\[0\]/, 'in a teaching form too');
  // 2. The number rule reads each text against its own quote, not against every quote of the form.
  const with120 = f => { f.quotes[0] = {field: 'purpose', quote: 'an outage of 120 seconds gives an age of about 120 seconds'}; };
  assert.equal(issues('calculation', f => { with120(f); f.purpose = 'Estimate the age after an outage of 120 seconds.'; }), '', 'a number its own quote holds');
  assert.match(issues('calculation', f => { with120(f); f.bounds += ' At most 120 seconds.'; }), /calculation\.bounds states the number 120, which no quote given for bounds contains/, 'the quote given for another text does not lend its number');
  assert.match(issues('calculation', f => { with120(f); f.relation += ' About 120 seconds.'; }), /calculation\.relation states the number 120, which no quote given for relation contains/);
  // 3. An entry of a sub-list is a statement of its own: a text and a verbatim quote inside the lines of the object that holds it.
  assert.match(issues('applicability', f => { f.guaranteeBoundary.doesNotEstablish = ['That a carrier acted on the notice.']; }), /applicability\.guaranteeBoundary\.doesNotEstablish\[0\] is a text with its own verbatim quote: \{text, quote\}/);
  assert.match(issues('applicability', f => { f.guaranteeBoundary.dependsOn = [{text: 'A relay that never stops.'}]; }), /applicability\.guaranteeBoundary\.dependsOn\[0\] has no verbatim quote \(12 to 240 characters\)/);
  assert.match(issues('applicability', f => { f.guaranteeBoundary.dependsOn = [{text: 'A relay that never stops.', quote: 'a relay that never stops and never repeats'}]; }), /applicability\.guaranteeBoundary\.dependsOn\[0\]: the quote is not found in lines 19.19/);
  assert.match(issues('applicability', f => { f.guaranteeBoundary.dependsOn = [{text: 'A store that commits both together.', quote: 'a store that commits the booking and the outbox row together'}]; }), /dependsOn\[0\]: the quote is not found in lines 19.19/, 'a quote of the passage outside the object\'s own lines');
  assert.equal(issues('applicability', f => { f.guaranteeBoundary.at = [18, 19]; f.guaranteeBoundary.dependsOn = [{text: 'A store that commits both together.', quote: 'a store that commits the booking and the outbox row together'}]; }), '');
  assert.match(issues('applicability', f => { f.guaranteeBoundary.doesNotEstablish[0].note = 'x'; }), /doesNotEstablish\[0\] has an unsupported field: note/);
  assert.match(issues('applicability', f => { f.guaranteeBoundary.doesNotEstablish[0].reviewed = true; }), /must not carry "reviewed"/);
  assert.match(issues('applicability', f => { f.guaranteeBoundary.doesNotEstablish = Array.from({length: 9}, () => clone(f.guaranteeBoundary.doesNotEstablish[0])); }), /doesNotEstablish is a list of at most 8 entries/);
  // A technique's inputs, steps and outputs, with a number: each entry against its own quote, whatever the technique's quote holds.
  { const excerpt = ['The drill stops the broker for 120 seconds and then counts repeated notices.', 'Inputs are a running relay and a broker that can be stopped.', 'First stop the broker; then wait for the outage to end; then restart the relay.', 'The output is the count of notices that were sent more than once.'].join('\n');
    const technique = (steps, extra = {}) => ({type: 'verification', v: 1, technique: {purpose: 'Count the notices a relay repeats after an outage.', inputs: [{text: 'A running relay.', quote: 'Inputs are a running relay'}], steps, outputs: [{text: 'The count of repeated notices.', quote: 'the count of notices that were sent more than once'}], evidenceProduced: 'A count of repeated notices.', at: [1, 4], quote: 'The drill stops the broker for 120 seconds', ...extra}});
    const run = form => CF.conceptFormIssues(form, {excerpt, lineStart: 1}).join(' ');
    assert.equal(run(technique([{text: 'Stop the broker.', quote: 'First stop the broker'}, {text: 'Restart the relay.', quote: 'then restart the relay'}])), '');
    assert.match(run(technique([{text: 'Stop the broker for 120 seconds.', quote: 'First stop the broker'}])), /verification\.technique\.steps\[0\]\.text states the number 120, which its quote does not contain/, 'the technique\'s own quote holds 120; the step\'s does not');
    assert.equal(run(technique([{text: 'Stop the broker for 120 seconds.', quote: 'stops the broker for 120 seconds'}])), '');
    assert.match(run(technique(['Stop the broker.'])), /verification\.technique\.steps\[0\] is a text with its own verbatim quote/);
    assert.match(run(technique([{text: 'Stop the broker.', quote: 'First stop the broker'}], {at: [1, 2]})), /verification\.technique\.steps\[0\]: the quote is not found in lines 1.2/); }
  // 4. The claim's own statement, conditions and limitations state a number only where a quote of the form holds it.
  assert.equal(claim('applicability').document.knowledge.claims.length, 1);
  assert.throws(() => claim('applicability', c => { c.statement += ' Use it within 30 seconds.'; }), /The claim's statement states the number 30, which no quote of the form contains/);
  assert.throws(() => claim('applicability', c => { c.conditions = ['A local booking must cause a publication.', 'At most 5 retries.']; }), /The claim's conditions\[1\] states the number 5, which no quote of the form contains/);
  assert.throws(() => claim('selection', c => { c.limitations = ['Valid for 99.9% of bookings.']; }), /The claim's limitations\[0\] states the number 99\.9, which no quote of the form contains/);
  assert.throws(() => claim('applicability', c => { c.conditions = 'A local booking must cause a publication.\nAt most 5 retries.'; }), /The claim's conditions\[1\] states the number 5/, 'conditions sent as lines of one text');
  assert.equal(claim('calculation', c => { c.statement = 'An outage of 120 seconds gives an age of about 120 seconds.'; }).document.knowledge.claims.at(-1).statement, 'An outage of 120 seconds gives an age of about 120 seconds.', 'a number a quote of the form holds');
  assert.equal(claim('mechanism', c => { c.statement += ' It takes about 30 seconds.'; c.conditions = ['Up to 5 relays.']; }).document.knowledge.claims.at(-1).form.type, 'mechanism', 'a teaching form states numbers freely');
  // ...and the same is asked again on every read: a statement changed in the document, its hashes recomputed around it, makes the form unusable.
  { const A = await library({verify: true, review: true, release: true, activate: true}), q = clone(A.document), r = q.knowledge.releases[0], c = r.claims.find(x => x.form.type === 'applicability'); c.statement = 'Use it for 100% of systems.'; c.review.claimHash = digest({...c, review: undefined}); r.checksum = digest({...r, checksum: undefined});
    assert.equal(K.knowledgeEligibility(q, c, r).eligible, true, 'the claim-level gates see nothing wrong'); const f = KC.conceptReading(q, 'SYN-P001').forms.find(x => x.type === 'applicability');
    assert.equal(f.status, 'released-ineligible'); assert.equal(f.content, null); assert.match(f.reasons.join(' '), /The claim's statement states the number 100, which no quote of the form contains/); assert.equal(KC.releasedConcepts(q)[0].eligible, false); }
  // 5. A teaching form keeps one quote for each object and item: nothing more is asked of it.
  for (const t of ['definition', 'mechanism', 'example', 'exercise']) assert.equal(issues(t, () => {}), '', t);
  assert.equal(issues('mechanism', f => { f.steps[0].text += ' Within 30 seconds.'; f.narrative += ' About 5 relays.'; }), '');
});

// ------------------------------------------------------------------------------------------------ 25
// One tranche of a handbook as the commands write it, every step through applyConceptCommand: a person marks the library;
// an import saves, for each concept, its source (one topic of the handbook), its topic row, the concept, nine form claims
// and their attachment; `reviewer` verifies each form and each concept; `releaser` (a third person: the forms were
// imported) releases the tranche and activates it. Then the correction rounds: in each, a person corrects one form of
// every concept (a successor claim, attached in place of the earlier one), `reviewer` verifies the new form and the
// concept again, and `releaser` releases the whole tranche as the successor of the release before and activates it.
// `filler` lines lengthen each topic and `extend` lines each passage, to the size of a longer handbook's entries.
async function tranche({concepts = 60, rounds = 2, filler = 0, extend = 0} = {}) {
  const {CC} = await mods(); let p = F.blankProject('rc44-wp1-tranche'), commands = 0; const sizes = [], records = [], all = F.p001Forms();
  const k = (type, payload, actor, opts = F.person(actor)) => { const r = CC.applyConceptCommand(p, {type: 'knowledge.' + type, payload}, AT, actor, opts); p = r.document; commands++; return r.selected; };
  const characters = () => { const {organizationReleases: _pinned, ...own} = p.knowledge; return JSON.stringify(own).length; }, size = stage => sizes.push([stage, characters()]);
  const lines = [...F.SYN_P001, ...Array.from({length: filler}, (_, i) => 'Filler line ' + (i + 1) + ' of the synthetic handbook: it gives the topic the weight of a longer entry and says nothing a form reads.')], body = lines.join('\n');
  for (const f of Object.values(all)) f.passage = [f.passage[0], Math.min(f.passage[1] + extend, lines.length)];
  k('library', LIBRARY_MARK, 'steward');
  for (let i = 0; i < concepts; i++) {
    const conceptId = 'SYN-T' + String(i + 1).padStart(3, '0'), concept = {...CONCEPT, conceptId, title: 'Transactional outbox ' + (i + 1), forms: []}, imported = F.importedBy('importer');
    const sourceId = k('source', F.sourcePayload(conceptId + ' Transactional outbox', lines), 'importer', imported), id = k('concept', concept, 'importer', imported), claimIds = {};
    k('topic', {file: 'Synthetic_Integration_Handbook.docx', topicId: conceptId, title: 'Transactional outbox', lineStart: 1, lineEnd: lines.length, sliceSha256: sha256(body), sourceId, declaredKind: 'pattern', intendedUse: 'design-method', conceptId, reason: ''}, 'importer', imported);
    for (const t of F.FORM_ORDER) claimIds[t] = k('claim', F.formClaim(sourceId, conceptId, all[t]), 'importer', imported);
    k('concept', {...concept, id, forms: F.FORM_ORDER.map(t => ({type: t, claimId: claimIds[t]}))}, 'importer', imported);
    records.push({id, concept, sourceId, claimIds});
  }
  size('imported');
  for (const c of records) { for (const t of F.FORM_ORDER) k('review', {...F.REVIEW, formChecked: true, id: c.claimIds[t]}, 'reviewer'); k('concept-review', {...CONCEPT_REVIEW, id: c.id}, 'reviewer'); }
  size('reviewed');
  const release = supersedes => { const id = k('release', {...F.REVIEW, title: 'Synthetic tranche ' + (p.knowledge.releases.length + 1), ...(supersedes ? {supersedes} : {}), claimIds: records.flatMap(c => F.FORM_ORDER.map(t => c.claimIds[t]))}, 'releaser'); k('activate', {...F.REVIEW, id, stamp: K.knowledgeStamp(p)}, 'releaser'); return id; };
  let releaseId = release(null); size('released');
  for (let round = 1; round <= rounds; round++) {
    const type = round % 2 ? 'exercise' : 'example';
    for (const c of records) {
      c.claimIds[type] = k('claim', F.formClaim(c.sourceId, c.concept.conceptId, all[type]), 'importer');
      k('concept', {...c.concept, id: c.id, forms: F.FORM_ORDER.map(t => ({type: t, claimId: c.claimIds[t]}))}, 'importer');
      k('review', {...F.REVIEW, formChecked: true, id: c.claimIds[type]}, 'reviewer'); k('concept-review', {...CONCEPT_REVIEW, id: c.id}, 'reviewer');
    }
    releaseId = release(releaseId); size('correction round ' + round);
  }
  return {document: p, commands, sizes, releaseId, topicCharacters: body.length, k};
}
add('S1.25 (ruling B8, should-fix 11): the history bound is part of the tier; one tranche (60 concepts, nine forms each) is written through the commands with two correction rounds and fits every bound of a library, and the characters it uses are reported against the 8,000,000 of a project\'s knowledge; a bound is reached through the commands; every caller reads the project\'s own tier', async () => {
  const {CC} = await mods(), {prepareRepositoryPacket} = await import('./repository-packet.js'), BOUND = 8000000, report = [];
  const send = (doc, type, payload, actor = 'importer', opts = F.person(actor)) => CC.applyConceptCommand(doc, {type: 'knowledge.' + type, payload}, AT, actor, opts);
  // 1. The tiers: a project's bounds are those of rc.10.73.42 (its 2,000 history lines among them); a library's are larger.
  assert.deepEqual(CC.KNOWLEDGE_LIMIT_TIERS, {project: {sources: 100, claims: 250, concepts: 100, topics: 100, history: 2000}, library: {sources: 300, claims: 1000, concepts: 300, topics: 300, history: 6000}});
  assert.equal(K.KNOWLEDGE_LIMIT_TIERS, CC.KNOWLEDGE_LIMIT_TIERS, 'one definition of the tiers'); const PROJECT = K.KNOWLEDGE_LIMIT_TIERS.project, LIBRARY = K.KNOWLEDGE_LIMIT_TIERS.library;
  // 2. A tranche through the commands (the synthetic handbook's topic is about 4,200 characters: the size of an entry of a
  //    pattern handbook), with two correction rounds: every request is accepted, and every bound of the library holds.
  const T = await tranche({concepts: 60, rounds: 2}), s = T.document.knowledge, used = Object.fromEntries(T.sizes);
  assert.equal(K.knowledgeLimits(T.document), LIBRARY);
  assert.deepEqual({commands: T.commands, history: s.history.length, sources: s.sources.length, topics: s.topics.length, concepts: s.concepts.length, claims: s.claims.length, forms: s.claims.filter(c => c.form).length, releases: s.releases.length, active: s.pins.length, released: s.releases.at(-1).claims.length},
    {commands: 1867, history: 1867, sources: 60, topics: 60, concepts: 60, claims: 660, forms: 660, releases: 3, active: 1, released: 540});
  for (const key of ['history', 'sources', 'topics', 'concepts', 'claims']) assert(s[key].length <= LIBRARY[key], key + ' within the library tier');
  assert(s.claims.length > PROJECT.claims && s.history.length <= LIBRARY.history, 'more claims than a project holds, written through the commands');
  assert(used['correction round 2'] <= BOUND, 'the tranche, its release and two successor releases fit the storage bound');
  assert.deepEqual(Object.keys(used), ['imported', 'reviewed', 'released', 'correction round 1', 'correction round 2']); assert(T.sizes.every(([, n], i) => i === 0 || n > T.sizes[i - 1][1]));
  report.push('60 concepts, nine forms each, topics of ' + T.topicCharacters + ' characters: ' + T.commands + ' commands of ' + LIBRARY.history + '; characters of ' + BOUND + ': ' + T.sizes.map(([stage, n]) => stage + ' ' + n).join(', '));
  // The history is never trimmed: each command of the tranche is on it, the first as the last.
  assert.deepEqual([s.history[0].type, s.history.at(-1).type], ['knowledge.library', 'knowledge.activate']);
  // 3. The same tranche with topics the size of a component profile (about 12,500 characters) and passages some twenty
  //    lines longer, measured on ten concepts written the same way. Said plainly: sixty of these fit with their first
  //    release, and not with a successor release of the whole tranche; the largest tranche that fits is stated.
  { const H = await tranche({concepts: 10, rounds: 2, filler: 70, extend: 22}), per = Object.fromEntries(H.sizes.map(([stage, n]) => [stage, n / 10])), fits = stage => Math.floor(BOUND / per[stage]);
    assert(H.topicCharacters > 12000 && H.topicCharacters < 13500, 'a topic of about 12,500 characters: ' + H.topicCharacters);
    assert(60 * per.released < BOUND, 'sixty such concepts fit with their first release'); assert(60 * per['correction round 1'] > BOUND, 'and not with a successor release of all sixty');
    assert(fits('correction round 2') >= 35 && fits('correction round 2') < 60 && fits('correction round 1') > fits('correction round 2') && fits('released') > 60);
    report.push('topics of ' + H.topicCharacters + ' characters and longer passages, measured on 10 concepts: characters for each concept ' + H.sizes.map(([stage, n]) => stage + ' ' + Math.round(n / 10)).join(', ') + '; the largest tranche within ' + BOUND + ' characters: ' + fits('released') + ' concepts with the first release, ' + fits('correction round 1') + ' with one successor release, ' + fits('correction round 2') + ' with two'); }
  // 4. The history bound is reached through the commands. A project is refused its 2,001st knowledge command, as on
  //    rc.10.73.42; a library takes it, and is refused its 6,001st.
  { const start = F.legacyWalk(), review = {reviewed: true, reviewer: 'r', reason: 'x', distinguishingContexts: 'x'}, id = start.knowledge.contradictions[0].id;
    const fill = (doc, to) => { let p = doc; for (let i = p.knowledge.history.length; i < to; i++) p = send(p, 'contradiction', {...review, id, status: i % 2 ? 'open' : 'context-separated'}, 'architect-a').document; return p; };
    const almost = fill(start, PROJECT.history - 1), full = fill(almost, PROJECT.history); assert.equal(full.knowledge.history.length, 2000);
    const FULL = {message: 'Export the knowledge history before extending this project further.'}, one = {...review, id, status: 'context-separated'};
    assert.throws(() => send(full, 'contradiction', one, 'architect-a'), FULL); assert.throws(() => K.applyKnowledgeCommand(full, {type: 'knowledge.contradiction', payload: one}, AT, 'architect-a'), FULL, 'the old entry alike');
    // A person marks it a library (the mark itself is refused on a full history: the bound is read before the command).
    const library = fill(send(almost, 'library', LIBRARY_MARK, 'steward').document, PROJECT.history + 1); assert.equal(library.knowledge.history.length, 2001, 'a library writes its 2,001st line');
    assert.equal(K.applyKnowledgeCommand(library, {type: 'knowledge.contradiction', payload: one}, AT, 'architect-a').document.knowledge.history.length, 2002, 'through the old entry too: every caller reads the project\'s tier');
    const brim = fill(library, LIBRARY.history); assert.equal(brim.knowledge.history.length, 6000); assert.throws(() => send(brim, 'contradiction', one, 'architect-a'), FULL);
    assert.deepEqual([brim.knowledge.history[0].type, brim.knowledge.history[1999].type, brim.knowledge.history.at(-1).type], ['knowledge.project-source', 'knowledge.library', 'knowledge.contradiction'], 'nothing was trimmed');
    report.push('a library\'s history at its bound of ' + LIBRARY.history + ' lines holds ' + JSON.stringify(brim.knowledge.history).length + ' characters'); }
  // 5. Should-fix 11. The callers that pass no tier of their own (repository fetch and transfer save a source through the
  //    old entry; the repository packet states the capacity left) read the project's tier: a library is not held to a project's 100 sources there.
  { const plain = {sourceId: 'KS-0001', lineStart: 5, lineEnd: 5, subjectId: 'Outbox', predicate: 'stores', statement: 'An outbox stores the notice with the booking.', claimType: 'definition'}, source = F.sourcePayload('SYN-P002 Idempotent receiver', F.SYN_P002);
    const q = clone(send(send(F.blankProject(), 'source', F.sourcePayload('SYN-P001 Transactional outbox', F.SYN_P001)).document, 'claim', plain).document); while (q.knowledge.sources.length < 100) q.knowledge.sources.push({...q.knowledge.sources[0], id: 'KS-F' + q.knowledge.sources.length});
    const old = (doc, type, payload) => K.applyKnowledgeCommand(doc, {type: 'knowledge.' + type, payload}, AT, 'importer');
    assert.throws(() => old(q, 'source', source), {message: 'This project has reached its source revision limit.'});
    const lib = send(q, 'library', LIBRARY_MARK, 'steward').document; assert.equal(old(lib, 'source', source).document.knowledge.sources.length, 101, 'the old entry, as repository fetch and transfer call it, reads the library tier');
    const packet = {schemaVersion: 'aiw-repository-packet-v1', storeId: '0'.repeat(8) + '-' + '0'.repeat(4) + '-' + '0'.repeat(4) + '-' + '0'.repeat(4) + '-' + '0'.repeat(12), tenantId: 'tenant', projectId: q.id, fromCursor: 0, cursor: 0, authority: 'candidate', productionAccepted: false, sources: [], claims: [], notices: [], release: {status: 'blocked', reason: 'Synthetic.'}}, scope = {tenantId: 'tenant', projectId: q.id};
    assert.deepEqual(prepareRepositoryPacket(q, packet, scope).capacity, {remainingSources: 0, remainingClaims: 249}); assert.deepEqual(prepareRepositoryPacket(lib, packet, scope).capacity, {remainingSources: 200, remainingClaims: 999}, 'the packet reads the tier'); }
  for (const line of report) console.log('     ' + line);
});

// ------------------------------------------------------------------------------------------------ 26
add('S1.26 (rulings B3 and B9): a claim that carries no form opens no contradiction with a form of a reviewed or released concept unless a signed-in person sends it: an agent account, a draft by Sol, an import and a request that states no author are refused it, on the claim command and on a capture alike, and accepted on a draft concept; an entry that holds no form capability opens none with a form at all; a person\'s opposing claim keeps the fail-safe of rc.10.73.42', async () => {
  const {CC, KC} = await mods(), L = await library({forms: ['definition', 'applicability'], verify: true, base: F.legacyWalkBase()}), draft = L.document;
  const send = (doc, type, payload, actor = 'importer', opts = F.person(actor)) => CC.applyConceptCommand(doc, {type: 'knowledge.' + type, payload}, AT, actor, opts);
  L.k('concept-review', {...CONCEPT_REVIEW, id: L.conceptRecordId}, 'reviewer');
  const p = L.document, read = doc => KC.conceptRecords(doc).find(c => c.conceptId === 'SYN-P001'), open = doc => doc.knowledge.contradictions.filter(x => x.status === 'open');
  assert.equal(read(p).state, 'reviewed'); assert.equal(p.knowledge.claims.find(c => c.id === L.claimIds.applicability).polarity, 'supports');
  // The claim: the concept's id as its subject, the applicability form's fixed predicate, another polarity, and no form.
  // On rc.10.73.42 that opens a contradiction with the claim it opposes; here that claim is a reviewed concept's form.
  const opposing = {sourceId: L.sourceId, lineStart: 17, lineEnd: 17, subjectId: 'SYN-P001', predicate: 'applies when', statement: 'An outbox is avoided wherever a caller only reads.', claimType: 'applicability', polarity: 'prohibits', conditions: ['The caller only reads.'], limitations: ['Says nothing of later changes.']};
  const capture = {assessmentId: 'SA-901', subject: 'Transactional outbox', subjectId: 'SYN-P001', predicate: 'applies when', statement: 'Within this project the carrier gateway already retries a failed notice.', conditions: 'Applies to the carrier notice.', limitations: 'Says nothing of other gateways.', objectId: p.artefacts.find(a => a.type === 'requirement').id, reviewer: 'Synthetic steward', reason: 'Captured from the architect\'s disagreement.'};
  const ONLY = /SYN-P001 is reviewed or in a release: only a signed-in person changes what its review covered \(a claim that contradicts KC-\d+, a form of it\)/;
  const NON_PERSONS = [['an agent account', 'bot', F.agent('bot')], ['a draft by Sol', 'architect', F.solDraft('architect')], ['an import', 'architect', F.importedBy('architect')], ['a request that states no author', 'architect', {}], ['an author that names no account', 'architect', {author: {kind: 'person', id: 'architect', reviewed: true}}]];
  for (const [who, actor, opts] of NON_PERSONS) {
    assert.throws(() => send(p, 'claim', opposing, actor, opts), ONLY, who + ': a plain opposing claim on a reviewed concept');
    assert.throws(() => send(p, 'capture', capture, actor, opts), ONLY, who + ': a captured disagreement that limits a form of a reviewed concept');
    // On a draft concept the same requests are accepted, and the contradiction opens as on rc.10.73.42: a draft is nobody's review.
    assert.equal(open(send(draft, 'claim', opposing, actor, opts).document).length, 1, who + ': on a draft concept');
    assert.equal(open(send(draft, 'capture', capture, actor, opts).document).length, 1, who + ': a capture on a draft concept');
    // A plain claim that opposes no form is saved on a reviewed concept as before: the same polarity, another predicate, another subject.
    for (const [what, body] of [['the same polarity', {...opposing, polarity: 'supports'}], ['another predicate', {...opposing, predicate: 'is avoided when'}], ['another subject', {...opposing, subjectId: 'Outbox'}], ['a neutral reading', {...opposing, polarity: 'neutral'}]]) {
      const q = send(p, 'claim', body, actor, opts).document; assert.equal(open(q).length, 0, who + ': ' + what + ' opens nothing'); assert.equal(read(q).state, 'reviewed', who + ': ' + what + ' leaves the review standing'); }
  }
  assert.equal(read(p).state, 'reviewed', 'nothing lapsed the review'); assert.equal(KC.conceptCovered(p, p.knowledge.concepts[0]), true);
  // So an opposing claim is no way for a request that is nobody's to make the review lapse first and edit the concept afterwards.
  // (A superseding source still makes the claims on the source it replaces ineligible, whoever sends it, as on rc.10.73.42
  // for any claim: recorded as a known limit in the build notes, for the lead to rule on.)
  assert.throws(() => send(p, 'concept', {...CONCEPT, id: L.conceptRecordId, forms: p.knowledge.concepts[0].forms, reviewDue: '2099-12-31'}, 'bot', F.agent('bot')), /only a signed-in person changes what its review covered \(its record\)/);
  // An entry that holds no form capability (the old entry, as the local import script calls it) knows no author: it opens
  // no contradiction with a form at all, reviewed or draft, and saves every other plain claim as before.
  const NO_FORM_ENTRY = /contradicts the knowledge form KC-\d+: .*This entry handles no form\./;
  for (const doc of [p, draft]) { assert.throws(() => K.applyKnowledgeCommand(doc, {type: 'knowledge.claim', payload: opposing}, AT, 'importer'), NO_FORM_ENTRY); assert.throws(() => K.applyKnowledgeCommand(doc, {type: 'knowledge.capture', payload: capture}, AT, 'importer'), NO_FORM_ENTRY);
    assert.equal(open(K.applyKnowledgeCommand(doc, {type: 'knowledge.claim', payload: {...opposing, polarity: 'supports'}}, AT, 'importer').document).length, 0); }
  // Two plain claims contradict each other through either entry as on rc.10.73.42 (S1.8 holds the bytes).
  { const one = K.applyKnowledgeCommand(p, {type: 'knowledge.claim', payload: {...opposing, subjectId: 'Outbox', polarity: 'supports'}}, AT, 'importer').document;
    assert.equal(open(K.applyKnowledgeCommand(one, {type: 'knowledge.claim', payload: {...opposing, subjectId: 'Outbox'}}, AT, 'importer').document).length, 1); assert.equal(open(send(one, 'claim', {...opposing, subjectId: 'Outbox'}, 'bot', F.agent('bot')).document).length, 1); }
  // A person's opposing claim keeps the fail-safe (ruling B9): the contradiction opens and the review no longer stands;
  // once a person separates the contexts it stands again, because nothing the review covered was changed.
  { const q = send(p, 'claim', opposing, 'architect').document; assert.equal(open(q).length, 1); assert.deepEqual(open(q)[0].claimIds, [L.claimIds.applicability, q.knowledge.claims.at(-1).id]); assert.equal(read(q).state, 'draft', 'a person\'s opposing claim lapses the review until it is resolved');
    const settled = send(q, 'contradiction', {reviewed: true, reviewer: 'Synthetic second person', reason: 'One applies where a notice must follow, the other where nothing is published.', id: open(q)[0].id, status: 'context-separated', distinguishingContexts: 'A notice must follow; nothing is published.'}, 'reviewer').document;
    assert.equal(read(settled).state, 'reviewed', 'the review stands again once a person separated the contexts');
    assert.equal(open(send(p, 'capture', capture, 'architect').document).length, 1, 'a person\'s captured disagreement too'); }
  // The same once the concept is in a release, whether or not its review still stands: the register's concept is not made a draft by a request that is nobody's.
  { const R = await library({forms: ['definition', 'applicability'], verify: true, review: true, release: true, activate: true}), edited = send(R.document, 'concept', {...CONCEPT, id: R.conceptRecordId, forms: R.document.knowledge.concepts[0].forms, steward: 'Another guild'}, 'architect').document;
    for (const doc of [R.document, edited]) for (const [who, actor, opts] of NON_PERSONS) assert.throws(() => send(doc, 'claim', {...opposing, sourceId: R.sourceId}, actor, opts), ONLY, who + ': in a release');
    const q = send(R.document, 'claim', {...opposing, sourceId: R.sourceId}, 'architect').document; assert.equal(open(q).length, 1); assert.deepEqual(KC.releasedConcepts(q).map(c => c.eligible), [true], 'a person\'s candidate contradiction leaves the released concept as it was, as on rc.10.73.42'); }
});

// ================================================================================================ second fix-up
// The lead's rulings of 2026-11-18, sections E and G, after the verification of this slice.
// ------------------------------------------------------------------------------------------------ 27
add('S1.27 (ruling G1): the number rule reads every decimal digit, in any script, after normalisation: a target label, a decision-bearing text and the claim\'s own statement, conditions and limitations state no number in full-width, Arabic-Indic or any other digits that their quote does not hold; an identifier is letters, digits and hyphens only', async () => {
  const {CF, CC} = await mods(), all = F.p001Forms(), L = await library({forms: []});
  const issues = (type, change) => { const f = all[type], form = clone(f.content); change(form); return CF.conceptFormIssues(form, ctx(f)).join(' '); };
  const claim = (type, change, actor = 'bot', opts = F.agent('bot')) => { const payload = clone(F.formClaim(L.sourceId, 'SYN-P001', all[type])); change(payload); return CC.applyConceptCommand(L.document, {type: 'knowledge.claim', payload}, AT, actor, opts); };
  for (const t of F.FORM_ORDER) assert.equal(issues(t, () => {}), '', 'the fixture form stays valid: ' + t);
  // 1. Digits that are not ASCII. Compatibility forms (full-width, superscript, circled, mathematical) read as the digit
  //    they stand for; a digit of another script is read as it is written. None is in the item's quote.
  assert.match(issues('selection', f => { f.alternatives[0].target = {label: 'Polling relay every ５ seconds at ９９.９９%'}; }), /selection\.alternatives\[0\]\.target\.label states the number 5, which its quote does not contain/, 'full-width digits in a label');
  assert.match(issues('selection', f => { f.alternatives[0].target = {label: 'Polling relay at ９９.９９%'}; }), /target\.label states the number 99\.99, which its quote does not contain/, 'a full-width decimal number is one number');
  assert.match(issues('selection', f => { f.alternatives[0].target = {label: 'Polling relay every ٥ seconds'}; }), /selection\.alternatives\[0\]\.target\.label states the number ٥, which its quote does not contain/, 'Arabic-Indic digits in a label');
  const DIGITS = [['full-width', '５', '5'], ['Arabic-Indic', '٥', '٥'], ['extended Arabic-Indic', '۵', '۵'], ['Devanagari', '५', '५'], ['Bengali', '৫', '৫'], ['Thai', '๕', '๕'], ['superscript', '⁵', '5'], ['circled', '⑤', '5'], ['mathematical bold', '\u{1D7D3}', '5'], ['a vulgar fraction', '½', '1']];
  for (const [script, digit, read] of DIGITS) {
    assert.match(issues('applicability', f => { f.useWhen[0].text = 'Always within ' + digit + ' seconds.'; }), new RegExp('applicability\\.useWhen\\[0\\]\\.text states the number ' + read + ', which its quote does not contain'), script + ': a decision-bearing text');
    assert.match(issues('applicability', f => { f.guaranteeBoundary.doesNotEstablish[0].text = 'That a carrier acted within ' + digit + ' days.'; }), new RegExp('doesNotEstablish\\[0\\]\\.text states the number ' + read + ', which its quote does not contain'), script + ': an entry of a sub-list');
    assert.match(issues('calculation', f => { f.bounds += ' At most ' + digit + ' polls.'; }), new RegExp('calculation\\.bounds states the number ' + read + ', which no quote given for bounds contains'), script + ': a text of the form itself');
    assert.match(issues('composition', f => { f.parameters[0].name = 'batch of ' + digit; }), new RegExp('composition\\.parameters\\[0\\]\\.name states the number ' + read), script + ': a name');
    // ...and the claim's own statement, conditions and limitations, through the command, from the agent account.
    assert.throws(() => claim('applicability', c => { c.statement += ' Use it within ' + digit + ' seconds.'; }), new RegExp('The claim\'s statement states the number ' + read + ', which no quote of the form contains'), script + ': the statement');
    assert.throws(() => claim('applicability', c => { c.conditions = ['A local booking must cause a publication.', 'At most ' + digit + ' retries.']; }), new RegExp('The claim\'s conditions\\[1\\] states the number ' + read), script + ': a condition');
    assert.throws(() => claim('selection', c => { c.limitations = ['Valid for ' + digit + ' regions.']; }), new RegExp('The claim\'s limitations\\[0\\] states the number ' + read), script + ': a limitation');
  }
  assert.throws(() => claim('selection', c => { c.form.alternatives[0].target = {label: 'Polling relay every ５ seconds at ９９.９９%'}; }), /target\.label states the number 5/, 'the verifier\'s input, through knowledge.claim from the agent account');
  assert.throws(() => claim('applicability', c => { c.form.useWhen[0].text = 'Always within ５ seconds.'; }), /useWhen\[0\]\.text states the number 5/);
  // A number its own quote holds is stated in either width: the quote is read the same way.
  const with120 = f => { f.quotes[0] = {field: 'purpose', quote: 'an outage of 120 seconds gives an age of about 120 seconds'}; delete f.workedValues; };
  assert.equal(issues('calculation', f => { with120(f); f.purpose = 'Estimate the age after an outage of １２０ seconds.'; }), '', 'the quote holds 120');
  assert.match(issues('calculation', f => { with120(f); f.purpose = 'Estimate the age after an outage of １２１ seconds.'; }), /calculation\.purpose states the number 121, which no quote given for purpose contains/);
  // A teaching form states numbers freely, in any script.
  assert.equal(issues('mechanism', f => { f.steps[0].text += ' Within ５ seconds, or ٥.'; f.narrative += ' About ５ relays.'; }), '');
  // 2. An identifier is letters, digits and hyphens: no point, no comma, no colon, no underscore, no space.
  const IDENTIFIER = /is an identifier \(letters, digits and hyphens only\)/;
  for (const [type, set] of [['composition', (f, v) => { f.roles[0].id = v; }], ['composition', (f, v) => { f.roles[0].sameAs = v; }], ['composition', (f, v) => { f.sequence[0].ownerRole = v; }], ['verification', (f, v) => { f.scenarios[0].id = v; }], ['calculation', (f, v) => { f.modelKind = v; }]]) {
    for (const v of ['SLA-99.999-percent-guaranteed', 'relay:must-answer-within-5-seconds', 'answers_within_5_seconds', 'p99,9', 'outbox writer', 'ｒｅｌａｙ', 'relay-٥', '-relay']) assert.match(issues(type, f => set(f, v)), IDENTIFIER, type + ': ' + v);
    for (const v of ['outbox-writer', 'relay', 'mm1-queue', 'queue-model-2', 'R2']) assert.equal(issues(type, f => set(f, v)), '', type + ': ' + v);
  }
  // An alias id is an identifier too; a method alias is <topic>/<option>, hence the slash.
  const alias = aliasId => issues('composition', f => { f.relations[0].target = {alias: {scheme: 'external', aliasId}}; });
  for (const v of ['SLA.99.999', 'answers:in-5', 'p99,9', 'a_b']) assert.match(alias(v), /composition\.relations\[0\]\.target names a concept id, an alias \(scheme and id\) or a label/, v);
  for (const v of ['SYN-P002', 'PAT-TRANSACTIONAL-OUTBOX', 'delivery/transactional-outbox', 'CL-APP-005']) assert.equal(alias(v), '', v);
});

// ------------------------------------------------------------------------------------------------ 28
// A knowledge library behind the real boundary (worker.js, POST /api/commands): `importer` owns the project and marks
// it; the agent account `bot` saves the source, the concept and its forms; `reviewer` verifies each form and the concept;
// with `release`, `releaser` releases the forms and activates the release. `send` returns the response, `ok` asserts 200.
const TOPIC = sourceId => ({file: 'Synthetic_Integration_Handbook.docx', topicId: 'SYN-P001', title: 'Transactional outbox', lineStart: 1, lineEnd: 58, sliceSha256: sha256(F.SYN_P001.join('\n')), sourceId, declaredKind: 'pattern', intendedUse: 'design-method', conceptId: 'SYN-P001', reason: ''});
const OPPOSING = sourceId => ({sourceId, lineStart: 17, lineEnd: 17, subjectId: 'SYN-P001', predicate: 'applies when', statement: 'An outbox is avoided wherever a caller only reads.', claimType: 'applicability', polarity: 'prohibits', conditions: ['The caller only reads.'], limitations: ['Says nothing of later changes.']});
const DISPOSE = {reviewed: true, reviewer: 'Synthetic second person', reason: 'One applies where a notice must follow, the other where nothing is published.', distinguishingContexts: 'A notice must follow; nothing is published.'};
const SECOND_EDITION = sourceId => ({...F.sourcePayload('SYN-P001 Transactional outbox, second edition', [...F.SYN_P001, 'A line the second edition adds.']), supersedes: sourceId});
async function serviceLibrary({forms = ['definition', 'applicability'], release = false} = {}) {
  const {default: worker} = await import('./worker.js'), {localDatabase} = await import('./local-db.js');
  const files = new Map(), env = {AIW_AGENT_ACTORS: 'bot', DB: localDatabase(':memory:'), FILES: {async put(k, v) { files.set(k, v); }, async get(k) { return files.has(k) ? {text: async () => files.get(k)} : null; }, async delete(k) { files.delete(k); }}, ASSETS: {fetch: () => new Response('asset')}};
  const api = async (path, body, as = 'importer') => { const r = await worker.fetch(new Request('https://aiw.test' + path, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': as, Origin: 'https://aiw.test', ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env); let data = null; try { data = await r.json(); } catch { data = null; } return {status: r.status, data}; };
  const created = await api('/api/projects', {name: 'Northquay knowledge library', template: 'blank'}); assert(created.status < 300, JSON.stringify(created.data)); const projectId = created.data.document.id;
  for (const actor of ['reviewer', 'releaser', 'architect', 'bot']) await env.DB.prepare('INSERT INTO project_access(owner_id,project_id,actor_id,role,created_at) VALUES(?,?,?,?,?)').bind('importer', projectId, actor, 'editor', AT).run();
  let state = created.data; const send = async (type, payload, as = 'importer', extra = {}) => { const r = await api('/api/commands?project=' + projectId, {revision: state.revision, command: {type, payload}, ...extra}, as); if (r.status === 200) state = r.data; return r; };
  const ok = async (...args) => { const r = await send(...args); assert.equal(r.status, 200, JSON.stringify(r.data)); return r.data.selected; };
  await ok('knowledge.library', LIBRARY_MARK, 'importer');
  const sourceId = await ok('knowledge.source', F.sourcePayload('SYN-P001 Transactional outbox', F.SYN_P001), 'bot'), all = F.p001Forms(), conceptRecordId = await ok('knowledge.concept', CONCEPT, 'bot'), claimIds = {};
  for (const t of forms) claimIds[t] = await ok('knowledge.claim', F.formClaim(sourceId, 'SYN-P001', all[t]), 'bot');
  await ok('knowledge.concept', {...CONCEPT, id: conceptRecordId, forms: forms.map(t => ({type: t, claimId: claimIds[t]}))}, 'bot');
  for (const t of forms) await ok('knowledge.review', {...F.REVIEW, formChecked: true, id: claimIds[t]}, 'reviewer');
  await ok('knowledge.concept-review', {...CONCEPT_REVIEW, id: conceptRecordId}, 'reviewer');
  let releaseId = null;
  if (release) { releaseId = await ok('knowledge.release', {...F.REVIEW, title: 'Synthetic integration concepts 1', claimIds: forms.map(t => claimIds[t])}, 'releaser'); await ok('knowledge.activate', {...F.REVIEW, id: releaseId, stamp: K.knowledgeStamp(state.document)}, 'releaser'); }
  return {send, ok, sourceId, conceptRecordId, claimIds, releaseId, get document() { return state.document; }, close: () => env.DB.close?.()};
}
// The kinds of request that are not a signed-in person's own (authorship.js commitAuthor), as the entry is handed them.
const NOT_A_PERSON = [['an agent account', 'bot', F.agent('bot')], ['a draft by Sol', 'architect', F.solDraft('architect')], ['an import', 'architect', F.importedBy('architect')], ['a request that states no author', 'architect', {}], ['an author that names no account', 'architect', {author: {kind: 'person', id: 'architect', reviewed: true}}]];
add('S1.28 (ruling G2): a concept that was ever reviewed, or is in a release, stays covered whether or not its review stands now: after a superseding source, a withdrawn form claim, a reopened contradiction, a person\'s edit and a later dispute or rejection, the edit, the form claim, the opposing claim and the topic mapping of an agent account, a draft by Sol, an import and a request that states no author are still refused, at the entry and through POST /api/commands; a concept that was rejected and never verified stays a draft for them', async () => {
  const {CC, KC} = await mods(), L = await library({forms: ['definition', 'applicability'], verify: true}), all = F.p001Forms();
  const send = (doc, type, payload, actor = 'importer', opts = F.person(actor)) => CC.applyConceptCommand(doc, {type: 'knowledge.' + type, payload}, AT, actor, opts);
  const topic = TOPIC(L.sourceId), opposing = OPPOSING(L.sourceId);
  L.k('topic', topic, 'importer', F.importedBy('importer')); L.k('concept', {...CONCEPT, conceptId: 'SYN-P002', title: 'Idempotent receiver'}, 'importer', F.importedBy('importer'));
  const draft = L.document; L.k('concept-review', {...CONCEPT_REVIEW, id: L.conceptRecordId}, 'reviewer');
  const p = L.document, read = doc => KC.conceptRecords(doc).find(c => c.conceptId === 'SYN-P001'), covered = doc => KC.conceptCovered(doc, doc.knowledge.concepts[0]), edit = (doc, change) => ({...CONCEPT, id: L.conceptRecordId, forms: doc.knowledge.concepts[0].forms, ...change});
  assert.equal(read(p).state, 'reviewed'); assert.equal(covered(p), true); assert.equal(covered(draft), false);
  // What a person may do to a reviewed concept, each with today's effect: the concept reads draft afterwards.
  const LAPSES = [
    ['a superseding source', doc => send(doc, 'source', SECOND_EDITION(L.sourceId), 'architect').document],
    ['a withdrawn form claim', doc => send(doc, 'withdraw', {...F.REVIEW, id: L.claimIds.definition, stamp: K.knowledgeImpactStamp(doc, L.claimIds.definition)}, 'architect').document],
    ['a reopened contradiction', doc => { const a = send(doc, 'claim', opposing, 'architect').document, id = a.knowledge.contradictions.at(-1).id, apart = send(a, 'contradiction', {...DISPOSE, id, status: 'context-separated'}, 'reviewer').document; assert.equal(read(apart).state, 'reviewed', 'separated: the review stands again'); return send(apart, 'contradiction', {...DISPOSE, id, status: 'open'}, 'architect').document; }],
    ['a person\'s opposing claim', doc => send(doc, 'claim', opposing, 'architect').document],
    ['a person\'s edit', doc => send(doc, 'concept', edit(doc, {steward: 'Another guild'}), 'architect').document],
    ['a later dispute', doc => send(doc, 'concept-review', {...CONCEPT_REVIEW, id: L.conceptRecordId, decision: 'disputed'}, 'releaser').document],
    ['a later rejection, after a dispute', doc => send(send(doc, 'concept-review', {...CONCEPT_REVIEW, id: L.conceptRecordId, decision: 'disputed'}, 'releaser').document, 'concept-review', {...CONCEPT_REVIEW, id: L.conceptRecordId, decision: 'rejected'}, 'second-architect').document]];
  const ONLY = /SYN-P001 is reviewed or in a release: only a signed-in person changes what its review covered/;
  const requests = doc => [['the review date', 'concept', edit(doc, {reviewDue: '2099-12-31'})], ['a form taken off', 'concept', edit(doc, {forms: doc.knowledge.concepts[0].forms.slice(0, 1)})], ['a form added', 'claim', F.formClaim(L.sourceId, 'SYN-P001', all.example)], ['an opposing claim', 'claim', {...opposing, statement: 'An outbox is avoided where nothing is published.'}], ['the topic unmapped', 'topic', {...topic, conceptId: null, reason: 'Unmapped.'}], ['another topic mapped to it', 'topic', {...topic, topicId: 'SYN-P001-B', sourceId: null}]];
  for (const [lapse, apply] of LAPSES) {
    const q = apply(p); assert.equal(read(q).state, 'draft', lapse + ': a person\'s request keeps its effect, the review no longer stands'); assert.equal(covered(q), true, lapse + ': the concept stays covered');
    for (const [who, actor, opts] of NOT_A_PERSON) for (const [what, type, body] of requests(q)) assert.throws(() => send(q, type, body, actor, opts), ONLY, lapse + ', then ' + who + ': ' + what);
    // A person still changes it, and a second person reviews it again.
    assert.equal(send(q, 'concept', edit(q, {reviewDue: '2099-12-31'}), 'architect').document.knowledge.concepts[0].reviewDue, '2099-12-31', lapse + ': a person edits');
  }
  // A dispute or a rejection keeps who verified the concept before; a new verification needs no such note.
  { const disputed = LAPSES[5][1](p), r = disputed.knowledge.concepts[0].review; assert.equal(r.decision, 'disputed'); assert.deepEqual(r.verifiedBefore, {actor: 'reviewer', at: AT});
    const rejected = LAPSES[6][1](p).knowledge.concepts[0].review; assert.equal(rejected.decision, 'rejected'); assert.equal(rejected.actor, 'second-architect'); assert.deepEqual(rejected.verifiedBefore, {actor: 'reviewer', at: AT}, 'carried through a second such review');
    const again = send(disputed, 'concept-review', {...CONCEPT_REVIEW, id: L.conceptRecordId}, 'reviewer').document; assert.equal('verifiedBefore' in again.knowledge.concepts[0].review, false); assert.equal(read(again).state, 'reviewed');
    assert.equal('verifiedBefore' in p.knowledge.concepts[0].review, false, 'a first verification holds no such key'); }
  // Never verified: a concept a person rejected or disputed stays a draft, and a request that is nobody's corrects it.
  for (const decision of ['rejected', 'disputed']) { const q = send(draft, 'concept-review', {...CONCEPT_REVIEW, id: L.conceptRecordId, decision}, 'reviewer').document; assert.equal(covered(q), false, decision + ', never verified'); assert.equal('verifiedBefore' in q.knowledge.concepts[0].review, false);
    for (const [who, actor, opts] of NOT_A_PERSON) assert.equal(send(q, 'concept', edit(q, {reviewDue: '2099-12-31'}), actor, opts).document.knowledge.concepts[0].reviewDue, '2099-12-31', who + ' corrects a ' + decision + ' draft'); }
  // A review made on another workbench is no review here (S1.12): the recovered concept is a draft, until a release holds it.
  { const recovered = neutraliseImportedAuthority(clone(p), AT); assert.equal(covered(recovered), false, 'an imported review covers nothing here'); }
  // In a release: covered whatever became of the release and of the review.
  { const R = await library({forms: ['definition', 'applicability'], verify: true, review: true, release: true, activate: true}), r = R.document;
    const gone = send(send(r, 'withdraw', {...F.REVIEW, id: R.releaseId, stamp: K.knowledgeImpactStamp(r, R.releaseId)}, 'releaser').document, 'concept-review', {...CONCEPT_REVIEW, id: R.conceptRecordId, decision: 'disputed'}, 'second-architect').document;
    assert.equal(KC.conceptRecords(gone)[0].state, 'draft'); assert.equal(KC.conceptCovered(gone, gone.knowledge.concepts[0]), true);
    for (const [who, actor, opts] of NOT_A_PERSON) assert.throws(() => send(gone, 'concept', {...CONCEPT, id: R.conceptRecordId, forms: gone.knowledge.concepts[0].forms, reviewDue: '2099-12-31'}, actor, opts), ONLY, who + ': its release withdrawn and its review disputed'); }
  // Through the service, one project for each way: the person's request is saved (200), and afterwards the agent account,
  // a draft by Sol and an import are each refused the edit, the form claim, the opposing claim and the topic mapping (400).
  const SERVICE = [
    ['a superseding source', async S => { await S.ok('knowledge.source', SECOND_EDITION(S.sourceId), 'architect'); }],
    ['a withdrawn form claim', async S => { await S.ok('knowledge.withdraw', {...F.REVIEW, id: S.claimIds.definition, stamp: K.knowledgeImpactStamp(S.document, S.claimIds.definition)}, 'architect'); }],
    ['a reopened contradiction', async S => { await S.ok('knowledge.claim', OPPOSING(S.sourceId), 'architect'); const id = S.document.knowledge.contradictions.at(-1).id; await S.ok('knowledge.contradiction', {...DISPOSE, id, status: 'context-separated'}, 'reviewer'); assert.equal(KC.conceptRecords(S.document)[0].state, 'reviewed'); await S.ok('knowledge.contradiction', {...DISPOSE, id, status: 'open'}, 'architect'); }]];
  for (const [lapse, apply] of SERVICE) {
    const S = await serviceLibrary();
    try {
      assert.equal(KC.conceptRecords(S.document)[0].state, 'reviewed'); await apply(S);
      const doc = S.document, before = JSON.stringify(doc.knowledge); assert.equal(KC.conceptRecords(doc)[0].state, 'draft', lapse + ' through the service: the review no longer stands'); assert.equal(KC.conceptCovered(doc, doc.knowledge.concepts[0]), true);
      const body = {edit: ['knowledge.concept', {...CONCEPT, id: S.conceptRecordId, forms: doc.knowledge.concepts[0].forms, reviewDue: '2099-12-31'}], form: ['knowledge.claim', F.formClaim(S.sourceId, 'SYN-P001', all.example)], opposing: ['knowledge.claim', {...OPPOSING(S.sourceId), statement: 'An outbox is avoided where nothing is published.'}], topic: ['knowledge.topic', TOPIC(S.sourceId)]};
      for (const [who, as, extra] of [['the agent account', 'bot', {}], ['a draft by Sol', 'architect', {authorKind: 'sol-draft'}], ['an import', 'architect', {authorKind: 'import'}]]) for (const [what, [type, payload]] of Object.entries(body)) {
        const r = await S.send(type, payload, as, extra); assert.equal(r.status, 400, lapse + ', then ' + who + ': ' + what + ' ' + JSON.stringify(r.data).slice(0, 200)); assert.match(r.data.error, ONLY, lapse + ', then ' + who + ': ' + what); }
      assert.equal(JSON.stringify(S.document.knowledge), before, 'nothing was written');
      await S.ok('knowledge.concept', body.edit[1], 'architect'); assert.equal(S.document.knowledge.concepts[0].reviewDue, '2099-12-31', 'a person edits it');
    } finally { S.close(); }
  }
});
