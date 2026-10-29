// The domain lens and the candidate core-banking knowledge pack (round 12, workstream C; audit/round12/DESIGN.md D-14).
// Synthetic projects only: every record here is written for this suite; no client document is read.
//  1. The framework and the core-banking lens: seventeen concerns, each with its cues, required facets, questions and
//     coverage rule, in plain words.
//  2. Detection per concern: a design covering every required facet reads addressed; one facet, partly, with the
//     questions for the rest; a requirement alone, not addressed, naming the requirement; nothing, not addressed.
//  3. Not applicable is the person's choice, with a reason, and the concern applies again the same way.
//  4. Determinism: the same reading twice, on a copy, and with every list in the other order.
//  5. Nothing is written without the person's command: the readers leave a frozen project as it was, the suggestion
//     sets nothing, and the commands change the setting alone and refuse what they must.
//  6. Chapter 11: no passage without a lens; with one, "Domain lens · core banking" after the performance
//     specification, items to confirm and nothing to fix; the companion reading.
//  7. The governed commands through the Worker: the role, the revision, who and when.
//  8. The candidate pack: its shape and pending status, its sources, nothing reads it, the import refuses it, and kept
//     as candidate knowledge it moves no score, constraint, conformance result, draft or retrieval.
// Run: npm run test:domain-lens
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {createProject} from './shared/projects-domain.js';
import {LENSES, lensById, lensRecords, lensReport, lensSuggestion, lensPassage, lensCompanion, lensSetting, applyLensCommand, LENS_COMMANDS, LENS_STATES, LENS_RULE} from './public/domain-lens.js';
import {CORE_BANKING} from './public/lenses/core-banking.js';
import {chapterChecks, sddBoard, sddContributionHTML, sddReadiness} from './public/readiness-model.js';
import {inheritedFindings} from './public/review-domain.js';
import {arsGate} from './public/ars-document.js';
import {detectAntiPatterns, reasoningFor} from './public/design-spec.js';
import {tradeoffSource} from './public/tradeoff-model.js';
import {draftJourney} from './shared/journey-drafter.js';
import {architectureBrain, brainSources} from './public/architecture-brain.js';
import {brainContext} from './public/aiw-brain.js';
import {applyKnowledgeCommand, releasedClaims, knowledgeEligibility} from './public/knowledge-governance.js';
import {importCandidateSet} from './scripts/import-candidate-set.mjs';

const checks = [], pass = name => checks.push(name);
const AT = '2026-10-07T09:00:00.000Z', ACTOR = 'lens-architect';
const EM_DASH = /\u2014/;
const BRIEF = 'A retail bank replaces its core banking platform. The new platform keeps the general ledger, opens customer accounts after KYC checks, accrues interest daily and charges fees, holds accounts in several currencies, screens payments against sanctions lists, runs end of day each night, and produces regulatory returns for the central bank.';

// A blank project and records placed straight into its chapters, in the fields each chapter keeps.
let made = 0;
const blank = (brief = '') => createProject({name: 'Synthetic core banking ' + (++made), template: 'blank', brief}, 'syn-' + made, AT);
const LISTS = {requirement: p => p.artefacts, constraint: p => p.artefacts, driver: p => p.quality.drivers, decision: p => p.decisions.records, responsibility: p => p.logical.responsibilities, component: p => p.realisation.components, capability: p => p.technology.capabilities, realisation: p => p.technologyRealisation.records, contract: p => p.interfaces.contracts, data: p => p.interfaces.data, party: p => p.interfaces.parties, threat: p => p.security.threats, control: p => p.security.controls, environment: p => p.runtime.environments, zone: p => p.runtime.zones, plan: p => p.runtime.plans, plateau: p => p.roadmap.plateaus, action: p => p.finalReview.actions};
const PREFIX = {requirement: 'REQ', constraint: 'CON', driver: 'QD', decision: 'ADR', responsibility: 'LR', component: 'APP', capability: 'TC', realisation: 'TR', contract: 'IF', data: 'DAT', party: 'EXT', threat: 'THR', control: 'SEC', environment: 'ENV', zone: 'ZON', plan: 'RUN', plateau: 'PLT', action: 'ACT'};
function withRecords(records, p = blank()) {
  const n = {};
  for (const [kind, fields] of records) {
    n[kind] = (n[kind] || 0) + 1;
    const id = PREFIX[kind] + '-' + String(n[kind]).padStart(3, '0');
    const r = {id, ref: id, ...fields};
    if (kind === 'requirement' || kind === 'constraint') r.type = kind;
    LISTS[kind](p).push(r);
  }
  return p;
}
const choose = (p, reason = 'This synthetic project is a core-banking platform.') => applyLensCommand(p, {type: 'lens.choose', payload: {lensId: 'core-banking', reason}}, AT, ACTOR).document;
const concernOf = (p, id) => lensReport(p).concerns.find(c => c.id === id);
// The records above are shaped for the lens alone. Where every chapter's checks run, the suite reads AIW's own
// reference project, whose records the chapters' commands made (an AIW-authored teaching example, not client text).
const reference = createProject({name: 'Reference', template: 'bank-payment'}, 'reference', AT), referenceLens = choose(reference);

