// The 1,400-row intake acceptance workload (round 12, D-09). It runs on a synthetic workbook of the same shape
// (scripts/synthetic-workbook.mjs: the same sheet, header row and 27 columns, 1,400 rows of generated text) unless
// AIW_WORKBOOK names a real one, and then it runs on that file. Either way it imports the workbook through the worker
// (upload, inspect, preview, apply) into a private database and checks that every column becomes a typed field, the
// capability is the capability theme, the priority band sets the priority through a mapping the person can change,
// the domain and capability-theme columns become groups, the user groups become stakeholder proposals and the
// overview sheets a brief proposal citing its cells, pasted markup is flagged with a clean version, and repeated
// statements and conflicts are found as before. Then it works at that size: findings are read per cause, the companion
// names a handful of records, bulk confirmation is one reviewed step journalled once, a reason for missing evidence
// clears that finding for a group, and saves, reloads, filtered pages and recovery stay within honest bounds for this
// machine. Round 12 (B2) adds: a row with no band is not stated and sorts last (GR-INT-19); the import summary counts
// categories and bands and reads every assertion (GR-INT-04, GR-SRC-04), proposes distinct outcomes and, for a row that
// names a regulator or an instrument, a constraint with its constraint driver (GR-INT-10); identical statements that
// disagree raise one cause until a person judges the group (GR-SRC-02); statement checks and test objectives
// (GR-INT-08, GR-INT-09); a column profile (GR-SRC-03); a column of person names flagged and held back (GR-SRC-06);
// date cells read as ISO dates (GR-INT-07); the workbook's own anomaly list reconciled; an enrich import of a further
// sheet (GR-INT-05, GR-SRC-05); a re-import proposed its saved mapping (GR-INT-06) and journalling a changed source
// assertion with its design records for review (GR-INT-03); and the project workload limits (GR-INT-11).
// Run: npm run test:intake (AIW_WORKBOOK=/path/to/workbook.xlsx for the real file; AIW_REPORT to keep the report).
import {buildRecovery,previewRecovery} from './recovery-service.js';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir,cpus,totalmem} from 'node:os';
import path from 'node:path';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {sourceAssurance,importSummary} from './public/assurance-domain.js';
import {mapWorkbookRows,previewIntake,applyIntake,suggestMapping,sheetHeaders,guessHeader,INTAKE_FIELDS,ASSESSMENT_FIELDS,titleOf} from './public/intake-domain.js';
import {openWorkbook,sha256} from './public/workbook-reader.js';
import {findings,milestones,priorityBasisOf,applyCommand,seedProject} from './public/requirements-domain.js';
import {statementChecks,testObjective} from './public/statement-checks.js';
import {changeCauses} from './public/changes-domain.js';
import {driverCodes} from './public/quality-domain.js';
import {priorityRank} from './public/priority-scale.js';
import {groupMembers,groupsOf,requirementGroups,groupSummary} from './public/requirement-groups.js';
import {findingCauses,selectRequirements} from './public/requirement-commands.js';
import {storySource,storyInsights} from './public/story-model.js';
import {syntheticWorkbook,SHEET} from './scripts/synthetic-workbook.mjs';

