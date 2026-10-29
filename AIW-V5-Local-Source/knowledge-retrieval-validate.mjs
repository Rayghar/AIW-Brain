// Domain knowledge at depth (round 12, workstream K; audit/round12/GAP-REGISTER.md GR-DOM-01..09).
// Synthetic projects only: every record here is written for this suite; no client document is read.
//  1. Retrieval (GR-DOM-01): a project that uses the core-banking lens reads posting, currency exchange and residency
//     questions with the lens's words and finds the trade-offs that apply; nothing below the relevance margin is
//     returned, a tie never decides, and a question with no real match returns empty lists.
// Run: npm run test:knowledge-retrieval
import assert from 'node:assert/strict';
import {readDecision} from './public/decision-reading.js';
import {suggestEffects} from './public/decision-suggestions.js';
import {createProject} from './shared/projects-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyLensCommand} from './public/domain-lens.js';
import {CORE_BANKING} from './public/lenses/core-banking.js';
import {CORE_BANKING_TERMS} from './public/lenses/core-banking-terms.js';
import {brainContext} from './public/aiw-brain.js';
import {architectureBrain, brainSources, domainTerms, aboveTie, coversName, RELEVANCE_MARGIN, brainTokens} from './public/architecture-brain.js';
import {BRAIN_TRADEOFFS} from './public/brain-tradeoffs.js';
import {BRAIN_CATALOGUE} from './public/brain-catalogue.js';
import {catalogue} from './public/catalogue-store.js';
import {CATALOGUE} from './public/catalogue-index.js';
import {catalogueMark, curatedName, catalogueStubs, catalogueRelation, stubName, MARKED_RECORDS, NOT_FOR_FINANCIAL_USE} from './public/catalogue-curation.js';
import {knowledgeGraph} from './public/knowledge-graph.js';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {applyKnowledgeCommand, knowledgeEligibility, knowledgeStamp, knowledgeImpactStamp, releasedClaims, organizationReleases, organizationRef, pinOrganizationKnowledge, withdrawn, ORGANIZATION_KNOWLEDGE_LIMITS} from './public/knowledge-governance.js';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {readStoredProject, saveStoredProject} from './project-storage.js';
import {neutraliseImportedAuthority} from './recovery-service.js';
import {buildDomainCandidates, PACK_FILE, PACK_ID, REVIEW_PACK} from './scripts/build-domain-candidates.mjs';
import {importDomainCandidates} from './scripts/import-domain-candidates.mjs';
import {domainShape, domainTopics, releasedTactics, productFacts, regulationRecords, releasedDesignConcerns} from './public/domain-knowledge.js';
import {TOPICS, decisionTopics, decisionPatterns, decisionGuidance, proposedAlternative, applyDecisionCommand, withDecisions} from './public/decisions-domain.js';
import {ATTRIBUTES, PLAYBOOK} from './public/playbook-knowledge.js';
import {BRAIN_PLAYBOOK} from './public/brain-playbook.js';
import {tradeoffSource as tradeoffModel} from './public/tradeoff-model.js';
import {inheritedFindings} from './public/review-domain.js';
import {chapterChecks} from './public/readiness-model.js';
import {arsGate} from './public/ars-document.js';
import {detectAntiPatterns, reasoningFor} from './public/design-spec.js';
import {draftJourney} from './shared/journey-drafter.js';
import {lensReport} from './public/domain-lens.js';
import {TECHNOLOGY_CATEGORIES, PLATFORM_CATEGORIES, categoryName, applyTechnologyCommand, capability, technologyFindings} from './public/technology-domain.js';
import {applyTechnologyRealisationCommand, realizationCriteria} from './public/technology-realisation-domain.js';
import {familyOf} from './public/platform-model.js';
const sha256 = s => createHash('sha256').update(s, 'utf8').digest('hex');

const checks = [], pass = name => checks.push(name);
const AT = '2026-10-08T09:00:00.000Z', ACTOR = 'retrieval-architect';
let made = 0;
const blank = (name = 'Synthetic deposits platform') => withFinalReview(createProject({name: name + ' ' + (++made), template: 'blank'}, 'kr-' + made, AT));
const useLens = p => applyLensCommand(p, {type: 'lens.choose', payload: {lensId: 'core-banking', reason: 'This synthetic project is a core-banking platform.'}}, AT, ACTOR).document;
const ask = (p, query, limit = 6) => architectureBrain(p, brainContext(p, {chapter: 3, id: 'project'}), {query, limit});
const ids = xs => xs.map(h => (h.record || h.method || h.tradeoff || h.claim).id);

