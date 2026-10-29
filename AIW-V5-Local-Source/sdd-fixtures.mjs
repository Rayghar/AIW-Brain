// Synthetic projects for the SDD suites (round 12, workstream F: sdd-architecture-validate.mjs, sdd-size-validate.mjs).
// Generic names only and no client text: the requirements come from the synthetic workbook
// (scripts/synthetic-workbook.mjs), every other record is saved through its chapter's own command (canonical-command.js,
// the review, roadmap and lens commands) or the intake domain the import route uses, on a fixed clock, so the same
// document comes out on every run.
//   richProject(): the reference journey under another name, grown so that it holds every record kind the
//     architecture edition reads, with the round-12 fields recorded on some records and left open on others: an
//     imported workbook with its groups and assessment facts, personas and outcomes, a business rule, drivers of every
//     kind, decisions in every category (one chosen with its alternatives' reasons, one compared on its drivers, one
//     open), components with properties, a solution, a pattern and a container (two share one), an external party
//     with its integration fields, a data definition owned through its authority, a runtime plan's targets and
//     schedule, a critical threat, plateaus with a component placed on one, a domain lens, the SDD narrative, a
//     delivery obligation and records Sol drafted.
//   depthProject(): the rich project with the records of round 12's workstreams D4 and E: invariants, a batch chain, a
//     time-driven transition, dual control, start-up paths, journey steps served and realised, a round-12 technology
//     category, requirement fit and targets, groups on plateaus, a migration record, a retired record and Sol's drafts.
//   largeProject(): a blank project at the size of the owner's core-banking workbook: 1,400 imported requirements in
//     about 60 groups and the grouped design such a project holds (drivers of every kind, decisions with
//     alternatives, responsibilities, components in containers, capabilities, realisations, contracts, data with
//     fields, parties, threats, controls, environments, zones and plans), built with the chapters' command appliers.
//   modularProject(): the synthetic workbook imported with its module structure proposed (as an import that asks for
//     modules), drafted by the rules drafter, which drafts by module (round 24), and applied as the drafting job applies
//     a draft, with the records a drafted design lacks added by hand: an external party, a data definition and an
//     invariant of one module, a party two modules share, a party without links whose contract joins one module's
//     component and one that joins nothing, a component no module holds, and a drafted component that no longer names
//     the drivers it serves.
//   blankProject(): nothing recorded.
//   docxRead(), pdfRead(), unzip(): the Word and PDF files the SDD writers make, read back independently of them.
import {createProject} from './shared/projects-domain.js';
import {applyCanonical, applyRecordCommand} from './public/canonical-command.js';
import {applyTechnologyRealisationCommand} from './public/technology-realisation-domain.js';
import {markDrafted, draftArchitecture, applyDraftBundle} from './public/architecture-drafter.js';
import {applyFinalReviewCommand, withFinalReview} from './public/review-domain.js';
import {applyLensCommand} from './public/domain-lens.js';
import {applyDecisionCommand} from './public/decisions-domain.js';
import {applyRequirementsCommand} from './public/requirement-commands.js';
import {journeyProvenance, withJourneyProvenance} from './public/chapter-guide.js';
import {openWorkbook, sha256} from './public/workbook-reader.js';
import {guessHeader, sheetHeaders, suggestMapping, mapWorkbookRows, previewIntake, applyIntake} from './public/intake-domain.js';
import {bandValues, defaultPriorityMap, cleanPriorityMap, groupProposals, stakeholderProposals, markupFlags, createImportGroups, createImportModules} from './public/intake-proposals.js';
import {syntheticWorkbook, SHEET} from './scripts/synthetic-workbook.mjs';
import {groupIndex} from './public/requirement-groups.js';
import {inflateRawSync} from 'node:zlib';

export const FIXTURE_AT = '2026-10-08T09:00:00.000Z';
const ARCHITECT = 'architect-a';

// The synthetic workbook imported as the import route imports it (intake-service.js: inspect, preview, apply, and the
// groups the preview proposed from the domain and capability-theme columns; with choice.modules, the module structure
// proposed from the whole project as an import that asks for modules proposes it, round 24), in memory.
export async function syntheticImport(p, {rows = 120, seed = 12, filename = 'Synthetic-requirements.xlsx', actor = 'fixture-importer', at = FIXTURE_AT, choice = {domain: true, capabilityTheme: true}} = {}) {
  const {bytes, manifest} = syntheticWorkbook({rows, seed});
  const wb = await openWorkbook(bytes), sheet = await wb.sheet(SHEET), headerRow = guessHeader(sheet), headers = sheetHeaders(sheet, headerRow), mapping = suggestMapping(headers);
  const values = bandValues(sheet, headerRow, mapping.priorityBand), priorityMap = cleanPriorityMap(defaultPriorityMap(values)), hash = await sha256(bytes);
  const source = {...mapWorkbookRows(sheet, headerRow, mapping), datasetId: 'workbook-fixture-' + rows, revision: 1, filename, uploadId: 'upload-fixture-' + rows, workbookHash: hash, sheet: sheet.name, headerRow, priorityMap};
  const extras = {groups: groupProposals(p, source), stakeholders: stakeholderProposals(p, source, null), brief: null, markup: markupFlags(source), choice};
  const preview = previewIntake(p, source, [], extras);
  const result = applyIntake(p, source, preview, {previewStamp: preview.stamp, reviewed: true}, at, actor);
  const groups = createImportGroups(result.document, extras.groups, choice, {filename, datasetId: source.datasetId, revision: source.revision}, at, actor);
  const receipt = result.document.intake.datasets.find(d => d.id === source.datasetId);
  receipt.groups = groups; receipt.versions.at(-1).groups = groups;
  if (choice.modules) { const modules = createImportModules(result.document, {datasetId: source.datasetId}, at, actor); receipt.modules = modules; receipt.versions.at(-1).modules = modules; }
  return {document: withFinalReview(result.document), manifest, source};
}

export function blankProject(name = 'Blank synthetic platform') {
  return createProject({name, template: 'blank'}, 'blank-synthetic', FIXTURE_AT);
}