// The fixtures, one set per concern, in AIW's own words: `full` covers every required facet, `part` the first one only,
// `ask` is a requirement with no design.
const FIX = {
  posting: {
    full: [['component', {title: 'General ledger service', purpose: 'Keeps the general ledger. Every posting holds debit and credit entries, and the debits must equal the credits per currency before commit. Each posting carries a unique posting reference. Entries that cannot be applied go to a suspense account. A posted entry is corrected only by a reversal.'}]],
    part: [['component', {title: 'Ledger store', purpose: 'Keeps the general ledger with double-entry postings.'}]],
    ask: [['requirement', {title: 'Post every transaction to the general ledger', description: 'Every transaction is posted to the general ledger.'}]]},
  eod: {
    full: [['plan', {title: 'End-of-day batch', runbook: 'The end-of-day batch window runs from 22:00 to 02:00. The cut-off for postings is 21:30, then the business date rolls. The job chain runs in a fixed order: accruals, charges, statements. A failed step restarts from its checkpoint.'}]],
    part: [['decision', {question: 'How long is the end-of-day batch window?', context: 'The batch window opens after close of business.'}]],
    ask: [['requirement', {title: 'Run end of day every business day', description: 'End-of-day processing runs every business day.'}]]},
  interest: {
    full: [['component', {title: 'Interest and charges engine', purpose: 'Accrues interest daily on the actual/365 day-count basis and calculates charges and fees from the tariff.'}]],
    part: [['responsibility', {title: 'Accrue interest', purpose: 'Accrue interest on deposit accounts.'}]],
    ask: [['requirement', {title: 'Charge a monthly maintenance fee', description: 'A maintenance fee is charged every month.'}]]},
  fx: {
    full: [['data', {title: 'Ledger entry', purpose: 'One side of a posting.', fields: [{id: 'DF-1', name: 'amount', type: 'number'}, {id: 'DF-2', name: 'currencyCode', type: 'string'}]}], ['component', {title: 'FX service', purpose: 'Takes exchange rates from the treasury rate feed and revalues foreign-currency balances at month end.'}]],
    part: [['data', {title: 'Ledger entry', purpose: 'One side of a posting.', fields: [{id: 'DF-1', name: 'amount', type: 'number'}, {id: 'DF-2', name: 'currencyCode', type: 'string'}]}]],
    ask: [['requirement', {title: 'Hold accounts in several currencies', description: 'Customers hold accounts in several currencies.'}]]},
  kyc: {
    full: [['component', {title: 'Customer onboarding', purpose: 'Opens new customer accounts after identity verification against the national identity registry, and a customer risk rating with enhanced due diligence for high risks.'}]],
    part: [['component', {title: 'Account opening', purpose: 'Opens accounts for new customers.'}]],
    ask: [['requirement', {title: 'Verify the identity of every new customer', description: 'The identity of every new customer is verified.'}]]},
  aml: {
    full: [['component', {title: 'Financial crime service', purpose: 'Screens customers and payments against sanctions lists and watch lists, runs transaction monitoring rules for suspicious activity, and files suspicious transaction reports to the financial intelligence unit.'}]],
    part: [['control', {title: 'Sanctions screening', purpose: 'Screens payment parties against the sanctions list before release.'}]],
    ask: [['requirement', {title: 'Monitor transactions for money laundering', description: 'Transactions are monitored for money laundering.'}]]},
  reporting: {
    full: [['component', {title: 'Regulatory reporting', purpose: 'Produces the monthly prudential returns for the central bank from a reporting data mart reconciled to the general ledger.'}]],
    part: [['decision', {question: 'Which regulatory returns are produced?', context: 'Statutory returns go to the central bank each month.'}]],
    ask: [['requirement', {title: 'Submit regulatory returns to the central bank', description: 'Regulatory returns are submitted to the central bank.'}]]},
  'maker-checker': {
    full: [['control', {title: 'Maker-checker on postings', purpose: 'A second approver authorises every manual posting. Segregation of duties: a user cannot enter and approve the same posting.'}]],
    part: [['control', {title: 'Approval queue', purpose: 'Manual postings wait in an approval queue.'}]],
    ask: [['requirement', {title: 'Large transactions need approval', description: 'Transactions above the limit need approval.'}]]},
  audit: {
    full: [['component', {title: 'Audit service', purpose: 'Keeps an append-only audit trail of every change, with the before and after values.'}]],
    part: [['component', {title: 'Audit log', purpose: 'Writes an audit log of user actions.'}]],
    ask: [['requirement', {title: 'Keep the history of changes to customer records', description: 'The history of changes to customer records is kept.'}]]},
  'product-config': {
    full: [['component', {title: 'Product factory', purpose: 'Defines products and their parameters; each parameter change carries an effective date.'}]],
    part: [['component', {title: 'Product catalogue', purpose: 'Lists the product definitions.'}]],
    ask: [['requirement', {title: 'Configure new savings products', description: 'New savings products are configured by the business.'}]]},
  'value-dating': {
    full: [['data', {title: 'Posting', purpose: 'Each posting carries a booking date and a value date. Backdating is allowed only within 5 days and needs approval.', fields: []}]],
    part: [['data', {title: 'Posting dates', purpose: 'Each posting carries a value date.', fields: []}]],
    ask: [['requirement', {title: 'Allow backdated transactions', description: 'Some transactions are backdated.'}]]},
  payments: {
    full: [['contract', {title: 'Switch transfer', kind: 'request', purpose: 'Sends interbank transfers to the payment switch.', idempotencyKey: 'endToEndReference', timeoutPolicy: 'On a timeout, send a status enquiry before any retry.'}]],
    part: [['contract', {title: 'Switch transfer', kind: 'request', purpose: 'Sends transfers to the payment switch.'}]],
    ask: [['requirement', {title: 'Send interbank payments', description: 'Customers send interbank payments.'}]]},
  channels: {
    full: [['component', {title: 'Channel API layer', purpose: 'One API gateway serves mobile banking and internet banking, with multi-factor authentication and session timeouts.'}]],
    part: [['component', {title: 'Mobile banking app', purpose: 'The mobile banking channel for customers.'}]],
    ask: [['requirement', {title: 'Customers use mobile banking', description: 'Customers use mobile banking.'}]]},
  availability: {
    full: [['driver', {title: 'Stay available', category: 'availability', metric: 'Availability', operator: 'At least', targetValue: '99.95', unit: '%'}], ['plan', {title: 'Ledger runtime', recoveryPlan: 'Fail over to the standby site.', recoveryMinutes: '30', lossMinutes: '5', minReady: 2}]],
    part: [['plan', {title: 'Ledger runtime', recoveryPlan: 'Restore from the nightly copy.'}]],
    ask: [['requirement', {title: 'The platform is available at all hours', description: 'The platform must be available 24/7.'}]]},
  privacy: {
    full: [['data', {title: 'Customer', purpose: 'Holds personal data of customers, stored only in-country, encrypted at rest.', classification: 'Restricted', fields: []}]],
    part: [['data', {title: 'Customer', purpose: 'The customer profile.', classification: 'Confidential', fields: []}]],
    ask: [['requirement', {title: 'Protect personal data', description: 'Personal data is protected under the data protection law.'}]]},
  migration: {
    full: [['decision', {question: 'How do we move from the legacy core?', context: 'Data migration from the legacy core runs in waves. Migrated balances are reconciled with control totals. A parallel run precedes the cut-over, with a rollback plan.'}]],
    part: [['decision', {question: 'Which data moves from the legacy core?', context: 'Data migration of customers and accounts.'}]],
    ask: [['requirement', {title: 'Move accounts from the current platform', description: 'Accounts move from the current platform.'}]]},
  operations: {
    full: [['plan', {title: 'Ledger runtime', monitoring: 'Dashboards and alerts on posting errors.', runbook: 'Runbook for failures and recovery.'}], ['control', {title: 'Daily reconciliation', purpose: 'Reconcile the ledger with the switch settlement report every day.'}]],
    part: [['control', {title: 'Daily reconciliation', purpose: 'Reconcile the nostro accounts.'}]],
    ask: [['requirement', {title: 'Reconcile accounts every day', description: 'Accounts are reconciled every day.'}]]}
};