// ---------------------------------------------------------------- 1. retrieval (GR-DOM-01)
{
  assert.equal(CORE_BANKING.vocabulary, CORE_BANKING_TERMS, 'the vocabulary is the lens\'s own');
  assert.deepEqual(Object.keys(CORE_BANKING_TERMS), CORE_BANKING.concerns.map(c => c.id), 'one entry for each concern of the lens, in its order');
  for (const [id, v] of Object.entries(CORE_BANKING_TERMS)) {
    assert.ok(v.terms.length >= 3 && v.terms.every(t => t === t.toLowerCase() && !/[^a-z0-9 ]/.test(t) && t.trim() === t), id + ': terms in lower case, words separated by spaces');
    assert.ok(v.asks.every(a => brainTokens(a).length === 1), id + ': each ask is one word');
  }
  const banking = useLens(blank()), plain = blank(), before = JSON.stringify(banking);
  const POSTING = ['post each transaction to the general ledger as balanced debit and credit entries', 'how should posting work'];
  const CURRENCY = ['currency exchange for multi-currency accounts and revaluation of foreign balances', 'exchange rates'];
  const RESIDENCY = ['customer data must remain in-country under data residency rules', 'data residency'];
  const APPLY = [[POSTING, ['TO-005', 'TO-013'], 'posting'], [CURRENCY, ['TO-005', 'TO-013'], 'fx'], [RESIDENCY, ['TO-015'], 'privacy']];
  for (const [queries, want, concern] of APPLY) for (const q of queries) {
    const b = ask(banking, q);
    assert.deepEqual(b.trace.domain?.concerns, [concern], q + ': the question names the ' + concern + ' concern');
    assert.deepEqual(ids(b.tradeoffs), want, q + ': the trade-offs that apply');
    assert.deepEqual(ids(b.concepts), [], q + ': no catalogue record shares more than a word with it');
    assert.ok(b.methods.every(h => h.relevance >= RELEVANCE_MARGIN.method), q + ': no Playbook passage below the margin');
    const cited = brainSources(banking, b);
    assert.ok(want.every(id => cited.some(s => s.kind === 'brain-method' && s.objectId === id && s.receipt.scoring === false)), q + ': each trade-off is cited as a method with scoring:false');
    assert.ok(!cited.some(s => s.kind === 'catalogue-description'), q + ': no catalogue record is cited');
  }
  // Without the lens the domain's words do not apply: a posting question is not read as ledger posting, and the
  // records it used to tie with are still not returned.
  for (const q of [...POSTING, ...CURRENCY, ...RESIDENCY]) {
    const b = ask(plain, q);
    assert.equal(b.trace.domain, null, q + ': no lens, no domain reading');
    assert.deepEqual(ids(b.concepts), [], q + ': without the lens, no record tied on one generic word either');
  }
  assert.deepEqual(ids(ask(plain, POSTING[1]).tradeoffs), [], 'without the lens, "posting" asks about no consistency');
  // A question with no real match returns empty lists, with the lens and without it.
  for (const p of [banking, plain]) {
    const b = ask(p, 'zebra crossing timetable for a ferry');
    assert.deepEqual([b.concepts, b.methods, b.tradeoffs, b.claims], [[], [], [], []], 'no real match, nothing returned');
    assert.equal(brainSources(p, b).length, 0);
  }
  // The rules of the margin, one by one.
  const named = ask(banking, 'disaster recovery with RPO and RTO and failover to a secondary site');
  assert.deepEqual(ids(named.concepts), ['PAT-DISASTER-RECOVERY', 'PAT-FAILOVER'], 'records the question names are returned');
  assert.ok(named.concepts.every(h => h.named > 0 || coversName(h.record, new Set(brainTokens('disaster recovery failover')))));
  const audit = ask(banking, 'audit trail of every user action with tamper evidence');
  assert.deepEqual(ids(audit.concepts), ['PAT-AUDIT-TRAIL'], 'Audit Trail is named; Real User Monitoring, Evidence-Based Recommendation and the others share one word each');
  assert.ok(audit.trace.belowMargin >= 5, 'the records that share one word are counted as below the margin');
  const gateway = ask(plain, 'mobile banking and ISO 20022 payment channels via API gateway');
  assert.deepEqual(ids(gateway.concepts), ['PAT-API-GATEWAY', 'ARCH-API-GATEWAY-CAPABILITY'], 'two words of a name cover it; Model Gateway, Unversioned API and the like do not');
  const record = r => ({name: r});
  assert.equal(coversName(record('Token Exchange'), new Set(['exchange', 'rates'])), false, 'one word of two is not the name');
  assert.equal(coversName(record('Failover'), new Set(['failover'])), true, 'every word of a one-word name is the name');
  assert.equal(coversName(record('Model Gateway'), new Set(['gateway'])), false, 'a stop word still belongs to the name');
  const h = (...rs) => rs.map((relevance, i) => ({id: 'H' + i, relevance}));
  assert.deepEqual(aboveTie(h(10, 10, 10, 10, 10, 10, 10, 9), 6), [], 'seven records tied for six places: none is returned');
  assert.deepEqual(aboveTie(h(11, 10, 10, 10, 10, 10, 10), 6).map(x => x.relevance), [11], 'the one above the tie is');
  assert.deepEqual(aboveTie(h(12, 11, 10), 6).length, 3, 'no tie at the cut, every hit');
  assert.deepEqual(aboveTie(h(12, 11, 10, 9), 3).map(x => x.relevance), [12, 11, 10], 'a cut below a distinct level keeps the level');
  // A one-word search that many records share: browsing (the knowledge workspace) keeps only the levels above the tie
  // at the cut; Sol's retrieval keeps no record whose name the word does not cover.
  const ctx = brainContext(plain, {chapter: 3, id: 'project'}), browse = limit => architectureBrain(plain, ctx, {query: 'cache', limit, browse: true}).concepts;
  const all = browse(400), six = browse(6), cutLevel = all[6]?.relevance;
  assert.ok(all.length > 6 && all[5].relevance === cutLevel, 'the search ties across the sixth place');
  assert.deepEqual(ids(six), ids(all.filter(x => x.relevance > cutLevel).slice(0, 6)), 'browsing returns the records above the tie and none of the tie');
  assert.ok(!six.some(x => x.relevance === cutLevel), 'no record of the tied level is returned');
  assert.deepEqual(ids(ask(plain, 'cache').concepts), [], 'Sol\'s retrieval: "cache" alone covers no record\'s name');
  // A trade-off needs a named title, a two-word cue phrase, two specific cues, or a domain-lens cue:
  // "under" alone names no partition.
  const under = ask(plain, 'customer data must remain under the rules');
  assert.deepEqual(ids(under.tradeoffs), [], '"under" alone retrieves no trade-off');
  assert.equal(ids(ask(plain, 'consistency under partition').tradeoffs)[0], 'TO-013', 'with a content word, the same title still answers');
  // The domain terms a question names: longest first, each once; the asks and words it adds.
  const d = domainTerms(banking, 'Multi-currency foreign exchange and FX revaluation');
  assert.deepEqual([d.lensId, d.concerns, d.terms], ['core-banking', ['fx'], ['foreign exchange', 'multi currency', 'revaluation', 'fx']]);
  assert.ok(d.consumed.has('exchange') && d.consumed.has('multi') && !d.consumed.has('and'), 'the words of a named term stop matching alone');
  assert.deepEqual([...d.asks], ['consistency', 'stale']);
  assert.deepEqual(domainTerms(plain, 'foreign exchange').terms, [], 'no lens, no domain terms');
  assert.deepEqual(domainTerms({workspace: {domainLens: {lensId: 'constructor'}}}, 'foreign exchange').lensId, null, 'only a lens AIW offers');
  assert.equal(JSON.stringify(banking), before, 'retrieval changes nothing');
  assert.ok(BRAIN_TRADEOFFS.passages.some(m => m.id === 'TO-015' && /data location/.test(m.text)), 'TO-015 is the passage on where data may live');
  pass('retrieval: with the core-banking lens, posting questions find TO-005 and TO-013, currency exchange questions TO-005 and TO-013, residency questions TO-015, each cited as a method with scoring:false and with no catalogue record; without the lens the domain words do not apply and no record tied on one word returns; a question with no real match returns empty lists; concepts are named or have their name covered, Playbook passages require subject overlap, trade-offs require a named title, specific cues or a domain-lens cue, and a tie at the cut is left out');
}