// ---------------------------------------------------------------- the rich project
export async function richProject() {
  let p = createProject({name: 'Synthetic core platform', template: 'bank-payment'}, 'synthetic-core', FIXTURE_AT);
  const run = (type, payload, actor = ARCHITECT) => { const r = applyCanonical(p, {type, payload}, FIXTURE_AT, actor); p = r.document; return r.selected; };
  const review = (type, payload = {}, actor = ARCHITECT) => { const r = applyFinalReviewCommand(p, {type: 'review.' + type, payload}, FIXTURE_AT, actor); p = r.document; return r.selected; };
  const last = xs => xs.at(-1);
  // Chapter 1: a brief holding a heading and a tag (both must stay text), the workbook, personas and an outcome's measure.
  run('brief', {problem: 'The platform keeps customer accounts, postings and statements for a mid-sized lender.\n\n## Background\n\nThe current batch <b>ledger</b> closes the day late and holds no change history.\n\n# Not a section\n\nOperations need the balance before cash is paid out.', goal: 'Replace the batch ledger with a platform that posts in real time and keeps every change.', source: 'Synthetic brief for the SDD suites'});
  const imported = await syntheticImport(p, {rows: 120});
  p = imported.document;
  const reqs = p.artefacts.filter(a => a.type === 'requirement'), importedReqs = reqs.filter(a => a.provenance?.datasetId);
  run('artefact', {id: 'ACT-002', category: 'staff-role', role: 'Operations analyst', motivations: 'Short queues.', wishes: 'One screen for the balance.', concerns: 'Posting errors.', usage: 'All day, at the operations desk.', benefits: 'Fewer calls to the back office.'});
  run('artefact', {id: 'ACT-001', category: 'customer', role: 'Account holder', usage: 'Online, a few times a week.'});
  run('artefact', {id: 'STK-001', category: 'staff-role', role: 'Product owner', motivations: 'Sound records.'});
  run('artefact', {id: 'OUT-001', problem: 'Customers do not know their balance until the next day.', measure: 'Hours until a posting shows', baseline: '24 hours', target: 'Under one minute', by: '2027-06-30'});
  run('artefact', {type: 'rule', title: 'Daily cash withdrawal limit', description: 'A customer withdraws at most this much cash a day.', value: '5000', unit: 'per day', currency: 'EUR', authority: 'Board policy', instrument: 'Limits policy', section: '4.2', requirementIds: ['REQ-001'], refinesId: 'CON-001'});
  // A requirement group a person made, beside the imported ones, holding reference and imported requirements.
  p = applyRequirementsCommand(p, {type: 'requirements.group', payload: {title: 'Account posting', kind: 'functional-area', memberIds: ['REQ-001', 'REQ-002', ...importedReqs.slice(0, 14).map(a => a.id)]}}, FIXTURE_AT, ARCHITECT).document;
  p = withFinalReview(p);
  const groups = p.requirementGroups.records, posting = last(groups).id, domainGroup = groups.find(g => g.kind === 'domain').id, themeGroup = groups.find(g => g.kind === 'theme').id;
  // Chapter 2: one driver of every other kind (the reference holds the quality drivers), with impact and priority.
  const before = structuredClone(p);
  const driver = (kind, title, extra = {}) => run('quality.driver', {kind, title, description: title + ', as the brief asks.', impact: 'Shapes the ' + kind + ' choices of the design.', priority: 'High', rationale: 'The brief names it first.', ...extra});
  const bd = driver('business', 'Lower the cost of a posting', {priority: 'Medium'});
  const fd = driver('functional', 'Post and enquire in real time', {requirementGroupIds: [posting, themeGroup]});
  const cd = driver('constraint', 'Keep records in the home jurisdiction', {impact: ''});
  const od = driver('operational', 'Run without a nightly batch', {priority: ''});
  const dd = driver('data', 'One authoritative ledger record', {requirementGroupIds: [domainGroup]});
  const te = driver('technology-evolution', 'Replace the batch ledger in steps');
  const bc = driver('business-continuity', 'Keep posting through a site loss');
  // Sol drafted the business and functional drivers (the journey's marking path; a person has not reviewed them).
  p = withJourneyProvenance(p, 2, [bd, fd], journeyProvenance(p, {mode: 'sol', runId: 'run-fixture-1', passages: [], upstream: []}), FIXTURE_AT, {before});
  // A quality target stated without its window or verification (GR-DRV-05), and one stated whole.
  run('quality.driver', {id: 'QD-001', metric: 'Posting response time', operator: 'At most', targetValue: '200', unit: 'ms', window: '', measurement: ''});
  // Chapter 3: a decision in each category; ADR-001 chosen with its alternative's reason; ADR-004 compared on its drivers.
  run('decision.save', {id: 'ADR-001', category: 'foundational', stakeholderIds: ['STK-001', 'ACT-001'], stakeholderNote: 'Operations run it.', dependsOn: ['ADR-002'], dependencies: 'Needs the ledger decision.', licensing: 'Open source.', skills: 'Event modelling.', documentation: 'Decision folder.', impact: 'Every posting carries its reference.', requirementGroupIds: [posting], rationale: 'A reference held with the record survives a restart.'});
  run('decision.alternative', {id: 'ADR-001', alternativeId: 'ALT-002', rejectionReason: 'It replays postings blindly.'});
  p = applyDecisionCommand(p, {type: 'decision.choose', payload: {id: 'ADR-001', alternativeId: 'ALT-001'}}, FIXTURE_AT).document;
  run('decision.save', {id: 'ADR-002', category: 'structural'});
  p = applyDecisionCommand(p, {type: 'decision.choose', payload: {id: 'ADR-002', alternativeId: 'ALT-003'}}, FIXTURE_AT).document;
  run('decision.save', {id: 'ADR-003', category: 'cross-cutting'});
  const adr4 = run('decision.save', {question: 'Where should statements be produced?', context: 'Statements are produced overnight today.', category: 'trade-off', driverIds: ['QD-001', 'QD-002'], requirementGroupIds: [themeGroup], owner: 'Architecture lead', rationale: 'Statements on demand spread the load.', source: 'Synthetic design workshop'});
  run('decision.alternative', {id: adr4, title: 'Produce statements on demand', summary: 'Each statement is built when asked for.', benefits: 'No nightly peak.', costs: 'More reads in the day.', consequences: 'The ledger answers enquiries.', assessments: {'QD-001': {effect: 'tension', reason: 'Adds reads at peak.'}, 'QD-002': {effect: 'supports', reason: 'No batch to fail.'}}});
  run('decision.alternative', {id: adr4, title: 'Produce statements overnight', summary: 'A batch builds every statement.', benefits: 'Predictable load.', costs: 'A nightly window.', consequences: 'The batch stays.', assessments: {'QD-001': {effect: 'supports', reason: 'No reads at peak.'}, 'QD-002': {effect: 'tension', reason: 'The batch can fail.'}}});
  const adr5 = run('decision.save', {question: 'How should notices reach customers?', context: 'Notices are letters today.', category: 'additional', owner: 'Architecture lead', source: 'Synthetic design workshop'});
  run('decision.save', {question: 'Which identity provider do staff use?', context: 'Staff sign in twice today.', owner: 'Architecture lead', source: 'Synthetic design workshop'});
  // Chapters 4 and 5: a responsibility that answers a group; a supporting allocation; component properties and containers.
  run('logical.responsibility', {id: 'api', requirementGroupIds: [posting]});
  const support = p.logical.mappings.find(m => m.logicalId === 'risk');
  run('logical.mapping', {id: support.id, logicalId: 'risk', physicalId: support.physicalId, role: 'realises'});
  run('logical.mapping', {logicalId: 'risk', physicalId: 'api-pod', role: 'supports', scope: 'Calls the risk check before posting.'});
  run('realisation.component', {id: 'api-pod', properties: [{concern: 'availability', statement: 'Stays up through a zone loss.', mechanism: 'Two zones.', source: 'Design workshop'}], architecturalSolution: 'Stateless service behind a queue.', patternIds: ['P-CHECK-POINTED-SYSTEM'], containerId: 'tr-001'});
  run('realisation.component', {id: 'risk-engine', properties: [{concern: 'QD-001', statement: 'Answers within the posting budget.', mechanism: 'Caches the reference data.', source: 'Load test plan'}], containerId: 'tr-001'});
  run('realisation.component', {id: 'core-adapter', containerId: 'tr-002', architecturalSolution: 'Adapter to the ledger.'});
  // Chapter 8: a party with its integration fields, one left open; a data definition owned through its authority.
  run('interfaces.party', {id: 'ext-network', kind: 'payment network', status: 'current', source: 'Scheme rulebook, section 4', protocols: 'Messages over a private link', securityConsiderations: 'Signed messages and a private link.', challenges: 'Cut-off times differ by currency.', facilitation: 'A queue absorbs the scheme’s windows.'});
  run('interfaces.data', {id: 'posting', authorityId: 'core-adapter', personalData: 'yes'});
  // Chapter 9: a critical threat. Chapter 10: a plan's targets and schedule.
  run('security.threat', {id: 'thr-001', priority: 'Critical'});
  run('runtime.plan', {id: 'run-002', lossMinutes: '30', targets: [{kind: 'availability', driverId: 'QD-002', operator: 'At least', value: '99.5', window: 'Calendar month', basis: 'Vendor service level'}, {kind: 'latency', driverId: 'QD-001', operator: 'At most', value: '200', unit: 'ms'}], schedule: {serviceHours: 'Every day, all day', batchWindows: [{name: 'End of day', start: '23:00', end: '01:30', timeZone: 'UTC', cutOff: '22:30', contents: 'Settlement files', onlineDuring: 'Posting and enquiry'}]}});
  // Chapter 11: the narrative, a delivery obligation, plateaus with a component placed, and a domain lens.
  review('narrative', {title: 'Synthetic core platform — Solution Design', owner: 'Synthetic architecture group', audience: 'Delivery and review teams', summary: 'A real-time core platform for accounts, postings and statements.', scope: 'Accounts, postings and statements; cards are out of scope.', approach: 'Attribute-driven design from the workbook.', confirmed: false});
  review('action', {title: 'Prove the posting response time', owner: 'Delivery lead', due: '2027-03-31', acceptance: 'A load test at twice the peak meets the target.', objectIds: ['api-pod']});
  review('plateau', {title: 'As is', kind: 'current', order: 1, purpose: 'The design as it runs today.'});
  review('plateau', {title: 'Real-time posting', kind: 'transition', order: 2, due: '2027-06-30', purpose: 'Postings in real time.'});
  review('plateau', {title: 'Target', kind: 'target', order: 3, due: '2027-12-31'});
  review('plateau-assign', {objectId: 'api-pod', introducedIn: 'PLT-002'});
  review('plateau-assign', {objectId: 'core-adapter', introducedIn: 'PLT-002', retiredIn: 'PLT-003'});
  p = applyLensCommand(p, {type: 'lens.choose', payload: {lensId: 'core-banking', reason: 'This synthetic project is a core-banking platform.'}}, FIXTURE_AT, ARCHITECT).document;
  return {document: withFinalReview(p), ids: {posting, domainGroup, themeGroup, bd, fd, cd, od, dd, te, bc, adr4, adr5}, manifest: imported.manifest};
}

