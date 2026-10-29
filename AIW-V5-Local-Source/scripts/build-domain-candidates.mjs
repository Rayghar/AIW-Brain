// Builds candidate-sets/core-banking-domain-candidates.json (round 12, workstream K; GR-DOM-03, -04, -05, -07, -08).
//
// Core-banking domain knowledge prepared as candidates for the four-eyes knowledge approver, never as knowledge:
//   - decision topics with their method text (GR-DOM-03),
//   - core platform product categories with the facts an evaluation needs, none filled in (GR-DOM-04),
//   - regulation records (regulator, instrument, section, effective date) and compliance tactics (GR-DOM-05),
//   - recovery and availability passages taken word for word from the held SA Playbook (GR-DOM-07),
//   - the posting method: an idempotent posting boundary and enquire-before-retry, with the core internal (GR-DOM-08).
// Each record says which passage it rests on. A passage is held only where its exact text is in this repository: AIW's
// own method text (written here, origin aiw-authored) or the SA Playbook text the structured pack holds
// (public/playbook-knowledge.js, origin sa-playbook, with the workbook's hash). No third-party passage is held: every
// regulation and every product fact needs its passage from a real source (`sourcesNeeded`), and none is invented.
// Every record's claim is written in a shape public/domain-knowledge.js reads, so that, once the approver has attached
// the passage, a second person has verified the claim and it is released, the chapters offer it; until then nothing
// reads this file at run time (test:knowledge-retrieval checks it).
//
// Usage: node scripts/build-domain-candidates.mjs           writes the pack
//        node scripts/build-domain-candidates.mjs --check   fails when the pack is not this script's output
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {ATTRIBUTES, PLAYBOOK} from '../public/playbook-knowledge.js';
import {DOMAIN_SHAPES} from '../public/domain-knowledge.js';
import {CORE_BANKING} from '../public/lenses/core-banking.js';

export const PACK_FILE = 'candidate-sets/core-banking-domain-candidates.json';
export const PACK_ID = 'CB-DOMAIN-CANDIDATES-1';
export const REVIEW_PACK = 'audit/round12/DOMAIN-KNOWLEDGE-REVIEW-PACK.md';
const PREPARED_ON = '2026-10-08', VERSION = 1, REVISION = PACK_ID + ' v' + VERSION + ' ' + PREPARED_ON;
const sha = s => createHash('sha256').update(s, 'utf8').digest('hex');
const NOT_CONFIRMED = 'from the drafter\'s reading, not confirmed';
const AIW_LICENCE = 'AIW-authored method text written for this pack; it copies no third-party text.';
const workbook = PLAYBOOK.files.find(f => f.file.endsWith('.xlsx'));
const PLAYBOOK_LICENCE = `The owner's SA Playbook workbook (${workbook.file}, SHA-256 ${workbook.sha256}); its reuse is the owner's to permit.`;

// A held passage: its text, where it is, its hash and its licence. Lines are separated by "\n"; a claim names lines.
const aiw = (id, lines, note = '') => ({held: true, origin: 'aiw-authored', locator: PACK_FILE + ' · ' + id, text: lines.join('\n'), lines: lines.length, sha256: sha(lines.join('\n')), licence: AIW_LICENCE, ...(note ? {note} : {})});
const claim = (shape, id, fields) => ({subjectId: DOMAIN_SHAPES[shape].subject + id, predicate: DOMAIN_SHAPES[shape].predicate, ...fields});
const ref = (title, edition, section, supports, extra = {}) => ({title, edition, section, supports, located: NOT_CONFIRMED, rights: 'not checked', ...extra});

