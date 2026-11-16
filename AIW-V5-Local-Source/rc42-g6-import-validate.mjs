// AIW v0.10.0-rc.10.73.42, group G6 (intake and import; audit/rc42/OWNER-DECISIONS-AND-PLAN-2026-10-30.md). Two defects
// of the handbook gap review (audit/rc41/handbook-review/AIW-HANDBOOK-GAP-REVIEW-2026-10-30.md, section 3), each
// reproduced here before its fix:
//   D12 · An ArchiMate import turned a Gap into a drafted Chapter 1 requirement (and on into a Chapter 2 driver and a
//         Chapter 3 decision), and drafted a business Capability or BusinessFunction as a Chapter 6 technology
//         capability. Now a business capability is read as one and named against the governed Enterprise capability
//         identity the project has adopted (or kept as an import note for the person), a Gap is read as a transition
//         note for Chapter 11, and every element of the strategy and implementation-and-migration layers that no chapter
//         drafts is listed in the draft's import report (draft.model.notMapped) and its note, with the lines it came from.
//   D16 · (C1-M1) An imported BPMN branch with no condition was given the words "No condition stated in the model for …",
//         which satisfied PROC-GATEWAY, and the gateway's default flow was dropped. Now the branch is adopted with an open
//         condition (empty, recorded as an open question) that PROC-GATEWAY flags until a person states it; the default
//         flow is carried as process.transition `default`, exempt from the condition and shown as the default path (only
//         out of an exclusive or inclusive gateway; a second one is a PROC-GATEWAY error); a document written with the
//         retired words reads them as open; the BPMN export writes the gateway's default back.
// Review round 2 (each reproduced on the first G6 commit 3549473 before its fix): only a gateway that splits (two or more
// outgoing sequence flows) asks for a condition, so the one flow out of a merge gets no invented question; a default flag
// left on a flow out of a gateway that no longer chooses (made parallel, or no gateway) is a PROC-GATEWAY finding and is
// never exported as default=; an open or retired condition is printed as open in the SDD and never exported as a
// conditionExpression (and the words a pre-rc42 export clipped read as open again); a reviewed identity link cannot
// bring the D12 misfiling back (a business capability onto a Chapter 6 capability, a gap onto a requirement).
// Plain node assertions, no server, no provider key. Run: node rc42-g6-import-validate.mjs
import assert from 'node:assert/strict';
import {interpretModel, ELEMENT_KINDS} from './shared/model-interpreter.js';
import {draftJourney, draftChapter} from './shared/journey-drafter.js';
import {createProject} from './shared/projects-domain.js';
import {processFindings, processMarkdown, applyProcessCommand} from './public/process-model.js';
import {previewWorkingChange, applyWorkbenchCommand} from './public/workbench-domain.js';
import {enterpriseDefinition} from './public/enterprise-references.js';
import {applyCommand} from './public/requirements-domain.js';
import {modelBindingPreview, modelRevisionPreview, applyModelReconciliation} from './public/model-reconciliation.js';
import {MODEL_RULES} from './shared/model-interpreter.js';
import {fieldsFor} from './public/record-fields.js';
import {processTransitionCommand, processDetailsHTML} from './public/process-editing.js';
import * as journeyDraftUI from './public/journey-draft-ui.js';
import {esc} from './public/html-escape.js';
import {notationDiagram} from './public/notation-model.js';
import {notationLayout} from './public/notation-layout.js';
import {diagramCode} from './public/notation-code.js';

const checks = [], failed = [], pass = name => { checks.push(name); console.log('PASS', name); };
// Each defect is checked on its own, so a run before the fix shows every one that reproduces.
const section = (name, fn) => { try { fn(); } catch (e) { failed.push(name); console.error('FAIL', name + ':', String(e?.message || e).slice(0, 600)); } };
const at = '2026-10-30T09:00:00Z';
const project = (name, file, text) => createProject({name, template: 'blank', brief: '', model: {text, name: file, kind: file.split('.').pop()}}, 'rc42-g6-' + file.replace(/\W/g, '-'), at, {briefHash: ''});
const modelOf = (p, text, file) => ({...interpretModel(text, {name: file}), sourceId: p.coauthoring.sources.find(s => s.kind === 'model').id});
const byName = (r, name) => r.elements.find(e => e.name === name) || assert.fail('no element named ' + name);
const titles = draft => draft.records.map(r => r.title);
const everything = chapters => JSON.stringify(chapters.map(c => c.records.map(r => [r.title, r.answers])));

