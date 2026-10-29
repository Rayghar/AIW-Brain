// Round 12 (D-07, D-08, DM-02, DM-07, DM-09 to DM-14, DM-16 to DM-19, DM-21, DM-22, DM-24, DM-25, DM-27): the records
// the reference SDD needs, as their commands save them. Decisions with category, stakeholders, dependencies, licensing,
// skills and documentation, alternatives with why they were not chosen; personas and user categories; outcomes with a
// measure; business rules; journeys; a person's requirement attributes; allocation roles; component properties,
// solution and container; requirement groups linked from every chapter and read one way; the record lifecycle; and the
// component specification and quality-driver interactions F's SDD reads. Every save patches its record and refuses
// instead of cutting. Synthetic and reference-journey content only.
import assert from 'node:assert/strict';
import {seedProject, applyCommand, findings, journeysOf, priorityBasisOf, USER_CATEGORIES} from './public/requirements-domain.js';
import {applyRequirementsCommand, groupLinks} from './public/requirement-commands.js';
import {requirementGroups, groupMembers, groupSummary, ruleText, groupById} from './public/requirement-groups.js';
import {linkedRequirementIds, linksRequirement} from './public/requirement-links.js';
import {applyDecisionCommand, decisionFindings, exportDecisionsMarkdown, decisionCategory, DECISION_LIMITS} from './public/decisions-domain.js';
import {applyLogicalCommand, connectionCode, mappingRole, exportLogicalMarkdown} from './public/logical-domain.js';
import {withRealisation, applyRealisationCommand, realisationFindings, componentContainer, exportRealisationMarkdown, components} from './public/realisation-domain.js';
import {withTechnologyRealisation} from './public/technology-realisation-domain.js';
import {applyRecordLifecycleCommand, proposalFinding, retiredRecords, retirable, COLLECTIONS} from './public/record-lifecycle.js';
import {reasoningFor, componentSpec, qualityDriverInteractions} from './public/design-spec.js';
import {reviewTrace, withFinalReview} from './public/review-domain.js';
import {applyCanonical, applyRecordCommand, STAGED_COMMANDS} from './public/canonical-command.js';
import {withRuntime} from './public/runtime-domain.js';
import {architectureModel} from './public/architecture-model.js';
import {needsFor} from './public/technology-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {previewWorkingChange, applyWorkbenchCommand} from './public/workbench-domain.js';

const pass = m => console.log('PASS ' + m);
const at = '2026-10-08T09:00:00.000Z';
const refuses = (fn, re) => assert.throws(fn, e => re.test(e.message), 'refused with ' + re);
const ch1 = (p, type, payload) => applyCommand(p, {type, payload}, at).document;
const ch3 = (p, type, payload) => applyDecisionCommand(p, {type: 'decision.' + type, payload}, at).document;
const ch4 = (p, type, payload) => applyLogicalCommand(p, {type: 'logical.' + type, payload}, at).document;
const ch5 = (p, type, payload) => applyRealisationCommand(p, {type: 'realisation.' + type, payload}, at).document;
const groups = (p, type, payload) => applyRequirementsCommand(p, {type: 'requirements.' + type, payload}, at, 'tester').document;

const base = withTechnologyRealisation(withRealisation(seedProject()));
const reqs = base.artefacts.filter(a => a.type === 'requirement').map(a => a.id);
const withGroup = groups(base, 'group', {title: 'Posting and settlement', kind: 'theme', memberIds: [reqs[2], reqs[3]]});
const gid = withGroup.requirementGroups.records.at(-1).id;