// ---------------------------------------------------------------- 1. decision topics (GR-DOM-03)
// Each topic: the question it frames and the method a decision of it follows, in AIW's words. Line 1 of the passage is
// the question, line 2 the method; the claim rests on both.
const TOPICS = [
  ['posting-integrity', 'Posting integrity', ['posting'], 'Where is a balanced posting enforced, and how is a repeated instruction recognised?',
    'Decide which component keeps the general ledger and checks that each posting\'s debits equal its credits in each currency before it is committed; how each posting carries a reference unique to its originator, so that a repeated instruction posts once; and how a posted entry is corrected only by a reversing entry. Compare one posting service that every product calls with posting inside each product module, against the integrity, availability and performance drivers.'],
  ['end-of-day', 'End of day', ['eod', 'value-dating'], 'What runs at end of day, in what order and window, and what stays online?',
    'Decide the end-of-day window, the posting cut-off and how the business date rolls; the order of the steps and which step waits for which; how a failed step restarts without posting twice; and which services stay online during the run and which date their postings take. Compare a run that stops posting with an online end of day in which postings after the cut-off take the next business date, against the availability and operability drivers.'],
  ['approval-workflow', 'Approval workflow', ['maker-checker'], 'Which actions need a second person, and where is that enforced?',
    'Decide which transactions and which changes to parameters, users and limits need a checker; where the rule is enforced: one approval service, or each module; how approval limits route an item and where it escalates; and how one person is kept from both entering and approving the same item. Compare a central workflow with approvals built into each module, against the security, traceability and operability drivers.'],
  ['product-parameters', 'Product parameters', ['product-config', 'interest'], 'How are products and their parameters defined, dated and changed?',
    'Decide where products and their parameters (rates, tariffs, limits, fees) are defined; how a change is dated so that past transactions keep the values that applied to them; who approves a change before it takes effect; and whether a new product needs a software release. Compare a product factory that every module reads with parameters held in each module, against the maintainability and integrity drivers.'],
  ['currencies', 'Currencies', ['fx'], 'How are amounts held in several currencies, valued and revalued?',
    'Decide how every amount carries its currency; where exchange rates come from and which rate applies to a transaction; how a cross-currency posting balances in each currency; and when foreign balances are revalued and where the gains and losses are posted. Compare one ledger with currency position accounts with a ledger per currency, against the integrity and reporting drivers.'],
  ['regulatory-reporting', 'Regulatory reporting', ['reporting'], 'How is each regulatory return produced from the ledger and reconciled to it?',
    'Decide which returns are due, to which authority and by when; from which records each return is built and how its totals reconcile to the ledger; which returns are produced automatically and which by hand; and who checks a return before it is submitted. Compare returns built from a reporting store refreshed from the ledger with returns built from extracts, against the compliance and traceability drivers.'],
  ['data-residency', 'Data residency', ['privacy'], 'Where may customer data live, and how is it kept there?',
    'Decide in which country or region customer data must stay; which zones, providers and backups may hold it; how personal data is protected in transit, at rest and outside production; and what a provider outside the boundary may receive. Compare holding the data in the country with a provider\'s region, against the residency constraint and the availability and cost drivers.']
];
const topicRecords = TOPICS.map(([id, title, concerns, question, method]) => {
  const rid = 'CBK-TOPIC-' + id.toUpperCase();
  return {id: rid, kind: 'decision-topic', gap: 'GR-DOM-03', status: 'candidate', concernIds: concerns, title,
    passage: aiw(rid, [question, method]),
    claim: claim('topic', id, {claimType: 'definition', polarity: 'neutral', statement: method, conditions: ['A core-banking design that has to decide ' + title.toLowerCase() + '.'], limitations: ['It frames the decision and what to compare; it chooses nothing and states no value.'], tags: ['title:' + title, 'question:' + question, 'concern:' + concerns[0], 'lens:core-banking'], lineStart: 1, lineEnd: 2}),
    sourcesNeeded: [], sourceNeeded: false};
});

