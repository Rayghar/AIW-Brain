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
import {arsGate} from './public/ars-document.js';
import {neutraliseImportedAuthority} from './recovery-service.js';

const AT = F.AT, clone = v => structuredClone(v);
const mods = async () => ({CF: await import('./public/concept-form.js'), KC: await import('./public/knowledge-concepts.js'), CC: await import('./public/knowledge-concept-commands.js')});
const CONCEPT = {conceptId: 'SYN-P001', title: 'Transactional outbox', kind: 'pattern', family: 'Reliable publication', scope: ['data-owner', 'interaction'], stages: [5, 8], lenses: ['integrity', 'reliability'], steward: 'Integration guild', reviewDue: '2027-11-16', reviewTriggers: ['platform-contract'], notAdopted: ['A broker-side transaction: the handbook rejects it for this case.'], forms: []};
const CONCEPT_REVIEW = {decision: 'verified', reviewer: 'Synthetic second person', reason: 'Checked the identity, each form and its membership.', reviewed: true, identityChecked: true, formsChecked: true, crosswalkChecked: true};
const ctx = f => ({excerpt: F.SYN_P001.slice(f.passage[0] - 1, f.passage[1]).join('\n'), lineStart: f.passage[0]});
const today = () => new Date().toISOString().slice(0, 10);

