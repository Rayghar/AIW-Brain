// A synthetic requirements workbook for the intake acceptance workload (round 12, D-09). It has the shape of a real
// post-go-live assessment workbook (a sheet "11 Requirement Detail" with a title, a header row 5 of 27 columns and
// 1,400 rows below it, beside overview, read-me and summary sheets) and none of its text: every value is generated here
// from a fixed seed, so the same bytes come out on every run. Its distributions follow a real project's: a few large
// domains and many small ones, themes of very different sizes, about a quarter of the rows not fully delivered, a
// priority band on every gap, a handful of repeated statements, one delivered row whose comment disagrees, one statement
// that holds pasted web markup, and one long-text row per few dozen. Round 12 (intake at depth) plants, at places of
// their own, delivered rows with no band, test objectives, rows that name a regulation and one that cites regulation
// without naming it, and validation dates stored as date cells; beside the requirement sheet it adds a further sheet of
// test evidence (exact duplicate rows, blank columns, unknown ids, a row reference one short, a column of tester names),
// group leads beside the user groups with a read-me sentence naming one, and the workbook's own list of status
// combinations to review (manifest.cases). The manifest says what was generated, so a test can count what AIW should
// find without reading the workbook back.
//   import {syntheticWorkbook} from './scripts/synthetic-workbook.mjs'; const {bytes, manifest} = syntheticWorkbook();
// A later revision of the same workbook (round 12, A3: test:recovery-size): syntheticWorkbook({amend}) calls amend(rows)
// on the generated rows, to change, add or remove some, before the sheets are written; without it the bytes are the same.
//   node scripts/synthetic-workbook.mjs <out.xlsx>
import {deflateRawSync} from 'node:zlib';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

export const SHEET = '11 Requirement Detail';
export const HEADER_ROW = 5;
export const HEADERS = ['Baseline_ID', 'Domain', 'Module / Theme', 'Requirement_Statement', 'User_Need', 'Intended_Outcome', 'Assessment_Category', 'Source_Basis', 'User_Group', 'Mapping_Method', 'Functional_Validation', 'Delivery_Status', 'Reliability_Status', 'Manual_Intervention', 'Evidence_Reference', 'Owner_Comments', 'Validation_Date', 'UAT_Test_Count', 'UAT_Pass', 'UAT_Fail', 'UAT_Blocked', 'PGL_Linked', 'Capability_Theme', 'V2_Priority_Score', 'V2_Priority_Band', 'Source_Reference', 'Source_Authority'];