// A fully written synthetic architecture for the SDD content reader. This extends the deliberately incomplete
// rich fixture in memory; its added prose and choices are test data, not a client design or a human review.
export async function contentReadySyntheticProject() {
  const fixture = await richProject(), p = fixture.document;
  for (const d of p.quality.drivers) {
    if (!d.description) d.description = `This synthetic project carries ${d.title.toLowerCase()} as a concern for the instruction path. The outcome must remain traceable across the recorded boundary.`;
    if (!d.impact) d.impact = `The design assigns ${d.title.toLowerCase()} to the payment boundary and its recovery path.`;
    if (!d.priority) { d.priority = 'High'; d.rationale = 'The synthetic brief treats uninterrupted operations as a design priority.'; }
  }
  for (const d of p.decisions.records) {
    if (!d.driverIds?.length) d.driverIds = [p.quality.drivers[0].id];
    if (!d.alternatives.length) {
      const notices = d.id === 'ADR-005', n = notices ? 9 : 11;
      const a = structuredClone(p.decisions.records[0].alternatives[0]), b = structuredClone(p.decisions.records[0].alternatives[1]);
      d.alternatives = [
        Object.assign(a, {id: 'ALT-' + String(n).padStart(3, '0'), title: notices ? 'Send an outcome event' : 'Use a shared identity service', summary: notices ? 'Send notice only after the outcome is recorded.' : 'Check staff identity through the shared identity boundary.', consequences: notices ? 'The notification worker owns delivery retries.' : 'The platform needs a current identity service.', costs: 'An owned integration is required.'}),
        Object.assign(b, {id: 'ALT-' + String(n + 1).padStart(3, '0'), title: notices ? 'Send directly from the payment request' : 'Keep separate local sign-in', summary: notices ? 'Hold the request while the notice service responds.' : 'Maintain a password store for the platform.', consequences: 'A second failure path must be supported.', costs: 'A longer support and recovery path.', rejectionReason: 'It adds another failure path to the instruction journey.'})
      ];
      d.alternatives[0].assessments['QD-001'] = {effect: 'supports', reason: 'The synthetic scenario keeps a traceable operation when this boundary is used.'};
    }
    if (!d.selectedAlternativeId) d.selectedAlternativeId = d.alternatives[0].id;
    if (!d.rationale) d.rationale = 'The draft favours the selected approach because it gives the linked quality concern an explicit owner.';
    if (!d.impact && !d.appliedImpact) d.impact = 'The selected component must own the boundary and its failure response.';
    for (const a of d.alternatives) if (a.id !== d.selectedAlternativeId && !a.rejectionReason) a.rejectionReason = 'It adds an operating burden that the selected approach avoids.';
  }
  const responsibilities = {
    'api-pod': 'The payment service accepts an instruction with its original reference. It records the accepted state before acknowledging the caller. It keeps an uncertain downstream outcome pending for enquiry.',
    'risk-engine': 'The risk engine screens an instruction against the current ruleset. It returns an explicit allow or hold response to the payment service. It records which ruleset produced the response.',
    'core-adapter': 'The core connector maps each posting request to the ledger contract. It preserves the original reference across a retry. It enquires about an uncertain posting before another state change.',
    worker: 'The settlement worker owns the downstream handoff of accepted instructions. It retains the pending state during an uncertain response. It reconciles the external outcome before a replay.',
    'notify-worker': 'The notification worker consumes a recorded outcome event. It sends the result without blocking settlement. It retries notification delivery without changing the financial outcome.'
  };
  for (const c of p.realisation.components) if (responsibilities[c.id]) c.purpose = responsibilities[c.id];
  for (const x of p.interfaces.parties) {
    if (!x.protocols) x.protocols = 'Requests and responses use a private HTTPS endpoint.';
    if (!x.securityConsiderations) x.securityConsiderations = 'The integration authenticates both endpoints and protects references in transit.';
  }
  return fixture;
}