// ---------------------------------------------------------------- 1. the framework and the lens
const IDS = ['posting', 'eod', 'interest', 'fx', 'kyc', 'aml', 'reporting', 'maker-checker', 'audit', 'product-config', 'value-dating', 'payments', 'channels', 'availability', 'privacy', 'migration', 'operations'];
assert.deepEqual(LENSES.map(l => l.id), ['core-banking']);
assert.equal(lensById('core-banking'), CORE_BANKING); assert.equal(lensById('nonsense'), null);
assert.deepEqual(CORE_BANKING.concerns.map(c => c.id), IDS, 'the seventeen concerns of the core-banking lens, in order');
assert.deepEqual(Object.keys(FIX), IDS, 'every concern has its fixtures');
assert.deepEqual(LENS_COMMANDS, ['lens.choose', 'lens.clear', 'lens.concern']);
assert.deepEqual(LENS_STATES, ['addressed', 'partly', 'not-addressed', 'not-applicable']);
const words = [CORE_BANKING.title, CORE_BANKING.ref, CORE_BANKING.summary, CORE_BANKING.noun, LENS_RULE];
for (const c of CORE_BANKING.concerns) {
  assert.ok(c.cues instanceof RegExp && !c.cues.global, c.id + ': its cues are one pattern, without state');
  assert.ok(c.title && c.why && c.lead && c.facets.length >= 2, c.id + ': a title, why it matters, a lead question and its facets');
  assert.ok(c.facets.some(f => f.required), c.id + ': at least one required facet');
  for (const f of c.facets) {
    assert.ok(f.id && f.label && /\?$/.test(f.question), c.id + '.' + f.id + ': a label and a question');
    assert.ok(f.words instanceof RegExp || Array.isArray(f.all) || typeof f.check === 'function', c.id + '.' + f.id + ': a rule');
    for (const re of [f.words, ...(f.all || [])].filter(Boolean)) assert.ok(!re.global && !re.sticky, c.id + '.' + f.id + ': patterns without state');
    words.push(f.label, f.question);
  }
  words.push(c.title, c.why, c.lead);
}
assert.ok(!words.some(w => EM_DASH.test(w)), 'the lens\'s words have no em-dash');
assert.ok(words.every(w => w.length <= 240), 'every sentence of the lens is short');
const ruleText = lensReport(choose(blank())).concerns.map(c => c.rule);
assert.ok(ruleText.every(r => /^Addressed when the design covers /.test(r)), 'each concern says its coverage rule in words');
pass('the framework offers one lens, core banking, with the seventeen concerns asked for; each has its cues, at least one required facet, a question per facet and a coverage rule said in words; no em-dash and no long sentence');