// ---------------------------------------------------------------- 2. regulation records and compliance tactics (GR-DOM-05)
// The regulator, the instrument, the section and the date it applies from, each as the drafter reads them: none was
// checked against the text, no passage is held, and every one applies only where its jurisdiction does. The project's
// own jurisdiction is a record of its own, left for a person to name.
const REGULATIONS = [
  ['fatf-r10', 'Financial Action Task Force (an intergovernmental standard setter, not a regulator)', 'The FATF Recommendations: International Standards on Combating Money Laundering and the Financing of Terrorism and Proliferation', 'Recommendation 10, Customer due diligence', 'Adopted February 2012, as updated; pin the version in force', 'Every FATF member jurisdiction, through its own law', ['kyc'], 'CB-PAT-RISK-BASED-CDD'],
  ['fatf-r11', 'Financial Action Task Force (an intergovernmental standard setter, not a regulator)', 'The FATF Recommendations', 'Recommendation 11, Record-keeping', 'Adopted February 2012, as updated; pin the version in force', 'Every FATF member jurisdiction, through its own law', ['kyc', 'audit'], 'CB-TAC-KYC-RECORD-KEEPING'],
  ['fatf-r16', 'Financial Action Task Force (an intergovernmental standard setter, not a regulator)', 'The FATF Recommendations', 'Recommendation 16, Wire transfers', 'Adopted February 2012, as updated; pin the version in force, as this recommendation has been revised', 'Every FATF member jurisdiction, through its own law', ['aml', 'payments'], 'CB-TAC-WIRE-TRANSFER-DATA'],
  ['fatf-r20', 'Financial Action Task Force (an intergovernmental standard setter, not a regulator)', 'The FATF Recommendations', 'Recommendation 20, Reporting of suspicious transactions', 'Adopted February 2012, as updated; pin the version in force', 'Every FATF member jurisdiction, through its own law', ['aml'], 'CB-TAC-TRANSACTION-MONITORING'],
  ['bcbs239-p3', 'Basel Committee on Banking Supervision (a standard setter; national supervisors apply it)', 'BCBS 239, Principles for effective risk data aggregation and risk reporting (January 2013)', 'Principle 3, Accuracy and integrity', 'January 2016 for global systemically important banks; a national supervisor sets it for others', 'Where the national supervisor applies it', ['reporting'], 'CB-PAT-RETURNS-FROM-LEDGER'],
  ['bcbs239-p7', 'Basel Committee on Banking Supervision (a standard setter; national supervisors apply it)', 'BCBS 239, Principles for effective risk data aggregation and risk reporting (January 2013)', 'Principle 7, Accuracy', 'January 2016 for global systemically important banks; a national supervisor sets it for others', 'Where the national supervisor applies it', ['reporting'], 'CB-PAT-RETURNS-FROM-LEDGER'],
  ['eu-gdpr-art5', 'European Union (supervised by each member state\'s data protection authority)', 'Regulation (EU) 2016/679, the General Data Protection Regulation', 'Article 5, Principles relating to processing of personal data', 'Applies from 25 May 2018', 'The European Union and the European Economic Area only', ['privacy'], 'CB-PAT-PERSONAL-DATA-PLACED'],
  ['eu-gdpr-art32', 'European Union (supervised by each member state\'s data protection authority)', 'Regulation (EU) 2016/679, the General Data Protection Regulation', 'Article 32, Security of processing', 'Applies from 25 May 2018', 'The European Union and the European Economic Area only', ['privacy'], 'CB-TAC-ENCRYPT-AND-MASK'],
  ['eu-gdpr-art44', 'European Union (supervised by each member state\'s data protection authority)', 'Regulation (EU) 2016/679, the General Data Protection Regulation', 'Article 44, General principle for transfers', 'Applies from 25 May 2018', 'The European Union and the European Economic Area only', ['privacy'], 'CB-PAT-PERSONAL-DATA-PLACED'],
  ['eu-rts-2018-389', 'European Union (supervised by national competent authorities)', 'Commission Delegated Regulation (EU) 2018/389, the regulatory technical standards for strong customer authentication and common and secure open standards of communication', 'Articles 4 and 5, Authentication code and Dynamic linking', 'Applies from 14 September 2019', 'The European Union and the European Economic Area only', ['channels'], 'CB-TAC-CHANNEL-AUTHENTICATION'],
  ['eu-dora-art11-12', 'European Union (supervised by the financial supervisors of each member state)', 'Regulation (EU) 2022/2554, the Digital Operational Resilience Act', 'Article 11, Response and recovery, and Article 12, Backup policies and procedures, restoration and recovery procedures and methods', 'Applies from 17 January 2025', 'The European Union only', ['availability'], 'CB-TAC-STANDBY-ELSEWHERE']
];
const regulationRecords = REGULATIONS.map(([id, regulator, instrument, section, effective, jurisdiction, concerns, related]) => ({
  id: 'CBK-REG-' + id.toUpperCase(), kind: 'regulation', gap: 'GR-DOM-05', status: 'candidate', concernIds: concerns, title: instrument.split(',')[0] + ' · ' + section,
  regulator, instrument, section, effective, jurisdiction, located: NOT_CONFIRMED,
  passage: null,
  claim: claim('regulation', id, {claimType: 'obligation', polarity: 'requires', statement: null, statementFrom: 'The approver writes the obligation from the attached passage; this pack states none.', conditions: ['Where it applies: ' + jurisdiction + '.'], limitations: ['A record of where the obligation is written, not an interpretation of the law.'], tags: ['regulator:' + regulator, 'instrument:' + instrument, 'section:' + section, 'effective:' + effective, 'jurisdiction:' + jurisdiction]}),
  relatedCandidates: [related],
  sourcesNeeded: [ref(instrument, 'The version in force on the date the project relies on it', section, 'The exact text of the obligation, its scope and the date it applies from, and who supervises it in the project\'s jurisdiction.')],
  sourceNeeded: true}));