// ---------------------------------------------------------------- the rich project at depth
// The rich project with the records workstreams D4 (records at depth) and E (the architecture drafter) add, each saved
// through its chapter's command, for the SDD's readers of them (GR-SDD-14, GR-SDD-26, GR-SDD-28): two invariants (one
// with its owner not stated) bound to the posting data and its contracts; an end-of-day chain of three batch contracts
// (the last saying only when it runs) in a runtime plan's batch window; a lifecycle transition moved by time; a dual
// control with its maker named and its checker not, parameters and requirements of mixed delivery; a plan resting on
// requirements; a path needed at start-up; responsibilities that realise and serve journey steps, one step a supporting
// process; a scheduling capability needed by a component; a realisation's targets and the requirement fit of its chosen
// option; requirement groups placed on plateaus by delivery status and by a person; a migration record with its rehearsal
// not stated; two retired records, one of them a requirement; and records Sol drafted (marked as the drafter marks them) that no person has reviewed.
export async function depthProject() {
  const {document: rich, ids} = await richProject();
  let p = rich;
  const run = (type, payload, actor = ARCHITECT) => { const r = applyCanonical(p, {type, payload}, FIXTURE_AT, actor); p = r.document; return r.selected; };
  const review = (type, payload = {}, actor = ARCHITECT) => { const r = applyFinalReviewCommand(p, {type: 'review.' + type, payload}, FIXTURE_AT, actor); p = r.document; return r.selected; };
  const reqs = p.artefacts.filter(a => a.type === 'requirement'), delivered = reqs.find(a => /^delivered$/i.test(a.assessment?.delivery || '')), partly = reqs.find(a => /partial|partly/i.test(a.assessment?.delivery || ''));
  // Chapter 8: invariants, a time-driven transition and the end-of-day chain.
  const inv1 = run('interfaces.invariant', {title: 'Postings balance', condition: 'For every posting, debits equal credits.', kind: 'balance', dataIds: ['posting'], contractIds: ['posting-api'], check: 'Reconcile debits and credits at the end of each day.', owner: 'Finance operations'});
  const inv2 = run('interfaces.invariant', {title: 'One posting per instruction', condition: 'An instruction posts once, whatever is repeated.', kind: 'uniqueness', dataIds: ['posting', 'instruction'], contractIds: ['if-005'], check: 'The repeat key is unique per instruction.', open: {owner: {state: 'not-stated'}}});
  run('interfaces.data', {id: 'settlement', lifecycle: {field: 'status', states: ['PENDING', 'SETTLED', 'FAILED', 'EXPIRED'], transitions: [{from: 'PENDING', to: 'SETTLED', contractId: 'network'}, {from: 'PENDING', to: 'EXPIRED', trigger: {kind: 'schedule', schedule: 'End of day after five business days'}}]}});
  const batch = (title, extra) => run('interfaces.contract', {title, kind: 'batch', from: 'worker', to: 'ext-core', exchanges: [{dataId: 'posting', role: 'request'}], ...extra});
  const close = batch('Close the business day', {batchTrigger: 'calendar', batchSchedule: 'Each business day', batchWindow: '22:00 to 23:00 UTC', cutOff: '21:45', restartPoint: 'The last committed branch', volume: '2 million postings'});
  const interest = batch('Accrue interest', {batchTrigger: 'event', batchSchedule: 'When the day is closed', batchWindow: '23:00 to 00:30 UTC', cutOff: '23:00', predecessorIds: [close], restartPoint: 'The last account processed', volume: '9 million accounts'});
  const statements = batch('Produce statements', {batchTrigger: 'time', batchSchedule: '01:00 daily', predecessorIds: [interest]});
  run('runtime.plan', {id: 'run-004', schedule: {serviceHours: 'Every day, all day', batchWindows: [{name: 'End of day', start: '22:00', end: '01:30', timeZone: 'UTC', cutOff: '21:45', contents: 'The end-of-day chain', contractIds: [close, interest], onlineDuring: 'Enquiry'}]}});
  // Chapter 9: a dual control with its maker named, parameters, and requirements of mixed delivery.
  const dual = run('security.control', {title: 'Maker-checker on posting release', category: 'Dual control & segregation of duties', purpose: 'No posting leaves on one person’s word.', owner: 'Payments operations', enforcement: 'The release step', mechanism: 'A second officer approves each release.', targetIds: ['core-adapter', 'worker'], threatIds: ['thr-001'], makerRole: 'Payments officer', parameters: [{name: 'Release limit', value: '10000', unit: 'EUR'}, {name: 'Approval window', value: ''}], requirementIds: [delivered.id, partly.id]});
  // Chapter 10: a plan that rests on requirements, and a path needed at start-up.
  run('runtime.plan', {id: 'run-003', requirementIds: [partly.id]});
  run('runtime.path', {id: 'RP-005', startup: 'needed'});
  // Chapter 4 and Chapter 1: responsibilities that realise and serve journey steps (on the reference model a step is drawn
  // as the process node of its title, so the last step takes the node's title); a step of a supporting process.
  run('artefact', {id: 'JRN-005', title: 'Confirm outcome'});
  run('logical.connection', {from: 'api', to: 'initiate', label: 'takes the instruction', kind: 'realises'});
  run('logical.connection', {from: 'notify', to: 'confirm', label: 'tells the customer', kind: 'serves'});
  run('artefact', {id: 'JRN-004', processKind: 'supporting'});
  // Chapter 6: a scheduling capability (a round-12 category) the worker needs.
  const scheduler = run('technology.capability', {title: 'End-of-day runner', category: 'scheduling', purpose: 'Runs the end-of-day chain on time.', boundary: 'Starts and watches batch runs only.', owner: 'Platform team', rationale: 'The batch chain needs a scheduler.', source: 'Design workshop', boundaryId: 'tb-002', failureDomain: 'Zone A'});
  const workerNeeds = p.technology.needs.filter(n => n.applicationId === 'worker').map(n => ({id: n.id, category: n.category, description: n.description, criticality: n.criticality}));
  run('technology.needs', {applicationId: 'worker', needs: [...workerNeeds, {category: 'scheduling', description: 'Runs the end-of-day chain.', criticality: 'essential'}]});
  run('technology.capability', {id: scheduler, mappings: [{needId: p.technology.needs.find(n => n.applicationId === 'worker' && n.category === 'scheduling').id, scope: 'Starts the end-of-day chain on time.'}]});
  // Chapter 7: a realisation's targets and the requirement fit of its chosen option.
  const tr = (type, payload) => { p = applyTechnologyRealisationCommand(p, {type: 'techrealisation.' + type, payload}, FIXTURE_AT, ARCHITECT).document; };
  tr('plan', {id: 'tr-001', requirementGroupIds: [ids.domainGroup], targets: [{kind: 'availability', driverId: 'QD-002', operator: 'At least', value: '99.9', window: 'a calendar month'}]});
  const opt = p.technologyRealisation.records.find(r => r.id === 'tr-001').options[0].id;
  tr('assessment', {id: 'tr-001', optionId: opt, criterionId: ids.domainGroup, coverage: 'configurable', reason: 'Read against the group.', evidence: 'Vendor documentation review'});
  tr('preference', {id: 'tr-001', optionId: opt});
  // Chapter 11: groups on plateaus (by delivery status and by a person) and a migration record with its rehearsal open.
  review('plateau-group', {groupId: ids.domainGroup, plateauId: 'PLT-002', basis: 'delivery status'});
  review('plateau-group', {groupId: ids.themeGroup, plateauId: 'PLT-003', basis: 'person'});
  const migration = review('migration', {title: 'Move postings off the batch ledger', source: 'The batch ledger', target: 'The real-time core', scope: 'Accounts and postings', volumes: '2 million accounts, 9 million postings a month', reconciliation: 'Balances and postings compared each night', parallelRun: 'Two weeks side by side', rollback: 'Route the channel back to the batch ledger', rehearsal: '', open: {rehearsal: {state: 'not-stated'}}, plateauIds: ['PLT-001', 'PLT-002'], actionIds: ['RA-001']});
  // Records retired with their reasons: an assumption, and an imported requirement no record names (a duplicate row).
  const assumption = run('artefact', {type: 'assumption', title: 'The weekend batch runs as today', description: 'Weekend processing keeps its current window.'});
  p = applyRecordCommand(p, {type: 'record.retire', payload: {ids: [assumption], chapter: 1, reason: 'The weekend batch is replaced by the end-of-day chain.'}}, FIXTURE_AT, ARCHITECT).document;
  const named = new Set(JSON.stringify({...p, artefacts: null, requirementGroups: null, retired: null}).match(/REQ-\d+/g)), listed = new Set((p.requirementGroups?.records || []).flatMap(g => g.memberIds || []));
  const duplicate = p.artefacts.find(a => a.type === 'requirement' && a.provenance?.datasetId && !named.has(a.id) && !listed.has(a.id)).id;
  p = applyRecordCommand(p, {type: 'record.retire', payload: {ids: [duplicate], chapter: 1, reason: 'A duplicate of another row.'}}, '2026-10-08T09:30:00.000Z', ARCHITECT).document;
  // Records Sol drafted that no person has reviewed: the drafter's own mark (architecture-drafter.js markDrafted).
  p = withFinalReview(p);
  const mark = key => ({by: 'sol', kind: 'sol-draft', job: 'fixture-draft', key, bundle: 'fixture-bundle', reviewed: false, appliedBy: ARCHITECT, appliedAt: FIXTURE_AT, groups: [], cites: []});
  markDrafted(p.interfaces.invariants.find(r => r.id === inv2), mark('fixture.invariant'));
  markDrafted(p.interfaces.contracts.find(c => c.id === statements), mark('fixture.statements'));
  return {document: withFinalReview(p), ids: {...ids, inv1, inv2, close, interest, statements, dual, scheduler, migration, assumption, duplicate, delivered: delivered.id, partly: partly.id}};
}

