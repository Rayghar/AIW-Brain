// The SDD's architecture edition (round 12, workstream F; audit/round12/SDD-SPEC.md; GR-SDD-02, 04, 07, 10 to 15, 19,
// 24 to 26, GR-FIG-08). On a synthetic project that holds every record kind (sdd-fixtures.mjs richProject: the
// reference journey under another name with an imported synthetic workbook, drivers of every kind, decisions in every
// category, component properties and containers, a party's integration fields, plateaus, a lens and Sol's drafts) and
// on a blank project:
//   1. the sections in SDD-SPEC's order, each saying "None recorded" in one line when empty;
//   2. document control: the version from the baseline sequence, the status, "Approvals: none recorded" unless an
//      approval record exists, and the provenance line in every edition, unclipped;
//   3. drivers by kind with their codes, decisions as a log and by category I to V, the component table's columns, the
//      component detail, external integrations with the party's fields, the C4 figures with their purpose lines;
//   4. every round-12 field where it is recorded, and (format 2, round 24, D-24-06) nothing in the record where it is not:
//      the record's marker names it for the content reader, the section's "Open questions" list names it once (one
//      question asked of several fields is one line), and Appendix B lists it by cause under one label, with no
//      change-history marker; the decisions in their order (platform-wide, then broadest); key functionalities with
//      shared groups said once; the purpose and audience, when not stated, said once in a plain sentence;
//   5. Appendix A by group with the source's delivery facts, the gap plan with the components and plateaus, a group
//      printed as its label wherever a record links it;
//   6. the audiences: review keeps the architecture's reasoning (sections 2, 3 and 6, the shape in brief, B, C and E,
//      no change journal); delivery keeps sections 1, 4 and 5, the obligations, A and D, with each component's
//      requirements and their delivery status;
//   7. headings at their levels in HTML (h1 to h6, no literal "#"), a brief's "##" lines adding no section, pasted
//      markup escaped;
//   8. on the rich project at depth (sdd-fixtures.mjs depthProject), the records of round 12's workstreams D4 and E:
//      invariants and the batch chain (GR-SDD-28), their other fields where they belong (GR-SDD-26), E's plan in
//      section 6 (GR-SDD-14) and Sol's drafts in the provenance (GR-SDD-10);
//   11. (round 25) the decision reading in print, on the bank-payment reference project and variations of it: the
//      trade-off analysis, the drivers' lean of an open decision, ruled-out and dominated alternatives and choices, AIW's
//      reading of an alternative not chosen without a reason, the marks of assessments no person has reviewed.
// Nothing here is client text: the names are generic and the requirements come from scripts/synthetic-workbook.mjs.
// Run: npm run test:sdd-architecture
import assert from 'node:assert/strict';
import {richProject, blankProject, depthProject, FIXTURE_AT} from './sdd-fixtures.mjs';
import {applyRecordCommand, applyCanonical} from './public/canonical-command.js';
import {componentSpecDocument} from './public/component-spec-document.js';
import {sddDocument, sddEdition, architectureFigureSet} from './public/sdd-document.js';
import {provenanceReading, LIST_MAX, unescapeMd, architectureMarkdown} from './public/sdd-architecture.js';
import {createProject} from './shared/projects-domain.js';
import {applyDecisionCommand} from './public/decisions-domain.js';
import {applyQualityCommand, driverCodes} from './public/quality-domain.js';
import {readDecision, DEFAULT_WEIGHTS, READING_NOTE} from './public/decision-reading.js';
import {contentReading, parseArchitectureEdition} from './public/sdd-content.js';
import {applyFinalReviewCommand, withFinalReview, reviewDesignStamp, reviewSourceStamp, inheritedFindings, reviewRequirements, exportSDD} from './public/review-domain.js';
import {seedProject} from './public/requirements-domain.js';
import {groupIndex, requirementGroups} from './public/requirement-groups.js';
import {renderSDD} from './public/sdd-renderer.js';
import {requirementRegisterMarkdown} from './public/sdd-annexes.js';
import {figureBlocks, documentBlocks} from './public/review-documents.js';
import {logicalGraph} from './public/logical-domain.js';