// A library project as the commands build it: a source, a draft concept, one claim per form, the forms attached; then,
// as asked, each form verified by `reviewer`, the concept verified by `reviewer`, the claims released and activated by
// `releaser`. Every step goes through applyConceptCommand with the commit's author stated.
async function library({forms = F.FORM_ORDER, verify = false, review = false, release = false, activate = false, base = null, author = F.person, mark = ''} = {}) {
  const {CC} = await mods(); let p = base || F.blankProject();
  const k = (type, payload, actor = 'importer', opts = F.person(actor)) => { const r = CC.applyConceptCommand(p, {type: 'knowledge.' + type, payload}, AT, actor, opts); p = r.document; return r.selected; };
  const sourceId = k('source', F.sourcePayload('SYN-P001 Transactional outbox', F.SYN_P001), 'importer', author('importer'));
  const conceptRecordId = k('concept', CONCEPT, 'importer', author('importer')), all = F.p001Forms(), claimIds = {};
  for (const t of forms) { const payload = F.formClaim(sourceId, 'SYN-P001', all[t]); if (mark) payload.statement += ' ' + mark; claimIds[t] = k('claim', payload, 'importer', author('importer')); }
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
    legacy: {knowledge: sha256(JSON.stringify(p.knowledge)), released: sha256(JSON.stringify(K.releasedClaims(p))), releasedCount: K.releasedClaims(p).filter(x => x.eligible).length, checksum: p.knowledge.releases[0].checksum, stamp: K.knowledgeStamp(p), findings: sha256(JSON.stringify(K.knowledgeFindings(p))), withdrawnFindings: sha256(JSON.stringify(K.knowledgeFindings(w))), withdrawnCount: K.knowledgeFindings(w).length, withdrawnKnowledge: sha256(JSON.stringify(w.knowledge))}
  };
}
const BASELINE = {bank: {findings: 'e188b2ccd284a1ab6d7be71b78f989075419b7dfcdcb3a8fdba5509041a6212a', findingCount: 558, chapterStamps: '644600e67df72b09cf78265450199b1645f6f83d13bf52fe699dca8e5c3a7ad2', fingerprint: '61b50cbbcca55207', sourceStamp: '61b50cbbcca55207', summaries: 'dc5268f93d9c7ca3558b9a2d33cf1927db1f8e169288c4130c828ffce2521dd3', sdd: '5e6779324f55d1cd27c938f40f5584779c3d6901f91eccc18ae538f3725372a8', hasKnowledgeKey: false}, legacy: {knowledge: '07138e2668709052750ada4e3dd0eca5eb4fcc73f410292d013da764204e18ec', released: '7f18d3ddfed6a21b3fb185624209d20f14829617685494f0b9c10fa43ebb73bf', releasedCount: 2, checksum: '8471646dd848bbd34a59c6b438d354953ff016c92aed10aba6d44b734e912e84', stamp: '2d6d7243e37f8333b65a26149345954f02ee48b06e5985f0672f4e4aff0b2d01', findings: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945', withdrawnFindings: 'a935821fd3ed19de9a35185d894c328c7d40588b0c64acb2017f697ee9b154e1', withdrawnCount: 1, withdrawnKnowledge: '1383330f720ae764489709941c85894a7353d910a26463e1d480c8579a9ced3a'}};

// The readings of a design project that a candidate must never move: the checks and readiness, the eligibility of
// knowledge, what released knowledge offers every reader, the SDD, the contextual reading, the Brain's context and
// Sol's packet; and, named one by one, the gates and comparisons a decision passes: the eligibility gate of each of the
// reference's nine technology selections (its criteria, what is pending or unassessed, its state), the comparison of
// products for each (what released knowledge says of each option against the criteria), the Chapter 7 conformance
// findings and the gate of the requirements specification. A finding's `stamp` holds the fingerprint of the whole
// document (knowledge included, as on rc.10.73.42, where a plain candidate source moves it too), so it is compared apart.
function designReadings(p) {
  const requirement = p.artefacts.find(a => a.type === 'requirement').id, packet = intelligencePacket(p, {chapter: 1, objectId: requirement, mode: 'mind', prompt: 'Explain the transactional outbox and when a relay may repeat a notice.'});
  return {
    findings: rv.inheritedFindings(p).map(({stamp: _stamp, ...f}) => f), summaries: rv.chapterSummaries(p), blockers: rv.reviewBlockerCount(p), readiness: sddReadiness(p), coverage: rv.traceCoverage(p), capacity: rv.reviewCapacity(p),
    selectionGates: realizations(p).map(r => ({id: r.id, criteria: realizationCriteria(p, r.id), gate: selectionGate(p, r), state: selectionState(p, r)})), productComparisons: realizations(p).map(r => productComparison(p, r.id)),
    realisationFindings: technologyRealisationFindings(p).map(({stamp: _stamp, ...f}) => f), specificationGate: arsGate(p),
    released: K.releasedClaims(p), knowledgeFindings: K.knowledgeFindings(p), domain: domainKnowledge(p), structures: knowledgeStructures(p), snapshot: architectureKnowledgeSnapshot(p),
    sdd: architectureMarkdown(p).markdown, intelligence: architectureIntelligence(p, {id: requirement}), brain: brainContext(p, {id: requirement, chapter: 1}).knowledge,
    packetSources: packet.sources.map(s => [s.kind, s.objectId, s.ref, s.excerpt])
  };
}
const same = (a, b, what) => { for (const key of Object.keys(a)) assert.equal(JSON.stringify(b[key]), JSON.stringify(a[key]), what + ': ' + key + ' moved'); };

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
  refused('definition', f => { f.quotes = ['a durable outbox guarantees delivery']; }, /definition\.quotes\[0\] is not found in the passage/);
  // Numbers: free in a teaching form, and in a decision-bearing form only where the item's own quote holds them.
  { const f = all.mechanism, form = clone(f.content); form.steps[0].text += ' Within 30 seconds.'; assert.deepEqual(CF.conceptFormIssues(form, ctx(f)), [], 'a teaching form may state a number'); }
  refused('applicability', f => { f.useWhen[0].text += ' Within 30 seconds.'; }, /applicability\.useWhen\[0\]\.text states the number 30, which its quote does not contain/);
  refused('calculation', f => { f.bounds += ' At most 15 minutes.'; }, /calculation\.bounds states the number 15, which no quote of the form contains/);
  refused('composition', f => { f.parameters[0].selectionBasis = 'Use 50 rows.'; }, /composition\.parameters\[0\]\.selectionBasis states the number 50/);
  { const f = all.calculation, form = clone(f.content); form.workedValues[0].name = 'outage of 120 seconds'; assert.deepEqual(CF.conceptFormIssues(form, ctx(f)), [], 'a number its quote holds is allowed'); }
  refused('selection', f => { f.variants[0].name = 'Polling every 30 seconds'; }, /selection\.variants\[0\]\.name states the number 30/);
  refused('calculation', f => { f.modelKind = 'queue-model-2'; }, /calculation\.modelKind states the number 2/);
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
  // The hash covers the identity, the facets and each form claim as it stands; the steward and review date are not identity.
  assert.equal(concept().hash, KC.conceptHash(L.document.knowledge.concepts[0], L.document.knowledge.claims));
  const steward = edit({steward: 'Another guild'}, 'architect'); assert.equal(KC.conceptRecords(steward)[0].hash, reviewedHash); assert.equal(KC.conceptRecords(steward)[0].state, 'reviewed', 'who stewards it is not its identity');
  for (const change of [{title: 'Transactional outbox (renamed)'}, {kind: 'tactic'}, {family: 'Another family'}, {scope: ['component']}, {stages: [5]}, {lenses: ['integrity']}, {forms: forms.slice(0, 2)}]) {
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
  assert.equal(c.state, 'reviewed'); assert.deepEqual({...c.review, conceptHash: null}, {decision: 'verified', actor: 'reviewer', reviewer: 'Synthetic second person', at: AT, reason: CONCEPT_REVIEW.reason, identityChecked: true, formsChecked: true, crosswalkChecked: true, conceptHash: null});
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
  const {CC} = await mods(); assert.deepEqual(CC.KNOWLEDGE_LIMIT_TIERS.project, {sources: 100, claims: 250, concepts: 100, topics: 100}); assert.deepEqual(CC.KNOWLEDGE_LIMIT_TIERS.library, {sources: 300, claims: 1000, concepts: 300, topics: 300});
  const fill = p => { const q = clone(p), s = q.knowledge, claim = s.claims[0], source = s.sources[0]; while (s.claims.length < 250) s.claims.push({...claim, id: 'KC-F' + s.claims.length}); while (s.sources.length < 100) s.sources.push({...source, id: 'KS-F' + s.sources.length}); return q; };
  const L = await library({forms: ['definition']}), full = fill(L.document), claim = F.formClaim(L.sourceId, 'SYN-P001', F.p001Forms().mechanism), source = F.sourcePayload('SYN-P002 Idempotent receiver', F.SYN_P002);
  const send = (p, type, payload, actor = 'importer', opts = F.person(actor)) => CC.applyConceptCommand(p, {type: 'knowledge.' + type, payload}, AT, actor, opts);
  assert.throws(() => send(full, 'claim', claim), {message: 'This project has reached its claim limit.'});
  assert.throws(() => send(full, 'source', source), {message: 'This project has reached its source revision limit.'});
  assert.throws(() => K.applyKnowledgeCommand(full, {type: 'knowledge.source', payload: source}, AT, 'importer'), {message: 'This project has reached its source revision limit.'}, 'the old entry keeps the project tier');
  const mark = {enabled: true, reason: 'This project authors one tranche of the synthetic handbook.', reviewer: 'Synthetic steward', reviewed: true};
  assert.throws(() => send(full, 'library', mark, 'bot', F.agent('bot')), /An agent or Sol|agent|person/i);
  assert.throws(() => send(full, 'library', mark, 'architect', F.solDraft('architect')), /A draft by Sol reviews nothing/);
  assert.throws(() => send(full, 'library', mark, 'architect', F.importedBy('architect')), /An import records what a file says and reviews nothing/);
  assert.throws(() => send(full, 'library', {...mark, reason: ''}, 'architect'), /Review the exact change/);
  assert.throws(() => send(full, 'library', {...mark, reviewed: false}, 'architect'), /Review the exact change/);
  const lib = send(full, 'library', mark, 'architect').document; assert.deepEqual(lib.knowledge.library, {enabled: true, at: AT, actor: 'architect', reason: mark.reason});
  const more = send(send(lib, 'claim', claim).document, 'source', source).document; assert.equal(more.knowledge.claims.length, 251); assert.equal(more.knowledge.sources.length, 101);
  assert.throws(() => send(more, 'library', {...mark, enabled: false}, 'architect'), /holds more than a project may \(100 sources, 250 claims/);
  const back = send(lib, 'library', {...mark, enabled: false}, 'architect').document; assert.equal(back.knowledge.library.enabled, false);
  assert.throws(() => send(back, 'claim', claim), {message: 'This project has reached its claim limit.'});
  // Eligibility does not depend on the tier: a library's candidate is as ineligible as any.
  assert.equal(K.knowledgeEligibility(more, more.knowledge.claims.at(-1)).eligible, false);
});

// ------------------------------------------------------------------------------------------------ 8
add('S1.8: a document with none of the new records reads as on rc.10.73.42: the bank-payment reference (findings, stamps, fingerprint, SDD) and a project of plain governed knowledge (the document the old commands write, released claims, findings, checksum), through the old entry and through the wrapper alike', async () => {
  const {CC} = await mods();
  assert(BASELINE, 'the rc.10.73.42 readings are recorded in this file');
  assert.deepEqual(oldDocumentReadings(), BASELINE, 'an old document no longer reads as it did on rc.10.73.42 (commit 94dbd4f). If the change is meant, state it and print the readings again with --print-baseline');
  // The wrapper writes what the old entry writes for every command that existed, byte for byte, with and without an author.
  const base = F.blankProject('rc44-wp1-legacy'), old = F.legacyKnowledge(K.applyKnowledgeCommand, base).document;
  for (const opts of [undefined, F.person('architect-a')]) { const wrapped = F.legacyKnowledge((p, c, at, actor) => CC.applyConceptCommand(p, c, at, actor, opts), base).document; assert.equal(JSON.stringify(wrapped), JSON.stringify(old)); }
  for (const key of ['library', 'topics', 'concepts', 'crosswalk', 'conceptPins', 'previews']) assert(!(key in old.knowledge), 'no ' + key + ' key until it is first written');
  assert(old.knowledge.claims.every(c => !('form' in c) && !('authoredAs' in c)) && old.knowledge.sources.every(s => !('checkedAt' in s) && !('sourceFile' in s)) && old.knowledge.claims.every(c => !('formChecked' in c.review)));
  // Reading changes nothing, and the new readers find nothing in an old document.
  const {KC} = await mods(), bank = F.bankProject(), frozen = JSON.stringify(bank);
  assert.deepEqual(KC.conceptRecords(bank), []); assert.deepEqual(KC.releasedConcepts(old), []); assert.equal(KC.conceptReading(old, 'PAT-REPLICATED-QUEUE'), null); assert.deepEqual(KC.conceptDecisionForms(old, 'KU-0001'), []);
  assert.equal(JSON.stringify(bank), frozen); assert(!('knowledge' in bank), 'a read creates no knowledge key');
  // A new key appears when it is first written, and only that key.
  const first = CC.applyConceptCommand(old, {type: 'knowledge.concept', payload: CONCEPT}, AT, 'importer', F.person('importer')).document;
  assert.deepEqual(Object.keys(first.knowledge).filter(k => !(k in old.knowledge)), ['concepts']);
  const topic = CC.applyConceptCommand(first, {type: 'knowledge.topic', payload: {file: 'Synthetic_Integration_Handbook.docx', topicId: 'SYN-P001', title: 'Transactional outbox', lineStart: 1, lineEnd: 58, sliceSha256: sha256(F.SYN_P001.join('\n')), sourceId: null, declaredKind: 'pattern', intendedUse: 'design-method', conceptId: 'SYN-P001', reason: ''}}, AT, 'importer', F.importedBy('importer')).document;
  assert.deepEqual(Object.keys(topic.knowledge).filter(k => !(k in old.knowledge)), ['concepts', 'topics']);
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
    assert.deepEqual(KC.conceptDecisionForms(pin, 'KU-0001').map(x => x.type), ['selection', 'composition', 'calculation', 'verification'], what + ': the tampered form is not handed to a design record');
  }
  // The definition is the anchor: with it unusable, a design record is handed nothing of the concept.
  { const q = careful(f => { f.quotes = ['an outbox guarantees exactly-once delivery']; }, 'definition'), pin = clone(q); pin.knowledge.conceptPins = [{id: 'KU-0001', conceptId: 'SYN-P001', releaseId: L.releaseId, status: 'active'}];
    assert.equal(status(q, 'definition').status, 'released-ineligible'); assert.deepEqual(KC.conceptDecisionForms(pin, 'KU-0001'), []); assert.equal(status(q, 'applicability').status, 'released'); }
  // What an active release holds is offered as entries, never as the raw claim.
  assert(KC.releasedConcepts(p)[0].forms.every(f => !('claim' in f) && !('form' in f)));
  { const q = careful(f => { f.steps[0].quote = 'the relay publishes before the commit'; }, 'mechanism'); assert.equal(status(q, 'mechanism').status, 'released-ineligible'); assert.equal(status(q, 'mechanism').content, null, 'a teaching form too'); assert(!KC.conceptTeachingForms(q, 'SYN-P001').some(f => f.type === 'mechanism')); }
  // A withdrawn source makes every form of the release ineligible through the existing gate.
  const withdrawn = L.k('withdraw', {...F.REVIEW, id: L.sourceId, stamp: K.knowledgeImpactStamp(p, L.sourceId)}, 'releaser') && L.document;
  assert(KC.conceptReading(withdrawn, 'SYN-P001').forms.every(f => f.status === 'released-ineligible' && f.content === null && /withdrawn/.test(f.label)));
});

// ------------------------------------------------------------------------------------------------ 10
add('S1.10 (inert candidates): with the nine forms of a concept saved as candidates, then verified, reviewed and released but not active, in the bank-payment reference, no check, eligibility gate of a selection, product comparison, conformance finding, readiness reading, released-knowledge reader, SDD, contextual reading or Sol packet moves, and the marker in them reaches none', async () => {
  const {KC} = await mods(), bank = F.bankProject(), before = designReadings(bank), frozen = JSON.stringify(bank);
  // The readings are not empty ones: the reference holds checks, nine technology selections with their criteria and a comparison for each.
  assert(before.findings.length > 100 && before.realisationFindings.length > 10 && before.selectionGates.length === 9 && before.selectionGates.every(g => g.criteria.length) && before.productComparisons.every(c => c && c.options.length) && before.specificationGate, 'the reference offers every reading compared here');
  // As on rc.10.73.42, any knowledge write moves the whole-document fingerprint (a plain candidate source does): shown, not hidden.
  const plain = K.applyKnowledgeCommand(bank, {type: 'knowledge.source', payload: F.sourcePayload('SYN-P002 Idempotent receiver', F.SYN_P002)}, AT, 'importer').document;
  assert.notEqual(rv.designFingerprint(plain), rv.designFingerprint(bank), 'a plain candidate source moves the design fingerprint on rc.10.73.42 already');
  same(before, designReadings(plain), 'a plain candidate source');
  for (const [stage, options] of [['candidate', {}], ['every form verified', {verify: true}], ['concept reviewed', {verify: true, review: true}], ['released, not active', {verify: true, review: true, release: true}]]) {
    const L = await library({...options, base: bank, mark: F.MARKER}), p = L.document, after = designReadings(p);
    assert.equal(p.knowledge.claims.filter(c => c.form).length, 9, stage + ': the nine forms are in the document'); assert.equal(p.knowledge.concepts.length, 1);
    assert(JSON.stringify(p.knowledge).includes(F.MARKER));
    same(before, after, stage);
    assert(!JSON.stringify(after).includes(F.MARKER), stage + ': the marker reached a reading');
    const requirement = p.artefacts.find(a => a.type === 'requirement').id;
    assert(!JSON.stringify(intelligencePacket(p, {chapter: 1, objectId: requirement, mode: 'mind', prompt: 'Explain the transactional outbox and when a relay may repeat a notice.'})).includes(F.MARKER), stage + ': the marker reached Sol\'s packet');
    assert.deepEqual(K.releasedClaims(p), [], stage + ': nothing is released'); assert.deepEqual(KC.releasedConcepts(p), []);
    assert.deepEqual(KC.conceptDecisionForms(p, 'KU-0001'), []);
    assert(KC.conceptReading(p, 'SYN-P001').forms.filter(f => f.tier === 'decision').every(f => f.content === null && f.architectureUnit === null), stage + ': the concept reading holds no decision-bearing content');
    assert.equal(rv.designFingerprint(p) !== rv.designFingerprint(bank), true);
  }
  // Released and active, a form is a released claim like any other (verified by a second person, reviewed with its
  // concept, released and activated by a person): no check, gate, conformance finding or readiness reading moves, and a
  // receipt carries no form and scores nothing.
  { const L = await library({verify: true, review: true, release: true, activate: true, base: bank}), p = L.document, after = designReadings(p);
    assert.equal(K.releasedClaims(p).filter(h => h.eligible && h.claim.form).length, 9);
    for (const key of ['findings', 'summaries', 'blockers', 'readiness', 'coverage', 'capacity', 'selectionGates', 'realisationFindings', 'specificationGate', 'knowledgeFindings']) assert.equal(JSON.stringify(after[key]), JSON.stringify(before[key]), 'released and active: ' + key + ' moved');
    for (const h of K.releasedClaims(p)) { const receipt = K.claimReceipt(p, h.claim, h.release); assert(!('form' in receipt)); assert.equal(receipt.scoring, false); }
    // What does move, said plainly: the applicability form carries a structured architecture unit, and a released claim
    // with one is offered beside each product option of a comparison, as any released claim is on rc.10.73.42: its
    // statement and its receipt, which scores nothing, and never its form. Nothing else of a comparison moves.
    const unmatched = c => JSON.parse(JSON.stringify(c), (k, v) => k === 'matches' ? [] : v), matches = after.productComparisons.flatMap(c => c.C.options.flatMap(o => o.claims.matches));
    assert.equal(JSON.stringify(after.productComparisons.map(unmatched)), JSON.stringify(before.productComparisons.map(unmatched)), 'released and active: a product comparison moved outside the released claims it offers');
    assert.deepEqual(before.productComparisons.flatMap(c => c.C.options.flatMap(o => o.claims.matches)), []);
    assert(matches.length > 0 && matches.every(m => m.claimType === 'applicability' && m.receipt.kind === 'governed-claim' && m.receipt.scoring === false), 'the released applicability claim, by its receipt');
    assert(!/"(?:form|useWhen|avoidWhen|prerequisites|guaranteeBoundary|quote)":/.test(JSON.stringify(matches)), 'a comparison is handed the claim\'s statement and unit, never the form'); }
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
  p = send('concept', CONCEPT).document;
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
  if (existsSync('dist/client-metafile.json')) { const inputs = Object.keys(JSON.parse(readFileSync('dist/client-metafile.json', 'utf8')).inputs); for (const name of NEW) assert(!inputs.includes('public/' + name), 'the built client holds ' + name); }
});