// ---------------------------------------------------------------- 2. detection per concern
const stateOf = (records, id) => concernOf(choose(withRecords(records)), id);
for (const c of CORE_BANKING.concerns) {
  const full = stateOf(FIX[c.id].full, c.id), part = stateOf(FIX[c.id].part, c.id), ask = stateOf(FIX[c.id].ask, c.id), none = concernOf(choose(blank()), c.id);
  assert.equal(full.state, 'addressed', c.id + ' full: ' + full.reason);
  assert.ok(full.records.length >= 1 && full.facets.filter(f => f.required).every(f => f.met), c.id + ' full: every required facet met by a named record');
  assert.ok(!c.facets.filter(f => f.required).some(f => full.questions.includes(f.question)), c.id + ' full: no required facet is asked about');
  assert.match(full.reason, /^Addressed by \d+ design records?: /);
  assert.equal(part.state, 'partly', c.id + ' part: ' + part.reason);
  const missing = c.facets.filter(f => f.required && !part.facets.find(x => x.id === f.id).met);
  assert.ok(missing.length >= 1 && part.questions[0] === missing[0].question, c.id + ' part: the first question is the first required facet not met');
  assert.equal(ask.state, 'not-addressed', c.id + ' ask: ' + ask.reason);
  assert.deepEqual(ask.asks.map(a => a.ref), ['REQ-001'], c.id + ' ask: the requirement that asks for it is named');
  assert.equal(ask.questions[0], c.lead, c.id + ' ask: the lead question comes first');
  assert.match(ask.reason, /^No design record addresses it yet\. 1 stated record asks for it: REQ-001\.$/);
  assert.equal(none.state, 'not-addressed'); assert.deepEqual(none.asks, []); assert.equal(none.reason, 'No design record addresses it yet.');
  assert.ok([full, part, ask, none].every(x => x.questions.length <= 4 && !x.questions.some(q => EM_DASH.test(q))));
}
// The field rules: debit and credit fields, a currency field, a classification, two ready copies, a plateau.
assert.ok(stateOf([['data', {title: 'Journal line', purpose: 'A line of a posting.', fields: [{id: 'F1', name: 'debitAccount'}, {id: 'F2', name: 'creditAccount'}]}]], 'posting').facets.find(f => f.id === 'double-entry').met, 'a data definition with debit and credit fields covers double entry');
assert.ok(stateOf([['plan', {title: 'Ledger runtime', minReady: 2}]], 'availability').facets.find(f => f.id === 'redundancy').met, 'a plan with two ready copies is a second copy');
// Round 12 (GR-DOM-14): a plan whose copies are not stated reads the redundancy facet as not stated, never met or unmet;
// one ready copy is unmet, two are met, and a standby zone is met whatever the count.
{
  const facet = fields => stateOf([['plan', {title: 'Ledger runtime', ...fields}]], 'availability').facets.find(f => f.id === 'redundancy');
  assert.deepEqual(['', undefined].map(v => [facet({minReady: v}).met, facet({minReady: v}).state]), [[false, 'not-stated'], [false, 'not-stated']], 'copies not stated: not stated, never met or unmet');
  assert.deepEqual(facet({minReady: ''}).unstated, ['RUN-001'], 'naming the plan that leaves it open');
  assert.deepEqual([facet({minReady: 1}).state, facet({minReady: 2}).state, facet({minReady: '', backupZoneId: 'zone-b'}).state], ['unmet', 'met', 'met']);
}
// Round 12 (GR-SEC-03): a recorded dual control with a maker and a different checker meets the maker-checker facets by
// its fields (the lens's words may also count the category's name, as its limits say).
{
  const mc = fields => stateOf([['control', {title: 'Payment release approval', category: 'Dual control & segregation of duties', ...fields}]], 'maker-checker').facets;
  assert.ok(['dual', 'segregation'].every(id => mc({makerRole: 'Payments officer', checkerRole: 'Payments supervisor'}).find(f => f.id === id).met), 'a dual control with two roles covers dual control and segregation');
}
assert.equal(stateOf([['plateau', {title: 'Both platforms run', kind: 'transition'}]], 'migration').state, 'partly', 'a roadmap plateau is a step of coexistence');
assert.equal(stateOf([['data', {title: 'Customer', purpose: 'The customer.', classification: 'Unclassified', fields: []}]], 'privacy').state, 'not-addressed', 'Unclassified marks nothing');
// What a design record warns of is not what it does; a stated record's words all count.
const caveat = stateOf([['realisation', {title: 'Identity product', purpose: 'Identity for staff.', options: [{id: 'TO-1', title: 'Hosted identity', drawbacks: 'User data leaves the platform; check residency.'}]}]], 'privacy');
assert.equal(caveat.facets.find(f => f.id === 'residency').met, false, 'a drawback that says "check residency" does not address residency');
assert.equal(stateOf([['component', {title: 'Payments hub', purpose: 'Routes payments.', risks: 'Sanctions screening is not designed yet.'}]], 'aml').state, 'not-addressed', 'a risk naming sanctions does not address them');
assert.equal(stateOf([['requirement', {title: 'Screen against sanctions lists', description: 'Payments are screened against sanctions lists.', acceptance: 'A listed party is held.'}]], 'aml').asks.length, 1, 'a stated record asks with all its words');
// Words that only look like a concern: load balancing is not a balanced posting, a reverse proxy is not a reversal, a
// person in charge is not a charge, transaction monitoring is not operational monitoring.
const lookalike = choose(withRecords([['component', {title: 'Posting gateway', purpose: 'A reverse proxy in front of the ledger API, load balanced across two nodes. The operations lead is in charge of it.'}], ['component', {title: 'Screening engine', purpose: 'Transaction monitoring for suspicious activity.'}]]));
const lp = concernOf(lookalike, 'posting');
assert.equal(lp.facets.find(f => f.id === 'balanced').met, false); assert.equal(lp.facets.find(f => f.id === 'reversal').met, false);
assert.equal(concernOf(lookalike, 'interest').state, 'not-addressed');
assert.equal(concernOf(lookalike, 'operations').facets.find(f => f.id === 'monitoring').met, false);
// A session time-out is not a payment's uncertain outcome; a request after go-live is not a cut-over; a replica count of
// one is not a standby.
const lookalike2 = choose(withRecords([['component', {title: 'Payments front office', purpose: 'Takes transfers from tellers, with a session time-out and transaction enquiries for customers.'}], ['responsibility', {title: 'Branch requests', purpose: 'Handles post-go-live requests from branches.'}], ['plan', {title: 'Ledger runtime', capacityBasis: 'Replica counts of 1 are the minimum the workbench requires.'}]]));
assert.equal(concernOf(lookalike2, 'payments').facets.find(f => f.id === 'uncertain').met, false);
assert.equal(concernOf(lookalike2, 'migration').state, 'not-addressed');
assert.equal(concernOf(lookalike2, 'availability').facets.find(f => f.id === 'redundancy').met, false);
// What a design record leaves open is not what it does: a question, "not stated", "no recovery site appears". It is
// named apart, as leaving the concern open. A sentence that forbids is a design statement and counts.
const openly = choose(withRecords([['environment', {title: 'Production', purpose: 'Live operation. Open question: which recovery site, recovery time and recovery point apply? No disaster-recovery site, standby or failover appears in the source.'}], ['plan', {title: 'Ledger runtime', recoveryPlan: 'Not stated yet.'}]]));
const avail = concernOf(openly, 'availability');
assert.equal(avail.state, 'not-addressed', 'a design that only leaves recovery open does not address it: ' + avail.reason);
assert.deepEqual(avail.open.map(r => r.ref), ['ENV-001', 'RUN-001'], 'the records that leave it open are named apart, in reference order');
assert.match(avail.reason, /^No design record addresses it yet\. ENV-001 and RUN-001 leave it open\.$/);
assert.ok(stateOf([['control', {title: 'Own entries', purpose: 'No user may approve their own entry; a second approver checks every manual posting.'}]], 'maker-checker').facets.every(f => !f.required || f.met), 'a sentence that forbids still counts');
const open2 = lensRecords(withRecords([['decision', {question: 'Which rate source applies?', context: 'Rates come from the treasury feed. Is a second source needed?'}]])).find(r => r.ref === 'ADR-001');
assert.ok(/treasury feed/.test(open2.text) && !/second source/.test(open2.text) && /second source/.test(open2.open), 'a record\'s questions are set apart from what it asserts');
const stated2 = lensRecords(withRecords([['requirement', {title: 'Which currencies?', description: 'Is multi-currency needed? Not stated.'}]]))[0];
assert.equal(stated2.open, '', 'a stated record keeps all its words: its question still asks');
pass('detection, for each of the seventeen concerns: every required facet covered reads addressed with its records named; one facet reads partly and asks first about the next; a requirement alone reads not addressed and names it; nothing reads not addressed; field rules count (debit and credit fields, two ready copies, a plateau, a classification); caveats, look-alike words and what a design record leaves open (questions, "not stated", "no recovery site appears") do not, and the records that leave a concern open are named apart');