// ---------------------------------------------------------------- the large project
// The design a grouped 1,400-requirement project holds (the round-12 performance review of the owner's project: 65
// responsibilities, 87 contracts, 294 data fields, 187 logical connections and thousands of Chapter 1 relationships),
// built through the command appliers with each result handed to the next command (document-memo.js handOver), as
// scripts/build-scale-fixture.mjs builds its 500-per-chapter project. The groups are made first, by rule on the
// workbook's columns (domain, capability theme, user group, and functional areas over several domains), the design
// links them, and the workbook is imported last, so its 1,400 requirements join the groups by their attributes: a
// design command's cost grows with the requirements a group link reaches (requirement-links.js reads the group index
// afresh on a document outside a pass), and the suite is about the document, not the commands.
export async function largeProject({rows = 1400, log = () => {}} = {}) {
  const t0 = performance.now();
  const [{applyCommand}, {applyQualityCommand}, {applyLogicalCommand}, {applyRealisationCommand}, {applyTechnologyCommand, TECHNOLOGY_CATEGORIES}, {applyTechnologyRealisationCommand}, {applyInterfacesCommand}, {applySecurityCommand, THREAT_CATEGORIES, CONTROL_CATEGORIES}, {applyRuntimeCommand}, {handOver}] = await Promise.all(['requirements-domain', 'quality-domain', 'logical-domain', 'realisation-domain', 'technology-domain', 'technology-realisation-domain', 'interfaces-domain', 'security-domain', 'runtime-domain', 'document-memo'].map(m => import('./public/' + m + '.js')));
  let p = createProject({name: 'Synthetic large platform', template: 'blank'}, 'synthetic-large', FIXTURE_AT);
  const at = FIXTURE_AT, n3 = i => String(i).padStart(3, '0'), pick = (xs, i) => xs[i % xs.length];
  const cost = {}, step = (apply, type, payload) => { const t = performance.now(), r = apply(handOver(p), {type, payload}, at, ARCHITECT); p = r.document; const c = cost[type] ||= {n: 0, ms: 0}; c.n++; c.ms += performance.now() - t; return r.selected; };
  const settle = label => { p = withFinalReview(p); log(label + ' · ' + Math.round(performance.now() - t0) + ' ms'); };
  p = applyCommand(p, {type: 'brief', payload: {problem: 'A synthetic core platform of the size of a real core-banking programme: accounts, lending, payments, ledger and reporting for many branches.', goal: 'Replace the batch core with a platform that posts in real time.', source: 'Synthetic brief for the size suite'}}, at).document;
  // The groups, by rule on the columns the workbook fills (its manifest says which values it holds): about 60.
  const {manifest} = syntheticWorkbook({rows}), distinct = k => [...new Set(manifest.rows.map(r => r[k]).filter(Boolean))];
  const group = payload => { p = applyRequirementsCommand(handOver(p), {type: 'requirements.group', payload}, at, ARCHITECT).document; };
  const domains = distinct('domain');
  for (const v of domains) group({title: v, kind: 'domain', rule: [{field: 'domain', value: v}]});
  for (const v of distinct('theme')) group({title: v, kind: 'theme', rule: [{field: 'capabilityTheme', value: v}]});
  for (const v of distinct('group')) group({title: 'Requirements of the ' + v, kind: 'user-group', rule: [{field: 'userGroup', value: v}]});
  for (let i = 1; p.requirementGroups.records.length < 60; i++) group({title: 'Functional area ' + n3(i), kind: 'functional-area', rule: [{field: 'domain', op: 'is one of', values: [pick(domains, i), pick(domains, i + 5)]}]});
  settle('groups');
  const groups = p.requirementGroups.records.map(g => g.id);
  // Chapter 1 records beside the requirements: actors, stakeholders, outcomes, journey steps, constraints, assumptions.
  const actors = [], outcomes = [], steps = [];
  for (let i = 1; i <= 12; i++) actors.push(step(applyCommand, 'artefact', {type: i % 3 ? 'actor' : 'stakeholder', title: 'User role ' + n3(i), description: 'A synthetic user role.', owner: 'Business owner ' + (i % 4 + 1), category: ['staff-role', 'partner', 'customer', 'external-organisation', 'regulator'][i % 5], role: 'Role ' + i, motivations: i % 2 ? 'Quick answers.' : '', usage: 'Daily.'}));
  for (let i = 1; i <= 10; i++) outcomes.push(step(applyCommand, 'artefact', {type: 'outcome', title: 'Outcome ' + n3(i), description: 'A synthetic business outcome.', owner: 'Business owner ' + (i % 4 + 1), problem: 'Problem ' + i + ' costs time.', measure: 'Hours per month', target: 'Halved'}));
  for (let i = 1; i <= 20; i++) steps.push(step(applyCommand, 'artefact', {type: 'journey', title: 'Journey step ' + n3(i), description: 'Step ' + i + ' of the synthetic journey.', owner: 'Business owner 1'}));
  for (let i = 1; i <= 8; i++) step(applyCommand, 'artefact', {type: i % 2 ? 'constraint' : 'assumption', title: (i % 2 ? 'Constraint ' : 'Assumption ') + n3(i), description: 'A synthetic ' + (i % 2 ? 'constraint' : 'assumption') + '.', owner: 'Architecture lead'});
  settle('Chapter 1');
  // Chapter 2: 35 drivers of the eight kinds, each linking groups.
  const kinds = ['business', 'functional', 'functional', 'functional', 'quality', 'quality', 'quality', 'quality', 'constraint', 'operational', 'data', 'technology-evolution', 'business-continuity'], cats = ['availability', 'performance', 'integrity', 'security', 'recoverability', 'scalability', 'traceability', 'maintainability'];
  const drivers = [];
  for (let i = 1; i <= 35; i++) { const kind = pick(kinds, i), quality = kind === 'quality'; drivers.push(step(applyQualityCommand, 'quality.driver', {kind, title: 'Driver ' + n3(i) + ' of the platform', description: 'What driver ' + i + ' asks of the platform.', impact: i % 6 ? 'Shapes the design of area ' + (i % 9 + 1) + '.' : '', priority: ['High', 'Medium', 'Low', ''][i % 4], rationale: 'The workbook ranks it.', requirementGroupIds: [pick(groups, i), pick(groups, i + 17)], ...(quality ? {category: pick(cats, i), stimulus: 'A peak of work ' + i, response: 'It is handled in time', metric: 'Response time', operator: 'At most', targetValue: String(200 + i * 10), unit: 'ms', window: i % 3 ? 'Peak hour' : '', measurement: i % 2 ? 'Load test' : ''} : {})})); }
  settle('Chapter 2');
  // Chapter 3: 40 decisions in the five categories with two or three alternatives each, most chosen.
  const categories = ['foundational', 'structural', 'cross-cutting', 'trade-off', 'additional', ''];
  for (let i = 1; i <= 40; i++) {
    const id = step(applyDecisionCommand, 'decision.save', {question: 'How should area ' + n3(i) + ' be built?', context: 'Area ' + i + ' of the platform.', category: pick(categories, i), requirementGroupIds: [pick(groups, i)], driverIds: [pick(drivers, i), pick(drivers, i + 3)], owner: 'Architecture lead ' + (i % 4 + 1), rationale: i % 5 ? 'The drivers lean to it.' : '', source: 'Synthetic design workshop', impact: i % 3 ? 'Changes area ' + i + '.' : ''});
    for (let k = 1; k <= 2 + (i % 2); k++) step(applyDecisionCommand, 'decision.alternative', {id, title: 'Option ' + k + ' for area ' + n3(i), summary: 'Option ' + k + '.', benefits: 'Benefit ' + k + '.', costs: 'Cost ' + k + '.', consequences: 'Consequence ' + k + '.', rejectionReason: k > 1 ? 'Costs more than option 1.' : ''});
    if (i % 4) { const alt = p.decisions.records.find(d => d.id === id).alternatives[0].id; step(applyDecisionCommand, 'decision.choose', {id, alternativeId: alt}); }
  }
  settle('Chapter 3');
  // Chapter 4: 65 responsibilities, each answering a group, chained by 187 connections.
  const resp = [];
  for (let i = 1; i <= 65; i++) resp.push(step(applyLogicalCommand, 'logical.responsibility', {title: 'Responsibility ' + n3(i), purpose: 'Owns area ' + i + ' of the platform.', boundary: 'Keeps the records of area ' + i + '.', owner: 'Delivery team ' + (i % 9 + 1), source: 'Synthetic design', requirementGroupIds: [pick(groups, i)], requirementIds: [], decisionIds: [], confirmed: i % 3 === 0}));
  for (let i = 0; i < 187; i++) { const from = pick(resp, i), to = pick(resp, (i * 7 + 3) % resp.length); if (from !== to) step(applyLogicalCommand, 'logical.connection', {from, to, label: 'hands work ' + n3(i + 1) + ' to', kind: i % 2 ? 'flow' : 'trace', condition: ''}); }
  // Each driver is carried by two responsibilities, as an attribute-driven design traces its drivers.
  drivers.forEach((id, i) => step(applyQualityCommand, 'quality.driver', {id, responsibilityIds: [pick(resp, 2 * i), pick(resp, 2 * i + 1)]}));
  settle('Chapter 4');
  // Chapter 5: 26 components, each realising two or three responsibilities; Chapter 6 and 7: needs, capabilities and
  // the realisations the components run in (containers).
  const comps = [], ckinds = ['service', 'worker', 'adapter', 'store', 'module'];
  for (let i = 1; i <= 26; i++) comps.push(step(applyRealisationCommand, 'realisation.component', {title: 'Component ' + n3(i), kind: pick(ckinds, i), purpose: 'Runs area ' + i + '.', boundary: 'Owns the records of area ' + i + '.', owner: 'Delivery team ' + (i % 9 + 1), inputs: 'Requests of area ' + i, outputs: 'Results of area ' + i, rationale: 'Allocated from its responsibilities.', source: 'Synthetic design', technologyNeeds: 'Compute and storage.', status: 'draft', allocations: resp.filter((_, k) => k % 26 === i - 1).map(id => ({logicalId: id, scope: 'All of it'})), dataIds: [], decisionIds: []}));
  for (let i = 1; i < comps.length; i++) step(applyRealisationCommand, 'realisation.interaction', {from: comps[i - 1], to: comps[i], label: 'passes work to', interaction: 'data', condition: '', failure: ''});
  settle('Chapter 5');
  const tcats = TECHNOLOGY_CATEGORIES.map(c => c[0]), bounds = p.technology.boundaries.map(b => b.id);
  if (!bounds.length) bounds.push(step(applyTechnologyCommand, 'technology.boundary', {title: 'Platform boundary', owner: 'Platform team', policy: 'Only service identities cross it.'}));
  comps.forEach((id, k) => step(applyTechnologyCommand, 'technology.needs', {applicationId: id, boundaryId: pick(bounds, k), needs: [{category: pick(tcats, k), description: 'Component ' + (k + 1) + ' needs ' + pick(tcats, k) + '.', criticality: 'essential'}, {category: pick(tcats, k + 3), description: 'Component ' + (k + 1) + ' also needs ' + pick(tcats, k + 3) + '.', criticality: 'degraded'}], confirmed: k % 2 === 0}));
  const needs = p.technology.needs.map(n => n.id), caps = [];
  for (let i = 1; i <= 30; i++) caps.push(step(applyTechnologyCommand, 'technology.capability', {title: 'Capability ' + n3(i), category: pick(tcats, i), purpose: 'Meets platform needs.', boundary: 'One shared platform service.', owner: 'Platform team ' + (i % 6 + 1), rationale: 'Sized for the peak.', source: 'Synthetic platform catalogue', boundaryId: pick(bounds, i), failureDomain: 'Region ' + (i % 3 + 1), alternateDomain: '', continuity: 'single', status: 'draft', driverIds: [pick(drivers, i)], decisionIds: [], mappings: needs.filter((_, k) => k % 30 === i - 1).map(needId => ({needId, scope: 'Whole need'}))}));
  const realisations = [];
  for (let i = 1; i <= 30; i++) realisations.push(step(applyTechnologyRealisationCommand, 'techrealisation.plan', {title: 'Runtime ' + n3(i), purpose: 'Provides capability ' + i + '.', owner: 'Platform team ' + (i % 6 + 1), operationsPlan: 'On-call rota.', accessPlan: 'Service identities only.', dataPlan: 'Encrypted at rest.', resiliencePlan: 'Two zones.', interfacePlan: 'Published contract.', lifecyclePlan: 'Release train.', rationale: '', risks: '', assumptions: '', mappings: [{capabilityId: caps[i - 1], scope: 'Whole capability'}]}));
  // Containers: eight realisations hold the components, three or four each; two components are left to be derived.
  comps.forEach((id, k) => { if (k < 24) step(applyRealisationCommand, 'realisation.component', {id, containerId: realisations[k % 8], properties: k % 3 ? [] : [{concern: 'availability', statement: 'Survives a zone loss.', mechanism: 'Two zones.', source: 'Design'}], architecturalSolution: k % 4 ? 'Service with its own store.' : ''}); });
  settle('Chapters 6 and 7');
  // Chapter 8: 100 data definitions with 294 fields, 15 parties with integration fields, 87 contracts with exchanges: the
  // first 30 between a party and a component (each party calls the platform once and is called once), so that the
  // context names its external systems.
  const data = [];
  for (let i = 1; i <= 100; i++) {
    const id = step(applyInterfacesCommand, 'interfaces.data', {title: 'Record ' + n3(i), purpose: 'The record of area ' + i + '.', owner: 'Data owner ' + (i % 5 + 1), authorityId: pick(comps, i), classification: ['Internal', 'Confidential', 'Restricted'][i % 3], retentionPolicy: i % 6 ? 'Kept for seven years.' : '', retentionBasis: '', retentionDays: '', protection: 'Masked in support views.', evidence: 'Synthetic data catalogue', assumptions: i % 4 ? '' : 'Volumes grow 10% a year.'});
    data.push(id);
    for (let f = 0; f < (i <= 94 ? 3 : 0); f++) step(applyInterfacesCommand, 'interfaces.field', {id, field: {name: ['recordId', 'reference', 'amount'][f], type: 'string', description: 'Field ' + f + ' of record ' + i + '.', key: f === 0, required: f === 0, classification: 'Inherited', example: 'demo-' + i}});
  }
  const parties = [];
  for (let i = 1; i <= 15; i++) parties.push(step(applyInterfacesCommand, 'interfaces.party', {title: 'External system ' + n3(i), purpose: i % 4 ? 'Exchanges work with the platform.' : '', ...(i % 4 ? {} : {open: {purpose: {state: 'not-stated'}}}), owner: 'Partner ' + i, kind: ['payment network', 'regulator', 'channel', 'vendor platform', 'shared internal service'][i % 5], status: 'current', source: 'Synthetic integration list', protocols: i % 2 ? 'Messages over a private link' : '', securityConsiderations: i % 3 ? 'Signed messages.' : '', challenges: i % 5 ? 'Different cut-off times.' : '', facilitation: 'A queue between the two.'}));
  for (let i = 1; i <= 87; i++) { const k = (i - 1) % comps.length, party = i <= 30 ? parties[(i - 1) % 15] : null, ends = party ? (i <= 15 ? [party, comps[k]] : [comps[k], party]) : [comps[k], comps[(k + 1 + (i % 5)) % comps.length]]; step(applyInterfacesCommand, 'interfaces.contract', {title: 'Contract ' + n3(i), kind: 'request', from: ends[0], to: ends[1], exchanges: [{dataId: pick(data, i), role: 'request'}, {dataId: pick(data, i + 1), role: 'response'}], purpose: 'Passes work ' + i + ' on.', owner: 'Integration team ' + (i % 4 + 1), protocol: 'HTTPS / JSON', operation: 'POST /work/' + i, contractVersion: '1.0', correlationKey: 'recordId', idempotencyKey: i % 7 ? 'recordId' : '', duplicatePolicy: i % 7 ? 'Return the first outcome.' : '', timeoutMs: '', timeoutBasis: '', timeoutPolicy: 'Keep pending; enquire before replay.', retryPolicy: 'Retry after enquiry only.', failurePolicy: 'Distinguish rejection from an unknown outcome.', authorization: 'Service identity', transport: 'mTLS', compatibility: '', evidence: '', assumptions: ''}); }
  settle('Chapter 8');
  // Chapter 9: 30 threats on the data and 40 controls answering them.
  const threats = [];
  for (let i = 1; i <= 30; i++) threats.push(step(applySecurityCommand, 'security.threat', {title: 'Disclosure of record ' + n3(i), category: pick(THREAT_CATEGORIES, i), priority: ['Critical', 'High', 'Moderate', 'Low'][i % 4], targetIds: [pick(data, i)], actor: 'An operator without need to know', scenario: 'Reads record ' + i + ' in a support view.', consequence: 'Personal data escapes its audience.', owner: i % 8 ? 'Security officer ' + (i % 3 + 1) : '', priorityBasis: 'Regulated data.', assumptions: ''}));
  for (let i = 1; i <= 40; i++) step(applySecurityCommand, 'security.control', {title: 'Protect record ' + n3(i), category: pick(CONTROL_CATEGORIES, i), failureMode: 'Deny or contain', targetIds: [pick(data, i)], threatIds: [pick(threats, i)], purpose: 'Limits who reads record ' + i + '.', owner: 'Security officer ' + (i % 3 + 1), enforcement: 'Support view', mechanism: 'Field masking', failureResponse: 'Deny the view.', telemetry: 'Access log', verificationPlan: 'Quarterly access review', operatingObligations: '', assumptions: ''});
  settle('Chapter 9');
  // Chapter 10: three environments running every component, three zones each, with placements.
  for (let e = 1; e <= 3; e++) {
    const environmentId = step(applyRuntimeCommand, 'runtime.environment', {title: ['Production', 'Recovery site', 'Pre-production'][e - 1], stage: ['Production design', 'Recovery design', 'Pre-production design'][e - 1], purpose: 'Runs the platform.', owner: 'Run team ' + e, basis: 'Two-site design.', confirmed: e === 1, assetIds: comps});
    const zones = [];
    for (let z = 1; z <= 3; z++) zones.push(step(applyRuntimeCommand, 'runtime.zone', {environmentId, title: 'Zone ' + e + '.' + z, owner: 'Run team ' + e, failureDomain: 'Site ' + e, isolation: 'Own cluster.', boundaryId: pick(bounds, z)}));
    if (e === 1) for (const [k, plan] of p.runtime.plans.filter(r => r.environmentId === environmentId).entries()) step(applyRuntimeCommand, 'runtime.placement', {planId: plan.id, zoneId: pick(zones, k), role: 'active', replicas: 2, basis: 'Peak plus one.', confirmed: k % 3 === 0});
  }
  settle('Chapter 10');
  // The workbook, imported last: its requirements join the groups by their attributes; then the relationships a grouped
  // design keeps (each requirement needed by a journey step and serving an outcome).
  const imported = await syntheticImport(p, {rows, filename: 'Synthetic-requirements-' + rows + '.xlsx', choice: {domain: false, capabilityTheme: false}});
  p = imported.document; settle('import');
  const reqs = p.artefacts.filter(a => a.type === 'requirement').map(a => a.id);
  for (let i = 0; i < reqs.length; i++) { step(applyCommand, 'relationship', {from: pick(steps, i), to: reqs[i], kind: 'requires'}); step(applyCommand, 'relationship', {from: reqs[i], to: pick(outcomes, i), kind: 'supports'}); }
  settle('relationships');
  p = withFinalReview(p);
  const count = xs => (xs || []).length;
  const counts = {requirements: reqs.length, groups: p.requirementGroups.records.length, chapter1Other: p.artefacts.length - reqs.length, relationships: count(p.relationships), drivers: count(p.quality.drivers), decisions: count(p.decisions.records), alternatives: p.decisions.records.reduce((n, d) => n + d.alternatives.length, 0), responsibilities: count(p.logical.responsibilities), connections: count(p.logical.connections), mappings: count(p.logical.mappings), components: count(p.realisation.components), interactions: count(p.realisation.connections), needs: count(p.technology.needs), capabilities: count(p.technology.capabilities), realisations: count(p.technologyRealisation.records), contracts: count(p.interfaces.contracts), data: count(p.interfaces.data), fields: p.interfaces.data.reduce((n, d) => n + count(d.fields), 0), parties: count(p.interfaces.parties), threats: count(p.security.threats), controls: count(p.security.controls), environments: count(p.runtime.environments), zones: count(p.runtime.zones), plans: count(p.runtime.plans), placements: count(p.runtime.placements)};
  counts.records = Object.entries(counts).filter(([k]) => k !== 'groups').reduce((n, [, v]) => n + v, 0);
  return {document: p, counts, ms: Math.round(performance.now() - t0), manifest: imported.manifest, cost: Object.fromEntries(Object.entries(cost).map(([k, c]) => [k, {n: c.n, ms: Math.round(c.ms)}]))};
}