// ---------------------------------------------------------------- 2. the catalogue's marks and stubs (GR-DOM-02, GR-DOM-06)
{
  const C = catalogue(), plain = blank('Synthetic catalogue reader');
  assert.equal(C, BRAIN_CATALOGUE, 'the store holds the archive projection itself');
  assert.equal(C.records.length, 328, 'no record is added to the archive projection');
  assert.deepEqual(CATALOGUE.records.map((r, i) => [r.id, Buffer.from(CATALOGUE.recordHashes.slice(i * 43, i * 43 + 43), 'base64url').toString('hex')]), C.records.map(r => [r.id, r.recordSha256]), 'every record keeps its archive hash');
  // The four families the banking review named carry the mark, with why; the misleading names read clearly.
  const FAMILIES = {recovery: 'PAT-DISASTER-RECOVERY', 'audit trail': 'PAT-AUDIT-TRAIL', reconciliation: 'PAT-RECONCILIATION-LOOP', 'payment cell': 'TPL-PAYMENT-PROCESSING-CELL'};
  for (const [family, id] of Object.entries(FAMILIES)) {
    const r = C.records.find(x => x.id === id), m = catalogueMark(r);
    assert.ok(r && /normalized as an AIW/.test(r.summary), family + ': the archive record is the catalogue\'s template');
    assert.equal(m?.mark, NOT_FOR_FINANCIAL_USE, family + ': marked not for financial use');
    assert.ok(m.why.length > 60 && !/—/.test(m.why), family + ': with why, in a sentence');
  }
  assert.equal(curatedName(C.records.find(r => r.id === 'PAT-RECONCILIATION-LOOP')), 'Reconciliation Loop (platform control loop)');
  assert.equal(curatedName(C.records.find(r => r.id === 'TPL-PAYMENT-PROCESSING-CELL')), 'Payment Processing Cell (no payment content)');
  assert.equal(curatedName(C.records.find(r => r.id === 'PAT-CACHE-ASIDE')), 'Cache-Aside', 'an unmarked record keeps the archive\'s name');
  assert.ok(MARKED_RECORDS.every(id => C.records.some(r => r.id === id)), 'every mark is on a record the archive holds');
  // None is cited as grounding: named by the question, each is shown among the concepts with its mark, never cited.
  for (const [q, id] of [['disaster recovery plan', 'PAT-DISASTER-RECOVERY'], ['audit trail of changes', 'PAT-AUDIT-TRAIL'], ['a reconciliation loop for settlements', 'PAT-RECONCILIATION-LOOP'], ['payment processing cell', 'TPL-PAYMENT-PROCESSING-CELL']]) {
    const b = ask(plain, q);
    assert.ok(b.concepts.some(h => h.record.id === id), q + ': shown among the concepts');
    assert.ok(!brainSources(plain, b).some(s => s.objectId === id), q + ': never cited');
  }
  const cache = ask(plain, 'Should equipment catalogue reads use cache-aside?');
  assert.ok(brainSources(plain, cache).some(s => s.kind === 'catalogue-description' && s.objectId === 'PAT-CACHE-ASIDE'), 'an unmarked record named by the question is still cited as a descriptive entry');
  // Every relation resolves: to the archive's record, or to AIW's stub for the record the archive does not hold.
  const stubs = catalogueStubs(), held = new Set(C.records.map(r => r.id));
  assert.equal(stubs.length, 15, 'the fifteen relation ids the archive does not hold');
  const want = ['PAT-WORKFLOW-ORCHESTRATION', 'PAT-TWO-PHASE-COMMIT', 'ANTI-ORPHANED-WORKFLOW', 'ANTI-DUAL-WRITE', 'PAT-BACKENDS-FOR-FRONTENDS', 'PAT-SERVICE-MESH-INGRESS', 'ANTI-SMART-GATEWAY-DUMB-SERVICES', 'PAT-AUDIT-LOG', 'PAT-TEMPORAL-TABLE', 'PAT-SNAPSHOT', 'ANTI-EVENT-AS-CRUD-LOG', 'ANTI-SHARED-UNBOUNDED-POOL', 'PAT-PERIMETER-SECURITY', 'ANTI-IMPLICIT-TRUST', 'ANTI-SHARED-SERVICE-CREDENTIALS'];
  assert.deepEqual(stubs.map(s => s.id).sort(), [...want].sort());
  let relations = 0;
  for (const r of C.records) for (const f of ['alternatives', 'complements', 'conflicts']) for (const id of r[f] || []) { relations++; const t = catalogueRelation(id); assert.ok(t && t.id === id, r.id + ' ' + f + ' ' + id + ': resolves'); }
  for (const s of stubs) {
    assert.ok(s.stub === true && !held.has(s.id) && s.summary === '' && s.namedBy.length >= 1, s.id + ': a stub with no content, named by the records that name it');
    assert.ok(s.namedBy.every(n => C.records.find(r => r.id === n.id)?.[{alternative: 'alternatives', complement: 'complements', conflict: 'conflicts'}[n.relation]].includes(s.id)), s.id + ': each naming is the archive\'s own relation');
    assert.ok(!('problem' in s) && !('componentKit' in s) && !('obligations' in s), s.id + ': no invented content');
  }
  assert.equal(stubName('PAT-TWO-PHASE-COMMIT'), 'Two Phase Commit'); assert.equal(stubName('ANTI-EVENT-AS-CRUD-LOG'), 'Event as CRUD Log'); assert.equal(stubName('PAT-BACKENDS-FOR-FRONTENDS'), 'Backends for Frontends');
  assert.equal(catalogueRelation('PAT-NOT-NAMED-ANYWHERE'), null, 'an id no relation names resolves to nothing');
  const b = ask(plain, 'two phase commit or workflow orchestration');
  assert.ok(!b.concepts.some(h => h.record.stub), 'a stub is never retrieved as a concept');
  // The knowledge graph ends every relation at a node: the archive's record or the stub.
  const g = knowledgeGraph(plain), nodes = new Set(g.nodes.map(n => n.id));
  assert.ok(g.edges.every(e => nodes.has(e.from) && nodes.has(e.to)), 'every edge ends at a node');
  assert.ok(g.edges.some(e => e.from === 'concept:PAT-SAGA-BOUNDARY' && e.to === 'concept:PAT-TWO-PHASE-COMMIT' && e.status === 'stub'), 'the saga boundary\'s alternative ends at the two-phase commit stub');
  assert.equal(g.edges.filter(e => e.status === 'stub').length, relations - C.records.reduce((n, r) => n + ['alternatives', 'complements', 'conflicts'].reduce((k, f) => k + (r[f] || []).filter(id => held.has(id)).length, 0), 0), 'every relation to a missing record is a stub edge');
  assert.match(g.nodes.find(n => n.id === 'concept:PAT-RECONCILIATION-LOOP').mark, /^Not for financial use\. A platform control loop/);
  assert.equal(g.counts.concepts, 328, 'the graph still counts the archive\'s records');
  pass(`the catalogue: the archive projection is untouched (328 records, every hash); the recovery, audit-trail, reconciliation and payment-cell records, ${MARKED_RECORDS.length} marked in all, carry "Not for financial use" with why and a clearer name where theirs misleads, are shown among the concepts and never cited, while an unmarked record is cited as before; the fifteen relation ids the archive does not hold are AIW stubs with no content, so all ${relations} relations resolve, the graph ends every relation at a node and no stub is retrieved`);
}

