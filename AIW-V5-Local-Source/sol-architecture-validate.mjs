// Synthetic, 1,400-requirement acceptance of the architecture contract. No client material or live provider call.
import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {largeProject, contentReadySyntheticProject} from './sdd-fixtures.mjs';
import {draftArchitecture, draftUnits, nounPhrase, applySteps} from './public/architecture-drafter.js';
import {architectureInstructionsPin, architectureDraftSchema, themePacket, crossPacket, skeletonOf, validateArchitectureDraft, guardArchitectureDraft, settleArchitectureReview, THEME_LIMITS, ARCHITECTURE_INSTRUCTIONS, ARCHITECTURE_REVIEW_INSTRUCTIONS} from './public/architecture-contract.js';
import {runArchitectureJob} from './architecture-job.js';
import {sddDocument} from './public/sdd-document.js';

const at = '2026-10-10T00:00:00.000Z';
const source = (await largeProject()).document;
let project = createProject({name: 'Synthetic grouped architecture', template: 'blank'}, 'synthetic-sol-architecture', at);
project.artefacts = source.artefacts.filter(record => record.type === 'requirement');
project.requirementGroups = source.requirementGroups;
assert.equal(project.artefacts.length, 1400);
const units = draftUnits(project), refs = new Set(units.flatMap(unit => unit.members.map(record => record.id)));
assert.equal(refs.size, 1400, 'each source requirement participates in at least one theme');
assert(units.length > 30 && units.length <= THEME_LIMITS.themes);
const skeleton = draftArchitecture(project), pin = architectureInstructionsPin();
assert.equal(skeleton.trace.traced, 1400);
const packets = units.map(unit => themePacket(project, skeleton, unit, {instructions: pin}));
for (const packet of packets) {
  assert(packet.requirements.length <= THEME_LIMITS.requirements);
  assert.equal(packet.theme.requirements, packet.requirements.length + packet.omissions.requirements);
  assert.equal(packet.brainReceipt.instructions.sha256, pin.sha256);
  assert(packet.stamp && packet.disclosure && packet.allowed);
}