// ---------------------------------------------------------------- a design organised by module (round 24)
export async function modularProject({rows = 1400} = {}) {
  const {document: imported} = await syntheticImport(blankProject('Synthetic modular platform'), {rows, choice: {domain: true, capabilityTheme: true, modules: true}});
  let p = applyDraftBundle(imported, draftArchitecture(imported), {at: FIXTURE_AT, actor: ARCHITECT, jobId: 'fixture-modules'}).document;
  const run = (type, payload) => { const r = applyCanonical(p, {type, payload}, FIXTURE_AT, ARCHITECT); p = r.document; return r.selected; };
  const groups = p.requirementGroups.records, mod = title => groups.find(g => g.kind === 'module' && g.title === title);
  const deposit = mod('Deposit Accounts'), tax = mod('Tax Handling'), reqOf = g => groupIndex(p).members.get(g.id)[0];
  const depositReq = reqOf(deposit), taxReq = reqOf(tax), comps = p.realisation.components, depositComp = comps.find(c => c.title === 'Deposit Accounts service'), teller = comps.find(c => c.title === 'Teller service');
  // Chapter 8: a card scheme only the deposit accounts use, with its contract, the answer it gives and an invariant on it.
  const scheme = run('interfaces.party', {title: 'Card scheme', purpose: 'Authorises card payments drawn on the deposit accounts.', kind: 'payment network', dataFormats: 'Authorisation messages', protocols: 'Messages over a private link', requirementIds: [depositReq]});
  const answer = run('interfaces.data', {title: 'Card authorisation', purpose: 'The answer the card scheme gives to a payment.', requirementIds: [depositReq]});
  const authorise = run('interfaces.contract', {title: 'Authorise a card payment', kind: 'request', from: depositComp.id, to: scheme, operation: 'authorise a card payment', exchanges: [{dataId: answer, role: 'response'}], requirementIds: [depositReq]});
  const invariant = run('interfaces.invariant', {title: 'One answer per authorisation', condition: 'Each authorisation request gets one answer.', kind: 'uniqueness', dataIds: [answer], contractIds: [authorise], check: 'The scheme reference is unique per request.'});
  // A party the deposit accounts and the tax handling share.
  const authority = run('interfaces.party', {title: 'Tax authority', purpose: 'Receives the tax withheld on the accounts.', kind: 'regulator', requirementIds: [depositReq, taxReq]});
  // Parties a person adds without links: one placed by the component its contract joins (module-scope.js
  // recordAttachments), and one that touches nothing.
  const printer = run('interfaces.party', {title: 'Statement print house', purpose: 'Prints and posts the paper statements of the deposit accounts.', kind: 'vendor platform'});
  const printJob = run('interfaces.contract', {title: 'Send the statements to print', kind: 'request', from: depositComp.id, to: printer, operation: 'send the statements to print'});
  const registry = run('interfaces.party', {title: 'Industry registry', purpose: 'Publishes the reference codes the platform reads.', kind: 'directory or identity'});
  // Chapter 5: a component no module holds, and the teller service no longer naming the drivers it serves.
  const viewer = run('realisation.component', {title: 'Archive viewer', kind: 'service', purpose: 'Shows archived statements to an auditor.'});
  run('realisation.component', {id: teller.id, serves: null});
  return {document: withFinalReview(p), ids: {deposit: deposit.id, tax: tax.id, depositReq, taxReq, depositComp: depositComp.id, teller: teller.id, scheme, answer, authorise, invariant, authority, printer, printJob, registry, viewer}};
}