// ---------------------------------------------------------------- 3. not applicable, by the person, with a reason
const all = withRecords(Object.values(FIX).flatMap(f => f.full));
const chosen = choose(all);
const na = applyLensCommand(chosen, {type: 'lens.concern', payload: {concernId: 'fx', applicable: false, reason: 'The bank holds one currency only.'}}, AT, ACTOR).document;
const fxNa = concernOf(na, 'fx');
assert.equal(fxNa.state, 'not-applicable'); assert.deepEqual(fxNa.questions, []);
assert.deepEqual(fxNa.notApplicable, {reason: 'The bank holds one currency only.', at: AT, actor: ACTOR});
assert.equal(fxNa.reason, 'Marked not applicable: The bank holds one currency only.');
assert.equal(lensReport(na).counts['not-applicable'], 1);
assert.ok(!lensPassage(na).items.some(i => i.id === 'lens:core-banking:fx'), 'a concern marked not applicable asks nothing on Validate');
const again = applyLensCommand(na, {type: 'lens.concern', payload: {concernId: 'fx', applicable: true, reason: 'A second currency is planned.'}}, AT, ACTOR).document;
assert.equal(concernOf(again, 'fx').state, 'addressed');
assert.deepEqual(lensSetting(again).history.map(h => h.action), ['choose', 'not-applicable', 'applicable'], 'every choice is kept with its reason');
assert.ok(lensSetting(again).history.every(h => h.actor === ACTOR && h.at === AT && h.reason));
pass('not applicable is the person\'s choice through lens.concern, with a reason, who and when: the concern stops being read and asks nothing, and applies again the same way; the history keeps every choice');

// ---------------------------------------------------------------- 4. determinism
const R1 = lensReport(chosen), R2 = lensReport(chosen), R3 = lensReport(structuredClone(chosen));
assert.deepEqual(R1, R2); assert.equal(JSON.stringify(R1), JSON.stringify(R3), 'a copy reads the same');
assert.equal(R1.counts.addressed, 17, 'the full fixtures together address every concern: ' + R1.text);
const reversed = structuredClone(chosen);
for (const get of Object.values(LISTS)) { const xs = get(reversed); xs.reverse(); }
reversed.artefacts.reverse();
const R4 = lensReport(reversed);
assert.deepEqual(R4.concerns.map(c => [c.id, c.state, c.records.map(r => r.ref), c.asks.map(r => r.ref), c.questions]), R1.concerns.map(c => [c.id, c.state, c.records.map(r => r.ref), c.asks.map(r => r.ref), c.questions]), 'the order of the records changes nothing');
const mixed = choose(withRecords([['component', {title: 'Ledger part 10', purpose: 'Keeps the general ledger.'}], ['component', {title: 'Ledger part 2', purpose: 'Keeps the general ledger.'}]].concat(Array.from({length: 9}, (_, i) => ['component', {title: 'Other ' + i, purpose: 'Unrelated.'}]))));
assert.deepEqual(concernOf(mixed, 'posting').records.map(r => r.ref), ['APP-001', 'APP-002'], 'records in reference order');
pass('determinism: the same reading twice, on a copy, and with every list of the project in the other order; records are listed by chapter and reference');

// ---------------------------------------------------------------- 5. nothing written without the person's command
const deepFreeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); } return o; };
const frozen = deepFreeze(structuredClone(chosen)), before = JSON.stringify(frozen);
lensRecords(frozen); lensReport(frozen); lensReport(frozen, {lensId: 'core-banking'}); lensPassage(frozen); lensCompanion(frozen); lensSuggestion(frozen);
assert.equal(JSON.stringify(frozen), before, 'the lens\'s readers leave the project as they found it');
const frozenRef = deepFreeze(structuredClone(referenceLens)), beforeRef = JSON.stringify(frozenRef);
lensReport(frozenRef); lensPassage(frozenRef); lensCompanion(frozenRef); chapterChecks(frozenRef, 11); sddContributionHTML(frozenRef, 11); sddBoard(frozenRef); sddReadiness(frozenRef);
assert.equal(JSON.stringify(frozenRef), beforeRef, 'and so do Chapter 11\'s checks, the board and the readiness line with a lens chosen');
const suggested = deepFreeze(blank(BRIEF));
const S = lensReport(suggested);
assert.equal(S.chosen, false); assert.equal(S.concerns.length, 0); assert.equal(S.suggestion.lensId, 'core-banking');
assert.ok(S.suggestion.strong && S.suggestion.concerns.length >= 5 && S.suggestion.words.length >= 3, 'the brief\'s own words are named: ' + S.suggestion.words.join(', '));
assert.equal(suggested.workspace.domainLens, undefined, 'a suggestion sets nothing');
assert.equal(lensSuggestion(blank('A city library lets members reserve books online and renew their loans; staff keep the catalogue.')), null, 'no suggestion for another domain');
assert.equal(lensSuggestion(createProject({name: 'Reference', template: 'bank-payment'}, 'ref', AT)), null, 'the payment reference is not suggested a core-banking lens');
assert.equal(lensPassage(suggested), null); assert.equal(lensCompanion(suggested), null);
assert.deepEqual(chapterChecks(suggested, 11).passages.map(x => x.id), chapterChecks(blank(BRIEF), 11).passages.map(x => x.id));
// The commands: a copy is changed, and only its setting.
const input = deepFreeze(structuredClone(all)), out = choose(input);
assert.deepEqual(Object.keys(out).filter(k => JSON.stringify(out[k]) !== JSON.stringify(input[k])), ['workspace'], 'lens.choose changes the workspace alone');
assert.deepEqual(Object.keys(out.workspace).filter(k => JSON.stringify(out.workspace[k]) !== JSON.stringify(input.workspace[k])), ['domainLens'], 'and in it the lens setting alone');
assert.deepEqual(lensSetting(out), {lensId: 'core-banking', lensVersion: 1, chosenAt: AT, chosenBy: ACTOR, reason: 'This synthetic project is a core-banking platform.', notApplicable: [], history: [{at: AT, actor: ACTOR, action: 'choose', lensId: 'core-banking', reason: 'This synthetic project is a core-banking platform.'}]});
const refuse = (p, type, payload, pattern) => assert.throws(() => applyLensCommand(p, {type, payload}, AT, ACTOR), pattern, type + ' ' + JSON.stringify(payload));
refuse(all, 'lens.choose', {lensId: 'core-banking'}, /Say why/);
refuse(all, 'lens.choose', {lensId: 'core-banking', reason: '   '}, /Say why/);
refuse(all, 'lens.choose', {lensId: 'core-banking', reason: 'x'.repeat(601)}, /within 600 characters/);
refuse(all, 'lens.choose', {lensId: 'retail-lending', reason: 'Wrong.'}, /Choose a lens this workbench offers/);
refuse(chosen, 'lens.choose', {lensId: 'core-banking', reason: 'Again.'}, /already in use/);
refuse(all, 'lens.clear', {reason: 'Nothing to clear.'}, /No lens is in use/);
refuse(all, 'lens.concern', {concernId: 'fx', applicable: false, reason: 'No lens.'}, /Choose a lens for the project first/);
refuse(chosen, 'lens.concern', {concernId: 'crypto', applicable: false, reason: 'Unknown.'}, /Choose a concern of the lens in use/);
refuse(chosen, 'lens.concern', {concernId: 'fx', applicable: 'no', reason: 'Not a boolean.'}, /with true or false/);
refuse(chosen, 'lens.concern', {concernId: 'fx', applicable: true, reason: 'It already applies.'}, /already applies/);
refuse(na, 'lens.concern', {concernId: 'fx', applicable: false, reason: 'Twice.'}, /already marked not applicable/);
refuse(chosen, 'lens.bogus', {reason: 'Unknown.'}, /Unknown lens action/);
const cleared = applyLensCommand(na, {type: 'lens.clear', payload: {reason: 'The project changed scope.'}}, AT, ACTOR).document;
assert.equal(lensSetting(cleared), null); assert.equal(lensReport(cleared).chosen, false);
assert.deepEqual(cleared.workspace.domainLens.history.map(h => h.action), ['choose', 'not-applicable', 'clear'], 'stopping keeps the history');
assert.equal(concernOf(choose(cleared), 'fx').state, 'addressed', 'choosing again starts with every concern applicable');
assert.equal(lensSetting({workspace: {domainLens: {lensId: 'retired-lens'}}}), null, 'a lens AIW no longer offers reads as no choice');
pass('nothing is written without the person\'s command: every reader (the lens, its passage, its companion, its suggestion, Chapter 11\'s checks, the board) leaves a frozen project as it was; a suggestion names the brief\'s words and sets nothing; lens.choose, lens.concern and lens.clear change the lens setting alone, keep the reason, who and when, and refuse a missing or long reason, an unknown lens or concern, a repeat and a concern without a lens');