const checks = [], pass = n => { checks.push(n); console.log('PASS ' + n); };
const {document: rich, ids} = await richProject(), richBefore = JSON.stringify(rich);
const blank = blankProject();
const doc = sddDocument(rich, {figures: false}), md = doc.markdown;
const heads = m => m.split('\n').map(l => /^(#{1,6}) (.+)$/.exec(l)).filter(Boolean).map(x => ({level: x[1].length, text: unescapeMd(x[2])}));
// The text of a section: from its heading to the next heading of its level or above.
const section = (m, title, level = 1) => { const lines = m.split('\n'), i = lines.findIndex(l => l === '#'.repeat(level) + ' ' + title || unescapeMd(l) === '#'.repeat(level) + ' ' + title); assert.ok(i >= 0, 'section ' + title); let j = i + 1; while (j < lines.length && !(new RegExp('^#{1,' + level + '} ').test(lines[j]))) j++; return lines.slice(i, j).join('\n'); };
const count = (s, re) => (s.match(re) || []).length;
const TOP = ['1. Introduction: Synthetic core platform', '2. Architectural drivers', '3. Architecture decisions', '4. Architectural components, interfaces, properties and composition', '5. Architecture models', '6. Architecture model refinements', '7. Appendix'];
const KIDS = {
  1: ['Purpose', 'Key functionalities', 'Target users', 'Business problems solved', 'Stakeholder personas', 'Scope'],
  2: ['A. Business drivers (BD)', 'B. Functional drivers (FD)', 'C. Quality drivers (QD)', 'D. Constraints (C)', 'E. Operational drivers (OD)', 'F. Data drivers (DD)', 'G. Technology evolution (TE)', 'H. Business continuity (BC)', 'Summary table'],
  3: ['Decision log', 'I. Foundational choices', 'II. Structural decisions', 'III. Cross-cutting concerns', 'IV. Trade-offs and alternatives', 'V. Additional decisions', 'Trade-off analysis'],
  4: ['High-level component description', 'Component specification table', 'Component detail', 'Quality-driver-focused interactions', 'External integrations'],
  5: ['Context diagram (Level 1)', 'Container diagram (Level 2)', 'Component diagrams (Level 3)', 'Deployment diagram'],
  7: ['A. Requirements analysis and component mapping', 'B. Open items', 'C. Domain lens', 'D. Annexes', 'E. Provenance']
};
const kidsOf = (m, top) => { const h = heads(m), i = h.findIndex(x => x.level === 1 && x.text === top), out = []; for (let j = i + 1; j < h.length && h[j].level > 1; j++) if (h[j].level === 2) out.push(h[j].text); return out; };
// Format 2 (round 24, D-24-06): a section ends with its "Open questions" list. The records a line names (a range read as
// its members), and the fields: "- Not stated: <fields> (<n> of <m> <kind>: <codes>)" and "- <question> (<codes>:
// <fields>; …)".
const OPEN_Q = 'Open questions';
const openList = (m, top) => { const s = section(m, top), i = s.indexOf('\n## ' + OPEN_Q + '\n'); return i < 0 ? '' : s.slice(i + 1); };
const members = refs => refs.split(/, | and /).flatMap(x => { const r = /^(.*?)(\d+)–(.*?)(\d+)$/.exec(x.trim()); if (!r || r[1] !== r[3]) return [x.trim()]; const out = []; for (let n = Number(r[2]); n <= Number(r[4]); n++) out.push(r[1] + String(n).padStart(r[2].length, '0')); return out; });
const unstated = list => list.split('\n').filter(l => l.startsWith('- Not stated: ')).map(l => { const i = l.lastIndexOf(' ('), tail = l.slice(i + 2, -1), all = /^(?:all [\d,]+|both) /.test(tail); return {line: l, fields: l.slice(14, i).split(/, | and /), all, refs: all ? [] : members(tail.includes(': ') ? tail.slice(tail.indexOf(': ') + 2) : tail)}; });
const askedOf = list => list.split('\n').filter(l => /^- (?!Not stated: )/.test(l)).map(l => { const i = l.lastIndexOf(' ('); return {line: l, question: l.slice(2, i), parts: l.slice(i + 2, -1).split('; ').map(x => { const j = x.indexOf(': '); return {refs: members(x.slice(0, j)), fields: x.slice(j + 2).split(/, | and /)}; })}; });
const markerOf = block => (/^<!-- aiw:open ([^>]*) -->$/m.exec(block)?.[1] || '').split(' ').filter(Boolean);

// 1. The sections, in SDD-SPEC's order (GR-SDD-02), on the rich project and on a blank one.
{
  assert.ok(md.startsWith('<!-- aiw:cover -->\n# SYNTHETIC CORE PLATFORM\n\nSolution Design Document\n'), 'the cover: the solution name in capitals, then the document title');
  const h = heads(md), front = h.slice(0, 3).map(x => x.level + ' ' + x.text);
  assert.deepEqual(front, ['1 SYNTHETIC CORE PLATFORM', '2 Document control', '2 Contents'], 'front matter: cover, document control, contents');
  assert.deepEqual(h.filter(x => x.level === 1).slice(1).map(x => x.text), TOP, 'sections 1 to 7 in order');
  for (const [n, kids] of Object.entries(KIDS)) assert.deepEqual(kidsOf(md, TOP[n - 1]), Number(n) <= 4 ? [...kids, OPEN_Q] : kids, 'section ' + n + ' subsections in order' + (Number(n) <= 4 ? ', its open questions last' : ''));
  assert.ok(md.includes('\n<!-- aiw:/cover -->\n<!-- aiw:sdd-format 2 -->\n'), 'format 2 names itself after the cover');
  // Round 24: section 6 ends with its open questions too (format 2): a group whose gaps no component closes is a dash in
  // the gap plan, named once there, and no "open: …" marker stands in the section.
  assert.deepEqual(kidsOf(md, TOP[5]), ['Plateaus', 'Gap plan to the next version', OPEN_Q], 'section 6: the plateaus, the gap plan and its open questions');
  {
    const gapRows = section(md, 'Gap plan to the next version', 2).split('\n').filter(l => /^\| RG-\d+ · /.test(l)).map(l => l.split(' | ')), open6 = unstated(openList(md, TOP[5]));
    const closes = open6.filter(x => x.fields.includes('a component that closes its delivery gaps'));
    assert.equal(closes.length, 1, 'one line names the groups whose gaps no component closes');
    assert.ok(gapRows.length && gapRows.every(r => (r[2] === '—') === closes[0].refs.includes(r[0].slice(2).split(' · ')[0])), 'each group the table shows with a dash, and none other it shows, named there: ' + closes[0].line);
    assert.ok(!/open: /.test(section(md, TOP[5])), 'no "open: …" marker in section 6');
  }
  // The contents lists every section and its subsections with their anchors, as links.
  const contents = md.slice(md.indexOf('<!-- aiw:contents -->'), md.indexOf('<!-- aiw:/contents -->'));
  for (const t of TOP) assert.ok(contents.includes('[' + t + '](#'), 'the contents links ' + t);
  assert.ok(contents.includes('[A. Business drivers (BD)](#a-business-drivers-bd)'), 'subsections linked by their anchors');
  // A blank project: the same sections, each "None recorded" in one line when it has nothing.
  const b = sddDocument(blank, {figures: true}).markdown, bt = TOP.map(t => t.replace('Synthetic core platform', 'Blank synthetic platform'));
  assert.deepEqual(heads(b).filter(x => x.level === 1).slice(1).map(x => x.text), bt, 'a blank project prints the same sections');
  for (const t of [bt[0], bt[1], bt[2], bt[3], bt[5]]) assert.match(section(b, t), /^None recorded: /m, t + ' says none recorded');
  for (const k of ['Target users', 'Business problems solved', 'Stakeholder personas', 'Scope', 'Key functionalities']) assert.match(section(b, k, 2), /^None recorded: /m, k);
  for (const k of ['Context diagram (Level 1)', 'Container diagram (Level 2)', 'Component diagrams (Level 3)', 'Deployment diagram']) assert.match(section(b, k, 2), /^None recorded: /m, k + ' says none recorded, after its purpose line');
  for (const k of ['A. Requirements analysis and component mapping', 'C. Domain lens', 'E. Provenance']) assert.match(section(b, k, 2), /^None recorded/m, k);
  for (const line of b.split('\n').filter(l => /^None recorded/.test(l))) assert.ok(!line.includes('\n') && line.length < 260, 'one line: ' + line);
  assert.ok(!b.includes('undefined') && !md.includes('undefined') && !/\bnull\b/.test(md), 'no undefined or null printed');
  assert.equal(JSON.stringify(rich), richBefore, 'assembling the edition changes nothing');
  pass('the architecture edition prints the cover, document control and contents, then sections 1 to 7 and their subsections in SDD-SPEC order, the contents linking each; a blank project prints the same sections, each empty one saying "None recorded" in one line');
}

// 2. Document control (GR-SDD-24) and provenance in every edition (GR-SDD-10).
{
  const control = section(md, 'Document control', 2);
  assert.match(md, /\nVersion 0\.1 · Working draft · not approved\n/, 'the cover: version 0.1, working draft, not approved');
  assert.ok(control.includes('| Version | Status | Owner | Audience | Date | Baseline |') && control.includes('| 0.1 | Working draft · not approved | Synthetic architecture group | Delivery and review teams | 2026-10-08 | none frozen |'), 'version, status, owner, audience, date and baseline');
  assert.ok(control.includes('\nApprovals: none recorded.\n'), 'no approval record: none recorded');
  const P = provenanceReading(rich), line = 'Provenance: ' + P.line + ' ' + P.detail;
  assert.ok(P.line.includes('2 records drafted by Sol, not reviewed by a person') && P.detail.includes('2 drafted by Sol') && P.detail.includes('156 imported from a source'), 'the provenance names Sol’s drafts and who wrote the rest: ' + P.line);
  {
    // Which engine drafted Sol's records (round 23, BR-08): the model with its provider and model, or AIW's drafting rules.
    const m = structuredClone(rich), [a, b] = ['QD-007', 'QD-008'].map(id => m.quality.drivers.find(d => d.id === id));
    Object.assign(a, {state: 'proposed', provenance: {...a.provenance, draft: {by: 'sol', engine: 'model', provider: 'Synthetic provider', model: 'synthetic-model'}}});
    Object.assign(b, {state: 'proposed', provenance: {...b.provenance, draft: {by: 'sol', engine: 'rules'}}});
    const E = provenanceReading(m);
    assert.ok(E.detail.includes('Of Sol’s drafts: 1 with the model (Synthetic provider · synthetic-model), 1 by AIW’s drafting rules.'), 'the provenance tells the model’s drafts from the rules’: ' + E.detail);
    assert.ok(sddDocument(m, {figures: false}).markdown.includes(E.detail), 'and the cover prints it');
    assert.ok(!P.detail.includes('Of Sol’s drafts'), 'drafts that carry no engine name none');
  }
  for (const edition of ['architecture', 'executive']) for (const audience of ['all', 'delivery', 'review']) {
    const m = sddDocument(rich, {edition, audience, figures: false}).markdown;
    assert.ok(m.includes(line), edition + '/' + audience + ': the provenance line whole');
    assert.ok(m.includes('Approvals: none recorded'), edition + '/' + audience + ': approvals none recorded');
  }
  // A frozen baseline: the working draft is the next version, and the baseline keeps what it was when frozen.
  const cmd = (p, type, payload = {}, actor = 'architect-a') => applyFinalReviewCommand(p, {type: 'review.' + type, payload}, FIXTURE_AT, actor).document;
  let fz = cmd(rich, 'checks'); fz = cmd(fz, 'baseline', {stamp: reviewDesignStamp(fz), title: 'First synthetic baseline', reviewed: true});
  const bl = fz.finalReview.baselines.at(-1), wm = sddDocument(fz, {figures: false}).markdown;
  assert.match(bl.markdown, /\nVersion 0\.1 · Frozen baseline BL-001 · Working draft · not approved when frozen\n/, 'the baseline says what it was when frozen');
  assert.match(wm, /\nVersion 0\.2 · Working draft · not approved\n/, 'the working draft after it is version 0.2');
  assert.match(wm, /Baseline: BL-001 \(version 0\.1, frozen 2026-10-08\)/, 'and names the baseline');
  assert.ok(section(wm, 'Document control', 2).includes('| BL-001 · First synthetic baseline |') || /\| 0\.1 \| BL-001 · First synthetic baseline \|/.test(wm), 'the version history lists the baseline');
  // An approval exists only as an approval record: the reference journey through review to a conditional approval
  // recorded by a second signed-in person (as review-validate.mjs walks it), then the SDD prints it.
  let a = withFinalReview(seedProject());
  const errors = inheritedFindings(a).filter(f => f.level === 'error');
  a = cmd(a, 'intake'); a = cmd(a, 'narrative', {title: 'Synthetic approval fixture', owner: 'Fixture architect', audience: 'Prototype validation', summary: 'Synthetic review, not an approval of anything real.', scope: 'Reference journey only.', approach: 'Rule-based.', confirmed: true});
  a = cmd(a, 'action', {title: 'Synthetic delivery evidence', owner: 'Fixture owner', due: '2026-12-01', acceptance: 'Record the observed result.', objectIds: ['api'], findingId: errors[0].id});
  for (const f of errors) a = cmd(a, 'disposition', {findingId: f.id, stamp: inheritedFindings(a).find(x => x.id === f.id).stamp, treatment: f === errors[0] ? 'Carry as action' : 'Accepted design limitation', ...(f === errors[0] ? {actionId: 'RA-001'} : {}), reviewer: 'Synthetic reviewer', reference: 'Fixture only', rationale: 'Synthetic explicit limitation.', reviewed: true});
  for (const r of reviewRequirements(a)) a = cmd(a, 'trace', {requirementId: r.id, stamp: reviewSourceStamp(a), visited: [0, 1, 2, 3, 4], reviewer: 'Synthetic reviewer', notes: 'Fixture trace.', reviewed: true});
  a = cmd(a, 'checks'); a = cmd(a, 'record', {stamp: reviewDesignStamp(a), outcome: 'Ready with actions / limitations', reviewer: 'Synthetic reviewer', reference: 'Fixture outcome', rationale: 'Limitations explicit.', reviewed: true});
  a = cmd(a, 'baseline', {stamp: reviewDesignStamp(a), title: 'Reviewed synthetic baseline', reviewed: true});
  const ab = a.finalReview.baselines.at(-1);
  assert.equal(ab.classification, 'Architect reviewed');
  const beforeApproval = sddDocument(a, {figures: false}).markdown;
  assert.ok(beforeApproval.includes('Approvals: none recorded.'), 'an architect-reviewed baseline is not an approval');
  a = cmd(a, 'governance', {baselineId: ab.id, outcome: 'Approved with conditions', reviewer: 'Synthetic governance fixture', reference: 'No external approval; automated fixture', notes: 'Exercise the conditional approval state.', conditions: 'Discharge the delivery obligations first.', reviewed: true}, 'approver-b');
  const am = sddDocument(a, {figures: false}).markdown;
  assert.match(am, /Approvals: BL-001 \(version 0\.1\) approved with conditions on \d{4}-\d{2}-\d{2}, reviewer Synthetic governance fixture, recorded by approver-b, a second signed-in person\. This working draft itself is not approved\./, 'the approval record printed, and the working draft still not approved');
  assert.ok(sddDocument(a, {edition: 'executive', figures: false}).markdown.includes('Approvals: BL-001 approved with conditions; this working draft is not approved.'), 'the executive edition prints it too');
  assert.ok(!/productionAccepted["']?\s*:\s*true/.test(JSON.stringify(sddDocument(a, {figures: false}))), 'nothing claims production acceptance');
  pass('document control prints version 0.1 · working draft · not approved before the first baseline and 0.2 after it, the baseline keeps what it was when frozen, approvals print only from an approval record a second signed-in person recorded, and every edition and audience prints the provenance line whole (' + P.line.slice(0, 80) + '…)');
}

// 3. Drivers by kind with codes (D1), decisions as a log and by category (GR-SDD-19), components and integrations.
{
  const dr = section(md, TOP[1]);
  for (const [kind, prefix] of [['Business drivers', 'BD'], ['Functional drivers', 'FD'], ['Quality drivers', 'QD'], ['Constraints', 'C'], ['Operational drivers', 'OD'], ['Data drivers', 'DD'], ['Technology evolution', 'TE'], ['Business continuity', 'BC']]) {
    const s = section(md, dr.split('\n').find(l => l.startsWith('## ') && l.includes(kind + ' (' + prefix + ')')).slice(3), 2);
    assert.match(s, new RegExp('^\\*\\*' + prefix + '1: [^*]+\\*\\*$', 'm'), kind + ': each driver under its code');
    // Format 2: each driver's description, impact and priority is its line when stated, else named on its marker.
    for (const block of s.split(/\n(?=\*\*[A-Z]{1,2}\d+: )/).filter(b => /^\*\*[A-Z]{1,2}\d+: /.test(b))) for (const [label, f] of [['Description: ', 'description'], ['Impact on the architecture: ', 'impact'], ['Priority: ', 'priority']])
      assert.ok(new RegExp('^' + label, 'm').test(block) !== markerOf(block).includes(f), kind + ': ' + block.split('\n')[0] + ' states its ' + f + ' or its marker names it, not both');
  }
  assert.match(dr, /^\*\*FD1: Post and enquire in real time\*\*\n\nDescription: Post and enquire in real time, as the brief asks\.\n\nImpact on the architecture: Shapes the functional choices of the design\.\n\nPriority: High, because the brief names it first\.\n\nRequirement groups: RG-\d{3} · Account posting \(16 requirements, 2 delivery gaps\); /m, 'a functional driver: its groups with their counts');
  assert.match(dr, /^\*\*QD1: Preserve one financial effect\*\*[\s\S]*?^Scenario: When a posted instruction is retried with the same reference \(conditions: [^)]+\), return the recorded outcome and prevent an additional debit\.\n\nTarget: Posting response time at most 200 ms; window and verification not stated$/m, 'a quality driver: its scenario in one sentence and its stated target, with what keeps it from being measurable');
  // Format 2 (D-24-06): a priority not stated prints no line and no marker in the record; the driver's marker names it
  // for the content reader, and the section's open questions name it once.
  const od1 = dr.split(/\n(?=\*\*[A-Z]{1,2}\d+: )/).find(b => b.startsWith('**OD1: ')) || '';
  assert.ok(!/^Priority: /m.test(od1) && markerOf(od1).includes('priority') && !/open: /.test(dr), 'a priority not stated prints no line and no "open: …" in the record; its marker names it');
  assert.deepEqual(unstated(openList(md, TOP[1])).filter(x => x.fields.includes('priority')).flatMap(x => x.refs), ['OD1'], 'and the section’s open questions name it, once');
  const summary = section(md, 'Summary table', 2);
  assert.ok(summary.includes('| Category | Driver | Description | Impact on architecture | Priority |') && count(summary, /^\| (?!Category|---)/gm) === rich.quality.drivers.length, 'the summary table prints every driver once');
  // Decisions: the log first, then by category, each with its justification by driver and its alternatives.
  const dc = section(md, TOP[2]), log = section(md, 'Decision log', 2);
  assert.ok(log.includes('| Decision | Question | Category | Status | Chosen option | Drivers |'), 'the decision log: question, category, status, chosen option, drivers by code');
  assert.equal(count(log, /^\| ADR-\d{3} \|/gm), rich.decisions.records.length, 'every decision in the log');
  // Round 25 (D-25-07): the working choice, then the drivers' lean where it is not the choice.
  assert.match(log, /^\| ADR-001 \| When should the customer receive a payment acknowledgement\? \| Foundational choice \| Working draft \| ALT-001 · Keep the customer request synchronous \(working choice\); the drivers lean to ALT-002 \| QD2, QD3, QD6 \|$/m);
  const where = {'ADR-001': 'I. Foundational choices', 'ADR-002': 'II. Structural decisions', 'ADR-003': 'III. Cross-cutting concerns', [ids.adr4]: 'IV. Trade-offs and alternatives', [ids.adr5]: 'V. Additional decisions', 'ADR-006': 'V. Additional decisions'};
  for (const [id, cat] of Object.entries(where)) assert.match(section(md, cat, 2), new RegExp('^### ' + id + ' · ', 'm'), id + ' under ' + cat);
  const adr1 = section(md, dc.split('\n').find(l => l.startsWith('### ADR-001')).slice(4), 3);
  for (const t of ['**Decision**: ALT-001 · Keep the customer request synchronous', '(the working choice of a draft decision, not yet accepted)', '**Justification**: A reference held with the record survives a restart.', '- Availability (QD2): is in tension with it', '**Alternatives considered**:', 'ALT-002 · Acknowledge a durable asynchronous handoff', 'Not chosen: It replays postings blindly.', '**Impact**: Every posting carries its reference.', '**Stakeholders**: Payments product owner (STK-001); Bank customer (ACT-001); Operations run it.', '**Dependencies**: depends on ADR-002; Needs the ledger decision.', '**Licensing**: Open source.', '**Skills**: Event modelling.', '**Documentation**: Decision folder.', '**Answers**: requirement groups RG-'])
    assert.ok(adr1.includes(t), 'ADR-001 prints ' + t);
  // Round 25 (D-25-07): the working choice does not lead, and the line says so as AIW's reading; the person's reason for
  // not choosing ALT-002 is printed as it is, with no reading of AIW's beside it.
  assert.ok(adr1.includes('(the working choice of a draft decision, not yet accepted). The drivers lean to ALT-002 · Acknowledge a durable asynchronous handoff, not to the working choice, which ranks 2 of 2 (AIW’s reading of the recorded effects at the default weights; not a choice).\n'), 'ADR-001: the drivers’ lean, said factually beside the working choice');
  assert.ok(!adr1.includes('AIW’s reading:'), 'ADR-001: a person’s reason stands alone');
  const adr2 = section(md, dc.split('\n').find(l => l.startsWith('### ADR-002')).slice(4), 3);
  // Format 2 (D-24-06): the optional fields not recorded print nothing in the decision; the section's open questions
  // name them on one line, once, with the decisions that leave them so.
  assert.ok(!/^Open: /m.test(adr2) && !/^\*\*(?:Stakeholders|Dependencies|Licensing|Skills|Documentation)\*\*: /m.test(adr2), 'the optional fields not recorded print nothing in the decision');
  const optional = unstated(openList(md, TOP[2])).filter(x => ['stakeholders', 'dependencies', 'licensing', 'skills', 'documentation'].some(f => x.fields.includes(f)));
  assert.equal(optional.length, 1, 'the optional fields not recorded: one line, once: ' + optional.map(x => x.line).join(' | '));
  assert.ok(['stakeholders', 'dependencies', 'licensing', 'skills', 'documentation'].every(f => optional[0].fields.includes(f)) && optional[0].refs.includes('ADR-002') && !optional[0].refs.includes('ADR-001'), 'naming every such field, ADR-002 among its decisions and not ADR-001, which records them: ' + optional[0].line);
  assert.match(section(md, 'Trade-off analysis', 2), new RegExp('\\*\\*' + ids.adr4 + ' · Where should statements be produced\\?\\*\\*\\n\\nCriteria: QD1 ×3, QD2 ×2\\.'), 'the trade-off analysis prints the compared decision with its criteria');
  const ex = sddDocument(rich, {edition: 'executive', figures: false}).markdown;
  assert.equal(count(section(ex, 'Decisions', 2), /^\| ADR-\d{3} \|/gm), rich.decisions.records.length, 'the executive edition prints every decision');
  // Round 25: beside the choice, the drivers' lean where a decision has none or its choice does not lead, as the log does.
  assert.ok(['| ALT-001 Keep the customer request synchronous (working choice); the drivers lean to ALT-002 |', '| open; the drivers lean to ALT-005 |', '| open; the drivers lean to ALT-008 |', '| ALT-003 Enforce the reference at the posting boundary (working choice) |'].every(t => section(ex, 'Decisions', 2).includes(t)), 'the executive edition names the drivers’ lean as the log does');
  pass('drivers print under their codes by kind A to H with description, impact and priority, a functional driver with its groups, a quality driver with its scenario and stated target; decisions open with the log (question, category, status, chosen option, drivers) and print by category I to V with justification by driver, alternatives and why not chosen, the recorded fields and one line for those not stated; the executive edition prints every decision');
}
{
  const table = section(md, 'Component specification table', 2);
  assert.ok(table.includes('<!-- aiw:landscape -->\n| Component | Responsibilities | Properties | Technologies | Interfaces | Dependencies | Architectural solution | Architectural drivers |') && table.includes('<!-- aiw:/landscape -->'), 'the component table: its columns, in a landscape section');
  assert.equal(count(table, /^\| APP-\d{3} · /gm), rich.realisation.components.length, 'one row per component');
  assert.match(table, /^\| APP-001 · Payment service \| LR-001; LR-002 \(supports\) \| Availability: Stays up through a zone loss\. \| [^|]+ \| IF-001 [^|]+ \| [^|]+ \| Stateless service behind a queue\. \| [A-Z0-9, ]+ \|$/m, 'APP-001: its properties and solution');
  // Format 2 (D-24-06): a solution not stated is a dash in the table; the section's open questions name it, once.
  assert.equal(table.split('\n').find(l => l.startsWith('| APP-002 · Risk engine |')).split(' | ')[6], '—', 'a solution not stated: a dash in its cell');
  assert.ok(!/open: /.test(table), 'and no "open: …" marker in the table');
  assert.deepEqual(unstated(openList(md, TOP[3])).filter(x => x.fields.includes('architectural solution')).flatMap(x => x.refs), ['APP-002', 'APP-004', 'APP-005'], 'the section’s open questions name each component whose solution is not stated, once');
  const detail = section(md, 'Component detail', 2);
  for (const t of ['### APP-001 · Payment service', 'Runs in: TR-001 ', 'Interfaces: provides IF-001', 'Data model: ', 'Coupling: data coupling with', 'Quality properties: Availability: Stays up through a zone loss (two zones).', 'Requirements: 16 requirements, through RG-', 'delivery, as the source states it: ', 'Protection: controls SEC-001', 'Technologies: TC-001 Application execution (compute) → Kubernetes 1.31 (Candidate option)', 'Placement: RUN-001: '])
    assert.ok(detail.includes(t), 'component detail: ' + t);
  // Round 24: the capabilities a component stands on, with a product where one is named, under "Technologies" (format 2);
  // no "Products:" line names a capability without one.
  assert.ok(!/^Products: /m.test(md) && !/no product (?:named )?yet/.test(md), 'no "Products:" line and no "no product yet" in the edition');
  assert.match(section(detail, 'APP-003 · Core connector', 3), /Data model: owns DAT-003 Ledger posting/, 'a component named as a data definition’s authority owns it (GR-CMP-07)');
  // rc39 (W3 step 6, PLAN §4.4): the component passage prints each decided design question's story as one sentence under
  // "Design basis" and lists the open ones (a draft answer said to be a draft) as "Open design questions", by the drivers'
  // codes, so the document never implies a decision that is not recorded; the words are the design-questions projection's.
  {
    const {designQuestions} = await import('./public/design-questions.js');
    const app1 = section(detail, 'APP-001 · Payment service', 3), dq = designQuestions(rich, 'api-pod');
    assert.ok(dq && dq.questions.length && !dq.questions.some(q => q.state === 'decided'), 'the fixture\'s Payment service faces questions, none decided yet');
    assert.ok(!/^Design basis: /m.test(app1), 'no "Design basis" line while nothing is decided');
    const openLine = app1.split('\n').find(l => l.startsWith('Open design questions: '));
    assert.ok(openLine, 'the open questions are listed: ' + app1.slice(0, 400));
    const expected = 'Open design questions: ' + dq.questions.filter(q => q.state !== 'decided').slice(0, LIST_MAX).map(q => q.title + ' (' + q.because.map(id => driverCodes(rich).get(id) || id).join(', ') + (q.state === 'draft' ? '; a draft answer is recorded' : '') + ')').join('; ');
    assert.ok(openLine.startsWith(expected), 'each open question with the codes of the drivers that ask it, a draft answer said so:\n' + openLine + '\nexpected to start with\n' + expected);
    assert.match(openLine, /Read from the authority or keep a bounded read copy\? \(QD3\)/, 'the read path, asked by QD3');
    const decided = structuredClone(rich); decided.coauthoring ||= {}; decided.coauthoring.designTasks = [...(decided.coauthoring.designTasks || []), {id: 'DES-907', kind: 'architecture', topic: 'reads', status: 'applied', optionId: 'cache-aside', requirementId: 'REQ-001', driverId: 'QD-003', basis: {contextIds: ['api-pod']}, answers: {}, applied: {records: [], ids: {}, reason: 'Fixture: a read-path comparison applied as a bounded read copy.', at: FIXTURE_AT}}];
    const d1 = section(section(sddDocument(decided, {figures: false}).markdown, 'Component detail', 2), 'APP-001 · Payment service', 3);
    assert.ok(d1.includes('Design basis: Reuse a bounded read copy for APP-001, because QD3 (DES-907).'), 'a decided question: its story as one sentence, by the driver\'s code: ' + (d1.split('\n').find(l => l.startsWith('Design basis: ')) || '(no line)'));
    assert.ok(!/Open design questions: Read from the authority/.test(d1) && /Open design questions: /.test(d1), 'and it leaves the open list, which keeps the others');
    pass('the component passage prints the decided design questions\' stories under "Design basis" and lists the open ones as "Open design questions" by the drivers\' codes, from the design-questions projection (rc39)');
  }
  const x = section(md, 'External integrations', 2), net = section(x, '3. EXT-003 · External payment network', 3);
  for (const t of ['Purpose: A placeholder for submission and enquiry boundaries.', 'Data formats: DAT-001 Payment instruction', 'Protocols: Messages over a private link', 'Security considerations: Signed messages and a private link.', 'Challenges: Cut-off times differ by currency.', 'How the architecture handles it: A queue absorbs the scheme’s windows.', 'Used by: APP-004 Settlement worker through IF-003.'])
    assert.ok(net.includes(t), 'EXT-003: ' + t);
  // Format 2: a party field not stated prints no line; the party's marker names it, the section's list names it once.
  const ext2 = section(x, '2. EXT-002 · Core banking authority', 3);
  assert.ok(!/^Protocols: /m.test(ext2) && markerOf(ext2).includes('protocols'), 'a party field not stated: no line, named on its marker');
  assert.deepEqual(unstated(openList(md, TOP[3])).filter(l => l.fields.includes('protocols')).flatMap(l => l.refs), ['EXT-002'], 'and named once in the section’s open questions');
  {
    // A drafted design (round 23): its contracts stand proposed until a person decides them, and a party names the parts
    // they reach as proposed users instead of "no component yet".
    const drafted = structuredClone(rich), ext = drafted.interfaces.parties.find(r => r.ref === 'EXT-003');
    for (const c of drafted.interfaces.contracts) if (c.from === ext.id || c.to === ext.id) c.state = 'proposed';
    const dnet = section(section(sddDocument(drafted, {figures: false}).markdown, 'External integrations', 2), '3. EXT-003 · External payment network', 3);
    assert.ok(dnet.includes('Used by: proposed, not decided: APP-004 Settlement worker through IF-003.'), 'a proposed contract names its user as a proposal: ' + dnet.split('\n').find(l => l.startsWith('Used by')));
    assert.ok(!/Used by: no component yet/.test(dnet), 'not "no component yet"');
  }
  assert.match(section(md, 'Quality-driver-focused interactions', 2), /^\*\*QD1: Preserve one financial effect\*\* \(High\)\n\n- APP-001 Payment service: /m, 'quality-driver interactions, High first, one bullet per component');
  pass('section 4: the styles and patterns, the numbered component description, the specification table with its eight columns in a landscape section, each component’s detail (container, interfaces, data owned through its authority, coupling, properties, requirements with delivery, protection, products, placement), the quality-driver interactions and each external party with its integration fields');
}

// 4. The C4 levels (GR-FIG-08): context, container, a component diagram per container that holds two or more, and the
// deployment, each with its purpose line; the figures drawn from the saved records.
{
  const withFigures = sddDocument(rich, {figures: true}), fm = withFigures.markdown, set = architectureFigureSet(rich), keys = set.figures.map(f => f.key);
  assert.deepEqual(keys.slice(0,4), ['context', 'container', 'component:TR-001', 'deployment'], 'the four C4/deployment views retain their order');
  assert.deepEqual([...new Set(keys.slice(4))], ['drivers','decisions','logical','solution','stack','sequence','security','rationale'].map(id=>'chapter:'+id), 'complementary saved chapter models follow the C4 views');
  const models = section(fm, TOP[4]), blocks = figureBlocks(fm);
  assert.equal(blocks.length, set.figures.length, 'every figure of the set is in the Markdown');
  assert.deepEqual(blocks.map(b => b.sha256), set.figures.map(f => f.sha256), 'with the SHA-256 of the drawn figure');
  for (const [k, title] of [['context', 'Context diagram (Level 1)'], ['container', 'Container diagram (Level 2)'], ['component:TR-001', 'Component diagrams (Level 3)'], ['deployment', 'Deployment diagram']]) {
    const s = section(fm, title, 2), f = set.figures.find(x => x.key === k);
    assert.match(s, /^Purpose: [A-Z].+$/m, title + ': a purpose line'); assert.ok(s.includes('<figure id="figure-' + f.n + '"'), title + ': its figure stands in its section');
    assert.ok(f.elements > 0 && f.svg.startsWith('<svg'), title + ': drawn');
  }
  assert.ok(section(fm, 'TR-001 · Application execution realization', 3).startsWith('### TR-001 · Application execution realization\n\nIt holds 4 components: APP-001, APP-002, APP-004, APP-005.'), 'the component diagram per container says what it holds');
  // Round 24: a container decomposed above is never followed by "no container holds two components" (a round-12
  // defect printed it whenever no container went to the annex).
  assert.ok(!/No container holds two components or more/.test(section(fm, 'Component diagrams (Level 3)', 2)), 'no sentence denies the container the section has just decomposed');
  assert.match(models, /Containers that hold one component, which section 4 describes: TR-002 \(APP-003\)\./, 'a container with one component is named, not drawn again');
  const container = set.figures.find(f => f.key === 'container');
  assert.ok(/TR-001/.test(container.svg) && /TR-002/.test(container.svg), 'the container view draws the containers, not every component as a container');
  {
    // GR-FIG-13: an actor and an external party that no requirement references stand in the context all the same, their
    // lines attenuated and saying why, never a link no record makes.
    const {applyInterfacesCommand} = await import('./public/interfaces-domain.js'), {applyCommand} = await import('./public/requirements-domain.js'), {notationDiagram} = await import('./public/notation-model.js');
    let lone = applyInterfacesCommand(structuredClone(rich), {type: 'interfaces.party', payload: {title: 'Unreferenced statistics bureau', purpose: 'Receives a monthly return.'}}).document;
    lone = applyCommand(lone, {type: 'artefact', payload: {type: 'actor', title: 'Unreferenced auditor', description: 'Reads the records once a year.'}}).document;
    const ctx = notationDiagram(lone, 'context'), byTitle = t => ctx.nodes.find(n => n.title === t);
    const party = byTitle('Unreferenced statistics bureau'), actor = byTitle('Unreferenced auditor');
    assert.ok(party && actor, 'both stand in the context');
    const lineOf = n => ctx.edges.find(e => e.from === n.id || e.to === n.id);
    assert.deepEqual([lineOf(party)?.qualifier, !!lineOf(party)?.weak, lineOf(actor)?.qualifier, !!lineOf(actor)?.weak], ['no contract yet', true, 'no step traced yet', true], 'their lines attenuated and saying why');
    assert.ok(architectureFigureSet(lone).figures.find(f => f.key === 'context').svg.includes('Unreferenced statistics bureau'), 'and the drawn context figure shows the party');
  }
  const none = sddDocument(rich, {figures: false}).markdown;
  assert.equal(figureBlocks(none).length, 0); assert.match(section(none, 'Context diagram (Level 1)', 2), /Not drawn in this export \(figures=none\)/, 'without figures each level says it is not drawn here');
  pass('section 5 draws the C4 levels from the saved records: context, container (' + container.elements + ' elements), one component diagram for TR-001 (its four components) and the deployment, each under its heading with its purpose line and SHA-256; a one-component container is named, not drawn; figures=none says what is not drawn');
}

// 5. Open items (GR-SDD-11, GR-SDD-26; format 2, D-24-06): nothing in the record where a field is not stated, its name on
// the record's marker and once in its section's "Open questions", and every one in Appendix B by cause with its count,
// one label per field (openItems counts a field once); fields kept in an open state; no change-history marker.
{
  const open = section(md, 'B. Open items', 2), body = md.slice(0, md.indexOf('\n# 7. Appendix'));
  // Format 2: a description not stated prints no line; each such driver's marker names it, and the section's open
  // questions name every such driver once, on one line.
  const noDesc = rich.quality.drivers.filter(d => !d.description).length, descLines = unstated(openList(md, TOP[1])).filter(x => x.fields.includes('description'));
  assert.equal(count(md, /^Description: open: /gm), 0, 'no "open: …" in place of a description');
  assert.equal(descLines.length, 1, 'one line names the descriptions not stated'); assert.equal(descLines[0].refs.length, noDesc, 'each driver’s description not stated: named once, ' + descLines[0].line);
  assert.equal(count(section(md, TOP[1]), /^<!-- aiw:open [^>]*\bdescription\b/gm), noDesc, 'and on each such driver’s marker');
  assert.ok(section(md, 'Summary table', 2).includes('| — |') && !section(md, 'Summary table', 2).includes('| open |'), 'the summary table prints a dash for it, not "open"');
  for (const t of ['**Description** (driver, not stated): 6 records, QD1–QD6.', '**Persona: wishes** (stakeholder, not stated)', '**Integration: protocols** (external party, not stated): 1 record, EXT-002.', '**Decision with no chosen alternative** (decision, missing): 4 records, ' + 'ADR-003–ADR-006' + '.', '**Architectural solution** (component, not stated): 3 records, APP-002, APP-004, APP-005.', '**Business problem** (outcome, not stated): 1 record, OUT-002.', '**Priority** (driver, not stated): 1 record, OD1.'])
    assert.ok(open.includes(t), 'Appendix B lists ' + t);
  assert.match(open, /^\d+ open items in \d+ causes\.$/m, 'with the totals');
  assert.equal(doc.openItems.total, doc.openItems.causes.reduce((n, c) => n + c.count, 0));
  // One label per open field (D-24-06): a field the body records is not listed again under the field's own name, so
  // openItems counts it once. Each field given a recorded open state here is one the body already finds open (empty):
  // the total stays as it was, and no cause carries a field's own name.
  const once = (d, name) => {
    const seen = new Map(), label = new Map();
    for (const c of d.openItems.causes) for (const f of c.fields) {
      const kf = c.chapter + '|' + c.kind + '|' + f + '|' + c.state;
      if (c.fields.length === 1) { assert.ok(!label.has(kf) || label.get(kf) === c.cause, name + ': ' + c.kind + ' ' + f + ' under two labels, ' + label.get(kf) + ' and ' + c.cause); label.set(kf, c.cause); }
      for (const r of c.records) { const k = c.chapter + '|' + r + '|' + f; assert.ok(!seen.has(k), name + ': ' + r + ' ' + f + ' under two causes, ' + seen.get(k) + ' and ' + c.cause); seen.set(k, c.cause); }
    }
    return seen.size;
  };
  const keptOpen = structuredClone(rich), c1 = keptOpen.quality.drivers.find(d => d.id === ids.cd), ext2r = keptOpen.interfaces.parties.find(r => r.ref === 'EXT-002'), adr2r = keptOpen.decisions.records.find(d => d.id === 'ADR-002');
  c1.open = {...c1.open, impact: {state: 'not-stated'}};
  ext2r.open = {...ext2r.open, protocols: {state: 'not-stated'}, securityConsiderations: {state: 'not-stated'}};
  adr2r.open = {...adr2r.open, stakeholderNote: {state: 'not-stated'}, dependencies: {state: 'not-stated'}, licensing: {state: 'not-stated'}};
  const kd = sddDocument(keptOpen, {figures: false});
  assert.equal(kd.openItems.total, doc.openItems.total, 'a field kept open that the body names counts once: ' + kd.openItems.total + ' and ' + doc.openItems.total);
  const ownName = {driver: ['impact'], 'external party': ['protocols', 'security considerations'], decision: ['stakeholder note', 'dependencies', 'licensing']};
  assert.ok(!kd.openItems.causes.some(c => ownName[c.kind]?.includes(c.cause)), 'no cause under a field’s own name: ' + kd.openItems.causes.map(c => c.kind + ' ' + c.cause).join(', '));
  assert.deepEqual(kd.openItems.causes.filter(c => c.fields.includes('protocols')).map(c => [c.cause, c.records.join()]), [['Integration: protocols', 'EXT-002']], 'EXT-002’s protocols under one label');
  const fieldsCounted = once(doc, 'rich') + once(kd, 'rich, kept open');
  // A field a person keeps open (open-fields.js) is listed with its question, though the body never prints it.
  const asked = structuredClone(rich), t0 = asked.security.threats[0]; t0.open = {owner: {state: 'open-question', question: 'Who owns the authority risk?'}};
  const am = sddDocument(asked, {figures: false}).markdown;
  assert.ok(section(am, 'B. Open items', 2).includes('THR-001: Who owns the authority risk?'), 'an open question kept on a record is listed with its question');
  // No change-history marker: a recorded change and its review never count as open items.
  const changed = structuredClone(rich); changed.changes = {version: 1, events: [{id: 'CHG-001', at: FIXTURE_AT, title: 'Statement reworded', source: {chapter: 1, id: 'REQ-001', ref: 'REQ-001', kind: 'requirement', title: 'x'}, fields: [{label: 'Statement', before: 'Open question: old', after: 'New'}], items: [{key: 'k1', chapter: 2, ref: 'QD1', title: 'Driver', why: 'Linked', reviews: []}]}]};
  const cm = sddDocument(changed, {figures: false});
  assert.equal(cm.openItems.total, doc.openItems.total, 'a change in the journal adds no open item');
  assert.ok(!/CHG-001|Open question: old/.test(section(cm.markdown, 'B. Open items', 2)), 'no change-history marker in Appendix B');
  // Section 6 prints the change summary (change-summary.js, workstream A2): the latest change of each record and what it
  // leaves to review, never the per-change journal, which is an annex.
  assert.ok(section(cm.markdown, 'Architecture change review', 2).includes('affected reviews resolved'), 'the change is in section 6’s change review instead');
  assert.ok(!/open: /.test(section(md, 'Document control', 2)), 'document control prints values, not markers');
  // Format 2: no "open: …" marker stands in sections 2 to 4; the gaps are named in the sections' open questions, each
  // record and field once.
  const gaps = [1, 2, 3, 4].flatMap(n => { const l = openList(md, TOP[n - 1]); return [...unstated(l).flatMap(x => x.refs.flatMap(r => x.fields.map(f => n + ' ' + r + ' ' + f))), ...askedOf(l).flatMap(q => q.parts.flatMap(x => x.refs.flatMap(r => x.fields.map(f => n + ' ' + r + ' ' + f))))]; });
  assert.ok(gaps.length > 20 && new Set(gaps).size === gaps.length, 'the gaps are named in the sections’ open questions, each once: ' + gaps.length);
  assert.ok(!/open: /.test([TOP[1], TOP[2], TOP[3]].map(t => section(body, t)).join('\n')), 'and no "open: …" marker stands in sections 2 to 4');
  pass('every field not stated prints nothing in its record: its marker names it for the reader and its section’s open questions name it once (' + gaps.length + ' records and fields in sections 1 to 4); Appendix B lists ' + doc.openItems.total + ' open items in ' + doc.openItems.causes.length + ' causes with their records, one label per field (' + fieldsCounted + ' record fields, none under two causes; a field kept open that the body names counts once), fields kept open with their questions, and no change-history marker (a recorded change goes to section 6’s change review)');
}

// 6. Appendix A by group with the source's delivery facts (GR-SDD-04), the gap plan (GR-SDD-14), group labels (GR-SDD-25).
{
  const A = section(md, 'A. Requirements analysis and component mapping', 2), G = groupIndex(rich), byId = new Map(rich.artefacts.map(a => [a.id, a]));
  for (const g of requirementGroups(rich)) {
    const members = (G.members.get(g.id) || []).map(id => byId.get(id)), gaps = members.filter(r => r.assessment?.delivery && r.assessment.delivery.toLowerCase() !== 'delivered');
    const head = '### ' + g.id + ' · ' + g.title + ' (' + members.length + ' requirement' + (members.length === 1 ? '' : 's') + (gaps.length ? ', ' + gaps.length + ' delivery gap' + (gaps.length === 1 ? '' : 's') : '') + ')';
    assert.ok(A.includes(head + '\n'), 'Appendix A: ' + head);
    const s = section(A, head.slice(4), 3), states = {};
    for (const r of members) if (r.assessment?.delivery) states[r.assessment.delivery] = (states[r.assessment.delivery] || 0) + 1;
    for (const [st, n] of Object.entries(states)) assert.ok(new RegExp('\\b' + n + ' ' + st.toLowerCase() + '\\b').test(s), g.id + ': ' + n + ' ' + st);
    const bands = {}; for (const r of gaps) { const b = r.assessment.priorityBand || 'no band'; bands[b] = (bands[b] || 0) + 1; }
    for (const [b, n] of Object.entries(bands)) assert.ok(s.includes(b + ' ' + n), g.id + ': gaps by band ' + b + ' ' + n);
    assert.ok(count(s, /^- REQ-/gm) <= LIST_MAX, g.id + ': at most twelve inline');
  }
  const register = requirementRegisterMarkdown(rich, {page: 1}), r0 = rich.artefacts.find(a => a.provenance?.datasetId);
  assert.ok(register.includes('### ' + r0.id + ' (' + r0.externalId + ')') && /Source assertions: [^\n]*delivery /.test(register), 'the register annex prints each requirement’s external id and source assertions');
  // The gap plan, by group and band, with the components that close each gap and the plateau that introduces them.
  const plan = section(md, 'Gap plan to the next version', 2);
  assert.ok(plan.includes('| Group | Gaps by band | Components that close them | Plateau |'), 'the gap plan names the plateau column when plateaus exist');
  assert.match(plan, /^\| RG-\d{3} · [^|]+ \| Critical \d+[^|]* \| APP-001 \| Real-time posting \|$/m, 'a group whose gaps APP-001 closes, on the plateau that introduces it');
  assert.ok(count(plan, /^\| RG-/gm) <= LIST_MAX, 'the most urgent twelve groups');
  // Wherever a record links a group, the group prints as its label with its counts.
  const linking = [section(md, TOP[1]), section(md, TOP[2]), section(md, 'Component detail', 2), section(md, 'Key functionalities', 2)].join('\n');
  const refs = [...linking.matchAll(/RG-\d{3}(?! ·)/g)];
  assert.equal(refs.length, 0, 'every group reference in the drivers, decisions, components and key functionalities is a label: ' + refs.slice(0, 3).map(m => linking.slice(m.index - 30, m.index + 20)).join(' | '));
  assert.ok(count(linking, /RG-\d{3} · [^()]+ \(\d+ requirements?(?:, \d+ delivery gaps?)?\)/g) >= 4, 'labels with their counts');
  pass('Appendix A prints each of the ' + requirementGroups(rich).length + ' groups as its label with its delivery counts and gaps by band as the source states them, twelve statements at most; the register annex keeps each external id and the source assertions; the gap plan prints the most urgent groups by band with the components that close them and their plateau; every group a record links prints as RG-nnn · title (N requirements, M delivery gaps)');
}

// 7. The audiences (GR-SDD-12, GR-SDD-13).
{
  const rev = sddDocument(rich, {audience: 'review', figures: true}), rm = rev.markdown, del = sddDocument(rich, {audience: 'delivery', figures: true}), dm = del.markdown;
  const tops = m => heads(m).filter(x => x.level === 1).slice(1).map(x => x.text);
  assert.deepEqual(tops(rm), [TOP[1], TOP[2], 'The shape, interfaces and deployment in brief', TOP[5], 'Assurance', TOP[6]], 'review: sections 2, 3 and 6, the shape in brief, the assurance and the appendix');
  assert.deepEqual(kidsOf(rm, TOP[6]), ['B. Open items', 'C. Domain lens', 'E. Provenance'], 'review: Appendices B, C and E');
  assert.ok(section(rm, 'The shape, interfaces and deployment in brief').includes('## The shape') && rm.includes('## Interfaces') && rm.includes('## Deployment'), 'review: the shape, the interfaces and the deployment in brief');
  assert.ok(!/^# Change journal|^Impact preview: |^Affected: \d/m.test(rm) && !/\/api\/changes/.test(rm), 'review: the change summary, never the change journal itself');
  assert.deepEqual(tops(dm), [TOP[0], TOP[3], TOP[4], 'Delivery obligations', TOP[6]], 'delivery: sections 1, 4 and 5, the obligations and the appendix');
  assert.deepEqual(kidsOf(dm, TOP[6]), ['A. Requirements analysis and component mapping', 'D. Annexes'], 'delivery: Appendices A and D');
  assert.match(dm, /^\*\*RA-001 · Prove the posting response time\*\*: owner Delivery lead, due 2027-03-31, planned; verification remains separate\./m, 'delivery: the obligations with owner and due date');
  for (const t of ['Requirements: 16 requirements, through RG-', 'delivery, as the source states it:', 'Protection: controls SEC-001', 'Technologies: TC-001 ']) assert.ok(dm.includes(t), 'delivery: each component’s ' + t);
  assert.deepEqual(del.figures.figures.map(f=>f.key), architectureFigureSet(rich).figures.map(f=>f.key), 'delivery draws the full canonical model set');
  assert.ok(!rev.figures, 'review reads the shape in brief');
  assert.equal(rev.openItems.total, doc.openItems.total, 'review lists every open item');
  assert.equal(del.openItems.total, doc.openItems.total, 'and so does delivery');
  pass('review keeps the reasoning (sections 2, 3 and 6, the shape, interfaces and deployment in brief, the assurance, Appendices B, C and E, no change journal); delivery keeps sections 1, 4 and 5 with each component’s requirements and delivery status, protection and products, the obligations and Appendices A and D; both list every open item');
}

// 8. Headings, the brief's own headings, and pasted markup (GR-SDD-07, GR-SDD-23).
{
  const html = renderSDD(md, logicalGraph(rich), {figures: {figures: [], manifest: [], omitted: []}});
  assert.ok(!/<p>\\?#{1,6} /.test(html) && !/>#{1,6} [A-Z]/.test(html), 'no heading printed as text');
  // Format 2's markers (the edition's, after the cover, and each record's) are for the content reader: every format skips
  // them, the HTML and the blocks Word and the PDF are laid out from.
  assert.ok(count(md, /^<!-- aiw:(?:sdd-format|open) [^>]*-->$/gm) > 10 && !/aiw:open|aiw:sdd-format/.test(html) && !/aiw:open|aiw:sdd-format/.test(JSON.stringify(documentBlocks(md))), 'no format-2 marker reaches the HTML, Word or PDF');
  for (const level of [1, 2, 3]) assert.ok(new RegExp('<h' + level + ' id="[^"]+">').test(html), 'h' + level + ' rendered');
  assert.ok(/<h3 id="adr-001-[^"]*">ADR-001 · /.test(html), 'a decision is an h3 under its category');
  const deep = renderSDD('# A\n\n## B\n\n### C\n\n#### D\n\n##### E\n\n###### F\n', null, {});
  for (const level of [4, 5, 6]) assert.ok(new RegExp('<h' + level + ' id="[a-z]">').test(deep), 'h' + level + ' rendered, not text');
  const hs = heads(md).map(h => h.text);
  assert.ok(!hs.includes('Background') && !hs.includes('Not a section'), 'the brief’s "##" and "#" lines add no section');
  assert.ok(md.includes('\n**Background**\n') && md.includes('\n**Not a section**\n') && html.includes('<strong>Background</strong>'), 'they print as bold lines of the brief');
  assert.ok(md.includes('The current batch \\<b\\>ledger\\</b\\> closes the day late'), 'pasted markup is escaped in Markdown');
  assert.ok(html.includes('The current batch &lt;b&gt;ledger&lt;/b&gt; closes the day late'), 'and printed as text in HTML');
  const lists = md.split('\n').reduce((acc, l) => { if (/^- /.test(l)) acc.run++; else if (l.trim()) acc.run = 0; acc.max = Math.max(acc.max, acc.run); return acc; }, {run: 0, max: 0});
  assert.ok(lists.max <= LIST_MAX, 'no inline list longer than ' + LIST_MAX + ': ' + lists.max);
  assert.ok(!/\b(?:lr|tc|tr|if|dat|ext|thr|sec|env|zon|run|obj)-\d{3}\b/.test(md.replace(/<figure[\s\S]*?<\/figure>/g, '')), 'no internal lower-case id in the text');
  assert.equal(sddEdition(new URLSearchParams('')).edition, 'architecture', 'the architecture edition is the default');
  assert.equal(exportSDD(rich).includes('## Detailed chapter registers'), true, 'the registers stay whole in their annex');
  pass('headings render at every level (h1 to h6) with anchors and none prints as text; no format-2 marker is rendered; the brief’s "##" and "#" lines add no section and print as text; pasted markup is escaped in Markdown and printed as text in HTML; no inline list passes ' + LIST_MAX + ' items; no internal id reaches the text; the architecture edition is the default and the registers stay whole in their annex');
}

// 9. The records of round 12's workstreams D4 (records at depth) and E (the architecture drafter), on the rich project
// at depth (sdd-fixtures.mjs depthProject): invariants with the data they bind and the contracts they govern, and the
// batch chain as its sequence with its windows and cut-offs (GR-SDD-28); a time-driven transition, dual control,
// parameters, the delivery a control or a plan rests on, start-up needs, a round-12 technology category, requirement
// fit and targets, journeys with their kinds of process and the responsibilities that realise or serve their steps, the
// responsibility groups, and the retired records (GR-SDD-26, each where it belongs and "open: …" once where it is not
// stated); section 6 with E's plan: the groups placed on the plateaus, the gap plan by each group's placement and the
// migration record (GR-SDD-14); and Sol's drafts read as drafted by Sol, not reviewed by a person (GR-SDD-10).
{
  const {document: deep, ids: d} = await depthProject(), deepBefore = JSON.stringify(deep), dd = sddDocument(deep, {figures: false}), dm = dd.markdown;
  assert.deepEqual(kidsOf(dm, TOP[3]), [...KIDS[4], 'Data invariants', 'Batch chain', OPEN_Q], 'section 4 ends with the invariants and the batch chain, then its open questions');
  const open4 = openList(dm, TOP[3]), notStated4 = (f, ref) => unstated(open4).filter(x => x.fields.includes(f) && x.refs.includes(ref)).length;
  assert.deepEqual(kidsOf(dm, TOP[5]), ['Plateaus', 'Gap plan to the next version', 'Migration', 'Retired records', OPEN_Q], 'section 6: the plateaus, the gap plan, the migration and the retired records, then its open questions');
  // GR-SDD-28: each invariant once, with the data it binds and the contracts that keep it; a component it binds names it.
  const inv = section(dm, 'Data invariants', 2), core = section(dm, 'APP-003 · Core connector', 3);
  assert.ok(inv.includes('**INV-001 · Postings balance** (balance): For every posting, debits equal credits. Binds DAT-003 Ledger posting; kept by IF-002 Ledger posting. Checked: Reconcile debits and credits at the end of each day. Owner: Finance operations.'), 'an invariant with its data, its contract, its check and its owner');
  // Format 2: an invariant whose owner is not stated ends with what is stated; the section's list names the owner once.
  assert.match(inv, /^\*\*INV-002 · One posting per instruction\*\* \(uniqueness\): An instruction posts once, whatever is repeated\. Binds DAT-003 Ledger posting and DAT-001 Payment instruction; kept by IF-005 [^.]+\. Checked: [^\n]+\.$/m, 'one with its owner not stated: what is stated');
  assert.ok(!/INV-002[^\n]*Owner: /.test(inv) && notStated4('owner', 'INV-002') === 1, 'its owner named once in the section’s open questions');
  assert.equal(count(dm, /\*\*INV-00[12] · /g), 2, 'each invariant prints in one place');
  assert.match(core, /^Invariants: INV-001 Postings balance; INV-002 One posting per instruction \(Data invariants, below\)\.$/m, 'the component whose data and contracts they bind names them');
  const spec = componentSpecDocument(deep, 'core-adapter');
  assert.ok(spec.markdown.includes('\nInvariants: INV-001 Postings balance (For every posting, debits equal credits); INV-002 One posting per instruction (An instruction posts once, whatever is repeated)\n') && spec.json.data.invariants.map(x => x.ref).join() === 'INV-001,INV-002', 'and so does its specification in the annex');
  const chain = section(dm, 'Batch chain', 2), ref = id => deep.interfaces.contracts.find(c => c.id === id).ref;
  assert.ok(chain.includes('(Chapter 8): ' + [d.close, d.interest, d.statements].map(ref).join(' → ') + '.'), 'the chain as its sequence');
  assert.ok(chain.includes('<!-- aiw:landscape -->\n| Order | Contract | Trigger | When | Window | Cut-off | After | Restart point | Volume |'), 'a landscape table');
  assert.ok(chain.includes('| 1 | ' + ref(d.close) + ' · Close the business day | calendar | Each business day | 22:00 to 23:00 UTC (RUN-004 End of day) | 21:45 | — | The last committed branch | 2 million postings |'), 'each with its trigger, schedule, window (and the plan window that runs it), cut-off, restart point and volume');
  assert.ok(chain.includes('| 2 | ' + ref(d.interest) + ' · Accrue interest | event | When the day is closed | 23:00 to 00:30 UTC (RUN-004 End of day) | 23:00 | ' + ref(d.close) + ' |'), 'and what it waits for');
  // Format 2: what a batch contract does not state is a dash in its row, named once in the section's open questions.
  assert.ok(chain.includes('| 3 | ' + ref(d.statements) + ' · Produce statements | time | 01:00 daily | — | — | ' + ref(d.interest) + ' | — | — |'), 'what a batch contract does not state is a dash');
  assert.ok(['batch window', 'cut-off', 'restart point', 'volume'].every(f => notStated4(f, ref(d.statements)) === 1), 'and named once in the section’s open questions');
  // GR-SDD-26, D4's fields: a transition moved by time, dual control, parameters, delivery, start-up, technology.
  assert.match(section(dm, 'APP-004 · Settlement worker', 3), /^Lifecycles: DAT-004 on status: PENDING → SETTLED by IF-003, PENDING → EXPIRED on schedule: End of day after five business days\.$/m, 'a lifecycle transition moved by time');
  // Format 2: a dual control with what it states (its maker, its stated parameter, the delivery it rests on); its
  // checker and the parameter value it leaves open are named once, in the section's open questions, whichever
  // components it protects.
  const dual = 'SEC-004 Maker-checker on posting release (dual control: maker Payments officer; parameters Release limit 10000 EUR; rests on 2 requirements: 1 not yet delivered (' + d.partly + ' partially delivered), 1 delivered)';
  assert.ok(core.includes(dual), 'a dual control with its maker, its stated parameter and the delivery it rests on');
  assert.ok(section(dm, 'APP-004 · Settlement worker', 3).includes(dual), 'the second component it protects reads the same');
  assert.ok(notStated4('checker role', 'SEC-004') === 1 && notStated4('the value of Approval window', 'SEC-004') === 1, 'its checker and the open parameter value named once in the section’s open questions');
  assert.match(core, new RegExp('^Placement: RUN-003: [^\\n]*; rests on 1 requirement: 1 not yet delivered \\(' + d.partly + ' partially delivered\\)\\.$', 'm'), 'a plan resting on a requirement not yet delivered');
  assert.match(section(dm, 'APP-002 · Risk engine', 3), /^At start-up it needs: APP-003 Core connector through IF-005 in ENV-001\.$/m, 'a path needed at start-up, read from the caller');
  // Round 24: a capability without a product prints alone (format 2), and the section's open questions name its product
  // once, whichever components stand on it; Appendix B lists it under one cause.
  assert.match(section(dm, 'APP-004 · Settlement worker', 3), /; TC-010 End-of-day runner \(scheduling\) \(if unavailable: essential\)\.$/m, 'a round-12 technology category, with the consequence if it is unavailable');
  assert.equal(notStated4('product', 'TC-010'), 1, 'the product not named for TC-010, named once in the section’s open questions');
  assert.ok(!/TC-010[^;\n]*→/.test(section(dm, TOP[3])) && !/no product/.test(dm), 'and nowhere a product or a "no product" for it');
  assert.deepEqual(dd.openItems.causes.filter(c => c.cause === 'Product not named for a capability').map(c => [c.chapter, c.kind, c.records.join()]), [[7, 'capability', 'TC-010']], 'Appendix B lists the capability without a product, once');
  assert.match(dm, /TC-001 [^\n(]+\(compute\) → [^\n(]+\(Draft preference\) \(if unavailable: essential; targets availability at least 99\.9 % over a calendar month for QD2; requirement fit RG-001 meets by configuration\)/, 'a realisation’s targets, selection state and its chosen option’s requirement fit');
  assert.match(section(dm, 'Key functionalities', 2), /^- \*\*The journey\*\*: 5 steps \(JRN-001–JRN-005\), 4 steps of a journey of the business, 1 step of a supporting process; realised by LR-001; served by LR-001–LR-005$/m, 'the journeys list every responsibility that serves a step');
  assert.match(section(dm, 'High-level component description', 2), /^- GRP-002 · Control & accounting: Risk decisions and authoritative financial records \(LR-002, LR-003\)$/m, 'the responsibility groups with their purposes and responsibilities');
  // GR-SDD-14 with E's plan: the groups placed on the plateaus, the gap plan by each group's placement, the migration.
  const plat = section(dm, 'Plateaus', 2);
  assert.ok(plat.includes('| Plateau | Kind | Due | Introduces | Retires | Requirement groups placed | Delivery gaps | Actions |'), 'the plateaus with the groups placed on them');
  assert.match(plat, /^\| PLT-002 · Real-time posting \| Transition \| 2027-06-30 \| 2 \| 0 \| 1 group \(\d+ requirements; by delivery status\) \| \d+ \| 0 \|$/m, 'a group placed by its delivery status, its gaps counted');
  assert.match(plat, /^\| PLT-003 · Target \| Target \| 2027-12-31 \| 0 \| 1 \| 1 group \(\d+ requirements; by a person\) \| \d+ \| 0 \|$/m, 'a group placed by a person');
  const plan = section(dm, 'Gap plan to the next version', 2);
  assert.match(plan, new RegExp('^\\| ' + d.domainGroup + ' · [^|]+ \\| [^|]+ \\| APP-001 \\| Real-time posting \\(placed by delivery status\\) \\|$', 'm'), 'a group’s gaps on the plateau it is placed on');
  assert.match(plan, new RegExp('^\\| ' + d.themeGroup + ' · [^|]+ \\| [^|]+ \\| APP-001 \\| Target \\(placed by a person\\) \\|$', 'm'), 'placed by a person');
  const mig = section(dm, 'Migration', 2);
  for (const t of ['**MIG-001 · Move postings off the batch ledger**: Written by a person; not confirmed by a person.', '- Moves from: The batch ledger', '- Moves to: The real-time core', '- Scope: Accounts and postings', '- Volumes: 2 million accounts, 9 million postings a month', '- Reconciliation: Balances and postings compared each night', '- Parallel run: Two weeks side by side', '- Rollback: Route the channel back to the batch ledger', 'Moves from PLT-001 · As is to PLT-002 · Real-time posting; carried by RA-001 · Prove the posting response time (planned).'])
    assert.ok(mig.includes(t), 'the migration record: ' + t);
  // Format 2 (round 24): the rehearsal it does not state prints no line; section 6's open questions name it once.
  assert.ok(!/^- Rehearsal: /m.test(mig) && !/open: /.test(mig), 'the rehearsal not stated prints no line, and no "open: …" marker stands in the migration');
  assert.deepEqual(unstated(openList(dm, TOP[5])).filter(x => x.fields.includes('rehearsal')).map(x => x.refs), [['MIG-001']], 'named once in section 6’s open questions');
  const retired = section(dm, 'Retired records', 2), gone = deep.retired.records.find(x => x.id === d.duplicate).record;
  assert.ok(retired.includes('2 records are retired: each is kept whole with who retired it, when and why, and no other part of this document reads them.'), 'the retired records, counted');
  assert.match(retired, new RegExp('^- ' + d.duplicate + ' · [^\\n]+ \\(Chapter 1\\), retired on 2026-10-08 by architect-a: A duplicate of another row\\n- ' + d.assumption + ' · The weekend batch runs as today \\(Chapter 1\\), retired on 2026-10-08 by architect-a: The weekend batch is replaced by the end-of-day chain$', 'm'), 'newest first, each with who, when and why');
  assert.ok(![TOP[0], TOP[1], TOP[3]].some(t => section(dm, t).includes(d.assumption + ' ') || section(dm, t).includes(d.duplicate + ' ')) && !section(dm, 'A. Requirements analysis and component mapping', 2).includes(d.duplicate + ' '), 'and nowhere else');
  const register = requirementRegisterMarkdown(deep, {page: 1, size: 1000});
  assert.ok(register.includes('\n## Retired requirements\n\n1 requirement is retired from the design, kept with who retired it, when and why; none is counted above.\n\n- ' + d.duplicate + ' (' + gone.externalId + ') · ' + gone.title + ', retired on 2026-10-08 by architect-a: A duplicate of another row.\n') && !register.includes('### ' + d.duplicate + ' '), 'the register annex lists the retired requirement on its last page, not among the requirements');
  // Appendix B lists what these records leave open, once each, and Sol's drafts awaiting a person.
  const open = section(dm, 'B. Open items', 2);
  for (const t of ['**Owner** (invariant, not stated): 1 record, INV-002.', '**Checker role** (control, not stated): 1 record, SEC-004.', '**Parameter value** (control, not stated): 1 record, SEC-004.', '**Rehearsal** (migration record, not stated): 1 record, MIG-001.', '**Batch window** (contract, not stated): 1 record, ' + ref(d.statements) + '.', '**Drafted by Sol, to keep, change or retire** (invariant, awaiting a person): 1 record, INV-002.', '**Drafted by Sol, to keep, change or retire** (contract, awaiting a person): 1 record, ' + ref(d.statements) + '.'])
    assert.ok(open.includes(t), 'Appendix B: ' + t);
  // GR-SDD-10 with E's drafts: a record the drafter marked is drafted by Sol, not reviewed by a person, in every edition,
  // until a person keeps or saves it; then it is theirs.
  assert.equal(dd.provenance.by.sol, 4, 'the two journey drafts and the two records the drafter marked'); assert.equal(dd.provenance.by.proposal, 0, 'none read as AIW’s seeded proposals');
  for (const edition of ['architecture', 'executive']) assert.ok(sddDocument(deep, {edition, figures: false}).markdown.includes('4 records drafted by Sol, not reviewed by a person'), edition + ': the provenance line names Sol’s drafts');
  assert.match(section(dm, 'E. Provenance', 2), /^\| 8 · Interfaces & data \| \d+ \| 2 \| /m, 'Appendix E counts them in their chapter');
  const kept = applyRecordCommand(deep, {type: 'record.keep', payload: {ids: [d.inv2], chapter: 8}}, FIXTURE_AT, 'architect-a').document;
  assert.deepEqual([provenanceReading(kept).by.sol, provenanceReading(kept).by.person], [3, provenanceReading(deep).by.person + 1], 'a draft a person keeps is theirs');
  assert.equal(JSON.stringify(deep), deepBefore, 'reading them changes nothing');
  pass('D4’s and E’s records print where they belong: invariants once with their data and contracts and named by the components they bind, the batch chain as its sequence with windows and cut-offs (GR-SDD-28); a time-driven transition, dual control with its parameters, the delivery a control or plan rests on, start-up needs, a scheduling capability, a realisation’s targets and requirement fit, journeys with their kinds and the responsibilities that realise or serve them, responsibility groups and retired records; section 6 places the groups on their plateaus, plans the gaps by placement and prints the migration record; what is not stated is open once and in Appendix B; Sol’s drafts read as drafted by Sol, not reviewed, until a person keeps them');
}

// 10. Round 24 (D-24-06): the decisions in their order, key functionalities with shared groups said once, and the
// purpose and audience said once when not stated.
{
  // Within a category the platform-wide decisions first (the cross-cutting drafting pass's, and those on the style, the
  // hosting, the integration and the data), then the broadest (requirement groups and drivers answered), then the order
  // recorded; the decision log follows the same order.
  const o = structuredClone(rich), byId = new Map(o.decisions.records.map(d => [d.id, d]));
  for (const id of ['ADR-002', 'ADR-003', ids.adr4, ids.adr5, 'ADR-006']) byId.get(id).category = 'structural';
  byId.get(ids.adr4).driverIds = [...byId.get(ids.adr4).driverIds, 'QD-006'];
  byId.get(ids.adr5).provenance = {...byId.get(ids.adr5).provenance, draft: {by: 'sol', engine: 'model', theme: 'cross'}};
  byId.get('ADR-006').topic = 'hosting';
  const om = sddDocument(o, {figures: false}).markdown, ii = [...section(om, 'II. Structural decisions', 2).matchAll(/^### (ADR-\d{3}) · /gm)].map(m => m[1]);
  assert.deepEqual(ii, [ids.adr5, 'ADR-006', ids.adr4, 'ADR-002', 'ADR-003'], 'the cross-cutting pass’s decision and the hosting decision first (each answering nothing), then the broadest (' + ids.adr4 + ': a group and three drivers), then the order recorded');
  assert.deepEqual([...section(om, 'Decision log', 2).matchAll(/^\| (ADR-\d{3}) \|/gm)].map(m => m[1]), ['ADR-001', ...ii], 'the decision log in the same order, category by category');
  assert.equal(JSON.stringify(sddDocument(o, {figures: false}).markdown), JSON.stringify(om), 'the same order every time');

  // Key functionalities: functional drivers that cover the same groups share one line, the groups said once.
  let k = structuredClone(rich);
  const fd = k.quality.drivers.find(d => d.id === ids.fd);
  for (const title of ['Open and close accounts', 'Hold funds on request', 'Report a posting trail']) k = applyCanonical(k, {type: 'quality.driver', payload: {kind: 'functional', title, description: title + ', as the brief asks.', impact: 'Shapes the functional choices of the design.', priority: 'High', rationale: 'The brief names it.', requirementGroupIds: [...fd.requirementGroupIds]}}, FIXTURE_AT, 'architect-a').document;
  const key = section(sddDocument(k, {figures: false}).markdown, 'Key functionalities', 2), shared = key.split('\n').filter(l => /^- /.test(l) && /covered by 4 functional drivers: /.test(l));
  assert.equal(shared.length, 1, 'four drivers covering the same groups share one line: ' + key);
  assert.ok(['FD1 · Post and enquire in real time', 'FD2 · Open and close accounts', 'FD3 · Hold funds on request', 'FD4 · Report a posting trail'].every(t => shared[0].includes('**' + t + '**')), 'naming each driver');
  const posting = requirementGroups(k).find(g => g.id === fd.requirementGroupIds[0]);
  assert.equal(count(key, new RegExp(posting.id + ' · ', 'g')), 1, 'their group printed once, as its label: ' + shared[0]);
  assert.ok(!/^- \*\*FD\d · /m.test(key), 'no line of its own for a driver whose groups another shares');

  // The purpose and audience when the brief and the narrative leave them unstated: one plain sentence each, saying where
  // to write it, listed once in the section's open questions and once in Appendix B.
  const silent = structuredClone(rich); silent.brief.goal = ''; silent.finalReview.narrative.audience = '';
  const sd = sddDocument(silent, {figures: false}), sm = sd.markdown, purpose = section(sm, 'Purpose', 2);
  assert.ok(purpose.includes('\nThe brief does not state the goal yet; write it in Chapter 1 · Work · Brief.\n') && purpose.includes('\nThe SDD narrative does not name the audience yet; name it in Chapter 11 · Work · Frame the SDD.\n'), 'the goal and the audience each said once, in a plain sentence with where to write it: ' + purpose);
  assert.ok(!/\(open: |open: /.test(section(sm, TOP[0])), 'no "(open: …)" and no "open: …" in section 1');
  const one = unstated(openList(sm, TOP[0]));
  assert.deepEqual([one.filter(x => x.fields.includes('goal')).map(x => x.line), one.filter(x => x.fields.includes('audience')).map(x => x.line)], [['- Not stated: goal (Brief)'], ['- Not stated: audience (SDD narrative)']], 'each listed once in the section’s open questions');
  const B7 = section(sm, 'B. Open items', 2);
  assert.ok(count(B7, /^\*\*Goal of the brief\*\* \(brief, not stated\): 1 record, Brief\./gm) === 1 && count(B7, /^\*\*Audience of the SDD narrative\*\* \(document, missing\): 1 record, SDD narrative\./gm) === 1, 'and once in Appendix B');
  pass('within a category the platform-wide decisions print first, then the broadest, then the order recorded, and the decision log follows (' + ii.join(', ') + '); four functional drivers covering the same groups share one key-functionality line with their group said once; a goal and an audience not stated are each one plain sentence with where to write it, listed once in section 1’s open questions and in Appendix B');
}

// 11. Round 25 (D-25-05 to D-25-07, D-25-09; PLAN §5, test:sdd-architecture): the decision reading in print, on the
// bank-payment reference project (three decisions weighed on their drivers, none chosen) and on variations of it made here
// with the driver and decision commands (a constraint driver on a Must, working choices, reasons cleared, the marks the
// drafters leave, effects not stated, a driver left out of the weights and a link to one no longer recorded, Sol's
// preference):
//   a. the trade-off analysis prints each decision's criteria with those left out and those no longer recorded, its
//      alternatives with the totals the reading computes (with their range where effects are not stated) and their
//      standing, the result and how firmly it holds, the effects not stated that could change the lead and the
//      sensitivity points; a decision that weighs nothing, or whose weighed effects are not stated, says so;
//   b. an open decision names the lean as the drivers' lean (or the tie, or the alternative that alone meets the hard
//      constraints), labelled as AIW's reading and never as a choice or a proposal, in its line, the log and the executive
//      edition; Sol's proposal stays its own line, as it was;
//   c. a ruled-out alternative and a dominated one are printed as such, and so is a working choice that a hard constraint
//      rules out or that another alternative dominates; a working choice that does not lead is said to;
//   d. an alternative not chosen that no person gave a reason for gets AIW's reading, labelled as AIW's, and its question
//      stays open (the section's open questions, Appendix B, the content reading); a person's reason stands alone;
//   e. an assessment AIW's rules drafted says so beside its driver and in the trade-off analysis, as Sol's does;
//   f. section 3 never says "score", "scored", "favour", "winner" or "recommend"; formats 1 and 2 read the same; nothing
//      is saved.
{
  const at = FIXTURE_AT, dcmd = (q, type, payload) => applyDecisionCommand(q, {type: 'decision.' + type, payload}, at).document, qcmd = (q, type, payload) => applyQualityCommand(q, {type: 'quality.' + type, payload}, at).document;
  const bank = withFinalReview(createProject({name: 'Reference bank payment', template: 'bank-payment'}, 'sdd-reading', at)), bankBefore = JSON.stringify(bank);
  const dec = (q, id) => q.decisions.records.find(d => d.id === id), alt = (q, id, a) => dec(q, id).alternatives.find(x => x.id === a);
  const build = q => sddDocument(q, {figures: false}).markdown, s3 = m => section(m, TOP[2]);
  const decisionOf = (m, id) => section(m, m.split('\n').find(l => l.startsWith('### ' + id + ' · ')).slice(4), 3), lineOf = (m, id) => decisionOf(m, id).split('\n').find(l => l.startsWith('**Decision**: '));
  const logRow = (m, id) => section(m, 'Decision log', 2).split('\n').find(l => l.startsWith('| ' + id + ' | '));
  const weighing = (m, id) => { const s = section(m, 'Trade-off analysis', 2), i = s.indexOf('\n**' + id + ' · '); assert.ok(i >= 0, id + ' has its part of the trade-off analysis'); const j = s.indexOf('\n**ADR-', i + 1); return s.slice(i + 1, j < 0 ? undefined : j); };
  const AIW = '(AIW’s reading of the recorded effects at the default weights; not a choice)', WORDS = /\bscor(?:e|ed|es|ing)\b|favou?r|\bwinner|recommend/i;
  const constraint = q => { const r = qcmd(structuredClone(q), 'driver', {kind: 'constraint', title: 'Post through the existing core ledger', description: 'Every posting goes through the core ledger.', impact: 'Rules out a second ledger.', constraintIds: ['CON-001'], priority: 'High'}); return {q: dcmd(r, 'save', {id: 'ADR-002', driverIds: [...dec(r, 'ADR-002').driverIds, r.quality.drivers.at(-1).id]}), C: r.quality.drivers.at(-1).id}; };
  const effect = (q, id, a, driver, v) => dcmd(q, 'alternative', {id, alternativeId: a, assessments: {...alt(q, id, a).assessments, [driver]: v}});
  const breaks = {effect: 'violates', reason: 'It keeps its own record of postings.', evidence: 'Design note.'};

  // a, b. The reference project as it is.
  const bm = build(bank), analysis = section(bm, 'Trade-off analysis', 2);
  assert.ok(analysis.includes('Each alternative is weighed on the drivers its decision names, at the default weights (' + DEFAULT_WEIGHTS + ')') && analysis.includes('A driver with no stated priority weighs nothing and is named.') && analysis.includes('The arithmetic is shown so that a reader can check it. ' + READING_NOTE), 'the analysis says how each alternative is weighed, that the arithmetic is shown and that it does not choose');
  for (const d of bank.decisions.records) {
    const r = readDecision(bank, d), rows = weighing(bm, d.id).split('\n').filter(l => /^\| ALT-\d{3} · /.test(l)).map(l => l.split(' | '));
    assert.deepEqual(rows.map(c => [c[0].slice(2).split(' · ')[0], c[1]]), r.rows.map(x => [x.id, (x.score > 0 ? '+' : x.score < 0 ? '−' : '') + Math.abs(x.score)]), d.id + ': every alternative with the total the reading computes');
  }
  const w2 = weighing(bm, 'ADR-002');
  for (const t of ['Criteria: QD1 ×3, QD3 ×2, QD5 ×3.\n', '| Alternative | Total | Effects | Standing |', '| ALT-003 · Enforce the reference at the posting boundary | +1 | QD1 +, QD3 −, QD5 0 | leads |', '| ALT-004 · Suppress repeats in the application cache | −1 | QD1 −, QD3 +, QD5 0 | 2 of 2 |',
    'Result: ALT-003 leads on the drivers: +1 against −1 for ALT-004 at the default weights (High 3, Medium 2, Low 1). The lead holds for any weights that keep each High driver at least as heavy as each Medium one, and each Medium at least as heavy as each Low one.\n',
    '- ALT-003 is better on QD1; ALT-004 on QD3.', '- QD1 is a sensitivity point: at Medium, no alternative would lead instead of ALT-003.', '- QD3 is a sensitivity point: at High, no alternative would lead instead of ALT-003.'])
    assert.ok(w2.includes(t), 'ADR-002: ' + t);
  assert.ok(weighing(bm, 'ADR-001').includes('The lead holds if drivers of the same priority count alike, not for every weighting the priorities allow. If only QD6 (Medium) counted, ALT-001 would come ahead of ALT-002. Sensitivity: none within one priority step.\n'), 'ADR-001: a lead that holds only while drivers of the same priority count alike names the weighting that would turn it');
  assert.ok(weighing(bm, 'ADR-003').includes('| ALT-006 · Retry immediately after a timeout | −8 | QD1 −, QD4 −, QD6 − | 2 of 2; dominated by ALT-005 |') && weighing(bm, 'ADR-003').includes('- ALT-006 is dominated by ALT-005: ALT-005 is at least as good on every driver and better on QD1, QD4 and QD6.'), 'ADR-003: a dominated alternative is printed as such');
  const bex = sddDocument(bank, {edition: 'executive', figures: false}).markdown, bdoc = sddDocument(bank, {figures: false});
  for (const [id, lead, title] of [['ADR-001', 'ALT-002', 'Acknowledge a durable asynchronous handoff'], ['ADR-002', 'ALT-003', 'Enforce the reference at the posting boundary'], ['ADR-003', 'ALT-005', 'Enquire and reconcile before replay']]) {
    const line = lineOf(bm, id);
    assert.ok(line.startsWith('**Decision**: Open: no alternative is chosen yet. Under consideration: ') && line.endsWith('. The drivers lean to ' + lead + ' · ' + title + ' ' + AIW + '.'), id + ': the drivers’ lean, labelled as AIW’s reading and not a choice: ' + line);
    assert.ok(!/propos|prefer|recommend|approv/i.test(line) && (line.match(/\bchoice\b/g) || []).length === 1, id + ': never a proposal, a preference or a choice: ' + line);
    assert.match(logRow(bm, id), new RegExp('\\| none chosen; the drivers lean to ' + lead + ' \\| QD\\d, QD\\d, QD\\d \\|$'), id + ': the log names the lean beside "none chosen"');
    assert.match(bex, new RegExp('^\\| ' + id + ' \\| [^\\n]+ \\| open; the drivers lean to ' + lead + ' \\|$', 'm'), id + ': and so does the executive edition');
    assert.ok(bdoc.content.findings.some(f => f.ref === id && f.check === 'open-decision' && f.detail === 'no alternative is chosen or proposed (2 alternatives under consideration)'), id + ': the reader reads the decision as open, each alternative once, the lean’s among them');
  }
  assert.ok(section(bm, 'Decision log', 2).includes('\nWhere the log names the drivers’ lean, a tie, a hard constraint a choice breaks or an alternative that dominates it, that is AIW’s reading of the recorded effects at the default weights (High 3, Medium 2, Low 1), shown in the trade-off analysis below; it is not a choice.\n') && bex.includes('that is AIW’s reading of the recorded effects at the default weights (High 3, Medium 2, Low 1), not a choice; the architecture edition’s trade-off analysis shows the arithmetic.'), 'the log and the executive edition say once whose reading the lean is');
  for (const [name, m] of [['bank payment', bm], ['rich', md]]) assert.ok(!WORDS.test(s3(m)), name + ': section 3 weighs and leans; it never scores, favours or recommends: ' + (WORDS.exec(s3(m)) || [''])[0]);

  // c, d, e. Working choices; the alternatives not chosen without a reason; a hard constraint; the drafted marks.
  const made = constraint(bank), C = made.C;
  let ch = made.q;
  assert.equal(driverCodes(ch).get(C), 'C1');
  ch = effect(ch, 'ADR-002', 'ALT-004', C, breaks); ch = effect(ch, 'ADR-002', 'ALT-003', C, {effect: 'supports', reason: 'It posts through the core ledger.', evidence: 'Design note.'});
  for (const [id, a] of [['ADR-001', 'ALT-001'], ['ADR-002', 'ALT-003'], ['ADR-003', 'ALT-005']]) ch = dcmd(ch, 'choose', {id, alternativeId: a});
  // No reason and no costs for the alternatives not chosen; ALT-003's assessments as AIW's rules draft them from the SA
  // Playbook's marks, ALT-001's as Sol drafts them (decisions-domain.js rulesAssessed, solAssessed).
  for (const [id, a] of [['ADR-001', 'ALT-002'], ['ADR-002', 'ALT-004'], ['ADR-003', 'ALT-006']]) Object.assign(alt(ch, id, a), {costs: '', rejectionReason: ''});
  for (const v of Object.values(alt(ch, 'ADR-002', 'ALT-003').assessments)) v.by = 'rules';
  for (const v of Object.values(alt(ch, 'ADR-001', 'ALT-001').assessments)) v.by = 'sol';
  const chBefore = JSON.stringify(ch), cd = sddDocument(ch, {figures: false}), cm = cd.markdown, c2 = weighing(cm, 'ADR-002');
  for (const t of ['Criteria: QD1 ×3, QD3 ×2, QD5 ×3, C1 ×3 (hard constraint).', '| ALT-003 · Enforce the reference at the posting boundary | +4 | QD1 +, QD3 −, QD5 0, C1 + | the only one that meets the hard constraints; working choice |', '| ALT-004 · Suppress repeats in the application cache | −4 | QD1 −, QD3 +, QD5 0, C1 breaks | ruled out: breaks C1 |', 'Result: ALT-003 is the only alternative that meets the hard constraints.\n', '- ALT-004 is ruled out: it breaks C1, a hard constraint.'])
    assert.ok(c2.includes(t), 'ADR-002, on a hard constraint: ' + t);
  assert.ok(lineOf(cm, 'ADR-002').endsWith('(the working choice of a draft decision, not yet accepted). The working choice is the only alternative that meets the hard constraints (AIW’s reading of the recorded effects).'), 'its working choice is the one alternative that meets the constraint');
  for (const [id, a, reading] of [['ADR-001', 'ALT-002', 'leads on the drivers, +2 against −2 for ALT-001'], ['ADR-002', 'ALT-004', 'ruled out, it breaks C1'], ['ADR-003', 'ALT-006', 'dominated by ALT-005']]) {
    const bullet = decisionOf(cm, id).split('\n').find(l => l.startsWith('- ' + a + ' · '));
    assert.ok(bullet.endsWith(' AIW’s reading: ' + reading + '.') && !/Not chosen: /.test(bullet), id + ': ' + a + ', not chosen without a reason, gets AIW’s reading, never a reason: ' + bullet);
    assert.ok(cd.content.findings.some(f => f.ref === id && f.field === 'alternative:' + a && f.check === 'why-not'), id + ': and the reader still asks why ' + a + ' was not chosen');
  }
  assert.ok(unstated(openList(cm, TOP[2])).some(x => x.fields.includes('why an alternative was not chosen') && x.all), 'the section’s open questions still ask why, of all three decisions');
  assert.ok(section(cm, 'B. Open items', 2).includes('**Why an alternative was not chosen** (decision, not stated): 3 records, ADR-001–ADR-003.'), 'and Appendix B lists it, each decision once');
  assert.deepEqual(parseArchitectureEdition(cm).decisions.find(d => d.ref === 'ADR-003').alternatives.map(a => [a.ref, a.why, a.reading]), [['ALT-006', '', 'dominated by ALT-005.']], 'the reader keeps AIW’s reading apart from a reason');
  assert.ok(lineOf(cm, 'ADR-001').endsWith('(the working choice of a draft decision, not yet accepted). The drivers lean to ALT-002 · Acknowledge a durable asynchronous handoff, not to the working choice, which ranks 2 of 2 ' + AIW + '.') && /\| ALT-001 · Keep the customer request synchronous \(working choice\); the drivers lean to ALT-002 \| QD2, QD3, QD6 \|$/.test(logRow(cm, 'ADR-001')), 'a working choice the drivers do not lean to: the lean said factually, in its line and its row');
  assert.ok(weighing(cm, 'ADR-001').includes('| ALT-001 · Keep the customer request synchronous | −2 | QD2 −, QD3 −, QD6 + | 2 of 2; working choice |') && weighing(cm, 'ADR-001').includes('- The working choice, ALT-001, ranks 2 of 2 on the drivers.'), 'and its standing in the analysis');
  assert.ok(!/drivers lean/.test(lineOf(cm, 'ADR-003')) && !logRow(cm, 'ADR-003').split(' | ')[4].includes(';'), 'a working choice that leads adds nothing to its line or its row');
  assert.equal(decisionOf(cm, 'ADR-002').split('\n').filter(l => /^- .+ \((?:QD|C)\d\): .+ \(drafted by AIW’s rules from the SA Playbook, not reviewed by a person\)$/.test(l)).length, 4, 'each assessment AIW’s rules drafted says so beside its driver');
  assert.ok(decisionOf(cm, 'ADR-002').includes('- Post through the existing core ledger (C1): supports it — It posts through the core ledger. (drafted by AIW’s rules from the SA Playbook, not reviewed by a person)'), 'with its effect and reason');
  assert.equal(decisionOf(cm, 'ADR-001').split('\n').filter(l => /^- .+ \(QD\d\): .+ \(Sol’s assessment, not reviewed by a person\)$/.test(l)).length, 3, 'Sol’s assessments keep their own mark');
  assert.ok(c2.includes('Drafted by AIW’s rules from the SA Playbook, not reviewed by a person: ALT-003 on QD1, QD3, QD5 and C1.') && weighing(cm, 'ADR-001').includes('Sol’s assessment, not reviewed by a person: ALT-001 on QD2, QD3 and QD6.'), 'the analysis names the effects no person has reviewed, and whose they are');
  assert.ok(!cd.content.findings.some(f => f.section === 3 && f.check === 'bookkeeping'), 'the reader takes the marks for provenance, not for the reasons’ prose');
  // f. Format 1 keeps its "open: why not chosen" and adds AIW's reading after it; both formats read the same.
  const one = architectureMarkdown(ch, {format: 1}), two = architectureMarkdown(ch, {format: 2}), plainJ = x => JSON.parse(JSON.stringify(x));
  assert.ok(decisionOf(one.markdown, 'ADR-003').includes('\n- ALT-006 · Retry immediately after a timeout: Resubmit when the initial call times out without establishing the prior outcome. Not chosen: open: why not chosen. AIW’s reading: dominated by ALT-005.\n'), 'format 1: the open marker, then AIW’s reading');
  assert.deepEqual(plainJ(contentReading(one.markdown)), plainJ(contentReading(two.markdown)), 'formats 1 and 2 read the same, reread');
  assert.deepEqual(plainJ(two.content), plainJ(one.content), 'and as built');
  // A person's reason, when stated, is printed as it is, and AIW's reading is not added.
  const reasoned = structuredClone(ch); alt(reasoned, 'ADR-003', 'ALT-006').rejectionReason = 'It may repeat an operation that succeeded.';
  const rb = decisionOf(build(reasoned), 'ADR-003').split('\n').find(l => l.startsWith('- ALT-006 · '));
  assert.ok(rb.endsWith(' Not chosen: It may repeat an operation that succeeded.') && !rb.includes('AIW’s reading'), 'a person’s reason stands alone: ' + rb);
  // The choice of an accepted decision is the chosen alternative, not a working choice.
  const accepted = structuredClone(ch); dec(accepted, 'ADR-001').status = 'accepted';
  const acm = build(accepted);
  assert.ok(lineOf(acm, 'ADR-001').endsWith(' The drivers lean to ALT-002 · Acknowledge a durable asynchronous handoff, not to the chosen alternative, which ranks 2 of 2 ' + AIW + '.') && weighing(acm, 'ADR-001').includes(' | 2 of 2; chosen |') && weighing(acm, 'ADR-001').includes('- The chosen alternative, ALT-001, ranks 2 of 2 on the drivers.'), 'an accepted decision’s choice is the chosen alternative');
  assert.equal(JSON.stringify(ch), chBefore, 'printing the reading changes nothing');

  // c. A working choice a hard constraint rules out and one another alternative dominates; b. Sol's preference beside
  // the lean; a. a driver left out of the weights, a link to one no longer recorded, effects not stated.
  const ruled = constraint(bank);
  let cc = effect(ruled.q, 'ADR-002', 'ALT-004', ruled.C, breaks);
  cc = dcmd(cc, 'choose', {id: 'ADR-002', alternativeId: 'ALT-004'}); cc = dcmd(cc, 'choose', {id: 'ADR-003', alternativeId: 'ALT-006'});
  dec(cc, 'ADR-001').recommendation = {by: 'sol', alternativeId: 'ALT-001', rationale: 'Sol reads the synchronous path as simpler to run.'};
  cc.quality.drivers.find(d => d.id === 'QD-006').priority = ''; dec(cc, 'ADR-001').driverIds.push('QD-099');
  alt(cc, 'ADR-001', 'ALT-002').assessments['QD-003'] = {effect: 'unknown', reason: '', evidence: ''};
  const xm = build(cc), xex = sddDocument(cc, {edition: 'executive', figures: false}).markdown, x1 = weighing(xm, 'ADR-001'), x2 = weighing(xm, 'ADR-002'), x3 = weighing(xm, 'ADR-003');
  assert.ok(lineOf(xm, 'ADR-002').endsWith(' The working choice breaks C1, a hard constraint; ALT-003 · Enforce the reference at the posting boundary is the only alternative that does not break it, though whether it meets C1 is not stated (AIW’s reading of the recorded effects).'), 'a working choice a hard constraint rules out is said to be: ' + lineOf(xm, 'ADR-002'));
  assert.ok(/\(working choice\); it breaks C1, a hard constraint \| QD1, QD3, QD5, C1 \|$/.test(logRow(xm, 'ADR-002')) && /\| ALT-004 Suppress repeats in the application cache \(working choice\); it breaks C1, a hard constraint \|$/m.test(xex), 'in the log and the executive edition');
  for (const t of ['| ALT-003 · Enforce the reference at the posting boundary | +1 (−2 to +4) | QD1 +, QD3 −, QD5 0, C1 ? | the only one not ruled out; not shown to meet C1 |', '| ALT-004 · Suppress repeats in the application cache | −4 | QD1 −, QD3 +, QD5 0, C1 breaks | ruled out: breaks C1; working choice |', '- Whether ALT-003 meets C1 is not stated.', '- The working choice, ALT-004, breaks C1, a hard constraint.'])
    assert.ok(x2.includes(t), 'ADR-002, the choice ruled out: ' + t);
  assert.ok(lineOf(xm, 'ADR-003').endsWith(' The working choice is dominated by ALT-005 · Enquire and reconcile before replay, which is at least as good on every driver this decision names and better on QD1, QD4 and QD6 (AIW’s reading of the recorded effects).'), 'a dominated working choice is said to be: ' + lineOf(xm, 'ADR-003'));
  assert.ok(/\(working choice\); dominated by ALT-005 \| QD1, QD4, QD6 \|$/.test(logRow(xm, 'ADR-003')) && /\| ALT-006 Retry immediately after a timeout \(working choice\); dominated by ALT-005 \|$/m.test(xex), 'in the log and the executive edition');
  assert.ok(x3.includes('| ALT-006 · Retry immediately after a timeout | −6 | QD1 −, QD4 −, QD6 − | 2 of 2; dominated by ALT-005; working choice |') && x3.includes('- The working choice, ALT-006, is dominated by ALT-005.'), 'and in the analysis');
  assert.equal(lineOf(xm, 'ADR-001'), '**Decision**: Open: no alternative is chosen yet. Preferred: ALT-001 · Keep the customer request synchronous, proposed by Sol, not accepted: Sol reads the synchronous path as simpler to run. Under consideration: ALT-001 · Keep the customer request synchronous; ALT-002 · Acknowledge a durable asynchronous handoff. The drivers lean to ALT-002 · Acknowledge a durable asynchronous handoff ' + AIW + '.', 'Sol’s proposal is its own line, as it was; the drivers’ lean follows, apart');
  assert.match(logRow(xm, 'ADR-001'), /\| none chosen; ALT-001 proposed by Sol, not accepted; the drivers lean to ALT-002 \| QD2, QD3, QD6, QD-099 \|$/, 'and in the log');
  const sol = parseArchitectureEdition(xm).decisions.find(d => d.ref === 'ADR-001');
  assert.deepEqual([sol.proposed?.ref, sol.considered], ['ALT-001', ['ALT-001', 'ALT-002']], 'the reader reads Sol’s proposal as the decision stated, never the lean, and each alternative under consideration once');
  assert.ok(x1.includes('Criteria: QD2 ×2, QD3 ×2. QD6 weighs nothing: no priority is stated. QD-099 no longer exists and weighs nothing.\n'), 'the drivers the weights leave out are named, and a link to a driver no longer recorded');
  assert.ok(x1.includes('| ALT-002 · Acknowledge a durable asynchronous handoff | +2 (0 to +4) | QD2 +, QD3 ?, QD6 − | leads |') && x1.includes('- One weighed effect is not stated; none could change the lead.'), 'an effect not stated: the total with its range, and whether it could change the lead');
  // a. The effects not stated that could change the lead, the leader's first.
  const un = structuredClone(bank);
  for (const a of ['ALT-003', 'ALT-004']) alt(un, 'ADR-002', a).assessments['QD-005'] = {effect: 'unknown', reason: '', evidence: ''};
  const u2 = weighing(build(un), 'ADR-002');
  assert.ok(u2.includes('| ALT-003 · Enforce the reference at the posting boundary | +1 (−2 to +4) | QD1 +, QD3 −, QD5 ? | leads |') && u2.includes('| ALT-004 · Suppress repeats in the application cache | −1 (−4 to +2) | QD1 −, QD3 +, QD5 ? | 2 of 2 |') && u2.includes('- Two weighed effects are not stated; stating them could change the lead: ALT-003’s on QD5 and ALT-004’s on QD5.'), 'the effects not stated that could change the lead, named: ' + u2);
  // b. A tie, and every alternative ruled out.
  const tie = structuredClone(bank); tie.quality.drivers.find(d => d.id === 'QD-003').priority = 'High';
  const tm = build(tie);
  assert.ok(lineOf(tm, 'ADR-002').endsWith(' The drivers weigh ALT-003 and ALT-004 alike ' + AIW + '.') && /\| none chosen; ALT-003 and ALT-004 tie on the drivers \| /.test(logRow(tm, 'ADR-002')) && weighing(tm, 'ADR-002').includes('Result: ALT-003 and ALT-004 tie at the default weights (0 each).') && weighing(tm, 'ADR-002').includes('| 0 | QD1 −, QD3 +, QD5 0 | tied |'), 'a tie is named as one, and nothing leads');
  const out = constraint(bank);
  let allOut = out.q;
  for (const a of ['ALT-003', 'ALT-004']) allOut = effect(allOut, 'ADR-002', a, out.C, breaks);
  const nm = build(allOut);
  assert.ok(lineOf(nm, 'ADR-002').endsWith(' Every alternative breaks a hard constraint (AIW’s reading of the recorded effects): revisit the alternatives or the constraint.') && /\| none chosen; every alternative breaks a hard constraint \| /.test(logRow(nm, 'ADR-002')) && weighing(nm, 'ADR-002').includes('Result: Every alternative breaks a hard constraint: revisit the alternatives or the constraint.'), 'every alternative ruled out: said so, and nothing leads');
  // a. A decision that weighs nothing, or whose weighed effects are not stated, says so, and no lean is printed.
  const lib = build(withFinalReview(createProject({name: 'Reference library reservations', template: 'library-reservations'}, 'sdd-reading-lib', at)));
  assert.match(section(lib, 'Trade-off analysis', 2), /^5 decisions weigh nothing yet: no driver they name has a stated priority \(ADR-001–ADR-005; the priorities are set in Chapter 2 · Work\)\.$/m, 'decisions whose drivers have no stated priority weigh nothing, and say so');
  assert.ok(!/drivers lean|AIW’s reading/.test(s3(lib)), 'and no lean is printed where nothing is weighed');
  const nj = structuredClone(bank);
  for (const a of dec(nj, 'ADR-001').alternatives) for (const k of Object.keys(a.assessments)) a.assessments[k] = {effect: 'unknown', reason: '', evidence: ''};
  const njm = build(nj);
  assert.ok(section(njm, 'Trade-off analysis', 2).includes('\n1 decision compares alternatives whose effect on a weighed driver is not stated yet: ADR-001 (Chapter 3 · Model · Trade-offs).\n') && !section(njm, 'Trade-off analysis', 2).includes('**ADR-001 · ') && !/drivers lean/.test(lineOf(njm, 'ADR-001')), 'a decision whose weighed effects are not stated says so, with no lean');
  assert.equal(JSON.stringify(bank), bankBefore, 'reading the decisions and printing the reading change nothing');
  assert.ok(bank.decisions.records.every(d => !['reading', 'lead', 'lean', 'tally', 'favoured'].some(k => Object.hasOwn(d, k))), 'and no reading is stored on a decision');
  pass('the decision reading in print (bank-payment reference and its variations): the trade-off analysis weighs (never scores) each decision at the default weights with its criteria, those left out and those no longer recorded, every alternative’s total as the reading computes it (with its range where effects are not stated), its standing, the result, how firmly it holds, the effects that could change it and the sensitivity points; an open decision names the drivers’ lean (or a tie, or none left) as AIW’s reading and not a choice, in its line, the log and the executive edition, beside Sol’s proposal unchanged; ruled-out and dominated alternatives and choices are printed as such; an alternative not chosen without a reason gets AIW’s reading while its question stays open; AIW’s rules’ assessments say so as Sol’s do; formats 1 and 2 read the same and nothing is saved');
}

console.log(JSON.stringify({passed: checks.length, sizes: {richBytes: Buffer.byteLength(md), sections: doc.sections.length, openItems: doc.openItems.total}}));