const first = packets[0], ref = first.requirements[0].ref, statement = first.requirements[0].statement;
const excludedProject = structuredClone(project);
const privateId = 'private-excluded-metadata-id';
excludedProject.workspace.aiPolicy = {excludedObjectIds: [ref, privateId]};
const privateTheme = themePacket(excludedProject, skeleton, units[0], {instructions: pin});
const privateCross = crossPacket(excludedProject, [], {instructions: pin});
for (const packet of [privateTheme, privateCross]) {
  assert.equal(packet.disclosure.excludedObjectCount, 2);
  assert(!('excludedObjectIds' in packet.disclosure), 'the excluded ID list remains local');
  assert(!JSON.stringify(packet).includes(privateId), 'provider packets do not reveal excluded IDs through disclosure metadata');
}
assert(!privateTheme.requirements.some(row => row.ref === ref), 'an excluded requirement stays out of the theme context');
assert.notEqual(privateTheme.stamp, first.stamp, 'filtering a requirement changes the provider packet stamp');
const sourceSkeleton = new Map(skeleton.chapters.flatMap(c => c.records.map(r => [r.key, r])));
const derivedFromExcluded = skeletonOf(skeleton, units[0]).filter(r => sourceSkeleton.get(r.key)?.cites.includes(ref));
assert(derivedFromExcluded.length > 0, 'the regression fixture contains a skeleton record derived from the excluded requirement');
assert(!privateTheme.skeleton.some(r => derivedFromExcluded.some(x => x.key === r.key)), 'a derived skeleton record does not reach the provider');
assert.throws(() => themePacket({...excludedProject, workspace: {...excludedProject.workspace, aiPolicy: {excludedObjectIds: units[0].members.map(a => a.id)}}}, skeleton, units[0]), /leaves no requirements/, 'a whole excluded theme cannot send a hollow packet');
const allExcluded = structuredClone(project);
allExcluded.workspace.aiPolicy = {excludedObjectIds: project.artefacts.map(a => a.id)};
let blockedRequests = 0;
await assert.rejects(runArchitectureJob(allExcluded, skeleton, {request: async () => { blockedRequests++; throw Error('Provider must not be called'); }}), /leaves no requirements eligible/, 'all excluded themes refuse Sol drafting');
assert.equal(blockedRequests, 0, 'a project with no permitted requirements makes no architecture model calls');
const object = nounPhrase(statement) || 'source process';
const title = object[0].toUpperCase() + object.slice(1) + ' processing';
const good = {kind: 'responsibility', title, statement: `Sol proposes a responsibility for ${object}.`, requirementRefs: [ref], passages: [], basis: statement, interpretation: `Sol proposes a processing boundary for ${object}.`};
const check = raw => guardArchitectureDraft(first, validateArchitectureDraft({proposals: [raw], keep: []}, first));
assert.equal(check(good).proposals.length, 1);
const faulty = [
  [{...good, requirementRefs: []}, /cites|requirement|passage/i],
  [{...good, statement: `Sol proposes ${object} in 987654321 regions.`}, /987654321|number/i],
  [{kind: 'data', entity: 'Verify the source process', purpose: `Sol proposes ${object} data.`, owner: 'not stated', keyFields: [], classification: 'not classified yet', requirementRefs: [ref], passages: [], basis: statement, interpretation: `Sol proposes data for ${object}.`}, /noun|fragment|entity/i],
  [{...good, statement: `The ${object} design is chosen and approved.`}, /approved|chosen/i]
];
for (const [bad, reason] of faulty) {
  const result = check(bad);
  assert.equal(result.proposals.length, 0, 'one bad proposal is withheld');
  assert.match(result.withheld.flatMap(x => x.issues).join(' '), reason);
}
const two = guardArchitectureDraft(first, validateArchitectureDraft({proposals: [good, {...good, requirementRefs: []}], keep: []}, first));
assert.equal(two.proposals.length, 1, 'a bad sibling does not discard the valid proposal');
assert.equal(two.withheld.length, 1);
assert.equal(settleArchitectureReview(two, {proposals: [{id: 'A1', supported: false, defects: ['The source contradicts this proposal.'], notes: []}]}).proposals.length, 0, 'a failed source review withholds advice');
// Round 23 (live run): a packet without passages offers none to cite. The schema holds the passage list to no entries and
// bounds the proposals, the instructions state the bound, and the check drops the placeholder a format without the bound
// may still send: the proposal stands on its requirement, while one with no real citation, or with a passage the packet
// does not hold, is still withheld.
{
  assert.deepEqual(first.passages, [], 'the synthetic grouped project has no brief');
  const schema = architectureDraftSchema(first), shapes = schema.properties.proposals.items.anyOf;
  assert.equal(schema.properties.proposals.maxItems, THEME_LIMITS.proposals);
  assert(shapes.every(x => x.properties.passages.maxItems === 0), 'no passage can be cited where the packet holds none');
  assert(shapes.every(x => !('maxItems' in x.properties.requirementRefs) && x.properties.requirementRefs.items.enum.includes(ref)));
  assert.match(ARCHITECTURE_INSTRUCTIONS, new RegExp(`at most ${THEME_LIMITS.proposals} proposals`));
  assert.deepEqual(check({...good, passages: ['none']}).proposals[0]?.passages, [], 'the placeholder is no citation');
  assert.match(check({...good, requirementRefs: [], passages: ['none']}).withheld[0].issues.join(' '), /cites no requirement or passage/);
  assert.match(check({...good, passages: ['P9']}).withheld[0].issues.join(' '), /outside the packet/);
  const many = validateArchitectureDraft({proposals: Array.from({length: THEME_LIMITS.proposals + 1}, () => good), keep: []}, first);
  assert.equal(many.proposals.length, THEME_LIMITS.proposals);
  assert.match(many.withheld.at(-1).issues[0], new RegExp(`past the ${THEME_LIMITS.proposals} proposals`));
  // A control's category is a control category; a decision's category there is refused.
  const control = {kind: 'control', title: title.replace(/ processing$/, ' access control'), category: 'Data protection', statement: `Sol proposes an access control for ${object}.`, component: 'not stated', makerRole: 'not stated', checkerRole: 'not stated', requirementRefs: [ref], passages: [], basis: statement, interpretation: `Sol proposes an access control for ${object}.`};
  assert.equal(validateArchitectureDraft({proposals: [control], keep: []}, first).proposals.length, 1, 'a control is held to the control categories');
  assert.match(validateArchitectureDraft({proposals: [{...control, category: 'foundational'}], keep: []}, first).withheld[0].issues[0], /not one of the allowed values/);
  assert.match(ARCHITECTURE_INSTRUCTIONS, new RegExp(`within ${THEME_LIMITS.question}`), 'the instructions state the bounds the checks hold');
  assert.match(ARCHITECTURE_REVIEW_INSTRUCTIONS, /"not stated" and "not classified yet" say that the source is silent/, 'the check pass reads the silent-source answers as expected');
  // A status word the cited source itself uses in the same form is the source's term (a bank guarantee), not a status
  // Sol claims; where the source does not use it, or for a status the source does not state, the proposal is withheld.
  const guaranteed = {...first, requirements: first.requirements.map((r, i) => i ? r : {...r, statement: r.statement + ' Each bank guarantee keeps its expiry date.'})};
  const guard = (packet, raw) => guardArchitectureDraft(packet, validateArchitectureDraft({proposals: [raw], keep: []}, packet));
  const register = {kind: 'responsibility', title: 'Bank guarantee register', statement: 'Sol proposes a register that keeps each bank guarantee with its expiry date.', requirementRefs: [ref], passages: [], basis: guaranteed.requirements[0].statement, interpretation: 'Sol proposes one register for every bank guarantee and its expiry date.'};
  assert.equal(guard(guaranteed, register).proposals.length, 1, "the source's own term stands");
  assert.match(guard(first, register).withheld.flatMap(w => w.issues).join(' '), /approved, verified, accepted or guaranteed/, 'the same word the source does not use is withheld');
  assert.match(guard(guaranteed, {...register, interpretation: 'Sol proposes one register for every bank guarantee; its design is approved.'}).withheld.flatMap(w => w.issues).join(' '), /approved, verified, accepted or guaranteed/, 'a status the source does not state is withheld');
}