// ---------------------------------------------------------------- 3. the candidate pack and its review pack
const PACK = JSON.parse(readFileSync(PACK_FILE, 'utf8')), R = PACK.records, byId = id => R.find(r => r.id === id);
const REVIEW = {reviewed: true, reviewer: 'Synthetic second reviewer', reason: 'Synthetic test of the governed path; not a real knowledge approval.'};
const VERIFY = {...REVIEW, decision: 'verified', sourceChecked: true, rightsChecked: true, conditionsChecked: true};
// The governed path a person would follow, with two synthetic accounts: the author imports and releases, another
// person verifies. Used only to prove what a release does; nothing in the repository is released.
function release(p, {author = 'knowledge-author', reviewer = 'knowledge-reviewer', ids = null, title = 'Synthetic release of the domain candidates'} = {}) {
  let q = p; const claimIds = (ids || q.knowledge.claims.map(c => c.id));
  for (const id of claimIds) q = applyKnowledgeCommand(q, {type: 'knowledge.review', payload: {...VERIFY, id}}, AT, reviewer).document;
  q = applyKnowledgeCommand(q, {type: 'knowledge.release', payload: {...REVIEW, title, claimIds}}, AT, author).document;
  const rid = q.knowledge.releases.at(-1).id;
  return applyKnowledgeCommand(q, {type: 'knowledge.activate', payload: {...REVIEW, id: rid, stamp: knowledgeStamp(q)}}, AT, author).document;
}
const imported = (p, ids = null) => importDomainCandidates(p, PACK, {ids, at: AT, actor: 'knowledge-author'});
{
  assert.equal(JSON.stringify(PACK, null, 2) + '\n', JSON.stringify(buildDomainCandidates(), null, 2) + '\n', 'the pack is the builder\'s output (node scripts/build-domain-candidates.mjs)');
  assert.deepEqual([PACK.schemaVersion, PACK.packId, PACK.status, PACK.productionAccepted], ['aiw-domain-candidates-v1', PACK_ID, 'candidate', false]);
  assert.deepEqual(PACK.approval, {status: 'pending', fourEyes: false, approvedBy: null, approvedAt: null, releaseId: null, decision: null}, 'pending, not approved');
  assert.deepEqual(PACK.influence, {scoring: false, constraints: false, conformance: false, drafter: false, brain: false, lens: false});
  assert.ok(existsSync(REVIEW_PACK) && /Status: pending\. Not approved, not released, not active\./.test(readFileSync(REVIEW_PACK, 'utf8')), 'the review pack exists and says it is pending');
  const review = readFileSync(REVIEW_PACK, 'utf8');
  for (const r of R) assert.ok(review.includes(r.id), r.id + ': listed in the review pack');
  assert.equal(new Set(R.map(r => r.id)).size, R.length, 'ids are unique');
  const LENS = CORE_BANKING.concerns.map(c => c.id);
  for (const r of R) {
    assert.equal(r.status, 'candidate', r.id);
    assert.ok(r.concernIds.length && r.concernIds.every(id => LENS.includes(id)), r.id + ': its lens concerns');
    assert.equal(r.passage === null, r.sourceNeeded === true, r.id + ': a source is needed exactly when no passage is held');
    if (r.passage) {
      assert.ok(r.passage.held === true && ['aiw-authored', 'sa-playbook'].includes(r.passage.origin), r.id + ': a held passage says where it comes from');
      assert.equal(sha256(r.passage.text), r.passage.sha256, r.id + ': its hash');
      assert.equal(r.passage.text.split('\n').length, r.passage.lines);
      assert.equal(domainShape(r.claim), {'decision-topic': 'topic', 'quality-tactic': 'tactic', 'playbook-passage': 'method', method: 'method'}[r.kind], r.id + ': its claim has the shape the chapters read');
      assert.ok(r.claim.statement && r.claim.lineStart === 1 && r.claim.lineEnd === r.passage.lines, r.id + ': a claim on the whole passage');
    }
    for (const s of r.sourcesNeeded) assert.ok(s.title && s.section && s.supports && /not confirmed|not located/.test(s.located) && s.rights === 'not checked', r.id + ': a needed source is named, not located as verified, rights not checked');
    assert.ok(!/—/.test(JSON.stringify(r)), r.id + ': no em-dash');
  }
  assert.deepEqual(PACK.counts, {records: R.length, decisionTopics: 7, tactics: 5, regulations: 12, productCategories: 6, playbookPassages: 7, methods: 2, heldPassages: R.filter(r => r.passage).length, sourceNeeded: R.filter(r => r.sourceNeeded).length});
  // The SA Playbook passages are the structured pack's own text, word for word, with the workbook's hash; the example
  // targets of cell F7 are not prepared.
  const av = ATTRIBUTES.find(a => a.id === 'availability').guide, wb = PLAYBOOK.files.find(f => f.file.endsWith('.xlsx'));
  const held = {DEFINITION: av.definition, IMPORTANCE: av.importance, METRICS: av.metrics.join('\n'), DECISIONS: av.decisions.join('\n'), TESTING: av.testing.join('\n'), RISKS: av.risks.join('\n')};
  for (const [k, text] of Object.entries(held)) { const r = byId('CBK-PB-AVAILABILITY-' + k); assert.equal(r.passage.text, text, k + ': the held text'); assert.ok(r.passage.locator.startsWith(wb.file + ' · QR-Guidebook!') && r.passage.licence.includes(wb.sha256)); }
  assert.ok(R.filter(r => r.kind === 'playbook-passage').every(r => !/99\.99%|RTO of 1 hour|RPO of 15 minutes/.test(r.passage.text)), 'no example target is prepared as a citable passage');
  assert.ok(!BRAIN_PLAYBOOK.passages.some(m => m.locator.startsWith('QR-Guidebook')), 'the citable playbook holds no QR-Guidebook passage: the recovery and availability passages are candidates only');
  // Regulation records: regulator, instrument, section and effective date, no passage, no statement; the project's own
  // jurisdiction is left for a person to name.
  const regs = R.filter(r => r.kind === 'regulation');
  for (const r of regs) { for (const k of ['regulator', 'instrument', 'section', 'effective', 'jurisdiction']) assert.ok(typeof r[k] === 'string' && r[k].trim(), r.id + ': ' + k); assert.equal(r.passage, null); }
  for (const r of regs.filter(r => r.claim)) { assert.equal(r.claim.statement, null, r.id + ': the pack states no obligation'); assert.equal(domainShape(r.claim), 'regulation'); }
  const j = byId('CBK-REG-JURISDICTION');
  assert.ok(j.regulator === 'not stated' && j.open.length >= 4 && j.open.every(q => /\?$/.test(q)), 'the jurisdiction is not stated, with the questions a person answers');
  const cpack = JSON.parse(readFileSync('candidate-sets/core-banking-candidate-pack.json', 'utf8')), cids = new Set(cpack.entries.map(e => e.id));
  assert.ok(R.flatMap(r => r.relatedCandidates || []).every(id => cids.has(id)), 'each related candidate is an entry of the round\'s first candidate pack');
  // Product categories: what each holds and the facts an evaluation needs; no fact is filled in.
  for (const r of R.filter(r => r.kind === 'product-category')) assert.ok(r.technologyCategory === 'application-platform' && r.facts.length === 0 && r.factsNeeded.length >= 5 && r.passage === null && domainShape(r.claim) === 'product', r.id + ': facts needed, none invented');
  // No runtime module reads the pack.
  const runtime = [...readdirSync('public').filter(f => f.endsWith('.js')).map(f => 'public/' + f), ...readdirSync('public/lenses').map(f => 'public/lenses/' + f), ...readdirSync('shared').map(f => 'shared/' + f), ...readdirSync('.').filter(f => f.endsWith('.js'))];
  assert.deepEqual(runtime.filter(f => /core-banking-domain-candidates|CB-DOMAIN-CANDIDATES-1/.test(readFileSync(f, 'utf8'))), [], 'no runtime module reads the pack');
  // The import makes candidates only: a source and a claim for each held passage, authored by the importer; the rest
  // is skipped with what it needs.
  const p = imported(blank('Synthetic knowledge project')), held2 = R.filter(r => r.passage);
  assert.equal(p.created.length, held2.length); assert.equal(p.skipped.length, R.length - held2.length);
  assert.ok(p.skipped.every(s => /passage is not held/.test(s.reason)), 'a record without a held passage waits for its source');
  assert.ok(p.document.knowledge.claims.every(c => c.actor === 'knowledge-author' && !c.review && !knowledgeEligibility(p.document, c).eligible), 'every claim is a candidate: unreviewed, not eligible');
  assert.equal(p.document.knowledge.releases.length, 0); assert.deepEqual(p.document.knowledge.pins, []);
  assert.equal(importDomainCandidates(p.document, PACK, {at: AT, actor: 'knowledge-author'}).created.length, 0, 'importing again creates nothing');
  assert.throws(() => importDomainCandidates(p.document, cpack), /Choose a pack made by build-domain-candidates/, 'the import reads only this pack\'s schema');
  pass(`the candidate pack: ${R.length} records (7 decision topics, 5 compliance tactics, ${regs.length} regulation records with the jurisdiction left for a person, 6 core platform product categories with no fact filled in, 7 recovery and availability passages, 2 posting method passages), the builder's output, pending with four eyes false and production not accepted, each listed in the review pack; ${held2.length} hold their exact passage (AIW's own method text, or the SA Playbook's held text word for word with the workbook's hash, no example target), ${R.length - held2.length} name the source they need and invent none; no runtime module reads it, and the import makes unreviewed candidate claims only`);
}

// ---------------------------------------------------------------- 4. decision topics (GR-DOM-03)
{
  const PAYMENT = /\b(?:payments?|settlements?|ledgers?|customers?|bank(?:s|ing)?|card)\b/i;
  for (const topic of ['processing', 'duplicates', 'recovery', 'custom', 'posting-integrity']) for (const x of decisionPatterns({topic})) assert.ok(!PAYMENT.test(JSON.stringify(x.option)), topic + ': the option ' + x.title + ' carries no payment wording');
  assert.ok(decisionPatterns({topic: 'duplicates'}).every(x => x.option.impacts.length === 0), 'no template names a component');
  // The Bank Payment reference keeps its own seeded decisions, and a proposal for one of its alternatives is itself.
  const bank = withDecisions(createProject({name: 'Reference', template: 'bank-payment'}, 'kr-bank', AT)), adr2 = bank.decisions.records.find(d => d.id === 'ADR-002');
  assert.match(adr2.alternatives[0].title, /posting boundary/, 'the reference keeps its seeded alternative');
  assert.equal(proposedAlternative(bank, adr2, decisionPatterns(adr2)[0]).existingId, adr2.alternatives[0].id, 'and the template proposes that alternative itself');
  let p = imported(useLens(blank('Synthetic topics project'))).document;
  assert.deepEqual(decisionTopics(p), TOPICS, 'candidate topics are not offered');
  const save = (q, topic) => { const r = applyDecisionCommand(q, {type: 'decision.save', payload: {question: 'How is posting integrity kept?', topic}}, AT); return [r.document, r.document.decisions.records.find(d => d.id === r.selected)]; };
  assert.equal(save(p, 'posting-integrity')[1].topic, 'custom', 'a candidate topic cannot be chosen');
  p = release(p);
  const offered = decisionTopics(p), banking = ['approval-workflow', 'currencies', 'data-residency', 'end-of-day', 'posting-integrity', 'product-parameters', 'regulatory-reporting'];
  assert.deepEqual(offered.map(t => t[0]), [...TOPICS.slice(0, -1).map(t => t[0]), ...banking, 'custom'], 'released, the seven banking topics are offered before "Other design question"');
  const [q2, d] = save(p, 'posting-integrity');
  assert.equal(d.topic, 'posting-integrity', 'and a decision can take one');
  const t = domainTopics(q2).find(x => x.id === 'posting-integrity');
  assert.ok(t.method.startsWith('Decide which component keeps the general ledger') && t.question === 'Where is a balanced posting enforced, and how is a repeated instruction recognised?', 'with its question and method text');
  assert.equal(decisionGuidance(q2, d, null, 'work').explanation, t.method, 'the decision is guided by the topic\'s method');
  assert.ok(t.receipt.kind === 'governed-claim' && t.receipt.review.actor === 'knowledge-reviewer' && t.receipt.releaseId && t.receipt.scoring === false, 'with the claim\'s receipt: who verified it, the release, scoring false');
  // Unpinned, the topic is offered no more; the decision keeps its topic until it is saved again.
  const rid = q2.knowledge.pins[0], off = applyKnowledgeCommand(q2, {type: 'knowledge.deactivate', payload: {...REVIEW, id: rid, stamp: knowledgeStamp(q2)}}, AT, 'knowledge-author').document;
  assert.deepEqual(decisionTopics(off), TOPICS, 'a release no longer pinned offers nothing');
  pass('decision topics: the option templates of every topic are free of payment wording and name no component, while the Bank Payment reference keeps its seeded decisions; the seven banking topics (posting integrity, end of day, approval workflow, product parameters, currencies, reporting, residency) are candidates with method text, not offered and not choosable until a second person verifies and a release is pinned, then offered before "Other design question" with their question, method and receipt, guiding the decision, and withdrawn from the offer when the release is unpinned');
}