// 1. Decisions (D-07, DM-11): what the SDD prints for each one, saved by patch.
{
  const d = base.decisions.records[0], stk = base.artefacts.find(a => a.type === 'stakeholder').id, act = base.artefacts.find(a => a.type === 'actor').id;
  let p = ch3(withGroup, 'save', {id: d.id, category: 'structural', stakeholderIds: [stk, act], stakeholderNote: 'Operations run it.', dependsOn: [base.decisions.records[1].id], dependencies: 'Needs the ledger decision.', licensing: 'Open source.', skills: 'Event modelling.', documentation: 'ADR folder.', requirementGroupIds: [gid]});
  let r = p.decisions.records[0];
  assert.deepEqual([r.category, r.stakeholderIds, r.stakeholderNote, r.dependsOn, r.licensing, r.requirementGroupIds], ['structural', [stk, act], 'Operations run it.', [base.decisions.records[1].id], 'Open source.', [gid]]);
  assert.equal(r.context, d.context, 'the context left out is kept'); assert.deepEqual(r.requirementIds, d.requirementIds, 'the links left out are kept');
  // Saved again unchanged: the revision stays, so nothing that reads it is marked changed.
  const again = applyDecisionCommand(p, {type: 'decision.save', payload: {id: d.id, category: 'structural'}}, at).document;
  assert.equal(again.decisions.records[0].revision, r.revision); assert.equal(again.decisions.version, p.decisions.version);
  refuses(() => ch3(p, 'save', {id: d.id, dependsOn: [d.id]}), /cannot depend on itself/);
  refuses(() => ch3(p, 'save', {id: d.id, stakeholderIds: ['STK-999']}), /Choose existing stakeholders or actors: STK-999 is not in this project/);
  refuses(() => ch3(p, 'save', {id: d.id, category: 'fancy'}), /Choose a decision category, or leave it not stated/);
  refuses(() => ch3(p, 'save', {id: d.id, context: 'x'.repeat(4001)}), /holds at most 4,000 characters; this one has 4,001/);
  p = ch3(p, 'save', {id: d.id, category: null}); assert.equal(decisionCategory(p.decisions.records[0]), '', 'a category may be not stated');
  // An alternative keeps why it was not chosen, where it would be realised, and its source; up to 12 per question.
  const alt = r.alternatives[0], comp = components(base)[0].id;
  p = ch3(p, 'alternative', {id: d.id, alternativeId: alt.id, rejectionReason: 'It replays payments blindly.', componentIds: [comp], source: 'Workshop notes'});
  const a2 = p.decisions.records[0].alternatives[0];
  assert.deepEqual([a2.rejectionReason, a2.componentIds, a2.source, a2.title, a2.summary], ['It replays payments blindly.', [comp], 'Workshop notes', alt.title, alt.summary]);
  refuses(() => ch3(p, 'alternative', {id: d.id, alternativeId: alt.id, relationships: Array.from({length: 13}, () => ({from: 'a', to: 'b', label: 'c'}))}), /at most 12 relationships for one alternative; 13 were sent/);
  let many = p; for (let i = p.decisions.records[0].alternatives.length; i < DECISION_LIMITS.alternatives; i++) many = ch3(many, 'alternative', {id: d.id, title: 'Option ' + i, summary: 'S', benefits: 'B', costs: 'C', consequences: 'Q'});
  assert.equal(many.decisions.records[0].alternatives.length, 12); refuses(() => ch3(many, 'alternative', {id: d.id, title: 'One more'}), /Compare up to 12 alternatives/);
  // A driver added to the decision gains an entry in every alternative's comparison; one removed loses it.
  const extra = base.quality.drivers.find(q => !d.driverIds.includes(q.id)).id;
  p = ch3(p, 'save', {id: d.id, driverIds: {add: [extra]}}); assert.ok(p.decisions.records[0].alternatives.every(a => a.assessments[extra]?.effect === 'unknown'));
  p = ch3(p, 'save', {id: d.id, driverIds: {remove: [extra]}}); assert.ok(p.decisions.records[0].alternatives.every(a => !(extra in a.assessments)));
  const md = exportDecisionsMarkdown(p);
  assert.match(md, /Stakeholder records: STK-\d+ · [^;]+; ACT-\d+/); assert.match(md, /Depends on: ADR-002/); assert.match(md, /Licensing: Open source\./); assert.match(md, /Why not chosen: It replays payments blindly\./);
  pass('a decision keeps its category (or none), stakeholder records and note, the decisions it depends on, licensing, skills, documentation and groups; an unchanged save keeps its revision; an alternative keeps why it was not chosen, its components and source; 12 alternatives; the comparison follows the drivers; each refusal names what was sent');
}