let requests = 0;
const mock = async packet => {
  requests++;
  if (packet.task === 'architecture-cross') return {result: {proposals: [], withheld: [], keep: [], merges: []}, provider: 'synthetic', model: 'test-double', providerResponseId: 'cross'};
  const sourceRef = packet.requirements[0]?.ref;
  const sourceStatement = packet.requirements[0]?.statement;
  const name = nounPhrase(sourceStatement) || 'source process';
  const proposal = {kind: 'responsibility', title: name[0].toUpperCase() + name.slice(1) + ' processing', statement: `Sol proposes a responsibility for ${name}.`, requirementRefs: [sourceRef], passages: [], basis: sourceStatement, interpretation: `Sol proposes a bounded processing responsibility for ${name}.`};
  const result = guardArchitectureDraft(packet, validateArchitectureDraft({proposals: [proposal], keep: []}, packet));
  assert.equal(result.proposals.length, 1, `the mock's theme proposal ${packet.request.theme} is source-grounded`);
  return {result, provider: 'synthetic', model: 'test-double', providerResponseId: 'theme-' + requests};
};
const run = await runArchitectureJob(project, skeleton, {request: mock});
assert.equal(requests, units.length + 1, 'the job visits each theme and then one cross-cutting pass');
assert(run.themes.every(theme => theme.status === 'accepted' && theme.proposals.every(proposal => proposal.requirementRefs.length)));
assert.equal(run.bundle.mode, 'sol');
let applied = applySteps(project, run.bundle, {at, actor: 'synthetic-architect', jobId: 'synthetic-draft'}), step;
while (!(step = applied.next()).done) { /* the same reviewed-bundle command path, in memory */ }
const saved = step.value.document;
assert(saved.logical.responsibilities.some(record => record.state === 'proposed' && record.provenance?.draft?.engine === 'model' && record.provenance?.draft?.provider === 'synthetic'));
assert(saved.decisions.records.every(record => !record.selectedAlternativeId && !record.approvedAt), 'a model preference cannot select or approve a decision');
assert(run.bundle.chapters.some(chapter => chapter.records.some(record => record.sol?.engine === 'rules')), 'the rules fallback remains explicit for missing model advice');
// Round 23 (live run): the content the SDD's standard reads is asked for and carried into the records. A quality driver
// with its scenario (and a target only where the packet states the figure), a decision with its impact, a component
// with its architectural solution and three responsibility sentences.
{
  const firstKey = units[0].key;
  const shaped = async packet => {
    if (packet.task === 'architecture-cross' || packet.request.theme !== firstKey) return {result: {proposals: [], withheld: [], keep: [], merges: []}, provider: 'synthetic', model: 'test-double', providerResponseId: 'none'};
    const ref0 = packet.requirements[0].ref, st = packet.requirements[0].statement, name = nounPhrase(st) || 'source process', Name = name[0].toUpperCase() + name.slice(1);
    const driverTitle = Name + ' responsiveness', effect = packet.allowed.effects[0];
    const cite = {requirementRefs: [ref0], passages: [], basis: st};
    const proposals = [
      {kind: 'driver', driverKind: 'quality', quality: packet.allowed.qualityConcerns.find(q => q !== 'none'), title: driverTitle, description: `Sol proposes that ${name} stays responsive.`, impact: 'Sol proposes a bounded processing path for it.', priority: 'High', priorityReason: 'Sol reads it as central to the source.', lensConcern: 'none', stimulus: 'A person submits a request at the busiest time of day', conditions: 'during normal operation', response: 'the workbench answers with the outcome', metric: 'response time', targetValue: 'not stated', unit: 'not stated', ...cite, interpretation: 'Sol proposes a responsiveness driver.'},
      {kind: 'decision', question: `How should ${name} be processed?`, category: packet.allowed.categories[0], context: 'Sol reads the source.', alternatives: [{title: 'Process at once', approach: 'Each request is handled when it arrives.', consequences: ['It is simple to follow.'], effects: [{driver: driverTitle, effect, reason: 'It answers at once.'}]}, {title: 'Queue for a worker', approach: 'Each request waits for a worker.', consequences: ['It absorbs peaks.'], effects: []}], preferred: 'Process at once', justification: [{driver: driverTitle, effect, reason: 'It answers at once.'}], impact: 'Sol proposes that the service answers each request itself, so no queue sits between them.', openQuestions: [], ...cite, interpretation: 'Sol proposes direct processing.'},
      {kind: 'data', entity: Name + ' record', purpose: `Sol proposes a record of each ${name}.`, owner: 'An unproposed store', keyFields: ['Record id'], classification: 'not classified yet', ...cite, interpretation: 'Sol proposes one record.'},
      {kind: 'component', title: Name + ' service', componentKind: 'application service', responsibilities: ['It receives each request.', 'It checks each request against its rules.', 'It records the outcome for the person who asked.'], solution: 'Sol proposes a stateless service behind the gateway, with a store of its own.', properties: [], uses: [], serves: [{driver: driverTitle, reason: 'It answers each request while the person waits.'}], realises: [], ...cite, interpretation: 'Sol proposes one service for it.'}
    ];
    const result = guardArchitectureDraft(packet, validateArchitectureDraft({proposals, keep: []}, packet));
    assert.equal(result.proposals.length, 4, 'the shaped proposals pass the checks: ' + JSON.stringify(result.withheld));
    return {result, provider: 'synthetic', model: 'test-double', providerResponseId: 'shaped'};
  };
  const shapedRun = await runArchitectureJob(project, skeleton, {request: shaped});
  const commandsOf = (chapter, type) => shapedRun.bundle.chapters.find(c => String(c.chapter) === String(chapter)).records.filter(r => r.sol?.engine === 'model').flatMap(r => r.commands).filter(c => c.type === type);
  const driver = commandsOf(2, 'quality.driver')[0]?.payload, decision = commandsOf(3, 'decision.save').find(c => c.payload.question)?.payload, component = commandsOf(5, 'realisation.component')[0]?.payload;
  assert.deepEqual([driver?.stimulus, driver?.conditions, driver?.response, driver?.metric, driver?.targetValue], ['A person submits a request at the busiest time of day', 'during normal operation', 'the workbench answers with the outcome', 'response time', ''], 'the scenario is carried; a target the source does not state stays open');
  assert(!('stimulus' in (driver.open || {})) && 'unit' in (driver.open || {}), 'the stated scenario is not open; the target is');
  assert.equal(decision?.impact, 'Sol proposes that the service answers each request itself, so no queue sits between them.');
  assert(!('impact' in (decision.open || {})), 'a stated impact is not open');
  assert.equal(component?.architecturalSolution, 'Sol proposes a stateless service behind the gateway, with a store of its own.');
  assert(!('architecturalSolution' in (component.open || {})));
  // Round 24 (sol-architecture-4): the driver a component serves, with its reason, resolved to the drafted driver; the
  // rationale still names it by code.
  const driverKey = shapedRun.bundle.chapters.find(c => c.chapter === 2).records.find(r => r.title === driver.title).key;
  assert.deepEqual(component.serves, [{driverId: '@draft:' + driverKey, reason: 'It answers each request while the person waits.'}], 'the component names the driver it serves, with why');
  assert.match(component.rationale, new RegExp('It serves \\{\\{code:' + driverKey.replace(/\./g, '\\.') + '\\}\\}'));
  // A data entity whose owner the draft does not propose is placed, its owner open, and the bundle says so.
  const data = commandsOf(8, 'interfaces.data')[0]?.payload;
  assert.equal(data?.authorityId, '', 'placed without an owner'); assert('authorityId' in (data.open || {}), 'its owner is open for a person');
  assert(shapedRun.bundle.notes.some(n => /owning component the draft does not propose; each is placed with its owner open/.test(n)));
  // A target value is a figure the packet states: one it does not is withheld, even a small one.
  const first2 = packets[0], ref2 = first2.requirements[0].ref, st2 = first2.requirements[0].statement;
  const target = value => guardArchitectureDraft(first2, validateArchitectureDraft({proposals: [{kind: 'driver', driverKind: 'quality', quality: first2.allowed.qualityConcerns.find(q => q !== 'none'), title: 'Prompt answers', description: 'Sol proposes prompt answers.', impact: 'Sol proposes a short path.', priority: 'High', priorityReason: 'Sol reads it as central.', lensConcern: 'none', stimulus: 'A person asks', conditions: 'during normal operation', response: 'the workbench answers', metric: 'response time', targetValue: value, unit: 'seconds', requirementRefs: [ref2], passages: [], basis: st2, interpretation: 'Sol proposes a target.'}], keep: []}, first2));
  assert.match(target('2').withheld.flatMap(w => w.issues).join(' '), /target value is not a figure the packet states/);
  assert.equal(target('not stated').proposals.length, 1);
}
const withCandidates = structuredClone(project);
withCandidates.knowledge = {version: 1, counter: 1, sources: [], suggestions: [], claims: [], contradictions: [], releases: [], pins: [], withdrawals: [], links: [], history: []};
withCandidates.knowledge.claims.push({id: 'unreviewed', statement: 'Candidate advice only', actor: 'candidate'});
assert.deepEqual(themePacket(withCandidates, skeleton, units[0], {instructions: pin}).claims, first.claims, 'unreleased claims do not enter the model packet');
const rich = (await contentReadySyntheticProject()).document;
assert.equal(sddDocument(rich).content.pass, true, 'a separate substantively complete synthetic SDD passes the same content reader');
console.log(`PASS Sol architecture: ${project.artefacts.length} requirements, ${units.length} bounded themes, ${requests} mock passes, bad proposals withheld individually, the empty-citation placeholder and the proposal bound, model provenance and rules fallback; separate rich SDD fixture passes content reader`);