// mulberry32: a small deterministic generator, so the workbook is the same on every machine.
function random(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const weighted = (rnd, items) => { const total = items.reduce((n, [, w]) => n + w, 0); let x = rnd() * total; for (const [v, w] of items) { x -= w; if (x < 0) return v; } return items.at(-1)[0]; };
const pick = (rnd, xs) => xs[Math.floor(rnd() * xs.length)];
// Zipf-like weights: the first names are large, the tail is small, as in a real register.
const zipf = (names, s = 1.05) => names.map((n, i) => [n, 1 / Math.pow(i + 1, s)]);

const DOMAINS = ['Deposit Accounts', 'Teller Services', 'Lending', 'Access Administration', 'Treasury Products', 'Product Setup', 'Audit Trail', 'Branch Network', 'Fees and Pricing', 'General Ledger', 'Platform Settings', 'Channels and Integration', 'Recurring Instructions', 'Shared Services', 'Tax Handling', 'Period Close', 'Foreign Exchange', 'Management Reporting'];
const THEMES = ['Search, export and reporting', 'Approval workflow and dual control', 'Unclassified gap', 'Teller and cash handling', 'Change history and audit', 'Loan servicing', 'Fees, charges and interest', 'Roles and access', 'Product parameters', 'Customer onboarding and due diligence', 'Tax and accounting', 'Investment lifecycle', 'Batch processing', 'Collateral handling', 'Effective dating', 'APIs and channels', 'Day-end processing', 'Alerts and notices', 'Stability and resilience'];
const GROUPS = ['Compliance Office', 'Relationship Desk', 'Teller Floor', 'Assurance Team', 'Lending Operations', 'Finance Control', 'Digital Channels', 'Systems Administration', 'Treasury Desk', 'Pricing Team', 'Securities Desk', 'Back Office', 'Credit Review'];
const ACTIONS = ['record', 'display', 'validate', 'export', 'approve', 'reverse', 'calculate', 'notify', 'restrict', 'reconcile', 'search', 'archive', 'post', 'schedule', 'retrieve', 'amend'];
const OBJECTS = ['the account balance', 'a cash withdrawal', 'the customer profile', 'a standing instruction', 'the interest accrual', 'a fee waiver', 'the ledger entry', 'a loan repayment', 'the teller till', 'a user role', 'the product rate', 'a term deposit', 'the day-end report', 'a cheque deposit', 'the branch limit', 'a currency conversion', 'the collateral record', 'a tax deduction', 'the statement of account', 'a dormant account'];
const QUALIFIERS = ['before posting', 'after approval', 'for every branch', 'on the same business day', 'with the original reference', 'under dual control', 'for the selected period', 'without manual intervention', 'with a full change history', 'for authorised staff only', 'at the end of the day', 'in the base currency'];
const EXTRA = ['The view must show who made the change and when.', 'The result must be available to the supervisor for review.', 'Exceptions must be listed with their reason and the next action.', 'The same rule applies to accounts opened before the change.', 'A rejected item must keep its original values for audit.'];
const NEEDS = ['Operations control', 'Branch supervision', 'Audit readiness', 'Customer service', 'Finance reporting'];
const COMMENTS_GAP = ['Awaiting a fix in the next release.', 'Partly available; the export is still manual.', 'Raised with the supplier for the next version.', 'Works for new accounts only.', 'The report runs but misses the closing balance.'];
const BASIS = [['Signed specification', 6], ['Test evidence', 74], ['Change backlog', 12], ['Reconstructed from notes', 8]];
const AUTHORITY = [['Signed baseline', 5], ['Test evidence', 75], ['Backlog', 12], ['Reconstruction', 8]];
const METHOD = [['Direct role mapping', 91], ['Derived from wording', 6], ['Provisional domain mapping', 3]];
// Reliability and manual work cluster on the gaps, as they do in a real register: a delivered row is nearly always stable.
const RELIABILITY = {delivered: [['Stable', 97], ['Unreliable', 1], ['Untested', 1], ['Not Assessed', 1]], gap: [['Stable', 45], ['Unreliable', 30], ['Untested', 12], ['Not Assessed', 10], ['Intermittent', 3]]};
const VALIDATION = [['Validated', 95], ['Partially Validated', 3], ['Not Validated', 2]];

// revise: a later revision of the same workbook, for a re-import: {headers: {old: new}, rows: {id: {field: value}}}
// renames headers of the requirement sheet and changes cells of the rows named (fields as in manifest.rows).
export function syntheticWorkbook({rows: total = 1400, seed = 12, revise = null, amend = null} = {}) {
  const rnd = random(seed), rows = [], statements = new Set();
  const statement = (long) => {
    for (let tries = 0; ; tries++) {
      const s = `The system shall ${pick(rnd, ACTIONS)} ${pick(rnd, OBJECTS)} ${pick(rnd, QUALIFIERS)}` + (long ? `, and keep the outcome visible to the operations team until the next scheduled reconciliation. ${pick(rnd, EXTRA)} ${pick(rnd, EXTRA)}` : '.') + (tries > 6 ? ` (variant ${tries})` : '');
      if (!statements.has(s)) { statements.add(s); return s; }
    }
  };
  for (let i = 1; i <= total; i++) {
    const postLaunch = rnd() < 0.125, id = postLaunch ? 'PLR-' + String(i).padStart(4, '0') : i % 13 === 0 ? 'BRQ-' + (1 + (i % 9)) + '.' + (1 + (i % 7)) + '.' + i : (i % 5 === 0 ? 'FRQ-' : 'TCR-') + String(i).padStart(4, '0');
    const status = weighted(rnd, [['Delivered', 74], ['Partially Delivered', 9], ['Not Delivered', 17]]), gap = status !== 'Delivered';
    const band = gap ? weighted(rnd, [['Critical', 40], ['High', 32], ['Medium', 27]]) : 'Delivered';
    const score = band === 'Critical' ? 70 + Math.floor(rnd() * 21) : band === 'High' ? 56 + Math.floor(rnd() * 14) : band === 'Medium' ? 35 + Math.floor(rnd() * 19) : 0;
    const long = rnd() < 0.08, text = statement(long), domain = weighted(rnd, zipf(DOMAINS)), theme = weighted(rnd, zipf(THEMES.slice(0, -1), 0.95));
    const count = Math.floor(rnd() * 7), fail = gap ? 0 : (rnd() < 0.04 ? 1 : 0), pass = gap ? (rnd() < 0.3 ? 1 + Math.floor(rnd() * 3) : 0) : Math.max(0, count - fail);
    const manual = rnd() < (gap ? 0.25 : 0.01) ? 'Yes' : 'No', reliability = weighted(rnd, gap ? RELIABILITY.gap : RELIABILITY.delivered);
    rows.push({
      id, domain, module: domain.split(' ')[0] + ' · ' + text.split(' ').slice(3, 6).join(' ').replace(/[.,]$/, '') + ' ' + i, statement: text,
      need: rnd() < 0.13 ? pick(rnd, NEEDS) : '', outcome: rnd() < 0.05 ? 'Reduce the time staff spend on ' + pick(rnd, OBJECTS).replace(/^(the|a) /, '') + ' each month.' : rnd() < 0.92 ? text : '',
      category: postLaunch ? 'Post-Launch Request' : 'Original Commitment', basis: weighted(rnd, BASIS), group: weighted(rnd, zipf(GROUPS, 1.1)), method: weighted(rnd, METHOD),
      validation: weighted(rnd, VALIDATION), status, reliability, manual, evidence: rnd() < 0.03 ? 'EVD-' + String(i).padStart(4, '0') : '',
      comments: gap && rnd() < 0.5 ? pick(rnd, COMMENTS_GAP) : !gap && rnd() < 0.04 ? 'Confirmed in the latest test cycle.' : '', date: rnd() < 0.1 ? '2026-08-0' + (1 + Math.floor(rnd() * 8)) : '',
      uatCount: String(count), uatPass: String(pass), uatFail: String(fail), uatBlocked: String(rnd() < 0.02 ? 1 : 0), pgl: postLaunch ? 'Yes' : 'No', theme,
      score: String(score), band, reference: 'CYC-' + (1 + (i % 9)) + '/' + String(i).padStart(4, '0'), authority: weighted(rnd, AUTHORITY),
    });
  }
  // The few rows a real register always has: repeated statements, the smallest theme, a delivered row whose comment
  // disagrees with its status, a band seen once, and a statement pasted from a web page.
  const repeats = [[10, 11], [40, 41, 42], [100, 260], [333, 334], [700, 950], [1200, 1201]].filter(g => g.every(i => i < rows.length));
  for (const g of repeats) for (const i of g.slice(1)) { rows[i].statement = rows[g[0]].statement; rows[i].outcome = rows[i].outcome && rows[g[0]].statement; }
  // Planted at the same places in a full workbook; a small one (a unit suite's) keeps whichever fit.
  const last = THEMES.at(-1); for (const i of [rows.length - 3, rows.length - 9]) if (i >= 0) rows[i].theme = last;
  const conflict = rows.findIndex((r, i) => i > Math.min(20, total / 4) && r.status === 'Delivered' && !r.comments);
  if (conflict >= 0) rows[conflict].comments = 'The before and after values are not captured in the audit view.';
  const watch = rows.findIndex((r, i) => i > Math.min(30, total / 3) && r.band === 'Medium'); if (watch >= 0) { rows[watch].band = 'Watch'; rows[watch].score = '34'; }
  const markup = rows.findIndex((r, i) => i > Math.min(600, total / 2) && r.status !== 'Delivered' && !repeats.flat().includes(i) && i !== conflict && i !== watch);
  if (markup >= 0) { rows[markup].statement = '<div class="chat-turn" data-role="user"><p>Can the teller screen show the account balance <b>before</b> the cash is paid out?</p></div>'; rows[markup].outcome = rows[markup].statement; }
  // Round 12 (intake at depth): the cases planted after the others, at places of their own, so that every row the cases
  // above touch stays as it was: three delivered rows with no priority band; four statements phrased as test
  // objectives; four that name a regulator or an instrument (two the same instrument) and one that cites regulation
  // without naming it; validation dates kept as real date cells (every other dated row, in two date formats). Beside the
  // requirement sheet: a further sheet of test evidence to enrich from, a column of group leads with a read-me sentence
  // that names one, and the workbook's own list of status combinations to review. Names are invented placeholders.
  const taken = new Set([...repeats.flat(), conflict, watch, markup, rows.length - 3, rows.length - 9]);
  const plant = (after, ok = () => true) => { const i = rows.findIndex((r, k) => k > Math.min(after, total / 2) && !taken.has(k) && ok(r)); if (i >= 0) taken.add(i); return i; };
  const noBand = [50, 500, 900].map(at => plant(at, r => r.status === 'Delivered')).filter(i => i >= 0);
  for (const i of noBand) { rows[i].band = ''; rows[i].score = ''; }
  const restate = (i, text) => { if (rows[i].outcome === rows[i].statement) rows[i].outcome = text; rows[i].statement = text; };
  const OBJECTIVES = [o => `To ensure that ${o} is recorded under dual control.`, o => `Verify that the day-end report lists ${o} for every branch.`, o => `Check that the system can archive ${o} once it is approved.`, o => `To verify that ${o} keeps its original reference.`];
  const objectives = [120, 420, 820, 1120].map(at => plant(at)).filter(i => i >= 0);
  objectives.forEach((i, k) => restate(i, OBJECTIVES[k](OBJECTS[(k * 5 + 2) % OBJECTS.length])));
  const REGULATED = [['The system shall apply the charges set out in the Payments Directive 2019 to every cross-border transfer.', 'Payments Directive 2019'], ['The system shall report cash withdrawals above the reporting threshold to the financial intelligence unit.', 'financial intelligence unit'], ['The system shall keep customer records for as long as the Data Protection Act requires.', 'Data Protection Act'], ['The system shall publish the fee schedule as the Payments Directive 2019 requires.', 'Payments Directive 2019']];
  const regulations = {}; [160, 460, 860, 1160].map(at => plant(at)).forEach((i, k) => { if (i < 0) return; restate(i, REGULATED[k][0]); (regulations[REGULATED[k][1]] ||= []).push(rows[i].id); });
  const unnamed = plant(200); if (unnamed >= 0) restate(unnamed, 'The system shall keep transaction records in line with regulatory requirements.');
  const serial = iso => (Date.UTC(...iso.split('-').map((v, k) => k === 1 ? v - 1 : +v)) - Date.UTC(1899, 11, 30)) / 86400000;
  let dated = 0; const dateCells = []; for (const r of rows) if (r.date && dated++ % 2) { r.dateCell = {n: serial(r.date), s: dated % 4 ? 1 : 2}; dateCells.push(r.id); }
  const FIRST = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Robin', 'Quinn', 'Avery', 'Drew', 'Skyler'], LAST = ['Example', 'Sample', 'Placeholder', 'Fictive'];
  const person = k => FIRST[k % FIRST.length] + ' ' + LAST[k % LAST.length];
  const leads = GROUPS.map((g, k) => person(k)), contact = `${leads[0]} keeps this workbook and answers questions about the delivery statuses.`;
  // The further sheet: test evidence for every third post-launch requirement, a second test for every fourth of those,
  // eight rows repeated cell for cell, two ids the register does not hold, a status and a notes column no row fills, a
  // row reference one row short of the row it names, and the tester's name.
  const ENRICH_SHEET = '06 Test Evidence', ENRICH_HEADER = 3, ENRICH_HEADERS = ['Requirement_Ref', 'Test_Case', 'Test_Run', 'Defects', 'Test_Status', 'Tester', 'Delivery_Status', 'Source_Row', 'Notes'];
  const evidenced = rows.map((r, i) => [r, i]).filter(([r]) => r.category === 'Post-Launch Request').filter((x, k) => k % 3 === 0), enrichRows = [], matched = {};
  evidenced.forEach(([r, i], k) => {
    const tests = k % 4 === 0 ? 2 : 1;
    for (let t = 0; t < tests; t++) {
      const n = String(1000 + k * 2 + t), row = {id: r.id, testCase: 'TC-' + n, execution: 'EX-' + n, issues: k % 5 === 0 ? 'ISS-' + String(100 + k) : '', status: ['Passed', 'Failed', 'Blocked'][(k + t) % 3], tester: person(k + t), sourceRow: String(HEADER_ROW + i)};
      enrichRows.push(row); const m = matched[r.id] ||= {testCase: [], execution: [], issues: [], testStatus: []};
      m.testCase.push(row.testCase); m.execution.push(row.execution); if (row.issues) m.issues.push(row.issues); if (!m.testStatus.includes(row.status)) m.testStatus.push(row.status);
    }
  });
  const repeated = enrichRows.filter((x, k) => k % 7 === 3).slice(0, 8);
  const unknown = ['PLR-9998', 'PLR-9999'].map((id, k) => ({id, testCase: 'TC-' + (9000 + k), execution: 'EX-' + (9000 + k), issues: '', status: 'Passed', tester: person(k + 3), sourceRow: ''}));
  const enrichAll = [...enrichRows, ...unknown, ...repeated];
  // The workbook's own list: delivered rows that are not stable, undelivered rows marked stable, one AIW raises nothing
  // for; each with its row, one short.
  const unstable = rows.map((r, i) => [r, i]).filter(([r]) => r.status === 'Delivered' && ['Unreliable', 'Untested', 'Intermittent'].includes(r.reliability)).slice(0, 4);
  const stableGaps = rows.map((r, i) => [r, i]).filter(([r]) => r.status === 'Not Delivered' && r.reliability === 'Stable').slice(0, 3);
  const quiet = rows.map((r, i) => [r, i]).find(([r, i]) => r.status === 'Delivered' && r.reliability === 'Stable' && r.validation === 'Validated' && r.manual === 'No' && !r.comments && r.uatFail === '0' && r.uatBlocked === '0' && !taken.has(i) && !repeats.flat().includes(i));
  const anomalies = [...unstable.map(x => [...x, 'Delivered but reliability is not stable']), ...stableGaps.map(x => [...x, 'Not delivered but reliability marked stable']), ...(quiet ? [[...quiet, 'Delivered but the owner comment is pending']] : [])];
  const planted = {repeats: repeats.map(g => g.map(i => rows[i].id)), conflict: rows[conflict]?.id || null, markup: rows[markup]?.id || null, watch: rows[watch]?.id || null};
  if (typeof amend === 'function') amend(rows);
  const cells = (r) => [r.id, r.domain, r.module, r.statement, r.need, r.outcome, r.category, r.basis, r.group, r.method, r.validation, r.status, r.reliability, r.manual, r.evidence, r.comments, r.dateCell || r.date, r.uatCount, r.uatPass, r.uatFail, r.uatBlocked, r.pgl, r.theme, r.score, r.band, r.reference, r.authority];
  for (const [id, change] of Object.entries(revise?.rows || {})) { const r = rows.find(x => x.id === id); if (r) Object.assign(r, change); }
  const header = HEADERS.map(h => revise?.headers?.[h] || h);
  const sheets = [
    {name: '00 Overview', rows: [
      [1, ['Synthetic Bank Platform: post-launch value review']],
      [3, ['This review consolidates ' + rows.length.toLocaleString('en-GB') + ' platform requirements and records how far each one was delivered after launch.']],
      [4, ['About a quarter of the requirements are not yet fully delivered, and none of them carries an evidence reference.']],
      [5, ['The next version should close the delivery gaps by capability theme instead of fixing each requirement on its own.']],
      [7, ['Requirements', 'Delivered', 'Gaps'], ['A', 'B', 'C']],
      [8, [String(rows.length), String(rows.filter(r => r.status === 'Delivered').length), String(rows.filter(r => r.status !== 'Delivered').length)], ['A', 'B', 'C']],
    ]},
    {name: '01 Read Me', rows: [
      [1, ['How to read this workbook']],
      [3, ['Purpose', 'This workbook gives the architecture team one list of requirements with their delivery status, reliability and test history.'], ['A', 'B']],
      [4, ['Original Commitment', 'A requirement agreed before launch in a signed specification or test plan.'], ['A', 'B']],
      [5, ['Post-Launch Request', 'A requirement raised by the business after launch.'], ['A', 'B']],
      [6, ['Priority band', 'A provisional ranking of the gaps that the business must confirm.'], ['A', 'B']],
      [8, ['Contact', contact], ['A', 'B']],
    ]},
    {name: '04 User Group Summary', rows: [
      [1, ['Requirements by user group']],
      [4, ['User group', 'Requirements', 'Gaps', 'Group_Lead'], ['A', 'B', 'C', 'D']],
      ...GROUPS.map((g, i) => [5 + i, [g, String(rows.filter(r => r.group === g).length), String(rows.filter(r => r.group === g && r.status !== 'Delivered').length), leads[i]], ['A', 'B', 'C', 'D']]),
    ]},
    {name: SHEET, merge: ['A1:S1', 'A2:S3'], rows: [
      [1, ['Requirement detail: one row per requirement']],
      [2, ['Each row keeps the requirement as the source states it, with its delivery and test assertions.']],
      [HEADER_ROW, header],
      ...rows.map((r, i) => [HEADER_ROW + 1 + i, cells(r)]),
    ]},
    {name: ENRICH_SHEET, rows: [
      [1, ['Test evidence by requirement']],
      [ENRICH_HEADER, ENRICH_HEADERS],
      ...enrichAll.map((e, k) => [ENRICH_HEADER + 1 + k, [e.id, e.testCase, e.execution, e.issues, e.status, e.tester, '', e.sourceRow, '']]),
    ]},
    {name: '10 Validation Checks', rows: [
      [1, ['Validation checks']],
      [3, ['Status combinations to review']],
      [4, ['Baseline_ID', 'Issue', 'Source_Row']],
      ...anomalies.map(([r, i, issue], k) => [5 + k, [r.id, issue, String(HEADER_ROW + i)]]),
    ]},
  ];
  const join = xs => xs.join('; ');
  const cases = {
    noBand: noBand.map(i => rows[i].id), testObjectives: objectives.map(i => rows[i].id), regulations, unnamedRegulation: unnamed >= 0 ? rows[unnamed].id : null, dateCells,
    leads: {sheet: '04 User Group Summary', column: 'D', header: 'Group_Lead', names: leads, contact: {sheet: '01 Read Me', cell: 'B8', text: contact}},
    enrich: {sheet: ENRICH_SHEET, headerRow: ENRICH_HEADER, headers: ENRICH_HEADERS, rows: enrichAll.length, kept: enrichRows.length + unknown.length, duplicates: repeated.length, unmatched: unknown.map(u => u.id), blankColumns: ['Delivery_Status', 'Notes'], personColumn: 'F', rowColumn: 'H', offBy: -1,
      matched: Object.fromEntries(Object.entries(matched).map(([id, m]) => [id, {testCase: join(m.testCase), execution: join(m.execution), ...(m.issues.length ? {issues: join(m.issues)} : {}), testStatus: join(m.testStatus)}]))},
    anomalies: {sheet: '10 Validation Checks', range: anomalies.length ? 'A5:A' + (4 + anomalies.length) : '', ids: anomalies.map(([r]) => r.id), quiet: quiet ? quiet[0].id : null, offBy: -1},
  };
  const manifest = {seed, sheet: SHEET, headerRow: HEADER_ROW, headers: HEADERS, rows: rows.map(r => ({...r})), ...planted, sheets: sheets.map(s => s.name), cases};
  return {bytes: xlsx(sheets), manifest};
}

// ---------------------------------------------------------------- a minimal OOXML package (inline strings, deflated)
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const columnName = (n) => { let s = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
// A value is text (an inline string) or a stored number with a cell style ({n, s}: style 1 the built-in date format 14,
// style 2 the custom format yyyy-mm-dd), as a date cell is stored.
function sheetXML(sheet) {
  const cell = (ref, v) => v && typeof v === 'object' ? `<c r="${ref}" s="${v.s}"><v>${v.n}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  const body = sheet.rows.map(([n, values, columns]) => `<row r="${n}">${values.map((v, i) => v === '' ? '' : cell((columns ? columns[i] : columnName(i)) + n, v)).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData>${sheet.merge ? `<mergeCells count="${sheet.merge.length}">${sheet.merge.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}</worksheet>`;
}
const crcTable = Uint32Array.from({length: 256}, (_, n) => { for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
const crc32 = (bytes) => { let n = 0xffffffff; for (const b of bytes) n = crcTable[(n ^ b) & 255] ^ (n >>> 8); return (n ^ 0xffffffff) >>> 0; };
const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/></numFmts><fonts count="1"><font/></fonts><fills count="1"><fill/></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="14" applyNumberFormat="1"/><xf numFmtId="164" applyNumberFormat="1"/></cellXfs></styleSheet>';
function xlsx(sheets) {
  const files = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', STYLES],
    ...sheets.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXML(s)]),
  ];
  const locals = [], central = []; let offset = 0;
  for (const [name, text] of files) {
    const raw = Buffer.from(text, 'utf8'), body = deflateRawSync(raw), nameBytes = Buffer.from(name), crc = crc32(raw);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6); local.writeUInt16LE(8, 8); local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(nameBytes.length, 26);
    const entry = Buffer.alloc(46); entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0, 8); entry.writeUInt16LE(8, 10); entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(body.length, 20); entry.writeUInt32LE(raw.length, 24); entry.writeUInt16LE(nameBytes.length, 28); entry.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, body); central.push(entry, nameBytes); offset += local.length + nameBytes.length + body.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, directory, end]));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = process.argv[2]; if (!out) { console.error('Usage: node scripts/synthetic-workbook.mjs <out.xlsx>'); process.exit(2); }
  const {bytes, manifest} = syntheticWorkbook();
  writeFileSync(out, bytes);
  console.log(JSON.stringify({file: out, bytes: bytes.length, rows: manifest.rows.length, sheets: manifest.sheets}, null, 1));
}