// 2. Chapter 1 (D-08, DM-07, DM-12, DM-18, DM-19, DM-21, DM-25, DM-27): personas, rules, outcomes, journeys, attributes.
{
  let p = ch1(withGroup, 'artefact', {type: 'actor', title: 'Branch teller', description: 'Serves customers at the counter.', category: 'staff-role', role: 'Teller', motivations: 'Short queues.', wishes: 'One screen.', concerns: 'Errors.', usage: 'All day.', benefits: 'Fewer calls.', requirementGroupIds: [gid]});
  const actor = p.artefacts.at(-1);
  assert.deepEqual([actor.category, actor.role, actor.usage, actor.requirementGroupIds, actor.priority], ['staff-role', 'Teller', 'All day.', [gid], ''], 'an actor holds a persona, a category and groups; its priority is not stated');
  assert.ok(USER_CATEGORIES.some(([k]) => k === 'regulator'));
  refuses(() => ch1(p, 'artefact', {id: actor.id, category: 'alien'}), /Choose a category/);
  // An update that leaves fields out keeps them; links are taken on an update too.
  p = ch1(p, 'artefact', {id: actor.id, title: 'Branch teller', links: [[actor.id, 'participates in', 'JRN-001']]});
  assert.equal(p.artefacts.find(a => a.id === actor.id).description, 'Serves customers at the counter.'); assert.ok(p.relationships.some(r => r.from === actor.id && r.to === 'JRN-001'));
  // A save that changes nothing keeps the content version.
  assert.equal(applyCommand(p, {type: 'artefact', payload: {id: actor.id, title: 'Branch teller'}}, at).document.contentVersion, p.contentVersion);
  // A rule (BR-nnn) and its links; an outcome's measure; a journey of its own; a person's attributes.
  p = ch1(p, 'artefact', {type: 'rule', title: 'Daily transfer limit', description: 'A customer moves at most this much a day.', value: '10000', unit: 'per day', currency: 'EUR', effectiveDate: '2027-01-01', authority: 'Board policy', instrument: 'Limits policy', section: '4.2', requirementIds: [reqs[0]], refinesId: 'CON-001'});
  const rule = p.artefacts.at(-1);
  assert.equal(rule.id, 'BR-001'); assert.deepEqual([rule.value, rule.currency, rule.refinesId, rule.requirementIds], ['10000', 'EUR', 'CON-001', [reqs[0]]]);
  refuses(() => ch1(p, 'artefact', {id: rule.id, refinesId: 'OUT-001'}), /Choose existing constraints: OUT-001/);
  refuses(() => ch1(p, 'artefact', {id: rule.id, controlId: 'SEC-999'}), /Chapter 9 controls: SEC-999/);
  assert.ok(!findings(withGroup).some(f => f.code === 'missing-type' && f.artefactType === 'rule'), 'a project with no rule is complete: the type is optional');
  p = ch1(p, 'artefact', {id: 'OUT-001', measure: 'Days to know an outcome', baseline: '3 days', target: 'Same day', by: '2027-06-30', problem: 'Customers do not know where a payment is.'});
  assert.deepEqual(['measure', 'baseline', 'target', 'by'].map(k => p.artefacts.find(a => a.id === 'OUT-001')[k]), ['Days to know an outcome', '3 days', 'Same day', '2027-06-30']);
  p = ch1(p, 'artefact', {type: 'journey', title: 'Close the branch day', description: 'The teller balances the till.', journeyId: 'End of day', order: 1});
  const eod = p.artefacts.at(-1); assert.deepEqual(journeysOf(p).map(j => [j.id, j.steps.length]), [['', 5], ['End of day', 1]]);
  p = ch1(p, 'relationship', {from: 'JRN-005', to: eod.id, kind: 'precedes'});
  assert.ok(p.relationships.some(r => r.kind === 'precedes' && r.to === eod.id));
  assert.ok(findings(p).some(f => f.code === 'journey-cross'), 'precedes across two journeys is a warning');
  p = ch1(p, 'relationship', {from: reqs[0], to: reqs[1], kind: 'duplicates'}); assert.ok(p.relationships.some(r => r.kind === 'duplicates'));
  p = ch1(p, 'artefact', {id: reqs[1], domain: 'Payments', userGroup: 'Tellers', priorityBand: 'High'});
  const typed = p.artefacts.find(a => a.id === reqs[1]);
  assert.deepEqual([typed.domain, typed.userGroup, typed.assessment?.priorityBand, typed.attributeOrigin], ['Payments', 'Tellers', 'High', {domain: 'person', userGroup: 'person', priorityBand: 'person'}]);
  const ruled = groups(p, 'group', {title: 'Teller requirements', kind: 'user-group', rule: [{field: 'userGroup', value: 'Tellers'}]});
  assert.deepEqual(groupMembers(ruled, ruled.requirementGroups.records.at(-1).id), [reqs[1]], 'a typed requirement joins a rule group once a person sets its attribute');
  // Priority not stated by default, with its basis when a person sets it; an imported requirement reads its basis as the source band.
  p = ch1(p, 'artefact', {type: 'requirement', title: 'Show the cut-off time', description: 'The page shows today’s cut-off.'});
  assert.equal(p.artefacts.at(-1).priority, ''); p = ch1(p, 'artefact', {id: p.artefacts.at(-1).id, priority: 'Should'});
  assert.equal(priorityBasisOf(p.artefacts.at(-1)), 'person'); assert.equal(priorityBasisOf({priority: 'Could', provenance: {datasetId: 'x'}}), 'source band');
  refuses(() => ch1(p, 'artefact', {id: reqs[0], priority: 'Urgent'}), /Must, Should, Could or not stated/);
  // A field no source states is recorded as such: it satisfies the record's shape and is one grouped finding (DM-16).
  p = ch1(p, 'artefact', {type: 'requirement', title: 'Keep the audit trail', description: 'Every change is kept.', source: 'Brief', owner: '', open: {owner: {state: 'not-stated'}}});
  const openReq = p.artefacts.at(-1), fs = findings(p).filter(f => f.artefactId === openReq.id);
  assert.ok(!fs.some(f => f.code === 'accountability') && fs.some(f => f.code === 'not-stated' && /owner/.test(f.detail)), 'an owner no source states is a warning, not a missing owner');
  refuses(() => ch1(p, 'brief', {problem: 'x'.repeat(20001)}), /The brief holds at most 20,000 characters; this one has 20,001/);
  pass('actors and stakeholders hold a category, a persona and groups; an update keeps what it leaves out and takes links; a rule BR-001 keeps its value and links, each checked; an outcome its measure; a journey step its journey, and precedes across journeys is a warning; duplicates is a link kind; a person sets a requirement’s attributes and a rule group then holds it; a new record states no priority; the basis is the person’s, or the source band for an import; a brief past 20,000 characters is refused');
}