// ---------------------------------------------------------------- 5. regulation and compliance tactics (GR-DOM-05)
{
  const tacticIds = R.filter(r => r.kind === 'quality-tactic').map(r => r.id);
  let p = imported(useLens(blank('Synthetic compliance project')), tacticIds).document;
  assert.deepEqual(releasedTactics(p, 'compliance'), [], 'candidate tactics are not offered');
  p = release(p);
  const ts = releasedTactics(p, 'compliance');
  assert.deepEqual(ts.map(x => x.name).sort(), ['Evidence from the platform\'s own records', 'Obligations register', 'Regulatory parameters as dated configuration', 'Retention by rule', 'Returns reconciled to the ledger before submission'], 'released, the compliance category offers its five tactics');
  assert.ok(ts.every(x => x.quality === 'compliance' && x.receipt.review.actor === 'knowledge-reviewer'));
  assert.deepEqual(releasedTactics(p, 'privacy'), [], 'and no other category');
  // A regulation record is offered once released, with its regulator, instrument, section and effective date. The suite
  // writes a synthetic instrument: no real regulation's text is invented here.
  const body = 'Synthetic Banking Act 2026\nSection 4. A bank keeps every customer record for six years after the account closes.\n';
  let q = applyKnowledgeCommand(blank('Synthetic regulation project'), {type: 'knowledge.source', payload: {title: 'Synthetic Banking Act 2026', body, path: 'synthetic/act.txt', revision: 'synthetic-1', license: 'Synthetic test text'}}, AT, 'knowledge-author').document;
  const sid = q.knowledge.sources.at(-1).id;
  q = applyKnowledgeCommand(q, {type: 'knowledge.claim', payload: {sourceId: sid, lineStart: 2, lineEnd: 2, subjectId: 'regulation:synthetic-act-s4', predicate: 'records a regulation', claimType: 'obligation', polarity: 'requires', statement: 'Customer records are kept for six years after the account closes.', conditions: ['Where the synthetic act applies.'], limitations: ['A synthetic record for this suite.'], tags: ['regulator:Synthetic Authority', 'instrument:Synthetic Banking Act 2026', 'section:Section 4', 'effective:1 January 2026', 'jurisdiction:Synthetic']}}, AT, 'knowledge-author').document;
  assert.deepEqual(regulationRecords(q), [], 'a candidate regulation record is not offered');
  q = release(q);
  const g = regulationRecords(q)[0];
  assert.deepEqual([g.regulator, g.instrument, g.section, g.effective, g.jurisdiction], ['Synthetic Authority', 'Synthetic Banking Act 2026', 'Section 4', '1 January 2026', 'Synthetic'], 'released, the record reads its regulator, instrument, section and effective date');
  pass('regulation and compliance: the twelve regulation records are candidates with their regulator, instrument, section and effective date and no passage; the five compliance tactics are offered for the compliance category, with their receipts, only once released, and for no other category; a released regulation claim is read as a record with its regulator, instrument, section and effective date');
}

// ---------------------------------------------------------------- 6. product facts (GR-DOM-04)
{
  const body = 'Synthetic Platform 9 user guide\nThe platform keeps its own general ledger and posts every financial event to it in real time.\n';
  let p = applyKnowledgeCommand(blank('Synthetic product project'), {type: 'knowledge.source', payload: {title: 'Synthetic Platform 9 user guide', body, path: 'synthetic/guide.txt', revision: 'synthetic-9', license: 'Synthetic test text'}}, AT, 'knowledge-author').document;
  const sid = p.knowledge.sources.at(-1).id, shape = byId('CBK-PRD-CORE-BANKING-PLATFORM').claim;
  p = applyKnowledgeCommand(p, {type: 'knowledge.claim', payload: {sourceId: sid, lineStart: 2, lineEnd: 2, subjectId: 'product:Synthetic Platform', predicate: shape.predicate, claimType: shape.claimType, polarity: 'neutral', statement: 'Synthetic Platform 9 keeps its own general ledger.', conditions: ['Version 9.'], limitations: ['A synthetic fact for this suite.'], tags: ['technology:application-platform', 'category:core-banking-platform', 'version:9']}}, AT, 'knowledge-author').document;
  assert.deepEqual(productFacts(p, 'application-platform'), [], 'a candidate product fact is not offered');
  p = release(p);
  const f = productFacts(p, 'application-platform');
  assert.deepEqual(f.map(x => [x.product, x.version, x.statement]), [['Synthetic Platform', '9', 'Synthetic Platform 9 keeps its own general ledger.']], 'released, the fact is offered for its category');
  assert.deepEqual(productFacts(p, 'transactional'), [], 'and for no other');
  // The application-platform category: a packaged platform is one capability, weighed in Chapter 7 as one option
  // against building what it provides.
  assert.deepEqual(PLATFORM_CATEGORIES, [['application-platform', 'Application platform']]);
  assert.ok(TECHNOLOGY_CATEGORIES.some(c => c[0] === 'application-platform') && categoryName('application-platform') === 'Application platform');
  assert.equal(familyOf('application-platform'), 'platform', 'the platform view places it in its own family');
  const bank = createProject({name: 'Reference', template: 'bank-payment'}, 'kr-bank-platform', AT);
  assert.ok(!bank.technology.capabilities.some(c => c.category === 'application-platform'), 'the Bank Payment reference seeds none');
  let q = blank('Synthetic platform project'), r = applyTechnologyCommand(q, {type: 'technology.capability', payload: {title: 'Core banking platform', category: 'application-platform', purpose: 'Provides accounts, deposits, loans and the general ledger as one packaged product.', owner: 'Application architecture'}}, AT);
  q = r.document; const capId = r.selected;
  assert.equal(capability(q, capId).category, 'application-platform', 'a capability of the category saves');
  assert.ok(technologyFindings(q).some(f => f.code === 'platform-scope' && f.objectId === capId), 'without the components it provides, it is asked to name them');
  q = applyTechnologyCommand(q, {type: 'technology.capability', payload: {id: capId, boundary: 'Provides the deposit, loan, customer and general ledger components; channels and payments stay outside.'}}, AT).document;
  assert.ok(!technologyFindings(q).some(f => f.code === 'platform-scope'), 'naming them answers it');
  r = applyTechnologyRealisationCommand(q, {type: 'techrealisation.plan', payload: {title: 'Core banking platform realization', purpose: 'Choose how the core banking components are provided.', owner: 'Application architecture', mappings: [{capabilityId: capId, scope: 'Every component the platform provides.'}]}}, AT);
  q = r.document; const trId = r.selected;
  q = applyTechnologyRealisationCommand(q, {type: 'techrealisation.option', payload: {id: trId, option: {title: 'Packaged core banking platform', product: 'Synthetic Platform', version: '9', operatingModel: 'Provider managed', benefits: 'Every component the capability names, configured rather than built.', drawbacks: 'Its release calendar and data model are the vendor\'s.'}}}, AT).document;
  q = applyTechnologyRealisationCommand(q, {type: 'techrealisation.option', payload: {id: trId, option: {title: 'Build the core banking components', product: 'In-house services', operatingModel: 'Self managed', benefits: 'Exactly what the design needs.', drawbacks: 'The full cost of writing, running and securing it.'}}}, AT).document;
  const tr = q.technologyRealisation.records.find(x => x.id === trId);
  assert.deepEqual(tr.options.map(o => o.title), ['Packaged core banking platform', 'Build the core banking components'], 'the packaged platform is weighed as one option against building what it provides');
  assert.deepEqual(realizationCriteria(q, trId).map(c => c.id).slice(-4), ['operations', 'recovery', 'lifecycle', 'cost'], 'on the realization\'s criteria');
  pass('product facts and application platforms: a fact about a product is a claim on the vendor\'s passage in the product shape, per technology category; the six core platform categories say which facts an evaluation needs; a fact is offered for its category only once released; the application-platform category (its own platform family, never seeded for the reference) holds a packaged platform as one capability that names the components it provides, and Chapter 7 weighs it as one option against building them');
}