// ---------------------------------------------------------------- D12 · ArchiMate Gap and business Capability
const ARCHIMATE = `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" identifier="m-core">
  <name xml:lang="en">Core posting renewal</name>
  <elements>
    <element identifier="a-teller" xsi:type="BusinessActor"><name xml:lang="en">Teller</name><documentation xml:lang="en">Posts customer payments at the branch.</documentation></element>
    <element identifier="a-post" xsi:type="BusinessProcess"><name xml:lang="en">Post a payment</name></element>
    <element identifier="a-req" xsi:type="Requirement"><name xml:lang="en">Post each payment exactly once</name></element>
    <element identifier="a-cap" xsi:type="Capability"><name xml:lang="en">Payment posting</name></element>
    <element identifier="a-func" xsi:type="BusinessFunction"><name xml:lang="en">Customer servicing</name></element>
    <element identifier="a-legacy" xsi:type="ApplicationComponent"><name xml:lang="en">Posting engine</name></element>
    <element identifier="a-ledger" xsi:type="ApplicationComponent"><name xml:lang="en">Ledger service</name></element>
    <element identifier="a-api" xsi:type="ApplicationService"><name xml:lang="en">Posting API</name></element>
    <element identifier="a-base" xsi:type="Plateau"><name xml:lang="en">Baseline 2026</name></element>
    <element identifier="a-target" xsi:type="Plateau"><name xml:lang="en">Target 2028</name></element>
    <element identifier="a-gap" xsi:type="Gap"><name xml:lang="en">Replace posting engine</name></element>
    <element identifier="a-work" xsi:type="WorkPackage"><name xml:lang="en">Migrate the ledger</name></element>
  </elements>
  <relationships>
    <relationship identifier="r1" xsi:type="Assignment" source="a-teller" target="a-post"/>
    <relationship identifier="r2" xsi:type="Realization" source="a-ledger" target="a-api"/>
    <relationship identifier="r3" xsi:type="Serving" source="a-api" target="a-post"/>
    <relationship identifier="r4" xsi:type="Flow" source="a-legacy" target="a-ledger"><name xml:lang="en">Posting handed over</name></relationship>
    <relationship identifier="r5" xsi:type="Association" source="a-gap" target="a-base"/>
    <relationship identifier="r6" xsi:type="Association" source="a-gap" target="a-target"/>
    <relationship identifier="r7" xsi:type="Realization" source="a-work" target="a-target"/>
    <relationship identifier="r8" xsi:type="Composition" source="a-target" target="a-ledger"/>
  </relationships>
</model>`;
section('D12 reader', () => {
  const r = interpretModel(ARCHIMATE, {name: 'core.xml'});
  assert.equal(r.format, 'archimate');
  assert.ok(ELEMENT_KINDS.includes('business-capability') && ELEMENT_KINDS.includes('gap'), 'the reader has a kind for a business capability and for a gap');
  assert.deepEqual([byName(r, 'Payment posting').kind, byName(r, 'Customer servicing').kind], ['business-capability', 'business-capability'], 'a Capability and a BusinessFunction read as business capabilities, not as the technology kind "capability"');
  assert.deepEqual([byName(r, 'Replace posting engine').kind, byName(r, 'Replace posting engine').attrs.layer], ['gap', 'implementation'], 'a Gap reads as a gap of the implementation-and-migration layer, not as a requirement');
  assert.equal(r.elements.filter(e => e.kind === 'requirement').map(e => e.name).join(), 'Post each payment exactly once', 'only the Requirement is a requirement');
  assert.equal(byName(r, 'Payment posting').attrs.xsiType, 'Capability');
  assert.deepEqual(r.report.counts.kinds['business-capability'], 2); assert.deepEqual(r.report.counts.kinds.gap, 1);
  // draw.io's ArchiMate shapes read the same way.
  const cell = (id, value, style) => `<mxCell id="${id}" value="${value}" style="${style}" vertex="1" parent="1"><mxGeometry x="0" y="0" width="120" height="60" as="geometry"/></mxCell>`;
  const drawio = `<mxfile><diagram name="Strategy"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cell('c1', 'Payment posting', 'shape=mxgraph.archimate3.application;appType=capability;archiType=rounded;')}${cell('c2', 'Replace posting engine', 'shape=mxgraph.archimate3.gap;')}${cell('c3', 'Customer servicing', 'shape=mxgraph.archimate3.business;busType=func;')}${cell('c4', 'Ledger hosting', 'shape=mxgraph.archimate3.tech;techType=func;')}</root></mxGraphModel></diagram></mxfile>`;
  const d = interpretModel(drawio, {name: 'strategy.drawio'});
  assert.deepEqual(['Payment posting', 'Replace posting engine', 'Customer servicing', 'Ledger hosting'].map(n => byName(d, n).kind), ['business-capability', 'gap', 'business-capability', 'capability'], 'draw.io: the strategy capability and a business function are business capabilities, the gap a gap; a technology function stays a technology capability');
  assert.equal(byName(d, 'Replace posting engine').attrs.layer, 'implementation');
  pass('D12 reader: an ArchiMate Capability and BusinessFunction read as business capabilities and a Gap as a gap (implementation-and-migration layer), in the exchange file and in draw.io; only a Requirement is a requirement, and a technology function stays a technology capability');
});
const P12 = project('Core posting renewal', 'core.xml', ARCHIMATE), M12 = modelOf(P12, ARCHIMATE, 'core.xml'), RUN12 = draftJourney(P12, {brief: null, model: M12, at});
section('D12 Gap', () => {
  const run = RUN12, [c1, c2, c3] = run.chapters;
  // Chapter 1 drafts no requirement from the Gap; nothing downstream (a driver, a decision) is drafted from it either.
  assert.deepEqual(c1.records.filter(r => r.type === 'requirement').map(r => r.title), ['Post each payment exactly once'], 'Chapter 1: the Gap is not drafted as a requirement');
  assert.ok(!titles(c1).includes('Replace posting engine'), 'Chapter 1 drafts no record from the Gap');
  assert.ok(!/Replace posting engine/.test(everything(run.chapters)), 'no chapter drafts anything from the Gap (no requirement, no Chapter 2 driver, no Chapter 3 decision): ' + [...c2.records, ...c3.records].map(r => r.title).join('; '));
  pass('D12 Gap: an ArchiMate Gap drafts no Chapter 1 requirement, and so no Chapter 2 driver or Chapter 3 decision');
});
section('D12 business capability', () => {
  const run = RUN12, c6 = run.chapters[5];
  // Chapter 6 drafts the application service, never a business capability.
  assert.ok(titles(c6).includes('Posting API'), 'Chapter 6 still drafts the technology the model names (the application service)');
  assert.ok(!titles(c6).includes('Payment posting') && !titles(c6).includes('Customer servicing'), 'Chapter 6: a business Capability or BusinessFunction is never a technology capability: ' + titles(c6).join('; '));
  assert.ok(!/Payment posting|Customer servicing/.test(everything(run.chapters)), 'no chapter drafts a record from a business capability');
  pass('D12 business capability: a business Capability or BusinessFunction drafts no Chapter 6 technology capability, or any other record; the application service still drafts its Chapter 6 capability');
});
section('D12 import report', () => {
  const run = RUN12, model = M12, [c1, , , , , c6] = run.chapters;
  // The import report: every element no chapter drafts, with its mapping, its reason and the lines it came from.
  const report = c1.model?.notMapped;
  assert.ok(Array.isArray(report), 'the draft carries the import report of what the model holds and no chapter drafts (draft.model.notMapped)');
  const row = name => report.find(x => x.name === name) || assert.fail('the import report names ' + name + ': ' + JSON.stringify(report));
  const els = new Map(model.elements.map(e => [e.name, e]));
  assert.deepEqual(report.map(x => x.name).sort(), ['Baseline 2026', 'Customer servicing', 'Migrate the ledger', 'Payment posting', 'Replace posting engine', 'Target 2028'], 'the report names exactly the business capabilities and the implementation-and-migration elements');
  for (const x of report) {
    assert.equal(x.element, els.get(x.name).id, x.name + ': the report names the model element');
    assert.deepEqual(x.passages, els.get(x.name).passages, x.name + ': and cites the lines it came from'); assert.ok(x.passages.length, x.name + ': at least one line');
    assert.ok(typeof x.note === 'string' && x.note.includes(x.name), x.name + ': with a note for the person that names it');
  }
  const g = row('Replace posting engine');
  assert.deepEqual([g.kind, g.xsiType, g.mapping], ['gap', 'Gap', 'transition-note']);
  assert.match(g.note, /not a requirement/i); assert.match(g.note, /Chapter 11/); assert.match(g.note, /Baseline 2026/); assert.match(g.note, /Target 2028/);
  for (const name of ['Payment posting', 'Customer servicing']) { const x = row(name); assert.deepEqual([x.kind, x.mapping, x.identity], ['business-capability', 'import-note', undefined], name + ': no adopted Enterprise capability carries its name, so it is an import note'); assert.match(x.note, /not a Chapter 6 technology capability/); assert.match(x.note, /Enterprise capability/); }
  assert.deepEqual([row('Baseline 2026').mapping, row('Target 2028').mapping, row('Migrate the ledger').mapping], ['import-note', 'import-note', 'import-note']);
  assert.match(row('Migrate the ledger').note, /not a journey step/);
  for (const c of run.chapters.filter(c => c.mode === 'model')) assert.deepEqual(c.model.notMapped, report, `Chapter ${c.chapter}: every model draft carries the same import report`);
  // The draft's note, which the journey draft shows, says so in Chapter 1 and, for the capabilities, in Chapter 6.
  assert.match(c1.note || '', /6 elements of the model are not drafted into a chapter/); assert.match(c1.note, /Replace posting engine/); assert.match(c1.note, /Payment posting/);
  assert.match(c6.note || '', /Payment posting/); assert.match(c6.note, /Customer servicing/); assert.match(c6.note, /not a Chapter 6 technology capability/);
  // The journey draft shows the note and the report, each row with its note and its lines.
  const html = journeyDraftUI.draftNotesHTML(c1, true);
  assert.ok(html.includes('<p class="jd-source-note">6 elements of the model are not drafted into a chapter'), 'the journey draft shows the chapter\'s note');
  assert.match(html, /<summary>Not drafted from the model · 6<\/summary>/); assert.equal((html.match(/<li>/g) || []).length, 6);
  assert.ok(report.every(x => html.includes(`<li>${esc(x.note)} <small>${x.passages.join(', ')}</small></li>`)), 'every row with its note and its lines, escaped');
  assert.equal(journeyDraftUI.draftNotesHTML({...c1, note: ''}, false), '', 'a brief draft without a note shows neither');
  pass('D12 import report: the draft lists the six elements no chapter drafts (two business capabilities, the gap, two plateaus, the work package), each with its mapping (transition note, import note), its note and the model lines it came from, on every model draft; the Chapter 1 and Chapter 6 notes say so');
});
section('D12 identity', () => {
  const p = P12, model = M12;
  // With an adopted, released and current Enterprise capability of the same name, the business capability is named
  // against that governed identity; a withdrawn or retired one is never named.
  const entry = {id: 'CAT-EC-1', kind: 'standard', title: 'Payment posting', content: 'Posting a customer payment to the ledger.', status: 'approved', asset: {type: 'Enterprise capability', owner: 'Payments', version: '1.0', lifecycle: 'Active', boundary: '', interfaceReference: '', failureDomain: ''}, organization: {id: 'ORG-1', entryId: 'cap-posting', releaseId: 'REL-1', title: 'Group architecture'}};
  entry.organization.assurance = {eligible: true, latestDefinitionHash: enterpriseDefinition(entry), latestStatus: 'approved'};
  const withEntry = e => { const q = structuredClone(p); q.workbench = {...(q.workbench || {}), catalogue: [...(q.workbench?.catalogue || []), e]}; return q; };
  const adopted = draftChapter(withEntry(entry), 1, {model}).model.notMapped, cap = adopted.find(x => x.name === 'Payment posting');
  assert.deepEqual([cap.mapping, cap.identity, cap.entryId], ['enterprise-capability', 'enterprise:ORG-1:cap-posting', 'CAT-EC-1'], 'a business capability is named against the adopted Enterprise capability of the same name');
  assert.match(cap.note, /enterprise:ORG-1:cap-posting/); assert.match(cap.note, /not a Chapter 6 technology capability/);
  assert.equal(adopted.find(x => x.name === 'Customer servicing').mapping, 'import-note', 'one without a matching adopted identity stays an import note');
  for (const [label, change] of [['withdrawn', e => { e.organization.assurance.latestStatus = 'withdrawn'; }], ['retired', e => { e.asset.lifecycle = 'Retired'; }], ['unreleased', e => { e.status = 'draft'; }], ['not an Enterprise capability', e => { e.asset.type = 'Shared service'; }], ['changed since its release', e => { e.content += ' Changed.'; }]]) {
    const e = structuredClone(entry); change(e);
    assert.equal(draftChapter(withEntry(e), 1, {model}).model.notMapped.find(x => x.name === 'Payment posting').mapping, 'import-note', label + ': an entry a person could not link is never named');
  }
  pass('D12 identity: a business capability is named against an adopted, released and current Enterprise capability of the same name (enterprise:<organisation>:<entry>); a withdrawn, retired, unreleased, changed or non-capability entry is never named, and the capability stays an import note');
});
section('D12 reviewed identity links', () => {
  // A link a person reviewed under the old reading (model-rules-1 read the Gap as a requirement, so a requirement drafted
  // from it could be linked with source kind "requirement") is not carried silently into the new reading: the revision
  // preview reports the kind change and asks for an explicit unlink and a reviewed relink; nothing is rewritten.
  assert.equal(MODEL_RULES, 'model-rules-2', 'the reading rules are versioned: model-rules-1 read a Gap as a requirement and a Capability as a technology capability');
  const src = P12.coauthoring.sources.find(s => s.kind === 'model'), p0 = applyCommand(P12, {type: 'artefact', payload: {type: 'requirement', title: 'Replace posting engine', description: 'Drafted from the gap before rc.10.73.42.'}}, at).document;
  const req = p0.artefacts.find(a => a.title === 'Replace posting engine'), p = structuredClone(p0);
  p.coauthoring.sources.find(s => s.id === src.id).modelBindings = [{key: 'element:a-gap', objectId: req.id, command: 'artefact', fields: {title: 'name', description: 'description'}, sourceKind: 'requirement', sourceValues: {title: 'Replace posting engine', description: ''}, localValues: {title: req.title, description: req.description}}];
  const q = modelRevisionPreview(p, {sourceId: src.id, incoming: {text: ARCHIMATE, name: 'core-r2.xml'}}), row = q.rows.find(r => r.objectId === req.id);
  assert.deepEqual([row.state, row.reason], ['type-changed', 'The external kind no longer matches the reviewed identity link. Keep the AIW record until an explicit unlink and reviewed relink.'], 'the link made under the old reading asks for review');
  assert.deepEqual(p.artefacts, p0.artefacts, 'and no record is changed by reading it');
  // The person unlinks it. A gap is no requirement, so the reviewed relink of the gap onto the requirement is refused
  // (review round 2); the record can be relinked to an element that is a requirement, and that link names its kind.
  const bind = (doc, raw) => applyModelReconciliation(doc, {type: 'evidence.model-bind', payload: {...raw, stamp: modelBindingPreview(doc, raw).stamp, reviewed: true, reason: 'Reviewed the gap under the new reading.'}}, at, 'architect-a').document;
  const next = bind(p, {sourceId: src.id, key: 'element:a-gap', objectId: req.id, remove: true}), saved = doc => doc.coauthoring.sources.find(s => s.id === src.id);
  assert.deepEqual([saved(next).modelBindings, saved(next).modelIdentityHistory.at(-1).event], [[], 'Unlinked'], 'the explicit unlink removes the link made under the old reading');
  assert.throws(() => modelBindingPreview(next, {sourceId: src.id, key: 'element:a-gap', objectId: req.id}), /^Error: A gap is no requirement: it stays a transition note in the import report\.$/, 'the gap cannot be relinked onto the requirement');
  assert.equal(modelRevisionPreview(next, {sourceId: src.id, incoming: {text: ARCHIMATE, name: 'core-r2.xml'}}).rows.find(r => r.objectId === req.id), undefined, 'no link is left to compare');
  const relinked = bind(next, {sourceId: src.id, key: 'element:a-req', objectId: req.id});
  assert.equal(saved(relinked).modelBindings[0].sourceKind, 'requirement', 'relinked to a requirement element, the reviewed link names its kind');
  assert.equal(modelRevisionPreview(relinked, {sourceId: src.id, incoming: {text: ARCHIMATE, name: 'core-r2.xml'}}).rows.find(r => r.objectId === req.id).state, 'unchanged');
  pass('D12 reviewed identity links: the reading rules are now model-rules-2; a link a person reviewed under model-rules-1 (a Gap linked as a requirement) is reported as a kind change for an explicit unlink, nothing is rewritten; the gap cannot be relinked onto the requirement, and a reviewed relink to a requirement element names its kind');
});