// 3. Requirement groups (DM-02, DM-22, DM-24): rules with is not and is one of, links from every chapter, one reader.
{
  let p = ch1(withGroup, 'artefact', {id: reqs[0], domain: 'Payments'});
  p = ch1(p, 'artefact', {id: reqs[1], domain: 'Cards'}); p = ch1(p, 'artefact', {id: reqs[2], domain: 'Ledger'});
  p = groups(p, 'group', {title: 'Not cards', kind: 'domain', rule: [{field: 'domain', op: 'is one of', values: ['Payments', 'Ledger']}]});
  const oneOf = p.requirementGroups.records.at(-1); assert.deepEqual(groupMembers(p, oneOf.id), [reqs[0], reqs[2]]); assert.equal(ruleText(oneOf.rule), 'Domain is one of Payments, Ledger');
  p = groups(p, 'group', {title: 'Everything but cards', kind: 'domain', rule: [{field: 'domain', op: 'is not', value: 'Cards'}]});
  assert.ok(!groupMembers(p, p.requirementGroups.records.at(-1).id).includes(reqs[1]));
  refuses(() => groups(p, 'group', {title: 'Bad', kind: 'domain', rule: [{field: 'domain', op: 'matches', value: 'x'}]}), /is, is not or is one of/);
  assert.ok(groupSummary(p).every(s => typeof s.deliveries === 'object'));
  // Every chapter's record that links the group answers for its members; the guard sees a link from any chapter.
  const r = {requirementIds: [reqs[0]], requirementGroupIds: [gid]};
  assert.deepEqual(linkedRequirementIds(p, r), [reqs[0], reqs[2], reqs[3]]); assert.ok(linksRequirement(p, r, reqs[3]) && !linksRequirement(p, r, reqs[1]));
  const plan = structuredClone(p); plan.runtime = {plans: [{id: 'RUN-T1', requirementGroupIds: [gid]}]};
  assert.deepEqual(groupLinks(plan, gid), ['RUN-T1'], 'a group a Chapter 10 plan links is seen'); refuses(() => groups(plan, 'group-delete', {id: gid}), /RUN-T1 links this group/);
  const inAlt = structuredClone(p); inAlt.decisions.records[0].alternatives[0].requirementGroupIds = [gid]; assert.ok(groupLinks(inAlt, gid).length === 1);
  // A responsibility and a component that link the group trace its members.
  let q = ch4(p, 'responsibility', {id: p.logical.responsibilities[0].id, requirementGroupIds: [gid]});
  assert.ok(reviewTrace(withFinalReview(q), reqs[3]).logical.some(x => x.id === p.logical.responsibilities[0].id), 'a responsibility that links the group traces its members');
  q = ch5(q, 'component', {id: components(q)[1].id, requirementGroupIds: [gid]});
  assert.ok(reviewTrace(withFinalReview(q), reqs[2]).applications.some(c => c.id === components(q)[1].id), 'so does a component that links it itself');
  // A capability group of the retired assurance.group reads as RG-nnn with its old id kept.
  const legacy = structuredClone(withGroup); legacy.assurance = {version: 1, counter: 1, records: [], groups: [{id: 'GRP-004', title: 'Old', requirementIds: [reqs[0]], reason: 'Old', at, actor: 'x'}]};
  const read = requirementGroups(legacy).find(g => g.alias === 'GRP-004'); assert.match(read.id, /^RG-\d{3}$/); assert.equal(groupById(legacy, 'GRP-004').id, read.id);
  pass('a rule condition may be is not or is one of, and is refused otherwise; a group summary counts each delivery value; linkedRequirementIds reads named requirements then group members; a group linked from Chapter 10 or from an alternative cannot be deleted; a responsibility and a component that link a group trace its members; a legacy capability group reads as RG-nnn with its old id as an alias');
}

// 4. Chapters 4 and 5 (DM-13, DM-14, DM-18, DM-24): roles, two realisers, properties, solution, container, interactions.
{
  let p = withGroup; const lr = p.logical.responsibilities[0], cs = components(p);
  p = ch4(p, 'connection', {from: lr.id, to: p.logical.responsibilities[1].id, label: 'hands work to', kind: 'flow'});
  const lc = p.logical.connections.at(-1); assert.match(lc.id, /^LC-\d{3}$/); assert.equal(connectionCode({id: 'REL-007'}), 'LC-007'); assert.match(exportLogicalMarkdown(p), new RegExp(lc.id + ': '));
  const m = p.logical.mappings.find(x => x.logicalId === lr.id);
  p = ch4(p, 'mapping', {id: m.id, logicalId: lr.id, physicalId: m.physicalId, role: 'realises'}); const m2 = p.logical.mappings.find(x => x.id === m.id);
  assert.deepEqual([mappingRole(m2), m2.scope, m2.owner], ['realises', m.scope, m.owner], 'a role; what the save leaves out is kept');
  refuses(() => ch4(p, 'mapping', {id: m.id, logicalId: lr.id, physicalId: m.physicalId, role: 'owns'}), /realises or supports/);
  const other = cs.find(c => c.id !== m.physicalId);
  p = ch5(p, 'component', {id: other.id, allocations: [{logicalId: lr.id, scope: 'Also posts.', role: 'realises'}]});
  assert.ok(realisationFindings(p).some(f => f.code === 'realisers' && f.objectId === lr.id), 'two realisers of one responsibility are flagged');
  // Properties, solution, patterns and the container.
  const c = cs[0], tr = p.technologyRealisation.records[0].id;
  p = ch5(p, 'component', {id: c.id, properties: [{concern: 'availability', statement: 'Stays up through a zone loss.', mechanism: 'Two zones.', source: 'Design workshop'}], architecturalSolution: 'Stateless service behind a queue.', patternIds: ['P-CHECK-POINTED-SYSTEM'], containerId: tr});
  let saved = components(p).find(x => x.id === c.id);
  assert.deepEqual([saved.properties[0].concern, saved.architecturalSolution, saved.patternIds, componentContainer(p, saved).derived], ['availability', 'Stateless service behind a queue.', ['P-CHECK-POINTED-SYSTEM'], false]);
  assert.equal(saved.purpose, c.purpose, 'what the save leaves out is kept');
  refuses(() => ch5(p, 'component', {id: c.id, properties: [{concern: 'happiness', statement: 'x'}]}), /quality concern or a driver/);
  refuses(() => ch5(p, 'component', {id: c.id, patternIds: ['P-NOT-A-PATTERN']}), /playbook styles, patterns or tactics: P-NOT-A-PATTERN/);
  refuses(() => ch5(p, 'component', {id: c.id, containerId: 'tr-999'}), /existing Chapter 7 realisation/);
  p = ch5(p, 'component', {id: c.id, containerId: null}); saved = components(p).find(x => x.id === c.id);
  assert.equal(componentContainer(p, saved)?.derived, true, 'with none chosen, the container is derived from its compute need');
  assert.match(exportRealisationMarkdown(p), /Quality properties:\n- Availability: Stays up through a zone loss\.[\s\S]*Runs in: TR-\d+ [^\n]*\(derived from its compute need\)/);
  // Interactions may be scheduled, or of a type no source states, which is said.
  p = ch5(p, 'interaction', {from: cs[0].id, to: cs[1].id, label: 'Sends the nightly file', interaction: 'scheduled', failure: 'Retry the next night.'});
  assert.equal(p.realisation.connections.at(-1).kind, 'flow');
  p = ch5(p, 'interaction', {from: cs[1].id, to: cs[2].id, label: 'Talks to', interaction: 'not-stated'});
  assert.ok(realisationFindings(p).some(f => f.code === 'interaction-type'), 'a type no source states is a finding');
  pass('Chapter 4 connections number LC-nnn and an old REL id reads as its LC code; an allocation realises or supports, and two realisers are flagged; a component keeps quality properties, a solution with playbook patterns and a container, each checked, and with none chosen the container is derived and said so; an interaction may be scheduled or not stated');
}