// ---------------------------------------------------------------- 7. recovery and availability passages (GR-DOM-07)
{
  const ids = R.filter(r => r.kind === 'playbook-passage').map(r => r.id), Q = 'how do we test failover and disaster recovery drills and measure recovery times';
  let p = imported(useLens(blank('Synthetic recovery project')), ids).document;
  const before = brainSources(p, ask(p, Q)).filter(s => s.kind === 'governed-claim');
  assert.deepEqual(before, [], 'candidate passages are never cited');
  p = release(p);
  const cited = brainSources(p, ask(p, Q)).filter(s => s.kind === 'governed-claim');
  assert.ok(cited.some(s => s.receipt.subjectId === 'method:sa-playbook-availability-testing'), 'released, the testing passage is cited for a recovery question');
  assert.ok(cited.every(s => s.receipt.scoring === false && s.receipt.review.actor === 'knowledge-reviewer' && JSON.parse(s.excerpt).sourcePassage.length > 0), 'each with its exact passage, its reviewer and scoring false');
  pass('recovery and availability: seven passages from the held SA Playbook (definition, importance, the measures including RTO and RPO, the design decisions, testing, risks and trade-offs) are candidate citable passages with their locators and hashes; they are never cited as candidates, and once released a recovery question cites them with their exact passage and reviewer');
}

// ---------------------------------------------------------------- 8. the posting method (GR-DOM-08)
{
  const ids = R.filter(r => r.kind === 'method').map(r => r.id);
  for (const id of ids) { const r = byId(id); assert.equal(r.coreModel, 'internal'); assert.match(r.lineage, /Bank Payment reference/); assert.ok(!/external|core banking authority|core connector/i.test(r.passage.text), id + ': the core is not modelled as external'); }
  assert.match(byId('CBK-MTH-IDEMPOTENT-POSTING-BOUNDARY').passage.text, /^The core ledger is part of the system under design/);
  let p = imported(useLens(blank('Synthetic posting project')), ids).document;
  const Q = 'how should posting work when an instruction is retried';
  assert.deepEqual(brainSources(p, ask(p, Q)).filter(s => s.kind === 'governed-claim'), [], 'candidate method passages are never cited');
  p = release(p);
  const cited = brainSources(p, ask(p, Q)).filter(s => s.kind === 'governed-claim').map(s => s.receipt.subjectId).sort();
  assert.deepEqual(cited, ['method:enquire-before-retry', 'method:idempotent-posting-boundary'], 'released, a posting question cites both method passages');
  pass('the posting method: the idempotent posting boundary and enquire-before-retry are candidate method passages, lifted from the Bank Payment reference\'s decisions and written with the core ledger inside the system under design; never cited as candidates, and cited by a posting question in any project once released');
}

// ---------------------------------------------------------------- 9. candidates move no score, constraint or conformance result
{
  // Read on AIW's own Bank Payment reference with the lens chosen (records every chapter's commands made), and on a
  // banking project: every candidate of the pack kept as a candidate claim, as a person could, moves nothing.
  const reference = useLens(createProject({name: 'Reference', template: 'bank-payment'}, 'kr-reference', AT)), briefOnly = useLens(createProject({name: 'Synthetic core banking brief', template: 'blank', brief: 'A bank replaces its core banking platform: general ledger postings, end of day, interest, several currencies and regulatory returns.'}, 'kr-brief', AT));
  const QS = ['how should posting work', 'currency exchange and revaluation', 'customer data residency', 'end of day batch window', 'test failover and recovery'];
  function fingerprint(p, draftFrom) {
    const TM = tradeoffModel(p);
    return {
      scores: {decisions: TM.decisions.map(x => ({id: x.id, tally: x.tally, lead: x.lead})), styles: TM.styleRows.map(s => ({id: s.style.id, marks: s.marks})), sensitivity: [...TM.sens]},
      // Round 25 (D-25-02): the whole decision reading: the order, the lead and how firmly it holds, dominance, what a hard
      // constraint rules out, the unstated effects' bounds and the sensitivity points.
      reading: (p.decisions?.records || []).map(d => { const r = readDecision(p, d); return {id: d.id, state: r.state, order: r.order, lead: r.lead, tied: r.tied, firmness: r.firmness, dominated: [...r.dominated], ruledOut: r.ruledOut, unknowns: r.unknowns, sensitivity: r.sensitivity, rows: r.rows.map(x => [x.id, x.score, x.low, x.high, x.rank])}; }),
      suggested: (p.decisions?.records || []).map(d => suggestEffects(p, d).cells),
      constraints: inheritedFindings(p).map(f => [f.id, f.level, f.chapter]),
      conformance: {chapters: Array.from({length: 11}, (_, i) => chapterChecks(p, i + 1).passages.map(x => [x.id, x.status, x.fix.map(f => f.id), x.confirm.map(f => f.id)])), ars: arsGate(p).items.map(i => i.id), antiPatterns: detectAntiPatterns(reasoningFor(p)).map(a => [a.id, a.objects.map(o => o.id)])},
      drafted: draftJourney(draftFrom, {at: AT}).chapters.map(c => ({chapter: c.chapter, records: c.records, gaps: c.gaps, citations: c.citations})),
      brain: QS.map(query => { const b = architectureBrain(p, brainContext(p, {chapter: 3, id: 'project'}), {query, limit: 6}); return {claims: b.claims.map(h => h.claim.id), concepts: b.concepts.map(h => h.record.id), methods: b.methods.map(h => h.method.id), tradeoffs: b.tradeoffs.map(h => h.tradeoff.id), cited: brainSources(p, b).map(s => s.id)}; }),
      offered: {topics: decisionTopics(p), tactics: releasedTactics(p, 'compliance').length, products: productFacts(p).length, regulations: regulationRecords(p).length},
      lens: lensReport(p)
    };
  }
  const keep = p => imported(p).document, kept = keep(reference), keptBrief = keep(briefOnly);
  assert.equal(kept.knowledge.claims.length, R.filter(r => r.passage).length, 'every candidate with a held passage is kept as a candidate claim');
  const F0 = fingerprint(reference, briefOnly), F1 = fingerprint(kept, keptBrief);
  assert.ok(F0.scores.decisions.length >= 1 && F0.conformance.chapters.every(x => x.length) && F0.drafted.length === 11, 'the fingerprint reads scores, every chapter\'s checks and the eleven drafted chapters');
  for (const k of Object.keys(F0)) assert.deepEqual(F1[k], F0[k], k + ' is unchanged by the candidates');
  // Released, the knowledge informs the reading (topics offered, claims retrieved and cited) and still moves no score,
  // hard constraint or conformance result: knowledge never scores.
  const F2 = fingerprint(release(kept), release(keptBrief));
  for (const k of ['scores', 'constraints', 'conformance', 'reading']) assert.deepEqual(F2[k], F0[k], k + ' is unchanged even once released');
  assert.ok(F2.offered.topics.length > F0.offered.topics.length && F2.offered.tactics === 5 && F2.brain.some(b => b.cited.some(id => id.startsWith('claim:'))), 'released, the topics are offered and claims are cited');
  pass(`candidates move nothing: the ${kept.knowledge.claims.length} candidates of the pack kept as unreviewed claims on the Bank Payment reference with the lens and on a banking brief leave the scores (trade-off tallies, style marks, sensitivity), every hard constraint, every conformance result (eleven chapters' checks, the requirements gate, the anti-pattern scan), the drafted records, the Brain's retrieval and citations, what is offered and the lens reading exactly as they were; released, they inform topics and citations and still move no score, constraint or conformance result`);
}