regulationRecords.push({id: 'CBK-REG-JURISDICTION', kind: 'regulation', gap: 'GR-DOM-05', status: 'candidate', concernIds: ['reporting', 'kyc', 'aml', 'privacy'], title: 'The project\'s own jurisdiction: not stated',
  regulator: 'not stated', instrument: 'not stated', section: 'not stated', effective: 'not stated', jurisdiction: 'not stated: a person who can name it must',
  located: 'not located: no jurisdiction is named here',
  open: ['In which country or region does the bank operate, and under which licence?', 'Which central bank or supervisor regulates it, and which of its rules apply: prudential returns, customer and account tiers, outsourcing and cloud, operational resilience?', 'Which data protection law applies, and does it require customer data to stay in the country?', 'Which anti-money-laundering law applies, and which financial intelligence unit receives suspicious transaction reports, and by when?'],
  passage: null, claim: null, relatedCandidates: [], sourcesNeeded: [ref('The regulator\'s and the legislature\'s own texts for the jurisdiction a person names', 'In force on the date the project relies on them', 'Each rule the design must meet', 'Every jurisdiction-specific obligation; the European Union records here apply only in the European Union.', {located: 'not located'})], sourceNeeded: true});
const TACTICS = [
  ['obligations-register', 'Obligations register', ['reporting', 'audit'], ['Keep a register of the obligations that apply to the platform, each naming its regulator, instrument and section.', 'Map each obligation to the design records that meet it and to the tests or reports that show it is met.', 'When an obligation changes, open the records it maps to for review.'], ['The platform is subject to named regulation or contractual obligations.'], ['The register shows where an obligation is met; it does not interpret the law, and a person who can name the jurisdiction keeps it current.'], []],
  ['dated-regulatory-parameters', 'Regulatory parameters as dated configuration', ['product-config', 'maker-checker'], ['Hold regulatory parameters (limits, thresholds, customer tiers, retention periods, reporting dates) as configuration with an effective date.', 'Change them under maker-checker, never in code, so that a past transaction keeps the values that applied to it.'], ['Regulation sets values the platform must apply, and they change over time.'], ['It says where the values live and how they change, not what they are: each value comes from the instrument that sets it.'], []],
  ['evidence-from-records', 'Evidence from the platform\'s own records', ['audit'], ['Produce the evidence that an obligation is met from records the platform already keeps: the audit history, the reconciled ledger, the approval records.', 'Produce it on request and for a period, rather than assembling it by hand.'], ['An auditor, a regulator or a customer may ask for evidence that an obligation is met.'], ['The evidence is only as good as the records: an audit history that can be changed proves nothing.'], []],
  ['returns-reconciled', 'Returns reconciled to the ledger before submission', ['reporting'], ['Build each regulatory return from the ledger, or from a reporting store refreshed from it.', 'Reconcile the return\'s totals to the ledger before it is submitted, and keep the reconciliation with the return.'], ['The platform submits regulatory returns built from its records.'], ['Which returns are due, and their format, come from the regulator\'s own rules.'], [ref('BCBS 239, Principles for effective risk data aggregation and risk reporting', 'January 2013', 'Principles 3 and 7', 'That risk data and reports are accurate and reconcilable with the bank\'s sources; AIW\'s tactic follows it, and the approver checks that it does.')]],
  ['retention-by-rule', 'Retention by rule', ['audit', 'privacy'], ['Keep each record for the period its obligation sets.', 'When the period ends, remove or anonymise the record by rule and record the removal; a legal hold stops the rule for the records it names.'], ['Obligations set how long records are kept, and data protection law how long personal data may be.'], ['The periods come from the instruments that set them; this tactic states none.'], []]
];
const tacticRecords = TACTICS.map(([id, name, concerns, lines, conditions, limitations, needed]) => {
  const rid = 'CBK-TAC-' + id.toUpperCase();
  return {id: rid, kind: 'quality-tactic', gap: 'GR-DOM-05', status: 'candidate', concernIds: concerns, title: name,
    passage: aiw(rid, lines),
    claim: claim('tactic', id, {claimType: 'mitigation', polarity: 'supports', statement: lines.join(' '), conditions, limitations, tags: ['quality:compliance', 'name:' + name, 'concern:' + concerns[0], 'lens:core-banking'], lineStart: 1, lineEnd: lines.length}),
    sourcesNeeded: needed, sourceNeeded: false};
});