// 5. The record lifecycle (DM-17): retire and restore; refused while named; proposals counted in no check.
{
  let p = withGroup; const lone = ch4(p, 'responsibility', {title: 'Archive old statements', purpose: 'Keeps statements.', boundary: 'Statements.', owner: 'Ops', source: 'Brief', requirementIds: [reqs[0]]}); const id = lone.logical.responsibilities.at(-1).id;
  refuses(() => applyRecordLifecycleCommand(lone, {type: 'record.retire', payload: {id, reason: 'x'}}, at), /Say why/);
  const gone = applyRecordLifecycleCommand(lone, {type: 'record.retire', payload: {id, reason: 'Out of scope now.'}}, at, 'tester').document;
  assert.ok(!gone.logical.responsibilities.some(r => r.id === id)); assert.deepEqual([gone.retired.records[0].reason, gone.retired.records[0].actor, gone.retired.records[0].at], ['Out of scope now.', 'tester', at]);
  const back = applyRecordLifecycleCommand(gone, {type: 'record.restore', payload: {id}}, at).document;
  assert.deepEqual(back.logical.responsibilities.find(r => r.id === id).title, 'Archive old statements'); assert.equal(back.retired.records.length, 0);
  refuses(() => applyRecordLifecycleCommand(p, {type: 'record.retire', payload: {id: reqs[0], reason: 'No longer needed.'}}, at), /is still named by/);
  const proposed = structuredClone(p); proposed.decisions.records[2].state = 'proposed';
  const f = proposalFinding(proposed.decisions.records, 3); assert.deepEqual([f.code, f.ids], ['proposals', [proposed.decisions.records[2].id]]);
  assert.ok(!decisionFindings(proposed).some(x => x.decisionId === proposed.decisions.records[2].id), 'a proposal counts in no check but the grouped one');
  pass('a record retires with who, when and why and is restored where it was; a record another names cannot retire, and the refusal names who names it; a proposal counts in no check but one grouped "Review the proposals"');
}

// 6. The component specification and quality-driver interactions (SDD-SPEC §4).
{
  let p = withGroup; const c = components(p)[0];
  p = ch5(p, 'component', {id: c.id, properties: [{concern: p.quality.drivers[1].id, statement: 'Answers within two seconds.', mechanism: 'Caches the reference data.', source: 'Load test plan'}], architecturalSolution: 'Stateless service.'});
  const S = componentSpec(reasoningFor(p), c.id);
  for (const k of ['realised', 'technologies', 'interfaces', 'dependencies', 'driverCodes', 'properties', 'architecturalSolution', 'patterns', 'container']) assert.ok(k in S, 'componentSpec has ' + k);
  assert.ok(S.driverCodes.every(x => /^(BD|FD|QD|C|OD|DD|TE|BC)\d+$/.test(x)) && S.properties[0].concernName === 'QD2');
  const Q = qualityDriverInteractions(p);
  assert.ok(Q.length && Q.every(x => x.driver.kind === 'quality'));
  const order = Q.map(x => x.driver.priority), rank = v => ({High: 1, Medium: 2, Low: 3}[v] || 9); assert.deepEqual(order, [...order].sort((a, b) => rank(a) - rank(b)), 'High first');
  assert.ok(Q.find(x => x.driver.id === p.quality.drivers[1].id).components.some(e => e.component.id === c.id && e.properties.length === 1), 'a property for the driver is how the component supports it');
  pass('componentSpec reads each component’s realised responsibilities, technologies, interfaces, dependencies, driver codes, properties, solution, patterns and container; qualityDriverInteractions lists each quality driver, High first, with the components that support it and how');
}