// ---------------------------------------------------------------- 10. an organisation-level pack, pinned per project (GR-DOM-09)
{
  const dir = await mkdtemp(tmpdir() + '/aiw-knowledge-retrieval-'), env = {DB: localDatabase(dir + '/test.sqlite'), FILES: localFiles(dir + '/files'), ASSETS: {fetch: () => new Response('ok')}};
  async function api(path, raw, actor) { const response = await worker.fetch(new Request('https://aiw.test' + path, {headers: {'oai-authenticated-user-id': actor, Origin: 'https://aiw.test', ...(raw ? {'Content-Type': 'application/json'} : {})}, ...(raw ? {method: 'POST', body: JSON.stringify(raw)} : {})}), env); let data = null; try { data = await response.json(); } catch { data = null; } return {status: response.status, data}; }
  const stored = async (actor, id) => { const row = await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(actor, id).first(); return {row, ...(await readStoredProject(env, actor, row.document))}; };
  const store = async (actor, s, doc) => { const r = await saveStoredProject(env, actor, doc.id, doc, s.row.revision, AT, s.keys); assert.ok(r.meta.changes, 'saved'); };
  const ADMIN = 'kn-admin', EDITOR = 'kn-editor', READER = 'kn-reader', STRANGER = 'kn-stranger';
  try {
    const org = await api('/api/organizations?action=create', {title: 'Synthetic banking guild', purpose: 'Banking knowledge shared by its projects'}, ADMIN); assert.equal(org.status, 201);
    const lib = '/api/organizations?organization=' + org.data.id + '&action=';
    assert.equal((await api(lib + 'members', {actorId: EDITOR, role: 'editor'}, ADMIN)).status, 200);
    assert.equal((await api(lib + 'members', {actorId: READER, role: 'reader'}, ADMIN)).status, 200);
    // The knowledge project: the administrator's own, where the candidates are imported, a second person verifies each
    // claim and the release is activated (synthetic accounts; nothing in the repository is released).
    const kpId = (await api('/api/project', null, ADMIN)).data.document.id, ks = await stored(ADMIN, kpId);
    const kp = release(imported(ks.document).document, {author: ADMIN, reviewer: 'kn-reviewer'}), krel = kp.knowledge.releases.at(-1);
    await store(ADMIN, ks, kp);
    const PUBLISH = {releaseId: krel.id, title: 'Banking domain knowledge 1', reason: 'One release for every banking project of the organisation.', reviewed: true};
    assert.equal((await api(lib + 'knowledge', PUBLISH, EDITOR)).status, 403, 'only an administrator publishes');
    assert.equal((await api(lib + 'knowledge', {...PUBLISH, reviewed: false}, ADMIN)).status, 400, 'publishing needs the publisher\'s review');
    assert.match((await api(lib + 'knowledge', {...PUBLISH, releaseId: 'KR-9999'}, ADMIN)).data.error, /Choose a release of this project/);
    const pub = await api(lib + 'knowledge', PUBLISH, ADMIN); assert.equal(pub.status, 201, JSON.stringify(pub.data));
    const OR = pub.data.release;
    assert.deepEqual([OR.claims, OR.sources, OR.from.releaseId], [krel.claims.length, krel.sourceIds.length, krel.id], 'the release\'s claims and the exact sources they rest on');
    assert.ok(/^[0-9a-f]{64}$/.test(OR.checksum) && /^[0-9a-f]{64}$/.test(OR.signature), 'checksummed and signed by the organisation');
    const listed = await api(lib + 'knowledge', null, EDITOR);
    assert.deepEqual(listed.data.releases.map(r => r.id), [OR.id], 'a member sees it');
    assert.ok(listed.data.releases[0].subjects.every(s => s.reviewer === 'Synthetic second reviewer'), 'with who verified each claim');
    assert.equal((await api(lib + 'knowledge', null, STRANGER)).status, 404, 'a stranger does not');
    assert.ok(!(await api(lib + 'releases', null, ADMIN)).data.releases.some(r => r.id === OR.id), 'the library\'s releases list library releases only');
    // The editor's project, at its per-project limits: 100 sources and 250 claims of its own.
    const epId = (await api('/api/project', null, EDITOR)).data.document.id, es = await stored(EDITOR, epId);
    let tp = es.document;
    for (let i = 1; i <= 100; i++) tp = applyKnowledgeCommand(tp, {type: 'knowledge.source', payload: {title: 'Synthetic source ' + i, body: 'Synthetic passage ' + i + '\nIts second line.\n', path: 'synthetic/' + i + '.txt', revision: '1'}}, AT, EDITOR).document;
    for (let i = 1; i <= 250; i++) tp = applyKnowledgeCommand(tp, {type: 'knowledge.claim', payload: {sourceId: tp.knowledge.sources[(i - 1) % 100].id, lineStart: 1, lineEnd: 1, subjectId: 'synthetic:' + i, predicate: 'describes', claimType: 'definition', statement: 'Synthetic claim ' + i}}, AT, EDITOR).document;
    const moreSource = q => applyKnowledgeCommand(q, {type: 'knowledge.source', payload: {title: 'One more', body: 'One more\n', path: 'synthetic/more.txt', revision: '1'}}, AT, EDITOR);
    const moreClaim = q => applyKnowledgeCommand(q, {type: 'knowledge.claim', payload: {sourceId: q.knowledge.sources[0].id, lineStart: 1, lineEnd: 1, subjectId: 'synthetic:more', predicate: 'describes', claimType: 'definition', statement: 'One more'}}, AT, EDITOR);
    assert.throws(() => moreSource(tp), /source revision limit/); assert.throws(() => moreClaim(tp), /claim limit/);
    await store(EDITOR, es, tp);
    // Pinning: a reader may not; the editor reviews it for the project and pins it.
    let state = (await api('/api/project', null, EDITOR)).data;
    const PIN = {releaseId: OR.id, revision: state.revision, reviewed: true, reason: 'This project designs a core-banking platform.', reviewer: 'Synthetic project reviewer'};
    assert.equal((await api(lib + 'knowledge-pin', PIN, READER)).status, 403, 'a reader cannot pin');
    assert.equal((await api(lib + 'knowledge-pin', {...PIN, reviewed: false}, EDITOR)).status, 400, 'pinning needs the person\'s review');
    assert.equal((await api(lib + 'knowledge-pin', {...PIN, revision: state.revision - 1}, EDITOR)).status, 409, 'a stale revision is refused');
    assert.equal((await api(lib + 'install', {releaseId: OR.id, revision: state.revision, reviewed: true}, EDITOR)).status, 400, 'a knowledge release is not a library install');
    const pinned = await api(lib + 'knowledge-pin', PIN, EDITOR); assert.equal(pinned.status, 200, JSON.stringify(pinned.data));
    state = (await api('/api/project', null, EDITOR)).data;
    let doc = state.document;
    assert.deepEqual([doc.knowledge.sources.length, doc.knowledge.claims.length], [100, 250], 'the project\'s own knowledge is as it was');
    assert.equal(organizationReleases(doc).length, 1); assert.ok(doc.knowledge.pins.includes(OR.id));
    assert.deepEqual(organizationReleases(doc)[0].assurance, {eligible: true, status: 'Verified signed release', signature: OR.signature}, 'verified against the organisation\'s signature on load');
    const orgClaims = releasedClaims(doc).filter(h => h.release.organizationId);
    assert.equal(orgClaims.length, krel.claims.length); assert.ok(orgClaims.every(h => h.eligible), 'every claim of the pinned release is eligible');
    assert.equal(domainTopics(doc).length, 7, 'and the banking topics are offered in the project');
    assert.throws(() => moreSource(doc), /source revision limit/, 'the per-project guard is kept: still 100 sources at most');
    assert.throws(() => moreClaim(doc), /claim limit/, 'and 250 claims at most');
    const cmd = await api('/api/commands', {revision: state.revision, command: {type: 'decision.save', payload: {question: 'How is posting integrity kept?', topic: 'posting-integrity'}}}, EDITOR);
    assert.equal(cmd.status, 200, JSON.stringify(cmd.data)); assert.equal(cmd.data.document.decisions.records.find(d => d.id === cmd.data.selected).topic, 'posting-integrity', 'a decision of the project takes a topic of the organisation\'s release');
    state = cmd.data;
    // A release cannot be handed to a project through the project's own commands, and a forged copy is never eligible.
    assert.equal((await api('/api/commands', {revision: state.revision, command: {type: 'knowledge.organization-pin', payload: {release: organizationReleases(doc)[0]}}}, EDITOR)).status, 400, 'no project command pins a release');
    assert.throws(() => pinOrganizationKnowledge(doc, organizationReleases(doc)[0], {reason: 'x'}), /Verify the organisation release signature/);
    const forged = structuredClone(doc); forged.knowledge.organizationReleases[0].claims[0].statement = 'A forged statement.';
    assert.ok(releasedClaims(forged).filter(h => h.release.organizationId).every(h => !h.eligible), 'a changed release no longer matches its checksum: nothing of it is eligible');
    // Membership lapses: on the next load its claims are not eligible, and say why; restored, they are again.
    assert.equal((await api(lib + 'members', {actorId: EDITOR, role: 'remove'}, ADMIN)).status, 200);
    doc = (await api('/api/project', null, EDITOR)).data.document;
    assert.ok(releasedClaims(doc).filter(h => h.release.organizationId).every(h => !h.eligible && h.reasons.some(r => /membership/.test(r))), 'a lapsed membership makes the claims ineligible, with why');
    assert.equal(domainTopics(doc).length, 0);
    assert.equal((await api(lib + 'members', {actorId: EDITOR, role: 'editor'}, ADMIN)).status, 200);
    state = (await api('/api/project', null, EDITOR)).data; doc = state.document;
    assert.equal(domainTopics(doc).length, 7, 'restored, eligible again');
    // A claim of the pinned release is withdrawn in the project by its release-qualified id, and only it.
    const target = organizationRef(OR, krel.claims[0].id), w = await api('/api/commands', {revision: state.revision, command: {type: 'knowledge.withdraw', payload: {...REVIEW, id: target, stamp: knowledgeImpactStamp(doc, target)}}}, EDITOR);
    assert.equal(w.status, 200, JSON.stringify(w.data)); doc = w.data.document; state = w.data;
    const after = releasedClaims(doc).filter(h => h.release.organizationId);
    assert.deepEqual(after.filter(h => !h.eligible).map(h => h.claim.id), [krel.claims[0].id], 'the withdrawn claim, and no other');
    assert.deepEqual([withdrawn(doc, [target]).length, withdrawn(doc, [krel.claims[0].id]).length], [1, 0], 'recorded under the release-qualified id: a project claim with the bare id would not be withdrawn');
    // Unpinned by the project's own command: nothing of it is offered.
    const off = await api('/api/commands', {revision: state.revision, command: {type: 'knowledge.deactivate', payload: {...REVIEW, id: OR.id, stamp: knowledgeStamp(doc)}}}, EDITOR);
    assert.equal(off.status, 200, JSON.stringify(off.data)); assert.equal(domainTopics(off.data.document).length, 0, 'unpinned, nothing is offered');
    // Imported into another workbench, the pinned release is a historical assertion until that workbench's
    // organisation is found to sign exactly it.
    const elsewhere = neutraliseImportedAuthority(structuredClone(state.document), AT);
    assert.equal(organizationReleases(elsewhere)[0].assurance.eligible, false);
    assert.ok(releasedClaims(elsewhere).filter(h => h.release.organizationId).every(h => !h.eligible));
    assert.ok(ORGANIZATION_KNOWLEDGE_LIMITS.claims >= 250 * 4 && ORGANIZATION_KNOWLEDGE_LIMITS.sources >= 300, 'an organisation release is sized for a domain pack');
    pass(`an organisation-level pack: an administrator publishes an active project release once for the organisation (its ${krel.claims.length} claims, each verified by a second person, and their exact sources, checksummed and signed); members see it with who verified each claim, strangers do not; an editor pins it into a project already at its 100 sources and 250 claims, and its claims are eligible and its topics offered without counting against those limits, while the per-project guard still refuses a 101st source and a 251st claim; no project command can pin a release, a changed copy is never eligible, a lapsed membership makes it ineligible on the next load, a claim is withdrawn by its release-qualified id alone, unpinning offers nothing, and an imported copy is not verified until its organisation signs it there`);
  } finally { env.DB.close(); await rm(dir, {recursive: true, force: true}); }
}