// ---------------------------------------------------------------- 3. core platform product categories (GR-DOM-04)
// What each category of packaged platform holds, and the facts an evaluation of one needs. No product is named and no
// fact is filled in: each fact comes from the vendor's document for the version weighed, as a claim of the product
// shape on the technology category application-platform.
const COMMON_FACTS = ['The deployment and operating models offered (on premises, hosted by the provider, as a service), and the regions where data may be held.', 'The versions supported, the upgrade path and how often upgrades are required.', 'How it is licensed, and what leaving it would take (data export, contract terms).'];
const PRODUCTS = [
  ['core-banking-platform', 'Core banking platform', ['posting', 'eod', 'interest', 'fx', 'product-config', 'value-dating'], 'A packaged platform that keeps customer accounts, deposits and loans, the general ledger, interest and charges, and end-of-day processing.',
    ['Which products and account types it holds (current and savings accounts, term deposits, loans).', 'Whether it keeps the general ledger itself or posts to an external one.', 'Which day-count bases and interest methods it supports, and how accruals are posted.', 'How it holds amounts in several currencies and revalues foreign balances.', 'Its end-of-day model: what stops, what stays online, and how the business date rolls.', 'How products and parameters are configured, and whether a new product needs a software release.', 'Its maker-checker controls and audit history.']],
  ['payments-hub', 'Payments hub', ['payments'], 'A packaged platform that connects the bank to clearing and settlement networks, validates and routes payments, and keeps their status.',
    ['Which networks and message standards it supports, at which versions.', 'How it recognises a repeated payment instruction.', 'How it finds the outcome of a payment that did not answer in time.', 'How it reconciles settlement reports with the ledger.']],
  ['financial-crime-platform', 'Financial crime platform', ['kyc', 'aml'], 'A packaged platform that screens customers and payments against sanctions and watch lists, monitors transactions and manages the cases they raise.',
    ['Which lists it screens against, and how often they are refreshed.', 'Whether screening is repeated when a list changes.', 'How monitoring rules are written and changed.', 'How a suspicious transaction report is produced and filed.']],
  ['digital-banking-platform', 'Digital banking platform', ['channels'], 'A packaged platform for mobile and internet banking that calls the bank\'s services and authenticates its users.',
    ['Which channels it serves.', 'How users are authenticated and how a payment is confirmed.', 'Which services of the core it calls, and through which interfaces.', 'Which limits it enforces per channel.']],
  ['regulatory-reporting-platform', 'Regulatory reporting platform', ['reporting'], 'A packaged platform that builds regulatory returns from the bank\'s data and submits them.',
    ['Which returns and formats it produces for the project\'s jurisdiction.', 'From which data it builds them, and how they reconcile to the ledger.', 'How a change in a return\'s rules reaches it.']],
  ['general-ledger-platform', 'General ledger and finance platform', ['posting', 'reporting'], 'A packaged finance platform that keeps the general ledger and the chart of accounts and closes the books.',
    ['Whether it receives postings in detail or in summary, and how often.', 'How it keeps balances per currency.', 'How its period close relates to the core\'s end of day.']]
];
const productRecords = PRODUCTS.map(([id, title, concerns, holds, facts]) => ({
  id: 'CBK-PRD-' + id.toUpperCase(), kind: 'product-category', gap: 'GR-DOM-04', status: 'candidate', concernIds: concerns, title,
  technologyCategory: 'application-platform', holds, factsNeeded: [...facts, ...COMMON_FACTS], facts: [],
  passage: null,
  claim: claim('product', '<product name>', {claimType: 'component-attribute', polarity: 'neutral', statement: null, statementFrom: 'One claim per fact, written from the vendor\'s document for the version weighed.', conditions: ['The version of the product named in the claim.'], limitations: ['A fact of one version: it is checked again when the version changes.'], tags: ['technology:application-platform', 'category:' + id, 'version:<version>']}),
  sourcesNeeded: [ref('The vendor\'s product documentation for each product weighed', 'The version weighed', 'The section that states each fact', 'Each fact in factsNeeded.', {located: 'not located: no product is named in this pack'})],
  sourceNeeded: true}));