const real = process.env.AIW_WORKBOOK || '', synthetic = real ? null : syntheticWorkbook();
const bytes = real ? new Uint8Array(await readFile(real)) : synthetic.bytes, filename = real ? 'SEABaaS.xlsx' : 'Synthetic-requirements.xlsx';
// Bounds for this machine, loose enough for a loaded run and tight enough to catch the regressions the round measured
// (a one-record save in 0.64 s, a whole import in 1.7 s; a bulk step must stay one step, not 1,400 saves).
// Measured on the round-12 machine (Xeon 2.1 GHz, 16 GiB, one run at a time): import 1.0 s synthetic and 1.9 s supplied,
// bulk confirmation 0.7 s, a reason for a group 0.6 s, one save 0.6 s, a reload 0.25 s, a filtered page under 10 ms. Each
// bound is about four times the slower measurement, so a regression run beside other suites passes and a return to
// one save per requirement does not.
const BOUNDS = {uploadPreviewApplyMs: 8000, singleRecordSaveMs: 2500, projectReloadMs: 1500, filteredPageMs: 500, bulkConfirmMs: 3000, evidenceTreatmentMs: 3000};
const root = await mkdtemp(path.join(tmpdir(), 'aiw-intake-')), DB = localDatabase(path.join(root, 'project.sqlite')), env = {DB, FILES: localFiles(path.join(root, 'files'))}, origin = 'http://localhost:4173'; let projectId, revision, document;
const report = {workbook: real ? 'supplied' : 'synthetic', runtime: process.version, cpu: cpus()[0].model, memoryGiB: Math.round(totalmem() / 2 ** 30), checks: [], timings: {}, bounds: BOUNDS};
async function call(route, {body, bytes, owner = 'intake-reviewer', method} = {}) { const r = await worker.fetch(new Request(origin + route + (route.includes('?') ? '&' : '?') + 'project=' + (projectId || 'bank-payment'), {method: method || ((body || bytes) ? 'POST' : 'GET'), headers: {'oai-authenticated-user-id': owner, Origin: origin, ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : bytes ? {body: bytes} : {})}), env); const data = await r.json(); assert.equal(r.status < 300, true, JSON.stringify({route, status: r.status, error: data.error})); return data; }
async function refused(route, body, pattern) { const r = await worker.fetch(new Request(origin + route + '?project=' + projectId, {method: 'POST', headers: {'oai-authenticated-user-id': 'intake-reviewer', Origin: origin, 'Content-Type': 'application/json'}, body: JSON.stringify(body)}), env); const data = await r.json(); assert.equal(r.status, 400, route + ' should be refused: ' + JSON.stringify(data)); assert.match(data.error, pattern); return data; }
const command = async (type, payload) => { const r = await call('/api/commands', {body: {revision, command: {type, payload}}}); revision = r.revision; document = r.document; return r; };
const timed = async (name, fn) => { const t = performance.now(); const out = await fn(); report.timings[name] = Math.round(performance.now() - t); assert.ok(report.timings[name] < BOUNDS[name], `${name} took ${report.timings[name]} ms (bound ${BOUNDS[name]} ms)`); return out; };
const isGap = s => !!String(s || '').trim() && String(s).trim().toLowerCase() !== 'delivered';
try {
  // ---------------------------------------------------------------- what the workbook says, read independently
  const wb = await openWorkbook(bytes), sheet = await wb.sheet(SHEET), headerRow = guessHeader(sheet), headers = sheetHeaders(sheet, headerRow), mapping = suggestMapping(headers);
  const label = c => headers.find(h => h.column === c)?.label, byLabel = l => headers.find(h => h.label === l)?.column;
  const source = mapWorkbookRows(sheet, headerRow, mapping), rows = source.rows;
  assert.equal(headerRow, 5); assert.equal(headers.length, 27); assert.equal(rows.length, 1400);
  assert.deepEqual(headers.filter(h => !Object.values(mapping).includes(h.column)).map(h => h.label), [], 'every one of the 27 columns has a field');
  assert.equal(mapping.capability, byLabel('Capability_Theme'), 'the capability is the capability-theme column'); assert.equal(mapping.module, byLabel('Module / Theme'), 'the module or theme column is kept as the module');
  if (synthetic) for (const [i, r] of rows.entries()) { const m = synthetic.manifest.rows[i]; assert.equal(r.externalId, m.id); assert.equal(r.fields.description, m.statement); assert.equal(r.fields.capability, m.theme); assert.equal(r.fields.userGroup, m.group); assert.equal(r.fields.priorityBand, m.band); }
  const distinct = field => [...new Set(rows.map(r => String(r.fields[field] || '').trim()).filter(Boolean))];
  report.checks.push(`The reader maps all 27 columns of “${SHEET}” (header row 5): capability from ${label(mapping.capability)}, module from ${label(mapping.module)}.`);

  // ---------------------------------------------------------------- the import, through the worker
  const created = await call('/api/projects', {body: {name: 'Intake acceptance workload', template: 'blank'}}); projectId = created.document.id;
  const sourceHash = await sha256(bytes), t = performance.now();
  const upload = await call('/api/intake?action=upload&filename=' + encodeURIComponent(filename), {bytes});
  const inspect = await call('/api/intake?action=inspect', {body: {uploadId: upload.id, sheet: SHEET}}); assert.equal(inspect.headerRow, 5); assert.equal(inspect.headers.length, 27); assert.deepEqual(inspect.mapping, mapping);
  const bandCounts = Object.fromEntries(distinct('priorityBand').map(b => [b, rows.filter(r => r.fields.priorityBand.trim() === b).length]));
  assert.deepEqual(Object.fromEntries(inspect.bands.values.map(v => [v.value, v.count])), bandCounts, 'inspect lists every band value with its rows');
  const top = inspect.bands.values.filter(v => !/deliver/i.test(v.value)).sort((a, b) => b.count - a.count);
  // Round 12 (GR-INT-19): a band AIW cannot rank defaults to not stated (''), as a row with no band does.
  assert.ok(Object.values(inspect.bands.map).every(p => ['Must', 'Should', 'Could', ''].includes(p)) && Object.values(inspect.bands.map).includes('Must'), 'each band has a default priority');
  if (bandCounts.Critical) { assert.equal(inspect.bands.map.Critical, 'Must'); assert.equal(inspect.bands.map.High, 'Should'); assert.equal(inspect.bands.map.Medium, 'Could'); }
  if (bandCounts.Delivered) assert.equal(inspect.bands.map.Delivered, 'Could', 'a band that says delivered asks for no new work');
  // The person changes one default: the weakest gap band becomes Should.
  const priorityMap = {...inspect.bands.map}; const changed = top.at(-1)?.value; if (changed) priorityMap[changed] = 'Should';
  const input = {uploadId: upload.id, sheet: inspect.sheet, headerRow: inspect.headerRow, mapping: inspect.mapping, priorityMap};
  const preview = await call('/api/intake?action=preview', {body: input}); assert.equal(preview.counts.add, 1400);
  // Round 12 (GR-INT-19): a row with no band, or a band the mapping leaves not stated, has its priority not stated ('').
  const expectedPriority = r => { const v = r.fields.priorityBand.trim(); return v && priorityMap[v] ? priorityMap[v] : ''; };
  const want = {Must: 0, Should: 0, Could: 0, notStated: 0}; for (const r of rows) want[expectedPriority(r) || 'notStated']++;
  assert.deepEqual(preview.priorities, want, 'the preview counts the priorities the mapping sets');
  const groupsProposed = Object.fromEntries(preview.proposals.groups.map(g => [g.field, g.values.length]));
  assert.deepEqual(groupsProposed, {domain: distinct('domain').length, capabilityTheme: distinct('capability').length}, 'one group per domain and per capability theme is proposed');
  assert.equal(preview.proposals.stakeholders.values.length, distinct('userGroup').length, 'each user group is a stakeholder proposal');
  assert.ok(preview.proposals.brief?.sentences.length >= 1 && preview.proposals.brief.sentences.every(x => x.sheet && x.sheet !== SHEET && /^[A-Z]{1,3}\d+$/.test(x.cell) && x.text.split(/\s+/).length >= 6), 'a brief is proposed from the overview sheets, each sentence citing its sheet and cell');
  const markupRows = rows.filter(r => /<(div|span|p|b|br)\b/i.test(r.fields.description));
  assert.deepEqual(preview.proposals.markup.map(m => m.externalId).sort(), markupRows.map(r => r.externalId).sort(), 'every statement with pasted markup is flagged');
  const result = await call('/api/intake?action=apply', {body: {...input, revision: preview.projectRevision, previewStamp: preview.stamp, reviewed: true}}); ({revision, document} = result);
  report.timings.uploadPreviewApplyMs = Math.round(performance.now() - t); assert.ok(report.timings.uploadPreviewApplyMs < BOUNDS.uploadPreviewApplyMs, 'import within bound: ' + report.timings.uploadPreviewApplyMs);
  const reqs = document.artefacts.filter(a => a.type === 'requirement');
  assert.equal(reqs.length, 1400); assert.equal(new Set(reqs.map(a => a.externalId)).size, 1400); assert.ok(reqs.every(a => a.confirmed === false && a.provenance), 'imported as unconfirmed drafts with provenance');
  report.checks.push('All 1,400 unique requirements imported as unconfirmed with external identity and provenance.');

  // Every column is a typed field, equal to its cell.
  const byExternal = new Map(reqs.map(a => [a.externalId, a]));
  for (const r of rows) {
    const a = byExternal.get(r.externalId), f = r.fields;
    assert.equal(a.description, f.description.trim()); assert.equal(a.title, titleOf(f.description)); assert.ok(a.title.length <= 160 && (f.description.trim().length <= 160 || a.title.endsWith('…')));
    for (const k of ['domain', 'capability', 'module', 'userGroup']) assert.equal(a[k], String(f[k] || '').trim().slice(0, 240), r.externalId + ' ' + k);
    for (const k of ASSESSMENT_FIELDS) assert.equal(a.assessment[k], f[k] || '', r.externalId + ' ' + k);
    assert.equal(a.priority, expectedPriority(r), r.externalId + ' priority');
  }
  assert.equal(Object.keys(INTAKE_FIELDS).length - ['externalId', 'description', 'owner', 'acceptance'].length, 4 + ASSESSMENT_FIELDS.length, 'each field other than identity, statement, owner and acceptance is a typed field');
  report.checks.push('Every workbook column is a typed field on the requirement and equals its cell; long statements keep a whole-word title.');
  report.priorities = want; report.priorityMap = priorityMap;
  report.checks.push(`The band mapping sets the priorities (Must ${want.Must}, Should ${want.Should}, Could ${want.Could}, not stated ${want.notStated}); a changed default is honoured.`);
  // GR-INT-19: a row with no band imports with its priority not stated and no basis, and sorts after every stated one.
  const unbanded = reqs.filter(a => !String(a.assessment.priorityBand).trim());
  if (synthetic) assert.deepEqual(unbanded.map(a => a.externalId).sort(), [...synthetic.manifest.cases.noBand].sort(), 'the planted rows with no band');
  assert.ok(unbanded.every(a => a.priority === '' && priorityBasisOf(a) === ''), 'no band: priority not stated, basis empty');
  const sorted = [...reqs].sort((x, y) => priorityRank('requirement', x.priority) - priorityRank('requirement', y.priority));
  assert.ok(!unbanded.length || sorted.slice(-unbanded.length).every(a => a.priority === ''), 'not stated sorts last');
  assert.ok(reqs.filter(a => a.priority).every(a => priorityBasisOf(a) === 'source band'), 'a priority a band set reads its basis as the source band');
  report.checks.push(`GR-INT-19: ${unbanded.length} rows with no band import with priority not stated and no basis, sorted last.`);

  // Groups: one per domain and capability theme, each requirement in exactly one of each, readers agree.
  const groups = requirementGroups(document), receipt = document.intake.datasets[0];
  assert.equal(groups.length, distinct('domain').length + distinct('capability').length); assert.deepEqual(receipt.groups.created.length, groups.length);
  assert.ok(groups.every(g => g.origin === 'import' && g.rule.length === 1 && g.source.datasetId === receipt.id));
  for (const kind of ['domain', 'theme']) { const of = groups.filter(g => g.kind === kind); assert.equal(of.reduce((n, g) => n + groupMembers(document, g.id).length, 0), 1400, kind + ' groups cover every requirement once'); }
  const sample = reqs[17]; assert.equal(groupsOf(document, sample.id).length, 2); assert.ok(groupsOf(document, sample.id).every(id => groupMembers(document, id).includes(sample.id)));
  const summary = groupSummary(document), largest = summary.filter(s => s.group.kind === 'theme').sort((a, b) => b.members - a.members)[0];
  assert.equal(largest.gaps, rows.filter(r => r.fields.capability === largest.group.title && isGap(r.fields.delivery)).length, 'delivery gaps per group');
  assert.ok(largest.members > 100, 'a group holds more than the old cap of 100 requirements');
  report.groups = {created: groups.length, domain: groups.filter(g => g.kind === 'domain').length, theme: groups.filter(g => g.kind === 'theme').length, largestMembers: largest.members};
  report.checks.push(`${groups.length} groups created from the domain and capability-theme columns; members and delivery gaps per group match the rows; the largest holds ${largest.members}.`);

  // Assurance as before: delivery gaps, additional assurance, repeated statements and the conflict.
  const a = sourceAssurance(document.artefacts, document);
  const expected = {deliveryGaps: rows.filter(r => isGap(r.fields.delivery)).length, additionalAssurance: rows.filter(r => !isGap(r.fields.delivery) && r.fields.delivery && (/^yes$/i.test(r.fields.manual.trim()) || /^(intermittent|untested|unreliable)$/i.test(r.fields.reliability.trim()))).length, missingEvidence: rows.filter(r => !r.fields.evidence).length};
  for (const k of Object.keys(expected)) assert.equal(a.counts[k], expected[k], k);
  if (real) { assert.equal(a.counts.deliveryGaps, 360); assert.equal(a.counts.additionalAssurance, 20); assert.equal(a.counts.repeatedGroups, 103); }
  else assert.equal(a.counts.repeatedGroups, synthetic.manifest.repeats.length);
  const conflictId = real ? 'FRD-022' : synthetic.manifest.conflict, conflict = byExternal.get(conflictId);
  assert.ok(a.findings.some(f => f.artefactId === conflict.id && f.code === 'source-conflict'), 'the comment that disagrees with “Delivered” is found');
  const markupFindings = a.findings.filter(f => f.code === 'source-markup');
  assert.deepEqual(markupFindings.map(f => document.artefacts.find(x => x.id === f.artefactId).externalId).sort(), markupRows.map(r => r.externalId).sort());
  if (synthetic) assert.equal(markupFindings[0].cleaned, 'Can the teller screen show the account balance before the cash is paid out?', 'the clean version keeps the words, not the tags');
  report.counts = {...a.counts, markup: markupFindings.length};
  report.checks.push(`${a.counts.deliveryGaps} delivery gaps, ${a.counts.additionalAssurance} additional assurance cases, ${a.counts.repeatedGroups} repeated-statement groups, the ${conflictId} conflict and ${markupFindings.length} pasted-markup statements detected.`);

  // ---------------------------------------------------------------- round 12, intake at depth (B2): what the rows say
  const field = (r, k) => String(r.fields[k] || '').trim(), count = pred => rows.filter(pred).length, flat = v => String(v || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const delivered = r => /^delivered$/i.test(field(r, 'delivery')), causeIds = (fs, code) => new Set(fs.filter(f => f.code === code).map(f => f.artefactId));
  // GR-INT-04, GR-SRC-04: the import summary counts the requirements by category and by band; delivered rows not fully
  // validated, rows with blocked tests and undelivered rows marked stable each raise their cause.
  const summary0 = importSummary(document), tallyOf = k => { const m = {}; for (const r of rows) { const v = field(r, k); if (v) m[v] = (m[v] || 0) + 1; } return m; };
  assert.deepEqual(Object.fromEntries(summary0.categories.map(c => [c.value, c.count])), tallyOf('category'), 'the import summary counts the requirements by category');
  assert.deepEqual(Object.fromEntries(summary0.bands.map(c => [c.value, c.count])), tallyOf('priorityBand'), 'and by band');
  assert.ok([...summary0.categories, ...summary0.bands].every(c => c.gaps === count(r => [field(r, 'category'), field(r, 'priorityBand')].includes(c.value) && isGap(r.fields.delivery))), 'each with its delivery gaps');
  assert.equal(summary0.counts.noBand, count(r => !field(r, 'priorityBand')));
  const unvalidated = rows.filter(r => delivered(r) && /\b(?:not|partial\w*|pending|in progress|incomplete|failed|outstanding)\b/i.test(field(r, 'validation'))), blocked = rows.filter(r => Number(r.fields.uatBlocked) > 0), stableGaps = rows.filter(r => isGap(r.fields.delivery) && !/partial|\bpart(?:ly)?\b/i.test(field(r, 'delivery')) && /^stable$/i.test(field(r, 'reliability')));
  const idsOf = rs => new Set(rs.map(r => byExternal.get(r.externalId).id));
  assert.deepEqual(causeIds(a.findings, 'delivery-validation'), idsOf(unvalidated), 'a delivered row not fully validated raises its cause');
  assert.deepEqual(causeIds(a.findings, 'test-blocked'), idsOf(blocked), 'a row with blocked tests raises its cause');
  assert.deepEqual(causeIds(a.findings, 'gap-stable'), idsOf(stableGaps), 'an undelivered row marked stable raises its cause');
  assert.deepEqual([a.counts.deliveredUnvalidated, a.counts.testBlocked, a.counts.gapStable], [unvalidated.length, blocked.length, stableGaps.length]);
  if (synthetic) assert.ok(unvalidated.length && blocked.length && stableGaps.length, 'the synthetic workbook holds each case');
  // The supplied workbook, as the round's reviewers counted it independently (counts only).
  if (real) assert.deepEqual([a.counts.deliveredUnvalidated, a.counts.testBlocked, a.counts.gapStable, a.counts.repeatConflicts], [6, 32, 3, 25]);
  report.checks.push(`GR-INT-04, GR-SRC-04: counts by category (${summary0.categories.length}) and band (${summary0.bands.length}); ${unvalidated.length} delivered but not fully validated, ${blocked.length} with blocked tests and ${stableGaps.length} undelivered but stable, each as one cause.`);
  // GR-SRC-02: identical statements whose statuses disagree raise one source-conflict cause (repeat-conflict) for their members.
  const same = new Map(); for (const r of rows) { const k = flat(r.fields.description); if (!same.has(k)) same.set(k, []); same.get(k).push(r); }
  const differ = (g, k) => new Set(g.map(r => field(r, k).toLowerCase()).filter(Boolean)).size > 1, disagreeing = [...same.values()].filter(g => g.length > 1 && (differ(g, 'delivery') || differ(g, 'reliability')));
  assert.equal(a.counts.repeatConflicts, disagreeing.length, 'every group of identical statements that disagree is counted');
  assert.deepEqual(causeIds(a.findings, 'repeat-conflict'), idsOf(disagreeing.flat()), 'and raises the conflict for its members');
  assert.equal(new Set(a.findings.filter(f => f.code === 'repeat-conflict').map(f => f.level)).size <= 1 && a.findings.filter(f => f.code === 'repeat-conflict').every(f => f.level === 'error'), true);
  assert.ok(a.repeated.every(g => g.statuses.length === g.ids.length), 'each repeated group lists its members with their statuses');
  if (synthetic) assert.ok(disagreeing.length >= 2, 'the synthetic repeats include groups that disagree');
  report.checks.push(`GR-SRC-02: ${disagreeing.length} of ${a.counts.repeatedGroups} groups of identical statements disagree on status; each raises one source-conflict cause for its members.`);
  // GR-INT-08, GR-INT-09: the statement checks (one ambiguity cause, each reason named) and the test objectives.
  const fs0 = findings(document), objectives = rows.filter(r => testObjective(r.fields.description)), ambiguous = rows.filter(r => statementChecks(r.fields.description, {title: titleOf(r.fields.description)}).length);
  assert.deepEqual(causeIds(fs0, 'test-objective'), idsOf(objectives), 'statements phrased as test objectives are flagged by one cause');
  assert.deepEqual(causeIds(fs0, 'ambiguity'), idsOf(ambiguous), 'the ambiguity cause reads every statement check');
  if (synthetic) {
    assert.deepEqual(objectives.map(r => r.externalId).sort(), [...synthetic.manifest.cases.testObjectives].sort(), 'the planted test objectives, and no other row');
    const unnamed = fs0.find(f => f.code === 'ambiguity' && f.artefactId === byExternal.get(synthetic.manifest.cases.unnamedRegulation).id);
    assert.ok(unnamed?.checks.includes('regulation') && /without naming the regulator or the instrument/.test(unnamed.detail), 'a regulation cited without its name is ambiguous, and says why');
    assert.ok(Object.values(synthetic.manifest.cases.regulations).flat().every(x => !fs0.some(f => f.code === 'ambiguity' && f.artefactId === byExternal.get(x).id)), 'a named regulation is not');
  }
  report.checks.push(`GR-INT-08, GR-INT-09: ${ambiguous.length} statements raise the ambiguity cause with their reasons; ${objectives.length} read as test objectives, one cause.`);
  // GR-SRC-03: per mapped column, the rows that fill it, leave it empty or repeat the statement word for word.
  const profile = receipt.profile;
  assert.deepEqual(profile.map(p => p.field).sort(), Object.entries(mapping).filter(([f, c]) => c && !['externalId', 'description'].includes(f)).map(([f]) => f).sort(), 'one profile line per mapped column');
  for (const p of profile) { const filled = count(r => field(r, p.field)); assert.deepEqual([p.filled, p.empty, p.sameAsStatement, p.distinct], [filled, rows.length - filled, count(r => field(r, p.field) && flat(field(r, p.field)) === flat(r.fields.description)), new Set(rows.map(r => field(r, p.field)).filter(Boolean)).size], p.field); }
  const outcomeLine = profile.find(p => p.field === 'outcome');
  assert.ok(outcomeLine.sameAsStatement > outcomeLine.filled / 2, 'the summary shows that the outcome column mostly repeats the statement');
  report.profile = Object.fromEntries(profile.map(p => [p.field, {filled: p.filled, empty: p.empty, sameAsStatement: p.sameAsStatement, distinct: p.distinct}]));
  report.checks.push(`GR-SRC-03: the receipt profiles ${profile.length} mapped columns; the outcome column repeats the statement in ${outcomeLine.sameAsStatement} of ${outcomeLine.filled} filled rows.`);
  // GR-SRC-06: a context sheet's column of person names is flagged, and its values stay out of the proposals and the receipt.
  const flagsOf = x => (x.personal || []).map(f => f.sheet + '!' + f.column);
  if (synthetic) {
    const leads = synthetic.manifest.cases.leads, key = leads.sheet + '!' + leads.column;
    assert.ok(flagsOf(receipt).includes(key) && receipt.personal.find(f => f.sheet + '!' + f.column === key).included === false, 'the column of group leads is flagged as personal data, not chosen');
    assert.ok(!preview.proposals.brief.sentences.some(x => x.text === leads.contact.text) && preview.proposals.withheld.brief === 1, 'the sentence naming a lead is held back from the brief proposal');
    assert.ok(!leads.names.some(n => JSON.stringify(document.intake).includes(n)), 'no lead\'s name is kept on the receipt');
    const chosen = await call('/api/intake?action=preview', {body: {...input, datasetId: receipt.id, personal: [key]}});
    assert.ok(chosen.proposals.brief.sentences.some(x => x.text === leads.contact.text && x.cell === leads.contact.cell) && chosen.proposals.personal.find(f => f.sheet + '!' + f.column === key).included, 'once the person chooses the column, the sentence is proposed');
  }
  report.personal = (receipt.personal || []).map(f => ({sheet: f.sheet, column: f.column, count: f.count, included: f.included}));
  report.checks.push(`GR-SRC-06: ${report.personal.length} columns of personal data flagged; their values stay out of the proposals and the receipt unless chosen.`);

  // Findings by cause, and a companion that names a handful.
  const fs = findings(document), causes = findingCauses(fs);
  assert.ok(causes.length < 25 && fs.length > 5000, `${fs.length} findings read as ${causes.length} causes`);
  const journey = causes.find(c => c.code === 'journey-link'); assert.equal(journey.count, 1400); assert.equal(journey.sentence, '1,400 requirements are needed at no journey step.');
  assert.equal(selectRequirements(document, {filter: {cause: 'journey-link'}}).length, 1400, 'a cause filters to the records it affects');
  const insight = storyInsights(storySource(document)).find(i => i.cause === 'journey-link');
  assert.ok(insight && insight.count === 1400 && (insight.text.match(/\b[A-Z]{2,4}-\d{3,4}\b/g) || []).length <= 5 && /and 1,395 more/.test(insight.text), 'the companion names at most five records and counts the rest: ' + insight?.text.slice(0, 200));
  report.causes = Object.fromEntries(causes.map(c => [c.code, c.count]));
  report.checks.push(`${fs.length} Chapter 1 findings read as ${causes.length} causes, each with its count and a filter to its records; the companion names five records and counts the rest.`);

  // What the import proposes: stakeholders and a brief, accepted by the person.
  const proposals = receipt.proposals; assert.equal(proposals.stakeholders.length, distinct('userGroup').length); assert.ok(proposals.stakeholders.every(s => s.status === 'proposed'));
  assert.equal(document.artefacts.filter(x => x.type === 'stakeholder').length, 0, 'no stakeholder is created before the person accepts');
  const names = proposals.stakeholders.map(s => s.name);
  await command('requirements.proposals', {datasetId: receipt.id, stakeholders: {accept: names.slice(0, -1), dismiss: names.slice(-1)}, reviewed: true});
  const stakeholders = document.artefacts.filter(x => x.type === 'stakeholder');
  assert.equal(stakeholders.length, names.length - 1); assert.ok(stakeholders.every(s => s.origin === 'import' && !s.confirmed && s.userGroup && s.source.includes(filename)));
  // Round 12 (DM-12): each accepted user group links the rule group 'user group is X', of kind user-group, which holds
  // the requirements imported for that user group; its priority is not stated.
  const userGroups = requirementGroups(document).filter(g => g.kind === 'user-group');
  assert.equal(userGroups.length, names.length - 1); assert.ok(stakeholders.every(s => s.priority === '' && s.requirementGroupIds?.length === 1 && userGroups.some(g => g.id === s.requirementGroupIds[0] && g.rule[0].field === 'userGroup' && g.rule[0].value === s.userGroup && groupMembers(document, g.id).length === document.artefacts.filter(a => a.type === 'requirement' && a.userGroup?.toLowerCase() === s.userGroup.toLowerCase()).length)), 'an accepted user group links its rule group, which holds its requirements');
  assert.equal(document.intake.datasets[0].proposals.stakeholders.at(-1).status, 'dismissed');
  await refused('/api/commands', {revision, command: {type: 'requirements.proposals', payload: {datasetId: receipt.id, stakeholders: {accept: [names[0]]}, reviewed: true}}}, /accepted already/);
  const sentences = proposals.brief.sentences, cited = sentences.map(x => x.sheet + '!' + x.cell);
  await command('requirements.proposals', {datasetId: receipt.id, brief: {accept: {problem: sentences.filter(x => x.part === 'problem').map(x => x.text).join(' ') || sentences[0].text, goal: sentences.filter(x => x.part === 'goal').map(x => x.text).join(' '), source: filename + ': ' + cited.join(', ')}}, reviewed: true});
  assert.ok(document.brief.problem.length > 20 && document.brief.source.includes(sentences[0].cell) && document.brief.confirmed === false, 'the brief is the accepted sentences, citing their cells, unconfirmed');
  report.proposals = {stakeholders: names.length, brief: sentences.length, briefSheets: proposals.brief.sheets.length};
  report.checks.push(`${names.length} user groups proposed as stakeholders and ${sentences.length} brief sentences proposed with their cells; nothing is created until the person accepts.`);

  // Confirming at scale: one reviewed step per selection, journalled once.
  const domainGroup = groups.find(g => g.kind === 'domain'), members = groupMembers(document, domainGroup.id), events = document.changes?.events?.length || 0;
  await refused('/api/commands', {revision, command: {type: 'requirements.confirm', payload: {filter: {groupId: domainGroup.id}, count: members.length + 1, reviewed: true}}}, /selection changed/);
  await refused('/api/commands', {revision, command: {type: 'requirements.confirm', payload: {filter: {groupId: domainGroup.id}, count: members.length}}}, /Review the requirements/);
  await timed('bulkConfirmMs', () => command('requirements.confirm', {filter: {groupId: domainGroup.id}, count: members.length, reviewed: true}));
  assert.equal(document.changes.events.length, events + 1, 'one journal event for the whole step'); assert.deepEqual(document.changes.events.at(-1).requirementIds, members);
  assert.ok(members.every(id => document.artefacts.find(x => x.id === id).confirmed));
  const rest = document.artefacts.filter(x => x.type === 'requirement' && !x.confirmed).length;
  await command('requirements.confirm', {filter: {}, count: rest, reviewed: true});
  assert.ok(document.artefacts.filter(x => x.type === 'requirement').every(x => x.confirmed)); assert.equal(document.changes.events.length, events + 2);
  assert.ok(!findings(document).some(f => f.code === 'confirmation' && f.artefactId.startsWith('REQ-')), 'no requirement waits for confirmation');
  report.checks.push(`Bulk confirmation: ${members.length} requirements of ${domainGroup.title} and then the other ${rest} in two reviewed steps, each counted and journalled once.`);

  // A reason for missing evidence, recorded for a theme group, clears that finding for its members only.
  const theme = groups.filter(g => g.kind === 'theme').sort((x, y) => groupMembers(document, y.id).length - groupMembers(document, x.id).length)[1], themed = groupMembers(document, theme.id);
  const lacking = themed.filter(id => !document.artefacts.find(x => x.id === id).assessment.evidence);
  await timed('evidenceTreatmentMs', () => command('requirements.evidence', {filter: {groupId: theme.id}, reason: 'The source workbook records no evidence for this theme; the test cycles are being re-run.', count: lacking.length, reviewed: true}));
  const evidence = findings(document).filter(f => f.code === 'source-evidence');
  assert.ok(!evidence.some(f => themed.includes(f.artefactId)) && evidence.length === expected.missingEvidence - lacking.length, 'the treated group no longer reports missing evidence; the others still do');
  report.checks.push(`A reviewed reason for missing evidence, recorded for the ${lacking.length} requirements of ${theme.title}, clears that finding for them alone.`);

  // As before: the source of one row, a no-op re-import, a save, a reload, a filtered page and the external-id search.
  const firstRow = rows.find(r => r.externalId === conflictId);
  const src = await call('/api/intake?action=source&dataset=' + receipt.id + '&externalId=' + encodeURIComponent(conflictId)); assert.equal(src.row.values.length, 27); assert.equal(src.row.sourceRow, firstRow.sourceRow); assert.equal(src.row.values[3].address, 'D' + firstRow.sourceRow);
  const reinput = {...input, datasetId: receipt.id}, again = await call('/api/intake?action=preview', {body: reinput}); assert.equal(again.counts.unchanged, 1400);
  const unchanged = await call('/api/intake?action=apply', {body: {...reinput, revision, previewStamp: again.stamp, reviewed: true}}); assert.equal(unchanged.revision, revision);
  report.checks.push('Unchanged re-import is a no-op: no duplicated IDs or revision churn.');
  const saved = await timed('singleRecordSaveMs', () => command('artefact', {...conflict, ...document.artefacts.find(x => x.id === conflict.id), title: 'Architect-reviewed audit requirement'}));
  assert.equal(saved.document.artefacts.find(x => x.id === conflict.id).externalId, conflictId);
  const kept = saved.document.artefacts.find(x => x.id === conflict.id); assert.equal(kept.module, conflict.module); assert.equal(kept.userGroup, conflict.userGroup);
  const reload = await timed('projectReloadMs', () => call('/api/project')); assert.equal(reload.document.artefacts.filter(x => x.type === 'requirement').length, 1400); assert.equal(reload.document.artefacts.find(x => x.id === conflict.id).title, 'Architect-reviewed audit requirement');
  const domain = real ? 'Audit Log' : distinct('domain')[0], domainGaps = rows.filter(r => r.fields.domain === domain && isGap(r.fields.delivery)).length;
  const page = await timed('filteredPageMs', () => call('/api/requirements?domain=' + encodeURIComponent(domain) + '&gaps=1')); assert.equal(page.total, domainGaps); assert.ok(page.rows.length <= 50); if (real) assert.equal(page.total, 40);
  const search = await call('/api/requirements?q=' + encodeURIComponent(conflictId)); assert.equal(search.total, 1); assert.equal(search.rows[0].id, conflict.id);
  report.checks.push('Persisted edits retain imported metadata; save/reload, indexed domain filter and external-ID search pass.');
  const foreign = await worker.fetch(new Request(origin + '/api/intake?action=source&project=' + projectId + '&dataset=' + receipt.id, {headers: {'oai-authenticated-user-id': 'another-owner'}}), env); assert.equal(foreign.status, 404);
  const foreignConfirm = await worker.fetch(new Request(origin + '/api/commands?project=' + projectId, {method: 'POST', headers: {'oai-authenticated-user-id': 'another-owner', Origin: origin, 'Content-Type': 'application/json'}, body: JSON.stringify({revision, command: {type: 'requirements.confirm', payload: {filter: {}, count: 0, reviewed: true}}})}), env); assert.equal(foreignConfirm.status, 404);
  report.checks.push('Workbook, project source and bulk commands remain owner-scoped.');

  // Source updates cannot overwrite an architect's edits without a reviewed choice.
  const edited = structuredClone(rows); const row = edited.find(r => r.externalId === conflictId); row.fields.description += ' Source revision.'; row.rowHash = 'changed';
  const changedSource = {...source, rows: edited, datasetId: receipt.id, revision: 2, filename, sheet: SHEET, headerRow: 5, workbookHash: sourceHash + 'changed', priorityMap};
  const cp = previewIntake(reload.document, changedSource, rows); assert.equal(cp.changes.find(c => c.externalId === conflictId).kind, 'conflict');
  assert.throws(() => applyIntake(reload.document, changedSource, cp, {previewStamp: cp.stamp, reviewed: true}, new Date().toISOString(), 'tester'), /keep or replace/);
  report.checks.push('Source updates cannot overwrite architect edits without a reviewed conflict choice.');

  // The milestone is no longer out of reach for want of evidence: what remains open is design work, not the source.
  const ready = milestones(reload.document).find(m => m.id === 'requirements');
  assert.ok(!findings(reload.document).some(f => ['confirmation'].includes(f.code) && f.artefactId.startsWith('REQ-')), 'confirmation is not what keeps requirements from ready');
  report.milestone = ready.detail;

  // Recovery of the whole project, original bytes and cell snapshots included.
  const recovery = await buildRecovery(env, {owner: 'intake-reviewer'}, projectId), recoveryPreview = await previewRecovery(recovery); const restored = await call('/api/recovery?action=restore', {body: {package: recovery, hash: recoveryPreview.hash, name: 'Restored workbook design', reviewed: true}}); const originalId = projectId; projectId = restored.id;
  const restoredSource = await call('/api/intake?action=source&dataset=' + receipt.id + '&externalId=' + encodeURIComponent(conflictId)); assert.equal(restoredSource.row.values[3].address, 'D' + firstRow.sourceRow);
  const original = await worker.fetch(new Request(origin + '/api/intake?action=download&project=' + projectId + '&uploadId=' + upload.id, {headers: {'oai-authenticated-user-id': 'intake-reviewer'}}), env); assert.equal(original.status, 200); assert.equal(await sha256(await original.arrayBuffer()), sourceHash);
  const restoredProject = await call('/api/project'); assert.equal(restoredProject.document.artefacts.filter(x => x.type === 'requirement').length, 1400); assert.equal(restoredProject.document.artefacts.find(x => x.id === conflict.id).title, 'Architect-reviewed audit requirement'); assert.equal(requirementGroups(restoredProject.document).filter(g => g.kind !== 'user-group').length, groups.length); projectId = originalId;
  report.checks.push('Complete 1,400-row recovery restores the edited model, its groups, original workbook bytes and exact cell-level source snapshots.');

  // ---------------------------------------------------------------- round 12, intake at depth (B2): what a person does with it
  ({revision, document} = await call('/api/project'));
  const reqOf = ext => document.artefacts.find(x => x.type === 'requirement' && x.externalId === ext);
  // GR-INT-07: a number stored with a date format arrives as its ISO date; the snapshot keeps the stored number beside it.
  if (synthetic) {
    const dated = synthetic.manifest.cases.dateCells; assert.ok(dated.length > 10, 'the synthetic workbook stores dates as date cells');
    for (const ext of dated) assert.equal(reqOf(ext).assessment.date, synthetic.manifest.rows.find(r => r.id === ext).date, ext + ' date');
    const cellQ = (await call('/api/intake?action=source&dataset=' + receipt.id + '&externalId=' + encodeURIComponent(dated[0]))).row.values.find(v => v.label === 'Validation_Date');
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(cellQ.value) && cellQ.type === 'd' && /^\d+$/.test(cellQ.raw), 'the original cell keeps the stored number: ' + JSON.stringify(cellQ));
    report.checks.push(`GR-INT-07: ${dated.length} date cells (two date formats) import as ISO dates; the snapshot keeps each stored number.`);
  }
  // GR-SRC-04, GR-SRC-05: the workbook's own list of anomalies, set beside AIW's causes, and its row references checked.
  const lists = importSummary(document).lists;
  report.lists = lists.map(l => ({sheet: l.sheet, range: l.range, count: l.count, both: l.reconciliation.both, sourceOnly: l.reconciliation.sourceOnly.length, byCause: l.reconciliation.byCause, rowReferences: l.rowReferences.map(x => ({label: x.label, checked: x.checked, exact: x.exact, offBy: x.offBy}))}));
  if (synthetic) {
    const own = synthetic.manifest.cases.anomalies, list = lists.find(l => l.sheet === own.sheet);
    assert.ok(list && list.range === own.range && list.ids.join() === own.ids.join(), 'the workbook\'s own anomaly list is found: ' + JSON.stringify(report.lists));
    const r = list.reconciliation, by = Object.fromEntries(r.byCause.map(c => [c.code, c]));
    assert.deepEqual([r.listed, r.both, r.sourceOnly], [own.ids.length, own.ids.length - 1, [own.quiet]], 'every listed row but one is raised by AIW too; the one it does not raise is named');
    assert.ok(by['delivery-assurance'].both >= 1 && by['gap-stable'].both >= 1 && by['gap-stable'].aiwOnly === by['gap-stable'].aiw - by['gap-stable'].both, 'per cause: AIW\'s count, the overlap and AIW\'s own');
    assert.deepEqual(list.rowReferences.map(x => [x.label, x.offBy, x.exact]), [['Source_Row', own.offBy, 0]], 'its row references are one row short');
  }
  if (real) assert.ok(lists.some(l => l.count === 15 && l.reconciliation.both === 15 && l.rowReferences.some(x => x.offBy === -1)), 'the supplied workbook\'s own anomaly list of 15, every one raised by AIW, its row references one short');
  report.checks.push(`GR-SRC-04, GR-SRC-05: ${lists.length} lists the workbook keeps of its requirements, each reconciled with AIW's causes and its row references checked.`);

  // GR-INT-04: distinct intended outcomes are offered as outcome proposals; a person accepts or dismisses them.
  const distinctOutcomes = new Set(rows.filter(r => field(r, 'outcome') && flat(field(r, 'outcome')).replace(/[.!;:,\s]+$/, '') !== flat(r.fields.description).replace(/[.!;:,\s]+$/, '') && !/<\/?(?:div|p|span|b)\b/i.test(field(r, 'outcome'))).map(r => flat(field(r, 'outcome')).replace(/[.!;:,\s]+$/, '')));
  const offered = receipt.proposals.outcomes || [];
  assert.equal(offered.length, Math.min(200, distinctOutcomes.size), 'one outcome proposal per distinct intended outcome');
  assert.ok(offered.length >= 2 && offered.every(o => o.status === 'proposed' && o.externalIds.length === o.count), 'each with the rows that state it');
  const outcomesBefore = document.artefacts.filter(x => x.type === 'outcome').length;
  await refused('/api/commands', {revision, command: {type: 'requirements.proposals', payload: {datasetId: receipt.id, outcomes: {accept: ['no-such-key']}, reviewed: true}}}, /not an outcome this import proposed/);
  await command('requirements.proposals', {datasetId: receipt.id, outcomes: {accept: [offered[0].key], dismiss: [offered[1].key]}, reviewed: true});
  const outcome = document.artefacts.filter(x => x.type === 'outcome');
  assert.equal(outcome.length, outcomesBefore + 1, 'one outcome created for the one accepted'); const made = outcome.at(-1);
  assert.ok(made.origin === 'import' && !made.confirmed && made.description === offered[0].text, 'the outcome says what the row says, unconfirmed');
  assert.deepEqual(document.relationships.filter(l => l.to === made.id && l.kind === 'delivers').map(l => l.from).sort(), offered[0].externalIds.map(x => reqOf(x).id).sort(), 'the rows that state it deliver it');
  assert.deepEqual(document.intake.datasets[0].proposals.outcomes.slice(0, 2).map(o => o.status), ['accepted', 'dismissed']);
  report.checks.push(`GR-INT-04: ${offered.length} distinct intended outcomes offered as outcome proposals; one accepted (delivered by its ${offered[0].count} rows), one dismissed.`);
  // GR-INT-10: rows naming a regulator or an instrument are proposed, not created, as Chapter 1 constraints with their
  // constraint driver (kind C); a person accepts one.
  const regulated = receipt.proposals.constraints || [];
  if (synthetic) assert.deepEqual(Object.fromEntries(regulated.map(c => [c.name, [...c.externalIds].sort()])), Object.fromEntries(Object.entries(synthetic.manifest.cases.regulations).map(([k, v]) => [k, [...v].sort()])), 'one proposal per regulator or instrument the rows name, with the rows');
  assert.ok(regulated.every(c => c.status === 'proposed' && c.driverKind === 'constraint'), 'proposed as constraints with a C driver');
  assert.equal(document.artefacts.filter(x => x.type === 'constraint').length, 0, 'none is created before a person accepts it');
  if (regulated.length) {
    const pick = regulated[0], driversBefore = document.quality.drivers.length;
    await command('requirements.proposals', {datasetId: receipt.id, constraints: {accept: [pick.key]}, reviewed: true});
    const con = document.artefacts.find(x => x.type === 'constraint'), driver = document.quality.drivers.at(-1), code = driverCodes(document).get(driver.id);
    assert.ok(con && con.origin === 'import' && !con.confirmed && con.title.includes(pick.name), 'the constraint names what the rows name: ' + con?.title);
    assert.deepEqual(document.relationships.filter(l => l.from === con.id && l.kind === 'constrains').map(l => l.to).sort(), pick.externalIds.map(x => reqOf(x).id).sort(), 'it constrains the rows that name it');
    assert.ok(document.quality.drivers.length === driversBefore + 1 && driver.kind === 'constraint' && /^C\d+$/.test(code) && driver.constraintIds.join() === con.id && !driver.confirmed && driver.origin === 'suggestion', 'its constraint driver, kind C, unconfirmed: ' + code);
    report.checks.push(`GR-INT-10: ${regulated.length} regulators or instruments named by the rows, proposed as constraints; one accepted as ${con.id} with driver ${code}.`);
  }
  // GR-INT-09: a test objective linked as verifying the requirement it tests is told apart.
  const objective = objectives[0] && reqOf(objectives[0].externalId), tested = document.artefacts.find(x => x.type === 'requirement' && x.id !== objective?.id && !testObjective(x.description));
  if (objective) {
    await command('relationship', {from: objective.id, to: tested.id, kind: 'verifies'});
    const after = findings(document);
    assert.ok(!after.some(f => f.code === 'test-objective' && f.artefactId === objective.id) && after.filter(f => f.code === 'test-objective').length === objectives.length - 1, 'linked as verifying another requirement, it leaves the cause');
    report.checks.push(`GR-INT-09: ${objective.externalId} linked as verifying ${tested.externalId}; the test-objective cause clears for it.`);
  }
  // GR-SRC-02: a person records "same requirement" or "distinct scope" for a group of identical statements that disagree.
  const groupsNow = sourceAssurance(document.artefacts, document).repeated.filter(g => g.disagree);
  if (groupsNow.length) {
    const g = groupsNow[0], conflictOf = id => findings(document).some(f => f.code === 'repeat-conflict' && f.artefactId === id);
    await refused('/api/commands', {revision, command: {type: 'requirements.repeated', payload: {group: g.id, judgement: 'distinct scope', reason: 'Branches.', reviewed: true}}}, /in a sentence/);
    await refused('/api/commands', {revision, command: {type: 'requirements.repeated', payload: {group: g.id, judgement: 'distinct scope', reason: 'Each row covers a different product line, so their statuses differ.'}}}, /Review the identical statements/);
    await refused('/api/commands', {revision, command: {type: 'requirements.repeated', payload: {group: 'no-such-group', judgement: 'same', reason: 'They are the same requirement written twice.', reviewed: true}}}, /no longer exists/);
    const before = document.changes.events.length;
    await command('requirements.repeated', {group: g.id, judgement: 'distinct scope', reason: 'Each row covers a different product line, so their statuses differ.', reviewed: true});
    assert.ok(g.ids.every(id => !conflictOf(id)) && document.changes.events.length === before + 1, 'distinct scope answers the conflict, journalled once');
    if (groupsNow[1]) {
      const h = groupsNow[1]; await command('requirements.repeated', {group: h.id, judgement: 'same requirement', reason: 'The same requirement was entered twice; the later status stands.', reviewed: true});
      assert.ok(h.ids.every(id => !conflictOf(id)) && h.ids.slice(1).every(id => document.relationships.some(l => l.from === id && l.to === h.ids[0] && l.kind === 'duplicates')), 'same requirement links the copies as duplicates and answers the conflict');
    }
    report.checks.push(`GR-SRC-02: a person judged ${groupsNow[1] ? 2 : 1} disagreeing groups (distinct scope; same requirement, linked as duplicates); their conflicts clear.`);
  }

  // GR-INT-05, GR-SRC-05, GR-SRC-06: a further sheet enriches the requirements and creates none.
  const enrichable = [];
  for (const s of upload.sheets.map(x => x.name).filter(n => n !== SHEET)) {
    const x = await call('/api/intake?action=inspect', {body: {uploadId: upload.id, sheet: s, mode: 'enrich'}});
    if (x.matches > 0 && x.mapping.joinId && ['testCase', 'execution', 'evidence'].some(k => x.mapping[k])) enrichable.push(x);
  }
  assert.ok(enrichable.length >= 1, 'a further sheet holds evidence keys for the requirements');
  const ei = enrichable[0];
  assert.ok(ei.personal.every(f => !f.included && !Object.values(ei.mapping).includes(f.column)), 'a column of personal data is flagged and offered to no field');
  if (real) assert.ok(ei.personal.length >= 1, 'the supplied sheet\'s column of named people is flagged');
  if (synthetic) {
    const plan = synthetic.manifest.cases.enrich; assert.equal(ei.sheet, plan.sheet);
    assert.ok(ei.personal.some(f => f.column === plan.personColumn && !f.included) && !Object.values(ei.mapping).includes(plan.personColumn), 'the column of tester names is flagged and not mapped');
  }
  const einput = {uploadId: upload.id, sheet: ei.sheet, headerRow: ei.headerRow, mapping: ei.mapping, mode: 'enrich'};
  const ep = await call('/api/intake?action=preview', {body: einput});
  const requirementsBefore = document.artefacts.filter(x => x.type === 'requirement').length, lacked = document.artefacts.filter(x => x.type === 'requirement' && findings(document).some(f => f.code === 'source-evidence' && f.artefactId === x.id)).map(x => x.id);
  if (synthetic) {
    const plan = synthetic.manifest.cases.enrich;
    assert.deepEqual([ep.counts.rows, ep.counts.duplicates, ep.counts.unmatched, ep.counts.requirements], [plan.rows, plan.duplicates, plan.unmatched.length, Object.keys(plan.matched).length], 'every row read, the exact duplicates dropped, the unknown ids reported: ' + JSON.stringify(ep.counts));
    assert.deepEqual(ep.unmatched, plan.unmatched); assert.ok(plan.blankColumns.every(l => ep.blankColumns.some(c => c.label === l)), 'the all-blank columns reported by cause');
    assert.ok(ep.duplicates.length === plan.duplicates && ep.duplicates.every(d => d.of < d.row), 'each dropped row names the row it repeats');
    assert.deepEqual(ep.rowReferences.map(x => [x.label, x.offBy]), [['Source_Row', plan.offBy]], 'its row references are one row short');
  }
  if (real) assert.deepEqual([ep.counts.duplicates, ep.counts.requirements, ep.blankColumns.length], [166, 176, 5], 'the supplied sheet: its exact duplicates, the requirements it names and its blank columns');
  const ea = await call('/api/intake?action=apply', {body: {...einput, revision: ep.projectRevision, previewStamp: ep.stamp, reviewed: true}}); ({revision, document} = ea);
  assert.equal(document.artefacts.filter(x => x.type === 'requirement').length, requirementsBefore, 'no requirement is created');
  const enriched = document.artefacts.filter(x => x.enrichment?.[ep.datasetId]);
  assert.equal(enriched.length, ep.counts.requirements, 'every matched requirement holds what the sheet says of it');
  if (synthetic) for (const [ext, keys] of Object.entries(synthetic.manifest.cases.enrich.matched)) { const f = reqOf(ext).enrichment[ep.datasetId].fields; assert.deepEqual([f.testCase, f.execution, f.testStatus], [keys.testCase, keys.execution, keys.testStatus], ext + ' evidence keys'); }
  const nowLacking = new Set(findings(document).filter(f => f.code === 'source-evidence').map(f => f.artefactId));
  assert.ok(enriched.every(x => !nowLacking.has(x.id)) && lacked.filter(id => !enriched.some(x => x.id === id)).every(id => nowLacking.has(id)), 'an evidence key from the further sheet answers the missing-evidence finding for its requirements only');
  const enrichReceipt = document.intake.datasets.find(d => d.id === ep.datasetId);
  assert.ok(enrichReceipt.mode === 'enrich' && enrichReceipt.duplicates.count === ep.counts.duplicates && enrichReceipt.blankColumns.length === ep.blankColumns.length, 'the receipt keeps what the enrichment reported');
  assert.equal(document.changes.events.at(-1).source.kind, 'intake-enrich', 'the enrichment is journalled once');
  const keptRow = (await call('/api/intake?action=source&dataset=' + ep.datasetId + '&externalId=' + encodeURIComponent(enriched[0].externalId))).row;
  assert.ok(ei.personal.every(f => keptRow.values.filter(v => v.column === f.column).every(v => v.value === '')) && keptRow.values.some(v => v.withheld === 'personal data') === ei.personal.length > 0, 'the snapshot keeps none of the personal data held back');
  if (synthetic) assert.equal(keptRow.values.find(v => v.column === synthetic.manifest.cases.enrich.personColumn).withheld, 'personal data', 'the tester\'s name is held back');
  report.enrich = {sheet: ei.sheet, joinColumn: ep.joinColumn, counts: ep.counts, blankColumns: ep.blankColumns.length, rowReferences: ep.rowReferences.map(x => ({checked: x.checked, exact: x.exact, offBy: x.offBy})), personal: ei.personal.length};
  report.checks.push(`GR-INT-05, GR-SRC-05, GR-SRC-06: ${ei.sheet} enriched ${ep.counts.requirements} requirements and created none: ${ep.counts.duplicates} exact duplicate rows dropped, ${ep.counts.unmatched} unknown ids and ${ep.blankColumns.length} blank columns reported, ${ei.personal.length} personal columns held back.`);

  // GR-INT-06, GR-INT-03: a new revision of the workbook (its capability header renamed, one row's delivery status
  // changed) is proposed the saved mapping, and the changed assertion is journalled with the design built on it.
  if (synthetic) {
    const target = synthetic.manifest.rows.find(r => r.status === 'Not Delivered' && !synthetic.manifest.repeats.flat().includes(r.id) && reqOf(r.id)?.confirmed), req = reqOf(target.id);
    const linked = await command('quality.driver', {kind: 'functional', title: 'Close the delivery gap of one requirement', requirementIds: [req.id]}), driverId = linked.selected;
    const next = syntheticWorkbook({revise: {headers: {Capability_Theme: 'Capability Theme (revised)'}, rows: {[target.id]: {status: 'Delivered'}}}});
    const up2 = await call('/api/intake?action=upload&filename=' + encodeURIComponent(filename), {bytes: next.bytes});
    const in2 = await call('/api/intake?action=inspect', {body: {uploadId: up2.id, sheet: SHEET}});
    assert.equal(in2.datasetId, receipt.id, 'the new revision is matched to its dataset');
    assert.equal(in2.mapping.capability, receipt.mapping.capability, 'the saved column is proposed although its header changed');
    assert.notEqual(suggestMapping(in2.headers).capability, receipt.mapping.capability, 'where the automatic suggestion would not find it');
    assert.ok(in2.differences.some(d => d.field === 'capability' && d.kind === 'renamed' && d.saved.label === 'Capability_Theme'), 'and the difference is listed before the preview: ' + JSON.stringify(in2.differences));
    assert.equal(in2.bands.map[changed], priorityMap[changed], 'the saved band mapping is proposed, the person\'s change included');
    const p2 = await call('/api/intake?action=preview', {body: {uploadId: up2.id, sheet: in2.sheet, headerRow: in2.headerRow, mapping: in2.mapping, priorityMap: in2.bands.map, datasetId: in2.datasetId}});
    assert.deepEqual([p2.counts.update, p2.counts.unchanged], [1, rows.length - 1], 'only the one row changes: ' + JSON.stringify(p2.counts));
    assert.deepEqual(p2.changes.find(c => c.kind === 'update').changedCells.map(c => [c.label, c.after]), [['Delivery_Status', 'Delivered']]);
    const journalled = document.changes.events.length;
    ({revision, document} = await call('/api/intake?action=apply', {body: {uploadId: up2.id, sheet: in2.sheet, headerRow: in2.headerRow, mapping: in2.mapping, priorityMap: in2.bands.map, datasetId: in2.datasetId, revision: p2.projectRevision, previewStamp: p2.stamp, reviewed: true}}));
    const added = document.changes.events.slice(journalled);
    assert.equal(added.length, 1, 'one change journalled');
    const e = added[0];
    assert.deepEqual([e.source.kind, e.source.id, e.fields.map(f => [f.key, f.before, f.after])], ['source-assertion', req.id, [['delivery', 'Not Delivered', 'Delivered']]], 'the source-assertion change, before and after');
    assert.ok(e.items.some(i => i.id === driverId && i.chapter === 2), 'the design records built on it are listed for review');
    assert.equal(reqOf(target.id).confirmed, true, 'its confirmation stands');
    assert.ok(changeCauses(document).some(c => c.id === e.id && c.open >= 1), 'reviewed as one cause');
    report.checks.push(`GR-INT-06, GR-INT-03: revision 2 is proposed the saved mapping (a renamed header followed, ${in2.differences.length} differences listed); one row's delivery change is journalled as ${e.id} with ${e.items.length} design records for review, confirmation kept.`);
  }

  // GR-INT-11: the project's workload limits refuse the 5,001st requirement, the 6,001st artefact and the 20,001st relationship.
  const roomy = seedProject(), filler = (type, n, from) => Array.from({length: n}, (_, i) => ({id: type.slice(0, 3).toUpperCase() + '-X' + (from + i), type, title: type + ' ' + (from + i), description: 'Filler.', owner: '', source: 'Synthetic', priority: '', acceptance: '', confirmed: false, origin: 'user', scopeMode: 'in', order: 0, modelRef: ''}));
  const fullReqs = {...roomy, artefacts: [...roomy.artefacts, ...filler('requirement', 5000 - roomy.artefacts.filter(x => x.type === 'requirement').length, 1)]};
  assert.throws(() => applyCommand(fullReqs, {type: 'artefact', payload: {type: 'requirement', title: 'The 5,001st requirement'}}), /up to 5,000 requirements/);
  const fullArtefacts = {...roomy, artefacts: [...roomy.artefacts, ...filler('outcome', 6000 - roomy.artefacts.length, 1)]};
  assert.throws(() => applyCommand(fullArtefacts, {type: 'artefact', payload: {type: 'scope', title: 'The 6,001st artefact'}}), /6,000 total artefacts/);
  const fullLinks = {...roomy, relationships: [...roomy.relationships, ...Array.from({length: 20000 - roomy.relationships.length}, (_, i) => ({id: 'REL-X' + i, from: 'REQ-001', to: 'OUT-001', kind: 'supports'}))]};
  assert.throws(() => applyCommand(fullLinks, {type: 'relationship', payload: {from: 'REQ-002', to: 'OUT-002', kind: 'supports'}}), /up to 20,000 requirement relationships/);
  assert.throws(() => previewIntake(fullReqs, {...source, datasetId: 'workbook-limit', rows: rows.slice(0, 1), revision: 1}), /5,000 requirements \/ 6,000 artefacts/);
  report.checks.push('GR-INT-11: the 5,001st requirement, the 6,001st artefact and the 20,001st relationship are refused with their messages, and an import past the workload too.');
  // GR-SRC-10 (round 23): a near-unique column proposes no groups and says it has too many values to group by.
  {
    const {groupProposals} = await import('./public/intake-proposals.js');
    const rows = Array.from({length: 240}, (_, i) => ({fields: {domain: 'Area ' + i, capability: i % 2 ? 'Payments' : 'Lending'}}));
    const [byDomain, byTheme] = groupProposals({artefacts: []}, {mapping: {domain: 'C', capability: 'D'}, headers: [{column: 'C', label: 'Area'}, {column: 'D', label: 'Theme'}], rows});
    assert.deepEqual([byDomain.distinct, byDomain.skipped, byDomain.values.length], [240, 'More than 200 distinct values: too many to group by.', 0], 'a near-unique column: no groups, and why');
    assert.deepEqual(byTheme.values.map(v => [v.value, v.count]), [['Lending', 120], ['Payments', 120]], 'a column of few values: one group each');
    report.checks.push('GR-SRC-10: a column of 240 distinct values proposes no groups and says it has too many values to group by; a column of two values proposes two groups.');
  }
  if (real) assert.equal(await sha256(await readFile(real)), sourceHash);
  report.sourceHash = sourceHash; report.peakRssMiB = Math.round(process.resourceUsage().maxRSS / 1024); report.status = 'passed';
  if (process.env.AIW_REPORT) await writeFile(process.env.AIW_REPORT, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
} finally { DB.close(); await rm(root, {recursive: true, force: true}); }