// ---------------------------------------------------------------- 6. Chapter 11: the passage and the companion
const C0 = chapterChecks(reference, 11), C1 = chapterChecks(referenceLens, 11), RL = lensReport(referenceLens);
assert.deepEqual(C0.passages.map(x => x.id), ['ownership', 'summary', 'scope', 'approach', 'trace', 'findings', 'actions', 'specification', 'performance', 'review', 'baseline'], 'without a lens, the passages Chapter 11 had');
assert.deepEqual(C1.passages.map(x => x.id), ['ownership', 'summary', 'scope', 'approach', 'trace', 'findings', 'actions', 'specification', 'performance', 'lens', 'review', 'baseline'], 'with a lens, its passage after the performance specification');
const passage = C1.passages.find(x => x.id === 'lens');
assert.equal(passage.ref, 'Domain lens · core banking'); assert.equal(passage.title, 'the concerns a core-banking platform must address');
assert.equal(passage.fix.length, 0, 'the lens fixes nothing'); assert.equal(passage.status, 'confirm');
assert.equal(passage.confirm.length, RL.counts.partly + RL.counts['not-addressed'], 'one item to confirm per concern partly or not addressed');
assert.ok(passage.confirm.every(i => i.level === 'warning' && /^lens:core-banking:/.test(i.id) && / is (partly addressed|not addressed)$/.test(i.title) && / Ask: .+\?$/.test(i.detail)));
assert.equal(passage.url, '/?chapter=11&tab=validate#domain-lens');
assert.deepEqual([C1.toFix, C1.toConfirm, C1.passing], [C0.toFix, C0.toConfirm, C0.passing], 'it blocks nothing and counts no finding');
for (let ch = 1; ch <= 10; ch++) assert.deepEqual(chapterChecks(referenceLens, ch).passages.map(x => [x.id, x.status]), chapterChecks(reference, ch).passages.map(x => [x.id, x.status]), 'Chapter ' + ch + ' reads as it did');
assert.deepEqual(sddReadiness(referenceLens).chapters.map(c => [c.blockers, c.gaps, c.review]), sddReadiness(reference).chapters.map(c => [c.blockers, c.gaps, c.review]), 'the readiness line moves nowhere');
const html11 = sddContributionHTML(referenceLens, 11);
assert.match(html11, /data-sdd-passage="lens"[\s\S]*Domain lens · core banking[\s\S]*the concerns a core-banking platform must address[\s\S]*href="\/\?chapter=11&amp;tab=validate#domain-lens">Open the lens</);
let allNa = referenceLens;
for (const id of IDS) allNa = applyLensCommand(allNa, {type: 'lens.concern', payload: {concernId: id, applicable: false, reason: 'Synthetic: every concern set aside.'}}, AT, ACTOR).document;
assert.equal(chapterChecks(allNa, 11).passages.find(x => x.id === 'lens').status, 'pass', 'with nothing open, the passage passes');
const companion = lensCompanion(referenceLens);
assert.equal(companion.ref, 'Domain lens · core banking'); assert.deepEqual(companion.counts, RL.counts);
assert.ok(companion.asks.length === 3 && companion.asks.every(a => /\?$/.test(a.question)), 'the companion asks the first three questions');
assert.deepEqual(companion.asks.map(a => a.word), RL.concerns.filter(c => c.state !== 'addressed' && c.state !== 'not-applicable').sort((a, b) => (a.state === 'not-addressed' ? 0 : 1) - (b.state === 'not-addressed' ? 0 : 1)).slice(0, 3).map(c => c.word), 'not addressed first');
pass('Chapter 11: without a lens the eleven passages it had; with the lens, "Domain lens · core banking" after the performance specification, one item to confirm per concern partly or not addressed (each with its first question), nothing to fix, no count moved, no other chapter changed, "Open the lens" on Validate; the companion reads the counts and asks the first three questions');