// ---------------------------------------------------------------- 4. recovery and availability passages (GR-DOM-07)
// Word for word from the structured SA Playbook (public/playbook-knowledge.js, AIW-PLAYBOOK-3): the QR-Guidebook row on
// availability, which also holds the playbook's recovery measures, and its trade-offs. A list cell is held as its
// bullet texts, one per line; the cell's bullet marks and line-break tags are not held. The example targets of cell F7
// ("99.99% uptime", "RTO of 1 hour", "RPO of 15 minutes") are not prepared: they are examples, and a draft must never
// use them as values, so no citable passage carries them.
const av = ATTRIBUTES.find(a => a.id === 'availability'), guide = av.guide, row = guide.src.split('!')[1].match(/\d+/)[0];
const PASSAGES = [
  ['definition', 'C', 'Availability: what it means', [guide.definition], 'The SA Playbook defines availability as the degree to which a system is operational and accessible when needed: uptime, continuous service and resilience to failures.', ['availability']],
  ['importance', 'D', 'Availability: why it matters', [guide.importance], 'The SA Playbook holds availability fundamental to user trust and business continuity, and critical where downtime has financial, safety or legal consequences.', ['availability']],
  ['metrics', 'E', 'Availability and recovery: what is measured', guide.metrics, 'The SA Playbook measures availability and recovery by uptime, downtime, mean time between failures, mean time to recover, the recovery time objective, the recovery point objective and service level agreements; a design says which it targets.', ['availability']],
  ['decisions', 'G', 'Availability: the design decisions', guide.decisions, 'The SA Playbook lists the design decisions that serve availability and recovery: redundancy, failover, disaster recovery planning, load balancing, monitoring and alerting, regular backups to a separate location, fault tolerance, geographic distribution, data replication and the others it names.', ['availability']],
  ['testing', 'I', 'Availability and recovery: how they are tested', guide.testing, 'The SA Playbook tests availability and recovery with failover tests, disaster recovery drills and load tests that measure recovery times, continuous monitoring, and controlled disruptions.', ['availability', 'operations']],
  ['risks', 'J', 'Availability: risks and how they are mitigated', guide.risks, 'The SA Playbook names single points of failure, unexpected failures, human error and updates as risks to availability, mitigated by redundancy, fault tolerance, tested disaster recovery plans, monitoring and automated failover.', ['availability']]
].map(([key, col, title, lines, statement, concerns]) => ({key, locator: workbook.file + ' · QR-Guidebook!' + col + row, title, lines, statement, concerns}));
const tradeoffLines = av.tradeoffs.map(t => t.with + ': ' + t.text + (t.advice ? ' ' + t.advice : ''));
PASSAGES.push({key: 'tradeoffs', locator: workbook.file + ' · ' + av.tradeoffSrc, title: 'Availability: what it is traded against', lines: tradeoffLines, statement: 'The SA Playbook weighs availability against cost, complexity, performance and security: more redundancy and failover cost more, are harder to run, can slow the work and can pull against security measures.', concerns: ['availability'], composed: 'Each line is the trade-off\'s name as the structured pack holds it, a colon, then its text.'});
const playbookRecords = PASSAGES.map(x => {
  const rid = 'CBK-PB-AVAILABILITY-' + x.key.toUpperCase(), text = x.lines.join('\n');
  return {id: rid, kind: 'playbook-passage', gap: 'GR-DOM-07', status: 'candidate', concernIds: x.concerns, title: x.title,
    passage: {held: true, origin: 'sa-playbook', locator: x.locator, pack: PLAYBOOK.id, text, lines: x.lines.length, sha256: sha(text), licence: PLAYBOOK_LICENCE,
      note: x.composed || (x.lines.length > 1 ? 'The bullet texts of the cell, one per line, as the structured pack holds them; the bullet marks and line-break tags are not held.' : 'The cell\'s text as the structured pack holds it.')},
    claim: claim('method', 'sa-playbook-availability-' + x.key, {claimType: 'applicability', polarity: 'neutral', statement: x.statement, conditions: ['A design that states availability or recovery targets, or plans how it recovers.'], limitations: ['Method guidance from the owner\'s playbook; it states no target for this design, and a draft must never take a value from it.'], tags: ['title:' + x.title, 'concern:availability', 'availability', 'recovery', 'sa-playbook'], lineStart: 1, lineEnd: x.lines.length}),
    sourcesNeeded: [], sourceNeeded: false};
});