// ---------------------------------------------------------------- 11. design concerns tied to qualities (round 25, K2)
// A design concern whose criteria name a quality category and a driver kind, with each option's consequences and the
// evidence it needs (D-25-10): as a candidate it offers nothing; released it is offered; either way no reading, no
// suggestion, no hard constraint and no check of the Bank Payment reference moves until a person applies its comparison.
{
  const reference = withFinalReview(createProject({name: 'Reference', template: 'bank-payment'}, 'kr-k2', AT));
  let p = applyKnowledgeCommand(reference, {type: 'knowledge.source', payload: {title: 'Synthetic settlement note', body: 'Synthetic settlement note\nCompare settling in the request with settling after a durable handoff.\n', path: 'synthetic/settlement.txt', revision: '1', license: 'Synthetic test text'}}, AT, 'knowledge-author').document;
  p = applyKnowledgeCommand(p, {type: 'knowledge.claim', payload: {sourceId: p.knowledge.sources.at(-1).id, lineStart: 2, lineEnd: 2, subjectId: 'design-concern:settlement-timing', predicate: 'offers a design concern', claimType: 'applicability', polarity: 'neutral', statement: 'Compare settling in the request with settling after a durable handoff.', conditions: ['For a synthetic settlement path.'], limitations: ['No measured claim.'], tags: ['title:Settlement timing', 'question:When should settlement complete?', 'criterion:uptime|Availability|What happens while the settlement service is down?|availability|quality', 'criterion:run|Operations|Who runs the recovery?||operational', 'option:now|Settle in the request|The caller waits for settlement.|A timeout test under load.', 'option:later|Settle after handoff|A pending state and reconciliation are needed.|A reconciliation exercise.', 'consequence:now|uptime|An outage reaches the caller.', 'consequence:later|uptime|Intake continues while settlement is down.']}}, AT, 'knowledge-author').document;
  const read = q => ({reading: q.decisions.records.map(d => { const r = readDecision(q, d); return {id: d.id, state: r.state, order: r.order, lead: r.lead, tied: r.tied, firmness: r.firmness, unknowns: r.unknowns, rows: r.rows.map(x => [x.id, x.score, x.low, x.high, x.rank])}; }), suggested: q.decisions.records.map(d => suggestEffects(q, d).cells), constraints: inheritedFindings(q).map(f => [f.id, f.level, f.chapter]), checks: [2, 3].map(n => chapterChecks(q, n).passages.map(x => [x.id, x.status]))});
  const F0 = read(reference);
  assert.ok(F0.reading.length >= 1, 'the reference reads its decisions');
  assert.deepEqual(releasedDesignConcerns(p), [], 'a candidate concern with the K2 shapes offers nothing');
  assert.deepEqual(read(p), F0, 'and moves nothing');
  const released = release(p);
  const concern = releasedDesignConcerns(released)[0];
  assert.deepEqual([concern?.id, concern?.criteria.map(c => [c.category, c.kind])], ['settlement-timing', [['availability', 'quality'], ['', 'operational']]], 'released, it is offered with what its criteria are tied to');
  assert.deepEqual(read(released), F0, 'and still moves no reading, suggestion, constraint or check');
  pass('K2 design concerns: a concern whose criteria name a quality category and a driver kind, with consequences and the evidence each option needs, offers nothing as a candidate; released it is offered, and neither moves a decision reading, a suggestion, a hard constraint or a chapter check of the Bank Payment reference until a person applies its comparison');
}

console.log(JSON.stringify({suite: 'Domain knowledge at depth', passed: checks.length, checks}, null, 2));
