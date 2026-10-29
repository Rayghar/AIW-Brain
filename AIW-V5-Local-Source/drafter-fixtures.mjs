// A synthetic project for the architecture drafter at depth (round 12, workstream E2; drafter-groups-validate.mjs).
// Generic names only and no client text: every row below is written here. It is imported as the intake imports a
// workbook (intake-domain.js previewIntake and applyIntake, with the domain and capability-theme groups the preview
// proposes, intake-proposals.js), on a fixed clock, so the same document comes out on every run.
//   depthDraftProject({copies}): a blank project with a brief (its goals, a constraint and an exclusion) and requirement
//     rows that evidence what the drafter drafts at depth: end-of-day work (one row stating a cut-off, one a volume and
//     one a restart point), postings and reversals into the ledger, maker-checker work (one row naming its maker and
//     checker roles and an amount), regulation and a mandated technology, scheduled and searched work, shared reads of
//     another area's records, archiving, migration from a legacy system, continuity, notices, calculations shared by
//     several areas, a packaged platform, external systems, intended outcomes stated twice, delivery status and
//     priority bands, and actors from six user groups. `copies` repeats every row under new ids (a larger project of
//     the same shape, for the linear-time check).
import {createProject} from './shared/projects-domain.js';
import {previewIntake, applyIntake} from './public/intake-domain.js';
import {groupProposals, createImportGroups} from './public/intake-proposals.js';
import {withFinalReview} from './public/review-domain.js';
import {digest} from './public/brain-integrity.js';

export const DEPTH_AT = '2026-10-08T09:00:00.000Z';
export const DEPTH_BRIEF = 'The current core platform closes the business day late, keeps no change history and cannot show a regulator its evidence.\n\nGoals:\n- Post every transaction in real time.\n- Close the business day without manual work.\n- Give regulators the evidence they ask for on request.\n\nConstraints:\n- Customer data stays in the home jurisdiction.\n\nOut of scope: card issuing.';