// ---------------------------------------------------------------- 5. the posting method (GR-DOM-08)
// Lifted from the Bank Payment reference's decisions ADR-002 and ADR-003 (public/decisions-domain.js), where the core
// ledger stands behind an external party, and written again with the ledger inside the system under design.
const METHODS = [
  ['idempotent-posting-boundary', 'Idempotent posting boundary', ['posting', 'payments'],
    ['The core ledger is part of the system under design, and its posting operation is the boundary where one financial effect is enforced.', 'Every instruction carries a reference that its originator keeps for every retry.', 'The ledger records that reference with the posting in the same transaction, so a repeated instruction finds the recorded posting and returns its result instead of posting again.', 'A check made outside that transaction, such as a cache of recent references, only saves work; it is never the guarantee.'],
    ['A posting may be requested more than once: by a retry, after a timeout, or as a repeated message.'], ['The reference must be unique to its originator and kept for as long as a retry can arrive.', 'It does not say what to do when an outcome is unknown: enquire before retry does.'],
    'ADR-002, Where should one financial effect be enforced?', ['CB-PAT-IDEMPOTENT-PAYMENT', 'CB-PAT-POSTING-BALANCED'],
    [ref('Enterprise Integration Patterns', 'First edition, 2003 (Hohpe and Woolf)', 'Chapter 10, Idempotent Receiver', 'A receiver that can safely receive the same message more than once; the approver checks that the method follows it.')]],
  ['enquire-before-retry', 'Enquire before retry', ['payments', 'posting'],
    ['When a call that may have changed a balance does not answer in time, its outcome is unknown, not failed.', 'Keep the instruction pending with its original reference.', 'Ask the side that may have applied it for the outcome, by a status enquiry or at the next reconciliation, and replay only when it is shown not to have been applied, with the same reference.', 'Until then, report the instruction as pending.'],
    ['A call that may change a balance can end without an answer.'], ['It needs the other side to answer an enquiry or to report what it applied; without either, the outcome stays unknown until a person investigates.', 'The time an instruction may stay pending is the project\'s to state.'],
    'ADR-003, What should happen after an uncertain settlement response?', ['CB-TAC-ENQUIRE-BEFORE-RETRY', 'CB-ANTI-RETRY-ON-TIMEOUT'],
    [ref('A published source for the enquiry-before-retry practice', 'not located', 'not located', 'The pack C entry CB-TAC-ENQUIRE-BEFORE-RETRY has no source either; the approver finds one or keeps the method as AIW\'s own.', {located: 'not located'})]]
];
const methodRecords = METHODS.map(([id, title, concerns, lines, conditions, limitations, lineage, related, needed]) => {
  const rid = 'CBK-MTH-' + id.toUpperCase();
  return {id: rid, kind: 'method', gap: 'GR-DOM-08', status: 'candidate', concernIds: concerns, title, coreModel: 'internal',
    lineage: 'Generalised from the Bank Payment reference\'s decision ' + lineage + ' (public/decisions-domain.js), where the core ledger stands behind an external party; here the ledger is the system\'s own.',
    passage: aiw(rid, lines),
    claim: claim('method', id, {claimType: 'applicability', polarity: 'supports', statement: lines.join(' '), conditions, limitations, tags: ['title:' + title, 'concern:' + concerns[0], 'posting', 'ledger', 'reference', 'retry', 'idempotent', 'lens:core-banking'], lineStart: 1, lineEnd: lines.length}),
    relatedCandidates: related, sourcesNeeded: needed, sourceNeeded: false};
});