// ---------------------------------------------------------------- D16 · BPMN branches with no condition, and the default flow
const BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="d-unlock" targetNamespace="urn:test">
  <process id="p-unlock" name="Unlock a bike">
    <startEvent id="s1" name="Unlock requested"/>
    <task id="t1" name="Validate the member"/>
    <exclusiveGateway id="g1" name="Member valid?" default="f-not"/>
    <task id="t2" name="Release the lock"/>
    <task id="t3" name="Refuse the unlock"/>
    <task id="t4" name="Ask for a new card"/>
    <endEvent id="e1" name="Unlock handled"/>
    <sequenceFlow id="f1" sourceRef="s1" targetRef="t1"/>
    <sequenceFlow id="f2" sourceRef="t1" targetRef="g1"/>
    <sequenceFlow id="f-ok" name="Valid" sourceRef="g1" targetRef="t2"><conditionExpression xsi:type="tFormalExpression">member.valid == true</conditionExpression></sequenceFlow>
    <sequenceFlow id="f-not" name="Not valid" sourceRef="g1" targetRef="t3"/>
    <sequenceFlow id="f-exp" name="Card expired" sourceRef="g1" targetRef="t4"/>
    <sequenceFlow id="f3" sourceRef="t2" targetRef="e1"/>
    <sequenceFlow id="f4" sourceRef="t3" targetRef="e1"/>
    <sequenceFlow id="f5" sourceRef="t4" targetRef="e1"/>
  </process>