// [domain, capability theme, user group, statement, delivery, band, intended outcome]
const D = 'Delivered', N = 'Not Delivered', P = 'Partially Delivered';
const CLOSE = 'Close the business day on time.', EVIDENCE = 'Show the regulator its evidence on request.';
export const DEPTH_ROWS = [
  // General Ledger: postings and reversals, the end-of-day posting with its cut-off.
  ['General Ledger', 'Postings and reversals', 'Finance Control', 'The system shall post the ledger entry for every cash withdrawal.', D, 'Delivered', ''],
  ['General Ledger', 'Postings and reversals', 'Finance Control', 'The system shall post the ledger entry for every cheque deposit.', N, 'Critical', ''],
  ['General Ledger', 'Postings and reversals', 'Finance Control', 'The system shall reverse the ledger entry with the original reference.', N, 'Critical', ''],
  ['General Ledger', 'Postings and reversals', 'Back Office', 'The system shall post the ledger entry in the base currency and in the account currency.', D, 'Delivered', ''],
  ['General Ledger', 'Day-end processing', 'Finance Control', 'The system shall reconcile the ledger entry against the account balance at the end of the day.', P, 'High', CLOSE],
  ['General Ledger', 'Day-end processing', 'Finance Control', 'The system shall post the accrued interest at the end of the day, with a cut-off of 18:00.', N, 'Critical', CLOSE],
  ['General Ledger', 'Day-end processing', 'Back Office', 'The system shall post the accrued interest in the day-end run for up to 2 million accounts.', D, 'Delivered', ''],
  ['General Ledger', 'Change history and audit', 'Finance Control', 'The system shall record the ledger entry with its value date and a full change history.', D, 'Delivered', ''],
  // Deposit Accounts: balances, interest, maker-checker with its roles and amount, archiving, a packaged platform.
  ['Deposit Accounts', 'Fees, charges and interest', 'Back Office', 'The system shall calculate the interest on the account balance every day.', D, 'Delivered', ''],
  ['Deposit Accounts', 'Fees, charges and interest', 'Back Office', 'The system shall calculate the account fee from the product rate.', N, 'High', ''],
  ['Deposit Accounts', 'Postings and reversals', 'Teller Floor', 'The system shall record the account balance after every posting.', D, 'Delivered', ''],
  ['Deposit Accounts', 'Search, export and reporting', 'Teller Floor', 'The system shall display the account balance to the teller.', D, 'Delivered', ''],
  ['Deposit Accounts', 'Approval workflow and dual control', 'Teller Floor', 'A teller enters a cash withdrawal above 10,000 EUR and a supervisor approves it under dual control.', N, 'Critical', ''],
  ['Deposit Accounts', 'Approval workflow and dual control', 'Teller Floor', 'A teller enters a cash deposit above 10,000 EUR and a supervisor approves it under dual control.', P, 'High', ''],
  ['Deposit Accounts', 'Approval workflow and dual control', 'Back Office', 'A change to the product rate shall be approved by a second officer under dual control.', N, 'High', ''],
  ['Deposit Accounts', 'Change history and audit', 'Back Office', 'The system shall archive the closed account after its seven-year retention period.', N, 'Medium', ''],
  ['Deposit Accounts', 'Change history and audit', 'Back Office', 'The system shall archive the dormant account statement after its retention period.', D, 'Delivered', ''],
  ['Deposit Accounts', 'Product parameters', 'Back Office', 'The deposit products shall be configured in a packaged core banking platform rather than built.', N, 'High', ''],
  ['Deposit Accounts', 'Product parameters', 'Back Office', 'The system shall record the deposit product with its effective date.', D, 'Delivered', ''],
  ['Deposit Accounts', 'Search, export and reporting', 'Relationship Desk', 'The system shall display the customer profile with the account balance.', D, 'Delivered', ''],
  ['Deposit Accounts', 'Search, export and reporting', 'Relationship Desk', 'The system shall display the customer profile on the account screen.', N, 'Medium', ''],
  ['Deposit Accounts', 'Alerts and notices', 'Teller Floor', 'The system shall alert the branch supervisor when the teller till exceeds its limit.', N, 'Medium', ''],
  // Payments: external systems, the end-of-day payment file, notices, settlement.
  ['Payments', 'Postings and reversals', 'Back Office', 'The system shall send the payment instruction to the national payment switch.', D, 'Delivered', ''],
  ['Payments', 'Postings and reversals', 'Back Office', 'The system shall receive the payment status from the national payment switch.', N, 'High', ''],
  ['Payments', 'Day-end processing', 'Back Office', 'The system shall send the payment file to the national payment switch at the end of the day.', N, 'Critical', CLOSE],
  ['Payments', 'Postings and reversals', 'Back Office', 'The system shall settle the payment instruction on the same business day.', D, 'Delivered', ''],
  ['Payments', 'Postings and reversals', 'Finance Control', 'The system shall post the payment instruction to the ledger entry with its reference.', N, 'High', ''],
  ['Payments', 'Alerts and notices', 'Relationship Desk', 'The system shall notify the customer of a failed payment instruction by text message.', N, 'Medium', ''],
  ['Payments', 'Alerts and notices', 'Relationship Desk', 'The system shall notify the customer of a returned payment instruction by text message.', D, 'Delivered', ''],
  ['Payments', 'Fees, charges and interest', 'Back Office', 'The system shall calculate the payment fee from the product rate.', D, 'Delivered', ''],
  ['Payments', 'Regulatory compliance', 'Compliance Office', 'The system shall screen the payment instruction as the anti-money-laundering regulation requires.', N, 'Critical', EVIDENCE],
  // Customer Management: the customer profile others read, onboarding, search, regulation.
  ['Customer Management', 'Customer onboarding and due diligence', 'Relationship Desk', 'The system shall record the customer profile with its identity documents.', D, 'Delivered', ''],
  ['Customer Management', 'Customer onboarding and due diligence', 'Relationship Desk', 'The system shall verify the customer profile against the external screening service.', N, 'High', ''],
  ['Customer Management', 'Search, export and reporting', 'Relationship Desk', 'The system shall search the customer profile by name, account number or identity document.', D, 'Delivered', ''],
  ['Customer Management', 'Search, export and reporting', 'Relationship Desk', 'The system shall search the customer profile by its former names.', N, 'Medium', ''],
  ['Customer Management', 'Regulatory compliance', 'Compliance Office', 'The system shall screen every new customer profile as the anti-money-laundering regulation requires.', N, 'Critical', EVIDENCE],
  ['Customer Management', 'Change history and audit', 'Compliance Office', 'The system shall keep a full change history of the customer profile with before and after values.', D, 'Delivered', ''],
  // Lending: shared reads of the customer profile, scheduled repayments, a second maker-checker, calculations.
  ['Lending', 'Search, export and reporting', 'Relationship Desk', 'The system shall display the customer profile when a loan is opened.', D, 'Delivered', ''],
  ['Lending', 'Search, export and reporting', 'Relationship Desk', 'The system shall display the customer profile on the loan screen.', N, 'Medium', ''],
  ['Lending', 'Fees, charges and interest', 'Back Office', 'The system shall calculate the loan repayment schedule from the product rate.', D, 'Delivered', ''],
  ['Lending', 'Day-end processing', 'Back Office', 'The system shall schedule the loan repayment on its due date.', N, 'High', ''],
  ['Lending', 'Day-end processing', 'Back Office', 'The system shall schedule the loan repayment reminder on its due date.', D, 'Delivered', ''],
  ['Lending', 'Approval workflow and dual control', 'Back Office', 'A loan officer enters the loan application and a credit manager approves it under dual control.', N, 'Critical', ''],
  ['Lending', 'Postings and reversals', 'Finance Control', 'The system shall post the loan repayment to the ledger entry.', D, 'Delivered', ''],
  // Access Administration (identity), Management Reporting (reporting), Period Close (batch): cross-cutting areas.
  ['Access Administration', 'Roles and access', 'Systems Administration', 'The system shall restrict the user role to authorised staff only.', D, 'Delivered', ''],
  ['Access Administration', 'Roles and access', 'Systems Administration', 'The system shall restrict access to the account balance by branch.', N, 'High', ''],
  ['Access Administration', 'Approval workflow and dual control', 'Systems Administration', 'Every change to the user role shall be approved by a second administrator under dual control.', N, 'Critical', ''],
  ['Access Administration', 'Change history and audit', 'Systems Administration', 'The system shall audit every change to the user role.', D, 'Delivered', ''],
  ['Management Reporting', 'Regulatory compliance', 'Compliance Office', 'The system shall submit the regulatory return to the central bank gateway.', N, 'Critical', EVIDENCE],
  ['Management Reporting', 'Search, export and reporting', 'Finance Control', 'The system shall search the ledger entry by reference and value date.', D, 'Delivered', ''],
  ['Management Reporting', 'Search, export and reporting', 'Finance Control', 'The system shall export the daily balance report to finance control.', D, 'Delivered', ''],
  ['Management Reporting', 'Search, export and reporting', 'Finance Control', 'The system shall export the daily balance report in the base currency.', N, 'Medium', ''],
  ['Period Close', 'Day-end processing', 'Back Office', 'The system shall run the end-of-day close for every branch at the end of the day.', N, 'Critical', CLOSE],
  ['Period Close', 'Day-end processing', 'Back Office', 'The end-of-day close shall restart from the last committed branch after a failure.', N, 'High', ''],
  ['Period Close', 'Day-end processing', 'Back Office', 'The system shall schedule the monthly statement run on the first business day.', D, 'Delivered', ''],
  // Platform: migration from the legacy system, continuity, a mandated technology.
  ['Platform Services', 'Stability and resilience', 'Systems Administration', 'The system shall migrate the account balance from the legacy core system.', N, 'Critical', ''],
  ['Platform Services', 'Stability and resilience', 'Systems Administration', 'The system shall migrate the customer profile from the legacy core system.', N, 'High', ''],
  ['Platform Services', 'Stability and resilience', 'Systems Administration', 'The system shall replace the legacy core system branch by branch.', N, 'High', ''],
  ['Platform Services', 'Stability and resilience', 'Systems Administration', 'The system shall fail over to the standby site after a site outage.', N, 'Critical', ''],
  ['Platform Services', 'Stability and resilience', 'Systems Administration', 'The system shall restore the account balance from the backup after a site outage.', D, 'Delivered', ''],
  ['Platform Services', 'Stability and resilience', 'Systems Administration', 'The system shall keep posting through the loss of one data centre with no recovery gap.', P, 'High', ''],
  ['Platform Services', 'Roles and access', 'Systems Administration', 'The platform must use the existing enterprise service bus for every integration.', D, 'Delivered', ''],
  ['Platform Services', 'Regulatory compliance', 'Compliance Office', 'The system shall keep the records the central bank regulation names for seven years.', N, 'High', EVIDENCE]
];