export function buildDomainCandidates() {
  const records = [...topicRecords, ...tacticRecords, ...regulationRecords, ...productRecords, ...playbookRecords, ...methodRecords];
  const ids = CORE_BANKING.concerns.map(c => c.id);
  for (const r of records) if (!r.concernIds.every(id => ids.includes(id))) throw Error(r.id + ': a concern the lens does not have');
  const by = k => records.filter(r => r.kind === k).length;
  return {
    schemaVersion: 'aiw-domain-candidates-v1', packId: PACK_ID, version: VERSION, revision: REVISION,
    title: 'Core-banking domain knowledge prepared as candidates: decision topics, compliance tactics and regulation records, core platform product categories, recovery and availability passages and the posting method',
    domain: 'core-banking', lens: {id: CORE_BANKING.id, version: CORE_BANKING.version}, status: 'candidate',
    approval: {status: 'pending', fourEyes: false, approvedBy: null, approvedAt: null, releaseId: null, decision: null},
    productionAccepted: false,
    influence: {scoring: false, constraints: false, conformance: false, drafter: false, brain: false, lens: false},
    preparedBy: 'Sol, AIW round 12 workstream K (drafted, not reviewed by a person)', preparedOn: PREPARED_ON, reviewPack: REVIEW_PACK,
    authority: 'Candidate only. Nothing in this file is approved, released or active, and no runtime module reads it. A record becomes knowledge only when the four-eyes knowledge approver attaches its exact passage as a source (knowledge.source), writes its claim on that passage (knowledge.claim), a second person verifies the claim (knowledge.review), and the claim is released and pinned (knowledge.release, knowledge.activate), in a project or once for an organisation. Released, it is offered to the chapters by its shape (public/domain-knowledge.js); before, it informs no score, hard constraint, conformance result, draft, retrieval or lens reading.',
    sourcePolicy: 'A passage is held only where its exact text is in this repository: AIW\'s own method text (origin aiw-authored) or the SA Playbook text the structured pack holds (origin sa-playbook). No third-party passage is held, retrieved or hashed, and no rights were checked. Every regulation record and every product fact needs its passage from a real source (sourcesNeeded); a record with no held passage cannot become a claim until the approver attaches one. "located" says how a title and section were found: here, always from the drafter\'s reading, not confirmed, or not located.',
    // The October 8 candidate pack is immutable until reviewed. Runtime support
    // for later concern claims must not silently rewrite this pending pack.
    shapes: Object.fromEntries(Object.entries(DOMAIN_SHAPES).filter(([k]) => k !== 'concern').map(([k, s]) => [k, {subject: s.subject, predicate: s.predicate, tags: s.tags}])),
    counts: {records: records.length, decisionTopics: by('decision-topic'), tactics: by('quality-tactic'), regulations: by('regulation'), productCategories: by('product-category'), playbookPassages: by('playbook-passage'), methods: by('method'), heldPassages: records.filter(r => r.passage?.held).length, sourceNeeded: records.filter(r => r.sourceNeeded).length},
    records
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const text = JSON.stringify(buildDomainCandidates(), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (readFileSync(PACK_FILE, 'utf8') !== text) { console.error(PACK_FILE + ' is not this script\'s output: run node scripts/build-domain-candidates.mjs'); process.exit(1); }
    console.log(PACK_FILE + ' is current.');
  } else { writeFileSync(PACK_FILE, text); console.log('Wrote ' + PACK_FILE); }
}