// 7. Chapters 6 to 10 (after D2): a requirement group their records cite cannot be deleted, and the readers read it one
// way. For one collection per chapter, the record that links the group stops its deletion, naming it; it answers for the
// group's members in the traceability register and fulfils them in the connected model. Then every one of the ten
// collections at once: needs, capabilities, realisations, parties, contracts, data, threats, controls, plans and paths.
{
  let p = applyRequirementsCommand(withFinalReview(seedProject()), {type: 'requirements.group', payload: {title: 'Payment entry', kind: 'module', memberIds: ['REQ-001', 'REQ-002']}}, at).document;
  const group = p.requirementGroups.records.at(-1).id, run = (q, type, payload) => applyCanonical(q, {type, payload}, at, 'architect-a').document;
  const cases = [[6, 'technology.capability', 'tc-001', q => q.technology.capabilities, 'capabilities'], [7, 'techrealisation.plan', 'tr-001', q => q.technologyRealisation.records, 'realizations'], [8, 'interfaces.data', 'instruction', q => q.interfaces.data, 'data'], [9, 'security.control', 'oauth', q => q.security.controls, 'controls'], [10, 'runtime.plan', 'run-001', q => q.runtime.plans, 'runtime']];
  for (const [chapter, type, id, rows, trail] of cases) {
    const q = run(p, type, {id, requirementGroupIds: [group]}), r = rows(q).find(x => x.id === id);
    assert.deepEqual(r.requirementGroupIds, [group], `Chapter ${chapter}: ${type} keeps the group`);
    assert.deepEqual(groupLinks(q, group), [id], `Chapter ${chapter}: the guard sees the link`);
    refuses(() => groups(q, 'group-delete', {id: group}), new RegExp(id + ' links this group'));
    assert.deepEqual(linkedRequirementIds(q, r), ['REQ-001', 'REQ-002'], `Chapter ${chapter}: the group reads as its members`);
    assert.ok(reviewTrace(withFinalReview(q), 'REQ-002')[trail].some(x => x.id === id), `Chapter ${chapter}: the trace of a member reaches ${id}`);
    assert.ok(architectureModel(q).relationships.some(e => e.type === 'fulfils' && e.from === 'REQ-002' && e.to === id), `Chapter ${chapter}: the connected model has ${id} fulfil a member`);
  }
  const all = [['technology.needs', {applicationId: 'api-pod', needs: needsFor(p, 'api-pod').map((n, i) => ({id: n.id, category: n.category, ...(i === 0 ? {requirementGroupIds: [group]} : {})}))}], ['technology.capability', {id: 'tc-001'}], ['techrealisation.plan', {id: 'tr-001'}], ['interfaces.party', {id: 'ext-core'}], ['interfaces.contract', {id: 'rest'}], ['interfaces.data', {id: 'instruction'}], ['security.threat', {id: 'thr-001'}], ['security.control', {id: 'oauth'}], ['runtime.plan', {id: 'run-001'}], ['runtime.path', {id: 'RP-001'}]];
  for (const [type, payload] of all) p = run(p, type, type === 'technology.needs' ? payload : {...payload, requirementGroupIds: [group]});
  const linking = groupLinks(p, group);
  assert.equal(linking.length, 10, 'every one of the ten collections links the group: ' + linking.join(', '));
  refuses(() => groups(p, 'group-delete', {id: group}), /links this group|link this group/);
  const T = reviewTrace(withFinalReview(p), 'REQ-001');
  assert.ok(T.parties.some(x => x.id === 'ext-core') && T.threats.some(x => x.id === 'thr-001') && T.paths.some(x => x.id === 'RP-001') && T.contracts.some(x => x.id === 'rest'), 'the trace names the parties, threats, paths and contracts that link the group');
  pass('a group linked from Chapters 6 to 10 (a capability, a realisation, a data definition, a control, a runtime plan, and all ten collections at once) cannot be deleted, the refusal naming who links it; each such record answers for the group’s members in the trace and fulfils them in the connected model');
}