</definitions>`;
const P16 = project('Bike unlock', 'unlock.bpmn', BPMN), M16 = modelOf(P16, BPMN, 'unlock.bpmn');
const FLOWS16 = draftChapter(P16, 1, {model: M16}).records.flatMap(r => r.extras || []).filter(c => c.type === 'process.transition');
const DOC16 = draftJourney(P16, {brief: null, model: M16, upTo: 1, at}).document, GW16 = DOC16.processModel.elements.find(e => e.title === 'Member valid?');
const t16 = (doc, label) => doc.processModel.transitions.find(x => x.label === label) || assert.fail('no flow ' + label);
const gate16 = doc => processFindings(doc).filter(f => f.code === 'PROC-GATEWAY' && f.objectId === GW16.id);
section('D16 adoption', () => {
  const model = M16, flows = FLOWS16, flowRel = name => model.relationships.find(r => r.label === name) || assert.fail('no flow ' + name);
  assert.equal(flowRel('Not valid').attrs.isDefault, true, 'the reader keeps the gateway\'s default flow');
  const cmd = label => flows.find(c => c.payload.label === label)?.payload || assert.fail('no drafted flow ' + label);
  assert.ok(flows.every(c => !/No condition stated in the model/.test(c.payload.condition)), 'no drafted flow carries placeholder words for a condition');
  assert.deepEqual([cmd('Valid').condition, cmd('Valid').default], ['member.valid == true', undefined], 'a stated condition is adopted as stated');
  assert.deepEqual([cmd('Not valid').condition, cmd('Not valid').default, cmd('Not valid').open], ['', true, undefined], 'the default flow is adopted as the default path, with no condition and no open question');
  assert.deepEqual([cmd('Card expired').condition, cmd('Card expired').default, cmd('Card expired').open?.condition?.state], ['', undefined, 'open-question'], 'a branch with no condition is adopted with an open condition');
  assert.match(cmd('Card expired').open.condition.question, /Card expired/);
  assert.equal(flows.find(c => c.payload.from.endsWith && c.payload.label.startsWith('Validate the member'))?.payload.condition, 'Follows when Validate the member completes.', 'a plain sequence flow that leaves no gateway keeps its "follows" condition');
  // Applied as the person's commit applies them.
  const doc = DOC16, t = label => t16(doc, label);
  assert.deepEqual([t('Not valid').default, t('Not valid').condition, t('Card expired').condition, t('Card expired').open?.condition?.state, t('Valid').default], [true, '', '', 'open-question', undefined], 'the process model keeps the default path and the open condition');
  const gw = GW16, gate = gate16(doc);
  assert.equal(gate.length, 1, 'PROC-GATEWAY flags the gateway: ' + JSON.stringify(processFindings(doc)));
  assert.match(gate[0].detail, /1 of its 3 outgoing flows has no condition: Card expired\./, 'only the unconditioned branch is flagged; the default path is exempt: ' + gate[0].detail);
  assert.match(processMarkdown(doc), /Not valid; default path; condition: none recorded/, 'the default path is shown as the default');
  assert.match(processMarkdown(doc), /Card expired; condition: open: What must be true for Card expired to be taken\?/, 'the open condition is printed as the question it is');
  // Committed as the journey draft commits them, through the reviewed workspace change, the flag and the open condition stay.
  const bare = structuredClone(doc); bare.processModel.transitions = bare.processModel.transitions.filter(x => !['Not valid', 'Card expired'].includes(x.label));
  const commands = ['Not valid', 'Card expired'].map(label => { const {id, origin, confirmed, revision, at: when, ...payload} = t(label); return {type: 'process.transition', payload}; });
  const q = previewWorkingChange(bare, commands), viaChange = applyWorkbenchCommand(bare, {type: 'workspace.apply', payload: {commands, stamp: q.stamp, reviewed: true, reason: 'Journey draft accepted: the process flows.'}}, at, 'architect-a').document;
  assert.deepEqual([t16(viaChange, 'Not valid').default, t16(viaChange, 'Card expired').open?.condition?.state, t16(viaChange, 'Card expired').condition], [true, 'open-question', ''], 'through the reviewed workspace change the default path and the open condition are kept');
  // A person states the condition: the open question goes and the finding clears.
  const stated = applyProcessCommand(doc, {type: 'process.transition', payload: {...t('Card expired'), condition: 'card.expired == true'}}, at).document;
  assert.equal(stated.processModel.transitions.find(x => x.label === 'Card expired').open, undefined, 'a stated condition clears its open question');
  assert.deepEqual(processFindings(stated).filter(f => f.code === 'PROC-GATEWAY' && f.objectId === gw.id), [], 'with every branch conditioned or default, the gateway passes');
  // A save that leaves `default` out keeps the default path; a save that sends false clears it.
  assert.equal(applyProcessCommand(stated, {type: 'process.transition', payload: {id: t('Not valid').id, from: t('Not valid').from, to: t('Not valid').to, label: 'Not valid', condition: ''}}, at).document.processModel.transitions.find(x => x.label === 'Not valid').default, true, 'a save without the flag keeps the default path');
  const cleared = applyProcessCommand(stated, {type: 'process.transition', payload: {...t('Not valid'), default: false}}, at).document;
  assert.equal(cleared.processModel.transitions.find(x => x.label === 'Not valid').default, undefined);
  assert.match(processFindings(cleared).find(f => f.code === 'PROC-GATEWAY' && f.objectId === gw.id)?.detail || '', /Not valid/, 'without the default flag an unconditioned branch is flagged again');
  pass('D16 adoption: the default flow is adopted as the default path and a branch with no condition with an open condition (no placeholder words); applied, PROC-GATEWAY flags only the unconditioned branch, the default path is exempt and printed as the default, and stating the condition clears the open question and the finding; a save without the flag keeps it');
});
section('D16 default rules', () => {
  const doc = DOC16, gw = GW16, t = label => t16(doc, label);
  // The rules of the default path: a sequence flow out of a gateway, one per gateway; two are an error.
  const step = title => doc.artefacts.find(a => a.type === 'journey' && a.title === title).id;
  assert.throws(() => applyProcessCommand(doc, {type: 'process.transition', payload: {from: step('Release the lock'), to: step('Refuse the unlock'), label: 'Relock', condition: '', default: true}}, at), /Only a path out of an exclusive or inclusive gateway can be its default\./, 'a flow that leaves no gateway cannot be a default path');
  assert.equal(applyProcessCommand(doc, {type: 'process.transition', payload: {from: step('Release the lock'), to: step('Refuse the unlock'), label: 'Relock', condition: ''}}, at).document.processModel.transitions.at(-1).default, undefined, 'without the flag the same flow is saved');
  // A second default path out of the same gateway is a PROC-GATEWAY error until one is cleared.
  const two = applyProcessCommand(doc, {type: 'process.transition', payload: {...t('Card expired'), default: true}}, at).document;
  assert.ok(gate16(two).some(f => f.level === 'error' && f.id === 'PROC-GATEWAY:' + gw.id + ':default' && f.title === 'Keep one default path out of Member valid?' && f.detail === '2 default paths: Not valid, Card expired.'), 'a gateway with two default paths is an error: ' + JSON.stringify(gate16(two)));
  assert.ok(!gate16(doc).some(f => f.level === 'error' && /default paths/.test(f.detail)), 'one default path raises no such error');
  const par = structuredClone(doc); par.processModel.elements.find(e => e.id === gw.id).gatewayType = 'parallel'; delete t16(par, 'Not valid').default;
  assert.throws(() => applyProcessCommand(par, {type: 'process.transition', payload: {...t16(par, 'Valid'), default: true}}, at), /exclusive or inclusive gateway/, 'a parallel gateway takes every path: it has no default path');
  pass('D16 default rules: only a sequence flow out of an exclusive or inclusive gateway can be its default path (a parallel gateway takes every path), and a gateway has one: a second is a PROC-GATEWAY error');
});
section('D16 retired words', () => {
  const doc = DOC16, gw = GW16;
  // A document written before this release keeps the retired placeholder words: they read as an open condition.
  const old = structuredClone(doc), legacy = old.processModel.transitions.find(x => x.label === 'Card expired');
  legacy.condition = 'No condition stated in the model for Card expired.'; delete legacy.open;
  const older = old.processModel.transitions.find(x => x.label === 'Not valid'); older.condition = 'No condition stated in the model for Not valid.'; delete older.default;
  assert.match(processFindings(old).find(f => f.code === 'PROC-GATEWAY' && f.objectId === gw.id)?.detail || '', /2 of its 3 outgoing flows have no condition: Not valid, Card expired\./, 'the retired placeholder words never satisfy PROC-GATEWAY');
  pass('D16 retired words: a document written with the retired "No condition stated in the model for …" words reads them as an open condition, so PROC-GATEWAY flags them until a person states the condition');
});
section('D16 editor', () => {
  // The field kit and the process editor carry the flag.
  assert.deepEqual(fieldsFor('process.transition').find(f => f.name === 'default') && {kind: fieldsFor('process.transition').find(f => f.name === 'default').kind}, {kind: 'checkbox'}, 'the flow editor has a default-path checkbox');
  assert.equal(processTransitionCommand({from: 'a', to: 'b', label: 'x', default: 'on'}).payload.default, true, 'the editor sends the ticked box as the flag');
  assert.equal(processTransitionCommand({from: 'a', to: 'b', label: 'x'}).payload.default, false, 'and an unticked box as false');
  assert.match(processDetailsHTML(DOC16, {edgeId: t16(DOC16, 'Not valid').id}), /The default path out of its gateway/, 'the path\'s details say it is the default path');
  assert.match(processDetailsHTML(DOC16, {edgeId: t16(DOC16, 'Card expired').id}), /Condition: open: What must be true for Card expired to be taken\?/, 'and show an open condition as the question it is');
  pass('D16 editor: the flow editor carries a default-path checkbox, sent as the flag; the path\'s details show the default path and an open condition as its question');
});
section('D16 round trip', () => {
  const doc = DOC16;
  // The BPMN export writes the default back, and the reader reads it again.
  const D = notationDiagram(doc, 'process'), L = notationLayout(D, {arrangement: 'lanes'}), out = diagramCode('bpmn', D, L, {project: doc}), back = interpretModel(out.document, {name: 'again.bpmn'});
  assert.match(out.document, /<exclusiveGateway [^>]*default="/, 'the exported gateway names its default flow');
  assert.equal(back.relationships.filter(r => r.attrs.isDefault).map(r => r.label).join(), 'Not valid', 'read back, the default flow is the one the model declared');
  pass('D16 round trip: the BPMN export writes the gateway\'s default flow, and reading the export back finds the same default path');
});

// ---------------------------------------------------------------- review round 2
const JOIN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="d-trip" targetNamespace="urn:test">
  <process id="p-trip" name="End a trip">
    <startEvent id="s1" name="Trip ending"/>
    <task id="t0" name="Check the bike"/>
    <exclusiveGateway id="g1" name="Docked?"/>
    <task id="t1" name="Lock at the dock"/>
    <task id="t2" name="Lock in the street"/>
    <exclusiveGateway id="g2" name="Locked"/>
    <task id="t3" name="Close the trip"/>
    <inclusiveGateway id="g3" name="Notify"/>
    <task id="t4" name="Email the receipt"/>
    <task id="t5" name="Push the receipt"/>
    <inclusiveGateway id="g4" name="Notified"/>
    <endEvent id="e1" name="Trip closed"/>
    <sequenceFlow id="f1" sourceRef="s1" targetRef="t0"/>
    <sequenceFlow id="f2" sourceRef="t0" targetRef="g1"/>
    <sequenceFlow id="f-dock" name="At a dock" sourceRef="g1" targetRef="t1"><conditionExpression xsi:type="tFormalExpression">bike.docked</conditionExpression></sequenceFlow>
    <sequenceFlow id="f-street" name="In the street" sourceRef="g1" targetRef="t2"/>
    <sequenceFlow id="f3" sourceRef="t1" targetRef="g2"/>
    <sequenceFlow id="f4" sourceRef="t2" targetRef="g2"/>
    <sequenceFlow id="f-close" name="Then close" sourceRef="g2" targetRef="t3"/>
    <sequenceFlow id="f5" sourceRef="t3" targetRef="g3"/>
    <sequenceFlow id="f-mail" name="By email" sourceRef="g3" targetRef="t4"><conditionExpression xsi:type="tFormalExpression">member.email</conditionExpression></sequenceFlow>
    <sequenceFlow id="f-push" name="By push" sourceRef="g3" targetRef="t5"><conditionExpression xsi:type="tFormalExpression">member.app</conditionExpression></sequenceFlow>
    <sequenceFlow id="f6" sourceRef="t4" targetRef="g4"/>
    <sequenceFlow id="f7" sourceRef="t5" targetRef="g4"/>
    <sequenceFlow id="f-end" name="All sent" sourceRef="g4" targetRef="e1"/>
  </process>
</definitions>`;
section('D16 merge', () => {
  // A merge (join) gateway has one way out: its flow is no branch, so it gets no condition and no open question; the
  // split before it still asks for the condition of its unconditioned branch.
  const p = project('Trip end', 'trip.bpmn', JOIN), model = modelOf(p, JOIN, 'trip.bpmn'), flows = draftChapter(p, 1, {model}).records.flatMap(r => r.extras || []).filter(c => c.type === 'process.transition');
  const cmd = label => flows.find(c => c.payload.label === label)?.payload || assert.fail('no drafted flow ' + label);
  for (const label of ['Then close', 'All sent']) assert.deepEqual([cmd(label).condition, cmd(label).open, cmd(label).default], ['', undefined, undefined], label + ': the one flow out of a merge gets no condition and no open question');
  assert.deepEqual([cmd('In the street').condition, cmd('In the street').open?.condition?.state], ['', 'open-question'], 'the unconditioned branch of the split still has an open condition');
  assert.deepEqual([cmd('At a dock').condition, cmd('By email').condition, cmd('By push').condition], ['bike.docked', 'member.email', 'member.app']);
  const doc = draftJourney(p, {brief: null, model, upTo: 1, at}).document, md = processMarkdown(doc), gw = title => doc.processModel.elements.find(e => e.title === title).id;
  for (const label of ['Then close', 'All sent']) { assert.equal(t16(doc, label).open, undefined, label + ': adopted with no open condition'); assert.match(md, new RegExp(label + '; condition: none recorded\\.'), label + ': the SDD records no condition'); assert.doesNotMatch(md, new RegExp(label + '[^\\n]*open:'), label + ': and asks no question'); }
  assert.match(processDetailsHTML(doc, {edgeId: t16(doc, 'Then close').id}), /Then close/); assert.doesNotMatch(processDetailsHTML(doc, {edgeId: t16(doc, 'Then close').id}), /Condition: open/, 'the path details ask no question for the merge flow');
  const gate = processFindings(doc).filter(f => f.code === 'PROC-GATEWAY');
  assert.deepEqual(gate.map(f => [f.objectId, f.detail]), [[gw('Docked?'), '1 of its 2 outgoing flows has no condition: In the street. An exclusive gateway chooses by conditions.']], 'only the split is flagged, for its one unconditioned branch: ' + JSON.stringify(gate));
  pass('D16 merge: the one flow out of an exclusive or inclusive merge is no branch, so it is adopted with no condition and no open question and the SDD and the path details ask none; the split before it still asks for its unconditioned branch');
});
section('D16 stale default', () => {
  // A default flag left on a flow out of a gateway that no longer chooses is not rewritten silently: PROC-GATEWAY asks
  // the person to clear it, and the BPMN export never writes default= on a gateway that has none (BPMN 2.0 allows it on
  // exclusive, inclusive and complex gateways and on activities).
  const doc = DOC16, gw = doc.processModel.elements.find(e => e.id === GW16.id), notValid = t16(doc, 'Not valid');
  const exported = d => { const D = notationDiagram(d, 'process'); return diagramCode('bpmn', D, notationLayout(D, {arrangement: 'lanes'}), {project: d}).document; };
  const stale = f => f.id === 'PROC-GATEWAY:' + gw.id + ':default' && f.level === 'error';
  for (const [label, change] of [['parallel', {gatewayType: 'parallel'}], ['event', {gatewayType: 'event'}], ['task', {kind: 'task', gatewayType: ''}]]) {
    const q = applyProcessCommand(doc, {type: 'process.element', payload: {...gw, ...change}}, at).document;
    assert.equal(t16(q, 'Not valid').default, true, label + ': the stored flag is not rewritten');
    const f = processFindings(q).filter(stale);
    assert.equal(f.length, 1, label + ': PROC-GATEWAY asks to clear the default path: ' + JSON.stringify(processFindings(q).filter(x => x.code === 'PROC-GATEWAY')));
    assert.deepEqual([f[0].code, f[0].objectId, f[0].title], ['PROC-GATEWAY', gw.id, 'Clear the default path out of Member valid?']);
    assert.match(f[0].detail, /Not valid/); assert.match(f[0].detail, /only an exclusive or inclusive gateway has a default path/i);
    const xml = exported(q);
    assert.doesNotMatch(xml, / default="/, label + ': the export writes no default'); if (label !== 'task') assert.match(xml, new RegExp(`<${label === 'event' ? 'eventBased' : label}Gateway [^>]*name="Member valid\\?"`));
    const cleared = applyProcessCommand(q, {type: 'process.transition', payload: {...t16(q, 'Not valid'), default: false}}, at).document;
    assert.equal(processFindings(cleared).filter(stale).length, 0, label + ': cleared by the person, the finding goes');
  }
  assert.equal(processFindings(doc).filter(stale).length, 0, 'an exclusive gateway with one default path raises no such finding'); assert.equal(notValid.default, true);
  pass('D16 stale default: a default flag left on a flow out of a gateway made parallel or event-based, or turned into a task, is kept as stored and raised as a PROC-GATEWAY error until the person clears it; the BPMN export writes default= only on an exclusive or inclusive gateway');
});
section('D16 open conditions in print and export', () => {
  const doc = DOC16, md = processMarkdown(doc);
  // The SDD prints an open condition as open (the question once, no doubled stop), and placeholder words never.
  assert.match(md, /Card expired; condition: open: What must be true for Card expired to be taken\? Source:/, 'the open question is printed once, without a doubled stop');
  assert.doesNotMatch(md, /; condition: [^\n]*[.?]\. Source:/, 'no condition line ends with a doubled stop');
  assert.match(md, /; condition: Follows when Validate the member completes\. Source:/, 'a stated condition that ends with a stop keeps one');
  const old = structuredClone(doc), legacy = old.processModel.transitions.find(x => x.label === 'Card expired');
  legacy.condition = 'No condition stated in the model for Card expired.'; delete legacy.open;
  const oldMd = processMarkdown(old);
  assert.doesNotMatch(oldMd, /No condition stated/, 'the retired words are never printed as a condition');
  assert.match(oldMd, /Card expired; condition: open: condition not stated\. Source:/, 'they print as an open condition');
  const details = processDetailsHTML(old, {edgeId: legacy.id});
  assert.match(details, /Condition: open: condition not stated/, 'and the path details show them as open'); assert.doesNotMatch(details, /No condition stated/);
  // The notation never carries open or retired words as a qualifier, so the BPMN export writes no conditionExpression for them.
  const D = notationDiagram(old, 'process'), xml = diagramCode('bpmn', D, notationLayout(D, {arrangement: 'lanes'}), {project: old}).document;
  assert.equal(D.edges.find(e => e.id === legacy.id).qualifier, '', 'an open condition is no qualifier');
  assert.equal(D.edges.find(e => e.id === t16(old, 'Valid').id).qualifier, 'member.valid == true', 'a stated one still is');
  assert.doesNotMatch(xml, /No condition stated/, 'the export never writes the retired words');
  assert.match(xml, /<conditionExpression xsi:type="tFormalExpression">member\.valid == true<\/conditionExpression>/);
  // A BPMN file exported before rc.10.73.42 carries the clipped words as a conditionExpression; read again, they are open.
  const clipped = BPMN.replace('<sequenceFlow id="f-exp" name="Card expired" sourceRef="g1" targetRef="t4"/>', '<sequenceFlow id="f-exp" name="Card expired" sourceRef="g1" targetRef="t4"><conditionExpression xsi:type="tFormalExpression">No condition stated in …</conditionExpression></sequenceFlow>');
  assert.notEqual(clipped, BPMN);
  const pc = project('Bike unlock again', 'again.bpmn', clipped), back = draftJourney(pc, {brief: null, model: modelOf(pc, clipped, 'again.bpmn'), upTo: 1, at}).document, gw = back.processModel.elements.find(e => e.title === 'Member valid?');
  assert.match(processFindings(back).find(f => f.code === 'PROC-GATEWAY' && f.objectId === gw.id)?.detail || '', /1 of its 3 outgoing flows has no condition: Card expired\./, 'the clipped words never satisfy PROC-GATEWAY');
  assert.doesNotMatch(processMarkdown(back), /No condition stated/);
  pass('D16 open conditions in print and export: the SDD prints an open or retired condition as open (once, no doubled stop), the notation and the BPMN export never carry it as a condition, and the words a pre-rc42 export clipped read as open again');
});
section('D12 reviewed links refused', () => {
  // A reviewed identity link cannot bring the misfiling back: a business capability is no Chapter 6 technology capability.
  const src = P12.coauthoring.sources.find(s => s.kind === 'model'), p = structuredClone(P12);
  p.technology = {...(p.technology || {}), capabilities: [...(p.technology?.capabilities || []), {id: 'TCAP-rc42', title: 'Payment posting', purpose: 'Drafted from the business capability before rc.10.73.42.'}]};
  assert.throws(() => modelBindingPreview(p, {sourceId: src.id, key: 'element:a-cap', objectId: 'TCAP-rc42'}), /^Error: A business capability is no Chapter 6 technology capability: link its Enterprise capability, or keep it in the import report\.$/);
  assert.throws(() => modelBindingPreview(p, {sourceId: src.id, key: 'element:a-func', objectId: 'TCAP-rc42'}), /business capability is no Chapter 6/);
  assert.equal(modelBindingPreview(p, {sourceId: src.id, key: 'element:a-api', objectId: 'TCAP-rc42'}).binding.sourceKind, byName(M12, 'Posting API').kind, 'the application service can still be linked to the technology capability');
  pass('D12 reviewed links refused: a reviewed identity link of a business Capability or BusinessFunction onto a Chapter 6 technology capability is refused (and of a gap onto a requirement, above); other elements still link');
});

if (failed.length) { console.error(`\nrc42 G6 intake and import: ${failed.length} failed (${failed.join('; ')}), ${checks.length} passed.`); process.exitCode = 1; }
else console.log(`\nrc42 G6 intake and import: ${checks.length} checks passed.`);