// ---------------------------------------------------------------- 7. the governed commands through the Worker
const DB = localDatabase(':memory:'), objects = new Map();
const env = {DB, FILES: {async put(k, v) { objects.set(k, v); }, async get(k) { return objects.has(k) ? {text: async () => objects.get(k)} : null; }, async delete(k) { objects.delete(k); }}, ASSETS: {fetch: () => new Response('asset')}};
const OWNER = 'lens-owner';
const api = (path, method = 'GET', body, as = OWNER) => worker.fetch(new Request('https://aiw.test' + path, {method, headers: {...(as ? {'oai-authenticated-user-id': as} : {}), ...(body ? {'Content-Type': 'application/json', Origin: 'https://aiw.test'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env);
const created = await (await api('/api/projects', 'POST', {name: 'Synthetic core banking', template: 'blank', brief: BRIEF})).json();
const pid = created.document.id;
let state = await (await api('/api/project?project=' + pid)).json();
assert.equal(state.document.workspace.domainLens, undefined, 'a new project has no lens');
assert.equal(lensReport(state.document).suggestion.lensId, 'core-banking', 'it is suggested from the brief');
const command = async (type, payload, as = OWNER, revision = state.revision) => api('/api/commands?project=' + pid, 'POST', {revision, command: {type, payload}}, as);
const prior = state.document;
let r = await command('lens.choose', {lensId: 'core-banking', reason: 'The project replaces a core-banking platform.'});
assert.equal(r.status, 200, await r.clone().text()); state = await r.json();
assert.deepEqual([state.document.workspace.domainLens.lensId, state.document.workspace.domainLens.chosenBy, state.document.workspace.domainLens.reason], ['core-banking', OWNER, 'The project replaces a core-banking platform.']);
for (const key of ['artefacts', 'quality', 'decisions', 'logical', 'realisation', 'technology', 'technologyRealisation', 'interfaces', 'security', 'runtime', 'roadmap', 'finalReview', 'brief']) assert.deepEqual(state.document[key], prior[key], key + ' is untouched by the lens choice');
r = await command('lens.concern', {concernId: 'fx', applicable: false, reason: 'One currency.'}, OWNER, state.revision - 1);
assert.equal(r.status, 409, 'a stale revision is refused');
await api('/api/access?project=' + pid, 'POST', {actorId: 'lens-viewer', role: 'viewer'});
r = await command('lens.concern', {concernId: 'fx', applicable: false, reason: 'One currency.'}, 'lens-viewer');
assert.equal(r.status, 403, 'a viewer cannot change the lens');
r = await command('lens.concern', {concernId: 'fx', applicable: false, reason: 'One currency.'});
assert.equal(r.status, 200); state = await r.json();
assert.equal(concernOf(state.document, 'fx').state, 'not-applicable');
r = await command('lens.concern', {concernId: 'fx', applicable: false, reason: 'Twice.'});
assert.equal(r.status, 400); assert.match((await r.json()).error, /already marked not applicable/);
r = await command('lens.bogus', {reason: 'x'});
assert.equal(r.status, 400); assert.match((await r.json()).error, /Unknown lens action/);
r = await command('lens.clear', {reason: 'Scope changed.'});
assert.equal(r.status, 200); state = await r.json();
assert.equal(lensSetting(state.document), null); assert.deepEqual(state.document.workspace.domainLens.history.map(h => [h.action, h.actor]), [['choose', OWNER], ['not-applicable', OWNER], ['clear', OWNER]]);
DB.close?.();
pass('the governed commands through the Worker: lens.choose, lens.concern and lens.clear are saved with the account that sent them and the reason; nothing else in the design changes; a stale revision is refused (409), a viewer is refused (403), a repeat and an unknown lens action are refused (400)');

// ---------------------------------------------------------------- 8. the candidate pack
const PACK_FILE = 'candidate-sets/core-banking-candidate-pack.json', packText = readFileSync(PACK_FILE, 'utf8'), pack = JSON.parse(packText);
assert.equal(pack.schemaVersion, 'aiw-candidate-pack-v1'); assert.equal(pack.packId, 'CB-CANDIDATE-1'); assert.equal(pack.status, 'candidate');
assert.deepEqual(pack.approval, {status: 'pending', fourEyes: false, approvedBy: null, approvedAt: null, releaseId: null, decision: null}, 'pending, not approved');
assert.equal(pack.productionAccepted, false);
assert.deepEqual(pack.influence, {scoring: false, constraints: false, conformance: false, drafter: false, brain: false, lens: false});
assert.deepEqual(pack.lens, {id: 'core-banking', version: CORE_BANKING.version});
assert.ok(existsSync(pack.reviewPack) && /Status: pending\. Not approved, not released, not active\./.test(readFileSync(pack.reviewPack, 'utf8')), 'the review pack exists and says it is pending');
const E = pack.entries, KINDS = ['pattern', 'tactic', 'anti-pattern'];
assert.equal(new Set(E.map(e => e.id)).size, E.length, 'ids are unique');
for (const e of E) {
  assert.equal(e.status, 'candidate', e.id);
  assert.ok(KINDS.includes(e.kind) && e.title && e.intent && e.concernIds.length && e.concernIds.every(id => IDS.includes(id)), e.id + ': kind, title, intent and lens concerns');
  assert.equal(e.source === null, e.sourceNeeded === true, e.id + ': source null exactly when a source is needed');
  for (const s of e.source || []) for (const k of ['title', 'edition', 'section', 'supports', 'located', 'rights']) assert.ok(typeof s[k] === 'string' && s[k].trim(), e.id + ': a reference names its ' + k);
  assert.ok(!(e.source || []).some(s => /approved|released|verified/i.test(s.located)), e.id + ': nothing is said to be verified');
}
const count = {entries: E.length, patterns: E.filter(e => e.kind === 'pattern').length, tactics: E.filter(e => e.kind === 'tactic').length, antiPatterns: E.filter(e => e.kind === 'anti-pattern').length, sourced: E.filter(e => !e.sourceNeeded).length, sourceNeeded: E.filter(e => e.sourceNeeded).length, references: E.reduce((n, e) => n + (e.source || []).length, 0)};
assert.deepEqual(pack.counts, count, 'the counts are the entries\' own');
for (const id of IDS) assert.ok(E.filter(e => e.concernIds.includes(id)).length >= 3, id + ': at least three candidate entries');
assert.ok(!EM_DASH.test(packText), 'no em-dash in the pack');
// Nothing reads it: no runtime module names the file or the pack.
const runtime = [...readdirSync('public').filter(f => f.endsWith('.js')).map(f => 'public/' + f), ...readdirSync('public/lenses').map(f => 'public/lenses/' + f), ...readdirSync('shared').map(f => 'shared/' + f), ...readdirSync('.').filter(f => f.endsWith('.js'))];
const readers = runtime.filter(f => /core-banking-candidate-pack|CB-CANDIDATE-1/.test(readFileSync(f, 'utf8')));
assert.deepEqual(readers, [], 'no runtime module reads the candidate pack');
await assert.rejects(importCandidateSet({base: 'https://aiw.test', pack, fetcher: () => { throw Error('no request may be made'); }}), /Choose a candidate set made by build-candidate-set\.mjs\./, 'the candidate-set import refuses the pack before any request');
// Kept as candidate knowledge, as a person could keep it, it moves nothing: read on the reference project with the
// lens chosen (drivers, decisions with weighed alternatives, every chapter's records) and on a brief the drafter reads.
const designed = referenceLens, briefOnly = blank(BRIEF);
const lines = packText.split('\n'), lineOf = id => lines.findIndex(l => l.includes('"id": "' + id + '"')) + 1;
function keepAsCandidate(p) {
  let q = applyKnowledgeCommand(p, {type: 'knowledge.source', payload: {title: pack.title, body: packText, url: 'https://aiw.test/candidate-sets/core-banking-candidate-pack.json', revision: pack.preparedOn, path: PACK_FILE, license: 'Candidate; rights not checked'}}, AT, 'pack-author').document;
  const sourceId = q.knowledge.sources.at(-1).id;
  for (const id of ['CB-PAT-MAKER-CHECKER', 'CB-PAT-POSTING-BALANCED', 'CB-TAC-FX-REVALUATION']) {
    const at = lineOf(id);
    q = applyKnowledgeCommand(q, {type: 'knowledge.claim', payload: {sourceId, lineStart: at, lineEnd: at + 2, subjectId: id, predicate: 'recommends', statement: E.find(e => e.id === id).intent, claimType: 'applicability', polarity: 'supports', conditions: ['Core banking'], limitations: ['Candidate only; not reviewed']}}, AT, 'pack-author').document;
  }
  return q;
}
const QUERIES = ['post every transaction as balanced debit and credit entries', 'maker checker segregation of duties', 'revalue foreign currency balances', 'end of day batch window'];
function fingerprint(p, draftFrom) {
  const TM = tradeoffSource(p);
  return {
    scores: {decisions: TM.decisions.map(x => ({id: x.id, tally: x.tally, lead: x.lead})), styles: TM.styleRows.map(s => ({id: s.style.id, marks: s.marks})), sensitivity: [...TM.sens]},
    constraints: inheritedFindings(p).map(f => [f.id, f.level, f.chapter]),
    conformance: {chapters: Array.from({length: 11}, (_, i) => chapterChecks(p, i + 1).passages.map(x => [x.id, x.status, x.fix.map(f => f.id), x.confirm.map(f => f.id)])), ars: arsGate(p).items.map(i => i.id), antiPatterns: detectAntiPatterns(reasoningFor(p)).map(a => [a.id, a.objects.map(o => o.id)])},
    drafted: draftJourney(draftFrom, {at: AT}).chapters.map(c => ({chapter: c.chapter, records: c.records, gaps: c.gaps, citations: c.citations})),
    brain: QUERIES.map(query => { const b = architectureBrain(p, brainContext(p, {chapter: 3, id: 'project'}), {query, limit: 6}); return {claims: b.claims.map(h => h.claim.id), concepts: b.concepts.map(h => h.record.id), methods: b.methods.map(h => h.method.id), tradeoffs: b.tradeoffs.map(h => h.tradeoff.id), cited: brainSources(p, b).filter(s => s.kind === 'governed-claim' || s.kind === 'brain-method').map(s => s.id)}; }),
    released: releasedClaims(p).length,
    lens: lensReport(p)
  };
}
const kept = keepAsCandidate(designed), keptBrief = keepAsCandidate(briefOnly);
assert.equal(kept.knowledge.claims.length, 3, 'three candidate claims are kept');
assert.ok(kept.knowledge.claims.every(c => !knowledgeEligibility(kept, c).eligible), 'none is eligible: no other person verified it');
const F0 = fingerprint(designed, briefOnly), F1 = fingerprint(kept, keptBrief);
assert.ok(F0.scores.decisions.length >= 1 && F0.conformance.chapters.every(x => x.length) && F0.drafted.length === 11, 'the fingerprint reads scores, every chapter\'s checks and the eleven drafted chapters');
for (const k of Object.keys(F0)) assert.deepEqual(F1[k], F0[k], k + ' is unchanged by the candidate pack');
assert.equal(F1.released, 0);
pass(`the candidate pack: ${count.entries} entries (${count.patterns} patterns, ${count.tactics} tactics, ${count.antiPatterns} anti-patterns), each status candidate with its intent and concerns; ${count.sourced} name ${count.references} references by title, edition and section with what each supports, how it was located and its rights, ${count.sourceNeeded} say source null and source needed; approval pending, four eyes false, production not accepted; every concern has three entries or more; no runtime module reads it, the candidate-set import refuses it, and kept as a project source with candidate claims it moves no score, constraint, conformance result, drafted record, Brain retrieval or lens reading`);

console.log(JSON.stringify({suite: 'Domain lens and the candidate core-banking pack', passed: checks.length, checks, limits: ['A lens reads words and fields by rule; it can miss a concern a record states in other words, or count one a record names without designing it. Its reading is an item to confirm, never a verdict.', 'The candidate pack is pending: no source passage is attached and no person has reviewed it (audit/round12/KNOWLEDGE-REVIEW-PACK.md).']}, null, 2));