const MAPPING = {externalId: 'A', description: 'B', domain: 'C', capability: 'D', userGroup: 'E', delivery: 'F', priorityBand: 'G', outcome: 'H'};
const HEADERS = [['A', 'Baseline_ID'], ['B', 'Requirement_Statement'], ['C', 'Domain'], ['D', 'Capability_Theme'], ['E', 'User_Group'], ['F', 'Delivery_Status'], ['G', 'V2_Priority_Band'], ['H', 'Intended_Outcome']].map(([column, label]) => ({column, label}));
const FIELDS = ['externalId', 'description', 'domain', 'capability', 'module', 'userGroup', 'owner', 'acceptance', 'category', 'delivery', 'validation', 'reliability', 'manual', 'evidence', 'comments', 'date', 'uatCount', 'uatPass', 'uatFail', 'uatBlocked', 'userNeed', 'outcome', 'priorityScore', 'priorityBand', 'pglLinked', 'sourceBasis', 'mappingMethod', 'sourceReference', 'sourceAuthority'];

// The rows as the intake maps a workbook's rows (intake-domain.js mapWorkbookRows), without a workbook.
export function depthSource({copies = 1} = {}) {
  const rows = [];
  for (let c = 0; c < copies; c++) DEPTH_ROWS.forEach(([domain, capability, userGroup, description, delivery, priorityBand, outcome], i) => {
    const n = c * DEPTH_ROWS.length + i + 1, externalId = 'SYN-' + String(n).padStart(4, '0'), sourceRow = n + 1;
    const fields = Object.fromEntries(FIELDS.map(f => [f, '']));
    Object.assign(fields, {externalId, description, domain, capability, userGroup, delivery, priorityBand, outcome});
    const cells = {A: externalId, B: description, C: domain, D: capability, E: userGroup, F: delivery, G: priorityBand, H: outcome};
    rows.push({externalId, sourceRow, fields, values: HEADERS.map(h => ({column: h.column, label: h.label, address: h.column + sourceRow, value: cells[h.column] || '', type: cells[h.column] ? 'string' : 'blank'})), rowHash: digest(HEADERS.map(h => [h.column, cells[h.column] || '', '']))});
  });
  const hash = digest(rows.map(r => r.rowHash));
  return {mapping: {...Object.fromEntries(FIELDS.map(f => [f, ''])), ...MAPPING}, headers: HEADERS, rows, skipped: [], datasetId: 'workbook-depth-' + copies, revision: 1, filename: 'Synthetic-depth.xlsx', uploadId: 'upload-depth-' + copies, workbookHash: hash, sheet: 'Requirements', headerRow: 1, priorityMap: {Critical: 'Must', High: 'Should', Medium: 'Could', Delivered: 'Could'}};
}

// The project: a blank project opened from the brief, the rows imported with their domain and capability-theme groups.
export function depthDraftProject({copies = 1, name = 'Synthetic depth platform', brief = DEPTH_BRIEF} = {}) {
  let p = createProject({name, template: 'blank', brief}, 'synthetic-depth-' + copies, DEPTH_AT);
  const source = depthSource({copies}), choice = {domain: true, capabilityTheme: true};
  const extras = {groups: groupProposals(p, source), stakeholders: null, brief: null, markup: [], choice};
  const preview = previewIntake(p, source, [], extras);
  const result = applyIntake(p, source, preview, {previewStamp: preview.stamp, reviewed: true}, DEPTH_AT, 'fixture-importer');
  const groups = createImportGroups(result.document, extras.groups, choice, {filename: source.filename, datasetId: source.datasetId, revision: source.revision}, DEPTH_AT, 'fixture-importer');
  const receipt = result.document.intake.datasets.find(d => d.id === source.datasetId);
  receipt.groups = groups; receipt.versions.at(-1).groups = groups;
  p = withFinalReview(result.document);
  return {document: p, source};
}