// 8. One lifecycle path (GR-GOV-23): a record of every chapter, 1 to 10, retires and is restored through the one family
// (record.retire, record.restore) and nothing else writes the retired records; a restore puts each back where it was.
{
  const p0 = withFinalReview(withRuntime(seedProject())), listAt = (p, path) => { const [a, b] = path.split('.'); return (b ? p[a]?.[b] : p[a]) || []; };
  const pick = {1: ['artefacts', 'SCP-002'], 2: null, 3: null, 4: ['logical.connections', 'REL-002'], 5: ['realisation.connections', 'INT-005'], 6: ['technology.needs', 'TN-001'], 7: ['technologyRealisation.mappings', 'RM-001'], 8: null, 9: ['security.threats', 'thr-002'], 10: ['runtime.zones', 'zone-b']};
  // Chapters 2, 3 and 8 of the reference hold no record that nothing names: one is added to each.
  let p = applyCanonical(p0, {type: 'quality.driver', payload: {kind: 'business', title: 'Open a branch in a week', description: 'A branch takes payments within a week.'}}, at).document;
  pick[2] = ['quality.drivers', p.quality.drivers.at(-1).id];
  p = applyCanonical(p, {type: 'decision.save', payload: {question: 'Where are statements archived?', context: 'Statements are kept for years.'}}, at).document; pick[3] = ['decisions.records', p.decisions.records.at(-1).id];
  p = applyCanonical(p, {type: 'interfaces.party', payload: {title: 'Statement printer', purpose: 'Prints paper statements.'}}, at).document; pick[8] = ['interfaces.parties', p.interfaces.parties.at(-1).id];
  for (let ch = 1; ch <= 10; ch++) {
    const [path, id] = pick[ch], before = listAt(p, path).map(r => r.id);
    assert.ok(retirable(p, id, ch), `Chapter ${ch}: ${id} is offered for retirement`);
    const gone = applyCanonical(p, {type: 'record.retire', payload: {ids: [id], chapter: ch, reason: 'Retired by the one family.'}}, at, 'tester').document;
    assert.ok(!listAt(gone, path).some(r => r.id === id), `Chapter ${ch}: ${id} left ${path}`);
    assert.deepEqual(retiredRecords(gone, ch).map(x => [x.id, x.reason, x.actor]), [[id, 'Retired by the one family.', 'tester']], `Chapter ${ch}: kept with why and who`);
    const back = applyRecordCommand(gone, {type: 'record.restore', payload: {ids: [id], chapter: ch}}, at).document;
    assert.deepEqual(listAt(back, path).map(r => r.id), before, `Chapter ${ch}: ${id} is back where it was`);
    assert.equal(retiredRecords(back).length, 0);
  }
  // The family is the only command that writes the retired records: no other staged command names a retirement.
  assert.deepEqual([...STAGED_COMMANDS].filter(t => /retire|dismiss|restore|keep-seed|remove-(contract|plan|path)/.test(t)), ['record.retire', 'record.restore']);
  assert.deepEqual(COLLECTIONS.map(([, ch]) => ch).filter((c, i, xs) => xs.indexOf(c) === i), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  pass('one lifecycle path: a record of each chapter, 1 to 10, is retired with why and who and restored where it was through record.retire and record.restore, the only staged commands that retire or restore');
}

// 9. Open fields on mappings, connections, interactions and logical groups (GR-CMP-10, open-fields.js): each saves a
// field as not stated and as an open question, the state kept beside the field; its chapter raises one finding per cause
// that opens the record; the chapter's export prints "open: …" once for it. A save that leaves `open` out keeps it.
{
  const {logicalFindings} = await import('./public/logical-domain.js');
  const times = (text, words) => text.split(words).length - 1;
  const QUESTION = {mapping: 'Which part of the posting does it realise?', connection: 'Only on business days?', interaction: 'What does the caller do when the file is late?', group: 'Who owns the group after go-live?'};
  let p = withGroup; const lr = p.logical.responsibilities[0], cs = components(p), m = p.logical.mappings.find(x => x.logicalId === lr.id), g = p.logical.groups[0];
  const seen = (find, code, key, id) => find(p).some(f => f.code === code && f[key] === id);
  // Not stated.
  p = ch4(p, 'mapping', {id: m.id, logicalId: lr.id, physicalId: m.physicalId, owner: '', open: {owner: {state: 'not-stated'}}});
  p = ch4(p, 'connection', {from: lr.id, to: p.logical.responsibilities[1].id, label: 'hands work to', kind: 'flow', open: {condition: {state: 'not-stated'}}});
  const lc = p.logical.connections.at(-1);
  p = ch4(p, 'group', {id: g.id, purpose: '', open: {purpose: {state: 'not-stated'}}});
  p = ch5(p, 'interaction', {from: cs[0].id, to: cs[1].id, label: 'Sends the nightly file', interaction: 'scheduled', open: {failure: {state: 'not-stated'}}});
  const ia = p.realisation.connections.at(-1);
  const mapping = () => p.logical.mappings.find(x => x.id === m.id), group = () => p.logical.groups.find(x => x.id === g.id), connection = () => p.logical.connections.find(x => x.id === lc.id), interaction = () => p.realisation.connections.find(x => x.id === ia.id);
  assert.deepEqual([mapping().open, connection().open, group().open, interaction().open], [{owner: {state: 'not-stated'}}, {condition: {state: 'not-stated'}}, {purpose: {state: 'not-stated'}}, {failure: {state: 'not-stated'}}], 'each keeps its field as not stated');
  assert.equal(mapping().scope, m.scope, 'what the mapping save leaves out is kept');
  assert.ok(seen(logicalFindings, 'not-stated', 'mappingId', m.id) && seen(logicalFindings, 'not-stated', 'connectionId', lc.id) && seen(logicalFindings, 'not-stated', 'groupId', g.id) && seen(realisationFindings, 'not-stated', 'connectionId', ia.id), 'one not-stated finding each, which opens the record');
  assert.ok(!seen(logicalFindings, 'incomplete-mapping', 'mappingId', m.id) && !seen(realisationFindings, 'interaction', 'connectionId', ia.id), 'a required field recorded as not stated holds its place');
  let L = exportLogicalMarkdown(p), R = exportRealisationMarkdown(p);
  assert.deepEqual([times(L, 'Owner: open: owner not stated'), times(L, 'Condition: open: condition not stated'), times(L, 'Purpose: open: purpose not stated'), times(R, 'Failure policy: open: failure not stated')], [1, 1, 1, 1], 'each printed "open: …" once');
  // An open question.
  p = ch4(p, 'mapping', {id: m.id, logicalId: lr.id, physicalId: m.physicalId, scope: '', open: {owner: {state: 'not-stated'}, scope: {state: 'open-question', question: QUESTION.mapping}}});
  p = ch4(p, 'connection', {...connection(), open: {condition: {state: 'open-question', question: QUESTION.connection}}});
  p = ch4(p, 'group', {id: g.id, open: {purpose: {state: 'open-question', question: QUESTION.group}}});
  p = ch5(p, 'interaction', {...interaction(), open: {failure: {state: 'open-question', question: QUESTION.interaction}}});
  assert.deepEqual([mapping().open.scope, connection().open.condition, group().open.purpose, interaction().open.failure].map(o => o.state), ['open-question', 'open-question', 'open-question', 'open-question']);
  assert.ok(seen(logicalFindings, 'open-question', 'mappingId', m.id) && seen(logicalFindings, 'open-question', 'connectionId', lc.id) && seen(logicalFindings, 'open-question', 'groupId', g.id) && seen(realisationFindings, 'open-question', 'connectionId', ia.id), 'one open-question finding each');
  L = exportLogicalMarkdown(p); R = exportRealisationMarkdown(p);
  assert.deepEqual([times(L, 'open: ' + QUESTION.mapping), times(L, 'open: ' + QUESTION.connection), times(L, 'open: ' + QUESTION.group), times(R, 'open: ' + QUESTION.interaction)], [1, 1, 1, 1], 'each question printed "open: …" once');
  // A save that leaves `open` out keeps it; null clears it.
  p = ch4(p, 'group', {id: g.id, title: g.title + ' and settlement'});
  assert.equal(group().open.purpose.question, QUESTION.group, 'left out, the open state is kept');
  p = ch4(p, 'group', {id: g.id, purpose: 'Posting and settlement work.', open: null});
  assert.equal(group().open, undefined, 'null clears it'); assert.ok(!seen(logicalFindings, 'open-question', 'groupId', g.id));
  pass('a mapping, a connection, an interaction and a logical group each save a field as not stated and as an open question beside the field; each is one finding per cause that opens the record, holds the place of a required field, and is printed "open: …" once by its chapter\'s export; left out it is kept, null clears it');
}

// 10. One way out (round 12, GR-GOV-24): a first-class record leaves the design only through the one retire path, with
// why, who and when, and can be restored. The hard deletes that stood beside it are refused, naming that path; removing
// a link (a requirement relationship, a process path) stays an edit of the records it joins.
{
  const p0 = withFinalReview(withRuntime(seedProject()));
  refuses(() => applyCommand(p0, {type: 'deleteArtefact', payload: {id: 'SCP-002'}}), /leaves the design through Retire/);
  refuses(() => applyQualityCommand(p0, {type: 'quality.delete', payload: {id: p0.quality.drivers[0].id}}), /leaves the design through Retire/);
  // The process perspective's records are Chapter 1's: an object and a claim retire through the family and come back where
  // they were; a path joining two objects is removed as an edit, and an object a path still names cannot retire.
  const stage = (doc, command) => { const q = previewWorkingChange(doc, [command]); return applyWorkbenchCommand(doc, {type: 'workspace.apply', payload: {commands: [command], stamp: q.stamp, reviewed: true, reason: 'Reviewed.'}}, at, 'reviewer-b').document; };
  let p = stage(p0, {type: 'process.element', payload: {kind: 'task', title: 'Check the instruction'}});
  const task = p.processModel.elements.at(-1);
  p = stage(p, {type: 'process.element', payload: {kind: 'task', title: 'Record the outcome'}});
  const next = p.processModel.elements.at(-1);
  p = stage(p, {type: 'process.transition', payload: {from: task.id, to: next.id, kind: 'sequence', label: 'Checked'}});
  const path = p.processModel.transitions.at(-1);
  p = stage(p, {type: 'process.claim', payload: {subjectId: next.id, topic: 'Outcome wording', statement: 'The source names the outcome but not its wording.', source: 'Workshop notes', sourceLocator: 'Page 2'}});
  const claim = p.processModel.claims.at(-1);
  assert.ok(COLLECTIONS.some(([path, ch]) => path === 'processModel.elements' && ch === 1), 'the process records are Chapter 1\'s');
  refuses(() => stage(p, {type: 'process.remove', payload: {id: task.id}}), /Remove the conditional paths that connect it first/);
  refuses(() => stage(p, {type: 'record.retire', payload: {ids: [task.id], chapter: 1, reason: 'Folded into the next task.'}}), /is still named by Chapter 1/);
  refuses(() => stage(p, {type: 'process.remove', payload: {id: claim.id}}), /leaves the design through Retire/);
  // The path is a link: removed as an edit of the process (its version moves), not retired.
  const unlinked = stage(p, {type: 'process.remove', payload: {id: path.id}});
  assert.ok(!unlinked.processModel.transitions.some(t => t.id === path.id) && !retiredRecords(unlinked).some(x => x.id === path.id));
  assert.ok(unlinked.processModel.version > p.processModel.version);
  // The object and the claim retire with why and who, through a reviewed change, and are restored where they were.
  let gone = stage(unlinked, {type: 'record.retire', payload: {ids: [task.id], chapter: 1, reason: 'Folded into the next task.'}});
  gone = stage(gone, {type: 'record.retire', payload: {ids: [claim.id], chapter: 1, reason: 'The source answered it.'}});
  assert.ok(!gone.processModel.elements.some(e => e.id === task.id) && !gone.processModel.claims.some(c => c.id === claim.id));
  assert.deepEqual(retiredRecords(gone, 1).filter(x => [task.id, claim.id].includes(x.id)).map(x => [x.id, x.reason, x.actor]), [[task.id, 'Folded into the next task.', 'reviewer-b'], [claim.id, 'The source answered it.', 'reviewer-b']]);
  const back = stage(stage(gone, {type: 'record.restore', payload: {ids: [claim.id], chapter: 1}}), {type: 'record.restore', payload: {ids: [task.id], chapter: 1}});
  assert.deepEqual(back.processModel.elements.map(e => e.id), unlinked.processModel.elements.map(e => e.id));
  assert.deepEqual(back.processModel.claims.map(c => c.id), unlinked.processModel.claims.map(c => c.id));
  // Withdrawing an untouched evidence bundle retires its three records with the withdrawal's reason (see test:evidence).
  pass('one way out of the design: deleting a requirement or a driver outright is refused, naming the retire path; the process perspective\'s objects and claims are Chapter 1\'s records and retire with why and who through a reviewed change, restorable where they were, while removing a path stays an edit and an object a path still names cannot retire');
}