// ---------------------------------------------------------------- reading the Word and PDF files back
// What a suite reads in a .docx (a zip) and a PDF the SDD writers made, independently of the writers: the parts of the
// zip, the paragraphs of word/document.xml with their styles and text, the footers and the settings; the PDF's pages
// with their size and their text (decoded through the ToUnicode map the PDF carries), its outline with each entry's
// level, and its catalog.
export function unzip(buf) {
  const b = Buffer.from(buf), out = new Map();
  let e = b.length - 22; while (e > 0 && b.readUInt32LE(e) !== 0x06054b50) e--;
  let o = b.readUInt32LE(e + 16);
  for (let i = 0, n = b.readUInt16LE(e + 10); i < n; i++) {
    const method = b.readUInt16LE(o + 10), size = b.readUInt32LE(o + 20), nameLength = b.readUInt16LE(o + 28), extra = b.readUInt16LE(o + 30), comment = b.readUInt16LE(o + 32), local = b.readUInt32LE(o + 42), name = b.toString('utf8', o + 46, o + 46 + nameLength);
    const start = local + 30 + b.readUInt16LE(local + 26) + b.readUInt16LE(local + 28), data = b.subarray(start, start + size);
    out.set(name, method === 8 ? inflateRawSync(data) : data); o += 46 + nameLength + extra + comment;
  }
  return out;
}
const unxml = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'").replace(/&amp;/g, '&');
export function docxRead(buf) {
  const z = unzip(buf), xml = z.get('word/document.xml').toString('utf8');
  const paragraphs = [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map(m => ({style: /<w:pStyle w:val="([^"]+)"/.exec(m[0])?.[1] || '', text: unxml([...m[0].matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map(t => t[1]).join(''))}));
  const footers = [...z.keys()].filter(k => /^word\/footer\d*\.xml$/.test(k)).map(k => z.get(k).toString('utf8'));
  return {names: [...z.keys()], xml, paragraphs, text: paragraphs.map(x => x.text).join('\n'), footers, settings: z.get('word/settings.xml')?.toString('utf8') || ''};
}
export function pdfRead(buf) {
  const s = Buffer.from(buf).toString('latin1'), objects = new Map(), utf16 = h => Buffer.from(h, 'hex').swap16().toString('utf16le');
  for (const m of s.matchAll(/(?:^|\n)(\d+) 0 obj\n([\s\S]*?)\nendobj(?=\n)/g)) objects.set(Number(m[1]), m[2]);
  const map = new Map();
  for (const m of s.matchAll(/beginbfchar\n([\s\S]*?)\nendbfchar/g)) for (const x of m[1].matchAll(/<([0-9A-F]{4})> <([0-9A-F]+)>/g)) map.set(x[1], utf16(x[2]));
  const decode = h => (h.match(/.{4}/g) || []).map(c => map.get(c) ?? '�').join('');
  const streamOf = ref => { const o = objects.get(ref) || '', i = o.indexOf('stream\n'); return i < 0 ? '' : o.slice(i + 7, o.lastIndexOf('\nendstream')); };
  const pages = [];
  for (const [, o] of [...objects].sort((a, b) => a[0] - b[0])) {
    if (!/\/Type \/Page /.test(o)) continue;
    const box = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(o), ops = streamOf(Number(/\/Contents (\d+) 0 R/.exec(o)?.[1]));
    pages.push({w: Number(box[1]), h: Number(box[2]), text: [...ops.matchAll(/<([0-9A-F]+)> Tj/g)].map(m => decode(m[1])).join(' ')});
  }
  const root = [...objects].find(([, o]) => /\/Type \/Outlines/.test(o))?.[0], parentOf = new Map(), titleOf = new Map(), outline = [];
  for (const [id, o] of objects) { const t = /\/Title <FEFF([0-9A-F]*)>/.exec(o), up = /\/Parent (\d+) 0 R/.exec(o); if (t && up) { titleOf.set(id, utf16(t[1])); parentOf.set(id, Number(up[1])); } }
  for (const [id, title] of [...titleOf].sort((a, b) => a[0] - b[0])) { let level = 0; for (let x = id; x !== root && parentOf.has(x); x = parentOf.get(x)) level++; outline.push({title, level}); }
  const catalog = [...objects].find(([, o]) => /\/Type \/Catalog/.test(o))?.[1] || '', links = (s.match(/\/Subtype \/Link/g) || []).length;
  return {pages, outline, catalog, links, text: pages.map(x => x.text).join('\n')};
}
